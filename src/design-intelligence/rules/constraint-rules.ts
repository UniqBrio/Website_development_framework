/**
 * Constraint rules — specification §4.3 (colour/type), §4.7 (interaction and
 * motion), §4.8 (3D/WebGL/spatial), §4.9 (responsive), §4.10 (accessibility),
 * §4.11 (performance), §4.12 (SEO), §4.13 (content), §4.14 (quality), §4.15.
 *
 * These are the rules that BIND rather than suggest. Several restate a hard gate
 * enforced elsewhere in code (the selection gates, the accessibility checker);
 * that duplication is intentional and one-directional — the rule exists so the
 * decision appears in the audit trail with a rule id, while the gate exists so
 * it cannot be bypassed. The gate is the enforcement; the rule is the record.
 */
import { parseRule, type Rule } from "../types/decision.js";

const WCAG = "https://www.w3.org/TR/WCAG22/";
const VITALS = "https://web.dev/articles/vitals";
const CONTAINER_QUERIES = "https://web.dev/learn/css/container-queries";
const M3_BREAKPOINTS = "https://m3.material.io/foundations/layout/breakpoints";
const BAYMARD = "https://baymard.com/learn/ecommerce-ux-best-practices";
const EMBEDS = "https://web.dev/articles/embed-best-practices";
const R3F_PITFALLS = "https://r3f.docs.pmnd.rs/advanced/pitfalls";
const MOTION_A11Y = "https://motion.dev/docs/react-accessibility";
const NEXT_METADATA = "https://nextjs.org/docs/app/getting-started/metadata-and-og-images";

