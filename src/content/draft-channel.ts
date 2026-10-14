/**
 * APPROVED AI-DRAFT CONTENT CHANNEL (customer dry run P1-3).
 *
 * ROOT CAUSE this closes: supplied content had one state — supplied — so copy
 * drafted with AI help (Phase S positioning, a locality title, a meta description
 * written to its brief) had no way to reach a page even AFTER the owner approved
 * it, and no way to be HELD visibly before. The only honest outcome was a slot.
 *
 * ONE VOCABULARY: a draft carries the same provenance record as engagement values
 * (content/engagement-values.ts). The same resolver decides it:
 *   approved_ai_draft + approval record  → published, with the approval on record
 *   customer_supplied_verified            → published (the owner wrote it)
 *   ai_draft / customer_supplied_unverified / unapproved approved_ai_draft → HELD:
 *                                           the slot stays, the draft is listed for approval
 *   framework_policy                      → rejected: the framework never authors copy
 *   unavailable                           → rejected
 *
 * Drafts carry COPY only. Evidence categories (ratings, counts, credentials,
 * prices, guarantees) are not draftable here: they reach a page only through the
 * verified inventory (content-values.ts NEVER_GENERATED), so a draft cannot be a
 * second route past verification.
 */
import { z } from "zod";
import { provenanceRecordFields, resolveProvenance, type ProvenanceLine } from "./engagement-values.js";

export const DRAFT_TARGET = /^(proposition|about|title:\/\S*|metaDescription:\/\S*)$/;

export const contentDraftSchema = z.object({
  /** `proposition`, `about`, `title:<route>` or `metaDescription:<route>`. */
  target: z.string().regex(DRAFT_TARGET, "draft target must be proposition, about, title:<route> or metaDescription:<route>"),
  value: z.string().min(1),
  ...provenanceRecordFields,
});
export type ContentDraft = z.infer<typeof contentDraftSchema>;

export interface DraftResolution {
  target: string;
  value: string;
  status: "published" | "held" | "rejected";
  provenance: ProvenanceLine;
  reason: string;
}

export interface DraftChannel {
  /** target → the published value. At most one per target. */
  published: Map<string, DraftResolution>;
  held: DraftResolution[];
  rejected: DraftResolution[];
}

/** Text that would be markup, not copy, is refused rather than escaped into a page. */
const MARKUP = /<[a-z!/]/i;

export function resolveDrafts(drafts: readonly ContentDraft[], knownRoutes?: ReadonlySet<string>): DraftChannel {
  const published = new Map<string, DraftResolution>();
  const held: DraftResolution[] = [];
  const rejected: DraftResolution[] = [];
  for (const draft of drafts) {
    const line = resolveProvenance(`draft ${draft.target}`, draft, "copy");
    const base = { target: draft.target, value: draft.value, provenance: line };
    const route = draft.target.includes(":") ? draft.target.slice(draft.target.indexOf(":") + 1) : null;
    if (route !== null && knownRoutes && !knownRoutes.has(route)) {
      rejected.push({ ...base, status: "rejected", reason: `no page exists at ${route}` });
    } else if (MARKUP.test(draft.value)) {
      rejected.push({ ...base, status: "rejected", reason: "a draft is plain copy; markup is refused" });
    } else if (line.status === "verified") {
      if (published.has(draft.target)) {
        rejected.push({ ...base, status: "rejected", reason: `a second published value for ${draft.target}; one target has one value` });
      } else {
        published.set(draft.target, { ...base, status: "published", reason: line.reason });
      }
    } else if (line.status === "unverified" && draft.provenance !== "framework_policy") {
      held.push({ ...base, status: "held", reason: line.reason });
    } else {
      rejected.push({ ...base, status: "rejected", reason: line.reason });
    }
  }
  return { published, held, rejected };
}
