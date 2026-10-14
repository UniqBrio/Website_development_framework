/**
 * Quality and production rules — §4.14 (DD-108..DD-112).
 *
 * `quality/scoring.ts` and `quality/gate-derivation.ts` are the enforcers and
 * were built from appendix K/L, which these rules restate in rule form. They are
 * encoded so the gate model is auditable under rule ids, and a test asserts the
 * numbers in the rules are THE SAME numbers `scoring.ts` uses — a threshold in
 * two places drifts, so the test is what keeps them one.
 *
 * DD-112 is a scoring rule: at a world-class target it adds requirements the
 * scoring model's world-class minimums already express, plus an approval that a
 * human design review is required (the scorer cannot grant it).
 */
import { parseRule, type Rule } from "../types/decision.js";
import { CORE_MINIMUM, QUALITY_THRESHOLDS, WORLD_CLASS_MINIMUM } from "../../quality/scoring.js";

const AWWWARDS = "https://www.awwwards.com/about-evaluation/";
const WCAG = "https://www.w3.org/TR/WCAG22/";
const NEXT_PROD = "https://nextjs.org/docs/app/guides/production-checklist";
const VITALS = "https://web.dev/articles/vitals";

export const QUALITY_RULES: readonly Rule[] = [
  parseRule({
    id: "DD-108",
    title: "Quality score threshold",
    domain: "quality",
    classification: "gate",
    consumer: "quality/scoring.ts",
    sourceSection: "§4.14",
    then: [
      // The numbers live in quality/scoring.ts (the consumer); the rule cites them.
      { kind: "set", target: "quality.thresholds", value: { ...QUALITY_THRESHOLDS } },
      { kind: "set", target: "quality.coreMinimum", value: CORE_MINIMUM },
      { kind: "set", target: "quality.worldClassMinimum", value: WORLD_CLASS_MINIMUM },
      { kind: "require", target: "quality", value: "world_class additionally requires an approved human design review" },
    ],
    rationale: "Quality needs both aggregate score and critical minimums.",
    source_urls: [AWWWARDS],
    confidence: "high",
  }),
  parseRule({
    id: "DD-109",
    title: "Hard accessibility gate",
    domain: "quality",
    classification: "gate",
    consumer: "quality/gate-derivation.ts",
    sourceSection: "§4.14",
    then: [
      { kind: "set", target: "quality.accessibilityGate", value: "blocks_production_regardless_of_score" },
      { kind: "require", target: "quality", value: "a blocking WCAG failure blocks production regardless of aesthetic or award-style score" },
    ],
    rationale: "Accessibility is not a tradeable visual preference.",
    source_urls: [WCAG],
    confidence: "high",
  }),
  parseRule({
    id: "DD-110",
    title: "Hard content integrity gate",
    domain: "quality",
    classification: "gate",
    consumer: "quality/gate-derivation.ts",
    sourceSection: "§4.14",
    then: [
      { kind: "set", target: "quality.contentGate", value: "blocks_production_on_fabricated_or_unverified_public_claim" },
      { kind: "require", target: "quality", value: "a fabricated or unverified public claim blocks production until removed or verified" },
    ],
    rationale: "Production quality requires factual integrity.",
    source_urls: [NEXT_PROD],
    confidence: "high",
  }),
  parseRule({
    id: "DD-111",
    title: "Hard performance gate",
    domain: "quality",
    classification: "gate",
    consumer: "performance/budgets.ts",
    sourceSection: "§4.14",
    then: [
      { kind: "set", target: "quality.performanceGate", value: "remove_or_defer_nonessential_enhancement_on_vitals_failure" },
      { kind: "require", target: "quality", value: "a Core Web Vitals failure caused by a non-essential enhancement removes or defers that enhancement" },
    ],
    rationale: "Decorative effects cannot justify a failed core experience.",
    source_urls: [VITALS],
    confidence: "high",
  }),
  parseRule({
    id: "DD-112",
    title: "World-class differentiation",
    domain: "quality",
    classification: "scoring",
    consumer: "quality/scoring.ts",
    sourceSection: "§4.14",
    if: [{ fact: "targetQuality", op: "eq", value: "world_class" }],
    then: [
      { kind: "require", target: "quality", value: "a brand-specific design idea, intentional content art direction, and exceptional execution without gate failures" },
      { kind: "forbid", target: "quality", value: "trend_stacking_as_memorability_strategy" },
    ],
    otherwise: [{ kind: "set", target: "quality.targetLevel", value: "professionally_designed" }],
    avoid: ["trend_stacking_as_memorability_strategy"],
    fallback: ["professionally designed classification"],
    rationale: "World-class requires owned, context-relevant distinction rather than more effects.",
    source_urls: [AWWWARDS, "https://www.cssdesignawards.com/about"],
    confidence: "high",
    approval_required: true,
  }),
];
