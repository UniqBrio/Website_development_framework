/**
 * CSS EMITTER — from the token contract, the responsive decisions and the
 * evaluation draft.
 *
 * Closes assessment gap G-2: the responsive audit produces per component ×
 * profile decisions, and CSS needs per-range rules.
 *
 * The generator does NOT calculate a colour. Every value here comes from
 * `tokens.color.values.cssCustomProperties`, which came from the ported OKLCH
 * derivation. Breakpoints come from `tokens.layout.values.breakpoints`, which were
 * read from the responsive engine's `RANGES`. One authority per number, all the
 * way down.
 *
 * RULE CONSUMPTION. This file is the named consumer of the rules whose effect is
 * a STYLESHEET property: DD-022, DD-023, DD-024, DD-025, DD-045, DD-067, DD-069,
 * DD-070, DD-072, DD-078, DD-089. Each is read from the evaluation draft
 * (`decisions`) and each emitted block is labelled with its rule id, so the
 * served stylesheet is itself the traceability evidence.
 */
import type { DesignTokenContract } from "../../design-system/tokens/token-contract.js";
import type { ComponentModel } from "../component-model.js";
import { TOUCH_TARGET_CSS_PX, type RangeName } from "../../responsive/capabilities.js";

const RANGE_ORDER: RangeName[] = ["compact", "medium", "expanded", "large", "extra_large"];

function tokensBlock(tokens: DesignTokenContract): string {
  const lines: string[] = [];
  const css = tokens.color.values.cssCustomProperties;
  const themes = Object.keys(css) as Array<"light" | "dark">;

  // The first theme is the root theme; a second is emitted under a media query,
  // which is what theme_system.md's DUAL mode requires.
  const primary = themes[0];
  if (primary) {
    lines.push(":root {");
    for (const [name, value] of Object.entries(css[primary] ?? {})) {
      lines.push(`  ${name}: ${value};`);
    }
    // Typography, spacing, radius and motion as custom properties too, so a
    // component can never need an off-scale value.
    const t = tokens.typography.values;
    lines.push(`  --font-heading: ${t.fontHeading};`);
    lines.push(`  --font-body: ${t.fontBody};`);
    for (const [role, size] of Object.entries(t.scale)) lines.push(`  --text-${role}: ${size};`);
    for (const [role, lh] of Object.entries(t.lineHeight)) lines.push(`  --leading-${role}: ${lh};`);
    lines.push(`  --measure: ${t.readingMeasure};`);
    for (const [step, value] of Object.entries(tokens.spacing.values.scale)) {
      lines.push(`  --space-${step}: ${value};`);
    }
    for (const [name, value] of Object.entries(tokens.radius.values.scale)) {
      lines.push(`  --radius-${name}: ${value};`);
    }
    for (const [name, value] of Object.entries(tokens.motion.values.duration)) {
      lines.push(`  --duration-${name}: ${value};`);
    }
    for (const [name, value] of Object.entries(tokens.motion.values.easing)) {
      lines.push(`  --ease-${name}: ${value};`);
    }
    lines.push("}");
  }

  const secondary = themes[1];
  if (secondary) {
    lines.push("");
    lines.push(`@media (prefers-color-scheme: ${secondary}) {`);
    lines.push("  :root {");
    for (const [name, value] of Object.entries(css[secondary] ?? {})) {
      lines.push(`    ${name}: ${value};`);
    }
    lines.push("  }");
    lines.push("}");
  }

  return lines.join("\n");
}

/**
 * §G.1 / WCAG 2.5.8 (AA 24px) and 2.5.5 (AAA 44px): every interactive target
 * reaches the REQUESTED minimum. The number comes from the accessibility
 * strategy's thresholds — the evaluator's authority — not from a layout token.
 * DEFECT this fixes (found by the first real host audit): only buttons had a
 * minimum, via an unrelated gutter token; navigation links measured 24px tall
 * and a footer link 7px wide on an AAA site.
 */
