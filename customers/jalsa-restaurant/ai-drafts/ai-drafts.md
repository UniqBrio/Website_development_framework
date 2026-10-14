# AI drafts — status `AI_DRAFT`

Every entry was written by the framework operator (Claude, an AI) on 2026-09-15. None is customer
text. None is approved. The framework holds each one (`resolveDrafts` → `held`) and the tests prove
none reaches generated or served HTML.

| ID | Target | Draft text | Built only from | Status | Rendered |
|---|---|---|---|---|---|
| AD-01 | `proposition` | Jalsa Restaurant — Indian curries, Chinese dishes, biryani, starters, desserts and drinks. | the business name (F-001) and category names in the menu table (F-010) | AI_DRAFT — CUSTOMER_APPROVAL_REQUIRED | no (held) |
| AD-02 | `metaDescription:/` | Jalsa Restaurant menu: Indian curries, Chinese dishes, biryani, starters, combos, desserts and drinks. | the same | AI_DRAFT — CUSTOMER_APPROVAL_REQUIRED | no (held) |

Both drafts restate what the menu document lists. Even so they are claims: that the restaurant
currently serves these categories, from a document marked "For design illustrations only". That is
why they need the restaurant's approval, not only the reviewer's.

## Drafts deliberately NOT written (refused)
| Would-be draft | Why refused |
|---|---|
| About text | No source says anything about the restaurant beyond its name. Any about text would invent history, ownership, cuisine origin, atmosphere or quality. |
| Dish descriptions | Would invent ingredients, preparation, spice level or dietary status (F-012). |
| Hours, location, "visit us" copy | No hours or location exist (F-023, F-025). |
| "Veg" / "Non-Veg" labels | A dietary and possibly regulated claim inferred from names (F-012, F-030). |
| Quality or popularity language ("authentic", "best", "famous", "family") | Unsupported claims; DD-105 forbids superlatives and outcome claims in drafts. |
| Using "Celebrate Every Bite" as a headline | It is the restaurant's own tagline from the logo (F-003), not an AI draft; publishing it as page copy is a customer decision (approval register A-03). |

## Approval path (as the framework implements it)
`ai_draft` → held → the restaurant approves the exact text → the seam record changes the draft to
`provenance: "approved_ai_draft"` with `approval: { approvedBy, approvedAt }` → published and
reconciled as `delivered`. Proven on this customer's data for AD-02 with a TEST-ONLY simulated
approval that is never written to this workspace (`tests/scenarios/jalsa-real-customer.test.ts`).
For AD-01 the same approval currently makes generation throw (FD-09).
