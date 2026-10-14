# SITE PROFILE — Ashvattha Tax & Compliance
<!-- Instantiated from website_workflow/site_profile_TEMPLATE.md on 2026-09-14 (/winit step 2).
     "INTERVIEW the owner for every token (never guess brand colors or ICP)."
     The owner was not available to interview in this dry run, so every token is
     filled ONLY from customer-brief.md. A token the brief does not answer is
     UNRESOLVED and carries the question the owner must answer. -->

| Token | Value | Notes |
|---|---|---|
| {SITE_NAME} | Ashvattha Tax & Compliance | from the brief |
| {SITE_REPO} | customers/ashvattha-tax (dry-run workspace) | not a separate repository — see runs/…/00-winit.md |
| {SITE_DOMAIN} | `ashvattha-tax.example` | supplied. **UNRESOLVED: scheme and preferred host (apex or `www`).** Canonical URLs stay unresolved until the owner answers. |
| {ICP} | Small business owners, startup founders, freelancers and salaried people in and around Pune who find tax and compliance confusing and search for help on their phones. | composed from the brief's own words; owner to confirm at GATE 0 |
| {BRAND_SEED} | **UNRESOLVED** | the brief says the logo is "dark blue text"; no hex, and the logo file was not received. A seed guessed from "dark blue" would be an invented brand colour. The token system ships the neutral substitute until the owner supplies one. |
| {THEME_MODE} | SINGLE-DARK — **template default, UNCHOSEN** | theme_system.md: "A site is SINGLE-DARK unless the owner says otherwise." The owner has not said. Owner to confirm or change at GATE 0. |
| {FONT_HEAD} / {FONT_BODY} | **UNRESOLVED** | no brand fonts named; the system font stack is used until the owner or a Phase 2 decision names one |
| {STACK} | Default stack per stack_doctrine.md: Next.js App Router, React, TypeScript, token-generated CSS, next/image, Metadata API. **No database, no backend, no email-sending service.** | the brief names no hosting, backend or email service |
| {CUSTOMER_COUNT} | **UNVERIFIED** — owner states "60+ regular clients" | no evidence supplied. Treated as UNVERIFIED for the honesty rules; see app_reality.md |
| {PERF_BUDGET} | framework default for the archetype (`ROUTE_BUDGETS` in src/performance/budgets.ts) | not stated by the owner |
| {MASCOT_LOCK} | none | no character requested |

## {STACK_DEVIATIONS} — approved departures from stack_doctrine.md
Empty. The brief requests a contact form that emails the practice, a WhatsApp button
and a map. The email-sending backend and the map embed are default-deny categories;
they are NOT approved and are NOT recorded here (see the request file ARCHITECTURE
field and the Phase 2 dependency gate).

| Date | Material / category | Requirement that justified it | PROFILE B score | Removal condition |
|---|---|---|---|---|
| | | | | |

## COLOR TOKENS — GENERATED, not hand-filled
Not generated from a brand seed: {BRAND_SEED} is unresolved. The Phase 2 token
contract records the neutral substitute and its measured contrast table; that record
is attached to the Phase 2 plan, not copied here, until a real seed exists.

## LOGO TOKENS
All UNRESOLVED: the logo file was not received. {LOGO_COLORS} cannot be measured
from a description.

## Standing constraints (inherited by every site)
Inherited unchanged from the template. **Additional constraint discovered at
Phase S** (strategy_audit.md S3, research-backed, owner to verify): the managing
partner states ICAI membership; published guidance on ICAI's advertising rules for
members in practice prohibits testimonials, endorsements, star ratings, client
names, client counts, laudatory language and promotional pricing on the practice's
website. Until the owner confirms which rules apply, the stricter reading governs.
