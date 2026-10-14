/**
 * Content and asset rules — §4.13 (DD-096, DD-099..DD-106).
 *
 * These are the per-missing-asset rules. `content/verification.ts` already
 * enforces every one of them through the §J.2 replacement policy; until now it
 * did so under a single composite citation (DD-098). Each rule is now encoded
 * individually and `verifyContent` cites the governing rule id on every section
 * verdict, so an approval item can name the rule that raised it.
 *
 * Classification is `approval` for the hide-and-request rules because their
 * observable output is an explicit approval/request state, never a rendered
 * substitute. DD-096 is `executable` (it changes what the header renders) and
 * DD-106 is a `gate` (it forbids a skeleton standing in for an unknown fact).
 */
import { parseRule, type Rule } from "../types/decision.js";

const DECORATIVE = "https://www.w3.org/WAI/tutorials/images/decorative/";
const WCAG = "https://www.w3.org/TR/WCAG22/";
const BAYMARD_METHOD = "https://baymard.com/research/methodology";
const BAYMARD_CHECKOUT = "https://baymard.com/blog/current-state-of-checkout-ux";
const BAYMARD_PDP = "https://baymard.com/blog/current-state-ecommerce-product-page-ux";
const NEXT_PROD = "https://nextjs.org/docs/app/guides/production-checklist";
const SITEINSPIRE = "https://www.siteinspire.com/";

