# SAAS WEBSITE AUDIT — 22-section multi-AI conversion, UX & revenue leak audit
<!-- website_workflow/saas_website_audit.md — added 2026-10-31 from the owner's
     "Framework for identifying B2B SaaS website improvements". Use it to find
     what to improve on a LIVE site. It produces a REPORT, never a change: every
     fix it finds enters the pipeline through /wrequest like any other request. -->

## When to run
- Before scaling paid traffic, and then monthly (Section 21 asks for a regular
  score; this is that score).
- After a large release, to measure the change against the last baseline.
- Not a replacement for strategy_audit.md (one page, researched, matrix-scored)
  or /waudit. This file audits the WHOLE site against a fixed external blueprint.

## Inputs
| Input | Where |
|---|---|
| Blueprint (short, 12 sections) | blueprints/saas-website-blueprint.html |
| Blueprint (full, 24 sections — attach this one) | blueprints/saas-master-blueprint-2026.html |
| Product truth for the brand block | app_reality.md, site_profile.md |
| Worked example of the final output | examples/uniqbrio-master-audit-2026.html (consensus 56/100, leak HIGH) |

The full blueprint's Sections 23 (free tools) and 24 (AI agent audit prompt)
are out of scope; the prompt below tells every tool to ignore them.

## Step 1 — Run the audit prompt in five AI tools
Attach blueprints/saas-master-blueprint-2026.html and paste the prompt below,
unchanged, into each of: Claude, Gemini, ChatGPT, DeepSeek, Grok. Fill the
brand block from site_profile.md and app_reality.md — never from memory. Save
each tool's answer as a separate file; Step 2 needs all five.

