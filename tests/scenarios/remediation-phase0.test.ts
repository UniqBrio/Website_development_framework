/**
 * REMEDIATION PHASE 0 — make the gates trustworthy (docs/FRAMEWORK-REMEDIATION-PLAN.md §E).
 *
 * Every business here is SYNTHETIC (`FIXTURE-*`). Each defect gets negative tests
 * (the failure the gate must now catch) and positive tests (legitimate output is
 * not mistaken for a failure).
 */
import { describe, expect, it } from "vitest";
import { runPipeline } from "../../src/pipeline.js";
import { generateWebsite } from "../../src/generation/generate-website.js";
import { analyseIndexability, collectBuildEvidence, parseServedHtml } from "../../src/evidence/build-evidence.js";
import { renderCalculatorMarkup } from "../../src/generation/render/experiences.js";
import { reconcileDecisionExecution } from "../../src/integrity/decision-execution.js";
import { baseInput, content } from "../fixtures/business-inputs.js";
import { calculatorDefinition } from "../fixtures/engagement-delivery-data.js";
import type { BusinessInputDraft } from "../../src/design-intelligence/types/business-input.js";

const TEST_APPROVAL = { approvedBy: "TEST-ONLY simulated approver", approvedAt: "2026-09-15" };

const page = (body: string) =>
  `<!doctype html><html><head><meta name="robots" content="index,follow"></head><body><header><nav>FIXTURE nav</nav></header><main>${body}</main></body></html>`;

function offersSite(offers: Array<{ name: string; description?: string }>) {
  const input = baseInput({
    businessName: "FIXTURE-PENDING-PRACTICE",
    industry: "professional_services",
    websiteObjective: ["generate_leads"],
    servicesProducts: offers.map((o) => ({ ...o, kind: "service" as const })),
    availableContent: content({ serviceDescriptions: "partial", contactDetails: "unavailable" }),
  });
  const { output, contract } = runPipeline(input);
  const site = generateWebsite(input, output, contract, {});
  return { input, output, site };
}

describe("FD-06 — every missing value on an indexable page is counted as placeholder text", () => {
  it("negative: typed pending markers alone make a page a placeholder finding and a content-gate blocker", () => {
    const body = '<ul><li><h3>FIXTURE A</h3><p class="c-pending" data-content-pending="description of A">description to be supplied</p></li><li><h3>FIXTURE B</h3><p class="c-pending" data-content-pending="description of B">description to be supplied</p></li></ul>';
    expect(analyseIndexability([parseServedHtml("/", page(body))]).placeholders).toEqual([{ route: "/", slots: 0, pending: 2 }]);
    const q = runPipeline(baseInput(), { evidence: { bundle: collectBuildEvidence({ servedHtml: { "/": page(body) } }) } }).output.quality;
    expect(q.gates.content).toBe(false);
    expect(q.blockers.join(" ")).toContain("placeholder text");
    expect(q.blockers.join(" ")).toContain("2 pending markers");
  });

  it("negative: an unavailable-fact notice is counted", () => {
    const body = '<div class="c-unavailable-notice" role="note" data-content-unavailable="a verified contact method"><p>Contact route unavailable until details are verified.</p></div>';
    expect(analyseIndexability([parseServedHtml("/", page(body))]).placeholders).toEqual([{ route: "/", slots: 0, pending: 1 }]);
  });

  it("positive: an engagement experience's no-JavaScript notice shares the class but is NOT missing content", () => {
    const markup = renderCalculatorMarkup("fixture-calc", calculatorDefinition(), "interactive");
    expect(markup).toContain("c-unavailable-notice");
    expect(markup).not.toMatch(/data-content-(pending|unavailable)/);
    expect(analyseIndexability([parseServedHtml("/calc", page(markup))]).placeholders).toEqual([]);
  });

  it("positive: a page whose offers all have descriptions carries no pending marker", () => {
    const { site } = offersSite([
      { name: "FIXTURE-SERVICE-A", description: "FIXTURE description A." },
      { name: "FIXTURE-SERVICE-B", description: "FIXTURE description B." },
    ]);
    expect(site.files["static/index.html"]).not.toContain("data-content-pending=");
  });

  it("the generator counts one marker per undescribed offer, and both emitters mark them identically", () => {
    const { site } = offersSite([
      { name: "FIXTURE-SERVICE-A", description: "FIXTURE description A." },
      { name: "FIXTURE-SERVICE-B" },
      { name: "FIXTURE-SERVICE-C" },
    ]);
    const staticCount = (site.files["static/index.html"]!.match(/data-content-pending=/g) ?? []).length;
    const nextCount = (site.files["next/app/page.tsx"]!.match(/data-content-pending=/g) ?? []).length;
    expect(staticCount).toBe(2);
    expect(nextCount).toBe(staticCount);
    const home = site.manifest.indexability.placeholders.find((p) => p.route === "/");
    expect(home?.pending).toBeGreaterThanOrEqual(2);
    expect(site.manifest.refinementInput.blockers.join(" ")).toContain("pending marker");
  });
});

