/**
 * MAPPING — extracted blog → the website's blog page.
 *
 * Every extracted element has ONE destination on the page, recorded in a ledger
 * so "was it mapped?" is answered by a row, not by reading the HTML. Mapping
 * moves content; it does not write any. A value the source did not supply is
 * `not_supplied` — the page renders without it rather than with a stand-in
 * (README rule 1; src/content/confidence.ts NEVER_FABRICATE).
 */
import { type Blog, type BlogAsset, type Block, type Inline, plainText, walkBlocks } from "./manifest.js";

export interface BlogSiteContext {
  /** Route the blog lives under. Default `/blog`. */
  routeBase?: string;
  /** Canonical origin, e.g. `https://example.com`. Never guessed: absent → no canonical, no absolute URLs. */
  origin?: string | null;
  siteName?: string | null;
  lang?: string;
  /** URL prefix the page's assets are served from. Default `<route>/assets`. */
  assetBase?: string;
}

export interface MappingRow {
  element: string;
  destination: string;
  count: number;
  status: "mapped" | "not_supplied" | "withheld";
  note?: string;
}

export interface BlogPage {
  blogId: string;
  slug: string;
  route: string;
  lang: string;
  title: Inline[] | null;
  subtitle: Inline[] | null;
  byline: { author: string | null; date: { display: string; iso: string | null } | null };
  cover: { asset: BlogAsset; alt: string | null; decorative: boolean; caption?: Inline[] } | null;
  /** Body blocks in reading order, heading levels already fitted under the page's single H1. */
  body: Block[];
  headingShift: number;
  /** Block ids whose section the author headed as a call to action. */
  ctaBlockIds: Set<string>;
  assets: Map<string, BlogAsset>;
  assetUrl: (asset: BlogAsset) => string;
  seo: {
    title: string | null;
    description: string | null;
    canonical: string | null;
    keywords: string[];
    ogImage: string | null;
    jsonLd: Record<string, unknown> | null;
    /** Artifacts that could not be produced from supplied facts, and what each needs. */
    unresolved: Array<{ artifact: string; needs: string }>;
  };
  ledger: MappingRow[];
  adaptations: string[];
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

function meta(blog: Blog, key: string): string | null {
  const entry = blog.metadata[key];
  if (!entry) return null;
  return Array.isArray(entry.value) ? entry.value.join(", ") : entry.value;
}

/** File name an asset is published under: its stored, content-addressed name. */
export function publishedAssetName(asset: BlogAsset): string {
  return asset.path.split("/").pop() ?? asset.id;
}

export function mapBlogToPage(blog: Blog, site: BlogSiteContext = {}): BlogPage {
  const routeBase = `/${(site.routeBase ?? "/blog").replace(/^\/+|\/+$/g, "")}`;
  const route = `${routeBase}/${blog.slug}`;
  const origin = site.origin ? site.origin.replace(/\/+$/, "") : null;
  const assetBase = (site.assetBase ?? `${route}/assets`).replace(/\/+$/, "");
  const assets = new Map(blog.assets.map((a) => [a.id, a]));
  const assetUrl = (asset: BlogAsset) => `${assetBase}/${publishedAssetName(asset)}`;
  const adaptations: string[] = [];

  // One H1 per page (stack_doctrine.md SEO ARTIFACT SET): the title. Body headings
  // that were level 1 in the source move down one level — a formatting adaptation,
  // not an editorial one, and it is recorded.
  const levels = blog.blocks.filter((b) => b.type === "heading").map((b) => (b.type === "heading" ? b.level : 6));
  const headingShift = levels.length > 0 && Math.min(...levels) === 1 ? 1 : 0;
  const body: Block[] = structuredClone(blog.blocks);
  if (headingShift > 0) {
    for (const block of body) if (block.type === "heading") block.level = Math.min(6, block.level + headingShift);
    adaptations.push("Body headings moved down one level so the blog title is the page's only level-1 heading.");
  }

  const ctaBlockIds = new Set<string>();
  for (const section of blog.sections) if (section.role === "cta") for (const id of section.blockIds) ctaBlockIds.add(id);
  for (const block of body) if (block.type === "paragraph" && block.role === "cta") ctaBlockIds.add(block.id);

  const coverAsset = blog.cover ? assets.get(blog.cover.assetId) ?? null : null;
  const cover = blog.cover && coverAsset ? { asset: coverAsset, alt: blog.cover.alt, decorative: blog.cover.decorative === true, caption: blog.cover.caption } : null;

  const author = meta(blog, "author");
  const dateRaw = meta(blog, "date");
  const date = dateRaw ? { display: dateRaw, iso: ISO_DATE.test(dateRaw) ? dateRaw : null } : null;

  // ---- SEO: only from supplied values (the generator "does NOT build a second SEO system").
  const unresolved: BlogPage["seo"]["unresolved"] = [];
  const titleText = blog.title?.text ?? null;
  const seoTitle = meta(blog, "seoTitle") ?? titleText;
  const description = meta(blog, "description");
  if (!description) unresolved.push({ artifact: "meta description", needs: "a description supplied with the blog (front matter, document metadata or the instruction file)" });
  const suppliedCanonical = meta(blog, "canonical");
  const canonical = suppliedCanonical ?? (origin ? `${origin}${route}` : null);
  if (!canonical) unresolved.push({ artifact: "canonical URL", needs: "the site's canonical origin (site_profile.md) or a canonical supplied with the blog" });
  const ogImage = cover && origin && cover.asset.webReady ? `${origin}${assetUrl(cover.asset)}` : null;
  if (cover && !origin) unresolved.push({ artifact: "og:image", needs: "the site's canonical origin — a social image must be an absolute URL" });
  let jsonLd: Record<string, unknown> | null = null;
  if (titleText && author && date?.iso) {
    jsonLd = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: titleText,
      author: { "@type": "Person", name: author },
      datePublished: date.iso,
      ...(description ? { description } : {}),
      ...(ogImage ? { image: ogImage } : {}),
      ...(canonical ? { mainEntityOfPage: canonical } : {}),
    };
  } else {
    const needs = [!titleText && "headline", !author && "author", !date && "publication date", date && !date.iso && "publication date in ISO form (YYYY-MM-DD)"].filter(Boolean);
    unresolved.push({ artifact: "BlogPosting structured data", needs: `${needs.join(", ")} supplied with the blog` });
  }
  const keywordEntry = blog.metadata["keywords"]?.value;
  const keywords = Array.isArray(keywordEntry) ? keywordEntry : keywordEntry ? keywordEntry.split(",").map((k) => k.trim()).filter(Boolean) : [];

