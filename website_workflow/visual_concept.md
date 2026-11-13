# VISUAL CONCEPT — what the picture must SAY, before anyone picks a format
<!-- website_workflow/visual_concept.md
     Runs inside Phase S, BEFORE strategy_audit.md §S4 picks a format.
     §S4 answers "image, video or animation?". This file answers the earlier
     question nothing used to ask: "what idea should the visitor understand
     from the picture alone?"
     Added 2026-11-12 via framework_update.md. Root cause: the same product
     brief produced two home pages. The pipeline's hero was a static device
     mockup; a design tool's hero was an animated network of people
     connecting — a picture of the IDEA. No phase of this workflow derived a
     visual from the product's core idea, so the default (template 1, a
     dashboard mockup) won unopposed.
     Governing skills: saas-website-visual-storytelling-director (style and
     metaphor), hero-section-cro-specialist (5-second test, fold budget),
     scroll-engagement-pacing-designer (page rhythm),
     web-motion-implementation-director (technique and budgets). -->

## PRIME RULE — the hero shows the idea; the product shot proves it later
A visitor decides in about five seconds whether the page is for them. A
screenshot answers "what does it look like". A concept visual answers "what
does it do for me". Every NEW page with a hero gets a concept decision:
either a CONCEPT VISUAL that passes the tests in STEP 4, or a written line
saying why this page ships without one. Silence is not a decision.
The product shot is never dropped — it moves to the section whose job is
proof ("is it real?"), where it is stronger than in the hero.

## STEP 1 — CORE IDEA SENTENCE (one sentence, from the truth file)
Write: "For <who>, {SITE_NAME} turns <before> into <after> by <mechanism>."
Every word must be supported by app_reality.md or the owner's context. If the
sentence cannot be written, the context is too thin for a concept: record
the missing fact as an UNKNOWN and fall back to STEP 7's safe default. Never
invent the mechanism.

## STEP 2 — THE PRODUCT'S OWN NOUNS AND ITS ONE VERB
List the objects the product actually handles (3-6 nouns, the user's words,
not internal jargon) and the single transformation verb (connect, remember,
schedule, reconcile, deliver…). The concept visual is built from THESE
objects doing THIS verb. A visual built from anything else is decoration.

## STEP 3 — GENERATE CANDIDATES (minimum 3, from different families)
One candidate per family, at least three families:
| Family | What it shows | Wins when |
|---|---|---|
| A. PRODUCT IN MOTION | The real UI performing the verb | The UI itself is the differentiator and is legible at hero size |
| B. OBJECT GRAPH | The product's nouns as a living diagram (nodes, links, flow) with the verb happening between them | The value is a RELATIONSHIP between things (people, events, records, steps) |
| C. SPATIAL METAPHOR | A familiar shape carrying the idea (map, orbit, constellation, timeline, layers) | The idea is abstract and the product's nouns are not visual |
| D. BEFORE → AFTER | The mess resolving into the outcome | The enemy (the old way) is vivid and universally recognised |
| E. HUMAN MOMENT | The situation the product rescues, illustrated | The value is emotional and the audience must see themselves |
Family A (a product shot) is ALWAYS a candidate — it is decision_matrix.md's
Option A whenever the page has no hero visual yet.
An owner reference (a URL, a screenshot, another build) is a candidate too,
and goes through design_library.md's two-layer rule: record the REF, then
add at least one ALT that keeps its principle and fixes its weakest test.

## STEP 4 — THE SIX TESTS (each candidate, written answer per test)
1. CAPTION-OFF: cover the headline. Would a stranger from {ICP} name the
   product category, or the problem it solves, from the visual alone?
2. SWAP: put a different company's logo on it — a competitor, then a company
   in another industry. If the visual still works, it is generic. A rotating
   world map sells logistics, payments and telecoms equally; it is specific
   to none of them.
3. TRUTH: does it imply scale, reach, customers, features or outcomes beyond
   app_reality.md? People, names, companies and numbers inside the visual are
   SAMPLE DATA: mark them as illustrative on the page, and never present a
   drawn person as a customer.
4. PAIRING: the headline states the promise; the visual shows it happening.
   A visual that only repeats the headline's words, or tells a different
   story, fails.
5. STATIC FRAME: freeze it at its best frame. Does that single frame still
   carry the idea? This frame is the poster, the reduced-motion version, and
   the social-share image, so it must stand alone.
6. MOTION EARNS: what does movement add that the frozen frame cannot? The
   only acceptable answer is that it shows the VERB happening
   (animation_library.md job 5, CONCEPT DEMONSTRATION). If the honest answer
   is "it feels premium", ship the static frame.
A candidate failing test 1, 3 or 5 is OUT. Failing 2, 4 or 6 is a required
fix before scoring, not a disqualification.

## STEP 5 — SCORE AND DECLARE
Score the surviving candidates with decision_matrix.md PROFILE A. The
performance criterion is scored against the technique the candidate needs
(asset_production.md ladder; budgets in src/performance/budgets.ts), not
against a guess. Winner, losers and scores are logged like any other choice.

