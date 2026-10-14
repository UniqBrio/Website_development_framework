# ARCHITECTURE ASSESSMENT — AI Website Development Framework

Produced before implementation, as required by the master prompt §32 and §34.
Sections A–E are the mandated deliverables. §F records every decision the
specification left unspecified, per §34's closing instruction.

Source of truth: `website-design-decision-specification.md` (v1.0, 3,293
lines, 120 `DD-xxx` rules, appendices A–L).

---

## A. CURRENT ARCHITECTURE ASSESSMENT

### A.1 What this repository is today

A **markdown process framework**, not a code framework. No `package.json`,
no `tsconfig.json`, no `src/`, no test runner. 36 markdown files plus two
Python tools.

| Layer | Artifacts | What it governs |
|---|---|---|
| Entry commands | `.claude/commands/*.md` + `website_workflow/commands/*.md` (5, byte-identical pairs) | `/winit` `/wrequest` `/website` `/waudit` `/brainstorm` |
| Pipeline | `website_flow.md` | Phases 0→7, each with an owner gate |
| Decision procedure | `decision_matrix.md` | 2 weighting profiles, 500-point scale, shortlist provenance |
| Design corpus | `design_library.md` (53 REF/ALT/IDEA entries), `animation_library.md`, `image_prompts.md` | Pattern options + motion four-job gate |
| Token systems | `color_system.md` + `tools/generate_palette.py`, `theme_system.md` | ONE seed → OKLCH ramps → semantic tokens, measured contrast |
| Verification | `qa_workflow.md`, `checklists/qa_evidence_gate.md`, `responsive_matrix.md`, `degraded_paths.md` | Test lifecycle, evidence artifacts, device tiers, absence semantics |
| Architecture | `stack_doctrine.md` | Closed default stack, default-deny categories, dependency gate, SEO artifact set |
| Truth | `app_reality_TEMPLATE.md`, `site_profile_TEMPLATE.md` | Claim ceiling, all brand tokens |
| Self-check | `tools/audit_framework.py` | 10 mechanical checks, PASS/FAIL/ACPT, run before every commit |

### A.2 What it does well, and must not be discarded

- **Evidence-or-fail discipline.** "A claim without an artifact is a FAIL"
  is enforced at a gate, not advised. The spec's §L gates assume exactly
  this posture and gain from it.
- **Single-source token derivation.** `generate_palette.py` already does
  what spec §22 asks for (one seed → coherent tokens, measured contrast,
  auto-correction, DRIFT flagging). This is stronger than the spec's §22,
  which states the requirement without an algorithm.
- **Stricter-than-WCAG contrast.** Logo contrast is required in every theme
  with the worst colour pair governing, and the file records that WCAG
  *exempts* logotypes so nobody later "corrects" the rule. The spec has no
  logo rule at all.
- **Absence semantics** (`degraded_paths.md`): one shared resolver,
  producer-shaped triggering, observable-symptom assertions. The spec's
  content model (§J) describes confidence levels but never how a missing
  value is represented in code. These compose.
- **Escalation on repeat failure** (`framework_update.md` step 6): the same
  failure class twice means the fix was insufficient, redo root cause.

### A.3 Structural gaps against the specification

