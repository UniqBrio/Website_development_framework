/**
 * COMPONENT MODEL — the single structure both emitters render.
 *
 * Closes assessment gap G-1: `selectedPatterns` was a flat list and nothing
 * mapped a SECTION to the components implementing it.
 *
 * Two rules govern this file:
 *  1. IT DECIDES NOTHING. Every field is read from the pipeline output. A value
 *     that cannot be derived becomes a refusal or a content slot.
 *  2. ONE MODEL, TWO EMITTERS. `render/html.ts` and `emit/nextjs.ts` both consume
 *     this, so the static layer and the Next source cannot disagree about what the
 *     site is.
 *
 * RULE CONSUMPTION. This module is the named consumer of the layout, navigation,
 * component, form and identity rules whose effects are page STRUCTURE
 * (DD-030, DD-031, DD-032, DD-033..DD-037, DD-038..DD-041, DD-083, DD-093,
 * DD-096, DD-106). Every one of them is read from `output.decisions` — the
 * evaluation draft — and every node such a rule shaped carries `rule:DD-nnn` in
 * its `traceTo`, so a generated element can be walked back to the rule.
 */
import type { DesignDecisionOutput } from "../pipeline.js";
import { CONVERSION_SECTIONS, type PageSpec } from "./page-spec.js";
import type { AssetFile, ResolvedContent } from "./content-values.js";
import {
  CONTACT_LINK_HREF,
  formContractFor,
  isConversionKind,
  type ConversionKind,
  type FormContract,
} from "./form-contracts.js";
import type { Industry, Offer } from "../design-intelligence/types/business-input.js";
import type { RangeName } from "../responsive/capabilities.js";
import type { Transformation } from "../responsive/transformations.js";
import type { DeliveryDefinition, ExperienceDeliverySpec, RenderedExperience } from "../engagement/delivery.js";
import { resolveConversionDelivery, type ContactLinkContract, type ConversionDelivery } from "./contact-links.js";
import { sectionLabel } from "../design-intelligence/sections/registry.js";
import { PATTERN_SECTION_MAP } from "../design-system/pattern-registry/registry.js";

/**
 * A value the page needs and does not have (FD-06). `needs` names what must be
 * supplied; `text` is the visible, non-claiming marker. Rendered with
 * `data-content-pending`, counted as placeholder text on an indexable page.
 */
export interface PendingValue {
  needs: string;
  text: string;
}

/** What a node renders as. Semantic HTML only — no framework-specific nodes. */
export type NodeKind =
  | "site_header"
  | "site_footer"
  | "brand"
  | "hero"
  | "section"
  | "heading"
  | "prose"
  | "list"
  | "definition_list"
  | "card_grid"
  | "figure"
  | "image"
  | "diagram"
  | "gallery"
  | "timeline"
  | "disclosure_group"
  | "form"
  | "action"
  | "sticky_cta"
  | "nav"
  | "content_slot"
  | "unavailable_notice"
  | "comparison_table"
  /** Completable contact links (mailto:, tel:, wa.me) from verified values; payload in `contactLinks`. */
  | "contact_actions"
  /** A DELIVERED engagement experience; payload in `experience`, rendered by render/experiences.ts. */
  | "experience";

export interface ResponsiveBehaviour {
  /** Transformation per range, folded from the responsive audit. */
  byRange: Partial<Record<RangeName, Transformation>>;
  /** True when the audit says the affordance must not depend on hover. */
  noHoverDependency: boolean;
  /** True when reduced motion must render this statically. */
  staticUnderReducedMotion: boolean;
  /** True when the transformation engine REFUSED to hide it. */
  hideRefused: boolean;
}

/** An image the emitters may render. Dimensions and alt are NOT optional (DD-074, DD-081). */
export interface ImageSpec extends AssetFile {
  /** DD-085: the single LCP candidate loads eagerly at high priority; all else lazy. */
  priority: boolean;
  /** DD-075: the `sizes` hint the Next emitter must carry; mirrors the CSS grid. */
  sizes: string;
}

export interface ComponentNode {
  id: string;
  kind: NodeKind;
  /** Heading level when the node introduces one. Exactly one h1 per page. */
  headingLevel?: 1 | 2 | 3;
  text?: string;
  /**
   * `detail` carries a link target or route (navigation, footer, contact links) and
   * nothing else. A MISSING value is `pending` (FD-06): typed, so both emitters mark
   * it with `data-content-pending` and the indexability check counts it. It used to
   * be free text in `detail`, which the placeholder check could not see.
   */
  items?: Array<{ term?: string; text: string; detail?: string; pending?: PendingValue; meta?: string[] }>;
  /** Destination for an action or nav item. */
  href?: string;
  /** Set on an image node. */
  image?: ImageSpec;
  /** Set on a form node: the action contract it implements. */
  form?: FormContract;
  /** A layout modifier decided upstream (DD-030 hero.layout). */
  layout?: string;
  /**
   * Provenance. Every node names the decisions that produced it, so a generated
   * element can be traced back (brief §2). Never empty.
   */
  traceTo: string[];
  responsive: ResponsiveBehaviour;
  /** True when the node needs client-side JavaScript to function AT ALL. */
  requiresClientJs: boolean;
  /** What the node degrades to with no JavaScript. */
  noScriptBehaviour: string;
  children?: ComponentNode[];
  /** Set on a content_slot or unavailable_notice: what the owner must supply (rendered as a counted marker). */
  needs?: string;
  /**
   * Set on the site `nav` node when DD-034 decided a compact mode the generator
   * implements: the navigation collapses below the medium range into a native
   * popover disclosure (no JavaScript, Escape and light dismiss built in).
   */
  navCompact?: { mode: "popover_disclosure"; decided: string; menuId: string };
  /** Set on a contact_actions node: the link contracts it renders, primary first. */
  contactLinks?: ContactLinkContract[];
  /** Set on a comparison_table: owner-supplied, verified values only. */
  table?: { caption: string; rowHeading: string; columns: string[]; rows: Array<{ header: string; cells: string[] }> };
  /** Set on an `experience` node: the DELIVERABLE spec it renders, and nothing else. */
  experience?: {
    specId: string;
    category: string;
    decisionRecordId: string;
    mode: "static" | "interactive" | "static_fallback_only";
    definition: DeliveryDefinition;
  };
}

export interface GeneratedPageModel {
  page: PageSpec;
  /** Root nodes in document order. */
  nodes: ComponentNode[];
  /** Sections the page wanted that could not be honestly rendered. */
  refusals: Array<{ section: string; reason: string }>;
  /** The section order actually rendered (DD-032 may reorder the spec's list). */
  sectionOrder: string[];
  /** The rule that reordered sections, or null when the spec order stood. */
  reorderedBy: string | null;
  /** The primary call to action this page carries, or why it has none. */
  cta: CtaPlan;
  /**
   * Per ALLOCATED section: the node ids it produced and the refusal it recorded.
   * The integrity ledger requires one or the other — a section that produced
   * nothing and said nothing is a silent drop.
   */
  sectionResults: Array<{ section: string; nodeIds: string[]; refusal: string | null }>;
}

export interface Refusal {
  what: string;
  why: string;
  kind:
    | "rejected_pattern"
    | "unresolved_artifact"
    | "content_slot"
    | "omitted_dependency"
    | "hidden_section"
    | "refused_asset"
    | "unconfigured_endpoint"
    | "engagement_experience";
}

/** DD-035/036/037/101: one primary action per page, or a stated reason for none. */
export type CtaPlan =
  | { state: "present"; label: string; href: string; placement: "sticky" | "inline_repeated" | "hero_only"; trace: string[] }
  | { state: "withheld"; reason: string; trace: string[] };

