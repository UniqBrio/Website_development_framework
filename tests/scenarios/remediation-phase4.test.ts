/**
 * REMEDIATION PHASE 4 — industry vocabulary (FD-10), pattern buildability (FD-11b)
 * and visitor-facing labels (FD-07).
 *
 * All fixtures are SYNTHETIC (`FIXTURE-*`).
 */
import { describe, expect, it } from "vitest";
import { runPipeline } from "../../src/pipeline.js";
import { generateWebsite } from "../../src/generation/generate-website.js";
import { industryBaseline, industryToGroup } from "../../src/design-intelligence/baseline/industry-baseline.js";
import { attributeVocabulary } from "../../src/content/attribute-vocabulary.js";
import { isSupportedSection, sectionLabel } from "../../src/design-intelligence/sections/registry.js";
import { IMPLEMENTED_PATTERNS, PATTERNS, PATTERN_SECTION_MAP } from "../../src/design-system/pattern-registry/registry.js";
import { GATE_ORDER, selectElement } from "../../src/design-intelligence/engine/select-elements.js";
import { deriveDesignContextProfile } from "../../src/design-intelligence/profile/derive-profile.js";
import { baseInput, content } from "../fixtures/business-inputs.js";

const foodBusiness = (overrides = {}) =>
  baseInput({
    businessName: "FIXTURE-EATERY",
    industry: "food_service",
    websiteObjective: ["drive_footfall"],
    servicesProducts: [{ name: "FIXTURE-DISH", kind: "product" }],
    availableContent: content({ contactDetails: "verified_available", contactAddress: "verified_available", openingHours: "verified_available" }),
    ...overrides,
  });

describe("FD-10 — food service is its own industry, not a lodging or a template", () => {
  it("has a baseline whose every required section the generator can render", () => {
    const baseline = industryBaseline("food_service");
    expect(industryToGroup.food_service).toBe("food_service");
    for (const section of baseline.requiredContent) expect(isSupportedSection(section), section).toBe(true);
  });

  it("does not inherit hospitality's lodging posture", () => {
    const hospitality = industryBaseline("hospitality");
    const food = industryBaseline("food_service");
    expect(hospitality.requiredContent).toContain("booking");
    expect(food.requiredContent).not.toContain("booking");
    expect(food.requiredContent).not.toContain("amenities");
    // No imagery is assumed for a business that may have none.
    expect(food.visualExpression).toBe("low_to_medium");
    expect(food.prohibited).toContain("simulated_food_photography");
  });

  it("declares the food-service attribute vocabulary, with dietary marks regulated", () => {
    const vocabulary = attributeVocabulary("food_service");
    expect(vocabulary.map((a) => a.key)).toEqual(["dietary_classification", "allergens", "spice_level", "portion"]);
    expect(vocabulary.filter((a) => a.regulated).map((a) => a.key)).toEqual(["dietary_classification", "allergens"]);
  });

  it("a food-service site asks for what, where and when — and nothing it cannot render", () => {
    const input = foodBusiness();
    const decided = runPipeline(input);
    const site = generateWebsite(input, decided.output, decided.contract, {
      suppliedContent: { contactDetails: { addressLines: ["FIXTURE street"], hours: ["FIXTURE 11:00-23:00"] } },
    });
    const home = site.files["static/index.html"] ?? "";
    expect(home).toContain("FIXTURE street");
    expect(home).toContain("FIXTURE 11:00-23:00");
    expect(site.manifest.integrity.entries.filter((e) => e.reason.includes("no renderer implements"))).toEqual([]);
  });
});

describe("FD-07 — sections are named in the industry's words", () => {
  it("a restaurant's offers are a Menu; a practice's are Services", () => {
    expect(sectionLabel("services", "food_service")).toBe("Menu");
    expect(sectionLabel("services", "professional_services")).toBe("Services");
    expect(sectionLabel("services", "ecommerce")).toBe("Products");
    expect(sectionLabel("services")).toBe("Services");
  });

  it("the rendered heading follows the industry, and the navigation control no longer says Menu", () => {
    const input = foodBusiness({ servicesProducts: [{ name: "FIXTURE-DISH-A", kind: "product" }, { name: "FIXTURE-DISH-B", kind: "product" }] });
    const decided = runPipeline(input);
    const site = generateWebsite(input, decided.output, decided.contract, {});
    const home = site.files["static/index.html"] ?? "";
    expect(home).toContain("<h2>Menu</h2>");
    expect(home).toContain(">Site menu</button>");
    expect(home).not.toContain(">Menu</button>");
  });
});

describe("FD-11 (b) — a pattern no renderer implements is never selected", () => {
  it("the buildability gate runs last, so design reasons still explain a rejection", () => {
    expect(GATE_ORDER[GATE_ORDER.length - 1]).toBe("generator_implementation");
  });

  it("negative: an unimplemented pattern is rejected, and carries no budget or fallback requirement", () => {
    const profile = deriveDesignContextProfile(baseInput({ industry: "creative_agency", brandPersonality: ["editorial"] }));
    // One whose content and assets are satisfied, so buildability is what decides.
    const unimplemented = PATTERNS.find(
      (p) => !IMPLEMENTED_PATTERNS.has(p.id) && p.requiredContent.length === 0 && p.requiredAssets.length === 0 && !p.poorFor.includes("creative_agency"),
    )!;
    const decision = selectElement(unimplemented, {
      profile,
      availableContent: new Set(["services", "faq", "process", "proposition"]),
      verifiedAssets: new Set(["heroImages", "productImages", "portfolioImages"]),
      routeJsBudgetKb: 400,
      alreadySelected: [],
      forbidden: new Set(),
      forbiddenBy: {},
      visualExpressionCeiling: "high",
      technicalComplexityBudget: "high",
      statedRequirements: new Set(),
      statedObjectives: new Set(),
    });
    expect(decision.outcome).toBe("reject");
    expect(decision.gates.find((g) => g.gate === "generator_implementation")?.passed).toBe(false);
  });

  it("positive: every implemented pattern maps to a section the generator renders", () => {
    for (const [section, pattern] of Object.entries(PATTERN_SECTION_MAP)) {
      expect(isSupportedSection(section), `${pattern} claims section ${section}`).toBe(true);
      expect(PATTERNS.some((p) => p.id === pattern), pattern).toBe(true);
    }
  });

  it("positive: a selected pattern is always one the generator renders", () => {
    for (const input of [baseInput({ websiteObjective: ["generate_leads"], servicesProducts: [{ name: "FIXTURE-A", kind: "service" }] }), foodBusiness()]) {
      const { output } = runPipeline(input);
      for (const id of output.selectedPatterns) expect(IMPLEMENTED_PATTERNS.has(id), id).toBe(true);
    }
  });
});
