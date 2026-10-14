# /winit record and PHASE 0 — INTAKE & CLASSIFY

Request: `requests/WEB-NEW-20260914-practice-website.md` · Date: 2026-09-14

## /winit — how the customer workspace was instantiated

| winit step | What happened | Deviation |
|---|---|---|
| 1 COPY workflow, commands, skills into the target repo | **Not copied.** The workspace references the master `website_workflow/` in place. | Copying 33 workflow files and 55 skill folders into a dry-run folder of the framework repository would create a second, drifting copy. Recorded, not hidden. |
| 2 INSTANTIATE site_profile.md, app_reality.md, decisions_log.md | Done, from the brief only; the owner could not be interviewed. Every unanswered token is UNRESOLVED with its question. | Owner interview replaced by the written brief. |
| 3 VERIFY (audit_framework.py; forward and reverse token checks) | Self-audit PASS. **Reverse check, measured on the master files a copy would inherit:** 89 literal site-specific assumptions that token replacement cannot remove — "academy" 26, "Supabase" 20, "UniqBrio/UniqBotz" 20, India-market 16, the first site's routes 7. | This is a framework finding: see the report's gaps. |

## PHASE 0

### 1. Unknown fields
From `brief/information-supplied.md`:
- Full office address; phone and WhatsApp number
- Logo file; office photos; brand colour value; fonts
- Canonical host (apex or `www`) and scheme for `ashvattha-tax.example`
- Descriptions for "Company and LLP registration" and "TDS returns"
- Proposition, About, process and FAQ copy; privacy and terms policies
- Evidence for: founding year, client count, rating and review count, ICAI membership particulars
- Whether prices may be shown ("You decide what is best" — see below)
- The email-sending service or backend for the contact form
- Accessibility and performance targets; deadline date

**"You decide what is best" on prices.** The owner delegated a decision that involves
a regulatory question and unverified figures. The framework may recommend, but
publishing prices is a claim decision, not a design decision: it is recorded as
**approval required**, never taken silently.

### 2. Blast radius
multi-page (new site: every route is new). Config/brand-touching: yes (token system,
logo, metadata).

### 2b. Architecture classify
**yes** — (1) a backend or third-party email service for the form; (2) a map embed.
Both are default-deny (stack_doctrine.md) → DEPENDENCY GATE and PROFILE B are MANDATORY
at Phase 2; both DENIED until the owner approves. The WhatsApp button is an outbound
link and adds no dependency, but its number is unknown.

### 3. Supabase
The /wrequest rule forces SUPABASE = unknown for any form, which makes Phase 3
mandatory by rule. {STACK} contains no Supabase and no backend. **Phase 3 has nothing to
review**; it is recorded as N-A with this reason. The rule assumes the first site's
stack — a framework finding.

### 4. Strategic or mechanical
**STRATEGIC** — new pages, positioning, CTAs, claims, media format. Phase S is MANDATORY.

### 5. GATE 0 (owner) — review depth: CONCEPTUAL
**PENDING — owner not available in this dry run.** To approve: scope (one request for the
whole site), classification (multi-page, STRATEGIC, ARCHITECTURE yes), and the unknowns
listed above as explicitly deferred. The dry run continues past this gate to collect
downstream evidence; nothing is published and no gate is marked approved.

### Skills (skills_map.md, Phase 0)
| Skill | Resolved | Applied |
|---|---|---|
| sdlc-pipeline-orchestrator | local fallback | phase order followed as written |
| blast-radius-analyzer | local fallback | blast radius above |
