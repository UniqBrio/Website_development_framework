/**
 * ENGAGEMENT DRY RUN — brief phase 16.
 *
 * The existing Verdaleen fixture first (no new business invented for it), then
 * synthetic fixtures with materially different objectives. Each is run through
 * the full pipeline AND the generator, and a digest is recorded: the decision,
 * every candidate with its gates and score, the selection, the rejections and
 * why, required and missing data, the fallback and the decision record.
 *
 * Set ENGAGEMENT_DIGEST_OUT to a file path to write the digest as JSON; the
 * assertions run either way.
 */
import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { runPipeline } from "../../src/pipeline.js";
import { generateWebsite } from "../../src/generation/generate-website.js";
import type { BusinessInput } from "../../src/design-intelligence/types/business-input.js";
import { dryRunFixture } from "../fixtures/dry-run-fixture.js";
import * as F from "../fixtures/engagement-fixtures.js";
import * as D from "../fixtures/engagement-delivery-data.js";

const COMPARISON = {
  engagementData: {
    comparison: {
      caption: "FIXTURE product comparison",
      rowHeading: "FIXTURE product",
      criteria: ["FIXTURE criterion A", "FIXTURE criterion B", "FIXTURE criterion C"],
      rows: [1, 2, 3].map((n) => ({ offer: `FIXTURE-PRODUCT-${n}`, values: [`FIXTURE a${n}`, `FIXTURE b${n}`, `FIXTURE c${n}`] })),
      source: "FIXTURE owner-approved comparison sheet",
    },
  },
};

const RUNS: Array<{ name: string; objective: string; input: () => BusinessInput; supplied?: unknown }> = [
  { name: "FIXTURE-VERDALEEN-MOBILITY (existing dry-run fixture)", objective: "book_appointments + sell_products + build_credibility + educate", input: dryRunFixture },
  { name: "FIXTURE-SAAS-ROI", objective: "request_demo", input: () => F.saasRoi() },
  { name: "FIXTURE-CATALOGUE", objective: "sell_products", input: F.complexCatalogue, supplied: COMPARISON },
  { name: "FIXTURE-CLINIC-BOOKING (no scheduling integration)", objective: "book_appointments", input: () => F.bookingFirst(false) },
  { name: "FIXTURE-SCHOOL", objective: "generate_leads + educate", input: () => F.education() },
  // Delivery fixtures: the same decisions, now with governed values supplied.
  { name: "FIXTURE-SAAS-ROI + verified calculator", objective: "request_demo", input: () => F.saasRoi(), supplied: D.supplied({ calculators: [D.calculatorDefinition()] }) },
  { name: "FIXTURE-SCHOOL + verified assessment", objective: "generate_leads + educate", input: () => F.education(), supplied: D.supplied({ decisionFlows: [D.assessmentDefinition()] }) },
  { name: "FIXTURE-STUDIO + verified selector", objective: "sell_subscriptions", input: () => F.fitness(), supplied: D.supplied({ decisionFlows: [D.selectorDefinition()] }) },
  { name: "FIXTURE-SAAS-ROI + AI-drafted formula", objective: "request_demo", input: () => F.saasRoi(), supplied: D.supplied({ calculators: [D.calculatorDefinition({ formula: { ...D.calculatorDefinition().formula, provenance: "ai_draft", source: "FIXTURE model output" } })] }) },
];

