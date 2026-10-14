/**
 * Design Element Selection Engine — specification §7, §8, §9, §14.
 *
 * Every element is a HYPOTHESIS about user value (§7). Before selection it must
 * answer three questions; if it cannot answer them, it is rejected regardless of
 * how it scores. That ordering is deliberate and is the difference between this
 * and a beauty contest: the gates run BEFORE the score, and a score can never
 * rescue a gate failure.
 *
 * Outcomes (§7): select | select_with_fallback | defer | replace | reject.
 */
import type { DesignContextProfile } from "../types/profile.js";
import type { PatternDefinition, SuitabilityUnlock } from "../../design-system/pattern-registry/types.js";
import { expressivenessIndex, tierIndex } from "../../design-system/pattern-registry/types.js";
import { ALL_SCALES, EXPRESSION_ORDER } from "../../design-system/scales.js";
import { IMPLEMENTED_PATTERNS } from "../../design-system/pattern-registry/registry.js";

/**
 * DD-120 (§4.15) selection caps. THE home for these three numbers: the rule in
 * `rules/component-rules.ts` imports them, and the pipeline falls back to them
 * when no rule sets `selection.*`, so the value cannot exist in two places.
 */
export const SELECTION_CAPS = {
  maxElements: 5,
  minElements: 2,
  /** Signature = the `immersive` category (WebGL, 3D, parallax depth). */
  maxSignatureExperiences: 1,
} as const;

export type SelectionOutcome =
  | "select"
  | "select_with_fallback"
  | "defer"
  | "replace"
  | "reject";

export type GateName =
  /** FD-11: does a generator renderer implement this pattern at all? */
  | "generator_implementation"
  | "business_relevance"
  | "expression_ceiling"
  | "content_readiness"
  | "inclusive_equivalence"
  | "implementation_complexity"
  | "performance_budget"
  | "mobile_integrity"
  | "frequency_duplication";

export interface GateResult {
  gate: GateName;
  passed: boolean;
  reason: string;
}

export interface ElementScore {
  /** §8 positive factors. */
  positive: Record<string, number>;
  /** §8 negative factors. */
  negative: Record<string, number>;
  total: number;
}

export interface SelectionDecision {
  patternId: string;
  outcome: SelectionOutcome;
  gates: GateResult[];
  score: ElementScore | null;
  /** The §7 three questions, answered. Empty answers force a rejection. */
  valueHypothesis: {
    userTaskMadeEasier: string;
    communicationProblemClarified: string;
    businessOutcomeImproved: string;
  };
  fallback: string;
  /** Why this outcome, in one sentence, for the DecisionRecord (§30). */
  explanation: string;
  /** Set when outcome is `replace`. */
  replacementPatternId?: string;
  /**
   * Set when a `poorFor` exclusion was overridden by a use-case unlock. Such a
   * pattern is admitted against its own default suitability, so it always
   * carries approval and the unlock's rationale travels with the decision.
   */
  unlockedBy?: { rationale: string; approvalRequired: true };
}

export interface SelectionContext {
  profile: DesignContextProfile;
  /** Content categories the verification pass says may actually render. */
  availableContent: ReadonlySet<string>;
  /** Asset inventory keys that are verified-available. */
  verifiedAssets: ReadonlySet<string>;
  /** Remaining route JS budget in KB gzipped (§H.1). */
  routeJsBudgetKb: number;
  /** Already-selected patterns, for the frequency gate. */
  alreadySelected: readonly string[];
  /**
   * Patterns forbidden by the rule pass (industry prohibitions, `forbid`, `avoid`).
   * The gate rules whose enforcement is THIS set: DD-026, DD-028, DD-029 (layout
   * eligibility), DD-042, DD-043, DD-044, DD-113, DD-119 (interaction), DD-046
   * (motion purpose), DD-053, DD-059, DD-082 (effect eligibility). One enforcement
   * path — gate 1 — rather than one per rule.
   */
  forbidden: ReadonlySet<string>;
  /** Which rule(s) forbade each id, so the rejection reason can cite them. */
  forbiddenBy?: Readonly<Record<string, readonly string[]>>;
  /** DD-120: how many `immersive` signature experiences a page may carry. */
  maxSignatureExperiences?: number;
  /** Category lookup for already-selected ids, so the signature cap can count. */
  categoryOf?: (patternId: string) => string | undefined;
  /** The expression ceiling after baseline + overrides. Gates EXPRESSIVENESS. */
  visualExpressionCeiling: "low" | "low_to_medium" | "medium" | "medium_to_high" | "high";
  /** Gates IMPLEMENTATION TIER. Separate axis — see types.ts Expressiveness. */
  technicalComplexityBudget: "low" | "medium" | "high";
  /** Stated functionality requirements, for suitability unlocks. */
  statedRequirements: ReadonlySet<string>;
  /** Stated business objectives, for suitability unlocks. */
  statedObjectives: ReadonlySet<string>;
}

