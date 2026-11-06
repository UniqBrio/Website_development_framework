/**
 * GUEST ENGAGEMENT TOOLS — free tools and resources a visitor can use WITHOUT
 * registering, recommended for the specific academy.
 *
 * Reuse, not duplication. Each tool is DELIVERED by a mechanism the framework
 * already has, and its readiness is read from that mechanism:
 *
 *   free trial class        the booking form contract (a REQUEST; the academy confirms)
 *   skill assessment        the engagement decision's `assessment` category
 *                           (governed decision rules; never invented scoring)
 *   skill calculator        the engagement decision's `calculator` category
 *                           (verified formulas only; recommended only where a
 *                           discipline has a real formula)
 *   resources, guides,      static content pages and files — no JavaScript
 *   practice materials
 *   sample lessons          a verified video asset
 *   events & workshops      the enquiry/sign-up form contract, protected as
 *                           `event_registration`
 *
 * The engagement decision's hard gates are NOT re-run here and NOT overridden:
 * when it rejected the mapped category, the tool is `blocked` with that reason.
 * Enabling a tool records the administrator's intent; it reaches the page only
 * through its delivery mechanism, once that mechanism can honestly deliver it.
 */
import type { BusinessInput } from "../design-intelligence/types/business-input.js";
import type { EngagementOpportunityDecision } from "../engagement/types.js";
import type { EngagementCategoryId } from "../engagement/vocabulary.js";
import type { PageSpec } from "../generation/page-spec.js";
import type { AcademyContext, AcademyDiscipline } from "./academy.js";
import { audienceLabels, fill } from "./text.js";
import {
  clampScore,
  guestToolConfigurationSchema,
  priorityFrom,
  resolveStatus,
  type GrowthConfiguration,
  type GuestToolBrief,
  type Recommendation,
} from "./recommendations.js";
import type { GuestToolId, Priority } from "./vocabulary.js";

export interface GuestToolContext {
  academy: AcademyContext;
  input: BusinessInput;
  engagement: EngagementOpportunityDecision | null;
  pages: readonly PageSpec[];
  formEndpoints: Readonly<Partial<Record<string, string>>>;
  configuration?: GrowthConfiguration | undefined;
}

export interface NotRecommendedTool {
  toolId: GuestToolId;
  reason: string;
}

interface ToolAssessment {
  readiness: GuestToolBrief["readiness"];
  blockers: string[];
  implemented: { implemented: boolean; note: string | null };
  engagementVerdict: string | null;
}

interface ToolDefinition {
  id: GuestToolId;
  base: number;
  /** Objectives and goals that raise priority, with the points they add. */
  boosts: Partial<Record<string, number>>;
  title: (d: AcademyDiscipline, ctx: AcademyContext) => string;
  why: (d: AcademyDiscipline, ctx: AcademyContext) => string;
  audience: "parents" | "adult_beginners" | "students" | "all";
  deliveredBy: string;
  registration: GuestToolBrief["registration"];
  impact: GuestToolBrief["impact"];
  benefits: (d: AcademyDiscipline, ctx: AcademyContext) => GuestToolBrief["benefits"];
  keywords: (d: AcademyDiscipline, ctx: AcademyContext) => { primary: string; secondary: string[] };
  /** Null = recommend; a string = do not recommend, with this reason. */
  applicable: (d: AcademyDiscipline, ctx: AcademyContext) => string | null;
  assess: (d: AcademyDiscipline, ctx: GuestToolContext) => ToolAssessment;
}

function engagementVerdict(decision: EngagementOpportunityDecision | null, category: EngagementCategoryId): { verdict: string | null; selected: boolean; rejected: string | null } {
  if (!decision) return { verdict: null, selected: false, rejected: null };
  const e = decision.evaluations.find((x) => x.category === category);
  if (!e) return { verdict: null, selected: false, rejected: null };
  const selected = e.outcome === "selected_primary" || e.outcome === "selected_secondary";
  const rejected = e.outcome === "rejected" ? e.reason : null;
  return { verdict: `engagement decision: ${e.outcome.replace(/_/g, " ")} — ${e.reason}`, selected, rejected };
}