| # | Gap | Evidence |
|---|---|---|
| G1 | **No machine-readable decision model.** Every rule is prose for a human or an LLM to apply. Nothing is executable, so nothing is deterministic or regression-testable. | No `src/`, no rule objects, no evaluator |
| G2 | **No business→design derivation.** The pipeline starts from an *approved change request* about an *existing* site. There is no path from business facts to a design specification. | `website_flow.md` Phase 0 requires a filled request file and STOPS without one |
| G3 | **Decisions are per-request, not per-business.** `decision_matrix.md` scores 2–4 options for one slot. Nothing produces a whole-site `DesignDecisionOutput`. | `decision_matrix.md` rules 1–7 |
| G4 | **No industry prior.** Nothing maps industry → archetype, expression ceiling, motion cap, required proof. | No equivalent of spec appendix B |
| G5 | **No pattern metadata.** `design_library.md` entries carry Cost/Disqualifiers but not `bestFor`/`poorFor`/`requiredAssets`/`performanceCost`/`seoRisk`/`maxFrequency`, so selection cannot be mechanical. | `design_library.md` INDEX columns |
| G6 | **No element-selection gates.** The spec's 6 gates (business relevance, content readiness, inclusive equivalence, performance budget, mobile integrity, frequency) exist nowhere. Frequency/duplication control is entirely absent. | grep: no occurrence |
| G7 | **No quality score.** Gates are binary pass/fail. There is no 25-criterion weighted score and no four-level classification, so "professionally designed" is unmeasurable. | `qa_evidence_gate.md` is checkbox-only |
| G8 | **No refinement loop.** A failure routes to "back to Phase 4" for a human. Nothing computes *which* remediation to apply. | `qa_evidence_gate.md` GATE 5 VERDICT |
| G9 | **No content-confidence model.** Truth is binary (`app_reality.md` allows or forbids). The spec's 5 levels, per-level publication policy, and 15-row asset replacement table are absent. | `app_reality_TEMPLATE.md` |
| G10 | **Capability-blind responsive model.** `responsive_matrix.md` covers viewport × engine. Pointer/hover/reduced-data/forced-colors/safe-area/foldable/keyboard-visible/container-size are not decision inputs, and no component transformation vocabulary exists. | `responsive_matrix.md` TIER 1–3 |
| G11 | **No route performance budget.** Weight budgets are per-asset (`<150KB hero`). No route JS budget, so `stack_doctrine.md`'s dependency gate has no number to check a delta against. | `qa_evidence_gate.md` §3 |
| G12 | **No 3D/WebGL/cursor policy.** `animation_library.md` covers animation only. Spatial interaction is ungoverned. | grep: WebGL absent from all workflow files |
| G13 | **No implementation contract.** Nothing hands a generator a typed, complete build specification. | — |

### A.4 Genuine conflicts found (not gaps — disagreements)

| # | Conflict | Resolution |
|---|---|---|
| C1 | **Implementation language.** §28 mandates TypeScript + strong typing. The owner's sibling framework (`Custom-Web-App-Development-Framework` v2.10.0) is deliberately plain Node ESM `.mjs` with no build step. | **Follow §28: TypeScript.** This repo has no Node convention of its own to preserve, and §28's requirements (deterministic rule evaluation, pure scoring functions, schema validation, explicit contracts, testable decision logic) are the whole point of the deliverable — an untyped rule corpus of 120 rules is not auditable. Divergence from the sibling is recorded in §F1. |
| C2 | **Breakpoint baseline.** `website_flow.md` Phase 2 says "mobile-first: 360px, 768px, 1024px, 1440px". `responsive_matrix.md` already states the opposite — "the old 360x800 baseline matches no real device — real narrowest is 320". Spec §F.3 mandates 320px and 400% zoom. | Existing `responsive_matrix.md` and the spec agree; **Phase 2's 360 line is stale** and is corrected to cite `responsive_matrix.md` rather than restate numbers. A pre-existing internal inconsistency surfaced by this comparison. |
| C3 | **Contrast strictness.** Spec §G requires WCAG 2.2 AA. `theme_system.md` requires that *plus* logo contrast in every theme with worst-pair governing — which WCAG explicitly exempts. | **Existing wins** (stricter). The engine encodes AA as the floor and carries the logo rule as an additional hard gate. Never weaken an evidence requirement to make passing easier (`framework_update.md` step 3). |
| C4 | **PWA.** §24 makes PWA a first-class architectural constraint when it is a product requirement. `stack_doctrine.md` makes PWA default-deny pending owner approval. | **No real conflict** — both require PWA to be a stated requirement. §24 becomes the deterministic stack-selection rule; `stack_doctrine.md` remains its prose gate. |
| C5 | **Rule schema drift inside the spec itself.** §3 defines the canonical keys (`if/then/unless/prefer/avoid/fallback/rationale/source_urls/confidence/approval_required`), but rule bodies also use `otherwise`, `require`, `allow =`, and `+=` mutation (DD-002, DD-114, DD-115). | Schema extended with optional `otherwise` and `require`; `allow =` normalised to `then`; `+=` modelled as an explicit append effect. Recorded in §F2. |
| C6 | **Two rule-ID namespaces.** Spec uses `DD-xxx`. The repo uses `RF-xxx` (responsive failures), `DP-xxx` (degraded paths), `Q-xxx` (interrogation), `REF/ALT/IDEA-xxx` (patterns). | Namespaces are **disjoint in kind** and all retained. `DD-xxx` = business→design decisions. Cross-references allowed; no renumbering. |

