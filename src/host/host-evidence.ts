/**
 * HOST EVIDENCE MAPPING — raw host facts → tagged BuildEvidence.
 *
 * This is where facts become observations. The rules that keep it honest:
 *
 *   1. A value becomes `measured` only when the host actually observed it.
 *   2. A criterion the audit could not measure is OMITTED from the observation
 *      object, so the evaluator reports it `unknown`. Nothing is filled in.
 *   3. A partial measurement may prove a FAILURE, never a pass: where only part
 *      of a criterion is machine-checkable (WCAG 1.4.8, 2.4.9), a measured
 *      violation is recorded as `false`, and the absence of one leaves the
 *      criterion unknown for human assessment.
 *   4. When the evidence for a field is incomplete (a script that failed to load,
 *      contrast axe could not determine), the whole field is `unavailable` rather
 *      than computed from the part that happened to succeed.
 *
 * Policy stays where it was: `evaluateAccessibility` decides accessibility,
 * `assessQuality` decides every gate. This module only reports what was seen.
 */
import type { AccessibilityObservations } from "../accessibility/rules.js";
import type { AaaObservations } from "../accessibility/evaluate.js";
import {
  collectBuildEvidence,
  type BuildEvidenceBundle,
  type RawArtifacts,
  type TechnicalFacts,
  type WebVitalsFacts,
} from "../evidence/build-evidence.js";
import type { RawHostEvidence, RawPageAudit, RawSweepProfile, RawExperienceCheck, RawNavigationCheck, RawStaticPage } from "./raw-host-evidence.js";
import type { ResponsiveSweepFacts } from "../evidence/build-evidence.js";
import { TOUCH_TARGET_CSS_PX } from "../responsive/capabilities.js";

export type CoverageStatus =
  | "measured"
  | "failure_only"
  | "human_assessment_required"
  | "not_measured"
  | "not_applicable";

export interface CriterionCoverage {
  criterion: string;
  wcag: string;
  status: CoverageStatus;
  method: string;
  /** What the audit recorded for this criterion, in words. */
  observed: string;
}

export interface HostEvidenceResult {
  bundle: BuildEvidenceBundle;
  aaa: AaaObservations;
  coverage: CriterionCoverage[];
  /** axe violations for WCAG criteria the §G.1 evaluator does not model. Reported, not gated. */
  findingsOutsideEvaluator: Array<{ rule: string; route: string; help: string; nodes: number }>;
  /** Per delivered experience × engine × layer: what the browser probe measured and every failure, in words. */
  experiences: ExperienceCheckResult[];
  /** Compact navigation per engine × layer. */
  navigation: NavigationCheckResult[];
  /** Static layer failures, in words (empty when it was clean or not measured). */
  staticLayer: string[];
  notes: string[];
}

export interface ExperienceCheckResult {
  specId: string;
  type: string;
  route: string;
  engine: string;
  layer: string;
  works: boolean;
  /** Paths operated (examples, rule paths, no-match) and how many matched. */
  pathsOperated: number;
  pathsMatched: number;
  /** False when the accessibility tree gives a control or group no name, or the result no status role. */
  accessibleNames: boolean | null;
  keyboardCompletion: boolean | null;
  errorHandling: boolean | null;
  failures: string[];
}

/**
 * Policy for the experience probe's RAW facts. Failures are sorted into the gate
 * that already owns them — no second accessibility or technical system:
 *   keyboard completion failed        → input_independence (primaryTaskRequiresPointerOnly)
 *   error path not announced/focused  → forms (formsInaccessible)
 *   not enhanced, wrong result, reset broken, fallback missing, page errors → technical.experiencesWork
 */
