# CUSTOMER DRY RUN REPORT — Ashvattha Tax & Compliance

Date: 2026-09-14 · Framework HEAD 6295b6d, uncommitted working tree · Nothing committed, nothing published.

Workspace: `customers/ashvattha-tax/`
- `brief/` — the brief and intake inventory
- `website_workflow/` — site profile, app reality, request, run records, test register, decisions log
- `engine/` — engine input transcribed from the brief
- `evidence/` — host digest

Generated host: `customers/ashvattha-tax/generated-host/` (git-ignored, regenerated on every run).
Driver: `tests/host/ashvattha.host.ts`.

---

## 1. Customer Brief

**Disclosure.** The request asked for a real customer-style brief. No real customer was available in this session, so a **representative brief for a fictional practice** was written before any framework step ran. It has not been edited since, to help the framework pass or for any other reason. It is written the way small professional-services owners brief a website: an email, incomplete, with unverified claims mixed into the requirements, a delegated decision ("you decide"), and attachments promised but not sent. The domain uses the reserved `.example` TLD. It is not Verdaleen and not a unit-test fixture.

**Business.** A two-partner tax and accounting practice (Chartered Accountant-led) in Baner, Pune.
- **Services:** GST registration and returns, income tax returns (including notices), bookkeeping, company and LLP registration with ROC compliance, TDS returns.
- **Audience:** small business owners, founders, freelancers and salaried people, "usually on their phones".
- **Goals:** more enquiries (calls, WhatsApp, email), ranking on Google in Pune, looking trustworthy but approachable.
- **Pages:** Home, Services, one page per service, About, FAQ, Contact.
- **Features:** contact form that emails them, WhatsApp button, map. Blog later. English only ("maybe Marathi later").
- **Reference site:** ClearTax.

**Information supplied before implementation** (full inventory: `brief/information-supplied.md`):

| Class | Items |
|---|---|
| Supplied | name; locality (Baner, Pune); services (5 names); descriptions for 3 services; audience segments; service areas; page list; domain `ashvattha-tax.example`; email `hello@ashvattha-tax.example`; language (English) |
| Stated, unverified | founded 2014; team size; CA / ICAI membership (no number); "60+ regular clients"; "4.9 on Google from about 80 reviews"; prices "₹999" and "₹1,500 a month" (owner undecided) |
| Not supplied | full address; phone / WhatsApp number; logo file; photos; brand colour value; fonts; proposition, about, process and FAQ copy; 2 service descriptions; privacy policy and terms; email-sending service; production origin (scheme, apex or www); accessibility and performance targets; deadline date; testimonials |

## 2. Workflow Execution

Every phase ran in order. `runPipeline()` was not the entry point: it first runs at Phase 2 step 0, from data transcribed out of the Phase 0–S records.

| Phase | Record | What ran | Gate |
|---|---|---|---|
| /winit | `runs/…/00-winit-and-phase0.md` | workspace instantiated from the brief; self-audit PASS; reverse token check measured 89 literal first-site assumptions in the master workflow | — |
| 0 Intake | same | unknowns listed; blast radius multi-page; ARCHITECTURE yes (email backend, map embed default-deny); SUPABASE unknown (rule-forced); STRATEGIC | GATE 0 **PENDING** |
| S Strategy | `02-phaseS-strategy.md` | web research (4 local competitors, ClearTax, Bench); ICAI advertising research; claims table; 3 PROFILE A matrices | GATE S **PENDING** |
| 1 Interrogation | `03-phase1-interrogation.md` | 3 LIBRARY SCREENS over 52 entries; Q1–Q10 and named checks → **REDESIGN** | GATE 1 **PENDING** |
| 2 Plan | `04-phase2-plan.md` | engine (step 0); colour tokens; dependency gate; client boundary; SEO artifact set; absence semantics; test cases | GATE 2 **PENDING** |
| 3 Supabase | `05-phase3-phase4-build.md` | **N-A**, with reason: no store, no write path | GATE 3 N-A |
| 4 Build | same | generator → host project → `npm install` → `next build`; 7 defects fixed at source (B-1…B-7), 6 capability gaps recorded (G-1…G-6) | — |
| 5 QA | `06-phase5-qa-evidence.md`, `qa/test_register.md` | host validation on 9 profiles × 8 pages in chromium and webkit; axe; lab vitals; served HTML; re-interrogation; strategy drift | GATE 5 **FAIL** |
| 6–7 | `decisions_log.md` | not reached; the close entry records NOT SHIPPED | — |

**Where the TypeScript engine/generator and the markdown workflow consume each other's output:**

