/**
 * CONVERSION FORM CONTRACTS — one contract per ACTION, not one per `<form>`.
 *
 * PREVIOUS DEFECT: every conversion section (booking, enquiry, signup, checkout)
 * rendered the same name/email/message form. After DD-035 labelled the action
 * "Go to checkout", a page offered checkout while its form collected a message —
 * a label promising one action over a contract representing another.
 *
 * THE CONTRACT for each action states:
 *   kind         which conversion this is; the section and the form must agree
 *   intent       what submitting it actually does, in plain words
 *   actionLabel  the ONLY label a call to action pointing at it may use
 *   submitLabel  the label of its own submit control
 *   fields       the fields that action genuinely needs, with validation
 *   forbidden    fields this form must never collect (e.g. card data)
 *   endpoint     `configured` with the host's URL, or `unconfigured` with why
 *
 * HONESTY RULES this module enforces rather than describes:
 *  - No backend is invented. An endpoint comes only from the HOST's
 *    configuration (`GenerateOptions.formEndpoints`). Without one the contract is
 *    `unconfigured`, the form renders disabled with a visible notice, and no call
 *    to action may point at it.
 *  - No option is invented. A select's options are owner-supplied offer names or
 *    the field is omitted.
 *  - A booking form without a scheduling integration REQUESTS an appointment; it
 *    cannot confirm one, so its labels say "request".
 *  - A checkout form never collects payment card data: payment belongs to a
 *    payment provider, and the field names are forbidden here.
 *
 * `validateConversionSemantics()` is the enforcement: the generator refuses to
 * emit a site whose action labels, section kinds and form contracts disagree.
 */
import type { Offer } from "../design-intelligence/types/business-input.js";

export const CONVERSION_KINDS = ["booking", "enquiry", "signup", "checkout"] as const;
export type ConversionKind = (typeof CONVERSION_KINDS)[number];

export function isConversionKind(section: string): section is ConversionKind {
  return (CONVERSION_KINDS as readonly string[]).includes(section);
}

export interface FormField {
  name: string;
  label: string;
  type: "text" | "email" | "tel" | "date" | "number" | "select" | "textarea";
  required: boolean;
  /** HTML autocomplete token, when one applies (WCAG 1.3.5, DD-083). */
  autocomplete?: string;
  /** Minimum for a number field. */
  min?: number;
  /** Select options — owner-supplied strings only, never invented. */
  options?: string[];
  /** Why this action needs the field. */
  purpose: string;
}

export type FormEndpoint =
  | { state: "configured"; url: string; method: "post" }
  | { state: "unconfigured"; reason: string };

export interface FormContract {
  kind: ConversionKind;
  intent: string;
  /** The fieldset legend: what this form IS, in two or three words. */
  legend: string;
  actionLabel: string;
  submitLabel: string;
  fields: FormField[];
  /** Field names this contract must never contain. */
  forbiddenFields: string[];
  /** How the fields are validated. The browser half runs with no JavaScript. */
  validation: string;
  endpoint: FormEndpoint;
  /** What the page shows while the endpoint is unconfigured. Never a claim. */
  unconfiguredNotice: string;
}

/** Fields no conversion form may ever collect: payment belongs to a provider. */
const PAYMENT_FIELDS = ["card_number", "card", "cvc", "cvv", "expiry", "card_expiry", "iban", "password"];

const VALIDATION =
  "browser constraint validation (required, type, min) with no JavaScript, mirrored by a zod schema a configured host endpoint must apply server-side";

function nameField(): FormField {
  return { name: "name", label: "Name", type: "text", required: true, autocomplete: "name", purpose: "who is asking" };
}
function emailField(): FormField {
  return { name: "email", label: "Email", type: "email", required: true, autocomplete: "email", purpose: "where the reply goes" };
}

export interface ContractContext {
  /** Owner-supplied offers; select options come from these names only. */
  offers: readonly Offer[];
  /** The stated objective the page serves; a signup label follows it. */
  primaryObjective: string;
  /** Host-supplied endpoint for this kind, if the host has one. */
  endpointUrl?: string;
}

const SIGNUP_LABELS: Record<string, string> = {
  start_free_trial: "Start a free trial",
  sell_subscriptions: "Subscribe",
  recruit: "Apply",
  raise_funds: "Donate",
};

