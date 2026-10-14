/**
 * ENGAGEMENT FIXTURES — synthetic, visibly non-real (`FIXTURE-*`), claim-free.
 *
 * Each exercises one engagement situation through the SAME input contract a real
 * brief uses. Data statuses are stated explicitly; no fixture carries a formula,
 * price, rule or figure VALUE — only whether such data exists and is verified,
 * which is exactly what the engine is allowed to know.
 */
import type { BusinessInput, BusinessInputDraft, EngagementInput } from "../../src/design-intelligence/types/business-input.js";
import { assets, baseInput, content } from "./business-inputs.js";

type Draft = Partial<BusinessInputDraft>;
type EngagementDraft = Partial<EngagementInput> & { visitorTasks?: EngagementInput["visitorTasks"] };

const services = (n: number, kind: "service" | "product" | "programme" | "subscription" = "service") =>
  Array.from({ length: n }, (_, i) => ({ name: `FIXTURE-${kind.toUpperCase()}-${i + 1}`, kind, customerSupplied: true, priceKnown: false, regulated: false }));

const stated = (...tasks: EngagementInput["visitorTasks"][number]["task"][]) => tasks.map((task) => ({ task, basis: "stated" as const }));

function withEngagement(draft: Draft, engagement: EngagementDraft): BusinessInput {
  return baseInput({ ...draft, engagement: engagement as BusinessInputDraft["engagement"] });
}

/** 1. A simple two-service business: one conventional enquiry route is all it needs. */
export const simpleBusiness = (): BusinessInput =>
  baseInput({
    businessName: "FIXTURE-SIMPLE",
    industry: "local_business",
    websiteObjective: ["generate_leads"],
    servicesProducts: services(2),
    availableContent: content({ propositionText: "verified_available", serviceDescriptions: "verified_available", contactEmail: "verified_available" }),
  });

/** 2. A large catalogue where the visitor must narrow and compare, with verified data. */
export const complexCatalogue = (): BusinessInput =>
  withEngagement(
    {
      businessName: "FIXTURE-CATALOGUE",
      industry: "retail",
      websiteObjective: ["sell_products"],
      requiredFunctionality: ["checkout", "search"],
      servicesProducts: services(30, "product"),
      availableAssets: assets({ productImages: "verified_available" }),
      availableContent: content({ propositionText: "verified_available", comparisonData: "verified_available", productSpecifications: "verified_available", decisionRules: "verified_available", contactEmail: "verified_available" }),
    },
    { visitorTasks: stated("find_suitable_offer", "compare_offers"), maintenanceOwner: "FIXTURE-CATALOGUE-TEAM" },
  );

/** 3. SaaS whose buyers must justify spend, with a verified value formula. */
export const saasRoi = (overrides: EngagementDraft = {}, content_: Partial<Parameters<typeof content>[0]> = {}): BusinessInput =>
  withEngagement(
    {
      businessName: "FIXTURE-SAAS-ROI",
      industry: "saas",
      businessModel: "b2b",
      websiteObjective: ["request_demo"],
      servicesProducts: services(3, "subscription"),
      constraints: { integrations: ["FIXTURE-INT-1"], localization: [] },
      availableContent: content({ propositionText: "verified_available", formulas: "verified_available", decisionRules: "verified_available", contactEmail: "verified_available", ...content_ }),
    },
    { visitorTasks: stated("justify_investment_return", "assess_need_or_readiness"), salesMotion: "sales_assisted", maintenanceOwner: "FIXTURE-REVOPS", ...overrides },
  );

/** 4. Professional service whose visitors cannot self-diagnose which service they need. */
export const professionalService = (objectives: BusinessInputDraft["websiteObjective"] = ["generate_leads"], extra: EngagementDraft = {}, industry: BusinessInputDraft["industry"] = "professional_services"): BusinessInput =>
  withEngagement(
    {
      businessName: "FIXTURE-PRACTICE",
      industry,
      websiteObjective: objectives,
      servicesProducts: services(5),
      availableContent: content({ propositionText: "verified_available", serviceDescriptions: "verified_available", decisionRules: "verified_available", pricingRanges: "verified_available", contactEmail: "verified_available" }),
    },
    { visitorTasks: stated("assess_need_or_readiness", "book_appointment", "learn_topic"), maintenanceOwner: "FIXTURE-PARTNER", ...extra },
  );