/** §8 weights. Negative factors are subtracted, so trade-offs are explicit. */
export const SCORING_WEIGHTS = {
  positive: {
    businessFit: 5,
    contentFit: 4,
    brandFit: 3,
    uxBenefit: 6,
    explanationValue: 5,
    visualBenefit: 3,
    conversionBenefit: 5,
    differentiationValue: 3,
    evidenceStrength: 4,
  },
  negative: {
    performanceCost: 5,
    accessibilityRisk: 6,
    mobileRisk: 5,
    complexityCost: 3,
    seoRisk: 4,
    distractionCost: 3,
    trendSaturation: 2,
    regulatoryRisk: 5,
  },
} as const;

const COST_TO_SCORE: Record<"low" | "medium" | "high", number> = { low: 1, medium: 3, high: 5 };

/**
 * The most DECORATIVE a pattern may be at a given expression ceiling.
 *
 * This replaces the previous `CEILING_MAX_TIER`, which applied the ceiling to
 * §10's implementation-complexity ladder and therefore rejected an inline SVG
 * diagram from a low-expression clinical site. Expressiveness and implementation
 * complexity are independent: a diagram is `low` expressiveness at tier `svg`; a
 * parallax layer is `high` expressiveness at tier `css_transforms_transitions`.
 */
const CEILING_MAX_EXPRESSIVENESS: Record<(typeof EXPRESSION_ORDER)[number], number> = {
  low: expressivenessIndex("low"),
  low_to_medium: expressivenessIndex("medium"),
  medium: expressivenessIndex("medium"),
  medium_to_high: expressivenessIndex("high"),
  high: expressivenessIndex("high"),
};

/**
 * The highest implementation tier a technical complexity budget permits (§10's
 * escalation preference, applied to the budget it actually belongs to).
 */
const BUDGET_MAX_TIER: Record<"low" | "medium" | "high", number> = {
  low: tierIndex("css_transforms_transitions"),
  medium: tierIndex("lottie"),
  high: tierIndex("full_webgl"),
};

/**
 * Does a use-case unlock hold? Unlocks are deliberately use-case only: a
 * requirement, an objective, a derived variable, or verified assets. There is no
 * industry field, so an unlock can never become an industry-specific hack.
 */
function unlockSatisfied(unlock: SuitabilityUnlock, ctx: SelectionContext): boolean {
  if (unlock.requirement !== undefined && !ctx.statedRequirements.has(unlock.requirement)) {
    return false;
  }
  if (unlock.objective !== undefined && !ctx.statedObjectives.has(unlock.objective)) {
    return false;
  }
  if (unlock.requiresVerifiedAssets !== undefined) {
    for (const asset of unlock.requiresVerifiedAssets) {
      if (!ctx.verifiedAssets.has(asset)) return false;
    }
  }
  if (unlock.variableAtLeast !== undefined) {
    const scale = Object.values(SCALES_FOR_UNLOCK).find(
      (s) =>
        s.includes(unlock.variableAtLeast!.value) &&
        s.includes(String(readVariable(ctx, unlock.variableAtLeast!.name))),
    );
    if (!scale) return false;
    const actual = scale.indexOf(String(readVariable(ctx, unlock.variableAtLeast.name)));
    const required = scale.indexOf(unlock.variableAtLeast.value);
    if (actual < required) return false;
  }
  // An unlock with no condition at all would unlock everything.
  return (
    unlock.requirement !== undefined ||
    unlock.objective !== undefined ||
    unlock.requiresVerifiedAssets !== undefined ||
    unlock.variableAtLeast !== undefined
  );
}

const SCALES_FOR_UNLOCK = ALL_SCALES;