/** A site whose derived home page has NO proposition section (drive_footfall architecture). */
function footfallSite(supplied: unknown) {
  const input = baseInput({
    businessName: "FIXTURE-FOOTFALL",
    industry: "local_business",
    websiteObjective: ["drive_footfall"],
    servicesProducts: [{ name: "FIXTURE-OFFER", kind: "service" }],
    availableContent: content({ propositionText: "unavailable", faq: "verified_available" }),
  });
  const decided = runPipeline(input);
  return { input, decided, site: generateWebsite(input, decided.output, decided.contract, { suppliedContent: supplied }) };
}

describe("FD-09 — approved or supplied content with no renderer blocks publication; never a crash, never a silent drop", () => {
  it("negative: an APPROVED draft whose target no page renders does not throw — it is a publication blocker", () => {
    // `about` has no section on a drive_footfall site. (Since Phase 1.3 every home page
    // carries `proposition`, so an approved proposition now renders — see the positive
    // test below.)
    const supplied = { drafts: [{ target: "about", value: "FIXTURE approved about copy", provenance: "approved_ai_draft", source: "FIXTURE", approval: TEST_APPROVAL }] };
    let result: ReturnType<typeof footfallSite> | undefined;
    expect(() => (result = footfallSite(supplied))).not.toThrow();
    const { decided, site } = result!;
    expect(decided.output.pages.flatMap((p) => p.requiredSections)).not.toContain("about");
    const entry = site.manifest.integrity.entries.find((e) => e.domain === "content_draft" && e.subject === "about");
    expect(entry).toMatchObject({ status: "unavailable", blocksPublication: true });
    expect(site.manifest.integrity.publicationBlockers).toHaveLength(1);
  });

  it("positive (Phase 1.3): an approved proposition now RENDERS on every home page, whatever the objective", () => {
    const supplied = { drafts: [{ target: "proposition", value: "FIXTURE approved headline", provenance: "approved_ai_draft", source: "FIXTURE", approval: TEST_APPROVAL }] };
    const { decided, site } = footfallSite(supplied);
    expect(decided.output.pages.find((p) => p.route === "/")!.requiredSections[0]).toBe("proposition");
    expect(site.files["static/index.html"]).toContain("FIXTURE approved headline");
    expect(site.manifest.integrity.publicationBlockers).toEqual([]);
  });

  it("negative: the content gate fails on a generation publication blocker, even when served HTML is otherwise clean", () => {
    const clean = page("<h1>FIXTURE</h1><p>FIXTURE body text</p>");
    const withBlocker = runPipeline(baseInput(), { evidence: { bundle: collectBuildEvidence({ servedHtml: { "/": clean } }), generation: { publicationBlockers: ["[content_draft] proposition: FIXTURE"] } } }).output.quality;
    expect(withBlocker.gates.content).toBe(false);
    expect(withBlocker.blockers.join(" ")).toContain("generation: [content_draft] proposition");
    const without = runPipeline(baseInput(), { evidence: { bundle: collectBuildEvidence({ servedHtml: { "/": clean } }), generation: { publicationBlockers: [] } } }).output.quality;
    expect(without.blockers.join(" ")).not.toContain("generation:");
  });

  it("negative: supplied content that no section renders is recorded as a blocker, not dropped", () => {
    // A drive_footfall site has no about section on any page.
    const { decided, site } = footfallSite({ aboutText: "FIXTURE unplaced about copy." });
    expect(decided.output.pages.flatMap((p) => p.requiredSections)).not.toContain("about");
    expect(site.files["static/index.html"]).not.toContain("FIXTURE unplaced about copy.");
    expect(site.manifest.integrity.publicationBlockers).toEqual([expect.stringContaining("[supplied_value] about")]);
  });

  it("positive: supplied content that IS rendered is delivered and blocks nothing", () => {
    const { site } = offersSite([{ name: "FIXTURE-SERVICE-A", description: "FIXTURE rendered description." }]);
    const entry = site.manifest.integrity.entries.find((e) => e.domain === "supplied_value" && e.subject.startsWith("description of"));
    expect(entry?.status).toBe("delivered");
    expect(site.manifest.integrity.publicationBlockers.filter((b) => b.includes("FIXTURE-SERVICE-A"))).toEqual([]);
  });

  it("invariant kept: an UNAPPROVED draft that reaches a page is still a mismatch (generation must not emit it)", () => {
    const supplied = { drafts: [{ target: "proposition", value: "FIXTURE held headline", provenance: "ai_draft", source: "FIXTURE" }] };
    const { decided, site } = footfallSite(supplied);
    expect(site.manifest.contentDrafts.held.map((d) => d.target)).toEqual(["proposition"]);
    const files = { ...site.files, "static/index.html": `${site.files["static/index.html"]}<p>FIXTURE held headline</p>` };
    const ledger = reconcileDecisionExecution({ output: decided.output, model: site.model, files, content: site.content, engagement: site.manifest.engagement.reconciliation });
    expect(ledger.consistent).toBe(false);
    expect(ledger.entries.find((e) => e.domain === "content_draft" && e.status === "mismatch")?.reason).toContain("not approved reached a page");
  });
});

