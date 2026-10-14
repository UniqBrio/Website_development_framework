import { describe, expect, it } from "vitest";
import { evaluateRules, matchCondition, readFact } from "../../src/design-intelligence/engine/evaluator.js";
import { parseRule, type Rule } from "../../src/design-intelligence/types/decision.js";

function rule(partial: Partial<Rule> & Pick<Rule, "id" | "title">): Rule {
  return parseRule({
    domain: "direction",
    classification: "executable",
    consumer: "evaluator",
    sourceSection: "§test",
    rationale: "test rule",
    confidence: "high",
    ...partial,
  });
}

const facts = {
  variables: {
    trust_requirement: "very_high",
    visual_asset_quality: "low",
    emotional_intensity: "low",
  },
  industry: "healthcare",
};

describe("readFact", () => {
  it("reads a nested dot path", () => {
    expect(readFact(facts, "variables.trust_requirement")).toBe("very_high");
  });

  it("returns undefined for a missing branch instead of throwing", () => {
    expect(readFact(facts, "nope.deeper.still")).toBeUndefined();
  });
});

describe("matchCondition", () => {
  it("compares ordinal scales with gte/lte", () => {
    expect(
      matchCondition(facts, { fact: "variables.trust_requirement", op: "gte", value: "high" }),
    ).toBe(true);
    expect(
      matchCondition(facts, { fact: "variables.visual_asset_quality", op: "gte", value: "high" }),
    ).toBe(false);
  });

  it("supports in / not_in", () => {
    expect(
      matchCondition(facts, { fact: "industry", op: "in", value: ["healthcare", "legal"] }),
    ).toBe(true);
    expect(matchCondition(facts, { fact: "industry", op: "not_in", value: ["saas"] })).toBe(true);
  });

  it("treats a missing fact as not matching rather than as a match", () => {
    // Defence in depth: an unvalidated condition with no `value` must not match
    // an absent fact via undefined === undefined.
    expect(matchCondition(facts, { fact: "absent", op: "eq", value: undefined })).toBe(false);
  });

  it("distinguishes presence from equality", () => {
    expect(matchCondition(facts, { fact: "industry", op: "exists" })).toBe(true);
    expect(matchCondition(facts, { fact: "location", op: "exists" })).toBe(false);
  });
});

describe("evaluateRules — control flow", () => {
  it("applies `then` when every `if` holds", () => {
    const result = evaluateRules(facts, [
      rule({
        id: "DD-001",
        title: "high trust implies restraint",
        if: [{ fact: "variables.trust_requirement", op: "in", value: ["high", "very_high"] }],
        then: [{ kind: "cap", target: "visualExpression", value: "low" }],
      }),
    ]);
    expect(result.appliedRuleIds).toEqual(["DD-001"]);
    expect(result.draft["visualExpression"]).toBe("low");
  });

  it("blocks the rule when any `unless` holds, and surfaces the blocker", () => {
    const result = evaluateRules(facts, [
      rule({
        id: "DD-002",
        title: "blocked by unless",
        if: [{ fact: "industry", op: "eq", value: "healthcare" }],
        unless: [{ fact: "variables.visual_asset_quality", op: "lte", value: "low" }],
        then: [{ kind: "set", target: "hero", value: "full_bleed" }],
        fallback: ["typography-led hero"],
      }),
    ]);
    expect(result.appliedRuleIds).toEqual([]);
    expect(result.blocked[0]?.ruleId).toBe("DD-002");
    expect(result.draft["hero"]).toBeUndefined();
    // The fallback is what actually governs once `unless` fires.
    expect(result.obligations.join()).toContain("typography-led hero");
  });

  it("takes `otherwise` when `if` does not match", () => {
    const result = evaluateRules(facts, [
      rule({
        id: "DD-114",
        title: "map selection",
        if: [{ fact: "location.verified", op: "eq", value: true }],
        then: [{ kind: "set", target: "map", value: "interactive_map" }],
        otherwise: [{ kind: "set", target: "map", value: "address_and_directions_link" }],
      }),
    ]);
    expect(result.draft["map"]).toBe("address_and_directions_link");
    expect(result.appliedRuleIds).toEqual(["DD-114"]);
  });

  it("skips a non-matching rule that has no `otherwise`", () => {
    const result = evaluateRules(facts, [
      rule({
        id: "DD-003",
        title: "saas only",
        if: [{ fact: "industry", op: "eq", value: "saas" }],
        then: [{ kind: "set", target: "hero", value: "split" }],
      }),
    ]);
    expect(result.skippedRuleIds).toEqual(["DD-003"]);
    expect(result.records).toHaveLength(0);
  });
});

