# ENGAGEMENT DRY RUN REPORT

Date: 2026-09-14 · Brief phases 16–17 · Nothing committed.
- Test: `tests/dry-run/engagement-dry-run.test.ts`.
- Digest: run with `ENGAGEMENT_DIGEST_OUT=<path>` to write the full JSON; the assertions run either way.
- Each fixture ran the full pipeline **and** the generator.

**Evidence note.** Every score below comes from the ECO §6 "research-defined starting model" weights and this framework's Tier E registry starting values. The scores rank candidates. **They predict no conversion outcome.**

## Runs

| Fixture | Stated objective(s) | Decision | Confidence |
|---|---|---|---|
| FIXTURE-VERDALEEN-MOBILITY (existing dry-run fixture) | book_appointments, sell_products, build_credibility, educate | **NO_EXPERIENCE** | medium |
| FIXTURE-SAAS-ROI | request_demo | **PRIMARY_EXPERIENCE**: roi_calculator (74) | high |
| FIXTURE-CATALOGUE | sell_products | **PRIMARY_EXPERIENCE**: comparison_tool (66), rendered | high |
| FIXTURE-CLINIC-BOOKING (no scheduling integration) | book_appointments | **NO_EXPERIENCE** | medium |
| FIXTURE-SCHOOL | generate_leads, educate | **PRIMARY_EXPERIENCE**: assessment (70) | high |

All 27 categories were evaluated for every fixture. Candidates are listed below only when they matched a visitor task of that business.

### 1. Verdaleen — NO_EXPERIENCE (correct answer)

**Visitor tasks** (all derived from objectives and requirements; none stated): book_appointment, buy_product, learn_topic, find_suitable_offer, configure_product.

| Candidate | Outcome | Failed hard gates |
|---|---|---|
| booking_flow | downgraded | operational_follow_up (contact details only `provided_unverified`); static_alternative_adequacy (no scheduling integration → the appointment request form IS the booking experience) |
| product_service_finder, guided_selector | downgraded | data_integrity (decisionRules and productSpecifications not supplied); maintenance_ownership (no named owner) |
| configurator | downgraded | data_integrity; accessibility_feasibility (risk 4/5 against the AAA-equivalent target); performance_feasibility (cost 4/5 on a performance-sensitive site); maintenance_ownership; operational_follow_up; static_alternative_adequacy |
| visualizer_3d_ar_webgl | downgraded | data_integrity; accessibility_feasibility (risk 5/5); performance_feasibility (~250KB estimated vs the 150KB route budget); maintenance_ownership; static_alternative_adequacy |
| quiz | downgraded | data_integrity; static_alternative_adequacy (no stated self-checking need) |
| recommendation_engine, guided_journey | downgraded | data_integrity, maintenance_ownership (+ static adequacy for the engine) |
| interactive_storytelling | downgraded | accessibility, performance, maintenance, static adequacy |

- **Rationale:** no candidate passed every hard gate for this business's visitor tasks.
- **Static alternative:** the conventional appointment request form; clear educational content; offers grouped by need.
- **Missing data:** decisionRules, productSpecifications, pricingRanges.
- **Reconsider when** (grouped, each naming what it would re-open):
  - verified decision rules, product specifications and price ranges are supplied;
  - a named data owner exists;
  - a verified contact route exists;
  - a scheduling integration exists;
  - the owner states a visitor task that static content cannot serve.
- **Generator:** no engagement node, no refusal, manifest `experiences: []`.
- **Confidence medium:** the answer would change with owner input, so it is not stated as high.

This is the correct answer for Verdaleen. Its primary objective is booking, it has no verified contact route, and the product decisions an interactive tool would make need data that does not exist. The 3D case — the fixture's deliberate "legitimate 3D inside a prohibited industry" tension — was downgraded on accessibility, performance and data, **not on industry**.

### 2. FIXTURE-SAAS-ROI — PRIMARY_EXPERIENCE: ROI calculator

**Stated tasks:** justify_investment_return, assess_need_or_readiness.
**Inputs:** formulas and decision rules verified; sales-assisted; named maintenance owner; verified email.

| Candidate | Outcome | Score |
|---|---|---|
| **roi_calculator** | selected_primary | 74 (focused primary interaction) |
| assessment | qualified, not selected | 68 |
| progressive_profile | qualified, not selected | 58 |
| checklist_readiness_tool | downgraded — a static checklist is adequate for a small offer range | — |

- **Score explanation:** "Suitability score: 74/100 (focused primary interaction). Strengths: visitorValue 5/5, taskRelevance 4/5, conversionPotential 4/5, qualificationValue 5/5, personalization 4/5, contentReadiness 5/5, dataReadiness 5/5, implementationFeasibility 4/5. Risks: none at 3/5 or above. … it does not predict conversion."
- **Placement:** decision_support_section on the demo page, **after the primary CTA** (high-intent objective).
- **Journey:** result step only; a staged lead capture is considered only from the 75 band.
- **Required data:** formulas. **Fallback:** static value-driver explanation.
- **Approvals:**
  - every formula and assumption;
  - publication;
  - a privacy notice;
  - analytics capability not stated (outcomes cannot yet be observed).
