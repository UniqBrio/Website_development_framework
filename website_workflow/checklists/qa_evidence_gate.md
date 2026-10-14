# QA EVIDENCE GATE — Phase 5 requirements (evidence or it didn't happen)
<!-- A claim without an artifact is a FAIL. Store artifacts under
     website_workflow/evidence/<request-id>/ and link them in the verdict. -->

## 1. Responsiveness (mandatory)
DEVICE MATRIX: website_workflow/responsive_matrix.md governs coverage —
TIER 1 (six profiles, chromium AND webkit) is mandatory on every changed
page; TIER 2 runs when its trigger applies; TIER 3 names what emulation
cannot prove and must be declared, never silently passed.
Bare width×height numbers are NOT sufficient: a matrix of six chromium
widths tests one engine six times and cannot catch iOS 100vh/toolbar,
input-zoom, or safe-area failures.
For EVERY changed page:
- [ ] Screenshot per TIER 1 profile (Playwright `page.screenshot`), plus any
      triggered TIER 2 profile.
- [ ] No horizontal scrollbar at any viewport.
- [ ] Sticky header + sticky CTA + popups (DemoPopup, ExitIntentPopup) do not
      cover content or each other at any viewport.
- [ ] Tap targets ≥44px on mobile; text ≥14px effective.
- [ ] Orientation sanity: landscape mobile doesn't break the hero.

## 1b. Test register (mandatory — website_workflow/qa_workflow.md)
- [ ] website_workflow/qa/test_register.md exists, created at Phase 2.
- [ ] Traceability complete: every MUST-HAVE maps to >=1 case.
- [ ] Every case EXECUTED — PASS / FAIL / BLOCKED / N-A+reason. Zero
      NOT-RUN; an unrun case is indistinguishable from an untested one and
      blocks this gate.
- [ ] Zero open S1, zero open S2. Every S3/S4 fixed or explicitly accepted
      by the owner in writing, with reason + follow-up.
- [ ] Every fixed defect has its permanent regression case (fails before,
      passes after) and, if the cause is a new class, an RF-xxx entry.
- [ ] Regression set recorded per qa_workflow.md §5 — "re-tested" with no
      list of case IDs is not a regression run.
- [ ] QA SUMMARY attached, including the NOT-covered/limits line.

## 1c. Degraded paths (mandatory — website_workflow/degraded_paths.md)
- [ ] Failure-sensitive inputs enumerated, and the ONE absence semantic named
      (a single shared resolver/helper — not per-consumer checks).
- [ ] Every safety mechanism in scope has a DP case that was deliberately
      TRIGGERED, executed and observed — not merely present in the code.
- [ ] Triggered with the PRODUCER'S real shape: declared-but-empty as well as
      unset, `""` as well as null, whitespace-only where the producer can
      send it. Testing only the unset case proves nothing about the case that
      actually ships.
- [ ] Assertions target the OBSERVABLE symptom (no empty `href`, no blank
      required field rendered as if populated), not the internal helper.
- [ ] Unknown values render as an honest degraded state — never a blank that
      reads as real data.
A green happy path is not evidence here: untested degraded path = FAIL.

## 2. Playwright (mandatory)
- [ ] `npx playwright test` — full existing suite green (or pre-existing
      failures listed and unchanged).
- [ ] New/updated spec(s) covering the change: happy path + one negative
      path (bad input, API failure mocked) + one mobile viewport project.
- [ ] Paste the run summary (passed/failed/duration) into the verdict.

## 3. Performance (mandatory)
- [ ] `npm run build` clean; note any bundle-size warnings.
- [ ] FIRST-LOAD JS per changed route, BEFORE and AFTER, from the build
      output. Every new dependency's measured gzipped cost recorded against
      the figure its Phase 2 DEPENDENCY GATE predicted (stack_doctrine.md) —
      a package README figure is not evidence. Any dependency present in the
      manifest that never passed that gate = FAIL, not a note.
- [ ] Lighthouse (mobile preset, throttled) on each changed page,
      BEFORE and AFTER: Performance score, LCP, CLS, INP/TBT recorded.
