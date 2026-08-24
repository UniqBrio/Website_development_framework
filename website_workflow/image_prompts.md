# IMAGE GENERATION PROMPTS — brand-locked templates ({SITE_NAME} website)
<!-- website_workflow/image_prompts.md — added 2026-08-09 via framework
     update (prevents: unbranded/improvised asset prompts; gap exposed by
     the UniqBotz plan review). Use WITH the image-generation skill.
     Every generated asset also passes existing gates: app_reality truth
     rules (no fake people/counts/ratings), state-contrast, weight budget. -->

## BASE STYLE BLOCK (prepend to every prompt)
"{SITE_NAME} brand style: near-black background ({BG_0}) with dark card
surfaces ({BG_1}); accents ONLY saturated orange ({ACCENT_1}) and purple
({ACCENT_2}, light variant {ACCENT_2_TEXT} for fine lines/text); clean modern
vector/flat illustration, subtle depth and soft glows; generous negative
space; no watermark, no text unless specified, no stock-photo look, no
fake humans presented as customers, no invented UI numbers."
For LIGHT-surface assets (email headers, print): swap background to white,
text/linework dark zinc (#18181B), same two accents.

## NEGATIVE RULES (append to every prompt)
"Avoid: clutter, more than two accent colors, gradients covering >30% of
frame, fake testimonials/star ratings, decorative stock mascots or generic
3D corporate characters (an APPROVED brand character built per §MASCOT is
exempt), illegible small text, purple text on dark backgrounds."

## TEMPLATES
1. HERO PRODUCT VISUAL
"[BASE]. A realistic laptop/phone mockup displaying the actual {SITE_NAME}
dashboard screenshot [attach real screenshot], floating at a slight
perspective tilt over a dark stage; one soft orange rim light left, faint
purple ambient glow right; tiny floating UI chips (WhatsApp receipt, fee
paid tick) around it. Composition leaves top-left third empty for headline."

2. SECTION ICON (repeat per feature)
"[BASE]. Minimal line icon of [subject: e.g., attendance ledger / WhatsApp
bubble with rupee tick / batch calendar], 2.5px consistent stroke, rounded
joints, orange primary stroke with one purple secondary element, on
transparent background, 1:1, crisp at 48px."

3. PROCESS / FLOW GRAPHIC
"[BASE]. Horizontal 4-step flow: [steps]; each step a dark rounded card
with a single icon and connector arrows in {ACCENT_2_TEXT}; step numbers in orange;
even spacing; readable at 800px wide."

4. OG / SOCIAL SHARE IMAGE (1200x630)
"[BASE]. Bold left-aligned headline area (leave empty for overlay text),
right side the real product screenshot in a tilted card with orange edge
glow; {SITE_NAME} logo bottom-left safe zone; high contrast, mobile-legible."

5. BEFORE/AFTER OPERATIONS ILLUSTRATION
"[BASE]. Split composition: left, cluttered paper registers and Excel grid
in desaturated zinc tones; right, one clean glowing dashboard card in brand
accents; a single orange arrow bridging them; no humans' faces."

6. TEXTURE / SECTION BACKGROUND
"[BASE]. Extremely subtle geometric mesh of thin {ACCENT_2_TEXT} lines at 5-8%
opacity on {BG_0}, corner-weighted, must not reduce text contrast."

7. BRAND CHARACTER — DESIGN SHEET (RENDERING AID ONLY — the character is
   DESIGNED by brand-character-mascot-designer, never invented by this prompt.
   Run only after that skill has issued GO/CONDITIONAL and supplied the
   concept, identity anchors and silhouette-test result. A render is a
   CANDIDATE for the lock, never the lock itself.)
"[BASE]. Character design sheet for {SITE_NAME}'s brand character, rendering
the concept and identity anchors supplied by brand-character-mascot-designer
[paste anchors: geometry, proportions, signature contour features, hex
allocation — do not improvise any of these];
clean modern flat/vector illustration, bold readable silhouette, simple
shapes, no gradients on the body, orange primary with one purple secondary;
front / three-quarter / side turnaround on a plain neutral background,
plus a 48px thumbnail test crop; consistent 2.5px linework; no text,
no logo, no realistic human faces, not a photo, not 3D."

8. BRAND CHARACTER — IN-SCENE (repeat per slot, character locked)
"[BASE]. The APPROVED {SITE_NAME} brand character [attach the approved design
sheet — never re-describe from memory], [pose/action tied to the slot's job:
e.g. handing over a completed attendance card], expression [one of the ≤3
shipped emotions], beside/behind a real {SITE_NAME} UI element [attach real
screenshot], generous negative space on the [left/right] third for headline;
character occupies at most one third of the frame; transparent background
where the asset will sit on a section surface."

## MASCOT QUALITY BAR (a character asset fails Phase 1 without all seven)
AUTHORITY: brand-character-mascot-designer is the source of truth for 1-4 and 6.
This bar is the checkable summary the flow's gates read — where the two differ,
the SKILL wins and this bar is corrected via framework_update.md.
1. SILHOUETTE TEST: solid black at 64px; ≥4/5 naive viewers identify it in
   ≤3s, ≥3/5 would recognise it again (skill §9). "Looks distinctive" is not
   a result — record the actual tally.
2. LOCKED DESIGN: a versioned lock exists (front / three-quarter / side / 48px /
   silhouette) with immutable identity anchors written down (skill §11).
   Every later asset attaches it; character-consistency-checker verifies drift.
   Changing an identity anchor = formal re-lock + major version, never a tweak.
3. EMOTION BUDGET: at most 3 expressions ship site-wide, each with a named
   communication job. POSE BUDGET: only poses in the locked library.
4. SCALE: legible at 48px (nav/footer) and at hero without redraw. More canvas
   ≠ more detail — no new parts appear because the frame grew (skill §14).
5. FORMAT & PRODUCTION: decided by web-illustration-asset-production-pipeline,
   not by preference. Vector master (SVG) is the canonical identity; the lock
   may never depend on a flattened JPEG. Raster ships only with the written
   trade-off that skill requires. Weight counts against the Q8 budget.
6. ROLE: the character never carries a claim, never stands in for proof, never
   appears in the same viewport as the product-proof visual, never depicts or
   implies a customer, and never resembles a named real person (including the
   uniqbrio-character-bible personas — no blending, no visual echo).
7. PROVENANCE: every shipped character asset has a provenance record (source
   render/master, lock version, tool, prompt, licence, alt-text decision) and
   a filename per skill §20.3: [brand]-mascot-[view|pose|emotion]-[scale]-
   v[major].[minor].[ext]. "mascot_final.png" is an automatic FAIL.
Motion: only via web-motion-implementation-director, within approved poses;
prefers-reduced-motion must render a static frame.

## USAGE RULES
- Always attach REAL app screenshots for any product depiction — never let
  the model invent UI (app_reality rule).
- Generated asset → hand to web-illustration-asset-production-pipeline BEFORE
  commit: human curation gate, format decision, optimize, provenance record.
  A render is a candidate, never a commit. Hero images ≤120KB, icons as SVG
  where possible. No asset enters the repo unrouted through that skill.
- Log each generated asset's prompt + file path + provenance record in
  decisions_log.md.
- New recurring asset type → add a template here (append-only).
- Brand character: the approved design sheet path is recorded in
  site_profile.md and referenced by every subsequent character prompt.
