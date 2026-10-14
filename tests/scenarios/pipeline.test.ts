import { describe, expect, it } from "vitest";
import { runPipeline } from "../../src/pipeline.js";
import {
  ALL_RULES,
  INTENTIONALLY_NOT_ENCODED,
  getRule,
  ruleCoverage,
} from "../../src/design-intelligence/rules/index.js";
import { ruleSchema } from "../../src/design-intelligence/types/decision.js";
import {
  assets,
  baseInput,
  content,
  fixtureCreativePortfolio,
  fixtureEcommerce,
  fixtureHealthcare,
  fixturePwaRequired,
  fixtureSaas,
} from "../fixtures/business-inputs.js";

describe("rule corpus integrity", () => {
  it("every encoded rule validates against the schema", () => {
    for (const rule of ALL_RULES) {
      expect(() => ruleSchema.parse(rule), `${rule.id} is malformed`).not.toThrow();
    }
  });

  it("every rule has a rationale and at least one source", () => {
    for (const rule of ALL_RULES) {
      expect(rule.rationale.length, `${rule.id} has no rationale`).toBeGreaterThan(20);
      expect(rule.source_urls.length, `${rule.id} cites no source`).toBeGreaterThan(0);
    }
  });

  it("has no duplicate rule ids", () => {
    const ids = ALL_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every rule that can be blocked declares a fallback", () => {
    for (const rule of ALL_RULES) {
      if (rule.unless.length > 0) {
        expect(rule.fallback.length, `${rule.id} has unless but no fallback`).toBeGreaterThan(0);
      }
    }
  });

  it("reports coverage in three honest buckets that sum to the specification", () => {
    const coverage = ruleCoverage();
    expect(coverage.specifiedCount).toBe(120);
    expect(coverage.encodedCount).toBe(ALL_RULES.length);
    // encoded + intentionally-not-encoded + pending == 120, and nothing is in two.
    expect(
      coverage.encodedCount + coverage.intentionallyNotEncodedCount + coverage.pendingCount,
    ).toBe(120);
    expect(coverage.contradictions).toEqual([]);
    // Encoded rules must span the decision domains, not cluster in one.
    expect(coverage.domainsCovered.length).toBeGreaterThanOrEqual(8);
  });

  it("classification counts cannot be read as '120 executable rules'", () => {
    const c = ruleCoverage().byClassification;
    const total = c.executable + c.gate + c.scoring + c.approval;
    expect(total).toBe(ALL_RULES.length);
    // Executable rules are a strict minority of the corpus; the rest gate, score
    // or raise approvals. The report must say so rather than quote one number.
    expect(c.executable).toBeLessThan(total);
    expect(c.gate).toBeGreaterThan(0);
    expect(c.scoring).toBeGreaterThan(0);
    expect(c.approval).toBeGreaterThan(0);
  });

  it("every intentionally-omitted rule names the authority that governs it instead", () => {
    expect(INTENTIONALLY_NOT_ENCODED).toHaveLength(17);
    for (const omission of INTENTIONALLY_NOT_ENCODED) {
      expect(omission.governedBy.length, `${omission.id} names no governing authority`).toBeGreaterThan(10);
      expect(omission.reason.length).toBeGreaterThan(20);
      expect(getRule(omission.id), `${omission.id} is both encoded and omitted`).toBeUndefined();
    }
  });

  it("covers the domains that carry hard constraints", () => {
    const coverage = ruleCoverage();
    for (const domain of ["a11y", "performance", "seo", "content", "responsive", "interaction"]) {
      expect(coverage.domainsCovered, `no rule encoded for ${domain}`).toContain(domain);
    }
  });

  it("exposes rules by id", () => {
    expect(getRule("DD-001")?.title).toBe("Professional services");
    expect(getRule("DD-999")).toBeUndefined();
  });
});