  // ---- the ledger: one row per element kind in the mapping table of blog_publishing.md
  const all = [...walkBlocks(body)];
  const count = (pred: (b: Block) => boolean) => all.filter(pred).length;
  const kindOf = (b: Block) => (b.type === "media" ? assets.get(b.assetId)?.kind : undefined);
  const subjectOf = (b: Block) => (b.type === "media" ? assets.get(b.assetId)?.subject : undefined);
  const sectionCount = (role: string) => blog.sections.filter((s) => s.role === role).length;
  const row = (element: string, destination: string, n: number, withheld = 0, note?: string): MappingRow => ({
    element,
    destination,
    count: n,
    status: n > 0 ? "mapped" : withheld > 0 ? "withheld" : "not_supplied",
    ...(note ? { note } : {}),
  });
  const unplaced = blog.placements.filter((p) => p.status === "unplaced").length;
  const ledger: MappingRow[] = [
    row("Blog title", "page <h1> in the article header", blog.title ? 1 : 0),
    row("Subtitle", "subtitle line under the title", blog.subtitle ? 1 : 0),
    row("Author and date", "byline under the title", (author ? 1 : 0) + (date ? 1 : 0)),
    row("Cover image", "hero figure under the article header", cover ? 1 : 0),
    row("Introduction", "opening of the article body", sectionCount("introduction")),
    row("Headings", "section headings (h2–h6)", count((b) => b.type === "heading")),
    row("Paragraphs", "article body", count((b) => b.type === "paragraph")),
    row("Lists", "ordered / unordered lists", count((b) => b.type === "list")),
    row("Tables", "responsive table (scroll region)", count((b) => b.type === "table")),
    row("Blockquotes", "blockquote", count((b) => b.type === "blockquote")),
    row("Code blocks", "preformatted code", count((b) => b.type === "code")),
    row("Images", "figure at the source position", count((b) => kindOf(b) === "image" && !subjectOf(b)), unplaced, unplaced ? `${unplaced} supplied file(s) have no confirmed position` : undefined),
    row("GIFs and animations", "animated figure (animation preserved, hide control)", count((b) => kindOf(b) === "animation")),
    row("Videos", "native video player", count((b) => kindOf(b) === "video")),
    row("Video embeds", "click-to-load embed with a link", count((b) => b.type === "embed")),
    row("Audio", "native audio player", count((b) => kindOf(b) === "audio")),
    row("Charts (image)", "figure at the source position", count((b) => kindOf(b) === "image" && subjectOf(b) === "chart")),
    row("Charts (native data)", "data table with the chart's title", count((b) => b.type === "chart")),
    row("Infographics and diagrams", "full-width figure", count((b) => kindOf(b) === "image" && (subjectOf(b) === "infographic" || subjectOf(b) === "diagram"))),
    row("External media links", "link (remote files are not copied)", count((b) => b.type === "external_media")),
    row("Footnotes", "footnotes list with back-links", count((b) => b.type === "footnotes")),
    row("Conclusion", "closing section", sectionCount("conclusion")),
    row("References", "references section", sectionCount("references")),
    row("Call to action", "action link in the closing section", ctaBlockIds.size),
    row("SEO metadata", "document head", [seoTitle, description, canonical, keywords.length > 0 ? "k" : null].filter(Boolean).length),
    {
      element: "Missing media",
      destination: "not rendered — reported",
      count: count((b) => b.type === "missing_media"),
      status: count((b) => b.type === "missing_media") > 0 ? "withheld" : "not_supplied",
    },
  ];

