/**
 * Industry baseline — specification §5 and appendix B.
 *
 * An industry is a PRIOR, never a template (§5). Everything here is a starting
 * risk posture that business facts, audience, objective, content and brand may
 * override. `overrides/` is the layer that does the overriding; this file must
 * not contain a single unconditional design choice.
 */
import type { Industry } from "../types/business-input.js";

export type ExpressionCeiling = "low" | "low_to_medium" | "medium" | "medium_to_high" | "high";
export type MotionCap =
  | "none"
  | "minimal"
  | "low"
  | "low_to_medium"
  | "medium"
  | "medium_to_high"
  | "high";

export interface IndustryBaseline {
  /** Appendix B "Industry group". */
  group: string;
  /** Appendix B "Default archetype" — also selects the route budget (§H.1). */
  archetype: string;
  visualExpression: ExpressionCeiling;
  motionCap: MotionCap;
  /** Appendix B "Required proof/content" — sections that must exist. */
  requiredContent: readonly string[];
  /** Appendix B "Default prohibited patterns" — forbidden unless overridden. */
  prohibited: readonly string[];
  /** §1.3 trust_requirement prior. */
  trust: "low" | "medium" | "high" | "very_high";
}

/**
 * Appendix B's 14 groups, transcribed. Several spec industries share a group
 * (legal + healthcare; art/photography/fashion), so the mapping is
 * many-to-one and the group name is retained for explainability.
 */
const GROUPS: Record<string, IndustryBaseline> = {
  professional_services: {
    group: "Professional services",
    archetype: "credibility_led_information_architecture",
    visualExpression: "low_to_medium",
    motionCap: "low",
    requiredContent: ["services", "process", "verified_credentials", "clear_contact"],
    prohibited: ["decorative_webgl", "cursor_follower", "experimental_navigation"],
    trust: "high",
  },
  saas: {
    group: "SaaS",
    archetype: "product_led_technical_narrative",
    visualExpression: "medium",
    motionCap: "low_to_medium",
    requiredContent: ["product_proof", "use_cases", "integrations", "security", "cta"],
    prohibited: ["productless_abstraction", "unnecessary_3d"],
    trust: "high",
  },
  ai: {
    group: "AI",
    archetype: "explainable_product_narrative",
    visualExpression: "medium",
    motionCap: "low_to_medium",
    requiredContent: ["workflow", "data_privacy", "limitations_and_controls", "proof"],
    prohibited: ["generic_ai_orb", "unverified_benchmarks"],
    trust: "high",
  },
  finance: {
    group: "Finance/banking",
    archetype: "trust_first_transactional_information",
    visualExpression: "low",
    motionCap: "minimal",
    requiredContent: ["terms", "fees", "security", "support", "disclosures"],
    prohibited: ["novel_navigation", "heavy_motion", "decorative_3d"],
    trust: "very_high",
  },
  legal_healthcare: {
    group: "Legal/healthcare",
    archetype: "high_trust_service_clarity",
    visualExpression: "low",
    motionCap: "minimal",
    requiredContent: ["qualifications", "process", "location_contact", "clear_language"],
    prohibited: ["kinetic_type", "autoplay_video", "cursor_effects"],
    trust: "very_high",
  },
  education: {
    group: "Education/university",
    archetype: "audience_segmented_content_hub",
    visualExpression: "medium",
    motionCap: "low",
    requiredContent: ["programs", "outcomes", "admissions", "resources", "search"],
    prohibited: ["overly_shallow_ia"],
    trust: "high",
  },
  sports_fitness: {
    group: "Sports/fitness",
    archetype: "community_and_schedule_hub",
    visualExpression: "medium_to_high",
    motionCap: "medium",
    requiredContent: ["schedule", "registration", "coaches", "safety", "location"],
    prohibited: ["motion_obscuring_practical_information"],
    trust: "medium",
  },
  hospitality_travel: {
    group: "Hospitality/travel",
    archetype: "image_led_editorial_conversion",
    visualExpression: "high",
    motionCap: "medium",
    requiredContent: ["booking", "location", "amenities", "policies"],
    prohibited: ["hidden_booking_flow", "heavy_unoptimized_media"],
    trust: "medium",
  },
  ecommerce: {
    group: "Ecommerce/retail",
    archetype: "discovery_to_checkout_system",
    visualExpression: "medium",
    motionCap: "low",
    requiredContent: ["catalog", "filters", "gallery", "price", "returns", "checkout"],
    prohibited: ["auto_carousel", "hover_only_product_info"],
    trust: "medium",
  },
  architecture_interiors: {
    group: "Architecture/interiors",
    archetype: "editorial_portfolio_conversion",
    visualExpression: "high",
    motionCap: "low_to_medium",
    requiredContent: ["projects", "services", "process", "inquiry"],
    prohibited: ["fake_projects", "hidden_work_navigation"],
    trust: "medium",
  },
  art_fashion: {
    group: "Art/photography/fashion",
    archetype: "image_led_authorship_commerce",
    visualExpression: "high",
    motionCap: "medium",
    requiredContent: ["work_gallery", "product_detail", "brand_context"],
    prohibited: ["weak_imagery_behind_elaborate_effects"],
    trust: "low",
  },
  creative_agency: {
    group: "Creative agency",
    archetype: "portfolio_and_capability_narrative",
    visualExpression: "high",
    motionCap: "medium_to_high",
    requiredContent: ["work", "outcomes", "services", "contact"],
    prohibited: ["effects_that_block_work_discovery"],
    trust: "medium",
  },
  corporate_nonprofit: {
    group: "Corporate/nonprofit",
    archetype: "reputation_and_evidence_hub",
    visualExpression: "medium",
    motionCap: "low",
    requiredContent: ["governance", "impact", "proof", "contact"],
    prohibited: ["unsubstantiated_impact_claims"],
    trust: "high",
  },
  local_business: {
    group: "Local business",
    archetype: "local_action_page",
    visualExpression: "low_to_medium",
    motionCap: "low",
    requiredContent: ["location", "hours", "contact", "services"],
    prohibited: ["fake_local_details", "immersive_complexity"],
    trust: "medium",
  },
  /**
   * FD-10. A food-service visitor asks three questions: what is served, where is it,
   * when is it open. Every required section here has a renderer (C1 registry), so the
   * baseline cannot decide something the generator can only slot. Imagery is NOT
   * assumed: the expression ceiling stays low-to-medium and rises only on real assets.
   */
  food_service: {
    group: "Food service",
    archetype: "local_action_page",
    visualExpression: "low_to_medium",
    motionCap: "low",
    requiredContent: ["services", "hours", "location", "contact"],
    prohibited: ["fake_local_details", "immersive_complexity", "simulated_food_photography"],
    trust: "medium",
  },
};