export function mapExperienceChecks(checks: readonly RawExperienceCheck[]): ExperienceCheckResult[] {
  return checks.map((c) => {
    const failures: string[] = [];
    let keyboardCompletion: boolean | null = null;
    let errorHandling: boolean | null = null;
    if (c.pageErrors.length > 0) failures.push(`uncaught page error(s): ${c.pageErrors.join("; ")}`);
    if (c.noJs.fallbackTextLength === 0) failures.push("no static fallback text without JavaScript");
    if (!c.noJs.controlsDisabledOrAbsent) failures.push("controls are usable without JavaScript but cannot work without it");
    if (!c.noJs.noticeVisibleOrNotNeeded) failures.push("the no-JavaScript notice is not visible");
    if (c.narrow.pageOverflowPx > 1) failures.push(`page overflows by ${c.narrow.pageOverflowPx}px at 320 CSS px (RF-001)`);
    if (c.type === "comparison") {
      const t = c.comparison;
      if (!t || !t.regionFocusable || !t.regionNamed || !t.caption || t.scopedHeaders === 0) failures.push("comparison table lost its caption, scoped headers or labelled focusable scroll region");
    } else {
      if (!c.enhanced) failures.push("the enhancement did not start (data-experience-ready never set)");
      if (c.errorPath) {
        errorHandling = c.errorPath.summaryVisible && c.errorPath.fieldErrors > 0 && c.errorPath.invalidOrUnansweredFocused;
        if (!errorHandling) failures.push("submitting empty did not show a summary, per-field errors and focus on the first problem");
      } else if (c.enhanced) {
        errorHandling = false;
        failures.push("error path not exercised");
      }
      if (c.completion) {
        keyboardCompletion = c.completion.matched && c.completion.focusMovedToResult && c.completion.resultAnnounced;
        if (!c.completion.matched) failures.push(`keyboard completion produced "${c.completion.actual ?? "nothing"}", expected "${c.completion.expected}"`);
        if (!c.completion.focusMovedToResult) failures.push("focus did not move to the result");
        if (!c.completion.resultAnnounced) failures.push("the result is not in a live status region");
      } else if (c.enhanced) {
        keyboardCompletion = false;
        failures.push("keyboard completion not exercised");
      }
      if (c.reset && (!c.reset.cleared || !c.reset.focusReturned)) failures.push("reset did not clear the experience and return focus to its first control");
      if (c.clientNavigation?.attempted && !c.clientNavigation.enhanced) failures.push("after client-side navigation the experience was not enhanced");
    }
    // Every operated path, not only the first (Delivery G2).
    for (const p of c.paths) {
      if (!p.matched) failures.push(`path "${p.name}" produced "${p.actual ?? "nothing"}", expected "${p.expected}"`);
    }
    if (c.paths.some((p) => !p.matched || !p.focusMovedToResult || !p.resultAnnounced)) keyboardCompletion = false;
    if (c.invalidInput && (!c.invalidInput.errorShown || !c.invalidInput.fieldMarkedInvalid || !c.invalidInput.noResult)) {
      failures.push("an out-of-range input did not show an error, mark the field invalid and withhold the result");
      errorHandling = false;
    }
    let accessibleNames: boolean | null = null;
    if (c.axTree?.available) {
      accessibleNames = c.axTree.unnamedControls.length === 0 && c.axTree.unnamedGroups === 0 && c.axTree.statusRegions > 0;
      if (!accessibleNames) {
        failures.push(`accessibility tree: ${c.axTree.unnamedControls.length} unnamed control(s), ${c.axTree.unnamedGroups} unnamed group(s), ${c.axTree.statusRegions} status region(s)`);
      }
    }
    return {
      specId: c.specId,
      type: c.type,
      route: c.route,
      engine: c.engine,
      layer: c.layer,
      works: failures.length === 0,
      pathsOperated: c.paths.length,
      pathsMatched: c.paths.filter((p) => p.matched).length,
      accessibleNames,
      keyboardCompletion,
      errorHandling,
      failures: failures.map((f) => `[${c.engine}/${c.layer}] ${f}`),
    };
  });
}

/** axe rules whose results feed an evaluator criterion. Everything else is reported separately. */
const AXE_RULES_BY_CRITERION: Record<string, readonly string[]> = {
  media_alternatives: ["image-alt", "input-image-alt", "role-img-alt", "svg-img-alt", "object-alt", "area-alt", "video-caption", "audio-caption"],
  forms: ["label", "select-name", "autocomplete-valid", "form-field-multiple-labels", "aria-input-field-name"],
  contrast_body: ["color-contrast", "color-contrast-enhanced"],
  input_independence: ["scrollable-region-focusable", "nested-interactive", "frame-focusable-content"],
  target_size: ["target-size"],
};
const MAPPED_AXE_RULES = new Set(Object.values(AXE_RULES_BY_CRITERION).flat());

/** Link texts that cannot state a purpose on their own (2.4.9 failure signals). */
const GENERIC_LINK_TEXT = /^(click here|here|read more|more|learn more|this|link|go)$/i;

/** WCAG large text: >= 18pt (24px), or >= 14pt (18.67px) bold. */
function isLarge(sample: { fontSizePx: number; bold: boolean }): boolean {
  return sample.fontSizePx >= 24 || (sample.bold && sample.fontSizePx >= 18.66);
}

function min(values: number[]): number | undefined {
  return values.length > 0 ? Math.min(...values) : undefined;
}

