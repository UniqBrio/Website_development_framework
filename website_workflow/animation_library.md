# ANIMATION LIBRARY — motion patterns, selection rules, and the no-decoration gate
<!-- website_workflow/animation_library.md
     Governs WHICH motion pattern (if any) gets applied to an element —
     web-motion-implementation-director IMPLEMENTS; this file decides.
     Source: Prismic, "Tailwind CSS Animations" (https://prismic.io/blog/tailwind-animations),
     38 named examples fetched and catalogued 2026-08-24. Added 2026-08-24
     via framework_update.md (capability gap: nothing governed motion
     SELECTION — web-motion-implementation-director was mapped to
     "implement," with no file telling it which pattern to reach for, when
     one is warranted, or what job it must serve).
     Amended 2026-11-12 via framework_update.md: a fifth job (CONCEPT
     DEMONSTRATION), a per-site MOTION TIER, MOTION TOKENS, and categories
     9-10. Root cause: one global "default reject" posture filed a hero
     animation of the product's idea under ambient decoration, so the
     pipeline shipped a static mockup where a design tool shipped the idea
     in motion. The gate is not weaker — the new job carries its own proof
     (visual_concept.md's six tests). -->

## PRIME RULE — motion serves a job or it doesn't ship
Motion must earn its place (same discipline brand-character-mascot-designer
applies to "does this need a mascot"). Motion may serve exactly one of these
five jobs. Anything else is decoration and gets rejected, out loud, not
silently omitted:

1. **HIERARCHY** — draws the eye to what matters most, in the order it
   matters, without new elements or copy.
2. **INTERACTION FEEDBACK** — confirms an action registered (hover, focus,
   click, drag) before any server response could possibly return.
3. **STORYTELLING / STATE COMMUNICATION** — makes a state change (loading →
   loaded, collapsed → expanded, off-screen → on-screen) legible as it
   happens, not just before/after.
4. **LOADING / WAIT COMMUNICATION** — tells the visitor the system is
   working, not frozen, during a real wait.
5. **CONCEPT DEMONSTRATION** (added 2026-11-12) — shows the product's own
   verb happening to the product's own nouns, so a visitor understands what
   it does before reading (visual_concept.md). This is the engine's
   "sequence explanation" purpose (DD-046,
   src/design-intelligence/rules/component-rules.ts), which the first four
   jobs had no place for: a hero animation of the idea was being filed
   under category 8 "ambient" and rejected as decoration. It is NOT a
   licence for atmosphere. It has its own proof: the visual passed
   visual_concept.md's six tests, including MOTION EARNS (movement shows
   the verb; the frozen frame cannot) and STATIC FRAME (the frozen frame
   still carries the idea). Fail either and it is category 8 again.

Every animation added or reviewed states which job it serves in one
sentence. "It looks nice" / "it's more dynamic" / "competitors have motion
too" are not jobs — REJECT and say so.

## MOTION TIER — how much motion this site carries (derived, not chosen by taste)
Set once per site at Phase S, recorded as {MOTION_TIER} in site_profile.md,
and stated in every motion plan. Derive it from the audience and the
product, in this order — the FIRST row that matches caps the tier:
| Signal (from context / app_reality.md / the engine's direction rules) | Tier cap |
|---|---|
| The engine's contract caps `motion.cap` at minimal (regulated, clinical, legal, financial-advice, crisis or public-service contexts) | T1 |
| Audience is predominantly on low-end devices or slow networks, or the page's job is a form or a transaction | T1 |
| Professional services, B2B operations tools, anything bought by committee | T2 |
| A product, app or creative service whose value is an idea a visitor must GET quickly | T3 |
| Portfolio, launch or campaign page where the experience itself is the product | T4 — needs a stack_doctrine.md approval if it needs a library |
| Tier | What ships |
|---|---|
| T0 STILL | No motion beyond focus/hover feedback. Concept visual is the static frame. |
| T1 CALM | T0 + one-shot entrance reveals. Concept visual: static frame, or a single one-shot build that then rests. |
| T2 EXPRESSIVE | T1 + one looping concept visual in the hero + one scroll narrative. |
| T3 SIGNATURE | T2 + interactive concept visual (pointer/drag response), state-morphing mechanism section, purposeful micro-interactions throughout. |
| T4 IMMERSIVE | T3 + library-backed or 3D work. Default-deny until approved. |
The tier is a CAP, not a quota: every element still passes the JOB TEST. A
lower tier is always allowed; a higher one never is.
Prevents: one global posture for every site — a tax practice and a consumer
app were getting the same "default reject", so the app shipped flat.

## MOTION TOKENS — one motion language per page
Declare these once in the stylesheet and use nothing else:
`--motion-fast` (feedback, 120-200ms) · `--motion-base` (reveals and
toggles, 240-400ms) · `--motion-slow` (story beats, 600-900ms) ·
`--ease-out` (entrances) · `--ease-in-out` (state changes) · one stagger
step (40-80ms). A duration or easing written inline is the motion
equivalent of a hardcoded colour (premium_craft_bar.md item 8).

## SELECTION PROCEDURE
1. **JOB TEST**: does this element/interaction genuinely need motion for one
   of the five jobs above? If no → NO MOTION, stated explicitly in the
   plan/verdict, same as any other design decision (this is itself a
   decision, not an absence of one).
2. **IDENTIFY THE CATEGORY** below that matches the job.
3. **SCREEN THE LOCAL CATALOG FIRST** — categories 1-8 below cover the 38
   source patterns; 9-10 are this framework's own. Pick 1-3 candidates that fit the element and context.
4. **REFER TO SOURCE only if the local catalog has no fit** for this
   specific job/element — fetch prismic.io/blog/tailwind-animations (or a
   specific linked example page) live, following the SAME citation
   discipline as reference_site_analysis.md STEP 2: cite what was actually
   seen, never invent a pattern from a name alone. State which local
   categories were screened and found insufficient before going external —
   mirrors design_library.md's OPTION SELECTION FUNNEL (screen before you
   invent, don't silently skip what already exists).
5. **SPECIFY THE APPLICATION**, not just the pattern name:
   - Element: exact component/selector.
   - Trigger: load / hover / focus / scroll-into-view / click / state-change.
   - Timing: duration + easing (concrete numbers — "feels right" is not
     verifiable, same standard as decision_matrix.md's evidence rule).
   - Intensity: transform magnitude / opacity delta / distance — smallest
     value that still reads clearly.
6. **MANDATORY COMPANION CHECKS** (non-negotiable, every animation):
   - `prefers-reduced-motion` fallback: a static equivalent that loses no
     information (Q8 already requires this; this file is where the fallback
     gets DESIGNED, not just checked for).
   - Q-STATE-CONTRAST: if the motion changes a background/surface under
     text, contrast is verified in the SAME transition, not just start/end.
   - AMBIENT-MOTION CEILING: at most ONE continuous animation per viewport
     (a category-9 concept visual counts as that one — nothing else in its
     viewport loops) — the same accent-scarcity discipline this framework already
     applies to color, applied to motion. More than one = pick the strongest
     and cut the rest.
   - Performance: prefer `transform`/`opacity` only (compositor-thread,
     cheap on 3G-Android). A pattern requiring a JS library (e.g. Framer
     Motion) needs its own weight-budget line item, same as any other
     dependency.
7. **DECIDE, DON'T DEFAULT**: if 2+ genuinely different patterns could serve
   the same job on the same element (e.g. hover-scale vs. hover-reveal on a
   card), that's a real option set — score it with decision_matrix.md like
   any other design choice. A single obvious pattern for a well-defined job
   (e.g. a submit-button spinner) does not need a matrix — don't manufacture
   choice where none exists.

## LOCAL CATALOG — 38 source patterns sorted by job (not by implementation type)
Source for every pattern below: Prismic "Tailwind CSS Animations"
(https://prismic.io/blog/tailwind-animations), fetched 2026-08-24, unless a
different source is named.

### 1 — LOADING / PROCESSING (communicates "working," bounded, not decorative)
- **Spin** — `animate-spin` (Tailwind built-in). Continuous rotation, icon-
  scale. Cheap, compositor-only.
- **Pulse** — `animate-pulse` (Tailwind built-in). Fading opacity loop for
  skeleton placeholders.
- **Skeleton Loading Screens** — 4 variants; full-component placeholders
  that match the loaded layout's shape (prevents CLS on load).
- **Loading Spinner Buttons** — 4 spinner styles combined with a button,
  dark-mode aware.
- **Disabled Button + spinner** — button disables and shows a spinner on
  click; the canonical "submit" feedback pattern.
- **Spinning Icon Button** — minimal in-button spinner, low visual weight.
Use when: a real network/processing wait exists. Don't use when: the
response is effectively instant — a flash of a loading state is worse than
none (violates Q5's cognitive-load spirit). Default timing: continuous while
waiting, MUST resolve to a completed/error state — never an unbounded
spinner with no other feedback (ties to error-state-specialist's territory).

### 2 — ATTENTION / DRAW-EYE (used sparingly — competes with accent scarcity)
- **Ping** — `animate-ping` (Tailwind built-in). Fading pulse ring; notif-dot
  style single-point emphasis.
- **Bounce** — `animate-bounce` (Tailwind built-in). Vertical bounce for a
  CTA or icon.
- **Jumping Button Text** — wave-like per-letter jump; loading-adjacent, not
  a genuine attention cue on its own.
Use when: exactly one element per viewport needs to be found fast (e.g. a
new-notification dot) — this is the accent-scarcity rule applied to motion.
Don't use when: more than one element on screen would use this category —
pick the single most important one. Default: single-shot or ≤3 repeats,
NEVER an infinite loop — infinite attention-motion becomes wallpaper and
stops working as a cue (and fails the ambient-motion ceiling in STEP 6).

### 3 — HOVER FEEDBACK: BUTTONS (interaction-feedback job)
- **Buttons Scale** — `scale-105` on hover.
- **Buttons Hover** — 5 variant treatments (color shift, underline, icon
  shift, etc.).
- **Switching Button Text** — text swaps ("Hover me" → "Thank you!") with
  top/bottom borders connecting on hover.
Use when: any primary/secondary CTA needs a felt response to pointer
presence. Don't use when: touch-primary context with no hover state to
begin with — pair with an active/focus equivalent instead. Default timing:
150-250ms, ease-out, transform/opacity only.

### 4 — HOVER FEEDBACK: CARDS / IMAGES
- **Image Hovering** — image slides aside revealing a card underneath.
- **Empty State Card Icons** — cards "break apart," moving in separate
  directions on hover.
- **Image Opacity Effect** — image gradually clarifies (opacity ramp) on
  hover. Adjacent to design_library.md's REF-007 (grayscale-to-color
  reveal) — screen REF-007 FIRST for any persona/segment-card hover job;
  this entry is the lighter opacity-only cousin for cases that don't need a
  full desaturation treatment.
- **Mix-blend Mode Animation** — 4 images shift position using CSS blend
  modes.
- **Animated Tailwind Cards / Animated Image Cards** — general hover-
  triggered card treatments, various.
Use when: a card grid needs to signal "this one is interactive" or reward
exploration. Don't use when: the card IS the primary content (not a
secondary browse element) — motion there competes with reading. Default
timing: 150-250ms, ease-out; also runs on `:focus-within`, not hover alone
(same keyboard-parity requirement as REF-007).

### 5 — REVEAL / ENTRANCE (storytelling/hierarchy job — content arriving)
- **Text Reveal Animation** — click-triggered text appearance.
- **Typewriter Effect** — classic character-by-character reveal.
- **SVG wing stagger** (Sam Provenza) — sequential SVG part reveal.
- **SVG pen slide-in** ("Writing" icon) — hover-triggered stroke animation.
- **Collection of Fade Animations** — multiple fade-in variants.
- **Collection of Slide Animations** — multiple slide-in variants.
- **Collection of Zoom Animations** — multiple zoom-in variants.
- **Collection of Flip Animations** — multiple flip-in variants.
Use when: content enters the viewport and the ORDER of appearance itself
carries meaning (headline before proof before CTA). Don't use when: applied
uniformly to every section on scroll "because it looks polished" — that's
decoration wearing a hierarchy costume; each use must name what it's
sequencing and why. Default: IntersectionObserver-triggered (not per-pixel
scroll listeners), 200-400ms per element, ≤80ms stagger between siblings,
fires once (not on every scroll re-entry unless the content itself repeats).

### 6 — SCROLL-DRIVEN (storytelling job, tied to scroll position not time)
- **Sticky Full Page Slides** — scroll + parallax, sections snap into/out of
  view via sticky positioning. Directly the same mechanism as
  design_library.md's REF-005 (sticky scroll-stack cards) — screen REF-005
  first; this entry is the full-page-section-level version of the same
  technique.
Use when: a small number of sequential ideas benefit from staying "on stage"
while the page scrolls past them. Don't use when: content needs to be
skimmable/searchable — scroll-locked sections resist that. Default: tied to
scroll position, not a fixed duration; `prefers-reduced-motion` disables the
pin/parallax entirely and falls back to normal document flow (same fallback
REF-005 already specifies — do not diverge).

### 7 — INTERACTIVE TOGGLE (interaction-feedback + state-communication job)
- **Expanding Form** — input field expands to full length on click.
- **Disappearing Bird** — simple show/hide toggle on click.
- **Framer Motion + Tailwind Accordion** — toggle switches, React-driven.
- **Splitscreen Click Animation** — screen splits, clicked half dominates.
Use when: a user-triggered state change (expand/collapse, show/hide, select)
needs to read as continuous rather than an instant jump-cut. Don't use when:
the toggle is high-frequency (e.g. a filter list item) — motion there adds
latency to a repeated action; keep those instant. Default: 150-300ms; no
content loss or scroll-position jump across the transition.

### 8 — AMBIENT / DECORATIVE (HIGH SCRUTINY — default REJECT)
- **Tailwind Marquee** — continuous horizontal scroll, logo-wall style.
- **Counter-scrolling column marquee** — two or more VERTICAL tracks moving in
  opposing directions ("zipper"), optionally on an isometric tilt. Same
  category, same default REJECT; see design_library.md REF-013.
- **3D Box** — perpetual rotation.
- **Walking Boba** — humanoid character animation, continuous limb motion.
- **Bubble Background Animation** — continuously sliding background bubbles.
- **Tailwind Animations Demo** (colorful bubbles) — same ambient-background
  family.
- **"Coming Soon" Text** (×2) — flicker/blur/oscillating-background text
  effects.
This category fails the PRIME RULE by default — none of the five jobs is
usually being served; they're texture. REQUIRE an explicit, named reason
before using anything here, and even then: at most ONE per viewport (STEP 6
ceiling), transform-only, and `prefers-reduced-motion` must remove it
entirely (not slow it down).

**WCAG 2.2.2 (Pause, Stop, Hide) — a CONFORMANCE requirement, not advice.**
Any motion that starts automatically, runs longer than 5 seconds, and is
presented alongside other content MUST have a mechanism to pause, stop, or
hide it. Every auto-playing pattern in this category triggers it: marquees,
counter-scrolling columns, perpetual rotation, bubble backgrounds, looping
character motion.
- **Hover-pause does NOT satisfy 2.2.2.** Hover is unavailable to keyboard
  and touch users, so a hover-only pause leaves the requirement unmet for
  exactly the people it protects. It is a nice inspection affordance, never
  the compliance mechanism.
- The mechanism must be a real control: a visible, keyboard-reachable
  pause/play button with an accessible name and exposed state, or a
  site-level "reduce motion" toggle that genuinely stops it.
- `prefers-reduced-motion` is necessary but NOT sufficient — 2.2.2 applies to
  users who have not set that preference.
- Duplicated loop content (the cloned track that makes a marquee seamless)
  must be `aria-hidden` so screen readers do not read the set twice.
Unlike the logo-contrast rule (which WCAG exempts and this framework requires
anyway), this one is the reverse: WCAG requires it outright. An auto-playing
marquee with no pause control is a conformance failure, not a style choice. A CHARACTER animation (e.g. the "Walking Boba"
pattern, applied to a brand mascot) is NEVER improvised here — it routes
through brand-character-mascot-designer's own pose/emotion/motion rules
(§12 emotion budget, §16 hard role boundaries); this file only supplies the
generic technique, never the decision to animate the character or how.
Flicker/novelty text effects additionally need a Q9 (professional) pass —
default assumption is that they read as unprofessional for {SITE_NAME}'s
{ICP} unless proven otherwise.

### 9 — SIGNATURE CONCEPT VISUAL (concept-demonstration job — one per page)
The hero's picture of the idea, in motion: the product's nouns performing
the product's verb (visual_concept.md VISUAL BRIEF).
- **Object graph** — nodes and links drawn in SVG or 2D canvas; the verb
  travels along a link as a pulse, a state change or a label.
- **Story-beat loop** — 3-5 beats, each showing one step of the verb, total
  loop no longer than 20 seconds, resting on the static frame between loops.
- **Product-in-motion** — the real UI redrawn in HTML performing one task.
- **Pointer response** (T3+) — the visual answers drag or hover; it must
  also run untouched, and never capture page scroll.
Use when: tier is T2 or above AND the brief passed all six tests. Don't use
when: the brief failed MOTION EARNS (ship the static frame) or the tier cap
is T0/T1. Conditions, all mandatory: the rung-1 build contract in
asset_production.md (poster first, the script is never the LCP, tokens for colour,
stopped off-screen, text alternative); WCAG 2.2.2 pause control, because it
auto-plays past 5 seconds; `prefers-reduced-motion` renders the static
frame; it is the ONLY continuous animation in its viewport; exactly one per
page (DD-120's signature cap).
This is where a page spends its novelty. Nothing else on the page competes
with it.

### 10 — SCROLL NARRATIVE / STATE-MORPH (storytelling job — one per page)
One stage stays in view while the steps scroll past it, and the stage
CHANGES STATE to match the step in view: a card filling in, a screen
advancing, a diagram gaining a link. The "how it works" section's natural
form (design_library.md ALT-005b, ALT-003c; category 6 is the generic
mechanism).
Use when: 3-6 sequential steps explain a mechanism and the visitor benefits
from seeing the same object change. Don't use when: steps are parallel
features, not a sequence — use a grid. Default: `position: sticky` plus
IntersectionObserver on the steps (no scroll-jacking, native scroll speed
untouched — the engine forbids scroll hijacking, DD-119); state changes use
`--motion-base`; every state is reachable by keyboard and readable with
scripts off (all steps and their content are in the HTML in order);
`prefers-reduced-motion` swaps states without transition; below the tablet
breakpoint the stage un-pins and each step carries its own state.

## RECORDING A DECISION
- Single obvious pattern for a well-defined job: state element, job,
  pattern used (cite the category + source name), trigger/timing/intensity,
  and the reduced-motion fallback, directly in the Phase 2 plan or QA
  verdict. No separate log entry required for a routine, uncontested choice.
- 2+ genuine candidate patterns for the same job: score via
  decision_matrix.md, log winner + losers in decisions_log.md, same as any
  other design decision (see STEP 7 above).
- Ambient/decorative category used: always logged with the explicit reason
  and Q9 pass, regardless of whether a matrix was needed — this category
  gets no routine-choice exemption.
- Category 9 or 10 used: the VISUAL BRIEF (visual_concept.md STEP 6) is the
  record — its story beats, tier, poster frame and text alternative — and
  it is attached to the Phase 2 plan.
