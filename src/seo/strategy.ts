/**
 * SEO strategy — specification §16, appendix I and I.1.
 *
 * §16 treats SEO as an ARCHITECTURAL concern, so the important output is not a
 * list of tags but a constraint on rendering: important information must exist
 * in semantic HTML, and dynamic enhancement must not remove essential content
 * from the semantic document.
 *
 * The structured-data rule is the sharp one: §I says "verified structured data
 * only" and §12 forbids fabricated claims. Marking up a rating a business does
 * not have is a fabricated claim wearing an SEO hat, so this module refuses to
 * emit a schema type whose backing evidence is unverified.
 */
import type { Industry } from "../design-intelligence/types/business-input.js";
import type { DesignContextProfile } from "../design-intelligence/types/profile.js";

/** §I seo_baseline.require. */
export const SEO_REQUIREMENTS = [
  "server_rendered_html_for_public_content",
  "unique_title_and_description",
  "one_clear_h1",
  "semantic_headings",
  "internal_links",
  "accurate_canonical_when_needed",
  "open_graph_metadata",
  "verified_structured_data_only",
  "descriptive_image_alternatives",
] as const;

/** §I avoid. */
export const SEO_PROHIBITIONS = [
  "client_only_primary_content",
  "canvas_only_text",
  "duplicate_thin_pages",
  "fabricated_schema",
  "metadata_reused_across_pages",
] as const;

/** §I.1 content architecture by intent. */
const PAGE_ARCHITECTURE: Partial<Record<Industry, readonly string[]>> = {
  local_business: ["location", "service_area", "verified_contact"],
  saas: ["solution", "use_case", "integration", "comparison", "resource"],
  ai: ["solution", "use_case", "integration", "comparison", "resource"],
  ecommerce: ["category", "product"],
  retail: ["category", "product"],
  professional_services: ["service", "industry", "process", "faq", "insight"],
  legal: ["service", "industry", "process", "faq", "insight"],
  healthcare: ["service", "process", "faq"],
  education: ["program", "admissions", "faculty_outcome", "resource_event"],
  university: ["program", "admissions", "faculty_outcome", "resource_event"],
  media: ["topic_hub", "article"],
  editorial: ["topic_hub", "article"],
};

/**
 * Schema types and the evidence each one REQUIRES. A type whose evidence is not
 * verified is not emitted — §I "verified structured data only".
 */
// DD-094: structured data only for entities the page actually contains — a
// schema type without its entity is a fabricated claim (§12).
const SCHEMA_EVIDENCE: Record<string, readonly string[]> = {
  LocalBusiness: ["addresses"],
  Product: ["product_screenshots", "pricing"],
  Review: ["reviews"],
  AggregateRating: ["reviews"],
  FAQPage: ["faq"],
  Article: ["proposition"],
  Organization: ["proposition"],
  Service: ["services"],
  BreadcrumbList: [],
};

export interface SeoStrategy {
  /** Rendering constraint — the architectural part of §16. */
  renderingConstraint: string;
  /** Page types to generate, from §I.1. */
  pageArchitecture: readonly string[];
  /** Schema types that may be emitted, with the evidence that justifies each. */
  allowedSchemaTypes: Array<{ type: string; justifiedBy: readonly string[] }>;
  /** Schema types explicitly withheld, and why — §30 explainability. */
  withheldSchemaTypes: Array<{ type: string; missingEvidence: readonly string[] }>;
  requirements: readonly string[];
  prohibitions: readonly string[];
  /** Per-page metadata obligations. */
  metadataRules: readonly string[];
}

