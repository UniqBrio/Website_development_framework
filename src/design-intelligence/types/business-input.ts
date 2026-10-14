/**
 * Input Contract — specification §1.1.
 *
 * Zod is the single source of truth: the TypeScript types are inferred from
 * the schemas, so a schema and its type cannot drift apart. This is the
 * color_system.md lesson (one value, four plausible homes, none canonical)
 * applied to the input contract.
 */
import { z } from "zod";
import { ENGAGEMENT_CATEGORY_IDS, ENGAGEMENT_PREFERENCES, VISITOR_TASKS } from "../../engagement/vocabulary.js";
import { provenanceRecordFields } from "../../content/provenance.js";

/**
 * WHERE MATERIAL CAME FROM, and whether that source authorises publication (FD-05).
 *
 * A fact can be true and still not publishable: a menu headed "For design
 * illustrations only" is customer material whose source authorises nothing. The
 * value's own verification cannot override its source: `not_authorized` withholds
 * every value citing it, and `unknown` is not authorisation.
 */
export const SOURCE_KINDS = [
  "customer_document",
  "customer_statement",
  "customer_asset",
  "ai_generation",
  "public_discovery",
  "operator_inference",
] as const;

export const sourceRecordSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]{0,60}$/, "source ids are lowercase slugs"),
  kind: z.enum(SOURCE_KINDS),
  description: z.string().min(1),
  publication: z.enum(["authorized", "not_authorized", "unknown"]),
  /** The source's own words that decide `publication`, verbatim. */
  restrictionEvidence: z.string().optional(),
  /**
   * FILE-LEVEL PROVENANCE (C2.2). A supplied file can carry its own account of where
   * it came from — C2PA content credentials are the case the first real customer hit:
   * a logo whose manifest said an AI file service "may have created or modified" it,
   * origin confidence unknown. An asset whose file provenance is not confirmed cannot
   * be verified by the inventory alone; it needs the customer's confirmation.
   */
  file: z
    .object({
      path: z.string().min(1),
      sha256: z.string().regex(/^[0-9a-f]{64}$/, "sha256 is 64 hex characters").optional(),
      contentCredentials: z
        .object({
          /** What the manifest says, verbatim. */
          statement: z.string().min(1),
          generator: z.string().min(1).optional(),
          /** The manifest's own confidence in the file's origin. */
          originConfidence: z.enum(["confirmed", "unknown", "ai_generated_or_modified"]),
          /** True only when the signature was cryptographically validated, not merely parsed. */
          signatureValidated: z.boolean().default(false),
        })
        .optional(),
    })
    .optional(),
});
export type SourceRecord = z.infer<typeof sourceRecordSchema>;

/** A business value with its own provenance (name, price, attribute, offer). */
export const valueProvenanceSchema = z.object(provenanceRecordFields);
export type ValueProvenance = z.infer<typeof valueProvenanceSchema>;

/**
 * Asset availability, §1.1. `provided_unverified` is deliberately distinct
 * from `verified_available`: the content engine may publish the first only
 * under the constraints of its confidence level, never as verified proof.
 */
export const assetStatusSchema = z.enum([
  "verified_available",
  "provided_unverified",
  "partial",
  "unavailable",
  "not_applicable",
]);
export type AssetStatus = z.infer<typeof assetStatusSchema>;

/**
 * Industries the corpus can reason about. Kept flat and specific; appendix B
 * groups are derived from this list in `baseline/industry-groups.ts` rather
 * than being a second enum to keep in step.
 */
