/**
 * Deterministic rule evaluator — specification §3, §28, §29.
 *
 * Properties this file guarantees, each covered by a test:
 *  1. ORDER INDEPENDENCE. Evaluating the same rule set in any order yields the
 *     same result. Achieved by making `cap` monotonic (strictest wins) and
 *     `forbid` permanent, so no effect can be undone by a later rule.
 *  2. NO SILENT LOSS. Two `set` effects on one target with different values are
 *     resolved ONLY by declared precedence (below), and every overridden write is
 *     recorded; a disagreement within the strongest tier is a conflict, reported,
 *     never resolved by evaluation order.
 *  3. EXPLAINABILITY. Every applied rule produces a DecisionRecord carrying the
 *     exact facts that matched it (§30).
 */
import type { Condition, DecisionRecord, Effect, Rule } from "../types/decision.js";
import { ALL_SCALES, CAP_TARGET_SCALE } from "../../design-system/scales.js";

/**
 * Ordered scales. `cap` uses these to decide which value is stricter.
 * Read from design-system/scales.ts — the P1 sweep found four copies of two
 * orderings across the engine, which is how a scale silently stops being
 * comparable in one place after being extended in another.
 */
const SCALES = ALL_SCALES;

/**
 * Which scale a capped target is measured on. Shared with the rule schema, which
 * rejects an unregistered cap at parse time; the runtime check below stays as
 * defence in depth for effects built without the schema.
 */
const TARGET_SCALE = CAP_TARGET_SCALE;

export type Facts = Record<string, unknown>;

export interface EvaluationConflict {
  target: string;
  ruleIds: string[];
  values: unknown[];
}

/**
 * GENERAL RULE PRECEDENCE (customer dry run P1-5).
 *
 * The first customer dry run fixed one industry-vs-personality collision
 * (DD-001/DD-013 on `layout.system`) by moving the personality rule to another
 * target. That is a case fix; media+authoritative (`layout.grid`) and
 * sports+authoritative (`typography.strategy`) still failed the design gate.
 *
 * The general statement (the DD-017 authority, made general): what the BUSINESS
 * IS — its industry, content type, audience, constraints — outranks how it wants
 * to SOUND. The tier is DERIVED from what a rule reads, not hand-assigned per
 * rule, so a new rule cannot forget to declare it:
 *   personality — the rule is conditioned on `personalities`
 *   context     — every other rule
 * Only a single value at the strongest tier resolves a disagreement; two
 * different values in the same tier stay a conflict.
 */
export type PrecedenceTier = "context" | "personality";
/** Strongest first. */
export const PRECEDENCE_ORDER: readonly PrecedenceTier[] = ["context", "personality"];

export function precedenceTier(rule: Pick<Rule, "if" | "unless">): PrecedenceTier {
  return [...rule.if, ...rule.unless].some((c) => c.fact === "personalities") ? "personality" : "context";
}

export interface PrecedenceResolution {
  target: string;
  winner: { ruleIds: string[]; value: unknown; tier: PrecedenceTier };
  overridden: Array<{ ruleId: string; value: unknown; tier: PrecedenceTier }>;
  basis: string;
}

export interface EvaluationResult {
  /** The accumulated design draft. Dot-path keys, flat by design so it diffs cleanly. */
  draft: Record<string, unknown>;
  records: DecisionRecord[];
  appliedRuleIds: string[];
  skippedRuleIds: string[];
  /** Rules blocked by `unless`, with the blocking condition — needed for §30. */
  blocked: Array<{ ruleId: string; by: Condition }>;
  conflicts: EvaluationConflict[];
  /** Disagreements settled by declared precedence, with every overridden write. */
  precedenceResolutions: PrecedenceResolution[];
  forbidden: string[];
  /** Which rule(s) forbade each value — provenance for the selection gate. */
  forbiddenBy: Record<string, string[]>;
  obligations: string[];
}

/** Read a dot path out of nested facts without throwing on a missing branch. */
export function readFact(facts: Facts, path: string): unknown {
  const parts = path.split(".");
  let cursor: unknown = facts;
  for (const part of parts) {
    if (cursor === null || typeof cursor !== "object") return undefined;
    cursor = (cursor as Record<string, unknown>)[part];
  }
  return cursor;
}

