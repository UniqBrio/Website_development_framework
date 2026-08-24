# Website Development Framework
<!-- C:\Website_development_framework — the reusable master. Site work
     never happens here; /winit copies this into each site's repo. -->
LAST UPDATED: 2026-08-24 (responsive matrix + RCA loop; resource registry; code-repo licence lane; cinemagraph gate)

## What this is
A complete, site-agnostic workflow for building ANY website from scratch to
professional quality: evidence-based strategy → gated build → state-aware
QA → release, plus a growing design-pattern library and brand-locked image
prompts. All brand/site facts live in ONE file (site_profile.md); workflow
files reference {TOKENS} resolved at init.

## Start a new website
1. Run **/winit <target repo> <site name>** — copies everything, interviews
   you for the site profile (brand colors, ICP, stack, REAL customer
   count), instantiates truth files, verifies zero unresolved tokens.
2. Fill **app_reality.md** (feature truth). The site may never claim more.
3. **/wrequest** your first change → review → **/website** to build.

## Commands (.claude/commands/)
| Command | Use for |
|---|---|
| /winit | Bootstrap a new site repo from this framework |
| /wrequest | Draft a change request (owner approves before build) |
| /website | Run an approved request through the pipeline (Phases 0→7) |
| /waudit <scope> | Strategy audit of any page — report only |
| /brainstorm | Explore options before committing to a request |

## Files (website_workflow/)
| File | Purpose |
|---|---|
| site_profile_TEMPLATE.md | ALL brand/site tokens — single source |
| app_reality_TEMPLATE.md | Truth file — claims may never exceed it |
| website_flow.md | Pipeline: intake → strategy → build → QA → release |
| strategy_audit.md | Phase S: fresh competitor research + claim checks |
| decision_matrix.md | Conversion-first scoring (500 pts); current state = Option A |
| design_library.md | REF (owner) / ALT (Claude) reusable patterns — grows per site |
| animation_library.md | Motion SELECTION: four-job gate, 8-category catalog, reduced-motion + ambient ceiling |
| responsive_matrix.md | Device tiers (chromium+webkit), the responsive RCA loop, RF-xxx failure patterns |
| resource_registry.md | Standing external references + the trigger each one needs; consult ladder |
| reference_site_analysis.md | Intake for an owner-supplied URL: 6 scope-gate lanes (incl. code-repo licence gate), fetch, synthesize into design_library.md |
| image_prompts.md | Brand-locked image-generation templates |
| skills_map.md | Which skill per phase + fallback rule (swap domain skills per site) |
| checklists/ | Interrogation (incl. Q-STATE-CONTRAST) + QA evidence gate |
| templates/ | Request templates: new / correction / bug |
| framework_update.md | Fix the workflow itself (gated, logged) |
| supabase_review.md | Backend-touching change review (skip if stack differs) |
| decisions_log.md | Per-site decision log (kept EMPTY in this master by design) |

## Non-negotiable rules (inherited by every site)
1. Truth: no claim beyond app_reality.md; no fabricated social proof,
   counters, popups, testimonials — at any customer count.
2. Evidence: every strategic decision web-researched + matrix-scored;
   ties go to the simpler option; losers logged, never re-litigated
   without new evidence.
3. Contrast in ALL states (default/hover/focus/active/selected/disabled/
   animated): ≥4.5:1; background changes flip text in the same transition.
4. Accent scarcity: one primary-accent action per viewport.
5. Command duplicates (.claude/commands ↔ website_workflow/commands) stay
   byte-identical.
6. SEO skills mandatory on structural/page changes.
7. Every workflow change updates BOTH README sections — the Files table
   (if a file was added/removed/renamed) AND the Update log — plus
   decisions_log in a site repo. Naming only "the README" let the Files
   table go stale while the Update log stayed current (animation_library.md
   was added 2026-08-24 and missing from the table until the same day).
8. Different brand/site → its own cloned workflow; truth files never mix.