export const CONTENT_RULES: readonly Rule[] = [
  parseRule({
    id: "DD-096",
    title: "Missing logo",
    domain: "content",
    classification: "executable",
    consumer: "generation/component-model.ts",
    sourceSection: "§4.13",
    if: [{ fact: "logoAvailable", op: "eq", value: false }],
    then: [
      { kind: "set", target: "identity.mark", value: "verified_name_wordmark" },
      { kind: "set", target: "identity.markStatus", value: "provisional" },
      { kind: "forbid", target: "identity", value: "invented_trademark_like_logo" },
    ],
    otherwise: [{ kind: "set", target: "identity.mark", value: "verified_logo_asset" }],
    avoid: ["inventing_official_trademark_like_logo"],
    fallback: ["text wordmark"],
    rationale: "Identity can be presented safely without claiming an unapproved logo.",
    source_urls: [DECORATIVE],
    confidence: "high",
  }),
  parseRule({
    id: "DD-099",
    title: "Missing customer logos",
    domain: "content",
    classification: "approval",
    consumer: "content/verification.ts",
    sourceSection: "§4.13",
    then: [
      { kind: "require", target: "content", value: "customer logo wall hidden unless every logo is verified with a real relationship and permission" },
      { kind: "forbid", target: "content", value: "recognisable_brand_logos_without_relationship_and_permission" },
    ],
    avoid: ["using_recognisable_brand_logos_without_relationship_and_permission"],
    fallback: ["evidence-free but honest capability/process section"],
    rationale: "Client logos imply a factual commercial relationship.",
    source_urls: [WCAG],
    confidence: "high",
    approval_required: true,
  }),
  parseRule({
    id: "DD-100",
    title: "Missing awards/statistics/certifications/reviews",
    domain: "content",
    classification: "approval",
    consumer: "content/verification.ts",
    sourceSection: "§4.13",
    then: [
      { kind: "require", target: "content", value: "each proof module hidden unless verified; request source, date, permission and scope" },
      { kind: "forbid", target: "content", value: "invented_badges_ratings_metrics_or_claims" },
    ],
    avoid: ["invented_badges_ratings_metrics_claims"],
    fallback: ["no proof module, or verified methodology text"],
    rationale: "Reputational and regulated proof requires source-backed verification.",
    source_urls: [WCAG],
    confidence: "high",
    approval_required: true,
  }),
  parseRule({
    id: "DD-101",
    title: "Missing contact details",
    domain: "content",
    classification: "approval",
    consumer: "content/verification.ts",
    sourceSection: "§4.13",
    if: [{ fact: "conversionEndpointVerified", op: "eq", value: false }],
    then: [
      { kind: "set", target: "contact.publicCta", value: "blocked_until_verified" },
      { kind: "require", target: "content", value: "request a verified contact method before any public contact CTA" },
      { kind: "forbid", target: "content", value: "guessed_email_phone_social_or_address" },
    ],
    otherwise: [{ kind: "set", target: "contact.publicCta", value: "allowed" }],
    avoid: ["guessing_email_phone_social_handles_address"],
    fallback: ["hide contact section until a functional route exists"],
    rationale: "A CTA must have a real, verified endpoint.",
    source_urls: [NEXT_PROD],
    confidence: "high",
    approval_required: true,
  }),
  parseRule({
    id: "DD-102",
    title: "Missing pricing",
    domain: "content",
    classification: "approval",
    consumer: "content/verification.ts",
    sourceSection: "§4.13",
    then: [
      { kind: "require", target: "content", value: "pricing cards hidden unless pricing is verified; an approved enquiry CTA is the only substitute" },
      { kind: "forbid", target: "content", value: "invented_starting_price_discount_plan_trial_or_guarantee" },
    ],
    avoid: ["invented_starting_price_discount_plan_trial_or_guarantee"],
    fallback: ["\"Discuss requirements\" only if the route is verified"],
    rationale: "Pricing is commercial factual content and requires approval.",
    source_urls: [BAYMARD_CHECKOUT],
    confidence: "high",
    approval_required: true,
  }),
  parseRule({
    id: "DD-103",
    title: "Missing product imagery",
    domain: "content",
    classification: "approval",
    consumer: "content/verification.ts",
    sourceSection: "§4.13",
    if: [
      { fact: "sellsProducts", op: "eq", value: true },
      { fact: "hasProductVisualProof", op: "eq", value: false },
    ],
    then: [
      { kind: "set", target: "commerce.publicPurchase", value: "blocked" },
      { kind: "require", target: "content", value: "a private catalogue setup structure, no public purchase path" },
      { kind: "forbid", target: "content", value: "fabricated_products_or_product_photography" },
    ],
    otherwise: [{ kind: "set", target: "commerce.publicPurchase", value: "allowed_when_verified" }],
    avoid: ["fabricated_products_or_product_photography"],
    fallback: ["hide product gallery and public purchase path"],
    rationale: "Products must be inspectable and accurately represented before sale.",
    source_urls: [BAYMARD_PDP],
    confidence: "high",
    approval_required: true,
  }),
  parseRule({
    id: "DD-104",
    title: "Missing portfolio/case study",
    domain: "content",
    classification: "approval",
    consumer: "content/verification.ts",
    sourceSection: "§4.13",
    then: [
      { kind: "require", target: "content", value: "portfolio module hidden unless verified; replaced by a verified capability or process section" },
      { kind: "forbid", target: "content", value: "invented_projects_clients_outcomes_or_screenshots" },
    ],
    avoid: ["invented_projects_clients_outcomes_or_screenshots"],
    fallback: ["methodology page"],
    rationale: "Portfolio evidence is factual work proof.",
    source_urls: [SITEINSPIRE],
    confidence: "high",
    approval_required: true,
  }),
  parseRule({
    id: "DD-105",
    title: "AI draft content",
    domain: "content",
    classification: "approval",
    consumer: "content/confidence.ts",
    sourceSection: "§4.13",
    then: [
      { kind: "set", target: "content.aiDraftPolicy", value: "publish_only_after_explicit_approval" },
      { kind: "require", target: "content", value: "AI-drafted text labelled \"AI draft — verify\" and held until approved" },
      { kind: "forbid", target: "content", value: "new_metrics_superlatives_outcomes_credentials_or_location_claims_in_drafts" },
    ],
    prefer: ["conservative paraphrase from supplied facts"],
    avoid: ["new_metrics_superlatives_outcomes_credentials_location_claims"],
    fallback: ["neutral verified wording"],
    rationale: "AI-generated language may alter a business claim and needs provenance/approval.",
    source_urls: [NEXT_PROD],
    confidence: "high",
    approval_required: true,
  }),
  parseRule({
    id: "DD-106",
    title: "Empty state vs skeleton",
    domain: "content",
    classification: "gate",
    consumer: "generation/component-model.ts",
    sourceSection: "§4.13",
    then: [
      { kind: "set", target: "content.absentAssetState", value: "editor_empty_state_or_public_omission" },
      { kind: "forbid", target: "content", value: "skeleton_for_unknown_business_facts" },
    ],
    avoid: ["skeleton_for_unknown_business_facts"],
    fallback: ["neutral public layout or hidden section"],
    rationale: "Loading state and absent content are different states.",
    source_urls: ["https://atlassian.design/components", "https://shopify.dev/docs/api/pos-ui-extensions/latest/polaris-web-components/layout-and-structure/empty-state"],
    confidence: "high",
  }),
];
