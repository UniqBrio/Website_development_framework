/**
 * EXPERIENCE DELIVERY CONTRACT — decision → spec → generator → rendered → reconciled.
 *
 *   EngagementOpportunityDecision   what SHOULD exist (decide.ts, unchanged)
 *          ↓ planExperienceDelivery()
 *   ExperienceDeliverySpec[]        exactly one per SELECTED opportunity, never more
 *          ↓ buildComponentModel()  renders ONLY DELIVERABLE specs
 *   rendered experience nodes
 *          ↓ reconcileExperienceDelivery()
 *   consistent | problems           generation refuses to emit on any mismatch
 *
 * The planner never looks at the registry for candidates: its input is the list of
 * SELECTED opportunities, so a category that merely exists — or was rejected —
 * cannot produce a spec, and a node without a spec fails reconciliation.
 *
 * DELIVERY_UNAVAILABLE is a deterministic, first-class result: reason, blockers
 * (the exact item and the state it must reach), safe fallback, decision record id.
 * It never silently substitutes another experience.
 */
import type { BusinessInput } from "../design-intelligence/types/business-input.js";
import type { PageSpec } from "../generation/page-spec.js";
import type { ResolvedContent } from "../generation/content-values.js";
import {
  resolveCalculator,
  resolveDecisionFlow,
  type CalculatorDefinition,
  type DecisionFlowDefinition,
  type ProvenanceLine,
  type ValueStatus,
} from "../content/engagement-values.js";
import { EXPERIENCE_PATTERNS } from "./experience-patterns.js";
import { OPPORTUNITY_REGISTRY } from "./registry.js";
import type { ComparisonTable } from "../generation/content-values.js";
import type { EngagementOpportunityDecision, ExperiencePatternId, Placement, SelectedOpportunity } from "./types.js";
import type { EngagementCategoryId } from "./vocabulary.js";

export type DeliveryType = "comparison" | "calculator" | "decision_flow" | "existing_section" | "none";

export type DeliveryDefinition =
  | { type: "comparison"; table: ComparisonTable; source: string }
  | { type: "calculator"; calculator: CalculatorDefinition }
  | { type: "decision_flow"; flow: DecisionFlowDefinition; offerRoutes: Record<string, string> }
  | { type: "existing_section"; section: "booking" | "enquiry" };

export interface ResponsiveContract {
  narrowPhone: string;
  largerPhone: string;
  tablet: string;
  desktop: string;
  coarsePointer: string;
  noHover: string;
}

export interface DeliveryPerformance {
  clientJavaScript: "none" | "shared_runtime";
  /** DERIVED from the generated runtime file (not a registry estimate). */
  runtimeBytes: number;
  runtimeGzipBytes: number;
  /** Bytes of the non-executing JSON data block embedded in the page. */
  inlineDataBytes: number;
  loading: "none" | "defer";
  staticFallbackAvailable: boolean;
  routeBudgetKb: number;
  /** Budget left for this experience after every other planned enhancement. */
  remainingBudgetKb: number;
  deliveredKb: number;
  withinBudget: boolean;
  evidenceKind: "derived";
}

export interface ExperienceDeliverySpec {
  specId: string;
  decisionRecordId: string;
  category: EngagementCategoryId;
  role: "primary" | "secondary";
  score: number;
  experiencePattern: ExperiencePatternId | null;
  deliveryType: DeliveryType;
  status: "DELIVERABLE" | "DELIVERY_UNAVAILABLE";
  /** interactive = enhancement + static explanation; static = no enhancement exists; fallback-only = kill switch. */
  mode: "interactive" | "static" | "static_fallback_only" | "existing_section" | null;
  reason: string;
  dataStatus: ValueStatus | "not_required";
  provenance: ProvenanceLine[];
  /** Every item that blocks delivery and the state it must reach. Empty when DELIVERABLE. */
  blockers: string[];
  route: string;
  section: Placement["section"];
  definition: DeliveryDefinition | null;
  fallback: { kind: "static_equivalent_rendered" | "existing_page_content"; description: string };
  accessibility: string[];
  responsive: ResponsiveContract;
  performance: DeliveryPerformance;
  seo: string[];
  analytics: string[];
  approvals: string[];
}

