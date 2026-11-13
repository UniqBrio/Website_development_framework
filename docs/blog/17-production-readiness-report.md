# 17 — Final production-readiness report

Date: 2026-11-13 · Branch `claude/determined-davinci-cdxd0b` · Blog Framework: **not integrated**.

Three different things are reported here, and they must not be confused:

| | Meaning | Status |
|---|---|---|
| **Automated test success** | the code does what the tests assert, in this environment | **ACHIEVED** |
| **Staging verification** | the workflow behaved correctly on a copy of a real site | **ACHIEVED, with stated gaps** (synthetic documents, Chromium only) |
| **Production approval** | a person accountable for the website decides it may be used on the live site | **NOT GIVEN — this is the owner's decision**, not something tests or this report can grant |

## Acceptance criteria

| # | Criterion | Verdict | Evidence |
|---|---|---|---|
| 1 | Concurrent publishing is safely controlled | **Met** | per-site lock; 13 real-process tests (simultaneous publishers, SIGKILL mid-commit, stale-lock race, lost run directory); repeated on the staging copy (15) |
| 2 | Resource limits protect document ingestion | **Met as a floor** | configurable limits with fixed ceilings; tools time/CPU/file-size/memory-limited and killed with their children; whole-ingest time and memory limits; 16 resource and fuzz tests. Untrusted packages still need the sandbox in 07 — the limits are not a sandbox |
| 3 | Recovery and rollback are tested | **Met** | crash recovery, rollback of an interrupted publish, out-of-order refusal, byte-exact rollback — in tests and on the staging copy |
| 4 | Existing website files remain protected | **Met** | foreign files never overwritten; staging copy: 17 files added, 0 changed, 0 removed; rollback back to the byte |
| 5 | Accessibility and browser limitations are documented | **Met** | 12 and 14: Chromium + axe pass on three kinds of site; WebKit, Firefox, screen readers and devices NOT verified, with a manual plan |
| 6 | Staging validation completed or explicitly pending | **Completed on a real site; partly pending** | UniqBrio-Landing copy: 31 PASS, 1 deliberate content FAIL (13). Pending: real customer documents |
| 7 | All regression tests pass | **Met** | 936 TypeScript + 53 Python tests, typecheck clean, audit 0 FAIL (09) |

## Issues fixed in this round

Concurrency (lock, lock-before-inspect, stale-lock recovery), crash recovery
reading the disk instead of journal flags, cross-run rollback ordering, ingest
timeout handling, silent depth skips, detection of layouts without navigation
and of code-generated sitemaps, `<main>` landmark, dark-site colour fallbacks,
target size, a call-to-action contrast regression, a 320 px overflow with code
blocks, captions and unreadable-video warnings. Full table: 07, findings 21–35.

## Remaining limitations

1. **Safari/WebKit, Firefox, screen readers, real devices: not verified.**
2. **No real customer document has been ingested.** Only synthetic, labelled
   documents (Markdown, python-docx Word, LibreOffice PDF).
3. **OCR not verified** with a real engine.
4. **Parsers fuzzed by seeded mutation only**, not coverage-guided.
5. **External tools are limited but not sandboxed** by the workflow itself.
6. On UniqBrio-Landing specifically: a post would have **no site navigation**
   (the layout renders none) and would **not appear in the code-generated
   sitemap** until those are addressed as separate, reviewed site changes.
7. Native-control focus rings are the browser's (thin in Chromium).
8. Unsupported website kinds still need manual mapping (04).

## Decision and recommendation

**Recommended: approve for SUPERVISED production use** — an operator following
11, one publish at a time, on generated, Next.js App Router (TypeScript) and
static HTML sites — once these three conditions are met:

1. The manual WebKit/Safari and screen-reader plan in 14 is run on the first
   real post, and passes.
2. The first real blog is a pilot: the owner compares the preview with the
   source (`blog_compare.py` plus reading it), before approval.
3. Packages from outside the organisation are ingested only in the sandbox
   described in 07.

**Not recommended yet: unsupervised or automated production use.** That
needs the remaining limitations 1–4 closed.

For UniqBrio-Landing in particular, decide first whether blog posts should
carry the site's navigation (limitation 6). Publishing there today would
produce a correct page with no header or footer.

The final production approval is the owner's, recorded in the site's
decisions_log.md with the run id, approver, digest and transaction id of the
first production publish.
