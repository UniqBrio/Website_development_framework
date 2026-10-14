/**
 * PUBLICATION — may this VALUE appear on a public page? (FD-05, FD-03.)
 *
 * The content engine already decides whether a CATEGORY of claim may be published
 * (`verification.ts`, from the inventory). This module decides the same question for
 * ONE VALUE from its own provenance, and the two are applied together, strictest
 * winning — the rule `engagement-values.ts` already follows for experience data.
 *
 * THE POLICY (owner decision, 2026-09-15):
 *   - An unverified, owner-stated NAME may publish literally only when its SOURCE is
 *     authorised for publication. "Unknown" is not authorisation.
 *   - A source marked not authorised (for example a menu headed "For design
 *     illustrations only") withholds every value citing it, whatever the value's own
 *     verification says. A source restriction OVERRIDES verification.
 *   - AI-generated values stay unpublishable until approved.
 *   - Publicly discovered values need verification or approval.
 *   - Inferred values never publish as facts, with or without approval.
 *   - Compatibility: an offer with NO provenance record is an owner-stated offer from
 *     a pre-provenance input and publishes literally, exactly as before. New intake
 *     records provenance, and then the policy above decides.
 *
 * FACTS (prices, measured figures, regulated attributes) are stricter than names:
 * only `customer_supplied_verified` publishes. An approved AI draft is copy, never a
 * price — a number a person waved through is still a number nobody measured.
 */
import type { BusinessInput, Offer, Price, SourceRecord, ValueProvenance } from "../design-intelligence/types/business-input.js";
import { attributeDefinition } from "./attribute-vocabulary.js";

export type PublicationState = "published" | "held" | "withheld" | "refused";

export interface PublicationDecision {
  state: PublicationState;
  publish: boolean;
  reason: string;
  /** `null` for a legacy value with no record. */
  provenance: ValueProvenance["provenance"] | null;
  sourceId: string | null;
}

/** What a value may be: literal customer wording, or a fact the framework asserts. */
export type ValueKind = "literal" | "fact";

const decision = (state: PublicationState, reason: string, record: ValueProvenance | undefined): PublicationDecision => ({
  state,
  publish: state === "published",
  reason,
  provenance: record?.provenance ?? null,
  sourceId: record?.sourceId ?? null,
});

export function sourceOf(sources: readonly SourceRecord[], sourceId: string | undefined): SourceRecord | undefined {
  return sourceId === undefined ? undefined : sources.find((s) => s.id === sourceId);
}

/**
 * Resolve one value against the policy. `sources` is `BusinessInput.sources`.
 */
export function resolvePublication(
  record: ValueProvenance | undefined,
  sources: readonly SourceRecord[],
  kind: ValueKind,
): PublicationDecision {
  if (!record) {
    return kind === "literal"
      ? decision("published", "no provenance record: an owner-stated value from a pre-provenance input, published literally as before; new intake must record provenance", record)
      : decision("held", "no provenance record: a fact may not be published without one", record);
  }

  if (record.sourceId !== undefined) {
    const source = sourceOf(sources, record.sourceId);
    if (!source) {
      return decision("refused", `provenance cites source "${record.sourceId}", which this input does not declare`, record);
    }
    if (source.publication === "not_authorized") {
      const evidence = source.restrictionEvidence ? `: "${source.restrictionEvidence}"` : "";
      return decision("withheld", `source "${source.id}" is not authorised for publication${evidence} — a source restriction overrides verification`, record);
    }
    if (source.publication === "unknown" && record.provenance === "customer_supplied_unverified") {
      return decision("held", `source "${source.id}" does not state whether it may be published; an unverified value publishes literally only from an authorised source`, record);
    }
  } else if (record.provenance === "customer_supplied_unverified") {
    return decision("held", "no source is cited, so nothing authorises publication of an unverified value", record);
  }

  switch (record.provenance) {
    case "customer_supplied_verified":
      return decision("published", "customer-supplied and verified", record);
    case "customer_supplied_unverified":
      // Reached only with an authorised source (checked above).
      return kind === "literal"
        ? decision("published", "owner-stated, published literally from a source authorised for publication", record)
        : decision("held", "a fact needs verification, not only an authorised source", record);
    case "approved_ai_draft":
      if (kind === "fact") return decision("refused", "an AI-drafted fact never publishes; a fact is measured, not approved", record);
      return record.approval
        ? decision("published", `AI draft approved by ${record.approval.approvedBy} on ${record.approval.approvedAt}`, record)
        : decision("held", "approved_ai_draft without an approval record (approvedBy + approvedAt)", record);
    case "ai_draft":
      return kind === "fact"
        ? decision("refused", "an AI-drafted fact never publishes", record)
        : decision("held", "an AI draft never becomes public content without approval (DD-105)", record);
    case "public_source":
    case "external_authoritative_source":
      if (record.approval) return decision("published", `publicly sourced, approved by ${record.approval.approvedBy} on ${record.approval.approvedAt}`, record);
      return decision("held", "publicly discovered material requires verification or an approval record before publication", record);
    case "operator_inference":
      return decision("refused", "an inference never publishes as a fact; the customer must state it", record);
    case "framework_policy":
      return decision("refused", "the framework does not author business values", record);
    case "unavailable":
      return decision("refused", "marked unavailable", record);
  }
}

