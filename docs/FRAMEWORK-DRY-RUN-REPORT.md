# Framework Dry Run Report

Executed 2026-09-13 against the repository at HEAD + uncommitted working tree.
Harness: `tests/dry-run/execute.test.ts` (runs the real `runPipeline()`).
Fixture: `tests/fixtures/dry-run-fixture.ts`.
Raw artifacts: `%TEMP%/claude/c--Explorations-Website-development-framework/dry-run/*.json`
(00-digest.json through 10-rule-coverage.json).

Nothing in this report was filled in by hand after the run. Where a phase
produced nothing, it is recorded as producing nothing.

---

## 1. Fixture

`FIXTURE-VERDALEEN-MOBILITY` — a clinic that assesses patients and manufactures
custom-fitted orthotics and mobility aids, and also sells a small range of
off-the-shelf supports to patients and to referring clinicians.

Chosen to be awkward rather than flattering. Seven deliberate tensions:

| # | Tension | Why it stresses the framework |
|---|---|---|
| 1 | High trust **and** genuine commerce | `healthcare` caps expression low; `sell_products` wants product discovery |
| 2 | A **legitimate** 3D case inside a prohibited industry | A custom-fitted device is exactly appendix A's "spatial inspection improves the decision"; `3d-product-view` lists healthcare in `poorFor`; `product_configurator` is a stated requirement |
| 3 | Accessibility **above** AA | `wcag_aaa_or_equivalent` stated; dexterity-impaired users, 400% magnification, vestibular sensitivity |
| 4 | Two opposed audiences | Patients (low literacy, 71% mobile, assistive tech) vs referring clinicians (high literacy, desktop, dense clinical detail) |
| 5 | Missing proof, on purpose | No testimonials, awards, certifications, pricing, team info, case studies, statistics; contact details `provided_unverified` — while the primary objective is booking |
| 6 | Multilingual + CMS + map | Three architecture-touching requirements |
| 7 | `premium` personality on a clinical business | Can stated brand expression buy past a trust cap? |

Supplied: 5 required pages, 9 required functionality items, 6 offers (3
regulated), 2 integrations, 2 locales, `seoDependency: high`,
`performanceSensitivity: high`, `regulationRisk: high`, **no**
`maxVisualExpression` (the engine must derive restraint itself), **no** PWA.

---

## 2. Pipeline Execution

### Business input → context interpretation
Parsed and validated by the Zod contract. No coercion, no defaulted business
fact.

### Design Context Profile (16 variables)
```
trust_requirement            very_high     emotional_intensity      low
information_density          medium        visual_asset_quality     medium
product_service_complexity   medium        purchase_cycle           regulated
seo_dependency               high          performance_sensitivity  high
accessibility_requirement    wcag_aaa_or_equivalent
mobile_share                 high          technical_complexity_budget medium
brand_expression_need        high          content_confidence       verification_required
commerce_depth               medium        audience_digital_literacy low
regulation_risk              high
```
Provenance: **8 stated, 1 industry_prior, 7 inferred, 0 default.** Every
variable carries evidence.

Correct derivations worth noting: `emotional_intensity` came out **low** despite
`premium` + `warm_human` being stated — the trust cap held, so stated brand
expression could not buy intensity. `purchase_cycle` came out **regulated**, not
"long". `audience_digital_literacy` came out **low** — the weaker audience
governed.

### Industry baseline / overrides
`high_trust_service_clarity`, expression `low`, motion `minimal`, prohibited:
`kinetic_type`, `autoplay_video`, `cursor_effects`. Final `visualExpression`
resolved to **low** (baseline low, no rule raised it, no owner ceiling needed).

### Design decisions (rule evaluation)
21 of 35 rules applied: DD-006, DD-014, DD-019, DD-020, DD-021, DD-047, DD-053,
DD-065, DD-066, DD-068, DD-079, DD-082, DD-084, DD-086, DD-091, DD-094, DD-097,
DD-098, DD-107, DD-113, DD-114.

1 rule **blocked**: `DD-059 (3D eligibility)` by
`variables.performance_sensitivity` — its fallback obligation was recorded.

1 **conflict reported**: `imagery.strategy` — DD-014 says
`high_quality_or_none`, DD-097 says `authentic_imagery_used_strategically`.
Surfaced, not silently resolved.

`designPersonality`: "clear, calm, qualified". `layoutStrategy.composition`:
`editorial_or_material_led` (from DD-014).

### Element selection
Outcomes over 21 patterns: **4 select, 1 select_with_fallback, 3 defer, 13 reject.**

Selected: `structured-content-rail`, `split-hero`, `sticky-narrative`,
`timeline`, `faq-accordion`.

Every rejection carried a reason. The honest ones:
- `cursor-follower`, `hover-only-product-info`, `decorative-webgl-hero`,
  `auto-rotating-carousel` — forbidden by rule or baseline. **Correct.**
- `before-after`, `editorial-grid` — deferred, missing `case_studies` /
  `portfolioImages`. **Correct: defer, not reject.**
- `modular-feature-grid` — deferred at the 5-element cap, recorded honestly.

The troubling ones (see §4 and §5):
- `data-diagram` — rejected because *"implementation tier `svg` exceeds the low
  expression ceiling"*.
- `interactive-gallery` — rejected on the same tier rule.
- `3d-product-view` — rejected because *"appendix A marks this pattern poor for
  healthcare"*, while the stack simultaneously added `three` and
  `@react-three/fiber`.

### Stack decision
```
framework  nextjs          rendering  hybrid          pwa  false
recordedRule  "DD-STACK: seo_dependency == high AND pwa_requirement == false
               → Next.js primary (§24)"
libraries  @react-three/fiber, headless CMS client, lazy-loaded map embed,
           next-intl, react-hook-form, three, zod
constraints  PWA/service workers/offline/app-shell DENIED (not requested)
             CMS requested: LAST rung of the content ladder, needs a named editor
```

### SEO plan
Rendering constraint: all public content server-rendered; no primary content
after hydration; no canvas-only text.
Allowed schema: `FAQPage`, `Article`, `Organization`, `Service`,
`BreadcrumbList`.
**Withheld**: `LocalBusiness` (missing addresses), `Product` (missing pricing),
`Review` and `AggregateRating` (missing reviews). Correct refusal.
`pageArchitecture`: `["service", "process", "faq"]`.

### Responsive decisions
160 decisions across 10 hand-authored components × 16 mandatory profiles.
Transformations: reflow 53, condense 31, replace 30, remain 30, expand 10,
staticize 2, simplify 2, hide 2. **0 refusals**, `coreContentPreserved: true`.
`hide` fired only on `ambient-hero-texture` (forced-colors) and
`sticky-book-cta` (software keyboard) — both legitimate.

### Content / asset decisions
Rendered: `product_screenshots`, `proposition`, `services`, `process`, `faq`,
`legal_policies`.
Hidden with a non-fabricated substitute or omission: testimonials, reviews,
customer_logos, awards, certifications, statistics, case_studies, pricing,
team_members, biographies, addresses, portfolio_work.
Requests generated for all 12.
**Blocked conversion path: `book_appointments (needs verified: addresses)`** —
the primary objective, correctly blocked.

### Performance decisions
Budget 150KB (regulated archetype). initialKb **0**, finalKb **0**, within
budget. All five selected patterns are 0KB CSS/HTML patterns, so the budget
check was **vacuous on this run**.

### Quality decisions
**None. The pipeline does not invoke the quality engine.** Asserted by the
harness: `output.qualityEvaluation`, `accessibilityFindings`, `refinement`,
`pageSpecs` and `tokens` are all `undefined`.

### Final decision output
`DesignDecisionOutput` + `ImplementationContract` produced. Publication
requirements (5): the DD-098 obligation, the unverified `addresses` claim, the
blocked conversion path, "a blocked conversion path must be resolved or the
objective removed before launch", and "unresolved rule conflicts:
imagery.strategy".

---

## 3. Decision Coverage

| Domain | Status | Current mechanism | Evidence | Gap |
|---|---|---|---|---|
| Architecture | PARTIALLY GOVERNED | `selectStack` sets rendering strategy + constraint list | `rendering: hybrid`, 2 constraints emitted | No route-level architecture, no server/client component map, no page tree |
| Technology stack | GOVERNED | `src/stack/select-stack.ts`; §24 branch recorded as `recordedRule` | `DD-STACK: ... → Next.js primary (§24)`; PWA denied with reason | Libraries not cross-checked against selected patterns (§5 EG-1) |
| Industry / design direction | GOVERNED | appendix B baseline + DD-001..DD-018 | `high_trust_service_clarity`, expression `low`, personality "clear, calm, qualified" | — |
| Information architecture | **MISSING** | none | `requiredPages` (5 supplied) read only to count density — `derive-profile.ts:186`; `sectionArchitecture` never mentions the supplied pages | No IA derivation, no page tree, no internal-link graph, no nav model |
| Layout | PARTIALLY GOVERNED | rule effects `layout.system` / `layout.composition` | `editorial_or_material_led` | `domainsUncovered: ["layout", "stack"]` — zero rules in the `layout` domain; grid/container/reading-rail only as loose strings |
| Components | PARTIALLY GOVERNED | pattern registry + 6 gates | 21 patterns evaluated, every outcome explained | No component *tree*; `ComponentDescriptor[]` for the responsive audit is hand-authored (§4 MJ-1) |
| Hero | PARTIALLY GOVERNED | `hero.pattern` rule effect + `split-hero` pattern | DD-006 fired but sets no `hero.pattern`; `split-hero` selected | Healthcare has no hero rule, so the hero came from pattern selection, not from a hero decision |
| Typography | DOCUMENTATION ONLY | DD-021 sets `typography.scale` + `readingMeasure` | `readingMeasure: 60-75ch` in output | No type scale, no font pairing, no font loading decision, nothing measurable |
| Color | DOCUMENTATION ONLY | DD-019/DD-020 set `color.tokenSystem` + `contrastFloor` | strings only | `tools/generate_palette.py` is Python and unreachable from the TS pipeline; no tokens produced, no measured contrast |
| Grid | MANUAL JUDGMENT | none | no grid field in output | Not modelled at all |
| Imagery / assets | GOVERNED | `imageStrategyFor` + J.2 policy | `authentic_selective` for `visual_asset_quality: medium` | Output value ignores the *reported rule conflict* on the same target (§5 EG-2) |
| Interaction | GOVERNED | gates + DD-053/DD-068/DD-113 | `hover-only-product-info` and `auto-rotating-carousel` rejected by name | — |
| Motion | GOVERNED | baseline `motionCap` + DD-047 | `motionCap: minimal`; reduced-motion obligations recorded | Motion cap is not enforced against selected patterns' `animated` flags |
| 3D / WebGL | PARTIALLY GOVERNED | DD-059, DD-082, `poorFor`, tier ceiling | `3d-product-view` rejected; DD-059 blocked; `decorative-webgl-hero` rejected | Cannot distinguish load-bearing 3D from decorative 3D (§4 MJ-2, P0) |
| Cursor behavior | GOVERNED | DD-053 + `cursor-follower` registered so it can be rejected | "forbidden for this business by an applied rule" | — |
| Responsive behavior | GOVERNED | 16 capability profiles × transformation engine | 160 decisions, `coreContentPreserved: true`, `hide` refused on essentials | Audit input is hand-authored, and components are not reconciled with selected patterns |
| Accessibility | PARTIALLY GOVERNED | `checkHardFailures` exists and is tested | **not called by the pipeline**; only `ACCESSIBILITY_BASELINE` (a constant) is imported | `wcag_aaa_or_equivalent` is carried and never used — `CONTRAST_THRESHOLDS` are AA-only |
| Content integrity | GOVERNED | `verifyContent` + J.1/J.2 | 12 claims hidden, 12 requests raised, primary objective blocked | Strongest subsystem on this run |
| SEO | PARTIALLY GOVERNED | `buildSeoStrategy` | schema correctly withheld ×4; rendering constraint emitted | Produces *rules*, not *artifacts*: no title, description, canonical, robots, sitemap, OG values (§6) |
| Performance | PARTIALLY GOVERNED | `budgetForArchetype` + `enforceBudget` | 150KB budget assigned; plan within budget | Budget was **vacuous** (0KB in, 0KB out); no measured build evidence |
| Quality | **MISSING from the pipeline** | `src/quality/scoring.ts` + `refinement.ts` exist, 27 tests pass | `grep` finds no caller outside `src/quality/`; `output.qualityEvaluation === undefined` | Implemented, tested, unwired |
| QA / evidence | DOCUMENTATION ONLY | 8 `Q-*` checks in markdown | all 8 defined and referenced in `qa_evidence_gate.md` | None executable; `audit_framework.py` has **0** `Q-` references (§7) |
| Production readiness | PARTIALLY GOVERNED | `publicationRequirements` (5 emitted) | blocked path + unresolved conflict both surfaced | Nothing computes §L's six gate groups, so nothing can actually *block* |

Tally: **GOVERNED 8 · PARTIALLY GOVERNED 9 · DOCUMENTATION ONLY 3 · MANUAL
JUDGMENT 1 · MISSING 2.**

---

## 4. Manual Judgment Points

Every decision I had to make that the framework does not govern.

### MJ-1 — The component list for the responsive audit
- **Decision**: authored 10 `ComponentDescriptor`s by hand, including each one's
  `criticality`, `kind`, `hoverDependent`, `animated` and `weightKb`.
- **Why necessary**: `runPipeline` accepts `options.components` and derives
  nothing. With no components the responsive audit returns zero decisions, so
  the entire responsive subsystem would have reported success by doing nothing.
- **Information available**: the selected patterns, the section architecture and
  the required pages — all machine-readable.
- **Why the system could not decide it**: no module maps a selected pattern or a
  section to the components that implement it.
- **Should be**: **deterministic rule** (pattern → component descriptors), plus a
  **validation gate** that fails when the audit runs over an empty component set.