---

## B. TARGET ARCHITECTURE

### B.1 The consolidating idea

The two frameworks answer different questions and must not be merged into
one:

- `website_workflow/**` answers **"may this change ship?"** — a gated,
  human-approved process over an existing site.
- `src/**` (new) answers **"what should this website be?"** — a
  deterministic function from business facts to a design specification.

They join at exactly two seams:

1. The engine's `DesignDecisionOutput` + `ImplementationContract` become the
   input to `website_flow.md` **Phase 2** (design & plan), replacing an
   improvised plan with a generated, explainable one.
2. The engine's quality gates and the `qa_evidence_gate.md` checklist read
   **the same threshold constants**, exported from code. A threshold defined
   twice will drift; this is the `color_system.md` lesson (four plausible
   homes for a brand colour, none canonical) applied to numbers.

### B.2 Pipeline (spec §3), as modules

```
BusinessInput                     src/design-intelligence/input/
   → DesignContextProfile         src/design-intelligence/profile/
   → IndustryBaseline             src/design-intelligence/baseline/
   → BusinessOverrides            src/design-intelligence/overrides/
   → DecisionEngine               src/design-intelligence/engine/
   → DecisionRecord[]             src/design-intelligence/record/
   → DesignDecisionOutput         src/design-intelligence/output/
   → PageSpec / ComponentSpec     src/generation/
   → ResponsiveTransform          src/responsive/
   → Content + Asset validation   src/content/
   → A11y / SEO / Perf validation src/accessibility/ src/seo/ src/performance/
   → QualityEvaluation            src/quality/
   → Refinement                   src/quality/refinement/
   → ProductionGate               src/quality/gates/
   → ImplementationContract       src/generation/contract/
```

Decision-making is separated from implementation: nothing under
`src/generation/` may select a pattern; it consumes `DesignDecisionOutput`.
This is spec §23, enforced by a test.

### B.3 Determinism boundary (spec §29)

| Deterministic code owns | LLM may own |
|---|---|
| Rule evaluation, scoring, thresholds, quality gates, performance budgets, accessibility gates, publication safety, stack selection, frequency caps, responsive transformation | Business interpretation, semantic classification of free text, draft copy, candidate pattern *proposals*, rationale prose |

An LLM-proposed candidate enters the engine as a *candidate only* and is
scored by the same deterministic gates as any registry pattern. No LLM call
sits inside a gate.

### B.4 Directory layout

Adapted from spec §26 to this repo. `docs/` sits at the root alongside the
existing `website_workflow/`; the markdown framework is not moved.

```
docs/                     specs (7 files per §26) + this assessment
src/
  design-intelligence/    types, profile derivation, rules, engine, scoring
  design-system/          tokens, patterns, pattern-registry
  responsive/             capabilities, context, transformations
  content/                confidence, provenance, asset-policy, verification
  quality/                scoring, gates, validators, refinement
  seo/                    strategy, metadata, structured-data
  performance/            budgets, measurement, enhancement-policy
  accessibility/          rules, validators
  generation/             page-spec, component-generation, contract
  stack/                  technology selection (§17/§24)
tests/                    mirrors src/, plus tests/scenarios/ for §27
```

### B.5 Toolchain

TypeScript (strict) · `tsc --noEmit` typecheck · Vitest · Zod for runtime
input validation. Four dev dependencies, no bundler, no framework — the
engine is a pure library. `zod` is the only runtime dependency and is
already the framework's chosen validator (`stack_doctrine.md` L4), so it
introduces no new decision.

---

## C. GAP ANALYSIS SUMMARY

