import { describe, expect, it } from "vitest";
import { motionLibrariesForTier, selectStack } from "../../src/stack/select-stack.js";
import { deriveDesignContextProfile } from "../../src/design-intelligence/profile/derive-profile.js";
import {
  CONTRAST_THRESHOLDS,
  checkHardFailures,
  type AccessibilityObservations,
} from "../../src/accessibility/rules.js";
import { evaluateAccessibility } from "../../src/accessibility/evaluate.js";
import { buildSeoStrategy, seoScore } from "../../src/seo/strategy.js";
import {
  baseInput,
  fixtureEcommerce,
  fixtureHealthcare,
  fixturePwaRequired,
  fixtureSaas,
} from "../fixtures/business-inputs.js";

// ------------------------------------------------------------------ §17 / §24

describe("§24 stack selection is a mandatory architectural rule", () => {
  it("SEO-heavy with no PWA requirement selects Next.js and denies PWA", () => {
    const profile = deriveDesignContextProfile(fixtureSaas());
    const decision = selectStack(profile, ["contact_form"]);
    expect(decision.framework).toBe("nextjs");
    expect(decision.pwaConstraintEnabled).toBe(false);
    expect(decision.recordedRule).toContain("Next.js primary");
    expect(decision.architecturalConstraints.join()).toContain("DENIED");
  });

  it("a stated PWA requirement enables the PWA constraint as first-class", () => {
    const profile = deriveDesignContextProfile(fixturePwaRequired());
    const decision = selectStack(profile, ["pwa", "contact_form"]);
    expect(decision.pwaConstraintEnabled).toBe(true);
    expect(decision.recordedRule).toContain("PWA architectural constraint enabled");
    // §24: never at the cost of indexability.
    expect(decision.architecturalConstraints.join()).toContain("never intercepts or stales indexable HTML");
    expect(decision.architecturalConstraints.join()).toContain("server-rendered content remains the base");
  });

  it("records the architectural decision explicitly, as §24 requires", () => {
    const profile = deriveDesignContextProfile(fixtureSaas());
    expect(selectStack(profile, []).recordedRule).toMatch(/^DD-STACK:/);
  });

  it("never adds PWA because it is modern", () => {
    const profile = deriveDesignContextProfile(baseInput());
    const decision = selectStack(profile, []);
    expect(decision.pwaConstraintEnabled).toBe(false);
    expect(decision.libraries).not.toContain("next-pwa or an equivalent service-worker toolchain");
  });
});

describe("§17 avoid unnecessary dependencies", () => {
  it("adds no libraries when no requirement justifies one", () => {
    const profile = deriveDesignContextProfile(baseInput());
    const decision = selectStack(profile, []);
    expect(decision.libraries).toEqual([]);
    expect(decision.rationale.join()).toContain("No libraries added");
  });

  it("adds form libraries only when a form is required", () => {
    const profile = deriveDesignContextProfile(baseInput());
    const decision = selectStack(profile, ["contact_form"]);
    expect(decision.libraries).toContain("react-hook-form");
    expect(decision.libraries).toContain("zod");
  });

  it("adds no animation library when the highest selected tier is CSS", () => {
    expect(motionLibrariesForTier("semantic_html_css")).toEqual([]);
    expect(motionLibrariesForTier("css_transforms_transitions")).toEqual([]);
  });

  it("adds three/R3F only at a spatial tier, and lazily", () => {
    expect(motionLibrariesForTier("three_r3f").join()).toContain("lazy, on intent");
  });

  it("gates authentication to a private surface without ungating public content", () => {
    const profile = deriveDesignContextProfile(baseInput());
    const decision = selectStack(profile, ["authentication"]);
    expect(decision.architecturalConstraints.join()).toContain("public content stays indexable and ungated");
  });

  it("chooses a hybrid rendering strategy for deep commerce", () => {
    const profile = deriveDesignContextProfile(fixtureEcommerce());
    expect(selectStack(profile, ["checkout"]).renderingStrategy).toBe("hybrid");
  });
});

