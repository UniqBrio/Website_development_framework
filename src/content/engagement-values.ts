/**
 * ENGAGEMENT VALUES — the approval-state channel for data an interactive
 * experience computes or recommends from (ECO §17; delivery assessment §5–§6).
 *
 * The content subsystem is the authority on whether a FACT may be used, so this
 * lives beside `engagement-data.ts` (inventory STATUS) and resolves the VALUES.
 * Both layers must agree: an experience is `verified` only when the inventory
 * status for every data kind it needs is verified AND every item it would publish
 * resolves to verified AND its structure is valid. Strictest wins, so the two
 * layers are one authority applied twice, not two authorities.
 *
 * What this module refuses to accept, by construction:
 *  - a numeric literal inside a formula: every number is a named, provenanced
 *    constant, so a rate cannot hide in an expression;
 *  - an AI draft as public truth: `ai_draft` never resolves to verified, and
 *    `approved_ai_draft` does only with a named approver and a date;
 *  - framework-authored business data: `framework_policy` verifies only
 *    MATHEMATICAL constants (12 months per year), never a rate, price, rule,
 *    formula or assumption.
 */
import { z } from "zod";
import type { BusinessInput } from "../design-intelligence/types/business-input.js";
import { ENGAGEMENT_CATEGORY_IDS, type EngagementDataKind } from "../engagement/vocabulary.js";
import { loadEvaluator } from "../generation/runtime/experience-runtime.js";
import { engagementDataVerdict } from "./engagement-data.js";
import { provenanceRecordFields, provenanceSchema, resolveProvenance, type ProvenanceLine, type ValueStatus } from "./provenance.js";
import { publishableOffers } from "./publication.js";

// The provenance vocabulary lives in `./provenance.ts` (one home); re-exported for existing importers.
export { PROVENANCE_VALUES, provenanceRecordFields, resolveProvenance } from "./provenance.js";
export type { Provenance, ProvenanceLine, ProvenanceRecord, ValueStatus } from "./provenance.js";

const provenanced = provenanceRecordFields;

const slug = z.string().regex(/^[a-z][a-z0-9-]{0,40}$/, "ids are lowercase slugs");

// ------------------------------------------------------------------ calculator

export type FormulaExpression =
  | { input: string }
  | { constant: string }
  | { op: "add" | "subtract" | "multiply" | "divide" | "min" | "max"; args: FormulaExpression[] }
  | { op: "round"; arg: FormulaExpression; decimals: number };

export const formulaExpressionSchema: z.ZodType<FormulaExpression> = z.lazy(() =>
  z.union([
    z.object({ input: slug }).strict(),
    z.object({ constant: slug }).strict(),
    z.object({ op: z.enum(["add", "subtract", "multiply", "divide", "min", "max"]), args: z.array(formulaExpressionSchema).min(2) }).strict(),
    z.object({ op: z.literal("round"), arg: formulaExpressionSchema, decimals: z.number().int().min(0).max(6) }).strict(),
  ]),
);

export const calculatorDefinitionSchema = z.object({
  /** Must equal the SELECTED engagement category (e.g. "roi_calculator"). */
  category: z.enum(ENGAGEMENT_CATEGORY_IDS),
  title: z.string().min(1),
  intro: z.string().min(1),
  inputs: z
    .array(
      z.object({
        id: slug,
        label: z.string().min(1),
        unit: z.string().min(1),
        min: z.number().optional(),
        max: z.number().optional(),
        step: z.number().positive().optional(),
        help: z.string().optional(),
      }),
    )
    .min(1),
  constants: z
    .array(
      z.object({
        id: slug,
        label: z.string().min(1),
        value: z.number().finite(),
        unit: z.string().min(1),
        /** `mathematical` = a unit or calendar fact; everything else is business data. */
        kind: z.enum(["business", "mathematical"]),
        ...provenanced,
      }),
    )
    .default([]),
  formula: z.object({
    id: slug,
    name: z.string().min(1),
    /** The calculation in the owner's words, published as the static explanation. */
    description: z.string().min(1),
    version: z.string().min(1),
    expression: formulaExpressionSchema,
    ...provenanced,
  }),
  result: z.object({ label: z.string().min(1), unit: z.string().default(""), decimals: z.number().int().min(0).max(6) }),
  assumptions: z.array(z.object({ text: z.string().min(1), ...provenanced })).default([]),
  /** Where the business data behind the constants comes from, in plain words. */
  dataSource: z.string().min(1),
  /** At least one: it is both the published worked example and the measured check. */
  examples: z
    .array(z.object({ inputs: z.record(z.number().finite()), expected: z.number().finite(), ...provenanced }))
    .min(1),
  limitations: z.array(z.string().min(1)).default([]),
  /** Provenance of the visible copy (title, intro, labels): DD-105 applies to AI copy. */
  copy: provenanceSchema,
});
export type CalculatorDefinition = z.infer<typeof calculatorDefinitionSchema>;

// ------------------------------------------------------------------ decision flow

