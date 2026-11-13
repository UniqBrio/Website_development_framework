/**
 * WEBSITE COMPATIBILITY, PUBLISHING SAFETY AND HOSTILE INPUT.
 *
 * Every case publishes (or tries to) into a real directory and then compares the
 * directory with what it was, because "nothing was written" and "the site was
 * restored" are claims about files, not about return values.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runPipeline } from "../../src/pipeline.js";
import { generateWebsite } from "../../src/generation/generate-website.js";
import { dryRunFixture } from "../fixtures/dry-run-fixture.js";
import {
  type BlogManifest,
  approveRun,
  detectSite,
  evaluateBlog,
  loadManifest,
  mapBlogToPage,
  normaliseRouteBase,
  previewRun,
  publishRun,
  recoverInterruptedPublish,
  renderArticle,
  rollbackRun,
  safeHref,
  toHtml,
  toJsx,
} from "../../src/blog/index.js";

const PYTHON = spawnSync("python3", ["--version"]).status === 0 ? "python3" : "python";
let root = "";
let fx = "";
let n = 0;

function snapshot(dir: string): Map<string, string> {
  const out = new Map<string, string>();
  const visit = (d: string): void => {
    for (const name of readdirSync(d).sort()) {
      const full = join(d, name);
      if (statSync(full).isDirectory()) visit(full);
      else out.set(relative(dir, full), readFileSync(full).toString("base64"));
    }
  };
  visit(dir);
  return out;
}
function ingest(inputs: string[], flags: string[] = []): string {
  const out = join(root, `run-${(n += 1)}`);
  execFileSync(PYTHON, ["website_workflow/tools/blog_ingest.py", ...inputs, "--out", out, ...flags], { stdio: "pipe" });
  return out;
}
/** Ingest → preview → approve: a run that is authorised to publish. */
function approvedRun(inputs: string[], site?: string, routeBase?: string): string {
  const run = ingest(inputs);
  previewRun(run, { siteDir: site, routeBase });
  approveRun(run, undefined, "FIXTURE Owner", true, { routeBase });
  return run;
}
function files(dir: string, tree: Record<string, string>): string {
  mkdirSync(dir, { recursive: true });
  for (const [path, content] of Object.entries(tree)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
  return dir;
}

const NEXT = {
  "package.json": JSON.stringify({ name: "fixture-site", dependencies: { next: "^15.5.0", react: "^19.1.0", "react-dom": "^19.1.0" } }),
  "tsconfig.json": JSON.stringify({ compilerOptions: { jsx: "preserve", strict: true } }),
  "app/layout.tsx": 'import "./globals.css";\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (<html lang="en"><body><header className="top">FIXTURE NAV</header><main>{children}</main></body></html>);\n}\n',
  "app/page.tsx": "export default function Page() { return <h1>FIXTURE custom home</h1>; }\n",
  "app/globals.css": "body { font-family: Georgia, serif; }\n",
};
const STATIC = {
  "index.html": '<!doctype html><html lang="en"><head><title>FIXTURE Studio</title><link rel="stylesheet" href="css/main.css"><link rel="stylesheet" href="https://fonts.example/css?family=X"></head><body><header class="site-top"><a href="/">FIXTURE Studio</a><nav><a href="/classes.html" aria-current="page">Classes</a></nav><script>track()</script></header><main><h1>Welcome</h1></main><footer class="site-end">© FIXTURE Studio</footer></body></html>',
  "css/main.css": "body { margin: 0; font-family: Verdana; } .site-top { display: flex; }\n",
  "classes.html": "<!doctype html><html><body><h1>Classes</h1></body></html>",
};

let generatedSite = "";
const slug = "fixture-automating-fee-reminders";

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "blog-safety-"));
  fx = join(root, "fixtures");
  execFileSync(PYTHON, ["tests/fixtures/blog/build_fixtures.py", fx], { stdio: "pipe" });
  const input = dryRunFixture();
  const decided = runPipeline(input);
  generatedSite = files(join(root, "generated"), generateWebsite(input, decided.output, decided.contract).files);
});
afterAll(() => {
  if (root) rmSync(root, { recursive: true, force: true });
});
const pkg = () => [join(fx, "package")];
const site = (name: string, tree: Record<string, string>) => files(join(root, `site-${name}-${(n += 1)}`), tree);
const copyOfGenerated = () => {
  const dir = join(root, `gen-${(n += 1)}`);
  cpSync(generatedSite, dir, { recursive: true });
  return dir;
};