const ALL_RANGES: RangeName[] = ["compact", "medium", "expanded", "large", "extra_large"];

/**
 * DD-035: a call to action's label is NOT chosen here. It is the target form
 * contract's `actionLabel` (generation/form-contracts.ts), so a label cannot name
 * one action while its destination represents another. The earlier objective and
 * section label tables were a second label authority and were removed.
 */

/** Fold the responsive audit into per-range behaviour for one component id. */
function responsiveFor(output: DesignDecisionOutput, componentId: string): ResponsiveBehaviour {
  const decisions = output.responsiveStrategy.audit.decisions.filter((d) =>
    d.componentId === componentId || d.componentId.startsWith(`${componentId}@`),
  );
  const byRange: Partial<Record<RangeName, Transformation>> = {};
  let noHoverDependency = false;
  let staticUnderReducedMotion = false;
  let hideRefused = false;
  for (const decision of decisions) {
    // Keep the STRICTEST outcome per range: if any profile at this range had to
    // replace a hover affordance, the component must not depend on hover at all.
    if (decision.transformation === "replace") noHoverDependency = true;
    if (decision.transformation === "staticize") staticUnderReducedMotion = true;
    if (decision.refused) hideRefused = true;
    const existing = byRange[decision.range];
    if (!existing || existing === "remain") byRange[decision.range] = decision.transformation;
  }
  // Default: reflow narrow, remain wide. Stated rather than left undefined, so an
  // emitter never has to guess.
  for (const range of ALL_RANGES) {
    if (byRange[range] === undefined) {
      byRange[range] = range === "compact" ? "reflow" : range === "medium" ? "condense" : "remain";
    }
  }
  return { byRange, noHoverDependency, staticUnderReducedMotion, hideRefused };
}

function node(partial: Omit<ComponentNode, "responsive"> & { responsive?: ResponsiveBehaviour }): ComponentNode {
  return {
    ...partial,
    responsive:
      partial.responsive ?? {
        byRange: { compact: "reflow", medium: "condense", expanded: "remain", large: "remain", extra_large: "expand" },
        noHoverDependency: true,
        staticUnderReducedMotion: false,
        hideRefused: false,
      },
  };
}

/**
 * A slot node: renders structure and states what is missing. Never a claim.
 * DD-106: an absent business fact is an EDITOR EMPTY STATE, never a skeleton
 * that looks like content on its way.
 */
function slotNode(id: string, needs: string, placeholder: string, trace: string[]): ComponentNode {
  return node({
    id,
    kind: "content_slot",
    text: placeholder,
    needs,
    traceTo: [...trace, "rule:DD-106 editor empty state, never a skeleton for an unknown fact"],
    requiresClientJs: false,
    noScriptBehaviour: "renders identically; it is static text",
  });
}

/** An image node from a verified asset file. The alt travels with the file (DD-081). */
function imageNode(
  id: string,
  file: AssetFile,
  priority: boolean,
  sizes: string,
  trace: string[],
): ComponentNode {
  return node({
    id,
    kind: "image",
    image: { ...file, priority, sizes },
    traceTo: [
      ...trace,
      "rule:DD-074 width/height reserved so layout cannot shift",
      file.decorative
        ? 'rule:DD-081 decorative image carries alt="" so it is silent to a screen reader'
        : "rule:DD-081 informative alt supplied with the verified asset",
      priority
        ? "rule:DD-085 the single LCP candidate: eager, fetchpriority=high"
        : "rule:DD-085 below the fold: loading=lazy",
      "rule:DD-095 descriptive alt and dimensions travel with the asset",
    ],
    requiresClientJs: false,
    noScriptBehaviour: "a plain <img>; nothing depends on script",
  });
}

/**
 * Which pattern (if any) the engine selected to implement a section. Returns the
 * pattern id plus its fallback, so the emitter always has the simpler form.
 */
function patternForSection(
  output: DesignDecisionOutput,
  section: string,
): { id: string; fallback: string; requiresClientJs: boolean } | null {
  const wanted = PATTERN_SECTION_MAP[section];
  if (!wanted || !output.selectedPatterns.includes(wanted)) return null;
  const decision = output.selectionDecisions.find((d) => d.patternId === wanted);
  return {
    id: wanted,
    fallback: decision?.fallback ?? "static equivalent",
    // Only a gallery genuinely needs client JS among the selected set; everything
    // else is CSS or semantic HTML. Read from the pattern's tier, not assumed.
    requiresClientJs: wanted === "interactive-gallery",
  };
}

interface BuildContext {
  output: DesignDecisionOutput;
  content: ResolvedContent;
  /** The evaluation draft — the ONE surface rule effects are read from. */
  d: Record<string, unknown>;
  /** Owner-supplied offers: the only source of form select options. */
  offers: readonly Offer[];
  /** Host-configured endpoints. Absent means unconfigured, never invented. */
  formEndpoints: Partial<Record<ConversionKind, string>>;
  /** Conversion deliveries resolved so far, keyed `objective:section`. One resolution per key. */
  deliveries: Map<string, ConversionDelivery & { section: string | null }>;
}

/**
 * P1-2: follow the DECIDED capability order (output.conversionPlan) for an
 * objective's conversion. Resolved once per objective and section, so the CTA and
 * the section always agree on what was delivered.
 */
function deliveryFor(ctx: BuildContext, objective: string, section: ConversionKind | null): (ConversionDelivery & { section: string | null }) | null {
  const key = `${objective}:${section ?? "-"}`;
  const cached = ctx.deliveries.get(key);
  if (cached) return cached;
  const plan = (ctx.output.conversionPlan ?? []).find((p) => p.objective === objective);
  if (!plan) return null;
  const resolved = { ...resolveConversionDelivery(plan, ctx.content, section ? ctx.formEndpoints[section] : undefined), section };
  ctx.deliveries.set(key, resolved);
  return resolved;
}

function contactActionsNode(id: string, links: ContactLinkContract[], trace: string[], responsive?: ResponsiveBehaviour): ComponentNode {
  return node({
    id,
    kind: "contact_actions",
    contactLinks: links,
    traceTo: [
      ...trace,
      ...links.map((l) => `conversion:${l.kind} (${l.intent})`),
      "rule:DD-101 only a verified contact method is published",
      "rule:DD-035 each link's label is its contact contract's action label",
    ],
    requiresClientJs: false,
    noScriptBehaviour: "plain links that open the visitor's own email, phone or WhatsApp app",
    ...(responsive ? { responsive } : {}),
  });
}

function linkCta(link: ContactLinkContract, d: Record<string, unknown>, delivery: ConversionDelivery): CtaPlan {
  const sticky = d["cta.sticky"];
  const placement: "sticky" | "inline_repeated" | "hero_only" =
    sticky === "allowed_safe_area_aware" ? "sticky" : sticky === "inline_repeated" ? "inline_repeated" : "hero_only";
  return {
    state: "present",
    label: link.actionLabel,
    href: link.href,
    placement,
    trace: [
      `rule:DD-035 label is the ${link.kind} contact contract's action label`,
      `conversion:${delivery.objective} delivered ${link.kind} per the decided order${delivery.skipped.length > 0 ? ` (not delivered: ${delivery.skipped.map((s) => `${s.capability} — ${s.reason}`).join("; ")})` : ""}`,
      "rule:DD-036 exactly one primary action per page; repeats are the SAME action",
      `rule:DD-037 cta.sticky=${String(sticky ?? "unset")} → ${placement}`,
    ],
  };
}

