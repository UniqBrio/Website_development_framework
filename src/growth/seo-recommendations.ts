/**
 * SEO CONTENT & RESOURCE RECOMMENDATIONS — resources to add, blogs to publish,
 * and site improvements, for ONE academy.
 *
 * Contextual by construction: every title, keyword and URL is a library template
 * filled from the academy's disciplines, audience and city (topic-library.ts),
 * every recommendation is checked against what the site already publishes, and a
 * local-intent topic is only recommended when the city is known. With no academy
 * category there are no recommendations at all — the report asks for the fact.
 *
 * Honesty boundaries (README rules 1 and 10):
 *  - keywords are DERIVED from the academy's facts; search volume and difficulty
 *    are recorded as not measured, and the brief says to validate them;
 *  - a blog brief is a topic and a structure, never a claim about the academy;
 *  - structured data is recommended only for a type the page will really contain
 *    (FAQPage after the answers are verified, Course for a real programme).
 */
import type { BusinessInput } from "../design-intelligence/types/business-input.js";
import type { PageSpec } from "../generation/page-spec.js";
import type { SeoArtifactPlan } from "../seo/artifacts.js";
import { slugify, type AcademyContext, type AcademyDiscipline } from "./academy.js";
import { audienceLabels, fill, firstThatFits, sentence, titleCase, truncate } from "./text.js";
import type { BlogTopicTemplate, ResourceTemplate } from "./topic-library.js";
import {
  clampScore,
  priorityFrom,
  resolveStatus,
  type GrowthConfiguration,
  type Recommendation,
  type SeoImprovementBrief,
} from "./recommendations.js";

export interface SeoRecommendationContext {
  academy: AcademyContext;
  input: BusinessInput;
  pages: readonly PageSpec[];
  seoArtifacts: SeoArtifactPlan | null;
  configuration?: GrowthConfiguration | undefined;
}

/** Caps, so the console shows a prioritised plan rather than an exhaustive list. */
export const SEO_RECOMMENDATION_CAPS = { blogs: 12, resources: 6, improvements: 12 } as const;

const META_TITLE_MAX = 60;
const META_DESCRIPTION_MAX = 155;

const STOP = new Set(["a", "an", "the", "for", "to", "of", "in", "and", "your", "how", "what", "is", "it", "on", "with", "at", "near", "me", "my", "do", "you", "should", "can", "best", "every", "first"]);

function tokens(text: string): Set<string> {
  return new Set(text.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2 && !STOP.has(t)));
}

/**
 * Is a topic already covered by a published post? Covered when a post targets
 * the same primary keyword, or shares most of the topic's distinctive words.
 */
function coveredBy(primaryKeyword: string, title: string, ctx: AcademyContext): string | null {
  const want = tokens(`${primaryKeyword} ${title}`);
  for (const blog of ctx.existingBlogs) {
    if (blog.keywords.some((k) => k.trim().toLowerCase() === primaryKeyword.toLowerCase())) return blog.title;
    const have = tokens(`${blog.title} ${blog.slug.replace(/-/g, " ")} ${blog.keywords.join(" ")}`);
    const overlap = [...want].filter((t) => have.has(t)).length;
    if (want.size > 0 && overlap / want.size >= 0.6) return blog.title;
  }
  return null;
}

/** The best internal route for a link target, from the real page model. */
function routeFor(target: BlogTopicTemplate["linksTo"], pages: readonly PageSpec[]): string | null {
  const byRole = (...roles: string[]) => pages.find((p) => roles.includes(p.role))?.route ?? null;
  const bySection = (section: string) => pages.find((p) => p.requiredSections.includes(section))?.route ?? null;
  switch (target) {
    case "courses":
      return byRole("services_index", "service") ?? pages.find((p) => /course|class|program|batch/i.test(p.route))?.route ?? null;
    case "trial":
      return bySection("booking") ?? byRole("conversion", "contact") ?? bySection("enquiry");
    case "contact":
      return byRole("contact") ?? bySection("enquiry") ?? bySection("booking") ?? bySection("signup");
    case "events":
      return pages.find((p) => /event|workshop|camp/i.test(p.route))?.route ?? bySection("signup") ?? byRole("contact");
    case "resources":
      return pages.find((p) => /resource|guide|download/i.test(p.route))?.route ?? byRole("content");
  }
}

