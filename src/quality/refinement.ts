/**
 * Autonomous refinement loop — specification §20.
 *
 * §20's whole point is the difference between these two outputs:
 *    "Accessibility score = 6."                                  (useless)
 *    "Mobile navigation fails keyboard equivalence → replace with
 *     an accessible menu drawer → re-validate."                   (actionable)
 *
 * So a weakness maps to a concrete REMEDIATION with a target subsystem, and the
 * loop re-evaluates after applying it. The loop is bounded and must terminate:
 * an unbounded improve-until-perfect loop is how an agent spends a budget
 * achieving nothing.
 */
import { evaluateQuality, type GateStatus, type QualityEvaluation, type ScoreSheet } from "./scoring.js";

export type RemediationKind =
  | "replace_interaction_with_accessible_equivalent"
  | "downgrade_enhancement_to_fallback"
  | "introduce_business_appropriate_signature_element"
  | "remove_unsupported_proof"
  | "restructure_mobile_composition"
  | "strengthen_content_hierarchy"
  | "add_seo_artifacts"
  | "tighten_token_consistency"
  | "reduce_cta_competition"
  | "request_human_design_review"
  | "request_missing_evidence";

export interface Remediation {
  kind: RemediationKind;
  /** The criterion this is meant to move. */
  criterion: string;
  /** Which subsystem must change. Named so the caller knows where to act. */
  subsystem: "accessibility" | "performance" | "design-system" | "content" | "responsive" | "seo" | "generation" | "human";
  instruction: string;
  /** False when no automated change can fix it — it needs a person or an asset. */
  automatable: boolean;
}

/**
 * Weakness → remediation. Deliberately a total mapping over the criteria the
 * engine can act on: a weakness with no remediation would be reported and then
 * silently tolerated, which is the failure §20 exists to end.
 */
const REMEDIATION_BY_CRITERION: Record<string, Remediation> = {
  accessibility: {
    kind: "replace_interaction_with_accessible_equivalent",
    criterion: "accessibility",
    subsystem: "accessibility",
    instruction:
      "Identify the control failing keyboard or input equivalence and replace it with an accessible equivalent (e.g. hover-reveal → always-visible detail; custom menu → accessible drawer with focus management). Then re-run the accessibility validators.",
    automatable: true,
  },
  performance: {
    kind: "downgrade_enhancement_to_fallback",
    criterion: "performance",
    subsystem: "performance",
    instruction:
      "Apply enforceBudget(): remove purposeless effects, defer heavy modules, then downgrade the largest remaining enhancement to its declared fallback until the route budget is met.",
    automatable: true,
  },
  brand_differentiation: {
    kind: "introduce_business_appropriate_signature_element",
    criterion: "brand_differentiation",
    subsystem: "design-system",
    instruction:
      "Select ONE signature element whose bestFor includes this industry and whose tier is within the expression ceiling. Differentiation is earned by appropriateness, so a pattern rejected on business relevance may not be reintroduced here.",
    automatable: true,
  },
  trust: {
    kind: "remove_unsupported_proof",
    criterion: "trust",
    subsystem: "content",
    instruction:
      "Run the content verification pass and hide every claim whose confidence level blocks publication. Never substitute a generated equivalent for a proof-bearing asset.",
    automatable: true,
  },
  mobile_experience: {
    kind: "restructure_mobile_composition",
    criterion: "mobile_experience",
    subsystem: "responsive",
    instruction:
      "Re-derive the compact-range transformation from the responsive engine: preserve core content, task and semantic order; convert hover-dependent affordances to visible state; verify at 320 CSS px.",
    automatable: true,
  },
  responsive_behavior: {
    kind: "restructure_mobile_composition",
    criterion: "responsive_behavior",
    subsystem: "responsive",
    instruction:
      "Apply the transformation table to every component that failed, and re-test the mandatory range and capability matrix.",
    automatable: true,
  },
  content_hierarchy: {
    kind: "strengthen_content_hierarchy",
    criterion: "content_hierarchy",
    subsystem: "generation",
    instruction:
      "Re-order the section architecture so the page answers What is it? → Is it for me? → Can I trust it? → What now?, and ensure exactly one H1 with no skipped levels.",
    automatable: true,
  },
  seo: {
    kind: "add_seo_artifacts",
    criterion: "seo",
    subsystem: "seo",
    instruction:
      "Generate the missing SEO artifacts (unique title, description, canonical, single H1, OG metadata, verified-only structured data, internal links) and confirm the content is present in server-rendered HTML.",
    automatable: true,
  },
  consistency: {
    kind: "tighten_token_consistency",
    criterion: "consistency",
    subsystem: "design-system",
    instruction:
      "Replace every ad-hoc value with a token from the derived token set. No component may define its own colour, spacing step or radius.",
    automatable: true,
  },
  cta_hierarchy: {
    kind: "reduce_cta_competition",
    criterion: "cta_hierarchy",
    subsystem: "generation",
    instruction:
      "Reduce to one primary action per viewport; demote the rest to secondary or tertiary treatment with distinct visual weight.",
    automatable: true,
  },
  // Not machine-fixable: these need a person or an asset, and saying so is the
  // honest outcome rather than pretending an automated pass improved them.
  emotional_impact: {
    kind: "request_human_design_review",
    criterion: "emotional_impact",
    subsystem: "human",
    instruction:
      "Emotional impact is not machine-measurable. Route to human design review; do not adjust effects in the hope of moving an unmeasured score.",
    automatable: false,
  },
  memorability: {
    kind: "request_human_design_review",
    criterion: "memorability",
    subsystem: "human",
    instruction: "Memorability is not machine-measurable. Route to human design review.",
    automatable: false,
  },
  imagery: {
    kind: "request_missing_evidence",
    criterion: "imagery",
    subsystem: "content",
    instruction:
      "Imagery quality is bounded by the assets that exist. Request the missing assets; meanwhile apply the asset-quality-appropriate image strategy (typography/CSS/SVG when imagery is weak).",
    automatable: false,
  },
  content_quality: {
    kind: "request_missing_evidence",
    criterion: "content_quality",
    subsystem: "content",
    instruction:
      "Request the missing or unapproved copy. AI drafts stay labelled and unpublished until approved.",
    automatable: false,
  },
};

