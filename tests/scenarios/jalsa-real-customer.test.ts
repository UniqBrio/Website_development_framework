/**
 * FIRST REAL-CUSTOMER DRY RUN — Jalsa Restaurant, without a host (runs in `npm test`).
 *
 * The host run (tests/host/jalsa.host.ts) proves the same honesty on SERVED html; this
 * file proves it on generated output on every gate, plus the parts no browser is
 * needed for: raw preservation, reproducible extraction, seam ↔ evidence agreement,
 * the synthetic-data prohibition (with a negative control), the AI-draft approval
 * path on this customer's data, and the framework defects this run discovered.
 *
 * KNOWN-DEFECT tests pin CURRENT behaviour that docs/FIRST-REAL-CUSTOMER-DRY-RUN-REPORT.md
 * classifies as FRAMEWORK_DEFECT. They are evidence, not endorsement: fixing a defect
 * must flip its test deliberately.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { runPipeline } from "../../src/pipeline.js";
import { generateWebsite } from "../../src/generation/generate-website.js";
import { engineInputFromWorkflow } from "../../src/workflow/seams.js";
import { NEVER_GENERATED, suppliedContentSchema } from "../../src/generation/content-values.js";
import { parseBusinessInput, type BusinessInput } from "../../src/design-intelligence/types/business-input.js";
import { extractMenu } from "../../customers/jalsa-restaurant/evidence/tools/extract-menu.mjs";
import { classifyServedText, JALSA, loadJalsaEvidence, syntheticFixtureValues } from "./jalsa-provenance.js";

type Supplied = { assets?: unknown; drafts: Array<Record<string, unknown>> };

function seam() {
  return engineInputFromWorkflow([{ file: JALSA.seamRecord, markdown: readFileSync(JALSA.seamRecord, "utf8") }]);
}

function generate(input: BusinessInput, supplied: unknown) {
  const decided = runPipeline(input);
  const generated = generateWebsite(input, decided.output, decided.contract, { suppliedContent: supplied });
  const staticHtml = Object.entries(generated.files).filter(([p]) => p.startsWith("static/") && p.endsWith(".html"));
  const everyFile = Object.values(generated.files).join("\n");
  return { decided, generated, staticHtml, everyFile };
}

interface FactRegister {
  facts: Array<{ id: string; state: string; provenanceClass: string; source: string }>;
  inventoryStatuses: { availableAssets: Record<string, string>; availableContent: Record<string, string> };
}

describe("first real-customer dry run — Jalsa Restaurant (ingestion and provenance)", () => {
  it("preserves the raw customer material exactly as received", () => {
    const hashes = JALSA.rawFiles.map((f) => createHash("sha256").update(readFileSync(f)).digest("hex"));
    expect(hashes).toEqual(JALSA.rawSha256);
  });

  it("re-derives the committed menu evidence from the raw file, verbatim and un-normalised", () => {
    const committed = JSON.parse(readFileSync(JALSA.extraction, "utf8"));
    const fresh = extractMenu();
    expect(fresh).toEqual(committed);
    // Source meaning preserved, not tidied: the disclaimer, trailing spaces, spelling variants, partial rows.
    expect(fresh.elements[0]).toMatchObject({ type: "paragraph", text: "For design illustrations only" });
    expect(fresh.filters.listItems.map((f) => f.text)).toContain("Biryani ");
    expect(fresh.menu.rows.map((r) => r.item)).toEqual(expect.arrayContaining(["Mutton Chettinadu", "Chicken Chettinad", "Chicken Chilly", "Chilli Paneer"]));
    expect(fresh.menu.rows.filter((r) => r.flags.some((f) => f.code === "BRACKETED_TRANSCRIPTION_NOTE")).map((r) => r.sourceNumber)).toEqual(["36", "51", "52"]);
    expect(fresh.extraction.hiddenContentChecked.every((h) => h.occurrences === 0)).toBe(true);
  });

  it("transcribes offers only as verbatim menu rows, and withholds exactly the rows the source marks as partial", () => {
    const { businessInput } = seam();
    const evidence = loadJalsaEvidence();
    const items = new Set(evidence.menu.rows.map((r) => r.item));
    for (const offer of businessInput.servicesProducts) {
      expect(items.has(offer.name), `offer "${offer.name}" is not a verbatim menu row`).toBe(true);
      expect(offer.description, "no menu row carries a description").toBeUndefined();
      expect(offer.priceKnown, "menu prices are provided_unverified").toBe(false);
    }
    const offered = new Set(businessInput.servicesProducts.map((o) => o.name));
    const withheld = evidence.menu.rows.filter((r) => !offered.has(r.item));
    expect(withheld.map((r) => r.sourceNumber)).toEqual(["36", "51", "52"]);
    expect(businessInput.location, "no location evidence exists").toBeUndefined();
    expect(businessInput.constraints, "no constraint was stated by the customer").toBeUndefined();
  });

  it("keeps the seam's inventory statuses identical to the fact register (one status per fact)", () => {
    const { businessInput } = seam();
    const register = JSON.parse(readFileSync(JALSA.factRegister, "utf8")) as FactRegister;
    expect(businessInput.availableAssets).toEqual(register.inventoryStatuses.availableAssets);
    expect(businessInput.availableContent).toEqual(register.inventoryStatuses.availableContent);
    // Nothing is verified: no fact register entry may claim a verified state without customer evidence.
    expect(register.facts.filter((f) => f.state === "VERIFIED")).toEqual([]);
  });
});

describe("first real-customer dry run — Jalsa Restaurant (generated output integrity)", () => {
  it("generates nothing unverified, invented, synthetic or unapproved, and classifies every text fragment", () => {
    const { businessInput, suppliedContent } = seam();
    const evidence = loadJalsaEvidence();
    const { generated, staticHtml, everyFile } = generate(businessInput, suppliedContent);

    expect(generated.manifest.dataset.classification).toBe("unmarked");
    expect(generated.manifest.integrity.consistent).toBe(true);
    for (const [path, html] of staticHtml) {
      const ledger = classifyServedText(html, businessInput.businessName, evidence);
      expect(ledger.unclassified, `unclassified text in ${path}`).toEqual([]);
      expect(html).not.toContain("₹");
      expect(html).not.toMatch(/tel:|mailto:|wa\.me|<address|<img/i);
    }
    for (const value of syntheticFixtureValues()) expect(everyFile, `synthetic fixture value "${value}"`).not.toContain(value);
    for (const d of generated.manifest.contentDrafts.held) expect(everyFile, `held AI draft ${d.target}`).not.toContain(d.value);
    expect(generated.manifest.contentDrafts.published).toEqual([]);
    expect(generated.content.assets.logo).toBeNull();
    expect(generated.content.assets.refused.map((r) => r.asset)).toEqual(["logo"]);
  });

  it("negative control: the synthetic-value check and the text classifier detect a leak", () => {
    const { businessInput, suppliedContent } = seam();
    const evidence = loadJalsaEvidence();
    const leaked = parseBusinessInput({ ...businessInput, servicesProducts: [...businessInput.servicesProducts, { name: "Ashvattha Tax & Compliance", kind: "service" }] });
    const { staticHtml, everyFile } = generate(leaked, suppliedContent);
    expect(syntheticFixtureValues().some((v) => everyFile.includes(v))).toBe(true);
    const home = staticHtml.find(([p]) => p === "static/index.html")![1];
    expect(classifyServedText(home, businessInput.businessName, evidence).unclassified.map((u) => u.text)).toContain("Ashvattha Tax & Compliance");
  });

  it("AI draft path on this customer's data: unapproved is held and absent; only an approval record publishes", () => {
    const { businessInput, suppliedContent } = seam();
    const base = suppliedContent as Supplied;
    const meta = base.drafts.find((d) => d.target === "metaDescription:/")!;
    const approval = { approvedBy: "TEST-ONLY simulated approver (not a customer approval)", approvedAt: "2026-09-15" };

    // As recorded: AI_DRAFT, no approval → held, not rendered.
    const asRecorded = generate(businessInput, base);
    expect(asRecorded.generated.manifest.contentDrafts.held.map((d) => d.target)).toEqual(["proposition", "metaDescription:/"]);
    for (const d of base.drafts) expect(asRecorded.everyFile).not.toContain(d["value"] as string);

    // `approved_ai_draft` WITHOUT an approval record is still held.
    const noRecord = generate(businessInput, { ...base, drafts: [{ ...meta, provenance: "approved_ai_draft" }] });
    expect(noRecord.generated.manifest.contentDrafts.published).toEqual([]);
    expect(noRecord.everyFile).not.toContain(meta["value"] as string);

    // TEST-ONLY simulated approval (never written to the customer workspace): the channel publishes it
    // into the served <meta name="description">, and the integrity ledger records delivery.
    const simulated = generate(businessInput, { ...base, drafts: [{ ...meta, provenance: "approved_ai_draft", approval }] });
    expect(simulated.generated.manifest.contentDrafts.published.map((d) => d.target)).toEqual(["metaDescription:/"]);
    const home = simulated.staticHtml.find(([p]) => p === "static/index.html")![1];
    expect(home).toContain(`<meta name="description" content="${meta["value"] as string}">`);
    expect(simulated.generated.manifest.integrity.entries.find((e) => e.domain === "content_draft" && e.subject === "metaDescription:/")?.status).toBe("delivered");

    // The workspace itself records no approval.
    expect(readFileSync(JALSA.seamRecord, "utf8")).not.toMatch(/"approval"\s*:/);
  });

  it("evaluates the menu document's filter list as a possible requested interaction and does not accept it", () => {
    const { businessInput, suppliedContent } = seam();
    const { decided, generated } = generate(businessInput, suppliedContent);
    const e = decided.output.engagement;
    expect(e.decision).toBe("NO_EXPERIENCE");
    expect(e.requestedIdeaAssessment).toMatchObject({ category: "product_service_finder", qualified: false });
    expect(e.requestedIdeaAssessment!.reasons.join(" ")).toMatch(/data_integrity/);
    expect(generated.manifest.engagement.experiences).toEqual([]);
    expect(generated.manifest.engagement.runtime).toBeNull();
  });
});

describe("first real-customer dry run — Jalsa Restaurant (KNOWN framework defects reproduce)", () => {
  it("FD-01/FD-02: the input contract cannot represent an unknown objective or audience", () => {
    const { businessInput } = seam();
    expect(() => parseBusinessInput({ ...businessInput, websiteObjective: [] })).toThrow();
    expect(() => parseBusinessInput({ ...businessInput, targetAudience: [] })).toThrow();
  });

  it("FD-03: a verified price has no value channel — pricing is never generated", () => {
    expect(NEVER_GENERATED).toContain("pricing");
    expect(Object.keys(suppliedContentSchema.shape)).not.toContain("pricing");
    const { businessInput } = seam();
    expect(Object.keys(businessInput.servicesProducts[0]!)).not.toContain("price");
  });

  it("FD-04: menu categories, portions and dietary filters have no home in the offer contract", () => {
    const { businessInput } = seam();
    const offerKeys = new Set(businessInput.servicesProducts.flatMap((o) => Object.keys(o)));
    for (const missing of ["category", "group", "dietary", "portion", "price"]) expect(offerKeys.has(missing)).toBe(false);
  });

  it("FD-05 RESOLVED (Phase 0.3): the menu's names are withheld because its source is not authorised for publication", () => {
    // Was: the 49 names rendered although the content engine withheld the section.
    // The customer's own evidence (F-006, "For design illustrations only") is now
    // recorded as a source restriction, and it overrides everything downstream.
    const { businessInput, suppliedContent } = seam();
    const { decided, generated, staticHtml, everyFile } = generate(businessInput, suppliedContent);
    expect(businessInput.sources.find((s) => s.id === "menu-docx")).toMatchObject({ publication: "not_authorized", restrictionEvidence: "For design illustrations only" });
    expect(decided.output.contentPlan.sections.find((s) => s.category === "services")?.render).toBe(false);

    const home = staticHtml.find(([p]) => p === "static/index.html")![1];
    for (const offer of businessInput.servicesProducts) expect(everyFile, offer.name).not.toContain(`>${offer.name}<`);
    expect(home).not.toContain("<h3>Egg Kheema Masala</h3>");

    // Every offer is withheld, recorded with the reason, and never a mismatch.
    expect(generated.content.offers.every((o) => o.decision.state === "withheld")).toBe(true);
    expect(generated.manifest.integrity.entries.filter((e) => e.domain === "content_verdict" && e.status === "mismatch")).toEqual([]);
    expect(decided.output.approvalsRequired.join(" ")).toContain("offer names not publishable (49)");
    // No page is derived for an offer whose name may not be published.
    expect(decided.output.contentHubs.every((h) => h.route === null)).toBe(true);
  });

  it("FD-06 RESOLVED (Phase 0.1): every missing-value marker on the served page is counted as placeholder text", () => {
    // Was: 1 slot counted while pending markers and the unavailable notice were invisible.
    // Since FD-05 (Phase 0.3) the 49 withheld menu names no longer render at all, so the
    // page's remaining missing-value markers are the hours slot and the contact notice.
    const { businessInput, suppliedContent } = seam();
    const { generated, staticHtml } = generate(businessInput, suppliedContent);
    const home = staticHtml.find(([p]) => p === "static/index.html")![1];
    expect((home.match(/data-content-unavailable=/g) ?? []).length).toBe(1);
    // Since Phase 1.3 the home page carries a hero, so its slots are: proposition,
    // audience (inferred, FD-02), next step, hours — plus the contact notice.
    expect(generated.manifest.indexability.placeholders).toEqual([{ route: "/", slots: 4, pending: 1 }]);
  });

  it("FD-09 RESOLVED (Phase 0.2 + 1.3): an approved proposition renders on the home page; it neither throws nor vanishes", () => {
    // Was: generateWebsite threw "an approved draft was not rendered", because the
    // drive_footfall home page had no proposition section. The home invariant gives
    // every home page one, and an unrenderable approved value is a recorded blocker.
    const { businessInput, suppliedContent } = seam();
    const base = suppliedContent as Supplied;
    const proposition = base.drafts.find((d) => d.target === "proposition")!;
    const approved = { ...base, drafts: [{ ...proposition, provenance: "approved_ai_draft", approval: { approvedBy: "TEST-ONLY simulated approver (not a customer approval)", approvedAt: "2026-09-15" } }] };
    const { decided, generated, staticHtml } = generate(businessInput, approved);
    expect(decided.output.pages.find((p) => p.route === "/")!.requiredSections[0]).toBe("proposition");
    expect(generated.manifest.integrity.consistent).toBe(true);
    expect(generated.manifest.integrity.publicationBlockers).toEqual([]);
    expect(generated.manifest.contentDrafts.published.map((d) => d.target)).toEqual(["proposition"]);
    expect(staticHtml.find(([p]) => p === "static/index.html")![1]).toContain(proposition["value"] as string);
  });

  it("FD-11 RESOLVED (Phase 0.2 + 4.2): a pattern no renderer implements is never selected, so none is budgeted or promised", () => {
    // Was: perspective-card and magnetic-action were selected, given a route-JS budget
    // and a declared fallback, and rendered on no page.
    const { businessInput, suppliedContent } = seam();
    const { decided, generated } = generate(businessInput, suppliedContent);
    for (const id of ["perspective-card", "magnetic-action"]) {
      const decision = decided.output.selectionDecisions.find((d) => d.patternId === id);
      expect(decision?.outcome, id).toBe("reject");
      expect(decision?.gates.find((g) => g.gate === "generator_implementation")?.passed, id).toBe(false);
    }
    expect(decided.output.selectedPatterns).toEqual([]);
    expect(decided.contract.fallbackRequirements).toEqual([]);
    // Every selected pattern (none here) is reconciled; nothing is left unexplained.
    expect(generated.manifest.integrity.entries.filter((e) => e.domain === "pattern")).toEqual([]);
    expect(generated.manifest.integrity.consistent).toBe(true);
  });

  it("FD-08 RESOLVED (Phase 1.1): `location` and `location_and_contact` are one section in one vocabulary", () => {
    // Was: both ids sat in the architecture, and `location` was reported unallocated
    // while the location content was delivered under the other spelling.
    const { businessInput, suppliedContent } = seam();
    const { decided } = generate(businessInput, suppliedContent);
    expect(decided.output.sectionArchitecture).not.toContain("location");
    expect(decided.output.sectionArchitecture.filter((s) => s === "location_and_contact")).toHaveLength(1);
    expect(decided.output.pageAllocation.unallocated.map((u) => u.section)).not.toContain("location");
  });
});