/** Map the audit pages to PARTIAL observations plus a coverage table. */
export function mapAudit(pages: readonly RawPageAudit[]): {
  observations: Partial<AccessibilityObservations>;
  aaa: AaaObservations;
  coverage: CriterionCoverage[];
  findingsOutsideEvaluator: HostEvidenceResult["findingsOutsideEvaluator"];
} {
  const obs: Partial<AccessibilityObservations> = {};
  const aaa: AaaObservations = {};
  const coverage: CriterionCoverage[] = [];
  const violations = (ids: readonly string[]) =>
    pages.flatMap((p) => p.axe.violations.filter((v) => ids.includes(v.id)).map((v) => ({ route: p.route, v })));
  const incomplete = (ids: readonly string[]) =>
    pages.reduce((n, p) => n + p.axe.incomplete.filter((i) => ids.includes(i.id)).reduce((m, i) => m + i.nodeCount, 0), 0);

  // ---- input independence (2.1.1 keyboard, 2.5.1/2.5.7 pointer, WebGL, device motion)
  const unreachable = pages.flatMap((p) => p.keyboard.unreachable.map((t) => `${p.route} ${t}`));
  const cycleIncomplete = pages.filter((p) => !p.keyboard.completedCycle && p.keyboard.unreachable.length > 0);
  obs.primaryTaskRequiresPointerOnly =
    unreachable.length > 0 ||
    pages.some((p) => p.pointer.nonNativeInteractiveWithoutTabindex > 0) ||
    violations(AXE_RULES_BY_CRITERION["input_independence"] ?? []).length > 0;
  obs.primaryTaskRequiresHover = pages.some((p) => p.pointer.hoverRevealed.length > 0);
  obs.primaryTaskRequiresDrag = pages.some((p) => p.pointer.draggableCount > 0);
  obs.primaryTaskRequiresDeviceMotion = pages.some((p) => p.pointer.deviceMotionListeners > 0);
  obs.primaryTaskRequiresWebgl = pages.some((p) => p.pointer.webglContexts > 0);
  coverage.push({
    criterion: "input_independence",
    wcag: "2.1.1, 2.5.1, 2.5.7",
    status: "measured",
    method:
      "Tab walk over every visible enabled focusable element; hover each and diff visible element count; count draggable elements, WebGL contexts created and devicemotion/deviceorientation listeners registered; axe keyboard rules. Limit: React's delegated click handlers on non-focusable elements cannot be attributed, so only role/onclick attributes are counted.",
    observed: `${pages.reduce((n, p) => n + p.keyboard.reachedCount, 0)}/${pages.reduce((n, p) => n + p.keyboard.focusableCount, 0)} focusable reached; ${unreachable.length} unreachable${cycleIncomplete.length ? ` (${cycleIncomplete.length} page(s) did not complete a Tab cycle)` : ""}; hover reveals ${pages.reduce((n, p) => n + p.pointer.hoverRevealed.length, 0)} of ${pages.reduce((n, p) => n + p.pointer.hoverChecked, 0)} checked; drag ${pages.reduce((n, p) => n + p.pointer.draggableCount, 0)}; WebGL ${pages.reduce((n, p) => n + p.pointer.webglContexts, 0)}; device motion ${pages.reduce((n, p) => n + p.pointer.deviceMotionListeners, 0)}`,
  });

  // ---- focus visible and not obscured (2.4.7, 2.4.11)
  const stops = pages.flatMap((p) => p.keyboard.stops.map((s) => ({ route: p.route, ...s })));
  if (stops.length > 0) {
    obs.focusVisible = stops.every((s) => s.outlineVisible);
    obs.focusObscuredBySticky = stops.some((s) => s.obscured);
    coverage.push({
      criterion: "focus_visible",
      wcag: "2.4.7, 2.4.11",
      status: "measured",
      method: "at every Tab stop: computed outline or box-shadow present, and elementFromPoint at the element's centre returns the element (not covering chrome)",
      observed: `${stops.length} stops; ${stops.filter((s) => !s.outlineVisible).length} without a visible indicator; ${stops.filter((s) => s.obscured).length} obscured`,
    });
  } else {
    coverage.push({ criterion: "focus_visible", wcag: "2.4.7, 2.4.11", status: "not_measured", method: "Tab walk", observed: "no focus stops were recorded" });
  }

  // ---- contrast (1.4.3 / 1.4.6)
  const contrastIncomplete = incomplete(AXE_RULES_BY_CRITERION["contrast_body"] ?? []);
  const samples = pages.flatMap((p) => p.contrast);
  const body = samples.filter((s) => !isLarge(s)).map((s) => s.ratio);
  const large = samples.filter(isLarge).map((s) => s.ratio);
  if (contrastIncomplete === 0 && body.length > 0) {
    obs.lowestCriticalTextContrast = min(body);
    if (large.length > 0) aaa.lowestLargeTextContrast = min(large);
    coverage.push({
      criterion: "contrast_body",
      wcag: "1.4.3, 1.4.6",
      status: "measured",
      method: "axe color-contrast and color-contrast-enhanced in a real browser; every text node's computed ratio, split into large and normal text by WCAG size",
      observed: `${body.length} normal-text samples, lowest ${min(body)}:1; ${large.length} large-text samples, lowest ${min(large) ?? "n/a"}:1`,
    });
  } else {
    coverage.push({
      criterion: "contrast_body",
      wcag: "1.4.3, 1.4.6",
      status: "not_measured",
      method: "axe color-contrast / color-contrast-enhanced",
      observed:
        contrastIncomplete > 0
          ? `axe could not determine contrast for ${contrastIncomplete} node(s) (e.g. background images or overlap); a partial minimum is not reported as the minimum`
          : "no text samples were recorded",
    });
  }
  coverage.push({
    criterion: "contrast_large_aaa",
    wcag: "1.4.6",
    status: aaa.lowestLargeTextContrast !== undefined ? "measured" : "not_measured",
    method: "the large-text subset of the same axe contrast samples",
    observed: aaa.lowestLargeTextContrast !== undefined ? `lowest ${aaa.lowestLargeTextContrast}:1` : "no determinable large-text sample",
  });

  // ---- logo visibility (framework rule, stricter than WCAG)
  const logos = pages.reduce((n, p) => n + p.logoImages, 0);
  if (logos === 0) {
    obs.lowestLogoContrast = null;
    coverage.push({
      criterion: "logo_visibility",
      wcag: "framework rule (WCAG exempts logotypes)",
      status: "not_applicable",
      method: "count of logo images in the site header",
      observed: "no logo image is rendered; the wordmark is text and is covered by the contrast measurement",
    });
  } else {
    coverage.push({
      criterion: "logo_visibility",
      wcag: "framework rule",
      status: "human_assessment_required",
      method: "a logo IMAGE's colours against its backdrop cannot be read from the DOM",
      observed: `${logos} logo image(s) present; not measured`,
    });
  }

  // ---- reflow (1.4.10) at 320 CSS px, which WCAG defines as equivalent to 400% zoom at 1280
  const reflowLost = pages.filter(
    (p) => p.reflow.scrollWidth > p.reflow.clientWidth + 1 || p.reflow.narrowTextLength < p.reflow.wideTextLength * 0.98,
  );
  obs.coreContentLostAt320 = reflowLost.length > 0;
  obs.coreContentLostAt400Zoom = reflowLost.length > 0;
  coverage.push({
    criterion: "reflow",
    wcag: "1.4.10",
    status: "measured",
    method: "each page loaded at a 320 CSS px viewport: horizontal overflow (scrollWidth > clientWidth) and rendered text length compared with the 1280 px render. 400% zoom of a 1280 px window IS a 320 CSS px viewport, so one measurement serves both fields",
    observed: reflowLost.length === 0 ? "no overflow and no text lost on any page" : `content lost or overflowing on ${reflowLost.map((p) => p.route).join(", ")}`,
  });

  // ---- media alternatives (1.1.1, 1.2.x)
  const mediaViolations = violations(AXE_RULES_BY_CRITERION["media_alternatives"] ?? []);
  const mediaIncomplete = incomplete(AXE_RULES_BY_CRITERION["media_alternatives"] ?? []);
  const timedMedia = pages.reduce((n, p) => n + p.media.video + p.media.audio, 0);
  if (mediaIncomplete === 0) {
    obs.meaningfulMediaWithoutAlternative = mediaViolations.flatMap(({ route, v }) => v.nodes.map((n) => `${route} ${n.target}`));
    coverage.push({
      criterion: "media_alternatives",
      wcag: "1.1.1, 1.2.2",
      status: "measured",
      method: "axe image-alt, svg-img-alt, role-img-alt, input-image-alt, object-alt, video-caption, audio-caption",
      observed: `${pages.reduce((n, p) => n + p.media.img + p.media.svgImg, 0)} images, ${timedMedia} audio/video; ${obs.meaningfulMediaWithoutAlternative.length} without an alternative`,
    });
  } else {
    coverage.push({
      criterion: "media_alternatives",
      wcag: "1.1.1, 1.2.2",
      status: "human_assessment_required",
      method: "axe media rules",
      observed: `axe needs review for ${mediaIncomplete} media node(s); captions and alternatives must be checked by a person`,
    });
  }

  // ---- reduced motion (2.3.3 / §G.1)
  const motionPersists = pages.filter(
    (p) => p.motion.reduce.longestTransitionMs > 10 || p.motion.reduce.longestAnimationMs > 10 || p.motion.reduce.runningAnimations > 0,
  );
  obs.nonEssentialMotionCannotBeReduced = motionPersists.length > 0;
  aaa.interactionMotionDisableable = motionPersists.length === 0;
  coverage.push({
    criterion: "reduced_motion",
    wcag: "2.3.3",
    status: "measured",
    method: "pages loaded with prefers-reduced-motion: reduce emulated; longest computed CSS transition and animation durations, and running Web Animations, across every element. Limit: motion driven by requestAnimationFrame is not visible to this check",
    observed:
      motionPersists.length === 0
        ? `no CSS or Web Animation motion persists under reduce (longest without the preference: ${Math.max(...pages.map((p) => p.motion.noPreference.longestTransitionMs), 0)}ms)`
        : `motion persists under reduce on ${motionPersists.map((p) => p.route).join(", ")}`,
  });
  coverage.push({
    criterion: "interaction_motion",
    wcag: "2.3.3",
    status: "measured",
    method: "the same reduced-motion measurement",
    observed: aaa.interactionMotionDisableable ? "interaction motion is disabled under the preference" : "motion persists",
  });

  // ---- forms (1.3.1, 3.3.1, 3.3.2, 4.1.3)
  const forms = pages.flatMap((p) => p.forms.map((f) => ({ route: p.route, ...f })));
  const formAxe = violations(AXE_RULES_BY_CRITERION["forms"] ?? []);
  obs.formsInaccessible =
    formAxe.length > 0 ||
    forms.some((f) => f.unlabelledFields.length > 0 || f.describedByMissing.length > 0 || !f.hasStatusRegion);
  coverage.push({
    criterion: "forms",
    wcag: "1.3.1, 1.3.5, 3.3.2, 4.1.3",
    status: "measured",
    method: "every field has a programmatic label, every aria-describedby target exists, every form has a status region; axe label, select-name and autocomplete-valid. Limit: the wording and timing of runtime error messages needs a submission path and a person",
    observed: `${forms.length} form(s), ${forms.filter((f) => f.disabled).length} disabled (endpoint unconfigured); ${forms.reduce((n, f) => n + f.unlabelledFields.length, 0)} unlabelled fields; ${formAxe.length} axe form violation(s)`,
  });

  // ---- target size (2.5.8 AA / 2.5.5 AAA): smallest non-inline target
  const targets = pages.flatMap((p) => p.targets.filter((t) => !t.inlineInText));
  if (targets.length > 0) {
    const smallest = targets.reduce((a, b) => (Math.min(a.width, a.height) <= Math.min(b.width, b.height) ? a : b));
    obs.smallestTargetCssPx = Math.floor(Math.min(smallest.width, smallest.height));
    coverage.push({
      criterion: "target_size",
      wcag: "2.5.8, 2.5.5",
      status: "measured",
      method: "bounding box of every visible enabled interactive element; links inline in a sentence are excluded, per the WCAG inline exception",
      observed: `${targets.length} targets; smallest ${obs.smallestTargetCssPx}px (${smallest.target})`,
    });
  } else {
    coverage.push({ criterion: "target_size", wcag: "2.5.8, 2.5.5", status: "not_measured", method: "bounding boxes", observed: "no targets recorded" });
  }

  // ---- AAA 1.4.8 visual presentation: a measured violation is a fail; otherwise human
  const vp = pages.map((p) => p.visualPresentation);
  const justified = vp.reduce((n, v) => n + v.justifiedBlocks, 0);
  const minLineHeight = min(vp.map((v) => v.minLineHeightRatio).filter((v): v is number => v !== null));
  const maxLine = vp.map((v) => v.maxLineLengthCh).filter((v): v is number => v !== null);
  const longestLine = maxLine.length > 0 ? Math.max(...maxLine) : undefined;
  const vpFails = justified > 0 || (minLineHeight !== undefined && minLineHeight < 1.5) || (longestLine !== undefined && longestLine > 80);
  if (vpFails) aaa.visualPresentationCompliant = false;
  coverage.push({
    criterion: "visual_presentation",
    wcag: "1.4.8",
    status: vpFails ? "failure_only" : "human_assessment_required",
    method: "measured: justified text, line-height ratio >= 1.5, line length <= 80 characters. NOT measurable here: that users can select foreground and background colours, and that 200% text resize needs no horizontal scrolling in a reading window",
    observed: `${justified} justified blocks; minimum line-height ratio ${minLineHeight?.toFixed(2) ?? "n/a"}; longest line ${longestLine?.toFixed(0) ?? "n/a"}ch${vpFails ? " — a measured violation" : " — no violation measured, remainder needs a person"}`,
  });

  // ---- AAA 2.4.9 link purpose: generic text is a fail; otherwise human
  const generic = pages.flatMap((p) => p.links.filter((l) => GENERIC_LINK_TEXT.test(l.text.trim())).map((l) => `${p.route} "${l.text}"`));
  if (generic.length > 0) aaa.linkPurposeFromTextAlone = false;
  coverage.push({
    criterion: "link_purpose",
    wcag: "2.4.9",
    status: generic.length > 0 ? "failure_only" : "human_assessment_required",
    method: "link texts checked against generic phrases; whether each remaining text identifies its purpose is a human judgement",
    observed: generic.length > 0 ? `generic link text: ${generic.join(", ")}` : `${pages.reduce((n, p) => n + p.links.length, 0)} links, none generic; purpose still needs a person`,
  });

  // ---- AAA 3.1.5 reading level: human
  coverage.push({
    criterion: "plain_language",
    wcag: "3.1.5",
    status: "human_assessment_required",
    method: "reading level depends on the language, audience and meaning of the copy; not machine-certified here",
    observed: "not assessed",
  });

  // ---- AAA 1.2.6 sign language: not applicable when no timed media exists
  if (timedMedia === 0) {
    aaa.signLanguageForPrerecordedAudio = "no_such_media";
    coverage.push({ criterion: "sign_language", wcag: "1.2.6", status: "not_applicable", method: "count of audio and video elements", observed: "no prerecorded audio or video on any page" });
  } else {
    coverage.push({ criterion: "sign_language", wcag: "1.2.6", status: "human_assessment_required", method: "count of audio and video elements", observed: `${timedMedia} timed media element(s)` });
  }

  const findingsOutsideEvaluator = pages.flatMap((p) =>
    p.axe.violations
      .filter((v) => !MAPPED_AXE_RULES.has(v.id))
      .map((v) => ({ rule: v.id, route: p.route, help: v.help, nodes: v.nodes.length })),
  );

  return { observations: obs, aaa, coverage, findingsOutsideEvaluator };
}

