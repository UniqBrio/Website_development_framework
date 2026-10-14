/**
 * ENGAGEMENT EXPERIENCE DELIVERY — brief §11 tests 1–18.
 *
 * Every test runs the real pipeline and generator on synthetic fixtures with
 * explicit provenance, and asserts on the generated files and the delivery
 * contract — not only on types. Browser behaviour is measured separately by the
 * host run (tests/host/engagement.host.ts).
 */
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { runPipeline } from "../../src/pipeline.js";
import { generateWebsite, type GeneratedWebsite } from "../../src/generation/generate-website.js";
import { planExperienceDelivery, reconcileExperienceDelivery } from "../../src/engagement/delivery.js";
import { resolveContent } from "../../src/generation/content-values.js";
import { EVALUATOR_SOURCE, EXPERIENCE_RUNTIME_FILE, loadEvaluator } from "../../src/generation/runtime/experience-runtime.js";
import { resolveProvenance } from "../../src/content/engagement-values.js";
import type { BusinessInput } from "../../src/design-intelligence/types/business-input.js";
import * as F from "../fixtures/engagement-fixtures.js";
import * as D from "../fixtures/engagement-delivery-data.js";

const html = (site: GeneratedWebsite) => Object.entries(site.files).filter(([p]) => p.startsWith("static/") && p.endsWith(".html")).map(([, b]) => b).join("\n");
const allFiles = (site: GeneratedWebsite) => Object.values(site.files).join("\n");

function build(input: BusinessInput, suppliedContent?: unknown, experiences: "enabled" | "disabled" = "enabled") {
  const { output, contract } = runPipeline(input);
  const site = generateWebsite(input, output, contract, { ...(suppliedContent !== undefined ? { suppliedContent } : {}), experiences });
  return { output, contract, site, spec: site.manifest.engagement.delivery[0] };
}

const calculatorSite = (definition = D.calculatorDefinition(), input = F.saasRoi()) => build(input, D.supplied({ calculators: [definition] }));
const assessmentSite = (definition = D.assessmentDefinition()) => build(F.education(), D.supplied({ decisionFlows: [definition] }));
const selectorSite = (definition = D.selectorDefinition()) => build(F.fitness(), D.supplied({ decisionFlows: [definition] }));

const COMPARISON = {
  engagementData: {
    comparison: {
      caption: "FIXTURE comparison",
      rowHeading: "FIXTURE product",
      criteria: ["FIXTURE criterion A", "FIXTURE criterion B"],
      rows: [
        { offer: "FIXTURE-PRODUCT-1", values: ["FIXTURE a1", "FIXTURE b1"] },
        { offer: "FIXTURE-PRODUCT-2", values: ["FIXTURE a2", "FIXTURE b2"] },
      ],
      source: "FIXTURE owner-approved comparison sheet",
    },
  },
};

// ------------------------------------------------------------------ 1 & 18 comparison

describe("1 & 18 — comparison renders from its decision and stays regression-safe", () => {
  const { output, site, spec } = build(F.complexCatalogue(), COMPARISON);

  it("the comparison decision yields a DELIVERABLE static spec and a rendered table", () => {
    expect(output.engagement.primaryOpportunity?.category).toBe("comparison_tool");
    expect(spec).toMatchObject({ category: "comparison_tool", deliveryType: "comparison", status: "DELIVERABLE", mode: "static", dataStatus: "verified" });
    expect(html(site)).toContain('<section class="c-experience c-experience--comparison" data-experience="comparison" data-experience-id="experience-comparison_tool" data-experience-mode="static">');
    expect(html(site)).toContain('<div class="c-table-scroll" role="region" aria-labelledby="engagement-comparison-caption" tabindex="0">');
    expect(html(site)).toContain('<th scope="row">FIXTURE-PRODUCT-1</th>');
  });

  it("needs no JavaScript: no runtime file, no script tag, no client boundary", () => {
    expect(site.manifest.engagement.runtime).toBeNull();
    expect(Object.keys(site.files).some((p) => p.endsWith("experiences.js"))).toBe(false);
    expect(allFiles(site)).not.toContain("/experiences.js");
    expect(spec?.performance.clientJavaScript).toBe("none");
    expect(site.manifest.engagement.reconciliation.consistent).toBe(true);
  });
});

// ------------------------------------------------------------------ 2 calculator renders

