# ASSET PRODUCTION — who makes the file, and how it is checked
<!-- website_workflow/asset_production.md
     Runs at Phase 2 step 5 (plan) and Phase 4 (make). visual_concept.md
     decides WHAT the visual says; strategy_audit.md §S4 decides its FORMAT;
     this file decides WHO MAKES THE FILE and proves it is good enough.
     Added 2026-11-12 via framework_update.md. Root cause: skills_map.md
     recorded that image generation "produces PROMPTS, not files" and that
     the hand-off "is still not automatic". Every visual therefore ended as
     a prompt for the owner to render elsewhere, and a page built in one run
     shipped with whatever needed no rendering — a device mockup.
     Governing skills: web-illustration-asset-production-pipeline (format,
     weight, provenance), web-motion-implementation-director (technique,
     budgets), image-generation (prompt craft for rung 3). -->

## PRIME RULE — the run that plans a visual also produces it
A visual in the plan with no file at Gate 5 is a FAILED slot, not a
follow-up. Each slot names its rung below, and the lowest rung that can
carry the brief wins — lower rungs are lighter, theme-safe, and need nobody
outside the session.

## THE PRODUCTION LADDER
| Rung | Made by | Use for | Never for |
|---|---|---|---|
| 1 CODE-DRAWN | The session — concept visuals GENERATED from a spec by `tools/build_concept_visual.py`; everything else as HTML/CSS, inline SVG or 2D canvas | Concept visuals, object graphs, diagrams, icons, textures, flow graphics, product UI redrawn from the real app with sample data | Photographic realism; faces |
| 2 CAPTURED FROM CODE | `tools/capture_visual.mjs` renders a rung-1 visual in a headless browser | Poster / reduced-motion frame, social-share image, a looping WebM when a FILE is required (email, social, a host with no JS) | Anything rung 1 can serve live |
| 3 AI RASTER | `tools/generate_image.py` calling the configured image provider | Photographic or painterly scenes code cannot draw: an environment, an atmosphere, an object study | Product UI, logos, text-in-image, people presented as customers, anything a visitor could read as evidence |
| 4 OWNER-SUPPLIED | The owner | Real screenshots, real photos, the logo, real customer material | — (the only source of evidence-class imagery) |

## THE CONCEPT-VISUAL GENERATOR (rung 1's default — nobody hand-codes a hero)
`python website_workflow/tools/build_concept_visual.py <spec.json> --out <dir>`
takes the VISUAL SPEC (visual_concept.md STEP 6b) and writes, for any
product, from one source:
| File | What it is for |
|---|---|
| `<slot>.embed.html` + `concept_visual.js` | The LIVE animation to paste into the page. This is what the site ships. It already satisfies the build contract below. |
| `<slot>-poster.webp` / `.png` | The static frame: first paint, reduced motion, social share. |
| `<slot>.gif` | A real animated GIF — for email, social posts, chat, decks, store listings. |
| `<slot>.mp4` / `<slot>.webm` | Looping video for a host that cannot run the embed. |
| `<slot>.preview.html` | A standalone page to look at it. |
| `<slot>.provenance.json` | The record: spec hash, sizes, what was and was not produced. |
Every file is the same picture: each frame is computed from the spec and a
time, never screen-recorded, so the GIF cannot drift from the live visual.
- The tool REFUSES a bad spec (exit 1) and names why: no text alternative,
  undeclared sample data, a text/background pair below its contrast floor,
  a label too long for the frame, a loop over 20 seconds.
- Exit 5 is a designed outcome: the embed and preview are written but the
  exports are not, because the browser toolchain is missing. The manifest
  says which and why — a missing GIF is reported, never silently skipped.
- "GIF" in an owner request means "a small looping animation". The run
  ALWAYS produces the real .gif, and the SITE ships the live embed: for the
  same loop the embed is sharper, pauses, follows the theme, and weighs
  kilobytes where the GIF weighs megabytes (measured on the three shipped
  examples: GIF 0.7-2.0 MB, embed under 10 KB gzipped plus a 17-32 KB
  poster). A page that references a .gif fails `tools/audit_visuals.py`.
- Three archetypes ship today (`--archetypes`). An idea none of them fits is
  hand-built on rung 1 for that run and the gap is recorded — the generator
  grows by archetype, it is never bent to a wrong one.
- `--self-test` proves the validator catches each named defect; `--examples
  <dir>` builds the three worked examples end to end.

## RUNG 1 — CODE-DRAWN (the default for every concept visual)
Build contract, every item checkable in the built page — met by the
generator's output, and binding on anything hand-built:
1. ZERO NEW DEPENDENCIES by default: CSS, inline SVG, or 2D canvas. A motion
   or 3D library is a new dependency and needs stack_doctrine.md's gate.
2. COLOUR from L2 semantic tokens only, read at runtime (`getComputedStyle`
   for canvas). No literal colour inside the drawing code (color_system.md).