| # | Seam | Direction | How it happened | What was lost |
|---|---|---|---|---|
| 1 | Phase 0/S records → `engine/business-input.json` | markdown → TS | **manual transcription** by the operator; 12 judgment calls recorded in the Phase 2 plan | positioning B, "titles name the service and Pune", the WhatsApp conversion decision, the ICAI overlay as a policy, and the Phase 1 library winners have no field in `BusinessInput` |
| 2 | `runPipeline` output → Phase 1 [engine] rows and the Phase 2 plan | TS → markdown | the operator read the digest | nothing lost, but the flow orders the engine AFTER the interrogation that should examine it |
| 3 | Phase 2 dependency gate → generator and host | markdown → TS | **no channel**. The plan DENIED `react-hook-form`; the host installed it anyway, because the engine's stack decision is the only input the host reads | every Phase 2 denial |
| 4 | Phase 2 colour step → tokens | both | the flow says run `generate_palette.py`; the engine runs its TS port | none measured (parity test-enforced), but two instructions exist for one step |
| 5 | Host evidence → `runPipeline(input, {evidence})` → Phase 5 record and test register | TS → markdown | the digest is machine-produced; the register and the Phase 5 record were written by reading it | register cases do not drive `validate.mjs`; the mapping is manual |

## 3. Architecture Decision

| Decision | Value | Authority |
|---|---|---|
| Framework / rendering | Next.js 15.5, static rendering | engine §24 (`seo_dependency` high, PWA not requested) |
| Client boundary | `app/error.tsx` only | Next.js requirement; confirmed by grep of the generated app |
| Runtime packages | next, react, react-dom, **react-hook-form**, zod | engine stack decision → `runtimePackagesFor` |
| Form backend | **DENIED** — unconfigured; disabled form with a notice | Phase 2 dependency gate; generator form contract |
| Map embed | **omitted** | DD-114 (address unverified) |
| WhatsApp | **not buildable** — no number; no capability in the engine | customer input + framework gap |
| PWA / service worker / analytics | denied by default | stack_doctrine default-deny |
| Locale | single locale, `lang="en"`; **no locale routing** | the brief requires English only ("maybe Marathi later"). Multiple locales are not a requirement, so the missing locale capability is **not a blocker** for this customer. |

**Tailwind / CSS authority.** Investigated as A (required) / B (optional) / C (conflicting authorities). Finding: **C**. The engine's stack decision named Tailwind, shadcn/ui, Lucide and next/font. The generator emits one generated token stylesheet and semantic HTML, and the host installs none of those packages. `stack_doctrine.md` lists them as L1/L2/L3 defaults written for hand-built work.
- **Fixed at the authority, without introducing Tailwind:**
  - `select-stack.ts` now names what is actually built;
  - `stack_doctrine.md` gained a GENERATED SITES paragraph (adopting any of those packages on a generated site goes through the dependency gate);
  - the typography token record's false "next/font, self-hosted" claim was corrected (B-5).
- **Remaining conflict of the same kind, not fixed:** the engine admits `react-hook-form` on a requirement alone, while the doctrine requires five answers plus owner approval. The generator never imports it (DEF-010, P1).

## 4. Design Decision Output

**Engine decision** (final run):
- **Archetype:** `credibility_led_information_architecture`.
- **Personality:** "credible, clear, restrained, expert" (DD-001).
- **Expression:** low_to_medium; **motion cap:** minimal, reduced-motion safe.
- **Layout:** system `structured_content_rail_plus_evidence_modules` (DD-001), grid `structured_grid` (DD-013, after the authority fix B-7); reading measure 60–75ch.
- **Imagery:** `non_representational_only` — no authentic assets, so no photographic or generated stand-in; logo and photos DEFERRED.
- **Colour:** neutral substitute seed `#5A5F6A` → OKLCH tokens, 16 measured pairs, 0 failures; SINGLE-DARK theme is the **unchosen** template default.
- **Typography:** system sans stack (neutral substitute); clamped scale; body line-height 1.65; measure 72ch.
- **Patterns:** selected `modular-feature-grid`, `perspective-card`, `magnetic-action`. The last two are **not rendered** (G-3). 9 patterns rejected, each with a rule; 8 deferred for missing content.
- **Pages:** 5 owner pages + 3 DD-093 service pages. Company/LLP and TDS got no page (no description).

**Design autonomy test:**