describe("2 — a verified calculator renders a calculator", () => {
  const { output, site, spec } = calculatorSite();

  it("is DELIVERABLE, interactive, and traced to the decision record", () => {
    expect(spec).toMatchObject({ category: "roi_calculator", deliveryType: "calculator", status: "DELIVERABLE", mode: "interactive", dataStatus: "verified", decisionRecordId: output.engagement.decisionRecordId });
    expect(spec?.provenance.map((l) => l.status)).toEqual(expect.arrayContaining(["verified"]));
    expect(spec?.provenance.every((l) => l.status === "verified")).toBe(true);
  });

  it("serves the form, the data block, the static explanation and the runtime — in both layers", () => {
    const page = html(site);
    expect(page).toContain('data-experience="calculator"');
    expect(page).toContain('<script type="application/json" data-experience-data>');
    expect(page).toContain('<script src="/experiences.js" defer></script>');
    expect(page).toContain("FIXTURE: hours saved per week × hourly cost × weeks per year × adoption factor");
    expect(site.files["static/experiences.js"]).toBe(EXPERIENCE_RUNTIME_FILE);
    expect(site.files["next/public/experiences.js"]).toBe(EXPERIENCE_RUNTIME_FILE);
    expect(site.files["next/app/layout.tsx"]).toContain('<script src="/experiences.js" defer></script>');
    const nextPage = Object.entries(site.files).find(([p, b]) => p.startsWith("next/app") && b.includes("dangerouslySetInnerHTML"))?.[1] ?? "";
    expect(nextPage).toContain("c-experience-host");
  });

  it("the Next layer inserts EXACTLY the static layer's experience markup", () => {
    const staticPage = html(site);
    const start = staticPage.indexOf('<section class="c-experience c-experience--calculator"');
    const markup = staticPage.slice(start, staticPage.indexOf("</section>", staticPage.indexOf('data-experience-fallback', start)) + "</section>".length);
    const nextFiles = Object.entries(site.files).filter(([p]) => p.startsWith("next/app")).map(([, b]) => b).join("\n");
    expect(nextFiles).toContain(JSON.stringify(markup));
  });
});

// ------------------------------------------------------------------ 3 & 4 unverified / unavailable calculator

describe("3 — an unverified calculator does not render", () => {
  const unverifiedCases: Array<[string, ReturnType<typeof D.calculatorDefinition>]> = [
    ["formula is an AI draft", D.calculatorDefinition({ formula: { ...D.calculatorDefinition().formula, provenance: "ai_draft", source: "FIXTURE model output" } })],
    ["approved AI draft without an approval record", D.calculatorDefinition({ formula: { ...D.calculatorDefinition().formula, provenance: "approved_ai_draft", source: "FIXTURE model output" } })],
    ["external source without owner approval", D.calculatorDefinition({ formula: { ...D.calculatorDefinition().formula, provenance: "external_authoritative_source", source: "FIXTURE external standard" } })],
    ["a business constant authored by framework policy", D.calculatorDefinition({ constants: [D.calculatorDefinition().constants[0]!, { ...D.calculatorDefinition().constants[1]!, provenance: "framework_policy", source: "FIXTURE-SENTINEL-POLICY-RATE" }] })],
    ["an unverified assumption", D.calculatorDefinition({ assumptions: [{ text: "FIXTURE-SENTINEL-UNVERIFIED-ASSUMPTION", provenance: "customer_supplied_unverified", source: "FIXTURE email" }] })],
    ["AI-drafted copy", D.calculatorDefinition({ copy: { provenance: "ai_draft", source: "FIXTURE model output" } })],
  ];
  for (const [name, definition] of unverifiedCases) {
    it(`${name}: DELIVERY_UNAVAILABLE (unverified), no experience markup, no runtime, the blocker named`, () => {
      const { site, spec } = calculatorSite(definition);
      expect(spec).toMatchObject({ status: "DELIVERY_UNAVAILABLE", dataStatus: "unverified", mode: null, definition: null });
      expect(spec?.blockers.join(" ")).toMatch(/ai_draft|approved_ai_draft|external_authoritative_source|framework_policy|customer_supplied_unverified/);
      expect(html(site)).not.toContain("data-experience=");
      expect(site.manifest.engagement.runtime).toBeNull();
      expect(allFiles(site)).not.toContain("FIXTURE-SENTINEL");
      expect(site.refusals.some((r) => r.kind === "engagement_experience" && r.why.startsWith("DELIVERY_UNAVAILABLE"))).toBe(true);
    });
  }

  it("positive control: an approved AI draft WITH approver and date is verified and renders", () => {
    const def = D.calculatorDefinition({ formula: { ...D.calculatorDefinition().formula, provenance: "approved_ai_draft", source: "FIXTURE model output", approval: { approvedBy: "FIXTURE-OWNER", approvedAt: "2026-09-14" } } });
    expect(calculatorSite(def).spec).toMatchObject({ status: "DELIVERABLE", dataStatus: "verified" });
  });

  it("inventory formulas unverified: the decision never selects the calculator, so no spec exists at all", () => {
    const { output, site } = calculatorSite(D.calculatorDefinition(), F.saasRoi({}, { formulas: "provided_unverified" }));
    expect(output.engagement.primaryOpportunity?.category).not.toBe("roi_calculator");
    expect(site.manifest.engagement.delivery.map((s) => s.category)).not.toContain("roi_calculator");
    expect(html(site)).not.toContain('data-experience="calculator"');
  });
});

