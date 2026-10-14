# TEST REGISTER — WEB-NEW-20260914-practice-website
<!-- Governed by website_workflow/qa_workflow.md. Cases created at Phase 2 from the
     request, the component model, the flows, the viewport matrix, the theme and the
     degraded-path inventory, then executed by the host run. Append-only. -->

REQUEST: customers/ashvattha-tax/website_workflow/requests/WEB-NEW-20260914-practice-website.md
{THEME_MODE}: SINGLE-DARK (template default, UNCHOSEN by the owner)
GENERATED: 2026-09-14   LAST RUN: 2026-09-14 (final host run, after every source fix)
EXECUTOR: `tests/host/ashvattha.host.ts` → `host/validate.mjs`; digest
`customers/ashvattha-tax/evidence/customer-dry-run-digest.json`; screenshots
`customers/ashvattha-tax/generated-host/host/evidence/screenshots/<profile>/`.

## TRACEABILITY — every MUST-HAVE maps to ≥1 case
| # | MUST-HAVE (verbatim from the request) | Case IDs |
|---|---|---|
| 1 | Home, Services, one page per service, About us, FAQ, Contact (owner's page list) | TC-FUNC-001, TC-FUNC-002, TC-UI-001, TC-UI-002 |
| 2 | Get more enquiries — calls, WhatsApp or email | TC-FUNC-003, TC-FUNC-004, TC-FUNC-005, TC-DP-001 |
| 3 | Rank on Google for the services in Pune | TC-SEO-001 … TC-SEO-008 |
| 4 | Look trustworthy and professional, modern but not flashy, approachable | TC-COPY-001, TC-COPY-002, TC-UI-003, TC-THEME-001 |
| 5 | An FAQ | TC-FUNC-006 |
| 6 | A simple contact form that emails the practice | TC-FUNC-004, TC-DP-002 |
| 7 | A WhatsApp button | TC-FUNC-005 |
| 8 | A map to the office | TC-FUNC-007 |
| 9 | owner to trim at Gate 1 | N-A — an instruction to the owner, not a behaviour |

## CASES
| ID | Area | Title | Source | Traces | Profile(s) | Theme(s) | Sev | Auto? | Result | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-RESP-001 | RESP | No horizontal overflow (RF-001), all pages | VIEWPORT | 1 | Galaxy S9+ 320 (chromium) | dark | S1 | y | PASS | responsive.profiles[Galaxy S9+] failures [] |
| TC-RESP-002 | RESP | No horizontal overflow, all pages | VIEWPORT | 1 | iPhone SE 320 (webkit) | dark | S1 | y | PASS | WebKit 26.6 installed by the host step; failures [] |
| TC-RESP-003 | RESP | Overflow + touch ≥44px (RF-006) | VIEWPORT | 1,2 | Pixel 7, iPhone 15 (webkit), iPad gen 7 (webkit) | dark | S1 | y | PASS | failures [] on all three |
| TC-RESP-004 | RESP | Wide layout holds | VIEWPORT | 1 | Desktop Chrome 1280, Desktop 1920 | dark | S2 | y | PASS | failures [] |
| TC-RESP-005 | RESP | Landscape mobile does not break the hero | VIEWPORT | 1 | Galaxy S9+ landscape | dark | S3 | y | PASS | non-mandatory profile, failures [] |
| TC-THEME-001 | THEME | Computed contrast table, all pairs | THEME | 4 | n/a | dark | S1 | y | PASS | tokens.contrast: every pair passes; rendered lowest normal text 9.13:1 |
| TC-A11Y-001 | A11Y | Keyboard path, focus visible, not obscured | COMPONENT | 1,2 | Desktop Chrome | dark | S1 | y | PASS | 144/144 focusable reached; 0 without an indicator; 0 obscured |
| TC-A11Y-002 | A11Y | axe-core, every page | COMPONENT | 1 | Desktop Chrome | dark | S1 | y | PASS | 0 violations on 8 pages |
| TC-A11Y-003 | A11Y | Reduced motion honoured | COMPONENT | 4 | Desktop Chrome, reduce | dark | S2 | y | PASS | no motion persists under reduce (0ms) |
| TC-A11Y-004 | A11Y | Hover reveals nothing (touch / no-hover) | COMPONENT | 1 | Desktop Chrome | dark | S2 | y | PASS | hover reveals 0 of 136 |
| TC-A11Y-005 | A11Y | Target size | COMPONENT | 1 | fine: Desktop Chrome; coarse: touch profiles | dark | S2 | y | PASS | fine smallest 27px ≥24 (AA); coarse profiles 0 targets <44 |
| TC-A11Y-006 | A11Y | AAA criteria needing a person (visual presentation, link purpose, plain language) | COMPONENT | 4 | — | dark | S3 | n | BLOCKED | human_assessment_required; the target is AA, so AA is not blocked; AAA stays UNKNOWN |
| TC-FUNC-001 | FUNC | Every planned route builds and serves 200 | FLOW | 1 | server | — | S1 | y | PASS | 8/8 built and served 200; route inventory matched |
| TC-FUNC-002 | FUNC | Unknown route → 404 with the not-found page | FLOW | 1 | server | — | S2 | y | PASS | probe 404, marker present |
| TC-FUNC-003 | FUNC | A visitor can complete a contact action on some page | FLOW | 2 | Desktop Chrome, no JS | — | S1 | y | **FAIL** | 0 completable actions on 8 pages: the form is disabled (no endpoint) and the verified email is rendered on no page → DEF-001 |
| TC-FUNC-004 | FUNC | Contact form sends an email | FLOW | 2,6 | — | — | S1 | n | BLOCKED | no email service named (customer input); backend DENIED at Phase 2 |
| TC-FUNC-005 | FUNC | WhatsApp button opens a chat | FLOW | 2,7 | — | — | S2 | n | BLOCKED | WhatsApp number not supplied (customer input); no WhatsApp capability exists in the engine (framework gap) |
| TC-FUNC-006 | FUNC | FAQ page answers questions | REQ | 5 | Desktop Chrome | — | S2 | y | **FAIL** | `/faq` renders proposition, qualifications and process slots, with no FAQ section → DEF-002. FAQ copy is also missing (customer input). |
| TC-FUNC-007 | FUNC | Map to the office | REQ | 8 | — | — | S3 | n | BLOCKED | full address not supplied (customer input); DD-114 omits the map for an unverified address |
| TC-UI-001 | UI | Page labels use the owner's service names | COMPONENT | 1 | all | — | S2 | y | PASS after fix | DEF-003 fixed; see regression run |
| TC-UI-002 | UI | Each page's content matches its purpose (no duplicate pages) | REQ | 1,3 | — | — | S2 | y | **FAIL** | `/services` body = `/` body; `/about` body = `/faq` body; `/contact` carries no contact section → DEF-002 |
| TC-UI-003 | UI | No selected pattern goes unrendered | COMPONENT | 4 | — | — | S3 | y | **FAIL** | perspective-card and magnetic-action selected, not rendered → DEF-004 |
| TC-UI-004 | UI | Disabled controls do not look actionable (Q-STATE-CONTRAST) | COMPONENT | 2,6 | every profile screenshot | dark | S3 | y | PASS after fix | DEF-011 fixed: `button:disabled` uses `--color-accent-1-disabled`; regression finding 11 |
| TC-RESP-006 | RESP | On a 320px phone the H1 and the proposition are reached without scrolling past the navigation | VIEWPORT | 1,3 | iPhone SE 320 (webkit) | dark | S2 | n | **FAIL** | iphone-se/home.png: five rows of links before the H1; no compact navigation → DEF-012 |
| TC-UI-005 | UI | The design decision carries no unresolved rule conflict (design gate) | COMPONENT | 4 | engine | — | S2 | y | PASS after fix | DEF-014: DD-001 vs DD-013 on layout.system; fixed at the authority; confirmed by the final host run |
| TC-COPY-001 | COPY | No fabricated or restricted claim (ICAI overlay) | SAFETY | 4 | served HTML | — | S1 | y | PASS | no "4.9", "60+", ₹ prices, "testimonial" or "review" in served HTML; certifications, reviews, statistics and pricing withheld (DD-100, DD-102) |
| TC-COPY-002 | COPY | Plain phrases, no placeholder shipped as copy | REQ | 4 | served HTML | — | S2 | y | **FAIL** | the proposition, qualifications and process are visible "to be supplied" slots (customer input); "Faq" label (DEF-005); "For Small business owners…" casing (DEF-006) |
| TC-SEO-001 | SEO | Title present, unique, ≤60 chars | SAFETY | 3 | served HTML | — | S3 | y | **FAIL** | 8 unique titles; `/services/gst-registration-and-return-filing` is 63 chars (plan warned "needs a shorter form"; served-HTML scoring does not check length) → DEF-013 |
| TC-SEO-002 | SEO | Meta description present and unique | SAFETY | 3 | served HTML | — | S2 | y | BLOCKED | an AI brief awaits owner approval; none emitted by design. Scored as missing after DEF-007's fix. |
| TC-SEO-003 | SEO | Canonical absolute, on the production host | SAFETY | 3 | served HTML | — | S1 | y | BLOCKED | no `<link rel=canonical>` (correct); required input: the confirmed production origin for ashvattha-tax.example |
| TC-SEO-004 | SEO | Exactly one H1, no heading skips | SAFETY | 3 | served HTML | — | S2 | y | PASS | h1Count 1 and headingSkips false on 8 pages |
| TC-SEO-005 | SEO | robots.txt and sitemap.xml | SAFETY | 3 | built output | — | S2 | y | PARTIAL → BLOCKED | robots.txt `Allow: /` served; sitemap unresolved (needs the canonical origin) |
| TC-SEO-006 | SEO | JSON-LD valid, every entity present on the page | SAFETY | 3 | served HTML | — | S1 | y | PASS after fix | no invalid JSON-LD; `areaServed` from an unverified location removed (DEF-008) |
| TC-SEO-007 | SEO | OG and Twitter tags; OG image | SAFETY | 3 | served HTML | — | S3 | y | PARTIAL | og:title, og:type, twitter:card and twitter:title present; og:image unresolved (no verified asset). og:type "article" on service pages (DEF-009) |
| TC-SEO-008 | SEO | No indexable content behind a client boundary | SAFETY | 3 | Desktop Chrome, JS disabled | — | S1 | y | PASS | no-JS text ≥98% of JS text on every page; the only client file is error.tsx |
| TC-PERF-001 | PERF | Route first-load JS within the 200KB budget | SAFETY | 3 | production server | — | S1 | y | PASS | 142.6KB gzip on every route (measured) |
| TC-PERF-002 | PERF | LCP < 2.5s, CLS < 0.1, INP < 200ms | SAFETY | 3 | throttled lab (Chromium, 4× CPU, 150ms RTT) | — | S1 | y | BLOCKED | LCP 556–668ms and CLS 0 measured in the LAB; INP not measurable (no non-navigating control exists), so vitals are UNAVAILABLE and the gate UNKNOWN. Not field data. |
| TC-PERF-003 | PERF | Every installed dependency passed the gate | SAFETY | 3 | install manifest | — | S2 | y | **FAIL** | react-hook-form installed, DENIED at Phase 2, imported by nothing → DEF-010 |
| TC-DP-001 | DP | Degraded: contact method declared but unverified (phone/address partial) | SAFETY | 2 | served HTML | — | S1 | y | PASS | phone and address are withheld, not rendered as data; the source lists withheld methods |
| TC-DP-002 | DP | Degraded: form endpoint unset | SAFETY | 6 | Desktop Chrome | — | S1 | y | PASS | 6 forms, 6 disabled, notice "Enquiries are not connected yet, so this form cannot be sent."; no action attribute; CTA withheld |
| TC-DP-003 | DP | Degraded: service description missing (declared offer, no value) | SAFETY | 1 | served HTML | — | S2 | y | PASS | card says "description to be supplied"; DD-093 derives no page for the two offers |
| TC-DP-004 | DP | Degraded: JavaScript disabled | SAFETY | 1 | Desktop Chrome, JS disabled | — | S1 | y | PASS | mandatory profile, failures [] |
| TC-TECH-001 | COMPAT | next build, tsc, eslint clean; no blocking console error | SAFETY | — | host | — | S1 | y | PASS | exit 0/0/0; the one console error is `/favicon.ico` 404, first page only, with no favicon reference and not page-initiated (narrow exception) |
| TC-TECH-002 | COMPAT | No secret in build output | SAFETY | — | host | — | S1 | y | PASS | 36 files scanned, 0 findings |

## DEFECTS
| ID | From case | Severity | Root cause (cause, not symptom) | RF-xxx | Fix | Permanent case | Status |
|---|---|---|---|---|---|---|---|
| DEF-001 | TC-FUNC-003 | S1 | two causes: no email backend (customer input), and the verified email is published only in a contact section that no page is allocated (framework: page-purpose semantics). The evaluator did not notice. | — | EVALUATOR fixed: the content gate now fails on measured served HTML with no completable action. The site itself is NOT fixed — needs the capability or customer input. | findings test 10 | OPEN |
| DEF-002 | TC-FUNC-006, TC-UI-002 | S2 | page purpose (free text) never reaches section allocation; sections come from the page objective only | — | none — framework capability gap (P1) | — | OPEN |
| DEF-003 | TC-UI-001 | S2 | labels rebuilt from the slug; offer name discarded | — | `pageLabel(page)` and the SEO label use `offerName` | findings test 7 | FIXED |
| DEF-004 | TC-UI-003 | S3 | the pattern registry selects patterns the generator cannot render; nothing reconciles them | — | none — framework gap (P2) | — | OPEN |
| DEF-005 | TC-COPY-002 | S4 | `requiredPages` has no label field; the path is the only source | — | none — contract gap (P2) | — | OPEN |
| DEF-006 | TC-COPY-002 | S4 | the audience label is quoted verbatim after "For " | — | none — cosmetic (P2) | — | OPEN |
| DEF-007 | TC-SEO-002 | S2 | `uniqueTitleAndDescription` ignored the description | — | description required and not duplicated | findings test 9 | FIXED |
| DEF-008 | TC-SEO-006 | S2 | service areas read without the location's verification | — | areas only when verified | findings test 8 | FIXED |
| DEF-009 | TC-SEO-007 | S4 | seoRole "detail" maps to og:type article for a service page | — | none (P2) | — | OPEN |
| DEF-010 | TC-PERF-003 | S2 | the engine admits a library on a requirement alone; the doctrine gate needs five answers and owner approval | — | none — conflicting authorities, recorded for owner decision (P1) | — | OPEN |
| DEF-011 | TC-UI-004 | S3 | the disabled token was generated but not consumed by any rule | — | `button:disabled` rule in css.ts | findings test 11 | FIXED |
| DEF-012 | TC-RESP-006 | S2 | no compact navigation in the generator; the header trace cites `nav.compactMode` though the output does not implement it | — | none — framework capability gap (P1) | — | OPEN |
| DEF-013 | TC-SEO-001 | S3 | the title = offer name + business name, with no short form; the plan's length warning does not reach evaluation | — | none — a short title is copy needing owner approval (customer input); the warning-to-evaluation seam is a P2 gap | — | OPEN |
| DEF-014 | TC-UI-005 | S2 | personality rule DD-013 (and DD-015) wrote `layout.system`, which DD-017 assigns to the industry rules | — | DD-013/DD-015 write `layout.grid` | findings test 12 | FIXED |

ACCEPTED requires the owner's written reason plus a follow-up entry. Nothing is accepted.

## REGRESSION RUNS
| After | Set run (a-f per qa_workflow.md §5) | Case IDs | Result |
|---|---|---|---|
| DEF-003, DEF-007, DEF-008, DEF-011, DEF-014 fixes and the DEF-001 evaluator fix | (a) the changed cases; (b) the full core suite (`npm run gate`); (c) the full host run on all 9 profiles and 8 pages | TC-UI-001, TC-UI-004, TC-SEO-002, TC-SEO-006, TC-FUNC-003, then every case above | see QA SUMMARY |

## QA SUMMARY
- Cases: generated 44 / executed 44 / passed 27 (4 of them after a fix) / failed 8 / blocked 7 / partial 2 (one blocked by a missing input) / N-A 1 (MUST-HAVE 9, not a case)
- Open S1: **1** (DEF-001). Open S2: **3** (DEF-002, DEF-010, DEF-012). → GATE 5 cannot pass.
- Open S3/S4: DEF-004, DEF-005, DEF-006, DEF-009, DEF-013. Accepted: none.
- BLOCKED cases are blocked on customer input (email service, WhatsApp number, address, production origin, approved descriptions), on field data (INP/field vitals), or on a person (AAA human criteria). None is converted into a pass.
- Regression sets run: (a) the changed cases; (b) `npm run gate` — typecheck, full core suite, self-audit; (c) the full host run, 9 profiles × 8 pages, re-run after the fixes.
- **NOT covered / limits:**
  - Emulated devices only (Playwright descriptors; a WebKit build on Windows), not physical iOS or Android hardware.
  - Screenshots reviewed by the AI operator, not by the owner or a designer.
  - Lab vitals only (Chromium throttled on localhost) — not field data, and not a production CDN. INP not measured: no interactive control exists.
  - No per-component hover/focus STATE screenshots; no Lighthouse run.
  - No Playwright spec suite in the generated host — `host/validate.mjs` is the executor (Phase 5 §2 gap).
  - AAA human-assessment criteria not assessed; no real submission path to test.
  - A full site-level near-duplicate-content check does not exist; the duplicate bodies were found by reading the served HTML.
