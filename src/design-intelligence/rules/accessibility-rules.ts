/**
 * Accessibility rules — §4.10 (DD-076, DD-077, DD-078, DD-080, DD-081, DD-083).
 *
 * Enforcement already exists in `accessibility/evaluate.ts` (the per-criterion
 * gate) and `accessibility/rules.ts` (`checkHardFailures`). These rules do not
 * duplicate it. They exist so each §G.1 blocker is auditable under its rule id,
 * and so the generator's structural obligations (native elements, labels,
 * scroll-padding under sticky chrome) have a named source. Where a rule changes
 * emitted output — DD-078's `scroll-padding`, DD-081's alt policy — the consumer
 * is the emitter and a test proves the output changed.
 */
import { parseRule, type Rule } from "../types/decision.js";

const WCAG = "https://www.w3.org/TR/WCAG22/";
const WCAG_TECH = "https://www.w3.org/WAI/WCAG22/Techniques/";
const IMAGES = "https://www.w3.org/WAI/tutorials/images/";
const DECORATIVE = "https://www.w3.org/WAI/tutorials/images/decorative/";

export const ACCESSIBILITY_RULES: readonly Rule[] = [
  parseRule({
    id: "DD-076",
    title: "Semantic first",
    domain: "a11y",
    classification: "gate",
    consumer: "generation/render/html.ts",
    sourceSection: "§4.10",
    then: [
      { kind: "set", target: "a11y.elementPolicy", value: "native_semantic_html_first" },
      { kind: "forbid", target: "a11y", value: "div_as_button" },
      { kind: "forbid", target: "a11y", value: "aria_when_native_element_exists" },
    ],
    prefer: ["native_semantic_HTML"],
    avoid: ["div_as_button", "ARIA_when_native_element_exists"],
    fallback: ["accessible native component"],
    rationale: "Semantic HTML supplies baseline keyboard and assistive technology behavior.",
    source_urls: [WCAG],
    confidence: "high",
  }),
  parseRule({
    id: "DD-077",
    title: "Keyboard equivalence",
    domain: "a11y",
    classification: "gate",
    consumer: "accessibility/evaluate.ts",
    sourceSection: "§4.10",
    then: [
      { kind: "require", target: "a11y", value: "every interactive element keyboard operable, with visible focus and a logical focus order" },
      { kind: "forbid", target: "a11y", value: "pointer_only_controls" },
    ],
    avoid: ["pointer_only_controls"],
    fallback: ["native button/link/input"],
    rationale: "Core interaction cannot depend on pointer or gesture.",
    source_urls: [WCAG],
    confidence: "high",
  }),
  parseRule({
    id: "DD-078",
    title: "Focus not obscured",
    domain: "a11y",
    classification: "gate",
    consumer: "generation/render/css.ts",
    sourceSection: "§4.10",
    then: [
      { kind: "set", target: "a11y.stickyChrome", value: "scroll_padding_and_scroll_margin" },
      { kind: "require", target: "a11y", value: "focus never entirely hidden by sticky, fixed or overlay UI" },
    ],
    avoid: ["fixed_ui_covering_focused_elements"],
    fallback: ["non-sticky UI at compact size"],
    rationale: "WCAG 2.2 requires focus not be entirely obscured by author-created content.",
    source_urls: [WCAG_TECH],
    confidence: "high",
  }),
  parseRule({
    id: "DD-080",
    title: "Motion accessibility",
    domain: "a11y",
    classification: "gate",
    consumer: "accessibility/evaluate.ts",
    sourceSection: "§4.10",
    then: [
      { kind: "require", target: "motion", value: "auto-starting motion lasting over 5 seconds has a pause/stop/hide mechanism" },
      { kind: "require", target: "motion", value: "non-essential interaction-triggered motion has a reduced-motion alternative" },
    ],
    fallback: ["static state"],
    rationale: "Users must be able to control disruptive or non-essential motion.",
    source_urls: [WCAG],
    confidence: "high",
  }),
  parseRule({
    id: "DD-081",
    title: "Image alt policy",
    domain: "a11y",
    classification: "gate",
    consumer: "generation/render/html.ts",
    sourceSection: "§4.10",
    then: [
      { kind: "set", target: "images.altPolicy", value: "informative_alt_or_empty_alt_for_decorative" },
      { kind: "forbid", target: "images", value: "omitted_alt_attribute" },
      { kind: "forbid", target: "images", value: "redundant_alt_text" },
    ],
    avoid: ["omitted_alt_attribute", "redundant_alt_text"],
    fallback: ["adjacent semantic text"],
    rationale:
      "Images require alternatives when they convey information; decoration should not create screen-reader noise.",
    source_urls: [IMAGES, DECORATIVE],
    confidence: "high",
  }),
  parseRule({
    id: "DD-083",
    title: "Forms",
    domain: "a11y",
    classification: "gate",
    consumer: "generation/component-model.ts",
    sourceSection: "§4.10",
    then: [
      { kind: "set", target: "forms.policy", value: "visible_and_programmatic_labels_errors_recovery_success" },
      { kind: "set", target: "forms.validation", value: "server_plus_client_assistance" },
      { kind: "forbid", target: "forms", value: "placeholder_only_labels" },
      { kind: "forbid", target: "forms", value: "silent_failure" },
    ],
    prefer: ["server_validation + client assistance"],
    avoid: ["placeholder_only_labels", "silent_failure"],
    fallback: ["simpler contact route"],
    rationale: "Forms require explicit labels and understandable feedback.",
    source_urls: ["https://nextjs.org/docs/app/guides/production-checklist"],
    confidence: "high",
  }),
];
