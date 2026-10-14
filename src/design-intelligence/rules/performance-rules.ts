/**
 * Performance rules — §4.11 (DD-085, DD-087, DD-088, DD-089, DD-090).
 *
 * `performance/budgets.ts` owns budget enforcement and DD-084 already names it.
 * These five add the OUTPUT-SHAPING obligations the emitters honour: LCP media
 * priority, server-first rendering, deferred heavy modules, animatable
 * properties, and deferred embeds. Each names the emitter or the budget module
 * as its consumer, and the CSS test proves DD-089 by scanning the generated
 * stylesheet for forbidden animated properties.
 */
import { parseRule, type Rule } from "../types/decision.js";

const LCP = "https://web.dev/articles/lcp";
const NEXT_IMAGE = "https://nextjs.org/docs/app/api-reference/components/image";
const LAZY = "https://nextjs.org/docs/app/guides/lazy-loading";
const ANIM_PERF = "https://web.dev/articles/animations-and-performance";
const EMBEDS = "https://web.dev/articles/embed-best-practices";

export const PERFORMANCE_RULES: readonly Rule[] = [
  parseRule({
    id: "DD-085",
    title: "LCP media",
    domain: "performance",
    classification: "gate",
    consumer: "generation/render/html.ts",
    sourceSection: "§4.11",
    then: [
      { kind: "set", target: "images.heroPriority", value: "eager_high_priority_single_candidate" },
      { kind: "set", target: "images.belowFoldLoading", value: "lazy" },
      { kind: "forbid", target: "performance", value: "multiple_competing_hero_assets" },
      { kind: "forbid", target: "performance", value: "lcp_delayed_behind_client_js" },
    ],
    avoid: ["loading_multiple_competing_hero_assets", "delaying_lcp_behind_client_js"],
    fallback: ["static optimized image or text-first hero"],
    rationale: "LCP is driven by the largest visible content and must load quickly.",
    source_urls: [LCP, NEXT_IMAGE],
    confidence: "high",
  }),
  parseRule({
    id: "DD-087",
    title: "Client JS minimization",
    domain: "performance",
    classification: "gate",
    consumer: "generation/emit/nextjs.ts",
    sourceSection: "§4.11",
    then: [
      { kind: "set", target: "rendering.componentDefault", value: "server_component_or_static_html" },
      { kind: "forbid", target: "performance", value: "unnecessary_use_client" },
      { kind: "forbid", target: "performance", value: "global_animation_libraries" },
    ],
    avoid: ["unnecessary_use_client", "global_animation_libraries"],
    fallback: ["isolated client island"],
    rationale: "Less initial client JavaScript improves loading and interaction responsiveness.",
    source_urls: [LAZY],
    confidence: "high",
  }),
  parseRule({
    id: "DD-088",
    title: "Lazy loading advanced modules",
    domain: "performance",
    classification: "gate",
    consumer: "performance/budgets.ts",
    sourceSection: "§4.11",
    then: [
      { kind: "set", target: "performance.heavyModuleLoading", value: "dynamic_import_on_viewport_or_intent" },
      { kind: "require", target: "performance", value: "WebGL, maps, Lottie, video, large galleries and story choreography load on intent or near-viewport, never on the initial route" },
    ],
    // "essential LCP content and budget proves it safe" — the budget module is the
    // only thing that can prove it, and it decides per enhancement.
    unless: [{ fact: "variables.performance_sensitivity", op: "eq", value: "low" }],
    fallback: ["static placeholder/fallback"],
    rationale: "Heavy modules should not delay the initial route without demonstrated value.",
    source_urls: [LAZY],
    confidence: "high",
  }),
  parseRule({
    id: "DD-089",
    title: "Animation properties",
    domain: "performance",
    classification: "gate",
    consumer: "generation/render/css.ts",
    sourceSection: "§4.11",
    then: [
      { kind: "set", target: "motion.animatableProperties", value: ["transform", "opacity"] },
      { kind: "forbid", target: "motion", value: "animating_top_left_width_height_margin" },
    ],
    prefer: ["transform", "opacity"],
    avoid: ["animating_top_left_width_height_margin"],
    fallback: ["no animation"],
    rationale: "Transform and opacity usually avoid costly layout/paint work.",
    source_urls: [ANIM_PERF],
    confidence: "high",
  }),
  parseRule({
    id: "DD-090",
    title: "Third-party embeds",
    domain: "performance",
    classification: "gate",
    consumer: "stack/select-stack.ts",
    sourceSection: "§4.11",
    then: [
      { kind: "set", target: "performance.embedLoading", value: "deferred_until_intent_or_near_viewport" },
      { kind: "require", target: "performance", value: "every third-party embed reserves its layout space and offers a click-to-load preview" },
      { kind: "forbid", target: "performance", value: "embed_in_initial_viewport_without_need" },
    ],
    avoid: ["loading_map_video_social_embeds_in_initial_viewport_without_need"],
    fallback: ["click-to-load preview"],
    rationale: "Third-party embeds can add performance and layout-shift cost.",
    source_urls: [EMBEDS],
    confidence: "high",
  }),
];
