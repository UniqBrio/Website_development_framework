# Framework remediation plan — defects from the first real-customer dry run

**Date:** 2026-09-15
**Input:** `docs/FIRST-REAL-CUSTOMER-DRY-RUN-REPORT.md` (Jalsa Restaurant), its workspace records, and a
re-read of the code behind each defect.
**Status:** PLAN ONLY. No code, test, customer fact or approval was changed to write it.
Nothing is committed.

**Purpose.** Fix the framework so its publication gates can be trusted and its content model can
represent real businesses. Making Jalsa pass is **not** the goal; Jalsa is re-run only at the end, as
a check.

**Invariants every step must preserve** (a fix that weakens one is rejected):
1. No invented customer facts.
2. No synthetic fixture leakage.
3. No unverified PII publication.
4. No unverified dietary claims.
5. AI drafts cannot enter customer HTML without explicit approval.
6. Customer approval stays separate from framework readiness.
7. Raw customer input stays untouched.
8. NO_EXPERIENCE stays valid unless evidence establishes an experience.

---

## 1. Summary

The 16 defects come from **four root causes**, not sixteen. The most important is the answer to the
question this plan was asked to examine.

> **Is the generic content model sufficient for industry-specific entities such as restaurant menus?**
>
> **No — and the gap is structural, not a missing field.**
>
> - **The decision layer outruns the content layer.** The engine can emit about 80 section ids,
>   while the generator has renderers for 21 (plus aliases). **Nine of the fourteen website
>   objectives require at least one section that has no renderer and no content field**, so those
>   sites can only ever show "… to be supplied." (§2.1).
> - **The one entity the model has is too thin.** The offer (`servicesProducts[]`) is a name plus an
>   optional description, with no id, group, price value, variant, portion or typed attribute.
> - **Verification lives at the wrong grain.** It is recorded per content category (`pricing:
>   verified_available`), never per value. A price can be marked verified, but no field can hold it.
> - **Why the synthetic runs never showed this.** Ashvattha and Verdaleen are service businesses
>   whose objectives all happen to have renderers.
>
> A restaurant menu is not special. It is the first real input shaped like a **catalogue**: grouped
> items with prices, variants and regulated attributes. Retail, salons (service price lists), clinics
> (fee schedules), education (programmes and fees) and hospitality share that shape.
>
> **Recommendation:**
> - **Add:**
>   - a generic catalogue entity model;
>   - per-value provenance;
>   - a single section contract;
>   - structured-data mapping by entity kind;
>   - industry profiles that declare which attributes exist and which are regulated.
> - **Reject:** a bespoke "restaurant menu" type in core. It would recreate the industry-special-case
>   pattern `objective-architecture.ts` was written to remove, and would leave the other eight
>   objectives broken.

**Recommended order** (§E): make the gates trustworthy → fix the contracts → add per-value provenance
→ add the catalogue model → add industry vocabulary → re-run everything.

---

## 2. Root-cause clusters

| Cluster | Root cause | Defects |
|---|---|---|
| **R1 — Decision vocabulary outruns the content model** | Sections, industries and objectives are decided from vocabularies far larger than what the content schema can hold or the generator can render, and no contract requires every decidable section to have a content source, a verification binding and a renderer. The only entity is a service-shaped offer. | FD-03, FD-04, FD-07, FD-08, FD-10, FD-14, FD-15 |
| **R2 — Verification at the wrong grain** | Provenance is recorded per content category (`availableContent.*`) or as booleans (`customerSupplied`, `priceKnown`), not per value. Contract-required fields carry no basis at all. A source document cannot carry a publication restriction. Per-value provenance already exists, but only for AI drafts and engagement data (`provenanceRecordFields`). | FD-01, FD-02, FD-05, FD-13 (and the price and attribute side of FD-03 and FD-04) |
| **R3 — Page composition depends on the objective, not on page invariants** | What a home page contains depends on which objective it serves. There are two home-derivation paths with different rules (`page-spec.ts:516-533` vs `:557`). Derived routes and inbound-link rules assume multi-page sites. | FD-09, FD-12, FD-16 |
| **R4 — Integrity and gate blind spots** | A missing value is encoded as free text in a presentational field (`detail`) and class, not as a typed node. The reconciliation ledger has no domain for content verdicts, supplied values or selected patterns. Pattern selection does not know whether a generator can render a pattern. | FD-05 (reconciliation part), FD-06, FD-09 (silent-drop part), FD-11 |

### 2.1 Measured renderer gap (R1)
Objective-required sections compared with renderer cases in `component-model.ts` (aliases counted as rendered):

| Objective | Required sections without a renderer |
|---|---|
| sell_subscriptions | plans |
| start_free_trial | product_proof |
| request_demo | product_proof, demo_request |
| recruit | roles, culture, application |
| showcase_work | work_index, work_detail |
| **drive_footfall** | **hours** (FD-14) |
| publish_content | article_index, article_detail |
| raise_funds | cause, impact, donate |
| provide_support | help_index, contact_support |
| generate_leads, book_appointments, sell_products, build_credibility, educate | none |

`price` has a case, but it can only ever render a slot, because no price value exists (FD-03). So
`sell_products` and `sell_subscriptions` also cannot clear the content gate once pricing is verified.

---

## 3. Contracts and models that must change

