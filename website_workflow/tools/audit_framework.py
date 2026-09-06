#!/usr/bin/env python3
"""
audit_framework.py — the framework's self-check, run before every commit.

Encodes the checks that were previously run by hand each time, plus the
REVERSE token check the framework has recorded as missing twice and never
implemented (UniqBotz M-13; degraded_paths.md DP-002): /winit verifies that
no {TOKEN} was left unresolved, but never that a LITERAL was left
un-tokenized — the opposite and more dangerous direction.

Usage:
  python website_workflow/tools/audit_framework.py            # from repo root
  python website_workflow/tools/audit_framework.py --strict   # WARN also fails

Exit: 0 all clear (warnings allowed) · 1 at least one FAIL · 2 bad invocation.
A WARN is a human-review item, not a blocker: a checker that cries wolf gets
switched off, which is the failure class this framework keeps closing.
"""
import argparse, glob, io, os, re, subprocess, sys

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

R = []  # (name, status, [detail lines])
def rec(name, status, details=None): R.append((name, status, details or []))
def read(p): return io.open(p, encoding="utf-8", errors="replace").read()

# Files instantiated per-site by /winit, deliberately absent from the master.
PER_SITE = {"app_reality.md", "site_profile.md", "decisions_log.md", "test_register.md"}
# Referenced but owned by someone else / deliberately external.
EXTERNAL = {"test-cases.md", "uniqbotz-website-plan-revised.md"}
# Regex artifacts: filename PATTERNS and line-wrapped names, not real links.
ARTIFACT = {"_audit.md", "library.md"}
# Tools documented as living in a DIFFERENT repo (skills_map records the route).
EXTERNAL_TOOLS = {"tools/export_index_csv.py"}

ACCEPTED_FILE = os.path.join("website_workflow", "tools", "audit_accepted.txt")

def load_accepted():
    """Findings the owner has explicitly accepted, with a reason. Mirrors
    qa_workflow.md 6.4: fixed OR accepted in writing — silent tolerance is not
    acceptance. An entry with no reason is a suppression and is ignored."""
    out = []
    if not os.path.exists(ACCEPTED_FILE):
        return out
    for raw in read(ACCEPTED_FILE).splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        parts = [x.strip() for x in line.split("|")]
        if len(parts) < 2 or not parts[0] or not parts[1]:
            continue          # no reason given -> not an acceptance
        out.append((parts[0], parts[1], parts[2] if len(parts) > 2 else "unattributed"))
    return out

ACCEPTED = []

def md_files():
    out = []
    for pat in ("website_workflow/**/*.md", "*.md", ".claude/commands/*.md"):
        out += glob.glob(pat, recursive=True)
    return sorted(set(out))


# ---------------------------------------------------------------- 1 command parity
def check_command_parity():
    a = sorted(glob.glob(".claude/commands/*.md"))
    if not a:
        return rec("command duplicate parity", "WARN", ["no .claude/commands/*.md found"])
    bad = []
    for f in a:
        twin = os.path.join("website_workflow", "commands", os.path.basename(f))
        if not os.path.exists(twin):
            bad.append(f"{os.path.basename(f)}: no twin at {twin}")
        elif read(f) != read(twin):
            bad.append(f"{os.path.basename(f)}: DRIFT between the two copies")
    rec(f"command duplicate parity ({len(a)} pairs)", "FAIL" if bad else "PASS", bad)


# ---------------------------------------------------------------- 2 cross-references
def check_cross_refs():
    known = {os.path.basename(p) for p in glob.glob("**/*.md", recursive=True)
             if ".git" not in p}
    pat = re.compile(r"((?:checklists/|templates/|commands/|qa/|tools/)?[a-z_0-9-]+\.md)")
    bad, n = [], 0
    for f in md_files():
        for m in set(pat.findall(read(f))):
            b = os.path.basename(m)
            if b in PER_SITE | EXTERNAL | ARTIFACT:
                continue
            n += 1
            if b not in known:
                bad.append(f"{f} -> {m}")
    rec(f"internal .md cross-references ({n} checked)", "FAIL" if bad else "PASS", bad)


# ---------------------------------------------------------------- 3 skill integrity
def check_skills():
    dirs = sorted(glob.glob(".claude/skills/*/"))
    bad = []
    for d in dirs:
        name = os.path.basename(os.path.normpath(d))
        skill = os.path.join(d, "SKILL.md")
        if not os.path.exists(skill):
            others = [f for f in os.listdir(d) if f.endswith(".md")]
            bad.append(f"{name}: no SKILL.md"
                       + (f" (found {others[0]} — any other name does NOT load)" if others else ""))
            continue
        # every relative .md a SKILL.md links to must exist (the 404-checklist class)
        for link in set(re.findall(r"\]\(([A-Za-z0-9_./-]+\.md)\)", read(skill))):
            if link.startswith("http"):
                continue
            if not os.path.exists(os.path.join(d, link)):
                bad.append(f"{name}: SKILL.md links to missing {link}")
    rec(f"skill folders ({len(dirs)})", "FAIL" if bad else "PASS", bad)