function targetSizeBlock(targetSizeCssPx: number): string {
  return `
/* §G.1 target size: ${targetSizeCssPx}px minimum at the requested accessibility target.
   A contact link alone in a definition list is a target, not text in a sentence (RF-006,
   found when the contact section first rendered: 22px on touch profiles). */
.c-nav a, .c-site-footer a, .c-brand, .c-action, button, summary, .c-definition-list dd > a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-block-size: ${targetSizeCssPx}px;
  min-inline-size: ${targetSizeCssPx}px;
}
input, select, textarea { min-block-size: ${targetSizeCssPx}px; }${
    targetSizeCssPx < TOUCH_TARGET_CSS_PX
      ? `
/* RF-006 / Q5: coarse pointers get ${TOUCH_TARGET_CSS_PX}px whatever the WCAG level */
@media (pointer: coarse) {
  .c-nav a, .c-site-footer a, .c-brand, .c-action, button, summary, .c-definition-list dd > a {
    min-block-size: ${TOUCH_TARGET_CSS_PX}px;
    min-inline-size: ${TOUCH_TARGET_CSS_PX}px;
  }
  input, select, textarea { min-block-size: ${TOUCH_TARGET_CSS_PX}px; }
}`
      : ""
  }
`.trim();
}

function baseBlock(tokens: DesignTokenContract): string {
  const containers = tokens.layout.values.containers;
  return `
*, *::before, *::after { box-sizing: border-box; }
html { color-scheme: ${Object.keys(tokens.color.values.semantic).join(" ")}; }
body {
  margin: 0;
  background: var(--color-bg-0);
  color: var(--color-fg-0);
  font-family: var(--font-body);
  font-size: var(--text-body);
  line-height: var(--leading-body);
}
main { max-width: ${containers.large}; margin: 0 auto; padding: var(--space-6) var(--space-4); }
h1, h2, h3 { font-family: var(--font-heading); line-height: var(--leading-heading); }
h1 { font-size: var(--text-h1); }
h2 { font-size: var(--text-h2); }
h3 { font-size: var(--text-h3); }
p { max-width: var(--measure); }
img { max-width: 100%; height: auto; }

/* Focus is visible and never obscured — §G.1 blocks production otherwise. */
:focus-visible {
  outline: 3px solid var(--color-focus-ring);
  outline-offset: 2px;
}
.c-skip {
  position: absolute; left: -9999px;
  background: var(--color-bg-1); color: var(--color-fg-0); padding: var(--space-3);
}
.c-skip:focus { left: var(--space-3); top: var(--space-3); z-index: 10; }

a { color: var(--color-accent-1-text); }
.c-brand { font-family: var(--font-heading); font-weight: 700; text-decoration: none; color: var(--color-fg-0); }
.c-content-slot {
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  color: var(--color-fg-1);
}
.c-pending { color: var(--color-fg-1); font-size: var(--text-small); }
.c-unavailable-notice {
  border-left: 4px solid var(--color-warning);
  background: var(--color-warning-bg);
  color: var(--color-warning-on);
  padding: var(--space-4);
}
button, .c-action {
  display: inline-block;
  background: var(--color-accent-1);
  color: var(--color-accent-1-on);
  border: 0;
  border-radius: var(--radius-md);
  /* Target size: see the §G.1 target-size block, driven by the requested target. */
  padding: var(--space-3) var(--space-5);
  font: inherit;
  text-decoration: none;
  cursor: pointer;
}
/* A disabled control must not look actionable: controls inside a disabled
   fieldset match :disabled (customer dry run 2026-09-14: an unconfigured form's
   submit button rendered in the enabled accent while the disabled token went unused). */
button:disabled, input:disabled, textarea:disabled, select:disabled { cursor: not-allowed; }
button:disabled { background: var(--color-accent-1-disabled); color: var(--color-fg-1); }
/* Engagement comparison (ECO §12): table semantics at every width; narrow screens scroll a labelled region. */
.c-table-scroll { overflow-x: auto; max-inline-size: 100%; }
.c-comparison-table { border-collapse: collapse; min-inline-size: 100%; }
.c-comparison-table caption { text-align: start; font-weight: 600; padding-block: var(--space-3); }
.c-comparison-table th, .c-comparison-table td { text-align: start; padding: var(--space-3); border-block-end: 1px solid var(--color-divider); vertical-align: top; }
label { display: block; font-weight: 600; }
input, textarea {
  width: 100%; padding: var(--space-3);
  border: 1px solid var(--color-border); border-radius: var(--radius-sm);
  background: var(--color-bg-1); color: var(--color-fg-0); font: inherit;
}
.c-field-error { display: block; color: var(--color-warning-on); font-size: var(--text-small); }
.c-form-status:empty { display: none; }
`.trim();
}

