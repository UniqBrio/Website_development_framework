/**
 * ENGAGEMENT OPPORTUNITY DECISION — the engine (brief phases 2–11, ECO §5–§19).
 *
 * Order, and why:
 *   signals → every category through the 11 hard gates → score ONLY survivors →
 *   per-category minimum (45; gamification 75; standalone game 85) → owner
 *   preference → primary → complementary (combination policy) → placement,
 *   requirements, approvals → decision + records.
 *
 * DEFAULT IS NO_EXPERIENCE. An experience is recommended only when a candidate
 * passes every gate AND reaches its minimum. "No experience" is a complete,
 * successful decision with a reason, evidence, a static alternative, the rejected
 * candidates and the conditions under which to reconsider (brief phase 8).
 *
 * The owner's preference is honoured inside the gates, never above them:
 *   no_experience               respected; a conflict with a stated requirement is flagged
 *   specific_idea               the idea runs the same gates; a failing idea is not accepted
 *   choose_from_recommendations the ranked list is returned and the pick awaits the owner
 */
import type { BusinessInput, WebsiteObjective } from "../design-intelligence/types/business-input.js";
import type { DesignContextProfile } from "../design-intelligence/types/profile.js";
import type { DerivedFacts } from "../design-intelligence/engine/derive-facts.js";
import type { Confidence } from "../design-intelligence/types/decision.js";
import type { VerificationReport } from "../content/verification.js";
import { engagementDataVerdict } from "../content/engagement-data.js";
import type { RouteBudget } from "../performance/budgets.js";
import { OBJECTIVE_ARCHITECTURE } from "../design-intelligence/objectives/objective-architecture.js";
import { evaluateCombination } from "./combination.js";
import { EXPERIENCE_PATTERNS } from "./experience-patterns.js";
import { estimatedKbFor, evaluateHardGates, gateOutcome } from "./gates.js";
import { OPPORTUNITY_CATEGORIES } from "./registry.js";
import { scoreCategory } from "./scoring.js";
import { deriveEngagementSignals, type EngagementSignals } from "./signals.js";
import type {
  CandidateEvaluation,
  CombinationCheck,
  EngagementDecisionRecord,
  EngagementOpportunityDecision,
  ExperiencePatternId,
  NoExperienceStatement,
  OpportunityCategory,
  Placement,
  RejectedOpportunity,
  SelectedOpportunity,
} from "./types.js";
import { TASK_STAGE, type EngagementCategoryId, type EngagementDataKind } from "./vocabulary.js";

export interface EngagementContext {
  input: BusinessInput;
  profile: DesignContextProfile;
  facts: DerivedFacts;
  contentPlan: VerificationReport;
  routeBudget: RouteBudget;
  /** DD rule pass outputs the engine must respect. */
  interactionLevelCap?: string;
  forbidden?: ReadonlySet<string>;
}

/** Tie band for ranking: within this many points, cheaper and implemented wins (decision_matrix rule 4). */
const TIE_POINTS = 5;
const COMPLEXITY_ORDER = { low: 0, medium: 1, high: 2 } as const;
const POLICY = ["ECO §5 hard gates", "ECO §6 scoring model", "ECO §7 bands", "ECO §8 multiple experiences", "ECO §9 NO_EXPERIENCE", "ECO §10 games", "ECO §17 data integrity", "ECO §18 setup", "ECO §19 placement"];

const byId = new Map(OPPORTUNITY_CATEGORIES.map((c) => [c.id, c]));

function minimumFor(category: OpportunityCategory): number {
  return Math.max(45, category.minimumSuitability);
}

function rank(evaluations: readonly CandidateEvaluation[]): CandidateEvaluation[] {
  const sorted = [...evaluations].sort((a, b) => (b.scorecard?.score ?? 0) - (a.scorecard?.score ?? 0));
  const top = sorted[0]?.scorecard?.score ?? 0;
  const tied = sorted.filter((e) => top - (e.scorecard?.score ?? 0) < TIE_POINTS);
  const rest = sorted.filter((e) => !tied.includes(e));
  // Within the tie band, an implemented contract beats a registry-only one, then lower complexity.
  tied.sort((a, b) => {
    const ca = byId.get(a.category)!;
    const cb = byId.get(b.category)!;
    if (a.implemented !== b.implemented) return a.implemented ? -1 : 1;
    const cx = COMPLEXITY_ORDER[ca.implementationComplexity] - COMPLEXITY_ORDER[cb.implementationComplexity];
    return cx !== 0 ? cx : (b.scorecard?.score ?? 0) - (a.scorecard?.score ?? 0);
  });
  return [...tied, ...rest];
}