```text
My brand details:

[PRODUCT DESCRIPTION — one paragraph, every capability named must exist in app_reality.md]

Target audience: {ICP}

Tagline: [TAGLINE — as it appears on the live site]

My website is: {SITE_DOMAIN}

I have attached an HTML blueprint file for reference.

You are a senior B2B SaaS conversion strategist, UX expert, and technical SEO
specialist. Conduct a comprehensive conversion, UX, and revenue leak audit of
my website using:

1. The evaluation framework below (22 sections)
2. The attached HTML blueprint file (ignore Sections 23 and 24)

Your goal is to provide a structured, practical, and implementation-ready
improvement report.

────────────────────────────────────────
AUDIT FRAMEWORK — Evaluate each section and Score 1–10
────────────────────────────────────────

PART 1 — WEBSITE BLUEPRINT

1. HOMEPAGE STRUCTURE
- Does the page follow the correct scroll sequence: Hero → Trust Logo Bar →
  Problem → Solution → Features → How It Works → Testimonials → Use Cases →
  Pricing Preview → FAQ → Final CTA → Footer?
- Is there a clear awareness → trust → intent → action progression?
- Are all 12 homepage zones present and purposeful?
- Does the page achieve clarity in 5 seconds, trust in 15, interest in 30,
  and action within 2 minutes?

2. NAVIGATION MENU
- Is there a sticky header that remains visible on scroll?
- Is the logo top-left and linked to the homepage?
- Are there max 5–6 nav items (not counting Login + CTA)?
- Is the CTA button visually distinct (color + weight) from nav links?
- Is there a visible Login link?
- Is the Pricing page accessible directly from the nav?
- Are avoid-items present: "Home" tab, hamburger on desktop, 3-level
  dropdowns, 12+ nav items?

3. HERO SECTION
- Is the headline outcome-focused using the formula: [Achieve Outcome] +
  [for Target Audience] + [in Timeframe or Differentiator]?
- Is there a single, clear primary CTA above the fold?
- Is a real product visual (not stock imagery) shown — dashboard screenshot
  or looping UI video?
- Is there an immediate trust signal (logo bar, rating badge) below or
  adjacent to the hero?
- Are avoided elements absent: vague taglines, rotating carousels,
  auto-playing audio, 3+ competing CTAs?

4. SOCIAL PROOF & TESTIMONIALS
- Are testimonials attributed with real name, full title, company name, and
  headshot?
- Are outcomes quantified (e.g., "saved $120K", "collection rate rose 25%")
  rather than generic praise?
- Are client logos shown and recognizable to the target buyer tier?
- Is there a review platform badge (G2, Capterra, or Trustpilot) with star
  rating and count?
- Are usage stats present (e.g., "10M+ automations run", "3,000+ active
  companies")?
- Are testimonials placed strategically: below hero, alongside pricing, and
  on a full case studies page?

5. FEATURES / PRODUCT SECTION
- Are features framed around problems solved (not just capabilities)?
- Does each feature block follow the formula: Pain → Feature → Outcome?
- Are real product screenshots or animated GIFs shown next to each feature
  block?
- Are features grouped logically (by role, goal, or module)?
- Is a "Business Impact" line included per feature (e.g., "Saves 4
  hours/week per admin")?
- Are tabs or toggles used if there are 6+ features to prevent endless
  scrolling?

6. PRICING PAGE
- Is pricing publicly accessible without requiring a sales call (for SMB
  tiers)?
- Are there 3 clear tiers (Starter / Growth / Enterprise) with a feature
  comparison table?
- Is there a monthly ↔ annual billing toggle showing savings percentage?
- Is there a "Most Popular" badge on the recommended tier?
- Is there a billing FAQ covering cancellation, contracts, seat limits, and
  overages?
- Is there a testimonial adjacent to pricing cards to reduce hesitation?
- Is "Contact Sales" reserved for Enterprise only — never as the sole option?

7. DESIGN ELEMENTS
- Is the color palette restrained (2–3 primary colors maximum)?
- Is body font minimum 16px throughout?
- Is whitespace generous (80–120px minimum between sections)?
- Is a consistent 8px grid system applied?
- Are font choices modern and readable (display font for headings, clean
  sans-serif for body)?
- Are micro-animations used subtly (hover states, scroll reveals, button
  feedback)?
- Is dark mode support present (increasingly expected in SaaS 2026)?

8. IMAGES — WHAT & WHERE
- Is the hero using a real product dashboard screenshot in a device/browser
  mockup frame?
- Are client logos in the logo bar monochrome/grayscale SVG format?
- Are real product screenshots used in the Features section (not wireframes
  or blurry mockups)?
- Are testimonial headshots real and consistently cropped?
- Are stock images of office handshakes or staged "laptop stare" photos
  absent?
- Are blog/resource covers branded consistently with a template layout?

9. CTA ARCHITECTURE
- Is there a CTA at the end of every major page section?
- Is there friction-reducing microcopy near every CTA (e.g., "No card
  required", "Free 14-day trial")?
- Is there a strong final CTA banner with a bold headline before the footer?
- Are CTAs action-oriented and specific (not generic "Submit" or "Contact")?
- Is CTA timing correctly spaced: immediately above fold, mid-page, and
  final section?

10. TRUST & CREDIBILITY
- Are security/compliance badges visible (SOC2, GDPR, SSL, HIPAA if
  applicable)?
- Is there a real About page with team photos, bios, and founding story?
- Are there case studies with quantified results in STAR format (Situation →
  Action → Result)?
- Is the blog or resource center publishing at least monthly (not dormant
  for 2+ years)?
- Are social proof layers stacked: logos + testimonials + badges + case
  studies + usage stats?

PART 2 — REVENUE LEAK DETECTION

11. ACCESSIBILITY (a11y)
- Does the site pass WCAG 2.1 AA color contrast requirements (≥4.5:1 for
  body text)?
- Is full keyboard navigation supported — every CTA and form reachable via
  Tab?
- Do all images have descriptive alt text?
- Is semantic HTML used correctly: <nav>, <main>, <section>, proper H1–H3
  hierarchy?
- Are ARIA labels applied to interactive elements (icon-only buttons,
  modals)?
- Are focus styles visible (not removed without a custom replacement)?
- Is there a skip-navigation link for screen reader users?

12. SEO SYSTEM
- Does every page have a unique, keyword-targeted <title> tag (50–60
  characters)?
- Does every page have a unique meta description with value prop + CTA
  phrase (130–155 characters)?
- Is the URL structure clean and keyword-rich (e.g., /features/billing not
  /p?id=4829)?
- Is there a single <h1> per page containing the primary keyword?
- Is SoftwareApplication schema markup applied to product pages?
- Are comparison landing pages present (e.g., "YourTool vs. [Competitor]")
  for high-intent SEO?
- Is there a blog/resource center with consistent monthly publishing?
- Is an XML sitemap submitted to Google Search Console?

13. ANALYTICS & TRACKING
- Is Google Analytics 4 (or equivalent) installed and configured with
  conversion goals?
- Are heatmap and session recording tools active (e.g., Microsoft Clarity,
  Hotjar)?
- Are form submission events, CTA clicks, and scroll depth being tracked?
- Is there a UTM-based campaign tracking system for all traffic sources?
- Is funnel drop-off tracking set up (Homepage → Pricing → Sign-Up)?

14. PERFORMANCE & CORE WEB VITALS
- Does the site load in under 3 seconds on both desktop and mobile?
- Are Core Web Vitals in the "Good" range: LCP <2.5s, INP <200ms, CLS <0.1?
- Are images served in next-gen formats (WebP/AVIF) and properly sized?
- Is a CDN used for static asset delivery?
- Are render-blocking scripts deferred or lazy-loaded?
- Does the site achieve a Lighthouse performance score ≥ 80?

15. MOBILE-FIRST UX
- Is the entire site fully responsive and usable on mobile (375px–428px
  viewport)?
- Are all tap targets at least 44×44px?
- Is font sizing legible on mobile without pinch-zooming?
- Do pricing tables, comparison grids, and navigation render correctly on
  small screens?
- Are CTAs thumb-reachable and not obscured by sticky headers or chat
  widgets?

16. LEGAL & COMPLIANCE
- Is there a Privacy Policy linked in the footer?
- Is there a Terms of Service (or Terms of Use) linked in the footer?
- Is there a cookie consent/banner mechanism for GDPR (EU) and CCPA
  (California) compliance?
- Is there a Data Processing Agreement or DPA page available for B2B buyers?
- Are any compliance certifications (SOC2, ISO 27001, GDPR) publicly
  documented?

17. CONVERSION TRACKING KPIs
- Are the following KPIs actively monitored: Visitor-to-Trial rate,
  Trial-to-Paid rate, Demo Request rate, Pricing Page visit rate?
- Is there a benchmark for each KPI and a process for reviewing them monthly?
- Is revenue attribution tracked back to traffic source and landing page?

18. A/B TESTING ENGINE
- Is there an active A/B or multivariate testing process in place?
- Are hero headlines, CTA button copy, and pricing page layouts being tested?
- Is there a prioritization framework (ICE Score or similar) for test ideas?
- Are test results documented and shared with the team?

19. LEAD CAPTURE SYSTEM
- Are lead capture forms present at key conversion points (demo, trial,
  newsletter)?
- Is form length minimized — asking only for what is immediately needed?
- Is there a chatbot or live chat for capturing high-intent visitors in real
  time?
- Are exit-intent popups or scroll-triggered CTAs used to re-engage leaving
  visitors?
- Is there a lead magnet (checklist, template, or audit tool) to capture
  early-stage visitors?

20. POST-CONVERSION ACTIVATION
- Is there a clear, frictionless onboarding flow after sign-up or demo
  request?
- Is there a confirmation/thank-you page that reinforces the decision and
  sets next-step expectations?
- Is there an automated email nurture sequence triggered post-sign-up?
- Are in-app or in-product onboarding tips and tooltips used to guide new
  users?

21. WEBSITE SCORING SYSTEM
- Is there a mechanism or process to score the website regularly against a
  defined framework?
- Are individual section scores tracked over time to measure improvement?
- Are scoring results used to prioritize the development and marketing
  roadmap?

22. 14-DAY EXECUTION PLAN
- Is there a clear, phased improvement roadmap in place?
- Are quick wins (Days 1–3), medium-effort fixes (Days 4–7), and structural
  improvements (Days 8–14) distinguished and planned?
- Is ownership assigned for each task?

────────────────────────────────────────
BLUEPRINT COMPARISON INSTRUCTIONS
────────────────────────────────────────

Use the attached HTML blueprint file as a structural benchmark.
- Ignore Sections 23 and 24.
- Evaluate all other sections individually.
- For each section:
  1. Reference what the blueprint recommends.
  2. Compare it to what currently exists on the website.
  3. Identify gaps or weaknesses.
  4. Provide specific, actionable recommendations (copy, layout, hierarchy,
     visuals, UX improvements, SEO, CRO enhancements).

Avoid generic advice. Be precise and implementation-focused.

────────────────────────────────────────
REQUIRED OUTPUT FORMAT
────────────────────────────────────────

For each of the 22 sections, provide:

[Section Number & Name]
- Score: X/10
- 3 specific strengths
- 3 specific improvements (including suggested copy or design changes where
  applicable)
- Blueprint vs. Website comparison (what the blueprint recommends vs. what
  currently exists)

────────────────────────────────────────
FINAL SUMMARY SECTION
────────────────────────────────────────

After evaluating all 22 sections, provide:
- Top 3 highest-priority fixes (largest conversion impact)
- Top 3 quick wins (fastest to implement)
- A revised hero headline tailored to my product positioning
- Overall site score out of 100
- Revenue leak rating: LOW / MEDIUM / HIGH / CRITICAL
- A brief 5–7 sentence executive summary

Focus on practical, high-leverage conversion improvements suitable for a B2B
SaaS company targeting serious buyers.
```