export interface RefinementStep {
  iteration: number;
  evaluation: QualityEvaluation;
  /** Remediations chosen this iteration, highest weighted-gap first. */
  applied: Remediation[];
  /** Weaknesses with no automatable remedy — escalated, not silently dropped. */
  escalated: Remediation[];
}

export interface RefinementResult {
  steps: RefinementStep[];
  finalEvaluation: QualityEvaluation;
  /** True when the loop reached a passing level. */
  passed: boolean;
  /** True when the loop stopped because it stopped improving, not because it passed. */
  stalled: boolean;
  /** Everything a human must resolve. */
  escalations: Remediation[];
}

export interface RefinementOptions {
  maxIterations?: number;
  /** The level the caller is aiming for. */
  target?: "production_ready" | "professionally_designed" | "world_class";
  /** How many remediations to apply per iteration. */
  batchSize?: number;
}

const LEVEL_ORDER = [
  "cannot_classify",
  "failing",
  "technically_working",
  "production_ready",
  "professionally_designed",
  "world_class",
] as const;

function meetsTarget(level: QualityEvaluation["level"], target: string): boolean {
  return LEVEL_ORDER.indexOf(level) >= LEVEL_ORDER.indexOf(target as (typeof LEVEL_ORDER)[number]);
}

export function planRemediations(evaluation: QualityEvaluation): {
  automatable: Remediation[];
  escalated: Remediation[];
} {
  const automatable: Remediation[] = [];
  const escalated: Remediation[] = [];

  // Failed gates come first: a gate failure blocks production whatever the score.
  for (const gate of evaluation.failedGates) {
    const remedy = REMEDIATION_BY_CRITERION[gate === "content" ? "trust" : gate];
    if (remedy) {
      (remedy.automatable ? automatable : escalated).push(remedy);
    }
  }

  for (const weakness of evaluation.weaknesses) {
    const remedy = REMEDIATION_BY_CRITERION[weakness.key];
    if (!remedy) continue;
    const bucket = remedy.automatable ? automatable : escalated;
    if (!bucket.some((r) => r.criterion === remedy.criterion)) bucket.push(remedy);
  }

  // An unscored criterion required by the target level is an escalation, not a
  // weakness — it is missing information, not a bad result (§F6).
  for (const key of evaluation.unscored) {
    const remedy = REMEDIATION_BY_CRITERION[key];
    if (remedy && !remedy.automatable && !escalated.some((r) => r.criterion === key)) {
      escalated.push(remedy);
    }
  }

  return { automatable, escalated };
}

/**
 * Run the loop. `applyRemediation` is injected: this module decides WHAT to fix
 * and in what order; the caller owns the actual mutation. That separation is
 * what lets the loop be tested without a running website.
 */
export function refine(
  initialSheet: ScoreSheet,
  initialGates: GateStatus,
  applyRemediation: (
    remediation: Remediation,
    sheet: ScoreSheet,
    gates: GateStatus,
  ) => { sheet: ScoreSheet; gates: GateStatus },
  options: RefinementOptions = {},
): RefinementResult {
  const maxIterations = options.maxIterations ?? 5;
  const target = options.target ?? "production_ready";
  const batchSize = options.batchSize ?? 2;

  let sheet = initialSheet;
  let gates = initialGates;
  const steps: RefinementStep[] = [];
  const escalations: Remediation[] = [];
  let previousScore: number | null = null;
  let stalled = false;

  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    const evaluation = evaluateQuality(sheet, gates);
    const { automatable, escalated } = planRemediations(evaluation);

    for (const e of escalated) {
      if (!escalations.some((x) => x.criterion === e.criterion)) escalations.push(e);
    }

    if (meetsTarget(evaluation.level, target)) {
      steps.push({ iteration, evaluation, applied: [], escalated });
      return { steps, finalEvaluation: evaluation, passed: true, stalled: false, escalations };
    }

    const batch = automatable.slice(0, batchSize);
    steps.push({ iteration, evaluation, applied: batch, escalated });

    if (batch.length === 0) {
      // Nothing automatable left. Stop rather than spin: §20's loop must
      // terminate, and a loop with no available action is finished.
      stalled = true;
      return { steps, finalEvaluation: evaluation, passed: false, stalled, escalations };
    }

    for (const remediation of batch) {
      const next = applyRemediation(remediation, sheet, gates);
      sheet = next.sheet;
      gates = next.gates;
    }

    const after = evaluateQuality(sheet, gates);
    if (
      previousScore !== null &&
      after.weightedScore !== null &&
      after.weightedScore <= previousScore
    ) {
      // Applying remediations stopped helping. Report the stall honestly
      // instead of burning the remaining iterations.
      stalled = true;
      return { steps, finalEvaluation: after, passed: false, stalled, escalations };
    }
    previousScore = after.weightedScore;
  }

  const finalEvaluation = evaluateQuality(sheet, gates);
  return {
    steps,
    finalEvaluation,
    passed: meetsTarget(finalEvaluation.level, target),
    stalled,
    escalations,
  };
}
