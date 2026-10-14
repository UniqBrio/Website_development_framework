/**
 * Decision Language — specification §3, plus the two extensions the spec's own
 * rule bodies require (assessment §F2 / conflict C5).
 *
 * §3 defines if/then/unless/prefer/avoid/fallback/rationale/source_urls/
 * confidence/approval_required. Rule bodies in §4 additionally use:
 *   - `otherwise` (DD-114): the branch taken when `if` does not match.
 *   - `require`   (DD-114): obligations attached to a THEN, not alternatives.
 *   - `allow =`   (DD-114/115): normalised here to a `then` effect.
 *   - `+=`        (DD-002): modelled as an explicit `append` effect.
 * The schema below is a strict superset of §3, so every published rule
 * validates without rewriting the author's intent.
 */
import { z } from "zod";
import { ALL_SCALES, CAP_TARGET_SCALE } from "../../design-system/scales.js";

export const ruleDomainSchema = z.enum([
  "layout",
  "typography",
  "interaction",
  "motion",
  "responsive",
  "a11y",
  "performance",
  "seo",
  "content",
  "quality",
  "direction",
  "stack",
]);
export type RuleDomain = z.infer<typeof ruleDomainSchema>;

export const confidenceSchema = z.enum(["high", "medium", "low"]);
export type Confidence = z.infer<typeof confidenceSchema>;

/**
 * A precondition over the DesignContextProfile. Deliberately NOT an arbitrary
 * predicate function: a closed comparator set is what lets the engine explain,
 * serialise and diff a decision. §29 — deterministic code owns rule evaluation.
 */
/**
 * `in` / `not_in` test a SCALAR fact against a list of allowed values.
 * `contains` / `not_contains` test an ARRAY fact for one member — needed for
 * facts like `personalities`, where `in` would compare the whole array against
 * the list and silently never match.
 */
export const comparatorSchema = z.enum([
  "eq",
  "neq",
  "in",
  "not_in",
  "contains",
  "not_contains",
  "gte",
  "lte",
  "exists",
]);
export type Comparator = z.infer<typeof comparatorSchema>;

export const conditionSchema = z
  .object({
    /** Dot path into the evaluation facts, e.g. `variables.trust_requirement`. */
    fact: z.string().min(1),
    op: comparatorSchema,
    value: z.unknown().optional(),
  })
  .superRefine((condition, ctx) => {
    // Every comparator except `exists` needs something to compare against.
    // Without this, omitting `value` makes `eq` match any ABSENT fact
    // (undefined === undefined), so a malformed rule would fire everywhere
    // instead of failing loudly. Presence is asked with `exists`, never `eq`.
    if (condition.op !== "exists" && condition.value === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `comparator "${condition.op}" requires a value; use op "exists" to test presence`,
        path: ["value"],
      });
    }
    if (
      (condition.op === "in" || condition.op === "not_in") &&
      condition.value !== undefined &&
      !Array.isArray(condition.value)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `comparator "${condition.op}" requires an array value`,
        path: ["value"],
      });
    }
  });
export type Condition = z.infer<typeof conditionSchema>;

/**
 * An effect on the design specification. `set` replaces, `append` adds to a
 * list (the spec's `+=`), `cap` lowers a ceiling but never raises it, and
 * `forbid` removes a candidate from consideration permanently.
 *
 * `cap` is one-directional on purpose: two rules may both cap visual
 * expression and the result must be the strictest, never the last one
 * evaluated. Order-independence is what makes the engine deterministic.
 */
export const effectKindSchema = z.enum(["set", "append", "cap", "forbid", "require"]);
export type EffectKind = z.infer<typeof effectKindSchema>;

export const effectSchema = z
  .object({
    kind: effectKindSchema,
    /** Dot path into the decision draft, e.g. `interaction.level`. */
    target: z.string().min(1),
    value: z.unknown(),
  })
  .superRefine((effect, ctx) => {
    // A cap is only meaningful against an ordered scale. An unregistered target
    // or an off-scale value used to be a silent no-op at evaluation time — the
    // rule looked encoded and changed nothing. Reject it where it is written.
    if (effect.kind !== "cap") return;
    const scaleKey = CAP_TARGET_SCALE[effect.target];
    if (!scaleKey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `cap target "${effect.target}" has no registered ordered scale (design-system/scales.ts CAP_TARGET_SCALE)`,
        path: ["target"],
      });
      return;
    }
    if (!(ALL_SCALES[scaleKey] ?? []).includes(String(effect.value))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `cap value "${String(effect.value)}" is not on scale "${scaleKey}"`,
        path: ["value"],
      });
    }
  });
export type Effect = z.infer<typeof effectSchema>;

/**
 * What KIND of thing a rule is. Added in the rule-expansion phase so that a
 * count of rules can never be read as a count of executable rules:
 *   executable — changes a pipeline decision (set / cap / append / forbid)
 *   gate       — can block, replace, defer, or require evidence
 *   scoring    — feeds an explicit scoring input
 *   approval   — produces an explicit approval-required state
 */
export const ruleClassificationSchema = z.enum(["executable", "gate", "scoring", "approval"]);
export type RuleClassification = z.infer<typeof ruleClassificationSchema>;

export const ruleSchema = z.object({
  id: z.string().regex(/^DD-\d{3}$/, "rule id must be DD-nnn"),
  title: z.string().min(1),
  domain: ruleDomainSchema,
  classification: ruleClassificationSchema,
  /**
   * The ONE subsystem that acts on this rule's effects, as a module path (e.g.
   * `generation/render/css.ts`) or `evaluator` for rules whose `set`/`cap`
   * effects are consumed directly from the decision draft. A rule with no
   * consumer would be documentation wearing a rule id, so this is required and a
   * test asserts every named consumer exists.
   */
  consumer: z.string().min(1),
  /** Specification section, e.g. "§4.4", for traceability back to the source. */
  sourceSection: z.string().regex(/^§/, "sourceSection must cite a § section"),
  /** ALL conditions must hold (AND). An empty list means "always applies". */
  if: z.array(conditionSchema).default([]),
  then: z.array(effectSchema).default([]),
  /** ANY condition holding blocks the rule. Evaluated after `if`. */
  unless: z.array(conditionSchema).default([]),
  /** Taken when `if` does not match. The spec's `otherwise` (DD-114). */
  otherwise: z.array(effectSchema).default([]),
  /** Obligations that ride along with `then`, not alternatives to it. */
  require: z.array(effectSchema).default([]),
  prefer: z.array(z.string()).default([]),
  avoid: z.array(z.string()).default([]),
  fallback: z.array(z.string()).default([]),
  rationale: z.string().min(1),
  source_urls: z.array(z.string().url()).default([]),
  confidence: confidenceSchema,
  approval_required: z.boolean().default(false),
});
export type Rule = z.infer<typeof ruleSchema>;

/** §2 Output Contract — DecisionRecord. */
export const decisionRecordSchema = z.object({
  id: z.string().min(1),
  ruleId: z.string().min(1),
  inputFacts: z.record(z.unknown()),
  decision: z.string().min(1),
  rationale: z.string().min(1),
  sourceUrls: z.array(z.string()),
  confidence: confidenceSchema,
  humanApprovalRequired: z.boolean(),
  fallback: z.string(),
  /** Not in §2, added per §6/§30: rejected alternatives must be explainable. */
  rejectedAlternatives: z.array(z.string()).default([]),
});
export type DecisionRecord = z.infer<typeof decisionRecordSchema>;

export function parseRule(value: unknown): Rule {
  return ruleSchema.parse(value);
}
