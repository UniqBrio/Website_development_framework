/**
 * BUILD EVIDENCE PRODUCER — P1 capability 3, part 2.
 *
 * PREVIOUS LIMITATION: the quality gates expected build/runtime evidence and
 * nothing produced it. `BuildEvidence` was a type the tests constructed by hand.
 *
 * This module is the smallest CORRECT producer. It does real work on real
 * artifacts — it parses served HTML, reads a build manifest, compares a built
 * route inventory against the page model — and where an artifact does not exist
 * it returns `unavailable` with a note saying what would produce it.
 *
 * It manufactures nothing. A framework that fabricated a Lighthouse score to
 * fill a gate would be committing the same offence as a fabricated testimonial.
 */
import type { Evidence } from "./evidence-value.js";
import { measured, derived, unavailable } from "./evidence-value.js";
import type { AccessibilityObservations } from "../accessibility/rules.js";
import type { PageSpec } from "../generation/page-spec.js";

/** Facts extractable from a page's SERVED HTML, without executing JavaScript. */
export interface ServedHtmlFacts {
  route: string;
  title: string | null;
  metaDescription: string | null;
  canonical: string | null;
  robots: string | null;
  h1Count: number;
  /** Heading levels in document order, e.g. [1,2,2,3]. */
  headingOrder: number[];
  headingSkips: boolean;
  ogTags: Record<string, string>;
  twitterTags: Record<string, string>;
  /** `@type` values found in JSON-LD blocks. */
  structuredDataTypes: string[];
  imageCount: number;
  imagesWithoutAlt: number;
  /** DD-074/DD-086/DD-095: images with no width+height (or aspect-ratio) reserved — the CLS source. */
  imagesWithoutDimensions: number;
  /** DD-085: images the page asked the browser to load lazily. */
  imagesLazy: number;
  /** DD-085: images marked fetchpriority=high (the LCP candidate). */
  imagesHighPriority: number;
  /** Visible text length, as a proxy for "the content is actually in the HTML". */
  bodyTextLength: number;
  internalLinks: string[];
  /** True when the HTML contains a noscript-visible primary action. */
  hasNoScriptPrimaryAction: boolean;
  /**
   * Completable conversion actions in the served HTML: forms with an action that
   * are not disabled, plus mailto:/tel:/https://wa.me/ links. Navigation links do not count.
   */
  conversionActions: number;
  /** P1-7: placeholder slots (`data-content-slot`) in the served body. */
  placeholderSlots: number;
  /**
   * FD-06: typed missing-value markers — `data-content-pending` (a value an item
   * needs) and `data-content-unavailable` (a business fact stated as unavailable).
   * Counted by attribute, never by class, so experience no-JS notices are not
   * mistaken for missing content.
   */
  pendingMarkers: number;
  /** P1-7: the page's OWN main content as normalised words — header, navigation and footer removed. */
  mainContentWords: string[];
  /** False when the robots meta says noindex. */
  indexable: boolean;
}

export interface IndexabilityFindings {
  /** Indexable pages whose main content is the same or nearly the same. */
  duplicates: Array<{ routes: [string, string]; similarity: number }>;
  /** Indexable pages that serve placeholder slots or pending markers as page text. */
  placeholders: Array<{ route: string; slots: number; pending: number }>;
}

/** Word 4-shingles; a near-duplicate shares most of them regardless of a changed h1. */
function shingles(words: readonly string[]): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i + 4 <= words.length; i += 1) out.add(words.slice(i, i + 4).join(" "));
  if (words.length > 0 && words.length < 4) out.add(words.join(" "));
  return out;
}

export const DUPLICATE_SIMILARITY = 0.8;

/**
 * P1-7: duplicate and placeholder detection over indexable pages. ONE implementation,
 * read by the generator (over its own rendered HTML) and by the content gate (over
 * served HTML), so the two cannot disagree about what counts.
 */