| Area | Classification | Evidence |
|---|---|---|
| Visual personality | **GOVERNED** | DD-001 and DD-013 from industry + trust + personality; recorded with rule ids |
| Layout | **GOVERNED** (system and grid), after one authority fix | DD-001 sets the system, DD-013 the grid. Before the fix the two collided and the engine escalated a framework decision to the owner (B-7). Content-type vs personality precedence is still missing for other combinations (P1). |
| Hero | **PARTIALLY GOVERNED** | structure governed: business-name H1, audience line, CTA slot, typography-led (agreeing with Phase S S4). The proposition sentence needs customer copy (**HUMAN APPROVAL**). The Phase 1 screen that ordered it was **AI JUDGMENT** scored on a matrix. |
| Typography | **PARTIALLY GOVERNED** | scale, measure, line-height and weights come from tokens. Typeface is **HUMAN** (brand fonts; a neutral substitute ships). The typography-expert skill is **MISSING**. |
| Colour | **GOVERNED** mechanism / **HUMAN APPROVAL** inputs | the seed → token algorithm and measured contrast are governed; the brand seed and theme mode are owner facts, recorded UNRESOLVED / UNCHOSEN. The logo ("dark blue text") vs the dark theme is an open risk (G-6). |
| Imagery | **GOVERNED** | the asset policy refuses stand-ins; the S4 matrix agreed. Supplying assets is **HUMAN**. |
| Components | **PARTIALLY GOVERNED** | the component model, card grid (DD-025/DD-067) and form contracts are governed. Reconciling registry selections with rendered output is **MISSING** (G-3). The disabled state was generated but not styled — fixed (B-6). |
| Motion | **GOVERNED** cap / **MISSING** justification | minimal cap, reduce-safe (measured: 0ms persists under reduce); selecting motion patterns under that cap has no justification check |
| 3D | **GOVERNED** | `3d-product-view` and `decorative-webgl-hero` rejected by rule; WebGL contexts measured 0 |
| CTA | **PARTIALLY GOVERNED** | the label authority (DD-035 → contract `actionLabel`) and honest withholding are governed. Choosing the route was **AI JUDGMENT** on a matrix with no feasibility gate. An email/tel/WhatsApp link as the primary action is **MISSING**. |
| Responsive behaviour | **GOVERNED** and measured, with one **MISSING** capability | ranges → tokens → 9-profile sweep with 0 failures. The compact navigation the engine decided (`nav.compactMode`) is not implemented: five link rows before the H1 on a 320px phone (G-5). |
| Page structure | **PARTIALLY GOVERNED** | the page list is owner input; service pages derive from DD-093 (governed). Allocating sections by page purpose is **MISSING** (G-1/G-2). Titles are governed but lack locality, because the Phase S output has no channel. |

The user was not asked to make any design decision. The brief supplied the transcription choices (industry, personality, visual direction), recorded as AI JUDGMENT. The one design question the engine tried to escalate (DD-001 vs DD-013) was a framework defect and was fixed at the authority.

## 5. Generated Website

Eight routes, all statically rendered, server components except `error.tsx`:

| Route | Sections rendered | Notes |
|---|---|---|
| `/` | hero (name, proposition slot, audience line, withheld-CTA slot) · services (5 cards, 2 "description to be supplied") · enquiry (disabled form + notice) | — |
| `/services` | same as `/` | **duplicate body** (G-1) |
| `/about` | hero · qualifications slot · process slot | all placeholders |
| `/faq` | same as `/about` | **no FAQ section**; duplicate body (G-1) |
| `/contact` | same as `/` | **no contact section**; the verified email is rendered nowhere (G-1, DEF-001) |
| `/services/gst-registration-and-return-filing` | H1 + owner description + disabled enquiry form | title 63 chars (DEF-013) |
| `/services/income-tax-return-filing` | same shape | — |
| `/services/bookkeeping-and-accounting` | same shape | — |

- Header and footer each list all 8 routes, labelled with the owner's service names (after B-1).
- The 404 page, error and loading states exist (measured).
- Screenshots were reviewed: desktop is a readable but unfinished, wireframe-like page with large empty gaps; mobile is dominated by navigation.
- **As a customer deliverable it is not presentable.** Visible placeholders sit on 6 of 8 pages, and no page offers a working way to make contact.

## 6. Content & Asset Integrity

Verified against the provenance model: resolved content sources in the digest, served HTML from the production server, and host assertions.

| Category | Supplied as | Outcome in served HTML | Rule |
|---|---|---|---|
| Testimonials | not supplied (prohibited by ICAI guidance) | absent | DD-098 |
| Reviews / rating "4.9, ~80" | stated, unverified | absent (host asserts "4.9" and "review" not present) | DD-100 |
| Statistics "60+ clients" | stated, unverified | absent ("60+" asserted absent) | DD-100 |
| Customer logos | not supplied | absent | DD-099 |
| Awards | not supplied | absent | DD-100 |
| Certifications / credentials (CA, ICAI) | stated, unverified | absent; the qualifications section is a slot | DD-100 |
| Addresses | locality only | absent as an address; no LocalBusiness JSON-LD; no map | DD-101, DD-114 |
| Location claim in structured data | unverified location | **was** published as `areaServed` → **fixed** (B-2) | §I verified structured data |
| Pricing ₹999 / ₹1,500 | stated, unverified, owner undecided | absent (asserted) | DD-102 |
| Case studies | not supplied | absent | DD-104 |
| Guarantees / regulatory claims | none supplied | none generated | DD-105 |
| Service descriptions | 3 supplied verbatim | rendered verbatim, `customer_supplied` | — |
| Contact email | supplied, verified | resolved as `supplied/verified`, but **rendered on no page** (no page has the contact section) | G-1 |
| Phone / WhatsApp / address | not supplied | withheld; the resolver source lists withheld methods | DD-101 |
| Proposition, about, process, FAQ | not supplied | visible slots ("… to be supplied by the owner") | DD-105 |
| Meta descriptions | not supplied | **not emitted**: 8 AI **briefs** await approval (`approvalsRequired`) | DD-105 |
| Legal policies | not supplied | hidden slot; Q9 FAIL for launch | §12 |
| Logo / photos | promised, not received | none; a text wordmark ships | DD-096 |

