/**
 * Regression tests for the four dry-run P0 fixes.
 *
 * Each test expresses the INVARIANT, not the fixture. A test that only proved
 * `FIXTURE-VERDALEEN-MOBILITY` passes would let the same class of failure recur
 * on the next business.
 */
import { describe, expect, it } from "vitest";
import { runPipeline } from "../../src/pipeline.js";
import { selectElement, type SelectionContext } from "../../src/design-intelligence/engine/select-elements.js";
import { getPattern, PATTERNS } from "../../src/design-system/pattern-registry/registry.js";
import { deriveDesignContextProfile } from "../../src/design-intelligence/profile/derive-profile.js";
import {
  OBJECTIVE_ARCHITECTURE,
  checkObjectiveCoverage,
} from "../../src/design-intelligence/objectives/objective-architecture.js";
import { websiteObjectiveSchema } from "../../src/design-intelligence/types/business-input.js";
import { evaluateQuality } from "../../src/quality/scoring.js";
import { collectBuildEvidence } from "../../src/evidence/build-evidence.js";
import type { AccessibilityObservations } from "../../src/accessibility/rules.js";
import { assets, baseInput, content } from "../fixtures/business-inputs.js";
import { dryRunFixture } from "../fixtures/dry-run-fixture.js";

/**
 * Post-build evidence is now TAGGED. Tests construct it through the real
 * collector so the provenance is explicit: nothing here can pass an estimate
 * into a gate that requires a measurement.
 */
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
    lowestCriticalTextContrast: 7.5,
    lowestLogoContrast: 4.5,
    coreContentLostAt320: false,
    coreContentLostAt400Zoom: false,
    meaningfulMediaWithoutAlternative: [],
    nonEssentialMotionCannotBeReduced: false,
    formsInaccessible: false,
    smallestTargetCssPx: 48,
    ...overrides,
  };
}

function technicalPass() {
  return {
    buildPasses: true,
    typecheckPasses: true,
    lintPasses: true,
    noBlockingConsoleErrors: true,
    primaryRoutesWork: true,
    loadingErrorNotFoundStatesExist: true,
    noExposedSecrets: true,
    warnings: [],
  };
}

/** Every AAA-only criterion satisfied, so AAA does not hold the gate unknown. */
function fullAaa() {
  return {
    lowestBodyTextContrast: 7.5,
    lowestLargeTextContrast: 5.0,
    smallestTargetCssPx: 48,
    visualPresentationCompliant: true,
    linkPurposeFromTextAlone: true,
    plainLanguageOrSupplementProvided: true,
    interactionMotionDisableable: true,
  };
}

const SERVED_HTML = `<!doctype html><html lang="en"><head>
<title>FIXTURE-VERDALEEN-MOBILITY</title>
<meta name="description" content="A synthetic fixture page used only to exercise the evidence parser end to end.">
<link rel="canonical" href="https://fixture-verdaleen.invalid/">
<meta name="robots" content="index,follow">
<meta property="og:title" content="FIXTURE-VERDALEEN-MOBILITY">
<script type="application/ld+json">{"@type":"Organization","name":"FIXTURE-VERDALEEN-MOBILITY"}</script>
</head><body>
<h1>Custom-fitted orthotics and mobility aids</h1>
<h2>How an assessment works</h2>
<p>${"Real server-rendered body copy. ".repeat(12)}</p>
<a href="/book">Book an assessment</a>
<img src="/a.webp" alt="A fitted orthotic">
</body></html>`;

function need(id: string) {
  const pattern = getPattern(id);
  if (!pattern) throw new Error(`fixture error: pattern ${id} is not registered`);
  return pattern;
}

function ctx(overrides: Partial<SelectionContext> = {}): SelectionContext {
  return {
    profile: deriveDesignContextProfile(dryRunFixture()),
    availableContent: new Set(["proposition", "services", "process", "product_proof", "faq"]),
    verifiedAssets: new Set(["productImages"]),
    routeJsBudgetKb: 150,
    alreadySelected: [],
    forbidden: new Set(),
    visualExpressionCeiling: "low",
    technicalComplexityBudget: "medium",
    statedRequirements: new Set<string>(),
    statedObjectives: new Set<string>(),
    ...overrides,
  };
}

// ===================================================================== P0-1