describe("4 — an unavailable calculator does not render", () => {
  const cases: Array<[string, unknown, RegExp]> = [
    ["no definition supplied", undefined, /no calculator definition was supplied/],
    ["formula marked unavailable", D.supplied({ calculators: [D.calculatorDefinition({ formula: { ...D.calculatorDefinition().formula, provenance: "unavailable" } })] }), /unavailable/],
    ["formula references an undefined input", D.supplied({ calculators: [D.calculatorDefinition({ formula: { ...D.calculatorDefinition().formula, expression: { op: "add", args: [{ input: "hours-per-week" }, { input: "hourly-cost" }, { input: "invented-input" }] } } })] }), /undefined input "invented-input"/],
    ["owner example disagrees with the formula", D.supplied({ calculators: [D.calculatorDefinition({ examples: [{ inputs: { "hours-per-week": 10, "hourly-cost": 40 }, expected: 99999, ...D.verified("FIXTURE sheet") }] })] }), /example 1 expects 99999/],
    ["definition for a different category", D.supplied({ calculators: [D.calculatorDefinition({ category: "calculator" })] }), /no calculator definition was supplied for "roi_calculator"/],
  ];
  for (const [name, supplied, reason] of cases) {
    it(`${name}: DELIVERY_UNAVAILABLE (unavailable) with the reason`, () => {
      const { site, spec } = build(F.saasRoi(), supplied);
      expect(spec).toMatchObject({ status: "DELIVERY_UNAVAILABLE", dataStatus: "unavailable" });
      expect(spec?.blockers.join(" ")).toMatch(reason);
      expect(html(site)).not.toContain('data-experience="calculator"');
      expect(spec?.fallback.kind).toBe("existing_page_content");
    });
  }

  it("a numeric literal cannot be written into a formula: the schema refuses it", () => {
    const withLiteral = D.calculatorDefinition();
    (withLiteral.formula.expression as unknown as { args: unknown[] }) = { op: "multiply", args: [{ input: "hours-per-week" }, 1.35] } as never;
    expect(() => build(F.saasRoi(), D.supplied({ calculators: [withLiteral] }))).toThrow();
  });
});

// ------------------------------------------------------------------ 5–7 assessment / selector

describe("5 — verified assessment and selector render", () => {
  it("assessment: DELIVERABLE decision flow with questions, radios and every outcome's criteria", () => {
    const { site, spec } = assessmentSite();
    expect(spec).toMatchObject({ category: "assessment", deliveryType: "decision_flow", status: "DELIVERABLE", mode: "interactive" });
    const page = html(site);
    expect(page).toContain('data-experience-kind="assessment"');
    for (const title of ["FIXTURE foundation level", "FIXTURE intensive level", "FIXTURE standard level"]) expect(page).toContain(title);
    expect(page).toContain("Applies when: FIXTURE: how would you describe your current level? “FIXTURE beginner”.");
  });

  it("selector: recommends only owner-supplied offers", () => {
    const { site, spec } = selectorSite();
    expect(spec).toMatchObject({ category: "guided_selector", status: "DELIVERABLE" });
    expect(html(site)).toContain("Recommended: FIXTURE-PROGRAMME-1");
  });
});