/** 5. Booking-first business. `scheduling` decides booking flow vs appointment request form. */
export const bookingFirst = (scheduling: boolean, preference?: EngagementInput["preference"]): BusinessInput =>
  withEngagement(
    {
      businessName: "FIXTURE-CLINIC-BOOKING",
      industry: "local_business",
      websiteObjective: ["book_appointments"],
      requiredFunctionality: ["booking"],
      servicesProducts: services(3),
      location: { verified: true, city: "FIXTURE-CITY", serviceAreas: [], hasPhysicalPremises: true },
      availableContent: content({ propositionText: "verified_available", serviceDescriptions: "verified_available", contactDetails: "verified_available" }),
    },
    { schedulingIntegration: scheduling, ...(preference ? { preference } : {}) },
  );

/** 6. Education provider: learners must know where they stand and plan their study. */
export const education = (extra: EngagementDraft = {}): BusinessInput =>
  withEngagement(
    {
      businessName: "FIXTURE-SCHOOL",
      industry: "education",
      websiteObjective: ["generate_leads", "educate"],
      servicesProducts: services(6, "programme"),
      availableContent: content({ propositionText: "verified_available", serviceDescriptions: "verified_available", decisionRules: "verified_available", contactEmail: "verified_available" }),
    },
    { visitorTasks: stated("assess_need_or_readiness", "plan_activity"), maintenanceOwner: "FIXTURE-ADMISSIONS", ...extra },
  );

/** 7. Fitness studio: members pick a programme for their goal and plan sessions. */
export const fitness = (extra: EngagementDraft = {}): BusinessInput =>
  withEngagement(
    {
      businessName: "FIXTURE-STUDIO",
      industry: "fitness",
      websiteObjective: ["sell_subscriptions"],
      servicesProducts: services(6, "programme"),
      availableContent: content({ propositionText: "verified_available", serviceDescriptions: "verified_available", decisionRules: "verified_available", contactEmail: "verified_available" }),
    },
    { visitorTasks: stated("find_suitable_offer", "plan_activity"), maintenanceOwner: "FIXTURE-COACHES", ...extra },
  );

/** 8. Manufacturer of configurable products. */
export const manufacturing = (): BusinessInput =>
  withEngagement(
    {
      businessName: "FIXTURE-FABRICATION",
      industry: "manufacturing",
      businessModel: "b2b",
      websiteObjective: ["generate_leads"],
      requiredFunctionality: ["product_configurator"],
      servicesProducts: services(12, "product"),
      availableAssets: assets({ productImages: "verified_available" }),
      availableContent: content({ propositionText: "verified_available", productSpecifications: "verified_available", pricingRanges: "verified_available", decisionRules: "verified_available", contactEmail: "verified_available" }),
    },
    { visitorTasks: stated("find_suitable_offer", "configure_product"), maintenanceOwner: "FIXTURE-ENGINEERING", salesMotion: "sales_assisted" },
  );

/** 9. Real estate: affordability, filtering listings, and booking viewings. */
export const realEstate = (): BusinessInput =>
  withEngagement(
    {
      businessName: "FIXTURE-HOMES",
      industry: "real_estate",
      websiteObjective: ["generate_leads", "book_appointments"],
      servicesProducts: services(20, "product"),
      location: { verified: true, city: "FIXTURE-CITY", serviceAreas: [], hasPhysicalPremises: true },
      availableContent: content({ propositionText: "verified_available", formulas: "verified_available", decisionRules: "verified_available", productSpecifications: "verified_available", contactDetails: "verified_available" }),
    },
    {
      visitorTasks: stated("estimate_cost_or_savings", "find_suitable_offer", "book_appointment"),
      schedulingIntegration: true,
      maintenanceOwner: "FIXTURE-LISTINGS-TEAM",
    },
  );

/** 10. Customer asks for a game for vanity reasons. */
export const gameRequestedWeak = (): BusinessInput =>
  education({
    preference: "specific_idea",
    requestedIdea: { category: "game_serious_game", rationale: "increase time on page and make the site look modern and memorable" },
  });