# ---------------------------------------------------------------- 4 README currency
def check_readme_table():
    if not os.path.exists("README.md"):
        return rec("README Files table", "WARN", ["no README.md"])
    txt = read("README.md")
    listed = set(re.findall(r"^\|\s*([A-Za-z_0-9]+\.md)\s*\|", txt, re.M))
    listed |= set(re.findall(r"^\|\s*tools/([A-Za-z_0-9]+\.py)\s*\|", txt, re.M))
    on_disk = {os.path.basename(p) for p in glob.glob("website_workflow/*.md")}
    tools = {os.path.basename(p) for p in glob.glob("website_workflow/tools/*.py")}
    missing = sorted((on_disk - listed) | (tools - listed))
    ghost = sorted(x for x in listed
                   if x.endswith(".md") and x not in on_disk and x not in PER_SITE)
    det = [f"on disk but NOT in the Files table: {m}" for m in missing]
    det += [f"in the Files table but NOT on disk: {g}" for g in ghost]
    rec("README Files table currency (rule 7)", "FAIL" if det else "PASS", det)


# ---------------------------------------------------------------- 5 library parity
def check_library_parity():
    p = "website_workflow/design_library.md"
    if not os.path.exists(p):
        return rec("design_library index/body parity", "WARN", ["file not found"])
    txt = read(p)
    idx = set(re.findall(r"^\|\s*((?:REF|ALT|IDEA)-[0-9a-z]+)\s*\|", txt, re.M))
    body = set(re.findall(r"^##\s+((?:REF|ALT|IDEA)-[0-9a-z]+)\b", txt, re.M))
    det = [f"INDEX row with no body section: {x}" for x in sorted(idx - body)]
    det += [f"body section with no INDEX row: {x}" for x in sorted(body - idx)]
    rec(f"design_library index/body parity ({len(idx)} entries)",
        "FAIL" if det else "PASS", det)


# ---------------------------------------------------------------- 6 tokens, BOTH ways
SITE_AGNOSTIC = ["website_workflow/*.md", "website_workflow/checklists/*.md",
                 "website_workflow/templates/*.md", ".claude/commands/*.md"]
# Prose that legitimately names a real site or colour: precedent, provenance,
# incident records, and MEASURED evidence (a contrast ratio, a verified seed).
# Tuned after the first run, where ~85% of hits were legitimate documentation.
PRECEDENT = re.compile(r"prevents|precedent|recorded|root cause|run,|uniqbotz m-|"
                       r"provenance|battle-tested|decisions_log|incident|20\d\d-\d\d-\d\d|"
                       r"verified|measures|measured|:1\b|ratio|seed|example|e\.g\.|"
                       r"hostile|supersed", re.I)
# A site name inside a longer hyphenated identifier is a SKILL or REPO name
# (uniqbrio-character-bible, uniqbrio-skills-cloud), not an un-tokenized literal.
SITE_LITERAL = re.compile(r"(?<![\w-])(UniqBrio|UniqBotz|uniqbrio|uniqbotz)(?![\w-])")

def check_tokens():
    files = []
    for g in SITE_AGNOSTIC:
        files += glob.glob(g)
    # 6a FORWARD: an unresolved {TOKEN} is expected in the master, so only
    # malformed ones are an error here (a site clone flips this — see note).
    malformed = []
    for f in sorted(set(files)):
        for m in re.findall(r"\{[A-Z_]*[a-z][A-Za-z_]*\}", read(f)):
            malformed.append(f"{f}: {m} (tokens are UPPER_SNAKE)")
    rec("token form (forward check)", "FAIL" if malformed else "PASS", malformed)

    # 6b REVERSE: a literal that should have been a token. This is the check
    # /winit has never had — UniqBotz M-13 / degraded_paths.md DP-002.
    hits = []
    hexcol = re.compile(r"#[0-9A-Fa-f]{6}\b")
    for f in sorted(set(files)):
        for i, line in enumerate(read(f).splitlines(), 1):
            if PRECEDENT.search(line):
                continue
            for m in set(hexcol.findall(line)):
                hits.append(f"{f}:{i} hex literal {m} — should be a colour token")
            for m in set(SITE_LITERAL.findall(line)):
                hits.append(f"{f}:{i} site name '{m}' — should be {{SITE_NAME}}")
    rec("un-tokenized literals (REVERSE check — M-13 / DP-002)",
        "WARN" if hits else "PASS", hits)


