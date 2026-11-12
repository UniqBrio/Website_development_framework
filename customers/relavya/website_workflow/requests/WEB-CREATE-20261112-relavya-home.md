# CONTEXT BRIEF — written by /wcreate from the owner's raw context

REQUEST ID: WEB-CREATE-20261112-relavya-home
DATE: 2026-11-12
RUN MODE: AUTOPILOT (website_workflow/autopilot.md) — one owner review at the end

## SOURCE MATERIAL (everything the owner handed over — read in full)
| # | Item | Kind | Read? | What it supplied |
|---|---|---|---|---|
| 1 | relavya-website-ui.zip (home, how-it-works, FAQ) | earlier build (this pipeline) | yes | All product copy and claims, the live app links, the logo, colour tokens, sample screens |
| 2 | Relavya_product_assets_request.zip (design-tool build + design system) | earlier build / reference | yes — rendered locally | The visual direction the owner prefers: animated hero globe, scroll-pinned story, a reference sketch (you → events → people) |
| 3 | The owner's message | text | yes | "The hero image should talk about the context"; premium; images and animation produced automatically; one review |
| 4 | https://www.octograf.com/ | URL | UNREACHABLE — host blocked by this session's network policy | Nothing. Not described from memory. |

## THE PRODUCT, IN THE OWNER'S WORDS (from item 1)
What it is: a follow-up app for people who meet people at events.
Who it is for: founders and B2B operators who go to a conference, expo, meetup or business meeting at least once a month.
The problem it removes: the context of a conversation is gone by the time you sit down to write the follow-up.
How it works: pick the active event → save the person (a name is enough) → one line on what you talked about and the next step → Relavya writes a follow-up for WhatsApp, LinkedIn or email → you send it from your own account and confirm "Yes, sent".
What it is NOT: a shared CRM, an auto-sender, a card-swapping network, a feed.

## CORE IDEA SENTENCE
For people who meet people at events, Relavya turns a handshake you would have forgotten into a follow-up you actually send, by remembering who you met, where, what you talked about and what you promised.
Nouns: you · events · people · what you talked about · what you promised · the follow-up.   The one verb: remember (so that you follow up).

## TRUTH
See ../app_reality.md — every claim on the page is taken from item 1, marked owner-stated.

## WHAT TO BUILD
Pages in scope: the home page.   Primary action: install the app (Android / iOS links from item 1).
Explicitly out of scope: how-it-works and FAQ pages, legal pages, any backend.

## BRAND
Supplied: name, logo (item 1), colour values and fonts (design system in item 2: Plus Jakarta Sans, Inter, Space Mono).
Assumed: none. Colour tokens were copied from the supplied design system, NOT regenerated from a seed with tools/generate_palette.py — listed in the review pack.

## REFERENCES THE OWNER POINTED AT
| Reference | What the owner said they like | Scope | Reachable? |
|---|---|---|---|
| Design-tool build (item 2) | "all the animations", a hero that "talks about the context — a globe making connections" | the part named: hero visual + motion | yes |
| octograf.com | its hero "conveys that it's a CRM for personal use" | the part named: hero | no |

## VISUAL DIRECTION
○ Owner named an idea: an animated hero that conveys the core idea, like the connection globe. Entered as ONE scored candidate (design_library.md REF-019).
Motion tier: T3 SIGNATURE — a product whose value is an idea a visitor must get quickly; no minimal-motion cap applies.
Image provider configured: no → rungs 1-2 only for this run.

## UNKNOWNS
| Unknown | Rung | Outcome |
|---|---|---|
| Whether the sample screens match the current app exactly | omit + NEEDS YOU | Shown as "screens redrawn from the Relavya app, with sample data"; owner to confirm or supply screenshots |
| What octograf.com's hero does | omit + NEEDS YOU | Not used. Allow the host to include it |
| Customer count, testimonials, pricing beyond "free, private beta" | omit | No social proof or pricing section built |
| Palette seed | decide | Supplied tokens used as-is |

## SUPABASE / ARCHITECTURE / STRATEGIC
Supabase-touching: no.   New dependency or default-deny category: no (zero dependencies).   STRATEGIC: yes.

## STANDING INSTRUCTIONS (verbatim — do not edit)
Run website_workflow/website_flow.md in AUTOPILOT mode per
website_workflow/autopilot.md: every phase and every check, gates
self-adjudicated in the GATE LEDGER, one owner review of the REVIEW PACK at
the end. Never invent a business fact. Never take an action listed in
autopilot.md STEP 4. No evidence, no pass.