- [ ] Budgets: the CANONICAL values are exported from code, not restated here —
      `WEB_VITALS` and `ROUTE_BUDGETS` in src/performance/budgets.ts (LCP/INP/CLS
      plus the per-archetype route JS budget), and `CONTRAST_THRESHOLDS` in
      src/accessibility/rules.ts — which is the AA FLOOR only. When a site
      states an accessibility target, the authority is `thresholdsFor(target)`
      in src/accessibility/evaluate.ts: at wcag_aaa_or_equivalent the body-text
      threshold is 7:1 and the minimum target size 44px, and a mandatory
      criterion that cannot be classified leaves the gate UNKNOWN rather than
      passing. Paste the measured figures against those constants. Page images total <400KB remains an additional per-page limit
      this framework imposes beyond the specification.
      A threshold written in two places drifts — the root cause color_system.md
      already records for brand colour, applied to numbers.
- [ ] Per-asset: every new/changed illustration, icon or character asset is
      within its own slot budget, and its provenance record is linked here.
      No provenance artifact = FAIL (a claim without an artifact is a FAIL).
- [ ] Any regression >5% on any metric ⇒ FAIL, optimize before gate.
- [ ] Fonts: no new render-blocking font; images via next/image only.

## 4. Functional / Supabase-touching pages (when applicable)
- [ ] Form submits verified against a NON-PROD Supabase target (branch or
      test project) — book-demo, newsletter, feedback, otp, audit-email etc.
- [ ] API route returns correct status codes for: success, validation error,
      Supabase down (mock), duplicate submission.
- [ ] No secrets or service-role keys in client bundles (`grep` the build).
- [ ] MCP read-only check after test runs: get_logs shows no new errors,
      get_advisors shows no NEW security/performance advisories.

## 4b. Theme (mandatory — website_workflow/theme_system.md)
- [ ] {THEME_MODE} stated in the verdict (SINGLE-DARK default / SINGLE-LIGHT
      / DUAL).
- [ ] Generator report attached (tools/generate_palette.py --report): it IS
      the computed contrast table, and it exits non-zero on FAIL. Any DRIFT
      flag carries a written owner decision (color_system.md).
- [ ] Canonical generated token file unmodified since generation (no
      hand-edits); grep confirms no raw hex / L1 ramp reference in components.
- [ ] COMPUTED contrast table attached: every (foreground x surface) pair,
      per active theme, with measured ratios and PASS/FAIL. Thresholds 4.5:1
      body, 3:1 large text, 3:1 UI boundaries + focus indicators. This table
      is the PROOF; screenshots are the spot-check. Any FAIL blocks the gate.
- [ ] {ACCENT_1_ON} on {ACCENT_1} measured — the label on the primary button
      is the most important text on the page and used to have no token.
- [ ] At-rest screenshots: full TIER 1 profile sweep PER ACTIVE THEME
      (6 SINGLE / 12 DUAL).
- [ ] State sweep (default/hover/focus/active/disabled) per active theme at
      the 320 profile, for each new/changed interactive component.
- [ ] LOGO VISIBILITY (theme_system.md §LOGO CONTRAST): measured table of
      EVERY colour in the mark against its actual backdrop, per active theme,
      worst pair >=3:1. Screenshot of the logo in each theme attached. Mark
      confirmed UNMODIFIED — no filter, no fill override, no currentColor.
      A logo legible only because it sits on an unmeasured plate is not
      verified. Covers favicon, meta theme-color and the OG image too.
DUAL only:
- [ ] TOKEN PARITY assertion: every token defined in one theme has its
      counterpart. A missing pair = FAIL.
- [ ] No flash of the wrong theme on load (theme resolved before first
      paint); no hydration mismatch in console.
- [ ] Choice persists across navigation AND reload; initial default follows
      prefers-color-scheme until the user chooses.
- [ ] Non-CSS surfaces re-themed, not assumed: charts/canvas re-initialised,
      SVG using currentColor, images theme-safe, meta theme-color, scrollbars
      (color-scheme), native control accents, shadows inverted in KIND.
- [ ] One mid-transition frame captured per direction; reduced-motion
      switches instantly rather than cross-fading.

