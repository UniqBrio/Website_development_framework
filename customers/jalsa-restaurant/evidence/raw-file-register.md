# Raw file register

Recorded 2026-09-15 before any framework step ran. The files in `raw/` are the customer
material for this dry run; they are read, never written.

| File | Bytes | SHA-256 | File mtime (as received) |
|---|---|---|---|
| `raw/jalsa-restaurant-logo.png` | 34,076 | `878b5c95d44017382c71a01046fa0b169b9098a73e8fc56ca88a5040a5ce5e18` | 2026-09-11 10:35:53 |
| `raw/jalsa-restaurant-menu.docx` | 19,053 | `2f7fc234a84b4ea6d274b06b95a572414c48de60b7dd6d208a856095e15bfa17` | 2026-09-11 10:35:53 |

The hashes are asserted by `tests/scenarios/jalsa-real-customer.test.ts` and
`tests/host/jalsa.host.ts` (before and after the host run).

## What accompanied the files
Nothing. No brief, email, request, contact detail, instruction or approval came with them.
They were supplied by a first-level reviewer, who states they are not the customer's final
approver. Who at the restaurant supplied them, and whether the restaurant authorised their
use, is not evidenced (fact register F-022).

## Inspection method
- **Menu:** the `.docx` package was read directly (`word/document.xml`, `docProps/*`), without
  converting it through a word processor that could re-flow or correct text. Checked for hidden
  text, tracked insertions/deletions, comments, text boxes, drawings, hyperlinks and content
  controls: none present. Detail: `menu-source-extraction.md`.
- **Logo:** PNG chunks parsed; pixels sampled; an enlarged copy was viewed to read the lettering
  (the enlargement is not stored as evidence and is not an asset). Detail: `logo-inspection.md`.

## Package metadata (menu)
| Field | Value |
|---|---|
| dc:creator / lastModifiedBy | Sugumar B |
| created / modified | 2026-09-06T12:21:00Z / 2026-09-06T12:34:00Z |
| Application | Microsoft Office Word |
| Pages / Words | 3 / 336 |

The metadata names who authored the Word file. It does not identify the restaurant, its owner,
or that person's relation to the restaurant (F-020).
