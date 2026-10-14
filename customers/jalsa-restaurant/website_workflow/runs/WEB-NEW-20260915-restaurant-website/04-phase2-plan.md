# PHASE 2 — DESIGN & PLAN

Request: WEB-NEW-20260915-restaurant-website · 2026-09-15 · website_flow.md Phase 2

## Step 0 — DESIGN DECISION INTELLIGENCE
- **Seam, as executed:** `07-engine-seam.md` (framework blocks) → `engineInputFromWorkflow` →
  `runPipeline` → `generateWebsite`. No derived `engine/*.json` exists.
- **Transcription judgments:** `../../../decisions/transcription-decisions.md` (T1-T16).
- **Engine output adopted as the plan's spec:** `../../../decisions/design-decision-record.md`.
- **Engagement:** `../../../decisions/engagement-decision.md` (NO_EXPERIENCE; the plan adds none).
- **Gate:** `npm run gate` passed before the run.

### What the seam could not carry (information that stops at the contract)
| Evidence | Where it stops | Defect |
|---|---|---|
| "For design illustrations only" | no field restricts publication of an offer | FD-05 |
| 52 prices | no price value field; pricing is never generated | FD-03 |
| category per row; filter list; dietary filter; portions | the offer contract has no category, dietary or portion field | FD-04 |
| "unknown objective", "unknown audience" | contract requires values; no basis field | FD-01, FD-02 |
| business name is unverified | no verification state for `businessName`; SEO provenance text calls it "verified" | FD-13 |
| restaurant / food service | no industry value | FD-10 |
| measured logo colours | brandSeed is owner-chosen; correctly not carried | — (policy) |
| C2PA logo provenance | no field; recorded in evidence only | lesson L-03 |

## Steps 1-5
1. **Component tree:** the generator's component model; no hand-built components.
2. **Blast radius:** the whole new site; no existing code.
3. **Positioning and spacing:** token-generated CSS; ranges from `src/responsive/capabilities.ts`.
4. **Media plan:** none. Logo refused (A-04); no photographs (S4).
5. **Production hand-off:** none; no asset enters the build.

## Step 6 — COLOUR TOKENS
- {BRAND_SEED} UNRESOLVED → neutral substitute `#5A5F6A` (provenance `neutral_substitute`).
- {THEME_MODE}: SINGLE-DARK, unchosen (A-06).
- 16 measured contrast pairs, all pass. DRIFT flags: none.
- The logo's measured `#7c1518` is **not** applied: applying it would make an owner decision on
  the owner's behalf.

## Step 6b — STACK & SEO PLAN
### (a) DEPENDENCY GATE
| Material | Proposed by | Verdict |
|---|---|---|
| `next`, `react`, `react-dom` | stack decision (framework runtime) | admitted |
| `motion` | stack proposal | **not consumed → not installed** (no generated module imports it) |
| client-side menu filtering | the menu document (possible request) | not reached: the engagement engine rejected the idea at hard gates; nothing to gate |
| ordering / booking / map / form backends | nobody | none |

### (b) CLIENT BOUNDARY
`app/error.tsx` only (Next.js requires it). No indexable content depends on it.

### (c) SEO ARTIFACT SET (plan; verified from served HTML at Phase 5)
| # | Item | Plan status |
|---|---|---|
| 1 | Title | "Jalsa Restaurant" (name only; no locality exists) |
| 2 | Meta description | AI draft AD-02, **held** → absent until approved |
| 3 | Canonical | **UNRESOLVED** — no domain (M-49) |
| 4 | One H1 | "Jalsa Restaurant" |
| 5 | OG / Twitter | title and type; **og:image unresolved** (no verified image) |
| 6 | JSON-LD | Organization (name) only; LocalBusiness **refused** (no verified address); Menu/MenuItem **no type exists in the framework** (FD-04); FAQPage N-A |
| 7 | Sitemap / robots | robots present; **sitemap unresolved** (no origin) |
| 8 | Slugs | `/` only |
| 9 | Inbound link | single page; the score sheet reports it as an orphan (FD-12) |
| 10 | Alt text | N-A — no images |

## Step 7 — ABSENCE SEMANTICS
| Input | Missing looks like | One resolver |
|---|---|---|
| Contact methods | status `unavailable`, no value | `content/contact-status.ts` + `resolveContent` → hidden contact, unavailable notice |
| Hours | no supplied value (and hours need a verified address) | `resolveContent` → section slot |
| Copy | `unavailable` | `resolveContent` → slot; drafts → `resolveDrafts` → held |
| Offer descriptions | `description` absent | `resolveContent` → "description to be supplied" (not counted as a placeholder: FD-06) |
| Logo file | supplied, status `provided_unverified` | `resolveContent` → refused |
| Canonical origin | constraint omitted | `buildSeoArtifacts` → unresolved |
| Brand seed / fonts / theme | constraint omitted | `buildTokenContract` → neutral substitute + unresolved |

## Step 7 — TEST-CASE GENERATION
- The register is the `framework:test-register` block in `07-engine-seam.md`: 13 cases against the
  closed check registry.
- Provenance and honesty cases that the registry cannot express live in code:
  - `tests/scenarios/jalsa-real-customer.test.ts` (16 cases);
  - `tests/host/jalsa.host.ts` (served-HTML provenance ledger, raw hashes, synthetic-value
    prohibition).
- The registry's missing kinds are lesson L-04.

**GATE 2 — DETAILED — PENDING.**