## Step 2 — Merge the five reports in Claude
Attach all five answers from Step 1 (merged into one file, or as separate
attachments) and paste:

```text
Create a comprehensive and high-quality report by refining and expanding upon
your previous response. Incorporate all key points from the attached sources,
ensuring that:

- All-important insights are included
- Information is well-organized and logically structured
- There is no duplication or redundancy
- The content is clear, concise, and professionally written
- Any overlapping ideas are synthesized into a single, coherent explanation

The final report should be polished, cohesive, and suitable for presentation
or submission. Add all unique relevant corrections list against all sections.
```

Expected output: one report shaped like examples/uniqbrio-master-audit-2026.html.
It contains a cover with the consensus score and leak rating, an executive
summary, and per section a score, strengths, improvements, a corrections table
(priority · correction · implementation note) and blueprint vs. site. It ends
with the final summary, revised hero options and a 22-row score table.

## Step 3 — From report to work (framework rules apply)
The report is evidence for requests. It does not approve anything.
1. TRUTH FIRST. The blueprint asks for review badges, usage stats, logo bars,
   case studies and compliance badges. A recommendation that needs one of these
   is valid only if the thing EXISTS (app_reality.md, real {CUSTOMER_COUNT}).
   AI tools invent numbers inside suggested copy; treat every number as a
   placeholder until it is verified. Example: the worked example's suggested
   "Join 200+ academy owners" banner is unusable until {CUSTOMER_COUNT}
   confirms it. Run every suggested claim through the strategy_audit.md
   claim check; where proof does not exist, use the "Honesty rules by stage"
   substitutes in app_reality.md.
2. VERIFY, DON'T TRUST CONSENSUS. Several tools agreeing is not evidence;
   they may all be guessing from the same blueprint without loading the site.
   Re-check a finding on the live site before it becomes a request, especially
   ones the report itself marks unconfirmed (e.g. "sticky: unconfirmed").
3. THRESHOLDS HAVE ONE HOME (README rule 9). The prompt keeps the blueprint's
   numbers because the external tools cannot read this repo. Inside the
   pipeline, src/performance/budgets.ts, src/accessibility/rules.ts and
   responsive_matrix.md win; a blueprint number that disagrees is a note in
   the report, not a new requirement.
4. ROUTE EACH FIX. Quick wins and bugs → /wrequest with templates/
   website_correction.md or website_bug.md. Strategic items (hero, positioning,
   pricing presentation, new pages) → /wrequest, which runs strategy_audit.md
   and decision_matrix.md scoring. The report's suggested copy is Option B at
   best; current state is always Option A.
5. RECORD THE SCORE (Section 21). In a SITE repo, log each run in
   decisions_log.md with the date, all 22 section scores, the overall score,
   the leak rating and which tools were used. The next run compares against
   it. In the framework master this log stays empty; the worked example is
   the reference instead.