- **Generator:** **refused** — the calculator has a contract and no renderer in this version; its static alternative ships.
- **Budget:** `engagement:roi_calculator` kept (~8KB estimated).

### 3. FIXTURE-CATALOGUE — PRIMARY_EXPERIENCE: comparison, rendered

**Stated tasks:** find_suitable_offer, compare_offers. **Inputs:** 30 products; comparison data, specifications and decision rules verified; named owner.

| Candidate | Outcome | Score |
|---|---|---|
| **comparison_tool** | selected_primary | 66 |
| product_service_finder | qualified, not selected | 68 |
| guided_selector | qualified, not selected | 67 |
| recommendation_engine | qualified, not selected (registry-only) | 63 |
| guided_journey | rejected — serves no stated objective | — |

- **Ranking:** all four qualifying scores sit within the 5-point tie band. Framework tie rule (decision_matrix rule 4): within the band, an implemented contract beats a registry-only one, then lower implementation complexity wins. The comparison is low complexity and statically renderable, so it outranked the finder (68) and selector (67). **The tie rule decided this choice, not the score.**
- **Generator:** **rendered** a semantic table from owner-supplied, verified values:
  - caption, column and row headers with `scope`, a labelled focusable scroll region;
  - placed before the conversion section;
  - no client boundary.
  Values for an offer the owner never supplied, or values whose inventory status is unverified, are refused (tested).

### 4. FIXTURE-CLINIC-BOOKING — NO_EXPERIENCE (the booking example from the brief)

| Candidate | Outcome | Failed gate |
|---|---|---|
| booking_flow | downgraded | static_alternative_adequacy — no real availability exists, so the appointment request form is the right booking experience |

- **Static alternative:** the appointment request form (the existing booking form contract), with clear services, location and what happens next.
- **Reconsider when:** a scheduling integration provides real availability.
- **Same business with `schedulingIntegration: true`:** PRIMARY_EXPERIENCE booking_flow (67), served by the existing booking section. No second form is emitted (tested).

### 5. FIXTURE-SCHOOL — PRIMARY_EXPERIENCE: assessment

**Stated tasks:** assess_need_or_readiness, plan_activity. **Inputs:** decision rules verified; named owner.

| Candidate | Outcome | Score |
|---|---|---|
| **assessment** | selected_primary | 70 |
| checklist_readiness_tool | qualified, not selected | 64 |
| planner | qualified, not selected (registry-only) | 63 |
| guided_journey | qualified, not selected (registry-only) | 52 |
| quiz | downgraded — no stated self-checking need | — |
| progressive_profile | downgraded — leads are not qualified by a sales conversation | — |
| interactive_utility | downgraded — formulas not supplied | — |
| interactive_storytelling | downgraded — process content not renderable; static article adequate | — |

- The same fixture with a customer request for a **standalone game** ("increase time on page… look modern… memorable") produces the same decision.
- The game is rejected with the vanity rationales named, and flagged to the owner.
- A request for the **planner** (which qualifies) is honoured, with the assessment still listed first among the recommendations (tested).

## Findings from implementation and dry run

Reported, not tuned away:

1. **Band calibration.**
   - With the research weights and conservative Tier E registry values, no fixture scored ≥75. The best evidenced case — the stated ROI task with verified formulas, sales-assisted, a named owner — scored 74.
   - Consequence: the post-result journey (75–84), complementary experiences (75+ sequential, 85+ parallel) and gamification (75) did not occur in any dry run. They are implemented and unit-tested at the policy level (`selectComplements`, `meetsMinimum`, `evaluateCombination`).
   - Whether the research thresholds suit its own weights is a calibration question for review. It needs outcome evidence (ECO §21), not adjustment to make examples pass.
2. **Industry leaked in through a derived variable, and was removed.**
   - The first implementation used `product_service_complexity` in static-adequacy rules. The profile infers that variable from the industry: technical industries → medium/high.
   - A six-programme fitness studio was denied a selector only because fitness is not a "technical" industry.
   - Adequacy now reads only offer counts, stated tasks, known prices and the purchase cycle. A test asserts that changing only the industry leaves the recommendation unchanged.
   - Industry still reaches engagement through trust and regulation priors, which legitimately affect risk and the game/compliance gates.
3. **ROI vs cost-estimate ambiguity, fixed.** The first registry let "estimate cost or savings" match the ROI calculator, which then won for a home buyer's affordability question. The task is now split: `justify_investment_return` vs `estimate_cost_or_savings`.
4. **Generator coverage is deliberately partial.**
   - Only the comparison renders.
   - Calculator, assessment and selector are valid decisions the generator refuses with a reason: no formula or decision-rule value channel exists yet.
   - Booking and progressive form map to the existing form contracts.
5. **Measurement boundary.**
   - Estimated KB figures are estimates.
   - No experience was built, served or audited in a browser. The host audit covers the comparison table only as part of generated HTML, and only when a host run includes it — none of the host fixtures does.
   - Analytics capability is unstated in every fixture, so every selected experience carries the "outcomes cannot yet be observed" approval.
