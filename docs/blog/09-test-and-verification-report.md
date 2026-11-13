# 09 — Test coverage and verification report

Date: 2026-11-13. Branch: `claude/determined-davinci-cdxd0b`.
Environment: Linux container, Node 22, Python 3, poppler 24.02, LibreOffice
24.2, ffmpeg; Playwright Chromium. NOT installed: tesseract, WebKit.

Only results that were actually produced in this environment are reported as
run. Anything else is in the "Not run" section.

## Automated suites — `npm run gate`

| Step | Command | Result |
|---|---|---|
| TypeScript typecheck | `npm run typecheck` | clean |
| TypeScript tests | `npm run test` | **919 passed, 0 failed** (34 files) |
| Python tests | `npm run test:py` | **37 passed, 0 failed** |
| Framework self-audit | `npm run audit:framework` | 0 FAIL, 2 WARN (both pre-existing, unrelated to the blog branch) |

Of the 919: 807 are the pre-existing website-generation tests, all unchanged
and passing; 112 are blog-branch tests.

| Blog test file | Tests | Covers |
|---|---|---|
| tests/blog/blog-ingest.test.ts | 41 | every document format, media handling, placement, packages, hostile input — through the real command line |
| tests/blog/blog-presentation.test.ts | 34 | contract, mapping, rendering, validation, preview → approval → publish on a generated site, isolation |
| tests/blog/blog-sites-and-safety.test.ts | 37 | website detection (3 supported kinds, 9 refused configurations), publishing to each kind, approval binding, transaction, recovery, rollback, replacement, hostile manifests |
| tests/python/test_blogkit.py | 37 | parser units, safety functions, limits, corrupt/duplicate/truncated media, conflicting sources, long articles, archive attacks, interrupted ingest, privacy of outputs, adversarial timing |

### Requirement → evidence

| Brief item | Evidence |
|---|---|
| Multiple posts | `publishes several blogs of one run together`; `keeps earlier posts in the index` |
| Long-form articles | `test_long_article_keeps_every_paragraph_in_order` (800 sections, every paragraph, in order, < 30 s) |
| Nested headings, tables, lists, quotes, code | `test_nested_headings_tables_gallery_and_attribution`; DOCX/Markdown structure tests |
| Images and galleries, captions, alt text, attribution | same; `renders images sized, with alt…` |
| GIFs and videos | `preserves animation byte-for-byte`; `renders video with native controls…` |
| Charts as data tables | `reads a native chart's data without changing a value`; `shows a native chart as its exact data table` |
| Embedded media, external links | `keeps an external video as a link…`; HTML test |
| Missing, duplicated, corrupt, unsupported media | `test_corrupt_missing_duplicate_and_unsupported_media` |
| Multiple sources, conflicting content | `test_conflicting_source_documents`; `test_same_blog_in_two_formats_is_not_guessed`; grouping tests |
| Nothing invented | `test_nothing_is_invented_for_a_bare_document`; `is blocked when a title is absent`; `produces SEO artifacts only from supplied facts` |
| Preview before publishing | `cannot approve before a preview…`; `is invalidated when only the preview is stale` |
| Approval tied to content and media | `is invalidated by a change to the content…`; `…to a media file…`; `binds an approval to the exact version` |
| No publish without approval | `refuses to publish without approval, and nothing is written` |
| Existing files unchanged | every publish test snapshots the site before and after |
| Safe retry | `can be retried…` |
| No partial publish | `a failure part-way through…` |
| Interrupted publish | `recovers a publish that was interrupted…` |
| Rollback | `rolls a publish back to the byte…` |
| Duplicate routes and filenames | `detects two blogs of one run…`; `refuses to replace a published post…` |
| Approval for destructive change | `replaces it once the owner approves the replacement…`; `never overwrites a file it did not publish` |
| Security items | see 07, column "Evidence" |

## Production builds (run manually, 2026-11-13)

| Site | Tooling | Result |
|---|---|---|
| Custom Next.js App Router project (own layout, own CSS, no framework tokens) with a published post | Next 15.5, TypeScript 5 | **build passed**; `/blog` and the post prerendered static; post route 5.52 kB, First Load JS 108 kB vs 103 kB for the site's other routes |
| Generated site with a published post (re-run after the hardening changes) | Next 15.5, TypeScript 5.9 | **build passed**; `/blog` and the post prerendered static; post route 5.39 kB, First Load JS 112 kB vs 106 kB for the site's other routes |

## Browser checks (run manually, 2026-11-13, Chromium)

Published post with cover, chart image, animated GIF, H.264 MP4 with poster
and subtitles, YouTube embed, table, footnote, download link.

| Site | Widths | Horizontal overflow | Images loaded | Video played | Console errors | Failed requests | Embed requested before opening | Animation hide control |
|---|---|---|---|---|---|---|---|---|
| Custom static HTML site (served over HTTP) | 320, 768, 1280 | none | 4 / 4 | yes, subtitle track attached | 0 | 0 | no | works |
| Custom Next.js site (`next start`) | 320, 768, 1280 | none | 4 / 4 (cover via `next/image`, GIF unoptimised) | yes | 0 | 0 | — | — |
| Generated site, static layer (run 2026-11-11) | 320, 768, 1280 | none | 4 / 4 | yes | 0 | 0 | no | works |

On the custom static site the skip link is off-screen until focused and the
site header spans the full width outside `<main>` (measured after the page-
shell fix).

## Real-document checks (run manually, 2026-11-11)

Word, PowerPoint and Excel files written by python-docx, python-pptx and
openpyxl; the Word file converted by LibreOffice to ODT, RTF, DOC and PDF. All
produced the same title, headings, list, table, images and links. DOC was read
through LibreOffice and reported `LEGACY_FORMAT_NEEDS_CONVERSION` with it
disabled.

## Not run — do not treat as verified

| Item | Why | Where it must be done |
|---|---|---|
| OCR on real scans | tesseract not installable here; only the no-OCR path and output parsing are tested (with a stand-in engine) | a machine with tesseract |
| WebKit / Safari, real phones and tablets | WebKit not installed | Phase 5, `website_workflow/responsive_matrix.md` TIER 1 |
| Screen-reader and keyboard passes | manual | Phase 5 |
| `--check-links` against the live network | not run | before a release that relies on it |
| `npm run host:e2e` (existing host end-to-end suite) | not run; it is outside `npm run gate`, takes up to 30 minutes and does not exercise the blog branch | optional |
| Lighthouse / Core Web Vitals on a published post | not run | Phase 5 |
| A real customer website, a real customer document | none available in this repository | first production use, under supervision |
| PPT, XLS, ODP, ODS through LibreOffice | only DOC was run | first use of each |
| Real multi-column PDFs, real-world messy DOCX | synthetic and generated files only | first use; compare preview to source |
| Fuzzing of the parsers | not run | see 07, residual risk 1 |
| Concurrent publishes to one site | not tested; not supported | — |
| The UniqBrio Blog Framework | not available; not integrated | 08 |
