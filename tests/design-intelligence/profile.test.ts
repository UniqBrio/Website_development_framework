import { describe, expect, it } from "vitest";
import {
  REQUIRED_VARIABLES,
  deriveDesignContextProfile,
} from "../../src/design-intelligence/profile/derive-profile.js";
import {
  industryBaseline,
  industryToGroup,
} from "../../src/design-intelligence/baseline/industry-baseline.js";
import { industrySchema } from "../../src/design-intelligence/types/business-input.js";
import {
  assets,
  baseInput,
  content,
  fixtureCreativePortfolio,
  fixtureEcommerce,
  fixtureHealthcare,
  fixturePwaRequired,
  fixtureSaas,
  fixtureUnverifiedProof,
} from "../fixtures/business-inputs.js";

describe("industry baseline (§5, appendix B)", () => {
  it("maps every declared industry to a real baseline group", () => {
    for (const industry of industrySchema.options) {
      expect(() => industryBaseline(industry)).not.toThrow();
      expect(industryToGroup[industry]).toBeTruthy();
    }
  });

  it("gives an unknown industry the most restrictive posture, not a neutral one", () => {
    const unknown = industryBaseline("other");
    expect(unknown.visualExpression).toBe("low_to_medium");
    expect(unknown.motionCap).toBe("low");
    expect(unknown.trust).toBe("high");
  });

  it("keeps regulated groups at minimal motion", () => {
    expect(industryBaseline("healthcare").motionCap).toBe("minimal");
    expect(industryBaseline("legal").motionCap).toBe("minimal");
    expect(industryBaseline("banking").motionCap).toBe("minimal");
  });
});

describe("profile derivation — provenance (§30)", () => {
  it("records provenance for every one of the 16 variables", () => {
    const profile = deriveDesignContextProfile(fixtureSaas());
    const recorded = new Set(profile.provenance.map((p) => p.variable));
    for (const variable of REQUIRED_VARIABLES) {
      expect(recorded.has(variable), `missing provenance for ${variable}`).toBe(true);
    }
    // The 16 variables, plus the basis of the two contract-required intent facts
    // (FD-01 website_objective, FD-02 target_audience), which are not variables.
    const intentFacts = ["website_objective", "target_audience"];
    expect(profile.provenance.filter((p) => !intentFacts.includes(p.variable))).toHaveLength(REQUIRED_VARIABLES.length);
    for (const fact of intentFacts) expect(recorded.has(fact), `missing provenance for ${fact}`).toBe(true);
  });

  it("marks a stated value `stated` and an absent one `default`", () => {
    const profile = deriveDesignContextProfile(fixtureSaas());
    const seo = profile.provenance.find((p) => p.variable === "seo_dependency");
    expect(seo?.basis).toBe("stated");

    const bare = deriveDesignContextProfile(baseInput());
    const budget = bare.provenance.find((p) => p.variable === "technical_complexity_budget");
    expect(budget?.basis).toBe("default");
  });

  it("every provenance entry carries evidence, never an empty string", () => {
    const profile = deriveDesignContextProfile(fixtureEcommerce());
    for (const entry of profile.provenance) {
      expect(entry.evidence.length, `${entry.variable} has no evidence`).toBeGreaterThan(0);
    }
  });
});

describe("profile derivation — §27 business decision tests", () => {
  it("healthcare + very high trust caps emotional intensity at low", () => {
    const profile = deriveDesignContextProfile(fixtureHealthcare());
    expect(profile.variables.trust_requirement).toBe("very_high");
    expect(profile.variables.emotional_intensity).toBe("low");
    expect(profile.variables.purchase_cycle).toBe("regulated");
  });

  it("trust beats stated brand personality — expression cannot be bought", () => {
    // An expressive personality on a very-high-trust business must NOT raise
    // emotional intensity: §0.2 ranks trust above brand coherence.
    const profile = deriveDesignContextProfile(
      baseInput({
        industry: "banking",
        brandPersonality: ["playful", "energetic"],
        availableContent: content({ propositionText: "verified_available" }),
      }),
    );
    expect(profile.variables.trust_requirement).toBe("very_high");
    expect(profile.variables.emotional_intensity).toBe("low");
  });

  it("creative portfolio with verified imagery reaches high visual asset quality", () => {
    const profile = deriveDesignContextProfile(fixtureCreativePortfolio());
    expect(profile.variables.visual_asset_quality).toBe("high");
    expect(profile.variables.brand_expression_need).toBe("high");
  });

  it("SaaS with integrations reaches high product complexity", () => {
    const profile = deriveDesignContextProfile(fixtureSaas());
    expect(profile.variables.product_service_complexity).toBe("high");
  });

  it("ecommerce with checkout and many products reaches deep commerce", () => {
    const profile = deriveDesignContextProfile(fixtureEcommerce());
    expect(profile.variables.commerce_depth).toBe("deep");
    expect(profile.variables.mobile_share).toBe("high");
    expect(profile.variables.purchase_cycle).toBe("immediate");
  });

  it("PWA is read from the stated requirement and never inferred", () => {
    expect(deriveDesignContextProfile(fixturePwaRequired()).pwaRequested).toBe(true);
    expect(deriveDesignContextProfile(fixtureSaas()).pwaRequested).toBe(false);
  });
});

describe("profile derivation — content confidence (§J.1)", () => {
  it("no assets at all is `placeholder`, not `verified`", () => {
    expect(deriveDesignContextProfile(baseInput()).variables.content_confidence).toBe("placeholder");
  });

  it("one unverified factual claim sets the whole profile to verification_required", () => {
    const profile = deriveDesignContextProfile(fixtureUnverifiedProof());
    expect(profile.variables.content_confidence).toBe("verification_required");
  });

  it("the weakest claim governs — a verified claim does not rescue an unverified one", () => {
    const profile = deriveDesignContextProfile(
      baseInput({
        availableAssets: assets({
          certifications: "verified_available",
          testimonials: "provided_unverified",
        }),
      }),
    );
    expect(profile.variables.content_confidence).toBe("verification_required");
  });
});

describe("profile derivation — accessibility and audience floors", () => {
  it("never defaults accessibility below WCAG AA", () => {
    expect(deriveDesignContextProfile(baseInput()).variables.accessibility_requirement).toBe(
      "wcag_aa",
    );
  });

  it("the lowest stated audience literacy governs", () => {
    const profile = deriveDesignContextProfile(
      baseInput({
        targetAudience: [
          { label: "FIXTURE-EXPERTS", isPrimary: true, digitalLiteracy: "high" },
          { label: "FIXTURE-NEWCOMERS", digitalLiteracy: "low" },
        ],
      }),
    );
    expect(profile.variables.audience_digital_literacy).toBe("low");
  });

  it("visual_asset_quality is `none` only when nothing usable exists", () => {
    expect(deriveDesignContextProfile(baseInput()).variables.visual_asset_quality).toBe("none");
    const partial = deriveDesignContextProfile(
      baseInput({ availableAssets: assets({ heroImages: "partial" }) }),
    );
    expect(partial.variables.visual_asset_quality).toBe("low");
  });
});

describe("input contract validation (§1.1)", () => {
  it("rejects input with no audience", () => {
    expect(() => baseInput({ targetAudience: [] })).toThrow();
  });

  it("rejects input with no objective", () => {
    expect(() => baseInput({ websiteObjective: [] })).toThrow();
  });
});
