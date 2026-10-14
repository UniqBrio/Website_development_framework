# GENERATOR IMPLEMENTATION REPORT

Phase: website generation. Fixture: `FIXTURE-VERDALEEN-MOBILITY`, entering
through `BusinessInput` and transformed by the real pipeline — no fixture-specific
generator logic (§14, verified by grep and by test).

Validation at time of writing: typecheck PASS · **422 tests green (17 files)** ·
self-audit **11 checks / 0 FAIL / 2 WARN** (pre-existing) · nothing committed.

---

## 1. Architecture assessment

Recorded in full in `docs/GENERATOR-ARCHITECTURE-ASSESSMENT.md`, written before
any generator code. Its conclusions:

- **The generator needs no new decision model.** All 18 things the brief says a
  generator must know are already on `DesignDecisionOutput` /
  `ImplementationContract`, authoritatively. The generator consumes; it decides
  nothing.
- **One structural gap:** the content inventory records that copy EXISTS, not
  what it SAYS — the third instance of the "status without value" class after
  `canonicalOrigin` and `brandSeed`. Fixed as a class (`content-values.ts`), not
  as a third one-off.
- **The build boundary is set by the framework's own rules.** Installing
  `next`/`react` into this repository to run `next build` would fail the
  DEPENDENCY GATE in `stack_doctrine.md`; the packages serve no engine capability.
  So the generator emits Next.js SOURCE and separately renders and BUILDS the
  static base layer — §10 layers 1-2, semantic HTML + CSS — which is the layer the
  SEO and no-JS evidence actually needs.

## 2. Generator contract

```
generateWebsite(input, output, contract, options) -> GeneratedWebsite
  files:     Record<path, string>   // static/** and next/**
  pages:     GeneratedPage[]        // route, purpose, objective, audience, seoRole,
                                    // sections, conversionRole, trustRequirements,
                                    // staticPath, nextPath, trace[], refusals[]
  manifest:  GenerationManifest     // framework, deps, omitted deps, client
                                    // boundaries, patterns used/rejected, token
                                    // provenance, SEO counts, refinementInput
  refusals:  Refusal[]              // what was NOT emitted, and why — first-class
  model, content                    // exposed so tests assert on structure, not HTML

buildStaticSite(generated, outDir)        -> StaticBuildResult
collectArtifactsFromBuild(generated, res) -> RawArtifacts (read BACK from disk)
```

Every `ComponentNode` carries `traceTo: string[]` naming the page, section,
pattern, objective and content-confidence that produced it, so any emitted element
can be traced to its decision (brief §2). `refusals` are an output, not a log:
a rejected pattern, an unresolved canonical and an unsupplied proposition are
all things the generator deliberately did not emit.

## 3. Files added / modified

**New (`src/generation/`)**
- `content-values.ts` — supplied-values layer; resolves through the existing
  `CONFIDENCE_POLICY`; schema has no field for any §12 fabrication category
- `component-model.ts` — one tree, both emitters; `traceTo` on every node;
  a pattern instance renders at most once per page
- `render/html.ts` — semantic HTML base layer, no JavaScript; emits only SEO
  artifacts that HAVE values
- `render/css.ts` — tokens as custom properties; container queries for
  components, media queries for page layout (DD-065); reduced-motion,
  forced-colors, focus-visible
- `emit/nextjs.ts` — App Router source; `"use client"` only on a justified leaf
- `generate-website.ts` — orchestrator, manifest, refinement seam
- `build.ts` — writes to disk, verifies routes and `404.html`, scans for
  secrets, parses TSX with the TypeScript compiler API, reads artifacts BACK

**New (`docs/`)** — `GENERATOR-ARCHITECTURE-ASSESSMENT.md`, `GENERATOR-SPEC.md`,
this report; generator section appended to `FRAMEWORK-DRY-RUN-REPORT.md`.

**New (`tests/`)** — `generator/generator.test.ts` (routes, tokens, SEO, content
provenance, stack, client boundaries, progressive enhancement, rejected
capabilities, responsive/accessibility CSS, build → evidence → gate) and
`dry-run/generate.test.ts` (the complete chain on the fixture, dumping every
artifact).

**Modified** — `src/index.ts` (exports `generateWebsite`, `buildStaticSite`,
`collectArtifactsFromBuild`), `src/evidence/build-evidence.ts`
(`technicalScope: "static_layer_only"` tags technical evidence `derived`).

## 4. Generated website structure

```
next/                                   static/
  package.json   (4 approved libs +       styles.css      (tokens → custom props)
                  next/react/react-dom)   index.html
  README.md      (every omission + why)   conditions/index.html
  styles.css                              devices/index.html
  app/layout.tsx                          for-clinicians/index.html
  app/globals.css                         book/index.html
  app/page.tsx                            404.html
  app/conditions/page.tsx                 robots.txt
  app/devices/page.tsx
  app/for-clinicians/page.tsx
  app/book/page.tsx
  app/_components/ProductGallery.tsx     ← the ONLY "use client", a leaf
  public/robots.txt
```

20 files. No `sitemap.xml`, because no `canonicalOrigin` was supplied and a
sitemap of guessed absolute URLs would be a fabricated fact; `robots.txt` ships
WITHOUT a `Sitemap:` line for the same reason.

## 5. Full pipeline execution

