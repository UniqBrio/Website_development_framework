# OPTIMIZATION WORKFLOW — Track O: whole-site SEO, security, performance, accessibility and UX
<!-- website_workflow/optimization_workflow.md — added 2026-10-28 via framework_update.md.
     Entry point: /woptimize <phase> [scope]. Owns the WHOLE-SITE audit →
     remediation → validation → monitoring → sign-off cycle. It does NOT
     restate what other files already own:
       stack_doctrine.md           SEO ARTIFACT SET, DEPENDENCY GATE, client boundary
       qa_evidence_gate.md         the artifact rules for one change at Phase 5
       responsive_matrix.md        device tiers + the responsive RCA loop
       theme_system.md             computed contrast, logo contrast
       qa_workflow.md              register, defect RCA, regression scope
       supabase_review.md          backend-touching review
       strategy_audit.md           positioning + competitor research
       decision_matrix.md          scoring any choice between real options
       src/performance/budgets.ts  Web Vitals + route JS budgets (numbers live there)
       src/accessibility/rules.ts  contrast floor (numbers live there)
     Those prove ONE change. This file finds what is wrong with the SITE. -->

## ROOT CAUSE THIS FILE CLOSES
website_flow.md is change-scoped: every gate proves the request in front of
it, and nothing ever looks at the whole site. So decay that no single change
causes — a canonical gone stale, a dependency advisory published after
release, a security header dropped by a config edit, Web Vitals eroded by
twenty small changes that each passed on their own — was only found by
accident. Four areas had no owner at all: a security audit (Phase 3 covers
Supabase only; qa_evidence_gate.md §4 has one secret grep), CI quality gates,
a post-deployment validation report, and continuous monitoring. And no gate
issued a release verdict beyond "Gate 5 passed", so "it compiles and the
tests are green" could stand in for "ready".

## THE ONE RULE — Track O audits and reports; it never builds
Every phase below is either an AUDIT (report only, code untouched) or a
VERIFICATION (read-only checks against a build or a deployment). A fix is
never applied from here. Each approved finding becomes a request file via
/wrequest and runs through website_flow.md like any other change: Phase 0
classification, interrogation, Phase 2 plan, owner gates, Phase 5 evidence.
Phases whose source prompt says "implement" (O2, O3, O4, O6, O7, O8, O9)
mean: draft the request files on the owner's "go", then hand them to
/website. Prevents: an optimization pass that edits code outside the gates
because "it is only SEO", which is how a title change reaches production with
no served-HTML evidence.

## SHARED RULES (every phase)
1. AUDIT FIRST, MODIFY SECOND. Understand the existing framework, routes,
   dependencies, config and deployment before proposing anything. Preserve
   the current architecture unless evidence supports a change; an
   architectural change is a stack_doctrine.md decision, not a finding.
2. EVIDENCE. Every finding cites its proof — file:line, route, tool output,
   or URL — and the KIND of every figure, per src/evidence/evidence-value.ts:
   `measured`, `derived`, `estimated` or `unavailable`. An estimate is never
   reported as a measurement. A check that could not run is UNKNOWN, never
   PASS (README rule 10).
3. CONFIRMED vs SUSPECTED. A finding is CONFIRMED only when it was reproduced
   or directly observed. A scanner hit, a version match or a code smell that
   was not reproduced is SUSPECTED and is reported as such — never as a
   confirmed vulnerability.
4. THRESHOLDS ARE CITED, NOT RESTATED (README rule 9). Web Vitals:
   `WEB_VITALS` in src/performance/budgets.ts (`standard` unless
   site_profile.md's {PERF_BUDGET} states the premium tier, in which case the
   stricter of the two governs). Route JS: `ROUTE_BUDGETS` there.
   Contrast and target size: `thresholdsFor(target)` in
   src/accessibility/evaluate.ts (`CONTRAST_THRESHOLDS` is the AA floor).
   Breakpoints and devices: responsive_matrix.md.
5. TRUTH. No fabricated testimonials, customer numbers, ratings, FAQs or
   business claims; no structured data for something the page does not
   really contain (app_reality.md). No ranking promises, no artificial
   keyword stuffing, no doorway pages.
6. PROTECT PRODUCTION. Read-only checks against production. No destructive
   tests, no load or DoS testing, no production config change, no real
   payment, no unsolicited message, no change to customer data. Systems the
   owner has not authorised are out of scope. Anything else needs explicit
   owner approval recorded in the report.
7. SECRETS ARE NEVER PRINTED. Name the variable, file and line; redact the
   value. This applies to reports, alerts, commit messages and chat.
