/**
 * ENGAGEMENT VOCABULARY — the closed sets the engagement decision reasons over.
 *
 * Kept in a dependency-free module so the input contract
 * (`design-intelligence/types/business-input.ts`) can validate against the same
 * ids the registry uses. One vocabulary, one home — the `canonicalSection()`
 * lesson applied before the second spelling appears.
 *
 * Policy source: docs/research/ENGAGEMENT-CONVERSION-OPPORTUNITY-RESEARCH.md
 * (cited as ECO §n). The research defines categories; it does not define this
 * task vocabulary, which is framework policy (Tier E) so that "visitor value"
 * can be checked deterministically rather than judged.
 */

/** ECO §3 plus the brief's phase-4 list: 27 opportunity categories. */
export const ENGAGEMENT_CATEGORY_IDS = [
  "calculator",
  "roi_calculator",
  "price_estimator",
  "savings_impact_tool",
  "quiz",
  "assessment",
  "eligibility_checker",
  "product_service_finder",
  "guided_selector",
  "configurator",
  "comparison_tool",
  "interactive_demo",
  "simulation",
  "planner",
  "checklist_readiness_tool",
  "interactive_utility",
  "interactive_chart_explorer",
  "recommendation_engine",
  "guided_journey",
  "booking_flow",
  "progressive_profile",
  "survey_poll",
  "interactive_storytelling",
  "challenge_habit_loop",
  "gamification",
  "game_serious_game",
  "visualizer_3d_ar_webgl",
] as const;
export type EngagementCategoryId = (typeof ENGAGEMENT_CATEGORY_IDS)[number];

/**
 * What a visitor is trying to get done. Closed on purpose: a free-text task
 * cannot be matched deterministically, and matching it by similarity would put
 * a judgement inside a gate (DESIGN-INTELLIGENCE-SPEC determinism boundary).
 */
export const VISITOR_TASKS = [
  "book_appointment",
  "contact_business",
  "buy_product",
  "subscribe_or_sign_up",
  "estimate_cost_or_savings",
  "justify_investment_return",
  "assess_need_or_readiness",
  "check_eligibility",
  "find_suitable_offer",
  "compare_offers",
  "configure_product",
  "plan_activity",
  "understand_data",
  "learn_topic",
  "try_product",
  "track_progress_or_habit",
  "practice_or_train",
  "give_feedback",
] as const;
export type VisitorTask = (typeof VISITOR_TASKS)[number];

/** Funnel stages, in journey order. The order is used by the combination policy. */
export const FUNNEL_STAGES = ["awareness", "consideration", "decision", "conversion", "retention"] as const;
export type FunnelStage = (typeof FUNNEL_STAGES)[number];

export const TASK_STAGE: Record<VisitorTask, FunnelStage> = {
  book_appointment: "conversion",
  contact_business: "conversion",
  buy_product: "conversion",
  subscribe_or_sign_up: "conversion",
  estimate_cost_or_savings: "decision",
  justify_investment_return: "decision",
  assess_need_or_readiness: "consideration",
  check_eligibility: "decision",
  find_suitable_offer: "consideration",
  compare_offers: "decision",
  configure_product: "decision",
  plan_activity: "consideration",
  understand_data: "awareness",
  learn_topic: "awareness",
  try_product: "consideration",
  track_progress_or_habit: "retention",
  practice_or_train: "retention",
  give_feedback: "retention",
};

/**
 * Data an experience may need before it can honestly produce an output. Each maps
 * to an inventory STATUS field; values arrive separately (status-vs-value split).
 */
export const ENGAGEMENT_DATA_KINDS = [
  "formulas",
  "decisionRules",
  "comparisonData",
  "productSpecifications",
  "pricingRanges",
  "datasets",
  "pricing",
  "serviceDescriptions",
  "faq",
] as const;
export type EngagementDataKind = (typeof ENGAGEMENT_DATA_KINDS)[number];

/** Customer setup choice (brief phase 10, ECO §18). */
export const ENGAGEMENT_PREFERENCES = [
  "framework_decides",
  "choose_from_recommendations",
  "specific_idea",
  "no_experience",
] as const;
export type EngagementPreference = (typeof ENGAGEMENT_PREFERENCES)[number];

/**
 * Rationales that can never, on their own, justify a game or gamification
 * (brief phase 6, ECO §2.1 / §9). Matched against a customer's stated rationale.
 */
export const VANITY_RATIONALE_PATTERNS: ReadonlyArray<{ id: string; pattern: RegExp }> = [
  { id: "time_on_page", pattern: /time[\s-]on[\s-](page|site)|dwell[\s-]time|stay longer/i },
  { id: "looks_modern", pattern: /look(s|ing)?\s+(more\s+)?modern|modern[\s-]look|feel(s)?\s+modern|trendy/i },
  { id: "more_clicks", pattern: /more\s+clicks|increase[sd]?\s+clicks|click[\s-]?through/i },
  { id: "reduce_bounce", pattern: /bounce/i },
  { id: "memorable", pattern: /memorable|stand\s+out|wow|fun\b/i },
];
