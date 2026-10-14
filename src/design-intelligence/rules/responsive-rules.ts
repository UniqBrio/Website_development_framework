/**
 * Responsive rules — §4.9 (DD-064, DD-067, DD-069..DD-075).
 *
 * The responsive MODEL lives in `responsive/capabilities.ts` and
 * `responsive/transformations.ts`, and this file introduces no second one.
 * Every rule here either sets a `layout.*` value the CSS emitter reads, or names
 * the existing responsive subsystem as its consumer so the traceability test can
 * prove the behaviour exists there. DD-073 is the one that CHANGES the
 * transformation engine: `foldableSegments` was modelled but read by nothing.
 */
import { parseRule, type Rule } from "../types/decision.js";

const RWD = "https://web.dev/articles/responsive-web-design-basics";
const M3_ADAPTIVE = "https://m3.material.io/foundations/adaptive-design/overview";
const ENV = "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env";
const ENV_USING = "https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Environment_variables/Using";
const M3_BREAKPOINTS = "https://m3.material.io/foundations/layout/breakpoints";
const CLS = "https://web.dev/articles/optimize-cls";
const RESP_IMG = "https://web.dev/learn/design/responsive-images";
const NEXT_IMAGE = "https://nextjs.org/docs/app/api-reference/components/image";