**AI drafts.**
- The generated site contains **no AI-drafted public prose**. Every visible string is customer-supplied (name, audience label, offer names and descriptions), structural (headings, labels, notices), or an explicit slot.
- The only AI-drafted content is the positioning "qualified local GST, tax and accounting help for Pune small businesses", recorded in Phase S as a **draft requiring approval** and never published.
- The framework has no channel to carry a draft-with-approval-state into the generator — a gap, not a leak.

**Integrity weakness found.** The placeholder sentences are real text in indexable HTML (`index, follow`). If published, search engines would index "to be supplied by the owner". The publication gate blocks release today, but no check targets placeholder text in indexable pages.

## 7. SEO Evidence

Served HTML, fetched from `next start` with JavaScript not executed. Full per-page table in `06-phase5-qa-evidence.md` §4a.

| Item | All 8 pages | Status |
|---|---|---|
| Title | present, unique; 26–63 chars; GST page over 60 | PASS / DEF-013 |
| Meta description | absent — withheld pending approval | **UNRESOLVED (approval)** |
| Canonical | absent | **UNRESOLVED — required input:** the confirmed production origin. `ashvattha-tax.example` was supplied as a registered domain, but not the scheme or preferred host, and nothing is deployed. **No domain was invented.** |
| Robots meta | `index, follow` | present (but see indexability) |
| robots.txt | `User-agent: * / Allow: /`, no Sitemap line | PASS |
| sitemap.xml | not emitted | **UNRESOLVED** (needs the canonical) |
| Open Graph / Twitter | og:title, og:type, twitter:card, twitter:title; no og:image, no og:url | PARTIAL: og:image needs a verified asset; og:type `article` on service pages is questionable (DEF-009) |
| Structured data | Organization{name} on `/`; Service on `/`, `/services`, `/contact` and each service page; BreadcrumbList unresolved; FAQPage and LocalBusiness refused | valid JSON-LD; each entity present on its page |
| Semantic HTML | one `<header>`, `<main>`, `<footer>`, 2 `<nav>`; skip link; one H1; no heading skips | PASS |
| Indexability | all `index, follow` | **RISK**: 2 slot-only pages and 2 duplicates of `/` are indexable; no framework check caught the duplicates |
| Local intent | "Pune" appears on no page | FAIL vs the owner's primary goal; the Phase S synthesis has no channel |
| Client boundary | JavaScript-disabled profile keeps ≥98% of the text on every page | PASS |

SEO score on the evaluator's sheet: **7/10** (worst page: description missing and canonical missing). Before fix B-3 the evaluator scored **9**, because it never looked at descriptions.

## 8. Responsive Evidence

- **Measured** on 9 profiles × 8 pages (host `responsiveSweep`), with a full-page screenshot per profile and page:
  - chromium: Galaxy S9+, Pixel 7, Desktop Chrome 1280, Desktop 1920, Galaxy S9+ landscape (non-mandatory), Desktop Chrome with JavaScript disabled;
  - webkit: iPhone SE, iPhone 15, iPad gen 7.
- **Checked:** RF-001 overflow over 1px; RF-006 touch targets under 44px on touch profiles; no-JS text parity; HTTP status. **Result: 0 failures on every profile.**
- **WebKit:** 26.6 was installed by the host step. Before this run the responsive gate was decision-derived only; it is now decided by the measured sweep, and a missing mandatory profile leaves it UNKNOWN.
- **Small and large viewports:** 320px profiles and 1920px both measured clean.
- **Touch / no-hover:** coarse pointers get 44px targets (a regression fixed before the host run); hover reveals 0 of 136 elements.
- **Degraded path:** JavaScript disabled is a mandatory profile; clean.
- **Not proven:** physical devices, iOS toolbar and 100vh behaviour, input zoom, safe areas (TIER 3). The mobile first screen is five rows of navigation (G-5). A measured PASS is not good mobile UX, and no rule measures what reaches the first screen.

## 9. Accessibility Evidence

