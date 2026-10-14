/**
 * CONVERSION FORM SEMANTICS — a form cannot be labelled as one action while its
 * contract represents another.
 *
 * Fixtures are synthetic (`FIXTURE-*`). Endpoint URLs are synthetic HOST
 * configuration; the framework never invents one.
 */
import { describe, expect, it } from "vitest";
import { runPipeline } from "../../src/pipeline.js";
import { generateWebsite } from "../../src/generation/generate-website.js";
import { walkNodes, type ComponentNode } from "../../src/generation/component-model.js";
import {
  CONVERSION_KINDS,
  formContractFor,
  validateConversionSemantics,
  type FormContract,
} from "../../src/generation/form-contracts.js";
import type { Offer } from "../../src/design-intelligence/types/business-input.js";
import { baseInput, content } from "../fixtures/business-inputs.js";
import { dryRunFixture } from "../fixtures/dry-run-fixture.js";

const OFFERS: Offer[] = [
  // FD-04: post-parse offers carry their empty catalogue defaults.
  { name: "FIXTURE-ASSESSMENT", kind: "service", customerSupplied: true, priceKnown: false, regulated: false, groupIds: [], variants: [], attributes: [] },
  { name: "FIXTURE-SUPPORT-A", kind: "product", customerSupplied: true, priceKnown: false, regulated: false, groupIds: [], variants: [], attributes: [] },
];

const ctx = (endpointUrl?: string) => ({
  offers: OFFERS,
  primaryObjective: "book_appointments",
  ...(endpointUrl ? { endpointUrl } : {}),
});

function fieldNames(c: FormContract): string[] {
  return c.fields.map((f) => f.name);
}

describe("each conversion kind has its own contract", () => {
  it("booking and checkout do not share a semantic contract", () => {
    const booking = formContractFor("booking", ctx());
    const checkout = formContractFor("checkout", ctx());
    expect(booking.actionLabel).not.toBe(checkout.actionLabel);
    expect(booking.submitLabel).not.toBe(checkout.submitLabel);
    expect(fieldNames(booking)).toEqual(expect.arrayContaining(["preferred_date", "service"]));
    expect(fieldNames(booking)).not.toContain("quantity");
    expect(fieldNames(checkout)).toEqual(expect.arrayContaining(["product", "quantity", "delivery_address"]));
    expect(fieldNames(checkout)).not.toContain("preferred_date");
    expect(booking.intent).not.toBe(checkout.intent);
  });

  it("no two kinds share both an action label and a field set", () => {
    const contracts = CONVERSION_KINDS.map((k) => formContractFor(k, ctx()));
    const signatures = contracts.map((c) => `${c.actionLabel}|${fieldNames(c).join(",")}`);
    expect(new Set(signatures).size).toBe(CONVERSION_KINDS.length);
  });

  it("a booking form without a scheduling integration REQUESTS an appointment; it never claims to book one", () => {
    const booking = formContractFor("booking", ctx("/fixture-host/booking"));
    expect(booking.actionLabel).toMatch(/request/i);
    expect(booking.submitLabel).toMatch(/request/i);
    expect(booking.intent).toContain("cannot confirm");
  });

  it("select options come only from owner-supplied offers, split by offer kind", () => {
    const booking = formContractFor("booking", ctx());
    const checkout = formContractFor("checkout", ctx());
    expect(booking.fields.find((f) => f.name === "service")?.options).toEqual(["FIXTURE-ASSESSMENT"]);
    expect(checkout.fields.find((f) => f.name === "product")?.options).toEqual(["FIXTURE-SUPPORT-A"]);
  });

  it("negative: with no supplied offers, the select field is omitted rather than filled with invented options", () => {
    const booking = formContractFor("booking", { offers: [], primaryObjective: "book_appointments" });
    expect(fieldNames(booking)).not.toContain("service");
  });

  it("no contract collects payment card data or passwords", () => {
    for (const kind of CONVERSION_KINDS) {
      const c = formContractFor(kind, ctx());
      for (const f of c.fields) expect(c.forbiddenFields, `${kind} collects ${f.name}`).not.toContain(f.name);
      expect(c.forbiddenFields).toEqual(expect.arrayContaining(["card_number", "cvc", "password"]));
    }
  });

  it("an endpoint exists only when the host supplies one", () => {
    expect(formContractFor("checkout", ctx()).endpoint.state).toBe("unconfigured");
    expect(formContractFor("checkout", ctx("/fixture-host/checkout")).endpoint).toEqual({
      state: "configured",
      url: "/fixture-host/checkout",
      method: "post",
    });
  });
});

// ------------------------------------------------------------------ validator

function checkoutPage(overrides: Partial<ComponentNode> = {}, contract = formContractFor("checkout", ctx("/fixture-host/checkout"))) {
  return {
    route: "/devices",
    nodes: [
      { id: "cta-repeat", kind: "action", text: contract.actionLabel, href: "#checkout-form", ...overrides },
      { id: "checkout-form", kind: "form", form: contract },
    ],
  };
}

