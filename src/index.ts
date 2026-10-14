/**
 * PUBLIC SURFACE.
 *
 * Added by the P1 cross-system sweep. `collectBuildEvidence` had no caller in
 * `src/` — correctly, because the HOST supplies build artifacts, not the engine —
 * but it also had no exported entry point, so a consumer had no way to find it.
 * A producer nobody can reach is the produced-but-discarded class one layer out.
 *
 * Two phases, and the split is the contract:
 *   1. DECIDE   — `runPipeline(input)` with no evidence. Gates needing a built
 *                 artifact are `"unknown"` and the verdict is `cannot_classify`.
 *   2. VALIDATE — build the site, collect real artifacts with
 *                 `collectBuildEvidence`, then `runPipeline(input, { evidence })`
 *                 to get a decidable verdict.
 */

// ---- the pipeline
export { runPipeline, buildContract, canonicalSection } from "./pipeline.js";
export type { DesignDecisionOutput, ImplementationContract, PipelineOptions } from "./pipeline.js";

// ---- input contract
export {
  parseBusinessInput,
  businessInputSchema,
  industrySchema,
  websiteObjectiveSchema,
} from "./design-intelligence/types/business-input.js";
export type {
  BusinessInput,
  BusinessInputDraft,
  AssetStatus,
  Industry,
  WebsiteObjective,
} from "./design-intelligence/types/business-input.js";

// ---- evidence production (phase 2)
export {
  collectBuildEvidence,
  noBuildEvidence,
  parseServedHtml,
  parseBuildManifest,
  compareRouteInventory,
  seoObservationsFromHtml,
} from "./evidence/build-evidence.js";
export type {
  BuildEvidenceBundle,
  RawArtifacts,
  ServedHtmlFacts,
  RouteBundleFacts,
  TechnicalFacts,
  WebVitalsFacts,
} from "./evidence/build-evidence.js";
export {
  measured,
  derived,
  estimated,
  unavailable,
  requireMeasured,
  requireGrounded,
} from "./evidence/evidence-value.js";
export type { Evidence, EvidenceKind, EvidenceShortfall } from "./evidence/evidence-value.js";

// ---- accessibility
export { evaluateAccessibility, thresholdsFor } from "./accessibility/evaluate.js";
export type {
  AccessibilityTarget,
  AccessibilityEvaluation,
  AaaObservations,
  CriterionResult,
} from "./accessibility/evaluate.js";
export { checkHardFailures, CONTRAST_THRESHOLDS } from "./accessibility/rules.js";
export type { AccessibilityObservations } from "./accessibility/rules.js";

// ---- quality
export { assessQuality } from "./quality/gate-derivation.js";
export type { QualityAssessment, BuildEvidence, DecisionState } from "./quality/gate-derivation.js";
export { evaluateQuality, weightedScore, CRITERIA } from "./quality/scoring.js";
export type { GateStatus, GateOutcome, QualityLevel, ScoreSheet } from "./quality/scoring.js";
export { refine, planRemediations } from "./quality/refinement.js";
export type { Remediation, RefinementResult } from "./quality/refinement.js";

// ---- design system
export { buildTokenContract, decideSeed } from "./design-system/tokens/token-contract.js";
export type { DesignTokenContract, TokenProvenance } from "./design-system/tokens/token-contract.js";
export { buildPalette, verifyPalette, paletteToCssCustomProperties } from "./design-system/tokens/palette.js";
export type { Palette, ThemeMode, ContrastCheck } from "./design-system/tokens/palette.js";
export { PATTERNS, getPattern } from "./design-system/pattern-registry/registry.js";
export type { PatternDefinition, SuitabilityUnlock } from "./design-system/pattern-registry/types.js";
export { EXPRESSION_ORDER, MOTION_CAP_ORDER, strictestOn } from "./design-system/scales.js";

