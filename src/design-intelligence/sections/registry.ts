/**
 * SECTION CONTRACT — one registry for every section the engine can decide (C1).
 *
 * ROOT CAUSE this closes (FD-14, FD-08, and the class behind them): the DECISION
 * vocabulary outgrew the CONTENT model. Industry baselines, objective architectures
 * and DD rules between them name 83 section ids; the generator renders 21. The other
 * 62 fell into one default branch that rendered "<Section> to be supplied." — a slot
 * no customer could ever fill, because no content field feeds it and no renderer
 * reads one. `hours` was the instance the first real customer hit: verified opening
 * hours were supplied, rendered inside the contact block, and the hours section still
 * said "Hours to be supplied." for ever.
 *
 * Each entry declares:
 *   - `aliases`    every spelling a baseline or rule emits (the EG-9 vocabulary drift);
 *   - `label`      the visitor-facing heading (no more id-derived headings);
 *   - `content`    where its value comes from, or `structural` when it needs none;
 *   - `renderer`   the generator case that renders it, or `null` — NOT SUPPORTED.
 *   - `owner`      the page role that owns it when it is a site-level section.
 *
 * A `null` renderer is a declared capability gap: the section is recorded
 * `unavailable` with a reason and blocks publication, instead of pretending to be a
 * slot the customer can fill. `tests/scenarios/remediation-phase1.test.ts` fails if any
 * id a baseline, objective or rule can emit is missing from this registry.
 */
import type { Industry, PageRole } from "../types/business-input.js";

/** Where a section's content comes from. `structural` sections assert nothing. */
export type SectionContentSource =
  | "proposition"
  | "about"
  | "offers"
  | "offer_description"
  | "process"
  | "faq"
  | "legal"
  | "contact"
  | "hours"
  | "product_assets"
  | "page_purpose"
  | "conversion"
  | "proof"
  | "structural";

export interface SectionEntry {
  id: string;
  aliases?: readonly string[];
  label: string;
  /**
   * FD-07: the visitor-facing label where an industry names the thing differently. A
   * restaurant's list of offers is a Menu, not "Services". Declared as data, per
   * industry, so no renderer grows an industry branch.
   */
  labelByIndustry?: Readonly<Partial<Record<Industry, string>>>;
  content: SectionContentSource;
  /** The `verifyContent` category that governs publication, when one does. */
  verification?: string;
  /** The generator case id that renders it; `null` when nothing renders it yet. */
  renderer: string | null;
  /** Page roles that own this site-level section, strongest first. */
  owner?: readonly PageRole[];
}

const entry = (e: SectionEntry): SectionEntry => e;

/** Sections the generator renders today. */
const SUPPORTED: SectionEntry[] = [
  entry({ id: "proposition", label: "Overview", content: "proposition", verification: "proposition", renderer: "proposition" }),
  entry({
    id: "services",
    label: "Services",
    labelByIndustry: { food_service: "Menu", hospitality: "Menu", ecommerce: "Products", retail: "Products", education: "Programmes", university: "Programmes" },
    content: "offers",
    verification: "services",
    renderer: "services",
  }),
  entry({ id: "service_detail", label: "Detail", content: "offer_description", verification: "offer_descriptions", renderer: "service_detail" }),
  entry({ id: "about", label: "About", content: "about", renderer: "about", owner: ["about"] }),
  entry({ id: "process", label: "How it works", content: "process", verification: "process", renderer: "process" }),
  entry({ id: "faq", label: "Frequently asked questions", content: "faq", verification: "faq", renderer: "faq", owner: ["faq"] }),
  entry({ id: "explanation", label: "Explanation", content: "page_purpose", renderer: "explanation" }),
  entry({ id: "topic_hub", label: "Topics", content: "page_purpose", renderer: "topic_hub" }),
  entry({
    id: "location_and_contact",
    // FD-08: "location" (where the business is) and "contact" (how to reach it) are the
    // same rendered section: the verified place and the verified methods, together.
    aliases: ["location_contact", "clear_contact", "contact", "location"],
    label: "Location and contact",
    content: "contact",
    verification: "contact_method",
    renderer: "location_and_contact",
    owner: ["contact"],
  }),
  entry({ id: "hours", label: "Opening hours", content: "hours", verification: "addresses", renderer: "hours", owner: ["contact"] }),
  entry({ id: "booking", label: "Book", content: "conversion", renderer: "booking" }),
  // "inquiry" is the architecture/interiors baseline's spelling of the enquiry surface.
  entry({ id: "enquiry", aliases: ["cta", "inquiry"], label: "Enquire", content: "conversion", renderer: "enquiry" }),
  entry({ id: "signup", label: "Sign up", content: "conversion", renderer: "signup" }),
  entry({ id: "checkout", label: "Checkout", content: "conversion", renderer: "checkout" }),
  entry({ id: "catalog", label: "Catalogue", content: "product_assets", renderer: "catalog" }),
  entry({ id: "product_detail", label: "Product detail", content: "product_assets", verification: "product_screenshots", renderer: "product_detail" }),
  entry({ id: "disclosures", aliases: ["terms", "policies"], label: "Disclosures", content: "legal", verification: "legal_policies", renderer: "disclosures", owner: ["legal", "contact", "about"] }),
  entry({ id: "returns", label: "Returns", content: "legal", verification: "legal_policies", renderer: "returns" }),
  entry({ id: "qualifications", aliases: ["verified_credentials"], label: "Qualifications", content: "proof", verification: "certifications", renderer: "qualifications" }),
  entry({ id: "plain_language_summary", aliases: ["clear_language"], label: "In plain language", content: "proof", renderer: "plain_language_summary" }),
  entry({ id: "price", aliases: ["fees"], label: "Price", content: "proof", verification: "pricing", renderer: "price" }),
  entry({ id: "evidence", aliases: ["proof"], label: "Evidence", content: "proof", verification: "statistics", renderer: "evidence" }),
];

