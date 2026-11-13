# 08 — Integration-readiness specification: UniqBrio Blog Framework → Website Workflow

**Status: specification only. Nothing is integrated.** The Blog Framework
repository was not available when this was written and no code here depends on
it. Everything below describes what the Website Workflow ACCEPTS today, what a
Blog Framework package would need to look like to be accepted, and the open
questions that must be answered before integration starts. Statements about
the Blog Framework are labelled as assumptions.

## 1. Responsibility boundary

| | Blog Framework (assumed) | Website Workflow |
|---|---|---|
| Strategy, drafting, editing, SEO research | yes | never |
| Final text, titles, alt text, captions | yes — it is the author | carries them verbatim; reports what is absent |
| Media creation and selection | yes | never creates or selects; places only on evidence |
| Extraction from documents | — | yes |
| Mapping to a website, preview, approval gate, publish, rollback | — | yes |

The Website Workflow must stay usable without the Blog Framework, and vice
versa. Integration is therefore a FILE HAND-OFF, not a code dependency.

## 2. Two integration modes

### Mode A — hand over a blog PACKAGE (recommended; works today, zero change)

The Blog Framework writes a folder or ZIP; the existing ingest reads it.

```
<package>/
  blog.json                 instruction file (optional but recommended)
  post.md | post.docx | …   one document, or numbered parts 01-…, 02-…
  cover.<ext>               optional
  images/…  video/…  …      media, referenced by relative path from the document
```
Rules the package must follow:

- **One blog per package**, or one sub-folder per blog. Never unrelated
  documents side by side (that produces `GROUPING_UNCONFIRMED`).
- **One authoritative document format.** `post.md` and `post.pdf` together is a
  `SOURCE_FORMAT_CONFLICT`.
- **Relative paths only**, inside the package, forward slashes, no `..`.
  Reference media from the document (`![alt](images/x.png)`), or list placements
  in `blog.json`. A file that nothing references is not shown.
- **Preferred document format: Markdown with front matter**, or DOCX. PDF is
  accepted but its structure is reconstructed.
- **Media** in the formats of 03; dimensions are measured, not declared.
- **Alt text** in the document or in `blog.json`; decorative images marked
  `"decorative": true`. Missing alt text is a warning the owner must acknowledge.
- **No remote media**: remote images and videos are kept as links.

`blog.json` (all fields optional; values are the author's and override the
document):

```json
{
  "title": "…", "subtitle": "…", "author": "…", "date": "YYYY-MM-DD", "slug": "…", "lang": "en",
  "seo": { "title": "…", "description": "…", "keywords": ["…"], "canonical": "https://…" },
  "cover": "cover.png",
  "documents": ["01-intro.md", "02-body.md"],
  "assets": {
    "images/chart.png": { "alt": "…", "caption": "…", "section": "Heading text", "position": "start|end" },
    "images/team.jpg":  { "afterText": "a phrase from the paragraph it follows" },
    "video/still.jpg":  { "posterFor": "demo.mp4" },
    "guide.pdf":        { "role": "download" },
    "draft-notes.png":  { "role": "ignore" }
  }
}
```

### Mode B — hand over a MANIFEST directly (possible; needs the items in §7)

The Blog Framework writes `manifest.json` (`framework:blog-manifest@1`) plus
`assets/` itself, skipping extraction. The presentation side already treats a
manifest as untrusted data, so this is structurally safe: schema validation,
integrity check (every asset a regular file under `assets/`, size and SHA-256
matching), render-time link validation, then the normal preview → approval →
publish. What Mode B loses is the ingest's own checks (format validation, SVG
sanitising, corruption and metadata detection), which the producer would have
to perform. Mode B is NOT recommended until §7 is resolved.

## 3. Manifest fields and versioning

Field-level specification: 02. Versioning rules as implemented:

- `schema` is an exact string. `parseBlogManifest` refuses any other value; it
  does not adapt or guess.
- Unknown extra fields are ignored on read (forward-tolerant); a missing
  required field is an error.
- **A change that removes or re-types a field requires `@2`.** Adding an
  optional field does not.
- Migration strategy when `@2` exists: a pure function `migrate@1→@2` in
  src/blog/, applied on read, with the original file left untouched and the
  migration recorded in `run-record.json`. Approvals are bound to the digest of
  the parsed blog, so a migrated manifest needs a fresh preview and approval.
- The site registry has its own schema, `framework:blog-registry@1`, and the
  publish journal `framework:blog-publish-tx@1`.

## 4. SEO metadata

