# RESPONSIVE SPEC

Implements specification section 11 and appendix F.

## Capability-aware, not device-labelled
`src/responsive/capabilities.ts` models viewport width, container width, pointer,
hover, reduced motion, reduced data, colour scheme, contrast preference, forced
colors, safe areas, keyboard visibility, foldable segments, orientation and zoom.
A fine-pointer 700px window and a coarse-pointer 700px tablet need different
affordances at the same width, which a width-only model cannot express.

`defaultCapabilities()` assumes **coarse pointer, no hover, 320px**. Assuming a
mouse is what produces hover-only interfaces, so the default assumes the harder
case and lets evidence relax it.

## Ranges (F.1)
compact < 600 - medium 600-839 - expanded 840-1199 - large 1200-1599 -
extra_large >= 1600. Starting ranges only: a component breakpoint is introduced
when CONTENT fails, never because a device label changed.

## Viewport vs container
Viewport queries for page layout; container queries for reusable components. A
component keyed to the viewport breaks the first time it is reused in a narrower
column. No device-model-specific breakpoints.

## Transformations
`remain scale reflow reorder condense expand simplify replace staticize defer hide`

`hide` is legal for decoration and **ILLEGAL for anything essential**.
`src/responsive/transformations.ts` REFUSES a declared `hide` on essential
content and reflows instead, recording the refusal. Essential kinds: proposition,
primary action, navigation destination, product detail, pricing, legal
disclosure, important evidence, accessibility control, contact route.

Notable derived behaviours:
- hover-dependent component with no hover: `replace` with a visible equivalent
- animated with reduced motion: `staticize`, losing no information
- heavy with reduced data: `defer`, but `simplify` when essential, because it
  must still arrive
- sticky CTA with the software keyboard open: `hide`, so it cannot cover the
  focused input

## Mandatory profiles (F.3)
`MANDATORY_TEST_PROFILES` encodes all of F.3 including 320 CSS px, 400% zoom,
landscape, narrow split window, coarse and fine pointer, reduced motion, safe
areas, software keyboard, reduced data and forced colors.

## Relationship to the markdown framework
`website_workflow/responsive_matrix.md` governs BROWSER-ENGINE coverage and the
RCA loop for a real failure (TIER 1 across chromium and webkit). This module
governs the DECISION about what a component does at a given capability. They are
complementary: this decides, that verifies.
