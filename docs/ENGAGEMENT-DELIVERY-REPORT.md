# ENGAGEMENT DELIVERY REPORT

Written 2026-09-14. Companion to `docs/ENGAGEMENT-DELIVERY-ASSESSMENT.md`, which covers design and rationale. This document covers results.

Evidence sources:
- unit tests: `tests/engagement/delivery.test.ts`, `tests/host/host-boundary.test.ts`;
- dry run: `tests/dry-run/engagement-dry-run.test.ts`;
- browser: `tests/host/engagement.host.ts`, with digests in `hosts/engagement/evidence/*-digest.json`, collected 2026-09-14 13:31–13:37 UTC;
- regression: `npm run gate` and `npm run host:e2e` (Verdaleen, Ashvattha and engagement, all rerun on 2026-09-14).

Nothing was committed.

---

## 1. What was built

```
EngagementOpportunityDecision (unchanged; weights and thresholds untouched)
  → planExperienceDelivery()        ONE ExperienceDeliverySpec per SELECTED opportunity, never per category
  → governed values                 engagementData.calculators[] / decisionFlows[] / comparison
       resolveProvenance()          the strictest of inventory status, item provenance and structural validity
  → DELIVERABLE  → experience node → ONE renderer (static + Next) → ONE runtime (/experiences.js)
  → DELIVERY_UNAVAILABLE → reason + blockers + decision record id + safe fallback; nothing substituted
  → reconcileExperienceDelivery()   decision ↔ specs ↔ rendered nodes ↔ runtime; generation throws on mismatch
  → host validate.mjs experienceChecks → raw facts → existing gates (no second a11y/technical system)
```

Delivery types:

| Type | Values | Output | Client JS |
|---|---|---|---|
| comparison (reference) | `engagementData.comparison` | semantic table in a labelled, focusable scroll region | none |
| calculator | `engagementData.calculators[]` | form, static "How this is calculated" explanation, runtime | shared runtime |
| decision_flow (assessment / guided selector) | `engagementData.decisionFlows[]` | form, static "How the result is decided" criteria, runtime | shared runtime |
| existing_section (booking / progressive form) | — | the page's existing form contract | per that contract |
| none | — | DELIVERY_UNAVAILABLE | none |

Every calculator and decision flow always renders its static equivalent in the HTML. The interactive controls sit in a `fieldset disabled` with a visible "requires JavaScript" notice, and the runtime unlocks them. The kill switch `GenerateOptions.experiences: "disabled"` emits the static equivalent with no script.

## 2. The delivery contract (as implemented)

`ExperienceDeliverySpec` (`src/engagement/delivery.ts`) carries:
- **identity:** specId, decisionRecordId, category, role, score, experiencePattern;
- **delivery:** deliveryType, status, mode, reason, dataStatus;
- **provenance:** provenance[] (item, provenance, source, approvedBy, status, reason) and blockers[];
- **placement and content:** route, section, definition (the resolved values);
- **fallback, accessibility[], responsive** (per-type contract), **performance** (derived bytes and budget), **seo, analytics, approvals**.

Provenance resolution (`src/content/engagement-values.ts`):

| Provenance | Business value | Mathematical constant | Copy |
|---|---|---|---|
| customer_supplied_verified | verified | verified | verified |
| approved_ai_draft | verified **only with an approval record** | same | same |
| external_authoritative_source | verified **only with an approval record** | same | same |
| framework_policy | **unverified** (the framework never states business facts) | verified | unverified |
| customer_supplied_unverified / ai_draft | unverified | unverified | unverified |
| unavailable | unavailable | unavailable | unavailable |

A calculator or decision flow is DELIVERABLE only when all of these hold:
1. the inventory status of every required data kind is verified;
2. every item resolves to verified;
3. the structure is valid: references resolve, there are no unused inputs or duplicate ids, a recommended offer is owner-supplied, every outcome is reachable, and a selector recommends an offer;
4. every owner example reproduces under the same evaluator source the browser runs;
5. the delivered cost fits the remaining route budget.

The formula AST has **no numeric literals**, so every number is an input or a provenance-carrying constant.

## 3. Tests

| Suite | Result |
|---|---|
| `npm run gate` (typecheck + all unit tests + `audit_framework.py`) | PASS — 25 files, 694 tests; audit 11 checks, 0 FAIL, 2 WARN (pre-existing) |
| `tests/engagement/delivery.test.ts` | PASS — 53 tests covering brief tests 1–18 |
| `tests/host/host-boundary.test.ts` | PASS — 28 tests; experience checks map into the existing gates, and unmeasured → technical unknown |
| `tests/dry-run/engagement-dry-run.test.ts` | PASS — 4 tests, 9 fixtures |
| `npm run host:e2e` | PASS — Verdaleen 179 s, Ashvattha 259 s, engagement 411 s |

