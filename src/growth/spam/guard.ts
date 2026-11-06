/**
 * FORM GUARD — server-side spam and bot verification for public website forms.
 *
 * GENERATED SITES RECEIVE THIS FILE VERBATIM (as lib/form-guard.ts). It is the
 * same code the framework tests, so it imports NOTHING: no package, no node:
 * module. It runs wherever the Fetch API and Web Crypto exist (Node 18+, edge
 * runtimes). Do not hand-edit a generated copy; change the framework and
 * regenerate.
 *
 * USE: a host route handler calls `guardRequest()` (or `guardSubmission()`)
 * BEFORE it delivers anything, and delivers only an `accepted` verdict. A
 * `flagged` verdict is quarantined for review, never treated as a lead. The
 * browser-side honeypot, timing field and CAPTCHA widget are inputs to these
 * checks — never a substitute for them.
 *
 * Checks, in order:
 *   1. temporary IP block          (repeat offenders)
 *   2. field validation            (the form contract: required, type, options, length)
 *   3. honeypot                    (a hidden field people never fill)
 *   4. rate limit                  (per form, per hashed source)
 *   5. duplicate submission        (same payload inside the window)
 *   6. timing + content signals    (scored, not decisive on their own)
 *   7. CAPTCHA token               (Cloudflare Turnstile or Google reCAPTCHA, when configured)
 *   8. suspicion score             (flag or block at the configured thresholds)
 *
 * Privacy: raw IP addresses and submitted values are never logged. Security
 * events carry a salted SHA-256 prefix of the source and the names of the checks
 * that fired.
 */

// ------------------------------------------------------------------ policy (mirrors growth/spam/policy.ts)

export interface GuardPolicy {
  enabled: boolean;
  captcha: {
    provider: "none" | "turnstile" | "recaptcha_v2" | "recaptcha_v3";
    siteKey?: string | undefined;
    secretEnvVar?: string | undefined;
    minScore: number;
    onMissingToken: "block" | "flag";
    onVerifierError: "block" | "flag";
    loadOn: "interaction" | "page_load";
    forms: string[];
  };
  honeypot: { enabled: boolean; fieldName: string };
  timing: { enabled: boolean; minSeconds: number; maxAgeHours: number };
  rateLimit: { enabled: boolean; windowSeconds: number; maxPerWindow: number };
  ipBlocking: { enabled: boolean; violationsBeforeBlock: number; violationWindowSeconds: number; blockMinutes: number };
  duplicates: { enabled: boolean; windowSeconds: number };
  content: { enabled: boolean; maxLinks: number; blockedTerms: string[]; maxFieldLength: number };
  scoring: { flagAt: number; blockAt: number };
  logging: { retainDays: number; ipHashSaltEnvVar: string };
}

export interface GuardField {
  name: string;
  type: "text" | "email" | "tel" | "date" | "number" | "select" | "textarea";
  required: boolean;
  min?: number | undefined;
  options?: string[] | undefined;
}

/** The generated forms/protection.json: the policy plus each form's field contract. */
export interface GuardConfig {
  policy: GuardPolicy;
  forms: Record<string, { fields: GuardField[] }>;
}

/** Field names the browser half adds. They are protection inputs, not submission data. */
export const GUARD_FIELDS = {
  formId: "_fg_form",
  started: "_fg_started",
  turnstileToken: "cf-turnstile-response",
  recaptchaToken: "g-recaptcha-response",
} as const;

// ------------------------------------------------------------------ store

export interface SecurityEvent {
  id: string;
  at: string;
  formId: string;
  outcome: GuardOutcome;
  score: number;
  signals: Array<{ check: string; detail: string }>;
  /** Salted SHA-256 prefix of the source address. Never the address. */
  sourceHash: string;
}

/**
 * Persistence the checks need. `createMemoryGuardStore()` is correct for one
 * long-running process; serverless and multi-instance hosts MUST provide a shared
 * store (a database table or a key-value service), or the counters reset per
 * instance and rate limiting silently weakens.
 */
export interface GuardStore {
  /** Record a hit under `key` and return the hits inside the window, including this one. */
  hit(key: string, windowMs: number, nowMs: number): Promise<number>;
  /** True when `key` was remembered and has not expired. */
  has(key: string, nowMs: number): Promise<boolean>;
  remember(key: string, ttlMs: number, nowMs: number): Promise<void>;
  blockedUntil(key: string, nowMs: number): Promise<number | null>;
  block(key: string, untilMs: number): Promise<void>;
  log(event: SecurityEvent): Promise<void>;
}

