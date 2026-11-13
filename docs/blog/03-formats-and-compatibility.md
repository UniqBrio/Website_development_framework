# 03 — Supported formats and compatibility matrix

"Verified" means exercised by an automated test or a recorded manual run in
this repository (see 09). "Implemented" means the code path exists and is
reported honestly when it cannot run, but was not exercised on real input.

## Document formats

| Format | Read by | Needs | Status |
|---|---|---|---|
| DOCX | package parts | — | Verified (synthetic + python-docx file) |
| PPTX | package parts | owner confirmation that the deck is a blog | Verified |
| XLSX | package parts | — | Verified (incl. chart with no cached values) |
| ODT | package parts | — | Verified |
| RTF | control-word parser | — | Verified (synthetic + LibreOffice output) |
| Markdown, TXT | built-in parser | — | Verified |
| HTML | parsed to blocks, never passed through | — | Verified |
| JSON, CSV, XML (incl. RSS / WordPress export) | built-in | — | Verified |
| ZIP, folder | safe unpack | — | Verified |
| PDF (text) | poppler `pdftohtml` | poppler-utils | Verified on generated PDFs; structure is reconstructed and flagged |
| PDF (scanned) | tesseract | tesseract-ocr | Implemented; NOT verified with a real OCR engine |
| DOC | LibreOffice → DOCX | LibreOffice | Verified |
| PPT, XLS, ODP, ODS | LibreOffice | LibreOffice | Implemented; same path as DOC, not separately run |
| Pages, Keynote, Google Docs links, EPUB | — | — | Not supported: export to DOCX/PDF first |

## Media formats

| Kind | Shown on the page | Kept but not shown (flagged) |
|---|---|---|
| Image | PNG, JPEG, WebP, GIF, SVG (sanitised), AVIF, APNG | TIFF, BMP, HEIC (`--convert-media`), EMF/WMF without LibreOffice |
| Animation | GIF, animated WebP, APNG — bytes unchanged | — |
| Video | MP4, M4V, WebM | MOV, AVI, MKV, WMV (`--convert-media`) |
| Audio | MP3, WAV, M4A, OGG, AAC, FLAC, Opus | — |
| Subtitles | VTT; SRT (re-serialised as VTT) | — |
| Embeds | YouTube, Vimeo, Loom (click-to-load + link) | Wistia, Dailymotion, Spotify, SoundCloud: link only |
| Remote files | never downloaded; kept as a link | — |
| Native charts | exact data table | a drawn chart (see 07) |

## Website compatibility matrix

Detected by `npm run blog -- inspect-site <dir>` (src/blog/site.ts).

| Website | Result | What is written | Status |
|---|---|---|---|
| Generated site (`static/` + `next/` from this framework) | Supported | static page + Next page, site header/footer and token stylesheet reused | Verified: tests, Next 15.5 build, Chromium 320/768/1280 |
| Next.js App Router project, TypeScript | Supported | `app/<base>/…` server components, `public/<base>/…` assets; the site's root layout wraps the page | Verified: tests, Next 15.5 build, Chromium 320/768/1280 via `next start` |
| Static HTML site with its own layout | Supported | `<base>/<slug>/index.html` linking the site's stylesheets, with its `<header>`/`<footer>` | Verified: tests, Chromium 320/768/1280 |
| Site with no blog section | Supported | creates `<base>/` with an index | Verified |
| Site with posts this workflow published earlier | Supported | adds the post, rebuilds the index | Verified |
| Site with its OWN blog at the same route | Refused | nothing; publish under another `--route-base` or map by hand (04) | Verified |
| Next.js Pages Router | Refused | nothing | Verified |
| Next.js without TypeScript | Refused | nothing (the branch will not add TypeScript to a project) | Verified |
| Next.js with `basePath` or `i18n` routing | Refused | nothing | Verified |
| Site with a content system (MDX, Contentlayer, Sanity, Contentful, Payload, …) | Refused | nothing; map the manifest onto that system (04) | Verified |
| Static site with `<base href>` | Refused | nothing | Verified |
| Anything else (Astro, Gatsby, WordPress theme, SvelteKit, Hugo, …) | Refused | nothing | Detection verified; no adapter exists |

Responsive behaviour is the same on every supported site: no fixed widths,
media scale to their column, tables and code scroll inside their own region.
Measured in Chromium only — WebKit/Safari is not installed in the test
environment and remains a Phase 5 item.

A site WITHOUT the framework's design tokens still works: blog components fall
back to system colours and relative spacing and inherit the site's fonts and
link colours. This is reported as a review item, not hidden.
