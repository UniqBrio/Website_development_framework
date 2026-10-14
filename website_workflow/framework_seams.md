# FRAMEWORK SEAMS — where workflow records and the TypeScript engine meet

Added 2026-09-14 after the first customer dry run. That run found five manual seams:
- brief → engine JSON was transcribed by hand;
- Phase 2 dependency denials never reached the host;
- test register results were typed by reading a digest.

This file is the contract that replaced them. The executable side is
`src/workflow/seams.ts`.

## 1. Records → engine (markdown is the authority)

A run record carries fenced JSON blocks tagged with a kind:

````
```json framework:business-input
{ ...the BusinessInput contract... }
```
````

| Kind | Written at | Consumed as |
|---|---|---|
| `business-input` | Phase 2 Step 0 (transcription; judgments stay in the plan's table) | `parseBusinessInput` |
| `supplied-content` | whenever owner values arrive | the generator's `suppliedContent` |
| `dependency-decisions` | Phase 2 Step 6b (a), the DEPENDENCY GATE | `constraints.dependencyDecisions` → dependency admission |
| `test-register` | Phase 2 / qa_workflow.md register creation | cases evaluated from evidence (§3) |

Rules:
- **One authority per value.** There is exactly one `business-input` block and at most one `supplied-content` block across a request's records. A package decided twice with different verdicts is an error.
- **Derived JSON never leads.** Any `engine/*.json` is derived from the blocks, and a test fails when they drift. Edit the record, not the JSON.
- **The gate reaches the host.** A package the gate DENIED is never installed. A package that awaits approval is not installed, and its generated consumer is not emitted.

## 2. Engine → records (generated sections)

Machine output is written only between markers:

```
<!-- framework:generated:<id>:start -->
...
<!-- framework:generated:<id>:end -->
```

Text outside the markers is never touched, and text inside them is replaced on every run.

## 3. Register → evidence

A `test-register` case is `{ "id", "title", "check" }`. `check` names an entry in the closed registry `REGISTER_CHECKS`:
- the six quality gates;
- a completable conversion action;
- no placeholder text and no duplicate bodies on indexable pages;
- decision-to-execution integrity;
- compact navigation delivered and operated;
- delivered experiences working;
- a dataset not marked synthetic.

A case naming an unknown check is an error. A check whose evidence is missing is BLOCKED, never PASS.

## 4. What still needs a person

- The transcription judgments themselves (industry, personality, page slugs) are AI or operator judgment, recorded in the Phase 2 plan. The seam carries the result; it does not make the judgment.
- Gate approvals (dependency, content drafts, SEO descriptions) are human decisions. The seam carries the decision once it is made.