function placementFor(category: OpportunityCategory, signals: EngagementSignals): Placement {
  const targetObjective: WebsiteObjective =
    category.businessObjectives.find((o) => o === signals.primaryObjective) ??
    category.businessObjectives.find((o) => signals.objectives.has(o)) ??
    signals.primaryObjective;
  const position = signals.primaryTaskHighIntent && category.ctaRole !== "primary_conversion" ? "after_primary_cta" : "within_section";
  const section: Placement["section"] =
    category.experiencePattern === "booking"
      ? "conversion_section"
      : category.experiencePattern === "comparison"
        ? "comparison_section"
        : category.experiencePattern === "progressive_form"
          ? "conversion_section"
          : "decision_support_section";
  return {
    section,
    targetObjective,
    route: null,
    position,
    why:
      position === "after_primary_cta"
        ? "high-intent visitors reach the direct call to action first; the experience supports those still deciding (ECO §19)"
        : section === "conversion_section"
          ? "the experience IS the conversion step, so it sits where the conversion happens"
          : "placed where the task it supports is discussed, never in the hero by default (ECO §19)",
  };
}

function journeyFor(category: OpportunityCategory, score: number, signals: EngagementSignals): ExperiencePatternId[] {
  if (!category.experiencePattern || category.experiencePattern === "booking" || category.experiencePattern === "progressive_form") return [];
  // Only experiences that COMPUTE an outcome have a result step; a static comparison shows everything at once.
  if (category.produces === "nothing" || category.experiencePattern === "comparison") return [];
  const journey: ExperiencePatternId[] = ["result"];
  // ECO §7 75–84: consider ONE logically connected post-result action — only if something can receive it.
  if (score >= 75 && category.ctaRole === "supports_conversion" && signals.conversionEndpointVerified) journey.push("progressive_form");
  return journey;
}

function selected(evaluation: CandidateEvaluation, signals: EngagementSignals): SelectedOpportunity {
  const category = byId.get(evaluation.category)!;
  const pattern = category.experiencePattern ? EXPERIENCE_PATTERNS[category.experiencePattern] : undefined;
  return {
    category: category.id,
    label: category.label,
    experiencePattern: category.experiencePattern ?? null,
    implementationStatus: pattern ? "implemented_contract" : "registry_only",
    generatorSupport: pattern?.generatorSupport ?? "none",
    score: evaluation.scorecard!.score,
    band: evaluation.scorecard!.band,
    matchedTasks: evaluation.matchedTasks,
    placement: placementFor(category, signals),
    conversionAction: category.conversionAction,
    journey: journeyFor(category, evaluation.scorecard!.score, signals),
  };
}

/** Plain words for each objective's conversion surface — the ids are not prose. */
const SURFACE_WORDS: Record<string, string> = {
  enquiry_form: "enquiry form",
  booking_flow: "appointment request form",
  checkout: "checkout",
  signup_flow: "sign-up form",
  trial_signup: "trial sign-up form",
  demo_request_form: "demo request form",
  contact_route: "contact route",
  related_conversion_link: "related next-step link",
  application_form: "application form",
  directions_and_call: "directions and call link",
  subscribe: "subscribe form",
  donation_flow: "donation form",
  support_request: "support request form",
};

/** ECO §10: a category qualifies only at or above its own minimum (45; gamification 75; standalone game 85). */
export function meetsMinimum(category: OpportunityCategory, score: number): boolean {
  return score >= minimumFor(category);
}

function staticAlternativeFor(signals: EngagementSignals, evaluations: readonly CandidateEvaluation[]): string {
  const surfaceId = OBJECTIVE_ARCHITECTURE[signals.primaryObjective].conversionSurface;
  const surface = SURFACE_WORDS[surfaceId] ?? surfaceId.replace(/_/g, " ");
  const jobs = evaluations
    .filter((e) => e.outcome === "downgraded" || e.outcome === "deferred")
    .map((e) => e.staticAlternative);
  const unique = [...new Set(jobs)].slice(0, 3);
  return [
    `clear static content and the conventional ${surface} for the primary objective (${signals.primaryObjective})`,
    ...unique,
  ].join("; ");
}

