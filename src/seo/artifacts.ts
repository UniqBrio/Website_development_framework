/**
 * SEO ARTIFACT VALUES — P1 capability 1.
 *
 * PREVIOUS LIMITATION: `buildSeoStrategy` emitted RULES ("title unique per
 * page") and an allow/withhold schema list, but no VALUES. A generator receiving
 * that output would have to invent a title, a description and a canonical — and
 * inventing a canonical means inventing a domain, which is a fabricated fact
 * about the business.
 *
 * This module produces per-page artifacts where every value carries its origin,
 * so a generator can tell the difference between "use this" and "this needs a
 * person".
 *
 * ONE AUTHORITY: provenance is expressed with the EXISTING `ConfidenceLevel`
 * from content/confidence.ts, and approval/publication flags are read from
 * `CONFIDENCE_POLICY`. A second parallel vocabulary for the same concept is the
 * conflicting-authority failure this framework has already fixed twice.
 */
import type { BusinessInput } from "../design-intelligence/types/business-input.js";
import type { DesignContextProfile } from "../design-intelligence/types/profile.js";
import type { PageSpec } from "../generation/page-spec.js";
import { CONFIDENCE_POLICY, type ConfidenceLevel } from "../content/confidence.js";
import type { SeoStrategy } from "./strategy.js";
import type { DraftChannel } from "../content/draft-channel.js";
import { publishableOffers } from "../content/publication.js";

/**
 * How a value was obtained. Distinct from `ConfidenceLevel`, which says what may
 * be DONE with it — origin says where it CAME FROM.
 */
export type ArtifactOrigin =
  /** Straight from a verified business fact. */
  | "verified_business_fact"
  /** Composed from supplied facts; asserts nothing new (a route label, a robots directive). */
  | "generated_structural"
  /** Requires written prose the framework must not invent; a brief is supplied instead. */
  | "ai_draft"
  /** Cannot be produced without more input. Never guessed. */
  | "unresolved"
  /** Written with AI help or by the owner, and APPROVED on record (content/draft-channel.ts, P1-3). */
  | "approved_draft";

const ORIGIN_CONFIDENCE: Record<ArtifactOrigin, ConfidenceLevel> = {
  verified_business_fact: "verified",
  // Non-factual and non-deceptive, so it may ship (§J.1 neutral_placeholder).
  generated_structural: "neutral_placeholder",
  ai_draft: "ai_draft",
  unresolved: "verification_required",
  approved_draft: "verified",
};

export interface SeoArtifact<T = string> {
  /** The usable value, or `null` when there is nothing honest to emit. */
  value: T | null;
  origin: ArtifactOrigin;
  confidence: ConfidenceLevel;
  approvalRequired: boolean;
  blocksPublication: boolean;
  /** Why this value, or why there is none. */
  source: string;
  /**
   * For `ai_draft`: what the draft must contain and what it may not claim. This
   * is what makes an unwritten value consumable — the generator gets a
   * specification, not a fabrication.
   */
  draftBrief?: string;
}

function artifact<T>(
  value: T | null,
  origin: ArtifactOrigin,
  source: string,
  draftBrief?: string,
): SeoArtifact<T> {
  const confidence = ORIGIN_CONFIDENCE[origin];
  const policy = CONFIDENCE_POLICY[confidence];
  const result: SeoArtifact<T> = {
    value,
    origin,
    confidence,
    approvalRequired: policy.approvalRequired,
    blocksPublication: policy.blocksPublication,
    source,
  };
  if (draftBrief !== undefined) result.draftBrief = draftBrief;
  return result;
}

export interface OpenGraphArtifacts {
  title: SeoArtifact;
  description: SeoArtifact;
  type: SeoArtifact;
  url: SeoArtifact;
  image: SeoArtifact;
}

export interface TwitterArtifacts {
  card: SeoArtifact;
  title: SeoArtifact;
  description: SeoArtifact;
  image: SeoArtifact;
}