function readVariable(ctx: SelectionContext, name: string): unknown {
  return (ctx.profile.variables as unknown as Record<string, unknown>)[name];
}

/** The unlock that fired, if any. */
function firstSatisfiedUnlock(
  pattern: PatternDefinition,
  ctx: SelectionContext,
): SuitabilityUnlock | undefined {
  return pattern.unlockedBy?.find((u) => unlockSatisfied(u, ctx));
}

// ---------------------------------------------------------------- gates

function gateBusinessRelevance(
  pattern: PatternDefinition,
  ctx: SelectionContext,
): GateResult {
  const { profile, forbidden } = ctx;

  if (forbidden.has(pattern.id)) {
    const by = ctx.forbiddenBy?.[pattern.id];
    return {
      gate: "business_relevance",
      passed: false,
      reason: by && by.length > 0
        ? `forbidden for this business by ${by.join(", ")}`
        : `forbidden for this business by the industry baseline`,
    };
  }
  const unlock = firstSatisfiedUnlock(pattern, ctx);
  if (pattern.poorFor.includes(profile.industry) && !unlock) {
    return {
      gate: "business_relevance",
      passed: false,
      reason: `appendix A marks this pattern poor for ${profile.industry}, and no use-case unlock applies`,
    };
  }

  // §7: no answer to the value questions means reject. A pattern whose own
  // metadata records no task value, no explanation value and no conversion value
  // has no hypothesis at all. `explanation` is included because an explanatory
  // pattern can score low on task completion and still be the most valuable
  // element on a high-trust page — omitting it is what made the engine reject a
  // clinical diagram.
  if (
    pattern.benefits.ux === 0 &&
    pattern.benefits.explanation === 0 &&
    pattern.benefits.conversion === 0
  ) {
    return {
      gate: "business_relevance",
      passed: false,
      reason:
        "no user task is made easier, no communication problem is clarified and no business outcome improves — §7 requires a concrete answer to all three value questions",
    };
  }

  return {
    gate: "business_relevance",
    passed: true,
    reason: unlock
      ? `unsuitable by default for ${profile.industry}, UNLOCKED by a stated use case: ${unlock.rationale}`
      : "relevant to industry and objective",
  };
}

/**
 * EXPRESSION CEILING gate — decorative ambition only, never implementation.
 *
 * Failure means "deliver this in a less decorative form", so the outcome is
 * `replace`: every pattern declares a `fallback`, and for a ceiling breach that
 * fallback IS the answer (full-bleed media becomes a bounded image; an editorial
 * grid becomes a vertical narrative). Rejecting instead would discard the job the
 * pattern does, and on an UNLOCKED pattern it would also assert that the value is
 * decorative immediately after an unlock established that it is functional.
 */
function gateExpressionCeiling(pattern: PatternDefinition, ctx: SelectionContext): GateResult {
  const maxExpressiveness = CEILING_MAX_EXPRESSIVENESS[ctx.visualExpressionCeiling];
  if (expressivenessIndex(pattern.expressiveness) <= maxExpressiveness) {
    return {
      gate: "expression_ceiling",
      passed: true,
      reason: `expressiveness "${pattern.expressiveness}" is within the ${ctx.visualExpressionCeiling} ceiling`,
    };
  }
  const unlocked = firstSatisfiedUnlock(pattern, ctx) !== undefined;
  return {
    gate: "expression_ceiling",
    passed: false,
    reason: unlocked
      ? `the job this pattern does is legitimate here, but expressiveness "${pattern.expressiveness}" exceeds the ${ctx.visualExpressionCeiling} ceiling — deliver the same value in its simpler form (${pattern.fallback})`
      : `expressiveness "${pattern.expressiveness}" exceeds the ${ctx.visualExpressionCeiling} ceiling; its value here is decorative rather than functional`,
  };
}

/**
 * IMPLEMENTATION COMPLEXITY gate — §10 applied to the budget it belongs to.
 * Failure means "build it a simpler way", so the outcome is `replace`, never a
 * rejection of the pattern's value.
 */
