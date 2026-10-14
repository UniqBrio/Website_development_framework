/**
 * Design Context Profile derivation — specification §4, §1.2, §1.3.
 *
 * Turns BusinessInput into the 16 normalised decision variables. Every variable
 * records its provenance (§30): `stated` when the owner said it, `industry_prior`
 * when appendix B supplied it, `inferred` when this file computed it from other
 * facts, `default` when nothing was available.
 *
 * `default` is the important one. A defaulted variable is NOT a known fact, and
 * a design decision resting only on defaults is exactly what a human should be
 * asked to confirm — so the provenance list is what the approval surface reads.
 */
import type {
  AssetInventory,
  AssetStatus,
  BusinessInput,
  ContentInventory,
} from "../types/business-input.js";
import type {
  DerivationProvenance,
  DerivedVariables,
  DesignContextProfile,
} from "../types/profile.js";
import { industryBaseline } from "../baseline/industry-baseline.js";

type Basis = DerivationProvenance["basis"];

class ProvenanceLog {
  private readonly entries: DerivationProvenance[] = [];

  record<T extends string>(variable: string, value: T, basis: Basis, evidence: string): T {
    this.entries.push({ variable, value, basis, evidence });
    return value;
  }

  all(): DerivationProvenance[] {
    return [...this.entries];
  }
}

/** Assets that count as usable visual evidence. `partial` counts at half weight. */
function visualAssetQuality(
  assets: AssetInventory,
  log: ProvenanceLog,
): DerivedVariables["visual_asset_quality"] {
  const visualKeys = ["heroImages", "productImages", "portfolioImages", "video"] as const;
  let strong = 0;
  let partial = 0;
  for (const key of visualKeys) {
    const status = assets[key];
    if (status === "verified_available") strong += 1;
    else if (status === "partial" || status === "provided_unverified") partial += 1;
  }
  const score = strong + partial * 0.5;

  // §1.3: "none" means do not simulate real people, work, places or products.
  // It is therefore reached only when NOTHING usable exists, never by rounding.
  const value: DerivedVariables["visual_asset_quality"] =
    score >= 2.5 ? "high" : score >= 1.5 ? "medium" : score > 0 ? "low" : "none";

  return log.record(
    "visual_asset_quality",
    value,
    "inferred",
    `${strong} verified + ${partial} partial/unverified visual assets (score ${score})`,
  );
}

/**
 * Content confidence, §J.1. This is a FLOOR, not an average: one section
 * requiring verification sets the whole profile to `verification_required`,
 * because publication safety is decided by the weakest claim on the page.
 */
function contentConfidence(
  content: ContentInventory,
  assets: AssetInventory,
  log: ProvenanceLog,
): DerivedVariables["content_confidence"] {
  const factual: AssetStatus[] = [
    content.statistics,
    content.caseStudies,
    content.pricing,
    content.contactDetails,
    content.teamBios,
    assets.testimonials,
    assets.customerLogos,
    assets.awards,
    assets.certifications,
    assets.reviews,
  ];

  // `provided_unverified` on a factual claim is the dangerous case: it looks
  // like data and is not verified. It blocks publication of that claim.
  const hasUnverifiedFactual = factual.includes("provided_unverified");
  const allMissing = factual.every((s) => s === "unavailable" || s === "not_applicable");
  const anyVerified = factual.includes("verified_available");
  const anyPartial = factual.includes("partial");

  const value: DerivedVariables["content_confidence"] = hasUnverifiedFactual
    ? "verification_required"
    : allMissing
      ? "placeholder"
      : anyVerified && !anyPartial
        ? "verified"
        : "incomplete";

  return log.record(
    "content_confidence",
    value,
    "inferred",
    hasUnverifiedFactual
      ? "at least one factual claim is provided but unverified — publication of that claim is blocked (§J.1)"
      : `verified=${anyVerified} partial=${anyPartial} allMissing=${allMissing}`,
  );
}

