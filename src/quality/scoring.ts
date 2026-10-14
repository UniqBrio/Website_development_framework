/**
 * Design Quality Evaluation Engine — specification §19, appendix K.
 *
 * 25 criteria, each weighted, with a production minimum and a world-class
 * minimum. Two properties matter more than the arithmetic:
 *
 *  1. A CRITICAL GATE FAILURE PREVENTS PRODUCTION REGARDLESS OF TOTAL SCORE
 *     (§19). The score cannot buy its way past a hard gate.
 *  2. An UNSCORED criterion is never defaulted to a passing number
 *     (assessment §F6). Some of these 25 are not machine-measurable; inventing
 *     a value for them manufactures a quality claim, which is the same class of
 *     dishonesty as fabricated proof. The classifier returns
 *     `cannot_classify` instead.
 */

export interface CriterionDefinition {
  key: string;
  label: string;
  weight: number;
  productionMinimum: number;
  worldClassMinimum: number;
  /** True when a validator can derive this mechanically. */
  machineMeasurable: boolean;
}

/** Appendix K.1, transcribed exactly. */
export const CRITERIA: readonly CriterionDefinition[] = [
  { key: "brand_differentiation", label: "Brand differentiation", weight: 4, productionMinimum: 5, worldClassMinimum: 8, machineMeasurable: false },
  { key: "visual_hierarchy", label: "Visual hierarchy", weight: 6, productionMinimum: 6, worldClassMinimum: 8, machineMeasurable: false },
  { key: "composition", label: "Composition", weight: 4, productionMinimum: 5, worldClassMinimum: 8, machineMeasurable: false },
  { key: "typography", label: "Typography", weight: 5, productionMinimum: 6, worldClassMinimum: 8, machineMeasurable: true },
  { key: "color", label: "Color", weight: 4, productionMinimum: 6, worldClassMinimum: 8, machineMeasurable: true },
  { key: "spacing", label: "Spacing", weight: 4, productionMinimum: 6, worldClassMinimum: 8, machineMeasurable: true },
  { key: "grid_consistency", label: "Grid consistency", weight: 3, productionMinimum: 5, worldClassMinimum: 7, machineMeasurable: true },
  { key: "content_hierarchy", label: "Content hierarchy", weight: 6, productionMinimum: 6, worldClassMinimum: 8, machineMeasurable: true },
  { key: "navigation", label: "Navigation", weight: 6, productionMinimum: 7, worldClassMinimum: 8, machineMeasurable: true },
  { key: "cta_hierarchy", label: "CTA hierarchy", weight: 5, productionMinimum: 6, worldClassMinimum: 8, machineMeasurable: true },
  { key: "interaction_design", label: "Interaction design", weight: 5, productionMinimum: 6, worldClassMinimum: 8, machineMeasurable: true },
  { key: "motion", label: "Motion", weight: 3, productionMinimum: 5, worldClassMinimum: 8, machineMeasurable: true },
  { key: "imagery", label: "Imagery", weight: 4, productionMinimum: 5, worldClassMinimum: 8, machineMeasurable: true },
  { key: "responsive_behavior", label: "Responsive behavior", weight: 7, productionMinimum: 7, worldClassMinimum: 8, machineMeasurable: true },
  { key: "accessibility", label: "Accessibility", weight: 10, productionMinimum: 8, worldClassMinimum: 9, machineMeasurable: true },
  { key: "performance", label: "Performance", weight: 9, productionMinimum: 7, worldClassMinimum: 8, machineMeasurable: true },
  { key: "seo", label: "SEO", weight: 6, productionMinimum: 6, worldClassMinimum: 8, machineMeasurable: true },
  { key: "trust", label: "Trust", weight: 6, productionMinimum: 6, worldClassMinimum: 8, machineMeasurable: true },
  { key: "conversion", label: "Conversion", weight: 6, productionMinimum: 6, worldClassMinimum: 8, machineMeasurable: true },
  { key: "content_quality", label: "Content quality", weight: 6, productionMinimum: 6, worldClassMinimum: 8, machineMeasurable: false },
  { key: "technical_implementation", label: "Technical implementation", weight: 7, productionMinimum: 7, worldClassMinimum: 8, machineMeasurable: true },
  { key: "consistency", label: "Consistency", weight: 5, productionMinimum: 6, worldClassMinimum: 8, machineMeasurable: true },
  { key: "emotional_impact", label: "Emotional impact", weight: 3, productionMinimum: 4, worldClassMinimum: 8, machineMeasurable: false },
  { key: "memorability", label: "Memorability", weight: 3, productionMinimum: 4, worldClassMinimum: 8, machineMeasurable: false },
  { key: "mobile_experience", label: "Mobile experience", weight: 8, productionMinimum: 7, worldClassMinimum: 8, machineMeasurable: true },
];

