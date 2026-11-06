/**
 * GROWTH & PROTECTION VOCABULARY — the closed sets the website growth module
 * reasons over (docs/GROWTH-PROTECTION-SPEC.md).
 *
 * Dependency-free on purpose, like `engagement/vocabulary.ts`: the input contract
 * (`design-intelligence/types/business-input.ts`) validates the optional
 * `academy` block against these ids, and every growth module reads the same ones.
 * One vocabulary, one home.
 */

/** The two academy categories the recommendations are specialised for. */
export const ACADEMY_CATEGORIES = ["arts", "sports"] as const;
export type AcademyCategory = (typeof ACADEMY_CATEGORIES)[number];

/** Who an academy teaches. Closed so a recommendation can address them by name deterministically. */
export const ACADEMY_AGE_GROUPS = ["toddlers", "children", "teens", "adults", "seniors"] as const;
export type AcademyAgeGroup = (typeof ACADEMY_AGE_GROUPS)[number];

export const ACADEMY_SKILL_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type AcademySkillLevel = (typeof ACADEMY_SKILL_LEVELS)[number];

/**
 * Business goals the growth module optimises for. These refine — never replace —
 * `websiteObjective`: an academy may want footfall (an objective) AND say that
 * organic traffic is the gap (a goal).
 */
export const ACADEMY_GOALS = [
  "increase_enquiries",
  "increase_footfall",
  "increase_registrations",
  "grow_organic_traffic",
  "build_community",
] as const;
export type AcademyGoal = (typeof ACADEMY_GOALS)[number];

/** Kinds of free resource an academy can publish, already or as a recommendation. */
export const RESOURCE_KINDS = [
  "course_guide",
  "beginner_guide",
  "practice_material",
  "faq",
  "reference_sheet",
  "checklist",
  "schedule_template",
  "video_lesson",
] as const;
export type ResourceKind = (typeof RESOURCE_KINDS)[number];

/** The free visitor tools the guest engagement catalogue can recommend. */
export const GUEST_TOOL_IDS = [
  "free_trial_class",
  "skill_assessment",
  "downloadable_resources",
  "beginner_guide",
  "practice_materials",
  "skill_calculator",
  "sample_lessons",
  "events_workshops",
] as const;
export type GuestToolId = (typeof GUEST_TOOL_IDS)[number];

/** Where an enabled guest tool is surfaced. Never the hero by default (ECO §19). */
export const GUEST_TOOL_PLACEMENTS = ["home_section", "courses_page", "dedicated_page", "blog_sidebar"] as const;
export type GuestToolPlacement = (typeof GUEST_TOOL_PLACEMENTS)[number];

/** Recommendation lifecycle (UI statuses: Recommended, Pending, Implemented, Dismissed). */
export const RECOMMENDATION_STATUSES = ["recommended", "pending", "implemented", "dismissed"] as const;
export type RecommendationStatus = (typeof RECOMMENDATION_STATUSES)[number];

export const RECOMMENDATION_AREAS = ["guest_engagement", "resource", "blog", "seo_improvement", "spam_protection"] as const;
export type RecommendationArea = (typeof RECOMMENDATION_AREAS)[number];

export const PRIORITIES = ["high", "medium", "low"] as const;
export type Priority = (typeof PRIORITIES)[number];

/** Roles that may hold a growth-console session. */
export const GROWTH_ROLES = ["owner", "admin", "editor", "viewer"] as const;
export type GrowthRole = (typeof GROWTH_ROLES)[number];

/**
 * Public-facing form surfaces the spam guard protects. The four conversion kinds
 * the generator renders plus the forms a host or a guest tool adds.
 */
export const PROTECTED_FORM_IDS = [
  "booking",
  "enquiry",
  "signup",
  "checkout",
  "contact",
  "trial_class",
  "registration",
  "newsletter",
  "event_registration",
] as const;
export type ProtectedFormId = (typeof PROTECTED_FORM_IDS)[number];

export const CAPTCHA_PROVIDERS = ["none", "turnstile", "recaptcha_v2", "recaptcha_v3"] as const;
export type CaptchaProvider = (typeof CAPTCHA_PROVIDERS)[number];
