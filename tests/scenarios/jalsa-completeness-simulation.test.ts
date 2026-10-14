/**
 * COMPLETENESS SIMULATION — "could the Jalsa site be published if the restaurant supplied every
 * missing fact and approval?" (docs/FIRST-REAL-CUSTOMER-DRY-RUN-REPORT.md §25).
 *
 * SYNTHETIC BY CONSTRUCTION. Every value the restaurant has NOT supplied is a visibly fake
 * `FIXTURE` value, so the dataset classifies as synthetic and nothing here can be mistaken for
 * the restaurant's data. Nothing is written to customers/jalsa-restaurant. The only real inputs
 * are the verbatim menu names from the engine seam record.
 *
 * The tests pin CURRENT framework behaviour that blocks publication even with complete input.
 * Each is a FRAMEWORK_DEFECT in the report; fixing one must flip its assertion deliberately.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { runPipeline } from "../../src/pipeline.js";
import { generateWebsite } from "../../src/generation/generate-website.js";
import { engineInputFromWorkflow } from "../../src/workflow/seams.js";
import { parseBusinessInput, type BusinessInput } from "../../src/design-intelligence/types/business-input.js";
import { JALSA } from "./jalsa-provenance.js";

const V = "verified_available" as const;

function completeInput(objectives: BusinessInput["websiteObjective"] = ["drive_footfall"]): BusinessInput {
  const seam = engineInputFromWorkflow([{ file: JALSA.seamRecord, markdown: readFileSync(JALSA.seamRecord, "utf8") }]);
  const b = seam.businessInput;
  return parseBusinessInput({
    ...b,
    websiteObjective: objectives,
    // SIMULATED: the restaurant confirms the menu is real and authorises publication.
    // The real workspace keeps `not_authorized` ("For design illustrations only").
    sources: b.sources.map((s) => ({ ...s, publication: "authorized", description: `SIMULATED authorisation — ${s.description}` })),
    targetAudience: [{ label: "FIXTURE-AUDIENCE", isPrimary: true }],
    location: { verified: true, country: "FIXTURE-COUNTRY", city: "FIXTURE-CITY", hasPhysicalPremises: true },
    servicesProducts: b.servicesProducts.map((o) => ({ ...o, priceKnown: true, description: `FIXTURE description of ${o.name}` })),
    availableAssets: { ...b.availableAssets, logo: V, brandColors: V },
    availableContent: {
      ...b.availableContent,
      propositionText: V,
      serviceDescriptions: V,
      aboutText: V,
      pricing: V,
      faq: V,
      legalPolicies: V,
      contactDetails: V,
      contactEmail: V,
      contactPhone: V,
      contactAddress: V,
      contactWhatsapp: V,
      datasets: V,
    },
    constraints: { canonicalOrigin: "https://jalsa-fixture.invalid", brandSeed: "#7c1518", themeMode: "SINGLE-LIGHT" },
    engagement: undefined,
  });
}

const SUPPLIED = {
  propositionText: "FIXTURE proposition",
  aboutText: "FIXTURE about",
  faq: [{ question: "FIXTURE question", answer: "FIXTURE answer" }],
  legalPolicies: { privacy: "FIXTURE privacy policy" },
  contactDetails: { addressLines: ["FIXTURE street"], email: "fixture@jalsa-fixture.invalid", hours: ["FIXTURE hours"] },
  assets: { logo: { src: "/brand/fixture-logo.png", width: 150, height: 150, alt: "Jalsa Restaurant" } },
  drafts: [],
};

function run(objectives?: BusinessInput["websiteObjective"]) {
  const input = completeInput(objectives);
  const decided = runPipeline(input);
  const generated = generateWebsite(input, decided.output, decided.contract, { suppliedContent: SUPPLIED });
  return { input, decided, generated, home: generated.files["static/index.html"]! };
}

describe("Jalsa completeness simulation (synthetic FIXTURE values) — what still blocks publication", () => {
  it("is classified synthetic, generates consistently, and publishes the supplied contact, hours value and logo", () => {
    const { generated, home } = run();
    expect(generated.manifest.dataset.classification).toBe("synthetic");
    expect(generated.manifest.integrity.consistent).toBe(true);
    expect(home).toContain("FIXTURE hours");
    expect(home).toContain("fixture@jalsa-fixture.invalid");
    expect(home).toContain("/brand/fixture-logo.png");
  });

  it("FD-03: verified prices with priceKnown=true still never reach the page", () => {
    const { input, home } = run();
    expect(input.availableContent.pricing).toBe(V);
    expect(input.servicesProducts.every((o) => o.priceKnown)).toBe(true);
    expect(home).not.toContain("₹");
  });

  it("FD-04: the menu renders as one flat list — no category heading from the source reaches the page", () => {
    const { home } = run();
    // Headings only: "Biryani" legitimately appears inside the dish name "Full Biryani".
    for (const category of ["Indian Curry", "Non-Veg Starters", "Veg Starters", "Chinese", "Desserts", "Drinks", "Biryani", "Combo"]) {
      expect(home).not.toMatch(new RegExp(`<h[2-4][^>]*>${category}</h[2-4]>`));
    }
    expect((home.match(/<h2>/g) ?? []).length).toBeLessThan(8);
  });

  it("FD-14 RESOLVED (Phase 1.2): verified hours render in the hours section, once, with no placeholder", () => {
    // Was: "Hours to be supplied." persisted beside the real hours in the contact
    // block, so the content gate's placeholder blocker could never clear.
    const { generated, home } = run();
    expect(home).toContain("FIXTURE hours");
    expect(home).not.toContain("to be supplied");
    expect((home.match(/FIXTURE hours/g) ?? []).length).toBe(1);
    // The one remaining slot is the next step: the FIXTURE phone is not a dialable
    // number, so no conversion endpoint is verified.
    expect(generated.manifest.indexability.placeholders).toEqual([{ route: "/", slots: 1, pending: 0 }]);
  });

  it("FD-09 RESOLVED (Phase 1.3): verified proposition copy renders on the home page instead of vanishing", () => {
    // Was: silently dropped, because a drive_footfall home page had no proposition section.
    const { decided, generated, home } = run();
    expect(decided.output.pages.find((p) => p.route === "/")!.requiredSections[0]).toBe("proposition");
    expect(home).toContain("FIXTURE proposition");
    // The remaining blocker is honest and is the same mechanism working: this
    // architecture has no `about` section, so supplied About copy has nowhere to go.
    expect(generated.manifest.integrity.publicationBlockers).toEqual([expect.stringContaining("[supplied_value] about")]);
  });

  it("FD-15 RESOLVED (Phase 3.4): catalogue items get no thin page and are never typed as services", () => {
    // Was: 49 indexable /services/<dish> pages, each typed `Service` and each asking
    // for Article headline/author/date.
    const { decided, generated } = run();
    expect(decided.output.pages.filter((p) => p.derivedBy === "DD-093")).toEqual([]);
    expect(generated.files["static/services/egg-kheema-masala/index.html"]).toBeUndefined();
    const allHtml = Object.entries(generated.files).filter(([p]) => p.endsWith(".html")).map(([, b]) => b).join("\n");
    expect(allHtml).not.toContain('"@type":"Service"');
    expect(decided.output.contentHubs.every((h) => h.route === null && h.because.includes("catalogue item"))).toBe(true);
    expect(JSON.stringify(decided.output.seoArtifacts)).not.toContain("article headline");
  });

  it("FD-16 RESOLVED (Phase 1.3): a derived objective page is named for the visitor, not for the enum id", () => {
    const { decided } = run(["drive_footfall", "generate_leads"]);
    const routes = decided.output.pages.map((p) => p.route);
    expect(routes).toContain("/enquire");
    expect(routes).not.toContain("/generate-leads");
    expect(routes.every((r) => !/generate_leads|drive_footfall/.test(r))).toBe(true);
  });
});