describe("validateConversionSemantics refuses mismatches", () => {
  it("a consistent page has no violations", () => {
    expect(validateConversionSemantics([checkoutPage()])).toEqual([]);
  });

  it("an action labelled as one action but pointing at another action's form is refused", () => {
    const violations = validateConversionSemantics([checkoutPage({ text: "Request an appointment" })]);
    expect(violations).toHaveLength(1);
    expect(violations[0]?.problem).toContain('labelled "Request an appointment" but its target is a checkout form');
  });

  it("a form whose contract kind disagrees with its section is refused", () => {
    const booking = formContractFor("booking", ctx("/fixture-host/booking"));
    const page = {
      route: "/devices",
      nodes: [{ id: "checkout-form", kind: "form", form: booking }],
    };
    const violations = validateConversionSemantics([page]);
    expect(violations[0]?.problem).toContain('sits in the "checkout" section but its contract is "booking"');
  });

  it("an action promoting a form whose endpoint is unconfigured is refused", () => {
    const unconfigured = formContractFor("checkout", ctx());
    const violations = validateConversionSemantics([checkoutPage({}, unconfigured)]);
    expect(violations.some((v) => v.problem.includes("endpoint is unconfigured"))).toBe(true);
  });

  it("a contract that collects a forbidden field is refused", () => {
    const tampered = formContractFor("checkout", ctx("/fixture-host/checkout"));
    tampered.fields.push({ name: "card_number", label: "Card", type: "text", required: true, purpose: "FIXTURE tamper" });
    const violations = validateConversionSemantics([checkoutPage({}, tampered)]);
    expect(violations.some((v) => v.problem.includes('forbidden field "card_number"'))).toBe(true);
  });

  it("an action pointing at a page with no contracted form is refused", () => {
    const page = { route: "/", nodes: [{ id: "hero-cta", kind: "action", text: "Go to checkout", href: "/nowhere#checkout-form" }] };
    expect(validateConversionSemantics([page])[0]?.problem).toContain("no contracted form exists");
  });

  it("a form with no contract at all is refused", () => {
    const page = { route: "/", nodes: [{ id: "enquiry-form", kind: "form" }] };
    expect(validateConversionSemantics([page])[0]?.problem).toBe("form has no action contract");
  });
});

// ------------------------------------------------------------------ generated output

describe("generated sites honour the contracts", () => {
  const input = () =>
    baseInput({
      businessName: "FIXTURE-FORMS",
      industry: "local_business",
      websiteObjective: ["book_appointments", "sell_products"],
      servicesProducts: OFFERS,
      availableContent: content({ propositionText: "verified_available", contactDetails: "verified_available" }),
      availableAssets: { ...baseInput().availableAssets, productImages: "verified_available" },
    });

  function forms(site: ReturnType<typeof generateWebsite>): Array<{ page: string; node: ComponentNode }> {
    const out: Array<{ page: string; node: ComponentNode }> = [];
    walkNodes(site.model, (n, page) => {
      if (n.kind === "form") out.push({ page: page.route, node: n });
    });
    return out;
  }

  it("every generated form carries the contract of the section it sits in", () => {
    const i = input();
    const { output, contract } = runPipeline(i);
    const site = generateWebsite(i, output, contract);
    const found = forms(site);
    expect(found.length).toBeGreaterThan(0);
    for (const { node } of found) {
      expect(node.form?.kind).toBe(node.id.replace(/-form$/, ""));
    }
    expect(site.manifest.formContracts.length).toBe(found.length);
  });

  it("every call to action uses its target contract's action label, in both hosts", () => {
    const i = input();
    const { output, contract } = runPipeline(i);
    const site = generateWebsite(i, output, contract, {
      formEndpoints: { booking: "/fixture-host/booking", checkout: "/fixture-host/checkout" },
    });
    let actions = 0;
    walkNodes(site.model, (n, page) => {
      if (n.kind !== "action" && n.kind !== "sticky_cta") return;
      actions += 1;
      const pageModel = site.model.pages.find((p) => p.page.route === page.route);
      expect(pageModel?.cta.state === "present" ? pageModel.cta.label : null).toBe(n.text);
      const [route, anchor] = (n.href ?? "").startsWith("#") ? [page.route, n.href!.slice(1)] : n.href!.split("#");
      const target = forms(site).find((f) => f.page === (route || page.route) && f.node.id === anchor);
      expect(target?.node.form?.actionLabel).toBe(n.text);
    });
    expect(actions).toBeGreaterThan(0);
  });

  it("checkout and booking render distinct fields and labels in the served HTML", () => {
    const i = input();
    const { output, contract } = runPipeline(i);
    const site = generateWebsite(i, output, contract, {
      formEndpoints: { booking: "/fixture-host/booking", checkout: "/fixture-host/checkout" },
    });
    const html = Object.entries(site.files).filter(([p]) => p.startsWith("static/") && p.endsWith(".html")).map(([, b]) => b).join("\n");
    expect(html).toContain('data-contract="booking"');
    expect(html).toContain('data-contract="checkout"');
    expect(html).toContain('<input id="f-preferred_date" name="preferred_date" type="date"');
    expect(html).toContain('<input id="f-quantity" name="quantity" type="number" min="1"');
    expect(html).toContain(">Submit order request</button>");
    expect(html).toContain(">Send appointment request</button>");
    expect(html).not.toMatch(/name="(card_number|cvc|password)"/);
  });

  it("the Next.js source renders the same contract, disabled when unconfigured", () => {
    const i = dryRunFixture();
    const { output, contract } = runPipeline(i);
    const site = generateWebsite(i, output, contract);
    const devices = site.files["next/app/devices/page.tsx"] ?? "";
    expect(devices).toContain('data-contract="checkout" data-endpoint="unconfigured"');
    expect(devices).toContain("<fieldset disabled>");
    expect(devices).not.toMatch(/<form[^>]*action=/);
  });

  it("an unconfigured endpoint is recorded as a refusal with the reason", () => {
    const i = dryRunFixture();
    const { output, contract } = runPipeline(i);
    const site = generateWebsite(i, output, contract);
    const devices = site.model.pages.find((p) => p.page.route === "/devices");
    expect(devices?.refusals.some((r) => r.section === "checkout" && r.reason.includes("does not invent a backend"))).toBe(true);
  });
});