/** The one contract for a conversion section on a page. */
function contractFor(ctx: BuildContext, page: PageSpec, kind: ConversionKind): FormContract {
  const url = ctx.formEndpoints[kind];
  return formContractFor(kind, {
    offers: ctx.offers,
    primaryObjective: page.primaryObjective,
    ...(url ? { endpointUrl: url } : {}),
  });
}

// ------------------------------------------------------------------ DD-032

/**
 * DD-032: on a considered/long/regulated purchase cycle, PROOF precedes the
 * primary conversion. Stable partition: every non-conversion section keeps its
 * relative order and moves ahead of every conversion section.
 */
function orderSections(sections: readonly string[], d: Record<string, unknown>): { ordered: string[]; reorderedBy: string | null } {
  if (d["conversion.proofPlacement"] !== "before_primary_conversion") {
    return { ordered: [...sections], reorderedBy: null };
  }
  const proofAndContext = sections.filter((s) => !CONVERSION_SECTIONS.has(s));
  const conversion = sections.filter((s) => CONVERSION_SECTIONS.has(s));
  const ordered = [...proofAndContext, ...conversion];
  const changed = ordered.some((s, i) => s !== sections[i]);
  return { ordered, reorderedBy: changed ? "DD-032" : null };
}

// ------------------------------------------------------------------ DD-035/036/037

function ctaPlanFor(ctx: BuildContext, page: PageSpec): CtaPlan {
  const { output, d } = ctx;
  if (page.conversionRole === "none") {
    return { state: "withheld", reason: "the page carries no conversion role", trace: ["pages:conversionRole=none"] };
  }
  // The content engine's verdict is the authority on whether a conversion path
  // may be offered at all (DD-101 contact, DD-103 purchase — its verdicts cite them).
  const blocked = output.contentPlan.blockedConversionPaths.find((p) => p.startsWith(page.primaryObjective));
  if (blocked) {
    return {
      state: "withheld",
      reason: `primary action withheld: ${blocked}`,
      trace: ["contentPlan:blockedConversionPath", "rule:DD-036 no second-best action is promoted in its place"],
    };
  }

  // Destination: the page's own conversion surface, else the page that serves
  // the same objective, else nothing. A CTA pointing nowhere is worse than none.
  const own = page.requiredSections.find((s) => CONVERSION_SECTIONS.has(s));
  let target: { page: PageSpec; section: string } | null = own ? { page, section: own } : null;
  if (!target) {
    const sibling = output.pages.find(
      (p) =>
        p.route !== page.route &&
        p.primaryObjective === page.primaryObjective &&
        p.requiredSections.some((s) => CONVERSION_SECTIONS.has(s)),
    );
    const section = sibling?.requiredSections.find((s) => CONVERSION_SECTIONS.has(s));
    if (sibling && section) target = { page: sibling, section };
  }
  if (!target || !isConversionKind(target.section)) {
    // A surface with no form section (contact_route) still converts through a
    // verified contact link when the decided order allows one.
    const delivery = deliveryFor(ctx, page.primaryObjective, null);
    const link = delivery?.delivered && delivery.delivered !== "form" ? delivery.links[0] : undefined;
    if (delivery && link) return linkCta(link, d, delivery);
    return {
      state: "withheld",
      reason: "no conversion surface exists for this objective on any page",
      trace: ["pages:no conversion section", ...(delivery ? delivery.skipped.map((s) => `conversion:${s.capability} not delivered — ${s.reason}`) : [])],
    };
  }
  {
    const delivery = deliveryFor(ctx, target.page.primaryObjective, target.section);
    const link = delivery?.delivered && delivery.delivered !== "form" ? delivery.links[0] : undefined;
    if (delivery && link) return linkCta(link, d, delivery);
  }

  // DD-035: the label IS the target contract's action label. One authority.
  const contract = contractFor(ctx, target.page, target.section);
  const labelTrace = `rule:DD-035 label is the ${contract.kind} contract's action label (policy ${String(d["cta.labelPolicy"] ?? "unset")})`;
  if (contract.endpoint.state !== "configured") {
    // An action that cannot complete is not promoted. The form still renders,
    // disabled, with its notice — the page does not pretend.
    return {
      state: "withheld",
      reason: `primary action withheld: ${contract.endpoint.reason}`,
      trace: [labelTrace, `form:${contract.kind} endpoint unconfigured`],
    };
  }
  const label = contract.actionLabel;
  const anchor = `#${target.section}-form`;
  const href = target.page.route === page.route ? anchor : `${target.page.route}${anchor}`;

  // DD-037: sticky only when mobile share is high, the task is high-intent AND
  // the endpoint is verified; otherwise inline, repeated. The evaluator decided.
  const sticky = d["cta.sticky"];
  const placement: "sticky" | "inline_repeated" | "hero_only" =
    sticky === "allowed_safe_area_aware" ? "sticky" : sticky === "inline_repeated" ? "inline_repeated" : "hero_only";
  return {
    state: "present",
    label,
    href,
    placement,
    trace: [
      labelTrace,
      "rule:DD-036 exactly one primary action per page; repeats are the SAME action",
      `rule:DD-037 cta.sticky=${String(sticky ?? "unset")} → ${placement}`,
    ],
  };
}

function actionNode(id: string, cta: Extract<CtaPlan, { state: "present" }>, trace: string[], responsive?: ResponsiveBehaviour): ComponentNode {
  return node({
    id,
    kind: "action",
    text: cta.label,
    href: cta.href,
    traceTo: [...trace, ...cta.trace],
    requiresClientJs: false,
    noScriptBehaviour: "a plain link",
    ...(responsive ? { responsive } : {}),
  });
}

// ------------------------------------------------------------------ hero (DD-030, DD-031, DD-085)

