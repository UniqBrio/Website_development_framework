/**
 * Spam protection reaches the generated website: every configured public form is
 * protected in BOTH layers, the host receives the tested guard, an insecure
 * policy cannot ship a public form, and the endpoint probe tells a guarded
 * endpoint from an unguarded one.
 */
import { describe, expect, it } from "vitest";
import { runPipeline } from "../../src/pipeline.js";
import { generateWebsite } from "../../src/generation/generate-website.js";
import { formGuardSource } from "../../src/growth/spam/guard-source.js";
import { createMemoryGuardStore, guardSubmission, type GuardConfig } from "../../src/growth/spam/guard.js";
import { probeFormEndpoint } from "../../src/growth/spam/probe.js";
import { renderGrowthConsole } from "../../src/growth/console.js";
import { FORM_PROTECTION_RUNTIME_FILE } from "../../src/growth/spam/runtime.js";
import { danceAcademy } from "../fixtures/growth-fixtures.js";

const SUPPLIED = { contactDetails: { email: "fixture@example.com" } };

function build(formEndpoints?: Record<string, string>, formProtection?: unknown) {
  const input = danceAcademy();
  const { output, contract } = runPipeline(input);
  return { output, site: generateWebsite(input, output, contract, { suppliedContent: SUPPLIED, ...(formEndpoints ? { formEndpoints } : {}), ...(formProtection !== undefined ? { formProtection } : {}) }) };
}