// ============================================================ website compatibility

describe("website detection", () => {
  it("recognises a generated site, a Next.js App Router project and a static HTML site", () => {
    expect(detectSite(generatedSite)).toMatchObject({ kind: "generated", unsupported: [], hasDesignTokens: true, stylesheets: ["/styles.css"] });
    const next = detectSite(site("next", NEXT));
    expect(next).toMatchObject({ kind: "next-app-router", unsupported: [], staticRoot: null, hasDesignTokens: false });
    expect(next.warnings.join(" ")).toContain("does not define the framework's design tokens");
    const plain = detectSite(site("static", STATIC));
    expect(plain).toMatchObject({ kind: "static-html", unsupported: [], stylesheets: ["/css/main.css", "https://fonts.example/css?family=X"] });
    expect(plain.staticChrome?.header).toContain('<header class="site-top">');
    expect(plain.staticChrome?.header).not.toMatch(/<script|aria-current/);
    expect(plain.facts.join(" ")).toContain("no /blog route exists yet");
  });

  it.each([
    ["an empty directory", {}, /no supported site was found/],
    ["a Pages Router project", { "package.json": NEXT["package.json"], "pages/index.tsx": "export default () => null" }, /Pages Router/],
    ["a JavaScript-only Next project", { "package.json": NEXT["package.json"], "app/layout.js": "export default ({children}) => children" }, /not TypeScript/],
    ["a project with basePath", { ...NEXT, "next.config.mjs": "export default { basePath: '/docs' }" }, /basePath/],
    ["a project with i18n routing", { ...NEXT, "next.config.js": "module.exports = { i18n: { locales: ['en','ta'] } }" }, /i18n/],
    ["a project with its own content system", { ...NEXT, "package.json": JSON.stringify({ dependencies: { next: "15", "next-mdx-remote": "5", contentlayer: "0.3" } }) }, /already has a content system \(contentlayer, next-mdx-remote\)/],
    ["a static site with <base href>", { "index.html": '<html><head><base href="/sub/"></head><body></body></html>' }, /<base href>/],
    ["a Next project with its own /blog page", { ...NEXT, "app/blog/page.tsx": "export default () => <h1>Our blog</h1>" }, /already has content at \/blog that this workflow did not create \(app\/blog\/page\.tsx\)/],
    ["a static site with its own blog folder", { ...STATIC, "blog/index.html": "<h1>Hand-made blog</h1>", "blog/first-post.html": "<p>x</p>" }, /did not create \(blog\/first-post\.html, blog\/index\.html\)/],
  ])("reports %s as unsupported, and publishing writes nothing", (_name, tree, reason) => {
    const dir = site("bad", tree as Record<string, string>);
    const profile = detectSite(dir);
    expect(profile.unsupported.join(" | ")).toMatch(reason);
    const before = snapshot(dir);
    expect(() => publishRun(approvedRun(pkg()), dir, undefined, {})).toThrow(/cannot be published to, and nothing was written/);
    expect(snapshot(dir)).toEqual(before);
  });

  it("refuses a route base that is not a plain path", () => {
    for (const bad of ["../outside", "/blog/../x", "/Blog", "/a b", "//evil", "/blog?x"]) expect(() => normaliseRouteBase(bad), bad).toThrow(/not a plain lower-case path/);
    expect(normaliseRouteBase("resources/articles/")).toBe("/resources/articles");
  });
});