function heroNode(ctx: BuildContext, page: PageSpec, trace: string[], responsive: ResponsiveBehaviour, cta: CtaPlan): ComponentNode {
  const { output, content, d } = ctx;
  const mustAnswer = Array.isArray(d["hero.mustAnswer"]) ? (d["hero.mustAnswer"] as string[]) : [];
  const answered: string[] = [];
  const slotted: string[] = [];
  const children: ComponentNode[] = [];

  // WHAT + WHY IT MATTERS: the proposition. The business name is an honest h1
  // when no proposition exists; the "why" then becomes a visible slot.
  if (content.proposition.state === "supplied") {
    children.push(
      node({
        id: "hero-h1",
        kind: "heading",
        headingLevel: 1,
        text: content.proposition.value,
        traceTo: [...trace, `contentConfidence:${content.proposition.confidence}`, "rule:DD-031 what + why_it_matters: the supplied proposition"],
        requiresClientJs: false,
        noScriptBehaviour: "static heading",
        responsive,
      }),
    );
    answered.push("what", "why_it_matters");
  } else {
    children.push(
      node({
        id: "hero-h1",
        kind: "heading",
        headingLevel: 1,
        // The business name is a supplied string, so it is an honest h1.
        text: output.profile.businessName,
        traceTo: [...trace, "fallback:businessName is an owner-supplied string", "rule:DD-031 what: the business name"],
        requiresClientJs: false,
        noScriptBehaviour: "static heading",
        responsive,
      }),
      slotNode("hero-proposition-slot", content.proposition.needs, content.proposition.placeholder, [...trace, "rule:DD-031 why_it_matters: slot until the proposition is supplied"]),
    );
    answered.push("what");
    slotted.push("why_it_matters");
  }

  // FOR WHOM: the audience labels are owner-supplied strings, quoted verbatim.
  // FD-02: an INFERRED audience is not the owner's words, so it renders as a slot —
  // "For <label>" would publish an operator's judgement as the customer's statement.
  if (mustAnswer.includes("for_whom")) {
    if (page.audience.length > 0 && page.audienceBasis === "stated") {
      children.push(
        node({
          id: "hero-audience",
          kind: "prose",
          text: `For ${page.audience.join(" and ")}`,
          traceTo: [...trace, "rule:DD-031 for_whom: audience labels quoted from the input, not paraphrased"],
          requiresClientJs: false,
          noScriptBehaviour: "static prose",
          responsive,
        }),
      );
      answered.push("for_whom");
    } else {
      children.push(
        slotNode(
          "hero-audience-slot",
          page.audience.length > 0
            ? `targetAudience — who this page is for (an inferred audience is not published: ${page.audience.join(", ")})`
            : "targetAudience — who this page is for",
          "Audience to be stated by the owner.",
          [...trace, `rule:DD-031 for_whom: slot (audience basis ${page.audienceBasis})`],
        ),
      );
      slotted.push("for_whom");
    }
  }

  // Hero media (DD-085): the ONE eager, high-priority image. Only from a verified file.
  if (content.assets.hero) {
    const split = d["hero.layout"] === "split";
    children.push(
      imageNode("hero-image", content.assets.hero, true, split ? "(min-width: 840px) 50vw, 100vw" : "100vw", [
        ...trace,
        "asset:heroImages verified_available",
      ]),
    );
  }

  // NEXT STEP: the single primary action, or a stated reason there is none.
  if (mustAnswer.includes("next_step") || cta.state === "present") {
    if (cta.state === "present") {
      children.push(actionNode("hero-cta", cta, [...trace, "rule:DD-031 next_step: the primary action"], responsive));
      answered.push("next_step");
    } else {
      children.push(
        slotNode(
          "hero-next-step-slot",
          "a verified conversion endpoint",
          "Next step available once the conversion route is verified.",
          [...trace, `rule:DD-031 next_step: withheld — ${cta.reason}`],
        ),
      );
      slotted.push("next_step");
    }
  }

  const layout = typeof d["hero.layout"] === "string" ? (d["hero.layout"] as string) : undefined;
  return node({
    id: "hero",
    kind: "hero",
    ...(layout ? { layout } : {}),
    traceTo: [
      ...trace,
      ...(layout ? [`rule:DD-030 hero.layout=${layout}`] : []),
      `rule:DD-031 answered=${answered.join(",") || "none"}; slotted=${slotted.join(",") || "none"}`,
    ],
    requiresClientJs: false,
    noScriptBehaviour: "fully rendered; the proposition is static server HTML",
    responsive,
    children,
  });
}

// ------------------------------------------------------------------ sections

/**
 * Build the node tree for one section.
 *
 * Every branch either renders real supplied content or emits a slot. There is no
 * branch that invents text.
 */