export interface PageSeoArtifacts {
  route: string;
  title: SeoArtifact;
  metaDescription: SeoArtifact;
  canonical: SeoArtifact;
  robots: SeoArtifact;
  inSitemap: SeoArtifact<boolean>;
  openGraph: OpenGraphArtifacts;
  twitter: TwitterArtifacts;
  /** Schema types EMITTED for this page: justified AND carrying their required properties. */
  structuredData: SeoArtifact<string[]>;
  /**
   * The JSON-LD entities themselves. DEFECT this fixes (first customer dry run):
   * types were emitted as bare `{"@type": X}` — a nameless Organization and a
   * BreadcrumbList with no items. A justified type whose required properties are
   * unavailable is recorded unresolved instead of emitted.
   */
  structuredDataEntities: SeoArtifact<Array<Record<string, unknown>>>;
  /**
   * Justified types whose required properties are SUPPLIED CONTENT VALUES (FAQ
   * answers, a verified address). The SEO plan cannot see those values; the
   * generator completes these from resolved content, or records a refusal.
   */
  structuredDataDeferred: Array<{ type: string; needs: string }>;
  indexable: SeoArtifact<boolean>;
  /** Content that must exist in the SERVED HTML for this page to be honest. */
  semanticContentRequirements: string[];
  /** Routes that must link to this page. An empty list means orphan. */
  inboundInternalLinks: string[];
  /** Shape problems a generator must not ship (length, duplication, orphan). */
  warnings: string[];
}

export interface SeoArtifactPlan {
  pages: PageSeoArtifacts[];
  /** Routes to include, or `unresolved` when there is no origin to build URLs from. */
  sitemap: SeoArtifact<string[]>;
  robotsTxt: SeoArtifact<string>;
  /** Every artifact that cannot be emitted, with what is needed. */
  unresolved: Array<{ route: string; artifact: string; needs: string }>;
  /** Every artifact a person must approve before publication. */
  approvalsRequired: Array<{ route: string; artifact: string; brief: string }>;
  warnings: string[];
  /** True only when no artifact blocks publication. */
  publishable: boolean;
}

/** Title-case a route segment into a human label. Asserts nothing. */
function routeLabel(route: string): string {
  if (route === "/") return "Home";
  const segment = route.split("/").filter(Boolean).pop() ?? "";
  const words = segment.replace(/\[|\]/g, "").split(/[-_]/).filter(Boolean);
  if (words.length === 0) return "Home";
  const first = words[0] ?? "";
  return [first.charAt(0).toUpperCase() + first.slice(1), ...words.slice(1)].join(" ");
}

/** §I: 50-60 chars is the practical title budget; 160 for a description. */
const TITLE_MAX = 60;
const DESCRIPTION_MIN = 50;
const DESCRIPTION_MAX = 160;

function ogTypeFor(page: PageSpec): string {
  switch (page.seoRole) {
    case "primary_entry":
      return "website";
    case "topic_hub":
    case "detail":
      return "article";
    default:
      return "website";
  }
}

/**
 * Which site-level schema types are justified on THIS page. A type allowed
 * site-wide is still wrong on a page that does not contain the entity — §I
 * "verified structured data only" applies per page, not per site.
 */
function schemaForPage(page: PageSpec, allowedSiteWide: readonly string[], hasPublishableService: boolean): string[] {
  const sections = new Set(page.requiredSections);
  const justified: string[] = [];
  for (const type of allowedSiteWide) {
    switch (type) {
      case "FAQPage":
        if (sections.has("faq")) justified.push(type);
        break;
      case "Service":
        // FD-15: the ENTITY decides the type. A services section holding only catalogue
        // items contains no `Service`, whatever the section is called.
        if (hasPublishableService && (sections.has("services") || sections.has("service_detail"))) justified.push(type);
        break;
      case "Product":
        if (sections.has("product_detail") || sections.has("catalog")) justified.push(type);
        break;
      case "LocalBusiness":
        if (sections.has("location_and_contact")) justified.push(type);
        break;
      case "Organization":
        if (page.seoRole === "primary_entry") justified.push(type);
        break;
      case "Article":
        // FD-15: only genuine article content. A detail page about an offer is not an
        // article, and asking it for a headline, author and publication date invented
        // an unresolved artifact on every such page.
        if (page.seoRole === "topic_hub" && page.role === "content") justified.push(type);
        break;
      case "BreadcrumbList":
        if (page.route !== "/") justified.push(type);
        break;
      default:
        break;
    }
  }
  return justified;
}

/** Types whose required properties are supplied content VALUES, completed at generation. */
const VALUE_DEPENDENT_TYPES: ReadonlySet<string> = new Set(["FAQPage", "LocalBusiness"]);