export const industrySchema = z.enum([
  "professional_services",
  "saas",
  "ai",
  "finance",
  "banking",
  "legal",
  "healthcare",
  "education",
  "education_for_children",
  "university",
  "sports",
  "fitness",
  "hospitality",
  /**
   * FD-10: restaurants, cafés, takeaways — a business whose catalogue is a menu and
   * whose visitor needs what, where and when. `hospitality` assumes lodging (booking,
   * amenities, policies, image-led); `local_business` fits the posture but not the
   * catalogue. Its baseline and attribute vocabulary are declared, not templated.
   */
  "food_service",
  "travel",
  "ecommerce",
  "retail",
  "architecture",
  "interiors",
  "art",
  "photography",
  "fashion",
  "creative_agency",
  "corporate",
  "nonprofit",
  "local_business",
  "government",
  "real_estate",
  "construction",
  "manufacturing",
  "media",
  "editorial",
  "entertainment",
  "campaign",
  "logistics",
  "automotive",
  "other",
]);
export type Industry = z.infer<typeof industrySchema>;

export const websiteObjectiveSchema = z.enum([
  "generate_leads",
  "book_appointments",
  "sell_products",
  "sell_subscriptions",
  "start_free_trial",
  "request_demo",
  "build_credibility",
  "educate",
  "recruit",
  "showcase_work",
  "drive_footfall",
  "publish_content",
  "raise_funds",
  "provide_support",
]);
export type WebsiteObjective = z.infer<typeof websiteObjectiveSchema>;

/** Appendix C personalities, verbatim. */
export const brandPersonalitySchema = z.enum([
  "authoritative",
  "warm_human",
  "premium",
  "technical",
  "playful",
  "energetic",
  "editorial",
  "futuristic",
]);
export type BrandPersonality = z.infer<typeof brandPersonalitySchema>;

export const visualDirectionSchema = z.enum([
  "minimal",
  "editorial",
  "structured",
  "expressive",
  "material",
  "technical_diagrammatic",
  "image_led",
  "typographic",
]);
export type VisualDirection = z.infer<typeof visualDirectionSchema>;

export const audienceProfileSchema = z.object({
  label: z.string().min(1),
  /**
   * FD-02: `stated` when the customer said who they serve, `inferred` when an
   * operator or AI judged it. DD-031 publishes audience labels as the owner's words,
   * so an inferred label renders as a slot instead and raises an approval requirement.
   * Defaults to `stated` so existing inputs are unchanged.
   */
  basis: z.enum(["stated", "inferred"]).default("stated"),
  roles: z.array(z.string()).default([]),
  /** §4 AUDIENCE. Drives DD rules on density, language and interaction. */
  digitalLiteracy: z.enum(["low", "medium", "high"]).optional(),
  /** Share of visits, 0–1. Used to derive mobile_share. */
  mobileShare: z.number().min(0).max(1).optional(),
  accessibilityContext: z.array(z.string()).default([]),
  usageContext: z.array(z.string()).default([]),
  isPrimary: z.boolean().default(false),
});
export type AudienceProfile = z.infer<typeof audienceProfileSchema>;

export const locationProfileSchema = z.object({
  /**
   * Verification is a first-class field, not an afterthought: §J.2 blocks the
   * contact route entirely until an address or phone number is verified.
   */
  verified: z.boolean().default(false),
  country: z.string().optional(),
  region: z.string().optional(),
  city: z.string().optional(),
  serviceAreas: z.array(z.string()).default([]),
  hasPhysicalPremises: z.boolean().default(false),
});
export type LocationProfile = z.infer<typeof locationProfileSchema>;

/**
 * A PRICE (FD-03). The value the framework could never hold: `pricing` recorded that
 * prices existed and were verified, and no field carried one, so a verified price
 * could not be published at all. It carries its own provenance, because a price is a
 * FACT — only `customer_supplied_verified` from a source that authorises publication
 * reaches a page, and an AI-drafted price never does.
 */
export const priceSchema = z.object({
  amount: z.number().finite().nonnegative(),
  /** ISO 4217 where the customer uses one, else the symbol or name they use. */
  currency: z.string().min(1),
  /** What the price buys, in the customer's words ("per person", "1 pc"). */
  unit: z.string().min(1).optional(),
  /** Whether taxes or charges are included, in the customer's words. Never inferred. */
  taxNote: z.string().min(1).optional(),
  provenance: valueProvenanceSchema,
});
export type Price = z.infer<typeof priceSchema>;