function gateImplementationComplexity(
  pattern: PatternDefinition,
  ctx: SelectionContext,
): GateResult {
  const maxTier = BUDGET_MAX_TIER[ctx.technicalComplexityBudget];
  if (tierIndex(pattern.tier) > maxTier) {
    return {
      gate: "implementation_complexity",
      passed: false,
      reason: `implementation tier "${pattern.tier}" exceeds the ${ctx.technicalComplexityBudget} technical complexity budget (§10); a lower-complexity implementation must deliver this value instead`,
    };
  }
  return {
    gate: "implementation_complexity",
    passed: true,
    reason: `tier "${pattern.tier}" is within the ${ctx.technicalComplexityBudget} complexity budget`,
  };
}

function gateContentReadiness(pattern: PatternDefinition, ctx: SelectionContext): GateResult {
  const missingContent = pattern.requiredContent.filter((c) => !ctx.availableContent.has(c));
  const missingAssets = pattern.requiredAssets.filter((a) => !ctx.verifiedAssets.has(a));

  if (missingContent.length > 0 || missingAssets.length > 0) {
    return {
      gate: "content_readiness",
      passed: false,
      reason: `missing ${[...missingContent, ...missingAssets].join(", ")} — a pattern must not be filled with content that does not exist (§12)`,
    };
  }
  return { gate: "content_readiness", passed: true, reason: "required content and assets verified" };
}

function gateInclusiveEquivalence(pattern: PatternDefinition): GateResult {
  const v = pattern.hardConstraintViolations;
  const violations = Object.entries(v)
    .filter(([, value]) => value)
    .map(([key]) => key);

  if (violations.length > 0) {
    return {
      gate: "inclusive_equivalence",
      passed: false,
      reason: `violates §9 hard constraints: ${violations.join(", ")}`,
    };
  }
  if (pattern.carriesEssentialContentAlone) {
    return {
      gate: "inclusive_equivalence",
      passed: false,
      reason: "would be the only carrier of essential content, which §10 layer 4 forbids",
    };
  }
  if (pattern.fallback.trim().length === 0) {
    return {
      gate: "inclusive_equivalence",
      passed: false,
      reason: "no fallback declared — §3 makes FALLBACK mandatory",
    };
  }
  return { gate: "inclusive_equivalence", passed: true, reason: "equivalents and fallback exist" };
}

function gatePerformanceBudget(pattern: PatternDefinition, ctx: SelectionContext): GateResult {
  if (pattern.estimatedRouteJsKb > ctx.routeJsBudgetKb) {
    return {
      gate: "performance_budget",
      passed: false,
      reason: `needs ~${pattern.estimatedRouteJsKb}KB route JS but only ${ctx.routeJsBudgetKb}KB of budget remains (§15)`,
    };
  }
  if (pattern.performanceCost === "high" && ctx.profile.variables.performance_sensitivity === "high") {
    return {
      gate: "performance_budget",
      passed: false,
      reason: "high-cost effect on a performance-sensitive site (§15)",
    };
  }
  return {
    gate: "performance_budget",
    passed: true,
    reason: `fits the remaining ${ctx.routeJsBudgetKb}KB budget`,
  };
}

function gateMobileIntegrity(pattern: PatternDefinition, ctx: SelectionContext): GateResult {
  const mobileIsOff = /^off$|^unreachable$/i.test(pattern.mobile.trim());
  // An effect that is simply absent on mobile is acceptable as decoration, but
  // not when mobile is the dominant context and the effect is load-bearing.
  if (mobileIsOff && ctx.profile.variables.mobile_share === "high" && pattern.benefits.ux > 0) {
    return {
      gate: "mobile_integrity",
      passed: false,
      reason: "carries UX value that disappears on mobile, where most visitors are (§11)",
    };
  }
  if (pattern.mobile.trim().length === 0) {
    return {
      gate: "mobile_integrity",
      passed: false,
      reason: "no mobile behaviour declared — §11 requires an explicit transformation",
    };
  }
  return { gate: "mobile_integrity", passed: true, reason: `mobile behaviour: ${pattern.mobile}` };
}