| Spec section | Status | Closed by |
|---|---|---|
| §4 Design Context Profile | **G2** absent | `src/design-intelligence/profile/` |
| §5 Industry as prior | **G4** absent | `src/design-intelligence/baseline/` |
| §6 Decision Decision Record | **G1** absent | `src/design-intelligence/record/` |
| §7 Element Selection Engine (6 gates) | **G6** absent | `src/design-system/pattern-registry/` + engine gates |
| §8 Element scoring | **G6** absent | `src/design-intelligence/scoring/` |
| §9 Hard design gates | partial (motion/contrast only) | `src/accessibility/rules/` |
| §10 Progressive enhancement | partial (reduced-motion only) | `src/design-system/patterns/` escalation ladder |
| §11 Responsive engine | **G10** viewport-only today | `src/responsive/` |
| §12 Content integrity | **G9** binary today | `src/content/` |
| §13 Image strategy | partial (`image_prompts.md` covers generation, not strategy) | `src/content/asset-policy/` |
| §14 Premium interaction policy | **G12** 3D/cursor ungoverned | pattern registry metadata + gates |
| §15 Performance policy | **G11** no route budget | `src/performance/budgets/` |
| §16 SEO architecture | present as a checklist (`stack_doctrine.md`) | `src/seo/` makes it computable |
| §17/§24 Stack decision | present as prose (`stack_doctrine.md`) | `src/stack/` makes it deterministic |
| §18 DesignDecisionOutput | **G3** absent | `src/design-intelligence/output/` |
| §19 Quality engine (25 criteria) | **G7** absent | `src/quality/scoring/` |
| §20 Refinement loop | **G8** absent | `src/quality/refinement/` |
| §21 Design system architecture | partial (53 entries, no metadata) | `src/design-system/` |
| §22 Token system | **strongest existing asset** (`generate_palette.py`) | reused, not rebuilt |
| §23 Page generation | absent | `src/generation/` |
| §27 Tests | absent | `tests/` |
| §31 Implementation contract | **G13** absent | `src/generation/contract/` |

---

## D. IMPLEMENTATION PLAN

Incremental, tests alongside each step (§34.9). Each step leaves the repo
typechecking and green.

| Step | Deliverable | Gate |
|---|---|---|
| 1 | Toolchain: `package.json`, `tsconfig.json`, Vitest, `.gitignore` | `npm run typecheck` passes on empty src |
| 2 | This assessment + the 7 `docs/` specs | — |
| 3 | Core types: `BusinessInput`, `DesignContextProfile`, `DesignDecisionOutput`, `DecisionRecord`, `Rule` + Zod schemas | typecheck; schema round-trip tests |
| 4 | Rule DSL + deterministic evaluator (`if/then/unless/prefer/avoid/fallback/otherwise/require`) | evaluator unit tests incl. `unless` precedence |
| 5 | Profile derivation: `BusinessInput` → 16 normalised variables | table-driven tests from §1.3 |
| 6 | Industry baseline (appendix B, 14 groups) + business override layer | override-beats-baseline tests |
| 7 | Rule registry: the 120 `DD-xxx` rules as data | coverage test: every rule ID present, well-formed, source-cited |
| 8 | Pattern registry (appendix A) with full metadata | frequency-cap + `poorFor` rejection tests |
| 9 | Element selection engine: 6 gates + weighted scoring → select/select_with_fallback/defer/replace/reject | §27 interaction tests |
| 10 | Content integrity: 5 confidence levels + 15-row replacement policy, publication-blocking | §27 content tests (never fabricate) |
| 11 | Responsive engine: capability context + 11 transformations | §27 responsive tests |
| 12 | Performance budgets by archetype + automatic downgrade | §27 performance tests (downgrade, not report) |
| 13 | Accessibility hard gates (§G.1) + SEO strategy (§I) | hard-failure tests |
| 14 | Quality scoring (25 criteria, weights) + 4-level classification | boundary tests at 75/82/90 |
| 15 | Refinement loop: weakness → remediation → re-evaluate | loop-terminates + improves tests |
| 16 | Stack selection (§17/§24) | SEO-heavy+no-PWA → Next.js; PWA → constraint enabled |
| 17 | Implementation contract assembly | completeness test |
| 18 | Minimal synthetic fixture proving end-to-end (§25.12) | scenario tests |
| 19 | Wire into `website_workflow/`: Phase 2 consumes the contract; thresholds single-sourced | `audit_framework.py` PASS |

### D.1 Ordering constraint

Step 19 is last on purpose. The markdown framework must not be edited until
the code it will cite actually exists and passes — otherwise the workflow
gains a citation to a file that does not work, which is the exact failure
`skills_map.md` already records twice (a mapped skill whose file never
loaded; a gate citing a script that was never authored).

---

## E. FILE-BY-FILE CHANGE PLAN

### E.1 New files (no existing file is overwritten)

All of `docs/**`, `src/**`, `tests/**`, plus root `package.json`,
`tsconfig.json`, `vitest.config.ts`.

### E.2 Existing files modified — and only these

