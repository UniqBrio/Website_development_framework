/**
 * RECOMMENDATIONS — one shape for every growth suggestion, and its lifecycle.
 *
 * Guest tools, resources, blogs, SEO improvements and form-protection items are
 * all `Recommendation`s, so the console renders one card, the lifecycle has one
 * state machine and priority has one scale. The detail payload differs by area.
 *
 * STATUS has three sources, recorded as `statusBasis`:
 *   default       the engine recommends it and nobody has acted;
 *   admin_action  an authorised person accepted, dismissed or completed it;
 *   detected      the analysis itself sees it is done (the blog now exists, the
 *                 form is protected). Detection outranks a stored state, because
 *                 a stored "pending" for something already published is stale.
 *
 * A dismissed recommendation stays dismissed unless reopened: the engine never
 * re-surfaces what an administrator explicitly rejected.
 */
import { z } from "zod";
import {
  GUEST_TOOL_IDS,
  GUEST_TOOL_PLACEMENTS,
  RECOMMENDATION_STATUSES,
  type GuestToolId,
  type Priority,
  type RecommendationArea,
  type RecommendationStatus,
} from "./vocabulary.js";
import { authorize, permissionForArea, type GrowthActor } from "./access.js";
import { spamProtectionPolicySchema, assessSpamPolicy, type SpamProtectionPolicy } from "./spam/policy.js";

export interface KeywordSet {
  primary: string | null;
  secondary: string[];
  /** Where the keywords came from. Never keyword research. */
  basis: "derived_from_academy_facts";
  /** README rule 10: an unmeasured value is never presented as measured. */
  searchVolume: "not_measured";
}

export interface BlogBrief {
  kind: "blog";
  title: string;
  metaTitle: string;
  metaDescription: string;
  suggestedUrl: string;
  searchIntent: string;
  funnelStage: string;
  internalLinks: string[];
  outline: string[];
}

export interface ResourceBrief {
  kind: "resource";
  resourceKind: string;
  title: string;
  format: string;
  suggestedUrl: string;
  gated: false;
  internalLinks: string[];
}

export interface GuestToolBrief {
  kind: "guest_tool";
  toolId: GuestToolId;
  /** How the tool is delivered through an EXISTING framework mechanism. */
  deliveredBy: string;
  readiness: "ready" | "needs_data" | "needs_owner_confirmation" | "blocked";
  blockers: string[];
  registration: "none" | "contact_details_to_book";
  benefits: { engagement: string; leadGeneration: string; footfall: string };
  impact: { engagement: Priority; leadGeneration: Priority; footfall: Priority };
  configuration: GuestToolConfiguration;
  /** The engagement decision's verdict on the mapped category, when one exists. */
  engagementVerdict: string | null;
}

export interface SeoImprovementBrief {
  kind: "seo_improvement";
  improvement: "missing_content" | "landing_page" | "internal_linking" | "location_content" | "structured_content" | "faq";
  target: string;
  steps: string[];
}

export interface FormProtectionBrief {
  kind: "form_protection";
  formId: string;
  routes: string[];
  risk: "standard" | "elevated";
  riskReasons: string[];
  checks: string[];
  endpoint: "configured" | "unconfigured" | "host_form";
}

export type RecommendationDetail = BlogBrief | ResourceBrief | GuestToolBrief | SeoImprovementBrief | FormProtectionBrief;

export interface Recommendation {
  /** Stable: the same academy facts always produce the same id. */
  id: string;
  area: RecommendationArea;
  title: string;
  why: string;
  targetAudience: string[];
  seoOpportunity: string | null;
  keywords: KeywordSet;
  businessBenefit: string;
  priority: Priority;
  /** 0–100 prioritisation heuristic — never a traffic or conversion prediction. */
  priorityScore: number;
  priorityFactors: string[];
  status: RecommendationStatus;
  statusBasis: "default" | "admin_action" | "detected";
  statusNote: string | null;
  /** The academy facts this recommendation rests on. */
  evidence: string[];
  detail: RecommendationDetail;
}

// ------------------------------------------------------------------ priority

export function priorityFrom(score: number): Priority {
  return score >= 70 ? "high" : score >= 45 ? "medium" : "low";
}

export function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

// ------------------------------------------------------------------ configuration

