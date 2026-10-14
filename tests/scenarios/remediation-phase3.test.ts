/**
 * REMEDIATION PHASE 3 — the generic catalogue model (C3/C4), the price channel
 * (FD-03), typed attributes (FD-04) and entity-kind structured data (FD-15).
 *
 * NEGATIVE TESTS COME FIRST, as the plan requires for FD-03: a price is the first
 * evidence category the framework may publish, so every way it must NOT publish is
 * pinned before the one way it may.
 *
 * All fixtures are SYNTHETIC (`FIXTURE-*`).
 */
import { describe, expect, it } from "vitest";
import { runPipeline } from "../../src/pipeline.js";
import { generateWebsite } from "../../src/generation/generate-website.js";
import { attributeVocabulary } from "../../src/content/attribute-vocabulary.js";
import { baseInput, content } from "../fixtures/business-inputs.js";
import type { BusinessInputDraft } from "../../src/design-intelligence/types/business-input.js";

const APPROVAL = { approvedBy: "TEST-ONLY simulated approver", approvedAt: "2026-09-16" };
const MENU_SOURCE = { id: "menu", kind: "customer_document" as const, description: "FIXTURE menu", publication: "authorized" as const };
const RESTRICTED = { id: "draft-menu", kind: "customer_document" as const, description: "FIXTURE draft menu", publication: "not_authorized" as const, restrictionEvidence: "FIXTURE: for design illustrations only" };
const verified = (source = "FIXTURE price list") => ({ provenance: "customer_supplied_verified" as const, source, sourceId: "menu" });
const ownerStated = { provenance: "customer_supplied_unverified" as const, source: "FIXTURE menu row", sourceId: "menu" };

/** A catalogue business: two groups, three items, prices and dietary attributes. */
function catalogueSite(overrides: Partial<BusinessInputDraft> = {}, pricingStatus: "verified_available" | "provided_unverified" = "verified_available") {
  const input = baseInput({
    businessName: "FIXTURE-CATALOGUE-BUSINESS",
    industry: "local_business",
    websiteObjective: ["drive_footfall"],
    sources: [MENU_SOURCE, RESTRICTED],
    offerGroups: [
      { id: "mains", name: "FIXTURE Mains", order: 1, provenance: ownerStated },
      { id: "drinks", name: "FIXTURE Drinks", order: 2, provenance: ownerStated },
    ],
    servicesProducts: [
      {
        name: "FIXTURE-DISH-A",
        kind: "product",
        groupIds: ["mains"],
        price: { amount: 130, currency: "₹", provenance: verified() },
        attributes: [{ key: "dietary_classification", value: "vegetarian", provenance: verified("FIXTURE signed menu") }],
        provenance: ownerStated,
      },
      {
        name: "FIXTURE-DISH-B",
        kind: "product",
        groupIds: ["mains"],
        variants: [
          { label: "FIXTURE Half", price: { amount: 70, currency: "₹", unit: "half portion", provenance: verified() } },
          { label: "FIXTURE Full", price: { amount: 130, currency: "₹", provenance: verified() } },
        ],
        provenance: ownerStated,
      },
      { name: "FIXTURE-DRINK", kind: "product", groupIds: ["drinks"], price: { amount: 25, currency: "₹", taxNote: "FIXTURE: taxes included", provenance: verified() }, provenance: ownerStated },
    ],
    availableContent: content({ pricing: pricingStatus, serviceDescriptions: "unavailable" }),
    ...overrides,
  });
  const decided = runPipeline(input);
  const site = generateWebsite(input, decided.output, decided.contract, {});
  return { input, decided, site, home: site.files["static/index.html"] ?? "" };
}

