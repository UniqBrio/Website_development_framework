# Transcription decisions — raw evidence → engine input contract

Phase 2 Step 0 (website_flow.md). Every value the engine received that the customer material does
not state verbatim is listed here with its basis. Provenance class: **framework inference**
(operator = Claude, AI). None of these is a customer statement; each one that shapes the website is
in `../approvals/approval-register.md`.

| T | Field | Value given to the engine | Basis | Why this value | Status |
|---|---|---|---|---|---|
| T1 | `businessName` | `Jalsa Restaurant` | customer material (F-001) | the only name in either file | CUSTOMER_APPROVAL_REQUIRED |
| T2 | `industry` | `local_business` | **inference** — the enum has no restaurant or food-service value (FD-10) | see §T2 | HUMAN_ASSESSMENT_REQUIRED (reviewer may confirm the classification) |
| T3 | `subIndustry` | quotes where "restaurant" appears | customer material | carries the evidence, not a claim | — |
| T4 | `description` | a summary of the menu's own category names | **inference**; contract-required (`min(1)`) | the least-claiming sentence the source supports; confirmed not rendered (`content-values.ts` uses it only when proposition copy is recorded as available, and it is `unavailable`) | CUSTOMER_INPUT_MISSING |
| T5 | `businessModel`, `maturity` | omitted | no evidence | optional; omitted rather than guessed | CUSTOMER_INPUT_MISSING |
| T6 | `targetAudience` | one entry labelled `visitors (audience not yet stated by the restaurant)` | **no evidence**; contract-required (`min(1)`) | inventing an audience ("families", "office workers") would be a fabricated fact, and DD-031 renders audience labels publicly as owner-supplied text. The label states the absence instead. Not rendered in this run (the derived home page has no hero section). FD-02 | CUSTOMER_INPUT_MISSING |
| T7 | `location` | omitted | no evidence | the ₹ sign shows the currency, not the country or city | CUSTOMER_INPUT_MISSING |
| T8 | `servicesProducts` | 49 offers, `kind: product`, names verbatim, no description, `priceKnown: false` | customer material; 3 rows withheld | see §T8 | CUSTOMER_APPROVAL_REQUIRED |
| T9 | `websiteObjective` | `["drive_footfall"]` | **no evidence**; contract-required (`min(1)`); FD-01 | see §T9 | CUSTOMER_INPUT_MISSING |
| T10 | `brandPersonality`, `preferredVisualDirection` | `[]` | no evidence | a script wordmark and a tagline do not state a personality; the engine's rules decide | CUSTOMER_INPUT_MISSING |
| T11 | `requiredPages` | `[]` | no evidence | no page was requested; the framework derives the page set (G1) | CUSTOMER_INPUT_MISSING |
| T12 | `requiredFunctionality` | `[]` | no evidence | no ordering, booking, map or form was requested | CUSTOMER_INPUT_MISSING |
| T13 | `constraints` | omitted entirely | no evidence | no brand seed, theme, fonts, origin, accessibility target or deadline was stated; each is left for the engine to record as unresolved or defaulted | CUSTOMER_INPUT_MISSING |
| T14 | inventory statuses | `evidence/fact-register.json` `inventoryStatuses` | evidence per fact; three `not_applicable` values are inference | see §T14 | — |
| T15 | supplied content | logo file (to exercise the gate), two AI drafts | customer file + AI drafts | no contact, copy or verified value exists to supply | — |
| T16 | `engagement` | `framework_decides`; `requestedIdea: product_service_finder`; visitor task `find_suitable_offer` with basis `inferred` | the menu document's filter list | see §T16 | CUSTOMER_INPUT_MISSING |

## T2 — industry classification

The contract offers no restaurant value. The engine was run on the two candidates before choosing,
as evidence of what the choice changes (scratch runs, 2026-09-15; not kept as generated output):