const DELIVERY_BY_PATTERN: Partial<Record<ExperiencePatternId, DeliveryType>> = {
  comparison: "comparison",
  calculator: "calculator",
  assessment: "decision_flow",
  guided_selector: "decision_flow",
  booking: "existing_section",
  progressive_form: "existing_section",
};

export const RESPONSIVE_CONTRACTS: Record<Exclude<DeliveryType, "none">, ResponsiveContract> = {
  comparison: {
    narrowPhone: "real table inside a labelled, focusable horizontal scroll region; the page itself never overflows",
    largerPhone: "same scroll region; fewer columns need scrolling",
    tablet: "full table in most cases; the region scrolls only if the criteria exceed the width",
    desktop: "full table bounded to the large container",
    coarsePointer: "the region scrolls by touch; no control is smaller than the site target size",
    noHover: "no hover state carries information",
  },
  calculator: {
    narrowPhone: "one input per row at full width, numeric keypad (inputmode=decimal); result under the buttons in reading order",
    largerPhone: "one input per row",
    tablet: "inputs in an auto-fit grid (minimum 16rem per input)",
    desktop: "inputs grid bounded to the reading measure; the explanation follows the result",
    coarsePointer: "inputs and buttons at least 44 CSS px tall (RF-006)",
    noHover: "no hover state carries information",
  },
  decision_flow: {
    narrowPhone: "questions stacked; each option a full-width labelled row",
    largerPhone: "questions stacked; full-width option rows",
    tablet: "options wrap into two columns for a question with four or more options",
    desktop: "options in columns, bounded to the reading measure",
    coarsePointer: "each option row at least 44 CSS px tall; the whole label activates the radio",
    noHover: "no hover state carries information",
  },
  existing_section: {
    narrowPhone: "inherits the form contract's responsive behaviour",
    largerPhone: "inherits the form contract",
    tablet: "inherits the form contract",
    desktop: "inherits the form contract",
    coarsePointer: "inherits the site target size",
    noHover: "no hover state carries information",
  },
};

const NO_RESPONSIVE: ResponsiveContract = {
  narrowPhone: "nothing delivered",
  largerPhone: "nothing delivered",
  tablet: "nothing delivered",
  desktop: "nothing delivered",
  coarsePointer: "nothing delivered",
  noHover: "nothing delivered",
};

export interface DeliveryPlanContext {
  input: BusinessInput;
  decision: EngagementOpportunityDecision;
  content: ResolvedContent;
  pages: readonly PageSpec[];
  /** The planned budget after every enhancement (performanceStrategy). */
  budget: { routeJsKb: number; plannedFinalKb: number };
  /** Bytes of the generated runtime file, derived from the file the generator writes. */
  runtime: { bytes: number; gzipBytes: number };
  /** Serialised JSON data size for a definition — the renderer's own serialiser. */
  dataBytes: (specId: string, definition: DeliveryDefinition) => number;
  /** Host kill switch. "disabled" renders the static equivalent only, with no script. */
  experiences: "enabled" | "disabled";
}

export function planExperienceDelivery(ctx: DeliveryPlanContext): ExperienceDeliverySpec[] {
  const { decision } = ctx;
  const selected: Array<{ opportunity: SelectedOpportunity; role: "primary" | "secondary" }> = [
    ...(decision.primaryOpportunity ? [{ opportunity: decision.primaryOpportunity, role: "primary" as const }] : []),
    ...decision.secondaryOpportunities.map((opportunity) => ({ opportunity, role: "secondary" as const })),
  ];
  return selected.map(({ opportunity, role }) => planOne(ctx, opportunity, role));
}

