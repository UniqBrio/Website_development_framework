/**
 * ENGAGEMENT TYPES — registry entries, experience contracts, gate results,
 * scorecards, the decision (brief phase 11) and its record (brief phase 9).
 *
 * Reuses rather than redefines:
 *  - `Confidence` and `DecisionRecord` from the decision language (one record system);
 *  - `WebsiteObjective` from the input contract;
 *  - `ConversionKind` from the form contracts (booking and progressive form ARE forms);
 *  - the eight §9 hard-constraint names from the pattern registry.
 */
import type { Confidence, DecisionRecord } from "../design-intelligence/types/decision.js";
import type { WebsiteObjective } from "../design-intelligence/types/business-input.js";
import type { PatternDefinition } from "../design-system/pattern-registry/types.js";
import type { ConversionKind } from "../generation/form-contracts.js";
import type {
  EngagementCategoryId,
  EngagementDataKind,
  EngagementPreference,
  FunnelStage,
  VisitorTask,
} from "./vocabulary.js";

/** A 0–5 ordinal, the same scale the pattern registry's benefits use. */
export type Ordinal = 0 | 1 | 2 | 3 | 4 | 5;

// ------------------------------------------------------------------ experience patterns

export const EXPERIENCE_PATTERN_IDS = [
  "calculator",
  "assessment",
  "guided_selector",
  "comparison",
  "booking",
  "result",
  "progressive_form",
  "static_fallback",
] as const;
export type ExperiencePatternId = (typeof EXPERIENCE_PATTERN_IDS)[number];

/**
 * How far the GENERATOR can take a pattern today. Recorded so a selected
 * experience the generator cannot render becomes a refusal with a reason, never a
 * placeholder on a public page.
 */
export type GeneratorSupport =
  /** Rendered as semantic HTML from verified supplied data, no JavaScript. */
  | "static_renderable"
  /** Served by a section the page model already builds (e.g. the booking form contract). */
  | "maps_to_existing_section"
  /**
   * Rendered from GOVERNED values (verified formula or decision rules, item-level
   * provenance) as an enhancement plus a static equivalent (engagement/delivery.ts).
   */
  | "governed_interactive"
  /** A step rendered inside its parent experience (the result region). */
  | "rendered_within_parent"
  /** A contract exists; no renderer yet. The static alternative ships instead. */
  | "contract_only";

export interface ExperiencePattern {
  id: ExperiencePatternId;
  label: string;
  /** An experience a visitor uses, a step inside another experience's journey, or the degraded path. */
  role: "experience" | "journey_step" | "fallback";
  /** ECO §16 rendering: semantic baseline first, enhancement optional. */
  rendering: {
    baseline: "semantic_html";
    enhancement: "none" | "progressive_js";
    /** What a visitor can still do with JavaScript disabled. Never empty. */
    withoutJavaScript: string;
  };
  /** Data kinds that must be verified before the pattern may produce an output. */
  requiredData: readonly EngagementDataKind[];
  /** Pattern-specific requirements (ECO §12), checked in review and by the host audit. */
  requirements: readonly string[];
  accessibility: readonly string[];
  /** The same eight §9 names the visual pattern registry uses — all must be false. */
  hardConstraintViolations: PatternDefinition["hardConstraintViolations"];
  performance: {
    /** ESTIMATED incremental route JS in KB gzipped. An estimate — never a measurement. */
    estimatedRouteJsKb: number;
    loading: "eager" | "deferred" | "on_demand";
  };
  seo: readonly string[];
  analyticsEvents: readonly string[];
  fallback: string;
  /** ECO §16: disabling the experience must leave a working page. */
  killSwitch: string;
  /** When the pattern IS an existing conversion contract. */
  reusesFormContract?: ConversionKind;
  generatorSupport: GeneratorSupport;
}

// ------------------------------------------------------------------ opportunity registry

export type CategoryGroup =
  | "decision_support"
  | "discovery"
  | "conversion"
  | "utility"
  | "retention"
  | "higher_complexity";

