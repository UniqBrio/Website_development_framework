/**
 * CROSS-SYSTEM INTEGRATION — the chain the brief names, asserted link by link.
 *
 * Business Input → Design Context → Design Decisions → SEO plan → Design Tokens
 * → Page Model → Element Selection → Stack → Implementation requirements →
 * Build Evidence → Accessibility/SEO/Performance/Quality evaluation →
 * Production Gate.
 *
 * Each test asserts that one link CARRIES data forward rather than dropping it,
 * because every P0 and P1 defect so far has been a broken link rather than a
 * broken module.
 */
import { describe, expect, it } from "vitest";
import { runPipeline } from "../../src/pipeline.js";
import { collectBuildEvidence } from "../../src/evidence/build-evidence.js";
import type { AccessibilityObservations } from "../../src/accessibility/rules.js";
import {
  parseBusinessInput,
  type BusinessInput,
} from "../../src/design-intelligence/types/business-input.js";
import { dryRunFixture } from "../fixtures/dry-run-fixture.js";

const ORIGIN = "https://fixture-verdaleen.invalid";

/**
 * The fixture with every input the framework asked for actually supplied — the
 * "nothing unresolved" case, so the chain can be followed without an early stop.
 * Re-parsed through the input contract so it is a real `BusinessInput`.
 */
function fullyResolvedInput(): BusinessInput {
  const base = dryRunFixture();
  return parseBusinessInput({
    ...base,
    constraints: {
      ...base.constraints,
      canonicalOrigin: ORIGIN,
      brandSeed: "#2F5D50",
      themeMode: "SINGLE-LIGHT",
      brandFontHeading: "FIXTURE-DISPLAY",
      brandFontBody: "FIXTURE-TEXT",
    },
    location: { ...base.location, verified: true },
    availableContent: { ...base.availableContent, contactDetails: "verified_available" },
  });
}

function observations(overrides: Partial<AccessibilityObservations> = {}): AccessibilityObservations {
  return {
    primaryTaskRequiresPointerOnly: false,
    primaryTaskRequiresHover: false,
    primaryTaskRequiresDrag: false,
    primaryTaskRequiresDeviceMotion: false,
    primaryTaskRequiresWebgl: false,
    focusVisible: true,
    focusObscuredBySticky: false,
    lowestCriticalTextContrast: 8.1,
    lowestLogoContrast: 4.8,
    coreContentLostAt320: false,
    coreContentLostAt400Zoom: false,
    meaningfulMediaWithoutAlternative: [],
    nonEssentialMotionCannotBeReduced: false,
    formsInaccessible: false,
    smallestTargetCssPx: 48,
    ...overrides,
  };
}

const FULL_AAA = {
  lowestBodyTextContrast: 8.1,
  lowestLargeTextContrast: 5.4,
  smallestTargetCssPx: 48,
  visualPresentationCompliant: true,
  linkPurposeFromTextAlone: true,
  plainLanguageOrSupplementProvided: true,
  interactionMotionDisableable: true,
};

/** Served HTML built FROM the pipeline's own artifacts, so the chain closes. */
function htmlForRoute(
  route: string,
  artifacts: ReturnType<typeof runPipeline>["output"]["seoArtifacts"],
): string {
  const page = artifacts.pages.find((p) => p.route === route);
  if (!page) throw new Error(`no artifacts for ${route}`);
  const og = Object.entries({ "og:title": page.openGraph.title.value ?? "" })
    .map(([k, v]) => `<meta property="${k}" content="${v}">`)
    .join("\n");
  const schema = (page.structuredData.value ?? [])
    .map((type) => `<script type="application/ld+json">{"@type":"${type}"}</script>`)
    .join("\n");
  const links = artifacts.pages
    .filter((p) => p.route !== route)
    .map((p) => `<a href="${p.route}">${p.route}</a>`)
    .join("");
  return `<!doctype html><html lang="en"><head>
<title>${page.title.value}</title>
<meta name="description" content="A synthetic description for ${route}, supplied by the owner after approving the framework's draft brief.">
<link rel="canonical" href="${page.canonical.value}">
<meta name="robots" content="${page.robots.value}">
${og}
${schema}
</head><body>
<h1>${page.title.value}</h1>
<h2>Detail</h2>
<p>${"Server-rendered copy present in the document itself. ".repeat(8)}</p>
${links}<a href="/">Home</a>
<form action="/api/enquiry" method="post"><fieldset><label for="m">Message</label><textarea id="m" name="m"></textarea><button type="submit">Send enquiry</button></fieldset></form>
<img src="/a.webp" alt="described">
</body></html>`;
}