const hasSection = (pages: readonly PageSpec[], section: string) => pages.filter((p) => p.requiredSections.includes(section)).map((p) => p.route);
const verified = (status: string | undefined) => status === "verified_available";
const near = (ctx: AcademyContext) => (ctx.city ? ` in ${ctx.city}` : "");

const TOOLS: readonly ToolDefinition[] = [
  {
    id: "free_trial_class",
    base: 60,
    boosts: { drive_footfall: 20, increase_footfall: 15, book_appointments: 15, generate_leads: 10, increase_registrations: 10 },
    title: (d) => `Free ${d.name} trial class booking`,
    why: (d, ctx) =>
      `A free trial is the lowest-risk first step for ${ctx.ageGroups.some((a) => a === "children" || a === "toddlers") ? "a parent deciding on classes for their child" : `a prospective ${d.family.learner}`}: it turns an anonymous visit into a scheduled visit to the academy${near(ctx)}.`,
    audience: "all",
    deliveredBy: "the booking form contract, labelled as a trial-class REQUEST that the academy confirms (no scheduling integration is assumed)",
    registration: "contact_details_to_book",
    impact: { engagement: "medium", leadGeneration: "high", footfall: "high" },
    benefits: (d, ctx) => ({
      engagement: `gives visitors comparing ${d.name} options a concrete, free next step instead of a phone call`,
      leadGeneration: "every request is a named, contactable lead with a preferred date",
      footfall: `each confirmed request is a physical visit to the academy${near(ctx)}`,
    }),
    keywords: (d, ctx) => ({ primary: `free ${d.name.toLowerCase()} trial class${ctx.city ? ` ${ctx.city.toLowerCase()}` : ""}`, secondary: [`${d.name.toLowerCase()} demo class`, `${d.name.toLowerCase()} trial session`] }),
    applicable: () => null,
    assess: (_d, gc) => {
      const routes = hasSection(gc.pages, "booking");
      const configured = typeof gc.formEndpoints["booking"] === "string";
      const offered = gc.academy.freeTrialOffered;
      const blockers: string[] = [];
      if (offered === false) blockers.push("the academy states it does not offer a free trial");
      else if (offered === null) blockers.push("confirm the academy really offers a free trial (academy.freeTrialOffered); an unconfirmed offer is never promoted");
      if (routes.length === 0) blockers.push("no page carries a booking section; add the book_appointments objective or a conversion page");
      if (!configured) blockers.push("no booking endpoint is configured in the host");
      const v = engagementVerdict(gc.engagement, "booking_flow");
      return {
        readiness: offered === false ? "blocked" : offered === null ? "needs_owner_confirmation" : blockers.length > 0 ? "needs_data" : "ready",
        blockers,
        implemented: offered === true && routes.length > 0 && configured
          ? { implemented: true, note: `booking form live on ${routes.join(", ")}` }
          : { implemented: false, note: null },
        engagementVerdict: v.verdict,
      };
    },
  },
  {
    id: "skill_assessment",
    base: 50,
    boosts: { generate_leads: 15, increase_enquiries: 10, educate: 5 },
    title: (d) => `${d.name} skill self-assessment for new ${d.family.learners}`,
    why: (d) =>
      `Visitors often do not know which ${d.name} level or batch fits them. A short self-assessment covering ${d.family.assessmentDimensions.slice(0, 3).join(", ")} answers that question, and its result points to the right course.`,
    audience: "all",
    deliveredBy: "the engagement decision's `assessment` category: a governed decision flow rendered as progressive enhancement with a static equivalent",
    registration: "none",
    impact: { engagement: "high", leadGeneration: "medium", footfall: "low" },
    benefits: (d) => ({
      engagement: `an interactive, free answer to "where do I start with ${d.name}?"`,
      leadGeneration: "the result leads to a level-appropriate course or trial request, with no contact details required to see it",
      footfall: "indirect: a visitor who knows their level is more likely to book a visit",
    }),
    keywords: (d) => ({ primary: `${d.name.toLowerCase()} level test`, secondary: [`${d.name.toLowerCase()} skill assessment`, `which ${d.name.toLowerCase()} class is right for me`] }),
    applicable: () => null,
    assess: (_d, gc) => {
      const v = engagementVerdict(gc.engagement, "assessment");
      const rules = verified(gc.input.availableContent.decisionRules);
      const blockers: string[] = [];
      if (v.rejected) blockers.push(`the engagement decision rejected an assessment: ${v.rejected}`);
      if (!rules) blockers.push("verified decision rules (which answers lead to which level) are needed; the framework never invents scoring");
      return {
        readiness: v.rejected ? "blocked" : rules ? "ready" : "needs_data",
        blockers,
        implemented: v.selected ? { implemented: true, note: "selected and delivered by the engagement decision" } : { implemented: false, note: null },
        engagementVerdict: v.verdict,
      };
    },
  },
  {
    id: "downloadable_resources",
    base: 45,
    boosts: { grow_organic_traffic: 15, educate: 10, publish_content: 10, build_community: 5 },
    title: (d) => `Free downloadable ${d.name} resources (course guide, reference sheets, checklists)`,
    why: (d) => `Free, ungated ${d.name} resources earn search visits and repeat visits, and show the academy's teaching method before a visitor commits.`,
    audience: "all",
    deliveredBy: "static content pages with ungated downloadable files (no JavaScript, no form)",
    registration: "none",
    impact: { engagement: "medium", leadGeneration: "medium", footfall: "low" },
    benefits: (d) => ({
      engagement: `useful between visits, so visitors come back`,
      leadGeneration: `each resource links to the relevant ${d.name} course and the trial request`,
      footfall: "indirect, through the course and trial links",
    }),
    keywords: (d) => ({ primary: `free ${d.name.toLowerCase()} resources`, secondary: [`${d.name.toLowerCase()} pdf`, `${d.name.toLowerCase()} printable`] }),
    applicable: () => null,
    assess: (_d, gc) => {
      const have = gc.academy.existingResources.filter((r) => ["course_guide", "reference_sheet", "checklist", "schedule_template"].includes(r.kind));
      return {
        readiness: "ready",
        blockers: [],
        implemented: have.length > 0 ? { implemented: true, note: `already published: ${have.map((r) => r.title).join("; ")}` } : { implemented: false, note: null },
        engagementVerdict: null,
      };
    },
  },
  {
    id: "beginner_guide",
    base: 50,
    boosts: { grow_organic_traffic: 15, educate: 15, publish_content: 10, generate_leads: 5 },
    title: (d) => `The complete beginner's guide to ${d.name}`,
    why: (d) => `Most first searches are "how do I start ${d.name}?". A beginner guide answers them on the academy's own site and hands the reader to a trial class.`,
    audience: "all",
    deliveredBy: "an indexable content page (server-rendered; the SEO artifact set applies)",
    registration: "none",
    impact: { engagement: "medium", leadGeneration: "medium", footfall: "low" },
    benefits: (d) => ({
      engagement: `a reason for a first-time visitor to stay and read`,
      leadGeneration: `ends with a clear next step: a ${d.name} trial or enquiry`,
      footfall: "indirect, through the trial request",
    }),
    keywords: (d) => ({ primary: `${d.name.toLowerCase()} for beginners`, secondary: [`how to learn ${d.name.toLowerCase()}`, `${d.name.toLowerCase()} beginner guide`] }),
    applicable: () => null,
    assess: (_d, gc) => {
      const res = gc.academy.existingResources.find((r) => r.kind === "beginner_guide");
      const blog = gc.academy.existingBlogs.find((b) => /beginner|getting started|first (class|lesson|session)/i.test(b.title));
      const found = res?.title ?? blog?.title ?? null;
      return { readiness: "ready", blockers: [], implemented: found ? { implemented: true, note: `already published: ${found}` } : { implemented: false, note: null }, engagementVerdict: null };
    },
  },
  {
    id: "practice_materials",
    base: 40,
    boosts: { build_community: 10, educate: 10, grow_organic_traffic: 5 },
    title: (d, ctx) => `Free ${fill(d.family.practiceMaterial, ctx, d)}`,
    why: (d) => `Practice material is used every week, so it brings ${d.family.learners} — and the parents who print it — back to the site between classes.`,
    audience: "students",
    deliveredBy: "a static resource page with a printable file",
    registration: "none",
    impact: { engagement: "high", leadGeneration: "low", footfall: "low" },
    benefits: () => ({
      engagement: "repeat visits from current and prospective learners",
      leadGeneration: "low on its own; it supports retention and word of mouth",
      footfall: "low",
    }),
    keywords: (d) => ({ primary: `${d.name.toLowerCase()} practice at home`, secondary: [`${d.name.toLowerCase()} exercises`, `${d.name.toLowerCase()} practice sheet`] }),
    applicable: () => null,
    assess: (_d, gc) => {
      const have = gc.academy.existingResources.find((r) => r.kind === "practice_material");
      return { readiness: "ready", blockers: [], implemented: have ? { implemented: true, note: `already published: ${have.title}` } : { implemented: false, note: null }, engagementVerdict: null };
    },
  },
  {
    id: "skill_calculator",
    base: 35,
    boosts: { educate: 10, generate_leads: 5 },
    title: (d, ctx) => sentenceCase(fill(d.family.calculator?.title ?? "", ctx, d)),
    why: (d, ctx) =>
      `${sentenceCase(fill(d.family.calculator?.title ?? "", ctx, d))} gives ${d.family.learners} ${d.family.calculator?.output ?? "a result"} from their own numbers (${(d.family.calculator?.inputs ?? []).join(", ")}).`,
    audience: "all",
    deliveredBy: "the engagement decision's `calculator` category: a governed, verified formula with a static worked example",
    registration: "none",
    impact: { engagement: "medium", leadGeneration: "low", footfall: "low" },
    benefits: () => ({
      engagement: "a practical, repeat-use tool",
      leadGeneration: "low to medium: the result can suggest a suitable course",
      footfall: "low",
    }),
    keywords: (d, ctx) => ({ primary: fill(d.family.calculator?.title ?? "", ctx, d, "keyword"), secondary: [] }),
    applicable: (d) =>
      d.family.calculator ? null : `no explainable ${d.name} formula exists in the library; a calculator would be invented maths, so none is recommended`,
    assess: (_d, gc) => {
      const v = engagementVerdict(gc.engagement, "calculator");
      const formulas = verified(gc.input.availableContent.formulas);
      const blockers: string[] = [];
      if (v.rejected) blockers.push(`the engagement decision rejected a calculator: ${v.rejected}`);
      if (!formulas) blockers.push("a verified formula (and who maintains it) is needed before any output is shown");
      return {
        readiness: v.rejected ? "blocked" : formulas ? "ready" : "needs_data",
        blockers,
        implemented: v.selected ? { implemented: true, note: "selected and delivered by the engagement decision" } : { implemented: false, note: null },
        engagementVerdict: v.verdict,
      };
    },
  },
  {
    id: "sample_lessons",
    base: 45,
    boosts: { build_credibility: 10, showcase_work: 10, generate_leads: 5, increase_registrations: 5 },
    title: (d, ctx) => `Free sample lesson: ${stripArticle(fill(d.family.sampleLesson, ctx, d))}`,
    why: (d) => `Seeing a real ${d.name} lesson removes the biggest uncertainty before a first visit — what teaching here is actually like.`,
    audience: "all",
    deliveredBy: "a verified video asset embedded on a content page, with a transcript and a poster image",
    registration: "none",
    impact: { engagement: "high", leadGeneration: "medium", footfall: "medium" },
    benefits: (d) => ({
      engagement: "watch time on the academy's own site, not a third-party feed",
      leadGeneration: `ends with the ${d.name} trial request`,
      footfall: "builds the confidence that precedes a first visit",
    }),
    keywords: (d) => ({ primary: `${d.name.toLowerCase()} lesson video`, secondary: [`${d.name.toLowerCase()} class demo`, `${d.name.toLowerCase()} online sample class`] }),
    applicable: () => null,
    assess: (_d, gc) => {
      const video = verified(gc.input.availableAssets.video);
      const have = gc.academy.existingResources.find((r) => r.kind === "video_lesson");
      return {
        readiness: video ? "ready" : "needs_data",
        blockers: video ? [] : ["a verified recording of a real lesson (availableAssets.video) is needed; stock footage would misrepresent the academy"],
        implemented: have ? { implemented: true, note: `already published: ${have.title}` } : { implemented: false, note: null },
        engagementVerdict: null,
      };
    },
  },
  {
    id: "events_workshops",
    base: 45,
    boosts: { drive_footfall: 20, increase_footfall: 15, build_community: 15, generate_leads: 5 },
    title: (d, ctx) => `Free ${stripArticle(fill(d.family.eventFormat, ctx, d))}`,
    why: (d, ctx) => `An open ${d.name} event brings families${near(ctx)} into the academy with no commitment, which is where most enrolment decisions are made.`,
    audience: "all",
    deliveredBy: "an event page with the enquiry or sign-up form contract, protected as `event_registration`",
    registration: "contact_details_to_book",
    impact: { engagement: "medium", leadGeneration: "high", footfall: "high" },
    benefits: (d, ctx) => ({
      engagement: "a dated reason to return to the site and share it",
      leadGeneration: "every registration is a named, contactable lead",
      footfall: `people physically attend the academy${near(ctx)}`,
    }),
    keywords: (d, ctx) => ({ primary: `${d.name.toLowerCase()} workshop${ctx.city ? ` ${ctx.city.toLowerCase()}` : ""}`, secondary: [`free ${d.name.toLowerCase()} event`, `${d.name.toLowerCase()} summer camp`] }),
    applicable: () => null,
    assess: (_d, gc) => {
      const hosts = gc.academy.hostsEvents;
      const formRoutes = [...hasSection(gc.pages, "enquiry"), ...hasSection(gc.pages, "signup")];
      const blockers: string[] = [];
      if (hosts === false) blockers.push("the academy states it does not run events");
      else if (hosts === null) blockers.push("confirm the academy runs events or workshops (academy.hostsEvents)");
      if (formRoutes.length === 0) blockers.push("no enquiry or sign-up form exists to register attendees");
      return {
        readiness: hosts === false ? "blocked" : hosts === null ? "needs_owner_confirmation" : blockers.length > 0 ? "needs_data" : "ready",
        blockers,
        implemented: { implemented: false, note: null },
        engagementVerdict: null,
      };
    },
  },
];