/** What the category's output asks the visitor to do next, for CTA competition. */
export type CtaRole = "primary_conversion" | "supports_conversion" | "none";

/**
 * Signals the static-solution test may read. `product_service_complexity` is
 * deliberately ABSENT: the profile infers it from the industry, and letting it
 * decide adequacy made industry the dominant engagement variable (a six-programme
 * fitness studio was denied a selector only because fitness is not a "technical"
 * industry). Counts, stated tasks, known prices and the purchase cycle only.
 */
export interface StaticAdequacyInput {
  offerCount: number;
  productCount: number;
  /** Every offer has a known price — a static price list can answer "how much". */
  allPricesKnown: boolean;
  /** Tasks the owner STATED (not derived): the owner's evidence that a need exists. */
  statedTasks: ReadonlySet<VisitorTask>;
  purchaseCycle: "immediate" | "short" | "considered" | "long" | "regulated";
  commerceDepth: "none" | "shallow" | "medium" | "deep";
  schedulingIntegration: boolean | undefined;
  salesMotion: "self_serve" | "sales_assisted" | "mixed" | undefined;
  tasks: ReadonlySet<VisitorTask>;
}

export interface OpportunityCategory {
  id: EngagementCategoryId;
  label: string;
  group: CategoryGroup;
  visitorProblem: string;
  /** Tasks this category genuinely serves (hard gate 1). */
  visitorTasks: readonly VisitorTask[];
  /** Objectives it can serve (hard gate 2). NO industry field exists, on purpose. */
  businessObjectives: readonly WebsiteObjective[];
  funnelStages: readonly FunnelStage[];
  requiredData: readonly EngagementDataKind[];
  /** Content categories (verifyContent vocabulary) the experience needs rendered. */
  requiredContent: readonly string[];
  // ---- suitability metadata (0–5). Tier E: framework policy, starting values.
  visitorValue: Ordinal;
  conversionPotential: Ordinal;
  qualificationValue: Ordinal;
  personalizationValue: Ordinal;
  differentiation: Ordinal;
  usageFrequency: Ordinal;
  implementationComplexity: "low" | "medium" | "high";
  accessibilityRisk: Ordinal;
  performanceCost: Ordinal;
  seoRisk: Ordinal;
  trustComplianceRisk: Ordinal;
  maintenanceBurden: Ordinal;
  /** Abuse / manipulation risk (hard gate 10): reward mechanics, public ranking, UGC display. */
  abuseRisk: Ordinal;
  /** Cognitive cost of using it, for the combination policy. */
  cognitiveLoad: Ordinal;
  /** ESTIMATED incremental route JS in KB, for hard gate 7 when no pattern is implemented. */
  estimatedRouteJsKb: number;
  staticAlternative: string;
  fallback: string;
  /** Minimum suitability score. 45 for ordinary categories; 75 gamification; 85 standalone game. */
  minimumSuitability: number;
  approvalRequirements: readonly string[];
  /** The implemented experience pattern, when one exists. Absent = registry-only (ECO §22). */
  experiencePattern?: ExperiencePatternId;
  /** Output resembles advice, eligibility or a financial/health outcome (hard gate 4). */
  adviceLikeOutput: boolean;
  /** When personal data is collected relative to the value delivered (hard gate 5). */
  personalData: "none" | "optional_after_value" | "required_after_value" | "required_before_value";
  /** What completing it leads to (hard gate 9). */
  produces: "lead" | "booking" | "result_only" | "nothing";
  ctaRole: CtaRole;
  /** The concrete next action its result offers, for CTA competition. */
  conversionAction: string | null;
  /** Question topics it asks, for the repeated-questions check. */
  asksAbout: readonly string[];
  /** Experience patterns whose output this one can consume without re-asking. */
  acceptsInputFrom: readonly ExperiencePatternId[];
  /** §9 hard constraints inherent to the category (e.g. WebGL to understand). */
  inherentViolations: ReadonlyArray<keyof PatternDefinition["hardConstraintViolations"]>;
  gameKind?: "gamification" | "standalone_game";
  /** Serious-decision contexts in which play would trivialise the decision. */
  trivialisesSeriousDecisions: boolean;
  /**
   * Static-solution test (ECO §2.2, hard gate 11): is a static page, link or
   * conventional form ADEQUATE for this category's job in this context?
   */
  staticAdequacy: (input: StaticAdequacyInput) => { adequate: boolean; reason: string };
}

