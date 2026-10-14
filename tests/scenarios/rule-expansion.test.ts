/**
 * RULE EXPANSION — the 68 new rules, proven by BEHAVIOUR, not by count.
 *
 * Every describe block below names the domain and the rule ids it protects. Each
 * rule gets, where it applies:
 *   - a UNIT test: the rule's effect reaches the decision surface;
 *   - an INTEGRATION test: that decision changes generated output or a gate;
 *   - a NEGATIVE test: when the rule's condition does not hold, the output does
 *     NOT change (so the rule is not merely always-on decoration);
 *   - a CONFLICT test where two rules can meet.
 *
 * Fixtures are synthetic (`FIXTURE-*`) and enter only through BusinessInput.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runPipeline } from "../../src/pipeline.js";
import { generateWebsite } from "../../src/generation/generate-website.js";
import { walkNodes, type ComponentNode } from "../../src/generation/component-model.js";
import { NEVER_GENERATED } from "../../src/generation/content-values.js";
import {
  ALL_RULES,
  INTENTIONALLY_NOT_ENCODED,
  getRule,
  ruleCoverage,
} from "../../src/design-intelligence/rules/index.js";
import { evaluateRules } from "../../src/design-intelligence/engine/evaluator.js";
import { deriveFacts } from "../../src/design-intelligence/engine/derive-facts.js";
import { deriveDesignContextProfile } from "../../src/design-intelligence/profile/derive-profile.js";
import {
  SELECTION_CAPS,
  selectElement,
  type SelectionContext,
} from "../../src/design-intelligence/engine/select-elements.js";
import { getPattern } from "../../src/design-system/pattern-registry/registry.js";
import {
  CORE_MINIMUM,
  CRITERIA,
  QUALITY_THRESHOLDS,
  WORLD_CLASS_MINIMUM,
  evaluateQuality,
  type GateStatus,
  type ScoreSheet,
} from "../../src/quality/scoring.js";
import { verifyContent } from "../../src/content/verification.js";
import { parseServedHtml, seoObservationsFromHtml } from "../../src/evidence/build-evidence.js";
import { seoScore } from "../../src/seo/strategy.js";
import { transformComponent } from "../../src/responsive/transformations.js";
import { MANDATORY_TEST_PROFILES, defaultCapabilities } from "../../src/responsive/capabilities.js";
import type { BusinessInput } from "../../src/design-intelligence/types/business-input.js";
import {
  assets,
  baseInput,
  content,
  fixtureCreativePortfolio,
  fixtureEcommerce,
  fixtureHealthcare,
  fixtureSaas,
} from "../fixtures/business-inputs.js";
import { dryRunFixture } from "../fixtures/dry-run-fixture.js";

// ------------------------------------------------------------------ helpers

function decide(input: BusinessInput) {
  return runPipeline(input);
}

function generate(
  input: BusinessInput,
  suppliedContent?: unknown,
  formEndpoints?: Partial<Record<"booking" | "enquiry" | "signup" | "checkout", string>>,
) {
  const { output, contract } = runPipeline(input);
  const site = generateWebsite(input, output, contract, {
    ...(suppliedContent ? { suppliedContent } : {}),
    ...(formEndpoints ? { formEndpoints } : {}),
  });
  return { output, contract, site };
}

/** Synthetic HOST endpoint configuration. Never a real URL; a host supplies these. */
const FIXTURE_ENDPOINTS = {
  booking: "/fixture-host/booking",
  enquiry: "/fixture-host/enquiry",
  signup: "/fixture-host/signup",
  checkout: "/fixture-host/checkout",
} as const;

function nodesOf(site: ReturnType<typeof generate>["site"], route: string): ComponentNode[] {
  const out: ComponentNode[] = [];
  walkNodes(site.model, (n, page) => {
    if (page.route === route) out.push(n);
  });
  return out;
}

function staticHtml(site: ReturnType<typeof generate>["site"], route: string): string {
  const path = route === "/" ? "static/index.html" : `static${route}/index.html`;
  return site.files[path] ?? "";
}

/** A verified, mobile-first booking business whose conversion endpoint is real. */
function verifiedBookingBusiness(overrides: Partial<Parameters<typeof baseInput>[0]> = {}): BusinessInput {
  return baseInput({
    businessName: "FIXTURE-VERIFIED-BOOKING",
    industry: "local_business",
    description: "Synthetic fixture with a verified contact route.",
    websiteObjective: ["book_appointments"],
    targetAudience: [{ label: "FIXTURE-VISITORS", isPrimary: true, mobileShare: 0.82 }],
    servicesProducts: [
      { name: "FIXTURE-SERVICE-A", kind: "service", customerSupplied: true },
      { name: "FIXTURE-SERVICE-B", kind: "service", customerSupplied: true },
      { name: "FIXTURE-SERVICE-C", kind: "service", customerSupplied: true },
    ],
    availableContent: content({
      propositionText: "verified_available",
      contactDetails: "verified_available",
      serviceDescriptions: "verified_available",
    }),
    ...overrides,
  });
}

const VERIFIED_CONTACT = {
  contactDetails: { phone: "FIXTURE-PHONE", email: "fixture@example.invalid", addressLines: ["FIXTURE-ADDRESS"] },
};

// =================================================================== traceability

