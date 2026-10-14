/**
 * Layout, grid, hero, typography and remaining direction rules —
 * §4.1 (DD-009, DD-011, DD-012), §4.2 (DD-017), §4.3 (DD-022, DD-023),
 * §4.4 (DD-024..DD-032).
 *
 * This file fills the `layout` domain, which had ZERO encoded rules through the
 * generator phase. Its effects are consumed in two places only:
 *   - `set`/`cap` on `layout.*`, `hero.*`, `typography.*` → read from
 *     `output.decisions` by `generation/render/css.ts` and
 *     `generation/component-model.ts`
 *   - `forbid` → the selection engine's forbidden set (gate 1)
 *
 * Field discipline (learned from the imagery conflict): `hero.pattern` names the
 * CONTENT formula and is written by the industry rules; `hero.layout` names the
 * spatial arrangement and is written here. Two concepts, two fields, so two
 * rules that both fire do not manufacture a false conflict.
 */
import { parseRule, type Rule } from "../types/decision.js";

const HIG_LAYOUT = "https://developer.apple.com/design/human-interface-guidelines/layout";
const M3_ADAPTIVE = "https://m3.material.io/foundations/adaptive-design/overview";
const CQ = "https://web.dev/learn/css/container-queries";
const SITEINSPIRE = "https://www.siteinspire.com/";
const AWWWARDS = "https://www.awwwards.com/about-evaluation/";
const RESP_IMG = "https://web.dev/learn/design/responsive-images";

function hasPersonality(name: string) {
  return { fact: "personalities", op: "contains" as const, value: name };
}

