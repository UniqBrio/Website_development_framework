import { describe, expect, it } from "vitest";
import {
  CRITERIA,
  evaluateQuality,
  weightedScore,
  type GateStatus,
  type ScoreSheet,
} from "../../src/quality/scoring.js";
import { planRemediations, refine } from "../../src/quality/refinement.js";

const allGatesPass: GateStatus = {
  technical: true,
  accessibility: true,
  responsive: true,
  performance: true,
  content: true,
  design: true,
};

/** Score every criterion at `value`, so thresholds can be probed precisely. */
function sheetAt(value: number, overrides: Record<string, number> = {}): ScoreSheet {
  const sheet: ScoreSheet = {};
  for (const criterion of CRITERIA) {
    const v = overrides[criterion.key] ?? value;
    sheet[criterion.key] = { scored: true, value: v, evidence: "test" };
  }
  return sheet;
}

describe("§K.1 criteria table", () => {
  it("has all 25 criteria with the specified weights", () => {
    expect(CRITERIA).toHaveLength(25);
    expect(CRITERIA.find((c) => c.key === "accessibility")?.weight).toBe(10);
    expect(CRITERIA.find((c) => c.key === "performance")?.weight).toBe(9);
    expect(CRITERIA.find((c) => c.key === "mobile_experience")?.weight).toBe(8);
    expect(CRITERIA.find((c) => c.key === "grid_consistency")?.weight).toBe(3);
  });

  it("sets accessibility's production minimum at 8, the highest of any criterion", () => {
    const a11y = CRITERIA.find((c) => c.key === "accessibility");
    expect(a11y?.productionMinimum).toBe(8);
    expect(a11y?.worldClassMinimum).toBe(9);
  });
});

describe("§K.2 weighted score", () => {
  it("returns null when nothing was scored, rather than zero", () => {
    // Zero would read as "terrible"; null reads as "not measured" (§F6).
    expect(weightedScore({})).toBeNull();
  });

  it("excludes unscored criteria from the denominator", () => {
    const sheet: ScoreSheet = {
      accessibility: { scored: true, value: 9, evidence: "measured" },
      memorability: { scored: false, reason: "not machine-measurable" },
    };
    // Only accessibility counts: 9 * 10 / 10 * 10 = 90.
    expect(weightedScore(sheet)).toBeCloseTo(90);
  });

  it("computes the specification's formula over a uniform sheet", () => {
    expect(weightedScore(sheetAt(8))).toBeCloseTo(80);
  });
});

describe("§19 a critical gate failure blocks production regardless of score", () => {
  it("refuses production_ready on a perfect score when accessibility gate fails", () => {
    const result = evaluateQuality(sheetAt(10), { ...allGatesPass, accessibility: false });
    expect(result.weightedScore).toBeCloseTo(100);
    expect(result.level).toBe("technically_working");
    expect(result.failedGates).toEqual(["accessibility"]);
    expect(result.explanation).toContain("regardless of total score");
  });

  it("reports `failing` when the technical gate fails", () => {
    const result = evaluateQuality(sheetAt(10), { ...allGatesPass, technical: false });
    expect(result.level).toBe("failing");
  });

  it("blocks on a content-integrity gate failure", () => {
    const result = evaluateQuality(sheetAt(9), { ...allGatesPass, content: false });
    expect(result.level).toBe("technically_working");
    expect(result.failedGates).toContain("content");
  });
});

describe("§K.3 classification boundaries", () => {
  it("is production_ready at 75 with no core score below 6", () => {
    const result = evaluateQuality(sheetAt(7.5), allGatesPass);
    expect(result.weightedScore).toBeCloseTo(75);
    expect(result.level).toBe("production_ready");
  });

  it("is not production_ready below 75", () => {
    const result = evaluateQuality(sheetAt(7), allGatesPass);
    expect(result.level).toBe("technically_working");
    expect(result.explanation).toContain("below the production threshold");
  });

  it("is not production_ready when any core criterion is below 6, whatever the total", () => {
    const result = evaluateQuality(sheetAt(10, { navigation: 3 }), allGatesPass);
    expect(result.weightedScore).toBeGreaterThan(90);
    expect(result.level).toBe("technically_working");
    expect(result.weaknesses[0]?.key).toBe("navigation");
  });

  it("reaches professionally_designed above 82 with the required minimums", () => {
    const result = evaluateQuality(
      sheetAt(8.5, { accessibility: 8, responsive_behavior: 8, performance: 8 }),
      allGatesPass,
    );
    expect(result.weightedScore).toBeGreaterThanOrEqual(82);
    expect(result.level).toBe("professionally_designed");
  });

  it("stays production_ready just below 82, even with every minimum met", () => {
    // 8.2 uniform with accessibility/responsive/performance at exactly their
    // minimums yields 81.6 — the threshold is not rounded up to be generous.
    const result = evaluateQuality(
      sheetAt(8.2, { accessibility: 8, responsive_behavior: 8, performance: 8 }),
      allGatesPass,
    );
    expect(result.weightedScore).toBeLessThan(82);
    expect(result.level).toBe("production_ready");
  });

  it("reaches world_class at 90 with every required minimum met", () => {
    const result = evaluateQuality(sheetAt(9.2), allGatesPass);
    expect(result.level).toBe("world_class");
    // Even then, §K.3 requires human review before the label is used.
    expect(result.explanation).toContain("human_design_review_approved");
  });

  it("refuses world_class when any criterion is below 7", () => {
    const result = evaluateQuality(sheetAt(10, { grid_consistency: 6 }), allGatesPass);
    expect(result.level).toBe("professionally_designed");
  });
});

