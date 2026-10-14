/**
 * HOST BOUNDARY — core responsibilities vs host responsibilities, and the raw
 * evidence contract between them. Pure: no install, no build, no browser. The
 * real lifecycle runs in `verdaleen.host.ts` via `npm run host:e2e`.
 *
 * Raw evidence here is SYNTHETIC, built to exercise the mapping rules; it is
 * never presented as a measurement of anything.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { runPipeline } from "../../src/pipeline.js";
import { generateWebsite } from "../../src/generation/generate-website.js";
import { planHostProject, HOST_MANIFEST_PATH } from "../../src/host/host-project.js";
import { parseRawHostEvidence, type RawExperienceCheck, type RawNavigationCheck, type RawHostEvidence, type RawPageAudit, type RawSweepProfile } from "../../src/host/raw-host-evidence.js";
import { hostEvidenceToBuildEvidence } from "../../src/host/host-evidence.js";
import { HOST_TOOLCHAIN } from "../../src/host/toolchain.js";
import { evaluateAccessibility } from "../../src/accessibility/evaluate.js";
import { dryRunFixture } from "../fixtures/dry-run-fixture.js";

const input = dryRunFixture();
const decided = runPipeline(input);
const generated = generateWebsite(input, decided.output, decided.contract);
const plan = planHostProject(generated, decided.output, { hostName: "FIXTURE-host" });
const routes = decided.output.pages.map((p) => p.route);

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

// ------------------------------------------------------------------ boundary

describe("the core / host boundary", () => {
  it("the core library declares none of the host's runtime or toolchain packages", () => {
    const core = JSON.parse(readFileSync("package.json", "utf8")) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    const coreNames = [...Object.keys(core.dependencies), ...Object.keys(core.devDependencies)];
    for (const hostOnly of ["next", "react", "react-dom", "playwright-core", "axe-core", "eslint", "eslint-config-next", "next-intl", "react-hook-form"]) {
      expect(coreNames, `core declares host package ${hostOnly}`).not.toContain(hostOnly);
    }
  });

  it("no core TypeScript module imports a host runtime package", () => {
    // Real import declarations, parsed — generated TSX inside template strings is
    // text the core WRITES, not a module the core LOADS.
    const hostPackage = /^(next|next\/.+|react|react-dom|playwright-core|axe-core|next-intl|react-hook-form)$/;
    for (const file of walk("src").filter((f) => f.endsWith(".ts"))) {
      const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.ES2022, true);
      const specifiers: string[] = [];
      source.forEachChild((node) => {
        if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
          specifiers.push(node.moduleSpecifier.text);
        }
      });
      for (const specifier of specifiers) {
        expect(specifier, `${file} imports host package ${specifier}`).not.toMatch(hostPackage);
      }
    }
  });

  it("the host collector uses only Node built-ins and the host's declared toolchain", () => {
    const script = readFileSync("src/host/runtime/validate.mjs", "utf8");
    const imported = [...script.matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1] ?? "");
    const required = [...script.matchAll(/require(?:\.resolve)?\(\s*["']([^"']+)["']/g)].map((m) => (m[1] ?? "").split("/")[0] ?? "");
    for (const name of imported) expect(name, `collector imports ${name}`).toMatch(/^node:/);
    for (const name of required) expect(Object.keys(HOST_TOOLCHAIN), `collector requires ${name}`).toContain(name);
  });

  it("the host declares EXACTLY the stack's runtime set and the toolchain contract", () => {
    const pkg = JSON.parse(plan.files["package.json"] ?? "{}") as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    expect(pkg.dependencies).toEqual(decided.output.dependencyAdmission.admitted);
    expect(Object.keys(pkg.devDependencies).sort()).toEqual(Object.keys(HOST_TOOLCHAIN).sort());
    // Instructions in the stack decision are recorded, never installed as packages.
    for (const library of plan.manifest.nonPackageLibraries) {
      expect(Object.keys(pkg.dependencies)).not.toContain(library);
    }
  });

  it("the host carries the generated source, the §L.1 states, the collector and the manifest", () => {
    for (const file of ["app/layout.tsx", "app/page.tsx", "app/not-found.tsx", "app/error.tsx", "app/loading.tsx", "styles.css", "host/validate.mjs", HOST_MANIFEST_PATH, "next.config.mjs", "tsconfig.json", "eslint.config.mjs"]) {
      expect(plan.files[file], `${file} missing from host`).toBeDefined();
    }
    expect(plan.files["package.json"]).not.toContain('"next/package.json"');
  });

  it("the manifest preserves the planned routes, the AAA target and the budget", () => {
    expect(plan.manifest.plannedRoutes).toEqual(routes);
    expect(plan.manifest.accessibility.target).toBe("wcag_aaa_or_equivalent");
    expect(plan.manifest.accessibility.bodyText).toBe(7);
    expect(plan.manifest.accessibility.targetSizeCssPx).toBe(44);
    expect(plan.manifest.budgets.routeJsKb).toBe(decided.output.performanceStrategy.budgetKb);
  });

  it("form contracts reach the host manifest with their endpoint state", () => {
    expect(plan.manifest.formContracts).toContainEqual({ page: "/devices", kind: "checkout", endpoint: "unconfigured" });
  });
});

// ------------------------------------------------------------------ synthetic raw evidence

function pageAudit(route: string, overrides: Partial<RawPageAudit> = {}): RawPageAudit {
  return {
    route,
    consoleErrors: [],
    declaredIcons: [],
    faviconEvidence: { pageInitiatedRequest: false, htmlReference: false, scriptReference: false },
    pageErrors: [],
    axe: { version: "FIXTURE", violations: [], incomplete: [], passes: [{ id: "color-contrast", nodeCount: 10 }] },
    contrast: [
      { rule: "color-contrast-enhanced", ratio: 12.1, fontSizePx: 16, bold: false, target: "p", outcome: "pass" },
      { rule: "color-contrast-enhanced", ratio: 9.4, fontSizePx: 32, bold: true, target: "h1", outcome: "pass" },
    ],
    keyboard: {
      focusableCount: 3,
      reachedCount: 3,
      unreachable: [],
      stops: [{ target: "a[Home]", outlineVisible: true, obscured: false, inViewport: true }],
      completedCycle: true,
    },
    targets: [{ target: "a[Home]", width: 60, height: 48, inlineInText: false }],
    reflow: { narrowViewportCssPx: 320, scrollWidth: 320, clientWidth: 320, narrowTextLength: 1000, wideTextLength: 1000 },
    motion: {
      reduce: { longestTransitionMs: 0, longestAnimationMs: 0, runningAnimations: 0 },
      noPreference: { longestTransitionMs: 150, longestAnimationMs: 0, runningAnimations: 0 },
    },
    pointer: { draggableCount: 0, webglContexts: 0, deviceMotionListeners: 0, nonNativeInteractiveWithoutTabindex: 0, hoverChecked: 3, hoverRevealed: [] },
    media: { img: 0, video: 0, audio: 0, iframe: 0, svgImg: 0 },
    logoImages: 0,
    visualPresentation: { blocksChecked: 2, justifiedBlocks: 0, minLineHeightRatio: 1.6, maxLineLengthCh: 70 },
    links: [{ text: "Home", href: "/" }],
    forms: [],
    ...overrides,
  };
}

function rawEvidence(mutate: (raw: RawHostEvidence) => void = () => {}): RawHostEvidence {
  const runtime = decided.output.dependencyAdmission.admitted;
  const dev = Object.fromEntries(Object.entries(HOST_TOOLCHAIN).map(([n, e]) => [n, e.range]));
  const raw: RawHostEvidence = {
    schemaVersion: 1,
    collectedAt: "2026-09-14T00:00:00.000Z",
    host: { node: "FIXTURE", platform: "FIXTURE", nextVersion: "FIXTURE", browser: { path: "FIXTURE", version: "FIXTURE" }, playwrightVersion: "FIXTURE" },
    install: {
      declaredDependencies: runtime,
      declaredDevDependencies: dev,
      installedVersions: Object.fromEntries([...Object.keys(runtime), ...Object.keys(dev)].map((n) => [n, "0.0.0-FIXTURE"])),
    },
    steps: {
      build: { ran: true, exitCode: 0, durationMs: 1, outputTail: "" },
      typecheck: { ran: true, exitCode: 0, durationMs: 1, outputTail: "" },
      lint: { ran: true, exitCode: 0, durationMs: 1, outputTail: "" },
    },
    lint: { errorCount: 0, warningCount: 0 },
    builtRoutes: [...routes],
    server: { started: true, url: "http://127.0.0.1:0", error: null },
    routes: generated.pages.map((p) => ({
      route: p.route,
      status: 200,
      html: generated.files[p.staticPath] ?? "",
      scripts: [
        { src: "/_next/static/chunks/FIXTURE-a.js", status: 200, bytes: 200_000, gzipBytes: 61_440 },
        { src: "/_next/static/chunks/FIXTURE-b.js", status: 200, bytes: 90_000, gzipBytes: 30_720 },
      ],
      inlineScriptBytes: 5000,
    })),
    notFoundProbe: { route: "/__probe", status: 404, hasNotFoundMarker: true },
    stateFiles: { notFound: true, error: true, loading: true },
    secretScan: { filesScanned: 10, findings: [] },
    audit: { available: true, reason: null, pages: routes.map((r) => pageAudit(r)) },
    vitals: {
      available: true,
      reason: null,
      method: "FIXTURE lab profile",
      pages: routes.map((r) => ({ route: r, lcpMs: 1800, cls: 0.01, interactions: r === "/devices" ? [{ target: "1", durationMs: 90 }] : [], clicksPerformed: r === "/devices" ? 1 : 0 })),
    },
    responsiveSweep: { profiles: [] },
    experiences: { available: false, reason: "FIXTURE: no delivered experiences", checks: [] },
    navigation: { available: true, reason: "no compact navigation was delivered", checks: [] },
    staticLayer: { available: true, reason: null, pages: [] },
    matrix: { engines: [{ name: "chromium", available: true, reason: null }, { name: "webkit", available: true, reason: null }], layers: [{ name: "next", available: true, reason: null }, { name: "static", available: true, reason: null }] },
  };
  mutate(raw);
  return parseRawHostEvidence(JSON.parse(JSON.stringify(raw)));
}

const expectations = { plannedRoutes: routes, notFoundMarker: plan.manifest.notFoundProbe.marker };

describe("raw host evidence → tagged BuildEvidence", () => {
  it("the schema refuses a malformed raw file rather than letting it become evidence", () => {
    expect(() => parseRawHostEvidence({ schemaVersion: 1, collectedAt: "x" })).toThrow();
    expect(() => parseRawHostEvidence({ ...rawEvidence(), schemaVersion: 2 })).toThrow();
  });

  it("a complete host run yields MEASURED technical, HTML, routes, bundles, accessibility and LAB vitals", () => {
    const { bundle } = hostEvidenceToBuildEvidence(rawEvidence(), expectations);
    expect(bundle.technical.kind).toBe("measured");
    expect(bundle.servedHtml.kind).toBe("measured");
    expect(bundle.routeInventory.kind).toBe("measured");
    expect(bundle.bundles.kind).toBe("measured");
    expect(bundle.bundles.value?.[0]?.firstLoadJsKb).toBe(90);
    expect(bundle.accessibility.kind).toBe("measured");
    expect(bundle.webVitals.kind).toBe("measured");
    expect(bundle.webVitals.value?.measurement).toBe("lab");
    expect(bundle.webVitals.source).toContain("LAB, not field p75");
    expect(bundle.dependencies.kind).toBe("measured");
    expect(bundle.toolchain.kind).toBe("measured");
  });

  it("no browser: accessibility, vitals and technical are UNAVAILABLE, and the gates stay unknown", () => {
    const raw = rawEvidence((r) => {
      r.audit = { available: false, reason: "no installed Chrome, Edge or Chromium was found", pages: [] };
      r.vitals = { available: false, reason: "no browser", method: "", pages: [] };
    });
    const mapped = hostEvidenceToBuildEvidence(raw, expectations);
    expect(mapped.bundle.accessibility.kind).toBe("unavailable");
    expect(mapped.bundle.webVitals.kind).toBe("unavailable");
    expect(mapped.bundle.technical.kind).toBe("unavailable");
    const q = runPipeline(input, { evidence: { bundle: mapped.bundle, aaa: mapped.aaa } }).output.quality;
    expect(q.gates.accessibility).toBe("unknown");
    expect(q.gates.technical).toBe("unknown");
    expect(q.gates.performance).toBe("unknown");
  });

  it("contrast axe could not determine leaves body contrast UNKNOWN, not the partial minimum", () => {
    const raw = rawEvidence((r) => {
      r.audit.pages[0]!.axe.incomplete.push({ id: "color-contrast", tags: ["wcag2aa"], nodeCount: 2 });
    });
    const mapped = hostEvidenceToBuildEvidence(raw, expectations);
    expect(mapped.bundle.accessibility.value?.lowestCriticalTextContrast).toBeUndefined();
    const evaluation = evaluateAccessibility("wcag_aaa_or_equivalent", mapped.bundle.accessibility.value, mapped.aaa);
    expect(evaluation.criteria.find((c) => c.id === "contrast_body")?.status).toBe("unknown");
    expect(evaluation.gate).not.toBe(true);
  });

  it("criteria needing a person stay unknown even when every measured criterion passes", () => {
    const mapped = hostEvidenceToBuildEvidence(rawEvidence(), expectations);
    const evaluation = evaluateAccessibility("wcag_aaa_or_equivalent", mapped.bundle.accessibility.value, mapped.aaa);
    for (const id of ["visual_presentation", "link_purpose", "plain_language"]) {
      expect(evaluation.criteria.find((c) => c.id === id)?.status, id).toBe("unknown");
    }
    expect(evaluation.gate).toBe("unknown");
    expect(mapped.coverage.find((c) => c.criterion === "plain_language")?.status).toBe("human_assessment_required");
  });

  it("a partial check can prove a failure: generic link text fails 2.4.9", () => {
    const raw = rawEvidence((r) => {
      r.audit.pages[0]!.links.push({ text: "Read more", href: "/x" });
    });
    const mapped = hostEvidenceToBuildEvidence(raw, expectations);
    expect(mapped.aaa.linkPurposeFromTextAlone).toBe(false);
    const evaluation = evaluateAccessibility("wcag_aaa_or_equivalent", mapped.bundle.accessibility.value, mapped.aaa);
    expect(evaluation.criteria.find((c) => c.id === "link_purpose")?.status).toBe("fail");
    expect(evaluation.gate).toBe(false);
  });

  it("a measured target below the AAA 44px threshold fails the gate — AAA is not read as AA", () => {
    const raw = rawEvidence((r) => {
      r.audit.pages[1]!.targets.push({ target: "a[Nav]", width: 60, height: 30, inlineInText: false });
    });
    const mapped = hostEvidenceToBuildEvidence(raw, expectations);
    expect(mapped.bundle.accessibility.value?.smallestTargetCssPx).toBe(30);
    const aaa = evaluateAccessibility("wcag_aaa_or_equivalent", mapped.bundle.accessibility.value, mapped.aaa);
    expect(aaa.criteria.find((c) => c.id === "target_size")?.status).toBe("fail");
    const aa = evaluateAccessibility("wcag_aa", mapped.bundle.accessibility.value, mapped.aaa);
    expect(aa.criteria.find((c) => c.id === "target_size")?.status).toBe("pass");
  });

  it("an inline link in a sentence is exempt from target size, per the WCAG exception", () => {
    const raw = rawEvidence((r) => {
      r.audit.pages[0]!.targets.push({ target: "a[inline]", width: 40, height: 18, inlineInText: true });
    });
    expect(hostEvidenceToBuildEvidence(raw, expectations).bundle.accessibility.value?.smallestTargetCssPx).toBe(48);
  });

  it("a script that failed to load makes bundles UNAVAILABLE instead of an understated total", () => {
    const raw = rawEvidence((r) => {
      r.routes[0]!.scripts[0]!.status = 404;
    });
    const mapped = hostEvidenceToBuildEvidence(raw, expectations);
    expect(mapped.bundle.bundles.kind).toBe("unavailable");
    expect(mapped.notes.join()).toContain("would understate");
  });

  it("no measurable interaction makes vitals UNAVAILABLE: LCP and CLS alone may not stand in for INP", () => {
    const raw = rawEvidence((r) => {
      for (const p of r.vitals.pages) {
        p.interactions = [];
      }
    });
    const mapped = hostEvidenceToBuildEvidence(raw, expectations);
    expect(mapped.bundle.webVitals.kind).toBe("unavailable");
    expect(mapped.notes.join()).toContain("INP was not measured");
  });

  it("a failed production build is a measured technical FAILURE, not an unknown", () => {
    const raw = rawEvidence((r) => {
      r.steps.build.exitCode = 1;
    });
    const mapped = hostEvidenceToBuildEvidence(raw, expectations);
    expect(mapped.bundle.technical.value?.buildPasses).toBe(false);
    const q = runPipeline(input, { evidence: { bundle: mapped.bundle, aaa: mapped.aaa } }).output.quality;
    expect(q.gates.technical).toBe(false);
    expect(q.blockers).toContain("technical: production build failed");
  });

  it("an installed package the host did not declare fails the technical gate", () => {
    const raw = rawEvidence((r) => {
      r.install.declaredDevDependencies["FIXTURE-extra-tool"] = "^1.0.0";
      r.install.installedVersions["FIXTURE-extra-tool"] = "1.0.0";
    });
    const mapped = hostEvidenceToBuildEvidence(raw, expectations);
    const q = runPipeline(input, { evidence: { bundle: mapped.bundle, aaa: mapped.aaa } }).output.quality;
    expect(q.gates.technical).toBe(false);
    expect(q.blockers.join()).toContain('undeclared toolchain dependency "FIXTURE-extra-tool"');
  });

  it("a favicon 404 is non-blocking ONLY when proven browser-automatic; every other console error blocks", () => {
    const err = { text: "Failed to load resource: the server responded with a status of 404 (Not Found)", url: "http://127.0.0.1:0/favicon.ico" };
    const automatic = rawEvidence((r) => {
      r.audit.pages[0]!.consoleErrors.push(err);
    });
    const f = hostEvidenceToBuildEvidence(automatic, expectations).bundle.technical.value;
    expect(f?.noBlockingConsoleErrors).toBe(true);
    expect(f?.warnings.join()).toContain("browser-automatic favicon request");

    const variants: Array<[string, (page: RawPageAudit) => void]> = [
      ["the page declares an icon", (page) => { page.declaredIcons = ["/favicon.ico"]; }],
      ["the page itself requested it", (page) => { page.faviconEvidence.pageInitiatedRequest = true; }],
      ["the served HTML references it", (page) => { page.faviconEvidence.htmlReference = true; }],
      ["an application script references it", (page) => { page.faviconEvidence.scriptReference = true; }],
    ];
    for (const [why, mutate] of variants) {
      const raw = rawEvidence((r) => {
        r.audit.pages[0]!.consoleErrors.push(err);
        mutate(r.audit.pages[0]!);
      });
      expect(hostEvidenceToBuildEvidence(raw, expectations).bundle.technical.value?.noBlockingConsoleErrors, why).toBe(false);
    }

    const script = rawEvidence((r) => {
      r.audit.pages[0]!.consoleErrors.push({ ...err, url: "http://127.0.0.1:0/_next/static/chunks/app.js" });
    });
    expect(hostEvidenceToBuildEvidence(script, expectations).bundle.technical.value?.noBlockingConsoleErrors).toBe(false);
  });

  it("the measured responsive sweep decides the responsive gate: overflow fails, a missing engine is unknown, clean passes", () => {
    const page = (route: string, overrides: Partial<RawSweepProfile["pages"][number]> = {}) => ({
      route, status: 200, overflowPx: 0, smallestTouchTargetPx: 44, smallTouchTargets: [], textLength: 900, screenshot: null, ...overrides,
    });
    const profile = (name: string, engine: "chromium" | "webkit", overrides: Partial<RawSweepProfile> = {}): RawSweepProfile => ({
      name, engine, mandatory: true, javaScriptEnabled: true, hasTouch: false, available: true, reason: null, pages: routes.map((r) => page(r)), ...overrides,
    });
    const gate = (profiles: RawSweepProfile[]) => {
      const mapped = hostEvidenceToBuildEvidence(rawEvidence((r) => { r.responsiveSweep = { profiles }; }), expectations);
      return runPipeline(input, { evidence: { bundle: mapped.bundle, aaa: mapped.aaa } }).output.quality;
    };

    const clean = gate([profile("Desktop Chrome", "chromium"), profile("iPhone SE", "webkit", { hasTouch: true })]);
    expect(clean.gates.responsive).toBe(true);

    const overflow = gate([profile("Galaxy S9+", "chromium", { hasTouch: true, pages: [page("/", { overflowPx: 37 })] })]);
    expect(overflow.gates.responsive).toBe(false);
    expect(overflow.blockers.join()).toContain("horizontal overflow of 37px (RF-001)");

    const small = gate([profile("Pixel 7", "chromium", { hasTouch: true, pages: [page("/", { smallestTouchTargetPx: 30, smallTouchTargets: ["a[Home] 30px"] })] })]);
    expect(small.gates.responsive).toBe(false);
    expect(small.blockers.join()).toContain("(RF-006)");

    const noWebkit = gate([profile("Desktop Chrome", "chromium"), profile("iPhone SE", "webkit", { available: false, reason: "webkit could not launch", pages: [] })]);
    expect(noWebkit.gates.responsive).toBe("unknown");
    expect(noWebkit.shortfalls.some((s) => s.gate === "responsive")).toBe(true);

    const noJs = gate([
      profile("Desktop Chrome", "chromium"),
      profile("Desktop Chrome, JavaScript disabled", "chromium", { javaScriptEnabled: false, pages: [page("/", { textLength: 100 })] }),
    ]);
    expect(noJs.gates.responsive).toBe(false);
    expect(noJs.blockers.join()).toContain("missing without JavaScript");
  });

  it("findings outside the evaluator's criteria are reported, not silently dropped or gated", () => {
    const raw = rawEvidence((r) => {
      r.audit.pages[0]!.axe.violations.push({ id: "html-has-lang", impact: "serious", tags: ["wcag2a"], help: "FIXTURE", nodes: [{ target: "html", summary: "" }] });
    });
    const mapped = hostEvidenceToBuildEvidence(raw, expectations);
    expect(mapped.findingsOutsideEvaluator).toContainEqual({ rule: "html-has-lang", route: routes[0], help: "FIXTURE", nodes: 1 });
  });
});

describe("delivered experience checks → existing gates (no second a11y or technical system)", () => {
  const check = (overrides: Partial<RawExperienceCheck> = {}): RawExperienceCheck => ({
    route: routes[0]!,
    specId: "experience-roi_calculator",
    type: "calculator",
    engine: "chromium",
    layer: "next",
    paths: [{ name: "example 1", expected: "10400", actual: "10400", matched: true, focusMovedToResult: true, resultAnnounced: true }],
    invalidInput: { errorShown: true, fieldMarkedInvalid: true, noResult: true },
    axTree: { available: true, controls: 4, unnamedControls: [], groups: 1, unnamedGroups: 0, statusRegions: 1, alertRegions: 1 },
    pageErrors: [],
    enhanced: true,
    errorPath: { summaryVisible: true, fieldErrors: 2, invalidOrUnansweredFocused: true },
    completion: { method: "keyboard", expected: "10400", actual: "10400", matched: true, focusMovedToResult: true, resultAnnounced: true },
    reset: { cleared: true, focusReturned: true },
    noJs: { fallbackTextLength: 400, controlsDisabledOrAbsent: true, noticeVisibleOrNotNeeded: true },
    narrow: { pageOverflowPx: 0, experienceOverflowPx: 0 },
    clientNavigation: { attempted: true, enhanced: true },
    comparison: null,
    ...overrides,
  });
  /** The same raw check in every engine × layer combination the matrix requires. */
  const matrix = (c: RawExperienceCheck): RawExperienceCheck[] =>
    (["chromium", "webkit"] as const).flatMap((engine) => (["next", "static"] as const).map((layer) => ({ ...c, engine, layer })));
  const withChecks = (checks: RawExperienceCheck[], available = true) =>
    hostEvidenceToBuildEvidence(
      rawEvidence((r) => {
        r.experiences = { available, reason: available ? null : "FIXTURE: browser unavailable", checks: checks.flatMap(matrix) };
      }),
      { ...expectations, experienceSpecIds: ["experience-roi_calculator"] },
    );

  it("a measured, working experience sets technical.experiencesWork = true", () => {
    const mapped = withChecks([check()]);
    expect(mapped.bundle.technical.value?.experiencesWork).toBe(true);
    expect(mapped.experiences[0]?.works).toBe(true);
  });

  it("a wrong result fails the technical gate with the measured value named", () => {
    const mapped = withChecks([check({ completion: { method: "keyboard", expected: "10400", actual: "10000", matched: false, focusMovedToResult: true, resultAnnounced: true } })]);
    expect(mapped.bundle.technical.value?.experiencesWork).toBe(false);
    expect(mapped.bundle.technical.value?.warnings.join()).toContain('produced "10000", expected "10400"');
    const q = runPipeline(dryRunFixture(), { evidence: { bundle: mapped.bundle, aaa: mapped.aaa } }).output.quality;
    expect(q.gates.technical).toBe(false);
    expect(q.blockers.join()).toContain("failed its measured browser check");
  });

  it("keyboard completion failure lands in input_independence; unannounced errors land in forms", () => {
    const keyboard = withChecks([check({ completion: { method: "keyboard", expected: "10400", actual: "10400", matched: true, focusMovedToResult: false, resultAnnounced: true } })]);
    expect(keyboard.bundle.accessibility.value?.primaryTaskRequiresPointerOnly).toBe(true);
    const errors = withChecks([check({ errorPath: { summaryVisible: false, fieldErrors: 0, invalidOrUnansweredFocused: false } })]);
    expect(errors.bundle.accessibility.value?.formsInaccessible).toBe(true);
  });

  it("a delivered experience that was never operated leaves technical facts unknown, never a pass", () => {
    const unmeasured = withChecks([], false);
    expect(unmeasured.bundle.technical.kind).toBe("unavailable");
    expect(unmeasured.notes.join()).toContain("experience behaviour unmeasured");
  });

  it("WebKit operation is required: a check that ran only in Chromium leaves technical facts unknown", () => {
    const chromiumOnly = hostEvidenceToBuildEvidence(
      rawEvidence((r) => {
        r.experiences = { available: true, reason: null, checks: [check(), check({ layer: "static" })] };
        r.matrix.engines = [{ name: "chromium", available: true, reason: null }, { name: "webkit", available: false, reason: "FIXTURE: webkit not installed" }];
      }),
      { ...expectations, experienceSpecIds: ["experience-roi_calculator"] },
    );
    expect(chromiumOnly.bundle.technical.kind).toBe("unavailable");
    expect(chromiumOnly.notes.join()).toContain("webkit: FIXTURE: webkit not installed");
  });

  it("every path is checked, not only the first: a wrong no-match path fails with its name", () => {
    const mapped = withChecks([
      check({
        paths: [
          { name: "rule r-1", expected: "a (A)", actual: "a (A)", matched: true, focusMovedToResult: true, resultAnnounced: true },
          { name: "no match", expected: "no-match (FIXTURE none)", actual: "a (A)", matched: false, focusMovedToResult: true, resultAnnounced: true },
        ],
      }),
    ]);
    expect(mapped.bundle.technical.value?.experiencesWork).toBe(false);
    expect(mapped.bundle.technical.value?.warnings.join()).toContain('path "no match" produced "a (A)"');
    expect(mapped.experiences[0]?.pathsOperated).toBe(2);
  });

  it("an out-of-range input that yields a result, or an unnamed control in the accessibility tree, lands in forms", () => {
    const invalid = withChecks([check({ invalidInput: { errorShown: false, fieldMarkedInvalid: false, noResult: false } })]);
    expect(invalid.bundle.accessibility.value?.formsInaccessible).toBe(true);
    const unnamed = withChecks([check({ axTree: { available: true, controls: 4, unnamedControls: ["spinbutton"], groups: 1, unnamedGroups: 0, statusRegions: 1, alertRegions: 1 } })]);
    expect(unnamed.bundle.accessibility.value?.formsInaccessible).toBe(true);
    expect(unnamed.bundle.technical.value?.warnings.join()).toContain("1 unnamed control(s)");
  });

  it("a site with no delivered experience is unaffected: experiencesWork is absent", () => {
    expect(hostEvidenceToBuildEvidence(rawEvidence(), expectations).bundle.technical.value?.experiencesWork).toBeUndefined();
  });

  it("the validator operates both engines and both layers, and serves the static layer itself", () => {
    const source = readFileSync("src/host/runtime/validate.mjs", "utf8");
    expect(source).toContain("pw.webkit.launch");
    expect(source).toContain('import { createServer } from "node:http"');
    expect(source).toContain("Accessibility.getFullAXTree");
    expect(source).toMatch(/for \(const engine of engines\.filter\(\(e\) => e\.browser\)\)/);
  });

  it("the validator treats a radio group as one Tab stop and measures a wrapping label as the target", () => {
    const source = readFileSync("src/host/runtime/validate.mjs", "utf8");
    expect(source).toContain('el.type !== "radio"');
    expect(source).toMatch(/group\.find\(\(o\) => o\.checked\) \?\? group\[0\]/);
    expect(source).toMatch(/wrappingLabel && el\.matches\("input"\) \? wrappingLabel : el/);
  });
});