## Provenance
Battle-tested on UniqBrio-Landing (2026-07 → 2026-08): decisions carried
in as defaults — conversion-first matrix weights, honest-early-stage
social-proof substitutes, state-contrast rule, out-of-scope guard.

## Update log
- 2026-08-09: Framework extracted and tokenized; /winit added.
- 2026-08-23: Brand character / mascot made a scored option. strategy_audit
  S4 gains the format + a mascot-vs-no-mascot research requirement;
  image_prompts.md gains templates 7-8 and the §MASCOT quality bar (and its
  blanket anti-mascot negative is now scoped to decorative stock characters);
  skills_map.md maps the character skills to S4 and records the known skill
  gaps (no mascot-design skill, no SVG/Lottie production skill).
  Prevents: improvised, inconsistent character art with no quality bar —
  and the previous rule that silently forbade a proven category pattern.
- 2026-08-23: Skills index source of truth moved to GitHub
  (UniqBrio/uniqbrio-skills-cloud). skills_map.md gains a SKILL INDEX block:
  repo = canonical, C:\Explorations\... = working copy, plus a sync obligation
  (an unpushed index edit must be reported, never claimed as done) and a
  TRANSITION paragraph to delete once a push route exists. Prevents: a session
  editing a local-only copy and reporting the index as updated.
- 2026-08-23: Push route settled after testing. Claude writes into the clone;
  the owner commits and pushes. The TRANSITION paragraph is replaced by HOW A
  CHANGE REACHES THE REPO, which records the three routes that were tried and
  why each failed (cloud GitHub API 403; device bridge has no network and cannot
  unlink .git/index.lock; GitKraken plugin's MCP runs in the Linux workspace so
  a Windows gk login never reaches it). Prevents: re-spending hours rediscovering
  that Claude cannot commit from here.
- 2026-08-24: The two skill gaps recorded on 2026-08-23 are CLOSED —
  brand-character-mascot-designer and web-illustration-asset-production-pipeline
  now exist at .claude/skills/. Root cause of this update: the 2026-08-23 entry
  hard-coded workarounds for skills that did not exist, and those workarounds
  outlived the gap. Changes: skills_map.md S4 + situational rows now route
  mascot work to the owning design skill and drop uniqbrio-character-bible from
  the mascot chain (a human persona may never serve as a mascot); the KNOWN
  SKILL GAPS block is replaced by GAPS CLOSED, which REVOKES the standing
  permission that "character assets ship raster and must justify weight".
  strategy_audit.md S4 now gates the brand-character format behind the skill's
  GO / CONDITIONAL / NO-GO score, and a CONDITIONAL verdict's deployment limits
  bind Phases 1 and 5. image_prompts.md template 7 is demoted to a rendering
  aid (the character is designed, never invented by a prompt) and §MASCOT grows
  from six points to seven (provenance + filename convention added).
  website_flow.md Phase 2 gains a mandatory PRODUCTION HAND-OFF item and Phase 5
  an ASSET GATE; interrogation Q6 and qa_evidence_gate §3 now require the
  provenance artifact. site_profile_TEMPLATE.md gains {MASCOT_LOCK} — a field
  image_prompts.md already referenced without it existing anywhere.
  framework_update.md's blast-radius list gains .claude/skills/<name>/ and the
  templates, and its step 6 no longer sends framework-master entries into the
  deliberately-empty decisions_log.md.
  Prevents: (a) mascot work routed to a skill that forbids the role; (b) a
  revoked raster dispensation still readable as live permission; (c) untraceable
  generated binaries entering a repo with nobody owning the hand-off.
  NOT DONE — carried as a known limitation: the illustration skill ships as a
  lone SKILL.md; the four reference files it links and scripts/validate_asset.py
  do not exist. No gate cites that script, deliberately — an unsatisfiable rule
  gets skipped. Owner action: author them, or fold their rules into SKILL.md.
  Also fixed this run: that skill's file was named <skill-name>.md, so it never
  loaded at all; renamed to SKILL.md.