/**
 * Build the contract for one conversion kind. Pure and deterministic: the same
 * context always yields the same contract, so the CTA plan, both renderers and
 * the validator all read one value.
 */
export function formContractFor(kind: ConversionKind, ctx: ContractContext): FormContract {
  const endpoint: FormEndpoint = ctx.endpointUrl
    ? { state: "configured", url: ctx.endpointUrl, method: "post" }
    : {
        state: "unconfigured",
        reason: `no ${kind} endpoint is configured in the host; the framework does not invent a backend`,
      };

  switch (kind) {
    case "booking": {
      const services = ctx.offers.filter((o) => o.kind === "service" || o.kind === "programme").map((o) => o.name);
      return {
        kind,
        intent: "request a specific appointment; the business confirms it — this form cannot confirm a booking by itself",
        legend: "Appointment request",
        actionLabel: "Request an appointment",
        submitLabel: "Send appointment request",
        fields: [
          nameField(),
          emailField(),
          { name: "phone", label: "Phone", type: "tel", required: false, autocomplete: "tel", purpose: "an optional faster route to confirm the time" },
          ...(services.length > 0
            ? [{ name: "service", label: "Service", type: "select" as const, required: true, options: services, purpose: "which offered service the appointment is for" }]
            : []),
          { name: "preferred_date", label: "Preferred date", type: "date", required: true, purpose: "the day the person is asking for" },
          { name: "notes", label: "Notes", type: "textarea", required: false, purpose: "anything the business should know before confirming" },
        ],
        forbiddenFields: PAYMENT_FIELDS,
        validation: VALIDATION,
        endpoint,
        unconfiguredNotice: "Appointment requests are not connected yet, so this form cannot be sent.",
      };
    }
    case "checkout": {
      const products = ctx.offers.filter((o) => o.kind === "product").map((o) => o.name);
      return {
        kind,
        intent: "place an order request for listed products; payment is taken by a payment provider, never collected by this form",
        legend: "Order request",
        actionLabel: "Go to checkout",
        submitLabel: "Submit order request",
        fields: [
          ...(products.length > 0
            ? [{ name: "product", label: "Product", type: "select" as const, required: true, options: products, purpose: "which listed product is ordered" }]
            : []),
          { name: "quantity", label: "Quantity", type: "number", required: true, min: 1, purpose: "how many" },
          nameField(),
          emailField(),
          { name: "delivery_address", label: "Delivery address", type: "textarea", required: true, autocomplete: "street-address", purpose: "where the order goes" },
        ],
        forbiddenFields: PAYMENT_FIELDS,
        validation: VALIDATION,
        endpoint,
        unconfiguredNotice: "Checkout is not connected yet, so orders cannot be placed on this site.",
      };
    }
    case "signup": {
      const label = SIGNUP_LABELS[ctx.primaryObjective] ?? "Sign up";
      return {
        kind,
        intent: `register interest for "${ctx.primaryObjective}"; no account is created by this form`,
        legend: label,
        actionLabel: label,
        submitLabel: label,
        fields: [nameField(), emailField()],
        forbiddenFields: PAYMENT_FIELDS,
        validation: VALIDATION,
        endpoint,
        unconfiguredNotice: "Sign-up is not connected yet, so this form cannot be sent.",
      };
    }
    case "enquiry":
    default:
      return {
        kind: "enquiry",
        intent: "send a written enquiry to the business",
        legend: "Enquiry",
        actionLabel: "Send an enquiry",
        submitLabel: "Send enquiry",
        fields: [
          nameField(),
          emailField(),
          { name: "message", label: "Message", type: "textarea", required: true, purpose: "what the enquiry is about" },
        ],
        forbiddenFields: PAYMENT_FIELDS,
        validation: VALIDATION,
        endpoint,
        unconfiguredNotice: "Enquiries are not connected yet, so this form cannot be sent.",
      };
  }
}

// ------------------------------------------------------------------ validation

export interface SemanticViolation {
  page: string;
  nodeId: string;
  problem: string;
}

