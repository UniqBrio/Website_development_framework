/**
 * PREVIEW AND PUBLISH — the last two stages of the blog branch.
 *
 * PREVIEW always runs: it renders the blog in the site's layout with everything
 * unresolved marked for the reviewer, and it is `noindex`.
 *
 * PUBLISH is refused unless an APPROVAL RECORD exists that (1) names an approver,
 * (2) carries the digest of exactly the blog being published, so approving one
 * version cannot publish another, and (3) acknowledges every warning code by
 * name. Nothing here deploys: the output is files for the site's existing
 * release procedure (website_flow.md Phases 5–6).
 */
import { createHash } from "node:crypto";
import type { Blog } from "./manifest.js";
import { plainText } from "./manifest.js";
import { type BlogPage, publishedAssetName } from "./map.js";
import { type Child, escapeHtml, h, renderArticle, toHtml, toJsx } from "./render.js";
import type { ValidationReport } from "./validate.js";
import { blogCss } from "./css.js";
import { BLOG_GENERATOR } from "./site.js";

/** Text placed inside a generated source comment: it must not be able to close the comment. */
function commentSafe(value: string): string {
  return value.replace(/\*\//g, "* /").replace(/[\r\n\u2028\u2029]+/g, " ").slice(0, 300);
}

/** Digest of everything that determines the published page. */
export function blogDigest(blog: Blog): string {
  const { issues: _issues, counts: _counts, ...content } = blog;
  return createHash("sha256").update(JSON.stringify(content)).digest("hex");
}

export interface ApprovalRecord {
  blogId: string;
  blogDigest: string;
  approvedBy: string;
  approvedAt: string;
  acceptedWarnings: string[];
  readinessAtApproval: string;
  /**
   * Set only when the owner approved REPLACING a post already published on the
   * site: the digest of the version being replaced. Publishing with `replace`
   * requires it to equal the digest in the site's registry at publish time.
   */
  replacesDigest?: string | null;
}

/** Why this approval does not authorise publishing this blog; empty = it does. */
export function approvalProblems(blog: Blog, report: ValidationReport, approval: ApprovalRecord | null | undefined): string[] {
  if (!approval) return ["no approval record: the owner has not approved this preview"];
  const problems: string[] = [];
  if (!approval.approvedBy.trim()) problems.push("the approval names no approver");
  if (approval.blogId !== blog.id) problems.push(`the approval is for ${approval.blogId}, not ${blog.id}`);
  if (approval.blogDigest !== blogDigest(blog)) problems.push("the blog changed after it was approved; preview and approve the current version");
  if (report.readiness.state === "blocked") problems.push(`the blog is not publishable: ${report.readiness.blockers.length} blocker(s) remain`);
  const unaccepted = report.readiness.warningsToAccept.filter((code) => !approval.acceptedWarnings.includes(code));
  if (unaccepted.length > 0) problems.push(`warning(s) not acknowledged in the approval: ${unaccepted.join(", ")}`);
  return problems;
}

// ------------------------------------------------------------------ site chrome

export interface SiteChrome {
  header: string;
  footer: string;
}

/** The site's own header and footer, lifted from one of its rendered static pages. */
export function siteChromeFromStatic(html: string): SiteChrome {
  const header = /<header class="c-site-header">[\s\S]*?<\/header>/.exec(html)?.[0] ?? "";
  const footer = /<footer class="c-site-footer">[\s\S]*?<\/footer>/.exec(html)?.[0] ?? "";
  return { header: header.replace(/ aria-current="page"/g, ""), footer };
}

/** The same, as JSX, lifted from a generated Next.js page. */
export function siteChromeFromNext(tsx: string): SiteChrome & { usesLink: boolean } {
  const header = /<header className="c-site-header">[\s\S]*?<\/header>/.exec(tsx)?.[0] ?? "";
  const footer = /<footer className="c-site-footer">[\s\S]*?<\/footer>/.exec(tsx)?.[0] ?? "";
  return { header: header.replace(/ aria-current="page"/g, ""), footer, usesLink: /<Link\b/.test(header + footer) };
}

// ------------------------------------------------------------------ documents

function head(page: BlogPage, cssHrefs: string[], robots: string): string {
  const tags = ['<meta charset="utf-8">', '<meta name="viewport" content="width=device-width, initial-scale=1">', `<meta name="generator" content="${BLOG_GENERATOR}">`];
  const seo = page.seo;
  if (seo.title) tags.push(`<title>${escapeHtml(seo.title)}</title>`);
  if (seo.description) tags.push(`<meta name="description" content="${escapeHtml(seo.description)}">`);
  if (seo.canonical) tags.push(`<link rel="canonical" href="${escapeHtml(seo.canonical)}">`);
  tags.push(`<meta name="robots" content="${robots}">`);
  if (seo.title) tags.push(`<meta property="og:title" content="${escapeHtml(seo.title)}">`);
  if (seo.description) tags.push(`<meta property="og:description" content="${escapeHtml(seo.description)}">`);
  tags.push('<meta property="og:type" content="article">');
  if (seo.canonical) tags.push(`<meta property="og:url" content="${escapeHtml(seo.canonical)}">`);
  if (seo.ogImage) tags.push(`<meta property="og:image" content="${escapeHtml(seo.ogImage)}">`, '<meta name="twitter:card" content="summary_large_image">');
  if (seo.jsonLd) tags.push(`<script type="application/ld+json">${JSON.stringify(seo.jsonLd).replace(/</g, "\\u003c")}</script>`);
  for (const href of cssHrefs) tags.push(`<link rel="stylesheet" href="${escapeHtml(href)}">`);
  return tags.join("\n");
}

export function renderBlogDocument(page: BlogPage, options: { mode: "preview" | "publish"; cssHrefs: string[]; chrome?: SiteChrome; reviewPanel?: string }): string {
  const article = toHtml(renderArticle(page, { mode: options.mode }));
  return `<!doctype html>
<html lang="${escapeHtml(page.lang)}">
<head>
${head(page, options.cssHrefs, options.mode === "preview" ? "noindex,nofollow" : "index,follow")}
</head>
<body>
<a class="c-skip" href="#main">Skip to content</a>
<main id="main">
${options.chrome?.header ?? ""}
${options.reviewPanel ?? ""}
${article}
${options.chrome?.footer ?? ""}
</main>
</body>
</html>
`;
}

const STATE_LABEL = { ready: "Ready to publish", ready_with_warnings: "Ready once the warnings are acknowledged", blocked: "Not publishable yet" } as const;

/** The reviewer's panel: readiness, what to resolve, what was not shown. Preview only. */
export function renderReviewPanel(blog: Blog, page: BlogPage, report: ValidationReport): string {
  const list = (items: Child[]) => (items.length > 0 ? h("ul", {}, items) : null);
  const unplaced = blog.placements.filter((p) => p.status === "unplaced").flatMap((p) => {
    const asset = page.assets.get(p.assetId);
    if (!asset) return [];
    const thumb = (asset.kind === "image" || asset.kind === "animation") && asset.webReady ? h("img", { src: page.assetUrl(asset), alt: "", width: asset.width ?? undefined, height: asset.height ?? undefined, loading: "lazy" }) : null;
    return [h("li", {}, h("strong", {}, asset.filename), ` — ${p.note ?? "no position known"}`, thumb)];
  });
  const panel = h(
    "aside",
    { class: "c-blog-review", "aria-label": "Preview review", "data-blog-review": "panel" },
    h("h2", {}, `Preview — ${STATE_LABEL[report.readiness.state]}`),
    h("p", {}, "This panel and every marked note below exist only in the preview. Nothing is published until the owner approves this preview."),
    report.readiness.blockers.length > 0 ? h("h3", {}, "Must be resolved") : null,
    list(report.readiness.blockers.map((b) => h("li", {}, b))),
    report.readiness.warningsToAccept.length > 0 ? h("h3", {}, "Warnings to acknowledge") : null,
    list(
      [...report.missingAssets, ...report.unsupportedFormats, ...report.placementUncertainties, ...report.extractionWarnings]
        .filter((i) => i.severity === "warning")
        .map((i) => h("li", {}, h("strong", {}, i.section ? `${i.section}: ` : ""), `${i.message} `, h("em", {}, i.action))),
    ),
    unplaced.length > 0 ? h("h3", {}, "Supplied but not shown") : null,
    list(unplaced),
    report.readiness.notVerified.length > 0 ? h("p", {}, `Not verified in this preview (checked in a browser at Phase 5): ${report.readiness.notVerified.join(", ")}.`) : null,
  );
  return toHtml(panel);
}

// ------------------------------------------------------------------ publication

export interface PublishedPost {
  slug: string;
  route: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  author: string | null;
  date: string | null;
  blogDigest: string;
  /** Kept in the run record and the page source, NOT in the site registry (it may be served publicly). */
  approvedBy?: string;
  approvedAt?: string;
}

export interface Publication {
  /** Text files, path → content. `static/…` is the static site layer, `next/…` the App Router source. */
  files: Record<string, string>;
  /** Binary assets to copy: run-relative source → site-relative destinations. */
  copies: Array<{ from: string; to: string[] }>;
  post: PublishedPost;
  sitemapEntry: string | null;
}

function indexEntries(posts: readonly PublishedPost[]): PublishedPost[] {
  return [...posts].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "") || a.title.localeCompare(b.title));
}