describe("FD-03 — a price publishes only from a verified value (negative tests first)", () => {
  it("negative: an unverified price never renders, whatever the inventory says", () => {
    const { site, home } = catalogueSite({
      servicesProducts: [{ name: "FIXTURE-DISH-A", kind: "product", price: { amount: 130, currency: "₹", provenance: ownerStated }, provenance: ownerStated }],
    });
    expect(home).not.toContain("₹130");
    expect(site.content.catalogue.withheld.map((w) => w.what)).toContain('price of "FIXTURE-DISH-A"');
  });

  it("negative: an AI-drafted price never renders, even approved by a person", () => {
    const aiPrice = { provenance: "approved_ai_draft" as const, source: "FIXTURE draft", sourceId: "menu", approval: APPROVAL };
    const { site, home } = catalogueSite({
      servicesProducts: [{ name: "FIXTURE-DISH-A", kind: "product", price: { amount: 130, currency: "₹", provenance: aiPrice }, provenance: ownerStated }],
    });
    expect(home).not.toContain("₹130");
    expect(site.content.catalogue.withheld[0]?.reason).toContain("a fact is measured, not approved");
  });

  it("negative: a source that is not authorised for publication overrides a VERIFIED price", () => {
    const restrictedPrice = { provenance: "customer_supplied_verified" as const, source: "FIXTURE", sourceId: "draft-menu" };
    const { site, home } = catalogueSite({
      servicesProducts: [{ name: "FIXTURE-DISH-A", kind: "product", price: { amount: 130, currency: "₹", provenance: restrictedPrice }, provenance: ownerStated }],
    });
    expect(home).not.toContain("₹130");
    expect(site.content.catalogue.withheld[0]?.reason).toContain("overrides verification");
  });

  it("negative: a verified price is still withheld while the pricing inventory is unverified (strictest wins)", () => {
    const { home, site } = catalogueSite({}, "provided_unverified");
    expect(home).not.toContain("₹130");
    expect(site.content.catalogue.withheld.some((w) => w.reason.includes("the content inventory records pricing"))).toBe(true);
  });

  it("positive: a verified price, from an authorised source, with a verified inventory, renders with its unit and tax note", () => {
    const { home, site } = catalogueSite();
    expect(home).toContain("₹130");
    expect(home).toContain("₹70 per half portion");
    expect(home).toContain("₹25 (FIXTURE: taxes included)");
    // Every published price keeps its provenance.
    const item = site.content.catalogue.groups.flatMap((g) => g.items).find((i) => i.name === "FIXTURE-DISH-A");
    expect(item?.price?.decision).toMatchObject({ state: "published", provenance: "customer_supplied_verified" });
  });
});

