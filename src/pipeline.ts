/**
 * The pipeline — specification §3, assembling §18's DesignDecisionOutput and
 * §31's ImplementationContract.
 *
 * This module ORCHESTRATES; it decides nothing itself. Every choice is delegated
 * to the subsystem that owns it, which is what §3's "separate decision-making
 * from implementation" requires and what makes each step independently testable.
 *
 * Order matters and is not arbitrary:
 *   content verification runs BEFORE element selection, because a pattern's
 *   content-readiness gate needs to know what may actually render. Selecting
 *   first and verifying afterwards is how a layout ends up designed around
 *   evidence that does not exist.
 */
import type { BusinessInput } from "./design-intelligence/types/business-input.js";
import type { DesignContextProfile } from "./design-intelligence/types/profile.js";
import type { DecisionRecord } from "./design-intelligence/types/decision.js";
import { deriveDesignContextProfile } from "./design-intelligence/profile/derive-profile.js";
import { industryBaseline, type IndustryBaseline } from "./design-intelligence/baseline/industry-baseline.js";
import { ALL_RULES } from "./design-intelligence/rules/index.js";
import { evaluateRules, type EvaluationResult } from "./design-intelligence/engine/evaluator.js";
import { deriveFacts } from "./design-intelligence/engine/derive-facts.js";
import {
  selectElementSet,
  type SelectionContext,
  type SelectionDecision,
} from "./design-intelligence/engine/select-elements.js";
import { PATTERNS } from "./design-system/pattern-registry/registry.js";
import { getPattern } from "./design-system/pattern-registry/registry.js";
import { verifyContent, type VerificationReport } from "./content/verification.js";
import { offerPublicationApprovals } from "./content/publication.js";
import { canonicalSection } from "./design-intelligence/sections/registry.js";
import { imageStrategyFor, type ImageStrategy } from "./content/asset-policy.js";
import { budgetForArchetype, enforceBudget, type BudgetVerdict, type Enhancement } from "./performance/budgets.js";
import { buildSeoStrategy, type SeoStrategy } from "./seo/strategy.js";
import { buildSeoArtifacts, type SeoArtifactPlan } from "./seo/artifacts.js";
import { selectStack, type StackDecision } from "./stack/select-stack.js";
import { MANDATORY_TEST_PROFILES } from "./responsive/capabilities.js";
import { auditResponsive, type ResponsiveAudit, type ComponentDescriptor } from "./responsive/transformations.js";
import { ACCESSIBILITY_BASELINE } from "./accessibility/rules.js";
import { planConversionCapabilities, type ConversionPlanEntry } from "./design-intelligence/objectives/conversion-capabilities.js";
import {
  checkObjectiveCoverage,
  sectionsForObjectives,
  type ObjectiveCoverageReport,
} from "./design-intelligence/objectives/objective-architecture.js";
import {
  allocateSiteSections,
  componentsForPages,
  derivePageSpecs,
  homeRouteRecord,
  planContentHubs,
  type ContentHubDecision,
  type PageAllocationReport,
  type PageSpec,
} from "./generation/page-spec.js";
import { SELECTION_CAPS } from "./design-intelligence/engine/select-elements.js";
import { admitDependencies, type DependencyAdmission } from "./stack/dependency-admission.js";
import { HOST_TOOLCHAIN } from "./host/toolchain.js";
import {
  assessQuality,
  thresholdsFor,
  type BuildEvidence,
  type QualityAssessment,
} from "./quality/gate-derivation.js";
import { buildTokenContract, type DesignTokenContract } from "./design-system/tokens/token-contract.js";
import { decideEngagement } from "./engagement/decide.js";
import type { EngagementOpportunityDecision } from "./engagement/types.js";
import { EXPERIENCE_PATTERNS } from "./engagement/experience-patterns.js";
import {
  EXPRESSION_ORDER,
  MOTION_CAP_ORDER,
  strictestOn,
} from "./design-system/scales.js";