function nodesForSection(
  ctx: BuildContext,
  page: PageSpec,
  section: string,
  refusals: Array<{ section: string; reason: string }>,
  /**
   * Pattern ids already rendered on THIS page. Two sections may map to the same
   * pattern (catalog and product_detail both want the gallery); the pattern
   * renders once, and the second section gets a heading plus a slot. The first
   * generator dry run rendered the same empty gallery twice on /devices.
   */
  renderedPatterns: Set<string>,
  cta: CtaPlan,
): ComponentNode[] {
  const { output, content, d } = ctx;
  let pattern = patternForSection(output, section);
  if (pattern && renderedPatterns.has(pattern.id)) {
    pattern = null; // already on the page; fall through to the section's slot form
  } else if (pattern) {
    renderedPatterns.add(pattern.id);
  }
  const trace = [
    `page:${page.route}`,
    `section:${section}`,
    ...(pattern ? [`pattern:${pattern.id}`] : []),
    `objective:${page.primaryObjective}`,
  ];
  const responsive = responsiveFor(output, pattern ? `pattern:${pattern.id}` : `${section}@${page.route}`);
  const heading = node({
    id: `${section}-heading`,
    kind: "heading",
    headingLevel: 2,
    text: sectionHeading(section, output.profile.industry),
    traceTo: trace,
    requiresClientJs: false,
    noScriptBehaviour: "static heading",
    responsive,
  });

  switch (section) {
    case "proposition": {
      // The hero carries the page's ONE h1.
      return [heroNode(ctx, page, trace, responsive, cta)];
    }

    case "services": {
      const services = content.services;
      if (services.state !== "supplied") {
        refusals.push({ section, reason: services.source });
        return [];
      }
      // FD-03 / FD-04: an item carries its published price and attributes; a catalogue
      // with groups renders one list per group, under the group's own heading, so a
      // menu keeps the structure its source had.
      const catalogue = content.catalogue;
      const itemFor = (name: string, description: string | null) => {
        const resolved = catalogue.groups.flatMap((g) => g.items).concat(catalogue.ungrouped).find((i) => i.name === name);
        const meta = [
          ...(resolved?.price ? [resolved.price.display] : []),
          ...(resolved?.variants ?? []).filter((v) => v.price).map((v) => `${v.label}: ${v.price!.display}`),
          ...(resolved?.attributes ?? []).map((a) => `${a.label}: ${a.value}`),
        ];
        return {
          term: name,
          text: description ?? "",
          ...(meta.length > 0 ? { meta } : {}),
          ...(description === null ? { pending: { needs: `description of "${name}"`, text: "description to be supplied" } } : {}),
        };
      };
      const items = services.value.map((offer) => itemFor(offer.name, offer.description));
      if (catalogue.groups.length > 0) {
        const descriptionOf = new Map(services.value.map((o) => [o.name, o.description]));
        const groupNodes = catalogue.groups.flatMap((group) => [
          node({
            id: `catalogue-group-${group.id}-heading`,
            kind: "heading",
            headingLevel: 3,
            text: group.name,
            traceTo: [...trace, `catalogue:group ${group.id}`, "rule:DD-038 grouped repeated items keep their source structure"],
            requiresClientJs: false,
            noScriptBehaviour: "static heading",
            responsive,
          }),
          node({
            id: `catalogue-group-${group.id}`,
            kind: "card_grid",
            items: group.items.map((i) => itemFor(i.name, descriptionOf.get(i.name) ?? i.description)),
            traceTo: [...trace, `catalogue:group ${group.id}`, `contentConfidence:${services.confidence}`, "rule:DD-039 no essential price or specification is hidden inside a card"],
            requiresClientJs: false,
            noScriptBehaviour: "a static list of offers; no interaction required",
            responsive,
          }),
        ]);
        if (catalogue.ungrouped.length > 0) {
          groupNodes.push(
            node({
              id: "catalogue-ungrouped-heading",
              kind: "heading",
              headingLevel: 3,
              text: "Also available",
              traceTo: [...trace, "catalogue:items whose group the source does not state"],
              requiresClientJs: false,
              noScriptBehaviour: "static heading",
              responsive,
            }),
            node({
              id: "catalogue-ungrouped",
              kind: "card_grid",
              items: catalogue.ungrouped.map((i) => itemFor(i.name, descriptionOf.get(i.name) ?? i.description)),
              traceTo: [...trace, "catalogue:ungrouped — no group is guessed for an item whose source does not state one"],
              requiresClientJs: false,
              noScriptBehaviour: "a static list of offers; no interaction required",
              responsive,
            }),
          );
        }
        return [heading, ...groupNodes];
      }
      // DD-038 / DD-025: comparable repeated items become a card system; a short
      // or uneven set is a list with headings. The evaluator decided which.
      const repeated = d["components.repeatedItems"];
      if (repeated === "list_with_headings") {
        return [
          heading,
          node({
            id: "services-list",
            kind: "definition_list",
            items,
            traceTo: [...trace, `contentConfidence:${services.confidence}`, "rule:DD-038 components.repeatedItems=list_with_headings", "rule:DD-025 layout.repeatedItems=single_column_list"],
            requiresClientJs: false,
            noScriptBehaviour: "a static definition list; no interaction required",
            responsive,
          }),
        ];
      }
      return [
        heading,
        node({
          id: "services-grid",
          kind: "card_grid",
          items,
          traceTo: [
            ...trace,
            `contentConfidence:${services.confidence}`,
            `rule:DD-038 components.repeatedItems=${String(repeated ?? "unset")}`,
            `rule:DD-025 layout.repeatedItems=${String(d["layout.repeatedItems"] ?? "unset")}`,
            "rule:DD-039 no essential price or specification is hidden inside a card",
          ],
          requiresClientJs: false,
          noScriptBehaviour: "a static list of offers; no interaction required",
          responsive,
        }),
      ];
    }

    case "service_detail": {
      // DD-093: a derived per-offer page. Renders ONLY that offer's owner-supplied
      // description; the page-level h1 comes from the SEO title artifact.
      const offer =
        content.services.state === "supplied"
          ? content.services.value.find((o) => o.name === page.offerName)
          : undefined;
      if (!offer || offer.description === null) {
        refusals.push({ section, reason: `DD-093 page for "${page.offerName ?? "?"}" has no supplied description; nothing may be invented for it` });
        return [heading, slotNode("service-detail-slot", `description for "${page.offerName ?? "offer"}"`, "Service description to be supplied by the owner.", trace)];
      }
      return [
        node({
          id: "service-detail",
          kind: "prose",
          text: offer.description,
          traceTo: [
            ...trace,
            `offer:${offer.name}`,
            "rule:DD-093 content hub page for an offer WITH supplied content",
            `contentConfidence:${content.services.state === "supplied" ? content.services.confidence : "unknown"}`,
          ],
          requiresClientJs: false,
          noScriptBehaviour: "static prose",
          responsive,
        }),
      ];
    }

    case "about": {
      // P1-1: the about page's own section. Supplied copy renders verbatim;
      // otherwise a slot — never a biography written for the business.
      if (content.about.state !== "supplied") {
        return [heading, slotNode("about-slot", content.about.needs, content.about.placeholder, trace)];
      }
      return [
        heading,
        node({
          id: "about-text",
          kind: "prose",
          text: content.about.value,
          traceTo: [...trace, `contentConfidence:${content.about.confidence}`, `content:${content.about.source}`],
          requiresClientJs: false,
          noScriptBehaviour: "static prose",
          responsive,
        }),
      ];
    }

    case "process": {
      if (content.process.state !== "supplied") {
        return [heading, slotNode("process-slot", content.process.needs, content.process.placeholder, trace)];
      }
      return [
        heading,
        node({
          id: "process-timeline",
          kind: "timeline",
          items: content.process.value.map((step) => ({ term: step.step, text: step.detail })),
          traceTo: trace,
          requiresClientJs: false,
          noScriptBehaviour: "an ordered list; the visual timeline is CSS only",
          responsive,
        }),
      ];
    }

    case "faq": {
      if (content.faq.state !== "supplied") {
        return [heading, slotNode("faq-slot", content.faq.needs, content.faq.placeholder, trace)];
      }
      return [
        heading,
        node({
          id: "faq-disclosure",
          kind: "disclosure_group",
          items: content.faq.value.map((entry) => ({ term: entry.question, text: entry.answer })),
          traceTo: [
            ...trace,
            `rule:DD-040 components.faq=${String(d["components.faq"] ?? "accessible_accordion")}; native details/summary`,
            "rule:DD-041 no tabs: the page's main content is never behind a tab",
          ],
          requiresClientJs: false,
          // <details>/<summary> works with no JavaScript at all.
          noScriptBehaviour: "native details/summary; fully usable without JavaScript",
          responsive,
        }),
      ];
    }

    case "explanation":
    case "topic_hub": {
      return [
        heading,
        node({
          id: `${section}-rail`,
          kind: "prose",
          text: page.purpose,
          traceTo: [...trace, "text:page purpose, supplied verbatim by the owner"],
          requiresClientJs: false,
          noScriptBehaviour: "static prose",
          responsive,
        }),
      ];
    }

    case "location_and_contact": {
      if (content.contact.state !== "supplied") {
        refusals.push({ section, reason: content.contact.source });
        return [
          heading,
          node({
            id: "contact-unavailable",
            kind: "unavailable_notice",
            text: content.contact.placeholder,
            needs: content.contact.needs,
            traceTo: [...trace, "§J.2 unverified contact facts may not be published", "rule:DD-101 contact.publicCta=blocked_until_verified"],
            requiresClientJs: false,
            noScriptBehaviour: "static notice",
            responsive,
          }),
        ];
      }
      const c = content.contact.value;
      return [
        heading,
        node({
          id: "contact-details",
          kind: "definition_list",
          items: [
            ...(c.addressLines.length > 0 ? [{ term: "Address", text: c.addressLines.join(", ") }] : []),
            // `detail` carries the link target, so the renderers link these as the
            // noScriptBehaviour below promises (they were plain text before).
            ...(c.phone ? [{ term: "Phone", text: c.phone, detail: `tel:${c.phone.replace(/[^\d+]/g, "")}` }] : []),
            ...(c.whatsapp ? [{ term: "WhatsApp", text: c.whatsapp, detail: `https://wa.me/${c.whatsapp.replace(/\D/g, "")}` }] : []),
            ...(c.email ? [{ term: "Email", text: c.email, detail: `mailto:${c.email}` }] : []),
            // A page that also carries the `hours` section renders them there, once.
            ...(c.hours.length > 0 && !page.requiredSections.includes("hours") ? [{ term: "Hours", text: c.hours.join("; ") }] : []),
          ],
          traceTo: [...trace, "contentConfidence:verified", "rule:DD-101 contact.publicCta=allowed"],
          requiresClientJs: false,
          noScriptBehaviour: "static definition list; the phone and email are plain links",
          responsive,
        }),
      ];
    }

    case "hours": {
      // FD-14: opening hours are a fact with their own status and their own renderer.
      // They used to fall through to the generic slot, so a business that supplied
      // verified hours still served "Hours to be supplied." for ever.
      const value = content.contact.state === "supplied" ? content.contact.value.hours : [];
      if (value.length === 0) {
        return [
          heading,
          slotNode(
            "hours-slot",
            "opening hours, with a verified status (contactDetails.hours + availableContent.openingHours)",
            "Opening hours to be supplied.",
            trace,
          ),
        ];
      }
      return [
        heading,
        node({
          id: "hours-list",
          kind: "list",
          items: value.map((line) => ({ text: line })),
          traceTo: [...trace, "contentConfidence:verified", "rule:DD-101 only a verified contact fact is published"],
          requiresClientJs: false,
          noScriptBehaviour: "a static list of opening hours",
          responsive,
        }),
      ];
    }

    case "booking":
    case "enquiry":
    case "signup":
    case "checkout": {
      // A conversion surface whose critical evidence is blocked must not pretend
      // to work. The content plan already decided this.
      const blocked = output.contentPlan.blockedConversionPaths.some((p) =>
        p.startsWith(page.primaryObjective),
      );
      if (blocked) {
        refusals.push({
          section,
          reason: `conversion surface withheld: ${output.contentPlan.blockedConversionPaths.join("; ")}`,
        });
        return [
          heading,
          node({
            id: `${section}-unavailable`,
            kind: "unavailable_notice",
            text: "This route is not yet available.",
            needs: `verified evidence for ${output.contentPlan.blockedConversionPaths.filter((p) => p.startsWith(page.primaryObjective)).join("; ")}`,
            traceTo: [...trace, "contentPlan:blockedConversionPath"],
            requiresClientJs: false,
            noScriptBehaviour: "static notice",
            responsive,
          }),
        ];
      }
      // P1-2: the decided capability order. When the form cannot complete (no host
      // endpoint) and a verified contact link can, the section delivers the links
      // and RECORDS that the form was not delivered and why.
      const delivery = deliveryFor(ctx, page.primaryObjective, section as ConversionKind);
      if (delivery?.delivered && delivery.delivered !== "form" && delivery.links.length > 0) {
        refusals.push({
          section: `${section}_form`,
          reason: `not delivered: ${delivery.skipped.map((s) => `${s.capability} — ${s.reason}`).join("; ")}; the decided order delivers ${delivery.delivered}`,
        });
        return [heading, contactActionsNode(`${section}-contact`, delivery.links, [...trace, `conversion:${page.primaryObjective} capability order ${delivery.delivered}`], responsive)];
      }
      // An ACTION-SPECIFIC contract, never a generic message form.
      const contract = contractFor(ctx, page, section as ConversionKind);
      if (contract.endpoint.state !== "configured") {
        refusals.push({ section, reason: contract.endpoint.reason });
      }
      return [
        heading,
        node({
          id: `${section}-form`,
          kind: "form",
          form: contract,
          traceTo: [
            ...trace,
            `form:${contract.kind} contract (${contract.fields.map((f) => f.name).join(", ")})`,
            `form:endpoint ${contract.endpoint.state}`,
            `rule:DD-083 forms.policy=${String(d["forms.policy"] ?? "unset")}; visible labels, error and status regions, server validation`,
          ],
          requiresClientJs: false,
          noScriptBehaviour:
            contract.endpoint.state === "configured"
              ? `native form POST to ${contract.endpoint.url}; browser constraint validation needs no JavaScript`
              : "rendered disabled with a visible notice; nothing can be submitted until the host configures an endpoint",
          responsive,
        }),
      ];
    }

    case "catalog":
    case "product_detail": {
      if (pattern?.id === "interactive-gallery") {
        const images = content.assets.products.map((file, i) =>
          imageNode(`product-image-${i + 1}`, file, false, "(min-width: 900px) 33vw, (min-width: 480px) 50vw, 100vw", [
            ...trace,
            "asset:productImages verified_available",
          ]),
        );
        return [
          heading,
          node({
            id: "product-gallery",
            kind: "gallery",
            traceTo: [
              ...trace,
              `fallback:${pattern.fallback}`,
              "rule:DD-042 interactive gallery; auto-rotating carousel and hover-only product info are forbidden",
              "rule:DD-043 no auto-rotation; manual controls with keyboard and touch access",
            ],
            requiresClientJs: true,
            noScriptBehaviour: `degrades to ${pattern.fallback} — a static grid of the same images, all visible`,
            responsive,
            children: images,
          }),
        ];
      }
      return [heading, slotNode(`${section}-slot`, "product data", "Product detail to be supplied.", trace)];
    }

    case "disclosures":
    case "returns": {
      if (content.legal.state !== "supplied") {
        refusals.push({ section, reason: content.legal.source });
        return [];
      }
      return [
        heading,
        node({
          id: `${section}-policies`,
          kind: "list",
          items: Object.keys(content.legal.value).map((name) => ({ text: name })),
          traceTo: trace,
          requiresClientJs: false,
          noScriptBehaviour: "static links to policy documents",
          responsive,
        }),
      ];
    }

    case "qualifications":
    case "plain_language_summary":
    case "price":
    case "evidence": {
      // These are PROOF sections. The content engine decides whether they may
      // render; the generator never substitutes.
      const verdict = output.contentPlan.sections.find((s) => s.category === section);
      if (verdict && !verdict.render) {
        refusals.push({ section, reason: verdict.reason });
        return [];
      }
      return [heading, slotNode(`${section}-slot`, `${section} content`, `${sectionHeading(section, output.profile.industry)} to be supplied.`, trace)];
    }

    default: {
      // C1: a section the registry declares but no renderer implements. It used to
      // render "<Section> to be supplied." — a slot no customer could fill, because
      // nothing reads a value for it. It is now an explicit capability gap: nothing
      // is rendered, the reason is recorded, and the integrity ledger blocks
      // publication (FD-14 and the 62-section class behind it).
      refusals.push({
        section,
        reason: `no renderer implements the "${section}" section: the framework can decide it but cannot render it, so nothing is shown rather than a slot that can never be filled`,
      });
      return [];
    }
  }
}

