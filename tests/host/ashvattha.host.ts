/**
 * CUSTOMER DRY RUN — Ashvattha Tax & Compliance (customers/ashvattha-tax).
 *
 * Phase 2 step 0 → Phase 4 → Phase 5 of website_flow.md, executed for real on the
 * customer's brief. The input enters ONLY as data (engine/business-input.json and
 * engine/supplied-content.json, both transcribed from brief/), parsed through the
 * framework's own input contract — never as a test fixture.
 *
 *   business-input.json → parseBusinessInput → runPipeline → generateWebsite
 *   → planHostProject → npm install (declared runtime + toolchain only)
 *   → install Playwright WebKit (host step; responsive_matrix.md TIER 1 needs webkit)
 *   → host/validate.mjs → parseRawHostEvidence → hostEvidenceToBuildEvidence
 *   → runPipeline with evidence → every gate
 *
 * No form endpoint is configured: the customer named no backend or email service.
 * Assertions are about honesty and connection only. The digest is the record.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runPipeline } from "../../src/pipeline.js";
import { generateWebsite } from "../../src/generation/generate-website.js";
import { hostExpectations, planHostProject, writeHostProject, RAW_EVIDENCE_PATH } from "../../src/host/host-project.js";
import { engineInputFromWorkflow, evaluateTestRegister, renderRegisterTable, writeGeneratedSection } from "../../src/workflow/seams.js";
import { parseRawHostEvidence } from "../../src/host/raw-host-evidence.js";
import { hostEvidenceToBuildEvidence } from "../../src/host/host-evidence.js";
import { walkNodes } from "../../src/generation/component-model.js";

const CUSTOMER = join("customers", "ashvattha-tax");
const SEAM_RECORD = join(CUSTOMER, "website_workflow", "runs", "WEB-NEW-20260914-practice-website", "07-engine-seam.md");
const HOST_DIR = join(CUSTOMER, "generated-host");
const EVIDENCE_DIR = join(CUSTOMER, "evidence");

function timed<T>(fn: () => T): { value: T; ms: number } {
  const started = Date.now();
  const value = fn();
  return { value, ms: Date.now() - started };
}

describe("customer dry run — Ashvattha Tax & Compliance", () => {
  it("decides, generates, builds, serves, audits and evaluates the customer's site", () => {
    // P1-8: the engine input comes from the WORKFLOW RECORD (the authority), not hand-kept JSON.
    const seam = engineInputFromWorkflow([{ file: SEAM_RECORD, markdown: readFileSync(SEAM_RECORD, "utf8") }]);
    const input = seam.businessInput;
    const supplied = seam.suppliedContent;

    // Phase 2 step 0: the engine.
    const decided = runPipeline(input);
    // Phase 4: the generator. No formEndpoints — no backend exists.
    const generated = generateWebsite(input, decided.output, decided.contract, { suppliedContent: supplied });

    const plan = planHostProject(generated, decided.output, { hostName: "ashvattha-tax-dry-run", port: 3219 });
    mkdirSync(HOST_DIR, { recursive: true });
    writeHostProject(plan, HOST_DIR);

    const install = timed(() =>
      spawnSync("npm", ["install", "--no-audit", "--no-fund", "--loglevel=error"], { cwd: HOST_DIR, shell: true, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }),
    );
    expect(install.value.status, install.value.stderr).toBe(0);

    // Host step: the WebKit build responsive_matrix.md TIER 1 mandates. Recorded
    // either way; a failure leaves the webkit profiles unavailable, not passed.
    const webkit = timed(() =>
      spawnSync(process.execPath, ["node_modules/playwright-core/cli.js", "install", "webkit"], { cwd: HOST_DIR, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }),
    );

    const validate = timed(() =>
      spawnSync(process.execPath, ["host/validate.mjs"], { cwd: HOST_DIR, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, env: { ...process.env, HOST_PORT: "3219" } }),
    );
    expect(validate.value.status, `${validate.value.stdout}\n${validate.value.stderr}`).toBe(0);
    expect(existsSync(join(HOST_DIR, RAW_EVIDENCE_PATH))).toBe(true);

    const raw = parseRawHostEvidence(JSON.parse(readFileSync(join(HOST_DIR, RAW_EVIDENCE_PATH), "utf8")));
    const mapped = hostEvidenceToBuildEvidence(raw, hostExpectations(plan));
    const evaluated = runPipeline(input, { evidence: { bundle: mapped.bundle, aaa: mapped.aaa, generation: { publicationBlockers: generated.manifest.integrity.publicationBlockers } } });
    const q = evaluated.output.quality;

    // ---------------------------------------------------------------- honesty
    for (const [name, e] of Object.entries(mapped.bundle)) expect(e.kind, `${name} is estimated`).not.toBe("estimated");
    const html = raw.routes.map((r) => r.html).join("\n").toLowerCase();
    for (const forbidden of ["4.9", "60+", "₹999", "1,500", "testimonial", "review"]) {
      expect(html, `served HTML contains "${forbidden}"`).not.toContain(forbidden.toLowerCase());
    }
    expect(html).not.toMatch(/<link rel="canonical"/);
    // Synthetic stays synthetic: the representative brief is never reported as a customer's.
    expect(generated.manifest.dataset.classification).toBe("synthetic");

    // ---------------------------------------------------------------- register (TS → markdown seam)
    const register = evaluateTestRegister(seam.testRegister, {
      quality: q,
      manifest: generated.manifest,
      ...(plan.manifest.navigation.compact ? { navigationWorks: mapped.bundle.technical.value?.navigationWorks } : {}),
    });
    writeFileSync(
      SEAM_RECORD,
      writeGeneratedSection(readFileSync(SEAM_RECORD, "utf8"), "register-results", `### Register results — host run ${raw.collectedAt}\n\n${renderRegisterTable(register)}`),
      "utf8",
    );

    // ---------------------------------------------------------------- digest
    const nodes: Array<{ page: string; id: string; kind: string; text?: string; traceTo: string[] }> = [];
    walkNodes(generated.model, (n, page) => nodes.push({ page: page.route, id: n.id, kind: n.kind, ...(n.text ? { text: n.text } : {}), traceTo: n.traceTo }));
    const digest = {
      collectedAt: raw.collectedAt,
      decision: {
        variables: decided.output.profile.variables,
        provenance: decided.output.profile.provenance,
        archetype: decided.output.baseline.archetype,
        designPersonality: decided.output.designPersonality,
        visualExpression: decided.output.visualExpression,
        motion: decided.output.motionStrategy,
        layoutStrategy: decided.output.layoutStrategy,
        imageStrategy: decided.output.imageStrategy,
        interactionStrategy: decided.output.interactionStrategy,
        sectionArchitecture: decided.output.sectionArchitecture,
        selectedPatterns: decided.output.selectedPatterns,
        selectionDecisions: decided.output.selectionDecisions.map((d) => ({ id: d.patternId, outcome: d.outcome, why: d.explanation })),
        decisions: decided.output.decisions,
        conflicts: decided.output.conflicts,
        appliedRules: decided.output.decisionLog.map((r) => r.ruleId),
        pages: decided.output.pages.map((p) => ({ route: p.route, role: p.role, roleBasis: p.roleBasis, label: p.label, objective: p.primaryObjective, seoRole: p.seoRole, sections: p.requiredSections, derivedBy: p.derivedBy ?? null })),
        pageAllocation: decided.output.pageAllocation,
        conversionPlan: decided.output.conversionPlan,
        dependencyAdmission: decided.output.dependencyAdmission,
        precedenceResolutions: decided.output.precedenceResolutions,
        seamSources: seam.sources,
        contentHubs: decided.output.contentHubs,
        contentPlan: decided.output.contentPlan,
        stack: decided.output.stack,
        tokens: { mode: decided.output.tokens.color.values.mode, seed: decided.output.tokens.color.values.seed, provenance: decided.output.tokens.color.provenance, contrast: decided.output.tokens.color.values.contrast, typography: decided.output.tokens.typography, unresolved: decided.output.tokens.unresolved, problems: decided.output.tokens.problems },
        accessibility: decided.output.accessibilityStrategy,
        performance: decided.output.performanceStrategy,
        seo: decided.output.seoArtifacts,
        approvalsRequired: decided.output.approvalsRequired,
        objectiveCoverage: decided.output.objectiveCoverage,
        preBuildQuality: { level: decided.output.quality.evaluation.level, gates: decided.output.quality.gates, blockers: decided.output.quality.blockers },
      },
      generated: {
        files: Object.keys(generated.files).sort(),
        manifest: generated.manifest,
        pages: generated.model.pages.map((p) => ({ route: p.page.route, order: p.sectionOrder, reorderedBy: p.reorderedBy, cta: p.cta, refusals: p.refusals })),
        nodes,
        content: generated.content,
        refusals: generated.refusals,
      },
      host: {
        install: { exitCode: install.value.status, durationMs: install.ms },
        webkitInstall: { exitCode: webkit.value.status, durationMs: webkit.ms, outputTail: `${webkit.value.stdout}${webkit.value.stderr}`.slice(-800) },
        validate: { exitCode: validate.value.status, durationMs: validate.ms },
        host: raw.host,
        installedVersions: raw.install.installedVersions,
        steps: Object.fromEntries(Object.entries(raw.steps).map(([k, s]) => [k, { exitCode: s.exitCode, durationMs: s.durationMs, outputTail: s.outputTail.slice(-2000) }])),
        lint: raw.lint,
        builtRoutes: raw.builtRoutes,
        server: raw.server,
        routes: raw.routes.map((r) => ({ route: r.route, status: r.status, scripts: r.scripts.length, firstLoadJsGzipKb: Math.round((r.scripts.reduce((n, s) => n + s.gzipBytes, 0) / 1024) * 10) / 10, firstLoadJsRawKb: Math.round((r.scripts.reduce((n, s) => n + s.bytes, 0) / 1024) * 10) / 10, inlineScriptKb: Math.round((r.inlineScriptBytes / 1024) * 10) / 10, html: r.html })),
        notFoundProbe: raw.notFoundProbe,
        stateFiles: raw.stateFiles,
        secretScan: raw.secretScan,
        audit: raw.audit,
        vitals: raw.vitals,
        responsiveSweep: raw.responsiveSweep,
        experiences: raw.experiences,
        navigation: raw.navigation,
        staticLayer: raw.staticLayer,
        matrix: raw.matrix,
      },
      register,
      evidence: {
        kinds: Object.fromEntries(Object.entries(mapped.bundle).map(([k, e]) => [k, { kind: e.kind, source: e.source }])),
        servedHtml: mapped.bundle.servedHtml.value ?? null,
        accessibilityObservations: mapped.bundle.accessibility.value ?? null,
        aaa: mapped.aaa,
        responsive: mapped.bundle.responsive.value ?? null,
        webVitals: mapped.bundle.webVitals.value ?? null,
        bundles: mapped.bundle.bundles.value ?? null,
        technical: mapped.bundle.technical.value ?? null,
        coverage: mapped.coverage,
        navigation: mapped.navigation,
        staticLayer: mapped.staticLayer,
        findingsOutsideEvaluator: mapped.findingsOutsideEvaluator,
        notes: mapped.notes,
      },
      evaluation: {
        mode: q.mode,
        level: q.evaluation.level,
        weightedScore: q.evaluation.weightedScore,
        gates: q.gates,
        unknownGates: q.evaluation.unknownGates,
        failedGates: q.evaluation.failedGates,
        blockers: q.blockers,
        notes: q.notes,
        shortfalls: q.shortfalls,
        target: q.evaluation.target,
        explanation: q.evaluation.explanation,
        sheet: q.sheet,
        routeInventory: q.routeInventory,
        accessibility: { gate: q.accessibility.gate, explanation: q.accessibility.explanation, criteria: q.accessibility.criteria },
        evidenceProvenance: q.evidenceProvenance,
        approvalsRequired: evaluated.output.approvalsRequired,
      },
    };
    mkdirSync(EVIDENCE_DIR, { recursive: true });
    writeFileSync(join(EVIDENCE_DIR, "customer-dry-run-digest.json"), `${JSON.stringify(digest, null, 2)}\n`, "utf8");
  });
});
