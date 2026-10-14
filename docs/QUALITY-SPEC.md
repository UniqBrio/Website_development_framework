# QUALITY SPEC

Implements specification sections 19, 20 and appendices K and L.

## 25 criteria (K.1)
`src/quality/scoring.ts` carries the table verbatim: weight, production minimum,
world-class minimum, and whether a validator can derive it mechanically.
Accessibility is weight 10 with a production minimum of 8, the strictest pair.

## Score (K.2)
`weighted = sum(score * weight) / sum(weight)`, expressed 0-100 so K.3's
thresholds (75 / 82 / 90) read directly.

The denominator sums the weights of SCORED criteria only. Including an unscored
criterion would silently penalise it as if it scored zero, turning "we did not
measure this" into "this is terrible".

## Unscored is never passing
Some of the 25 are not machine-measurable (brand differentiation, composition,
emotional impact, memorability, content quality). Defaulting them to a passing
number would manufacture a quality claim, the same class of dishonesty as
fabricated proof. So:

- `weightedScore` returns `null` when nothing was scored.
- The classifier returns `cannot_classify` rather than a level.
- A level whose REQUIRED criterion is unscored is refused, with the reason naming
  the unscored criterion.

Recorded as decision F6 in `ARCHITECTURE-ASSESSMENT.md`.

## Levels (K.3)
`failing`, `technically_working`, `production_ready` (>=75, no core below 6),
`professionally_designed` (>=82, a11y >=8, responsive >=7, performance >=7,
nothing below 6), `world_class` (>=90, the seven minimums, nothing below 7).

**A critical gate failure prevents production regardless of total score.** A
perfect 100 with a failing accessibility gate classifies as
`technically_working`, and the explanation says so.

`world_class` additionally requires `human_design_review_approved`, which the
engine cannot grant itself; the explanation states that even when every number
qualifies.

## Gates (L)
Six gate groups: technical, accessibility, responsive, performance, content
integrity, design. `src/accessibility/rules.ts` implements L.2's hard failures
including one the specification does not require: logo contrast in every active
theme, worst colour pair governing, which WCAG explicitly exempts. Kept because
the existing framework already requires it (decision F4 - where the existing
framework is stricter, the existing rule wins).

The accessibility score is CAPPED below its production minimum whenever a hard
failure exists, so the score cannot contradict the gate.

## Refinement loop (section 20)
`src/quality/refinement.ts` maps a weakness to a concrete remediation with a
target subsystem and an instruction: "replace the control failing keyboard
equivalence with an accessible drawer", not "accessibility = 6".

- Failed gates are remediated before mere weaknesses.
- Weaknesses are ranked by weight times gap.
- A weakness with no automatable remedy is ESCALATED, not silently tolerated.
- The loop is bounded, stops when nothing automatable remains, and stops when a
  pass stops improving the score. An unbounded improve-until-perfect loop is how
  an agent spends a budget achieving nothing.

## Tri-state gates (revised after the first dry run)

`GateStatus` values are `true | false | "unknown"`. `false` blocks production.
`"unknown"` does not block but cannot certify: the evidence does not exist yet.
Pre-build, the technical, accessibility and performance gates are genuinely
unknown, and reporting them as `true` would be a fabricated pass while `false`
would assert a failure that has not happened.

`evaluateQuality` returns `cannot_classify` when the technical gate is unknown,
and reports `unknownGates` alongside `failedGates`.

## The pipeline runs this on every invocation

`src/quality/gate-derivation.ts` `assessQuality()` derives the gates and the score
sheet from what is actually known:

- **PRE-BUILD** — content and design gates decided from the decision output;
  responsive from the audit, or `"unknown"` when the component inventory is empty;
  technical / accessibility / performance `"unknown"` with their criteria
  `unscored`.
- **POST-BUILD** — with `BuildEvidence`, `checkHardFailures`,
  `accessibilityScore`, `seoScore` and the section L.1 technical checks run for
  real, and a hard failure sets the gate to `false`.

`runPipeline` publishes `output.quality`, and its blockers and unknown gates flow
into `contract.publicationRequirements`. Previously these evaluators had tests and
no caller, so section 19's "a critical gate failure prevents production" could
never fire.

Not yet wired: `refine()` is reachable but needs a mutation callback that only a
generator can supply, and nothing in this repository produces `BuildEvidence`.