| # | Contract / model | Today | Required change | Fixes |
|---|---|---|---|---|
| C1 | **Section contract** (new, one registry) | Section ids scattered across baselines, rules and objectives; `canonicalSection` aliases; a `switch` in `component-model.ts` with a default slot; `verification.ts` BINDINGS; `SECTION_OWNERS` | One registry entry per canonical section id: aliases, content source, verification binding, renderer, owning page role, visitor-facing label, and behaviour when content is missing (slot), unverified (hidden/withheld) or unsupported (explicit `unavailable` + publication blocker). A test fails if any id emitted by a baseline, rule or objective has no entry. | FD-07 (labels), FD-08, FD-14; exposes §2.1 |
| C2 | **Per-value provenance** | Category statuses; `customerSupplied` and `priceKnown` booleans; no basis on objective, audience or name; provenance records only for drafts and engagement values | Reuse `provenanceRecordFields` (`customer_supplied_verified`, `customer_supplied_unverified`, `ai_draft`, `approved_ai_draft` + approval, …) for business facts: name, offers, prices, attributes, hours, contact values. Add a **source record** with an optional `publicationRestriction` (e.g. "design illustration only"). Inventory statuses become DERIVED from value provenance, strictest wins, so there is one authority (the rule `engagement-values.ts` already applies). | FD-01, FD-02, FD-05, FD-13; foundation for FD-03/04 |
| C3 | **Catalogue entity model** | `offerSchema`: name, kind, description?, customerSupplied, priceKnown, regulated | `offers[]` gains: stable `id`; `groupId`; `variants[]` (name, portion/unit); `price` (amount, currency, unit, tax note); `attributes[]` (key from a governed vocabulary, value, provenance). New `offerGroups[]` (id, name, order, provenance). Every value carries its own provenance. **Values are never inferred** (no veg/non-veg from a dish name). All new fields optional: existing inputs parse unchanged. | FD-03, FD-04 |
| C4 | **Attribute vocabularies by industry profile** | none | A profile declares which attribute keys exist (e.g. `dietary.vegetarian_mark`, `allergens`, `spice_level` for food service), which are **regulated** (display only when verified; never AI-drafted; never defaulted) and which a jurisdiction may make mandatory. Vocabularies are data, not code paths. | FD-04 (dietary), FD-10 |
| C5 | **Page composition contract** | Home sections copied from the site-primary objective; derived routes `/${objective}`; orphan = no inbound link from another page | A home invariant independent of objective: identity + proposition (DD-031 already requires what/why on every page). Derived routes slugged from a visitor-facing label, never an enum id. `/` as primary entry is exempt from the inbound-link rule; every other page keeps it. | FD-09, FD-12, FD-16 |
| C6 | **Integrity and evidence contract** | Placeholders = `data-content-slot` only; ledger domains: home_route, page, section, conversion, navigation, dependency, content_draft, engagement, rule_precedence | ONE typed "missing value" node kind, rendered with one attribute (e.g. `data-content-pending="<reason>"`) by both emitters, and counted by `parseServedHtml`. New ledger domains: `content_verdict` (renderer honoured the verification verdict), `supplied_value` (every supplied or approved value rendered, or recorded unavailable **as a publication blocker**) and `pattern` (selected pattern used, or unavailable with a reason). | FD-05, FD-06, FD-09, FD-11 |
| C7 | **Structured-data contract** | Schema type chosen from page SEO role and content category (`Service` if services render; `Article` on detail pages) | Schema type from **entity kind** and verified fields: service → `Service`; product → `Product`/`Offer` (only with a verified price); food-service catalogue → `Menu`/`MenuSection`/`MenuItem` (only when groups and items are verified); `Article` only for article content. DD-093 derives hub pages by entity kind and content depth, not for every offer with a description. | FD-15 |
| C8 | **Pattern registry contract** | Selection does not know which patterns the generator implements; only 8 section→pattern mappings exist | Each pattern declares `implementedBy` (the renderer, or none). Selection gate: a pattern without a renderer cannot be selected, only recorded. The performance budget counts only implementable selections. | FD-11 |
| C9 | **Industry vocabulary** | No food-service value; `hospitality` implies lodging | Add a food-service industry mapped to a baseline requiring location, hours, contact and catalogue, with attribute vocabulary C4. | FD-10 |

---

## A. Framework defects that must be fixed

All 16 are confirmed. Each entry gives the ten points requested.

Abbreviations used in the entries:
- **JRC** = `tests/scenarios/jalsa-real-customer.test.ts`;
- **SIM** = `tests/scenarios/jalsa-completeness-simulation.test.ts`;
- **"Blocks"** = blocks safe publication even with complete input.

Classification vocabulary: data model/schema · extraction/fact model · approval model · rendering ·
content gate · structured data · test/gate integrity · customer-input issue.

### FD-03 — Price representation (blocks)
1. **Defect.** A verified price cannot be published. `pricing: verified_available` plus
   `priceKnown: true` still renders no price. `pricing` is in `NEVER_GENERATED`, and no schema field
   holds a price value.
2. **Root cause (R1 + R2).** Status-without-value, the fourth instance of the class
   `content-values.ts` names (after canonical origin, brand seed and copy). Pricing was placed in
   `NEVER_GENERATED` to stop a second route past `verifyContent`, but no verified route was ever
   built. The inventory says prices exist and are verified, and nothing carries the prices.
3. **Classification.** data model/schema · rendering · structured data · approval model.
4. **Smallest correct fix.** Depends on C2 and C3.
   - Add a `price` value on offers or variants, carrying its own provenance record.
   - Render it only when the price's own provenance is `customer_supplied_verified`, the `pricing`
     inventory status is verified (strictest wins) and DD-102 allows it.
   - Refuse drafts for prices: the draft target regex never includes price.
   - Emit `Offer` JSON-LD only from verified prices.
   - Change `NEVER_GENERATED` to mean "never generated or drafted; published only from verified
     values", keeping it as a guard list.
