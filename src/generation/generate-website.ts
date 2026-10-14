/**
 * THE GENERATOR — `DesignDecisionOutput → GeneratedWebsite`.
 *
 * It consumes; it does not decide. Every value in the output was decided
 * upstream, and anything the generator cannot derive becomes a `Refusal` — a
 * first-class output, not a log line, because a rejected pattern, an unresolved
 * canonical and an unsupplied proposition are all things the generator
 * deliberately did not emit and the reason must travel with the artifact.
 *
 * One component model feeds two emitters (assessment §4):
 *   - `render/html.ts` + `render/css.ts`  -> the static base layer, which IS
 *     executed to disk and IS measured (§10 layers 1-2, semantic HTML + CSS).
 *   - `emit/nextjs.ts`                    -> the App Router source the stack
 *     decision demands; the enhancement host.
 */
import type { DesignDecisionOutput, ImplementationContract } from "../pipeline.js";
import { resolveContent, type ResolvedContent } from "./content-values.js";
import { buildComponentModel, rulesCitedBy, walkNodes, type ComponentModel, type Refusal } from "./component-model.js";
import { validateConversionSemantics, type ConversionKind, type FormContract } from "./form-contracts.js";
import { renderStaticSite, type RenderedPage } from "./render/html.js";
import { renderCss } from "./render/css.js";
import { emitNextApp } from "./emit/nextjs.js";
import type { BusinessInput } from "../design-intelligence/types/business-input.js";
import { gzipSync } from "node:zlib";
import {
  planExperienceDelivery,
  reconcileExperienceDelivery,
  type DeliveryReconciliation,
  type ExperienceDeliverySpec,
} from "../engagement/delivery.js";
import { experienceDataBytes } from "./render/experiences.js";
import { EXPERIENCE_RUNTIME_FILE, EXPERIENCE_RUNTIME_PATH } from "./runtime/experience-runtime.js";
import { applySeoDrafts } from "../seo/artifacts.js";
import type { DraftResolution } from "../content/draft-channel.js";
import { analyseIndexability, parseServedHtml, type IndexabilityFindings } from "../evidence/build-evidence.js";
import { classifyDataset, type DatasetClassification } from "../content/dataset-classification.js";
import { reconcileDecisionExecution, type IntegrityLedger } from "../integrity/decision-execution.js";
import type { ConversionDelivery } from "./contact-links.js";
import type { PageAllocationReport } from "./page-spec.js";
import type { DependencyAdmission } from "../stack/dependency-admission.js";

export interface GeneratedPage {
  route: string;
  purpose: string;
  primaryObjective: string;
  audience: string[];
  seoRole: string;
  sections: string[];
  conversionRole: string;
  trustRequirements: string[];
  /** Static-layer file path. */
  staticPath: string;
  /** Next.js source file path. */
  nextPath: string;
  /** Node ids on this page and what each traces to. */
  trace: Array<{ nodeId: string; kind: string; traceTo: string[] }>;
  refusals: Array<{ section: string; reason: string }>;
}

