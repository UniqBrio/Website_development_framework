# PHASE 1 — INTERROGATION

Request: WEB-NEW-20260914-practice-website · 2026-09-14 · checklists/interrogation_checklist.md

## Ordering note — recorded, not smoothed over
website_flow.md runs the interrogation at Phase 1 against the PROPOSED change, and the
decision engine at Phase 2 step 0. For a new site the engine is what proposes the page
model, sections and patterns — so a Phase 1 verdict written only from the request would
interrogate a proposal the engine then replaces. This record therefore interrogates the
request's element list AND, marked **[engine]**, the engine's page model produced at
Phase 2 step 0. The ordering is a framework seam finding.

## Skills (skills_map.md, Phase 1)
| Skill | Resolved |
|---|---|
| design-reviewer, spacing-grid-system, simplicity-auditor, existing-ui-consistency-checker, color-psychology-expert, accessibility-specialist | local fallback |
| **visual-hierarchy-expert, typography-expert** | **MISSING everywhere** — skills_map §Fallback step 3: STOP. Recorded stop condition; the type decisions below are therefore **AI judgment inside token constraints**, not skill-governed. |
| ui-ux-pro-max (rung 1, resource_registry R-01) | queried: style, color, typography, landing domains |

ui-ux-pro-max result, recorded because it conflicts with the framework: for financial and
legal services its first style is "Trust & Authority" — certification badges, metrics,
guarantees, testimonials. For this customer those are unverified or ICAI-restricted
(Phase S S3). The content engine and app_reality.md govern; the style recommendation is
**not adopted**. Its colour result ("Legal Services: navy + gold") is **not adopted** either:
a brand colour is an owner fact ({BRAND_SEED} UNRESOLVED), never picked from a catalogue.

## LIBRARY SCREENS (design_library.md OPTION SELECTION FUNNEL)
LIBRARY: **in play** — a new site with new sections.

### LIBRARY SCREEN — hero, job: tell a Pune small-business visitor, on a phone, what the practice does, for whom, and the next step
Screened: 52 entries (53 minus ALT-008a SUPERSEDED).
OUT:
REF-001 no real interior/product media, hero LCP slot · ALT-001a slot job is a product dashboard, no product UI · ALT-001b <3 views, not a hero job · ALT-001c pointer-only effect, touch-primary audience (brief) · ALT-001d <4 images · REF-002 / ALT-002a whole-site art direction, not a hero slot · REF-003, ALT-003a, ALT-003b, ALT-003c feature sections · REF-004 in-page nav · REF-005, ALT-005a feature runs · ALT-005b <3 permitted proof items · REF-006, ALT-006a, ALT-006b wide peer sets · REF-007, ALT-007a, ALT-007b persona/feature cards · REF-008, REF-009, REF-010, ALT-009a, ALT-010a token derivation · REF-011, ALT-011a, ALT-011b showcase runs · REF-012, ALT-012a, ALT-012b card grids · IDEA-001 touch-primary · IDEA-002 scrolling card runs · IDEA-003 no overlay layers in this hero · REF-013, ALT-013a, ALT-013b brand sets · REF-014, ALT-014a, ALT-014b feature cards · IDEA-004 feature sections · REF-015, ALT-015a navbar slot · REF-016, ALT-016a nothing to announce · REF-017 proof does not exist and is ICAI-restricted.
Eligible, ranked: IDEA-006, IDEA-005, ALT-017a, ALT-018a, REF-018.
Scored: A current state (engine hero: vertical, typography-led), B IDEA-006, C ALT-017a, D IDEA-005.
DEFERRED: ALT-018a, REF-018.

