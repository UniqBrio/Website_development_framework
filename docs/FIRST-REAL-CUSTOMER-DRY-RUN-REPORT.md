# First real-customer dry run — Jalsa Restaurant

**Date:** 2026-09-15
**Workspace:** `customers/jalsa-restaurant/`
**Run:** WEB-NEW-20260915-restaurant-website
**Status:** dry run — nothing published, nothing committed, nothing customer-approved.

> **Final readiness status: FRAMEWORK BLOCKED**
>
> The restaurant's input is also incomplete, and every approval is pending. But even with every
> missing fact and approval supplied, the framework cannot publish this restaurant's website
> safely (§25). That test was run, not argued: see
> `tests/scenarios/jalsa-completeness-simulation.test.ts`.

> **Superseded on 2026-09-16 — see §29 (Addendum).** All 16 defects were remediated
> (`docs/FRAMEWORK-REMEDIATION-PLAN.md`, `docs/FRAMEWORK-REMEDIATION-IMPLEMENTATION-REPORT.md`) and
> the run was repeated on the same raw files, the same facts and the same approvals. The status is
> now **CUSTOMER INPUT OR APPROVAL BLOCKED**. Everything below §29 records the run of 2026-09-15 as
> it was, and is left unedited.

---

## 1. Executive Summary

**What came in.** Two files and nothing else:
- a 150×150 logo PNG;
- a Word menu headed **"For design illustrations only"**, with 52 priced items, a category
  filter list and a veg/non-veg filter line.

There was no brief, address, phone, hours, objective, audience or approver.

**What the framework did well** (verified on the served site in Chromium and WebKit):
- **Raw material:** preserved byte-for-byte; SHA-256 asserted before and after every run.
- **Invention:** none. Every visible text fragment on the served page is classified: 54
  customer-material fragments (with source locators), 10 framework structural fragments,
  **0 unclassified**.
- **Refusals:** no price, dietary mark, address, hours, phone, rating, description or quality
  claim was published or drafted. The unverified logo was refused, and a text wordmark shown
  instead.
- **AI drafts:** both held; neither reached HTML. An approval record publishes a draft, proven on
  this customer's data with a test-only simulated approval.
- **Engagement:** NO_EXPERIENCE. The menu's filter list was evaluated as a possible request and
  rejected at three hard gates, because a finder built on veg/non-veg values inferred from dish
  names would publish invented dietary data.
- **Gates:** technical, accessibility (axe: 0 violations), responsive (9 profiles, both engines,
  320 px), performance (lab) and design pass. Content fails, correctly.
- **Synthetic data:** none. Every fixture value and the representative Ashvattha brief were
  checked against the output, with a negative control proving the check detects a leak.

**What the real customer exposed** — 16 framework defects (§20), none visible in the synthetic
runs. Five block publication of *this* website even with complete input:

| Defect | What it means |
|---|---|
| FD-03 | A verified price can never be published: the price value has no field at all. |
| FD-04 | A menu cannot be represented: categories, portions and dietary values have no home and are lost at the seam. |
| FD-14 | The `hours` section is always a placeholder, even when verified hours are supplied, so the content gate can never pass for this architecture. |
| FD-09 | Approving the AI proposition makes generation **throw**; verified proposition copy is silently not rendered. |
| FD-15 | Supplying dish descriptions derives 49 thin per-dish "service" pages typed `Service`. |

Two further defects mean the production gate would not catch an unapproved menu:
- FD-05: offer names publish although content verification says services must not render;
- FD-06: the placeholder check counts 1 slot while 49 pending markers are served.

**Two provenance findings about the raw material itself:**
1. The logo's C2PA content credentials state *"Claude provided this file at the request of a user
   and may have created or modified the file contents"*, origin confidence **unknown**.
2. The menu's first line restricts the whole document to design illustration.

Both must be resolved with the restaurant before anything is published.

## 2. Raw Inputs
| File | Bytes | SHA-256 | Observed |
|---|---|---|---|
| `raw/jalsa-restaurant-logo.png` | 34,076 | `878b5c95…5e18` | 150×150 RGB PNG, no transparency; "Jalsa" / "RESTAURANT" / "CELEBRATE EVERY BITE"; maroon `#7c1518`, cream near `#f0f0e8`; C2PA manifest (above) |
| `raw/jalsa-restaurant-menu.docx` | 19,053 | `2f7fc234…fa17` | "For design illustrations only"; "Jalsa Restaurant — Menu:"; 52-row table (# · Menu Item · Price · Category); "category filters:" + 14 list items; metadata creator "Sugumar B", 2026-09-06; no hidden text, tracked changes, comments or images |

Inspection method and full detail:
- `customers/jalsa-restaurant/evidence/raw-file-register.md`;
- `evidence/logo-inspection.md`;
- `evidence/menu-source-extraction.md`.

The extraction is reproducible from the raw file (`evidence/tools/extract-menu.mjs`), and a test
fails if the committed evidence drifts from it.

## 3. Provenance Classification
The nine classes are kept physically apart (workspace README):

| Class | Count / where |
|---|---|
| a) Customer-provided evidence | 2 raw files → 18 of the 30 fact-register entries |
| b) Framework inference | 16 transcription decisions (T1-T16); 5 fact-register entries (measured logo colours F-005, price observations F-019, transcription origin F-021, objective F-026, audience F-027) |
| c) AI-generated draft | 2 (AD-01 proposition, AD-02 meta description), both `AI_DRAFT`, held; 6 draft types refused |
| d) First-level reviewer feedback | 1 context entry (approval register §B); it changes no customer approval |
| e) Final customer approval | **0** (`approved/` empty; §A: 16 items PENDING) |
| f) External dependency | FSSAI/jurisdiction applicability (F-030, M-47); hosting (M-50) |
| g) Human assessment | 6 (H-01…H-06) |
| h) Framework policy | DD-098…DD-105 content rules, asset gate, neutral token substitute, draft channel |
| i) Evidence requirement | 54 missing-information rows (M-01…M-54): 42 CUSTOMER_INPUT_MISSING, 6 CUSTOMER_APPROVAL_REQUIRED, 2 EXTERNAL_DEPENDENCY, 2 EVIDENCE_GAP, 1 HUMAN_ASSESSMENT_REQUIRED, 1 NOT_APPLICABLE |

