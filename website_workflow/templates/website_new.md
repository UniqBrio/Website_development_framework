# WEBSITE REQUEST — NEW (section / page / element that doesn't exist yet)
<!-- Filled by /wrequest. Run with: /website website_workflow/requests/<this file> -->

REQUEST ID: WEB-NEW-<yyyymmdd>-<slug>
DATE:
REQUESTED BY:

## WHAT (one sentence)
<what should exist that doesn't>

## WHERE
Page(s): <e.g. app/page.tsx landing — between Features and Pricing>
New route needed?: yes/no → <path>

## WHY / VISITOR JOB
<what visitor question or objection this answers; expected action after seeing it>

## MUST-HAVE
- <only what the owner actually said; otherwise "owner to trim at Gate 1">

## EXPLICITLY OUT
- <or "unknown">

## CONTENT INPUTS
Copy source: <owner-provided / to be drafted at Phase 2>
Images: <EVERY image/visual named anywhere in this request's source material — owner words AND any cited plan/spec document — one line each: provided file / to-be-generated (cite the doc section calling for it) / unknown / deliberately cut (say why). A source document's own image-prompt section is read in full and enumerated here, never summarized to "see attached".>
Data/claims source of truth: <lib/brand.ts, promo.ts, owner figures…>

## SUPABASE
Reads/writes data?: yes/no/unknown → <tables/routes if known>
(If yes or unknown: Phase 3 supabase_review.md is mandatory.)

## ARCHITECTURE
New dependency, rendering strategy, or default-deny category?: yes/no/unknown
→ <which one, and the OUTCOME it is meant to serve — not the technology>
(Judged by outcome, not wording: "works offline" = service worker, "I want to
edit the text myself" = CMS. If yes or unknown: stack_doctrine.md's DEPENDENCY
GATE + a decision_matrix.md PROFILE B table against "do not add it" run at
Phase 2, and the material stays DENIED until the owner approves it.)

## ENGAGEMENT & CONVERSION (optional — omit the section and the framework decides)
Choice: <one of>
  ○ Let the framework decide            (default)
  ○ Choose from recommended opportunities
  ○ I have a specific idea: <category from src/engagement/vocabulary.ts> — why: <owner's words>
  ○ No interactive experience
Visitor tasks the owner states: <e.g. "compare plans", "check eligibility" — or "none stated">
Who answers leads/bookings: <name/role — or "unknown">
Who keeps formulas, rules, prices or data current: <name/role — or "unknown">
Real booking availability (scheduling integration): yes/no/unknown
Data that exists AND is verified: <formulas / decision rules / comparison data / specs / price ranges / datasets — or "none">
(Recorded into `BusinessInput.engagement` and the content inventory. A specific
idea runs the same eleven hard gates as any candidate and is not accepted
because it was requested; a game needs a documented causal path to a business,
learning or repeated-behaviour outcome. "No interactive experience" is respected;
a conflict with a stated requirement is flagged for the owner, never overridden.
NO_EXPERIENCE is a successful outcome. docs/ENGAGEMENT-ARCHITECTURE-ASSESSMENT.md.)

## CONSTRAINTS
<deadline, brand rules, things it must match — or "unknown">

## STANDING INSTRUCTIONS (verbatim — do not edit)
Run website_workflow/website_flow.md on this file, all phases, all gates.
Question everything before creating: full interrogation (Q1–Q10) before any
code. No evidence, no pass at Gate 5. Unknown fields stay unknown until the
owner answers — never invent. Stay inside the blast radius named above.
