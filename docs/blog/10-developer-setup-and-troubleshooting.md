# 10 — Developer setup and troubleshooting

## Requirements

| Needed for | Requirement |
|---|---|
| Everything | Node ≥ 18 (developed on 22), `npm ci`; Python ≥ 3.8 on the PATH as `python` (the npm scripts call `python`) |
| PDF | poppler-utils (`pdftohtml`, `pdfinfo`; `pdftoppm` for OCR) |
| Scanned PDF | tesseract-ocr |
| DOC, PPT, XLS, ODP, ODS, EMF/WMF pictures | LibreOffice (`soffice`) |
| Media duration and codecs; `--convert-media` | ffmpeg (`ffprobe`, `ffmpeg`) |
| Browser checks | Playwright with Chromium (and WebKit for Phase 5) |

No npm or pip package was added for the blog branch. See what a machine has:
```
python website_workflow/tools/blog_ingest.py --capabilities
```

## Commands

```
npm run gate                      typecheck + TypeScript tests + Python tests + framework audit
npm run test -- tests/blog        blog TypeScript tests only
npm run test:py                   blog Python tests only
npm run blog:ingest -- <inputs> --out website_workflow/blog_runs/<id>
npm run blog -- inspect-site <site dir>
npm run blog -- preview  <run> --site <site dir> [--origin https://…] [--route-base /blog]
npm run blog -- status   <run>
npm run blog -- approve  <run> --by "<owner>" [--accept-warnings] [--replace --site <site dir>]
npm run blog -- publish  <run> --site <site dir> [--origin https://…] [--replace]
npm run blog -- rollback <run> [--tx <id>] [--force]
npm run blog -- history  <run>                       every recorded operation of a run
npm run blog -- lock-status <site dir>               who holds the publishing lock; LIVE or STALE
npm run blog -- unlock <site dir> --force            remove a STALE lock (see 16 first)
python website_workflow/tools/blog_ingest.py --show-limits [limit flags]
python website_workflow/tools/blog_compare.py <source> <preview index.html>
node tests/browser/blog-browser-check.cjs <url>... [--engines …] [--axe axe.min.js]
website_workflow/tools/blog_staging_test.sh --reference <clone> --work <empty dir> --docs "<a> <b> <c>" [--build] [--browser]
```
Python tests: `tests/python/test_blogkit.py` (units, hostile input) and
`tests/python/test_blogkit_resources.py` (limits, process limits, fuzzing).
Reproduce a fuzz failure with `BLOGKIT_FUZZ_SEED=<seed>` (Python) or
`BLOG_FUZZ_SEED=<seed>` (manifest fuzz); raise `BLOGKIT_FUZZ_ROUNDS` /
`BLOG_FUZZ_ROUNDS` for a longer run.
Test fixtures are built at test time by
`tests/fixtures/blog/build_fixtures.py`; nothing binary is committed.

## Where to change what

| Change | File |
|---|---|
| A new document format | new extractor in `website_workflow/tools/blogkit/`, register in `EXTRACTORS` (ingest.py) and `EXT` (detect.py); return blocks, never markup |
| A new block type | src/blog/manifest.ts (schema) → render.ts → validate.ts → the extractor; this is a manifest version question (08 §3) |
| How something looks | src/blog/css.ts — site tokens only, no colour or scale of its own |
| A new supported website kind | src/blog/site.ts (detection) and `destinationOf` in src/blog/run.ts; add refusal and publish tests |
| A new safety limit | `website_workflow/tools/blogkit/safety.py` |