function commerceDepth(input: BusinessInput, log: ProvenanceLog): DerivedVariables["commerce_depth"] {
  const fn = input.requiredFunctionality;
  const hasCheckout = fn.includes("checkout") || fn.includes("payments");
  const productCount = input.servicesProducts.filter((o) => o.kind === "product").length;

  const value: DerivedVariables["commerce_depth"] = hasCheckout
    ? productCount > 20
      ? "deep"
      : "medium"
    : fn.includes("booking") || input.websiteObjective.includes("sell_subscriptions")
      ? "shallow"
      : "none";

  return log.record(
    "commerce_depth",
    value,
    "inferred",
    `checkout=${hasCheckout} products=${productCount}`,
  );
}

function purchaseCycle(
  input: BusinessInput,
  trust: DerivedVariables["trust_requirement"],
  regulation: DerivedVariables["regulation_risk"],
  commerce: DerivedVariables["commerce_depth"],
  log: ProvenanceLog,
): DerivedVariables["purchase_cycle"] {
  // Regulated overrides everything: a regulated purchase is not "long", it is a
  // different kind of journey with mandatory disclosure steps.
  if (regulation === "high" || input.servicesProducts.some((o) => o.regulated)) {
    return log.record("purchase_cycle", "regulated", "inferred", "a regulated offer is present");
  }
  if (commerce === "deep" || commerce === "medium") {
    return log.record("purchase_cycle", "immediate", "inferred", `commerce_depth=${commerce}`);
  }
  if (trust === "very_high") {
    return log.record("purchase_cycle", "long", "inferred", "trust_requirement=very_high");
  }
  if (input.websiteObjective.includes("request_demo") || input.websiteObjective.includes("generate_leads")) {
    return log.record("purchase_cycle", "considered", "inferred", "lead/demo objective");
  }
  return log.record("purchase_cycle", "short", "default", "no stronger signal available");
}

function mobileShare(input: BusinessInput, log: ProvenanceLog): DerivedVariables["mobile_share"] {
  const stated = input.targetAudience
    .map((a) => a.mobileShare)
    .filter((s): s is number => typeof s === "number");
  if (stated.length > 0) {
    const max = Math.max(...stated);
    const value = max >= 0.6 ? "high" : max >= 0.35 ? "medium" : "low";
    return log.record("mobile_share", value, "stated", `stated audience mobile share ${max}`);
  }
  // B2C and local businesses are mobile-dominant by default; B2B is not.
  const b2c = input.businessModel === "b2c" || input.industry === "local_business";
  return log.record(
    "mobile_share",
    b2c ? "high" : "medium",
    "default",
    b2c ? "b2c/local default" : "no stated share; medium default",
  );
}

function informationDensity(
  input: BusinessInput,
  log: ProvenanceLog,
): DerivedVariables["information_density"] {
  const offers = input.servicesProducts.length;
  const pages = input.requiredPages.length;
  const value: DerivedVariables["information_density"] =
    offers + pages >= 18 ? "high" : offers + pages >= 7 ? "medium" : "low";
  return log.record(
    "information_density",
    value,
    "inferred",
    `${offers} offers + ${pages} required pages`,
  );
}

function productComplexity(
  input: BusinessInput,
  log: ProvenanceLog,
): DerivedVariables["product_service_complexity"] {
  const technicalIndustry = (["saas", "ai", "manufacturing", "logistics", "finance"] as const).includes(
    input.industry as "saas",
  );
  const integrations = input.constraints?.integrations.length ?? 0;
  const value: DerivedVariables["product_service_complexity"] =
    technicalIndustry && integrations >= 3
      ? "high"
      : technicalIndustry || integrations >= 1
        ? "medium"
        : "low";
  return log.record(
    "product_service_complexity",
    value,
    "inferred",
    `technical industry=${technicalIndustry}, ${integrations} integrations`,
  );
}

