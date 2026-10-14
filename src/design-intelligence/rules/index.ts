/**
 * Rule corpus index.
 *
 * The specification publishes 120 rules (DD-001..DD-120). This index reports the
 * corpus in FOUR honest buckets, so that "120 rules" can never be read as "120
 * executable rules":
 *
 *   encoded                  — live in the evaluator, with a named consumer
 *   pending                  — published, not yet encoded
 *   intentionally_not_encoded — published, deliberately NOT encoded, with the
 *                               authority that governs the behaviour instead
 *   source_verified          — every encoded id matches a heading in the
 *                               specification (also enforced by audit_framework.py)
 *
 * Within `encoded`, each rule is further classified executable / gate / scoring /
 * approval, because the count of rules that CHANGE A DECISION is a different
 * number from the count of rules that exist.
 */
import type { Rule, RuleClassification } from "../types/decision.js";
import { DIRECTION_RULES } from "./direction-rules.js";
import { CONSTRAINT_RULES } from "./constraint-rules.js";
import { LAYOUT_RULES } from "./layout-rules.js";
import { NAVIGATION_RULES } from "./navigation-rules.js";
import { COMPONENT_RULES } from "./component-rules.js";
import { RESPONSIVE_RULES } from "./responsive-rules.js";
import { ACCESSIBILITY_RULES } from "./accessibility-rules.js";
import { PERFORMANCE_RULES } from "./performance-rules.js";
import { SEO_RULES } from "./seo-rules.js";
import { CONTENT_RULES } from "./content-rules.js";
import { QUALITY_RULES } from "./quality-rules.js";

export const ALL_RULES: readonly Rule[] = [
  ...DIRECTION_RULES,
  ...CONSTRAINT_RULES,
  ...LAYOUT_RULES,
  ...NAVIGATION_RULES,
  ...COMPONENT_RULES,
  ...RESPONSIVE_RULES,
  ...ACCESSIBILITY_RULES,
  ...PERFORMANCE_RULES,
  ...SEO_RULES,
  ...CONTENT_RULES,
  ...QUALITY_RULES,
];

/** Every id the specification publishes, DD-001 through DD-120. */
export const SPECIFIED_RULE_IDS: readonly string[] = Array.from(
  { length: 120 },
  (_, i) => `DD-${String(i + 1).padStart(3, "0")}`,
);

export interface IntentionalOmission {
  id: string;
  title: string;
  /** The subsystem that ALREADY governs this behaviour. Never empty. */
  governedBy: string;
  reason: string;
}

/**
 * The 17 rules deliberately NOT encoded, each with the authority that governs
 * the behaviour instead. They are documentation-level technique preferences whose
 * decision is already made by an existing gate; encoding them would create the
 * second implementation of one decision that produced the P0 conflicts.
 */
export const INTENTIONALLY_NOT_ENCODED: readonly IntentionalOmission[] = [
  { id: "DD-048", title: "CSS first motion", governedBy: "pattern-registry tier ladder + select-elements implementation_complexity gate", reason: "chooses BETWEEN motion implementations; the tier ladder already orders them and the complexity budget already gates them" },
  { id: "DD-049", title: "Motion library selection", governedBy: "stack/select-stack.ts motionLibrariesForTier", reason: "the library follows the selected tier; a rule would restate the tier→library map" },
  { id: "DD-050", title: "GSAP selection", governedBy: "stack/select-stack.ts motionLibrariesForTier", reason: "a tier choice, not an independent decision" },
  { id: "DD-051", title: "Scroll-driven animation", governedBy: "animation_library.md four-job gate + DD-046 motion purpose", reason: "purpose test already encoded as DD-046; the technique choice is a tier choice" },
  { id: "DD-052", title: "Parallax", governedBy: "pattern-registry parallax-depth (expressiveness high) + DD-047 reduced motion", reason: "already a registered pattern gated by expressiveness and the reduced-motion gate" },
  { id: "DD-054", title: "Magnetic buttons", governedBy: "pattern-registry magnetic-action + select-elements §7 value questions", reason: "already a registered pattern with no task value; the value gate rejects it" },
  { id: "DD-055", title: "Custom cursor", governedBy: "DD-053 cursor follower + pattern-registry cursor-follower", reason: "same decision as DD-053, which is encoded" },
  { id: "DD-056", title: "Text animation", governedBy: "DD-046 motion purpose + DD-047 reduced motion + industry avoid lists (kinetic_type)", reason: "purpose and reduced-motion gates already decide it; industry rules already forbid kinetic type where it harms" },
  { id: "DD-057", title: "Lottie", governedBy: "pattern-registry tier `lottie` + performance/budgets.ts lazy loading", reason: "a tier plus a budget decision, both encoded" },
  { id: "DD-058", title: "SVG animation", governedBy: "pattern-registry tier `svg` + DD-089 animatable properties", reason: "tier plus the animatable-property gate" },
  { id: "DD-060", title: "WebGL constraints", governedBy: "DD-082 canvas/WebGL alternative + DD-059 3D eligibility + DD-084 budget gate", reason: "every constraint it lists is already an encoded gate" },
  { id: "DD-061", title: "React Three Fiber selection", governedBy: "stack/select-stack.ts requiresCapability spatial_3d", reason: "the library follows a SELECTED capability; encoded as the stack contradiction fix" },
  { id: "DD-062", title: "3D cards vs WebGL", governedBy: "pattern-registry perspective-card vs 3d-product-view (tier + expressiveness)", reason: "two registered patterns already separated by tier and expressiveness" },
  { id: "DD-063", title: "Product configurator", governedBy: "pattern-registry 3d-product-view unlockedBy product_configurator", reason: "encoded as the use-case unlock on the pattern, which is the only honest place for it" },
  { id: "DD-116", title: "Glass effect", governedBy: "expression ceiling + DD-020 contrast (measured, not assumed)", reason: "an aesthetic treatment; contrast over blurred content is what the measured contrast table catches" },
  { id: "DD-117", title: "Gradient and glow", governedBy: "DD-018 futuristic (tested gradients) + DD-020 contrast + expression ceiling", reason: "an aesthetic treatment already bounded by the encoded rules it would restate" },
  { id: "DD-118", title: "Grain/noise", governedBy: "expression ceiling + performance/budgets.ts", reason: "a texture preference with no independent decision" },
];

