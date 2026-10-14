/**
 * REGRESSIONS for defects the FIRST CUSTOMER DRY RUN found (Ashvattha Tax &
 * Compliance, customers/ashvattha-tax). Each failed on the old code:
 *
 *  1. Contact facts had one status, so an owner-supplied email next to a missing
 *     address was "partial", and an enquiry was blocked for lack of an ADDRESS.
 *  2. Verified email and phone rendered as plain text, though the node promised links.
 *  3. JSON-LD types were emitted bare: a nameless Organization, an empty BreadcrumbList.
 *  4. The theme default in code contradicted theme_system.md and misquoted it.
 *  5. The stack decision named styling and primitive packages no layer installs or uses.
 *  6. An AA stylesheet gave coarse pointers 24px targets, below RF-006 / Q5's 44px.
 *
 * Found on the customer's SERVED build (host run), fixed at source:
 *  7. Derived service pages were labelled from their slug ("Gst-registration-…",
 *     title "Gst registration…"), discarding the owner's offer name.
 *  8. Service JSON-LD published areaServed from an UNVERIFIED location.
 *  9. "uniqueTitleAndDescription" never looked at the description: 8 pages with
 *     none were scored unique.
 * 10. A lead objective counted as served while no served page offered a
 *     completable action (form disabled, email rendered nowhere); content passed.
 * 11. A disabled submit button rendered in the enabled accent colour.
 * 12. Personality rules DD-013/DD-015 wrote `layout.system`, which DD-017 assigns to
 *     the industry rules, so every authoritative professional-services business
 *     had a permanent conflict that failed the design gate.
 *
 * Inputs here are synthetic FIXTURE variants; the customer's own brief is exercised
 * by the host run, not by unit tests.
 */
import { describe, expect, it } from "vitest";
import { runPipeline } from "../../src/pipeline.js";
import { generateWebsite } from "../../src/generation/generate-website.js";
import { verifyContent } from "../../src/content/verification.js";
import { contactMethodStatus, contactStatuses } from "../../src/content/contact-status.js";
import { DEFAULT_THEME_MODE } from "../../src/design-system/tokens/token-contract.js";
import { TOUCH_TARGET_CSS_PX } from "../../src/responsive/capabilities.js";
import { collectBuildEvidence, parseServedHtml, seoObservationsFromHtml } from "../../src/evidence/build-evidence.js";
import { baseInput, content } from "../fixtures/business-inputs.js";

const leadBusiness = (overrides: Parameters<typeof content>[0] = {}) =>
  baseInput({
    businessName: "FIXTURE-LEADS",
    industry: "professional_services",
    websiteObjective: ["generate_leads"],
    servicesProducts: [
      { name: "FIXTURE-SERVICE-A", kind: "service", description: "FIXTURE description A." },
      { name: "FIXTURE-SERVICE-B", kind: "service" },
    ],
    location: { verified: false, city: "FIXTURE-CITY", serviceAreas: ["FIXTURE-AREA"], hasPhysicalPremises: true },
    requiredPages: [{ path: "/", purpose: "home", mustBeIndexable: true }],
    availableContent: content({ propositionText: "verified_available", serviceDescriptions: "verified_available", ...overrides }),
  });

describe("finding 1 — a contact METHOD is not a street address", () => {
  it("per-method statuses fall back to the aggregate only when absent", () => {
    const c = content({ contactDetails: "partial", contactEmail: "verified_available" });
    // FD-14: `hours` joined the per-method statuses, falling back to the address.
    expect(contactStatuses(c)).toEqual({ email: "verified_available", phone: "partial", whatsapp: "partial", address: "partial", hours: "partial" });
    expect(contactMethodStatus(c)).toBe("verified_available");
    expect(contactMethodStatus(content({ contactDetails: "partial" }))).toBe("partial");
  });

  it("an enquiry objective with a verified email and no address is NOT blocked", () => {
    const report = verifyContent(leadBusiness({ contactDetails: "partial", contactEmail: "verified_available", contactAddress: "unavailable" }));
    expect(report.blockedConversionPaths).toEqual([]);
    expect(report.sections.find((s) => s.category === "contact_method")?.render).toBe(true);
    expect(report.sections.find((s) => s.category === "addresses")?.render).toBe(false);
  });

  it("negative: an enquiry with no verified email or phone is still blocked, citing DD-101", () => {
    const report = verifyContent(leadBusiness({ contactDetails: "partial" }));
    expect(report.blockedConversionPaths.join()).toContain("contact_method");
    expect(report.blockedConversionPaths.join()).toContain("DD-101");
  });

  it("a booking objective still needs a verified ADDRESS, even with a verified email", () => {
    const booking = baseInput({
      websiteObjective: ["book_appointments"],
      availableContent: content({ contactDetails: "partial", contactEmail: "verified_available" }),
    });
    expect(verifyContent(booking).blockedConversionPaths.join()).toContain("addresses");
  });
});

