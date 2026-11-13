# 14 — Browser compatibility matrix and manual test plan

## Matrix

| Engine / browser | Automated here | Result | Status |
|---|---|---|---|
| Chromium 1243 (Chrome, Edge, Opera, Samsung Internet engine) | yes — 320/768/1280 px, generated + static + UniqBrio-Landing staging copy | all blog checks pass; axe 0 violations | **Verified (automated)** |
| WebKit (Safari macOS, every iOS / iPadOS browser) | no — not installed in this environment | — | **NOT VERIFIED — manual plan below is required before production** |
| Firefox (Gecko) | no — not installed | — | **NOT VERIFIED** |
| Assistive technology | no | — | **NOT VERIFIED** |

The pages use only long-supported platform features: semantic HTML, `<details>`,
native `<video>`/`<audio>`/`<track>`, `loading="lazy"`, CSS custom properties
with fallbacks, logical properties (`inline-size`, `margin-inline`), `:not()`,
`text-underline-offset`. No JavaScript is shipped by the blog branch. Every one
of these is supported by current Safari and Firefox; support is not the same as
verified behaviour, which is why the plan below is mandatory.

## Run the automated check where WebKit and Firefox are installed

```
npx playwright install webkit firefox        # on a machine where that is allowed
node tests/browser/blog-browser-check.cjs <post URL> <index URL> --engines chromium,webkit,firefox \
     --widths 320,768,1280 --out browser.json [--axe /path/to/axe.min.js]
```
The script prints `NOT RUN <engine>` for any engine it could not launch; a
report without that line for webkit is the evidence this plan asks for.

## Manual test plan (per published post, before production)

Devices: an iPhone (current iOS, Safari), an iPad or Mac (Safari), one Android
phone (Chrome), one desktop with Firefox.

| # | Step | Expected | Record |
|---|---|---|---|
| 1 | Open the post | title, subtitle, byline, cover appear; no horizontal scroll in portrait and landscape | screenshot |
| 2 | Pinch-zoom to 200 %, then browser text-size 200 % | text reflows; nothing cut off; tables and code scroll inside their box | pass/fail |
| 3 | Play the video (tap ▶) | it plays inline (iOS: `playsinline`); poster shown before; no autoplay | pass/fail |
| 4 | Turn on captions in the player | the supplied captions display, in sync | pass/fail |
| 5 | Open "Play here" on an embed | the provider's player loads only then; the plain link still works | pass/fail |
| 6 | Hide the animation via its "select to hide or show" control | the GIF disappears; showing it again works | pass/fail |
| 7 | Swipe a wide table / code block | it scrolls within its region; the page does not | pass/fail |
| 8 | Follow a footnote and its back-link | both jump correctly | pass/fail |
| 9 | Safari Reader view | the article text, headings and images are all there | pass/fail |
| 10 | Keyboard (Mac Safari: enable "Press Tab to highlight each item"; Firefox) | every link and control reachable in reading order, focus visible | pass/fail |
| 11 | VoiceOver (iOS rotor → headings; macOS VO+U) | one heading level 1 = title; sections in order; images announce their alt text; the table announces headers; the video controls are named | notes |
| 12 | NVDA + Firefox on Windows, and Windows High Contrast mode | same as 11; text and focus remain visible in forced colours | notes |
| 13 | Dark mode on the device | text stays readable (the site's own theme decides colours) | pass/fail |
| 14 | Slow network (Safari Web Inspector / Firefox throttling) | images reserve their space; no layout jump when they arrive | pass/fail |

Record results in the site's QA register (`website_workflow/qa_workflow.md`)
with the run id and the transaction id of the publish under test.