Verified facts: **none**.

## 4. Extracted Business Facts
Every value is verbatim, unverified customer material (`evidence/fact-register.json`):

| Fact | Value | Source |
|---|---|---|
| Name | Jalsa Restaurant | docx paragraph 1; logo |
| Type | restaurant | logo; docx title |
| Tagline | CELEBRATE EVERY BITE | logo |
| Menu | 52 rows: Indian Curry 20, Chinese 7, Non-Veg Starters 5, Combo 4, Drinks 3, Chinese / Veg Starters 3, Desserts 2, and single rows for Rice, Salads, Veg Starters, Biryani, Starters / Non-Veg Starters, Drinks / Desserts, Rice / Chinese, Biryani / Combo | docx table |
| Prices | ₹12 (Lime Tea) to ₹448 (Dinner Combo 3) | docx table |
| Currency | Indian rupee — establishes the currency only, not the location | every price cell |
| Filter list | All Items, Biryani, Bread, Drinks, Full Day, Indian Curry, Rice, Starters, Chinese, Combo, Desserts, Salads, Veg Starters; "All / Veg / Non-Veg dietary filters" | docx paragraphs 4-17 |

**Ambiguities preserved, not fixed:**
- 3 partial rows (36, 51, 52), withheld from transcription;
- 7 slash-joined categories;
- "Bread" and "Full Day" filters with no rows;
- "Non-Veg Starters" absent from the filter list;
- no dietary value on any row;
- portions in only 5 names;
- combo contents absent;
- spelling variants Chettinadu/Chettinad and Chilly/Chilli;
- six price figures that need confirmation.

## 5. Unknown / Missing Information
54 rows in `missing/missing-information-inventory.md`, each with exactly one classification:

| Group | Missing |
|---|---|
| Identity and authority | who supplied the files; who can approve; legal name; branches; team; founding |
| Location, contact, hours | address, map, phone, WhatsApp, email, opening hours, meaning of "Full Day" |
| Service model | dine-in/takeaway/delivery; ordering; delivery; reservations; payments; offers |
| Menu meaning | current and publishable?; original source; partial rows; categories; veg/non-veg per item; ingredients/allergens; descriptions; portions; combo contents; tax inclusion; who maintains prices |
| Brand | logo authenticity; original artwork; colours; fonts; theme; photographs |
| Proof | ratings, reviews, testimonials, awards, social accounts (none generated) |
| Intent | objective, audience, pages, whether filters are wanted, languages, proposition, deadline |
| Legal/technical | jurisdiction and licence rules; privacy policy; domain; hosting; analytics/consent; enquiry owner |

## 6. Customer Approval Requirements
16 items, all **PENDING** (`approvals/approval-register.md` §A):

| ID | Approval |
|---|---|
| A-01 | name |
| A-02 | menu publishable despite "For design illustrations only" |
| A-03 | tagline |
| A-04 | logo authenticity and use |
| A-05 | brand seed |
| A-06 | theme |
| A-07 | item names and spelling |
| A-08 | prices |
| A-09 | objective |
| A-10 | audience |
| A-11 | AD-01 |
| A-12 | AD-02 |
| A-13 | design direction |
| A-14 | page set |
| A-15 | filters and dietary values |
| A-16 | authorisation of the files |

The pipeline itself raises 20 approval requirements before the build and 24 publication
requirements after the host evaluation.

## 7. Business Intelligence Result
The input contract forced four values the material does not state. Each is recorded as inference,
never as fact (`decisions/transcription-decisions.md`):
- `industry: local_business` (T2);
- `description` (T4, not rendered);
- `targetAudience` as an explicit absence label (T6);
- `websiteObjective: drive_footfall` (T9).

The contract has no way to mark any of them as inferred (FD-01, FD-02).

What the framework refused to infer:
- location, country, service model;
- audience, personality, brand colour;
- veg/non-veg classification;
- descriptions, hours, pages.

The Business Intelligence model is deliberately thin: 7 of 16 profile variables rest on defaults,
and the profile records each default as such.

## 8. Design Context Profile
- **Measured from evidence:** trust medium (industry prior); **visual_asset_quality none**;
  **content_confidence verification_required**; commerce none; information density high
  (49 offers).
- **Resting on inference or defaults:** seo_dependency high; mobile_share high (default);
  performance_sensitivity high; accessibility wcag_aa (default); purchase cycle short (default);
  emotional intensity medium (default); brand expression low (default); literacy medium (default).

Full provenance per variable: `decisions/design-decision-record.md` §1.

## 9. Industry Baseline
- **Chosen prior:** `local_business` → archetype `local_action_page`; expression low_to_medium;
  motion low.
- **Required content:** location, hours, contact, services.
- **Prohibited:** fake local details, immersive complexity.

Before choosing, the engine was run on the alternative `hospitality`:
- image-led, **high** expression, medium motion;
- requires booking, amenities and policies, none evidenced.

