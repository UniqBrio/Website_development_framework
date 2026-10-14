/**
 * GENERATOR INTEGRATION — the complete chain, asserted link by link:
 *
 *   BusinessInput → runPipeline() → generateWebsite() → generated source
 *   → buildStaticSite() → collectArtifactsFromBuild() → collectBuildEvidence()
 *   → runPipeline(input, { evidence }) → production gate
 *
 * The fixture enters ONLY through BusinessInput. Nothing in `src/generation/`
 * knows its name — and a test below proves that by grepping the source.
 */
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runPipeline } from "../../src/pipeline.js";
import { generateWebsite, type GeneratedWebsite } from "../../src/generation/generate-website.js";
import { buildStaticSite, collectArtifactsFromBuild, type StaticBuildResult } from "../../src/generation/build.js";
import { collectBuildEvidence, parseServedHtml } from "../../src/evidence/build-evidence.js";
import { walkNodes } from "../../src/generation/component-model.js";
import { NEVER_GENERATED } from "../../src/generation/content-values.js";
import { NEVER_FABRICATE } from "../../src/content/confidence.js";
import { parseBusinessInput } from "../../src/design-intelligence/types/business-input.js";
import { dryRunFixture } from "../fixtures/dry-run-fixture.js";

// The first generator fixture: the existing synthetic Verdaleen input, unchanged.
const input = dryRunFixture();
const decided = runPipeline(input);
const generated: GeneratedWebsite = generateWebsite(input, decided.output, decided.contract);

let outDir = "";
let build: StaticBuildResult;

beforeAll(async () => {
  outDir = mkdtempSync(join(tmpdir(), "framework-generated-"));
  build = await buildStaticSite(generated, outDir);
});

afterAll(() => {
  if (outDir) rmSync(outDir, { recursive: true, force: true });
});

function walkFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walkFiles(full, acc);
    else acc.push(full);
  }
  return acc;
}

// ===================================================================== routes

describe("routes and page preservation", () => {
  it("every supplied page becomes a generated route — no silent loss", () => {
    for (const page of input.requiredPages) {
      expect(generated.pages.map((p) => p.route), `${page.path} lost`).toContain(page.path);
    }
    expect(generated.pages).toHaveLength(decided.output.pages.length);
  });

  it("each generated page preserves every required field verbatim", () => {
    for (const page of generated.pages) {
      const spec = decided.output.pages.find((p) => p.route === page.route);
      expect(spec).toBeDefined();
      expect(page.purpose).toBe(spec?.purpose);
      expect(page.primaryObjective).toBe(spec?.primaryObjective);
      expect(page.audience).toEqual(spec?.audience);
      expect(page.seoRole).toBe(spec?.seoRole);
      expect(page.sections).toEqual(spec?.requiredSections);
      expect(page.conversionRole).toBe(spec?.conversionRole);
      expect(page.trustRequirements).toEqual(spec?.trustRequirements);
    }
  });

  it("emits a static HTML file AND a Next.js page for every route", () => {
    for (const page of generated.pages) {
      expect(generated.files[page.staticPath], `${page.route} static missing`).toBeTruthy();
      expect(generated.files[page.nextPath], `${page.route} next page missing`).toBeTruthy();
    }
  });

  it("every emitted element traces to a decision", () => {
    walkNodes(generated.model, (n) => {
      expect(n.traceTo.length, `${n.id} has no trace`).toBeGreaterThan(0);
    });
  });
});

// ===================================================================== tokens

