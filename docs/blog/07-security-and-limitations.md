# 07 — Security and limitations report

Scope: the blog branch only. Threat model: the PEOPLE are trusted (the owner,
the developer running the commands); the FILES are not. A blog package may come
from a contractor, an email attachment or another system, and a manifest may be
produced by something other than this repository's tool.

## Threat model

| Asset to protect | Threat | Primary control | Where |
|---|---|---|---|
| The machine running the ingest | a crafted document exploits a parser or an external tool; resource exhaustion | limits on size, count, depth, ratio, time and memory; tools time-boxed and resource-limited in their own process group; **run untrusted packages in a sandbox** (below) | `blogkit/safety.py` |
| Files outside the run / package | path traversal, symlinks, archive entries, a manifest naming arbitrary files | resolved-path checks; links never followed; assets must be regular files inside the run | `safety.py`, `run.ts` |
| The website's existing files | overwrite by a publish; partial writes; two publishers at once; rollback in the wrong order | ownership marker; refusal of foreign files; transactions with backups; per-site lock with safe stale-lock recovery; site-level history that orders rollbacks | `run.ts`, `lock.ts`, `site.ts` |
| The site's readers | script or markup injected from a document or manifest; unsafe links; third-party tracking | parse-to-blocks, escape at one point, link/embed re-validation at render, click-to-load embeds | `render.ts`, `htmldoc.py` |
| The site's source code | code injection into generated `.tsx` | text emitted only as string literals; comment-safe names; verified by a TypeScript-parser fuzz check | `publish.ts`, fuzz test |
| Content integrity | publishing something other than what was approved | approval bound to the digest of content and every media file, after a preview of that version | `publish.ts` |
| Personal data | GPS in photos; approver's name; absolute paths; environment | GPS flagged; approver kept out of files a server may serve; package-relative paths only | ingest, registry, history |
| The reference / live site during testing | a test writes to the real repository or service | staging procedure works on a copy without `.git`, checks the reference before and after, uses placeholder `.invalid` hosts | `blog_staging_test.sh` |

Out of scope: the owner's account security, the hosting platform, the
browser's own handling of media, and the security of the external tools
themselves (kept patched by the operator).

## Sandboxing recommendations (for untrusted packages)

The ingest's own limits are a floor. For packages from outside the
organisation, run the ingest — not the publish — in an isolated container:

```
docker run --rm --network=none --read-only --tmpfs /tmp:size=2g \
  --memory=4g --pids-limit=256 --cpus=2 --cap-drop=ALL --security-opt no-new-privileges \
  -v /path/to/package:/in:ro -v /path/to/run-parent:/out \
  <image with python3, poppler-utils, libreoffice, ffmpeg, tesseract-ocr> \
  python3 /framework/website_workflow/tools/blog_ingest.py /in --out /out/<run id> --timeout 900 --memory-mb 3072
```

| Tool | Why it needs isolation | Specific recommendation |
|---|---|---|
| LibreOffice (`soffice`) | large parser surface (DOC, PPT, XLS, ODP, ODS, EMF/WMF); macro engine | run headless with a throwaway profile (the ingest does); no network; it is NOT given an address-space limit because it reserves a large one at start-up, so contain it with the container's memory limit; prefer asking for DOCX/PPTX/XLSX instead |
| Poppler (`pdftohtml`, `pdftoppm`, `pdfinfo`) | PDF parsing is a frequent vulnerability source | no network; patched distribution package; the ingest applies time, CPU, file-size and memory limits |
| FFmpeg (`ffprobe`, `ffmpeg`) | many demuxers and decoders | `ffprobe` only reads headers; `--convert-media` (full decode) only for trusted files; no network |
| Tesseract | image decoding of attacker-controlled scans | time and memory limits; no network |

The publish step needs write access to the site and is run outside the
sandbox, by the operator, on the manifest the sandboxed ingest produced. A
manifest is treated as untrusted data by the publish step regardless.

## Safeguards and their evidence