describe("evaluateRules — determinism", () => {
  const capLow = rule({
    id: "DD-010",
    title: "cap low",
    then: [{ kind: "cap", target: "visualExpression", value: "low" }],
  });
  const capHigh = rule({
    id: "DD-011",
    title: "cap high",
    then: [{ kind: "cap", target: "visualExpression", value: "high" }],
  });

  it("cap is monotonic: the strictest value wins regardless of order", () => {
    const forward = evaluateRules(facts, [capLow, capHigh]);
    const reverse = evaluateRules(facts, [capHigh, capLow]);
    expect(forward.draft["visualExpression"]).toBe("low");
    expect(reverse.draft["visualExpression"]).toBe("low");
  });

  it("a cap on a target with no registered scale is rejected when the rule is written", () => {
    expect(() =>
      rule({
        id: "DD-012",
        title: "cap unknown target",
        then: [{ kind: "cap", target: "not.a.scaled.target", value: "low" }],
      }),
    ).toThrow(/no registered ordered scale/);
    expect(() =>
      rule({
        id: "DD-012",
        title: "cap off-scale value",
        then: [{ kind: "cap", target: "motion.cap", value: "ludicrous" }],
      }),
    ).toThrow(/not on scale/);
  });

  it("the evaluator still refuses an unregistered cap built without the schema (defence in depth)", () => {
    const unparsed = {
      ...rule({ id: "DD-012", title: "shell" }),
      then: [{ kind: "cap" as const, target: "not.a.scaled.target", value: "low" }],
    };
    const result = evaluateRules(facts, [unparsed]);
    expect(result.draft["not.a.scaled.target"]).toBeUndefined();
  });

  it("append is order-independent and de-duplicates", () => {
    const a = rule({
      id: "DD-020",
      title: "append security",
      then: [{ kind: "append", target: "sections", value: ["security", "faq"] }],
    });
    const b = rule({
      id: "DD-021",
      title: "append faq again",
      then: [{ kind: "append", target: "sections", value: ["faq", "integrations"] }],
    });
    const forward = evaluateRules(facts, [a, b]).draft["sections"] as string[];
    const reverse = evaluateRules(facts, [b, a]).draft["sections"] as string[];
    expect([...forward].sort()).toEqual(["faq", "integrations", "security"]);
    expect([...reverse].sort()).toEqual(["faq", "integrations", "security"]);
  });

  it("forbid accumulates and is never undone by a later rule", () => {
    const result = evaluateRules(facts, [
      rule({
        id: "DD-030",
        title: "forbid webgl",
        then: [{ kind: "forbid", target: "interaction", value: "decorative_webgl" }],
      }),
      rule({
        id: "DD-031",
        title: "would like webgl",
        then: [{ kind: "set", target: "hero", value: "webgl_hero" }],
        avoid: ["cursor_follower"],
      }),
    ]);
    expect(result.forbidden).toEqual(["cursor_follower", "decorative_webgl"]);
  });
});

describe("evaluateRules — conflict reporting", () => {
  it("reports two rules setting the same target to DIFFERENT values", () => {
    const result = evaluateRules(facts, [
      rule({
        id: "DD-040",
        title: "hero a",
        then: [{ kind: "set", target: "hero.pattern", value: "split" }],
      }),
      rule({
        id: "DD-041",
        title: "hero b",
        then: [{ kind: "set", target: "hero.pattern", value: "full_bleed" }],
      }),
    ]);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]?.target).toBe("hero.pattern");
    expect(result.conflicts[0]?.ruleIds).toEqual(["DD-040", "DD-041"]);
  });

  it("does not report agreement as a conflict", () => {
    const result = evaluateRules(facts, [
      rule({
        id: "DD-042",
        title: "hero a",
        then: [{ kind: "set", target: "hero.pattern", value: "split" }],
      }),
      rule({
        id: "DD-043",
        title: "hero a again",
        then: [{ kind: "set", target: "hero.pattern", value: "split" }],
      }),
    ]);
    expect(result.conflicts).toHaveLength(0);
  });
});

describe("evaluateRules — explainability (§30)", () => {
  it("a record cites only the facts the rule actually read", () => {
    const result = evaluateRules(facts, [
      rule({
        id: "DD-050",
        title: "records facts",
        if: [{ fact: "variables.trust_requirement", op: "eq", value: "very_high" }],
        unless: [{ fact: "variables.brand_expression_need", op: "eq", value: "high" }],
        then: [{ kind: "cap", target: "motion.cap", value: "minimal" }],
        fallback: ["static composition"],
        avoid: ["parallax", "kinetic_type"],
        source_urls: ["https://www.w3.org/TR/WCAG22/"],
      }),
    ]);
    const record = result.records[0];
    expect(record).toBeDefined();
    expect(Object.keys(record!.inputFacts).sort()).toEqual([
      "variables.brand_expression_need",
      "variables.trust_requirement",
    ]);
    expect(record!.inputFacts["variables.trust_requirement"]).toBe("very_high");
    expect(record!.decision).toContain("cap motion.cap");
    expect(record!.fallback).toBe("static composition");
    expect(record!.rejectedAlternatives).toEqual(["parallax", "kinetic_type"]);
    expect(record!.sourceUrls).toEqual(["https://www.w3.org/TR/WCAG22/"]);
  });
});

describe("rule schema", () => {
  it("rejects an id that is not DD-nnn", () => {
    expect(() => rule({ id: "RULE-1", title: "bad id" })).toThrow();
  });

  it("rejects a rule with no rationale", () => {
    expect(() =>
      parseRule({
        id: "DD-999",
        title: "no rationale",
        domain: "layout",
        classification: "executable",
        consumer: "evaluator",
        sourceSection: "§test",
        confidence: "high",
      }),
    ).toThrow();
  });

  it("rejects a comparator that needs a value but has none", () => {
    // The malformed-rule class the evaluator defect came from: caught at the
    // boundary so it can never reach evaluation.
    expect(() =>
      rule({ id: "DD-998", title: "eq with no value", if: [{ fact: "industry", op: "eq" }] }),
    ).toThrow(/requires a value/);
  });

  it("rejects in/not_in with a non-array value", () => {
    expect(() =>
      rule({
        id: "DD-997",
        title: "in with scalar",
        if: [{ fact: "industry", op: "in", value: "healthcare" }],
      }),
    ).toThrow(/requires an array/);
  });
});
