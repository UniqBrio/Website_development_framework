/**
 * Navigation and CTA rules — §4.5 (DD-033..DD-037).
 *
 * Consumers: `generation/component-model.ts` reads `nav.*` and `cta.*` from
 * `output.decisions` when it builds the header, the hero action and any sticky
 * action. It holds the objective→label map for DD-035; the rule owns the POLICY
 * (outcome-specific labels), the model owns the deterministic mapping, and no
 * label is ever invented from copy.
 */
import { parseRule, type Rule } from "../types/decision.js";

const M3_NAV = "https://m3.material.io/components/navigation-drawer";
const WCAG = "https://www.w3.org/TR/WCAG22/";
const HIG_LAYOUT = "https://developer.apple.com/design/human-interface-guidelines/layout";

export const NAVIGATION_RULES: readonly Rule[] = [
  parseRule({
    id: "DD-033",
    title: "Navigation depth",
    domain: "layout",
    classification: "executable",
    consumer: "generation/component-model.ts",
    sourceSection: "§4.5",
    if: [{ fact: "variables.information_density", op: "eq", value: "high" }],
    then: [
      { kind: "set", target: "nav.structure", value: "explicit_hierarchy_plus_search_or_local_nav" },
      { kind: "require", target: "nav", value: "descriptive labels and a current-location state" },
    ],
    otherwise: [{ kind: "set", target: "nav.structure", value: "flat_primary_list" }],
    prefer: ["descriptive labels", "current_location_state"],
    avoid: ["vague_labels", "hidden_key_destinations"],
    fallback: ["simplified information architecture"],
    rationale: "Navigation should expose information scent for major user tasks.",
    source_urls: [M3_NAV],
    confidence: "high",
  }),
  parseRule({
    id: "DD-034",
    title: "Mobile navigation",
    domain: "responsive",
    classification: "gate",
    consumer: "generation/component-model.ts",
    sourceSection: "§4.5",
    // Every site serves a compact viewport and a coarse pointer, so the rule is
    // unconditional in this framework: the responsive engine's default
    // capability IS coarse/no-hover.
    then: [
      { kind: "set", target: "nav.compactMode", value: "accessible_drawer_or_compact_bar" },
      { kind: "require", target: "nav", value: "keyboard controls, visible close, route parity with the full navigation" },
      { kind: "forbid", target: "nav", value: "hover_only_mega_menu" },
    ],
    prefer: ["explicit nested levels"],
    avoid: ["hover_only_mega_menu"],
    fallback: ["linear navigation list"],
    rationale: "Mobile navigation requires explicit touch and keyboard interaction.",
    source_urls: ["https://m3.material.io/components", WCAG],
    confidence: "high",
  }),
  parseRule({
    id: "DD-035",
    title: "CTA specificity",
    domain: "content",
    classification: "executable",
    consumer: "generation/component-model.ts",
    sourceSection: "§4.5",
    if: [{ fact: "primaryObjective", op: "exists" }],
    then: [{ kind: "set", target: "cta.labelPolicy", value: "outcome_specific" }],
    prefer: ["Book a consultation", "View available rooms", "Start free trial", "Request a quote"],
    avoid: ["repeated_learn_more_for_primary_actions"],
    fallback: ["\"Contact us\" only when no more specific approved action exists"],
    rationale: "Specific CTA labels reduce uncertainty about the next outcome.",
    source_urls: ["https://developer.apple.com/design/human-interface-guidelines/gestures"],
    confidence: "high",
  }),
  parseRule({
    id: "DD-036",
    title: "CTA competition",
    domain: "layout",
    classification: "gate",
    consumer: "generation/component-model.ts",
    sourceSection: "§4.5",
    then: [
      { kind: "set", target: "cta.primaryCount", value: 1 },
      { kind: "set", target: "cta.secondaryTreatment", value: "visually_subordinate" },
    ],
    avoid: ["equal_button_weight_for_unrelated_actions"],
    fallback: ["move secondary action to a text link"],
    rationale: "Multiple equal CTAs dilute hierarchy.",
    source_urls: [HIG_LAYOUT],
    confidence: "high",
  }),
  parseRule({
    id: "DD-037",
    title: "Sticky CTA",
    domain: "interaction",
    classification: "gate",
    consumer: "generation/component-model.ts",
    sourceSection: "§4.5",
    if: [
      { fact: "variables.mobile_share", op: "eq", value: "high" },
      { fact: "primaryTaskHighIntent", op: "eq", value: true },
      // "CTA has verified functional endpoint" — a sticky action to nowhere is
      // worse than none, so this is what the fixture's unverified address blocks.
      { fact: "conversionEndpointVerified", op: "eq", value: true },
    ],
    then: [{ kind: "set", target: "cta.sticky", value: "allowed_safe_area_aware" }],
    otherwise: [{ kind: "set", target: "cta.sticky", value: "inline_repeated" }],
    require: [
      { kind: "require", target: "cta", value: "safe-area aware padding; hidden while the software keyboard is open" },
    ],
    prefer: ["safe_area aware padding", "context-specific CTA"],
    avoid: ["sticky_cta_for_low_intent_browsing"],
    fallback: ["inline repeated CTA"],
    rationale:
      "Persistent action can reduce friction when the action is clearly valuable and non-obstructive.",
    source_urls: ["https://www.w3.org/WAI/WCAG22/Techniques/", "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env"],
    confidence: "high",
  }),
];