describe("generated forms carry spam protection", () => {
  const { site } = build({ enquiry: "/api/enquiry" });
  const html = site.files["static/index.html"]!;
  const tsx = site.files["next/app/page.tsx"]!;

  it("renders the honeypot, timing and form-id fields in the static HTML", () => {
    expect(html).toContain('data-protection="guarded"');
    expect(html).toMatch(/<div class="c-form-trap" data-form-trap aria-hidden="true">.*name="contact_website" type="text" tabindex="-1" autocomplete="off"/);
    expect(html).toContain('name="_fg_started"');
    expect(html).toContain('name="_fg_form" value="enquiry"');
    expect(html).toContain('<script src="/form-protection.js" defer></script>');
    expect(site.files["static/form-protection.js"]).toBeDefined();
  });

  it("renders the same protection in the Next.js page and layout", () => {
    expect(tsx).toContain('name="contact_website"');
    expect(tsx).toContain("tabIndex={-1}");
    expect(site.files["next/app/layout.tsx"]).toContain('src="/form-protection.js"');
    expect(site.files["next/public/form-protection.js"]).toBeDefined();
  });

  it("emits the tested guard verbatim and the protection config, with no package imports", () => {
    expect(site.files["next/lib/form-guard.ts"]).toBe(formGuardSource());
    const cfg = JSON.parse(site.files["next/forms/protection.json"]!) as GuardConfig;
    expect(Object.keys(cfg.forms)).toEqual(["enquiry"]);
    expect(cfg.forms["enquiry"]!.fields.map((f) => f.name)).toEqual(["name", "email", "message"]);
    expect(JSON.stringify(cfg)).not.toMatch(/secret"\s*:/i);
    expect(site.files["next/README.md"]).toContain("Form protection (spam & bot prevention)");
    expect(site.manifest.dependencyAdmission.admitted).not.toHaveProperty("zod", expect.anything());
  });

  it("records protection in the manifest and the integrity ledger", () => {
    expect(site.manifest.formProtection.forms).toEqual([expect.objectContaining({ page: "/", formId: "enquiry", endpoint: "/api/enquiry" })]);
    expect(site.manifest.formProtection.runtime?.gzipBytes).toBeLessThan(2_000);
    const entries = site.manifest.integrity.entries.filter((e) => e.domain === "form_protection");
    expect(entries).toHaveLength(1);
    expect(entries[0]!.status).toBe("delivered");
  });

  it("ships a syntactically valid, dependency-free runtime", () => {
    expect(() => new Function(FORM_PROTECTION_RUNTIME_FILE)).not.toThrow();
    expect(FORM_PROTECTION_RUNTIME_FILE).not.toMatch(/\bimport\b|\brequire\(/);
  });

  it("renders a CAPTCHA slot and a no-JavaScript alternative when configured", () => {
    const { site: s } = build({ enquiry: "/api/enquiry" }, { captcha: { provider: "turnstile", siteKey: "fixture-key" } });
    const page = s.files["static/index.html"]!;
    expect(page).toContain('data-captcha="turnstile" data-captcha-key="fixture-key" data-captcha-load="interaction"');
    expect(page).toContain("data-captcha-slot");
    expect(page).toContain("<noscript>");
  });
});

describe("the security invariant stops generation", () => {
  it("adds nothing to an unconfigured form, which cannot submit", () => {
    const { site } = build();
    expect(site.files["static/index.html"]).not.toContain("contact_website");
    expect(site.files["next/lib/form-guard.ts"]).toBeUndefined();
  });

  it("refuses to emit a configured form under a policy with a baseline check off", () => {
    expect(() => build({ enquiry: "/api/enquiry" }, { honeypot: { enabled: false } })).toThrow(/form protection violated/);
    expect(() => build({ enquiry: "/api/enquiry" }, { enabled: false })).toThrow(/form protection violated/);
  });
});

describe("endpoint probe (Phase 5 evidence)", () => {
  const { site } = build({ enquiry: "/api/enquiry" });
  const cfg = JSON.parse(site.files["next/forms/protection.json"]!) as GuardConfig;
  const fields = cfg.forms["enquiry"]!.fields;

  it("passes against an endpoint that applies the guard", async () => {
    const store = createMemoryGuardStore();
    let clock = Date.UTC(2030, 0, 1);
    const result = await probeFormEndpoint({
      formId: "enquiry",
      fields,
      honeypotField: cfg.policy.honeypot.fieldName,
      minSeconds: cfg.policy.timing.minSeconds,
      maxPerWindow: cfg.policy.rateLimit.maxPerWindow,
      now: () => clock,
      send: async (values, headers) => {
        clock += 1000;
        const v = await guardSubmission({ formId: "enquiry", values, ip: "192.0.2.10", userAgent: headers["user-agent"] ?? null, config: cfg, store, now: clock });
        return { status: v.response.status, body: v.response.body };
      },
    });
    expect(result.steps.filter((s) => !s.passed)).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it("fails against an endpoint that accepts everything", async () => {
    const result = await probeFormEndpoint({
      formId: "enquiry",
      fields,
      honeypotField: "contact_website",
      minSeconds: 3,
      maxPerWindow: 5,
      send: async () => ({ status: 200, body: { ok: true } }),
    });
    expect(result.passed).toBe(false);
    expect(result.steps.find((s) => s.step === "honeypot")?.passed).toBe(false);
  });
});

describe("growth console", () => {
  const input = danceAcademy();
  const { output } = runPipeline(input, { growth: { formEndpoints: { enquiry: "/api/enquiry" } } });
  const render = (role: "owner" | "editor" | "viewer", actionEndpoint?: string) =>
    renderGrowthConsole(output.growth, { viewer: { id: `${role}@example.com`, role }, tokens: output.tokens, ...(actionEndpoint ? { actionEndpoint } : {}) });

  it("is never indexable and uses only design-system tokens", () => {
    const page = render("owner");
    expect(page).toContain('<meta name="robots" content="noindex, nofollow">');
    const style = page.slice(page.indexOf("<style>"), page.indexOf("</style>"));
    const outsideTokens = style.replace(/:root\s*\{[^}]*\}/g, "").replace(/@media \(prefers-color-scheme[^{]*\{\s*:root\s*\{[^}]*\}\s*\}/g, "");
    expect(outsideTokens).not.toMatch(/#[0-9a-fA-F]{3,8}\b|oklch\(|rgb\(/);
  });

  it("shows every area, status and the recommendation fields", () => {
    const page = render("owner", "/admin/growth");
    for (const id of ["overview", "guest-engagement", "resources", "blogs", "seo-improvements", "spam-protection"]) expect(page).toContain(`id="${id}"`);
    for (const label of ["Why it is recommended", "Target audience", "SEO opportunity", "Suggested keywords", "Expected business benefit", "High priority", "Recommended", "Implemented"]) expect(page).toContain(label);
    expect(page).toContain('action="/admin/growth" method="post"');
    expect(page).toContain('value="accept"');
  });

  it("renders controls by role", () => {
    const viewer = render("viewer", "/admin/growth");
    expect(viewer).not.toContain('name="verb"');
    expect(viewer).toContain("Read-only");
    expect(viewer).not.toContain("Security events");
    const editor = render("editor", "/admin/growth");
    expect(editor).toContain('name="verb"');
    expect(editor).toContain("Only owners and administrators change security settings");
    expect(editor).not.toContain('name="toolId"');
    expect(render("owner", "/admin/growth")).toContain('name="toolId"');
  });

  it("disables controls honestly when no action endpoint exists", () => {
    const page = render("owner");
    expect(page).toContain("No console endpoint is configured");
    expect(page).not.toMatch(/<button type="submit" name="verb" value="accept">/);
  });
});