## STEP 6 — THE VISUAL BRIEF (the output; Phase 2 builds exactly this)
```
VISUAL BRIEF — <page> / <slot>
Core idea sentence:
Nouns / verb:
Winning candidate + family:        Losers + scores:
What the visitor sees first (the static frame):
STORY BEATS (if it moves): beat 1 … beat n, each = what changes, how long,
  and which part of the verb it shows. 3-5 beats; one loop <= 20 s.
Sample data shown (all illustrative, labelled on the page):
Placement + fold budget (design_library.md IDEA-005 / IDEA-006):
Mobile composition (what stays, what is cut — the idea must survive at 320):
Motion tier applied (animation_library.md MOTION TIER):
Archetype + spec file (STEP 6b):
Production rung + technique (asset_production.md):
Poster / reduced-motion frame:
Text alternative (one sentence a screen-reader user gets instead):
Pause control: yes — required when it auto-plays for more than 5 seconds
Six-test answers: 1 … 6
```

## STEP 6b — THE VISUAL SPEC (the brief as data — what the generator builds from)
The winning candidate is written as ONE small JSON file, and
`tools/build_concept_visual.py` turns it into the finished animation and all
its files. Nobody hand-codes a hero animation per product: the thinking is
in STEP 1-5, the spec records it, the tool renders it the same way every
time.
1. PICK THE ARCHETYPE from the idea, not from taste
   (`python website_workflow/tools/build_concept_visual.py --archetypes`):
   | The product's value is… | Family | Archetype | The verb is shown as |
   |---|---|---|---|
   | a RELATIONSHIP between things (people, accounts, suppliers, devices, records) | B | `object-graph` | a pulse travelling hub → group → item and landing as a kept state |
   | a PROCESS that used to need chasing (collect, approve, onboard, dispatch, remind) | B / A | `flow` | one item moving through the stages, each stage saying what the product does |
   | ORDER out of a mess the audience recognises (file, sort, reconcile, clean up) | D | `before-after` | scattered items resolving one by one into one ordered place |
   No archetype fits (a spatial metaphor, a human moment, the real UI in
   motion) → say so in the brief, hand-build on rung 1 for this run, and
   record the missing archetype via framework_update.md. Forcing an idea
   into the wrong archetype fails the SWAP test by construction.
2. FILL THE SPEC FROM THE CONTEXT. Every label in the frame comes from the
   spec, and every label in the spec comes from STEP 2's nouns and the
   owner's own words: the hub, groups and items; or the stages and their
   captions; or the mess items and the ordered rows. The copy on a stage or
   a card is a CLAIM about the product and is checked against
   app_reality.md like any other sentence on the page.
3. REQUIRED IN EVERY SPEC: `core_idea` (STEP 1's sentence), `alt` (the text
   alternative), `sample_data` declared `none` or `labelled` with its
   on-page note, and the brand `theme` (the site's token values). The tool
   refuses a spec whose text would be unreadable (it measures contrast), whose
   labels would not fit, or whose loop runs past 20 seconds.
4. Worked examples for three different products are in
   `tools/concept_visual/examples/`. Start from the nearest one.

## STEP 7 — SAFE DEFAULT when the context is too thin
No core idea sentence → no invented metaphor. Ship family A if a real
product screenshot exists, otherwise a typographic hero with a code-drawn
abstract mark that cannot be read as evidence (the engine's
`css_svg_typographic_visual` replacement, src/content/asset-policy.ts).
List what the owner must supply to unlock a real concept.

## PAGE STORY — the same question for every section below the hero
A page is one argument, not a stack of card grids.
1. SECTION JOBS, in the order a visitor's questions arise: What is it? →
   What is my problem? → How does it work? → Is it real? → Is it for me? →
   Can I trust it? → What now? One job per section; cut a section whose job
   an earlier one already did.
2. SECTION VISUAL MAP: for each section write its job and its visual kind —
   CONCEPT (the idea) · MECHANISM (a step-by-step that changes state) ·
   PRODUCT (real UI as proof) · EVIDENCE (numbers, quotes — only if real) ·
   TYPE-ONLY. Every non-TYPE-ONLY visual gets a one-line brief (what it
   shows, which rung makes it).
3. RHYTHM RULES (scroll-engagement-pacing-designer owns the detail):
   - Never three consecutive sections with the same layout skeleton. Three
     card grids in a row is the failure this rule names.
   - At least one PATTERN INTERRUPT on a long page: a change of surface,
     scale or direction that resets attention.
   - At most ONE signature moment per viewport, and one concept visual per
     page. The engine caps signature experiences (DD-120,
     src/design-intelligence/rules/component-rules.ts); this file does not
     raise that cap.
4. The "how it works" section is the natural home of a MECHANISM visual: one
   stage that changes state as the steps scroll past
   (design_library.md ALT-005b; animation_library.md category 10).

## WHAT THIS FILE DOES NOT DO
- It does not pick the file format — strategy_audit.md §S4 does, after this.
- It does not produce the asset — asset_production.md does.
- It does not relax a budget, a contrast rule or the truth file. A concept
  that only works by breaking one of those is the wrong concept.
- A brand character is not a concept visual: brand-character-mascot-designer
  still owns that decision and its GO / NO-GO gate.
