/**
 * ENGAGEMENT HARD GATES — brief phase 3, ECO §5 and §9.
 *
 * Gates run BEFORE scoring, every gate runs (so the record shows every reason,
 * not only the first), and a candidate failing ANY gate is never scored: a score
 * published beside a gate failure invites someone to argue the number against
 * the gate. The same discipline as `engine/select-elements.ts`.
 *
 * A failure carries its outcome:
 *   reject    — nothing more (data, budget, approval) would make it suitable
 *   downgrade — the job is real; deliver it through the static alternative
 *   defer     — an input is missing; ask for it, never assume it
 * Precedence when several fail: reject > downgrade > defer.
 */
import type { ContentInventory, EngagementInput } from "../design-intelligence/types/business-input.js";
import { engagementDataVerdict } from "../content/engagement-data.js";
import { EXPERIENCE_PATTERNS } from "./experience-patterns.js";
import type { EngagementSignals } from "./signals.js";
import type { CandidateOutcome, GateFailureOutcome, HardGateResult, OpportunityCategory } from "./types.js";
import { VANITY_RATIONALE_PATTERNS, type EngagementCategoryId } from "./vocabulary.js";

export interface GateContext {
  signals: EngagementSignals;
  content: ContentInventory;
  /** Content categories `verifyContent()` says may render. */
  renderableContent: ReadonlySet<string>;
  engagement: EngagementInput | undefined;
  /** The route budget's heavy visuals that may never appear (performance/budgets.ts). */
  prohibitedHeavyVisuals: readonly string[];
}

const pass = (gate: HardGateResult["gate"], reason: string, approval?: string): HardGateResult =>
  approval ? { gate, status: "pass", reason, approval } : { gate, status: "pass", reason };
const fail = (gate: HardGateResult["gate"], onFail: GateFailureOutcome, reason: string): HardGateResult => ({
  gate,
  status: "fail",
  onFail,
  reason,
});

const HIGH_TRUST = new Set(["high", "very_high"]);
const SERIOUS_CYCLE = new Set(["regulated", "long"]);

/** Vanity rationales found in a customer's stated reason for requesting this category. */
export function vanityRationales(rationale: string): string[] {
  return VANITY_RATIONALE_PATTERNS.filter((v) => v.pattern.test(rationale)).map((v) => v.id);
}

export function estimatedKbFor(category: OpportunityCategory): number {
  return category.experiencePattern
    ? EXPERIENCE_PATTERNS[category.experiencePattern].performance.estimatedRouteJsKb
    : category.estimatedRouteJsKb;
}

