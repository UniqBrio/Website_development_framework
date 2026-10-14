/**
 * DERIVED FACTS — the single place non-profile facts are computed for rules.
 *
 * Rules read a closed set of facts (§29). The profile supplies the 16 variables;
 * the expanded rule set also needs a handful of facts about CONTENT SHAPE
 * (how many offers, whether they carry detail, whether long-form content exists)
 * that were not decision variables. Computing them here, once, keeps every rule
 * off the raw input and keeps the derivation auditable.
 *
 * Every fact is derivable from supplied input. None is invented: a fact that
 * cannot be known is `false`, which makes the rule that needs it not fire —
 * never the other way round.
 */
import { contactMethodStatus } from "../../content/contact-status.js";
import type { BusinessInput } from "../types/business-input.js";
import type { DesignContextProfile } from "../types/profile.js";

export interface DerivedFacts {
  /** True when verified location details exist. DD-114 reads it. */
  locationVerified: boolean;
  offerCount: number;
  /** More than one `kind` among the offers (e.g. services AND products). */
  offerKindsMixed: boolean;
  /** Three or more offers: enough to be "repeated comparable items" (DD-025/038). */
  hasRepeatedComparableItems: boolean;
  /** At least one offer carries a description — a summary AND a detail (DD-039). */
  offersHaveDetail: boolean;
  /** Verified case studies, or an industry whose primary content is long-form (DD-027). */
  hasLongFormContent: boolean;
  /** Verified product imagery — a hero can pair copy with proof (DD-030). */
  hasProductVisualProof: boolean;
  /** Verified matched before/after evidence exists (DD-044). */
  hasMatchedBeforeAfter: boolean;
  /** FAQ content exists in some form (DD-040). */
  hasFaqContent: boolean;
  /** A verified contact route — the CTA has somewhere real to go (DD-037). */
  conversionEndpointVerified: boolean;
  /** Logo asset verified (DD-096). */
  logoAvailable: boolean;
  /** Hero imagery verified — not partial, not unavailable (DD-097). */
  heroImageryAvailable: boolean;
  /** The primary objective is a high-intent transaction (DD-037). */
  primaryTaskHighIntent: boolean;
  /** Offers with a supplied description — deep enough for their own page (DD-093). */
  offersWithDescription: number;
  /** Multiple services or topics exist (DD-093). */
  hasMultipleServicesOrTopics: boolean;
  /** The site is an ecommerce site by objective, not only by industry (DD-103). */
  sellsProducts: boolean;
  /** Any proof category is recorded but NOT verified (DD-100). */
  hasUnverifiedProof: boolean;
}

const HIGH_INTENT = new Set([
  "book_appointments",
  "sell_products",
  "sell_subscriptions",
  "start_free_trial",
  "request_demo",
  "raise_funds",
]);

const LONG_FORM_INDUSTRIES = new Set(["media", "editorial", "architecture", "interiors", "university"]);

export function deriveFacts(input: BusinessInput, profile: DesignContextProfile): DerivedFacts {
  const offers = input.servicesProducts;
  const assets = input.availableAssets;
  const content = input.availableContent;
  const kinds = new Set(offers.map((o) => o.kind));
  const offersWithDescription = offers.filter((o) => (o.description ?? "").trim().length > 0).length;

  const proofStatuses = [assets.awards, assets.certifications, assets.reviews, content.statistics];

  return {
    locationVerified: input.location?.verified ?? false,
    offerCount: offers.length,
    offerKindsMixed: kinds.size > 1,
    hasRepeatedComparableItems: offers.length >= 3,
    offersHaveDetail: offersWithDescription > 0,
    hasLongFormContent:
      content.caseStudies === "verified_available" || LONG_FORM_INDUSTRIES.has(profile.industry),
    hasProductVisualProof: assets.productImages === "verified_available",
    hasMatchedBeforeAfter:
      assets.portfolioImages === "verified_available" && content.caseStudies === "verified_available",
    hasFaqContent: content.faq !== "unavailable" && content.faq !== "not_applicable",
    // A verified way to reach the business (content/contact-status.ts).
    conversionEndpointVerified: contactMethodStatus(content) === "verified_available",
    logoAvailable: assets.logo === "verified_available",
    heroImageryAvailable: assets.heroImages === "verified_available",
    primaryTaskHighIntent: HIGH_INTENT.has(profile.primaryObjective),
    offersWithDescription,
    hasMultipleServicesOrTopics: offers.length >= 2 || input.requiredPages.length >= 3,
    sellsProducts: input.websiteObjective.includes("sell_products"),
    hasUnverifiedProof: proofStatuses.some((s) => s === "provided_unverified" || s === "partial"),
  };
}
