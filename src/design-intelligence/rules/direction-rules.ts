/**
 * Decision rules DD-001..DD-018 — specification §4.1 (business and design
 * direction) and §4.2 (brand personality).
 *
 * Transcribed from the specification, expressed in the schema from
 * types/decision.ts. Where the published rule text uses a key outside §3's
 * canonical set (`otherwise`, `require`, `allow =`, `+=`), the mapping recorded
 * in assessment §F2 applies.
 *
 * Facts available to `if`/`unless`: everything on the DesignContextProfile —
 * `industry`, `personalities`, `primaryObjective`, `pwaRequested`, and
 * `variables.*`.
 */
import { parseRule, type Rule } from "../types/decision.js";

const WCAG = "https://www.w3.org/TR/WCAG22/";
const AWWWARDS = "https://www.awwwards.com/about-evaluation/";
const M3_STATES = "https://m3.material.io/foundations/interaction/states";

/** `personalities` is an ARRAY fact, so membership needs `contains`, not `in`. */
function hasPersonality(name: string) {
  return { fact: "personalities", op: "contains" as const, value: name };
}

export const DIRECTION_RULES: readonly Rule[] = [
  parseRule({
    id: "DD-001",
    title: "Professional services",
    domain: "direction",
    classification: "executable",
    consumer: "evaluator",
    sourceSection: "§4.1",
    if: [
      { fact: "industry", op: "in", value: ["professional_services", "real_estate", "construction", "manufacturing", "logistics", "other"] },
      { fact: "variables.trust_requirement", op: "in", value: ["high", "very_high"] },
    ],
    then: [
      { kind: "set", target: "designPersonality", value: "credible, clear, restrained, expert" },
      { kind: "set", target: "layout.system", value: "structured_content_rail_plus_evidence_modules" },
      { kind: "set", target: "hero.pattern", value: "audience_outcome_proof_consultation_cta" },
      { kind: "cap", target: "interaction.level", value: "low" },
    ],
    unless: [
      { fact: "variables.visual_asset_quality", op: "eq", value: "high" },
      { fact: "variables.brand_expression_need", op: "eq", value: "high" },
    ],
    prefer: ["readable typography", "case studies when verified", "methodology/process section", "clear service cards"],
    avoid: ["cursor-follower", "decorative-webgl-hero", "experimental_navigation"],
    fallback: ["typography-led hero with CSS visual treatment"],
    rationale:
      "High-stakes service decisions need clarity, proof and predictable paths more than novelty.",
    source_urls: [WCAG, AWWWARDS],
    confidence: "high",
  }),
  parseRule({
    id: "DD-002",
    title: "SaaS",
    domain: "direction",
    classification: "executable",
    consumer: "evaluator",
    sourceSection: "§4.1",
    if: [
      { fact: "industry", op: "eq", value: "saas" },
      { fact: "variables.product_service_complexity", op: "in", value: ["medium", "high"] },
    ],
    then: [
      { kind: "set", target: "designPersonality", value: "technical confidence" },
      { kind: "set", target: "hero.pattern", value: "outcome_role_product_proof_trial_cta" },
      // The specification's `section_architecture += [...]`.
      {
        kind: "append",
        target: "sectionArchitecture",
        value: ["workflow", "features", "integrations", "security", "evidence", "faq"],
      },
    ],
    prefer: ["product screenshots", "SVG diagrams", "modular grid or bento only for truly modular features", "interactive demo with static explanation"],
    avoid: ["decorative-webgl-hero", "generic_ai_gradient_without_product_meaning"],
    fallback: ["static screenshots and vertical workflow explanation"],
    rationale: "Complex products need progressive explanation and verifiable proof.",
    source_urls: ["https://nextjs.org/docs", "https://m3.material.io/"],
    confidence: "high",
  }),
  parseRule({
    id: "DD-003",
    title: "AI companies",
    domain: "direction",
    classification: "executable",
    consumer: "evaluator",
    sourceSection: "§4.1",
    if: [{ fact: "industry", op: "eq", value: "ai" }],
    then: [
      { kind: "set", target: "designPersonality", value: "explainable, precise, accountable" },
      {
        kind: "append",
        target: "sectionArchitecture",
        value: ["workflow", "data_and_privacy", "limitations_and_controls", "evidence"],
      },
    ],
    require: [
      { kind: "require", target: "content", value: "state limitations and human controls explicitly" },
    ],
    prefer: ["workflow diagrams", "verified benchmarks only"],
    avoid: ["generic_ai_orb", "unverified_benchmarks"],
    fallback: ["static workflow diagram with HTML explanation"],
    rationale:
      "AI products are bought on explainability and data handling; an abstract visual answers neither question.",
    source_urls: [WCAG],
    confidence: "high",
  }),
  parseRule({
    id: "DD-004",
    title: "Finance and banking",
    domain: "direction",
    classification: "executable",
    consumer: "evaluator",
    sourceSection: "§4.1",
    if: [{ fact: "industry", op: "in", value: ["finance", "banking"] }],
    then: [
      { kind: "set", target: "designPersonality", value: "trust-first, plain, transactional" },
      { kind: "cap", target: "visualExpression", value: "low" },
      { kind: "cap", target: "motion.cap", value: "minimal" },
      {
        kind: "append",
        target: "sectionArchitecture",
        value: ["terms", "fees", "security", "support", "disclosures"],
      },
    ],
    avoid: ["novel_navigation", "decorative-webgl-hero", "parallax-depth", "cursor-follower"],
    fallback: ["plain structured information architecture"],
    rationale:
      "Financial decisions carry consequence; disclosure and predictability outrank expression.",
    source_urls: [WCAG],
    confidence: "high",
  }),
  parseRule({
    id: "DD-005",
    title: "Legal",
    domain: "direction",
    classification: "executable",
    consumer: "evaluator",
    sourceSection: "§4.1",
    if: [{ fact: "industry", op: "eq", value: "legal" }],
    then: [
      { kind: "set", target: "designPersonality", value: "precise, qualified, plain-speaking" },
      { kind: "cap", target: "visualExpression", value: "low" },
      { kind: "cap", target: "motion.cap", value: "minimal" },
      {
        kind: "append",
        target: "sectionArchitecture",
        value: ["qualifications", "process", "location_and_contact", "plain_language_summary"],
      },
    ],
    require: [{ kind: "require", target: "content", value: "plain language over legal jargon" }],
    avoid: ["kinetic_type", "autoplay_video", "cursor-follower", "decorative-webgl-hero"],
    fallback: ["typography-led layout with verified credentials"],
    rationale:
      "A person seeking legal help is deciding under pressure and often under consequence; clarity and verifiable qualification outrank expression.",
    source_urls: [WCAG],
    confidence: "high",
  }),
  parseRule({
    id: "DD-006",
    title: "Healthcare",
    domain: "direction",
    classification: "executable",
    consumer: "evaluator",
    sourceSection: "§4.1",
    if: [{ fact: "industry", op: "eq", value: "healthcare" }],
    then: [
      { kind: "set", target: "designPersonality", value: "clear, calm, qualified" },
      { kind: "cap", target: "visualExpression", value: "low" },
      { kind: "cap", target: "motion.cap", value: "minimal" },
      {
        kind: "append",
        target: "sectionArchitecture",
        value: ["qualifications", "process", "location_and_contact", "plain_language_summary"],
      },
    ],
    require: [{ kind: "require", target: "content", value: "plain language over clinical jargon" }],
    avoid: ["kinetic_type", "autoplay_video", "cursor-follower", "decorative-webgl-hero"],
    fallback: ["typography-led layout with verified credentials"],
    rationale:
      "A person seeking care is often anxious or in pain; clarity and calm are the design requirements, not expression.",
    source_urls: [WCAG],
    confidence: "high",
  }),
  parseRule({
    id: "DD-007",
    title: "Ecommerce",
    domain: "direction",
    classification: "executable",
    consumer: "evaluator",
    sourceSection: "§4.1",
    if: [{ fact: "industry", op: "in", value: ["ecommerce", "retail"] }],
    then: [
      { kind: "set", target: "designPersonality", value: "efficient, confident, product-led" },
      {
        kind: "append",
        target: "sectionArchitecture",
        value: ["catalog", "filters", "gallery", "price", "returns", "checkout"],
      },
    ],
    avoid: ["auto-rotating-carousel", "hover-only-product-info"],
    fallback: ["static product grid with visible detail"],
    rationale: "Discovery and checkout completion govern; anything obstructing them loses revenue.",
    source_urls: ["https://baymard.com/learn/ecommerce-ux-best-practices"],
    confidence: "high",
  }),
  parseRule({
    id: "DD-008",
    title: "Creative portfolio",
    domain: "direction",
    classification: "executable",
    consumer: "evaluator",
    sourceSection: "§4.1",
    if: [
      { fact: "industry", op: "in", value: ["creative_agency", "art", "photography", "architecture", "interiors"] },
      { fact: "variables.visual_asset_quality", op: "in", value: ["medium", "high"] },
    ],
    then: [
      { kind: "set", target: "designPersonality", value: "authored, composed, distinctive" },
      { kind: "set", target: "layout.system", value: "editorial_or_asymmetric" },
    ],
    unless: [
      // The work itself is the proof; without assets, effects are all that is
      // left and §A.2 rejects "weak imagery behind elaborate effects".
      { fact: "variables.visual_asset_quality", op: "in", value: ["none", "low"] },
    ],
    prefer: ["work-first navigation", "large considered imagery", "restrained type with one strong voice"],
    avoid: ["effects_that_block_work_discovery"],
    fallback: ["typographic editorial layout until real work is supplied"],
    rationale:
      "A portfolio is judged on the work; the design's job is to present it without competing with it.",
    source_urls: [AWWWARDS],
    confidence: "high",
  }),
  parseRule({
    id: "DD-010",
    title: "Local business",
    domain: "direction",
    classification: "executable",
    consumer: "evaluator",
    sourceSection: "§4.1",
    if: [{ fact: "industry", op: "eq", value: "local_business" }],
    then: [
      { kind: "set", target: "designPersonality", value: "practical, local, immediate" },
      { kind: "cap", target: "visualExpression", value: "low_to_medium" },
      {
        kind: "append",
        target: "sectionArchitecture",
        value: ["location", "hours", "contact", "services"],
      },
    ],
    avoid: ["immersive_complexity", "decorative-webgl-hero"],
    fallback: ["single-column action page"],
    rationale:
      "A local visitor usually wants one fact — where, when, or how to call — and wants it immediately.",
    source_urls: ["https://web.dev/articles/vitals"],
    confidence: "high",
  }),
  // ---------------------------------------------------------------- §4.2
  parseRule({
    id: "DD-013",
    title: "Authoritative personality",
    domain: "direction",
    classification: "executable",
    consumer: "evaluator",
    sourceSection: "§4.2",
    if: [hasPersonality("authoritative")],
    then: [
      { kind: "set", target: "color.strategy", value: "limited_high_contrast_palette" },
      { kind: "set", target: "typography.strategy", value: "clear_sans_or_restrained_serif" },
      { kind: "cap", target: "motion.cap", value: "minimal" },
      // The GRID, not `layout.system`: the system belongs to the industry and
      // density rules (see DD-017). Writing the system made every authoritative
      // professional-services business a permanent DD-001/DD-013 conflict that
      // failed the design gate and escalated a framework decision to the owner
      // (first customer dry run, 2026-09-14).
      { kind: "set", target: "layout.grid", value: "structured_grid" },
    ],
    prefer: ["evidence", "clear labels", "conventional navigation"],
    avoid: ["cursor-follower", "excessive_glow", "informal_illustration_unless_category_fit"],
    fallback: ["content-first layout"],
    rationale: "Authority is communicated through clarity, precision, restraint, and proof.",
    source_urls: [M3_STATES],
    confidence: "high",
  }),
  parseRule({
    id: "DD-014",
    title: "Premium personality",
    domain: "direction",
    classification: "executable",
    consumer: "evaluator",
    sourceSection: "§4.2",
    if: [hasPersonality("premium")],
    then: [
      { kind: "set", target: "typography.strategy", value: "refined_display_plus_legible_body" },
      { kind: "set", target: "spacing.strategy", value: "generous_but_bounded" },
      // NOT `set imagery.strategy`. The strategy is DERIVED from measured asset
      // quality by content/asset-policy.ts, which is the single authority.
      // "high quality or none" is a CONSTRAINT on what may be used, so it is an
      // obligation. Writing it as a strategy value made DD-014 and DD-097
      // compete for a derived field and produced a conflict neither rule could
      // win — the dry run's imagery finding.
      { kind: "require", target: "imagery", value: "high_quality_or_none: never low-quality stock" },
      { kind: "set", target: "layout.composition", value: "editorial_or_material_led" },
    ],
    unless: [{ fact: "variables.visual_asset_quality", op: "in", value: ["none", "low"] }],
    prefer: ["fewer stronger elements", "material-derived color", "controlled motion"],
    avoid: ["low_quality_stock_imagery", "many_competing_effects"],
    fallback: ["typography-led premium system using color, spacing, lines and type"],
    rationale:
      "Premium perception depends on restraint, detail, material quality and coherence.",
    source_urls: [AWWWARDS],
    confidence: "high",
  }),
  parseRule({
    id: "DD-015",
    title: "Technical personality",
    domain: "direction",
    classification: "executable",
    consumer: "evaluator",
    sourceSection: "§4.2",
    if: [hasPersonality("technical")],
    then: [
      { kind: "set", target: "typography.strategy", value: "clean_sans_with_optional_mono_accent" },
      // `imagery.subject` (what the imagery DEPICTS), deliberately not
      // `imagery.strategy` (how imagery is sourced, derived from asset quality).
      // Two unrelated concepts shared one field name, which is why three rules
      // appeared to conflict over a value none of them actually owned.
      { kind: "set", target: "imagery.subject", value: "product_ui_diagrams_data_visuals" },
      // The grid, not the system — same authority as DD-013 and DD-017.
      { kind: "set", target: "layout.grid", value: "modular_grid" },
    ],
    prefer: ["SVG diagrams", "structured sections", "documented states"],
    avoid: ["purely_abstract_imagery_when_explanation_is_needed"],
    fallback: ["static diagram plus HTML explanation"],
    rationale: "Technical audiences benefit from precision and visible system logic.",
    source_urls: ["https://developer.mozilla.org/en-US/docs/Web/SVG"],
    confidence: "high",
  }),
  parseRule({
    id: "DD-016",
    title: "Playful personality",
    domain: "direction",
    classification: "executable",
    consumer: "evaluator",
    sourceSection: "§4.2",
    if: [
      hasPersonality("playful"),
      // The specification's own precondition: playfulness is gated on trust.
      { fact: "variables.trust_requirement", op: "not_in", value: ["high", "very_high"] },
    ],
    then: [
      { kind: "set", target: "color.strategy", value: "vibrant_but_contrast_safe" },
      { kind: "cap", target: "visualExpression", value: "medium" },
    ],
    avoid: ["playfulness_in_high_risk_tasks"],
    fallback: ["friendly but plain system"],
    rationale:
      "Playfulness is category-dependent and must never attach to a high-risk task.",
    source_urls: [WCAG],
    confidence: "high",
  }),
  parseRule({
    id: "DD-018",
    title: "Futuristic personality",
    domain: "direction",
    classification: "executable",
    consumer: "evaluator",
    sourceSection: "§4.2",
    if: [hasPersonality("futuristic")],
    then: [
      { kind: "set", target: "color.strategy", value: "tested_gradients_and_glow" },
      { kind: "set", target: "layout.signature", value: "structured_with_one_signature_motif" },
      { kind: "cap", target: "visualExpression", value: "medium" },
    ],
    prefer: ["one controlled depth motif", "measured contrast on every gradient"],
    avoid: ["generic_neon", "decorative-webgl-hero"],
    fallback: ["structured layout with a single controlled depth cue"],
    rationale:
      "Futuristic reads as controlled depth and technology, not as neon and WebGL filler; one motif does the work.",
    source_urls: [AWWWARDS],
    confidence: "medium",
  }),
];