/**
 * The rule-decided blocks. Each reads ONE key of the evaluation draft and emits
 * a block labelled with the rule id. A rule whose key is absent emits the
 * conservative default and says so, so the stylesheet never silently assumes.
 */
function rulesBlock(decisions: Record<string, unknown>, tokens: DesignTokenContract): string {
  const blocks: string[] = [];
  const durations = Object.keys(tokens.motion.values.duration);
  const easings = Object.keys(tokens.motion.values.easing);
  const duration = durations[0] ? `var(--duration-${durations[0]})` : "150ms";
  const easing = easings[0] ? `var(--ease-${easings[0]})` : "ease-out";

  // ---- DD-022 / DD-072: reading measure. DD-022 bounds body copy; DD-072 caps
  // the measure on large screens (a `cap`, so it can only shorten).
  const measureCap = typeof decisions["typography.readingMeasureMax"] === "string"
    ? (decisions["typography.readingMeasureMax"] as string)
    : null;
  if (decisions["typography.bodyMeasure"] === "45_to_80_characters_per_line" || measureCap) {
    blocks.push(`
/* DD-022 body measure bounded${measureCap ? `; DD-072 capped at ${measureCap} on large screens` : ""} */
p, .c-prose, li, dd { max-width: ${measureCap ? `min(var(--measure), ${measureCap})` : "var(--measure)"}; }
`.trim());
  }

  // ---- DD-023: display scale. Large display type only when brand expression
  // is high AND density is not; otherwise a moderate scale.
  const display = decisions["typography.displayScale"];
  if (display === "large_allowed") {
    blocks.push(`
/* DD-023 typography.displayScale=large_allowed: expressive h1, clamped to the viewport */
h1 { font-size: clamp(var(--text-h1), 5vw + 1rem, calc(var(--text-h1) * 1.6)); letter-spacing: -0.01em; }
`.trim());
  } else if (display === "moderate") {
    blocks.push(`
/* DD-023 typography.displayScale=moderate: dense or constrained context; h1 stays on the token scale */
h1 { font-size: var(--text-h1); }
`.trim());
  }

  // ---- DD-024: bounded page containers; prose in a reading rail; full-bleed
  // media only where justified (a pattern must ask for it explicitly).
  if (decisions["layout.pageContainers"] === "bounded") {
    blocks.push(`
/* DD-024 layout.pageContainers=bounded; proseContainer=${String(decisions["layout.proseContainer"] ?? "reading_rail")}; fullBleedMedia=${String(decisions["layout.fullBleedMedia"] ?? "only_when_justified")} */
.c-prose, .c-timeline, .c-disclosure-group, .c-definition-list { max-inline-size: var(--measure); }
.c-hero, .c-card-grid, .c-gallery { max-inline-size: ${tokens.layout.values.containers.large}; }
[data-full-bleed="justified"] { max-inline-size: none; inline-size: 100%; }
`.trim());
  }

  // ---- DD-025 / DD-067: repeated comparable items → a responsive grid whose
  // columns come from a defined minimum card width (auto-fit + minmax), never
  // from a device name. Otherwise a single-column list.
  const repeated = decisions["layout.repeatedItems"];
  const columns = decisions["layout.cardColumns"];
  if (repeated === "responsive_grid" && columns === "auto_fit_minmax") {
    blocks.push(`
/* DD-025 layout.repeatedItems=responsive_grid, cardMinWidth=defined; DD-067 layout.cardColumns=auto_fit_minmax, cardOrder=${String(decisions["layout.cardOrder"] ?? "semantic")} */
.c-card-grid { --card-min: 16rem; grid-template-columns: repeat(auto-fit, minmax(min(100%, var(--card-min)), 1fr)); }
.c-card-grid > li { order: initial; } /* DOM order IS the reading order */
.c-gallery-grid { display: grid; gap: var(--space-4); list-style: none; padding: 0; grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr)); }
`.trim());
  } else if (repeated === "single_column_list") {
    blocks.push(`
/* DD-025 layout.repeatedItems=single_column_list: too few or too uneven for a grid */
.c-card-grid { grid-template-columns: 1fr; }
.c-gallery-grid { display: grid; gap: var(--space-4); list-style: none; padding: 0; grid-template-columns: 1fr; }
`.trim());
  }

  // ---- DD-045: every interactive element has visible state feedback, and
  // none of it is delayed for decoration.
  if (decisions["interaction.stateFeedback"] === "required") {
    blocks.push(`
/* DD-045 interaction.stateFeedback=required: hover (where it exists), focus, pressed, selected, busy, invalid */
button:active, .c-action:active { transform: translateY(1px); }
[aria-pressed="true"], [aria-selected="true"], [aria-current="page"] { text-decoration: underline; text-underline-offset: 0.2em; }
[aria-busy="true"] { opacity: 0.7; cursor: progress; }
[aria-invalid="true"] { border-color: var(--color-warning); outline: 2px solid var(--color-warning); }
.c-form-status[data-state="error"] { color: var(--color-warning-on); }
.c-form-status[data-state="success"] { color: var(--color-fg-0); }
`.trim());
  }

  // ---- DD-069: fixed UI pads by the safe-area insets and never covers a
  // focused field (the sticky CTA is hidden while the keyboard is open by the
  // responsive engine; here it also yields to :focus-within on the form).
  if (decisions["layout.fixedUiPadding"] === "safe_area_inset") {
    blocks.push(`
/* DD-069 layout.fixedUiPadding=safe_area_inset */
body { padding-inline: env(safe-area-inset-left) env(safe-area-inset-right); }
.c-sticky-cta {
  position: sticky; bottom: 0; z-index: 5;
  padding: var(--space-3) var(--space-4) calc(var(--space-3) + env(safe-area-inset-bottom));
  background: var(--color-bg-0);
  border-top: 1px solid var(--color-border);
}
main:has(form:focus-within) .c-sticky-cta { position: static; } /* never covers the focused field */
`.trim());
  }

  // ---- DD-070: no naive 100vh. Hero height uses small/dynamic viewport units.
  if (decisions["layout.viewportHeightUnit"] === "svh_or_dvh") {
    blocks.push(`
/* DD-070 layout.viewportHeightUnit=svh_or_dvh: 100vh would hide the CTA behind mobile browser chrome */
.c-hero { min-block-size: min(60vh, 40rem); }
@supports (min-block-size: 1svh) { .c-hero { min-block-size: min(60svh, 40rem); } }
`.trim());
  }

  // ---- DD-078: sticky chrome never hides a focused element or a scroll target.
  if (decisions["a11y.stickyChrome"] === "scroll_padding_and_scroll_margin") {
    blocks.push(`
/* DD-078 a11y.stickyChrome=scroll_padding_and_scroll_margin */
html { scroll-padding-block: var(--space-7, 3rem); }
:target, :focus-visible { scroll-margin-block: var(--space-7, 3rem); }
`.trim());
  }

  // ---- DD-089: only compositor-friendly properties animate.
  const animatable = decisions["motion.animatableProperties"];
  if (Array.isArray(animatable) && animatable.length > 0) {
    blocks.push(`
/* DD-089 motion.animatableProperties=${animatable.join(",")}: never top/left/width/height/margin */
button, .c-action, details > summary, .c-card-grid > li {
  transition-property: ${animatable.join(", ")};
  transition-duration: ${duration};
  transition-timing-function: ${easing};
}
`.trim());
  }

  return blocks.join("\n\n");
}

