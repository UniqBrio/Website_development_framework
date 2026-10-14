/**
 * FIRST REAL-CUSTOMER DRY RUN — Jalsa Restaurant (customers/jalsa-restaurant).
 *
 * The customer supplied two files (raw/): a logo PNG and a menu .docx. Everything the
 * engine reads comes from the run's workflow record (07-engine-seam.md), whose values
 * are traced to evidence/menu-source-extraction.json and evidence/fact-register.json.
 *
 *   07-engine-seam.md → engineInputFromWorkflow → runPipeline → generateWebsite
 *   → planHostProject → npm install (declared runtime + toolchain only)
 *   → Playwright WebKit install (TIER 1 needs webkit) → host/validate.mjs
 *   → parseRawHostEvidence → hostEvidenceToBuildEvidence → runPipeline with evidence
 *
 * Assertions are about HONESTY and PROVENANCE, never about the site being ready: every
 * visible text fragment of every served route must be classified as customer material
 * (with its source locator) or framework structural text, and nothing unapproved,
 * synthetic or invented may be served. The digest in evidence-run/ is the record.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
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
import { classifyServedText, JALSA, loadJalsaEvidence, syntheticFixtureValues } from "../scenarios/jalsa-provenance.js";

const HOST_DIR = join(JALSA.root, "generated");
const EVIDENCE_DIR = join(JALSA.root, "evidence-run");
const PORT = "3223";

function timed<T>(fn: () => T): { value: T; ms: number } {
  const started = Date.now();
  const value = fn();
  return { value, ms: Date.now() - started };
}

describe("first real-customer dry run — Jalsa Restaurant", () => {
  it("decides, generates, builds, serves, audits and evaluates the customer's site without inventing a fact", () => {
    const rawBefore = JALSA.rawFiles.map((f) => createHash("sha256").update(readFileSync(f)).digest("hex"));
    const seam = engineInputFromWorkflow([{ file: JALSA.seamRecord, markdown: readFileSync(JALSA.seamRecord, "utf8") }]);
    const input = seam.businessInput;
    const supplied = seam.suppliedContent;
    const evidence = loadJalsaEvidence();

    const decided = runPipeline(input);
    // No formEndpoints: the customer named no backend, email service or contact method.
    const generated = generateWebsite(input, decided.output, decided.contract, { suppliedContent: supplied });

    const plan = planHostProject(generated, decided.output, { hostName: "jalsa-restaurant-dry-run", port: Number(PORT) });
    mkdirSync(HOST_DIR, { recursive: true });
    writeHostProject(plan, HOST_DIR);

    const install = timed(() =>
      spawnSync("npm", ["install", "--no-audit", "--no-fund", "--loglevel=error"], { cwd: HOST_DIR, shell: true, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }),
    );
    expect(install.value.status, install.value.stderr).toBe(0);
    const webkit = timed(() =>
      spawnSync(process.execPath, ["node_modules/playwright-core/cli.js", "install", "webkit"], { cwd: HOST_DIR, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }),
    );
    const validate = timed(() =>
      spawnSync(process.execPath, ["host/validate.mjs"], { cwd: HOST_DIR, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, env: { ...process.env, HOST_PORT: PORT } }),
    );
    expect(validate.value.status, `${validate.value.stdout}\n${validate.value.stderr}`).toBe(0);
    expect(existsSync(join(HOST_DIR, RAW_EVIDENCE_PATH))).toBe(true);

    const raw = parseRawHostEvidence(JSON.parse(readFileSync(join(HOST_DIR, RAW_EVIDENCE_PATH), "utf8")));
    const mapped = hostEvidenceToBuildEvidence(raw, hostExpectations(plan));
    const evaluated = runPipeline(input, { evidence: { bundle: mapped.bundle, aaa: mapped.aaa, generation: { publicationBlockers: generated.manifest.integrity.publicationBlockers } } });
    const q = evaluated.output.quality;

    // ---------------------------------------------------------------- raw material preserved
    const rawAfter = JALSA.rawFiles.map((f) => createHash("sha256").update(readFileSync(f)).digest("hex"));
    expect(rawAfter).toEqual(rawBefore);
    expect(rawAfter).toEqual(JALSA.rawSha256);

    // ---------------------------------------------------------------- honesty on SERVED html
    for (const [name, e] of Object.entries(mapped.bundle)) expect(e.kind, `${name} is estimated`).not.toBe("estimated");
    const servedHtml = raw.routes.map((r) => r.html).join("\n");
    const lower = servedHtml.toLowerCase();
    // No supplied menu price is published (pricing is provided_unverified; the document says "For design illustrations only").
    expect(servedHtml).not.toContain("₹");
    for (const row of evidence.menu.rows) expect(servedHtml, `price of row ${row.sourceNumber}`).not.toContain(`>${row.price.slice(1)}<`);
    // Withheld partial rows never appear, nor any bracketed transcription note.
    expect(servedHtml).not.toMatch(/\[(variant|item partially visible|text partially visible)\]/);
    // Unapproved AI drafts never reach a page.
    for (const d of generated.manifest.contentDrafts.held) expect(servedHtml, `held draft ${d.target}`).not.toContain(d.value);
    expect(generated.manifest.contentDrafts.published).toEqual([]);
    // The logo is provided_unverified: the file is refused, never served.
    expect(servedHtml).not.toContain("/brand/jalsa-restaurant-logo.png");
    // No invented contact, proof or policy fact.
    expect(servedHtml).not.toMatch(/tel:|wa\.me|mailto:|\+91|maps\.google|<address/i);
    for (const forbidden of ["rating", "review", "testimonial", "award", "since 19", "since 20", "delivery", "order online", "reserve", "halal", "jain", "allergen", "open daily", "am –", "pm"]) {
      expect(lower, `served HTML contains "${forbidden}"`).not.toContain(forbidden);
    }
    expect(servedHtml).not.toMatch(/<link rel="canonical"/);
    // No synthetic fixture value leaks into the real customer's output.
    for (const value of syntheticFixtureValues()) expect(servedHtml, `synthetic fixture value "${value}"`).not.toContain(value);
    expect(generated.manifest.dataset.classification).toBe("unmarked");

    // ---------------------------------------------------------------- provenance of every served text fragment
    const ledger = raw.routes.map((r) => ({ route: r.route, ...classifyServedText(r.html, input.businessName, evidence) }));
    for (const entry of ledger) expect(entry.unclassified, `unclassified text on ${entry.route}`).toEqual([]);

    // ---------------------------------------------------------------- register (TS → markdown seam)
    const register = evaluateTestRegister(seam.testRegister, {
      quality: q,
      manifest: generated.manifest,
      ...(plan.manifest.navigation.compact ? { navigationWorks: mapped.bundle.technical.value?.navigationWorks } : {}),
    });
    writeFileSync(
      JALSA.seamRecord,
      writeGeneratedSection(readFileSync(JALSA.seamRecord, "utf8"), "register-results", `### Register results — host run ${raw.collectedAt}\n\n${renderRegisterTable(register)}`),
      "utf8",
    );

    // ---------------------------------------------------------------- digest
    const nodes: Array<{ page: string; id: string; kind: string; text?: string; traceTo: string[] }> = [];
    walkNodes(generated.model, (n, page) => nodes.push({ page: page.route, id: n.id, kind: n.kind, ...(n.text ? { text: n.text } : {}), traceTo: n.traceTo }));
    const digest = {
      collectedAt: raw.collectedAt,
      rawMaterial: JALSA.rawFiles.map((file, i) => ({ file, sha256: rawAfter[i] })),
      provenanceLedger: ledger,
      decision: {
        variables: decided.output.profile.variables,
        provenance: decided.output.profile.provenance,
        baseline: decided.output.baseline,
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
        obligations: decided.output.obligations,
        forbidden: decided.output.forbidden,
        conflicts: decided.output.conflicts,
        decisionLog: decided.output.decisionLog,
        pages: decided.output.pages.map((p) => ({ route: p.route, role: p.role, roleBasis: p.roleBasis, label: p.label, objective: p.primaryObjective, seoRole: p.seoRole, sections: p.requiredSections, derivedBy: p.derivedBy ?? null })),
        pageAllocation: decided.output.pageAllocation,
        contentHubs: decided.output.contentHubs,
        conversionPlan: decided.output.conversionPlan,
        objectiveCoverage: decided.output.objectiveCoverage,
        dependencyAdmission: decided.output.dependencyAdmission,
        precedenceResolutions: decided.output.precedenceResolutions,
        seamSources: seam.sources,
        contentPlan: decided.output.contentPlan,
        stack: decided.output.stack,
        tokens: { mode: decided.output.tokens.color.values.mode, seed: decided.output.tokens.color.values.seed, provenance: decided.output.tokens.color.provenance, contrast: decided.output.tokens.color.values.contrast, typography: decided.output.tokens.typography, unresolved: decided.output.tokens.unresolved, problems: decided.output.tokens.problems },
        accessibility: decided.output.accessibilityStrategy,
        performance: decided.output.performanceStrategy,
        seo: decided.output.seoArtifacts,
        engagement: decided.output.engagement,
        approvalsRequired: decided.output.approvalsRequired,
        contract: decided.contract,
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
        publicationRequirements: evaluated.contract.publicationRequirements,
      },
    };
    mkdirSync(EVIDENCE_DIR, { recursive: true });
    writeFileSync(join(EVIDENCE_DIR, "jalsa-dry-run-digest.json"), `${JSON.stringify(digest, null, 2)}\n`, "utf8");
  });
});