export const LAYOUT_RULES: readonly Rule[] = [
  // ------------------------------------------------------------ §4.1 remaining
  parseRule({
    id: "DD-009",
    title: "Hospitality/travel",
    domain: "direction",
    classification: "executable",
    consumer: "evaluator",
    sourceSection: "§4.1",
    if: [
      { fact: "industry", op: "in", value: ["hospitality", "travel"] },
      { fact: "variables.visual_asset_quality", op: "eq", value: "high" },
    ],
    then: [
      { kind: "set", target: "hero.pattern", value: "art_directed_media_plus_booking_action" },
      { kind: "cap", target: "motion.cap", value: "low_to_medium" },
      { kind: "append", target: "sectionArchitecture", value: ["booking", "location_and_contact", "amenities", "policies"] },
    ],
    unless: [{ fact: "variables.mobile_share", op: "eq", value: "high" }],
    prefer: ["responsive art direction", "booking path", "location/amenity/policy information"],
    avoid: ["booking_cta_hidden_under_immersive_scene", "audio_autoplay"],
    fallback: ["static responsive hero image and booking card"],
    rationale: "Atmosphere matters, but visitors must plan and book confidently.",
    source_urls: [RESP_IMG, "https://web.dev/articles/codelab-art-direction"],
    confidence: "high",
  }),
  parseRule({
    id: "DD-011",
    title: "Sports/fitness",
    domain: "direction",
    classification: "executable",
    consumer: "evaluator",
    sourceSection: "§4.1",
    if: [{ fact: "industry", op: "in", value: ["sports", "fitness"] }],
    then: [
      { kind: "set", target: "designPersonality", value: "energetic, community-driven, disciplined" },
      { kind: "set", target: "typography.strategy", value: "bold_display_plus_readable_body" },
      { kind: "cap", target: "motion.cap", value: "medium" },
      { kind: "append", target: "sectionArchitecture", value: ["schedule", "registration", "coaches", "safety"] },
    ],
    prefer: ["schedule/class/fixture access", "registration/trial CTA", "credentials and safeguarding where relevant"],
    avoid: ["motion_obscuring_practical_information"],
    fallback: ["static action imagery plus schedule cards"],
    rationale:
      "Energy is appropriate, but booking, safety, schedule and community information are primary tasks.",
    source_urls: ["https://www.w3.org/TR/WCAG22/"],
    confidence: "high",
  }),
  parseRule({
    id: "DD-012",
    title: "Media/editorial",
    domain: "direction",
    classification: "executable",
    consumer: "evaluator",
    sourceSection: "§4.1",
    if: [
      { fact: "industry", op: "in", value: ["media", "editorial", "university", "nonprofit"] },
      { fact: "variables.information_density", op: "eq", value: "high" },
    ],
    then: [
      { kind: "set", target: "layout.system", value: "reading_rail_plus_supporting_navigation" },
      { kind: "set", target: "typography.priority", value: "high" },
      { kind: "append", target: "sectionArchitecture", value: ["topic_hub", "article_index"] },
    ],
    prefer: ["content hubs", "clear author/date/source metadata", "search and topic navigation when depth requires it"],
    avoid: ["heavy_animation_in_reading_flow", "unreadable_wide_measures"],
    fallback: ["linear article and topic architecture"],
    rationale: "Reading, scanning, trust, and topical discovery dominate.",
    source_urls: [HIG_LAYOUT],
    confidence: "high",
  }),
  // ------------------------------------------------------------ §4.2 remaining
  parseRule({
    id: "DD-017",
    title: "Editorial personality",
    domain: "direction",
    classification: "executable",
    consumer: "evaluator",
    sourceSection: "§4.2",
    if: [hasPersonality("editorial")],
    // Targets are the GRID and the HIERARCHY, not `layout.system` / `typography.
    // strategy`: those belong to the industry rules (DD-001..DD-012) and a
    // personality rule writing them produced a permanent reported conflict on
    // every premium+editorial business. Distinct axes, no conflict, order-free.
    then: [
      { kind: "set", target: "layout.grid", value: "editorial_grid" },
      { kind: "set", target: "typography.hierarchy", value: "strong" },
      { kind: "set", target: "typography.measurePolicy", value: "bounded" },
      { kind: "set", target: "imagery.presentation", value: "captions_and_context" },
    ],
    prefer: ["pull quotes", "reading rhythm", "asymmetry where content supports it"],
    avoid: ["card_overload", "narrow_text_columns_that_fracture_reading"],
    fallback: ["structured single-column narrative"],
    rationale: "Editorial design is driven by reading rhythm and content hierarchy.",
    source_urls: [HIG_LAYOUT],
    confidence: "high",
  }),
  // ------------------------------------------------------------ §4.3 remaining
  parseRule({
    id: "DD-022",
    title: "Reading measure",
    domain: "typography",
    classification: "executable",
    consumer: "generation/render/css.ts",
    sourceSection: "§4.3",
    if: [{ fact: "variables.information_density", op: "in", value: ["medium", "high"] }],
    then: [
      { kind: "set", target: "typography.bodyMeasure", value: "45_to_80_characters_per_line" },
      { kind: "set", target: "layout.contentContainer", value: "bounded" },
    ],
    avoid: ["full_width_prose_on_ultra_wide_displays"],
    fallback: ["single reading rail"],
    rationale: "Line length affects readability and scanning.",
    source_urls: [HIG_LAYOUT],
    confidence: "high",
  }),
  parseRule({
    id: "DD-023",
    title: "Large type",
    domain: "typography",
    classification: "executable",
    consumer: "generation/render/css.ts",
    sourceSection: "§4.3",
    if: [{ fact: "variables.brand_expression_need", op: "eq", value: "high" }],
    then: [{ kind: "set", target: "typography.displayScale", value: "large_allowed" }],
    // The specification's own `unless` is about headline length and mobile CTA
    // position, neither knowable before copy exists. `information_density: high`
    // is the derivable proxy for its `avoid` clause ("huge type for long
    // technical/legal propositions"), so that is what gates it here.
    unless: [{ fact: "variables.information_density", op: "eq", value: "high" }],
    otherwise: [{ kind: "set", target: "typography.displayScale", value: "moderate" }],
    prefer: ["clamp and intentional line breaks"],
    avoid: ["huge_type_for_long_technical_or_legal_propositions"],
    fallback: ["moderate heading scale with stronger hierarchy"],
    rationale: "Large type can create immediate hierarchy but cannot repair vague copy.",
    source_urls: [AWWWARDS],
    confidence: "medium",
  }),
  // ------------------------------------------------------------ §4.4 layout
  parseRule({
    id: "DD-024",
    title: "Container strategy",
    domain: "layout",
    classification: "executable",
    consumer: "generation/render/css.ts",
    sourceSection: "§4.4",
    then: [
      { kind: "set", target: "layout.pageContainers", value: "bounded" },
      { kind: "set", target: "layout.proseContainer", value: "reading_rail" },
      { kind: "set", target: "layout.fullBleedMedia", value: "only_when_justified" },
    ],
    prefer: ["CSS grid and container queries"],
    avoid: ["unbounded_wide_body_text"],
    fallback: ["standard content container"],
    rationale: "Responsive layouts need controlled content width, especially on large displays.",
    source_urls: [CQ, "https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_queries"],
    confidence: "high",
  }),
  parseRule({
    id: "DD-025",
    title: "Grid selection",
    domain: "layout",
    classification: "executable",
    consumer: "generation/render/css.ts",
    sourceSection: "§4.4",
    if: [{ fact: "hasRepeatedComparableItems", op: "eq", value: true }],
    then: [
      { kind: "set", target: "layout.repeatedItems", value: "responsive_grid" },
      { kind: "set", target: "layout.cardMinWidth", value: "defined" },
    ],
    otherwise: [{ kind: "set", target: "layout.repeatedItems", value: "single_column_list" }],
    prefer: ["CSS Grid auto-fit/minmax"],
    avoid: ["fixed_column_counts_that_create_tiny_cards"],
    fallback: ["single-column list"],
    rationale: "Grid should follow item minimum usable width, not device labels.",
    source_urls: [M3_ADAPTIVE],
    confidence: "high",
  }),
  parseRule({
    id: "DD-026",
    title: "Bento selection",
    domain: "layout",
    classification: "gate",
    consumer: "design-intelligence/engine/select-elements.ts",
    sourceSection: "§4.4",
    if: [
      { fact: "offerCount", op: "gte", value: 4 },
      { fact: "offerCount", op: "lte", value: 8 },
      { fact: "offerKindsMixed", op: "eq", value: true },
    ],
    then: [{ kind: "set", target: "layout.bentoAllowed", value: true }],
    unless: [{ fact: "variables.information_density", op: "eq", value: "low" }],
    // Outside the 4-8 mixed-priority window a bento is decoration, and the
    // selection engine's forbidden set is what enforces that.
    otherwise: [{ kind: "forbid", target: "layout", value: "bento-grid" }],
    prefer: ["semantic order and responsive stacking"],
    avoid: ["bento_for_every_section"],
    fallback: ["equal feature grid or sequential sections"],
    rationale: "Bento supports modular scanning, not all information types.",
    source_urls: [M3_ADAPTIVE],
    confidence: "high",
  }),
  parseRule({
    id: "DD-027",
    title: "Editorial layout selection",
    domain: "layout",
    classification: "executable",
    consumer: "evaluator",
    sourceSection: "§4.4",
    if: [{ fact: "hasLongFormContent", op: "eq", value: true }],
    then: [
      // Same axis as DD-017 (the grid), deliberately the same value: agreement,
      // not a conflict, when both fire.
      { kind: "set", target: "layout.grid", value: "editorial_grid" },
      { kind: "set", target: "layout.readingRail", value: "main_rail_plus_optional_aside" },
    ],
    prefer: ["captions", "pull quotes", "visual pacing"],
    avoid: ["card_heavy_fragmentation"],
    fallback: ["structured vertical narrative"],
    rationale: "Long-form content benefits from controlled reading rhythm.",
    source_urls: [SITEINSPIRE],
    confidence: "high",
  }),
  parseRule({
    id: "DD-028",
    title: "Asymmetric layout selection",
    domain: "layout",
    classification: "gate",
    consumer: "design-intelligence/engine/select-elements.ts",
    sourceSection: "§4.4",
    if: [
      { fact: "variables.visual_asset_quality", op: "eq", value: "high" },
      { fact: "variables.brand_expression_need", op: "eq", value: "high" },
      { fact: "industry", op: "in", value: ["fashion", "art", "photography", "architecture", "creative_agency"] },
    ],
    then: [{ kind: "set", target: "layout.asymmetryAllowed", value: true }],
    unless: [
      { fact: "variables.information_density", op: "eq", value: "high" },
      { fact: "variables.trust_requirement", op: "eq", value: "very_high" },
    ],
    otherwise: [{ kind: "forbid", target: "layout", value: "asymmetric-composition" }],
    prefer: ["maintained DOM order", "mobile vertical narrative"],
    avoid: ["asymmetry_for_dense_data_or_forms"],
    fallback: ["editorial grid"],
    rationale:
      "Asymmetry directs attention and signals character, but can harm scanning when overused.",
    source_urls: [SITEINSPIRE],
    confidence: "high",
  }),
  parseRule({
    id: "DD-029",
    title: "Full-bleed media",
    domain: "layout",
    classification: "gate",
    consumer: "design-intelligence/engine/select-elements.ts",
    sourceSection: "§4.4",
    if: [
      { fact: "variables.visual_asset_quality", op: "eq", value: "high" },
      { fact: "industry", op: "in", value: ["hospitality", "travel", "fashion", "architecture", "interiors", "art", "photography"] },
    ],
    then: [{ kind: "set", target: "layout.fullBleedAllowed", value: true }],
    unless: [{ fact: "variables.performance_sensitivity", op: "eq", value: "high" }],
    otherwise: [{ kind: "forbid", target: "layout", value: "full-bleed-media" }],
    prefer: ["art-directed responsive crops", "text within bounded overlay surface"],
    avoid: ["full_bleed_text_only_reading_sections"],
    fallback: ["bounded media card"],
    rationale: "Immersive media is useful when it contributes actual evidence or atmosphere.",
    source_urls: [RESP_IMG],
    confidence: "high",
  }),
  parseRule({
    id: "DD-030",
    title: "Split hero",
    domain: "layout",
    classification: "executable",
    consumer: "generation/component-model.ts",
    sourceSection: "§4.4",
    if: [{ fact: "hasProductVisualProof", op: "eq", value: true }],
    // `hero.layout`, deliberately NOT `hero.pattern` — that field names the content
    // formula and is owned by the industry rules.
    then: [{ kind: "set", target: "hero.layout", value: "split" }],
    otherwise: [{ kind: "set", target: "hero.layout", value: "vertical" }],
    prefer: ["copy first in DOM", "stack visual after CTA on compact widths"],
    avoid: ["equal_competing_ctas_across_halves"],
    fallback: ["vertical hero"],
    rationale: "Split layouts pair proposition with proof when both are meaningful.",
    source_urls: [HIG_LAYOUT],
    confidence: "high",
  }),
  parseRule({
    id: "DD-031",
    title: "Hero content",
    domain: "layout",
    classification: "gate",
    consumer: "generation/component-model.ts",
    sourceSection: "§4.4",
    then: [
      { kind: "require", target: "hero", value: "answers what, for whom, why it matters, next step" },
      { kind: "set", target: "hero.mustAnswer", value: ["what", "for_whom", "why_it_matters", "next_step"] },
    ],
    prefer: ["one primary CTA", "one supporting proof element"],
    avoid: ["vague_slogan_only_hero", "video_only_value_proposition"],
    fallback: ["text-first hero with verified CTA"],
    rationale: "Visitors need immediate relevance and action clarity.",
    source_urls: [AWWWARDS],
    confidence: "high",
  }),
  parseRule({
    id: "DD-032",
    title: "Proof before conversion",
    domain: "layout",
    classification: "executable",
    consumer: "generation/component-model.ts",
    sourceSection: "§4.4",
    if: [{ fact: "variables.purchase_cycle", op: "in", value: ["considered", "long", "regulated"] }],
    then: [{ kind: "set", target: "conversion.proofPlacement", value: "before_primary_conversion" }],
    prefer: ["verified case studies", "credentials", "process transparency", "security/terms where relevant"],
    avoid: ["logo_wall_without_permission", "invented_metrics"],
    fallback: ["explain methodology and next-step expectations"],
    rationale: "Longer, riskier decisions require evidence before commitment.",
    source_urls: ["https://baymard.com/research/methodology"],
    confidence: "high",
  }),
];