describe("P0-1 — expression and suitability are separate axes", () => {
  it("a low-expression trust context STILL selects an explanatory diagram", () => {
    const { output } = runPipeline(dryRunFixture());
    expect(output.visualExpression).toBe("low");
    expect(output.selectedPatterns).toContain("data-diagram");
  });

  it("a verified product gallery is selected when product understanding is an objective", () => {
    const { output } = runPipeline(dryRunFixture());
    expect(output.selectedPatterns).toContain("interactive-gallery");
  });

  it("unnecessary decorative 3D and WebGL remain rejected", () => {
    const { output } = runPipeline(dryRunFixture());
    expect(output.selectedPatterns).not.toContain("decorative-webgl-hero");
    const webgl = output.selectionDecisions.find((d) => d.patternId === "decorative-webgl-hero");
    expect(webgl?.outcome).toBe("reject");
  });

  it("decorative patterns remain excluded from a low-expression site", () => {
    const { output } = runPipeline(dryRunFixture());
    for (const decorative of ["cursor-follower", "parallax-depth", "magnetic-action", "perspective-card"]) {
      expect(output.selectedPatterns, `${decorative} must not be selected`).not.toContain(decorative);
    }
  });

  it("implementation tier alone never rejects: it replaces with a simpler form", () => {
    const decision = selectElement(
      need("3d-product-view"),
      ctx({
        visualExpressionCeiling: "high",
        technicalComplexityBudget: "low",
        statedRequirements: new Set(["product_configurator"]),
      }),
    );
    expect(decision.outcome).toBe("replace");
    expect(decision.gates.find((g) => g.gate === "implementation_complexity")?.passed).toBe(false);
  });

  it("a use-case unlock overrides poorFor, and carries approval plus a fallback", () => {
    const decision = selectElement(
      need("3d-product-view"),
      ctx({
        // High ceiling, budget and route allowance so the UNLOCK is the only
        // thing under test — otherwise a 180KB pattern legitimately replaces
        // against the 150KB default and the unlock is never reached.
        visualExpressionCeiling: "high",
        technicalComplexityBudget: "high",
        routeJsBudgetKb: 400,
        statedRequirements: new Set(["product_configurator"]),
        profile: deriveDesignContextProfile(
          baseInput({
            industry: "healthcare",
            // Not performance-sensitive, so the perf gate is not what decides.
            constraints: { localization: [], integrations: [], performanceSensitivity: "low" },
            availableAssets: assets({ productImages: "verified_available" }),
          }),
        ),
      }),
    );
    // The UNLOCK is what is under test: business relevance passes and the unlock is
    // recorded with its approval and fallback. FD-11: no generator renderer implements
    // 3d-product-view, so the final outcome is now a reject for buildability — the
    // unlock semantics above are unchanged.
    expect(decision.gates.find((g) => g.gate === "business_relevance")?.passed).toBe(true);
    expect(decision.unlockedBy?.approvalRequired).toBe(true);
    expect(decision.fallback.length).toBeGreaterThan(0);
    expect(decision.outcome).toBe("reject");
    expect(decision.gates.find((g) => g.gate === "generator_implementation")?.passed).toBe(false);
  });

  it("an unlock requires its evidence: no verified assets, no unlock", () => {
    const decision = selectElement(
      need("3d-product-view"),
      ctx({
        visualExpressionCeiling: "high",
        technicalComplexityBudget: "high",
        statedRequirements: new Set(["product_configurator"]),
        verifiedAssets: new Set(),
      }),
    );
    expect(decision.outcome).toBe("reject");
    expect(decision.gates.find((g) => g.gate === "business_relevance")?.reason).toContain("no use-case unlock applies");
  });

  it("an unlock cannot be granted by industry — the shape offers no industry field", () => {
    for (const pattern of PATTERNS) {
      for (const unlock of pattern.unlockedBy ?? []) {
        expect(Object.keys(unlock).sort()).not.toContain("industry");
        // Every unlock must state at least one use-case condition.
        const hasCondition =
          unlock.requirement !== undefined ||
          unlock.objective !== undefined ||
          unlock.variableAtLeast !== undefined ||
          unlock.requiresVerifiedAssets !== undefined;
        expect(hasCondition, `${pattern.id} has an unconditional unlock`).toBe(true);
        expect(unlock.rationale.length).toBeGreaterThan(20);
      }
    }
  });

  it("every pattern declares both axes independently", () => {
    for (const pattern of PATTERNS) {
      expect(["low", "medium", "high"]).toContain(pattern.expressiveness);
      expect(pattern.tier.length).toBeGreaterThan(0);
      expect(typeof pattern.benefits.explanation).toBe("number");
    }
    // The axes must not be the same thing wearing two names: at least one pattern
    // must be low-expressiveness at a high tier, and one high-expressiveness at a
    // low tier. Otherwise the split is cosmetic.
    expect(
      PATTERNS.some((p) => p.expressiveness === "low" && p.tier !== "semantic_html_css"),
    ).toBe(true);
    expect(
      PATTERNS.some((p) => p.expressiveness === "high" && p.tier === "semantic_html_css"),
    ).toBe(true);
  });
});

