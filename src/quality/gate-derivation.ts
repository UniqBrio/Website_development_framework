/**
 * Gate derivation — P0-3, extended by the P1 foundation.
 *
 * P0-3 made the quality engine reachable. The P1 pass makes the evidence it
 * consumes HONEST:
 *
 *  - Evidence is tagged (`measured | derived | estimated | unavailable`) and a
 *    gate requiring a measurement reads it through `requireMeasured`, so the
 *    responsive registry's estimated `weightKb` cannot satisfy a performance
 *    gate. That substitution was possible before, because the field was a bare
 *    number.
 *  - Accessibility runs through `evaluateAccessibility`, which preserves the
 *    REQUESTED target and returns `unknown` when a mandatory criterion cannot be
 *    classified. AAA is therefore enforced rather than stated.
 *  - SEO is scored from MEASURED served HTML, not from the plan.
 */
import type { GateStatus, ScoreSheet } from "./scoring.js";
import { evaluateQuality, type QualityEvaluation, type TargetQualityLevel } from "./scoring.js";
import { seoScore } from "../seo/strategy.js";
import {
  evaluateAccessibility,
  thresholdsFor,
  type AaaObservations,
  type AccessibilityEvaluation,
  type AccessibilityTarget,
} from "../accessibility/evaluate.js";
import type { VerificationReport } from "../content/verification.js";
import type { BudgetVerdict } from "../performance/budgets.js";
import type { ResponsiveAudit } from "../responsive/transformations.js";
import type { ObjectiveCoverageReport } from "../design-intelligence/objectives/objective-architecture.js";
import type { EvaluationConflict } from "../design-intelligence/engine/evaluator.js";
import type { DesignTokenContract } from "../design-system/tokens/token-contract.js";
import type { SeoArtifactPlan } from "../seo/artifacts.js";
import type { PageSpec } from "../generation/page-spec.js";
import { analyseIndexability,
  compareRouteInventory,
  seoObservationsFromHtml,
  type BuildEvidenceBundle,
  type RouteInventoryComparison,
} from "../evidence/build-evidence.js";
import {
  describeEvidence,
  requireGrounded,
  requireMeasured,
  type EvidenceShortfall,
} from "../evidence/evidence-value.js";

/** Post-build evidence plus the AAA-only observations, which only AAA requires. */
export interface BuildEvidence {
  bundle: BuildEvidenceBundle;
  aaa?: AaaObservations;
  /**
   * FD-09: what generation itself could not deliver and must block publication —
   * `GenerationManifest.integrity.publicationBlockers`. The decision pipeline has no
   * supplied content, so only generation can know an approved value found no page.
   */
  generation?: { publicationBlockers: readonly string[] };
}

export interface DecisionState {
  contentPlan: VerificationReport;
  performance: BudgetVerdict;
  responsive: ResponsiveAudit;
  objectiveCoverage: ObjectiveCoverageReport;
  conflicts: readonly EvaluationConflict[];
  responsiveInventorySize: number;
  /** P1-2: token values, so the design gate can require them. */
  tokens: DesignTokenContract;
  /** P1-1: SEO artifacts, so the SEO gate can require them. */
  seoArtifacts: SeoArtifactPlan;
  /** P0-4: the page model, for the route-inventory cross-check. */
  pages: readonly PageSpec[];
  accessibilityTarget: AccessibilityTarget;
  /** DD-112: the owner's stated target level. Defaults to professionally_designed. */
  targetQuality?: TargetQualityLevel;
  /** DD-120: the selection engine's below-minimum note, when it raised one. */
  selectionBelowMinimum?: string | null;
  /**
   * The DECLARED dependency sets. `runtime` comes from the stack decision
   * (stack/runtime-packages.ts); `toolchain` from host/toolchain.ts. A measured
   * install containing anything else fails the technical gate.
   */
  declaredDependencies?: { runtime: readonly string[]; toolchain: readonly string[] };
}