/** Industry → appendix B group key. */
const INDUSTRY_TO_GROUP: Record<Industry, keyof typeof GROUPS> = {
  professional_services: "professional_services",
  real_estate: "professional_services",
  construction: "professional_services",
  manufacturing: "professional_services",
  logistics: "professional_services",
  saas: "saas",
  ai: "ai",
  finance: "finance",
  banking: "finance",
  legal: "legal_healthcare",
  healthcare: "legal_healthcare",
  education: "education",
  education_for_children: "education",
  university: "education",
  sports: "sports_fitness",
  fitness: "sports_fitness",
  hospitality: "hospitality_travel",
  food_service: "food_service",
  travel: "hospitality_travel",
  ecommerce: "ecommerce",
  retail: "ecommerce",
  architecture: "architecture_interiors",
  interiors: "architecture_interiors",
  art: "art_fashion",
  photography: "art_fashion",
  fashion: "art_fashion",
  creative_agency: "creative_agency",
  corporate: "corporate_nonprofit",
  nonprofit: "corporate_nonprofit",
  government: "corporate_nonprofit",
  local_business: "local_business",
  automotive: "ecommerce",
  media: "art_fashion",
  editorial: "art_fashion",
  entertainment: "art_fashion",
  campaign: "creative_agency",
  /**
   * `other` deliberately gets the MOST restrictive posture, not a neutral one.
   * An unknown industry is an unknown risk profile, and §0.2 puts trust above
   * visual novelty — so the default is restraint the business can argue out of,
   * never expression it has to be talked down from.
   */
  other: "professional_services",
};

export function industryBaseline(industry: Industry): IndustryBaseline {
  const key = INDUSTRY_TO_GROUP[industry];
  const baseline = GROUPS[key];
  if (!baseline) {
    throw new Error(`no appendix B baseline registered for industry group "${key}"`);
  }
  return baseline;
}

/** Exposed for a coverage test: every Industry must map to a real group. */
export const industryGroupKeys = Object.keys(GROUPS);
export const industryToGroup = INDUSTRY_TO_GROUP;