export function analyseIndexability(pages: readonly ServedHtmlFacts[]): IndexabilityFindings {
  const indexable = pages.filter((p) => p.indexable);
  const duplicates: IndexabilityFindings["duplicates"] = [];
  const sets = indexable.map((p) => ({ route: p.route, set: shingles(p.mainContentWords) }));
  for (let i = 0; i < sets.length; i += 1) {
    for (let j = i + 1; j < sets.length; j += 1) {
      const a = sets[i]!;
      const b = sets[j]!;
      if (a.set.size === 0 || b.set.size === 0) continue;
      let shared = 0;
      for (const s of a.set) if (b.set.has(s)) shared += 1;
      const similarity = shared / (a.set.size + b.set.size - shared);
      if (similarity >= DUPLICATE_SIMILARITY) duplicates.push({ routes: [a.route, b.route], similarity: Math.round(similarity * 100) / 100 });
    }
  }
  const placeholders = indexable
    .filter((p) => p.placeholderSlots + p.pendingMarkers > 0)
    .map((p) => ({ route: p.route, slots: p.placeholderSlots, pending: p.pendingMarkers }));
  return { duplicates, placeholders };
}

/** Per-route bundle facts from a real build manifest. */
export interface RouteBundleFacts {
  route: string;
  /** First-load JS in KB. MEASURED — never the registry estimate. */
  firstLoadJsKb: number;
}

export interface TechnicalFacts {
  buildPasses: boolean;
  typecheckPasses: boolean;
  lintPasses: boolean;
  noBlockingConsoleErrors: boolean;
  primaryRoutesWork: boolean;
  loadingErrorNotFoundStatesExist: boolean;
  noExposedSecrets: boolean;
  /**
   * Every DELIVERED interactive experience enhanced, completed with the owner's
   * example by keyboard, reset, and kept its no-JS fallback — measured in a real
   * browser. Absent when the site delivers none; a site that delivers one but was
   * not measured gets no technical facts at all (unknown, never a pass).
   */
  experiencesWork?: boolean;
  /** P1-4: the delivered compact navigation operated in both engines and layers. Absent when none was delivered. */
  navigationWorks?: boolean;
  /** Delivery G4: the static layer served 200, without page errors, axe violations or 320px overflow. */
  staticLayerWorks?: boolean;
  warnings: string[];
}

export interface WebVitalsFacts {
  lcpSeconds: number;
  inpMs: number;
  cls: number;
  /** `field` is p75 real-user data; `lab` is a throttled synthetic run. */
  measurement: "field" | "lab";
}

/**
 * The complete evidence bundle. Every field is tagged, so a gate can state which
 * kinds it accepts and the type system enforces it.
 */
export interface BuildEvidenceBundle {
  technical: Evidence<TechnicalFacts>;
  /** Routes the build actually produced. */
  routeInventory: Evidence<string[]>;
  /** Served HTML per route, fetched WITHOUT executing JavaScript. */
  servedHtml: Evidence<ServedHtmlFacts[]>;
  /** Per-route measured first-load JS. */
  bundles: Evidence<RouteBundleFacts[]>;
  /** Direct RUNTIME dependencies the project declares and installed. */
  dependencies: Evidence<string[]>;
  /** Direct build/audit TOOLCHAIN dependencies (devDependencies) the host installed. */
  toolchain: Evidence<string[]>;
  /** May be PARTIAL: an automated audit measures some criteria and not others. */
  accessibility: Evidence<Partial<AccessibilityObservations>>;
  webVitals: Evidence<WebVitalsFacts>;
  /** Measured responsive sweep (responsive_matrix.md TIER 1 + degraded path). */
  responsive: Evidence<ResponsiveSweepFacts>;
}

export interface ResponsiveSweepFacts {
  profiles: Array<{
    name: string;
    engine: "chromium" | "webkit";
    mandatory: boolean;
    available: boolean;
    reason: string | null;
    pagesChecked: number;
    /** Each measured failure, named with its RF-xxx pattern. */
    failures: string[];
  }>;
}

// ------------------------------------------------------------------ parsers

function attr(tag: string, name: string): string | null {
  const match = new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i").exec(tag);
  return match?.[1] ?? null;
}

