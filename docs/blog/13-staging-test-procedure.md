# 13 — Staging test procedure and evidence

A staging test runs the whole blog branch — detection, ingest, preview,
comparison with the source, approval, conflict refusal, concurrent publishing,
production build, browser checks, a publisher killed mid-commit, recovery,
out-of-order rollback refusal and rollback to the byte — against a COPY of a
real website. It never touches the real repository or the live site.

## Safety rules (enforced by the script)

1. The reference is a git clone that is treated as READ-ONLY. Disable pushes
   on it before you start: `git -C <clone> remote set-url --push origin DISABLED-read-only`.
2. The working copy is made WITHOUT `.git`, so nothing in it can be committed
   or pushed. The script refuses a `--work` folder inside the clone, or the
   clone inside `--work`, and requires `--work` to be empty.
3. The clone's commit, `git status` and a SHA-256 fingerprint of every file are
   recorded before and after; the script FAILS if any changed.
4. Builds read only the `--env-file` you give. Use placeholders on a domain that
   cannot resolve, so no real backend, analytics or e-mail service is reached:
   ```
   export NEXT_PUBLIC_SUPABASE_URL=https://staging-placeholder.invalid
   export NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder
   export SUPABASE_SERVICE_ROLE_KEY=placeholder
   export NEXT_PUBLIC_GA_MEASUREMENT_ID=
   ```
5. Nothing is deployed. Servers listen on 127.0.0.1, on a free port chosen at
   run time, and the script proves the server answering is its own build
   before any browser result counts.

## Inputs

Three blog inputs (files or folders), each one blog: the first two are
published, the third is the one killed mid-commit. Use documents that are
clearly labelled test content. The 2026-11-13 run used synthetic `FIXTURE`
documents: a Markdown package (cover, chart, GIF, H.264 video with SRT
captions, YouTube link, table, code, footnote, call to action, instruction
file with alt text), a Word file written by python-docx (embedded images,
lists, table, hyperlink, `[VIDEO: demo.mp4]` directive, no caption file), and
a PDF made from that Word file by LibreOffice.

**No real customer document has been tested.** That remains open (17).

## Run

```
website_workflow/tools/blog_staging_test.sh \
  --reference <read-only clone> --work <new empty folder> \
  --docs "<input 1> <input 2> <input 3>" \
  --build --browser --env-file <placeholder env file> \
  [--font-mocks <file>]           # only where Google Fonts cannot be reached
AXE=/path/to/axe.min.js  # optional, before the command: adds axe-core results
```
Evidence is written to `<work>/evidence/`: `results.tsv` (one line per step),
`staging.log`, the reference before/after state, fingerprints of the copy at
each stage, the files added, validation reports, source-vs-preview comparisons,
build logs, `browser.log` / `browser.json` and screenshots.

### Building where Google Fonts is unreachable

`next/font/google` downloads fonts at build time. Where the build machine
cannot, use Next.js's own hook `NEXT_FONT_GOOGLE_MOCKED_RESPONSES` with a
file mapping each stylesheet URL to its CSS, the font files saved locally
(`--font-mocks`). The site's code is not changed. Fetch the stylesheets on a
machine that can reach Google Fonts, or build there instead.

## What each step proves

| Step | Pass means |
|---|---|
| copy has no `.git` | the copy cannot be committed or pushed |
| baseline build | the untouched site builds here, so a later build failure is attributable |
| site detection | the site kind is recognised; review items are listed |
| ingest / preview / approve × 3 | each input becomes a manifest, a preview and an approval of that exact version |
| source vs preview (INFO) | independent readers (pandoc, pdftotext) find the source's words on the preview; read the "not found" lines |
| existing blog route refused | a `/blog` page the workflow did not write blocks publishing, and nothing is written |
| simultaneous publish | the per-site lock refuses the second publisher |
| publish × 2, nothing modified | posts added; no existing site file changed or removed |
| retry | a second publish of the same version changes nothing |
| production build | the site builds with the posts; blog routes are prerendered |
| browser checks | the blog pages pass the accessibility, keyboard, media and responsive checks |
| killed mid-commit → recovery | a SIGKILLed publisher leaves a partial state and a stale lock; rollback restores the site exactly |
| rollback out of order refused | an older publish cannot be undone before a newer one that touched the same files |
| rollback to the byte | the copy is identical to its baseline, every file |
| reference unchanged | commit, status and every file of the real repository are as before |

## Evidence — UniqBrio-Landing, 2026-11-13, final code

Sanitised summary: [evidence/2026-11-13-staging-results.md](evidence/2026-11-13-staging-results.md).

**31 PASS · 3 INFO · 1 FAIL.** Every workflow step passed; the reference clone
was unchanged before and after (commit, `git status`, and every file's hash).

- Baseline build: 45 routes. With the two posts: 48 routes, all three blog
  routes (`/blog` and both posts) prerendered static.
- Source vs preview, independent readers: Markdown 98.9 % (the one "not found"
  is a footnote number), Word 100 %, PDF 95.2 % (pdftotext's own reading order
  across a table column, and a word split by a PDF link — both explained; no
  content missing from the manifest).
- Browser (Chromium, 320/768/1280): post 1 and the index pass every check; post
  2 fails one check — its video has no captions track. That is the deliberate
  content gap: the ingest warned `VIDEO_CAPTIONS_MISSING`, the approver had to
  acknowledge it, and the browser check flags it again. axe-core: 0 violations
  on all nine page/width combinations.
- One SITE-OWNED finding, not caused by the blog branch: the site's own layout
  preloads an image file that does not exist (404 on every page). Reported to
  the owner; the site was not changed.

### What the staging test found (all fixed and re-run)

Rollback out of order across runs left a stale index (now refused); the layout
supplies no navigation (now reported); a code-generated sitemap (now
reported); no `<main>` landmark (now added only when missing); dark-site colour
fallbacks; a too-small target on standalone links; missing-captions and
unreadable-video warnings. Two harness defects were also found and fixed (a
kill step that hit its own process group; a stale server on a fixed port that
answered one run's browser checks — those results were discarded, not reported).
