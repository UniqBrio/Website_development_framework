# PHASE S — STRATEGY AUDIT

Request: WEB-NEW-20260915-restaurant-website · 2026-09-15 · strategy_audit.md

## Skills
| Skill | Resolved | Fit |
|---|---|---|
| market-research-specialist, jobs-to-be-done-expert | local fallback | method applied |
| competitive-research-specialist | MISSING everywhere | recorded stop condition (as in the Ashvattha run) |
| local-seo-specialist-india | project skill | **not applied**: it presumes an India location and UniqBrio's product; the restaurant's country is unknown |
| academy-owner-psychology-expert, conversion-ux-specialist, customer-trust-expert | local fallback | UniqBrio/SaaS-scoped; only generic honesty principles apply |
| any restaurant, menu or food-service skill | **none exists** in skills_map.md | lesson L-05 |

## Research captured this run (general practice only — nothing about Jalsa was searched)
A web search for "Jalsa Restaurant" was deliberately **not** made:
- the name is not unique and no location is known, so a result could not be tied to this business;
- importing web facts would bypass the customer's own evidence.

| Source | Finding |
|---|---|
| restaurantdive.com (Toast survey, 1,101 US adults) | 77-80%+ of diners check a restaurant's website before visiting; menu items are the biggest factor; menu, location, hours and ordering/reservation information are what they look for |
| boia.org ("Why PDF menus are a problem for accessibility"; "5 tips") | menus should be HTML with headings per section, not PDFs or images; screen readers cannot read image menus; HTML reflows on phones |
| petpooja, eresto, foodlabelsolutions (secondary summaries of FSSAI Labelling and Display Regulations 2020) | in India, veg/non-veg marks per dish are required on menus for some food businesses (central licence or 10+ outlets), with allergen and calorie display for those; **not the regulator's text; applicability to Jalsa unknown** |

## S1 — POSITIONING VERIFICATION
Current state: no website known; no positioning statement exists.
Visitor job (JTBD, general): "When I am deciding where to eat, I want to see what a place serves, where it is and when it is open, so I can decide quickly."
That job is research-backed in general. It is not evidence about Jalsa's visitors.

OPTION comparison [PROFILE A] — core positioning
| Criterion (wt) | A: current state (name only) | B: menu-led ("what Jalsa serves": the category names) | C: tagline-led ("Celebrate Every Bite") | D: locality-led ("restaurant in <area>") |
|---|---|---|---|---|
| Conversion (35) | 2 — a name answers "what" only | 4 — menu items are diners' biggest decision factor (restaurantdive) | 2 — a slogan answers no visitor question; DD-031 forbids a slogan-only hero | 4 — location is a top need (restaurantdive) |
| Psychology (25) | 2 | 3 — honest restatement of the source, but the source is marked illustrative | 3 — the restaurant's own words | 1 — **no locality exists**; any value is invented |
| Performance (15) | 5 | 5 | 5 | 5 |
| Effort/risk (15) | 5 | 3 — needs A-02 (menu publishable) and A-11 approval | 4 — needs A-03 | 1 — blocked on missing input |
| Brand (10) | 2 | 3 | 4 — the logo lockup | 3 |
| TOTAL /500 | 290 | **365** | 320 | 285 |

- **Winner:** B at 365, because the menu is the only substantive content supplied and the menu is
  diners' main decision factor. Margin over C: 45 points (14%), outside rule 4's 5% tie band.
- **Status:** BLOCKED on A-02 and A-11.
- **Falsifier:** the restaurant supplies a positioning statement, or its location (D becomes
  buildable and likely wins).
- **Copy:** AD-01 is the AI draft of B, held.

## S2 — COMPETITOR TEARDOWN
**Not possible** — EVIDENCE_GAP. A local competitor set needs a location, and none exists. General
principles taken from the research instead ("steal the principle, not the pixels"):

| Principle | Our expression |
|---|---|
| Menu, location and hours are the first three things diners seek | the engine's `local_business` architecture already puts location, hours and services on the home page |
| HTML menus with headed sections, never image/PDF menus | a future menu page must be headed by category, and must not be an image of the .docx. Blocked by FD-04: no category field |

