# BLOG PUBLISHING — optional branch of the Website Flow
<!-- Save as: /website_workflow/blog_publishing.md -->
<!-- Entry point: /wblog <files | folder | zip>. Referenced by: website_flow.md
     (Phase 0 routing), framework_seams.md (§4b), README.md.
     Executable form: website_workflow/tools/blog_ingest.py (extraction) and
     src/blog/ (mapping, preview, validation, publish). -->

This branch takes a blog that is ALREADY WRITTEN — one or more documents plus
embedded or separately supplied media — and presents it on {SITE_NAME}'s
existing blog layout. It runs ONLY when the owner supplies a blog document or
asks for blog publishing. Every other request runs website_flow.md exactly as
before; nothing in that flow depends on this file.

## WHAT THIS BRANCH IS NOT
It is a presentation and publishing system. It does not plan, write, rewrite,
shorten, extend, re-title, keyword-stuff or "improve" a blog, and it does not
create missing media. Those are a different workflow's job; if the owner asks
for them here, say so and stop. `blog-content-seo-writer` is NOT invoked by
this branch.
Prevents: a publishing step quietly becoming an authoring step — the same
class as fabricated proof (README rule 1), with the author's name on words
they did not write.

## PRESERVATION RULES (apply at every stage)
1. Text is carried verbatim: wording, statistics, currency, dates, quotations,
   references, link targets. A number is never reformatted unless the source
   file's own cell format says how (spreadsheets), and then exactly.
2. A value the source does not supply is ABSENT, not substituted: no generated
   title, subtitle, description, alt text, caption, author, date or cover.
   Missing ones are reported with the action that would supply them.
3. Only these TECHNICAL adaptations are allowed, and each is recorded in the
   mapping record: body headings moved down one level so the title is the only
   H1; SRT subtitles re-serialised as WebVTT (timings and text unchanged);
   active content stripped from SVG; EMF/WMF pictures converted to PNG; opt-in
   video/image conversion (`--convert-media`). Animations are never converted
   to a still.
4. Source files are opened read-only. Everything is written under the run
   directory; the tool refuses an output path inside an input folder.
5. An error, an incomplete section or an ambiguous instruction in the source is
   FLAGGED, never silently corrected.

## STAGES (in order; each records what it consumed)

### B0 — INTAKE AND ACTIVATION
The owner supplies any of: one document with embedded media · one document with
separate media files · several documents forming one blog · a raw text file
with images and videos · a folder · a ZIP archive. No format is mandatory.
Ask ONLY what the tool cannot determine and has flagged:
- `GROUPING_UNCONFIRMED` — several documents with nothing relating them: one
  blog in parts (`--single-blog`) or separate blogs (`--separate-blogs`)?
- `PRESENTATION_PURPOSE_UNCONFIRMED` — a slide deck was supplied: is it to be
  published as a blog (`--presentation-is-blog`)?
Do not ask about anything else before running the ingest.

### B1 — INGEST (identify → validate → extract → associate)
```
python website_workflow/tools/blog_ingest.py <inputs…> --out website_workflow/blog_runs/<run id>
```
Output: `manifest.json` (`framework:blog-manifest@1`) and `assets/`. Flags:
`--sidecar <file>`, `--single-blog`, `--separate-blogs`,
`--presentation-is-blog`, `--convert-media`, `--check-links`,
`--capabilities` (which optional tools are installed).

FORMATS. Read with the standard library: DOCX, PPTX, XLSX, ODT, RTF, Markdown,
TXT, HTML, JSON, XML (incl. RSS/WordPress export feeds), CSV, ZIP. Read through
an installed tool, and reported as unavailable when it is absent — never
guessed: PDF (poppler), scanned PDF (tesseract), legacy DOC / PPT / XLS / ODP /
ODS and EMF / WMF pictures (LibreOffice), media duration and codec (ffprobe).
Media: PNG, JPEG, WebP, GIF, SVG, AVIF, APNG; MP4, WebM, M4V; MP3, WAV, M4A,
OGG; VTT, SRT. MOV / AVI / MKV / WMV, TIFF / BMP / HEIC are kept but not shown
unless converted.