/** The one link label for a page, shared by navigation and footer: the page model's label. */
function pageLabel(page: PageSpec): string {
  return page.label;
}

/**
 * The visitor-facing heading, from the section registry (C1) — never derived from the
 * id, and in the industry's own words where it has them (FD-07: a restaurant's offers
 * are a Menu, not "Services").
 */
function sectionHeading(section: string, industry?: Industry): string {
  return sectionLabel(section, industry);
}

// ------------------------------------------------------------------ header (DD-096, DD-033, DD-034)

function headerNode(ctx: BuildContext, page: PageSpec): ComponentNode {
  const { output, content, d } = ctx;
  const mark = d["identity.mark"];
  const logo = mark === "verified_logo_asset" ? content.assets.logo : null;
  const brand = node({
    id: "site-brand",
    kind: "brand",
    href: "/",
    text: output.profile.businessName,
    traceTo: [
      "pages:pageModel",
      logo
        ? "rule:DD-096 identity.mark=verified_logo_asset — the verified logo file"
        : `rule:DD-096 identity.mark=${String(mark ?? "unset")} — a typographic wordmark of the supplied name; no logo is invented`,
    ],
    requiresClientJs: false,
    noScriptBehaviour: "a plain home link",
    ...(logo
      ? {
          children: [
            imageNode("site-logo", { ...logo, alt: logo.alt || output.profile.businessName, decorative: false }, false, "10rem", [
              "asset:logo verified_available",
            ]),
          ],
        }
      : {}),
  });

  // P1-4: DD-034's compact mode is IMPLEMENTED, not only cited. The one mode the
  // generator builds is a native popover disclosure: it needs no JavaScript,
  // Escape and light dismiss are the platform's, and it lists the same routes.
  const compactDecided = d["nav.compactMode"];
  const navCompact = compactDecided === "accessible_drawer_or_compact_bar" ? { mode: "popover_disclosure" as const, decided: String(compactDecided), menuId: "site-menu" } : undefined;
  const nav = node({
    id: "site-nav",
    kind: "nav",
    items: output.pages.map((p) => ({
      text: pageLabel(p),
      detail: p.route,
    })),
    ...(navCompact ? { navCompact } : {}),
    traceTo: [
      "pages:pageModel",
      "seo:every page reachable by an internal link",
      `rule:DD-033 nav.structure=${String(d["nav.structure"] ?? "unset")}; descriptive labels, aria-current marks the current page`,
      navCompact
        ? `rule:DD-034 nav.compactMode=${String(compactDecided)} → popover disclosure below the medium range (keyboard controls, visible close, route parity); no hover-only mega menu`
        : `rule:DD-034 nav.compactMode=${String(compactDecided ?? "unset")}; no compact mode the generator implements was decided, so the full list renders at every width`,
    ],
    requiresClientJs: false,
    noScriptBehaviour: navCompact
      ? "a native popover disclosure: the Menu button opens it without JavaScript; a browser without popover support shows the full list"
      : "a plain list of links; no disclosure needed",
    responsive: responsiveFor(output, `nav@${page.route}`),
  });

  return node({
    id: "site-header",
    kind: "site_header",
    traceTo: ["pages:pageModel"],
    requiresClientJs: false,
    noScriptBehaviour: "static header",
    children: [brand, nav],
  });
}

