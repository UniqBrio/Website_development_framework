# 02 — Blog ingestion technical specification

Tool: `python website_workflow/tools/blog_ingest.py <inputs…> --out <run dir>`
(code in `website_workflow/tools/blogkit/`). Standard library only.
Output contract: `framework:blog-manifest@1`, parsed by src/blog/manifest.ts.

## Command line

| Flag | Effect |
|---|---|
| `--out DIR` | run directory to create; refused if inside an input folder or if it already holds a manifest (`--force` replaces) |
| `--sidecar FILE` | instruction file (also auto-detected as `blog.json` in the package) |
| `--single-blog` / `--separate-blogs` | resolve `GROUPING_UNCONFIRMED` |
| `--presentation-is-blog` | resolve `PRESENTATION_PURPOSE_UNCONFIRMED` |
| `--convert-media` | convert MOV/AVI/MKV/WMV → MP4 and TIFF/BMP/HEIC → PNG with ffmpeg; originals untouched |
| `--check-links` | request each external link once (public hosts only, redirects not followed) |
| `--no-tool NAME` | behave as if an optional tool were absent (testing) |
| `--capabilities` | print which optional tools are installed |

Exit: 0 manifest written · 1 no usable document · 2 bad invocation.

## Pipeline

1. **Intake** — files, folders, ZIP archives. Each file: size limit, executable
   check, format by byte signature then extension.
2. **Sidecar** — optional owner instructions (titles, placements, alt text, grouping).
3. **Grouping** — which documents form which blog (see below).
4. **Extraction** — one extractor per format → blocks in reading order + embedded media.
5. **Media** — every file copied into `assets/`, hashed, measured, sanitised where needed.
6. **Association** — references resolved; unreferenced supplied files placed only on sufficient evidence.
7. **Manifest** — written to a temporary file and renamed; on interruption no manifest and no assets remain.

## Grouping rules

| Situation | Result |
|---|---|
| Instruction file lists `blogs` or `documents` | exactly as listed |
| One document | one blog; all media belong to it |
| A document links to or names another document | the named one is an attachment, not a blog |
| Documents in separate folders | one blog per folder, each with its folder's media |
| Numbered series in one folder (`01-…`, `…-part2`) | one blog, in order; later titles become section headings (`PART_TITLE_AS_SECTION`) |
| Same name, different formats (`post.docx` + `post.pdf`) | `SOURCE_FORMAT_CONFLICT` (error): the owner chooses the authoritative one |
| Unrelated documents together | one blog each, `GROUPING_UNCONFIRMED` until the owner says |
| Feed XML with several items | one blog per item |
| Parts disagree on title/author/date | first wins, `METADATA_CONFLICT` reported |
| Byte-identical document twice | read once, `DOCUMENT_DUPLICATE` |

## Manifest (`framework:blog-manifest@1`)

Top level: `schema`, `generatedAt`, `tool` (name, version, capabilities,
options), `sidecar`, `inputs[]`, `blogs[]`, `issues[]`, `trace[]`.

Per blog:

| Field | Content |
|---|---|
| `id`, `slug` | `blog-N`; slug `[a-z0-9-]+` from the instruction file, front matter, or title |
| `grouping`, `extractionStatus`, `documents[]` | how it was assembled; per document: name, path (package-relative), sha256, format, status, extractor |
| `title`, `subtitle` | `{inlines, text, source}` or null — never generated |
| `metadata` | supplied values only, each `{value, source}`: author, date, description, keywords, canonical, lang, seoTitle |
| `cover` | `{assetId, alt, basis, confidence}` or null |
| `sections[]` | `{id, headingBlockId, title, level, role, blockIds}`; role from the author's own heading: introduction, body, conclusion, references, cta, footnotes |
| `blocks[]` | reading order; types below |
| `assets[]` | see Media manifest |
| `placements[]` | `{assetId, status: placed/unplaced/excluded, blockId, sectionId, position: hero/inline, basis, confidence, note}` |
| `links[]` | `{url, uses, status: unverified/ok/broken}` |
| `issues[]` | `{code, severity: error/warning/info, message, action, section?, blockId?, assetId?, document?}` |

Block types: `heading` · `paragraph` · `list` (nested) · `table` (header rows,
col/row spans, caption) · `blockquote` · `code` · `media` · `embed` · `chart`
(native data) · `rule` · `footnotes` · `missing_media` · `external_media`.
Inline runs: text with `bold`, `italic`, `code`, `strike`, `sup`, `sub`,
`href`; `break`; `fnref`.

### Media manifest (per asset)

`id` (unique, `asset-<10 hex>`), `kind` (image, animation, video, audio,
captions, document, data, other), `role` (cover, supporting, poster, captions,
download, source-data, unplaced, not-displayed), `subject` (chart, infographic,
diagram or null), `filename`, `sourceNames[]`, `path` (`assets/<blog>/<name>`),
`origin` (embedded, supplied), `sourceDocument`, `format`, `mime`, `bytes`,
`sha256`, `sourceSha256`, `width`, `height`, `animated`, `frames`,
`durationSeconds`, `webReady`, `available: true`, `notes[]`, `convertedFrom?`.

## Placement priority

1 explicit instruction → 2 document reference → 3 caption or heading match →
4 nearby context → 5 document order. High and medium confidence place the file;
low never does (`PLACEMENT_UNCERTAIN`, with a suggested position).

## Preservation and permitted adaptations

Text, numbers, currency, dates, quotations and link targets are carried
verbatim. The only adaptations, each recorded: body headings moved down one
level under the page's single H1 · SRT re-serialised as WebVTT · active content
removed from SVG · EMF/WMF pictures converted to PNG · opt-in media conversion ·
spreadsheet number formats applied only when they can be applied exactly.

## Issue codes that block publishing (severity `error`)

`TITLE_MISSING`, `CONTENT_EMPTY`, `MEDIA_MISSING`, `DOCUMENT_CORRUPT`,
`DOCUMENT_REJECTED_UNSAFE`, `DOCUMENT_TOO_LARGE`, `DOCUMENT_FORMAT_UNSUPPORTED`,
`LEGACY_FORMAT_NEEDS_CONVERSION`, `PDF_TOOL_UNAVAILABLE`, `PDF_ENCRYPTED`,
`OCR_UNAVAILABLE`, `PRESENTATION_PURPOSE_UNCONFIRMED`, `SOURCE_FORMAT_CONFLICT`,
`SIDECAR_DOCUMENT_NOT_FOUND`, `SIDECAR_INVALID`, `FILE_TOO_LARGE`,
`ARCHIVE_REJECTED`, `ARCHIVE_CORRUPT`, `LINK_BROKEN` (media links).
Warnings must be acknowledged by name at approval.