function reconsiderWhen(evaluations: readonly CandidateEvaluation[]): string[] {
  // Grouped by what the owner could change, each naming the candidates it would re-open.
  const reopen = new Map<string, Set<string>>();
  const add = (condition: string, category: string) => {
    if (!reopen.has(condition)) reopen.set(condition, new Set());
    reopen.get(condition)!.add(category);
  };
  const dataKinds = new Set<string>();
  for (const e of evaluations) {
    if (e.outcome !== "downgraded" && e.outcome !== "deferred" && e.outcome !== "below_minimum") continue;
    for (const g of e.gates.filter((x) => x.status === "fail")) {
      switch (g.gate) {
        case "data_integrity":
          for (const kind of byId.get(e.category)!.requiredData) dataKinds.add(kind);
          add("DATA", e.category);
          break;
        case "maintenance_ownership":
          add("a named owner keeps the experience's data current", e.category);
          break;
        case "operational_follow_up":
          add("a verified contact route exists to receive leads or bookings", e.category);
          break;
        case "privacy_consent":
          add("consent management exists for the sensitive data involved", e.category);
          break;
        case "static_alternative_adequacy":
          add(
            e.category === "booking_flow"
              ? "a scheduling integration provides real availability"
              : "the owner states a visitor task, or the offer range grows, beyond what static content serves",
            e.category,
          );
          break;
        default:
          break;
      }
    }
    if (e.outcome === "below_minimum") add("stronger evidence of visitor value (a candidate scored below its minimum)", e.category);
  }
  const lines = [...reopen.entries()].map(([condition, categories]) =>
    `${condition === "DATA" ? `verified ${[...dataKinds].join(", ")} are supplied` : condition} — would re-open: ${[...categories].join(", ")}`,
  );
  lines.push("observed visitor behaviour or research shows a task the current pages do not serve");
  return lines;
}

/**
 * Complementary experiences (ECO §7, §8). Considered ONLY from the strong-candidate
 * band (≥75), where the research expects a related post-result action; independent
 * parallel jobs only from the high-confidence band (≥85). Each complement must
 * itself be a focused interaction (≥60 and its own minimum) and the whole set must
 * pass every combination check. Framework reading of ECO §7/§8 (Tier E).
 */
export function selectComplements(
  primary: CandidateEvaluation,
  qualified: readonly CandidateEvaluation[],
  routeJsBudgetKb: number,
): { secondary: CandidateEvaluation[]; checks: CombinationCheck[] } {
  const secondary: CandidateEvaluation[] = [];
  let checks: CombinationCheck[] = [];
  const primaryScore = primary.scorecard?.score ?? 0;
  if (primaryScore < 75) return { secondary, checks };
  const primaryCategory = byId.get(primary.category)!;
  for (const candidate of qualified) {
    if (candidate.category === primary.category) continue;
    const category = byId.get(candidate.category)!;
    if ((candidate.scorecard?.score ?? 0) < Math.max(60, minimumFor(category))) continue;
    const set = [primaryCategory, ...secondary.map((s) => byId.get(s.category)!), category];
    const combination = evaluateCombination(set, { routeJsBudgetKb, allowParallel: primaryScore >= 85 });
    if (combination.allowed) {
      secondary.push(candidate);
      checks = combination.checks;
    } else if (checks.length === 0) {
      checks = combination.checks;
    }
  }
  return { secondary, checks };
}

