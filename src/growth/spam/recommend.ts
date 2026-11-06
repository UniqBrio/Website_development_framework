/**
 * FORM PROTECTION RECOMMENDATIONS — which public forms need which protection.
 *
 * The inventory is read from the page model (conversion sections), the stated
 * functionality (contact form, newsletter, accounts) and the enabled guest tools
 * (event registration). A form the generator renders is protected automatically
 * once its endpoint is configured; a form the HOST builds (a newsletter box, a
 * registration page) is recommended with the exact guard call it needs.
 */
import type { BusinessInput } from "../../design-intelligence/types/business-input.js";
import type { PageSpec } from "../../generation/page-spec.js";
import { CONVERSION_KINDS } from "../../generation/form-contracts.js";
import { clampScore, priorityFrom, resolveStatus, type GrowthConfiguration, type Recommendation } from "../recommendations.js";
import { slugify } from "../academy.js";
import { assessSpamPolicy, type SpamProtectionPolicy } from "./policy.js";

export interface ProtectedFormEntry {
  formId: string;
  routes: string[];
  source: "generated" | "host_form";
  endpoint: "configured" | "unconfigured" | "host_form";
  risk: "standard" | "elevated";
  riskReasons: string[];
}

const FREE_TEXT: Record<string, string> = {
  enquiry: "free-text message field (link spam)",
  booking: "free-text notes field and a requested date (fake bookings)",
  contact: "free-text message field (link spam)",
  event_registration: "registrations are capacity-limited (fake sign-ups crowd out real ones)",
  newsletter: "an email-only form can be abused to sign up third parties (list bombing)",
  registration: "account or registration creation (fake accounts)",
  signup: "an email-only form can be abused to sign up third parties",
  checkout: "order requests with delivery addresses (fraudulent orders)",
};

export function formInventory(input: BusinessInput, pages: readonly PageSpec[], formEndpoints: Readonly<Partial<Record<string, string>>>, configuration?: GrowthConfiguration): ProtectedFormEntry[] {
  const out: ProtectedFormEntry[] = [];
  for (const kind of CONVERSION_KINDS) {
    const routes = pages.filter((p) => p.requiredSections.includes(kind)).map((p) => p.route);
    if (routes.length === 0) continue;
    out.push({
      formId: kind,
      routes,
      source: "generated",
      endpoint: typeof formEndpoints[kind] === "string" ? "configured" : "unconfigured",
      risk: kind === "enquiry" || kind === "booking" || kind === "checkout" ? "elevated" : "standard",
      riskReasons: [FREE_TEXT[kind] ?? "public form"],
    });
  }
  const host = (formId: string, risk: ProtectedFormEntry["risk"]) => {
    if (out.some((f) => f.formId === formId)) return;
    out.push({ formId, routes: [], source: "host_form", endpoint: "host_form", risk, riskReasons: [FREE_TEXT[formId] ?? "public form"] });
  };
  if (input.requiredFunctionality.includes("contact_form") && !out.some((f) => f.formId === "enquiry")) host("contact", "elevated");
  if (input.requiredFunctionality.includes("newsletter")) host("newsletter", "elevated");
  if (input.requiredFunctionality.includes("account") || input.requiredFunctionality.includes("authentication")) host("registration", "elevated");
  if (configuration?.guestTools.events_workshops?.enabled) host("event_registration", "elevated");
  return out;
}

