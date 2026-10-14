# GENERATOR SPEC

The website generation layer. It turns a `DesignDecisionOutput` into a website
and feeds that website back into the evaluation gates. This document is the
contract; `docs/GENERATOR-ARCHITECTURE-ASSESSMENT.md` records why it is shaped
this way.

---

## 1. Responsibility

**The generator consumes; it does not decide.**

Every value in the generated site was decided upstream by the pipeline. The
generator's only judgement is *how to render a decision*, never *what the
decision is*. Anything it cannot derive from the decision output becomes a
`Refusal` — a first-class output carrying the reason — or a labelled content slot.
There is no branch in `src/generation/` that invents a business fact, a colour, a
dependency or a pattern.

## 2. Input contract

```
generateWebsite(input: BusinessInput, output: DesignDecisionOutput,
                contract: ImplementationContract, options?: GenerateOptions)
```

| Consumed field | Used for |
|---|---|
| `output.pages` (PageSpec[]) | one route per page; purpose, objective, audience, seoRole, sections, conversion role, trust requirements preserved verbatim |
| `output.selectedPatterns` + `selectionDecisions` | which patterns may implement a section; the declared fallback for each |
| `output.tokens` | every colour, type, spacing, radius, layout and motion value |
| `output.seoArtifacts` | every `<head>` value and the Next.js `metadata` export |
| `output.stack` | framework, rendering strategy, the exact dependency list, the omissions |
| `output.responsiveStrategy.audit` | per-range transformation and hover/motion constraints per component |
| `output.contentPlan` | which proof sections may render; blocked conversion paths |
| `output.accessibilityStrategy` | the requested target and its thresholds |
| `output.quality` | the refinement seam (`manifest.refinementInput`) |
| `input.businessName`, `.description`, `servicesProducts[].name`, `requiredPages[].purpose` | owner-supplied STRINGS rendered literally |
| `options.suppliedContent` | actual copy values, validated by `suppliedContentSchema` |

## 3. Output contract

```ts
interface GeneratedWebsite {
  files: Record<path, string>;    // static/** (base layer) + next/** (App Router source)
  pages: GeneratedPage[];         // one per PageSpec, each with a node-level trace
  manifest: GenerationManifest;   // stack, deps, boundaries, patterns, provenance, refinement input
  refusals: Refusal[];            // rejected_pattern | omitted_dependency | unresolved_artifact | content_slot | hidden_section
  model: ComponentModel;          // the single tree both emitters rendered
  content: ResolvedContent;       // every content category with state + provenance
}
```

`refusals` is deliberately not a log. A rejected pattern, an unresolved canonical
and an unsupplied proposition are things the generator *chose not to emit*, and
the reason must travel with the artifact so a reviewer can tell deliberate
absence from a bug.

## 4. Architecture — one model, two emitters

```
DesignDecisionOutput
   └─ resolveContent()        content-values.ts    status → value + provenance, or a slot
   └─ buildComponentModel()   component-model.ts   sections + patterns + responsive → ONE tree
         ├─ renderCss()       render/css.ts        tokens + responsive decisions → styles.css
         ├─ renderStaticSite() render/html.ts      tree + SEO artifacts → static/**.html   (EXECUTED)
         └─ emitNextApp()     emit/nextjs.ts       tree + stack + SEO → next/app/**        (EMITTED)
   └─ buildStaticSite()       build.ts             write to disk, verify routes, 404, secrets, TSX syntax
   └─ collectArtifactsFromBuild()                  read the build BACK from disk → RawArtifacts
                                                   → collectBuildEvidence() → runPipeline(input, {evidence})
```

Both emitters consume the same `ComponentModel`, so the static layer and the
Next.js source cannot disagree about what the site is.

### Why the build boundary sits where it does
Installing `next` and `react` into this repository to run `next build` would fail
the framework's own dependency gate (`stack_doctrine.md` §DEPENDENCY GATE): those
packages serve no capability of the *engine*. So the framework EXECUTES the static
base layer — which is §10's layer 1-2, semantic HTML plus CSS, and the layer the
SEO and no-JS evidence needs — and EMITS the Next.js source for the host to build.
The evidence produced says exactly that (§13).

## 5. Page generation