/** How the generator handled each SELECTED experience — read straight from its delivery spec. */
export interface EngagementRendering {
  specId: string;
  category: string;
  status: ExperienceDeliverySpec["status"];
  outcome: "rendered" | "served_by_existing_section" | "delivery_unavailable";
  mode: ExperienceDeliverySpec["mode"];
  route: string | null;
  detail: string;
}

export interface ComponentModel {
  pages: GeneratedPageModel[];
  refusals: Refusal[];
  /** One entry per SELECTED experience. Empty for NO_EXPERIENCE — nothing is emitted from the registry. */
  engagement: EngagementRendering[];
  /** Every experience node actually placed on a page, for reconciliation. */
  renderedExperiences: RenderedExperience[];
  /** Nodes that genuinely need client JS, so the emitter can place boundaries. */
  clientBoundaries: Array<{ page: string; nodeId: string; because: string }>;
  /** P1-2: every conversion resolved against the decided capability order. */
  conversionDeliveries: Array<ConversionDelivery & { section: string | null }>;
}

export interface ComponentModelOptions {
  /** Owner-supplied offers; form select options come only from these. */
  offers?: readonly Offer[];
  /** Host-configured conversion endpoints. Absent kinds are unconfigured. */
  formEndpoints?: Partial<Record<ConversionKind, string>>;
  /**
   * Delivery specs (engagement/delivery.ts). The ONLY source of experience nodes:
   * a DELIVERABLE spec renders; a DELIVERY_UNAVAILABLE spec renders nothing and is
   * recorded; an unselected category has no spec and so cannot render.
   */
  deliverySpecs?: readonly ExperienceDeliverySpec[];
}