/**
 * A TYPED ATTRIBUTE of a catalogue item (FD-04). The key must exist in the industry's
 * attribute vocabulary (`content/attribute-vocabulary.ts`), which also says whether it
 * is REGULATED — a regulated attribute (a dietary mark, an allergen) publishes only
 * from a verified value and is never inferred, drafted or defaulted.
 */
export const offerAttributeSchema = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
  provenance: valueProvenanceSchema,
});
export type OfferAttribute = z.infer<typeof offerAttributeSchema>;

/** A portion, size or option of one item ("Half", "1 pc"), each able to carry its own price. */
export const offerVariantSchema = z.object({
  label: z.string().min(1),
  price: priceSchema.optional(),
  provenance: valueProvenanceSchema.optional(),
});
export type OfferVariant = z.infer<typeof offerVariantSchema>;

/**
 * A GROUP of offers — a menu section, a product category, a programme stream. Generic
 * on purpose: a restaurant menu is a catalogue like any other, and an industry-specific
 * "menu" type would repeat the industry-special-case mistake this framework removed.
 */
export const offerGroupSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]{0,60}$/, "group ids are lowercase slugs"),
  name: z.string().min(1),
  /** Display order; groups without one keep input order after those with one. */
  order: z.number().int().optional(),
  provenance: valueProvenanceSchema.optional(),
});
export type OfferGroup = z.infer<typeof offerGroupSchema>;

export const offerSchema = z.object({
  name: z.string().min(1),
  kind: z.enum(["service", "product", "programme", "subscription"]),
  description: z.string().optional(),
  /** The group(s) this offer belongs to, by `offerGroups[].id`. Never inferred from a name. */
  groupIds: z.array(z.string()).default([]),
  /** Portions or options. */
  variants: z.array(offerVariantSchema).default([]),
  /** The item's own price, when it has one price rather than per-variant prices. */
  price: priceSchema.optional(),
  /** Typed attributes from the industry's vocabulary. */
  attributes: z.array(offerAttributeSchema).default([]),
  /** §J.2: an unsupported service card is hidden, so provenance is required. */
  customerSupplied: z.boolean().default(true),
  priceKnown: z.boolean().default(false),
  regulated: z.boolean().default(false),
  /**
   * FD-05: where this offer's NAME came from, and under which source. Optional for
   * compatibility: an offer with no record is an owner-stated offer from a
   * pre-provenance input and publishes literally, as before. New intake records it,
   * and then the policy decides — see `content/publication.ts`.
   */
  provenance: valueProvenanceSchema.optional(),
});
export type Offer = z.infer<typeof offerSchema>;

/**
 * What a page IS (customer dry run P1-1). The purpose text is prose for people;
 * the role is the typed semantic that allocates sections. Optional: when absent
 * the page model infers it from the path and purpose and RECORDS the basis as
 * `inferred`, so an inference is never presented as the owner's statement.
 */
export const PAGE_ROLES = ["home", "services_index", "service", "about", "faq", "contact", "legal", "conversion", "content"] as const;
export const pageRoleSchema = z.enum(PAGE_ROLES);
export type PageRole = z.infer<typeof pageRoleSchema>;

export const pageRequirementSchema = z.object({
  path: z.string().min(1),
  purpose: z.string().min(1),
  mustBeIndexable: z.boolean().default(true),
  role: pageRoleSchema.optional(),
  /** The owner's navigation label ("FAQ"). Absent: derived from the role, then the route. */
  label: z.string().min(1).optional(),
});
export type PageRequirement = z.infer<typeof pageRequirementSchema>;

/**
 * Functionality requirements. `pwa` is listed explicitly because §24 makes it
 * an architectural constraint that must be *stated as a requirement* — it can
 * never be inferred from fashion.
 */
export const functionalityRequirementSchema = z.enum([
  "contact_form",
  "booking",
  "payments",
  "checkout",
  "search",
  "account",
  "authentication",
  "cms_editing",
  "multilingual",
  "map",
  "chat",
  "pwa",
  "offline",
  "product_configurator",
  "newsletter",
  "blog",
]);
export type FunctionalityRequirement = z.infer<typeof functionalityRequirementSchema>;