### MJ-2 — Whether this business's 3D is load-bearing or decorative
- **Decision**: I judged a custom-fitted orthotic to be a genuine
  spatial-inspection case, which the engine rejected.
- **Why necessary**: the fixture states `product_configurator` as a requirement;
  the engine rejected `3d-product-view` on `poorFor: healthcare` while the stack
  added `three` + `@react-three/fiber`. Something had to reconcile them.
- **Information available**: `product_configurator` in `requiredFunctionality`,
  3 regulated custom-fitted products, verified product imagery.
- **Why the system could not decide it**: `poorFor` is a flat industry list with
  no exception path, and nothing reads `requiredFunctionality` when selecting
  patterns. Appendix A endorses 3D "when spatial inspection improves the
  decision" — a *use-case* test the registry cannot express.
- **Should be**: **pattern registry** change (an `unlockedBy` requirement
  condition on `poorFor`) plus a **scoring system** input, not a hard flat
  exclusion. A CONDITIONAL outcome with owner approval is the right shape.

### MJ-3 — What serves the `sell_products` objective
- **Decision**: I noted, but could not resolve, that no selected pattern and no
  section serves selling.
- **Why necessary**: `sell_products` is a stated objective; `commerce_depth`
  derived as `medium`; product imagery is verified and renderable — yet
  `sectionArchitecture` contains no catalog, no price, no returns, and
  `interactive-gallery` was rejected.
- **Information available**: the objective list, `commerce_depth`, verified
  `productImages`.
- **Why the system could not decide it**: DD-007 (ecommerce) keys on `industry`,
  not on objective or `commerce_depth`, so a commerce objective inside a
  non-commerce industry produces no commerce architecture. Nothing verifies that
  each objective has supporting architecture.
- **Should be**: **validation gate** (every objective must trace to ≥1 section or
  pattern, or be explicitly dropped) plus **deterministic rules** keyed on
  `commerce_depth` rather than industry alone.

### MJ-4 — The second audience
- **Decision**: I accepted that the referring-clinician audience disappears from
  the output.
- **Why necessary**: two audiences were supplied; the profile collapses them to
  one `audience_digital_literacy: low`.
- **Information available**: both audience records, with roles, literacy, mobile
  share and usage context.
- **Why the system could not decide it**: the profile has no per-audience
  structure, and there is no page- or section-level audience assignment. The
  "lowest literacy governs" rule is right for accessibility and wrong as the
  *only* representation of a two-audience business.
- **Should be**: **AI reasoning** for segment interpretation, feeding a
  **deterministic** per-page audience assignment; the supplied
  `/for-clinicians` page is the obvious anchor.

### MJ-5 — Which SEO artifact values to use
- **Decision**: I did not invent titles, descriptions or canonicals.
- **Why necessary**: the strategy emits rules ("title unique per page") but no
  values, so a generator would have to invent them.
- **Information available**: 5 required pages with a stated `purpose` each.
- **Why the system could not decide it**: no per-page metadata model exists.
- **Should be**: **AI reasoning** (draft copy) behind a **validation gate**
  (uniqueness, length, one H1, canonical shape) with **human approval** — title
  and description are public claims about the business.

### MJ-6 — Interpreting `wcag_aaa_or_equivalent`
- **Decision**: I treated it as unenforced.
- **Why necessary**: the variable is carried into
  `accessibilityStrategy.target`, but `CONTRAST_THRESHOLDS` encodes AA only.
- **Information available**: the stated requirement and three accessibility
  context notes naming dexterity, 400% magnification and vestibular sensitivity.
- **Why the system could not decide it**: no threshold table is keyed by
  accessibility level; nothing maps a stated context note to a constraint.
- **Should be**: **deterministic rule** (thresholds keyed by level: 7:1 body /
  4.5:1 large at AAA) plus a **validation gate**.

### MJ-7 — Multilingual and CMS governance
- **Decision**: I accepted `next-intl` and "headless CMS client" entering the
  library list with no further governance.
- **Why necessary**: both were stated requirements.
- **Information available**: 2 locales; `cms_editing` requested.
- **Why the system could not decide it**: no hreflang/locale-routing model, and
  the CMS constraint is a sentence rather than a gate — nothing checks that the
  "named non-technical editor" exists.
- **Should be**: **deterministic rules** for hreflang/locale routing; **human
  approval** for the CMS editor claim.

---

## 5. Enforcement Gaps

Things the framework says must happen that it currently cannot prevent being
omitted.

**EG-1 — Stack libraries are not reconciled with pattern selection.**
The run added `three` and `@react-three/fiber` while `3d-product-view` was
rejected. `selectStack` reads `requiredFunctionality`; selection reads the
pattern registry; nothing compares them. A dependency can therefore enter the
contract for a pattern the engine refused — the exact "unnecessary dependency"
§17 forbids, produced *by* the framework.

**EG-2 — A reported rule conflict does not block, and the conflicting target is
not even used.**
`imagery.strategy` had two rule values (DD-014, DD-097). The conflict is
reported and reaches `publicationRequirements`, but `output.imageStrategy` is
computed independently by `imageStrategyFor(visual_asset_quality)` and returned
`authentic_selective` — a **third** value neither rule chose. The conflict is
cosmetic: nothing consumes the contested field.

**EG-3 — The quality engine, refinement loop and accessibility validators are
unwired.**
`grep` finds no caller of `evaluateQuality`, `refine`, `checkHardFailures`,
`accessibilityScore` or `seoScore` outside their own modules. §19's "a critical
gate failure prevents production" cannot fire, because nothing computes the
gates during a pipeline run.

**EG-4 — §L's six gate groups are never computed.**
`GateStatus` is a type the tests construct by hand. No module derives
`technical / accessibility / responsive / performance / content / design` from a
real artifact, so "production ready" is unreachable by evidence.

**EG-5 — Objective coverage is unchecked.**
`sell_products`, `build_credibility` and `educate` produced no dedicated
section. Nothing asserts that an objective is served.

**EG-6 — `requiredPages` is accepted and ignored.**
Five pages with stated purposes were supplied. The only read is
`requiredPages.length` for density (`derive-profile.ts:186`). `pageArchitecture`
returned `["service","process","faq"]`, which matches none of them. An input the
contract invites is silently discarded.

**EG-7 — The named `Q-*` checks are not demanded at Phase 1.**
`Q-STACK-DISCIPLINE` and `Q-SEO-ARTIFACTS` each say "at Phase 1 against the
plan, again at Phase 5 against the build", but Phase 1's output spec demands
verdicts only for "each of the 10 questions" plus the LIBRARY SCREEN block. Only
Phase 5 names them (added this session). Six other `Q-*` checks have the same
asymmetry.

**EG-8 — Nothing mechanically checks that a `Q-*` check is wired.**
`audit_framework.py` contains zero `Q-` references. A new check can be written
and never invoked, which is the orphan class the audit tool exists to catch.

**EG-9 — The section-architecture vocabulary is not canonical.**
Output contained `location_contact` **and** `location_and_contact`, plus
`clear_language` **and** `plain_language_summary` — baseline strings and rule
strings for the same concepts, de-duplicated by `Set` and therefore not
de-duplicated at all.

**EG-10 — The motion cap is not enforced against selected components.**
`motionCap: minimal` was decided, and three hand-authored components declare
`animated: true`. Nothing compares them.

**EG-11 — `loading` classification is mechanical nonsense at the low end.**
All five selected patterns are 0KB CSS/HTML and every one was labelled
`deferred` in the contract, because the rule is `>=30KB ? on_demand : deferred`.
A CSS-only rail cannot be "deferred".

---

## 6. Evidence Gaps

Things claimed as validated with no executable or measurable evidence.

| Claim | Why it is not evidence |
|---|---|
| SEO "governed" | The pipeline emits rules and an allow/withhold schema list. It produced **no** title, meta description, canonical, robots directive, sitemap entry, OG or Twitter metadata. Per the brief's §6 test: title ✗, description ✗, canonical ✗, robots ✗, sitemap ✗, OG ✗, Twitter ✗, structured data ✓ (types only, correctly withheld), semantic/indexable content ✓ (as a *constraint* string), content in served HTML ✗ (nothing renders), crawlable without JS ✗ (nothing to fetch). |
| Performance "within budget" | initialKb 0 → finalKb 0. No build ran, no bundle measured. `enforceBudget` is well tested in isolation but was exercised vacuously here. |
| Accessibility "AAA" | Stated, carried, and never applied. Thresholds remain AA. No validator ran. |
| Quality level | Not computed at all. |
| Responsive "core content preserved" | True, but over a **hand-authored** component list. The audit cannot fail if its input is written by the person reading the result. |
| Contrast | `CONTRAST_THRESHOLDS` exist; no colour values were produced, so nothing was measured. `generate_palette.py` is unreachable from the TS pipeline. |
| The 8 `Q-*` checks | Prose requiring human judgment. Zero executable. |

---

## 7. Rule Coverage

**35 of 120 encoded**, verified against the specification's own headings.
`domainsCovered`: a11y, content, direction, interaction, motion, performance,
quality, responsive, seo, typography. `domainsUncovered`: **layout, stack** (2,
not the 3 I reported previously — `quality` is covered by DD-107; that earlier
statement was wrong).

Of the 85 pending, **not all need encoding**. Grouped by what the pipeline
actually needs:

### Necessary for pipeline decisions — encode these (≈34)
| Group | Rules | Why the pipeline needs them |
|---|---|---|
| Layout / grid / hero (§4.4) | DD-024..DD-032 | The `layout` domain is empty; hero and grid are currently unmodelled. Highest-value group. |
| Navigation / CTA (§4.5) | DD-033..DD-037 | No navigation or CTA model exists; IA is MISSING. |
| Disclosure components (§4.6) | DD-038..DD-044 | Governs accordion/tabs/gallery/before-after selection the registry already carries. |
| Responsive specifics (§4.9) | DD-064, DD-067, DD-069..DD-075 | Safe area, dynamic viewport, orientation, foldables, image sizing — the capability model has fields nothing reads. |
| Accessibility (§4.10) | DD-076..DD-078, DD-081 | Semantic-first, keyboard equivalence, focus obscuring, alt policy — needed to compute the a11y gate. |
| Performance (§4.11) | DD-085, DD-087..DD-090 | LCP media, client-JS minimisation, lazy-loading, embeds — needed for a non-vacuous budget. |
| SEO artifacts (§4.12) | DD-092, DD-093, DD-095 | Metadata, content hubs, image SEO — the missing artifact layer. |
| Content (§4.13) | DD-096, DD-099..DD-106 | Per-missing-asset rules; currently one composite rule (DD-098) stands in for nine. |
| Quality gates (§4.14) | DD-108..DD-112 | The §L gate groups EG-4 says nothing computes. |

### Documentation / reference — encode later or never (≈51)
| Group | Rules | Why |
|---|---|---|
| Remaining industry rules | DD-009, DD-011, DD-012 | Same shape as encoded DD-001..DD-010; add when a fixture needs that industry. Pure data. |
| Remaining personality rules | DD-017 | Same shape as DD-013..DD-018. |
| Typography detail | DD-022, DD-023 | Reading measure and large type; refine the token layer, do not gate anything. |
| Motion technique selection | DD-045, DD-046, DD-048..DD-052, DD-054..DD-058, DD-060..DD-063 | These pick *between* motion implementations. The framework already governs motion via the four-job gate, the cap and the tier ladder; encoding all 18 would duplicate `animation_library.md` rather than add enforcement. Encode only if a fixture reaches a tier where the choice matters. |
| Aesthetic treatments | DD-116..DD-120 | Glass, gradient/glow, grain, horizontal scrolling, minimum-effect policy. DD-119 and DD-120 are worth encoding (both are constraints); 116-118 are treatment preferences. |

**Recommendation: encode ~34 decision-critical rules, defer ~51.** Rule count is
not the bottleneck — §8 P0 items are.

---

## 8. Critical Missing Capabilities

### P0 — the framework produces a wrong or unprovable answer
1. **The expression ceiling is conflated with implementation complexity.**
   `CEILING_MAX_TIER` maps `low` → `css_transforms_transitions`, so `svg` (index
   5) is rejected. Consequence on this run: `data-diagram` and
   `interactive-gallery` were rejected for a *high-trust clinical* business that
   specifically needs explanatory diagrams and sells products with verified
   imagery. §10's list is a *complexity-escalation preference*, not a permission
   ladder — using it as a ceiling is my modelling error, not the spec's.
2. **No objective-coverage gate (EG-5).** A stated `sell_products` objective
   produced zero commerce architecture and nobody was told.
3. **Quality engine, refinement loop and a11y validators unwired (EG-3, EG-4).**
   §19's central promise cannot fire.
4. **No IA / page model (EG-6).** Five supplied pages were discarded; the site
   has no page tree, nav model or internal-link graph.

### P1 — governance exists but cannot be proven or is inconsistent
5. **SEO produces rules, not artifacts (§6).** The framework's own README rule 6
   demands the artifact set; the engine cannot emit it.
6. **Stack libraries not reconciled with selection (EG-1).**
7. **Accessibility level is decorative (MJ-6).** AAA stated, AA enforced.
8. **Component derivation is manual (MJ-1)** — so the responsive audit cannot
   fail honestly.
9. **`Q-*` checks orphaned at Phase 1 and unchecked by the audit (EG-7, EG-8).**
10. **Conflicts do not block and contested fields are unused (EG-2).**

### P2 — correctness and hygiene
11. Section-architecture vocabulary not canonical (EG-9).
12. Motion cap not enforced against components (EG-10).
13. `loading` mislabels 0KB patterns as deferred (EG-11).
14. No per-audience modelling (MJ-4).
15. No hreflang/locale or CMS-editor governance (MJ-7).
16. `layout` and `stack` rule domains empty.

---

## 9. Recommended Next Implementation