describe("traceability: rule → consumer → decision → output", () => {
  it("every encoded rule declares a classification, a § source section and a consumer", () => {
    for (const rule of ALL_RULES) {
      expect(["executable", "gate", "scoring", "approval"], rule.id).toContain(rule.classification);
      expect(rule.sourceSection, rule.id).toMatch(/^§4\.\d+$/);
      expect(rule.consumer.length, rule.id).toBeGreaterThan(0);
    }
  });

  it("every named consumer module exists AND cites the rule id it consumes", () => {
    for (const rule of ALL_RULES) {
      if (rule.consumer === "evaluator") continue;
      const path = join("src", rule.consumer);
      expect(existsSync(path), `${rule.id} names missing consumer ${rule.consumer}`).toBe(true);
      expect(readFileSync(path, "utf8"), `${rule.consumer} does not cite ${rule.id}`).toContain(rule.id);
    }
  });

  it("every rule id and its § section are verified against the specification's own headings", () => {
    const spec = readFileSync("website-design-decision-specification.md", "utf8");
    // Map each DD heading to the §4.x section it sits under.
    const sectionOf = new Map<string, string>();
    let current = "";
    for (const line of spec.split(/\r?\n/)) {
      const section = /^## (4\.\d+)\b/.exec(line);
      if (section?.[1]) current = `§${section[1]}`;
      const heading = /^### (DD-\d{3})\b/.exec(line);
      if (heading?.[1]) sectionOf.set(heading[1], current);
    }
    for (const rule of ALL_RULES) {
      expect(sectionOf.has(rule.id), `${rule.id} is not a heading in the specification`).toBe(true);
      expect(rule.sourceSection, `${rule.id} cites the wrong section`).toBe(sectionOf.get(rule.id));
    }
    for (const omitted of INTENTIONALLY_NOT_ENCODED) {
      expect(sectionOf.has(omitted.id), `${omitted.id} (omitted) is not in the specification`).toBe(true);
    }
  });

  it("coverage is 103 encoded + 17 intentionally not encoded + 0 pending, reported by classification", () => {
    const coverage = ruleCoverage();
    expect(coverage.encodedCount).toBe(103);
    expect(coverage.intentionallyNotEncodedCount).toBe(17);
    expect(coverage.pendingCount).toBe(0);
    const c = coverage.byClassification;
    expect(c.executable + c.gate + c.scoring + c.approval).toBe(103);
  });

  it("the generated site cites the rules that shaped it, so output walks back to a rule", () => {
    // A host-configured checkout endpoint, so the CTA rules (DD-035..DD-037) have an action to shape.
    const { site } = generate(dryRunFixture(), undefined, FIXTURE_ENDPOINTS);
    for (const id of ["DD-030", "DD-031", "DD-032", "DD-033", "DD-035", "DD-036", "DD-037", "DD-067", "DD-069", "DD-078", "DD-089", "DD-096", "DD-106"]) {
      expect(site.manifest.rulesCited, `${id} left no trace in generated output`).toContain(id);
    }
    // No intentionally-omitted rule may be claimed as shaping output.
    for (const omitted of INTENTIONALLY_NOT_ENCODED) {
      expect(site.manifest.rulesCited).not.toContain(omitted.id);
    }
  });
});

// =================================================================== conflicts + order

describe("conflict semantics are preserved across 103 rules", () => {
  it("an industry-vs-personality disagreement is RESOLVED by declared precedence, with the overridden write recorded (DD-011 over DD-014)", () => {
    // DD-014 is blocked by its own `unless` when no quality imagery exists, so the
    // fixture supplies verified imagery; otherwise there is honestly no conflict.
    const { output } = decide(
      baseInput({
        industry: "fitness",
        brandPersonality: ["premium"],
        businessName: "FIXTURE-FITNESS",
        availableAssets: assets({ heroImages: "verified_available", portfolioImages: "verified_available", productImages: "verified_available", teamPhotos: "verified_available" }),
      }),
    );
    expect(output.conflicts.find((c) => c.target === "typography.strategy")).toBeUndefined();
    const resolution = output.precedenceResolutions.find((r) => r.target === "typography.strategy");
    expect(resolution?.winner).toMatchObject({ ruleIds: ["DD-011"], tier: "context", value: "bold_display_plus_readable_body" });
    expect(resolution?.overridden).toEqual([{ ruleId: "DD-014", value: "refined_display_plus_legible_body", tier: "personality" }]);
    expect(output.decisions["typography.strategy"]).toBe("bold_display_plus_readable_body");
  });

  it("DD-017 and DD-027 write the GRID axis, so an editorial creative business carries no false conflict", () => {
    const { output } = decide(fixtureCreativePortfolio());
    expect(output.conflicts).toEqual([]);
    expect(output.layoutStrategy["grid"]).toBe("editorial_grid");
    // The industry rule still owns the system.
    expect(output.layoutStrategy["system"]).toBe(output.decisions["layout.system"]);
  });

  it("evaluation is order-independent: forbids, obligations, caps, conflicts and agreed values match when reversed", () => {
    for (const input of [dryRunFixture(), fixtureCreativePortfolio(), baseInput({ industry: "fitness", brandPersonality: ["premium"] })]) {
      const profile = deriveDesignContextProfile(input);
      const facts = { ...profile, ...deriveFacts(input, profile), framework: "nextjs", targetQuality: "professionally_designed" };
      const forward = evaluateRules(facts, ALL_RULES);
      const reversed = evaluateRules(facts, [...ALL_RULES].reverse());
      expect(reversed.forbidden).toEqual(forward.forbidden);
      expect(reversed.obligations).toEqual(forward.obligations);
      const targets = (r: typeof forward) => r.conflicts.map((c) => c.target).sort();
      expect(targets(reversed)).toEqual(targets(forward));
      const conflicted = new Set(targets(forward));
      for (const [key, value] of Object.entries(forward.draft)) {
        if (conflicted.has(key) || key === "sectionArchitecture") continue;
        expect(reversed.draft[key], `${key} depends on evaluation order`).toEqual(value);
      }
      expect(new Set(reversed.draft["sectionArchitecture"] as string[])).toEqual(
        new Set(forward.draft["sectionArchitecture"] as string[]),
      );
    }
  });

  it("a cap stays monotonic: DD-072's measure cap can only shorten the reading measure", () => {
    const { site } = generate(dryRunFixture());
    const css = site.files["static/styles.css"] ?? "";
    expect(css).toContain("min(var(--measure), 80ch)");
  });
});