function planOne(ctx: DeliveryPlanContext, opportunity: SelectedOpportunity, role: "primary" | "secondary"): ExperienceDeliverySpec {
  const category = OPPORTUNITY_REGISTRY[opportunity.category];
  const pattern = opportunity.experiencePattern ? EXPERIENCE_PATTERNS[opportunity.experiencePattern] : undefined;
  const deliveryType: DeliveryType = opportunity.experiencePattern ? (DELIVERY_BY_PATTERN[opportunity.experiencePattern] ?? "none") : "none";
  const route = opportunity.placement.route ?? ctx.pages[0]?.route ?? "/";
  const plannedEstimate = pattern?.performance.estimatedRouteJsKb ?? category.estimatedRouteJsKb;
  const remainingBudgetKb = Math.max(0, ctx.budget.routeJsKb - (ctx.budget.plannedFinalKb - plannedEstimate));

  const base = {
    specId: `experience-${opportunity.category}`,
    decisionRecordId: ctx.decision.decisionRecordId,
    category: opportunity.category,
    role,
    score: opportunity.score,
    experiencePattern: opportunity.experiencePattern,
    deliveryType,
    route,
    section: opportunity.placement.section,
    accessibility: [...(pattern?.accessibility ?? [])],
    seo: [...(pattern?.seo ?? [])],
    analytics: [...(pattern?.analyticsEvents ?? [])],
  };

  const performance = (clientJs: boolean, definition: DeliveryDefinition | null, staticFallback: boolean): DeliveryPerformance => {
    const runtimeBytes = clientJs ? ctx.runtime.bytes : 0;
    const runtimeGzipBytes = clientJs ? ctx.runtime.gzipBytes : 0;
    const inlineDataBytes = clientJs && definition ? ctx.dataBytes(base.specId, definition) : 0;
    const deliveredKb = Math.round(((runtimeGzipBytes + inlineDataBytes) / 1024) * 10) / 10;
    return {
      clientJavaScript: clientJs ? "shared_runtime" : "none",
      runtimeBytes,
      runtimeGzipBytes,
      inlineDataBytes,
      loading: clientJs ? "defer" : "none",
      staticFallbackAvailable: staticFallback,
      routeBudgetKb: ctx.budget.routeJsKb,
      remainingBudgetKb,
      deliveredKb,
      withinBudget: deliveredKb <= remainingBudgetKb,
      evidenceKind: "derived",
    };
  };

  const unavailable = (reason: string, dataStatus: ExperienceDeliverySpec["dataStatus"], provenance: ProvenanceLine[], blockers: string[]): ExperienceDeliverySpec => ({
    ...base,
    status: "DELIVERY_UNAVAILABLE",
    mode: null,
    reason,
    dataStatus,
    provenance,
    blockers,
    definition: null,
    fallback: {
      kind: "existing_page_content",
      description: `no experience markup is rendered; the page keeps its existing content and conversion route. The decision's static alternative stands: ${category.staticAlternative}`,
    },
    responsive: NO_RESPONSIVE,
    performance: performance(false, null, false),
    approvals: [`engagement ${opportunity.category}: DELIVERY_UNAVAILABLE — ${reason}${blockers.length > 0 ? ` (${blockers.join("; ")})` : ""}`],
  });

  if (deliveryType === "none") {
    return unavailable(
      opportunity.implementationStatus === "registry_only"
        ? `"${opportunity.category}" is registry-only: this framework version has no delivery capability for it`
        : `pattern "${opportunity.experiencePattern}" has no delivery type in this framework version`,
      "not_required",
      [],
      [],
    );
  }

  // ---------------------------------------------------------------- existing section (booking / progressive form)
  if (deliveryType === "existing_section") {
    const section = opportunity.experiencePattern === "booking" ? "booking" : "enquiry";
    const page = ctx.pages.find((p) => p.requiredSections.includes(section));
    if (!page) return unavailable(`maps to the ${section} section, but no page carries one`, "not_required", [], []);
    return {
      ...base,
      route: page.route,
      status: "DELIVERABLE",
      mode: "existing_section",
      reason: `served by the existing ${section} section and its form contract; no second form is emitted`,
      dataStatus: "not_required",
      provenance: [],
      blockers: [],
      definition: { type: "existing_section", section },
      fallback: { kind: "existing_page_content", description: `the ${section} form contract's own no-JavaScript behaviour` },
      responsive: RESPONSIVE_CONTRACTS.existing_section,
      performance: performance(false, null, true),
      approvals: [],
    };
  }

  // ---------------------------------------------------------------- comparison (reference implementation)
  if (deliveryType === "comparison") {
    const c = ctx.content.comparison;
    if (c?.state !== "supplied") {
      const inventoryRefusal = c?.state === "refused" && c.because.includes("inventory");
      const reason = c?.state === "refused" ? `comparison values refused: ${c.because}` : "no verified comparison values were supplied; nothing is invented";
      return unavailable(reason, c === null ? "unavailable" : inventoryRefusal ? "unverified" : "unavailable", [], [reason]);
    }
    const definition: DeliveryDefinition = { type: "comparison", table: c.value, source: c.source };
    return {
      ...base,
      status: "DELIVERABLE",
      mode: "static",
      reason: `semantic comparison table from verified values (${c.source})`,
      dataStatus: "verified",
      provenance: [{ item: "comparison table", provenance: "customer_supplied_verified", source: c.source, approvedBy: null, status: "verified", reason: "inventory comparisonData verified and every row names an owner-supplied offer" }],
      blockers: [],
      definition,
      fallback: { kind: "static_equivalent_rendered", description: "the table itself: it needs no JavaScript" },
      responsive: RESPONSIVE_CONTRACTS.comparison,
      performance: performance(false, definition, true),
      approvals: [],
    };
  }

  // ---------------------------------------------------------------- calculator and decision flow (governed values)
  const resolved =
    deliveryType === "calculator"
      ? resolveCalculator(ctx.input, opportunity.category, category.requiredData, ctx.content.engagementDefinitions.calculators)
      : resolveDecisionFlow(
          ctx.input,
          opportunity.category,
          opportunity.experiencePattern === "guided_selector" ? "selector" : "assessment",
          category.requiredData,
          ctx.content.engagementDefinitions.decisionFlows,
        );

  if (resolved.status !== "verified" || !resolved.definition) {
    const noun = deliveryType === "calculator" ? "formula" : "decision rules";
    return unavailable(`${noun} ${resolved.status}: only verified ${noun} may produce a public ${opportunity.label.toLowerCase()}`, resolved.status, resolved.provenance, resolved.blockers);
  }

  const offerRoutes: Record<string, string> = {};
  for (const page of ctx.pages) if (page.offerName) offerRoutes[page.offerName] = page.route;
  const definition: DeliveryDefinition =
    deliveryType === "calculator"
      ? { type: "calculator", calculator: resolved.definition as CalculatorDefinition }
      : { type: "decision_flow", flow: resolved.definition as DecisionFlowDefinition, offerRoutes };

  const interactive = ctx.experiences === "enabled";
  const perf = performance(interactive, definition, true);
  if (interactive && !perf.withinBudget) {
    return unavailable(
      `delivered cost ${perf.deliveredKb}KB (derived from the generated runtime and data) exceeds the ${perf.remainingBudgetKb}KB left in the route budget`,
      "verified",
      resolved.provenance,
      [],
    );
  }
  const id = deliveryType === "calculator" ? (resolved.definition as CalculatorDefinition).formula : (resolved.definition as DecisionFlowDefinition).ruleSet;
  return {
    ...base,
    status: "DELIVERABLE",
    mode: interactive ? "interactive" : "static_fallback_only",
    reason: interactive
      ? `verified ${deliveryType === "calculator" ? "formula" : "rule set"} ${id.id} v${id.version}; enhancement plus static equivalent`
      : "host kill switch: the static equivalent renders without the enhancement or its script",
    dataStatus: "verified",
    provenance: resolved.provenance,
    blockers: [],
    definition,
    fallback: {
      kind: "static_equivalent_rendered",
      description:
        deliveryType === "calculator"
          ? "how the result is calculated — inputs, constants, formula in the owner's words, assumptions, worked examples, limitations — as static HTML that stays visible with or without JavaScript"
          : "every question and the criteria for every outcome as static HTML that stays visible with or without JavaScript",
    },
    responsive: RESPONSIVE_CONTRACTS[deliveryType],
    performance: perf,
    approvals: [`engagement ${opportunity.category}: owner review of the rendered ${opportunity.label.toLowerCase()} against ${deliveryType === "calculator" ? "formula" : "rule set"} ${id.id} v${id.version} before publication`],
  };
}

