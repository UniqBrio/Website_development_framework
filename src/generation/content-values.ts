/**
 * SUPPLIED CONTENT VALUES — the class-level fix.
 *
 * THIRD INSTANCE OF ONE CLASS. `canonicalOrigin` (P1-1) and `brandSeed` (P1-2)
 * were both "the contract records that a fact EXISTS without recording the fact".
 * `contentInventory` is the third: `propositionText: "verified_available"` says
 * copy exists and not what it says.
 *
 * `framework_update.md` step 6: when a failure class appears twice the fix was
 * insufficient and the class must be addressed. So this is one general layer for
 * supplied values rather than a third bespoke field.
 *
 * The resolver NEVER invents prose. An unsupplied value resolves to an explicit
 * slot carrying what is needed, which is §12's "make missing proof look
 * intentionally incomplete rather than inventing it".
 */
import { z } from "zod";
import {
  calculatorDefinitionSchema,
  decisionFlowDefinitionSchema,
  type CalculatorDefinition,
  type DecisionFlowDefinition,
} from "../content/engagement-values.js";
import type { AssetStatus, BusinessInput } from "../design-intelligence/types/business-input.js";
import { CONFIDENCE_POLICY, confidenceFromStatus, type ConfidenceLevel } from "../content/confidence.js";
import { contactStatuses } from "../content/contact-status.js";
import { contentDraftSchema, resolveDrafts, type DraftChannel } from "../content/draft-channel.js";
import { resolveCatalogue, resolveOfferPublication, type OfferPublication, type ResolvedCatalogue } from "../content/publication.js";

/** A verified asset file with the dimensions and alternative the rules require. */
export const assetFileSchema = z.object({
  src: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  /** Informative text, or `""` with `decorative: true`. Never omitted (DD-081). */
  alt: z.string(),
  decorative: z.boolean().default(false),
});
export type AssetFile = z.infer<typeof assetFileSchema>;

/**
 * Optional actual values for the inventory categories. Every field is optional:
 * a project that has not written its copy yet is a normal state, not an error.
 */
export const suppliedContentSchema = z.object({
  propositionText: z.string().optional(),
  /** Keyed by offer name, so a description cannot drift from its offer. */
  serviceDescriptions: z.record(z.string()).optional(),
  aboutText: z.string().optional(),
  processExplanation: z.array(z.object({ step: z.string(), detail: z.string() })).optional(),
  faq: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
  legalPolicies: z.record(z.string()).optional(),
  contactDetails: z
    .object({
      addressLines: z.array(z.string()).optional(),
      phone: z.string().optional(),
      /** International WhatsApp number, e.g. "+91 98xxxxxxxx". Published only when its status is verified. */
      whatsapp: z.string().optional(),
      email: z.string().optional(),
      hours: z.array(z.string()).optional(),
    })
    .optional(),
  /**
   * Asset FILES for assets the inventory records as verified. The inventory says
   * a hero image exists; this says where it is and how big it is — the same
   * status-vs-value split as everything else in this schema. `width`/`height`
   * are required because DD-074 forbids an unsized responsive image, and `alt` is
   * required because DD-081 forbids an omitted alt attribute (empty is allowed
   * for a decorative image, and must be stated as such).
   */
  assets: z
    .object({
      logo: assetFileSchema.optional(),
      hero: assetFileSchema.optional(),
      products: z.array(assetFileSchema).optional(),
    })
    .optional(),
  /**
   * C2.2: which `BusinessInput.sources[]` record each asset file came from. A source
   * whose file provenance is unconfirmed (C2PA "may have created or modified", origin
   * unknown) cannot produce a verified asset without the customer's confirmation.
   */
  assetSources: z.object({ logo: z.string().optional(), hero: z.string().optional(), products: z.string().optional() }).optional(),
  /**
   * ENGAGEMENT DATA VALUES (ECO §17). The inventory's `comparisonData` STATUS is
   * the verification authority; these are the values. Every row must name an
   * existing owner-supplied offer and carry one value per criterion, or the table
   * is refused.
   *
   * `calculators` and `decisionFlows` carry formula and decision-rule VALUES with
   * per-item provenance and approval (content/engagement-values.ts). Parsing them
   * here admits nothing: whether one may publish is resolved against the selected
   * category, the inventory status and every item's provenance by the delivery
   * planner (engagement/delivery.ts).
   */
  engagementData: z
    .object({
      comparison: z
        .object({
          caption: z.string().min(1),
          /** The owner's label for the first column, e.g. "Plan". */
          rowHeading: z.string().min(1),
          criteria: z.array(z.string().min(1)).min(1),
          rows: z.array(z.object({ offer: z.string().min(1), values: z.array(z.string()) })).min(2),
          source: z.string().min(1),
        })
        .optional(),
      calculators: z.array(calculatorDefinitionSchema).default([]),
      decisionFlows: z.array(decisionFlowDefinitionSchema).default([]),
    })
    .optional(),
  /**
   * AI-DRAFT CHANNEL (P1-3): copy with a provenance record. An approved draft
   * publishes; an unapproved one is HELD and listed for approval; the framework
   * never authors one (content/draft-channel.ts).
   */
  drafts: z.array(contentDraftSchema).default([]),
  /**
   * Deliberately ABSENT from this schema: testimonials, reviews, ratings, awards,
   * certifications, statistics, customer logos, case studies, team credentials,
   * pricing, guarantees and regulatory claims.
   *
   * Those are §12 fabrication categories. They are not "content the generator
   * renders"; they are EVIDENCE the content engine gates. Accepting them here
   * would create a second route into publication that bypasses
   * `verifyContent()` — a conflicting authority, and the most dangerous kind.
   * They reach a page only through the verified asset inventory.
   */
});
export type SuppliedContent = z.infer<typeof suppliedContentSchema>;