// =================================================================== direction §4.1/4.2

describe("remaining industry and personality rules DD-009, DD-011, DD-012, DD-017", () => {
  const imagery = assets({ heroImages: "verified_available", portfolioImages: "verified_available", productImages: "verified_available" });

  it("DD-009: hospitality with strong imagery caps motion and adds booking/amenities architecture", () => {
    const { output } = decide(baseInput({ industry: "hospitality", availableAssets: imagery }));
    expect(output.decisions["hero.pattern"]).toBe("art_directed_media_plus_booking_action");
    // C1: "policies" is the hospitality baseline's spelling of the legal-policy
    // section, canonicalised to `disclosures` by the section registry (FD-08 class).
    expect(output.sectionArchitecture).toEqual(expect.arrayContaining(["amenities", "disclosures"]));
  });

  it("DD-009 negative: a mobile-dominant hospitality audience blocks it (its own unless), so no amenities section", () => {
    const { output } = decide(
      baseInput({ industry: "hospitality", availableAssets: imagery, targetAudience: [{ label: "FIXTURE-GUESTS", isPrimary: true, mobileShare: 0.9 }] }),
    );
    expect(output.decisions["hero.pattern"]).not.toBe("art_directed_media_plus_booking_action");
    expect(output.obligations.join()).toContain("DD-009 fallback");
  });

  it("DD-011: sports/fitness caps motion at medium and adds schedule/registration architecture", () => {
    const { output } = decide(baseInput({ industry: "fitness" }));
    expect(output.sectionArchitecture).toEqual(expect.arrayContaining(["schedule", "registration"]));
    expect(output.decisions["motion.cap"]).toBe("medium");
  });

  it("DD-012: a dense media business gets a reading rail and an article index; a sparse one does not", () => {
    const offers = Array.from({ length: 18 }, (_, i) => ({ name: `FIXTURE-TOPIC-${i + 1}`, kind: "service" as const }));
    const dense = decide(baseInput({ industry: "media", servicesProducts: offers })).output;
    expect(dense.decisions["layout.system"]).toBe("reading_rail_plus_supporting_navigation");
    expect(dense.sectionArchitecture).toContain("article_index");
    const sparse = decide(baseInput({ industry: "media" })).output;
    expect(sparse.sectionArchitecture).not.toContain("article_index");
  });
});

// =================================================================== layout §4.4

describe("layout rules DD-022..DD-032", () => {
  it("DD-030: verified product imagery → split hero; none → vertical hero, in model AND served HTML", () => {
    const withProof = generate(fixtureSaas());
    const hero = nodesOf(withProof.site, "/").find((n) => n.kind === "hero");
    expect(hero?.layout).toBe("split");
    expect(staticHtml(withProof.site, "/")).toContain('class="c-hero c-hero--split"');

    const without = generate(fixtureHealthcare());
    const plainHero = nodesOf(without.site, "/").find((n) => n.kind === "hero");
    expect(plainHero?.layout).toBe("vertical");
    expect(staticHtml(without.site, "/")).not.toContain("c-hero--split");
  });

  it("DD-031: the hero answers for-whom from the stated audience, and slots the next step when conversion is blocked", () => {
    const { site } = generate(fixtureHealthcare());
    const nodes = nodesOf(site, "/");
    expect(nodes.find((n) => n.id === "hero-audience")?.text).toBe("For FIXTURE-PATIENTS");
    const nextStep = nodes.find((n) => n.id === "hero-next-step-slot");
    expect(nextStep?.kind).toBe("content_slot");
    expect(nodes.some((n) => n.kind === "action")).toBe(false);
  });

  it("DD-032: a regulated purchase cycle moves proof ahead of the conversion section", () => {
    const { site } = generate(fixtureHealthcare());
    const page = site.model.pages.find((p) => p.page.route === "/");
    expect(page?.reorderedBy).toBe("DD-032");
    expect(page?.page.requiredSections.indexOf("booking")).toBeLessThan(
      page?.page.requiredSections.indexOf("location_and_contact") ?? -1,
    );
    expect(page?.sectionOrder.indexOf("booking")).toBeGreaterThan(page?.sectionOrder.indexOf("location_and_contact") ?? 99);
  });

  it("DD-032 negative: an immediate purchase cycle keeps the spec order", () => {
    const { site } = generate(fixtureEcommerce());
    for (const page of site.model.pages) expect(page.reorderedBy).toBeNull();
  });

  it("DD-026/DD-028/DD-029: an ineligible layout is rejected at gate 1 citing the rule that forbade it", () => {
    const { output } = decide(fixtureHealthcare());
    for (const [pattern, rule] of [["bento-grid", "DD-026"], ["asymmetric-composition", "DD-028"], ["full-bleed-media", "DD-029"]] as const) {
      const decision = output.selectionDecisions.find((d) => d.patternId === pattern);
      expect(decision?.outcome, pattern).toBe("reject");
      expect(decision?.explanation, pattern).toContain(rule);
    }
  });

  it("DD-028 negative: a creative business with verified imagery is NOT forbidden asymmetry", () => {
    const { output } = decide(fixtureCreativePortfolio());
    // The RULE is what is under test: asymmetry is allowed for this business. FD-11:
    // asymmetric-composition has no generator renderer, so it is not selected — the
    // rule's decision is unchanged and the pattern is not forbidden.
    expect(output.decisions["layout.asymmetryAllowed"]).toBe(true);
    expect(output.forbidden).not.toContain("asymmetric-composition");
    const asymmetry = output.selectionDecisions.find((d) => d.patternId === "asymmetric-composition");
    expect(asymmetry?.gates.find((g) => g.gate === "business_relevance")?.passed).toBe(true);
    expect(asymmetry?.gates.find((g) => g.gate === "generator_implementation")?.passed).toBe(false);
  });

  it("DD-025/DD-067: three or more comparable offers → auto-fit minmax grid in the served CSS; fewer → single column", () => {
    const many = generate(verifiedBookingBusiness()).site.files["static/styles.css"] ?? "";
    expect(many).toContain("repeat(auto-fit, minmax(min(100%, var(--card-min)), 1fr))");

    const few = generate(baseInput({ servicesProducts: [{ name: "FIXTURE-ONE", kind: "service" }] })).site.files["static/styles.css"] ?? "";
    expect(few).not.toContain("auto-fit");
    expect(few).toContain("DD-025 layout.repeatedItems=single_column_list");
  });

  it("DD-023: large display type only with high brand expression; moderate otherwise", () => {
    const expressive = generate(dryRunFixture()).site.files["static/styles.css"] ?? "";
    expect(expressive).toContain("DD-023 typography.displayScale=large_allowed");
    const plain = generate(baseInput()).site.files["static/styles.css"] ?? "";
    expect(plain).toContain("DD-023 typography.displayScale=moderate");
    expect(plain).not.toContain("large_allowed");
  });
});

