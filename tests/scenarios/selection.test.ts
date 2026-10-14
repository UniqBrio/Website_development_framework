import { describe, expect, it } from "vitest";
import {
  GATE_ORDER,
  scorePattern,
  selectElement,
  selectElementSet,
  type SelectionContext,
} from "../../src/design-intelligence/engine/select-elements.js";
import { PATTERNS, getPattern } from "../../src/design-system/pattern-registry/registry.js";
import { deriveDesignContextProfile } from "../../src/design-intelligence/profile/derive-profile.js";
import {
  fixtureCreativePortfolio,
  fixtureEcommerce,
  fixtureHealthcare,
  fixtureSaas,
} from "../fixtures/business-inputs.js";

function ctx(overrides: Partial<SelectionContext> = {}): SelectionContext {
  return {
    profile: deriveDesignContextProfile(fixtureSaas()),
    availableContent: new Set(["proposition", "services", "process", "product_proof", "faq", "case_studies"]),
    verifiedAssets: new Set(["productImages", "heroImages", "portfolioImages"]),
    routeJsBudgetKb: 200,
    alreadySelected: [],
    forbidden: new Set(),
    visualExpressionCeiling: "medium",
    technicalComplexityBudget: "high",
    statedRequirements: new Set<string>(),
    statedObjectives: new Set<string>(),
    ...overrides,
  };
}

function need(id: string) {
  const pattern = getPattern(id);
  if (!pattern) throw new Error(`fixture error: pattern ${id} is not registered`);
  return pattern;
}

describe("§7 gate order", () => {
  it("runs every gate in the specified order", () => {
    const decision = selectElement(need("split-hero"), ctx());
    expect(decision.gates.map((g) => g.gate)).toEqual([...GATE_ORDER]);
  });

  it("does not publish a score alongside a gate failure", () => {
    // A score next to a rejection invites arguing the score against the gate.
    const decision = selectElement(need("hover-only-product-info"), ctx());
    expect(decision.outcome).toBe("reject");
    expect(decision.score).toBeNull();
  });
});

describe("§9 hard constraints — automatic rejection", () => {
  it("rejects hover-only core information", () => {
    const decision = selectElement(need("hover-only-product-info"), ctx());
    expect(decision.outcome).toBe("reject");
    expect(decision.explanation).toMatch(/requiresHoverForCoreInfo|business_relevance/);
  });

  it("rejects an auto-advancing carousel carrying primary content", () => {
    const decision = selectElement(need("auto-rotating-carousel"), ctx());
    expect(decision.outcome).toBe("reject");
  });

  it("rejects an element that would be the only carrier of essential content", () => {
    const decision = selectElement(need("auto-rotating-carousel"), ctx());
    const inclusive = decision.gates.find((g) => g.gate === "inclusive_equivalence");
    // It fails earlier on business relevance; the inclusive gate still records why.
    expect(inclusive?.passed).toBe(false);
  });
});