OPTION comparison [PROFILE A] — hero composition
| Criterion (wt) | A: engine hero (vertical, H1 + audience line + next step) | B: IDEA-006 element budget and first-fixation order | C: ALT-017a scope-honesty block | D: IDEA-005 fold budget |
|---|---|---|---|---|
| Conversion (35) | 3 — answers what and for whom; next step is a slot (no working action) | 4 — orders the same elements; local competitors' heroes lead with service + city (anbca, disytax) | 3 — honesty about scope helps, but not the first fixation | 3 — keeps the answer above the fold; adds nothing by itself |
| Psychology (25) | 3 | 4 — one idea first, then audience | 4 — trust without prohibited proof (ICAI, taxroutine.com) | 3 |
| Performance (15) | 5 | 5 | 5 | 5 |
| Effort/risk (15) | 5 — already generated | 4 | 3 — needs approved copy | 5 |
| Brand (10) | 3 | 4 | 3 | 3 |
| TOTAL /500 | 360 | **415** | 355 | 360 |

WINNER: B (IDEA-006) — but IDEA-006 and IDEA-005 are CONSTRAINTS on a hero, not
alternative heroes. The funnel scores them as competing options because it has no
"constraint" category. Recorded as a framework gap. Applied as: the engine's hero, ordered
by IDEA-006, checked against IDEA-005 at Phase 5.

### LIBRARY SCREEN — services, job: let the visitor find their service among five
Screened: 52. OUT: REF-001, ALT-001a–d hero patterns · REF-002, ALT-002a art direction · ALT-003b hover-dependent, touch-primary · ALT-003c no flagship story · REF-004 short page · REF-005 content must be scannable at a glance · ALT-005b no dominant claim · REF-006, ALT-006a content the visitor must see all of · REF-007, ALT-007a, ALT-007b no source illustrations · REF-008–010, ALT-009a, ALT-010a token derivation · REF-011, ALT-011a, ALT-011b showcase runs, conversion-critical · REF-012 touch-primary, no focus equivalent · IDEA-001 touch-primary · IDEA-002 engine motion cap is "minimal" · REF-013, ALT-013a brand sets · REF-014 no style lock · ALT-014b fewer than 3 illustrations · IDEA-004 the five services are not different in weight · REF-015, ALT-015a navbar · REF-016, ALT-016a announcements · REF-017, ALT-017a proof · REF-018, ALT-018a hero atmosphere · IDEA-005, IDEA-006 hero constraints.
Eligible, ranked: ALT-012a, REF-003, ALT-013b, ALT-005a, ALT-006b, ALT-014a, ALT-012b, IDEA-003.
Scored: A current state (engine card grid, auto-fit), B ALT-012a, C REF-003, D ALT-013b.
DEFERRED: ALT-005a, ALT-006b, ALT-014a, ALT-012b, IDEA-003.

OPTION comparison [PROFILE A] — services presentation
| Criterion (wt) | A: engine card grid (auto-fit, one card per offer) | B: ALT-012a elevation-only pop | C: REF-003 layered stacked cards | D: ALT-013b static bento |
|---|---|---|---|---|
| Conversion (35) | 4 — disytax's clear service grid is its strongest element (fetched) | 4 — same grid plus pointer feedback | 2 — stacking hides four of five services | 3 — uneven weight misrepresents equal services |
| Psychology (25) | 4 | 4 | 3 | 3 |
| Performance (15) | 5 | 5 | 3 | 5 |
| Effort/risk (15) | 5 | 4 | 2 | 4 |
| Brand (10) | 4 | 4 | 3 | 3 |
| TOTAL /500 | **430** | 415 | 250 | 345 |

WINNER: A (current state) — B is within the 5% band (3.5%) and loses the tie to the
cheaper option. FALSIFIER: evidence that pointer feedback measurably raises service-page clicks.

### LIBRARY SCREEN — trust, job: show this is a real, qualified practice without prohibited proof
Screened: 52. OUT: every entry except those below — slot job mismatch (heroes, feature runs,
token tools, navbars, announcements, card effects) · REF-017 proof does not exist and is
ICAI-restricted · ALT-005b fewer than 3 permitted proof items · REF-018, ALT-018a badges would
carry unbacked or restricted claims.
Eligible, ranked: ALT-017a.
Scored: A current state (engine "qualifications" section, a slot until particulars arrive), B ALT-017a.

