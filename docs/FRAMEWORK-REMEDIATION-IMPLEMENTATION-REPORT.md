# Framework remediation — implementation report

**Date:** 2026-09-16
**Plan:** `docs/FRAMEWORK-REMEDIATION-PLAN.md`
**Source of the defects:** `docs/FIRST-REAL-CUSTOMER-DRY-RUN-REPORT.md` (Jalsa Restaurant)
**Result:** all 16 defects (FD-01…FD-16) resolved. `npm run gate` and `npm run host:e2e` pass.
Nothing committed or pushed. No customer fact, approval or raw file was changed.

---

## 1. Final verification

| Command | Result |
|---|---|
| `npm run gate` | PASS — typecheck clean; **33 test files, 830 tests**; framework audit 11 checks, 0 FAIL, 2 pre-existing WARN |
| `npm run host:e2e` | PASS — **4 of 4** host files: jalsa 101 s, verdaleen 206 s, ashvattha 278 s, engagement 462 s (collected 2026-09-16T07:02Z) |
| Jalsa raw files | SHA-256 unchanged: `878b5c95…5e18`, `2f7fc234…fa17` |

### The Jalsa re-run, on unchanged facts and approvals

| | Before remediation | After |
|---|---|---|
| Readiness | **FRAMEWORK BLOCKED** | **CUSTOMER INPUT OR APPROVAL BLOCKED** |
| Gates (tech / a11y / resp / perf / content / design) | ✔ ✔ ✔ ✔ **✘** ✔ | ✔ ✔ ✔ ✔ **✘** ✔ |
| Quality level / score | technically_working / 72 | technically_working / 73.5 |
| Content-gate blockers | placeholder undercount (1 slot while 49 markers served); blocked conversion | **honest**: blocked conversion (no verified address), no completable action, 4 slots + 1 pending marker — every one a missing customer fact |
| Menu names | 49 published from a source marked "For design illustrations only" | **withheld**, with the restriction as the reason |
| Selected patterns | 2, rendered on no page, budgeted | **0** — none is buildable, so none is promised |
| Publication blockers from generation | (mechanism did not exist) | **none outstanding** — nothing approved is dropped |
| Served-text provenance | 0 unclassified | 0 unclassified (5 customer fragments, 11 framework) |

**The content gate still fails, and that is the correct result.** Its three reasons are now
entirely customer-input facts: no verified address, no completable contact route, and four
honest slots (proposition, audience, next step, opening hours) plus the contact notice.

---

## 2. Phase 0 — make the gates trustworthy

**Defects:** FD-06, FD-05, FD-13 resolved; FD-09 and FD-11 partly (completed in Phases 1 and 4).

| Contract | Change |
|---|---|
| Provenance (C2, part) | `content/provenance.ts` — one dependency-free home for the vocabulary, plus `public_source` and `operator_inference`; every record gains `sourceId` |
| Source records | `BusinessInput.sources[]`: what each source is and whether it authorises publication |
| Offer provenance | `Offer.provenance` — per-offer, optional for compatibility |
| Publication policy | `content/publication.ts` — the single authority implementing the owner's FD-05 policy |
| Verdict split | `services` (names, from provenance) vs `offer_descriptions` (prose); the selector and the renderer now read the same verdict |
| Missing values (C6) | typed `PendingValue`; `data-content-pending` / `data-content-unavailable`; counted by `parseServedHtml` |
| Integrity ledger | new domains `content_verdict`, `supplied_value`, `pattern`; `blocksPublication` + `publicationBlockers`; `BuildEvidence.generation` carries them into the content gate |

**The FD-05 policy, as implemented:**
- no provenance record → publishes literally (legacy inputs unchanged — Ashvattha still renders);
- owner-stated + source authorised → publishes literally;
- source `not_authorized` → **withheld, overriding verification**;
- source `unknown` or uncited → held;
- AI-generated → held until approved; inferred → never; publicly discovered → needs approval;
- a fact (price, regulated attribute) needs `customer_supplied_verified` — an approved AI draft is copy, never a fact.

**Tests:** `remediation-phase0.test.ts` (22). Flipped: Jalsa FD-05, FD-06, FD-09, FD-11; `customer-readiness` placeholder shape. All 4 host tests now pass generation blockers into the gate.

---

## 3. Phase 1 — the contracts that decide what a page can contain

**Defects:** FD-14, FD-08, FD-09 (completed), FD-16, FD-12, FD-01, FD-02.

- **C1 section registry** (`design-intelligence/sections/registry.ts`): all **83** section ids the
  engine can decide, each with aliases, a visitor-facing label, a content source, an owning page
  role and a renderer — or an explicit `null`. A section with no renderer now renders **nothing**
  and records a capability gap, instead of a slot no customer could ever fill.
  The coverage test found two ids I had missed by hand (`features`, `data_and_privacy`).
- **FD-14:** `hours` has a renderer and its own status (`openingHours`, falling back to the address),
  and is rendered once — in the hours section, or in the contact block, never both.
- **C5 page composition:** every home page carries a proposition, whatever its objective (9 of 14
  objectives had none); derived routes are named for visitors (`/learn`, not `/educate`); `/` is
  exempt from the orphan rule.
- **Intent basis:** `websiteObjectiveBasis` and per-audience `basis`. An inferred objective raises an
  approval requirement; an inferred audience renders as a slot instead of "For <label>".

**Tests:** `remediation-phase1.test.ts` (13). Updated deliberately: provenance counts in two tests,
DD-035 route, hospitality `policies`→`disclosures`, `/educate`→`/learn`, contact-status shape.