export const guestToolConfigurationSchema = z.object({
  enabled: z.boolean().default(false),
  placement: z.enum(GUEST_TOOL_PLACEMENTS).default("home_section"),
  /** The owner's call-to-action wording; absent, the tool's own label is used. */
  ctaLabel: z.string().min(1).max(60).optional(),
});
export type GuestToolConfiguration = z.infer<typeof guestToolConfigurationSchema>;

const auditEntrySchema = z.object({
  at: z.string().min(1),
  actor: z.string().min(1),
  role: z.string().min(1),
  action: z.string().min(1),
  subject: z.string().min(1),
  detail: z.string().default(""),
});
export type GrowthAuditEntry = z.infer<typeof auditEntrySchema>;

export const recommendationStateSchema = z.object({
  status: z.enum(RECOMMENDATION_STATUSES),
  by: z.string().min(1),
  role: z.string().min(1),
  at: z.string().min(1),
  note: z.string().optional(),
});
export type RecommendationState = z.infer<typeof recommendationStateSchema>;

/**
 * The administrator-managed state. Business FACTS stay in the business input;
 * this holds DECISIONS about the recommendations, the tool switches and the
 * form-protection policy, plus an append-only audit trail.
 */
export const growthConfigurationSchema = z.object({
  version: z.literal(1).default(1),
  recommendations: z.record(z.string(), recommendationStateSchema).default({}),
  guestTools: z.record(z.enum(GUEST_TOOL_IDS), guestToolConfigurationSchema).default({}),
  spamProtection: spamProtectionPolicySchema.default({}),
  audit: z.array(auditEntrySchema).default([]),
});
export type GrowthConfiguration = z.infer<typeof growthConfigurationSchema>;
export type GrowthConfigurationDraft = z.input<typeof growthConfigurationSchema>;

export function parseGrowthConfiguration(value: unknown): GrowthConfiguration {
  return growthConfigurationSchema.parse(value ?? {});
}

// ------------------------------------------------------------------ lifecycle

export type RecommendationVerb = "accept" | "dismiss" | "mark_implemented" | "reopen";

/** Legal transitions. Anything else is refused with the reason. */
const TRANSITIONS: Readonly<Record<RecommendationVerb, { from: readonly RecommendationStatus[]; to: RecommendationStatus }>> = {
  accept: { from: ["recommended"], to: "pending" },
  dismiss: { from: ["recommended", "pending"], to: "dismissed" },
  mark_implemented: { from: ["recommended", "pending"], to: "implemented" },
  reopen: { from: ["dismissed", "implemented"], to: "recommended" },
};

export function availableVerbs(status: RecommendationStatus): RecommendationVerb[] {
  return (Object.keys(TRANSITIONS) as RecommendationVerb[]).filter((v) => TRANSITIONS[v].from.includes(status));
}

export type GrowthAction =
  | { type: "recommendation"; id: string; verb: RecommendationVerb; note?: string }
  | { type: "guest_tool"; toolId: GuestToolId; enabled?: boolean; placement?: GuestToolConfiguration["placement"]; ctaLabel?: string }
  | { type: "spam_protection"; policy: unknown };

export interface GrowthActionResult {
  applied: boolean;
  reason: string;
  configuration: GrowthConfiguration;
}

/**
 * Apply one administrator action. Pure: returns a NEW configuration, never
 * mutates. Refuses — with the reason — an unauthorised actor, an unknown
 * recommendation, an illegal transition, a dismissal without a reason, and a
 * protection policy that would leave a public form without server-side checks.
 *
 * `known` is the current report's recommendations (id → area, status), so an
 * action can only target something the engine actually recommended.
 */
