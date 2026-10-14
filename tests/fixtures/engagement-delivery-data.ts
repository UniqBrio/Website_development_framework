/**
 * ENGAGEMENT DELIVERY DATA — synthetic, visibly non-real (`FIXTURE-*`) supplied
 * values for the governed delivery types. Every number, rule and sentence here is
 * a test value with explicit provenance; none describes a real business, rate or
 * outcome.
 */
import type { CalculatorDefinition, DecisionFlowDefinition, ProvenanceRecord } from "../../src/content/engagement-values.js";

export const verified = (source: string): ProvenanceRecord => ({ provenance: "customer_supplied_verified", source });

/** FIXTURE time-value calculator for the SaaS ROI fixture (category roi_calculator). */
export function calculatorDefinition(overrides: Partial<CalculatorDefinition> = {}): CalculatorDefinition {
  return {
    category: "roi_calculator",
    title: "FIXTURE time value estimate",
    intro: "FIXTURE: enter your own figures to see the yearly value of hours saved.",
    inputs: [
      { id: "hours-per-week", label: "Hours saved per week", unit: "hours", min: 0, max: 80, step: 0.5, help: "FIXTURE: hours your team would no longer spend" },
      { id: "hourly-cost", label: "Hourly cost", unit: "FIXTURE-CURRENCY", min: 0, max: 1000, step: 1 },
    ],
    constants: [
      { id: "weeks-per-year", label: "Weeks per year", value: 52, unit: "weeks", kind: "mathematical", provenance: "framework_policy", source: "calendar" },
      { id: "adoption-factor", label: "FIXTURE adoption factor", value: 0.5, unit: "ratio", kind: "business", ...verified("FIXTURE owner analysis sheet v1") },
    ],
    formula: {
      id: "fixture-time-value",
      name: "FIXTURE time value formula",
      description: "FIXTURE: hours saved per week × hourly cost × weeks per year × adoption factor, rounded to a whole number.",
      version: "1",
      expression: {
        op: "round",
        decimals: 0,
        arg: {
          op: "multiply",
          args: [{ input: "hours-per-week" }, { input: "hourly-cost" }, { constant: "weeks-per-year" }, { constant: "adoption-factor" }],
        },
      },
      ...verified("FIXTURE owner analysis sheet v1"),
    },
    result: { label: "FIXTURE yearly value", unit: "FIXTURE-CURRENCY", decimals: 0 },
    assumptions: [{ text: "FIXTURE: half of saved hours are redeployed", ...verified("FIXTURE owner analysis sheet v1") }],
    dataSource: "FIXTURE owner analysis sheet v1",
    examples: [{ inputs: { "hours-per-week": 10, "hourly-cost": 40 }, expected: 10400, ...verified("FIXTURE owner analysis sheet v1") }],
    limitations: ["FIXTURE: an estimate from your inputs, not a promise of value"],
    copy: verified("FIXTURE owner-approved copy"),
    ...overrides,
  };
}

/** FIXTURE study-level assessment for the education fixture (category assessment). */
export function assessmentDefinition(overrides: Partial<DecisionFlowDefinition> = {}): DecisionFlowDefinition {
  return {
    category: "assessment",
    kind: "assessment",
    title: "FIXTURE find your starting level",
    intro: "FIXTURE: two questions about where you are now.",
    questions: [
      {
        id: "level",
        text: "FIXTURE: how would you describe your current level?",
        options: [
          { id: "beginner", label: "FIXTURE beginner" },
          { id: "intermediate", label: "FIXTURE intermediate" },
          { id: "advanced", label: "FIXTURE advanced" },
        ],
      },
      {
        id: "time",
        text: "FIXTURE: how much time can you give each week?",
        options: [
          { id: "few-hours", label: "FIXTURE a few hours" },
          { id: "many-hours", label: "FIXTURE many hours" },
        ],
      },
    ],
    outcomes: [
      { id: "foundation", title: "FIXTURE foundation level", explanation: "FIXTURE: start with the foundation programme.", recommendedOffer: "FIXTURE-PROGRAMME-1" },
      { id: "intensive", title: "FIXTURE intensive level", explanation: "FIXTURE: the intensive programme fits your level and time.", recommendedOffer: "FIXTURE-PROGRAMME-3" },
      { id: "standard", title: "FIXTURE standard level", explanation: "FIXTURE: the standard programme fits you.", recommendedOffer: "FIXTURE-PROGRAMME-2" },
    ],
    rules: [
      { id: "r-foundation", outcome: "foundation", when: [{ question: "level", anyOf: ["beginner"] }] },
      { id: "r-intensive", outcome: "intensive", when: [{ question: "level", anyOf: ["advanced"] }, { question: "time", anyOf: ["many-hours"] }] },
      { id: "r-standard", outcome: "standard", when: [{ question: "level", anyOf: ["intermediate", "advanced"] }] },
    ],
    noMatch: { title: "FIXTURE talk to us", explanation: "FIXTURE: your answers need a conversation." },
    ruleSet: { id: "fixture-levels", version: "1", description: "FIXTURE: level first, then weekly time.", ...verified("FIXTURE admissions rule sheet v1") },
    copy: verified("FIXTURE owner-approved copy"),
    ...overrides,
  };
}

/** FIXTURE goal selector for the fitness fixture (category guided_selector). */
export function selectorDefinition(overrides: Partial<DecisionFlowDefinition> = {}): DecisionFlowDefinition {
  return {
    category: "guided_selector",
    kind: "selector",
    title: "FIXTURE find a programme for your goal",
    intro: "FIXTURE: choose your goal and experience.",
    questions: [
      {
        id: "goal",
        text: "FIXTURE: what is your main goal?",
        options: [
          { id: "strength", label: "FIXTURE strength" },
          { id: "endurance", label: "FIXTURE endurance" },
          { id: "mobility", label: "FIXTURE mobility" },
        ],
      },
      {
        id: "experience",
        text: "FIXTURE: have you trained before?",
        options: [
          { id: "new", label: "FIXTURE new to training" },
          { id: "returning", label: "FIXTURE returning" },
        ],
      },
    ],
    outcomes: [
      { id: "strength-programme", title: "FIXTURE strength match", explanation: "FIXTURE: a strength programme.", recommendedOffer: "FIXTURE-PROGRAMME-1" },
      { id: "endurance-programme", title: "FIXTURE endurance match", explanation: "FIXTURE: an endurance programme.", recommendedOffer: "FIXTURE-PROGRAMME-2" },
      { id: "mobility-programme", title: "FIXTURE mobility match", explanation: "FIXTURE: a mobility programme.", recommendedOffer: "FIXTURE-PROGRAMME-3" },
    ],
    rules: [
      { id: "r-strength", outcome: "strength-programme", when: [{ question: "goal", anyOf: ["strength"] }] },
      { id: "r-endurance", outcome: "endurance-programme", when: [{ question: "goal", anyOf: ["endurance"] }] },
      { id: "r-mobility", outcome: "mobility-programme", when: [{ question: "goal", anyOf: ["mobility"] }, { question: "experience", anyOf: ["new", "returning"] }] },
    ],
    noMatch: { title: "FIXTURE ask a coach", explanation: "FIXTURE: a coach will help you choose." },
    ruleSet: { id: "fixture-goals", version: "1", description: "FIXTURE: the goal decides the programme.", ...verified("FIXTURE coaching rule sheet v1") },
    copy: verified("FIXTURE owner-approved copy"),
    ...overrides,
  };
}

export const supplied = (engagementData: { calculators?: CalculatorDefinition[]; decisionFlows?: DecisionFlowDefinition[] }) => ({ engagementData });