function gateFrequency(pattern: PatternDefinition, ctx: SelectionContext): GateResult {
  const used = ctx.alreadySelected.filter((id) => id === pattern.id).length;
  if (used >= pattern.maxFrequencyPerPage) {
    return {
      gate: "frequency_duplication",
      passed: false,
      reason: `already used ${used}x, at its per-page maximum of ${pattern.maxFrequencyPerPage} (§7 gate 6)`,
    };
  }
  // DD-120: at most ONE signature (immersive) experience per page, whatever the
  // budget says. Trend stacking is the failure this rule exists to prevent.
  const signatureCap = ctx.maxSignatureExperiences ?? SELECTION_CAPS.maxSignatureExperiences;
  if (pattern.category === "immersive") {
    const signaturesAlready = ctx.alreadySelected.filter(
      (id) => id !== pattern.id && ctx.categoryOf?.(id) === "immersive",
    ).length;
    if (signaturesAlready >= signatureCap) {
      return {
        gate: "frequency_duplication",
        passed: false,
        reason: `the page already carries ${signaturesAlready} signature experience(s); DD-120 allows ${signatureCap}`,
      };
    }
  }
  // §7: 2-5 meaningful signature/supporting elements per page. A second
  // signature-weight pattern in the same category is duplication, not richness.
  const sameCategorySignature = ctx.alreadySelected.filter((id) => id !== pattern.id).length;
  if (
    (pattern.category === "immersive" || pattern.category === "motion") &&
    sameCategorySignature > 0 &&
    ctx.alreadySelected.some((id) => id.includes("webgl") || id.includes("parallax"))
  ) {
    return {
      gate: "frequency_duplication",
      passed: false,
      reason: "a competing signature effect is already selected (§L.6 no duplicate signature effects)",
    };
  }
  return { gate: "frequency_duplication", passed: true, reason: "within frequency limits" };
}

// ---------------------------------------------------------------- scoring

export function scorePattern(pattern: PatternDefinition, ctx: SelectionContext): ElementScore {
  const { profile } = ctx;
  const w = SCORING_WEIGHTS;

  const businessFit = pattern.bestFor.includes(profile.industry) ? 5 : 2;
  const contentFit =
    pattern.requiredContent.every((c) => ctx.availableContent.has(c)) &&
    pattern.requiredAssets.every((a) => ctx.verifiedAssets.has(a))
      ? 5
      : 1;
  const brandFit =
    profile.variables.brand_expression_need === "high" && pattern.benefits.visual >= 4
      ? 5
      : profile.variables.brand_expression_need === "low" && pattern.benefits.visual <= 2
        ? 4
        : 3;

  const positive = {
    businessFit: businessFit * w.positive.businessFit,
    contentFit: contentFit * w.positive.contentFit,
    brandFit: brandFit * w.positive.brandFit,
    uxBenefit: pattern.benefits.ux * w.positive.uxBenefit,
    explanationValue: pattern.benefits.explanation * w.positive.explanationValue,
    visualBenefit: pattern.benefits.visual * w.positive.visualBenefit,
    conversionBenefit: pattern.benefits.conversion * w.positive.conversionBenefit,
    differentiationValue: pattern.benefits.differentiation * w.positive.differentiationValue,
    evidenceStrength: pattern.benefits.evidence * w.positive.evidenceStrength,
  };

  const accessibilityRisk = Object.values(pattern.hardConstraintViolations).some(Boolean) ? 5 : 1;
  const mobileRisk = /^off$|^unreachable$/i.test(pattern.mobile.trim()) ? 4 : 1;
  const complexityCost = Math.min(5, Math.ceil((tierIndex(pattern.tier) + 1) / 2));
  // Decoration = high visual value with no task AND no explanation value.
  const distractionCost =
    pattern.benefits.ux === 0 && pattern.benefits.explanation === 0 && pattern.benefits.visual >= 4
      ? 5
      : 1;
  const regulatoryRisk =
    profile.variables.regulation_risk === "high" && pattern.performanceCost !== "low" ? 4 : 1;

  const negative = {
    performanceCost: COST_TO_SCORE[pattern.performanceCost] * w.negative.performanceCost,
    accessibilityRisk: accessibilityRisk * w.negative.accessibilityRisk,
    mobileRisk: mobileRisk * w.negative.mobileRisk,
    complexityCost: complexityCost * w.negative.complexityCost,
    seoRisk: COST_TO_SCORE[pattern.seoRisk] * w.negative.seoRisk,
    distractionCost: distractionCost * w.negative.distractionCost,
    trendSaturation: pattern.trendSaturation * w.negative.trendSaturation,
    regulatoryRisk: regulatoryRisk * w.negative.regulatoryRisk,
  };

  const total =
    Object.values(positive).reduce((a, b) => a + b, 0) -
    Object.values(negative).reduce((a, b) => a + b, 0);

  return { positive, negative, total };
}

