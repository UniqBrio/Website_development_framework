/**
 * ENGAGEMENT SUITABILITY SCORE — ECO §6 (weights) and §7 (bands).
 *
 * WHAT THIS NUMBER IS: a prioritisation heuristic among candidates that already
 * passed every hard gate. WHAT IT IS NOT: a prediction that an experience will
 * raise conversion by any amount (brief phase 5, ECO §24). The explanation is
 * always phrased "Suitability score: n/100" and never mentions an uplift; a test
 * asserts the wording.
 *
 * WHY A NEW SCORE rather than an existing one: `SCORING_WEIGHTS` (§8) ranks visual
 * patterns, `CRITERIA` (§19) grades a built site, and decision_matrix.md PROFILE A
 * compares options a human scores. None measures data readiness, qualification
 * value or usage frequency, which is what opportunity suitability turns on. The
 * scores answer different questions and are never combined.
 *
 * EVIDENCE: the weights are the research's "research-defined starting model"
 * (ECO §6) — Tier E, framework policy. The normalisation is this framework's
 * reading of "the maximum conceptual positive score is normalized to a 0–100
 * decision score": (Σ positive·w − Σ risk·w) / (5 · Σ positive w) · 100, clamped.
 */
import type { EngagementSignals } from "./signals.js";
import {
  POSITIVE_DIMENSIONS,
  RISK_DIMENSIONS,
  type DimensionScore,
  type OpportunityCategory,
  type Ordinal,
  type PositiveDimension,
  type RiskDimension,
  type ScoreBand,
  type Scorecard,
} from "./types.js";
import { TASK_STAGE } from "./vocabulary.js";

/** ECO §6, verbatim. Risk weights are stored positive and subtracted. */
export const ENGAGEMENT_WEIGHTS: { positive: Record<PositiveDimension, number>; risk: Record<RiskDimension, number> } = {
  positive: {
    visitorValue: 15,
    taskRelevance: 12,
    conversionPotential: 10,
    qualificationValue: 7,
    personalization: 5,
    differentiation: 4,
    contentReadiness: 8,
    dataReadiness: 8,
    usageFrequency: 4,
    implementationFeasibility: 5,
  },
  risk: {
    performanceCost: 4,
    accessibilityRisk: 5,
    seoRisk: 3,
    trustComplianceRisk: 8,
    maintenanceBurden: 4,
  },
};

const MAX_POSITIVE = 5 * Object.values(ENGAGEMENT_WEIGHTS.positive).reduce((a, b) => a + b, 0);

/** ECO §7 band floors. */
export const SCORE_BANDS: ReadonlyArray<{ min: number; band: ScoreBand; label: string }> = [
  { min: 85, band: "high_confidence_strategic", label: "high-confidence strategic experience" },
  { min: 75, band: "strong_candidate", label: "strong candidate" },
  { min: 60, band: "focused_primary_interaction", label: "focused primary interaction" },
  { min: 45, band: "lightweight_progressive_enhancement", label: "lightweight progressive enhancement" },
  { min: 0, band: "no_experience", label: "no experience" },
];

export function bandFor(score: number): { band: ScoreBand; label: string } {
  const row = SCORE_BANDS.find((b) => score >= b.min) ?? SCORE_BANDS[SCORE_BANDS.length - 1]!;
  return { band: row.band, label: row.label };
}

const clampOrdinal = (n: number): Ordinal => Math.max(0, Math.min(5, Math.round(n))) as Ordinal;

export interface ScoringContext {
  signals: EngagementSignals;
  /** Tasks this category matched, with their basis. */
  matched: EngagementSignals["tasks"];
  /** Fraction of required content categories that render (1 when none required). */
  contentReadiness: number;
  /** Fraction of required data kinds verified (1 when none required). */
  dataReadiness: number;
}