/** §18 DesignDecisionOutput. */
export interface DesignDecisionOutput {
  profile: DesignContextProfile;
  baseline: IndustryBaseline;
  designPersonality: string;
  visualExpression: string;
  layoutStrategy: Record<string, unknown>;
  sectionArchitecture: string[];
  selectedPatterns: string[];
  imageStrategy: { strategy: ImageStrategy; rationale: string };
  interactionStrategy: { level: string; selected: string[]; rejected: string[] };
  motionStrategy: { cap: string; policy: string };
  responsiveStrategy: { strategy: string; audit: ResponsiveAudit };
  accessibilityStrategy: {
    target: string;
    baseline: readonly string[];
    hardGates: readonly string[];
    thresholds: ReturnType<typeof thresholdsFor>;
  };
  seoStrategy: SeoStrategy;
  /** P1-1: per-page ARTIFACT VALUES, each carrying its origin. */
  seoArtifacts: SeoArtifactPlan;
  /** P1-2: actual token VALUES, not a requirement that tokens exist. */
  tokens: DesignTokenContract;
  performanceStrategy: BudgetVerdict;
  contentPlan: VerificationReport;
  /** The stack's PROPOSAL. What is installed is `dependencyAdmission.admitted`, never this list directly. */
  stack: StackDecision;
  /** P1-6: proposal × generator consumers × dependency-gate decisions → the ONE admitted runtime set. */
  dependencyAdmission: DependencyAdmission;
  /** P0-4: every supplied page survives here, plus any derived to serve an objective. */
  pages: PageSpec[];
  /** DD-093: per-offer content-hub decisions, including the offers that got NO page and why. */
  contentHubs: ContentHubDecision[];
  /** P1-1 / G1: which page received each section, what was allocated by role, what no page received, how "/" exists. */
  pageAllocation: PageAllocationReport;
  /** P0-2: an unserved objective is reported, never silently dropped. */
  objectiveCoverage: ObjectiveCoverageReport;
  /** P1-2: per objective, the decided order of conversion capabilities and their decision-time feasibility. */
  conversionPlan: ConversionPlanEntry[];
  /** P0-3: the quality engine is reachable and runs on every invocation. */
  quality: QualityAssessment;
  decisionLog: DecisionRecord[];
  /**
   * The evaluation draft: every `set`/`cap`/`append` effect, keyed by dot path.
   * The ONE surface the generator, the CSS emitter and the page model read rule
   * effects from — so a rule has exactly one consumer path, not one per emitter.
   */
  decisions: Record<string, unknown>;
  /** Rule-level obligations (`require`) and prohibitions (`forbid`), for audit. */
  obligations: string[];
  forbidden: string[];
  /** Rule conflicts, surfaced rather than resolved by evaluation order. */
  conflicts: EvaluationResult["conflicts"];
  /** Disagreements settled by declared rule precedence, with every overridden write (P1-5). */
  precedenceResolutions: EvaluationResult["precedenceResolutions"];
  /** Everything requiring human approval before publication. */
  approvalsRequired: string[];
  selectionDecisions: SelectionDecision[];
  /**
   * ENGAGEMENT OPPORTUNITY DECISION (src/engagement/). NO_EXPERIENCE unless a
   * candidate passes every hard gate and its minimum score. Its records are also
   * in `decisionLog`; the generator consumes it and never selects an experience itself.
   */
  engagement: EngagementOpportunityDecision;
}

