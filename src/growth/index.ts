/**
 * WEBSITE GROWTH & PROTECTION (docs/GROWTH-PROTECTION-SPEC.md).
 *
 * Guest engagement tools, SEO content and resource recommendations, and spam &
 * bot protection for public forms — one report, one recommendation lifecycle,
 * one role-based authority, one server-side guard.
 */
export * from "./vocabulary.js";
export { deriveAcademyContext, slugify } from "./academy.js";
export type { AcademyContext, AcademyDiscipline } from "./academy.js";
export { DISCIPLINE_FAMILIES, GENERIC_FAMILIES, familyFor } from "./topic-library.js";
export { recommendGuestTools } from "./guest-tools.js";
export { recommendSeoContent, SEO_RECOMMENDATION_CAPS } from "./seo-recommendations.js";
export { buildGrowthReport, knownRecommendations } from "./report.js";
export type { GrowthReport, GrowthReportInput } from "./report.js";
export {
  applyGrowthAction,
  availableVerbs,
  growthConfigurationSchema,
  parseGrowthConfiguration,
  resolveStatus,
} from "./recommendations.js";
export type {
  GrowthAction,
  GrowthActionResult,
  GrowthConfiguration,
  GrowthConfigurationDraft,
  Recommendation,
  RecommendationDetail,
  RecommendationVerb,
} from "./recommendations.js";
export { authorize, permissionForArea, ROLE_PERMISSIONS, GROWTH_PERMISSIONS } from "./access.js";
export type { GrowthActor, GrowthPermission } from "./access.js";
export { renderGrowthConsole, generateGrowthConsole } from "./console.js";
export type { ConsoleOptions } from "./console.js";
export {
  assessSpamPolicy,
  parseSpamPolicy,
  spamProtectionPolicySchema,
  DEFAULT_SPAM_POLICY,
} from "./spam/policy.js";
export type { SpamProtectionPolicy, SpamProtectionPolicyDraft, SpamPolicyAssessment } from "./spam/policy.js";
export {
  guardSubmission,
  guardRequest,
  createMemoryGuardStore,
  createCaptchaVerifier,
  readSubmission,
  sourceAddress,
  GUARD_FIELDS,
} from "./spam/guard.js";
export type { GuardConfig, GuardPolicy, GuardStore, GuardVerdict, SecurityEvent } from "./spam/guard.js";
export { protectionFor, guardConfigFor, validateFormProtection, FORM_GUARD_MODULE, FORM_PROTECTION_CONFIG, FORM_PROTECTION_RUNTIME_PATH } from "./spam/form-protection.js";
export type { FormProtection } from "./spam/form-protection.js";
export { formInventory, recommendFormProtection } from "./spam/recommend.js";
export { probeFormEndpoint } from "./spam/probe.js";
export type { ProbeResult } from "./spam/probe.js";
