# Customer Dry-Run Readiness Report

Date: 2026-09-14. Input: the synthetic `FIXTURE-VERDALEEN-MOBILITY` business, unchanged.
Nothing in this phase was committed.

**Verdict: READY FOR CUSTOMER DRY RUN** — not production ready. The reasons and the
conditions are in section 8.

## Validation summary

| Check | Result |
|---|---|
| Typecheck | PASS |
| Core test suite | **544 passed, 21 files** (was 493 before this phase) |
| Self-audit | 11 checks, 0 FAIL, 2 WARN (both pre-existing) |
| Rule coverage | 103 encoded, 17 intentionally not encoded, 0 pending; 120 ids verified against the specification |
| Host end-to-end (`npm run host:e2e`) | PASS, 185 s: generate → install → build → serve → evidence → audit → gates |
| Rules added this phase | **0** |

The host end-to-end run is deliberately outside `npm test`. It installs packages from
the registry and launches a browser, so it runs as its own command.

---

## 1. Host Architecture

The framework stays a library. A host is a separate, generated project that owns its
runtime.

```
Framework core (this repository)                 Host project (generated)
--------------------------------                 ------------------------
runPipeline()        decide                      package.json   runtime + toolchain, declared
generateWebsite()    generate                    npm install    installs the declared sets only
planHostProject()    write host files            next build     production build
                                                 next start     serve
                                                 validate.mjs   raw facts: build, HTML, JS,
                                                                secrets, audit, lab vitals
parseRawHostEvidence()  schema-check raw  <----  host/evidence/raw-host-evidence.json
hostEvidenceToBuildEvidence()  tag evidence
runPipeline(input, { evidence })  every gate
```

| Responsibility | Owner | Where |
|---|---|---|
| Decisions, generation, policy, every gate | core | `src/pipeline.ts`, `src/quality/gate-derivation.ts` |
| Declared runtime packages, from the stack decision | core, declaration only | `src/stack/runtime-packages.ts` |
| Declared build and audit toolchain, with a purpose per entry | core, declaration only | `src/host/toolchain.ts` |
| Writing the host's files and the core → host manifest | core, files only | `src/host/host-project.ts` |
| Installing, building, serving, auditing | host | `host/validate.mjs`, copied from `src/host/runtime/validate.mjs` |
| The host → core contract | core schema | `src/host/raw-host-evidence.ts` |
| Turning raw facts into tagged evidence | core | `src/host/host-evidence.ts` |

**The boundary is enforced by tests, not only described.**

- The core `package.json` declares none of `next`, `react`, `react-dom`, `playwright-core`, `axe-core`, `eslint`, `next-intl` or `react-hook-form`.
- No core module imports a host package. The test parses real import declarations; TSX the core writes as text does not count.
- The host collector imports only `node:` built-ins, and requires only packages in the declared toolchain.
- The host's `package.json` equals the stack's runtime set plus the toolchain contract, exactly.

**The dependency gate was not weakened; it became real.** Before this phase the
installed dependency list was measured and compared with nothing. The technical gate
now fails on any undeclared runtime or toolchain package, and on any declared runtime
package that is not installed. The playwright driver uses a browser already on the
machine and downloads none.

**Host installs, measured:**

| Package | Declared | Installed |
|---|---|---|
| next | ^15.5.0 | 15.5.25 |
| react / react-dom | ^19.1.0 | 19.3.0 |
| next-intl | ^4.0.0 | 4.14.4 |
| react-hook-form | ^7.0.0 | 7.88.0 |
| zod | ^3.23.0 | 3.25.76 |
| typescript / eslint / eslint-config-next | toolchain | 5.9.3 / 9.39.5 / 15.5.25 |
| axe-core / playwright-core | toolchain | 4.13.0 / 1.63.0 |

"headless CMS client" is an instruction in the stack decision, not a package. It is
recorded in the manifest and never installed.

---

## 2. Build Evidence