- 2026-08-24: OPTION SELECTION FUNNEL added. Root cause: design_library.md's
  rule 5 returns the "top 5" alternatives for a section, but decision_matrix.md
  seats only current-state + 3 challengers — nothing said who cut the other
  two, so a real choice was being made silently, violating the Second
  Directive (website_flow.md) in the one step that was never written down.
  design_library.md gains a 4-stage funnel (scope → screen every entry, cheap
  and mechanical → rank eligible → score current-state + top 3) and a
  SHORTLIST PROVENANCE output (screened/OUT/eligible/DEFERRED), a SITE
  DEFAULTS clause so a 3x winner stops re-scoring, and rule 5's re-litigation
  ban is scoped to "same slot" so an append-only library stops killing itself
  as it grows. decision_matrix.md gains rule 7 (shortlist provenance
  mandatory); website_flow.md's standing instruction + GATE 1 and
  interrogation_checklist.md (new Q-OPTION-SET) both now require the
  LIBRARY SCREEN block. brainstorm.md (both copies) now screens the library
  BEFORE inventing options — it previously generated options next to a
  library built to supply them.
  Same run, owner-directed content: three new library entries, each with
  matrix-eligibility metadata (Cost/Disqualifiers added to the INDEX) —
  REF-005/ALT-005a/ALT-005b (sticky scroll-stack cards, from an Amazon SES
  screenshot), REF-006/ALT-006a/ALT-006b (horizontal scroll track, with the
  horizontal-scroll accessibility/discoverability cautions the pattern
  requires), and ALT-001d (rollable image-dice hero, extending REF-001 to
  browse multiple images via click/scroll roll instead of free-rotate).
  Prevents: an unscored cut between library candidates 3 and 4 passing as a
  scored decision; the library's own growth eventually making every entry
  unusable under a literal reading of the re-litigation ban.
  Honest limit recorded in the funnel itself: this procedure finds the best
  of the top-3 ELIGIBLE candidates, not the best of all N — never claim more
  coverage than that.
- 2026-08-24: Added REFERENCE SITE ANALYSIS. Root cause: design_library.md's
  §HOW TO ADD AN ENTRY assumed the owner had already scoped their reference
  before handing it over; nothing asked whether a URL should be analyzed
  whole-site, one named part, or was actually a direct "add this" instruction
  rather than inspiration — so a narrow ask risked a full-site trawl, and a
  real requirement risked getting buried as just another library option.
  New file website_workflow/reference_site_analysis.md owns the SCOPE GATE
  (ask before fetching, every time — three lanes: whole site / named part
  default-scoped-but-confirmed / explicit element that skips the question
  but never the build gates) and the fetch → synthesize → record procedure,
  writing REF/ALT entries into design_library.md in its existing format.
  Cross-referenced from: design_library.md (rule 1 + HOW TO ADD AN ENTRY),
  website_flow.md (STANDING INSTRUCTIONS), strategy_audit.md §S2 (one extra
  mid-flow reference), skills_map.md (situational row, replacing the
  narrower "Reverse-engineering a reference design" row), and both
  wrequest.md / brainstorm.md command copies (identical edits, verified by
  diff). waudit.md and winit.md were left untouched — waudit's contract is
  report-only with its own 5-reference procedure at a different granularity;
  forcing a merge would have contradicted its explicit "never edits the
  site, owner decides what becomes a request" rule.
  Prevents: (a) an unscoped whole-site trawl on a narrowly-asked question;
  (b) a direct "add their X" instruction diluting into an optional library
  entry instead of reaching /wrequest; (c) the scope question turning an
  already-named-part request into an unnecessary blocking round-trip.
- 2026-08-24: Owner-directed content only (no rule change; logged for master-
  repo traceability, since decisions_log.md stays empty here): REF-007 /
  ALT-007a / ALT-007b added to design_library.md — grayscale-to-color hover
  reveal for persona/segment cards (chessplay.io screenshot: hovered card
  renders in color, the other cards stay monochrome), plus a scroll-trigger
  touch equivalent (hover has no touch analogue) and an accent-duotone
  variant that keeps the reveal inside the two-accent palette instead of
  arbitrary photo color. Added via §HOW TO ADD AN ENTRY's screenshot lane.