describe("finding 2 — only verified, supplied methods are published, and they are links", () => {
  it("a verified email renders as a mailto link; the unverified address and phone are withheld", () => {
    const input = baseInput({
      websiteObjective: ["book_appointments"],
      availableContent: content({ propositionText: "verified_available", contactDetails: "partial", contactEmail: "verified_available" }),
    });
    const { output, contract } = runPipeline(input);
    const site = generateWebsite(input, output, contract, {
      suppliedContent: { contactDetails: { email: "fixture@example.invalid", phone: "FIXTURE-PHONE", addressLines: ["FIXTURE-ADDRESS"] } },
    });
    expect(site.content.contact.state).toBe("supplied");
    if (site.content.contact.state === "supplied") {
      expect(site.content.contact.value.email).toBe("fixture@example.invalid");
      expect(site.content.contact.value.phone).toBeNull();
      expect(site.content.contact.value.addressLines).toEqual([]);
      expect(site.content.contact.source).toContain("withheld: phone (partial), whatsapp (partial, no value), address (partial)");
    }
    const html = Object.entries(site.files).filter(([p]) => p.endsWith(".html")).map(([, b]) => b).join("\n");
    expect(html).toContain('<a href="mailto:fixture@example.invalid">fixture@example.invalid</a>');
    expect(html).not.toContain("FIXTURE-PHONE");
    expect(html).not.toContain("FIXTURE-ADDRESS");
  });
});

describe("finding 3 — structured data carries required properties or is unresolved", () => {
  it("no page emits a bare JSON-LD type", () => {
    const input = leadBusiness({ contactDetails: "partial", contactEmail: "verified_available" });
    const { output, contract } = runPipeline(input);
    const site = generateWebsite(input, output, contract);
    const blocks = Object.entries(site.files)
      .filter(([p]) => p.endsWith(".html"))
      .flatMap(([, html]) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1] ?? "{}") as Record<string, unknown>));
    expect(blocks.length).toBeGreaterThan(0);
    for (const entity of blocks) {
      expect(Object.keys(entity).filter((k) => !k.startsWith("@")).length, JSON.stringify(entity)).toBeGreaterThan(0);
    }
    const org = blocks.find((b) => b["@type"] === "Organization");
    expect(org?.["name"]).toBe("FIXTURE-LEADS");
  });

  it("without a canonical origin, BreadcrumbList is unresolved rather than emitted empty", () => {
    const { output } = runPipeline(leadBusiness());
    expect(output.seoArtifacts.unresolved.some((u) => u.artifact === "structuredData.BreadcrumbList" && u.needs.includes("canonicalOrigin"))).toBe(true);
    for (const page of output.seoArtifacts.pages) expect(page.structuredData.value).not.toContain("BreadcrumbList");
  });

  it("with a canonical origin, BreadcrumbList items carry absolute URLs", () => {
    const base = leadBusiness();
    const { output } = runPipeline({ ...base, constraints: { localization: [], integrations: [], canonicalOrigin: "https://fixture.example" } });
    const crumbs = output.seoArtifacts.pages
      .flatMap((p) => p.structuredDataEntities.value ?? [])
      .find((e) => e["@type"] === "BreadcrumbList") as { itemListElement: Array<{ item: string }> } | undefined;
    expect(crumbs?.itemListElement[0]?.item).toBe("https://fixture.example/");
  });

  it("a derived service page carries a Service entity for ITS offer, from the owner's own description", () => {
    const { output } = runPipeline({ ...leadBusiness(), constraints: { localization: [], integrations: [], seoDependency: "high" } });
    const page = output.seoArtifacts.pages.find((p) => p.route.startsWith("/services/"));
    const services = (page?.structuredDataEntities.value ?? []).filter((e) => e["@type"] === "Service");
    expect(services).toHaveLength(1);
    expect(services[0]?.["name"]).toBe("FIXTURE-SERVICE-A");
    expect(services[0]?.["description"]).toBe("FIXTURE description A.");
  });

  it("FAQPage is completed from supplied answers, and refused without them", () => {
    const input = baseInput({
      websiteObjective: ["generate_leads"],
      availableContent: content({ propositionText: "verified_available", faq: "verified_available", contactEmail: "verified_available" }),
    });
    const { output, contract } = runPipeline(input);
    const withFaq = generateWebsite(input, output, contract, { suppliedContent: { faq: [{ question: "FIXTURE Q", answer: "FIXTURE A" }] } });
    const html = Object.values(withFaq.files).join("\n");
    if (output.seoArtifacts.pages.some((p) => p.structuredDataDeferred.some((d) => d.type === "FAQPage"))) {
      expect(html).toContain('"@type":"FAQPage"');
      expect(html).toContain('"name":"FIXTURE Q"');
      const withoutFaq = generateWebsite(input, output, contract);
      expect(Object.values(withoutFaq.files).join("\n")).not.toContain('"@type":"FAQPage"');
      expect(withoutFaq.refusals.some((r) => r.what.includes("structuredData.FAQPage"))).toBe(true);
    }
  });

  it("the Next.js source carries the same JSON-LD the static layer serves", () => {
    const input = leadBusiness();
    const { output, contract } = runPipeline(input);
    const site = generateWebsite(input, output, contract);
    expect(site.files["next/app/page.tsx"]).toContain('type="application/ld+json"');
    expect(site.files["next/app/page.tsx"]).toContain('"@type":"Organization","name":"FIXTURE-LEADS"');
  });
});