| Field | Static-only run (previous) | Host run (now) | Produced by |
|---|---|---|---|
| technical | **derived** | **measured** | `next build`, `tsc --noEmit` and `eslint` exit codes; console errors in a real browser on every page; not-found probe HTTP status; secret scan over build output |
| routeInventory | derived | **measured** | the build's own `.next/app-path-routes-manifest.json` |
| servedHtml | measured, from static files | **measured, from `next start`** | fetched over HTTP with JavaScript not executed |
| bundles | **unavailable** | **measured** | gzipped bytes of every external `<script src>` each served page loads |
| dependencies | measured | measured | installed versions read from `node_modules` |
| toolchain | not modelled | **measured** | the host's devDependencies, verified installed |
| accessibility | **unavailable** | **measured, partial by design** | axe-core plus DOM measurements in Chrome 152; see section 3 |
| webVitals | **unavailable** | **measured, LAB** | Chrome DevTools Protocol throttling and PerformanceObserver |

Nothing is `estimated`; a test asserts that. The mapping follows four rules:

1. **Only an observed value becomes measured.**
2. **An unmeasured criterion is omitted**, so the evaluator reports it `unknown`.
3. **A partial check can prove a failure, never a pass.**
4. **Incomplete evidence makes a field unavailable.** A route with a script that failed to load makes the whole bundle field unavailable, rather than an understated total.

**What "lab vitals" means here.** The profile is a 412×823 viewport, 4× CPU slowdown,
150 ms latency, 1,638 kbps down, with the cache disabled. The site is served on
localhost. LCP and CLS come from every page. INP comes from Event Timing entries for
scripted clicks on controls that do not navigate. Only `/devices` has such controls,
so INP rests on 3 interactions on one page. This is **lab evidence, not field p75**,
and the evidence source says so. The existing performance gate accepts either, and
this phase did not change that policy.

**The favicon console error.** Chrome's implicit `/favicon.ico` request returned 404 on
the first navigation; no page references an icon, and the fixture supplies no icon
file. The mapping classifies exactly this case as non-blocking and records it as a
technical warning. Every other console error blocks, including a 404 for any resource a
page references. Tests prove both sides.

---

## 3. Accessibility Evidence

The evaluator remains the policy layer; the audit is the evidence producer. The
requested target is AAA and stays AAA: body text 7:1, large text 4.5:1, targets 44 px.

**One evaluator change, in the honest direction.** It now accepts partial observations.
A criterion whose fields were not measured is `unknown`, never a pass. Before this
change, supplying any observation object turned every unfailed criterion into a pass,
so a partial audit could not have been represented truthfully.

| Criterion | WCAG | Status | How it is measured |
|---|---|---|---|
| input independence | 2.1.1, 2.5.1, 2.5.7 | measured | Tab walk over every visible enabled focusable element; hover each element and diff visible content; count draggable elements, WebGL contexts and device-motion listeners; axe keyboard rules |
| focus visible, not obscured | 2.4.7, 2.4.11 | measured | at each Tab stop, a computed outline or box-shadow, and an `elementFromPoint` hit test at the element's centre |
| body contrast | 1.4.3, 1.4.6 | measured | axe `color-contrast` and `color-contrast-enhanced`, split by WCAG text size; any node axe cannot determine makes the criterion unknown |
| large-text contrast | 1.4.6 | measured | the large-text subset of the same samples |
| logo visibility | framework rule | not applicable here | no logo image is rendered; a logo image would need a person |
| reflow and 400% zoom | 1.4.10 | measured | a 320 CSS px viewport: horizontal overflow, and rendered text length against the 1280 px render |
| media alternatives | 1.1.1, 1.2.2 | measured | axe media rules; anything axe marks for review needs a person |
| reduced motion / interaction motion | 2.3.3 | measured | `prefers-reduced-motion: reduce` emulated; the longest computed transition and animation, and running Web Animations |
| forms | 1.3.1, 1.3.5, 3.3.2, 4.1.3 | measured | programmatic labels, `aria-describedby` targets exist, status region present, axe form rules |
| target size | 2.5.8, 2.5.5 | measured | bounding box of every interactive element; links inline in a sentence are exempt |
| visual presentation | 1.4.8 | **human assessment required** | measured: justified text, line-height ≥ 1.5, line length ≤ 80 characters. Not measurable: user colour selection, and 200% resize in a reading window |
| link purpose (link only) | 2.4.9 | **human assessment required** | generic link text fails automatically; whether each remaining link names its purpose is a judgement |
| reading level | 3.1.5 | **human assessment required** | not machine-certified |
| sign language | 1.2.6 | not applicable here | no audio or video on any page |

