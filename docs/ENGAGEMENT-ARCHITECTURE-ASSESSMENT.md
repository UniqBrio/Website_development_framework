# ENGAGEMENT ARCHITECTURE ASSESSMENT

Written before any engagement code, per phase 1 of the brief. Sources:
- `docs/research/ENGAGEMENT-CONVERSION-OPPORTUNITY-RESEARCH.md` — referred to below as **ECO §n**.
- The repository as inspected on 2026-09-14: pipeline, input contract, rule engine, element selection, content integrity, budgets, accessibility, SEO, generator, quality, fixtures and host.

**Evidence note, stated once.** The research document defines a scoring model, thresholds and policies. It cites no primary sources for them, and its own §15 describes an evidence hierarchy without applying it to any claim.
- Every weight and threshold implemented from it is therefore **Tier E — framework policy, "research-defined starting model"** (ECO §6), and is labelled that way in code.
- None of it is presented as validated evidence that an experience raises conversion (ECO §24).

---

## 1. Where should Engagement Intelligence live?

**`src/engagement/`: a new decision subsystem, a sibling of `src/content/`, `src/seo/` and `src/performance/`**, orchestrated by `src/pipeline.ts` like every other stage.

It is not a folder of widgets (ECO §20), not a set of DD rules, and not part of the generator.

**Why a subsystem and not DD rules.**
- The DD corpus is bound to `website-design-decision-specification.md`: `rules/index.ts` fixes it at DD-001..DD-120, and `audit_framework.py` fails any encoded id with no matching specification heading.
- Engagement policy comes from a different source document. Writing it as DD-121+ would invent specification headings.
- The engagement gates are closer in kind to `engine/select-elements.ts`, which is gate-and-score code, than to the declarative rule evaluator. They follow that module's discipline without reusing its function.

**Pipeline position.** ECO §20 puts the engine after page purpose and before design decisions and generation. In `runPipeline` the engine runs **after content verification (step 4) and the performance budget (step 6), before element selection (step 7)**:

```
1 profile → 2 baseline → 3 DD rule evaluation → 4 content verification
→ 6 route budget → ★ ENGAGEMENT OPPORTUNITY DECISION → 7 element selection
→ 8 budget enforcement (now including the selected experience) → 9 SEO/stack/pages
→ approvals → quality → contract → generator
```

**One recorded deviation from ECO §20.** DD rule evaluation (step 3) still runs before the engagement engine. Rule evaluation does not depend on engagement. Engagement reads two of its outputs: the `interaction.level` cap and the `forbidden` set. Moving it would change 120 rules' ordering for no decision benefit.

## 2. What existing framework systems should it consume?

| Needed by engagement | Existing source | Used for |
|---|---|---|
| Business facts, objectives, offers, functionality | `BusinessInput` (`websiteObjective`, `servicesProducts`, `requiredFunctionality`, `targetAudience`, `constraints`) | candidate linkage (gate 2), task derivation |
| Normalised context | `DesignContextProfile.variables` (trust_requirement, regulation_risk, purchase_cycle, product_service_complexity, commerce_depth, mobile_share, audience_digital_literacy, technical_complexity_budget, performance_sensitivity, accessibility_requirement) plus their `provenance` | gates 4, 6, 7; scoring; confidence |
| Objective → conversion surface | `OBJECTIVE_ARCHITECTURE[objective].conversionSurface` | funnel stage and post-result action |
| Derived content-shape facts | `deriveFacts()` (offerCount, offersWithDescription, conversionEndpointVerified, primaryTaskHighIntent) | static-adequacy test (gate 11), follow-up (gate 9) |
| What may render / what is verified | `verifyContent()` → `VerificationReport` (the ONE renderability authority) | data integrity (gate 3), content readiness |
| Never-fabricate categories | `content/confidence.ts` `NEVER_FABRICATE`, `CONFIDENCE_POLICY` | gate 3, generator refusals |
| Route budget | `performance/budgets.ts` `budgetForArchetype` | gate 7 |
| Accessibility target and thresholds | `profile.variables.accessibility_requirement`, `thresholdsFor()` | gate 6 |
| DD rule outputs | `evaluation.draft["interaction.level"]`, `evaluation.forbidden` | ceiling and prohibitions |
| Conversion form contracts | `generation/form-contracts.ts` (`booking`, `enquiry`) | booking and progressive-form patterns reuse these contracts; no new form system |

## 3. What existing systems should consume its output?

