# Jalsa Restaurant — customer workspace (first real-customer dry run)

**Status: DRY RUN. Nothing here is published. Nothing here is customer-approved.**
Final readiness: **CUSTOMER INPUT OR APPROVAL BLOCKED** (re-run 2026-09-16 after the framework
remediation; see `docs/FIRST-REAL-CUSTOMER-DRY-RUN-REPORT.md` §29, and §27 for the 2026-09-15 run
that read FRAMEWORK BLOCKED). The framework no longer blocks this site. The restaurant's missing
information and pending approvals do.

Received: 2026-09-15, two files, through a first-level reviewer (not the customer's final approver).

## Where things are

| Area | Holds | Rule |
|---|---|---|
| `raw/` | the two files exactly as received | never written, renamed or normalised; SHA-256 checked by tests |
| `evidence/` | what the raw files actually contain: verbatim menu extraction, logo inspection, raw-file register, **the fact register** (`fact-register.json`, the provenance authority) | extraction is reproducible from `raw/` (`evidence/tools/extract-menu.mjs`); drift fails a test |
| `verified/` | verified facts | **empty** — no customer verification evidence exists |
| `unverified/` | customer material that is present but not verified or approved | a view of the fact register |
| `missing/` | the systematic missing-information inventory | nothing missing is filled |
| `ai-drafts/` | copy written by AI, status `AI_DRAFT` | held; never rendered |
| `approved/` | approved AI drafts and approved facts | **empty** — no approval evidence exists |
| `decisions/` | transcription decisions (operator inference), the Design Decision Record, the engagement decision | every inference labelled as inference |
| `approvals/` | the approval register: what needs customer approval, what the first-level reviewer may review | every customer approval `PENDING` |
| `generated/` | the generated host project (Next.js + static layer) and its raw browser evidence | written by `tests/host/jalsa.host.ts` |
| `evidence-run/` | the dry-run digest from the host run | written by `tests/host/jalsa.host.ts` |
| `website_workflow/` | the production workflow records (Phase 0 → Phase 5) and the engine seam record | `runs/…/07-engine-seam.md` is the engine's input authority |

## The nine provenance classes kept apart

| Class | Where it lives here |
|---|---|
| a) customer-provided evidence | `raw/`, `evidence/` (fact register `customer_provided_evidence`) |
| b) framework inference | `decisions/transcription-decisions.md`; fact register `framework_inference` |
| c) AI-generated draft | `ai-drafts/`; seam `drafts` with `provenance: "ai_draft"` |
| d) first-level reviewer feedback | `approvals/approval-register.md` §B (empty until the reviewer writes it) |
| e) final customer approval | `approved/` and `approvals/approval-register.md` §A — all PENDING |
| f) external dependency | `missing/missing-information-inventory.md` (EXTERNAL_DEPENDENCY rows) |
| g) human assessment | `approvals/approval-register.md` §C |
| h) framework policy | framework rules cited by id (DD-xxx) in `decisions/` |
| i) evidence requirement | `missing/` and the fact register `evidence_requirement` |

## Reproduce

```
node customers/jalsa-restaurant/evidence/tools/extract-menu.mjs     # re-derive the menu evidence
npx vitest run tests/scenarios/jalsa-real-customer.test.ts           # provenance + integrity, no host
npx vitest run --config vitest.host.config.ts tests/host/jalsa.host.ts  # full host run
```