**Stated limits of the automated audit:**

- React's delegated click handlers on non-focusable elements cannot be attributed; only role and onclick attributes are counted.
- Motion driven by `requestAnimationFrame` is invisible to the reduced-motion check.
- The wording and timing of runtime error messages need a working submission path and a person.

**Result on the fixture:** 11 criteria pass on measured evidence, 1 is not applicable,
and 3 are unknown pending human assessment. The gate is `unknown`. That is correct:
an AAA site cannot be certified by a machine alone.

---

## 4. Form Semantics

Every conversion section now has an action-specific contract in
`src/generation/form-contracts.ts`. The contract is the only source of the call to
action's label, so a label cannot name one action while its form represents another.

| Kind | Action label | Submit label | Fields | Never collects |
|---|---|---|---|---|
| booking | Request an appointment | Send appointment request | name, email, phone (optional), service (select), preferred date, notes (optional) | card data, passwords |
| checkout | Go to checkout | Submit order request | product (select), quantity (min 1), name, email, delivery address | card data, passwords |
| enquiry | Send an enquiry | Send enquiry | name, email, message | card data, passwords |
| signup | from the objective (e.g. "Start a free trial") | same | name, email | card data, passwords |

**Honesty rules the code enforces:**

- **No backend is invented.** An endpoint exists only when the host supplies one.
  Without one, the form renders inside a disabled fieldset with a visible notice and
  no `action` attribute, and no call to action may promote it.
- **Select options come only from owner-supplied offers**, split by offer kind. With no
  offers, the select is omitted.
- **A booking form requests, it does not book.** Without a scheduling integration it
  cannot confirm an appointment, so its labels say "request".
- **Payment is never collected by a form.** The contract forbids card and password
  fields.

**Validation.** Browser constraint validation (`required`, `type`, `min`) works with no
JavaScript. Each contract is also emitted as a zod schema in `app/_forms/contracts.ts`,
which the host typechecks, and which a configured host endpoint must apply
server-side.

**Enforcement.** `validateConversionSemantics()` runs inside `generateWebsite()`, which
refuses to emit a site where any of these hold:

- an action label differs from its target contract's label;
- a form's contract kind differs from the section it sits in;
- an action promotes a form whose endpoint is unconfigured;
- a contract contains a forbidden field;
- an action points at a page with no contracted form.

19 tests cover the contracts and the validator. They include tampered models that
each violation must catch.

**On the fixture.** `/devices` renders the checkout contract disabled with its notice.
Its primary action is withheld, citing the unconfigured endpoint. The static run had
promoted "Go to checkout" toward a generic message form.

---

## 5. End-to-End Pipeline

Every transition has a contract, and the host run exercised each one.

| # | Transition | Contract | Evidence it connected |
|---|---|---|---|
| 1 | BusinessInput → `runPipeline()` | `businessInputSchema` | 16 variables, 82 rules applied, 5 pages |
| 2 | decisions → `generateWebsite()` | `DesignDecisionOutput`, form contracts, semantic validator | 1 checkout contract, 0 semantic violations |
| 3 | generated site → host project | `HostManifest` (`host/host-manifest.json`) | routes, AAA thresholds, 150 KB budget, declared sets, form endpoint states |
| 4 | host → install | host `package.json` equals declared runtime + toolchain | exit 0; every declared package installed |
| 5 | install → production build | `next build` exit code | exit 0 |
| 6 | build → typecheck, lint | `tsc --noEmit`, `eslint .` exit codes | 0 and 0; 0 lint errors, 0 warnings |
| 7 | build → route inventory | `.next/app-path-routes-manifest.json` | 5 routes; 0 missing, 0 unplanned |
| 8 | build → serve | `next start` responds | started; all 5 routes HTTP 200; probe route HTTP 404 with the not-found marker |
| 9 | serve → served HTML, JS, secrets | raw routes, scripts, secret scan | 5 documents, 8 scripts per page, 0 secret findings over 30 files |
| 10 | serve → accessibility audit | raw page audits | 5 pages; 62 focus stops; 262 contrast samples |
| 11 | serve → lab vitals | raw vitals pages | 5 LCP and CLS samples; 3 interactions |
| 12 | raw file → core | `parseRawHostEvidence()` zod schema | parsed; a malformed file is refused (tested) |
| 13 | raw → tagged evidence | `hostEvidenceToBuildEvidence()` | 8 fields measured, 0 estimated |
| 14 | evidence → gates | `runPipeline(input, { evidence })` | `post_build`; 5 of 6 gates decided, and the undecided one names its reason |