// ------------------------------------------------------------------ gates

export const HARD_GATE_NAMES = [
  "visitor_value",
  "objective_linkage",
  "data_integrity",
  "legal_compliance",
  "privacy_consent",
  "accessibility_feasibility",
  "performance_feasibility",
  "maintenance_ownership",
  "operational_follow_up",
  "abuse_trust_safety",
  "static_alternative_adequacy",
] as const;
export type HardGateName = (typeof HARD_GATE_NAMES)[number];

/**
 * What a failure means. `reject`: nothing would fix it. `downgrade`: deliver the
 * job through the static alternative. `defer`: an input is missing; ask for it.
 */
export type GateFailureOutcome = "reject" | "downgrade" | "defer";

export interface HardGateResult {
  gate: HardGateName;
  status: "pass" | "fail";
  /** Set on failure. */
  onFail?: GateFailureOutcome;
  reason: string;
  /** Approval this gate attaches even when it passes (e.g. regulated output). */
  approval?: string;
}

// ------------------------------------------------------------------ scoring

export const POSITIVE_DIMENSIONS = [
  "visitorValue",
  "taskRelevance",
  "conversionPotential",
  "qualificationValue",
  "personalization",
  "differentiation",
  "contentReadiness",
  "dataReadiness",
  "usageFrequency",
  "implementationFeasibility",
] as const;
export const RISK_DIMENSIONS = [
  "performanceCost",
  "accessibilityRisk",
  "seoRisk",
  "trustComplianceRisk",
  "maintenanceBurden",
] as const;
export type PositiveDimension = (typeof POSITIVE_DIMENSIONS)[number];
export type RiskDimension = (typeof RISK_DIMENSIONS)[number];

export type ScoreBand =
  | "no_experience"
  | "lightweight_progressive_enhancement"
  | "focused_primary_interaction"
  | "strong_candidate"
  | "high_confidence_strategic";

export interface DimensionScore {
  value: Ordinal;
  weight: number;
  contribution: number;
  why: string;
}

export interface Scorecard {
  positive: Record<PositiveDimension, DimensionScore>;
  risk: Record<RiskDimension, DimensionScore>;
  /** 0–100. A prioritisation heuristic — never a conversion prediction. */
  score: number;
  band: ScoreBand;
  /** "Suitability score: 71/100 …" — the only phrasing the score is reported in. */
  explanation: string;
}

// ------------------------------------------------------------------ evaluation and decision

export type CandidateOutcome =
  | "selected_primary"
  | "selected_secondary"
  | "qualified_not_selected"
  | "below_minimum"
  | "rejected"
  | "downgraded"
  | "deferred"
  | "excluded_by_preference";

export interface CandidateEvaluation {
  category: EngagementCategoryId;
  label: string;
  gates: HardGateResult[];
  /** Null for any gate failure: a score must not be argued against a gate. */
  scorecard: Scorecard | null;
  outcome: CandidateOutcome;
  reason: string;
  /** The tasks from this business that the category matched. */
  matchedTasks: VisitorTask[];
  staticAlternative: string;
  implemented: boolean;
}

export interface Placement {
  /** Never `hero` by default (ECO §19). */
  section: "decision_support_section" | "comparison_section" | "conversion_section" | "result_section" | "dedicated_tool_page";
  targetObjective: WebsiteObjective;
  /** Resolved against the page model after pages are derived; null until then. */
  route: string | null;
  /** High-intent visitors keep the direct call to action before any experience. */
  position: "after_primary_cta" | "within_section";
  why: string;
}

