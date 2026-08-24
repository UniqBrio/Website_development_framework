# INTERROGATION CHECKLIST — the 10 questions every change must survive
<!-- Used at Phase 1 (against the plan) and again at Phase 5 (against the build). -->
<!-- For each question write: PASS / FAIL + required fix / N-A + reason.
     One-word answers are invalid; each answer must cite the specific
     element, class, file, or phrase it judged. -->

## Q1 — WHY should this image exist at all?
- What job does the image do that copy cannot? (proof, emotion, orientation)
- Would the section be WEAKER without it? If not → delete the image.
- Is it specific to {SITE_NAME}'s audience (Indian arts/sports academy owners)
  or generic stock filler? Generic filler = FAIL.
- Does it duplicate a message an adjacent image already sends?

## Q2 — WHAT elements/content belong in this section?
- State the section's single job in one sentence. Every element must serve it.
- List each element (headline, subhead, proof, CTA, image, badge…) with its
  reason. Any element without a reason = remove.
- What is deliberately EXCLUDED, and why?
- Does the section answer the visitor question that arises at this scroll
  depth (What is it? → Is it for me? → Can I trust it? → What now?)?

## Q3 — Is POSITIONING consistent?
- Alignment grid: does this section share the same container width, gutter,
  and heading alignment as its neighbours (compare Tailwind classes)?
- CTA placement pattern consistent with other sections?
- Order logic: does this section sit at the right scroll position in the
  narrative? Would swapping it with a neighbour improve flow?
- Header/footer/sticky-CTA interplay: nothing overlapped or duplicated?

## Q4 — Are all elements CORRECT and is the UI convincing?
- Every fact, number, price, feature claim verified against source of truth
  (lib/brand.ts, lib/config/promo.ts, pricing data). No stale claims.
- Visual hierarchy: can a squinting user still see headline → proof → CTA?
- Consistency with the design system: colors from the brand palette only,
  type scale from existing tokens, existing components/ui primitives reused.
- Does it look like the SAME website as every other section? Drift = FAIL.

## Q5 — Is the UX outstanding (not merely acceptable)?
- Time-to-comprehension: is the section's message clear in <5 seconds?
- Interaction cost: how many taps/inputs to complete the intended action?
  Can one be removed?
- States: hover, focus, active, loading, error, empty, success all designed?
- Cognitive load: anything the visitor must remember, compute, or guess?
- Mobile thumb reach: primary CTA reachable and ≥44px tap target?

## Q6 — Is the image itself FINE?
- Technical: right format (WebP/AVIF), sized via next/image with correct
  `sizes`, no layout shift (width/height or fill set), lazy unless above
  the fold, weight within budget (<150KB hero, <80KB others).
- Content: sharp, well-lit, culturally right for the audience, faces/subjects
  not cropped awkwardly at any breakpoint, text-in-image avoided.
- Alt text written, meaningful, not "image1".
- Does it degrade gracefully on slow 3G (dominant real-world condition for
  Tier 2/3 India)?
- Provenance: for a generated or supplied asset — is the source, tool, licence
  and curation decision recorded? An untraceable binary = FAIL.
- If it is a brand-character asset: all seven points of image_prompts.md
  §MASCOT QUALITY BAR answered individually, lock version named, and the
  Phase S4 GO/CONDITIONAL verdict (with its limits) restated. A character
  asset with no lock reference = FAIL.

## Q7 — Is SPACE sufficient?
- Breathing room: padding/margins match the spacing scale used elsewhere
  (spacing-grid-system); no section visually "glued" to its neighbour.
- Text measure: line length 45–75 chars; line-height comfortable.
- At 360px width: nothing cramped, wrapped ugly, or overflowing.
- At 1440px+: content doesn't stretch into an unreadable full-width smear.
- Whitespace serving hierarchy, not just existing.

## Q8 — PERFORMANCE & RESPONSIVENESS (critical — must be TESTED, not judged)
- Evidence required: see checklists/qa_evidence_gate.md.
- LCP < 2.5s, CLS < 0.1, INP < 200ms on changed pages.
- Screenshots at 360/768/1440 attached; no horizontal scroll anywhere.
- No new blocking JS/fonts; animations respect prefers-reduced-motion.
- Playwright run green. Untested = FAIL by definition.

## Q9 — Is every decision PROFESSIONAL?
- Would a skeptical academy owner trust this page with their fee money?
- No hype claims we can't back, no fake urgency, no dark patterns
  (customer-trust-expert lens).
- Legal/compliance surfaces intact: privacy, terms, refunds links correct.
- Spelling, grammar, punctuation flawless in every visible string.
- Consistent tone with the rest of the site — confident, plain, honest.

## Q10 — Is every phrase EASY and user-convenient?
- Reading level: short sentences, everyday words; a busy academy owner on a
  phone understands each phrase on first read.
- CTAs say exactly what happens next ("Book free demo" not "Get started").
- No internal jargon (EMS, SKU, tenant…) leaking into visitor-facing copy.
- Numbers formatted for India (₹, lakh where natural); dates unambiguous.
- Error/success messages tell the user what to DO, not what the system did.

## VERDICT BLOCK (paste at the end of every interrogation)
| Q | Verdict | Evidence / fix |
|---|---------|----------------|
| 1–10 | … | … |
OVERALL: PROCEED / REDESIGN. Any FAIL ⇒ REDESIGN.

## Q-OPTION-SET (added 2026-08-24 — prevents the silent-shortlist-cut class)
For every design slot in scope: is the LIBRARY SCREEN block present, and
does it account for EVERY non-superseded library entry as ELIGIBLE, OUT
(with the one disqualifying reason), or DEFERRED? An entry that appears
nowhere was neither screened nor rejected — it was forgotten: FAIL.
Is the winner's margin over Option A (current state) real, or inside the
5% tie band that rule 4 gives to the cheaper option? Is any claim that the
winner is "best" scoped to "best of the eligible shortlist"? Overclaiming
coverage = FAIL.

## Q-SKILL-VALIDATION (added 2026-08-24 — prevents unskilled/unsourced design work)
For every design element, pattern, component, interaction, or visual idea in
scope — the one requested AND every complementary idea explored (design_
library.md rule 6): is the governing skill(s) named, via skills_map.md's
phase/situational/PROJECT SKILLS tables? Were its principles/constraints
actually applied — visible in the reasoning, not just cited by name? If no
skill could be identified or loaded (skills_map.md §Fallback exhausted): was
the owner told explicitly, in writing, what TYPE of design skill is missing,
BEFORE any design change proceeded? Silent proceeding on an unnamed or
unavailable skill = FAIL. Every complementary idea that survived recorded as
an IDEA-xxx entry in design_library.md (rule 9)? An idea generated in the
conversation but never recorded = FAIL — same failure class as Q-OPTION-SET:
generated, then lost.

## Q-STATE-CONTRAST (added 2026-08-08 — prevents the ProblemSection hover bug class)
For every interactive/animated element: is text >=4.5:1 in ALL states —
default, hover, focus, active, selected, disabled, mid-animation? Any state
that changes the background MUST change text/overlay/shadow in the SAME
transition. One unreadable state = FAIL.