// ------------------------------------------------------------------ §9 / §G.1

function observations(
  overrides: Partial<AccessibilityObservations> = {},
): AccessibilityObservations {
  return {
    primaryTaskRequiresPointerOnly: false,
    primaryTaskRequiresHover: false,
    primaryTaskRequiresDrag: false,
    primaryTaskRequiresDeviceMotion: false,
    primaryTaskRequiresWebgl: false,
    focusVisible: true,
    focusObscuredBySticky: false,
    lowestCriticalTextContrast: 7.2,
    lowestLogoContrast: 4.1,
    coreContentLostAt320: false,
    coreContentLostAt400Zoom: false,
    meaningfulMediaWithoutAlternative: [],
    nonEssentialMotionCannotBeReduced: false,
    formsInaccessible: false,
    smallestTargetCssPx: 48,
    ...overrides,
  };
}

describe("§G.1 hard failures block production", () => {
  it("passes a clean page", () => {
    expect(checkHardFailures(observations())).toEqual([]);
    // Scored through the ONE remaining authority, which reads the target.
    expect(evaluateAccessibility("wcag_aa", observations()).score).toBe(9);
  });

  it("blocks when the primary task requires WebGL", () => {
    const failures = checkHardFailures(observations({ primaryTaskRequiresWebgl: true }));
    expect(failures[0]?.rule).toBe("primary_task_input_independence");
    expect(failures[0]?.blocksProduction).toBe(true);
  });

  it("blocks when the primary task requires hover", () => {
    expect(checkHardFailures(observations({ primaryTaskRequiresHover: true })).length).toBe(1);
  });

  it("blocks when focus is obscured by sticky UI", () => {
    const failures = checkHardFailures(observations({ focusObscuredBySticky: true }));
    expect(failures[0]?.rule).toBe("focus_visible_and_not_obscured");
  });

  it("blocks on critical text contrast below 4.5:1", () => {
    const failures = checkHardFailures(observations({ lowestCriticalTextContrast: 2.98 }));
    expect(failures[0]?.rule).toBe("critical_text_contrast");
    expect(CONTRAST_THRESHOLDS.bodyText).toBe(4.5);
  });

  it("blocks on logo contrast, which WCAG exempts but this framework does not", () => {
    const failures = checkHardFailures(observations({ lowestLogoContrast: 1.4 }));
    expect(failures[0]?.rule).toBe("logo_visibility");
    expect(failures[0]?.detail).toContain("WCAG exempts logotypes; this framework does not");
    expect(failures[0]?.detail).toContain("never recolour the mark");
  });

  it("blocks when content is lost at 320 CSS px or 400% zoom", () => {
    expect(checkHardFailures(observations({ coreContentLostAt320: true }))[0]?.rule).toBe("reflow");
    expect(checkHardFailures(observations({ coreContentLostAt400Zoom: true }))[0]?.rule).toBe("reflow");
  });

  it("blocks meaningful media with no alternative", () => {
    const failures = checkHardFailures(
      observations({ meaningfulMediaWithoutAlternative: ["hero-canvas"] }),
    );
    expect(failures[0]?.rule).toBe("media_alternatives");
  });

  it("blocks non-essential motion that cannot be reduced", () => {
    expect(
      checkHardFailures(observations({ nonEssentialMotionCannotBeReduced: true }))[0]?.rule,
    ).toBe("reduced_motion");
  });

  it("caps the accessibility score below the production minimum on any hard failure", () => {
    const result = evaluateAccessibility("wcag_aa", observations({ primaryTaskRequiresWebgl: true }));
    // Production minimum for accessibility is 8; a gate failure can never score there.
    expect(result.score).not.toBeNull();
    expect(result.score as number).toBeLessThan(8);
    expect(result.gate).toBe(false);
    expect(result.explanation).toContain("FAIL");
  });

  it("a sub-44px target passes at AA and fails at AAA — the target decides", () => {
    // The removed `accessibilityScore` hard-coded an AA assumption here. The
    // outcome now depends on the REQUESTED target, which is the P1-4 contract.
    expect(evaluateAccessibility("wcag_aa", observations({ smallestTargetCssPx: 32 })).gate).toBe(true);
    expect(
      evaluateAccessibility("wcag_aaa_or_equivalent", observations({ smallestTargetCssPx: 32 })).gate,
    ).toBe(false);
  });
});