// ---- SEO
export { buildSeoStrategy, seoScore } from "./seo/strategy.js";
export { buildSeoArtifacts } from "./seo/artifacts.js";
export type { SeoArtifactPlan, PageSeoArtifacts, SeoArtifact, ArtifactOrigin } from "./seo/artifacts.js";

// ---- pages, objectives, content, responsive, performance, stack
export { derivePageSpecs, componentsForPages } from "./generation/page-spec.js";
export type { PageSpec, SeoRole } from "./generation/page-spec.js";
export {
  checkObjectiveCoverage,
  sectionsForObjectives,
  OBJECTIVE_ARCHITECTURE,
} from "./design-intelligence/objectives/objective-architecture.js";
export type { ObjectiveCoverageReport } from "./design-intelligence/objectives/objective-architecture.js";
export { verifyContent } from "./content/verification.js";
export { NEVER_FABRICATE, CONFIDENCE_POLICY } from "./content/confidence.js";
export { imageStrategyFor, ASSET_REPLACEMENT_POLICY } from "./content/asset-policy.js";
export { auditResponsive, transformComponent } from "./responsive/transformations.js";
export { MANDATORY_TEST_PROFILES, defaultCapabilities, RANGES } from "./responsive/capabilities.js";
export { budgetForArchetype, enforceBudget, WEB_VITALS, ROUTE_BUDGETS } from "./performance/budgets.js";
export { selectStack } from "./stack/select-stack.js";
export type { StackDecision } from "./stack/select-stack.js";

// ---- rules
export { ALL_RULES, INTENTIONALLY_NOT_ENCODED, ruleCoverage, getRule } from "./design-intelligence/rules/index.js";
export { SELECTION_CAPS } from "./design-intelligence/engine/select-elements.js";
export { QUALITY_THRESHOLDS, CORE_MINIMUM, WORLD_CLASS_MINIMUM } from "./quality/scoring.js";
export { planContentHubs, CONVERSION_SECTIONS } from "./generation/page-spec.js";
export type { ContentHubDecision } from "./generation/page-spec.js";
export { rulesCitedBy } from "./generation/component-model.js";
export type { Rule, DecisionRecord } from "./design-intelligence/types/decision.js";
export { deriveDesignContextProfile } from "./design-intelligence/profile/derive-profile.js";
export type { DesignContextProfile, DerivedVariables } from "./design-intelligence/types/profile.js";

// ---- generation (phase: generator)
export { generateWebsite } from "./generation/generate-website.js";
export type {
  GeneratedWebsite,
  GeneratedPage,
  GenerationManifest,
  GenerateOptions,
} from "./generation/generate-website.js";
export { buildStaticSite, collectArtifactsFromBuild } from "./generation/build.js";
export type { StaticBuildResult } from "./generation/build.js";
export { resolveContent, suppliedContentSchema, NEVER_GENERATED } from "./generation/content-values.js";
export type { SuppliedContent, ResolvedContent } from "./generation/content-values.js";
export { buildComponentModel, walkNodes } from "./generation/component-model.js";
export type { ComponentModel, ComponentNode, Refusal } from "./generation/component-model.js";
export { renderStaticSite } from "./generation/render/html.js";
export { renderCss } from "./generation/render/css.js";
export { emitNextApp } from "./generation/emit/nextjs.js";

// ---- engagement & conversion opportunity intelligence (optional decision layer)
export { decideEngagement, meetsMinimum, selectComplements } from "./engagement/decide.js";
export type { EngagementContext } from "./engagement/decide.js";
export { OPPORTUNITY_REGISTRY, OPPORTUNITY_CATEGORIES } from "./engagement/registry.js";
export { EXPERIENCE_PATTERNS } from "./engagement/experience-patterns.js";
export { ENGAGEMENT_WEIGHTS, SCORE_BANDS, bandFor } from "./engagement/scoring.js";
export { evaluateCombination, COMBINATION_LIMITS } from "./engagement/combination.js";
export {
  ENGAGEMENT_CATEGORY_IDS,
  ENGAGEMENT_PREFERENCES,
  VISITOR_TASKS,
  ENGAGEMENT_DATA_KINDS,
} from "./engagement/vocabulary.js";
export { engagementDataVerdict } from "./content/engagement-data.js";
export type {
  EngagementOpportunityDecision,
  EngagementDecisionRecord,
  OpportunityCategory,
  ExperiencePattern,
  HardGateResult,
  Scorecard,
} from "./engagement/types.js";
export type { EngagementInput } from "./design-intelligence/types/business-input.js";

