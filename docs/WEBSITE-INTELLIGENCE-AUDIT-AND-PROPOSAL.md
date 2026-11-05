# WEBSITE INTELLIGENCE — audit of the existing workflow and proposed architecture

Date: 2026-11-05 · Status: **PROPOSAL — awaiting owner approval. No workflow file has been modified.**
Branch: `claude/trusting-volta-884u53`

Purpose: evolve the Website Workflow into a universal, reusable Website Intelligence
system that can study ANY public website, extract its valuable practices across
design, UX, motion, accessibility, performance, engineering, business and content,
compare them across sites and industries, and feed candidate capabilities into the
SDLC framework — with evidence, confidence and traceability on every finding.

The first case study is CoFee. **No CoFee material exists in this repository today**
(a repo-wide search for the name returned nothing), so this document is written to
be website-independent from the start, as the brief requires.

---

## PART 1 — AUDIT OF THE EXISTING WORKFLOW

Method: every file under `website_workflow/`, `.claude/commands/`, `docs/`,
`src/` (pattern registry, evidence, content, host, responsive) and the one
customer dry run (`customers/ashvattha-tax`) was read. `npm run audit:framework`
was run on the current tree: 11 checks, 0 FAIL, 2 WARN (72 of 121 mapped skills not
installed locally; 7 un-tokenized literals). Working tree clean at `a54aad7`.

### 1.1 Current workflow stages

| Surface | Stages | Entry point |
|---|---|---|
| Build pipeline (`website_flow.md`) | Phase 0 intake → S strategy → 1 interrogation → 2 design & plan → 3 Supabase → 4 build → 5 QA evidence → 6 release → 7 close | `/wrequest` → `/website` |
| Strategy audit (`strategy_audit.md`) | S1 positioning · S2 competitor teardown (5 sites) · S3 app-reality · S4 media format · S5 conversion architecture · S6 verdict · S7 lightweight | Phase S, `/waudit`, `/brainstorm` |
| Reference intake (`reference_site_analysis.md`) | STEP 1 scope gate (lanes A–F) → 2 fetch → 3 synthesize → 4 record (REF/ALT in `design_library.md`) → 5 report | `/wrequest`, `/brainstorm`, S2, ad hoc |
| Decision engine (`src/`) | BusinessInput → profile → baseline → rules (120 DD-nnn) → content verification → engagement decision → element selection (7 gates) → budgets → SEO/stack/responsive → quality → ImplementationContract | `runPipeline()` / Phase 2 step 0 |
| Host validation (`src/host/runtime/validate.mjs`) | build, served HTML (no JS), script weights, secret scan, axe + DOM measurements, lab Core Web Vitals, keyboard-operated experiences in Chromium and WebKit, responsive sweep | runs inside a GENERATED host only |