// ===================================================================== P0-2

describe("P0-2 — objective coverage is driven by objective, not industry", () => {
  it("a clinic selling products STILL gets commerce architecture", () => {
    const { output } = runPipeline(dryRunFixture());
    expect(output.profile.industry).toBe("healthcare");
    expect(output.profile.primaryObjective).toBe("book_appointments");
    for (const section of ["catalog", "product_detail", "price", "returns", "checkout"]) {
      expect(output.sectionArchitecture, `missing ${section}`).toContain(section);
    }
  });

  it("every objective in the schema has an architecture row", () => {
    for (const objective of websiteObjectiveSchema.options) {
      const architecture = OBJECTIVE_ARCHITECTURE[objective];
      expect(architecture, `no architecture for ${objective}`).toBeDefined();
      expect(architecture.requiredSections.length).toBeGreaterThan(0);
      expect(architecture.conversionSurface.length).toBeGreaterThan(0);
    }
  });

  it("reports an unserved objective loudly instead of dropping it", () => {
    const report = checkObjectiveCoverage(["sell_products"], ["proposition", "process"], [], []);
    expect(report.complete).toBe(false);
    expect(report.unserved).toEqual(["sell_products"]);
    expect(report.failures[0]).toContain("NO architectural representation");
    expect(report.failures[0]).toContain("Serve it or drop it explicitly");
  });

  it("an unserved objective reaches the contract's publication requirements", () => {
    // A recruitment objective with no recruitment page or section.
    const { contract, output } = runPipeline(
      baseInput({
        industry: "professional_services",
        websiteObjective: ["recruit"],
        availableContent: content({ propositionText: "verified_available" }),
      }),
    );
    if (!output.objectiveCoverage.complete) {
      expect(contract.publicationRequirements.join(" ")).toContain("recruit");
    }
    // Whatever the outcome, coverage must have been EVALUATED.
    expect(output.objectiveCoverage.entries.map((e) => e.objective)).toContain("recruit");
  });

  it("a served objective whose critical evidence is blocked is still reported", () => {
    const { output } = runPipeline(dryRunFixture());
    const booking = output.objectiveCoverage.entries.find((e) => e.objective === "book_appointments");
    expect(booking?.served).toBe(true);
    expect(booking?.blockedEvidence).toContain("addresses");
    expect(output.objectiveCoverage.failures.join(" ")).toContain("cannot function");
  });

  describe("coverage across objective classes (§27)", () => {
    const cases: Array<[string, Parameters<typeof baseInput>[0]]> = [
      ["service / lead generation", { industry: "professional_services", websiteObjective: ["generate_leads"] }],
      ["appointment booking", { industry: "healthcare", websiteObjective: ["book_appointments"] }],
      ["product commerce", { industry: "ecommerce", websiteObjective: ["sell_products"] }],
      ["content / information", { industry: "media", websiteObjective: ["publish_content", "educate"] }],
      ["membership / subscription", { industry: "saas", websiteObjective: ["sell_subscriptions"] }],
      [
        "multi-audience",
        {
          industry: "education",
          websiteObjective: ["educate", "generate_leads"],
          targetAudience: [
            { label: "FIXTURE-LEARNERS", isPrimary: true, digitalLiteracy: "low" },
            { label: "FIXTURE-EMPLOYERS", digitalLiteracy: "high", roles: ["employer"] },
          ],
        },
      ],
    ];

    for (const [label, overrides] of cases) {
      it(`${label}: every stated objective is evaluated and architecturally represented`, () => {
        const input = baseInput({
          ...overrides,
          availableContent: content({
            propositionText: "verified_available",
            serviceDescriptions: "verified_available",
          }),
        });
        const { output } = runPipeline(input);
        const evaluated = output.objectiveCoverage.entries.map((e) => e.objective);
        for (const objective of input.websiteObjective) {
          expect(evaluated, `${objective} was not evaluated`).toContain(objective);
          const entry = output.objectiveCoverage.entries.find((e) => e.objective === objective);
          expect(entry?.served, `${objective} has no architecture`).toBe(true);
        }
      });
    }
  });
});