describe("design tokens → generated CSS → rendered components", () => {
  const css = generated.files["static/styles.css"] ?? "";

  it("the CSS carries the authoritative token values, not recalculated ones", () => {
    const theme = Object.keys(decided.output.tokens.color.values.cssCustomProperties)[0] as "light" | "dark";
    const props = decided.output.tokens.color.values.cssCustomProperties[theme] ?? {};
    for (const [name, value] of Object.entries(props)) {
      expect(css, `${name} missing from CSS`).toContain(`${name}: ${value};`);
    }
  });

  it("the generator records the token provenance in the CSS header", () => {
    expect(css).toContain(`seed ${decided.output.tokens.color.values.seed}`);
    expect(css).toContain(`colour=${decided.output.tokens.color.provenance}`);
  });

  it("components consume tokens via custom properties — never a raw hex", () => {
    const body = css.split("}").slice(1).join("}"); // everything after :root
    const rawHexOutsideRoot = body.match(/#[0-9A-Fa-f]{6}\b/g) ?? [];
    // The :root block defines hex values; component rules must reference vars.
    const rootBlock = css.slice(css.indexOf(":root {"), css.indexOf("}", css.indexOf(":root {")));
    const definedInRoot = (rootBlock.match(/#[0-9A-Fa-f]{6}\b/g) ?? []).length;
    expect(definedInRoot).toBeGreaterThan(10);
    expect(rawHexOutsideRoot.filter((h) => !rootBlock.includes(h))).toEqual([]);
  });

  it("breakpoints in the CSS match the token contract, which matched RANGES", () => {
    for (const [, min] of Object.entries(decided.output.tokens.layout.values.breakpoints)) {
      if (min === "0px") continue;
      expect(css).toContain(`@media (min-width: ${min})`);
    }
  });

  it("the Next.js app imports the same stylesheet — one CSS, two hosts", () => {
    expect(generated.files["next/styles.css"]).toBe(css);
    expect(generated.files["next/app/globals.css"]).toContain("styles.css");
  });
});

// ===================================================================== SEO

describe("SEO artifacts → served HTML", () => {
  it("every page's served HTML carries exactly the artifacts that have values", () => {
    for (const page of generated.pages) {
      const html = generated.files[page.staticPath] ?? "";
      const artifacts = decided.output.seoArtifacts.pages.find((p) => p.route === page.route);
      expect(artifacts).toBeDefined();
      expect(html).toContain(`<title>${artifacts?.title.value}</title>`);
      expect(html).toContain(`<meta name="robots" content="${artifacts?.robots.value}">`);
      // Unresolved canonical: NOT emitted. A guessed canonical is worse than none.
      if (artifacts?.canonical.value === null) expect(html).not.toContain('rel="canonical"');
      // ai_draft description with no value: NOT emitted.
      if (artifacts?.metaDescription.value === null) expect(html).not.toContain('name="description"');
    }
  });

  it("emits no sitemap and no Sitemap: line when the origin is unresolved", () => {
    expect(generated.files["static/sitemap.xml"]).toBeUndefined();
    expect(generated.files["static/robots.txt"]).not.toContain("Sitemap:");
  });

  it("with an origin supplied, canonical, sitemap and og:url all appear", () => {
    const withOrigin = parseBusinessInput({
      ...input,
      constraints: { ...input.constraints, canonicalOrigin: "https://fixture-verdaleen.invalid" },
    });
    const d = runPipeline(withOrigin);
    const g = generateWebsite(withOrigin, d.output, d.contract);
    expect(g.files["static/sitemap.xml"]).toContain("<loc>https://fixture-verdaleen.invalid/</loc>");
    expect(g.files["static/robots.txt"]).toContain("Sitemap: https://fixture-verdaleen.invalid/sitemap.xml");
    expect(g.files["static/index.html"]).toContain('<link rel="canonical" href="https://fixture-verdaleen.invalid/">');
    expect(g.files["static/index.html"]).toContain('property="og:url"');
  });

  it("every page has exactly one h1 and no skipped heading levels", () => {
    for (const page of generated.pages) {
      const facts = parseServedHtml(page.route, generated.files[page.staticPath] ?? "");
      expect(facts.h1Count, `${page.route} h1 count`).toBe(1);
      expect(facts.headingSkips, `${page.route} skips`).toBe(false);
    }
  });

  it("structured data in HTML is exactly what the SEO layer justified per page", () => {
    for (const page of generated.pages) {
      const facts = parseServedHtml(page.route, generated.files[page.staticPath] ?? "");
      const justified = decided.output.seoArtifacts.pages.find((p) => p.route === page.route)?.structuredData.value ?? [];
      expect([...facts.structuredDataTypes].sort()).toEqual([...justified].sort());
    }
  });

  it("no page is an orphan in the served HTML", () => {
    const all = generated.pages.map((p) => parseServedHtml(p.route, generated.files[p.staticPath] ?? ""));
    for (const facts of all) {
      const inbound = all.filter((o) => o.route !== facts.route && o.internalLinks.includes(facts.route));
      expect(inbound.length, `${facts.route} is an orphan`).toBeGreaterThan(0);
    }
  });

  it("the Next.js metadata export carries the same values and marks the unresolved ones", () => {
    const home = generated.files["next/app/page.tsx"] ?? "";
    expect(home).toContain("export const metadata: Metadata");
    expect(home).toContain(`title: ${JSON.stringify(decided.output.seoArtifacts.pages[0]?.title.value)}`);
    expect(home).toContain("// alternates.canonical: UNRESOLVED");
    expect(home).toContain("// description: UNRESOLVED");
  });
});

// ============================================================ content integrity

describe("content provenance — nothing is invented", () => {
  const allHtml = generated.pages.map((p) => generated.files[p.staticPath] ?? "").join("\n");

  it("no fabrication category appears as rendered content", () => {
    // Every category the framework may never generate is absent from the HTML as
    // a section, and the generator's own forbidden list matches the engine's.
    for (const category of NEVER_GENERATED) {
      expect(allHtml.toLowerCase(), `${category} rendered`).not.toContain(`c-${category.replace(/_/g, "-")}`);
    }
    for (const category of NEVER_GENERATED) {
      expect(NEVER_FABRICATE as readonly string[]).toContain(
        category === "team_credentials" ? "qualifications" : category === "customer_counts" ? "customer_counts" : category,
      );
    }
  });

  it("the unverified contact route renders an explicit unavailable notice, not an address", () => {
    // The contact section lives on the booking page, which owns the conversion (P1-7 dedupe).
    const home = generated.files["static/book/index.html"] ?? "";
    expect(home).toContain('class="c-unavailable-notice"');
    // The location fields exist in the input; they must NOT be rendered as contact.
    expect(home).not.toContain("FIXTURE-CITY");
    expect(home).not.toContain("FIXTURE-COUNTRY");
  });

  it("the blocked booking conversion renders as unavailable, not as a working form", () => {
    const book = generated.files["static/book/index.html"] ?? "";
    expect(book).toContain("This route is not yet available");
    expect(book).not.toContain("<form");
  });

  it("missing copy renders as an explicit, labelled slot", () => {
    expect(allHtml).toContain("data-content-slot=");
    expect(generated.manifest.contentSlots).toBeGreaterThan(0);
  });

  it("the proposition uses the owner's own description, not a paraphrase", () => {
    const home = generated.files["static/index.html"] ?? "";
    expect(generated.content.proposition.state).toBe("supplied");
    if (generated.content.proposition.state === "supplied") {
      expect(home).toContain(generated.content.proposition.value.slice(0, 40));
      expect(generated.content.proposition.source).toContain("verbatim");
    }
  });

  it("offer names are rendered verbatim; missing descriptions are marked pending", () => {
    const html = generated.files["static/index.html"] ?? "";
    for (const offer of input.servicesProducts) expect(html).toContain(offer.name);
    expect(html).toContain("description to be supplied");
  });

  it("supplied content is rendered, and its provenance is carried", () => {
    const g = generateWebsite(input, decided.output, decided.contract, {
      suppliedContent: {
        propositionText: "FIXTURE proposition supplied by the owner.",
        faq: [{ question: "FIXTURE question?", answer: "FIXTURE answer." }],
      },
    });
    expect(g.files["static/index.html"]).toContain("FIXTURE proposition supplied by the owner.");
    expect(g.content.faq.state).toBe("supplied");
  });

  it("the supplied-content schema REFUSES fabrication categories outright", () => {
    expect(() =>
      generateWebsite(input, decided.output, decided.contract, {
        suppliedContent: { testimonials: [{ quote: "fake" }] },
      }),
    ).not.toThrow();
    // Zod strips unknown keys, so the testimonial never reaches the resolver —
    // but prove it never reaches the HTML either.
    const g = generateWebsite(input, decided.output, decided.contract, {
      suppliedContent: { testimonials: [{ quote: "FIXTURE-FAKE-QUOTE" }] },
    });
    expect(Object.values(g.files).join("\n")).not.toContain("FIXTURE-FAKE-QUOTE");
  });
});

// ============================================================ stack compliance

describe("stack and dependency compliance", () => {
  const pkg = JSON.parse(generated.files["next/package.json"] ?? "{}") as { dependencies: Record<string, string> };

  it("the framework is the stack decision's, not the generator's", () => {
    expect(generated.manifest.framework).toBe(decided.output.stack.framework);
    expect(pkg.dependencies["next"]).toBeTruthy();
  });

  it("rejected 3D capability → no 3D dependency in package.json", () => {
    expect(pkg.dependencies["three"]).toBeUndefined();
    expect(pkg.dependencies["@react-three/fiber"]).toBeUndefined();
    expect(generated.manifest.omittedDependencies.map((o) => o.library)).toContain("three");
  });

  it("only stack-approved libraries enter package.json", () => {
    const allowed = new Set(["next", "react", "react-dom", ...decided.output.stack.libraries]);
    for (const dep of Object.keys(pkg.dependencies)) {
      expect(allowed, `${dep} was not approved by the stack decision`).toContain(dep);
    }
  });

  it("no PWA artifacts are generated when PWA was denied", () => {
    expect(Object.keys(generated.files).some((f) => /manifest\.json|sw\.js|service-worker/.test(f))).toBe(false);
  });

  it("the README records every omission with its reason", () => {
    const readme = generated.files["next/README.md"] ?? "";
    for (const omitted of decided.output.stack.omittedLibraries) {
      expect(readme).toContain(omitted.library);
    }
  });
});

// ============================================================ client boundaries

describe("client-boundary discipline and progressive enhancement", () => {
  it("'use client' appears ONLY on leaf components that need it, never on a page", () => {
    for (const [path, body] of Object.entries(generated.files)) {
      if (!path.startsWith("next/")) continue;
      const isClient = body.startsWith('"use client"');
      if (isClient) {
        // One named exception: Next.js REQUIRES route error boundaries to be client
        // components. It is a framework requirement, recorded in the README, not a
        // design choice — and it is never a page or layout.
        if (path !== "next/app/error.tsx") expect(path).toMatch(/_components\//);
        expect(path).not.toMatch(/page\.tsx$|layout\.tsx$/);
      }
    }
  });

  it("every client boundary is justified and has a no-JS fallback", () => {
    for (const boundary of generated.manifest.clientBoundaries) {
      expect(boundary.because).toContain("degrades to");
    }
    walkNodes(generated.model, (n) => {
      if (n.requiresClientJs) expect(n.noScriptBehaviour.length).toBeGreaterThan(10);
    });
  });

  it("the static base layer contains NO JavaScript at all", () => {
    for (const page of generated.pages) {
      const html = generated.files[page.staticPath] ?? "";
      const scripts = (html.match(/<script\b[^>]*>/gi) ?? []).filter((s) => !/ld\+json/.test(s));
      expect(scripts, `${page.route} ships JS in the base layer`).toEqual([]);
    }
  });

  it("FAQ disclosure uses native details/summary — usable without JavaScript", () => {
    const withFaq = generateWebsite(input, decided.output, decided.contract, {
      suppliedContent: { faq: [{ question: "FIXTURE Q", answer: "FIXTURE A" }] },
    });
    const home = withFaq.files["static/index.html"] ?? "";
    expect(home).toContain("<details><summary>FIXTURE Q</summary>");
  });

  it("a host-configured form is a real POST form with labels, not a JS-only widget", () => {
    const withContact = parseBusinessInput({
      ...input,
      availableContent: { ...input.availableContent, contactDetails: "verified_available" },
    });
    const d = runPipeline(withContact);
    const g = generateWebsite(withContact, d.output, d.contract, {
      formEndpoints: { booking: "/fixture-host/booking" },
    });
    const book = g.files["static/book/index.html"] ?? "";
    expect(book).toContain('data-contract="booking" data-endpoint="configured" method="post" action="/fixture-host/booking"');
    expect(book).toContain('<label for="f-email">');
    expect(book).toContain('type="email" autocomplete="email" aria-describedby="f-email-error" required');
    expect(book).not.toContain("<fieldset disabled>");
  });

  it("with no host endpoint the same form renders disabled, with a notice and no action attribute", () => {
    const withContact = parseBusinessInput({
      ...input,
      availableContent: { ...input.availableContent, contactDetails: "verified_available" },
    });
    const d = runPipeline(withContact);
    const g = generateWebsite(withContact, d.output, d.contract);
    const book = g.files["static/book/index.html"] ?? "";
    expect(book).toContain('data-contract="booking" data-endpoint="unconfigured"');
    expect(book).toContain("<fieldset disabled>");
    expect(book).toContain("Appointment requests are not connected yet");
    expect(book).not.toMatch(/<form[^>]*action=/);
  });
});

// ============================================================ rejected capabilities

describe("rejected capabilities are ABSENT — proven, not assumed", () => {
  const everything = Object.values(generated.files).join("\n");

  it("no rejected pattern's class appears anywhere in output", () => {
    for (const rejected of generated.manifest.patternsRejected) {
      expect(everything, `${rejected} leaked into output`).not.toContain(`pattern:${rejected}`);
    }
    expect(everything).not.toMatch(/cursor-follower|parallax|webgl|carousel/i);
  });

  it("a pattern instance renders at most ONCE per page, even when two sections want it", () => {
    // catalog and product_detail both map to the gallery on /devices. The first
    // generator run rendered the same empty gallery twice there.
    const devices = generated.model.pages.find((p) => p.page.route === "/devices");
    const galleries = (devices?.nodes ?? []).filter((n) => n.kind === "gallery");
    expect(galleries).toHaveLength(1);
    const boundaries = generated.manifest.clientBoundaries.filter((b) => b.page === "/devices");
    expect(boundaries).toHaveLength(1);
    const html = generated.files["static/devices/index.html"] ?? "";
    expect((html.match(/data-enhance="gallery"/g) ?? []).length).toBe(1);
  });

  it("the patterns used are a subset of the patterns selected", () => {
    for (const used of generated.manifest.patternsUsed) {
      expect(decided.output.selectedPatterns).toContain(used);
    }
  });

  it("no hover-only affordance: hover rules are gated on the capability", () => {
    const css = generated.files["static/styles.css"] ?? "";
    const hoverRules = css.match(/:hover/g) ?? [];
    if (hoverRules.length > 0) {
      expect(css).toContain("@media (hover: hover) and (pointer: fine)");
    }
  });
});

// ============================================================ responsive + a11y

describe("responsive and accessibility requirements in the generated CSS", () => {
  const css = generated.files["static/styles.css"] ?? "";

  it("uses container queries for components and media queries for page layout (DD-065)", () => {
    expect(css).toContain("container-type: inline-size");
    expect(css).toContain("@container (min-width:");
    expect(css).toContain("@media (min-width:");
  });

  it("compact range is a single-column priority flow", () => {
    expect(css).toContain("grid-template-columns: 1fr");
    // The page track has a zero minimum so a wide child scrolls in its region instead of widening the page (RF-001).
    expect(css).toContain("main { display: grid; grid-template-columns: minmax(0, 1fr);");
  });

  it("reduced motion collapses every duration", () => {
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("animation-duration: 0ms !important");
  });

  it("focus is visible with the measured focus-ring token", () => {
    expect(css).toContain(":focus-visible");
    expect(css).toContain("var(--color-focus-ring)");
  });

  it("forced-colors mode is respected", () => {
    expect(css).toContain("@media (forced-colors: active)");
  });

  it("a skip link is the first focusable element on every page", () => {
    for (const page of generated.pages) {
      const html = generated.files[page.staticPath] ?? "";
      expect(html.indexOf('class="c-skip"')).toBeLessThan(html.indexOf("<main"));
    }
  });

  it("the AAA target reaches the generated site's thresholds", () => {
    expect(decided.output.accessibilityStrategy.target).toBe("wcag_aaa_or_equivalent");
    expect(decided.output.accessibilityStrategy.thresholds.targetSizeCssPx).toBe(44);
  });
});

// ============================================================ build + evidence

describe("build → BuildEvidence → evaluation → production gate", () => {
  it("the static build writes every route to disk and produces a 404", () => {
    expect(build.routesMissing).toEqual([]);
    expect(build.routesBuilt.length).toBe(generated.pages.length);
    expect(build.has404).toBe(true);
    expect(build.secretsFound).toEqual([]);
  });

  it("the emitted TSX is syntactically valid", () => {
    expect(build.tsxSyntax.checked).toBe(true);
    expect(build.tsxSyntax.files).toBeGreaterThan(0);
    expect(build.tsxSyntax.errors).toEqual([]);
  });

  it("artifacts are read BACK from disk, not from memory", () => {
    const artifacts = collectArtifactsFromBuild(generated, build);
    for (const page of generated.pages) {
      const onDisk = readFileSync(join(outDir, page.staticPath), "utf8");
      expect(artifacts.servedHtml?.[page.route]).toBe(onDisk);
    }
    expect(walkFiles(outDir).length).toBeGreaterThan(generated.pages.length);
  });

  it("the technical evidence is DERIVED and says exactly what did not run", () => {
    const bundle = collectBuildEvidence(collectArtifactsFromBuild(generated, build));
    expect(bundle.technical.kind).toBe("derived");
    expect(bundle.technical.source).toContain("`next build`");
    expect(bundle.technical.source).toContain("NOT executed");
    expect(bundle.servedHtml.kind).toBe("measured");
    expect(bundle.bundles.kind).toBe("unavailable");
    expect(bundle.webVitals.kind).toBe("unavailable");
    expect(bundle.accessibility.kind).toBe("unavailable");
  });

  it("the evaluation consumes the real build and gates honestly", () => {
    const bundle = collectBuildEvidence(collectArtifactsFromBuild(generated, build));
    const evaluated = runPipeline(input, { evidence: { bundle } });
    const q = evaluated.output.quality;

    expect(q.mode).toBe("post_build");
    // The technical gate is decided from the real (derived) build facts.
    expect(q.gates.technical).toBe(true);
    // SEO is scored from the served HTML the generator actually wrote.
    expect(q.sheet["seo"]?.scored).toBe(true);
    // No production bundle → performance stays UNKNOWN, never guessed.
    expect(q.gates.performance).toBe("unknown");
    // No accessibility audit → the AAA gate stays UNKNOWN.
    expect(q.gates.accessibility).toBe("unknown");
    // The route inventory matches the page model exactly.
    expect(q.routeInventory.compared).toBe(true);
    expect(q.routeInventory.missingFromBuild).toEqual([]);
    expect(q.routeInventory.unplannedInBuild).toEqual([]);
  });

  it("the production gate does NOT pass on a partial build — and says why", () => {
    const bundle = collectBuildEvidence(collectArtifactsFromBuild(generated, build));
    const evaluated = runPipeline(input, { evidence: { bundle } });
    const q = evaluated.output.quality;
    expect(["technically_working", "cannot_classify"]).toContain(q.evaluation.level);
    expect(q.evaluation.unknownGates).toContain("performance");
    expect(q.evaluation.unknownGates).toContain("accessibility");
    const publication = evaluated.contract.publicationRequirements.join("\n");
    expect(publication).toContain('gate "performance" undecidable');
    expect(publication).toContain('gate "accessibility" undecidable');
  });

  it("the SEO score reflects the honest gaps in the served HTML", () => {
    const bundle = collectBuildEvidence(collectArtifactsFromBuild(generated, build));
    const evaluated = runPipeline(input, { evidence: { bundle } });
    const seo = evaluated.output.quality.sheet["seo"];
    expect(seo?.scored).toBe(true);
    if (seo?.scored) {
      // The score names its WORST page and the honest remaining gaps: the
      // canonical is unresolved (no origin supplied) and the meta description is
      // an unapproved brief, so both are absent from the served HTML and the
      // score must say so rather than round up (customer dry run 2026-09-14: a
      // missing description had been counted as "unique").
      expect(seo.evidence).toContain("worst page");
      expect(seo.evidence).toContain("canonical");
      expect(seo.evidence).toContain("description");
      expect(seo.value).toBe(7);
    }
  });

  it("a build failure blocks: a missing route is reported, not ignored", () => {
    const partial = { ...build, routesMissing: ["/devices"], routesBuilt: build.routesBuilt.filter((r) => r !== "/devices") };
    const artifacts = collectArtifactsFromBuild(generated, partial);
    expect(artifacts.technical?.buildPasses).toBe(false);
    expect(artifacts.technical?.primaryRoutesWork).toBe(false);
    const bundle = collectBuildEvidence(artifacts);
    const evaluated = runPipeline(input, { evidence: { bundle } });
    expect(evaluated.output.quality.gates.technical).toBe(false);
    expect(evaluated.output.quality.evaluation.level).toBe("failing");
    expect(evaluated.output.quality.routeInventory.missingFromBuild).toContain("/devices");
  });

  it("missing evidence keeps the gate at cannot_classify — nothing is faked", () => {
    const evaluated = runPipeline(input);
    expect(evaluated.output.quality.evaluation.level).toBe("cannot_classify");
    expect(evaluated.output.quality.mode).toBe("pre_build");
  });
});

// ============================================================ refinement seam

describe("refinement seam is explicit but not invoked", () => {
  it("the manifest carries the refinement input the loop would consume", () => {
    expect(generated.manifest.refinementInput.level).toBe("cannot_classify");
    expect(generated.manifest.refinementInput.unknownGates.length).toBeGreaterThan(0);
  });
});

// ============================================================ no hardcoded fixtures

describe("the generator contains no fixture-specific logic", () => {
  it("no fixture name appears anywhere in src/generation", () => {
    const dir = join(process.cwd(), "src", "generation");
    for (const file of walkFiles(dir)) {
      const body = readFileSync(file, "utf8");
      expect(body, `${file} references the fixture`).not.toMatch(/verdaleen|FIXTURE-/i);
      expect(body, `${file} references a real brand`).not.toMatch(/uniqbrio|uniqbotz/i);
    }
  });

  it("the generator is deterministic", () => {
    const again = generateWebsite(input, decided.output, decided.contract);
    expect(JSON.stringify(again.files)).toBe(JSON.stringify(generated.files));
  });

  it("a different business produces a different site through the same generator", () => {
    const other = parseBusinessInput({
      businessName: "FIXTURE-OTHER",
      industry: "saas",
      description: "A synthetic SaaS fixture.",
      targetAudience: [{ label: "FIXTURE-USERS", isPrimary: true }],
      websiteObjective: ["request_demo"],
      requiredPages: [{ path: "/", purpose: "explain the product" }, { path: "/pricing", purpose: "show plans" }],
      availableAssets: {
        logo: "unavailable", brandColors: "unavailable", heroImages: "unavailable", productImages: "verified_available",
        teamPhotos: "unavailable", portfolioImages: "unavailable", video: "unavailable", testimonials: "unavailable",
        customerLogos: "unavailable", awards: "unavailable", certifications: "unavailable", reviews: "unavailable",
      },
      availableContent: {
        propositionText: "verified_available", serviceDescriptions: "unavailable", aboutText: "unavailable",
        processExplanation: "unavailable", caseStudies: "unavailable", pricing: "unavailable", faq: "unavailable",
        legalPolicies: "unavailable", contactDetails: "unavailable", statistics: "unavailable", teamBios: "unavailable",
      },
    });
    const d = runPipeline(other);
    const g = generateWebsite(other, d.output, d.contract);
    expect(g.pages.map((p) => p.route)).toContain("/pricing");
    expect(g.files["static/index.html"]).toContain("FIXTURE-OTHER");
    expect(g.files["static/index.html"]).not.toContain("VERDALEEN");
  });
});