| Risk | Safeguard | Evidence |
|---|---|---|
| Archive path traversal, absolute paths, symlink entries | every entry resolved against the unpack root; escapes and links skipped and reported | `test_malicious_archive_entries`, `unpacks a ZIP safely` |
| Decompression bombs, huge archives | entry count, total size and per-entry ratio limits; refused whole | `test_oversized_file_and_decompression_limits` |
| Oversized files | per-file and per-document limits; limits can be lowered by environment, never raised | same; `test_limits_can_be_lowered_but_never_raised` |
| XML entity expansion / external entities | any XML part declaring an entity is refused | `test_xml_with_entity_declarations_is_refused` |
| Executables and scripts in a package | rejected by content and by extension | `identifies files by content` |
| Wrong or forged extensions | bytes decide the format; a signed format without its signature is corrupt | `Detection` tests |
| HTML / script injection from a document | HTML is parsed into blocks, never passed through; all text is escaped at one serialisation point | `test_html_is_parsed_into_blocks_never_passed_through`, `escapes source text` |
| Active content in SVG | scripts, handlers, foreign objects, external references removed; SVG shown only through `<img>` | `test_svg_sanitiser…` |
| Unsafe link targets (`javascript:`, `data:`, `file:` …) | dropped at ingest AND again at render; a manifest carrying one is blocked | `drops unsafe link targets at render time` |
| Embed id injection | embed ids must match `[A-Za-z0-9_-]{1,64}` or only the link is rendered | same |
| Code injection into generated `.tsx` | text is emitted as string literals; names in the header comment cannot close it | `cannot break out of the generated source comment` |
| A manifest naming arbitrary files (`../`, absolute, symlink) | an asset must be a regular file inside the run's `assets/`; otherwise blocked, not previewed, not published | four path cases + symlink case |
| Malformed or wrong-version manifest | one schema; refused with the first failing paths; 64 MB size cap | `rejects malformed…` |
| Writing outside the site, or through a link | destinations resolved and checked; route base restricted to a plain path | `refuses a route base…`, transaction tests |
| Overwriting someone else's files | files without the workflow's marker are never overwritten | nine refusal cases |
| Partial publish, interruption | transaction with backups and journal; recovery on next run | `a failure part-way…`, `recovers a publish…` |
| Pathological documents stalling the ingest | bracket pairing made linear (was 24 s for 20,000 brackets); adversarial inputs time-boxed in tests | `NoRunawayParsing` |
| Server-side request forgery via `--check-links` | opt-in; non-public hosts refused; redirects not followed | `test_link_checker_refuses_non_public_hosts` |
| Remote content | never downloaded; kept as links | `EXTERNAL_MEDIA_NOT_FETCHED` cases |
| Third-party embeds tracking readers | privacy-enhanced host, nothing requested until the reader opens the player | browser check: no request before open |
| Sensitive data in outputs | manifest holds package-relative paths only; no environment values; approver's name not in files a web server may serve | `test_output_holds_no_absolute_paths_or_environment`, `keeps the approver's name out…` |
| Location data in photographs | JPEG GPS metadata raises `IMAGE_LOCATION_METADATA`, which must be acknowledged | `test_corrupt_missing_duplicate…` |
| Macros, OLE objects, field codes | never executed; reported | DOCX tests |
| Legacy-format conversion | LibreOffice runs headless in an isolated, throwaway profile | manual run (09) |

## Issues found by this audit and fixed

| # | Issue | Severity | Fix |
|---|---|---|---|
| 1 | Publisher assumed a generated-site layout; on any other directory it created `static/` and `next/` | High | site detection; unsupported sites refused |
| 2 | An existing `/blog` page or index would be silently overwritten | High | ownership marker; foreign files never overwritten |
| 3 | Publishing wrote files one by one; a failure left a partial post | High | transaction with backup, journal, recovery |
| 4 | No rollback | High | `rollback` command |
| 5 | A manifest asset path could be a symlink or point outside the run; its target would be copied into the public site | High | regular-file-inside-`assets/` rule |
| 6 | Document and approver names were interpolated into a `/* … */` comment in generated `.tsx`; `*/` in a file name injected code | High | comment-safe encoding |
| 7 | Renderer trusted manifest link targets and embed ids | Medium | re-validated at render; manifest blocked |
| 8 | Markdown inline parser was quadratic on unclosed brackets (denial of service) | Medium | linear bracket pairing |
| 9 | Approval did not require a preview to exist | Medium | preview of the exact digest required |
| 10 | Same slug silently replaced an earlier post | Medium | `--replace` + approval naming the replaced digest |
| 11 | Approvals were keyed by slug; two blogs with one slug shared a record | Medium | keyed by blog id and slug; duplicate routes detected |
| 12 | Media with a valid extension but no valid signature was probed as if real | Medium | `MEDIA_CORRUPT`; truncation check |
| 13 | A later part's title lost its text when demoted to a section | Medium | fixed; reported as `PART_TITLE_AS_SECTION` |
| 14 | Conflicting titles/authors across parts resolved silently | Low | `METADATA_CONFLICT` |
| 15 | `--check-links` would request internal addresses | Low (opt-in) | public-host check, no redirects |
| 16 | Approver's name written to a registry file that may be served | Low | removed from the registry |
| 17 | Interrupted ingest left extracted media with no manifest | Low | cleanup; atomic manifest |
| 18 | Scheme-relative links (`//host/x`) were treated as local paths | Low | treated as external |
| 19 | On non-generated sites the header was nested in `<main>` and the skip link was unstyled | Low | conventional page shell |
| 20 | Stale files from an earlier preview could remain | Low | preview folder rebuilt each time |

