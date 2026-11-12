# WEBSITE FLOW — master pipeline for {SITE_REPO}
<!-- Save as: /website_workflow/website_flow.md -->
<!-- This is THE starting file. Everything begins here. -->
<!-- Entry points that feed this file:
     /wrequest  → produces a filled website_new.md / website_correction.md / website_bug.md
     /brainstorm → Track F; its DECISION SUMMARY calls this file when a build is decided
     /website   → runs this file directly on an already-filled request file
     /wcreate   → AUTOPILOT: raw context in, this file run end to end, one
                  owner review at the end (autopilot.md) -->

You are the pipeline runner for the {SITE_NAME} marketing website
(Next.js App Router + Tailwind + Supabase, deployed on Vercel).
Input: exactly ONE filled request file (website_new.md, website_correction.md,
website_bug.md, or — in AUTOPILOT — the context_brief.md the run wrote
itself). If you were given rough words instead of a filled file, STOP and
tell the owner to run /wrequest first — unless the run was started by
/wcreate, which turns rough context into the brief (autopilot.md STEP 1).
If you were given a dilemma with no clear action, STOP and route to
/brainstorm.

## PRIME DIRECTIVE — QUESTION EVERYTHING BEFORE CREATE/MODIFY
No pixel, image, phrase, section, or query is added or changed until it has
survived the INTERROGATION (checklists/interrogation_checklist.md). "It looks
fine" is not evidence. Every gate below requires written answers, and QA gates
require captured evidence (screenshots / test output). A step with missing
evidence is FAILED, not "probably fine".

## SECOND DIRECTIVE — DECIDE BY FRAMEWORK, NOT TASTE
Whenever 2+ genuine options exist (this image vs that image, image vs video
vs animation, headline A vs B, layout X vs Y), the choice is made with
decision_matrix.md — scored, evidenced, winner declared, losers logged.
Strategic questions additionally require the web research mandated in
strategy_audit.md. An unscored choice between real alternatives is a
framework violation.

## REPO MAP (ground truth — verify before trusting)
- Pages: app/page.tsx (landing), app/audit, app/demo, app/pricing, app/pay,
  app/payments, app/checkout/[orderId], app/paymentSuccess/[orderId],
  app/feedback, app/delete-account, app/[academy-slug]/join, legal pages.
