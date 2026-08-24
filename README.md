# Website Development Framework
<!-- C:\Website_development_framework — the reusable master. Site work
     never happens here; /winit copies this into each site's repo. -->
LAST UPDATED: 2026-08-24 (mascot skills wired in; option-selection funnel added; 3 hero/card patterns added; reference site analysis intake added; skill validation gate added)

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
| reference_site_analysis.md | Intake for an owner-supplied URL: scope gate, fetch, synthesize into design_library.md |
| image_prompts.md | Brand-locked image-generation templates |
| skills_map.md | Which skill per phase + fallback rule (swap domain skills per site) |
| checklists/ | Interrogation (incl. Q-STATE-CONTRAST) + QA evidence gate |
| templates/ | Request templates: new / correction / bug |
| framework_update.md | Fix the workflow itself (gated, logged) |
| supabase_review.md | Backend-touching change review (skip if stack differs) |

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
7. Every workflow change updates the site README + decisions_log.
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