function disciplinesInScope(ctx: AcademyContext): AcademyDiscipline[] {
  const primary = ctx.primaryDiscipline;
  if (!primary) return [];
  const others = ctx.disciplines.filter((d) => d !== primary && d.family.category === ctx.category);
  return [primary, ...others.slice(0, 2)];
}

const drivers = (ctx: AcademyContext) => new Set<string>([...ctx.objectives, ...ctx.goals]);

// ------------------------------------------------------------------ blogs

function blogScore(t: BlogTopicTemplate, d: AcademyDiscipline, ctx: AcademyContext): { score: number; factors: string[] } {
  const f: string[] = [];
  const add = (n: number, why: string) => {
    f.push(`${n >= 0 ? "+" : ""}${n} ${why}`);
    return n;
  };
  const dr = drivers(ctx);
  let s = { local: 55, commercial: 50, transactional: 50, informational: 40 }[t.intent];
  f.push(`base ${s} (${t.intent} intent)`);
  if (t.stage === "decision") s += add(10, "decision-stage topic, close to enquiry");
  else if (t.stage === "consideration") s += add(5, "consideration-stage topic");
  if (t.intent === "local" && (dr.has("drive_footfall") || dr.has("increase_footfall"))) s += add(15, "local search serves the footfall objective");
  if (t.intent === "informational" && (dr.has("grow_organic_traffic") || dr.has("educate") || dr.has("publish_content"))) s += add(10, "informational topic serves organic growth");
  if (t.stage !== "awareness" && (dr.has("generate_leads") || dr.has("increase_enquiries") || dr.has("book_appointments"))) s += add(10, "supports the lead objective");
  if (t.audience === "parents" && ctx.ageGroups.some((a) => a === "children" || a === "toddlers" || a === "teens")) s += add(5, "the academy teaches children (stated)");
  if (t.audience === "adult_beginners" && ctx.ageGroups.includes("adults")) s += add(5, "the academy teaches adults (stated)");
  if (d !== ctx.primaryDiscipline) s += add(-10, "secondary discipline");
  if (t.needsCity && ctx.cityVerified) s += add(3, "verified location");
  return { score: clampScore(s), factors: f };
}

