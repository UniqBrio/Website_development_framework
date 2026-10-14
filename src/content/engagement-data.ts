/**
 * ENGAGEMENT DATA STATUS — the one absence semantic for data an interactive
 * experience needs (ECO §4.5, §17).
 *
 * Lives in the content subsystem, beside `contact-status.ts`, because deciding
 * whether a fact may be USED is content integrity's authority, not the engagement
 * engine's. It applies the SAME confidence policy `verifyContent()` applies
 * (`confidenceFromStatus` + `CONFIDENCE_POLICY`); it does not define a second one.
 *
 * Why this is not a `verifyContent` binding: bindings emit a section verdict and a
 * customer request for EVERY business. A florist would be asked for "formulas".
 * These data kinds matter only when a candidate experience needs them, so the
 * engagement engine asks for exactly the kinds its candidates require.
 */
import type { AssetStatus, ContentInventory } from "../design-intelligence/types/business-input.js";
import type { EngagementDataKind } from "../engagement/vocabulary.js";
import { CONFIDENCE_POLICY, confidenceFromStatus } from "./confidence.js";

export interface EngagementDataVerdict {
  kind: EngagementDataKind;
  status: AssetStatus;
  /** True only when the policy lets this data drive a public output. */
  usable: boolean;
  approvalRequired: boolean;
  reason: string;
}

/**
 * Every engagement data kind is FACTUAL: a formula, a decision rule, a price
 * range or a comparison value is a statement about the business that can be
 * false. Descriptive paraphrase is not an option for any of them.
 */
export function engagementDataVerdict(content: ContentInventory, kind: EngagementDataKind): EngagementDataVerdict {
  // Absent optional status = not supplied = unavailable. Never "probably fine".
  const status: AssetStatus = content[kind] ?? "unavailable";
  const level = confidenceFromStatus(status, "factual");
  const policy = CONFIDENCE_POLICY[level];
  const usable = status === "verified_available" && !policy.blocksPublication;
  const reason =
    status === "verified_available"
      ? "verified and available"
      : status === "provided_unverified" || status === "partial"
        ? `${status.replace("_", " ")} — factual data may not drive a public output until verified (§J.1)`
        : status === "not_applicable"
          ? "not applicable to this business"
          : "not supplied — the framework may not invent it (ECO §17)";
  return { kind, status, usable, approvalRequired: policy.approvalRequired, reason };
}