export function buildSeoStrategy(
  profile: DesignContextProfile,
  renderableContent: ReadonlySet<string>,
  options: {
    candidateSchemaTypes?: readonly string[];
    /**
     * The page model. When supplied, the page architecture is the ACTUAL routes
     * rather than a generic industry list — the dry run found `pageArchitecture`
     * returning ["service","process","faq"] while five owner-supplied pages were
     * discarded.
     */
    pages?: ReadonlyArray<{ route: string; seoRole: string; mustBeIndexable: boolean }>;
  } = {},
): SeoStrategy {
  const candidates = options.candidateSchemaTypes ?? Object.keys(SCHEMA_EVIDENCE);
  const allowed: SeoStrategy["allowedSchemaTypes"] = [];
  const withheld: SeoStrategy["withheldSchemaTypes"] = [];

  for (const type of candidates) {
    const required = SCHEMA_EVIDENCE[type];
    if (!required) continue;
    const missing = required.filter((evidence) => !renderableContent.has(evidence));
    if (missing.length === 0) allowed.push({ type, justifiedBy: required });
    else withheld.push({ type, missingEvidence: missing });
  }

  const renderingConstraint =
    profile.variables.seo_dependency === "high"
      ? "All public content is server-rendered. No primary content, heading, or link may exist only after client hydration, and no text may live only in canvas or WebGL (§I avoid)."
      : "Public content is server-rendered by default; client rendering is permitted only for genuinely interactive, non-indexable surfaces.";

  return {
    renderingConstraint,
    pageArchitecture:
      options.pages && options.pages.length > 0
        ? options.pages.map((p) => `${p.route} (${p.seoRole}${p.mustBeIndexable ? "" : ", noindex"})`)
        : (PAGE_ARCHITECTURE[profile.industry] ?? ["home", "about", "contact"]),
    allowedSchemaTypes: allowed,
    withheldSchemaTypes: withheld,
    requirements: SEO_REQUIREMENTS,
    prohibitions: SEO_PROHIBITIONS,
    metadataRules: [
      "title and description unique per page; never reused across pages",
      "exactly one H1 per page, with no skipped heading levels below it",
      "canonical absolute and self-referencing unless the page is a deliberate duplicate",
      "Open Graph image present; its logo contrast measured per active theme",
      "every page reachable by at least one internal link from an existing page",
    ],
  };
}

/**
 * Derive the SEO criterion score for the quality engine. Withheld schema is NOT
 * a penalty — withholding unverified schema is correct behaviour, and scoring it
 * down would create pressure to fabricate.
 */
export function seoScore(observations: {
  serverRenderedPrimaryContent: boolean;
  uniqueTitleAndDescription: boolean;
  singleH1: boolean;
  headingHierarchyValid: boolean;
  canonicalCorrect: boolean;
  openGraphPresent: boolean;
  internalInboundLinks: number;
  fabricatedSchemaPresent: boolean;
  imagesWithoutAlt: number;
  /** DD-074/DD-095: optional so older observation shapes still score. */
  imagesWithoutDimensions?: number;
}): { value: number; evidence: string } {
  if (observations.fabricatedSchemaPresent) {
    return {
      value: 0,
      evidence: "fabricated structured data present — a claim, not an optimisation (§12, §I)",
    };
  }
  if (!observations.serverRenderedPrimaryContent) {
    return {
      value: 2,
      evidence: "primary content is not in server-rendered HTML (§I avoid client_only_primary_content)",
    };
  }
  let value = 10;
  const notes: string[] = [];
  const deduct = (amount: number, note: string) => {
    value -= amount;
    notes.push(note);
  };

  if (!observations.uniqueTitleAndDescription) deduct(2, "title/description not unique per page");
  if (!observations.singleH1) deduct(2, "not exactly one H1");
  if (!observations.headingHierarchyValid) deduct(1, "heading levels skipped");
  if (!observations.canonicalCorrect) deduct(1, "canonical missing or incorrect");
  if (!observations.openGraphPresent) deduct(1, "Open Graph metadata missing");
  if (observations.internalInboundLinks === 0) deduct(2, "orphan page: no inbound internal link");
  if ((observations.imagesWithoutDimensions ?? 0) > 0) {
    // DD-095: an unsized image shifts layout and is unoptimised for search.
    deduct(1, `${observations.imagesWithoutDimensions} image(s) without reserved dimensions (DD-095)`);
  }
  if (observations.imagesWithoutAlt > 0) {
    deduct(1, `${observations.imagesWithoutAlt} image(s) without alternatives`);
  }

  return {
    value: Math.max(0, value),
    evidence: notes.length > 0 ? notes.join("; ") : "all §I baseline requirements satisfied",
  };
}
