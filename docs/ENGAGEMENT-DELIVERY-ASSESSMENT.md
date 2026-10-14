# ENGAGEMENT DELIVERY ASSESSMENT

Written before any delivery code, per section 2 of the brief.

**Inspected:**
- `docs/ENGAGEMENT-ARCHITECTURE-ASSESSMENT.md` and `docs/ENGAGEMENT-DRY-RUN-REPORT.md`;
- the research (cited below as **ECO §n**);
- `src/engagement/*` and `src/content/engagement-data.ts`;
- the generator: `component-model.ts`, `content-values.ts`, `render/html.ts`, `render/css.ts`, `emit/nextjs.ts`, `generate-website.ts`;
- `form-contracts.ts`;
- the budget, accessibility and SEO evaluators;
- the host layer: `host-project.ts`, `runtime/validate.mjs`, `raw-host-evidence.ts`, `host-evidence.ts`;
- the engagement tests.

Nothing here changes the engagement weights, thresholds or registry values (brief §13).

---

## 1. The current decision → generator seam

```
runPipeline → output.engagement (EngagementOpportunityDecision)
generateWebsite → buildComponentModel(output, content)
    for each SELECTED opportunity (primary + secondary):
      generatorSupport === "static_renderable" && pattern === "comparison"
          → content.comparison supplied ? heading + comparison_table node : refusal
      generatorSupport === "maps_to_existing_section"
          → a page carries booking/enquiry ? "served_by_existing_section" : refusal
      otherwise → refusal "has a contract and no renderer"
manifest.engagement.experiences ← model.engagement
```

**What is right about it:**
- only SELECTED opportunities are considered;
- a refusal is recorded;
- a NO_EXPERIENCE site emits nothing.

**What is missing:**
1. **No contract between the decision and the renderer.** The branch logic lives in `component-model.ts` ("it decides nothing"), keyed on `generatorSupport` strings. A new delivery type would add a branch; nothing types what a delivered experience must contain.
2. **No reconciliation.** Nothing checks, after rendering, that the nodes on the page are exactly the decision's DELIVERABLE experiences. A node for a rejected category would ship unnoticed, because only form semantics are validated.
3. **"Refused" conflates three reasons:** no renderer, data not approved, data missing. The owner cannot tell which input unblocks delivery.
4. **No approval-state value channel.** `engagementData.comparison` carries a `source` string only. Calculators and decision flows have no value schema.

## 2. Why comparison can render

- The job is fully expressible as **static semantic HTML**: a table has no computation, no rule and no state.
- **Status and value are separate and both gated:**
  - the inventory's `comparisonData` must be `verified_available`;
  - the supplied values must name existing offers, with one value per criterion.
  Otherwise the resolver refuses (`content-values.ts`).
- **No new authority:** placement comes from the decision, and the page route from the page model.
- **The no-JS path is the experience itself** — no enhancement exists to fail.

This is the reference: typed values, inventory-gated, offer-bound, static-first, refusal with a reason.

## 3. Why calculator cannot safely render today

- **No value channel for a formula.** A calculator's output is a claim computed from a formula, constants (rates, prices, factors) and assumptions. The inventory can only say `formulas: verified_available`; the formula itself has nowhere to live.
- **Rendering without values means inventing them.** A renderer would have to author the calculation — the fabrication ECO §17 forbids ("a tax calculator cannot invent tax rules or rates").
- **No provenance per item.** One inventory status cannot distinguish "the owner verified the formula but an AI drafted the assumptions".
- **No evaluator that both the page and the framework trust.** If the browser computes with one implementation and a test checks with another, they can disagree silently.
- **No no-JS equivalent is defined.** A `<form>` with no action reloads the page when JavaScript is off, which is broken, not degraded.
- **No browser check that the rendered calculator produces the owner's numbers.**

## 4. Why assessment and selector cannot safely render today

- Their outputs are **recommendations**: "you need X", "this programme fits you". A recommendation from invented rules is a fabricated business fact (ECO §17: recommendations, eligibility rules).
- **No schema for questions, options, rules, outcomes or the rule set's provenance.**
- **No rule for how answers map to outcomes:** order, no-match behaviour, which offer an outcome may name.
- **Two measurement defects the delivery would trip over** (found in `validate.mjs`):
  - the keyboard walk expects every focusable to be a Tab stop, but a native radio group is ONE Tab stop with arrow keys, so every unchecked option would be reported "unreachable";
  - target size measures the bare `<input>` box, ignoring the wrapping `<label>` that activates it (WCAG 2.5.8 counts the activatable region).

