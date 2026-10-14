# Approval register — Jalsa Restaurant

Three separate sections that must never be merged:
- **§A:** what only the restaurant (the final approver) can approve.
- **§B:** what the first-level reviewer can review.
- **§C:** assessments a person must perform.

Reviewer feedback in §B is recorded as **first_level_reviewer_feedback**. It never changes a §A
status. A §A item becomes APPROVED only with an approval record: who (a named person with
authority at the restaurant), when, and the exact value approved. That record is then added to
`../approved/` and the engine seam record in the same change.

## §A — CUSTOMER_APPROVAL_REQUIRED (final approver: the restaurant — not yet identified, M-02)

| ID | Item to approve | Exact value awaiting approval | Evidence | Status |
|---|---|---|---|---|
| A-01 | Business name as published | "Jalsa Restaurant" (site name, H1, `<title>`, Organization JSON-LD) | F-001 | PENDING |
| A-02 | The menu is real, current and may be published, despite "For design illustrations only" | the 52-row table | F-006, F-007 | PENDING |
| A-03 | Tagline use | "CELEBRATE EVERY BITE" as page copy (currently not used) | F-003 | PENDING |
| A-04 | Logo is official and usable; not AI-created or AI-altered | `raw/jalsa-restaurant-logo.png` (C2PA: "may have created or modified", origin unknown) | F-004 | PENDING |
| A-05 | Brand colour seed | none chosen; measured candidate `#7c1518` from the logo | F-005 | PENDING |
| A-06 | Theme mode | SINGLE-DARK (unchosen framework default) | token contract | PENDING |
| A-07 | Item names and spelling | 49 transcribed names, incl. Chettinadu/Chettinad, Chilly/Chilli | F-007, F-018 | PENDING |
| A-08 | Prices for publication | 52 prices; tax inclusion unknown; figures flagged in F-019 | F-008, F-019 | PENDING — FD-03 resolved 2026-09-16: a verified price now publishes, so approval plus per-value verification is all that is missing |
| A-09 | Website objective | `drive_footfall` (inference T9) | F-026 | PENDING |
| A-10 | Audience | none stated (T6) | F-027 | PENDING |
| A-11 | AI draft AD-01, proposition | "Jalsa Restaurant — Indian curries, Chinese dishes, biryani, starters, desserts and drinks." | ai-drafts AD-01 | PENDING — FD-09 resolved 2026-09-16: approving it now renders it, and an approved value with no renderer is a recorded publication blocker rather than a crash |
| A-12 | AI draft AD-02, home meta description | "Jalsa Restaurant menu: Indian curries, Chinese dishes, biryani, starters, combos, desserts and drinks." | ai-drafts AD-02 | PENDING |
| A-13 | Personality and design direction | "practical, local, immediate"; low-to-medium expression; text-led; no imagery | design-decision-record §4 | PENDING |
| A-14 | Page set | one derived page `/` | design-decision-record §6 | PENDING |
| A-15 | Whether menu filters are wanted; if so their categories and dietary values | filter list F-011, dietary F-012 | engagement-decision | PENDING |
| A-16 | Authorisation that these files were supplied by the restaurant for its website | — | F-022 | PENDING |

Framework-raised approvals from the pipeline (the same needs, in the engine's words):
- DD-098 to DD-105: proof, contact, pricing and AI-draft policies;
- canonical, og:image and sitemap unresolved;
- meta description approval;
- colour and typography token groups;
- the theme-mode problem;
- the rejected requested idea.

Full list: digest `evaluation.publicationRequirements` (24 entries; 29 after the 2026-09-16 re-run).

**2026-09-16 — A-02 now governs the whole menu.** Before the framework remediation, the 49 item
names were published although this approval was pending. They are no longer: the menu document is
marked "For design illustrations only", and a source restriction overrides verification, so every
name is withheld and the reason is recorded once per item in the integrity ledger. Nothing else
about §A changed — every item is still **PENDING**, no approver has been appointed (M-02), and I
remain a first-level reviewer only. **CUSTOMER_APPROVAL_REQUIRED.**

## §B — First-level reviewer (review, not approval)

The reviewer can check that the framework handled the material honestly. The reviewer cannot
approve business facts on the restaurant's behalf.

| ID | What the reviewer can review | Where | Question to answer |
|---|---|---|---|
| R-01 | Extraction fidelity | `evidence/menu-source-extraction.md` vs the .docx | Is every row, price and category verbatim? Is anything missing or altered? |
| R-02 | Refusals | `ai-drafts/ai-drafts.md` §refused; `missing/` | Did the framework refuse to infer everything it should have (dietary marks, hours, location, descriptions)? |
| R-03 | Withheld rows | T8; F-013 to F-015 | Is withholding rows 36/51/52 right, or should they be shown as partial? |
| R-04 | Industry classification | T2 | Is `local_business` the right prior for a restaurant, given the hospitality comparison? |
| R-05 | Objective inference | T9 | Is `drive_footfall` the right provisional objective to take to the restaurant? |
| R-06 | Filter interpretation | T16; engagement-decision | Is treating the filter list as a possible request reasonable? |
| R-07 | Logo provenance concern | `evidence/logo-inspection.md` | Should the C2PA finding be raised with the restaurant before anything else? |
| R-08 | AI draft wording | AD-01, AD-02 | Do the drafts overstate the source? (Reviewer may reject or revise; only the restaurant approves.) |
| R-09 | Design decisions | `decisions/design-decision-record.md` | Do the engine's decisions follow from the evidence? |
| R-10 | Missing-information list | `missing/missing-information-inventory.md` | Is it complete enough to send to the restaurant as a question list? |
| R-11 | Framework defects | report §20, §29; `docs/FRAMEWORK-REMEDIATION-IMPLEMENTATION-REPORT.md` | FD-01…FD-16 were all resolved on 2026-09-16 and the run repeated on unchanged facts. Do the fixes match what you see in the regenerated output? |
| R-12 | Generated output | `generated/static-site/index.html`, screenshots in `generated/host/evidence/screenshots/` | Does the page misrepresent anything? |

### Reviewer feedback log (first_level_reviewer_feedback)
| Date | Item | Feedback | Effect on §A |
|---|---|---|---|
| 2026-09-15 | context | "The logo and menu document are the supplied customer material for this dry run." "The logo may be used as a customer-supplied brand asset. The menu may be used as customer-supplied content." | none: recorded as reviewer context; the logo stays `provided_unverified` (A-04) and menu publication stays PENDING (A-02) |
| | | *(empty — awaiting the reviewer)* | |

## §C — HUMAN_ASSESSMENT_REQUIRED

| ID | Assessment | Why a machine cannot | Status |
|---|---|---|---|
| H-01 | Screen-reader pass (docs/SCREEN-READER-TESTING-STRATEGY.md matrix) | no documented screen-reader session exists | NOT PERFORMED |
| H-02 | Visual/brand assessment of the generated page against the restaurant's identity | taste and identity fit | NOT PERFORMED |
| H-03 | Confirmation that the restaurant authorised use of the files (A-16 evidence) | identity of the supplier | NOT PERFORMED |
| H-04 | Link purpose, plain language, visual presentation (WCAG 2.4.9, 3.1.5, 1.4.8) | host evidence marks these `human_assessment_required` | NOT PERFORMED |
| H-05 | Industry and objective transcription judgments (T2, T9) | judgment, recorded as inference | NOT PERFORMED (reviewer R-04/R-05) |
| H-06 | Real-device check (emulated profiles only were measured) | physical devices | NOT PERFORMED |