describe("§F6 unscored criteria are never treated as passing", () => {
  it("refuses professionally_designed when accessibility was never scored", () => {
    const sheet = sheetAt(9);
    sheet["accessibility"] = { scored: false, reason: "validator did not run" };
    const result = evaluateQuality(sheet, allGatesPass);
    expect(result.level).toBe("production_ready");
    expect(result.explanation).toContain("unscored");
    expect(result.unscored).toContain("accessibility");
  });

  it("refuses world_class when memorability was never scored", () => {
    const sheet = sheetAt(9.5);
    sheet["memorability"] = { scored: false, reason: "not machine-measurable" };
    const result = evaluateQuality(sheet, allGatesPass);
    expect(result.level).toBe("professionally_designed");
    expect(result.explanation).toContain("memorability");
  });

  it("returns cannot_classify when nothing was measured", () => {
    const result = evaluateQuality({}, allGatesPass);
    expect(result.level).toBe("cannot_classify");
    expect(result.weightedScore).toBeNull();
  });
});

describe("§20 weakness ranking and remediation planning", () => {
  it("ranks weaknesses by weighted gap, worst first", () => {
    const result = evaluateQuality(
      sheetAt(8, { accessibility: 4, grid_consistency: 4 }),
      allGatesPass,
    );
    // accessibility weight 10 × gap 4 beats grid_consistency weight 3 × gap 1.
    expect(result.weaknesses[0]?.key).toBe("accessibility");
  });

  it("produces an actionable instruction, not a score restatement", () => {
    const result = evaluateQuality(sheetAt(8, { accessibility: 4 }), allGatesPass);
    const { automatable } = planRemediations(result);
    const a11y = automatable.find((r) => r.criterion === "accessibility");
    expect(a11y?.kind).toBe("replace_interaction_with_accessible_equivalent");
    expect(a11y?.instruction).toContain("replace it with an accessible equivalent");
    expect(a11y?.subsystem).toBe("accessibility");
  });

  it("escalates a weakness no automated pass can fix", () => {
    const result = evaluateQuality(sheetAt(8, { memorability: 2 }), allGatesPass);
    const { automatable, escalated } = planRemediations(result);
    expect(escalated.some((r) => r.criterion === "memorability")).toBe(true);
    expect(automatable.some((r) => r.criterion === "memorability")).toBe(false);
  });

  it("plans a remediation for a failed gate before a mere weakness", () => {
    const result = evaluateQuality(sheetAt(9), { ...allGatesPass, performance: false });
    const { automatable } = planRemediations(result);
    expect(automatable[0]?.criterion).toBe("performance");
  });
});

describe("§20 refinement loop", () => {
  it("improves a failing sheet to the target and reports pass", () => {
    const sheet = sheetAt(8, { accessibility: 4, performance: 5 });
    const result = refine(
      sheet,
      allGatesPass,
      (remediation, current, gates) => {
        // A remediation that works: lift the criterion it targets to 8.
        const next: ScoreSheet = {
          ...current,
          [remediation.criterion]: { scored: true, value: 8, evidence: "remediated" },
        };
        return { sheet: next, gates };
      },
      { target: "production_ready", maxIterations: 5 },
    );
    expect(result.passed).toBe(true);
    expect(result.finalEvaluation.level).not.toBe("technically_working");
    expect(result.steps.length).toBeGreaterThan(1);
  });

  it("terminates rather than looping when a remediation does not help", () => {
    const sheet = sheetAt(8, { accessibility: 4 });
    const result = refine(
      sheet,
      allGatesPass,
      // A remediation that changes nothing — the pathological case.
      (_remediation, current, gates) => ({ sheet: current, gates }),
      { target: "world_class", maxIterations: 20 },
    );
    expect(result.passed).toBe(false);
    expect(result.stalled).toBe(true);
    // It must not have burned all 20 iterations to discover that.
    expect(result.steps.length).toBeLessThan(20);
  });

  it("stops immediately when the sheet already meets the target", () => {
    const result = refine(sheetAt(9.5), allGatesPass, (_r, s, g) => ({ sheet: s, gates: g }), {
      target: "production_ready",
    });
    expect(result.passed).toBe(true);
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]?.applied).toEqual([]);
  });

  it("collects escalations for everything a human must resolve", () => {
    const result = refine(
      sheetAt(8, { memorability: 2, emotional_impact: 2 }),
      allGatesPass,
      (remediation, current, gates) => ({
        sheet: {
          ...current,
          [remediation.criterion]: { scored: true, value: 8, evidence: "remediated" },
        },
        gates,
      }),
      { target: "world_class", maxIterations: 3 },
    );
    const criteria = result.escalations.map((e) => e.criterion);
    expect(criteria).toContain("memorability");
    expect(criteria).toContain("emotional_impact");
    expect(result.escalations.every((e) => e.automatable === false)).toBe(true);
  });

  it("fixes a failed gate through the loop rather than reporting it", () => {
    const result = refine(
      sheetAt(9),
      { ...allGatesPass, performance: false },
      (remediation, current, gates) => {
        if (remediation.subsystem === "performance") {
          return { sheet: current, gates: { ...gates, performance: true } };
        }
        return { sheet: current, gates };
      },
      { target: "production_ready", maxIterations: 4 },
    );
    expect(result.passed).toBe(true);
    expect(result.finalEvaluation.failedGates).toEqual([]);
  });
});