const ALL_DOMAINS = [
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
] as const;

export interface RuleTraceEntry {
  id: string;
  title: string;
  domain: string;
  classification: RuleClassification;
  consumer: string;
  sourceSection: string;
  /** How the rule acts: which effect kinds it emits. */
  effectKinds: string[];
}

export interface RuleCoverage {
  encoded: string[];
  pending: string[];
  intentionallyNotEncoded: string[];
  /** encoded + intentionallyNotEncoded + pending must equal specified. */
  specifiedCount: number;
  encodedCount: number;
  pendingCount: number;
  intentionallyNotEncodedCount: number;
  /** Ids that appear in BOTH encoded and intentionally-not-encoded — must be empty. */
  contradictions: string[];
  byClassification: Record<RuleClassification, number>;
  byDomain: Record<string, number>;
  domainsCovered: string[];
  domainsUncovered: string[];
  consumers: string[];
  trace: RuleTraceEntry[];
}

export function ruleCoverage(): RuleCoverage {
  const encoded = ALL_RULES.map((r) => r.id).sort();
  const encodedSet = new Set(encoded);
  const omitted = INTENTIONALLY_NOT_ENCODED.map((o) => o.id).sort();
  const omittedSet = new Set(omitted);
  const pending = SPECIFIED_RULE_IDS.filter((id) => !encodedSet.has(id) && !omittedSet.has(id));

  const byClassification: Record<RuleClassification, number> = {
    executable: 0,
    gate: 0,
    scoring: 0,
    approval: 0,
  };
  const byDomain: Record<string, number> = {};
  for (const rule of ALL_RULES) {
    byClassification[rule.classification] += 1;
    byDomain[rule.domain] = (byDomain[rule.domain] ?? 0) + 1;
  }
  const domains = new Set(ALL_RULES.map((r) => r.domain));

  return {
    encoded,
    pending,
    intentionallyNotEncoded: omitted,
    specifiedCount: SPECIFIED_RULE_IDS.length,
    encodedCount: encoded.length,
    pendingCount: pending.length,
    intentionallyNotEncodedCount: omitted.length,
    contradictions: encoded.filter((id) => omittedSet.has(id)),
    byClassification,
    byDomain,
    domainsCovered: [...domains].sort(),
    domainsUncovered: ALL_DOMAINS.filter((d) => !domains.has(d)),
    consumers: [...new Set(ALL_RULES.map((r) => r.consumer))].sort(),
    trace: ALL_RULES.map((r) => ({
      id: r.id,
      title: r.title,
      domain: r.domain,
      classification: r.classification,
      consumer: r.consumer,
      sourceSection: r.sourceSection,
      effectKinds: [...new Set([...r.then, ...r.otherwise, ...r.require].map((e) => e.kind))],
    })),
  };
}

export function getRule(id: string): Rule | undefined {
  return ALL_RULES.find((r) => r.id === id);
}

export function rulesForDomain(domain: Rule["domain"]): Rule[] {
  return ALL_RULES.filter((r) => r.domain === domain);
}

export {
  DIRECTION_RULES,
  CONSTRAINT_RULES,
  LAYOUT_RULES,
  NAVIGATION_RULES,
  COMPONENT_RULES,
  RESPONSIVE_RULES,
  ACCESSIBILITY_RULES,
  PERFORMANCE_RULES,
  SEO_RULES,
  CONTENT_RULES,
  QUALITY_RULES,
};
