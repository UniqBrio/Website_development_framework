/**
 * GROWTH CONSOLE — the administrator surface for the growth & protection report.
 *
 * A server-rendered HTML document (no framework, no client JavaScript required)
 * that a host serves BEHIND its own authentication, never on the public site:
 * it carries `noindex, nofollow`, and `generateGrowthConsole()` writes it under
 * `growth/`, outside both deployable layers (`static/`, `next/`).
 *
 * Design system: colours, type, spacing and radii are the SITE'S OWN generated
 * tokens (`tokensBlock`), and every component consumes L2 semantic tokens only —
 * the same build rule as the website (color_system.md). Layout is one fluid grid
 * (cards reflow from one column at 320 px to several on desktop); tables scroll
 * inside a labelled, focusable region rather than widening the page.
 *
 * Role-based: the viewer's role decides which controls render (access.ts). A
 * control is a plain POST form to the host's `actionEndpoint`, which must apply
 * `applyGrowthAction()` — the authority — with the authenticated actor. Without
 * an endpoint, controls render disabled with a note; nothing pretends to save.
 */
import type { DesignTokenContract } from "../design-system/tokens/token-contract.js";
import { tokensBlock } from "../generation/render/css.js";
import { authorize, permissionForArea, type GrowthActor } from "./access.js";
import { availableVerbs, type Recommendation } from "./recommendations.js";
import type { GrowthReport } from "./report.js";
import type { SecurityEvent } from "./spam/guard.js";
import { CAPTCHA_PROVIDERS, GUEST_TOOL_PLACEMENTS, type RecommendationArea } from "./vocabulary.js";

export interface ConsoleOptions {
  viewer: GrowthActor;
  /** The site's generated design tokens (output.tokens). */
  tokens: DesignTokenContract;
  /** Host endpoint that applies `applyGrowthAction()`. Absent = controls disabled. */
  actionEndpoint?: string;
  /** Recent security events from the host's GuardStore, newest first. */
  securityEvents?: readonly SecurityEvent[];
  lang?: string;
}

const STATUS_LABEL = { recommended: "Recommended", pending: "Pending", implemented: "Implemented", dismissed: "Dismissed" } as const;
const PRIORITY_LABEL = { high: "High priority", medium: "Medium priority", low: "Low priority" } as const;
const VERB_LABEL = { accept: "Accept", dismiss: "Dismiss", mark_implemented: "Mark implemented", reopen: "Reopen" } as const;
const AREA: Record<RecommendationArea, { id: string; title: string; intro: string }> = {
  guest_engagement: { id: "guest-engagement", title: "Guest engagement tools", intro: "Free tools visitors can use without registering. Enable a tool to record your intent; it goes live through its delivery mechanism once it is ready." },
  resource: { id: "resources", title: "Resources to add", intro: "Free, ungated resources that answer visitors' questions and attract organic traffic." },
  blog: { id: "blogs", title: "Blogs to publish", intro: "Specific posts this site does not yet have, each with keywords, meta title, meta description and URL." },
  seo_improvement: { id: "seo-improvements", title: "SEO improvements", intro: "Missing content, landing pages, location content, structured data and internal links." },
  spam_protection: { id: "spam-protection", title: "Spam & bot protection", intro: "Every public form is verified server-side. These are the forms and settings that need attention." },
};