const CRITERION_BY_KEY = new Map(CRITERIA.map((c) => [c.key, c]));

/** A score of 0-10, or explicitly unscored. Never defaulted (§F6). */
export type CriterionScore = { scored: true; value: number; evidence: string } | { scored: false; reason: string };

export type ScoreSheet = Record<string, CriterionScore>;

export type QualityLevel =
  | "cannot_classify"
  | "failing"
  | "technically_working"
  | "production_ready"
  | "professionally_designed"
  | "world_class";

/**
 * §L gate results, TRI-STATE.
 *
 * `false` blocks production. `"unknown"` does NOT block, but it also cannot
 * certify: it means the evidence does not exist yet. Pre-build, the technical and
 * accessibility gates are genuinely unknown, and reporting them as `true` would
 * be a fabricated pass — the same class of dishonesty as a fabricated
 * testimonial. Reporting them as `false` would be equally wrong, because nothing
 * has failed.
 */
export type GateOutcome = boolean | "unknown";

export interface GateStatus {
  technical: GateOutcome;
  accessibility: GateOutcome;
  responsive: GateOutcome;
  performance: GateOutcome;
  content: GateOutcome;
  design: GateOutcome;
}

/**
 * DD-108 (§4.14) thresholds and minimums. THE home for these numbers: the rule
 * in `rules/quality-rules.ts` imports them, so the rule and the scorer cannot
 * disagree. `world_class` additionally needs a human design review, which no
 * code path can grant — see `evaluateQuality`.
 */
export const QUALITY_THRESHOLDS = {
  production_ready: 75,
  professionally_designed: 82,
  world_class: 90,
} as const;
export const CORE_MINIMUM = 6;
export const WORLD_CLASS_MINIMUM = 7;

export type TargetQualityLevel = "production_ready" | "professionally_designed" | "world_class";

export interface QualityEvaluation {
  weightedScore: number | null;
  level: QualityLevel;
  /**
   * DD-112: the level the owner is aiming for and whether this evaluation meets
   * it. Stated, never inferred; defaults to professionally_designed.
   */
  target: { level: TargetQualityLevel; met: boolean; gap: string | null };
  /** Criteria below their production minimum, with the gap. */
  weaknesses: Array<{ key: string; label: string; value: number; minimum: number; weight: number }>;
  unscored: string[];
  /** Which §L gates failed. Any entry blocks production regardless of score. */
  failedGates: string[];
  /** Gates whose evidence does not exist yet. These prevent certification. */
  unknownGates: string[];
  /** Why this level and not the next one up — §30 explainability. */
  explanation: string;
}

/**
 * §K.2: weighted score = Σ(score × weight) / Σ(weight).
 *
 * The denominator sums the weights of SCORED criteria only. Including an
 * unscored criterion's weight would silently penalise it as if it had scored
 * zero, turning "we did not measure this" into "this is terrible".
 */
export function weightedScore(sheet: ScoreSheet): number | null {
  let numerator = 0;
  let denominator = 0;
  for (const criterion of CRITERIA) {
    const entry = sheet[criterion.key];
    if (!entry || !entry.scored) continue;
    numerator += entry.value * criterion.weight;
    denominator += criterion.weight;
  }
  if (denominator === 0) return null;
  // Scores are 0-10; the spec's formula yields a 0-10 figure, and its
  // thresholds (75, 82, 90) are percentages of the maximum. Express as a
  // percentage so the thresholds read directly.
  return (numerator / denominator) * 10;
}

function scoreOf(sheet: ScoreSheet, key: string): number | null {
  const entry = sheet[key];
  return entry && entry.scored ? entry.value : null;
}