// ---- engagement experience delivery (decision → spec → render → reconcile)
export { planExperienceDelivery, reconcileExperienceDelivery, RESPONSIVE_CONTRACTS } from "./engagement/delivery.js";
export type { ExperienceDeliverySpec, DeliveryDefinition, DeliveryReconciliation, DeliveryPerformance } from "./engagement/delivery.js";
export {
  calculatorDefinitionSchema,
  decisionFlowDefinitionSchema,
  resolveCalculator,
  resolveDecisionFlow,
  resolveProvenance,
  PROVENANCE_VALUES,
} from "./content/engagement-values.js";
export type { CalculatorDefinition, DecisionFlowDefinition, Provenance, ValueStatus } from "./content/engagement-values.js";
export { EXPERIENCE_RUNTIME_FILE, EXPERIENCE_RUNTIME_PATH, loadEvaluator } from "./generation/runtime/experience-runtime.js";
export { mapExperienceChecks } from "./host/host-evidence.js";

// ---- customer readiness foundation (G1, P1-1…P1-8, decision-to-execution integrity)
export { inferPageRole, allocateSiteSections, homeRouteRecord } from "./generation/page-spec.js";
export type { PageAllocationReport } from "./generation/page-spec.js";
export { PAGE_ROLES } from "./design-intelligence/types/business-input.js";
export type { PageRole } from "./design-intelligence/types/business-input.js";
export { planConversionCapabilities, CONVERSION_CAPABILITIES } from "./design-intelligence/objectives/conversion-capabilities.js";
export type { ConversionPlanEntry, ConversionCapability } from "./design-intelligence/objectives/conversion-capabilities.js";
export { contactLinkContracts, resolveConversionDelivery } from "./generation/contact-links.js";
export type { ContactLinkContract, ConversionDelivery } from "./generation/contact-links.js";
export { contentDraftSchema, resolveDrafts } from "./content/draft-channel.js";
export type { ContentDraft, DraftChannel, DraftResolution } from "./content/draft-channel.js";
export { applySeoDrafts } from "./seo/artifacts.js";
export { PRECEDENCE_ORDER, precedenceTier } from "./design-intelligence/engine/evaluator.js";
export type { PrecedenceResolution, PrecedenceTier } from "./design-intelligence/engine/evaluator.js";
export { admitDependencies, importedPackages, GENERATOR_CONSUMERS } from "./stack/dependency-admission.js";
export type { DependencyAdmission, AdmissionEntry, DependencyDecision } from "./stack/dependency-admission.js";
export { analyseIndexability, DUPLICATE_SIMILARITY } from "./evidence/build-evidence.js";
export type { IndexabilityFindings } from "./evidence/build-evidence.js";
export { reconcileDecisionExecution } from "./integrity/decision-execution.js";
export type { IntegrityLedger, IntegrityEntry, IntegrityDomain, IntegrityStatus } from "./integrity/decision-execution.js";
export { classifyDataset } from "./content/dataset-classification.js";
export type { DatasetClassification } from "./content/dataset-classification.js";
export {
  engineInputFromWorkflow,
  extractFrameworkBlocks,
  writeGeneratedSection,
  evaluateTestRegister,
  renderRegisterTable,
  REGISTER_CHECKS,
  BLOCK_KINDS,
} from "./workflow/seams.js";
export type { RegisterCase, RegisterContext, WorkflowDocument } from "./workflow/seams.js";
export { mapNavigationChecks, mapStaticLayer } from "./host/host-evidence.js";
export { hostExpectations } from "./host/host-project.js";