5. **Pinning tests.** JRC "FD-03"; SIM "FD-03".
   - **Must keep their intent:** `generator.test.ts:203-214` (no fabrication category rendered;
     `NEVER_GENERATED` ↔ `NEVER_FABRICATE` parity) and `rule-expansion.test.ts:856`.
6. **New regression tests** (synthetic):
   - unverified price → absent;
   - AI-drafted price → rejected;
   - verified price without a verified `pricing` status → absent;
   - price on an unknown offer → refused;
   - verified price → rendered beside its item, with `Offer` JSON-LD;
   - DD-102 still hides pricing cards when unverified;
   - no currency is inferred.
7. **Dependencies.** C2 (value provenance), C3 (entity model), FD-06 (a price slot must be counted),
   C1 (price renderer contract).
8. **Synthetic-only.** Yes.
9. **Risk to invariants.** **Highest in the plan.** It opens a publication route for an evidence
   category (invariant 1). Mitigation: verified-only; strictest-wins; drafts refused; the negative
   tests above written before the positive one.
10. **Other workspaces.** Additive schema: Ashvattha and Verdaleen inputs parse unchanged. Verdaleen
    (`sell_products`) keeps a price slot until it supplies values. Engagement `price_estimator` data
    kinds are unaffected.

### FD-04 — Menu / category / portion / dietary representation (blocks)
1. **Defect.** A menu cannot be represented. Categories, portions, variants and dietary values have
   no home, and are dropped at the seam. Menus render as one flat list.
2. **Root cause (R1).** The only entity is a flat, service-shaped offer. There is no grouping, no
   variant, no typed attribute, and no vocabulary governing regulated attributes.
3. **Classification.** data model/schema · extraction/fact model · rendering · structured data ·
   customer-input issue. Jalsa's dietary values do not exist; the framework must not need them in
   order to render structure.
4. **Smallest correct fix.** C3 + C4.
   - `offerGroups[]` and `offers[].groupId` → a grouped renderer: a heading per group, list items
     beneath.
   - `variants[]` for portions such as "1 pc", "Half" and "Full".
   - `attributes[]` keyed by the profile vocabulary, each with provenance; **regulated attributes
     render only when verified, never from inference, never as AI drafts**.
   - Items with no group render in an explicit "ungrouped" list; nothing is guessed.
   - The static alternative "offers grouped by need, with filters as plain links" becomes producible
     from verified groups.
5. **Pinning tests.** JRC "FD-04"; SIM "FD-04".
6. **New regression tests** (synthetic):
   - grouped rendering with headings;
   - an item in two groups when the source says so, or a refusal when the source is ambiguous;
   - unverified dietary attribute → absent;
   - attribute key outside the vocabulary → refused;
   - no inference: an item named "FIXTURE Veg Thing" gets no vegetarian mark;
   - `product_service_finder` still rejected unless verified group or attribute data exists
     (NO_EXPERIENCE preserved);
   - an HTML menu with headed sections (the accessibility research finding).
7. **Dependencies.** C2, C3, C4 → FD-03 (prices attach to items or variants), FD-15 (schema by
   kind), FD-10 (profile), engagement data kinds (`decisionRules`/`productSpecifications` gain a
   verified source).
8. **Synthetic-only.** Yes.
9. **Risk to invariants.** Invariant 4 (dietary). Mitigation: regulated flag, verified-only, no
   inference, negative tests first. Invariant 8: filters stay gated by the existing engagement hard
   gates; verified attributes make a finder *eligible*, never automatic.
10. **Other workspaces.** Additive. Verdaleen's catalogue (`sell_products`) could use groups later;
    no current output changes.

### FD-14 — Hours rendering (blocks)
1. **Defect.** The `hours` section always renders "Hours to be supplied.", even when verified hours
   are supplied and rendered inside the contact block. The placeholder keeps the content gate failing.
2. **Root cause (R1).** `hours` has no renderer case and falls into the generic default slot
   (`component-model.ts:972-973`). The hours value lives on `contactDetails.hours`, gated by a
   verified address, and is rendered only by `location_and_contact` (`:833`). One fact, two
   sections, one renderer. The same default-slot fallback affects every section in §2.1.
3. **Classification.** rendering · content gate · data model/schema (hours are modelled as a
   contact sub-field, not a fact with its own status).