/** §31 Implementation Contract. */
export interface ImplementationContract {
  framework: string;
  renderingStrategy: string;
  componentStrategy: string[];
  stylingStrategy: string[];
  animationStrategy: string[];
  responsiveStrategy: string[];
  accessibilityRequirements: readonly string[];
  seoRequirements: readonly string[];
  performanceBudgets: { routeJsKb: number; lcpSeconds: number; inpMs: number; cls: number };
  lazyLoadingRequirements: string[];
  fallbackRequirements: Array<{ pattern: string; fallback: string }>;
  analyticsEvents: string[];
  testingRequirements: string[];
  publicationRequirements: string[];
  /**
   * P1: the actual VALUES a generator needs. Previously the contract carried
   * requirements ("SEO required", "tokens required") while the values lived only
   * on the decision output, so a generator author could miss them entirely —
   * the produced-but-discarded class one layer out.
   */
  designTokens: DesignTokenContract;
  seoArtifacts: SeoArtifactPlan;
}

export interface PipelineOptions {
  /**
   * Components for the responsive audit. OPTIONAL and normally omitted: the
   * inventory is DERIVED from the page model and the selected patterns
   * (`componentsForPages`). Supplying it overrides the derivation, which is
   * only useful when testing the transformation engine directly.
   */
  components?: readonly ComponentDescriptor[];
  maxElements?: number;
  /**
   * Post-build observations. When absent the quality assessment runs in
   * `pre_build` mode, where gates needing a built artifact are `"unknown"` and
   * the honest verdict is `cannot_classify`.
   */
  evidence?: BuildEvidence;
}