describe("integration — the decision chain carries data forward", () => {
  const { output, contract } = runPipeline(fullyResolvedInput());

  it("Business Input → Design Context: every variable is evidenced", () => {
    // 16 decision variables, plus the two intent facts whose BASIS is now recorded
    // (FD-01 objective, FD-02 audience). Every entry carries evidence.
    const variables = output.profile.provenance.filter((p) => p.variable !== "website_objective" && p.variable !== "target_audience");
    expect(variables).toHaveLength(16);
    expect(output.profile.provenance).toHaveLength(18);
    expect(output.profile.provenance.every((p) => p.evidence.length > 0)).toBe(true);
  });

  it("Design Context → Design Decisions: rules fired on the derived variables", () => {
    expect(output.decisionLog.length).toBeGreaterThan(10);
    // Rule records cite a DD id; engagement records (which extend DecisionRecord)
    // cite the engagement policy. Nothing else may enter the one decision log.
    expect(output.decisionLog.every((r) => /^DD-\d{3}$/.test(r.ruleId) || r.ruleId === "ENGAGEMENT-POLICY")).toBe(true);
    expect(output.decisionLog.filter((r) => /^DD-\d{3}$/.test(r.ruleId)).length).toBeGreaterThan(10);
  });

  it("Design Decisions → Page Model: objectives reach real routes", () => {
    for (const objective of fullyResolvedInput().websiteObjective) {
      expect(output.pages.some((p) => p.primaryObjective === objective)).toBe(true);
    }
  });

  it("Page Model → SEO plan: page architecture is the actual routes", () => {
    for (const page of output.pages) {
      expect(output.seoStrategy.pageArchitecture.join(" ")).toContain(page.route);
    }
  });

  it("SEO plan → SEO artifacts: every page has values, not requirements", () => {
    expect(output.seoArtifacts.pages).toHaveLength(output.pages.length);
    for (const page of output.seoArtifacts.pages) {
      expect(page.title.value).toBeTruthy();
      expect(page.canonical.value).toContain(ORIGIN);
      expect(page.robots.value).toBeTruthy();
    }
    // With everything supplied, nothing is left unresolved EXCEPT structured data
    // whose required properties the input contract cannot carry at all: an Article
    // needs a headline, author and date. Before the customer dry run these were
    // emitted as bare `{"@type":"Article"}` — invalid, and counted as resolved.
    for (const item of output.seoArtifacts.unresolved) {
      expect(item.artifact).toBe("structuredData.Article");
      expect(item.needs).toContain("author");
    }
  });

  it("Design Decisions → Design Tokens: a supplied seed produces brand-derived values", () => {
    expect(output.tokens.color.provenance).toBe("brand_derived");
    expect(output.tokens.color.values.seed).toBe("#2F5D50");
    expect(output.tokens.unresolved).toEqual([]);
    expect(output.tokens.problems).toEqual([]);
    expect(output.tokens.valid).toBe(true);
  });

  it("Design Tokens → Implementation: CSS custom properties are emitted", () => {
    const css = contract.designTokens.color.values.cssCustomProperties["light"];
    expect(css?.["--color-accent-1"]).toMatch(/^#[0-9A-F]{6}$/);
    expect(contract.designTokens.typography.provenance).toBe("brand_derived");
  });

  it("Element Selection → Stack: only selected capabilities add dependencies", () => {
    const selectedCapabilities = output.selectedPatterns.length;
    expect(selectedCapabilities).toBeGreaterThan(0);
    expect(output.stack.libraries).not.toContain("three");
    // The map IS now interactive, because the location is verified — so the
    // dependency legitimately appears. The rule decides, not the requirement.
    expect(output.stack.libraries).toContain("lazy-loaded map embed");
  });

  it("Implementation requirements reach the contract as VALUES", () => {
    expect(contract.seoArtifacts.pages.length).toBe(output.pages.length);
    expect(contract.designTokens.color.values.contrast.length).toBeGreaterThan(10);
    expect(contract.framework).toBe("nextjs");
  });

  it("pre-build, the production gate refuses to certify", () => {
    expect(output.quality.mode).toBe("pre_build");
    expect(output.quality.evaluation.level).toBe("cannot_classify");
    expect(output.quality.evaluation.unknownGates).toContain("technical");
  });
});

describe("integration — Build Evidence closes the loop", () => {
  const input = fullyResolvedInput();
  const decided = runPipeline(input);

  const evidence = {
    bundle: collectBuildEvidence({
      technical: {
        buildPasses: true,
        typecheckPasses: true,
        lintPasses: true,
        noBlockingConsoleErrors: true,
        primaryRoutesWork: true,
        loadingErrorNotFoundStatesExist: true,
        noExposedSecrets: true,
        warnings: [],
      },
      servedHtml: Object.fromEntries(
        decided.output.pages.map((p) => [p.route, htmlForRoute(p.route, decided.output.seoArtifacts)]),
      ),
      buildManifest: {
        routes: Object.fromEntries(decided.output.pages.map((p) => [p.route, { firstLoadJsKb: 96 }])),
      },
      // What a host actually installs: the declared runtime set, not the stack's
      // library NAMES (which include instructions and omit the framework runtime).
      dependencies: Object.keys(decided.output.dependencyAdmission.admitted),
      accessibility: observations(),
      webVitals: { lcpSeconds: 1.8, inpMs: 110, cls: 0.02, measurement: "field" as const },
      observedAt: "2026-09-13T12:00:00Z",
    }),
    aaa: FULL_AAA,
  };

  const { output } = runPipeline(input, { evidence });

  it("the evidence the framework asked for is the evidence it can consume", () => {
    expect(output.quality.mode).toBe("post_build");
    expect(output.quality.shortfalls).toEqual([]);
  });

  it("the dependency gate: an undeclared runtime or toolchain package fails the technical gate", () => {
    const declared = Object.keys(decided.output.dependencyAdmission.admitted);
    const drifted = {
      ...evidence,
      bundle: {
        ...evidence.bundle,
        dependencies: { kind: "measured" as const, value: [...declared, "FIXTURE-undeclared-package"], source: "FIXTURE" },
        toolchain: { kind: "measured" as const, value: ["typescript", "FIXTURE-undeclared-tool"], source: "FIXTURE" },
      },
    };
    const q = runPipeline(input, { evidence: drifted }).output.quality;
    expect(q.gates.technical).toBe(false);
    expect(q.blockers.join()).toContain('undeclared runtime dependency "FIXTURE-undeclared-package"');
    expect(q.blockers.join()).toContain('undeclared toolchain dependency "FIXTURE-undeclared-tool"');
  });

  it("the dependency gate: a declared runtime package that is not installed fails it too", () => {
    const declared = Object.keys(decided.output.dependencyAdmission.admitted);
    const missing = {
      ...evidence,
      bundle: {
        ...evidence.bundle,
        dependencies: { kind: "measured" as const, value: declared.filter((d) => d !== "react"), source: "FIXTURE" },
      },
    };
    const q = runPipeline(input, { evidence: missing }).output.quality;
    expect(q.gates.technical).toBe(false);
    expect(q.blockers.join()).toContain('declared runtime dependency "react" is not installed');
  });

  it("every gate becomes decidable", () => {
    expect(output.quality.gates.technical).toBe(true);
    expect(output.quality.gates.accessibility).toBe(true);
    expect(output.quality.gates.performance).toBe(true);
    expect(output.quality.gates.responsive).toBe(true);
    expect(output.quality.gates.content).toBe(true);
    expect(output.quality.gates.design).toBe(true);
    expect(output.quality.evaluation.unknownGates).toEqual([]);
  });

  it("the route inventory matches the page model exactly", () => {
    expect(output.quality.routeInventory.compared).toBe(true);
    expect(output.quality.routeInventory.missingFromBuild).toEqual([]);
    expect(output.quality.routeInventory.unplannedInBuild).toEqual([]);
    expect(output.quality.routeInventory.matched.length).toBe(output.pages.length);
  });

  it("AAA is enforced and passes on AAA-grade evidence", () => {
    expect(output.quality.accessibility.requestedTarget).toBe("wcag_aaa_or_equivalent");
    expect(output.quality.accessibility.thresholds.bodyText).toBe(7.0);
    expect(output.quality.accessibility.unclassifiedMandatory).toEqual([]);
    expect(output.quality.accessibility.score).toBe(10);
  });

  it("SEO is scored from the SERVED HTML the framework's own artifacts produced", () => {
    const seo = output.quality.sheet["seo"];
    expect(seo?.scored).toBe(true);
    if (seo?.scored) expect(seo.value).toBeGreaterThanOrEqual(8);
  });

  it("the production gate can now reach a real level", () => {
    expect(output.quality.evaluation.level).not.toBe("cannot_classify");
    expect(output.quality.evaluation.weightedScore).not.toBeNull();
    expect(["production_ready", "professionally_designed", "world_class"]).toContain(
      output.quality.evaluation.level,
    );
  });

  it("and a single hard failure still blocks it, whatever the score", () => {
    const blocked = runPipeline(input, {
      evidence: {
        ...evidence,
        bundle: collectBuildEvidence({
          ...{
            technical: {
              buildPasses: true,
              typecheckPasses: true,
              lintPasses: true,
              noBlockingConsoleErrors: true,
              primaryRoutesWork: true,
              loadingErrorNotFoundStatesExist: true,
              noExposedSecrets: true,
              warnings: [],
            },
            servedHtml: Object.fromEntries(
              decided.output.pages.map((p) => [
                p.route,
                htmlForRoute(p.route, decided.output.seoArtifacts),
              ]),
            ),
            buildManifest: {
              routes: Object.fromEntries(
                decided.output.pages.map((p) => [p.route, { firstLoadJsKb: 96 }]),
              ),
            },
            webVitals: { lcpSeconds: 1.8, inpMs: 110, cls: 0.02, measurement: "field" as const },
          },
          // The one difference: focus is invisible.
          accessibility: observations({ focusVisible: false }),
        }),
      },
    });
    expect(blocked.output.quality.gates.accessibility).toBe(false);
    expect(blocked.output.quality.evaluation.level).toBe("technically_working");
    expect(blocked.output.quality.blockers.join(" ")).toContain("focus_visible");
  });
});

describe("integration — no subsystem is unreachable or discarded", () => {
  it("every P1 output is present on the pipeline result", () => {
    const { output } = runPipeline(dryRunFixture());
    expect(output.seoArtifacts.pages.length).toBeGreaterThan(0);
    expect(Object.keys(output.tokens.color.values.semantic).length).toBeGreaterThan(0);
    expect(output.quality.accessibility.requestedTarget).toBeTruthy();
    expect(output.quality.evidenceProvenance.length).toBeGreaterThan(0);
  });

  it("the ordered scales have ONE home, cited by every consumer", async () => {
    const scales = await import("../../src/design-system/scales.js");
    expect(scales.EXPRESSION_ORDER[0]).toBe("low");
    expect(scales.MOTION_CAP_ORDER[0]).toBe("none");
    // strictestOn defaults to the STRICTEST entry, never a permissive one.
    expect(scales.strictestOn(scales.EXPRESSION_ORDER, undefined)).toBe("low");
    expect(scales.strictestOn(scales.EXPRESSION_ORDER, "high", "low")).toBe("low");
    expect(scales.strictestOn(scales.MOTION_CAP_ORDER, "unrecognised")).toBe("none");
  });

  it("the public surface exposes the evidence producer", async () => {
    const api = await import("../../src/index.js");
    expect(typeof api.collectBuildEvidence).toBe("function");
    expect(typeof api.runPipeline).toBe("function");
    expect(typeof api.evaluateAccessibility).toBe("function");
    expect(typeof api.buildTokenContract).toBe("function");
    expect(typeof api.requireMeasured).toBe("function");
  });
});