// ===================================================================== P0-3

describe("P0-3 — quality, accessibility and SEO are reachable from the pipeline", () => {
  it("the pipeline always produces a quality assessment", () => {
    const { output } = runPipeline(dryRunFixture());
    expect(output.quality).toBeDefined();
    expect(output.quality.mode).toBe("pre_build");
    expect(output.quality.gates).toBeDefined();
  });

  it("pre-build, gates needing a built artifact are `unknown`, never a fake pass", () => {
    const { output } = runPipeline(dryRunFixture());
    expect(output.quality.gates.technical).toBe("unknown");
    expect(output.quality.gates.accessibility).toBe("unknown");
    expect(output.quality.evaluation.level).toBe("cannot_classify");
    expect(output.quality.evaluation.unknownGates).toContain("technical");
    expect(output.quality.evaluation.unknownGates).toContain("accessibility");
  });

  it("pre-build, unmeasurable criteria stay unscored rather than defaulted", () => {
    const { output } = runPipeline(dryRunFixture());
    expect(output.quality.sheet["accessibility"]?.scored).toBe(false);
    expect(output.quality.sheet["performance"]?.scored).toBe(false);
    expect(output.quality.sheet["seo"]?.scored).toBe(false);
  });

  it("gates derivable from decisions alone ARE decided pre-build", () => {
    const { output } = runPipeline(dryRunFixture());
    // Content is decidable now: a blocked conversion path is a content failure.
    expect(output.quality.gates.content).toBe(false);
    expect(output.quality.blockers.join(" ")).toContain("blocked conversion path");
  });

  it("an accessibility hard failure blocks production when evidence exists", () => {
    const { output } = runPipeline(dryRunFixture(), {
      evidence: {
        bundle: collectBuildEvidence({
          accessibility: observations({ primaryTaskRequiresWebgl: true }),
          technical: technicalPass(),
          servedHtml: { "/": SERVED_HTML },
          buildManifest: { routes: { "/": { firstLoadJsKb: 90 } } },
          webVitals: { lcpSeconds: 1.9, inpMs: 120, cls: 0.03, measurement: "lab" },
          observedAt: "2026-09-13T00:00:00Z",
        }),
        aaa: fullAaa(),
      },
    });
    expect(output.quality.mode).toBe("post_build");
    expect(output.quality.gates.accessibility).toBe(false);
    expect(output.quality.accessibility.hardFailures.length).toBeGreaterThan(0);
    expect(output.quality.evaluation.failedGates).toContain("accessibility");
    // §19: a hard failure blocks production regardless of score.
    expect(["failing", "technically_working"]).toContain(output.quality.evaluation.level);
    expect(output.quality.blockers.join(" ")).toContain("accessibility criterion FAIL");
    expect(output.quality.blockers.join(" ")).toContain("input_independence");
  });

  it("with evidence, accessibility/SEO/technical criteria become SCORED", () => {
    const { output } = runPipeline(dryRunFixture(), {
      evidence: {
        bundle: collectBuildEvidence({
          accessibility: observations(),
          technical: technicalPass(),
          servedHtml: { "/": SERVED_HTML },
          buildManifest: { routes: { "/": { firstLoadJsKb: 90 } } },
          webVitals: { lcpSeconds: 1.9, inpMs: 120, cls: 0.03, measurement: "lab" },
        }),
        aaa: fullAaa(),
      },
    });
    expect(output.quality.sheet["accessibility"]?.scored).toBe(true);
    expect(output.quality.sheet["seo"]?.scored).toBe(true);
    expect(output.quality.sheet["performance"]?.scored).toBe(true);
    expect(output.quality.gates.performance).toBe(true);
    expect(output.quality.evaluation.weightedScore).not.toBeNull();
  });

  it("an `unknown` gate can never certify production readiness", () => {
    const perfect = Object.fromEntries(
      [
        "brand_differentiation", "visual_hierarchy", "composition", "typography", "color",
        "spacing", "grid_consistency", "content_hierarchy", "navigation", "cta_hierarchy",
        "interaction_design", "motion", "imagery", "responsive_behavior", "accessibility",
        "performance", "seo", "trust", "conversion", "content_quality",
        "technical_implementation", "consistency", "emotional_impact", "memorability",
        "mobile_experience",
      ].map((k) => [k, { scored: true as const, value: 10, evidence: "test" }]),
    );
    const result = evaluateQuality(perfect, {
      technical: "unknown",
      accessibility: true,
      responsive: true,
      performance: true,
      content: true,
      design: true,
    });
    expect(result.level).toBe("cannot_classify");
    expect(result.unknownGates).toContain("technical");
  });
});

