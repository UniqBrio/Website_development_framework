/**
 * SITE DETECTION — what kind of website is this, and may the blog branch write to it?
 *
 * The first version of the branch assumed every target was a generated site
 * (`static/` + `next/`). That assumption was undocumented and unsafe: pointed at
 * anything else it would have created those folders, or overwritten a `/blog`
 * route the site already had. This module replaces the assumption with a
 * measured PROFILE, and an unsupported configuration is REPORTED with its reason
 * — nothing is written to a site the branch does not understand
 * (stack_doctrine.md: absence of a rule is not permission).
 *
 * Supported: a generated site · a Next.js App Router project (TypeScript) · a
 * static HTML site. Everything else is `unsupported`; for those the manifest and
 * the mapping table are the specification (docs/blog/04-layout-mapping-guide.md).
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import type { SiteChrome } from "./publish.js";

export type SiteKind = "generated" | "next-app-router" | "static-html" | "unsupported";

/** Marker carried by every file the blog branch writes, so its own files are recognisable later. */
export const BLOG_GENERATOR = "website-workflow-blog";
export const REGISTRY_FILE = "blog-registry.json";

export interface SiteProfile {
  root: string;
  kind: SiteKind;
  /** Directory that holds static pages (`<root>/static` or `<root>`), or null. */
  staticRoot: string | null;
  /** App Router directory and its public folder, or null. */
  nextAppDir: string | null;
  nextPublicDir: string | null;
  /** Stylesheets a static blog page must link, as root-absolute hrefs, in order. */
  stylesheets: string[];
  /** True when a stylesheet defines the framework's colour tokens (`--color-fg-0`). */
  hasDesignTokens: boolean;
  staticChrome?: SiteChrome;
  nextChrome?: SiteChrome & { usesLink: boolean };
  /** Where the header and footer were found, for the report. */
  chromeSource: string | null;
  blog: {
    routeBase: string;
    /** Existing files under the blog route, relative to the site root. */
    existing: string[];
    /** Existing files there that this branch did NOT write. Any entry blocks publishing. */
    foreign: string[];
    /** Slugs recorded in the site's registry. */
    publishedSlugs: string[];
  };
  facts: string[];
  /** Human-review items that do not block publishing. */
  warnings: string[];
  /** Reasons publishing is refused. Empty = publishable. */
  unsupported: string[];
}

function read(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

function walk(dir: string, acc: string[] = [], depth = 0): string[] {
  if (!existsSync(dir) || depth > 6) return acc;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, acc, depth + 1);
    else acc.push(full);
  }
  return acc;
}

const isOurs = (path: string): boolean => {
  if (/\.(html|tsx|css|json)$/.test(path)) return read(path).slice(0, 1500).includes(BLOG_GENERATOR);
  return false;
};

export function normaliseRouteBase(routeBase: string | undefined): string {
  const raw = routeBase ?? "/blog";
  const clean = raw.replace(/^\/|\/$/g, "");
  if (raw.includes("//") || !/^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/.test(clean)) {
    throw new Error(`route base "${routeBase}" is not a plain lower-case path such as /blog or /resources/articles`);
  }
  return `/${clean}`;
}

function genericChrome(html: string): SiteChrome | undefined {
  const body = /<body\b[^>]*>([\s\S]*)<\/body>/i.exec(html)?.[1] ?? html;
  const header = /<header\b[\s\S]*?<\/header>/i.exec(body)?.[0] ?? "";
  const footers = [...body.matchAll(/<footer\b[\s\S]*?<\/footer>/gi)];
  const footer = footers.length > 0 ? footers[footers.length - 1]![0] : "";
  if (!header && !footer) return undefined;
  const clean = (fragment: string) => fragment.replace(/<script\b[\s\S]*?<\/script>/gi, "").replace(/ aria-current="page"/g, "");
  return { header: clean(header), footer: clean(footer) };
}

function publishedSlugs(root: string): string[] {
  const path = join(root, REGISTRY_FILE);
  if (!existsSync(path)) return [];
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as { posts?: Array<{ slug?: unknown }> };
    return (parsed.posts ?? []).map((p) => String(p.slug ?? "")).filter(Boolean);
  } catch {
    return [];
  }
}

