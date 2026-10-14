/**
 * HOST INTEGRATION FIXTURE — the full lifecycle on the Verdaleen input.
 *
 * NOT a customer website and NOT a demo. Its only purpose is to prove the framework
 * can generate a host project and drive the whole validation lifecycle with real
 * tools, without the core having to change to compensate:
 *
 *   BusinessInput → runPipeline → generateWebsite → planHostProject → write host
 *   → npm install (host's declared deps only) → host/validate.mjs (build, typecheck,
 *   lint, next start, served HTML, scripts, secrets, axe + DOM audit, lab vitals)
 *   → parseRawHostEvidence (schema) → hostEvidenceToBuildEvidence → runPipeline
 *   with evidence → every gate
 *
 * The assertions here are about HONESTY and CONNECTION, not about the site
 * passing: a gate that fails or stays unknown for a real reason is a correct
 * result. The digest records everything for the readiness report.
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
import { HOST_TOOLCHAIN } from "../../src/host/toolchain.js";
import { parseServedHtml } from "../../src/evidence/build-evidence.js";
import { dryRunFixture } from "../fixtures/dry-run-fixture.js";

const FIXTURE_DIR = join("hosts", "verdaleen");
const HOST_DIR = join(FIXTURE_DIR, "generated-host");
const EVIDENCE_DIR = join(FIXTURE_DIR, "evidence");

function timed<T>(fn: () => T): { value: T; ms: number } {
  const started = Date.now();
  const value = fn();
  return { value, ms: Date.now() - started };
}

describe("host integration fixture — Verdaleen, full lifecycle", () => {
  it("generates a host, installs, builds, serves, audits and evaluates with real evidence", () => {
    const input = dryRunFixture();

    // 1-3. decide and generate. No form endpoint: this host has no backend.
    const decided = runPipeline(input);
    const generated = generateWebsite(input, decided.output, decided.contract);

    // 4. plan and write the host project.
    const plan = planHostProject(generated, decided.output, { hostName: "verdaleen-host-fixture", port: 3217 });
    mkdirSync(HOST_DIR, { recursive: true });
    const written = writeHostProject(plan, HOST_DIR);

    // The host declares exactly the runtime set and the toolchain set.
    const pkg = JSON.parse(readFileSync(join(HOST_DIR, "package.json"), "utf8")) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    expect(pkg.dependencies).toEqual(decided.output.dependencyAdmission.admitted);
    expect(Object.keys(pkg.devDependencies).sort()).toEqual(Object.keys(HOST_TOOLCHAIN).sort());

    // 5. install ONLY the declared host dependencies.
    const install = timed(() =>
      spawnSync("npm", ["install", "--no-audit", "--no-fund", "--loglevel=error"], {
        cwd: HOST_DIR,
        shell: true,
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
      }),
    );
    expect(install.value.status, install.value.stderr).toBe(0);

    // 6-14. the host validates itself and writes raw evidence.
    const validate = timed(() =>
      spawnSync(process.execPath, ["host/validate.mjs"], {
        cwd: HOST_DIR,
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
        env: { ...process.env, HOST_PORT: "3217" },
      }),
    );
    expect(validate.value.status, `${validate.value.stdout}\n${validate.value.stderr}`).toBe(0);
    expect(existsSync(join(HOST_DIR, RAW_EVIDENCE_PATH))).toBe(true);

    // 15. the core parses raw evidence against its schema, then maps it.
    const raw = parseRawHostEvidence(JSON.parse(readFileSync(join(HOST_DIR, RAW_EVIDENCE_PATH), "utf8")));
    const mapped = hostEvidenceToBuildEvidence(raw, hostExpectations(plan));

    // 16. every gate, with the host's evidence.
    const evaluated = runPipeline(input, { evidence: { bundle: mapped.bundle, aaa: mapped.aaa, generation: { publicationBlockers: generated.manifest.integrity.publicationBlockers } } });
    const q = evaluated.output.quality;

    // ---------------------------------------------------------------- honesty
    // No estimate ever enters as evidence.
    for (const [name, e] of Object.entries(mapped.bundle)) {
      expect(e.kind, `${name} is estimated`).not.toBe("estimated");
    }
    // AAA stays AAA.
    expect(q.accessibility.requestedTarget).toBe("wcag_aaa_or_equivalent");
    expect(q.accessibility.thresholds.bodyText).toBe(7);
    // Criteria that need a person are never passed by the audit.
    const plain = q.accessibility.criteria.find((c) => c.id === "plain_language");
    expect(plain?.status).not.toBe("pass");
    // If the build passed, the chain must have produced measured facts from it.
    if (raw.steps.build.exitCode === 0) {
      expect(mapped.bundle.servedHtml.kind).toBe("measured");
      expect(mapped.bundle.routeInventory.kind).toBe("measured");
    }

    // ---------------------------------------------------------------- digest
    const served = (mapped.bundle.servedHtml.value ?? []).map((f) => ({
      route: f.route,
      title: f.title,
      h1Count: f.h1Count,
      headingSkips: f.headingSkips,
      internalLinks: f.internalLinks.length,
      bodyTextLength: f.bodyTextLength,
      imagesWithoutAlt: f.imagesWithoutAlt,
      canonical: f.canonical,
    }));
    const digest = {
      collectedAt: raw.collectedAt,
      host: raw.host,
      filesWritten: written.length,
      install: { exitCode: install.value.status, durationMs: install.ms, installedVersions: raw.install.installedVersions },
      steps: Object.fromEntries(
        Object.entries(raw.steps).map(([k, s]) => [k, { ran: s.ran, exitCode: s.exitCode, durationMs: s.durationMs, outputTail: s.outputTail.slice(-1500) }]),
      ),
      lint: raw.lint,
      builtRoutes: raw.builtRoutes,
      server: raw.server,
      routes: raw.routes.map((r) => ({
        route: r.route,
        status: r.status,
        scripts: r.scripts.length,
        firstLoadJsGzipKb: Math.round((r.scripts.reduce((n, s) => n + s.gzipBytes, 0) / 1024) * 10) / 10,
        firstLoadJsRawKb: Math.round((r.scripts.reduce((n, s) => n + s.bytes, 0) / 1024) * 10) / 10,
        inlineScriptKb: Math.round((r.inlineScriptBytes / 1024) * 10) / 10,
      })),
      servedHtml: served,
      staticVsServed: generated.pages.map((p) => ({
        route: p.route,
        staticH1: parseServedHtml(p.route, generated.files[p.staticPath] ?? "").h1Count,
        servedH1: served.find((s) => s.route === p.route)?.h1Count ?? null,
      })),
      notFoundProbe: raw.notFoundProbe,
      stateFiles: raw.stateFiles,
      secretScan: raw.secretScan,
      audit: {
        available: raw.audit.available,
        reason: raw.audit.reason,
        pages: raw.audit.pages.map((p) => ({
          route: p.route,
          consoleErrors: p.consoleErrors,
          pageErrors: p.pageErrors,
          violations: p.axe.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, sample: v.nodes[0]?.target })),
          incomplete: p.axe.incomplete,
          keyboard: { focusable: p.keyboard.focusableCount, reached: p.keyboard.reachedCount, unreachable: p.keyboard.unreachable, cycle: p.keyboard.completedCycle, noOutline: p.keyboard.stops.filter((s) => !s.outlineVisible).map((s) => s.target), obscured: p.keyboard.stops.filter((s) => s.obscured).map((s) => s.target) },
          smallestTargets: [...p.targets].filter((t) => !t.inlineInText).sort((a, b) => Math.min(a.width, a.height) - Math.min(b.width, b.height)).slice(0, 5),
          reflow: p.reflow,
          motion: p.motion,
          pointer: p.pointer,
          visualPresentation: p.visualPresentation,
          forms: p.forms,
        })),
      },
      vitals: raw.vitals,
      evidenceKinds: Object.fromEntries(Object.entries(mapped.bundle).map(([k, e]) => [k, { kind: e.kind, source: e.source }])),
      mappedObservations: mapped.bundle.accessibility.value ?? null,
      aaa: mapped.aaa,
      coverage: mapped.coverage,
      findingsOutsideEvaluator: mapped.findingsOutsideEvaluator,
      mappingNotes: mapped.notes,
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
        accessibility: {
          gate: q.accessibility.gate,
          explanation: q.accessibility.explanation,
          criteria: q.accessibility.criteria.map((c) => ({ id: c.id, status: c.status, mandatory: c.mandatory, detail: c.detail })),
        },
        evidenceProvenance: q.evidenceProvenance,
      },
      formContracts: plan.manifest.formContracts,
    };
    mkdirSync(EVIDENCE_DIR, { recursive: true });
    writeFileSync(join(EVIDENCE_DIR, "host-dry-run-digest.json"), `${JSON.stringify(digest, null, 2)}\n`, "utf8");
  });
});