4. **Smallest correct fix.**
   - Via C1: an `hours` registry entry whose content source is the resolved hours value.
     - Present and verified → render.
     - Absent → counted slot.
     - When `location_and_contact` on the same page already renders hours → the section is not
       emitted twice.
   - Hours get their own status/provenance (C2), instead of silently inheriting the address status.
   - Generic part: C1's test turns every §2.1 id into an explicit `unsupported → unavailable +
     blocker`, rather than a slot that looks fillable but can never be filled.
5. **Pinning tests.** SIM "FD-14".
6. **New regression tests:**
   - supplied + verified hours → no hours slot, hours rendered once;
   - absent hours → one counted slot;
   - unverified hours → withheld with a reason;
   - registry-coverage test: every section id from baselines, rules and objectives has a registry
     entry.
7. **Dependencies.** C1; FD-06 (the slot must be counted to prove removal); C2 (hours status).
8. **Synthetic-only.** Yes.
9. **Risk to invariants.** Low. Hours are PII-adjacent business facts: publishing only verified hours
   preserves invariant 3. **Do not** "fix" by hiding the section when hours are missing; that would
   mask missing information.
10. **Other workspaces.** Any architecture containing `hours` (local_business, drive_footfall). The
    registry-coverage test will newly report `unsupported` for §2.1 sections. No current synthetic
    host uses them.

### FD-09 — Approved headline publication (blocks)
1. **Defect.**
   - Approving the AI proposition draft makes `generateWebsite` **throw** ("an approved draft was not
     rendered").
   - Verified `propositionText` is **silently not rendered**.
   - Both happen because the derived home page has no proposition section.
2. **Root cause (R3 + R4).**
   - The home page's sections come from the site-primary objective. `drive_footfall` (and 8 other
     objectives) have no `proposition`, while the other home-derivation path always adds it
     (`page-spec.ts:557`).
   - DD-031 requires every hero to answer what/why, but allocation ignores DD-031.
   - The integrity ledger checks approved drafts (so it throws), but has no domain for supplied
     values (so supplied copy vanishes).
3. **Classification.** approval model · rendering · test/gate integrity.
4. **Smallest correct fix.** Two parts, both required:
   - **C5:** every home page carries `proposition` (identity + why), whatever its objective. One
     home composition rule for both derivation paths.
   - **C6 `supplied_value` domain:** a supplied or approved value that no page renders is recorded
     `unavailable`, with the reason, **and added to publication requirements as a blocker**. It is
     never thrown (the whole site fails) and never dropped (approved content silently lost).
5. **Pinning tests.** JRC "FD-09" (throw); SIM "FD-09" (silent drop).
   - **Keep:** `generator.test.ts:236-243` (proposition verbatim on Verdaleen).
6. **New regression tests:**
   - for each of the 14 objectives: a supplied proposition renders on home;
   - an approved draft for a target with no page → recorded unavailable + blocker, no throw;
   - an unapproved draft stays held and absent (invariant 5).
7. **Dependencies.** C5, C6. Related to FD-02 (the hero's `for_whom` line).
8. **Synthetic-only.** Yes.
9. **Risk to invariants.** Invariant 5 is at risk only if the fix changed draft resolution; it must
   not. Replacing a throw with "unavailable" **would weaken safety unless it is a publication
   blocker**, so the blocker is mandatory.
10. **Other workspaces.** Homes objective-led by the 9 objectives gain a proposition section (a slot
    until copy exists). Ashvattha (generate_leads) and Verdaleen (book_appointments) already have one.

### FD-15 — Dish descriptions and structured data (blocks)
1. **Defect.** Supplying 49 dish descriptions derives 49 indexable `/services/<dish>` pages, each
   typed `Service`, each also asking for `Article` data.
2. **Root cause (R1).**
   - DD-093 derives a hub page for every offer with a description, whatever the offer kind
     (`planContentHubs`).
   - Schema type follows page SEO role and content category, not entity kind: `Service` for any
     offer (`artifacts.ts:246-261`), `Article` for any detail page (`:202-204`).
3. **Classification.** structured data · rendering · data model/schema.
4. **Smallest correct fix.**
   - C7: schema by entity kind. `kind: product` is never `Service`; `Article` only for article
     content.
   - DD-093: derive hubs only for offer kinds whose entity warrants a page (services, programmes),
     or above a content-depth threshold. Catalogue items render within their group section.
   - Menu schema only when groups and items are verified.
5. **Pinning tests.** SIM "FD-15".
   - **Keep:** `rule-expansion.test.ts:665-718` (DD-093 for services, including negatives).
6. **New regression tests:**
   - product offers with descriptions → no hub pages, no `Service` type;
   - a service offer still gets its hub (existing test);
   - no `Article` requirement on non-article pages;
   - `Menu`/`MenuItem` emitted only from verified catalogue data.
7. **Dependencies.** FD-04 (entity kind and groups), C7.
8. **Synthetic-only.** Yes.
9. **Risk to invariants.** None, if schema is emitted only from verified entities. The change is
   stricter.
10. **Other workspaces.** Verdaleen (dry-run fixture) has four `kind: product` offers, none with
    descriptions. It gets no hub pages today, but any `Service` JSON-LD emitted for those products
    would be removed or retyped. Ashvattha (services) is unchanged.

### FD-05 — Unapproved dish-name publication (gate trust)
1. **Defect.**
   - Offer names render although the content plan says `services: render=false`.
   - The selection engine deferred the services grid pattern for "missing services" while the
     renderer rendered a services grid anyway.
   - Nothing could record that the source document is "For design illustrations only".
2. **Root cause (R2 + R4).**
   - (a) One `services` verdict is bound to `serviceDescriptions` status, but it is read as "offers
     exist" by the selector and ignored by the renderer (`component-model.ts:651-695`). Two
     consumers, two meanings.
   - (b) Offers carry only `customerSupplied: boolean`, so there is no per-offer provenance and no
     source-level publication restriction.
   - (c) The ledger has no `content_verdict` domain.
   - **Note:** `generator.test.ts:245` deliberately pins "offer names are rendered verbatim". That
     rule is right for owner-stated offers (Ashvattha); the defect is that a *restricted source*
     cannot override it.
3. **Classification.** approval model · extraction/fact model · rendering · test/gate integrity.
4. **Smallest correct fix.**
   - Split the verdict into `offers` (names, from offer provenance) and `offer_descriptions`, so
     each consumer reads the verdict it means.
   - Offers get per-value provenance (C2). Names publish at the literal-descriptive level (current
     behaviour, preserving Ashvattha) **unless their source carries a `publicationRestriction`**, in
     which case they are withheld and listed for approval.
   - Add the `content_verdict` ledger domain (C6).
   - **POLICY decision needed** before implementing: confirm that unverified owner-stated offer names
     may still publish literally.
5. **Pinning tests.** JRC "FD-05".
   - **Deliberate update later:** `generator.test.ts:245-249` (names render verbatim; pending marker
     text).
6. **New regression tests:**
   - restricted source → no offer name in HTML, approval listed;
   - unrestricted owner-stated names → render (Ashvattha behaviour kept);
   - a renderer that ignores a verdict → integrity mismatch (negative control).
7. **Dependencies.** C2 (full); the verdict split and `content_verdict` domain can land first
   (Phase 0).
8. **Synthetic-only.** Yes.
9. **Risk to invariants.** It strengthens invariants 1 and 6. Risk: getting the migration default
   wrong for existing inputs. Legacy `customerSupplied: true` must keep today's rendering; new intake
   records provenance explicitly.
10. **Other workspaces.** Ashvattha offers keep rendering under the policy above; Verdaleen likewise.
    Digests gain ledger entries.

### FD-06 — Placeholder detection (gate trust)
1. **Defect.** The placeholder check counts only `data-content-slot`. The 49 "description to be
   supplied" markers and the unavailable notice are invisible, so the gate reported 1 slot on a page
   with 49 pending markers.
2. **Root cause (R4).**
   - "Missing value" is not a typed node. The component model encodes it as free text in the
     overloaded `detail` field (which elsewhere carries link targets and routes), rendered with the
     presentational class `c-pending`.
   - `c-pending` and `c-unavailable-notice` are **also used for legitimate text**: the no-JavaScript
     notice of delivered experiences (`render/experiences.ts:91`), the unconfigured-endpoint notice,
     and experience fallback notes. So counting by class would be wrong.
3. **Classification.** test/gate integrity · content gate · rendering.
4. **Smallest correct fix.**
   - C6: one typed missing-value node kind (or a `pending` flag on items), emitted by both the static
     and Next emitters with one attribute (`data-content-pending`, with a reason).
   - `parseServedHtml` counts it alongside slots, in `analyseIndexability` (one implementation, read
     by generator and gate).
   - Unavailable-contact notices get the same attribute. Experience JS notices do not.
5. **Pinning tests.** JRC "FD-06"; SIM "FD-14" (asserts `slots: 1`).
   - **Keep intent:** `generator.test.ts:219, 232`; `customer-readiness.test.ts:330` (slot shape).
6. **New regression tests:**
   - N pending item details → N counted;
   - an experience no-JS notice → not counted;
   - static and Next emitters agree on the count;
   - a served page with only pending markers fails the content gate.
7. **Dependencies.** None. **Do this first:** FD-03, FD-14 and FD-09 need it to prove their fixes.
8. **Synthetic-only.** Yes.
9. **Risk to invariants.** None. It is strictly stricter. The false-positive risk on experience
   notices is handled by typing instead of classes.
10. **Other workspaces.** Placeholder counts rise wherever offers lack descriptions or contact is
    unverified: Ashvattha (2 undescribed offers), Verdaleen, engagement hosts. Their content gates
    are already `false`, so only blocker text and digests change.

### FD-01 — Objective has no unknown/basis state
1. **Defect.** `websiteObjective` requires ≥1 value, with no way to say it was inferred. An
   operator's inference enters as if stated.
2. **Root cause (R2).** Contract-required intent fields have no provenance; engagement visitor tasks
   already have a `basis`.
3. **Classification.** data model/schema · approval model · customer-input issue.
4. **Smallest correct fix.** Add an optional `basis: "stated" | "inferred"` (default `stated` for
   compatibility) alongside objectives. `inferred` raises a publication requirement and lowers
   profile confidence. **Keep `min(1)`:** removing it would let a site be built with no purpose.
   Pair with the intake policy "request unknown → question list" (§C).
5. **Pinning tests.** JRC "FD-01/FD-02"; `profile.test.ts:176` (empty objective throws — keep).
6. **New regression tests:** an inferred objective produces an approval requirement and appears in
   provenance; a stated one does not.
7. **Dependencies.** C2 conventions.
8. **Synthetic-only.** Yes.
9. **Risk to invariants.** None, if `min(1)` stays and `inferred` only adds requirements.
10. **Other workspaces.** None; the default keeps existing inputs.

### FD-02 — Audience label rendered as owner-supplied
1. **Defect.** `targetAudience` requires ≥1 entry. DD-031 renders `For <label>` publicly as owner
   text. The operator must invent an audience or render an absence label.
2. **Root cause (R2).** No basis on audience; the hero treats every label as stated
   (`component-model.ts:531-550`).
3. **Classification.** data model/schema · rendering · customer-input issue.
4. **Smallest correct fix.** A `basis` on audience entries. The hero renders `For …` only for
   `stated`; otherwise the existing counted `for_whom` slot. Keep `min(1)`.
5. **Pinning tests.** JRC "FD-01/FD-02"; `profile.test.ts:172` (keep); `rule-expansion.test.ts:300`
   (stated label renders — keep).
6. **New regression tests:** an inferred audience → slot, not text; a stated one → `For …` (existing).
7. **Dependencies.** FD-01 (same convention); FD-06 (the slot is counted); FD-09 (the hero exists on
   home).
8. **Synthetic-only.** Yes.
9. **Risk to invariants.** None; stricter.
10. **Other workspaces.** None by default.

### FD-13 — Business name described as "verified"
1. **Defect.** The SEO title source says "composed from the verified business name". A DD-096 output
   is named `verified_name_wordmark`. The name has no verification state.
2. **Root cause (R2).** `businessName` is a bare string; the wording assumes verification that never
   happened.
3. **Classification.** extraction/fact model · structured data (provenance text) · approval model.
4. **Smallest correct fix.**
   - **Immediate:** say "supplied business name" in `artifacts.ts:420-430` and the asset-policy text.
   - **With C2:** a name provenance record, plus a name-confirmation approval requirement when it is
     unverified.
   - Rename the rule value only with a compatibility alias, because digests and tests read it.
5. **Pinning tests.** None pins the wording. The Jalsa digest shows it.
6. **New regression tests:** an unverified name → provenance text never says "verified"; a
   confirmation requirement is listed.
7. **Dependencies.** C2 for the status part; the wording part has none.
8. **Synthetic-only.** Yes.
9. **Risk to invariants.** None.
10. **Other workspaces.** Provenance strings change in every digest.

### FD-11 — Selected patterns never rendered
1. **Defect.** `perspective-card` and `magnetic-action` are selected, budgeted (6 KB), listed in the
   contract's fallback requirements, and never rendered. Integrity reports "consistent".
2. **Root cause (R4).** The selection engine chooses from the registry without knowing whether the
   generator can render a pattern. `patternForSection` maps only 8 sections to patterns. The ledger
   has no `pattern` domain. The defect recurs from Ashvattha.
3. **Classification.** test/gate integrity · rendering.
4. **Smallest correct fix.** Two steps:
   - (a) C6 `pattern` domain: a selected pattern is used, or recorded unavailable with a reason.
     Reporting only; no output change.
   - (b) C8 `implementedBy` selection gate, so unimplementable patterns are recorded, never selected,
     and never budgeted.
5. **Pinning tests.** JRC "FD-11". Related: `p0-remediation.test.ts:136-141` (decorative patterns
   excluded on low-expression sites — keep).
6. **New regression tests:** a selected pattern with no renderer → ledger unavailable (step a) / not
   selected (step b); fallback requirements list only renderable patterns.
7. **Dependencies.** None.
8. **Synthetic-only.** Yes.
9. **Risk to invariants.** None.
10. **Other workspaces.** Ashvattha's selection and performance plan change at step (b). Verdaleen
    and engagement hosts may too.

### FD-10 — No food-service industry
1. **Defect.** No restaurant or food-service value. `hospitality` assumes lodging: booking,
   amenities, policies, high expression.
2. **Root cause (R1).** The industry enum and appendix-B groups have no food-service group.
3. **Classification.** data model/schema.
4. **Smallest correct fix.** C9: a `food_service` value mapped to a baseline requiring location,
   hours, contact and catalogue, with prohibitions like local business, plus a C4 attribute vocabulary.
   **Only after C1, C3 and C4 exist**; otherwise the baseline would require sections that cannot
   render.
5. **Pinning tests.** None. `profile.test.ts:27` (every industry maps to a group) must include the
   new value.
6. **New regression tests:** baseline and coverage; the food-service baseline requires only
   registry-supported sections.
7. **Dependencies.** C1, C3, C4.
8. **Synthetic-only.** Yes.
9. **Risk to invariants.** None.
10. **Other workspaces.** None.

### FD-07 — Service-business vocabulary
1. **Defect.** A menu renders under "Services". The compact navigation toggle is labelled "Menu",
   which collides with a restaurant's menu.
2. **Root cause (R1).** Section headings derive from section ids (`sectionHeading`); the toggle label
   is hard-coded in both emitters.
3. **Classification.** rendering.
4. **Smallest correct fix.**
   - Headings from the C1 registry label, overridable per entity kind or owner label (a catalogue of
     food items → "Menu" only when the industry profile says so).
   - The toggle labelled "Site menu" or "Navigation" in both emitters.
   - The host validator selects by class (`.c-nav-toggle`), not by text, so it is unaffected.
5. **Pinning tests.** `customer-readiness.test.ts:262-263` (exact label text — deliberate update);
   `tests/scenarios/jalsa-provenance.ts` FRAMEWORK_STRUCTURAL_TEXT allowlist.
6. **New regression tests:** label parity between emitters; heading from the registry label.
7. **Dependencies.** C1.
8. **Synthetic-only.** Yes.
9. **Risk to invariants.** None.
10. **Other workspaces.** The navigation label changes in every generated host and screenshot.

### FD-08 — `location` not canonicalised
1. **Defect.** The baseline's `location` is not an alias of `location_and_contact`; it is reported
   unallocated while location content is delivered.
2. **Root cause (R1).** Aliases live in `SECTION_ALIASES` inside `pipeline.ts`, not in one vocabulary
   (the EG-9 class recurring).
3. **Classification.** data model/schema · test/gate integrity.
4. **Smallest correct fix.**
   - Immediate: add the alias.
   - Proper: C1 owns aliases; `location` is used by the local_business, hospitality and
     sports_fitness baselines.
   - Check whether `location` alone (without contact) is a distinct section; if so, the registry
     says so explicitly.
5. **Pinning tests.** JRC "FD-08".
6. **New regression tests:** every emitted id resolves to exactly one canonical id.
7. **Dependencies.** C1.
8. **Synthetic-only.** Yes.
9. **Risk to invariants.** None.
10. **Other workspaces.** Unallocated-section counts change for local, hospitality and sports
    architectures.

### FD-12 — Single-page home scored as orphan
1. **Defect.** A one-page site's home is flagged an orphan (SEO −2).
2. **Root cause (R3).** Inbound links for `/` come only from other pages (`artifacts.ts:323-326`);
   the post-build observation counts the same way.
3. **Classification.** test/gate integrity · structured data (SEO scoring).
4. **Smallest correct fix.** C5: `/` with SEO role `primary_entry` is reachable by definition. Every
   other page keeps the rule.
5. **Pinning tests.** `seo-artifacts.test.ts:67-72` and `generator.test.ts:181-187` (multi-page, no
   orphan — keep); `stack-a11y-seo.test.ts:254` (penalises orphan — keep for non-home pages).
6. **New regression tests:** single-page home → no orphan; a non-home page with no inbound link →
   still penalised.
7. **Dependencies.** None.
8. **Synthetic-only.** Yes.
9. **Risk to invariants.** Only if the exemption extends beyond `/`; test that it does not.
10. **Other workspaces.** Only single-page sites.

### FD-16 — Derived route named after an enum id
1. **Defect.** A secondary objective without an owner page is derived at `/generate-leads`.
2. **Root cause (R3).** `page-spec.ts:517` builds the slug from `objective.replace(/_/g, "-")`.
3. **Classification.** rendering · structured data (URLs).
4. **Smallest correct fix.** C5: derived slugs from a visitor-facing label per objective or
   conversion surface (e.g. `/contact` for an enquiry page), with collision handling as in DD-093.
5. **Pinning tests.** SIM "FD-16"; `customer-readiness.test.ts:81` (`["/", "/educate"]` —
   deliberate update).
6. **New regression tests:** no derived route equals an objective id; no collision with owner routes.
7. **Dependencies.** FD-09 (the same composition contract).
8. **Synthetic-only.** Yes.
9. **Risk to invariants.** None.
10. **Other workspaces.** Any fixture with derived objective pages; slugs and links change.

---

## B. Customer information and approval requirements (not framework work)

None of these is removed by any fix. Fixing the framework moves Jalsa from FRAMEWORK BLOCKED to
CUSTOMER INPUT OR APPROVAL BLOCKED, and no further.

| Kind | Items | Source |
|---|---|---|
| CUSTOMER_APPROVAL_REQUIRED | A-01 name · A-02 menu publishable despite "For design illustrations only" · A-03 tagline · A-04 logo authenticity (C2PA "may have created or modified") and use · A-05 brand seed · A-06 theme · A-07 names and spelling · A-08 prices · A-09 objective · A-10 audience · A-11 AD-01 · A-12 AD-02 · A-13 design direction · A-14 pages · A-15 filters and dietary data · A-16 authorisation of the files | `approvals/approval-register.md` §A (all PENDING) |
| CUSTOMER_INPUT_MISSING | 42 rows: final approver; address; a contact method; hours; objective; audience; domain; original logo artwork; categories for slash-joined rows; veg/non-veg per item; partial rows 36/51/52; portions and combo contents; tax inclusion; maintenance owner; … | `missing/missing-information-inventory.md` |
| EXTERNAL_DEPENDENCY | jurisdiction and food-licence display rules (M-47); hosting (M-50) | same |
| HUMAN_ASSESSMENT_REQUIRED | screen reader; brand review; supplier authorisation; WCAG 1.4.8/2.4.9/3.1.5; transcription judgments T2/T9; physical devices | approval register §C |
| EVIDENCE_GAP | original menu source; document author relation; C2PA signature validation; field performance | fact register F-020, F-021; report §24 |

Framework work must not pre-fill any of these, and the Jalsa facts stay as recorded
(`evidence/fact-register.json`, 30 entries; 0 VERIFIED).

---

## C. Observations that are not blockers (not defects in the sense of §A)

| Observation | Classification | Recommendation |
|---|---|---|
| The workflow has no stop path when the request itself is unknown (files, no words) | POLICY | Add a "request unknown" intake branch: produce the missing-information question list; build only as a clearly marked dry run. Pairs with FD-01/02. |
| The decision matrix has no feasibility gate (S4/S5 winners that cannot be built; recurs from Ashvattha) | POLICY | Add a feasibility pre-filter: an option blocked on missing input is recorded as the target, never as the buildable winner. |
| Lab INP comes from one scripted click per page; Ashvattha `/about` measured 224 ms vs 96 ms the run before, flipping its performance gate | EVIDENCE_GAP (measurement design) | Repeat interactions per page and gate on the median or worst of N. Do not change the 200 ms policy. |
| robots `index,follow` emitted while the content gate fails | POLICY | Acceptable: publication is gated by the production gate. Optionally emit `noindex` for dry-run hosts. |
| SEO score says "title/description not unique" when the description is correctly withheld | test/gate integrity (wording) | Report "description missing (held for approval)"; keep the deduction. |
| `hospitality` sensitivity run: expression `high` with `visual_asset_quality: none` | design rules | Consider capping expression when no authentic visuals exist; not a blocker (selection gates already defer image patterns). |
| 142.6 KB of the 150 KB route budget is framework runtime on a page with no interactivity | performance | Track; a static-only route strategy for no-JS pages could reclaim it. |
| `favicon.ico` 404 when no verified icon exists | technical (non-blocking) | Emit no request, or a neutral declared icon that asserts no brand. |
| No restaurant, menu or food-service skill; the local catalogue returns a restaurant template | skills | Record in skills_map as a gap; never adopt the catalogue's industry template. |
| No file-level provenance record (the C2PA finding lived only in evidence notes) | extraction/fact model | Add a source-file record (hash, content credentials, origin confidence) feeding asset status. Foundation already exists in C2's source record. |
| The closed test register cannot express provenance checks | test/gate integrity | Add a `provenance.served_text_classified` register check; the Jalsa ledger is the reference implementation. |

---

## D. Cross-customer risks

| Risk | Affected | Mitigation |
|---|---|---|
| **9 of 14 objectives cannot clear the content gate** (§2.1) | any future customer whose site objective is subscriptions, trials, demos, recruiting, portfolio, publishing, fundraising, support or footfall | C1 coverage test makes the gap explicit and blocking now; renderers are added per objective as real customers need them |
| **Price never publishable** | ecommerce, subscriptions, salons, clinics' fee lists, restaurants | FD-03 on C2/C3 |
| **Placeholder counts rise** after FD-06 | Ashvattha, Verdaleen, engagement hosts (gates already `false`) | Expected; review the digest diffs; exclude experience notices by type |
| **Offer-name rendering migration** after FD-05 | Ashvattha, Verdaleen (owner-stated offers) | Legacy default keeps rendering; only restricted sources withhold; POLICY confirmation first |
| **Home pages gain a proposition section** after FD-09 | homes led by the 9 objectives | Slot until copy exists (honest); counted by FD-06 |
| **Selection and budget change** after FD-11(b) | Ashvattha (the same two patterns), possibly others | Run (a) first to see the ledger; then (b) |
| **Derived slugs change** after FD-16 | `customer-readiness.test.ts:81` fixture; any derived objective page | Deliberate test update; no redirects needed (nothing published) |
| **Nav label change** after FD-07 | every host, screenshots, `customer-readiness.test.ts:262`, the Jalsa structural-text allowlist | Validator is class-based; update pinned text deliberately |
| **Verdaleen's four product offers stop being typed `Service`** after FD-15 (no hub pages exist today) | Verdaleen | Correct: products are not services; review the JSON-LD diff |
| **Lab INP instability** | every host | Measurement change (§C), never a policy change |
| **Jalsa defect-pinning tests will fail** as each fix lands | JRC and SIM | Intended: each flip happens in the same change as its synthetic regression tests and names the FD. Jalsa facts, approvals and raw files are never edited to make a test pass. |

---

## E. Recommended implementation order

Ordered by publication safety first (can the gate be trusted? can unapproved content leak?), then
framework correctness, then quality. Each step:
- lands with synthetic regression tests written first;
- flips only its own pinned Jalsa test;
- passes `npm run gate`.

`npm run host:e2e` runs at the end of each phase. No step edits customer facts or approvals.

### Phase 0 — Make the gates trustworthy (no new publication capability)
| Step | Work | Defects | Why first |
|---|---|---|---|
| 0.1 | Typed missing-value marker; count it in `parseServedHtml` | FD-06 | Every later fix must be measurable; today the gate undercounts |
| 0.2 | Ledger domains `content_verdict`, `supplied_value` (unrendered supplied or approved value → unavailable **+ blocker**, no throw), `pattern` (report only) | FD-05 (c), FD-09 (silent-drop and throw), FD-11 (a) | Stops silent loss and crashes; exposes renderer/verdict disagreement |
| 0.3 | Split the `services` verdict into `offers` / `offer_descriptions`; source `publicationRestriction` (after the POLICY decision) | FD-05 (a, b) | Closes the only observed route for unapproved customer material to be published |
| 0.4 | Provenance wording: "supplied" not "verified" business name | FD-13 (wording) | Provenance honesty; trivial |

### Phase 1 — Contracts that decide what can exist on a page
| Step | Work | Defects |
|---|---|---|
| 1.1 | C1 section registry + coverage test (unsupported → explicit unavailable + blocker); move aliases into it | FD-08, FD-14 (generic part), exposes §2.1 |
| 1.2 | `hours` registry entry and renderer, with its own status | FD-14 |
| 1.3 | C5 home composition invariant (proposition on every home); derived slugs from labels; `/` orphan exemption | FD-09, FD-16, FD-12 |
| 1.4 | `basis` on objectives and audience; hero `for_whom` slot unless stated; intake "request unknown" policy | FD-01, FD-02 |

### Phase 2 — Per-value provenance (foundation for catalogue data)
| Step | Work | Defects |
|---|---|---|
| 2.1 | Reuse `provenanceRecordFields` for business facts; derive inventory status from values (strictest wins); legacy compatibility defaults | FD-05 (full), FD-13 (status) |
| 2.2 | Source-file records (hash, content credentials, origin confidence) feeding asset status | §C observation (C2PA) |

### Phase 3 — Catalogue entity model
| Step | Work | Defects |
|---|---|---|
| 3.1 | `offerGroups`, `groupId`, `variants`; grouped renderer; engagement static alternative producible | FD-04 (structure) |
| 3.2 | Price values on items or variants, verified-only, drafts refused; `NEVER_GENERATED` redefined as never generated or drafted | FD-03 |
| 3.3 | C4 attribute vocabularies with a regulated flag (dietary, allergens); verified-only; no inference | FD-04 (attributes) |
| 3.4 | C7 structured data by entity kind; DD-093 hubs by kind and depth | FD-15 |

### Phase 4 — Vocabulary and quality
| Step | Work | Defects |
|---|---|---|
| 4.1 | C9 `food_service` industry + baseline (only registry-supported sections) | FD-10 |
| 4.2 | C8 `implementedBy` selection gate | FD-11 (b) |
| 4.3 | Registry labels; navigation toggle label | FD-07 |
| 4.4 | Repeated-interaction INP measurement (no policy change) | §C |

### Phase 5 — Re-verification
1. `npm run gate`, then `npm run host:e2e` on the final tree, with an input fingerprint before and
   after.
2. Re-run the Jalsa dry run **on the existing raw files and fact register, unchanged**.
   - Expected status: **CUSTOMER INPUT OR APPROVAL BLOCKED**, not READY.
   - Every §B item still open.
   - Served HTML still free of prices, dietary marks and restricted menu names until the restaurant
     approves.
3. Re-run the completeness simulation (synthetic).
   - Expected: prices, groups and verified attributes render from verified values only.
   - Expected: no permanent hours placeholder; proposition on home; no dish hub pages.
4. Update the report with the flipped pins, each linked to its FD.

**What stays out of scope until a real customer needs it:** renderers for the other §2.1
objectives (recruit, publish_content, raise_funds, …). Phase 1.1 makes them explicit blockers now;
building them speculatively would repeat the template-first mistake this plan avoids.