describe("publishing to each supported kind of website", () => {
  it("static HTML site with a custom layout: the site's own stylesheets, header and footer; existing pages untouched", () => {
    const dir = site("static", STATIC);
    const before = snapshot(dir);
    const result = publishRun(approvedRun(pkg(), dir), dir, undefined, {});
    expect(result).toMatchObject({ state: "published", replaced: [] });
    for (const [file, content] of before) expect(snapshot(dir).get(file), file).toBe(content);
    const page = readFileSync(join(dir, "blog", slug, "index.html"), "utf8");
    expect(page).toContain('<link rel="stylesheet" href="/css/main.css">');
    expect(page).toContain('<link rel="stylesheet" href="/blog/blog.css">');
    expect(page).toContain('<header class="site-top">');
    expect(page).toContain('<footer class="site-end">');
    expect(page).not.toContain("track()");
    // Conventional shell on a site that is not generator output: header, then <main> with only the article, then footer.
    expect(page).toMatch(/<a class="c-blog-skip" href="#main">Skip to content<\/a>\s*<header class="site-top">[\s\S]*<\/header>\s*<main id="main">\s*<article class="c-blog"[\s\S]*<\/article>\s*<\/main>\s*<footer class="site-end">/);
    expect(readFileSync(join(dir, "blog", "index.html"), "utf8")).toMatch(/<\/header>\s*<main id="main">\s*<section class="c-blog"/);
    expect(existsSync(join(dir, "static"))).toBe(false);
    expect(existsSync(join(dir, "next"))).toBe(false);
    expect(readdirSync(join(dir, "blog", slug, "assets")).length).toBeGreaterThan(4);
    expect(existsSync(join(dir, "blog", "index.html"))).toBe(true);
  });

  it("Next.js App Router project: a server component under app/, assets under public/, the site's layout untouched", () => {
    const dir = site("next", NEXT);
    const before = snapshot(dir);
    publishRun(approvedRun(pkg(), dir), dir, undefined, {});
    for (const [file, content] of before) expect(snapshot(dir).get(file), file).toBe(content);
    const tsx = readFileSync(join(dir, "app/blog", slug, "page.tsx"), "utf8");
    expect(tsx).not.toContain('"use client"');
    expect(tsx).toContain('import "../blog.css";');
    expect(tsx).not.toContain("c-site-header"); // the site's own root layout supplies navigation
    expect(existsSync(join(dir, "public/blog", slug, "assets"))).toBe(true);
    expect([...snapshot(dir).keys()].filter((f) => !before.has(f)).every((f) => f.startsWith("app/blog/") || f.startsWith("public/blog/") || f === "blog-registry.json")).toBe(true);
  });

  it("a site with no blog section gets one; a site that already has posts keeps them", () => {
    const dir = copyOfGenerated();
    publishRun(approvedRun(pkg(), dir), dir, undefined, {});
    const second = publishRun(approvedRun([join(fx, "docx")], dir), dir, undefined, {});
    expect(second.replaced.sort()).toEqual(["blog-registry.json", "next/app/blog/page.tsx", "static/blog/index.html"]);
    const index = readFileSync(join(dir, "static/blog/index.html"), "utf8");
    expect(index).toContain("FIXTURE Automating Fee Reminders");
    expect(index).toContain("FIXTURE How Academies Cut Fee Leakage");
    expect(detectSite(dir).blog).toMatchObject({ foreign: [], publishedSlugs: expect.arrayContaining([slug]) });
  });

  it("publishes beside an existing hand-made blog under a different route base", () => {
    const dir = site("static", { ...STATIC, "blog/index.html": "<h1>Hand-made blog</h1>" });
    const run = approvedRun(pkg(), dir, "/articles");
    publishRun(run, dir, undefined, { routeBase: "/articles" });
    expect(readFileSync(join(dir, "blog/index.html"), "utf8")).toBe("<h1>Hand-made blog</h1>");
    expect(readFileSync(join(dir, "articles", slug, "index.html"), "utf8")).toContain(`/articles/${slug}/assets/`);
  });

  it("publishes several blogs of one run together", () => {
    const dir = copyOfGenerated();
    const run = ingest([join(fx, "multi")]);
    previewRun(run, { siteDir: dir });
    for (const blog of loadManifest(run).blogs) approveRun(run, blog.id, "FIXTURE Owner", true);
    expect(publishRun(run, dir, undefined, {}).publications).toHaveLength(2);
    expect(readFileSync(join(dir, "static/blog/index.html"), "utf8")).toMatch(/FIXTURE alpha post[\s\S]*FIXTURE beta post/);
  });
});

// ============================================================ publishing safety

