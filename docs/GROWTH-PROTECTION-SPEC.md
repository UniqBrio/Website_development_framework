# Website Growth & Protection — specification

Status: implemented (src/growth/). Workflow integration: website_workflow/growth_protection.md.

The growth module turns the Website Workflow into a growth and protection
module for arts and sports academies. It adds three capabilities and one
recommendation system across them:

1. **Guest engagement tools**: free tools a visitor can use without registering,
   recommended for the specific academy.
2. **SEO content and resource recommendations**: resources to add, specific
   blogs to publish (with keywords, meta title, meta description and URL), and
   SEO improvements (missing content, landing pages, location content, structured
   data, FAQs, internal links).
3. **Spam and bot protection**: server-side verification for every public form,
   configurable by administrators and enforced by the generator.

All three report through one `GrowthReport` (`output.growth`). Its
recommendations share one shape, one lifecycle (Recommended → Pending →
Implemented / Dismissed) and one role-based authority.

## 1. Integration points (reuse, not duplication)

| Existing mechanism | How the growth module uses it |
|---|---|
| `BusinessInput` (src/design-intelligence/types/business-input.ts) | Gains one optional block, `academy`, holding only what nothing else expresses: category, disciplines, age groups, levels, goals, an owner-stated free trial and events, and existing blogs and resources. Courses, audience, location and objectives are read from their existing fields. |
| Engagement decision (src/engagement/) | Skill assessments and calculators are its `assessment` and `calculator` categories. Its hard gates are read, not re-run and not overridden: a category it rejected leaves the tool `blocked`, with the decision's reason. |
| Form contracts (src/generation/form-contracts.ts) | Each contract gains `protection`. A free trial is the booking contract, a request that the academy confirms. Event registration uses the enquiry/sign-up contract. |
| Page model and SEO artifact plan | Internal-link targets, orphan pages and unresolved SEO inputs come from the real page model, never from assumptions. |
| Integrity ledger (src/integrity/decision-execution.ts) | New domain `form_protection`. A configured form missing protection in any layer is a mismatch, and generation stops. |
| Design tokens (`tokensBlock`, src/generation/render/css.ts) | The admin console renders with the site's own generated L2 semantic tokens. |
| Pipeline (src/pipeline.ts) | `output.growth` is always present. `PipelineOptions.growth` passes the administrator configuration and the host's form endpoints. The contract gains a probe-evidence testing requirement, and every policy violation becomes a publication requirement. |

## 2. Recommendations

Module: src/growth/recommendations.ts.

Every recommendation carries: title, **why**, **target audience**, **SEO
opportunity**, **suggested keywords** (primary plus secondary), **expected
business benefit**, **priority** (high, medium or low, from a 0–100 heuristic
with its factors listed), **status** and its basis, the evidence it rests on, and
an area-specific brief.

**Contextual, never generic.** Titles, keywords and URLs are templates from the
discipline library (src/growth/topic-library.ts), filled from the academy's own
facts:

- Disciplines: dance, music, visual art, theatre, cricket, football, racket
  sports, swimming, martial arts, yoga and fitness, chess, plus generic arts and
  sports families that are still named by the discipline.
- Local-intent topics need a known city.
- A calculator is recommended only where the discipline has a real formula.
- A topic that an existing post already covers is detected and shown as Implemented.
- Without an academy category, the report produces no content recommendations.
  It lists the missing fact instead.

**Honesty boundaries:**

- Keyword `searchVolume` is always `not_measured` (README rule 10).
- A blog brief is a topic and a structure. Its outline never asserts facts about
  the academy.
- A free trial or an event is never promoted unless the owner has stated it.
- Structured data is recommended only for a type the page really contains.

**Status resolution** (`resolveStatus`): when the analysis detects that an item
is implemented, detection wins. Otherwise a stored administrator decision
applies, and otherwise the item is Recommended. A dismissal stays until someone
reopens it. A guest tool that is enabled but not yet ready shows as Pending, with
its blockers listed.

## 3. Spam and bot protection

Policy: src/growth/spam/policy.ts. Guard: src/growth/spam/guard.ts.

**Security invariant.** No public form may accept a submission that has not
passed server-side checks. Four checks are baseline and cannot be disabled:

- server-side field validation against the form contract
- the honeypot
- rate limiting
- duplicate prevention

`assessSpamPolicy()` reports any attempt to disable them as a violation. Three
places enforce this:

1. `applyGrowthAction()` refuses to save such a policy, even for an owner.
2. `generateWebsite()` throws `form protection violated` for any configured form.
3. The guard itself fails closed if it is handed such a policy.

**Server-side checks, in order:**

1. Temporary IP block.
2. Field validation.
3. Honeypot (decisive).
4. Rate limit, per form and across forms.
5. Duplicate submission.
6. Scored signals: minimum fill time, malformed timing token, links, forum
   markup, blocked terms, unexpected fields, missing user agent.
