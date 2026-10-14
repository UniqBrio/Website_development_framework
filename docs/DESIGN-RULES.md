# DESIGN RULES SPEC

Implements specification section 3 (decision language) and section 4 (the 120-rule corpus).

## Rule shape
`src/design-intelligence/types/decision.ts`. A strict SUPERSET of section 3:

| Key | Meaning |
|---|---|
| `if` | ALL conditions must hold (AND). Empty means always applies. |
| `then` | effects applied when `if` matches and no `unless` fires |
| `unless` | ANY condition holding blocks the rule; its `fallback` then governs |
| `otherwise` | effects when `if` does NOT match (the spec's own key, DD-114) |
| `require` | obligations riding with `then`, not alternatives to it |
| `prefer` / `avoid` / `fallback` | ranked guidance; `avoid` also forbids a pattern id |
| `rationale` / `source_urls` / `confidence` / `approval_required` | audit metadata |

Extensions are recorded in `ARCHITECTURE-ASSESSMENT.md` F2: the published rule
bodies use `otherwise`, `require`, `allow =` and `+=`, which section 3's key list
omits. `allow =` normalises to `then`; `+=` becomes an `append` effect.

## Comparators
`eq` `neq` `in` `not_in` `contains` `not_contains` `gte` `lte` `exists`.
`in` tests a SCALAR against a list; `contains` tests an ARRAY fact for a member.
Using `in` on an array fact silently never matches, so the schema separates them.
Every comparator except `exists` requires a value, enforced at parse time,
because omitting it made `eq` match every ABSENT fact.

## Effects and determinism
`set` replaces, `append` adds (de-duplicated), `cap` LOWERS a ceiling and never
raises it, `forbid` is permanent, `require` records an obligation. `cap` being
monotonic and `forbid` being permanent is what makes evaluation ORDER-INDEPENDENT.
Two rules setting one target to DIFFERENT values is a reported conflict, never
resolved by evaluation order.

## Rule metadata
Every rule also declares, and the schema requires:

| Key | Meaning |
|---|---|
| `classification` | `executable` (chooses a decision value) · `gate` (blocks, replaces, defers or requires) · `scoring` (feeds an explicit score or cap) · `approval` (produces an approval state) |
| `consumer` | the ONE module that acts on the rule's effect, or `evaluator` when the draft itself is the effect. A test asserts the module exists and cites the rule id |
| `sourceSection` | the `§4.x` section of the specification the rule sits under. A test verifies it against the specification's headings |

A `cap` must target a scale registered in `CAP_TARGET_SCALE`
(`src/design-system/scales.ts`) with an on-scale value. The schema rejects anything
else when the rule is written, because the evaluator used to drop such a cap
silently.

## Corpus coverage, stated honestly
`ruleCoverage()` in `src/design-intelligence/rules/index.ts` reports three
disjoint buckets that sum to 120, and a test asserts the arithmetic:

| Bucket | Count |
|---|---:|
| Encoded | 103 |
| Intentionally not encoded | 17 |
| Pending | 0 |

"103 encoded" is not "103 executable". By classification: 38 executable, 55 gate,
2 scoring, 8 approval. Of the 68 rules added in the rule-expansion phase, 42 add
observable behaviour, 21 attach their id to enforcement that already existed, and
5 (DD-034, DD-039, DD-041, DD-046, DD-119) are records with nothing yet to act on.
The rule-by-rule table is in `docs/FRAMEWORK-DRY-RUN-REPORT.md` under
"Rule Expansion Report".

Intentionally not encoded: DD-048..DD-052, DD-054..DD-058, DD-060..DD-063,
DD-116..DD-118. Each chooses between implementations or describes a treatment
already governed by an existing authority; `INTENTIONALLY_NOT_ENCODED` names that
authority per rule.

Rule ids and sections were verified against the specification's own headings
rather than inferred from section position.

## Relationship to enforcement
Several rules restate a constraint that code also enforces (a selection gate, the
accessibility checker). That duplication is deliberate and one-directional: the
GATE is the enforcement, the RULE is the audit record. A rule alone could be
bypassed; a gate alone would leave the decision unexplained.
