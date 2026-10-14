/**
 * DRY-RUN FIXTURE — a synthetic but realistic unseen business.
 *
 * Named `FIXTURE-VERDALEEN-MOBILITY` so it can never be mistaken for a real
 * company (assessment decision F5), while the SCENARIO is realistic enough to
 * exercise the framework at system level.
 *
 * CHOSEN TO BE AWKWARD, not flattering. The tensions it deliberately creates:
 *
 *  1. HIGH TRUST vs GENUINE COMMERCE. A clinical provider that also sells
 *     devices. The industry prior caps expression low; the commerce objective
 *     wants product discovery. Does the engine handle both or flatten one?
 *  2. A LEGITIMATE 3D CASE INSIDE A PROHIBITED INDUSTRY. A custom-fitted device
 *     is exactly the "spatial inspection improves the decision" case appendix A
 *     endorses — but `3d-product-view` lists healthcare in `poorFor`, and
 *     `product_configurator` is a stated requirement. This tests whether the
 *     engine can distinguish decorative 3D from load-bearing 3D, or whether it
 *     is simply blunt.
 *  3. ACCESSIBILITY ABOVE AA. The audience includes mobility- and
 *     dexterity-impaired users and the owner asks for AAA-equivalent. The
 *     profile can express that; does anything downstream USE it?
 *  4. TWO OPPOSED AUDIENCES. Patients (low digital literacy, mobile, assistive
 *     tech) and referring clinicians (high literacy, desktop, dense clinical
 *     detail). One design must serve both.
 *  5. MISSING PROOF, ON PURPOSE (brief section 9). No testimonials, no awards,
 *     no certifications, no pricing, no team information, no case studies, no
 *     statistics, and UNVERIFIED contact details — while the primary objective
 *     is booking an appointment, which needs verified contact.
 *  6. MULTILINGUAL + CMS + MAP. Three requirements that touch architecture and
 *     that the markdown framework discusses but the engine may not govern.
 *  7. PREMIUM PERSONALITY ON A CLINICAL BUSINESS. Tests whether stated brand
 *     expression can buy its way past a trust cap.
 *
 * No PWA is requested, so section 24's first branch should select Next.js.
 */
import type { BusinessInput } from "../../src/design-intelligence/types/business-input.js";
import { parseBusinessInput } from "../../src/design-intelligence/types/business-input.js";
import type { ComponentDescriptor } from "../../src/responsive/transformations.js";