function blogRecommendations(sc: SeoRecommendationContext): Recommendation[] {
  const ctx = sc.academy;
  const out: Recommendation[] = [];
  const usedUrls = new Set<string>();
  for (const d of disciplinesInScope(ctx)) {
    for (const t of d.family.blogTopics) {
      if (t.needsCity && !ctx.city) continue;
      const title = fill(t.title, ctx, d, "title");
      const primary = fill(t.primaryKeyword, ctx, d, "keyword");
      const covered = coveredBy(primary, title, ctx);
      const secondary = t.secondaryKeywords.map((k) => fill(k, ctx, d, "keyword"));
      const audience = audienceLabels(ctx, t.audience);
      const readerValue = fill(t.readerValue, ctx, d);
      let url = `/blog/${slugify(primary)}`;
      if (usedUrls.has(url)) url = `/blog/${slugify(title)}`;
      usedUrls.add(url);
      const linkRoute = routeFor(t.linksTo, sc.pages);
      const coursesRoute = routeFor("courses", sc.pages);
      const internalLinks = [...new Set([linkRoute, coursesRoute].filter((r): r is string => r !== null))];
      const { score, factors } = blogScore(t, d, ctx);
      const id = `blog:${slugify(`${d.name}-${t.id}`)}`;
      out.push({
        id,
        area: "blog",
        title,
        why: covered
          ? `Already covered by "${covered}".`
          : `No existing post targets "${primary}". ${sentence(`It answers a ${t.intent} ${t.stage}-stage question ${audience[0] ?? "visitors"} ask before choosing ${d.name} ${ctx.category === "sports" ? "coaching" : "classes"}`)}`,
        targetAudience: audience,
        seoOpportunity: `${t.intent === "local" ? `Local search in ${ctx.city}` : `${t.intent[0]!.toUpperCase()}${t.intent.slice(1)} search`} for "${primary}" and related queries; a content gap the site does not yet answer.`,
        keywords: { primary, secondary, basis: "derived_from_academy_facts", searchVolume: "not_measured" },
        businessBenefit:
          t.stage === "decision"
            ? `Reaches visitors close to a decision and hands them to ${linkRoute ? `the ${t.linksTo} page (${linkRoute})` : `a ${t.linksTo} page the site still needs`}.`
            : `Builds organic visibility for ${d.name} topics and moves readers toward the course pages.`,
        priority: priorityFrom(score),
        priorityScore: score,
        priorityFactors: factors,
        ...resolveStatus(id, covered ? { implemented: true, note: `covered by "${covered}"` } : { implemented: false, note: null }, sc.configuration),
        evidence: [`discipline: ${d.name} (${d.basis})`, ...(t.needsCity ? [`city: ${ctx.city} (${ctx.cityVerified ? "verified" : "unverified"})`] : []), `existing posts checked: ${ctx.existingBlogs.length}`],
        detail: {
          kind: "blog",
          title,
          metaTitle: firstThatFits([`${title} | ${ctx.businessName}`, title, `${titleCase(primary)} | ${ctx.businessName}`, titleCase(primary)], META_TITLE_MAX),
          metaDescription: firstThatFits(
            [
              sentence(`${sentence(readerValue).replace(/\.$/, "")}. A guide from ${ctx.businessName}`),
              sentence(readerValue),
            ],
            META_DESCRIPTION_MAX,
          ),
          suggestedUrl: url,
          searchIntent: t.intent,
          funnelStage: t.stage,
          internalLinks,
          outline: [
            `Introduction: the question ${audience[0] ?? "readers"} are asking`,
            `${sentence(readerValue)}`.replace(/\.$/, ""),
            `Common mistakes and how to avoid them`,
            `How lessons are structured at ${ctx.businessName} (from the academy's own course details only)`,
            `FAQ: three to five short questions on "${primary}"`,
            `Next step: ${t.linksTo === "trial" ? "request a trial class" : t.linksTo === "contact" ? "contact the academy" : `see the ${t.linksTo} page`}`,
          ],
        },
      });
    }
  }
  return out.sort((a, b) => b.priorityScore - a.priorityScore || a.id.localeCompare(b.id)).slice(0, SEO_RECOMMENDATION_CAPS.blogs);
}

// ------------------------------------------------------------------ resources

const FORMAT: Record<string, string> = {
  course_guide: "an indexable web page with a printable PDF version",
  beginner_guide: "an indexable long-form guide page",
  practice_material: "a printable PDF linked from a short indexable page",
  faq: "an on-page FAQ section (FAQPage structured data once answers are verified)",
  reference_sheet: "an indexable web page with a printable version",
  checklist: "an indexable checklist page with a printable version",
  schedule_template: "a printable PDF linked from a short indexable page",
  video_lesson: "a video embedded on an indexable page with a transcript",
};