function stripArticle(text: string): string {
  return text.replace(/^(a|an|the)\s+/i, "");
}

function sentenceCase(text: string): string {
  return text.length === 0 ? text : `${text[0]!.toUpperCase()}${text.slice(1)}`;
}

const READINESS_PENALTY: Record<GuestToolBrief["readiness"], number> = { ready: 0, needs_owner_confirmation: -5, needs_data: -10, blocked: -30 };
const IMPACT_POINTS: Record<Priority, number> = { high: 6, medium: 3, low: 0 };

export function recommendGuestTools(gc: GuestToolContext): { recommendations: Recommendation[]; notRecommended: NotRecommendedTool[] } {
  const d = gc.academy.primaryDiscipline;
  if (!gc.academy.contextual || !d) return { recommendations: [], notRecommended: [] };
  const recommendations: Recommendation[] = [];
  const notRecommended: NotRecommendedTool[] = [];
  const drivers = new Set<string>([...gc.academy.objectives, ...gc.academy.goals]);

  for (const tool of TOOLS) {
    const skip = tool.applicable(d, gc.academy);
    if (skip) {
      notRecommended.push({ toolId: tool.id, reason: skip });
      continue;
    }
    const a = tool.assess(d, gc);
    const factors: string[] = [`base ${tool.base} (${tool.id.replace(/_/g, " ")})`];
    let score = tool.base;
    for (const [driver, points] of Object.entries(tool.boosts)) {
      if (drivers.has(driver) && points) {
        score += points;
        factors.push(`+${points} serves "${driver}"`);
      }
    }
    const impact = IMPACT_POINTS[tool.impact.leadGeneration] + IMPACT_POINTS[tool.impact.footfall];
    if (impact > 0) {
      score += impact;
      factors.push(`+${impact} lead/footfall impact`);
    }
    if (READINESS_PENALTY[a.readiness] !== 0) {
      score += READINESS_PENALTY[a.readiness];
      factors.push(`${READINESS_PENALTY[a.readiness]} readiness: ${a.readiness.replace(/_/g, " ")}`);
    }
    const configuration = guestToolConfigurationSchema.parse(gc.configuration?.guestTools[tool.id] ?? {});
    const blockers = [...a.blockers];
    if (configuration.enabled && a.readiness !== "ready") {
      blockers.unshift(`enabled by an administrator, but it cannot go live until: ${a.blockers.join("; ") || a.readiness}`);
    }
    const id = `guest_engagement:${tool.id}`;
    const kw = tool.keywords(d, gc.academy);
    const benefits = tool.benefits(d, gc.academy);
    const finalScore = clampScore(score);
    const status = resolveStatus(id, a.implemented, gc.configuration);
    recommendations.push({
      id,
      area: "guest_engagement",
      title: tool.title(d, gc.academy),
      why: tool.why(d, gc.academy),
      targetAudience: audienceLabels(gc.academy, tool.audience),
      seoOpportunity: tool.registration === "none" ? `an ungated tool page can rank for "${kw.primary}"` : null,
      keywords: { primary: kw.primary || null, secondary: kw.secondary, basis: "derived_from_academy_facts", searchVolume: "not_measured" },
      businessBenefit: `Engagement: ${benefits.engagement}. Lead generation: ${benefits.leadGeneration}. Footfall: ${benefits.footfall}.`,
      priority: priorityFrom(finalScore),
      priorityScore: finalScore,
      priorityFactors: factors,
      ...status,
      // An enabled-but-unready tool is Pending, not merely Recommended.
      ...(status.statusBasis === "default" && configuration.enabled ? { status: "pending" as const, statusBasis: "admin_action" as const, statusNote: "enabled; waiting on readiness" } : {}),
      evidence: [
        `discipline: ${d.name} (${d.basis}, ${d.family.label})`,
        `category: ${gc.academy.category} (${gc.academy.categoryBasis})`,
        ...[...drivers].filter((x) => tool.boosts[x]).map((x) => `objective/goal: ${x}`),
      ],
      detail: {
        kind: "guest_tool",
        toolId: tool.id,
        deliveredBy: tool.deliveredBy,
        readiness: a.readiness,
        blockers,
        registration: tool.registration,
        benefits,
        impact: tool.impact,
        configuration,
        engagementVerdict: a.engagementVerdict,
      },
    });
  }
  return { recommendations, notRecommended };
}
