/**
 * ENGAGEMENT SIGNALS — visitor-task extraction and the facts the gates read.
 *
 * Pipeline stages 2–4 of the brief ("visitor task extraction → business objective
 * → customer journey / friction"), computed ONCE from existing inputs. Every task
 * carries its basis:
 *   stated    — the owner listed it in `engagement.visitorTasks`
 *   inferred  — an AI step extracted it from free text (declared as inferred)
 *   derived   — computed here from a stated objective or requirement, by a
 *               documented mapping (framework policy, Tier E)
 *
 * Nothing is inferred from INDUSTRY. Tasks come from objectives, requirements and
 * the owner's own statements; the industry only ever reaches engagement through
 * the profile variables it already shaped (trust, regulation, complexity).
 */
import type { BusinessInput, WebsiteObjective } from "../design-intelligence/types/business-input.js";
import type { DesignContextProfile } from "../design-intelligence/types/profile.js";
import type { DerivedFacts } from "../design-intelligence/engine/derive-facts.js";
import { OBJECTIVE_ARCHITECTURE } from "../design-intelligence/objectives/objective-architecture.js";
import type { StaticAdequacyInput } from "./types.js";
import { TASK_STAGE, type FunnelStage, type VisitorTask } from "./vocabulary.js";

export interface TaskSignal {
  task: VisitorTask;
  basis: "stated" | "inferred" | "derived";
  source: string;
}

export interface EngagementSignals {
  tasks: TaskSignal[];
  taskSet: ReadonlySet<VisitorTask>;
  primaryObjective: WebsiteObjective;
  objectives: ReadonlySet<WebsiteObjective>;
  primaryStage: FunnelStage;
  frictionPoints: string[];
  adequacy: StaticAdequacyInput;
  conversionEndpointVerified: boolean;
  primaryTaskHighIntent: boolean;
  trust: DesignContextProfile["variables"]["trust_requirement"];
  regulationRisk: DesignContextProfile["variables"]["regulation_risk"];
  accessibilityTarget: DesignContextProfile["variables"]["accessibility_requirement"];
  performanceSensitivity: DesignContextProfile["variables"]["performance_sensitivity"];
  technicalBudget: DesignContextProfile["variables"]["technical_complexity_budget"];
  mobileShare: DesignContextProfile["variables"]["mobile_share"];
  literacy: DesignContextProfile["variables"]["audience_digital_literacy"];
  routeJsBudgetKb: number;
  salesMotion: "self_serve" | "sales_assisted" | "mixed" | undefined;
  maintenanceOwner: string | undefined;
  leadFollowUpOwner: string | undefined;
  consentManagement: boolean | undefined;
  eventTracking: boolean | undefined;
  sensitiveData: string[];
  targetAudience: string[];
  /** DD rule outputs the engagement engine respects. */
  interactionLevelCap: string | undefined;
  forbidden: ReadonlySet<string>;
}

/**
 * Objective → the task a visitor pursuing it performs. The conventional task,
 * deliberately: "request a demo" derives CONTACT, not "estimate ROI". An ROI
 * calculator must be earned by a stated task, not assumed from the objective.
 */
const OBJECTIVE_TASKS: Partial<Record<WebsiteObjective, VisitorTask[]>> = {
  book_appointments: ["book_appointment"],
  sell_products: ["buy_product"],
  sell_subscriptions: ["subscribe_or_sign_up"],
  start_free_trial: ["subscribe_or_sign_up"],
  request_demo: ["contact_business"],
  generate_leads: ["contact_business"],
  educate: ["learn_topic"],
  publish_content: ["learn_topic"],
  recruit: ["contact_business"],
  provide_support: ["contact_business"],
};

const REQUIREMENT_TASKS: Partial<Record<string, VisitorTask[]>> = {
  booking: ["book_appointment"],
  product_configurator: ["configure_product"],
  search: ["find_suitable_offer"],
};