export function dryRunFixture(): BusinessInput {
  return parseBusinessInput({
    businessName: "FIXTURE-VERDALEEN-MOBILITY",
    industry: "healthcare",
    subIndustry: "custom orthotics and assistive mobility devices",
    description:
      "A clinic that assesses patients and manufactures custom-fitted orthotics and mobility aids, and also sells a small range of off-the-shelf supports directly to patients and to referring clinicians.",
    businessModel: "b2b2c",
    maturity: "established",

    targetAudience: [
      {
        label: "FIXTURE-PATIENTS",
        isPrimary: true,
        roles: ["patient", "family carer"],
        digitalLiteracy: "low",
        mobileShare: 0.71,
        accessibilityContext: [
          "reduced dexterity affects small tap targets and drag interactions",
          "some users rely on screen magnification at 400%",
          "some users have vestibular sensitivity to parallax and large motion",
        ],
        usageContext: ["on a phone in a waiting room", "at home on a slow connection"],
      },
      {
        label: "FIXTURE-REFERRING-CLINICIANS",
        isPrimary: false,
        roles: ["physiotherapist", "consultant"],
        digitalLiteracy: "high",
        mobileShare: 0.2,
        accessibilityContext: [],
        usageContext: ["desktop, between appointments, wants dense clinical detail fast"],
      },
    ],

    location: {
      // Deliberately UNVERIFIED: the clinic address exists but nobody has
      // confirmed it for publication. The primary objective needs it.
      verified: false,
      country: "FIXTURE-COUNTRY",
      city: "FIXTURE-CITY",
      serviceAreas: ["FIXTURE-REGION-A", "FIXTURE-REGION-B"],
      hasPhysicalPremises: true,
    },

    servicesProducts: [
      { name: "FIXTURE-ASSESSMENT", kind: "service", customerSupplied: true, regulated: true },
      { name: "FIXTURE-CUSTOM-ORTHOTIC", kind: "product", customerSupplied: true, regulated: true },
      { name: "FIXTURE-CUSTOM-WALKING-AID", kind: "product", customerSupplied: true, regulated: true },
      { name: "FIXTURE-STOCK-SUPPORT-A", kind: "product", customerSupplied: true, priceKnown: false },
      { name: "FIXTURE-STOCK-SUPPORT-B", kind: "product", customerSupplied: true, priceKnown: false },
      { name: "FIXTURE-CLINICIAN-REFERRAL-PATHWAY", kind: "service", customerSupplied: true },
    ],

    // Booking is primary; selling is real but secondary; credibility matters to
    // the clinician audience.
    websiteObjective: ["book_appointments", "sell_products", "build_credibility", "educate"],

    brandPersonality: ["warm_human", "premium"],
    preferredVisualDirection: ["editorial", "image_led"],

    requiredPages: [
      { path: "/", purpose: "explain the service and route to an assessment", mustBeIndexable: true },
      { path: "/conditions", purpose: "condition-led education pages", mustBeIndexable: true },
      { path: "/devices", purpose: "device catalogue", mustBeIndexable: true },
      { path: "/for-clinicians", purpose: "referral pathway for professionals", mustBeIndexable: true },
      { path: "/book", purpose: "assessment booking", mustBeIndexable: true },
    ],

    requiredFunctionality: [
      "booking",
      "payments",
      "search",
      "map",
      "product_configurator",
      "newsletter",
      "cms_editing",
      "multilingual",
      "contact_form",
    ],

    availableAssets: {
      logo: "verified_available",
      brandColors: "verified_available",
      // Real clinical photography exists but is inconsistent across the set.
      heroImages: "partial",
      productImages: "verified_available",
      // Deliberately omitted (brief section 9).
      teamPhotos: "unavailable",
      portfolioImages: "unavailable",
      video: "unavailable",
      testimonials: "unavailable",
      customerLogos: "unavailable",
      awards: "unavailable",
      certifications: "unavailable",
      reviews: "unavailable",
    },

    availableContent: {
      propositionText: "verified_available",
      serviceDescriptions: "verified_available",
      aboutText: "verified_available",
      processExplanation: "verified_available",
      // Deliberately omitted (brief section 9).
      caseStudies: "unavailable",
      pricing: "unavailable",
      faq: "provided_unverified",
      legalPolicies: "verified_available",
      contactDetails: "provided_unverified",
      statistics: "unavailable",
      teamBios: "unavailable",
    },

    constraints: {
      seoDependency: "high",
      performanceSensitivity: "high",
      // Above the framework's AA default, on purpose.
      accessibilityRequirement: "wcag_aaa_or_equivalent",
      technicalComplexityBudget: "medium",
      regulationRisk: "high",
      localization: ["en", "FIXTURE-LANG-2"],
      integrations: ["FIXTURE-PRACTICE-MANAGEMENT", "FIXTURE-PAYMENTS"],
      launchDeadline: "unknown",
      // No maxVisualExpression: the owner has stated no ceiling, so the engine
      // must derive restraint from the business rather than being told.
    },
  });
}

/**
 * Components for the responsive audit.
 *
 * AUTHORED BY HAND — and that is itself a dry-run finding. `runPipeline` accepts
 * `options.components` but derives nothing: no module turns a design decision
 * into a component list, so the responsive audit runs over whatever a caller
 * happens to supply. Recorded as a manual judgment point in the report rather
 * than hidden behind a plausible-looking list.
 */
export function dryRunComponents(): ComponentDescriptor[] {
  return [
    { id: "site-nav", criticality: "essential", kind: "navigation_destination", hoverDependent: true, animated: false, weightKb: 4 },
    { id: "hero-proposition", criticality: "essential", kind: "proposition", hoverDependent: false, animated: false, weightKb: 2 },
    { id: "book-assessment-cta", criticality: "essential", kind: "primary_action", hoverDependent: false, animated: false, weightKb: 1 },
    { id: "sticky-book-cta", criticality: "supporting", kind: "sticky_cta", hoverDependent: false, animated: false, weightKb: 1 },
    { id: "device-gallery", criticality: "supporting", kind: "product_detail", hoverDependent: true, animated: true, weightKb: 140 },
    { id: "device-configurator-3d", criticality: "supporting", kind: "product_detail", hoverDependent: false, animated: true, weightKb: 180 },
    { id: "clinic-map", criticality: "essential", kind: "contact_route", hoverDependent: false, animated: false, weightKb: 90 },
    { id: "regulatory-disclosure", criticality: "essential", kind: "legal_disclosure", hoverDependent: false, animated: false, weightKb: 2 },
    { id: "condition-explainer-diagram", criticality: "supporting", kind: "diagram", hoverDependent: true, animated: true, weightKb: 20 },
    { id: "ambient-hero-texture", criticality: "decorative", kind: "ornament", hoverDependent: false, animated: true, weightKb: 30 },
  ];
}