export function createMemoryGuardStore(): GuardStore & { events: SecurityEvent[] } {
  const hits = new Map<string, number[]>();
  const remembered = new Map<string, number>();
  const blocks = new Map<string, number>();
  const events: SecurityEvent[] = [];
  return {
    events,
    async hit(key, windowMs, nowMs) {
      const kept = (hits.get(key) ?? []).filter((t) => t > nowMs - windowMs);
      kept.push(nowMs);
      hits.set(key, kept);
      return kept.length;
    },
    async has(key, nowMs) {
      const until = remembered.get(key);
      return until !== undefined && until > nowMs;
    },
    async remember(key, ttlMs, nowMs) {
      remembered.set(key, nowMs + ttlMs);
    },
    async blockedUntil(key, nowMs) {
      const until = blocks.get(key);
      return until !== undefined && until > nowMs ? until : null;
    },
    async block(key, untilMs) {
      blocks.set(key, untilMs);
    },
    async log(event) {
      events.push(event);
    },
  };
}

// ------------------------------------------------------------------ CAPTCHA

export interface CaptchaResult {
  success: boolean;
  score?: number | undefined;
  hostname?: string | undefined;
  errorCodes: string[];
}

export type CaptchaVerifier = (token: string, remoteIp: string | null) => Promise<CaptchaResult>;

export const CAPTCHA_VERIFY_URLS = {
  turnstile: "https://challenges.cloudflare.com/turnstile/v0/siteverify",
  recaptcha_v2: "https://www.google.com/recaptcha/api/siteverify",
  recaptcha_v3: "https://www.google.com/recaptcha/api/siteverify",
} as const;

/** The provider's documented server-side verification call. `fetchImpl` is injectable for tests. */
export function createCaptchaVerifier(
  provider: keyof typeof CAPTCHA_VERIFY_URLS,
  secret: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 5_000,
): CaptchaVerifier {
  return async (token, remoteIp) => {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp) body.set("remoteip", remoteIp);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(CAPTCHA_VERIFY_URLS[provider], { method: "POST", body, signal: controller.signal });
      if (!res.ok) throw new Error(`verifier HTTP ${res.status}`);
      const data = (await res.json()) as { success?: unknown; score?: unknown; hostname?: unknown; "error-codes"?: unknown };
      return {
        success: data.success === true,
        score: typeof data.score === "number" ? data.score : undefined,
        hostname: typeof data.hostname === "string" ? data.hostname : undefined,
        errorCodes: Array.isArray(data["error-codes"]) ? data["error-codes"].map(String) : [],
      };
    } finally {
      clearTimeout(timer);
    }
  };
}

// ------------------------------------------------------------------ verdict

export type GuardOutcome = "accepted" | "flagged" | "blocked" | "rate_limited" | "duplicate" | "invalid";

export interface GuardVerdict {
  outcome: GuardOutcome;
  /** Only `accepted` may be delivered as an enquiry, booking or sign-up. */
  deliverable: boolean;
  score: number;
  signals: Array<{ check: string; weight: number; detail: string }>;
  fieldErrors: Record<string, string>;
  /** Validated contract fields only — protection fields and unknown fields stripped. */
  clean: Record<string, string>;
  response: { status: number; body: { ok: boolean; outcome: GuardOutcome; message: string; fieldErrors?: Record<string, string> } };
  event: SecurityEvent;
}

export interface GuardInput {
  formId: string;
  values: Record<string, string>;
  /** Source address as the host sees it; null when unknown (then one shared bucket applies). */
  ip: string | null;
  userAgent: string | null;
  config: GuardConfig;
  store: GuardStore;
  /** Required when the policy names a CAPTCHA provider for this form. */
  captcha?: CaptchaVerifier | undefined;
  /** Salt for source hashing (from the env var the policy names). */
  ipHashSalt?: string | undefined;
  now?: number | undefined;
}

