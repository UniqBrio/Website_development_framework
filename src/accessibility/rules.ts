/**
 * Accessibility hard gates — specification §9, appendix G and G.1.
 *
 * §G.1 lists seven conditions that BLOCK PRODUCTION. They are checked here as
 * data about the built page, not as advice. Note the contrast thresholds: the
 * spec requires WCAG 2.2 AA, and the existing framework
 * (website_workflow/theme_system.md) additionally requires logo contrast in
 * every active theme, which WCAG explicitly exempts. Assessment decision F4
 * keeps the stricter rule, so the logo check is here too.
 */

/**
 * WCAG 2.2 **AA** thresholds. Canonical home; markdown checklists cite these.
 *
 * These are the AA floor, NOT the whole contract. A business that requests AAA
 * gets stricter numbers from `accessibility/evaluate.ts` `thresholdsFor()`,
 * which is the authority whenever a target is stated. Reading this constant
 * unconditionally was the P1-4 defect: AAA was stated and enforced at AA.
 */
export const CONTRAST_THRESHOLDS = {
  bodyText: 4.5,
  largeText: 3.0,
  uiBoundaries: 3.0,
  focusIndicator: 3.0,
  /**
   * Not a WCAG requirement — 1.4.3 exempts logotypes and 1.4.11 exempts parts of
   * a logo or brand name. The existing framework requires it anyway, worst
   * colour pair governing, and says so explicitly so nobody "corrects" the rule
   * by citing WCAG at it.
   */
  logoAgainstBackdrop: 3.0,
} as const;

/** §G accessibility_baseline.required. */
export const ACCESSIBILITY_BASELINE = [
  "semantic_landmarks",
  "logical_heading_hierarchy",
  "keyboard_access_for_all_controls",
  "visible_focus",
  "focus_not_obscured",
  "contrast_compliance",
  "reflow_at_320_css_px",
  "alternatives_for_drag_hover_motion_canvas",
  "reduced_motion_support",
  "labelled_forms_and_errors",
  "useful_alt_text",
  "target_size_and_spacing",
] as const;

/** Observations about a built page. Every field is a measurement, not an opinion. */
export interface AccessibilityObservations {
  primaryTaskRequiresPointerOnly: boolean;
  primaryTaskRequiresHover: boolean;
  primaryTaskRequiresDrag: boolean;
  primaryTaskRequiresDeviceMotion: boolean;
  primaryTaskRequiresWebgl: boolean;
  focusVisible: boolean;
  focusObscuredBySticky: boolean;
  /** Lowest measured ratio among body text, CTA labels and form state. */
  lowestCriticalTextContrast: number;
  /** Worst logo colour against its actual backdrop, per active theme. */
  lowestLogoContrast: number | null;
  coreContentLostAt320: boolean;
  coreContentLostAt400Zoom: boolean;
  meaningfulMediaWithoutAlternative: string[];
  nonEssentialMotionCannotBeReduced: boolean;
  formsInaccessible: boolean;
  /** Smallest interactive target, CSS px. WCAG 2.2 AA 2.5.8 requires 24; the
   *  existing framework's checklists require 44 on mobile, which is stricter. */
  smallestTargetCssPx: number;
}

export interface HardFailure {
  rule: string;
  detail: string;
  /** §G.1 failures block production. */
  blocksProduction: true;
}

export interface HardFailureThresholds {
  bodyText: number;
  logoAgainstBackdrop: number;
  targetSizeCssPx: number;
}

/**
 * Which observation fields each §G.1 criterion is decided from. THE home for this
 * mapping: `checkHardFailures` skips a check whose fields were not observed, and
 * `evaluateAccessibility` marks that criterion `unknown`. A partial audit can
 * therefore never turn an unmeasured criterion into a pass.
 */
export const CRITERION_FIELDS = {
  input_independence: [
    "primaryTaskRequiresPointerOnly",
    "primaryTaskRequiresHover",
    "primaryTaskRequiresDrag",
    "primaryTaskRequiresDeviceMotion",
    "primaryTaskRequiresWebgl",
  ],
  focus_visible: ["focusVisible", "focusObscuredBySticky"],
  contrast_body: ["lowestCriticalTextContrast"],
  logo_visibility: ["lowestLogoContrast"],
  reflow: ["coreContentLostAt320", "coreContentLostAt400Zoom"],
  media_alternatives: ["meaningfulMediaWithoutAlternative"],
  reduced_motion: ["nonEssentialMotionCannotBeReduced"],
  forms: ["formsInaccessible"],
  target_size: ["smallestTargetCssPx"],
} as const satisfies Record<string, ReadonlyArray<keyof AccessibilityObservations>>;

export type HardCriterionId = keyof typeof CRITERION_FIELDS;

/** The observation fields a criterion needed but did not receive. */
export function missingFieldsFor(
  criterion: HardCriterionId,
  obs: Partial<AccessibilityObservations>,
): Array<keyof AccessibilityObservations> {
  return CRITERION_FIELDS[criterion].filter((field) => obs[field] === undefined);
}

