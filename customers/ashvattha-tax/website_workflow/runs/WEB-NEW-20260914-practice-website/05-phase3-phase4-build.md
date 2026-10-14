# PHASE 3 — SUPABASE REVIEW · PHASE 4 — BUILD

Request: WEB-NEW-20260914-practice-website · 2026-09-14

## PHASE 3 — N-A (recorded, not skipped silently)
The request marks SUPABASE **unknown**: /wrequest's rule says any form means yes or
unknown, never silently no. That makes Phase 3 mandatory by rule. There is nothing
to review:
- no Supabase project, schema, migration or environment exists for this customer;
- the one data-writing feature (a contact form that emails the practice) was
  **DENIED** at the Phase 2 dependency gate, because no email service was named. The
  generated form renders disabled, with no `action` attribute and no route handler.

GATE 3 — N-A. Reason: no data store and no write path exist. The rule that forces
Phase 3 for "any form" cannot tell a form that writes from a form that is disabled —
recorded as a framework gap (the rule is about Supabase, but the form has no backend
of any kind).

## PHASE 4 — BUILD (by the generator, not by hand)
Phase 4 says "implement exactly the approved plan". No plan is approved: GATE 2 is
PENDING. The build ran anyway, as the dry run's evidence step. **Nothing here is an
approved build.**

### Seam: generator → host
`generateWebsite(input, decided.output, decided.contract, { suppliedContent })` →
`planHostProject` → `writeHostProject` into `customers/ashvattha-tax/generated-host/`
(git-ignored) → `npm install` (declared runtime and toolchain packages only) → `node
host/validate.mjs`. Driver: `tests/host/ashvattha.host.ts`.
`formEndpoints` was **not** passed, because the customer named no backend.

### Phase 4 rules checked against the build
| Rule | Result | Evidence |
|---|---|---|
| Reuse primitives; no one-off variants | PASS | one component model, two emitters; no hand-written component |
| Server components by default; client boundary only where planned | PASS | `app/error.tsx` is the only `"use client"` file |
| No package that did not pass the DEPENDENCY GATE | **FAIL** | `react-hook-form` is installed but was DENIED at Phase 2 and is imported by nothing; `zod` awaits owner approval |
| Default-deny categories | PASS | no email backend, map embed, analytics or PWA |
| One Zod schema imported by client and route handler | N-A | no route handler exists (endpoint unconfigured); the schema is emitted in `app/_forms/contracts.ts` |
| Colour: semantic tokens only | PASS | one generated stylesheet; self-audit forward and reverse token checks run on the framework |
| Every fetch: loading, error, empty | N-A | no fetch |
| Forms: client and server validation, honest error copy, no data loss | PARTIAL | browser constraint validation plus an honest unconfigured notice; server validation cannot exist without an endpoint |
| Copy: plain, benefit-first, concrete CTA verb | **FAIL** | the proposition is a slot; "Faq"; mid-sentence "For Small business owners…"; the CTA is withheld (correctly) |
| No console errors, no TS errors, build passes | PASS, with the favicon exception | `next build` 0, `tsc` 0, `eslint` 0 errors and 0 warnings; one console error, the browser-automatic `/favicon.ico` 404 on the first page only (see Phase 5) |

### Defects found on the built output and fixed at source (then re-run)
| # | Defect | Cause | Fix |
|---|---|---|---|
| B-1 | Nav and footer said "Gst-registration-and-return-filing"; title and H1 said "Gst registration…" | page labels were rebuilt from the slug; the owner's offer name was discarded | `pageLabel(page)` and the SEO label use `page.offerName` verbatim |
| B-2 | Service JSON-LD published `areaServed` from a location marked `verified: false`, on pages that do not show those areas | `entitiesFor` read service areas without checking verification | areas only when `location.verified === true` |
| B-3 | Pages with no meta description scored "unique title and description" | the observation ignored the description | description must be present and not duplicated |
| B-4 | A lead objective counted as served, and the content gate passed, although no served page let a visitor complete an action | no evidence check looked for a completable action; `hasNoScriptPrimaryAction` counts any `<a>` | served HTML now records `conversionActions` (an enabled form with an action, or a mailto:/tel: link); the content gate fails when measured HTML has none |
| B-5 | The typography token record claimed "next/font, self-hosted" | a stale claim; no layer emits next/font | the loading statement now says what the CSS does |
| B-7 | Design gate false: "unresolved rule conflict on layout.system (DD-001 vs DD-013)", escalated as a human decision | a conflicting AUTHORITY. DD-017's recorded rule says `layout.system` belongs to the industry and density rules; personality rules DD-013 and DD-015 still wrote it | DD-013 and DD-015 write `layout.grid`. Remaining tensions stay reported (media + authoritative/technical on `layout.grid`; sports/fitness + authoritative/technical on `typography.strategy`) — no precedence exists between content-type and personality rules (P1) |
| B-6 | The disabled "Send enquiry" button rendered in the enabled accent (screenshots, every profile) | `--color-accent-1-disabled` was generated but no rule consumed it | `button:disabled` uses the disabled token; disabled controls show `not-allowed` |

Each fix has a regression test in `tests/scenarios/customer-dry-run-findings.test.ts`
(findings 7–12, plus the typography claim under finding 5), written to fail on the old code.

### Defects NOT fixed — capability gaps, recorded
| # | Observation | Why it was not patched |
|---|---|---|
| G-1 | `/contact` has no contact section; `/faq` has no FAQ section; `/services` repeats `/`; `/about` repeats `/faq` | page purpose never reaches section allocation. Fixing it means building page-purpose semantics, a new capability, not a correction. Writing sections in by hand would hide the gap. |
| G-2 | The site-level section architecture contains `location_and_contact`, `faq` and `disclosures`; no page renders them, and nothing reports the drop | same root as G-1; the silent drop is part of the gap |
| G-3 | `perspective-card` and `magnetic-action` were selected but not rendered | the generator has no renderer for them; the selection is not reconciled with the output |
| G-4 | "Faq" | `requiredPages` has no display-label field; the only source is the path |
| G-5 | On a 320px phone the flat 8-link navigation wraps to five rows before the H1 (iphone-se/home.png); the header trace cites `nav.compactMode=accessible_drawer_or_compact_bar` | the generator has no compact navigation, and the trace names a decision the output does not implement. RF-001 and RF-006 pass, so no gate sees it. |
| G-6 | The site is dark (SINGLE-DARK, unchosen), and the owner describes the logo as "dark blue text" | no logo file exists to measure. A dark-blue mark on `#15171D` would likely fail LOGO VISIBILITY. Theme and logo are owner decisions; the framework cannot resolve this before the file arrives. |