Every `PageSpec` becomes one route in both emitters. Nothing is reduced to a count.
Each generated page carries the spec's route, purpose (verbatim), objective,
audience, SEO role, sections, conversion role and trust requirements, plus a
per-node trace. The Next.js `page.tsx` header comment records all of these and
every section deliberately not rendered.

Exactly one `<h1>` per page. A page with a `proposition` section gets it from the
hero; any other page gets it from the SEO title artifact — the same authority as
`<title>`, so the two cannot disagree.

## 6. Component generation

`ComponentNode` is semantic-HTML-only: `hero`, `heading`, `prose`, `card_grid`,
`timeline`, `disclosure_group`, `definition_list`, `form`, `gallery`, `nav`,
`content_slot`, `unavailable_notice` and so on. Every node carries:

- `traceTo: string[]` — the page, section, pattern, objective, content confidence
  or rule that produced it. Never empty; a test asserts it.
- `responsive` — per-range transformation folded from the audit, plus
  `noHoverDependency`, `staticUnderReducedMotion`, `hideRefused`.
- `requiresClientJs` + `noScriptBehaviour` — what the node needs and what it
  degrades to.

A pattern instance renders at most once per page. When two sections map to the
same pattern (catalog and product_detail both want the gallery), the second gets a
heading and a slot.

## 7. Token generation

The generator calculates no colour. `render/css.ts` writes
`tokens.color.values.cssCustomProperties` verbatim into `:root` (and a second
theme under `prefers-color-scheme` when the mode is DUAL), then emits typography,
spacing, radius and motion tokens as custom properties. Component rules reference
`var(--color-*)` only; a test proves no raw hex appears outside `:root`.
Breakpoints come from `tokens.layout.values.breakpoints`, which came from
`RANGES`. The CSS header records the seed, the provenance and the measured
contrast count.

Chain proven by test: `DesignDecisionOutput → token contract → generated CSS →
rendered components`.

## 8. SEO generation

`render/html.ts` and `emit/nextjs.ts` both read `output.seoArtifacts`. There is no
second SEO system. An artifact with a value is emitted; an artifact without one is
**not emitted** — a guessed canonical is worse than none — and the Next.js
`metadata` export carries a comment naming the unresolved artifact and its reason.
Per-page structured data is exactly the per-page justified list; a site-withheld
type can never reappear. Every page is reachable through the header nav and
footer, so no orphan exists in the served HTML.

## 9. Responsive generation

No separate "mobile version". The CSS is derived from the responsive decisions and
the token breakpoints:

- `container-type: inline-size` + `@container` on reusable components (DD-065);
  `@media (min-width)` only for page-level layout.
- compact range is a single-column priority flow.
- hover rules exist only inside `@media (hover: hover) and (pointer: fine)`.
- `prefers-reduced-motion` collapses every duration.
- `forced-colors` lets the user's palette win.

## 10. Content integrity

`content-values.ts` is the class-level fix for the third instance of "the contract
records that a fact exists but not what it is" (after `canonicalOrigin` and
`brandSeed`). It resolves each category to `{ state: "supplied", value,
confidence }` or `{ state: "slot", needs, placeholder, hidden }`. Its schema
**deliberately omits** testimonials, reviews, awards, certifications, statistics,
customer logos, case studies, team credentials, pricing, guarantees and regulatory
claims: those are evidence the content engine gates, not copy the generator
renders, and accepting them here would be a second route into publication that
bypasses `verifyContent()`.

Concretely, on the reference fixture: the unverified contact route renders an
explicit unavailable notice and the location fields are NOT substituted for it;
the blocked booking conversion renders a notice, not a form; missing copy renders
as `data-content-slot` structure; offer names are rendered verbatim and missing
descriptions marked "to be supplied"; the proposition uses the owner's own
description string rather than a paraphrase.

## 11. Progressive enhancement

The static layer ships **zero JavaScript** (a test asserts no `<script>` other than
JSON-LD). FAQ disclosure is native `<details>/<summary>`. Forms are real
`method="post"` forms with labels. The gallery's server markup is the declared
fallback — a plain grid — and the single client component (`ProductGallery`)
upgrades it; if the enhancement never loads, the grid is complete.