describe("6 — unverified decision rules do not render", () => {
  for (const provenance of ["ai_draft", "customer_supplied_unverified", "framework_policy"] as const) {
    it(`rule set ${provenance}: DELIVERY_UNAVAILABLE (unverified)`, () => {
      const base = D.assessmentDefinition();
      const { site, spec } = assessmentSite(D.assessmentDefinition({ ruleSet: { ...base.ruleSet, provenance, source: "FIXTURE-SENTINEL-RULES" } }));
      expect(spec).toMatchObject({ status: "DELIVERY_UNAVAILABLE", dataStatus: "unverified" });
      expect(html(site)).not.toContain("data-experience=");
      expect(allFiles(site)).not.toContain("FIXTURE-SENTINEL-RULES");
    });
  }
});

describe("7 — unavailable decision rules do not render", () => {
  it("no definition supplied", () => {
    const { spec } = build(F.education());
    expect(spec).toMatchObject({ status: "DELIVERY_UNAVAILABLE", dataStatus: "unavailable" });
    expect(spec?.blockers.join(" ")).toMatch(/rules and recommendations are never generated/);
  });

  it("an outcome recommending an offer the owner never supplied is invalid", () => {
    const base = D.selectorDefinition();
    const { site, spec } = selectorSite(D.selectorDefinition({ outcomes: [{ ...base.outcomes[0]!, recommendedOffer: "FIXTURE-SENTINEL-INVENTED-OFFER" }, ...base.outcomes.slice(1)] }));
    expect(spec).toMatchObject({ status: "DELIVERY_UNAVAILABLE", dataStatus: "unavailable" });
    expect(spec?.blockers.join(" ")).toMatch(/not an owner-supplied offer/);
    expect(allFiles(site)).not.toContain("FIXTURE-SENTINEL-INVENTED-OFFER");
  });

  it("a rule naming an undefined option, or a selector definition used for an assessment, is invalid", () => {
    const base = D.assessmentDefinition();
    expect(assessmentSite(D.assessmentDefinition({ rules: [{ id: "r-bad", outcome: "foundation", when: [{ question: "level", anyOf: ["expert"] }] }, ...base.rules.slice(1)] })).spec?.blockers.join(" ")).toMatch(/undefined option "expert"/);
    expect(assessmentSite(D.assessmentDefinition({ kind: "selector" })).spec?.blockers.join(" ")).toMatch(/does not match the selected experience/);
  });
});

// ------------------------------------------------------------------ 8 & 9 fallback and no-JS

describe("8 — every delivered experience has a static fallback, including under the kill switch", () => {
  for (const [name, make] of [["calculator", calculatorSite], ["assessment", assessmentSite], ["selector", selectorSite]] as const) {
    it(`${name}: the fallback is rendered static content`, () => {
      const { site, spec } = make();
      expect(spec?.fallback.kind).toBe("static_equivalent_rendered");
      expect(spec?.performance.staticFallbackAvailable).toBe(true);
      expect(html(site)).toContain('<div class="c-experience-fallback" data-experience-fallback>');
    });
  }

  it("kill switch: the static equivalent renders with no form, no data block and no script; the site reconciles", () => {
    const { site, spec } = build(F.saasRoi(), D.supplied({ calculators: [D.calculatorDefinition()] }), "disabled");
    expect(spec).toMatchObject({ status: "DELIVERABLE", mode: "static_fallback_only" });
    const page = html(site);
    expect(page).toContain('data-experience-mode="static_fallback_only"');
    expect(page).toContain("How this is calculated");
    expect(page).not.toContain("<form class=\"c-experience-form\"");
    expect(page).not.toContain("data-experience-data");
    expect(allFiles(site)).not.toContain("/experiences.js");
    expect(site.manifest.engagement.reconciliation.consistent).toBe(true);
  });
});

