/**
 * Design Context Profile — specification §4 and §1.2.
 *
 * The profile is the ONLY thing the decision engine reads. Rules never touch
 * raw BusinessInput, so every rule precondition is expressed over a small,
 * closed set of normalised variables. That is what makes rule evaluation
 * deterministic and testable (§28, §29).
 */
import { z } from "zod";
import type { BrandPersonality, Industry, WebsiteObjective } from "./business-input.js";

export const lowMedHighSchema = z.enum(["low", "medium", "high"]);
export type LowMedHigh = z.infer<typeof lowMedHighSchema>;

/** §1.2 derived_variables, verbatim. */
export const derivedVariablesSchema = z.object({
  trust_requirement: z.enum(["low", "medium", "high", "very_high"]),
  emotional_intensity: lowMedHighSchema,
  information_density: lowMedHighSchema,
  visual_asset_quality: z.enum(["none", "low", "medium", "high"]),
  product_service_complexity: lowMedHighSchema,
  purchase_cycle: z.enum(["immediate", "short", "considered", "long", "regulated"]),
  seo_dependency: lowMedHighSchema,
  performance_sensitivity: lowMedHighSchema,
  accessibility_requirement: z.enum(["baseline", "wcag_aa", "wcag_aaa_or_equivalent"]),
  mobile_share: lowMedHighSchema,
  technical_complexity_budget: lowMedHighSchema,
  brand_expression_need: lowMedHighSchema,
  content_confidence: z.enum([
    "verified",
    "incomplete",
    "ai_draft",
    "placeholder",
    "verification_required",
  ]),
  commerce_depth: z.enum(["none", "shallow", "medium", "deep"]),
  audience_digital_literacy: lowMedHighSchema,
  regulation_risk: lowMedHighSchema,
});
export type DerivedVariables = z.infer<typeof derivedVariablesSchema>;

/**
 * Where a derived value came from. §30 requires every important decision to be
 * explainable; a derivation is a decision, so it carries its own provenance.
 * `inferred` values are the ones a human should check first.
 */
export const derivationProvenanceSchema = z.object({
  variable: z.string(),
  value: z.string(),
  basis: z.enum(["stated", "industry_prior", "inferred", "default"]),
  evidence: z.string(),
});
export type DerivationProvenance = z.infer<typeof derivationProvenanceSchema>;

export const designContextProfileSchema = z.object({
  businessName: z.string(),
  industry: z.string(),
  subIndustry: z.string().optional(),
  primaryObjective: z.string(),
  secondaryObjectives: z.array(z.string()),
  personalities: z.array(z.string()),
  variables: derivedVariablesSchema,
  /** One entry per variable. Length is asserted by a test. */
  provenance: z.array(derivationProvenanceSchema),
  /** Set when the owner stated a hard ceiling; caps the expression budget. */
  maxVisualExpression: lowMedHighSchema.optional(),
  /** Verbatim from input; §24 needs it and it may never be inferred. */
  pwaRequested: z.boolean(),
});
export type DesignContextProfile = Omit<
  z.infer<typeof designContextProfileSchema>,
  "industry" | "primaryObjective" | "secondaryObjectives" | "personalities"
> & {
  industry: Industry;
  primaryObjective: WebsiteObjective;
  secondaryObjectives: WebsiteObjective[];
  personalities: BrandPersonality[];
};
