/**
 * PROVENANCE — the one vocabulary for where a value came from, and whether it may
 * be treated as true. Dependency-free on purpose: the input contract, the draft
 * channel, engagement values and publication all import it, so none of them can
 * grow a second vocabulary (remediation plan C2).
 *
 * Moved here from `engagement-values.ts` (which re-exports it unchanged) when
 * per-value provenance was extended from AI drafts and engagement data to business
 * facts (FD-05). Two values were added:
 *   public_source       — found in public material (a listing, a website). Requires
 *                         an approval record before it may be published.
 *   operator_inference  — derived by an operator or AI from other evidence. Never a
 *                         fact: no approval turns an inference into one; the customer
 *                         restates it and it becomes `customer_supplied_*`.
 */
import { z } from "zod";

export const PROVENANCE_VALUES = [
  "customer_supplied_verified",
  "customer_supplied_unverified",
  "ai_draft",
  "approved_ai_draft",
  "framework_policy",
  "external_authoritative_source",
  "public_source",
  "operator_inference",
  "unavailable",
] as const;
export type Provenance = (typeof PROVENANCE_VALUES)[number];

export const approvalSchema = z.object({
  approvedBy: z.string().min(1),
  /** ISO date of the approval. */
  approvedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}/, "approvedAt must be an ISO date"),
  note: z.string().optional(),
});
export type ApprovalRecord = z.infer<typeof approvalSchema>;

/** The provenance record fields, shared by every channel that carries owner-, AI- or publicly-sourced values. */
export const provenanceRecordFields = {
  provenance: z.enum(PROVENANCE_VALUES),
  /** Where the value was found, in words a reviewer can check. */
  source: z.string().min(1),
  /**
   * The `BusinessInput.sources[]` record the value came from. A source that is not
   * authorised for publication withholds every value that cites it, whatever the
   * value's own verification says (FD-05, FD-03).
   */
  sourceId: z.string().min(1).optional(),
  approval: approvalSchema.optional(),
};
export const provenanceSchema = z.object(provenanceRecordFields);
export type ProvenanceRecord = z.infer<typeof provenanceSchema>;

export type ValueStatus = "verified" | "unverified" | "unavailable";

export interface ProvenanceLine {
  item: string;
  provenance: Provenance;
  source: string;
  approvedBy: string | null;
  status: ValueStatus;
  reason: string;
}

/** Resolve one item. `kind` separates business data from mathematical facts and copy. */
export function resolveProvenance(
  item: string,
  record: ProvenanceRecord,
  kind: "business" | "mathematical" | "copy",
): ProvenanceLine {
  const base = { item, provenance: record.provenance, source: record.source, approvedBy: record.approval?.approvedBy ?? null };
  switch (record.provenance) {
    case "customer_supplied_verified":
      return { ...base, status: "verified", reason: "owner-supplied and verified" };
    case "approved_ai_draft":
    case "external_authoritative_source":
    case "public_source":
      return record.approval
        ? { ...base, status: "verified", reason: `approved by ${record.approval.approvedBy} on ${record.approval.approvedAt}` }
        : { ...base, status: "unverified", reason: `${record.provenance.replace(/_/g, " ")} without an approval record (approvedBy + approvedAt) may not be published` };
    case "framework_policy":
      return kind === "mathematical"
        ? { ...base, status: "verified", reason: "a mathematical fact the framework may state" }
        : { ...base, status: "unverified", reason: "the framework may not author a business formula, rate, price, rule, assumption or copy" };
    case "ai_draft":
      return { ...base, status: "unverified", reason: "an AI draft never becomes public truth without approval (DD-105)" };
    case "operator_inference":
      return { ...base, status: "unverified", reason: "an inference is never a fact; only the customer's own statement can replace it" };
    case "customer_supplied_unverified":
      return { ...base, status: "unverified", reason: "owner-supplied but not verified" };
    case "unavailable":
      return { ...base, status: "unavailable", reason: "marked unavailable" };
  }
}