// =================================================================== navigation + CTA §4.5

describe("navigation and call-to-action rules DD-033..DD-037", () => {
  it("DD-033: the current page is marked aria-current in both hosts", () => {
    const { site } = generate(dryRunFixture());
    expect(staticHtml(site, "/devices")).toContain('<a href="/devices" aria-current="page">');
    expect(staticHtml(site, "/devices")).not.toContain('<a href="/" aria-current="page">');
    expect(site.files["next/app/devices/page.tsx"]).toContain('href="/devices" aria-current="page"');
  });

  it("DD-035: the label names the stated objective's outcome, never an unstated offer", () => {
    const { site } = generate(fixtureSaas(), undefined, FIXTURE_ENDPOINTS);
    // FD-16: derived objective pages are named for the visitor, not the enum id.
    const trial = site.model.pages.find((p) => p.page.route === "/start");
    expect(trial?.cta).toMatchObject({ state: "present", label: "Start a free trial" });
    const html = staticHtml(site, "/start");
    expect(html).toContain(">Start a free trial</a>");
    expect(html).not.toContain("Contact us");
  });

  it("DD-035: a label names the destination's outcome, so a checkout jump never reads as browsing", () => {
    const { site } = generate(dryRunFixture(), undefined, FIXTURE_ENDPOINTS);
    const devices = site.model.pages.find((p) => p.page.route === "/devices");
    expect(devices?.cta).toMatchObject({ state: "present", label: "Go to checkout", href: "#checkout-form" });
    expect(staticHtml(site, "/devices")).not.toContain("Browse products");
  });

  it("DD-035 negative: with no host endpoint the checkout action is WITHHELD, not promoted", () => {
    const { site } = generate(dryRunFixture());
    const devices = site.model.pages.find((p) => p.page.route === "/devices");
    expect(devices?.cta.state).toBe("withheld");
    expect(devices?.cta.state === "withheld" ? devices.cta.reason : "").toContain("no checkout endpoint is configured");
    expect(nodesOf(site, "/devices").some((n) => n.kind === "action")).toBe(false);
  });

  it("DD-036: every page carries at most ONE distinct primary action", () => {
    for (const input of [dryRunFixture(), fixtureSaas(), fixtureEcommerce(), verifiedBookingBusiness()]) {
      const { site } = generate(input, VERIFIED_CONTACT);
      for (const page of site.model.pages) {
        const labels = new Set(
          nodesOf(site, page.page.route)
            .filter((n) => n.kind === "action" || n.kind === "sticky_cta")
            .map((n) => n.text),
        );
        expect(labels.size, `${page.page.route} has competing primary actions`).toBeLessThanOrEqual(1);
      }
    }
  });

  it("DD-037: sticky CTA only when mobile share is high, intent is high AND the endpoint is verified", () => {
    const { site, output } = generate(verifiedBookingBusiness(), VERIFIED_CONTACT, FIXTURE_ENDPOINTS);
    expect(output.decisions["cta.sticky"]).toBe("allowed_safe_area_aware");
    const html = staticHtml(site, "/");
    expect(html).toContain('class="c-sticky-cta"');
    expect(site.files["static/styles.css"]).toContain("env(safe-area-inset-bottom)");
  });

  it("DD-037 negative: an unverified endpoint gets inline repeats and NO sticky bar", () => {
    const { site, output } = generate(fixtureEcommerce());
    expect(output.decisions["cta.sticky"]).toBe("inline_repeated");
    for (const page of site.model.pages) {
      expect(nodesOf(site, page.page.route).some((n) => n.kind === "sticky_cta")).toBe(false);
    }
  });

  it("DD-101: a blocked conversion path withholds the primary action instead of pointing it at nothing", () => {
    const { site } = generate(dryRunFixture());
    const home = site.model.pages.find((p) => p.page.route === "/");
    expect(home?.cta.state).toBe("withheld");
    expect(home?.cta.state === "withheld" ? home.cta.reason : "").toContain("DD-101");
    expect(home?.refusals.some((r) => r.section === "primary_action")).toBe(true);
  });
});

// =================================================================== components §4.6/4.7/4.15