`"use client"` appears only in `app/_components/**`, never on a page or layout,
and only for a node the model marked `requiresClientJs`. Each boundary records
its justification and its no-JS behaviour in the manifest and the README.

## 12. Stack compliance

`package.json` contains `next`, `react`, `react-dom` and **exactly** the libraries
in `output.stack.libraries`. Descriptive entries that are not npm packages
("lazy-loaded map embed") are recorded in the README rather than invented as
dependencies. Every omission — `three`, `@react-three/fiber`, the map embed — is
written into the README with its reason. No PWA artifact is generated when PWA was
denied. A test proves the rejected patterns are absent from all output.

## 13. Evidence integration

`buildStaticSite()` writes every file, verifies each planned route exists on disk,
verifies a `404.html`, scans for exposed secrets, and parses every emitted `.tsx`
for syntax errors with the TypeScript compiler API.
`collectArtifactsFromBuild()` reads the HTML **back from disk** and produces
`RawArtifacts` with `technicalScope: "static_layer_only"`, which makes the
collector tag the technical evidence **`derived`**, with a source string stating
that `next build` was NOT executed. Bundles, Core Web Vitals and accessibility
observations are left absent, so they arrive as `unavailable` and their gates stay
`unknown`.

The manifest's `refinementInput` is the explicit seam for `refine()`: level,
unknown gates, failed gates and blockers, ready to be routed into generator
options. `refine()` is **not invoked** in this phase.

## 14. Testing

`tests/generator/generator.test.ts` (58 tests): routes and field preservation,
tokens → CSS → components, SEO artifacts in served HTML, content provenance and
every fabrication category, stack and dependency compliance, client-boundary
discipline, rejected-capability absence, responsive and accessibility CSS,
build → evidence → evaluation → gate including build failure and missing
evidence, the refinement seam, determinism, and a grep proving no fixture name
exists in `src/generation/`. `tests/dry-run/generate.test.ts` runs the complete
chain to disk and records a digest.

## 15. Known limitations

1. **`next build` is not executed.** Bundles and vitals are `unavailable`; the
   performance gate is `unknown` on every run. A host adapter is the next P1.
2. **No accessibility audit runner.** The AAA gate stays `unknown` until a host
   supplies observations.
3. **Pages sharing an objective get identical architecture.** `/` and `/book`
   both carry the full `book_appointments` section list; the page model uses
   `seoRole` for SEO but not yet to differentiate sections.
4. **Content slots, not copy.** A site is only as complete as the values supplied
   through `suppliedContent`; the generator never fills a slot itself.
5. **The gallery renders images from verified assets only, and the asset FILES
   are not yet plumbed** — the component model knows the asset exists, not its path.
6. **`refine()` remains uninvoked.** The seam is explicit; the loop is not.
7. The static CSS is a faithful base layer, not a finished visual design; layout
   rules stop at grid columns and containers.

## 16. Engagement experience delivery (added 2026-09-14)

Design and rationale: `docs/ENGAGEMENT-DELIVERY-ASSESSMENT.md`. Results: `docs/ENGAGEMENT-DELIVERY-REPORT.md`.

```
output.engagement (decision) + resolveContent (supplied values)
  → planExperienceDelivery()          src/engagement/delivery.ts — ONE spec per SELECTED opportunity
  → buildComponentModel({deliverySpecs})   only DELIVERABLE specs become `experience` nodes
  → render/experiences.ts             ONE markup source: static layer inline, Next layer via dangerouslySetInnerHTML
  → runtime/experience-runtime.ts     ONE evaluator + DOM enhancement → /experiences.js (static: per page; Next: layout)
  → reconcileExperienceDelivery()     decision ↔ specs ↔ rendered nodes ↔ runtime; generation throws on mismatch
  → manifest.engagement.delivery / .reconciliation / .runtime
```

**Delivery types.**

| Type | Values | Rendering |
|---|---|---|
| comparison | `engagementData.comparison` | static semantic table in a labelled scroll region (reference implementation, unchanged) |
| calculator | `engagementData.calculators[]` | form + static explanation + runtime |
| decision_flow (assessment / selector) | `engagementData.decisionFlows[]` | form + static criteria + runtime |
| existing_section (booking / progressive form) | — | the page's existing form contract |