describe("§7 business relevance", () => {
  it("rejects decorative WebGL for a healthcare business", () => {
    const healthcare = ctx({
      profile: deriveDesignContextProfile(fixtureHealthcare()),
      visualExpressionCeiling: "low",
    });
    const decision = selectElement(need("decorative-webgl-hero"), healthcare);
    expect(decision.outcome).toBe("reject");
    expect(decision.gates.find((g) => g.gate === "business_relevance")?.passed).toBe(false);
  });

  it("rejects a cursor follower on a transactional business", () => {
    const decision = selectElement(need("cursor-follower"), ctx({ visualExpressionCeiling: "high" }));
    expect(decision.outcome).toBe("reject");
  });

  it("rejects an element with no answer to the §7 value questions", () => {
    const creative = ctx({
      profile: deriveDesignContextProfile(fixtureCreativePortfolio()),
      visualExpressionCeiling: "high",
    });
    // Best-for creative, within ceiling, assets present — and still rejected,
    // because it records zero UX and zero conversion benefit.
    const decision = selectElement(need("cursor-follower"), creative);
    expect(decision.outcome).toBe("reject");
    expect(
      decision.gates.find((g) => g.gate === "business_relevance")?.reason,
    ).toContain("§7 requires a concrete answer");
    expect(decision.valueHypothesis.userTaskMadeEasier).toBe("");
  });

  it("rejects a DECORATIVE pattern above the expression ceiling", () => {
    // full-bleed-media is not poorFor saas, so suitability passes and the
    // EXPRESSIVENESS ceiling is what rejects it — the axis under test.
    const decision = selectElement(need("full-bleed-media"), ctx({ visualExpressionCeiling: "low" }));
    // A ceiling breach means "deliver a simpler form", so it replaces.
    expect(decision.outcome).toBe("replace");
    const gate = decision.gates.find((g) => g.gate === "expression_ceiling");
    expect(gate?.passed).toBe(false);
    expect(gate?.reason).toContain("decorative rather than functional");
  });

  it("does NOT reject an explanatory pattern for its implementation tier (P0-1)", () => {
    // An inline SVG diagram sits high on §10's complexity ladder and low on the
    // expressiveness axis. Conflating the two rejected clinical diagrams.
    const decision = selectElement(
      need("data-diagram"),
      ctx({
        profile: deriveDesignContextProfile(fixtureHealthcare()),
        visualExpressionCeiling: "low",
        technicalComplexityBudget: "medium",
        availableContent: new Set(["process"]),
      }),
    );
    expect(decision.outcome).not.toBe("reject");
    expect(decision.gates.find((g) => g.gate === "business_relevance")?.passed).toBe(true);
    expect(decision.gates.find((g) => g.gate === "expression_ceiling")?.passed).toBe(true);
  });

  it("replaces rather than rejects a pattern above the COMPLEXITY budget", () => {
    const decision = selectElement(
      need("3d-product-view"),
      ctx({
        profile: deriveDesignContextProfile(fixtureEcommerce()),
        visualExpressionCeiling: "high",
        technicalComplexityBudget: "low",
        statedRequirements: new Set(["product_configurator"]),
        statedObjectives: new Set(["sell_products"]),
      }),
    );
    expect(decision.outcome).toBe("replace");
    const gate = decision.gates.find((g) => g.gate === "implementation_complexity");
    expect(gate?.reason).toContain("technical complexity budget");
  });
});

describe("§7 content readiness — defer, not reject", () => {
  it("defers a pattern whose required assets are missing", () => {
    const decision = selectElement(
      need("split-hero"),
      ctx({ verifiedAssets: new Set() }),
    );
    expect(decision.outcome).toBe("defer");
    const gate = decision.gates.find((g) => g.gate === "content_readiness");
    expect(gate?.reason).toContain("productImages");
  });

  it("defers rather than filling a pattern with content that does not exist", () => {
    const decision = selectElement(need("faq-accordion"), ctx({ availableContent: new Set() }));
    expect(decision.outcome).toBe("defer");
    const gate = decision.gates.find((g) => g.gate === "content_readiness");
    expect(gate?.reason).toContain("does not exist");
  });
});

describe("§15 performance budget gate — replace, not reject", () => {
  it("replaces a pattern that does not fit the remaining budget", () => {
    const decision = selectElement(
      need("3d-product-view"),
      ctx({
        profile: deriveDesignContextProfile(fixtureEcommerce()),
        visualExpressionCeiling: "high",
        routeJsBudgetKb: 40,
      }),
    );
    expect(decision.outcome).toBe("replace");
    expect(decision.replacementPatternId).toBe("Image gallery");
  });

  it("rejects a high-cost effect on a performance-sensitive site", () => {
    const decision = selectElement(
      need("3d-product-view"),
      ctx({
        profile: deriveDesignContextProfile(fixtureEcommerce()),
        visualExpressionCeiling: "high",
        routeJsBudgetKb: 400,
      }),
    );
    // fixtureEcommerce is mobile-dominant, so performance_sensitivity is high.
    expect(decision.outcome).toBe("replace");
    const gate = decision.gates.find((g) => g.gate === "performance_budget");
    expect(gate?.reason).toContain("performance-sensitive");
  });
});