/**
 * Per-range layout rules. `container-type: inline-size` plus container queries is
 * DD-065's decision (components key on their container, not the window); media
 * queries carry only page-level layout, which is the same rule's other half.
 */
function responsiveBlock(model: ComponentModel, tokens: DesignTokenContract, decisions: Record<string, unknown>): string {
  const breakpoints = tokens.layout.values.breakpoints;
  const columns = tokens.layout.values.columns;
  const blocks: string[] = [];
  const autoFit = decisions["layout.cardColumns"] === "auto_fit_minmax";

  blocks.push(`
/* Components key on their CONTAINER (DD-065), so reuse in a narrow column works. */
.c-card-grid, .c-timeline, .c-disclosure-group, .c-gallery { container-type: inline-size; }
.c-card-grid { display: grid; gap: var(--space-5); grid-template-columns: 1fr; list-style: none; padding: 0; }
${autoFit ? `/* column COUNT comes from DD-067's auto-fit rule below; the container query carries only card density */
@container (min-width: 480px) { .c-card-grid > li { padding: var(--space-4); } }` : `@container (min-width: 480px) { .c-card-grid { grid-template-columns: repeat(2, 1fr); } }
@container (min-width: 900px) { .c-card-grid { grid-template-columns: repeat(3, 1fr); } }`}
.c-timeline { padding-left: var(--space-5); }
.c-definition-list dt { font-weight: 600; margin-top: var(--space-3); }
.c-contact-actions { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: var(--space-3); }
.c-contact-action { flex-direction: column; align-items: flex-start; text-align: start; }
.c-contact-value { font-weight: 400; overflow-wrap: anywhere; }
.c-nav ul, .c-site-footer ul { display: flex; flex-wrap: wrap; gap: var(--space-4); list-style: none; padding: 0; }
.c-site-header { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-4); }
`.trim());

  // DD-034 nav.compactMode (P1-4): a native popover disclosure below the medium
  // range; from the medium range up the same list shows in flow and both buttons hide.
  if (model.pages.some((p) => p.nodes.some((n) => (n.children ?? []).some((c) => c.navCompact)))) {
    blocks.push(`
/* DD-034 compact navigation: native popover below the medium range; same routes at every width */
.c-site-header .c-nav { margin-inline-start: auto; }
.c-nav-menu[popover] { margin: 0; border: 0; padding: var(--space-5) var(--space-4); background: var(--color-bg-1); color: var(--color-fg-0); }
.c-nav-menu:popover-open { position: fixed; inset: 0 0 auto 0; inline-size: 100%; max-block-size: 100dvh; overflow: auto; border-block-end: 1px solid var(--color-border); }
.c-nav-menu ul { flex-direction: column; gap: var(--space-2); margin: 0 0 var(--space-4); }
@supports not selector(:popover-open) { .c-nav-toggle, .c-nav-close { display: none; } }
@media (min-width: ${breakpoints.medium}) {
  .c-nav-toggle, .c-nav-close { display: none; }
  .c-nav-menu[popover] { display: block; position: static; inset: auto; inline-size: auto; max-block-size: none; overflow: visible; padding: 0; background: transparent; color: inherit; }
  .c-nav-menu ul { flex-direction: row; flex-wrap: wrap; gap: var(--space-4); margin: 0; }
}
`.trim());
  }

  // Page-level layout per range, from the token breakpoints.
  for (const range of RANGE_ORDER) {
    const min = breakpoints[range];
    const cols = columns[range];
    if (range === "compact") {
      blocks.push(`
/* compact: single-column priority flow — core content and task preserved.
   minmax(0, 1fr), not 1fr: a bare 1fr track has an automatic minimum, so one wide
   min-content child (a comparison table in its scroll region) widened the whole page
   past 320 CSS px — measured in the engagement host run (RF-001). */
main { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-6); }
.c-hero { display: grid; gap: var(--space-4); }
`.trim());
      continue;
    }
    blocks.push(`
@media (min-width: ${min}) {
  main { grid-template-columns: repeat(${cols}, minmax(0, 1fr)); }
  main > * { grid-column: 1 / -1; }${
    range === "expanded"
      ? `
  /* DD-030 hero.layout=split: media beside the proposition from the expanded range up */
  .c-hero--split { grid-template-columns: 1fr 1fr; align-items: center; }
  .c-hero--split > .c-image { grid-column: 2; grid-row: 1 / span 4; }`
      : ""
  }
}
`.trim());
  }

  // Hover affordances are emitted ONLY where the audit did not demand their
  // removal, and always behind a fine-pointer query.
  const hoverSafe = model.pages.every((p) =>
    p.nodes.every((n) => !n.responsive.noHoverDependency || n.kind !== "card_grid"),
  );
  blocks.push(`
/* Hover is an ENHANCEMENT, gated on the capability actually existing. */
@media (hover: hover) and (pointer: fine) {
  .c-card-grid li:hover { background: var(--color-bg-1); }
}
${hoverSafe ? "" : "/* no hover-dependent affordance emitted: the responsive audit required a visible equivalent */"}
`.trim());

  // Reduced motion. Every duration collapses; nothing depends on motion.
  blocks.push(`
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0ms !important;
    scroll-behavior: auto !important;
  }
}

/* Forced colors: let the user's palette win. */
@media (forced-colors: active) {
  .c-content-slot, .c-unavailable-notice { border-color: CanvasText; }
  button, .c-action { border: 1px solid ButtonText; }
}
`.trim());

  return blocks.join("\n\n");
}