**What makes a calculator or decision flow DELIVERABLE** (`content/engagement-values.ts`):
1. the inventory status for every data kind the category needs is verified;
2. every item resolves to verified: `customer_supplied_verified`; `approved_ai_draft` or `external_authoritative_source` only with an approval record; `framework_policy` only for mathematical constants;
3. the structure is valid — refs resolve, options exist, recommended offers are owner-supplied, and every owner example matches the formula under the same evaluator the browser runs;
4. the delivered cost fits the remaining route budget.

Otherwise the result is **DELIVERY_UNAVAILABLE**, with a reason, the named blockers, the decision record id and a safe fallback. Nothing is substituted.

**Kill switch.** `GenerateOptions.experiences: "disabled"` renders the static equivalent only, with no script.

**Browser validation.** `host/validate.mjs` `experienceChecks` operates each delivered experience by keyboard against expectations from the host manifest. Failures map into existing criteria:
- keyboard completion → `input_independence`;
- error announcement and focus → `forms`;
- everything else → `technical.experiencesWork`.

A delivered experience that was never operated leaves the technical facts unknown.

**Page grid.** The compact page track is `minmax(0, 1fr)`, the same as the larger ranges. A bare `1fr` has an automatic minimum, so a wide min-content child (a comparison table in its scroll region) widened the page by 161 px at 320 CSS px. The host run measured it; it is fixed and pinned in `tests/generator/generator.test.ts`.

## 17. Customer readiness foundation (added 2026-09-14)

Assessment: `docs/CUSTOMER-READINESS-ASSESSMENT.md`. Results: `docs/CUSTOMER-READINESS-REPORT.md`.

**One contract, every capability: Decision → Contract → Generation → Rendered Output → Reconciliation** (`src/integrity/decision-execution.ts`). Every decided capability gets a ledger entry: `delivered`, `unavailable` (with the reason, never silent), or `mismatch`, which makes generation throw. The domains:

| Domain | Decided by | Reconciled against |
|---|---|---|
| `home_route` (G1) | page model: owner `/`, the site-primary objective's page at `/`, or a derived home | model + `static/index.html` + `next/app/page.tsx` |
| `page` | owner `requiredPages` / derivation | model page + static page + Next page, and no extra page |
| `section` | page ROLE (`home, services_index, service, about, faq, contact, legal, conversion, content`) or objective; site-level sections allocated to the owning role | per-section node ids, or a recorded refusal |
| `conversion` | `conversionPlan`: capability order per objective (`form` → `email_link` → `phone_link` → `whatsapp_link`, reordered by `preferredContactMethods`, limited to what the surface can complete) | the delivered capability rendered: a configured form, or the contact link |
| `navigation` | DD-034 `nav.compactMode` | `data-nav-compact="popover_disclosure"` on every page in both layers |
| `dependency` | `dependencyAdmission`: stack proposal × `GENERATOR_CONSUMERS` × dependency-gate decisions | bare imports in emitted source, both ways |
| `content_draft` | draft channel: an approved draft publishes, an unapproved one is held, a draft for an unknown route is rejected | published text present; held and rejected text absent |
| `engagement` | engagement decision + delivery spec (§16) | the delivery reconciliation |
| `rule_precedence` | `precedenceResolutions` (context rules outrank personality rules; the same tier stays a conflict) | the decision draft carries the winner |

**Also added:**
- **Indexability:** `analyseIndexability` finds near-duplicate main content (word 4-shingles, Jaccard ≥ 0.8) and placeholder slots on `index,follow` pages. One implementation serves both the generator manifest and the content gate over served HTML.
- **Dataset classification:** FIXTURE tokens and reserved domains make a dataset `synthetic`, which is a publication blocker.
- **Workflow seams:** see `website_workflow/framework_seams.md`.
- **Host validation:** experiences and compact navigation are operated in Chromium **and** WebKit, against the Next.js layer **and** the static layer (served by the collector). Every rule path, the no-match path, every owner example and an out-of-range input are exercised. The Chromium accessibility tree is asserted, and the static layer gets an axe and reflow audit. A combination that did not run leaves the technical facts unknown.
