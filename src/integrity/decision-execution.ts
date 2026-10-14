/**
 * DECISION-TO-EXECUTION INTEGRITY — one ledger for every decided capability.
 *
 *   Decision → Contract → Generation → Rendered Output → Reconciliation
 *
 * The framework already refused to emit a site whose conversion labels disagreed
 * with their forms, or whose engagement experiences disagreed with the decision.
 * Those were two instances of one contract. This module is the general form: each
 * decided capability gets an entry saying what was decided (and by which
 * authority), what generation had to produce, what the rendered output actually
 * contains, and one status —
 *
 *   delivered    the output contains what was decided;
 *   unavailable  the decided capability could not be delivered, and the entry
 *                carries WHY and what stands in its place (never silent);
 *   mismatch     the output disagrees with the decision. Generation throws.
 *
 * It reads only what generation produced: the component model, the emitted files
 * and the static pages. It decides nothing.
 */
import type { DesignDecisionOutput } from "../pipeline.js";
import type { ComponentModel, ComponentNode } from "../generation/component-model.js";
import type { ResolvedContent } from "../generation/content-values.js";
import type { DeliveryReconciliation } from "../engagement/delivery.js";
import { FRAMEWORK_RUNTIME } from "../stack/runtime-packages.js";
import { importedPackages } from "../stack/dependency-admission.js";

export type IntegrityDomain =
  | "home_route"
  | "page"
  | "section"
  | "conversion"
  | "navigation"
  | "dependency"
  | "content_draft"
  /** FD-05: the renderer honoured the content engine's publication verdict. */
  | "content_verdict"
  /** FD-09: every supplied or approved content value reaches a page, or is a recorded publication blocker. */
  | "supplied_value"
  /** FD-11: every selected pattern is rendered, or recorded unavailable with why. */
  | "pattern"
  | "engagement"
  | "rule_precedence";

export type IntegrityStatus = "delivered" | "unavailable" | "mismatch";

export interface IntegrityEntry {
  domain: IntegrityDomain;
  /** A stable id: what was decided, where. */
  subject: string;
  /** The deciding authority (a rule, the page model, the conversion plan, the admission). */
  authority: string;
  decided: string;
  rendered: string;
  status: IntegrityStatus;
  reason: string;
  /**
   * FD-09: an `unavailable` entry that must stop publication. Approved or supplied
   * content that no page can render is neither thrown (the whole site fails) nor
   * dropped (approved content silently lost): it is recorded here and reaches the
   * content gate through `BuildEvidence.generation`.
   */
  blocksPublication?: boolean;
}

export interface IntegrityLedger {
  entries: IntegrityEntry[];
  counts: Record<IntegrityStatus, number>;
  byDomain: Record<string, Record<IntegrityStatus, number>>;
  /** True only when no entry is a mismatch. */
  consistent: boolean;
  /** Entries that block publication, one line each. Empty is required for the content gate to pass. */
  publicationBlockers: string[];
}

export interface IntegrityInput {
  output: DesignDecisionOutput;
  model: ComponentModel;
  /** Every generated file, keyed `static/...` and `next/...`. */
  files: Readonly<Record<string, string>>;
  content: ResolvedContent;
  engagement: DeliveryReconciliation;
}

function flatten(nodes: readonly ComponentNode[], acc: ComponentNode[] = []): ComponentNode[] {
  for (const n of nodes) {
    acc.push(n);
    if (n.children) flatten(n.children, acc);
  }
  return acc;
}