/**
 * Is this console error BLOCKING? One narrowly defined exception: a browser's
 * IMPLICIT request for /favicon.ico that 404s when the page declares no icon.
 * Browsers make that request on their own; it breaks no page and no task. It is
 * still recorded as a technical warning, and the missing icon asset is reported.
 * Every other console error — including any 404 for a resource the page itself
 * references — blocks.
 */
export function isBlockingConsoleError(
  error: { text: string; url: string },
  declaredIcons: readonly string[],
  favicon: { pageInitiatedRequest: boolean; htmlReference: boolean; scriptReference: boolean },
): boolean {
  let path = "";
  try {
    path = new URL(error.url).pathname;
  } catch {
    path = "";
  }
  // Every condition must be PROVEN: no page declares an icon, the page itself
  // never requested /favicon.ico, no served HTML or application script names it,
  // and the response was a 404. Anything less is an ordinary, blocking error.
  const implicitFavicon =
    path === "/favicon.ico" &&
    declaredIcons.length === 0 &&
    !favicon.pageInitiatedRequest &&
    !favicon.htmlReference &&
    !favicon.scriptReference &&
    /status of 404/.test(error.text);
  return !implicitFavicon;
}

/**
 * Responsive sweep → facts. Failures are named with their RF-xxx pattern:
 * RF-001 overflow, RF-006 touch target, and content lost without JavaScript.
 */
