/**
 * BLOG PRESENTATION — manifest → mapping → render → validation → approval → publish.
 *
 * Uses real manifests from the ingest tool, and publishes onto a site produced by
 * the existing generator, so the join with the existing workflow is tested rather
 * than assumed.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runPipeline } from "../../src/pipeline.js";
import { generateWebsite } from "../../src/generation/generate-website.js";
import { parseServedHtml } from "../../src/evidence/build-evidence.js";
import { dryRunFixture } from "../fixtures/dry-run-fixture.js";
import {
  type Blog,
  type BlogManifest,
  approvalProblems,
  approveRun,
  blogDigest,
  checkBlogIntegrity,
  evaluateBlog,
  loadManifest,
  mapBlogToPage,
  parseBlogManifest,
  previewRun,
  publishBlog,
  publishRun,
  renderArticle,
  toHtml,
  toJsx,
  validateBlog,
  visibleText,
  walkBlocks,
} from "../../src/blog/index.js";

const PYTHON = spawnSync("python3", ["--version"]).status === 0 ? "python3" : "python";
let root = "";
let fx = "";
let site = "";
const run = (name: string) => join(root, `run-${name}`);

function ingest(name: string, inputs: string[], flags: string[] = []): BlogManifest {
  execFileSync(PYTHON, ["website_workflow/tools/blog_ingest.py", ...inputs.map((i) => join(fx, i)), "--out", run(name), ...flags], { stdio: "pipe" });
  return loadManifest(run(name));
}
function article(blog: Blog, mode: "preview" | "publish" = "publish", origin: string | null = null) {
  const page = mapBlogToPage(blog, { origin });
  return { page, html: toHtml(renderArticle(page, { mode })) };
}
function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

const generated = (() => {
  const input = dryRunFixture();
  const decided = runPipeline(input);
  return generateWebsite(input, decided.output, decided.contract);
})();

let pkg: BlogManifest;
let docx: BlogManifest;
let missing: BlogManifest;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "blog-present-"));
  fx = join(root, "fixtures");
  execFileSync(PYTHON, ["tests/fixtures/blog/build_fixtures.py", fx], { stdio: "pipe" });
  site = join(root, "site");
  for (const [path, content] of Object.entries(generated.files)) {
    mkdirSync(dirname(join(site, path)), { recursive: true });
    writeFileSync(join(site, path), content);
  }
  pkg = ingest("pkg", ["package"]);
  docx = ingest("docx", ["docx"]);
  missing = ingest("missing", ["package-missing"]);
});
afterAll(() => {
  if (root) rmSync(root, { recursive: true, force: true });
});

// ============================================================ contract

describe("manifest contract", () => {
  it("rejects a manifest of another schema version rather than adapting it", () => {
    expect(() => parseBlogManifest({ ...pkg, schema: "framework:blog-manifest@0" })).toThrow(/not a valid framework:blog-manifest@1/);
  });

  it("detects a media reference that points at nothing", () => {
    const blog = structuredClone(pkg.blogs[0]!);
    blog.assets = blog.assets.slice(1);
    const orphaned = structuredClone(pkg.blogs[0]!);
    orphaned.assets = orphaned.assets.filter((a) => a.kind !== "video");
    expect(checkBlogIntegrity(orphaned).join(" ")).toMatch(/references asset asset-[0-9a-f]+, which is not in the manifest/);
    expect(checkBlogIntegrity(pkg.blogs[0]!)).toEqual([]);
  });

  it("detects an asset whose file is gone or altered", () => {
    const blog = pkg.blogs[0]!;
    const first = blog.assets[0]!;
    expect(checkBlogIntegrity(blog, { fileSize: (p) => (p === first.path ? null : 1) }).some((p) => p.includes("does not exist"))).toBe(true);
    expect(checkBlogIntegrity(blog, { fileSize: (p) => blog.assets.find((a) => a.path === p)!.bytes, fileSha256: () => "0".repeat(64) }).some((p) => p.includes("SHA-256"))).toBe(true);
  });
});

// ============================================================ mapping and rendering

describe("mapping to the blog page", () => {
  it("maps every extracted element to one destination and records it", () => {
    const { page } = article(pkg.blogs[0]!);
    const row = (element: string) => page.ledger.find((r) => r.element === element)!;
    expect(page.route).toBe("/blog/fixture-automating-fee-reminders");
    for (const element of ["Blog title", "Subtitle", "Cover image", "Headings", "Paragraphs", "Tables", "Images", "GIFs and animations", "Videos", "Video embeds", "Footnotes", "Conclusion", "Call to action", "SEO metadata"]) {
      expect(row(element), element).toMatchObject({ status: "mapped" });
    }
    expect(row("References")).toMatchObject({ status: "not_supplied", count: 0 });
    expect(row("Images").note).toContain("1 supplied file(s) have no confirmed position");
  });

  it("produces SEO artifacts only from supplied facts", () => {
    const without = article(pkg.blogs[0]!).page.seo;
    expect(without).toMatchObject({ title: "FIXTURE Automating Fee Reminders", description: "How one fixture academy automated reminders.", canonical: null, ogImage: null });
    expect(without.unresolved.map((u) => u.artifact)).toEqual(expect.arrayContaining(["canonical URL", "og:image"]));
    const withOrigin = article(pkg.blogs[0]!, "publish", "https://example.test").page.seo;
    expect(withOrigin.canonical).toBe("https://example.test/blog/fixture-automating-fee-reminders");
    expect(withOrigin.jsonLd).toMatchObject({ "@type": "BlogPosting", headline: "FIXTURE Automating Fee Reminders", author: { name: "Fixture Author" }, datePublished: "2026-10-02" });
    // The DOCX names no author or date: no structured data is invented for it.
    const bare = article(docx.blogs[0]!).page.seo;
    expect(bare.jsonLd).toBeNull();
    expect(bare.description).toBeNull();
    expect(bare.unresolved.map((u) => u.artifact)).toEqual(expect.arrayContaining(["meta description", "BlogPosting structured data"]));
  });

  it("keeps one <h1> by moving source level-1 headings down, and says so", () => {
    const { page, html } = article(docx.blogs[0]!);
    expect(page.headingShift).toBe(1);
    expect(page.adaptations.join(" ")).toContain("moved down one level");
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toContain('<h2 id="where-the-money-goes">Where the money goes</h2>');
    expect(html).toContain('<h3 id="the-numbers">The numbers</h3>');
  });
});

describe("rendered article", () => {
  it("carries the author's text verbatim and in order — nothing added, nothing lost", () => {
    const blog = pkg.blogs[0]!;
    const { html } = article(blog);
    const seen = visibleText(html);
    for (const phrase of ["Collections rose from 82.5% to 91% in one quarter", "₹1,25,000", "Quoted, word for word.", "total = 82.5 * 2 # a < b && c > d", "Start small.", "FIXTURE internal data, 2026."]) {
      expect(seen, phrase).toContain(phrase);
    }
    const order = ["FIXTURE Automating Fee Reminders", "What changed in ninety days", "Collections rose", "How the process works", "Schedule", "Pricing comparison", "Starter", "Conclusion", "Start small."].map((p) => seen.indexOf(p));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(order.every((i) => i >= 0)).toBe(true);
  });

  it("escapes source text: markup in a document cannot become markup on the page", () => {
    const blog = structuredClone(pkg.blogs[0]!);
    const para = blog.blocks.find((b) => b.type === "paragraph")!;
    if (para.type === "paragraph") para.inlines = [{ t: "text", text: '<script>alert("x")</script> & <img src=x onerror=y>' }];
    const { html, page } = article(blog);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &lt;img src=x onerror=y&gt;");
    // In JSX the same text is a string literal inside an expression, which React escapes when it renders.
    expect(toJsx(renderArticle(page, { mode: "publish" }))).toContain('<p>{`<script>alert("x")</script> & <img src=x onerror=y>`}</p>');
  });

  it("renders images sized, with alt, at their extracted positions; cover first and eager", () => {
    const blog = pkg.blogs[0]!;
    const { html } = article(blog);
    const imgs = [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
    expect(imgs.length).toBeGreaterThanOrEqual(4);
    for (const tag of imgs) expect(tag).toMatch(/ alt="[^"]*" width="\d+" height="\d+"/);
    expect(imgs[0]).toContain('loading="eager" fetchpriority="high"');
    expect(imgs.slice(1).every((t) => t.includes('loading="lazy"'))).toBe(true);
    expect(html).toContain('alt="Monthly collections chart"');
    expect(html).toContain("<figcaption><em>Figure 1: Collections by month</em></figcaption>");
    expect(html.indexOf("fee-chart")).toBeLessThan(html.indexOf("How the process works"));
    expect(html.indexOf("How the process works")).toBeLessThan(html.indexOf("/assets/process-"));
  });

  it("keeps a GIF animated and gives the reader a way to hide it", () => {
    const { html } = article(pkg.blogs[0]!);
    expect(html).toMatch(/<details class="c-blog-animation" open><summary>Animation \(select to hide or show\)<\/summary><img src="[^"]+\.gif"[^>]*data-animated="true">/);
  });

  it("renders video with native controls, poster and subtitles, never autoplaying", () => {
    const { html } = article(pkg.blogs[0]!);
    const video = /<video\b[^>]*>[\s\S]*?<\/video>/.exec(html)![0];
    expect(video).toMatch(/<video controls preload="metadata" playsinline width="640" height="360" poster="[^"]+\.png">/);
    expect(video).toMatch(/<source src="[^"]+\.mp4" type="video\/mp4">/);
    expect(video).toMatch(/<track kind="subtitles" src="[^"]+\.vtt" srclang="en"/);
    expect(video).not.toContain("autoplay");
  });

  it("keeps an external video as a link, with a click-to-load player that fetches nothing until opened", () => {
    const { html } = article(pkg.blogs[0]!);
    expect(html).toContain('<a href="https://youtu.be/dQw4w9WgXcQ">Watch on YouTube</a>');
    expect(html).toMatch(/<details class="c-blog-embed"><summary>[^<]+<\/summary><div class="c-blog-embed-frame"><iframe src="https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ" title="[^"]+" loading="lazy"/);
    expect(html).not.toMatch(/<details class="c-blog-embed" open/);
  });

  it("wraps tables in a labelled scroll region with header cells", () => {
    const { html } = article(pkg.blogs[0]!);
    expect(html).toMatch(/<div class="c-blog-table-scroll" role="region" tabindex="0" aria-label="Table 1"><table class="c-blog-table"><thead><tr><th scope="col">Plan<\/th><th scope="col">Price<\/th><\/tr><\/thead>/);
  });

  it("shows a native chart as its exact data table, titled by the chart", () => {
    const { html } = article(docx.blogs[0]!);
    expect(html).toMatch(/data-chart-type="column">.*<caption id="blog-table-\d">Renewals by quarter<\/caption>/s);
    expect(visibleText(html)).toContain("Q3 77.25");
  });

  it("links footnotes both ways and renders a call to action with the site's action style", () => {
    const { html } = article(pkg.blogs[0]!);
    expect(html).toContain('<sup><a id="fnref-1" href="#fn-1" aria-label="Footnote 1">[1]</a></sup>');
    expect(html).toMatch(/<li id="fn-1">FIXTURE internal data, 2026\. <a href="#fnref-1"/);
    expect(html).toContain('<p class="c-blog-cta"><a href="https://example.org/demo" class="c-action">Book a walkthrough</a></p>');
  });

  it("offers a linked supplied file as a download", () => {
    const { html } = article(pkg.blogs[0]!);
    expect(html).toMatch(/<a href="\/blog\/fixture-automating-fee-reminders\/assets\/checklist-[0-9a-f]+\.txt" download="checklist\.txt">checklist<\/a>/);
  });

  it("marks what is missing in the preview and never in the published page", () => {
    const blog = missing.blogs[0]!;
    expect(article(blog, "preview").html).toContain('data-blog-review="missing"');
    expect(article(blog, "publish").html).not.toContain("data-blog-review");
    expect(article(blog, "publish").html).not.toContain("not-there");
  });

  it("uses no colour, no inline style and no script of its own", () => {
    const { html } = article(pkg.blogs[0]!);
    expect(html).not.toMatch(/style=|<script|#[0-9a-fA-F]{3,8}\b|rgb\(/);
  });
});

// ============================================================ validation and readiness

describe("validation report and readiness", () => {
  it("is ready with warnings when only warnings remain, and lists what a browser must still confirm", () => {
    const { report } = evaluateBlog(run("pkg"), pkg, pkg.blogs[0]!, {});
    expect(report.readiness.state).toBe("ready_with_warnings");
    expect(report.readiness.warningsToAccept).toEqual(["ALT_TEXT_MISSING", "PLACEMENT_UNCERTAIN"]);
    expect(report.readiness.notVerified).toEqual(["Video and audio playback", "Link functionality", "Mobile responsiveness"]);
    const status = Object.fromEntries(report.checks.map((c) => [c.id, c.status]));
    expect(status).toMatchObject({ title: "pass", hierarchy: "pass", completeness: "pass", "media-placement": "warn", animation: "pass", tables: "pass", dimensions: "pass", integrity: "pass", video: "not_verified" });
    expect(report.placementUncertainties.map((i) => i.code)).toContain("PLACEMENT_UNCERTAIN");
    expect(report.extraction.assets.find((a) => a.filename === "team-offsite.png")).toMatchObject({ role: "unplaced", placement: "unplaced" });
  });

  it("is blocked by a missing asset, naming the section and the fix", () => {
    const { report } = evaluateBlog(run("missing"), missing, missing.blogs[0]!, {});
    expect(report.readiness.state).toBe("blocked");
    expect(report.missingAssets[0]).toMatchObject({ code: "MEDIA_MISSING", section: "Get started" });
    expect(report.readiness.blockers[0]).toMatch(/MEDIA_MISSING.*not-there\.png.*Supply the file/);
  });

  it("fails completeness when extracted text does not reach the page", () => {
    const blog = pkg.blogs[0]!;
    const page = mapBlogToPage(blog);
    const html = toHtml(renderArticle(page, { mode: "publish" })).replace("Start small.", "");
    const report = validateBlog({ blog, page, articleHtml: html, integrityProblems: [] });
    expect(report.checks.find((c) => c.id === "completeness")).toMatchObject({ status: "fail" });
    expect(report.readiness.state).toBe("blocked");
  });

  it("is blocked when a title is absent — a title is never generated", () => {
    const csv = ingest("csv", ["csv"]);
    const { report, page } = evaluateBlog(run("csv"), csv, csv.blogs[0]!, {});
    expect(page.title).toBeNull();
    expect(report.readiness.state).toBe("blocked");
    expect(toHtml(renderArticle(page, { mode: "publish" }))).not.toContain("<h1");
  });
});

// ============================================================ preview, approval, publish

describe("preview → approval → publish", () => {
  it("writes a noindex preview in the site's own stylesheet and chrome, with the review panel", () => {
    const result = previewRun(run("pkg"), { siteDir: site });
    const html = readFileSync(result.blogs[0]!.previewPath, "utf8");
    expect(html).toContain('<meta name="robots" content="noindex,nofollow">');
    expect(html).toContain('<link rel="stylesheet" href="../site-0.css">');
    expect(html).toContain('<header class="c-site-header">');
    expect(html).toContain('data-blog-review="panel"');
    expect(html).toContain("team-offsite.png");
    for (const src of [...html.matchAll(/(?:src|poster)="(assets\/[^"]+)"/g)].map((m) => m[1]!)) {
      expect(existsSync(join(dirname(result.blogs[0]!.previewPath), src)), src).toBe(true);
    }
    const report = readFileSync(result.blogs[0]!.reportPath, "utf8");
    for (const heading of ["## Publishing readiness", "## Successfully extracted", "## Successfully mapped", "## Missing assets and content", "## Unsupported formats and elements", "## Placement uncertainties", "## Content extraction warnings"]) {
      expect(report).toContain(heading);
    }
  });

  it("refuses to publish without approval, and nothing is written", () => {
    const before = walk(site).sort();
    expect(() => publishRun(run("docx"), site, undefined, {})).toThrow(/not authorised for publishing: no approval record/);
    expect(walk(site).sort()).toEqual(before);
    // An empty or unrecognised directory is not a website: refused, and left empty.
    const target = join(root, "not-a-site");
    mkdirSync(target);
    expect(() => publishRun(run("docx"), target, undefined, {})).toThrow(/cannot be published to, and nothing was written/);
    expect(readdirSync(target)).toEqual([]);
  });

  it("refuses to approve a blocked blog, and requires warnings to be acknowledged", () => {
    expect(() => approveRun(run("missing"), undefined, "Owner", true)).toThrow(/cannot approve .* blocker/);
    expect(() => approveRun(run("pkg"), undefined, "Owner", false)).toThrow(/--accept-warnings/);
    expect(() => approveRun(run("pkg"), undefined, " ", true)).toThrow(/approver's name/);
  });

  it("binds an approval to the exact version approved", () => {
    const approval = approveRun(run("pkg"), undefined, "FIXTURE Owner", true);
    const blog = pkg.blogs[0]!;
    const { report } = evaluateBlog(run("pkg"), pkg, blog, {});
    expect(approvalProblems(blog, report, approval)).toEqual([]);
    const edited = structuredClone(blog);
    const para = edited.blocks.find((b) => b.type === "paragraph")!;
    if (para.type === "paragraph") para.inlines = [{ t: "text", text: "Changed after approval." }];
    expect(blogDigest(edited)).not.toBe(blogDigest(blog));
    expect(approvalProblems(edited, report, approval)).toContain("the blog changed after it was approved; preview and approve the current version");
    expect(() => publishBlog({ blog: edited, page: mapBlogToPage(edited), report, approval })).toThrow(/changed after it was approved/);
  });

  it("publishes an approved blog onto the generated site without touching existing pages", () => {
    const before = new Map(walk(site).map((f) => [f, readFileSync(f, "utf8")]));
    const result = publishRun(run("pkg"), site, undefined, { origin: "https://example.test", siteName: "FIXTURE Site" });
    for (const [file, content] of before) expect(readFileSync(file, "utf8"), file).toBe(content);

    const slug = "fixture-automating-fee-reminders";
    const page = readFileSync(join(site, "static/blog", slug, "index.html"), "utf8");
    expect(page).toContain('<meta name="robots" content="index,follow">');
    expect(page).toContain(`<link rel="canonical" href="https://example.test/blog/${slug}">`);
    expect(page).toContain('<link rel="stylesheet" href="/styles.css">');
    expect(page).toContain('<link rel="stylesheet" href="/blog/blog.css">');
    expect(page).toContain('<header class="c-site-header">');
    expect(page).not.toContain("data-blog-review");
    expect(page).not.toContain('aria-current="page"');

    // The existing evidence parser reads the blog page like any other page of the site.
    const facts = parseServedHtml(`/blog/${slug}`, page);
    expect(facts).toMatchObject({ h1Count: 1, headingSkips: false, imagesWithoutAlt: 0, imagesWithoutDimensions: 0, imagesHighPriority: 1, placeholderSlots: 0, pendingMarkers: 0, indexable: true });
    expect(facts.canonical).toBe(`https://example.test/blog/${slug}`);

    // Only files the page uses are published; the unplaced image is not.
    const assets = readdirSync(join(site, "static/blog", slug, "assets"));
    expect(assets.some((a) => a.startsWith("team-offsite"))).toBe(false);
    for (const src of [...page.matchAll(/(?:src|poster|href)="\/blog\/[^"]+\/assets\/([^"]+)"/g)].map((m) => m[1]!)) expect(assets, src).toContain(src);
    expect(result.written.filter((f) => f.includes("/assets/")).length).toBe(assets.length * 2);

    // Index page (a published page is never an orphan) and registry.
    expect(readFileSync(join(site, "static/blog/index.html"), "utf8")).toContain(`<a href="/blog/${slug}">FIXTURE Automating Fee Reminders</a>`);
    expect(JSON.parse(readFileSync(join(site, "blog-registry.json"), "utf8")).posts[0]).toMatchObject({ slug, title: "FIXTURE Automating Fee Reminders" });
  });

  it("emits a Next.js server component: next/image, the site's chrome, no client boundary", () => {
    const tsx = readFileSync(join(site, "next/app/blog/fixture-automating-fee-reminders/page.tsx"), "utf8");
    expect(tsx).not.toContain('"use client"');
    expect(tsx).toContain('import Image from "next/image";');
    expect(tsx).toContain('import "../blog.css";');
    expect(tsx).toContain('<header className="c-site-header">');
    expect(tsx).toMatch(/<Image src=\{"[^"]+cover-[0-9a-f]+\.png"\} alt=\{""\} width=\{1200\} height=\{630\} priority sizes=/);
    expect(tsx).toMatch(/<Image src=\{"[^"]+\.gif"\}[^>]*unoptimized \/>/);
    expect(tsx).toContain("alternates: { canonical:");
    expect(tsx).toContain('replace(/</g, "\\\\u003c")');
    expect(tsx).toMatch(/<video controls preload=\{"metadata"\} playsInline/);
    expect(tsx).toContain("className=");
    expect(tsx).not.toMatch(/ class=|tabindex=|colspan=/);
    expect(existsSync(join(site, "next/public/blog/fixture-automating-fee-reminders/assets"))).toBe(true);
  });

  it("keeps earlier posts in the index when another blog is published", () => {
    previewRun(run("docx"), { siteDir: site });
    approveRun(run("docx"), undefined, "FIXTURE Owner", true);
    publishRun(run("docx"), site, undefined, {});
    const index = readFileSync(join(site, "static/blog/index.html"), "utf8");
    expect(index).toContain("FIXTURE Automating Fee Reminders");
    expect(index).toContain("FIXTURE How Academies Cut Fee Leakage");
  });

  it("records every stage with the digest it acted on", () => {
    const stages = (JSON.parse(readFileSync(join(run("pkg"), "run-record.json"), "utf8")) as { stages: Array<Record<string, string>> }).stages;
    expect(stages.map((s) => s["stage"])).toEqual(["preview", "approval", "publish"]);
    expect(new Set(stages.map((s) => s["blogDigest"])).size).toBe(1);
    expect(new Set(stages.map((s) => s["manifestSha256"])).size).toBe(1);
  });
});

// ============================================================ the branch is optional

describe("the blog branch is optional and isolated", () => {
  it("nothing in the existing pipeline or generator depends on it", () => {
    const sources = walk("src").filter((f) => f.endsWith(".ts") && !f.includes(`${join("src", "blog")}`) && !f.endsWith(join("src", "index.ts")));
    for (const file of sources) expect(readFileSync(file, "utf8"), file).not.toMatch(/from "\.\.?\/(?:\.\.\/)*blog\//);
  });

  it("a site generated without a blog contains no blog route or stylesheet", () => {
    expect(Object.keys(generated.files).some((f) => f.includes("blog"))).toBe(false);
    expect(generated.pages.some((p) => p.route.startsWith("/blog"))).toBe(false);
  });

  it("the extractor adds no dependency to the package", () => {
    const pkgJson = JSON.parse(readFileSync("package.json", "utf8")) as { dependencies: Record<string, string>; devDependencies: Record<string, string> };
    expect(Object.keys(pkgJson.dependencies)).toEqual(["zod"]);
    expect(Object.keys(pkgJson.devDependencies).sort()).toEqual(["@types/node", "typescript", "vitest"]);
    const imports = new Set<string>();
    for (const file of walk("website_workflow/tools/blogkit").filter((f) => f.endsWith(".py"))) {
      for (const m of readFileSync(file, "utf8").matchAll(/^\s*(?:import|from)\s+([a-zA-Z_][\w]*)/gm)) imports.add(m[1]!);
    }
    const stdlib = ["argparse", "base64", "binascii", "csv", "datetime", "difflib", "fnmatch", "hashlib", "html", "io", "ipaddress", "json", "os", "posixpath", "re", "shutil", "socket", "statistics", "struct", "subprocess", "sys", "tempfile", "unicodedata", "urllib", "xml", "zipfile", "blogkit"];
    expect([...imports].filter((name) => !stdlib.includes(name))).toEqual([]);
  });

  it("blocks walk helper visits nested blocks", () => {
    expect([...walkBlocks(pkg.blogs[0]!.blocks)].length).toBeGreaterThan(pkg.blogs[0]!.blocks.length);
  });
});
