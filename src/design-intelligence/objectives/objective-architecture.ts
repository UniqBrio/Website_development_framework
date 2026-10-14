/**
 * Objective-driven architecture and coverage — fixes dry-run P0-2.
 *
 * ROOT CAUSE this replaces: architecture was derived from INDUSTRY alone. DD-007
 * (ecommerce) keys on `industry`, so a clinic with a stated `sell_products`
 * objective produced no catalogue, no price surface and no returns section, and
 * nothing anywhere noticed. The objective was accepted at the input contract and
 * then silently dropped.
 *
 * The fix is deliberately GENERAL. There is no "clinic + sell_products" case and
 * no industry name in this file: an objective declares the architecture it needs
 * and the capabilities that can serve it, and a validator asserts that every
 * stated objective is actually represented. Adding an industry condition here
 * would recreate the bug.
 */
import type { WebsiteObjective } from "../types/business-input.js";
import type { DerivedVariables } from "../types/profile.js";

export interface ObjectiveArchitecture {
  /** Sections the objective cannot be served without. */
  requiredSections: readonly string[];
  /**
   * Sections that strengthen it when the evidence exists, but whose absence is
   * not a coverage failure — the content engine may legitimately hide them.
   */
  supportingSections: readonly string[];
  /**
   * Pattern capabilities that can serve this objective. Coverage is satisfied by
   * a section OR by a selected pattern providing one of these.
   */
  servingCapabilities: readonly string[];
  /** The conversion surface this objective ultimately needs. */
  conversionSurface: string;
  /**
   * Evidence categories without which the objective cannot convert at all. The
   * content engine already blocks these; naming them here keeps the two in step.
   */
  criticalEvidence: readonly string[];
}

/**
 * One row per objective. `requiredSections` is what makes the objective real on
 * a page; a stated objective whose required sections are all absent is an
 * objective the site does not actually pursue.
 */
export const OBJECTIVE_ARCHITECTURE: Record<WebsiteObjective, ObjectiveArchitecture> = {
  generate_leads: {
    requiredSections: ["proposition", "services", "enquiry"],
    supportingSections: ["process", "evidence", "faq"],
    servingCapabilities: ["form"],
    conversionSurface: "enquiry_form",
    criticalEvidence: ["contact_method"],
  },
  book_appointments: {
    requiredSections: ["proposition", "services", "booking", "location_and_contact"],
    supportingSections: ["process", "qualifications", "faq"],
    servingCapabilities: ["form", "scheduler"],
    conversionSurface: "booking_flow",
    criticalEvidence: ["addresses"],
  },
  sell_products: {
    requiredSections: ["catalog", "product_detail", "price", "returns", "checkout"],
    supportingSections: ["gallery", "filters", "faq"],
    servingCapabilities: ["gallery", "comparison", "spatial_3d"],
    conversionSurface: "checkout",
    criticalEvidence: ["product_screenshots"],
  },
  sell_subscriptions: {
    requiredSections: ["plans", "price", "signup"],
    supportingSections: ["comparison", "faq", "security"],
    servingCapabilities: ["form"],
    conversionSurface: "signup_flow",
    criticalEvidence: ["pricing"],
  },
  start_free_trial: {
    requiredSections: ["proposition", "product_proof", "signup"],
    supportingSections: ["workflow", "integrations", "faq"],
    servingCapabilities: ["form"],
    conversionSurface: "trial_signup",
    criticalEvidence: [],
  },
  request_demo: {
    requiredSections: ["proposition", "product_proof", "demo_request"],
    supportingSections: ["use_cases", "security", "evidence"],
    servingCapabilities: ["form", "scheduler"],
    conversionSurface: "demo_request_form",
    criticalEvidence: [],
  },
  build_credibility: {
    requiredSections: ["proposition", "qualifications", "process"],
    supportingSections: ["evidence", "case_studies", "governance"],
    servingCapabilities: ["comparison", "diagram"],
    conversionSurface: "contact_route",
    criticalEvidence: [],
  },
  educate: {
    requiredSections: ["topic_hub", "explanation"],
    supportingSections: ["diagram", "faq", "glossary"],
    servingCapabilities: ["diagram"],
    conversionSurface: "related_conversion_link",
    criticalEvidence: [],
  },
  recruit: {
    requiredSections: ["roles", "culture", "application"],
    supportingSections: ["benefits", "process"],
    servingCapabilities: ["form"],
    conversionSurface: "application_form",
    criticalEvidence: [],
  },
  showcase_work: {
    requiredSections: ["work_index", "work_detail"],
    supportingSections: ["services", "process", "contact"],
    servingCapabilities: ["gallery", "comparison"],
    conversionSurface: "enquiry_form",
    criticalEvidence: ["portfolio_work"],
  },
  drive_footfall: {
    requiredSections: ["location_and_contact", "hours", "services"],
    supportingSections: ["directions", "parking", "faq"],
    servingCapabilities: [],
    conversionSurface: "directions_and_call",
    criticalEvidence: ["addresses"],
  },
  publish_content: {
    requiredSections: ["article_index", "article_detail"],
    supportingSections: ["topic_hub", "author", "subscribe"],
    servingCapabilities: [],
    conversionSurface: "subscribe",
    criticalEvidence: [],
  },
  raise_funds: {
    requiredSections: ["cause", "impact", "donate"],
    supportingSections: ["governance", "reports"],
    servingCapabilities: ["form"],
    conversionSurface: "donation_flow",
    criticalEvidence: [],
  },
  provide_support: {
    requiredSections: ["help_index", "contact_support"],
    supportingSections: ["faq", "status", "guides"],
    servingCapabilities: ["form"],
    conversionSurface: "support_request",
    criticalEvidence: [],
  },
};