describe("9 — the no-JavaScript path stays usable", () => {
  it("calculator: controls disabled with a visible notice; every input, figure, assumption and worked example is static text", () => {
    const def = D.calculatorDefinition();
    const page = html(calculatorSite(def).site);
    expect(page).toMatch(/<fieldset class="c-experience-controls" data-requires-js disabled>/);
    expect(page).toContain("This calculator works in your browser with JavaScript.");
    for (const i of def.inputs) expect(page).toContain(`<dt>${i.label} (${i.unit})</dt>`);
    expect(page).toContain("<dt>FIXTURE adoption factor</dt><dd>0.5 ratio (source: FIXTURE owner analysis sheet v1)</dd>");
    expect(page).toContain("Hours saved per week 10 hours, Hourly cost 40 FIXTURE-CURRENCY → FIXTURE yearly value 10400 FIXTURE-CURRENCY");
    expect(page).toContain("FIXTURE: half of saved hours are redeployed");
  });

  it("decision flow: every question, outcome and rule condition is static text; the no-match copy too", () => {
    const def = D.assessmentDefinition();
    const page = html(assessmentSite(def).site);
    for (const q of def.questions) expect(page).toContain(q.text);
    for (const o of def.outcomes) expect(page).toContain(`<h4>${o.title}</h4>`);
    expect(page.match(/(Also applies|Applies) when:/g)?.length).toBe(def.rules.length);
    expect(page).toContain(def.noMatch.title);
  });
});

// ------------------------------------------------------------------ 10 customer request

describe("10 — a customer-requested calculator with a missing formula is rejected", () => {
  it("fails the decision's data gate, is reported to the owner, and produces no delivery", () => {
    const input = F.saasRoi({ preference: "specific_idea", requestedIdea: { category: "calculator", rationale: "FIXTURE: owner wants a calculator" } }, { formulas: "unavailable" });
    const { output, site } = build(input, D.supplied({ calculators: [D.calculatorDefinition({ category: "calculator" })] }));
    expect(output.engagement.requestedIdeaAssessment).toMatchObject({ category: "calculator", qualified: false });
    expect(output.engagement.requestedIdeaAssessment?.reasons.join(" ")).toMatch(/data_integrity/);
    expect(site.manifest.engagement.delivery.map((s) => s.category)).not.toContain("calculator");
    expect(html(site)).not.toContain('data-experience="calculator"');
  });
});

// ------------------------------------------------------------------ 11–13 decision ↔ delivery ↔ render

describe("11 — the generated experience matches the engagement decision", () => {
  it("one spec per selected opportunity, same category and record, rendered on its placement route", () => {
    for (const { output, site } of [calculatorSite(), assessmentSite(), selectorSite(), build(F.complexCatalogue(), COMPARISON)]) {
      const selected = [output.engagement.primaryOpportunity, ...output.engagement.secondaryOpportunities].filter(Boolean);
      expect(site.manifest.engagement.delivery.map((s) => s.category)).toEqual(selected.map((s) => s!.category));
      const entry = site.manifest.engagement.reconciliation.entries[0]!;
      expect(entry).toMatchObject({ category: selected[0]!.category, rendered: true, route: selected[0]!.placement.route });
      expect(site.model.renderedExperiences).toHaveLength(1);
      expect(site.model.renderedExperiences[0]?.route).toBe(selected[0]!.placement.route);
    }
  });
});

describe("12 — NO_EXPERIENCE generates no experience, whatever values are supplied", () => {
  it("no spec, no markup, no runtime, no experience CSS", () => {
    const { output, site } = build(F.simpleBusiness(), D.supplied({ calculators: [D.calculatorDefinition()], decisionFlows: [D.assessmentDefinition(), D.selectorDefinition()] }));
    expect(output.engagement.decision).toBe("NO_EXPERIENCE");
    expect(site.manifest.engagement.delivery).toEqual([]);
    expect(html(site)).not.toContain("data-experience=");
    expect(site.manifest.engagement.runtime).toBeNull();
    expect(site.files["static/styles.css"]).not.toContain(".c-experience-form");
  });
});