export const assetInventorySchema = z.object({
  logo: assetStatusSchema,
  brandColors: assetStatusSchema,
  heroImages: assetStatusSchema,
  productImages: assetStatusSchema,
  teamPhotos: assetStatusSchema,
  portfolioImages: assetStatusSchema,
  video: assetStatusSchema,
  testimonials: assetStatusSchema,
  customerLogos: assetStatusSchema,
  awards: assetStatusSchema,
  certifications: assetStatusSchema,
  reviews: assetStatusSchema,
});
export type AssetInventory = z.infer<typeof assetInventorySchema>;

export const contentInventorySchema = z.object({
  propositionText: assetStatusSchema,
  serviceDescriptions: assetStatusSchema,
  aboutText: assetStatusSchema,
  processExplanation: assetStatusSchema,
  caseStudies: assetStatusSchema,
  pricing: assetStatusSchema,
  faq: assetStatusSchema,
  legalPolicies: assetStatusSchema,
  contactDetails: assetStatusSchema,
  /**
   * Per-method contact statuses. OPTIONAL: when a method's status is absent,
   * `contactDetails` governs it (one absence semantic: content/contact-status.ts).
   * Added after the first customer dry run: a practice that supplied its own
   * email but not yet its street address could only be recorded as "partial",
   * which blocked its only honest contact route.
   */
  contactEmail: assetStatusSchema.optional(),
  contactPhone: assetStatusSchema.optional(),
  contactAddress: assetStatusSchema.optional(),
  /** A WhatsApp number is a phone fact; absent, the phone status governs it (content/contact-status.ts). */
  contactWhatsapp: assetStatusSchema.optional(),
  /**
   * FD-14: opening hours are their own fact, not a sub-field of the address. Absent,
   * the address status governs them, which is the behaviour that existed before.
   */
  openingHours: assetStatusSchema.optional(),
  statistics: assetStatusSchema,
  teamBios: assetStatusSchema,
  /**
   * DATA an interactive experience needs before it may produce an output
   * (ECO §4.5, §17). OPTIONAL: absent means not supplied, which is the same as
   * `unavailable` (one absence semantic: content/engagement-data.ts). A
   * calculator without verified formulas, a selector without verified decision
   * rules and a comparison without verified comparison data are refused rather
   * than filled with invented values.
   */
  formulas: assetStatusSchema.optional(),
  decisionRules: assetStatusSchema.optional(),
  comparisonData: assetStatusSchema.optional(),
  productSpecifications: assetStatusSchema.optional(),
  pricingRanges: assetStatusSchema.optional(),
  datasets: assetStatusSchema.optional(),
});
export type ContentInventory = z.infer<typeof contentInventorySchema>;

