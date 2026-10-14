/**
 * Content and asset integrity — specification §12 and appendix J.
 *
 * This is the one subsystem whose job is to BLOCK, not to advise. §12 lists 29
 * categories that may never be fabricated; §J.1 defines five confidence levels
 * with a publication policy each; §J.2 gives the replacement policy per missing
 * item.
 *
 * Design note: the fabrication list is expressed as data, and the check is
 * "is this claim category present in the verified inventory?" — never "does the
 * generated text look plausible?". A plausibility test would pass a
 * well-written fabrication, which is the failure this file exists to prevent.
 */
import { z } from "zod";
import type { AssetStatus } from "../design-intelligence/types/business-input.js";

/** §J.1 confidence_levels. */
export const confidenceLevelSchema = z.enum([
  "verified",
  "customer_supplied_incomplete",
  "ai_draft",
  "neutral_placeholder",
  "verification_required",
]);
export type ConfidenceLevel = z.infer<typeof confidenceLevelSchema>;

export interface ConfidencePolicy {
  /** What may happen to this content publicly. */
  publication: "render_normally" | "literal_or_conservative_paraphrase_only" | "approval_required" | "allowed_if_nonfactual" | "hidden";
  editorLabel: string | null;
  /** True when a human must sign off before this reaches a public page. */
  approvalRequired: boolean;
  /** True when the content may never be published in its current state. */
  blocksPublication: boolean;
}

/** §J.1, transcribed. */
export const CONFIDENCE_POLICY: Record<ConfidenceLevel, ConfidencePolicy> = {
  verified: {
    publication: "render_normally",
    editorLabel: null,
    approvalRequired: false,
    blocksPublication: false,
  },
  customer_supplied_incomplete: {
    publication: "literal_or_conservative_paraphrase_only",
    editorLabel: null,
    approvalRequired: false,
    blocksPublication: false,
  },
  ai_draft: {
    // DD-105: an AI draft is labelled, held, and never becomes public truth
    // without explicit approval.
    publication: "approval_required",
    editorLabel: "AI draft — verify",
    approvalRequired: true,
    // Blocks until approved: §12 says AI-generated factual content must not
    // automatically become public truth.
    blocksPublication: true,
  },
  neutral_placeholder: {
    publication: "allowed_if_nonfactual",
    editorLabel: "Asset needed",
    approvalRequired: false,
    blocksPublication: false,
  },
  verification_required: {
    publication: "hidden",
    editorLabel: "Verification required — publication blocked",
    approvalRequired: true,
    blocksPublication: true,
  },
};

/**
 * §12's never-fabricate list, as data. Each entry names the claim category and
 * whether it is a FACTUAL claim (a statement about the world that could be
 * false) — factual claims are the ones that can be blocked.
 */
export const NEVER_FABRICATE = [
  "testimonials",
  "reviews",
  "ratings",
  "endorsements",
  "customer_logos",
  "partnerships",
  "awards",
  "certifications",
  "statistics",
  "customer_counts",
  "revenue",
  "locations",
  "addresses",
  "phone_numbers",
  "email_addresses",
  "opening_hours",
  "pricing",
  "guarantees",
  "team_members",
  "biographies",
  "qualifications",
  "case_studies",
  "portfolio_work",
  "product_screenshots",
  "product_features",
  "customer_outcomes",
  "regulatory_claims",
  "security_claims",
  "medical_claims",
  "financial_claims",
  // Added with engagement intelligence (ECO §17): the data interactive
  // experiences compute or recommend from. Each is a statement about the
  // business that a calculator, selector or checker would present as fact.
  "formulas",
  "eligibility_rules",
  "decision_rules",
  "recommendations",
  "benchmarks",
  "savings_claims",
  "compatibility",
  "inventory",
  "availability",
] as const;
export type FabricationCategory = (typeof NEVER_FABRICATE)[number];

const FABRICATION_SET: ReadonlySet<string> = new Set(NEVER_FABRICATE);

export function isFabricationRisk(category: string): category is FabricationCategory {
  return FABRICATION_SET.has(category);
}

/**
 * Map an inventory AssetStatus onto a confidence level.
 *
 * The important mapping is `provided_unverified` → `verification_required`, NOT
 * → `customer_supplied_incomplete`. Customer-supplied *descriptive* content may
 * be paraphrased conservatively; a customer-supplied *factual claim* that nobody
 * verified is exactly the thing §J.1 hides. The caller says which it is.
 */
export function confidenceFromStatus(
  status: AssetStatus,
  kind: "factual" | "descriptive",
): ConfidenceLevel {
  switch (status) {
    case "verified_available":
      return "verified";
    case "provided_unverified":
      return kind === "factual" ? "verification_required" : "customer_supplied_incomplete";
    case "partial":
      return kind === "factual" ? "verification_required" : "customer_supplied_incomplete";
    case "unavailable":
      return "neutral_placeholder";
    case "not_applicable":
      return "neutral_placeholder";
  }
}

export interface ClaimAssessment {
  category: string;
  level: ConfidenceLevel;
  policy: ConfidencePolicy;
  /** Human-readable reason, used in the publication report. */
  reason: string;
}

export interface PublicationVerdict {
  /** False when ANY factual claim in scope is blocked. */
  publishable: boolean;
  blocked: ClaimAssessment[];
  needsApproval: ClaimAssessment[];
  hidden: string[];
  renderable: ClaimAssessment[];
}

/**
 * Decide what may be published. A single blocked factual claim does not block
 * the whole SITE — it is hidden, and the page is publishable without it. What
 * IS blocked outright is publishing that claim.
 *
 * This distinction matters: §12 says "do not make the public website look
 * incomplete merely because proof assets are unavailable", so hiding is the
 * remedy and site-wide refusal is not.
 */
export function assessPublication(claims: readonly ClaimAssessment[]): PublicationVerdict {
  const blocked: ClaimAssessment[] = [];
  const needsApproval: ClaimAssessment[] = [];
  const renderable: ClaimAssessment[] = [];

  for (const claim of claims) {
    if (claim.policy.blocksPublication) blocked.push(claim);
    else renderable.push(claim);
    if (claim.policy.approvalRequired) needsApproval.push(claim);
  }

  return {
    // "publishable" means: the page can ship with the blocked claims removed.
    // It is false only when a claim that is STRUCTURALLY required is blocked;
    // that judgement belongs to the caller, which passes only required claims.
    publishable: blocked.length === 0,
    blocked,
    needsApproval,
    hidden: blocked.map((c) => c.category),
    renderable,
  };
}