// ---------------------------------------------------------------- selection

export const GATE_ORDER: readonly GateName[] = [
  "business_relevance",
  "expression_ceiling",
  "content_readiness",
  "inclusive_equivalence",
  "implementation_complexity",
  "performance_budget",
  "mobile_integrity",
  "frequency_duplication",
  // FD-11 last: a business, accessibility or budget reason explains a rejection better
  // than "nothing renders it". This gate only catches a pattern that would otherwise
  // have been selected — which is exactly the case that used to reach the contract.
  "generator_implementation",
];

/**
 * Which outcome a gate failure produces. Not every failure is a rejection:
 *  - content_readiness fails because evidence is MISSING, which is a `defer`
 *    (ask the customer), not a permanent no.
 *  - performance_budget fails on cost, so `replace` with the fallback.
 *  - inclusive_equivalence and business_relevance are `reject`: those are §9
 *    hard constraints and business unsuitability, neither of which more budget
 *    or more content would fix.
 */
const FAILURE_OUTCOME: Record<GateName, SelectionOutcome> = {
  // Nothing renders it, so selecting it would budget and promise a thing that
  // cannot appear. Not a defer: no amount of customer content changes it.
  generator_implementation: "reject",
  business_relevance: "reject",
  // "deliver this in a simpler form", not "this value is unwanted".
  expression_ceiling: "replace",
  content_readiness: "defer",
  inclusive_equivalence: "reject",
  // "build it a simpler way", not "this value is unwanted".
  implementation_complexity: "replace",
  performance_budget: "replace",
  mobile_integrity: "replace",
  frequency_duplication: "reject",
};

/**
 * FD-11: a pattern the generator cannot render may be scored, but never selected —
 * it would carry a route-JS budget and a declared fallback for something that appears
 * on no page. The one authority is `PATTERN_SECTION_MAP` in the pattern registry.
 */
function gateGeneratorImplementation(pattern: PatternDefinition): GateResult {
  const implemented = IMPLEMENTED_PATTERNS.has(pattern.id);
  return {
    gate: "generator_implementation",
    passed: implemented,
    reason: implemented
      ? "a generator renderer implements this pattern"
      : "no generator renderer implements this pattern: selecting it would budget and promise an element that can appear on no page (FD-11)",
  };
}

export function selectElement(
  pattern: PatternDefinition,
  ctx: SelectionContext,
): SelectionDecision {
  const gates: GateResult[] = [
    gateBusinessRelevance(pattern, ctx),
    gateExpressionCeiling(pattern, ctx),
    gateContentReadiness(pattern, ctx),
    gateInclusiveEquivalence(pattern),
    gateImplementationComplexity(pattern, ctx),
    gatePerformanceBudget(pattern, ctx),
    gateMobileIntegrity(pattern, ctx),
    gateFrequency(pattern, ctx),
    // Last, matching GATE_ORDER: a buildability check, after every design reason.
    gateGeneratorImplementation(pattern),
  ];

  const valueHypothesis = {
    userTaskMadeEasier: pattern.benefits.ux > 0 ? pattern.solvesUserProblem : "",
    communicationProblemClarified:
      pattern.benefits.explanation > 0 &&
      !pattern.solvesCommunicationProblem.toLowerCase().startsWith("none")
        ? pattern.solvesCommunicationProblem
        : "",
    businessOutcomeImproved:
      pattern.benefits.conversion > 0
        ? `improves ${pattern.category} contribution to the primary objective`
        : "",
  };

  const failed = GATE_ORDER.map((name) => gates.find((g) => g.gate === name)).find(
    (g): g is GateResult => g !== undefined && !g.passed,
  );

  if (failed) {
    const outcome = FAILURE_OUTCOME[failed.gate];
    // A use-case unlock that DID apply is recorded even when a later gate refuses the
    // pattern (FD-11 buildability, a budget, a mobile constraint): the unlock is part
    // of why this decision looks as it does, and losing it hid the reasoning.
    const unlockOnFailure = firstSatisfiedUnlock(pattern, ctx);
    const decision: SelectionDecision = {
      patternId: pattern.id,
      outcome,
      gates,
      // No score is computed for a gate failure: publishing a score next to a
      // rejection invites someone to argue the score against the gate.
      score: null,
      valueHypothesis,
      fallback: pattern.fallback,
      explanation: `${outcome} at gate ${failed.gate}: ${failed.reason}`,
    };
    if (outcome === "replace") decision.replacementPatternId = pattern.fallback;
    if (unlockOnFailure && pattern.poorFor.includes(ctx.profile.industry)) {
      decision.unlockedBy = { rationale: unlockOnFailure.rationale, approvalRequired: true };
    }
    return decision;
  }

  const score = scorePattern(pattern, ctx);
  const needsFallback =
    pattern.tier !== "semantic_html_css" || pattern.performanceCost !== "low";
  const unlock = firstSatisfiedUnlock(pattern, ctx);
  const unlockedAgainstDefault = unlock !== undefined && pattern.poorFor.includes(ctx.profile.industry);

  const decision: SelectionDecision = {
    patternId: pattern.id,
    // An unlocked pattern always carries a fallback: it is admitted against its
    // own default suitability, so the simpler path must stay available.
    outcome: needsFallback || unlockedAgainstDefault ? "select_with_fallback" : "select",
    gates,
    score,
    valueHypothesis,
    fallback: pattern.fallback,
    explanation: unlockedAgainstDefault
      ? `selected under a use-case unlock, with a mandatory fallback (${pattern.fallback}) and owner approval`
      : needsFallback
        ? `selected with a mandatory fallback (${pattern.fallback}) because it is implemented above plain HTML/CSS`
        : "selected; base implementation needs no fallback",
  };
  if (unlockedAgainstDefault && unlock) {
    decision.unlockedBy = { rationale: unlock.rationale, approvalRequired: true };
  }
  return decision;
}