7. CAPTCHA token verification with the provider: Cloudflare Turnstile, or Google
   reCAPTCHA v2 or v3 with a score threshold.
8. Suspicion score, which ends in one of three outcomes:
   - **accepted**: deliverable.
   - **flagged**: quarantined for review, never delivered as a lead.
   - **blocked**.

**Fail-closed paths:**

- A CAPTCHA is configured but the server has no secret: the submission is blocked.
- The CAPTCHA provider cannot be reached: the submission is flagged (configurable
  to blocked), never accepted.

**Friction limits.** Every threshold is bounded so that legitimate visitors are
not punished:

- The minimum fill time is at most 15 seconds.
- The rate limit is at least two submissions per window.

Without JavaScript the honeypot still works, and a missing timing token is only
a weak signal. When a CAPTCHA is mandatory, visitors without JavaScript see a
`<noscript>` notice that offers direct contact instead.

**Accessibility.** The honeypot sits in a `visibility: hidden`, clipped,
`aria-hidden` container, and its input has `tabindex="-1"` and
`autocomplete="off"`. Verified in Chromium: it is out of the Tab order and out
of the accessibility tree. The host validator excludes it from field counts and
target sizes.

**Privacy.** Security events record a salted SHA-256 prefix of the source
address and the names of the checks that fired. Raw IP addresses and submitted
values are never logged. Secrets are referenced by environment-variable name
only; the CAPTCHA policy object is strict, so a pasted `secret` field is refused.

**Generated output.** Generation emits the following only when a form endpoint
is configured:

- The honeypot, timing field and form-id field in both layers, plus the CAPTCHA
  slot when configured.
- `form-protection.js`, the browser half. It records the timing, loads the
  CAPTCHA script on the visitor's first interaction, fetches the reCAPTCHA v3
  token at submit, and guards against double submission.
- `next/lib/form-guard.ts`: **the tested guard file, emitted verbatim** and
  import-free, so the dependency gate is unaffected.
- `next/forms/protection.json`.
- A README section with the route-handler pattern.

The framework still does not invent a backend: the host's endpoint must call
`guardRequest()`.

**Evidence** (src/growth/spam/probe.ts). `probeFormEndpoint()` submits five
payloads to an endpoint: a legitimate submission, a duplicate, a filled
honeypot, a too-fast submission and a burst. It reports pass or fail per step.
This is the Phase 5 proof that the host really applies the guard; "the module
was emitted" is not that proof.

**Shared storage.** `createMemoryGuardStore()` holds state within one process
only. Serverless and multi-instance hosts must implement `GuardStore` on shared
storage. The report always recommends this once a form accepts submissions.

## 4. Roles

Module: src/growth/access.ts.

| Permission | owner | admin | editor | viewer |
|---|---|---|---|---|
| growth.view | ✓ | ✓ | ✓ | ✓ |
| recommendations.act (resources, blogs, SEO) | ✓ | ✓ | ✓ | |
| guest_tools.configure | ✓ | ✓ | | |
| spam_protection.configure | ✓ | ✓ | | |
| security_log.view | ✓ | ✓ | | |

Acting on a recommendation requires the permission of the area it changes, so an
editor cannot accept a spam-protection item. The website itself still has no
accounts (stack_doctrine.md: auth is default-deny). The host authenticates the
person, and this module decides what that person may change.

## 5. Admin console

Module: src/growth/console.ts.

`renderGrowthConsole()` and `generateGrowthConsole()` produce one server-rendered
HTML page, written to `growth/` outside the deployable layers and marked
`noindex, nofollow`. It contains:

- An overview with summary tiles and the five questions answered.
- A status and priority filter that uses only CSS (`:has()`).
- Recommendation cards for each area.
- Guest tool controls: enable and placement.
- Spam-protection settings, with baseline checks shown as always on.
- The protected-forms table and the security-event log.

It uses one fluid grid with 44 px targets and no horizontal page scroll at
320 px; tables scroll inside labelled, focusable regions. Controls render by
role. They post to a host `actionEndpoint` that must apply `applyGrowthAction()`.
Without that endpoint the controls render disabled with a note, so nothing
pretends to save.

## 6. The five questions

`report.answers` lists open recommendation ids, highest priority first:

1. Which free guest engagement tools should be added?
2. Which downloadable resources would benefit visitors?
3. Which specific blogs should be published?
4. Which SEO improvements are missing?
5. Which website forms require enhanced spam protection?

## 7. Tests

| Test file | What it covers |
|---|---|
| tests/growth/guard.test.ts | Every check; CAPTCHA paths; logging privacy; policy invariants; emitted guard equals source |
| tests/growth/recommendations.test.ts | Contextuality; honesty; detection; lifecycle; role-based access |
| tests/growth/generator-protection.test.ts | Both layers carry protection; refusal on an insecure policy; integrity ledger; probe; console roles and tokens |