describe("FD-04 — the generic catalogue carries groups, variants and typed attributes", () => {
  it("items render inside their group, under the group's own heading", () => {
    const { home } = catalogueSite();
    expect(home).toContain("<h3>FIXTURE Mains</h3>");
    expect(home).toContain("<h3>FIXTURE Drinks</h3>");
    expect(home.indexOf("FIXTURE Mains")).toBeLessThan(home.indexOf("FIXTURE Drinks"));
  });

  it("negative: no group is guessed — an item whose source states none is listed separately", () => {
    const { site, home } = catalogueSite({
      servicesProducts: [
        { name: "FIXTURE-GROUPED", kind: "product", groupIds: ["mains"], provenance: ownerStated },
        { name: "FIXTURE-UNGROUPED", kind: "product", provenance: ownerStated },
      ],
    });
    expect(site.content.catalogue.ungrouped.map((i) => i.name)).toEqual(["FIXTURE-UNGROUPED"]);
    expect(home).toContain("Also available");
  });

  it("negative: a regulated attribute needs a VERIFIED value; an owner-stated one is withheld", () => {
    const { site, home } = catalogueSite({
      servicesProducts: [
        { name: "FIXTURE-DISH-A", kind: "product", groupIds: ["mains"], attributes: [{ key: "dietary_classification", value: "vegetarian", provenance: ownerStated }], provenance: ownerStated },
      ],
    });
    expect(home).not.toContain("Dietary classification");
    expect(site.content.catalogue.withheld[0]?.reason).toContain("regulated attribute: verified values only");
  });

  it("negative: an attribute key outside the industry vocabulary, or a value outside its set, is refused", () => {
    const { site } = catalogueSite({
      servicesProducts: [
        { name: "FIXTURE-DISH-A", kind: "product", groupIds: ["mains"], attributes: [{ key: "fixture_invented_key", value: "x", provenance: verified() }], provenance: ownerStated },
        { name: "FIXTURE-DISH-B", kind: "product", groupIds: ["mains"], attributes: [{ key: "dietary_classification", value: "FIXTURE-INVENTED-MARK", provenance: verified() }], provenance: ownerStated },
      ],
    });
    const reasons = site.content.catalogue.withheld.map((w) => w.reason).join(" ");
    expect(reasons).toContain("is not in the local_business attribute vocabulary");
    expect(reasons).toContain("is not one of vegetarian, non_vegetarian, contains_egg, vegan");
  });

  it("positive: a verified dietary mark renders, and the vocabulary marks it regulated", () => {
    const { home } = catalogueSite();
    expect(home).toContain("Dietary classification: vegetarian");
    expect(attributeVocabulary("local_business").find((a) => a.key === "dietary_classification")?.regulated).toBe(true);
  });

  it("the framework never derives a dietary mark from a name", () => {
    const { site, home } = catalogueSite({
      servicesProducts: [{ name: "FIXTURE Veg Something", kind: "product", groupIds: ["mains"], provenance: ownerStated }],
    });
    expect(site.content.catalogue.groups.flatMap((g) => g.items)[0]?.attributes).toEqual([]);
    expect(home).not.toContain("Dietary");
  });
});

describe("FD-15 — structured data and hub pages follow the entity kind", () => {
  it("negative: catalogue items get no per-item page and no Service type", () => {
    // Even WITH descriptions — the condition that used to derive a page per item.
    const { decided, site } = catalogueSite({
      servicesProducts: [
        { name: "FIXTURE-DISH-A", kind: "product", groupIds: ["mains"], description: "FIXTURE description A.", provenance: ownerStated },
        { name: "FIXTURE-DISH-B", kind: "product", groupIds: ["mains"], description: "FIXTURE description B.", provenance: ownerStated },
      ],
      availableContent: content({ pricing: "verified_available", serviceDescriptions: "verified_available" }),
      constraints: { seoDependency: "high", localization: [], integrations: [] },
    });
    expect(decided.output.pages.filter((p) => p.derivedBy === "DD-093")).toEqual([]);
    expect(decided.output.contentHubs.every((h) => h.because.includes("catalogue item"))).toBe(true);
    const html = Object.entries(site.files).filter(([p]) => p.endsWith(".html")).map(([, b]) => b).join("\n");
    expect(html).not.toContain('"@type":"Service"');
  });

  it("positive: a SERVICE with a description still gets its hub page and its Service type", () => {
    const input = baseInput({
      businessName: "FIXTURE-SERVICES",
      industry: "professional_services",
      websiteObjective: ["generate_leads"],
      servicesProducts: [
        { name: "FIXTURE-SERVICE-A", kind: "service", description: "FIXTURE description A." },
        { name: "FIXTURE-SERVICE-B", kind: "service", description: "FIXTURE description B." },
      ],
      availableContent: content({ serviceDescriptions: "verified_available" }),
      constraints: { seoDependency: "high", localization: [], integrations: [] },
    });
    const decided = runPipeline(input);
    const site = generateWebsite(input, decided.output, decided.contract, {});
    expect(decided.output.pages.some((p) => p.derivedBy === "DD-093")).toBe(true);
    const html = Object.entries(site.files).filter(([p]) => p.endsWith(".html")).map(([, b]) => b).join("\n");
    expect(html).toContain('"@type":"Service"');
  });
});
