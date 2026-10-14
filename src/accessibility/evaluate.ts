/**
 * ACCESSIBILITY TARGET ENFORCEMENT — P1 capability 4.
 *
 * PREVIOUS LIMITATION: `accessibility_requirement` could be
 * `wcag_aaa_or_equivalent` and nothing changed. `CONTRAST_THRESHOLDS` was a flat
 * AA constant, so a business that asked for AAA got AA silently — the
 * requirement existed as text in the profile and the gate ignored it.
 *
 * THE CONTRACT, as the brief requires it:
 *   requested target   — preserved verbatim, never downgraded
 *   measurable criteria — which checks the target actually implies
 *   evidence available  — what was observed
 *   pass / fail / unknown — per criterion, with `unknown` distinct from `pass`
 *
 * A production gate must not treat `unknown` as `pass` for a mandatory
 * accessibility requirement. So when the target is AAA and a AAA criterion
 * cannot be classified, the gate is `unknown` — it neither passes nor fails, and
 * it cannot certify.
 */
import type { AccessibilityObservations, HardCriterionId, HardFailure } from "./rules.js";
import { checkHardFailures, missingFieldsFor } from "./rules.js";

export type AccessibilityTarget = "baseline" | "wcag_aa" | "wcag_aaa_or_equivalent";

export type CriterionStatus = "pass" | "fail" | "unknown" | "not_applicable";

export interface ContrastThresholds {
  bodyText: number;
  largeText: number;
  uiBoundaries: number;
  focusIndicator: number;
  /** Not a WCAG requirement at any level; this framework requires it anyway. */
  logoAgainstBackdrop: number;
  /** Minimum interactive target size in CSS px. */
  targetSizeCssPx: number;
}

/**
 * Thresholds BY TARGET. This is the fix: the numbers move with the requested
 * level instead of being a single AA constant.
 *
 * AAA values are WCAG 1.4.6 (contrast enhanced, 7:1 body / 4.5:1 large) and
 * 2.5.5 (target size enhanced, 44 CSS px). The logo rule stays at 3:1 across all
 * levels because it is this framework's own addition, not a WCAG level.
 */
const THRESHOLDS_BY_TARGET: Record<AccessibilityTarget, ContrastThresholds> = {
  baseline: {
    bodyText: 4.5,
    largeText: 3.0,
    uiBoundaries: 3.0,
    focusIndicator: 3.0,
    logoAgainstBackdrop: 3.0,
    targetSizeCssPx: 24,
  },
  wcag_aa: {
    bodyText: 4.5,
    largeText: 3.0,
    uiBoundaries: 3.0,
    focusIndicator: 3.0,
    logoAgainstBackdrop: 3.0,
    targetSizeCssPx: 24,
  },
  wcag_aaa_or_equivalent: {
    // 1.4.6 Contrast (Enhanced).
    bodyText: 7.0,
    largeText: 4.5,
    uiBoundaries: 3.0,
    focusIndicator: 3.0,
    logoAgainstBackdrop: 3.0,
    // 2.5.5 Target Size (Enhanced).
    targetSizeCssPx: 44,
  },
};

export function thresholdsFor(target: AccessibilityTarget): ContrastThresholds {
  return THRESHOLDS_BY_TARGET[target];
}

export interface CriterionResult {
  id: string;
  label: string;
  status: CriterionStatus;
  /** True when this criterion is required by the REQUESTED target. */
  mandatory: boolean;
  /** True when a validator could decide it from the available evidence. */
  machineMeasurable: boolean;
  detail: string;
  /** Set when the criterion exists only at AAA. */
  aaaOnly?: boolean;
}

export interface AccessibilityEvaluation {
  /** Preserved verbatim from the profile. Never downgraded. */
  requestedTarget: AccessibilityTarget;
  thresholds: ContrastThresholds;
  criteria: CriterionResult[];
  hardFailures: HardFailure[];
  /** Criteria that are mandatory at this target and could not be classified. */
  unclassifiedMandatory: CriterionResult[];
  failed: CriterionResult[];
  /**
   * The gate outcome. `false` on any failure; `"unknown"` when a MANDATORY
   * criterion could not be classified; `true` only when every mandatory criterion
   * actually passed.
   */
  gate: boolean | "unknown";
  /** 0-10 for the quality engine, or null when it cannot be scored honestly. */
  score: number | null;
  explanation: string;
}

/**
 * AAA-only observations. These are separate from `AccessibilityObservations`
 * because they are only ever required at AAA, and a project at AA must not be
 * asked to supply them.
 */