function resourceRecommendations(sc: SeoRecommendationContext): Recommendation[] {
  const ctx = sc.academy;
  const d = ctx.primaryDiscipline;
  if (!d) return [];
  const dr = drivers(ctx);
  const out: Recommendation[] = [];
  for (const r of d.family.resources as readonly ResourceTemplate[]) {
    const title = fill(r.title, ctx, d, "title");
    const existing = ctx.existingResources.find((e) => e.kind === r.kind && tokens(e.title).has(d.name.toLowerCase().split(/\s+/)[0] ?? ""))
      ?? ctx.existingResources.find((e) => e.kind === r.kind);
    const faqVerified = r.kind === "faq" && sc.input.availableContent.faq === "verified_available";
    const implemented = existing
      ? { implemented: true, note: `already published: ${existing.title}` }
      : faqVerified
        ? { implemented: true, note: "a verified FAQ is supplied and rendered on the site" }
        : { implemented: false, note: null };
    const primary = fill(r.primaryKeyword, ctx, d, "keyword");
    const f: string[] = ["base 45 (free resource)"];
    let s = 45;
    if (dr.has("grow_organic_traffic") || dr.has("educate") || dr.has("publish_content")) { s += 15; f.push("+15 serves organic growth / education"); }
    if (r.kind === "course_guide" && (dr.has("generate_leads") || dr.has("increase_registrations") || dr.has("increase_enquiries"))) { s += 15; f.push("+15 course guides precede enquiries"); }
    if (r.kind === "faq" && sc.input.availableContent.faq !== "verified_available") { s += 10; f.push("+10 no verified FAQ yet"); }
    if (r.kind === "practice_material" && dr.has("build_community")) { s += 10; f.push("+10 repeat use builds community"); }
    if (r.audience === "parents" && ctx.ageGroups.some((a) => a === "children" || a === "toddlers")) { s += 5; f.push("+5 the academy teaches children (stated)"); }
    const score = clampScore(s);
    const id = `resource:${slugify(`${d.name}-${r.id}`)}`;
    const route = r.kind === "faq" ? "/faq" : `/resources/${slugify(title)}`;
    out.push({
      id,
      area: "resource",
      title,
      why: sentence(r.why.replace(/\{discipline\}/g, d.name)),
      targetAudience: audienceLabels(ctx, r.audience),
      seoOpportunity: `Evergreen, linkable content for "${primary}"; free and ungated, so search engines and visitors can read it without registering.`,
      keywords: { primary, secondary: r.secondaryKeywords.map((k) => fill(k, ctx, d, "keyword")), basis: "derived_from_academy_facts", searchVolume: "not_measured" },
      businessBenefit: r.kind === "course_guide" || r.kind === "faq"
        ? "Answers pre-enrolment questions on the page, so enquiries arrive better informed and fewer are lost to unanswered questions."
        : "Attracts organic visits and repeat visits, each one a step closer to a trial or enquiry.",
      priority: priorityFrom(score),
      priorityScore: score,
      priorityFactors: f,
      ...resolveStatus(id, implemented, sc.configuration),
      evidence: [`discipline: ${d.name} (${d.basis})`, `existing resources checked: ${ctx.existingResources.length}`],
      detail: {
        kind: "resource",
        resourceKind: r.kind,
        title,
        format: FORMAT[r.kind] ?? "an indexable page",
        suggestedUrl: route,
        gated: false,
        internalLinks: [routeFor("courses", sc.pages), routeFor("trial", sc.pages)].filter((x): x is string => x !== null),
      },
    });
  }
  return out.sort((a, b) => b.priorityScore - a.priorityScore || a.id.localeCompare(b.id)).slice(0, SEO_RECOMMENDATION_CAPS.resources);
}

// ------------------------------------------------------------------ improvements

function improvement(
  sc: SeoRecommendationContext,
  args: {
    key: string;
    improvement: SeoImprovementBrief["improvement"];
    title: string;
    why: string;
    target: string;
    steps: string[];
    audience: string[];
    seo: string;
    keywords?: { primary: string | null; secondary: string[] };
    benefit: string;
    score: number;
    factors: string[];
    implemented?: { implemented: boolean; note: string | null };
    evidence: string[];
  },
): Recommendation {
  const id = `seo:${args.improvement}:${slugify(args.key)}`;
  const score = clampScore(args.score);
  return {
    id,
    area: "seo_improvement",
    title: args.title,
    why: args.why,
    targetAudience: args.audience,
    seoOpportunity: args.seo,
    keywords: { primary: args.keywords?.primary ?? null, secondary: args.keywords?.secondary ?? [], basis: "derived_from_academy_facts", searchVolume: "not_measured" },
    businessBenefit: args.benefit,
    priority: priorityFrom(score),
    priorityScore: score,
    priorityFactors: args.factors,
    ...resolveStatus(id, args.implemented ?? { implemented: false, note: null }, sc.configuration),
    evidence: args.evidence,
    detail: { kind: "seo_improvement", improvement: args.improvement, target: args.target, steps: args.steps },
  };
}