describe("component and effect-policy rules DD-038..DD-046, DD-119, DD-120", () => {
  it("DD-038: comparable offers render as cards; a sparse set renders as a list with headings", () => {
    const cards = generate(verifiedBookingBusiness());
    expect(nodesOf(cards.site, "/").some((n) => n.id === "services-grid")).toBe(true);

    const sparse = generate(
      baseInput({
        websiteObjective: ["generate_leads"],
        servicesProducts: [{ name: "FIXTURE-ONLY", kind: "service" }],
      }),
    );
    const nodes = nodesOf(sparse.site, "/");
    expect(nodes.some((n) => n.id === "services-list")).toBe(true);
    expect(nodes.some((n) => n.id === "services-grid")).toBe(false);
  });

  it("DD-040/DD-041: supplied FAQ renders as native details/summary, never tabs", () => {
    const input = verifiedBookingBusiness({
      availableContent: content({ propositionText: "verified_available", contactDetails: "verified_available", faq: "verified_available" }),
    });
    const { site } = generate(input, { ...VERIFIED_CONTACT, faq: [{ question: "FIXTURE-Q", answer: "FIXTURE-A" }] });
    const html = staticHtml(site, "/");
    expect(html).toContain("<details><summary>FIXTURE-Q</summary>");
    expect(html).not.toMatch(/role="tab/);
  });

  it("DD-042/DD-043: a products business can never select an auto-rotating carousel or hover-only product info", () => {
    const { output } = decide(fixtureEcommerce());
    expect(output.forbidden).toEqual(expect.arrayContaining(["auto-rotating-carousel", "hover-only-product-info"]));
    expect(output.selectedPatterns).not.toContain("auto-rotating-carousel");
  });

  it("DD-044: before/after is forbidden without a matched verified pair, and allowed with one", () => {
    expect(decide(fixtureHealthcare()).output.forbidden).toContain("before-after");
    const creative = decide(fixtureCreativePortfolio()).output;
    expect(creative.forbidden).not.toContain("before-after");
    expect(creative.decisions["components.beforeAfter"]).toBe("allowed_with_static_pair_fallback");
  });

  it("DD-045/DD-089: state feedback is emitted and only transform/opacity transition", () => {
    const css = generate(baseInput()).site.files["static/styles.css"] ?? "";
    expect(css).toContain("DD-045 interaction.stateFeedback=required");
    expect(css).toContain("transition-property: transform, opacity;");
    expect(css).not.toMatch(/transition-property:[^;]*(width|height|top|left|margin)/);
  });

  it("DD-120 (scoring): the selection caps have ONE home, which the rule cites", () => {
    const rule = getRule("DD-120");
    const values = Object.fromEntries((rule?.then ?? []).map((e) => [e.target, e.value]));
    expect(values["selection.maxElements"]).toBe(SELECTION_CAPS.maxElements);
    expect(values["selection.minElements"]).toBe(SELECTION_CAPS.minElements);
    expect(values["selection.maxSignatureExperiences"]).toBe(SELECTION_CAPS.maxSignatureExperiences);
  });

  it("DD-120: a second signature (immersive) experience fails the frequency gate; raising the cap admits it", () => {
    const input = fixtureCreativePortfolio();
    const pattern = getPattern("decorative-webgl-hero");
    expect(pattern?.category).toBe("immersive");
    const ctx: SelectionContext = {
      profile: deriveDesignContextProfile(input),
      availableContent: new Set(),
      verifiedAssets: new Set(),
      routeJsBudgetKb: 10_000,
      alreadySelected: ["3d-product-view"],
      forbidden: new Set(),
      categoryOf: (id) => getPattern(id)?.category,
      visualExpressionCeiling: "high",
      technicalComplexityBudget: "high",
      statedRequirements: new Set(),
      statedObjectives: new Set(),
    };
    const capped = selectElement(pattern!, ctx).gates.find((g) => g.gate === "frequency_duplication");
    expect(capped?.passed).toBe(false);
    expect(capped?.reason).toContain("DD-120");
    const raised = selectElement(pattern!, { ...ctx, maxSignatureExperiences: 2 }).gates.find(
      (g) => g.gate === "frequency_duplication",
    );
    expect(raised?.passed).toBe(true);
  });

  it("DD-120: fewer than the minimum surviving elements is reported as a note, never a blocker", () => {
    const { output } = decide(fixtureHealthcare());
    expect(output.selectedPatterns.length).toBeLessThan(SELECTION_CAPS.minElements);
    expect(output.quality.notes.some((n) => n.startsWith("DD-120"))).toBe(true);
    expect(output.quality.blockers.some((b) => b.includes("DD-120"))).toBe(false);
  });
});

// =================================================================== responsive §4.9

describe("responsive rules DD-064..DD-075", () => {
  it("DD-073: a foldable viewport reflows forms and essential content rather than splitting them", () => {
    const foldable = defaultCapabilities({ viewportWidthCssPx: 720, foldableSegments: 2 });
    const form = transformComponent(
      { id: "enquiry", criticality: "supporting", kind: "form", hoverDependent: false, animated: false, weightKb: 3 },
      foldable,
    );
    expect(form.transformation).toBe("reflow");
    expect(form.reason).toContain("DD-073");
  });

  it("DD-073 negative: decoration on a foldable, and a form on a single-segment screen, are untouched by DD-073", () => {
    const decorative = transformComponent(
      { id: "ornament", criticality: "decorative", kind: "ornament", hoverDependent: false, animated: false, weightKb: 1 },
      defaultCapabilities({ viewportWidthCssPx: 720, foldableSegments: 2 }),
    );
    expect(decorative.reason).not.toContain("DD-073");
    const flat = transformComponent(
      { id: "enquiry", criticality: "supporting", kind: "form", hoverDependent: false, animated: false, weightKb: 3 },
      defaultCapabilities({ viewportWidthCssPx: 720 }),
    );
    expect(flat.reason).not.toContain("DD-073");
  });

  it("DD-064/DD-071/DD-073: the mandatory profiles include landscape and a foldable, and no device names", () => {
    const names = MANDATORY_TEST_PROFILES.map((p) => p.name);
    expect(names).toContain("landscape_mobile");
    expect(names).toContain("foldable_two_segments");
    expect(names.join(" ")).not.toMatch(/iphone|ipad|galaxy|pixel/i);
  });

  it("DD-069/DD-070/DD-078: safe-area padding, svh hero height and scroll padding reach the served CSS", () => {
    const css = generate(dryRunFixture()).site.files["static/styles.css"] ?? "";
    expect(css).toContain("env(safe-area-inset-left)");
    expect(css).toContain("min-block-size: min(60svh, 40rem)");
    // Comments may NAME 100vh to explain the rule; no declaration may USE it.
    expect(css.replace(/\/\*[\s\S]*?\*\//g, "")).not.toMatch(/\b100vh\b/);
    expect(css).toContain("scroll-padding-block");
  });
});

// =================================================================== images, a11y, performance

describe("image, accessibility and performance rules DD-074, DD-075, DD-076, DD-081, DD-083, DD-085, DD-095", () => {
  const productInput = () =>
    baseInput({
      businessName: "FIXTURE-SHOP",
      industry: "retail",
      websiteObjective: ["sell_products"],
      servicesProducts: [
        { name: "FIXTURE-P1", kind: "product" },
        { name: "FIXTURE-P2", kind: "product" },
        { name: "FIXTURE-P3", kind: "product" },
      ],
      availableAssets: assets({ productImages: "verified_available", heroImages: "verified_available" }),
      availableContent: content({ propositionText: "verified_available" }),
    });
  const files = {
    assets: {
      hero: { src: "/fixture-hero.jpg", width: 1600, height: 900, alt: "FIXTURE hero alternative" },
      products: [
        { src: "/fixture-p1.jpg", width: 800, height: 800, alt: "FIXTURE product one" },
        { src: "/fixture-p2.jpg", width: 800, height: 800, alt: "", decorative: true },
      ],
    },
  };

  it("DD-074/DD-081/DD-085: verified files render sized, with alt, ONE eager high-priority hero and lazy rest", () => {
    const { site } = generate(productInput(), files);
    const html = Object.entries(site.files)
      .filter(([p]) => p.startsWith("static/") && p.endsWith(".html"))
      .map(([, body]) => body)
      .join("\n");
    const facts = parseServedHtml("/all", html.replace(/<\/?html[^>]*>|<!doctype html>/gi, ""));
    expect(facts.imageCount).toBeGreaterThan(0);
    expect(facts.imagesWithoutAlt).toBe(0);
    expect(facts.imagesWithoutDimensions).toBe(0);
    // One LCP candidate per page that has a hero.
    for (const page of site.model.pages) {
      const pageFacts = parseServedHtml(page.page.route, staticHtml(site, page.page.route));
      expect(pageFacts.imagesHighPriority).toBeLessThanOrEqual(1);
    }
    expect(html).toContain('alt="" width="800" height="800" loading="lazy"');
  });

  it("DD-075: the Next.js source uses next/image with sizes and priority only on the hero", () => {
    const { site } = generate(productInput(), files);
    const tsx = Object.entries(site.files)
      .filter(([p]) => p.startsWith("next/app") && p.endsWith("page.tsx"))
      .map(([, body]) => body)
      .join("\n");
    expect(tsx).toContain('import Image from "next/image"');
    expect(tsx).toMatch(/<Image [^>]*sizes="[^"]+"/);
    expect((tsx.match(/ priority \/>/g) ?? []).length).toBeLessThanOrEqual(
      site.model.pages.filter((p) => nodesOf(site, p.page.route).some((n) => n.id === "hero-image")).length,
    );
  });

  it("negative: a supplied file for an asset the inventory does NOT verify is refused, never rendered", () => {
    const unverified = baseInput({ availableAssets: assets({ heroImages: "provided_unverified" }), availableContent: content({ propositionText: "verified_available" }) });
    const { site } = generate(unverified, files);
    expect(site.refusals.some((r) => r.kind === "refused_asset" && r.what.includes("hero"))).toBe(true);
    expect(Object.values(site.files).join("\n")).not.toContain("/fixture-hero.jpg");
  });

  it("DD-095/DD-086: an unsized image is counted as evidence and costs SEO score", () => {
    const facts = parseServedHtml("/x", '<html><body><h1>FIXTURE</h1><img src="/a.jpg" alt="a"></body></html>');
    expect(facts.imagesWithoutDimensions).toBe(1);
    expect(seoObservationsFromHtml(facts, [facts]).imagesWithoutDimensions).toBe(1);
    // Isolate the one variable: an otherwise-perfect page, with and without it.
    const perfect = {
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
    const unsized = seoScore({ ...perfect, imagesWithoutDimensions: 1 });
    expect(unsized.value).toBeLessThan(seoScore({ ...perfect, imagesWithoutDimensions: 0 }).value);
    expect(unsized.evidence).toContain("DD-095");
  });

  it("DD-083: forms have visible labels, per-field error regions, autocomplete and a live status region", () => {
    // A configured endpoint, so the form is the delivered capability (P1-2 order: form first).
    const { site } = generate(verifiedBookingBusiness(), VERIFIED_CONTACT, FIXTURE_ENDPOINTS);
    const html = staticHtml(site, "/");
    expect(html).toContain('<label for="f-email">Email</label>');
    expect(html).toContain('autocomplete="email" aria-describedby="f-email-error"');
    expect(html).toContain('role="status" aria-live="polite"');
    expect(html).not.toMatch(/placeholder=/);
  });

  it("DD-076: no div or span stands in for a button anywhere in the served HTML", () => {
    const { site } = generate(dryRunFixture());
    const html = Object.values(site.files).filter((b) => b.includes("<!doctype html>")).join("\n");
    expect(html).not.toMatch(/<(div|span)[^>]*role="button"/);
    expect(html).not.toMatch(/<(div|span)[^>]*onclick=/i);
  });
});

// =================================================================== SEO §4.12

describe("SEO rules DD-092, DD-093", () => {
  const hubInput = () =>
    baseInput({
      businessName: "FIXTURE-HUBS",
      industry: "professional_services",
      websiteObjective: ["generate_leads"],
      constraints: { seoDependency: "high", localization: [], integrations: [] },
      servicesProducts: [
        { name: "FIXTURE Audit Service", kind: "service", description: "FIXTURE owner-supplied audit description." },
        { name: "FIXTURE Advisory Service", kind: "service", description: "FIXTURE owner-supplied advisory description." },
        { name: "FIXTURE Unwritten Service", kind: "service" },
      ],
      availableContent: content({ propositionText: "verified_available", serviceDescriptions: "verified_available" }),
    });

  it("DD-093: each offer WITH supplied content gets its own indexable page, reaching served HTML", () => {
    const { output, site } = generate(hubInput());
    const routes = output.pages.map((p) => p.route);
    expect(routes).toContain("/services/fixture-audit-service");
    expect(routes).toContain("/services/fixture-advisory-service");
    const html = staticHtml(site, "/services/fixture-audit-service");
    expect(html).toContain("FIXTURE owner-supplied audit description.");
    expect(html).toContain("<h1");
    // Reachable: linked from every page's navigation.
    expect(staticHtml(site, "/")).toContain('href="/services/fixture-audit-service"');
  });

  it("DD-093 negative: an offer without supplied content gets NO page, and the reason is recorded", () => {
    const { output } = decide(hubInput());
    expect(output.pages.map((p) => p.route)).not.toContain("/services/fixture-unwritten-service");
    const record = output.contentHubs.find((h) => h.offer === "FIXTURE Unwritten Service");
    expect(record?.route).toBeNull();
    expect(record?.because).toContain("no owner-supplied description");
  });

  it("DD-093 negative: low SEO dependency derives no service pages at all", () => {
    const low = hubInput();
    const { output } = decide({ ...low, constraints: { ...low.constraints!, seoDependency: "low" } });
    expect(output.decisions["seo.contentHubs"]).toBe("single_hub");
    expect(output.pages.some((p) => p.derivedBy === "DD-093")).toBe(false);
  });

  it("DD-093 negative: offers that slugify to the same route get ONE page, and the second is recorded", () => {
    const input = hubInput();
    const { output } = decide({
      ...input,
      servicesProducts: [
        ...input.servicesProducts,
        { name: "fixture audit-service", kind: "service" as const, customerSupplied: true, priceKnown: false, regulated: false, description: "FIXTURE second description.", groupIds: [], variants: [], attributes: [] },
      ],
    });
    const routes = output.pages.map((p) => p.route);
    expect(routes.filter((r) => r === "/services/fixture-audit-service")).toHaveLength(1);
    expect(output.contentHubs.find((h) => h.offer === "fixture audit-service")?.because).toContain("already claimed");
  });

  it("DD-092: derived pages get distinct titles, so no generic metadata is duplicated", () => {
    const { output } = decide(hubInput());
    const titles = output.seoArtifacts.pages.map((p) => p.title.value);
    expect(new Set(titles).size).toBe(titles.length);
  });
});

// =================================================================== content + approval §4.13

describe("content and approval rules DD-096, DD-098..DD-106", () => {
  it("DD-099..DD-104: each withheld proof section carries the approval rule that withheld it", () => {
    const report = verifyContent(baseInput());
    const ruleFor = (category: string) => report.sections.find((s) => s.category === category);
    expect(ruleFor("customer_logos")?.ruleId).toBe("DD-099");
    expect(ruleFor("awards")?.ruleId).toBe("DD-100");
    expect(ruleFor("addresses")?.ruleId).toBe("DD-101");
    expect(ruleFor("pricing")?.ruleId).toBe("DD-102");
    expect(ruleFor("product_screenshots")?.ruleId).toBe("DD-103");
    expect(ruleFor("portfolio_work")?.ruleId).toBe("DD-104");
    for (const id of ["DD-099", "DD-100", "DD-101", "DD-102", "DD-103", "DD-104"]) {
      expect(report.sections.some((s) => !s.render && s.reason.includes(id)), id).toBe(true);
    }
  });

  it("DD-101 negative: a verified contact route unblocks the path and its verdict cites no block", () => {
    const report = verifyContent(verifiedBookingBusiness());
    expect(report.blockedConversionPaths).toEqual([]);
    expect(report.sections.find((s) => s.category === "addresses")?.render).toBe(true);
  });

  it("DD-103: selling products without verified product imagery blocks public purchase", () => {
    const { output } = decide(baseInput({ websiteObjective: ["sell_products"] }));
    expect(output.decisions["commerce.publicPurchase"]).toBe("blocked");
    expect(output.contentPlan.blockedConversionPaths.join()).toContain("DD-103");
  });

  it("DD-096: no verified logo → a typographic wordmark of the verified name, never an image", () => {
    const { site } = generate(baseInput());
    const brand = nodesOf(site, site.model.pages[0]!.page.route).find((n) => n.kind === "brand");
    expect(brand?.children ?? []).toHaveLength(0);
    expect(staticHtml(site, site.model.pages[0]!.page.route)).toContain('<a class="c-brand" href="/">FIXTURE-BASE</a>');
  });

  it("DD-096: a verified logo WITH a supplied file renders that file", () => {
    const input = baseInput({ availableAssets: assets({ logo: "verified_available" }) });
    const { site } = generate(input, { assets: { logo: { src: "/fixture-logo.svg", width: 160, height: 40, alt: "" } } });
    const html = staticHtml(site, site.model.pages[0]!.page.route);
    expect(html).toContain('src="/fixture-logo.svg"');
    // An empty supplied alt on a logo is replaced by the verified name, never left silent.
    expect(html).toContain('alt="FIXTURE-BASE"');
  });

  it("DD-106: every content slot is an editor empty state, never a skeleton", () => {
    const { site } = generate(dryRunFixture());
    walkNodes(site.model, (n) => {
      if (n.kind === "content_slot") expect(n.traceTo.join(" ")).toContain("DD-106");
    });
    expect(Object.values(site.files).join("\n")).not.toMatch(/skeleton/i);
  });
});

// =================================================================== quality §4.14

describe("quality rules DD-108..DD-112", () => {
  const gatesPass: GateStatus = {
    technical: true,
    accessibility: true,
    responsive: true,
    performance: true,
    content: true,
    design: true,
  };
  const sheetAt = (value: number): ScoreSheet =>
    Object.fromEntries(CRITERIA.map((c) => [c.key, { scored: true as const, value, evidence: "FIXTURE" }]));

  it("DD-108: the rule restates the scorer's thresholds from ONE home", () => {
    const values = Object.fromEntries((getRule("DD-108")?.then ?? []).map((e) => [e.target, e.value]));
    expect(values["quality.thresholds"]).toEqual(QUALITY_THRESHOLDS);
    expect(values["quality.coreMinimum"]).toBe(CORE_MINIMUM);
    expect(values["quality.worldClassMinimum"]).toBe(WORLD_CLASS_MINIMUM);
  });

  it("DD-109: a failing accessibility gate blocks production at any score", () => {
    const result = evaluateQuality(sheetAt(10), { ...gatesPass, accessibility: false });
    expect(result.level).toBe("technically_working");
    expect(result.failedGates).toContain("accessibility");
  });

  it("DD-112 (scoring): a world-class target that is not reached is reported as an explicit gap", () => {
    const result = evaluateQuality(sheetAt(8.5), gatesPass, "world_class");
    expect(result.level).toBe("professionally_designed");
    expect(result.target).toMatchObject({ level: "world_class", met: false });
    expect(result.target.gap).toContain("world_class");
  });

  it("DD-112 negative: the default target is met by a professionally designed evaluation", () => {
    const result = evaluateQuality(sheetAt(8.5), gatesPass);
    expect(result.target).toEqual({ level: "professionally_designed", met: true, gap: null });
  });

  it("DD-112: a stated world-class target reaches the pipeline's quality notes; the default does not change the level", () => {
    const input = baseInput();
    const worldClass = decide({ ...input, constraints: { localization: [], integrations: [], targetQuality: "world_class" } }).output;
    const standard = decide(input).output;
    expect(worldClass.quality.evaluation.target.level).toBe("world_class");
    expect(worldClass.obligations.join()).toContain("brand-specific design idea");
    expect(standard.obligations.join()).not.toContain("brand-specific design idea");
    expect(worldClass.quality.evaluation.level).toBe(standard.quality.evaluation.level);
  });
});

// =================================================================== regression safety

describe("regression safety after rule expansion", () => {
  it("every owner-supplied page still survives on the unseen fixture", () => {
    const { output, site } = generate(dryRunFixture());
    for (const page of dryRunFixture().requiredPages) {
      expect(output.pages.map((p) => p.route)).toContain(page.path);
      expect(staticHtml(site, page.path).length).toBeGreaterThan(0);
    }
  });

  it("no rejected dependency is resurrected and no new dependency appears", () => {
    const { output, site } = generate(dryRunFixture());
    const pkg = JSON.parse(site.files["next/package.json"] ?? "{}") as { dependencies: Record<string, string> };
    expect(Object.keys(pkg.dependencies)).not.toContain("three");
    expect(Object.keys(pkg.dependencies)).not.toContain("@react-three/fiber");
    expect(output.stack.omittedLibraries.map((o) => o.library)).toEqual(
      expect.arrayContaining(["three", "@react-three/fiber"]),
    );
  });

  it("no fabricated category reaches any generated file", () => {
    const { site } = generate(dryRunFixture());
    const html = Object.values(site.files).filter((b) => b.includes("<!doctype html>")).join("\n").toLowerCase();
    for (const category of NEVER_GENERATED) {
      expect(html, category).not.toContain(`data-section="${category}"`);
    }
    expect(html).not.toMatch(/testimonial|★|trusted by \d|award-winning/);
  });

  it("unknown gates still never pass: pre-build is cannot_classify, and the content gate still fails honestly", () => {
    const { output } = decide(dryRunFixture());
    expect(output.quality.evaluation.level).toBe("cannot_classify");
    expect(output.quality.gates.technical).toBe("unknown");
    expect(output.quality.gates.accessibility).toBe("unknown");
    expect(output.quality.gates.content).toBe(false);
  });

  it("AAA is still requested verbatim and SEO artifacts are still one authority", () => {
    const { output, site } = generate(dryRunFixture());
    expect(output.accessibilityStrategy.target).toBe("wcag_aaa_or_equivalent");
    for (const page of output.seoArtifacts.pages) {
      if (!page.title.value) continue;
      expect(staticHtml(site, page.route)).toContain(`<title>${page.title.value}</title>`);
    }
  });

  it("determinism holds with 103 rules", () => {
    const a = decide(dryRunFixture());
    const b = decide(dryRunFixture());
    expect(JSON.stringify(a.output)).toBe(JSON.stringify(b.output));
  });
});
