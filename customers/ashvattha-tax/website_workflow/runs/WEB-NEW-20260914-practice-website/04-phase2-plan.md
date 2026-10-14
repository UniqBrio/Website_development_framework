# PHASE 2 — DESIGN & PLAN

Request: WEB-NEW-20260914-practice-website · 2026-09-14 · website_flow.md Phase 2

## Step 0 — DESIGN DECISION INTELLIGENCE (the markdown → TypeScript seam)

**Seam, as executed.** The brief and the Phase S verdict were transcribed into the engine's
input contract as data: `engine/business-input.json` and `engine/supplied-content.json`,
parsed by `parseBusinessInput` and `suppliedContentSchema`. Nothing from Phase S reaches
the engine except what that contract can carry — see "What the seam cannot carry".
`npm run gate` passed before the run. The full engine output is in
`evidence/customer-dry-run-digest.json` (`decision`).

### Transcription judgments (every place the contract forced a choice)
| Field | Value | Why / status |
|---|---|---|
| industry | `professional_services` | AI JUDGMENT: a tax practice fits `professional_services` or `finance`; no rule maps it |
| businessModel | omitted | MISSING capability: the enum has no value for "both B2B and B2C" |
| brandPersonality | `authoritative`, `warm_human` | AI JUDGMENT from "trustworthy, professional, approachable, not boring corporate" |
| preferredVisualDirection | `minimal` | AI JUDGMENT from "clean, modern" |
| targetAudience.mobileShare | omitted | the brief says "usually on their phones" with no number; a number would be invented. MISSING capability: no qualitative mobile share |
| websiteObjective | `generate_leads`, `build_credibility` | from "get more enquiries" and "look trustworthy"; "rank on Google" is not an objective value and is carried as `seoDependency: high` |
| requiredPages paths | `/`, `/services`, `/about`, `/faq`, `/contact` | AI JUDGMENT: conventional slugs for the owner's page names |
| per-service pages | NOT listed as required pages | left to DD-093, which derives pages only for offers with supplied descriptions |
| requiredFunctionality | `contact_form`, `map` | "WhatsApp button" has no functionality value — MISSING capability |
| regulationRisk | `high` | from Phase S research (ICAI), not from the brief — recorded provenance |
| contactEmail / contactPhone / contactAddress | verified / unavailable / partial | the owner supplied their own email; phone and full address were promised, not supplied |
| certifications, reviews, statistics, pricing | `provided_unverified` | stated in the brief without evidence |
| canonicalOrigin, brandSeed, themeMode, fonts, accessibility target | omitted | not supplied; the engine records each as unresolved or defaulted |

### What the seam cannot carry
| Phase S / Phase 1 output | Where it stops |
|---|---|
| Positioning B (qualified local GST, tax and accounting help for Pune small businesses) | no field for an approved positioning or an AI draft awaiting approval — the hero renders the business name and a proposition slot |
| "Titles and H1s name the service and Pune" (S2 synthesis) | SEO titles are composed from the route label and business name only |
| Conversion D (WhatsApp, blocked) / C (email link) | no conversion kind for an outbound link; the engine plans an enquiry form |
| ICAI overlay (S3) | enforced only through the inventory statuses; no regulatory content policy exists in the engine |
| Library screen winners (Phase 1) | the engine selects from its own pattern registry; no mapping from design_library.md IDs |

### Engine output accepted as the plan's spec
| Contract item | Value |
|---|---|
| Archetype | `credibility_led_information_architecture` |
| Personality | "credible, clear, restrained, expert" |
| Expression / motion cap | `low_to_medium` / `minimal` |
| Pages | 5 owner pages + 3 derived service pages (DD-093); 2 offers refused: no description |
| Selected patterns | `modular-feature-grid`, `perspective-card`, `magnetic-action` — **the last two are never rendered** (Phase 1 Q-MOTION FAIL) |
| Rejected | 9 patterns, each with its rule (DD-006, DD-026, DD-028, DD-029, DD-044, DD-068, DD-113 …) |
| Stack | Next.js, static rendering; `react-hook-form`, `zod`; map embed omitted (DD-114: address unverified) |
| Budget | 200 KB route JS (archetype) |
| Accessibility target | `wcag_aa` (framework default; owner did not state one) |
| Rule conflict | **`layout.system`: DD-001 vs DD-013** — reported; fails the design gate and escalates to a human. **Not an owner decision:** DD-017 already assigns `layout.system` to the industry rules, and DD-013 (personality) broke that authority. Fixed at the authority in Phase 4 (B-7). |