function esc(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const STYLES = `
*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; background: var(--color-bg-0); color: var(--color-fg-0); font-family: var(--font-body); line-height: var(--leading-body, 1.5); }
h1, h2, h3 { font-family: var(--font-heading); line-height: 1.2; }
a { color: var(--color-accent-1-text); }
:focus-visible { outline: 3px solid var(--color-focus-ring); outline-offset: 2px; }
.g-skip { position: absolute; left: -9999px; }
.g-skip:focus { left: var(--space-3); top: var(--space-3); background: var(--color-bg-1); color: var(--color-fg-0); padding: var(--space-3); z-index: 10; }
.g-shell { max-inline-size: 76rem; margin-inline: auto; padding-inline: max(16px, var(--space-4)); padding-block: var(--space-5); }
.g-header { display: flex; flex-wrap: wrap; gap: var(--space-3); align-items: baseline; justify-content: space-between; border-block-end: 1px solid var(--color-divider); padding-block-end: var(--space-4); }
.g-header h1 { margin: 0; font-size: var(--text-h2, 1.75rem); }
.g-meta { color: var(--color-fg-1); margin: 0; }
.g-nav { position: sticky; top: 0; z-index: 5; background: var(--color-bg-0); border-block-end: 1px solid var(--color-divider); }
.g-nav ul { display: flex; gap: var(--space-2); overflow-x: auto; list-style: none; margin: 0; padding: var(--space-2) 0; }
.g-nav a { display: inline-flex; align-items: center; min-block-size: 44px; padding-inline: var(--space-3); border-radius: var(--radius-md); white-space: nowrap; text-decoration: none; }
.g-nav a:hover { background: var(--color-bg-1); }
.g-section { padding-block: var(--space-5); border-block-end: 1px solid var(--color-divider); }
.g-section > p { max-inline-size: 70ch; color: var(--color-fg-1); }
.g-tiles { display: grid; gap: var(--space-3); grid-template-columns: repeat(auto-fit, minmax(min(100%, 11rem), 1fr)); list-style: none; padding: 0; }
.g-tile { background: var(--color-bg-1); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-4); }
.g-tile strong { display: block; font-size: var(--text-h3, 1.5rem); }
.g-grid { display: grid; gap: var(--space-4); grid-template-columns: repeat(auto-fill, minmax(min(100%, 22rem), 1fr)); list-style: none; padding: 0; margin: 0; }
.g-card { display: flex; flex-direction: column; gap: var(--space-3); background: var(--color-bg-1); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-4); min-inline-size: 0; }
.g-card h3 { margin: 0; font-size: var(--text-h4, 1.125rem); overflow-wrap: anywhere; }
.g-badges { display: flex; flex-wrap: wrap; gap: var(--space-2); margin: 0; padding: 0; list-style: none; }
.g-badge { display: inline-block; border: 1px solid currentColor; border-radius: var(--radius-sm); padding: 0 var(--space-2); font-size: var(--text-small, 0.875rem); font-weight: 600; }
.g-badge[data-priority="high"] { background: var(--color-error-bg); color: var(--color-error-on); }
.g-badge[data-priority="medium"] { background: var(--color-warning-bg); color: var(--color-warning-on); }
.g-badge[data-priority="low"] { background: var(--color-bg-2); color: var(--color-fg-0); }
.g-badge[data-status="recommended"] { background: var(--color-info-bg); color: var(--color-info-on); }
.g-badge[data-status="pending"] { background: var(--color-warning-bg); color: var(--color-warning-on); }
.g-badge[data-status="implemented"] { background: var(--color-success-bg); color: var(--color-success-on); }
.g-badge[data-status="dismissed"] { background: var(--color-bg-2); color: var(--color-fg-1); }
.g-facts { display: grid; gap: var(--space-2); margin: 0; }
.g-facts dt { font-weight: 600; }
.g-facts dd { margin: 0 0 var(--space-2); overflow-wrap: anywhere; }
.g-kw { display: flex; flex-wrap: wrap; gap: var(--space-2); list-style: none; padding: 0; margin: 0; }
.g-kw li { background: var(--color-bg-2); border-radius: var(--radius-sm); padding: 0 var(--space-2); }
.g-note { color: var(--color-fg-1); font-size: var(--text-small, 0.875rem); }
details > summary { cursor: pointer; min-block-size: 44px; display: flex; align-items: center; font-weight: 600; }
.g-actions { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: flex-end; margin-block-start: auto; }
.g-actions label { display: block; font-weight: 600; inline-size: 100%; }
.g-actions textarea, .g-actions input[type="text"], .g-actions select, .g-settings input:not([type="checkbox"]), .g-settings select {
  inline-size: 100%; min-block-size: 44px; padding: var(--space-2); font: inherit;
  background: var(--color-bg-0); color: var(--color-fg-0); border: 1px solid var(--color-border); border-radius: var(--radius-sm);
}
button { min-block-size: 44px; padding: var(--space-2) var(--space-4); font: inherit; border: 1px solid var(--color-accent-1); border-radius: var(--radius-md); background: var(--color-accent-1); color: var(--color-accent-1-on); cursor: pointer; }
button:hover { background: var(--color-accent-1-hover); }
button.g-secondary { background: var(--color-bg-0); color: var(--color-accent-1-text); }
button:disabled { background: var(--color-accent-1-disabled); color: var(--color-fg-1); border-color: var(--color-border); cursor: not-allowed; }
.g-alert { border-inline-start: 4px solid var(--color-error); background: var(--color-error-bg); color: var(--color-error-on); padding: var(--space-3) var(--space-4); }
.g-warn { border-inline-start: 4px solid var(--color-warning); background: var(--color-warning-bg); color: var(--color-warning-on); padding: var(--space-3) var(--space-4); }
.g-ok { border-inline-start: 4px solid var(--color-success); background: var(--color-success-bg); color: var(--color-success-on); padding: var(--space-3) var(--space-4); }
.g-scroll { overflow-x: auto; max-inline-size: 100%; }
table { border-collapse: collapse; min-inline-size: 100%; }
th, td { text-align: start; padding: var(--space-2) var(--space-3); border-block-end: 1px solid var(--color-divider); vertical-align: top; }
.g-filter { display: flex; flex-wrap: wrap; gap: var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-3); }
.g-filter label { display: inline-flex; gap: var(--space-2); align-items: center; min-block-size: 44px; }
.g-settings { display: grid; gap: var(--space-3); grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr)); }
.g-settings fieldset { border: 1px solid var(--color-border); border-radius: var(--radius-md); min-inline-size: 0; }
.g-settings label:has(input[type="checkbox"]), .g-actions label:has(input[type="checkbox"]) { display: flex; gap: var(--space-2); align-items: center; min-block-size: 44px; }
input[type="checkbox"], input[type="radio"] { inline-size: 1.25rem; block-size: 1.25rem; accent-color: var(--color-accent-1); }
/* Status filter: pure CSS. Without :has() support every card stays visible. */
body:has(#f-recommended:checked) .g-card:not([data-status="recommended"]),
body:has(#f-pending:checked) .g-card:not([data-status="pending"]),
body:has(#f-implemented:checked) .g-card:not([data-status="implemented"]),
body:has(#f-dismissed:checked) .g-card:not([data-status="dismissed"]),
body:has(#f-high:checked) .g-card:not([data-priority="high"]) { display: none; }
@media (prefers-reduced-motion: no-preference) { html { scroll-behavior: smooth; } }
@media (forced-colors: active) { .g-badge, .g-card, .g-tile { border-color: CanvasText; } }
`;

function controlsFor(r: Recommendation, opts: ConsoleOptions): string {
  const auth = authorize(opts.viewer, permissionForArea(r.area));
  if (!auth.allowed) return `<p class="g-note">Read-only: ${esc(auth.reason)}.</p>`;
  const verbs = availableVerbs(r.status);
  const disabled = opts.actionEndpoint ? "" : " disabled";
  const action = opts.actionEndpoint ? ` action="${esc(opts.actionEndpoint)}" method="post"` : "";
  const noteId = `note-${r.id.replace(/[^a-z0-9]+/gi, "-")}`;
  const buttons = verbs
    .map((v) => `<button type="submit" name="verb" value="${v}"${v === "dismiss" || v === "reopen" ? ' class="g-secondary"' : ""}${disabled}>${VERB_LABEL[v]}</button>`)
    .join("");
  const dismissNote = verbs.includes("dismiss")
    ? `<label for="${noteId}">Reason (required to dismiss)</label><textarea id="${noteId}" name="note" rows="2"${disabled}></textarea>`
    : "";
  return `<form class="g-actions"${action}><input type="hidden" name="type" value="recommendation"><input type="hidden" name="id" value="${esc(r.id)}">${dismissNote}${buttons}</form>${
    opts.actionEndpoint ? "" : '<p class="g-note">No console endpoint is configured; actions are applied with <code>applyGrowthAction()</code>.</p>'
  }`;
}

function briefFor(r: Recommendation, opts: ConsoleOptions): string {
  const d = r.detail;
  const rows: Array<[string, string]> = [];
  if (d.kind === "blog") {
    rows.push(["Meta title", `${esc(d.metaTitle)} <span class="g-note">(${d.metaTitle.length} characters)</span>`]);
    rows.push(["Meta description", `${esc(d.metaDescription)} <span class="g-note">(${d.metaDescription.length} characters)</span>`]);
    rows.push(["Suggested URL", `<code>${esc(d.suggestedUrl)}</code>`]);
    rows.push(["Search intent", `${esc(d.searchIntent)} · ${esc(d.funnelStage)} stage`]);
    rows.push(["Internal links", d.internalLinks.length ? d.internalLinks.map((l) => `<code>${esc(l)}</code>`).join(", ") : "none yet — create the target page"]);
    rows.push(["Outline", `<ol>${d.outline.map((o) => `<li>${esc(o)}</li>`).join("")}</ol>`]);
  } else if (d.kind === "resource") {
    rows.push(["Format", esc(d.format)], ["Suggested URL", `<code>${esc(d.suggestedUrl)}</code>`], ["Access", "free, no registration"]);
    if (d.internalLinks.length) rows.push(["Links to", d.internalLinks.map((l) => `<code>${esc(l)}</code>`).join(", ")]);
  } else if (d.kind === "guest_tool") {
    rows.push(["Readiness", esc(d.readiness.replace(/_/g, " "))]);
    if (d.blockers.length) rows.push(["Before it can go live", `<ul>${d.blockers.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`]);
    rows.push(["Delivered by", esc(d.deliveredBy)]);
    rows.push(["Registration", d.registration === "none" ? "none — free to use" : "contact details only to book"]);
    rows.push(["Expected impact", `engagement ${d.impact.engagement}, lead generation ${d.impact.leadGeneration}, footfall ${d.impact.footfall}`]);
    if (d.engagementVerdict) rows.push(["Engagement decision", esc(d.engagementVerdict)]);
  } else if (d.kind === "seo_improvement") {
    rows.push(["Type", esc(d.improvement.replace(/_/g, " "))], ["Target", `<code>${esc(d.target)}</code>`], ["Steps", `<ol>${d.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>`]);
  } else {
    rows.push(["Risk", `${esc(d.risk)}: ${esc(d.riskReasons.join("; "))}`]);
    if (d.routes.length) rows.push(["Pages", d.routes.map((x) => `<code>${esc(x)}</code>`).join(", ")]);
    rows.push(["Endpoint", esc(d.endpoint.replace(/_/g, " "))]);
    if (d.checks.length) rows.push(["Server-side checks", esc(d.checks.join(", "))]);
  }
  rows.push(["Why this priority", `<ul>${r.priorityFactors.map((f) => `<li>${esc(f)}</li>`).join("")}</ul><p class="g-note">A prioritisation heuristic (${r.priorityScore}/100), not a traffic prediction.</p>`]);
  void opts;
  return `<details><summary>Details</summary><dl class="g-facts">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl></details>`;
}

function toolControls(r: Recommendation, opts: ConsoleOptions): string {
  if (r.detail.kind !== "guest_tool") return "";
  const auth = authorize(opts.viewer, "guest_tools.configure");
  if (!auth.allowed) return "";
  const c = r.detail.configuration;
  const disabled = opts.actionEndpoint ? "" : " disabled";
  const action = opts.actionEndpoint ? ` action="${esc(opts.actionEndpoint)}" method="post"` : "";
  const base = `tool-${r.detail.toolId}`;
  return `<form class="g-actions"${action}><input type="hidden" name="type" value="guest_tool"><input type="hidden" name="toolId" value="${r.detail.toolId}"><label for="${base}-enabled"><input id="${base}-enabled" type="checkbox" name="enabled" value="true"${c.enabled ? " checked" : ""}${disabled}> Enabled on the website</label><label for="${base}-placement">Placement</label><select id="${base}-placement" name="placement"${disabled}>${GUEST_TOOL_PLACEMENTS.map((p) => `<option value="${p}"${p === c.placement ? " selected" : ""}>${p.replace(/_/g, " ")}</option>`).join("")}</select><button type="submit"${disabled}>Save tool settings</button></form>`;
}

function card(r: Recommendation, opts: ConsoleOptions): string {
  const kw = r.keywords.primary
    ? `<dt>Suggested keywords</dt><dd><ul class="g-kw"><li><strong>${esc(r.keywords.primary)}</strong></li>${r.keywords.secondary.map((k) => `<li>${esc(k)}</li>`).join("")}</ul><span class="g-note">Derived from the academy's facts; search volume not measured — validate before publishing.</span></dd>`
    : "";
  return `<li class="g-card" data-status="${r.status}" data-priority="${r.priority}" id="${esc(r.id.replace(/[^a-z0-9]+/gi, "-"))}">
<h3>${esc(r.title)}</h3>
<ul class="g-badges"><li class="g-badge" data-priority="${r.priority}">${PRIORITY_LABEL[r.priority]}</li><li class="g-badge" data-status="${r.status}">${STATUS_LABEL[r.status]}</li></ul>
${r.statusNote ? `<p class="g-note">${esc(r.statusNote)}</p>` : ""}
<dl class="g-facts"><dt>Why it is recommended</dt><dd>${esc(r.why)}</dd><dt>Target audience</dt><dd>${esc(r.targetAudience.join("; "))}</dd>${
    r.seoOpportunity ? `<dt>SEO opportunity</dt><dd>${esc(r.seoOpportunity)}</dd>` : ""
  }${kw}<dt>Expected business benefit</dt><dd>${esc(r.businessBenefit)}</dd></dl>
${briefFor(r, opts)}
${toolControls(r, opts)}
${controlsFor(r, opts)}
</li>`;
}

function areaSection(area: RecommendationArea, items: readonly Recommendation[], opts: ConsoleOptions, extra = ""): string {
  const a = AREA[area];
  return `<section class="g-section" id="${a.id}" aria-labelledby="${a.id}-h"><h2 id="${a.id}-h">${a.title} <span class="g-note">(${items.length})</span></h2><p>${a.intro}</p>${extra}${
    items.length ? `<ul class="g-grid">${items.map((r) => card(r, opts)).join("\n")}</ul>` : '<p class="g-note">Nothing to recommend here yet.</p>'
  }</section>`;
}

function spamSettings(report: GrowthReport, opts: ConsoleOptions): string {
  const { policy, assessment, forms } = report.spamProtection;
  const parts: string[] = [];
  parts.push(
    assessment.violations.length
      ? `<div class="g-alert" role="alert"><p><strong>Public forms cannot be published under this policy:</strong></p><ul>${assessment.violations.map((v) => `<li>${esc(v)}</li>`).join("")}</ul></div>`
      : `<div class="g-ok"><p>Every protected form is verified server-side: ${esc(assessment.checks.join(", "))}.</p></div>`,
  );
  if (assessment.warnings.length) parts.push(`<div class="g-warn"><ul>${assessment.warnings.map((w) => `<li>${esc(w)}</li>`).join("")}</ul></div>`);
  parts.push(`<h3>Protected forms</h3><div class="g-scroll" role="region" aria-label="Protected forms" tabindex="0"><table><caption class="g-note">Forms this site publishes or the host must guard</caption><thead><tr><th scope="col">Form</th><th scope="col">Pages</th><th scope="col">Built by</th><th scope="col">Endpoint</th><th scope="col">Risk</th></tr></thead><tbody>${
    forms.map((f) => `<tr><td>${esc(f.formId.replace(/_/g, " "))}</td><td>${f.routes.map((r) => `<code>${esc(r)}</code>`).join(", ") || "—"}</td><td>${f.source === "generated" ? "generated site" : "host"}</td><td>${esc(f.endpoint.replace(/_/g, " "))}</td><td>${esc(f.risk)}</td></tr>`).join("") || '<tr><td colspan="5">No public forms.</td></tr>'
  }</tbody></table></div>`);

  const can = authorize(opts.viewer, "spam_protection.configure");
  const disabled = can.allowed && opts.actionEndpoint ? "" : " disabled";
  const action = opts.actionEndpoint ? ` action="${esc(opts.actionEndpoint)}" method="post"` : "";
  const num = (id: string, label: string, value: number, min: number, max: number) =>
    `<p><label for="sp-${id}">${label}</label><input id="sp-${id}" name="${id}" type="number" inputmode="numeric" min="${min}" max="${max}" value="${value}"${disabled}></p>`;
  const toggle = (id: string, label: string, on: boolean, baseline: boolean) =>
    `<p><label for="sp-${id}"><input id="sp-${id}" name="${id}" type="checkbox" value="true"${on ? " checked" : ""}${baseline ? " disabled" : disabled}> ${label}${baseline ? ' <span class="g-note">(baseline — always on)</span>' : ""}</label></p>`;
  parts.push(`<h3>Settings</h3>${
    can.allowed ? "" : `<p class="g-note">Read-only: ${esc(can.reason)}. Only owners and administrators change security settings.</p>`
  }<form class="g-settings"${action}><input type="hidden" name="type" value="spam_protection">
<fieldset><legend>CAPTCHA</legend><p><label for="sp-provider">Provider</label><select id="sp-provider" name="captcha.provider"${disabled}>${CAPTCHA_PROVIDERS.map((p) => `<option value="${p}"${p === policy.captcha.provider ? " selected" : ""}>${p === "none" ? "None" : p === "turnstile" ? "Cloudflare Turnstile" : p === "recaptcha_v2" ? "Google reCAPTCHA v2" : "Google reCAPTCHA v3"}</option>`).join("")}</select></p><p><label for="sp-sitekey">Site key (public)</label><input id="sp-sitekey" name="captcha.siteKey" type="text" autocomplete="off" value="${esc(policy.captcha.siteKey ?? "")}"${disabled}></p><p class="g-note">The secret key is never entered here: set it in the host environment as <code>${esc(assessment.captchaSecretEnvVar ?? "TURNSTILE_SECRET_KEY")}</code>.</p></fieldset>
<fieldset><legend>Checks</legend>${toggle("honeypot.enabled", "Honeypot field", policy.honeypot.enabled, true)}${toggle("rateLimit.enabled", "Rate limiting", policy.rateLimit.enabled, true)}${toggle("duplicates.enabled", "Duplicate prevention", policy.duplicates.enabled, true)}${toggle("timing.enabled", "Minimum fill time", policy.timing.enabled, false)}${toggle("ipBlocking.enabled", "Temporary IP blocking", policy.ipBlocking.enabled, false)}${toggle("content.enabled", "Content checks (links, blocked terms)", policy.content.enabled, false)}</fieldset>
<fieldset><legend>Throttling</legend>${num("rateLimit.maxPerWindow", "Submissions allowed per source", policy.rateLimit.maxPerWindow, 2, 100)}${num("rateLimit.windowSeconds", "Per window (seconds)", policy.rateLimit.windowSeconds, 60, 86400)}${num("timing.minSeconds", "Minimum seconds before submit", policy.timing.minSeconds, 1, 15)}${num("ipBlocking.blockMinutes", "Temporary block (minutes)", policy.ipBlocking.blockMinutes, 5, 1440)}</fieldset>
<p><button type="submit"${disabled}>Save protection settings</button></p></form>`);

  const logs = authorize(opts.viewer, "security_log.view");
  if (logs.allowed) {
    const events = (opts.securityEvents ?? []).slice(0, 50);
    const counts = events.reduce<Record<string, number>>((acc, e) => ({ ...acc, [e.outcome]: (acc[e.outcome] ?? 0) + 1 }), {});
    parts.push(`<h3>Security events</h3>${
      events.length === 0
        ? '<p class="g-note">No security events supplied. Pass the host GuardStore\'s recent events to see them here.</p>'
        : `<p>${Object.entries(counts).map(([k, v]) => `${esc(k.replace(/_/g, " "))}: ${v}`).join(" · ")}</p><div class="g-scroll" role="region" aria-label="Security events" tabindex="0"><table><thead><tr><th scope="col">Time (UTC)</th><th scope="col">Form</th><th scope="col">Outcome</th><th scope="col">Score</th><th scope="col">Checks that fired</th><th scope="col">Source (hashed)</th></tr></thead><tbody>${events
            .map((e) => `<tr><td>${esc(e.at.replace("T", " ").slice(0, 19))}</td><td>${esc(e.formId)}</td><td>${esc(e.outcome.replace(/_/g, " "))}</td><td>${e.score}</td><td>${esc(e.signals.map((s) => s.check).join(", ") || "—")}</td><td><code>${esc(e.sourceHash)}</code></td></tr>`)
            .join("")}</tbody></table></div><p class="g-note">Raw IP addresses and submitted values are never logged.</p>`
    }`);
  }
  return parts.join("\n");
}

export function renderGrowthConsole(report: GrowthReport, opts: ConsoleOptions): string {
  const s = report.summary;
  const openHigh = report.recommendations.filter((r) => r.priority === "high" && (r.status === "recommended" || r.status === "pending")).length;
  const answer = (title: string, ids: readonly string[]) => {
    const items = ids.slice(0, 3).map((id) => report.recommendations.find((r) => r.id === id)).filter((r): r is Recommendation => r !== undefined);
    return `<li><strong>${title}</strong>${items.length ? `<ul>${items.map((r) => `<li><a href="#${esc(r.id.replace(/[^a-z0-9]+/gi, "-"))}">${esc(r.title)}</a></li>`).join("")}</ul>` : ' <span class="g-note">— none open</span>'}</li>`;
  };
  const academy = report.academy;
  const context = report.contextual
    ? `<p class="g-meta">${esc(academy.category === "arts" ? "Arts" : "Sports")} academy (${esc(academy.categoryBasis ?? "")}) · ${esc(academy.disciplines.map((d) => d.name).join(", "))}${academy.city ? ` · ${esc(academy.city)}` : ""}</p>`
    : `<div class="g-warn" role="note"><p><strong>Recommendations need the academy's category.</strong> ${esc(academy.categoryReason)}.</p></div>`;
  const filter = `<fieldset class="g-filter"><legend>Show</legend>${[["all", "All"], ["recommended", "Recommended"], ["pending", "Pending"], ["implemented", "Implemented"], ["dismissed", "Dismissed"], ["high", "High priority"]]
    .map(([v, l]) => `<label for="f-${v}"><input type="radio" id="f-${v}" name="status-filter" value="${v}"${v === "all" ? " checked" : ""}> ${l}</label>`)
    .join("")}</fieldset>`;
  const nav = [["overview", "Overview"], ...Object.values(AREA).map((a) => [a.id, a.title])]
    .map(([id, label]) => `<li><a href="#${id}">${label}</a></li>`)
    .join("");

  return `<!doctype html>
<html lang="${esc(opts.lang ?? "en")}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Growth console — ${esc(academy.businessName)}</title>
<style>
${tokensBlock(opts.tokens)}
${STYLES}
</style>
</head>
<body>
<a class="g-skip" href="#main">Skip to content</a>
<div class="g-shell">
<header class="g-header"><div><h1>Website growth &amp; protection</h1>${context}</div><p class="g-meta">Signed in as ${esc(opts.viewer.id)} · <strong>${esc(opts.viewer.role)}</strong></p></header>
<nav class="g-nav" aria-label="Console sections"><ul>${nav}</ul></nav>
<main id="main">
<section class="g-section" id="overview" aria-labelledby="overview-h"><h2 id="overview-h">Overview</h2>
<ul class="g-tiles"><li class="g-tile"><strong>${s.total}</strong> recommendations</li><li class="g-tile"><strong>${openHigh}</strong> open, high priority</li><li class="g-tile"><strong>${s.byStatus.pending}</strong> pending</li><li class="g-tile"><strong>${s.byStatus.implemented}</strong> implemented</li><li class="g-tile"><strong>${s.byStatus.dismissed}</strong> dismissed</li></ul>
<h3>What to do next</h3><ol>${answer("Free guest engagement tools to add", report.answers.guestTools)}${answer("Downloadable resources to publish", report.answers.resources)}${answer("Blogs to publish", report.answers.blogs)}${answer("Missing SEO improvements", report.answers.seoImprovements)}${answer("Forms that need protection", report.answers.formsNeedingProtection)}</ol>
${report.missingFacts.length ? `<details><summary>Facts that would make these recommendations more specific (${report.missingFacts.length})</summary><ul>${report.missingFacts.map((m) => `<li>${esc(m)}</li>`).join("")}</ul></details>` : ""}
${filter}
</section>
${areaSection("guest_engagement", report.guestTools, opts, report.notRecommendedTools.length ? `<details><summary>Tools not recommended (${report.notRecommendedTools.length})</summary><ul>${report.notRecommendedTools.map((t) => `<li>${esc(t.toolId.replace(/_/g, " "))}: ${esc(t.reason)}</li>`).join("")}</ul></details>` : "")}
${areaSection("resource", report.resources, opts)}
${areaSection("blog", report.blogs, opts)}
${areaSection("seo_improvement", report.seoImprovements, opts)}
${areaSection("spam_protection", report.formProtection, opts, spamSettings(report, opts))}
</main>
</div>
</body>
</html>
`;
}

/** Files for the console, written OUTSIDE the deployable layers. */
export function generateGrowthConsole(report: GrowthReport, opts: ConsoleOptions): Record<string, string> {
  return {
    "growth/console.html": renderGrowthConsole(report, opts),
    "growth/report.json": `${JSON.stringify(report, null, 2)}\n`,
  };
}