function indexArticle(posts: readonly PublishedPost[]) {
  return h(
    "section",
    { class: "c-blog", "aria-labelledby": "blog-index-title" },
    h("h1", { id: "blog-index-title" }, "Blog"),
    h(
      "ul",
      { class: "c-blog-index" },
      indexEntries(posts).map((p) =>
        h(
          "li",
          {},
          h("h2", {}, h("a", { href: p.route }, p.title)),
          p.subtitle ? h("p", { class: "c-blog-subtitle" }, p.subtitle) : null,
          p.author || p.date ? h("p", { class: "c-blog-byline" }, [p.author, p.date].filter(Boolean).join(" \u00b7 ")) : null,
          p.description ? h("p", {}, p.description) : null,
        ),
      ),
    ),
  );
}

export interface PublishInput {
  blog: Blog;
  page: BlogPage;
  report: ValidationReport;
  approval: ApprovalRecord | null | undefined;
  /** Posts already published on this site (the registry), so the index stays complete. */
  existingPosts?: PublishedPost[];
  routeBase?: string;
  siteName?: string | null;
  origin?: string | null;
  /** Stylesheets of the site, root-absolute, in order. Default: the generated site's `/styles.css`. */
  siteCssHrefs?: string[];
  staticChrome?: SiteChrome;
  nextChrome?: SiteChrome & { usesLink: boolean };
}

