import { describe, expect, it } from "vitest";
import {
  ROUTE_BUDGETS,
  WEB_VITALS,
  budgetForArchetype,
  enforceBudget,
  type Enhancement,
} from "../../src/performance/budgets.js";

function enhancement(overrides: Partial<Enhancement> & Pick<Enhancement, "patternId">): Enhancement {
  return {
    estimatedRouteJsKb: 10,
    loading: "deferred",
    fallback: "static equivalent",
    hasDocumentedPurpose: true,
    ...overrides,
  };
}

describe("§H thresholds", () => {
  it("matches the specification's Core Web Vitals targets", () => {
    expect(WEB_VITALS.standard).toEqual({ lcpSeconds: 2.5, inpMs: 200, cls: 0.1 });
    expect(WEB_VITALS.premium).toEqual({ lcpSeconds: 2.0, inpMs: 150, cls: 0.05 });
  });

  it("has all six §H.1 route budget rows", () => {
    expect(Object.keys(ROUTE_BUDGETS)).toHaveLength(6);
    expect(ROUTE_BUDGETS["regulated_or_local_service"]?.routeJsKb).toBe(150);
    expect(ROUTE_BUDGETS["creative_portfolio_campaign"]?.routeJsKb).toBe(400);
  });
});

describe("budget assignment", () => {
  it("gives a regulated archetype the tightest budget and forbids decorative WebGL", () => {
    const budget = budgetForArchetype("trust_first_transactional_information");
    expect(budget.routeJsKb).toBe(150);
    expect(budget.prohibitedHeavyVisuals).toContain("decorative-webgl-hero");
  });

  it("gives an unmapped archetype the STRICTEST budget, not a generous default", () => {
    const budget = budgetForArchetype("something_nobody_registered");
    expect(budget.routeJsKb).toBe(150);
  });

  it("gives a creative portfolio the largest budget", () => {
    expect(budgetForArchetype("portfolio_and_capability_narrative").routeJsKb).toBe(400);
  });
});

describe("§15 budget enforcement CHANGES the plan, it does not just report", () => {
  it("removes an effect with no documented purpose regardless of budget", () => {
    const verdict = enforceBudget(
      [enhancement({ patternId: "decorative-thing", hasDocumentedPurpose: false, estimatedRouteJsKb: 5 })],
      budgetForArchetype("portfolio_and_capability_narrative"),
    );
    expect(verdict.plan).toHaveLength(0);
    expect(verdict.actions[0]).toMatchObject({ action: "remove" });
    expect(verdict.actions[0]?.reason).toContain("no documented UX or brand purpose");
  });

  it("removes an effect prohibited for the archetype even when it fits the budget", () => {
    const verdict = enforceBudget(
      [enhancement({ patternId: "decorative-webgl-hero", estimatedRouteJsKb: 20 })],
      budgetForArchetype("trust_first_transactional_information"),
    );
    expect(verdict.plan).toHaveLength(0);
    expect(verdict.actions[0]?.reason).toContain("prohibited for this archetype");
  });

  it("defers an eagerly-loaded heavy module (§H.2)", () => {
    const verdict = enforceBudget(
      [enhancement({ patternId: "big-gallery", estimatedRouteJsKb: 60, loading: "eager" })],
      budgetForArchetype("premium_travel_fashion"),
    );
    expect(verdict.actions.some((a) => a.action === "defer")).toBe(true);
    expect(verdict.plan[0]?.loading).toBe("on_demand");
  });

  it("downgrades the largest enhancement until the budget is met", () => {
    const verdict = enforceBudget(
      [
        enhancement({ patternId: "webgl", estimatedRouteJsKb: 220, fallback: "static-poster" }),
        enhancement({ patternId: "gallery", estimatedRouteJsKb: 18 }),
      ],
      budgetForArchetype("b2b_saas"),
    );
    expect(verdict.withinBudget).toBe(true);
    expect(verdict.finalKb).toBeLessThanOrEqual(200);
    expect(verdict.actions.some((a) => a.action === "downgrade_to_fallback")).toBe(true);
    expect(verdict.plan.some((e) => e.patternId === "static-poster")).toBe(true);
  });

  it("removes an over-budget enhancement that has no fallback", () => {
    const verdict = enforceBudget(
      [enhancement({ patternId: "unfallbackable", estimatedRouteJsKb: 500, fallback: "" })],
      budgetForArchetype("b2b_saas"),
    );
    expect(verdict.plan).toHaveLength(0);
    expect(verdict.withinBudget).toBe(true);
    expect(verdict.actions.some((a) => a.reason.includes("no fallback"))).toBe(true);
  });

  it("always terminates and always ends within budget", () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      enhancement({ patternId: `effect-${i}`, estimatedRouteJsKb: 90, fallback: `static-${i}` }),
    );
    const verdict = enforceBudget(many, budgetForArchetype("b2b_saas"));
    expect(verdict.withinBudget).toBe(true);
  });

  it("keeps a plan that already fits, unchanged", () => {
    const verdict = enforceBudget(
      [enhancement({ patternId: "modest", estimatedRouteJsKb: 12 })],
      budgetForArchetype("b2b_saas"),
    );
    expect(verdict.plan).toHaveLength(1);
    expect(verdict.actions).toEqual([
      { action: "keep", patternId: "modest", reason: "within budget" },
    ]);
  });
});