describe("finding 4 — the theme default has one authority: theme_system.md", () => {
  it("an unstated theme mode is SINGLE-DARK and recorded as UNCHOSEN, not silently decided", () => {
    const { output } = runPipeline(baseInput());
    expect(DEFAULT_THEME_MODE).toBe("SINGLE-DARK");
    expect(output.tokens.color.values.mode).toBe("SINGLE-DARK");
    expect(output.tokens.problems.join()).toContain("UNCHOSEN");
  });

  it("negative: a stated theme mode is honoured", () => {
    const { output } = runPipeline(baseInput({ constraints: { localization: [], integrations: [], themeMode: "SINGLE-LIGHT" } }));
    expect(output.tokens.color.values.mode).toBe("SINGLE-LIGHT");
  });
});

describe("finding 5 — the stack decision names only what the generated site is built from", () => {
  it("no styling or primitive entry names a package that is neither installed nor emitted", () => {
    const { output } = runPipeline(leadBusiness());
    const installed = Object.keys(output.dependencyAdmission.admitted);
    for (const entry of [...output.stack.styling, ...output.stack.primitives]) {
      for (const pkg of ["tailwindcss", "shadcn/ui", "lucide-react", "next/font"]) {
        expect(entry, `stack names ${pkg} but nothing installs or uses it`).not.toContain(pkg);
      }
    }
    expect(installed).not.toContain("tailwindcss");
  });

  it("the typography token record does not claim next/font, which no layer emits", () => {
    const { output } = runPipeline(leadBusiness());
    expect(output.tokens.typography.values.loading).not.toContain("next/font");
    expect(output.tokens.typography.values.loading).toContain("no font file");
  });
});

