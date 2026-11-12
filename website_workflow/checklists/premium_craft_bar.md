# PREMIUM CRAFT BAR — is the page good, not merely correct?
<!-- website_workflow/checklists/premium_craft_bar.md
     Run at Phase 5 against SCREENSHOTS OF THE BUILT PAGE, never against the
     plan. Every other gate in this workflow asks "is it correct?" — claims
     true, contrast legal, layout unbroken. A page can pass all of them and
     still look like a template.
     Added 2026-11-12 via framework_update.md. Root cause: the pipeline's
     build of a product home page passed every gate and shipped nine
     sections of card grids around a static mockup. Nothing in the workflow
     looked at the finished page and asked whether it was any good.
     Each item is PASS / FAIL + fix, with the screenshot it was judged from.
     "Looks fine" is not an answer; name what you saw. -->

## HOW TO RUN IT — look, critique, fix, look again
1. Capture the built page: full-page at desktop, full-page at the narrowest
   mobile profile (responsive_matrix.md), plus the hero at first paint and
   mid-animation.
2. Read the screenshots as a first-time visitor from {ICP}, then answer the
   twelve items below.
3. Fix every FAIL and re-capture. Maximum three rounds. A FAIL that survives
   three rounds is reported in the review pack with the reason — never
   silently accepted, never hidden by lowering the bar.

## A. THE IDEA
1. CONCEPT VISUAL: the hero carries the visual from the VISUAL BRIEF
   (visual_concept.md), or the page records why it ships without one.
   Re-run the CAPTION-OFF test on the built screenshot, not on the plan.
2. ONE ARGUMENT: reading only the section headlines top to bottom gives the
   page's argument in order. A headline that could be deleted without
   breaking the argument marks a section to cut or merge.
3. PROOF PLACED: the real product appears where the visitor asks "is it
   real?" — and it is the real UI with labelled sample data, not an invented
   screen.

## B. COMPOSITION
4. HIERARCHY AT A SQUINT: blur the hero screenshot. Three things remain
   distinguishable, in this order: headline, visual, primary action.
5. SCALE CONTRAST: display type is clearly a different size class from body
   type, and the page uses a small fixed set of type sizes. Six near-equal
   sizes read as no hierarchy.
6. RHYTHM: no three consecutive sections share a layout skeleton, and a long
   page has at least one pattern interrupt (visual_concept.md PAGE STORY).
7. SPACE: sections breathe on the spacing scale; nothing is glued to its
   neighbour; no orphaned single word on a headline's last line at desktop.

## C. MOTION
8. ONE MOTION LANGUAGE: every animation on the page uses the same small set
   of durations and easings (animation_library.md MOTION TOKENS). Count the
   distinct values in the stylesheet; a page with nine easings fails.
9. MOTION HAS A JOB: every moving element states one of the five jobs, the
   hero loop pauses, and the reduced-motion screenshot shows a complete page.
10. FEEDBACK EVERYWHERE: every interactive element shows hover, focus and
    pressed states, and nothing interactive looks static.

## D. FINISH
11. NO FILLER: no lorem ipsum, no icon-plus-three-words cards standing in for
    content, no stock-photo look, no decorative element that fails
    interrogation Q1. Every icon is from one set at one stroke weight.
12. MOBILE IS DESIGNED: at the narrowest profile the concept visual is still
    present and still carries the idea, the primary action is in thumb
    reach, and nothing was merely stacked until it fit.

## VERDICT BLOCK
| # | Item | Verdict | Screenshot | Fix applied |
|---|---|---|---|---|
| 1-12 | | PASS / FAIL | | |
ROUNDS USED: n of 3.   OPEN FAILS (reported to the owner): <list or none>.
A page passes the bar with zero FAILs in sections A and C and at most one
open FAIL across B and D, named in the review pack. Section A and C failures
are never carried: they are the difference this file exists to catch.