/**
 * Build JSON-LD entities from owner-supplied facts only. Each type names the
 * properties it cannot be emitted without; missing ones become unresolved.
 */
function entitiesFor(
  page: PageSpec,
  types: readonly string[],
  input: BusinessInput,
  origin: string | undefined,
  label: string,
): { entities: Array<Record<string, unknown>>; unresolved: Array<{ type: string; needs: string }> } {
  const entities: Array<Record<string, unknown>> = [];
  const unresolved: Array<{ type: string; needs: string }> = [];
  const context = "https://schema.org";
  const provider = { "@type": "Organization", name: input.businessName };
  // §I verified structured data only: service areas are a location claim, so an
  // unverified location contributes none (customer dry run, 2026-09-14).
  const areas = input.location?.verified === true ? (input.location.serviceAreas ?? []) : [];
  for (const type of types) {
    switch (type) {
      case "Organization":
        entities.push({
          "@context": context,
          "@type": "Organization",
          name: input.businessName,
          ...(origin ? { url: new URL("/", origin).toString() } : {}),
        });
        break;
      case "Service": {
        // FD-05: structured data may name only offers that may be published.
        // FD-15: and only SERVICES are `Service`. A catalogue item is a product; typing
        // a dish as a service was the page role deciding the entity type.
        const offers = publishableOffers(input).filter(
          (o) => o.kind !== "product" && (page.offerName === undefined || o.name === page.offerName),
        );
        for (const offer of offers) {
          entities.push({
            "@context": context,
            "@type": "Service",
            name: offer.name,
            provider,
            ...(offer.description ? { description: offer.description } : {}),
            ...(areas.length > 0 ? { areaServed: areas } : {}),
          });
        }
        if (offers.length === 0) unresolved.push({ type, needs: "an owner-supplied offer" });
        break;
      }
      case "BreadcrumbList":
        if (!origin) {
          unresolved.push({ type, needs: "constraints.canonicalOrigin (breadcrumb items need absolute URLs)" });
          break;
        }
        {
          const segments = page.route.split("/").filter(Boolean);
          const items = [{ name: "Home", path: "/" }, ...segments.map((_, i) => ({
            name: i === segments.length - 1 ? label : routeLabel(`/${segments.slice(0, i + 1).join("/")}`),
            path: `/${segments.slice(0, i + 1).join("/")}`,
          }))];
          entities.push({
            "@context": context,
            "@type": "BreadcrumbList",
            itemListElement: items.map((item, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: item.name,
              item: new URL(item.path, origin).toString(),
            })),
          });
        }
        break;
      case "FAQPage":
        unresolved.push({ type, needs: "supplied FAQ question and answer values (mainEntity)" });
        break;
      case "LocalBusiness":
        unresolved.push({ type, needs: "a verified postal address value" });
        break;
      case "Article":
        unresolved.push({ type, needs: "article headline, author and publication date" });
        break;
      case "Product":
        unresolved.push({ type, needs: "product name and a verified offer" });
        break;
      default:
        unresolved.push({ type, needs: "required properties for this type" });
    }
  }
  return { entities, unresolved };
}

/**
 * Build an internal link graph. Every page must be reachable from at least one
 * other page (§I internal_links; stack_doctrine.md SEO artifact 9: "an orphan is
 * not published"). Home links to every top-level route; every page links home.
 */
function inboundLinks(pages: readonly PageSpec[]): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  const home = pages.find((p) => p.route === "/");
  for (const page of pages) {
    const inbound: string[] = [];
    if (home && page.route !== "/") inbound.push("/");
    // A conversion page is also linked from the page whose objective it serves.
    if (page.seoRole === "conversion") {
      for (const other of pages) {
        if (other.route === page.route) continue;
        if (other.primaryObjective === page.primaryObjective) inbound.push(other.route);
      }
    }
    if (page.route === "/" ) {
      // Home is reached from every page's header, which the nav component provides.
      for (const other of pages) if (other.route !== "/") inbound.push(other.route);
    }
    graph.set(page.route, [...new Set(inbound)]);
  }
  return graph;
}