---

## 6. Verdaleen Results

Three columns:

- **Static-only:** the previous phase's harness, re-run on this phase's code.
- **Host run 1:** the first real run.
- **Host run 2:** after fixing the defects that run 1 found.

| Area | Static-only | Host run 1 | Host run 2 |
|---|---|---|---|
| **Build** | static files written; TSX syntax-checked; `next build` not run | `next build` exit 0 (42 s); tsc exit 0; eslint exit 0 with 1 warning | exit 0 (26 s); tsc 0; eslint 0 errors, 0 warnings |
| **Routes** | 5 files on disk (derived) | 5 built, 5 HTTP 200, 404 probe correct (measured) | same |
| **Served HTML** | static files: 1 h1 per page, 5 internal links, 0 images without alt | from `next start`: same structure | same |
| **JS** | unavailable | 142.6–142.9 KB gzipped per route (461 KB raw), 8 scripts; inline payload 5.9–9.5 KB | same |
| **SEO** | 9/10, canonical missing (no origin supplied) | 9/10, same reason | 9/10, same reason |
| **Accessibility** | gate unknown; 14 AAA criteria unclassified | gate **FAIL**: body contrast 5.19:1 < 7:1; smallest target 7 px < 44 px | gate **unknown**: 11 pass, 0 fail, 3 need a person |
| **Performance** | gate unknown; no measured bundle | gate pass: 142.9 of 150 KB; lab LCP ≤ 0.62 s, CLS 0, INP 40 ms | gate pass: lab LCP ≤ 0.64 s, CLS 0, INP 32 ms |
| **Technical** | pass, derived | **FAIL**: a console error, later identified as the favicon request | pass, measured; favicon recorded as a warning |
| **Quality** | `technically_working`, 76.7 | `failing`, 63.5 | `technically_working`, **77.1** |
| **Production gate** | blocked: content (DD-101) | blocked: technical, accessibility, content | blocked: content (DD-101) |

**Why the level is still `technically_working`.** The content gate fails for the same
honest reason as before. The primary objective, booking, needs a verified address, and
the fixture's contact details are unverified on purpose. No host can change that, and
no evidence may.

### Defects the real audit found, fixed at the right layer

Each was invisible to the static-only run, because no page had been rendered in a
browser before.

1. **AAA never reached the palette.** The token generator checked every text pair at
   4.5:1 whatever target was requested. The evaluator enforced 7:1, but the tokens were
   generated for AA, and the design gate called them valid. The audit measured the
   accent label at 5.19:1, exactly the ratio the palette computes at AA.
   - **Fix:** the requested target now drives the palette through `thresholdsFor()`, the evaluator's own authority. The accent fill moved one ramp step, and its label now measures 7.46:1.
   - **Unchanged:** AA still reproduces `generate_palette.py`, and the parity tests still pass.
2. **Interactive targets had no minimum except buttons.** Buttons took theirs from an
   unrelated gutter token. Navigation links measured 24 px tall.
   - **Fix:** the stylesheet gives links, buttons, summaries and fields the requested minimum, from the accessibility thresholds: 44 px at AAA, 24 px at AA.
3. **Footer links showed the raw route as their text.** The home link read "/", named
   no purpose, and measured 7 px wide.
   - **Fix:** the footer uses the same page labels as the navigation.
4. **The generated ESLint config tripped its own lint rule.** Fixed in the planner.