export function evaluateHardGates(category: OpportunityCategory, ctx: GateContext): HardGateResult[] {
  const { signals } = ctx;
  const results: HardGateResult[] = [];

  // 1. CLEAR VISITOR VALUE — a real task of THIS business that the category serves.
  const matched = category.visitorTasks.filter((t) => signals.taskSet.has(t));
  results.push(
    matched.length > 0
      ? pass("visitor_value", `serves the visitor task(s): ${matched.join(", ")}`)
      : fail("visitor_value", "reject", `no visitor task of this business is served (it serves ${category.visitorTasks.join(", ")}; the business's tasks are ${[...signals.taskSet].join(", ") || "none stated"})`),
  );

  // 2. BUSINESS OBJECTIVE LINKAGE — and, for games, a causal path instead of a vanity metric.
  const linked = category.businessObjectives.filter((o) => signals.objectives.has(o));
  const requested = ctx.engagement?.requestedIdea?.category === category.id ? ctx.engagement.requestedIdea : undefined;
  const vanity = requested ? vanityRationales(requested.rationale) : [];
  if (linked.length === 0) {
    results.push(fail("objective_linkage", "reject", `serves none of the stated objectives (${[...signals.objectives].join(", ")})`));
  } else if (category.gameKind === "standalone_game" && !ctx.engagement?.gameCausalPath) {
    results.push(
      fail(
        "objective_linkage",
        "reject",
        `a standalone game needs a documented causal path to a business, learning or repeated-behaviour outcome (ECO §10.2); none is documented${vanity.length > 0 ? `, and the stated rationale rests on rejected vanity reasons: ${vanity.join(", ")}` : ""}`,
      ),
    );
  } else if (category.gameKind && vanity.length > 0 && !ctx.engagement?.gameCausalPath) {
    results.push(
      fail("objective_linkage", "reject", `the requested rationale rests on reasons that cannot justify ${category.label.toLowerCase()} (${vanity.join(", ")}) and no causal path is documented`),
    );
  } else {
    results.push(pass("objective_linkage", `linked to objective(s): ${linked.join(", ")}`));
  }

  // 3. DATA INTEGRITY — never invent a formula, rule, price, spec or dataset (ECO §17).
  const verdicts = category.requiredData.map((kind) => engagementDataVerdict(ctx.content, kind));
  const unusable = verdicts.filter((v) => !v.usable);
  const missingContent = category.requiredContent.filter((c) => !ctx.renderableContent.has(c));
  if (unusable.length > 0 || missingContent.length > 0) {
    results.push(
      fail(
        "data_integrity",
        "downgrade",
        `required data is not verified: ${[...unusable.map((v) => `${v.kind} (${v.reason})`), ...missingContent.map((c) => `${c} (not renderable)`)].join("; ")} — deliver the static alternative instead of an output built on invented values`,
      ),
    );
  } else {
    results.push(pass("data_integrity", category.requiredData.length > 0 ? `verified: ${category.requiredData.join(", ")}` : "needs no business data beyond what the page already verifies"));
  }

  // 4. LEGAL / COMPLIANCE SUITABILITY — the stricter interpretation governs (ECO §4.6).
  const serious = HIGH_TRUST.has(signals.trust) || signals.regulationRisk === "high" || SERIOUS_CYCLE.has(signals.adequacy.purchaseCycle);
  if (category.trivialisesSeriousDecisions && serious) {
    results.push(fail("legal_compliance", "reject", `play mechanics would trivialise a serious decision (trust ${signals.trust}, regulation ${signals.regulationRisk}, purchase cycle ${signals.adequacy.purchaseCycle})`));
  } else if (category.adviceLikeOutput && signals.regulationRisk === "high") {
    results.push(
      pass(
        "legal_compliance",
        "advice-like output in a high-regulation context is permitted only from verified rules, with compliance review",
        `compliance review of the ${category.label.toLowerCase()} rules and result wording (regulation_risk high)`,
      ),
    );
  } else {
    results.push(pass("legal_compliance", "no material legal or compliance risk identified from the stated context"));
  }

  // 5. PRIVACY / CONSENT.
  if (category.personalData === "required_before_value") {
    results.push(fail("privacy_consent", "downgrade", "collects personal data before the visitor receives any value"));
  } else if (category.personalData !== "none" && signals.sensitiveData.length > 0 && signals.consentManagement !== true) {
    results.push(fail("privacy_consent", "defer", `may collect sensitive data (${signals.sensitiveData.join(", ")}) and consent management is ${signals.consentManagement === false ? "absent" : "not stated"}`));
  } else if (category.personalData !== "none") {
    results.push(pass("privacy_consent", "personal data only after value, and minimal", "a privacy notice covering the data this experience collects"));
  } else {
    results.push(pass("privacy_consent", "collects no personal data"));
  }

  // 6. ACCESSIBILITY FEASIBILITY — inherits the site's target; no second a11y system.
  if (category.inherentViolations.length > 0) {
    results.push(fail("accessibility_feasibility", "reject", `violates §9 hard constraints: ${category.inherentViolations.join(", ")}`));
  } else if (category.accessibilityRisk >= 5) {
    results.push(fail("accessibility_feasibility", "downgrade", "accessibility risk is material for any audience; the static alternative carries the job"));
  } else if (category.accessibilityRisk >= 4 && (signals.accessibilityTarget === "wcag_aaa_or_equivalent" || signals.literacy === "low")) {
    results.push(
      fail(
        "accessibility_feasibility",
        "downgrade",
        `accessibility risk ${category.accessibilityRisk}/5 against ${signals.accessibilityTarget === "wcag_aaa_or_equivalent" ? "an AAA-equivalent target" : "a low digital-literacy audience"}; the static alternative carries the job`,
      ),
    );
  } else {
    results.push(pass("accessibility_feasibility", `keyboard completion, a JavaScript-free path and the ${signals.accessibilityTarget} target are achievable`));
  }

  // 7. PERFORMANCE FEASIBILITY — the same route budget every pattern answers to.
  const kb = estimatedKbFor(category);
  const heavyProhibited =
    category.id === "visualizer_3d_ar_webgl" &&
    (ctx.prohibitedHeavyVisuals.includes("3d-product-view") || signals.forbidden.has("3d-product-view"));
  if (kb > signals.routeJsBudgetKb) {
    results.push(fail("performance_feasibility", "downgrade", `needs ~${kb}KB route JS (estimated) against a ${signals.routeJsBudgetKb}KB route budget`));
  } else if (signals.interactionLevelCap === "low" && category.implementationComplexity === "high") {
    // The DD rule pass capped interaction at "low"; engagement may not bypass it.
    results.push(fail("performance_feasibility", "downgrade", "a high-complexity experience exceeds the interaction.level cap \"low\" set by the design rules"));
  } else if (heavyProhibited) {
    results.push(fail("performance_feasibility", "downgrade", "3D is a prohibited heavy visual for this route budget or forbidden by rule"));
  } else if (category.performanceCost >= 4 && (signals.performanceSensitivity === "high" || signals.mobileShare === "high")) {
    results.push(fail("performance_feasibility", "downgrade", `performance cost ${category.performanceCost}/5 on a ${signals.performanceSensitivity === "high" ? "performance-sensitive" : "mobile-dominant"} site`));
  } else {
    results.push(pass("performance_feasibility", `~${kb}KB route JS (estimated) fits the ${signals.routeJsBudgetKb}KB budget`));
  }

  // 8. MAINTENANCE OWNERSHIP.
  if (category.maintenanceBurden >= 3 && !signals.maintenanceOwner) {
    results.push(fail("maintenance_ownership", "defer", `maintenance burden ${category.maintenanceBurden}/5 and no named owner keeps its data current`));
  } else {
    results.push(pass("maintenance_ownership", signals.maintenanceOwner ? `maintained by ${signals.maintenanceOwner}` : "low maintenance burden"));
  }

  // 9. OPERATIONAL FOLLOW-UP — the business can respond to what the experience produces.
  if ((category.produces === "lead" || category.produces === "booking") && !signals.conversionEndpointVerified) {
    results.push(fail("operational_follow_up", "defer", `produces a ${category.produces} but no verified contact route exists to receive and answer it`));
  } else {
    results.push(pass("operational_follow_up", category.produces === "lead" || category.produces === "booking" ? "a verified contact route receives the result" : "produces no lead or booking that needs a response"));
  }

  // 10. ABUSE / TRUST SAFETY.
  if (category.abuseRisk >= 4 && HIGH_TRUST.has(signals.trust)) {
    results.push(fail("abuse_trust_safety", "reject", `reward or ranking mechanics (abuse risk ${category.abuseRisk}/5) are unsuitable at trust requirement ${signals.trust}`));
  } else if (category.abuseRisk >= 3) {
    results.push(pass("abuse_trust_safety", "permitted only without manipulative mechanics", "no manipulative reward mechanics; participation optional, pauseable and non-time-critical (ECO §10.1, §11)"));
  } else {
    results.push(pass("abuse_trust_safety", "no abuse or manipulation vector identified"));
  }

  // 11. STATIC ALTERNATIVE ADEQUACY (ECO §2.2).
  const adequacy = category.staticAdequacy(signals.adequacy);
  results.push(
    adequacy.adequate
      ? fail("static_alternative_adequacy", "downgrade", `the static alternative is adequate: ${adequacy.reason} → ${category.staticAlternative}`)
      : pass("static_alternative_adequacy", `static content is not adequate: ${adequacy.reason}`),
  );

  return results;
}

/** Outcome of a gate set. Null when every gate passed. */
export function gateOutcome(gates: readonly HardGateResult[]): Extract<CandidateOutcome, "rejected" | "downgraded" | "deferred"> | null {
  const failures = gates.filter((g) => g.status === "fail");
  if (failures.some((g) => g.onFail === "reject")) return "rejected";
  if (failures.some((g) => g.onFail === "downgrade")) return "downgraded";
  if (failures.length > 0) return "deferred";
  return null;
}

export function matchedTasks(categoryTasks: readonly string[], signals: EngagementSignals) {
  return signals.tasks.filter((t) => categoryTasks.includes(t.task));
}

export type { EngagementCategoryId };