/**
 * P1-3: apply APPROVED title and meta-description drafts to a plan. A published
 * draft replaces the structural title or fills the description brief, carrying its
 * approval as the source; its approval requirement is then satisfied and removed.
 * Held drafts change nothing: the brief and the approval requirement stand.
 */
export function applySeoDrafts(plan: SeoArtifactPlan, channel: DraftChannel): SeoArtifactPlan {
  const satisfied = new Set<string>();
  const seen = new Map<string, string>();
  const pages = plan.pages.map((page) => {
    const titleDraft = channel.published.get(`title:${page.route}`);
    const descriptionDraft = channel.published.get(`metaDescription:${page.route}`);
    if (!titleDraft && !descriptionDraft) return page;
    const warnings = [...page.warnings];
    const title = titleDraft
      ? artifact(titleDraft.value, "approved_draft", `approved draft: ${titleDraft.provenance.source} — ${titleDraft.reason}`)
      : page.title;
    if (titleDraft && titleDraft.value.length > TITLE_MAX) {
      warnings.push(`approved title is ${titleDraft.value.length} chars, over the ${TITLE_MAX}-char budget`);
    }
    let metaDescription = page.metaDescription;
    if (descriptionDraft) {
      metaDescription = artifact(descriptionDraft.value, "approved_draft", `approved draft: ${descriptionDraft.provenance.source} — ${descriptionDraft.reason}`);
      satisfied.add(`${page.route} metaDescription`);
      const length = descriptionDraft.value.length;
      if (length < DESCRIPTION_MIN || length > DESCRIPTION_MAX) {
        warnings.push(`approved meta description is ${length} chars, outside ${DESCRIPTION_MIN}-${DESCRIPTION_MAX}`);
      }
    }
    return {
      ...page,
      title,
      metaDescription,
      openGraph: { ...page.openGraph, title, description: metaDescription },
      twitter: { ...page.twitter, title, description: metaDescription },
      warnings,
    };
  });
  for (const page of pages) {
    const t = page.title.value;
    if (!t) continue;
    const other = seen.get(t);
    if (other) page.warnings.push(`title duplicates ${other} — §I forbids metadata reused across pages`);
    else seen.set(t, page.route);
  }
  return {
    ...plan,
    pages,
    approvalsRequired: plan.approvalsRequired.filter((a) => !satisfied.has(`${a.route} ${a.artifact}`)),
  };
}