function staticPath(route: string): string {
  return route === "/" ? "static/index.html" : `static${route}/index.html`;
}
function nextPath(route: string): string {
  return route === "/" ? "next/app/page.tsx" : `next/app${route}/page.tsx`;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function reconcileDecisionExecution(input: IntegrityInput): IntegrityLedger {
  const { output, model, files, content } = input;
  const entries: IntegrityEntry[] = [];
  const add = (e: IntegrityEntry) => entries.push(e);
  const modelRoutes = new Set(model.pages.map((p) => p.page.route));

  // ---- G1: the home route exists in the decision, the model and both layers.
  const homeRendered = modelRoutes.has("/") && files[staticPath("/")] !== undefined && files[nextPath("/")] !== undefined;
  add({
    domain: "home_route",
    subject: "/",
    authority: `page model (${output.pageAllocation.home.how})`,
    decided: output.pageAllocation.home.because,
    rendered: homeRendered ? "/ in the model, static/index.html and next/app/page.tsx" : "no complete home page",
    status: homeRendered ? "delivered" : "mismatch",
    reason: homeRendered ? "every link to / resolves" : "the brand, navigation and 404 page link to / but it was not generated (G1)",
  });

  // ---- Pages: every decided page is generated in both layers; nothing extra.
  for (const page of output.pages) {
    const ok = modelRoutes.has(page.route) && files[staticPath(page.route)] !== undefined && files[nextPath(page.route)] !== undefined;
    add({
      domain: "page",
      subject: page.route,
      authority: page.ownerSupplied ? "owner requiredPages" : `derived (${page.derivedBy ?? page.roleBasis})`,
      decided: `role ${page.role} (${page.roleBasis}); sections ${page.requiredSections.join(", ")}`,
      rendered: ok ? "model page, static HTML and Next page" : "missing from a layer",
      status: ok ? "delivered" : "mismatch",
      reason: ok ? "generated in both layers" : "a decided page was not generated",
    });
  }
  for (const pm of model.pages) {
    if (!output.pages.some((p) => p.route === pm.page.route)) {
      add({ domain: "page", subject: pm.page.route, authority: "none", decided: "not decided", rendered: "generated", status: "mismatch", reason: "a page was generated that no decision contains" });
    }
  }

  // ---- Sections: each allocated section rendered nodes OR recorded a refusal.
  for (const pm of model.pages) {
    for (const result of pm.sectionResults) {
      if (result.section === "primary_action_repeat") continue;
      const status: IntegrityStatus = result.nodeIds.length > 0 ? "delivered" : result.refusal ? "unavailable" : "mismatch";
      add({
        domain: "section",
        subject: `${pm.page.route}#${result.section}`,
        authority: result.section === "engagement_experience" ? "engagement delivery spec" : `page role ${pm.page.role} / objective ${pm.page.primaryObjective}`,
        decided: `section "${result.section}" on ${pm.page.route}`,
        rendered: result.nodeIds.length > 0 ? `nodes ${result.nodeIds.join(", ")}` : "no nodes",
        status,
        reason: status === "delivered" ? (result.refusal ? `rendered with a recorded limitation: ${result.refusal}` : "rendered") : status === "unavailable" ? result.refusal! : "the section produced nothing and recorded no reason — a silent drop",
      });
    }
  }
  for (const u of output.pageAllocation.unallocated) {
    add({ domain: "section", subject: `(site)#${u.section}`, authority: "site section architecture", decided: `section "${u.section}" is in the site architecture`, rendered: "on no page", status: "unavailable", reason: u.reason });
  }

  // ---- Conversion: the decided capability order was followed, and what it
  // delivered is what the page renders.
  const allNodes = model.pages.map((pm) => ({ route: pm.page.route, nodes: flatten(pm.nodes), pm }));
  for (const delivery of model.conversionDeliveries) {
    const subject = `${delivery.objective}${delivery.section ? `:${delivery.section}` : ""}`;
    const plan = output.conversionPlan.find((p) => p.objective === delivery.objective);
    const decided = plan ? `order ${plan.order.map((o) => o.capability).join(" → ")} (${plan.basis})` : "no plan";
    if (delivery.delivered === null) {
      add({ domain: "conversion", subject, authority: "conversion plan (P1-2)", decided, rendered: "no completable capability", status: "unavailable", reason: delivery.skipped.map((s) => `${s.capability}: ${s.reason}`).join("; ") || "the surface allows no capability" });
      continue;
    }
    let rendered = false;
    if (delivery.delivered === "form") {
      rendered = allNodes.some((p) => p.nodes.some((n) => n.kind === "form" && n.form?.endpoint.state === "configured" && (!delivery.section || n.form.kind === delivery.section)));
    } else {
      const href = delivery.links[0]?.href;
      rendered = href !== undefined && allNodes.some((p) => p.nodes.some((n) => (n.kind === "contact_actions" && n.contactLinks?.some((l) => l.href === href)) || ((n.kind === "action" || n.kind === "sticky_cta") && n.href === href)));
    }
    add({
      domain: "conversion",
      subject,
      authority: "conversion plan (P1-2)",
      decided,
      rendered: rendered ? `${delivery.delivered} rendered` : `${delivery.delivered} NOT rendered`,
      status: rendered ? "delivered" : "mismatch",
      reason: rendered
        ? delivery.skipped.length > 0
          ? `delivered ${delivery.delivered}; not delivered: ${delivery.skipped.map((s) => `${s.capability} (${s.reason})`).join("; ")}`
          : `delivered ${delivery.delivered}, the first capability in the decided order`
        : "the resolved capability is absent from the rendered output",
    });
  }

  // ---- Navigation: DD-034's compact mode, implemented in every page of both layers.
  const compactDecided = output.decisions["nav.compactMode"];
  if (compactDecided === "accessible_drawer_or_compact_bar") {
    const missing = model.pages
      .filter((pm) => !(files[staticPath(pm.page.route)] ?? "").includes('data-nav-compact="popover_disclosure"') || !(files[nextPath(pm.page.route)] ?? "").includes('data-nav-compact="popover_disclosure"'))
      .map((pm) => pm.page.route);
    add({
      domain: "navigation",
      subject: "nav.compactMode",
      authority: "rule DD-034",
      decided: String(compactDecided),
      rendered: missing.length === 0 ? `popover disclosure on ${model.pages.length} page(s) in both layers` : `missing on ${missing.join(", ")}`,
      status: missing.length === 0 ? "delivered" : "mismatch",
      reason: missing.length === 0 ? "native popover disclosure below the medium range; the same routes at every width" : "the decided compact navigation is not in the rendered output",
    });
  } else {
    add({ domain: "navigation", subject: "nav.compactMode", authority: "rule DD-034", decided: String(compactDecided ?? "unset"), rendered: "full list at every width", status: "unavailable", reason: "no compact mode the generator implements was decided" });
  }

  // ---- Dependencies: the admitted set is exactly what emitted code imports.
  const nextFiles = Object.fromEntries(Object.entries(files).filter(([p]) => p.startsWith("next/")));
  const imports = importedPackages(nextFiles);
  const admitted = output.dependencyAdmission.admitted;
  for (const [pkg, where] of imports) {
    if (!(pkg in admitted)) {
      add({ domain: "dependency", subject: pkg, authority: "dependency admission (P1-6)", decided: "not admitted", rendered: `imported by ${where.join(", ")}`, status: "mismatch", reason: "emitted code imports a package the admission did not admit" });
    }
  }
  for (const entry of output.dependencyAdmission.entries) {
    if (entry.status === "admitted") {
      const used = imports.has(entry.package) || entry.package in FRAMEWORK_RUNTIME;
      add({ domain: "dependency", subject: entry.package, authority: "dependency admission (P1-6)", decided: "admitted", rendered: used ? `imported by ${(imports.get(entry.package) ?? ["the framework runtime"]).join(", ")}` : "imported by no emitted module", status: used ? "delivered" : "mismatch", reason: used ? entry.reason : "an admitted package that nothing imports would be an unused install" });
    } else {
      const leaked = imports.has(entry.package);
      add({ domain: "dependency", subject: entry.package, authority: "dependency admission (P1-6)", decided: entry.status, rendered: leaked ? `imported by ${(imports.get(entry.package) ?? []).join(", ")}` : "not installed, not imported", status: leaked ? "mismatch" : "unavailable", reason: entry.reason });
    }
  }

  // ---- AI drafts: published drafts reach the page; held and rejected ones do not.
  // FD-09: an APPROVED draft that no page renders is a publication blocker, never a
  // throw (the site would not generate) and never a silent drop. An UNAPPROVED draft
  // that leaks stays a mismatch: that output must not be emitted at all.
  const staticHtml = Object.entries(files).filter(([p]) => p.startsWith("static/") && p.endsWith(".html")).map(([, b]) => b).join("\n");
  for (const d of content.drafts.published.values()) {
    const found = staticHtml.includes(escapeHtml(d.value));
    add({
      domain: "content_draft",
      subject: d.target,
      authority: `draft channel (${d.provenance.provenance})`,
      decided: "published",
      rendered: found ? "present in the static HTML" : "absent from the static HTML",
      status: found ? "delivered" : "unavailable",
      reason: found ? d.reason : `approved draft for ${d.target} has no rendering section on any page — publication blocked until a page renders it or the approval is withdrawn`,
      ...(found ? {} : { blocksPublication: true }),
    });
  }

  // ---- Supplied values (FD-09): every supplied content value the resolver published
  // must appear on a page. One the page model gives no home is a publication blocker.
  for (const v of suppliedValues(content)) {
    const found = v.probes.some((probe) => staticHtml.includes(probe));
    add({
      domain: "supplied_value",
      subject: v.subject,
      authority: `supplied content (${v.source})`,
      decided: "supplied and publishable",
      rendered: found ? "present in the static HTML" : "absent from every page",
      status: found ? "delivered" : "unavailable",
      reason: found ? "rendered" : `supplied ${v.subject} has no rendering section on any page — publication blocked; the value is not dropped silently`,
      ...(found ? {} : { blocksPublication: true }),
    });
  }

  // ---- Content verdicts (FD-05): what the content engine withheld is absent from the
  // output. The renderer used to ignore the `services` verdict entirely, which is how
  // a source that authorises nothing could still put its names on a page.
  for (const { offer, decision: d } of content.offers) {
    const appears = staticHtml.includes(`>${escapeHtml(offer.name)}<`);
    add({
      domain: "content_verdict",
      subject: `offer "${offer.name}"`,
      authority: "content publication policy (FD-05)",
      decided: `${d.state}: ${d.reason}`,
      rendered: appears ? "present in the static HTML" : "absent from the static HTML",
      status: d.publish ? (appears ? "delivered" : "unavailable") : appears ? "mismatch" : "unavailable",
      reason: d.publish
        ? appears
          ? "published, as the policy allows"
          : "publishable, but no section rendered it"
        : appears
          ? `a name the policy does not publish reached a page: ${d.reason}`
          : d.reason,
    });
  }
  const servicesVerdict = output.contentPlan.sections.find((s) => s.category === "services");
  if (servicesVerdict) {
    const rendered = model.pages.some((pm) => pm.sectionResults.some((r) => r.section === "services" && r.nodeIds.length > 0));
    add({
      domain: "content_verdict",
      subject: "section services",
      authority: "content verification (verifyContent)",
      decided: servicesVerdict.render ? "may render" : `must not render: ${servicesVerdict.reason}`,
      rendered: rendered ? "rendered" : "not rendered",
      status: servicesVerdict.render || !rendered ? "delivered" : "mismatch",
      reason: servicesVerdict.render ? servicesVerdict.reason : rendered ? "the services section rendered although the content engine withheld it" : servicesVerdict.reason,
    });
  }

  // ---- Patterns (FD-11): a selected pattern is rendered, or recorded with why not. Report only.
  const usedPatterns = new Set(
    model.pages.flatMap((pm) => flatten(pm.nodes)).flatMap((n) => n.traceTo).filter((t) => t.startsWith("pattern:")).map((t) => t.slice("pattern:".length)),
  );
  for (const id of output.selectedPatterns) {
    const used = usedPatterns.has(id);
    add({
      domain: "pattern",
      subject: id,
      authority: "element selection",
      decided: "selected",
      rendered: used ? "rendered by a section" : "rendered by no section",
      status: used ? "delivered" : "unavailable",
      reason: used ? "a section renders this pattern" : "no generator renderer maps a section to this pattern, so it was selected but not rendered (FD-11); its budget and fallback requirement describe nothing on the page",
    });
  }
  for (const d of [...content.drafts.held, ...content.drafts.rejected]) {
    const leaked = staticHtml.includes(escapeHtml(d.value));
    add({ domain: "content_draft", subject: d.target, authority: `draft channel (${d.provenance.provenance})`, decided: d.status, rendered: leaked ? "PRESENT in the static HTML" : "not rendered", status: leaked ? "mismatch" : "unavailable", reason: leaked ? "a draft that is not approved reached a page" : d.reason });
  }

  // ---- Engagement: the delivery reconciliation, folded in.
  for (const e of input.engagement.entries) {
    add({
      domain: "engagement",
      subject: e.specId,
      authority: "engagement decision + delivery spec",
      decided: `${e.category} ${e.status}`,
      rendered: e.rendered ? `rendered on ${e.route} (${e.nodeIds.join(", ")})` : e.mode === "existing_section" ? `served by the existing section on ${e.route}` : "not rendered",
      status: e.status === "DELIVERY_UNAVAILABLE" ? (e.rendered ? "mismatch" : "unavailable") : e.rendered || e.mode === "existing_section" ? "delivered" : "mismatch",
      reason: e.status === "DELIVERY_UNAVAILABLE" ? "delivery unavailable; the page's static content stands" : "rendered as specified",
    });
  }
  for (const problem of input.engagement.problems) {
    add({ domain: "engagement", subject: "reconciliation", authority: "engagement decision + delivery spec", decided: "consistent delivery", rendered: problem, status: "mismatch", reason: problem });
  }

  // ---- Rule precedence: the resolved value is the value the output carries.
  for (const r of output.precedenceResolutions) {
    const actual = output.decisions[r.target];
    const ok = JSON.stringify(actual) === JSON.stringify(r.winner.value);
    add({ domain: "rule_precedence", subject: r.target, authority: `precedence (${r.winner.tier} over ${r.overridden.map((o) => o.tier).join(", ")})`, decided: `${JSON.stringify(r.winner.value)} by ${r.winner.ruleIds.join(", ")}`, rendered: `decision draft carries ${JSON.stringify(actual)}`, status: ok ? "delivered" : "mismatch", reason: ok ? `overridden: ${r.overridden.map((o) => `${o.ruleId}=${JSON.stringify(o.value)}`).join(", ")}` : "the draft does not carry the precedence winner" });
  }

  const counts: Record<IntegrityStatus, number> = { delivered: 0, unavailable: 0, mismatch: 0 };
  const byDomain: IntegrityLedger["byDomain"] = {};
  for (const e of entries) {
    counts[e.status] += 1;
    byDomain[e.domain] ??= { delivered: 0, unavailable: 0, mismatch: 0 };
    byDomain[e.domain]![e.status] += 1;
  }
  const publicationBlockers = entries.filter((e) => e.blocksPublication).map((e) => `[${e.domain}] ${e.subject}: ${e.reason}`);
  return { entries, counts, byDomain, consistent: counts.mismatch === 0, publicationBlockers };
}

/**
 * The publishable supplied values the resolver produced, each with the escaped
 * strings whose presence in the static HTML proves it was rendered.
 */
function suppliedValues(content: ResolvedContent): Array<{ subject: string; source: string; probes: string[] }> {
  const out: Array<{ subject: string; source: string; probes: string[] }> = [];
  const text = (subject: string, source: string, value: string) => {
    // An approved draft is reconciled once, by the content_draft domain.
    if (source.startsWith("approved draft:")) return;
    if (value.trim().length > 0) out.push({ subject, source, probes: [escapeHtml(value)] });
  };
  if (content.proposition.state === "supplied") text("proposition", content.proposition.source, content.proposition.value);
  if (content.about.state === "supplied") text("about", content.about.source, content.about.value);
  if (content.process.state === "supplied") content.process.value.forEach((s, i) => text(`process step ${i + 1}`, content.process.source, s.step));
  if (content.faq.state === "supplied") content.faq.value.forEach((f, i) => text(`faq entry ${i + 1}`, content.faq.source, f.question));
  if (content.services.state === "supplied") {
    for (const offer of content.services.value) if (offer.description) text(`description of "${offer.name}"`, content.services.source, offer.description);
  }
  if (content.contact.state === "supplied") {
    const c = content.contact.value;
    if (c.email) text("contact email", content.contact.source, c.email);
    if (c.phone) text("contact phone", content.contact.source, c.phone);
    if (c.whatsapp) text("contact WhatsApp", content.contact.source, c.whatsapp);
    if (c.addressLines.length > 0) text("contact address", content.contact.source, c.addressLines.join(", "));
    if (c.hours.length > 0) text("opening hours", content.contact.source, c.hours.join("; "));
  }
  if (content.assets.logo) out.push({ subject: "logo file", source: "verified asset", probes: [escapeHtml(content.assets.logo.src)] });
  if (content.assets.hero) out.push({ subject: "hero image", source: "verified asset", probes: [escapeHtml(content.assets.hero.src)] });
  return out;
}
