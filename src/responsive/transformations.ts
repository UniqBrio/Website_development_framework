/**
 * Responsive transformation engine — specification §11, appendix F.2.
 *
 * §11's hard rule: "Never remove a core action, important evidence, legal
 * disclosure, product detail, navigation destination, or accessibility control
 * merely to make the mobile layout easier."
 *
 * So `hide` is a legal transformation for decoration and an ILLEGAL one for
 * anything essential, and this module refuses it rather than trusting the
 * caller. That refusal is the whole value of putting this in code.
 */
import type { CapabilityContext, RangeName } from "./capabilities.js";
import { rangeForWidth } from "./capabilities.js";

/** §11's transformation vocabulary. */
export const TRANSFORMATIONS = [
  "remain",
  "scale",
  "reflow",
  "reorder",
  "condense",
  "expand",
  "simplify",
  "replace",
  "staticize",
  "defer",
  "hide",
] as const;
export type Transformation = (typeof TRANSFORMATIONS)[number];

/**
 * §11's content-criticality classes. `essential` is the set §11 forbids
 * removing; `decorative` is the only class `hide` may be applied to.
 */
export type Criticality = "essential" | "supporting" | "decorative";

export const ESSENTIAL_KINDS = [
  "proposition",
  "primary_action",
  "navigation_destination",
  "product_detail",
  "pricing",
  "legal_disclosure",
  "important_evidence",
  "accessibility_control",
  "contact_route",
] as const;

export interface ComponentDescriptor {
  id: string;
  criticality: Criticality;
  /** What the component is, drawn from ESSENTIAL_KINDS where applicable. */
  kind: string;
  /** True when the component's affordance depends on hover. */
  hoverDependent: boolean;
  /** True when it animates. */
  animated: boolean;
  /** Estimated weight; drives `defer` under reduced-data. */
  weightKb: number;
  /** Declared behaviour per range from the pattern definition. */
  declared?: Partial<Record<RangeName, Transformation>>;
}

export interface TransformationDecision {
  componentId: string;
  range: RangeName;
  transformation: Transformation;
  reason: string;
  /** Set when a requested transformation was refused. */
  refused?: { requested: Transformation; because: string };
}

/** §11 priority order — used to explain why a transformation was chosen. */
export const RESPONSIVE_PRIORITIES = [
  "preserve_core_content_and_tasks",
  "preserve_semantic_order",
  "preserve_accessibility",
  "preserve_performance",
  "preserve_hierarchy",
  "preserve_conversion",
  "preserve_brand_expression",
  "preserve_visual_novelty",
] as const;

function isEssential(component: ComponentDescriptor): boolean {
  return (
    component.criticality === "essential" ||
    (ESSENTIAL_KINDS as readonly string[]).includes(component.kind)
  );
}

/**
 * Decide one component's transformation for one capability context.
 *
 * Order of reasoning, mirroring §11's priority list: content preservation first,
 * then accessibility, then performance, then presentation.
 */