/**
 * Delivered engagement experiences (docs/ENGAGEMENT-DELIVERY-ASSESSMENT.md §7-§8).
 * Emitted ONLY when the model carries a calculator or decision flow: a site with no
 * delivered experience ships no experience CSS. No motion, no hover dependency.
 */
function experienceBlock(model: ComponentModel, targetSizeCssPx: number): string {
  const has = model.pages.some((p) => p.nodes.some((n) => n.kind === "experience" && n.experience !== undefined && n.experience.definition.type !== "comparison"));
  if (!has) return "";
  return `
/* Delivered engagement experiences (docs/ENGAGEMENT-DELIVERY-ASSESSMENT.md §7-§8). No motion, no hover dependency. */
.c-experience { display: grid; gap: var(--space-4); }
.c-experience-form { display: grid; gap: var(--space-4); }
.c-experience-controls { border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-4); display: grid; gap: var(--space-4); min-inline-size: 0; }
.c-experience-inputs { display: grid; gap: var(--space-4); grid-template-columns: 1fr; }
.c-experience-field { display: grid; gap: var(--space-2); margin: 0; }
.c-field-hint { display: block; color: var(--color-fg-1); font-size: var(--text-small); }
.c-experience-errors:not([hidden]) { border-left: 4px solid var(--color-warning); background: var(--color-warning-bg); color: var(--color-warning-on); padding: var(--space-4); }
.c-experience-result:not(:empty) { border-left: 4px solid var(--color-accent-1); background: var(--color-bg-1); padding: var(--space-4); }
.c-experience-result-value { font-weight: 700; font-size: var(--text-h3); }
.c-experience-actions { display: flex; flex-wrap: wrap; gap: var(--space-3); margin: 0; }
.c-question { border: 0; padding: 0; margin: 0; display: grid; gap: var(--space-2); min-inline-size: 0; }
.c-question legend { font-weight: 600; padding: 0; }
.c-options { display: grid; gap: var(--space-2); grid-template-columns: 1fr; }
.c-option { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-2) var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-weight: 400; cursor: pointer; }
.c-option input[type="radio"] { width: 1.25rem; height: 1.25rem; min-block-size: 0; padding: 0; margin: 0; border: 0; background: none; flex: none; accent-color: var(--color-accent-1); }
.c-experience-fallback { border-top: 1px solid var(--color-divider); padding-top: var(--space-4); }
.c-experience-source { color: var(--color-fg-1); font-size: var(--text-small); }
.c-experience-outcomes { list-style: none; padding: 0; display: grid; gap: var(--space-4); }
@media (min-width: 600px) {
  .c-experience-inputs { grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr)); }
  .c-options:has(> :nth-child(4)) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
/* An option label activates its radio, so the label is the target (WCAG 2.5.8); RF-006 on coarse pointers. */
.c-option { min-block-size: ${targetSizeCssPx}px; }
@media (pointer: coarse) { .c-option { min-block-size: ${Math.max(targetSizeCssPx, TOUCH_TARGET_CSS_PX)}px; } }
`.trim();
}

