# AUTOPILOT — context in, finished site out, ONE owner review
<!-- website_workflow/autopilot.md
     A RUN MODE of website_flow.md, started by /wcreate. Every phase and
     every check still runs. What changes is who adjudicates the gates in
     between: the run does, in writing, and the owner reviews once at the
     end with everything on the table.
     Added 2026-11-12 via framework_update.md. Root cause: /website refused
     to start without a filled request file and then stopped at up to seven
     owner gates. An owner who wanted to hand over context and get a site
     back could not; the alternative they reached for had no gates at all.
     One informed review of a finished thing was judged better than seven
     approvals of plans. -->

## WHEN IT APPLIES
- /wcreate with raw context → AUTOPILOT (this file).
- /website with a filled request file → GATED mode, unchanged
  (website_flow.md). Use it for a live site where each step must be
  approved before it happens.
Autopilot is for building something new to the point of a reviewable
preview. It never promotes to production: release is what the one review
approves.

## STEP 1 — CONTEXT INTAKE (replaces the filled request file)
Read EVERYTHING the owner supplied: text, attached files, screenshots, URLs,
earlier builds. Then write templates/context_brief.md to
website_workflow/requests/, filling every field from the owner's material.
- A field the material does not cover is UNKNOWN. An unknown is never
  filled with a plausible guess (website_flow.md STANDING INSTRUCTIONS).
- If app_reality.md does not exist yet, draft it FROM the context: every
  feature, number and claim the owner actually stated, each marked
  owner-stated. It is confirmed at the final review.
- A reference URL goes through reference_site_analysis.md with the scope
  the owner's words imply. An unreachable URL is recorded as unreachable —
  never described from memory.
- No site_profile.md yet → derive the tokens the context supplies, generate
  the palette (color_system.md), and list every token that had to be
  assumed.

## STEP 2 — THE UNKNOWN LADDER (how a run proceeds without stopping)
For each UNKNOWN, take the first rung that applies:
1. DERIVABLE from supplied material or from research → derive it, cite the
   source.
2. DESIGN CHOICE (layout, visual concept, motion, wording) → decide it by
   the framework (decision_matrix.md, visual_concept.md) and log it as
   DECIDED ON YOUR BEHALF.
3. FACT about the business (a price, a customer count, a feature, a legal
   entity, a contact detail) → never invented. Build the page so it is
   complete WITHOUT the fact — omit the claim or the section — and list it
   under NEEDS YOU in the review pack.
4. BLOCKER — the page cannot exist without it (no product name, no idea
   what the product does) → ask the owner ONE question, then continue.
   This is the only reason an autopilot run stops early.

## STEP 3 — RUN EVERY PHASE; SELF-ADJUDICATE EVERY GATE
Phases 0, S, 1, 2, 3 (if triggered), 4 and 5 run as website_flow.md writes
them, including research, the decision matrix, the interrogation, the test
register and all Phase 5 evidence. At each gate the run writes one line into
the GATE LEDGER instead of waiting:

| Gate | Verdict | Evidence it rests on | Decided on the owner's behalf |
|---|---|---|---|
| 0 | scope + classification | … | … |
| S | strategy verdict + visual brief | … | … |
| 1 | interrogation verdict | … | … |
| 2 | plan + register traceability | … | … |
| 3 | Supabase review (if run) | … | … |
| 5 | QA evidence + craft bar | … | … |

Rules of self-adjudication:
- A gate may be PASSED by the run only on evidence the gate already asks
  for. A gate whose evidence is missing is FAILED and the run loops back,
  exactly as in gated mode. Autopilot removes the waiting, never the proof.
- The run may never lower a gate's review depth, skip a check because no
  one is watching, or mark an unrun check as passed
  (qa_workflow.md §6: overclaiming coverage is itself a gate failure).
- A FAIL the run cannot fix in three attempts is carried into the review
  pack as OPEN, with what was tried.

## STEP 4 — WHAT AUTOPILOT NEVER DOES WITHOUT THE OWNER
These are not approvals to streamline; they are actions that cannot be
taken back, or facts only the owner has:
- Promote or deploy to production, or change DNS.
- Apply a migration or write data to a production database.
- Add a paid service, or a default-deny architecture category
  (stack_doctrine.md) — it may be PROPOSED in the review pack, scored.
- Publish a claim that is not in the context or app_reality.md.
- Use a real person's name, likeness, logo or testimonial that the owner
  did not supply with permission.
- Spend against an image provider beyond the slots in the approved plan.

## STEP 5 — THE REVIEW PACK (the one gate; review depth: EVIDENCE)
Written to website_workflow/runs/<request id>/review_pack.md and shown to
the owner. It leads with what they need to decide, in this order:
1. PREVIEW — where to see the built site, plus desktop and mobile
   screenshots of every page, and the hero concept animation as the files
   the generator exported: the GIF to look at here, the MP4/WebM, the
   poster, and the path of the live embed.
2. THE IDEA — the core idea sentence, the winning visual concept, and the
   candidates it beat (visual_concept.md STEP 5 table).
3. NEEDS YOU — every business fact that was unknown and what the page does
   in its absence. Each item is a question the owner can answer in a line.
4. DECIDED ON YOUR BEHALF — every design and strategy choice the ledger
   recorded, each with its one-line reason, so any of them can be reversed.
5. EVIDENCE — the Phase 5 results as measured: responsive matrix, tests,
   performance, accessibility, the visual audit, the premium craft bar
   verdict, and anything NOT covered.
6. OPEN ITEMS — failed checks that survived, and proposals that need
   approval (dependencies, AI-raster options, follow-up pages).
The owner answers once: APPROVE (→ Phase 6 release, gated as written),
CHANGE (a list → one correction pass, then the pack is re-issued), or
REJECT THE CONCEPT (→ back to visual_concept.md STEP 5, next candidate).

## WHY THIS IS SAFE ENOUGH
Every decision is written down with its evidence and is reversible until
the review; the irreversible actions in STEP 4 stay behind the owner. What
autopilot gives up is early course-correction: a concept the owner dislikes
is found after it is built. The pack puts the concept second for that
reason, and REJECT THE CONCEPT has a defined path.