  return {
    blogId: blog.id,
    slug: blog.slug,
    route,
    lang: meta(blog, "lang") ?? site.lang ?? "en",
    title: blog.title?.inlines ?? null,
    subtitle: blog.subtitle?.inlines ?? null,
    byline: { author, date },
    cover,
    body,
    headingShift,
    ctaBlockIds,
    assets,
    assetUrl,
    seo: { title: seoTitle, description, canonical, keywords, ogImage, jsonLd, unresolved },
    ledger,
    adaptations,
  };
}

/** Visible text of the mapped page's content, for the completeness comparison. */
export function pageText(page: BlogPage): string {
  const parts: string[] = [plainText(page.title ?? []), plainText(page.subtitle ?? [])];
  for (const block of walkBlocks(page.body)) parts.push(blockOwnText(block));
  return parts.join(" ");
}

export function blockOwnText(block: Block): string {
  switch (block.type) {
    case "heading":
    case "paragraph":
      return plainText(block.inlines);
    case "list":
      return block.items.map((i) => plainText(i.inlines)).join(" ");
    case "table":
      return [plainText(block.caption), ...block.rows.flatMap((r) => r.map((c) => plainText(c.inlines)))].join(" ");
    case "code":
      return block.text;
    case "footnotes":
      return block.items.map((i) => plainText(i.inlines)).join(" ");
    case "media":
    case "embed":
    case "external_media":
      return plainText(block.caption);
    case "chart":
      return [block.title ?? "", ...block.categories, ...block.series.flatMap((s) => [s.name ?? "", ...s.values.map((v) => v ?? "")]), plainText(block.caption)].join(" ");
    default:
      return "";
  }
}