- 2026-08-24: Skill Validation Gate + Proactive Design Exploration added.
  Root cause: the framework let a design element, pattern, component, or
  interaction be added without ever naming which website-design skill
  governed it, and never proactively looked beyond the literal ask for
  complementary improvements the same skill would support — both gaps
  meant "unskilled" design work could pass silently and a request stayed
  a ceiling instead of a baseline. Changed: design_library.md rule 3 gets
  a third provenance type, IDEA (Claude-proposed complementary improvement
  arising from an ordinary design request, not an external reference);
  rule 6 rewritten to drop the old "one enhanced variant" cap and make any
  design request a BASELINE, not a ceiling — implement what was asked AND
  explore complementary ideas via the governing skill, no fixed count, no
  arbitrary or unrelated addition; new rule 9 (SKILL VALIDATION GATE)
  requires the governing skill(s) be identified via skills_map.md before
  any design element (requested or complementary) is added, with
  surviving complementary ideas recorded as their own IDEA-xxx entries.
  skills_map.md's header comment now notes rule 9 invokes it for ANY
  design change, not only the phase-mapped rows, and §Fallback step 3 is
  rewritten to also cover the case where no table row matches at all —
  STOP and state plainly what TYPE of skill is needed, don't proceed
  unskilled. website_flow.md STANDING INSTRUCTIONS gets a matching SKILL
  VALIDATION GATE bullet. checklists/interrogation_checklist.md gets a new
  Q-SKILL-VALIDATION check (governing skill named and actually applied,
  missing skill disclosed before proceeding, every surviving complementary
  idea recorded as IDEA-xxx). Both wrequest.md and brainstorm.md command
  copies untouched by scope (wrequest.md was already updated for reference
  site analysis routing); brainstorm.md's step 4 (SCREEN, THEN GENERATE)
  gets one clause: a newly invented option is validated against its
  governing skill per rule 9 before being recorded as an ALT entry
  (verified byte-identical across both copies).
  Prevents: (a) a design change landing with no skill backing it at all —
  the exact failure class the owner's request named directly; (b) a
  complementary idea being silently generated and then silently dropped,
  never recorded, never offered to the owner; (c) proceeding as though an
  unavailable or unidentified skill exists instead of stopping and naming
  what type of skill the work actually needs.
- 2026-08-24: SOURCE-DOCUMENT INVENTORY gap closed. Root cause, evidenced
  from a real build (site repo uniqbotz-website, request
  WEB-NEW-20260824-uniqbotz-launch): the owner's plan document
  (uniqbotz-website-plan-revised.md) named 8 AI-generation scenes for the
  locked brand character in its own dedicated section 43 image-prompt
  section; the filled request file's CONTENT INPUTS > Images field
  transcribed only 1 (the hero). The other 7 were never built, deferred, or
  even mentioned in the site's own 13-point self-audit
  (FRAMEWORK_MODIFICATIONS.md M-01..M-13) — a silent drop stronger than
  "unknown", because nothing after intake ever re-read the source document
  to check. wrequest.md (both copies) gains a SOURCE DOCUMENT rule: a cited
  plan/spec must have every visual/media reference it names individually
  resolved or marked "unknown - section ref", never summarized away.
  website_new.md's CONTENT INPUTS > Images field now requires one line per
  named asset, not a single "see attached". website_flow.md Phase 0 now
  re-reads a cited source document itself rather than trusting the request
  file's summary of it. strategy_audit.md S4 gains step 0, an inventory pass
  (request + source document + page plan) BEFORE "decide the format for
  every slot" — so "every slot" stops being vacuous over whatever survived
  intake. interrogation_checklist.md Q1 gains a cross-check bullet as a
  second line of defense on the way out.
  Prevents: a detailed owner-authored plan's own asset list being silently
  under-transcribed at intake, with no phase downstream positioned to notice
  the gap — confirmed absent from a real, otherwise-thorough 13-finding
  self-audit, which is why this needed the master fix rather than a one-off
  site patch.