Smallest set that closes the P0s. Roughly in dependency order.

1. **Split the tier ladder into two axes** (fixes P0-1). Keep
   `implementationTier` for §10's escalation preference; add a separate
   `expressiveness` (low/medium/high) to `PatternDefinition` and gate the ceiling
   on *that*. `data-diagram` becomes expressiveness `low`, tier `svg`;
   `decorative-webgl-hero` stays expressiveness `high`. ~1 field, 1 gate change,
   and it unblocks clarity patterns for trust-critical businesses.
2. **Add an objective-coverage validator** (fixes P0-2). New
   `src/quality/validators/objective-coverage.ts`: every
   `websiteObjective` must trace to ≥1 selected pattern or section, or appear in
   `publicationRequirements` as explicitly dropped. Fails the run otherwise.
3. **Wire the quality engine into the pipeline** (fixes P0-3). `runPipeline`
   gains an optional `observations` input; when absent, every machine-measurable
   criterion is `unscored` and the level is `cannot_classify` — which is the
   honest answer for a pre-build run and already implemented. Derive `GateStatus`
   from what the pipeline *can* know now (content gate from `contentPlan`,
   performance gate from `enforceBudget`), leaving the rest unscored.
4. **Add a minimal IA model** (fixes P0-4). `src/generation/page-spec.ts`:
   `requiredPages` + `pageArchitecture` + objectives → `PageSpec[]` with purpose,
   audience, sections, and one inbound internal link each. This is also the input
   MJ-1 and MJ-5 need.
5. **Derive components from patterns** (fixes P1-8 and MJ-1). A
   `componentsFor(pattern)` map, plus a validation gate that fails when the
   responsive audit runs over an empty set.
6. **Emit SEO artifacts, not just rules** (fixes P1-5). Per `PageSpec`: title,
   description, canonical, robots, sitemap membership, OG/Twitter, allowed
   schema. Values drafted by AI, shape validated deterministically, publication
   gated on human approval.
7. **Reconcile stack libraries with selection** (fixes P1-6). One assertion: a
   library whose motivating pattern was not selected is removed and the removal
   recorded.
8. **Key thresholds by accessibility level** (fixes P1-7).
9. **Fix Phase 1 to name every `Q-*` check, and add an audit check that every
   `Q-*` defined is invoked by a gate** (fixes P1-9, EG-8).

Only after 1-4 does rule expansion become the bottleneck.

---

## 10. Framework Readiness

Scored 0-10. Every score cites repository evidence.

| Area | Score | Evidence |
|---|---|---|
| Architecture | 7 | Clean separation: 24 modules, pipeline orchestrates and decides nothing (`src/pipeline.ts` imports 13 subsystems, none reciprocally). Determinism proven — identical JSON across runs (`pipeline.test.ts`). But `src/generation/` does not exist, so there is no page/component layer; IA is MISSING. |
| Design intelligence | 6 | 21 of 35 rules fired; every decision carries rule id, facts read, rationale, source, fallback. 1 conflict surfaced rather than hidden. Undermined by P0-1: two clarity patterns rejected on a mis-modelled ceiling, and `layout` has zero rules. |
| Stack governance | 7 | §24 enforced and recorded verbatim; PWA denied with a reason; default library set genuinely empty and populated only by requirement. Loses points for EG-1 (three/R3F added for a rejected pattern) and an empty `stack` rule domain. |
| Responsive | 7 | 16 capability profiles, 160 decisions, `hide` refused on essential content, capability defaults assume the harder case. Loses points because the input is hand-authored (MJ-1) and `foldableSegments`/`prefersContrast`/`zoomPercent` are modelled but read by nothing. |
| Accessibility | 4 | `checkHardFailures` implements all seven §G.1 blockers and is tested (11 assertions), plus a stricter-than-WCAG logo rule. But it is **not called by the pipeline**, and AAA is carried without effect. Governance exists; enforcement does not. |
| Content integrity | 9 | The strongest subsystem. 12 claims hidden with non-fabricated substitutes, 12 requests raised, and the **primary objective blocked** for unverified contact details. 30 fabrication categories, 5 confidence levels, 15 replacement rows, `generatedSubstituteAllowed: false` on every proof-bearing asset. Point withheld only because `ai_draft` has no producer yet. |
| SEO | 4 | Correctly withheld 4 schema types for missing evidence — real behaviour, not documentation. But zero artifacts produced, and `pageArchitecture` ignored the 5 supplied pages. Fails the brief's §6 test on 7 of 11 items. |
| Performance | 5 | Budgets are single-sourced, archetype-assigned (150KB here), and `enforceBudget` changes the plan rather than reporting. But this run was vacuous (0KB → 0KB) and no build was measured. |
| Quality | 2 | 25 criteria, weights, four levels, `cannot_classify`, and a bounded refinement loop — all implemented with 27 passing tests. **None of it runs.** A subsystem that cannot be invoked scores for design, not for capability. |
| QA / evidence | 3 | 8 `Q-*` checks defined, all referenced in `qa_evidence_gate.md`, thresholds now cited from code. But none executable, Phase 1 does not demand them, and `audit_framework.py` has 0 `Q-` references. |
| **Overall** | **5** | The framework proved it can take an unseen brief, derive 16 evidenced variables, apply 21 rules, explain 13 rejections, refuse 12 fabrications and block its own primary conversion path. It cannot yet produce an IA, a page, a token, an SEO artifact or a quality verdict. |

---

## 11. Decision

## NOT READY — fundamental framework gaps remain

The reasoning, stated precisely so it is not mistaken for pessimism about the
foundations:

**What this dry run proved works.** Determinism, provenance, explainable
rejection, and content integrity are real and load-bearing. The engine refused
to fabricate twelve things it did not have, blocked its own primary conversion
path over one unverified address, withheld four schema types, rejected four
patterns by name for a trust-critical business, and reported a rule conflict
instead of resolving it by evaluation order. That is the hard part of the
specification, and it is done.

**Why it is nonetheless not ready.** Four of the gaps are not rule-coverage
issues and will not be fixed by encoding the remaining 85 rules:

1. A mis-modelled expression ceiling **rejected the explanatory diagram and the
   product gallery** — for a clinical business whose whole job is explaining
   devices and whose product imagery is verified. That is a wrong answer, not a
   missing one.
2. A stated `sell_products` objective produced **no commerce architecture at
   all**, and nothing noticed.
3. The quality engine and accessibility validators — the subsystems that decide
   whether anything may ship — **are not connected to the pipeline**.
4. Five supplied pages were **silently discarded**, so there is no information
   architecture to build from.

A framework that can be handed a brief and returns a design specification with no
pages, no tokens, no SEO artifacts and no quality verdict is not yet governing
website development; it is governing the *decisions* about website development,
which is the harder half but not the whole.

**Explicitly: rule expansion is not the bottleneck.** §9's nine changes are
small and mostly structural — one extra field on `PatternDefinition`, one
validator, one wiring change, one page model. After those, the verdict should
move to READY FOR RULE EXPANSION, and roughly 34 of the 85 pending rules are the
ones worth encoding.

No fixes were implemented, no rules encoded, no website created, nothing
committed at the time of the first run. The remediation below followed.


---
---

# Remediation Results

Second dry run executed 2026-09-13 on the SAME fixture, same harness, after the
P0 remediation. Validation: typecheck PASS, **248 tests green (11 files)**,
self-audit **11 checks / 0 FAIL / 2 WARN** (the two pre-existing WARNs,
unchanged).

The harness no longer supplies a component list, so the responsive audit now
runs over a derived inventory. Its SEO digest now reads the PIPELINE's strategy
rather than a standalone call, which the first run's digest had understated.

## P0-1 — Expression model

**Root cause.** One axis was doing two jobs. `CEILING_MAX_TIER` applied the
visual-expression ceiling to §10's implementation-complexity ladder, where `svg`
sits at index 5 and `motion_react` at 3. A `low` ceiling therefore stopped at
`css_transforms_transitions` and rejected an inline SVG diagram — a clarity
device with almost no decorative ambition — from a clinical site whose entire job
is explaining devices. §10's list is an escalation *preference*; it was never a
permission ladder. `poorFor` compounded it: a flat industry list with no
exception path could not express appendix A's own test for 3D ("spatial
inspection improves the decision").

**Architectural fix.** Three separations, not a special case:

1. `PatternDefinition.expressiveness` (low/medium/high) — how DECORATIVE the
   pattern is. Gated by the expression ceiling.
2. `PatternDefinition.tier` — implementation complexity. Now gated by
   `technical_complexity_budget` in a new `implementation_complexity` gate.
3. `benefits.explanation` — information/explanation value, scored separately from
   `ux`, because an explanatory pattern can score low on task completion and
   still be the most valuable element on a high-trust page. It also feeds the §7
   value-question check and the distraction-cost penalty, so a diagram is no
   longer mistaken for decoration.

Plus `SuitabilityUnlock`: a use-case override for `poorFor`, keyed on a stated
requirement, a stated objective, a derived variable, or verified assets. **The
shape deliberately has no industry field**, so an unlock cannot become the
industry hack it replaces. An unlocked pattern re-enters every remaining gate and
carries `approvalRequired` plus a mandatory fallback.

Two gate outcomes were also corrected: exceeding the expression ceiling or the
complexity budget now yields `replace` ("deliver this in a simpler form"), not
`reject`. Rejecting discarded the job the pattern does — and on an unlocked
pattern the old wording asserted the value was "decorative" immediately after an
unlock had established it was functional.

The nine dimensions the brief requires are now all represented: business
relevance and use/task value and explanation value (gate 1 + scoring), visual
expression (gate 2), content readiness (gate 3), accessibility (gate 4),
implementation complexity (gate 5), performance (gate 6), mobile suitability
(gate 7).

**Tests added** — `tests/scenarios/p0-remediation.test.ts`, plus retargeted
assertions in `tests/scenarios/selection.test.ts`:
- a low-expression clinical context still selects `data-diagram`
- a verified product gallery is still selected
- decorative WebGL, cursor follower, parallax, magnetic action, perspective card
  all remain excluded
- tier alone replaces rather than rejects
- an unlock overrides `poorFor`, carries approval and a fallback
- an unlock without its verified evidence does not fire
- no unlock carries an industry field, and none is unconditional
- the two axes are provably independent (a low-expressiveness pattern exists at a
  high tier, and a high-expressiveness pattern at the lowest tier)
- every gate assertion in the suite is now by NAME, not index, so inserting a
  gate can no longer silently invalidate a test

| | Before | After |
|---|---|---|
| Selected patterns | `structured-content-rail`, `split-hero`, `sticky-narrative`, `timeline`, `faq-accordion` | `data-diagram`, `structured-content-rail`, `split-hero`, `interactive-gallery`, `timeline` |
| `data-diagram` | **reject** — "tier `svg` exceeds the low expression ceiling" | **select** |
| `interactive-gallery` | **reject** — same tier rule | **select_with_fallback** (Static grid) |
| `3d-product-view` | **reject** — "poor for healthcare" | **replace** — "the job this pattern does is legitimate here, but expressiveness `medium` exceeds the low ceiling — deliver the same value in its simpler form (Image gallery)" |
| Outcome mix | 4 select / 1 swf / 3 defer / 13 reject | 3 select / 2 swf / 3 defer / 3 replace / 10 reject |

**Remaining limitation.** `expressiveness` is a human judgement recorded per
pattern, not a derived measure. It is auditable (one field, 21 values, reviewable
in one screen) but it is an assignment, and a mis-assigned value would
mis-gate silently. There is no validator that can check it.

## P0-2 — Objective coverage

**Root cause.** Architecture was derived from INDUSTRY alone. DD-007 keys on
`industry == ecommerce`, so a clinic with a stated `sell_products` objective
produced no catalogue, no price surface and no returns section. Nothing anywhere
compared the stated objectives against the architecture, so the objective was
accepted at the input contract and silently dropped.

**Architectural fix.** New
`src/design-intelligence/objectives/objective-architecture.ts`, containing **no
industry name at all**:
- `OBJECTIVE_ARCHITECTURE` — one row per objective (all 14 in the schema) giving
  required sections, supporting sections, serving capabilities, conversion
  surface and critical evidence.
- `sectionsForObjectives()` — objective sections are merged into the
  architecture, and `commerce_depth` / `regulation_risk` add discovery and
  disclosure surfaces regardless of industry. This is the generalisation: a
  business selling more than a handful of products needs search and filters
  whatever it calls itself.
- `checkObjectiveCoverage()` — every stated objective must have at least one
  required section present OR a selected pattern providing a serving capability.
  An unserved objective produces a failure line reaching
  `approvalsRequired` and `publicationRequirements`, and sets the §L.6 design
  gate to `false`. A SERVED objective whose critical evidence is blocked is also
  reported, because the architecture exists but cannot convert.

**Tests added**: all six objective classes the brief names (service/lead
generation, appointment booking, product commerce, content/information,
membership/subscription, multi-audience) assert that every stated objective is
both evaluated and represented; plus coverage-incomplete reporting, the
every-objective-has-a-row invariant, and the blocked-evidence case.

| | Before | After |
|---|---|---|
| `sectionArchitecture` | 6 entries: `qualifications, process, location_contact, clear_language, location_and_contact, plain_language_summary` | 15 entries including `catalog, product_detail, price, returns, checkout, booking, topic_hub, explanation, disclosures` |
| Commerce architecture for a clinic | **absent** | present |
| Duplicate section spellings | 2 pairs | **0** (canonical vocabulary) |
| Objective coverage | not evaluated | `complete: true`, `unserved: []`, all 4 objectives with present sections |
| Blocked-but-served objective | silent | reported: "objective `book_appointments` has architecture but its conversion surface `booking_flow` cannot function: blocked evidence addresses" |

**Remaining limitation.** Coverage proves an objective has SECTIONS, not that the
sections are any good. It cannot tell a real checkout from a section named
`checkout`. That needs post-build evidence.