describe("FD-11 (a) — selected patterns are reconciled", () => {
  it("a selected pattern that no section renders is recorded unavailable, with why, and does not block publication", () => {
    const { decided, site } = footfallSite({});
    const unrendered = decided.output.selectedPatterns.filter((id) => !site.manifest.patternsUsed.includes(id));
    for (const id of unrendered) {
      const entry = site.manifest.integrity.entries.find((e) => e.domain === "pattern" && e.subject === id);
      expect(entry, id).toMatchObject({ status: "unavailable" });
      expect(entry?.reason).toContain("no generator renderer");
      expect(entry?.blocksPublication).toBeUndefined();
    }
    for (const id of site.manifest.patternsUsed) {
      expect(site.manifest.integrity.entries.find((e) => e.domain === "pattern" && e.subject === id)?.status).toBe("delivered");
    }
  });
});

// =================================================================== FD-05

const menuSource = { id: "menu-doc", kind: "customer_document" as const, description: "FIXTURE menu document", publication: "not_authorized" as const, restrictionEvidence: "FIXTURE: for design illustrations only" };
const authorised = { ...menuSource, id: "brief", publication: "authorized" as const, restrictionEvidence: undefined };
const unknownSource = { ...menuSource, id: "unknown-doc", publication: "unknown" as const, restrictionEvidence: undefined };

function offerSite(offer: Record<string, unknown>, sources: BusinessInputDraft["sources"]) {
  const input = baseInput({
    businessName: "FIXTURE-CATALOGUE",
    industry: "professional_services",
    websiteObjective: ["generate_leads"],
    sources,
    servicesProducts: [{ name: "FIXTURE-ITEM-ONE", kind: "service", ...offer }],
    availableContent: content({ serviceDescriptions: "partial" }),
  });
  const decided = runPipeline(input);
  const site = generateWebsite(input, decided.output, decided.contract, {});
  return { input, decided, site, html: site.files["static/index.html"] ?? "" };
}

const owner = (extra: Record<string, unknown> = {}) => ({ provenance: { provenance: "customer_supplied_unverified", source: "FIXTURE row 1", ...extra } });