- 2026-08-24: Two new reference_site_analysis.md SCOPE GATE lanes for
  reference types the existing 3 (explicit element / named part / whole
  site) don't fit: Lane D (a theme/token GENERATOR — output is colors/radius,
  not a layout to browse) and Lane E (a commercial template MARKETPLACE — a
  category listing is a directory of unrelated products, never one design
  to learn from; only a specifically named template page may become a REF
  entry, and it carries a licence caveat: unpurchased = inspiration only,
  never code/asset reuse). STEP 2 also gains a WebSearch fallback for a
  JS-rendered tool page that returns no usable content but is documented
  elsewhere — evidenced live this run: zippystarter.com's theme generator
  returned only nav text on WebFetch; WebSearch found citable confirmation
  instead of the analysis stalling or guessing.
  design_library.md gains REF-008/ALT-008a (zippystarter's seed-color
  generator + a framework-native version of the same one-decision workflow)
  and REF-009/ALT-009a (NativeWindUI's generator, proving the pattern
  generalizes to RN/Expo stacks, plus a stack-aware export-format note).
  Both REFs carry the same caution: no external generator knows this
  framework's accent-scarcity or {ACCENT_2_TEXT} rules, so raw output is a
  candidate requiring the Lane D fit-check, never a direct site_profile.md
  edit.
  Deliberately NOT added: a REF for uizard.io (a SaaS app behind signup,
  no exportable design system, and no visual evidence of its own marketing
  page beyond a function summary — writing a layout REF without having
  actually seen the layout would violate the same standard REF-001 already
  sets) or for the themeforest.net category page itself (that IS lane E's
  rule working correctly — a listing page is a directory, not a reference).
  Prevents: forcing a token-generator or a marketplace-directory reference
  through a lane built for browsable page sections, which would either
  silently mis-scope the analysis or fabricate a REF entry for content that
  was never actually examined as a single design.