const MESSAGES: Record<GuardOutcome, string> = {
  accepted: "Thank you — your message has been received.",
  flagged: "Thank you — your message has been received and will be reviewed shortly.",
  duplicate: "We already received this message. There is no need to send it again.",
  invalid: "Some fields need attention. Please check the highlighted fields and try again.",
  rate_limited: "Too many submissions from your connection in a short time. Please wait a few minutes and try again.",
  blocked: "We could not accept this submission. Please try again later, or contact us directly by phone or email.",
};
const STATUS: Record<GuardOutcome, number> = { accepted: 200, flagged: 202, duplicate: 200, invalid: 400, rate_limited: 429, blocked: 403 };

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TEL = /^[+()\d][\d\s()+.-]{5,24}$/;
const LINK = /(https?:\/\/|www\.)\S+/gi;
const HAS_LINK = /(https?:\/\/|www\.)\S+/i;
const BBCODE = /\[(url|link)[=\]]/i;
const SHORT_FIELD_MAX = 200;

function validate(fields: readonly GuardField[], values: Record<string, string>, maxLength: number): { clean: Record<string, string>; errors: Record<string, string> } {
  const clean: Record<string, string> = {};
  const errors: Record<string, string> = {};
  for (const f of fields) {
    const raw = (values[f.name] ?? "").trim();
    if (raw.length === 0) {
      if (f.required) errors[f.name] = "This field is required.";
      continue;
    }
    const limit = f.type === "textarea" ? maxLength : SHORT_FIELD_MAX;
    if (raw.length > limit) {
      errors[f.name] = `Please keep this under ${limit} characters.`;
      continue;
    }
    if (f.type === "email" && !EMAIL.test(raw)) errors[f.name] = "Please enter a valid email address.";
    else if (f.type === "date" && (!DATE.test(raw) || Number.isNaN(Date.parse(raw)))) errors[f.name] = "Please enter a valid date.";
    else if (f.type === "tel" && !TEL.test(raw)) errors[f.name] = "Please enter a valid phone number.";
    else if (f.type === "number" && (!/^-?\d+$/.test(raw) || (f.min !== undefined && Number(raw) < f.min))) {
      errors[f.name] = f.min !== undefined ? `Please enter a whole number of at least ${f.min}.` : "Please enter a whole number.";
    } else if (f.type === "select" && !(f.options ?? []).includes(raw)) errors[f.name] = "Please choose one of the listed options.";
    else clean[f.name] = raw;
  }
  return { clean, errors };
}

function tokenField(provider: GuardPolicy["captcha"]["provider"]): string {
  return provider === "turnstile" ? GUARD_FIELDS.turnstileToken : GUARD_FIELDS.recaptchaToken;
}

export function captchaRequiredFor(policy: GuardPolicy, formId: string): boolean {
  return policy.captcha.provider !== "none" && (policy.captcha.forms.length === 0 || policy.captcha.forms.includes(formId));
}

