/**
 * Pattern schema — specification §A.1, extended per §21 with the scoring and
 * risk metadata §8 requires.
 *
 * §21 is explicit that patterns must NOT be hardcoded stylistic defaults. So a
 * pattern carries only *metadata about its suitability*; nothing here selects
 * anything. Selection is `engine/select-elements.ts`, which reads this metadata
 * and the profile.
 */
import type { Industry } from "../../design-intelligence/types/business-input.js";

export type PatternCategory =
  | "layout"
  | "component"
  | "interaction"
  | "motion"
  | "visual"
  | "immersive";

export type Cost = "low" | "medium" | "high";

/**
 * VISUAL EXPRESSIVENESS — how much of a pattern's value is decorative/atmospheric
 * rather than functional or explanatory.
 *
 * This is a SEPARATE axis from implementation complexity, and separating them is
 * the fix for the dry run's P0-1. Previously the expression ceiling was applied
 * to `tier`, so an inline SVG diagram (tier `svg`, index 5 on §10's escalation
 * ladder) was rejected by a "low expression" ceiling — even though a diagram is
 * a clarity device with almost no decorative ambition. §10's ladder orders
 * IMPLEMENTATION COMPLEXITY as a preference; it was never a permission ladder,
 * and using it as one rejected exactly the explanatory patterns a trust-critical
 * business most needs.
 *
 *  low    — value is task completion or comprehension (diagram, gallery, rail)
 *  medium — visual composition contributes materially (editorial grid, sticky story)
 *  high   — value is primarily atmosphere or spectacle (parallax, decorative WebGL)
 */
export const EXPRESSIVENESS_LEVELS = ["low", "medium", "high"] as const;
export type Expressiveness = (typeof EXPRESSIVENESS_LEVELS)[number];

/**
 * §10's escalation ladder, as an ordinal. A pattern declares the LOWEST tier
 * that can deliver its value. It is gated against the business's
 * `technical_complexity_budget` — NOT against the visual expression ceiling.
 */
export const IMPLEMENTATION_TIERS = [
  "semantic_html_css",
  "css_transforms_transitions",
  "web_animations_api",
  "motion_react",
  "gsap",
  "svg",
  "lottie",
  "three_r3f",
  "full_webgl",
] as const;
export type ImplementationTier = (typeof IMPLEMENTATION_TIERS)[number];

/**
 * A generic exception to a `poorFor` exclusion.
 *
 * `poorFor` alone is a flat industry list with no exception path, which made it
 * impossible to express appendix A's own test for 3D — "spatial inspection
 * improves the decision". A custom-fitted medical device satisfies that test
 * while `healthcare` sits in `poorFor`, and the dry run showed the engine could
 * only reject it.
 *
 * An unlock is a USE-CASE condition, never an industry name: it says "this
 * pattern stops being unsuitable when the business actually needs the job it
 * does". Adding an industry to an unlock would recreate the hack this replaces,
 * so the shape deliberately offers no industry field.
 *
 * An unlocked pattern is not waved through — it re-enters the remaining gates
 * and, if it survives, carries `approvalRequired` because it is being admitted
 * against its own default suitability.
 */
export interface SuitabilityUnlock {
  /** A stated functionality requirement that makes the pattern's job real. */
  requirement?: string;
  /** A stated business objective that makes the pattern's job real. */
  objective?: string;
  /** A derived variable that must be at least this value on its own scale. */
  variableAtLeast?: { name: string; value: string };
  /** Asset inventory keys that must be verified before the unlock counts. */
  requiresVerifiedAssets?: readonly string[];
  /** Why this condition genuinely changes the suitability judgement. */
  rationale: string;
}

