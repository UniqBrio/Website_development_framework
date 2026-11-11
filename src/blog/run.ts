/**
 * RUN DIRECTORY OPERATIONS — the filesystem side of the blog branch.
 *
 * A run directory is one ingest: `manifest.json` + `assets/` written by
 * blog_ingest.py, then `preview/`, `validation-report.*`, `mapping.json`,
 * `approval.json` and `run-record.json` written here. Each stage records the
 * digest of what it consumed, so extraction → mapping → preview → approval →
 * publish can be traced and a stale stage is detectable.
 */
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { type Blog, type BlogManifest, checkBlogIntegrity, parseBlogManifest } from "./manifest.js";
import { type BlogPage, type BlogSiteContext, mapBlogToPage, publishedAssetName } from "./map.js";
import { renderArticle, toHtml } from "./render.js";
import { type ValidationReport, renderReportMarkdown, validateBlog } from "./validate.js";
import { blogCss } from "./css.js";
import {
  type ApprovalRecord,
  type PublishedPost,
  type Publication,
  addToSitemap,
  approvalProblems,
  blogDigest,
  publishBlog,
  renderBlogDocument,
  renderReviewPanel,
  siteChromeFromNext,
  siteChromeFromStatic,
} from "./publish.js";

export interface RunOptions extends BlogSiteContext {
  /** A generated site directory (holding `static/` and/or `next/`), for its stylesheet and chrome. */
  siteDir?: string;
}

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

export function loadManifest(runDir: string): BlogManifest {
  const path = join(runDir, "manifest.json");
  if (!existsSync(path)) throw new Error(`${path} not found — run website_workflow/tools/blog_ingest.py first`);
  return parseBlogManifest(JSON.parse(readFileSync(path, "utf8")));
}

function integrity(runDir: string, blog: Blog): string[] {
  return checkBlogIntegrity(blog, {
    fileSize: (rel) => (existsSync(join(runDir, rel)) ? statSync(join(runDir, rel)).size : null),
    fileSha256: (rel) => (existsSync(join(runDir, rel)) ? sha256(join(runDir, rel)) : null),
  });
}

export interface Evaluated {
  blog: Blog;
  page: BlogPage;
  report: ValidationReport;
}

/** Map, render and validate one blog against the files actually in the run directory. */
export function evaluateBlog(runDir: string, manifest: BlogManifest, blog: Blog, site: BlogSiteContext): Evaluated {
  const page = mapBlogToPage(blog, site);
  const articleHtml = toHtml(renderArticle(page, { mode: "publish" }));
  const report = validateBlog({ blog, page, articleHtml, integrityProblems: integrity(runDir, blog), packageIssues: manifest.issues });
  return { blog, page, report };
}

function record(runDir: string, stage: string, facts: Record<string, unknown>): void {
  const path = join(runDir, "run-record.json");
  const current = existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as { stages: Array<Record<string, unknown>> }) : { stages: [] };
  current.stages.push({ stage, at: new Date().toISOString(), manifestSha256: sha256(join(runDir, "manifest.json")), ...facts });
  writeFileSync(path, `${JSON.stringify(current, null, 2)}\n`);
}