- Sections/components: components/landing/** (sections/, elements/, popups,
  header), components/ui/** (shared), components/legal/**.
- Supabase touchpoints: lib/supabase.ts, app/api/** (book-demo, check-email,
  otp, newsletter-subscribe, feedback, audit-email, create-order, daily-counts,
  demo-bookings-count, payment-academy-phone, send-checklist, delete-account,
  ems), supabase/migrations/**, supabase/functions/**, supabase_setup.sql.
- Config/brand: ONE canonical GENERATED token file is the only place colour
  values live (color_system.md; produced by tools/generate_palette.py from
  {BRAND_SEED}). Name it in the Phase 2 plan — typically app/globals.css for
  a web stack. It carries a do-not-hand-edit header: change the seed and
  regenerate, never edit the output. Other config (lib/brand.ts,
  lib/config/promo.ts, tailwind.config.ts) may REFERENCE those tokens but
  must not define colour values of its own.
  Prevents: four plausible homes for a brand colour with none canonical, and
  a hand-copy from site_profile.md into code that nothing verified. Tests: tests/**, playwright.config.ts.
- Truth files: website_workflow/app_reality.md (what the app really does —
  the site may never claim more than this file).

## GATE REVIEW DEPTH (every gate names what it is asking the owner for)
A gate that only says "approve" invites a rubber stamp. Each gate below
states which depth it needs, and the request to the owner must name it:
- CONCEPTUAL — is this the right thing to do at all? (scope, classification,
  strategy, option choice)
- DETAILED — read every line of the proposed change as written.
- EVIDENCE — artifacts exist, were actually inspected, and support the claim.
Default by gate: GATE 0 conceptual · GATE S conceptual · GATE 1 conceptual +
detailed · GATE 2 detailed · GATE 3 detailed + evidence · GATE 5 evidence.
The owner may always escalate a gate's depth; Claude may never quietly
lower it.

## RUN MODES (who adjudicates the gates — the checks are identical)
- GATED (default for /website): every gate below waits for the owner.
- AUTOPILOT (/wcreate, website_workflow/autopilot.md): every phase and
  every check still runs, but the run adjudicates each gate in writing in
  the GATE LEDGER and the owner reviews ONCE, at the end, with the REVIEW
  PACK. Read "GATE n (owner)" below as "GATE n (ledger entry)" in this mode.
  A gate still fails without its evidence; autopilot removes the waiting,
  never the proof. Production release, production data, paid services and
  unsupplied business facts stay behind the owner in both modes
  (autopilot.md STEP 4).
  Prevents: an owner with context and no time bypassing the pipeline
  entirely because its only entry demanded a filled form and seven
  approvals.

## PHASES (run in order; each gate blocks the next)

### PHASE 0 — INTAKE & CLASSIFY
1. Read the request file completely. List every "unknown" field. If the
   request cites or is derived from an external plan/spec document, read
   THAT document too — do not rely on the request file's summary of it.
   Cross-check CONTENT INPUTS > Images against every visual/media reference
   the source document itself names (a dedicated image-prompt section is
   common in owner-authored plans). A named asset absent from both is a
   dropped requirement, flagged now — never discovered after Phase 5.
   Prevents: the 2026-08-24 UniqBotz run, where the owner's plan named 8
   AI-generation scenes for the locked brand character and the request
   file's Images field captured 1; the other 7 were never built, deferred,
   or even mentioned in the site's own 13-point self-audit, because nothing
   after intake re-read the source document.
2. Classify blast radius: copy-only / single-section / multi-page /
   Supabase-touching / config-brand-touching.
2b. ARCHITECTURE classify (website_workflow/stack_doctrine.md): does the
   request imply a NEW dependency, a new rendering strategy, or any
   default-deny category (PWA/service worker/offline, global client state,
   auth/accounts, a database or backend beyond {STACK}, app-style
   navigation, client-rendered indexable content, a headless CMS, a utility
   library)? yes/unknown → that file's DEPENDENCY GATE and PROFILE B scoring
   become MANDATORY at Phase 2, and the material is DENIED until the owner
   approves it. Answer this from the request's OUTCOME, not its wording: a
   request never says "add a service worker", it says "it should work
   offline".
   Prevents: architecture and dependency choices — the least reversible
   class in the repo — being the only class that reached Phase 4 with no
   gate having asked about them.
3. If Supabase-touching → supabase_review.md becomes MANDATORY at Phase 3.
4. Classify STRATEGIC or MECHANICAL:
   STRATEGIC = touches positioning/messaging, hero, pricing presentation,
   new page/section, CTAs, lead magnets, media-format choice, or any claim
   about the product → strategy_audit.md (Phase S) becomes MANDATORY.
   MECHANICAL = typo, bug fix, spacing fix, executing an already-decided
   spec → Phase S skipped (but S3 app-reality check still applies to any
   change that alters a product claim).
5. GATE 0 (owner): confirm scope + classification, unknowns resolved or
   explicitly deferred.

### PHASE S — STRATEGY AUDIT (only if STRATEGIC)
Run strategy_audit.md in full: S1 positioning verification, S2 competitor
teardown (mandatory WebSearch/WebFetch evidence), S3 app-reality sync
against app_reality.md, the VISUAL CONCEPT (website_workflow/visual_concept.md
— the core idea sentence, 3+ candidates from different families, the six
tests, a scored winner and a VISUAL BRIEF, plus the PAGE STORY for every
section) BEFORE S4's media-format decision matrix, S5 conversion
architecture, S6 verdict. A new page with a hero and no concept decision is
a Phase S FAIL: the format question ("image or animation?") may not be
asked before the content question ("what must the picture say?").
Prevents: the hero defaulting to a device mockup because the only media
question the pipeline asked was which file type to use. All multi-option choices scored with
decision_matrix.md. Skills: market-research-specialist,
competitive-research-specialist, jobs-to-be-done-expert,
academy-owner-psychology-expert, conversion-ux-specialist,
customer-trust-expert, animation-style-selector (media slots),
lead-magnet-asset-builder (ladder rungs),
saas-website-visual-storytelling-director + hero-section-cro-specialist +
scroll-engagement-pacing-designer (visual concept and page story).
GATE S (owner): STRATEGY VERDICT + VISUAL BRIEF approved. No design work
before this gate.

### PHASE 1 — INTERROGATION (the 10 questions)
Run checklists/interrogation_checklist.md against the PROPOSED change,
question by question, in writing. Skills to invoke here:
design-reviewer, visual-hierarchy-expert, spacing-grid-system,
conversion-ux-specialist, simplicity-auditor, existing-ui-consistency-checker,
color-psychology-expert, typography-expert, academy-owner-psychology-expert
(audience lens), accessibility-specialist.
Output: INTERROGATION VERDICT — for each of the 10 questions:
PASS / FAIL+fix / N-A+reason. Any FAIL loops back to redesign before code.
Plus the LIBRARY SCREEN block (design_library.md Stage 4) for every design
slot in scope.
GATE 1 (owner): approve the verdict + the exact element/content list + the
shortlist. The owner may promote a DEFERRED entry into the matrix here —
logged as an owner override, which is the intended escape hatch from the
top-3 cap, not a framework breach.

### PHASE 2 — DESIGN & PLAN
0. DESIGN DECISION INTELLIGENCE (src/, docs/DESIGN-INTELLIGENCE-SPEC.md) — when
   the change is a NEW site, a new page, or any structural/strategic change, run
   the decision engine first and attach its ImplementationContract to this plan:
   `npm run gate` must pass, and the contract's selectedPatterns,
   fallbackRequirements, performanceBudgets, seoRequirements and
   publicationRequirements become the plan's spec rather than being re-decided
   here. The engine's rejections are part of the record: a pattern it rejected
   may not be reintroduced at this phase without a decision_matrix.md entry
   overturning it on new evidence.
   The contract now also carries the ENGAGEMENT OPPORTUNITY DECISION
   (`output.engagement`, src/engagement/): NO_EXPERIENCE, PRIMARY_EXPERIENCE or
   COMPLEMENTARY_EXPERIENCES, with every candidate's hard gates, score, rejection
   reason, static alternative and approvals. The plan adopts it; an experience it
   rejected, downgraded or deferred is not added here without new evidence, and
   NO_EXPERIENCE is a complete answer, not a gap to fill.
   Skip for a copy-only or mechanical change — the engine answers "what should
   this website be", not "should this typo be fixed".
   Prevents: a plan improvising a design the engine already scored and rejected,
   which is the Second Directive violation the engine exists to close.
1. code-planning-specialist: component tree, files touched, state, props.
2. blast-radius-analyzer / change-impact-analysis: what else could break
   (shared components in components/ui, brand tokens, promo config, popups,
   sticky CTA, i18n in lib/ems/i18n.tsx).
3. Positioning & spacing spec: exact Tailwind classes, grid alignment with
   neighbouring sections, and the breakpoints named by
   website_workflow/responsive_matrix.md — never restated here. That file
   records that the old 360px baseline matches no real device and the real
   narrowest is 320; this step used to say "360px, 768px, 1024px, 1440px",
   which contradicted it. Breakpoints live in ONE file, like colour values.
4. Media plan (if any media involved): the CONTENT was decided by the VISUAL
   BRIEF and the FORMAT in Phase S4 (or via decision_matrix.md for
   mechanical swaps). Here, spec the asset: purpose, subject, format (WebP/AVIF preferred; video poster +
   preload strategy if video), dimensions, next/image sizing, alt text,
   lazy/priority decision, estimated weight budget (<150KB hero image,
   <80KB others; video only with explicit LCP evidence plan).
5. PRODUCTION PLAN (mandatory for every visual in the plan —
   website_workflow/asset_production.md + web-illustration-asset-production-pipeline):
   name the PRODUCTION RUNG for each slot (1 code-drawn · 2 captured from
   code · 3 AI raster · 4 owner-supplied; the lowest rung that carries the
   brief wins) and the rung-1 build contract items that apply. The run that
   plans a visual produces it: a slot whose only output is a prompt is a
   FAILED slot at Gate 5, not a follow-up. Then, for any generated or
   supplied illustration, icon set, or character asset,
   name who renders, who curates (a render is a candidate, never a commit —
   by default the run self-curates against the brief and the owner sees
   every shipped visual at review),
   the format decision + its trade-off, target path and filename convention,
   theme variants, alt-text/decorative classification, and where the
   provenance record will live. If a brand character is involved, name the
   lock version every asset is checked against.
   Prevents: "here is the prompt" ending the conversation, leaving nobody
   responsible for the file — and untraceable binaries landing in the repo.
5b. MOTION PLAN (website_workflow/animation_library.md): state the page's
   MOTION TIER and the reason it was derived, then for every moving element
   its job (one of five), category, trigger, MOTION TOKENS used, and its
   reduced-motion frame. One motion language per page.
6. COLOUR TOKENS (website_workflow/color_system.md) — if the seed, theme
   mode, or any colour is in scope: run tools/generate_palette.py, review the
   contrast report, get an owner decision on any DRIFT flag, and name the
   canonical output path. No hand-authored colour values.
6b. STACK & SEO PLAN (website_workflow/stack_doctrine.md) — mandatory on any
   change that adds a dependency, adds/changes a page or route, or alters
   rendered content:
   (a) DEPENDENCY GATE: for every new package, all five answers in writing
       (what it replaces, measured weight + First-Load JS delta, client
       boundary cost, licence + maintenance, removal path). Unanswered =
       denied. A default-deny category flagged at Phase 0 step 2b is scored
       here with decision_matrix.md PROFILE B against "do not add it" as
       Option A, or the ESCALATION RULE is invoked instead.
   (b) CLIENT BOUNDARY: name every component that will carry one and why,
       and confirm no indexable content depends on it.
   (c) SEO ARTIFACT SET: the full per-page list (title, description,
       canonical, single H1, OG/Twitter, JSON-LD only for a type the page
       really contains, sitemap + robots, slug + any redirect, one inbound
       internal link) — each PRESENT/CORRECT or N-A with a reason. Skills:
       seo-technical-audit-specialist, on-page-seo-copywriter,
       schema-structured-data-architect, social-share-preview-architect.
   (d) Any approved deviation is written to site_profile.md
       {STACK_DEVIATIONS}, not left in the conversation.
   Prevents: a page reaching GATE 5 with no title and no canonical, because
   README rule 6 made the SEO skills mandatory but no file ever named the
   artifacts they were supposed to produce.
7. ABSENCE SEMANTICS (website_workflow/degraded_paths.md) — list every
   failure-sensitive input (anything optional, owner-supplied, env-driven or
   externally fetched), enumerate what "missing" can look like FROM THE REAL
   PRODUCER, and name the ONE shared resolver every consumer will use. A
   per-consumer emptiness check is a build-rule violation; deciding this at
   Phase 2 is what makes it cheap.
7. TEST-CASE GENERATION (website_workflow/qa_workflow.md §2) — derive cases
   from all six sources (requirements, components, user flows, viewports,
   themes, defect history) into website_workflow/qa/test_register.md, using
   templates/test_register_TEMPLATE.md. Every MUST-HAVE must trace to >=1
   case; an unmapped MUST-HAVE is incomplete generation, not a passing test.
   Cases exist BEFORE code — a case written afterwards to match what already
   passed is not coverage.
GATE 2: written plan approved AND the register exists with traceability
complete. Review depth: DETAILED. No code before this gate.

### PHASE 3 — SUPABASE REVIEW (only if Supabase-touching)
Run supabase_review.md in full. Code-first: schema changes exist ONLY as
files in supabase/migrations/; never direct SQL against prod. MCP tools are
for READ-ONLY verification (list_tables, get_advisors, get_logs,
generate_typescript_types). Skills: supabase-safety-reviewer,
rls-risk-auditor, supabase-environment-awareness, api-design-expert,
typescript-supabase-patterns, error-handling-expert.
GATE 3: Supabase checklist signed; advisors show no NEW warnings.

### PHASE 4 — BUILD
Implement exactly the approved plan. Rules:
- Reuse components/ui primitives; no new one-off variants without a written
  reason (component-reusability-expert). Those primitives come from the L2
  row of stack_doctrine.md — a primitive that is neither there nor already
  in the repo is a new dependency and needed the Phase 2 gate.
- STACK (website_workflow/stack_doctrine.md): server components by default;
  a client boundary only where Phase 2 named one, pushed to the smallest
  leaf. No package that did not pass the DEPENDENCY GATE. No default-deny
  category without a recorded approval. Forms use ONE Zod schema imported by
  both the client and the route handler — never a hand-written server twin.
  An unapproved dependency or an unplanned client boundary is a build-rule
  violation, same standing as a hardcoded colour: both survive review by
  looking correct in a browser.
- Colour: components consume L2 SEMANTIC tokens ONLY — never an L1 primitive
  ramp value, never a raw hex, never a colour keyword (color_system.md).
  A hardcoded colour is a build-rule violation, not a style preference: it
  survives neither a seed change nor a polarity change.
- Every fetch/API call: loading state, error state, empty state
  (loading-state-specialist, error-state-specialist, empty-state-specialist).
- Forms: client + server validation, honest error copy, no data loss on
  failure (form-ux-specialist, form-validation-expert).
- Copy: plain words, short sentences, benefit-first, no jargon; CTA verbs
  concrete ("Book free demo", not "Submit"). Q10 of the checklist applies to
  every visible phrase. No claim beyond app_reality.md.
- VISUALS (asset_production.md): build each visual exactly to its VISUAL
  BRIEF on its planned rung, honouring the rung-1 build contract — poster in
  the HTML first, the LCP is the headline or the poster and never the
  script (measure which), tokens for colour,
  reduced-motion frame, pause control on any loop over 5 seconds, stopped
  when off-screen, a text alternative, sample data labelled. Then look at
  it: render, screenshot, critique against the brief, fix (SELF-CURATION).
  A visual nobody looked at is not finished.
- No console errors, no TypeScript errors, `npm run build` must pass.

### PHASE 5 — QA EVIDENCE GATE (critical — see checklists/qa_evidence_gate.md)
Performance and responsiveness are CRITICAL here. Required evidence, attached:
1. Responsiveness per website_workflow/responsive_matrix.md: TIER 1 (six
   profiles across chromium AND webkit) mandatory, TIER 2 when triggered,
   TIER 3 limits declared honestly. Screenshots per profile (light + any
   theme variants). Any failure runs that file's RCA loop — root cause
   before fix, cause not symptom, full-matrix re-run, guarding assertion,
   RF-xxx recorded. Skills: responsive-layout-expert,
   responsiveness-testing-expert, mobile-first-ux-evaluator.
2. Playwright: run existing specs (tests/**) + add/extend specs covering the
   change; paste the run summary. Skills: functional-test-planner,
   smoke-test-expert, edge-case-generator, negative-scenario-specialist.
3. Performance: Lighthouse (or equivalent) on changed pages — LCP < 2.5s,
   CLS < 0.1, INP < 200ms, total image weight within budget; paste scores
   before/after. Skills: performance-audit-expert,
   performance-optimization-expert, nextjs-architect.
4. Accessibility spot-check: keyboard nav, focus visible, contrast, alt text.
4a. SEO + STACK evidence (stack_doctrine.md; qa_evidence_gate.md §4c) —
   mandatory on any page/route/content change: the SERVED HTML of each
   changed page (fetched without executing JS) showing title, canonical,
   single H1 and the actual body content present; the SEO ARTIFACT SET
   answered item by item; sitemap/robots verified on the built output. Plus
   the First-Load JS delta per changed route, before and after. "It renders
   in the browser" is not evidence that it is in the HTML — that difference
   is the whole point of the check.
4b. ASSET GATE (any new/changed illustration, icon or character asset):
   provenance record complete + licence stated, filename per convention,
   within its weight budget, theme variants present, motion asset has an
   intentional static fallback. Character assets additionally: drift-checked
   against the named lock version (character-consistency-checker), emotion/
   pose within budget, and any CONDITIONAL deployment limit from Phase S4
   still honoured on the built page. Missing record = FAIL.
4d. VISUAL + CRAFT GATE (qa_evidence_gate.md §7) — mandatory on any new
   page or any change to a hero, visual or animation:
   `python website_workflow/tools/audit_visuals.py <built output>` passes;
   the self-curation screenshots are attached (first paint, mid-story,
   reduced-motion, narrowest mobile); and checklists/premium_craft_bar.md
   is run against screenshots of the BUILT page — look, critique, fix,
   re-capture, at most three rounds — with its verdict block attached.
   Prevents: a page that passes every correctness gate and still ships as
   a template, because no gate ever looked at the finished page and asked
   whether it was good.
5. Re-run the INTERROGATION against the BUILT result (not the plan) — Q1-Q10
   AND every named Q-xxx check (the supplementary questions are where drift
   from the approved plan actually shows up). Any drift = FAIL.
6. If Phase S ran: verify the built result still matches the STRATEGY
   VERDICT (winning option, claims, CTA hierarchy). Drift = FAIL.
7. QA COMPLETION (qa_workflow.md §6): every register case EXECUTED (zero
   NOT-RUN — an unrun case blocks the gate), zero open S1/S2, every S3/S4
   fixed or explicitly owner-accepted in writing with a reason, every fixed
   defect carrying its permanent regression case, regression sets recorded
   per §5, and the QA SUMMARY written — including what was NOT covered.
   Overclaiming coverage is itself a gate failure.
GATE 5 (owner): evidence reviewed. Review depth: EVIDENCE. No evidence → no
pass.

### PHASE 6 — RELEASE
1. deployment-checklist-expert + vercel-deployment-expert: env vars present
   (.env.example updated if new ones), preview deploy verified, then promote.
2. If migrations exist: apply to staging/branch first, verify, then prod —
   in the same release as the code that needs them, never after.
3. rollback-planning-expert: one-paragraph rollback plan written BEFORE
   promoting (git revert target + migration down-path or forward-fix).
4. Post-release: check Vercel analytics/logs and Supabase logs (MCP get_logs)
   for 24h-equivalent window; post-release-monitoring-expert.

### PHASE 7 — CLOSE
Append one entry to website_workflow/decisions_log.md: date, request file,
what shipped, interrogation verdicts that mattered, decision-matrix winners
AND losers (with scores), evidence links, follow-ups.
If the FLOW itself misbehaved during this run → run framework_update.md.
If any workflow file, rule, or command changed this run → update
website_workflow/README.md (LAST UPDATED date + one Update-log line).

## STANDING INSTRUCTIONS (apply to every phase)
- STATE CONTRAST (global): readable text in every visual state of every
  element, existing or new, without separate instruction. Verified via
  Q-STATE-CONTRAST (interrogation) + QA state screenshots.
- DESIGN LIBRARY (website_workflow/design_library.md): consult FIRST on any
  design decision; matrix-score its relevant entries as options. Every
  owner-provided design reference → new REF entry + at least one Claude ALT
  entry (two-layer rule). Owner input = baseline, not ceiling: also record
  one enhanced variant. "Alternatives for this section?" → top 5 library
  entries ranked per the library's rules.
- REFERENCE SITE ANALYSIS (website_workflow/reference_site_analysis.md):
  when the owner supplies a URL to watch, learn from, or compare against,
  run its SCOPE GATE before fetching anything — whole site / the part named
  / treat-as-explicit-requirement. Findings feed design_library.md's REF/ALT
  entries; an explicit "add this" element additionally needs a real request
  file and the normal build gates — the scope question is skipped for it,
  never the gates.
- RESOURCE REGISTRY (website_workflow/resource_registry.md): standing
  external references (ui-ux-pro-max LOCAL, tweakcn, awwwards, Looker
  Studio) are OPTIONAL and TRIGGER-GATED. Consult the local rung first;
  then at most ONE triggered resource — never all of them. Name the trigger
  in one line before opening anything, and end every consult in a recorded
  artifact or an explicit "nothing applicable".
- VISUAL CONCEPT (website_workflow/visual_concept.md): every new page with
  a hero gets a concept decision before any media format is chosen, and
  every page gets a PAGE STORY. ASSET PRODUCTION
  (website_workflow/asset_production.md): the run that plans a visual
  produces it, on the lowest rung that carries the brief, and looks at the
  result before calling it done.
- MOTION LIBRARY (website_workflow/animation_library.md): consult FIRST
  whenever motion/animation is being added or reviewed. Motion must earn
  its place: it ships only if it serves hierarchy, interaction feedback,
  storytelling/state-communication, loading/wait-communication, or CONCEPT
  DEMONSTRATION (showing the product's own verb happening), at the page's
  MOTION TIER; anything else is decoration and gets rejected, stated
  explicitly, not silently added or silently dropped. The reverse is also a
  decision: a page that ships with no concept visual says why. Screen the local catalog before
  referring to the live source. 2+ genuine candidate patterns for the same
  job → decision_matrix.md, same as any other design choice.
- STACK DOCTRINE (website_workflow/stack_doctrine.md): the stack is a CLOSED
  list and everything off it is DENIED by default — a new dependency, a
  rendering strategy, or any of the named default-deny categories (PWA,
  offline, global client state, auth, a backend beyond {STACK}, app-style
  navigation, client-rendered indexable content, a CMS). Admission needs a
  requirement naming the OUTCOME, a PROFILE B matrix against "do not add
  it", and owner approval — recorded in site_profile.md, never only in the
  conversation. Absence of a rule is not permission. When a requirement
  genuinely needs an application, say so and recommend a web-application
  architecture for that surface instead of thickening the website.
- SKILL VALIDATION GATE (design_library.md rules 6 & 9;
  checklists/interrogation_checklist.md Q-SKILL-VALIDATION): before any
  design element, pattern, component, interaction, or visual idea is added
  or changed, name the governing skill(s) via skills_map.md and apply its
  principles to both the requested change and every complementary idea
  explored under rule 6. No governing skill identifiable, or the identified
  one unresolvable via skills_map.md §Fallback → STOP and tell the owner
  plainly what TYPE of design skill is needed; never proceed as though it
  exists.
  On every in-play request run the OPTION SELECTION FUNNEL (design_library.md):
  screen EVERY entry (cheap, mechanical, off the INDEX), rank the eligible,
  score current-state + top 3, and publish the LIBRARY SCREEN block naming
  what was OUT and what was DEFERRED. Screening is complete; scoring is
  capped. Stage 0 applies to MECHANICAL requests too — one line saying
  in-play or not. A missing LIBRARY SCREEN block = Phase 1 FAIL.
- Never invent requirements; "unknown" stays unknown until the owner answers.
  That rule is a MECHANISM, and mechanisms are tested: its degraded path must
  be deliberately exercised, not assumed (degraded_paths.md). A blank that
  renders as though it were real data is the failure this prevents.
- Never touch pages outside the approved blast radius.
- Never commit secrets; .env.local is read-only context.
- Prefer boring, consistent solutions for STRUCTURE and CODE (Q9:
  professional). Novelty is a budget, and it is spent in exactly one place
  per page: the concept visual. Everything around it stays quiet so that
  one thing can be remembered.
- Decide by framework: 2+ options → decision_matrix.md, always.
- Strategic claims/choices require current web-research evidence (Phase S);
  never decide positioning, media format, or competitive claims from memory.
- The website may never claim more than app_reality.md supports.
- Skills: use the mapped skill for each phase (see skills_map.md). If a
  mapped skill is unavailable in Claude Cloud, follow the local fallback in
  skills_map.md §Fallback. If it exists nowhere, STOP and report the gap.