### Found 2026-11-13 (production-readiness round)

| # | Issue | Severity | Found by | Fix |
|---|---|---|---|---|
| 21 | Two simultaneous publishes could each rewrite the shared index and registry; one post silently dropped | High | design review | per-site lock (`lock.ts`) |
| 22 | A publisher killed mid-commit left renamed files the journal did not record; undo skipped them, leaving a partial post | High | real-process SIGKILL test | undo compares disk content with what the transaction meant to write |
| 23 | A second publisher inspected the site BEFORE taking any lock and mistook the first one's in-flight files for foreign content | Medium | concurrency test | lock first, then inspect |
| 24 | Rolling back an older publish after a newer one (another run) touched the same files "succeeded" and left an index listing a removed post | High | staging test on a real site | `.blog-publish-history.json`; out-of-order rollback refused |
| 25 | A whole-ingest timeout was swallowed by the per-document error handler and left the running tool orphaned | Medium | resource tests | `BaseException` timeout; tool's process group killed on any interruption |
| 26 | Folders beyond the depth limit were skipped silently | Low | resource tests | `PATH_TOO_DEEP` |
| 27 | Detection assumed a Next.js layout supplies navigation | Medium | staging test | detected and reported |
| 28 | A code-generated sitemap would silently miss published posts | Low | staging test | reported |
| 29 | MP4 with no decodable stream marked web-ready | Low | staging test | `VIDEO_STREAM_UNREADABLE` |
| 30–35 | Accessibility defects (contrast fallbacks, dark-site fallbacks, missing `<main>`, target size, CTA 1:1 regression, 320 px overflow) and missing captions warning | Medium | browser checks + axe | see 12 |

Two defects were in the TEST harness, not the workflow, and were fixed so the
evidence could be trusted: the staging script's kill step targeted its own
process group, and a fixed port let a stale server from an aborted run answer
the browser checks (results from that run were discarded).

## Residual risks and known limitations

Not mitigated, or only partly — each is something a production reviewer should
weigh:

1. **Parsers are hand-written.** They are defensive, and seeded fuzz tests
   (400 mutated inputs per parser in the gate; 9,000 mutated manifests across
   six seeds by hand) found no crash or hang after the fixes. That is evidence
   on those mutations, not a proof: coverage-guided fuzzing has not been done.
   The whole ingest has a wall-clock and memory limit (`--timeout`,
   `--memory-mb`); run untrusted packages in a sandbox (above).
2. **External tools process untrusted files.** They are time-, CPU-, file-size-
   and (except LibreOffice) memory-limited and killed with their child
   processes, which is a floor, not a sandbox. Their own vulnerabilities are
   outside this code: keep them patched and use the container above.
3. **SVG sanitising is pattern-based**, not a full XML rewrite. SVG is only
   ever shown through `<img>`, where scripts do not run; do not inline or
   open-in-new-tab a supplied SVG without re-reviewing this.
4. **Image metadata other than GPS** (camera model, author, embedded
   thumbnails) is published as supplied. Only GPS is flagged.
5. **OCR is unverified** with a real engine in this environment.
6. **WebKit/Safari, Firefox, screen readers and real devices** were not tested
   (14 has the manual plan).
7. **The registry and publish-history files are served on a static HTML site**
   (they sit at the web root). They hold only already-public facts, site-
   relative paths and run-directory names — no approver, no absolute paths.
8. **Concurrency** is controlled per site directory (15). Not covered: two
   different checkouts of the same site, and network file systems without a
   reliable exclusive create.
9. **Rollback depends on the run directory.** Without it, recover from version
   control.
10. **No content-security-policy is emitted.** A site with a strict CSP must
    allow the embed hosts it wants (`www.youtube-nocookie.com`,
    `player.vimeo.com`, `www.loom.com`) or readers get the link only.
11. **Native charts are tables, SmartArt is not extractable, and there is no
    reduced-motion still frame** for animations.
12. **PDF structure is reconstructed** and must be checked against the source.
13. **Unsupported websites have no adapter**; mapping is manual (04).
14. **Very large blogs:** an 800-section article ingests in seconds; multi-
    hundred-megabyte media are copied and hashed several times, which is slow
    but bounded.
