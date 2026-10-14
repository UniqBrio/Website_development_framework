/**
 * EXPERIENCE PATTERN CONTRACTS — the eight initial patterns (ECO §22, brief phase 14).
 *
 * CONTRACTS, NOT COMPONENTS. Each states what an implementation must do and what
 * it inherits from the framework's existing gates: semantic baseline, keyboard
 * completion, a JavaScript-free path, a budget, SEO-safe static content, events,
 * a fallback and a kill switch. None is selectable on its own: a pattern is
 * reached only through an engagement decision (`decide.ts`), never by ranking
 * this list. That is why these are not entries in `PATTERNS`, whose members the
 * element selector ranks and picks by score.
 *
 * `performance.estimatedRouteJsKb` values are ESTIMATES (evidence kind
 * `estimated`). They may inform a feasibility gate; they may never satisfy a gate
 * that requires a measured bundle (evidence/evidence-value.ts).
 */
import { NO_VIOLATIONS } from "../design-system/pattern-registry/types.js";
import type { ExperiencePattern, ExperiencePatternId } from "./types.js";

/** Inherited by every pattern (ECO §16, brief phase 13). */
const BASE_ACCESSIBILITY = [
  "semantic HTML baseline: labelled controls in a form, results in a live region",
  "task completable by keyboard alone, in a logical focus order",
  "visible focus on every control (the framework's focus_visible criterion)",
  "screen-reader names, roles and state changes announced",
  "respects prefers-reduced-motion; no motion carries information",
  "no drag-only, hover-only or pointer-position-only control (§9)",
  "reflows at 320 CSS px; touch targets meet the site's target size",
  "error messages identify the field and how to fix it",
] as const;

const BASE_SEO = [
  "the question the experience answers, and how it works, are static indexable HTML",
  "no essential information exists only inside JavaScript output",
] as const;