describe("approval is tied to the exact content and media", () => {
  it("cannot approve before a preview of that version exists", () => {
    const run = ingest(pkg());
    expect(() => approveRun(run, undefined, "Owner", true)).toThrow(/no preview of this version exists/);
  });

  it("is invalidated by a change to the content after approval", () => {
    const dir = copyOfGenerated();
    const run = approvedRun(pkg(), dir);
    const path = join(run, "manifest.json");
    writeFileSync(path, readFileSync(path, "utf8").replace("Start small.", "Start big."));
    const before = snapshot(dir);
    expect(() => publishRun(run, dir, undefined, {})).toThrow(/changed after it was approved/);
    expect(snapshot(dir)).toEqual(before);
  });

  it("is invalidated by a change to a media file after approval", () => {
    const dir = copyOfGenerated();
    const run = approvedRun(pkg(), dir);
    const cover = loadManifest(run).blogs[0]!.assets.find((a) => a.role === "cover")!;
    writeFileSync(join(run, cover.path), Buffer.concat([readFileSync(join(run, cover.path)), Buffer.from("tampered")]));
    const before = snapshot(dir);
    expect(() => publishRun(run, dir, undefined, {})).toThrow(/not publishable: 1 blocker/);
    expect(snapshot(dir)).toEqual(before);
    expect(evaluateBlog(run, loadManifest(run), loadManifest(run).blogs[0]!, {}).report.checks.find((c) => c.id === "integrity")).toMatchObject({ status: "fail" });
  });

  it("is invalidated when only the preview is stale", () => {
    const run = approvedRun(pkg());
    rmSync(join(run, "preview"), { recursive: true });
    expect(() => publishRun(run, copyOfGenerated(), undefined, {})).toThrow(/no preview of this version exists/);
  });
});

describe("publishing is a transaction", () => {
  it("can be retried: a second publish of the same version changes nothing", () => {
    const dir = copyOfGenerated();
    const run = approvedRun(pkg(), dir);
    expect(publishRun(run, dir, undefined, {}).state).toBe("published");
    const after = snapshot(dir);
    expect(publishRun(run, dir, undefined, {})).toMatchObject({ state: "unchanged", transactionId: null });
    expect(snapshot(dir)).toEqual(after);
    expect(readdirSync(join(run, "publish-tx"))).toHaveLength(1);
  });

  it("a failure part-way through leaves the site exactly as it was — no partial post", () => {
    const dir = copyOfGenerated();
    publishRun(approvedRun([join(fx, "docx")], dir), dir, undefined, {}); // so the failing publish must also REPLACE shared files
    const before = snapshot(dir);
    const run = approvedRun(pkg(), dir);
    expect(() => publishRun(run, dir, undefined, { beforeCommit: (i) => { if (i === 6) throw new Error("disk full (simulated)"); } })).toThrow(/publishing failed and the site was restored.*disk full/);
    expect(snapshot(dir)).toEqual(before);
    expect(existsSync(join(dir, "static/blog", slug))).toBe(false);
    // …and the same run then publishes cleanly.
    expect(publishRun(run, dir, undefined, {}).state).toBe("published");
  });

  it("recovers a publish that was interrupted mid-commit (process killed)", () => {
    const dir = copyOfGenerated();
    const before = snapshot(dir);
    const run = approvedRun(pkg(), dir);
    const tx = publishRun(run, dir, undefined, {}).transactionId!;
    // Reconstruct the on-disk state of a kill after some renames: journal still "prepared", a stray temp file.
    const journalFile = join(run, "publish-tx", tx, "journal.json");
    writeFileSync(journalFile, readFileSync(journalFile, "utf8").replace('"state": "committed"', '"state": "prepared"'));
    writeFileSync(join(dir, "static/blog", `blog.css.tmp-${tx}`), "half written");
    expect(recoverInterruptedPublish(run)).toBe(tx);
    expect(snapshot(dir)).toEqual(before);
    expect(recoverInterruptedPublish(run)).toBeNull();
  });

  it("rolls a publish back to the byte, and leaves a file edited since publishing alone", () => {
    const dir = copyOfGenerated();
    const before = snapshot(dir);
    const run = approvedRun(pkg(), dir);
    publishRun(run, dir, undefined, { origin: "https://example.test" });
    const result = rollbackRun(run);
    expect(result.kept).toEqual([]);
    expect(snapshot(dir)).toEqual(before);
    expect(() => rollbackRun(run)).toThrow(/no committed publish to roll back/);

    publishRun(run, dir, undefined, {});
    const edited = join(dir, "static/blog", slug, "index.html");
    writeFileSync(edited, "hand-edited after publishing");
    expect(rollbackRun(run).kept.join(" ")).toContain("was changed after it was published and was left as it is");
    expect(readFileSync(edited, "utf8")).toBe("hand-edited after publishing");
  });
});