## 5. Required data, formula and decision-rule contracts

**Provenance** (every factual or computational item carries it):

`customer_supplied_verified` · `customer_supplied_unverified` · `ai_draft` · `approved_ai_draft` · `framework_policy` · `external_authoritative_source` · `unavailable`

Each item also carries `source` (non-empty) and, where approval applies, `approval: { approvedBy, approvedAt }`.

**Item resolution** → `verified` | `unverified` | `unavailable`:

| Provenance | Resolves to |
|---|---|
| customer_supplied_verified | verified |
| approved_ai_draft | verified **only with** an approval record; otherwise unverified |
| external_authoritative_source | verified **only with** an approval record (an external source still needs the owner's approval to be published as their calculator); otherwise unverified |
| framework_policy | verified **only for mathematical constants** (e.g. 12 months per year); **unverified for any business formula, rate, price, rule or assumption** |
| ai_draft, customer_supplied_unverified | unverified |
| unavailable / absent | unavailable |

**Experience status** — the strictest of:
1. the inventory status for every data kind the category needs (the existing authority — both layers must agree, so no second authority);
2. every required item;
3. structural validity (invalid structure → unavailable, with the defect named).

**Calculator definition:**
- `category` (must equal the selected category);
- `title`, `intro`;
- `inputs[]`: id, label, unit, min, max, step, required, help;
- `constants[]`: id, label, value, unit, kind business|mathematical, provenance;
- `formula`: id, name, description in the owner's words, version, expression, provenance;
- `result`: label, unit, decimals;
- `assumptions[]` with provenance;
- `dataSource`;
- `examples[]` (≥1): inputs → expected, with provenance;
- `limitations[]`;
- `copy` provenance (title, intro, labels — DD-105: AI copy needs approval).

The expression is a closed AST — `{input}`, `{constant}`, `{op: add|subtract|multiply|divide|min|max, args}`, `{op: round, arg, decimals}`:
- **no numeric literals:** every number is a named, provenanced constant, so no rate can hide in an expression;
- no free code; depth-limited.

**Decision-flow definition** (assessment and selector share it):
- `category`, `kind` assessment|selector;
- `title`, `intro`;
- `questions[]`: id, text, help, `options[]` ≥2;
- `outcomes[]`: id, title, explanation, optional `recommendedOffer`, which must be an owner-supplied offer;
- `rules[]` in order: id, outcome, `when[]` of { question, anyOf[] } — AND across conditions, first match wins;
- `noMatch` { title, explanation } — owner copy;
- `ruleSet`: id, version, description, provenance;
- `copy` provenance.

**One evaluator.** A single JavaScript source (`generation/runtime/experience-runtime.ts`) holds `evaluateFormula` and `matchRules`. The browser runs it. The core instantiates the same source to check that owner examples match the formula before publishing. There is no second implementation to drift.

## 6. Approval and provenance requirements

- An `ai_draft` formula, rule, constant, assumption, example or copy **never** reaches a public page. `approved_ai_draft` does only with a named approver and date.
- A `framework_policy` item may never be a business formula, rate or rule.
- **Every DELIVERY_UNAVAILABLE carries:**
  - the item that blocked it;
  - its provenance and source;
  - the status the owner must reach (e.g. "formula `roi-v1` is `ai_draft`: owner approval with approver and date required").
- Publication approvals already raised by the decision ("owner approval before publication") still stand. Delivery does not clear them.

## 7. Accessibility requirements (WCAG 2.2 AA; the existing infrastructure, not a new one)

| Requirement | Calculator | Assessment / selector |
|---|---|---|
| Semantics | `<form>` with `<label for>` per input, units in the label, hint and error ids in `aria-describedby`; result in `role="status"` | one `<fieldset>`/`<legend>` per question, native radios inside `<label>`; result region `role="status"` with a heading |
| Keyboard | Tab through inputs; Enter submits; Reset is a real button | Tab to the group, arrows or Space choose, Enter submits; restart is a real button |
| Focus | first invalid input on error; the result region (`tabindex=-1`) on success; the first input after reset | first unanswered question on error; the result heading on success; the first option after restart |
| Errors | per-field message and `aria-invalid`, plus a summary (`role="alert"`) naming each field | per-question message, plus a summary |
| Reset / restart | clears values, errors and result | clears answers, errors and result |
| Reduced motion | no motion at all | no motion at all |
| No hover | nothing hover-dependent | nothing hover-dependent |
| No JS | controls in a `disabled` fieldset with a visible notice; the formula explanation, inputs, constants, assumptions and worked examples are static content | the questions and every outcome's criteria ("this applies when…") are static content |
| Existing gates | the host audit's keyboard walk, focus, axe, forms, target size, reflow and reduced motion all run on the page; new: a measured completion check | same |

## 8. Responsive requirements (not a shrunken desktop)

| Context | Calculator | Assessment / selector | Comparison |
|---|---|---|---|
| Narrow phone (320) | one input per row, full width, `inputmode="decimal"`; result under the buttons, in reading order | one question at a time down the page; options as full-width labelled rows | table in a labelled, focusable horizontal scroll region |
| Larger phone | same as narrow | same | same |
| Tablet | inputs in an auto-fit grid (min 16rem) | options wrap into two columns when a question has ≥4 | same; the scroll usually disappears |
| Desktop | inputs grid bounded to the reading measure; explanation beside or below by the grid | options in columns, bounded to the measure | full table |
| Coarse pointer | buttons and inputs ≥44px (existing RF-006 block) | each option label ≥44px tall | the region scrolls by touch |
| No hover | no hover state carries information | same | same |

**Comparison: horizontal scroll stays the chosen implementation.**
- **The alternative considered:** a "stacked" table that sets `display: block` on `table/tr/td`. That removes table semantics in Chromium and WebKit unless every element gets ARIA table roles back, and the per-cell labels come from CSS generated content (`content: attr(data-label)`), which some screen readers announce twice or not at all.
- **The other alternative:** duplicating the table as cards. That duplicates indexable content and creates two sources that can diverge.
- **Verdict:** the scroll region keeps real table semantics, has an accessible name, is keyboard-scrollable (`tabindex="0"`), and does not overflow the page. The host run measures that last point. Recorded as a deliberate decision, open to review.

## 9. Performance requirements (measured, never estimated)

- **Zero dependencies added.** One vanilla runtime file (`/experiences.js`), generated from the single evaluator source.
- **Only interactive experiences load it.**
  - Static layer: loaded only on pages that carry one.
  - Next layer: loaded from the layout on every page of a site that has one. Next's client-side navigation would otherwise insert the experience without its script; a MutationObserver enhances experiences that appear after navigation.
  This is a measured trade-off, reported per route.
- **Loading:** `defer`. Experience data sits in a non-executing `<script type="application/json">`.
- **Reported per experience:**
  - runtime bytes and gzip bytes, derived from the generated file;
  - inline data bytes;
  - whether it is lazy;
  - whether the static fallback remains;
  - the result against the planned route budget.
  The host run adds the served, measured first-load JS per route and the delta against routes without the script.
- **Next layer rendering:** the experience markup is rendered through the SAME HTML renderer as the static layer, and inserted with `dangerouslySetInnerHTML` inside a server component. React never hydrates inside it, so the runtime's changes cannot cause hydration mismatches.

## 10. Fallback requirements

| State | What renders |
|---|---|
| DELIVERABLE, enhancement running | the experience plus its static explanation (the explanation stays visible: essential information is never only inside the interaction) |
| DELIVERABLE, JavaScript off or kill switch on | the static explanation, with controls disabled and a notice; with the kill switch (`GenerateOptions.experiences: "disabled"`) no script at all |
| DELIVERY_UNAVAILABLE | no experience markup (no placeholder); the page's existing content and conversion route; the decision's static alternative recorded in the manifest with the reason |

## 11. Proposed delivery architecture

```
EngagementOpportunityDecision (unchanged)
      │   + resolved engagement values (content/engagement-values.ts: schemas, provenance, validation)
      ▼
planExperienceDelivery()   src/engagement/delivery.ts
      → ExperienceDeliverySpec[]  one per SELECTED opportunity, never more
        { specId, decisionRecordId, category, deliveryType: comparison|calculator|decision_flow|existing_section|none,
          status: DELIVERABLE | DELIVERY_UNAVAILABLE, mode: interactive|static_fallback_only,
          reason, dataStatus, provenance[], definition, fallback, route, section,
          accessibility[], responsive{}, performance{}, seo[], analytics[] }
      ▼
buildComponentModel()      renders ONLY DELIVERABLE specs into an `experience` node (typed payload)
      ▼
render/experiences.ts      ONE HTML renderer → static layer directly, Next layer via dangerouslySetInnerHTML
runtime/experience-runtime.ts   ONE evaluator + DOM runtime → /experiences.js
      ▼
reconcileExperienceDelivery()   decision ↔ specs ↔ rendered nodes; generation THROWS on mismatch
      ▼
manifest.engagement.delivery    per spec: status, rendered, route, reason, fallback, performance
      ▼
host/validate.mjs experience probe → raw evidence → host-evidence mapping → existing gates
      (keyboard completion failure → input_independence; missing error handling → forms;
       wrong result, no enhancement or broken fallback → technical.experiencesWork = false)
```

## 12. Risks

| Risk | Mitigation |
|---|---|
| The runtime computes differently from the owner's example | the core checks examples with the same evaluator before publishing; the host enters each example by keyboard and compares |
| Hydration mismatch from runtime DOM changes | experience markup is opaque to React (`dangerouslySetInnerHTML`) |
| XSS through owner strings | the runtime writes only `textContent`; JSON data escapes `<`; the renderer escapes all text |
| Radio groups falsely failing the keyboard walk | the validator treats a radio group as one Tab stop (a measurement correction, tested) |
| A rejected or unselected experience rendering | reconciliation throws; tested by injecting a node |
| Site-wide script cost in the Next layer | measured per route; reported; a kill switch exists |
| An experience exceeding a budget | derived bytes checked against the planned budget, and measured bytes in the host run; over budget → DELIVERY_UNAVAILABLE with fallback |
| Scope creep into more categories | only comparison, calculator and decision_flow delivery types; every other category resolves to `none` → DELIVERY_UNAVAILABLE |

## 13. Files expected to change

**New**
- `src/content/engagement-values.ts` — definition schemas, provenance resolution, structural validation
- `src/engagement/delivery.ts` — `ExperienceDeliverySpec`, `planExperienceDelivery`, `reconcileExperienceDelivery`
- `src/generation/runtime/experience-runtime.ts` — the evaluator plus DOM runtime source, one implementation
- `src/generation/render/experiences.ts` — the calculator and decision-flow HTML renderer
- `tests/engagement/delivery.test.ts`, `tests/fixtures/engagement-delivery-data.ts`
- `tests/host/engagement.host.ts` — host runs for the calculator, assessment and selector
- `docs/ENGAGEMENT-DELIVERY-REPORT.md`

**Modified**
- **Generator:**
  - `src/generation/content-values.ts` — supplied engagement values;
  - `component-model.ts` — spec-driven experience nodes;
  - `render/html.ts`, `emit/nextjs.ts` — experience node, script inclusion, public runtime file;
  - `render/css.ts` — experience styles and option target size;
  - `generate-website.ts` — planning, reconciliation, runtime file, manifest, kill switch.
- **Engagement:** `src/engagement/types.ts`, `experience-patterns.ts` — delivery support states (weights and thresholds untouched).
- **Host and gates:**
  - `src/host/host-project.ts` — experience expectations in the host manifest;
  - `src/host/runtime/validate.mjs` — experience probe; radio-group Tab stop; label-inclusive target size;
  - `src/host/raw-host-evidence.ts`, `src/host/host-evidence.ts` — experience checks mapped into existing gates;
  - `src/evidence/build-evidence.ts`, `src/quality/gate-derivation.ts` — `technical.experiencesWork`.
- **Tests:** `tests/engagement/engagement-decision.test.ts` (refusal semantics become DELIVERY_UNAVAILABLE), `tests/dry-run/engagement-dry-run.test.ts`.
- **Exports and docs:** `src/index.ts`, `README.md`, `docs/GENERATOR-SPEC.md`.