export interface OfferPublication {
  offer: Offer;
  decision: PublicationDecision;
}

/**
 * Offer NAMES, resolved once. Every consumer that would render, link, list or
 * describe an offer reads this, so one offer cannot be withheld on the page and
 * published in structured data.
 */
export function resolveOfferPublication(input: BusinessInput): OfferPublication[] {
  return input.servicesProducts.map((offer) => {
    if (!offer.customerSupplied) {
      return { offer, decision: decision("refused", "not owner-supplied (§J.2)", offer.provenance) };
    }
    return { offer, decision: resolvePublication(offer.provenance, input.sources, "literal") };
  });
}

/** The offers whose names may appear publicly. */
export function publishableOffers(input: BusinessInput): Offer[] {
  return resolveOfferPublication(input).filter((o) => o.decision.publish).map((o) => o.offer);
}

// ------------------------------------------------------------------ catalogue (FD-03, FD-04)

export interface ResolvedPrice {
  /** The formatted price, ready to render. */
  display: string;
  amount: number;
  currency: string;
  unit: string | null;
  taxNote: string | null;
  decision: PublicationDecision;
}

export interface ResolvedAttribute {
  key: string;
  label: string;
  value: string;
  regulated: boolean;
  decision: PublicationDecision;
}

export interface ResolvedCatalogueItem {
  name: string;
  description: string | null;
  groupIds: string[];
  price: ResolvedPrice | null;
  variants: Array<{ label: string; price: ResolvedPrice | null }>;
  attributes: ResolvedAttribute[];
  /** Values the policy refused or held, so the approval surface can list them. */
  withheld: Array<{ what: string; reason: string }>;
}

export interface ResolvedCatalogue {
  groups: Array<{ id: string; name: string; order: number; items: ResolvedCatalogueItem[] }>;
  /** Published items whose group is unknown or ambiguous: listed, never guessed into a group. */
  ungrouped: ResolvedCatalogueItem[];
  withheld: Array<{ what: string; reason: string }>;
}

function formatPrice(price: Price): string {
  const symbolLike = price.currency.length <= 2;
  const amount = Number.isInteger(price.amount) ? String(price.amount) : price.amount.toFixed(2);
  const base = symbolLike ? `${price.currency}${amount}` : `${price.currency} ${amount}`;
  return [base, price.unit ? `per ${price.unit}` : null, price.taxNote ? `(${price.taxNote})` : null].filter(Boolean).join(" ");
}

/**
 * Resolve a price. A price is a FACT: only a verified value from a source that
 * authorises publication reaches a page, and the `pricing` inventory status must agree
 * (strictest wins) — the same two-layer rule engagement data already follows.
 */
export function resolvePrice(price: Price | undefined, input: BusinessInput): ResolvedPrice | { decision: PublicationDecision } | null {
  if (!price) return null;
  const decision = resolvePublication(price.provenance, input.sources, "fact");
  const inventoryVerified = input.availableContent.pricing === "verified_available";
  if (!decision.publish || !inventoryVerified) {
    return {
      decision: decision.publish
        ? { ...decision, state: "held", publish: false, reason: `the content inventory records pricing as "${input.availableContent.pricing}"; a price publishes only when the value AND the inventory are verified` }
        : decision,
    };
  }
  return {
    display: formatPrice(price),
    amount: price.amount,
    currency: price.currency,
    unit: price.unit ?? null,
    taxNote: price.taxNote ?? null,
    decision,
  };
}

/**
 * The catalogue, resolved once: which names, prices, attributes and groups may appear.
 * Everything else is recorded in `withheld` with the reason.
 */