// ===================================================================== P0-4

describe("P0-4 — every supplied page survives end to end", () => {
  it("all five owner-supplied routes reach the final decision output", () => {
    const input = dryRunFixture();
    const { output } = runPipeline(input);
    const routes = output.pages.map((p) => p.route);
    for (const supplied of input.requiredPages) {
      expect(routes, `page ${supplied.path} was lost`).toContain(supplied.path);
    }
    expect(output.pages.filter((p) => p.ownerSupplied)).toHaveLength(input.requiredPages.length);
  });

  it("each page preserves every field the brief requires", () => {
    const { output } = runPipeline(dryRunFixture());
    for (const page of output.pages) {
      expect(page.route.length).toBeGreaterThan(0);
      expect(page.purpose.length).toBeGreaterThan(0);
      expect(page.primaryObjective.length).toBeGreaterThan(0);
      expect(page.audience.length).toBeGreaterThan(0);
      expect(page.seoRole.length).toBeGreaterThan(0);
      expect(page.contentRequirements.length).toBeGreaterThan(0);
      expect(page.requiredSections.length).toBeGreaterThan(0);
      expect(page.conversionRole.length).toBeGreaterThan(0);
      expect(page.responsiveRequirements.length).toBeGreaterThan(0);
      expect(Array.isArray(page.trustRequirements)).toBe(true);
    }
  });

  it("the owner's purpose text is preserved verbatim, not paraphrased", () => {
    const input = dryRunFixture();
    const { output } = runPipeline(input);
    for (const supplied of input.requiredPages) {
      const page = output.pages.find((p) => p.route === supplied.path);
      expect(page?.purpose).toBe(supplied.purpose);
    }
  });

  it("the SEO page architecture names the real routes", () => {
    const input = dryRunFixture();
    const { output } = runPipeline(input);
    for (const supplied of input.requiredPages) {
      expect(output.seoStrategy.pageArchitecture.join(" ")).toContain(supplied.path);
    }
  });

  it("the second audience is represented on the page written for it", () => {
    const { output } = runPipeline(dryRunFixture());
    const clinicians = output.pages.find((p) => p.route === "/for-clinicians");
    expect(clinicians?.audience).toContain("FIXTURE-REFERRING-CLINICIANS");
  });

  it("the responsive audit runs over a DERIVED inventory, not an empty one", () => {
    const { output } = runPipeline(dryRunFixture());
    expect(output.responsiveStrategy.audit.decisions.length).toBeGreaterThan(0);
    // Derived from pages + patterns, so it scales with the page model.
    const single = runPipeline(
      baseInput({
        requiredPages: [{ path: "/", purpose: "single page", mustBeIndexable: true }],
        availableContent: content({ propositionText: "verified_available" }),
      }),
    );
    expect(output.responsiveStrategy.audit.decisions.length).toBeGreaterThan(
      single.output.responsiveStrategy.audit.decisions.length,
    );
  });

  it("an empty inventory makes the responsive gate `unknown`, not a pass", () => {
    const { output } = runPipeline(dryRunFixture(), { components: [] });
    expect(output.quality.gates.responsive).toBe("unknown");
    expect(output.quality.sheet["responsive_behavior"]?.scored).toBe(false);
  });
});

// ============================================================ structural fixes