## P0-3 — Quality, accessibility and SEO wiring

**Root cause.** `evaluateQuality`, `refine`, `checkHardFailures`,
`accessibilityScore` and `seoScore` had 27+ passing tests and no caller outside
their own modules. §19's central promise — a critical gate failure prevents
production regardless of score — could not fire, because nothing computed the
gates during a run. A secondary cause blocked the obvious fix: `GateStatus` was
boolean, so pre-build there was no way to say "not yet known" without either
faking a pass or inventing a failure.

**Architectural fix.**
- `GateStatus` became **tri-state** (`true | false | "unknown"`). `false` blocks;
  `"unknown"` cannot certify. `evaluateQuality` returns `cannot_classify` when the
  technical gate is unknown, and `unknownGates` is reported alongside
  `failedGates`.
- New `src/quality/gate-derivation.ts` — `assessQuality()` derives a `GateStatus`
  and a `ScoreSheet` from what is ACTUALLY known, in two modes. PRE-BUILD: content
  and design gates are decided from the decision output, responsive from the audit
  (but `"unknown"` when the inventory is empty), technical / accessibility /
  performance are `"unknown"` and their criteria stay `unscored`. POST-BUILD: with
  `BuildEvidence`, the real `checkHardFailures`, `accessibilityScore`, `seoScore`
  and technical checks run, and a hard failure sets the gate to `false`.
- `runPipeline` now calls it on every invocation and publishes
  `output.quality`; blockers and unknown gates flow into
  `contract.publicationRequirements`.

**Tests added**: the pipeline always produces an assessment; pre-build gates are
`unknown` not `true`; unmeasurable criteria stay unscored; decision-derivable
gates ARE decided pre-build; a WebGL-dependent primary task with evidence sets
`accessibility: false`, produces hard failures, and caps the level; with full
evidence the accessibility/SEO/performance criteria become scored; and an
`unknown` gate can never certify even with a perfect 100 sheet.

| | Before | After |
|---|---|---|
| Quality in the pipeline | absent (`output.qualityEvaluation === undefined`) | `output.quality` present on every run |
| Pre-build verdict | none | `cannot_classify` — "the technical gate has no evidence yet… This is the expected pre-build state" |
| Gates | never computed | `{technical: unknown, accessibility: unknown, responsive: true, performance: unknown, content: false, design: true}` |
| Weighted score | none | 68.1 over the criteria that ARE knowable |
| Blockers surfaced | none | `content` gate false → "blocked conversion path(s): book_appointments" |
| Hard failure can block | no | yes, verified by test |

**Remaining limitation.** `BuildEvidence` must be supplied by whatever builds and
measures the site; nothing in this repository produces it. The post-build path is
tested with constructed observations, not with a real build. The refinement loop
(`refine()`) is reachable but still not invoked by `runPipeline` — it needs a
mutation callback that only a generator can provide.

## P0-4 — Page model loss

**Root cause.** `requiredPages` was read exactly once, as `.length`, to bucket
information density. Five pages with stated purposes entered the pipeline and
none survived. `pageArchitecture` then returned a generic industry list matching
none of them.

**Architectural fix.** New `src/generation/page-spec.ts`:
- `PageSpec` preserves every field the brief requires: route, purpose (verbatim),
  primary objective, secondary objectives, audience, SEO role, indexability,
  content requirements, required sections, conversion role, responsive
  requirements, trust requirements, and `ownerSupplied`.
- `derivePageSpecs()` preserves every owner page first, then adds a derived page
  for any objective no owner page serves — so coverage is real rather than
  assumed, and derived pages are labelled.
- `componentsForPages()` derives the responsive inventory from pages plus
  selected patterns, replacing the hand-authored list.
- `buildSeoStrategy` now takes the page model, so `pageArchitecture` is the real
  routes.

**Tests added**: all five owner routes reach the output; every page preserves
every required field; the owner's purpose text is preserved **verbatim**; the SEO
page architecture names the real routes; the second audience appears on the page
written for it; the responsive audit runs over a derived inventory and scales
with the page model; an empty inventory makes the responsive gate `unknown`
rather than a pass.

| | Before | After |
|---|---|---|
| Pages in output | **0** | 5, all `ownerSupplied: true` |
| Objective inference | n/a | `/devices → sell_products`, `/conditions → educate`, `/for-clinicians → build_credibility`, `/book → book_appointments` |
| Second audience | invisible | `/for-clinicians → ["FIXTURE-REFERRING-CLINICIANS"]` |
| SEO page architecture | `["service","process","faq"]` | `["/ (primary_entry)", "/conditions (topic_hub)", "/devices (detail)", "/for-clinicians (detail)", "/book (conversion)"]` |
| Responsive inventory | 10 hand-authored, 160 decisions | **35 derived**, 560 decisions, `coreContentPreserved: true` |

**Remaining limitation.** Objective and audience inference use keyword matching
over the route and purpose text. It is deterministic and explainable, but it is a
heuristic: an unusually-worded purpose will fall back to the site's primary
objective. `weightKb` in the derived inventory is an ESTIMATE from registry
metadata, not a measured bundle — `/devices` carries a real gallery whose true
weight needs a build. Both are stated in the module rather than hidden.

## Structural fix — stack contradiction

**Root cause.** `selectStack` mapped `requiredFunctionality` straight to
libraries with no knowledge of what selection had decided. `product_configurator`
was requested, so `three` and `@react-three/fiber` entered the stack while every
3D pattern had been rejected — the framework producing exactly the unnecessary
dependency §17 forbids.