8. REUSE TOOLING. Inspect existing scripts, tests and CI first. Running a
   tool ad hoc for an audit (`npx`, nothing written to the manifest) is not a
   dependency; adding it to package.json or to CI is, and it goes through
   stack_doctrine.md's DEPENDENCY GATE.
9. SAME CONDITIONS. A before/after comparison is valid only with the same
   tool and version, device preset, throttling, URL, build mode and run count
   (median of at least 3 lab runs). Changed conditions void the comparison —
   re-baseline instead of reporting a delta.
10. TRACEABILITY. Finding ID → request file → commit/PR → Phase 5 evidence →
    release report. A fix with no finding ID, or a finding with no request,
    is invisible to O12.

## FINDING RECORD (one format for every phase)
```
OPT-<nnn>  <DOMAIN>  <SEVERITY>  <CONFIDENCE>  <STATUS>  <one-line title>
  Evidence:          <file:line | route | tool + version + output excerpt | URL> (kind)
  Root cause:        <why it happens, not what it looks like>
  Impact:            <who is affected and how>
  Prerequisites:     <SEC only: what an attacker needs — access, position, user action>
  Recommended fix:   <minimal fix at the cause>
  Success criterion: <a measurable check that proves it fixed>
  Owner / target:    <name> / <date>
```
DOMAIN: SEO · CONTENT · PERF · SEC · A11Y · RESP · UX · OPS.
CONFIDENCE: CONFIRMED · SUSPECTED (shared rule 3).
SEVERITY (aligned with qa_workflow.md so one scale runs end to end):
| Severity | qa_workflow | Meaning |
|---|---|---|
| Critical | S1 | Exploitable vulnerability with realistic prerequisites; an exposed secret; site, primary route or production build broken; public site not indexable; data loss |
| High | S2 | A core journey (contact, demo, signup, payment) broken or degraded; a primary route outside its Web Vitals or route JS budget; a WCAG 2.2 AA failure that blocks a task; a public page unintentionally excluded from the index; a missing control with demonstrated impact |
| Medium | S3 | A defect with a workaround, or a measurable but non-blocking loss (a missing canonical on a secondary page, an outdated package with no known exploit, a non-blocking a11y issue) |
| Low | S4 | Best practice, cosmetic, or hygiene with no demonstrated impact |
STATUS: OPEN → REQUESTED (request file exists) → FIXED · PARTIALLY FIXED ·
UNRESOLVED · NOT REPRODUCIBLE · ACCEPTED (owner, in writing, with reason and
date — the qa_workflow.md §6 standard; silent tolerance is not acceptance).

## PHASES
Run any phase on its own with /woptimize; the recommended order is at the
end. Every report is saved to website_workflow/audits/ as
`YYYY-MM-DD_<phase>_audit.md` (phase slugs below), and ends with a SOURCES
list and the prioritized request files to draft.

### O1 — COMPLETE WEBSITE AUDIT (slug: site) — report only
Act as a senior web developer, SEO specialist, security engineer and
performance engineer. Audit the whole site and its codebase across SEO,
security, performance, accessibility, mobile responsiveness and UX.
1. INSPECT: framework and version, architecture, routes (list every route
   from the filesystem, not from memory), dependencies, configuration
   (next.config, headers, middleware, env usage), deployment setup, existing
   tests and CI.
2. MEASURE: production build output (route JS), served HTML per route
   fetched without JS, the existing test suite, Lighthouse mobile on
   representative routes, an automated accessibility pass, dependency
   advisories, response headers.
3. REPORT per the FINDING RECORD, grouped by severity, each with a
   measurable success criterion. The O2-O8 checklists below are the coverage
   list — an area not checked is listed under NOT COVERED, never omitted.
Do not modify code. Output feeds every later phase as the baseline.

### O2 — TECHNICAL SEO (slug: seo)
Audit crawling, indexing and visibility. Coverage: stack_doctrine.md §SEO
ARTIFACT SET items 1-10 swept across EVERY public route (not only changed
ones), plus:
- HTTP status of every route; redirect chains and loops; broken internal and
  outbound links; a real 404 status for missing pages (not a 200 soft-404).
- Duplicate content: www/non-www, trailing slash, http/https and query
  variants resolving to one canonical; unnecessary query parameters.
- XML sitemap valid, absolute URLs, only canonical 200 pages; robots.txt
  permits public pages, excludes private/administrative ones, references the
  sitemap; `noindex` on private pages present in the SERVED HTML or header.