Brief test map (all in `delivery.test.ts` unless noted):

| # | Test | Where / how |
|---|---|---|
| 1 | comparison still renders | static + Next markup, table semantics preserved |
| 2 | comparison regression | caption, scoped headers and labelled focusable region; browser-verified (§4) |
| 3 | verified calculator renders | static and Next markup parity |
| 4 | unverified formula → no public calculator | `ai_draft`, `customer_supplied_unverified`, unapproved `approved_ai_draft` |
| 5 | unavailable formula → no calculator | missing definition, and `unavailable` provenance |
| 6 | AI formula never public | `ai_draft` formula → DELIVERY_UNAVAILABLE + blocker; also in the dry run |
| 7 | verified assessment renders | yes |
| 8 | verified selector renders | yes |
| 9 | unverified rules → no assessment/selector | yes |
| 10 | unavailable rules → no recommendation | yes |
| 11 | fallback exists | static equivalent always in HTML; kill switch emits no script |
| 12 | no-JS fallback accessible | disabled fieldset + notice in markup; browser-verified with JS off (§4) |
| 13 | customer-requested but rejected → not rendered | yes |
| 14 | selected category = delivered category | reconciliation entries |
| 15 | NO_EXPERIENCE renders nothing | no spec, no node, no runtime |
| 16 | rejected cannot render | a node injected into the model makes reconciliation fail |
| 17 | accessibility, responsive, performance | markup/runtime structure, CSS contract, derived bytes, over-budget → DELIVERY_UNAVAILABLE |
| 18 | no fabricated data | the formula AST rejects literals; every rendered number traces to provenance; the evaluator has a single source |

## 4. Browser results (measured, Chromium 152 + WebKit sweep, generated Next.js host)

Each experience is operated **by keyboard** against expectations taken from the core: the owner's worked example, or the answers of the first rule. It is then checked with JavaScript disabled, at 320 CSS px, and after client-side navigation from `/`.

| Check | Calculator `/value-estimate` | Assessment `/find-your-level` | Selector `/choose-a-programme` | Comparison `/compare` |
|---|---|---|---|---|
| enhanced | ✔ | ✔ | ✔ | n/a (static) |
| empty submit → summary, per-field errors, focus on first problem | ✔ (2 field errors) | ✔ (2) | ✔ (2) | n/a |
| keyboard completion | ✔ expected `10400`, got `10400` | ✔ `foundation` | ✔ `strength-programme` | n/a |
| focus moves to result; result in a polite status region | ✔ / ✔ | ✔ / ✔ | ✔ / ✔ | n/a |
| reset/restart clears and returns focus | ✔ | ✔ | ✔ | n/a |
| JS disabled: fallback text, controls disabled, notice visible | ✔ 818 chars | ✔ 917 chars | ✔ 791 chars | ✔ table 308 chars |
| page overflow at 320 CSS px | 0 px | 0 px | 0 px | **0 px (was 161 px; fixed, see below)** |
| client-side navigation → enhanced | ✔ | ✔ | ✔ | n/a |
| page errors | none | none | none | none |
| comparison structure | — | — | — | region focusable + named, caption, 8 scoped headers |
| axe (AA) | 0 violations | 0 | 0 | 0 |
| Tab walk reached / focusable | 10/10 | 12/12 | 10/10 | 9/9 |
| mobile sweep overflow (S9+, iPhone SE, Pixel 7, iPhone 15, iPad, landscape) | 0 | 0 | 0 | 0 |
| smallest touch target (touch profiles) | 44 px | 44 px | 44 px | 44 px |
| smallest target (desktop, fine pointer) | 29 px (≥ 24) | 29 px | 29 px | 27 px |
| lab LCP / CLS / worst INP (4× CPU, 150 ms RTT) | 728 ms / 0 / 48 ms | 700 / 0 / 64 | 652 / 0 / 48 | 644 / 0 / 56 |
| lint | 0 errors, 0 warnings | 0/0 | 0/0 | 0/0 |
| gates | technical ✔ a11y ✔ responsive ✔ performance ✔ design ✔ content ✘ | same | same | same |

