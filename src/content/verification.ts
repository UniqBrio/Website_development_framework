/**
 * Content verification pass — the executable form of specification §12.
 *
 * Takes a business input plus the sections a page plan wants, and returns what
 * may render, what is hidden, what must be asked for, and what blocks a
 * conversion path. The generator consumes this; it never decides for itself.
 */
import type {
  AssetInventory,
  BusinessInput,
  ContentInventory,
} from "../design-intelligence/types/business-input.js";
import {
  CONFIDENCE_POLICY,
  confidenceFromStatus,
  isFabricationRisk,
  type ClaimAssessment,
} from "./confidence.js";
import { ASSET_REPLACEMENT_POLICY, type AssetReplacement } from "./asset-policy.js";
import { contactMethodStatus, contactStatuses } from "./contact-status.js";
import { resolveOfferPublication } from "./publication.js";

/**
 * Which inventory field backs which §12 claim category, and whether the claim is
 * factual. A section whose backing field is missing from this map cannot be
 * verified, and an unverifiable factual section is treated as blocked — absence
 * of a rule is not permission.
 */
interface ClaimBinding {
  category: string;
  kind: "factual" | "descriptive";
  /** Key in §J.2's replacement policy. */
  replacementKey: string;
  read: (assets: AssetInventory, content: ContentInventory) => string;
  /**
   * The §4.13 rule this binding enforces (DD-099..DD-104), or null for a
   * category §12 governs directly. This is where an "approval" rule produces
   * its approval state: the verdict below carries the id, so the report and the
   * generator can cite which rule withheld the section.
   */
  ruleId: string | null;
}

const BINDINGS: readonly ClaimBinding[] = [
  { category: "testimonials", kind: "factual", replacementKey: "testimonials", read: (a) => a.testimonials, ruleId: "DD-098" },
  { category: "reviews", kind: "factual", replacementKey: "certifications_reviews", read: (a) => a.reviews, ruleId: "DD-100" },
  { category: "customer_logos", kind: "factual", replacementKey: "client_logos", read: (a) => a.customerLogos, ruleId: "DD-099" },
  { category: "awards", kind: "factual", replacementKey: "awards", read: (a) => a.awards, ruleId: "DD-100" },
  { category: "certifications", kind: "factual", replacementKey: "certifications_reviews", read: (a) => a.certifications, ruleId: "DD-100" },
  { category: "statistics", kind: "factual", replacementKey: "statistics", read: (_a, c) => c.statistics, ruleId: "DD-100" },
  { category: "case_studies", kind: "factual", replacementKey: "portfolio_case_studies", read: (_a, c) => c.caseStudies, ruleId: "DD-104" },
  { category: "pricing", kind: "factual", replacementKey: "pricing", read: (_a, c) => c.pricing, ruleId: "DD-102" },
  { category: "team_members", kind: "factual", replacementKey: "team_photographs", read: (a) => a.teamPhotos, ruleId: null },
  { category: "biographies", kind: "factual", replacementKey: "team_photographs", read: (_a, c) => c.teamBios, ruleId: null },
  { category: "addresses", kind: "factual", replacementKey: "contact_details", read: (_a, c) => contactStatuses(c).address, ruleId: "DD-101" },
  // A verified way to REACH the business (email or phone). Distinct from a verified place.
  { category: "contact_method", kind: "factual", replacementKey: "contact_details", read: (_a, c) => contactMethodStatus(c), ruleId: "DD-101" },
  { category: "product_screenshots", kind: "factual", replacementKey: "product_images", read: (a) => a.productImages, ruleId: "DD-103" },
  { category: "portfolio_work", kind: "factual", replacementKey: "portfolio_case_studies", read: (a) => a.portfolioImages, ruleId: "DD-104" },
  // Descriptive content: may be paraphrased conservatively, never invented.
  { category: "proposition", kind: "descriptive", replacementKey: "decorative_hero_image", read: (_a, c) => c.propositionText, ruleId: null },
  // FD-05: the DESCRIPTIONS. Whether the offer NAMES may be published is a separate
  // verdict (`services`, below), decided per offer from its own provenance — the two
  // used to be one verdict, which the selector read as "offers exist" and the
  // renderer ignored.
  { category: "offer_descriptions", kind: "descriptive", replacementKey: "services", read: (_a, c) => c.serviceDescriptions, ruleId: null },
  { category: "process", kind: "descriptive", replacementKey: "portfolio_case_studies", read: (_a, c) => c.processExplanation, ruleId: null },
  { category: "faq", kind: "descriptive", replacementKey: "services", read: (_a, c) => c.faq, ruleId: null },
  { category: "legal_policies", kind: "factual", replacementKey: "contact_details", read: (_a, c) => c.legalPolicies, ruleId: null },
];

export interface SectionVerdict {
  category: string;
  render: boolean;
  /** What ships instead, when the section is hidden or substituted. */
  replacement: string | null;
  askCustomer: boolean;
  approvalRequired: boolean;
  criticality: "normal" | "critical";
  generatedSubstituteAllowed: boolean;
  reason: string;
  /** The §4.13 approval rule that governs this category, when one does. */
  ruleId: string | null;
}