export const projectConstraintsSchema = z.object({
  /** §4 TECHNICAL. High SEO dependency + no PWA requirement selects Next.js (§24). */
  seoDependency: z.enum(["low", "medium", "high"]).optional(),
  performanceSensitivity: z.enum(["low", "medium", "high"]).optional(),
  accessibilityRequirement: z
    .enum(["baseline", "wcag_aa", "wcag_aaa_or_equivalent"])
    .optional(),
  technicalComplexityBudget: z.enum(["low", "medium", "high"]).optional(),
  regulationRisk: z.enum(["low", "medium", "high"]).optional(),
  localization: z.array(z.string()).default([]),
  integrations: z.array(z.string()).default([]),
  launchDeadline: z.string().optional(),
  /**
   * Production origin, e.g. `https://example.com`. Required for an ABSOLUTE
   * canonical URL, Open Graph `og:url` and a sitemap.
   *
   * Deliberately optional and never defaulted: a canonical pointing at a guessed
   * domain is a fabricated fact about the business, and a wrong canonical is
   * worse than an absent one. When this is missing, the SEO artifact layer
   * returns `unresolved` and asks for it (§12).
   */
  canonicalOrigin: z.string().url().optional(),
  /**
   * THE one colour input (color_system.md). A single hex; change it and the whole
   * token system regenerates. Optional because a business may not have chosen one
   * yet — §J.2 then ships an accessible neutral system rather than an invented
   * palette. Never defaulted to a brand-looking value.
   */
  brandSeed: z.string().regex(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "brandSeed must be a hex colour").optional(),
  /** theme_system.md {THEME_MODE}. Owner-chosen; DUAL doubles tokens and evidence. */
  themeMode: z.enum(["SINGLE-DARK", "SINGLE-LIGHT", "DUAL"]).optional(),
  /** The quality level the owner is aiming for (DD-112). Stated, never inferred. */
  targetQuality: z.enum(["production_ready", "professionally_designed", "world_class"]).optional(),
  brandFontHeading: z.string().optional(),
  brandFontBody: z.string().optional(),
  /** An explicit ceiling the owner may impose regardless of what rules allow. */
  maxVisualExpression: z.enum(["low", "medium", "high"]).optional(),
  /**
   * The owner's preferred ways to be contacted, most preferred first (P1-2). It
   * REORDERS what a conversion surface can honestly complete; it cannot make a
   * mailto complete a checkout (objectives/conversion-capabilities.ts).
   */
  preferredContactMethods: z.array(z.enum(["form", "email_link", "phone_link", "whatsapp_link"])).optional(),
  /**
   * DEPENDENCY GATE decisions (stack_doctrine.md; P1-6). The stack PROPOSES a
   * package; only an approval here (or framework runtime) admits it, and a denial
   * keeps it out even when a requirement asked for it.
   */
  dependencyDecisions: z
    .array(
      z.object({
        package: z.string().min(1),
        decision: z.enum(["approved", "denied"]),
        decidedBy: z.string().min(1),
        reason: z.string().min(1),
      }),
    )
    .optional(),
});
export type ProjectConstraints = z.infer<typeof projectConstraintsSchema>;

export const businessMaturitySchema = z.enum([
  "pre_launch",
  "early_stage",
  "established",
  "enterprise",
]);
export type BusinessMaturity = z.infer<typeof businessMaturitySchema>;

export const businessModelSchema = z.enum([
  "b2b",
  "b2c",
  "b2b2c",
  "marketplace",
  "nonprofit",
  "public_sector",
]);
export type BusinessModel = z.infer<typeof businessModelSchema>;

/**
 * ENGAGEMENT & CONVERSION — optional setup block (brief phase 10, ECO §4, §18).
 *
 * Declares ONLY what the rest of the input cannot already express. Audience,
 * objectives, offers, regulation, accessibility and performance targets are read
 * from their existing homes; re-declaring them here would create a second
 * authority for each. Every field is optional and nothing is defaulted into a
 * fact: an unstated maintenance owner is unknown, not "the owner".
 */
export const engagementInputSchema = z.object({
  /** Absent block, or absent field, means the framework decides. */
  preference: z.enum(ENGAGEMENT_PREFERENCES).default("framework_decides"),
  /** "I have a specific idea". Evaluated by the same gates — never auto-accepted. */
  requestedIdea: z
    .object({
      category: z.enum(ENGAGEMENT_CATEGORY_IDS),
      rationale: z.string().min(1),
    })
    .optional(),
  /**
   * Tasks the visitor comes to do. `stated` when the owner or research says so;
   * `inferred` when extracted from free text by an AI step — which lowers the
   * decision's confidence rather than being treated as fact.
   */
  visitorTasks: z
    .array(
      z.object({
        task: z.enum(VISITOR_TASKS),
        basis: z.enum(["stated", "inferred"]).default("stated"),
        detail: z.string().optional(),
      }),
    )
    .default([]),
  frictionPoints: z.array(z.string()).default([]),
  salesMotion: z.enum(["self_serve", "sales_assisted", "mixed"]).optional(),
  /** Who responds to a lead, booking or result action (hard gate 9). */
  leadFollowUpOwner: z.string().min(1).optional(),
  /** Who keeps formulas, rules, prices and data current (hard gate 8). */
  maintenanceOwner: z.string().min(1).optional(),
  /** Real availability exists. Without it, booking is a REQUEST form, not a booking flow. */
  schedulingIntegration: z.boolean().optional(),
  /** ECO §4.8. Unstated capabilities are unknown, not false. */
  analytics: z
    .object({
      eventTracking: z.boolean().optional(),
      consentManagement: z.boolean().optional(),
      crmAttribution: z.boolean().optional(),
    })
    .optional(),
  /** ECO §4.6: data categories an experience might collect that need special care. */
  sensitiveDataCategories: z.array(z.string()).default([]),
  /**
   * Required before a standalone game can qualify (brief phase 6): the documented
   * causal path from play to an outcome. A vanity metric is not a causal path.
   */
  gameCausalPath: z
    .object({
      outcome: z.enum(["business", "learning", "repeated_behavior"]),
      description: z.string().min(1),
    })
    .optional(),
});
export type EngagementInput = z.infer<typeof engagementInputSchema>;