Target `wcag_aa` (framework default; the owner stated none). Measured with axe-core 4.13 plus DOM measurement in Chromium on 8 pages.

| Criterion | Observed | Result |
|---|---|---|
| Keyboard | 144/144 focusable reached | PASS |
| Focus visible, not obscured | 144 stops, 0 missing, 0 obscured | PASS |
| Contrast | lowest normal text 9.13:1, large text 16.54:1 | PASS (above AAA too) |
| Reflow at 320 | no overflow, no loss | PASS |
| Reduced motion | nothing persists | PASS |
| Forms | 6 forms, all disabled with a visible notice; 0 unlabelled | PASS |
| Target size | fine pointer 27px min (AA 24); coarse 44px | PASS |
| Media alternatives | no media | PASS (vacuous) |
| axe violations | 0 | PASS |
| **AAA: visual presentation, link purpose, plain language** | `human_assessment_required` | **UNKNOWN — not converted into a pass** |

Accessibility gate: **true at AA**. An AAA claim cannot be made.
The disabled submit button looked active (B-6). WCAG exempts inactive controls from contrast, so no accessibility check catches this; it was found in the screenshots.

## 10. Performance Evidence

| Measure | Value | Kind |
|---|---|---|
| Production build | `next build` exit 0 | measured |
| First-load JS | **142.6 KB gzip on every route** (461.6 KB raw) vs the 200 KB budget | measured from the production server |
| Inline RSC payload | 7–14 KB per route, reported separately | measured |
| LCP | 604–1,560 ms per page in the final run (the cold first page slowest); 552–788 ms in run 2 | **LAB**: Chromium via CDP, 412×823, 4× CPU, 150 ms RTT, 1.6 Mbps, **localhost** |
| CLS | 0 | LAB |
| INP | **not measured** — no non-navigating control exists (the only form is disabled) | unavailable |
| Core Web Vitals set | **UNAVAILABLE** → performance gate **UNKNOWN** | policy unchanged |
| Lighthouse | not run | — |
| Field / RUM | none (not deployed) | unavailable |

**Interpretation.**
- These are localhost lab numbers for a static page with no third parties and no real network path. They say nothing about real users in Pune on mobile networks.
- The 142.6 KB is almost entirely the React/Next runtime, on a site whose only client code is an error boundary. That is a stack-cost observation for the framework, not a budget failure.
- The INP policy was not changed. The evidence exposes a policy question, not a defect: a site with no interactive controls can never measure INP, so its performance gate can never pass. That is an owner policy decision, recorded in §19.

## 11. Quality Evaluation

Post-build evaluation from the final host run (`evidence/customer-dry-run-digest.json` → `evaluation`):

| Gate | Result | Why |
|---|---|---|
| technical | **true** | build, typecheck, lint, routes, 404, error/loading states, secret scan; one console error, handled by the favicon exception below |
| accessibility | **true (AA)** | §9 |
| responsive | **true** | measured sweep, 9 profiles, 0 failures |
| performance | **UNKNOWN** | vitals unavailable (INP) |
| content | **false** | measured: no served page offers a completable conversion action (B-4 made this visible; before the fix this gate was **true**) |
| design | **true** | no rule conflict remains after the authority fix (B-7); in runs 1 and 2 this gate was false on DD-001 vs DD-013 |

Level: **technically_working**. Target `professionally_designed` not reached. Weighted score **73.5** (81.75 in run 1, before the evaluator fixes; the score does not decide the level — a failed hard gate does). Sheet: SEO 7, conversion 3, trust 4, accessibility 9, technical 9, colour 9, performance 8 (bundle only).

**Favicon — narrow exception, as applied.** One console error in the run: a `/favicon.ico` 404 on the first page loaded only. It was treated as non-blocking because all three conditions were **measured**:
1. no page declares an icon, and no HTML references a favicon;
2. no script text references `favicon.ico`;
3. the page's own request listener never initiated the request, so the browser made it itself.

Any failed condition blocks, and `tests/host/host-boundary.test.ts` holds four blocking variants plus a script-requested 404. There is no general "favicon errors are harmless" rule. Supplying a favicon depends on the logo file (customer input).

**refine() — still an OPEN capability. Not implemented.**

| Failure | Would refine() help? | Can the framework identify the correction today? |
|---|---|---|
| No completable conversion (DEF-001) | yes, if a mailto CTA capability existed | identifies the failure (content gate); cannot name the correction — the capability is missing |
| `/faq`, `/contact` lack their sections; duplicate bodies (G-1) | yes | **no** — no check detects it; found by reading the HTML |
| Mobile navigation dominates (G-5) | yes | **no** — no gate measures it |
| Title over 60 chars (DEF-013) | partially | yes (plan warning), but the correction is copy needing approval |
| Placeholder text indexable | no — needs customer copy | partially (content slots listed) |
| react-hook-form unused (DEF-010) | yes | **no** — imports are not compared with the manifest |
| Selected, unrendered patterns (G-3) | yes | **no** |
| Rule conflict (B-7) | no — an authority fix, not a loop step | yes (conflict reported) |
| Disabled button styling (B-6) | yes | **no** — found in screenshots |
| Performance UNKNOWN | no | yes — it needs field data or a policy decision |