- Semantic HTML, heading hierarchy, internal linking depth and orphans.
- Image alt text and descriptive file names.
- Structured data valid AND true (shared rule 5); Open Graph / Twitter tags.
- JavaScript rendering: important content present in the no-JS capture
  (stack_doctrine.md §CLIENT BOUNDARY).
Validate after implementation: the same sweep re-run on the built output —
sitemap, metadata, canonicals, structured data, crawlability.
Skills: seo-technical-audit-specialist, schema-structured-data-architect,
social-share-preview-architect, saas-website-sitemap-architect.

### O3 — ON-PAGE SEO & CONTENT (slug: content)
For each important page: primary search intent and relevant keywords; title,
meta description, H1 and heading structure; a clear value proposition;
internal links with descriptive anchor text; thin, missing or duplicated
content; FAQs and structured data only where the page genuinely needs them;
CTAs improved without unsupported claims. Preserve brand voice and accuracy;
every product claim checked against app_reality.md (strategy_audit.md S3).
Copy that changes positioning, hero or CTAs is STRATEGIC — the request runs
Phase S. Output: a BEFORE / AFTER table per changed page (template below).
Generated copy is a draft until the owner approves it — never published
unvalidated. Skills: on-page-seo-copywriter, content-seo-strategist,
faq-page-strategist, hero-headline-value-prop-writer, blog-content-seo-writer.

### O4 — PERFORMANCE & CORE WEB VITALS (slug: perf)
BASELINE FIRST — no change is proposed before the baseline is recorded.
- FIELD data (CrUX / Search Console / RUM) at p75 when available; LAB data
  (Lighthouse mobile, throttled, shared rule 9) otherwise — and say which.
  Lab INP is not measurable; use TBT as its lab proxy and label it so.
- Inspect: LCP element and its resource chain, INP / long tasks, CLS
  sources, route JS and unused code, render-blocking CSS/JS, image format,
  dimensions, compression and lazy loading (never on the LCP image), font
  loading, third-party scripts, caching headers, compression, CDN, API and
  database latency and request waterfalls where applicable, hydration and
  needless client rendering, mobile on a realistic device and network.
- Targets: shared rule 4. Fix the highest-impact bottleneck first, then
  re-run the SAME tests.
Report baseline, final, affected files, improvements, REGRESSIONS and what
remains. No improvement is claimed without a measured before and after.
Skills: core-web-vitals-optimizer, performance-audit-expert, nextjs-architect.

### O5 — SECURITY AUDIT (slug: security) — report only, defensive
Act as an application security engineer. Authorised, non-destructive checks
only (shared rule 6). Coverage — each item CHECKED, or N-A with a reason
(a static marketing site has no sessions; stack_doctrine.md denies auth by
default, so its absence is expected, not a finding):
- Authentication, authorization, broken access control, IDOR.
- Server-side validation and sanitization on every route handler and server
  action (the shared Zod schema rule, stack_doctrine.md §FORMS); SQL
  injection, XSS (`dangerouslySetInnerHTML`, unescaped user input), CSRF on
  state-changing endpoints.
- Sessions, cookies (`Secure`, `HttpOnly`, `SameSite`), token handling.
- SECRETS in source, logs, client bundles (grep the built `.next/static`)
  and Git history (`git log -p` / a secret scanner). A secret ever committed
  is exposed: the fix is ROTATION, not history rewriting.
- Dependency advisories (`npm audit` or OSV) and outdated packages — each
  advisory triaged for reachability before its severity is set.
- Headers: CSP, HSTS, X-Content-Type-Options, Referrer-Policy,
  Permissions-Policy, frame-ancestors; HTTPS enforcement and redirects.
- Rate limiting and abuse protection on forms and sensitive endpoints.
- File upload validation and storage access rules.
- CORS, open-redirect validation, error handling that leaks stack traces.
- API routes, server actions, `NEXT_PUBLIC_` variables (every one is public).
- Supabase: RLS and advisors via supabase_review.md (MCP read-only).
- Backup, recovery and data-protection practice.
Each finding carries Prerequisites (FINDING RECORD). Do not modify
production configuration. Skills: security-review, security-review-expert,
rls-risk-auditor, security-compliance-trust-center-specialist.

### O6 — SECURITY FIX IMPLEMENTATION & VERIFICATION (slug: security-fix)
Input: the O5 report with the findings the owner approved. One request file
per finding (or per tightly coupled group) via /wrequest, built by /website.
Per fix:
- Fix at the cause, without unnecessary architectural change; preserve
  behaviour and user permissions; least privilege; secrets server-side only.