export function resolveCatalogue(input: BusinessInput): ResolvedCatalogue {
  const withheld: ResolvedCatalogue["withheld"] = [];
  const groupPublication = new Map<string, PublicationDecision>();
  for (const group of input.offerGroups) {
    const decision = resolvePublication(group.provenance, input.sources, "literal");
    groupPublication.set(group.id, decision);
    if (!decision.publish) withheld.push({ what: `group "${group.name}"`, reason: decision.reason });
  }

  const items: ResolvedCatalogueItem[] = [];
  for (const { offer, decision } of resolveOfferPublication(input)) {
    if (!decision.publish) continue;
    const itemWithheld: ResolvedCatalogueItem["withheld"] = [];

    const price = resolvePrice(offer.price, input);
    if (price && !("display" in price)) itemWithheld.push({ what: `price of "${offer.name}"`, reason: price.decision.reason });

    const variants = offer.variants.map((variant) => {
      const variantPrice = resolvePrice(variant.price, input);
      if (variantPrice && !("display" in variantPrice)) itemWithheld.push({ what: `price of "${offer.name}" (${variant.label})`, reason: variantPrice.decision.reason });
      return { label: variant.label, price: variantPrice && "display" in variantPrice ? variantPrice : null };
    });

    const attributes: ResolvedAttribute[] = [];
    for (const attribute of offer.attributes) {
      const definition = attributeDefinition(input.industry, attribute.key);
      if (!definition) {
        itemWithheld.push({ what: `attribute "${attribute.key}" of "${offer.name}"`, reason: `"${attribute.key}" is not in the ${input.industry} attribute vocabulary; an unknown attribute is an unreviewed claim` });
        continue;
      }
      if (definition.values && !definition.values.includes(attribute.value)) {
        itemWithheld.push({ what: `attribute "${attribute.key}" of "${offer.name}"`, reason: `"${attribute.value}" is not one of ${definition.values.join(", ")}` });
        continue;
      }
      // A regulated attribute is a FACT (verified values only); others may be literal.
      const attributeDecision = resolvePublication(attribute.provenance, input.sources, definition.regulated ? "fact" : "literal");
      if (!attributeDecision.publish) {
        itemWithheld.push({ what: `${definition.label} of "${offer.name}"`, reason: `${attributeDecision.reason}${definition.regulated ? " (regulated attribute: verified values only)" : ""}` });
        continue;
      }
      attributes.push({ key: attribute.key, label: definition.label, value: attribute.value, regulated: definition.regulated, decision: attributeDecision });
    }

    const publishedGroups = offer.groupIds.filter((id) => groupPublication.get(id)?.publish);
    for (const id of offer.groupIds) {
      if (!groupPublication.has(id)) itemWithheld.push({ what: `group "${id}" of "${offer.name}"`, reason: "the offer cites a group this input does not declare" });
    }

    items.push({
      name: offer.name,
      description: offer.description ?? null,
      groupIds: publishedGroups,
      price: price && "display" in price ? price : null,
      variants,
      attributes,
      withheld: itemWithheld,
    });
    withheld.push(...itemWithheld);
  }

  const groups = input.offerGroups
    .filter((g) => groupPublication.get(g.id)?.publish)
    .map((g, index) => ({ id: g.id, name: g.name, order: g.order ?? 1000 + index, items: items.filter((i) => i.groupIds.includes(g.id)) }))
    .filter((g) => g.items.length > 0)
    .sort((a, b) => a.order - b.order);

  const grouped = new Set(groups.flatMap((g) => g.items.map((i) => i.name)));
  return { groups, ungrouped: items.filter((i) => !grouped.has(i.name)), withheld };
}

/** One line per non-published offer, grouped by reason, for the approval surface. */
export function offerPublicationApprovals(input: BusinessInput): string[] {
  const byReason = new Map<string, string[]>();
  for (const { offer, decision: d } of resolveOfferPublication(input)) {
    if (d.publish) continue;
    byReason.set(`${d.state}: ${d.reason}`, [...(byReason.get(`${d.state}: ${d.reason}`) ?? []), offer.name]);
  }
  return [...byReason.entries()].map(([reason, names]) =>
    `offer name${names.length === 1 ? "" : "s"} not publishable (${names.length}) — ${reason}${names.length <= 3 ? `: ${names.join(", ")}` : `: ${names.slice(0, 3).join(", ")}, …`}`,
  );
}
