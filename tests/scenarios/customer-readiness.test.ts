/**
 * CUSTOMER READINESS FOUNDATION — G1 and P1-1…P1-8 from the first customer dry
 * run, plus the decision-to-execution integrity ledger and dataset classification.
 *
 * Every business below is SYNTHETIC (`FIXTURE-*`, reserved `.invalid` domains,
 * 555-01xx fictional numbers). Each capability gets a positive test, a negative
 * test, and — where generation could silently substitute — a test that it does not.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runPipeline } from "../../src/pipeline.js";
import { generateWebsite } from "../../src/generation/generate-website.js";
import { walkNodes, type ComponentNode } from "../../src/generation/component-model.js";
import { inferPageRole } from "../../src/generation/page-spec.js";
import { planConversionCapabilities } from "../../src/design-intelligence/objectives/conversion-capabilities.js";
import { resolveDrafts } from "../../src/content/draft-channel.js";
import { admitDependencies, importedPackages } from "../../src/stack/dependency-admission.js";
import { analyseIndexability, collectBuildEvidence, parseServedHtml } from "../../src/evidence/build-evidence.js";
import { reconcileDecisionExecution } from "../../src/integrity/decision-execution.js";
import { classifyDataset } from "../../src/content/dataset-classification.js";
import {
  engineInputFromWorkflow,
  evaluateTestRegister,
  extractFrameworkBlocks,
  renderRegisterTable,
  writeGeneratedSection,
} from "../../src/workflow/seams.js";
import { parseBusinessInput, type BusinessInput } from "../../src/design-intelligence/types/business-input.js";
import { baseInput, content } from "../fixtures/business-inputs.js";
import { dryRunFixture } from "../fixtures/dry-run-fixture.js";

const FIXTURE_EMAIL = "fixture@example.invalid";
const FIXTURE_PHONE = "+1 555 010 0001";
const FIXTURE_WHATSAPP = "+1 555 010 0002";

function leadPractice(overrides: Partial<Parameters<typeof baseInput>[0]> = {}): BusinessInput {
  return baseInput({
    businessName: "FIXTURE-PRACTICE",
    industry: "professional_services",
    websiteObjective: ["generate_leads", "build_credibility"],
    brandPersonality: ["authoritative"],
    servicesProducts: [
      { name: "FIXTURE-SERVICE-ONE", kind: "service", description: "FIXTURE description of the first service offered by this synthetic practice." },
      { name: "FIXTURE-SERVICE-TWO", kind: "service" },
    ],
    requiredPages: [
      { path: "/", purpose: "home: what the practice does" },
      { path: "/services", purpose: "services overview" },
      { path: "/about", purpose: "about the practice" },
      { path: "/faq", purpose: "frequently asked questions" },
      { path: "/contact", purpose: "contact the practice with an enquiry" },
    ],
    availableContent: content({ serviceDescriptions: "partial", contactDetails: "partial", contactEmail: "verified_available" }),
    constraints: { seoDependency: "high", regulationRisk: "high", localization: [], integrations: [] },
    ...overrides,
  });
}

function build(input: BusinessInput, supplied: unknown = { contactDetails: { email: FIXTURE_EMAIL } }, formEndpoints?: Record<string, string>) {
  const { output, contract } = runPipeline(input);
  const site = generateWebsite(input, output, contract, { suppliedContent: supplied, ...(formEndpoints ? { formEndpoints } : {}) });
  return { output, contract, site };
}

function nodesOn(site: ReturnType<typeof build>["site"], route: string): ComponentNode[] {
  const out: ComponentNode[] = [];
  walkNodes(site.model, (n, page) => {
    if (page.route === route) out.push(n);
  });
  return out;
}

const html = (site: ReturnType<typeof build>["site"], route: string) => site.files[route === "/" ? "static/index.html" : `static${route}/index.html`] ?? "";

// =================================================================== G1

describe("G1 — a generated site always has its home route", () => {
  it("no owner pages: the site-primary objective's page is the home page, so / resolves and nothing is served twice", () => {
    const { output, site } = build(baseInput({ websiteObjective: ["generate_leads", "educate"] }), undefined);
    // FD-16: "/educate" was the objective id in the URL; the derived page is now "/learn".
    expect(output.pages.map((p) => p.route)).toEqual(["/", "/learn"]);
    expect(output.pages[0]).toMatchObject({ role: "home", roleBasis: "derived", primaryObjective: "generate_leads" });
    expect(output.pageAllocation.home.how).toBe("primary_objective_page_at_root");
    expect(site.files["static/index.html"]).toBeDefined();
    expect(site.files["next/app/page.tsx"]).toBeDefined();
    expect(site.manifest.integrity.entries.find((e) => e.domain === "home_route")?.status).toBe("delivered");
  });

  it("owner pages without /: a minimal home page is derived and recorded", () => {
    const { output } = build(baseInput({ requiredPages: [{ path: "/contact", purpose: "contact us" }] }), undefined);
    expect(output.pages[0]).toMatchObject({ route: "/", role: "home", derivedBy: "G1" });
    expect(output.pageAllocation.home.how).toBe("derived_home_page");
  });

  it("negative: an owner-supplied / is never replaced", () => {
    const { output } = build(leadPractice());
    expect(output.pages.filter((p) => p.route === "/")).toHaveLength(1);
    expect(output.pages[0]?.ownerSupplied).toBe(true);
    expect(output.pageAllocation.home.how).toBe("owner_supplied");
  });
});

// =================================================================== P1-1

describe("P1-1 — typed page roles allocate sections", () => {
  it("roles are inferred from path and purpose, and recorded as inferred", () => {
    expect(inferPageRole("/faq", "anything")).toBe("faq");
    expect(inferPageRole("/contact", "reach us")).toBe("contact");
    expect(inferPageRole("/about-us", "our story")).toBe("about");
    expect(inferPageRole("/services", "what we do")).toBe("services_index");
    expect(inferPageRole("/services/tax", "tax")).toBe("service");
    expect(inferPageRole("/privacy", "privacy policy")).toBe("legal");
    expect(inferPageRole("/conditions", "condition-led education pages")).toBe("content");
  });

  it("the contact page carries the contact section; the FAQ page an FAQ; about its own section; nothing duplicates home", () => {
    const { output, site } = build(leadPractice());
    const sections = Object.fromEntries(output.pages.map((p) => [p.route, p.requiredSections]));
    expect(sections["/contact"]).toContain("location_and_contact");
    expect(sections["/faq"]?.[0]).toBe("faq");
    expect(sections["/about"]?.[0]).toBe("about");
    expect(sections["/services"]).toEqual(["services", "enquiry"]);
    expect(html(site, "/contact")).toContain(`href="mailto:${FIXTURE_EMAIL}"`);
    expect(site.manifest.indexability.duplicates).toEqual([]);
  });

  it("a stated role wins over inference and is recorded as stated", () => {
    const { output } = build(leadPractice({ requiredPages: [{ path: "/", purpose: "home" }, { path: "/help", purpose: "questions people ask", role: "faq", label: "Help" }] }));
    expect(output.pages.find((p) => p.route === "/help")).toMatchObject({ role: "faq", roleBasis: "stated", label: "Help" });
  });

  it("site-level sections go to the page whose role owns them; the rest are reported, never dropped", () => {
    const { output } = build(leadPractice());
    expect(output.pageAllocation.allocated).toContainEqual(expect.objectContaining({ section: "disclosures", route: "/contact" }));
    for (const u of output.pageAllocation.unallocated) expect(u.reason.length).toBeGreaterThan(0);
  });

  it("home and a conversion page serving the same objective do not share one body (P1-7 at the source)", () => {
    const { output, site } = build(dryRunFixture(), undefined);
    expect(output.pageAllocation.deduplicated).toContainEqual(expect.objectContaining({ route: "/", ownedBy: "/book" }));
    expect(output.pages.find((p) => p.route === "/")?.requiredSections).not.toContain("booking");
    expect(output.pages.find((p) => p.route === "/book")?.requiredSections).not.toContain("services");
    expect(site.manifest.indexability.duplicates).toEqual([]);
  });

  it("negative: a page with no specific role keeps the objective-led allocation (Verdaleen unchanged)", () => {
    const { output } = build(dryRunFixture(), undefined);
    expect(output.pages.find((p) => p.route === "/conditions")?.role).toBe("content");
    expect(output.pages.find((p) => p.route === "/book")?.requiredSections).toContain("booking");
  });
});

// =================================================================== P1-2

describe("P1-2 — contact-link conversion follows a decided capability order", () => {
  it("an enquiry surface without a form endpoint delivers the verified email link, and records why the form was not delivered", () => {
    const { site } = build(leadPractice());
    const home = site.model.pages.find((p) => p.page.route === "/")!;
    expect(home.cta).toMatchObject({ state: "present", label: "Email us", href: `mailto:${FIXTURE_EMAIL}` });
    const delivery = site.manifest.conversions.find((c) => c.objective === "generate_leads");
    expect(delivery?.delivered).toBe("email_link");
    expect(delivery?.skipped[0]).toMatchObject({ capability: "form" });
    expect(home.refusals.some((r) => r.section === "enquiry_form" && r.reason.includes("no form endpoint"))).toBe(true);
    expect(nodesOn(site, "/").some((n) => n.kind === "form")).toBe(false);
  });

  it("a configured endpoint keeps the form first in the order", () => {
    const { site } = build(leadPractice(), { contactDetails: { email: FIXTURE_EMAIL } }, { enquiry: "/fixture-host/enquiry" });
    expect(site.manifest.conversions.find((c) => c.objective === "generate_leads")?.delivered).toBe("form");
    expect(nodesOn(site, "/").some((n) => n.kind === "form" && n.form?.endpoint.state === "configured")).toBe(true);
  });

  it("WhatsApp and phone render as completable links only when verified and dialable; the owner's preference reorders", () => {
    const input = leadPractice({
      availableContent: content({ contactDetails: "partial", contactEmail: "verified_available", contactPhone: "verified_available", contactWhatsapp: "verified_available" }),
      constraints: { preferredContactMethods: ["whatsapp_link", "email_link"], localization: [], integrations: [] },
    });
    const { output, site } = build(input, { contactDetails: { email: FIXTURE_EMAIL, phone: FIXTURE_PHONE, whatsapp: FIXTURE_WHATSAPP } });
    expect(output.conversionPlan.find((p) => p.objective === "generate_leads")?.basis).toBe("owner_preference");
    const home = site.model.pages.find((p) => p.page.route === "/")!;
    expect(home.cta).toMatchObject({ state: "present", label: "Message us on WhatsApp", href: "https://wa.me/15550100002" });
    const staticHome = html(site, "/");
    expect(staticHome).toContain('href="https://wa.me/15550100002"');
    expect(staticHome).toContain('href="tel:+15550100001"');
    // The served-HTML parser counts all three as completable actions.
    expect(parseServedHtml("/", staticHome).conversionActions).toBeGreaterThanOrEqual(3);
  });

  it("negative: an unverified WhatsApp number is never published, whatever was supplied", () => {
    const input = leadPractice({ availableContent: content({ contactDetails: "partial", contactEmail: "verified_available", contactWhatsapp: "provided_unverified" }) });
    const { site } = build(input, { contactDetails: { email: FIXTURE_EMAIL, whatsapp: FIXTURE_WHATSAPP } });
    expect(Object.values(site.files).join()).not.toContain("wa.me");
  });

  it("negative: a link can never complete a checkout — the surface allows only a form", () => {
    const plan = planConversionCapabilities(baseInput({ websiteObjective: ["sell_products"], constraints: { preferredContactMethods: ["email_link"], localization: [], integrations: [] } }));
    expect(plan[0]?.order.map((o) => o.capability)).toEqual(["form"]);
  });

  it("negative: with no verified method and no endpoint, nothing is substituted — the disabled form and its notice stand", () => {
    const input = leadPractice({ availableContent: content({ contactDetails: "unavailable" }) });
    const { site } = build(input, {});
    expect(html(site, "/")).not.toContain("mailto:");
    expect(site.model.pages.find((p) => p.page.route === "/")?.cta.state).toBe("withheld");
  });
});

// =================================================================== P1-3

describe("P1-3 — approved AI drafts publish; unapproved drafts are held", () => {
  const approval = { approvedBy: "FIXTURE-OWNER", approvedAt: "2026-09-14" };
  const drafts = [
    { target: "proposition", value: "FIXTURE approved proposition for a synthetic practice.", provenance: "approved_ai_draft", source: "FIXTURE Phase S", approval },
    { target: "title:/services", value: "FIXTURE services in FIXTURE-CITY — FIXTURE-PRACTICE", provenance: "approved_ai_draft", source: "FIXTURE Phase S", approval },
    { target: "metaDescription:/", value: "FIXTURE approved meta description for the synthetic practice home page, long enough to be useful.", provenance: "approved_ai_draft", source: "FIXTURE brief", approval },
    { target: "about", value: "FIXTURE held about copy that nobody approved.", provenance: "ai_draft", source: "FIXTURE model output" },
    { target: "title:/nowhere", value: "FIXTURE title for a page that does not exist", provenance: "approved_ai_draft", source: "FIXTURE", approval },
  ];

  it("an approved draft reaches the page, the title and the description; its approval requirement is satisfied", () => {
    const { output, site } = build(leadPractice(), { contactDetails: { email: FIXTURE_EMAIL }, drafts });
    expect(html(site, "/")).toContain("FIXTURE approved proposition for a synthetic practice.");
    expect(html(site, "/services")).toContain("<title>FIXTURE services in FIXTURE-CITY — FIXTURE-PRACTICE</title>");
    expect(html(site, "/")).toContain('<meta name="description" content="FIXTURE approved meta description');
    expect(output.seoArtifacts.approvalsRequired.some((a) => a.route === "/" && a.artifact === "metaDescription")).toBe(true);
    // The decided plan still lists it; the generated manifest counts it satisfied by the approved draft.
    expect(site.manifest.seoApprovalsRequired).toBe(output.seoArtifacts.approvalsRequired.length - 1);
    expect(site.manifest.contentDrafts.published.map((d) => d.target)).toEqual(["proposition", "title:/services", "metaDescription:/"]);
  });

  it("an unapproved draft is held: the slot stays, the text never renders, and the hold is a blocker", () => {
    const { site } = build(leadPractice(), { contactDetails: { email: FIXTURE_EMAIL }, drafts });
    expect(Object.values(site.files).join()).not.toContain("FIXTURE held about copy");
    expect(site.manifest.contentDrafts.held.map((d) => d.target)).toEqual(["about"]);
    expect(site.manifest.refinementInput.blockers.join()).toContain("AI draft for about is held awaiting approval");
    expect(site.manifest.integrity.entries.find((e) => e.domain === "content_draft" && e.subject === "about")?.status).toBe("unavailable");
  });

  it("a draft for a page that does not exist is rejected, not silently attached elsewhere", () => {
    const { site } = build(leadPractice(), { contactDetails: { email: FIXTURE_EMAIL }, drafts });
    expect(site.manifest.contentDrafts.rejected).toContainEqual(expect.objectContaining({ target: "title:/nowhere", reason: "no page exists at /nowhere" }));
  });

  it("negative: the framework cannot author copy, and an approved draft without an approval record is held", () => {
    const channel = resolveDrafts([
      { target: "proposition", value: "FIXTURE", provenance: "framework_policy", source: "FIXTURE" },
      { target: "about", value: "FIXTURE", provenance: "approved_ai_draft", source: "FIXTURE" },
    ]);
    expect(channel.rejected.map((d) => d.target)).toEqual(["proposition"]);
    expect(channel.held.map((d) => d.target)).toEqual(["about"]);
  });
});

// =================================================================== P1-4

describe("P1-4 — DD-034's compact navigation is implemented in both layers", () => {
  it("a native popover disclosure with a visible close, the same routes, and CSS that shows the list from the medium range", () => {
    const { output, site } = build(leadPractice());
    expect(output.decisions["nav.compactMode"]).toBe("accessible_drawer_or_compact_bar");
    const staticHome = html(site, "/");
    expect(staticHome).toContain('data-nav-compact="popover_disclosure"');
    // FD-07: "Menu" collided with a restaurant's menu; the control names the site navigation.
    expect(staticHome).toContain('<button type="button" class="c-nav-toggle" popovertarget="site-menu">Site menu</button>');
    expect(staticHome).toContain('popovertargetaction="hide">Close menu</button>');
    expect(site.files["next/app/page.tsx"]).toContain('popoverTarget="site-menu"');
    const css = site.files["static/styles.css"] ?? "";
    expect(css).toContain("DD-034 compact navigation");
    expect(css).toMatch(/@supports not selector\(:popover-open\)/);
    const links = [...staticHome.matchAll(/<div id="site-menu"[\s\S]*?<\/div>/g)][0]?.[0] ?? "";
    expect([...links.matchAll(/href="([^"]+)"/g)].map((m) => m[1])).toEqual(output.pages.map((p) => p.route));
    expect(site.manifest.integrity.entries.find((e) => e.domain === "navigation")?.status).toBe("delivered");
  });
});

// =================================================================== P1-5 lives in customer-dry-run-findings.test.ts (finding 12) and rule-expansion.test.ts.

// =================================================================== P1-6

describe("P1-6 — dependency admission is one authority", () => {
  it("react-hook-form is never admitted (no generated consumer); zod awaits the dependency gate; the host installs neither", () => {
    const { output, site } = build(leadPractice({ requiredFunctionality: ["contact_form"] }));
    const status = Object.fromEntries(output.dependencyAdmission.entries.map((e) => [e.package, e.status]));
    expect(status).toMatchObject({ next: "admitted", react: "admitted", "react-dom": "admitted", "react-hook-form": "not_consumed", zod: "awaiting_approval" });
    expect(Object.keys(JSON.parse(site.files["next/package.json"] ?? "{}").dependencies)).toEqual(["next", "react", "react-dom"]);
    expect(site.files["next/app/_forms/contracts.ts"]).toBeUndefined();
    expect(output.approvalsRequired.join()).toContain('dependency gate: "zod" awaits approval');
  });

  it("an approval admits zod and emits its consumer; the reconciliation proves the import", () => {
    const input = leadPractice({
      requiredFunctionality: ["contact_form"],
      constraints: { localization: [], integrations: [], dependencyDecisions: [{ package: "zod", decision: "approved", decidedBy: "FIXTURE-OWNER", reason: "FIXTURE five answers recorded" }] },
    });
    const { output, site } = build(input, { contactDetails: { email: FIXTURE_EMAIL } }, { enquiry: "/fixture-host/enquiry" });
    expect(output.dependencyAdmission.admitted).toHaveProperty("zod");
    expect(site.files["next/app/_forms/contracts.ts"]).toContain('import { z } from "zod"');
    expect(site.manifest.integrity.entries.find((e) => e.domain === "dependency" && e.subject === "zod")?.status).toBe("delivered");
  });

  it("negative: a denial always wins, and an approval cannot add a package no requirement proposed", () => {
    const admission = admitDependencies({ libraries: ["zod"] }, [
      { package: "zod", decision: "denied", decidedBy: "FIXTURE", reason: "FIXTURE" },
      { package: "three", decision: "approved", decidedBy: "FIXTURE", reason: "FIXTURE" },
    ]);
    expect(admission.admitted).not.toHaveProperty("zod");
    expect(admission.admitted).not.toHaveProperty("three");
    expect(admission.entries.find((e) => e.package === "three")?.status).toBe("not_proposed");
  });

  it("the import scanner reads real specifiers, including scoped and subpath imports", () => {
    const imports = importedPackages({ "a.tsx": 'import Link from "next/link";\nimport { x } from "@scope/pkg/sub";\nimport "./local.css";\n' });
    expect([...imports.keys()].sort()).toEqual(["@scope/pkg", "next"]);
  });
});

// =================================================================== P1-7

describe("P1-7 — duplicate and placeholder indexable pages are detected", () => {
  const page = (body: string, robots = "index,follow") => `<!doctype html><html><head><meta name="robots" content="${robots}"></head><body><header><nav>FIXTURE nav</nav></header><main>${body}</main></body></html>`;
  const long = "FIXTURE words that make up a realistic body of page content for the duplicate detector to compare across two routes";

  it("near-identical indexable bodies are a duplicate finding and a content-gate blocker", () => {
    const facts = [parseServedHtml("/a", page(`<h1>A</h1><p>${long}</p>`)), parseServedHtml("/b", page(`<h1>B</h1><p>${long}</p>`))];
    const findings = analyseIndexability(facts);
    expect(findings.duplicates).toHaveLength(1);
    const q = runPipeline(dryRunFixture(), { evidence: { bundle: collectBuildEvidence({ servedHtml: { "/a": page(`<h1>A</h1><p>${long}</p>`), "/b": page(`<h1>B</h1><p>${long}</p>`) } }) } }).output.quality;
    expect(q.blockers.join()).toContain("serve near-duplicate main content");
  });

  it("placeholder slots on an indexable page are a finding; the same slot on a noindex page is not", () => {
    const slot = '<div class="c-content-slot" data-content-slot="faq"><p>FIXTURE to be supplied.</p></div>';
    // FD-06: findings now also carry typed pending markers (none here).
    expect(analyseIndexability([parseServedHtml("/faq", page(slot))]).placeholders).toEqual([{ route: "/faq", slots: 1, pending: 0 }]);
    expect(analyseIndexability([parseServedHtml("/faq", page(slot, "noindex,follow"))]).placeholders).toEqual([]);
  });

  it("negative: pages that share only site chrome are not duplicates", () => {
    const facts = [parseServedHtml("/a", page(`<p>${long}</p>`)), parseServedHtml("/b", page("<p>FIXTURE something entirely different about another subject altogether here</p>"))];
    expect(analyseIndexability(facts).duplicates).toEqual([]);
  });

  it("the generator reports the same findings over its own output", () => {
    const { site } = build(leadPractice());
    expect(site.manifest.indexability.placeholders.map((p) => p.route)).toContain("/faq");
  });
});

// =================================================================== integrity ledger

describe("decision-to-execution integrity", () => {
  it("every domain reports; a consistent site has no mismatch and unavailable entries carry reasons", () => {
    const { site } = build(leadPractice());
    const ledger = site.manifest.integrity;
    expect(ledger.consistent).toBe(true);
    for (const domain of ["home_route", "page", "section", "conversion", "navigation", "dependency"]) expect(ledger.byDomain[domain], domain).toBeDefined();
    for (const e of ledger.entries.filter((x) => x.status === "unavailable")) expect(e.reason.length, e.subject).toBeGreaterThan(0);
  });

  it("a removed page, a silently dropped section and a stray import are each a mismatch", () => {
    const { output, site } = build(leadPractice());
    const files = { ...site.files };
    delete files["static/about/index.html"];
    files["next/app/stray.tsx"] = 'import x from "left-pad";\n';
    const model = { ...site.model, pages: site.model.pages.map((p) => (p.page.route === "/faq" ? { ...p, sectionResults: [{ section: "faq", nodeIds: [], refusal: null }] } : p)) };
    const ledger = reconcileDecisionExecution({ output, model, files, content: site.content, engagement: site.manifest.engagement.reconciliation });
    expect(ledger.consistent).toBe(false);
    const mismatches = ledger.entries.filter((e) => e.status === "mismatch").map((e) => `${e.domain}:${e.subject}`);
    expect(mismatches).toEqual(expect.arrayContaining(["page:/about", "section:/faq#faq", "dependency:left-pad"]));
  });
});

// =================================================================== synthetic data

describe("synthetic data stays identified as synthetic", () => {
  it("FIXTURE tokens and reserved domains classify a dataset as synthetic, and it is never publishable", () => {
    expect(classifyDataset(baseInput()).classification).toBe("synthetic");
    const { site } = build(leadPractice());
    expect(site.manifest.dataset.classification).toBe("synthetic");
    expect(site.manifest.refinementInput.blockers.join()).toContain("synthetic dataset");
  });

  it("negative: unmarked data is 'unmarked', never asserted to be a real customer's", () => {
    const input = parseBusinessInput({ ...baseInput(), businessName: "Plain Name", description: "A description", targetAudience: [{ label: "People", isPrimary: true }] });
    expect(classifyDataset(input).classification).toBe("unmarked");
  });
});

// =================================================================== P1-8

describe("P1-8 — workflow seams", () => {
  const record = (blocks: string) => `# RECORD\n\nProse the framework never touches.\n\n${blocks}\n`;
  const block = (kind: string, value: unknown) => `\`\`\`json framework:${kind}\n${JSON.stringify(value, null, 2)}\n\`\`\``;

  it("business input, supplied content and gate decisions come from the records; a denial reaches admission", () => {
    const input = { ...leadPractice(), requiredFunctionality: ["contact_form"] };
    const result = engineInputFromWorkflow([
      { file: "04-plan.md", markdown: record(block("business-input", input)) },
      { file: "06-gate.md", markdown: record(block("dependency-decisions", [{ package: "zod", decision: "denied", decidedBy: "FIXTURE gate", reason: "FIXTURE" }])) },
    ]);
    expect(result.businessInput.constraints?.dependencyDecisions).toEqual([{ package: "zod", decision: "denied", decidedBy: "FIXTURE gate", reason: "FIXTURE" }]);
    expect(runPipeline(result.businessInput).output.dependencyAdmission.entries.find((e) => e.package === "zod")?.status).toBe("denied");
    expect(result.sources.businessInput).toBe("04-plan.md:5");
  });

  it("negative: two business-input blocks, conflicting gate decisions, malformed JSON and unknown checks all fail loudly", () => {
    const input = block("business-input", leadPractice());
    expect(() => engineInputFromWorkflow([{ file: "a.md", markdown: record(input) }, { file: "b.md", markdown: record(input) }])).toThrow(/one authority/);
    const approve = block("dependency-decisions", [{ package: "zod", decision: "approved", decidedBy: "F", reason: "F" }]);
    const deny = block("dependency-decisions", [{ package: "zod", decision: "denied", decidedBy: "F", reason: "F" }]);
    expect(() => engineInputFromWorkflow([{ file: "a.md", markdown: record(`${input}\n${approve}`) }, { file: "b.md", markdown: record(deny) }])).toThrow(/one dependency has one gate decision/);
    expect(() => extractFrameworkBlocks("```json framework:business-input\n{ not json\n```\n", "c.md")).toThrow(/c\.md:1/);
    expect(() => engineInputFromWorkflow([{ file: "d.md", markdown: record(`${input}\n${block("test-register", [{ id: "T1", title: "t", check: "vibes.good" }])}`) }])).toThrow(/unknown check/);
  });

  it("generated sections replace only their markers", () => {
    const once = writeGeneratedSection("# Title\n\nHuman prose.\n", "register", "first");
    const twice = writeGeneratedSection(once, "register", "second");
    expect(twice).toContain("Human prose.");
    expect(twice).toContain("second");
    expect(twice).not.toContain("first");
    expect(twice.match(/framework:generated:register:start/g)).toHaveLength(1);
  });

  it("register cases evaluate from computed gates; missing evidence is BLOCKED, never PASS", () => {
    const { output, site } = build(leadPractice());
    const results = evaluateTestRegister(
      [
        { id: "TC-1", title: "integrity", check: "integrity.consistent" },
        { id: "TC-2", title: "responsive", check: "gate.responsive" },
        { id: "TC-3", title: "placeholders", check: "indexability.no_placeholder_text" },
        { id: "TC-4", title: "nav operated", check: "navigation.compact_delivered" },
        { id: "TC-5", title: "dataset", check: "dataset.not_synthetic" },
      ],
      { quality: output.quality, manifest: site.manifest },
    );
    expect(results.map((r) => r.result)).toEqual(["PASS", output.quality.gates.responsive === true ? "PASS" : output.quality.gates.responsive === false ? "FAIL" : "BLOCKED", "BLOCKED", "BLOCKED", "FAIL"]);
    expect(renderRegisterTable(results)).toContain("| TC-1 | integrity | `integrity.consistent` | PASS |");
  });

  it("the Ashvattha engine JSON is DERIVED from its workflow record and has not drifted", () => {
    const base = join("customers", "ashvattha-tax");
    const seam = engineInputFromWorkflow([{ file: "07-engine-seam.md", markdown: readFileSync(join(base, "website_workflow", "runs", "WEB-NEW-20260914-practice-website", "07-engine-seam.md"), "utf8") }]);
    expect(seam.businessInput).toEqual(parseBusinessInput(JSON.parse(readFileSync(join(base, "engine", "business-input.json"), "utf8"))));
    expect(seam.suppliedContent).toEqual(JSON.parse(readFileSync(join(base, "engine", "supplied-content.json"), "utf8")));
    expect(seam.testRegister.length).toBeGreaterThan(0);
  });
});