FILE VALIDATION. Format is decided by the file's bytes, then its extension; a
mismatch is reported and the bytes win. Executables and scripts are rejected
whatever they are named. Archives are checked for path traversal, links,
encryption, entry count, total size and compression ratio. XML with entity
declarations is refused. HTML is parsed into blocks, never passed through, so
scripts, handlers, styles and unknown frames cannot reach a page. Links keep
only http, https, mailto and tel targets. Nothing is executed and nothing is
fetched from the network unless `--check-links` is given.

### B2 — THE MANIFEST (the standard extraction and mapping record)
Per blog: documents (name, format, extraction status, extractor) · title and
subtitle with their source · metadata as supplied · sections · blocks in
reading order · assets · placements · links · issues. Every asset has a unique
id, a SHA-256, measured dimensions/animation/duration, its origin (embedded or
supplied) and its file under `assets/`. An asset is listed only when its bytes
are on disk; a reference to something absent is a `missing_media` block plus an
issue, never an asset.
Every issue carries: code · severity · the affected section · what is missing
or unsupported · the corrective action.

### PLACEMENT — where each media file belongs (priority order)
1. EXPLICIT INSTRUCTION — an instruction-file entry, or an in-text directive
   such as `[IMAGE: chart.png]`, `{{video: demo.mp4}}`, `[Insert Figure 2 here]`.
2. DOCUMENT REFERENCE — the document embeds the file there, links to it, or
   names it in the text.
3. CAPTION / HEADING — a figure number shared with a caption, or a file name
   that matches one heading.
4. NEARBY CONTEXT — distinctive file-name words inside one paragraph.
5. DOCUMENT ORDER — embedded media stay exactly where the author put them.
Confidence `high` and `medium` place the file (`medium` is listed for the
owner to confirm). `low` NEVER places it: the file is left out of the page and
reported as `PLACEMENT_UNCERTAIN` with a suggested position. Guessing a
position is an editorial decision.
A cover is: named in the metadata or instruction file · a file named
cover/hero/featured/banner · or the first image ahead of all body text.
A video's poster and subtitles are paired by shared file name.

### INSTRUCTION FILE (optional) — `blog.json` in the package, or `--sidecar`
```json
{
  "title": "…", "subtitle": "…", "author": "…", "date": "2026-10-02",
  "seo": { "title": "…", "description": "…", "keywords": ["…"], "canonical": "…" },
  "cover": "cover.png",
  "documents": ["part-1.docx", "part-2.docx"],
  "presentationIsBlog": true,
  "assets": {
    "results.png": { "section": "Results", "position": "end", "alt": "…", "caption": "…" },
    "team.jpg":    { "afterText": "a phrase from the paragraph it follows" },
    "logo.svg":    { "role": "ignore" },
    "guide.pdf":   { "role": "download" },
    "still.jpg":   { "posterFor": "demo.mp4" }
  },
  "blogs": [ { "documents": ["a.docx"], "assetFiles": ["a-*.png"], "title": "…" } ]
}
```
Values here are the OWNER'S; they override what the documents say and are
recorded with the source "instruction file".

### B2b — WHAT KIND OF WEBSITE IS THIS? (before mapping)
```
npm run blog -- inspect-site <site dir> [--route-base /blog]
```
SUPPORTED: a generated site · a Next.js App Router project in TypeScript · a
static HTML site. REFUSED, with the reason, and nothing is ever written:
Pages Router · a non-TypeScript Next project · `basePath` or i18n routing · a
site with its own content system (MDX, a CMS client) · a static site with
`<base href>` · any site that already has content at the blog route which this
workflow did not publish · anything it does not recognise.
Read the REVIEW items too, and tell the owner about each: for example "the
root layout renders no header" (the post would have no site navigation) or
"the sitemap is generated by code" (the post will not be in it until someone
adds it). They do not block publishing; they are decisions for the owner.
A refusal is not an obstacle to work around: either publish under a different
`--route-base`, or map the manifest onto the site by hand — the developer
guide for that is in the repository's blog documentation folder (docs/blog/).
Prevents: the first version of this branch, which assumed every target was a
generated site and would have created `static/` and `next/` folders in any
directory, or overwritten a `/blog` page the site already had.