export function mapResponsiveSweep(profiles: readonly RawSweepProfile[]): ResponsiveSweepFacts {
  const withJs = profiles.find((p) => p.name === "Desktop Chrome" && p.available);
  return {
    profiles: profiles.map((p) => {
      const failures: string[] = [];
      for (const page of p.pages) {
        if (page.status !== 200) failures.push(`${page.route}: HTTP ${page.status}`);
        if (page.overflowPx > 1) failures.push(`${page.route}: horizontal overflow of ${page.overflowPx}px (RF-001)`);
        if (p.hasTouch && page.smallestTouchTargetPx !== null && page.smallestTouchTargetPx < TOUCH_TARGET_CSS_PX) {
          failures.push(`${page.route}: touch target ${page.smallestTouchTargetPx}px < ${TOUCH_TARGET_CSS_PX}px (RF-006): ${page.smallTouchTargets.slice(0, 3).join(", ")}`);
        }
        if (!p.javaScriptEnabled && withJs) {
          const reference = withJs.pages.find((r) => r.route === page.route);
          if (reference && page.textLength < reference.textLength * 0.98) {
            failures.push(`${page.route}: ${reference.textLength - page.textLength} characters of content missing without JavaScript`);
          }
        }
      }
      return { name: p.name, engine: p.engine, mandatory: p.mandatory, available: p.available, reason: p.reason, pagesChecked: p.pages.length, failures };
    }),
  };
}

