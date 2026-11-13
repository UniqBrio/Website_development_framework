---
name: "source-command-wcreate"
description: "Migrated source command `wcreate`"
---

# source-command-wcreate

Use this skill when the user asks to run the migrated source command `wcreate`.

## Command Template

# WEBSITE CREATE — context in, finished site out, one review
<!-- Save as: /.Codex/commands/wcreate.md -->
<!-- Usage: /wcreate <everything you know about the product, however rough —
     text, attached files, screenshots, reference URLs, earlier builds> -->

You are the AUTOPILOT runner for the {SITE_NAME} website pipeline. My
context follows this prompt. I am NOT going to fill a request file or
approve intermediate gates. Take the context, run the whole pipeline, and
come back once with a finished, reviewable site and the evidence.

## Steps
1. Read website_workflow/autopilot.md and follow it exactly. It is a run
   mode of website_workflow/website_flow.md: every phase and every check
   still runs; you adjudicate the gates in writing (the GATE LEDGER) and I
   review once at the end.
2. CONTEXT INTAKE: read everything I supplied, then write
   website_workflow/templates/context_brief.md, filled, to
   website_workflow/requests/. A fact I did not give is UNKNOWN — handle it
   with autopilot.md's UNKNOWN LADDER; never guess a business fact.
3. THE IDEA FIRST: run website_workflow/visual_concept.md before choosing
   any media format. The hero gets a concept visual that passes its six
   tests, or a written reason it ships without one.
4. MAKE THE ASSETS: every visual in the plan is produced in this run per
   website_workflow/asset_production.md. The hero's concept animation is
   GENERATED: write its VISUAL SPEC from my context (visual_concept.md STEP
   6b — archetype chosen from the idea, every label from my own words), run
   `python website_workflow/tools/build_concept_visual.py <spec> --out <dir>`,
   put the live embed on the page, and hand me the GIF and video it exports.
   AI raster only where the ladder allows and a provider is configured. A
   visual that exists only as a prompt is a failed slot.
5. LOOK AT YOUR OWN WORK: screenshot the built pages and run
   website_workflow/checklists/premium_craft_bar.md — critique, fix,
   re-capture, at most three rounds — alongside the full Phase 5 evidence.
6. STOP ONCE, with the REVIEW PACK (autopilot.md STEP 5): preview, the idea,
   what needs me, what you decided on my behalf, the evidence, open items.
   Wait for APPROVE / CHANGE / REJECT THE CONCEPT.

## Never, without me
Deploy or promote to production · apply a production migration · add a paid
service or a default-deny architecture category · publish a claim I did not
supply · use a real person's name, likeness, logo or testimonial I did not
supply with permission (autopilot.md STEP 4).

## If the context is not enough
Only a true blocker — you cannot tell what the product is or what it is
called — earns ONE question before you continue. Everything else is handled
by the UNKNOWN LADDER and reported in the review pack.

If I gave you a single correction or a bug on a live site instead of
context for something new → tell me to run /wrequest then /website.
If I gave you a dilemma with no clear action → tell me to run /brainstorm.
