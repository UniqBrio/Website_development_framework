# WEBSITE REQUEST — NEW (section / page / element that doesn't exist yet)
<!-- Filled per /wrequest rules from the ONLY input received: two files. No rough description,
     brief or instruction from the restaurant exists, so almost every field is "unknown".
     /wrequest rule: "Use ONLY what I actually said. A field I didn't cover = unknown." -->

REQUEST ID: WEB-NEW-20260915-restaurant-website
DATE: 2026-09-15
REQUESTED BY: unknown — the files arrived through a first-level reviewer; the restaurant's requester is not identified (M-02)

## WHAT (one sentence)
unknown — no request text was supplied. Inferred scope for the dry run only: a website for Jalsa Restaurant using the supplied logo and menu.

## WHERE
Page(s): unknown (no pages requested)
New route needed?: unknown → the framework derives the page set (G1)

## WHY / VISITOR JOB
unknown — no objective or visitor job was stated (M-40, M-41)

## MUST-HAVE
- owner to trim at Gate 1 — nothing was stated as required

## EXPLICITLY OUT
- unknown

## CONTENT INPUTS
Copy source: none supplied; AI drafts only, held for approval (ai-drafts/)
Images:
- Logo — provided file `raw/jalsa-restaurant-logo.png` (150×150; authenticity unconfirmed — evidence/logo-inspection.md)
- Food / interior / exterior photographs — unknown (not mentioned in either file)
- No other visual is named in either source file
Data/claims source of truth: `raw/jalsa-restaurant-menu.docx`, headed "For design illustrations only" → `evidence/menu-source-extraction.json`, `evidence/fact-register.json`

## SUPABASE
Reads/writes data?: unknown → no form, booking or ordering was requested; the framework stack contains no Supabase
(Phase 3: N-A — see runs/…/00-winit-and-phase0.md)

## ARCHITECTURE
New dependency, rendering strategy, or default-deny category?: unknown
→ the menu document lists category and dietary FILTERS, which could imply client-side filtering. The outcome it would serve is unstated. Phase 2 dependency gate applies if any interaction is proposed.

## ENGAGEMENT & CONVERSION (optional — omit the section and the framework decides)
Choice: ○ Let the framework decide (default)
Visitor tasks the owner states: none stated
Who answers leads/bookings: unknown
Who keeps formulas, rules, prices or data current: unknown
Real booking availability (scheduling integration): unknown
Data that exists AND is verified: none (menu table present but unverified)
Possible requested idea (ambiguous): the menu document's "category filters" and "All / Veg / Non-Veg dietary filters"

## CONSTRAINTS
unknown

## STANDING INSTRUCTIONS (verbatim — do not edit)
Run website_workflow/website_flow.md on this file, all phases, all gates.
Question everything before creating: full interrogation (Q1–Q10) before any
code. No evidence, no pass at Gate 5. Unknown fields stay unknown until the
owner answers — never invent. Stay inside the blast radius named above.