/**
 * Select a page's element set. §7 targets 2-5 meaningful signature/supporting
 * elements, so the engine ranks the survivors and stops at the cap rather than
 * taking everything that passed.
 */
export function selectElementSet(
  candidates: readonly PatternDefinition[],
  ctx: SelectionContext,
  options: { maxElements?: number; minElements?: number } = {},
): {
  decisions: SelectionDecision[];
  selectedIds: string[];
  remainingBudgetKb: number;
  /** DD-120: set when fewer than the minimum meaningful elements survived. */
  belowMinimum: string | null;
} {
  const maxElements = options.maxElements ?? SELECTION_CAPS.maxElements;
  const minElements = options.minElements ?? SELECTION_CAPS.minElements;
  const decisions: SelectionDecision[] = [];
  const selectedIds: string[] = [];
  let budget = ctx.routeJsBudgetKb;

  // Evaluate against a live context so the frequency and budget gates see what
  // has already been taken. Candidates are pre-ranked by score so the cap keeps
  // the best, not the first.
  const ranked = [...candidates].sort((a, b) => {
    const sa = scorePattern(a, ctx).total;
    const sb = scorePattern(b, ctx).total;
    return sb - sa;
  });
  const categoryOf = (id: string): string | undefined =>
    candidates.find((c) => c.id === id)?.category;

  for (const candidate of ranked) {
    const liveCtx: SelectionContext = {
      ...ctx,
      routeJsBudgetKb: budget,
      alreadySelected: selectedIds,
      categoryOf,
    };
    const decision = selectElement(candidate, liveCtx);
    decisions.push(decision);

    if (decision.outcome === "select" || decision.outcome === "select_with_fallback") {
      if (selectedIds.length >= maxElements) {
        // Record the cap honestly rather than silently dropping the pattern.
        decisions[decisions.length - 1] = {
          ...decision,
          outcome: "defer",
          score: decision.score,
          explanation: `deferred: the page already carries ${maxElements} meaningful elements (§7 targets 2-5)`,
        };
        continue;
      }
      selectedIds.push(candidate.id);
      budget -= candidate.estimatedRouteJsKb;
    }
  }

  const belowMinimum =
    selectedIds.length < minElements
      ? `only ${selectedIds.length} meaningful element(s) survived the gates; DD-120 targets at least ${minElements} — the page is honest but plain, and the gates (not the cap) decided that`
      : null;

  return { decisions, selectedIds, remainingBudgetKb: budget, belowMinimum };
}