| Consumer | What it reads | Change |
|---|---|---|
| `DesignDecisionOutput` | `engagement: EngagementOpportunityDecision` | new field |
| `decisionLog` | one `DecisionRecord` per evaluated candidate plus one for the decision | appended — no second log |
| `approvalsRequired` / `publicationRequirements` | the decision's approval items | appended |
| Budget enforcement (`enforceBudget`) | the selected experience as one more `Enhancement` | one budget verdict covers patterns AND experiences |
| `ImplementationContract` | `analyticsEvents`, `fallbackRequirements`, `lazyLoadingRequirements`, `testingRequirements` | appended from the selected experience only |
| Generator | `output.engagement` → manifest entry, refusals, and the one statically renderable pattern (comparison from verified data); booking maps to the existing booking section | consumes; never selects |
| Quality engine | nothing new | a selected experience inherits the existing gates through the budget, the served HTML and the host audit — no second accessibility, performance or SEO system (brief phase 13) |

## 4. Which concepts can be reused?

| Concept | Reused as-is | How |
|---|---|---|
| Gates before score; a score never rescues a gate; gate failure → `score: null` | discipline from `select-elements.ts` | same rule, separate candidate type |
| Failure → outcome mapping (reject / defer / replace) | yes | engagement gate failures map to `reject`, `downgrade` (replace with the static alternative) or `defer` (missing input) |
| Tri-state "unknown is not a pass" | `GateOutcome` semantics | a gate with missing input is `unknown` and cannot certify selection |
| `DecisionRecord` (id, ruleId, inputFacts, decision, rationale, sourceUrls, confidence, humanApprovalRequired, fallback, rejectedAlternatives) | yes | the engagement record EXTENDS it (brief phase 9) rather than replacing it |
| `Confidence` enum (high / medium / low) | yes | instead of the research's numeric `confidence` (ECO §13 permits differing project types) |
| Derivation provenance basis (stated / industry_prior / inferred / default) | yes | every derived visitor task and signal carries a basis; decisions resting on inferred signals lower confidence |
| `AssetStatus` status-vs-value split | yes | formulas, decision rules and comparison data get inventory STATUS fields; values arrive through `suppliedContent` |
| `verifyContent` as the single renderability resolver | yes | new claim bindings, not a parallel checker |
| Form contracts and `validateConversionSemantics` | yes | booking and progressive form ARE contracts; their CTA label authority stays DD-035 |
| Route budgets, `enforceBudget` | yes | — |
| Accessibility target, thresholds, §9 hard-constraint vocabulary | yes | experience patterns declare the same eight §9 flags |
| Approval list, refusals, manifest | yes | — |

## 5. Which concepts would be duplicated — and how each is avoided

| Risk | Why it would duplicate | Decision |
|---|---|---|
| Putting calculators, quizzes and selectors into `PATTERNS` | `selectElementSet` ranks every registry pattern by score and selects survivors. An interaction would be "loaded merely because it exists in the registry" — exactly what the brief forbids — and a second decision path would exist. | **Separate opportunity registry** (`src/engagement/registry.ts`, suitability metadata, no industry names) plus **experience pattern contracts** (`src/engagement/experience-patterns.ts`), reachable only through the engagement decision. `PATTERNS` stays the visual/interaction element catalogue. |
| A third option catalogue (already a gap: `design_library.md` vs `PATTERNS`) | adds one more list | Justified by level: opportunities answer "should a visitor tool exist, and which job"; `PATTERNS` answers "which element renders a section". They share no entries. Recorded as a known catalogue boundary in §11. |
| A second scoring authority | `SCORING_WEIGHTS` (§8 patterns), `CRITERIA` (§19 quality) and `decision_matrix.md` PROFILE A already exist | None measures opportunity suitability: data readiness, qualification value and usage frequency appear in none of them. **Use the ECO §6 weights for opportunity suitability only.** The three existing scores are not combined with it and not reused for it. A test asserts the engagement score is never written into the quality sheet. |
| A second decision-record system | the research's §14 record has more fields than `DecisionRecord` | `EngagementDecisionRecord` = the `DecisionRecord` base plus an `engagement` payload. Its base record goes into the one `decisionLog`. |
| Research `BusinessInput`, `AudienceContext`, `ObjectiveContext`, `TrustRiskContext`, `TechnicalConstraints` (ECO §4) | mostly present already in `BusinessInput` and the profile | NOT re-declared. Only the fields that exist nowhere become a new optional `engagement` block (§6). |
| Feature flags / kill switch (ECO §16) | **no feature-flag system exists in the framework** | Not built. The contract states a kill-switch requirement, and the generated experience must degrade to its static fallback when disabled. |
| A second fabrication list | `NEVER_FABRICATE` exists | extended with formulas, eligibility rules, recommendations, benchmarks, savings claims, compatibility, inventory and availability |

