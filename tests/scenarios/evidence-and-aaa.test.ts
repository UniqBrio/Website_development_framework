import { describe, expect, it } from "vitest";
import { runPipeline } from "../../src/pipeline.js";
import {
  collectBuildEvidence,
  compareRouteInventory,
  noBuildEvidence,
  parseBuildManifest,
  parseServedHtml,
  seoObservationsFromHtml,
} from "../../src/evidence/build-evidence.js";
import {
  estimated,
  measured,
  requireGrounded,
  requireMeasured,
  unavailable,
} from "../../src/evidence/evidence-value.js";
import { evaluateAccessibility, thresholdsFor } from "../../src/accessibility/evaluate.js";
import { checkHardFailures } from "../../src/accessibility/rules.js";
import type { AccessibilityObservations } from "../../src/accessibility/rules.js";
import { baseInput, content } from "../fixtures/business-inputs.js";
import { dryRunFixture } from "../fixtures/dry-run-fixture.js";

function observations(overrides: Partial<AccessibilityObservations> = {}): AccessibilityObservations {
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

const FULL_AAA = {
  lowestBodyTextContrast: 7.5,
  lowestLargeTextContrast: 5.0,
  smallestTargetCssPx: 48,
  visualPresentationCompliant: true,
  linkPurposeFromTextAlone: true,
  plainLanguageOrSupplementProvided: true,
  interactionMotionDisableable: true,
};

const GOOD_HTML = `<!doctype html><html lang="en"><head>
<title>FIXTURE Home</title>
<meta name="description" content="A synthetic page long enough to exercise the parser end to end without fabricating a business.">
<link rel="canonical" href="https://fixture.invalid/">
<meta name="robots" content="index,follow">
<meta property="og:title" content="FIXTURE Home">
<meta name="twitter:card" content="summary">
<script type="application/ld+json">{"@type":"Organization","name":"FIXTURE"}</script>
</head><body>
<h1>Heading one</h1><h2>Heading two</h2><h3>Heading three</h3>
<p>${"Server-rendered body copy that is genuinely present in the document. ".repeat(6)}</p>
<a href="/book">Book</a><a href="/devices">Devices</a>
<img src="/a.webp" alt="described"><img src="/b.webp">
</body></html>`;

const CLIENT_ONLY_HTML = `<!doctype html><html><head><title>Shell</title></head>
<body><div id="root"></div><script>/* everything renders here */</script></body></html>`;

// ===================================================================== P1-3

describe("P1-3 — served HTML parsing produces real facts", () => {
  const facts = parseServedHtml("/", GOOD_HTML);

  it("extracts the metadata a generator must be checked against", () => {
    expect(facts.title).toBe("FIXTURE Home");
    expect(facts.canonical).toBe("https://fixture.invalid/");
    expect(facts.robots).toBe("index,follow");
    expect(facts.metaDescription).toContain("synthetic page");
    expect(facts.ogTags["og:title"]).toBe("FIXTURE Home");
    expect(facts.twitterTags["twitter:card"]).toBe("summary");
  });

  it("counts headings and detects skipped levels", () => {
    expect(facts.h1Count).toBe(1);
    expect(facts.headingOrder).toEqual([1, 2, 3]);
    expect(facts.headingSkips).toBe(false);
    const skipped = parseServedHtml("/x", "<h1>a</h1><h3>b</h3>");
    expect(skipped.headingSkips).toBe(true);
  });

  it("reads JSON-LD types and flags malformed blocks", () => {
    expect(facts.structuredDataTypes).toEqual(["Organization"]);
    const broken = parseServedHtml(
      "/x",
      '<script type="application/ld+json">{not json}</script>',
    );
    expect(broken.structuredDataTypes).toContain("<invalid-json-ld>");
  });

  it("counts images missing alt text", () => {
    expect(facts.imageCount).toBe(2);
    expect(facts.imagesWithoutAlt).toBe(1);
  });

  it("measures body text so client-only content is detectable", () => {
    expect(facts.bodyTextLength).toBeGreaterThan(200);
    expect(parseServedHtml("/", CLIENT_ONLY_HTML).bodyTextLength).toBeLessThan(50);
  });

  it("collects internal links for the inbound-link check", () => {
    expect(facts.internalLinks).toEqual(["/book", "/devices"]);
  });

  it("turns measured HTML into the EXISTING SEO observation contract", () => {
    const obs = seoObservationsFromHtml(facts, [facts]);
    expect(obs.serverRenderedPrimaryContent).toBe(true);
    expect(obs.singleH1).toBe(true);
    expect(obs.canonicalCorrect).toBe(true);
    expect(obs.imagesWithoutAlt).toBe(1);
  });

  it("detects duplicate titles across pages", () => {
    const a = parseServedHtml("/a", GOOD_HTML);
    const b = parseServedHtml("/b", GOOD_HTML);
    expect(seoObservationsFromHtml(a, [a, b]).uniqueTitleAndDescription).toBe(false);
  });
});

describe("P1-3 — the collector tags provenance and never invents", () => {
  it("with no artifacts, everything is unavailable with a note on what would produce it", () => {
    const bundle = noBuildEvidence();
    for (const [name, field] of Object.entries(bundle)) {
      expect(field.kind, `${name} should be unavailable`).toBe("unavailable");
      expect(field.value, `${name} must have no value`).toBeUndefined();
      expect(field.source.length, `${name} must say what would produce it`).toBeGreaterThan(20);
    }
  });

  it("supplied artifacts become MEASURED, and computed ones DERIVED", () => {
    const bundle = collectBuildEvidence({
      servedHtml: { "/": GOOD_HTML },
      buildManifest: { routes: { "/": { firstLoadJsKb: 88 } } },
      observedAt: "2026-09-13T00:00:00Z",
    });
    expect(bundle.servedHtml.kind).toBe("measured");
    expect(bundle.servedHtml.observedAt).toBe("2026-09-13T00:00:00Z");
    expect(bundle.bundles.kind).toBe("measured");
    // The route list is COMPUTED from the fetched HTML, so it is derived.
    expect(bundle.routeInventory.kind).toBe("derived");
    expect(bundle.routeInventory.value).toEqual(["/"]);
  });

  it("the absent-manifest note explicitly refuses the registry estimate", () => {
    expect(noBuildEvidence().bundles.source).toContain("ESTIMATE");
    expect(noBuildEvidence().bundles.source).toContain("may not stand in");
  });

  it("parses a build manifest and ignores malformed entries", () => {
    expect(parseBuildManifest({ routes: { "/a": { firstLoadJsKb: 10 }, "/b": {} } })).toEqual([
      { route: "/a", firstLoadJsKb: 10 },
    ]);
    expect(parseBuildManifest(null)).toEqual([]);
    expect(parseBuildManifest({ nope: 1 })).toEqual([]);
  });
});

describe("P1-3 negative — an estimate can never satisfy a measured gate", () => {
  it("requireMeasured refuses estimated and derived values", () => {
    expect(requireMeasured(measured(42, "real"))).toBe(42);
    expect(requireMeasured(estimated(42, "registry weightKb"))).toBeNull();
    expect(requireMeasured(unavailable<number>("nothing"))).toBeNull();
  });

  it("requireGrounded accepts derived but still refuses estimated", () => {
    expect(requireGrounded(measured(1, "m"))).toBe(1);
    expect(requireGrounded({ kind: "derived", value: 2, source: "d" })).toBe(2);
    expect(requireGrounded(estimated(3, "registry estimate"))).toBeNull();
  });

  it("an ESTIMATED bundle leaves the performance gate unknown, not passing", () => {
    const { output } = runPipeline(dryRunFixture(), {
      evidence: {
        bundle: {
          ...noBuildEvidence(),
          // Exactly the substitution the dry run warned about: registry metadata
          // dressed as a bundle measurement.
          bundles: estimated(
            [{ route: "/", firstLoadJsKb: 12 }],
            "responsive registry weightKb estimate",
          ),
        },
      },
    });
    expect(output.quality.gates.performance).toBe("unknown");
    expect(output.quality.sheet["performance"]?.scored).toBe(false);
    const shortfall = output.quality.shortfalls.find((s) => s.gate === "performance");
    expect(shortfall?.had).toBe("estimated");
    expect(shortfall?.detail).toContain("ESTIMATES");
  });

  it("a MEASURED bundle plus measured vitals passes the performance gate", () => {
    const { output } = runPipeline(dryRunFixture(), {
      evidence: {
        bundle: collectBuildEvidence({
          buildManifest: { routes: { "/": { firstLoadJsKb: 120 } } },
          webVitals: { lcpSeconds: 2.0, inpMs: 150, cls: 0.05, measurement: "field" },
        }),
      },
    });
    expect(output.quality.gates.performance).toBe(true);
  });

  it("measured bundles OVER budget fail the gate rather than leaving it unknown", () => {
    const { output } = runPipeline(dryRunFixture(), {
      evidence: {
        bundle: collectBuildEvidence({
          buildManifest: { routes: { "/": { firstLoadJsKb: 900 } } },
          webVitals: { lcpSeconds: 2.0, inpMs: 150, cls: 0.05, measurement: "field" },
        }),
      },
    });
    expect(output.quality.gates.performance).toBe(false);
    expect(output.quality.blockers.join(" ")).toContain("MEASURED first-load JS");
  });

  it("measured bundles within budget but UNMEASURED vitals stay unknown", () => {
    const { output } = runPipeline(dryRunFixture(), {
      evidence: {
        bundle: collectBuildEvidence({
          buildManifest: { routes: { "/": { firstLoadJsKb: 100 } } },
        }),
      },
    });
    expect(output.quality.gates.performance).toBe("unknown");
    expect(output.quality.shortfalls.some((s) => s.needs.includes("LCP/INP/CLS"))).toBe(true);
  });

  it("provenance is reported for every evidence field", () => {
    const { output } = runPipeline(dryRunFixture(), {
      evidence: { bundle: collectBuildEvidence({ servedHtml: { "/": GOOD_HTML } }) },
    });
    const provenance = output.quality.evidenceProvenance.join("\n");
    expect(provenance).toContain("servedHtml: measured");
    expect(provenance).toContain("technical: unavailable");
  });
});

describe("P1-3 — route inventory cross-check catches post-decision loss", () => {
  it("reports a planned page the build never produced", () => {
    const { output } = runPipeline(dryRunFixture(), {
      evidence: { bundle: collectBuildEvidence({ servedHtml: { "/": GOOD_HTML } }) },
    });
    expect(output.quality.routeInventory.compared).toBe(true);
    expect(output.quality.routeInventory.missingFromBuild).toContain("/devices");
    expect(output.quality.blockers.join(" ")).toContain("was NOT produced by the build");
  });

  it("reports an unplanned route the build produced", () => {
    const pages = runPipeline(dryRunFixture()).output.pages;
    const bundle = collectBuildEvidence({
      servedHtml: Object.fromEntries([
        ...pages.map((p) => [p.route, GOOD_HTML]),
        ["/surprise", GOOD_HTML],
      ]),
    });
    const comparison = compareRouteInventory(pages, bundle);
    expect(comparison.unplannedInBuild).toEqual(["/surprise"]);
    expect(comparison.missingFromBuild).toEqual([]);
  });

  it("does NOT claim a comparison it could not run", () => {
    const { output } = runPipeline(dryRunFixture());
    expect(output.quality.routeInventory.compared).toBe(false);
    expect(output.quality.routeInventory.missingFromBuild).toEqual([]);
  });
});

describe("P1-3 negative — SEO cannot be scored from the plan", () => {
  it("without served HTML the SEO criterion is unscored and a shortfall is raised", () => {
    const { output } = runPipeline(dryRunFixture());
    expect(output.quality.sheet["seo"]?.scored).toBe(false);
    const shortfall = output.quality.shortfalls.find((s) => s.gate === "seo");
    expect(shortfall?.detail).toContain("a plan cannot evidence itself");
  });

  it("client-only content scores near the floor once measured", () => {
    const { output } = runPipeline(dryRunFixture(), {
      evidence: { bundle: collectBuildEvidence({ servedHtml: { "/": CLIENT_ONLY_HTML } }) },
    });
    const seo = output.quality.sheet["seo"];
    expect(seo?.scored).toBe(true);
    if (seo?.scored) expect(seo.value).toBeLessThanOrEqual(2);
  });

  it("scores the WORST page, not the average", () => {
    const { output } = runPipeline(dryRunFixture(), {
      evidence: {
        bundle: collectBuildEvidence({
          servedHtml: { "/": GOOD_HTML, "/bad": CLIENT_ONLY_HTML },
        }),
      },
    });
    const seo = output.quality.sheet["seo"];
    if (seo?.scored) {
      expect(seo.value).toBeLessThanOrEqual(2);
      expect(seo.evidence).toContain("worst page");
    }
  });
});

// ===================================================================== P1-4

describe("P1-4 — AAA is enforced, not merely stated", () => {
  it("AAA raises the contrast and target thresholds", () => {
    const aa = thresholdsFor("wcag_aa");
    const aaa = thresholdsFor("wcag_aaa_or_equivalent");
    expect(aa.bodyText).toBe(4.5);
    expect(aaa.bodyText).toBe(7.0);
    expect(aa.largeText).toBe(3.0);
    expect(aaa.largeText).toBe(4.5);
    expect(aa.targetSizeCssPx).toBe(24);
    expect(aaa.targetSizeCssPx).toBe(44);
  });

  it("the pipeline preserves the requested target and publishes its thresholds", () => {
    const { output } = runPipeline(dryRunFixture());
    expect(output.accessibilityStrategy.target).toBe("wcag_aaa_or_equivalent");
    expect(output.accessibilityStrategy.thresholds.bodyText).toBe(7.0);
    expect(output.quality.accessibility.requestedTarget).toBe("wcag_aaa_or_equivalent");
  });

  it("contrast that passes AA but fails AAA is a FAILURE when AAA was requested", () => {
    const obs = observations({ lowestCriticalTextContrast: 5.2 });
    // Under AA this is fine.
    expect(checkHardFailures(obs, thresholdsFor("wcag_aa"))).toEqual([]);
    // Under AAA it is a hard failure — the silent downgrade is gone.
    const aaaFailures = checkHardFailures(obs, thresholdsFor("wcag_aaa_or_equivalent"));
    expect(aaaFailures.map((f) => f.rule)).toContain("critical_text_contrast");
    expect(aaaFailures[0]?.detail).toContain("7:1");
  });

  it("a 32px target passes AA and fails AAA", () => {
    const obs = observations({ smallestTargetCssPx: 32 });
    expect(checkHardFailures(obs, thresholdsFor("wcag_aa"))).toEqual([]);
    expect(
      checkHardFailures(obs, thresholdsFor("wcag_aaa_or_equivalent")).map((f) => f.rule),
    ).toContain("target_size");
  });

  it("AAA adds criteria that AA does not require", () => {
    const aa = evaluateAccessibility("wcag_aa", observations());
    const aaa = evaluateAccessibility("wcag_aaa_or_equivalent", observations(), FULL_AAA);
    const aaaOnly = aaa.criteria.filter((c) => c.aaaOnly).map((c) => c.id);
    expect(aaaOnly).toContain("visual_presentation");
    expect(aaaOnly).toContain("link_purpose");
    expect(aa.criteria.map((c) => c.id)).not.toContain("visual_presentation");
  });
});

describe("P1-4 negative — unknown never satisfies a mandatory requirement", () => {
  it("AAA requested with NO AAA observations leaves the gate unknown, not passing", () => {
    // Every AA criterion passes; only the AAA-only ones are unobserved.
    const result = evaluateAccessibility("wcag_aaa_or_equivalent", observations(), {});
    expect(result.failed).toEqual([]);
    expect(result.gate).toBe("unknown");
    expect(result.unclassifiedMandatory.length).toBeGreaterThan(0);
    expect(result.explanation).toContain("may not be treated as a pass");
  });

  it("the same observations DO pass at AA — proving AAA changed the outcome", () => {
    expect(evaluateAccessibility("wcag_aa", observations()).gate).toBe(true);
    expect(evaluateAccessibility("wcag_aaa_or_equivalent", observations(), {}).gate).toBe("unknown");
  });

  it("an unknown accessibility gate cannot be scored, so it cannot inflate quality", () => {
    const result = evaluateAccessibility("wcag_aaa_or_equivalent", observations(), {});
    expect(result.score).toBeNull();
  });

  it("a single unclassified AAA criterion is enough to hold the gate", () => {
    const result = evaluateAccessibility("wcag_aaa_or_equivalent", observations(), {
      ...FULL_AAA,
      linkPurposeFromTextAlone: undefined,
    });
    expect(result.gate).toBe("unknown");
    expect(result.unclassifiedMandatory.map((c) => c.id)).toEqual(["link_purpose"]);
  });

  it("fully observed AAA passes and scores", () => {
    const result = evaluateAccessibility("wcag_aaa_or_equivalent", observations(), FULL_AAA);
    expect(result.gate).toBe(true);
    expect(result.score).toBe(10);
  });

  it("a FAILURE outranks an absence: fail beats unknown", () => {
    const result = evaluateAccessibility(
      "wcag_aaa_or_equivalent",
      observations({ focusVisible: false }),
      {},
    );
    expect(result.gate).toBe(false);
    expect(result.failed.map((c) => c.id)).toContain("focus_visible");
  });

  it("a not-applicable criterion is neither a pass nor a blocker", () => {
    const result = evaluateAccessibility("wcag_aaa_or_equivalent", observations(), {
      ...FULL_AAA,
      signLanguageForPrerecordedAudio: "no_such_media",
    });
    const sign = result.criteria.find((c) => c.id === "sign_language");
    expect(sign?.status).toBe("not_applicable");
    expect(sign?.mandatory).toBe(false);
    expect(result.gate).toBe(true);
  });

  it("with no observations at all, every mandatory criterion is unknown", () => {
    const result = evaluateAccessibility("wcag_aaa_or_equivalent", undefined);
    expect(result.gate).toBe("unknown");
    expect(result.score).toBeNull();
    expect(result.criteria.every((c) => c.status === "unknown")).toBe(true);
    expect(result.requestedTarget).toBe("wcag_aaa_or_equivalent");
  });

  it("an AAA site cannot reach production_ready on AA-only evidence", () => {
    const { output } = runPipeline(dryRunFixture(), {
      evidence: {
        bundle: collectBuildEvidence({
          accessibility: observations(),
          technical: {
            buildPasses: true,
            typecheckPasses: true,
            lintPasses: true,
            noBlockingConsoleErrors: true,
            primaryRoutesWork: true,
            loadingErrorNotFoundStatesExist: true,
            noExposedSecrets: true,
            warnings: [],
          },
          servedHtml: { "/": GOOD_HTML },
          buildManifest: { routes: { "/": { firstLoadJsKb: 100 } } },
          webVitals: { lcpSeconds: 2.0, inpMs: 150, cls: 0.05, measurement: "field" },
        }),
        // No AAA observations supplied.
        aaa: {},
      },
    });
    expect(output.quality.gates.accessibility).toBe("unknown");
    expect(["cannot_classify", "technically_working"]).toContain(output.quality.evaluation.level);
    expect(output.quality.evaluation.unknownGates).toContain("accessibility");
  });

  it("a baseline-target site is unaffected by the AAA criteria", () => {
    const { output } = runPipeline(
      baseInput({
        constraints: { localization: [], integrations: [], accessibilityRequirement: "wcag_aa" },
        availableContent: content({ propositionText: "verified_available" }),
      }),
      {
        evidence: { bundle: collectBuildEvidence({ accessibility: observations() }) },
      },
    );
    expect(output.quality.accessibility.requestedTarget).toBe("wcag_aa");
    expect(output.quality.gates.accessibility).toBe(true);
  });
});

// ============================================================ token gate wiring

describe("P1 cross-system — tokens gate the design check", () => {
  it("the design gate requires token values to exist and be valid", () => {
    const { output } = runPipeline(dryRunFixture());
    expect(output.quality.gates.design).toBe(true);
    expect(output.tokens.color.values.contrastFailures).toEqual([]);
  });

  it("colour and typography are now SCORED from real token evidence", () => {
    const { output } = runPipeline(dryRunFixture());
    expect(output.quality.sheet["color"]?.scored).toBe(true);
    expect(output.quality.sheet["typography"]?.scored).toBe(true);
    expect(output.quality.sheet["spacing"]?.scored).toBe(true);
    expect(output.quality.sheet["grid_consistency"]?.scored).toBe(true);
    const color = output.quality.sheet["color"];
    if (color?.scored) expect(color.evidence).toContain("measured pairs");
  });
});