describe("13 — a rejected or unselected experience cannot render", () => {
  it("values supplied for categories the decision rejected produce nothing", () => {
    // The education decision selects the assessment; a selector and a calculator are supplied too.
    const { output, site } = build(F.education(), D.supplied({ calculators: [D.calculatorDefinition()], decisionFlows: [D.assessmentDefinition(), D.selectorDefinition()] }));
    expect(output.engagement.primaryOpportunity?.category).toBe("assessment");
    expect(site.manifest.engagement.delivery.map((s) => s.category)).toEqual(["assessment"]);
    expect(html(site)).not.toContain('data-experience="calculator"');
    expect(html(site)).not.toContain('data-experience-kind="selector"');
  });

  it("reconciliation catches an injected node for a rejected category, a missing render and a stray runtime", () => {
    const { output, site } = assessmentSite();
    const specs = site.manifest.engagement.delivery;
    const injected = reconcileExperienceDelivery(output.engagement, specs, [
      ...site.model.renderedExperiences,
      { specId: "experience-game_serious_game", category: "game_serious_game", route: "/", nodeId: "experience-game_serious_game", mode: "interactive" },
    ], { staticRoutesWithRuntime: site.manifest.engagement.runtime?.staticRoutes ?? [], nextLayoutHasRuntime: true, existingSectionRoutes: new Map() });
    expect(injected.consistent).toBe(false);
    expect(injected.problems.join(" ")).toMatch(/game_serious_game.*was not selected/);
    expect(injected.problems.join(" ")).toMatch(/has no delivery spec/);

    const missing = reconcileExperienceDelivery(output.engagement, specs, [], { staticRoutesWithRuntime: [], nextLayoutHasRuntime: false, existingSectionRoutes: new Map() });
    expect(missing.problems.join(" ")).toMatch(/rendered 0 time/);

    const stray = reconcileExperienceDelivery(output.engagement, specs, site.model.renderedExperiences, { staticRoutesWithRuntime: [site.model.pages.map((pm) => pm.page.route).find((r) => !site.model.renderedExperiences.some((x) => x.route === r))!, ...(site.manifest.engagement.runtime?.staticRoutes ?? [])], nextLayoutHasRuntime: true, existingSectionRoutes: new Map() });
    expect(stray.problems.join(" ")).toMatch(/loads the experience runtime but carries no interactive experience/);
  });

  it("the planner cannot produce a spec for anything the decision did not select", () => {
    const input = F.simpleBusiness();
    const { output } = runPipeline(input);
    const specs = planExperienceDelivery({
      input,
      decision: output.engagement,
      content: resolveContent(input, D.supplied({ calculators: [D.calculatorDefinition()] })),
      pages: output.pages,
      budget: { routeJsKb: 200, plannedFinalKb: 0 },
      runtime: { bytes: 1, gzipBytes: 1 },
      dataBytes: () => 1,
      experiences: "enabled",
    });
    expect(specs).toEqual([]);
  });
});

// ------------------------------------------------------------------ 14 accessibility