describe("collisions and replacement", () => {
  let dir = "";
  let v1 = "";
  let v2 = "";
  beforeAll(() => {
    dir = copyOfGenerated();
    v1 = approvedRun(pkg(), dir);
    publishRun(v1, dir, undefined, {});
    const edited = join(root, "package-v2");
    cpSync(join(fx, "package"), edited, { recursive: true });
    writeFileSync(join(edited, "post.md"), readFileSync(join(edited, "post.md"), "utf8").replace("Start small.", "Start small, then grow.").replace("[VIDEO: demo.mp4]", ""));
    v2 = ingest([edited]);
    previewRun(v2, { siteDir: dir });
  });

  it("refuses to replace a published post without an approval that names the replaced version", () => {
    approveRun(v2, undefined, "FIXTURE Owner", true);
    const before = snapshot(dir);
    expect(() => publishRun(v2, dir, undefined, {})).toThrow(/a different post is already published at \/blog\/.*publishing would replace it/);
    expect(() => publishRun(v2, dir, undefined, { replace: true })).toThrow(/does not name the version currently published/);
    expect(snapshot(dir)).toEqual(before);
  });

  it("replaces it once the owner approves the replacement, removes files the new version no longer uses, and can roll back to the old version", () => {
    const before = snapshot(dir);
    const approval = approveRun(v2, undefined, "FIXTURE Owner", true, { replace: true, siteDir: dir });
    expect(approval.replacesDigest).toMatch(/^[0-9a-f]{64}$/);
    publishRun(v2, dir, undefined, { replace: true });
    const page = readFileSync(join(dir, "static/blog", slug, "index.html"), "utf8");
    expect(page).toContain("Start small, then grow.");
    expect(readdirSync(join(dir, "static/blog", slug, "assets")).some((f) => f.endsWith(".mp4"))).toBe(false);
    rollbackRun(v2);
    expect(snapshot(dir)).toEqual(before);
  });

  it("never overwrites a file it did not publish, even with --replace", () => {
    const target = copyOfGenerated();
    files(target, { [`static/blog/${slug}/index.html`]: "<h1>someone else's page</h1>" });
    expect(() => publishRun(approvedRun(pkg()), target, undefined, { replace: true })).toThrow(/cannot be published to, and nothing was written.*did not create/);
    expect(readFileSync(join(target, "static/blog", slug, "index.html"), "utf8")).toBe("<h1>someone else's page</h1>");
  });

  it("detects two blogs of one run aimed at the same route", () => {
    const run = ingest([join(fx, "multi")]);
    const path = join(run, "manifest.json");
    const manifest = JSON.parse(readFileSync(path, "utf8")) as BlogManifest;
    manifest.blogs[1]!.slug = manifest.blogs[0]!.slug;
    writeFileSync(path, JSON.stringify(manifest));
    const target = copyOfGenerated();
    previewRun(run, { siteDir: target });
    for (const blog of manifest.blogs) approveRun(run, blog.id, "FIXTURE Owner", true);
    expect(() => publishRun(run, target, undefined, {})).toThrow(/two blogs in this run would publish to/);
  });
});

// ============================================================ hostile manifests and markup