Of the failures a refinement loop would target, **the framework could name the correction for none** without a new capability, customer input or a human reading the output.

## 12. Conversion/Form Validation

| Link in the chain | Value | Consistent? |
|---|---|---|
| Objective | `generate_leads` (primary), `build_credibility` | — |
| Conversion architecture | `enquiry_form` (lead), `contact_route` (credibility) | the engine plans a form; Phase S chose WhatsApp (blocked) → email link (fallback), which the engine cannot express |
| Form contract | `enquiry`: name, email, message; action label from the contract | yes |
| CTA label | `contract.actionLabel`; the CTA is **withheld** because the endpoint is unconfigured | yes (DD-035 single authority) |
| Validation | browser constraint validation (required, type) with no JS; zod schema emitted in `app/_forms/contracts.ts` (imported by nothing until an endpoint exists) | client yes; server N-A |
| Submission | **none**: no `action`, `<fieldset disabled>`, visible notice "Enquiries are not connected yet, so this form cannot be sent." on 6 pages | **honest — the site does not pretend to submit** |
| Contact route | verified email resolved, but **not rendered on any page** | **broken** — G-1 |
| Measured outcome | 0 completable conversion actions on 8 pages | content gate false |

The unconfigured state is correct and clearly visible. The failure is upstream: a lead-generation site that holds a verified email address offers visitors no way to use it.

## 13. Production Gate

**TS evaluation:** level `technically_working`.
- Failed gate: content. (Design failed in runs 1 and 2, on the DD-001/DD-013 authority defect; true after B-7.)
- Unknown gate: performance.
- Blocker: "measured: none of 8 served page(s) offers a completable conversion action …".

**Markdown gates:** GATE 0/S/1/2 PENDING (owner) · GATE 3 N-A · GATE 5 **FAIL**. The test register has 44 cases:
- 27 PASS (4 after a fix), 8 FAIL, 7 BLOCKED, 2 PARTIAL;
- open S1: 1; open S2: 3.

**Unresolved, and staying unresolved:**
- canonical ×8, sitemap, BreadcrumbList ×7 — need the production origin;
- og:image ×8 — needs a verified asset;
- meta descriptions ×8 — need approval;
- FAQPage — needs answers;
- LocalBusiness and map — need a verified address;
- brand seed, fonts, theme mode;
- proposition, about, process, FAQ copy; 2 service descriptions; legal policies;
- the email service, or approval of a mailto-only contact;
- WhatsApp number; ICAI particulars; the price decision.

**Human approval still required:** every PENDING owner gate; the 8 description briefs; positioning B copy; the ICAI reading (the stricter reading governs until the owner confirms); `zod` admission; the theme mode.

**Verdict of the production gate: NOT publishable.** Nothing unknown was turned into a pass, and no unresolved item was filled in.

## 14. Manual Judgment Points

| # | Point | Who decided | Recorded in |
|---|---|---|---|
| 1 | Transcribing the brief into `BusinessInput` (industry, personality, visual direction, page slugs, regulation risk) | AI operator | Phase 2 plan, transcription table |
| 2 | Omitting `mobileShare` and `businessModel` rather than inventing values | AI operator | same |
| 3 | Matrix scores (Phase S ×3, Phase 1 ×3) — weights governed, scores judged, totals verified by script | AI operator | Phase S, Phase 1 |
| 4 | Stricter ICAI reading until the owner confirms | AI operator (conservative default) | Phase S S3 |
| 5 | Filing the whole site as one request (no whole-site request type) | AI operator | request intake note |
| 6 | Not copying the workflow into the workspace | AI operator | /winit record |
| 7 | Canonical left unresolved though a domain was supplied | AI operator, per the instruction "do not invent a domain" | §7 |
| 8 | Classifying each failure as fix / gap / customer input | AI operator | Phase 4 record |
| 9 | Visual judgment of screenshots (wireframe-like; navigation dominates mobile) | AI operator — **not** the owner or a designer | Phase 5 Q7 |
| 10 | Treating DD-001/DD-013 as an authority defect rather than an owner decision | AI operator, grounded in DD-017's recorded rule | B-7 |

## 15. Framework Gaps Discovered (P0/P1/P2)

**P0 — none.** Nothing fabricated, published or leaked. No gate passed on an estimate. No unknown was reported as a pass in the final state.
Two evaluator defects would have **overstated** quality: the content gate passed with no conversion path, and SEO scored 9 with no descriptions. Both were caught and fixed in this run (B-3, B-4). Unfixed, they would have been P0-adjacent: a production claim resting on an evaluator that never looked.