export const decisionFlowDefinitionSchema = z.object({
  category: z.enum(ENGAGEMENT_CATEGORY_IDS),
  kind: z.enum(["assessment", "selector"]),
  title: z.string().min(1),
  intro: z.string().min(1),
  questions: z
    .array(
      z.object({
        id: slug,
        text: z.string().min(1),
        help: z.string().optional(),
        options: z.array(z.object({ id: slug, label: z.string().min(1) })).min(2),
      }),
    )
    .min(1),
  outcomes: z
    .array(
      z.object({
        id: slug,
        title: z.string().min(1),
        explanation: z.string().min(1),
        /** Must name an owner-supplied offer; the recommendation may not invent one. */
        recommendedOffer: z.string().min(1).optional(),
      }),
    )
    .min(1),
  /** Evaluated in order; AND across conditions; first match wins. */
  rules: z
    .array(
      z.object({
        id: slug,
        outcome: slug,
        when: z.array(z.object({ question: slug, anyOf: z.array(slug).min(1) })).min(1),
      }),
    )
    .min(1),
  /** Owner copy shown when no rule matches. */
  noMatch: z.object({ title: z.string().min(1), explanation: z.string().min(1) }),
  ruleSet: z.object({ id: slug, version: z.string().min(1), description: z.string().min(1), ...provenanced }),
  copy: provenanceSchema,
});
export type DecisionFlowDefinition = z.infer<typeof decisionFlowDefinitionSchema>;

// ------------------------------------------------------------------ resolution

export interface ResolvedExperienceValues<T> {
  status: ValueStatus;
  definition: T | null;
  provenance: ProvenanceLine[];
  /** Every reason the status is not `verified`, naming the item and what would fix it. */
  blockers: string[];
}

function aggregate(lines: readonly ProvenanceLine[], structural: readonly string[], inventory: readonly string[]): ValueStatus {
  if (structural.length > 0) return "unavailable";
  if (lines.some((l) => l.status === "unavailable")) return "unavailable";
  if (inventory.length > 0 || lines.some((l) => l.status === "unverified")) return "unverified";
  return "verified";
}

function inventoryBlockers(input: BusinessInput, kinds: readonly EngagementDataKind[]): { unverified: string[]; unavailable: string[] } {
  const unverified: string[] = [];
  const unavailable: string[] = [];
  for (const kind of kinds) {
    const verdict = engagementDataVerdict(input.availableContent, kind);
    if (verdict.usable) continue;
    const line = `inventory ${kind}: ${verdict.reason}`;
    if (verdict.status === "unavailable" || verdict.status === "not_applicable") unavailable.push(line);
    else unverified.push(line);
  }
  return { unverified, unavailable };
}

function collectRefs(expr: FormulaExpression, acc: { inputs: Set<string>; constants: Set<string> }, depth = 0): number {
  if (depth > 12) return depth;
  if ("input" in expr) acc.inputs.add(expr.input);
  else if ("constant" in expr) acc.constants.add(expr.constant);
  else if (expr.op === "round") return collectRefs(expr.arg, acc, depth + 1);
  else return Math.max(...expr.args.map((a) => collectRefs(a, acc, depth + 1)));
  return depth;
}

/**
 * Resolve a calculator for `category`. `requiredData` is the category's registry
 * `requiredData` (the inventory side); `offers` bound nothing here but keep the
 * signature parallel to decision flows.
 */
export function resolveCalculator(
  input: BusinessInput,
  category: string,
  requiredData: readonly EngagementDataKind[],
  supplied: readonly CalculatorDefinition[],
): ResolvedExperienceValues<CalculatorDefinition> {
  const inventory = inventoryBlockers(input, requiredData);
  const definition = supplied.find((c) => c.category === category) ?? null;
  if (!definition) {
    return {
      status: "unavailable",
      definition: null,
      provenance: [],
      blockers: [...inventory.unavailable, ...inventory.unverified, `no calculator definition was supplied for "${category}" — a formula is never generated`],
    };
  }

  const lines: ProvenanceLine[] = [
    resolveProvenance(`formula ${definition.formula.id} v${definition.formula.version}`, definition.formula, "business"),
    ...definition.constants.map((c) => resolveProvenance(`constant ${c.id}`, c, c.kind)),
    ...definition.assumptions.map((a, i) => resolveProvenance(`assumption ${i + 1}`, a, "business")),
    ...definition.examples.map((e, i) => resolveProvenance(`example ${i + 1}`, e, "business")),
    resolveProvenance("copy", definition.copy, "copy"),
  ];

  const structural: string[] = [];
  const refs = { inputs: new Set<string>(), constants: new Set<string>() };
  if (collectRefs(definition.formula.expression, refs) > 12) structural.push("formula expression is deeper than 12 levels");
  const inputIds = new Set(definition.inputs.map((i) => i.id));
  const constantIds = new Set(definition.constants.map((c) => c.id));
  for (const id of refs.inputs) if (!inputIds.has(id)) structural.push(`formula references undefined input "${id}"`);
  for (const id of refs.constants) if (!constantIds.has(id)) structural.push(`formula references undefined constant "${id}"`);
  for (const id of inputIds) if (!refs.inputs.has(id)) structural.push(`input "${id}" is collected but never used by the formula`);
  if (inputIds.size !== definition.inputs.length) structural.push("input ids are not unique");

  // The SAME evaluator the browser runs checks every owner example.
  if (structural.length === 0) {
    const evaluator = loadEvaluator();
    const constants = Object.fromEntries(definition.constants.map((c) => [c.id, c.value]));
    definition.examples.forEach((example, i) => {
      const missing = definition.inputs.filter((inp) => example.inputs[inp.id] === undefined).map((inp) => inp.id);
      if (missing.length > 0) {
        structural.push(`example ${i + 1} gives no value for ${missing.join(", ")}`);
        return;
      }
      try {
        const actual = evaluator.evaluateFormula(definition.formula.expression, example.inputs, constants);
        const tolerance = 0.5 * 10 ** -definition.result.decimals;
        if (Math.abs(actual - example.expected) > tolerance) {
          structural.push(`example ${i + 1} expects ${example.expected} but the formula gives ${actual} — the owner's example and formula disagree`);
        }
      } catch (e) {
        structural.push(`example ${i + 1} cannot be calculated: ${(e as Error).message}`);
      }
    });
  }

  const status = aggregate(lines, structural, [...inventory.unverified, ...inventory.unavailable]);
  const finalStatus = inventory.unavailable.length > 0 && status !== "unavailable" ? "unavailable" : status;
  return {
    status: finalStatus,
    definition,
    provenance: lines,
    blockers: [
      ...inventory.unavailable,
      ...inventory.unverified,
      ...structural.map((s) => `invalid: ${s}`),
      ...lines.filter((l) => l.status !== "verified").map((l) => `${l.item} is ${l.provenance} (${l.reason})`),
    ],
  };
}