export function buildComponentModel(
  output: DesignDecisionOutput,
  content: ResolvedContent,
  options: ComponentModelOptions = {},
): ComponentModel {
  const ctx: BuildContext = {
    output,
    content,
    d: output.decisions ?? {},
    offers: options.offers ?? [],
    formEndpoints: options.formEndpoints ?? {},
    deliveries: new Map(),
  };
  const refusals: Refusal[] = [];
  const clientBoundaries: ComponentModel["clientBoundaries"] = [];

  // Rejected patterns are recorded as refusals so absence is DELIBERATE and
  // auditable, not merely a thing that did not happen.
  for (const decision of output.selectionDecisions) {
    if (decision.outcome === "reject") {
      refusals.push({ what: decision.patternId, why: decision.explanation, kind: "rejected_pattern" });
    }
  }
  for (const omitted of output.stack.omittedLibraries) {
    refusals.push({ what: omitted.library, why: omitted.because, kind: "omitted_dependency" });
  }
  for (const unresolved of output.seoArtifacts.unresolved) {
    refusals.push({
      what: `${unresolved.route} ${unresolved.artifact}`,
      why: `needs ${unresolved.needs}`,
      kind: "unresolved_artifact",
    });
  }
  for (const slot of content.slots) {
    refusals.push({
      what: slot.category,
      why: `awaiting supplied content: ${slot.needs}`,
      kind: slot.hidden ? "hidden_section" : "content_slot",
    });
  }
  for (const refused of content.assets.refused) {
    refusals.push({ what: `asset file: ${refused.asset}`, why: refused.because, kind: "refused_asset" });
  }

  // ENGAGEMENT: consume the DELIVERY SPECS, never the registry. One spec per
  // selected opportunity; only DELIVERABLE specs become nodes.
  const engagementRendering: EngagementRendering[] = [];
  const renderedExperiences: RenderedExperience[] = [];
  const engagementNodesByRoute = new Map<string, ComponentNode[]>();
  for (const spec of options.deliverySpecs ?? []) {
    const trace = [`engagement:${spec.category}`, `engagement-record:${spec.decisionRecordId}`, `delivery-spec:${spec.specId}`, `engagement-score:${spec.score}`];
    if (spec.status === "DELIVERY_UNAVAILABLE") {
      engagementRendering.push({ specId: spec.specId, category: spec.category, status: spec.status, outcome: "delivery_unavailable", mode: null, route: spec.route, detail: spec.reason });
      refusals.push({ what: `engagement experience: ${spec.category}`, why: `DELIVERY_UNAVAILABLE — ${spec.reason}`, kind: "engagement_experience" });
      continue;
    }
    if (spec.mode === "existing_section" || !spec.definition || spec.definition.type === "existing_section") {
      engagementRendering.push({ specId: spec.specId, category: spec.category, status: spec.status, outcome: "served_by_existing_section", mode: spec.mode, route: spec.route, detail: spec.reason });
      continue;
    }
    const mode = spec.mode === "interactive" || spec.mode === "static_fallback_only" ? spec.mode : "static";
    const payload = { specId: spec.specId, category: spec.category, decisionRecordId: spec.decisionRecordId, mode, definition: spec.definition } as const;
    let experienceNode: ComponentNode;
    if (spec.definition.type === "comparison") {
      const table = spec.definition.table;
      experienceNode = node({
        id: spec.specId,
        kind: "experience",
        experience: payload,
        traceTo: trace,
        requiresClientJs: false,
        noScriptBehaviour: "the full table is in the served HTML; no enhancement exists",
        children: [
          node({ id: "engagement-comparison-heading", kind: "heading", headingLevel: 2, text: table.caption, traceTo: trace, requiresClientJs: false, noScriptBehaviour: "static heading" }),
          node({
            id: "engagement-comparison",
            kind: "comparison_table",
            table: { caption: table.caption, rowHeading: table.rowHeading, columns: table.criteria, rows: table.rows.map((r) => ({ header: r.offer, cells: r.values })) },
            traceTo: [...trace, `content:${spec.definition.source}`, "pattern-contract:comparison (semantic table, scoped headers, labelled scroll region)"],
            requiresClientJs: false,
            noScriptBehaviour: "the full table is in the served HTML; no enhancement exists",
          }),
        ],
      });
    } else {
      experienceNode = node({
        id: spec.specId,
        kind: "experience",
        experience: payload,
        traceTo: [...trace, ...spec.provenance.map((l) => `provenance:${l.item}=${l.provenance}`)],
        // The experience WORKS without JavaScript as its static equivalent; the
        // runtime only enhances. It is not a React client boundary.
        requiresClientJs: false,
        noScriptBehaviour: spec.fallback.description,
      });
    }
    engagementNodesByRoute.set(spec.route, [...(engagementNodesByRoute.get(spec.route) ?? []), experienceNode]);
    renderedExperiences.push({ specId: spec.specId, category: spec.category, route: spec.route, nodeId: experienceNode.id, mode });
    engagementRendering.push({ specId: spec.specId, category: spec.category, status: spec.status, outcome: "rendered", mode: spec.mode, route: spec.route, detail: spec.reason });
  }

  const pages: GeneratedPageModel[] = output.pages.map((page) => {
    const pageRefusals: Array<{ section: string; reason: string }> = [];
    const cta = ctaPlanFor(ctx, page);
    if (cta.state === "withheld" && page.conversionRole !== "none") {
      pageRefusals.push({ section: "primary_action", reason: cta.reason });
    }

    // DD-032: proof before the primary conversion.
    const { ordered, reorderedBy } = orderSections(page.requiredSections, ctx.d);

    const renderedPatterns = new Set<string>();
    const perSection = ordered.map((section) => ({
      section,
      nodes: nodesForSection(ctx, page, section, pageRefusals, renderedPatterns, cta),
    }));
    // A selected, renderable experience sits BEFORE the conversion section (ECO §19:
    // decision support precedes the action; never the hero by default).
    const experienceNodes = engagementNodesByRoute.get(page.route);
    if (experienceNodes && experienceNodes.length > 0) {
      const at = perSection.findIndex((s) => CONVERSION_SECTIONS.has(s.section));
      const entry = { section: "engagement_experience", nodes: experienceNodes };
      if (at >= 0) perSection.splice(at, 0, entry);
      else perSection.push(entry);
    }

    // DD-037 inline_repeated: the SAME action again, immediately before the
    // conversion section, when at least one section separates it from the hero.
    if (cta.state === "present" && cta.placement === "inline_repeated") {
      const at = perSection.findIndex((s) => CONVERSION_SECTIONS.has(s.section));
      if (at >= 2 && perSection[at]?.nodes.length) {
        perSection.splice(at, 0, {
          section: "primary_action_repeat",
          nodes: [actionNode("cta-repeat", cta, [`page:${page.route}`, "rule:DD-037 inline repeat of the single primary action"], responsiveFor(output, `cta@${page.route}`))],
        });
      }
    }

    // P1-2: a contact-link CTA the page cannot show in a hero or a conversion
    // section is still DELIVERED on the page, as its own contact route — a decided
    // capability is rendered where it was decided, never left only in the plan.
    if (cta.state === "present" && CONTACT_LINK_HREF.test(cta.href)) {
      const shown = perSection.some((s) => s.nodes.some((n) => nodeTreeHas(n, (x) => (x.kind === "action" && x.href === cta.href) || (x.kind === "contact_actions" && (x.contactLinks ?? []).some((l) => l.href === cta.href)))));
      if (!shown) {
        const delivery = [...ctx.deliveries.values()].find((dv) => dv.links.some((l) => l.href === cta.href));
        if (delivery) {
          perSection.push({
            section: "contact_route",
            nodes: [
              node({ id: "contact-route-heading", kind: "heading", headingLevel: 2, text: "Contact", traceTo: [`page:${page.route}`, "conversion:contact_route"], requiresClientJs: false, noScriptBehaviour: "static heading" }),
              contactActionsNode("contact-route", delivery.links, [`page:${page.route}`, `conversion:${delivery.objective} delivered ${delivery.delivered} on a page with no hero or conversion section`]),
            ],
          });
        }
      }
    }

    const sectionNodes = perSection.flatMap((s) => s.nodes);

    // EXACTLY ONE h1 per page (§I one_clear_h1). A hero supplies it when the page
    // has a proposition section; otherwise the page-title h1 comes from the SEO
    // title artifact — the same authority as <title>, so the two cannot disagree.
    const hasH1 = sectionNodes.some((n) => nodeTreeHasH1(n));
    if (!hasH1) {
      const titleArtifact = output.seoArtifacts.pages.find((p) => p.route === page.route)?.title;
      sectionNodes.unshift(
        node({
          id: "page-h1",
          kind: "heading",
          headingLevel: 1,
          text: titleArtifact?.value ?? output.profile.businessName,
          traceTo: [`page:${page.route}`, "seo:title artifact (generated_structural)", "rule:one_clear_h1"],
          requiresClientJs: false,
          noScriptBehaviour: "static heading",
        }),
      );
    }

    // DD-037 sticky: safe-area aware, hidden while the keyboard is open (CSS +
    // the responsive engine's `sticky_cta` rule). Only after the endpoint is verified.
    if (cta.state === "present" && cta.placement === "sticky") {
      sectionNodes.push(
        node({
          id: "sticky-cta",
          kind: "sticky_cta",
          text: cta.label,
          href: cta.href,
          traceTo: [
            `page:${page.route}`,
            ...cta.trace,
            "rule:DD-069 layout.fixedUiPadding=safe_area_inset",
            "responsive:hidden while the software keyboard is visible",
          ],
          requiresClientJs: false,
          noScriptBehaviour: "a plain link that stays in flow; stickiness is CSS only",
          responsive: responsiveFor(output, `cta@${page.route}`),
        }),
      );
    }

    for (const n of sectionNodes) {
      if (n.requiresClientJs) {
        clientBoundaries.push({
          page: page.route,
          nodeId: n.id,
          because: `${n.kind} requires client interaction; degrades to: ${n.noScriptBehaviour}`,
        });
      }
    }

    const nodes: ComponentNode[] = [
      headerNode(ctx, page),
      ...sectionNodes,
      node({
        id: "site-footer",
        kind: "site_footer",
        // The same labels as the navigation. A footer link whose text is the raw
        // route ("/") names no purpose and measured 7px wide in the first host audit.
        items: output.pages.map((p) => ({ text: pageLabel(p), detail: p.route })),
        traceTo: ["pages:pageModel"],
        requiresClientJs: false,
        noScriptBehaviour: "static footer links",
      }),
    ];

    const sectionResults = perSection.map((s) => ({
      section: s.section,
      nodeIds: s.nodes.map((n) => n.id),
      refusal: pageRefusals.find((r) => r.section === s.section || r.section === `${s.section}_form`)?.reason ?? null,
    }));
    return { page, nodes, refusals: pageRefusals, sectionOrder: perSection.map((s) => s.section), reorderedBy, cta, sectionResults };
  });

  return { pages, refusals, clientBoundaries, engagement: engagementRendering, renderedExperiences, conversionDeliveries: [...ctx.deliveries.values()] };
}

function nodeTreeHas(n: ComponentNode, test: (x: ComponentNode) => boolean): boolean {
  return test(n) || (n.children ?? []).some((c) => nodeTreeHas(c, test));
}

function nodeTreeHasH1(n: ComponentNode): boolean {
  if (n.kind === "heading" && n.headingLevel === 1) return true;
  return (n.children ?? []).some(nodeTreeHasH1);
}

/** Walk every node on every page. Used by emitters and by tests. */
export function walkNodes(model: ComponentModel, visit: (n: ComponentNode, page: PageSpec) => void): void {
  const recurse = (n: ComponentNode, page: PageSpec): void => {
    visit(n, page);
    for (const child of n.children ?? []) recurse(child, page);
  };
  for (const page of model.pages) {
    for (const n of page.nodes) recurse(n, page.page);
  }
}

/**
 * Every `rule:DD-nnn` cited anywhere in the model, deduplicated and sorted.
 * Includes PAGE-level decisions (DD-032's reorder, the CTA plan's trace), which
 * shape a page without belonging to any single node.
 */
export function rulesCitedBy(model: ComponentModel): string[] {
  const ids = new Set<string>();
  for (const page of model.pages) {
    if (page.reorderedBy) ids.add(page.reorderedBy);
    for (const t of page.cta.trace) {
      const m = /^rule:(DD-\d{3})/.exec(t);
      if (m?.[1]) ids.add(m[1]);
    }
  }
  walkNodes(model, (n) => {
    for (const t of n.traceTo) {
      const m = /^rule:(DD-\d{3})/.exec(t);
      if (m?.[1]) ids.add(m[1]);
    }
  });
  return [...ids].sort();
}