| File | Change | Why |
|---|---|---|
| `.gitignore` | add `node_modules/`, `dist/`, `coverage/`, `.vitest/` | new toolchain |
| `README.md` | Files table row for `docs/` + `src/`; rule for threshold single-sourcing; Update log entry; LAST UPDATED | README rule 7 |
| `website_workflow/website_flow.md` | Phase 2 consumes `ImplementationContract` when one exists; correct the stale `360px` to cite `responsive_matrix.md` (C2) | G2 seam, C2 |
| `website_workflow/checklists/qa_evidence_gate.md` | cite exported threshold constants instead of restating numbers | prevent drift |
| `website_workflow/stack_doctrine.md` | cross-reference `src/stack/` as the deterministic form of its prose gate | C4 |
| `website_workflow/tools/audit_framework.py` | extend to check `docs/`+`src/` cross-references and rule-ID coverage | keep the self-audit honest about the new surface |

### E.3 Explicitly NOT changed

- `color_system.md` / `generate_palette.py` / `theme_system.md` — already
  satisfy §22 more concretely than the spec asks. Reused by reference.
- `design_library.md` 53 entries — kept as the human-facing library;
  pattern *metadata* is added in the code registry, cross-referenced by ID,
  not by rewriting 64KB of prose.
- `decisions_log.md` — stays empty in the master by design.
- All 55 `.claude/skills/` — untouched.

---

## F. DECISIONS MADE WHERE THE SPEC IS SILENT

Recorded per §34. Each states the decision, reason, alternatives, impact,
and whether it should become a configurable rule.

**F1 — Implementation language: TypeScript, diverging from the sibling
framework's `.mjs` convention.**
Reason: §28 requires strong typing and auditable contracts; 120 rules and a
25-criterion scoring model are not safely maintainable untyped. Alternatives
considered: (a) `.mjs` + JSDoc + `.d.ts` — matches the sibling, loses real
static checking on rule shapes; (b) `.ts` executed via Node 22 type
stripping — unavailable, Node here is v20.20.1. Impact: adds 4 dev
dependencies and a typecheck step; no bundler. Configurable: no —
architectural.

**F2 — Rule schema extended with `otherwise` and `require`; `allow =`
normalised to `then`; `+=` modelled as an explicit append effect.**
Reason: the spec's own rule bodies use keys its §3 schema omits (C5).
Alternatives: rewrite the offending rules to fit §3 (loses author intent) or
accept free-form keys (defeats validation). Impact: schema is a superset of
§3; every rule validates. Configurable: no — schema.

**F3 — Threshold constants are exported from code and cited by the markdown
framework, rather than written in both.**
Reason: `color_system.md`'s recorded root cause was a value with four
plausible homes and none canonical. Same failure class. Alternatives:
duplicate and rely on review (already proven to drift). Impact: markdown
gains citations; numbers live once. Configurable: yes — budgets and
thresholds are config, per-project.

**F4 — Where the existing framework is stricter than the spec, the existing
rule wins and the engine encodes the stricter value.**
Reason: `framework_update.md` step 3 forbids weakening an evidence
requirement. Applies to C3 (logo contrast) and to per-asset weight budgets.
Alternatives: spec-literal (weakens live rules). Impact: the engine's floor
is above WCAG AA in two places, documented at each. Configurable: no.

**F5 — Fixtures are transparently synthetic.**
Reason: §25 forbids inventing a business to demonstrate the system, and §12
forbids fabricated business facts. Alternatives: a realistic-looking sample
company (indistinguishable from fabricated proof once committed). Impact:
fixture names are visibly non-real and carry a header saying so.
Configurable: no.

**F6 — Quality criterion scores are supplied by validators where mechanically
derivable, and are otherwise `unscored`, never defaulted.**
Reason: §19 lists 25 criteria, of which accessibility, performance, SEO,
responsive and technical are machine-measurable while emotional impact and
memorability are not. Defaulting an unmeasurable criterion to a passing
number would manufacture a quality claim — the same class as fabricated
proof. Alternatives: default to 5 (silently inflates or deflates the
weighted score); require a human score for all 25 (blocks automation
entirely). Impact: the weighted score is computed over scored criteria only,
and the classification refuses to award a level whose required criteria are
unscored — an honest "cannot classify" instead of a fake pass. Configurable:
yes — which criteria require human review is config.