/**
 * The dependency gate at the host boundary. Before a host existed, the
 * dependency list was measured and compared with nothing, so an install could
 * drift from the stack decision silently.
 */
function dependencyViolations(state: DecisionState, evidence?: BuildEvidence): string[] {
  const declared = state.declaredDependencies;
  if (!declared || !evidence) return [];
  const violations: string[] = [];
  const runtime = requireMeasured(evidence.bundle.dependencies);
  if (runtime) {
    for (const name of runtime) {
      if (!declared.runtime.includes(name)) {
        violations.push(`undeclared runtime dependency "${name}" — the stack decision did not select it`);
      }
    }
    for (const name of declared.runtime) {
      if (!runtime.includes(name)) {
        violations.push(`declared runtime dependency "${name}" is not installed`);
      }
    }
  }
  const toolchain = requireMeasured(evidence.bundle.toolchain);
  if (toolchain) {
    for (const name of toolchain) {
      if (!declared.toolchain.includes(name)) {
        violations.push(`undeclared toolchain dependency "${name}" — not in the host toolchain contract`);
      }
    }
  }
  return violations;
}

export interface QualityAssessment {
  evaluation: QualityEvaluation;
  gates: GateStatus;
  sheet: ScoreSheet;
  /** The full accessibility contract: target, criteria, statuses. */
  accessibility: AccessibilityEvaluation;
  mode: "pre_build" | "post_build";
  blockers: string[];
  /** Gates that could not be decided, and what evidence they needed. */
  shortfalls: EvidenceShortfall[];
  /** Provenance of every evidence field, for the report. */
  evidenceProvenance: string[];
  routeInventory: RouteInventoryComparison;
  /**
   * Non-blocking observations that affect the reading of the score (DD-120
   * below-minimum, DD-112 target gap). Never a blocker; always reported.
   */
  notes: string[];
}

/** "1 slot" / "1 slot, 49 pending markers" — both kinds are placeholder text (FD-06). */
export function placeholderCounts(p: { slots: number; pending: number }): string {
  const parts = [`${p.slots} slot${p.slots === 1 ? "" : "s"}`];
  if (p.pending > 0) parts.push(`${p.pending} pending marker${p.pending === 1 ? "" : "s"}`);
  return parts.join(", ");
}

/** DD-110: a fabricated or unverified public claim blocks production. */
function contentGate(
  state: DecisionState,
  evidence?: BuildEvidence,
): { outcome: GateStatus["content"]; reasons: string[] } {
  const reasons: string[] = [];
  if (state.contentPlan.blockedConversionPaths.length > 0) {
    reasons.push(
      `blocked conversion path(s): ${state.contentPlan.blockedConversionPaths.join("; ")}`,
    );
  }
  // A conversion path the PLAN represents is still blocked when no SERVED page
  // lets a visitor complete it. Only measured served HTML can show this; without
  // it the plan-level check above stands (customer dry run 2026-09-14: a lead
  // objective "served" by a disabled form and an email rendered on no page).
  const html = evidence ? requireMeasured(evidence.bundle.servedHtml) : null;
  const surfaces = state.objectiveCoverage.entries
    .filter((e) => e.served)
    .map((e) => `${e.objective} (${e.conversionSurface})`);
  if (html && html.length > 0 && surfaces.length > 0 && html.every((f) => f.conversionActions === 0)) {
    reasons.push(
      `measured: none of ${html.length} served page(s) offers a completable conversion action (an enabled form with an action, or a mailto:/tel:/WhatsApp link), so ${surfaces.join(", ")} cannot convert`,
    );
  }
  // FD-09: supplied or approved content that no page renders blocks publication.
  for (const blocker of evidence?.generation?.publicationBlockers ?? []) {
    reasons.push(`generation: ${blocker}`);
  }
  // P1-7: an indexable page must not publish placeholder text or another page's body.
  if (html && html.length > 0) {
    const findings = analyseIndexability(html);
    for (const d of findings.duplicates) {
      reasons.push(`measured: indexable pages ${d.routes[0]} and ${d.routes[1]} serve near-duplicate main content (similarity ${d.similarity}) — a duplicate indexable page (§I, DD-093)`);
    }
    if (findings.placeholders.length > 0) {
      reasons.push(`measured: ${findings.placeholders.length} indexable page(s) serve placeholder text a search engine would index: ${findings.placeholders.map((p) => `${p.route} (${placeholderCounts(p)})`).join(", ")}`);
    }
  }
  return { outcome: reasons.length === 0, reasons };
}

