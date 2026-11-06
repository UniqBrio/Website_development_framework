# GROWTH & PROTECTION — guest engagement, SEO content, form spam protection
<!-- Save as: /website_workflow/growth_protection.md -->
<!-- Code: src/growth/ · Spec: docs/GROWTH-PROTECTION-SPEC.md -->

This file sets where the growth and protection module enters the pipeline
(website_flow.md) and what each gate requires from it. The module answers five
questions for {SITE_NAME}:

1. Which free guest engagement tools should be added?
2. Which downloadable resources would benefit visitors?
3. Which specific blogs should be published?
4. Which SEO improvements are missing?
5. Which website forms require enhanced spam protection?

It produces one GROWTH REPORT (`output.growth`, src/growth/report.ts). In the
report, every recommendation states:

- why it is recommended
- its target audience
- its SEO opportunity
- suggested keywords
- the expected business benefit
- its priority
- its status: Recommended, Pending, Implemented or Dismissed

## WHEN IT RUNS
- **Always**, as part of the decision engine (website_flow.md Phase 2 step 0).
  `npm run gate` covers it. No separate command exists.
- **Intake** (templates/website_new.md, ACADEMY GROWTH block). These facts make
  the recommendations specific:
  - category and disciplines
  - age groups
  - city and service areas
  - whether a free trial and events REALLY exist
  - existing blogs and resources

  An unknown stays unknown. Without a category the report gives no content
  recommendations and asks for the fact instead (the PRIME DIRECTIVE applied).

## GATE BY GATE
- **GATE S / GATE 1.** Read the report's top recommendations as INPUTS to strategy:
  - A guest tool is not added because it was recommended. It still passes the
    engagement decision's hard gates, decision_matrix.md where 2+ options exist,
    and the claims check against app_reality.md.
  - A recommended blog or landing page that becomes work gets its own request
    file (/wrequest).
- **GATE 2 (plan).** The plan names which recommendations this request
  implements, by id. Once the owner approves the plan, those ids move to
  Pending. If the plan touches a public form, it names:
  - the form's endpoint
  - the spam policy (`GrowthConfiguration.spamProtection`)
  - the CAPTCHA decision and its secret env-var NAME (never a value)
  - the shared `GuardStore` the host will use
- **PHASE 4 (build).**
  - **The host's endpoint calls the generated guard.** Every route handler that
    receives a public form calls `guardRequest()` from `lib/form-guard.ts` and
    delivers only `accepted`; `flagged` is quarantined. The generator refuses to
    emit a configured form under a policy with a baseline check off.
  - **Forms the host builds itself use the same guard.** Newsletter and
    registration forms call `guardRequest()` with their own form id.
- **GATE 5 (evidence).** For every public form, qa_evidence_gate.md §4d needs:
  - `probeFormEndpoint()` run against the PREVIEW endpoint, with all five steps
    passed
  - the CAPTCHA, when configured, verified on a real device
  - the honeypot shown to be absent from the Tab order and the accessibility tree

  "The guard was emitted" is not evidence that the endpoint applies it.
- **PHASE 7 (close).** Recommendations this request completed are marked
  Implemented (or detected as implemented). Each dismissal is recorded with its
  reason in decisions_log.md and is not re-litigated without new evidence.

## ADMINISTRATION
- **Configuration.** One `GrowthConfiguration` document holds the
  recommendation statuses, guest tool switches, spam policy and audit trail. It
  is changed only through `applyGrowthAction()`, which checks the actor's role
  (src/growth/access.ts):
  - Owners and admins configure tools and security.
  - Editors act on content recommendations.
  - Viewers only read.
- **Console.** `generateGrowthConsole()` writes `growth/console.html`, a noindex
  page served BEHIND the host's authentication and never on the public site. Its
  controls post to a host endpoint that must apply `applyGrowthAction()`.
- **Security settings cannot be weakened past the baseline.** Server-side
  validation, the honeypot, rate limiting and duplicate prevention are always on.

## FAILURE MODES THIS PREVENTS
- **Generic advice.** "Write blogs about your services" cannot appear. Every
  title names the discipline, and local titles name the city.
- **Invented offers.** A free-trial tool for an academy that does not run one is
  never promoted, and a calculator on maths nobody verified is never recommended.
- **Duplicate recommendations.** A blog the site already has is detected, not
  recommended again.
- **Client-side-only protection.** A public form protected only by a client-side
  CAPTCHA or JavaScript, or a form whose endpoint never verifies anything, cannot
  ship.
- **Silent weakening.** A security setting cannot be weakened by someone without
  the role to do so, and no change escapes the audit trail.