// ------------------------------------------------------------------ reconciliation

export interface RenderedExperience {
  specId: string;
  category: string;
  route: string;
  nodeId: string;
  mode: string;
}

export interface ReconciliationEntry {
  specId: string;
  category: EngagementCategoryId;
  status: ExperienceDeliverySpec["status"];
  mode: ExperienceDeliverySpec["mode"];
  rendered: boolean;
  route: string;
  nodeIds: string[];
}

export interface DeliveryReconciliation {
  consistent: boolean;
  problems: string[];
  entries: ReconciliationEntry[];
}

export function reconcileExperienceDelivery(
  decision: EngagementOpportunityDecision,
  specs: readonly ExperienceDeliverySpec[],
  rendered: readonly RenderedExperience[],
  scripts: { staticRoutesWithRuntime: readonly string[]; nextLayoutHasRuntime: boolean; existingSectionRoutes: ReadonlyMap<string, readonly string[]> },
): DeliveryReconciliation {
  const problems: string[] = [];
  const selected = [decision.primaryOpportunity, ...decision.secondaryOpportunities].filter((o): o is SelectedOpportunity => o !== null);
  const selectedIds = new Set(selected.map((o) => o.category));

  // 1. decision ↔ specs: exactly one spec per selected opportunity, none for anything else.
  for (const o of selected) {
    const count = specs.filter((s) => s.category === o.category).length;
    if (count !== 1) problems.push(`selected opportunity "${o.category}" has ${count} delivery specs (expected exactly 1)`);
  }
  for (const s of specs) {
    if (!selectedIds.has(s.category)) problems.push(`delivery spec "${s.specId}" exists for "${s.category}", which the decision did not select`);
    if (s.decisionRecordId !== decision.decisionRecordId) problems.push(`delivery spec "${s.specId}" cites record "${s.decisionRecordId}", not "${decision.decisionRecordId}"`);
  }

  // 2. rendered ↔ specs: every node traces to a DELIVERABLE spec of a SELECTED category.
  for (const r of rendered) {
    const spec = specs.find((s) => s.specId === r.specId);
    if (!spec) problems.push(`rendered experience "${r.nodeId}" on ${r.route} has no delivery spec (category "${r.category}")`);
    else if (spec.status !== "DELIVERABLE") problems.push(`rendered experience "${r.nodeId}" belongs to "${spec.specId}", which is ${spec.status}`);
    if (!selectedIds.has(r.category as EngagementCategoryId)) problems.push(`experience "${r.category}" rendered on ${r.route} but was not selected by the decision`);
  }

  // 3. specs ↔ rendered: a DELIVERABLE rendered experience appears exactly once, on its route.
  const entries: ReconciliationEntry[] = specs.map((s) => {
    const nodes = rendered.filter((r) => r.specId === s.specId);
    let isRendered = nodes.length > 0;
    if (s.status === "DELIVERABLE" && s.mode !== "existing_section") {
      if (nodes.length !== 1) problems.push(`DELIVERABLE "${s.specId}" rendered ${nodes.length} time(s) (expected 1)`);
      if (nodes.some((n) => n.route !== s.route)) problems.push(`"${s.specId}" rendered off its placement route ${s.route}`);
    }
    if (s.status === "DELIVERABLE" && s.mode === "existing_section" && s.definition?.type === "existing_section") {
      const routes = scripts.existingSectionRoutes.get(s.definition.section) ?? [];
      isRendered = routes.includes(s.route);
      if (!isRendered) problems.push(`"${s.specId}" maps to the ${s.definition.section} section, which is not rendered on ${s.route}`);
    }
    if (s.status === "DELIVERY_UNAVAILABLE" && nodes.length > 0) problems.push(`"${s.specId}" is DELIVERY_UNAVAILABLE but rendered`);
    return { specId: s.specId, category: s.category, status: s.status, mode: s.mode, rendered: isRendered, route: s.route, nodeIds: nodes.map((n) => n.nodeId) };
  });

  // 4. script ↔ interactive experiences: the runtime ships only where an enhancement needs it.
  const interactiveRoutes = new Set(rendered.filter((r) => r.mode === "interactive").map((r) => r.route));
  for (const route of scripts.staticRoutesWithRuntime) {
    if (!interactiveRoutes.has(route)) problems.push(`static page ${route} loads the experience runtime but carries no interactive experience`);
  }
  for (const route of interactiveRoutes) {
    if (!scripts.staticRoutesWithRuntime.includes(route)) problems.push(`static page ${route} carries an interactive experience but does not load the runtime`);
  }
  if (scripts.nextLayoutHasRuntime !== interactiveRoutes.size > 0) {
    problems.push(`Next layout ${scripts.nextLayoutHasRuntime ? "loads" : "does not load"} the runtime while ${interactiveRoutes.size} interactive experience route(s) exist`);
  }

  return { consistent: problems.length === 0, problems, entries };
}