function write(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

export interface PreviewResult {
  blogs: Array<{ blogId: string; slug: string; previewPath: string; reportPath: string; readiness: ValidationReport["readiness"] }>;
}

export function previewRun(runDir: string, options: RunOptions = {}): PreviewResult {
  const manifest = loadManifest(runDir);
  const out: PreviewResult = { blogs: [] };
  const siteCssPath = options.siteDir ? join(options.siteDir, "static", "styles.css") : null;
  const hasSiteCss = siteCssPath !== null && existsSync(siteCssPath);
  const homePath = options.siteDir ? join(options.siteDir, "static", "index.html") : null;
  const chrome = homePath && existsSync(homePath) ? siteChromeFromStatic(readFileSync(homePath, "utf8")) : undefined;
  const previewRoot = join(runDir, "preview");
  if (hasSiteCss && siteCssPath) write(join(previewRoot, "site.css"), readFileSync(siteCssPath, "utf8"));
  write(join(previewRoot, "blog.css"), blogCss());

  for (const blog of manifest.blogs) {
    // The published route decides readiness; the preview itself uses relative asset URLs so it opens from disk.
    const { report } = evaluateBlog(runDir, manifest, blog, options);
    const previewPage = mapBlogToPage(blog, { ...options, assetBase: "assets" });
    const dir = join(previewRoot, blog.slug);
    for (const asset of blog.assets) {
      const from = join(runDir, asset.path);
      if (!existsSync(from)) continue;
      mkdirSync(join(dir, "assets"), { recursive: true });
      copyFileSync(from, join(dir, "assets", publishedAssetName(asset)));
    }
    const html = renderBlogDocument(previewPage, {
      mode: "preview",
      cssHrefs: [...(hasSiteCss ? ["../site.css"] : []), "../blog.css"],
      chrome,
      reviewPanel: renderReviewPanel(blog, previewPage, report),
    });
    write(join(dir, "index.html"), html);
    write(join(runDir, "reports", `${blog.slug}.validation.json`), `${JSON.stringify(report, null, 2)}\n`);
    write(join(runDir, "reports", `${blog.slug}.validation.md`), renderReportMarkdown(report));
    write(join(runDir, "reports", `${blog.slug}.mapping.json`), `${JSON.stringify({ blogId: blog.id, route: report.route, digest: blogDigest(blog), ledger: report.mapping, adaptations: report.adaptations, seoUnresolved: report.seoUnresolved }, null, 2)}\n`);
    out.blogs.push({ blogId: blog.id, slug: blog.slug, previewPath: join(dir, "index.html"), reportPath: join(runDir, "reports", `${blog.slug}.validation.md`), readiness: report.readiness });
    record(runDir, "preview", { blogId: blog.id, blogDigest: blogDigest(blog), readiness: report.readiness.state, siteStylesheet: hasSiteCss });
  }
  return out;
}

function approvalPath(runDir: string, blog: Blog): string {
  return join(runDir, "approvals", `${blog.slug}.approval.json`);
}

export function readApproval(runDir: string, blog: Blog): ApprovalRecord | null {
  const path = approvalPath(runDir, blog);
  return existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as ApprovalRecord) : null;
}

/**
 * Record the owner's approval of the CURRENT version of a blog. Refused while the
 * blog is blocked; warnings are acknowledged only when the approver says so.
 */
export function approveRun(runDir: string, blogId: string | undefined, approvedBy: string, acceptWarnings: boolean, options: RunOptions = {}): ApprovalRecord {
  if (!approvedBy.trim()) throw new Error("an approval needs the approver's name (--by)");
  const manifest = loadManifest(runDir);
  const blog = blogId ? manifest.blogs.find((b) => b.id === blogId || b.slug === blogId) : manifest.blogs.length === 1 ? manifest.blogs[0] : undefined;
  if (!blog) throw new Error(blogId ? `no blog "${blogId}" in this run` : `this run holds ${manifest.blogs.length} blogs; name one with --blog`);
  const { report } = evaluateBlog(runDir, manifest, blog, options);
  if (report.readiness.state === "blocked") throw new Error(`cannot approve ${blog.id}: ${report.readiness.blockers.length} blocker(s) — ${report.readiness.blockers.slice(0, 3).join(" | ")}`);
  if (report.readiness.warningsToAccept.length > 0 && !acceptWarnings) {
    throw new Error(`${blog.id} has warnings (${report.readiness.warningsToAccept.join(", ")}); review them in the report and approve with --accept-warnings to acknowledge them`);
  }
  const approval: ApprovalRecord = {
    blogId: blog.id,
    blogDigest: blogDigest(blog),
    approvedBy: approvedBy.trim(),
    approvedAt: new Date().toISOString(),
    acceptedWarnings: acceptWarnings ? report.readiness.warningsToAccept : [],
    readinessAtApproval: report.readiness.state,
  };
  write(approvalPath(runDir, blog), `${JSON.stringify(approval, null, 2)}\n`);
  record(runDir, "approval", { blogId: blog.id, blogDigest: approval.blogDigest, approvedBy: approval.approvedBy, acceptedWarnings: approval.acceptedWarnings });
  return approval;
}