export function runPipeline(
  input: BusinessInput,
  options: PipelineOptions = {},
): { output: DesignDecisionOutput; contract: ImplementationContract } {
  // 1. BUSINESS INTELLIGENCE → DESIGN CONTEXT PROFILE
  const profile = deriveDesignContextProfile(input);

  // 2. INDUSTRY BASELINE
  const baseline = industryBaseline(profile.industry);

  // 3. DECISION ENGINE. Facts include the profile plus the few non-profile facts
  //    rules need (location verification for DD-114).
  // Facts = the profile plus content-shape facts derived ONCE in derive-facts.ts.
  // `framework` and `targetQuality` are the two non-profile facts rules read
  // (DD-075, DD-112); both are stated inputs, never inferred.
  const facts = {
    ...profile,
    ...deriveFacts(input, profile),
    framework: "nextjs",
    targetQuality: input.constraints?.targetQuality ?? "professionally_designed",
  };
  const evaluation = evaluateRules(facts, ALL_RULES);

  // 4. CONTENT + ASSET VALIDATION — before selection, deliberately.
  const contentPlan = verifyContent(input);
  const renderable = new Set(
    contentPlan.sections.filter((s) => s.render).map((s) => s.category),
  );
  // Section names the patterns ask for that are not content categories.
  if (renderable.has("services")) renderable.add("product_proof");
  const verifiedAssets = new Set(
    Object.entries(input.availableAssets)
      .filter(([, status]) => status === "verified_available")
      .map(([key]) => key),
  );

  // 5. EXPRESSION CEILING: baseline, then capped by rules, then by an owner
  //    ceiling. Each step may only LOWER it.
  const visualExpression = strictestOn(
    EXPRESSION_ORDER,

    baseline.visualExpression,
    evaluation.draft["visualExpression"] as string | undefined,
    profile.maxVisualExpression,
  );

  // 6. PERFORMANCE BUDGET for this archetype.
  const budget = budgetForArchetype(baseline.archetype);

  // 7. ELEMENT SELECTION. Forbidden = industry prohibitions + rule `avoid`.
  const forbidden = new Set<string>([...baseline.prohibited, ...evaluation.forbidden]);

  // 6b. ENGAGEMENT OPPORTUNITY DECISION — after content verification and the
  //     route budget (it needs both), before element selection and page
  //     generation. It reads the DD interaction cap and prohibitions; it never
  //     writes the rule draft. Default outcome: NO_EXPERIENCE.
  const engagement = decideEngagement({
    input,
    profile,
    facts,
    contentPlan,
    routeBudget: budget,
    ...(typeof evaluation.draft["interaction.level"] === "string"
      ? { interactionLevelCap: evaluation.draft["interaction.level"] as string }
      : {}),
    forbidden,
  });
  const selectionContext: SelectionContext = {
    profile,
    availableContent: renderable,
    verifiedAssets,
    routeJsBudgetKb: budget.routeJsKb,
    alreadySelected: [],
    forbidden,
    forbiddenBy: evaluation.forbiddenBy,
    // Two INDEPENDENT axes (P0-1): decorative ambition vs implementation cost.
    visualExpressionCeiling: visualExpression,
    technicalComplexityBudget: profile.variables.technical_complexity_budget,
    statedRequirements: new Set(input.requiredFunctionality),
    statedObjectives: new Set(input.websiteObjective),
    // DD-120: the signature ceiling, read from the draft; the engine's own
    // constant is the fallback so the number has one home.
    ...(typeof evaluation.draft["selection.maxSignatureExperiences"] === "number"
      ? { maxSignatureExperiences: evaluation.draft["selection.maxSignatureExperiences"] as number }
      : {}),
  };
  // DD-120 sets the selection cap; an explicit option may only LOWER it.
  const ruleMax = evaluation.draft["selection.maxElements"];
  const ruleMin = evaluation.draft["selection.minElements"];
  const maxElements = Math.min(
    typeof ruleMax === "number" ? ruleMax : SELECTION_CAPS.maxElements,
    options.maxElements ?? Number.POSITIVE_INFINITY,
  );
  const minElements = typeof ruleMin === "number" ? ruleMin : SELECTION_CAPS.minElements;
  const selection = selectElementSet(PATTERNS, selectionContext, { maxElements, minElements });

  // 8. PERFORMANCE ENFORCEMENT on what was selected.
  const enhancements: Enhancement[] = selection.selectedIds.flatMap((id) => {
    const pattern = getPattern(id);
    if (!pattern) return [];
    return [
      {
        patternId: id,
        estimatedRouteJsKb: pattern.estimatedRouteJsKb,
        // A 0KB CSS/HTML pattern has no module to defer. Labelling it
        // "deferred" produced the nonsense the dry run flagged (EG-11).
        loading:
          pattern.estimatedRouteJsKb === 0
            ? "eager"
            : pattern.estimatedRouteJsKb >= 30
              ? "on_demand"
              : "deferred",
        fallback: pattern.fallback,
        // Selection already required a value hypothesis, so anything here has one.
        hasDocumentedPurpose: true,
      },
    ];
  });
  // A selected experience answers to the SAME route budget as every pattern:
  // one budget verdict, not a second performance system.
  for (const chosen of [engagement.primaryOpportunity, ...engagement.secondaryOpportunities]) {
    if (!chosen) continue;
    const kb = chosen.experiencePattern
      ? EXPERIENCE_PATTERNS[chosen.experiencePattern].performance.estimatedRouteJsKb
      : (engagement.performanceBudget?.estimatedRouteJsKb ?? 0);
    enhancements.push({
      patternId: `engagement:${chosen.category}`,
      estimatedRouteJsKb: kb,
      loading: kb === 0 ? "eager" : kb >= 30 ? "on_demand" : "deferred",
      fallback: chosen.experiencePattern ? EXPERIENCE_PATTERNS[chosen.experiencePattern].fallback : engagement.fallback,
      hasDocumentedPurpose: true,
    });
  }
  const performanceStrategy = enforceBudget(enhancements, budget);
  // If the shared budget downgraded or removed an experience, the decision must say
  // so rather than promise an experience the plan no longer contains.
  for (const action of performanceStrategy.actions) {
    if (!action.patternId.startsWith("engagement:")) continue;
    if (action.action === "downgrade_to_fallback" || action.action === "remove") {
      engagement.approvalRequirements.push(
        `engagement ${action.patternId.slice("engagement:".length)}: ${action.action === "remove" ? "removed" : "downgraded to its fallback"} by route budget enforcement — ${action.reason}`,
      );
    }
  }

  // 9. SEO, STACK, RESPONSIVE
  const highestTier = selection.selectedIds
    .map((id) => getPattern(id)?.tier)
    .filter((t): t is NonNullable<typeof t> => t !== undefined)
    .sort()
    .at(-1);
  // Architecture comes from the industry baseline, the rules, AND the stated
  // objectives (P0-2). The objective contribution is what makes a commerce
  // objective produce commerce architecture inside a non-commerce industry.
  const objectiveSections = sectionsForObjectives(input.websiteObjective, profile.variables);
  const sectionArchitecture = [
    ...new Set([
      ...baseline.requiredContent.map(canonicalSection),
      ...((evaluation.draft["sectionArchitecture"] as string[] | undefined) ?? []).map(
        canonicalSection,
      ),
      ...objectiveSections.required.map(canonicalSection),
    ]),
  ];
  const supportingSections = objectiveSections.supporting
    .map(canonicalSection)
    .filter((section) => !sectionArchitecture.includes(section));

  const selectedCapabilities = new Set(
    selection.selectedIds.flatMap((id) => getPattern(id)?.capabilities ?? []),
  );
  const stack = selectStack(profile, input.requiredFunctionality, {
    ...(highestTier !== undefined ? { highestSelectedTier: highestTier } : {}),
    selectedCapabilities,
    draft: evaluation.draft,
  });

  const dependencyAdmission = admitDependencies(stack, input.constraints?.dependencyDecisions ?? []);

  // P0-4: pages survive, and the responsive audit's inventory is DERIVED from
  // them plus the selected patterns rather than hand-authored by the caller.
  const pages = derivePageSpecs(input, profile, sectionArchitecture, renderable, evaluation.draft);
  // P1-1: site-level sections go to the page whose ROLE owns them; the rest are reported.
  const pageAllocation = allocateSiteSections(pages, sectionArchitecture, homeRouteRecord(input, pages));
  // DD-093: the same pure planner, called for the RECORD of per-offer decisions.
  const ownerRoutes = new Set(input.requiredPages.map((p) => p.path));
  const contentHubs = planContentHubs(input, profile, evaluation.draft, ownerRoutes, renderable).decisions;
  // Resolve each experience's placement to a real route now that pages exist:
  // the page serving its target objective, else home. A resolution, not a decision.
  for (const chosen of [engagement.primaryOpportunity, ...engagement.secondaryOpportunities]) {
    if (!chosen) continue;
    chosen.placement.route =
      pages.find((p) => p.primaryObjective === chosen.placement.targetObjective)?.route ?? pages[0]?.route ?? "/";
  }
  if (engagement.placement && engagement.primaryOpportunity) engagement.placement = engagement.primaryOpportunity.placement;
  const selectedPatternDefs = selection.selectedIds
    .map((id) => getPattern(id))
    .filter((p): p is NonNullable<typeof p> => p !== undefined);
  const components = options.components ?? componentsForPages(pages, selectedPatternDefs);
  const responsiveAudit = auditResponsive(components, MANDATORY_TEST_PROFILES);

  // SEO reads the PAGE MODEL, so page architecture is the real routes (P0-4).
  const seoStrategy = buildSeoStrategy(profile, renderable, { pages });
  // P1-1: and then produces actual per-page VALUES, not just requirements.
  const seoArtifacts = buildSeoArtifacts(input, profile, pages, seoStrategy, renderable);

  // Motion cap resolved ONCE: the tokens and the motion strategy must not
  // compute it separately, or they can disagree.
  const motionCapValue = strictestMotion(
    baseline.motionCap,
    evaluation.draft["motion.cap"] as string | undefined,
  );

  // P1-2: real token values, derived from ONE seed via the ported OKLCH algorithm.
  const tokens = buildTokenContract(input, profile, motionCapValue);

  // P0-2: coverage is checked against the architecture AND selected capabilities.
  const blockedEvidence = contentPlan.sections.filter((s) => !s.render).map((s) => s.category);
  const objectiveCoverage = checkObjectiveCoverage(
    input.websiteObjective,
    [...sectionArchitecture, ...supportingSections],
    [...selectedCapabilities],
    blockedEvidence,
  );

  // 10. APPROVALS. Anything a rule flagged, plus every blocked claim.
  const approvalsRequired = [
    ...evaluation.records.filter((r) => r.humanApprovalRequired).map((r) => `${r.ruleId}: ${r.decision}`),
    ...contentPlan.sections
      .filter((s) => s.approvalRequired)
      .map((s) => `content "${s.category}": ${s.reason}`),
    ...contentPlan.blockedConversionPaths.map((p) => `blocked conversion path: ${p}`),
    // FD-05: offer names their provenance or source does not authorise for publication.
    ...offerPublicationApprovals(input),
    // FD-13 / C2: the business name is published on every page; it carries no
    // verification state unless one was recorded.
    ...(input.businessNameProvenance === undefined
      ? [`business name "${input.businessName}" has no provenance record: it is published as supplied and unconfirmed — confirm the trading name before launch`]
      : input.businessNameProvenance.provenance === "customer_supplied_verified"
        ? []
        : [`business name "${input.businessName}" is ${input.businessNameProvenance.provenance.replace(/_/g, " ")} — confirm it before launch`]),
    // FD-01 / FD-02: a design resting on inferred intent needs the customer to confirm it.
    ...(input.websiteObjectiveBasis === "inferred"
      ? [`website objective "${input.websiteObjective.join(", ")}" is an operator inference, not a customer statement — the page architecture rests on it`]
      : []),
    ...(input.targetAudience.some((a) => a.basis === "inferred")
      ? [`target audience ${input.targetAudience.filter((a) => a.basis === "inferred").map((a) => `"${a.label}"`).join(", ")} is an operator inference, not a customer statement — it is not published as the customer's words`]
      : []),
    ...selection.decisions
      .filter((d) => d.unlockedBy !== undefined)
      .map(
        (d) =>
          `pattern "${d.patternId}" admitted under a use-case unlock: ${d.unlockedBy?.rationale}`,
      ),
    ...objectiveCoverage.failures,
    ...seoArtifacts.unresolved.map(
      (u) => `SEO artifact unresolved — ${u.route} ${u.artifact}: needs ${u.needs}`,
    ),
    ...seoArtifacts.approvalsRequired.map(
      (a) => `SEO artifact requires approval — ${a.route} ${a.artifact}`,
    ),
    ...tokens.unresolved.map(
      (u) => `design token group "${u.group}" needs ${u.needs} (currently ${u.currentlyUsing})`,
    ),
    ...tokens.problems.map((p) => `design token problem: ${p}`),
    ...engagement.approvalRequirements,
    ...dependencyAdmission.entries
      .filter((e) => e.status === "awaiting_approval")
      .map((e) => `dependency gate: "${e.package}" awaits approval — ${e.reason}`),
  ];


  // P0-3: the quality engine now runs on EVERY pipeline invocation. Pre-build it
  // reports `cannot_classify` with the unknown gates named; with evidence it runs
  // the real accessibility, SEO and technical evaluators, and a hard failure
  // blocks production regardless of score.
  const quality = assessQuality(
    {
      contentPlan,
      performance: performanceStrategy,
      responsive: responsiveAudit,
      objectiveCoverage,
      conflicts: evaluation.conflicts,
      responsiveInventorySize: components.length,
      tokens,
      seoArtifacts,
      pages,
      accessibilityTarget: profile.variables.accessibility_requirement,
      // DD-112: the stated target; DD-120: the selection engine's minimum note.
      targetQuality: facts.targetQuality,
      selectionBelowMinimum: selection.belowMinimum,
      // The dependency gate: what a host may install, from ONE declaration each.
      declaredDependencies: {
        runtime: Object.keys(dependencyAdmission.admitted),
        toolchain: Object.keys(HOST_TOOLCHAIN),
      },
    },
    options.evidence,
  );

  const output: DesignDecisionOutput = {
    profile,
    baseline,
    designPersonality:
      (evaluation.draft["designPersonality"] as string | undefined) ?? "clear, plain, credible",
    visualExpression,
    layoutStrategy: {
      system: evaluation.draft["layout.system"] ?? baseline.archetype,
      // DD-017 / DD-027: the grid within the system, and the reading rail.
      grid: evaluation.draft["layout.grid"] ?? "structured_grid",
      readingRail: evaluation.draft["layout.readingRail"] ?? "single_column",
      composition: evaluation.draft["layout.composition"] ?? "structured",
      signature: evaluation.draft["layout.signature"] ?? "none",
      readingMeasure: evaluation.draft["typography.readingMeasure"] ?? "60-75ch",
    },
    sectionArchitecture,
    selectedPatterns: selection.selectedIds,
    imageStrategy: imageStrategyFor(profile.variables.visual_asset_quality),
    interactionStrategy: {
      level: (evaluation.draft["interaction.level"] as string | undefined) ?? visualExpression,
      selected: selection.selectedIds.filter((id) => {
        const category = getPattern(id)?.category;
        return category === "interaction" || category === "immersive";
      }),
      rejected: selection.decisions
        .filter((d) => d.outcome === "reject")
        .map((d) => d.patternId),
    },
    motionStrategy: {
      cap: motionCapValue,
      policy: "purposeful_and_reduced_motion_safe",
    },
    responsiveStrategy: {
      strategy: (evaluation.draft["responsive.strategy"] as string | undefined) ?? "container_first",
      audit: responsiveAudit,
    },
    accessibilityStrategy: {
      // The REQUESTED target, preserved verbatim and never downgraded (P1-4).
      target: profile.variables.accessibility_requirement,
      baseline: ACCESSIBILITY_BASELINE,
      hardGates: ["keyboard", "focus", "contrast", "reflow", "reduced_motion", "target_size", "logo_visibility"],
      // The thresholds that target actually implies, so nothing downstream has
      // to guess whether AAA changed anything.
      thresholds: thresholdsFor(profile.variables.accessibility_requirement),
    },
    seoStrategy,
    seoArtifacts,
    tokens,
    performanceStrategy,
    contentPlan,
    stack,
    dependencyAdmission,
    pages,
    contentHubs,
    pageAllocation,
    objectiveCoverage,
    conversionPlan: planConversionCapabilities(input),
    quality,
    // ONE decision log: the rule records, then the engagement records (which extend DecisionRecord).
    decisionLog: [...evaluation.records, ...engagement.records],
    decisions: evaluation.draft,
    obligations: evaluation.obligations,
    forbidden: evaluation.forbidden,
    conflicts: evaluation.conflicts,
    precedenceResolutions: evaluation.precedenceResolutions,
    approvalsRequired,
    selectionDecisions: selection.decisions,
    engagement,
  };

  const contract = buildContract(output, budget);
  return { output, contract };
}