export function decideEngagement(ctx: EngagementContext): EngagementOpportunityDecision {
  const { input } = ctx;
  const signals = deriveEngagementSignals({
    input,
    profile: ctx.profile,
    facts: ctx.facts,
    routeJsBudgetKb: ctx.routeBudget.routeJsKb,
    ...(ctx.interactionLevelCap !== undefined ? { interactionLevelCap: ctx.interactionLevelCap } : {}),
    ...(ctx.forbidden !== undefined ? { forbidden: ctx.forbidden } : {}),
  });
  const preference = input.engagement?.preference ?? "framework_decides";
  const renderable = new Set(ctx.contentPlan.sections.filter((s) => s.render).map((s) => s.category));

  // ---------------------------------------------------------------- evaluate every category
  const evaluations: CandidateEvaluation[] = OPPORTUNITY_CATEGORIES.map((category) => {
    const gates = evaluateHardGates(category, {
      signals,
      content: input.availableContent,
      renderableContent: renderable,
      engagement: input.engagement,
      prohibitedHeavyVisuals: ctx.routeBudget.prohibitedHeavyVisuals,
    });
    const matched = signals.tasks.filter((t) => category.visitorTasks.includes(t.task));
    const failed = gateOutcome(gates);
    const base = {
      category: category.id,
      label: category.label,
      gates,
      matchedTasks: matched.map((t) => t.task),
      staticAlternative: category.staticAlternative,
      implemented: category.experiencePattern !== undefined,
    };
    if (failed) {
      const reasons = gates.filter((g) => g.status === "fail").map((g) => `${g.gate}: ${g.reason}`);
      return { ...base, scorecard: null, outcome: failed, reason: reasons.join(" | ") };
    }
    const dataVerdicts = category.requiredData.map((k) => engagementDataVerdict(input.availableContent, k));
    const scorecard = scoreCategory(category, {
      signals,
      matched,
      contentReadiness: category.requiredContent.length === 0 ? 1 : category.requiredContent.filter((c) => renderable.has(c)).length / category.requiredContent.length,
      dataReadiness: dataVerdicts.length === 0 ? 1 : dataVerdicts.filter((v) => v.usable).length / dataVerdicts.length,
    });
    const minimum = minimumFor(category);
    if (!meetsMinimum(category, scorecard.score)) {
      const gameNote = category.gameKind ? ` (${category.gameKind === "standalone_game" ? "standalone game" : "gamification"} minimum, ECO §10)` : "";
      return { ...base, scorecard, outcome: "below_minimum", reason: `${scorecard.explanation} Below its minimum of ${minimum}${gameNote}.` };
    }
    return { ...base, scorecard, outcome: "qualified_not_selected", reason: scorecard.explanation };
  });

  const qualified = rank(evaluations.filter((e) => e.outcome === "qualified_not_selected"));
  const requested = input.engagement?.requestedIdea;
  const requestedEval = requested ? evaluations.find((e) => e.category === requested.category) : undefined;

  // ---------------------------------------------------------------- preference → primary
  let primaryEval: CandidateEvaluation | undefined;
  const preferenceConflicts: string[] = [];
  if (preference === "no_experience") {
    for (const e of qualified) {
      e.outcome = "excluded_by_preference";
      const category = byId.get(e.category)!;
      const statedRequirement =
        (category.id === "booking_flow" && input.requiredFunctionality.includes("booking")) ||
        (category.id === "configurator" && input.requiredFunctionality.includes("product_configurator"));
      if (statedRequirement) {
        preferenceConflicts.push(`the owner chose no interactive experience, but "${category.id}" qualifies and serves a stated requirement — owner to confirm; not added`);
      }
    }
  } else if (preference === "specific_idea" && requestedEval && requestedEval.outcome === "qualified_not_selected") {
    primaryEval = requestedEval;
  } else {
    primaryEval = qualified[0];
  }

  // ---------------------------------------------------------------- complementary
  const complements = primaryEval
    ? selectComplements(primaryEval, qualified, signals.routeJsBudgetKb)
    : { secondary: [] as CandidateEvaluation[], checks: [] as CombinationCheck[] };
  const secondaryEvals = complements.secondary;
  const combinationChecks = complements.checks;

  if (primaryEval) primaryEval.outcome = "selected_primary";
  for (const s of secondaryEvals) s.outcome = "selected_secondary";

  const primary = primaryEval ? selected(primaryEval, signals) : null;
  const secondary = secondaryEvals.map((e) => selected(e, signals));
  const selectedCategories = [primaryEval, ...secondaryEvals].filter((e): e is CandidateEvaluation => e !== undefined).map((e) => byId.get(e.category)!);
  const primaryCategory = primaryEval ? byId.get(primaryEval.category)! : undefined;

  // ---------------------------------------------------------------- requested idea
  const requestedIdeaAssessment = requestedEval
    ? {
        category: requestedEval.category,
        qualified: requestedEval.outcome === "selected_primary" || requestedEval.outcome === "selected_secondary" || requestedEval.outcome === "qualified_not_selected" || requestedEval.outcome === "excluded_by_preference",
        outcome: requestedEval.outcome,
        reasons: requestedEval.scorecard
          ? [requestedEval.reason]
          : requestedEval.gates.filter((g) => g.status === "fail").map((g) => `${g.gate}: ${g.reason}`),
      }
    : null;

  // ---------------------------------------------------------------- requirements
  const patterns = selectedCategories
    .map((c) => (c.experiencePattern ? EXPERIENCE_PATTERNS[c.experiencePattern] : undefined))
    .filter((p): p is NonNullable<typeof p> => p !== undefined);
  const journeyPatterns = [primary, ...secondary]
    .flatMap((s) => s?.journey ?? [])
    .map((id) => EXPERIENCE_PATTERNS[id]);
  const allPatterns = [...new Set([...patterns, ...journeyPatterns])];
  const requiredData = [...new Set(selectedCategories.flatMap((c) => c.requiredData))] as EngagementDataKind[];
  const missingData = [
    ...new Set(
      evaluations
        .filter((e) => e.outcome === "downgraded" || e.outcome === "deferred")
        .flatMap((e) => byId.get(e.category)!.requiredData)
        .filter((k) => !engagementDataVerdict(input.availableContent, k).usable),
    ),
  ] as EngagementDataKind[];

  const approvals = new Set<string>();
  for (const [c, e] of selectedCategories.map((c) => [c, evaluations.find((x) => x.category === c.id)!] as const)) {
    for (const a of c.approvalRequirements) approvals.add(`engagement ${c.id}: ${a}`);
    for (const g of e.gates) if (g.approval) approvals.add(`engagement ${c.id}: ${g.approval}`);
    if (!c.experiencePattern) approvals.add(`engagement ${c.id}: registry-only — no implementation contract exists; the generator ships its static alternative`);
    if (c.gameKind) approvals.add(`engagement ${c.id}: games and gamification always require owner approval (ECO §10)`);
  }
  if (requestedIdeaAssessment && !requestedIdeaAssessment.qualified) {
    approvals.add(`engagement: the requested idea "${requestedIdeaAssessment.category}" did not qualify — ${requestedIdeaAssessment.reasons.join("; ")}`);
  }
  if (preference === "choose_from_recommendations" && qualified.length > 0) {
    approvals.add(`engagement: owner to choose among ${qualified.length} recommended opportunit${qualified.length === 1 ? "y" : "ies"}; the framework's top pick is provisional`);
  }
  for (const conflict of preferenceConflicts) approvals.add(`engagement: ${conflict}`);
  if (primary && signals.eventTracking !== true) {
    approvals.add("engagement: analytics capability is not stated — events are specified but outcomes cannot yet be observed (ECO §4.8)");
  }

  // ---------------------------------------------------------------- decision
  const decision: EngagementOpportunityDecision["decision"] = !primary
    ? "NO_EXPERIENCE"
    : secondary.length > 0
      ? "COMPLEMENTARY_EXPERIENCES"
      : "PRIMARY_EXPERIENCE";

  const rejectedOpportunities: RejectedOpportunity[] = evaluations
    .filter((e) => e.outcome !== "selected_primary" && e.outcome !== "selected_secondary")
    .map((e) => ({
      category: e.category,
      outcome: e.outcome,
      reason: e.reason,
      score: e.scorecard?.score ?? null,
      failedGates: e.gates.filter((g) => g.status === "fail").map((g) => g.gate),
    }));

  const bestScored = rank(evaluations.filter((e) => e.scorecard !== null))[0];
  const noExperience: NoExperienceStatement | null = primary
    ? null
    : {
        reason:
          preference === "no_experience"
            ? "the owner chose no interactive experience; the framework respects the choice"
            : qualified.length === 0 && bestScored
              ? `no candidate reached its minimum suitability; the closest was ${bestScored.category} at ${bestScored.scorecard!.score}/100`
              : `no candidate passed every hard gate for the visitor tasks of this business (${[...signals.taskSet].join(", ") || "none stated"})`,
        evidence: evaluations
          .filter((e) => e.matchedTasks.length > 0)
          .map((e) => `${e.category}: ${e.outcome} — ${e.reason}`)
          .slice(0, 8),
        staticAlternative: staticAlternativeFor(signals, evaluations),
        rejectedCandidates: evaluations.map((e) => e.category),
        reconsiderWhen: reconsiderWhen(evaluations),
      };

  const derivedOnly = primaryEval ? primaryEval.matchedTasks.every((t) => signals.tasks.find((s) => s.task === t)?.basis === "derived") : false;
  const inferredOnly = primaryEval ? primaryEval.matchedTasks.every((t) => signals.tasks.find((s) => s.task === t)?.basis === "inferred") : false;
  // NO_EXPERIENCE is HIGH confidence only when no task-matching candidate failed on
  // something the owner could supply (data, an owner, a contact route, consent,
  // an integration). Otherwise the answer may change with input: MEDIUM.
  const INPUT_DEPENDENT = new Set(["data_integrity", "maintenance_ownership", "operational_follow_up", "privacy_consent"]);
  const inputDependent = evaluations.some(
    (e) =>
      e.matchedTasks.length > 0 &&
      (e.outcome === "below_minimum" ||
        e.gates.some((g) => g.status === "fail" && (INPUT_DEPENDENT.has(g.gate) || (g.gate === "static_alternative_adequacy" && e.category === "booking_flow")))),
  );
  const confidence: Confidence = primary
    ? inferredOnly ? "low" : derivedOnly || preference === "choose_from_recommendations" ? "medium" : "high"
    : signals.tasks.some((t) => t.basis === "inferred") ? "low" : inputDependent ? "medium" : "high";

  const rationale = primary
    ? `${decision}: ${primary.label} (${primary.score}/100, ${primary.band.replace(/_/g, " ")}) serves ${primary.matchedTasks.join(", ")} for ${primary.placement.targetObjective}` +
      (secondary.length > 0 ? `, followed by ${secondary.map((s) => s.label).join(", ")} as one journey` : "") +
      (primary.implementationStatus === "registry_only" ? "; registry-only, so its static alternative ships until a contract exists" : "") +
      "."
    : `NO_EXPERIENCE: ${noExperience!.reason}. Recommended alternative: ${noExperience!.staticAlternative}.`;

  const decisionRecordId = "ENG-DECISION";
  const pattern = primaryCategory?.experiencePattern ? EXPERIENCE_PATTERNS[primaryCategory.experiencePattern] : undefined;
  const performanceBudget = primaryCategory
    ? {
        estimatedRouteJsKb: selectedCategories.reduce((n, c) => n + estimatedKbFor(c), 0) + journeyPatterns.reduce((n, p) => n + p.performance.estimatedRouteJsKb, 0),
        kind: "estimated" as const,
        routeBudgetKb: signals.routeJsBudgetKb,
        loading: pattern?.performance.loading ?? "on_demand",
      }
    : null;
  const leadCaptureStrategy = primaryCategory
    ? primaryCategory.produces === "booking"
      ? "the booking form contract collects contact details as part of booking"
      : primary?.journey.includes("progressive_form")
        ? "optional, after the result is shown, through the progressive form (enquiry contract); the result is never gated"
        : primaryCategory.produces === "lead"
          ? "no capture inside the experience; its result points to the page's existing conversion route (a staged capture is considered only from the 75 band, ECO §7)"
          : "none — the experience collects no lead; the page's existing conversion route remains"
    : null;

  const out: Omit<EngagementOpportunityDecision, "records"> = {
    engagementRecommended: primary !== null,
    decision,
    confidence,
    preference,
    primaryOpportunity: primary,
    secondaryOpportunities: secondary,
    rejectedOpportunities,
    recommendations: qualified.map((e) => ({
      category: e.category,
      score: e.scorecard!.score,
      band: e.scorecard!.band,
      implemented: e.implemented,
    })),
    rationale,
    noExperience,
    targetAudience: signals.targetAudience,
    targetBusinessObjective: primary?.placement.targetObjective ?? null,
    funnelStage: primaryCategory ? (primary!.matchedTasks[0] ? TASK_STAGE[primary!.matchedTasks[0]] : primaryCategory.funnelStages[0]!) : null,
    placement: primary?.placement ?? null,
    expectedUserValue: primaryCategory?.visitorProblem ?? null,
    conversionAction: primaryCategory?.conversionAction ?? null,
    leadCaptureStrategy,
    requiredData,
    missingData,
    contentRequirements: [...new Set(selectedCategories.flatMap((c) => c.requiredContent))],
    accessibilityRequirements: [...new Set(allPatterns.flatMap((p) => p.accessibility))],
    performanceBudget,
    seoStrategy: [...new Set(allPatterns.flatMap((p) => p.seo))],
    analyticsRequirements: [...new Set(allPatterns.flatMap((p) => p.analyticsEvents))],
    hardGateResults: evaluations.map((e) => ({ category: e.category, gates: e.gates })),
    scorecard: primaryEval?.scorecard ?? null,
    combinationChecks,
    approvalRequirements: [...approvals],
    fallback: primaryCategory ? primaryCategory.fallback : noExperience!.staticAlternative,
    decisionRecordId,
    requestedIdeaAssessment,
    preferenceConflicts,
    evaluations,
  };

  return { ...out, records: buildRecords(out, signals, input) };
}