**Architectural fix.** `RequirementLibrary` gained `requiresCapability` (the
library enters only if a selected pattern provides that capability tag) and
`requiresDraftValue` (the library follows a rule's decision). Patterns gained
`capabilities`. Omissions are **recorded**, not dropped: `omittedLibraries`
carries the library, the requirement and the reason, and an architectural
constraint tells the owner the design decision must be resolved first.

**Tests added**: a rejected 3D capability adds no 3D dependency; the omission is
recorded with a reason and the right requirement; a selected 3D capability does
allow the dependency (or, if declined, the absence is explained); a map
dependency follows DD-114's decision rather than the bare requirement.

| | Before | After |
|---|---|---|
| Libraries | 7, including `three`, `@react-three/fiber`, `lazy-loaded map embed` | **4**: `headless CMS client`, `next-intl`, `react-hook-form`, `zod` |
| Omissions | silent | 3 recorded with reasons |
| Map | embed added despite an unverified location | omitted — "a rule chose `map="address_plus_directions_link_and_static_context"`" |

## Structural fix — imagery conflict

**Root cause, traced fully as required.** THREE writers, two meanings, one field
name:
1. DD-014 (premium) `set imagery.strategy = high_quality_or_none` — actually a
   CONSTRAINT on what may be used.
2. DD-097 `set imagery.strategy = typography_css_svg_diagram_led` with an
   `otherwise` branch — a restatement of a value already DERIVED from measured
   asset quality.
3. DD-015 (technical personality) `set imagery.strategy =
   product_ui_diagrams_data_visuals` — a statement about SUBJECT MATTER, an
   unrelated concept sharing the name.

So the "conflict" between DD-014 and DD-097 was an artefact: neither owned the
field. And the pipeline ignored the draft entirely, returning a third value from
`imageStrategyFor(visual_asset_quality)` — which was, in fact, the correct
authority.

**Architectural fix.** One authority per field. `imagery.strategy` is derived
from measured asset quality by `content/asset-policy.ts` and no rule writes it.
DD-014 and DD-097 contribute `require`/`forbid` obligations instead — which is
what they uniquely add and no derivation can express. DD-015 moved to
`imagery.subject`, a genuinely different field.

**Tests added**: no conflict is reported on the imagery target; the output carries
a single authoritative strategy; and conflict detection still fires for a genuine
disagreement (so the mechanism was resolved, not disabled).

| | Before | After |
|---|---|---|
| Conflicts | 1 (`imagery.strategy`, DD-014 vs DD-097) | **0** |
| Writers of `imagery.strategy` | 3 rules + 1 function, none authoritative | 1 function |
| Output value | a third value ignoring both rules | `authentic_selective`, from the single authority |

## Responsive audit honesty

The smallest structural change proved to be `componentsForPages(pages,
selectedPatterns)`: the page model already knows the routes and their sections,
and the pattern registry already carries weight, tier and hover metadata. The
harness no longer passes a component list, and `options.components` survives only
as a testing override for the transformation engine.

**Stated limitation, not fabricated coverage**: the inventory is DERIVED but its
`weightKb` values are estimates from registry metadata. A component's real weight
needs a build. An empty inventory now sets the responsive gate to `"unknown"`
rather than passing by doing nothing, which is the specific dishonesty the first
run flagged.

---

## Remaining Gaps

### P0 — must fix before rule expansion
**None.** The four P0s are resolved and regression-tested.

### P1 — must fix before a customer dry run
1. **SEO emits rules and roles, not artifact VALUES.** Still no title, meta
   description, canonical, robots directive, sitemap entry, OG or Twitter values.
   The page model now provides the anchor these need.
2. **No design tokens.** `color`, `typography`, `spacing`, `grid` remain
   DOCUMENTATION ONLY. `tools/generate_palette.py` is Python and unreachable from
   the TypeScript pipeline; nothing produces a token set or a measured contrast
   table.
3. **`wcag_aaa_or_equivalent` is still decorative.** Carried into
   `accessibilityStrategy.target`; `CONTRAST_THRESHOLDS` remains AA-only.
4. **`BuildEvidence` has no producer.** The post-build path is tested with
   constructed observations. Nothing builds, fetches served HTML, or measures a
   bundle.
5. **The refinement loop is reachable but uninvoked.** It needs a mutation
   callback only a generator can supply.
6. **`Q-*` checks are orphaned at Phase 1** (`website_flow.md` still demands only
   "the 10 questions") and **`audit_framework.py` has zero `Q-` references**, so
   a new check can be written and never invoked.
7. **No hreflang / locale routing governance** despite two locales and
   `next-intl` entering the stack.
8. **The CMS "named non-technical editor" is prose, not a gate.**

### P2 — later hardening
9. `layout` and `stack` rule domains remain empty (0 encoded rules each).
10. Motion cap is not enforced against selected components' `animated` flags.
11. `expressiveness` is an unvalidatable human assignment (P0-1's limitation).
12. Page objective/audience inference is keyword-based.
13. Derived `weightKb` values are estimates.
14. `supportingSections` are computed and only used for coverage, never emitted
    into the architecture.
15. `motionLibrariesForTier` is driven by a lexicographic `.sort().at(-1)` over
    tier names rather than the tier ordinal — correct by luck on the current set.

---

## Rule Expansion Decision

The 85 pending rules, classified by what encoding them would actually buy. This
supersedes the first report's rougher "34 encode / 51 defer" estimate.

| Class | Count | Rules | Encode? |
|---|---:|---|---|
| **Executable rule** (changes a design decision deterministically) | 36 | DD-024..032 layout/grid/hero · DD-033..037 nav/CTA · DD-038..044 disclosure/cards/gallery · DD-064, 067, 069..075 responsive specifics · DD-022, 023 typography · DD-009, 011, 012, 017 remaining industry/personality | **YES — first** |
| **Validation / gate rule** (blocks or requires) | 21 | DD-045, 046 motion purpose · DD-076..078, 080, 081 accessibility · DD-083 forms · DD-085, 087..090 performance · DD-092, 093, 095 SEO artifacts · DD-108..111 quality gates · DD-119 horizontal scrolling | **YES — second** |
| **Scoring rule** (sets a threshold or weighting) | 2 | DD-112 world-class differentiation · DD-120 minimum selected-effect policy | **YES — cheap** |
| **Human approval rule** (hide + ask + approve) | 9 | DD-096, 099..106 per-missing-asset content rules | **YES — replaces the DD-098 composite** |
| **Documentation / reference** | 17 | DD-048..052, 054..058, 060..063 motion & 3D technique selection · DD-116..118 glass/gradient/grain treatments | **NO** |

**Recommendation: encode 68, decline 17.**

The 17 declined are not gaps. The motion and 3D technique rules choose *between*
implementations (CSS vs WAAPI vs Motion vs GSAP vs Lottie vs R3F), and that
choice is already governed by the tier ladder, the complexity budget, the
four-job motion test and `animation_library.md`. Encoding them would duplicate an
existing authority — the failure mode this framework has already fixed twice
(colour values with four homes; thresholds written in two places). The three
treatment rules are aesthetic guidance with no decision to gate.

Encode in the order above: executable rules first (they fill the empty `layout`
domain and the missing nav/CTA/hero models), then the validation rules (they make
the §L gates computable, which P1 items 1-4 also need), then the cheap scoring
and content rows.

---

## Final Verdict

## READY FOR RULE EXPANSION

The four P0 failures were architectural, and they are fixed at the model rather
than at the fixture: one axis split into three, architecture driven by objective
rather than industry, gates made tri-state so absent evidence is neither a pass
nor a failure, and the page model preserved end to end. Each fix is guarded by
tests that state the invariant, and the gate assertions are now name-based so
inserting a gate cannot silently invalidate them.

Evidence: typecheck PASS · 248 tests green · self-audit 11/11 with 0 FAIL · the
same fixture now selects the explanatory diagram and the product gallery it
previously rejected, produces commerce architecture for a clinic, preserves all
five supplied pages, derives a 35-component responsive inventory, adds four
libraries instead of seven with three omissions recorded, reports zero rule
conflicts, and returns an honest `cannot_classify` naming the three gates it
cannot yet evidence.

It is NOT ready for a customer dry run. Eight P1 items remain, and four of them
matter most: no SEO artifact values, no design tokens, no `BuildEvidence`
producer, and an accessibility level that is stated but unenforced. A customer
site cannot ship on a decision specification that produces no title, no colour
and no measured contrast.

Rule expansion and the P1 subsystems are independent and can proceed in parallel.

Nothing was committed.


---
---

# P1 Foundation Remediation

Third dry run executed 2026-09-13 on the SAME fixture. Validation: typecheck
PASS, **363 tests green (15 files)**, self-audit **11 checks / 0 FAIL / 2 WARN**
(the two pre-existing WARNs, unchanged).

## P1-1 — SEO artifact values

**Previous limitation.** `buildSeoStrategy` emitted RULES ("title unique per
page") and an allow/withhold schema list. It produced no title, description,
canonical, robots directive, sitemap, OG or Twitter value. The first dry run
failed 7 of the brief's 11 SEO checks.

**Root cause.** The SEO layer modelled *requirements*, not *artifacts*. There was
also a missing input: no field in `BusinessInput` carried a production origin, so
an absolute canonical was unproducible — and producing one anyway would have
meant inventing a domain.

**Architectural change.** New `src/seo/artifacts.ts`. Every value carries an
`ArtifactOrigin`, and the confidence/approval/publication flags are read from the
EXISTING `CONFIDENCE_POLICY` rather than a second vocabulary:

| Origin | Meaning | Ships? |
|---|---|---|
| `verified_business_fact` | straight from a verified fact | yes |
| `generated_structural` | composed from supplied facts; asserts nothing new | yes |
| `ai_draft` | prose the framework must not invent; a BRIEF is emitted instead | only after approval |
| `unresolved` | cannot be produced without more input | no, and it says what it needs |

**New contract.** Per page: title, meta description, canonical, robots, sitemap
membership, Open Graph (5 fields), Twitter (4 fields), per-page structured data,
indexability, semantic-content requirements, inbound internal links, and shape
warnings. Plus a site-level sitemap, robots.txt, and the `unresolved` /
`approvalsRequired` lists. `constraints.canonicalOrigin` added to the input
contract — optional, never defaulted.

**Pipeline integration.** `output.seoArtifacts`; unresolved and approval items
flow into `approvalsRequired` and `contract.publicationRequirements`; the plan is
also carried on the `ImplementationContract` itself, so a generator does not have
to dig into the decision output to find values.

**Tests** (24, `tests/scenarios/seo-artifacts.test.ts`): artifacts survive input →
pipeline → output for all five pages; titles unique and within budget; no orphans;
canonical is `unresolved` with no value and the reason names "fabricated fact";
sitemap unresolved rather than emitted with relative paths; robots.txt ships
WITHOUT a fabricated `Sitemap:` line; with an origin supplied everything becomes
absolute; meta descriptions are `ai_draft` with a brief that forbids ratings,
counts, credentials and guarantees; og:image is `unresolved` with no verified
asset; site-withheld schema can never be re-admitted by a page.

**Evidence.**

| | Before | After |
|---|---|---|
| Title / robots / sitemap membership | none | emitted per page, `generated_structural` |
| Canonical (no origin supplied) | none | `unresolved`, value `null`, reason given, 5 entries in `unresolved` |
| Canonical (origin supplied) | n/a | `https://…/` absolute, `verified_business_fact` |
| Meta description | none | `ai_draft` + brief, approval required, 5 approvals raised |
| og:image with no verified asset | none | `unresolved`; twitter card degrades to `summary` |
| Structured data | site-level only | per page: `/conditions` gets no `Service`, `/devices` no `Product` |

**Remaining limitation.** Descriptions are briefs, not text — the framework
specifies them and a person or an approved drafting step writes them. hreflang and
locale routing are still ungoverned despite two locales being stated.

## P1-2 — Design token generation

**Previous limitation.** `color`, `typography`, `spacing` and `grid` were
DOCUMENTATION ONLY. DD-019 set the string
`"semantic_tokens_derived_from_one_seed"` and nothing produced a value.
`generate_palette.py` held the real algorithm and was unreachable from the
TypeScript pipeline.

**Root cause.** The authority existed in a language the engine could not call.

**Architectural change, and the port decision.** The brief asked for a decision
on `generate_palette.py` based on architecture rather than convenience. It was
PORTED, for two reasons: the pipeline is a library and must not shell out to an
interpreter it cannot guarantee, and `color_system.md` names the algorithm — not
the file — as authoritative. Inventing a second derivation was never an option.

To stop the port becoming a second authority, `tests/scenarios/tokens.test.ts`
**executes the Python and compares every emitted value**. Python is already a hard
dependency (`npm run gate` runs `audit_framework.py`), and the parity test FAILS
rather than skips if it is absent — a parity test that skips proves nothing.

**New contract.** `DesignTokenContract` with six groups, each carrying a
`TokenProvenance` (`brand_derived` / `neutral_substitute` /
`derived_from_context` / `unchosen_default`):
colour (L1 ramps, L2 semantic tokens per theme, CSS custom properties, the
measured contrast table, failures, drift, token parity), typography (fluid clamp
scale, line heights, weights, reading measure, loading), spacing, radius, layout
(containers, breakpoints, gutters, columns), motion (durations, easings,
reduced-motion contract, cap).

Three-way honesty on the seed, and **all three produce usable values** because
§J.2 requires a neutral system rather than an empty one: seed supplied →
`brand_derived`; brand colours recorded but no value → `neutral_substitute` plus a
request; no brand colours → `neutral_substitute` citing §J.2.

**Pipeline integration.** `output.tokens` and `contract.designTokens`; unresolved
groups and token problems reach `approvalsRequired`; the design gate now FAILS
when tokens are invalid or absent; colour, typography, spacing, grid consistency
and consistency became SCORED criteria.

**Tests** (29): full Python parity across SINGLE-DARK / SINGLE-LIGHT / DUAL, all
primitive ramps, the contrast table including drift, and a hostile near-white
seed; `labelOn` measures rather than assuming white; drift is reported; real token
values exist for every required token; breakpoints are READ from `RANGES`; a
low-literacy audience raises the body-size floor; a `minimal` motion cap withholds
entrance durations; an unchosen theme mode is recorded as a problem; a malformed
seed is rejected rather than silently defaulted.

**Evidence.**

| | Before | After |
|---|---|---|
| Colour tokens | none | 28 L2 tokens + CSS custom properties per theme |
| Contrast table | none | 22 measured pairs, 0 failures, drift surfaced |
| Python parity | n/a | identical across 3 modes, all ramps, all checks, hostile seed |
| Typography / spacing / radius / layout / motion | none | all emitted with provenance |
| Quality criteria scored from tokens | 0 | 5 (`color`, `typography`, `spacing`, `grid_consistency`, `consistency`) |
| Weighted score (pre-build) | 68.1 | **73.1** — from real evidence, not inflation |

**Remaining limitation.** `generate_palette.py` and the TypeScript port are now
two implementations kept honest by a parity test rather than by being one
implementation. That is a deliberate trade and the test is the mitigation. Theme
mode defaults to SINGLE-LIGHT and is reported as UNCHOSEN rather than decided.

## P1-3 — BuildEvidence producer

**Previous limitation.** Gates expected build evidence; nothing produced it.
`BuildEvidence.measuredRouteJsKb?: number` was a bare number, so the responsive
registry's ESTIMATED `weightKb` could have satisfied a gate requiring a
measurement and the gate could not have told.

**Root cause.** Evidence had no provenance, so "measured" was an honour system.

**Architectural change.** Two new modules.

`src/evidence/evidence-value.ts` — `Evidence<T>` tagged
`measured | derived | estimated | unavailable`, with `requireMeasured()` and
`requireGrounded()` as the only readers. A gate needing a measurement cannot
accept an estimate, because the reader returns `null` for anything weaker.

`src/evidence/build-evidence.ts` — the producer. It does real work on real
artifacts: `parseServedHtml` extracts title, description, canonical, robots,
heading order and skips, OG/Twitter tags, JSON-LD `@type`s (flagging malformed
blocks), image/alt counts, body-text length, internal links and no-script
affordances; `parseBuildManifest` normalises a build manifest into measured
per-route first-load JS; `compareRouteInventory` checks the planned page model
against the built routes; `seoObservationsFromHtml` feeds the EXISTING SEO
observation contract. Anything absent returns `unavailable` **with a note naming
what would produce it**. Nothing is estimated here, because an estimate is not
evidence.

**Pipeline integration.** `assessQuality` takes the bundle; the performance gate
reads bundles and vitals through `requireMeasured`; the SEO criterion is scored
from measured served HTML (worst page, not average); `shortfalls` records each
undecidable gate with what it needed and what it had, and reaches
`contract.publicationRequirements`; `evidenceProvenance` reports the kind of every
field; `routeInventory` blockers catch a planned page the build never produced.
`src/index.ts` added, because the producer had no discoverable entry point.

**Tests** (42 in `evidence-and-aaa.test.ts`, plus 20 integration): the parser
extracts real facts and detects heading skips, malformed JSON-LD, missing alt and
client-only content; the collector tags measured vs derived vs unavailable;
`requireMeasured` refuses estimated and derived; **an ESTIMATED bundle leaves the
performance gate `unknown` with `had: "estimated"`**; a measured bundle over
budget FAILS rather than staying unknown; measured bundles with unmeasured vitals
stay unknown; SEO cannot be scored from the plan; the route-inventory check
reports both missing and unplanned routes and does not claim a comparison it could
not run.

**Evidence.**

| | Before | After |
|---|---|---|
| Evidence provenance | untyped numbers | 4-way tagged, enforced by the reader |
| Estimated value in a measured gate | possible | refused; gate stays `unknown`, shortfall records `had: estimated` |
| Served-HTML facts | none | 14 fields parsed per route |
| Route inventory cross-check | none | missing / unplanned / matched, with `compared: false` when it cannot run |
| Gate shortfalls | none | 4 reported pre-build, each naming what it needs |

**Remaining limitation.** The producer CONSUMES artifacts; it does not build a
site or fetch a URL. A host must run the build, fetch each route with JS
disabled, and hand the artifacts over. That boundary is correct — the engine is a
library — but it means the post-build path is exercised in tests with constructed
HTML rather than a real deployment. `refine()` is still not invoked by
`runPipeline`: it needs a mutation callback only a generator can supply.

## P1-4 — AAA enforcement

**Previous limitation.** `accessibility_requirement` could be
`wcag_aaa_or_equivalent` and nothing changed. `CONTRAST_THRESHOLDS` was a flat AA
constant, so AAA was silently enforced at AA.

**Root cause.** The threshold table was not keyed by the requested target, and
there was no representation for "this criterion cannot be classified".

**Architectural change.** New `src/accessibility/evaluate.ts` implementing the
four-part contract the brief requires: **requested target** (preserved verbatim,
never downgraded), **measurable criteria** (which checks the target implies),
**evidence available**, and **pass / fail / unknown / not_applicable** per
criterion. `thresholdsFor(target)` keys the numbers to the level — AAA gives 7:1
body (1.4.6) and 44px targets (2.5.5). `checkHardFailures` now takes thresholds,
defaulting to the AA floor so existing callers are unchanged.

The gate rule: **a failure outranks an absence, and an absence never passes.**
`false` on any failure; `"unknown"` when a MANDATORY criterion is unclassified;
`true` only when every mandatory criterion actually passed. `score` is `null` when
the gate is undecidable, so an unmeasured target cannot inflate the weighted
score.

**Conflicting authority removed.** `accessibilityScore()` was deleted. It scored
against a hard-coded AA assumption while `evaluateAccessibility` scores against
the requested target — two scorers for one criterion, the weaker one ignoring the
target. One authority now.

**Pipeline integration.** `output.quality.accessibility` carries the full
evaluation; `output.accessibilityStrategy.thresholds` publishes what the target
implies; the accessibility gate is the evaluation's gate; unclassified criteria
become a shortfall reaching the contract.

**Tests** (16 of the 42): AAA raises both thresholds; 5.2:1 contrast passes AA and
FAILS AAA; a 32px target passes AA and fails AAA; AAA adds five criteria AA does
not have; **AAA requested with no AAA observations leaves the gate `unknown` while
the same observations PASS at AA** — the proof that the target changed the
outcome; one unclassified criterion is enough to hold the gate; an unknown gate
cannot be scored; a failure outranks an absence; `not_applicable` is neither;
an AAA site cannot reach production_ready on AA-only evidence.

**Evidence.**

| | Before | After |
|---|---|---|
| AAA effect on thresholds | none | body 4.5→**7.0**, large 3.0→**4.5**, targets 24→**44** |
| AAA-specific criteria | 0 | 5 mandatory (1.4.6, 1.4.8, 2.4.9, 3.1.5, 2.3.3) + 1.2.6 when media exists |
| Gate on AA-only evidence at an AAA target | would have passed | `unknown`, with 14 unclassified mandatory criteria named |
| Accessibility scorers | 2 (conflicting) | **1** |

**Remaining limitation.** Three AAA criteria (1.4.8, 2.4.9, 3.1.5) are not
machine-measurable and are marked `machineMeasurable: false`. They must be
asserted by a person; the framework holds the gate `unknown` until they are, which
is the honest behaviour but means an AAA site cannot be certified without human
assessment.

## Cross-system sweep findings

Three genuine issues found and fixed, in the same classes as the P0 dry run:

1. **Duplicated decision logic.** The expression scale existed in THREE places
   and the motion-cap scale in TWO. New `src/design-system/scales.ts` is the
   single home; the evaluator, the selection engine and the pipeline all cite it.
   `strictestOn()` defaults to the STRICTEST entry, so an unrecognised value
   cannot widen a ceiling.
2. **Conflicting authority.** `accessibilityScore` removed (above).
3. **Produced but undiscoverable.** `collectBuildEvidence` had no caller in
   `src/` — correct, since the host supplies artifacts — but also no exported
   entry point. `src/index.ts` added, documenting the two-phase contract:
   DECIDE (no evidence, `cannot_classify`) then VALIDATE (with evidence).

Also carried into the markdown framework, because the contract changed:
`qa_evidence_gate.md` §3 now records that `CONTRAST_THRESHOLDS` is the AA FLOOR
and `thresholdsFor(target)` is the authority; a new §3b requires evidence
provenance and states that the registry's `weightKb` may never stand in for a
build measurement.

---

## Remaining Gaps

### P0 — must fix before rule expansion
**None.**

### P1 — must fix before a customer dry run
1. **No host adapter.** The evidence producer consumes artifacts; nothing in this
   repository builds a Next.js site, fetches routes with JS disabled, or runs an
   accessibility tool. The post-build path is proven against constructed HTML.
2. **`refine()` still uninvoked** — it needs a generator's mutation callback.
3. **No generator.** Nothing consumes the `ImplementationContract` to emit code.
   This is the largest remaining gap and the reason a customer site cannot ship.
4. **Meta descriptions are briefs, not text.** Correct by design, but a drafting
   and approval step must exist.
5. **No hreflang / locale routing governance**, despite two locales stated and
   `next-intl` entering the stack.
6. **`Q-*` checks orphaned at Phase 1**, and `audit_framework.py` has no `Q-`
   reference — unchanged from the P0 report.
7. **The CMS "named non-technical editor" is prose, not a gate.**
8. **Three AAA criteria need human assessment**, so AAA cannot be certified
   automatically.

### P2 — later hardening
9. `layout` and `stack` rule domains still empty.
10. Two implementations of the palette algorithm, held together by a parity test.
11. Theme mode defaults rather than being decided.
12. `expressiveness` remains an unvalidatable human assignment.
13. Page objective/audience inference is keyword-based.
14. Derived component `weightKb` values are estimates (now correctly TAGGED as
    such, so they cannot satisfy a measured gate).
15. `supportingSections` computed but only used for coverage.
16. Motion cap not enforced against selected components' `animated` flags.

---

## Rule Expansion Status

The 68/17 classification from the P0 report **stands unchanged**:

| Class | Count | Encode? |
|---|---:|---|
| Executable rule | 36 | yes, first |
| Validation / gate rule | 21 | yes, second |
| Scoring rule | 2 | yes, cheap |
| Human approval rule | 9 | yes, replaces the DD-098 composite |
| Documentation / reference | 17 | **no** |

**Rule expansion remains DEFERRED** until this foundation pass is validated in
use. The reason is now stronger than it was: the P1 work proved that the outputs
those rules will influence — SEO artifacts, tokens, evidence, accessibility
thresholds — are the parts that determine whether a rule has any effect. Encoding
a layout rule before a layout token existed would have produced a rule with
nothing to act on.

Two of the pending groups are now *cheaper* than before, because their consumers
exist: the SEO artifact rules (DD-092, DD-093, DD-095) and the quality-gate rules
(DD-108..DD-111) can now be encoded against real artifacts and a real gate model.

---

## Final Verdict

## READY FOR RULE EXPANSION

Unchanged in label, substantially stronger in substance. The P0 pass made the
architecture sound; this pass made it produce and validate concrete artifacts.

What the framework can now do that it could not before: emit per-page SEO values
with provenance and refuse to invent a domain; derive a complete, contrast-measured
token system from one seed, byte-identical to the authority it ports; consume real
build artifacts with four-way provenance and refuse an estimate where a
measurement is required; and enforce a stated accessibility target rather than
displaying it.

Evidence: typecheck PASS · **363 tests green (15 files)** · self-audit 11/11 with
0 FAIL · the same fixture now emits 5 pages of SEO artifacts, 28 colour tokens
across 22 measured contrast pairs, AAA thresholds of 7:1 and 44px, 18 approval
items and 25 publication requirements, and still returns an honest
`cannot_classify` naming the three gates it cannot yet evidence.

It is still NOT ready for a customer dry run. The decisive gap is now singular and
clear: **there is no generator.** The framework can specify a website completely
and validate one thoroughly; it cannot build one. Everything else on the P1 list
is small beside that.

Nothing was committed.


---
---

# Generator Phase

Fourth dry run, 2026-09-13, on the SAME fixture — now driven all the way to a
generated, built and evaluated website. Harness: `tests/dry-run/generate.test.ts`
(runs `runPipeline` → `generateWebsite` → `buildStaticSite` →
`collectArtifactsFromBuild` → `collectBuildEvidence` → `assessQuality`).
Validation: typecheck PASS, **422 tests green (17 files)**, self-audit
**11 checks / 0 FAIL / 2 WARN** (the two pre-existing WARNs, unchanged).

Full detail is in `docs/GENERATOR-IMPLEMENTATION-REPORT.md`. This section records
what the phase changed about the framework's readiness and what it exposed.

## What crossed the boundary

The framework previously ended at a specification and a set of gates. It now
produces a website from that specification and feeds the result back into the
same gates. On the fixture:

| Stage | Result |
|---|---|
| Generation | 20 files: 12 Next.js App Router source files, 8 static base-layer files |
| Pages | 5 planned → **5 generated**, in both hosts, 0 lost |
| Static build | 5/5 routes on disk, `404.html` present, 0 secrets, 1,012 ms |
| TSX syntax | 7 files parsed by the TypeScript compiler API, 0 errors |
| Served HTML (measured) | every page: exactly 1 `h1`, no heading skips, 5 internal links, 0 images without alt |
| Evaluation | `post_build`, level **`technically_working`**, weighted 76.7 |
| Gates | technical ✔ · responsive ✔ · design ✔ · **content ✘** · accessibility `unknown` · performance `unknown` |

The content gate failing is the fixture doing its job: the primary objective
`book_appointments` is blocked by unverified contact details, and the generator
rendered that route as an explicit *unavailable* notice rather than a form that
posts to nowhere.

## The structural finding of this phase

**The content inventory carries STATUS, not VALUES** — the third instance of one
class. `canonicalOrigin` (P1-1) and `brandSeed` (P1-2) were the same shape:
the contract recorded that a fact existed without recording the fact.
`propositionText: "verified_available"` says copy exists, not what it says.

Per `framework_update.md` step 6 a class seen twice must be fixed as a class.
`src/generation/content-values.ts` is that fix: one optional supplied-values
layer for every renderable category, resolving through the EXISTING
`CONFIDENCE_POLICY`. An unsupplied value becomes an explicit slot; nothing is
ever invented. The schema deliberately has no field for any §12 fabrication
category, so proof cannot enter a page except through the verified asset
inventory and `verifyContent()` — one authority, not two routes.

## Evidence honesty, as generated

| Field | Kind | Why |
|---|---|---|
| `servedHtml` | **measured** | 5 documents read back from disk, JS not executed |
| `dependencies` | **measured** | read from the emitted `package.json` |
| `technical` | **derived** | static build + TSX syntax only; `next build` NOT executed, and the source string says so |
| `routeInventory` | derived | from the fetched routes |
| `bundles`, `webVitals`, `accessibility` | **unavailable** | only a production build and a rendered-page audit can produce them |

The performance and accessibility gates therefore stay `unknown` — 14 mandatory
AAA criteria unclassified — and the level cannot rise above
`technically_working`. That is the correct answer for a site whose Next.js
build has not run.

## Refusals, as a first-class output

24 things the generator deliberately did not emit, each carrying its reason:
10 rejected patterns, 3 omitted dependencies (`three`, `@react-three/fiber`,
the map embed), 6 unresolved SEO artifacts (5 canonicals + sitemap, all needing
`canonicalOrigin`), 3 visible content slots, 2 hidden sections (legal, contact).
A test proves every rejected pattern's class is absent from output rather than
trusting it.

## Remaining Gaps (updated)

### P0
**None.**

### P1 — must fix before a customer dry run
1. **No host adapter.** `next build` is not executed; bundles and vitals stay
   `unavailable`. Installing `next`/`react` here would fail the framework's own
   dependency gate, so this belongs in a host project, not this repository.
2. **No accessibility audit runner.** The AAA gate stays `unknown` until a host
   supplies observations; three AAA criteria also need human assessment.
3. **`refine()` remains uninvoked.** The seam is now explicit
   (`manifest.refinementInput`), the loop is not.
4. **Content slots, not copy.** The generator never fills a slot; a drafting and
   approval step must exist for prose.
5. **Pages sharing an objective get identical architecture** (`/` and `/book`
   both carry the full booking section list).
6. **Asset files are not plumbed** — the gallery knows a verified asset exists,
   not its path.
7. hreflang / locale routing still ungoverned; `Q-*` checks still orphaned at
   Phase 1; the CMS editor requirement still prose.

### P2
8. `page-spec.ts` inference regexes include `clinic|clinician` among generic
   professional-role keywords (`professional|partner|trade|reseller`). Not
   fixture-specific LOGIC — the generator itself contains no fixture reference —
   but a reviewer could read it as fixture-flavoured. Worth moving keyword lists
   to configuration.
9. The static CSS is a faithful base layer, not a finished visual design.
10. Prior P2 items unchanged: empty `layout`/`stack` rule domains, two palette
    implementations held together by the parity test, unchosen theme default,
    unvalidatable `expressiveness`, estimated component weights (correctly
    tagged), unused `supportingSections`, motion cap not checked against
    `animated`.

## Rule Expansion Status

The 68/17 classification stands. What changed is the precondition: **the rules
now have a consumer.** Before this phase a layout rule would have altered a
string nobody read. Now `sectionArchitecture`, `selectedPatterns`, `tokens` and
`seoArtifacts` each drive emitted files, so a rule's effect is observable in
generated output and testable against it. Rule expansion is unblocked and should
be driven by what the generator's output is still missing — starting with the
layout/grid/hero group (DD-024..032), whose absence is visible in the flat static
CSS.

## Final Verdict

## READY FOR RULE EXPANSION

Unchanged in label; the substance moved decisively. The framework has crossed
from "specification + validation" to "specification + generation + validation":
a business input entered through the real pipeline, became 20 source files across
two hosts, was built, was read back from disk, and was gated by the same
evaluators that gated the plan — which correctly refused to certify it.

It is NOT ready for a customer dry run, and the reason is precise: two gates
cannot be decided without a host that runs `next build` and an accessibility
audit. Everything the framework can do without those, it now does.

Nothing was committed.

---

# Rule Expansion Report

Fifth run, 2026-09-13, on the SAME unseen fixture. The 68 rules the P0 report
classified as worth encoding are now encoded; the 17 it declined are not.
Harnesses: `tests/scenarios/rule-expansion.test.ts` (68 behaviour tests),
`tests/dry-run/execute.test.ts` (decide), `tests/dry-run/generate.test.ts`
(decide → generate → build → evidence → evaluate).

Validation: typecheck PASS · **493 tests green (18 files)** · self-audit
**11 checks / 0 FAIL / 2 WARN** (the two pre-existing WARNs, unchanged) ·
120 rule ids verified against the specification's headings · every encoded
rule's `§` section verified against the heading it sits under · every named
consumer module exists and cites the rule it consumes.

The optimisation target was not 120/120. It was: every important rule has one
authoritative consumer, produces observable behaviour, and is protected by a
test. Where a rule could not meet that, this report says so rule by rule.

## Coverage Before

| Bucket | Count |
|---|---:|
| Encoded | **35 / 120** |
| Pending | 85 |
| Intentionally not encoded | 0 (the bucket did not exist; declined rules sat in "pending") |
| Rules firing on the fixture | 20 |
| Rule ids cited by generated output | 0 |

## Coverage After

| Bucket | Count |
|---|---:|
| Encoded | **103 / 120** |
| Intentionally not encoded | 17 |
| Pending | **0** |
| Rules firing on the fixture | 82 (including `otherwise` branches) |
| Rule ids cited by generated output | 28 |

`ruleCoverage()` now reports three disjoint buckets that sum to 120, plus
`byClassification`, `byDomain`, `consumers` and a per-rule `trace`. A test asserts
the arithmetic, and a second test asserts the classification counts cannot be
read as "120 executable rules".

**By classification, all 103 encoded rules:**

| Class | Original 35 | New 68 | Total |
|---|---:|---:|---:|
| Executable (changes a decision value) | 18 | 20 | 38 |
| Gate (blocks, replaces, defers, requires) | 16 | 39 | 55 |
| Scoring (feeds an explicit score or cap) | 0 | 2 | 2 |
| Approval (produces an approval state) | 1 | 7 | 8 |

**By effect, the 68 new rules:**

| Effect | Count | Meaning |
|---|---:|---|
| NEW | 42 | observable behaviour this phase added — a changed decision, generated element, stylesheet block, gate verdict, score or note |
| CITE | 21 | an enforcement that already existed now carries the rule id; behaviour unchanged, audit trail added |
| RECORD | 5 | decision or obligation recorded, but nothing exists yet for it to act on: DD-034, DD-039, DD-041, DD-046, DD-119 |

**The classification moved for 21 rules** between the P0 plan (36 executable /
21 gate / 2 scoring / 9 approval) and the encoding (20 / 39 / 2 / 7). The plan
classified by what encoding would buy; the encoding classified by the effect the
rule actually has, using this phase's definitions. A rule that permits, forbids
or requires rather than choosing a value is a gate:

- **executable → gate (18):** DD-026, 028, 029 (layout eligibility, enforced by
  `forbid`), DD-031 (hero must answer four questions), DD-034, DD-036, DD-037
  (navigation and CTA constraints), DD-038, 039, 041, 043, 044 (component
  eligibility), DD-064, 069, 071, 073, 074, 075 (responsive and image
  requirements).
- **gate → executable (1):** DD-093 derives pages, which is a decision, not a block.
- **approval → executable (1):** DD-096 chooses between a logo file and a
  wordmark; it raises no approval.
- **approval → gate (1):** DD-106 forbids skeletons for unknown facts.

This drift is recorded for human review, not silently adopted. Every count in
this report uses the encoded class.

## Intentionally Not Encoded

The 17 rules below choose *between implementations* or describe a treatment. Each
is already governed by an authority that exists, and encoding it would create the
duplicate-authority defect this framework has fixed twice. They are exported as
`INTENTIONALLY_NOT_ENCODED`, each with its governing authority and reason; a test
asserts none is also encoded and none is cited by generated output.

| Rule | Governed by |
|---|---|
| DD-048 | pattern-registry tier ladder + select-elements implementation_complexity gate |
| DD-049 | `motionLibrariesForTier` in the stack selector |
| DD-050 | `motionLibrariesForTier` in the stack selector |
| DD-051 | animation_library.md four-job gate + DD-046 motion purpose |
| DD-052 | pattern-registry parallax-depth (expressiveness high) + DD-047 reduced motion |
| DD-054 | pattern-registry magnetic-action + select-elements §7 value questions |
| DD-055 | DD-053 cursor follower + pattern-registry cursor-follower |
| DD-056 | DD-046 motion purpose + DD-047 reduced motion + industry avoid lists |
| DD-057 | pattern-registry tier `lottie` + budget lazy loading |
| DD-058 | pattern-registry tier `svg` + DD-089 animatable properties |
| DD-060 | DD-082 canvas/WebGL alternative + DD-059 3D eligibility + DD-084 budget gate |
| DD-061 | stack selector `requiresCapability: spatial_3d` |
| DD-062 | pattern-registry perspective-card vs 3d-product-view (tier + expressiveness) |
| DD-063 | pattern-registry 3d-product-view unlocked by `product_configurator` |
| DD-116 | expression ceiling + DD-020 measured contrast |
| DD-117 | DD-018 futuristic + DD-020 contrast + expression ceiling |
| DD-118 | expression ceiling + route budgets |

## Rule-by-Rule Traceability

Every rule declares `classification`, `consumer` and `sourceSection`. The chain
for each is **rule → evaluator draft (`output.decisions`) → named consumer →
generated element, stylesheet block, gate or score → test**. Rules with consumer
`evaluator` act through the draft directly (architecture, motion cap, layout
strategy). Generated nodes carry `rule:DD-nnn` in `traceTo`, stylesheet blocks are
labelled with their id, and `manifest.rulesCited` collects both.

| Rule | Title | § | Planned → encoded class | Consumer | Decision | Observable result | Effect | Test |
|---|---|---|---|---|---|---|---|---|
| DD-009 | Hospitality/travel | §4.1 | executable | `evaluator` | hero.pattern, motion.cap, sectionArchitecture (+amenities, policies) | sections and motion tokens change for hospitality with strong imagery | NEW | DD-009 + negative |
| DD-011 | Sports/fitness | §4.1 | executable | `evaluator` | typography.strategy, motion.cap=medium, sectionArchitecture (+schedule, registration) | architecture + motion tokens; conflict with DD-014 reported | NEW | DD-011 + conflict |
| DD-012 | Media/editorial | §4.1 | executable | `evaluator` | layout.system, sectionArchitecture (+topic_hub, article_index) | architecture for dense media | NEW | DD-012 + negative |
| DD-017 | Editorial personality | §4.2 | executable | `evaluator` | layout.grid=editorial_grid, typography.hierarchy | `layoutStrategy.grid`; no false conflict with DD-008/DD-014/DD-021 | NEW | conflict test |
| DD-022 | Reading measure | §4.3 | executable | `generation/render/css.ts` | typography.bodyMeasure | CSS: `p, .c-prose, li, dd { max-width: … }` | NEW | cap test |
| DD-023 | Large type | §4.3 | executable | `generation/render/css.ts` | typography.displayScale | CSS: clamped expressive h1 vs token h1 | NEW | DD-023 + negative |
| DD-024 | Container strategy | §4.4 | executable | `generation/render/css.ts` | layout.pageContainers / proseContainer / fullBleedMedia | CSS: bounded containers, full bleed only on `[data-full-bleed=justified]` | NEW | served CSS |
| DD-025 | Grid selection | §4.4 | executable | `generation/render/css.ts` | layout.repeatedItems | CSS: responsive grid vs single column | NEW | DD-025/067 + negative |
| DD-026 | Bento selection | §4.4 | executable → **gate** | `design-intelligence/engine/select-elements.ts` | layout.bentoAllowed / forbid bento-grid | selection gate 1 rejection reason names DD-026 | CITE | DD-026/028/029 |
| DD-027 | Editorial layout selection | §4.4 | executable | `evaluator` | layout.grid, layout.readingRail | `layoutStrategy.readingRail` | NEW | conflict test |
| DD-028 | Asymmetric layout selection | §4.4 | executable → **gate** | `design-intelligence/engine/select-elements.ts` | layout.asymmetryAllowed / forbid asymmetric-composition | gate 1 reason names DD-028; creative business admitted | CITE | DD-028 + negative |
| DD-029 | Full-bleed media | §4.4 | executable → **gate** | `design-intelligence/engine/select-elements.ts` | layout.fullBleedAllowed / forbid full-bleed-media | gate 1 reason names DD-029 | CITE | DD-026/028/029 |
| DD-030 | Split hero | §4.4 | executable | `generation/component-model.ts` | hero.layout | HTML `c-hero--split`; CSS two-column from expanded range | NEW | DD-030 split vs vertical |
| DD-031 | Hero content | §4.4 | executable → **gate** | `generation/component-model.ts` | hero.mustAnswer | hero `For <audience>` line; next step = action or slot | NEW | DD-031 |
| DD-032 | Proof before conversion | §4.4 | executable | `generation/component-model.ts` | conversion.proofPlacement | section order: conversion sections moved last; `reorderedBy` | NEW | DD-032 + negative |
| DD-033 | Navigation depth | §4.5 | executable | `generation/component-model.ts` | nav.structure | `aria-current="page"` in both hosts | NEW | DD-033 |
| DD-034 | Mobile navigation | §4.5 | executable → **gate** | `generation/component-model.ts` | nav.compactMode, forbid hover_only_mega_menu | trace only; a wrapping link list already has route parity, so no drawer is emitted | RECORD | trace |
| DD-035 | CTA specificity | §4.5 | executable | `generation/component-model.ts` | cta.labelPolicy | label from destination section or objective; `Contact us` only as recorded fallback | NEW | DD-035 ×2 |
| DD-036 | CTA competition | §4.5 | executable → **gate** | `generation/component-model.ts` | cta.primaryCount=1 | at most one distinct action label per page | NEW | DD-036 |
| DD-037 | Sticky CTA | §4.5 | executable → **gate** | `generation/component-model.ts` | cta.sticky | `c-sticky-cta` only when verified + mobile + high intent; else inline repeat | NEW | DD-037 + negative |
| DD-038 | Card usage | §4.6 | executable → **gate** | `generation/component-model.ts` | components.repeatedItems | card grid vs definition list | NEW | DD-038 + negative |
| DD-039 | Expandable cards | §4.6 | executable → **gate** | `generation/component-model.ts` | components.expandableCards | trace only; cards never collapse content today | RECORD | trace |
| DD-040 | Accordion | §4.6 | executable | `generation/component-model.ts` | components.faq | native details/summary (pre-existing) now cites DD-040 | CITE | DD-040/041 |
| DD-041 | Tabs | §4.6 | executable → **gate** | `generation/component-model.ts` | forbid tabs_hiding_main_content | no tab component exists; test asserts none is emitted | RECORD | DD-040/041 |
| DD-042 | Gallery selection | §4.6 | executable | `design-intelligence/engine/select-elements.ts` | components.gallery, forbid carousel/hover-only info | gate 1 reasons name DD-042 alongside DD-113/DD-068 | CITE | DD-042/043 |
| DD-043 | Carousel limits | §4.6 | executable → **gate** | `design-intelligence/engine/select-elements.ts` | components.carousel, forbid auto-rotating-carousel | gate 1 reason names DD-043 | CITE | DD-042/043 |
| DD-044 | Before/after | §4.6 | executable → **gate** | `design-intelligence/engine/select-elements.ts` | components.beforeAfter / forbid before-after | before-after REJECTED without a matched verified pair (was deferred) | NEW | DD-044 + negative |
| DD-045 | Micro-interactions | §4.7 | gate | `generation/render/css.ts` | interaction.stateFeedback | CSS: pressed/selected/busy/invalid/status states | NEW | DD-045/089 |
| DD-046 | Motion purpose | §4.7 | gate | `design-intelligence/engine/select-elements.ts` | forbid animation_without_stated_purpose | no pattern id to act on; blocked on the dry-run fixture by its own unless | RECORD | none |
| DD-064 | Responsive principle | §4.9 | executable → **gate** | `responsive/capabilities.ts` | require capability-based evaluation | capability model cites it; no device names (asserted) | CITE | DD-064/071/073 |
| DD-067 | Responsive card grid | §4.9 | executable | `generation/render/css.ts` | layout.cardColumns=auto_fit_minmax | CSS `repeat(auto-fit, minmax(min(100%, 16rem), 1fr))` | NEW | DD-025/067 |
| DD-069 | Safe area | §4.9 | executable → **gate** | `generation/render/css.ts` | layout.fixedUiPadding | CSS `env(safe-area-inset-*)`, sticky bar yields to a focused form | NEW | DD-037, DD-069/070/078 |
| DD-070 | Dynamic mobile viewport | §4.9 | executable | `generation/render/css.ts` | layout.viewportHeightUnit | CSS `min(60svh, 40rem)`; no `100vh` declaration | NEW | DD-069/070/078 |
| DD-071 | Orientation | §4.9 | executable → **gate** | `responsive/capabilities.ts` | forbid orientation_lock | landscape profile (pre-existing) cites it | CITE | DD-064/071/073 |
| DD-072 | Large screens | §4.9 | executable | `generation/render/css.ts` | cap typography.readingMeasureMax=80ch | CSS `min(var(--measure), 80ch)` — required a new registered scale | NEW | cap test |
| DD-073 | Foldables | §4.9 | executable → **gate** | `responsive/transformations.ts` | require hinge-safe layout | `foldableSegments>=2` reflows essential/form/CTA; new mandatory profile | NEW | DD-073 + negative |
| DD-074 | Responsive image sizing | §4.9 | executable → **gate** | `generation/render/html.ts` | require width/height | `<img width height>` from verified asset files; `imagesWithoutDimensions` evidence | NEW | DD-074/081/085 |
| DD-075 | Next Image usage | §4.9 | executable → **gate** | `generation/emit/nextjs.ts` | require next/image sizes | Next source: `<Image … sizes>`; `priority` only on hero | NEW | DD-075 |
| DD-076 | Semantic first | §4.10 | gate | `generation/render/html.ts` | a11y.elementPolicy | renderer cites it; test asserts no div/span buttons | CITE | DD-076 |
| DD-077 | Keyboard equivalence | §4.10 | gate | `accessibility/evaluate.ts` | require keyboard + visible focus | §G.1 hard checks cite it | CITE | existing a11y suite |
| DD-078 | Focus not obscured | §4.10 | gate | `generation/render/css.ts` | a11y.stickyChrome | CSS `scroll-padding-block` + `scroll-margin-block` | NEW | DD-069/070/078 |
| DD-080 | Motion accessibility | §4.10 | gate | `accessibility/evaluate.ts` | require pause + reduced motion | §G.1 reduced-motion check cites it | CITE | existing a11y suite |
| DD-081 | Image alt policy | §4.10 | gate | `generation/render/html.ts` | images.altPolicy | every `<img>` has alt; decorative = `alt=""`; logo alt falls back to name | NEW | DD-074/081/085, DD-096 |
| DD-083 | Forms | §4.10 | gate | `generation/component-model.ts` | forms.policy | per-field error region, autocomplete, `role=status` live region | NEW | DD-083 |
| DD-085 | LCP media | §4.11 | gate | `generation/render/html.ts` | images.heroPriority / belowFoldLoading | hero `fetchpriority=high`, rest `loading=lazy`; evidence counters | NEW | DD-074/081/085 |
| DD-087 | Client JS minimization | §4.11 | gate | `generation/emit/nextjs.ts` | rendering.componentDefault | client-boundary discipline (pre-existing) cites it | CITE | existing generator suite |
| DD-088 | Lazy loading advanced modules | §4.11 | gate | `performance/budgets.ts` | performance.heavyModuleLoading | `enforceBudget` defer step cites it | CITE | existing performance suite |
| DD-089 | Animation properties | §4.11 | gate | `generation/render/css.ts` | motion.animatableProperties | CSS `transition-property: transform, opacity` | NEW | DD-045/089 |
| DD-090 | Third-party embeds | §4.11 | gate | `stack/select-stack.ts` | performance.embedLoading | stack's lazy map-embed entry cites it | CITE | existing stack suite |
| DD-092 | Metadata | §4.12 | gate | `seo/artifacts.ts` | seo.metadataPolicy | artifact title/duplicate check cites it; distinct titles on derived pages | CITE | DD-092 |
| DD-093 | Content hubs | §4.12 | gate → **executable** | `generation/page-spec.ts` | seo.contentHubs | `/services/<slug>` pages for offers WITH descriptions; `contentHubs` records refusals | NEW | DD-093 + 2 negatives |
| DD-095 | Image SEO | §4.12 | gate | `generation/render/html.ts` | require alt + dimensions | SEO score deducts for unsized images; evidence field | NEW | DD-095/086 |
| DD-096 | Missing logo | §4.13 | approval → **executable** | `generation/component-model.ts` | identity.mark | header brand: verified logo file, else wordmark of the verified name | NEW | DD-096 ×2 |
| DD-099 | Missing customer logos | §4.13 | approval | `content/verification.ts` | approval: customer logos | verdict `ruleId`; withheld reason cites DD-099; approval item raised | NEW | DD-099..104 |
| DD-100 | Missing awards/statistics/certifications/reviews | §4.13 | approval | `content/verification.ts` | approval: badges/ratings/metrics | verdict `ruleId` on awards, reviews, certifications, statistics | NEW | DD-099..104 |
| DD-101 | Missing contact details | §4.13 | approval | `content/verification.ts` | contact.publicCta | blocked path cites DD-101; primary action WITHHELD, not pointed at nothing | NEW | DD-101 + negative |
| DD-102 | Missing pricing | §4.13 | approval | `content/verification.ts` | approval: pricing | verdict `ruleId`; approval item raised | NEW | DD-099..104 |
| DD-103 | Missing product imagery | §4.13 | approval | `content/verification.ts` | commerce.publicPurchase | blocked sell path cites DD-103 | NEW | DD-103 |
| DD-104 | Missing portfolio/case study | §4.13 | approval | `content/verification.ts` | approval: portfolio | verdict `ruleId` on case studies and portfolio | NEW | DD-099..104 |
| DD-105 | AI draft content | §4.13 | approval | `content/confidence.ts` | content.aiDraftPolicy | `ai_draft` confidence policy cites it; approval item raised | CITE | existing content suite |
| DD-106 | Empty state vs skeleton | §4.13 | approval → **gate** | `generation/component-model.ts` | content.absentAssetState | every slot traces DD-106; no skeleton anywhere (asserted) | CITE | DD-106 |
| DD-108 | Quality score threshold | §4.14 | gate | `quality/scoring.ts` | quality.thresholds | scorer thresholds moved to ONE exported home the rule reads | CITE | DD-108 |
| DD-109 | Hard accessibility gate | §4.14 | gate | `quality/gate-derivation.ts` | quality.accessibilityGate | accessibility blockers cite DD-109 | CITE | DD-109 |
| DD-110 | Hard content integrity gate | §4.14 | gate | `quality/gate-derivation.ts` | quality.contentGate | content gate cites it | CITE | existing quality suite |
| DD-111 | Hard performance gate | §4.14 | gate | `performance/budgets.ts` | quality.performanceGate | budget downgrade step cites it | CITE | existing performance suite |
| DD-112 | World-class differentiation | §4.14 | scoring | `quality/scoring.ts` | targetQuality → evaluation.target | `target.met`/`gap`; stated world-class adds obligations and a note | NEW | DD-112 ×3 |
| DD-119 | Horizontal scrolling | §4.15 | gate | `design-intelligence/engine/select-elements.ts` | forbid horizontal nav / scroll hijacking | no such pattern exists in the registry, so nothing to reject | RECORD | none |
| DD-120 | Minimum selected-effect policy | §4.15 | scoring | `design-intelligence/engine/select-elements.ts` | selection caps | caps from one home; 2nd immersive pattern fails the frequency gate; below-minimum note | NEW | DD-120 ×3 |

## Behavioral Changes

### On the unseen fixture, before → after

| Measure | Before (35 rules) | After (103 rules) | Explained by |
|---|---|---|---|
| Rules firing | 20 | 82 | 68 new rules; most carry an `otherwise` branch |
| Rule conflicts | 0 | **0** | DD-017/DD-027 retargeted to the grid axis (below) |
| Selected patterns | data-diagram, structured-content-rail, split-hero, interactive-gallery, timeline | **unchanged** | no new rule admits or evicts these |
| Rejected patterns | 10 | **11** | `before-after` now REJECTED by DD-044 (no matched verified pair). Verified by re-running selection with DD-044's forbid removed: the outcome reverts to `defer` at content readiness |
| Rejections naming their rule | 0 | 7 of 11 | forbid provenance (`forbiddenBy`) reaches gate 1; the other 4 are industry `poorFor` exclusions |
| Pages | 5 | 5 | DD-093 derived **no** hub page: none of the 6 offers has a supplied description, and all 6 refusals are recorded in `contentHubs` |
| Generated files | 20 | 20 | — |
| Component nodes | 63 | 75 | brand node per page (DD-096), hero audience line and next-step slot (DD-031), inline CTA repeat (DD-037) |
| Refusals | 24 | 25 | + `before-after` (DD-044) |
| Section order | spec order | proof before conversion on `/`, `/book`, `/devices` | DD-032, regulated purchase cycle |
| Primary actions | not modelled | `/devices`: "Go to checkout", repeated inline; `/`, `/book`: WITHHELD, citing DD-101; `/conditions`, `/for-clinicians`: WITHHELD, no conversion surface | DD-035, DD-036, DD-037, DD-101 |
| Sticky CTA | none | none | DD-037: mobile share and intent are high, but the contact endpoint is unverified |
| Human approvals | 18 | 26 | + DD-099, 100, 101, 102, 103, 104, 105, 112 |
| Stylesheet | tokens + base + ranges; one rule label (DD-065) | rule labels for 13 rules | DD-022..025, 030, 045, 067, 069, 070, 072, 078, 089 added |
| Blocker text | "blocked conversion path(s): book_appointments (needs verified: addresses)" | same, `; DD-101` appended | verdict now names its rule |
| Pre-build level / score | `cannot_classify`, 73.1 | `cannot_classify`, **73.1** | — |
| Post-build level / score | `technically_working`, 76.7 | `technically_working`, **76.7** | — |
| Gates | technical ✔ responsive ✔ design ✔ content ✘ accessibility ? performance ? | **unchanged** | — |
| Served HTML (measured) | 1 h1/page, 5 internal links, 0 images without alt, SEO 9 | **unchanged**; 0 images | no asset files are supplied by the fixture |
| AAA criteria unclassified | 14 | 14 | no accessibility audit runner |
| Dependencies | next, react, react-dom, next-intl, react-hook-form, zod | **unchanged**; three, @react-three/fiber, map embed still omitted | — |

**Why the score did not move, and why that is correct.** The 68 rules change
structure, markup and CSS. The weighted score is computed from criteria those
rules do not feed: gate outcomes, measured contrast, token validity, objective
coverage and the responsive audit. The two gates that cap the level,
accessibility and performance, need evidence only a production build and a
rendered-page audit can supply, and no rule can manufacture that evidence. A
score that rose here would have been rules grading their own output. The
content gate still fails for the same honest reason, and now names DD-101.

### Across the other fixtures

| Input | Change a rule caused |
|---|---|
| Healthcare | hero `vertical` (DD-030); booking moved after contact (DD-032); CTA withheld (DD-101); layout eligibility rejections cite DD-026/028/029; DD-120 notes that only 1 element survived the gates |
| SaaS | hero `split` (DD-030); `/start-free-trial` action "Start a free trial" repeated inline (DD-035, DD-037); DD-093 records both plans as refused, no description |
| Ecommerce | `inline_repeated`, never sticky: endpoint unverified (DD-037); auto-carousel and hover-only product info forbidden (DD-042, DD-043) |
| Creative | `before-after` allowed with a matched pair (DD-044); asymmetric composition admitted (DD-028); 0 conflicts — three false conflicts appeared mid-phase when DD-017/DD-027 first landed, and were fixed (defect 2) |
| Verified mobile booking business | sticky, safe-area-aware CTA (DD-037, DD-069); form with error regions, autocomplete and live status (DD-083) |
| Offers with supplied descriptions, high SEO dependency | one indexable `/services/<slug>` page each, linked from navigation, distinct titles (DD-093, DD-092) |
| Verified asset files supplied | sized `<img>` with alt, one `fetchpriority="high"` hero, lazy rest (DD-074, 081, 085); `next/image` with `sizes` (DD-075); logo file in the header (DD-096) |

### Defects the rule tests found, fixed as system fixes

1. **A `cap` on an unregistered target was a silent no-op.** DD-072's `80ch`
   measure cap sat on no ordered scale, so the evaluator dropped it and the rule
   looked encoded while changing nothing. Fix: `READING_MEASURE_MAX_ORDER` and a
   single `CAP_TARGET_SCALE` mapping in `src/design-system/scales.ts`, shared by
   the evaluator and the rule schema. The schema now **rejects** an unregistered
   cap target or off-scale value when the rule is written.
2. **Three false conflicts on every editorial business.** DD-017 (personality)
   and DD-027 (long form) wrote `layout.system`, `typography.strategy` and
   `typography.readingMeasure`, which belong to the industry rules. Fix: they now
   write the grid and hierarchy axes (`layout.grid`, `typography.hierarchy`,
   `typography.measurePolicy`), surfaced as `layoutStrategy.grid` and
   `layoutStrategy.readingRail`. The genuine industry-vs-personality conflict,
   DD-011 vs DD-014 on a premium fitness business, is still **reported**.
3. **Derived pages never received supporting sections.** A supplied FAQ could not
   render on a site with no owner-supplied pages. Fix: derived pages apply the
   same renderable-supporting-section rule as owner pages.
4. **A CTA label did not match its destination.** `/devices` read "Browse
   products" while jumping to its checkout form. Fix: the label follows the
   on-page conversion section, else the objective, else the recorded fallback.
5. **DD-093 could claim one route twice.** Two offers slugifying identically
   produced duplicate pages. Fix: routes are claimed as they are derived; the
   second offer is refused with a recorded reason.
6. **Verdict and forbid provenance was missing.** Rejections said "forbidden by an
   applied rule". `forbiddenBy` now carries the rule ids to gate 1, and each
   content verdict carries `ruleId`.

Two supporting single-authority moves: DD-108's thresholds live once in
`src/quality/scoring.ts` and DD-120's caps once in
`src/design-intelligence/engine/select-elements.ts`; the rules import them and
tests assert equality.

## Regression Results

| Safety property | Result | Protected by |
|---|---|---|
| No resurrected dependency | PASS — `three`, `@react-three/fiber`, map embed still omitted; dependency list byte-identical | rule-expansion regression block |
| No fabricated content | PASS — no fabrication category or proof phrasing in any generated HTML; asset files for unverified assets are refused | regression + DD-074 negative |
| Pages survive | PASS — 5/5 owner pages in model, static layer and Next source | regression block; generator suite |
| SEO not bypassed | PASS — `<title>` equals the SEO artifact on every page; SEO measured 9 | regression block |
| AAA not bypassed | PASS — target preserved verbatim; 14 criteria unclassified; gate `unknown` | regression block |
| Unknown never passes | PASS — pre-build `cannot_classify`; technical and accessibility `unknown` | regression block |
| Order-independent evaluation | PASS — forward and reversed corpora yield identical forbids, obligations, conflict targets and agreed values on three fixtures | conflict block |
| Cap monotonic / forbid permanent | PASS — DD-072 cap reaches CSS; unregistered caps rejected at parse | conflict block; evaluator suite |
| Conflicts reported | PASS — DD-011 vs DD-014 reported; no false conflicts on creative | conflict block |
| Gates before scores | PASS — DD-120 below-minimum is a note, never a blocker; gate failures carry `score: null` | DD-120 block; selection suite |
| Determinism | PASS — identical output JSON across runs with 103 rules | regression block |
| Generator holds no fixture logic | PASS — caught a fixture name in a comment this phase; removed | generator suite |
| All prior tests | PASS — every prior test green, after three intentional assertion updates: the email field's new attributes (DD-083), coverage arithmetic (three buckets), and an unregistered cap now rejected at parse time rather than ignored | full suite |

## Remaining Gaps

### P0
**None.**

### P1 — must fix before a real customer dry run
1. **No host adapter.** `next build` is not executed, so bundles and vitals stay
   `unavailable` and the performance gate stays `unknown`. Unchanged.
2. **No accessibility audit runner.** 14 mandatory AAA criteria stay
   unclassified; three need human assessment. Unchanged.
3. **Conversion forms are generic.** Booking and checkout sections render the same
   name/email/message form. Now that DD-035 labels the action "Go to checkout",
   the mismatch between label and form is more visible, not less.
4. **Prose slots have no drafting and approval workflow.** Unchanged.
5. **`refine()` remains uninvoked.** Unchanged.
6. **hreflang and locale routing are ungoverned**, and the CMS editor requirement
   is still prose. Unchanged.

Closed this phase: *asset files are not plumbed* (P1-6 of the generator phase).
Logo, hero and product files now flow from `suppliedContent.assets`, gated by the
inventory. The fixture supplies none, so on it the image rules are proven only by
synthetic inputs.

### P2
7. **Five record-only rules** (DD-034, 039, 041, 046, 119) have nothing to act on:
   no drawer navigation, no collapsing card, no tab component, no purposeless
   motion pattern id, no horizontal-scroll pattern. Either give them a target when
   such a component exists, or reclassify them as reference.
8. **21 rules were reclassified** from the P0 plan. The encoded classes need a
   human review before the counts are relied on externally.
9. **DD-011 vs DD-014** is a reported, unresolved conflict. Industry versus
   personality precedence is a design decision for a person, not an evaluation
   order.
10. **Sticky CTA focus yielding uses `:has()`.** A browser without it keeps the
    bar sticky over a focused field. The responsive engine's keyboard rule models
    the requirement; the CSS fallback does not yet enforce it everywhere.
11. `service_detail` is a generator-only section name, not in the canonical
    section vocabulary.
12. Prior P2 items unchanged: keyword lists in page inference, static CSS as a base
    layer rather than a finished visual design, two palette implementations held
    by a parity test, unchosen theme default, estimated component weights.

## Final Verdict

## RULE EXPANSION COMPLETE — NOT READY FOR A REAL CUSTOMER DRY RUN

The rule corpus is now 103 of 120 encoded, 17 deliberately governed elsewhere,
and 0 pending. 42 of the 68 new rules change what the framework decides,
generates or gates, and each is pinned by a behaviour test with a negative case.
21 attach an audit trail to enforcement that already existed. 5 are honest
records with nothing yet to act on. The expansion also found and fixed six
defects, including one that let an encoded rule silently do nothing.

The customer-dry-run blockers are the same two that ended the generator phase,
plus one this phase made visible. A production build and an accessibility audit
must run in a host project before two gates can be decided. Conversion forms must
match the action they are labelled with. The fixture's level, score and gates are
unchanged, and that is the correct result: no rule can supply the evidence those
gates need.

Nothing was committed.
