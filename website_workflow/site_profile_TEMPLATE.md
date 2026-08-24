# SITE PROFILE — the single source for every {TOKEN} in this workflow
<!-- Copy to website_workflow/site_profile.md in the site repo and fill.
     Every workflow file references these tokens; nothing else defines
     brand or audience facts. Filled by /winit. -->

| Token | Value | Notes |
|---|---|---|
| {SITE_NAME} | | product/company name |
| {SITE_REPO} | | repo folder name |
| {SITE_DOMAIN} | | production domain |
| {ICP} | | one-line ideal customer profile |
| {BG_0} | | page background (dark themes: near-black) |
| {BG_1} | | card/surface color |
| {ACCENT_1} | | primary action color (CTAs; max ONE per viewport) |
| {ACCENT_2} | | secondary accent (support only) |
| {ACCENT_2_TEXT} | | light variant of ACCENT_2 legal as text on dark (≥4.5:1) |
| {FONT_HEAD} / {FONT_BODY} | | |
| {STACK} | | e.g. Next.js + Vercel + Supabase |
| {CUSTOMER_COUNT} | | REAL number — drives the honesty rules |
| {PERF_BUDGET} | | e.g. LCP<2.5s on mid Android/3G, hero ≤120KB |
| {MASCOT_LOCK} | | path + version of the LOCKED character design sheet, or "none" (set by brand-character-mascot-designer; every character asset cites it) |

## Standing constraints (inherited by every site)
- Truth: the site may never claim more than app_reality.md (honesty rules
  scale with {CUSTOMER_COUNT}; no fabricated social proof, ever).
- Contrast: all states ≥4.5:1; light text on dark, dark on light;
  {ACCENT_2} is never a text color on dark — use {ACCENT_2_TEXT}.
- Accent scarcity: one {ACCENT_1} action element per viewport.
- Competitors discovered fresh each audit — no fixed list.