function emotionalIntensity(
  input: BusinessInput,
  trust: DerivedVariables["trust_requirement"],
  log: ProvenanceLog,
): DerivedVariables["emotional_intensity"] {
  // Trust caps emotional intensity: §0.2 ranks trust above brand coherence, so a
  // very-high-trust business cannot buy intensity with brand personality.
  if (trust === "very_high") {
    return log.record(
      "emotional_intensity",
      "low",
      "inferred",
      "capped by trust_requirement=very_high",
    );
  }
  const expressive = input.brandPersonality.some((p) =>
    (["energetic", "playful", "premium", "futuristic"] as const).includes(p as "energetic"),
  );
  return log.record(
    "emotional_intensity",
    expressive ? "high" : "medium",
    input.brandPersonality.length > 0 ? "stated" : "default",
    expressive ? "expressive personality stated" : "no expressive personality stated",
  );
}

function seoDependency(input: BusinessInput, log: ProvenanceLog): DerivedVariables["seo_dependency"] {
  const stated = input.constraints?.seoDependency;
  if (stated) return log.record("seo_dependency", stated, "stated", "stated in constraints");
  const contentObjectives = input.websiteObjective.some((o) =>
    (["publish_content", "educate", "generate_leads", "drive_footfall"] as const).includes(
      o as "educate",
    ),
  );
  return log.record(
    "seo_dependency",
    contentObjectives ? "high" : "medium",
    "inferred",
    contentObjectives ? "discovery-dependent objective" : "no discovery-dependent objective",
  );
}