OPTION comparison [PROFILE A] — trust slot
| Criterion (wt) | A: qualifications slot (permitted particulars when supplied) | B: ALT-017a scope-honesty block |
|---|---|---|
| Conversion (35) | 3 — empty until the owner supplies membership particulars | 3 |
| Psychology (25) | 4 — ICAI permits member particulars; nothing else is claimable (taxguru.in) | 4 |
| Performance (15) | 5 | 5 |
| Effort/risk (15) | 5 | 3 — needs approved copy |
| Brand (10) | 4 | 3 |
| TOTAL /500 | **395** | 355 |

WINNER: A. FALSIFIER: the owner supplies no particulars at all, leaving A permanently empty.

## INTERROGATION — Q1 to Q10

| Q | Verdict | Evidence / fix |
|---|---|---|
| Q1 Why this image? | N-A | no image ships: logo and photos not received (S4 DEFER); no generated image substitutes for them |
| Q2 Elements | **FAIL [engine]** | `/faq` receives sections proposition, qualifications, process — **no FAQ section**; `/contact` receives proposition, services, enquiry — **no contact section**; `/services` has the same sections as `/`. Page purpose does not reach section architecture. Fix needs a framework capability (page-purpose semantics) — see report gaps. |
| Q3 Positioning | PASS [engine] | one container system (`--measure`, token spacing); one CTA pattern; DD-032 orders proof before conversion |
| Q4 Correct and convincing | PASS | prohibited and unverified claims removed at S3; no raw colour (generated tokens only); grep at Phase 5 |
| Q5 UX outstanding | **FAIL [engine]** | no completable primary action: the enquiry form has no configured endpoint (correctly disabled) and the verified email is published only in a contact section that no page carries (Q2) |
| Q6 Image fine | N-A | no image |
| Q7 Space | deferred to Phase 5 | measured at 320 and 1920 in the responsive sweep |
| Q8 Performance and responsiveness | deferred to Phase 5 | must be tested, not judged |
| Q9 Professional | PASS, conditional | no hype, no urgency, ICAI overlay applied; legal pages missing (privacy, terms) → **required input** before launch |
| Q10 Easy phrases | **FAIL** | the proposition is a slot (no approved copy); page titles render "Faq" (route-label casing); service cards say "description to be supplied" for two offers |

## Named checks

| Check | Verdict | Evidence |
|---|---|---|
| Q-OPTION-SET | **FAIL** | the library screens above account for every entry — but the engine's pattern registry is a SECOND option catalogue: it selected `perspective-card` and `magnetic-action`, neither in the library, neither screened here, and neither rendered by the generator |
| Q-SKILL-VALIDATION | **FAIL** | 11 of 42 mapped skills exist nowhere (two in this phase); several resolving skills model a different business (academy owners, in-app SaaS) |
| Q-TEST-COVERAGE | pending | register created at Phase 2 |
| Q-DEGRADED-PATH | PASS (plan) | unconfigured endpoint, withheld contact methods, missing descriptions and missing assets each have one absence semantic; exercised at Phase 5 |
| Q-STACK-DISCIPLINE | **FAIL** | `react-hook-form` is declared for "contact_form" but no generated code uses it (forms are native HTML); the form's email backend is correctly DENIED |
| Q-SEO-ARTIFACTS | pending, with required input | canonical unresolved (host not stated); og:image unresolved (no asset); meta descriptions are AI briefs awaiting approval |
| Q-STATE-CONTRAST | deferred to Phase 5 | computed contrast table plus rendered-state audit |
| Q-MOTION-JUSTIFICATION | **FAIL [engine]** | `magnetic-action` and `perspective-card` were selected with no stated job under a "minimal" motion cap; neither renders, so no motion ships — the selection itself has no justification |

OVERALL: **REDESIGN** (any FAIL ⇒ REDESIGN). Four FAILs trace to framework capability or
authority, not to this customer's input.

**GATE 1 (owner) — CONCEPTUAL + DETAILED — PENDING.** The dry run continues to collect
evidence; nothing is approved.