/** The minimal shape the validator reads, so it has no import cycle with the model. */
export interface SemanticNode {
  id: string;
  kind: string;
  text?: string;
  href?: string;
  form?: FormContract;
  /** Contact-link contracts on a contact_actions node (generation/contact-links.ts). */
  contactLinks?: Array<{ href: string; actionLabel: string }>;
  children?: SemanticNode[];
}

/** An action whose destination is a contact link rather than a form. */
export const CONTACT_LINK_HREF = /^(mailto:|tel:|https:\/\/wa\.me\/)/;

function flatten(nodes: readonly SemanticNode[], acc: SemanticNode[] = []): SemanticNode[] {
  for (const n of nodes) {
    acc.push(n);
    if (n.children) flatten(n.children, acc);
  }
  return acc;
}

/**
 * Refuse any disagreement between an action, the section it targets and the form
 * contract there. Checked across pages, because an action may link to a sibling
 * page's conversion section.
 */
export function validateConversionSemantics(
  pages: ReadonlyArray<{ route: string; nodes: readonly SemanticNode[] }>,
): SemanticViolation[] {
  const violations: SemanticViolation[] = [];
  const formsByRoute = new Map<string, SemanticNode[]>();
  for (const page of pages) {
    formsByRoute.set(page.route, flatten(page.nodes).filter((n) => n.kind === "form"));
  }

  for (const page of pages) {
    const all = flatten(page.nodes);

    // 1. Every form carries a contract whose kind matches its section id, and
    //    whose fields avoid the forbidden list.
    for (const form of all.filter((n) => n.kind === "form")) {
      if (!form.form) {
        violations.push({ page: page.route, nodeId: form.id, problem: "form has no action contract" });
        continue;
      }
      const section = form.id.replace(/-form$/, "");
      if (form.form.kind !== section) {
        violations.push({
          page: page.route,
          nodeId: form.id,
          problem: `form sits in the "${section}" section but its contract is "${form.form.kind}"`,
        });
      }
      for (const field of form.form.fields) {
        if (form.form.forbiddenFields.includes(field.name)) {
          violations.push({ page: page.route, nodeId: form.id, problem: `contract collects forbidden field "${field.name}"` });
        }
      }
    }

    // 2. Every action pointing at a form uses THAT form's action label, and the
    //    form must be able to complete: an unconfigured endpoint takes no action.
    for (const action of all.filter((n) => n.kind === "action" || n.kind === "sticky_cta")) {
      const href = action.href ?? "";
      // A contact-link action must point at a link some page actually publishes
      // from a verified contract, and carry THAT contract's label (DD-035).
      if (CONTACT_LINK_HREF.test(href)) {
        const published = pages
          .flatMap((p) => flatten(p.nodes))
          .flatMap((n) => n.contactLinks ?? [])
          .find((l) => l.href === href);
        if (!published) {
          violations.push({ page: page.route, nodeId: action.id, problem: `action "${action.text ?? ""}" links to ${href}, which no verified contact contract publishes` });
        } else if (action.text !== published.actionLabel) {
          violations.push({ page: page.route, nodeId: action.id, problem: `action is labelled "${action.text ?? ""}" but its contact contract's action is "${published.actionLabel}"` });
        }
        continue;
      }
      const [route, anchor] = href.startsWith("#") ? [page.route, href.slice(1)] : href.split("#");
      const targetRoute = route && route.length > 0 ? route : page.route;
      const forms = formsByRoute.get(targetRoute) ?? [];
      const target = anchor
        ? forms.find((f) => f.id === anchor)
        : forms.length === 1
          ? forms[0]
          : undefined;
      if (!target?.form) {
        violations.push({
          page: page.route,
          nodeId: action.id,
          problem: `action "${action.text ?? ""}" points at ${href} where no contracted form exists`,
        });
        continue;
      }
      if (action.text !== target.form.actionLabel) {
        violations.push({
          page: page.route,
          nodeId: action.id,
          problem: `action is labelled "${action.text ?? ""}" but its target is a ${target.form.kind} form whose action is "${target.form.actionLabel}"`,
        });
      }
      if (target.form.endpoint.state !== "configured") {
        violations.push({
          page: page.route,
          nodeId: action.id,
          problem: `action "${action.text ?? ""}" promotes a ${target.form.kind} form whose endpoint is unconfigured`,
        });
      }
    }
  }
  return violations;
}