export const CONSTRAINT_RULES: readonly Rule[] = [
  // ------------------------------------------------------------ §4.3 colour/type
  parseRule({
    id: "DD-019",
    title: "Color semantic tokens",
    domain: "typography",
    classification: "gate",
    consumer: "design-system/tokens/token-contract.ts",
    sourceSection: "§4.3",
    then: [
      { kind: "set", target: "color.tokenSystem", value: "semantic_tokens_derived_from_one_seed" },
      { kind: "forbid", target: "color", value: "raw_hex_in_components" },
    ],
    require: [
      { kind: "require", target: "color", value: "every component consumes a semantic token, never a primitive or a literal" },
    ],
    prefer: ["one seed colour with generated ramps", "measured contrast on every pair"],
    avoid: ["per_component_colour_values"],
    fallback: ["accessible neutral token system"],
    rationale:
      "A colour defined per component survives neither a brand change nor a theme change; tokens are what make either possible.",
    source_urls: [WCAG],
    confidence: "high",
  }),
  parseRule({
    id: "DD-020",
    title: "Color contrast",
    domain: "a11y",
    classification: "gate",
    consumer: "accessibility/evaluate.ts",
    sourceSection: "§4.3",
    then: [
      { kind: "set", target: "color.contrastFloor", value: "wcag_2_2_aa" },
      { kind: "require", target: "a11y", value: "4.5:1 body, 3:1 large text and UI boundaries, in every state" },
    ],
    avoid: ["contrast_assumed_from_a_screenshot"],
    fallback: ["darken or lighten the surface, never the brand mark"],
    rationale:
      "Contrast is a measurement, not an impression, and it must hold in every interactive state rather than only at rest.",
    source_urls: [WCAG],
    confidence: "high",
  }),
  parseRule({
    id: "DD-021",
    title: "Fluid type",
    domain: "typography",
    classification: "executable",
    consumer: "design-system/tokens/token-contract.ts",
    sourceSection: "§4.3",
    then: [
      { kind: "set", target: "typography.scale", value: "fluid_bounded_clamp" },
      { kind: "set", target: "typography.readingMeasure", value: "60-75ch" },
    ],
    avoid: ["viewport_units_without_a_floor_or_ceiling"],
    fallback: ["fixed steps per range"],
    rationale:
      "Unbounded viewport-relative type is unreadable at both extremes; a clamped scale keeps measure and hierarchy intact.",
    source_urls: [M3_BREAKPOINTS],
    confidence: "high",
  }),
  // ------------------------------------------------------------ §4.7 interaction
  parseRule({
    id: "DD-068",
    title: "Hover fallback",
    domain: "interaction",
    classification: "gate",
    consumer: "responsive/transformations.ts",
    sourceSection: "§4.9",
    then: [
      { kind: "forbid", target: "interaction", value: "hover-only-product-info" },
      { kind: "require", target: "interaction", value: "every hover affordance has a focus and tap equivalent" },
    ],
    avoid: ["hover_only_core_information", "cursor_position_dependent_information"],
    fallback: ["always-visible detail"],
    rationale:
      "Hover does not exist on touch and is not reachable by keyboard, so information behind it is information withheld.",
    source_urls: [WCAG],
    confidence: "high",
  }),
  parseRule({
    id: "DD-047",
    title: "Reduced motion",
    domain: "motion",
    classification: "gate",
    consumer: "responsive/transformations.ts",
    sourceSection: "§4.7",
    then: [
      { kind: "require", target: "motion", value: "prefers-reduced-motion alternative that conveys the same information" },
    ],
    avoid: ["motion_as_the_only_state_indicator"],
    fallback: ["static or instant state change"],
    rationale:
      "A reduced-motion user must receive the same information, not a degraded summary of it.",
    source_urls: [WCAG, MOTION_A11Y],
    confidence: "high",
  }),
  parseRule({
    id: "DD-053",
    title: "Cursor follower",
    domain: "interaction",
    classification: "gate",
    consumer: "design-intelligence/engine/select-elements.ts",
    sourceSection: "§4.7",
    if: [{ fact: "variables.trust_requirement", op: "in", value: ["high", "very_high"] }],
    then: [{ kind: "forbid", target: "interaction", value: "cursor-follower" }],
    avoid: ["cursor-follower", "custom_cursor_replacing_the_system_cursor"],
    fallback: ["standard hover and focus states"],
    rationale:
      "A cursor effect answers no user question and removes a familiar affordance; on a trust-critical site it only costs.",
    source_urls: [WCAG],
    confidence: "high",
  }),
  // ------------------------------------------------------------ §4.8 spatial
  parseRule({
    id: "DD-059",
    title: "3D eligibility",
    domain: "interaction",
    classification: "gate",
    consumer: "design-intelligence/engine/select-elements.ts",
    sourceSection: "§4.8",
    if: [{ fact: "variables.product_service_complexity", op: "gte", value: "medium" }],
    then: [
      { kind: "require", target: "threeD", value: "loaded on user intent, with a static render first" },
    ],
    unless: [{ fact: "variables.performance_sensitivity", op: "eq", value: "high" }],
    prefer: ["static poster as the LCP element", "R3F loaded on intent"],
    avoid: ["decorative-webgl-hero", "webgl_as_the_proposition"],
    fallback: ["image gallery"],
    rationale:
      "Spatial inspection is valuable when form and scale affect the decision; as atmosphere it is a large download with no question answered.",
    source_urls: [R3F_PITFALLS],
    confidence: "high",
    approval_required: true,
  }),
  parseRule({
    id: "DD-082",
    title: "Canvas/WebGL alternative",
    domain: "a11y",
    classification: "gate",
    consumer: "design-intelligence/engine/select-elements.ts",
    sourceSection: "§4.10",
    then: [
      { kind: "forbid", target: "immersive", value: "webgl_only_proposition" },
      { kind: "require", target: "immersive", value: "semantic HTML states the proposition independently" },
    ],
    avoid: ["canvas_only_text", "proposition_inside_canvas"],
    fallback: ["static image or video poster with semantic copy"],
    rationale:
      "Canvas content is invisible to assistive technology and to crawlers, so a proposition living only there is unreadable to both.",
    source_urls: [WCAG],
    confidence: "high",
  }),
  // ------------------------------------------------------------ §4.9 responsive
  parseRule({
    id: "DD-065",
    title: "Container queries",
    domain: "responsive",
    classification: "executable",
    consumer: "generation/render/css.ts",
    sourceSection: "§4.9",
    then: [
      { kind: "set", target: "responsive.strategy", value: "container_first" },
      { kind: "require", target: "responsive", value: "viewport queries for page layout, container queries for components" },
    ],
    avoid: ["device_model_specific_breakpoints"],
    fallback: ["viewport ranges only"],
    rationale:
      "A component's available space is its container, not the window; keying it to the viewport breaks it the first time it is reused elsewhere.",
    source_urls: [CONTAINER_QUERIES, M3_BREAKPOINTS],
    confidence: "high",
  }),
  parseRule({
    id: "DD-066",
    title: "Compact reflow",
    domain: "responsive",
    classification: "gate",
    consumer: "responsive/transformations.ts",
    sourceSection: "§4.9",
    then: [
      { kind: "require", target: "responsive", value: "no core content or task lost at 320 CSS px or 400% zoom" },
      { kind: "forbid", target: "responsive", value: "hiding essential content to simplify a narrow layout" },
    ],
    avoid: ["display_none_on_essential_content"],
    fallback: ["single-column priority flow"],
    rationale:
      "Reflow is a WCAG requirement and the narrowest real viewport is 320; content removed there is removed for the people most constrained.",
    source_urls: [WCAG],
    confidence: "high",
  }),
  parseRule({
    id: "DD-079",
    title: "Target size",
    domain: "responsive",
    classification: "gate",
    consumer: "accessibility/evaluate.ts",
    sourceSection: "§4.10",
    then: [
      { kind: "require", target: "responsive", value: "coarse pointer receives a visible, tappable equivalent" },
      { kind: "require", target: "responsive", value: "interactive targets at least 24 CSS px, 44 preferred on mobile" },
    ],
    avoid: ["hover_dependent_affordance_on_touch"],
    fallback: ["always-visible controls"],
    rationale:
      "Input capability, not screen width, decides whether hover exists; a large tablet is still a touch device.",
    source_urls: [WCAG, M3_BREAKPOINTS],
    confidence: "high",
  }),
  // ------------------------------------------------------------ §4.11 performance
  parseRule({
    id: "DD-084",
    title: "Performance budget gate",
    domain: "performance",
    classification: "gate",
    consumer: "performance/budgets.ts",
    sourceSection: "§4.11",
    then: [
      { kind: "require", target: "performance", value: "route JS within the archetype budget after enhancement" },
      { kind: "require", target: "performance", value: "heavy modules dynamically imported" },
    ],
    avoid: ["global_animation_imports", "initial_route_webgl"],
    fallback: ["downgrade the largest enhancement to its declared fallback"],
    rationale:
      "A budget that is only reported is a budget that is exceeded; exceeding it must change the plan automatically.",
    source_urls: [VITALS],
    confidence: "high",
  }),
  parseRule({
    id: "DD-086",
    title: "CLS prevention",
    domain: "performance",
    classification: "gate",
    consumer: "evidence/build-evidence.ts",
    sourceSection: "§4.11",
    then: [
      { kind: "require", target: "performance", value: "width/height or aspect-ratio on every image and embed" },
      { kind: "require", target: "performance", value: "responsive source selection via sizes/srcset" },
    ],
    avoid: ["unsized_media"],
    fallback: ["fixed aspect-ratio container"],
    rationale: "Unsized media is the most common cause of layout shift, and CLS is a release gate.",
    source_urls: ["https://web.dev/articles/optimize-cls"],
    confidence: "high",
  }),
  // ------------------------------------------------------------ §4.12 SEO
  parseRule({
    id: "DD-091",
    title: "Semantic indexability",
    domain: "seo",
    classification: "gate",
    consumer: "seo/artifacts.ts",
    sourceSection: "§4.12",
    if: [{ fact: "variables.seo_dependency", op: "gte", value: "medium" }],
    then: [
      { kind: "set", target: "seo.rendering", value: "server_rendered_public_content" },
      { kind: "forbid", target: "seo", value: "client_only_primary_content" },
    ],
    avoid: ["client_only_primary_content", "canvas_only_text", "duplicate_thin_pages"],
    fallback: ["static generation of every public route"],
    rationale:
      "Content that appears only after hydration is content a crawler may never see, and enhancement must never remove it from the semantic document.",
    source_urls: [NEXT_METADATA],
    confidence: "high",
  }),
  parseRule({
    id: "DD-094",
    title: "Structured data",
    domain: "seo",
    classification: "gate",
    consumer: "seo/strategy.ts",
    sourceSection: "§4.12",
    then: [
      { kind: "require", target: "seo", value: "emit a schema type only when its backing evidence is verified" },
      { kind: "forbid", target: "seo", value: "fabricated_schema" },
    ],
    avoid: ["aggregate_rating_without_verified_reviews", "localbusiness_without_verified_address"],
    fallback: ["omit the schema type"],
    rationale:
      "Marking up a rating or product the business cannot evidence is a fabricated claim wearing an SEO label, and §12 forbids it outright.",
    source_urls: [NEXT_METADATA],
    confidence: "high",
  }),
  // ------------------------------------------------------------ §4.13 content
  parseRule({
    id: "DD-098",
    title: "Missing testimonials",
    domain: "content",
    classification: "approval",
    consumer: "content/verification.ts",
    sourceSection: "§4.13",
    if: [{ fact: "variables.content_confidence", op: "in", value: ["verification_required", "ai_draft", "placeholder"] }],
    then: [
      { kind: "require", target: "content", value: "hide the unverified claim and request the evidence" },
      { kind: "forbid", target: "content", value: "generated_substitute_for_proof" },
    ],
    avoid: ["generated_testimonial", "generated_logo_wall", "estimated_statistic"],
    fallback: ["neutral non-factual structure in the same slot"],
    rationale:
      "A missing proof asset is a content problem; solving it by generating proof converts it into a false statement about the business.",
    source_urls: [WCAG],
    confidence: "high",
    approval_required: true,
  }),
  parseRule({
    id: "DD-097",
    title: "Missing hero imagery",
    domain: "content",
    classification: "executable",
    consumer: "content/asset-policy.ts",
    sourceSection: "§4.13",
    if: [{ fact: "variables.visual_asset_quality", op: "in", value: ["none", "low"] }],
    then: [
      // The STRATEGY value is derived from asset quality by
      // content/asset-policy.ts — this rule must not restate it, or two rules
      // write one derived field and the "conflict" is an artefact rather than a
      // real disagreement. What this rule uniquely contributes is the
      // prohibition, which no derivation can express.
      { kind: "forbid", target: "imagery", value: "simulated_people_places_products_or_outcomes" },
      { kind: "require", target: "imagery", value: "weak assets take the typography/CSS/SVG route, never poor photography" },
    ],
    avoid: ["generic_stock_standing_in_for_evidence"],
    fallback: ["typographic and CSS visual treatment"],
    rationale:
      "Weak imagery behind elaborate effects reads as a business with nothing to show; typography and diagrams state the same thing honestly.",
    source_urls: ["https://www.w3.org/WAI/tutorials/images/"],
    confidence: "high",
  }),
  // ------------------------------------------------------------ §4.14/4.15 quality
  parseRule({
    id: "DD-107",
    title: "Production is not build success",
    domain: "quality",
    classification: "gate",
    consumer: "quality/scoring.ts",
    sourceSection: "§4.14",
    then: [
      { kind: "require", target: "quality", value: "all hard gates pass before production, regardless of score" },
    ],
    avoid: ["treating_a_green_build_as_production_readiness"],
    fallback: ["block release and report the failing gate"],
    rationale:
      "Compilation proves the code runs, not that the website works for a person; the gates are what test the latter.",
    source_urls: ["https://nextjs.org/docs/app/guides/production-checklist"],
    confidence: "high",
  }),
  parseRule({
    id: "DD-113",
    title: "No auto-rotation for primary content",
    domain: "interaction",
    classification: "gate",
    consumer: "design-intelligence/engine/select-elements.ts",
    sourceSection: "§4.15",
    then: [
      { kind: "forbid", target: "interaction", value: "auto-rotating-carousel" },
      { kind: "require", target: "interaction", value: "user-controlled advancement with visible controls" },
    ],
    avoid: ["auto-rotating-carousel"],
    fallback: ["static grid or manual carousel"],
    rationale: "Users need control and should not miss primary content.",
    source_urls: [BAYMARD],
    confidence: "high",
  }),
  parseRule({
    id: "DD-114",
    title: "Map selection",
    domain: "interaction",
    classification: "executable",
    consumer: "stack/select-stack.ts",
    sourceSection: "§4.15",
    if: [{ fact: "locationVerified", op: "eq", value: true }],
    then: [{ kind: "set", target: "map", value: "interactive_map" }],
    otherwise: [{ kind: "set", target: "map", value: "address_plus_directions_link_and_static_context" }],
    require: [
      { kind: "require", target: "map", value: "text/list alternative" },
      { kind: "require", target: "map", value: "lazy loaded, never on the initial route" },
    ],
    avoid: ["initial_route_heavy_map_embed"],
    fallback: ["simple location card"],
    rationale: "Maps are high-cost interactive embeds and should solve a geographic task.",
    source_urls: [EMBEDS],
    confidence: "high",
  }),
  parseRule({
    id: "DD-115",
    title: "Video background",
    domain: "motion",
    classification: "gate",
    consumer: "evaluator",
    sourceSection: "§4.15",
    if: [{ fact: "variables.visual_asset_quality", op: "eq", value: "high" }],
    then: [{ kind: "set", target: "videoBackground", value: "muted_background_video_allowed" }],
    unless: [
      { fact: "variables.performance_sensitivity", op: "eq", value: "high" },
      { fact: "variables.mobile_share", op: "eq", value: "high" },
    ],
    require: [{ kind: "require", target: "videoBackground", value: "poster image; explicit controls for meaningful video" }],
    avoid: ["audio_autoplay", "video_only_proposition"],
    fallback: ["poster image only"],
    rationale:
      "Background video buys atmosphere with bandwidth and LCP, which is a poor trade on a mobile-dominant or performance-sensitive site.",
    source_urls: [VITALS],
    confidence: "high",
  }),
];