/**
 * Parse a page's served HTML. Deliberately regex-based rather than pulling in a
 * DOM parser: the facts needed are shallow, and §17 forbids a dependency a short
 * local implementation can cover.
 */
export function parseServedHtml(route: string, html: string): ServedHtmlFacts {
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];
  const linkTags = html.match(/<link\b[^>]*>/gi) ?? [];

  let metaDescription: string | null = null;
  let robots: string | null = null;
  const ogTags: Record<string, string> = {};
  const twitterTags: Record<string, string> = {};
  for (const tag of metaTags) {
    const name = attr(tag, "name")?.toLowerCase();
    const property = attr(tag, "property")?.toLowerCase();
    const contentValue = attr(tag, "content");
    if (contentValue === null) continue;
    if (name === "description") metaDescription = contentValue;
    if (name === "robots") robots = contentValue;
    if (property?.startsWith("og:")) ogTags[property] = contentValue;
    if (name?.startsWith("twitter:")) twitterTags[name] = contentValue;
  }

  let canonical: string | null = null;
  for (const tag of linkTags) {
    if (attr(tag, "rel")?.toLowerCase() === "canonical") canonical = attr(tag, "href");
  }

  const headingOrder: number[] = [];
  for (const match of html.matchAll(/<h([1-6])\b/gi)) {
    headingOrder.push(Number(match[1]));
  }
  let headingSkips = false;
  for (let i = 1; i < headingOrder.length; i += 1) {
    const previous = headingOrder[i - 1] as number;
    const current = headingOrder[i] as number;
    if (current > previous + 1) headingSkips = true;
  }

  const structuredDataTypes: string[] = [];
  for (const block of html.matchAll(
    /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    const raw = block[1];
    if (!raw) continue;
    try {
      const parsed: unknown = JSON.parse(raw);
      const collect = (node: unknown): void => {
        if (Array.isArray(node)) {
          for (const item of node) collect(item);
          return;
        }
        if (node && typeof node === "object") {
          const type = (node as Record<string, unknown>)["@type"];
          if (typeof type === "string") structuredDataTypes.push(type);
          if (Array.isArray(type)) {
            for (const t of type) if (typeof t === "string") structuredDataTypes.push(t);
          }
        }
      };
      collect(parsed);
    } catch {
      // Malformed JSON-LD is itself a finding, recorded as an absent type rather
      // than a crash. The SEO gate sees the missing type.
      structuredDataTypes.push("<invalid-json-ld>");
    }
  }

  const imgTags = html.match(/<img\b[^>]*>/gi) ?? [];
  const imagesWithoutAlt = imgTags.filter((tag) => attr(tag, "alt") === null).length;
  const imagesWithoutDimensions = imgTags.filter(
    (tag) => (attr(tag, "width") === null || attr(tag, "height") === null) && !/aspect-ratio/i.test(tag),
  ).length;
  const imagesLazy = imgTags.filter((tag) => attr(tag, "loading") === "lazy").length;
  const imagesHighPriority = imgTags.filter((tag) => attr(tag, "fetchpriority") === "high").length;

  const internalLinks: string[] = [];
  for (const match of html.matchAll(/<a\b[^>]*href\s*=\s*["'](\/[^"'#?]*)["']/gi)) {
    const href = match[1];
    if (href) internalLinks.push(href);
  }

  // Visible text: strip script/style, then tags. A near-empty body with a large
  // script payload is the client-only-content failure §I forbids.
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
  const bodyMatch = /<body[^>]*>([\s\S]*)<\/body>/i.exec(withoutScripts);
  const bodyHtml = bodyMatch?.[1] ?? withoutScripts;
  const bodyText = bodyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  const noscriptBlocks = html.match(/<noscript[\s\S]*?<\/noscript>/gi) ?? [];
  const hasNoScriptPrimaryAction =
    /<(a|button|form)\b/i.test(bodyHtml) || noscriptBlocks.some((b) => /<(a|button|form)\b/i.test(b));

  // Actions a visitor can COMPLETE without JavaScript: a form that has an action
  // and is not wholly disabled, or a mailto:/tel: link. A navigation link is not
  // a conversion action (customer dry run 2026-09-14: every page had links, no
  // page had a completable action).
  const completableForms = (bodyHtml.match(/<form\b[^>]*>[\s\S]*?<\/form>/gi) ?? []).filter((form) => {
    const open = /<form\b[^>]*>/i.exec(form)?.[0] ?? "";
    return attr(open, "action") !== null && !/<fieldset\b[^>]*\bdisabled\b/i.test(form);
  }).length;
  // A WhatsApp click-to-chat link completes a contact the same way (P1-2).
  const contactLinks = (bodyHtml.match(/<a\b[^>]*href\s*=\s*["']((mailto|tel):|https:\/\/wa\.me\/)[^"']+["']/gi) ?? []).length;
  const conversionActions = completableForms + contactLinks;

  // P1-7: the page's own content — site chrome (header, navigation, footer) is the
  // same on every page and would make every pair look alike.
  const mainHtml = bodyHtml
    .replace(/<header\b[\s\S]*?<\/header>/gi, " ")
    .replace(/<nav\b[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer\b[\s\S]*?<\/footer>/gi, " ");
  const mainContentWords = mainHtml
    .replace(/<[^>]+>/g, " ")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length > 0);
  const placeholderSlots = (bodyHtml.match(/\bdata-content-slot\s*=/gi) ?? []).length;
  const pendingMarkers = (bodyHtml.match(/\bdata-content-(pending|unavailable)\s*=/gi) ?? []).length;

  return {
    route,
    title: titleMatch?.[1]?.trim() ?? null,
    metaDescription,
    canonical,
    robots,
    h1Count: headingOrder.filter((level) => level === 1).length,
    headingOrder,
    headingSkips,
    ogTags,
    twitterTags,
    structuredDataTypes: [...new Set(structuredDataTypes)],
    imageCount: imgTags.length,
    imagesWithoutAlt,
    imagesWithoutDimensions,
    imagesLazy,
    imagesHighPriority,
    bodyTextLength: bodyText.length,
    internalLinks: [...new Set(internalLinks)],
    hasNoScriptPrimaryAction,
    conversionActions,
    placeholderSlots,
    pendingMarkers,
    mainContentWords,
    indexable: robots === null || !/noindex/i.test(robots),
  };
}

