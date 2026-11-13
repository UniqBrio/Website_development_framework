# 12 — Accessibility verification report

Date: 2026-11-13. Code: branch `claude/determined-davinci-cdxd0b`.
Engine available here: **Chromium only** (Playwright build 1243). WebKit and
Firefox are not installed in this environment and could not be installed
under its rules; they were NOT tested (plan in 14).

This report separates what was MEASURED by a tool, what was LOOKED AT by a
person, and what was NOT VERIFIED. An automated pass is not a statement that a
page is accessible: it is a statement that these checks found nothing.

## Method

`tests/browser/blog-browser-check.cjs` against published pages served over
HTTP, at 320, 768 and 1280 px, plus **axe-core 4.10.2** (WCAG 2.0/2.1/2.2 A
and AA rule tags) as an independent rule engine. axe-core was fetched into a
scratch folder for the run; it is not a repository dependency.

| Area | How it is checked |
|---|---|
| Heading hierarchy | exactly one `<h1>`; no skipped levels |
| Landmarks, language, title | one `<main>`; `lang`; non-empty `<title>` |
| Image alternative text | every image has an `alt` attribute; empty `alt` reported (decorative, or not supplied) |
| Video | native controls; no autoplay; a captions/subtitles track; the track loads cues; the video actually plays |
| Animation | the reader can hide it (WCAG 2.2.2) |
| Names | every link, button, summary, frame and scroll region has an accessible name |
| Tables | header cells; each table in a labelled, focusable scroll region |
| Colour contrast | computed for every text element against its real, blended background (4.5:1, 3:1 large) |
| Keyboard | Tab walk: every stop visible with a focus indicator, order follows the document, bypass blocks when navigation precedes content |
| Responsive | no horizontal page scroll; media and tables fit or scroll inside their own region |
| Runtime | console errors; failed requests (blog files vs. the site's own, reported separately) |

## Results — final code (`c3a7244`), Chromium

| Site | Pages × widths | Checks | axe violations | Notes |
|---|---|---|---|---|
| Generated site (framework tokens) | post + index × 320/768/1280 | 162 / 162 pass | 0 | post with cover, chart, GIF, video + captions, YouTube embed, table, code, footnote, CTA |
| Static HTML site, own layout, no tokens | post + index × 320/768/1280 | 162 / 162 pass | 0 | same post |
| UniqBrio-Landing staging copy (Next.js, dark, no tokens) | 2 posts + index × 320/768/1280 | see 13 | 0 | the only failing line is a caption track the author did not supply (below) |

"NOT MEASURED" in every run: focus inside the browser's own `<video>` control
bar. Looked at instead (screenshot): Chromium draws a thin 1 px ring around the
focused control. It is visible (WCAG 2.4.7 AA met) but weak against the dark
control bar; page CSS cannot restyle native controls.

## Defects found by these checks and fixed

| Defect | Where seen | Fix |
|---|---|---|
| Subtitle, byline and caption text fell back to `GrayText`: 3.95:1 on white | static site | fall back to the site's own text colour |
| On a dark site, `Canvas` fallbacks put white code text on white; links took the browser's default blue on near-black | UniqBrio-Landing | transparent backgrounds; links inherit and stay underlined |
| No `<main>` landmark on a Next.js site whose layout has none | UniqBrio-Landing | the page brings its own `<main>`, only then |
| "Watch on …" link below the 24 px target minimum (WCAG 2.2 SC 2.5.8; axe) | UniqBrio-Landing | standalone links get a 24 px minimum |
| Call-to-action label recoloured to its own button colour: 1:1 | generated site (regression introduced and caught the same day) | links exclude `.c-action` |
| A post with a code block scrolled sideways at 320 px | generated site | the article fills its grid column |
| A video with no captions was not flagged | ingest | `VIDEO_CAPTIONS_MISSING` warning the approver must acknowledge |
| An MP4 with no decodable stream was marked web-ready | ingest | `VIDEO_STREAM_UNREADABLE` warning |

## Content-dependent results (not defects of the workflow)

- **Missing alt text** is reported by the ingest (`ALT_TEXT_MISSING`), must be
  acknowledged by the approver, and is rendered as `alt=""`. A screen reader
  then skips the image. The browser check reports it again as a failure, which
  is correct: the remedy is for the author to supply alt text.
- **Missing captions**: same chain — warned at ingest, acknowledged at
  approval, failed by the browser check. In the staging run the Word post's
  video has no caption file on purpose, to prove the chain.

## Not verified

| Item | Why | Where it must be done |
|---|---|---|
| Safari / WebKit, Firefox | engines not installed here | 14, manual plan |
| Screen readers (VoiceOver, NVDA, TalkBack) | needs a person and the assistive technology | 14 |
| Real phones and tablets, zoom to 400 %, Windows High Contrast / forced colours | needs devices and OS settings | 14 |
| Focus appearance inside native video controls beyond "visible" | drawn by the browser | browser vendor |
| Reading level, plain language, meaningful link text | these are properties of the author's content | owner review |
| Captions' accuracy | the workflow carries the supplied file unchanged | owner review |