describe("14 — accessibility contract (WCAG 2.2 AA, served markup and runtime)", () => {
  it("calculator markup: labelled inputs, existing describedby targets, status and alert regions, novalidate, no positive tabindex", () => {
    const page = html(calculatorSite().site);
    const section = page.slice(page.indexOf('<section class="c-experience'), page.lastIndexOf("</section>"));
    const inputs = [...section.matchAll(/<input id="([^"]+)"[^>]*aria-describedby="([^"]+)"/g)];
    expect(inputs.length).toBe(2);
    for (const [, id, describedBy] of inputs) {
      expect(section).toContain(`<label for="${id}">`);
      for (const ref of describedBy!.split(" ")) expect(section).toContain(`id="${ref}"`);
    }
    expect(section).toMatch(/role="status" aria-live="polite" tabindex="-1"/);
    expect(section).toMatch(/role="alert" data-experience-errors hidden/);
    expect(section).toContain("novalidate");
    expect(section).not.toMatch(/tabindex="[1-9]/);
    expect(section).toContain('<button type="reset">Reset</button>');
    // Heading order inside the experience: h2 → h3 → h4, no skips.
    const levels = [...section.matchAll(/<h([1-6])/g)].map((m) => Number(m[1]));
    for (let i = 1; i < levels.length; i += 1) expect(levels[i]! - levels[i - 1]!).toBeLessThanOrEqual(1);
  });

  it("decision flow markup: one fieldset + legend per question, every radio inside its label, a restart button", () => {
    const def = D.assessmentDefinition();
    const page = html(assessmentSite(def).site);
    expect(page.match(/<fieldset class="c-question"[^>]*><legend>/g)?.length).toBe(def.questions.length);
    const radios = page.match(/<input type="radio"/g)?.length ?? 0;
    expect(page.match(/<label class="c-option"><input type="radio"/g)?.length).toBe(radios);
    expect(page).toContain('<button type="reset">Start again</button>');
  });

  it("the runtime moves focus on error, result and reset; writes no markup; sends nothing", () => {
    expect(EXPERIENCE_RUNTIME_FILE).toMatch(/firstInvalid\.focus\(\)/);
    expect(EXPERIENCE_RUNTIME_FILE).toMatch(/result\.focus\(\)/);
    expect(EXPERIENCE_RUNTIME_FILE).toMatch(/title\.focus\(\)/);
    expect(EXPERIENCE_RUNTIME_FILE).toMatch(/first\.focus\(\)/);
    expect(EXPERIENCE_RUNTIME_FILE).not.toMatch(/innerHTML|outerHTML|insertAdjacentHTML|document\.write/);
    expect(EXPERIENCE_RUNTIME_FILE).not.toMatch(/fetch\(|XMLHttpRequest|localStorage|sessionStorage|sendBeacon|\beval\(/);
    expect(EXPERIENCE_RUNTIME_FILE).not.toMatch(/animation|transition/i);
  });

  it("every delivered spec carries the inherited accessibility requirements", () => {
    for (const { spec } of [calculatorSite(), assessmentSite(), selectorSite()]) {
      expect(spec?.accessibility.join(" ")).toMatch(/keyboard/);
      expect(spec?.accessibility.join(" ")).toMatch(/reduced-motion/);
    }
  });
});

// ------------------------------------------------------------------ 15 responsive

describe("15 — responsive contract", () => {
  it("each delivered type states behaviour for narrow phone, larger phone, tablet, desktop, coarse pointer and no-hover", () => {
    for (const { spec } of [calculatorSite(), assessmentSite(), build(F.complexCatalogue(), COMPARISON)]) {
      const r = spec!.responsive;
      for (const key of ["narrowPhone", "largerPhone", "tablet", "desktop", "coarsePointer", "noHover"] as const) expect(r[key].length).toBeGreaterThan(10);
    }
  });

  it("the stylesheet implements it: single column narrow, grid from 600px, option rows at the target size and 44px on coarse pointers", () => {
    const css = calculatorSite().site.files["static/styles.css"] ?? "";
    expect(css).toMatch(/\.c-experience-inputs \{[^}]*grid-template-columns: 1fr;/);
    expect(css).toMatch(/@media \(min-width: 600px\) \{\s*\.c-experience-inputs \{ grid-template-columns: repeat\(auto-fit, minmax\(min\(100%, 16rem\), 1fr\)\); \}/);
    const flowCss = assessmentSite().site.files["static/styles.css"] ?? "";
    expect(flowCss).toMatch(/\.c-option \{ min-block-size: \d+px; \}/);
    expect(flowCss).toMatch(/@media \(pointer: coarse\) \{ \.c-option \{ min-block-size: 44px; \} \}/);
  });

  it("comparison keeps the table in a scroll region rather than a semantics-breaking stacked layout", () => {
    const css = build(F.complexCatalogue(), COMPARISON).site.files["static/styles.css"] ?? "";
    expect(css).toContain(".c-table-scroll { overflow-x: auto; max-inline-size: 100%; }");
    expect(css).not.toMatch(/\.c-comparison-table[^{]*\{[^}]*display:\s*block/);
  });
});

// ------------------------------------------------------------------ 16 performance

describe("16 — performance budget contract (derived from generated output, never estimated)", () => {
  it("reports runtime bytes from the file actually written, gzip, inline data, defer loading and the budget result", () => {
    const { site, spec } = calculatorSite();
    const file = site.files["static/experiences.js"]!;
    expect(spec?.performance).toMatchObject({
      clientJavaScript: "shared_runtime",
      runtimeBytes: Buffer.byteLength(file),
      runtimeGzipBytes: gzipSync(Buffer.from(file), { level: 9 }).length,
      loading: "defer",
      evidenceKind: "derived",
      withinBudget: true,
    });
    expect(spec!.performance.inlineDataBytes).toBeGreaterThan(0);
    const dataBlock = html(site).match(/<script type="application\/json" data-experience-data>([\s\S]*?)<\/script>/)?.[1] ?? "";
    expect(spec!.performance.inlineDataBytes).toBe(Buffer.byteLength(dataBlock));
  });

  it("an experience that does not fit the remaining route budget is DELIVERY_UNAVAILABLE", () => {
    const input = F.saasRoi();
    const { output } = runPipeline(input);
    const [spec] = planExperienceDelivery({
      input,
      decision: output.engagement,
      content: resolveContent(input, D.supplied({ calculators: [D.calculatorDefinition()] })),
      pages: output.pages,
      budget: { routeJsKb: 10, plannedFinalKb: 10 },
      runtime: { bytes: 50_000, gzipBytes: 20_000 },
      dataBytes: () => 1_000,
      experiences: "enabled",
    });
    expect(spec).toMatchObject({ status: "DELIVERY_UNAVAILABLE" });
    expect(spec?.reason).toMatch(/exceeds the .*KB left in the route budget/);
  });

  it("adds no dependency: the Next package manifest is unchanged by an experience", () => {
    const withExperience = calculatorSite().site.files["next/package.json"];
    const without = build(F.saasRoi()).site.files["next/package.json"];
    expect(withExperience).toBe(without);
  });
});

// ------------------------------------------------------------------ 17 fabrication

describe("17 — no fabricated formula, data or rule can enter served HTML", () => {
  it("every number in the calculator's served section comes from the verified definition", () => {
    const def = D.calculatorDefinition();
    const page = html(calculatorSite(def).site);
    const section = page.slice(page.indexOf('<section class="c-experience'), page.indexOf("</section>", page.indexOf("data-experience-fallback")));
    const visibleText = section.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ");
    const allowed = new Set([
      ...def.constants.map((c) => String(c.value)),
      ...def.examples.flatMap((e) => [String(e.expected), ...Object.values(e.inputs).map(String)]),
      ...def.inputs.flatMap((i) => [i.min, i.max, i.step].filter((v) => v !== undefined).map(String)),
      def.formula.version,
      "1", // the "v1" in the sheet name, copy supplied by the fixture
    ]);
    const numbers = visibleText.match(/\d+(\.\d+)?/g) ?? [];
    for (const n of numbers) expect(allowed.has(n), `unexpected number "${n}" in served calculator`).toBe(true);
  });

  it("unverified values never reach any generated file, in either layer", () => {
    const sentinel = "FIXTURE-SENTINEL-AI-FORMULA";
    const { site } = calculatorSite(D.calculatorDefinition({ formula: { ...D.calculatorDefinition().formula, name: sentinel, provenance: "ai_draft", source: sentinel } }));
    expect(allFiles(site)).not.toContain(sentinel);
    expect(JSON.stringify(site.manifest.engagement.delivery[0]?.definition ?? null)).not.toContain(sentinel);
  });

  it("the evaluator is ONE source: the browser file embeds it and the core's example check runs it", () => {
    expect(EXPERIENCE_RUNTIME_FILE).toContain(EVALUATOR_SOURCE);
    const def = D.calculatorDefinition();
    const evaluator = loadEvaluator();
    expect(evaluator.evaluateFormula(def.formula.expression, def.examples[0]!.inputs, { "weeks-per-year": 52, "adoption-factor": 0.5 })).toBe(10400);
    expect(() => evaluator.evaluateFormula({ op: "divide", args: [{ input: "a" }, { input: "b" }] }, { a: 1, b: 0 }, {})).toThrow(/division by zero/);
    const flow = D.assessmentDefinition();
    expect(evaluator.matchRules(flow.rules, { level: "advanced", time: "many-hours" })?.outcome).toBe("intensive");
    expect(evaluator.matchRules(flow.rules, { level: "advanced", time: "few-hours" })?.outcome).toBe("standard");
  });

  it("provenance resolution: framework policy only for mathematical facts; approval required for AI drafts and external sources", () => {
    expect(resolveProvenance("x", { provenance: "framework_policy", source: "calendar" }, "mathematical").status).toBe("verified");
    expect(resolveProvenance("x", { provenance: "framework_policy", source: "FIXTURE" }, "business").status).toBe("unverified");
    expect(resolveProvenance("x", { provenance: "ai_draft", source: "FIXTURE", approval: { approvedBy: "FIXTURE", approvedAt: "2026-09-14" } }, "business").status).toBe("unverified");
    expect(resolveProvenance("x", { provenance: "external_authoritative_source", source: "FIXTURE" }, "business").status).toBe("unverified");
    expect(resolveProvenance("x", { provenance: "unavailable", source: "FIXTURE" }, "business").status).toBe("unavailable");
  });
});