describe("FD-05 — a name publishes only when its provenance AND its source allow it", () => {
  it("negative: a source marked not authorised withholds its names, overriding everything downstream", () => {
    const { decided, site, html } = offerSite(owner({ sourceId: "menu-doc" }), [menuSource]);
    expect(site.content.offers[0]!.decision.state).toBe("withheld");
    expect(html).not.toContain("FIXTURE-ITEM-ONE");
    expect(JSON.stringify(site.files)).not.toContain("FIXTURE-ITEM-ONE");
    expect(decided.output.contentPlan.sections.find((s) => s.category === "services")?.render).toBe(false);
    expect(decided.output.approvalsRequired.join(" ")).toContain("not publishable");
    expect(site.manifest.integrity.consistent).toBe(true);
  });

  it("negative: even a VERIFIED value is withheld by a restricted source", () => {
    const { site } = offerSite({ provenance: { provenance: "customer_supplied_verified", source: "FIXTURE", sourceId: "menu-doc" } }, [menuSource]);
    expect(site.content.offers[0]!.decision.state).toBe("withheld");
    expect(site.content.offers[0]!.decision.reason).toContain("overrides verification");
  });

  it("negative: an unverified name whose source authorisation is unknown, or uncited, is held", () => {
    expect(offerSite(owner({ sourceId: "unknown-doc" }), [unknownSource]).site.content.offers[0]!.decision.state).toBe("held");
    expect(offerSite(owner(), []).site.content.offers[0]!.decision.state).toBe("held");
  });

  it("negative: AI-generated and inferred names never publish; approval lifts only the AI draft", () => {
    expect(offerSite({ provenance: { provenance: "ai_draft", source: "FIXTURE", sourceId: "brief" } }, [authorised]).site.content.offers[0]!.decision.state).toBe("held");
    expect(offerSite({ provenance: { provenance: "operator_inference", source: "FIXTURE", sourceId: "brief", approval: TEST_APPROVAL } }, [authorised]).site.content.offers[0]!.decision.state).toBe("refused");
    const approvedDraft = offerSite({ provenance: { provenance: "approved_ai_draft", source: "FIXTURE", sourceId: "brief", approval: TEST_APPROVAL } }, [authorised]);
    expect(approvedDraft.site.content.offers[0]!.decision.state).toBe("published");
    expect(approvedDraft.html).toContain("FIXTURE-ITEM-ONE");
  });

  it("negative: a publicly discovered name needs an approval record", () => {
    expect(offerSite({ provenance: { provenance: "public_source", source: "FIXTURE listing", sourceId: "brief" } }, [authorised]).site.content.offers[0]!.decision.state).toBe("held");
    expect(offerSite({ provenance: { provenance: "public_source", source: "FIXTURE listing", sourceId: "brief", approval: TEST_APPROVAL } }, [authorised]).site.content.offers[0]!.decision.state).toBe("published");
  });

  it("negative: provenance citing an undeclared source is refused, not published", () => {
    expect(offerSite(owner({ sourceId: "no-such-source" }), [authorised]).site.content.offers[0]!.decision.state).toBe("refused");
  });

  it("positive: an owner-stated name from an authorised source publishes literally", () => {
    const { site, html } = offerSite(owner({ sourceId: "brief" }), [authorised]);
    expect(site.content.offers[0]!.decision.state).toBe("published");
    expect(html).toContain("FIXTURE-ITEM-ONE");
  });

  it("positive: EXISTING behaviour is preserved — an offer with no provenance record still publishes", () => {
    const { site, html } = offerSite({}, []);
    expect(site.content.offers[0]!.decision.state).toBe("published");
    expect(site.content.offers[0]!.decision.reason).toContain("pre-provenance input");
    expect(html).toContain("FIXTURE-ITEM-ONE");
  });

  it("a withheld name reaches neither structured data, nor a derived page, nor a form's options", () => {
    const input = baseInput({
      businessName: "FIXTURE-CATALOGUE",
      industry: "professional_services",
      websiteObjective: ["generate_leads"],
      requiredFunctionality: ["contact_form"],
      sources: [menuSource, authorised],
      servicesProducts: [
        { name: "FIXTURE-WITHHELD", kind: "service", description: "FIXTURE description.", provenance: { provenance: "customer_supplied_unverified", source: "FIXTURE", sourceId: "menu-doc" } },
        { name: "FIXTURE-PUBLISHED", kind: "service", description: "FIXTURE description.", provenance: { provenance: "customer_supplied_unverified", source: "FIXTURE", sourceId: "brief" } },
      ],
      availableContent: content({ serviceDescriptions: "verified_available", contactDetails: "verified_available", contactEmail: "verified_available" }),
      constraints: { seoDependency: "high", localization: [], integrations: [] },
    });
    const decided = runPipeline(input);
    const site = generateWebsite(input, decided.output, decided.contract, { suppliedContent: { contactDetails: { email: "fixture@example.invalid" } } });
    const everything = JSON.stringify(site.files);
    expect(everything).not.toContain("FIXTURE-WITHHELD");
    expect(everything).toContain("FIXTURE-PUBLISHED");
    expect(decided.output.contentHubs.find((h) => h.offer === "FIXTURE-WITHHELD")?.route).toBeNull();
    expect(decided.output.contentHubs.find((h) => h.offer === "FIXTURE-PUBLISHED")?.route).toBe("/services/fixture-published");
    expect(JSON.stringify(decided.output.seoArtifacts)).not.toContain("FIXTURE-WITHHELD");
  });

  it("negative control: a renderer that ignores the verdict is a content_verdict mismatch", () => {
    const { decided, site } = offerSite(owner({ sourceId: "menu-doc" }), [menuSource]);
    const files = { ...site.files, "static/index.html": `${site.files["static/index.html"]}<h3>FIXTURE-ITEM-ONE</h3>` };
    const ledger = reconcileDecisionExecution({ output: decided.output, model: site.model, files, content: site.content, engagement: site.manifest.engagement.reconciliation });
    expect(ledger.consistent).toBe(false);
    expect(ledger.entries.find((e) => e.domain === "content_verdict" && e.status === "mismatch")?.reason).toContain("does not publish");
  });
});

describe("FD-13 — an unverified business name is never described as verified", () => {
  it("the SEO title's provenance says supplied, not verified, and names the confirmation it still needs", () => {
    const { decided } = offerSite(owner({ sourceId: "brief" }), [authorised]);
    const title = decided.output.seoArtifacts.pages[0]!.title;
    expect(title.source).toContain("supplied business name");
    expect(title.source).not.toContain("verified business name");
    expect(title.source).toContain("not yet confirmed");
  });
});