**P1 — prevents customer use:**

| # | Gap | Evidence |
|---|---|---|
| P1-1 | **Page-purpose semantics.** Section allocation ignores page purpose: `/contact` has no contact section, `/faq` no FAQ, `/services` and `/about` duplicate other pages, and site-level sections (`location_and_contact`, `faq`, `disclosures`) are silently dropped | served HTML; G-1/G-2; this holds **even if the customer supplied everything** |
| P1-2 | **No contact-link conversion** (mailto / tel / WhatsApp) as a primary conversion surface; no WhatsApp functionality value | DEF-001; Phase S S5 drift |
| P1-3 | **No AI-draft copy channel** with approval state; Phase S positioning and locality cannot reach titles, H1 or proposition | seam table #1; Pune appears on no page |
| P1-4 | **No compact navigation**, though the engine decides `nav.compactMode` and the trace cites it | G-5; iPhone SE screenshot |
| P1-5 | **No precedence between content-type/industry and personality rules**: fixed for `layout.system`; media + authoritative/technical (`layout.grid`) and sports/fitness + authoritative/technical (`typography.strategy`) still conflict and fail the design gate | probe; findings test 12 (negative case) |
| P1-6 | **Dependency admission conflict**: the engine installs libraries the doctrine gate denied and the generator never imports | DEF-010 |
| P1-7 | **Duplicate / placeholder indexable pages** are not detected | §6, §7 |
| P1-8 | **Markdown ↔ TS seams are manual**: brief → engine JSON by hand; Phase 2 denials never reach the host; register cases do not drive the validator | §2 seam table |

**P2 — degrades quality or workflow:**
- Workflow templating:
  - 89 literal first-site assumptions (academy, Supabase, UniqBrio, India-market, first-site routes);
  - the Supabase-for-any-form rule;
  - no whole-site request type.
- Skills: 11 of 42 mapped skills missing everywhere (competitive-research, objection-handling, visual-hierarchy, typography …); several resolving skills model another business.
- Decision matrix: no feasibility gate (a blocked option won S5).
- Option catalogues: the design library has no "constraint" category; the design library and the engine pattern registry are two catalogues; selected patterns are not reconciled with rendered output (G-3).
- Motion: selections are not checked against the motion cap.
- Phase ordering: the engine runs at Phase 2, after the interrogation that should examine it.
- `BusinessInput` expressiveness:
  - no mixed B2B+B2C;
  - no qualitative mobile share (the engine inferred `medium` for "usually on phones");
  - no "promised, not delivered" asset status;
  - no page label field ("Faq").
- Cosmetic: audience label casing mid-sentence.
- SEO:
  - the title-length warning does not reach evaluation;
  - og:type `article` for service pages;
  - service pages inherit the primary audience in description briefs.
- Performance evidence: no Playwright spec suite in the generated host; no Lighthouse; INP has no N-A semantics for non-interactive sites (policy question).
- Colour step: `generate_palette.py` vs its TS port — two instructions for one step.
- Accessibility: the AAA human-assessment recording path is still absent.
- `hasNoScriptPrimaryAction` counts any link: a misleading, unconsumed field.

## 16. What Worked Without Intervention

- **Content integrity end to end.**
  - All five prohibited or unverified claim types (rating, client count, testimonials, prices, credentials) were withheld by rule, and host assertions confirmed their absence from served HTML.
  - No stock or generated imagery stood in for missing photos.
  - No logo was drawn from a description.
- **Honest absence.** Withheld contact methods, pending descriptions, visible slots, a disabled form with a notice, a withheld CTA, refused FAQPage and LocalBusiness, and unresolved canonical, sitemap, breadcrumb and og:image — each with a stated reason and the input it needs.
- **DD-093** derived exactly the three service pages that have owner descriptions and refused the two without.
- **Host boundary.**
  - The generated project installed, built, typechecked and linted clean on every one of the three runs.
  - The core imported no host tooling.
  - Evidence kinds were never `estimated`.
- **Measured gates.**
  - WebKit installed and ran.
  - The 9-profile sweep, axe audit, focus walk, reduced-motion check and no-JS parity all ran unattended.
  - An unmeasurable vital stayed UNKNOWN.
- **The favicon exception** held to its three measured conditions.
- **DD-035 single CTA-label authority** and the form contract chain stayed consistent.
- **Token system:** 16 measured contrast pairs, rendered contrast far above AA, and the coarse-pointer 44px targets.

## 17. What Still Required Human Input

**(a) Legitimate approval — must stay human:**
- GATE 0, S, 1, 2 and 5 reviews;
- 8 meta description briefs;
- positioning B copy;
- the price decision the owner delegated;
- confirmation of the ICAI advertising reading;
- theme mode;
- `zod` admission;
- any email service (a default-deny category).