`content ✘` on every fixture is pre-existing and not caused by delivery: the synthetic fixtures configure no conversion endpoint, so "no served page offers a completable conversion action".

The only axe finding is `color-contrast-enhanced` at 6.99:1 on accent buttons. That is an AAA rule, outside the AA target, and it also appears on pages without an experience, so it is a palette finding and not a delivery one.

**Defects the browser found, fixed at source, then re-measured:**

1. **Comparison page overflowed at phone widths** (161 px at 320 CSS px; 72–162 px across the mobile sweep). This is the reference implementation, and it had never been browser-tested with a wide table.
   - Cause: the compact page layout was `main { grid-template-columns: 1fr }`. A bare `1fr` track has an automatic minimum, so the table's min-content width (465 px) widened the whole page, even though the table sits in an `overflow-x: auto` region. The larger ranges already used `minmax(0, 1fr)`.
   - Fix: `src/generation/render/css.ts` now uses `minmax(0, 1fr)` in the compact range too, with a test pin in `tests/generator/generator.test.ts`.
   - Re-measured: page width 320 px, and the table scrolls inside its 288 px labelled region, as documented. The fix applies to every generated site, not just experiences; Verdaleen and Ashvattha were rerun after it (§10).
2. **Runtime lint warnings** (2 × `no-unused-vars` for `catch (e)`) in `/experiences.js`. Fixed with optional catch bindings. The runtime is now 10,479 bytes (2,952 gzip).
3. **Host harness:** dependencies were installed once for four fixtures with different declared dependencies, so the comparison run reported `react-hook-form` and `zod` as missing. The harness now reinstalls when the declared dependencies change.

Measurement corrections made earlier in this task, before the first host run:
- a native radio group is **one** Tab stop;
- a wrapping `<label>` is the target size (WCAG 2.5.8).

## 5. Performance (measured build output, not estimates)

| | Calculator | Assessment | Selector | Comparison |
|---|---|---|---|---|
| client JS added by delivery | `/experiences.js` 10,479 B raw / **2,952 B gzip** (measured as served) | same file | same file | **0** |
| inline JSON data | 767 B | 1,536 B | 1,520 B | 0 |
| loading | `defer`, no dependency | same | same | none |
| measured first-load JS, experience route | 145.5 KB | 145.5 KB | 145.5 KB | 142.9 KB |
| route budget | 200 KB | 250 KB | 250 KB | 200 KB |
| performance gate | pass | pass | pass | pass |
| static fallback without JS | ✔ | ✔ | ✔ | the table is the experience |

The route impact comes from the host's served scripts. The comparison fixture's route loads no runtime, and the three runtime routes each load exactly 2,952 B gzip of `/experiences.js`.

**Documented trade-off.** On the Next layer the runtime loads in the root layout, so it is served on every route of a site that has an experience, including `/` and `/educate` (measured 2,952 B gzip on each). This is deliberate: App Router client navigation inserts pages without re-running page-level scripts, and the browser check confirms enhancement after client navigation. The static layer loads it only on pages that need it.

The plan-time budget check in the spec (`remainingBudgetKb`, `evidenceKind: "derived"`) comes from derived byte counts of the generated files. The measured build figures above are the ones the performance gate used.

## 6. Dry-run results

### 6.1 Every selected experience