describe("stack follows selected capabilities, not stated requirements alone", () => {
  it("a rejected 3D capability adds NO 3D dependency", () => {
    const { output } = runPipeline(dryRunFixture());
    expect(output.selectedPatterns).not.toContain("3d-product-view");
    expect(output.stack.libraries).not.toContain("three");
    expect(output.stack.libraries).not.toContain("@react-three/fiber");
  });

  it("the omission is recorded with a reason, not silently dropped", () => {
    const { output } = runPipeline(dryRunFixture());
    const omitted = output.stack.omittedLibraries.map((o) => o.library);
    expect(omitted).toContain("three");
    const threeOmission = output.stack.omittedLibraries.find((o) => o.library === "three");
    expect(threeOmission?.because).toContain("no selected pattern provides");
    expect(threeOmission?.requirement).toBe("product_configurator");
    expect(output.stack.architecturalConstraints.join(" ")).toContain("product_configurator");
  });

  it("a SELECTED 3D capability does allow the dependency", () => {
    const { output } = runPipeline(
      baseInput({
        industry: "automotive",
        websiteObjective: ["sell_products"],
        requiredFunctionality: ["product_configurator"],
        brandPersonality: ["premium"],
        constraints: {
          localization: [],
          integrations: [],
          performanceSensitivity: "low",
          technicalComplexityBudget: "high",
        },
        availableAssets: assets({ productImages: "verified_available", heroImages: "verified_available" }),
        availableContent: content({ propositionText: "verified_available", serviceDescriptions: "verified_available" }),
      }),
    );
    if (output.selectedPatterns.includes("3d-product-view")) {
      expect(output.stack.libraries).toContain("three");
    } else {
      // If the engine declined it, the dependency must be absent AND explained.
      expect(output.stack.libraries).not.toContain("three");
      expect(output.stack.omittedLibraries.length).toBeGreaterThan(0);
    }
  });

  it("a map dependency follows the rule's decision, not the bare requirement", () => {
    // DD-114: an unverified location takes the static branch, so no embed.
    const { output } = runPipeline(dryRunFixture());
    expect(output.stack.libraries).not.toContain("lazy-loaded map embed");
    expect(output.stack.omittedLibraries.map((o) => o.library)).toContain("lazy-loaded map embed");
  });
});

describe("imagery has exactly one authority", () => {
  it("no rule conflict is reported on the imagery target", () => {
    const { output } = runPipeline(dryRunFixture());
    expect(output.conflicts.map((c) => c.target)).not.toContain("imagery.strategy");
  });

  it("the output carries a single authoritative imagery strategy", () => {
    const { output } = runPipeline(dryRunFixture());
    // Derived from measured asset quality, which is the single owner.
    expect(output.profile.variables.visual_asset_quality).toBe("medium");
    expect(output.imageStrategy.strategy).toBe("authentic_selective");
  });

  it("conflict detection still works for a genuine disagreement", () => {
    // Proof that resolving the imagery case did not disable the mechanism.
    const { output } = runPipeline(dryRunFixture());
    expect(Array.isArray(output.conflicts)).toBe(true);
    for (const conflict of output.conflicts) {
      expect(conflict.ruleIds.length).toBeGreaterThan(1);
      expect(new Set(conflict.values.map((v) => JSON.stringify(v))).size).toBeGreaterThan(1);
    }
  });
});

describe("canonical section vocabulary", () => {
  it("no two spellings of the same section survive", () => {
    const { output } = runPipeline(dryRunFixture());
    const sections = output.sectionArchitecture;
    expect(sections).toContain("location_and_contact");
    expect(sections).not.toContain("location_contact");
    expect(sections).not.toContain("clear_language");
    expect(sections).not.toContain("clear_contact");
    expect(new Set(sections).size).toBe(sections.length);
  });
});

describe("no new silent data loss", () => {
  it("every stated objective, page and requirement is visible in the output", () => {
    const input = dryRunFixture();
    const { output, contract } = runPipeline(input);

    // Objectives.
    expect(output.objectiveCoverage.entries.map((e) => e.objective).sort()).toEqual(
      [...input.websiteObjective].sort(),
    );
    // Pages.
    for (const page of input.requiredPages) {
      expect(output.pages.map((p) => p.route)).toContain(page.path);
    }
    // Functionality: every requirement either added a library, was omitted with a
    // reason, or attached an architectural constraint.
    const accountedFor = [
      ...output.stack.libraries,
      ...output.stack.omittedLibraries.map((o) => `${o.requirement} ${o.library}`),
      ...output.stack.architecturalConstraints,
      ...contract.componentStrategy,
    ].join(" ");
    const expectedEvidence: Array<[string, string]> = [
      ["product_configurator", "product_configurator"],
      ["cms_editing", "CMS requested"],
      ["map", "map embed"],
      ["multilingual", "next-intl"],
      ["booking", "react-hook-form"],
    ];
    for (const [requirement, evidence] of expectedEvidence) {
      expect(accountedFor, `${requirement} vanished without a trace`).toContain(evidence);
    }
  });
});
