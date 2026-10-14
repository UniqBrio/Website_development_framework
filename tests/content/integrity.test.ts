import { describe, expect, it } from "vitest";
import {
  CONFIDENCE_POLICY,
  NEVER_FABRICATE,
  confidenceFromStatus,
  isFabricationRisk,
} from "../../src/content/confidence.js";
import {
  ASSET_REPLACEMENT_POLICY,
  imageStrategyFor,
  replacementFor,
} from "../../src/content/asset-policy.js";
import { verifyContent } from "../../src/content/verification.js";
import { assets, baseInput, content, fixtureCreativePortfolio } from "../fixtures/business-inputs.js";

describe("§12 fabrication list", () => {
  it("covers all 30 named §12 categories plus the 9 engagement data categories (ECO §17)", () => {
    // Guards against a category being quietly dropped from the list.
    expect(NEVER_FABRICATE.length).toBe(39);
    for (const category of ["formulas", "eligibility_rules", "decision_rules", "recommendations", "benchmarks", "savings_claims", "compatibility", "inventory", "availability"]) {
      expect(NEVER_FABRICATE).toContain(category);
    }
    for (const category of [
      "testimonials",
      "reviews",
      "customer_logos",
      "awards",
      "certifications",
      "statistics",
      "pricing",
      "case_studies",
      "medical_claims",
      "financial_claims",
      "security_claims",
      "regulatory_claims",
    ]) {
      expect(isFabricationRisk(category), `${category} must be a fabrication risk`).toBe(true);
    }
  });

  it("does not treat ordinary descriptive content as a fabrication category", () => {
    expect(isFabricationRisk("proposition")).toBe(false);
    expect(isFabricationRisk("process")).toBe(false);
  });
});

describe("§J.1 confidence policy", () => {
  it("verification_required is hidden and blocks publication", () => {
    const policy = CONFIDENCE_POLICY.verification_required;
    expect(policy.publication).toBe("hidden");
    expect(policy.blocksPublication).toBe(true);
    expect(policy.editorLabel).toContain("publication blocked");
  });

  it("an AI draft requires approval and does not publish automatically", () => {
    const policy = CONFIDENCE_POLICY.ai_draft;
    expect(policy.approvalRequired).toBe(true);
    expect(policy.blocksPublication).toBe(true);
    expect(policy.editorLabel).toBe("AI draft — verify");
  });

  it("a neutral placeholder may ship, because it states no fact", () => {
    expect(CONFIDENCE_POLICY.neutral_placeholder.blocksPublication).toBe(false);
  });

  it("unverified FACTUAL content is verification_required; descriptive is not", () => {
    expect(confidenceFromStatus("provided_unverified", "factual")).toBe("verification_required");
    expect(confidenceFromStatus("provided_unverified", "descriptive")).toBe(
      "customer_supplied_incomplete",
    );
  });

  it("partial evidence is never enough for a factual claim", () => {
    expect(confidenceFromStatus("partial", "factual")).toBe("verification_required");
  });
});

describe("§J.2 asset replacement policy", () => {
  it("has all 15 rows", () => {
    expect(Object.keys(ASSET_REPLACEMENT_POLICY)).toHaveLength(15);
  });

  it("never allows a generated substitute for proof-bearing assets", () => {
    for (const key of [
      "testimonials",
      "client_logos",
      "awards",
      "statistics",
      "certifications_reviews",
      "product_images",
      "team_photographs",
      "portfolio_case_studies",
      "contact_details",
    ]) {
      expect(
        replacementFor(key)?.generatedSubstituteAllowed,
        `${key} must not allow a generated substitute`,
      ).toBe(false);
    }
  });

  it("allows a generated substitute only for non-evidential items", () => {
    expect(replacementFor("official_logo")?.generatedSubstituteAllowed).toBe(true);
    expect(replacementFor("brand_colors")?.generatedSubstituteAllowed).toBe(true);
    expect(replacementFor("decorative_hero_image")?.generatedSubstituteAllowed).toBe(true);
  });

  it("marks product images and contact details critical", () => {
    expect(replacementFor("product_images")?.criticality).toBe("critical");
    expect(replacementFor("contact_details")?.criticality).toBe("critical");
  });
});