export function matchCondition(facts: Facts, condition: Condition): boolean {
  const actual = readFact(facts, condition.fact);
  const expected = condition.value;

  if (condition.op === "exists") {
    return actual !== undefined && actual !== null;
  }
  // Defence in depth: conditionSchema already rejects a missing `value` for
  // every other comparator, but an unvalidated rule reaching here must not
  // match by accident. A comparison with nothing to compare against is false.
  if (expected === undefined) return false;

  switch (condition.op) {
    case "eq":
      return actual === expected;
    case "neq":
      return actual !== expected;
    case "in":
      return Array.isArray(expected) && expected.includes(actual as never);
    case "not_in":
      return Array.isArray(expected) && !expected.includes(actual as never);
    case "contains":
      // The fact is the array; the expected value is the member sought.
      return Array.isArray(actual) && actual.includes(expected as never);
    case "not_contains":
      // A missing array counts as not containing, which is the intended reading
      // of "this business did not state that personality".
      return !Array.isArray(actual) || !actual.includes(expected as never);
    case "gte":
    case "lte": {
      // Ordinal comparison on a known scale, or numeric when both are numbers.
      if (typeof actual === "number" && typeof expected === "number") {
        return condition.op === "gte" ? actual >= expected : actual <= expected;
      }
      const scale = Object.values(SCALES).find(
        (s) => s.includes(String(actual)) && s.includes(String(expected)),
      );
      if (!scale) return false;
      const ai = scale.indexOf(String(actual));
      const ei = scale.indexOf(String(expected));
      return condition.op === "gte" ? ai >= ei : ai <= ei;
    }
    default:
      return false;
  }
}

/** True when every `if` holds. An empty `if` list means the rule always applies. */
function ifMatches(facts: Facts, rule: Rule): boolean {
  return rule.if.every((c) => matchCondition(facts, c));
}

/** The first `unless` condition that holds, if any. */
function blockingCondition(facts: Facts, rule: Rule): Condition | undefined {
  return rule.unless.find((c) => matchCondition(facts, c));
}

/**
 * Apply `cap`: lower a ceiling, never raise it. When the incoming value is not
 * stricter than what is already there, the existing value stands — which is why
 * evaluation order cannot change the outcome.
 */
function applyCap(
  draft: Record<string, unknown>,
  target: string,
  value: unknown,
): { changed: boolean; reason: string } {
  const scaleKey = TARGET_SCALE[target];
  if (!scaleKey) {
    return { changed: false, reason: `no ordered scale registered for cap target "${target}"` };
  }
  const scale = SCALES[scaleKey];
  if (!scale) return { changed: false, reason: `unknown scale "${scaleKey}"` };

  const incoming = scale.indexOf(String(value));
  if (incoming < 0) {
    return { changed: false, reason: `value "${String(value)}" is not on scale ${scaleKey}` };
  }
  const current = draft[target];
  if (current === undefined) {
    draft[target] = value;
    return { changed: true, reason: "first cap" };
  }
  const currentIndex = scale.indexOf(String(current));
  if (currentIndex < 0 || incoming < currentIndex) {
    draft[target] = value;
    return { changed: true, reason: "stricter cap wins" };
  }
  return { changed: false, reason: "existing cap is already stricter or equal" };
}

export interface EvaluateOptions {
  /**
   * Targets allowed to receive `set` from more than one rule with the SAME
   * value. Differing values are always a conflict.
   */
  idempotentSetTargets?: readonly string[];
}