export function scoreCategory(category: OpportunityCategory, ctx: ScoringContext): Scorecard {
  const { signals } = ctx;
  const w = ENGAGEMENT_WEIGHTS;
  const dim = (value: number, weight: number, why: string): DimensionScore => {
    const v = clampOrdinal(value);
    return { value: v, weight, contribution: v * weight, why };
  };

  const statedMatch = ctx.matched.some((t) => t.basis === "stated");
  const inferredOnly = ctx.matched.length > 0 && ctx.matched.every((t) => t.basis === "inferred");
  // Intent fit: how directly the category answers what the visitor came to do.
  // Stated > derived-with-stage-fit > weaker; −1 when a high-intent primary action
  // exists and this experience sits before the conversion stage (distraction risk, ECO §9).
  const baseFit = statedMatch
    ? 5
    : ctx.matched.some((t) => category.funnelStages.includes(TASK_STAGE[t.task]))
      ? 4
      : 3;
  const distraction = signals.primaryTaskHighIntent && !category.funnelStages.includes("conversion") ? 1 : 0;
  const stageFit = baseFit - distraction;
  const feasibility = !category.experiencePattern
    ? 1
    : category.implementationComplexity === "low"
      ? 5
      : category.implementationComplexity === "medium"
        ? signals.technicalBudget === "low" ? 3 : 4
        : signals.technicalBudget === "high" ? 3 : 2;
  const followUpCapped =
    (category.produces === "lead" || category.produces === "booking") && !signals.conversionEndpointVerified;

  const positive: Record<PositiveDimension, DimensionScore> = {
    visitorValue: dim(
      category.visitorValue + (statedMatch ? 1 : 0) - (inferredOnly ? 1 : 0),
      w.positive.visitorValue,
      statedMatch ? "serves a task the owner stated" : inferredOnly ? "serves only inferred tasks" : "serves a task derived from a stated objective or requirement",
    ),
    taskRelevance: dim(
      stageFit,
      w.positive.taskRelevance,
      `${statedMatch ? "stated task" : "derived task"}${distraction ? "; −1: sits before the high-intent primary action" : ""}`,
    ),
    conversionPotential: dim(
      followUpCapped ? Math.min(category.conversionPotential, 2) : category.conversionPotential,
      w.positive.conversionPotential,
      followUpCapped ? "capped: nothing verified can receive its lead" : "registry starting value",
    ),
    qualificationValue: dim(
      category.qualificationValue + (signals.salesMotion === "sales_assisted" && category.qualificationValue >= 3 ? 1 : 0),
      w.positive.qualificationValue,
      signals.salesMotion === "sales_assisted" ? "sales-assisted motion values qualification" : "registry starting value",
    ),
    personalization: dim(category.personalizationValue, w.positive.personalization, "registry starting value"),
    differentiation: dim(category.differentiation, w.positive.differentiation, "registry starting value"),
    contentReadiness: dim(5 * ctx.contentReadiness, w.positive.contentReadiness, `${Math.round(ctx.contentReadiness * 100)}% of required content renders`),
    dataReadiness: dim(5 * ctx.dataReadiness, w.positive.dataReadiness, `${Math.round(ctx.dataReadiness * 100)}% of required data verified`),
    usageFrequency: dim(
      category.usageFrequency + (ctx.matched.some((t) => TASK_STAGE[t.task] === "retention") ? 1 : 0),
      w.positive.usageFrequency,
      "registry starting value, +1 for a repeated (retention) task",
    ),
    implementationFeasibility: dim(
      feasibility,
      w.positive.implementationFeasibility,
      category.experiencePattern ? `implemented contract, ${category.implementationComplexity} complexity, ${signals.technicalBudget} technical budget` : "registry-only: no implemented contract in this framework version",
    ),
  };

  const risk: Record<RiskDimension, DimensionScore> = {
    performanceCost: dim(
      category.performanceCost + (signals.performanceSensitivity === "high" ? 1 : 0),
      w.risk.performanceCost,
      `registry cost${signals.performanceSensitivity === "high" ? ", +1 performance-sensitive" : ""}`,
    ),
    accessibilityRisk: dim(
      category.accessibilityRisk + (signals.accessibilityTarget === "wcag_aaa_or_equivalent" ? 1 : 0),
      w.risk.accessibilityRisk,
      `registry risk${signals.accessibilityTarget === "wcag_aaa_or_equivalent" ? ", +1 AAA-equivalent target" : ""}`,
    ),
    seoRisk: dim(category.seoRisk, w.risk.seoRisk, "registry starting value"),
    trustComplianceRisk: dim(
      category.trustComplianceRisk + (signals.regulationRisk === "high" ? 1 : 0) + (signals.trust === "very_high" ? 1 : 0),
      w.risk.trustComplianceRisk,
      `registry risk, regulation ${signals.regulationRisk}, trust ${signals.trust}`,
    ),
    maintenanceBurden: dim(
      category.maintenanceBurden - (signals.maintenanceOwner ? 1 : 0),
      w.risk.maintenanceBurden,
      signals.maintenanceOwner ? "registry burden, −1 named owner" : "registry burden",
    ),
  };

  const positiveSum = POSITIVE_DIMENSIONS.reduce((n, d) => n + positive[d].contribution, 0);
  const riskSum = RISK_DIMENSIONS.reduce((n, d) => n + risk[d].contribution, 0);
  const score = Math.max(0, Math.min(100, Math.round((100 * (positiveSum - riskSum)) / MAX_POSITIVE)));
  const { band, label } = bandFor(score);

  const strengths = POSITIVE_DIMENSIONS.filter((d) => positive[d].value >= 4).map((d) => `${d} ${positive[d].value}/5`);
  const risks = RISK_DIMENSIONS.filter((d) => risk[d].value >= 3).map((d) => `${d} ${risk[d].value}/5`);
  const explanation =
    `Suitability score: ${score}/100 (${label}). ` +
    `Strengths: ${strengths.join(", ") || "none at 4/5 or above"}. ` +
    `Risks: ${risks.join(", ") || "none at 3/5 or above"}. ` +
    "A prioritisation heuristic under the research-defined starting model (framework policy); it does not predict conversion.";

  return { positive, risk, score, band, explanation };
}