| Engine output | `local_business` (chosen) | `hospitality` |
|---|---|---|
| Baseline group / archetype | Local business / `local_action_page` | Hospitality/travel / `image_led_editorial_conversion` |
| Required content | location, hours, contact, services | booking, location, amenities, policies |
| Expression ceiling / motion cap | low_to_medium / low | **high** / medium |
| Personality (rule draft) | "practical, local, immediate" (DD-010) | "clear, plain, credible" (fallback: no rule fired) |
| Unallocated sections | location, faq, internal_links (6 unavailable entries) | booking, location, amenities, policies, faq, internal_links (9) |
| Engagement | NO_EXPERIENCE | NO_EXPERIENCE |

`hospitality` would ask for an image-led, high-expression site and a booking section. The customer
supplied no images, no booking information and no amenities, and nothing says the business takes
reservations or lodges guests. `local_business` asks for exactly the facts a restaurant visitor
needs first (where, when, how to reach, what is served) and prohibits `fake_local_details`. `other`
maps to the professional-services posture (credentials, process), which fits neither.

Decision: `local_business`. Falsifier: the restaurant states it is primarily a destination venue with
reservations and supplies imagery, or the contract gains a food-service value (FD-10).

## T8 — the menu as offers

- **Transcribed:** rows whose item text is a name. Text kept exactly, including "— 1 pc",
  "Half", "Full" and the spelling variants.
- **Withheld (3):** rows 36, 51 and 52. Their item text contains bracketed transcription notes
  ("[variant]", "[item partially visible]", "[text partially visible]"), which are not dish
  names. Publishing them would print a transcription note as a menu item. Recorded as F-013 to F-015.
- **`kind: product`:** a dish is sold, not performed. It has no effect on commerce depth, because
  no checkout exists.
- **`priceKnown: false`:** prices are present but unverified, and the document says "For design
  illustrations only". `true` would state they are known.
- **Lost at the seam, not silently (FD-04):**
  - the category of every row;
  - the price value of every row (FD-03);
  - the source row numbers;
  - the category filter list;
  - the dietary filter;
  - the ambiguity flags.

  The offer contract has no field for any of these. They remain in `evidence/`.
- **Reviewer context considered:** the first-level reviewer said the menu "may be used as
  customer-supplied content". Names were therefore transcribed. Publication of any value still
  requires the restaurant's approval, because of the document's own first line.

## T9 — website objective

The contract requires one. No customer statement exists. Candidates and what each would do:

| Candidate | Evidence for | What the engine requires | Why not / why |
|---|---|---|---|
| `drive_footfall` (chosen) | the word "Restaurant"; a menu is what a visitor checks before going | location_and_contact, hours, services; a verified address to convert | the most conservative choice: its conversion is blocked until a verified address exists, so the framework surfaces the most important missing facts instead of enabling anything |
| `generate_leads` | none (no enquiry is mentioned) | proposition, services, enquiry; a verified contact method | invents an enquiry funnel the restaurant never mentioned |
| `sell_products` | prices exist | catalog, price, returns, checkout | invents online ordering and checkout |
| `educate` | none | topic hub, explanation | a menu is not educational content |

Web research this run: diners' top website needs are menu, location, hours and reservation or
ordering options (Restaurant Dive, citing a Toast survey of 1,101 US adults). That evidence is
general and US-based. It supports the choice as a common pattern; it is not evidence about Jalsa.

## T14 — inventory statuses

- `provided_unverified`: logo, pricing, datasets (the menu table). A file or value exists; none is verified.
- `partial`: brandColors (colours visible in the logo; no stated palette).
- `not_applicable` (inference): portfolioImages, customerLogos, caseStudies. A restaurant has no client
  portfolio, and without this the framework would ask the restaurant for client logos and case studies.
- `unavailable`: everything else, including every contact method.

## T16 — the filter list as a possible requested interaction

The menu document lists "category filters:" and "All / Veg / Non-Veg dietary filters". It does not
say whether these are wanted on the website or copied from an existing ordering screen. Treating a
possible request as a request only means it is evaluated. The engine never accepts a requested idea
without its hard gates. The preference stays `framework_decides`, so the idea is not favoured, and
the visitor task is declared `inferred`, which lowers decision confidence.
