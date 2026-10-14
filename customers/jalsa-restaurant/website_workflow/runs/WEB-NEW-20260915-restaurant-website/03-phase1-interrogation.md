# PHASE 1 — INTERROGATION

Request: WEB-NEW-20260915-restaurant-website · 2026-09-15 · checklists/interrogation_checklist.md

Ordering note (recurs from the Ashvattha run): for a new site the engine proposes the page model at
Phase 2 step 0. This interrogation therefore judges the engine's proposal, marked **[engine]**.

## Skills
| Skill | Resolved |
|---|---|
| design-reviewer, simplicity-auditor, accessibility-specialist, color-psychology-expert | local fallback |
| visual-hierarchy-expert, typography-expert | MISSING everywhere — stop condition recorded; type decisions stay inside the token contract |
| ui-ux-pro-max (rung 1) | queried `restaurant menu --domain product` |

ui-ux-pro-max returned, for "Restaurant/Food Service":
- style: "Vibrant & Block-based + Motion-Driven";
- secondary styles: Claymorphism, Flat Design;
- pattern: "Hero-Centric Design + Conversion";
- colour: "Warm colors (Orange Red Brown) + appetizing imagery".

**Not adopted:** it is exactly the jump from "restaurant" to a restaurant template that this run
must not make.
- No imagery exists (visual_asset_quality = none).
- The motion cap is low.
- A brand colour is the restaurant's decision (A-05).
- A hero-centric page needs a proposition, which is not approved.

## LIBRARY SCREENS (design_library.md funnel) — LIBRARY: in play

### Screen 1 — hero slot, job: say this is Jalsa, what it serves, and what to do next
- **Screened:** 52 entries (ALT-008a superseded).
- **OUT:**
  - REF-001, ALT-001a-d: no interior/product media or images to browse.
  - REF-002/ALT-002a, REF-008..010, ALT-009a, ALT-010a: whole-site/token entries, not a hero slot.
  - REF-003..007 and alts: feature/card runs.
  - REF-011..013 and alts: showcase/marquee sets.
  - REF-014 and alts: feature cards.
  - IDEA-001/002/004: card effects.
  - REF-015/ALT-015a: navbar slot.
  - REF-016/ALT-016a: nothing to announce.
  - **REF-017: proof does not exist.**
  - REF-018/ALT-018a: badge text would need claims.
- **Eligible:** IDEA-006 (element budget), IDEA-005 (fold budget), ALT-017a (scope-honesty block).
- **Result [engine]:** no hero section is allocated on the derived page. The H1 is the business
  name at the top of the page, and there is no proposition slot (FD-09). The screen is recorded;
  **no hero is built**, so the matrix is not run. Scoring options for a slot that does not exist
  would be theatre. DEFERRED: all three eligible entries, until a proposition is approved.

### Screen 2 — repeated items (the menu), job: let a visitor scan what is served
- **Screened:** 52 entries.
- **OUT:**
  - REF-006/ALT-006a/b, REF-011/ALT-011a/b: horizontal tracks hide items the visitor must see all of.
  - REF-012/ALT-012a/b, IDEA-001/002: >8 cards and hover effects on touch-primary.
  - REF-003/ALT-003a/b/c, REF-005/ALT-005a/b: sticky/stacked cards for 49 items.
  - REF-013/ALT-013a: marquee.
  - REF-007/ALT-007a/b: persona cards.
  - REF-014/ALT-014a/b: line art would depict food.
  - IDEA-004 bento: items are not of different weight.
  - All hero/nav/token entries: wrong slot.
- **Eligible:** ALT-013b (static grid — "the honest Option A"), REF-004 (pill sub-nav, for category
  jumps on a long page).
- **Result [engine]:** a 49-card grid with no categories. REF-004 cannot apply, because categories
  do not reach the page (FD-04). DEFERRED: REF-004 until FD-04.

## VERDICT BLOCK (against the [engine] proposal)
| Q | Verdict | Evidence / fix |
|---|---|---|
| Q1 image | N-A | no image is rendered; the logo is refused (unverified) and no photograph exists (S4) |
| Q2 elements | **FAIL** | the "Services" section lists 49 dish names under a service heading, each with "description to be supplied", and no category grouping. Its job (scan the menu) is served poorly. Fix needs FD-04 (categories), FD-07 (vocabulary) and customer descriptions (M-26). |
| Q3 positioning | PASS | one container system; sections in the engine's order: location and contact, hours, services |
| Q4 correct | **FAIL** | the dish names come from a document marked "For design illustrations only"; not verified (A-02). Also Q-STATE-CONTRAST: every token pair passes (lowest 9.21:1 body, measured) |
| Q5 UX | **FAIL** | no next step exists: no address, phone or hours. A 49-item flat list on a phone has high scan cost. |
| Q6 image fine | N-A | no image |
| Q7 space | PASS (measured at Phase 5) | 320 px: no overflow |
| Q8 perf/responsive | PASS (measured at Phase 5) | see 06-phase5-qa-evidence.md |
| Q9 professional | **FAIL** | visible placeholders ("Hours to be supplied.", "Contact route unavailable until details are verified.", 49 × "description to be supplied") are honest, and cannot be shown publicly |
| Q10 phrases | **FAIL** | "Services" for a menu; the nav toggle "Menu" collides with the restaurant's menu (FD-07) |

OVERALL: **REDESIGN**, and redesign is blocked on customer input and framework defects, not on
design effort. The dry run continues to Phase 5 to gather evidence; no gate is approved.

- **Q-OPTION-SET:** screens present and complete (52/52). No matrix was run for slots whose content
  does not exist; recorded.
- **Q-SKILL-VALIDATION:** missing skills recorded. The ui-ux-pro-max result was recorded and not adopted.
- **Q-DEGRADED-PATH:** exercised on the real producer:
  - missing contact → unavailable notice;
  - missing hours → slot;
  - unverified logo → refused file and text wordmark;
  - unapproved drafts → held;
  - approved proposition → **generation throws** (FD-09).
- **Q-STACK-DISCIPLINE:** no dependency added. `motion` was proposed and not consumed, so not installed.
- **Q-SEO-ARTIFACTS:** answered at Phase 5 from served HTML.

**GATE 1 (owner) — CONCEPTUAL + DETAILED — PENDING.**