- A regression test that FAILS before the fix and PASSES after
  (qa_workflow.md §4 permanent case).
- Dependency updates: read the changelog for breaking changes; a major
  version bump is a Phase 2 plan item, not a lockfile edit.
- Validate authentication, authorization, session expiry, error handling and
  access restrictions where they exist.
- Run typecheck, tests, dependency scan, secret scan, and static analysis
  where the repo has it; review the final diff for secrets and unrelated
  changes.
Never disable a security control to make a test pass. Report every finding
as FIXED / PARTIALLY FIXED / UNRESOLVED / NOT REPRODUCIBLE with its test
evidence. No production deploy until Phase 6 and the required approvals.

### O7 — MOBILE RESPONSIVENESS & ACCESSIBILITY (slug: a11y)
Target WCAG 2.2 Level AA (thresholds per shared rule 4). Coverage:
responsive_matrix.md TIER 1 on every public route (not only changed ones),
TIER 2 when triggered; navigation; touch target size and spacing; text
readability, 200% zoom and 320 CSS px reflow without horizontal scroll;
keyboard order and visible focus; semantic HTML, labels, alt text; contrast
in every state and theme (theme_system.md); form error messages; screen
reader structure (docs/SCREEN-READER-TESTING-STRATEGY.md); loading, empty,
error and success states; browser compatibility; reduced motion and
WCAG 2.2.2 for auto-playing motion (animation_library.md).
Automated checks find a minority of issues: the report pairs them with a
manual keyboard pass and, where available, a screen-reader pass, and states
what emulation cannot prove (TIER 3). Report affected routes, issues, fixes
and remaining limitations.

### O8 — CONVERSION RATE & UX (slug: ux)
Review as a first-time visitor: can they understand the offering, trust the
business, and complete the intended action? Evaluate homepage message and
value proposition, navigation and information hierarchy, CTA hierarchy and
placement (one primary accent action per viewport, README rule 4), contact /
enquiry / registration / demo forms, validation and error recovery, trust
indicators and VERIFIABLE business information, mobile usability, page
consistency, unnecessary steps and distraction, and analytics and conversion
tracking — subject to consent and privacy (analytics is a PROFILE B decision,
stack_doctrine.md L5). Recommendations rest on observable usability issues
and available analytics; competing options are scored with
decision_matrix.md; strategic ones run strategy_audit.md. Never fabricate
testimonials, customer numbers or claims. After approved changes ship,
re-walk every important journey. Skills: conversion-ux-specialist,
cta-strategy-architect, website-conversion-funnel-analyst,
demo-booking-flow-optimizer, cookie-consent-privacy-banner-specialist.

### O9 — AUTOMATED TESTING & CI/CD INTEGRATION (slug: ci)
Inspect the current workflows first and reuse what exists (shared rule 8).
Recommended checks, each placed in a tier:
| Tier | Checks | Why this tier |
|---|---|---|
| BLOCKING | lint, format, typecheck; unit and integration tests; production build; critical-route smoke (status + no-JS served HTML has title, canonical, one H1); sitemap + robots valid; secret scan; dependency advisories at Critical/High severity; automated accessibility at serious/critical impact | Deterministic: a failure is a real defect, never noise |
| ADVISORY until proven stable | Lighthouse or equivalent on representative routes; broken outbound links; structured-data validation warnings | Variable environments and third parties cause false failures; promote to BLOCKING only after a recorded run of stable results, with a tolerance band |
Critical security failures and broken production builds always block
release. Thresholds come from shared rule 4, never from a number typed into
the CI config by hand. Same test conditions every run (shared rule 9).
Publish results on the PR and name each failed check. Never bypass required
approvals, branch protections or deployment safeguards. Skills:
website-launch-qa-checklist-specialist, deployment-checklist-expert.

### O10 — POST-DEPLOYMENT VALIDATION (slug: postdeploy) — read-only
Runs after an approved deploy (website_flow.md Phase 6 step 4). Check:
homepage and important public routes; status codes and redirects; metadata,
canonicals, robots.txt and sitemap on the LIVE host; HTTPS and security
headers; core journeys, forms and approved integrations WITHOUT submitting
real data (shared rule 6 — use a test mode, a validation-only path, or stop
at the last non-submitting step); mobile rendering and major browsers;
performance against the pre-deployment baseline; console errors, server
errors and failed requests; monitoring and alerting actually configured.
Compare with the release acceptance criteria. A critical regression → the
rollback plan written at Phase 6 step 3, and the owner notified. Output: the
RELEASE REPORT (template below).