export interface SignalContext {
  input: BusinessInput;
  profile: DesignContextProfile;
  facts: DerivedFacts;
  routeJsBudgetKb: number;
  interactionLevelCap?: string;
  forbidden?: ReadonlySet<string>;
}

export function deriveEngagementSignals(ctx: SignalContext): EngagementSignals {
  const { input, profile, facts } = ctx;
  const engagement = input.engagement;
  const tasks: TaskSignal[] = [];
  const seen = new Set<VisitorTask>();
  const add = (signal: TaskSignal) => {
    // A stated task outranks a derived duplicate; keep the strongest basis.
    const existing = tasks.find((t) => t.task === signal.task);
    if (existing) {
      if (existing.basis === "derived" && signal.basis !== "derived") Object.assign(existing, signal);
      return;
    }
    seen.add(signal.task);
    tasks.push(signal);
  };

  for (const stated of engagement?.visitorTasks ?? []) {
    add({ task: stated.task, basis: stated.basis, source: stated.detail ?? "engagement.visitorTasks" });
  }
  for (const objective of input.websiteObjective) {
    for (const task of OBJECTIVE_TASKS[objective] ?? []) {
      add({ task, basis: "derived", source: `objective ${objective}` });
    }
  }
  for (const requirement of input.requiredFunctionality) {
    for (const task of REQUIREMENT_TASKS[requirement] ?? []) {
      add({ task, basis: "derived", source: `requirement ${requirement}` });
    }
  }

  const primaryObjective = profile.primaryObjective;
  const primaryTask = OBJECTIVE_TASKS[primaryObjective]?.[0];
  const primaryStage: FunnelStage = primaryTask
    ? TASK_STAGE[primaryTask]
    : OBJECTIVE_ARCHITECTURE[primaryObjective].conversionSurface === "related_conversion_link"
      ? "awareness"
      : "consideration";

  const productCount = input.servicesProducts.filter((o) => o.kind === "product").length;
  const v = profile.variables;

  return {
    tasks,
    taskSet: seen,
    primaryObjective,
    objectives: new Set(input.websiteObjective),
    primaryStage,
    frictionPoints: [...(engagement?.frictionPoints ?? [])],
    adequacy: {
      offerCount: facts.offerCount,
      productCount,
      allPricesKnown: input.servicesProducts.length > 0 && input.servicesProducts.every((o) => o.priceKnown),
      statedTasks: new Set(tasks.filter((t) => t.basis === "stated").map((t) => t.task)),
      purchaseCycle: v.purchase_cycle,
      commerceDepth: v.commerce_depth,
      schedulingIntegration: engagement?.schedulingIntegration,
      salesMotion: engagement?.salesMotion,
      tasks: seen,
    },
    conversionEndpointVerified: facts.conversionEndpointVerified,
    primaryTaskHighIntent: facts.primaryTaskHighIntent,
    trust: v.trust_requirement,
    regulationRisk: v.regulation_risk,
    accessibilityTarget: v.accessibility_requirement,
    performanceSensitivity: v.performance_sensitivity,
    technicalBudget: v.technical_complexity_budget,
    mobileShare: v.mobile_share,
    literacy: v.audience_digital_literacy,
    routeJsBudgetKb: ctx.routeJsBudgetKb,
    salesMotion: engagement?.salesMotion,
    maintenanceOwner: engagement?.maintenanceOwner,
    leadFollowUpOwner: engagement?.leadFollowUpOwner,
    consentManagement: engagement?.analytics?.consentManagement,
    eventTracking: engagement?.analytics?.eventTracking,
    sensitiveData: [...(engagement?.sensitiveDataCategories ?? [])],
    targetAudience: (input.targetAudience.some((a) => a.isPrimary)
      ? input.targetAudience.filter((a) => a.isPrimary)
      : input.targetAudience
    ).map((a) => a.label),
    interactionLevelCap: ctx.interactionLevelCap,
    forbidden: ctx.forbidden ?? new Set(),
  };
}