describe("compact navigation and the static layer → existing gates", () => {
  const nav = (overrides: Partial<RawNavigationCheck> = {}): RawNavigationCheck[] =>
    (["chromium", "webkit"] as const).flatMap((engine) =>
      (["next", "static"] as const).map((layer) => ({
        engine,
        layer,
        route: "/",
        pageErrors: [],
        phone: { initiallyClosed: true, h1OnFirstScreen: true, h1TopPx: 120, keyboardOpens: true, routeParity: true, closeVisible: true, tabReachesMenu: true, escapeCloses: true, focusReturnsToToggle: true, closeButtonCloses: true },
        desktop: { listVisible: true, buttonsHidden: true, routeParity: true },
        noJs: { keyboardOpens: true },
        ...overrides,
      })),
    );
  const withNav = (checks: RawNavigationCheck[], available = true) =>
    hostEvidenceToBuildEvidence(
      rawEvidence((r) => {
        r.navigation = { available, reason: available ? null : "FIXTURE: not run", checks };
      }),
      { ...expectations, compactNavigation: true },
    );

  it("operated compact navigation sets technical.navigationWorks = true", () => {
    expect(withNav(nav()).bundle.technical.value?.navigationWorks).toBe(true);
  });

  it("a menu that does not open by keyboard fails the technical gate AND lands in input_independence", () => {
    const mapped = withNav(nav({ phone: { initiallyClosed: true, h1OnFirstScreen: true, h1TopPx: 120, keyboardOpens: false, routeParity: true, closeVisible: true, tabReachesMenu: false, escapeCloses: true, focusReturnsToToggle: true, closeButtonCloses: true } }));
    expect(mapped.bundle.technical.value?.navigationWorks).toBe(false);
    expect(mapped.bundle.accessibility.value?.primaryTaskRequiresPointerOnly).toBe(true);
  });

  it("delivered compact navigation that was never operated leaves technical facts unknown", () => {
    const mapped = withNav([], false);
    expect(mapped.bundle.technical.kind).toBe("unavailable");
    expect(mapped.notes.join()).toContain("compact navigation unmeasured");
  });

  it("a static layer page with an axe violation or 320px overflow fails staticLayerWorks", () => {
    const mapped = hostEvidenceToBuildEvidence(
      rawEvidence((r) => {
        r.staticLayer = { available: true, reason: null, pages: routes.map((route, i) => ({ route, status: 200, axeViolations: i === 0 ? [{ id: "label", nodes: 1 }] : [], overflowPx320: i === 1 ? 40 : 0, pageErrors: [] })) };
      }),
      { ...expectations, staticRoutes: routes },
    );
    expect(mapped.bundle.technical.value?.staticLayerWorks).toBe(false);
    expect(mapped.bundle.technical.value?.warnings.join()).toContain("axe label×1");
  });
});
