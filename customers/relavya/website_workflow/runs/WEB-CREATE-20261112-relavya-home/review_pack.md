# REVIEW PACK — WEB-CREATE-20261112-relavya-home (Relavya home page)

RUN STATUS: **PARTIAL RUN — a proof of the new concept, production and craft
steps, not a release candidate.** The phases added on 2026-11-12 were run in
full. Several older phases were not run (see §5 NOT COVERED and the gate
ledger). Nothing here is approved for production.

## 1. PREVIEW
- Built page: `customers/relavya/site/index.html` (static HTML + `styles.css` + `app.js`, no dependencies, no build step).
- Screenshots: `customers/relavya/evidence/` — `00-before…` (the earlier pipeline hero), `00-reference…` (the design-tool hero), `01`–`08` (this build).

## 2. THE IDEA
**Core idea sentence.** For people who meet people at events, Relavya turns a
handshake you would have forgotten into a follow-up you actually send, by
remembering who you met, where, what you talked about and what you promised.
**Nouns:** you · events · people · what you talked about · what you promised ·
the follow-up. **Verb:** remember, so that you follow up.

**Candidates and the six tests** (visual_concept.md STEP 3-4):
| Candidate | Family | Caption-off | Swap | Truth | Pairing | Static frame | Motion earns | Result |
|---|---|---|---|---|---|---|---|---|
| A. Phone mockup of the Today screen (the earlier build) | Product in motion | weak — reads as "an app", not what it does | fails — any app | pass | repeats the copy | pass | none — it is static | kept as PROOF in "How it works" |
| B. Rotating world globe with arcs (owner reference, REF-019) | Spatial metaphor | partial — "a network" | fails — the hero of payments, hosting and logistics brands | fails — a world map implies global reach; the product is about people met at local events | partial | pass | pass | principle kept, shape replaced |
| **C. Constellation of the people you met** (ALT-019a) | Object graph | pass — you, events, people, a remembered note, a sent follow-up | pass — only this product has these objects doing this | pass — no map; sample data labelled | pass — shows the headline happening | pass — poster frame carries it | pass — the follow-up visibly travels and lands | **WINNER** |
| D. Stack of business cards resolving into profiles | Before → after | pass | partial — any contact scanner | pass | partial — shows capture, not follow-up | pass | weak | used instead as the problem section's fading card |

A decision_matrix.md score table is NOT included: rule 3 requires a web-research
citation per option and no competitor research was captured in this run. The
choice above rests on the six tests only.

**VISUAL BRIEF — home / hero**
- What the visitor sees first: "You" at the centre of a sphere of people, grouped around three events; one person highlighted with a memory card — where you met, what you talked about, what you promised — marked "Yes, sent".
- Story beats (6.4 s per person, three people, loop 19.2 s): 1 MEET — the person lights up · 2 REMEMBER — the card fills in line by line · 3 FOLLOW UP — a pulse travels you → event → person, card reads "Follow-up ready · WhatsApp" · 4 SENT — ring turns green, "Yes, sent", the tick stays on the person.
- Sample data: nine invented people, three events; labelled on the page.
- Mobile: sphere on top, card docked beneath it; below 430 px wide.
- Motion tier: T3 SIGNATURE. Category 9 (hero), category 10 (problem section), tabs and one-shot reveals elsewhere.
- Production: rung 1 (2D canvas + one DOM card, zero dependencies); poster on rung 2, captured from the visual with `tools/capture_visual.mjs`.
- Text alternative: on the container (`role="img"`). Pause control: yes.

**PAGE STORY**
| # | Section | Job | Visual kind | Skeleton |
|---|---|---|---|---|
| 1 | Hero | What is it? | CONCEPT — constellation | split, copy + visual |
| 2 | The problem | What is my problem? | MECHANISM — one card losing its memory as you scroll | pinned stage + steps |
| 3 | How it works | How does it work? / Is it real? | PRODUCT — five screens, step tabs | tabs + phone |
| 4 | Features | What do I get? | two demo tiles + six icon tiles | weighted bento |
| 5 | Privacy | Can I trust it? | TYPE-ONLY, light surface (the pattern interrupt) | sticky head + numbered list |
| 6 | Who it's for / is not | Is it for me? | TYPE-ONLY | two lists |
| 7 | FAQ | What else? | TYPE-ONLY | accordion |
| 8 | Call to action | What now? | TYPE-ONLY | centred |