# ---------------------------------------------------------------- 7 cited tools exist
def check_cited_tools():
    pat = re.compile(r"((?:website_workflow/)?tools/[A-Za-z0-9_./-]+\.py)")
    bad, n = [], 0
    for f in md_files():
        for m in set(pat.findall(read(f))):
            if m in EXTERNAL_TOOLS:
                continue
            n += 1
            cand = [m, os.path.join("website_workflow", m)]
            if not any(os.path.exists(c) for c in cand):
                bad.append(f"{f} cites missing {m}")
    rec(f"cited tools exist ({n} references)", "FAIL" if bad else "PASS", bad)


# ---------------------------------------------------------------- 8 scripts run
def check_scripts():
    scripts = sorted(glob.glob("website_workflow/tools/*.py")
                     + glob.glob(".claude/skills/*/scripts/*.py"))
    bad = []
    for s in scripts:
        r = subprocess.run([sys.executable, "-m", "py_compile", s],
                           capture_output=True, text=True)
        if r.returncode:
            bad.append(f"{s}: does not compile — {r.stderr.strip().splitlines()[-1:]}")
    rec(f"python scripts compile ({len(scripts)})", "FAIL" if bad else "PASS", bad)


# ---------------------------------------------------------------- 9 mapped skills
def check_mapped_skills():
    p = "website_workflow/skills_map.md"
    if not os.path.exists(p):
        return rec("mapped skills availability", "WARN", ["skills_map.md not found"])
    SUF = ("-expert", "-specialist", "-architect", "-analyst", "-writer", "-designer",
           "-director", "-planner", "-checker", "-generator", "-builder", "-auditor",
           "-orchestrator", "-selector", "-reviewer", "-strategist", "-optimizer",
           "-mapper", "-bible", "-academy", "-evaluator", "-pipeline")
    names = {c for c in re.findall(r"\b([a-z][a-z0-9]+(?:-[a-z0-9]+){1,5})\b", read(p))
             if c.endswith(SUF)}
    installed = {os.path.basename(os.path.normpath(d))
                 for d in glob.glob(".claude/skills/*/")}
    missing = sorted(names - installed)
    det = []
    if missing:
        det = [f"{len(missing)} of {len(names)} mapped skills are NOT installed locally.",
               "skills_map.md Fallback says STOP the pipeline when a skill exists",
               "in neither Claude Cloud nor the repo — unverifiable from here, so this",
               "is a WARN. If these are unavailable in a site session too, the rule is",
               "unsatisfiable and will be ignored, which is worse than no rule.",
               "First 12: " + ", ".join(missing[:12])]
    rec("mapped skills installed locally", "WARN" if missing else "PASS", det)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--strict", action="store_true", help="treat WARN as failure")
    a = ap.parse_args()
    if not os.path.isdir("website_workflow"):
        print("Run from the repo root (website_workflow/ not found).")
        return 2

    ACCEPTED[:] = load_accepted()
    for fn in (check_command_parity, check_cross_refs, check_skills,
               check_readme_table, check_library_parity, check_tokens,
               check_cited_tools, check_scripts, check_mapped_skills):
        try:
            fn()
        except Exception as e:                      # a broken check must not pass silently
            rec(fn.__name__, "FAIL", [f"checker itself errored: {e!r}"])

    # Downgrade explicitly accepted findings before tallying.
    accepted_hits = []
    adjusted = []
    for name, status, det in R:
        if status == "FAIL" and det:
            keep, acc = [], []
            for d in det:
                match = next((a for a in ACCEPTED if a[0] in d), None)
                (acc if match else keep).append((d, match) if match else d)
            if acc and not keep:
                status = "ACPT"
                det = [f"{d}\n           ACCEPTED: {m[1]} [{m[2]}]" for d, m in acc]
            elif acc:
                det = keep + [f"(accepted, not blocking) {d}" for d, _ in acc]
            accepted_hits += acc
        adjusted.append((name, status, det))
    R[:] = adjusted

    print("FRAMEWORK SELF-AUDIT\n" + "=" * 72)
    for name, status, det in R:
        print(f"[{status:4}] {name}")
        for d in det[:25]:
            print(f"         {d}")
        if len(det) > 25:
            print(f"         ... and {len(det) - 25} more")
    fails = [r for r in R if r[1] == "FAIL"]
    warns = [r for r in R if r[1] == "WARN"]
    accs = [r for r in R if r[1] == "ACPT"]
    print("=" * 72)
    print(f"{len(R)} checks | {len(fails)} FAIL | {len(warns)} WARN | "
          f"{len(accs)} ACCEPTED (recorded decisions — review them)")
    if fails:
        print("RESULT: FAIL — fix before committing.")
        return 1
    if warns and a.strict:
        print("RESULT: FAIL (--strict: warnings treated as failures).")
        return 1
    print("RESULT: PASS" + (" (warnings are human-review items, not blockers)" if warns else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
