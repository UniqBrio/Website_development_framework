#!/usr/bin/env bash
# blog_staging_test.sh — staging acceptance test of the blog branch against a COPY of a real website.
#
#   website_workflow/tools/blog_staging_test.sh --reference <git clone of the site> --work <new empty dir> \
#       --docs "<blog input> <blog input> <blog input>" [--build] [--browser] [--env-file <file>] [--font-mocks <file>]
#
# SAFETY — the reference clone is READ-ONLY:
#   * nothing is ever written inside --reference; --work must not be inside it, and it inside --work;
#   * the site is copied WITHOUT its .git directory, so nothing in the copy can be committed or pushed;
#   * the reference's commit, `git status` and a SHA-256 fingerprint of every tracked-tree file are
#     recorded before and after, and the script FAILS if any of them changed;
#   * builds use only the --env-file you give; use placeholder values on a domain that cannot resolve
#     (e.g. https://staging-placeholder.invalid) so no real backend is reached. Nothing is deployed.
#
# Needs at least THREE blog inputs (files or folders): the first two are published, the third is used
# for the simulated failure. Steps and evidence: docs/blog/13-staging-test-procedure.md.
set -uo pipefail
FRAMEWORK="$(cd "$(dirname "$0")/../.." && pwd)"
REF="" WORK="" DOCS="" BUILD=0 BROWSER=0 ENV_FILE="" FONT_MOCKS=""
while [ $# -gt 0 ]; do
  case "$1" in
    --reference) REF="$(cd "$2" && pwd)"; shift 2 ;;
    --work) WORK="$2"; shift 2 ;;
    --docs) DOCS="$2"; shift 2 ;;
    --build) BUILD=1; shift ;;
    --browser) BROWSER=1; shift ;;
    --env-file) ENV_FILE="$2"; shift 2 ;;
    --font-mocks) FONT_MOCKS="$2"; shift 2 ;;
    *) echo "unknown option $1" >&2; exit 2 ;;
  esac
