/**
 * CONTACT STATUS — the ONE absence semantic for contact facts.
 *
 * DEFECT this fixes (first customer dry run): `contactDetails` was a single status
 * for every contact fact. An owner who supplied their own email but not yet their
 * street address had to be recorded as "partial", and an enquiry objective was
 * then blocked for lack of a verified ADDRESS — so a lead-generation site could
 * publish no contact route at all.
 *
 * A contact METHOD (email, phone) and a PREMISES fact (address) are different
 * claims with different uses: an enquiry needs a verified way to reach the
 * business; a booking or a visit needs a verified place. Every consumer reads
 * the per-method status through this module, never `contactDetails` directly.
 */
import type { AssetStatus, ContentInventory } from "../design-intelligence/types/business-input.js";

export interface ContactStatuses {
  email: AssetStatus;
  phone: AssetStatus;
  /** A WhatsApp number is a phone fact: absent its own status, the phone status governs. */
  whatsapp: AssetStatus;
  address: AssetStatus;
  /** FD-14: opening hours are their own fact; absent their own status, the address governs. */
  hours: AssetStatus;
}

/** Per-method status; an absent method falls back to the aggregate `contactDetails`. */
export function contactStatuses(content: ContentInventory): ContactStatuses {
  return {
    email: content.contactEmail ?? content.contactDetails,
    phone: content.contactPhone ?? content.contactDetails,
    whatsapp: content.contactWhatsapp ?? content.contactPhone ?? content.contactDetails,
    address: content.contactAddress ?? content.contactDetails,
    hours: content.openingHours ?? content.contactAddress ?? content.contactDetails,
  };
}

const STRENGTH: AssetStatus[] = ["verified_available", "provided_unverified", "partial", "unavailable", "not_applicable"];

/**
 * The status of the best way to REACH the business: verified when email OR phone
 * is verified. An address is not a contact method.
 */
export function contactMethodStatus(content: ContentInventory): AssetStatus {
  const { email, phone } = contactStatuses(content);
  return STRENGTH.indexOf(email) <= STRENGTH.indexOf(phone) ? email : phone;
}