- 2026-08-24: New file website_workflow/animation_library.md — closes a gap
  where web-motion-implementation-director was mapped to "implement motion"
  with no file governing WHICH pattern, when one is warranted, or what job
  it must serve. Source: Prismic "Tailwind CSS Animations"
  (https://prismic.io/blog/tailwind-animations), 38 named examples fetched
  and sorted 2026-08-24 by JOB rather than Prismic's original by-
  implementation-type grouping (loading/processing, attention, hover-buttons,
  hover-cards, reveal/entrance, scroll-driven, interactive-toggle, ambient/
  decorative). PRIME RULE: motion ships only if it serves hierarchy,
  interaction feedback, storytelling/state-communication, or loading/wait-
  communication — default posture is skepticism, same discipline as
  brand-character-mascot-designer's mascot gate applied to a different
  medium. Ambient/decorative defaults to REJECT; a character animation in
  that category routes through brand-character-mascot-designer, never
  improvised here. Selection procedure: screen the local catalog first,
  refer live to the source only if nothing fits (same citation discipline as
  reference_site_analysis.md), then specify element/trigger/timing/intensity
  plus mandatory prefers-reduced-motion, Q-STATE-CONTRAST, and a new
  one-ambient-animation-per-viewport ceiling (accent-scarcity's discipline
  extended to motion).
  Wired in: website_flow.md (new MOTION LIBRARY standing instruction, same
  pattern as the DESIGN LIBRARY bullet), interrogation_checklist.md (new
  Q-MOTION-JUSTIFICATION), skills_map.md (new situational row — this file
  decides, web-motion-implementation-director builds), design_library.md
  (one cross-reference line: motion timing is canonical here, not
  re-derived ad hoc in REF-005/007).
  Prevents: motion added because "it looks more dynamic" with no job it
  actually serves, and — the failure this session's own instructions named
  directly — a decorative-by-default outcome from having 38 available
  patterns and no gate deciding which, if any, apply.

- 2026-08-24: THREE updates applied together (all owner-approved).
  (1) RESPONSIVE MATRIX. Root cause: templates/website_bug.md required "root
  cause written and confirmed BEFORE the fix (no symptom-patching)" plus a
  fails-before/passes-after regression spec, while qa_evidence_gate.md said
  only "Otherwise: list of failures -> back to Phase 4". Same defect class,
  two rigor levels, decided by who noticed first — the gate permitted exactly
  the visual workaround the bug template forbids. New responsive_matrix.md:
  TIER 1 six device profiles across chromium AND webkit (verified against a
  real 207-profile Playwright registry; the old 360x800 baseline matches no
  real device — real narrowest is 320), TIER 2 triggered, TIER 3 stating what
  emulation cannot prove. Adds the RCA loop and an append-only RF-001..011
  failure-pattern library where each entry names the WRONG fix to reject.
  responsivetesttool.com is placed as manual triage only — it has no API/CLI
  and 100vh inside its iframe cannot reproduce RF-002, the most common mobile
  bug, so it can never be the evidence.
  (2) RESOURCE REGISTRY. Root cause: skills_map.md routes internal skills and
  reference_site_analysis.md handles a ONE-OFF owner URL ("each reference gets
  its own scope gate"); a standing resource consulted repeatedly fit neither,
  so it was either ignored or used indiscriminately. New resource_registry.md:
  trigger-gated entries (ui-ux-pro-max LOCAL, tweakcn, awwwards, Looker
  Studio, plus the charting decision path), a consult ladder that puts LOCAL
  first, and the rule "name the trigger or don't open it". Records that
  ui-ux-pro-max was demoted to optional "visual polish" despite its own top
  two categories being CRITICAL, and that the vendored copy is v1.x-stale vs
  upstream v2.0 (MIT, so updating is unblocked). awwwards carries a recorded
  bias: performance/accessibility/usability are not its judging criteria.
  (3) CODE-REPO LANE F. reference_site_analysis.md gains a sixth scope lane
  for source-code repositories, licence checked FIRST, before reading source:
  copyleft = concepts only, copy zero files; permissive = reuse with recorded
  attribution; no licence = all-rights-reserved. Precedent recorded:
  webstudio-is/webstudio is AGPL-3.0-or-later across root AND the sdk /
  css-engine / design-system packages, so the verdict was 3 process ideas
  adopted in our own words and zero files copied. From it: GATE REVIEW DEPTH
  in website_flow.md (every gate now names conceptual / detailed / evidence,
  because a gate that only says "approve" invites a rubber stamp), and the
  README Files-table fix — animation_library.md had been added the same day
  and was missing from the table, so rule 7 now names BOTH README sections.
  Prevents: (a) a responsive defect fixed cosmetically because our own gate
  found it instead of the owner; (b) standing references applied
  indiscriminately or forgotten; (c) copyleft code entering a commercial site.

- 2026-08-24: CINEMAGRAPH GATE + template 9. Root cause: cinemagraph was
  already a scored S4 media format, but its mapped skill
  gif-and-cinemagraph-brief is NOT installed and no prompt template existed —
  a format the framework could choose but not execute, which under
  skills_map §Fallback would have stopped the pipeline. image_prompts.md
  gains template 9 (source still generated in Qwen: subject, composition,
  named static elements, ONE subtle motion, visual style, aspect ratio,
  intended placement) and the CINEMAGRAPH GATE: format decision first via
  S4, the four-job motion test, ONE moving element (two = it's a video),
  seamless loop, MP4/WebM never GIF, mandatory prefers-reduced-motion poster
  fallback, and app_reality truth rules. Default posture is REJECT — most
  marketing cinemagraphs are ambient texture, which animation_library.md
  already defaults to rejecting.
  Prevents: a cinemagraph commissioned because motion feels premium, shipped
  as a heavyweight GIF with no static fallback and no stated job.
