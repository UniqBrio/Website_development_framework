# 07 — Security and limitations report

Scope: the blog branch only. Threat model: the PEOPLE are trusted (the owner,
the developer running the commands); the FILES are not. A blog package may come
from a contractor, an email attachment or another system, and a manifest may be
produced by something other than this repository's tool.

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

## Residual risks and known limitations

Not mitigated, or only partly — each is something a production reviewer should
weigh:

1. **Parsers are hand-written.** They are defensive and tested against
   malformed input, but they have not been fuzzed at scale. A crash in one
   document is contained (`DOCUMENT_CORRUPT`); a hang is not, beyond the
   specific quadratic case fixed. Run the ingest with an operating-system time
   and memory limit when the source is untrusted.
2. **External tools process untrusted files.** poppler, LibreOffice, tesseract
   and ffmpeg are invoked on supplied documents. Their own vulnerabilities are
   outside this code. Keep them patched; for hostile sources run the ingest in
   a container or sandbox.
3. **SVG sanitising is pattern-based**, not a full XML rewrite. SVG is only
   ever shown through `<img>`, where scripts do not run; do not inline or
   open-in-new-tab a supplied SVG without re-reviewing this.
4. **Image metadata other than GPS** (camera model, author, embedded
   thumbnails) is published as supplied. Only GPS is flagged.
5. **OCR is unverified** with a real engine in this environment.
6. **WebKit/Safari and real devices** were not tested.
7. **The registry file is served on a static HTML site** (it sits at the web
   root). It holds only already-public facts.
8. **Concurrency:** two publishes to one site at the same time are not locked
   against each other. Publish from one process at a time.
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