```
BusinessInput (fixture)
 → runPipeline()            16 variables, 20 rules fired, 5 patterns selected
 → pages                    5 owner-supplied routes, 0 derived
 → tokens                   28 L2 tokens, 22 measured pairs, 0 failures
                            (neutral substitute — no brandSeed supplied)
 → seoArtifacts             5 pages × 13 artifacts; 6 unresolved; 5 approvals
 → generateWebsite()        20 files, 63 nodes, 24 refusals
 → buildStaticSite()        5/5 routes on disk, 404 present, 7 TSX files parsed
 → collectArtifactsFromBuild()   HTML read BACK from disk, not from memory
 → collectBuildEvidence()   tagged bundle (below)
 → assessQuality()          post_build, technically_working
```

Per-page refusals the generator recorded: `/` and `/book` withhold the booking
form and the contact section (unverified address — §J.2); `/devices` withholds
`returns` (policy documents recorded as available but none supplied — a
summarised policy would be a regulatory claim). `/conditions` and
`/for-clinicians` have none.

## 6. Build result

| Check | Result |
|---|---|
| Files written | 20 |
| Routes built / missing | 5 / **0** |
| `404.html` | present |
| TSX syntax (TypeScript compiler API) | 7 files, **0 errors** |
| Exposed secrets | **0** |
| Duration | 1,012 ms |
| `next build` | **NOT executed** — stated in the evidence source string |

## 7. BuildEvidence collected

| Field | Kind | Value / source |
|---|---|---|
| `servedHtml` | **measured** | 5 documents, JS not executed |
| `dependencies` | **measured** | `next`, `react`, `react-dom`, `next-intl`, `react-hook-form`, `zod` |
| `technical` | **derived** | all 7 §L.1 facts true for the static layer; warning: "`next build` was NOT executed" |
| `routeInventory` | derived | 5 routes, from the fetched HTML |
| `bundles` | **unavailable** | "no build manifest… the registry's weightKb is an ESTIMATE and may not stand in for it" |
| `accessibility` | **unavailable** | no §G.1 observations |
| `webVitals` | **unavailable** | no field or lab measurement |

Nothing was estimated into a measured slot. Nothing was manufactured.

## 8. Quality / accessibility / SEO / performance results

| Gate | Outcome | Basis |
|---|---|---|
| technical | **true** | derived static-layer facts |
| responsive | **true** | 35-component derived inventory, core content preserved |
| design | **true** | objectives covered, 0 conflicts, tokens valid |
| content | **false** | blocked conversion path `book_appointments` (unverified addresses) |
| accessibility | **unknown** | 14 mandatory AAA criteria unclassified — no observations |
| performance | **unknown** | no measured bundle, no vitals |

Level **`technically_working`**, weighted score **76.7**. The level cannot rise
while two gates are unknown and one has failed, and the explanation says so.

**SEO, measured from served HTML:** scored **9/10**, worst page `/book` —
"canonical missing or incorrect", which is exactly the unresolved
`canonicalOrigin`. Every page: 1 `h1`, no heading skips, 5 internal links, 0
images without alt, `robots: index,follow`, per-page structured data matching
what the SEO layer justified (`/for-clinicians` carries `Article` +
`BreadcrumbList` only; `/` carries `Organization`, `Service`, `FAQPage`).

**Route inventory:** planned vs built compared — 5 matched, 0 missing, 0
unplanned.

**Accessibility target:** `wcag_aaa_or_equivalent` preserved through to the
generated CSS (7:1 body threshold, 44 px minimum target); the gate stays
`unknown` rather than passing on a stated target.

## 9. Before / after readiness

| | Before this phase | After |
|---|---|---|
| Output | a specification and gates | a specification, **20 source files across two hosts**, and gates |
| Best achievable level on the fixture | `cannot_classify` (pre-build only) | `technically_working` from a real static build |
| SEO evidence | plan only, unscored | **measured** from served HTML, scored 9 |
| Technical evidence | unavailable | derived (static layer + TSX syntax) |
| Rejected capabilities | absent from a decision | **proven absent from generated output** by test |
| Traceability | decision log | every emitted node → decision |
| Tests | 363 | **422** (+59) |

## 10. Remaining P0 / P1 / P2 gaps

**P0 — none.**

**P1 (before a customer dry run):** no host adapter for `next build` (bundles,
vitals); no accessibility audit runner (AAA gate `unknown`; 3 criteria need a
person); `refine()` uninvoked (seam explicit in `manifest.refinementInput`);
content slots need a drafting/approval step; pages sharing an objective get
identical sections; asset files not plumbed to the gallery; hreflang, `Q-*`
Phase-1 orphaning and the CMS-editor gate unchanged.

**P2:** `page-spec.ts` inference regexes include `clinic|clinician` among generic
professional keywords — not fixture logic, but fixture-flavoured; static CSS is a
base layer, not a finished design; prior P2 items unchanged.

## 11. Rule expansion implications

The 68/17 classification stands, and its precondition is now met: **rules have a
consumer.** `sectionArchitecture`, `selectedPatterns`, `tokens` and
`seoArtifacts` each drive emitted files, so a rule's effect is observable in
generated output and testable against it. Encode in the order already
recommended — layout/grid/hero (DD-024..032) first, because the flat static CSS
is where their absence is now visible — then navigation/CTA, then the gate rules.

## 12. Final verdict

## READY FOR RULE EXPANSION

The framework has crossed the boundary the phase set out to prove: from
"intelligent specification + validation" to "intelligent specification +
generation + validation". A business input entered through the real pipeline,
became a website in two hosts, was built, was read back from disk, and was gated
by the same evaluators that gated its plan — which correctly refused to certify
it, for reasons it can name.

Not READY FOR CUSTOMER DRY RUN: two gates are undecidable without a host that
runs `next build` and an accessibility audit. That is the next phase, and it
belongs in a host project rather than in this library.

Nothing was committed. No rules were expanded. No customer website was built.
