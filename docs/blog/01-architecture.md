# 01 — Website Workflow architecture, with the blog branch

## The workflow has two surfaces and one optional branch

| Part | Entry | Answers |
|---|---|---|
| Markdown process — `website_workflow/**` | `/wrequest` → `/website` | "May this change ship?" Gated, owner-approved, Phases 0–7 |
| Decision engine and generator — `src/**` except `src/blog/` | `runPipeline()` → `generateWebsite()` | "What should this website be?" Business facts → design specification → static HTML + Next.js source |
| **Blog branch (optional)** — `website_workflow/tools/blog_ingest.py`, `src/blog/` | `/wblog` | "Present this already-written blog on this website." |

The blog branch is ADDITIVE. `runPipeline()` and `generateWebsite()` do not
import it (a test greps the source to prove it), a site generated without a
blog is byte-identical to before, and the branch can be removed by deleting its
files. It rejoins the main process at Phase 5 (QA evidence) of
`website_workflow/website_flow.md`.

## Stages and their single authority

```
sources ──► INGEST ──► manifest.json + assets/ ──► MAP ──► RENDER ──► VALIDATE ──► PREVIEW
(read-only)  Python      the contract             ledger   one tree    report       noindex
                                                                          │
                              owner reads preview + report ◄──────────────┘
                                          │ approve (digest-bound)
                                          ▼
                    DETECT SITE ──► PUBLISH (transaction) ──► website files ──► Phase 5 → 6 → 7
                                          │
                                          └─► ROLLBACK (from backups in the run directory)
```

| Stage | Code | Sole responsibility |
|---|---|---|
| Ingest | `website_workflow/tools/blogkit/` | read sources, extract blocks and media, associate, write the manifest |
| Contract | src/blog/manifest.ts | the one schema; referential and on-disk integrity |
| Map | src/blog/map.ts | each element → one page destination; SEO from supplied facts only |
| Render | src/blog/render.ts, src/blog/css.ts | one element tree → HTML and JSX; the only place text becomes markup |
| Validate | src/blog/validate.ts | checks, issue classification, readiness |
| Site | src/blog/site.ts | what kind of website this is; refuse what is not understood |
| Preview / approve / publish / rollback | src/blog/publish.ts, src/blog/run.ts, src/blog/cli.ts | files, approval record, transaction, journal |

## Invariants (each is enforced by a test, not by convention)

1. **Presentation only.** No stage writes, rewrites, summarises or completes
   content. A missing title, alt text, caption or description stays missing and
   is reported with the action that would supply it.
2. **Sources are read-only.** Everything is written under the run directory;
   the tool refuses an output path inside an input folder.
3. **An asset is listed only if its bytes exist.** A reference to something
   absent is a `missing_media` block and an issue.
4. **The manifest is untrusted data** to everything downstream, whoever
   produced it: asset paths must be regular files inside the run's `assets/`;
   link targets and embed ids are re-validated at render time.
5. **Unmeasured is never passing.** Checks that need a browser report
   NOT VERIFIED.
6. **Nothing is published without an approval** bound to the digest of the
   exact content and media, given after a preview of that version.
7. **Publishing is all-or-nothing** and never overwrites a file the branch did
   not write. Replacing its own earlier post needs an explicit flag and an
   approval that names the version replaced.
8. **An unsupported website is reported, not adapted.**
9. **No dependency was added.** The extractor is standard-library Python; the
   TypeScript side uses only `zod`, already present.

## What a run directory holds

```
<run>/manifest.json            contract (written atomically; absent = no run)
<run>/assets/<blog-id>/…       every extracted or supplied media file, content-addressed names
<run>/preview/<slug>/…         the page as it will look, noindex, with a review panel
<run>/reports/                 validation (md + json), mapping, site compatibility
<run>/approvals/               one record per approved blog
<run>/publish-tx/<id>/         journal + backups of every site file a publish replaced
<run>/run-record.json          preview / approval / publish / rollback, each with the digests it acted on
```
Run directories live under `website_workflow/blog_runs/` and are git-ignored.
KEEP a run directory for as long as its publish may need rolling back.