describe("finding 6 — coarse pointers get RF-006's 44px targets at every WCAG level", () => {
  it("the AA stylesheet carries a coarse-pointer 44px block", () => {
    const input = baseInput();
    const { output, contract } = runPipeline(input);
    const css = generateWebsite(input, output, contract).files["static/styles.css"] ?? "";
    expect(TOUCH_TARGET_CSS_PX).toBe(44);
    expect(css).toMatch(/@media \(pointer: coarse\) \{[\s\S]*min-block-size: 44px;/);
  });

  it("finding 11 — a disabled submit button uses the disabled token, not the enabled accent", () => {
    const input = baseInput();
    const { output, contract } = runPipeline(input);
    const css = generateWebsite(input, output, contract).files["static/styles.css"] ?? "";
    expect(css).toContain("--color-accent-1-disabled:");
    expect(css).toMatch(/button:disabled \{ background: var\(--color-accent-1-disabled\);/);
  });
});

describe("finding 7 — a derived page is named by the owner's offer name, verbatim", () => {
  it("title, h1, navigation and footer use the offer name; the slug is never re-cased into a label", () => {
    const input = {
      ...leadBusiness(),
      // DD-093 derives pages only when there are several offers.
      servicesProducts: [
        // FD-04: offers carry catalogue fields (groups, variants, attributes); this
        // literal is a post-parse BusinessInput, so it states their empty defaults.
        { name: "GST filing for FIXTURE", kind: "service" as const, description: "FIXTURE description.", customerSupplied: true, priceKnown: false, regulated: false, groupIds: [], variants: [], attributes: [] },
        { name: "FIXTURE-SERVICE-B", kind: "service" as const, customerSupplied: true, priceKnown: false, regulated: false, groupIds: [], variants: [], attributes: [] },
      ],
      constraints: { localization: [], integrations: [], seoDependency: "high" as const },
    };
    const { output, contract } = runPipeline(input);
    const page = output.seoArtifacts.pages.find((p) => p.route.startsWith("/services/"));
    expect(page?.title.value).toBe("GST filing for FIXTURE — FIXTURE-LEADS");
    const site = generateWebsite(input, output, contract);
    const html = Object.entries(site.files).filter(([p]) => p.endsWith(".html")).map(([, b]) => b).join("\n");
    expect(html).toContain(">GST filing for FIXTURE</a>");
    expect(html).not.toMatch(/>Gst[- ]filing/);
  });
});

describe("finding 8 — structured data carries no location claim the owner has not verified", () => {
  const serviceEntities = (verified: boolean) => {
    const base = leadBusiness();
    const { output } = runPipeline({ ...base, location: { ...base.location!, verified } });
    return output.seoArtifacts.pages.flatMap((p) => p.structuredDataEntities.value ?? []).filter((e) => e["@type"] === "Service");
  };

  it("an unverified location contributes no areaServed", () => {
    const entities = serviceEntities(false);
    expect(entities.length).toBeGreaterThan(0);
    for (const e of entities) expect(e).not.toHaveProperty("areaServed");
  });

  it("negative: a verified location's service areas are published", () => {
    expect(serviceEntities(true).some((e) => JSON.stringify(e["areaServed"]) === '["FIXTURE-AREA"]')).toBe(true);
  });
});

const page = (route: string, head: string, body: string) =>
  `<!doctype html><html lang="en"><head><title>T ${route}</title>${head}</head><body><h1>H</h1><a href="/">Home</a>${body}<p>${"copy ".repeat(60)}</p></body></html>`;

describe("finding 9 — a missing meta description is not a unique one", () => {
  it("no description, or a shared one, fails the title-and-description observation", () => {
    const none = [parseServedHtml("/", page("/", "", "")), parseServedHtml("/a", page("/a", "", ""))];
    expect(seoObservationsFromHtml(none[0]!, none).uniqueTitleAndDescription).toBe(false);
    const shared = '<meta name="description" content="same">';
    const dup = [parseServedHtml("/", page("/", shared, "")), parseServedHtml("/a", page("/a", shared, ""))];
    expect(seoObservationsFromHtml(dup[0]!, dup).uniqueTitleAndDescription).toBe(false);
  });

  it("negative: distinct descriptions pass", () => {
    const facts = [
      parseServedHtml("/", page("/", '<meta name="description" content="one">', "")),
      parseServedHtml("/a", page("/a", '<meta name="description" content="two">', "")),
    ];
    expect(seoObservationsFromHtml(facts[0]!, facts).uniqueTitleAndDescription).toBe(true);
  });
});

describe("finding 10 — a served site with no completable conversion action fails content", () => {
  const disabledForm =
    '<form data-endpoint="unconfigured"><p role="note">Enquiries are not connected yet.</p><fieldset disabled><button type="submit">Send</button></fieldset></form>';

  it("counts only completable actions: navigation links and disabled or action-less forms are not actions", () => {
    expect(parseServedHtml("/", page("/", "", disabledForm)).conversionActions).toBe(0);
    expect(parseServedHtml("/", page("/", "", '<form><button>Send</button></form>')).conversionActions).toBe(0);
    expect(parseServedHtml("/", page("/", "", '<form action="/api/e" method="post"><button>Send</button></form>')).conversionActions).toBe(1);
    expect(parseServedHtml("/", page("/", "", '<a href="mailto:fixture@example.invalid">mail</a><a href="tel:+000">call</a>')).conversionActions).toBe(2);
  });

  const evaluate = (body: string) => {
    const input = leadBusiness({ contactDetails: "partial", contactEmail: "verified_available" });
    const decided = runPipeline(input);
    const servedHtml = Object.fromEntries(decided.output.pages.map((p) => [p.route, page(p.route, "", body)]));
    return runPipeline(input, { evidence: { bundle: collectBuildEvidence({ servedHtml }) } }).output.quality;
  };

  it("measured served HTML with only a disabled form: content gate false, conversion scored 3, reason names the objective", () => {
    const q = evaluate(disabledForm);
    expect(q.gates.content).toBe(false);
    expect(q.blockers.join()).toContain("offers a completable conversion action");
    expect(q.blockers.join()).toContain("generate_leads");
    const conversion = q.sheet["conversion"];
    expect(conversion?.scored && conversion.value).toBe(3);
  });

  it("negative: a published mailto link is a completable action, so this reason does not appear", () => {
    const q = evaluate(`${disabledForm}<a href="mailto:fixture@example.invalid">fixture@example.invalid</a>`);
    expect(q.blockers.join()).not.toContain("completable conversion action");
  });

  it("negative: without served HTML the plan-level check stands (unknown is not converted into a failure either)", () => {
    const input = leadBusiness({ contactDetails: "partial", contactEmail: "verified_available" });
    expect(runPipeline(input).output.quality.blockers.join()).not.toContain("completable conversion action");
  });
});

describe("finding 12 — layout.system has one authority: the industry and density rules", () => {
  const decide = (industry: "professional_services", personality: "authoritative" | "technical") =>
    runPipeline(baseInput({ industry, brandPersonality: [personality] })).output;

  it("an authoritative professional-services business has no layout conflict; the grid carries the personality", () => {
    const output = decide("professional_services", "authoritative");
    expect(output.conflicts.filter((c) => c.target === "layout.system")).toEqual([]);
    expect(output.layoutStrategy["grid"]).toBe("structured_grid");
    expect(output.quality.blockers.join()).not.toContain("layout.system");
  });

  it("a technical personality sets the grid, not the system", () => {
    const output = decide("professional_services", "technical");
    expect(output.conflicts.filter((c) => c.target === "layout.system")).toEqual([]);
    expect(output.layoutStrategy["grid"]).toBe("modular_grid");
  });

  it("an industry/content-type vs personality tension is resolved by precedence and recorded (P1-5)", () => {
    // Media (DD-027 editorial grid, context tier) + authoritative (DD-013 structured
    // grid, personality tier): what the business IS outranks how it wants to sound.
    const media = runPipeline(baseInput({ industry: "media", brandPersonality: ["authoritative"] })).output;
    expect(media.conflicts.some((c) => c.target === "layout.grid")).toBe(false);
    const r = media.precedenceResolutions.find((x) => x.target === "layout.grid");
    expect(r?.winner.tier).toBe("context");
    expect(r?.overridden.map((o) => o.ruleId)).toEqual(["DD-013"]);
    expect(media.layoutStrategy["grid"]).toBe(r?.winner.value);
    expect(media.quality.blockers.join()).not.toContain("layout.grid");
  });

  it("negative: two PERSONALITY rules that disagree stay a conflict — precedence never picks within a tier", () => {
    // authoritative (DD-013 structured_grid) + editorial (DD-017 editorial_grid), no context rule on the grid.
    const output = runPipeline(baseInput({ industry: "professional_services", brandPersonality: ["authoritative", "editorial"] })).output;
    const conflict = output.conflicts.find((c) => c.target === "layout.grid");
    expect(conflict?.ruleIds.sort()).toEqual(["DD-013", "DD-017"]);
    expect(output.quality.gates.design).toBe(false);
  });

  it("precedence is order-independent", async () => {
    const { evaluateRules } = await import("../../src/design-intelligence/engine/evaluator.js");
    const { ALL_RULES } = await import("../../src/design-intelligence/rules/index.js");
    const { deriveDesignContextProfile } = await import("../../src/design-intelligence/profile/derive-profile.js");
    const input = baseInput({ industry: "media", brandPersonality: ["authoritative"] });
    const facts = { ...deriveDesignContextProfile(input), framework: "nextjs", targetQuality: "professionally_designed" };
    const forward = evaluateRules(facts, ALL_RULES);
    const reverse = evaluateRules(facts, [...ALL_RULES].reverse());
    expect(reverse.draft["layout.grid"]).toBe(forward.draft["layout.grid"]);
    expect(reverse.conflicts).toEqual(forward.conflicts);
  });

  it("no personality rule writes layout.system", async () => {
    const { DIRECTION_RULES } = await import("../../src/design-intelligence/rules/direction-rules.js");
    const personalityRules = DIRECTION_RULES.filter((r) => r.if.some((c) => c.fact === "personalities"));
    expect(personalityRules.length).toBeGreaterThan(0);
    for (const rule of personalityRules) {
      expect(rule.then.some((e) => e.kind === "set" && e.target === "layout.system"), rule.id).toBe(false);
    }
  });
});