export type ContentResolution<T> =
  | {
      state: "supplied";
      value: T;
      confidence: ConfidenceLevel;
      /** True when a person must approve before this is published. */
      approvalRequired: boolean;
      source: string;
    }
  | {
      state: "slot";
      /** What the host must supply, in the words a person can act on. */
      needs: string;
      /** What the page renders meanwhile. Structural, never a claim. */
      placeholder: string;
      /** True when the section must not render at all (§J.2 hidePublicly). */
      hidden: boolean;
      source: string;
    };

export interface ResolvedContent {
  proposition: ContentResolution<string>;
  about: ContentResolution<string>;
  services: ContentResolution<Array<{ name: string; description: string | null }>>;
  process: ContentResolution<Array<{ step: string; detail: string }>>;
  faq: ContentResolution<Array<{ question: string; answer: string }>>;
  legal: ContentResolution<Record<string, string>>;
  contact: ContentResolution<{
    addressLines: string[];
    phone: string | null;
    whatsapp: string | null;
    email: string | null;
    hours: string[];
  }>;
  /**
   * Verified asset FILES. The inventory (`availableAssets`) is the verification
   * authority: a file supplied for an asset the inventory does not record as
   * `verified_available` is REFUSED here, never rendered — otherwise a file drop
   * would be a second route past the content engine.
   */
  assets: {
    logo: AssetFile | null;
    hero: AssetFile | null;
    products: AssetFile[];
    refused: Array<{ asset: string; because: string }>;
  };
  /**
   * Verified comparison values for a comparison experience, or why they cannot be
   * used. NULL when nothing was supplied — most sites have no comparison, so its
   * absence is not a content slot and never asks the owner for one.
   */
  comparison:
    | { state: "supplied"; value: ComparisonTable; source: string }
    | { state: "refused"; because: string }
    | null;
  /** Parsed, NOT yet admitted: the delivery planner resolves them per selected category. */
  engagementDefinitions: { calculators: CalculatorDefinition[]; decisionFlows: DecisionFlowDefinition[] };
  /** FD-05: every offer's publication decision, published or not, for the manifest and the ledger. */
  offers: OfferPublication[];
  /** FD-03 / FD-04: the resolved catalogue — groups, items, published prices and attributes. */
  catalogue: ResolvedCatalogue;
  /** Every slot, for the generation manifest. */
  slots: Array<{ category: string; needs: string; hidden: boolean }>;
  /** P1-3: drafts published, held for approval, or rejected (routes are checked again at generation). */
  drafts: DraftChannel;
}

export interface ComparisonTable {
  caption: string;
  rowHeading: string;
  criteria: string[];
  rows: Array<{ offer: string; values: string[] }>;
}