export function buildSeoArtifacts(
  input: BusinessInput,
  profile: DesignContextProfile,
  pages: readonly PageSpec[],
  strategy: SeoStrategy,
  /** Content categories the verification pass says may actually render. */
  renderableContent: ReadonlySet<string>,
): SeoArtifactPlan {
  const origin = input.constraints?.canonicalOrigin;
  const businessName = input.businessName;
  const allowedSiteWide = strategy.allowedSchemaTypes.map((s) => s.type);
  const linkGraph = inboundLinks(pages);

  // A verified image asset is required for og:image. Nothing else may stand in:
  // an OG image is a public representation of the business (§J.2).
  const verifiedImageAsset =
    input.availableAssets.heroImages === "verified_available"
      ? "heroImages"
      : input.availableAssets.productImages === "verified_available"
        ? "productImages"
        : input.availableAssets.logo === "verified_available"
          ? "logo"
          : null;

  const unresolved: SeoArtifactPlan["unresolved"] = [];
  const approvals: SeoArtifactPlan["approvalsRequired"] = [];
  const planWarnings: string[] = [];
  const seenTitles = new Map<string, string>();

  const pageArtifacts: PageSeoArtifacts[] = pages.map((page) => {
    const warnings: string[] = [];
    // A DD-093 page is named by the owner's offer name, verbatim; re-casing its
    // slug corrupts owner terms ("GST" became "Gst").
    // The page model's label: the owner's, the role's ("FAQ"), or the route segment's.
    const label = page.offerName ?? page.label ?? routeLabel(page.route);

    // ---- TITLE: composed from the SUPPLIED business name plus a route label.
    // FD-13: the framework has no verification state for a business name, so the
    // provenance must not call it verified. Asserting only the name the customer
    // supplied is still safe to ship; confirming the name is a customer approval.
    // DD-092: every indexable page gets page-specific title, description brief,
    // canonical and Open Graph; a duplicate title is warned below. DD-091: the
    // semantic-content contract further down is what makes the page indexable.
    const titleValue =
      page.route === "/" ? businessName : `${label} — ${businessName}`;
    const title = artifact(
      titleValue,
      "generated_structural",
      `composed from the supplied business name and the route label "${label}"; states no claim beyond the name, which the customer has not yet confirmed`,
    );
    if (titleValue.length > TITLE_MAX) {
      warnings.push(
        `title is ${titleValue.length} chars, over the ${TITLE_MAX}-char budget — needs a shorter form`,
      );
    }
    const duplicateOf = seenTitles.get(titleValue);
    if (duplicateOf) {
      warnings.push(`title duplicates ${duplicateOf} — §I forbids metadata reused across pages`);
    } else {
      seenTitles.set(titleValue, page.route);
    }

    // ---- META DESCRIPTION: prose. The framework must not write public marketing
    // copy about a business, so it emits a BRIEF and requires approval.
    const metaDescription = artifact<string>(
      null,
      "ai_draft",
      "a meta description is public prose about the business; the framework specifies it rather than inventing it",
      `${DESCRIPTION_MIN}-${DESCRIPTION_MAX} characters describing this page's purpose ("${page.purpose}") for ${page.audience.join(" and ")}. ` +
        `It may state only what app_reality supports. It may NOT claim outcomes, ratings, counts, credentials or guarantees. ` +
        `Primary objective: ${page.primaryObjective}. Conversion: ${page.conversionRole}.`,
    );
    approvals.push({
      route: page.route,
      artifact: "metaDescription",
      brief: metaDescription.draftBrief ?? "",
    });

    // ---- CANONICAL: absolute, so it needs a real origin. Never guessed.
    const canonical = origin
      ? artifact(
          new URL(page.route, origin).toString(),
          "verified_business_fact",
          `absolute URL from the supplied canonicalOrigin "${origin}"`,
        )
      : artifact<string>(
          null,
          "unresolved",
          "no canonicalOrigin supplied; a guessed domain would be a fabricated fact about the business, and a wrong canonical is worse than none",
        );
    if (!origin) {
      unresolved.push({
        route: page.route,
        artifact: "canonical",
        needs: "constraints.canonicalOrigin (the production origin, e.g. https://example.com)",
      });
    }

    // ---- ROBOTS + SITEMAP + INDEXABILITY: fully deterministic.
    const indexable = page.mustBeIndexable && page.seoRole !== "utility";
    const robots = artifact(
      indexable ? "index,follow" : "noindex,follow",
      "generated_structural",
      indexable
        ? "page is declared indexable in the page model"
        : `page role "${page.seoRole}" / mustBeIndexable=${page.mustBeIndexable}`,
    );
    const inSitemap = artifact(
      indexable,
      "generated_structural",
      indexable ? "indexable pages are included" : "non-indexable pages are excluded",
    );
    const indexableArtifact = artifact(
      indexable,
      "generated_structural",
      "derived from the page model's mustBeIndexable and SEO role",
    );

    // ---- OPEN GRAPH.
    const openGraph: OpenGraphArtifacts = {
      title,
      description: metaDescription,
      type: artifact(ogTypeFor(page), "generated_structural", `derived from SEO role "${page.seoRole}"`),
      url: canonical,
      image: verifiedImageAsset
        ? artifact(
            `<verified asset: ${verifiedImageAsset}>`,
            "verified_business_fact",
            `a verified ${verifiedImageAsset} asset exists; the generator selects the file and must measure logo contrast on it (theme_system.md §LOGO CONTRAST)`,
          )
        : artifact<string>(
            null,
            "unresolved",
            "no verified image asset; an OG image is a public representation of the business and may not be generated as a stand-in (§J.2)",
          ),
    };
    if (!verifiedImageAsset) {
      unresolved.push({
        route: page.route,
        artifact: "openGraph.image",
        needs: "a verified hero, product or logo asset",
      });
    }

    // ---- TWITTER: card type follows whether an image exists.
    const twitter: TwitterArtifacts = {
      card: artifact(
        verifiedImageAsset ? "summary_large_image" : "summary",
        "generated_structural",
        verifiedImageAsset
          ? "a verified image asset exists"
          : "no verified image asset, so the large-image card would be empty",
      ),
      title,
      description: metaDescription,
      image: openGraph.image,
    };

    // ---- STRUCTURED DATA: per page, from the site-level allow list, as REAL
    // entities with their required properties — or unresolved.
    const justified = schemaForPage(page, allowedSiteWide, publishableOffers(input).some((o) => o.kind !== "product"));
    const built = entitiesFor(page, justified, input, origin, label);
    const structuredDataDeferred = built.unresolved.filter((u) => VALUE_DEPENDENT_TYPES.has(u.type));
    for (const missing of built.unresolved.filter((u) => !VALUE_DEPENDENT_TYPES.has(u.type))) {
      unresolved.push({ route: page.route, artifact: `structuredData.${missing.type}`, needs: missing.needs });
    }
    const emittedTypes = [...new Set(built.entities.map((e) => String(e["@type"])))];
    const structuredData = artifact(
      emittedTypes,
      "generated_structural",
      emittedTypes.length > 0
        ? `types whose entity this page actually contains, with required properties: ${emittedTypes.join(", ")}`
        : justified.length > 0
          ? `justified types lack required properties here: ${built.unresolved.map((u) => u.type).join(", ")} — value-dependent ones are completed by the generator from supplied content`
          : "no schema type's entity is present on this page; emitting one would be a fabricated claim (§I, §12)",
    );
    const structuredDataEntities = artifact(
      built.entities,
      "generated_structural",
      "JSON-LD built only from owner-supplied facts: business name, offer names and descriptions, service areas, and the canonical origin when known",
    );

    // ---- SEMANTIC CONTENT: what must be in the served HTML.
    const semanticContentRequirements = [
      "exactly one H1, no skipped heading levels",
      ...page.requiredSections
        .filter((section) => renderableContent.has(section) || !section.includes("_"))
        .map((section) => `section "${section}" present in server-rendered HTML`),
      "primary action reachable without executing JavaScript",
    ];

    const inbound = linkGraph.get(page.route) ?? [];
    // FD-12: the home page IS the entry point. On a single-page site no other page can
    // link to it, and calling that an orphan penalised a site for having one page.
    // Every other page still needs an inbound link.
    if (inbound.length === 0 && page.route !== "/") {
      warnings.push("ORPHAN: no inbound internal link — an orphan page is not published");
      planWarnings.push(`${page.route} is an orphan`);
    }

    return {
      route: page.route,
      title,
      metaDescription,
      canonical,
      robots,
      inSitemap,
      openGraph,
      twitter,
      structuredData,
      structuredDataEntities,
      structuredDataDeferred,
      indexable: indexableArtifact,
      semanticContentRequirements,
      inboundInternalLinks: inbound,
      warnings,
    };
  });

  const indexableRoutes = pageArtifacts
    .filter((p) => p.inSitemap.value === true)
    .map((p) => p.route);

  const sitemap = origin
    ? artifact(
        indexableRoutes.map((route) => new URL(route, origin).toString()),
        "verified_business_fact",
        `absolute URLs for ${indexableRoutes.length} indexable route(s)`,
      )
    : artifact<string[]>(
        null,
        "unresolved",
        "a sitemap requires absolute URLs, which requires canonicalOrigin",
      );
  if (!origin) {
    unresolved.push({
      route: "(site)",
      artifact: "sitemap",
      needs: "constraints.canonicalOrigin",
    });
  }

  const robotsTxt = origin
    ? artifact(
        `User-agent: *\nAllow: /\nSitemap: ${new URL("/sitemap.xml", origin).toString()}`,
        "generated_structural",
        "standard allow-all with an absolute sitemap reference",
      )
    : artifact(
        "User-agent: *\nAllow: /",
        "generated_structural",
        "allow-all emitted without a Sitemap line, because the absolute sitemap URL is unresolved",
      );

  const publishable = pageArtifacts.every(
    (page) =>
      !page.title.blocksPublication &&
      !page.canonical.blocksPublication &&
      !page.robots.blocksPublication,
  );

  if (profile.variables.seo_dependency === "high" && !origin) {
    planWarnings.push(
      "seo_dependency is HIGH and no canonicalOrigin is supplied, so canonical, og:url and the sitemap cannot be emitted at all",
    );
  }

  return {
    pages: pageArtifacts,
    sitemap,
    robotsTxt,
    unresolved,
    approvalsRequired: approvals,
    warnings: planWarnings,
    publishable,
  };
}