/**
 * Canonical section vocabulary (dry-run EG-9, FD-08). The aliases now live in the
 * section registry (`design-intelligence/sections/registry.ts`) with the label,
 * content source and renderer for each id, so a spelling cannot be canonicalised in
 * one place and unknown in another. Re-exported here for existing callers.
 */
export { canonicalSection };

function strictestMotion(a: string, b: string | undefined): string {
  return strictestOn(MOTION_CAP_ORDER, a, b);
}

export function buildContract(
  output: DesignDecisionOutput,
  budget: { routeJsKb: number },
): ImplementationContract {
  const fallbackRequirements = output.selectionDecisions
    .filter((d) => d.outcome === "select_with_fallback")
    .map((d) => ({ pattern: d.patternId, fallback: d.fallback }));
  // Engagement: only SELECTED experiences reach the contract — nothing is loaded
  // because it exists in the registry.
  const chosenExperiences = [output.engagement.primaryOpportunity, ...output.engagement.secondaryOpportunities].filter(
    (o): o is NonNullable<typeof o> => o !== null,
  );
  for (const chosen of chosenExperiences) {
    const pattern = chosen.experiencePattern ? EXPERIENCE_PATTERNS[chosen.experiencePattern] : undefined;
    fallbackRequirements.push({ pattern: `engagement:${chosen.category}`, fallback: pattern?.fallback ?? output.engagement.fallback });
  }

  const lazyLoading = output.performanceStrategy.plan
    .filter((e) => e.loading !== "eager")
    .map((e) => `${e.patternId}: ${e.loading}`);

  return {
    framework: output.stack.framework,
    renderingStrategy: output.stack.renderingStrategy,
    componentStrategy: [
      `patterns: ${output.selectedPatterns.join(", ") || "none selected"}`,
      `sections: ${output.sectionArchitecture.join(", ")}`,
      "server components by default; a client boundary only where interactivity requires it",
    ],
    stylingStrategy: [...output.stack.styling],
    animationStrategy: [
      `cap: ${output.motionStrategy.cap}`,
      output.motionStrategy.policy,
      "every animation has a reduced-motion alternative that loses no information",
    ],
    responsiveStrategy: [
      output.responsiveStrategy.strategy,
      "viewport queries for page layout, container queries for components",
      "no device-model-specific breakpoints",
    ],
    accessibilityRequirements: output.accessibilityStrategy.baseline,
    seoRequirements: output.seoStrategy.requirements,
    performanceBudgets: {
      routeJsKb: budget.routeJsKb,
      lcpSeconds: 2.5,
      inpMs: 200,
      cls: 0.1,
    },
    lazyLoadingRequirements: lazyLoading,
    fallbackRequirements,
    analyticsEvents: [
      `primary_objective_${output.profile.primaryObjective}`,
      ...output.profile.secondaryObjectives.map((o) => `secondary_objective_${o}`),
      ...output.engagement.analyticsRequirements.map((e) => `engagement_${e}`),
    ],
    testingRequirements: [
      "every mandatory responsive profile",
      "keyboard-only primary task completion",
      "reduced-motion pass",
      "every declared fallback exercised, not merely present",
      "no fabricated claim rendered",
      ...(chosenExperiences.length > 0
        ? [
            "every selected engagement experience completable by keyboard alone and with JavaScript disabled (its static path)",
            "every selected engagement experience exercised through its kill switch: the page still works with it disabled",
          ]
        : []),
    ],
    designTokens: output.tokens,
    seoArtifacts: output.seoArtifacts,
    publicationRequirements: [
      ...output.approvalsRequired,
      ...(output.contentPlan.blockedConversionPaths.length > 0
        ? ["a blocked conversion path must be resolved or the objective removed before launch"]
        : []),
      ...(output.conflicts.length > 0
        ? [`unresolved rule conflicts: ${output.conflicts.map((c) => c.target).join(", ")}`]
        : []),
      ...output.quality.blockers.map((b) => `quality gate blocker: ${b}`),
      ...output.quality.shortfalls.map(
        (sf) => `gate "${sf.gate}" undecidable — needs ${sf.needs} (had: ${sf.had}). ${sf.detail}`,
      ),
      ...(output.quality.evaluation.unknownGates.length > 0
        ? [
            `quality level "${output.quality.evaluation.level}" — gates without evidence: ${output.quality.evaluation.unknownGates.join(", ")}. Production readiness cannot be claimed until these are measured.`,
          ]
        : []),
    ],
  };
}