/**
 * Parse a build manifest into measured per-route first-load JS.
 *
 * Accepts a normalised shape `{ routes: { "/path": { firstLoadJsKb: number } } }`.
 * A framework-specific adapter (Next.js `.next/app-build-manifest.json`, a
 * bundler's stats file) normalises into this before calling — keeping the
 * framework-specific parsing at the edge rather than in the engine.
 */
export function parseBuildManifest(manifest: unknown): RouteBundleFacts[] {
  if (!manifest || typeof manifest !== "object") return [];
  const routes = (manifest as Record<string, unknown>)["routes"];
  if (!routes || typeof routes !== "object") return [];
  const out: RouteBundleFacts[] = [];
  for (const [route, info] of Object.entries(routes as Record<string, unknown>)) {
    if (!info || typeof info !== "object") continue;
    const kb = (info as Record<string, unknown>)["firstLoadJsKb"];
    if (typeof kb === "number" && Number.isFinite(kb)) {
      out.push({ route, firstLoadJsKb: kb });
    }
  }
  return out;
}

// ------------------------------------------------------------------ collectors

/**
 * What a real project supplies. Each field is optional: a collector that can only
 * provide some artifacts produces `unavailable` for the rest, which is honest
 * rather than partial-credit.
 */
export interface RawArtifacts {
  technical?: TechnicalFacts;
  /** route -> served HTML string, fetched with JS disabled. */
  servedHtml?: Record<string, string>;
  buildManifest?: unknown;
  dependencies?: string[];
  /** devDependencies installed by a host for building and auditing. */
  toolchain?: string[];
  accessibility?: Partial<AccessibilityObservations>;
  webVitals?: WebVitalsFacts;
  responsive?: ResponsiveSweepFacts;
  observedAt?: string;
  /** Routes the PRODUCTION BUILD emitted, read from its own manifest. */
  builtRoutes?: string[];
  /**
   * What actually produced each measured field. A producer states its method;
   * the collector never assumes one. Absent means the collector's default text.
   */
  sources?: {
    technical?: string;
    servedHtml?: string;
    bundles?: string;
    accessibility?: string;
    webVitals?: string;
    routeInventory?: string;
    responsive?: string;
  };
  /**
   * What the technical facts actually cover. `static_layer_only` means the base
   * HTML/CSS layer was built and the emitted source was syntax-checked, but no
   * production bundle was produced — so the facts are DERIVED, not measured.
   */
  technicalScope?: "full_production_build" | "static_layer_only";
}