function supplied<T>(
  value: T,
  status: AssetStatus,
  kind: "factual" | "descriptive",
  source: string,
): ContentResolution<T> {
  const confidence = confidenceFromStatus(status, kind);
  const policy = CONFIDENCE_POLICY[confidence];
  return {
    state: "supplied",
    value,
    confidence,
    approvalRequired: policy.approvalRequired,
    source,
  };
}

function slot(needs: string, placeholder: string, hidden: boolean, source: string): ContentResolution<never> {
  return { state: "slot", needs, placeholder, hidden, source };
}

/**
 * Resolve every renderable content category.
 *
 * Note which inputs are used where a value was not supplied: `businessName`,
 * `description`, offer names and page purposes are owner-supplied STRINGS already
 * in the contract, so they may be rendered literally. Extending them into a claim
 * is what is forbidden, not quoting them.
 */
export function resolveContent(input: BusinessInput, suppliedRaw?: unknown): ResolvedContent {
  const supp: SuppliedContent = suppliedContentSchema.parse(suppliedRaw ?? {});
  const inv = input.availableContent;
  const slots: ResolvedContent["slots"] = [];

  const track = <T>(category: string, resolution: ContentResolution<T>): ContentResolution<T> => {
    if (resolution.state === "slot") {
      slots.push({ category, needs: resolution.needs, hidden: resolution.hidden });
    }
    return resolution;
  };

  const drafts = resolveDrafts(supp.drafts ?? []);
  const draftFor = (target: string) => drafts.published.get(target);
  const heldNote = (target: string) => {
    const held = drafts.held.find((d) => d.target === target);
    return held ? `; an AI draft is HELD awaiting approval (${held.reason})` : "";
  };

  // ---- PROPOSITION. The owner's own `description` is a supplied string, so it
  // is a legitimate conservative fallback — quoted, not embellished.
  const propositionDraft = draftFor("proposition");
  const proposition = track(
    "proposition",
    supp.propositionText !== undefined
      ? supplied(supp.propositionText, inv.propositionText, "descriptive", "supplied proposition copy")
      : propositionDraft
        ? supplied(propositionDraft.value, "verified_available", "descriptive", `approved draft: ${propositionDraft.provenance.source} — ${propositionDraft.reason}`)
      : inv.propositionText === "verified_available" || inv.propositionText === "provided_unverified"
        ? supplied(
            input.description,
            inv.propositionText,
            "descriptive",
            "proposition copy is recorded as available but its VALUE was not supplied; the owner's own description string is rendered verbatim rather than paraphrased into a claim",
          )
        : slot(
            "propositionText — the one sentence a visitor reads first",
            "A short statement of what this business does, to be supplied by the owner.",
            false,
            `no proposition copy exists yet${heldNote("proposition")}`,
          ),
  );

  const aboutDraft = draftFor("about");
  const about = track(
    "about",
    supp.aboutText !== undefined
      ? supplied(supp.aboutText, inv.aboutText, "descriptive", "supplied about copy")
      : aboutDraft
        ? supplied(aboutDraft.value, "verified_available", "descriptive", `approved draft: ${aboutDraft.provenance.source} — ${aboutDraft.reason}`)
        : slot(
            "aboutText — who the business is",
            "About copy to be supplied by the owner.",
            false,
            `about copy status is "${inv.aboutText}" with no value supplied${heldNote("about")}`,
          ),
  );

  // ---- SERVICES. FD-05: an offer NAME is published only when its own provenance and
  // its source's publication authorisation allow it (content/publication.ts). Names
  // used to be "always real", which was true of owner-stated offers and false of
  // material a source restricts. Descriptions remain separate.
  const offerDecisions = resolveOfferPublication(input);
  const publishableOfferList = offerDecisions.filter((o) => o.decision.publish);
  const unpublishable = offerDecisions.filter((o) => !o.decision.publish);
  const services = track(
    "services",
    publishableOfferList.length > 0
      ? supplied(
          publishableOfferList.map(({ offer }) => ({
            name: offer.name,
            description:
              supp.serviceDescriptions?.[offer.name] ?? offer.description ?? null,
          })),
          inv.serviceDescriptions,
          "descriptive",
          `offer names published from their provenance (${publishableOfferList.length} of ${offerDecisions.length}); descriptions are supplied where available and left null otherwise`,
        )
      : slot(
          input.servicesProducts.length === 0
            ? "servicesProducts — at least one offer"
            : "publication authorisation for the supplied offers",
          "Services to be supplied by the owner.",
          true,
          input.servicesProducts.length === 0
            ? "no offers were supplied, so §J.2 hides an unsupported services section"
            : `no offer name may be published: ${[...new Set(unpublishable.map((o) => o.decision.reason))].join("; ")}`,
        ),
  );

  const process = track(
    "process",
    supp.processExplanation !== undefined && supp.processExplanation.length > 0
      ? supplied(supp.processExplanation, inv.processExplanation, "descriptive", "supplied process steps")
      : slot(
          "processExplanation — the ordered steps a customer goes through",
          "Process steps to be supplied by the owner.",
          false,
          `process status is "${inv.processExplanation}" with no steps supplied`,
        ),
  );

  const faq = track(
    "faq",
    supp.faq !== undefined && supp.faq.length > 0
      ? supplied(supp.faq, inv.faq, "descriptive", "supplied FAQ entries")
      : slot(
          "faq — question and answer pairs",
          "Frequently asked questions to be supplied by the owner.",
          false,
          `faq status is "${inv.faq}" with no entries supplied`,
        ),
  );

  const legal = track(
    "legal",
    supp.legalPolicies !== undefined
      ? supplied(supp.legalPolicies, inv.legalPolicies, "factual", "supplied policy documents")
      : slot(
          "legalPolicies — policy documents by name",
          "Policy documents to be supplied; a regulated business may not launch without them.",
          true,
          `legal policy status is "${inv.legalPolicies}" with no documents supplied; a summarised or invented policy would be a regulatory claim (§12)`,
        ),
  );

  // ---- CONTACT is FACTUAL, and each METHOD is its own fact. Only a method whose
  // own status is verified AND whose value was supplied is published; an
  // unverified address may not be published (§J.2), and the location fields may
  // not stand in for it (content/contact-status.ts).
  const statuses = contactStatuses(inv);
  const sc = supp.contactDetails;
  const email = statuses.email === "verified_available" ? (sc?.email ?? null) : null;
  const phone = statuses.phone === "verified_available" ? (sc?.phone ?? null) : null;
  const whatsapp = statuses.whatsapp === "verified_available" ? (sc?.whatsapp ?? null) : null;
  const addressVerified = statuses.address === "verified_available";
  const addressLines = addressVerified ? (sc?.addressLines ?? []) : [];
  // FD-14: hours have their own status (falling back to the address status), so a
  // business with verified hours and an unverified address can still publish them.
  const hours = statuses.hours === "verified_available" ? (sc?.hours ?? []) : [];
  const withheld = [
    ...(email === null ? [`email (${statuses.email}${sc?.email ? "" : ", no value"})`] : []),
    ...(phone === null ? [`phone (${statuses.phone}${sc?.phone ? "" : ", no value"})`] : []),
    ...(whatsapp === null ? [`whatsapp (${statuses.whatsapp}${sc?.whatsapp ? "" : ", no value"})`] : []),
    ...(addressLines.length === 0 ? [`address (${statuses.address}${sc?.addressLines?.length ? "" : ", no value"})`] : []),
  ];
  const contact = track(
    "contact",
    email !== null || phone !== null || whatsapp !== null || addressLines.length > 0
      ? supplied(
          { addressLines, phone, whatsapp, email, hours },
          "verified_available",
          "factual",
          `only verified, supplied contact methods are published${withheld.length > 0 ? `; withheld: ${withheld.join(", ")}` : ""}`,
        )
      : slot(
          "contactDetails — a VERIFIED address, phone or email, with its value",
          "Contact route unavailable until details are verified.",
          true,
          `no contact method is both verified and supplied; withheld: ${withheld.join(", ")} — an unverified contact fact may not be published (§J.2), and the location fields may not stand in for it`,
        ),
  );

  // ---- ASSET FILES (DD-074, DD-081, DD-085, DD-096). Inventory-gated.
  const assetRefused: ResolvedContent["assets"]["refused"] = [];
  const gated = <T>(name: string, status: string, file: T | undefined, sourceId?: string): T | null => {
    if (file === undefined) return null;
    if (status !== "verified_available") {
      assetRefused.push({
        asset: name,
        because: `a file was supplied but the asset inventory records "${status}", and the inventory is the verification authority (§12)`,
      });
      return null;
    }
    // C2.2: the file's own provenance is applied on top of the inventory, strictest
    // winning. A source that authorises no publication, or whose content credentials
    // cannot confirm the file's origin, cannot yield a verified asset by itself.
    const source = sourceId === undefined ? undefined : input.sources.find((s) => s.id === sourceId);
    if (sourceId !== undefined && !source) {
      assetRefused.push({ asset: name, because: `the asset cites source "${sourceId}", which this input does not declare` });
      return null;
    }
    if (source?.publication === "not_authorized") {
      assetRefused.push({ asset: name, because: `source "${source.id}" is not authorised for publication${source.restrictionEvidence ? `: "${source.restrictionEvidence}"` : ""}` });
      return null;
    }
    const credentials = source?.file?.contentCredentials;
    if (credentials && credentials.originConfidence !== "confirmed") {
      assetRefused.push({
        asset: name,
        because: `the file's content credentials do not confirm its origin (${credentials.originConfidence}${credentials.generator ? `, ${credentials.generator}` : ""}): "${credentials.statement}" — the customer must confirm the asset is theirs and was not AI-created or AI-altered`,
      });
      return null;
    }
    return file;
  };
  const assets: ResolvedContent["assets"] = {
    logo: gated("logo", input.availableAssets.logo, supp.assets?.logo, supp.assetSources?.logo),
    hero: gated("hero", input.availableAssets.heroImages, supp.assets?.hero, supp.assetSources?.hero),
    products: gated("products", input.availableAssets.productImages, supp.assets?.products, supp.assetSources?.products) ?? [],
    refused: assetRefused,
  };

  // ---- COMPARISON VALUES (engagement). Inventory-gated, offer-bound, shape-checked.
  const suppliedComparison = supp.engagementData?.comparison;
  let comparison: ResolvedContent["comparison"] = null;
  if (suppliedComparison) {
    // FD-05: a comparison may only name offers that may themselves be published.
    const offerNames = new Set(publishableOfferList.map((o) => o.offer.name));
    const unknownOffers = suppliedComparison.rows.filter((r) => !offerNames.has(r.offer)).map((r) => r.offer);
    const misshapen = suppliedComparison.rows.filter((r) => r.values.length !== suppliedComparison.criteria.length).map((r) => r.offer);
    if (inv.comparisonData !== "verified_available") {
      comparison = {
        state: "refused",
        because: `comparison values were supplied but the content inventory records comparisonData as "${inv.comparisonData ?? "not stated"}"; the inventory is the verification authority (§12)`,
      };
    } else if (unknownOffers.length > 0) {
      comparison = { state: "refused", because: `rows name offers that are not owner-supplied: ${unknownOffers.join(", ")} — an invented offer is a fabricated fact` };
    } else if (misshapen.length > 0) {
      comparison = { state: "refused", because: `rows without exactly one value per criterion: ${misshapen.join(", ")}` };
    } else {
      comparison = {
        state: "supplied",
        value: {
          caption: suppliedComparison.caption,
          rowHeading: suppliedComparison.rowHeading,
          criteria: suppliedComparison.criteria,
          rows: suppliedComparison.rows,
        },
        source: suppliedComparison.source,
      };
    }
  }

  const engagementDefinitions = {
    calculators: supp.engagementData?.calculators ?? [],
    decisionFlows: supp.engagementData?.decisionFlows ?? [],
  };

  return { proposition, about, services, process, faq, legal, contact, assets, comparison, engagementDefinitions, offers: offerDecisions, catalogue: resolveCatalogue(input), slots, drafts };
}

/** Categories §12 forbids the generator from ever emitting, whatever it is handed. */
export const NEVER_GENERATED = [
  "testimonials",
  "reviews",
  "ratings",
  "customer_logos",
  "awards",
  "certifications",
  "statistics",
  "customer_counts",
  "case_studies",
  "team_credentials",
  "pricing",
  "guarantees",
  "regulatory_claims",
] as const;