export const EXPERIENCE_PATTERNS: Readonly<Record<ExperiencePatternId, ExperiencePattern>> = {
  calculator: {
    id: "calculator",
    label: "Calculator",
    role: "experience",
    rendering: {
      baseline: "semantic_html",
      enhancement: "progressive_js",
      withoutJavaScript: "the inputs, the formula and its assumptions are visible as static content, with a worked example from approved values",
    },
    requiredData: ["formulas"],
    requirements: [
      "every formula and assumption is owner-supplied, verified and shown to the visitor",
      "the result shows its basis and its limits; ranges where inputs are uncertain",
      "no result is gated behind contact details",
      "no savings, return or outcome figure that the approved formula does not produce",
    ],
    accessibility: [...BASE_ACCESSIBILITY, "result announced in an aria-live region; inputs keep their values on error"],
    hardConstraintViolations: NO_VIOLATIONS,
    performance: { estimatedRouteJsKb: 8, loading: "deferred" },
    seo: [...BASE_SEO, "a dedicated tool page when the calculation is itself a search intent"],
    analyticsEvents: ["experience_viewed", "experience_started", "experience_completed", "result_viewed", "result_action_clicked"],
    fallback: "static explanation of the formula with a worked example, and the conventional enquiry route",
    killSwitch: "disabling the enhancement leaves the static formula explanation and the enquiry route working",
    generatorSupport: "governed_interactive",
  },
  assessment: {
    id: "assessment",
    label: "Assessment",
    role: "experience",
    rendering: {
      baseline: "semantic_html",
      enhancement: "progressive_js",
      withoutJavaScript: "the questions and the published criteria for each outcome are readable as static content",
    },
    requiredData: ["decisionRules"],
    requirements: [
      "questions and outcome rules are owner-supplied and verified; no scoring rubric is invented",
      "the outcome explains which answers led to it",
      "the outcome is guidance, never a diagnosis, eligibility decision or guarantee unless an approved rule says so",
      "progress shown as 'step n of m' only for a genuine multi-step task (ECO §11)",
    ],
    accessibility: [...BASE_ACCESSIBILITY, "one question per fieldset with a legend; back/forward keeps answers"],
    hardConstraintViolations: NO_VIOLATIONS,
    performance: { estimatedRouteJsKb: 10, loading: "deferred" },
    seo: [...BASE_SEO],
    analyticsEvents: ["experience_viewed", "experience_started", "step_completed", "experience_completed", "result_viewed", "result_action_clicked"],
    fallback: "static checklist of the published criteria, and the conventional enquiry route",
    killSwitch: "disabling leaves the static criteria list and the enquiry route",
    generatorSupport: "governed_interactive",
  },
  guided_selector: {
    id: "guided_selector",
    label: "Guided selector",
    role: "experience",
    rendering: {
      baseline: "semantic_html",
      enhancement: "progressive_js",
      withoutJavaScript: "every option is listed with the need it serves, as links to its own page",
    },
    requiredData: ["decisionRules"],
    requirements: [
      "the need-to-offer mapping is owner-supplied and verified; no product attribute is invented",
      "a recommendation states why it matched (ECO §12 Result / Recommendation)",
      "every offer stays reachable without answering questions",
    ],
    accessibility: [...BASE_ACCESSIBILITY],
    hardConstraintViolations: NO_VIOLATIONS,
    performance: { estimatedRouteJsKb: 8, loading: "deferred" },
    seo: [...BASE_SEO, "every recommended offer has its own indexable page"],
    analyticsEvents: ["experience_viewed", "experience_started", "step_completed", "result_viewed", "result_action_clicked"],
    fallback: "a static list of offers grouped by the need each serves",
    killSwitch: "disabling leaves the static grouped list",
    generatorSupport: "governed_interactive",
  },
  comparison: {
    id: "comparison",
    label: "Comparison",
    role: "experience",
    rendering: {
      baseline: "semantic_html",
      enhancement: "none",
      withoutJavaScript: "the full comparison is a semantic table in the served HTML",
    },
    requiredData: ["comparisonData"],
    requirements: [
      "semantic table: caption, column headers and row headers with scope (ECO §12 Comparison)",
      "criteria and values are owner-supplied and verified; every row is an existing offer",
      "accessible row/column relationships at every width",
      "meaningful comparison criteria only — no decorative ticks",
    ],
    accessibility: [...BASE_ACCESSIBILITY, "narrow widths: a focusable, labelled horizontal scroll region that keeps table semantics"],
    hardConstraintViolations: NO_VIOLATIONS,
    performance: { estimatedRouteJsKb: 0, loading: "eager" },
    seo: [...BASE_SEO, "the comparison table itself is indexable content"],
    analyticsEvents: ["experience_viewed", "result_action_clicked"],
    fallback: "the same table, which already works without JavaScript",
    killSwitch: "removing the section leaves the offer pages intact",
    generatorSupport: "static_renderable",
  },
  booking: {
    id: "booking",
    label: "Booking",
    role: "experience",
    rendering: {
      baseline: "semantic_html",
      enhancement: "progressive_js",
      withoutJavaScript: "the appointment request form (the existing booking form contract) submits with no JavaScript",
    },
    requiredData: [],
    requirements: [
      "accessible date/time selection; no drag or pointer-only calendar (ECO §12 Booking)",
      "timezone stated wherever a time is shown",
      "a confirmation that says what happens next; error and recovery paths",
      "real availability only from a scheduling integration — otherwise it is a request, and says so",
    ],
    accessibility: [...BASE_ACCESSIBILITY],
    hardConstraintViolations: NO_VIOLATIONS,
    performance: { estimatedRouteJsKb: 15, loading: "on_demand" },
    seo: [...BASE_SEO, "the booking page states the services, location and process as static content"],
    analyticsEvents: ["booking_started", "booking_completed"],
    fallback: "the appointment request form (booking form contract)",
    killSwitch: "disabling the scheduler leaves the appointment request form",
    reusesFormContract: "booking",
    generatorSupport: "maps_to_existing_section",
  },
  result: {
    id: "result",
    label: "Result",
    role: "journey_step",
    rendering: {
      baseline: "semantic_html",
      enhancement: "progressive_js",
      withoutJavaScript: "the static explanation of possible results and what each leads to",
    },
    requiredData: [],
    requirements: [
      "never hidden behind an unnecessary lead gate (ECO §12 Result)",
      "explains the basis of the result and its limits",
      "offers ONE logically connected next action (ECO §7 75–84 band)",
    ],
    accessibility: [...BASE_ACCESSIBILITY, "result region announced when it changes"],
    hardConstraintViolations: NO_VIOLATIONS,
    performance: { estimatedRouteJsKb: 2, loading: "deferred" },
    seo: [...BASE_SEO],
    analyticsEvents: ["result_viewed", "result_action_clicked"],
    fallback: "static description of outcomes",
    killSwitch: "disabling returns to the experience's static fallback",
    generatorSupport: "rendered_within_parent",
  },
  progressive_form: {
    id: "progressive_form",
    label: "Progressive form",
    role: "journey_step",
    rendering: {
      baseline: "semantic_html",
      enhancement: "progressive_js",
      withoutJavaScript: "a single conventional form (the existing enquiry contract) with the same minimal fields",
    },
    requiredData: [],
    requirements: [
      "requests the minimum information; explains why each field is needed (ECO §12 Progressive Form)",
      "review and correction before submit",
      "never re-asks what an earlier step already collected",
      "no gating of value the visitor already received",
    ],
    accessibility: [...BASE_ACCESSIBILITY, "step changes move focus to the step heading"],
    hardConstraintViolations: NO_VIOLATIONS,
    performance: { estimatedRouteJsKb: 4, loading: "deferred" },
    seo: [...BASE_SEO],
    analyticsEvents: ["lead_started", "lead_submitted"],
    fallback: "the conventional enquiry form (enquiry form contract)",
    killSwitch: "disabling leaves the conventional enquiry form",
    reusesFormContract: "enquiry",
    generatorSupport: "maps_to_existing_section",
  },
  static_fallback: {
    id: "static_fallback",
    label: "Static fallback",
    role: "fallback",
    rendering: {
      baseline: "semantic_html",
      enhancement: "none",
      withoutJavaScript: "everything — it is the no-JavaScript, no-experience path",
    },
    requiredData: [],
    requirements: [
      "the task stays achievable through static content, links and conventional forms",
      "the static alternative named in the engagement decision is what renders",
    ],
    accessibility: [...BASE_ACCESSIBILITY],
    hardConstraintViolations: NO_VIOLATIONS,
    performance: { estimatedRouteJsKb: 0, loading: "eager" },
    seo: [...BASE_SEO],
    analyticsEvents: [],
    fallback: "itself",
    killSwitch: "not applicable — nothing to disable",
    generatorSupport: "maps_to_existing_section",
  },
};

export function experiencePattern(id: ExperiencePatternId): ExperiencePattern {
  return EXPERIENCE_PATTERNS[id];
}
