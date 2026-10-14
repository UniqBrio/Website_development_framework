# CUSTOMER READINESS FOUNDATION — REPORT

Written 2026-09-14. Design is in `docs/CUSTOMER-READINESS-ASSESSMENT.md`. The screen-reader strategy is in `docs/SCREEN-READER-TESTING-STRATEGY.md`. Nothing was committed.

**Evidence:**
- `npm run gate`, run on the final tree;
- `npm run host:e2e` (Verdaleen, Ashvattha, engagement), final run collected 2026-09-14 16:39–16:45 UTC;
- digests:
  - `customers/ashvattha-tax/evidence/customer-dry-run-digest.json`;
  - `hosts/verdaleen/evidence/host-dry-run-digest.json`;
  - `hosts/engagement/evidence/*-digest.json` and `summary.json`;
  - the generated register section in `customers/ashvattha-tax/website_workflow/runs/WEB-NEW-20260914-practice-website/07-engine-seam.md`.

**Data disclosure.** Every business exercised here is synthetic, and the framework now says so itself: each generated manifest records `dataset.classification = "synthetic"`. That includes Ashvattha, which is a representative brief for a fictional practice with a reserved `.example` domain. **No result below is a real customer's.**

---

## 1. Customer-readiness assessment

### 1.1 What changed, gap by gap