/** §1.1 Required business input. */
export const businessInputSchema = z.object({
  businessName: z.string().min(1),
  /**
   * FD-13 / C2: where the business name came from. Optional for compatibility; absent
   * means a legacy input whose name is owner-stated but unconfirmed, which raises a
   * confirmation requirement rather than being described as verified.
   */
  businessNameProvenance: valueProvenanceSchema.optional(),
  industry: industrySchema,
  subIndustry: z.string().optional(),
  description: z.string().min(1),
  businessModel: businessModelSchema.optional(),
  maturity: businessMaturitySchema.optional(),
  /** FD-05: the material this input was transcribed from, and what each source authorises. */
  sources: z.array(sourceRecordSchema).default([]),
  targetAudience: z.array(audienceProfileSchema).min(1),
  location: locationProfileSchema.optional(),
  servicesProducts: z.array(offerSchema).default([]),
  /** FD-04: the groups `servicesProducts[].groupIds` refer to (menu sections, categories). */
  offerGroups: z.array(offerGroupSchema).default([]),
  websiteObjective: z.array(websiteObjectiveSchema).min(1),
  /**
   * FD-01: whether the objectives were STATED by the customer or INFERRED by an
   * operator. The contract still requires at least one — a website with no purpose
   * cannot be designed — but an inference is no longer indistinguishable from the
   * customer's own words: it raises an approval requirement and is recorded in the
   * profile's provenance. Defaults to `stated` so existing inputs are unchanged.
   */
  websiteObjectiveBasis: z.enum(["stated", "inferred"]).default("stated"),
  brandPersonality: z.array(brandPersonalitySchema).default([]),
  preferredVisualDirection: z.array(visualDirectionSchema).default([]),
  requiredPages: z.array(pageRequirementSchema).default([]),
  requiredFunctionality: z.array(functionalityRequirementSchema).default([]),
  availableAssets: assetInventorySchema,
  availableContent: contentInventorySchema,
  constraints: projectConstraintsSchema.optional(),
  /** Optional engagement setup. Absent = the framework decides, from the rest of this input. */
  engagement: engagementInputSchema.optional(),
});
export type BusinessInput = z.infer<typeof businessInputSchema>;

/**
 * The PRE-defaults shape: what a caller may legally hand to
 * `parseBusinessInput`, where every field carrying a `.default()` is optional.
 * `BusinessInput` is the post-parse shape where those fields are present.
 * Keeping the two distinct stops callers from having to supply `roles: []`,
 * `isPrimary: false` and similar just to satisfy the type.
 */
export type BusinessInputDraft = z.input<typeof businessInputSchema>;

/**
 * Parse untrusted input. Throws a ZodError with a full issue list; callers at
 * the pipeline boundary are expected to surface it rather than coerce, because
 * a silently-defaulted business fact is an invented business fact (§12).
 */
export function parseBusinessInput(value: unknown): BusinessInput {
  return businessInputSchema.parse(value);
}
