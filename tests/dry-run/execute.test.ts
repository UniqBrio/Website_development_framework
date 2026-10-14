/**
 * DRY-RUN HARNESS.
 *
 * Runs the REAL `runPipeline()` on the unseen fixture and writes every phase to
 * disk so the report can be written from actual output rather than from
 * assumptions about what the code does. Nothing here fills a gap the pipeline
 * left: where a phase produces nothing, the artifact records nothing.
 *
 * Artifacts land in the scratchpad, not the repo — they are evidence for one
 * report, not a framework file.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { runPipeline } from "../../src/pipeline.js";
import { deriveDesignContextProfile } from "../../src/design-intelligence/profile/derive-profile.js";
import { industryBaseline } from "../../src/design-intelligence/baseline/industry-baseline.js";
import { ALL_RULES, ruleCoverage } from "../../src/design-intelligence/rules/index.js";
import { evaluateRules } from "../../src/design-intelligence/engine/evaluator.js";
import { verifyContent } from "../../src/content/verification.js";
import { buildSeoStrategy } from "../../src/seo/strategy.js";
import { MANDATORY_TEST_PROFILES } from "../../src/responsive/capabilities.js";
import { dryRunComponents, dryRunFixture } from "../fixtures/dry-run-fixture.js";

const MANDATORY_PROFILE_COUNT = MANDATORY_TEST_PROFILES.length;

const OUT = join(
  process.env["TEMP"] ?? ".",
  "claude",
  "c--Explorations-Website-development-framework",
  "dry-run",
);

function dump(name: string, value: unknown): void {
  const path = join(OUT, name);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2), "utf8");
}

describe("dry run — real pipeline on an unseen fixture", () => {
  const input = dryRunFixture();
  // Retained only to prove the derivation replaced it; see the P0-4 tests.
  const handAuthoredComponents = dryRunComponents();

  it("executes end to end and writes every phase", () => {
    // Phase-by-phase, using the same modules the pipeline uses, so the report
    // can show intermediate state the pipeline does not itself expose.
    const profile = deriveDesignContextProfile(input);
    const baseline = industryBaseline(profile.industry);
    const facts = { ...profile, locationVerified: input.location?.verified ?? false };
    const evaluation = evaluateRules(facts, ALL_RULES);
    const contentPlan = verifyContent(input);
    const renderable = new Set(
      contentPlan.sections.filter((s) => s.render).map((s) => s.category),
    );
    // Standalone call kept only to dump the pre-page-model shape for comparison.
    const seoWithoutPages = buildSeoStrategy(profile, renderable);

    // No `components` override: the inventory is DERIVED from the page model
    // and the selected patterns. Passing a hand-authored list is what made the
    // first dry run's responsive coverage dishonest.
    const { output, contract } = runPipeline(input);

    dump("01-business-input.json", input);
    dump("02-design-context-profile.json", profile);
    dump("03-industry-baseline.json", baseline);
    dump("04-rule-evaluation.json", {
      appliedRuleIds: evaluation.appliedRuleIds,
      blocked: evaluation.blocked,
      skippedCount: evaluation.skippedRuleIds.length,
      skippedRuleIds: evaluation.skippedRuleIds,
      draft: evaluation.draft,
      forbidden: evaluation.forbidden,
      obligations: evaluation.obligations,
      conflicts: evaluation.conflicts,
      recordCount: evaluation.records.length,
    });
    dump("05-content-plan.json", contentPlan);
    dump("06-seo-strategy.json", {
      fromPipeline: output.seoStrategy,
      withoutPageModel: seoWithoutPages,
    });
    dump("07-selection-decisions.json", output.selectionDecisions);
    dump("08-design-decision-output.json", output);
    dump("09-implementation-contract.json", contract);
    dump("10-rule-coverage.json", ruleCoverage());

    // A compact console digest so the run is legible without opening 10 files.
    const digest = {
      variables: profile.variables,
      provenanceBases: profile.provenance.reduce<Record<string, number>>((acc, p) => {
        acc[p.basis] = (acc[p.basis] ?? 0) + 1;
        return acc;
      }, {}),
      archetype: baseline.archetype,
      visualExpression: output.visualExpression,
      motionCap: output.motionStrategy.cap,
      appliedRules: evaluation.appliedRuleIds,
      blockedRules: evaluation.blocked.map((b) => `${b.ruleId} by ${b.by.fact}`),
      designPersonality: output.designPersonality,
      layoutStrategy: output.layoutStrategy,
      sectionArchitecture: output.sectionArchitecture,
      selectedPatterns: output.selectedPatterns,
      selectionOutcomes: output.selectionDecisions.reduce<Record<string, number>>((acc, d) => {
        acc[d.outcome] = (acc[d.outcome] ?? 0) + 1;
        return acc;
      }, {}),
      rejectedWithReason: output.selectionDecisions
        .filter((d) => d.outcome !== "select" && d.outcome !== "select_with_fallback")
        .map((d) => `${d.patternId}: ${d.outcome} — ${d.explanation}`),
      imageStrategy: output.imageStrategy.strategy,
      stack: {
        framework: output.stack.framework,
        rendering: output.stack.renderingStrategy,
        pwa: output.stack.pwaConstraintEnabled,
        recordedRule: output.stack.recordedRule,
        libraries: output.stack.libraries,
        constraints: output.stack.architecturalConstraints,
      },
      seo: {
        // From the PIPELINE, so the report shows what a real run produces.
        renderingConstraint: output.seoStrategy.renderingConstraint,
        pageArchitecture: output.seoStrategy.pageArchitecture,
        allowed: output.seoStrategy.allowedSchemaTypes.map((s) => s.type),
        withheld: output.seoStrategy.withheldSchemaTypes.map(
          (s) => `${s.type} (missing ${s.missingEvidence.join(", ")})`,
        ),
        metadataRules: output.seoStrategy.metadataRules,
      },
      performance: {
        budgetKb: output.performanceStrategy.budgetKb,
        initialKb: output.performanceStrategy.initialKb,
        finalKb: output.performanceStrategy.finalKb,
        withinBudget: output.performanceStrategy.withinBudget,
        actions: output.performanceStrategy.actions,
      },
      content: {
        rendered: contentPlan.sections.filter((s) => s.render).map((s) => s.category),
        hidden: contentPlan.sections.filter((s) => !s.render).map((s) => `${s.category} (${s.replacement ?? "omitted"})`),
        requests: contentPlan.requests,
        blockedConversionPaths: contentPlan.blockedConversionPaths,
      },
      pages: output.pages.map((p) => ({
        route: p.route,
        ownerSupplied: p.ownerSupplied,
        primaryObjective: p.primaryObjective,
        audience: p.audience,
        seoRole: p.seoRole,
        sections: p.requiredSections,
        conversionRole: p.conversionRole,
      })),
      objectiveCoverage: {
        complete: output.objectiveCoverage.complete,
        unserved: output.objectiveCoverage.unserved,
        failures: output.objectiveCoverage.failures,
        entries: output.objectiveCoverage.entries.map((e) => ({
          objective: e.objective,
          served: e.served,
          present: e.presentSections,
          missing: e.missingSections,
          servingPatterns: e.servingPatterns,
          blockedEvidence: e.blockedEvidence,
        })),
      },
      quality: {
        mode: output.quality.mode,
        level: output.quality.evaluation.level,
        weightedScore: output.quality.evaluation.weightedScore,
        gates: output.quality.gates,
        unknownGates: output.quality.evaluation.unknownGates,
        failedGates: output.quality.evaluation.failedGates,
        blockers: output.quality.blockers,
        explanation: output.quality.evaluation.explanation,
      },
      stackOmitted: output.stack.omittedLibraries,
      responsive: {
        derivedInventorySize: output.responsiveStrategy.audit.decisions.length /
          MANDATORY_PROFILE_COUNT,
        strategy: output.responsiveStrategy.strategy,
        decisionCount: output.responsiveStrategy.audit.decisions.length,
        refusals: output.responsiveStrategy.audit.refusals.map(
          (r) => `${r.componentId} @${r.range}: refused ${r.refused?.requested} — ${r.refused?.because}`,
        ),
        coreContentPreserved: output.responsiveStrategy.audit.coreContentPreserved,
        transformationCounts: output.responsiveStrategy.audit.decisions.reduce<Record<string, number>>(
          (acc, d) => {
            acc[d.transformation] = (acc[d.transformation] ?? 0) + 1;
            return acc;
          },
          {},
        ),
      },
      accessibility: output.accessibilityStrategy,
      approvalsRequired: output.approvalsRequired,
      conflicts: output.conflicts,
      contract: {
        lazyLoading: contract.lazyLoadingRequirements,
        fallbacks: contract.fallbackRequirements,
        budgets: contract.performanceBudgets,
        analytics: contract.analyticsEvents,
        publication: contract.publicationRequirements,
      },
      coverage: ruleCoverage(),
    };
    dump("00-digest.json", digest);
    // eslint-disable-next-line no-console
    console.log("DRY-RUN-DIGEST " + JSON.stringify(digest));

    expect(output.profile.businessName).toBe("FIXTURE-VERDALEEN-MOBILITY");
    expect(contract.framework).toBe("nextjs");
  });

  it("every P0/P1 subsystem is now REACHABLE from the pipeline", () => {
    // The first dry run asserted the opposite: quality, tokens and the page
    // model were all undefined because nothing called them. This test is the
    // inverted form, kept so a regression would be caught immediately.
    const { output } = runPipeline(input);
    expect(output.quality, "quality engine unreachable").toBeDefined();
    expect(output.quality.accessibility, "accessibility evaluation unreachable").toBeDefined();
    expect(output.tokens, "design tokens unreachable").toBeDefined();
    expect(output.seoArtifacts, "SEO artifacts unreachable").toBeDefined();
    expect(output.pages.length, "page model unreachable").toBeGreaterThan(0);
    expect(output.objectiveCoverage, "objective coverage unreachable").toBeDefined();

    // Still honestly absent: the refinement loop needs a mutation callback only a
    // generator can supply, so it is NOT invoked here and must not pretend to be.
    expect((output as unknown as Record<string, unknown>)["refinement"]).toBeUndefined();
  });
});
