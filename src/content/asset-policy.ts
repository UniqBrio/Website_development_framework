/**
 * Asset replacement policy — specification §J.2 and §13.
 *
 * §J.2 is a 15-row table: for each missing item, what replaces it publicly,
 * whether it is hidden, and whether the customer must be asked. Encoded as data
 * so the generator cannot improvise a substitute — improvising a substitute for
 * a testimonial is how fabricated proof gets built by accident.
 */

export interface AssetReplacement {
  /** What ships publicly in place of the missing item. `null` = nothing ships. */
  publicReplacement: string | null;
  /** §J.2 "Publicly hide?" — true means the section does not render at all. */
  hidePublicly: boolean;
  /** §J.2 "Ask customer?" */
  askCustomer: boolean;
  /** `critical` items block a conversion path, not merely a section. */
  criticality: "normal" | "critical";
  /**
   * True when a *generated* substitute is permitted. False for anything a
   * visitor could read as factual business evidence (§13). This is the field
   * that makes "never simulate real customers, employees, facilities, products
   * or outcomes" mechanical rather than advisory.
   */
  generatedSubstituteAllowed: boolean;
}

export const ASSET_REPLACEMENT_POLICY: Record<string, AssetReplacement> = {
  official_logo: {
    publicReplacement: "verified_name_wordmark_or_provisional_monogram",
    hidePublicly: false,
    askCustomer: true,
    criticality: "normal",
    // A wordmark set from the SUPPLIED business name states no fact beyond the name
    // itself, so it is a legitimate generated substitute (FD-13: the name carries no
    // verification state; "verified" in the value below is a rule id, not a claim).
    generatedSubstituteAllowed: true,
  },
  brand_colors: {
    publicReplacement: "accessible_neutral_token_system",
    hidePublicly: false,
    askCustomer: true,
    criticality: "normal",
    generatedSubstituteAllowed: true,
  },
  decorative_hero_image: {
    // DD-097: missing hero imagery becomes a typographic/CSS/SVG visual that
    // cannot be read as evidence — never a stock photo posing as the business.
    publicReplacement: "css_svg_typographic_visual",
    hidePublicly: false,
    askCustomer: true,
    criticality: "normal",
    // Decorative only — a generated visual that cannot be read as evidence.
    generatedSubstituteAllowed: true,
  },
  product_images: {
    publicReplacement: null,
    hidePublicly: true,
    askCustomer: true,
    criticality: "critical",
    generatedSubstituteAllowed: false,
  },
  team_photographs: {
    publicReplacement: "process_or_approach_section",
    hidePublicly: true,
    askCustomer: true,
    criticality: "normal",
    generatedSubstituteAllowed: false,
  },
  testimonials: {
    publicReplacement: "process_or_proof_only_if_verified",
    hidePublicly: true,
    askCustomer: true,
    criticality: "normal",
    generatedSubstituteAllowed: false,
  },
  client_logos: {
    publicReplacement: null,
    hidePublicly: true,
    askCustomer: true,
    criticality: "normal",
    generatedSubstituteAllowed: false,
  },
  awards: {
    publicReplacement: null,
    hidePublicly: true,
    askCustomer: true,
    criticality: "normal",
    generatedSubstituteAllowed: false,
  },
  statistics: {
    publicReplacement: null,
    hidePublicly: true,
    askCustomer: true,
    criticality: "normal",
    generatedSubstituteAllowed: false,
  },
  contact_details: {
    publicReplacement: null,
    hidePublicly: true,
    askCustomer: true,
    criticality: "critical",
    generatedSubstituteAllowed: false,
  },
  social_links: {
    publicReplacement: null,
    hidePublicly: true,
    askCustomer: true,
    criticality: "normal",
    generatedSubstituteAllowed: false,
  },
  pricing: {
    publicReplacement: "approved_enquiry_route_only",
    hidePublicly: true,
    askCustomer: true,
    criticality: "normal",
    generatedSubstituteAllowed: false,
  },
  services: {
    publicReplacement: "supplied_names_only",
    hidePublicly: true,
    askCustomer: true,
    criticality: "normal",
    generatedSubstituteAllowed: false,
  },
  portfolio_case_studies: {
    publicReplacement: "capability_or_process_section",
    hidePublicly: true,
    askCustomer: true,
    criticality: "normal",
    generatedSubstituteAllowed: false,
  },
  certifications_reviews: {
    publicReplacement: null,
    hidePublicly: true,
    askCustomer: true,
    criticality: "normal",
    generatedSubstituteAllowed: false,
  },
};

export function replacementFor(item: string): AssetReplacement | undefined {
  return ASSET_REPLACEMENT_POLICY[item];
}

/**
 * §13 image strategy: the strategy follows actual asset quality, never the
 * other way round.
 */
export type ImageStrategy =
  | "authentic_strategic"
  | "authentic_selective"
  | "typography_css_svg_diagram_led"
  | "non_representational_only";

export function imageStrategyFor(
  visualAssetQuality: "none" | "low" | "medium" | "high",
): { strategy: ImageStrategy; rationale: string } {
  switch (visualAssetQuality) {
    case "high":
      return {
        strategy: "authentic_strategic",
        rationale: "Authentic high-quality imagery exists; use it strategically (§13).",
      };
    case "medium":
      return {
        strategy: "authentic_selective",
        rationale: "Some imagery exists; art direction is possible but must be selective (§13).",
      };
    case "low":
      return {
        strategy: "typography_css_svg_diagram_led",
        rationale:
          "Imagery is weak, generic or inconsistent; prefer typography/CSS/SVG/diagrams over poor photography (§13).",
      };
    case "none":
      return {
        strategy: "non_representational_only",
        rationale:
          "No authentic visual assets. Generated visuals are permitted ONLY where they cannot be read as factual business evidence — never simulated customers, employees, facilities, products or outcomes (§13).",
      };
  }
}