function improvementRecommendations(sc: SeoRecommendationContext, blogs: readonly Recommendation[]): Recommendation[] {
  const ctx = sc.academy;
  const d = ctx.primaryDiscipline;
  if (!d) return [];
  const dr = drivers(ctx);
  const content = sc.input.availableContent;
  const routes = new Set([...sc.pages.map((p) => p.route), ...ctx.existingRoutes]);
  const hasRoute = (pattern: RegExp) => [...routes].some((r) => pattern.test(r));
  const out: Recommendation[] = [];
  const allAudience = audienceLabels(ctx, "all");
  const dl = d.name.toLowerCase();
  const noun = ctx.category === "sports" ? "coaching" : "classes";

  // A. Missing or incomplete content.
  if (content.serviceDescriptions !== "verified_available" && ctx.courses.length > 0) {
    out.push(improvement(sc, {
      key: "course-descriptions",
      improvement: "missing_content",
      title: `Write verified descriptions for ${ctx.courses.length} course${ctx.courses.length === 1 ? "" : "s"}`,
      why: `Course descriptions are ${content.serviceDescriptions.replace(/_/g, " ")}, so course sections render as placeholders: search engines see thin pages and visitors cannot compare ${ctx.courses.slice(0, 3).join(", ")}.`,
      target: ctx.courses.join(", "),
      steps: ["For each course: who it is for, age/level, duration, batch timings, what a learner can do at the end", "Mark the descriptions verified in the content inventory", "Regenerate so each course section renders real text"],
      audience: allAudience,
      seo: `Unique, descriptive course text is what lets course pages rank for "${dl} ${noun}" queries at all.`,
      keywords: { primary: `${dl} ${noun}`, secondary: ctx.courses.slice(0, 4).map((c) => c.toLowerCase()) },
      benefit: "Visitors can choose a course without calling, so enquiries arrive qualified.",
      score: 80,
      factors: ["base 80: placeholder content on a conversion path"],
      evidence: [`availableContent.serviceDescriptions = ${content.serviceDescriptions}`, `courses: ${ctx.courses.length}`],
    }));
  }
  if (content.aboutText !== "verified_available") {
    out.push(improvement(sc, {
      key: "about-teachers",
      improvement: "missing_content",
      title: `Add an About page on the academy's ${ctx.category === "sports" ? "coaches" : "teachers"} and approach`,
      why: `Parents choosing a ${dl} academy look for who teaches; the about text is ${content.aboutText.replace(/_/g, " ")}.`,
      target: "/about",
      steps: [`Teacher/coach background in their own words`, "Teaching approach and batch sizes", "Only verified facts: no invented credentials, counts or awards"],
      audience: audienceLabels(ctx, "parents"),
      seo: `Supports "${dl} teacher${ctx.city ? ` ${ctx.city.toLowerCase()}` : ""}" searches and gives every other page a trust page to link to.`,
      benefit: "Builds the trust that precedes a first visit.",
      score: 60,
      factors: ["base 60: trust content missing"],
      evidence: [`availableContent.aboutText = ${content.aboutText}`],
    }));
  }

  // B. Landing pages.
  const offered = sc.input.servicesProducts.filter((o) => o.kind === "programme" || o.kind === "service");
  for (const course of offered.slice(0, 4)) {
    const slug = slugify(course.name);
    if (hasRoute(new RegExp(`/${slug}(/|$)`))) continue;
    out.push(improvement(sc, {
      key: `course-${slug}`,
      improvement: "landing_page",
      title: `Landing page for "${course.name}"`,
      why: `"${course.name}" has no page of its own, so it cannot rank or be linked to on its own terms.`,
      target: `/courses/${slug}`,
      steps: ["One course per page: who it is for, level, schedule, what is learnt", "One primary action: request a trial class or enquire", "Link it from the courses index and from related blog posts"],
      audience: allAudience,
      seo: `A dedicated page for "${course.name.toLowerCase()}" queries${ctx.city ? ` in ${ctx.city}` : ""}.`,
      keywords: { primary: `${course.name.toLowerCase()}${ctx.city ? ` ${ctx.city.toLowerCase()}` : ""}`, secondary: [`${dl} ${noun}`] },
      benefit: "Each course gets its own entry point from search and its own conversion path.",
      score: 55 + (dr.has("generate_leads") || dr.has("increase_registrations") ? 10 : 0),
      factors: ["base 55: course without a page", ...(dr.has("generate_leads") || dr.has("increase_registrations") ? ["+10 serves the lead objective"] : [])],
      evidence: [`offer: ${course.name} (${course.kind})`],
    }));
  }
  if (ctx.freeTrialOffered === true && !hasRoute(/trial|demo/)) {
    out.push(improvement(sc, {
      key: "free-trial",
      improvement: "landing_page",
      title: `Free ${d.name} trial class landing page`,
      why: "The academy offers a free trial, but no page is dedicated to it; trial-intent searches and ads have nowhere specific to land.",
      target: "/free-trial",
      steps: ["What happens in the trial, who it suits, what to bring", "The trial request form (protected against spam)", "Link from every course page and decision-stage blog"],
      audience: allAudience,
      seo: `Targets "free ${dl} trial class${ctx.city ? ` ${ctx.city.toLowerCase()}` : ""}".`,
      keywords: { primary: `free ${dl} trial class${ctx.city ? ` ${ctx.city.toLowerCase()}` : ""}`, secondary: [`${dl} demo class`] },
      benefit: "Turns trial intent directly into booked visits.",
      score: 75 + (dr.has("drive_footfall") || dr.has("increase_footfall") ? 10 : 0),
      factors: ["base 75: a real offer without a landing page", ...(dr.has("drive_footfall") || dr.has("increase_footfall") ? ["+10 serves footfall"] : [])],
      evidence: ["academy.freeTrialOffered = true"],
    }));
  }
  if (ctx.ageGroups.includes("children") && !hasRoute(/kid|child|junior/)) {
    out.push(improvement(sc, {
      key: "kids",
      improvement: "landing_page",
      title: `${d.name} ${noun} for kids: an age-specific landing page`,
      why: "The academy teaches children, and parents search with the child's age in the query; a general page answers them less directly.",
      target: `/${slugify(`${d.name} ${noun} for kids`)}`,
      steps: ["Age bands taught and what each learns", "Safety, batch size and parent communication", "Trial request as the single primary action"],
      audience: audienceLabels(ctx, "parents"),
      seo: `Targets "${dl} ${noun} for kids${ctx.city ? ` in ${ctx.city.toLowerCase()}` : ""}".`,
      keywords: { primary: `${dl} ${noun} for kids${ctx.city ? ` ${ctx.city.toLowerCase()}` : ""}`, secondary: [`${dl} for children`, `best age to start ${dl}`] },
      benefit: "Speaks directly to the parent audience the academy states it serves.",
      score: 60,
      factors: ["base 60: stated audience without a dedicated page"],
      evidence: ["academy.ageGroups includes children"],
    }));
  }

  // C. Location-specific content.
  if (ctx.city) {
    const slug = slugify(`${d.name} ${noun} ${ctx.city}`);
    out.push(improvement(sc, {
      key: `location-${slug}`,
      improvement: "location_content",
      title: `Location page: ${d.name} ${noun} in ${ctx.city}`,
      why: `Near-me and city searches are how local families find ${dl} ${noun}; no page states the academy's ${ctx.city} location, timings and directions together.`,
      target: `/${slug}`,
      steps: ["Address, map link, timings and parking/transport — verified facts only", "Batches available at this location", "LocalBusiness structured data once the address is verified", "Keep name, address and phone identical to the Google Business Profile"],
      audience: allAudience,
      seo: `Local pack and organic results for "${dl} ${noun} ${ctx.city.toLowerCase()}" and "near me" variants.`,
      keywords: { primary: `${dl} ${noun} in ${ctx.city.toLowerCase()}`, secondary: [`${dl} academy near me`, `${dl} ${noun} ${ctx.city.toLowerCase()} timings`] },
      benefit: "Directly drives footfall from local searches.",
      score: 60 + (dr.has("drive_footfall") || dr.has("increase_footfall") ? 20 : 0) + (ctx.hasPhysicalPremises ? 5 : 0),
      factors: ["base 60: local search", ...(dr.has("drive_footfall") || dr.has("increase_footfall") ? ["+20 serves footfall"] : []), ...(ctx.hasPhysicalPremises ? ["+5 physical premises"] : [])],
      implemented: hasRoute(new RegExp(slugify(ctx.city))) ? { implemented: true, note: `a route already names ${ctx.city}` } : { implemented: false, note: null },
      evidence: [`location.city = ${ctx.city} (${ctx.cityVerified ? "verified" : "unverified"})`],
    }));
    for (const area of ctx.serviceAreas.slice(0, 3)) {
      out.push(improvement(sc, {
        key: `area-${area}`,
        improvement: "location_content",
        title: `Neighbourhood section: ${d.name} ${noun} near ${area}`,
        why: `"${area}" is a stated service area; families there search for it by name.`,
        target: `/${slug}#${slugify(area)}`,
        steps: [`Travel time and route from ${area}`, "Batches convenient for families there", "Only areas the academy really serves; never a doorway page"],
        audience: allAudience,
        seo: `Long-tail local queries naming "${area}".`,
        keywords: { primary: `${dl} ${noun} near ${area.toLowerCase()}`, secondary: [] },
        benefit: "Captures neighbourhood-level local searches.",
        score: 40 + (dr.has("drive_footfall") ? 10 : 0),
        factors: ["base 40: stated service area", ...(dr.has("drive_footfall") ? ["+10 serves footfall"] : [])],
        evidence: [`location.serviceAreas includes ${area}`],
      }));
    }
    if (ctx.hasPhysicalPremises && !ctx.cityVerified) {
      out.push(improvement(sc, {
        key: "verify-location",
        improvement: "structured_content",
        title: "Verify the academy's address for local structured data",
        why: "The academy has premises but the location is unverified, so LocalBusiness structured data and a map cannot be published.",
        target: "location",
        steps: ["Confirm address and phone exactly as on the Google Business Profile", "Mark location.verified", "Regenerate: the contact page then carries LocalBusiness JSON-LD"],
        audience: allAudience,
        seo: "Consistent name/address/phone across the site and the business profile supports local ranking.",
        benefit: "Unlocks maps, directions and local results.",
        score: 65,
        factors: ["base 65: blocks local structured data"],
        evidence: ["location.hasPhysicalPremises = true", "location.verified = false"],
      }));
    }
  } else {
    out.push(improvement(sc, {
      key: "state-city",
      improvement: "location_content",
      title: "State the academy's city to unlock local recommendations",
      why: "Without a city, no local-search blog, location page or LocalBusiness data can be recommended honestly.",
      target: "location.city",
      steps: ["Add location.city (and service areas) to the business input"],
      audience: allAudience,
      seo: "Local intent is where academies win searches; it is currently unaddressed.",
      benefit: "Enables location-specific content.",
      score: 70,
      factors: ["base 70: blocks every local recommendation"],
      evidence: ["location.city is absent"],
    }));
  }

  // D. Structured content and FAQs.
  if (content.faq !== "verified_available") {
    out.push(improvement(sc, {
      key: "faq",
      improvement: "faq",
      title: `Add a verified ${d.name} FAQ`,
      why: `The FAQ is ${content.faq.replace(/_/g, " ")}. Parents ask the same questions — age to start, timings, fees structure, trial, what to bring — and an on-page answer prevents a lost enquiry.`,
      target: "/faq",
      steps: ["Collect the five to eight questions the academy actually hears", "Answer in the academy's words and mark verified", "Regenerate: FAQPage structured data is emitted only from verified answers"],
      audience: audienceLabels(ctx, "parents"),
      seo: "Eligible for FAQ-rich results and long-tail question queries once verified.",
      keywords: { primary: `${dl} ${noun} faq`, secondary: [`best age to start ${dl}`, `${dl} class fees`] },
      benefit: "Fewer unanswered questions between interest and enquiry.",
      score: 65,
      factors: ["base 65: structured content missing"],
      evidence: [`availableContent.faq = ${content.faq}`],
    }));
  }
  if (offered.length > 0) {
    out.push(improvement(sc, {
      key: "course-schema",
      improvement: "structured_content",
      title: `Course structured data for ${offered.length} programme${offered.length === 1 ? "" : "s"}`,
      why: "Each programme is a real course; schema.org Course markup describes it to search engines once its description is verified.",
      target: offered.map((o) => o.name).join(", "),
      steps: ["Verify each programme's description", "Emit schema.org Course (name, description, provider) on its page — only fields that are verified", `${ctx.category === "sports" ? "SportsActivityLocation" : "EducationalOrganization"} on the about/contact page once the address is verified`],
      audience: allAudience,
      seo: "Clearer entity understanding for course and academy queries.",
      benefit: "Better-qualified search visibility for each programme.",
      score: content.serviceDescriptions === "verified_available" ? 50 : 35,
      factors: [content.serviceDescriptions === "verified_available" ? "base 50: descriptions verified" : "base 35: waits on verified descriptions"],
      evidence: [`programmes: ${offered.map((o) => o.name).join(", ")}`],
    }));
  }

  // E. Internal linking — from the real page model and the blog plan.
  for (const page of sc.seoArtifacts?.pages ?? []) {
    if (page.route === "/" || page.inboundInternalLinks.length > 0 || page.indexable.value === false) continue;
    out.push(improvement(sc, {
      key: `orphan-${page.route}`,
      improvement: "internal_linking",
      title: `Link to ${page.route} from related pages`,
      why: `${page.route} has no inbound internal link, so search engines and visitors reach it only through navigation, if at all.`,
      target: page.route,
      steps: ["Link it from the home page and the most related course or blog page", "Use descriptive anchor text, not 'click here'"],
      audience: allAudience,
      seo: "Internal links pass relevance and help discovery.",
      benefit: "More visitors reach the page's conversion path.",
      score: 55,
      factors: ["base 55: orphan page"],
      evidence: [`seoArtifacts: ${page.route} inboundInternalLinks = []`],
    }));
  }
  const openBlogs = blogs.filter((b) => b.status !== "implemented" && b.status !== "dismissed");
  if (openBlogs.length > 0) {
    const coursesRoute = routeFor("courses", sc.pages);
    const trialRoute = routeFor("trial", sc.pages);
    out.push(improvement(sc, {
      key: "blog-cluster-links",
      improvement: "internal_linking",
      title: `Build a ${d.name} topic cluster: link blog posts to course and trial pages`,
      why: `${openBlogs.length} recommended posts share the ${d.name} topic; linked as a cluster around ${coursesRoute ?? "a courses page"}, each strengthens the others.`,
      target: [coursesRoute, trialRoute].filter(Boolean).join(", ") || "courses and trial pages (still to be created)",
      steps: [`Each post links to ${coursesRoute ?? "the courses page"} and ${trialRoute ?? "the trial request"}`, "The courses page links back to the two most relevant posts", "A /blog index links every post"],
      audience: allAudience,
      seo: "Topical authority for the academy's discipline; crawl paths to every post.",
      benefit: "Readers move from articles to enquiries in one click.",
      score: 50,
      factors: ["base 50: cluster linking"],
      evidence: [`${openBlogs.length} open blog recommendations`],
    }));
  }

  // F. SEO artifacts the plan could not resolve (canonical origin, etc.).
  // One recommendation per missing INPUT, however many artifacts and phrasings cite it.
  const inputOf = (needs: string) => needs.match(/^[a-zA-Z]+\.[\w.]+/)?.[0] ?? needs;
  const needs = [...new Map((sc.seoArtifacts?.unresolved ?? []).map((u) => [inputOf(u.needs), u.needs])).values()];
  for (const need of needs.slice(0, 3)) {
    out.push(improvement(sc, {
      key: `unresolved-${inputOf(need)}`,
      improvement: "missing_content",
      title: `Resolve a missing SEO input: ${truncate(need, 70)}`,
      why: `Some page artifacts cannot be emitted until this is supplied: ${need}.`,
      target: (sc.seoArtifacts?.unresolved ?? []).filter((u) => inputOf(u.needs) === inputOf(need)).map((u) => `${u.route} ${u.artifact}`).slice(0, 5).join(", "),
      steps: ["Supply the missing input and regenerate"],
      audience: allAudience,
      seo: "Canonical URLs, sitemaps and social previews depend on it.",
      benefit: "Removes a publication blocker.",
      score: 70,
      factors: ["base 70: blocks SEO artifacts"],
      evidence: ["seoArtifacts.unresolved"],
    }));
  }

  return out.sort((a, b) => b.priorityScore - a.priorityScore || a.id.localeCompare(b.id)).slice(0, SEO_RECOMMENDATION_CAPS.improvements);
}

export function recommendSeoContent(sc: SeoRecommendationContext): { resources: Recommendation[]; blogs: Recommendation[]; improvements: Recommendation[] } {
  if (!sc.academy.contextual) return { resources: [], blogs: [], improvements: [] };
  const blogs = blogRecommendations(sc);
  return { resources: resourceRecommendations(sc), blogs, improvements: improvementRecommendations(sc, blogs) };
}