/** Planned facts the host was generated from, needed to judge its evidence. */
export interface HostExpectations {
  plannedRoutes: readonly string[];
  notFoundMarker: string;
  /** Delivered experiences the host manifest asked the browser to operate. */
  experienceSpecIds?: readonly string[];
  /** True when compact navigation was delivered and must be operated (P1-4). */
  compactNavigation?: boolean;
  /** Routes of the static layer the host serves (Delivery G4). */
  staticRoutes?: readonly string[];
}

export interface NavigationCheckResult {
  engine: string;
  layer: string;
  works: boolean;
  keyboardOperable: boolean;
  failures: string[];
}

/** Compact navigation's RAW facts → failures in words, sorted into existing gates by the caller. */
export function mapNavigationChecks(checks: readonly RawNavigationCheck[]): NavigationCheckResult[] {
  return checks.map((c) => {
    const failures: string[] = [];
    const p = c.phone;
    if (c.pageErrors.length > 0) failures.push(`uncaught page error(s): ${c.pageErrors.join("; ")}`);
    if (!p) failures.push("phone check did not run");
    else {
      if (!p.initiallyClosed) failures.push("on a phone the menu is not initially closed behind its Menu button");
      if (!p.h1OnFirstScreen) failures.push(`the page heading is not on the first screen (top ${p.h1TopPx ?? "?"}px)`);
      if (!p.keyboardOpens) failures.push("the Menu button does not open every route by keyboard");
      if (!p.routeParity) failures.push("the compact menu does not list the same routes as the full navigation");
      if (!p.closeVisible) failures.push("no visible Close control in the open menu");
      if (!p.tabReachesMenu) failures.push("Tab from the Menu button does not reach the menu");
      if (!p.escapeCloses) failures.push("Escape does not close the menu");
      if (!p.focusReturnsToToggle) failures.push("focus does not return to the Menu button on Escape");
      if (!p.closeButtonCloses) failures.push("the Close button does not close the menu");
    }
    if (!c.desktop || !c.desktop.listVisible || !c.desktop.buttonsHidden || !c.desktop.routeParity) failures.push("at desktop width the full list is not shown without the compact buttons");
    if (!c.noJs?.keyboardOpens) failures.push("without JavaScript the Menu button does not open the menu");
    const keyboardOperable = Boolean(p && p.keyboardOpens && p.tabReachesMenu && p.escapeCloses && p.closeButtonCloses && c.noJs?.keyboardOpens);
    return { engine: c.engine, layer: c.layer, works: failures.length === 0, keyboardOperable, failures: failures.map((f) => `[${c.engine}/${c.layer}] ${f}`) };
  });
}

/** Static layer RAW facts → failures in words. */
export function mapStaticLayer(pages: readonly RawStaticPage[]): string[] {
  const failures: string[] = [];
  for (const p of pages) {
    if (p.status !== 200) failures.push(`static ${p.route}: HTTP ${p.status}`);
    if (p.pageErrors.length > 0) failures.push(`static ${p.route}: uncaught page error(s) ${p.pageErrors.join("; ")}`);
    if (p.axeViolations.length > 0) failures.push(`static ${p.route}: axe ${p.axeViolations.map((v) => `${v.id}×${v.nodes}`).join(", ")}`);
    if (p.overflowPx320 > 1) failures.push(`static ${p.route}: overflows by ${p.overflowPx320}px at 320 CSS px (RF-001)`);
  }
  return failures;
}

/**
 * Turn a parsed raw host evidence file into the core's tagged evidence bundle
 * and AAA observations.
 */