## 3b. Evidence provenance (mandatory)
Every figure pasted into this gate carries its KIND, per
src/evidence/evidence-value.ts: `measured` (observed from a real artifact),
`derived` (computed from measured inputs), `estimated` (a model's guess), or
`unavailable`.
- [ ] No `estimated` value is presented as a measurement. The responsive
      registry's `weightKb` is an ESTIMATE and may never stand in for a build's
      first-load JS; `requireMeasured()` refuses it in code, and this gate
      refuses it on paper.
- [ ] Every route JS figure comes from a production build manifest, not from a
      plan or a pattern's metadata.
- [ ] A gate with no evidence is recorded UNKNOWN, never PASS. An unevidenced
      gate cannot certify production readiness (§L, quality/scoring.ts).

## 4c. SEO & crawlability (mandatory on any page/route/content change)
stack_doctrine.md §SEO ARTIFACT SET governs. This section exists because
README rule 6 made the SEO skills mandatory while this gate had no SEO item
at all — a page could pass with no title and no canonical.
- [ ] SERVED HTML of each changed page, captured WITHOUT executing JS
      (`curl` the deployed preview URL, or a Playwright context with
      JavaScript disabled). It must contain the title, the canonical link,
      the single H1 and the actual body copy. A browser screenshot proves
      the opposite thing and does not substitute.
- [ ] SEO ARTIFACT SET answered item by item (1-10), each PRESENT+CORRECT or
      N-A with a reason.
- [ ] Canonical is absolute and on the correct host; exactly one H1; no
      skipped heading levels.
- [ ] `/sitemap.xml` and `/robots.txt` fetched from the BUILT output and
      matching intent — the changed page included or deliberately excluded.
- [ ] JSON-LD validated, and every marked-up entity actually present on the
      page. Structured data for a rating, product or FAQ the page does not
      really have is a fabricated claim (app_reality.md) = FAIL.
- [ ] OG/Twitter tags present; OG image rendered and its logo contrast
      measured per §4b's LOGO VISIBILITY row.
- [ ] At least one inbound internal link from an existing page — named, with
      the file it lives in. An orphan page is not published.
- [ ] If a slug changed: the redirect ships in THIS release, and the old URL
      was requested and observed to redirect.
- [ ] CLIENT BOUNDARY: no indexable content behind one. Confirmed by the
      no-JS capture above, not by inspection of the source.

## 5. Accessibility spot-check (mandatory)
- [ ] Keyboard-only pass through the changed section (focus visible, order
      logical, popups trap + release focus correctly).
- [ ] Contrast ≥4.5:1 body text, ≥3:1 large text (check actual rendered
      colors, not intentions).
- [ ] All images have meaningful alt; decorative ones alt="".
- [ ] prefers-reduced-motion respected for any new animation.

## 6. Re-interrogation
- [ ] Run interrogation_checklist.md Q1–Q10 against the BUILT pages using the
      screenshots above as evidence. Attach the verdict table.
- [ ] Run every named Q-xxx check too, not only Q1–Q10: Q-OPTION-SET,
      Q-SKILL-VALIDATION, Q-TEST-COVERAGE, Q-DEGRADED-PATH, Q-STATE-CONTRAST,
      Q-MOTION-JUSTIFICATION, Q-STACK-DISCIPLINE, Q-SEO-ARTIFACTS. Saying
      "Q1-Q10" let the supplementary questions be written for Phase 1 and
      then quietly skipped on the way out, which is the one place they were
      meant to catch drift from the approved plan.

## GATE 5 VERDICT
PASS only if every checked box has a linked artifact. Otherwise, EVERY
failure runs the RCA loop in responsive_matrix.md before any fix is written:
documented with an artifact, root-caused (cause, not symptom), fixed at the
cause with the pattern's REJECTED workaround explicitly not used, re-run
across the FULL tier-1 matrix (not only the profile that failed), and left
behind as a guarding assertion that fails before and passes after — plus a
new RF-xxx entry if the root cause is new. Then back to Phase 4.
This is the same standard templates/website_bug.md already requires of an
owner-reported bug. Prevents: the identical defect getting a written root
cause and a regression spec when the OWNER finds it, but a silent visual
workaround when our own gate finds it.

## State screenshots (added 2026-08-08 — prevents the ProblemSection hover bug class)
Hover + focus states captured for every new/changed interactive component
(force state via DevTools). Reviewer confirms readability in each state.
Missing state evidence = gate FAIL.