export function resolveDecisionFlow(
  input: BusinessInput,
  category: string,
  kind: "assessment" | "selector",
  requiredData: readonly EngagementDataKind[],
  supplied: readonly DecisionFlowDefinition[],
): ResolvedExperienceValues<DecisionFlowDefinition> {
  const inventory = inventoryBlockers(input, requiredData);
  const definition = supplied.find((f) => f.category === category) ?? null;
  if (!definition) {
    return {
      status: "unavailable",
      definition: null,
      provenance: [],
      blockers: [...inventory.unavailable, ...inventory.unverified, `no decision-rule definition was supplied for "${category}" — rules and recommendations are never generated`],
    };
  }

  const lines: ProvenanceLine[] = [
    resolveProvenance(`rule set ${definition.ruleSet.id} v${definition.ruleSet.version}`, definition.ruleSet, "business"),
    resolveProvenance("copy", definition.copy, "copy"),
  ];

  const structural: string[] = [];
  if (definition.kind !== kind) structural.push(`definition kind "${definition.kind}" does not match the selected experience ("${kind}")`);
  const questions = new Map(definition.questions.map((q) => [q.id, q]));
  const outcomes = new Set(definition.outcomes.map((o) => o.id));
  if (questions.size !== definition.questions.length) structural.push("question ids are not unique");
  if (outcomes.size !== definition.outcomes.length) structural.push("outcome ids are not unique");
  for (const q of definition.questions) {
    if (new Set(q.options.map((o) => o.id)).size !== q.options.length) structural.push(`question "${q.id}" has duplicate option ids`);
  }
  for (const rule of definition.rules) {
    if (!outcomes.has(rule.outcome)) structural.push(`rule "${rule.id}" leads to undefined outcome "${rule.outcome}"`);
    for (const c of rule.when) {
      const q = questions.get(c.question);
      if (!q) structural.push(`rule "${rule.id}" reads undefined question "${c.question}"`);
      else for (const opt of c.anyOf) if (!q.options.some((o) => o.id === opt)) structural.push(`rule "${rule.id}" names undefined option "${opt}" of "${c.question}"`);
    }
  }
  // FD-05: a recommendation names an offer publicly, so the offer's name must itself
  // be publishable — not merely present in the input.
  const offerNames = new Set(publishableOffers(input).map((o) => o.name));
  for (const o of definition.outcomes) {
    if (o.recommendedOffer && !offerNames.has(o.recommendedOffer)) {
      structural.push(`outcome "${o.id}" recommends "${o.recommendedOffer}", which is not an owner-supplied offer whose name may be published`);
    }
    if (!definition.rules.some((r) => r.outcome === o.id)) structural.push(`outcome "${o.id}" is unreachable: no rule leads to it`);
  }
  if (kind === "selector" && !definition.outcomes.some((o) => o.recommendedOffer)) {
    structural.push("a selector must recommend at least one owner-supplied offer");
  }

  const status = aggregate(lines, structural, [...inventory.unverified, ...inventory.unavailable]);
  const finalStatus = inventory.unavailable.length > 0 && status !== "unavailable" ? "unavailable" : status;
  return {
    status: finalStatus,
    definition,
    provenance: lines,
    blockers: [
      ...inventory.unavailable,
      ...inventory.unverified,
      ...structural.map((s) => `invalid: ${s}`),
      ...lines.filter((l) => l.status !== "verified").map((l) => `${l.item} is ${l.provenance} (${l.reason})`),
    ],
  };
}