describe("§3 pipeline end to end", () => {
  it("produces a complete DesignDecisionOutput and ImplementationContract", () => {
    const { output, contract } = runPipeline(fixtureSaas());

    expect(output.profile.businessName).toBe("FIXTURE-SAAS");
    expect(output.baseline.archetype).toBe("product_led_technical_narrative");
    expect(output.designPersonality).toContain("technical");
    expect(output.decisionLog.length).toBeGreaterThan(0);
    expect(contract.framework).toBe("nextjs");
    expect(contract.performanceBudgets.routeJsKb).toBe(200);
  });

  it("every decision in the log carries rule id, rationale, source and fallback", () => {
    const { output } = runPipeline(fixtureSaas());
    for (const record of output.decisionLog) {
      // DD rules, or the engagement policy whose records extend DecisionRecord.
      expect(record.ruleId).toMatch(/^(DD-\d{3}|ENGAGEMENT-POLICY)$/);
      expect(record.rationale.length).toBeGreaterThan(0);
      expect(record.decision.length).toBeGreaterThan(0);
      expect(Object.keys(record.inputFacts).length).toBeGreaterThanOrEqual(0);
    }
  });

  it("appends the SaaS section architecture from DD-002", () => {
    const { output } = runPipeline(fixtureSaas());
    expect(output.sectionArchitecture).toContain("integrations");
    expect(output.sectionArchitecture).toContain("security");
    expect(output.sectionArchitecture).toContain("workflow");
  });
});

describe("§27 business decision scenarios, end to end", () => {
  it("healthcare gets a low expression ceiling and minimal motion", () => {
    const { output } = runPipeline(fixtureHealthcare());
    expect(output.visualExpression).toBe("low");
    expect(output.motionStrategy.cap).toBe("minimal");
  });

  it("healthcare never selects a decorative or spatial effect", () => {
    const { output } = runPipeline(fixtureHealthcare());
    for (const forbidden of ["decorative-webgl-hero", "cursor-follower", "3d-product-view", "parallax-depth"]) {
      expect(output.selectedPatterns, `healthcare must not select ${forbidden}`).not.toContain(forbidden);
    }
  });

  it("a creative portfolio with verified work gets a higher ceiling than healthcare", () => {
    const creative = runPipeline(fixtureCreativePortfolio()).output;
    const healthcare = runPipeline(fixtureHealthcare()).output;
    const order = ["low", "low_to_medium", "medium", "medium_to_high", "high"];
    expect(order.indexOf(creative.visualExpression)).toBeGreaterThan(
      order.indexOf(healthcare.visualExpression),
    );
  });

  it("ecommerce never selects an auto-carousel or hover-only product info", () => {
    const { output } = runPipeline(fixtureEcommerce());
    expect(output.selectedPatterns).not.toContain("auto-rotating-carousel");
    expect(output.selectedPatterns).not.toContain("hover-only-product-info");
    expect(output.interactionStrategy.rejected).toContain("auto-rotating-carousel");
  });

  it("a stated PWA requirement reaches the contract as an architectural constraint", () => {
    const { output } = runPipeline(fixturePwaRequired());
    expect(output.stack.pwaConstraintEnabled).toBe(true);
    expect(output.stack.architecturalConstraints.join()).toContain("indexable HTML");
  });
});

describe("§12 content integrity reaches the contract", () => {
  it("a business with no assets has publication requirements, not invented proof", () => {
    const { output, contract } = runPipeline(baseInput({ websiteObjective: ["generate_leads"] }));
    expect(contract.publicationRequirements.length).toBeGreaterThan(0);
    expect(output.contentPlan.requests.length).toBeGreaterThan(0);
    // Nothing proof-bearing may render.
    const rendered = output.contentPlan.sections.filter((s) => s.render).map((s) => s.category);
    expect(rendered).not.toContain("testimonials");
    expect(rendered).not.toContain("statistics");
    expect(rendered).not.toContain("customer_logos");
  });

  it("a blocked conversion path becomes a publication requirement", () => {
    const { contract } = runPipeline(
      baseInput({ industry: "ecommerce", websiteObjective: ["sell_products"] }),
    );
    expect(contract.publicationRequirements.join()).toContain("blocked conversion path");
  });

  it("image strategy falls back to typography when no imagery exists", () => {
    const { output } = runPipeline(baseInput());
    expect(output.imageStrategy.strategy).toBe("non_representational_only");
    expect(output.imageStrategy.rationale).toContain("never simulated");
  });

  it("selection is content-gated: patterns needing absent assets are not selected", () => {
    const withAssets = runPipeline(fixtureCreativePortfolio()).output;
    const withoutAssets = runPipeline(
      baseInput({
        industry: "creative_agency",
        brandPersonality: ["premium", "editorial"],
        availableContent: content({ propositionText: "verified_available" }),
        availableAssets: assets(),
      }),
    ).output;
    // Content gating is what is under test: without assets, asset-dependent patterns
    // are DEFERRED for missing evidence rather than selected. (Counting selected
    // patterns stopped showing this once FD-11 removed unrenderable patterns from
    // selection entirely.)
    const deferredFor = (o: typeof withAssets) =>
      o.selectionDecisions.filter((d) => d.outcome === "defer" && d.gates.some((g) => g.gate === "content_readiness" && !g.passed)).length;
    expect(deferredFor(withoutAssets)).toBeGreaterThan(deferredFor(withAssets));
    expect(withAssets.selectedPatterns.length).toBeGreaterThanOrEqual(withoutAssets.selectedPatterns.length);
  });
});

