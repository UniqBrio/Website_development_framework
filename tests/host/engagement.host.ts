/**
 * ENGAGEMENT DELIVERY — BROWSER VALIDATION (brief §12).
 *
 * The same host philosophy as Verdaleen and Ashvattha: the core decides and
 * generates; a generated host project builds, serves and measures with real tools;
 * the core parses the RAW facts and runs every gate. Nothing is trusted from types.
 *
 * Four synthetic fixtures, one host directory (reused so `npm install` runs once):
 *   calculator  FIXTURE-SAAS-ROI      + a verified calculator definition
 *   assessment  FIXTURE-SCHOOL        + a verified assessment rule set
 *   selector    FIXTURE-STUDIO        + a verified selector rule set
 *   comparison  FIXTURE-CATALOGUE     + verified comparison values (reference regression)
 *
 * Each experience is operated by KEYBOARD in Chromium against expectations from the
 * core (the owner's example; the first rule's answers), then with JavaScript off,
 * at 320 CSS px and after client-side navigation. The existing audit (axe, Tab walk,
 * targets, reflow, reduced motion), responsive sweep (chromium + webkit) and lab
 * vitals run on every page as for any site.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runPipeline } from "../../src/pipeline.js";
import { generateWebsite } from "../../src/generation/generate-website.js";
import { hostExpectations, planHostProject, writeHostProject, RAW_EVIDENCE_PATH } from "../../src/host/host-project.js";
import { parseRawHostEvidence } from "../../src/host/raw-host-evidence.js";
import { hostEvidenceToBuildEvidence } from "../../src/host/host-evidence.js";
import { parseBusinessInput, type BusinessInput } from "../../src/design-intelligence/types/business-input.js";
import * as F from "../fixtures/engagement-fixtures.js";
import * as D from "../fixtures/engagement-delivery-data.js";

const ROOT = join("hosts", "engagement");
const HOST_DIR = join(ROOT, "generated-host");
const EVIDENCE_DIR = join(ROOT, "evidence");
const PORT = "3221";

const COMPARISON = {
  engagementData: {
    comparison: {
      caption: "FIXTURE product comparison",
      rowHeading: "FIXTURE product",
      criteria: ["FIXTURE criterion A", "FIXTURE criterion B", "FIXTURE criterion C", "FIXTURE criterion D"],
      rows: [1, 2, 3].map((n) => ({ offer: `FIXTURE-PRODUCT-${n}`, values: [`FIXTURE a${n}`, `FIXTURE b${n}`, `FIXTURE c${n}`, `FIXTURE d${n}`] })),
      source: "FIXTURE owner-approved comparison sheet",
    },
  },
};

/**
 * Each host site gets an explicit page list with a home page. Found by the first
 * run: a site whose owner supplied NO pages is generated without "/", while its
 * header links to "/"; Next.js prefetches that link, the 404 prefetch never
 * completes, and the page never reaches network idle. That is a generator gap
 * (recorded in docs/ENGAGEMENT-DELIVERY-REPORT.md), not a delivery behaviour, so the
 * browser fixtures use a realistic page set and the gap stays visible.
 */
const withPages = (input: BusinessInput, pages: Array<[string, string]>): BusinessInput =>
  parseBusinessInput({ ...input, requiredPages: pages.map(([path, purpose]) => ({ path, purpose, mustBeIndexable: true })) });

const RUNS: Array<{ name: string; input: () => BusinessInput; supplied: unknown; expectedType: string }> = [
  { name: "calculator", input: () => withPages(F.saasRoi(), [["/value-estimate", "estimate the value of the product and request a demo"], ["/", "home: what the product does"]]), supplied: D.supplied({ calculators: [D.calculatorDefinition()] }), expectedType: "calculator" },
  { name: "assessment", input: () => withPages(F.education(), [["/find-your-level", "find your starting level and enquire"], ["/", "home: the programmes on offer"]]), supplied: D.supplied({ decisionFlows: [D.assessmentDefinition()] }), expectedType: "decision_flow" },
  { name: "selector", input: () => withPages(F.fitness(), [["/choose-a-programme", "choose a programme and subscribe"], ["/", "home: the studio and its programmes"]]), supplied: D.supplied({ decisionFlows: [D.selectorDefinition()] }), expectedType: "decision_flow" },
  { name: "comparison", input: () => withPages(F.complexCatalogue(), [["/compare", "compare products and buy"], ["/", "home: the product range"]]), supplied: COMPARISON, expectedType: "comparison" },
];

