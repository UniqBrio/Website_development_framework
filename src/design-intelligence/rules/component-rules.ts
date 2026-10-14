/**
 * Card, gallery, disclosure, interaction-purpose and effect-policy rules —
 * §4.6 (DD-038..DD-044), §4.7 (DD-045, DD-046), §4.15 (DD-119, DD-120).
 *
 * Most of these are GATES whose enforcement already lives in the selection
 * engine or the pattern registry. They are encoded so the decision is
 * auditable under its rule id, and their `forbid` effects feed the forbidden set
 * the selection engine's first gate reads — one enforcement path, not two.
 *
 * DD-120 is a SCORING rule: it sets the selection cap and the signature
 * ceiling the selection engine reads from the draft.
 */
import { parseRule, type Rule } from "../types/decision.js";
import { SELECTION_CAPS } from "../engine/select-elements.js";

const M3_CARDS = "https://m3.material.io/components/cards/accessibility";
const APG_ACCORDION = "https://www.w3.org/WAI/ARIA/apg/patterns/accordion/";
const APG_TABS = "https://www.w3.org/WAI/ARIA/apg/patterns/tabs/";
const BAYMARD_PDP = "https://baymard.com/blog/current-state-ecommerce-product-page-ux";
const BAYMARD_UX = "https://baymard.com/learn/ecommerce-ux-best-practices";
const M3_STATES = "https://m3.material.io/foundations/interaction/states";
const M2_MOTION = "https://m2.material.io/design/motion/understanding-motion.html";
const WCAG21_NEW = "https://www.w3.org/WAI/standards-guidelines/wcag/new-in-21/";
const AWWWARDS = "https://www.awwwards.com/about-evaluation/";