export interface PublishResult {
  written: string[];
  copied: string[];
  publications: Publication[];
}

/** Write every APPROVED blog of a run into a site directory. Throws on the first unapproved one named. */
export function publishRun(runDir: string, siteDir: string, blogId: string | undefined, options: RunOptions = {}): PublishResult {
  const manifest = loadManifest(runDir);
  const targets = blogId ? manifest.blogs.filter((b) => b.id === blogId || b.slug === blogId) : manifest.blogs;
  if (targets.length === 0) throw new Error(`no blog "${blogId ?? ""}" in this run`);
  const registryPath = join(siteDir, "blog-registry.json");
  let posts: PublishedPost[] = existsSync(registryPath) ? (JSON.parse(readFileSync(registryPath, "utf8")) as { posts: PublishedPost[] }).posts : [];
  const homeStatic = join(siteDir, "static", "index.html");
  const homeNext = join(siteDir, "next", "app", "page.tsx");
  const staticChrome = existsSync(homeStatic) ? siteChromeFromStatic(readFileSync(homeStatic, "utf8")) : undefined;
  const nextChrome = existsSync(homeNext) ? siteChromeFromNext(readFileSync(homeNext, "utf8")) : undefined;
  const result: PublishResult = { written: [], copied: [], publications: [] };

  // Authorise everything first: a partly published run is worse than none.
  const evaluated = targets.map((blog) => {
    const item = evaluateBlog(runDir, manifest, blog, options);
    const approval = readApproval(runDir, blog);
    const problems = approvalProblems(blog, item.report, approval);
    if (problems.length > 0) throw new Error(`blog ${blog.id} is not authorised for publishing: ${problems.join("; ")}`);
    return { ...item, approval };
  });

  for (const { blog, page, report, approval } of evaluated) {
    const publication = publishBlog({ blog, page, report, approval, existingPosts: posts, routeBase: options.routeBase, siteName: options.siteName, origin: options.origin, staticChrome, nextChrome });
    posts = [...posts.filter((p) => p.slug !== publication.post.slug), publication.post];
    for (const [path, content] of Object.entries(publication.files)) {
      if (path.startsWith("next/") && !existsSync(join(siteDir, "next"))) continue;
      write(join(siteDir, path), content);
      result.written.push(path);
    }
    for (const copy of publication.copies) {
      for (const to of copy.to) {
        if (to.startsWith("next/") && !existsSync(join(siteDir, "next"))) continue;
        mkdirSync(dirname(join(siteDir, to)), { recursive: true });
        copyFileSync(join(runDir, copy.from), join(siteDir, to));
        result.copied.push(to);
      }
    }
    if (publication.sitemapEntry && options.origin) {
      const urls = [publication.sitemapEntry, `${options.origin.replace(/\/+$/, "")}/${(options.routeBase ?? "/blog").replace(/^\/+|\/+$/g, "")}`];
      for (const sitemap of ["static/sitemap.xml", "next/public/sitemap.xml"]) {
        const path = join(siteDir, sitemap);
        if (existsSync(path)) writeFileSync(path, addToSitemap(readFileSync(path, "utf8"), urls));
      }
    }
    result.publications.push(publication);
    record(runDir, "publish", { blogId: blog.id, blogDigest: blogDigest(blog), siteDir, route: page.route, files: Object.keys(publication.files).length, assets: publication.copies.length });
  }
  return result;
}
