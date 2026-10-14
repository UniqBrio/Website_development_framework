/**
 * Technology selection — specification §17 and §24.
 *
 * §24 is a MANDATORY architectural rule with two branches:
 *   seo_dependency == high AND pwa_requirement == false → Next.js is primary.
 *   pwa_requirement == true → PWA requirements become a first-class constraint,
 *     without sacrificing indexability, accessibility, performance, semantic
 *     HTML or maintainability.
 *
 * This is the deterministic form of website_workflow/stack_doctrine.md, which
 * states the same rule as a prose gate: PWA is default-deny and must be a
 * stated product requirement, never added because it is modern. The two must
 * agree; this file is the executable one.
 */
import type { DesignContextProfile } from "../design-intelligence/types/profile.js";
import type { FunctionalityRequirement } from "../design-intelligence/types/business-input.js";

export interface StackDecision {
  framework: "nextjs";
  renderingStrategy: "static" | "server" | "hybrid";
  /** True when PWA behaviour is an explicit product requirement. */
  pwaConstraintEnabled: boolean;
  styling: readonly string[];
  primitives: readonly string[];
  /** Only libraries an actual requirement justified AND a selected capability needs. */
  libraries: readonly string[];
  /**
   * Libraries a requirement asked for but that were NOT added, because the
   * capability they serve was not selected. Recorded rather than silently
   * dropped: the owner asked for the feature and must see why it is absent.
   */
  omittedLibraries: Array<{ library: string; requirement: string; because: string }>;
  /** Denied-by-default categories that were requested and their verdict. */
  architecturalConstraints: readonly string[];
  rationale: readonly string[];
  /** §24: the decision must be explicitly recorded. */
  recordedRule: string;
}

/**
 * Libraries that only enter the stack when a requirement asks for them.
 * `avoid unnecessary dependencies` (§17) is enforced by making the DEFAULT set
 * empty and requiring a requirement to add anything.
 */
interface RequirementLibrary {
  libraries: readonly string[];
  /**
   * The pattern capability this dependency exists to serve. When set, the
   * library enters ONLY if a selected pattern provides that capability.
   *
   * This is the fix for the dry run's stack contradiction: `three` and
   * `@react-three/fiber` were added because `product_configurator` was
   * requested, while the engine had REJECTED every 3D pattern — producing exactly
   * the unnecessary dependency §17 forbids, from inside the framework.
   */
  requiresCapability?: string;
  /** When set, the library enters only if the rule draft chose this value. */
  requiresDraftValue?: { target: string; value: string };
}

const REQUIREMENT_LIBRARIES: Partial<Record<FunctionalityRequirement, RequirementLibrary>> = {
  contact_form: { libraries: ["react-hook-form", "zod"] },
  booking: { libraries: ["react-hook-form", "zod"] },
  newsletter: { libraries: ["react-hook-form", "zod"] },
  payments: { libraries: ["react-hook-form", "zod"] },
  checkout: { libraries: ["react-hook-form", "zod"] },
  search: { libraries: [] },
  map: {
    // DD-090: a third-party embed is never in the initial route; it loads on
    // intent or near-viewport with reserved layout space — hence "lazy-loaded".
    libraries: ["lazy-loaded map embed"],
    // DD-114 decides interactive map vs address + directions link. An
    // unverified location takes the static branch, so no embed is needed.
    requiresDraftValue: { target: "map", value: "interactive_map" },
  },
  multilingual: { libraries: ["next-intl"] },
  blog: { libraries: ["mdx"] },
  cms_editing: { libraries: ["headless CMS client"] },
  product_configurator: {
    libraries: ["three", "@react-three/fiber"],
    requiresCapability: "spatial_3d",
  },
  chat: { libraries: [] },
  account: { libraries: [] },
  authentication: { libraries: [] },
  pwa: { libraries: ["next-pwa or an equivalent service-worker toolchain"] },
  offline: { libraries: ["next-pwa or an equivalent service-worker toolchain"] },
};

/**
 * §17's escalation: motion tooling is added by the MOTION strategy, not by the
 * stack, and only for the tier actually selected. A site whose highest selected
 * tier is CSS gets no animation library at all.
 */
export function motionLibrariesForTier(tier: string): readonly string[] {
  switch (tier) {
    case "semantic_html_css":
    case "css_transforms_transitions":
      return [];
    case "web_animations_api":
      return [];
    case "motion_react":
      return ["motion"];
    case "gsap":
      return ["gsap"];
    case "lottie":
      return ["lottie-web (lazy)"];
    case "three_r3f":
    case "full_webgl":
      return ["three", "@react-three/fiber (lazy, on intent)"];
    default:
      return [];
  }
}

export interface SelectStackOptions {
  highestSelectedTier?: string;
  /** Capability tags provided by patterns the engine actually SELECTED. */
  selectedCapabilities?: ReadonlySet<string>;
  /** The rule-evaluation draft, so a dependency can follow a rule's decision. */
  draft?: Record<string, unknown>;
}