// ------------------------------------------------------------------ §16 / §I

describe("§I SEO strategy withholds unverified structured data", () => {
  const profile = deriveDesignContextProfile(fixtureHealthcare());

  it("withholds LocalBusiness schema when the address is not verified", () => {
    const strategy = buildSeoStrategy(profile, new Set(["proposition", "services"]));
    expect(strategy.withheldSchemaTypes.map((s) => s.type)).toContain("LocalBusiness");
    expect(strategy.allowedSchemaTypes.map((s) => s.type)).not.toContain("LocalBusiness");
  });

  it("withholds AggregateRating when there are no verified reviews", () => {
    const strategy = buildSeoStrategy(profile, new Set(["proposition"]));
    const withheld = strategy.withheldSchemaTypes.find((s) => s.type === "AggregateRating");
    expect(withheld?.missingEvidence).toContain("reviews");
  });

  it("allows schema whose evidence IS verified", () => {
    const strategy = buildSeoStrategy(profile, new Set(["proposition", "addresses", "services"]));
    const allowed = strategy.allowedSchemaTypes.map((s) => s.type);
    expect(allowed).toContain("LocalBusiness");
    expect(allowed).toContain("Organization");
    expect(allowed).toContain("Service");
  });

  it("requires server-rendered HTML when SEO dependency is high", () => {
    const saas = deriveDesignContextProfile(fixtureSaas());
    const strategy = buildSeoStrategy(saas, new Set(["proposition"]));
    expect(strategy.renderingConstraint).toContain("All public content is server-rendered");
    expect(strategy.renderingConstraint).toContain("canvas or WebGL");
  });

  it("derives page architecture from §I.1 intent, not from a template", () => {
    const saas = deriveDesignContextProfile(fixtureSaas());
    expect(buildSeoStrategy(saas, new Set()).pageArchitecture).toContain("use_case");
    const ecom = deriveDesignContextProfile(fixtureEcommerce());
    expect(buildSeoStrategy(ecom, new Set()).pageArchitecture).toContain("product");
  });
});

describe("SEO scoring", () => {
  const clean = {
    serverRenderedPrimaryContent: true,
    uniqueTitleAndDescription: true,
    singleH1: true,
    headingHierarchyValid: true,
    canonicalCorrect: true,
    openGraphPresent: true,
    internalInboundLinks: 3,
    fabricatedSchemaPresent: false,
    imagesWithoutAlt: 0,
  };

  it("scores a clean page 10", () => {
    expect(seoScore(clean).value).toBe(10);
  });

  it("scores fabricated schema at zero — it is a claim, not an optimisation", () => {
    const result = seoScore({ ...clean, fabricatedSchemaPresent: true });
    expect(result.value).toBe(0);
    expect(result.evidence).toContain("a claim, not an optimisation");
  });

  it("scores client-only primary content near the floor", () => {
    expect(seoScore({ ...clean, serverRenderedPrimaryContent: false }).value).toBe(2);
  });

  it("penalises an orphan page", () => {
    const result = seoScore({ ...clean, internalInboundLinks: 0 });
    expect(result.value).toBe(8);
    expect(result.evidence).toContain("orphan page");
  });

  it("does NOT penalise withholding unverified schema", () => {
    // Withholding is correct behaviour; scoring it down would create pressure
    // to fabricate, which §12 forbids outright.
    expect(seoScore(clean).value).toBe(10);
  });
});