### B3 — MAP TO THE EXISTING BLOG LAYOUT
```
npm run blog -- preview website_workflow/blog_runs/<run id> --site <site dir> [--origin https://…] [--route-base /blog]
```
| Extracted element | Website destination |
|---|---|
| Blog title | The page's single H1 in the article header |
| Subtitle | Subtitle line under the title |
| Author, date | Byline (date shown as written; machine date only if ISO) |
| Cover image | Hero figure under the header, loaded first |
| Introduction | Opening of the article body |
| Headings | Section headings H2–H6 |
| Paragraphs, lists, quotes, code | Article body, inline formatting and links kept |
| Tables | Table inside a labelled, focusable scroll region |
| Images | Figure at the extracted position, sized, with caption |
| GIFs / animations | Same bytes, in a figure the reader can hide (WCAG 2.2.2, animation_library.md) |
| Videos | Native player: controls, poster, subtitles, no autoplay |
| Video links (YouTube, Vimeo, Loom) | The link, plus a click-to-load player (stack_doctrine.md: third-party embeds load on intent) |
| Charts supplied as images | Figure at the extracted position |
| Native charts (Word / PowerPoint / Excel) | §CHARTS |
| Infographics, diagrams | Full-width figure |
| Audio | Native audio player |
| References | References section, as headed by the author |
| Footnotes | Footnote list with links both ways |
| Call to action | A sole link under the author's CTA heading takes the site's action style |
| SEO metadata | Document head — only what was supplied |

REUSE, DO NOT REDESIGN. The page links the site's ONE generated token file and
adds a small component stylesheet that defines no colour, type scale or spacing
value of its own (color_system.md). The site's header and footer are lifted
from its rendered home page. On a GENERATED site the output is a static page
plus a Next.js App Router server component (no client boundary, images through
next/image, animations unoptimised so they stay animated).
On a HAND-BUILT site with its own blog template, the manifest and the mapping
table above are the specification: map each element onto that template's
existing components and content source (stack_doctrine.md CONTENT SOURCE
LADDER) instead of emitting the generated page. A component the template lacks
is a design change and goes through website_flow.md Phases 1–2, not through
this branch.

### CHARTS
A chart supplied as an image is shown as supplied. A NATIVE chart has data but
no picture in the document, and the stack admits no charting library and the
token file has no validated categorical palette, so the chart is shown as its
exact data table, titled by the chart, and reported as `CHART_AS_DATA_TABLE`
with the action "export the chart as PNG or SVG". Drawing it would mean
choosing colours and a chart form — design decisions for decision_matrix.md and
the DEPENDENCY GATE, not for a publishing step.

### SEO ARTIFACTS (stack_doctrine.md §SEO ARTIFACT SET)
Title = the blog's title, or a supplied SEO title. Description, keywords and a
canonical URL appear only when supplied; a canonical is otherwise built from
{SITE_DOMAIN} when the site has one, and omitted when it does not.
`BlogPosting` structured data is emitted only when headline, author and an ISO
publication date were all supplied. Everything not produced is listed in the
report with what it needs. A published post is linked from the blog index, so
it is never an orphan.

### B4 — PREVIEW AND VALIDATION REPORT
The preview is the real page, `noindex`, with a review panel and a marked note
wherever something is missing or not shown. The report (written to `reports/`
in the run directory, as Markdown and as JSON) contains:
successfully extracted elements · successfully mapped elements · missing assets
· unsupported formats · placement uncertainties · extraction warnings ·
publishing readiness.
Checks: title · subtitle · section hierarchy · content completeness (every
extracted text unit is on the page, in order) · paragraph formatting · media
placement · GIF animation · video playback · chart presentation · table
responsiveness · link functionality · media dimensions · mobile responsiveness
· accessibility · manifest integrity.
A check that needs a browser is reported NOT VERIFIED, never PASS (README rule
10): video playback, the device sweep, live links.

READINESS
- BLOCKED — any error issue, failed check or integrity problem. Typical:
  missing title, missing referenced media, corrupt or unsupported document,
  OCR unavailable, unconfirmed presentation.
- READY WITH WARNINGS — the owner must acknowledge each warning code by name.
- READY.

