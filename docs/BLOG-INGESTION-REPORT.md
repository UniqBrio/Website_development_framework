# Blog ingestion and publishing — implementation and validation report

> **Superseded in part (2026-11-13).** This is the record of the first implementation. The audit that followed changed publishing (site detection, transactions, rollback) and security behaviour; current documentation is indexed in docs/blog/README.md and the current test results are in docs/blog/09-test-and-verification-report.md.

Date: 2026-11-11. Assessment and plan: docs/BLOG-INGESTION-ASSESSMENT.md.
Process: website_workflow/blog_publishing.md. Command: `/wblog`.

## 1. What was added

| Part | Where | Role |
|---|---|---|
| Ingest tool | `website_workflow/tools/blog_ingest.py`, `tools/blogkit/` (13 modules, standard library only) | intake → validation → extraction → media → association → `manifest.json` + `assets/` |
| Manifest contract | src/blog/manifest.ts | the one schema for `framework:blog-manifest@1`; referential and on-disk integrity check |
| Mapping | src/blog/map.ts | each extracted element → one page destination, with a ledger; SEO artifacts from supplied facts only |
| Rendering | src/blog/render.ts, src/blog/css.ts | one element tree → static HTML and Next.js JSX; stylesheet built only from site tokens |
| Validation | src/blog/validate.ts | 15 checks, issue classification, readiness |
| Preview / approval / publish | src/blog/publish.ts, src/blog/run.ts, src/blog/cli.ts | `npm run blog -- preview \| approve \| publish \| status` |
| Process | website_workflow/blog_publishing.md, `/wblog` | the optional branch; rejoins website_flow.md at Phase 5 |

Existing code changed: one additive export in `src/index.ts`, two scripts in
`package.json`. No existing function was modified. Dependencies are unchanged
(`zod` only).

## 2. Requirement coverage

| Brief § | Requirement | Status |
|---|---|---|
| 3 | PDF, DOCX, DOC, RTF, ODT, TXT, MD, HTML; JSON, XML, CSV, XLSX; PPTX, PPT; folder, ZIP, multi-file | Implemented. DOC/PPT/XLS/ODP/ODS and PDF need LibreOffice / poppler; reported when absent |
| 4 | Title, subtitle, headings, paragraphs, lists, tables, quotes, code, links, references, captions, footnotes, conclusion, CTA, SEO metadata; order and hierarchy preserved | Implemented; subtitle, CTA and SEO only when the source marks or supplies them |
| 4 | OCR for scanned PDFs, uncertain text flagged | Implemented behind tesseract; **not exercised with a real OCR engine here** (see §5) |
| 5 | Images, GIF/animated WebP/APNG, video, audio, charts, infographics, external embeds, posters, subtitles | Implemented. Animation is never converted. Remote media stay links |
| 6 | Placement priority; no silent guess | Implemented: low confidence never places |
| 7 | Manifest with unique asset ids; no reference to a missing file | Implemented and enforced by `checkBlogIntegrity` |
| 8 | Reuse the existing design system and layout | Site token file, site header/footer, `c-*` conventions; no new colour or scale |
| 9 | Preservation | Verbatim text; completeness check compares extracted text with the page |
| 10 | Missing / unsupported / corrupt handling with section and action | Every issue has code, severity, section, action; other content still processed |
| 11 | Preview and validation report; no automatic publish | Implemented; publish refused without a digest-bound approval |
| 13 | Optional, modular, secure, traceable, sources never overwritten | Implemented; tests assert isolation, safety and source immutability |

Deliberate limits, each reported to the owner at run time rather than hidden:
native charts are shown as their data table (no charting library, no validated
categorical palette); SmartArt cannot be extracted; no reduced-motion still
frame; mapping onto a hand-built site's own blog template is done per site from
the manifest and mapping table.

## 3. Automated tests

`npm run gate`: typecheck clean · **882 tests in 33 files pass** (807 existing,
unchanged, + 75 new) · framework self-audit 0 FAIL.

tests/blog/blog-ingest.test.ts (41) — the real tool run through its command
line on fixtures built at test time by `tests/fixtures/blog/build_fixtures.py`:

| Input | Asserted |
|---|---|
| DOCX | title/subtitle from styles, not stale properties; heading levels; bold; hyperlink; nested numbered + bulleted lists; table header; embedded images with size and alt; caption; native chart values exact (float noise removed, value unchanged); quote; code; footnote; tracked deletion excluded and flagged; file-name "alt text" rejected |
| DOCX + separate MP4 | `[VIDEO: demo.mp4]` resolved to the supplied file, basis `explicit_instruction` |
| PDF | title, heading, two-line paragraph joined, list, reconstructed table, image, caption; reconstruction flagged |
| Scanned PDF | flagged `OCR_UNAVAILABLE`, no text invented, page scan not offered as an image; OCR text marked unverified with low-confidence words named (stand-in engine) |
| ODT, RTF, TXT | structure, code-page and Unicode characters, field hyperlinks; plain text kept literal |
| Markdown + media folder | front matter; statistics and currency unchanged; five placement bases; unplaced file flagged, not shown; GIF byte-identical, 5 frames; poster and subtitles paired; SRT → VTT syntax only; YouTube link kept as a link; linked file becomes a download; unique ids; every asset on disk; source folder untouched |
| Missing reference | `MEDIA_MISSING` with section and action; rest processed |
| HTML | scripts, handlers, `javascript:` links, unknown frames and page chrome removed; figure caption; video poster and tracks; remote image kept as a link |
| JSON, CSV, XLSX, XML feed | fields mapped; record sets stay tables; number formats applied exactly; one blog per feed item; a data file alone has no title and says so |
| PPTX | slides in order; not assumed to be a blog until confirmed |
| Packages | blog per folder with colliding file names; numbered parts as one blog; unrelated documents → asks; ZIP path traversal blocked; instruction file applied |
| Hostile | executables rejected by content; extension mismatch reported; corrupt DOCX isolated; SVG sanitised; earlier run not overwritten |

tests/blog/blog-presentation.test.ts (34) — schema version refusal; integrity
failures; mapping ledger; SEO only from supplied facts; single H1; verbatim
ordered text; escaping; sized images with alt; animation hide control; video
without autoplay; click-to-load embed; table region; chart data table;
footnotes; CTA; download link; preview-only notes; no colour/inline
style/script; readiness states; publish refused without approval; approval
bound to the digest; publishing leaves every existing site file byte-identical;
the existing `parseServedHtml` reads the blog page (1 H1, 0 images without alt
or dimensions, indexable, canonical); Next page is a server component; earlier
posts stay in the index; stage trace; the generator does not import the branch;
no new dependency; the Python tool imports only the standard library.

## 4. Validation beyond the test suite (run on 2026-11-11, this environment)

| Check | Result |
|---|---|
| Real Word / PowerPoint / Excel files written by python-docx, python-pptx, openpyxl | Extracted correctly, including a chart whose workbook stored no cached values (resolved from the sheet's cells) |
| The same Word file converted by LibreOffice to ODT, RTF, DOC and PDF | Same title, headings, list, table, images and links from all four; DOC read through LibreOffice, and reported `LEGACY_FORMAT_NEEDS_CONVERSION` with LibreOffice disabled |
| Next.js production build (Next 15.5, TypeScript 5.9 per src/host/toolchain.ts) of a generated site with a published post | Build passed; `/blog` and the post prerendered static; post route 5.39 kB, First Load JS 112 kB against 106 kB for the site's other routes (the `next/image` client code) |
| Prerendered Next HTML, JS not executed | 1 H1, title, canonical, body text, table values, video, animation control, JSON-LD and site header all present |
| Published static page in Chromium at 320, 768 and 1280 px | No horizontal overflow; 4/4 images loaded; 0 console errors; 0 failed requests; a real H.264 MP4 played (`currentTime` advanced) with its subtitle track attached; the embed made no request to the video host before being opened; the animation hide control hides the image |

## 5. Not verified — stated, not assumed

- **OCR with a real engine.** tesseract could not be installed here. The
  no-OCR path and the parsing of OCR output are tested; recognition quality on
  real scans is not.
- **WebKit / Safari.** The WebKit browser is not installed in this
  environment; only Chromium was run. responsive_matrix.md TIER 1 requires both.
- **A hand-built site.** This repository holds no real site with its own blog
  template; the branch was validated on generator output only.
- **Live link checking** (`--check-links`) was not run against the network.
- **PDF variety.** Two-column layout detection and hyphenation handling are
  implemented and reported when triggered, but were not exercised on real
  multi-column PDFs.
- Legacy PPT / XLS and ODP / ODS go through the same LibreOffice path as DOC;
  only DOC was run.
- Screen-reader and keyboard passes on the published page (Phase 5).

## 6. Operating it

```
python website_workflow/tools/blog_ingest.py <files|folder|zip> --out website_workflow/blog_runs/<id>
npm run blog -- preview website_workflow/blog_runs/<id> --site <site dir>
npm run blog -- approve website_workflow/blog_runs/<id> --by "<owner>" [--accept-warnings]
npm run blog -- publish website_workflow/blog_runs/<id> --site <site dir> --origin https://<domain>
```
`python website_workflow/tools/blog_ingest.py --capabilities` lists which
optional tools (poppler, tesseract, LibreOffice, ffmpeg) the machine has.
