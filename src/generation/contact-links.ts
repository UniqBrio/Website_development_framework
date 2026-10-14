/**
 * CONTACT-LINK CONVERSION — the link half of the conversion capability order
 * (design-intelligence/objectives/conversion-capabilities.ts), and the resolver
 * that follows that order at generation time.
 *
 * A contact link is a real, completable conversion: `mailto:`, `tel:` or a
 * `https://wa.me/` link opens the visitor's own mail, phone or WhatsApp app with
 * the business's VERIFIED address or number. It needs no backend, so it is honest
 * where a form without an endpoint is not.
 *
 * DD-035 single label authority, extended: each link kind has ONE contract whose
 * `actionLabel` is the only label a call to action pointing at it may use.
 */
import type { ConversionCapability, ContactLinkCapability, ConversionPlanEntry } from "../design-intelligence/objectives/conversion-capabilities.js";
import type { ResolvedContent } from "./content-values.js";

export interface ContactLinkContract {
  kind: ContactLinkCapability;
  href: string;
  /** The verified value, shown next to the label so the visitor sees where it goes. */
  value: string;
  actionLabel: string;
  intent: string;
}

const LABELS: Record<ContactLinkCapability, { actionLabel: string; intent: string }> = {
  email_link: { actionLabel: "Email us", intent: "open the visitor's email app addressed to the business's verified email" },
  phone_link: { actionLabel: "Call us", intent: "start a call to the business's verified phone number" },
  whatsapp_link: { actionLabel: "Message us on WhatsApp", intent: "open WhatsApp with the business's verified number" },
};

/** E.164-shaped: optional +, 8–15 digits after removing spaces, dots, dashes and brackets. */
function phoneDigits(value: string): string | null {
  const cleaned = value.replace(/[\s().-]/g, "");
  return /^\+?[1-9]\d{7,14}$/.test(cleaned) ? cleaned.replace(/^\+/, "") : null;
}

/**
 * The link contracts the RESOLVED content can honestly support, or why not. Only
 * a method whose own status is verified AND whose value was supplied reaches
 * `content.contact` (content-values.ts), so nothing unverified can become a link.
 */
export function contactLinkContracts(content: ResolvedContent): {
  contracts: Partial<Record<ContactLinkCapability, ContactLinkContract>>;
  unavailable: Partial<Record<ContactLinkCapability, string>>;
} {
  const contracts: Partial<Record<ContactLinkCapability, ContactLinkContract>> = {};
  const unavailable: Partial<Record<ContactLinkCapability, string>> = {};
  const c = content.contact.state === "supplied" ? content.contact.value : null;
  const why = content.contact.state === "slot" ? content.contact.source : "no verified value was supplied";

  if (c?.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) {
    contracts.email_link = { kind: "email_link", href: `mailto:${c.email}`, value: c.email, ...LABELS.email_link };
  } else {
    unavailable.email_link = c?.email ? `the supplied email "${c.email}" is not a valid address` : `no verified email: ${why}`;
  }
  const phone = c?.phone ? phoneDigits(c.phone) : null;
  if (c?.phone && phone) {
    contracts.phone_link = { kind: "phone_link", href: `tel:+${phone}`, value: c.phone, ...LABELS.phone_link };
  } else {
    unavailable.phone_link = c?.phone ? `the supplied phone "${c.phone}" is not a dialable international number` : `no verified phone: ${why}`;
  }
  const whatsapp = c?.whatsapp ? phoneDigits(c.whatsapp) : null;
  if (c?.whatsapp && whatsapp) {
    contracts.whatsapp_link = { kind: "whatsapp_link", href: `https://wa.me/${whatsapp}`, value: c.whatsapp, ...LABELS.whatsapp_link };
  } else {
    unavailable.whatsapp_link = c?.whatsapp ? `the supplied WhatsApp number "${c.whatsapp}" is not a dialable international number` : `no verified WhatsApp number: ${why}`;
  }
  return { contracts, unavailable };
}

export interface ConversionDelivery {
  objective: string;
  surface: string;
  /** The capability delivered, following the decided order, or null. */
  delivered: ConversionCapability | null;
  /** Every link contract that is feasible for this surface, in decided order (the first is primary). */
  links: ContactLinkContract[];
  /** Each capability ahead of the delivered one (or all, when none), with why it was not delivered. */
  skipped: Array<{ capability: ConversionCapability; reason: string }>;
}

/**
 * Follow the decided order. `formEndpoint` is the host's configured endpoint for
 * the page's conversion form, when it has one.
 */
export function resolveConversionDelivery(
  plan: ConversionPlanEntry,
  content: ResolvedContent,
  formEndpoint: string | undefined,
): ConversionDelivery {
  const { contracts, unavailable } = contactLinkContracts(content);
  const skipped: ConversionDelivery["skipped"] = [];
  let delivered: ConversionCapability | null = null;
  const links: ContactLinkContract[] = [];
  for (const option of plan.order) {
    let feasible: boolean;
    let reason: string;
    if (option.capability === "form") {
      feasible = formEndpoint !== undefined;
      reason = feasible ? "host-configured endpoint" : "no form endpoint is configured in the host; the framework does not invent a backend";
    } else if (!option.statusAllows) {
      feasible = false;
      reason = option.reason;
    } else {
      const contract = contracts[option.capability];
      feasible = contract !== undefined;
      reason = contract ? "verified value supplied" : (unavailable[option.capability] ?? "unavailable");
      if (contract) links.push(contract);
    }
    if (feasible && delivered === null) delivered = option.capability;
    else if (!feasible && delivered === null) skipped.push({ capability: option.capability, reason });
  }
  return { objective: plan.objective, surface: plan.surface, delivered, links, skipped };
}