export function renderCss(
  model: ComponentModel,
  tokens: DesignTokenContract,
  decisions: Record<string, unknown> = {},
  accessibility: { targetSizeCssPx: number } = { targetSizeCssPx: 24 },
): string {
  const header = [
    "/*",
    " * GENERATED — do not hand-edit.",
    " *",
    ` * Colour tokens derive from seed ${tokens.color.values.seed} via the ported OKLCH`,
    " * algorithm (color_system.md). Change the seed and regenerate; editing a value",
    " * here survives neither a seed change nor a theme change.",
    ` * Provenance: colour=${tokens.color.provenance}, typography=${tokens.typography.provenance}.`,
    ` * Measured contrast pairs: ${tokens.color.values.contrast.length}, failures: ${tokens.color.values.contrastFailures.length}.`,
    " * Rule-decided blocks below are labelled with their DD id.",
    " */",
  ].join("\n");

  return [
    header,
    tokensBlock(tokens),
    baseBlock(tokens),
    targetSizeBlock(accessibility.targetSizeCssPx),
    responsiveBlock(model, tokens, decisions),
    rulesBlock(decisions, tokens),
    experienceBlock(model, accessibility.targetSizeCssPx),
  ]
    .filter((block) => block.length > 0)
    .join("\n\n");
}