export const COMPONENT_RULES: readonly Rule[] = [
  parseRule({
    id: "DD-038",
    title: "Card usage",
    domain: "layout",
    classification: "gate",
    consumer: "generation/component-model.ts",
    sourceSection: "§4.6",
    if: [{ fact: "hasRepeatedComparableItems", op: "eq", value: true }],
    then: [
      { kind: "set", target: "components.repeatedItems", value: "card_system" },
      { kind: "require", target: "components", value: "each card has a clear subject and either a meaningful action or an explicitly non-interactive state" },
    ],
    otherwise: [{ kind: "set", target: "components.repeatedItems", value: "list_with_headings" }],
    prefer: ["consistent card anatomy", "clear click target"],
    avoid: ["nested_cards", "cards_that_appear_clickable_but_are_not"],
    fallback: ["list with headings and links"],
    rationale: "Cards should represent a single subject and communicate their interactive state.",
    source_urls: [M3_CARDS],
    confidence: "high",
  }),
  parseRule({
    id: "DD-039",
    title: "Expandable cards",
    domain: "interaction",
    classification: "gate",
    consumer: "generation/component-model.ts",
    sourceSection: "§4.6",
    if: [{ fact: "offersHaveDetail", op: "eq", value: true }],
    then: [{ kind: "set", target: "components.expandableCards", value: "allowed" }],
    // "users need to compare all details simultaneously" — a product catalogue is
    // exactly that case, so a commerce objective blocks progressive disclosure.
    unless: [{ fact: "sellsProducts", op: "eq", value: true }],
    otherwise: [{ kind: "set", target: "components.expandableCards", value: "not_allowed" }],
    require: [{ kind: "forbid", target: "components", value: "hiding_essential_price_or_specification" }],
    prefer: ["button semantics", "one-open mode on mobile where appropriate"],
    avoid: ["hiding_essential_price_or_specification"],
    fallback: ["full cards or detail pages"],
    rationale:
      "Progressive disclosure reduces initial density but should not conceal key decision information.",
    source_urls: [APG_ACCORDION],
    confidence: "high",
  }),
  parseRule({
    id: "DD-040",
    title: "Accordion",
    domain: "interaction",
    classification: "executable",
    consumer: "generation/component-model.ts",
    sourceSection: "§4.6",
    if: [{ fact: "hasFaqContent", op: "eq", value: true }],
    then: [
      { kind: "set", target: "components.faq", value: "accessible_accordion" },
      { kind: "forbid", target: "components", value: "core_proposition_or_mandatory_terms_only_inside_collapsed_content" },
    ],
    prefer: ["native details or button with aria-controls", "deep-linkable headings where appropriate"],
    avoid: ["core_proposition_or_mandatory_terms_only_inside_collapsed_content"],
    fallback: ["visible sections"],
    rationale: "Accordions are for secondary, independently expandable details.",
    source_urls: [APG_ACCORDION],
    confidence: "high",
  }),
  parseRule({
    id: "DD-041",
    title: "Tabs",
    domain: "interaction",
    classification: "gate",
    consumer: "generation/component-model.ts",
    sourceSection: "§4.6",
    // The `allow` half needs a fact ("mutually exclusive short alternatives")
    // that no input supplies, so it is not encoded — encoding it on a guess would
    // be the invention this framework refuses. The enforceable half is the
    // prohibition, which the component model honours by never emitting tabs for
    // a page's required sections.
    then: [
      { kind: "forbid", target: "components", value: "tabs_hiding_a_pages_main_content" },
      { kind: "require", target: "components", value: "tabs, if ever used, carry accessible tab roles and keyboard behaviour" },
    ],
    prefer: ["accessible tab roles and keyboard behavior"],
    avoid: ["tabs_used_to_hide_an_entire_pages_main_content"],
    fallback: ["stacked sections or anchor links"],
    rationale: "Tabs work for closely related views, not long concealed content.",
    source_urls: [APG_TABS],
    confidence: "high",
  }),
  parseRule({
    id: "DD-042",
    title: "Gallery selection",
    domain: "interaction",
    classification: "executable",
    consumer: "design-intelligence/engine/select-elements.ts",
    sourceSection: "§4.6",
    if: [
      { fact: "sellsProducts", op: "eq", value: true },
      { fact: "hasProductVisualProof", op: "eq", value: true },
    ],
    then: [
      { kind: "set", target: "components.gallery", value: "interactive_gallery" },
      { kind: "forbid", target: "interaction", value: "auto-rotating-carousel" },
      { kind: "forbid", target: "interaction", value: "hover-only-product-info" },
    ],
    prefer: ["manual controls", "captions/alt", "responsive source sizes"],
    avoid: ["auto_rotating_gallery", "hover_only_navigation"],
    fallback: ["responsive static grid"],
    rationale: "Galleries support inspection when imagery is actual evidence.",
    source_urls: [BAYMARD_PDP],
    confidence: "high",
  }),
  parseRule({
    id: "DD-043",
    title: "Carousel limits",
    domain: "interaction",
    classification: "gate",
    consumer: "design-intelligence/engine/select-elements.ts",
    sourceSection: "§4.6",
    then: [
      { kind: "set", target: "components.carousel", value: "secondary_content_only" },
      { kind: "forbid", target: "interaction", value: "auto-rotating-carousel" },
      { kind: "require", target: "components", value: "any carousel has manual controls, keyboard access, touch access and a visible position indicator" },
    ],
    prefer: ["static grid for primary content"],
    avoid: ["autorotation_on_mobile", "hiding_product_breadth_in_carousel"],
    fallback: ["vertical list or grid"],
    rationale: "Auto-rotating carousels create missed content and poor control.",
    source_urls: [BAYMARD_UX],
    confidence: "high",
  }),
  parseRule({
    id: "DD-044",
    title: "Before/after",
    domain: "interaction",
    classification: "gate",
    consumer: "design-intelligence/engine/select-elements.ts",
    sourceSection: "§4.6",
    if: [{ fact: "hasMatchedBeforeAfter", op: "eq", value: true }],
    then: [{ kind: "set", target: "components.beforeAfter", value: "allowed_with_static_pair_fallback" }],
    // No matched evidence means the comparison would be a misleading claim.
    otherwise: [{ kind: "forbid", target: "interaction", value: "before-after" }],
    prefer: ["range input or accessible controls", "labelled static pair fallback"],
    avoid: ["misleading_transformation_claims"],
    fallback: ["side-by-side annotated images"],
    rationale: "Direct visual comparison can demonstrate change when evidence is genuine.",
    source_urls: [BAYMARD_PDP],
    confidence: "high",
  }),
  // ------------------------------------------------------------ §4.7 (kept)
  parseRule({
    id: "DD-045",
    title: "Micro-interactions",
    domain: "interaction",
    classification: "gate",
    consumer: "generation/render/css.ts",
    sourceSection: "§4.7",
    then: [
      { kind: "set", target: "interaction.stateFeedback", value: "required" },
      { kind: "require", target: "interaction", value: "visible focus, pressed, selected, loading, success and error states with no decorative delay" },
    ],
    prefer: ["focus, pressed, selected, loading, success, error states"],
    avoid: ["decorative_delay_before_response"],
    fallback: ["immediate static state change"],
    rationale: "Interaction feedback communicates action availability and outcome.",
    source_urls: [M3_STATES],
    confidence: "high",
  }),
  parseRule({
    id: "DD-046",
    title: "Motion purpose",
    domain: "motion",
    classification: "gate",
    consumer: "design-intelligence/engine/select-elements.ts",
    sourceSection: "§4.7",
    then: [
      { kind: "require", target: "motion", value: "every animation serves one of: state feedback, spatial relationship, sequence explanation, attention guidance" },
      { kind: "forbid", target: "motion", value: "animation_without_stated_purpose" },
    ],
    // "a single restrained brand atmosphere layer within budget" is the one
    // permitted exception, and it is what the ambient-per-viewport ceiling in
    // animation_library.md already bounds.
    unless: [{ fact: "variables.brand_expression_need", op: "eq", value: "high" }],
    avoid: ["animation_without_stated_purpose"],
    fallback: ["static composition or opacity state"],
    rationale: "Motion should communicate relationships, availability, or outcomes.",
    source_urls: [M2_MOTION],
    confidence: "high",
  }),
  // ------------------------------------------------------------ §4.15
  parseRule({
    id: "DD-119",
    title: "Horizontal scrolling",
    domain: "interaction",
    classification: "gate",
    consumer: "design-intelligence/engine/select-elements.ts",
    sourceSection: "§4.15",
    then: [
      { kind: "forbid", target: "interaction", value: "horizontal_primary_page_navigation" },
      { kind: "forbid", target: "interaction", value: "scroll_hijacking" },
      { kind: "require", target: "interaction", value: "any horizontal section has manual controls, keyboard access and a vertical mobile fallback" },
    ],
    avoid: ["horizontal_primary_page_navigation", "scroll_hijacking"],
    fallback: ["vertical sequence/grid"],
    rationale:
      "Two-dimensional movement should be reserved for content where spatial relationship is meaningful.",
    source_urls: [WCAG21_NEW],
    confidence: "high",
  }),
  parseRule({
    id: "DD-120",
    title: "Minimum selected-effect policy",
    domain: "quality",
    classification: "scoring",
    consumer: "design-intelligence/engine/select-elements.ts",
    sourceSection: "§4.15",
    then: [
      // The numbers live in engine/select-elements.ts (the consumer); the rule cites them.
      { kind: "set", target: "selection.maxElements", value: SELECTION_CAPS.maxElements },
      { kind: "set", target: "selection.minElements", value: SELECTION_CAPS.minElements },
      { kind: "set", target: "selection.maxSignatureExperiences", value: SELECTION_CAPS.maxSignatureExperiences },
    ],
    prefer: ["one coherent motion language", "one primary visual motif"],
    avoid: ["combining_cursor_magnetic_parallax_webgl_horizontal_morph_kinetic_on_one_page"],
    fallback: ["remove lowest-value effects"],
    rationale:
      "Visual coherence and performance improve when each page has a controlled grammar.",
    source_urls: [AWWWARDS, "https://web.dev/articles/animations-and-performance"],
    confidence: "high",
  }),
];
