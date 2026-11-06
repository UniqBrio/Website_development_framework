/**
 * The server-side form guard: every check, the fail-closed paths, CAPTCHA
 * verification, logging privacy, and the policy's security invariant.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createCaptchaVerifier,
  createMemoryGuardStore,
  guardRequest,
  guardSubmission,
  GUARD_FIELDS,
  type GuardConfig,
} from "../../src/growth/spam/guard.js";
import { assessSpamPolicy, parseSpamPolicy, DEFAULT_SPAM_POLICY } from "../../src/growth/spam/policy.js";
import { formGuardSource } from "../../src/growth/spam/guard-source.js";

const T0 = Date.UTC(2030, 0, 1, 10, 0, 0);
const config = (policy: unknown = {}): GuardConfig => ({
  policy: parseSpamPolicy(policy),
  forms: {
    enquiry: {
      fields: [
        { name: "name", type: "text", required: true },
        { name: "email", type: "email", required: true },
        { name: "message", type: "textarea", required: true },
      ],
    },
  },
});
const values = (over: Record<string, string> = {}, startedAgo = 30_000): Record<string, string> => ({
  name: "Fixture Person",
  email: "fixture@example.com",
  message: "I would like to know about beginner batches.",
  [GUARD_FIELDS.formId]: "enquiry",
  [GUARD_FIELDS.started]: String(T0 - startedAgo),
  contact_website: "",
  ...over,
});
const run = (store = createMemoryGuardStore(), over: Partial<Parameters<typeof guardSubmission>[0]> = {}) =>
  guardSubmission({ formId: "enquiry", values: values(), ip: "203.0.113.7", userAgent: "Mozilla/5.0", config: config(), store, now: T0, ...over });

describe("form guard — individual checks", () => {
  it("accepts a legitimate submission and returns only contract fields", async () => {
    const v = await run();
    expect(v.outcome).toBe("accepted");
    expect(v.deliverable).toBe(true);
    expect(v.response.status).toBe(200);
    expect(Object.keys(v.clean).sort()).toEqual(["email", "message", "name"]);
  });

  it("blocks a filled honeypot outright", async () => {
    const v = await run(undefined, { values: values({ contact_website: "https://spam.example" }) });
    expect(v.outcome).toBe("blocked");
    expect(v.deliverable).toBe(false);
    expect(v.response.status).toBe(403);
    expect(v.clean).toEqual({});
  });

  it("validates server-side, never trusting the browser", async () => {
    const v = await run(undefined, { values: values({ email: "not-an-email", message: "" }) });
    expect(v.outcome).toBe("invalid");
    expect(v.response.status).toBe(400);
    expect(Object.keys(v.fieldErrors).sort()).toEqual(["email", "message"]);
  });

  it("does not let a too-fast submission through as accepted", async () => {
    const v = await run(undefined, { values: values({}, 500) });
    expect(v.outcome).not.toBe("accepted");
    expect(v.signals.some((s) => s.check === "timing")).toBe(true);
  });

  it("treats a missing timing token (JavaScript off) as a weak signal only", async () => {
    const vals = values();
    delete vals[GUARD_FIELDS.started];
    const v = await run(undefined, { values: vals });
    expect(v.outcome).toBe("accepted");
  });

  it("rejects an exact duplicate inside the window", async () => {
    const store = createMemoryGuardStore();
    expect((await run(store)).outcome).toBe("accepted");
    const again = await run(store, { now: T0 + 5_000 });
    expect(again.outcome).toBe("duplicate");
    expect(again.deliverable).toBe(false);
  });

  it("rate limits a burst from one source and counts across forms", async () => {
    const store = createMemoryGuardStore();
    const outcomes: string[] = [];
    for (let i = 0; i < 7; i++) {
      outcomes.push((await run(store, { values: values({ message: `Burst message number ${i}` }), now: T0 + i * 1000 })).outcome);
    }
    expect(outcomes.slice(0, 5).every((o) => o === "accepted")).toBe(true);
    expect(outcomes[5]).toBe("rate_limited");
  });

  it("temporarily blocks a source after repeated violations, then lets it go", async () => {
    const store = createMemoryGuardStore();
    const trap = values({ contact_website: "x" });
    for (let i = 0; i < 5; i++) await run(store, { values: trap, now: T0 + i });
    const blocked = await run(store, { now: T0 + 10_000 });
    expect(blocked.outcome).toBe("blocked");
    expect(blocked.signals[0]?.check).toBe("ip_block");
    const later = await run(store, { now: T0 + 61 * 60_000 });
    expect(later.outcome).toBe("accepted");
  });

  it("scores link spam and blocked terms", async () => {
    const links = await run(undefined, { values: values({ message: "see http://a.example http://b.example http://c.example" }) });
    expect(links.outcome).toBe("flagged");
    const cfg = config({ content: { blockedTerms: ["casino"] } });
    const term = await run(undefined, { config: cfg, values: values({ name: "http://spam.example", message: "Best casino deals" }) });
    expect(term.outcome).toBe("blocked");
  });

  it("fails closed on a disabled baseline check or an unknown form", async () => {
    const insecure: GuardConfig = { ...config(), policy: { ...config().policy, honeypot: { enabled: false, fieldName: "contact_website" } } };
    expect((await run(undefined, { config: insecure })).outcome).toBe("blocked");
    expect((await run(undefined, { formId: "unknown" })).outcome).toBe("blocked");
  });

  it("never logs a raw address or submitted values", async () => {
    const store = createMemoryGuardStore();
    await run(store, { values: values({ contact_website: "x" }) });
    const logged = JSON.stringify(store.events);
    expect(logged).not.toContain("203.0.113.7");
    expect(logged).not.toContain("fixture@example.com");
    expect(store.events[0]?.sourceHash).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe("form guard — CAPTCHA", () => {
  const captchaConfig = (over: Record<string, unknown> = {}) => config({ captcha: { provider: "turnstile", siteKey: "fixture-site-key", ...over } });
  const verifier = (body: unknown, ok = true) =>
    createCaptchaVerifier("turnstile", "fixture-secret", (async () => new Response(JSON.stringify(body), { status: ok ? 200 : 500 })) as typeof fetch);

  it("posts the token and secret to the provider and accepts a valid token", async () => {
    let seen: { url: string; body: string } | null = null;
    const fetchImpl = (async (url: string, init: RequestInit) => {
      seen = { url, body: String(init.body) };
      return new Response(JSON.stringify({ success: true }));
    }) as unknown as typeof fetch;
    const v = await run(undefined, {
      config: captchaConfig(),
      values: values({ "cf-turnstile-response": "tok" }),
      captcha: createCaptchaVerifier("turnstile", "fixture-secret", fetchImpl),
    });
    expect(v.outcome).toBe("accepted");
    expect(seen!.url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    expect(seen!.body).toContain("secret=fixture-secret");
    expect(seen!.body).toContain("response=tok");
  });

  it("blocks a rejected token and a missing token (default)", async () => {
    const rejected = await run(undefined, { config: captchaConfig(), values: values({ "cf-turnstile-response": "bad" }), captcha: verifier({ success: false, "error-codes": ["invalid-input-response"] }) });
    expect(rejected.outcome).toBe("blocked");
    const missing = await run(undefined, { config: captchaConfig(), captcha: verifier({ success: true }) });
    expect(missing.outcome).toBe("blocked");
  });

  it("quarantines (never accepts) when the provider is unreachable", async () => {
    const v = await run(undefined, { config: captchaConfig(), values: values({ "cf-turnstile-response": "tok" }), captcha: verifier({}, false) });
    expect(v.outcome).toBe("flagged");
    expect(v.deliverable).toBe(false);
  });

  it("blocks when CAPTCHA is configured but the server has no secret", async () => {
    const v = await run(undefined, { config: captchaConfig(), values: values({ "cf-turnstile-response": "tok" }) });
    expect(v.outcome).toBe("blocked");
  });

  it("applies the reCAPTCHA v3 score threshold", async () => {
    const cfg = config({ captcha: { provider: "recaptcha_v3", siteKey: "k", minScore: 0.5 } });
    const low = createCaptchaVerifier("recaptcha_v3", "s", (async () => new Response(JSON.stringify({ success: true, score: 0.1 }))) as unknown as typeof fetch);
    const v = await run(undefined, { config: cfg, values: values({ "g-recaptcha-response": "t" }), captcha: low });
    expect(v.outcome).not.toBe("accepted");
  });
});

describe("form guard — request helper", () => {
  it("reads a urlencoded POST and the forwarded address", async () => {
    const body = new URLSearchParams(values());
    const request = new Request("https://fixture.example/api/enquiry", {
      method: "POST",
      body,
      headers: { "content-type": "application/x-www-form-urlencoded", "x-forwarded-for": "198.51.100.1, 10.0.0.1", "user-agent": "Mozilla/5.0" },
    });
    const v = await guardRequest(request, { config: config(), store: createMemoryGuardStore(), now: T0 });
    expect(v.outcome).toBe("accepted");
  });
});

describe("spam protection policy — security invariant", () => {
  it("the default policy is secure and has no violations", () => {
    expect(assessSpamPolicy(DEFAULT_SPAM_POLICY).violations).toEqual([]);
  });
  it.each([
    [{ enabled: false }],
    [{ honeypot: { enabled: false } }],
    [{ rateLimit: { enabled: false } }],
    [{ duplicates: { enabled: false } }],
    [{ captcha: { provider: "turnstile" } }],
  ])("reports %j as a violation", (policy) => {
    expect(assessSpamPolicy(parseSpamPolicy(policy)).violations.length).toBeGreaterThan(0);
  });
  it("bounds thresholds so legitimate visitors are not punished, and never stores a secret", () => {
    expect(() => parseSpamPolicy({ timing: { minSeconds: 60 } })).toThrow();
    expect(() => parseSpamPolicy({ rateLimit: { maxPerWindow: 1 } })).toThrow();
    expect(() => parseSpamPolicy({ captcha: { secretEnvVar: "0x4AAAA-actual-secret" } })).toThrow();
    expect(() => parseSpamPolicy({ captcha: { secret: "x" } })).toThrow();
  });
});

describe("the emitted guard is the tested guard", () => {
  it("is import-free and byte-identical to src/growth/spam/guard.ts", () => {
    const src = readFileSync(new URL("../../src/growth/spam/guard.ts", import.meta.url), "utf8");
    const emitted = formGuardSource();
    expect(emitted.endsWith(src)).toBe(true);
    expect(/^\s*import\s/m.test(src)).toBe(false);
  });
});
