# DESIGN INTELLIGENCE SPEC

Implements specification sections 1-3, 4, 5, 6, 18, 23, 29, 30, 31.

## Purpose
A deterministic function from verified business facts to an explainable website
design specification. It is not a template selector and not a style picker.

## Pipeline
`src/pipeline.ts` orchestrates and decides nothing itself:

| Stage | Module | Output |
|---|---|---|
| Input contract | `src/design-intelligence/types/business-input.ts` | validated `BusinessInput` |
| Design context profile | `src/design-intelligence/profile/derive-profile.ts` | 16 normalised variables + provenance |
| Industry baseline | `src/design-intelligence/baseline/industry-baseline.ts` | archetype, expression ceiling, motion cap, required content, prohibitions |
| Decision engine | `src/design-intelligence/engine/evaluator.ts` | draft + `DecisionRecord[]` + conflicts |
| Content validation | `src/content/verification.ts` | what may render, what is hidden, what to request |
| Element selection | `src/design-intelligence/engine/select-elements.ts` | select / select_with_fallback / defer / replace / reject |
| Budget enforcement | `src/performance/budgets.ts` | a CHANGED plan, within budget |
| SEO / stack / responsive | `src/seo/`, `src/stack/`, `src/responsive/` | strategies |
| Quality + refinement | `src/quality/` | score, level, remediations |
| Implementation contract | `src/pipeline.ts` `buildContract` | `ImplementationContract` |

## Determinism boundary (specification 29)
Deterministic code owns rule evaluation, scoring, thresholds, quality gates,
performance budgets, accessibility gates, publication safety, stack selection,
frequency caps and responsive transformation. An LLM may interpret free text,
classify intent, draft copy and PROPOSE candidate patterns; a proposal is scored
by the same gates as a registry pattern. No LLM call sits inside a gate.

## Ordering constraint
Content verification runs BEFORE element selection. A pattern's content-readiness
gate needs to know what may actually render; selecting first and verifying second
is how a layout ends up designed around evidence that does not exist.

## Explainability (specification 30)
Every `DecisionRecord` carries the rule id, ONLY the facts that rule read, the
decision, rationale, source URLs, confidence, approval requirement, fallback and
rejected alternatives. A record citing every input fact explains nothing.

## Provenance of derived variables
Each of the 16 variables records `stated` / `industry_prior` / `inferred` /
`default`. A design resting on defaults is what a human should be asked to
confirm first, so the provenance list is the approval surface.

## Generation separation (specification 23)
Nothing under `src/generation/` may select a pattern. The contract names only
patterns the engine selected; a rejected pattern may not appear in it. Asserted
by `tests/scenarios/pipeline.test.ts`.

## Added after the first dry run

| Stage | Module | Why |
|---|---|---|
| Objective architecture + coverage | `src/design-intelligence/objectives/objective-architecture.ts` | Architecture was derived from INDUSTRY alone, so a stated `sell_products` objective on a clinic produced no commerce architecture and nothing noticed. Contains no industry name; an unserved objective fails loudly into `publicationRequirements` and the section L.6 design gate. |
| Page model | `src/generation/page-spec.ts` | `requiredPages` was read only as `.length`. Every owner-supplied page now survives with route, purpose (verbatim), objective, audience, SEO role, sections, conversion role, responsive and trust requirements. Objectives with no owner page get a labelled derived page. |
| Responsive inventory derivation | `componentsForPages()` | The audit previously ran over a caller-supplied list, so it could not fail honestly. An empty inventory now makes the responsive gate `"unknown"`. |
| Quality gate derivation | `src/quality/gate-derivation.ts` | See QUALITY-SPEC.md. |
| Engagement opportunity decision | `src/engagement/` (runs after content verification and the route budget, before element selection) | Decides whether ANY interactive experience earns its place: 11 hard gates, then the ECO §6 suitability score, per-category minimums (games 75/85), the multiple-experience policy and the owner's preference. Default NO_EXPERIENCE. Records extend `DecisionRecord` in the one `decisionLog`; a selected experience enters the same budget enforcement and contract. See ENGAGEMENT-ARCHITECTURE-ASSESSMENT.md. |

## One authority per field

`imagery.strategy` is derived from measured asset quality by
`content/asset-policy.ts`, and no rule writes it. Three rules previously wrote it
with two different meanings, producing a reported "conflict" that no rule owned
while the pipeline returned a third value from the derivation. Rules now
contribute `require`/`forbid` obligations, and subject matter moved to
`imagery.subject`.

Section names pass through `canonicalSection()`. The baseline, the rules and the
objective table had each grown their own spelling (`location_contact` vs
`location_and_contact`), and a `Set` de-duplicated neither.

Layout decisions have three axes with separate owners. `layout.system` belongs to
the industry rules (DD-001..DD-012). `layout.grid` and `layout.readingRail` belong
to the personality and content-shape rules (DD-017, DD-027). `typography.strategy`
belongs to the industry and personality rules, and `typography.hierarchy` to
DD-017. When DD-017 wrote the system and strategy keys, every editorial business
reported three conflicts no rule owned. A genuine disagreement on one axis, such
as DD-011 vs DD-014 on `typography.strategy`, is still reported, never resolved by
evaluation order.

Numbers that rules restate have one home in their consumer: quality thresholds in
`src/quality/scoring.ts` (DD-108), selection caps in
`src/design-intelligence/engine/select-elements.ts` (DD-120), and cap scales in
`src/design-system/scales.ts`. The rules import them.

## Rule effects reach output through one surface

`output.decisions` is the evaluation draft. The component model, the CSS emitter,
the page model and the selection engine read rule effects from it, and nowhere
else. Generated nodes carry `rule:DD-nnn` in `traceTo`, stylesheet blocks are
labelled with their rule id, and `manifest.rulesCited` collects both, so a
generated element walks back to the rule that shaped it.