## S3 — APP-REALITY SYNC
| Claim in material | Status | Handling |
|---|---|---|
| Name "Jalsa Restaurant" | PRESENT, unverified | published as the site name in the dry run; A-01 |
| Tagline | PRESENT, unverified | not published; A-03 |
| 52 dishes | PRESENT, illustrative-only | 49 names in the dry run; publication A-02 |
| 52 prices | PRESENT, illustrative-only | **not published**; A-08; FD-03 |
| Category filters | ambiguous | not built; engagement rejected |
| Veg/Non-Veg filter | no per-item value | **refused**: inference would be a dietary, possibly regulated, claim |

## S4 — MEDIA-FORMAT DECISION
Inventory: the logo (unverified, 150 px, C2PA uncertainty). No photographs. No plan document.

OPTION comparison [PROFILE A] — hero/brand media slot, job: tell the visitor this is Jalsa and what it serves
| Criterion (wt) | A: current state (text wordmark, no image) | B: the supplied logo image | C: food photography | D: generated food illustration |
|---|---|---|---|---|
| Conversion (35) | 3 — name is clear; no appetite appeal | 3 — recognisable mark, but 150 px and legibility of small text is poor | 5 — food imagery is the top appeal (ui-ux-pro-max "appetizing imagery"; restaurantdive: food photography affects decisions) | 2 — an illustration of dishes the restaurant may not serve |
| Psychology (25) | 3 | 3 | 4 | 1 — **simulates products** (§13 forbids) |
| Performance (15) | 5 | 5 | 3 | 3 |
| Effort/risk (15) | 5 | 2 — blocked on A-04; possible AI-altered artwork | 1 — no photos exist | 1 — prohibited |
| Brand (10) | 2 | 5 | 3 | 1 |
| TOTAL /500 | **350** | 335 | 365 | 165 |

- **Matrix result:** C scores highest (365), but its margin over A (350) is 4.3%, inside rule 4's
  5% tie band, so the cheaper option A wins. C **cannot be built** anyway: no photographs exist.
  The Ashvattha S5 finding recurs: the matrix has no feasibility gate. Recorded, not re-weighted.
- **Result:** A, the text wordmark (350), ahead of B (335) because B is blocked on A-04.
- **Falsifier:** verified photographs (C), or logo confirmation plus a high-resolution file (B).

## S5 — CONVERSION ARCHITECTURE
OPTION comparison [PROFILE A] — primary conversion
| Criterion (wt) | A: current state (none) | B: directions + call link | C: WhatsApp link | D: online ordering link |
|---|---|---|---|---|
| Conversion (35) | 1 | 4 — location and contact are top diner needs (restaurantdive) | 4 | 4 — ordering is a top need (restaurantdive) |
| Psychology (25) | 1 | 4 | 3 | 3 |
| Performance (15) | 5 | 5 | 5 | 4 |
| Effort/risk (15) | 5 | 1 — no address or phone | 1 — no number | 1 — no ordering channel is known to exist |
| Brand (10) | 1 | 3 | 3 | 3 |
| TOTAL /500 | 220 | **360** | 335 | 320 |

- **Winner:** B (360), BLOCKED on M-07 and M-09. No option is buildable; the site ships with no
  conversion. The engine independently reached the same state (`drive_footfall` →
  `directions_and_call`, both capabilities refused).

## S6 — STRATEGY VERDICT
- **Positioning:** B, menu-led (365), blocked on approvals.
- **Hero media:** A, text wordmark (350), winning by rule 4 over C, photography (365), which does
  not exist.
- **Conversion:** B, directions + call (360), blocked on missing address and phone.
- **Claims that must not appear:** prices, dietary marks, any location, hours or quality claim.
- **Research:** restaurantdive.com, boia.org, petpooja/eresto/foodlabelsolutions (FSSAI summaries),
  ui-ux-pro-max local catalogue.

**GATE S (owner) — CONCEPTUAL — PENDING.**
