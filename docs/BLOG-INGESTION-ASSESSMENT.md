# Blog ingestion and publishing — existing-workflow assessment and enhancement plan

Date: 2026-11-11. Scope: add an OPTIONAL capability to take an already-written
blog (documents + media) and present it on the website. Written BEFORE any
change was made; the implementation that followed is in
docs/BLOG-INGESTION-REPORT.md.

## 1. What the existing Website Workflow is

Two surfaces that answer different questions (README "Code surface"):

| Surface | Entry | Role |
|---|---|---|
| `website_workflow/**` (markdown) | `/wrequest` → `/website` | A gated process run by Claude over a site repo: Phase 0 intake → S strategy → 1 interrogation → 2 plan → 3 Supabase → 4 build → 5 QA evidence → 6 release → 7 close, each with an owner gate |
| `src/**` (TypeScript) | `runPipeline()` → `generateWebsite()` | A deterministic function from verified business facts to a design specification and a generated site: a static HTML layer plus Next.js App Router source, styled from ONE generated token file |

They meet at `website_workflow/framework_seams.md`: markdown records carry
`framework:*` JSON blocks that are the authority for engine input.

Baseline before this work: `npm run gate` green — typecheck clean, 807 tests in
31 files, framework self-audit 0 FAIL.

## 2. Findings against the ten assessment questions

| # | Question | Finding |
|---|---|---|
| 1–2 | Architecture and input mechanisms | Input is a typed `BusinessInput` plus optional `suppliedContent` (src/generation/content-values.ts): short owner-supplied strings and asset FILE descriptors. The markdown flow takes one filled request file. Neither accepts a document. |
| 3 | Document processing | None. No parser for any document format exists in `src/` or `website_workflow/tools/`. |
| 4 | Media processing | Policy only: src/content/asset-policy.ts decides what may replace a MISSING asset; `assetFileSchema` requires width, height and alt for a supplied image. Nothing reads a media file. |
| 5 | Blog page structure | `article_detail` / `article_index` exist as section NAMES in src/design-intelligence/sections/registry.ts and the SEO layer knows an `Article` type needs headline, author and date (src/seo/artifacts.ts) — but no renderer produces an article body. There is no blog template to reuse; there IS a design system to reuse. |
| 6 | Reusable components | The token contract and generated stylesheet (custom properties for colour, type, spacing, radius); the semantic-HTML conventions of src/generation/render/html.ts (sized images with alt, scroll-region tables, skip link, `c-*` classes, `c-action`); the site header/footer markup; `parseServedHtml` for evidence; the owner-gate and evidence discipline of website_flow.md Phases 5–7. |
| 7 | Technical limits | (a) stack_doctrine.md is DEFAULT-DENY: `zod` is the only dependency, so npm document parsers would each need the dependency gate. (b) `generateWebsite()` THROWS when its decision-to-execution ledger disagrees with its output, so adding routes inside it is high-risk. (c) No charting library and no categorical palette in the token file. (d) PDF, OCR and legacy Office formats cannot be read with a standard library alone. |
| 8–9 | Integration and conflicts | Conflict 1: "never fabricate" (README rule 1) forbids filling gaps — which matches the brief's preservation rules, so the branch must report gaps, not fill them. Conflict 2: rule 10 (unmeasured ≠ passing) means preview validation cannot claim playback or responsiveness; those stay Phase 5. Conflict 3: rule 5 (command copies byte-identical) and rule 7 (README table + log) apply to anything added. Conflict 4: `blog-content-seo-writer` is a mapped skill that WRITES blogs — the branch must not invoke it. |
| 10 | Smallest effective enhancement | A separate, additive branch that produces files beside the generated site rather than a change inside the generator. |

## 3. Decisions (owner-confirmed where they were the owner's to make)

| Decision | Choice | Why |
|---|---|---|
| Extraction runtime (owner) | A standard-library Python tool beside the existing `tools/*.py`; PDF / OCR / legacy Office through poppler, tesseract, LibreOffice WHEN INSTALLED, reported when not | No new dependency; matches the existing tool convention; honest about environment limits |
| Publish target (owner) | Framework-level, both surfaces | Every site inherits it; hand-built sites get the manifest + mapping table as their specification |
| Join with the generator | Overlay, not integration: nothing in `runPipeline()` / `generateWebsite()` imports the branch | A site without a blog stays byte-identical; the integrity ledger is not put at risk |
| Contract | One manifest schema (`framework:blog-manifest@1`), written by the tool and parsed in one place | Same single-authority rule as framework_seams.md |
| Placement under uncertainty | High/medium confidence places; low never does — the file is left out and flagged | Guessing a position is an editorial decision |
| Native charts | Shown as their exact data table, flagged | No charting library is admitted and the token file has no validated categorical palette; drawing one is a design decision |
| Publishing | Refused without an approval record bound to the digest of the exact blog | "Do not publish automatically" made mechanical |

## 4. Plan

1. `website_workflow/tools/blog_ingest.py` + `tools/blogkit/` — intake (files,
   folder, ZIP), byte-signature validation, extractors per format, media
   probing, association, manifest.
2. `src/blog/` — manifest schema and integrity check, mapping ledger, one
   element tree rendered to static HTML and to a Next.js server component,
   stylesheet from site tokens only, validation report, approval, publish.
3. `website_workflow/blog_publishing.md` and the `/wblog` command pair; a
   routing line in website_flow.md; README table, command list and update log.
4. Tests on representative documents built at test time; a real Next.js build.

Files touched in existing code: `src/index.ts` (one additive export),
`package.json` (two scripts), `website_flow.md` (routing paragraph),
`winit` command (copy list), `skills_map.md`, `framework_seams.md`, README,
`.gitignore`. No existing function is modified.