3. LCP IS NEVER THE SCRIPT: the largest paint is the headline or the poster
   frame, both in the HTML. MEASURE which one it is — a poster larger than
   the headline block IS the LCP element, and is then treated as the hero
   image: inside the hero image weight budget, sized, and prioritised
   (never lazy, never low priority). The visual's container reserves its
   box (no layout shift) and the drawing starts after first paint. Nothing
   in the hero waits for script.
   Prevents: assuming the headline is the LCP and deprioritising the poster
   that actually is — found on this rule's first run, where the poster
   measured as LCP while marked low priority.
4. POSTER FIRST: the static frame from the VISUAL BRIEF is in the HTML (an
   inline SVG or the rung-2 image). The animation replaces it when ready, so
   a failed or blocked script leaves a finished-looking hero, never a hole.
5. REDUCED MOTION renders the poster frame and nothing moves.
   `prefers-reduced-motion` is checked in script as well as CSS, because a
   canvas loop ignores a CSS rule.
6. PAUSE CONTROL: any loop running more than 5 seconds has a visible,
   keyboard-reachable pause/play button with an accessible name and exposed
   state (WCAG 2.2.2; animation_library.md).
7. OFF-SCREEN = STOPPED: the loop stops when the visual leaves the viewport
   or the tab is hidden. An animation burning battery under the fold is a
   performance defect.
8. TEXT ALTERNATIVE: `role="img"` plus the brief's one-sentence alternative,
   or `aria-hidden="true"` when adjacent copy already says everything.
9. MOBILE COMPOSITION from the brief is implemented, not improvised: the
   idea survives at the narrowest profile in responsive_matrix.md.
10. SAMPLE DATA is labelled illustrative on the page (app_reality.md).
11. MARKERS: the visual's root element carries `data-visual="<slot>"` and
    `data-rung="1"`; a pause button carries `data-motion-control`. These are
    what `tools/audit_visuals.py` reads.

## RUNG 2 — CAPTURED FROM CODE
`node website_workflow/tools/capture_visual.mjs --url <page> --selector
<css> --out <dir> [--poster-at <ms>] [--loop <seconds>]` writes a PNG poster
(convert to WebP/AVIF in the site's image pipeline) and, with `--loop`, a
WebM. The capture is of the SHIPPED visual, so poster and animation cannot
drift apart. Record the command in the provenance record.

## RUNG 3 — AI RASTER
`python website_workflow/tools/generate_image.py --prompt-file <file> --out
<path>` reads the provider and key from the environment
({IMAGE_PROVIDER} in site_profile.md names the provider; the KEY is never
written to any file). It writes the image plus a provenance JSON beside it.
- The prompt is built from image_prompts.md (BASE STYLE BLOCK + template +
  NEGATIVE RULES) — never improvised.
- NO KEY CONFIGURED is a designed outcome, not an error to hide: the tool
  exits with status 3 and prints the finished prompt. The slot then falls
  DOWN the ladder to a rung-1 visual for this release, and the prompt goes
  into the review pack as an owner option. A slot may not ship empty, and a
  placeholder may not pose as the finished asset (degraded_paths.md).
- Generate 3 candidates when the provider allows; a render is a candidate,
  never a commit.

## SELF-CURATION — the session looks at what it made
A file existing proves nothing about how it looks. For every produced
visual, in every rung:
1. RENDER it in the built page and SCREENSHOT it at desktop and at the
   narrowest mobile profile. For motion, capture at least three moments:
   first paint, mid-story, and the reduced-motion frame.
2. LOOK at the screenshots and answer, in writing, against the VISUAL BRIEF:
   does the frame carry the idea (test 5)? Is the story order readable? Does
   any text collide, clip or drop below contrast? Is the composition
   balanced against the headline? Does mobile keep the idea?
3. FIX and re-render. At most three rounds; a visual still failing after
   three goes back to visual_concept.md STEP 5 for the next-best candidate —
   polishing a wrong concept is not progress.
4. Record the final screenshots as Gate 5 evidence.
Rung 3 adds: reject any candidate with malformed anatomy, garbled text,
off-palette colour, or a likeness of a real person.
This replaces "the owner curates every render" as the DEFAULT. The owner
still sees every shipped visual in the final review and can reject it.

## PROVENANCE RECORD (one per shipped visual — untraceable = FAIL)
Kept in the site's decisions_log.md or beside the asset as
`<name>.provenance.json`:
slot · rung · technique or tool + version · the prompt or the capture
command · source inputs (which real screenshots, which sample data) ·
licence · weight on disk · alt-text decision · date · the VISUAL BRIEF it
implements.

## WEIGHT AND RUNTIME BUDGETS
Numbers live where README rule 9 puts them: src/performance/budgets.ts for
Web Vitals and route JavaScript, the Q8 block of
checklists/interrogation_checklist.md for image weight. This file adds no
new numbers; a rung-1 visual's script counts against the route JavaScript
budget and is measured at Gate 5 like any other code.

## GATE 5 EVIDENCE (checklists/qa_evidence_gate.md §7)
`python website_workflow/tools/audit_visuals.py <built html or folder>`
passes, the self-curation screenshots are attached, each shipped visual
has its provenance record, and for a generated concept visual the builder's
manifest lists every export with nothing under "not produced" — or names
what is missing and why.