/**
 * Sections an objective needs, scaled by the derived variables. `commerce_depth`
 * is what makes commerce architecture appear for a non-commerce INDUSTRY — the
 * generalisation of the bug this file fixes.
 */
export function sectionsForObjectives(
  objectives: readonly WebsiteObjective[],
  variables: DerivedVariables,
): { required: string[]; supporting: string[] } {
  const required = new Set<string>();
  const supporting = new Set<string>();

  for (const objective of objectives) {
    const architecture = OBJECTIVE_ARCHITECTURE[objective];
    for (const section of architecture.requiredSections) required.add(section);
    for (const section of architecture.supportingSections) supporting.add(section);
  }

  // Commerce depth adds discovery surfaces regardless of industry: a business
  // selling more than a handful of products needs to be searchable and
  // filterable whatever it calls itself.
  if (variables.commerce_depth === "deep") {
    required.add("filters");
    required.add("search");
  }
  if (variables.commerce_depth === "medium" || variables.commerce_depth === "deep") {
    required.add("product_detail");
  }
  if (variables.regulation_risk === "high") {
    required.add("disclosures");
  }

  return { required: [...required], supporting: [...supporting] };
}

export interface ObjectiveCoverageEntry {
  objective: WebsiteObjective;
  served: boolean;
  /** Required sections present in the architecture. */
  presentSections: string[];
  /** Required sections missing — the reason an objective is unserved. */
  missingSections: string[];
  /** Selected patterns providing one of the objective's serving capabilities. */
  servingPatterns: string[];
  /** Evidence the content engine has blocked, which caps this objective. */
  blockedEvidence: string[];
  conversionSurface: string;
}

export interface ObjectiveCoverageReport {
  entries: ObjectiveCoverageEntry[];
  /** Objectives with no architectural representation at all. */
  unserved: WebsiteObjective[];
  /** True only when every stated objective is represented. */
  complete: boolean;
  /** One line per unserved objective, for the publication requirements. */
  failures: string[];
}

/**
 * Assert that every stated objective is represented. This is the loud failure
 * the dry run found missing: an objective with no architecture is reported, not
 * dropped.
 *
 * An objective counts as served when EITHER at least one of its required
 * sections is present, OR a selected pattern provides one of its serving
 * capabilities. The first condition is the substantive one; the second exists so
 * a pattern that genuinely does the job is not ignored because the section
 * vocabulary happens to name it differently.
 */
export function checkObjectiveCoverage(
  objectives: readonly WebsiteObjective[],
  sectionArchitecture: readonly string[],
  selectedPatternCapabilities: readonly string[],
  blockedEvidenceCategories: readonly string[],
): ObjectiveCoverageReport {
  const sections = new Set(sectionArchitecture);
  const capabilities = new Set(selectedPatternCapabilities);
  const blocked = new Set(blockedEvidenceCategories);

  const entries: ObjectiveCoverageEntry[] = objectives.map((objective) => {
    const architecture = OBJECTIVE_ARCHITECTURE[objective];
    const presentSections = architecture.requiredSections.filter((s) => sections.has(s));
    const missingSections = architecture.requiredSections.filter((s) => !sections.has(s));
    const servingPatterns = architecture.servingCapabilities.filter((c) => capabilities.has(c));
    const blockedEvidence = architecture.criticalEvidence.filter((e) => blocked.has(e));

    return {
      objective,
      served: presentSections.length > 0 || servingPatterns.length > 0,
      presentSections,
      missingSections,
      servingPatterns,
      blockedEvidence,
      conversionSurface: architecture.conversionSurface,
    };
  });

  const unserved = entries.filter((e) => !e.served).map((e) => e.objective);
  const failures = entries
    .filter((e) => !e.served)
    .map(
      (e) =>
        `objective "${e.objective}" has NO architectural representation — none of its required sections (${e.missingSections.join(", ")}) are present and no selected pattern provides ${OBJECTIVE_ARCHITECTURE[e.objective].servingCapabilities.join("/") || "a serving capability"}. Serve it or drop it explicitly.`,
    );

  // A served objective whose critical evidence is blocked is also worth stating:
  // the architecture exists but cannot convert.
  for (const entry of entries) {
    if (entry.served && entry.blockedEvidence.length > 0) {
      failures.push(
        `objective "${entry.objective}" has architecture but its conversion surface "${entry.conversionSurface}" cannot function: blocked evidence ${entry.blockedEvidence.join(", ")}.`,
      );
    }
  }

  return { entries, unserved, complete: unserved.length === 0, failures };
}