| Gap | Before | After (measured where a browser can measure it) |
|---|---|---|
| **G1** home route | a site with no owner pages had no `/`, while the brand, nav and 404 page linked to it | `/` always exists: the owner's page, the site-primary objective's page at `/`, or a derived home page. The integrity ledger's `home_route` entry is **delivered** on every fixture. |
| **P1-1** page purpose | `/contact` had no contact section, `/faq` no FAQ, `/services` and `/contact` duplicated `/` | typed roles (`home, services_index, service, about, faq, contact, legal, conversion, content`), stated or inferred with the basis recorded; site-level sections allocated to the owning role; unallocated sections reported. Ashvattha `/contact` → contact section + disclosures + enquiry; `/faq` → FAQ + enquiry; `/about` → about + qualifications + process. |
| **P1-2** contact links | a verified email appeared on no page; 0 completable actions on 8 Ashvattha pages | a decided capability order per objective (form → email → phone → WhatsApp, reordered by the owner's preference, limited to what the surface can complete). Ashvattha delivers `mailto:` on all 8 pages; the content-gate reason "no completable conversion action" is **gone** (register TC-FUNC-003 **PASS**). WhatsApp renders as `https://wa.me/<digits>` when verified (unit-tested; no fixture supplies a verified number to a host). |
| **P1-3** AI-draft channel | no channel; Phase S positioning and locality could not reach a page | `drafts[]` with the shared provenance vocabulary: approved drafts publish (proposition, about, titles, meta descriptions) with their approval on record; unapproved drafts are **held** (slot stays, text never renders, blocker listed); drafts for unknown routes are rejected; the framework can never author one |
| **P1-4** compact navigation | cited in the trace, not built; five link rows before the h1 on a 320px phone | native `popover` disclosure below the medium range, identical in both layers. **Operated in Chromium and WebKit, Next.js and static, with JS off:** closed by default, h1 at 118–119px on a 375×667 phone, opens by keyboard with every route, Tab reaches the menu, Escape and "Close menu" close it, focus returns. |
| **P1-5** rule precedence | case fixes; media+authoritative and sports+authoritative failed the design gate | tier derived from what a rule reads (context outranks personality); a same-tier disagreement stays a conflict; resolutions are recorded with every overridden write and are order-independent (tested forward and reversed) |
| **P1-6** dependency admission | the host installed `react-hook-form`, which the gate denied and nothing imported | one authority: proposal × generated consumer × gate decision. Ashvattha: `react-hook-form` **denied** (the Phase 2 decision now travels through the seam), `zod` **awaiting approval**, host installs `next`, `react`, `react-dom` only; emitted imports reconciled both ways |
| **P1-7** duplicate / placeholder pages | not detected | one analyser serves the generator manifest and the content gate over served HTML. Measured: placeholders on Ashvattha `/`, `/about`, `/faq`. Verdaleen's `/` and `/book` measured at **similarity 1** in the first run of this task; now **fixed at the source** (the conversion page owns the conversion, home owns the services overview), with 0 duplicates in the final run. |
| **P1-8** workflow seams | manual transcription; Phase 2 denials had no channel; register results typed by hand | `framework:<kind>` JSON blocks are the authority (`website_workflow/framework_seams.md`). Ashvattha's host run now loads its input **from the workflow record**, and its JSON is derived with a drift test. The register is evaluated from gates and written between generated markers. |
| **Delivery G2** paths | first rule / first example only | every rule path, the no-match path when reachable, every owner example, and an out-of-range input (calculator) |
| **Delivery G3** WebKit | layout sweep only | every experience and the compact nav are **operated** in WebKit |
| **Delivery G4** static layer | never in a browser | the host serves `static-site/` with `node:http`: operation checks, axe (A/AA) and 320px reflow on every static page |
| **Delivery G5** screen reader | no strategy | automated accessibility-tree assertions (Chromium CDP) plus a written manual protocol; announcement quality stays `human_assessment_required` |
| **Synthetic data** | only named "FIXTURE" | `classifyDataset`: synthetic markers are recorded, and a synthetic dataset adds a publication blocker |

### 1.2 Defects found by this work's own host runs, fixed at source

1. **Hero-less pages.** On a page with no hero or conversion section (e.g. `/about` with a configured form endpoint), an email CTA was resolved but rendered nowhere. The integrity ledger caught it as a `conversion` mismatch, and generation refused. **Fix:** the decided contact route renders on that page.
2. **Contact link target size.** The email link in the contact definition list measured **22px** on six touch profiles (RF-006). **Fix:** `.c-definition-list dd > a` joins the target-size rule.
3. **Reflow false failure.** The reflow check counted text inside the closed compact menu as "lost at 320px", which failed accessibility on every compact-nav host.
   - First correction attempt: subtracting the menu text did not work, because a hidden element's `innerText` falls back to `textContent`; this was measured with a probe.
   - **Fix:** subtract only a rendered menu. The navigation check independently proves the routes stay reachable.
4. **Verdaleen duplicate body.** `/` and `/book` were identical, detected by P1-7. **Fix:** role-aware dedupe in `allocateSiteSections`.
5. **"Faq" casing** in titles and the h1 (P2 from the dry run). **Fix:** SEO labels use the page model's label ("FAQ").
6. **Derived `educate` page role label.** Recorded as `conversion`, now `content`. This changed after the final host run and **changes no emitted file**: the SHA-256 of every generated file set is identical before and after for Verdaleen, the assessment host fixture and SCHOOL.

### 1.3 Readiness verdict

**NOT READY FOR A REAL CUSTOMER LAUNCH. READY FOR A FIRST REAL-CUSTOMER DRY RUN.**

Every P1 capability gap from the Ashvattha dry run is closed in the framework and verified in a browser where a browser can verify it. The representative practice now builds a site that:
- gives each page the purpose-specific sections its role requires;
- offers a working email contact on every page;
- navigates cleanly on a phone;
- installs nothing the dependency gate denied;
- passes the technical, accessibility (AA), responsive, performance and design gates.

What stops a launch is no longer a framework capability. It is:
1. customer-supplied facts and approvals (§6);
2. placeholder text the content gate correctly refuses to publish;
3. screen-reader passes nobody has run yet;
4. a lab INP that measured on both sides of the threshold (§4.1).

---

## 2. Remaining gaps

### P0
None. Nothing was fabricated, substituted or published. No gate passed on an estimate, and no unmeasured matrix combination counted as a pass.

### P1 — blocks a real launch

| # | Gap | Why it blocks |
|---|---|---|
| R1-1 | **No screen-reader pass** on any delivered surface | announcement quality is `human_assessment_required`; the protocol in `docs/SCREEN-READER-TESTING-STRATEGY.md` has not run |
| R1-2 | **Lab INP is not stable near the threshold**: Ashvattha `/` measured 208ms (FAIL) in one run and 112ms in the next, same tree (the menu toggle is the measured interaction) | the performance gate can flip on noise. Field data or repeated-sample lab medians are needed before a performance claim; the INP policy itself is unchanged |
| R1-3 | **No real customer data** has been through the framework | every result is synthetic, and the classification says so |
| R1-4 | **Approval workflow is data, not a tool**: drafts, dependency decisions and SEO descriptions are approved by editing records | approval provenance is only as good as the record; no UI or authentication exists |

### P2 — degrades quality or workflow

- **Transcription remains a judgment.** The seam now carries the business input from the record, but industry, personality and page slugs are still AI or operator judgment made while writing the block.
- **No-match path not exercised in a browser.** Every fixture rule set ends in a catch-all, so the no-match path is unit-tested only.
- **WhatsApp and phone links have no host run.** No host fixture supplies a verified number; they are unit-tested only.
- **Engagement fixtures still fail the content gate.** They configure no endpoint and supply no verified contact, which is correct.
- **`internal_links`** is reported unallocated on Ashvattha. It is a rule-architecture token with no renderer.
- **Section allocation for `legal` pages.** No fixture has one; disclosures fell back to `/contact`.
- **Dedupe covers only home × conversion.** Other near-duplicates are detected and blocked, not prevented.
- **Workflow templating carried over from the dry run:**
  - the 89 literal first-site assumptions;
  - the Supabase-for-any-form rule;
  - no whole-site request type;
  - 11 missing skills.
- **`BusinessInput` expressiveness:** there is still no mixed B2B+B2C model and no qualitative mobile share (the page `label` field was added here).
- **AAA human-assessment recording path** still absent; Verdaleen's accessibility gate stays `unknown`, correctly.
- **AAA contrast palette finding:** `color-contrast-enhanced` 6.99:1 on accent actions, outside the AA target.
- **Two colour instructions for one step:** the TypeScript port and `generate_palette.py`.

---

## 3. Test counts

| Suite | Result |
|---|---|
| `npm run gate` (typecheck + unit tests + `audit_framework.py`) | see §3.1 |
| `tests/scenarios/customer-readiness.test.ts` (new) | 37 |
| `tests/host/host-boundary.test.ts` | 36 (was 28): matrix, paths, invalid input, accessibility tree, navigation, static layer |
| `npm run host:e2e` | **3 / 3 PASS** — Verdaleen 185 s, Ashvattha 265 s, engagement 447 s |

### 3.1 Gate (final tree)
Typecheck PASS; **26 test files, 741 tests PASS** (694 at the start of this task); audit 11 checks, 0 FAIL, 2 WARN (pre-existing).

---

## 4. Full host results (final run)

| Gate | Ashvattha | Verdaleen | Calculator | Assessment | Selector | Comparison |
|---|---|---|---|---|---|---|
| technical | **✔** | ✔ | ✔ | ✔ | ✔ | ✔ |
| accessibility | **✔ AA** | unknown (AAA: 3 criteria need a person) | ✔ | ✔ | ✔ | ✔ |
| responsive | **✔** (9 profiles, 0 failures) | ✔ | ✔ | ✔ | ✔ | ✔ |
| performance | **✔** (lab LCP 1.03 s, INP 144 ms, CLS 0) | ✔ | ✔ | ✔ | ✔ | ✔ |
| content | ✘ placeholder text on `/`, `/about`, `/faq` | ✘ blocked booking path (unverified address), no completable action, placeholders | ✘ no verified contact, placeholders | ✘ same | ✘ same | ✘ same |
| design | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| level | technically_working (score 77.25) | technically_working | technically_working | technically_working | technically_working | technically_working |

Other results:
- **Ashvattha, before and after.** In the original dry run: accessibility true, responsive true, performance **unknown**, content false with the "no completable conversion action" blocker; score 73.5. Now performance is measured (the menu toggle gives INP a real interaction), and the conversion blocker is gone.
- **Ashvattha register** (evaluated from evidence, written to the workflow record):
  - PASS: completable action, no duplicates, compact nav, responsive, accessibility, technical, performance, integrity;
  - FAIL: placeholder text (TC-FUNC-006) and synthetic dataset (TC-DATA-001).
- **Build and bundle (all hosts):** `next build`, `tsc` and `eslint` exit 0 with 0 lint warnings. First-load JS is 142.6 KB gzip on every Ashvattha route; the engagement routes are 145.5 KB (the runtime adds 2,952 B gzip).

## 5. Browser validation results (final run)

### 5.1 Delivered experiences — every combination ran

| Fixture | Paths operated (all matched), per combination | chromium/next | webkit/next | chromium/static | webkit/static | Accessibility tree (Chromium) |
|---|---|---|---|---|---|---|
| Calculator | owner example 1; out-of-range input → error shown, field `aria-invalid`, no result | ✔ | ✔ | ✔ | ✔ | 0 unnamed controls or groups; status region present |
| Assessment | rule r-foundation, r-intensive, r-standard (no-match unreachable) | ✔ 3/3 | ✔ 3/3 | ✔ 3/3 | ✔ 3/3 | 0 unnamed; status present |
| Selector | rule r-strength, r-endurance, r-mobility (no-match unreachable) | ✔ 3/3 | ✔ 3/3 | ✔ 3/3 | ✔ 3/3 | 0 unnamed; status present |
| Comparison | caption, scoped headers, focusable named region | ✔ | ✔ | ✔ | ✔ | n/a (no controls) |

In every combination, these also passed:
- error path: summary shown, per-field errors, focus on the first problem;
- reset;
- JS disabled: fallback text, disabled controls, notice;
- 320 CSS px: 0px overflow;
- client-side navigation (Next.js layer);
- no page errors.

### 5.2 Compact navigation (P1-4)

The checks ran in Chromium and WebKit, against both the Next.js and static layers, on all 6 hosts. **Every check passed** on every host:
- closed initially;
- h1 on the first screen (118–119px from the top on a 375×667 viewport);
- the keyboard opens every route, with route parity;
- a visible Close control;
- Tab reaches the menu;
- Escape closes it and focus returns;
- Close closes it;
- desktop shows the full list without buttons;
- with JS off the menu opens.

### 5.3 Static layer (Delivery G4)

Every static page served HTTP 200 with **0 axe A/AA violations**, **0px overflow at 320 CSS px** and no page errors: Ashvattha 8/8, and every engagement fixture page.

### 5.4 Screen reader

Automated accessibility-tree assertions **passed**. The manual protocol has **not run**, so no screen-reader pass is claimed.

## 6. Decision-to-execution reconciliation results

Generation throws on any mismatch, so every generated site in the test suite and in every host run is consistent. Ledgers from the final code:

| Site | Delivered | Unavailable (each with a reason) | Mismatch | Notes |
|---|---|---|---|---|
| Ashvattha | 34 | 4 | **0** | unavailable: `/contact#disclosures` (no legal documents), `(site)#internal_links` (no renderer), `react-hook-form` (denied by the gate), `zod` (awaiting approval) |
| Verdaleen | 30 | 10 | **0** | conversion ×3 unavailable (booking blocked on the unverified address; no verified contact; checkout has no endpoint); dedupe recorded (`/` ↔ `/book`); `next-intl` and `react-hook-form` not consumed, `zod` awaiting |
| SAAS-ROI + calculator | 11 | 10 | **0** | engagement delivered; `motion` not consumed |
| SCHOOL + assessment | 14 | 9 | **0** | engagement delivered |
| STUDIO + selector | 11 | 6 | **0** | engagement delivered |
| CATALOGUE (no values) | 10 | 8 | **0** | engagement DELIVERY_UNAVAILABLE, recorded |
| CLINIC-BOOKING | 10 | 5 | **0** | — |
| engagement hosts (calc / assess / select / compare) | 15 / 16 / 14 / 17 | 10 / 9 / 6 / 8 | **0** | — |

**Negative proof** (`customer-readiness.test.ts`): a removed static page, a section that produced nothing and recorded nothing, and an emitted import of an unadmitted package are each reported as mismatches.

**Precedence resolutions** in these fixtures: none arise, because no fixture combines a context rule and a personality rule on one target. The media+authoritative and fitness+premium cases are unit-tested and resolved with the overridden write recorded. Authoritative+editorial stays a conflict, correctly.

## 7. Exact remaining blockers for the first real customer

These are in order of dependency. Items 1–4 are **customer inputs**; the framework must not supply them.

1. **A real customer and real data.** Replace the representative brief. The dataset must classify `unmarked` (no FIXTURE or reserved-domain markers); a synthetic dataset is never publishable.
2. **Verified contact facts:** at least one verified email, phone or WhatsApp number with its value. Add a verified address if booking, visits, a map or LocalBusiness data are wanted.
3. **Copy for every placeholder on an indexable page:**
   - proposition (or an approved draft);
   - about text;
   - process steps;
   - FAQ entries;
   - descriptions for offers without them.

   Until then the content gate stays false, by design.
4. **The production origin** (canonical, sitemap, `og:url`), plus legal policies for a regulated business, which the current `/contact` disclosures await.
5. **Approvals, recorded in the workflow record's framework blocks:**
   - meta descriptions (approved drafts);
   - positioning and locality titles (approved drafts);
   - dependency-gate decisions (e.g. `zod` if a server endpoint will validate with it);
   - the theme mode and brand seed.
6. **A form endpoint or an explicit acceptance of link-only contact.** Without an endpoint, the decided order delivers contact links, and that decision is recorded for the owner to see.
7. **A screen-reader pass** (R1-1) on the matrix in `docs/SCREEN-READER-TESTING-STRATEGY.md`, with results in the register.
8. **A stable performance reading** (R1-2): repeated lab samples or field data for INP before any performance claim.
9. **The human workflow gates** (GATE 0, S, 1, 2 and 5) with the owner; they stay PENDING until an owner exists.

---

## 8. Files

**New:**
- source:
  - `src/integrity/decision-execution.ts`;
  - `src/design-intelligence/objectives/conversion-capabilities.ts`;
  - `src/generation/contact-links.ts`;
  - `src/content/draft-channel.ts`;
  - `src/content/dataset-classification.ts`;
  - `src/stack/dependency-admission.ts`;
  - `src/workflow/seams.ts`;
- tests: `tests/scenarios/customer-readiness.test.ts`;
- docs and workflow:
  - `docs/CUSTOMER-READINESS-ASSESSMENT.md`, this report, `docs/SCREEN-READER-TESTING-STRATEGY.md`;
  - `website_workflow/framework_seams.md`;
  - `customers/ashvattha-tax/website_workflow/runs/WEB-NEW-20260914-practice-website/07-engine-seam.md`.

**Modified:**
- source:
  - `src/design-intelligence/engine/evaluator.ts`, `src/design-intelligence/types/business-input.ts`;
  - `src/generation/page-spec.ts`, `component-model.ts`, `content-values.ts`, `form-contracts.ts`, `generate-website.ts`;
  - `src/generation/render/html.ts`, `render/css.ts`, `emit/nextjs.ts`;
  - `src/content/contact-status.ts`, `src/content/engagement-values.ts`;
  - `src/seo/artifacts.ts`, `src/evidence/build-evidence.ts`, `src/quality/gate-derivation.ts`;
  - `src/host/host-project.ts`, `host-evidence.ts`, `raw-host-evidence.ts`, `runtime/validate.mjs`;
  - `src/pipeline.ts`, `src/index.ts`;
- data: `customers/ashvattha-tax/engine/business-input.json` (now derived; it gains the gate decision);
- tests:
  - `tests/scenarios/customer-dry-run-findings.test.ts`, `rule-expansion.test.ts`, `integration.test.ts`, `host-audit-findings.test.ts`;
  - `tests/generator/generator.test.ts`, `tests/engagement/delivery.test.ts`;
  - `tests/host/host-boundary.test.ts`, `verdaleen.host.ts`, `ashvattha.host.ts`, `engagement.host.ts`;
- docs: `docs/GENERATOR-SPEC.md` §17, `README.md` (update log + Files table).
- **Regenerated evidence:** the three host digest sets listed at the top.
