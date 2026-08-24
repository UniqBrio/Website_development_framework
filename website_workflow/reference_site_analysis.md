# REFERENCE SITE ANALYSIS — steal-the-principle intake for an owner-supplied reference
<!-- website_workflow/reference_site_analysis.md
     Triggered whenever the owner supplies a URL (or a screenshot of one) to
     watch, learn from, or compare against — inside /wrequest, /brainstorm,
     strategy_audit.md §S2, or ad hoc mid-conversation. Generalizes the
     "steal the principle, not the pixels" rule already used in every
     design_library.md REF entry and in §S2; THIS file is the INTAKE
     procedure that produces those REF/ALT entries. Added 2026-08-24. -->

PRIME RULE (inherited from website_flow.md's PRIME DIRECTIVE): findings are
OPTIONS added to design_library.md — never auto-applied to the live site,
and never a reproduction of the reference. Extract the transferable logic;
leave the pixels behind.

## STEP 1 — SCOPE GATE (ask before analyzing — every time)
Classify what the owner said about the reference into exactly one of three
lanes. Never skip this step because the URL "looks simple" or because a
similar site was analyzed before — each reference gets its own scope gate.

A. EXPLICIT ELEMENT REQUEST — the owner named a specific thing and said to
   ADD it ("add their sticky pricing CTA", "use a rabbit mascot like
   Jackrabbit's", "copy their footer layout"). This is a REQUIREMENT, not
   inspiration.
   → Skip the question below. Still capture one REF-xxx entry for
     provenance (STEP 4), but route the request itself through the NORMAL
     gates — /wrequest classification, decision_matrix.md if an alternative
     exists, app_reality.md truth check, full interrogation. An explicit ask
     skips the scope question, never the build gates.

B. A PART WAS NAMED, not an explicit add ("look at their hero", "how do
   they do pricing cards", "check out their footer/animations/nav") →
   default scope = that part only. STILL ask, phrased as a confirm with the
   named part preset:
     "I'll look at [their PART] on [URL] for design learnings — want the
      whole site instead, or keep it to [PART]?"
   No response / "just do it" / "go ahead" → proceed on the named-part
   default. This satisfies "ask before analyzing" without turning an
   already-scoped request into a blocking round-trip.

C. URL ONLY, nothing named → ask the open question, unprompted, before
   fetching anything beyond the homepage:
     "Would you like me to analyze the entire website for useful design
      learnings, or focus only on a specific part you have in mind?"

MIXED INPUT rule (mirrors wrequest.md's own MIXED INPUT rule): if the owner
combines an explicit element request with a broader learning ask in the same
message, classify EACH part into its own lane — run lane A for the explicit
element and the appropriate B/C question for the rest. Never let one lane
swallow the other.

## STEP 2 — FETCH
1. WebFetch the URL — whole site: homepage + up to 4 linked pages relevant
   to the scope; named part: the page containing it, deep-linked where
   possible.
2. If fetch fails (robots.txt, JS-only render, paywall) → say so, then ask
   for a screenshot of the scope in question. Never guess at markup that
   was not actually seen (this file's precedent: design_library.md's
   REF-001, "live fetch blocked by robots.txt — logic captured from
   screenshot").
3. Skills: html-design-extractor (structural extraction from markup/DOM),
   design-gap-analyzer (diff against the current implementation),
   competitive-research-specialist (only when the reference is a
   competitor, not just a craft reference).

## STEP 3 — SYNTHESIZE (steal the principle, not the pixels)
For each pattern worth carrying forward, within scope:
1. WHAT IT DOES — plain description of the observed pattern (layout,
   interaction, component, motion, copy structure — whatever the scope
   covers).
2. TRANSFERABLE LOGIC — the underlying principle, stripped of the source
   site's specific pixels/brand/copy. Same standard as every REF entry in
   design_library.md.
3. FIT CHECK against standing constraints — a pattern that fails this is
   STILL logged (the option is never silently dropped) but flagged NOT
   ADOPTABLE AS-IS with a compliant ALT proposed instead of the raw idea:
   - app_reality.md truth rules (no fabricated proof/counts the pattern
     implies)
   - brand tokens: dark theme, accent scarcity (one primary-accent action
     per viewport)
   - state-contrast rule (>=4.5:1 in every state)
   - performance budget (3G-Android; asset weight budgets from Phase 2)
   - accessibility (keyboard, reduced-motion, screen reader)
   - a brand-character/mascot pattern in scope does NOT get decided here —
     it routes to brand-character-mascot-designer's own GO/CONDITIONAL/
     NO-GO gate; this file only notes "worth evaluating as a character
     pattern" and hands off.
4. Skills: saas-website-visual-storytelling-director (style/illustration
   fit), product-screenshot-mockup-specialist (product-shot presentation
   patterns), conversion-ux-specialist, academy-owner-psychology-expert
   (audience lens on every pattern).

## STEP 4 — RECORD (feeds design_library.md's existing REF/ALT mechanism)
1. One REF-xxx entry per adopted pattern, written directly into
   design_library.md in its existing format: Source = URL + date fetched
   (or "screenshot, fetch blocked"), scope = whole-site / part / explicit-
   element, What it does, Transferable logic, Cautions for {SITE_NAME}.
   Two-layer rule applies exactly as it already does (design_library.md
   rule 2): every REF gets 1+ Claude ALT entries.
2. Lane A (explicit element) additionally gets flagged CANDIDATE
   REQUIREMENT in the entry and cross-linked to the request file once
   /wrequest drafts one — the REF entry is provenance; the request file is
   the actual build instruction.
3. Update design_library.md's INDEX + LAST UPDATED, per its own rule 7.
4. Findings are OPTIONS. Nothing on the live site changes from this file
   alone — matrix-score against the current state like any other library
   entry (design_library.md rule 4) before anything is built.

## STEP 5 — REPORT
Tell the owner: what was analyzed (scope + lane), URL/screenshot evidence,
the new REF/ALT entries added (IDs + one line each), any pattern flagged
NOT ADOPTABLE AS-IS and why, and — lane A only — confirmation that a
request file is the next step (draft it via /wrequest on the owner's go;
never auto-start /website from here).

## CROSS-REFERENCES (do not duplicate this procedure elsewhere — point here)
- strategy_audit.md §S2 competitor teardown: its initial 5 references keep
  their own table format (hero/subhead/CTA/proof/media/better/worse). If the
  owner names ONE additional reference mid-flow, run STEP 2/3 of this file
  for it instead of an ad hoc lookup — same synthesis standard, output still
  lands in design_library.md via STEP 4.
- /brainstorm step 3 (RESEARCH): if the situation names a specific reference
  URL rather than "find current best practice," run this file instead of
  the generic 3-lookup research step.
- /wrequest CLASSIFY: a URL with no other request content classifies as
  REFERENCE (this file), not NEW/CORRECTION/BUG — unless it is lane A,
  which still produces a real request file per STEP 4.2.