/**
 * The producer. Turns whatever real artifacts exist into a tagged bundle.
 *
 * Note the asymmetry that keeps it honest: values present in `artifacts` become
 * `measured`; things computable FROM them become `derived`; everything else is
 * `unavailable` with a note naming what would produce it. Nothing is estimated
 * here, because an estimate is not evidence and this module produces evidence.
 */
export function collectBuildEvidence(artifacts: RawArtifacts = {}): BuildEvidenceBundle {
  const at = artifacts.observedAt;
  const src = artifacts.sources ?? {};

  const servedHtml: Evidence<ServedHtmlFacts[]> = artifacts.servedHtml
    ? measured(
        Object.entries(artifacts.servedHtml).map(([route, html]) => parseServedHtml(route, html)),
        src.servedHtml ??
          `parsed ${Object.keys(artifacts.servedHtml).length} served HTML document(s) with JavaScript not executed`,
        at,
      )
    : unavailable(
        "no served HTML supplied; produced by fetching each route from a preview deployment with JavaScript disabled",
      );

  const routeInventory: Evidence<string[]> = artifacts.builtRoutes
    ? measured(artifacts.builtRoutes, src.routeInventory ?? "read from the production build's route manifest", at)
    : artifacts.servedHtml
      ? derived(
          Object.keys(artifacts.servedHtml),
          "derived from the routes whose served HTML was fetched",
        )
      : unavailable("no route inventory; produced by the build output or the fetched route list");

  const bundles: Evidence<RouteBundleFacts[]> =
    artifacts.buildManifest !== undefined
      ? measured(
          parseBuildManifest(artifacts.buildManifest),
          src.bundles ?? "parsed from the production build manifest",
          at,
        )
      : unavailable(
          "no build manifest; produced by a production build. The responsive registry's weightKb is an ESTIMATE and may not stand in for it",
        );

  return {
    technical: artifacts.technical
      ? artifacts.technicalScope === "static_layer_only"
        ? derived(
            artifacts.technical,
            "DERIVED from the static base-layer build and a TSX syntax check; the full production build (`next build`) was NOT executed",
            )
        : measured(artifacts.technical, src.technical ?? "reported by the build, typecheck, lint and route checks", at)
      : unavailable("no build run; produced by `npm run build`, typecheck, lint and a route smoke test"),
    routeInventory,
    servedHtml,
    bundles,
    dependencies: artifacts.dependencies
      ? measured(artifacts.dependencies, "read from the installed dependency manifest", at)
      : unavailable("no dependency list; produced by reading the project manifest and lockfile"),
    toolchain: artifacts.toolchain
      ? measured(artifacts.toolchain, "read from the host's devDependencies and verified installed", at)
      : unavailable("no host toolchain; only a generated host project installs build and audit tooling"),
    accessibility: artifacts.accessibility
      ? measured(
          artifacts.accessibility,
          src.accessibility ??
            "observed on the built pages; fields absent from this object were NOT measured and are unknown",
          at,
        )
      : unavailable(
          "no accessibility observations; produced by running the §G.1 checks against rendered pages",
        ),
    responsive: artifacts.responsive
      ? measured(
          artifacts.responsive,
          src.responsive ?? "responsive sweep over the served pages at device profiles",
          at,
        )
      : unavailable("no responsive sweep; produced by loading every page at the responsive_matrix.md TIER 1 profiles in both engines"),
    webVitals: artifacts.webVitals
      ? measured(
          artifacts.webVitals,
          src.webVitals ?? `${artifacts.webVitals.measurement} Core Web Vitals measurement`,
          at,
        )
      : unavailable(
          "no Core Web Vitals measurement; produced by field p75 data or a throttled lab run",
        ),
  };
}

