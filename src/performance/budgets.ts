/**
 * Performance budgets and enhancement policy — specification §15, appendix H.
 *
 * §15 is explicit: when the budget is exceeded the framework must AUTOMATICALLY
 * DOWNGRADE OR REPLACE the effect — "do not merely report the problem". So the
 * exported function returns a new enhancement plan, not a list of complaints.
 *
 * THRESHOLD SINGLE-SOURCING (assessment §F3): these constants are the canonical
 * home for the numbers. website_workflow/checklists/qa_evidence_gate.md cites
 * this file rather than restating them, because a threshold written twice drifts
 * — the root cause color_system.md already records for brand colour.
 */

/** §H core_web_vitals_p75 and premium_targets. */
export const WEB_VITALS = {
  standard: { lcpSeconds: 2.5, inpMs: 200, cls: 0.1 },
  premium: { lcpSeconds: 2.0, inpMs: 150, cls: 0.05 },
} as const;

export type VitalsTier = keyof typeof WEB_VITALS;

/**
 * §H.1 default route budgets, keyed by the archetype the industry baseline sets.
 * `heavyVisualPolicy` is carried alongside because the number alone does not
 * express "no decorative WebGL" — a 150KB WebGL scene would technically fit a
 * 400KB budget while still being forbidden for a regulated business.
 */
export interface RouteBudget {
  routeJsKb: number;
  heavyVisualPolicy: string;
  /** Effects that may never appear on this archetype regardless of budget. */
  prohibitedHeavyVisuals: readonly string[];
}

export const ROUTE_BUDGETS: Record<string, RouteBudget> = {
  regulated_or_local_service: {
    routeJsKb: 150,
    heavyVisualPolicy: "No decorative WebGL or background video",
    prohibitedHeavyVisuals: ["decorative-webgl-hero", "video-background", "3d-product-view"],
  },
  b2b_saas: {
    routeJsKb: 200,
    heavyVisualPolicy: "Product demo deferred",
    prohibitedHeavyVisuals: ["decorative-webgl-hero"],
  },
  ecommerce: {
    routeJsKb: 200,
    heavyVisualPolicy: "Gallery optimised; 3D on demand",
    prohibitedHeavyVisuals: ["decorative-webgl-hero", "auto-rotating-carousel"],
  },
  corporate_education_nonprofit: {
    routeJsKb: 250,
    heavyVisualPolicy: "Storytelling deferred",
    prohibitedHeavyVisuals: ["decorative-webgl-hero"],
  },
  premium_travel_fashion: {
    routeJsKb: 300,
    heavyVisualPolicy: "Media optimised with poster and art direction",
    prohibitedHeavyVisuals: [],
  },
  creative_portfolio_campaign: {
    routeJsKb: 400,
    heavyVisualPolicy: "One major signature enhancement only",
    prohibitedHeavyVisuals: [],
  },
};

/** Archetype (from the industry baseline) → §H.1 budget row. */
const ARCHETYPE_TO_BUDGET: Record<string, keyof typeof ROUTE_BUDGETS> = {
  trust_first_transactional_information: "regulated_or_local_service",
  high_trust_service_clarity: "regulated_or_local_service",
  local_action_page: "regulated_or_local_service",
  credibility_led_information_architecture: "b2b_saas",
  product_led_technical_narrative: "b2b_saas",
  explainable_product_narrative: "b2b_saas",
  discovery_to_checkout_system: "ecommerce",
  audience_segmented_content_hub: "corporate_education_nonprofit",
  reputation_and_evidence_hub: "corporate_education_nonprofit",
  community_and_schedule_hub: "corporate_education_nonprofit",
  image_led_editorial_conversion: "premium_travel_fashion",
  image_led_authorship_commerce: "premium_travel_fashion",
  editorial_portfolio_conversion: "premium_travel_fashion",
  portfolio_and_capability_narrative: "creative_portfolio_campaign",
};

export function budgetForArchetype(archetype: string): RouteBudget {
  const key = ARCHETYPE_TO_BUDGET[archetype];
  const budget = key ? ROUTE_BUDGETS[key] : undefined;
  if (!budget) {
    // An unmapped archetype gets the STRICTEST budget, not a generous default.
    // An unknown risk profile is not licence to spend (§0.2).
    const fallback = ROUTE_BUDGETS["regulated_or_local_service"];
    if (!fallback) throw new Error("route budget table is missing its strictest row");
    return fallback;
  }
  return budget;
}

/** §H.2 require: hard controls every route must satisfy. */
export const HARD_PERFORMANCE_CONTROLS = [
  "image_dimensions_or_aspect_ratio",
  "responsive_image_source_selection",
  "defer_noncritical_js",
  "lazy_load_maps_webgl_lottie_large_gallery",
  "avoid_global_animation_imports",
  "measure_field_or_representative_lab_data",
] as const;