/**
 * §G.1 block_production_if, checked in order.
 *
 * `thresholds` defaults to the AA floor so existing callers are unchanged, but a
 * stated target passes its own numbers in — which is what makes AAA enforceable
 * rather than decorative.
 *
 * Observations may be PARTIAL. A check whose fields were not observed is skipped
 * here — it neither passes nor fails — and the evaluator reports it `unknown`.
 * Only a present, measured value can produce a failure or support a pass.
 */
export function checkHardFailures(
  obs: Partial<AccessibilityObservations>,
  thresholds: HardFailureThresholds = {
    bodyText: CONTRAST_THRESHOLDS.bodyText,
    logoAgainstBackdrop: CONTRAST_THRESHOLDS.logoAgainstBackdrop,
    targetSizeCssPx: 24,
  },
): HardFailure[] {
  const failures: HardFailure[] = [];
  const observed = (criterion: HardCriterionId) => missingFieldsFor(criterion, obs).length === 0;

  if (
    observed("input_independence") &&
    (obs.primaryTaskRequiresPointerOnly ||
      obs.primaryTaskRequiresHover ||
      obs.primaryTaskRequiresDrag ||
      obs.primaryTaskRequiresDeviceMotion ||
      obs.primaryTaskRequiresWebgl)
  ) {
    failures.push({
      rule: "primary_task_input_independence",
      detail:
        "the primary task requires mouse, hover, drag, device motion or WebGL — §G.1 blocks production",
      blocksProduction: true,
    });
  }

  if (observed("focus_visible") && (!obs.focusVisible || obs.focusObscuredBySticky)) {
    failures.push({
      rule: "focus_visible_and_not_obscured",
      detail: !obs.focusVisible
        ? "focus is not visible"
        : "focus is obscured by sticky or fixed UI",
      blocksProduction: true,
    });
  }

  if (observed("contrast_body") && (obs.lowestCriticalTextContrast as number) < thresholds.bodyText) {
    failures.push({
      rule: "critical_text_contrast",
      detail: `lowest critical text contrast ${obs.lowestCriticalTextContrast}:1 is below the ${thresholds.bodyText}:1 threshold for the requested accessibility target`,
      blocksProduction: true,
    });
  }

  // Stricter-than-WCAG, retained per assessment F4. `null` is a MEASURED "no
  // logo image on the page"; `undefined` is "not observed".
  if (
    observed("logo_visibility") &&
    obs.lowestLogoContrast !== null &&
    (obs.lowestLogoContrast as number) < thresholds.logoAgainstBackdrop
  ) {
    failures.push({
      rule: "logo_visibility",
      detail: `worst logo colour measures ${obs.lowestLogoContrast}:1 against its backdrop, below ${thresholds.logoAgainstBackdrop}:1. WCAG exempts logotypes; this framework does not. Fix the background, never recolour the mark.`,
      blocksProduction: true,
    });
  }

  if (observed("reflow") && (obs.coreContentLostAt320 || obs.coreContentLostAt400Zoom)) {
    failures.push({
      rule: "reflow",
      detail: obs.coreContentLostAt320
        ? "core content or functionality is lost at 320 CSS px"
        : "core content or functionality is lost at 400% zoom",
      blocksProduction: true,
    });
  }

  if (observed("media_alternatives") && (obs.meaningfulMediaWithoutAlternative ?? []).length > 0) {
    failures.push({
      rule: "media_alternatives",
      detail: `meaningful media without an alternative: ${(obs.meaningfulMediaWithoutAlternative ?? []).join(", ")}`,
      blocksProduction: true,
    });
  }

  if (observed("reduced_motion") && obs.nonEssentialMotionCannotBeReduced) {
    failures.push({
      rule: "reduced_motion",
      detail: "non-essential interaction motion cannot be reduced or disabled",
      blocksProduction: true,
    });
  }

  if (observed("forms") && obs.formsInaccessible) {
    failures.push({
      rule: "forms",
      detail: "form labels, errors or success states are inaccessible",
      blocksProduction: true,
    });
  }

  if (observed("target_size") && (obs.smallestTargetCssPx as number) < thresholds.targetSizeCssPx) {
    failures.push({
      rule: "target_size",
      detail: `smallest interactive target is ${obs.smallestTargetCssPx} CSS px, below the ${thresholds.targetSizeCssPx} px minimum for the requested accessibility target`,
      blocksProduction: true,
    });
  }

  return failures;
}

/*
 * REMOVED in the P1 pass: `accessibilityScore(obs)`.
 *
 * It scored accessibility against a hard-coded AA assumption ("passes AA but not
 * AAA") while `accessibility/evaluate.ts` scores against the REQUESTED target.
 * Two scorers for one criterion is the conflicting-authority class, and the
 * weaker one silently ignored the target — the very defect P1-4 exists to fix.
 *
 * `evaluateAccessibility(target, observations, aaa)` is now the only authority.
 * It returns `null` rather than a number when the gate is undecidable, which a
 * plain score could not express.
 */