/**
 * Sections a baseline, objective or rule can decide that NO renderer implements.
 * Listed explicitly so the gap is a recorded capability limit rather than a silent
 * "to be supplied" slot. Each is built when a real customer needs it — building all
 * of them speculatively is the template-first mistake the framework avoids.
 */
const UNSUPPORTED_IDS: ReadonlyArray<[string, string, SectionContentSource]> = [
  ["admissions", "Admissions", "structural"],
  ["amenities", "Amenities", "structural"],
  ["application", "Apply", "conversion"],
  ["article_detail", "Article", "structural"],
  ["article_index", "Articles", "structural"],
  ["author", "Author", "structural"],
  ["benefits", "Benefits", "structural"],
  ["brand_context", "Brand", "structural"],
  ["case_studies", "Case studies", "proof"],
  ["cause", "The cause", "structural"],
  ["coaches", "Coaches", "proof"],
  ["comparison", "Comparison", "structural"],
  ["contact_support", "Contact support", "conversion"],
  ["culture", "Culture", "structural"],
  ["data_privacy", "Data and privacy", "legal"],
  ["demo_request", "Request a demo", "conversion"],
  ["diagram", "Diagram", "structural"],
  ["directions", "Directions", "contact"],
  ["donate", "Donate", "conversion"],
  ["filters", "Filters", "structural"],
  ["gallery", "Gallery", "product_assets"],
  ["glossary", "Glossary", "structural"],
  ["governance", "Governance", "proof"],
  ["guides", "Guides", "structural"],
  ["help_index", "Help", "structural"],
  ["impact", "Impact", "proof"],
  ["integrations", "Integrations", "structural"],
  ["internal_links", "More", "structural"],
  ["limitations_and_controls", "Limitations and controls", "structural"],
  ["features", "Features", "structural"],
  ["data_and_privacy", "Data and privacy", "legal"],
  ["outcomes", "Outcomes", "proof"],
  ["parking", "Parking", "structural"],
  ["plans", "Plans", "proof"],
  ["product_proof", "Product proof", "proof"],
  ["programs", "Programmes", "structural"],
  ["projects", "Projects", "proof"],
  ["registration", "Registration", "conversion"],
  ["reports", "Reports", "proof"],
  ["resources", "Resources", "structural"],
  ["roles", "Roles", "structural"],
  ["safety", "Safety", "structural"],
  ["schedule", "Schedule", "structural"],
  ["search", "Search", "structural"],
  ["security", "Security", "structural"],
  ["status", "Status", "structural"],
  ["subscribe", "Subscribe", "conversion"],
  ["support", "Support", "structural"],
  ["use_cases", "Use cases", "structural"],
  ["work", "Work", "proof"],
  ["work_detail", "Work", "proof"],
  ["work_gallery", "Work gallery", "product_assets"],
  ["work_index", "Work", "proof"],
  ["workflow", "Workflow", "structural"],
];

export const SECTION_REGISTRY: ReadonlyMap<string, SectionEntry> = new Map(
  [...SUPPORTED, ...UNSUPPORTED_IDS.map(([id, label, content]) => entry({ id, label, content, renderer: null }))].map((e) => [e.id, e]),
);

const ALIAS_TO_CANONICAL: ReadonlyMap<string, string> = new Map(
  [...SECTION_REGISTRY.values()].flatMap((e) => (e.aliases ?? []).map((a) => [a, e.id] as const)),
);

/** The canonical id for any spelling a baseline, objective or rule emits. */
export function canonicalSection(name: string): string {
  return ALIAS_TO_CANONICAL.get(name) ?? name;
}

/** The registry entry for a section, by any spelling. `undefined` = not in the contract at all. */
export function sectionEntry(name: string): SectionEntry | undefined {
  return SECTION_REGISTRY.get(canonicalSection(name));
}

/** The visitor-facing heading for a section, in this industry's words (FD-07). */
export function sectionLabel(name: string, industry?: Industry): string {
  const found = sectionEntry(name);
  if (found) return (industry && found.labelByIndustry?.[industry]) ?? found.label;
  // Unknown ids keep the old id-derived heading rather than throwing at render time;
  // the registry-coverage test is what stops an unknown id from existing.
  const id = canonicalSection(name);
  return id.split("_").map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join(" ");
}

/** True when the generator has no renderer for this section. */
export function isSupportedSection(name: string): boolean {
  return sectionEntry(name)?.renderer != null;
}

/** Site-level sections and the roles that own them, derived from the registry. */
export const SECTION_OWNERS: Readonly<Record<string, readonly PageRole[]>> = Object.fromEntries(
  [...SECTION_REGISTRY.values()].filter((e) => e.owner).map((e) => [e.id, e.owner!]),
);