## 3. NEEDS YOU
1. **Confirm `app_reality.md`.** It was drafted from your earlier build's copy; nothing was checked against the running app.
2. **The five app screens** are redrawn from your earlier build and captioned "Screens redrawn from the Relavya app, with sample data." Confirm they match the app, or supply real screenshots.
3. **octograf.com** could not be opened (blocked by this session's network settings), so it informed nothing. Allow the host if you want it analysed.
4. **AI image provider.** You chose automatic AI images. None is configured, and this page needed none. To switch it on: name the provider (the tool supports `openai` and `gemini`) and supply its key to the environment.
5. **Event names in sample data.** "INTEC Expo 2026" comes from your earlier build. If you would rather not name a real event, say so and it becomes a generic one.

## 4. DECIDED ON YOUR BEHALF
| Decision | Reason | To reverse |
|---|---|---|
| Hero is a constellation of your people, not a world globe | The globe fails the swap and truth tests; the constellation keeps its depth and motion with the product's own objects | REJECT THE CONCEPT → candidate B is built next |
| The phone mockup moved from the hero to "How it works" | It is proof, and stronger where the visitor asks "is it real?" | say so |
| Header buttons are outline; only section buttons are filled orange | One primary-accent action per viewport (README rule 4) | — |
| Privacy section on a light surface | The page needed one pattern interrupt; trust content suits a calmer surface | say so |
| "Who it's for" and "What it is not" merged into one section | Same visitor question; removes a fourth card grid | say so |
| The "See how it works" link and the scroll progress bar were not built | No job that the nav and the page do not already serve | say so |
| Colour tokens copied from your design system, not regenerated from a seed | The values were supplied; regenerating risked drift | run `tools/generate_palette.py` |
| No new dependency | Canvas and CSS carry everything | — |

## 5. EVIDENCE (measured in this run — `evidence/measurements.json`)
| Check | Result |
|---|---|
| Visual build-contract audit (`tools/audit_visuals.py`) | PASS — 0 fail, 0 warn |
| Console / page errors (Chromium, 6 widths) | 0 |
| Horizontal overflow at 320, 360, 390, 768, 1024, 1440 | none (a 2 px overflow at 320 was found and fixed) |
| Largest contentful paint element | the poster image, 38.5 KB WebP, marked high priority (local file load: ~0.3-0.4 s; not a network measurement) |
| Animation frames while running / paused / off-screen | 60 per s / 0 / 0 |
| Pause button | toggles `aria-pressed` and its label; frames stop and resume |
| Reduced motion | 0 animation frames; static frame with the full memory card; all content visible; pause button hidden |
| Scripts off | poster shown; all five steps and screens visible; no hidden content |
| Step tabs by keyboard | arrow keys move selection and focus; exactly one panel shown |
| Tap targets under 36 px | none |
| Weight | HTML 30 KB, CSS 27 KB, JS 20 KB (6.7 KB gzipped), poster 38.5 KB, logo 5.6 KB; fonts from Google Fonts not counted |

**PREMIUM CRAFT BAR** (judged from screenshots of the built page; 3 rounds used)
| # | Item | Verdict | Screenshot | Fix applied |
|---|---|---|---|---|
| 1 | Concept visual | PASS | 02, 08-390 | round 1: sphere enlarged, links curved, card docked with a leader line |
| 2 | One argument | PASS | headlines read in order | — |
| 3 | Proof placed | PASS (pending NEEDS YOU 2) | 03 | — |
| 4 | Hierarchy at a squint | PASS | 02 | round 1: headline reduced so the visual and button stay in the first screen |
| 5 | Scale contrast | PASS | 02, 05 | — |
| 6 | Rhythm | PASS | eight sections, no skeleton repeated three times; light interrupt at 5 | — |
| 7 | Space | PASS | 04 | round 2: pinned heading no longer slides under the header |
| 8 | One motion language | PASS | 3 durations, 2 easings, all tokens | — |
| 9 | Motion has a job | PASS | 06 | — |
| 10 | Feedback everywhere | PASS for buttons, tabs, tiles, FAQ; hover/focus state screenshots NOT captured | — | — |
| 11 | No filler | PASS | — | — |
| 12 | Mobile is designed | **OPEN** | 08-320 | round 2-3: visual moved into the first screen at 360+; step tabs became chips above the phone |
OPEN FAILS: item 12 — at 320 × 640 the concept visual starts below the first
screen, and at 320 the event labels overlap the centre node during rotation.

**NOT COVERED — do not read the table above as a full Gate 5**
- WebKit: not installed in this environment. Half of the TIER 1 device matrix was not run.
- Phase S research: no competitor teardown and no positioning research; no decision-matrix scores.
- Design decision engine (`npm run gate` contract for this site): not run for Relavya.
- Test register and Playwright specs: not written. The checks above were one scripted pass.
- Lighthouse / Web Vitals on a real network: not run. INP and CLS not measured.
- Contrast: not measured with a tool on this build; colours are the supplied design-system values.
- SEO artifact set: title, description, canonical, one H1, OG tags present; JSON-LD, sitemap, robots and the 1200×630 share image are not.
- Framework stack: this is a static page, not the Next.js app the site would ship as.
- State screenshots (hover / focus) for interactive components: not captured.

## 6. OPEN ITEMS
- Fix craft-bar item 12 at 320 px (shorter hero copy or a smaller sphere; hide event labels that cross the centre).
- Run everything under NOT COVERED before any release.
- Port to the site's real stack; the visual is one self-contained module in `app.js`.

## GATE LEDGER
| Gate | Verdict | Evidence it rests on | Decided on the owner's behalf |
|---|---|---|---|
| 0 | PASS | context brief; scope = home page; STRATEGIC | scope limited to the home page |
| S | **OPEN** | visual brief + six tests present; research and matrix scores missing | concept C |
| 1 | NOT RUN in full | Q-CONCEPT-VISUAL and Q-MOTION-JUSTIFICATION answered in §2; Q1-Q10 not written out | — |
| 2 | PARTIAL | page story, production rungs and motion plan in §2; no test register | zero dependencies |
| 3 | N/A | no Supabase | — |
| 5 | **OPEN** | §5 evidence and craft bar; see NOT COVERED | — |
