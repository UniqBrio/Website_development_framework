# Missing-information inventory

Built systematically, not from memory. Every category the framework's input contract, the
industry baseline (`local_business`: location, hours, contact, services), the objective
architecture, the SEO artifact set, the token contract, the engagement gates and the publication
requirements can ask for was checked against both raw files. Where the files are silent, the item
is listed here and **left missing**. Nothing is filled from general knowledge, earlier work or
common restaurant practice.

Each row has exactly one classification. "Blocks" says what cannot happen until it arrives.

## 1. Identity and authority
| # | Missing | Blocks | Class |
|---|---|---|---|
| M-01 | Confirmation that the restaurant supplied these files and authorises their use | any publication | HUMAN_ASSESSMENT_REQUIRED |
| M-02 | Name of the person at the restaurant who can approve content (final approver) | every approval | CUSTOMER_INPUT_MISSING |
| M-03 | Legal/trading name confirmation | publication of the name (F-001) | CUSTOMER_APPROVAL_REQUIRED |
| M-04 | Branches / number of outlets | location model; regulatory applicability (F-030) | CUSTOMER_INPUT_MISSING |
| M-05 | Owner, founders, chef, team | nothing required; no team content is generated | CUSTOMER_INPUT_MISSING |
| M-06 | Years in business / founding date | nothing required; no such claim is generated | CUSTOMER_INPUT_MISSING |

## 2. Location, contact, hours (baseline-required for `local_business`)
| # | Missing | Blocks | Class |
|---|---|---|---|
| M-07 | Street address, city, state, country, PIN/postcode | location section; `drive_footfall` conversion (DD-101); LocalBusiness JSON-LD; map | CUSTOMER_INPUT_MISSING |
| M-08 | Map location / directions link | directions conversion | CUSTOMER_INPUT_MISSING |
| M-09 | Phone number | call link | CUSTOMER_INPUT_MISSING |
| M-10 | WhatsApp number | WhatsApp link | CUSTOMER_INPUT_MISSING |
| M-11 | Email address | email link; any enquiry route | CUSTOMER_INPUT_MISSING |
| M-12 | Opening hours per day; holiday exceptions | hours section (renders "Hours to be supplied.") | CUSTOMER_INPUT_MISSING |
| M-13 | Meaning of "Full Day" in the filter list | hours/menu availability interpretation | CUSTOMER_INPUT_MISSING |

## 3. Service model and transactions
| # | Missing | Blocks | Class |
|---|---|---|---|
| M-14 | Dine-in / takeaway / delivery / catering | objective and page architecture | CUSTOMER_INPUT_MISSING |
| M-15 | Online ordering (own system or platforms) and links | any ordering route; none is generated | CUSTOMER_INPUT_MISSING |
| M-16 | Delivery areas, partners, charges | nothing generated | CUSTOMER_INPUT_MISSING |
| M-17 | Table reservations (how, and whether real availability exists) | booking; the engine rejects booking_flow without it | CUSTOMER_INPUT_MISSING |
| M-18 | Payment methods | nothing generated | CUSTOMER_INPUT_MISSING |
| M-19 | Offers, discounts, combos' availability | nothing generated | CUSTOMER_INPUT_MISSING |

## 4. Menu completeness and meaning
| # | Missing | Blocks | Class |
|---|---|---|---|
| M-20 | Confirmation the menu is current, complete and publishable (the document says "For design illustrations only") | publishing any item or price | CUSTOMER_APPROVAL_REQUIRED |
| M-21 | The original menu the table was transcribed from | checking the transcription | EVIDENCE_GAP |
| M-22 | Full text of rows 36, 51, 52 | those items | CUSTOMER_INPUT_MISSING |
| M-23 | Category for the 7 slash-joined rows; whether breads exist | a categorised menu | CUSTOMER_INPUT_MISSING |
| M-24 | Veg / non-veg (and egg) value per item | dietary filter; any dietary mark | CUSTOMER_INPUT_MISSING |
| M-25 | Ingredients and allergens | allergen information (none is generated) | CUSTOMER_INPUT_MISSING |
| M-26 | Dish descriptions, spice levels | dish descriptions (cards show "description to be supplied") | CUSTOMER_INPUT_MISSING |
| M-27 | Portion sizes; combo contents; which biryani "Full Biryani" is | item clarity | CUSTOMER_INPUT_MISSING |
| M-28 | Whether prices include taxes/service charges | price publication | CUSTOMER_INPUT_MISSING |
| M-29 | Who keeps the menu and prices current | engagement hard gate `maintenance_ownership`; stale-price risk | CUSTOMER_INPUT_MISSING |