/**
 * PERFORMANCE gate (§L.4).
 *
 * The budget plan is knowable pre-build, but a PLAN is not a MEASUREMENT. Real
 * route JS must arrive as `measured`; an estimate is refused explicitly.
 */
function performanceGate(
  state: DecisionState,
  evidence?: BuildEvidence,
): { outcome: GateStatus["performance"]; reasons: string[]; shortfall?: EvidenceShortfall } {
  const reasons: string[] = [];
  if (!state.performance.withinBudget) {
    return {
      outcome: false,
      reasons: [
        `planned route JS ${state.performance.finalKb}KB exceeds the ${state.performance.budgetKb}KB budget`,
      ],
    };
  }

  const bundles = evidence ? requireMeasured(evidence.bundle.bundles) : null;
  const vitals = evidence ? requireMeasured(evidence.bundle.webVitals) : null;

  if (!bundles) {
    return {
      outcome: "unknown",
      reasons: ["the plan fits its budget, but no MEASURED bundle exists"],
      shortfall: {
        gate: "performance",
        needs: "measured per-route first-load JS from a production build manifest",
        had: evidence?.bundle.bundles.kind ?? "unavailable",
        detail:
          "a planned budget and the responsive registry's estimated weightKb are both ESTIMATES; neither may satisfy this gate",
      },
    };
  }

  const overBudget = bundles.filter((b) => b.firstLoadJsKb > state.performance.budgetKb);
  if (overBudget.length > 0) {
    for (const route of overBudget) {
      reasons.push(
        `MEASURED first-load JS on ${route.route} is ${route.firstLoadJsKb}KB, over the ${state.performance.budgetKb}KB budget`,
      );
    }
    return { outcome: false, reasons };
  }

  if (!vitals) {
    return {
      outcome: "unknown",
      reasons: [`measured bundles are within budget, but Core Web Vitals were not measured`],
      shortfall: {
        gate: "performance",
        needs: "field p75 or throttled lab LCP/INP/CLS",
        had: evidence?.bundle.webVitals.kind ?? "unavailable",
        detail: "§L.4 requires the vitals budget to pass, which needs a measurement",
      },
    };
  }

  const vitalsFailures: string[] = [];
  if (vitals.lcpSeconds > 2.5) vitalsFailures.push(`LCP ${vitals.lcpSeconds}s > 2.5s`);
  if (vitals.inpMs > 200) vitalsFailures.push(`INP ${vitals.inpMs}ms > 200ms`);
  if (vitals.cls > 0.1) vitalsFailures.push(`CLS ${vitals.cls} > 0.1`);
  if (vitalsFailures.length > 0) return { outcome: false, reasons: vitalsFailures };

  return {
    outcome: true,
    reasons: [
      `measured bundles within budget and ${vitals.measurement} vitals pass (LCP ${vitals.lcpSeconds}s, INP ${vitals.inpMs}ms, CLS ${vitals.cls})`,
    ],
  };
}

