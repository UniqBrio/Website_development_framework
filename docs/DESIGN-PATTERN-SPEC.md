# DESIGN PATTERN SPEC

Implements specification sections 7, 8, 10, 14, 21 and appendix A.

## Schema
`src/design-system/pattern-registry/types.ts`. Beyond appendix A.1 each pattern
carries what selection needs to be mechanical:

- `tier` - the LOWEST implementation tier that delivers its value, on section 10's
  escalation ladder (`semantic_html_css` to `full_webgl`). A pattern whose tier
  exceeds the expression ceiling is rejected.
- `estimatedRouteJsKb` - for the budget gate.
- `maxFrequencyPerPage` - section 7 gate 6.
- `carriesEssentialContentAlone` - section 10 layer 4 forbids this.
- `hardConstraintViolations` - the eight section 9 conditions.
- `benefits` and `trendSaturation` - the section 8 scoring inputs.

Patterns are METADATA ABOUT SUITABILITY. Nothing in the registry selects anything;
section 21 forbids hardcoded stylistic defaults.

## Six gates, then the score
`src/design-intelligence/engine/select-elements.ts` runs gates in order:
business relevance, content readiness, inclusive equivalence, performance budget,
mobile integrity, frequency/duplication. **Gates run before scoring and a score
can never rescue a gate failure**; a gate failure returns `score: null` so nobody
can argue the number against the gate.

## Failure to outcome
| Gate failed | Outcome | Why |
|---|---|---|
| business relevance | `reject` | more budget or content would not fix unsuitability |
| content readiness | `defer` | evidence is missing; ask the customer |
| inclusive equivalence | `reject` | a section 9 hard constraint |
| performance budget | `replace` | cost, so fall back |
| mobile integrity | `replace` | the value disappears where the visitors are |
| frequency/duplication | `reject` | the slot is taken |

## The three questions
Section 7 requires a concrete answer to: what user task becomes easier, what
communication problem becomes clearer, what business outcome could improve. A
pattern recording zero UX and zero conversion benefit has no hypothesis and is
rejected at gate 1, even when it is best-for the industry and within the ceiling.
`cursor-follower` is registered precisely so it can be rejected with a reason
rather than being absent and unexamined.

## Element count
Section 7 targets 2-5 meaningful elements per page. `selectElementSet` ranks
survivors by score and defers past the cap, recording the cap as the reason
rather than silently dropping the pattern.

## Two axes, not one (revised after the first dry run)

`expressiveness` (low/medium/high) is how DECORATIVE a pattern is, and is gated by
the visual expression ceiling. `tier` is implementation complexity on section 10's
escalation ladder, and is gated by `technical_complexity_budget`. They are
independent: an inline SVG diagram is low expressiveness at a high tier; a
parallax layer is high expressiveness at the lowest tier.

Applying the expression ceiling to `tier` rejected explanatory diagrams and
product galleries from a low-expression clinical site. Section 10's list is an
escalation PREFERENCE, never a permission ladder.

`benefits.explanation` scores information/explanation value separately from
`benefits.ux`, because an explanatory pattern can score low on task completion and
still be the most valuable element on a high-trust page.

## Suitability unlocks

`poorFor` is no longer absolute. `unlockedBy` carries use-case conditions — a
stated requirement, a stated objective, a derived variable, or verified assets —
and ANY match overrides the exclusion. **The shape has no industry field**, so an
unlock cannot become an industry-specific hack. An unlocked pattern re-enters
every remaining gate and carries `approvalRequired` plus a mandatory fallback.

## Seven gates

business_relevance (reject) · expression_ceiling (replace) · content_readiness
(defer) · inclusive_equivalence (reject) · implementation_complexity (replace) ·
performance_budget (replace) · mobile_integrity (replace) ·
frequency_duplication (reject).

Exceeding a ceiling or a budget yields `replace`, not `reject`: every pattern
declares a `fallback`, and for a ceiling breach that fallback IS the answer.
Rejecting would discard the job the pattern does.

## Capability tags

`capabilities` lets the stack gate a dependency on a SELECTED capability. A
library whose capability no selected pattern provides is omitted and recorded,
which is what stopped `three` entering the stack for a rejected 3D pattern.