/**
 * Build the publication. THROWS when the approval does not cover this blog —
 * there is no flag that publishes an unapproved or blocked blog.
 */
export function publishBlog(input: PublishInput): Publication {
  const { blog, page, report, approval } = input;
  const problems = approvalProblems(blog, report, approval);
  if (problems.length > 0 || !approval) throw new Error(`blog ${blog.id} is not authorised for publishing: ${problems.join("; ")}`);
  if (!blog.title) throw new Error(`blog ${blog.id} has no title`);
  const routeBase = `/${(input.routeBase ?? "/blog").replace(/^\/+|\/+$/g, "")}`;
  const base = routeBase.slice(1);
  const siteCss = input.siteCssHrefs ?? ["/styles.css"];
  const blogCssHref = `${routeBase}/blog.css`;

  const post: PublishedPost = {
    slug: blog.slug,
    route: page.route,
    title: blog.title.text,
    subtitle: blog.subtitle?.text ?? null,
    description: page.seo.description,
    author: page.byline.author,
    date: page.byline.date?.display ?? null,
    blogDigest: approval.blogDigest,
    approvedBy: approval.approvedBy,
    approvedAt: approval.approvedAt,
  };
  const posts = [...(input.existingPosts ?? []).filter((p) => p.slug !== post.slug), post];
  const files: Record<string, string> = {};

  // ---- static layer
  files[`static/${base}/${blog.slug}/index.html`] = renderBlogDocument(page, { mode: "publish", cssHrefs: [...siteCss, blogCssHref], chrome: input.staticChrome });
  files[`static/${base}/blog.css`] = blogCss();
  const indexTitle = input.siteName ? `Blog — ${input.siteName}` : "Blog";
  files[`static/${base}/index.html`] = `<!doctype html>
<html lang="${escapeHtml(page.lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="${BLOG_GENERATOR}">
<title>${escapeHtml(indexTitle)}</title>
${input.origin ? `<link rel="canonical" href="${escapeHtml(`${input.origin.replace(/\/+$/, "")}${routeBase}`)}">\n` : ""}<meta name="robots" content="index,follow">
${siteCss.map((href) => `<link rel="stylesheet" href="${escapeHtml(href)}">`).join("\n")}
<link rel="stylesheet" href="${escapeHtml(blogCssHref)}">
</head>
<body>
<a class="c-skip" href="#main">Skip to content</a>
<main id="main">
${input.staticChrome?.header ?? ""}
${toHtml(indexArticle(posts))}
${input.staticChrome?.footer ?? ""}
</main>
</body>
</html>
`;

  // ---- Next.js App Router: server components, no client boundary
  const depth = base.split("/").length + 1;
  const usesImage = /<img\b[^>]*\bwidth=/.test(toHtml(renderArticle(page, { mode: "publish" })));
  const chrome = input.nextChrome;
  const seo = page.seo;
  const metadata = [
    seo.title ? `  title: ${JSON.stringify(seo.title)},` : "  // title: UNRESOLVED — the source has no title",
    seo.description ? `  description: ${JSON.stringify(seo.description)},` : "  // description: UNRESOLVED — none was supplied with the blog; the framework does not write one",
    seo.canonical ? `  alternates: { canonical: ${JSON.stringify(seo.canonical)} },` : "  // alternates.canonical: UNRESOLVED — no canonical origin supplied",
    "  robots: { index: true, follow: true },",
    `  openGraph: { type: "article"${seo.title ? `, title: ${JSON.stringify(seo.title)}` : ""}${seo.description ? `, description: ${JSON.stringify(seo.description)}` : ""}${seo.ogImage ? `, images: [${JSON.stringify(seo.ogImage)}]` : ""} },`,
  ].join("\n");
  files[`next/app/${base}/${blog.slug}/page.tsx`] = `/**
 * GENERATED by the blog branch (src/blog/publish.ts, ${BLOG_GENERATOR}) — do not hand-edit.
 *   source:    ${commentSafe(blog.documents.map((d) => d.name).join(", "))}
 *   blog:      ${blog.id} · digest ${approval.blogDigest.slice(0, 16)}
 *   approved:  ${commentSafe(approval.approvedBy)} at ${commentSafe(approval.approvedAt)}
 * Content is the author's, carried unchanged. To change it, change the source
 * document and run the blog branch again (website_workflow/blog_publishing.md).
 */
import type { Metadata } from "next";
${usesImage ? 'import Image from "next/image";\n' : ""}${chrome?.usesLink ? 'import Link from "next/link";\n' : ""}import "${"../".repeat(depth - (base.split("/").length))}blog.css";

export const metadata: Metadata = {
${metadata}
};
${seo.jsonLd ? `\nconst jsonLd = ${JSON.stringify(seo.jsonLd)};\n` : ""}
export default function Page() {
  return (
    <>
${seo.jsonLd ? '      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\\\u003c") }} />\n' : ""}${chrome?.header ? `      ${chrome.header}\n` : ""}      ${toJsx(renderArticle(page, { mode: "publish" }))}
${chrome?.footer ? `      ${chrome.footer}\n` : ""}    </>
  );
}
`;
  files[`next/app/${base}/blog.css`] = blogCss();
  files[`next/app/${base}/page.tsx`] = `/** GENERATED by the blog branch (src/blog/publish.ts, ${BLOG_GENERATOR}): the blog index, rebuilt from the registry on every publish. */
import type { Metadata } from "next";
${chrome?.usesLink ? 'import Link from "next/link";\n' : ""}import "./blog.css";

export const metadata: Metadata = {
  title: ${JSON.stringify(indexTitle)},
  robots: { index: true, follow: true },
};

export default function Page() {
  return (
    <>
${chrome?.header ? `      ${chrome.header}\n` : ""}      ${toJsx(indexArticle(posts))}
${chrome?.footer ? `      ${chrome.footer}\n` : ""}    </>
  );
}
`;
  files["blog-registry.json"] = `${JSON.stringify({ schema: "framework:blog-registry@1", generator: BLOG_GENERATOR, posts: indexEntries(posts).map(({ approvedBy: _by, approvedAt: _at, ...publicFacts }) => publicFacts) }, null, 2)}\n`;

  // ---- assets actually used by the page; an unplaced or excluded file is not published
  const used = new Set<string>();
  const html = files[`static/${base}/${blog.slug}/index.html`] ?? "";
  for (const asset of blog.assets) if (html.includes(page.assetUrl(asset))) used.add(asset.id);
  const copies = blog.assets
    .filter((a) => used.has(a.id))
    .map((a) => ({ from: a.path, to: [`static/${base}/${blog.slug}/assets/${publishedAssetName(a)}`, `next/public/${base}/${blog.slug}/assets/${publishedAssetName(a)}`] }));

  return { files, copies, post, sitemapEntry: input.origin ? `${input.origin.replace(/\/+$/, "")}${page.route}` : null };
}

/** Add URLs to an existing sitemap; returns it unchanged when they are already present. */
export function addToSitemap(sitemapXml: string, urls: readonly string[]): string {
  let out = sitemapXml;
  for (const url of urls) {
    if (out.includes(`<loc>${url}</loc>`)) continue;
    out = out.replace("</urlset>", `  <url><loc>${url}</loc></url>\n</urlset>`);
  }
  return out;
}

export function titleOf(blog: Blog): string {
  return blog.title ? plainText(blog.title.inlines) : "(no title found)";
}
