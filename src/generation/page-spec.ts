/**
 * Page model — fixes dry-run P0-4.
 *
 * ROOT CAUSE this replaces: `requiredPages` was accepted by the input contract
 * and read exactly once, as `requiredPages.length`, to bucket information
 * density (`derive-profile.ts`). Five pages with stated purposes reached the
 * pipeline and none survived into the output. `pageArchitecture` then returned a
 * generic `["service","process","faq"]` that matched none of them.
 *
 * A PageSpec preserves every field the brief requires: route, purpose, primary
 * objective, audience, SEO role, content requirements, required sections,
 * conversion role, responsive requirements and trust/proof requirements.
 *
 * This module is also where the responsive audit's inventory now comes from, so
 * the audit stops running over a hand-authored list.
 */
import type {
  AudienceProfile,
  BusinessInput,
  PageRole,
  WebsiteObjective,
} from "../design-intelligence/types/business-input.js";
import type { DesignContextProfile } from "../design-intelligence/types/profile.js";
import type { ComponentDescriptor } from "../responsive/transformations.js";
import type { PatternDefinition } from "../design-system/pattern-registry/types.js";
import { OBJECTIVE_ARCHITECTURE } from "../design-intelligence/objectives/objective-architecture.js";
import { resolveOfferPublication } from "../content/publication.js";
import { SECTION_OWNERS as REGISTRY_SECTION_OWNERS } from "../design-intelligence/sections/registry.js";

export type SeoRole =
  | "primary_entry"
  | "topic_hub"
  | "detail"
  | "conversion"
  | "trust"
  | "utility";

export interface PageSpec {
  route: string;
  purpose: string;
  /** What the page IS; allocates its sections (P1-1). */
  role: PageRole;
  /** `stated` by the owner, `inferred` from path and purpose, or `derived` with the page. */
  roleBasis: "stated" | "inferred" | "derived";
  /** Navigation label: the owner's, else the role's, else the route segment's. */
  label: string;
  /** The single objective this page primarily serves. */
  primaryObjective: WebsiteObjective;
  /** Objectives it also supports. */
  secondaryObjectives: WebsiteObjective[];
  /** Audience labels this page is written for. */
  audience: string[];
  /** FD-02: `stated` only when every audience it addresses was stated by the customer. */
  audienceBasis: "stated" | "inferred";
  seoRole: SeoRole;
  mustBeIndexable: boolean;
  /** Content categories this page cannot be honest without. */
  contentRequirements: string[];
  /** Sections, in intended order. */
  requiredSections: string[];
  /** What conversion this page carries, or `none` for a pure content page. */
  conversionRole: string;
  /** Capability constraints the page inherits from the profile. */
  responsiveRequirements: string[];
  /** Proof categories this page needs to be credible. */
  trustRequirements: string[];
  /** True when the page came from the owner's `requiredPages`, not derived. */
  ownerSupplied: boolean;
  /** The rule that derived this page, when a rule did (DD-093 content hubs). */
  derivedBy?: string;
  /** For a DD-093 service page: the ONE offer it is about, by exact name. */
  offerName?: string;
}

/**
 * Sections that ARE the conversion surface. One home, read by DD-093 (a hub
 * page carries the primary objective's conversion section) and by DD-032 in the
 * component model (proof is ordered before these).
 */
export const CONVERSION_SECTIONS: ReadonlySet<string> = new Set(["booking", "enquiry", "signup", "checkout"]);