export interface GenerationManifest {
  framework: string;
  renderingStrategy: string;
  /** Exactly the stack decision's libraries — the generator adds none. */
  dependencies: string[];
  omittedDependencies: Array<{ library: string; because: string }>;
  clientBoundaries: Array<{ page: string; nodeId: string; because: string }>;
  /** Patterns present in the output, by id. */
  patternsUsed: string[];
  /** Patterns the engine rejected, PROVEN absent from output by a test. */
  patternsRejected: string[];
  tokenProvenance: { color: string; typography: string };
  /** Every DD rule a generated node or stylesheet cites — the traceability surface. */
  rulesCited: string[];
  /** Every conversion form's action contract, with its endpoint state. */
  formContracts: Array<{ page: string; contract: FormContract }>;
  seoUnresolved: number;
  seoApprovalsRequired: number;
  contentSlots: number;
  hiddenSections: number;
  /**
   * The engagement decision as the generator consumed it: which decision, which
   * record, and per SELECTED experience whether it rendered, was served by an
   * existing section, or was refused (with why). NO_EXPERIENCE → no experiences.
   */
  engagement: {
    decision: string;
    decisionRecordId: string;
    experiences: Array<{ specId: string; category: string; status: string; outcome: string; mode: string | null; route: string | null; detail: string }>;
    staticAlternative: string | null;
    /** The delivery contract per SELECTED opportunity (engagement/delivery.ts). */
    delivery: ExperienceDeliverySpec[];
    /** decision ↔ specs ↔ rendered ↔ runtime. Generation throws unless consistent. */
    reconciliation: DeliveryReconciliation;
    /** The shared runtime, when any interactive experience shipped. DERIVED from the written file. */
    runtime: { path: string; bytes: number; gzipBytes: number; staticRoutes: string[]; nextLayout: boolean } | null;
  };
  /** Synthetic data stays identified as synthetic; a synthetic dataset is never publishable. */
  dataset: DatasetClassification;
  /** P1-1 / G1: section allocation by page role, and how the home route exists. */
  pageAllocation: PageAllocationReport;
  /** P1-2: each conversion resolved against the decided capability order. */
  conversions: Array<ConversionDelivery & { section: string | null }>;
  /** P1-3: AI drafts published (with approval), held for approval, or rejected. */
  contentDrafts: { published: DraftResolution[]; held: DraftResolution[]; rejected: DraftResolution[] };
  /** P1-6: proposal × generated consumer × dependency gate. */
  dependencyAdmission: DependencyAdmission;
  /** P1-7: duplicate and placeholder findings over the generator's own indexable pages. */
  indexability: IndexabilityFindings;
  /** Decision → contract → generation → rendered output. Generation throws unless consistent. */
  integrity: IntegrityLedger;
  /**
   * The refinement seam (brief §12). Populated from the quality assessment so a
   * later phase can route weaknesses into generator options. `refine()` is NOT
   * invoked here; this records what it would consume.
   */
  refinementInput: {
    level: string;
    unknownGates: string[];
    failedGates: string[];
    blockers: string[];
  };
}

export interface GeneratedWebsite {
  /** path -> content. Static layer under `static/`, Next source under `next/`. */
  files: Record<string, string>;
  pages: GeneratedPage[];
  manifest: GenerationManifest;
  refusals: Refusal[];
  /** Exposed so tests can assert against the model rather than parsing HTML. */
  model: ComponentModel;
  content: ResolvedContent;
}

export interface GenerateOptions {
  /** Actual copy values, validated by `suppliedContentSchema`. Optional. */
  suppliedContent?: unknown;
  /**
   * HOST configuration: the URL each conversion kind posts to. Absent kinds are
   * `unconfigured` — the form renders disabled and no action promotes it. The
   * framework never invents an endpoint.
   */
  formEndpoints?: Partial<Record<ConversionKind, string>>;
  cssHref?: string;
  lang?: string;
  /**
   * Host KILL SWITCH for delivered experiences (ECO §16). "disabled" renders each
   * experience's static equivalent without the enhancement or its script; the page
   * stays complete. Default "enabled".
   */
  experiences?: "enabled" | "disabled";
}

/** Complete a value-dependent JSON-LD type from RESOLVED content, or return null. */
function completeDeferredEntity(
  type: string,
  input: BusinessInput,
  content: ResolvedContent,
): Record<string, unknown> | null {
  const context = "https://schema.org";
  if (type === "FAQPage" && content.faq.state === "supplied" && content.faq.value.length > 0) {
    return {
      "@context": context,
      "@type": "FAQPage",
      mainEntity: content.faq.value.map((entry) => ({
        "@type": "Question",
        name: entry.question,
        acceptedAnswer: { "@type": "Answer", text: entry.answer },
      })),
    };
  }
  if (type === "LocalBusiness" && content.contact.state === "supplied" && content.contact.value.addressLines.length > 0) {
    return {
      "@context": context,
      "@type": "LocalBusiness",
      name: input.businessName,
      address: { "@type": "PostalAddress", streetAddress: content.contact.value.addressLines.join(", ") },
      ...(content.contact.value.phone ? { telephone: content.contact.value.phone } : {}),
      ...(content.contact.value.email ? { email: content.contact.value.email } : {}),
    };
  }
  return null;
}