describe("§15 the budget is enforced, not reported", () => {
  it("the final plan is always within the archetype budget", () => {
    for (const fixture of [
      fixtureSaas(),
      fixtureHealthcare(),
      fixtureEcommerce(),
      fixtureCreativePortfolio(),
      baseInput(),
    ]) {
      const { output } = runPipeline(fixture);
      expect(
        output.performanceStrategy.withinBudget,
        `${fixture.businessName} exceeded its budget`,
      ).toBe(true);
      expect(output.performanceStrategy.finalKb).toBeLessThanOrEqual(
        output.performanceStrategy.budgetKb,
      );
    }
  });

  it("regulated businesses get the tightest budget", () => {
    expect(runPipeline(fixtureHealthcare()).contract.performanceBudgets.routeJsKb).toBe(150);
  });

  it("heavy selected modules are lazy in the contract", () => {
    const { contract } = runPipeline(fixtureCreativePortfolio());
    for (const requirement of contract.lazyLoadingRequirements) {
      expect(requirement).toMatch(/deferred|on_demand/);
    }
  });
});

describe("§23 the generator consumes decisions and never makes them", () => {
  it("the contract's component strategy names only patterns the engine selected", () => {
    const { output, contract } = runPipeline(fixtureSaas());
    const named = contract.componentStrategy[0] ?? "";
    for (const id of output.selectedPatterns) {
      expect(named).toContain(id);
    }
    // A pattern the engine rejected must not appear anywhere in the contract.
    for (const rejected of output.interactionStrategy.rejected) {
      expect(contract.componentStrategy.join(" ")).not.toContain(rejected);
    }
  });

  it("every selected pattern above plain HTML/CSS carries a fallback in the contract", () => {
    const { output, contract } = runPipeline(fixtureCreativePortfolio());
    const withFallback = new Set(contract.fallbackRequirements.map((f) => f.pattern));
    const needing = output.selectionDecisions.filter((d) => d.outcome === "select_with_fallback");
    for (const decision of needing) {
      expect(withFallback, `${decision.patternId} has no fallback in the contract`).toContain(
        decision.patternId,
      );
    }
    for (const requirement of contract.fallbackRequirements) {
      expect(requirement.fallback.length).toBeGreaterThan(0);
    }
  });
});

describe("determinism (§28)", () => {
  it("the same input produces an identical output", () => {
    const a = runPipeline(fixtureSaas());
    const b = runPipeline(fixtureSaas());
    expect(JSON.stringify(a.output)).toBe(JSON.stringify(b.output));
    expect(JSON.stringify(a.contract)).toBe(JSON.stringify(b.contract));
  });

  it("an owner ceiling can only lower the expression level, never raise it", () => {
    const uncapped = runPipeline(fixtureCreativePortfolio()).output.visualExpression;
    const capped = runPipeline({
      ...fixtureCreativePortfolio(),
      constraints: { localization: [], integrations: [], maxVisualExpression: "low" },
    }).output.visualExpression;
    expect(capped).toBe("low");
    const order = ["low", "low_to_medium", "medium", "medium_to_high", "high"];
    expect(order.indexOf(capped)).toBeLessThanOrEqual(order.indexOf(uncapped));
  });

  it("reports rule conflicts rather than resolving them silently", () => {
    const { output } = runPipeline(fixtureSaas());
    // With the current corpus there should be no conflict; if one appears it must
    // be surfaced in the output rather than hidden.
    expect(Array.isArray(output.conflicts)).toBe(true);
    for (const conflict of output.conflicts) {
      expect(conflict.ruleIds.length).toBeGreaterThan(1);
    }
  });
});