describe("a manifest is data: it cannot reach outside its run or inject markup", () => {
  const tamper = (run: string, edit: (m: BlogManifest) => void) => {
    const path = join(run, "manifest.json");
    const manifest = JSON.parse(readFileSync(path, "utf8")) as BlogManifest;
    edit(manifest);
    writeFileSync(path, JSON.stringify(manifest));
    return loadManifest(run);
  };

  it("rejects malformed and oversized-shape manifests with a clear reason", () => {
    const run = ingest([join(fx, "txt")]);
    writeFileSync(join(run, "manifest.json"), "{ not json");
    expect(() => loadManifest(run)).toThrow(/is not valid JSON/);
    writeFileSync(join(run, "manifest.json"), JSON.stringify({ schema: "framework:blog-manifest@1", blogs: "nope" }));
    expect(() => loadManifest(run)).toThrow(/not a valid framework:blog-manifest@1 manifest/);
    writeFileSync(join(run, "manifest.json"), JSON.stringify({ schema: "framework:blog-manifest@2" }));
    expect(() => previewRun(run)).toThrow(/not a valid framework:blog-manifest@1/);
  });

  it.each([
    ["a parent-directory path", "../../../etc/hostname"],
    ["an absolute path", "/etc/hostname"],
    ["a path outside assets/", "manifest.json"],
    ["a backslash path", "assets\\..\\..\\secret"],
  ])("blocks an asset with %s — never previewed, never published", (_n, path) => {
    const run = ingest(pkg());
    const manifest = tamper(run, (m) => { m.blogs[0]!.assets.find((a) => a.role === "cover")!.path = path; });
    const { report } = evaluateBlog(run, manifest, manifest.blogs[0]!, {});
    expect(report.readiness.state).toBe("blocked");
    expect(report.checks.find((c) => c.id === "integrity")!.detail).toMatch(/its path (is not a plain path under assets\/|resolves outside)/);
    previewRun(run);
    expect(readdirSync(join(run, "preview", manifest.blogs[0]!.slug)).includes("assets")).toBe(false);
    expect(() => approveRun(run, undefined, "Owner", true)).toThrow(/cannot approve/);
  });

  it("blocks an asset that is a symbolic link to a file outside the run", () => {
    const run = ingest(pkg());
    const secret = join(root, "secret.txt");
    writeFileSync(secret, "PRIVATE-KEY-MATERIAL");
    const manifest = loadManifest(run);
    const cover = manifest.blogs[0]!.assets.find((a) => a.role === "cover")!;
    rmSync(join(run, cover.path));
    symlinkSync(secret, join(run, cover.path));
    const { report } = evaluateBlog(run, manifest, manifest.blogs[0]!, {});
    expect(report.checks.find((c) => c.id === "integrity")!.detail).toContain("is a symbolic link");
    previewRun(run);
    for (const [, content] of snapshot(join(run, "preview"))) expect(Buffer.from(content, "base64").toString()).not.toContain("PRIVATE-KEY-MATERIAL");
  });

  it("drops unsafe link targets at render time, whoever produced the manifest", () => {
    for (const bad of ["javascript:alert(1)", " JaVaScRiPt:alert(1)", "data:text/html,<script>x</script>", "vbscript:x", "//evil.example/x", "file:///etc/passwd", "java\tscript:alert(1)", "relative/path"]) expect(safeHref(bad), bad).toBeNull();
    for (const ok of ["https://example.org/a?b=1#c", "http://example.org", "mailto:a@example.org", "tel:+911234567890", "/pricing", "#section"]) expect(safeHref(ok), ok).toBe(ok);
    const run = ingest(pkg());
    const manifest = tamper(run, (m) => {
      const blog = m.blogs[0]!;
      const para = blog.blocks.find((b) => b.type === "paragraph")!;
      if (para.type === "paragraph") para.inlines = [{ t: "text", text: "click me", href: "javascript:alert(document.cookie)" }];
      const embed = blog.blocks.find((b) => b.type === "embed")!;
      if (embed.type === "embed") embed.mediaId = 'x"><script>alert(1)</script>';
    });
    const page = mapBlogToPage(manifest.blogs[0]!);
    const html = toHtml(renderArticle(page, { mode: "publish" }));
    expect(html).toContain("<p>click me</p>");
    expect(html).not.toMatch(/javascript:|<script|<iframe/);
    expect(html).toContain('<a href="https://youtu.be/dQw4w9WgXcQ">'); // the link survives; the injected player does not
    expect(toJsx(renderArticle(page, { mode: "publish" }))).not.toMatch(/javascript:|<iframe/);
    // …and the report says so rather than passing silently.
    const { report } = evaluateBlog(run, manifest, manifest.blogs[0]!, {});
    expect(report.checks.find((c) => c.id === "links")).toMatchObject({ status: "fail" });
    expect(report.readiness.state).toBe("blocked");
  });

  it("cannot break out of the generated source comment through a document or approver name", () => {
    const dir = copyOfGenerated();
    const run = ingest(pkg());
    tamper(run, (m) => { m.blogs[0]!.documents[0]!.name = "post */ ;require('child_process').exec('id'); /* .md"; });
    previewRun(run, { siteDir: dir });
    approveRun(run, undefined, "Owner */ process.exit(1) /*\nsecond line", true);
    publishRun(run, dir, undefined, {});
    const tsx = readFileSync(join(dir, "next/app/blog", slug, "page.tsx"), "utf8");
    const comment = tsx.slice(0, tsx.indexOf("import type"));
    expect(comment.match(/\*\//g)).toHaveLength(1); // exactly the one that closes the header
    expect(comment.trimEnd().endsWith("*/")).toBe(true);
    expect(comment).toContain("post * / ;require");
  });

  it("keeps the approver's name out of files a web server may serve", () => {
    const dir = site("static", STATIC);
    publishRun(approvedRun(pkg(), dir), dir, undefined, {});
    for (const [file, content] of snapshot(dir)) {
      if (/\.(html|json|css)$/.test(file)) expect(Buffer.from(content, "base64").toString(), file).not.toContain("FIXTURE Owner");
    }
  });
});