export interface PatternDefinition {
  id: string;
  /** Cross-reference into the markdown design_library.md, when one exists. */
  libraryRef?: string;
  category: PatternCategory;
  principle: string;
  solvesUserProblem: string;
  solvesCommunicationProblem: string;
  bestFor: readonly Industry[];
  poorFor: readonly Industry[];
  /**
   * Conditions under which a `poorFor` match is overridden. ANY match unlocks.
   * Absent means the exclusion is absolute — which is correct for decoration.
   */
  unlockedBy?: readonly SuitabilityUnlock[];
  /**
   * Capability tags this pattern provides. The stack reads these so a dependency
   * can only enter for a capability that was actually SELECTED — the dry run
   * found `three` and `@react-three/fiber` added for a rejected 3D pattern.
   */
  capabilities?: readonly string[];
  /**
   * FD-11: the SECTION whose renderer implements this pattern, or `null` when the
   * generator cannot render it. Selection may not choose a pattern nothing renders:
   * the first real customer's site "selected" two patterns that appeared nowhere, and
   * both still carried a route-JS budget and a fallback requirement.
   */
  implementedBySection?: string | null;
  /** Content that must exist for the pattern to be honest, not merely to look full. */
  requiredContent: readonly string[];
  /** Asset inventory keys that must be verified-available. */
  requiredAssets: readonly string[];
  /** §F.2 transformations, per range. */
  desktop: string;
  tablet: string;
  mobile: string;
  reducedMotion: string;
  accessibility: readonly string[];
  performanceCost: Cost;
  seoRisk: Cost;
  /** Lowest tier that delivers the pattern's value (§10). Gated against the
   *  business's technical complexity budget, never against the expression ceiling. */
  tier: ImplementationTier;
  /** How decorative the pattern is. Gated against the expression ceiling. */
  expressiveness: Expressiveness;
  implementation: readonly string[];
  fallback: string;
  /** §7 gate 6: how often this may appear. `1` means once per page. */
  maxFrequencyPerPage: number;
  /** Estimated route JS contribution in KB gzipped, for the §15 budget check. */
  estimatedRouteJsKb: number;
  /**
   * True when the pattern is the ONLY carrier of some information. §10 forbids
   * this for proposition/navigation/pricing/contact/legal and similar; a pattern
   * that claims it is rejected outright.
   */
  carriesEssentialContentAlone: boolean;
  /** §9 hard gates. Any true value is an automatic rejection. */
  hardConstraintViolations: {
    requiresHoverForCoreInfo: boolean;
    requiresCursorPositionForCoreInfo: boolean;
    requiresDragWithoutEquivalent: boolean;
    requiresAnimationToUnderstand: boolean;
    requiresWebglToUnderstand: boolean;
    requiresDeviceMotion: boolean;
    hidesCriticalInfoInCanvas: boolean;
    autoAdvancingOnMobile: boolean;
  };
  /** §8 negative factor: how saturated the pattern is as a trend, 0–5. */
  trendSaturation: number;
  /** §8 positive factors, 0–5, expressing what the pattern can contribute. */
  benefits: {
    /** User/task value: does a task become easier? */
    ux: number;
    /**
     * Information/explanation value: does comprehension improve? Tracked apart
     * from `ux` because an explanatory pattern can score low on task-completion
     * and still be the most valuable thing on a high-trust page — the dry run
     * rejected `data-diagram` partly because nothing measured this.
     */
    explanation: number;
    visual: number;
    conversion: number;
    differentiation: number;
    /** Strength of published evidence that it works. */
    evidence: number;
  };
}

export function expressivenessIndex(level: Expressiveness): number {
  return EXPRESSIVENESS_LEVELS.indexOf(level);
}

/** A pattern with no hard-constraint violations, for terse definitions. */
export const NO_VIOLATIONS: PatternDefinition["hardConstraintViolations"] = {
  requiresHoverForCoreInfo: false,
  requiresCursorPositionForCoreInfo: false,
  requiresDragWithoutEquivalent: false,
  requiresAnimationToUnderstand: false,
  requiresWebglToUnderstand: false,
  requiresDeviceMotion: false,
  hidesCriticalInfoInCanvas: false,
  autoAdvancingOnMobile: false,
};

export function tierIndex(tier: ImplementationTier): number {
  return IMPLEMENTATION_TIERS.indexOf(tier);
}
