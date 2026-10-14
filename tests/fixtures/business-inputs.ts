/**
 * SYNTHETIC TEST FIXTURES — not real businesses.
 *
 * Specification §25 forbids inventing a business to demonstrate the system, and
 * §12 forbids fabricated business facts. These fixtures therefore use visibly
 * non-real names (`FIXTURE-*`) and carry no claims, figures, testimonials or
 * contact details that could be mistaken for real data if this file were ever
 * copied out of the test tree. They exercise decision variables, nothing more.
 */
import type {
  AssetInventory,
  AssetStatus,
  BusinessInput,
  BusinessInputDraft,
  ContentInventory,
} from "../../src/design-intelligence/types/business-input.js";
import { parseBusinessInput } from "../../src/design-intelligence/types/business-input.js";

export function assets(overrides: Partial<AssetInventory> = {}): AssetInventory {
  const none: AssetStatus = "unavailable";
  return {
    logo: none,
    brandColors: none,
    heroImages: none,
    productImages: none,
    teamPhotos: none,
    portfolioImages: none,
    video: none,
    testimonials: none,
    customerLogos: none,
    awards: none,
    certifications: none,
    reviews: none,
    ...overrides,
  };
}

export function content(overrides: Partial<ContentInventory> = {}): ContentInventory {
  const none: AssetStatus = "unavailable";
  return {
    propositionText: none,
    serviceDescriptions: none,
    aboutText: none,
    processExplanation: none,
    caseStudies: none,
    pricing: none,
    faq: none,
    legalPolicies: none,
    contactDetails: none,
    statistics: none,
    teamBios: none,
    ...overrides,
  };
}

/** Minimal valid input. Every scenario below is a delta on this. */
export function baseInput(overrides: Partial<BusinessInputDraft> = {}): BusinessInput {
  return parseBusinessInput({
    businessName: "FIXTURE-BASE",
    industry: "other",
    description: "Synthetic fixture used only to exercise decision variables.",
    targetAudience: [{ label: "FIXTURE-AUDIENCE", isPrimary: true }],
    websiteObjective: ["build_credibility"],
    availableAssets: assets(),
    availableContent: content(),
    ...overrides,
  });
}

/** Healthcare + very high trust → low effect ceiling (§27 business decision test). */
export const fixtureHealthcare = (): BusinessInput =>
  baseInput({
    businessName: "FIXTURE-HEALTHCARE",
    industry: "healthcare",
    description: "Synthetic healthcare fixture.",
    websiteObjective: ["book_appointments", "build_credibility"],
    targetAudience: [{ label: "FIXTURE-PATIENTS", isPrimary: true, digitalLiteracy: "low" }],
    availableContent: content({
      propositionText: "verified_available",
      serviceDescriptions: "verified_available",
      legalPolicies: "verified_available",
    }),
  });

/** Creative portfolio with strong verified imagery → higher expressive allowance. */
export const fixtureCreativePortfolio = (): BusinessInput =>
  baseInput({
    businessName: "FIXTURE-CREATIVE",
    industry: "creative_agency",
    description: "Synthetic creative agency fixture.",
    brandPersonality: ["premium", "editorial"],
    websiteObjective: ["showcase_work", "generate_leads"],
    availableAssets: assets({
      portfolioImages: "verified_available",
      heroImages: "verified_available",
      video: "verified_available",
      logo: "verified_available",
    }),
    availableContent: content({
      propositionText: "verified_available",
      caseStudies: "verified_available",
    }),
  });

/** SaaS with a complex product → product proof prioritised. */
export const fixtureSaas = (): BusinessInput =>
  baseInput({
    businessName: "FIXTURE-SAAS",
    industry: "saas",
    description: "Synthetic SaaS fixture.",
    businessModel: "b2b",
    brandPersonality: ["technical"],
    websiteObjective: ["request_demo", "start_free_trial"],
    servicesProducts: [
      { name: "FIXTURE-PLAN-A", kind: "subscription", customerSupplied: true },
      { name: "FIXTURE-PLAN-B", kind: "subscription", customerSupplied: true },
    ],
    constraints: { integrations: ["FIXTURE-INT-1", "FIXTURE-INT-2", "FIXTURE-INT-3"], seoDependency: "high" },
    availableAssets: assets({ productImages: "verified_available", logo: "verified_available" }),
    availableContent: content({ propositionText: "verified_available" }),
  });

/** Ecommerce, mobile-dominant → mobile product discovery prioritised. */
export const fixtureEcommerce = (): BusinessInput =>
  baseInput({
    businessName: "FIXTURE-ECOM",
    industry: "ecommerce",
    description: "Synthetic ecommerce fixture.",
    businessModel: "b2c",
    websiteObjective: ["sell_products"],
    requiredFunctionality: ["checkout", "payments", "search"],
    servicesProducts: Array.from({ length: 25 }, (_, i) => ({
      name: `FIXTURE-PRODUCT-${i + 1}`,
      kind: "product" as const,
      customerSupplied: true,
      priceKnown: true,
      regulated: false,
    })),
    targetAudience: [{ label: "FIXTURE-SHOPPERS", isPrimary: true, mobileShare: 0.78 }],
    availableAssets: assets({ productImages: "verified_available" }),
  });

/** PWA stated as a product requirement (§24). */
export const fixturePwaRequired = (): BusinessInput =>
  baseInput({
    businessName: "FIXTURE-PWA",
    industry: "local_business",
    description: "Synthetic fixture stating a PWA requirement.",
    requiredFunctionality: ["pwa", "contact_form"],
    websiteObjective: ["drive_footfall"],
  });

/** A factual claim supplied but unverified → publication of that claim blocked. */
export const fixtureUnverifiedProof = (): BusinessInput =>
  baseInput({
    businessName: "FIXTURE-UNVERIFIED",
    industry: "professional_services",
    description: "Synthetic fixture with an unverified factual claim.",
    availableAssets: assets({ testimonials: "provided_unverified" }),
  });
