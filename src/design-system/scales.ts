/**
 * ORDERED SCALES — the single home for every ordinal the engine compares on.
 *
 * Found by the P1 cross-system sweep: the expression scale existed in THREE
 * places (the rule evaluator's `SCALES`, the selection engine's
 * `EXPRESSION_ORDER`, and the pipeline's local `EXPRESSION`) and the motion-cap
 * scale in two. Four copies of two orderings is the duplicated-decision-logic
 * class, and it is how a value silently stops being comparable in one place after
 * being extended in another.
 *
 * README rule 9 states the principle for numbers; an ordered scale is the same
 * thing: one home, everyone else cites it.
 */

export const EXPRESSION_ORDER = [
  "low",
  "low_to_medium",
  "medium",
  "medium_to_high",
  "high",
] as const;
export type ExpressionLevel = (typeof EXPRESSION_ORDER)[number];

export const MOTION_CAP_ORDER = [
  "none",
  "minimal",
  "low",
  "low_to_medium",
  "medium",
  "medium_to_high",
  "high",
] as const;
export type MotionCapLevel = (typeof MOTION_CAP_ORDER)[number];

/**
 * Maximum reading measure, STRICTEST (shortest) first. DD-072 caps on it; a cap
 * may only shorten the line. Added after the rule-expansion tests found DD-072's
 * cap silently dropped because "80ch" was on no registered scale.
 */
export const READING_MEASURE_MAX_ORDER = ["45ch", "60ch", "65ch", "70ch", "75ch", "80ch"] as const;

export const TRUST_ORDER = ["low", "medium", "high", "very_high"] as const;
export const ASSET_QUALITY_ORDER = ["none", "low", "medium", "high"] as const;
export const LOW_MED_HIGH_ORDER = ["low", "medium", "high"] as const;
export const COMMERCE_DEPTH_ORDER = ["none", "shallow", "medium", "deep"] as const;

/** Every scale the rule evaluator may compare `gte`/`lte` on. */
export const ALL_SCALES: Record<string, readonly string[]> = {
  lowMedHigh: LOW_MED_HIGH_ORDER,
  trust: TRUST_ORDER,
  assetQuality: ASSET_QUALITY_ORDER,
  commerce: COMMERCE_DEPTH_ORDER,
  motionCap: MOTION_CAP_ORDER,
  expression: EXPRESSION_ORDER,
  readingMeasureMax: READING_MEASURE_MAX_ORDER,
};

/**
 * Which scale each `cap` target is measured on. THE home for the mapping: the
 * evaluator applies caps with it and the rule schema REJECTS a cap whose target
 * or value is not registered here, so a cap can never be silently dropped.
 */
export const CAP_TARGET_SCALE: Record<string, keyof typeof ALL_SCALES> = {
  visualExpression: "expression",
  "interaction.level": "expression",
  "motion.cap": "motionCap",
  "typography.readingMeasureMax": "readingMeasureMax",
};

/**
 * The STRICTEST (lowest-index) value on a scale. Returns the scale's strictest
 * entry when nothing recognisable is supplied, because an unknown ceiling must
 * never widen into a permissive one.
 */
export function strictestOn<T extends string>(
  scale: readonly T[],
  ...values: Array<string | undefined>
): T {
  const indices = values
    .filter((v): v is string => v !== undefined)
    .map((v) => scale.indexOf(v as T))
    .filter((i) => i >= 0);
  const index = indices.length > 0 ? Math.min(...indices) : 0;
  return scale[index] as T;
}

export function indexOn(scale: readonly string[], value: string): number {
  return scale.indexOf(value);
}