done
[ -n "$REF" ] && [ -n "$WORK" ] && [ -n "$DOCS" ] || { echo "usage: --reference DIR --work DIR --docs \"A B C\" [--build] [--browser] [--env-file F] [--font-mocks F]" >&2; exit 2; }
git -C "$REF" rev-parse HEAD >/dev/null 2>&1 || { echo "--reference must be a git clone" >&2; exit 2; }
mkdir -p "$WORK" && WORK="$(cd "$WORK" && pwd)"
case "$WORK/" in "$REF"/*) echo "BLOCKED: --work is inside the reference clone; isolation cannot be guaranteed" >&2; exit 2 ;; esac
case "$REF/" in "$WORK"/*) echo "BLOCKED: the reference clone is inside --work" >&2; exit 2 ;; esac
[ -z "$(ls -A "$WORK")" ] || { echo "--work must be empty" >&2; exit 2; }
read -r -a INPUTS <<< "$DOCS"
[ "${#INPUTS[@]}" -ge 3 ] || { echo "--docs needs at least three blog inputs" >&2; exit 2; }

SITE="$WORK/site"; EV="$WORK/evidence"; mkdir -p "$EV"
LOG="$EV/staging.log"; RESULTS="$EV/results.tsv"; : > "$RESULTS"
CLI=(node "$FRAMEWORK/node_modules/vite-node/vite-node.mjs" "$FRAMEWORK/src/blog/cli.ts" --)
PY="$(command -v python3 || command -v python)"
log() { printf '%s %s\n' "$(date -u +%H:%M:%S)" "$*" | tee -a "$LOG"; }
result() { printf '%s\t%s\t%s\n' "$1" "$2" "$3" >> "$RESULTS"; log "[$2] $1 — $3"; }
blog() { (cd "$FRAMEWORK" && "${CLI[@]}" "$@"); }
fingerprint() { (cd "$1" && find . \( -name .git -o -name node_modules -o -name .next \) -prune -o -type f -print0 | LC_ALL=C sort -z | xargs -0 sha256sum); }
ref_state() { printf 'commit %s\nstatus-lines %s\nfingerprint %s\n' "$(git -C "$REF" rev-parse HEAD)" "$(git -C "$REF" status --porcelain | wc -l)" "$(fingerprint "$REF" | sha256sum | cut -c1-64)"; }
slug_of() { "$PY" -c "import json,sys;print(json.load(open(sys.argv[1]))['blogs'][0]['slug'])" "$1/manifest.json"; }
strays() { (cd "$SITE" && find . \( -name node_modules -o -name .next \) -prune -o \( -name '*.tmp-*' -o -name '*.stale-*' -o -name '.blog-publish.lock' \) -print); }

# ---------------------------------------------------------------- 0. reference is read-only
ref_state > "$EV/reference-before.txt"; log "reference before: $(tr '\n' ' ' < "$EV/reference-before.txt")"

# ---------------------------------------------------------------- 1. disposable copy, no git metadata
(cd "$REF" && tar --exclude=.git -cf - .) | (mkdir -p "$SITE" && cd "$SITE" && tar -xf -)
[ ! -e "$SITE/.git" ] && result "copy has no .git (cannot commit or push)" PASS "$SITE" || result "copy has no .git" FAIL "$SITE/.git exists"
if [ -n "$ENV_FILE" ]; then set -a; . "$ENV_FILE"; set +a; fi
[ -n "$FONT_MOCKS" ] && export NEXT_FONT_GOOGLE_MOCKED_RESPONSES="$FONT_MOCKS"
export NEXT_TELEMETRY_DISABLED=1
if [ "$BUILD" = 1 ]; then
  log "installing dependencies in the copy"; (cd "$SITE" && npm ci --no-audit --no-fund > "$EV/npm-ci.log" 2>&1)
  (cd "$SITE" && npx next build > "$EV/build-baseline.log" 2>&1) && result "baseline build of the untouched copy" PASS "$(LC_ALL=C.UTF-8 grep -cE '^[├└┌] .? ?/' "$EV/build-baseline.log") routes" || result "baseline build of the untouched copy" FAIL "see build-baseline.log"
fi
fingerprint "$SITE" > "$EV/site-0-baseline.sha256"

# ---------------------------------------------------------------- 2. detection
blog inspect-site "$SITE" > "$EV/site-compatibility.md" 2>&1 && result "site detection" PASS "$(grep -m1 'Site kind' "$EV/site-compatibility.md")" || result "site detection" FAIL "$(head -3 "$EV/site-compatibility.md")"

# ---------------------------------------------------------------- 3. ingest, preview, compare with the source, approve
RUNS=()
for i in "${!INPUTS[@]}"; do
  in="${INPUTS[$i]}"; run="$WORK/run-$i"; RUNS+=("$run")
  "$PY" "$FRAMEWORK/website_workflow/tools/blog_ingest.py" "$in" --out "$run" > "$EV/ingest-$i.log" 2>&1 && result "ingest $(basename "$in")" PASS "$(grep -m1 '^\[blog-1\]' "$EV/ingest-$i.log")" || result "ingest $(basename "$in")" FAIL "see ingest-$i.log"
  blog preview "$run" --site "$SITE" > "$EV/preview-$i.log" 2>&1
  slug="$(slug_of "$run")"; cp "$run/reports/$slug.validation.md" "$EV/validation-$i.md" 2>/dev/null
  result "preview $(basename "$in")" "$(grep -q 'BLOCKED' "$EV/preview-$i.log" && echo FAIL || echo PASS)" "$(grep -m1 '^\[blog-1\]' "$EV/preview-$i.log")"
  src="$in"; [ -d "$in" ] && src="$(find "$in" -maxdepth 1 -type f \( -name '*.md' -o -name '*.docx' -o -name '*.pdf' -o -name '*.html' -o -name '*.odt' -o -name '*.rtf' \) | head -1)"
  if "$PY" "$FRAMEWORK/website_workflow/tools/blog_compare.py" "$src" "$run/preview/$slug/index.html" > "$EV/compare-$i.txt" 2>&1; then
    result "source vs preview (independent reader) $(basename "$src")" INFO "$(head -1 "$EV/compare-$i.txt")"
  else result "source vs preview $(basename "$src")" NOT-RUN "$(cat "$EV/compare-$i.txt")"; fi
  blog approve "$run" --by "Staging test" --accept-warnings > "$EV/approve-$i.log" 2>&1 && result "approve $(basename "$in")" PASS "$(cat "$EV/approve-$i.log")" || result "approve $(basename "$in")" FAIL "$(cat "$EV/approve-$i.log")"
done

# ---------------------------------------------------------------- 4. blog-route conflict: a page the workflow did not write
FOREIGN="$SITE/app/blog/page.tsx"; [ -d "$SITE/app" ] || FOREIGN="$SITE/blog/index.html"
mkdir -p "$(dirname "$FOREIGN")" && echo 'export default function Page() { return <h1>Hand-made blog</h1>; }' > "$FOREIGN"
before="$(fingerprint "$SITE" | sha256sum)"
blog publish "${RUNS[0]}" --site "$SITE" > "$EV/conflict.log" 2>&1
code=$?; after="$(fingerprint "$SITE" | sha256sum)"
[ $code -ne 0 ] && grep -q "did not create" "$EV/conflict.log" && [ "$before" = "$after" ] && result "existing blog route is refused, nothing written" PASS "$(head -c 200 "$EV/conflict.log")" || result "existing blog route is refused" FAIL "exit $code"
rm -f "$FOREIGN"; rmdir "$(dirname "$FOREIGN")" 2>/dev/null
cmp -s <(fingerprint "$SITE") "$EV/site-0-baseline.sha256" && result "copy back to baseline after conflict test" PASS "" || result "copy back to baseline after conflict test" FAIL ""

# ---------------------------------------------------------------- 5. two publishers at once (lock), then publish both
( blog publish "${RUNS[0]}" --site "$SITE" > "$EV/race-a.log" 2>&1; echo $? > "$EV/race-a.code" ) &
( BLOG_PUBLISH_HOLD_MS=150 blog publish "${RUNS[1]}" --site "$SITE" > "$EV/race-b.log" 2>&1; echo $? > "$EV/race-b.code" ) &
wait
codes="$(cat "$EV/race-a.code") $(cat "$EV/race-b.code")"
if grep -q "another publish is in progress" "$EV/race-a.log" "$EV/race-b.log"; then result "simultaneous publish: second publisher refused by the lock" PASS "exit codes $codes"; else result "simultaneous publish" INFO "no overlap occurred (exit codes $codes); both ran in turn"; fi
for i in 0 1; do blog publish "${RUNS[$i]}" --site "$SITE" > "$EV/publish-$i.log" 2>&1 && result "publish $(slug_of "${RUNS[$i]}")" PASS "$(grep -m1 -E 'published|nothing to do' "$EV/publish-$i.log")" || result "publish $(slug_of "${RUNS[$i]}")" FAIL "$(cat "$EV/publish-$i.log")"; done
fingerprint "$SITE" > "$EV/site-1-published.sha256"
# File names may contain spaces (they do on real sites): compare in Python, by exact path.
read -r added changed <<< "$("$PY" - "$EV/site-0-baseline.sha256" "$EV/site-1-published.sha256" "$EV/files-added.txt" "$EV/files-changed.txt" <<'PYEOF'
import sys
def load(p):
    out = {}
    for line in open(p, encoding="utf-8", errors="surrogateescape"):
        h, _, path = line.rstrip("\n").partition("  ")
        out[path] = h
    return out
a, b = load(sys.argv[1]), load(sys.argv[2])
added = sorted(set(b) - set(a)); changed = sorted(p for p in set(a) & set(b) if a[p] != b[p]); removed = sorted(set(a) - set(b))
open(sys.argv[3], "w").write("\n".join(added) + "\n")
open(sys.argv[4], "w").write("\n".join(["changed " + p for p in changed] + ["removed " + p for p in removed]) + "\n")
print(len(added), len(changed) + len(removed))
PYEOF
)"
[ "$changed" = 0 ] && result "no existing site file modified or removed by publishing" PASS "$added file(s) added, 0 changed, 0 removed (files-added.txt)" || result "existing site files modified" FAIL "$changed (files-changed.txt)"
blog publish "${RUNS[0]}" --site "$SITE" > "$EV/retry.log" 2>&1; grep -q "nothing to do" "$EV/retry.log" && cmp -s <(fingerprint "$SITE") "$EV/site-1-published.sha256" && result "retry of a finished publish changes nothing" PASS "" || result "retry" FAIL "$(cat "$EV/retry.log")"

# ---------------------------------------------------------------- 6. build and browser check with the posts
if [ "$BUILD" = 1 ]; then
  (cd "$SITE" && npx next build > "$EV/build-published.log" 2>&1) && result "production build with published posts" PASS "$(LC_ALL=C.UTF-8 grep -cE '^[├└┌] .? ?/' "$EV/build-published.log") routes; $(LC_ALL=C.UTF-8 grep -cE ' /blog' "$EV/build-published.log") blog route(s)" || result "production build with published posts" FAIL "see build-published.log"
  fingerprint "$SITE" > "$EV/site-1-published.sha256"   # a build may rewrite next-env.d.ts; the rollback baseline is AFTER it
  if [ "$BROWSER" = 1 ]; then
    # A FREE port chosen now, a server in its own process group, and proof that the server answering is
    # this run's: an earlier server left on a fixed port once served a deleted build to these checks.
    PORT="$("$PY" -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1]); s.close()')"
    SRVPID="$EV/server.pgid"; rm -f "$SRVPID"
    (cd "$SITE" && setsid bash -c 'echo $$ > "$0"; exec npx next start -H 127.0.0.1 -p "$1"' "$SRVPID" "$PORT" > "$EV/next-start.log" 2>&1 &)
    for _ in $(seq 1 120); do curl -s -o /dev/null "http://127.0.0.1:$PORT/" && break; sleep 0.25; done
    expect="$("$PY" -c "import json,sys;m=json.load(open(sys.argv[1]));print(next((a['path'].split('/')[-1] for a in m['blogs'][0]['assets'] if a['role'] in ('cover','supporting')), ''))" "${RUNS[0]}/manifest.json")"
    if curl -s "http://127.0.0.1:$PORT/blog/$(slug_of "${RUNS[0]}")" | grep -q "$expect"; then
      result "the server under test is this run's build" PASS "port $PORT serves $expect"
      urls=(); for r in "${RUNS[0]}" "${RUNS[1]}"; do urls+=("http://127.0.0.1:$PORT/blog/$(slug_of "$r")"); done
      node "$FRAMEWORK/tests/browser/blog-browser-check.cjs" "${urls[@]}" "http://127.0.0.1:$PORT/blog" --route-base /blog --out "$EV/browser.json" --screenshots "$EV/screenshots" ${AXE:+--axe "$AXE"} > "$EV/browser.log" 2>&1
      code=$?
      result "browser checks of the blog pages (see browser.log)" "$( [ $code -eq 0 ] && echo PASS || echo FAIL)" "$(grep -c ' FAIL ' "$EV/browser.log") failing check line(s); $(grep -c 'SITE-OWNED' "$EV/browser.log") site-owned finding line(s); $(grep -c 'NOT RUN' "$EV/browser.log") engine(s) not run"
      code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/")"; [ "$code" = 200 ] && result "existing home page still served" PASS "HTTP $code" || result "existing home page" FAIL "HTTP $code"
    else
      result "the server under test is this run's build" FAIL "port $PORT does not serve this run's post (expected $expect); browser checks NOT run"
    fi
    [ -s "$SRVPID" ] && kill -- "-$(cat "$SRVPID")" 2>/dev/null; sleep 1
  fi
fi

# ---------------------------------------------------------------- 7. simulated failure: publisher killed mid-commit, then recovery
slug3="$(slug_of "${RUNS[2]}")"
# The publisher runs in its OWN session; its process group id is written to a file and only that group is
# killed. (Looking up the group of the wrapping subshell would name this script's own group.)
PIDFILE="$EV/killed.pgid"; rm -f "$PIDFILE"
(cd "$FRAMEWORK" && BLOG_PUBLISH_HOLD_MS=400 setsid bash -c 'echo $$ > "$0"; exec "$@"' "$PIDFILE" "${CLI[@]}" publish "${RUNS[2]}" --site "$SITE" > "$EV/killed.log" 2>&1) & pid=$!
for _ in $(seq 1 200); do { [ -e "$SITE/app/blog/$slug3/page.tsx" ] || [ -e "$SITE/blog/$slug3/index.html" ] || ls "$SITE"/public/blog/"$slug3"/assets/* >/dev/null 2>&1; } && break; sleep 0.05; done
for _ in $(seq 1 100); do [ -s "$PIDFILE" ] && break; sleep 0.05; done
victim="$(cat "$PIDFILE" 2>/dev/null)"
if [ -n "$victim" ] && [ "$victim" != "$$" ] && [ "$victim" != "$(ps -o pgid= $$ | tr -d ' ')" ]; then kill -9 -- "-$victim" 2>/dev/null; fi
wait $pid 2>/dev/null
partial="$(fingerprint "$SITE" | sha256sum)"
if [ "$partial" != "$(sha256sum < "$EV/site-1-published.sha256")" ]; then
  result "publisher killed mid-commit leaves a partial state (precondition)" PASS "$(grep -c . "$EV/killed.log") line(s) of output before the kill"
  blog lock-status "$SITE" > "$EV/lock-after-kill.log" 2>&1; result "stale lock reported after the kill" "$(grep -q STALE "$EV/lock-after-kill.log" && echo PASS || echo FAIL)" "$(tail -1 "$EV/lock-after-kill.log")"
  blog rollback "${RUNS[2]}" > "$EV/recover.log" 2>&1
  cmp -s <(fingerprint "$SITE") "$EV/site-1-published.sha256" && result "rollback of the interrupted publish restores the site exactly" PASS "$(tr '\n' ' ' < "$EV/recover.log")" || { diff <(fingerprint "$SITE") "$EV/site-1-published.sha256" > "$EV/recover-diff.txt"; result "rollback of the interrupted publish" FAIL "see recover-diff.txt"; }
else
  result "simulated mid-commit failure" FAIL "the publish was not interrupted part-way (it was refused or finished first: $(head -c 200 "$EV/killed.log")), so recovery was NOT tested"
fi

# ---------------------------------------------------------------- 8. roll back both posts, newest first: back to the baseline
# Which publish was newer depends on who won the race above, so ask the site's own history.
newest="$("$PY" -c "import json,sys;print(json.load(open(sys.argv[1]))['transactions'][-1]['run'])" "$SITE/.blog-publish-history.json")"
if [ "$newest" = "$(basename "${RUNS[0]}")" ]; then FIRST="${RUNS[0]}"; SECOND="${RUNS[1]}"; else FIRST="${RUNS[1]}"; SECOND="${RUNS[0]}"; fi
before_wrong="$(fingerprint "$SITE" | sha256sum)"
blog rollback "$SECOND" > "$EV/rollback-wrong-order.log" 2>&1; code=$?
[ $code -ne 0 ] && grep -q "cannot be rolled back yet" "$EV/rollback-wrong-order.log" && [ "$before_wrong" = "$(fingerprint "$SITE" | sha256sum)" ] && result "rollback in the wrong order is refused and changes nothing" PASS "$(head -c 160 "$EV/rollback-wrong-order.log")" || result "rollback in the wrong order" FAIL "exit $code: $(head -c 200 "$EV/rollback-wrong-order.log")"
blog rollback "$FIRST" > "$EV/rollback-newest.log" 2>&1 && blog rollback "$SECOND" > "$EV/rollback-oldest.log" 2>&1 || result "rollback newest first" FAIL "$(cat "$EV/rollback-newest.log" "$EV/rollback-oldest.log")"
fingerprint "$SITE" > "$EV/site-2-rolled-back.sha256"
diff "$EV/site-0-baseline.sha256" "$EV/site-2-rolled-back.sha256" > "$EV/rollback-diff.txt"
if [ ! -s "$EV/rollback-diff.txt" ]; then result "rollback returns the copy to its baseline, byte for byte" PASS ""
else
  only_build="$(grep -E '^[<>]' "$EV/rollback-diff.txt" | grep -vE '\./(next-env\.d\.ts|tsconfig\.json|tsconfig\.tsbuildinfo)$' | wc -l)"
  [ "$only_build" = 0 ] && result "rollback returns the copy to its baseline" PASS "except files rewritten by next build itself: $(grep -oE '\./[^ ]+$' "$EV/rollback-diff.txt" | sort -u | tr '\n' ' ')" || result "rollback returns the copy to its baseline" FAIL "see rollback-diff.txt"
fi
[ -z "$(strays)" ] && result "no lock, temporary or stale files left" PASS "" || result "leftover files" FAIL "$(strays | tr '\n' ' ')"

# ---------------------------------------------------------------- 9. reference unchanged
ref_state > "$EV/reference-after.txt"
cmp -s "$EV/reference-before.txt" "$EV/reference-after.txt" && result "reference repository unchanged (commit, status, every file)" PASS "$(tr '\n' ' ' < "$EV/reference-after.txt")" || result "reference repository CHANGED" FAIL "$(diff "$EV/reference-before.txt" "$EV/reference-after.txt" | tr '\n' ' ')"

echo; echo "STAGING RESULTS ($RESULTS)"; awk -F'\t' '{ printf "%-9s %s — %s\n", $2, $1, substr($3, 1, 150) }' "$RESULTS"
grep -q $'\tFAIL\t' "$RESULTS" && exit 1 || exit 0