/** Run every configured check on one submission. Never throws on hostile input. */
export async function guardSubmission(input: GuardInput): Promise<GuardVerdict> {
  const now = input.now ?? Date.now();
  const { policy } = input.config;
  const signals: GuardVerdict["signals"] = [];
  const sourceHash = (await sha256Hex(`${input.ipHashSalt ?? ""}|${input.ip ?? "unknown"}`)).slice(0, 16);
  const formContract = input.config.forms[input.formId];
  let score = 0;
  let fieldErrors: Record<string, string> = {};
  let clean: Record<string, string> = {};

  const finish = async (outcome: GuardOutcome): Promise<GuardVerdict> => {
    const event: SecurityEvent = {
      id: `${now.toString(36)}-${(await sha256Hex(`${sourceHash}|${input.formId}|${now}|${Math.random()}`)).slice(0, 8)}`,
      at: new Date(now).toISOString(),
      formId: input.formId,
      outcome,
      score,
      signals: signals.map((s) => ({ check: s.check, detail: s.detail })),
      sourceHash,
    };
    await input.store.log(event);
    // Repeat offenders: blocked and rate-limited outcomes count toward a temporary block.
    if ((outcome === "blocked" || outcome === "rate_limited") && policy.ipBlocking.enabled) {
      const violations = await input.store.hit(`viol:${sourceHash}`, policy.ipBlocking.violationWindowSeconds * 1000, now);
      if (violations >= policy.ipBlocking.violationsBeforeBlock) {
        await input.store.block(`src:${sourceHash}`, now + policy.ipBlocking.blockMinutes * 60_000);
        await input.store.log({ ...event, id: `${event.id}-b`, signals: [{ check: "ip_block", detail: `${violations} violations; blocked for ${policy.ipBlocking.blockMinutes} min` }] });
      }
    }
    const deliverable = outcome === "accepted";
    return {
      outcome,
      deliverable,
      score,
      signals,
      fieldErrors,
      clean: deliverable || outcome === "flagged" ? clean : {},
      response: {
        status: STATUS[outcome],
        body: { ok: outcome === "accepted" || outcome === "flagged" || outcome === "duplicate", outcome, message: MESSAGES[outcome], ...(outcome === "invalid" ? { fieldErrors } : {}) },
      },
      event,
    };
  };
  const signal = (check: string, weight: number, detail: string) => {
    signals.push({ check, weight, detail });
    score += weight;
  };

  // 0. The policy itself. A disabled guard or an unknown form is a configuration
  //    error, and a configuration error fails CLOSED.
  if (!policy.enabled || !policy.honeypot.enabled || !policy.rateLimit.enabled || !policy.duplicates.enabled) {
    signal("configuration", 0, "a baseline check is disabled; refusing rather than accepting unverified submissions");
    return finish("blocked");
  }
  if (!formContract) {
    signal("configuration", 0, `no field contract for form "${input.formId}"`);
    return finish("blocked");
  }

  // 1. Temporary IP block.
  if (policy.ipBlocking.enabled) {
    const until = await input.store.blockedUntil(`src:${sourceHash}`, now);
    if (until !== null) {
      signal("ip_block", 0, `source blocked until ${new Date(until).toISOString()}`);
      return finish("blocked");
    }
  }

  // Every attempt counts toward the rate limit, including ones rejected below. A
  // per-form bucket, plus a cross-form bucket so rotating the form id gains nothing.
  const windowMs = policy.rateLimit.windowSeconds * 1000;
  const attempts = await input.store.hit(`rate:${input.formId}:${sourceHash}`, windowMs, now);
  const allAttempts = await input.store.hit(`rate:*:${sourceHash}`, windowMs, now);

  // 2. Server-side field validation — never only the browser's.
  const validated = validate(formContract.fields, input.values, policy.content.maxFieldLength);
  clean = validated.clean;
  fieldErrors = validated.errors;

  // 3. Honeypot: decisive.
  const trap = input.values[policy.honeypot.fieldName];
  if (trap !== undefined && trap.trim().length > 0) {
    signal("honeypot", 0, "the hidden field was filled");
    return finish("blocked");
  }

  // 4. Rate limit.
  if (attempts > policy.rateLimit.maxPerWindow || allAttempts > policy.rateLimit.maxPerWindow * 2) {
    signal("rate_limit", 0, `${attempts} submissions to this form (${allAttempts} to all forms) in ${policy.rateLimit.windowSeconds}s; limit ${policy.rateLimit.maxPerWindow} per form`);
    return finish("rate_limited");
  }

  if (Object.keys(fieldErrors).length > 0) {
    signal("validation", 0, `invalid: ${Object.keys(fieldErrors).join(", ")}`);
    return finish("invalid");
  }

  // 5. Duplicate submission (double clicks and replays).
  const known = new Set([...formContract.fields.map((f) => f.name), policy.honeypot.fieldName, ...Object.values(GUARD_FIELDS)]);
  const payloadKey = `dup:${input.formId}:${await sha256Hex(JSON.stringify(Object.entries(clean).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, v.toLowerCase().replace(/\s+/g, " ")])))}`;
  if (await input.store.has(payloadKey, now)) {
    signal("duplicate", 0, `identical submission inside ${policy.duplicates.windowSeconds}s`);
    return finish("duplicate");
  }

  // 6. Scored signals.
  const unexpected = Object.keys(input.values).filter((k) => !known.has(k));
  if (unexpected.length > 0) signal("unexpected_fields", 2, `${unexpected.length} field(s) not in the form contract`);
  if (!input.userAgent || input.userAgent.trim().length === 0) signal("user_agent", 1, "no user agent");

  if (policy.timing.enabled) {
    const startedRaw = input.values[GUARD_FIELDS.started];
    if (!startedRaw) {
      signal("timing", 1, "no timing token (JavaScript off, or a script)");
    } else {
      const started = Number(startedRaw);
      if (!Number.isFinite(started) || started > now + 60_000) signal("timing", 3, "timing token is malformed or in the future");
      else if (now - started < policy.timing.minSeconds * 1000) signal("timing", 4, `submitted ${((now - started) / 1000).toFixed(1)}s after the form loaded (minimum ${policy.timing.minSeconds}s)`);
      else if (now - started > policy.timing.maxAgeHours * 3_600_000) signal("timing", 1, "the form was loaded more than the allowed age ago");
    }
  }

  if (policy.content.enabled) {
    const all = Object.values(clean).join("\n");
    const links = all.match(LINK)?.length ?? 0;
    if (links > policy.content.maxLinks) signal("links", 3, `${links} links (allowed ${policy.content.maxLinks})`);
    if (BBCODE.test(all)) signal("markup", 3, "forum link markup");
    for (const f of formContract.fields) {
      if ((f.type === "text" || f.type === "tel") && HAS_LINK.test(clean[f.name] ?? "")) {
        signal("link_in_short_field", 3, `a link in "${f.name}"`);
      }
    }
    const lower = all.toLowerCase();
    const hit = policy.content.blockedTerms.find((t) => lower.includes(t.toLowerCase()));
    if (hit) signal("blocked_term", 4, "contains a blocked term");
  }

  // 7. CAPTCHA token, verified with the provider — the browser widget alone proves nothing.
  if (captchaRequiredFor(policy, input.formId)) {
    const token = (input.values[tokenField(policy.captcha.provider)] ?? "").trim();
    if (!token) {
      signal("captcha", policy.captcha.onMissingToken === "block" ? policy.scoring.blockAt : policy.scoring.flagAt, "no CAPTCHA token");
    } else if (!input.captcha) {
      signal("captcha", policy.scoring.blockAt, "CAPTCHA configured but the server has no verifier (missing secret)");
    } else {
      try {
        const result = await input.captcha(token, input.ip);
        if (!result.success) signal("captcha", policy.scoring.blockAt, `token rejected${result.errorCodes.length ? ` (${result.errorCodes.join(", ")})` : ""}`);
        else if (policy.captcha.provider === "recaptcha_v3" && (result.score ?? 0) < policy.captcha.minScore) {
          signal("captcha", 4, `score ${result.score ?? "none"} below ${policy.captcha.minScore}`);
        }
      } catch (error) {
        signal("captcha", policy.captcha.onVerifierError === "block" ? policy.scoring.blockAt : policy.scoring.flagAt, `verifier unreachable: ${error instanceof Error ? error.message : "error"}`);
      }
    }
  }

  // 8. Decide.
  const outcome: GuardOutcome = score >= policy.scoring.blockAt ? "blocked" : score >= policy.scoring.flagAt ? "flagged" : "accepted";
  if (outcome === "accepted" || outcome === "flagged") {
    await input.store.remember(payloadKey, policy.duplicates.windowSeconds * 1000, now);
  }
  return finish(outcome);
}