/** A bundle where nothing is known. The honest default before a build exists. */
export function noBuildEvidence(): BuildEvidenceBundle {
  return collectBuildEvidence({});
}

// ------------------------------------------------------------------ cross-checks

export interface RouteInventoryComparison {
  /** Pages the decision output planned that the build did not produce. */
  missingFromBuild: string[];
  /** Routes the build produced that no page spec planned. */
  unplannedInBuild: string[];
  matched: string[];
  /** False when the comparison could not run for lack of evidence. */
  compared: boolean;
}

/**
 * Compare the planned page model against the built route inventory.
 *
 * This catches the silent-loss class one layer later than the pipeline can: a
 * page can survive every decision phase and still never be built.
 */
export function compareRouteInventory(
  pages: readonly PageSpec[],
  bundle: BuildEvidenceBundle,
): RouteInventoryComparison {
  const built = bundle.routeInventory.value;
  if (!built || bundle.routeInventory.kind === "unavailable") {
    return { missingFromBuild: [], unplannedInBuild: [], matched: [], compared: false };
  }
  const planned = new Set(pages.map((p) => p.route));
  const builtSet = new Set(built);
  return {
    missingFromBuild: [...planned].filter((r) => !builtSet.has(r)),
    unplannedInBuild: [...builtSet].filter((r) => !planned.has(r)),
    matched: [...planned].filter((r) => builtSet.has(r)),
    compared: true,
  };
}

/**
 * Turn measured served-HTML facts into the SEO observation shape the quality
 * engine already consumes. Uses the EXISTING contract rather than a parallel one.
 */
export function seoObservationsFromHtml(
  facts: ServedHtmlFacts,
  allFacts: readonly ServedHtmlFacts[],
): {
  serverRenderedPrimaryContent: boolean;
  uniqueTitleAndDescription: boolean;
  singleH1: boolean;
  headingHierarchyValid: boolean;
  canonicalCorrect: boolean;
  openGraphPresent: boolean;
  internalInboundLinks: number;
  fabricatedSchemaPresent: boolean;
  imagesWithoutAlt: number;
  imagesWithoutDimensions: number;
} {
  const duplicateTitle = allFacts.some(
    (other) => other.route !== facts.route && other.title !== null && other.title === facts.title,
  );
  // The observation names title AND description; a missing description is not
  // unique (customer dry run 2026-09-14: 8 pages without one scored as unique).
  const duplicateDescription = allFacts.some(
    (other) =>
      other.route !== facts.route && other.metaDescription !== null && other.metaDescription === facts.metaDescription,
  );
  const inbound = allFacts.filter(
    (other) => other.route !== facts.route && other.internalLinks.includes(facts.route),
  ).length;
  // FD-12: "/" is the entry point, reachable by definition; a single-page site has no
  // other page to link from it. Every other route still needs a real inbound link.
  const inboundOrEntry = facts.route === "/" ? Math.max(inbound, 1) : inbound;

  return {
    // A body with almost no text is the client-only-content failure.
    serverRenderedPrimaryContent: facts.bodyTextLength >= 200,
    uniqueTitleAndDescription:
      facts.title !== null && !duplicateTitle && facts.metaDescription !== null && !duplicateDescription,
    singleH1: facts.h1Count === 1,
    headingHierarchyValid: !facts.headingSkips,
    canonicalCorrect: facts.canonical !== null && /^https?:\/\//.test(facts.canonical),
    openGraphPresent: Object.keys(facts.ogTags).length > 0,
    internalInboundLinks: inboundOrEntry,
    fabricatedSchemaPresent: facts.structuredDataTypes.includes("<invalid-json-ld>"),
    imagesWithoutAlt: facts.imagesWithoutAlt,
    imagesWithoutDimensions: facts.imagesWithoutDimensions,
  };
}