export function selectStack(
  profile: DesignContextProfile,
  requiredFunctionality: readonly FunctionalityRequirement[],
  options: SelectStackOptions = {},
): StackDecision {
  const rationale: string[] = [];
  const architecturalConstraints: string[] = [];
  const libraries = new Set<string>();
  const omittedLibraries: StackDecision["omittedLibraries"] = [];
  const selectedCapabilities = options.selectedCapabilities ?? new Set<string>();
  const draft = options.draft ?? {};

  const seoHigh = profile.variables.seo_dependency === "high";
  const pwaRequested = profile.pwaRequested;

  // §24, branch 1.
  if (seoHigh && !pwaRequested) {
    rationale.push(
      "§24: seo_dependency is high and PWA is not an identified requirement, so Next.js is the primary application framework.",
    );
  }

  // §24, branch 2.
  if (pwaRequested) {
    rationale.push(
      "§24: PWA is a stated product requirement, so PWA behaviour becomes a first-class architectural constraint.",
    );
    architecturalConstraints.push(
      "service worker scoped so it never intercepts or stales indexable HTML",
      "server-rendered content remains the base experience; offline support is additive",
      "precache budget counted against the route JS budget, not exempt from it",
      "install prompt is user-initiated, never automatic",
    );
  } else {
    // Default-deny, matching stack_doctrine.md.
    architecturalConstraints.push(
      "PWA, service workers, offline support and app-shell architecture are DENIED (not requested)",
    );
    rationale.push(
      "PWA was not requested, so it is denied by default — it is never added because it is modern (§17).",
    );
  }

  // Denied-by-default categories that were nonetheless requested get recorded
  // as constraints rather than silently enabled.
  for (const requirement of requiredFunctionality) {
    if (requirement === "authentication" || requirement === "account") {
      architecturalConstraints.push(
        `"${requirement}" requested: gate it to a private surface; public content stays indexable and ungated`,
      );
    }
    if (requirement === "cms_editing") {
      architecturalConstraints.push(
        "CMS requested: it is the LAST rung of the content ladder and needs a named non-technical editor",
      );
    }
    const entry = REQUIREMENT_LIBRARIES[requirement];
    if (!entry) continue;

    if (entry.requiresCapability !== undefined && !selectedCapabilities.has(entry.requiresCapability)) {
      for (const library of entry.libraries) {
        omittedLibraries.push({
          library,
          requirement,
          because: `no selected pattern provides the "${entry.requiresCapability}" capability, so this dependency would serve nothing (§17 avoid unnecessary dependencies)`,
        });
      }
      architecturalConstraints.push(
        `"${requirement}" was requested but no pattern providing "${entry.requiresCapability}" survived selection — resolve the design decision before adding the dependency`,
      );
      continue;
    }

    if (entry.requiresDraftValue !== undefined) {
      const actual = draft[entry.requiresDraftValue.target];
      if (actual !== entry.requiresDraftValue.value) {
        for (const library of entry.libraries) {
          omittedLibraries.push({
            library,
            requirement,
            because: `a rule chose ${entry.requiresDraftValue.target}="${String(actual ?? "unset")}" rather than "${entry.requiresDraftValue.value}", so the dependency is not needed`,
          });
        }
        continue;
      }
    }

    for (const library of entry.libraries) {
      libraries.add(library);
    }
  }

  for (const library of motionLibrariesForTier(options.highestSelectedTier ?? "semantic_html_css")) {
    libraries.add(library);
  }

  // Rendering strategy follows SEO dependency and commerce depth, not taste.
  const renderingStrategy: StackDecision["renderingStrategy"] =
    profile.variables.commerce_depth === "deep" || profile.variables.commerce_depth === "medium"
      ? "hybrid"
      : seoHigh
        ? "static"
        : "server";

  rationale.push(
    `rendering strategy "${renderingStrategy}" chosen from seo_dependency=${profile.variables.seo_dependency} and commerce_depth=${profile.variables.commerce_depth}.`,
  );

  if (libraries.size === 0) {
    rationale.push("No libraries added: no requirement justified one (§17 avoid unnecessary dependencies).");
  }

  return {
    framework: "nextjs",
    renderingStrategy,
    pwaConstraintEnabled: pwaRequested,
    // What the GENERATED site is actually built from. stack_doctrine.md lists
    // Tailwind, shadcn/ui, Lucide and next/font as doctrine DEFAULTS for hand-built
    // work; the generator implements the same token discipline (one generated token
    // file, no hardcoded colour) in plain CSS and semantic HTML, and installs none of
    // them. Naming packages here that no layer installs or uses was a conflict of
    // authorities (first customer dry run). A host may adopt one only through the
    // DEPENDENCY GATE.
    styling: ["generated token stylesheet (one file, color_system.md)", "css container queries"],
    primitives: ["semantic HTML components emitted by the generator", "next/image (only where a verified image asset exists)"],
    libraries: [...libraries].sort(),
    omittedLibraries,
    architecturalConstraints,
    rationale,
    recordedRule: pwaRequested
      ? "DD-STACK: pwa_requirement == true → PWA architectural constraint enabled (§24)"
      : seoHigh
        ? "DD-STACK: seo_dependency == high AND pwa_requirement == false → Next.js primary (§24)"
        : "DD-STACK: Next.js primary by default; no PWA requirement stated (§17)",
  };
}