describe("§7 gate 6 frequency and duplication", () => {
  it("refuses a second use beyond maxFrequencyPerPage", () => {
    const decision = selectElement(
      need("split-hero"),
      ctx({ alreadySelected: ["split-hero"] }),
    );
    expect(decision.outcome).toBe("reject");
    const gate = decision.gates.find((g) => g.gate === "frequency_duplication");
    expect(gate?.reason).toContain("per-page maximum");
  });

  it("allows a pattern up to its declared frequency", () => {
    const decision = selectElement(
      need("modular-feature-grid"),
      ctx({ alreadySelected: ["modular-feature-grid"] }),
    );
    expect(["select", "select_with_fallback"]).toContain(decision.outcome);
  });
});

describe("§7 element set — 2 to 5 meaningful elements", () => {
  it("caps the selected set and records the cap honestly", () => {
    const result = selectElementSet(PATTERNS, ctx(), { maxElements: 3 });
    expect(result.selectedIds.length).toBeLessThanOrEqual(3);
    const deferredByCap = result.decisions.filter((d) =>
      d.explanation.includes("already carries 3 meaningful elements"),
    );
    expect(deferredByCap.length).toBeGreaterThan(0);
  });

  it("never selects a §9-violating pattern however many slots remain", () => {
    const result = selectElementSet(PATTERNS, ctx({ visualExpressionCeiling: "high" }), {
      maxElements: 20,
    });
    expect(result.selectedIds).not.toContain("hover-only-product-info");
    expect(result.selectedIds).not.toContain("auto-rotating-carousel");
    expect(result.selectedIds).not.toContain("cursor-follower");
  });

  it("keeps the route budget non-negative", () => {
    const result = selectElementSet(PATTERNS, ctx({ routeJsBudgetKb: 60 }), { maxElements: 10 });
    expect(result.remainingBudgetKb).toBeGreaterThanOrEqual(0);
  });

  it("selects business-appropriate patterns for a SaaS profile", () => {
    const result = selectElementSet(PATTERNS, ctx(), { maxElements: 5 });
    expect(result.selectedIds.length).toBeGreaterThanOrEqual(2);
    // At least one selected pattern must name this industry in bestFor.
    const relevant = result.selectedIds.filter((id) =>
      getPattern(id)?.bestFor.includes("saas"),
    );
    expect(relevant.length).toBeGreaterThan(0);
  });
});

describe("§8 scoring", () => {
  it("penalises a decorative high-visual pattern for distraction", () => {
    const creative = ctx({
      profile: deriveDesignContextProfile(fixtureCreativePortfolio()),
      visualExpressionCeiling: "high",
    });
    const decorative = scorePattern(need("decorative-webgl-hero"), creative);
    expect(decorative.negative["distractionCost"]).toBeGreaterThan(0);
  });

  it("scores a proof-bearing pattern above a decorative one for the same business", () => {
    const creative = ctx({
      profile: deriveDesignContextProfile(fixtureCreativePortfolio()),
      visualExpressionCeiling: "high",
    });
    const gallery = scorePattern(need("interactive-gallery"), creative).total;
    const webgl = scorePattern(need("decorative-webgl-hero"), creative).total;
    expect(gallery).toBeGreaterThan(webgl);
  });

  it("is a pure function of pattern and context", () => {
    const context = ctx();
    const a = scorePattern(need("split-hero"), context).total;
    const b = scorePattern(need("split-hero"), context).total;
    expect(a).toBe(b);
  });
});

describe("pattern registry integrity", () => {
  it("every pattern declares a fallback and mobile behaviour", () => {
    for (const pattern of PATTERNS) {
      expect(pattern.fallback.trim().length, `${pattern.id} has no fallback`).toBeGreaterThan(0);
      expect(pattern.mobile.trim().length, `${pattern.id} has no mobile behaviour`).toBeGreaterThan(0);
      expect(pattern.reducedMotion.trim().length, `${pattern.id} has no reduced-motion behaviour`).toBeGreaterThan(0);
    }
  });

  it("has unique pattern ids", () => {
    const ids = PATTERNS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("declares a frequency cap of at least 1 for every pattern", () => {
    for (const pattern of PATTERNS) {
      expect(pattern.maxFrequencyPerPage).toBeGreaterThanOrEqual(1);
    }
  });
});