function digestFor(run: (typeof RUNS)[number]) {
  const input = run.input();
  const { output, contract } = runPipeline(input);
  const site = generateWebsite(input, output, contract, run.supplied ? { suppliedContent: run.supplied } : {});
  const e = output.engagement;
  const record = e.records.find((r) => r.id === e.decisionRecordId)!;
  return {
    fixture: run.name,
    objective: run.objective,
    decision: e.decision,
    confidence: e.confidence,
    preference: e.preference,
    visitorTasks: record.engagement.visitorTask,
    candidatesConsidered: e.evaluations.length,
    candidatesMatchingATask: e.evaluations.filter((x) => x.matchedTasks.length > 0).length,
    gatesPassedByAll: e.evaluations.filter((x) => x.gates.every((g) => g.status === "pass")).map((x) => x.category),
    candidates: e.evaluations
      .filter((x) => x.matchedTasks.length > 0)
      .map((x) => ({
        category: x.category,
        outcome: x.outcome,
        score: x.scorecard?.score ?? null,
        band: x.scorecard?.band ?? null,
        failedGates: x.gates.filter((g) => g.status === "fail").map((g) => `${g.gate} (${g.onFail}): ${g.reason}`),
      })),
    selected: e.primaryOpportunity
      ? {
          primary: e.primaryOpportunity.category,
          score: e.primaryOpportunity.score,
          band: e.primaryOpportunity.band,
          implementation: e.primaryOpportunity.implementationStatus,
          placement: e.primaryOpportunity.placement,
          journey: e.primaryOpportunity.journey,
          secondary: e.secondaryOpportunities.map((s) => s.category),
          scoreExplanation: e.scorecard?.explanation ?? null,
        }
      : null,
    recommendations: e.recommendations,
    rejectedCount: e.rejectedOpportunities.length,
    rationale: e.rationale,
    noExperience: e.noExperience,
    requiredData: e.requiredData,
    missingData: e.missingData,
    fallback: e.fallback,
    leadCapture: e.leadCaptureStrategy,
    approvals: e.approvalRequirements,
    decisionRecord: { id: record.id, decision: record.decision, confidence: record.confidence, humanApprovalRequired: record.humanApprovalRequired },
    generator: { experiences: site.manifest.engagement.experiences, runtime: site.manifest.engagement.runtime, reconciliation: site.manifest.engagement.reconciliation },
    delivery: site.manifest.engagement.delivery.map((spec) => ({
      specId: spec.specId,
      category: spec.category,
      status: spec.status,
      mode: spec.mode,
      reason: spec.reason,
      dataStatus: spec.dataStatus,
      provenance: spec.provenance.map((l) => `${l.item}: ${l.provenance} → ${l.status}`),
      blockers: spec.blockers,
      rendered: site.manifest.engagement.reconciliation.entries.find((en) => en.specId === spec.specId)?.rendered ?? false,
      route: spec.route,
      fallback: spec.fallback,
      performance: spec.performance,
      responsive: spec.responsive,
      accessibility: spec.accessibility.length,
    })),
    budget: output.performanceStrategy.actions.filter((a) => a.patternId.startsWith("engagement:")),
  };
}

describe("engagement dry run", () => {
  const digests = RUNS.map(digestFor);

  it("records a complete decision for every fixture", () => {
    for (const d of digests) {
      expect(d.candidatesConsidered, d.fixture).toBe(27);
      expect(d.decisionRecord.id, d.fixture).toBe("ENG-DECISION");
      expect(d.rationale.length, d.fixture).toBeGreaterThan(0);
      if (d.decision === "NO_EXPERIENCE") {
        expect(d.noExperience?.staticAlternative.length, d.fixture).toBeGreaterThan(0);
        expect(d.noExperience?.reconsiderWhen.length, d.fixture).toBeGreaterThan(0);
        expect(d.generator.experiences, d.fixture).toEqual([]);
        expect(d.delivery, d.fixture).toEqual([]);
      }
    }
    if (process.env["ENGAGEMENT_DIGEST_OUT"]) {
      writeFileSync(process.env["ENGAGEMENT_DIGEST_OUT"], `${JSON.stringify(digests, null, 2)}\n`, "utf8");
    }
  });

  it("Verdaleen: NO_EXPERIENCE — booking needs a verified contact route and product decisions need data that does not exist", () => {
    const verdaleen = digests[0]!;
    expect(verdaleen.decision).toBe("NO_EXPERIENCE");
    expect(verdaleen.missingData.length).toBeGreaterThan(0);
  });

  it("the engine says NO_EXPERIENCE where that is correct, and recommends where evidence supports it", () => {
    expect(digests.filter((d) => d.decision === "NO_EXPERIENCE").length).toBeGreaterThanOrEqual(2);
    expect(digests.filter((d) => d.decision !== "NO_EXPERIENCE").length).toBeGreaterThanOrEqual(2);
    const catalogue = digests.find((d) => d.fixture === "FIXTURE-CATALOGUE")!;
    expect(catalogue.generator.experiences[0]?.outcome).toBe("rendered");
  });

  it("delivery: verified values render, an AI-drafted formula is DELIVERY_UNAVAILABLE, a decision with no values is DELIVERY_UNAVAILABLE", () => {
    for (const name of ["FIXTURE-SAAS-ROI + verified calculator", "FIXTURE-SCHOOL + verified assessment", "FIXTURE-STUDIO + verified selector"]) {
      const d = digests.find((x) => x.fixture === name)!;
      expect(d.delivery[0], name).toMatchObject({ status: "DELIVERABLE", mode: "interactive", rendered: true });
    }
    expect(digests.find((x) => x.fixture === "FIXTURE-SAAS-ROI + AI-drafted formula")!.delivery[0]).toMatchObject({ status: "DELIVERY_UNAVAILABLE", dataStatus: "unverified", rendered: false });
    expect(digests.find((x) => x.fixture === "FIXTURE-SAAS-ROI")!.delivery[0]).toMatchObject({ status: "DELIVERY_UNAVAILABLE", dataStatus: "unavailable" });
  });
});