export function detectSite(root: string, routeBaseInput?: string): SiteProfile {
  const routeBase = normaliseRouteBase(routeBaseInput);
  const base = routeBase.slice(1);
  const profile: SiteProfile = {
    root,
    kind: "unsupported",
    staticRoot: null,
    nextAppDir: null,
    nextPublicDir: null,
    stylesheets: [],
    hasDesignTokens: false,
    chromeSource: null,
    blog: { routeBase, existing: [], foreign: [], publishedSlugs: [] },
    facts: [],
    warnings: [],
    unsupported: [],
  };
  if (!existsSync(root) || !statSync(root).isDirectory()) {
    profile.unsupported.push(`${root} is not a directory`);
    return profile;
  }
  profile.blog.publishedSlugs = publishedSlugs(root);
  const pkgText = read(join(root, "package.json"));
  let pkg: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> } = {};
  try {
    pkg = pkgText ? (JSON.parse(pkgText) as typeof pkg) : {};
  } catch {
    profile.warnings.push("package.json is not valid JSON; dependencies could not be read");
  }
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };

  if (existsSync(join(root, "static", "index.html")) && !deps["next"]) {
    // ---- a site produced by src/generation/: static layer + optional Next source
    profile.kind = "generated";
    profile.staticRoot = join(root, "static");
    profile.facts.push("generated site: static layer at static/");
    if (existsSync(join(root, "next", "app"))) {
      profile.nextAppDir = join(root, "next", "app");
      profile.nextPublicDir = join(root, "next", "public");
      profile.facts.push("Next.js App Router source at next/app/");
    }
    const home = read(join(root, "static", "index.html"));
    profile.stylesheets = stylesheetsOf(home);
    const header = /<header class="c-site-header">[\s\S]*?<\/header>/.exec(home)?.[0] ?? "";
    const footer = /<footer class="c-site-footer">[\s\S]*?<\/footer>/.exec(home)?.[0] ?? "";
    if (header || footer) {
      profile.staticChrome = { header: header.replace(/ aria-current="page"/g, ""), footer };
      profile.chromeSource = "static/index.html";
    }
    const nextHome = read(join(root, "next", "app", "page.tsx"));
    const nh = /<header className="c-site-header">[\s\S]*?<\/header>/.exec(nextHome)?.[0] ?? "";
    const nf = /<footer className="c-site-footer">[\s\S]*?<\/footer>/.exec(nextHome)?.[0] ?? "";
    if (nh || nf) profile.nextChrome = { header: nh.replace(/ aria-current="page"/g, ""), footer: nf, usesLink: /<Link\b/.test(nh + nf) };
    profile.hasDesignTokens = hasTokens(profile.stylesheets, profile.staticRoot);
  } else if (deps["next"]) {
    // ---- a Next.js project at the root
    const appDir = [join(root, "app"), join(root, "src", "app")].find((d) => existsSync(d));
    const pagesDir = [join(root, "pages"), join(root, "src", "pages")].find((d) => existsSync(d));
    if (!appDir) {
      profile.unsupported.push(
        pagesDir ? "this is a Next.js Pages Router project; the blog branch emits App Router server components only" : "a Next.js dependency was found but no app/ directory",
      );
      return profile;
    }
    profile.kind = "next-app-router";
    profile.nextAppDir = appDir;
    profile.nextPublicDir = join(root, "public");
    profile.facts.push(`Next.js App Router project (app directory: ${relative(root, appDir)})`);
    const layout = ["layout.tsx", "layout.jsx", "layout.js"].find((f) => existsSync(join(appDir, f)));
    if (!layout) profile.unsupported.push("the app directory has no root layout; a blog page would have no <html> shell");
    else {
      profile.chromeSource = `${relative(root, join(appDir, layout))} (the site's own root layout wraps the blog page)`;
      if (layout !== "layout.tsx") profile.unsupported.push("the project is not TypeScript (root layout is not layout.tsx); the branch emits .tsx pages and will not add TypeScript to a project");
    }
    if (!existsSync(join(root, "tsconfig.json"))) profile.unsupported.push("no tsconfig.json: the branch emits .tsx pages and will not add TypeScript to a project");
    const config = ["next.config.js", "next.config.mjs", "next.config.ts", "next.config.cjs"].map((f) => read(join(root, f))).join("\n");
    if (/\bbasePath\s*:/.test(config)) profile.unsupported.push("next.config sets basePath; published asset and route URLs assume the site is served from the domain root");
    if (/\bi18n\s*:/.test(config)) profile.unsupported.push("next.config configures i18n routing; the branch publishes one un-localised route");
    const dynamicRoot = readdirSync(appDir).filter((d) => /^\[.*\]$/.test(d) && statSync(join(appDir, d)).isDirectory());
    if (dynamicRoot.length > 0) profile.warnings.push(`the app root has dynamic segment(s) ${dynamicRoot.join(", ")}; confirm ${routeBase} is not shadowed by them`);
    const cms = ["contentlayer", "contentlayer2", "@next/mdx", "next-mdx-remote", "@sanity/client", "next-sanity", "contentful", "@contentful/rich-text-react-renderer", "@payloadcms/next", "@strapi/strapi", "@keystatic/core", "tinacms", "@prismicio/client", "@storyblok/react", "velite"].filter((d) => d in deps);
    if (cms.length > 0) {
      profile.unsupported.push(
        `the site already has a content system (${cms.join(", ")}); publishing generated pages beside it would create a second content source. Map the manifest onto that system instead`,
      );
    }
    const globals = [join(appDir, "globals.css"), join(root, "styles", "globals.css")].map(read).join("\n");
    profile.hasDesignTokens = /--color-fg-0\s*:/.test(globals);
  } else if (existsSync(join(root, "index.html"))) {
    // ---- a plain static HTML site
    profile.kind = "static-html";
    profile.staticRoot = root;
    profile.facts.push("static HTML site (index.html at the root)");
    const home = read(join(root, "index.html"));
    profile.stylesheets = stylesheetsOf(home);
    if (profile.stylesheets.length === 0) profile.warnings.push("the home page links no local stylesheet; the blog page will use only the blog stylesheet's fallbacks");
    profile.staticChrome = genericChrome(home);
    profile.chromeSource = profile.staticChrome ? "index.html (first <header>, last <footer>)" : null;
    if (!profile.staticChrome) profile.warnings.push("no <header> or <footer> element was found on the home page; the blog page is published without site navigation");
    if (/<base\b[^>]*href=/i.test(home)) profile.unsupported.push("the home page sets <base href>; published URLs assume the site is served from the domain root");
    profile.hasDesignTokens = hasTokens(profile.stylesheets, root);
  } else {
    profile.unsupported.push("no supported site was found here: expected a generated site (static/index.html), a Next.js App Router project (package.json with next, and app/), or a static HTML site (index.html)");
    return profile;
  }

  if (!profile.hasDesignTokens) {
    profile.warnings.push("the site's stylesheet does not define the framework's design tokens (--color-fg-0 …); blog components fall back to system colours and relative spacing, and inherit the site's own fonts and link colours");
  }

  // ---- an existing blog route: ours, or someone else's?
  const dirs = [profile.staticRoot ? join(profile.staticRoot, base) : null, profile.nextAppDir ? join(profile.nextAppDir, base) : null].filter((d): d is string => d !== null);
  for (const dir of dirs) {
    for (const file of walk(dir)) {
      const rel = relative(root, file);
      profile.blog.existing.push(rel);
      const slugDir = relative(dir, file).split(/[\\/]/)[0] ?? "";
      const inPublishedPost = profile.blog.publishedSlugs.includes(slugDir);
      const isAsset = /[\\/]assets[\\/]/.test(file);
      if (!(isOurs(file) || (inPublishedPost && isAsset))) profile.blog.foreign.push(rel);
    }
  }
  if (profile.blog.foreign.length > 0) {
    profile.unsupported.push(
      `the site already has content at ${routeBase} that this workflow did not create (${profile.blog.foreign.slice(0, 4).join(", ")}${profile.blog.foreign.length > 4 ? ", …" : ""}). It is never overwritten: publish under another --route-base, or map the manifest onto the existing blog`,
    );
  } else if (profile.blog.existing.length > 0) {
    profile.facts.push(`${routeBase} already holds ${profile.blog.publishedSlugs.length} post(s) published by this workflow`);
  } else {
    profile.facts.push(`no ${routeBase} route exists yet; publishing will create it`);
  }
  return profile;
}

