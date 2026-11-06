/**
 * Growth recommendations: contextual (never generic), honest about what is not
 * measured or not confirmed, aware of what already exists, and governed by a
 * role-checked lifecycle.
 */
import { describe, expect, it } from "vitest";
import { runPipeline } from "../../src/pipeline.js";
import { knownRecommendations } from "../../src/growth/report.js";
import { applyGrowthAction, parseGrowthConfiguration } from "../../src/growth/recommendations.js";
import { deriveAcademyContext } from "../../src/growth/academy.js";
import { authorize } from "../../src/growth/access.js";
import { baseInput } from "../fixtures/business-inputs.js";
import { cricketAcademy, danceAcademy } from "../fixtures/growth-fixtures.js";

const report = (input = danceAcademy(), configuration?: unknown, formEndpoints: Record<string, string> = { enquiry: "/api/enquiry" }) =>
  runPipeline(input, { growth: { configuration, formEndpoints } }).output.growth;

describe("academy context", () => {
  it("records the basis of every derived fact", () => {
    const stated = deriveAcademyContext(danceAcademy());
    expect(stated).toMatchObject({ category: "arts", categoryBasis: "stated", city: "Pune", contextual: true });
    expect(stated.primaryDiscipline?.family.id).toBe("dance");
    const inferred = deriveAcademyContext(cricketAcademy());
    expect(inferred).toMatchObject({ category: "sports", categoryBasis: "inferred" });
    expect(inferred.primaryDiscipline).toMatchObject({ name: "Cricket", basis: "inferred", source: "offer" });
  });

  it("is not contextual without a category, and asks for it instead of guessing", () => {
    const g = report(baseInput({ websiteObjective: ["generate_leads"] }));
    expect(g.contextual).toBe(false);
    expect(g.guestTools).toEqual([]);
    expect(g.blogs).toEqual([]);
    expect(g.resources).toEqual([]);
    expect(g.missingFacts.some((m) => m.startsWith("academy category"))).toBe(true);
  });
});

describe("recommendations are specific to the academy", () => {
  const dance = report();
  const cricket = report(cricketAcademy(), undefined, { booking: "/api/booking" });

  it("name the discipline and city in titles and keywords", () => {
    for (const r of [...dance.blogs, ...dance.resources, ...dance.guestTools]) {
      expect(`${r.title} ${r.keywords.primary ?? ""}`.toLowerCase()).toContain("bharatanatyam");
    }
    expect(dance.blogs.some((b) => b.title.includes("Pune") && b.keywords.primary?.includes("pune"))).toBe(true);
    expect(cricket.blogs.every((b) => !/bharatanatyam/i.test(b.title))).toBe(true);
    expect(cricket.resources.some((r) => r.title === "Cricket Bat Size Chart by Age and Height")).toBe(true);
  });

  it("give every blog a full brief within SEO length budgets", () => {
    for (const b of dance.blogs) {
      if (b.detail.kind !== "blog") throw new Error("not a blog");
      expect(b.detail.metaTitle.length).toBeLessThanOrEqual(60);
      expect(b.detail.metaDescription.length).toBeLessThanOrEqual(155);
      expect(b.detail.suggestedUrl).toMatch(/^\/blog\/[a-z0-9-]+$/);
      expect(b.keywords.primary).toBeTruthy();
      expect(b.keywords.secondary.length).toBeGreaterThan(0);
      expect(b.why.length).toBeGreaterThan(0);
      expect(b.targetAudience.length).toBeGreaterThan(0);
      expect(b.seoOpportunity).toBeTruthy();
      expect(b.businessBenefit).toBeTruthy();
    }
    expect(new Set(dance.blogs.map((b) => b.detail.kind === "blog" && b.detail.suggestedUrl)).size).toBe(dance.blogs.length);
  });

  it("never present keyword data as measured", () => {
    for (const r of dance.recommendations) expect(r.keywords.searchVolume).toBe("not_measured");
  });

  it("skip local-intent topics when the city is unknown", () => {
    const noCity = report(danceAcademy({ location: { verified: false, hasPhysicalPremises: true } }));
    expect(noCity.blogs.some((b) => b.detail.kind === "blog" && b.detail.searchIntent === "local")).toBe(false);
    expect(noCity.seoImprovements.some((r) => r.id === "seo:location_content:state-city")).toBe(true);
  });

  it("detect what is already published as implemented", () => {
    const covered = dance.blogs.find((b) => b.id === "blog:bharatanatyam-best-age-to-start");
    expect(covered).toMatchObject({ status: "implemented", statusBasis: "detected" });
    expect(dance.answers.blogs).not.toContain("blog:bharatanatyam-best-age-to-start");
  });

  it("do not invent a calculator where no formula exists", () => {
    expect(dance.guestTools.some((t) => t.id === "guest_engagement:skill_calculator")).toBe(false);
    expect(dance.notRecommendedTools.map((t) => t.toolId)).toContain("skill_calculator");
    expect(cricket.guestTools.some((t) => t.id === "guest_engagement:skill_calculator")).toBe(true);
  });

  it("never promote an unconfirmed free trial as ready", () => {
    const trial = cricket.guestTools.find((t) => t.id === "guest_engagement:free_trial_class");
    expect(trial?.detail).toMatchObject({ readiness: "needs_owner_confirmation" });
    const confirmed = dance.guestTools.find((t) => t.id === "guest_engagement:free_trial_class");
    expect(confirmed?.detail.kind === "guest_tool" && confirmed.detail.blockers.join(" ")).toContain("booking");
  });

  it("prioritise footfall tools for a footfall-driven academy", () => {
    expect(dance.guestTools[0]?.id).toBe("guest_engagement:free_trial_class");
    expect(dance.guestTools[0]?.priority).toBe("high");
    for (const r of dance.recommendations) expect(r.priorityFactors.length).toBeGreaterThan(0);
  });

  it("answer all five questions", () => {
    expect(dance.answers.guestTools.length).toBeGreaterThan(0);
    expect(dance.answers.resources.length).toBeGreaterThan(0);
    expect(dance.answers.blogs.length).toBeGreaterThan(0);
    expect(dance.answers.seoImprovements.length).toBeGreaterThan(0);
    const unprotected = report(danceAcademy(), undefined, {});
    expect(unprotected.answers.formsNeedingProtection).toContain("spam:form:enquiry");
  });

  it("are deterministic", () => {
    expect(report().recommendations.map((r) => r.id)).toEqual(dance.recommendations.map((r) => r.id));
  });
});

