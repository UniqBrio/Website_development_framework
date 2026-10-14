# SITE PROFILE — Jalsa Restaurant
<!-- Instantiated from website_workflow/site_profile_TEMPLATE.md on 2026-09-15 (/winit step 2).
     "INTERVIEW the owner for every token (never guess brand colors or ICP)." No owner interview
     was possible and no brief exists: every token is filled ONLY from the two raw files. A token
     they do not answer is UNRESOLVED with the question the restaurant must answer. -->

| Token | Value | Notes |
|---|---|---|
| {SITE_NAME} | Jalsa Restaurant | from the menu title and logo; unverified (A-01) |
| {SITE_REPO} | customers/jalsa-restaurant (dry-run workspace) | not a separate repository |
| {SITE_DOMAIN} | **UNRESOLVED** | no domain supplied. Canonical, sitemap and og:url stay unresolved. |
| {ICP} | **UNRESOLVED** | no audience stated. A restaurant's audience is not inferable from a menu. |
| {BRAND_SEED} | **UNRESOLVED** | logo measured at `#7c1518` background / `#f0f0e8` lettering (F-005). A measured colour is evidence, not a chosen seed (A-05). The neutral substitute ships. |
| {THEME_MODE} | SINGLE-DARK — **template default, UNCHOSEN** | A-06 |
| {FONT_HEAD} / {FONT_BODY} | **UNRESOLVED** | the logo's script lettering is artwork, not a named font |
| {STACK} | Default stack per stack_doctrine.md: Next.js App Router, React, TypeScript, token-generated CSS, Metadata API. **No backend, no database, no ordering or booking service.** | nothing requested |
| {CUSTOMER_COUNT} | **UNKNOWN** | not applicable as stated; no popularity claim exists or is allowed |
| {PERF_BUDGET} | framework default for `local_action_page` (150 KB route JS) | not stated |
| {MASCOT_LOCK} | none | no character |

## {STACK_DEVIATIONS}
Empty. None requested, none approved.

## LOGO TOKENS
| Token | Value |
|---|---|
| {LOGO_FILE} | `raw/jalsa-restaurant-logo.png` — **unverified; refused by the asset gate** |
| {LOGO_COLORS} | measured `#7c1518`, `#f0f0e8` (square artwork, no transparency) |
| {LOGO_PROVENANCE} | C2PA manifest: Anthropic Claude file service "may have created or modified"; origin confidence unknown |

## Standing constraints (inherited by every site)
Inherited unchanged. **Additional constraint found at Phase S** (research, restaurant to confirm):
food-business menu display rules may apply depending on jurisdiction and licence. For example,
secondary summaries of FSSAI (India) rules describe veg/non-veg marks per dish for some
establishments. Until the restaurant states its jurisdiction and licence, no dietary mark is
generated or inferred.