export function hostEvidenceToBuildEvidence(raw: RawHostEvidence, expected: HostExpectations): HostEvidenceResult {
  const notes: string[] = [];
  const artifacts: RawArtifacts = { observedAt: raw.collectedAt, technicalScope: "full_production_build", sources: {} };
  const sources = artifacts.sources ?? {};

  // ---- dependencies: what the host DECLARES and actually INSTALLED
  const installed = (name: string) => raw.install.installedVersions[name] !== null && raw.install.installedVersions[name] !== undefined;
  artifacts.dependencies = Object.keys(raw.install.declaredDependencies).filter(installed);
  artifacts.toolchain = Object.keys(raw.install.declaredDevDependencies).filter(installed);

  // ---- served HTML and route inventory
  const served = raw.routes.filter((r) => r.status === 200);
  if (raw.server.started && served.length > 0) {
    artifacts.servedHtml = Object.fromEntries(served.map((r) => [r.route, r.html]));
    sources.servedHtml = `fetched from the production server (next start) at ${raw.server.url} with JavaScript not executed; ${served.length}/${raw.routes.length} routes responded 200`;
  }
  if (raw.builtRoutes) {
    artifacts.builtRoutes = raw.builtRoutes;
    sources.routeInventory = "read from .next/app-path-routes-manifest.json written by the production build";
  }

  // ---- bundles: gzipped bytes of every external script each served page loads
  const incompleteRoutes = raw.routes.filter((r) => r.status !== 200 || r.scripts.some((s) => s.status !== 200));
  if (raw.server.started && raw.routes.length > 0 && incompleteRoutes.length === 0) {
    artifacts.buildManifest = {
      routes: Object.fromEntries(
        raw.routes.map((r) => [r.route, { firstLoadJsKb: Math.round((r.scripts.reduce((n, s) => n + s.gzipBytes, 0) / 1024) * 10) / 10 }]),
      ),
    };
    sources.bundles =
      "MEASURED: gzipped bytes of every external <script src> each served page loads, fetched from the production server (the first-load JS definition Next.js reports). Inline RSC payload scripts are recorded separately and not counted";
  } else if (raw.routes.length > 0) {
    notes.push(`bundles unavailable: ${incompleteRoutes.length} route(s) had a non-200 page or script, so a per-route total would understate`);
  }

  // ---- technical: every field needs its own measurement, or the whole record is withheld
  const auditPages = raw.audit.available ? raw.audit.pages : [];
  const consoleKnown = raw.audit.available && auditPages.length === expected.plannedRoutes.length;
  const expectedExperiences = expected.experienceSpecIds ?? [];
  const experienceResults = mapExperienceChecks(raw.experiences.checks);
  // The operation matrix: every expected experience must be operated in BOTH
  // engines against BOTH layers. A combination that did not run is unmeasured,
  // never a pass (Delivery G3/G4).
  const combos = [
    ["chromium", "next"],
    ["webkit", "next"],
    ["chromium", "static"],
    ["webkit", "static"],
  ] as const;
  const missingCombos = expectedExperiences.flatMap((id) =>
    combos.filter(([engine, layer]) => !raw.experiences.checks.some((c) => c.specId === id && c.engine === engine && c.layer === layer)).map(([engine, layer]) => `${id} ${engine}/${layer}`),
  );
  const experiencesKnown = expectedExperiences.length === 0 || (raw.experiences.available && missingCombos.length === 0);
  if (!experiencesKnown) {
    const why = [raw.experiences.reason, ...raw.matrix.engines.filter((e) => !e.available).map((e) => `${e.name}: ${e.reason}`), ...raw.matrix.layers.filter((l) => !l.available).map((l) => `${l.name} layer: ${l.reason}`)].filter(Boolean).join("; ");
    notes.push(`experience behaviour unmeasured (${why || `missing ${missingCombos.join(", ")}`}): technical facts withheld, because a delivered experience that was never operated cannot count as working`);
  }
  const navigationResults = mapNavigationChecks(raw.navigation.checks);
  const navigationMissing = expected.compactNavigation
    ? combos.filter(([engine, layer]) => !raw.navigation.checks.some((c) => c.engine === engine && c.layer === layer)).map(([e, l]) => `${e}/${l}`)
    : [];
  const navigationKnown = !expected.compactNavigation || (raw.navigation.available && navigationMissing.length === 0);
  if (!navigationKnown) {
    notes.push(`compact navigation unmeasured (${raw.navigation.reason ?? `missing ${navigationMissing.join(", ")}`}): technical facts withheld`);
  }
  const staticExpected = (expected.staticRoutes ?? []).length > 0;
  const staticFailures = mapStaticLayer(raw.staticLayer.pages);
  const staticKnown = !staticExpected || (raw.staticLayer.available && (expected.staticRoutes ?? []).every((r) => raw.staticLayer.pages.some((p) => p.route === r)));
  if (!staticKnown) {
    notes.push(`static layer unmeasured (${raw.staticLayer.reason ?? "pages missing"}): technical facts withheld`);
  }
  if (raw.steps.build.ran && raw.steps.typecheck.ran && raw.steps.lint.ran && consoleKnown && raw.notFoundProbe && experiencesKnown && navigationKnown && staticKnown) {
    const plannedOk = expected.plannedRoutes.every((route) => raw.routes.some((r) => r.route === route && r.status === 200));
    const technical: TechnicalFacts = {
      buildPasses: raw.steps.build.exitCode === 0,
      typecheckPasses: raw.steps.typecheck.exitCode === 0,
      lintPasses: raw.steps.lint.exitCode === 0,
      noBlockingConsoleErrors: auditPages.every(
        (p) => p.pageErrors.length === 0 && p.consoleErrors.every((e) => !isBlockingConsoleError(e, p.declaredIcons, p.faviconEvidence)),
      ),
      primaryRoutesWork: raw.server.started && plannedOk,
      loadingErrorNotFoundStatesExist:
        raw.stateFiles.notFound && raw.stateFiles.error && raw.stateFiles.loading &&
        raw.notFoundProbe.status === 404 && raw.notFoundProbe.hasNotFoundMarker,
      noExposedSecrets: raw.secretScan.findings.length === 0,
      ...(expectedExperiences.length > 0 ? { experiencesWork: experienceResults.every((r) => r.works) } : {}),
      ...(expected.compactNavigation ? { navigationWorks: navigationResults.every((r) => r.works) } : {}),
      ...(staticExpected ? { staticLayerWorks: staticFailures.length === 0 } : {}),
      warnings: [
        ...navigationResults.flatMap((r) => r.failures.map((f) => `compact navigation: ${f}`)),
        ...staticFailures,
        ...experienceResults.flatMap((r) => r.failures.map((f) => `experience ${r.specId} on ${r.route}: ${f}`)),
        ...(raw.lint && raw.lint.warningCount > 0 ? [`lint reported ${raw.lint.warningCount} warning(s)`] : []),
        ...auditPages.flatMap((p) =>
          p.consoleErrors.map(
            (e) => `${p.route}: ${isBlockingConsoleError(e, p.declaredIcons, p.faviconEvidence) ? "BLOCKING" : "non-blocking (browser-automatic favicon request: no icon declared, not requested by the page, not referenced in served HTML or scripts)"} console error "${e.text}" from ${e.url}`,
          ),
        ),
        ...auditPages.flatMap((p) => p.pageErrors.map((e) => `${p.route}: BLOCKING uncaught page error "${e}"`)),
      ],
    };
    artifacts.technical = technical;
    sources.technical = `next build exit ${raw.steps.build.exitCode}, tsc --noEmit exit ${raw.steps.typecheck.exitCode}, eslint exit ${raw.steps.lint.exitCode}; console errors from a real browser on ${auditPages.length} page(s); not-found probe HTTP ${raw.notFoundProbe.status}; secret scan over ${raw.secretScan.filesScanned} build file(s)`;
  } else {
    notes.push(
      "technical facts withheld: every field needs its own measurement (build, typecheck, lint, browser console on every planned page, not-found probe), and at least one did not run",
    );
  }

  // ---- accessibility audit
  let aaa: AaaObservations = {};
  let coverage: CriterionCoverage[] = [];
  let findingsOutsideEvaluator: HostEvidenceResult["findingsOutsideEvaluator"] = [];
  if (raw.audit.available && auditPages.length > 0) {
    const mapped = mapAudit(auditPages);
    // Experience failures enter the criteria that already own them (never a second a11y system).
    if (navigationResults.some((r) => !r.keyboardOperable)) {
      mapped.observations.primaryTaskRequiresPointerOnly = true;
      notes.push(`input_independence: the compact navigation could not be operated by keyboard (${navigationResults.filter((r) => !r.keyboardOperable).map((r) => `${r.engine}/${r.layer}`).join(", ")})`);
    }
    if (experienceResults.some((r) => r.accessibleNames === false)) {
      mapped.observations.formsInaccessible = true;
      notes.push(`forms: the accessibility tree gives a delivered experience's control or group no name (${experienceResults.filter((r) => r.accessibleNames === false).map((r) => r.specId).join(", ")})`);
    }
    if (experienceResults.some((r) => r.keyboardCompletion === false)) {
      mapped.observations.primaryTaskRequiresPointerOnly = true;
      notes.push(`input_independence: a delivered experience could not be completed by keyboard (${experienceResults.filter((r) => r.keyboardCompletion === false).map((r) => r.specId).join(", ")})`);
    }
    if (experienceResults.some((r) => r.errorHandling === false)) {
      mapped.observations.formsInaccessible = true;
      notes.push(`forms: a delivered experience did not announce and focus its errors (${experienceResults.filter((r) => r.errorHandling === false).map((r) => r.specId).join(", ")})`);
    }
    if (experienceResults.length > 0) {
      mapped.coverage.push({
        criterion: "experience_operation",
        wcag: "2.1.1, 3.3.1, 4.1.3",
        status: "measured",
        method: "each delivered experience operated in Chromium AND WebKit against the Next.js AND static layers: empty submit (errors, summary, focus), keyboard completion of EVERY owner example / rule path / the no-match path, an out-of-range input, reset/restart, JavaScript disabled, 320 CSS px, client-side navigation (Next.js), and the Chromium accessibility tree",
        observed: experienceResults.map((r) => `${r.specId}: ${r.works ? "works" : r.failures.join("; ")}`).join(" | "),
      });
    }
    artifacts.accessibility = mapped.observations;
    aaa = mapped.aaa;
    coverage = mapped.coverage;
    findingsOutsideEvaluator = mapped.findingsOutsideEvaluator;
    sources.accessibility = `axe-core ${auditPages[0]?.axe.version ?? "?"} plus DOM measurements in ${raw.host.browser?.version ?? "a browser"} on ${auditPages.length} page(s); criteria absent from these observations were not measured and stay unknown`;
    if (auditPages.length < expected.plannedRoutes.length) {
      notes.push(`accessibility audit covered ${auditPages.length} of ${expected.plannedRoutes.length} planned pages`);
    }
  } else {
    notes.push(`accessibility audit unavailable: ${raw.audit.reason ?? "no pages audited"}`);
  }

  // ---- lab vitals: LCP, CLS and INP each need a real sample
  if (raw.vitals.available && raw.vitals.pages.length > 0) {
    const lcps = raw.vitals.pages.map((p) => p.lcpMs).filter((v): v is number => v !== null);
    const interactions = raw.vitals.pages.flatMap((p) => p.interactions);
    if (lcps.length === raw.vitals.pages.length && interactions.length > 0) {
      const vitals: WebVitalsFacts = {
        lcpSeconds: Math.round((Math.max(...lcps) / 1000) * 100) / 100,
        inpMs: Math.round(Math.max(...interactions.map((i) => i.durationMs))),
        cls: Math.round(Math.max(...raw.vitals.pages.map((p) => p.cls)) * 1000) / 1000,
        measurement: "lab",
      };
      artifacts.webVitals = vitals;
      sources.webVitals = `LAB, not field p75: ${raw.vitals.method}. Worst page taken for each metric; INP from ${interactions.length} scripted interaction(s) across ${raw.vitals.pages.filter((p) => p.interactions.length > 0).length} page(s)`;
    } else {
      notes.push(
        interactions.length === 0
          ? "web vitals unavailable: no interaction produced an Event Timing entry, so INP was not measured and LCP/CLS alone may not stand in for the vitals set"
          : "web vitals unavailable: LCP was not recorded on every page",
      );
    }
  } else {
    notes.push(`web vitals unavailable: ${raw.vitals.reason ?? "no pages measured"}`);
  }

  // ---- responsive sweep
  if (raw.responsiveSweep.profiles.length > 0) {
    artifacts.responsive = mapResponsiveSweep(raw.responsiveSweep.profiles);
    const ran = raw.responsiveSweep.profiles.filter((p) => p.available);
    sources.responsive = `every planned page loaded at ${ran.length} of ${raw.responsiveSweep.profiles.length} profiles (${[...new Set(ran.map((p) => p.engine))].join(" + ")}): horizontal overflow, touch targets on touch profiles, and text present with JavaScript disabled; full-page screenshots kept per profile`;
  } else {
    notes.push("responsive sweep did not run");
  }

  const bundle = collectBuildEvidence(artifacts);
  return { bundle, aaa, coverage, findingsOutsideEvaluator, experiences: experienceResults, navigation: navigationResults, staticLayer: staticFailures, notes };
}