describe("form protection recommendations", () => {
  it("list host-built forms from stated functionality", () => {
    const g = report(danceAcademy({ requiredFunctionality: ["newsletter"] }));
    expect(g.spamProtection.forms.map((f) => f.formId)).toEqual(expect.arrayContaining(["enquiry", "newsletter"]));
    expect(g.formProtection.some((r) => r.id === "spam:newsletter-double-opt-in")).toBe(true);
  });
  it("mark a CAPTCHA as implemented once configured", () => {
    const g = report(danceAcademy(), { spamProtection: { captcha: { provider: "turnstile", siteKey: "fixture" } } });
    expect(g.formProtection.find((r) => r.id === "spam:captcha")?.status).toBe("implemented");
  });
});

describe("lifecycle and role-based access", () => {
  const g = report();
  const known = knownRecommendations(g);
  const owner = { id: "owner@example.com", role: "owner" as const };
  const editor = { id: "editor@example.com", role: "editor" as const };
  const viewer = { id: "viewer@example.com", role: "viewer" as const };
  const blogId = g.answers.blogs[0]!;
  const empty = parseGrowthConfiguration({});

  it("moves Recommended → Pending → Implemented, and the report reflects it", () => {
    const accepted = applyGrowthAction(empty, editor, { type: "recommendation", id: blogId, verb: "accept" }, known);
    expect(accepted.applied).toBe(true);
    const after = report(danceAcademy(), accepted.configuration);
    expect(after.blogs.find((b) => b.id === blogId)).toMatchObject({ status: "pending", statusBasis: "admin_action" });
    const done = applyGrowthAction(accepted.configuration, editor, { type: "recommendation", id: blogId, verb: "mark_implemented" }, knownRecommendations(after));
    expect(done.applied).toBe(true);
    expect(done.configuration.audit.map((a) => a.action)).toEqual(["accept", "mark_implemented"]);
  });

  it("requires a reason to dismiss and keeps a dismissal", () => {
    expect(applyGrowthAction(empty, owner, { type: "recommendation", id: blogId, verb: "dismiss" }, known).applied).toBe(false);
    const dismissed = applyGrowthAction(empty, owner, { type: "recommendation", id: blogId, verb: "dismiss", note: "covered in our newsletter" }, known);
    expect(dismissed.applied).toBe(true);
    expect(report(danceAcademy(), dismissed.configuration).blogs.find((b) => b.id === blogId)?.status).toBe("dismissed");
  });

  it("refuses illegal transitions and unknown ids", () => {
    expect(applyGrowthAction(empty, owner, { type: "recommendation", id: blogId, verb: "reopen" }, known).applied).toBe(false);
    expect(applyGrowthAction(empty, owner, { type: "recommendation", id: "blog:nope", verb: "accept" }, known).applied).toBe(false);
  });

  it("lets only owners and admins configure tools and security", () => {
    expect(applyGrowthAction(empty, viewer, { type: "recommendation", id: blogId, verb: "accept" }, known).applied).toBe(false);
    expect(applyGrowthAction(empty, editor, { type: "guest_tool", toolId: "free_trial_class", enabled: true }, known).applied).toBe(false);
    expect(applyGrowthAction(empty, editor, { type: "spam_protection", policy: {} }, known).applied).toBe(false);
    expect(applyGrowthAction(empty, editor, { type: "recommendation", id: "spam:shared-store", verb: "accept" }, known).applied).toBe(false);
    const enabled = applyGrowthAction(empty, owner, { type: "guest_tool", toolId: "free_trial_class", enabled: true, placement: "dedicated_page" }, known);
    expect(enabled.applied).toBe(true);
    expect(enabled.configuration.guestTools.free_trial_class).toMatchObject({ enabled: true, placement: "dedicated_page" });
    expect(authorize(null, "growth.view").allowed).toBe(false);
  });

  it("refuses a policy that would weaken a baseline check, even for an owner", () => {
    const r = applyGrowthAction(empty, owner, { type: "spam_protection", policy: { rateLimit: { enabled: false } } }, known);
    expect(r.applied).toBe(false);
    expect(r.reason).toContain("rate limiting");
    const ok = applyGrowthAction(empty, owner, { type: "spam_protection", policy: { captcha: { provider: "turnstile", siteKey: "fixture" } } }, known);
    expect(ok.applied).toBe(true);
    expect(ok.configuration.audit[0]?.detail).toContain("captcha");
  });

  it("shows an enabled but unready tool as Pending with what blocks it", () => {
    const enabled = applyGrowthAction(empty, owner, { type: "guest_tool", toolId: "sample_lessons", enabled: true }, known);
    const tool = report(danceAcademy(), enabled.configuration).guestTools.find((t) => t.id === "guest_engagement:sample_lessons");
    expect(tool?.status).toBe("pending");
    expect(tool?.detail.kind === "guest_tool" && tool.detail.blockers[0]).toContain("cannot go live");
  });
});
