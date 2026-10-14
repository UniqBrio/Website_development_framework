/**
 * GENERATOR DRY-RUN HARNESS.
 *
 * Runs the COMPLETE chain on the unseen fixture and writes the generated site plus
 * a digest to the scratchpad, so the report is written from what was actually
 * produced, built and evaluated — not from what the code was meant to do.
 *
 *   BusinessInput → runPipeline → generateWebsite → buildStaticSite (to disk)
 *   → collectArtifactsFromBuild (read back) → collectBuildEvidence
 *   → runPipeline(input, { evidence }) → production gate
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { runPipeline } from "../../src/pipeline.js";
import { generateWebsite } from "../../src/generation/generate-website.js";
import { buildStaticSite, collectArtifactsFromBuild } from "../../src/generation/build.js";
import { collectBuildEvidence, parseServedHtml } from "../../src/evidence/build-evidence.js";
import { dryRunFixture } from "../fixtures/dry-run-fixture.js";

const OUT = join(
  process.env["TEMP"] ?? ".",
  "claude",
  "c--Explorations-Website-development-framework",
  "generated",
);

function dump(name: string, value: unknown): void {
  const path = join(OUT, name);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, typeof value === "string" ? value : JSON.stringify(value, null, 2), "utf8");
}

describe("generator dry run — the complete chain on the unseen fixture", () => {
  it("generates, builds, collects evidence, evaluates, and records every step", async () => {
    const input = dryRunFixture();

    // 1-2. Decide.
    const decided = runPipeline(input);

    // 3. Generate.
    const generated = generateWebsite(input, decided.output, decided.contract);

    // 4. Build to disk.
    const siteDir = join(OUT, "site");
    const build = await buildStaticSite(generated, siteDir);

    // 5. Collect evidence by reading the build BACK from disk.
    const artifacts = collectArtifactsFromBuild(generated, build);
    const bundle = collectBuildEvidence(artifacts);

    // 6. Evaluate with the real evidence.
    const evaluated = runPipeline(input, { evidence: { bundle } });
    const q = evaluated.output.quality;

    const servedFacts = generated.pages.map((p) =>
      parseServedHtml(p.route, artifacts.servedHtml?.[p.route] ?? ""),
    );

    const digest = {
      generated: {
        fileCount: Object.keys(generated.files).length,
        files: Object.keys(generated.files).sort(),
        pages: generated.pages.map((p) => ({
          route: p.route,
          objective: p.primaryObjective,
          audience: p.audience,
          sections: p.sections,
          nodeCount: p.trace.length,
          refusals: p.refusals,
        })),
        manifest: generated.manifest,
        refusalsByKind: generated.refusals.reduce<Record<string, number>>((acc, r) => {
          acc[r.kind] = (acc[r.kind] ?? 0) + 1;
          return acc;
        }, {}),
        contentSlots: generated.content.slots,
      },
      build: {
        filesWritten: build.filesWritten.length,
        routesBuilt: build.routesBuilt,
        routesMissing: build.routesMissing,
        tsxSyntax: build.tsxSyntax,
        secretsFound: build.secretsFound,
        has404: build.has404,
        durationMs: build.durationMs,
      },
      evidence: {
        technical: { kind: bundle.technical.kind, source: bundle.technical.source, value: bundle.technical.value },
        servedHtml: { kind: bundle.servedHtml.kind, routes: bundle.servedHtml.value?.length },
        routeInventory: { kind: bundle.routeInventory.kind, value: bundle.routeInventory.value },
        bundles: { kind: bundle.bundles.kind, source: bundle.bundles.source },
        dependencies: { kind: bundle.dependencies.kind, value: bundle.dependencies.value },
        accessibility: { kind: bundle.accessibility.kind },
        webVitals: { kind: bundle.webVitals.kind },
      },
      servedHtml: servedFacts.map((f) => ({
        route: f.route,
        title: f.title,
        canonical: f.canonical,
        robots: f.robots,
        h1Count: f.h1Count,
        headingSkips: f.headingSkips,
        structuredData: f.structuredDataTypes,
        bodyTextLength: f.bodyTextLength,
        internalLinks: f.internalLinks.length,
        imagesWithoutAlt: f.imagesWithoutAlt,
      })),
      evaluation: {
        mode: q.mode,
        level: q.evaluation.level,
        weightedScore: q.evaluation.weightedScore,
        gates: q.gates,
        unknownGates: q.evaluation.unknownGates,
        failedGates: q.evaluation.failedGates,
        blockers: q.blockers,
        shortfalls: q.shortfalls.map((s) => ({ gate: s.gate, had: s.had, needs: s.needs })),
        routeInventory: q.routeInventory,
        seo: q.sheet["seo"],
        accessibility: {
          target: q.accessibility.requestedTarget,
          gate: q.accessibility.gate,
          unclassifiedMandatory: q.accessibility.unclassifiedMandatory.length,
        },
        evidenceProvenance: q.evidenceProvenance,
      },
    };

    dump("00-generator-digest.json", digest);
    for (const [path, body] of Object.entries(generated.files)) dump(join("artifacts", path), body);
    // eslint-disable-next-line no-console
    console.log("GENERATOR-DIGEST " + JSON.stringify(digest));

    expect(build.routesMissing).toEqual([]);
    expect(q.mode).toBe("post_build");
  });
});