---

## 4. Phase 2 — per-value provenance

**Defect:** FD-13 (completed).

- Source records carry **file provenance**: path, SHA-256, and C2PA content credentials
  (statement, generator, origin confidence, and whether the signature was actually validated).
- An asset whose file provenance cannot confirm its origin is refused even when the inventory says
  verified — this is the Jalsa logo's case, now decided by rule rather than by note.
- `businessNameProvenance`; an unconfirmed name raises one confirmation requirement.

**Tests:** `remediation-phase2.test.ts` (7). No flips: the change is additive.

---

## 5. Phase 3 — the generic catalogue

**Defects:** FD-03, FD-04, FD-15.

- **C3:** `offerGroups[]`, and offers gain `groupIds`, `variants`, `price`, `attributes` — every value
  with its own provenance. Generic by design: a menu is a catalogue like a product range or a fee
  list, and a restaurant-specific type would repeat the industry-special-case mistake.
- **FD-03 price channel**, negatives written first: an unverified price, an AI-drafted price (approved
  or not), a price from a restricted source, and a verified price under an unverified `pricing`
  inventory all stay off the page. A verified price from an authorised source renders with its unit
  and tax note, and keeps its provenance.
- **C4 attribute vocabularies** by industry, with `regulated` marks (dietary, allergens, warranty,
  regulatory class) that publish only from verified values, never inferred from a name.
- **FD-15:** schema type follows the entity kind — a catalogue item is never `Service`, and DD-093
  derives no page per item.

**Tests:** `remediation-phase3.test.ts` (13). Flipped: simulation FD-15.

---

## 6. Phase 4 — vocabulary and buildability

**Defects:** FD-10, FD-11(b), FD-07.

- **FD-10:** `food_service` industry and baseline (what is served, where, when), whose every required
  section has a renderer, with no assumed imagery and `simulated_food_photography` prohibited.
- **FD-11(b):** `PATTERN_SECTION_MAP` / `IMPLEMENTED_PATTERNS` is the one authority for buildability,
  read by the generator and by a new `generator_implementation` selection gate — ordered **last**, so
  a business, accessibility or budget reason still explains a rejection. A use-case unlock now
  survives a later gate's rejection instead of being discarded.
- **FD-07:** section labels per industry (`Menu`, `Products`, `Programmes`); the navigation toggle is
  "Site menu".

**Tests:** `remediation-phase4.test.ts` (10). Updated deliberately: gate order, frequency, unlock,
content-gating, DD-028, nav label.

---

## 7. Cross-customer impact (measured, post-remediation)

| Host | Result | Change |
|---|---|---|
| **Ashvattha** (representative brief) | technically_working / 77.25; gates ✔✔✔✔✘✔; 1 blocker | Unchanged behaviour: 8 pages, offer names still published (legacy provenance), 3 service hub pages kept. Integrity entries rose 34→45 (new domains). Placeholder counts now include pending markers. Its performance gate passed this run (INP variance, §8) |
| **Verdaleen** (fixture) | technically_working / 71.14; accessibility `unknown` (AAA human criteria, pre-existing) | Four `kind: product` offers are no longer typed `Service` |
| **Engagement hosts** (4 fixtures) | all four experiences build, serve and operate in both engines; 0 failures | Unchanged |
| **Jalsa** (real) | §1 | Menu withheld; hero present; no unbuildable patterns |

No customer lost a capability. The visible changes are: derived route names, the navigation label,
section headings in industry words, and placeholder counts that now include every missing value.

---

## 8. Known limits and follow-ups (not defects fixed here)

- **62 section ids still have no renderer** (`roles`, `plans`, `article_index`, `donate`, …). That is
  now an explicit, blocking capability gap rather than a fillable-looking slot. Each is built when a
  real customer needs it; building them speculatively is the template-first mistake.
- **Lab INP remains single-click** per page. Phase 4.4 (repeat interactions, gate on the worst of N)
  was **not** implemented: it changes the host validator for every customer and deserves its own
  measured change. Ashvattha's gate passed this run and failed the run before on the same code.
- **Screen-reader testing** is still a human step; no automated result claims it.
- **Registry patterns without renderers** are now unselectable. Whether to implement more of them is
  a design decision, not a defect.

---

## 9. Files changed

**New source:** `content/provenance.ts`, `content/publication.ts`, `content/attribute-vocabulary.ts`,
`design-intelligence/sections/registry.ts`.

**Changed source:** `business-input.ts`, `contact-status.ts`, `engagement-values.ts`, `verification.ts`,
`asset-policy.ts`, `content-values.ts`, `component-model.ts`, `generate-website.ts`, `page-spec.ts`,
`render/html.ts`, `emit/nextjs.ts`, `build-evidence.ts`, `decision-execution.ts`, `gate-derivation.ts`,
`seo/artifacts.ts`, `industry-baseline.ts`, `derive-profile.ts`, `select-elements.ts`,
`pattern-registry/registry.ts`, `pattern-registry/types.ts`, `pipeline.ts`.

**New tests:** `remediation-phase0…4.test.ts` (65 cases).

**Jalsa workspace:** only the engine seam record, and only to transcribe facts the workspace already
recorded into the new contract — the menu's publication restriction (F-006), per-offer provenance,
file provenance including the logo's C2PA finding (F-004), the business name's provenance (F-001),
and the inferred objective and audience (F-026, F-027). No fact, approval or raw file changed.
