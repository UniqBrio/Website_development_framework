/**
 * REMEDIATION PHASE 1 — the contracts that decide what can exist on a page
 * (docs/FRAMEWORK-REMEDIATION-PLAN.md §E Phase 1).
 *
 *   C1 section registry      FD-14, FD-08, and the 83-ids-vs-21-renderers class
 *   C5 page composition      FD-09 (home invariant), FD-16 (slugs), FD-12 (orphan)
 *   intent basis             FD-01 (objective), FD-02 (audience)
 *
 * All fixtures are SYNTHETIC (`FIXTURE-*`).
 */
import { describe, expect, it } from "vitest";
import { runPipeline } from "../../src/pipeline.js";
import { generateWebsite } from "../../src/generation/generate-website.js";
import { parseServedHtml, seoObservationsFromHtml } from "../../src/evidence/build-evidence.js";
import {
  SECTION_REGISTRY,
  canonicalSection,
  isSupportedSection,
  sectionEntry,
  sectionLabel,
} from "../../src/design-intelligence/sections/registry.js";
import { OBJECTIVE_ARCHITECTURE } from "../../src/design-intelligence/objectives/objective-architecture.js";
import { industryBaseline } from "../../src/design-intelligence/baseline/industry-baseline.js";
import { ALL_RULES } from "../../src/design-intelligence/rules/index.js";
import { industrySchema, type WebsiteObjective } from "../../src/design-intelligence/types/business-input.js";
import { baseInput, content } from "../fixtures/business-inputs.js";

/** Every section id a baseline, an objective or a rule can put into the architecture. */
function emittedSectionIds(): string[] {
  const ids = new Set<string>();
  for (const architecture of Object.values(OBJECTIVE_ARCHITECTURE)) {
    for (const s of architecture.requiredSections) ids.add(s);
    for (const s of architecture.supportingSections) ids.add(s);
  }
  for (const industry of industrySchema.options) for (const s of industryBaseline(industry).requiredContent) ids.add(s);
  for (const rule of ALL_RULES) {
    for (const effect of rule.then ?? []) {
      if (effect.target === "sectionArchitecture" && Array.isArray(effect.value)) for (const s of effect.value) ids.add(String(s));
    }
  }
  // Variable-driven additions in `sectionsForObjectives`.
  for (const s of ["filters", "search", "product_detail", "disclosures"]) ids.add(s);
  return [...ids];
}

describe("C1 — the section contract covers every section the engine can decide", () => {
  it("every emitted section id resolves to exactly one registry entry", () => {
    const missing = emittedSectionIds().filter((id) => sectionEntry(id) === undefined);
    expect(missing, `sections with no registry entry: ${missing.join(", ")}`).toEqual([]);
  });

  it("the registry states, for every entry, a label and whether a renderer exists", () => {
    for (const [id, e] of SECTION_REGISTRY) {
      expect(e.label.length, id).toBeGreaterThan(0);
      expect(e.label, id).not.toBe(id);
      expect(typeof e.renderer === "string" || e.renderer === null, id).toBe(true);
    }
  });

  it("aliases canonicalise once, and no alias is itself an entry (FD-08)", () => {
    expect(canonicalSection("location_contact")).toBe("location_and_contact");
    expect(canonicalSection("clear_language")).toBe("plain_language_summary");
    expect(canonicalSection("policies")).toBe("disclosures");
    expect(canonicalSection("inquiry")).toBe("enquiry");
    for (const [, e] of SECTION_REGISTRY) {
      for (const alias of e.aliases ?? []) expect(SECTION_REGISTRY.has(alias), `${alias} is both an alias and an entry`).toBe(false);
    }
  });

  it("FD-08: `location` and `location_and_contact` no longer split one section in two", () => {
    const { output } = runPipeline(baseInput({ industry: "local_business", websiteObjective: ["drive_footfall"] }));
    const architecture = output.sectionArchitecture;
    expect(architecture.filter((s) => s === "location_and_contact")).toHaveLength(1);
    expect(output.pageAllocation.unallocated.map((u) => u.section)).not.toContain("location");
  });

  it("headings come from the registry label, not from the id", () => {
    expect(sectionLabel("hours")).toBe("Opening hours");
    expect(sectionLabel("faq")).toBe("Frequently asked questions");
    expect(sectionLabel("location_contact")).toBe("Location and contact");
  });

  it("negative: a decided section with NO renderer renders nothing, says why, and blocks publication", () => {
    // `recruit` requires roles/culture/application; none has a renderer today.
    expect(isSupportedSection("roles")).toBe(false);
    const input = baseInput({ businessName: "FIXTURE-RECRUITER", websiteObjective: ["recruit"] });
    const decided = runPipeline(input);
    const site = generateWebsite(input, decided.output, decided.contract, {});
    const home = site.files["static/index.html"] ?? "";
    // No heading and no fillable-looking slot for a section nothing can render.
    for (const label of ["Roles", "Culture", "Apply"]) expect(home, label).not.toContain(`<h2>${label}</h2>`);
    expect(home).not.toContain("Roles to be supplied");
    const unsupported = site.manifest.integrity.entries.filter((e) => e.domain === "section" && e.reason.includes("no renderer implements"));
    expect(unsupported.length).toBeGreaterThan(0);
    for (const e of unsupported) expect(e.status).toBe("unavailable");
  });
});

