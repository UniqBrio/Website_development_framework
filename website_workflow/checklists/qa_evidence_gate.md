# QA EVIDENCE GATE — Phase 5 requirements (evidence or it didn't happen)
<!-- A claim without an artifact is a FAIL. Store artifacts under
     website_workflow/evidence/<request-id>/ and link them in the verdict. -->

## 1. Responsiveness (mandatory)
Viewports: 360×800 (baseline India mobile), 768×1024, 1024×768, 1440×900.
For EVERY changed page:
- [ ] Screenshot per viewport (Playwright `page.screenshot` or browser tools).
- [ ] No horizontal scrollbar at any viewport.
- [ ] Sticky header + sticky CTA + popups (DemoPopup, ExitIntentPopup) do not
      cover content or each other at any viewport.
- [ ] Tap targets ≥44px on mobile; text ≥14px effective.
- [ ] Orientation sanity: landscape mobile doesn't break the hero.

## 2. Playwright (mandatory)
- [ ] `npx playwright test` — full existing suite green (or pre-existing
      failures listed and unchanged).
- [ ] New/updated spec(s) covering the change: happy path + one negative
      path (bad input, API failure mocked) + one mobile viewport project.
- [ ] Paste the run summary (passed/failed/duration) into the verdict.

## 3. Performance (mandatory)
- [ ] `npm run build` clean; note any bundle-size warnings.
- [ ] Lighthouse (mobile preset, throttled) on each changed page,
      BEFORE and AFTER: Performance score, LCP, CLS, INP/TBT recorded.
- [ ] Budgets: LCP <2.5s, CLS <0.1, INP <200ms, page images total <400KB.
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

## GATE 5 VERDICT
PASS only if every checked box has a linked artifact. Otherwise: list of
failures → back to Phase 4. The owner signs the pass.

## State screenshots (added 2026-08-08 — prevents the ProblemSection hover bug class)
Hover + focus states captured for every new/changed interactive component
(force state via DevTools). Reviewer confirms readability in each state.
Missing state evidence = gate FAIL.