**(b) Missing framework capability** (§15): page-purpose section allocation; a contact-link / WhatsApp conversion; an AI-draft copy channel; compact navigation; rule precedence; dependency admission aligned with the doctrine; duplicate and placeholder page detection; automated seams. Plus the operator's manual work that should not be manual: transcribing the brief, reading the digest into markdown, and judging the screenshots.

**(c) Missing customer information:**
- production origin;
- full address;
- phone or WhatsApp number;
- email-sending service (or acceptance of a mailto contact);
- logo file; photos; brand colour; fonts;
- proposition, about, process and FAQ copy;
- descriptions for Company/LLP and TDS;
- privacy policy and terms;
- ICAI membership particulars and evidence for the founding year;
- the price decision;
- accessibility and performance targets;
- launch date.

## 18. Final Verdict

# NOT READY FOR CUSTOMER USE

The framework's safety and evidence layers are strong. It fabricated nothing, withheld every unverifiable claim, refused to invent a canonical, a backend or an image, measured what it claimed, and left unknowns unknown.

But on a typical small-business lead-generation brief, **the website it generates cannot do the job the customer asked for, and customer input alone would not fix that**:
- The FAQ page would still have no FAQ section and the contact page no contact section, because page purpose does not reach section allocation (P1-1).
- A verified email cannot become the primary action (P1-2).
- The agreed positioning and local search terms cannot reach the page (P1-3).
- On the phones the audience uses, navigation fills the first screen (P1-4).
- Getting to an honest evaluation took seven source fixes during the run, two of them to evaluator checks that had been scoring the site higher than it deserved.

"With limitations" would imply the output is usable for this customer now. The evidence says it is not.

## 19. Recommendations

Each item cites the evidence behind it. Not one adds an encoded rule automatically. Each is a capability or authority change for owner review.

1. **Typed page roles in `requiredPages`** (home, services index, service, about, faq, contact), driving section allocation; report any site-level section no page receives. *Evidence:* G-1/G-2; served duplicates; TC-FUNC-006, TC-UI-002.
2. **A contact-link conversion surface** (mailto, tel, wa.me), with the conversion matrix given a feasibility input. *Evidence:* DEF-001; S5 drift; 0 completable actions.
3. **An approval-state content channel** (`ai_draft` → held → approved) from Phase S into the generator, covering proposition, titles with locality, and meta descriptions. *Evidence:* seam #1; "Pune" absent; 8 unreleased briefs.
4. **Implement `nav.compactMode` as a no-JS disclosure navigation**, or stop citing the decision in traces. *Evidence:* G-5 screenshots.
5. **A precedence model between content-type/industry and personality rules** (the DD-017 authority, made general). *Evidence:* B-7; probe conflicts on `layout.grid` and `typography.strategy`.
6. **Dependency admission through one authority:** the engine proposes, the doctrine gate admits, and the host installs only admitted packages that the generator imports. *Evidence:* DEF-010.
7. **Served-HTML checks for duplicate bodies and placeholder text on indexable pages.** *Evidence:* §6, §7.
8. **Owner policy decision:** what INP means for a page with no interactive controls. The policy was not changed here. *Evidence:* §10.
9. **Workflow de-templating** (89 literals), a whole-site request type, a replacement for the Supabase-for-any-form rule, and the 11 missing skills. *Evidence:* /winit and Phase S/1 records.
10. **Keep `refine()` open** until items 1–4 exist. *Evidence:* the §11 table shows no failure the loop could have corrected today.

## 20. Commit Recommendation

**Do NOT commit yourself** — and this run committed nothing.

Recommended when the owner has reviewed it, as three separate commits:
1. **Framework source fixes and tests.**
   - Contact-method status; mailto links; structured-data completion and verification; SINGLE-DARK default authority; stack names; coarse targets; responsive sweep and gate; favicon evidence.
   - Offer-name labels; `areaServed` verification; description uniqueness; conversion-action measurement and content gate; disabled-state CSS; typography loading claim.
   - The DD-013/DD-015 authority fix; `stack_doctrine.md` GENERATED SITES paragraph; README update-log line.
   - `tests/scenarios/customer-dry-run-findings.test.ts`, updated fixtures, `tests/host/host-boundary.test.ts`.
2. **Customer dry-run workspace:** `customers/ashvattha-tax/` excluding `generated-host/` (already git-ignored), plus `tests/host/ashvattha.host.ts`. The digest (`evidence/customer-dry-run-digest.json`, ~670 KB, includes served HTML) is the evidence of record. Commit it deliberately or replace it with a trimmed copy; do not let it ride along unnoticed.
3. **This report.**

Before committing, re-run `npm run gate` and `npm run host:e2e` on the exact tree being committed.