## 6. What new schemas are actually required?

1. **`engagement` input block** (optional, in `business-input.ts`, so Zod stays the one source). Only facts the input cannot express today:
   - `preference`: `framework_decides` | `choose_from_recommendations` | `specific_idea` | `no_experience` (brief phase 10; absent means `framework_decides`)
   - `requestedIdea`: `{ category, rationale }` (the customer's idea — evaluated, never auto-accepted)
   - `visitorTasks`: stated tasks (basis `stated`)
   - `frictionPoints`: stated friction
   - `salesMotion`: `self_serve` | `sales_assisted` | `mixed`
   - `leadFollowUpOwner`, `maintenanceOwner`: who responds; who keeps data current (gates 8, 9)
   - `schedulingIntegration`: whether real availability exists (booking vs a request form)
   - `analytics`: `{ eventTracking, consentManagement, crmAttribution }` (ECO §4.8)
   - `sensitiveDataCategories` (ECO §4.6)
   - `gameCausalPath`: `{ outcome: business | learning | repeated_behavior, description }` (brief phase 6)
2. **Content inventory status fields** (optional, like `contactEmail`): `formulas`, `decisionRules`, `comparisonData`, `productSpecifications`, `pricingRanges`.
3. **Supplied content values** (optional): `engagementData.comparison` — criteria and rows keyed by offer name. Formula and rule VALUES are not accepted yet (§11).
4. **Opportunity category** (registry entry): the brief's phase 4 field list.
5. **Experience pattern contract**: inputs, result policy, static fallback, accessibility / performance / SEO / analytics requirements, reused form contract where applicable.
6. **`EngagementOpportunityDecision`** (brief phase 11) and **`EngagementDecisionRecord`**.

Nothing else. No new evidence kind, no new confidence scale, no new approval mechanism.

## 7. What should remain documentation-only?

- Continuous learning and weight recalibration (ECO §21): there is no outcome data to learn from, and pretending otherwise would manufacture evidence.
- Pattern UX guidance beyond contract fields: streak pressure, leaderboard fairness, spin-to-win caution prose (ECO §11). Encoded only as registry risk values and hard-gate triggers.
- Feature-flag implementation, analytics dashboards and experimentation (ECO §16): contract requirements only.
- Evidence tiers A–D (ECO §15): nothing in this implementation carries tier A–D evidence. Tier E (policy) and inferred basis are the only tiers used, and they are labelled.
- Higher-complexity experience construction (configurator, simulator, demo, AI personalization, 3D/AR/WebGL, games): registry entries only (ECO §22).

## 8. What should become executable rules?

| Policy | Source | Module |
|---|---|---|
| 11 hard gates, gate order, failure outcome | brief phase 3, ECO §5 / §9 | `gates.ts` |
| Static-solution adequacy test | ECO §2.2 | `signals.ts` + gate 11 |
| Suitability score, the ECO §6 weights, normalisation to 0–100 | ECO §6 | `scoring.ts` |
| Score bands 0–44 / 45–59 / 60–74 / 75–84 / 85–100 | ECO §7 | `scoring.ts` |
| Gamification ≥75, standalone game ≥85 + causal path; vanity rationales rejected | ECO §10, brief phase 6 | `gates.ts` + `decide.ts` |
| Multiple-experience policy (distinct jobs, no competing CTAs, no repeated questions, count and budget caps) | ECO §8, brief phase 7 | `combination.ts` |
| Customer preference handling | ECO §18, brief phase 10 | `decide.ts` |
| Placement policy (never hero by default; high intent keeps the direct CTA first) | ECO §19 | `decide.ts` |
| No-fabrication refusal | ECO §17 | verification bindings + generator refusals |
| "No conversion prediction" wording | brief phase 5, ECO §24 | `scoring.ts` explanation + test |

## 9. What should remain AI inference?

- Extracting visitor tasks and friction from free-text briefs into `engagement.visitorTasks` / `frictionPoints`. When supplied this way the basis must be `inferred`, which lowers confidence.
- Classifying a customer's free-text idea into a registry category.
- Drafting explanatory copy around an experience: DD-105 — held until approved.
- Proposing candidate experiences not in the registry: a proposal must enter as a registry category to be evaluated. No LLM call sits inside a gate (DESIGN-INTELLIGENCE-SPEC determinism boundary).

Dimension scores are computed deterministically from structured signals. The engine is deterministic; its inputs may not be.

## 10. What should remain human approval?

- Publication of **any** selected experience (it is a new public behaviour of the business).
- Every formula, decision rule, pricing range, eligibility criterion and recommendation basis (fabrication categories).
- **Games and gamification**, always, even when they qualify.
- A customer-requested idea that the gates reject (the owner sees the reasons, not a silent drop).
- Overriding an owner's `no_experience` preference: the engine may **flag** a conflict (for example, a stated booking requirement), never add an experience.
- Lead capture placed before the result (a hard gate fails it unless an approved reason exists).
- Experiences in regulated domains, and any analytics that needs consent.

## 11. What is the smallest viable implementation?

**In scope (this phase):**
1. The decision engine: signals, 11 hard gates, scoring, bands, game policy, combination policy, preferences, decision and record. Pure functions, no dependency added.
2. The opportunity registry: all 27 brief categories, with suitability metadata and decision logic.
3. **8 experience pattern contracts:** calculator, assessment, guided selector, comparison, booking, result, progressive form, static fallback. Contracts, not visual components.
4. Pipeline integration: the output field, decisionLog, approvals, budget enforcement, contract fields.
5. Content integrity: inventory statuses, fabrication categories, verification bindings.
6. Generator consumption:
   - a manifest entry and refusals for any selected experience it cannot render;
   - **one** statically rendered pattern, comparison, as a semantic table built only from verified supplied comparison data, to prove the path end to end with no JavaScript;
   - booking resolves to the existing booking section.
   No node is emitted for `NO_EXPERIENCE`.
7. The optional ENGAGEMENT & CONVERSION block in `website_workflow/templates/website_new.md`.
8. Tests (brief phase 15 plus ECO §23) and dry runs (Verdaleen plus 3 synthetic fixtures).

**Out of scope, recorded:**
- Interactive JavaScript components for calculator, assessment and selector. Their formulas and rules have no approved value channel yet, and building UI around absent data would be the fabrication path.
- The formula and decision-rule value schema: it needs an owner-approval design (who approves, what source, what version).
- Feature flags; analytics implementation; host audit of an interactive experience; learning loop; every registry-only category.

**Known boundaries this creates (to report, not hide):**
- A qualifying calculator, assessment or selector is a valid decision the generator cannot yet render. It becomes a refusal with the reason, never a placeholder on a public page.
- The comparison table uses a horizontal scroll region at narrow widths, not ECO §12's "stacked" representation. CSS-stacked tables lose table semantics in some engines, and duplicating the table as cards would duplicate indexable content. Recorded as a deviation for review.

---

## Addendum — what implementation changed (recorded after the build, not rewritten into the sections above)

| Assessment said | What was built | Why it changed |
|---|---|---|
| The static-adequacy test reads profile signals | It reads offer counts, stated tasks, known prices and the purchase cycle — **not** `product_service_complexity` | The profile infers complexity from the industry, so using it made industry decide adequacy (docs/ENGAGEMENT-DRY-RUN-REPORT.md, finding 2) |
| One cost-estimation task | `estimate_cost_or_savings` and `justify_investment_return` are separate tasks | The ROI calculator was matching affordability questions (finding 3) |
| Complements "when the band permits" | Sequential complements from 75; parallel independent jobs from 85; each complement ≥60 and must pass every combination check (`selectComplements`) | ECO §7 and §8 read together; Tier E interpretation |
| Numeric confidence (ECO §13) | The existing `Confidence` enum. NO_EXPERIENCE is `medium` whenever owner input could change the answer | Reuse; a decision resting on missing data is not "high" |
| The DD `interaction.level` cap is respected | Enforced inside hard gate 7: a high-complexity experience under a `low` cap is downgraded | No bypass of an existing rule decision |
| §4: new claim **bindings** in `verifyContent` | `content/engagement-data.ts`, which applies the SAME `confidenceFromStatus` + `CONFIDENCE_POLICY` to the engagement data kinds a candidate needs | A binding emits a section verdict and a customer request for EVERY business: a florist would be asked for "formulas". One policy, applied only where a candidate needs the data. |
| §4: a gate with missing input is tri-state `unknown` | Gates are `pass` / `fail`; a failure caused by a missing input carries `onFail: "defer"` and is never scored or selected | Same effect — unknown never certifies selection — without a third state every consumer would have to handle |