function stylesheetsOf(html: string): string[] {
  const head = /<head\b[^>]*>([\s\S]*?)<\/head>/i.exec(html)?.[1] ?? html;
  const out: string[] = [];
  for (const tag of head.match(/<link\b[^>]*>/gi) ?? []) {
    if (!/rel\s*=\s*["']?stylesheet/i.test(tag)) continue;
    const href = /href\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
    if (!href) continue;
    if (/^(https?:)?\/\//i.test(href)) out.push(href);
    else out.push(`/${href.replace(/^\.?\/+/, "")}`);
  }
  return out;
}

function hasTokens(hrefs: string[], staticRoot: string | null): boolean {
  if (!staticRoot) return false;
  return hrefs.some((href) => href.startsWith("/") && !href.startsWith("//") && /--color-fg-0\s*:/.test(read(join(staticRoot, href.split("?")[0]!))));
}

export function renderSiteProfileMarkdown(profile: SiteProfile): string {
  const state = profile.unsupported.length > 0 ? "NOT SUPPORTED — nothing will be written" : "SUPPORTED";
  return [
    "# Website compatibility",
    "",
    `Site kind: **${profile.kind}** · publishing: **${state}** · blog route: \`${profile.blog.routeBase}\``,
    "",
    ...(profile.unsupported.length > 0 ? ["## Why publishing is refused", "", ...profile.unsupported.map((u) => `- ${u}`), ""] : []),
    "## Detected",
    "",
    ...profile.facts.map((f) => `- ${f}`),
    `- static pages: ${profile.staticRoot ? "yes" : "no"} · Next.js App Router pages: ${profile.nextAppDir ? "yes" : "no"}`,
    `- stylesheets linked by a static blog page: ${profile.stylesheets.join(", ") || "none"}`,
    `- framework design tokens present: ${profile.hasDesignTokens ? "yes" : "no"}`,
    `- site header/footer source: ${profile.chromeSource ?? "none found"}`,
    "",
    ...(profile.warnings.length > 0 ? ["## To review", "", ...profile.warnings.map((w) => `- ${w}`), ""] : []),
  ].join("\n");
}