const LEVEL_ORDER: QualityLevel[] = [
  "cannot_classify",
  "failing",
  "technically_working",
  "production_ready",
  "professionally_designed",
  "world_class",
];

/** DD-112: compare the reached level with the stated target. */
function targetFor(level: QualityLevel, target: TargetQualityLevel, explanation: string) {
  const met = LEVEL_ORDER.indexOf(level) >= LEVEL_ORDER.indexOf(target);
  return {
    level: target,
    met,
    gap: met ? null : `target ${target} not reached: at ${level} — ${explanation}`,
  };
}

export function evaluateQuality(
  sheet: ScoreSheet,
  gates: GateStatus,
  targetLevel: TargetQualityLevel = "professionally_designed",
): QualityEvaluation {
  const base = evaluateQualityUntargeted(sheet, gates);
  return { ...base, target: targetFor(base.level, targetLevel, base.explanation) };
}

type UntargetedEvaluation = Omit<QualityEvaluation, "target">;

function evaluateQualityUntargeted(sheet: ScoreSheet, gates: GateStatus): UntargetedEvaluation {
  const score = weightedScore(sheet);
  const unscored = CRITERIA.filter((c) => {
    const entry = sheet[c.key];
    return !entry || !entry.scored;
  }).map((c) => c.key);

  const weaknesses = CRITERIA.flatMap((c) => {
    const value = scoreOf(sheet, c.key);
    if (value === null || value >= c.productionMinimum) return [];
    return [{ key: c.key, label: c.label, value, minimum: c.productionMinimum, weight: c.weight }];
  }).sort((a, b) => b.weight * (b.minimum - b.value) - a.weight * (a.minimum - a.value));

  const failedGates = Object.entries(gates)
    .filter(([, outcome]) => outcome === false)
    .map(([name]) => name);
  const unknownGates = Object.entries(gates)
    .filter(([, outcome]) => outcome === "unknown")
    .map(([name]) => name);

  // A critical gate failure blocks production regardless of total score (§19).
  const hardGatesPass = failedGates.length === 0 && unknownGates.length === 0;

  if (score === null) {
    return {
      weightedScore: null,
      level: "cannot_classify",
      weaknesses,
      unscored,
      failedGates,
      unknownGates,
      explanation: "no criterion was scored, so no classification can be made honestly",
    };
  }

  if (gates.technical === false) {
    return {
      weightedScore: score,
      level: "failing",
      weaknesses,
      unscored,
      failedGates,
      unknownGates,
      explanation: "the technical gate fails (§L.1), so the site is not even technically working",
    };
  }

  // Technical evidence absent: the site cannot be called technically working,
  // and inventing that verdict pre-build is exactly what §F6 forbids.
  if (gates.technical === "unknown") {
    return {
      weightedScore: score,
      level: "cannot_classify",
      weaknesses,
      unscored,
      failedGates,
      unknownGates,
      explanation:
        "the technical gate has no evidence yet (no build, typecheck or route check has run), so no level can be claimed honestly. This is the expected pre-build state.",
    };
  }

  if (!hardGatesPass) {
    return {
      weightedScore: score,
      level: "technically_working",
      weaknesses,
      unscored,
      failedGates,
      unknownGates,
      explanation:
        failedGates.length > 0
          ? `builds and runs, but these hard gates fail: ${failedGates.join(", ")}. §19: a critical gate failure prevents production approval regardless of total score`
          : `builds and runs, but these gates have no evidence yet: ${unknownGates.join(", ")}. An unevidenced gate cannot certify production readiness`,
    };
  }

  // DD-107: a build that passes is `technically_working`, not production — the
  // gates above and the thresholds below are what separate the two.
  const noCoreBelow6 = weaknesses.every((w) => w.value >= CORE_MINIMUM);
  const productionReady = score >= QUALITY_THRESHOLDS.production_ready && noCoreBelow6;
  if (!productionReady) {
    return {
      weightedScore: score,
      level: "technically_working",
      weaknesses,
      unscored,
      failedGates,
      unknownGates,
      explanation:
        score < QUALITY_THRESHOLDS.production_ready
          ? `weighted score ${score.toFixed(1)} is below the production threshold of ${QUALITY_THRESHOLDS.production_ready} (DD-108)`
          : `a core criterion scores below 6: ${weaknesses.map((w) => `${w.key}=${w.value}`).join(", ")}`,
    };
  }

  const a11y = scoreOf(sheet, "accessibility");
  const responsive = scoreOf(sheet, "responsive_behavior");
  const performance = scoreOf(sheet, "performance");
  const mobile = scoreOf(sheet, "mobile_experience");
  const brand = scoreOf(sheet, "brand_differentiation");
  const emotional = scoreOf(sheet, "emotional_impact");
  const memorability = scoreOf(sheet, "memorability");

  // §K.3 professionally_designed. A required criterion that was never scored
  // cannot satisfy its own requirement, so the level is refused, not granted.
  const professionalRequirements: Array<[string, number | null, number]> = [
    ["accessibility", a11y, 8],
    ["responsive_behavior", responsive, 7],
    ["performance", performance, 7],
  ];
  const missingForProfessional = professionalRequirements.filter(([, v]) => v === null);
  const belowForProfessional = professionalRequirements.filter(
    ([, v, min]) => v !== null && v < min,
  );
  const noScoreBelow6 = CRITERIA.every((c) => {
    const v = scoreOf(sheet, c.key);
    return v === null || v >= CORE_MINIMUM;
  });

  if (
    score < QUALITY_THRESHOLDS.professionally_designed ||
    missingForProfessional.length > 0 ||
    belowForProfessional.length > 0 ||
    !noScoreBelow6
  ) {
    return {
      weightedScore: score,
      level: "production_ready",
      weaknesses,
      unscored,
      failedGates,
      unknownGates,
      explanation:
        missingForProfessional.length > 0
          ? `cannot reach professionally_designed: ${missingForProfessional.map(([k]) => k).join(", ")} unscored — an unmeasured criterion is not a passing one`
          : score < QUALITY_THRESHOLDS.professionally_designed
            ? `weighted score ${score.toFixed(1)} is below the professional threshold of ${QUALITY_THRESHOLDS.professionally_designed} (DD-108)`
            : `below the professional minimum on: ${belowForProfessional.map(([k, v]) => `${k}=${v}`).join(", ")}`,
    };
  }

  // §K.3 world_class — including human_design_review_approved, which this
  // engine cannot grant itself. It is surfaced as an unscored requirement.
  const worldClassRequirements: Array<[string, number | null, number]> = [
    ["accessibility", a11y, 9],
    ["responsive_behavior", responsive, 8],
    ["mobile_experience", mobile, 8],
    ["performance", performance, 8],
    ["brand_differentiation", brand, 8],
    ["emotional_impact", emotional, 8],
    ["memorability", memorability, 8],
  ];
  const missingForWorldClass = worldClassRequirements.filter(([, v]) => v === null);
  const belowForWorldClass = worldClassRequirements.filter(([, v, min]) => v !== null && v < min);
  const noScoreBelow7 = CRITERIA.every((c) => {
    const v = scoreOf(sheet, c.key);
    return v === null || v >= WORLD_CLASS_MINIMUM;
  });

  if (
    score < QUALITY_THRESHOLDS.world_class ||
    missingForWorldClass.length > 0 ||
    belowForWorldClass.length > 0 ||
    !noScoreBelow7
  ) {
    return {
      weightedScore: score,
      level: "professionally_designed",
      weaknesses,
      unscored,
      failedGates,
      unknownGates,
      explanation:
        missingForWorldClass.length > 0
          ? `cannot reach world_class: ${missingForWorldClass.map(([k]) => k).join(", ")} unscored, and §K.3 also requires human_design_review_approved which this engine cannot grant itself`
          : score < QUALITY_THRESHOLDS.world_class
            ? `weighted score ${score.toFixed(1)} is below the world-class threshold of ${QUALITY_THRESHOLDS.world_class} (DD-108)`
            : `below the world-class minimum on: ${belowForWorldClass.map(([k, v]) => `${k}=${v}`).join(", ")}`,
    };
  }

  return {
    weightedScore: score,
    level: "world_class",
    weaknesses,
    unscored,
    failedGates,
    unknownGates,
    explanation: `weighted score ${score.toFixed(1)} with every world-class minimum met; §K.3 still requires human_design_review_approved before this label is used publicly`,
  };
}

export function criterionWeight(key: string): number {
  return CRITERION_BY_KEY.get(key)?.weight ?? 0;
}