Each fix has a regression test in `tests/scenarios/host-audit-findings.test.ts`. None
weakened a threshold, and none converted an unknown into a pass.

---

## 7. Remaining Gaps

### P0
**None.**

### P1 — before production; none blocks an honest customer dry run
1. **No way to record a human accessibility assessment.** At AAA the gate will stay
   `unknown` until someone assesses 1.4.8, 2.4.9 and 3.1.5. The evaluator accepts those
   answers, but nothing captures who assessed, when, or on which build.
2. **Field vitals do not exist.** The performance gate passed on lab evidence served
   from localhost, with INP from 3 scripted interactions on one page. The current
   policy accepts lab evidence for the production gate. Whether production should
   require field p75 is a policy decision for you. This phase did not change it.
3. **Prose drafting and approval workflow** (carried over). A real customer run will
   show many content slots.
4. **`refine()` is still not invoked** (carried over).
5. **Locale routing is ungoverned** (carried over). The fixture requires multilingual
   support, so `next-intl` is installed, but nothing uses it and the site is
   single-locale.
6. **No submission has been exercised end to end.** The fixture host has no endpoint,
   so the configured-endpoint path is proven only by generator tests, not by a real
   POST.

### P2
7. **Declared but unused runtime packages.** `react-hook-form` is installed and unused,
   because forms use native validation; `next-intl` is unused too (item 5). The
   dependency gate checks what is declared, not what is used.
8. **The stack decision lists `tailwindcss`, `shadcn/ui` and `lucide-react`**, but the
   generator emits token-driven plain CSS. This mismatch predates this phase and is
   now visible in a real host.
9. **No icon asset.** The implicit favicon request 404s. A verified icon should be
   requested through the asset inventory, like the logo.
10. **The evaluator's wording for 1.4.8** says "measurable, but no observation
    supplied", while the audit coverage table records it as needing a person.
11. **Audit method limits** (section 3): delegated React handlers,
    `requestAnimationFrame` motion, contrast over images. Each is recorded as a limit,
    and none produces a pass.
12. **Lab vitals are a single run per page**, not a median of several.
13. **Budget headroom is small.** Every route loads about 143 KB of a 150 KB budget,
    nearly all of it the Next.js and React baseline plus the gallery client component.
14. **The collector ships as a source file** read relative to `src/host/runtime/`. A
    compiled distribution of the library would need to copy it.
15. **An older documentation discrepancy.** Earlier reports cite 22 measured contrast
    pairs for this fixture; the current token contract measures 16, at both AA and AAA.
16. **Left alone as instructed:** five rules with no current target, the 21 rule
    classification moves, the DD-011 vs DD-014 authority decision, and `:has()` sticky
    CTA behaviour.

---

## 8. Customer Dry-Run Readiness

## READY FOR CUSTOMER DRY RUN

The three blockers that ended the last phase are closed.

- **A host runs a real production build**, and its build, route, HTML, JavaScript,
  dependency and lab performance evidence arrives measured.
- **A real accessibility audit feeds the unchanged evaluator.** Every criterion it
  cannot measure stays `unknown`, and AAA stays AAA.
- **Booking and checkout have separate contracts**, and the generator refuses a label
  that does not match its form.

The second host run needed **no core change to compensate for runtime
infrastructure**. The core changes this phase made were real generator defects that
the first rendered audit exposed, fixed where they originated.

**This is not production readiness.**

- The content gate fails honestly on unverified contact details.
- Three AAA criteria need a person, and nothing records that person's assessment yet.
- Performance rests on lab measurements from localhost.

**Conditions for the customer dry run:**

1. **Run it as a dry run.** Generate, build, serve and audit in a host; publish nothing.
2. **Expect the gates to report the customer's real facts.** Unverified contact details
   or pricing will block conversion paths, as they did for the fixture.
3. **Supply form endpoints only if the customer has a backend.** Otherwise the forms
   will render disabled, which is correct.
4. **Plan a human accessibility review** for 1.4.8, 2.4.9 and 3.1.5 if the target is AAA.
5. **Treat any new generator defect the audit finds as the expected yield** of the dry
   run, not as a failure of it.

Nothing was committed.