| Fixture | Selected (score, band) | Hard gates | Provenance | Delivery | Rendered | Fallback | Browser | A11y | Responsive | Performance |
|---|---|---|---|---|---|---|---|---|---|---|
| SAAS-ROI + verified calculator | roi_calculator 74, focused_primary_interaction | 11/11 pass | formula, adoption-factor, assumptions, example, copy: customer_supplied_verified; weeks-per-year: framework_policy (mathematical) → all verified | DELIVERABLE, interactive | ✔ | static explanation + worked example | ✔ works | ✔ AA | ✔ | ✔ 2,952 B gzip + 767 B data |
| SCHOOL + verified assessment | assessment 70, focused_primary_interaction | 11/11 pass | rule set + copy customer_supplied_verified → verified | DELIVERABLE, interactive | ✔ | static criteria + outcomes | ✔ works | ✔ | ✔ | ✔ + 1,536 B |
| STUDIO + verified selector | guided_selector 67, focused_primary_interaction | 11/11 pass | rule set + copy verified | DELIVERABLE, interactive | ✔ | static criteria + offer links | ✔ works | ✔ | ✔ | ✔ + 1,520 B |
| CATALOGUE (comparison reference) | comparison_tool 66, focused_primary_interaction | 11/11 pass | comparison table customer_supplied_verified → verified | DELIVERABLE, static | ✔ | the table is static | ✔ works (after fix) | ✔ | ✔ | ✔ 0 JS |
| SAAS-ROI + **AI-drafted formula** | roi_calculator 74 | 11/11 pass | formula `ai_draft → unverified` | **DELIVERY_UNAVAILABLE**: "formula unverified: only verified formula may produce a public roi calculator"; blocker DD-105 | ✘ | page's existing static content and conversion section | not rendered, nothing to operate | — | — | 0 JS |
| SAAS-ROI (no values) | roi_calculator 74 | 11/11 pass | none supplied | **DELIVERY_UNAVAILABLE**: "no calculator definition was supplied … a formula is never generated" | ✘ | existing page | — | — | — | 0 JS |
| SCHOOL (no values) | assessment 70 | 11/11 pass | none supplied | **DELIVERY_UNAVAILABLE**: "rules and recommendations are never generated" | ✘ | existing page | — | — | — | 0 JS |
| Verdaleen | NO_EXPERIENCE (medium) | — | — | no spec | ✘ | clear static content; conventional appointment request form | host rerun ✔ | unchanged | unchanged | unchanged |
| CLINIC-BOOKING (no scheduling) | NO_EXPERIENCE (medium) | — | — | no spec | ✘ | appointment request form | — | — | — | — |
| **Ashvattha** (real customer) | NO_EXPERIENCE (high) | only candidate progressive_profile downgraded by static_alternative_adequacy | — | no spec, no runtime, reconciliation consistent | ✘ | conventional enquiry form | host rerun ✔ | unchanged | unchanged | unchanged |

In the unit and dry-run fixtures, which have no owner page list, the experiences are placed on the objective route (`/request-demo`, `/generate-leads`, `/sell-subscriptions`, `/sell-products`). The browser fixtures supply an explicit page list, so the experiences land on `/value-estimate`, `/find-your-level`, `/choose-a-programme` and `/compare` (see gap G1).

### 6.2 Selected and rejected experiences

| Fixture | Selected | Qualified, not selected | Downgraded / rejected (gate) |
|---|---|---|---|
| SAAS-ROI | roi_calculator 74 | assessment 68, progressive_profile 58 | checklist_readiness_tool (static_alternative_adequacy) |
| CATALOGUE | comparison_tool 66 | product_service_finder 68, guided_selector 67, recommendation_engine 63 | guided_journey rejected (objective_linkage) |
| SCHOOL | assessment 70 | checklist_readiness_tool 64, planner 63, guided_journey 52 | quiz, progressive_profile (static_alternative_adequacy); interactive_utility (data_integrity: formulas); interactive_storytelling (data_integrity + static alternative) |
| STUDIO | guided_selector 67 | planner 59 | product_service_finder, recommendation_engine (data_integrity: productSpecifications); interactive_utility, guided_journey, progressive_profile rejected (objective_linkage) |
| Verdaleen | — | — | quiz, product_service_finder, guided_selector, configurator, recommendation_engine, guided_journey, visualizer_3d_ar_webgl (data_integrity, plus others); booking_flow (operational_follow_up, static_alternative_adequacy); interactive_storytelling (accessibility/performance feasibility) |
| Ashvattha | — | — | progressive_profile (static_alternative_adequacy); all 27 categories listed as rejected in `noExperience` |
| CLINIC-BOOKING | — | — | booking_flow (static_alternative_adequacy: no real availability exists) |

On CATALOGUE, comparison_tool (66) was chosen over higher-scoring candidates. That comes from the decision layer's existing combination and data policy and was not changed. Only comparison has verified values on that fixture; the other candidates would be DELIVERY_UNAVAILABLE.

## 7. Responsive decisions

| Profile | Measured by | Result |
|---|---|---|
| narrow phone (320 CSS px) | experience probe + iPhone SE (WebKit, 375) | 0 px overflow on all four |
| larger phone | Galaxy S9+, Pixel 7, iPhone 15 | 0 px overflow |
| tablet | iPad gen 7 (WebKit) | 0 px overflow |
| desktop | 1280 and 1920 | 0 px overflow; targets ≥ 24 px |
| coarse pointer | touch profiles; CSS `@media (pointer: coarse) { .c-option { min-block-size: 44px } }` | smallest touch target 44 px |
| no hover | no experience affordance depends on hover; state is shown by focus, checked and invalid styles | structural; no hover-only content emitted |

