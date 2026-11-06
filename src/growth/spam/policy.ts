/**
 * SPAM & BOT PROTECTION POLICY — what administrators configure.
 *
 * The SECURITY INVARIANT (docs/GROWTH-PROTECTION-SPEC.md §3): no public form may
 * accept a submission that has not passed server-side checks. So four checks are
 * BASELINE and cannot be switched off — server-side field validation (always on,
 * not even a field here), the honeypot, rate limiting and duplicate prevention.
 * `assessSpamPolicy()` reports any attempt to disable them as a violation; the
 * configuration action refuses to save such a policy and the generator refuses
 * to emit a configured form under one.
 *
 * Everything else is tunable within bounds chosen so a legitimate visitor is not
 * punished: a minimum fill time can never exceed 15 seconds, a rate limit can
 * never go below two submissions per window.
 *
 * No secret is ever stored here. A CAPTCHA secret is referenced by the NAME of
 * the environment variable that holds it; the site key is public by design.
 */
import { z } from "zod";
import { CAPTCHA_PROVIDERS, PROTECTED_FORM_IDS, type CaptchaProvider } from "../vocabulary.js";
import type { GuardPolicy } from "./guard.js";

const envVarName = z.string().regex(/^[A-Z][A-Z0-9_]{1,63}$/, "an environment variable NAME (upper snake case), never the secret itself");

export const DEFAULT_SECRET_ENV: Readonly<Record<Exclude<CaptchaProvider, "none">, string>> = {
  turnstile: "TURNSTILE_SECRET_KEY",
  recaptcha_v2: "RECAPTCHA_SECRET_KEY",
  recaptcha_v3: "RECAPTCHA_SECRET_KEY",
};

export const spamProtectionPolicySchema = z
  .object({
    /** Master switch. `false` is always a violation for a site with public forms. */
    enabled: z.boolean().default(true),
    captcha: z
      .object({
        provider: z.enum(CAPTCHA_PROVIDERS).default("none"),
        /** PUBLIC site key. Required when a provider is chosen. */
        siteKey: z.string().min(1).max(200).optional(),
        /** Name of the env var holding the secret. Defaults per provider. */
        secretEnvVar: envVarName.optional(),
        /** reCAPTCHA v3 only: the minimum score treated as human. */
        minScore: z.number().min(0.1).max(0.9).default(0.5),
        /** A missing token: block, or hold the submission for review. */
        onMissingToken: z.enum(["block", "flag"]).default("block"),
        /** The provider could not be reached: hold for review (default) or block. Never accept. */
        onVerifierError: z.enum(["block", "flag"]).default("flag"),
        /** Load the provider script on first interaction with a form (less cost) or on page load. */
        loadOn: z.enum(["interaction", "page_load"]).default("interaction"),
        /** Forms the CAPTCHA applies to. Empty = every protected form. */
        forms: z.array(z.enum(PROTECTED_FORM_IDS)).default([]),
      })
      // Strict: a pasted `secret` field is refused, never silently stored.
      .strict()
      .default({}),
    honeypot: z
      .object({
        enabled: z.boolean().default(true),
        fieldName: z.string().regex(/^[a-z][a-z0-9_]{2,40}$/).default("contact_website"),
      })
      .default({}),
    timing: z
      .object({
        enabled: z.boolean().default(true),
        minSeconds: z.number().int().min(1).max(15).default(3),
        maxAgeHours: z.number().int().min(1).max(72).default(24),
      })
      .default({}),
    rateLimit: z
      .object({
        enabled: z.boolean().default(true),
        windowSeconds: z.number().int().min(60).max(86_400).default(600),
        maxPerWindow: z.number().int().min(2).max(100).default(5),
      })
      .default({}),
    ipBlocking: z
      .object({
        enabled: z.boolean().default(true),
        violationsBeforeBlock: z.number().int().min(2).max(50).default(5),
        violationWindowSeconds: z.number().int().min(300).max(86_400).default(3_600),
        blockMinutes: z.number().int().min(5).max(1_440).default(60),
      })
      .default({}),
    duplicates: z
      .object({
        enabled: z.boolean().default(true),
        windowSeconds: z.number().int().min(60).max(604_800).default(3_600),
      })
      .default({}),
    content: z
      .object({
        enabled: z.boolean().default(true),
        maxLinks: z.number().int().min(0).max(20).default(2),
        blockedTerms: z.array(z.string().trim().min(2).max(60)).max(200).default([]),
        maxFieldLength: z.number().int().min(100).max(20_000).default(5_000),
      })
      .default({}),
    scoring: z
      .object({
        flagAt: z.number().int().min(1).max(20).default(3),
        blockAt: z.number().int().min(2).max(30).default(6),
      })
      .default({})
      .refine((s) => s.flagAt < s.blockAt, { message: "flagAt must be lower than blockAt" }),
    logging: z
      .object({
        retainDays: z.number().int().min(1).max(365).default(30),
        /** Env var holding the salt IP addresses are hashed with. Raw IPs are never logged. */
        ipHashSaltEnvVar: envVarName.default("FORM_GUARD_IP_SALT"),
      })
      .default({}),
  })
  .strict();