export function transformComponent(
  component: ComponentDescriptor,
  capabilities: CapabilityContext,
): TransformationDecision {
  const range = rangeForWidth(
    component.declared !== undefined && capabilities.containerWidthCssPx !== undefined
      ? capabilities.containerWidthCssPx
      : capabilities.viewportWidthCssPx,
  );
  const declared = component.declared?.[range];

  // 1. A declared `hide` on essential content is refused outright (§11).
  if (declared === "hide" && isEssential(component)) {
    return {
      componentId: component.id,
      range,
      transformation: "reflow",
      reason:
        "essential content may never be hidden to simplify a layout (§11); reflowed to a single column instead",
      refused: { requested: "hide", because: `kind "${component.kind}" is essential` },
    };
  }

  // 2. Hover dependence must go wherever hover is unavailable (§9, §F.2; DD-068).
  if (component.hoverDependent && (!capabilities.hover || capabilities.pointer !== "fine")) {
    return {
      componentId: component.id,
      range,
      transformation: "replace",
      reason:
        "hover is unavailable on this input, so the affordance is replaced with a visible/tappable equivalent (§9)",
    };
  }

  // 3. Reduced motion staticises animation without losing information (§9; DD-047).
  if (component.animated && capabilities.reducedMotion) {
    return {
      componentId: component.id,
      range,
      transformation: "staticize",
      reason: "prefers-reduced-motion is set; the static form must lose no information (§9)",
    };
  }

  // 4. Forced colors: simplify rather than fight the user's palette.
  if (capabilities.forcedColors && component.criticality === "decorative") {
    return {
      componentId: component.id,
      range,
      transformation: "hide",
      reason: "decorative-only element removed under forced-colors to avoid competing with the user's palette",
    };
  }

  // 5. Reduced data defers weight, never essential content.
  if (capabilities.reducedData && component.weightKb >= 50) {
    return {
      componentId: component.id,
      range,
      transformation: isEssential(component) ? "simplify" : "defer",
      reason: isEssential(component)
        ? "essential but heavy under reduced-data: simplified rather than deferred, because it must still arrive"
        : "heavy non-essential content deferred under prefers-reduced-data",
    };
  }

  // 5b. Foldables (DD-073). `foldableSegments` was modelled from the first
  //    responsive pass and read by NOTHING — the P1 report flagged it. On a
  //    multi-segment viewport, essential content and any form or action must not
  //    be split across the hinge, so it is reflowed into a single continuous
  //    pane rather than laid out two-up.
  if (capabilities.foldableSegments >= 2) {
    const mustNotSplit =
      isEssential(component) || component.kind === "form" || component.kind === "sticky_cta";
    if (mustNotSplit) {
      return {
        componentId: component.id,
        range,
        transformation: "reflow",
        reason:
          "multi-segment (foldable) viewport: essential content, forms and actions are kept in one continuous pane, never split across the hinge (DD-073)",
      };
    }
  }

  // 6. A software keyboard shrinks the visual viewport; sticky chrome must not
  //    cover the focused field.
  if (capabilities.keyboardVisible && component.kind === "sticky_cta") {
    return {
      componentId: component.id,
      range,
      transformation: "hide",
      reason: "sticky CTA hidden while the software keyboard is open so it cannot cover the focused input",
    };
  }

  // 7. Otherwise honour the declared behaviour, or fall back to range defaults.
  if (declared) {
    return {
      componentId: component.id,
      range,
      transformation: declared,
      reason: `declared behaviour for the ${range} range`,
    };
  }

  // DD-066: the compact range reflows to a single priority-ordered column by
  // default; nothing essential is condensed away.
  const byRange: Record<RangeName, Transformation> = {
    compact: "reflow",
    medium: "condense",
    expanded: "remain",
    large: "remain",
    extra_large: "expand",
  };
  return {
    componentId: component.id,
    range,
    transformation: byRange[range],
    reason: `range default for ${range}; no declared behaviour`,
  };
}

export interface ResponsiveAudit {
  decisions: TransformationDecision[];
  /** Refusals are the interesting output: a caller tried to lose something. */
  refusals: TransformationDecision[];
  /** True when no essential content was lost at any tested profile. */
  coreContentPreserved: boolean;
}

export function auditResponsive(
  components: readonly ComponentDescriptor[],
  profiles: ReadonlyArray<{ name: string; capabilities: CapabilityContext }>,
): ResponsiveAudit {
  const decisions: TransformationDecision[] = [];
  for (const profile of profiles) {
    for (const component of components) {
      decisions.push(transformComponent(component, profile.capabilities));
    }
  }
  const refusals = decisions.filter((d) => d.refused !== undefined);
  const lostEssential = decisions.some(
    (d) =>
      d.transformation === "hide" &&
      components.some((c) => c.id === d.componentId && isEssential(c)),
  );
  return { decisions, refusals, coreContentPreserved: !lostEssential };
}