describe("C5 — page composition (FD-09 home invariant, FD-16 slugs, FD-12 orphan)", () => {
  const objectives = Object.keys(OBJECTIVE_ARCHITECTURE) as WebsiteObjective[];

  it("FD-09: every home page carries a proposition, whatever objective it serves", () => {
    for (const objective of objectives) {
      const { output } = runPipeline(baseInput({ websiteObjective: [objective] }));
      const home = output.pages.find((p) => p.route === "/");
      expect(home, objective).toBeDefined();
      expect(home!.requiredSections[0], objective).toBe("proposition");
    }
  });

  it("FD-09: supplied proposition copy reaches the page for every objective", () => {
    for (const objective of objectives) {
      const input = baseInput({ websiteObjective: [objective], availableContent: content({ propositionText: "verified_available" }) });
      const decided = runPipeline(input);
      const site = generateWebsite(input, decided.output, decided.contract, { suppliedContent: { propositionText: `FIXTURE proposition for ${objective}` } });
      expect(site.files["static/index.html"], objective).toContain(`FIXTURE proposition for ${objective}`);
      expect(site.manifest.integrity.publicationBlockers, objective).toEqual([]);
    }
  });

  it("FD-16: no derived route is named after an internal objective id, and owner routes win collisions", () => {
    for (const objective of objectives) {
      const { output } = runPipeline(baseInput({ websiteObjective: ["build_credibility", objective] }));
      for (const page of output.pages) expect(page.route, `${objective} ${page.route}`).not.toMatch(/_|generate-leads|drive-footfall|provide-support|publish-content/);
    }
    // An owner page already at /enquire pushes the derived page elsewhere.
    const { output } = runPipeline(
      baseInput({
        websiteObjective: ["build_credibility", "generate_leads"],
        requiredPages: [{ path: "/", purpose: "home" }, { path: "/enquire", purpose: "enquiries" }],
      }),
    );
    expect(output.pages.filter((p) => p.route === "/enquire")).toHaveLength(1);
  });

  it("FD-12: a single-page site's home is not an orphan; another page with no inbound link still is", () => {
    const home = parseServedHtml("/", '<html><head></head><body><main><h1>FIXTURE</h1></main></body></html>');
    expect(seoObservationsFromHtml(home, [home]).internalInboundLinks).toBe(1);
    const stray = parseServedHtml("/stray", '<html><head></head><body><main><h1>FIXTURE</h1></main></body></html>');
    expect(seoObservationsFromHtml(stray, [home, stray]).internalInboundLinks).toBe(0);
    const { output } = runPipeline(baseInput({ websiteObjective: ["drive_footfall"] }));
    expect(output.seoArtifacts.pages.find((p) => p.route === "/")?.warnings.join(" ")).not.toContain("ORPHAN");
  });
});

describe("intent basis — FD-01 objective, FD-02 audience", () => {
  it("negative: an inferred objective is recorded as inferred and needs customer approval", () => {
    const { output } = runPipeline(baseInput({ websiteObjective: ["drive_footfall"], websiteObjectiveBasis: "inferred" }));
    expect(output.profile.provenance.find((p) => p.variable === "website_objective")?.basis).toBe("inferred");
    expect(output.approvalsRequired.join(" ")).toContain("is an operator inference");
  });

  it("negative: an inferred audience is never published as the customer's words", () => {
    const input = baseInput({
      websiteObjective: ["generate_leads"],
      targetAudience: [{ label: "FIXTURE-GUESSED-AUDIENCE", isPrimary: true, basis: "inferred" }],
    });
    const decided = runPipeline(input);
    const site = generateWebsite(input, decided.output, decided.contract, {});
    const home = site.files["static/index.html"] ?? "";
    expect(home).not.toContain("For FIXTURE-GUESSED-AUDIENCE");
    expect(home).toContain("Audience to be stated by the owner.");
    expect(decided.output.pages[0]!.audienceBasis).toBe("inferred");
  });

  it("positive: a stated audience still renders verbatim, and a stated objective raises no approval", () => {
    const input = baseInput({
      websiteObjective: ["generate_leads"],
      targetAudience: [{ label: "FIXTURE-STATED-AUDIENCE", isPrimary: true }],
    });
    const decided = runPipeline(input);
    const site = generateWebsite(input, decided.output, decided.contract, {});
    expect(site.files["static/index.html"]).toContain("For FIXTURE-STATED-AUDIENCE");
    expect(decided.output.pages[0]!.audienceBasis).toBe("stated");
    expect(decided.output.approvalsRequired.join(" ")).not.toContain("operator inference");
  });
});