export type SpamProtectionPolicy = z.infer<typeof spamProtectionPolicySchema>;
export type SpamProtectionPolicyDraft = z.input<typeof spamProtectionPolicySchema>;

/** Compile-time proof that the configured policy is exactly what the emitted guard consumes. */
const _policyFitsGuard = (p: SpamProtectionPolicy): GuardPolicy => p;
void _policyFitsGuard;

export const DEFAULT_SPAM_POLICY: SpamProtectionPolicy = spamProtectionPolicySchema.parse({});

export function parseSpamPolicy(value: unknown): SpamProtectionPolicy {
  return spamProtectionPolicySchema.parse(value ?? {});
}

export interface SpamPolicyAssessment {
  /** Settings that would let a public form accept unverified submissions. Must be empty. */
  violations: string[];
  /** Weaker-than-recommended settings: allowed, shown to administrators. */
  warnings: string[];
  /** The server-side checks the policy applies, in evaluation order. */
  checks: string[];
  /** The secret env var a host must provide, or null. */
  captchaSecretEnvVar: string | null;
}

export function captchaAppliesTo(policy: SpamProtectionPolicy, formId: string): boolean {
  if (policy.captcha.provider === "none") return false;
  return policy.captcha.forms.length === 0 || (policy.captcha.forms as string[]).includes(formId);
}

export function assessSpamPolicy(policy: SpamProtectionPolicy): SpamPolicyAssessment {
  const violations: string[] = [];
  const warnings: string[] = [];
  if (!policy.enabled) violations.push("spam protection is disabled; every public form must pass server-side bot checks");
  if (!policy.honeypot.enabled) violations.push("the honeypot is a baseline check and cannot be disabled");
  if (!policy.rateLimit.enabled) violations.push("rate limiting is a baseline check and cannot be disabled");
  if (!policy.duplicates.enabled) violations.push("duplicate-submission prevention is a baseline check and cannot be disabled");
  if (policy.captcha.provider !== "none" && !policy.captcha.siteKey) {
    violations.push(`CAPTCHA provider "${policy.captcha.provider}" is selected but no site key is configured`);
  }

  if (policy.captcha.provider === "none") {
    warnings.push("no CAPTCHA provider: protection relies on the honeypot, timing, rate limiting, duplicate and content checks");
  } else if (policy.captcha.onMissingToken === "block") {
    warnings.push("visitors with JavaScript disabled cannot obtain a CAPTCHA token; each protected form shows them a direct contact alternative");
  }
  if (!policy.timing.enabled) warnings.push("the minimum fill-time check is off; fast scripted submissions rely on other signals");
  if (!policy.ipBlocking.enabled) warnings.push("temporary IP blocking is off; repeated offenders are only rate limited");
  if (!policy.content.enabled) warnings.push("content checks (links, blocked terms) are off; link spam relies on other signals");

  const checks = [
    "server-side field validation against the form contract",
    ...(policy.ipBlocking.enabled ? ["temporary IP block"] : []),
    "honeypot",
    "rate limit",
    "duplicate submission",
    ...(policy.timing.enabled ? ["minimum fill time"] : []),
    ...(policy.content.enabled ? ["content heuristics"] : []),
    ...(policy.captcha.provider !== "none" ? [`${policy.captcha.provider} token verification`] : []),
    "suspicion scoring (flag or block)",
  ];
  const captchaSecretEnvVar =
    policy.captcha.provider === "none" ? null : policy.captcha.secretEnvVar ?? DEFAULT_SECRET_ENV[policy.captcha.provider];
  return { violations, warnings, checks, captchaSecretEnvVar };
}