### GATE B (owner) — APPROVE THE PREVIEW. Review depth: DETAILED + EVIDENCE.
The owner reads the preview and the report, then:
```
npm run blog -- approve website_workflow/blog_runs/<run id> --by "<name>" [--accept-warnings]
```
The approval records the digest of exactly what was approved — the content AND
every media file. It is refused until a preview of that exact version exists.
If the manifest or any asset changes afterwards, the approval no longer
applies. Claude never runs this command on the owner's behalf without the owner
saying so in the conversation.
REPLACING a post that is already published is a destructive change and needs
its own approval: `approve … --replace --site <site dir>`, which records the
digest of the published version the owner agrees to replace.

### B5 — PUBLISH (through the existing release procedure)
```
npm run blog -- publish website_workflow/blog_runs/<run id> --site <site dir> --origin https://… [--replace]
```
Refused without a valid approval; there is no override flag. It writes files
(the post, the blog index, the stylesheet, the assets the page uses, the
registry `blog-registry.json`, sitemap entries) and deploys nothing.
PUBLISHING IS A TRANSACTION: new files are staged beside their destinations,
every file to be replaced is backed up into the run directory, then the files
are renamed into place. Any failure restores the site exactly; an interrupted
publish is undone the next time `publish` or `rollback` runs; publishing the
same approved version again changes nothing.
It NEVER overwrites a file this workflow did not publish. A different post at
the same route is refused unless `--replace` is given AND the approval names
the version being replaced.
ONE PUBLISHER AT A TIME: publish and rollback take a per-site lock. A second
publisher is refused and writes nothing; a lock left by a crashed publisher is
taken over only after its unfinished publish is undone (docs/blog/15-publishing-concurrency.md).
UNDO: `npm run blog -- rollback <run dir>` removes what the publish created and
restores what it replaced, from the backups in the run directory. Rollbacks of
publishes that touched the same files run newest first; an out-of-order
rollback is refused. KEEP the run directory for as long as a rollback may be
wanted. Tell the owner the transaction id that `publish` prints.
INCIDENTS (crash, stale lock, lost run directory): docs/blog/16-incident-recovery-and-rollback.md.
Then website_flow.md takes over, unchanged:
- PHASE 5 on the new route only — responsive_matrix.md TIER 1, the SERVED HTML
  evidence of §4c, performance and image weight against the budgets in
  qa_evidence_gate.md §3, keyboard and screen-reader spot-check, real video
  playback, and every NOT VERIFIED item from the report.
- PHASE 6 release and PHASE 7 close: one decisions_log.md entry naming the run
  id, the approver, the blog digest and the accepted warnings.

## TRACEABILITY
`manifest.json` (trace: intake, grouping, extraction, media, association) →
`reports/<slug>.mapping.json` → `preview/` → `approvals/<slug>.approval.json` →
`run-record.json` (preview, approval, publish — each with the manifest hash and
blog digest) → the published page's header comment (source documents, digest,
approver).

## SKILLS
Extraction and mapping are mechanical and governed by this file. Phase 5 uses
the skills website_flow.md already names for it. A request to change how blog
pages LOOK is a design change: website_flow.md, not this branch.

## MULTIPLE AND CONFLICTING SOURCES
The same blog supplied in two formats (`post.docx` and `post.pdf`) is
`SOURCE_FORMAT_CONFLICT`: ask which is authoritative. Parts that disagree on
title, author or date raise `METADATA_CONFLICT`; the first part's value is
used and the disagreement is shown to the owner. A later part's title opens a
section. A byte-identical document is read once. None of these is resolved by
choosing silently.

## KNOWN LIMITS (state them to the owner; do not work around them)
- PDF structure is reconstructed from layout; tables and reading order are
  reported for checking. Prefer the source document when it exists.
- OCR text is always marked unverified and must be proofread.
- SmartArt cannot be extracted as an image.
- A reduced-motion still frame is not generated for animations.
- Remote images and videos are never downloaded; they stay links.
- A photograph's GPS metadata is flagged (`IMAGE_LOCATION_METADATA`); other
  image metadata is published as supplied.
- Unsupported websites have no automatic path; mapping is manual.
- Rollback needs the run directory; without it, recover from version control.