export interface AaaObservations {
  /** 1.4.6 — measured lowest ratio for body text. */
  lowestBodyTextContrast?: number;
  /** 1.4.6 — measured lowest ratio for large text. */
  lowestLargeTextContrast?: number;
  /** 2.5.5 — smallest interactive target. */
  smallestTargetCssPx?: number;
  /** 1.4.8 — visual presentation: line length, spacing, no justified text. */
  visualPresentationCompliant?: boolean;
  /** 2.4.9 — link purpose from the link text alone. */
  linkPurposeFromTextAlone?: boolean;
  /** 3.1.5 — reading level, or a supplemental plain-language version. */
  plainLanguageOrSupplementProvided?: boolean;
  /** 2.3.3 — motion animation from interactions can be disabled. */
  interactionMotionDisableable?: boolean;
  /** 1.2.6 — sign language for prerecorded audio, when such media exists. */
  signLanguageForPrerecordedAudio?: boolean | "no_such_media";
}

function statusFrom(
  value: boolean | undefined,
  mandatory: boolean,
): CriterionStatus {
  if (value === undefined) return mandatory ? "unknown" : "not_applicable";
  return value ? "pass" : "fail";
}

export function evaluateAccessibility(
  requestedTarget: AccessibilityTarget,
  /**
   * May be PARTIAL. An automated audit measures some criteria and not others; a
   * criterion whose fields are absent is `unknown`, exactly as if no evidence
   * existed for it. Supplying some observations never certifies the rest.
   */
  observations: Partial<AccessibilityObservations> | undefined,
  aaa: AaaObservations = {},
): AccessibilityEvaluation {
  const thresholds = thresholdsFor(requestedTarget);
  const isAaa = requestedTarget === "wcag_aaa_or_equivalent";
  const criteria: CriterionResult[] = [];

  // With no observations at all, every criterion is unknown. That is the honest
  // pre-build state and must not read as a pass.
  if (!observations) {
    const placeholder = (id: string, label: string, aaaOnly = false): CriterionResult => {
      const c: CriterionResult = {
        id,
        label,
        status: "unknown",
        mandatory: aaaOnly ? isAaa : true,
        machineMeasurable: true,
        detail: "no accessibility evidence has been collected",
      };
      if (aaaOnly) c.aaaOnly = true;
      return c;
    };
    criteria.push(
      placeholder("input_independence", "Primary task works without pointer, hover, drag or WebGL"),
      placeholder("focus_visible", "Focus visible and not obscured"),
      placeholder("contrast_body", `Body text contrast >= ${thresholds.bodyText}:1`),
      placeholder("logo_visibility", "Logo contrast in every active theme"),
      placeholder("reflow", "No loss at 320 CSS px or 400% zoom"),
      placeholder("media_alternatives", "Meaningful media has an alternative"),
      placeholder("reduced_motion", "Non-essential motion can be reduced"),
      placeholder("forms", "Forms labelled and recoverable"),
      placeholder("target_size", `Interactive targets >= ${thresholds.targetSizeCssPx} CSS px`),
    );
    if (isAaa) {
      criteria.push(
        placeholder("contrast_large_aaa", "Large text contrast >= 4.5:1 (1.4.6)", true),
        placeholder("visual_presentation", "Visual presentation (1.4.8)", true),
        placeholder("link_purpose", "Link purpose from text alone (2.4.9)", true),
        placeholder("plain_language", "Reading level or plain-language supplement (3.1.5)", true),
        placeholder("interaction_motion", "Interaction motion disableable (2.3.3)", true),
      );
    }
    const unclassifiedMandatory = criteria.filter((c) => c.mandatory && c.status === "unknown");
    return {
      requestedTarget,
      thresholds,
      criteria,
      hardFailures: [],
      unclassifiedMandatory,
      failed: [],
      gate: "unknown",
      score: null,
      explanation: `target "${requestedTarget}" is preserved, but no evidence exists, so ${unclassifiedMandatory.length} mandatory criteria are UNCLASSIFIED. An unclassified mandatory criterion is not a pass.`,
    };
  }

  // The §G.1 hard checks are the enforcement of: DD-020 (contrast, via the
  // target-derived thresholds), DD-077 (keyboard/pointer independence and
  // visible focus), DD-079 (target size, via thresholds.targetSizeCssPx) and
  // DD-080 (reducible motion). A failure here blocks production (DD-109).
  const hardFailures = checkHardFailures(observations, thresholds);

  const failureRules = new Set(hardFailures.map((f) => f.rule));
  const fromHardCheck = (id: HardCriterionId, label: string, rule: string): CriterionResult => {
    const missing = missingFieldsFor(id, observations);
    if (missing.length > 0) {
      return {
        id,
        label,
        status: "unknown",
        mandatory: true,
        machineMeasurable: true,
        detail: `not observed: ${missing.join(", ")} — the supplied evidence does not measure this criterion, so it is not a pass`,
      };
    }
    return {
      id,
      label,
      status: failureRules.has(rule) ? "fail" : "pass",
      mandatory: true,
      machineMeasurable: true,
      detail:
        hardFailures.find((f) => f.rule === rule)?.detail ??
        "measured, and no §G.1 failure recorded for this criterion",
    };
  };

  criteria.push(
    fromHardCheck(
      "input_independence",
      "Primary task works without pointer, hover, drag or WebGL",
      "primary_task_input_independence",
    ),
    fromHardCheck("focus_visible", "Focus visible and not obscured", "focus_visible_and_not_obscured"),
    fromHardCheck(
      "contrast_body",
      `Body text contrast >= ${thresholds.bodyText}:1`,
      "critical_text_contrast",
    ),
    fromHardCheck("logo_visibility", "Logo contrast in every active theme", "logo_visibility"),
    fromHardCheck("reflow", "No loss at 320 CSS px or 400% zoom", "reflow"),
    fromHardCheck("media_alternatives", "Meaningful media has an alternative", "media_alternatives"),
    fromHardCheck("reduced_motion", "Non-essential motion can be reduced", "reduced_motion"),
    fromHardCheck("forms", "Forms labelled and recoverable", "forms"),
    fromHardCheck(
      "target_size",
      `Interactive targets >= ${thresholds.targetSizeCssPx} CSS px`,
      "target_size",
    ),
  );

  // ---- AAA-only criteria. Mandatory ONLY when AAA was requested.
  if (isAaa) {
    const largeText = aaa.lowestLargeTextContrast;
    criteria.push({
      id: "contrast_large_aaa",
      label: "Large text contrast >= 4.5:1 (1.4.6)",
      status:
        largeText === undefined ? "unknown" : largeText >= thresholds.largeText ? "pass" : "fail",
      mandatory: true,
      machineMeasurable: true,
      aaaOnly: true,
      detail:
        largeText === undefined
          ? "no large-text contrast measurement supplied"
          : `measured ${largeText}:1 against a ${thresholds.largeText}:1 target`,
    });

    const aaaBooleans: Array<[string, string, boolean | undefined, boolean]> = [
      ["visual_presentation", "Visual presentation (1.4.8)", aaa.visualPresentationCompliant, true],
      ["link_purpose", "Link purpose from text alone (2.4.9)", aaa.linkPurposeFromTextAlone, false],
      [
        "plain_language",
        "Reading level or plain-language supplement (3.1.5)",
        aaa.plainLanguageOrSupplementProvided,
        false,
      ],
      [
        "interaction_motion",
        "Interaction motion disableable (2.3.3)",
        aaa.interactionMotionDisableable,
        true,
      ],
    ];
    for (const [id, label, value, machineMeasurable] of aaaBooleans) {
      criteria.push({
        id,
        label,
        status: statusFrom(value, true),
        mandatory: true,
        machineMeasurable,
        aaaOnly: true,
        detail:
          value === undefined
            ? machineMeasurable
              ? "measurable, but no observation supplied"
              : "requires human judgement; no assessment supplied"
            : value
              ? "observed compliant"
              : "observed non-compliant",
      });
    }

    if (aaa.signLanguageForPrerecordedAudio !== undefined) {
      criteria.push({
        id: "sign_language",
        label: "Sign language for prerecorded audio (1.2.6)",
        status:
          aaa.signLanguageForPrerecordedAudio === "no_such_media"
            ? "not_applicable"
            : aaa.signLanguageForPrerecordedAudio
              ? "pass"
              : "fail",
        mandatory: aaa.signLanguageForPrerecordedAudio !== "no_such_media",
        machineMeasurable: false,
        aaaOnly: true,
        detail:
          aaa.signLanguageForPrerecordedAudio === "no_such_media"
            ? "the site has no prerecorded audio, so the criterion does not apply"
            : "assessed",
      });
    }
  }

  const failed = criteria.filter((c) => c.status === "fail");
  const unclassifiedMandatory = criteria.filter((c) => c.mandatory && c.status === "unknown");

  // The gate. Order matters: a failure is worse than an absence.
  let gate: boolean | "unknown";
  let explanation: string;
  if (failed.length > 0) {
    gate = false;
    explanation = `target "${requestedTarget}": ${failed.length} criterion/criteria FAIL — ${failed
      .map((c) => c.id)
      .join(", ")}`;
  } else if (unclassifiedMandatory.length > 0) {
    gate = "unknown";
    explanation = `target "${requestedTarget}": no failures, but ${unclassifiedMandatory.length} MANDATORY criterion/criteria are unclassified (${unclassifiedMandatory
      .map((c) => c.id)
      .join(", ")}). An unclassified mandatory criterion may not be treated as a pass.`;
  } else {
    gate = true;
    explanation = `target "${requestedTarget}": every mandatory criterion passes at this level's thresholds (body ${thresholds.bodyText}:1, targets ${thresholds.targetSizeCssPx}px)`;
  }

  // Scoring. A score is only honest when the gate is decidable.
  let score: number | null;
  if (gate === "unknown") {
    score = null;
  } else if (failed.length > 0) {
    score = Math.max(0, 3 - failed.length);
  } else {
    score = requestedTarget === "wcag_aaa_or_equivalent" ? 10 : 9;
  }

  return {
    requestedTarget,
    thresholds,
    criteria,
    hardFailures,
    unclassifiedMandatory,
    failed,
    gate,
    score,
    explanation,
  };
}