**Comparison.** The table keeps its semantics (caption, `th scope`, a focusable `role="region"` named by the caption) and scrolls horizontally inside that region at narrow widths. A CSS-stacked table was rejected because it removes the column relationship for assistive technology. The overflow found in §4 was the page grid, not this decision.

Inputs use a single column, becoming `auto-fit minmax(min(100%, 16rem), 1fr)` from 600 px. Option lists switch to two columns only when there are four or more options.

## 8. Remaining gaps

| # | Gap | Impact | Status |
|---|---|---|---|
| G1 | **No home route when the owner lists no pages**, yet the header links to `/`. Next prefetches that link, the prefetch 404 never settles, and the page never reaches network idle. Found by the first engagement host run. | A generated site without an owner page list has a broken home link and blocks measurement | recorded, not fixed (generator page model, outside this task); host fixtures supply page lists |
| G2 | Browser completion is tested for **one path** per experience (the owner example, or the first rule's answers) | The other rules are covered by unit tests on the shared evaluator source, not in the browser | open |
| G3 | The experience probe **operates** in Chromium only; WebKit covers layout (sweep), not operation | Safari keyboard behaviour of radios is unmeasured | open |
| G4 | **The static layer is not browser-validated**; the host is Next.js | Static markup parity is unit-tested only | open |
| G5 | **No assistive-technology run** (screen reader); the evidence is axe, structure, focus and the live-region role | Announcement quality is unmeasured | open, needs a person |
| G6 | All calculator and rule values are **synthetic FIXTURE data**; no real owner has supplied a formula or rule set | Governance is proven, business usefulness is not | open |
| G7 | On the Next layer the runtime loads site-wide (2,952 B gzip) | Small cost on routes without an experience | accepted trade-off (§5) |
| G8 | Every synthetic fixture fails the content gate (no conversion endpoint) | Pre-existing; not delivery | unchanged |
| G9 | AAA `color-contrast-enhanced` 6.99:1 on accent buttons | Only matters for an AAA target | palette finding, unchanged |
| G10 | `approved_ai_draft` / `external_authoritative_source` need an approval record, but **no approval workflow UI** exists; approval is data supplied in the content file | Approval provenance is only as good as the supplied record | open |

## 9. Calibration and evidence gaps

- **No fixture reaches the game minimums (75 / 85).** Selected scores are 74, 70, 67 and 66. Weights and thresholds were **not** changed. Whether the bands are right is unknown without outcome data.
- **Scores are uncalibrated against real outcomes.** There is no conversion, completion or abandonment data for any delivered experience. `framework:experience` events are emitted for a future analytics connection; no analytics is wired up.
- **The dry run has one real customer** (Ashvattha), and the correct answer for it is NO_EXPERIENCE. No real customer has yet exercised a DELIVERABLE calculator or decision flow.
- **Lab vitals only** (throttled Chromium). There is no field data.

## 10. Regression

| Run | Result | Evidence freshness |
|---|---|---|
| `npm run gate` | PASS: typecheck, 694/694 tests, audit 0 FAIL | rerun after the final change |
| `npm run host:e2e` → Verdaleen | PASS; gates technical ✔ responsive ✔ performance ✔ design ✔, accessibility unknown (3 AAA criteria need a person), content ✘ — unchanged from the earlier report | fresh, 2026-09-14 13:31 UTC |
| `npm run host:e2e` → Ashvattha | PASS; technical ✔ accessibility ✔ responsive ✔ design ✔, performance unknown (INP unavailable), content ✘ — unchanged; engagement NO_EXPERIENCE, no runtime | fresh, 2026-09-14 13:31 UTC |
| `npm run host:e2e` → engagement | PASS; four experiences work | fresh, 2026-09-14 13:31–13:37 UTC |

All host evidence was collected **after** the compact-grid, runtime-lint and harness fixes. No host test was skipped.

## 11. Readiness

**Governed delivery layer: working and browser-verified for comparison, calculator, assessment and guided selector, on synthetic data.** Verified values render and operate by keyboard, with and without JavaScript, from 320 px to desktop, within budget. Unverified, AI-drafted or missing values produce DELIVERY_UNAVAILABLE with a reason and are never substituted. Reconciliation blocks any drift between the decision and the delivered output.

**Framework for customer use: still NOT READY.** Nothing here changes the customer dry-run verdict:
- the content gates fail on every host;
- G1 (missing home route) is a real generator defect;
- no real owner has supplied values (G6);
- scoring is uncalibrated (§9).