export interface VerificationReport {
  sections: SectionVerdict[];
  /** Conversion paths that cannot ship because a critical item is unverified. */
  blockedConversionPaths: string[];
  /** Items the owner must supply, deduplicated, in a stable order. */
  requests: string[];
  claims: ClaimAssessment[];
}

/**
 * §J.2 says the contact ROUTE is omitted until contact details are verified.
 * A "Contact us" CTA pointing at nothing is worse than no CTA, so the objective
 * itself is blocked rather than the button silently rendering.
 */
const CONVERSION_REQUIREMENTS: Record<string, readonly string[]> = {
  book_appointments: ["addresses"],
  drive_footfall: ["addresses"],
  sell_products: ["product_screenshots"],
  // An enquiry needs a verified way to reach the business, not a street address.
  generate_leads: ["contact_method"],
  request_demo: ["contact_method"],
};

export function verifyContent(input: BusinessInput): VerificationReport {
  const sections: SectionVerdict[] = [];
  const claims: ClaimAssessment[] = [];
  const requests = new Set<string>();

  // FD-05: `services` is the OFFER-NAME verdict, resolved per offer from its own
  // provenance and its source's publication authorisation. Every consumer — the
  // selector's content-readiness gate, the generator's services section, the SEO
  // Service entity — reads this one verdict, so they cannot disagree.
  const offerDecisions = resolveOfferPublication(input);
  const publishable = offerDecisions.filter((o) => o.decision.publish);
  const withheld = offerDecisions.filter((o) => !o.decision.publish);
  if (input.servicesProducts.length > 0) {
    sections.push({
      category: "services",
      render: publishable.length > 0,
      replacement: publishable.length > 0 ? null : (ASSET_REPLACEMENT_POLICY["services"]?.publicReplacement ?? null),
      askCustomer: withheld.length > 0,
      approvalRequired: withheld.length > 0,
      criticality: "normal",
      generatedSubstituteAllowed: false,
      reason:
        publishable.length === 0
          ? `no offer name may be published: ${[...new Set(withheld.map((o) => o.decision.reason))].join("; ")}`
          : withheld.length > 0
            ? `${publishable.length} of ${offerDecisions.length} offer names publishable; ${withheld.length} withheld or held: ${[...new Set(withheld.map((o) => o.decision.reason))].join("; ")}`
            : "every offer name is publishable",
      ruleId: null,
    });
    if (withheld.length > 0) requests.add("services");
  }

  for (const binding of BINDINGS) {
    const status = binding.read(input.availableAssets, input.availableContent);
    const level = confidenceFromStatus(status as never, binding.kind);
    const policy = CONFIDENCE_POLICY[level];
    const replacement: AssetReplacement | undefined =
      ASSET_REPLACEMENT_POLICY[binding.replacementKey];

    const reason =
      status === "verified_available"
        ? "verified and available"
        : status === "provided_unverified"
          ? binding.kind === "factual"
            ? "supplied but unverified — a factual claim may not be published unverified (§J.1)"
            : "supplied but unverified — literal or conservative paraphrase only (§J.1)"
          : status === "partial"
            ? "partial evidence — insufficient for a factual claim (§J.1)"
            : status === "not_applicable"
              ? "not applicable to this business"
              : "unavailable";

    claims.push({ category: binding.category, level, policy, reason });

    // A section renders when its claim is not blocked AND §J.2 does not hide it.
    const hiddenByPolicy = replacement?.hidePublicly ?? true;
    const render = !policy.blocksPublication && (level === "verified" || level === "customer_supplied_incomplete" || !hiddenByPolicy);

    if (!render && replacement?.askCustomer && status !== "not_applicable") {
      requests.add(binding.category);
    }

    sections.push({
      category: binding.category,
      render,
      replacement: render ? null : (replacement?.publicReplacement ?? null),
      askCustomer: replacement?.askCustomer ?? true,
      approvalRequired: policy.approvalRequired,
      criticality: replacement?.criticality ?? "normal",
      // Fabrication-risk categories may never be substituted by generation,
      // regardless of what the replacement row says.
      generatedSubstituteAllowed:
        !isFabricationRisk(binding.category) && (replacement?.generatedSubstituteAllowed ?? false),
      reason: binding.ruleId && !render ? `${reason} (${binding.ruleId})` : reason,
      ruleId: binding.ruleId,
    });
  }

  const byCategory = new Map(sections.map((s) => [s.category, s]));
  const blockedConversionPaths: string[] = [];
  for (const objective of input.websiteObjective) {
    const required = CONVERSION_REQUIREMENTS[objective];
    if (!required) continue;
    const unmet = required.filter((category) => byCategory.get(category)?.render !== true);
    if (unmet.length > 0) {
      // DD-101 (contact) / DD-103 (product purchase): the public path is
      // blocked, and the rule that blocks it is named so the approval is traceable.
      const rules = [...new Set(unmet.map((c) => byCategory.get(c)?.ruleId).filter(Boolean))];
      blockedConversionPaths.push(
        `${objective} (needs verified: ${unmet.join(", ")}${rules.length > 0 ? `; ${rules.join(", ")}` : ""})`,
      );
    }
  }

  return {
    sections,
    blockedConversionPaths,
    requests: [...requests].sort(),
    claims,
  };
}