## Steps 1–5
1. Component tree: the generator's component model (one model, two emitters); no hand-built components.
2. Blast radius: whole new site; no existing code.
3. Positioning and spacing: token-generated CSS; breakpoints from `RANGES` (src/responsive/capabilities.ts), which responsive_matrix.md's profiles test.
4. Media plan: none — logo and photos DEFERRED (S4).
5. Production hand-off: none — no asset enters this build.

## Step 6 — COLOUR TOKENS
{BRAND_SEED} UNRESOLVED → the neutral substitute seed `#5A5F6A` (provenance `neutral_substitute`).
{THEME_MODE}: SINGLE-DARK, the documented default, recorded **UNCHOSEN** (owner decision).
The engine's TypeScript port of tools/generate_palette.py generated the tokens and the
measured contrast table (parity with the Python tool is test-enforced at AA). The flow
still tells the operator to run the Python tool: two instructions for one step — a seam
finding. **DRIFT decisions:** none flagged.

## Step 6b — STACK & SEO PLAN

### (a) DEPENDENCY GATE
| Material | Proposed by | Five answers | Verdict |
|---|---|---|---|
| Email-sending backend for the contact form | brief | not answerable: no service named | **DENIED** — form renders disabled with a notice |
| Interactive map embed | brief | — | **OMITTED** by DD-114 (address unverified); nothing to gate |
| `react-hook-form` | engine (contact_form requirement) | 1 replaces: nothing — generated forms are native HTML and use no client state · 2 weight: measured at Phase 5 (it is not imported, so it adds 0 KB) · 3 boundary: none · 4 MIT · 5 removal: delete from package.json | **DENIED by doctrine** — unanswered question 1; the engine installed it anyway. Authority conflict recorded. |
| `zod` | engine | 1 replaces: hand-written validation of the form contract · 2 weight: server-side only, not in client bundles · 3 boundary: none · 4 MIT · 5 removal: delete schema module | admissible on the answers; still awaits owner approval |

The engine's stack decision admits libraries on a requirement alone; stack_doctrine.md
requires the five answers AND owner approval. The two authorities disagree about admission.

### (b) CLIENT BOUNDARY
One: `app/error.tsx` (Next.js requires error boundaries to be client components). No
indexable content behind it.

### (c) SEO ARTIFACT SET (plan; verified on built output at Phase 5)
| # | Item | Plan status |
|---|---|---|
| 1 | Title | composed per page; **not localised** ("Services — Ashvattha Tax & Compliance"); "Faq" casing defect |
| 2 | Meta description | AI brief per page, **approval required** — not emitted until approved |
| 3 | Canonical | **UNRESOLVED — required input:** scheme and preferred host for `ashvattha-tax.example` |
| 4 | One H1 | planned per page |
| 5 | OG / Twitter | title and type present; **og:image unresolved** (no verified asset) |
| 6 | JSON-LD | Organization (name) on `/`; Service per offer where services render; BreadcrumbList **unresolved** (needs canonical); FAQPage **refused** (no FAQ answers) |
| 7 | Sitemap / robots | robots planned; **sitemap unresolved** (needs canonical) |
| 8 | Slugs | lowercase, hyphenated; service slugs derived from offer names |
| 9 | Inbound link | every page linked from navigation and footer |
| 10 | Alt text | N-A — no images |

### (d) Deviations to site_profile.md
None approved.

## Step 7 — ABSENCE SEMANTICS
| Input | What "missing" looks like from the producer | One resolver |
|---|---|---|
| Contact methods | status per method; value omitted, or present with an unverified status | `content/contact-status.ts` + `resolveContent` |
| Copy (proposition, about, process, FAQ) | status `unavailable`, or `verified` with no value | `resolveContent` → explicit slot |
| Service descriptions | description absent on the offer | `resolveContent` (card says "description to be supplied"); DD-093 refuses the page |
| Form endpoint | no URL in `formEndpoints` | `formContractFor` → `unconfigured`, disabled, no action |
| Asset files | file supplied for an unverified asset | `resolveContent` → refused |
| Canonical origin | constraint omitted | `buildSeoArtifacts` → unresolved |

## Step 7 — TEST-CASE GENERATION
`qa/test_register.md`, derived from the six sources before the build ran.

**GATE 2 — DETAILED — PENDING.** No owner approval exists; the dry run proceeds.