### 1.2 Existing research prompts and instructions
- `strategy_audit.md` S1/S2/S4: discover 5 competitors per run (≥3 India, ≥2 craft), capture hero/subhead/CTA/proof/media/better/worse, "steal the principle, not the pixels". Evidence rule: URL + quoted finding, never memory.
- `reference_site_analysis.md`: the only procedure for an owner-supplied URL. Six lanes classify the INPUT (explicit element, named part, URL only, token generator, template marketplace, code repository with a licence-first gate).
- `/waudit`: report-only audit of OUR page, with competitor discovery and ≥2 best-practice sources.
- `/brainstorm` step 3: ≥3 lookups before options.
- `resource_registry.md`: trigger-gated standing resources with RECORDED BIAS (R-03 awwwards: "award ≠ conversion evidence") — the right instinct for "popular ≠ best practice".
- Skills: `competitor-website-teardown-analyst` (14-step, 17 deliverables, but written for UniqBrio's 7 goals and ICP); `html-design-extractor` and `design-gap-analyzer` are mapped in `skills_map.md` but **not installed in `.claude/skills/`**; `competitive-research-specialist` was recorded "MISSING everywhere" in the dry run.

### 1.3 Crawling and browsing mechanisms
- External sites: **WebFetch only** — homepage + up to 4 linked pages, server-rendered HTML. WebSearch is the fallback for a tool's documented function. No browser-driven observation of a third-party site exists anywhere in the framework.
- Consequence, recorded by the framework itself: REF-005 "a live WebFetch returned only server-rendered markup — the stacking behaviour is client-side and did not appear in the fetch. Logic captured from the owner's screenshot." Client-side behaviour — hover, scroll, modal, drag, animation, lazy loading — is invisible to the current intake.
- Our own sites: Playwright (`responsive_matrix.md` TIER 1, six profiles across Chromium AND WebKit) and `validate.mjs`. Both are bound to the generated host (`host-manifest.json`, `npm run build`) and cannot be pointed at an arbitrary URL.

### 1.4 Screenshot and evidence collection
- For our sites: strong. `qa_evidence_gate.md` ("a claim without an artifact is a FAIL"), evidence under `website_workflow/evidence/<request-id>/`, `src/evidence/evidence-value.ts` types every figure as `measured | derived | estimated | unavailable`, `requireMeasured()` refuses estimates in code.
- For external sites: a REF entry records "Source = URL + date fetched (or screenshot, fetch blocked)". Screenshots are owner-supplied, never captured by the workflow. No evidence register, no finding IDs, no reproduction steps, no confidence field. Evidence quality lives in free prose ("Evidence caveat, stated honestly").

### 1.5 Interaction and animation inspection
- `animation_library.md` governs SELECTION of motion for our site (four-job gate, 8-category catalog, reduced-motion, WCAG 2.2.2, ambient ceiling) — a good evaluation rubric that is not applied to observed sites.
- STEP 3 of the reference procedure lists "interaction, motion" as things to describe, but nothing instructs HOW to observe them (trigger, timing, reduced-motion behaviour, keyboard parity) and WebFetch cannot observe them at all.

### 1.6 Mobile and responsive testing
- Our sites: TIER 1/2/3 matrix, RF-xxx failure patterns, RCA loop — mature.
- External sites: not covered. A reference site is never viewed at 320 px, in WebKit, or in landscape; "responsive design" findings are therefore impossible today except from an owner screenshot.

### 1.7 Accessibility and performance analysis
- Our sites: axe-core + DOM measurements + lab Core Web Vitals, with honest coverage states (`measured | failure_only | human_assessment_required | not_measured`). `budgets.ts` and `rules.ts` are the single homes for thresholds.
- External sites: not measured. STEP 3's fit check asks whether a pattern passes OUR accessibility/performance rules, judged from markup or prose, never from a measurement of the reference.

### 1.8 Technical implementation research
- Lane F (code repository): licence-first gate (copyleft → concepts only), recorded precedent (webstudio AGPL). Good and reusable.
- No procedure distinguishes OBSERVED behaviour from CONFIRMED implementation for a live site (e.g., "uses position: sticky" is observable; "built with Framer Motion" is a guess unless the bundle or a public source says so). REF-005 does this well in prose; nothing requires it.

### 1.9 Reporting and documentation
- Outputs today: REF/ALT/IDEA entries in `design_library.md` (53 entries, indexed, append-only, audited for index/body parity); `/waudit` reports in `website_workflow/audits/`; STRATEGY VERDICT blocks; decisions_log entries.
- None of the eight deliverables the brief names exists as a template or a convention. There is no "research project" unit: a reference is a one-off event and S2's five-site table is discarded after the verdict.

### 1.10 Handoffs to the SDLC framework
- Markdown: REF/ALT/IDEA → OPTION SELECTION FUNNEL (screen every entry, rank, score current state + top 3) → `decision_matrix.md` → request file → build gates. Sound, but it answers "which option for THIS slot on THIS site", not "should the framework gain this capability".
- Code: `PatternDefinition` (`src/design-system/pattern-registry/types.ts`) already carries problem solved, communication problem, best/poor for, required content, desktop/tablet/mobile/reduced-motion transforms, accessibility, performance and SEO cost, tier, expressiveness, fallback, frequency cap, eight hard-constraint flags, trend saturation and six benefit scores — roughly 80% of the brief's §6 pattern schema. It has an optional `libraryRef` to the markdown library, one-way, and no path from an observed finding into it.
- Framework changes: `framework_update.md` (root cause → blast radius → minimal edit set → owner gate → audit tool). This is the right vehicle for "IMPROVE/CREATE a workflow capability", and it already forbids transcribing incidents instead of generalising them.

### 1.11 What already works and must be retained
1. Scope gate before fetching; "steal the principle, not the pixels"; licence-first for code.
2. Evidence discipline: URL + date, "never guess at markup not seen", `EvidenceKind` typing, UNKNOWN never PASS.
3. Option funnel and decision matrix: nothing adopted by taste; current state always Option A; losers logged.
4. Recorded bias on resources (R-03) — the seed of "popular ≠ best practice".
5. Pattern metadata model in code (seven gates, hard constraints, fallback, budgets).
6. The self-audit tool and append-only, indexed libraries.
7. `framework_update.md` as the governed route for changing the framework.

### 1.12 Gaps (what the brief needs that does not exist)

| ID | Gap | Evidence in the repo |
|---|---|---|
| G1 | No research-project unit: one URL at a time, no multi-page plan, no multi-site project, no consolidation of duplicate findings, no cross-site comparison that persists | `reference_site_analysis.md` ("each reference gets its own scope gate"); S2 table discarded after verdict |
| G2 | No universal finding taxonomy: lanes classify the INPUT, not the DIMENSIONS of what is found; perf, a11y, engineering, business, content and IA dimensions are never elicited for a reference site | STEP 3 lists "layout, interaction, component, motion, copy structure" only |
| G3 | No browser-driven observation of third-party sites; client-side behaviour, responsive behaviour, reduced-motion, keyboard behaviour and resource loading are invisible | WebFetch-only STEP 2; REF-005 caveat; `validate.mjs` bound to generated hosts |
| G4 | No finding record: no IDs, confidence level, reproduction steps, limitations, screenshot reference, or potential application fields | REF entry format; no evidence register for research |
| G5 | No best-practice evaluation or classification (proven / promising / context-specific / anti-pattern / unverified); the fit check asks "adoptable here?" not "is this good, and why?" | STEP 3 fit check; R-03 bias note is the only anti-popularity rule |
| G6 | Pattern library is site-coupled and source-coupled: REF entries carry {SITE_NAME} cautions and a single source; there is no site-independent pattern ID with "observed on N sites" | `design_library.md` header constraints; /winit copies the library per site |
| G7 | No SDLC capability mapping: no REUSE / IMPROVE / CREATE / OPTIONAL / EXCLUDE / BLOCKED decision, no inventory of what to inspect (components, hooks, rules, register checks) before declaring a gap | handoff is slot-level (funnel) or framework-level (framework_update) only |
| G8 | Research governance incomplete: nothing forbids submitting forms, authenticating or performing consequential actions while browsing a target; robots/ToS handling is "if fetch fails, ask for a screenshot"; proprietary-asset rule exists only as PRIME RULE prose and lane E/F | `reference_site_analysis.md` STEP 2 |
| G9 | No deliverable set: none of the eight reports has a template or location | `templates/` holds request + test-register templates only |
| G10 | Measurement of third-party sites absent: no Core Web Vitals, axe, responsive sweep or resource weights for a URL we do not build | `HOST_TOOLCHAIN` declares `playwright-core` + `axe-core` for hosts; the core installs only `zod` |
| G11 | Domain coupling: skills and prompts assume academy/UniqBrio (89 literals recorded in the dry run; `competitor-website-teardown-analyst` hard-codes 7 UniqBrio goals; `academy-owner-psychology-expert` was "wrong audience" for the tax practice) | `docs/CUSTOMER-DRY-RUN-REPORT.md` §15; skill front-matter |
| G12 | Mapped research skills not installed: `html-design-extractor`, `design-gap-analyzer`, `competitive-research-specialist` | audit WARN; dry run Phase S record |

Nothing in this list is a reason to discard the existing intake. The proposal below keeps `reference_site_analysis.md` as the lightweight single-reference lane and adds the research-project lane beside it.

---

## PART 2 — PROPOSED ARCHITECTURE

### 2.1 Principle: three layers, one direction of flow

```
OBSERVE  →  EVALUATE  →  APPLY
findings      patterns     SDLC capabilities
(per site,    (site-       (per framework:
 per page,     independent, REUSE / IMPROVE / CREATE /
 evidenced)    classified)  OPTIONAL / EXCLUDE / BLOCKED)
```

- A FINDING belongs to one research project, one site, one page, one taxonomy dimension. It carries evidence and a confidence level. It is never a recommendation.
- A PATTERN is site-independent. It is created or strengthened from findings and records every site it was observed on. It carries the best-practice evaluation and its classification.
- A CAPABILITY DECISION maps a pattern (or an anti-pattern) onto the existing framework after inspecting what exists, and ends in one of the six decisions. CREATE/IMPROVE decisions become `framework_update.md` edit sets or request files; they are never auto-applied.

Traceability is a chain of IDs: `WIR-<project>` → `SITE-nnn` → `F-nnnn` → `EV-nnnn` → `PAT-nnn` → `CAP-nnn` → request file / framework_update entry. The self-audit tool verifies the chain resolves.

### 2.2 New files (all additive; none replaces an existing file)

```
website_workflow/
  intelligence/
    website_intelligence.md      the master procedure, Phases R0–R7 (below)
    taxonomy.md                  dimensions A–H: what to observe, how, what counts as evidence
    evidence_framework.md        finding record schema, confidence levels, evidence register rules
    best_practice_evaluation.md  the 10 evaluation questions + 5 classifications
    pattern_library.md           PAT-nnn entries, site-independent, append-only, indexed
    sdlc_mapping.md              the inventory to inspect + the six decisions + CAP-nnn record
    comparison.md                cross-site procedure: dedupe, recurrence, uniqueness, industry patterns
    templates/
      research_project.md        WIR intake: sites, pages, scope, authorisation, limits
      site_record.md             per-site profile: industry, stack observations, access notes
      finding.md                 F-nnnn record (all fields from brief §4)
      pattern_spec.md            PAT-nnn specification (all fields from brief §6)
      capability_candidate.md    CAP-nnn record with the decision and its evidence
      report_*.md                the 8 deliverables + consolidated comparison report
  research/                      research projects live here (see 2.6)
    <WIR-id>/
      project.md · sites/<SITE-id>/{site_record.md, pages/…} · findings.md ·
      evidence/{manifest.json, …} · reports/ · capabilities.md
  tools/
    capture_site.mjs             read-only browser capture for a URL list (see 2.5)
.claude/commands/wintel.md       entry point (twin copy in website_workflow/commands/)
```

### 2.3 The procedure: Phases R0–R7

| Phase | Name | Output | Gate |
|---|---|---|---|
| R0 | PROJECT INTAKE & GOVERNANCE | `project.md`: sites, pages, scope per site (reuses the six-lane scope gate), authorisation record (what interactions are permitted — default: navigate, scroll, hover, open/close UI, focus; NEVER submit forms, log in, pay, download gated files), robots/ToS check per site, rate limits, device/network conditions | GATE R0 (owner, conceptual) |
| R1 | SITE MAP & PAGE SELECTION | served sitemap/robots/nav crawl (GET only), page inventory, selected pages with a reason each; unreachable pages recorded as such | — |
| R2 | CAPTURE | per page × profile: screenshots (TIER 1 profiles, light/dark, reduced-motion on/off), served HTML without JS, DOM snapshot with JS, resource summary (count, bytes, types, lazy attributes), console errors, axe results, lab vitals under a named throttle, keyboard walk, landmark/heading outline, focus-order trace. Every artifact gets an `EV-nnnn` row in `evidence/manifest.json` with URL, profile, tool, timestamp, conditions | — |
| R3 | OBSERVE (taxonomy A–H) | `F-nnnn` findings written against the taxonomy prompts, each citing EV ids, with reproduction steps and the initial confidence OBSERVED / INFERRED / UNVERIFIED | — |
| R4 | VERIFY | upgrade to SOURCE VERIFIED only on accessible source, public docs or technical evidence (bundle names, headers, public repos — lane F licence rule applies); explicitly separate "what the page does" from "how it is built" | — |
| R5 | EVALUATE | the 10 questions per candidate pattern; classification; anti-patterns recorded with the same rigour as good patterns | GATE R5 (owner, detailed) |
| R6 | EXTRACT & CONSOLIDATE | new or strengthened `PAT-nnn` entries; dedupe across pages/sites; recurrence count; uniqueness flag; cross-site comparison when >1 site | — |
| R7 | MAP TO SDLC & REPORT | `CAP-nnn` decisions after inspecting the inventory; the 8 reports (+ comparison report for multi-site); backlog ordered by evidence strength, not by enthusiasm | GATE R7 (owner, evidence) — nothing is built from here; CREATE/IMPROVE go to `/wrequest` or `framework_update.md` |

Standing rules carried into every phase: never invent a finding or a measurement; a measurement names its conditions and tool; a page that could not be captured is recorded as UNVERIFIED, never described from memory; "a popular site does it" is not evidence of value (R-03 rule generalised); UNKNOWN is a terminal, honest state.

### 2.4 Taxonomy, evidence and evaluation (what `taxonomy.md`, `evidence_framework.md`, `best_practice_evaluation.md` will specify)

- Taxonomy A–H exactly as the brief lists them, each dimension with: observation prompts, the capture artifacts that can answer them, what can only be INFERRED from a browser, and the existing framework rubric to evaluate against (A → `design_library.md`/`theme_system.md`; C → `animation_library.md` four-job gate + WCAG 2.2.2; D → `src/accessibility/rules.ts` thresholds; F → `src/performance/budgets.ts` WEB_VITALS; G → `strategy_audit.md` S5 + engagement gates; H → `stack_doctrine.md` SEO ARTIFACT SET). No threshold is restated — each is cited from its single home (README rule 9).
- Confidence levels: OBSERVED · SOURCE VERIFIED · INFERRED · UNVERIFIED · PROPOSED, with the rule that PROPOSED can never appear in a finding, only in a pattern's "potential application" or a CAP record. Mapping to the code's `EvidenceKind`: OBSERVED/SOURCE VERIFIED ≈ measured, INFERRED ≈ derived, UNVERIFIED ≈ unavailable; estimates are labelled as such.
- Finding record fields: ID, project, site, URL + page, category, description, evidence (EV ids), screenshot/recording reference, reproduction steps (profile, steps, expected observation), confidence, limitations, potential application. Reuses `templates/website_bug.md`'s repro discipline.
- Evaluation: the 10 questions, each answered in writing with an EV or PAT citation, then one of: PROVEN REUSABLE · PROMISING, VALIDATION REQUIRED · CONTEXT-SPECIFIC · ANTI-PATTERN / WEAKNESS · UNVERIFIED. A classification without the 10 answers is invalid, same standard as an unevidenced matrix score.

### 2.5 Browser capture tool (`tools/capture_site.mjs`) — needs a dependency decision

What it does: given a URL list and a profile list, opens each page in Chromium and WebKit via Playwright, GET-only, with a conservative delay, and writes the R2 artifacts plus the evidence manifest. It reuses `RESPONSIVE_SWEEP` from `src/responsive/sweep-profiles.ts` and the raw-fact philosophy of `validate.mjs`: it collects, it never judges. Hard limits in code: no form submission, no credential fields filled, no navigation to URLs outside the project allow-list, robots.txt respected, no downloads.

Why it is a decision and not a given: the framework core deliberately installs only `zod`; `playwright-core` and `axe-core` exist in `HOST_TOOLCHAIN` for generated hosts only. Adding them to the framework is a PROFILE B stack decision under `stack_doctrine.md` DEFAULT-DENY. Options to score at Gate R0 of the first project:
- A. Do not add: the procedure is markdown-only; capture relies on whatever Playwright the session has (this cloud session has Playwright 1.63 and Chromium pre-installed). Cheapest, but evidence capture is then environment-dependent and not reproducible from the repo.
- B. Add `playwright-core` + `axe-core` as devDependencies of the framework (driving an already-installed browser, no binary download — the same boundary `toolchain.ts` already draws). Reproducible from the repo; two packages the framework already trusts.
- C. A separate `tools/package.json` so the core stays at `zod` only.
Recommendation: B, scored formally at the first project's Gate R0, recorded in the README update log.

### 2.6 Multi-site, multi-project support
- A research project may contain one site with one page or many sites with many pages; the procedure is identical, the comparison step activates when sites > 1.
- Findings are project-scoped; patterns are global. `pattern_library.md` carries `Observed on: SITE-… (F-…), …` so recurrence across projects is a count, not a memory. A pattern seen on one project is cited, not re-investigated, on the next.
- Consolidation rule: two findings describe the same pattern if they share dimension, mechanism and user-facing behaviour; they are merged into one PAT with both evidence chains, never duplicated.
- Research projects live in the framework master under `website_workflow/research/` (cross-site knowledge is framework knowledge, like `design_library.md`). `/winit` copies `intelligence/` and `pattern_library.md` into a site, but NOT `research/` evidence (large, and site-independent anyway).

### 2.7 SDLC mapping (`sdlc_mapping.md`)
Before any decision, the inventory that MUST be inspected, with the grep/lookup for each: `design_library.md` entries; `animation_library.md` catalog; `src/design-system/pattern-registry/registry.ts` PATTERNS; `src/design-intelligence/sections/registry.ts`; `src/generation/component-model.ts` and render modules; `src/engagement/registry.ts`; `src/workflow/seams.ts` REGISTER_CHECKS; the 120 DD-nnn rules; interrogation Q-xxx; RF-xxx and DP-xxx catalogues; installed skills. Then one decision per candidate:

| Decision | Meaning | Where it goes next |
|---|---|---|
| REUSE | the capability exists; cite it | none (recorded) |
| IMPROVE | exists but the evidence shows a gap (e.g., a missing state, a weaker fallback) | `framework_update.md` edit set or a request file |
| CREATE | does not exist; evidence is strong; acceptance criteria written | `framework_update.md` (framework) or `/wrequest` (a site) |
| OPTIONAL | valuable only in named contexts; recorded as a PAT with disqualifiers | pattern library only |
| EXCLUDE | anti-pattern, or conflicts with a standing rule (truth, contrast, default-deny) | pattern library, classified, with the rule it conflicts with |
| BLOCKED — INSUFFICIENT EVIDENCE | classification UNVERIFIED or no measurement where one is needed | stays open with the exact evidence that would unblock it |

Every CAP record names: mapped design-system capability, mapped components, mapped hooks/utilities, mapped workflow phase, existing test coverage (register checks, host validations, vitest scenarios), gaps, acceptance criteria, automated validation, manual validation.

### 2.8 Deliverables (templates under `intelligence/templates/`)
1 Website Intelligence Report · 2 Interaction & UX Inventory · 3 Accessibility & Performance Findings · 4 Best-Practice Extraction Report · 5 Reusable Pattern Specifications · 6 Evidence & Screenshot Register · 7 Candidate SDLC Capability Backlog · 8 Unverified Findings & Research Limitations · (multi-site) Consolidated Comparison Report + pattern library change list. Each report is generated from the records (findings, patterns, CAPs, manifest), so a report can never claim something the records do not hold.

### 2.9 Governance (non-negotiables written into `website_intelligence.md` PRIME RULES)
Do not modify the target · no authenticated functionality assumed · no form submission or consequential action without written authorisation in `project.md` · no invented findings or measurements · no copying of proprietary assets or code (lane E/F licence rules apply to every site; screenshots are evidence, never shipped assets) · observed vs. assumed stated on every finding · nothing implemented from research · no library installed from research · traceability chain intact · existing workflow retained.

---

## PART 3 — CHANGES TO EXISTING FILES (minimal, all additive)

| File | Change | Why |
|---|---|---|
| `website_flow.md` STANDING INSTRUCTIONS | one bullet: a "study this site/these sites" ask routes to `intelligence/website_intelligence.md`; PAT entries are screened by the option funnel like REF/ALT | connects the new layer without altering phases |
| `reference_site_analysis.md` | STEP 1 gains lane G: FULL INTELLIGENCE STUDY → hand off to R0; STEP 4 may cite a PAT id | keeps the lightweight lane intact; one routing line |
| `design_library.md` rule 1 / HOW TO ADD | a REF/ALT/IDEA may cite the PAT it instantiates; PAT is the universal layer, REF the site-scoped option | two libraries with a stated relationship, not a duplicate |
| `strategy_audit.md` S2 | consult `pattern_library.md` and prior research projects BEFORE fresh discovery (consult-ladder rung 1) | stops re-investigating known sites |
| `commands/wrequest.md` + `.claude/commands/wrequest.md` | CLASSIFY: "study/compare/learn from site(s)" → INTELLIGENCE (run `/wintel`) | byte-identical twins |
| `commands/winit.md` (both copies) | copy `intelligence/` + `pattern_library.md`; do not copy `research/` | per 2.6 |
| `skills_map.md` | situational row for the intelligence procedure; record `html-design-extractor`/`design-gap-analyzer` as not installed | audit WARN made explicit |
| `framework_update.md` BLAST RADIUS | add `intelligence/**`, `research/**` and `wintel.md` | governed-file list stays complete |
| `tools/audit_framework.py` | new checks: pattern index/body parity; every F-/EV-/PAT-/CAP- id cited in a report or CAP exists; evidence manifest paths resolve; `wintel` parity | keeps the chain mechanically honest |
| `README.md` | Files table rows + Update-log entry | rule 7 |
| `package.json` | only if option B/C in 2.5 is approved | stack decision |
| `src/design-system/pattern-registry/types.ts` | OPTIONAL, later: `libraryRef` may hold a PAT id; no behaviour change | code ↔ markdown seam |

Explicitly NOT changed: the eight build phases and their gates, the decision matrix, the option funnel, the QA lifecycle, the engine, the generator, the host validator, all skills.

---

## PART 4 — IMPLEMENTATION PLAN (after approval)

| Step | Scope | Files | Verification |
|---|---|---|---|
| 1 | Specifications: `website_intelligence.md`, `taxonomy.md`, `evidence_framework.md`, `best_practice_evaluation.md`, `sdlc_mapping.md`, `comparison.md` | 6 new | audit tool PASS; cross-refs resolve |
| 2 | Templates: project, site record, finding, pattern spec, capability candidate, 8 reports + comparison | 14 new | each template's fields = the brief's lists, checked line by line |
| 3 | `pattern_library.md` (empty INDEX + rules) and `research/README.md` | 2 new | index/body parity check extended |
| 4 | `/wintel` command (both copies) + routing edits in `wrequest`, `winit`, `website_flow`, `reference_site_analysis`, `design_library`, `strategy_audit`, `skills_map`, `framework_update`, README | 2 new, 9 edited | `audit_framework.py` parity + cross-refs; `npm run gate` |
| 5 | `tools/capture_site.mjs` + audit-tool checks | 1 new, 1 edited | dry run against one public page in this environment; manifest validates; no non-GET requests (asserted in code) |
| 6 | First research project: CoFee (R0 → R7), including the dependency decision for 2.5 | `research/WIR-…` | the 8 reports produced from records; every finding has EV ids; every CAP has an inspected inventory |
| 7 | Framework learnings from the CoFee run → `framework_update.md` | as found | README update log |

Estimated size: ~25 new markdown files, 1 script, 9 small edits. Steps 1–5 are framework work and can be reviewed in one pull request; step 6 is the first use.

---

## PART 5 — DECISIONS NEEDED FROM THE OWNER BEFORE IMPLEMENTATION

1. **CoFee**: which URL(s), and which lane — whole site, named pages, or a comparison set? Nothing in the repo names it.
2. **Capture dependencies** (2.5): A markdown-only / B add `playwright-core` + `axe-core` to the framework / C separate tools package. Recommendation: B.
3. **Pattern library home**: a new `intelligence/pattern_library.md` (recommended, site-independent) versus extending `design_library.md` (site-scoped by design).
4. **Research project location**: framework master `website_workflow/research/` (recommended) versus per-site repos.
5. **Evidence binaries**: may screenshots (PNG) be committed under `research/<WIR>/evidence/`, or should the manifest reference an external store? The framework currently commits JSON evidence only.
6. **Command name**: `/wintel` (proposed) or another; or fold into `/waudit` (not recommended — waudit audits OUR page and must stay report-only).
7. **Domain lenses**: keep academy/UniqBrio skills as OPTIONAL industry lenses selected at R0, not defaults (consistent with the dry-run finding).
8. **Interaction authorisation default**: confirm the default allow-list (navigate, scroll, hover, open/close UI, keyboard focus) and the hard denials (submit, login, payment, downloads).

**STOP.** Implementation begins only on approval of this document, with the answers above or explicit defaults recorded in the first `project.md`.