export function generateWebsite(
  input: BusinessInput,
  decidedOutput: DesignDecisionOutput,
  _contract: ImplementationContract,
  options: GenerateOptions = {},
): GeneratedWebsite {
  const content = resolveContent(input, options.suppliedContent);
  // P1-3: a draft may target only a page that exists; route-bound drafts for an
  // unknown route are rejected here, where the page model is known.
  const routes = new Set(decidedOutput.pages.map((p) => p.route));
  const unknownRoute = (d: DraftResolution) => d.target.includes(":") && !routes.has(d.target.slice(d.target.indexOf(":") + 1));
  for (const [target, d] of [...content.drafts.published]) {
    if (unknownRoute(d)) {
      content.drafts.published.delete(target);
      content.drafts.rejected.push({ ...d, status: "rejected", reason: `no page exists at ${target.slice(target.indexOf(":") + 1)}` });
    }
  }
  content.drafts.held = content.drafts.held.filter((d) => {
    if (!unknownRoute(d)) return true;
    content.drafts.rejected.push({ ...d, status: "rejected", reason: `no page exists at ${d.target.slice(d.target.indexOf(":") + 1)}` });
    return false;
  });
  // Approved title and description drafts become the SEO artifacts every renderer reads.
  const output: DesignDecisionOutput = { ...decidedOutput, seoArtifacts: applySeoDrafts(decidedOutput.seoArtifacts, content.drafts) };
  // DELIVERY: one spec per SELECTED opportunity, from the decision and the
  // resolved values. The model renders only DELIVERABLE specs.
  const runtimeBuffer = Buffer.from(EXPERIENCE_RUNTIME_FILE, "utf8");
  const deliverySpecs = planExperienceDelivery({
    input,
    decision: output.engagement,
    content,
    pages: output.pages,
    budget: { routeJsKb: output.performanceStrategy.budgetKb, plannedFinalKb: output.performanceStrategy.finalKb },
    runtime: { bytes: runtimeBuffer.length, gzipBytes: gzipSync(runtimeBuffer, { level: 9 }).length },
    dataBytes: (specId, definition) => experienceDataBytes(specId, definition),
    experiences: options.experiences ?? "enabled",
  });
  const model = buildComponentModel(output, content, {
    // FD-05: only publishable offer names may appear, including in a form's options.
    offers: content.offers.filter((o) => o.decision.publish).map((o) => o.offer),
    formEndpoints: options.formEndpoints ?? {},
    deliverySpecs,
  });

  // Refuse to emit a site whose actions, sections and form contracts disagree.
  const semanticViolations = validateConversionSemantics(
    model.pages.map((p) => ({ route: p.page.route, nodes: p.nodes })),
  );
  if (semanticViolations.length > 0) {
    throw new Error(
      `conversion semantics violated: ${semanticViolations.map((v) => `${v.page} ${v.nodeId}: ${v.problem}`).join("; ")}`,
    );
  }
  const formContracts: Array<{ page: string; contract: FormContract }> = [];
  walkNodes(model, (n, page) => {
    if (n.form) formContracts.push({ page: page.route, contract: n.form });
  });

  // The CSS emitter reads the same decision surface the model did (DD-022/023/
  // 024/025/045/067/069/070/072/078/089).
  const css = renderCss(model, output.tokens, output.decisions, {
    targetSizeCssPx: output.accessibilityStrategy.thresholds.targetSizeCssPx,
  });
  // Structured data: the plan's entities, plus value-dependent types completed
  // from resolved content — or refused with the reason.
  const jsonLd = new Map<string, Array<Record<string, unknown>>>();
  for (const page of output.seoArtifacts.pages) {
    const entities = [...(page.structuredDataEntities.value ?? [])];
    for (const deferred of page.structuredDataDeferred) {
      const completed = completeDeferredEntity(deferred.type, input, content);
      if (completed) entities.push(completed);
      else model.refusals.push({ what: `${page.route} structuredData.${deferred.type}`, why: `needs ${deferred.needs}`, kind: "unresolved_artifact" });
    }
    jsonLd.set(page.route, entities);
  }

  const staticPages: RenderedPage[] = renderStaticSite(model, output.seoArtifacts, {
    jsonLd,
    cssHref: options.cssHref ?? "/styles.css",
    lang: options.lang ?? "en",
  });
  const nextFiles = emitNextApp(output, model, jsonLd);

  const files: Record<string, string> = {};
  files["static/styles.css"] = css;
  const staticRoutesWithRuntime = staticPages.filter((p) => p.html.includes(`<script src="${EXPERIENCE_RUNTIME_PATH}"`)).map((p) => p.route);
  if (staticRoutesWithRuntime.length > 0) files[`static${EXPERIENCE_RUNTIME_PATH}`] = EXPERIENCE_RUNTIME_FILE;
  for (const page of staticPages) files[`static/${page.path}`] = page.html;
  files["next/styles.css"] = css;
  for (const [path, body] of Object.entries(nextFiles)) files[`next/${path}`] = body;

  // A 404 page, so "loading/error/not-found states exist" (§L.1) is measured
  // rather than assumed. Rendered from the same header/footer as every page.
  const firstPage = staticPages[0];
  if (firstPage) {
    files["static/404.html"] = firstPage.html
      .replace(/<title>[^<]*<\/title>/, `<title>Page not found — ${output.profile.businessName}</title>`)
      .replace(/<meta name="robots" content="[^"]*">/, '<meta name="robots" content="noindex,follow">')
      .replace(/<link rel="canonical"[^>]*>\n?/, "")
      .replace(/<main id="main">[\s\S]*<\/main>/, '<main id="main"><h1>Page not found</h1><p><a href="/">Return to the home page</a></p></main>');
  }

  // robots.txt and sitemap only when the SEO layer could produce them honestly.
  if (output.seoArtifacts.robotsTxt.value) {
    files["static/robots.txt"] = `${output.seoArtifacts.robotsTxt.value}\n`;
    files["next/public/robots.txt"] = `${output.seoArtifacts.robotsTxt.value}\n`;
  }
  if (output.seoArtifacts.sitemap.value) {
    const urls = output.seoArtifacts.sitemap.value
      .map((u) => `  <url><loc>${u}</loc></url>`)
      .join("\n");
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
    files["static/sitemap.xml"] = sitemap;
    files["next/public/sitemap.xml"] = sitemap;
  }

  // RECONCILE decision ↔ delivery specs ↔ rendered experiences ↔ runtime. Like the
  // conversion semantics above, a disagreement is not emitted.
  const existingSectionRoutes = new Map<string, string[]>();
  for (const pm of model.pages) {
    for (const section of ["booking", "enquiry"]) {
      if (pm.page.requiredSections.includes(section)) existingSectionRoutes.set(section, [...(existingSectionRoutes.get(section) ?? []), pm.page.route]);
    }
  }
  const nextLayoutHasRuntime = (files["next/app/layout.tsx"] ?? "").includes(`src="${EXPERIENCE_RUNTIME_PATH}"`);
  const reconciliation = reconcileExperienceDelivery(output.engagement, deliverySpecs, model.renderedExperiences, {
    staticRoutesWithRuntime,
    nextLayoutHasRuntime,
    existingSectionRoutes,
  });
  if (!reconciliation.consistent) {
    throw new Error(`experience delivery does not reconcile with the engagement decision: ${reconciliation.problems.join("; ")}`);
  }

  // P1-7: the same indexability analysis the content gate runs on served HTML.
  const indexability = analyseIndexability(staticPages.map((p) => parseServedHtml(p.route, p.html)));

  // DECISION → EXECUTION: every decided capability is delivered, explicitly
  // unavailable with a reason, or a mismatch that stops generation.
  const integrity = reconcileDecisionExecution({ output, model, files, content, engagement: reconciliation });
  if (!integrity.consistent) {
    throw new Error(
      `decision-to-execution integrity violated: ${integrity.entries
        .filter((e) => e.status === "mismatch")
        .map((e) => `[${e.domain}] ${e.subject}: ${e.reason} (rendered: ${e.rendered})`)
        .join("; ")}`,
    );
  }
  const dataset = classifyDataset(input, options.suppliedContent);

  const pages: GeneratedPage[] = model.pages.map((pm) => {
    const staticPage = staticPages.find((p) => p.route === pm.page.route);
    const trace: GeneratedPage["trace"] = [];
    const walk = (n: (typeof pm.nodes)[number]): void => {
      trace.push({ nodeId: n.id, kind: n.kind, traceTo: n.traceTo });
      for (const c of n.children ?? []) walk(c);
    };
    for (const n of pm.nodes) walk(n);
    return {
      route: pm.page.route,
      purpose: pm.page.purpose,
      primaryObjective: pm.page.primaryObjective,
      audience: pm.page.audience,
      seoRole: pm.page.seoRole,
      sections: pm.page.requiredSections,
      conversionRole: pm.page.conversionRole,
      trustRequirements: pm.page.trustRequirements,
      staticPath: `static/${staticPage?.path ?? ""}`,
      nextPath: pm.page.route === "/" ? "next/app/page.tsx" : `next/app${pm.page.route}/page.tsx`,
      trace,
      refusals: pm.refusals,
    };
  });

  const patternsUsed = [...new Set(pages.flatMap((p) => p.trace.flatMap((t) => t.traceTo)))]
    .filter((t) => t.startsWith("pattern:"))
    .map((t) => t.replace("pattern:", ""));

  const manifest: GenerationManifest = {
    framework: output.stack.framework,
    renderingStrategy: output.stack.renderingStrategy,
    dependencies: [...output.stack.libraries],
    omittedDependencies: output.stack.omittedLibraries.map((o) => ({ library: o.library, because: o.because })),
    clientBoundaries: model.clientBoundaries,
    patternsUsed,
    patternsRejected: output.selectionDecisions.filter((d) => d.outcome === "reject").map((d) => d.patternId),
    tokenProvenance: { color: output.tokens.color.provenance, typography: output.tokens.typography.provenance },
    formContracts,
    rulesCited: [...new Set([...rulesCitedBy(model), ...(css.match(/DD-\d{3}/g) ?? [])])].sort(),
    seoUnresolved: output.seoArtifacts.unresolved.length,
    seoApprovalsRequired: output.seoArtifacts.approvalsRequired.length,
    engagement: {
      decision: output.engagement.decision,
      decisionRecordId: output.engagement.decisionRecordId,
      experiences: model.engagement,
      staticAlternative: output.engagement.noExperience?.staticAlternative ?? null,
      delivery: deliverySpecs,
      reconciliation,
      runtime:
        staticRoutesWithRuntime.length > 0 || nextLayoutHasRuntime
          ? { path: EXPERIENCE_RUNTIME_PATH, bytes: runtimeBuffer.length, gzipBytes: gzipSync(runtimeBuffer, { level: 9 }).length, staticRoutes: staticRoutesWithRuntime, nextLayout: nextLayoutHasRuntime }
          : null,
    },
    dataset,
    pageAllocation: output.pageAllocation,
    conversions: model.conversionDeliveries,
    contentDrafts: { published: [...content.drafts.published.values()], held: content.drafts.held, rejected: content.drafts.rejected },
    dependencyAdmission: output.dependencyAdmission,
    indexability,
    integrity,
    contentSlots: content.slots.filter((s) => !s.hidden).length,
    hiddenSections: content.slots.filter((s) => s.hidden).length,
    refinementInput: {
      level: output.quality.evaluation.level,
      unknownGates: output.quality.evaluation.unknownGates,
      failedGates: output.quality.evaluation.failedGates,
      blockers: [
        ...output.quality.blockers,
        ...(dataset.classification === "synthetic" ? [`synthetic dataset (${dataset.markers.slice(0, 3).join("; ")}): generated from test data, never publishable as a customer site`] : []),
        ...indexability.duplicates.map((d) => `duplicate indexable pages ${d.routes.join(" and ")} (similarity ${d.similarity})`),
        ...indexability.placeholders.map((p) => `indexable page ${p.route} renders placeholder text (${p.slots} slot(s), ${p.pending} pending marker(s))`),
        ...content.drafts.held.map((d) => `AI draft for ${d.target} is held awaiting approval`),
      ],
    },
  };

  return { files, pages, manifest, refusals: model.refusals, model, content };
}