describe("§27 content tests — never generate what was not supplied", () => {
  const bare = verifyContent(baseInput());

  it("missing testimonial: never generated, hidden, customer asked", () => {
    const verdict = bare.sections.find((s) => s.category === "testimonials");
    expect(verdict?.render).toBe(false);
    expect(verdict?.generatedSubstituteAllowed).toBe(false);
    expect(verdict?.askCustomer).toBe(true);
    expect(bare.requests).toContain("testimonials");
  });

  it("missing customer logo: omitted entirely, no replacement invented", () => {
    const verdict = bare.sections.find((s) => s.category === "customer_logos");
    expect(verdict?.render).toBe(false);
    expect(verdict?.replacement).toBeNull();
    expect(verdict?.generatedSubstituteAllowed).toBe(false);
  });

  it("unverified certification blocks publication of that claim", () => {
    const report = verifyContent(
      baseInput({ availableAssets: assets({ certifications: "provided_unverified" }) }),
    );
    const verdict = report.sections.find((s) => s.category === "certifications");
    expect(verdict?.render).toBe(false);
    expect(verdict?.reason).toContain("unverified");
  });

  it("missing statistics are omitted, never estimated", () => {
    const verdict = bare.sections.find((s) => s.category === "statistics");
    expect(verdict?.render).toBe(false);
    expect(verdict?.replacement).toBeNull();
  });

  it("verified content renders normally", () => {
    const report = verifyContent(fixtureCreativePortfolio());
    const portfolio = report.sections.find((s) => s.category === "portfolio_work");
    const caseStudies = report.sections.find((s) => s.category === "case_studies");
    expect(portfolio?.render).toBe(true);
    expect(caseStudies?.render).toBe(true);
  });

  it("a substituted section offers a non-factual alternative, not a fake one", () => {
    const verdict = bare.sections.find((s) => s.category === "team_members");
    expect(verdict?.render).toBe(false);
    expect(verdict?.replacement).toBe("process_or_approach_section");
    expect(verdict?.generatedSubstituteAllowed).toBe(false);
  });
});

describe("conversion paths blocked by unverified facts (§J.2 critical rows)", () => {
  it("blocks an appointment objective when contact details are unverified", () => {
    const report = verifyContent(
      baseInput({ industry: "healthcare", websiteObjective: ["book_appointments"] }),
    );
    expect(report.blockedConversionPaths.join()).toContain("book_appointments");
  });

  it("blocks selling products when product imagery is unavailable", () => {
    const report = verifyContent(
      baseInput({ industry: "ecommerce", websiteObjective: ["sell_products"] }),
    );
    expect(report.blockedConversionPaths.join()).toContain("sell_products");
  });

  it("does not block a conversion path whose evidence is verified", () => {
    const report = verifyContent(
      baseInput({
        industry: "ecommerce",
        websiteObjective: ["sell_products"],
        availableAssets: assets({ productImages: "verified_available" }),
        availableContent: content({ contactDetails: "verified_available" }),
      }),
    );
    expect(report.blockedConversionPaths).toEqual([]);
  });
});

describe("§13 image strategy follows asset quality", () => {
  it("no authentic assets means non-representational only", () => {
    const result = imageStrategyFor("none");
    expect(result.strategy).toBe("non_representational_only");
    expect(result.rationale).toContain("never simulated");
  });

  it("weak assets prefer typography and SVG over poor photography", () => {
    expect(imageStrategyFor("low").strategy).toBe("typography_css_svg_diagram_led");
  });

  it("strong assets are used strategically", () => {
    expect(imageStrategyFor("high").strategy).toBe("authentic_strategic");
  });
});
