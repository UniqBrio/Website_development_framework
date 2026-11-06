/**
 * GROWTH & PROTECTION REPORT — the one output of the growth module.
 *
 * Answers the five questions of the brief, each as a prioritised list of open
 * recommendation ids:
 *   1. which free guest engagement tools should be added?
 *   2. which downloadable resources would benefit visitors?
 *   3. which specific blogs should be published?
 *   4. which SEO improvements are missing?
 *   5. which website forms require enhanced spam protection?
 *
 * It decides nothing the rest of the framework owns: it READS the engagement
 * decision, the page model and the SEO artifact plan, and the generator enforces
 * form protection independently of whether anyone reads this report.
 */
import type { BusinessInput } from "../design-intelligence/types/business-input.js";
import type { EngagementOpportunityDecision } from "../engagement/types.js";
import type { PageSpec } from "../generation/page-spec.js";
import type { SeoArtifactPlan } from "../seo/artifacts.js";
import { deriveAcademyContext, type AcademyContext } from "./academy.js";
import { recommendGuestTools, type NotRecommendedTool } from "./guest-tools.js";
import { recommendSeoContent } from "./seo-recommendations.js";
import { formInventory, recommendFormProtection, type ProtectedFormEntry } from "./spam/recommend.js";
import { assessSpamPolicy, type SpamPolicyAssessment, type SpamProtectionPolicy } from "./spam/policy.js";
import { parseGrowthConfiguration, type GrowthConfiguration, type Recommendation } from "./recommendations.js";
import {
  PRIORITIES,
  RECOMMENDATION_AREAS,
  RECOMMENDATION_STATUSES,
  type Priority,
  type RecommendationArea,
  type RecommendationStatus,
} from "./vocabulary.js";

export interface GrowthReportInput {
  input: BusinessInput;
  pages: readonly PageSpec[];
  seoArtifacts?: SeoArtifactPlan | null;
  engagement?: EngagementOpportunityDecision | null;
  /** Administrator state (GrowthConfiguration). Absent = nothing configured yet. */
  configuration?: unknown;
  /** Host form endpoints, by form id. Absent = unconfigured. */
  formEndpoints?: Readonly<Partial<Record<string, string>>>;
}

export interface GrowthReport {
  academy: AcademyContext;
  /** False when the academy category is unknown: no recommendations, only `missingFacts`. */
  contextual: boolean;
  missingFacts: string[];
  guestTools: Recommendation[];
  notRecommendedTools: NotRecommendedTool[];
  resources: Recommendation[];
  blogs: Recommendation[];
  seoImprovements: Recommendation[];
  formProtection: Recommendation[];
  /** Every recommendation, highest priority first. */
  recommendations: Recommendation[];
  /** The five questions, as ids of OPEN (recommended or pending) recommendations. */
  answers: {
    guestTools: string[];
    resources: string[];
    blogs: string[];
    seoImprovements: string[];
    formsNeedingProtection: string[];
  };
  summary: {
    total: number;
    byArea: Record<RecommendationArea, number>;
    byStatus: Record<RecommendationStatus, number>;
    byPriority: Record<Priority, number>;
  };
  spamProtection: {
    policy: SpamProtectionPolicy;
    assessment: SpamPolicyAssessment;
    forms: ProtectedFormEntry[];
  };
  configuration: GrowthConfiguration;
}

const open = (r: Recommendation) => r.status === "recommended" || r.status === "pending";
const byScore = (a: Recommendation, b: Recommendation) => b.priorityScore - a.priorityScore || a.id.localeCompare(b.id);

function countBy<K extends string>(keys: readonly K[], items: readonly Recommendation[], pick: (r: Recommendation) => K): Record<K, number> {
  const out = Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
  for (const r of items) out[pick(r)] += 1;
  return out;
}

export function buildGrowthReport(args: GrowthReportInput): GrowthReport {
  const configuration = parseGrowthConfiguration(args.configuration);
  const academy = deriveAcademyContext(args.input);
  const formEndpoints = args.formEndpoints ?? {};

  const tools = recommendGuestTools({
    academy,
    input: args.input,
    engagement: args.engagement ?? null,
    pages: args.pages,
    formEndpoints,
    configuration,
  });
  const seo = recommendSeoContent({
    academy,
    input: args.input,
    pages: args.pages,
    seoArtifacts: args.seoArtifacts ?? null,
    configuration,
  });
  // Form protection does not depend on the academy category: every site with a
  // public form needs it, so it is recommended even when nothing else can be.
  const forms = formInventory(args.input, args.pages, formEndpoints, configuration);
  const formProtection = recommendFormProtection(forms, configuration.spamProtection, configuration);

  const guestTools = [...tools.recommendations].sort(byScore);
  const all = [...guestTools, ...seo.resources, ...seo.blogs, ...seo.improvements, ...formProtection].sort(byScore);
  const ids = (list: readonly Recommendation[]) => list.filter(open).sort(byScore).map((r) => r.id);

  return {
    academy,
    contextual: academy.contextual,
    missingFacts: academy.missingFacts,
    guestTools,
    notRecommendedTools: tools.notRecommended,
    resources: seo.resources,
    blogs: seo.blogs,
    seoImprovements: seo.improvements,
    formProtection,
    recommendations: all,
    answers: {
      guestTools: ids(guestTools),
      resources: ids(seo.resources),
      blogs: ids(seo.blogs),
      seoImprovements: ids(seo.improvements),
      formsNeedingProtection: formProtection
        .filter((r) => open(r) && r.detail.kind === "form_protection" && r.detail.formId !== "all")
        .map((r) => r.id),
    },
    summary: {
      total: all.length,
      byArea: countBy(RECOMMENDATION_AREAS, all, (r) => r.area),
      byStatus: countBy(RECOMMENDATION_STATUSES, all, (r) => r.status),
      byPriority: countBy(PRIORITIES, all, (r) => r.priority),
    },
    spamProtection: { policy: configuration.spamProtection, assessment: assessSpamPolicy(configuration.spamProtection), forms },
    configuration,
  };
}

/** What `applyGrowthAction` may target: the report's recommendations, with their current status. */
export function knownRecommendations(report: GrowthReport): Map<string, { area: RecommendationArea; status: RecommendationStatus }> {
  return new Map(report.recommendations.map((r) => [r.id, { area: r.area, status: r.status }]));
}