export function deriveDesignContextProfile(input: BusinessInput): DesignContextProfile {
  const log = new ProvenanceLog();
  const baseline = industryBaseline(input.industry);

  const regulation_risk = input.constraints?.regulationRisk
    ? log.record(
        "regulation_risk",
        input.constraints.regulationRisk,
        "stated",
        "stated in constraints",
      )
    : log.record(
        "regulation_risk",
        baseline.trust === "very_high" ? "high" : "low",
        "industry_prior",
        `appendix B group "${baseline.group}"`,
      );

  const trust_requirement = log.record(
    "trust_requirement",
    baseline.trust,
    "industry_prior",
    `appendix B group "${baseline.group}" (§1.3)`,
  );

  const visual_asset_quality = visualAssetQuality(input.availableAssets, log);
  const content_confidence = contentConfidence(input.availableContent, input.availableAssets, log);
  const commerce_depth = commerceDepth(input, log);
  const purchase_cycle = purchaseCycle(input, trust_requirement, regulation_risk, commerce_depth, log);
  const mobile_share = mobileShare(input, log);
  const information_density = informationDensity(input, log);
  const product_service_complexity = productComplexity(input, log);
  const emotional_intensity = emotionalIntensity(input, trust_requirement, log);
  const seo_dependency = seoDependency(input, log);

  const performance_sensitivity = input.constraints?.performanceSensitivity
    ? log.record(
        "performance_sensitivity",
        input.constraints.performanceSensitivity,
        "stated",
        "stated in constraints",
      )
    : log.record(
        "performance_sensitivity",
        mobile_share === "high" ? "high" : "medium",
        "inferred",
        `mobile_share=${mobile_share}`,
      );

  const accessibility_requirement = input.constraints?.accessibilityRequirement
    ? log.record(
        "accessibility_requirement",
        input.constraints.accessibilityRequirement,
        "stated",
        "stated in constraints",
      )
    : log.record(
        "accessibility_requirement",
        "wcag_aa",
        "default",
        "WCAG 2.2 AA is the specification's baseline, never below it (§G)",
      );

  const technical_complexity_budget = input.constraints?.technicalComplexityBudget
    ? log.record(
        "technical_complexity_budget",
        input.constraints.technicalComplexityBudget,
        "stated",
        "stated in constraints",
      )
    : log.record("technical_complexity_budget", "medium", "default", "no stated budget");

  const brand_expression_need = log.record(
    "brand_expression_need",
    input.brandPersonality.includes("premium") ||
      input.brandPersonality.includes("editorial") ||
      input.industry === "creative_agency"
      ? "high"
      : input.brandPersonality.length > 0
        ? "medium"
        : "low",
    input.brandPersonality.length > 0 ? "stated" : "default",
    `personalities: ${input.brandPersonality.join(", ") || "none stated"}`,
  );

  const literacyValues = input.targetAudience
    .map((a) => a.digitalLiteracy)
    .filter((v): v is "low" | "medium" | "high" => v !== undefined);
  // The LOWEST stated literacy governs: a design usable only by the most
  // capable audience excludes the rest, which §0.2 ranks above brand coherence.
  const audience_digital_literacy = literacyValues.includes("low")
    ? log.record("audience_digital_literacy", "low", "stated", "lowest stated audience literacy")
    : literacyValues.includes("medium")
      ? log.record("audience_digital_literacy", "medium", "stated", "lowest stated audience literacy")
      : literacyValues.length > 0
        ? log.record("audience_digital_literacy", "high", "stated", "all audiences high literacy")
        : log.record("audience_digital_literacy", "medium", "default", "no stated literacy");

  const variables: DerivedVariables = {
    trust_requirement,
    emotional_intensity,
    information_density,
    visual_asset_quality,
    product_service_complexity,
    purchase_cycle,
    seo_dependency,
    performance_sensitivity,
    accessibility_requirement,
    mobile_share,
    technical_complexity_budget,
    brand_expression_need,
    content_confidence,
    commerce_depth,
    audience_digital_literacy,
    regulation_risk,
  };

  // FD-01 / FD-02: the basis of the two contract-required intent facts is recorded as
  // provenance, so a design resting on an operator's inference is visible as one.
  log.record(
    "website_objective",
    input.websiteObjective.join("+"),
    input.websiteObjectiveBasis === "inferred" ? "inferred" : "stated",
    input.websiteObjectiveBasis === "inferred"
      ? "objectives were inferred by an operator, not stated by the customer"
      : "objectives stated by the customer",
  );
  const audienceInferred = input.targetAudience.some((a) => a.basis === "inferred");
  log.record(
    "target_audience",
    input.targetAudience.map((a) => a.label).join("; "),
    audienceInferred ? "inferred" : "stated",
    audienceInferred ? "at least one audience was inferred, not stated by the customer" : "audiences stated by the customer",
  );

  const primaryObjective = input.websiteObjective[0];
  if (!primaryObjective) {
    // Unreachable via the schema (min(1)), but an explicit throw beats a
    // non-null assertion that would hide a contract change.
    throw new Error("businessInput.websiteObjective must contain at least one objective");
  }

  const profile: DesignContextProfile = {
    businessName: input.businessName,
    industry: input.industry,
    primaryObjective,
    secondaryObjectives: input.websiteObjective.slice(1),
    personalities: input.brandPersonality,
    variables,
    provenance: log.all(),
    pwaRequested:
      input.requiredFunctionality.includes("pwa") || input.requiredFunctionality.includes("offline"),
  };
  if (input.subIndustry !== undefined) profile.subIndustry = input.subIndustry;
  if (input.constraints?.maxVisualExpression !== undefined) {
    profile.maxVisualExpression = input.constraints.maxVisualExpression;
  }
  return profile;
}

/** The 16 variables §1.2 names. Used by a test to assert full provenance coverage. */
export const REQUIRED_VARIABLES = [
  "trust_requirement",
  "emotional_intensity",
  "information_density",
  "visual_asset_quality",
  "product_service_complexity",
  "purchase_cycle",
  "seo_dependency",
  "performance_sensitivity",
  "accessibility_requirement",
  "mobile_share",
  "technical_complexity_budget",
  "brand_expression_need",
  "content_confidence",
  "commerce_depth",
  "audience_digital_literacy",
  "regulation_risk",
] as const;