Rules that apply to any change: `npm run gate` green · the generator must not
import `src/blog/` · no new dependency without the dependency gate in
`website_workflow/stack_doctrine.md` · command copies stay byte-identical ·
README table and update log updated.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `python: command not found` from an npm script | only `python3` is installed | add a `python` alias/shim, or run the tool with `python3` directly |
| `--out must not be inside the input folder` | sources are never written to | choose a run directory outside the package |
| `already holds a manifest` | a run is never overwritten silently | new run directory, or `--force` |
| `PDF_TOOL_UNAVAILABLE` | poppler missing | install poppler-utils |
| `OCR_UNAVAILABLE` | scanned PDF and no tesseract | install tesseract-ocr, or supply the text |
| `LEGACY_FORMAT_NEEDS_CONVERSION` | DOC/PPT/XLS and no LibreOffice | save as DOCX/PPTX/XLSX, or install LibreOffice |
| `TITLE_MISSING` | no title style, no level-1 heading, no metadata | mark the title in the document or give `title` in `blog.json` |
| `MEDIA_MISSING` with "Did you mean …" | the reference does not match a supplied file name | correct the name |
| `MEDIA_CORRUPT` | the file's bytes are not that format | re-export the file |
| `PLACEMENT_UNCERTAIN` | a supplied file nothing refers to | reference it (`[IMAGE: name.png]`) or add it to `blog.json`; `"role": "ignore"` to leave it out |
| `GROUPING_UNCONFIRMED` | unrelated documents together | `--single-blog`, `--separate-blogs`, or one folder per blog |
| `SOURCE_FORMAT_CONFLICT` | the same blog in two formats | supply only the authoritative one |
| `not a valid framework:blog-manifest@1 manifest` | manifest edited by hand, or from another version | re-run the ingest |
| `cannot approve …: no preview of this version exists` | preview missing or stale | run `preview` |
| `the blog changed after it was approved` | manifest or media changed | preview and approve again |
| integrity check FAIL, "does not match its recorded SHA-256" | a file in `assets/` was modified | re-run the ingest |
| `this website cannot be published to` | unsupported site or foreign blog content | `inspect-site`; see 03 and 04 |
| `a different post is already published at …` | same slug, different content | approve with `--replace --site`, publish with `--replace`; or change the slug |
| `refusing to overwrite …` | the file is not one the workflow published | move or remove it yourself, or use another `--route-base` |
| `an interrupted publish … was found and undone` | a previous publish did not finish | nothing; the site was restored — publish again |
| Published page unstyled when opened from disk | stylesheets are root-absolute | serve the site over HTTP; the PREVIEW is the one made to open from disk |
| Next build: "Cannot find module … blog.css" type error | TypeScript 6 with unchecked side-effect imports off | use the framework's pinned TypeScript 5 (`src/host/toolchain.ts`), as for the rest of the generated site |
| Embed shows only a link | provider has no embed support here, or the site's CSP blocks the frame | expected; allow the embed host in the CSP if wanted |
| `another publish is in progress on this website` | a live lock | wait and retry (15) |
| `could not be undone automatically … The lock was left in place` | a crashed publish whose run directory is gone | 16, "Recovery without the run directory" |
| `cannot be rolled back yet: later publish(es) changed the same files` | rollback out of order | roll back the named publishes first, newest first |
| `PACKAGE_TOO_MANY_FILES`, `PATH_TOO_DEEP`, `TOOL_TIMEOUT`, exit code 3 | a resource limit stopped the ingest | split the package; for a TRUSTED package raise the limit (`--show-limits` lists flags and ceilings) |
| `VIDEO_CAPTIONS_MISSING` | a shown video has no subtitle file | supply `<video name>.vtt` / `.srt`; acknowledge only if the video has no speech |
| `VIDEO_STREAM_UNREADABLE` | the MP4 has no decodable video | re-export as H.264 MP4 or WebM |
| inspect-site: "root layout renders no header, navigation or footer" | the site puts navigation inside each page | the post would have no navigation: add a layout for the blog route (a design change), or map by hand (04) |
| inspect-site: "sitemap is generated by code" | `app/sitemap.ts` | add the blog routes there as a reviewed code change |
| Next build fails in `next/font` (`reading '1'`) with no network to Google Fonts | the build machine cannot download fonts | build where Google Fonts is reachable; for an offline staging build, `NEXT_FONT_GOOGLE_MOCKED_RESPONSES` (13) |