function responsiveGate(
  state: DecisionState,
  evidence?: BuildEvidence,
): { outcome: GateStatus["responsive"]; reasons: string[]; shortfall?: EvidenceShortfall } {
  // A MEASURED sweep, when one exists, decides; the decision-derived audit below
  // is the pre-build answer only. The audit's own "core content lost" still fails.
  const sweep = evidence ? requireMeasured(evidence.bundle.responsive) : null;
  if (sweep && state.responsive.coreContentPreserved) {
    const failures = sweep.profiles.flatMap((p) => p.failures.map((f) => `${p.name} (${p.engine}): ${f}`));
    if (failures.length > 0) return { outcome: false, reasons: failures };
    const missing = sweep.profiles.filter((p) => p.mandatory && !p.available);
    if (missing.length > 0) {
      return {
        outcome: "unknown",
        reasons: missing.map((p) => `mandatory profile ${p.name} (${p.engine}) did not run: ${p.reason ?? "unavailable"}`),
        shortfall: {
          gate: "responsive",
          needs: `the responsive_matrix.md TIER 1 profiles in both engines: missing ${missing.map((p) => p.name).join(", ")}`,
          had: "measured",
          detail: "a TIER 1 profile that did not run is untested, not passed",
        },
      };
    }
    return {
      outcome: true,
      reasons: [`measured at ${sweep.profiles.filter((p) => p.available).length} profiles across both engines: no overflow, no undersized touch target, no content lost without JavaScript`],
    };
  }
  if (state.responsiveInventorySize === 0) {
    return {
      outcome: "unknown",
      reasons: ["the responsive audit ran over an EMPTY component inventory, so it proves nothing"],
    };
  }
  if (!state.responsive.coreContentPreserved) {
    return { outcome: false, reasons: ["core content is lost at one or more capability profiles"] };
  }
  return {
    outcome: true,
    reasons: [
      `${state.responsive.decisions.length} transformations over ${state.responsiveInventorySize} components; core content preserved`,
    ],
  };
}

/**
 * DESIGN gate (§L.6). Now also requires TOKEN VALUES: §L.6's first item is
 * "design_tokens_consistent", which cannot be true when no token exists.
 */
function designGate(state: DecisionState): { outcome: GateStatus["design"]; reasons: string[] } {
  const reasons: string[] = [];
  if (!state.objectiveCoverage.complete) {
    reasons.push(`unserved objective(s): ${state.objectiveCoverage.unserved.join(", ")}`);
  }
  if (state.conflicts.length > 0) {
    reasons.push(`unresolved rule conflict(s) on: ${state.conflicts.map((c) => c.target).join(", ")}`);
  }
  if (!state.tokens.valid) {
    reasons.push(
      `design tokens are not valid: ${state.tokens.problems.filter((p) => p.startsWith("contrast FAIL") || p.startsWith("token parity")).join("; ")}`,
    );
  }
  const themes = Object.keys(state.tokens.color.values.semantic);
  if (themes.length === 0) {
    reasons.push("no colour tokens were produced at all");
  }
  return { outcome: reasons.length === 0, reasons };
}

/**
 * SEO gate. Pre-build it can only check the PLAN's completeness; the score needs
 * measured served HTML.
 */
function seoGateAndScore(
  state: DecisionState,
  evidence?: BuildEvidence,
): { score: ScoreSheet[string]; reasons: string[]; shortfall?: EvidenceShortfall } {
  const html = evidence ? requireMeasured(evidence.bundle.servedHtml) : null;
  if (!html || html.length === 0) {
    return {
      score: {
        scored: false,
        reason:
          "SEO artifacts are planned but no SERVED HTML has been fetched; §I evidence is the served document, not the plan",
      },
      reasons: [],
      shortfall: {
        gate: "seo",
        needs: "served HTML per route, fetched with JavaScript not executed",
        had: evidence?.bundle.servedHtml.kind ?? "unavailable",
        detail: "a plan cannot evidence itself",
      },
    };
  }

  // Score the WORST page: a site is as findable as its weakest indexable page.
  let worst = 10;
  let worstEvidence = "";
  for (const facts of html) {
    const observations = seoObservationsFromHtml(facts, html);
    const result = seoScore(observations);
    if (result.value <= worst) {
      worst = result.value;
      worstEvidence = `${facts.route}: ${result.evidence}`;
    }
  }
  return {
    score: { scored: true, value: worst, evidence: `worst page — ${worstEvidence}` },
    reasons: [],
  };
}