export interface ContentHubDecision {
  offer: string;
  /** The derived route, or null when the offer got no page. */
  route: string | null;
  because: string;
  ruleId: "DD-093";
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * DD-093 (§4.12): when SEO dependency is high and the business has several
 * offers, each offer WITH owner-supplied descriptive content gets its own
 * indexable page. An offer without content gets no page — the rule's own
 * fallback is "a smaller set of deeper verified pages", and a thin page made
 * from a name alone is the near-duplicate the rule forbids.
 *
 * Pure and deterministic: `derivePageSpecs` calls it to add the pages, and the
 * pipeline calls it to record the per-offer decision, so the two cannot differ.
 */
export function planContentHubs(
  input: BusinessInput,
  profile: DesignContextProfile,
  decisions: Record<string, unknown>,
  existingRoutes: ReadonlySet<string>,
  renderableContent: ReadonlySet<string>,
): { pages: PageSpec[]; decisions: ContentHubDecision[] } {
  const record: ContentHubDecision[] = [];
  const pages: PageSpec[] = [];
  if (decisions["seo.contentHubs"] !== "service_pages_for_offers_with_supplied_content") {
    return { pages, decisions: record };
  }
  const primary = sitePrimaryOrFirst(input.websiteObjective, profile.primaryObjective);
  const architecture = OBJECTIVE_ARCHITECTURE[primary];
  const conversionSection = architecture.requiredSections.find((s) => CONVERSION_SECTIONS.has(s));

  // Routes already claimed — owner pages AND hub pages derived earlier in this
  // loop — so two offers whose names slugify identically cannot both claim one
  // route, and a name with no slug-able characters never becomes "/services/".
  const claimed = new Set(existingRoutes);
  const publication = new Map(resolveOfferPublication(input).map((o) => [o.offer.name, o.decision]));
  for (const offer of input.servicesProducts) {
    const slug = slugify(offer.name);
    const route = `/services/${slug}`;
    if (slug.length === 0) {
      record.push({ offer: offer.name, route: null, because: "the offer name yields no URL-safe slug; no route may be guessed for it", ruleId: "DD-093" });
      continue;
    }
    if (!offer.customerSupplied) {
      record.push({ offer: offer.name, route: null, because: "offer is not owner-supplied; no page may be derived for it", ruleId: "DD-093" });
      continue;
    }
    // FD-05: a page ABOUT an offer publishes its name in the route, the title and the
    // navigation, so an offer whose name may not be published gets no page.
    const decision = publication.get(offer.name);
    if (decision && !decision.publish) {
      record.push({ offer: offer.name, route: null, because: `offer name is not publishable (${decision.state}): ${decision.reason}`, ruleId: "DD-093" });
      continue;
    }
    // FD-15: a hub page is a page ABOUT an offer — right for a service or a programme,
    // wrong for a catalogue item. 49 dishes with descriptions produced 49 thin indexable
    // pages typed `Service`. A catalogue item lives in its group on the catalogue page.
    if (offer.kind === "product") {
      record.push({
        offer: offer.name,
        route: null,
        because: "a catalogue item (kind \"product\") is rendered inside its group, not as its own page: a page per item is the thin near-duplicate DD-093 exists to prevent",
        ruleId: "DD-093",
      });
      continue;
    }
    if (!offer.description || offer.description.trim().length === 0) {
      record.push({
        offer: offer.name,
        route: null,
        because: "no owner-supplied description — DD-093 fallback: a smaller set of deeper verified pages rather than a thin near-duplicate",
        ruleId: "DD-093",
      });
      continue;
    }
    if (claimed.has(route)) {
      record.push({
        offer: offer.name,
        route: null,
        because: existingRoutes.has(route)
          ? "the owner already supplies this route; not re-derived"
          : `another offer already claimed ${route}; a second page would duplicate the route`,
        ruleId: "DD-093",
      });
      continue;
    }
    claimed.add(route);
    record.push({ offer: offer.name, route, because: "owner-supplied description exists; distinct search intent", ruleId: "DD-093" });
    pages.push({
      route,
      purpose: `service page for the offer "${offer.name}", derived from its owner-supplied description (DD-093)`,
      role: "service",
      roleBasis: "derived",
      label: offer.name,
      primaryObjective: primary,
      secondaryObjectives: [],
      audience: inferAudience(offer.name, route, input.targetAudience),
      audienceBasis: audienceBasisFor(offer.name, route, input.targetAudience),
      seoRole: "detail",
      mustBeIndexable: true,
      contentRequirements: ["services"],
      requiredSections: [
        "service_detail",
        ...(renderableContent.has("faq") ? ["faq"] : []),
        ...(conversionSection ? [conversionSection] : []),
      ],
      conversionRole: architecture.conversionSurface,
      responsiveRequirements: responsiveRequirementsFor(profile),
      trustRequirements: [...architecture.criticalEvidence],
      ownerSupplied: false,
      derivedBy: "DD-093",
      offerName: offer.name,
    });
  }
  return { pages, decisions: record };
}

/** Heuristic mapping from a route/purpose to an SEO role. Order matters. */
function inferSeoRole(route: string, purpose: string, objective: WebsiteObjective): SeoRole {
  if (route === "/") return "primary_entry";
  const text = `${route} ${purpose}`.toLowerCase();
  if (/book|contact|enqui|signup|sign-up|checkout|donate|apply/.test(text)) return "conversion";
  if (/about|qualification|credential|governance|team|trust|security|policy|terms|privacy/.test(text)) {
    return "trust";
  }
  if (/condition|topic|guide|learn|resource|blog|insight/.test(text)) return "topic_hub";
  if (OBJECTIVE_ARCHITECTURE[objective].conversionSurface !== "related_conversion_link" &&
      /^\/(book|buy|order)/.test(route)) {
    return "conversion";
  }
  return "detail";
}

/**
 * Which objective a page primarily serves. Matched from the page's own stated
 * purpose against each objective's vocabulary, falling back to the site's
 * primary objective. Never invents an objective the business did not state.
 */
function inferPrimaryObjective(
  purpose: string,
  route: string,
  objectives: readonly WebsiteObjective[],
  siteePrimary: WebsiteObjective,
): WebsiteObjective {
  const text = `${route} ${purpose}`.toLowerCase();
  const hints: Array<[WebsiteObjective, RegExp]> = [
    ["book_appointments", /book|appointment|assessment|schedul/],
    ["sell_products", /catalogue|catalog|device|product|shop|buy|store/],
    ["educate", /condition|educat|explain|guide|learn|resource/],
    ["build_credibility", /about|credential|qualification|clinician|professional|referral|trust/],
    ["generate_leads", /enqui|contact|lead/],
    ["showcase_work", /work|portfolio|project|case stud/],
    ["recruit", /career|job|vacanc|recruit/],
    ["publish_content", /blog|news|article|insight/],
    ["provide_support", /support|help|faq/],
    ["raise_funds", /donate|fundrais|appeal/],
    ["sell_subscriptions", /plan|subscription|membership|pricing/],
    ["start_free_trial", /trial/],
    ["request_demo", /demo/],
    ["drive_footfall", /visit|location|find us|directions|opening/],
  ];
  for (const [objective, pattern] of hints) {
    if (pattern.test(text) && objectives.includes(objective)) return objective;
  }
  return sitePrimaryOrFirst(objectives, siteePrimary);
}

function sitePrimaryOrFirst(
  objectives: readonly WebsiteObjective[],
  fallback: WebsiteObjective,
): WebsiteObjective {
  return objectives[0] ?? fallback;
}

/**
 * Which audiences a page addresses. A page whose purpose names a professional
 * role is written for that audience; everything else addresses the primary
 * audience. Multi-audience businesses were invisible in the dry run, and this is
 * the smallest honest representation of them.
 */
function inferAudience(purpose: string, route: string, audiences: readonly AudienceProfile[]): string[] {
  const text = `${route} ${purpose}`.toLowerCase();
  const matched = audiences.filter((audience) =>
    audience.roles.some((role) => text.includes(role.toLowerCase())) ||
    text.includes(audience.label.toLowerCase()),
  );
  if (matched.length > 0) return matched.map((a) => a.label);
  // /for-clinicians style routes address the non-primary professional audience.
  const professional = audiences.find((a) => !a.isPrimary && /clinic|professional|partner|trade|reseller/.test(
    `${a.label} ${a.roles.join(" ")}`.toLowerCase(),
  ));
  if (professional && /for-|professional|clinician|partner|trade/.test(text)) {
    return [professional.label];
  }
  const primary = audiences.find((a) => a.isPrimary) ?? audiences[0];
  return primary ? [primary.label] : [];
}

/**
 * FD-02: the basis of the audiences a page addresses. `stated` only when every
 * matched audience was stated by the customer — an inferred label is never published
 * as the owner's words.
 */
function audienceBasisFor(purpose: string, route: string, audiences: readonly AudienceProfile[]): "stated" | "inferred" {
  const labels = new Set(inferAudience(purpose, route, audiences));
  const matched = audiences.filter((a) => labels.has(a.label));
  return matched.length > 0 && matched.every((a) => a.basis === "stated") ? "stated" : "inferred";
}

function responsiveRequirementsFor(profile: DesignContextProfile): string[] {
  const requirements = [
    "core content and task preserved at 320 CSS px and 400% zoom",
    "no hover-dependent affordance without a visible equivalent",
  ];
  if (profile.variables.mobile_share === "high") {
    requirements.push("compact range is the primary design target, not an adaptation");
  }
  if (profile.variables.audience_digital_literacy === "low") {
    requirements.push("one primary action per viewport; no compound interactions");
  }
  if (profile.variables.accessibility_requirement === "wcag_aaa_or_equivalent") {
    requirements.push("AAA contrast and enlarged target sizing");
  }
  return requirements;
}

/**
 * Infer a page's role from its path and purpose. Deterministic and conservative:
 * a page that matches no specific role is `content`, which keeps the objective-led
 * allocation, so an inference can only ADD the sections a role needs.
 */
export function inferPageRole(path: string, purpose: string): PageRole {
  const route = path.toLowerCase();
  const said = purpose.toLowerCase();
  if (route === "/") return "home";
  if (/(^|\/)faqs?(\/|$)/.test(route) || /frequently asked|\bfaqs?\b/.test(said)) return "faq";
  if (/(^|\/)contact(-us)?(\/|$)/.test(route) || /^(contact|get in touch)\b/.test(said)) return "contact";
  if (/(^|\/)(about|about-us|who-we-are|our-story)(\/|$)/.test(route) || /^about\b/.test(said)) return "about";
  if (/(^|\/)(privacy|terms|legal|disclosures?|policies|cookies?)(\/|$)/.test(route)) return "legal";
  if (/^\/services?\/[^/]+$/.test(route)) return "service";
  if (/^\/services?$/.test(route) || /^services overview\b|^(all|our) services\b/.test(said)) return "services_index";
  if (/book|checkout|sign-?up|subscribe|demo|trial|donate|apply|enquir/.test(`${route} ${said}`)) return "conversion";
  return "content";
}

const ROLE_LABELS: Partial<Record<PageRole, string>> = {
  home: "Home",
  services_index: "Services",
  about: "About",
  faq: "FAQ",
  contact: "Contact",
};

function routeSegmentLabel(route: string): string {
  const segment = route.split("/").filter(Boolean).pop() ?? "";
  const words = segment.split(/[-_]/).filter(Boolean).join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** The conversion section an objective carries, if it has one. */
function conversionSectionOf(objective: WebsiteObjective): string | undefined {
  return OBJECTIVE_ARCHITECTURE[objective].requiredSections.find((s) => CONVERSION_SECTIONS.has(s));
}

/**
 * SECTION ALLOCATION BY ROLE (P1-1). `null` keeps the objective-led allocation
 * (home, conversion and content pages ARE objective pages). Every other role owns
 * the sections that make it that page: a contact page without a contact section,
 * or an FAQ page without an FAQ, is the defect the first customer dry run found.
 */
function roleSections(
  role: PageRole,
  pageObjective: WebsiteObjective,
  siteObjective: WebsiteObjective,
  renderableContent: ReadonlySet<string>,
): string[] | null {
  const conversion = conversionSectionOf(pageObjective) ?? conversionSectionOf(siteObjective);
  const conv = conversion ? [conversion] : [];
  switch (role) {
    case "services_index":
      return ["services", ...conv];
    case "service":
      return ["service_detail", ...(renderableContent.has("faq") ? ["faq"] : []), ...conv];
    case "about":
      return ["about", "qualifications", "process", ...(renderableContent.has("evidence") ? ["evidence"] : [])];
    case "faq":
      return ["faq", ...conv];
    case "contact":
      return ["location_and_contact", ...conv];
    case "legal":
      return ["disclosures"];
    default:
      return null;
  }
}

export interface PageAllocationReport {
  /** Every architecture section and the routes that received it. */
  entries: Array<{ section: string; routes: string[] }>;
  /** Sections moved to the page whose ROLE owns them, with the reason. */
  allocated: Array<{ section: string; route: string; because: string }>;
  /** Sections no page received. Reported, never silently dropped. */
  unallocated: Array<{ section: string; reason: string }>;
  /** G1: how the site got its home route. */
  home: { route: "/"; how: "owner_supplied" | "primary_objective_page_at_root" | "derived_home_page"; because: string };
  /** Sections moved off one page because another page owns them, so two indexable pages do not serve one body (P1-7). */
  deduplicated: Array<{ route: string; removed: string[]; ownedBy: string; because: string }>;
}

/**
 * Site-level sections and the roles that own them — read from the section registry
 * (C1), so ownership is declared once beside the section's label and renderer.
 */
const SECTION_OWNERS: Readonly<Record<string, readonly PageRole[]>> = REGISTRY_SECTION_OWNERS;

/**
 * Allocate owned site-level sections to their pages and report the rest. Mutates
 * the specs' `requiredSections` (the one allocation authority) and returns what it did.
 */
export function allocateSiteSections(
  specs: PageSpec[],
  sectionArchitecture: readonly string[],
  home: PageAllocationReport["home"],
): PageAllocationReport {
  const allocated: PageAllocationReport["allocated"] = [];
  // P1-7 at the source: when the home page and a conversion page serve the SAME
  // objective, the conversion and contact sections belong to the conversion page
  // and the services overview to home — otherwise both pages carry one body
  // (the first host dry run measured / and /book at similarity 1).
  const deduplicated: PageAllocationReport["deduplicated"] = [];
  const homePage = specs.find((p) => p.route === "/" && p.role === "home");
  const conversionTwin = homePage && specs.find((p) => p !== homePage && p.role === "conversion" && p.primaryObjective === homePage.primaryObjective);
  if (homePage && conversionTwin) {
    const moved = homePage.requiredSections.filter((s) => CONVERSION_SECTIONS.has(s) || s === "location_and_contact");
    if (moved.length > 0) {
      homePage.requiredSections = homePage.requiredSections.filter((s) => !moved.includes(s));
      for (const s of moved) if (!conversionTwin.requiredSections.includes(s)) conversionTwin.requiredSections.push(s);
      deduplicated.push({ route: "/", removed: moved, ownedBy: conversionTwin.route, because: `the conversion page ${conversionTwin.route} serves the same objective (${homePage.primaryObjective}); home routes to it` });
    }
    if (homePage.requiredSections.includes("services") && conversionTwin.requiredSections.includes("services")) {
      conversionTwin.requiredSections = conversionTwin.requiredSections.filter((s) => s !== "services");
      deduplicated.push({ route: conversionTwin.route, removed: ["services"], ownedBy: "/", because: "the home page carries the services overview" });
    }
  }
  for (const [section, owners] of Object.entries(SECTION_OWNERS)) {
    if (!sectionArchitecture.includes(section)) continue;
    if (specs.some((p) => p.requiredSections.includes(section))) continue;
    const owner = owners.map((role) => specs.find((p) => p.role === role)).find((p): p is PageSpec => p !== undefined);
    if (!owner) continue;
    // Before the page's conversion section, so facts precede the action.
    const at = owner.requiredSections.findIndex((s) => CONVERSION_SECTIONS.has(s));
    if (at >= 0) owner.requiredSections.splice(at, 0, section);
    else owner.requiredSections.push(section);
    allocated.push({ section, route: owner.route, because: `site-level section owned by the "${owner.role}" role` });
  }
  const entries = sectionArchitecture.map((section) => ({
    section,
    routes: specs.filter((p) => p.requiredSections.includes(section)).map((p) => p.route),
  }));
  const unallocated = entries
    .filter((e) => e.routes.length === 0)
    .map((e) => ({
      section: e.section,
      reason: SECTION_OWNERS[e.section]
        ? `no page has a role that owns it (${SECTION_OWNERS[e.section]!.join(" / ")})`
        : "no page's role or objective allocates it",
    }));
  return { entries, allocated, unallocated, home, deduplicated };
}

export function derivePageSpecs(
  input: BusinessInput,
  profile: DesignContextProfile,
  sectionArchitecture: readonly string[],
  /**
   * Content categories the verification pass says may render. An objective's
   * SUPPORTING sections are added to a page only when their content is renderable
   * — the first dry run computed supporting sections and then dropped them, so an
   * FAQ could never appear even when the owner had supplied one.
   */
  renderableContent: ReadonlySet<string> = new Set(),
  /** The evaluation draft. DD-093 reads `seo.contentHubs` from it. */
  decisions: Record<string, unknown> = {},
): PageSpec[] {
  const objectives = input.websiteObjective;
  const specs: PageSpec[] = [];
  const sections = new Set(sectionArchitecture);

  const sitePrimary = sitePrimaryOrFirst(objectives, profile.primaryObjective);
  // 1. EVERY owner-supplied page survives. This is the invariant P0-4 exists for.
  for (const page of input.requiredPages) {
    const primaryObjective = inferPrimaryObjective(
      page.purpose,
      page.path,
      objectives,
      profile.primaryObjective,
    );
    const architecture = OBJECTIVE_ARCHITECTURE[primaryObjective];
    const pageSections = architecture.requiredSections.filter((s) => sections.has(s));
    const supporting = architecture.supportingSections.filter(
      (s) => renderableContent.has(s) && !pageSections.includes(s),
    );
    const role = page.role ?? inferPageRole(page.path, page.purpose);
    const byRole = roleSections(role, primaryObjective, sitePrimary, renderableContent);
    const offerName =
      role === "service"
        ? input.servicesProducts.find((o) => page.path.endsWith(`/${slugify(o.name)}`))?.name
        : undefined;

    specs.push({
      route: page.path,
      purpose: page.purpose,
      role,
      roleBasis: page.role ? "stated" : "inferred",
      label: page.label ?? offerName ?? ROLE_LABELS[role] ?? routeSegmentLabel(page.path),
      ...(offerName ? { offerName } : {}),
      primaryObjective,
      secondaryObjectives: objectives.filter((o) => o !== primaryObjective),
      audience: inferAudience(page.purpose, page.path, input.targetAudience),
      audienceBasis: audienceBasisFor(page.purpose, page.path, input.targetAudience),
      seoRole: ROLE_SEO[role] ?? inferSeoRole(page.path, page.purpose, primaryObjective),
      mustBeIndexable: page.mustBeIndexable,
      contentRequirements: [...architecture.requiredSections],
      // Fall back to the objective's full requirement list when the global
      // architecture does not yet contain them: a page must not silently lose
      // the sections its own objective needs.
      requiredSections:
        // A role that owns its sections allocates them; a service page with no
        // matching offer lists the services instead of inventing a detail.
        byRole !== null
          ? role === "service" && !offerName
            ? byRole.map((s) => (s === "service_detail" ? "services" : s))
            : byRole
          : [...(pageSections.length > 0 ? pageSections : [...architecture.requiredSections]), ...supporting],
      conversionRole: architecture.conversionSurface,
      responsiveRequirements: responsiveRequirementsFor(profile),
      trustRequirements: [...architecture.criticalEvidence],
      ownerSupplied: true,
    });
  }

  // G1: the home route. The brand, the navigation and the 404 page all link to
  // "/", so a site without it is broken before a visitor arrives (engagement host
  // run: a Next prefetch of the missing "/" never settled). With no owner pages the
  // site-primary objective's page IS the home page: deriving both would serve the
  // same body twice.

  // 2. An objective with no owner-supplied page gets one, so coverage is real
  //    rather than assumed. Derived pages are marked as such.
  for (const objective of objectives) {
    const alreadyServed = specs.some((s) => s.primaryObjective === objective);
    if (alreadyServed) continue;
    const architecture = OBJECTIVE_ARCHITECTURE[objective];
    // Same supporting-section rule as an owner-supplied page: a supporting
    // section is added when its content can render. Derived pages previously
    // skipped this, so a supplied FAQ could never appear on a site with no
    // owner-supplied pages (found by the DD-040 integration test).
    const derivedSupporting = architecture.supportingSections.filter(
      (s) => renderableContent.has(s) && !architecture.requiredSections.includes(s),
    );
    const atRoot = input.requiredPages.length === 0 && objective === sitePrimary && !specs.some((s) => s.route === "/");
    const route = atRoot ? "/" : derivedObjectiveRoute(objective, new Set(specs.map((s) => s.route)));
    specs.push({
      route,
      purpose: atRoot
        ? `derived home page: no owner-supplied pages; serves the site-primary objective "${objective}"`
        : `derived page: no owner-supplied page serves the stated objective "${objective}"`,
      // A related-link surface (educate) is a topic page, not a conversion page.
      role: atRoot ? "home" : architecture.conversionSurface === "related_conversion_link" ? "content" : "conversion",
      roleBasis: "derived",
      label: atRoot ? "Home" : routeSegmentLabel(route),
      primaryObjective: objective,
      secondaryObjectives: [],
      audience: inferAudience(objective, "", input.targetAudience),
      audienceBasis: audienceBasisFor(objective, "", input.targetAudience),
      seoRole: atRoot ? "primary_entry" : architecture.conversionSurface === "related_conversion_link" ? "topic_hub" : "conversion",
      mustBeIndexable: true,
      contentRequirements: [...architecture.requiredSections],
      requiredSections: [...architecture.requiredSections, ...derivedSupporting],
      conversionRole: architecture.conversionSurface,
      responsiveRequirements: responsiveRequirementsFor(profile),
      trustRequirements: [...architecture.criticalEvidence],
      ownerSupplied: false,
    });
  }

  // G1 (owner pages without "/"): a minimal home page that introduces the business
  // and routes to the conversion page; it repeats no other page's conversion form.
  if (!specs.some((s) => s.route === "/")) {
    const architecture = OBJECTIVE_ARCHITECTURE[sitePrimary];
    specs.unshift({
      route: "/",
      purpose: "derived home page: the owner's page list has no page at /",
      role: "home",
      roleBasis: "derived",
      label: "Home",
      primaryObjective: sitePrimary,
      secondaryObjectives: objectives.filter((o) => o !== sitePrimary),
      audience: inferAudience("", "/", input.targetAudience),
      audienceBasis: audienceBasisFor("", "/", input.targetAudience),
      seoRole: "primary_entry",
      mustBeIndexable: true,
      contentRequirements: ["proposition"],
      requiredSections: ["proposition", ...(input.servicesProducts.length > 0 ? ["services"] : [])],
      conversionRole: architecture.conversionSurface,
      responsiveRequirements: responsiveRequirementsFor(profile),
      trustRequirements: [...architecture.criticalEvidence],
      ownerSupplied: false,
      derivedBy: "G1",
    });
  }

  // C5 (FD-09): THE HOME INVARIANT. A home page introduces the business, whatever
  // objective it serves. Section content used to come from the objective alone, and
  // 9 of the 14 objectives carry no `proposition` — so a home page led by one of them
  // had nowhere to render a proposition, and approved or verified headline copy was
  // dropped. DD-031 already requires every hero to answer what and why; this makes the
  // page model agree with the rule.
  const home = specs.find((s) => s.route === "/");
  if (home && !home.requiredSections.includes("proposition")) {
    home.requiredSections = ["proposition", ...home.requiredSections];
    if (!home.contentRequirements.includes("proposition")) home.contentRequirements = ["proposition", ...home.contentRequirements];
  }

  // 3. DD-093 content hubs: one page per offer WITH supplied content.
  const hubs = planContentHubs(input, profile, decisions, new Set(specs.map((s) => s.route)), renderableContent);
  specs.push(...hubs.pages);

  return specs;
}

/**
 * FD-16: the route for a page derived from an objective. A URL is visitor-facing, so
 * it is named for what the visitor does there — never the internal objective id
 * (`/generate-leads` was a framework enum leaking into the address bar).
 */
const DERIVED_ROUTE_LABEL: Record<WebsiteObjective, string> = {
  generate_leads: "enquire",
  book_appointments: "book",
  sell_products: "shop",
  sell_subscriptions: "plans",
  start_free_trial: "start",
  request_demo: "demo",
  build_credibility: "about",
  educate: "learn",
  recruit: "careers",
  showcase_work: "work",
  drive_footfall: "visit",
  publish_content: "articles",
  raise_funds: "donate",
  provide_support: "support",
};

/** The first free route for a derived objective page. */
function derivedObjectiveRoute(objective: WebsiteObjective, claimed: ReadonlySet<string>): string {
  const label = DERIVED_ROUTE_LABEL[objective];
  const candidates = [`/${label}`, `/${label}-page`, `/${objective.replace(/_/g, "-")}`];
  return candidates.find((c) => !claimed.has(c)) ?? `/${objective.replace(/_/g, "-")}`;
}

/** SEO role per page role, where the role settles it. */
const ROLE_SEO: Partial<Record<PageRole, SeoRole>> = {
  home: "primary_entry",
  services_index: "topic_hub",
  service: "detail",
  about: "trust",
  faq: "topic_hub",
  contact: "conversion",
  legal: "trust",
};

/** How the home route came to exist (G1). Pure: read from the derived specs. */
export function homeRouteRecord(input: BusinessInput, pages: readonly PageSpec[]): PageAllocationReport["home"] {
  const home = pages.find((p) => p.route === "/");
  if (!home) throw new Error("G1 invariant violated: the page model has no home route");
  if (home.ownerSupplied) return { route: "/", how: "owner_supplied", because: "the owner supplied a page at /" };
  if (input.requiredPages.length === 0) {
    return { route: "/", how: "primary_objective_page_at_root", because: `no owner pages were supplied; the page serving the site-primary objective "${home.primaryObjective}" is the home page (G1)` };
  }
  return { route: "/", how: "derived_home_page", because: "the owner listed pages but none at /; a home page is derived so every link to / resolves (G1)" };
}

/**
 * Derive the responsive audit's inventory from the page model and the selected
 * patterns — replacing the hand-authored `ComponentDescriptor[]` the dry run
 * flagged as dishonest coverage.
 *
 * LIMITATION, stated rather than hidden: `weightKb` comes from each pattern's
 * `estimatedRouteJsKb` plus a small fixed allowance for markup. It is an
 * ESTIMATE from registry metadata, not a measured bundle. Real weight needs a
 * build, which is post-build evidence this pre-build stage does not have.
 */
export function componentsForPages(
  pages: readonly PageSpec[],
  selectedPatterns: readonly PatternDefinition[],
): ComponentDescriptor[] {
  const components: ComponentDescriptor[] = [];
  const seen = new Set<string>();

  const push = (component: ComponentDescriptor) => {
    if (seen.has(component.id)) return;
    seen.add(component.id);
    components.push(component);
  };

  // Every page contributes its essential chrome. These are `essential` so the
  // transformation engine refuses to hide them.
  for (const page of pages) {
    push({
      id: `nav@${page.route}`,
      criticality: "essential",
      kind: "navigation_destination",
      hoverDependent: true,
      animated: false,
      weightKb: 4,
    });
    push({
      id: `proposition@${page.route}`,
      criticality: "essential",
      kind: "proposition",
      hoverDependent: false,
      animated: false,
      weightKb: 2,
    });
    if (page.conversionRole !== "none" && page.seoRole !== "utility") {
      push({
        id: `cta@${page.route}`,
        criticality: "essential",
        kind: "primary_action",
        hoverDependent: false,
        animated: false,
        weightKb: 1,
      });
    }
    for (const section of page.requiredSections) {
      const essential = ESSENTIAL_SECTION_KINDS[section];
      push({
        id: `${section}@${page.route}`,
        criticality: essential ? "essential" : "supporting",
        kind: essential ?? "section",
        hoverDependent: false,
        animated: false,
        weightKb: 3,
      });
    }
  }

  // Every selected pattern contributes its own component, carrying the real
  // metadata the transformation engine needs.
  for (const pattern of selectedPatterns) {
    push({
      id: `pattern:${pattern.id}`,
      criticality: pattern.carriesEssentialContentAlone ? "essential" : "supporting",
      kind: pattern.category === "immersive" ? "product_detail" : "section",
      hoverDependent: /hover/i.test(pattern.desktop),
      animated: pattern.tier !== "semantic_html_css",
      weightKb: pattern.estimatedRouteJsKb + 3,
    });
  }

  return components;
}

/** Sections that ARE essential content, so `hide` may never apply to them. */
const ESSENTIAL_SECTION_KINDS: Record<string, string | undefined> = {
  price: "pricing",
  checkout: "primary_action",
  booking: "primary_action",
  signup: "primary_action",
  enquiry: "contact_route",
  location_and_contact: "contact_route",
  disclosures: "legal_disclosure",
  returns: "legal_disclosure",
  product_detail: "product_detail",
  qualifications: "important_evidence",
};