export interface Enhancement {
  patternId: string;
  estimatedRouteJsKb: number;
  /** Declared loading strategy; §H.2 requires heavy modules to be deferred. */
  loading: "eager" | "deferred" | "on_demand";
  fallback: string;
  /** True when the enhancement has a documented UX or brand purpose (§H.2). */
  hasDocumentedPurpose: boolean;
}

export type DowngradeAction =
  | { action: "keep"; patternId: string; reason: string }
  | { action: "defer"; patternId: string; reason: string }
  | { action: "downgrade_to_fallback"; patternId: string; to: string; reason: string }
  | { action: "remove"; patternId: string; reason: string };

export interface BudgetVerdict {
  budgetKb: number;
  initialKb: number;
  finalKb: number;
  withinBudget: boolean;
  actions: DowngradeAction[];
  /** The enhancement plan AFTER automatic downgrade — this is the output that matters. */
  plan: Enhancement[];
}

/**
 * Enforce the budget by CHANGING the plan (§15).
 *
 * Order of remedies, cheapest intervention first:
 *   1. An enhancement with no documented purpose is REMOVED (§H.2) — it is not
 *      a budget problem, it is decoration, and it goes regardless of budget.
 *   2. An eager heavy module is DEFERRED, which costs nothing visually.
 *   3. If still over, the largest remaining enhancement is downgraded to its
 *      fallback, repeatedly, largest-first.
 *   4. An enhancement with no fallback is removed rather than kept over budget.
 */
export function enforceBudget(
  enhancements: readonly Enhancement[],
  budget: RouteBudget,
): BudgetVerdict {
  const actions: DowngradeAction[] = [];
  let plan = [...enhancements];
  const initialKb = plan.reduce((sum, e) => sum + e.estimatedRouteJsKb, 0);

  // 1. Purposeless effects, and effects prohibited for this archetype, go first.
  plan = plan.filter((e) => {
    if (!e.hasDocumentedPurpose) {
      actions.push({
        action: "remove",
        patternId: e.patternId,
        reason: "no documented UX or brand purpose (§H.2 remove_or_defer_when)",
      });
      return false;
    }
    if (budget.prohibitedHeavyVisuals.includes(e.patternId)) {
      actions.push({
        action: "remove",
        patternId: e.patternId,
        reason: `prohibited for this archetype: ${budget.heavyVisualPolicy}`,
      });
      return false;
    }
    return true;
  });

  // 2. Defer anything heavy that was going to load eagerly (DD-088: heavy
  //    modules load on intent or near-viewport, never on the initial route).
  plan = plan.map((e) => {
    if (e.loading === "eager" && e.estimatedRouteJsKb >= 30) {
      actions.push({
        action: "defer",
        patternId: e.patternId,
        reason: "heavy module must be lazy-loaded (§H.2 require)",
      });
      return { ...e, loading: "on_demand" as const };
    }
    return e;
  });

  // 3. Still over budget: downgrade largest-first (DD-084: the budget is a gate,
  //    not a report; DD-111: a non-essential enhancement is removed or deferred
  //    rather than the budget being raised).
  const total = () => plan.reduce((sum, e) => sum + e.estimatedRouteJsKb, 0);
  let guard = plan.length + 1;
  while (total() > budget.routeJsKb && guard-- > 0) {
    const heaviest = [...plan].sort((a, b) => b.estimatedRouteJsKb - a.estimatedRouteJsKb)[0];
    if (!heaviest) break;
    if (heaviest.fallback.trim().length === 0) {
      actions.push({
        action: "remove",
        patternId: heaviest.patternId,
        reason: `over budget with no fallback to downgrade to (needed ${heaviest.estimatedRouteJsKb}KB)`,
      });
      plan = plan.filter((e) => e.patternId !== heaviest.patternId);
      continue;
    }
    actions.push({
      action: "downgrade_to_fallback",
      patternId: heaviest.patternId,
      to: heaviest.fallback,
      reason: `route JS ${total()}KB exceeds the ${budget.routeJsKb}KB budget; downgraded the largest enhancement`,
    });
    plan = plan.map((e) =>
      e.patternId === heaviest.patternId
        ? { ...e, patternId: e.fallback, estimatedRouteJsKb: 0, loading: "eager" as const, fallback: "" }
        : e,
    );
  }

  for (const e of plan) {
    if (!actions.some((a) => a.patternId === e.patternId)) {
      actions.push({ action: "keep", patternId: e.patternId, reason: "within budget" });
    }
  }

  const finalKb = total();
  return {
    budgetKb: budget.routeJsKb,
    initialKb,
    finalKb,
    withinBudget: finalKb <= budget.routeJsKb,
    actions,
    plan,
  };
}