// ------------------------------------------------------------------ request helpers

/** Form fields from a POST body (urlencoded, multipart or JSON). Non-string values are dropped. */
export async function readSubmission(request: Request): Promise<Record<string, string>> {
  const type = request.headers.get("content-type") ?? "";
  const out: Record<string, string> = {};
  if (type.includes("application/json")) {
    const data = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    for (const [k, v] of Object.entries(data ?? {})) if (typeof v === "string" || typeof v === "number") out[k] = String(v);
    return out;
  }
  const form = await request.formData().catch(() => null);
  if (!form) return out;
  form.forEach((v, k) => {
    if (typeof v === "string") out[k] = v;
  });
  return out;
}

/** The client address from the common proxy headers, else null. */
export function sourceAddress(headers: Headers): string | null {
  const cf = headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return headers.get("x-real-ip")?.trim() || null;
}

/** One call for a route handler: read, verify, and return the verdict. */
export async function guardRequest(
  request: Request,
  options: Omit<GuardInput, "values" | "ip" | "userAgent" | "formId"> & { formId?: string },
): Promise<GuardVerdict> {
  const values = await readSubmission(request);
  const formId = options.formId ?? values[GUARD_FIELDS.formId] ?? "";
  return guardSubmission({
    ...options,
    formId,
    values,
    ip: sourceAddress(request.headers),
    userAgent: request.headers.get("user-agent"),
  });
}