## 5. Brand and assets
| # | Missing | Blocks | Class |
|---|---|---|---|
| M-30 | Confirmation the logo is official, not AI-created or AI-altered | logo use | CUSTOMER_APPROVAL_REQUIRED |
| M-31 | Original logo artwork (vector or ≥512 px, transparent) | header mark, Open Graph image, favicon | CUSTOMER_INPUT_MISSING |
| M-32 | Brand colours (or approval of the measured maroon `#7c1518`) | token seed (neutral substitute ships) | CUSTOMER_APPROVAL_REQUIRED |
| M-33 | Brand fonts | typography tokens (neutral substitute ships) | CUSTOMER_INPUT_MISSING |
| M-34 | Theme mode (light/dark) | token mode (SINGLE-DARK unchosen default ships) | CUSTOMER_APPROVAL_REQUIRED |
| M-35 | Food, interior and exterior photographs with permission | image-led design; the engine chooses `non_representational_only` | CUSTOMER_INPUT_MISSING |

## 6. Proof and reputation (never generated)
| # | Missing | Blocks | Class |
|---|---|---|---|
| M-36 | Google rating, reviews | nothing; no proof module renders (DD-100) | CUSTOMER_INPUT_MISSING |
| M-37 | Testimonials with permission | nothing (DD-098) | CUSTOMER_INPUT_MISSING |
| M-38 | Awards, press, certifications | nothing (DD-100) | CUSTOMER_INPUT_MISSING |
| M-39 | Social media accounts | footer/social links (none generated) | CUSTOMER_INPUT_MISSING |

## 7. Website intent (contract-required, currently inferred)
| # | Missing | Blocks | Class |
|---|---|---|---|
| M-40 | What the website should achieve (objective) | the architecture rests on an inference (T9) | CUSTOMER_INPUT_MISSING |
| M-41 | Who the audience is | contract-required label is an explicit absence (T6) | CUSTOMER_INPUT_MISSING |
| M-42 | Pages wanted (menu page? contact page?) | the framework derived one page | CUSTOMER_INPUT_MISSING |
| M-43 | Whether the menu filters are wanted on the website | engagement evaluation rests on an ambiguous source | CUSTOMER_INPUT_MISSING |
| M-44 | Languages | `lang="en"` default; localisation unknown | CUSTOMER_INPUT_MISSING |
| M-45 | Proposition / headline copy (or approval of AD-01) | proposition slot | CUSTOMER_APPROVAL_REQUIRED |
| M-46 | Launch deadline | nothing | CUSTOMER_INPUT_MISSING |

## 8. Legal, regulatory, technical
| # | Missing | Blocks | Class |
|---|---|---|---|
| M-47 | Jurisdiction and food-business licence details; which menu display rules apply (e.g. FSSAI veg/non-veg marks, allergen or calorie display, if in India) | dietary marks; compliance statement | EXTERNAL_DEPENDENCY |
| M-48 | Privacy policy (needed once any form or analytics exists) | legal section (hidden) | CUSTOMER_INPUT_MISSING |
| M-49 | Domain / production origin | canonical, sitemap, `og:url` (unresolved) | CUSTOMER_INPUT_MISSING |
| M-50 | Hosting and deployment owner | release | EXTERNAL_DEPENDENCY |
| M-51 | Analytics and consent decisions | analytics events (none installed) | CUSTOMER_INPUT_MISSING |
| M-52 | Who answers enquiries | engagement gate `operational_follow_up` | CUSTOMER_INPUT_MISSING |
| M-53 | Accessibility target beyond the WCAG 2.2 AA default | nothing (AA default applies) | NOT_APPLICABLE |
| M-54 | C2PA signature validation for the logo | logo provenance certainty | EVIDENCE_GAP |

## Minimum set to reach a publishable single-page site
Without all of these, no publishable page exists.

**Updated 2026-09-16.** They are now *sufficient as well as necessary*, as far as the framework is
concerned. The five defects recorded here on 2026-09-15 — FD-03 (prices never render), FD-04 (no
categories, portions or dietary marks), FD-14 (the hours placeholder persists), FD-09 (the
proposition is not rendered) and FD-15 (49 per-dish "service" pages) — were all resolved, and the
completeness simulation (`tests/scenarios/jalsa-completeness-simulation.test.ts`) now asserts the
opposite of what it asserted then. Supplying this list and granting the §A approvals is what stands
between this restaurant and a publishable page; nothing in the framework does.

Two of the items are load-bearing in a way they were not before:
- **M-20 / A-02** — the menu is withheld *in full* until the restaurant states that it is the real,
  current menu and authorises its publication. The document says "For design illustrations only",
  and that restriction overrides any verification.
- **Prices** publish per value: a price is a fact, so each one needs verification, not just
  approval of the menu as a whole.

The list: M-01, M-02, M-03,
M-07, M-12, at least one of M-09/M-10/M-11, M-20 (or removing the menu), M-30/M-31 (or
accepting a text wordmark), M-32, M-34, M-40, M-41, M-49, and the approvals in
`../approvals/approval-register.md` §A.