export const RESPONSIVE_RULES: readonly Rule[] = [
  parseRule({
    id: "DD-064",
    title: "Responsive principle",
    domain: "responsive",
    classification: "gate",
    consumer: "responsive/capabilities.ts",
    sourceSection: "§4.9",
    then: [
      {
        kind: "require",
        target: "responsive",
        value: "every component evaluated against viewport, container width, pointer, hover, reduced motion, text zoom, orientation and safe area",
      },
      { kind: "forbid", target: "responsive", value: "device_name_only_logic" },
    ],
    avoid: ["device_name_only_logic"],
    fallback: ["semantic vertical layout"],
    rationale:
      "Responsive design adapts to space and capabilities, not a simple desktop/tablet/mobile taxonomy.",
    source_urls: [RWD, "https://web.dev/articles/new-responsive"],
    confidence: "high",
  }),
  parseRule({
    id: "DD-067",
    title: "Responsive card grid",
    domain: "responsive",
    classification: "executable",
    consumer: "generation/render/css.ts",
    sourceSection: "§4.9",
    if: [{ fact: "hasRepeatedComparableItems", op: "eq", value: true }],
    then: [
      { kind: "set", target: "layout.cardColumns", value: "auto_fit_minmax" },
      { kind: "set", target: "layout.cardOrder", value: "semantic" },
    ],
    avoid: ["fixed_4_column_mobile_grids"],
    fallback: ["single-column cards"],
    rationale: "Card columns should respond to usable card width.",
    source_urls: [M3_ADAPTIVE],
    confidence: "high",
  }),
  parseRule({
    id: "DD-069",
    title: "Safe area",
    domain: "responsive",
    classification: "gate",
    consumer: "generation/render/css.ts",
    sourceSection: "§4.9",
    then: [
      { kind: "set", target: "layout.fixedUiPadding", value: "safe_area_inset" },
      { kind: "forbid", target: "responsive", value: "fixed_bottom_cta_hiding_focused_field_or_keyboard" },
    ],
    prefer: ["env(safe-area-inset-*)"],
    avoid: ["fixed_bottom_cta_that_hides_focused_field_or_browser_keyboard"],
    fallback: ["inline action region"],
    rationale: "Non-rectangular and mobile browser viewports can obscure fixed UI.",
    source_urls: [ENV],
    confidence: "high",
  }),
  parseRule({
    id: "DD-070",
    title: "Dynamic mobile viewport",
    domain: "responsive",
    classification: "executable",
    consumer: "generation/render/css.ts",
    sourceSection: "§4.9",
    then: [
      { kind: "set", target: "layout.viewportHeightUnit", value: "svh_or_dvh" },
      { kind: "forbid", target: "responsive", value: "naive_100vh_for_critical_cta_layout" },
    ],
    avoid: ["naive_100vh_for_critical_cta_layout"],
    fallback: ["content-based min-height"],
    rationale: "Mobile browser chrome changes visible viewport height.",
    source_urls: [ENV_USING],
    confidence: "high",
  }),
  parseRule({
    id: "DD-071",
    title: "Orientation",
    domain: "responsive",
    classification: "gate",
    consumer: "responsive/capabilities.ts",
    sourceSection: "§4.9",
    then: [
      { kind: "require", target: "responsive", value: "core task preserved in both portrait and landscape" },
      { kind: "forbid", target: "responsive", value: "orientation_lock" },
    ],
    avoid: ["orientation_lock_unless_essential"],
    fallback: ["layout that maintains core task in both orientations"],
    rationale:
      "Users may operate content in different orientations; restriction needs a genuine exception.",
    source_urls: ["https://www.w3.org/TR/wcag2mobile-22/"],
    confidence: "high",
  }),
  parseRule({
    id: "DD-072",
    title: "Large screens",
    domain: "responsive",
    classification: "executable",
    consumer: "generation/render/css.ts",
    sourceSection: "§4.9",
    then: [
      { kind: "set", target: "layout.largeScreen", value: "bounded_centered_with_optional_supporting_pane" },
      { kind: "cap", target: "typography.readingMeasureMax", value: "80ch" },
    ],
    avoid: ["endless_text_lines", "oversized_controls"],
    fallback: ["bounded centered layout"],
    rationale: "Large screens provide space but do not justify unbounded readable content.",
    source_urls: [M3_BREAKPOINTS],
    confidence: "high",
  }),
  parseRule({
    id: "DD-073",
    title: "Foldables",
    domain: "responsive",
    classification: "gate",
    consumer: "responsive/transformations.ts",
    sourceSection: "§4.9",
    then: [
      { kind: "require", target: "responsive", value: "critical content kept out of the hinge on multi-segment viewports" },
      { kind: "forbid", target: "responsive", value: "form_or_cta_split_across_hinge" },
    ],
    avoid: ["splitting_forms_or_cta_across_hinge"],
    fallback: ["single-pane continuous layout"],
    rationale:
      "Foldable layouts should adapt without placing core UI in unusable hinge regions.",
    source_urls: [ENV_USING],
    confidence: "high",
  }),
  parseRule({
    id: "DD-074",
    title: "Responsive image sizing",
    domain: "performance",
    classification: "gate",
    consumer: "generation/render/html.ts",
    sourceSection: "§4.9",
    then: [
      { kind: "require", target: "images", value: "width/height or aspect-ratio on every responsive image" },
      { kind: "require", target: "images", value: "srcset/sizes or the framework equivalent" },
      { kind: "forbid", target: "images", value: "sending_desktop_originals_to_all_devices" },
    ],
    prefer: ["art direction for a changed focal crop"],
    avoid: ["sending_desktop_originals_to_all_devices"],
    fallback: ["single optimized responsive source"],
    rationale: "Dimensions prevent CLS and source selection controls transfer size.",
    source_urls: [CLS, RESP_IMG],
    confidence: "high",
  }),
  parseRule({
    id: "DD-075",
    title: "Next Image usage",
    domain: "performance",
    classification: "gate",
    consumer: "generation/emit/nextjs.ts",
    sourceSection: "§4.9",
    if: [{ fact: "framework", op: "eq", value: "nextjs" }],
    then: [
      { kind: "require", target: "images", value: "next/image with `sizes` whenever fill or responsive CSS width is used, and a reserved aspect ratio or positioned parent" },
      { kind: "forbid", target: "images", value: "fill_without_sizes" },
    ],
    avoid: ["omitted_sizes_with_fill"],
    fallback: ["intrinsic width/height Image"],
    rationale: "sizes informs browser source selection and prevents over-downloading.",
    source_urls: [NEXT_IMAGE],
    confidence: "high",
  }),
];
