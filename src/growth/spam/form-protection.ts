/**
 * FORM PROTECTION CONTRACT — how the spam policy attaches to a generated form.
 *
 * Every form contract whose endpoint is CONFIGURED carries a `FormProtection`.
 * The renderers read it to add the honeypot, the timing and form-id fields and,
 * when configured, the CAPTCHA slot; the Next emitter writes the guard module and
 * `forms/protection.json` the host route handler must apply. An unconfigured form
 * cannot submit, so it carries none.
 *
 * `validateFormProtection()` is the enforcement half of the security invariant:
 * the generator refuses to emit a configured public form without protection, or
 * under a policy that disables a baseline check.
 */
import type { FormContract } from "../../generation/form-contracts.js";
import { GUARD_FIELDS, type GuardConfig } from "./guard.js";
import { assessSpamPolicy, captchaAppliesTo, DEFAULT_SPAM_POLICY, type SpamProtectionPolicy } from "./policy.js";

export const FORM_GUARD_MODULE = "lib/form-guard.ts";
export const FORM_PROTECTION_CONFIG = "forms/protection.json";
export const FORM_PROTECTION_RUNTIME_PATH = "/form-protection.js";

export interface FormProtection {
  formId: string;
  honeypotField: string;
  formIdField: string;
  startedField: string;
  captcha: {
    provider: "turnstile" | "recaptcha_v2" | "recaptcha_v3";
    siteKey: string;
    loadOn: "interaction" | "page_load";
    tokenField: string;
  } | null;
  /** The server-side checks the host endpoint applies, in order. */
  serverChecks: string[];
  guardModule: string;
  config: string;
  /** Shown only without JavaScript, when a required CAPTCHA token cannot be obtained. */
  noScriptNotice: string | null;
}

export function protectionFor(formId: string, policy: SpamProtectionPolicy = DEFAULT_SPAM_POLICY): FormProtection {
  const assessment = assessSpamPolicy(policy);
  const captcha =
    captchaAppliesTo(policy, formId) && policy.captcha.provider !== "none" && policy.captcha.siteKey
      ? {
          provider: policy.captcha.provider,
          siteKey: policy.captcha.siteKey,
          loadOn: policy.captcha.loadOn,
          tokenField: policy.captcha.provider === "turnstile" ? GUARD_FIELDS.turnstileToken : GUARD_FIELDS.recaptchaToken,
        }
      : null;
  return {
    formId,
    honeypotField: policy.honeypot.fieldName,
    formIdField: GUARD_FIELDS.formId,
    startedField: GUARD_FIELDS.started,
    captcha,
    serverChecks: assessment.checks,
    guardModule: FORM_GUARD_MODULE,
    config: FORM_PROTECTION_CONFIG,
    noScriptNotice:
      captcha && policy.captcha.onMissingToken === "block"
        ? "This form uses a spam check that needs JavaScript. If you cannot turn JavaScript on, please contact us directly instead."
        : null,
  };
}

/** The data the emitted guard consumes: the policy and every protected form's fields. */
export function guardConfigFor(contracts: readonly FormContract[], policy: SpamProtectionPolicy): GuardConfig {
  const forms: GuardConfig["forms"] = {};
  for (const c of contracts) {
    if (!c.protection) continue;
    forms[c.protection.formId] = {
      fields: c.fields.map((f) => ({
        name: f.name,
        type: f.type,
        required: f.required,
        ...(f.min !== undefined ? { min: f.min } : {}),
        ...(f.options ? { options: f.options } : {}),
      })),
    };
  }
  return { policy, forms };
}

export interface FormProtectionViolation {
  page: string;
  form: string;
  problem: string;
}

/**
 * Refuse a configured public form that a bot could submit without server-side
 * verification: no protection contract, or a policy with a baseline check off.
 */
export function validateFormProtection(
  forms: ReadonlyArray<{ page: string; contract: FormContract }>,
  policy: SpamProtectionPolicy,
): FormProtectionViolation[] {
  const out: FormProtectionViolation[] = [];
  const policyViolations = assessSpamPolicy(policy).violations;
  for (const { page, contract } of forms) {
    if (contract.endpoint.state !== "configured") continue;
    if (!contract.protection) {
      out.push({ page, form: contract.kind, problem: "configured public form has no spam protection contract" });
      continue;
    }
    for (const v of policyViolations) out.push({ page, form: contract.kind, problem: v });
  }
  return out;
}