// ------------------------------------------------------------------ records

function buildRecords(
  d: Omit<EngagementOpportunityDecision, "records">,
  signals: EngagementSignals,
  input: BusinessInput,
): EngagementDecisionRecord[] {
  const facts = {
    primaryObjective: signals.primaryObjective,
    objectives: [...signals.objectives],
    visitorTasks: signals.tasks.map((t) => `${t.task} (${t.basis})`),
    offerCount: signals.adequacy.offerCount,
    trust: signals.trust,
    regulationRisk: signals.regulationRisk,
    accessibilityTarget: signals.accessibilityTarget,
    routeJsBudgetKb: signals.routeJsBudgetKb,
    preference: d.preference,
  };
  const selectedId = d.primaryOpportunity?.category ?? null;
  const payload = (overrides: Partial<EngagementDecisionRecord["engagement"]>): EngagementDecisionRecord["engagement"] => ({
    businessFacts: { businessName: input.businessName, ...facts },
    visitorTask: signals.tasks.map((t) => t.task),
    visitorFriction: signals.frictionPoints,
    businessObjective: d.targetBusinessObjective ?? signals.primaryObjective,
    staticAlternativeConsidered: d.noExperience?.staticAlternative ?? d.fallback,
    selectedInteraction: selectedId,
    score: d.scorecard?.score ?? null,
    rejectedAlternatives: d.rejectedOpportunities,
    requiredData: d.requiredData,
    missingData: d.missingData,
    contentRequirements: d.contentRequirements,
    placement: d.placement,
    conversionAction: d.conversionAction,
    leadCapture: d.leadCaptureStrategy,
    accessibility: d.accessibilityRequirements,
    performance: d.performanceBudget,
    seo: d.seoStrategy,
    analytics: d.analyticsRequirements,
    fallback: d.fallback,
    approvalRequirements: d.approvalRequirements,
    evidence: d.noExperience?.evidence ?? (d.scorecard ? [d.scorecard.explanation] : []),
    policyReferences: POLICY,
    ...overrides,
  });

  const decisionRecord: EngagementDecisionRecord = {
    id: d.decisionRecordId,
    ruleId: "ENGAGEMENT-POLICY",
    inputFacts: facts,
    decision: d.primaryOpportunity
      ? `${d.decision}: ${[d.primaryOpportunity, ...d.secondaryOpportunities].map((s) => s.category).join(" → ")}`
      : "NO_EXPERIENCE",
    rationale: d.rationale,
    // The research cites no URLs; policy sections are carried in the payload instead of invented links.
    sourceUrls: [],
    confidence: d.confidence,
    humanApprovalRequired: d.approvalRequirements.length > 0,
    fallback: d.fallback,
    rejectedAlternatives: d.rejectedOpportunities.map((r) => `${r.category} (${r.outcome})`),
    engagement: payload({}),
  };

  const candidateRecords: EngagementDecisionRecord[] = d.evaluations.map((e) => ({
    id: `ENG-${e.category}`,
    ruleId: "ENGAGEMENT-POLICY",
    inputFacts: { category: e.category, matchedTasks: e.matchedTasks, failedGates: e.gates.filter((g) => g.status === "fail").map((g) => g.gate) },
    decision: `${e.category}: ${e.outcome}`,
    rationale: e.reason,
    sourceUrls: [],
    confidence: d.confidence,
    humanApprovalRequired: e.outcome === "selected_primary" || e.outcome === "selected_secondary",
    fallback: e.staticAlternative,
    rejectedAlternatives: [],
    engagement: payload({
      selectedInteraction: e.outcome === "selected_primary" || e.outcome === "selected_secondary" ? e.category : null,
      score: e.scorecard?.score ?? null,
      staticAlternativeConsidered: e.staticAlternative,
      // The decision record carries the full rejected list; repeating it on 27 candidates explains nothing.
      rejectedAlternatives: [],
      evidence: e.gates.map((g) => `${g.gate} ${g.status}: ${g.reason}`),
    }),
  }));

  return [decisionRecord, ...candidateRecords];
}

export type { EngagementCategoryId };
