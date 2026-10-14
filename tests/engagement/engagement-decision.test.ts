/**
 * ENGAGEMENT OPPORTUNITY INTELLIGENCE — brief phase 15 plus ECO §23.
 *
 * Every scenario runs the REAL pipeline on a synthetic fixture and asserts both
 * the decision and the reasons for the alternatives it rejected. Scores are not
 * pinned to exact numbers except at policy thresholds: the weights are a starting
 * model, and a test that froze every number would make recalibration look like
 * breakage.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { runPipeline } from "../../src/pipeline.js";
import { generateWebsite } from "../../src/generation/generate-website.js";
import { decisionRecordSchema } from "../../src/design-intelligence/types/decision.js";
import { industrySchema } from "../../src/design-intelligence/types/business-input.js";
import { OPPORTUNITY_CATEGORIES, OPPORTUNITY_REGISTRY } from "../../src/engagement/registry.js";
import { EXPERIENCE_PATTERNS } from "../../src/engagement/experience-patterns.js";
import { ENGAGEMENT_WEIGHTS } from "../../src/engagement/scoring.js";
import { evaluateCombination } from "../../src/engagement/combination.js";
import { meetsMinimum, selectComplements } from "../../src/engagement/decide.js";
import { vanityRationales } from "../../src/engagement/gates.js";
import { ENGAGEMENT_CATEGORY_IDS } from "../../src/engagement/vocabulary.js";
import { engagementDataVerdict } from "../../src/content/engagement-data.js";
import { content } from "../fixtures/business-inputs.js";
import * as F from "../fixtures/engagement-fixtures.js";

const decide = (input: ReturnType<typeof F.simpleBusiness>) => runPipeline(input).output.engagement;
const evaluation = (d: ReturnType<typeof decide>, category: string) => d.evaluations.find((e) => e.category === category)!;
const failedGates = (d: ReturnType<typeof decide>, category: string) =>
  evaluation(d, category).gates.filter((g) => g.status === "fail").map((g) => g.gate);

// ------------------------------------------------------------------ registry and contracts

describe("registry — suitability metadata, not a menu", () => {
  it("holds the 27 brief categories, each with the phase-4 fields", () => {
    expect(OPPORTUNITY_CATEGORIES).toHaveLength(27);
    expect(Object.keys(OPPORTUNITY_REGISTRY).sort()).toEqual([...ENGAGEMENT_CATEGORY_IDS].sort());
    for (const c of OPPORTUNITY_CATEGORIES) {
      expect(c.visitorProblem.length, c.id).toBeGreaterThan(0);
      expect(c.visitorTasks.length, c.id).toBeGreaterThan(0);
      expect(c.businessObjectives.length, c.id).toBeGreaterThan(0);
      expect(c.funnelStages.length, c.id).toBeGreaterThan(0);
      expect(c.staticAlternative.length, c.id).toBeGreaterThan(0);
      expect(c.fallback.length, c.id).toBeGreaterThan(0);
      expect(c.minimumSuitability, c.id).toBeGreaterThanOrEqual(45);
      expect(c.approvalRequirements.length, c.id).toBeGreaterThan(0);
    }
  });

  it("has no industry field, and no industry name in the registry source (industry may not dominate)", () => {
    for (const c of OPPORTUNITY_CATEGORIES) expect(Object.keys(c)).not.toContain("industry");
    // Code only: comments legitimately name files such as objective-architecture.ts.
    const source = readFileSync("src/engagement/registry.ts", "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    const specific = industrySchema.options.filter((i) => !["other", "art", "media", "campaign", "corporate", "editorial", "entertainment"].includes(i));
    for (const industry of specific) {
      expect(new RegExp(`\\b${industry}\\b`).test(source), `registry names industry "${industry}"`).toBe(false);
    }
  });

  it("games carry the special minimums: gamification 75, standalone game 85", () => {
    expect(OPPORTUNITY_REGISTRY.gamification.minimumSuitability).toBe(75);
    expect(OPPORTUNITY_REGISTRY.challenge_habit_loop.minimumSuitability).toBe(75);
    expect(OPPORTUNITY_REGISTRY.game_serious_game.minimumSuitability).toBe(85);
  });

  it("only the eight initial patterns are implemented; higher-complexity categories stay registry-only", () => {
    expect(Object.keys(EXPERIENCE_PATTERNS).sort()).toEqual(
      ["assessment", "booking", "calculator", "comparison", "guided_selector", "progressive_form", "result", "static_fallback"].sort(),
    );
    for (const id of ["configurator", "interactive_demo", "simulation", "recommendation_engine", "gamification", "game_serious_game", "visualizer_3d_ar_webgl"] as const) {
      expect(OPPORTUNITY_REGISTRY[id].experiencePattern, id).toBeUndefined();
    }
  });

  it("every experience contract inherits the framework gates: no-JS path, keyboard, fallback, kill switch, no §9 violation", () => {
    for (const p of Object.values(EXPERIENCE_PATTERNS)) {
      expect(p.rendering.baseline).toBe("semantic_html");
      expect(p.rendering.withoutJavaScript.length, p.id).toBeGreaterThan(0);
      expect(p.accessibility.join(" "), p.id).toMatch(/keyboard/);
      expect(p.accessibility.join(" "), p.id).toMatch(/reduced-motion/);
      expect(p.seo.join(" "), p.id).toMatch(/no essential information exists only inside JavaScript/);
      expect(p.fallback.length, p.id).toBeGreaterThan(0);
      expect(p.killSwitch.length, p.id).toBeGreaterThan(0);
      expect(Object.values(p.hardConstraintViolations).some(Boolean), p.id).toBe(false);
    }
    expect(EXPERIENCE_PATTERNS.booking.reusesFormContract).toBe("booking");
    expect(EXPERIENCE_PATTERNS.progressive_form.reusesFormContract).toBe("enquiry");
  });

  it("uses the ECO §6 weights verbatim", () => {
    expect(ENGAGEMENT_WEIGHTS.positive).toEqual({
      visitorValue: 15, taskRelevance: 12, conversionPotential: 10, qualificationValue: 7, personalization: 5,
      differentiation: 4, contentReadiness: 8, dataReadiness: 8, usageFrequency: 4, implementationFeasibility: 5,
    });
    expect(ENGAGEMENT_WEIGHTS.risk).toEqual({ performanceCost: 4, accessibilityRisk: 5, seoRisk: 3, trustComplianceRisk: 8, maintenanceBurden: 4 });
  });
});

// ------------------------------------------------------------------ phase-15 scenarios

describe("1 — a simple business gets NO_EXPERIENCE, as a complete successful decision", () => {
  const d = decide(F.simpleBusiness());

  it("decides NO_EXPERIENCE with reason, evidence, static alternative, rejected candidates and reconsideration conditions", () => {
    expect(d.decision).toBe("NO_EXPERIENCE");
    expect(d.engagementRecommended).toBe(false);
    expect(d.primaryOpportunity).toBeNull();
    expect(d.noExperience?.reason.length).toBeGreaterThan(0);
    expect(d.noExperience?.staticAlternative).toContain("enquiry form");
    expect(d.noExperience?.rejectedCandidates).toHaveLength(27);
    expect(d.noExperience?.reconsiderWhen.length).toBeGreaterThan(0);
    expect(d.rejectedOpportunities).toHaveLength(27);
  });

  it("rejected the progressive form because the conventional enquiry form is adequate", () => {
    expect(failedGates(d, "progressive_profile")).toContain("static_alternative_adequacy");
  });

  it("NO_EXPERIENCE is a valid decision record, not an error", () => {
    const record = d.records.find((r) => r.id === d.decisionRecordId)!;
    expect(record.decision).toBe("NO_EXPERIENCE");
    expect(() => decisionRecordSchema.parse(record)).not.toThrow();
  });
});

describe("2 — a complex catalogue gets a finder or comparison", () => {
  const d = decide(F.complexCatalogue());
  it("selects a discovery or comparison experience", () => {
    expect(d.decision).toBe("PRIMARY_EXPERIENCE");
    expect(["product_service_finder", "comparison_tool", "guided_selector"]).toContain(d.primaryOpportunity?.category);
  });
});

describe("3 — SaaS with a stated return question gets an ROI calculator; assessment is a candidate", () => {
  const d = decide(F.saasRoi());
  it("selects roi_calculator and keeps assessment among the recommendations", () => {
    expect(d.primaryOpportunity?.category).toBe("roi_calculator");
    expect(d.recommendations.map((r) => r.category)).toContain("assessment");
    expect(d.primaryOpportunity?.placement.section).toBe("decision_support_section");
  });
});

describe("4 — a professional service gets an assessment or estimator", () => {
  it("selects assessment or price_estimator", () => {
    expect(["assessment", "price_estimator"]).toContain(decide(F.professionalService()).primaryOpportunity?.category);
  });
});

describe("5 — booking-first", () => {
  it("with real availability: the booking flow, served by the existing booking contract", () => {
    const d = decide(F.bookingFirst(true));
    expect(d.primaryOpportunity?.category).toBe("booking_flow");
    expect(d.primaryOpportunity?.experiencePattern).toBe("booking");
    expect(d.primaryOpportunity?.placement.section).toBe("conversion_section");
  });

  it("without a scheduling integration: NO_EXPERIENCE — the appointment request form IS the right booking experience", () => {
    const d = decide(F.bookingFirst(false));
    expect(d.decision).toBe("NO_EXPERIENCE");
    expect(d.noExperience?.staticAlternative).toContain("appointment request form");
    expect(d.noExperience?.reconsiderWhen.join()).toContain("scheduling integration");
  });
});

describe("6–9 — objectives and tasks, not industry, shape the candidate", () => {
  it("education → assessment, planner or readiness checklist", () => {
    expect(["assessment", "planner", "checklist_readiness_tool"]).toContain(decide(F.education()).primaryOpportunity?.category);
  });
  it("fitness → goal selector or planner", () => {
    expect(["guided_selector", "planner", "product_service_finder"]).toContain(decide(F.fitness()).primaryOpportunity?.category);
  });
  it("manufacturing → configurator or selector", () => {
    expect(["configurator", "guided_selector", "product_service_finder"]).toContain(decide(F.manufacturing()).primaryOpportunity?.category);
  });
  it("real estate → affordability, filter or booking", () => {
    expect(["calculator", "product_service_finder", "guided_selector", "booking_flow"]).toContain(decide(F.realEstate()).primaryOpportunity?.category);
  });
});

describe("same business, different objective → different recommendation; different industry → same", () => {
  it("the objective changes the recommendation", () => {
    const leads = decide(F.professionalService(["generate_leads"]));
    const booking = decide(F.professionalService(["book_appointments"], { schedulingIntegration: true }));
    expect(leads.primaryOpportunity?.category).toBe("assessment");
    expect(booking.primaryOpportunity?.category).toBe("booking_flow");
    // The booking flow was not merely outscored for leads: it served no stated objective.
    expect(failedGates(leads, "booking_flow")).toContain("objective_linkage");
  });

  it("changing only the industry does not change the recommendation", () => {
    const categories = (["professional_services", "other", "retail", "education"] as const).map(
      (industry) => decide(F.professionalService(["generate_leads"], {}, industry)).primaryOpportunity?.category,
    );
    expect(new Set(categories).size).toBe(1);
  });
});

describe("10 — a customer-requested game with weak business value is rejected", () => {
  const d = decide(F.gameRequestedWeak());
  it("does not select the game, names the vanity rationale, and asks the owner", () => {
    expect(d.primaryOpportunity?.category).not.toBe("game_serious_game");
    expect(d.requestedIdeaAssessment?.category).toBe("game_serious_game");
    expect(d.requestedIdeaAssessment?.qualified).toBe(false);
    expect(d.requestedIdeaAssessment?.reasons.join()).toMatch(/causal path/);
    expect(d.approvalRequirements.join()).toContain('requested idea "game_serious_game" did not qualify');
    expect(vanityRationales("increase time on page and make the site look modern and memorable")).toEqual(
      expect.arrayContaining(["time_on_page", "looks_modern", "memorable"]),
    );
  });

  it("a documented causal path lets the game past objective linkage; the other gates still decide", () => {
    const withPath = decide(
      F.education({
        visitorTasks: [{ task: "practice_or_train", basis: "stated" }],
        gameCausalPath: { outcome: "learning", description: "FIXTURE: repeated practice of the programme's assessed skill" },
      }),
    );
    expect(evaluation(withPath, "game_serious_game").gates.find((g) => g.gate === "objective_linkage")?.status).toBe("pass");
    expect(evaluation(withPath, "game_serious_game").outcome).not.toBe("selected_primary");
  });
});

describe("game policy thresholds (ECO §10)", () => {
  it("gamification needs 75, a standalone game 85, everything else 45", () => {
    expect(meetsMinimum(OPPORTUNITY_REGISTRY.gamification, 74)).toBe(false);
    expect(meetsMinimum(OPPORTUNITY_REGISTRY.gamification, 75)).toBe(true);
    expect(meetsMinimum(OPPORTUNITY_REGISTRY.game_serious_game, 84)).toBe(false);
    expect(meetsMinimum(OPPORTUNITY_REGISTRY.game_serious_game, 85)).toBe(true);
    expect(meetsMinimum(OPPORTUNITY_REGISTRY.assessment, 44)).toBe(false);
    expect(meetsMinimum(OPPORTUNITY_REGISTRY.assessment, 45)).toBe(true);
  });

  it("gamification in a high-trust context is rejected: play would trivialise a serious decision", () => {
    const d = decide(F.professionalService(["educate"], { visitorTasks: [{ task: "practice_or_train", basis: "stated" }] }));
    const gates = evaluation(d, "gamification").gates;
    expect(gates.find((g) => g.gate === "legal_compliance")?.status).toBe("fail");
  });
});

describe("11 — missing data never produces a fabricated output", () => {
  for (const status of ["unavailable", "provided_unverified", "partial"] as const) {
    it(`formulas ${status}: the calculator is downgraded, never selected, and nothing numeric is emitted`, () => {
      const input = F.saasRoi({}, { formulas: status });
      const { output, contract } = runPipeline(input);
      const d = output.engagement;
      expect(evaluation(d, "roi_calculator").outcome).toBe("downgraded");
      expect(evaluation(d, "roi_calculator").scorecard).toBeNull();
      expect(failedGates(d, "roi_calculator")).toContain("data_integrity");
      expect(["roi_calculator", "calculator"]).not.toContain(d.primaryOpportunity?.category);
      expect(d.missingData).toContain("formulas");
      const site = generateWebsite(input, output, contract);
      expect(site.manifest.engagement.experiences.map((e) => e.category)).not.toContain("roi_calculator");
    });
  }

  it("an absent optional data status is 'unavailable', never 'probably fine'", () => {
    const verdict = engagementDataVerdict(content(), "formulas");
    expect(verdict.status).toBe("unavailable");
    expect(verdict.usable).toBe(false);
    expect(engagementDataVerdict(content({ decisionRules: "provided_unverified" }), "decisionRules").approvalRequired).toBe(true);
  });
});

describe("12 — accessibility failure downgrades", () => {
  it("a high-risk experience against an AAA-equivalent target is downgraded at the accessibility gate", () => {
    const base = F.manufacturing();
    const d = decide({ ...base, constraints: { ...(base.constraints ?? { localization: [], integrations: [] }), accessibilityRequirement: "wcag_aaa_or_equivalent" } });
    expect(failedGates(d, "configurator")).toContain("accessibility_feasibility");
    expect(evaluation(d, "configurator").outcome).not.toMatch(/selected/);
  });

  it("3D is downgraded for any audience (accessibility risk 5)", () => {
    const d = decide(F.manufacturing());
    expect(failedGates(d, "visualizer_3d_ar_webgl")).toContain("accessibility_feasibility");
  });
});

describe("13 — performance failure downgrades", () => {
  it("a heavy experience on a performance-sensitive site is downgraded at the performance gate", () => {
    const base = F.manufacturing();
    const d = decide({ ...base, constraints: { ...(base.constraints ?? { localization: [], integrations: [] }), performanceSensitivity: "high" } });
    expect(failedGates(d, "configurator")).toContain("performance_feasibility");
  });

  it("an experience larger than the route budget is downgraded", () => {
    const d = decide(F.manufacturing());
    expect(evaluation(d, "visualizer_3d_ar_webgl").gates.find((g) => g.gate === "performance_feasibility")?.reason).toMatch(/KB/);
  });
});

describe("14 & 15 — the multiple-experience policy", () => {
  it("rejects competing primary calls to action", () => {
    const result = evaluateCombination([OPPORTUNITY_REGISTRY.booking_flow, OPPORTUNITY_REGISTRY.progressive_profile], { routeJsBudgetKb: 200, allowParallel: false });
    expect(result.allowed).toBe(false);
    expect(result.checks.find((c) => c.check === "no_competing_ctas")?.passed).toBe(false);
  });

  it("rejects the overload example: quiz + estimator + survey + gamification + calculator", () => {
    const set = ["quiz", "price_estimator", "survey_poll", "gamification", "calculator"].map((id) => OPPORTUNITY_REGISTRY[id as keyof typeof OPPORTUNITY_REGISTRY]);
    const result = evaluateCombination(set, { routeJsBudgetKb: 200, allowParallel: true });
    expect(result.allowed).toBe(false);
    const failed = result.checks.filter((c) => !c.passed).map((c) => c.check);
    expect(failed).toEqual(expect.arrayContaining(["count", "distinct_jobs", "cognitive_cost"]));
  });

  it("allows complementary experiences with distinct jobs in one journey: ROI calculator → booking", () => {
    const result = evaluateCombination([OPPORTUNITY_REGISTRY.roi_calculator, OPPORTUNITY_REGISTRY.booking_flow], { routeJsBudgetKb: 200, allowParallel: false });
    expect(result.allowed).toBe(true);
    expect(result.checks.find((c) => c.check === "coherent_journey")?.reason).toContain("roi_calculator → booking_flow");
  });

  describe("selectComplements — the decision-level band and combination rules", () => {
    const d = decide(F.realEstate());
    const qualified = d.evaluations.filter((e) => e.scorecard !== null && e.outcome !== "below_minimum");
    const withScore = (category: string, score: number) => {
      const e = structuredClone(d.evaluations.find((x) => x.category === category)!);
      e.scorecard = { ...(e.scorecard ?? structuredClone(qualified[0]!.scorecard!)), score };
      return e;
    };

    it("below 75 no complement is considered, whatever qualifies", () => {
      expect(selectComplements(withScore("calculator", 74), [withScore("booking_flow", 73)], 250).secondary).toEqual([]);
    });

    it("at 75+ a focused complement with a distinct job in one journey is added (calculator → booking)", () => {
      const result = selectComplements(withScore("calculator", 76), [withScore("booking_flow", 73)], 250);
      expect(result.secondary.map((s) => s.category)).toEqual(["booking_flow"]);
      expect(result.checks.every((c) => c.passed)).toBe(true);
    });

    it("at 75+ a complement below 60 is not added, and a competing primary action is refused", () => {
      expect(selectComplements(withScore("calculator", 76), [withScore("booking_flow", 55)], 250).secondary).toEqual([]);
      const competing = selectComplements(withScore("booking_flow", 80), [withScore("progressive_profile", 70)], 250);
      expect(competing.secondary).toEqual([]);
      expect(competing.checks.find((c) => c.check === "no_competing_ctas")?.passed).toBe(false);
    });

    it("between 75 and 84, jobs that do not form one journey are refused; at 85+ they may run in parallel", () => {
      // A data explorer (no call to action) beside booking: no competing actions, but not one journey.
      const sequentialOnly = selectComplements(withScore("booking_flow", 80), [withScore("interactive_chart_explorer", 70)], 250);
      expect(sequentialOnly.secondary).toEqual([]);
      const parallel = selectComplements(withScore("booking_flow", 86), [withScore("interactive_chart_explorer", 70)], 250);
      expect(parallel.secondary.map((s) => s.category)).toEqual(["interactive_chart_explorer"]);
    });

    it("parallel supporting actions with no single primary action compete, even at 85+", () => {
      const result = selectComplements(withScore("guided_selector", 86), [withScore("calculator", 70)], 250);
      expect(result.secondary).toEqual([]);
      expect(result.checks.find((c) => c.check === "no_competing_ctas")?.passed).toBe(false);
    });
  });
});

describe("16 — a customer's specific idea is still evaluated", () => {
  it("a failing idea is not accepted; the framework's own decision stands and the owner sees why", () => {
    const base = F.simpleBusiness();
    const d = decide({ ...base, engagement: { preference: "specific_idea", requestedIdea: { category: "quiz", rationale: "FIXTURE: owner likes quizzes" }, visitorTasks: [], frictionPoints: [], sensitiveDataCategories: [] } });
    expect(d.requestedIdeaAssessment?.qualified).toBe(false);
    expect(d.primaryOpportunity?.category).not.toBe("quiz");
    expect(d.approvalRequirements.join()).toContain('requested idea "quiz"');
  });

  it("a qualifying idea is honoured even when another candidate scores higher, and the alternatives are listed", () => {
    const d = decide(F.education({ preference: "specific_idea", requestedIdea: { category: "planner", rationale: "FIXTURE: learners plan study time" } }));
    expect(d.primaryOpportunity?.category).toBe("planner");
    expect(d.requestedIdeaAssessment?.qualified).toBe(true);
    expect(d.recommendations[0]?.category).toBe("assessment");
  });
});

describe("17 — the owner's 'no interactive experience' is respected", () => {
  it("returns NO_EXPERIENCE, flags the conflict with a stated requirement, and adds nothing", () => {
    const input = F.bookingFirst(true, "no_experience");
    const { output, contract } = runPipeline(input);
    const d = output.engagement;
    expect(d.decision).toBe("NO_EXPERIENCE");
    expect(d.noExperience?.reason).toContain("owner chose");
    expect(d.preferenceConflicts.join()).toContain("booking_flow");
    expect(evaluation(d, "booking_flow").outcome).toBe("excluded_by_preference");
    const site = generateWebsite(input, output, contract);
    expect(site.manifest.engagement.experiences).toEqual([]);
    expect(site.refusals.filter((r) => r.kind === "engagement_experience")).toEqual([]);
  });

  it("'choose from recommendations' returns a ranked list and marks the pick as awaiting the owner", () => {
    const d = decide(F.education({ preference: "choose_from_recommendations" }));
    expect(d.recommendations.length).toBeGreaterThan(1);
    expect(d.recommendations[0]!.score).toBeGreaterThanOrEqual(d.recommendations[1]!.score - 5);
    expect(d.approvalRequirements.join()).toContain("owner to choose");
  });
});

// ------------------------------------------------------------------ scoring and gates discipline

describe("scoring — a heuristic, never a conversion prediction", () => {
  it("reports 'Suitability score: n/100' and never an uplift or percentage", () => {
    const d = decide(F.saasRoi());
    const explanations = d.evaluations.flatMap((e) => (e.scorecard ? [e.scorecard.explanation] : []));
    expect(explanations.length).toBeGreaterThan(0);
    for (const text of explanations) {
      expect(text).toMatch(/^Suitability score: \d{1,3}\/100/);
      expect(text).not.toMatch(/\d+\s*%|uplift|increase[sd]? conversion|conversion by|will convert/i);
    }
  });

  it("a gate failure is never scored, so a score cannot rescue it", () => {
    const d = decide(F.complexCatalogue());
    for (const e of d.evaluations) {
      if (e.gates.some((g) => g.status === "fail")) {
        expect(e.scorecard, e.category).toBeNull();
        expect(e.outcome, e.category).not.toMatch(/selected|qualified/);
      }
    }
  });

  it("keeps every dimension and its reason, not only the total", () => {
    const card = decide(F.saasRoi()).scorecard!;
    expect(Object.keys(card.positive)).toHaveLength(10);
    expect(Object.keys(card.risk)).toHaveLength(5);
    for (const d of [...Object.values(card.positive), ...Object.values(card.risk)]) expect(d.why.length).toBeGreaterThan(0);
  });
});

// ------------------------------------------------------------------ pipeline, contract, generator

describe("integration — one decision log, one budget, the contract and the generator consume the decision", () => {
  it("appends engagement records (extending DecisionRecord) to the one decision log", () => {
    const { output } = runPipeline(F.saasRoi());
    const records = output.decisionLog.filter((r) => r.ruleId === "ENGAGEMENT-POLICY");
    expect(records.map((r) => r.id)).toContain("ENG-DECISION");
    expect(records).toHaveLength(28);
    for (const r of records) expect(() => decisionRecordSchema.parse(r)).not.toThrow();
  });

  it("a selected experience enters the SAME budget enforcement, approvals and contract; NO_EXPERIENCE adds nothing", () => {
    const selected = runPipeline(F.saasRoi());
    expect(selected.output.performanceStrategy.plan.map((e) => e.patternId)).toContain("engagement:roi_calculator");
    expect(selected.output.approvalsRequired.join()).toContain("engagement roi_calculator");
    expect(selected.contract.analyticsEvents.some((e) => e.startsWith("engagement_"))).toBe(true);
    expect(selected.contract.fallbackRequirements.map((f) => f.pattern)).toContain("engagement:roi_calculator");

    const none = runPipeline(F.simpleBusiness());
    expect(none.output.performanceStrategy.plan.some((e) => e.patternId.startsWith("engagement:"))).toBe(false);
    expect(none.contract.analyticsEvents.some((e) => e.startsWith("engagement_"))).toBe(false);
  });

  it("never writes the engagement score into the quality score sheet (no second scoring authority)", () => {
    const { output } = runPipeline(F.saasRoi());
    expect(Object.keys(output.quality.sheet)).not.toContain("engagement");
  });

  it("resolves placement to a real page route, and never to the hero", () => {
    const { output } = runPipeline(F.saasRoi());
    const placement = output.engagement.placement!;
    expect(output.pages.map((p) => p.route)).toContain(placement.route);
    expect(placement.section).not.toBe("hero");
  });

  it("a selected calculator with no supplied formula VALUES is DELIVERY_UNAVAILABLE, never rendered as a placeholder", () => {
    const input = F.saasRoi();
    const { output, contract } = runPipeline(input);
    const site = generateWebsite(input, output, contract);
    expect(site.manifest.engagement.experiences[0]).toMatchObject({ category: "roi_calculator", status: "DELIVERY_UNAVAILABLE", outcome: "delivery_unavailable" });
    expect(site.refusals.some((r) => r.kind === "engagement_experience" && r.what.includes("roi_calculator"))).toBe(true);
    const html = Object.entries(site.files).filter(([p]) => p.endsWith(".html")).map(([, b]) => b).join("\n");
    expect(html).not.toMatch(/calculator/i);
  });

  it("booking maps to the existing booking section — no second form is emitted", () => {
    const input = F.bookingFirst(true);
    const { output, contract } = runPipeline(input);
    const site = generateWebsite(input, output, contract);
    expect(site.manifest.engagement.experiences[0]).toMatchObject({ category: "booking_flow", outcome: "served_by_existing_section" });
    expect(site.manifest.formContracts.filter((f) => f.contract.kind === "booking").length).toBeLessThanOrEqual(output.pages.length);
  });
});

describe("generator — the comparison proves the static path end to end", () => {
  const comparison = {
    engagementData: {
      comparison: {
        caption: "FIXTURE comparison",
        rowHeading: "FIXTURE product",
        criteria: ["FIXTURE criterion A", "FIXTURE criterion B"],
        rows: [
          { offer: "FIXTURE-PRODUCT-1", values: ["FIXTURE a1", "FIXTURE b1"] },
          { offer: "FIXTURE-PRODUCT-2", values: ["FIXTURE a2", "FIXTURE b2"] },
        ],
        source: "FIXTURE owner-approved comparison sheet",
      },
    },
  };

  it("renders a semantic table from verified supplied values, before the conversion section, with no client boundary", () => {
    const input = F.complexCatalogue();
    const { output, contract } = runPipeline(input);
    // Within the 5-point tie band the cheaper, statically renderable comparison wins (decide.ts rank()).
    expect(output.engagement.primaryOpportunity?.category).toBe("comparison_tool");
    const site = generateWebsite(input, output, contract, { suppliedContent: comparison });
    const html = Object.entries(site.files).filter(([p]) => p.endsWith(".html")).map(([, b]) => b).join("\n");
    expect(html).toContain('<div class="c-table-scroll" role="region" aria-labelledby="engagement-comparison-caption" tabindex="0">');
    expect(html).toContain('<th scope="col">FIXTURE criterion A</th>');
    expect(html).toContain('<th scope="row">FIXTURE-PRODUCT-1</th>');
    expect(site.manifest.engagement.experiences[0]).toMatchObject({ category: "comparison_tool", outcome: "rendered" });
    expect(site.manifest.clientBoundaries.some((b) => b.nodeId.includes("comparison"))).toBe(false);
    expect(Object.entries(site.files).filter(([p]) => p.startsWith("next/app")).map(([, b]) => b).join("\n")).toContain("c-table-scroll");
  });

  it("refuses values for offers the owner never supplied, and values without verified status", () => {
    const input = F.complexCatalogue();
    const { output, contract } = runPipeline(input);
    expect(output.engagement.primaryOpportunity?.category).toBe("comparison_tool");
    const invented = structuredClone(comparison);
    invented.engagementData.comparison.rows[1]!.offer = "FIXTURE-INVENTED-OFFER";
    const refused = generateWebsite(input, output, contract, { suppliedContent: invented });
    expect(refused.manifest.engagement.experiences[0]?.outcome).toBe("delivery_unavailable");
    expect(refused.content.comparison).toMatchObject({ state: "refused" });

    const unverified = { ...input, availableContent: { ...input.availableContent, comparisonData: "provided_unverified" as const } };
    expect(generateWebsite(unverified, output, contract, { suppliedContent: comparison }).content.comparison).toMatchObject({ state: "refused" });
  });

  it("a site whose decision is NO_EXPERIENCE contains no engagement node, however much data is supplied", () => {
    const input = F.simpleBusiness();
    const { output, contract } = runPipeline(input);
    const site = generateWebsite(input, output, contract, { suppliedContent: comparison });
    expect(site.manifest.engagement).toMatchObject({ decision: "NO_EXPERIENCE", experiences: [] });
    const kinds: string[] = [];
    for (const page of site.model.pages) for (const n of page.nodes) kinds.push(n.kind);
    expect(kinds).not.toContain("comparison_table");
  });
});