The framework has no food-service industry (FD-10). The local design catalogue (ui-ux-pro-max)
proposed "Vibrant & Block-based + Motion-Driven … appetizing imagery" for restaurants. **Not
adopted:** that is the restaurant-template jump this run must not make, and no imagery exists.

## 10. Business Overrides
| Fact | Override |
|---|---|
| No authentic visuals | `non_representational_only`: no photographs, and no generated imagery that could read as the restaurant, its food or people |
| Unverified pricing | price surfaces hidden (DD-102) |
| No verified contact | public contact CTA blocked (DD-101); `drive_footfall` conversion blocked |
| Unverified logo | file refused; provisional text wordmark (`identity.mark = verified_name_wordmark`: the rule's name says "verified" about an unverified name, FD-13) |
| No brand seed or fonts | neutral substitute `#5A5F6A`, SINGLE-DARK unchosen, system fonts (approval) |

## 11. Design Decision Record
(`decisions/design-decision-record.md`)

- **Personality:** "practical, local, immediate" (DD-010).
- **Layout:** structured grid, single reading rail, bounded containers, 60-75ch measure.
- **Typography:** fluid bounded clamp scale, system stack.
- **Colour:** 16 token pairs measured, all pass (lowest body pair 9.21:1).
- **Motion:** cap low; nothing animates.
- **Navigation:** native popover disclosure below the medium range (DD-034).
- **Hero:** DD-031 requires what/for whom/why/next step, but no hero section is allocated on the
  derived page; the H1 is the name.
- **Section architecture:** location, hours, location_and_contact, services, faq, internal_links.
  `location`, `faq` and `internal_links` are reported unallocated.
- **Patterns selected:** `perspective-card`, `magnetic-action` — **never rendered** (FD-11).
- **Rejected:** 12, each with its rule.
- **Deferred for missing content:** 6.
- **Replaced:** 1. **Rule conflicts:** 0.
- **Stack:** Next.js static; runtime `next`, `react`, `react-dom`; `motion` proposed, not
  consumed, not installed.

**Supported by evidence:** no imagery, text wordmark, hidden prices, no contact route.
**Requiring approval:** colour, theme, fonts, personality, objective-driven architecture, page set.

## 12. Engagement Decision
**NO_EXPERIENCE** (confidence low: the only visitor task is inferred).
(`decisions/engagement-decision.md`)

- All 27 categories failed at least one hard gate; none reached scoring, so no opportunity score
  exists.
- **Customer-material idea evaluated normally:** `product_service_finder` (menu category and
  dietary filters) failed:
  - `objective_linkage`;
  - `data_integrity` — no category membership or dietary value exists to filter on;
  - `maintenance_ownership` — nobody keeps prices and items current.
- **Also rejected:**
  - booking_flow: no availability, no contact route;
  - quiz, calculators, gamification, games, 3D/WebGL: visitor value, objective linkage and data
    integrity, among others;
  - ordering, maps and loyalty: no category and no evidence.
- **Static alternative:** directions and call link. It cannot exist yet (no address or phone).

## 13. Delivery Decision
- No delivery spec, no experience runtime, no client experience code.
- Delivery reconciliation consistent (experiences `[]`, runtime `null`).
- Register TC-ENG-001: BLOCKED (nothing to operate — correct).
- The finder's own static alternative ("offers grouped by need, with filters as plain links")
  **could not be generated even if chosen**, because offers carry no category (FD-04).
  Classification: DELIVERY_UNAVAILABLE.

## 14. Generated Website Status
One route, `/` (derived: no pages requested). Generated under `customers/jalsa-restaurant/generated/`
as a static layer plus a Next.js App Router app.

**Served content:**
- header wordmark "Jalsa Restaurant" and compact navigation;
- H1 "Jalsa Restaurant";
- "Location and contact" → "Contact route unavailable until details are verified.";
- "Hours" → "Hours to be supplied.";
- "Services" → 49 dish names, each with "description to be supplied";
- footer link Home.

**Head:** `<title>Jalsa Restaurant</title>`, robots index,follow, OG/Twitter title,
Organization JSON-LD (name).

**Not published** (correctly): 52 prices, 3 partial rows, both AI drafts, logo, tagline, any
dietary value.

On a phone the page is a single very long column of placeholder-annotated cards
(`generated/host/evidence/screenshots/iphone-se/home.png`). It is an honest page, and not a
publishable one.

## 15. Validation Results
**Final tree:**
- `npm run gate` — PASS (§ Regression below);
- `npm run host:e2e` — PASS, 4 of 4 host files (Jalsa, Verdaleen, Ashvattha, engagement).

**Jalsa host run** (`evidence-run/jalsa-dry-run-digest.json`, collected 2026-09-15T13:25:41.482Z
in the final `host:e2e`):

| Check | Result |
|---|---|
| typecheck (`tsc --noEmit`) / lint / `next build` | exit 0 / 0 errors, 0 warnings / exit 0 |
| Engines | Chromium 152.0.7977.84 and WebKit (Playwright 1.63.0), both available |
| Layers | Next.js and static, both served 200 |
| Routes | `/` 200; not-found probe 404 with marker; error/loading/not-found states exist |
| Navigation | phone: closed initially; keyboard opens; Tab reaches menu; Escape closes; focus returns; Close works; route parity. Desktop: list visible. No-JS: opens by keyboard. All in both engines × both layers |
| Keyboard | 4/4 focusable reached; focus visible at every stop; none obscured |
| Touch / no-hover | no hover-dependent content (0 of 3 hover checks reveal content); no drag/device-motion/WebGL; smallest target 27 px |
| 320 px / 400% zoom | no overflow, no text lost |
| Forms | none (no contact method) — N-A |
| Interactive experiences, reset/recovery | none — N-A |
| Static fallback | static layer: axe 0 violations, 320 px overflow 0, 0 page errors |
| Secrets | 22 files, 0 findings |
| Console | 1 non-blocking error: `/favicon.ico` 404 (no verified icon exists) |
| Dependency admission | only admitted runtime + toolchain installed |
| Decision-to-execution integrity | consistent: 9 delivered, 6 unavailable (with reasons), 0 mismatch. Blind spots: FD-05, FD-11 |
| Dataset classification | `unmarked` (no synthetic marker). It cannot prove a real customer supplied it (H-03) |

**Register** (13 cases):
- PASS 9: data, integrity, duplicates, navigation, responsive, accessibility, technical,
  performance, design;
- FAIL 3: completable conversion, placeholder text, content gate;
- BLOCKED 1: experiences.

**Jalsa scenario tests** in `npm test`:
- `jalsa-real-customer.test.ts`: 16 cases;
- `jalsa-completeness-simulation.test.ts`: 7 cases.

## 16. Accessibility Results
| Result | Detail |
|---|---|
| Gate | `true` at `wcag_aa`; score 9/10 |
| axe-core 4.13.0 | 0 violations, 0 incomplete, Next and static layers |
| Contrast | 206 normal-text samples, lowest 9.13:1; large text lowest 16.54:1 |
| Other measured | reflow, reduced motion, input independence, focus visible/not obscured, target size, media alternatives, forms — all pass |
| Human assessment required | WCAG 1.4.8, 2.4.9, 3.1.5 — not performed |

**Screen reader: NOT PERFORMED.** No documented session exists, so no screen-reader result is
claimed (H-01; `docs/SCREEN-READER-TESTING-STRATEGY.md`).

## 17. Performance Results
Lab only: Chromium via CDP; 412×823 viewport; 4× CPU slowdown; 150 ms latency; 1,638 kbps down;
cache disabled. Three host runs of the Jalsa site this session (the last is the final tree):

| Metric | 13:09 run | 13:13 run | **Final 13:25 run** | Budget |
|---|---|---|---|---|
| LCP | 616 ms | 724 ms | **596 ms** | < 2,500 ms |
| CLS | 0 | 0 | **0** | < 0.1 |
| INP | 64 ms | 80 ms | **72 ms** | < 200 ms |
| First-load JS `/` (gzip, external scripts) | 142.6 KB | 142.6 KB | **142.6 KB** | 150 KB |

- **Gate:** `performance = true` under the existing policy; score 8/10.
- **Why this is not a production performance pass:**
  - each INP value comes from **one** scripted click per run (the page's only non-navigating
    control is the menu toggle), so no distribution exists;
  - LCP varied 596-724 ms and INP 64-80 ms across three runs;
  - no field data exists.

  Classification: EVIDENCE_GAP.
- **Budget:** 95% of the route budget is framework runtime for a page with no interactivity.
- **Instability elsewhere on the same final tree:** Ashvattha's `/about` measured INP **224 ms**
  from a single click (96 ms in the previous run), so **Ashvattha's performance gate is `false` in
  the final run**. The policy was not changed; the measurement is reported as taken.

## 18. SEO Results
| Artifact | Served | Status |
|---|---|---|
| Title | "Jalsa Restaurant" | present; not localised (no locality exists) |
| Meta description | absent | held AI draft AD-02 |
| Canonical / sitemap / og:url | absent | UNRESOLVED — no domain |
| H1 | one, no skipped levels | present |
| OG / Twitter | title, type, card | og:image unresolved (no verified image) |
| JSON-LD | Organization {name} | LocalBusiness refused (no verified address); no Menu/MenuItem type exists (FD-04) |
| robots | index, follow | present |
| Internal links | "/" only | score sheet flags an orphan (FD-12) |
| Body text without JS | 2,292 characters | present |

SEO score 5/10.

## 19. Content Integrity Results
| Check | Result | Evidence |
|---|---|---|
| Raw files unchanged | PASS | SHA-256 before/after in host and scenario tests |
| Extraction reproducible and verbatim | PASS | `extractMenu()` deep-equals the committed JSON |
| Offers are verbatim menu rows; withheld rows are exactly the bracketed ones | PASS | scenario test |
| Seam statuses equal the fact register; no VERIFIED fact | PASS | scenario test |
| Every served text fragment classified | PASS | 54 customer (with locator), 10 framework, 0 unclassified |
| No price, contact, proof, dietary or policy term served | PASS | host test forbidden-term list |
| Held AI drafts absent; published drafts none | PASS | host + scenario |
| `approved_ai_draft` without an approval record is held; with one it publishes and reconciles | PASS | scenario test (TEST-ONLY simulated approval, never written to the workspace) |
| Logo file refused | PASS | manifest `assets.refused = [logo]` |
| No synthetic fixture value in output; negative control detects an injected one | PASS | distinctive values of 18 synthetic business-input fixtures, 3 engagement-data fixtures and the representative Ashvattha brief |
| Every generated business fact came from the customer or an approved source | **YES**, with a qualification: all come from customer material; **none** is approved or verified. The name and 49 dish names are unverified customer material. No fact came from an approved source, because none exists. | provenance ledger |

## 20. Framework Defects
All 16 are classified FRAMEWORK_DEFECT. None was fixed in this run: the task was to discover
behaviour, not to make Jalsa pass. Each is pinned by a test that must flip deliberately when fixed.

| ID | Defect | Evidence | Blocks publication with complete input? | Smallest appropriate fix |
|---|---|---|---|---|
| FD-01 | `websiteObjective` is required with no unknown or basis state; an inferred objective enters as if stated | `business-input.ts` `min(1)`; T9; test FD-01/02 | no (customer can state it) | add `basis: stated \| inferred` to objectives; any `inferred` basis raises an approval requirement |
| FD-02 | `targetAudience` is required; DD-031 renders audience labels publicly as "owner-supplied" text | `component-model.ts:531-550`; T6 | no | same basis field on audience; render the `for_whom` slot unless `stated` |
| FD-03 | A price VALUE has no field anywhere; `pricing` is in NEVER_GENERATED; `verified_available` + `priceKnown` still render nothing | `content-values.ts:432-446`; simulation FD-03 | **YES** | add `price` to offers (or keyed supplied prices), gated by the `pricing` status and DD-102; render beside the offer; Offer JSON-LD only when verified |
| FD-04 | No menu or catalogue structure: category, portion and dietary attributes have no home; categories, filters and dietary line are lost at the seam; menus render as one flat list | T8; tests FD-04 (both files) | **YES** | optional `group` on offers → grouped rendering with headings; per-item `attributes` gated by their own verified status; never inferred |
| FD-05 | Offer names publish although content verification says `services: render=false`; no per-offer verification or "illustrative-only" state; reconciliation checks no content verdict | `component-model.ts:651-695`; test FD-05 | no (but lets unapproved names through) | honour the verdict in the services case, or add an offer verification status; add a `content_verdict` domain to `decision-execution.ts` |
| FD-06 | The placeholder check counts only `data-content-slot`; 49 "description to be supplied" markers and the unavailable notice are invisible to it | `build-evidence.ts:302`; test FD-06 | no (but a gate blind spot) | mark pending details and unavailable notices with the slot attribute, or count their classes in `parseServedHtml` |
| FD-07 | Service-business vocabulary: a menu renders under "Services"; the compact nav toggle is labelled "Menu", which collides with the restaurant's menu | served HTML; Q10 | no | derive the section heading from the offer kind or an owner label; name the toggle "Site menu" or "Navigation" |
| FD-08 | Baseline `location` is not canonicalised with `location_and_contact`; reported unallocated while delivered | `pipeline.ts` SECTION_ALIASES; test FD-08 | no | add `location: "location_and_contact"` |
| FD-09 | Approving the proposition draft makes generation throw ("an approved draft was not rendered"); verified `propositionText` is silently not rendered, because the derived `drive_footfall` home page has no proposition section | tests FD-09 (both files) | **YES** | allocate `proposition` to every home page (DD-031 already requires what/why), or record an unrenderable approved value as `unavailable` with its reason instead of throwing or dropping it |
| FD-10 | No food-service or restaurant industry; `hospitality` assumes lodging (booking, amenities, image-led high expression) | T2 comparison | no (workaround: `local_business`) | add a food-service industry mapped to a local-business-like baseline with menu, hours and location required |
| FD-11 | Selected patterns are never rendered, and reconciliation has no pattern domain (recurs from Ashvattha) | `patternsUsed = []`; test FD-11 | no | a `pattern` integrity domain: a selected pattern is used or recorded unavailable with a reason |
| FD-12 | A single-page site's home is scored an orphan (no inbound link) | score sheet SEO | no | exempt `/` from the inbound-link requirement |
| FD-13 | `businessName` has no verification state; SEO provenance says "composed from the verified business name" and DD output says `verified_name_wordmark` for an unverified name | digest `seo.pages[0].title.source` | no | a name status in the contract; "supplied" wording until verified; a name-confirmation approval |
| FD-14 | The `hours` section always renders "Hours to be supplied." (generic default case) even when verified hours are supplied and rendered in the contact block; the content gate's placeholder blocker can never clear for local_business / drive_footfall | `component-model.ts:972-973` vs `:833`; simulation FD-14 | **YES** | an `hours` case that renders `contact.hours` when present and hides the section otherwise |
| FD-15 | Supplying dish descriptions derives one indexable "service" page per dish (49), each typed `Service` and asking for `Article` data — thin-page proliferation and wrong schema for a menu | simulation FD-15 | **YES** (thin duplicate pages; wrong structured data) | DD-093 should not derive hubs for `kind: product` offers below a content threshold, and should never type a dish as `Service` |
| FD-16 | A secondary objective without an owner page is derived at a URL named after the internal objective id (`/generate-leads`) | simulation FD-16 | no | derive slugs from a visitor-facing label; never from an enum id |

## 21. Customer Input Gaps
Classification CUSTOMER_INPUT_MISSING (`missing/`), with the ones that block a first publishable
page marked **bold**:

| Group | Gaps |
|---|---|
| Identity | **final approver (M-02)**, branches, team, founding |
| Location/contact/hours | **address (M-07)**, map, **at least one of phone, WhatsApp or email (M-09 to M-11)**, **hours (M-12)**, "Full Day" |
| Service model | dine-in/takeaway/delivery, ordering, delivery, reservations, payments, offers |
| Menu meaning | partial rows, categories, veg/non-veg per item, ingredients/allergens, descriptions, portions and combo contents, tax inclusion, maintenance owner |
| Brand | **original logo artwork (M-31)**, fonts, photographs |
| Proof | reviews, testimonials, awards, social accounts |
| Intent | **objective (M-40)**, **audience (M-41)**, pages, whether filters are wanted, languages, deadline |
| Technical | privacy policy, **domain (M-49)**, analytics/consent, enquiry owner |

## 22. Approval Gaps
CUSTOMER_APPROVAL_REQUIRED:

| ID | Approval | Note |
|---|---|---|
| A-01 | name | |
| A-02 | menu publishable | |
| A-03 | tagline | |
| A-04 | logo authenticity and use | the C2PA finding makes this the first question to ask |
| A-05 | brand seed | |
| A-06 | theme | |
| A-07 | names and spelling | |
| A-08 | prices | not publishable through the framework even when approved: FD-03 |
| A-09 | objective | |
| A-10 | audience | |
| A-11 | AD-01 | approval currently throws: FD-09 |
| A-12 | AD-02 | |
| A-13 | design direction | |
| A-14 | page set | |
| A-15 | filters and dietary data | |
| A-16 | authorisation of the files | |

## 23. External Dependencies
EXTERNAL_DEPENDENCY:
- **M-47:** the restaurant's jurisdiction and food-business licence details, and which
  menu-display rules apply. Secondary summaries of India's FSSAI Labelling and Display Regulations
  2020 describe per-dish veg/non-veg marks, and allergen and calorie display, for some
  establishments. These are not the regulator's text, and applicability to Jalsa is unknown.
- **M-50:** hosting and deployment owner.

## 24. Human Assessment Requirements
HUMAN_ASSESSMENT_REQUIRED:

| ID | Assessment |
|---|---|
| H-01 | screen-reader pass — not performed |
| H-02 | visual and brand fit of the page |
| H-03 | confirmation that the restaurant supplied and authorised the files |
| H-04 | WCAG 1.4.8, 2.4.9, 3.1.5 |
| H-05 | transcription judgments T2 (industry) and T9 (objective) |
| H-06 | physical devices |

**EVIDENCE_GAP** (separate class):
- field performance and a stable INP distribution;
- C2PA signature validation (parsed, not cryptographically validated);
- the original menu the table was transcribed from (M-21);
- the relation of the document author metadata to the restaurant (F-020);
- a local competitor teardown (no location).

**POLICY:**
- the workflow has no stop condition when the request itself is unknown (L-01);
- the decision matrix has no feasibility gate (S4/S5 winners that cannot be built; recurs from
  Ashvattha);
- no reviewer-preview mode for illustrative material;
- robots `index,follow` is emitted while the content gate fails (publication is gated elsewhere).

**NOT_APPLICABLE:** Supabase review; forms; interactive experiences; sign-language media; logo
contrast (no logo image).

## 25. Production Blockers

### The most important test
> **Could this website be published safely if the customer supplied all currently missing
> information and approvals?**

**No.** This was tested with complete synthetic input (every missing fact supplied and verified
with FIXTURE values) in `tests/scenarios/jalsa-completeness-simulation.test.ts`. Even then:

| Framework capability preventing publication | Result with complete input |
|---|---|
| **Price values (FD-03)** | a verified, approved menu still shows no price |
| **Menu structure (FD-04)** | no categories and no dietary marks. If per-dish veg/non-veg marks are legally required (M-47), the framework cannot display them at all |
| **Hours section (FD-14)** | "Hours to be supplied." persists beside the real hours; the placeholder blocker keeps the content gate failing |
| **Proposition allocation (FD-09)** | the approved headline is either dropped silently (supplied copy) or crashes generation (approved AI draft) |
| **Per-dish pages (FD-15)** | 49 thin indexable "service" pages typed `Service` |

Two further defects mean the production gate cannot be trusted to stop an **unapproved** menu:
- FD-05: offer names ignore the verification verdict;
- FD-06: 49 pending markers are not counted as placeholders.

### Blockers today, by class
| Class | Blockers |
|---|---|
| FRAMEWORK_DEFECT | FD-03, FD-04, FD-05, FD-06, FD-09, FD-14, FD-15 (publication-relevant); FD-01, 02, 07, 08, 10, 11, 12, 13, 16 (quality and provenance) |
| CUSTOMER_INPUT_MISSING | approver, address, a contact method, hours, objective, audience, domain, logo artwork, and the menu meaning items (§21) |
| CUSTOMER_APPROVAL_REQUIRED | A-01…A-16 |
| EXTERNAL_DEPENDENCY | jurisdiction and licence display rules; hosting |
| HUMAN_ASSESSMENT_REQUIRED | H-01…H-06 |
| EVIDENCE_GAP | field performance, C2PA validation, original menu |

## 26. First-Level Reviewer Actions
**What you can do now** (review, not approval — `approvals/approval-register.md` §B):

| # | Action |
|---|---|
| 1 | **R-07 first:** decide whether the logo's C2PA finding ("may have created or modified", origin unknown) must be raised with the restaurant before anything else |
| 2 | **R-01:** spot-check `evidence/menu-source-extraction.md` against the .docx |
| 3 | **R-03:** confirm withholding rows 36, 51 and 52 |
| 4 | **R-04 / R-05:** judge `local_business` and `drive_footfall` as provisional classifications to take to the restaurant |
| 5 | **R-02:** confirm the refusals, especially no veg/non-veg inference |
| 6 | **R-08:** revise or reject AI drafts AD-01 and AD-02. You may reject; only the restaurant approves |
| 7 | **R-10:** turn `missing/missing-information-inventory.md` §§1-2, 4, 7 into the question list for the restaurant |
| 8 | **R-11 / R-12:** check FD-01…FD-16 against `generated/static-site/index.html`, the screenshots and the simulation test |
| 9 | Record feedback in the §B log; it will not change any §A status |

**Only the restaurant can approve:** everything in §22, and the authorisation that these files are
its material for its website.

## 27. Final Readiness Status

# FRAMEWORK BLOCKED

The customer's input is also incomplete, and every approval is pending, so the site is blocked on
both counts. The deciding fact is the one §25 tested: with complete, approved input the framework
still cannot publish a restaurant's priced, categorised menu, and its hours section can never pass
the content gate.

**Not READY FOR HUMAN PRE-LAUNCH REVIEW.** The technical, accessibility, responsive, performance
and design gates pass, but technical passes are not production readiness.

**Before launch, in order:**
1. **Restaurant:** confirm authorisation (A-16), logo authenticity (A-04) and that the menu is real
   and publishable (A-02); name the final approver (M-02).
2. **Restaurant:** supply address, one contact method, hours, objective, audience, domain,
   per-item categories and veg/non-veg values, clarified partial rows, and original logo artwork.
3. **Framework:** fix FD-14, FD-09, FD-03, FD-04 and FD-15 (publication), then FD-05 and FD-06
   (gate trust). Re-run `npm run gate` and `npm run host:e2e`.
4. **Restaurant:** approve drafts, names, prices, brand seed, theme and design direction; approvals
   recorded in `approved/` and the seam record together.
5. **External:** confirm the jurisdiction's menu-display rules (M-47).
6. **Human:** screen-reader pass (H-01), brand review (H-02), physical devices (H-06).
7. Re-run the dry run. Only then is READY FOR HUMAN PRE-LAUNCH REVIEW possible.

## 28. Lessons for Framework Improvement

| # | Lesson |
|---|---|
| L-01 | **Real input can be files with no words.** Every synthetic run began from a brief. The workflow assumes a request narrative, and the input contract makes four narrative facts mandatory. The framework needs an explicit "request unknown" intake path that produces a question list instead of forcing inference (FD-01, FD-02). |
| L-02 | **The service-business model does not generalise to a menu.** Prices, categories, portions and dietary attributes are the substance of a restaurant site. Four defects (FD-03, 04, 14, 15) sit on that one gap, and none was visible in Ashvattha or Verdaleen, because professional services have no priced catalogue and no hours section. |
| L-03 | **Provenance of files, not just facts.** The C2PA manifest was the most important finding about the logo, and the framework has nowhere to record file-level provenance. The asset gate refused the logo for the right reason (unverified), but by accident: it did not know why. |
| L-04 | **The closed register cannot express provenance.** The strongest checks in this run (served-text ledger, raw hashes, synthetic-value prohibition, draft absence) had to be written as test code. A `provenance.served_text_classified` register check would make them part of every customer run. |
| L-05 | **Skills are UniqBrio/SaaS-shaped.** No restaurant, menu or food-service skill exists; the local catalogue's restaurant answer is a template. |
| L-06 | **"Approve" must be tested on real architecture.** The draft channel worked on synthetic data, and crashed the first time a real customer's derived architecture lacked the target section (FD-09). Approval paths should be exercised per derived page model, not per channel. |
| L-07 | **Gates can pass while the page is unfit.** Integrity was "consistent" and the placeholder count was 1 while the served page carried 49 pending markers and two never-rendered patterns (FD-05, FD-06, FD-11). Consistency checks need the content verdict and pattern domains. |

### Comparison with the synthetic dry runs (final `host:e2e`, same tree)
| | **Jalsa (real)** | Ashvattha (representative brief) | Verdaleen (fixture) | Engagement hosts (4 fixtures) |
|---|---|---|---|---|
| Input | 2 files, no words | written brief with objectives, pages, email | fixture business input | fixture inputs + verified formulas/rules/comparison data |
| Dataset classification | **unmarked** | synthetic | synthetic | synthetic |
| Contract fields forced by inference | industry, description, audience, objective | industry, personality, slugs | none (authored) | none (authored) |
| Pages | 1 (derived) | 8 | 5 | per fixture (not compared) |
| Engagement | NO_EXPERIENCE (requested idea rejected) | NO_EXPERIENCE | — | calculator, assessment, selector, comparison delivered and operated in both engines |
| Gates (tech / a11y / resp / perf / content / design) | ✔ / ✔ / ✔ / ✔ / **✘** / ✔ | ✔ / ✔ / ✔ / **✘ (INP 224 ms)** / ✘ / ✔ | ✔ / unknown (AAA human criteria) / ✔ / ✔ / ✘ / ✔ | ✔ / ✔ / ✔ / ✔ / ✘ / ✔ (all four) |
| Level / score | technically_working / 72 | technically_working / 77.25 | technically_working / 71.1 | — |
| Integrity ledger | 9 delivered, 6 unavailable, 0 mismatch | 34 / 4 / 0 | — | — |
| New defects exposed | **16** (FD-01…FD-16) | P1 set (closed before this run) | — | — |

**What the synthetic runs could not show:**
- **They had words.** Every contract-required field had an author (L-01).
- **Their business model matched the framework's.** Services with descriptions and no priced
  catalogue (L-02).
- **Their assets had no file provenance** to question (L-03).
- **Their approvals never met a derived architecture** that lacked the target section (L-06).

Ashvattha's representative brief was built to be realistically incomplete. It still arrived
shaped like a request.

### Regression on the final tree
| Command | Result |
|---|---|
| `npm run host:e2e` | **PASS** — 4 test files, 4 tests: jalsa 108 s, verdaleen 201 s, ashvattha 282 s, engagement 451 s. Collected 13:25:40-13:25:44Z |
| `npm run gate` (run after `host:e2e`) | **PASS** — typecheck clean; 28 test files, **764 tests** passed; framework audit 11 checks, 0 FAIL, 2 WARN (un-tokenized literals reverse check; mapped skills installed locally), 1 ACCEPTED |

**Evidence freshness:**
- A SHA-256 fingerprint of every generation-affecting input (`src/`, `tests/`, package and
  TypeScript/Vitest configs, Jalsa raw files, extraction, fact register and extraction tool) was
  taken before the final `host:e2e` and again after it: identical (`d1164e56…a233`).
- The only files `host:e2e` writes are generated hosts, digests and the register sections of the
  seam records.
- No stale evidence is cited: every host number above is from the final run, except the two
  earlier Jalsa runs shown explicitly as variance.

**Nothing was committed or pushed.**

---

## 29. Addendum — re-run after remediation (2026-09-16)

Everything above records the run of 2026-09-15 and is unedited. This section records the repeat run
on the remediated framework. **Nothing about the customer changed**: same two raw files (SHA-256
unchanged), same 30 facts, no new fact, no approval granted, no approver appointed.

### 29.1 Final readiness status

> **CUSTOMER INPUT OR APPROVAL BLOCKED**
>
> The framework can now build and publish this restaurant's website safely. It does not, because
> the restaurant has not supplied a verified address, a contact route, opening hours, a
> proposition, an audience or an objective, has not authorised its menu for publication, and has
> appointed no approver. Every remaining blocker is the customer's to clear.

### 29.2 What changed in the result

| | 2026-09-15 | 2026-09-16 |
|---|---|---|
| Status | FRAMEWORK BLOCKED | **CUSTOMER INPUT OR APPROVAL BLOCKED** |
| Gates (tech / a11y / resp / perf / content / design) | ✔ ✔ ✔ ✔ **✘** ✔ | ✔ ✔ ✔ ✔ **✘** ✔ |
| Level / weighted score | technically_working / 72 | technically_working / **73.5** |
| Menu items published | 49 names, from a source marked "For design illustrations only" | **0** — withheld by the publication policy |
| Placeholder accounting | 1 slot counted while 49 pending markers were served | **4 slots + 1 pending marker**, all counted |
| Patterns selected | 2, rendered on no page, budgeted | **0** (`patternsUsed: []`, 14 rejected with reasons) |
| Integrity ledger | 9 delivered / 6 unavailable / 0 mismatch | **10 / 54 / 0** — every withheld value now recorded, not silent |
| Generation publication blockers | mechanism did not exist | **`[]`** — nothing approved was dropped |
| Served-text provenance | 54 customer / 10 framework / 0 unclassified | 5 customer / 11 framework / **0 unclassified** |
| Test register | — | 9 PASS, 3 FAIL, 1 BLOCKED (no experience was delivered, so none was operated) |

### 29.3 Why the content gate still fails — and why that is correct

Three blockers, recorded verbatim from the digest:

1. `blocked conversion path(s): drive_footfall (needs verified: addresses; DD-101)`
2. `measured: none of 1 served page(s) offers a completable conversion action … so drive_footfall (directions_and_call) cannot convert`
3. `measured: 1 indexable page(s) serve placeholder text a search engine would index: / (4 slots, 1 pending marker)`

Every one is a **missing customer fact**: the address, a contact method, the opening hours, the
proposition, the audience. None is a framework limitation, and none can be cleared by the framework
without inventing something. The four slots say so on the page itself, in the owner's words to
supply — not in invented copy.

### 29.4 The menu, and the restriction that governs it

The 49 dish names are withheld, and the ledger says why, once per item:

> `source "menu-docx" is not authorised for publication: "For design illustrations only" — a source restriction overrides verification`

This is the FD-05 policy as the owner stated it: an owner-stated name may publish literally **only
when the source itself is authorised for publication**, and a document marked "design illustration
only" is not. If the restaurant confirms the menu is its real, current menu and authorises its
publication, the same 49 names publish with no framework change — and prices publish only when the
individual values are verified (FD-03).

### 29.5 What is now the customer's to clear

Unchanged from §22 in substance, but now the *only* thing standing between this site and
publication:

- **Facts:** verified address; at least one contact route (phone / email / WhatsApp); opening hours;
  the business's own statement of what it does; who it is for; what the site is for.
- **Authorisations:** the menu document authorised for publication (or a menu that is);
  confirmation that "Jalsa Restaurant" is the trading name; the logo's origin, since its C2PA
  credentials do not establish it.
- **Approvals:** an appointed approver, and that approver's decision on the two held AI drafts.
  **CUSTOMER_APPROVAL_REQUIRED — still PENDING.** I remain a first-level reviewer only.

### 29.6 Verification of this addendum

| Check | Result |
|---|---|
| `npm run gate` (final tree) | PASS — typecheck clean; 33 test files, **830 tests**; audit 11 checks, 0 FAIL, 2 pre-existing WARN, 1 ACCEPTED |
| `npm run host:e2e` (final tree) | PASS — 4 of 4: jalsa 101 s, verdaleen 206 s, ashvattha 278 s, engagement 462 s |
| Raw files | SHA-256 identical to 2026-09-15: `878b5c95…5e18`, `2f7fc234…fa17` |
| Inputs frozen across the host run | No file under `src/`, `tests/`, `customers/jalsa-restaurant/raw/` or `…/evidence/` has a modification time later than the last source edit at 07:01Z; the digest was collected at **07:02:41.596Z**, after it. Fingerprint of the final tree: `f20de067…3ce8` |
| Screen reader | **Not claimed.** No screen-reader evidence exists; the accessibility gate is axe + measured criteria only |
| Commits | None. Nothing committed, nothing pushed |

Remediation detail: `docs/FRAMEWORK-REMEDIATION-PLAN.md` and
`docs/FRAMEWORK-REMEDIATION-IMPLEMENTATION-REPORT.md`.