export function evaluateRules(
  facts: Facts,
  rules: readonly Rule[],
  options: EvaluateOptions = {},
): EvaluationResult {
  const draft: Record<string, unknown> = {};
  const records: DecisionRecord[] = [];
  const appliedRuleIds: string[] = [];
  const skippedRuleIds: string[] = [];
  const blocked: Array<{ ruleId: string; by: Condition }> = [];
  const forbidden = new Set<string>();
  /** forbidden value -> the rule ids that forbade it, for the selection gate's reason. */
  const forbiddenBy = new Map<string, string[]>();
  const forbidBy = (value: string, ruleId: string) => {
    forbidden.add(value);
    const list = forbiddenBy.get(value) ?? [];
    if (!list.includes(ruleId)) list.push(ruleId);
    forbiddenBy.set(value, list);
  };
  const obligations = new Set<string>();
  /** target -> rules that `set` it, for conflict detection. */
  const setBy = new Map<string, Array<{ ruleId: string; value: unknown; tier: PrecedenceTier }>>();

  const applyEffects = (rule: Rule, effects: readonly Effect[]) => {
    for (const effect of effects) {
      switch (effect.kind) {
        case "set": {
          const existing = setBy.get(effect.target) ?? [];
          existing.push({ ruleId: rule.id, value: effect.value, tier: precedenceTier(rule) });
          setBy.set(effect.target, existing);
          draft[effect.target] = effect.value;
          break;
        }
        case "append": {
          const current = draft[effect.target];
          const list = Array.isArray(current) ? [...current] : [];
          const additions = Array.isArray(effect.value) ? effect.value : [effect.value];
          for (const addition of additions) {
            // Append is set-like: a section listed by two rules appears once.
            if (!list.includes(addition)) list.push(addition);
          }
          draft[effect.target] = list;
          break;
        }
        case "cap":
          applyCap(draft, effect.target, effect.value);
          break;
        case "forbid":
          forbidBy(String(effect.value), rule.id);
          break;
        case "require":
          obligations.add(String(effect.value));
          break;
      }
    }
  };

  for (const rule of rules) {
    const matched = ifMatches(facts, rule);

    if (!matched) {
      if (rule.otherwise.length > 0) {
        applyEffects(rule, rule.otherwise);
        appliedRuleIds.push(rule.id);
        records.push(buildRecord(rule, facts, "otherwise"));
      } else {
        skippedRuleIds.push(rule.id);
      }
      continue;
    }

    const blocker = blockingCondition(facts, rule);
    if (blocker) {
      blocked.push({ ruleId: rule.id, by: blocker });
      // `unless` fired, so the rule's fallback is what actually governs.
      if (rule.fallback.length > 0) {
        obligations.add(`${rule.id} fallback: ${rule.fallback.join("; ")}`);
      }
      continue;
    }

    applyEffects(rule, rule.then);
    applyEffects(rule, rule.require);
    for (const avoided of rule.avoid) forbidBy(avoided, rule.id);
    appliedRuleIds.push(rule.id);
    records.push(buildRecord(rule, facts, "then"));
  }

  const idempotent = new Set(options.idempotentSetTargets ?? []);
  const conflicts: EvaluationConflict[] = [];
  const precedenceResolutions: PrecedenceResolution[] = [];
  for (const [target, writes] of setBy) {
    if (writes.length < 2) continue;
    const distinct = [...new Set(writes.map((w) => JSON.stringify(w.value)))];
    if (distinct.length === 1 && idempotent.has(target)) continue;
    if (distinct.length === 1) continue; // same value twice is not a disagreement
    const strongest = PRECEDENCE_ORDER.find((tier) => writes.some((w) => w.tier === tier))!;
    const top = writes.filter((w) => w.tier === strongest);
    const topValues = [...new Set(top.map((w) => JSON.stringify(w.value)))];
    if (topValues.length === 1) {
      // Order-independent: the draft holds the strongest tier's value whatever
      // order the rules ran in, and the losing writes are kept on the record.
      draft[target] = top[0]!.value;
      precedenceResolutions.push({
        target,
        winner: { ruleIds: top.map((w) => w.ruleId), value: top[0]!.value, tier: strongest },
        overridden: writes.filter((w) => w.tier !== strongest),
        basis: `${strongest} rules outrank ${PRECEDENCE_ORDER.slice(PRECEDENCE_ORDER.indexOf(strongest) + 1).join(", ")} rules: what the business is decides before how it wants to sound`,
      });
      continue;
    }
    conflicts.push({
      target,
      ruleIds: writes.map((w) => w.ruleId),
      values: writes.map((w) => w.value),
    });
  }

  return {
    draft,
    records,
    appliedRuleIds,
    skippedRuleIds,
    blocked,
    conflicts,
    precedenceResolutions,
    forbidden: [...forbidden].sort(),
    forbiddenBy: Object.fromEntries([...forbiddenBy.entries()].sort(([a], [b]) => a.localeCompare(b))),
    obligations: [...obligations].sort(),
  };
}

function buildRecord(rule: Rule, facts: Facts, branch: "then" | "otherwise"): DecisionRecord {
  // Record only the facts the rule actually read. A record citing every input
  // fact explains nothing (§30).
  const inputFacts: Record<string, unknown> = {};
  for (const condition of [...rule.if, ...rule.unless]) {
    inputFacts[condition.fact] = readFact(facts, condition.fact);
  }
  const effects = branch === "then" ? [...rule.then, ...rule.require] : rule.otherwise;
  const decision =
    effects.length > 0
      ? effects.map((e) => `${e.kind} ${e.target}=${JSON.stringify(e.value)}`).join("; ")
      : `${rule.id} applied with no direct effect`;

  return {
    id: `${rule.id}#${branch}`,
    ruleId: rule.id,
    inputFacts,
    decision,
    rationale: rule.rationale,
    sourceUrls: rule.source_urls,
    confidence: rule.confidence,
    humanApprovalRequired: rule.approval_required,
    fallback: rule.fallback.join("; "),
    rejectedAlternatives: rule.avoid,
  };
}
