/**
 * CONVERSION CAPABILITIES — the decided order in which an objective may convert
 * (customer dry run P1-2).
 *
 * ROOT CAUSE this replaces: the only conversion capability was a FORM. A lead-
 * generation practice holding a verified email address, with no form backend,
 * offered visitors no way to reach it: the form rendered disabled, and the email
 * lived only inside a contact section no page received.
 *
 * The capability order is a DECISION made here, before generation, from the
 * conversion surface and the owner's stated preference. Generation delivers the
 * FIRST capability that is actually feasible and records why each earlier one was
 * not. That is the decided order being followed — never a generator quietly
 * swapping one implementation for another.
 *
 * Feasibility at decision time is the verification STATUS. Whether a value was
 * supplied, and whether the host configured a form endpoint, are known only at
 * generation; those resolve there, against this order.
 */
import type { BusinessInput, WebsiteObjective } from "../types/business-input.js";
import { contactStatuses } from "../../content/contact-status.js";
import { OBJECTIVE_ARCHITECTURE } from "./objective-architecture.js";

export const CONVERSION_CAPABILITIES = ["form", "email_link", "phone_link", "whatsapp_link"] as const;
export type ConversionCapability = (typeof CONVERSION_CAPABILITIES)[number];
export type ContactLinkCapability = Exclude<ConversionCapability, "form">;

/**
 * Which capabilities can honestly complete each conversion surface, in default
 * order. A link can complete an ENQUIRY (a person writes or calls); it cannot
 * complete a checkout, a subscription or a donation, so those surfaces list the
 * form alone and stay unavailable without it.
 */
const SURFACE_CAPABILITIES: Record<string, readonly ConversionCapability[]> = {
  enquiry_form: ["form", "email_link", "phone_link", "whatsapp_link"],
  contact_route: ["email_link", "phone_link", "whatsapp_link"],
  demo_request_form: ["form", "email_link", "phone_link"],
  support_request: ["form", "email_link", "phone_link", "whatsapp_link"],
  application_form: ["form", "email_link"],
  booking_flow: ["form", "phone_link", "whatsapp_link", "email_link"],
  directions_and_call: ["phone_link", "whatsapp_link"],
  checkout: ["form"],
  signup_flow: ["form"],
  trial_signup: ["form"],
  donation_flow: ["form"],
  subscribe: ["form"],
  related_conversion_link: [],
};

export interface CapabilityOption {
  capability: ConversionCapability;
  /** False when the verification status alone already rules it out. */
  statusAllows: boolean;
  reason: string;
}

export interface ConversionPlanEntry {
  objective: WebsiteObjective;
  surface: string;
  /** The decided order, each with its decision-time feasibility. */
  order: CapabilityOption[];
  /** Where the order came from. */
  basis: "owner_preference" | "surface_default";
}

function linkStatusReason(input: BusinessInput, capability: ContactLinkCapability): { allows: boolean; reason: string } {
  const statuses = contactStatuses(input.availableContent);
  const status = capability === "email_link" ? statuses.email : capability === "phone_link" ? statuses.phone : statuses.whatsapp;
  return status === "verified_available"
    ? { allows: true, reason: `${capability.replace("_link", "")} is verified; it converts once its value is supplied` }
    : { allows: false, reason: `${capability.replace("_link", "")} status is "${status}"; an unverified contact method may not be published (DD-101)` };
}

export function planConversionCapabilities(input: BusinessInput): ConversionPlanEntry[] {
  const preference = input.constraints?.preferredContactMethods ?? [];
  return input.websiteObjective.map((objective) => {
    const surface = OBJECTIVE_ARCHITECTURE[objective].conversionSurface;
    const allowed = SURFACE_CAPABILITIES[surface] ?? [];
    // The owner's preference REORDERS what the surface allows; it cannot add a
    // capability the surface cannot complete (a mailto is not a checkout).
    const preferred = preference.filter((c) => allowed.includes(c));
    const ordered = [...preferred, ...allowed.filter((c) => !preferred.includes(c))];
    return {
      objective,
      surface,
      basis: preferred.length > 0 ? "owner_preference" : "surface_default",
      order: ordered.map((capability) => {
        if (capability === "form") {
          return { capability, statusAllows: true, reason: "a form converts only when the host configures its endpoint; the framework never invents a backend" };
        }
        const { allows, reason } = linkStatusReason(input, capability);
        return { capability, statusAllows: allows, reason };
      }),
    };
  });
}