export function recommendFormProtection(
  forms: readonly ProtectedFormEntry[],
  policy: SpamProtectionPolicy,
  configuration?: GrowthConfiguration,
): Recommendation[] {
  const assessment = assessSpamPolicy(policy);
  const out: Recommendation[] = [];
  const rec = (r: Omit<Recommendation, "area" | "keywords" | "seoOpportunity" | "status" | "statusBasis" | "statusNote" | "priority"> & { implemented: { implemented: boolean; note: string | null } }): Recommendation => {
    const { implemented, ...rest } = r;
    return {
      ...rest,
      area: "spam_protection",
      seoOpportunity: null,
      keywords: { primary: null, secondary: [], basis: "derived_from_academy_facts", searchVolume: "not_measured" },
      priority: priorityFrom(r.priorityScore),
      ...resolveStatus(r.id, implemented, configuration),
    };
  };

  for (const f of forms) {
    const checks = assessment.checks;
    const score = clampScore((f.risk === "elevated" ? 75 : 60) + (f.endpoint === "configured" || f.endpoint === "host_form" ? 10 : 0));
    const generatedLive = f.source === "generated" && f.endpoint === "configured" && assessment.violations.length === 0;
    out.push(rec({
      id: `spam:form:${f.formId}`,
      title: f.source === "generated" ? `Protect the ${f.formId.replace(/_/g, " ")} form${f.routes.length ? ` on ${f.routes.join(", ")}` : ""}` : `Guard the host-built ${f.formId.replace(/_/g, " ")} form`,
      why: `${f.riskReasons.join("; ")}. ${f.source === "generated" ? "The generated form carries the honeypot and timing fields; the endpoint that receives it must run the guard server-side." : "The framework does not render this form, so its handler must call the guard itself."}`,
      targetAudience: ["administrators", "the developer who owns the form endpoint"],
      businessBenefit: "Only real enquiries reach the academy: no time lost on fake leads, no polluted contact lists, no sender-reputation damage from bot sign-ups.",
      priorityScore: score,
      priorityFactors: [`base ${f.risk === "elevated" ? 75 : 60} (${f.risk} risk)`, ...(f.endpoint !== "unconfigured" ? ["+10 accepts submissions"] : [])],
      evidence: [`form: ${f.formId} (${f.source})`, `endpoint: ${f.endpoint}`],
      implemented: generatedLive
        ? { implemented: true, note: "protection markup and guard emitted; the host endpoint must apply the guard (probe evidence at Phase 5)" }
        : { implemented: false, note: null },
      detail: { kind: "form_protection", formId: f.formId, routes: f.routes, risk: f.risk, riskReasons: f.riskReasons, checks, endpoint: f.endpoint },
    }));
  }

  const elevated = forms.filter((f) => f.risk === "elevated");
  if (elevated.length > 0) {
    out.push(rec({
      id: "spam:captcha",
      title: `Add Cloudflare Turnstile to the ${elevated.map((f) => f.formId.replace(/_/g, " ")).join(", ")} form${elevated.length === 1 ? "" : "s"}`,
      why: "These forms carry free text or create contacts, which is what spam bots target. Turnstile runs mostly invisibly (no picture puzzles for most visitors), loads only when a visitor starts filling a form, and is verified server-side by the guard. reCAPTCHA v2/v3 are configurable alternatives.",
      targetAudience: ["administrators"],
      businessBenefit: "Stops scripted submissions that slip past the honeypot, without adding friction for most real visitors.",
      priorityScore: clampScore(55 + elevated.length * 5),
      priorityFactors: ["base 55", `+${elevated.length * 5} elevated-risk forms`],
      evidence: [`captcha.provider = ${policy.captcha.provider}`],
      implemented: policy.captcha.provider !== "none" && Boolean(policy.captcha.siteKey)
        ? { implemented: true, note: `${policy.captcha.provider} configured` }
        : { implemented: false, note: null },
      detail: { kind: "form_protection", formId: "all", routes: elevated.flatMap((f) => f.routes), risk: "elevated", riskReasons: elevated.flatMap((f) => f.riskReasons), checks: ["CAPTCHA token verification"], endpoint: "configured" },
    }));
  }

  const live = forms.filter((f) => f.endpoint !== "unconfigured");
  if (live.length > 0) {
    out.push(rec({
      id: "spam:shared-store",
      title: "Back the form guard with shared storage in production",
      why: "Rate limits, duplicate checks and temporary IP blocks need counters that every server instance sees. The in-memory store resets per instance, which on serverless hosting silently weakens all three.",
      targetAudience: ["the developer who owns the form endpoints"],
      businessBenefit: "Throttling and blocking keep working under real traffic, not just in a single test process.",
      priorityScore: 70,
      priorityFactors: ["base 70: baseline checks depend on it"],
      evidence: [`${live.length} form(s) accept submissions`],
      implemented: { implemented: false, note: null },
      detail: { kind: "form_protection", formId: "all", routes: live.flatMap((f) => f.routes), risk: "standard", riskReasons: ["multi-instance hosting"], checks: ["rate limit", "duplicate submission", "temporary IP block"], endpoint: "configured" },
    }));
  }
  if (forms.some((f) => f.formId === "newsletter")) {
    out.push(rec({
      id: "spam:newsletter-double-opt-in",
      title: "Confirm newsletter sign-ups by email (double opt-in)",
      why: "A bot can sign up any address; only a confirmation link proves the person owns it. The guard filters bots, double opt-in filters third-party abuse.",
      targetAudience: ["administrators"],
      businessBenefit: "A clean mailing list and protected sender reputation.",
      priorityScore: 60,
      priorityFactors: ["base 60: newsletter abuse"],
      evidence: ["requiredFunctionality includes newsletter"],
      implemented: { implemented: false, note: null },
      detail: { kind: "form_protection", formId: "newsletter", routes: [], risk: "elevated", riskReasons: [FREE_TEXT["newsletter"]!], checks: ["double opt-in"], endpoint: "host_form" },
    }));
  }
  for (const warning of assessment.warnings) {
    if (warning.startsWith("no CAPTCHA") || warning.startsWith("visitors with JavaScript")) continue;
    out.push(rec({
      id: `spam:policy:${slugify(warning.split(";")[0] ?? warning).slice(0, 48)}`,
      title: `Re-enable a recommended check: ${warning.split(";")[0]}`,
      why: sentenceOf(warning),
      targetAudience: ["administrators"],
      businessBenefit: "Defence in depth: each check catches bots the others miss.",
      priorityScore: 45,
      priorityFactors: ["base 45: weaker than recommended policy"],
      evidence: ["spam protection policy"],
      implemented: { implemented: false, note: null },
      detail: { kind: "form_protection", formId: "all", routes: [], risk: "standard", riskReasons: [warning], checks: [], endpoint: "configured" },
    }));
  }
  return out.sort((a, b) => b.priorityScore - a.priorityScore || a.id.localeCompare(b.id));
}

function sentenceOf(t: string): string {
  return `${t[0]!.toUpperCase()}${t.slice(1)}.`;
}