export function assessQuality(state: DecisionState, evidence?: BuildEvidence): QualityAssessment {
  const sheet: ScoreSheet = {};
  const shortfalls: EvidenceShortfall[] = [];

  const content = contentGate(state, evidence);
  const performance = performanceGate(state, evidence);
  const responsive = responsiveGate(state, evidence);
  if (responsive.shortfall) shortfalls.push(responsive.shortfall);
  const design = designGate(state);
  if (performance.shortfall) shortfalls.push(performance.shortfall);

  // ---- ACCESSIBILITY: the requested target drives the thresholds (P1-4).
  const accessibility = evaluateAccessibility(
    state.accessibilityTarget,
    evidence ? requireMeasured(evidence.bundle.accessibility) ?? undefined : undefined,
    evidence?.aaa ?? {},
  );
  if (accessibility.score !== null) {
    sheet["accessibility"] = {
      scored: true,
      value: accessibility.score,
      evidence: accessibility.explanation,
    };
  } else {
    sheet["accessibility"] = { scored: false, reason: accessibility.explanation };
    shortfalls.push({
      gate: "accessibility",
      needs: `observations for the ${state.accessibilityTarget} criteria: ${accessibility.unclassifiedMandatory.map((c) => c.id).join(", ")}`,
      had: evidence?.bundle.accessibility.kind ?? "unavailable",
      detail:
        "a mandatory criterion that cannot be classified is not a pass, so the gate stays unknown",
    });
  }

  // ---- TECHNICAL.
  const technical = evidence ? requireGrounded(evidence.bundle.technical) : null;
  const dependencyProblems = dependencyViolations(state, evidence);
  let technicalOutcome: GateStatus["technical"] = "unknown";
  if (technical) {
    technicalOutcome =
      technical.buildPasses &&
      technical.typecheckPasses &&
      technical.lintPasses &&
      technical.noBlockingConsoleErrors &&
      technical.primaryRoutesWork &&
      technical.loadingErrorNotFoundStatesExist &&
      technical.noExposedSecrets &&
      technical.experiencesWork !== false &&
      technical.navigationWorks !== false &&
      technical.staticLayerWorks !== false &&
      dependencyProblems.length === 0;
    sheet["technical_implementation"] = {
      scored: true,
      value: technicalOutcome ? 9 : 3,
      evidence: technicalOutcome
        ? "all §L.1 technical checks pass"
        : "one or more §L.1 checks fail",
    };
  } else {
    sheet["technical_implementation"] = { scored: false, reason: "no build has run" };
    shortfalls.push({
      gate: "technical",
      needs: "a production build, typecheck, lint and route smoke test",
      had: evidence?.bundle.technical.kind ?? "unavailable",
      detail: "§L.1 cannot be decided without a build",
    });
  }

  // ---- SEO.
  const seo = seoGateAndScore(state, evidence);
  sheet["seo"] = seo.score;
  if (seo.shortfall) shortfalls.push(seo.shortfall);

  // ---- Decision-derivable criteria.
  sheet["trust"] = {
    scored: true,
    value: content.outcome === true ? 8 : 4,
    evidence:
      content.outcome === true
        ? "no fabricated claim published and no conversion path blocked"
        : `content integrity issues: ${content.reasons.join("; ")}`,
  };
  const unreachable = content.reasons.find((r) => r.startsWith("measured: none of"));
  sheet["conversion"] = {
    scored: true,
    value: state.objectiveCoverage.complete && !unreachable ? 8 : 3,
    evidence: unreachable
      ? unreachable
      : state.objectiveCoverage.complete
        ? "every stated objective has architectural representation"
        : `unserved objectives: ${state.objectiveCoverage.unserved.join(", ")}`,
  };
  // P1-2: colour IS now measurable, from the generated contrast table.
  const contrastFailures = state.tokens.color.values.contrastFailures.length;
  sheet["color"] = {
    scored: true,
    value: contrastFailures > 0 ? 3 : state.tokens.color.values.drifted.length > 0 ? 7 : 9,
    evidence:
      contrastFailures > 0
        ? `${contrastFailures} measured contrast pair(s) fail`
        : `all ${state.tokens.color.values.contrast.length} measured pairs pass${state.tokens.color.values.drifted.length > 0 ? `, ${state.tokens.color.values.drifted.length} drifted` : ""}`,
  };
  sheet["typography"] = {
    scored: true,
    value: state.tokens.typography.provenance === "brand_derived" ? 8 : 7,
    evidence: `type scale and reading measure emitted; ${state.tokens.typography.source}`,
  };
  sheet["spacing"] = {
    scored: true,
    value: 8,
    evidence: `${Object.keys(state.tokens.spacing.values.scale).length}-step scale emitted, so no component needs an off-scale value`,
  };
  sheet["grid_consistency"] = {
    scored: true,
    value: 8,
    evidence: "container, breakpoint and column tokens emitted from the responsive ranges",
  };
  sheet["consistency"] = {
    scored: true,
    value: state.tokens.valid ? 8 : 5,
    evidence: state.tokens.valid
      ? "one token contract governs colour, type, spacing, radius, layout and motion"
      : `token contract has problems: ${state.tokens.problems.length}`,
  };

  if (state.responsiveInventorySize > 0) {
    sheet["responsive_behavior"] = {
      scored: true,
      value: state.responsive.coreContentPreserved ? 8 : 3,
      evidence: `${state.responsive.decisions.length} transformations over ${state.responsiveInventorySize} components`,
    };
    // A measured sweep replaces "not yet verified" in the evidence; it lowers the
    // value on a measured failure and never raises it (policy unchanged).
    const sweep = evidence ? requireMeasured(evidence.bundle.responsive) : null;
    const sweepFailures = sweep ? sweep.profiles.reduce((n, p) => n + p.failures.length, 0) : 0;
    sheet["mobile_experience"] = {
      scored: true,
      value: state.responsive.coreContentPreserved && sweepFailures === 0 ? 7 : 3,
      evidence: sweep
        ? `derived from the compact-range transformations; measured sweep over ${sweep.profiles.filter((p) => p.available).length} profile(s) found ${sweepFailures} failure(s) — emulated devices, not physical ones`
        : "derived from the compact-range transformations; not yet verified on a device",
    };
  } else {
    sheet["responsive_behavior"] = { scored: false, reason: "empty component inventory" };
    sheet["mobile_experience"] = { scored: false, reason: "empty component inventory" };
  }

  const measuredBundles = evidence ? requireMeasured(evidence.bundle.bundles) : null;
  if (measuredBundles && measuredBundles.length > 0) {
    const worstRoute = measuredBundles.reduce((a, b) =>
      a.firstLoadJsKb >= b.firstLoadJsKb ? a : b,
    );
    sheet["performance"] = {
      scored: true,
      value: worstRoute.firstLoadJsKb <= state.performance.budgetKb ? 8 : 3,
      evidence: `measured worst route ${worstRoute.route} at ${worstRoute.firstLoadJsKb}KB against a ${state.performance.budgetKb}KB budget`,
    };
  } else {
    sheet["performance"] = {
      scored: false,
      reason:
        "no MEASURED bundle; a planned budget and an estimated registry weight are not performance measurements",
    };
  }

  const gates: GateStatus = {
    technical: technicalOutcome,
    accessibility: accessibility.gate,
    responsive: responsive.outcome,
    performance: performance.outcome,
    content: content.outcome,
    design: design.outcome,
  };

  // DD-112: the stated target is compared, never inferred from the score.
  const evaluation = evaluateQuality(sheet, gates, state.targetQuality ?? "professionally_designed");
  const routeInventory = compareRouteInventory(
    state.pages,
    evidence?.bundle ?? {
      technical: { kind: "unavailable", source: "no evidence" },
      routeInventory: { kind: "unavailable", source: "no evidence" },
      servedHtml: { kind: "unavailable", source: "no evidence" },
      bundles: { kind: "unavailable", source: "no evidence" },
      dependencies: { kind: "unavailable", source: "no evidence" },
      toolchain: { kind: "unavailable", source: "no evidence" },
      accessibility: { kind: "unavailable", source: "no evidence" },
      webVitals: { kind: "unavailable", source: "no evidence" },
      responsive: { kind: "unavailable", source: "no evidence" },
    },
  );

  const technicalFailures: string[] = [];
  if (technical && technicalOutcome === false) {
    const checks: Array<[boolean, string]> = [
      [technical.buildPasses, "production build failed"],
      [technical.typecheckPasses, "typecheck failed"],
      [technical.lintPasses, "lint failed"],
      [technical.noBlockingConsoleErrors, "blocking console errors on a served page"],
      [technical.primaryRoutesWork, "a planned route did not respond 200"],
      [technical.loadingErrorNotFoundStatesExist, "loading, error or not-found state missing"],
      [technical.noExposedSecrets, "a secret pattern was found in build output"],
      [technical.experiencesWork !== false, "a delivered engagement experience failed its measured browser check"],
      [technical.navigationWorks !== false, "the delivered compact navigation failed its measured browser check"],
      [technical.staticLayerWorks !== false, "the static layer failed its measured browser check"],
    ];
    for (const [ok, reason] of checks) if (!ok) technicalFailures.push(`technical: ${reason}`);
    for (const problem of dependencyProblems) technicalFailures.push(`technical: ${problem}`);
  }

  const blockers: string[] = [
    ...technicalFailures,
    ...(content.outcome === false ? content.reasons : []),
    ...(performance.outcome === false ? performance.reasons : []),
    ...(responsive.outcome === false ? responsive.reasons : []),
    ...(design.outcome === false ? design.reasons : []),
    // DD-109: a blocking WCAG failure blocks production regardless of score.
    ...accessibility.failed.map((c) => `accessibility criterion FAIL: ${c.id} — ${c.detail} (DD-109)`),
    ...routeInventory.missingFromBuild.map(
      (route) => `planned page ${route} was NOT produced by the build`,
    ),
  ];

  const evidenceProvenance = evidence
    ? [
        describeEvidence("technical", evidence.bundle.technical),
        describeEvidence("routeInventory", evidence.bundle.routeInventory),
        describeEvidence("servedHtml", evidence.bundle.servedHtml),
        describeEvidence("bundles", evidence.bundle.bundles),
        describeEvidence("dependencies", evidence.bundle.dependencies),
        describeEvidence("toolchain", evidence.bundle.toolchain),
        describeEvidence("accessibility", evidence.bundle.accessibility),
        describeEvidence("webVitals", evidence.bundle.webVitals),
        describeEvidence("responsive", evidence.bundle.responsive),
      ]
    : ["no build evidence supplied; every artifact-dependent gate is unknown"];

  const notes: string[] = [
    ...(state.selectionBelowMinimum ? [`DD-120: ${state.selectionBelowMinimum}`] : []),
    ...(evaluation.target.gap ? [`DD-112: ${evaluation.target.gap}`] : []),
  ];

  return {
    evaluation,
    gates,
    sheet,
    accessibility,
    mode: evidence ? "post_build" : "pre_build",
    blockers,
    shortfalls,
    evidenceProvenance,
    routeInventory,
    notes,
  };
}

export { thresholdsFor };