const run = (cmd: string, args: string[], env: Record<string, string> = {}) =>
  spawnSync(cmd, args, { cwd: HOST_DIR, shell: cmd === "npm", encoding: "utf8", maxBuffer: 64 * 1024 * 1024, env: { ...process.env, ...env } });

describe("engagement delivery — browser validation in a generated host", () => {
  it("builds, serves and operates every delivered experience; the core evaluates the raw facts", () => {
    mkdirSync(EVIDENCE_DIR, { recursive: true });
    // Fixtures declare different runtime dependencies (the catalogue's gallery and
    // forms need more than a calculator page), so install whenever they change.
    let installedFor: string | null = null;
    let browsersInstalled = false;
    const summary: Array<Record<string, unknown>> = [];

    // ENGAGEMENT_ONLY=<name> runs one fixture while debugging; the full run is the evidence of record.
    for (const fixture of RUNS.filter((r) => !process.env["ENGAGEMENT_ONLY"] || r.name === process.env["ENGAGEMENT_ONLY"])) {
      const input = fixture.input();
      const decided = runPipeline(input);
      const generated = generateWebsite(input, decided.output, decided.contract, { suppliedContent: fixture.supplied });
      const spec = generated.manifest.engagement.delivery[0];
      expect(spec?.status, `${fixture.name}: ${spec?.reason}`).toBe("DELIVERABLE");
      expect(generated.manifest.engagement.reconciliation.consistent).toBe(true);

      const plan = planHostProject(generated, decided.output, { hostName: `engagement-${fixture.name}`, port: Number(PORT) });
      expect(plan.manifest.experiences.map((e) => e.type)).toEqual([fixture.expectedType]);
      mkdirSync(HOST_DIR, { recursive: true });
      writeHostProject(plan, HOST_DIR);

      const pkg = JSON.parse(readFileSync(join(HOST_DIR, "package.json"), "utf8")) as { dependencies?: object; devDependencies?: object };
      const declared = JSON.stringify([pkg.dependencies ?? {}, pkg.devDependencies ?? {}]);
      if (declared !== installedFor) {
        const install = run("npm", ["install", "--no-audit", "--no-fund", "--loglevel=error"]);
        expect(install.status, install.stderr).toBe(0);
        installedFor = declared;
      }
      if (!browsersInstalled) {
        run(process.execPath, ["node_modules/playwright-core/cli.js", "install", "webkit"]);
        browsersInstalled = true;
      }

      const validate = run(process.execPath, ["host/validate.mjs"], { HOST_PORT: PORT });
      expect(validate.status, `${validate.stdout}\n${validate.stderr}`).toBe(0);
      expect(existsSync(join(HOST_DIR, RAW_EVIDENCE_PATH))).toBe(true);

      const raw = parseRawHostEvidence(JSON.parse(readFileSync(join(HOST_DIR, RAW_EVIDENCE_PATH), "utf8")));
      const mapped = hostEvidenceToBuildEvidence(raw, hostExpectations(plan));
      const evaluated = runPipeline(input, { evidence: { bundle: mapped.bundle, aaa: mapped.aaa, generation: { publicationBlockers: generated.manifest.integrity.publicationBlockers } } });
      const q = evaluated.output.quality;

      // ---- honesty and connection
      for (const [name, e] of Object.entries(mapped.bundle)) expect(e.kind, `${fixture.name}: ${name} is estimated`).not.toBe("estimated");
      expect(raw.experiences.available, raw.experiences.reason ?? "").toBe(true);
      expect([...new Set(raw.experiences.checks.map((c) => c.specId))]).toEqual([spec!.specId]);

      // ---- measured per-route JS: the experience route vs the others
      const routeJs = raw.routes.map((r) => ({
        route: r.route,
        status: r.status,
        firstLoadJsGzipBytes: r.scripts.reduce((n, s) => n + s.gzipBytes, 0),
        experienceRuntimeGzipBytes: r.scripts.filter((s) => s.src === "/experiences.js").reduce((n, s) => n + s.gzipBytes, 0),
        inlineScriptBytes: r.inlineScriptBytes,
      }));

      const digest = {
        fixture: fixture.name,
        collectedAt: raw.collectedAt,
        decision: {
          decision: decided.output.engagement.decision,
          primary: decided.output.engagement.primaryOpportunity?.category,
          score: decided.output.engagement.primaryOpportunity?.score,
          band: decided.output.engagement.primaryOpportunity?.band,
          hardGates: decided.output.engagement.evaluations.find((e) => e.category === spec!.category)?.gates.map((g) => `${g.gate}: ${g.status}`),
          recordId: decided.output.engagement.decisionRecordId,
        },
        delivery: { ...spec, definition: spec?.definition?.type ?? null },
        reconciliation: generated.manifest.engagement.reconciliation,
        runtime: generated.manifest.engagement.runtime,
        host: {
          steps: Object.fromEntries(Object.entries(raw.steps).map(([k, s]) => [k, { exitCode: s.exitCode, durationMs: s.durationMs, outputTail: s.outputTail.slice(-1500) }])),
          lint: raw.lint,
          builtRoutes: raw.builtRoutes,
          routeJs,
          experienceChecks: raw.experiences.checks,
          navigationChecks: raw.navigation,
          staticLayer: raw.staticLayer,
          matrix: raw.matrix,
          consoleErrors: raw.audit.pages.flatMap((p) => p.consoleErrors.map((e) => ({ route: p.route, ...e }))),
          pageErrors: raw.audit.pages.flatMap((p) => p.pageErrors.map((e) => ({ route: p.route, e }))),
          axeViolations: raw.audit.pages.flatMap((p) => p.axe.violations.map((v) => ({ route: p.route, id: v.id, help: v.help, nodes: v.nodes.slice(0, 3) }))),
          keyboard: raw.audit.pages.map((p) => ({ route: p.route, focusable: p.keyboard.focusableCount, reached: p.keyboard.reachedCount, unreachable: p.keyboard.unreachable })),
          smallestTargets: raw.audit.pages.map((p) => ({ route: p.route, smallest: Math.min(...p.targets.filter((t) => !t.inlineInText).map((t) => Math.min(t.width, t.height))) })),
          vitals: raw.vitals,
          sweep: raw.responsiveSweep.profiles.map((p) => ({ name: p.name, engine: p.engine, available: p.available, reason: p.reason, pages: p.pages.map((pg) => ({ route: pg.route, overflowPx: pg.overflowPx, smallestTouchTargetPx: pg.smallestTouchTargetPx, smallTouchTargets: pg.smallTouchTargets })) })),
        },
        dataset: generated.manifest.dataset,
        integrity: { counts: generated.manifest.integrity.counts, byDomain: generated.manifest.integrity.byDomain },
        evidence: {
          experiences: mapped.experiences,
          navigation: mapped.navigation,
          staticLayer: mapped.staticLayer,
          coverage: mapped.coverage,
          notes: mapped.notes,
          responsive: mapped.bundle.responsive.value ?? null,
          technical: mapped.bundle.technical.value ?? null,
          bundles: mapped.bundle.bundles.value ?? null,
          webVitals: mapped.bundle.webVitals.value ?? null,
        },
        evaluation: {
          level: q.evaluation.level,
          gates: q.gates,
          blockers: q.blockers,
          shortfalls: q.shortfalls,
          accessibility: { gate: q.accessibility.gate, explanation: q.accessibility.explanation },
        },
      };
      writeFileSync(join(EVIDENCE_DIR, `${fixture.name}-digest.json`), `${JSON.stringify(digest, null, 2)}\n`, "utf8");
      summary.push({
        fixture: fixture.name,
        dataset: generated.manifest.dataset.classification,
        experiences: mapped.experiences.map((r) => ({ engine: r.engine, layer: r.layer, works: r.works, paths: `${r.pathsMatched}/${r.pathsOperated}`, accessibleNames: r.accessibleNames })),
        navigation: mapped.navigation.map((r) => ({ engine: r.engine, layer: r.layer, works: r.works })),
        failures: [...mapped.experiences.flatMap((r) => r.failures), ...mapped.navigation.flatMap((r) => r.failures), ...mapped.staticLayer],
        gates: q.gates,
      });

      // ---- the delivered experience must actually work in the browser
      for (const result of mapped.experiences) expect(result.failures, `${fixture.name} ${result.specId}`).toEqual([]);
      // Every experience operated in both engines against both layers (Delivery G3/G4).
      expect(new Set(mapped.experiences.map((r) => `${r.engine}/${r.layer}`))).toEqual(new Set(["chromium/next", "webkit/next", "chromium/static", "webkit/static"]));
      expect(mapped.bundle.technical.value?.experiencesWork, `${fixture.name}: ${mapped.notes.join(" | ")}`).toBe(true);
      for (const result of mapped.navigation) expect(result.failures, `${fixture.name} nav ${result.engine}/${result.layer}`).toEqual([]);
      expect(mapped.staticLayer, `${fixture.name} static layer`).toEqual([]);
    }
    writeFileSync(join(EVIDENCE_DIR, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  });
});