export function applyGrowthAction(
  configuration: GrowthConfiguration,
  actor: GrowthActor,
  action: GrowthAction,
  known: ReadonlyMap<string, { area: RecommendationArea; status: RecommendationStatus }>,
  now: Date = new Date(),
): GrowthActionResult {
  const refuse = (reason: string): GrowthActionResult => ({ applied: false, reason, configuration });
  const at = now.toISOString();
  const audit = (subject: string, act: string, detail: string): GrowthAuditEntry => ({ at, actor: actor.id, role: actor.role, action: act, subject, detail });

  if (action.type === "recommendation") {
    const rec = known.get(action.id);
    if (!rec) return refuse(`no current recommendation has id "${action.id}"`);
    const auth = authorize(actor, permissionForArea(rec.area));
    if (!auth.allowed) return refuse(auth.reason);
    const t = TRANSITIONS[action.verb];
    if (!t.from.includes(rec.status)) {
      return refuse(`cannot ${action.verb} a recommendation that is ${rec.status} (allowed from: ${t.from.join(", ")})`);
    }
    const note = action.note?.trim();
    if (action.verb === "dismiss" && !note) return refuse("a dismissal needs a reason, so it is never re-litigated without new evidence");
    const state: RecommendationState = { status: t.to, by: actor.id, role: actor.role, at, ...(note ? { note } : {}) };
    return {
      applied: true,
      reason: `${action.id}: ${rec.status} → ${t.to}`,
      configuration: {
        ...configuration,
        recommendations: { ...configuration.recommendations, [action.id]: state },
        audit: [...configuration.audit, audit(action.id, action.verb, note ?? "")],
      },
    };
  }

  if (action.type === "guest_tool") {
    const auth = authorize(actor, "guest_tools.configure");
    if (!auth.allowed) return refuse(auth.reason);
    const current = configuration.guestTools[action.toolId] ?? guestToolConfigurationSchema.parse({});
    const parsed = guestToolConfigurationSchema.safeParse({
      ...current,
      ...(action.enabled !== undefined ? { enabled: action.enabled } : {}),
      ...(action.placement !== undefined ? { placement: action.placement } : {}),
      ...(action.ctaLabel !== undefined ? { ctaLabel: action.ctaLabel } : {}),
    });
    if (!parsed.success) return refuse(`invalid guest tool configuration: ${parsed.error.issues.map((i) => i.message).join("; ")}`);
    return {
      applied: true,
      reason: `${action.toolId}: ${parsed.data.enabled ? "enabled" : "disabled"} (${parsed.data.placement})`,
      configuration: {
        ...configuration,
        guestTools: { ...configuration.guestTools, [action.toolId]: parsed.data },
        audit: [...configuration.audit, audit(`guest_tool:${action.toolId}`, "configure", JSON.stringify(parsed.data))],
      },
    };
  }

  // spam_protection
  const auth = authorize(actor, "spam_protection.configure");
  if (!auth.allowed) return refuse(auth.reason);
  const parsed = spamProtectionPolicySchema.safeParse(action.policy);
  if (!parsed.success) return refuse(`invalid spam protection policy: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  const assessment = assessSpamPolicy(parsed.data);
  if (assessment.violations.length > 0) {
    return refuse(`the policy would leave public forms without required server-side checks: ${assessment.violations.join("; ")}`);
  }
  return {
    applied: true,
    reason: "spam protection policy updated",
    configuration: {
      ...configuration,
      spamProtection: parsed.data,
      audit: [...configuration.audit, audit("spam_protection", "configure", describePolicyChange(configuration.spamProtection, parsed.data))],
    },
  };
}

function describePolicyChange(before: SpamProtectionPolicy, after: SpamProtectionPolicy): string {
  const changed: string[] = [];
  for (const key of Object.keys(after) as Array<keyof SpamProtectionPolicy>) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) changed.push(String(key));
  }
  return changed.length > 0 ? `changed: ${changed.join(", ")}` : "no effective change";
}

/**
 * Resolve a recommendation's status from detection and stored state. Detection
 * wins for `implemented`; a stored dismissal wins over a default recommendation.
 */
export function resolveStatus(
  id: string,
  detectedImplemented: { implemented: boolean; note: string | null },
  configuration: GrowthConfiguration | undefined,
): Pick<Recommendation, "status" | "statusBasis" | "statusNote"> {
  if (detectedImplemented.implemented) {
    return { status: "implemented", statusBasis: "detected", statusNote: detectedImplemented.note };
  }
  const stored = configuration?.recommendations[id];
  if (stored) {
    // A stored "implemented" that detection cannot confirm is kept, but says so.
    const note = stored.status === "implemented" && detectedImplemented.note !== null
      ? `marked implemented by ${stored.by}; not yet detected: ${detectedImplemented.note}`
      : stored.note ?? `${stored.status} by ${stored.by} (${stored.role}) on ${stored.at.slice(0, 10)}`;
    return { status: stored.status, statusBasis: "admin_action", statusNote: note };
  }
  return { status: "recommended", statusBasis: "default", statusNote: null };
}