### O11 — CONTINUOUS MONITORING (slug: monitor)
Design a LIGHTWEIGHT process, reusing what the stack already has (hosting
analytics and logs, Supabase logs, Search Console, GitHub dependency alerts,
an uptime check) before proposing anything new. Monitor: availability and
HTTP errors; critical route failures; performance regressions; indexing and
crawl errors where data exists; certificate and domain expiry; advisories
for installed dependencies; failed deployments and broken journeys; form and
conversion-tracking failures; unexpected changes to security headers or
robots directives. Each alert gets a severity (FINDING RECORD scale) and a
named OWNER — an alert nobody owns is noise, and noise gets switched off.
No excessive crawling, no duplicate monitoring systems, no credentials or
personal information in alert text. Output: the monitoring design, then a
periodic report — incidents, trends, unresolved risks, recommendations.

### O12 — FINAL QUALITY GATE & SIGN-OFF (slug: signoff)
Before requesting release approval for an optimization program, confirm:
- Agreed SEO requirements validated (O2/O3 re-sweep on the built output).
- Every security finding FIXED, or ACCEPTED in writing by an authorised
  owner.
- Performance changes measured against the O4 baseline (shared rule 9).
- Accessibility and responsive behaviour tested (O7).
- Functional and regression tests pass; CI quality gates pass.
- No unauthorised files, secrets, dependencies or unrelated changes (diff
  reviewed, not assumed).
- Deployment and rollback procedures documented.
- Every remaining issue has an owner and a target date.
Then write the SIGN-OFF REPORT (template below). Verdict definitions:
- READY — every item above is evidenced; no open Critical/High.
- CONDITIONALLY READY — no open Critical; each open High is either accepted
  in writing or has a dated fix tied to a named condition of release.
- NOT READY — any open Critical, any unevidenced item, or any check UNKNOWN.
Never READY solely because the code compiles or the automated tests pass.
Gate 5 proves one change; O12 signs off the program. Neither substitutes for
the other.

## RECOMMENDED EXECUTION ORDER
| Step | Phases | Expected output |
|---|---|---|
| 1 | O1 | Baseline report and prioritized findings |
| 2 | O2, O3 | Search optimization requests, then validated changes |
| 3 | O4 | Measured performance improvements |
| 4 | O5, O6 | Verified security fixes |
| 5 | O7, O8 | Improved accessibility and usability |
| 6 | O9 | Repeatable CI/CD checks |
| 7 | O10 | Release verification report |
| 8 | O11 | Ongoing health and risk reports |
| gate | O12 | Release recommendation before approval |
Critical findings from ANY phase jump the queue: a Critical security finding
found in O1 goes straight to O6, it does not wait for step 4.

## TEMPLATES
AUDIT REPORT (O1, O2, O4, O5, O7, O8):
```
# <PHASE> AUDIT — {SITE_NAME} — YYYY-MM-DD
Scope: <routes / areas>     Build/commit: <sha>     Environment: <preview | production>
Tools: <name + version + settings>
## Summary   Critical n · High n · Medium n · Low n   (CONFIRMED n · SUSPECTED n)
## Findings  <FINDING RECORDs, Critical first>
## NOT COVERED  <areas not checked and why>
## Recommended request files  <run order, blockers first>
## SOURCES
```
BEFORE / AFTER (O3, one per changed page):
| Field | Before | After | Reason (intent / evidence) |
|---|---|---|---|
| Title / Meta description / H1 / Headings / CTA / Internal links / Structured data | | | |
SECURITY STATUS (O6):
| Finding | Status | Fix (commit/PR) | Regression test (fails before, passes after) | Evidence |
|---|---|---|---|---|
RELEASE REPORT (O10):
```
Deployment version: <tag/sha>     URL: <live host>     Date/time:
Checks: <each O10 item — PASS / FAIL / UNKNOWN + artifact>
Baseline comparison: <metric — before → after (kind)>
Unresolved issues: <FINDING RECORDs>
Final release status: VALIDATED / DEGRADED (owner notified) / ROLLED BACK
```
SIGN-OFF REPORT (O12):
```
1. Scope of work
2. Findings before optimization      (O1 summary + per-phase counts)
3. Changes implemented               (finding → request → commit/PR)
4. Test evidence and measured results (baseline → final, with evidence kinds)
5. Outstanding risks and limitations (each with owner + target date)
6. Release recommendation: READY / CONDITIONALLY READY / NOT READY — and why
7. Required approvals                (who, for what, status)
```