export interface SelectedOpportunity {
  category: EngagementCategoryId;
  label: string;
  experiencePattern: ExperiencePatternId | null;
  implementationStatus: "implemented_contract" | "registry_only";
  generatorSupport: GeneratorSupport | "none";
  score: number;
  band: ScoreBand;
  matchedTasks: VisitorTask[];
  placement: Placement;
  conversionAction: string | null;
  /** The journey steps that follow it (result, progressive form), when the band calls for one. */
  journey: ExperiencePatternId[];
}

export interface RejectedOpportunity {
  category: EngagementCategoryId;
  outcome: CandidateOutcome;
  reason: string;
  score: number | null;
  failedGates: HardGateName[];
}

export interface NoExperienceStatement {
  reason: string;
  evidence: string[];
  staticAlternative: string;
  rejectedCandidates: EngagementCategoryId[];
  reconsiderWhen: string[];
}

export interface CombinationCheck {
  check: "distinct_jobs" | "coherent_journey" | "no_repeated_questions" | "no_competing_ctas" | "cognitive_cost" | "technical_cost" | "count";
  passed: boolean;
  reason: string;
}

/** Brief phase 9: the Engagement Decision Record, EXTENDING the existing DecisionRecord. */
export interface EngagementDecisionRecord extends DecisionRecord {
  engagement: {
    businessFacts: Record<string, unknown>;
    visitorTask: VisitorTask[];
    visitorFriction: string[];
    businessObjective: WebsiteObjective | null;
    staticAlternativeConsidered: string;
    selectedInteraction: EngagementCategoryId | null;
    score: number | null;
    rejectedAlternatives: RejectedOpportunity[];
    requiredData: EngagementDataKind[];
    missingData: EngagementDataKind[];
    contentRequirements: string[];
    placement: Placement | null;
    conversionAction: string | null;
    leadCapture: string | null;
    accessibility: string[];
    performance: EngagementOpportunityDecision["performanceBudget"];
    seo: string[];
    analytics: string[];
    fallback: string;
    approvalRequirements: string[];
    evidence: string[];
    /** Policy sections the record rests on. Tier E unless stated otherwise. */
    policyReferences: string[];
  };
}

/** Brief phase 11. */
export interface EngagementOpportunityDecision {
  engagementRecommended: boolean;
  decision: "NO_EXPERIENCE" | "PRIMARY_EXPERIENCE" | "COMPLEMENTARY_EXPERIENCES";
  confidence: Confidence;
  preference: EngagementPreference;
  primaryOpportunity: SelectedOpportunity | null;
  secondaryOpportunities: SelectedOpportunity[];
  rejectedOpportunities: RejectedOpportunity[];
  /** Ranked qualified candidates — what "choose from recommended opportunities" shows. */
  recommendations: Array<{ category: EngagementCategoryId; score: number; band: ScoreBand; implemented: boolean }>;
  rationale: string;
  noExperience: NoExperienceStatement | null;
  targetAudience: string[];
  targetBusinessObjective: WebsiteObjective | null;
  funnelStage: FunnelStage | null;
  placement: Placement | null;
  expectedUserValue: string | null;
  conversionAction: string | null;
  leadCaptureStrategy: string | null;
  requiredData: EngagementDataKind[];
  missingData: EngagementDataKind[];
  contentRequirements: string[];
  accessibilityRequirements: string[];
  performanceBudget: { estimatedRouteJsKb: number; kind: "estimated"; routeBudgetKb: number; loading: string } | null;
  seoStrategy: string[];
  analyticsRequirements: string[];
  hardGateResults: Array<{ category: EngagementCategoryId; gates: HardGateResult[] }>;
  scorecard: Scorecard | null;
  combinationChecks: CombinationCheck[];
  approvalRequirements: string[];
  fallback: string;
  decisionRecordId: string;
  /** "I have a specific idea": how the requested idea fared, with reasons. */
  requestedIdeaAssessment: { category: EngagementCategoryId; qualified: boolean; outcome: CandidateOutcome; reasons: string[] } | null;
  /** An owner preference that conflicts with a stated requirement — flagged, never overridden. */
  preferenceConflicts: string[];
  /** Every candidate, with gates and scorecards, for audit. */
  evaluations: CandidateEvaluation[];
  records: EngagementDecisionRecord[];
}
