# /winit record and PHASE 0 — INTAKE & CLASSIFY

Request: `requests/WEB-NEW-20260915-restaurant-website.md` · Date: 2026-09-15

## /winit
| Step | What happened | Deviation |
|---|---|---|
| 1 COPY workflow into the target repo | not copied; the master `website_workflow/` is referenced in place | same as the Ashvattha run: a second drifting copy inside the framework repo would be worse |
| 2 INSTANTIATE site_profile.md, app_reality.md, decisions_log.md | done, from `raw/` only | no owner interview, and — unlike every earlier dry run — **no brief either**. Almost every token is UNRESOLVED. |
| 3 VERIFY | `npm run gate` passed on the tree before the run | — |

## Intake reality — the first finding
`website_flow.md` expects "exactly ONE filled request file" and tells the operator to STOP and
run `/wrequest` when given rough words. This customer gave **no words at all**: a logo and a
menu. `/wrequest` was applied to that input, and its rule ("a field I didn't cover = unknown")
produced a request whose WHAT, WHY, MUST-HAVE, audience and constraints are all `unknown`.

The workflow has no stop condition for "the request itself is unknown", so the dry run
continues. Every gate stays PENDING, and every contract-required value is recorded as inference
(`decisions/transcription-decisions.md`). A production run should stop here and send
`missing/missing-information-inventory.md` §7 to the restaurant. Classification: POLICY (lesson L-01).

## PHASE 0
### 1. Unknown fields
Everything in `missing/missing-information-inventory.md`. Cross-check of CONTENT INPUTS against
the source documents:
- the only visual named anywhere is the logo;
- the menu document names no image.

No visual requirement was dropped.

### 2. Blast radius
Multi-page potential (new site). Config/brand-touching: yes (tokens, logo).

### 2b. Architecture classify
**unknown.** Category/dietary filters could imply client-side filtering. If an interaction is
ever proposed, the DEPENDENCY GATE and PROFILE B apply. The engagement engine rejected the filter
idea at its hard gates, so no dependency arises in this run.

### 3. Supabase
Not touched. Phase 3: N-A — no form, booking, ordering or data store is requested, and none exists in {STACK}.

### 4. Strategic or mechanical
**STRATEGIC**: a new site, positioning, hero, and a price-presentation question (the menu). Phase S is MANDATORY.

### 5. GATE 0 (owner) — review depth: CONCEPTUAL
**PENDING.** The final approver at the restaurant is not identified (M-02). The first-level
reviewer may review the classification (approval register R-04, R-05). That review is not the
GATE 0 approval.