Accepted: `title` (page H1), `seo.title`, `seo.description`, `seo.keywords`,
`seo.canonical`, `author`, `date`, `lang`, `slug`, `cover`.
Produced only from supplied values: `<title>`, meta description, canonical
(supplied, or site origin + route), Open Graph, and `BlogPosting` JSON-LD when
headline + author + ISO date are all present. Nothing is generated; what could
not be produced is listed in the report.
Not accepted today: per-post robots directives, hreflang alternates, custom
JSON-LD, redirects, category/tag pages, reading time, related posts.

## 5. Media handling summary

| Media | Website Workflow behaviour | What the package should provide |
|---|---|---|
| Image | sized `<img>` / `next/image` at the referenced position | alt text, optional caption |
| GIF / animation | bytes unchanged, reader can hide it | alt text |
| Video (file) | native player, no autoplay | MP4 (H.264) or WebM; poster and `.vtt`/`.srt` sharing the file name |
| Video (link) | link + click-to-load player for YouTube, Vimeo, Loom | the URL on its own line |
| Chart as image | figure | alt text describing the finding |
| Chart as native data | exact data table | an exported image if the visual matters |
| Infographic / diagram | full-width figure | alt text; long description in the body text |
| Audio | native player | MP3 or M4A |
| Downloads | link with `download` | link from the text, or `"role": "download"` |

## 6. Validation, approval and publishing requirements

A package is publishable when: it has a title; every referenced file is
present and valid; there is no error issue; the owner has previewed THIS
version and approved it by name, acknowledging every warning code; and the
target website is a supported kind. The Blog Framework cannot approve on the
owner's behalf: approval is a human gate recorded in the run directory. An
automated hand-off should stop at "preview ready" and present the report.

## 7. Open questions and likely mismatches (to be answered by the Blog Framework team)

None of these is known; each is a place where a mismatch is plausible.

| # | Question | Why it matters here | Recommendation |
|---|---|---|---|
| 1 | What does the Blog Framework emit — Markdown, DOCX, HTML, JSON, or its own structure? | decides Mode A document format | emit Markdown + front matter + `blog.json`; no code change needed |
| 2 | Does it have its own manifest? With what field names? | a second manifest dialect would need a mapping | do NOT merge schemas; write a small exporter on the Blog Framework side to the package format of §2 |
| 3 | How are media referenced — relative paths, ids, URLs, or a CDN? | remote URLs are never downloaded | package local files with relative paths |
| 4 | Is alt text / caption / attribution stored per asset? | otherwise every image raises a warning | export them into `blog.json` `assets` |
| 5 | Does it produce SEO fields beyond §4 (hreflang, robots, schema types, redirects)? | they would be silently unused | list them; add optional manifest fields in a minor revision if needed |
| 6 | Does it expect categories, tags, author pages, pagination, RSS, related posts? | the workflow publishes a post and a flat index only | treat as a separate Website Workflow request, not part of integration |
| 7 | Are AI-generated images or videos labelled? | the site's truth rules may require disclosure | carry a per-asset provenance field; needs an optional manifest field |
| 8 | Does it version or revise published posts? | replacement needs `--replace` and a fresh approval | hand over each revision as a new package with the same slug |
| 9 | Multiple languages per post? | one un-localised route is published | out of scope until i18n routing is supported |
| 10 | Does it want status back (published URL, digest, date)? | nothing is reported back today | read `blog-registry.json` and `run-record.json`; define a small result file if needed |
| 11 | Interactive charts or custom components (callouts, tabs, embeds)? | unknown block types are not in the schema | either render them to supported blocks on export, or propose new block types for `@2` |
| 12 | Who owns the slug and the route base? | collisions are refused | the Blog Framework proposes; the site's owner confirms at preview |

## 8. Compatibility and migration strategy

1. **Now:** nothing. The Website Workflow is independently usable.
2. **Integration step 1 (no change here):** the Blog Framework gains an
   exporter to the §2 package. Validate with `blog_ingest.py` + `preview`.
3. **Step 2 (small, additive here, only if §7 shows a need):** optional
   manifest fields (asset provenance, extra SEO) — still `@1`.
4. **Step 3 (only if new block types are required):** `@2` with a migration
   function and both versions accepted for a deprecation period.
5. At every step the gate (`npm run gate`) must stay green and the existing
   package format must keep working.

## 9. Proposed changes — recommendations only, NOT implemented

- Optional `provenance` on assets (`supplied` / `ai-generated` / `stock`, plus licence).
- Optional `seo.robots`, `seo.alternates`.
- A machine-readable publish result file for callers.
- A JSON Schema export of the manifest for non-TypeScript producers.
