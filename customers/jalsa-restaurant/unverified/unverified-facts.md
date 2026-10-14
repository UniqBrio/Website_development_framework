# Unverified customer material

A view of `../evidence/fact-register.json` (the authority). These values are present in the
supplied files. Presence is not verification: none has customer confirmation, and the menu
document is headed "For design illustrations only".

| ID | Fact | Value (verbatim where quoted) | Source | Used by the framework as | Needed | Class |
|---|---|---|---|---|---|---|
| F-001 | Business name | "Jalsa Restaurant" | docx paragraph 1; logo | site name, H1, `<title>`, Organization name | exact trading/legal name confirmed | CUSTOMER_APPROVAL_REQUIRED |
| F-002 | Business type | restaurant | logo "RESTAURANT"; docx title | subIndustry only | service model (dine-in / takeaway / delivery / catering) | CUSTOMER_INPUT_MISSING |
| F-003 | Tagline | "CELEBRATE EVERY BITE" | logo | not used as text | confirm and permit use as copy | CUSTOMER_APPROVAL_REQUIRED |
| F-004 | Logo artwork | 150×150 PNG, no transparency; C2PA: "Claude provided this file … may have created or modified", origin unknown | raw PNG | **refused** by the asset gate; text wordmark shown | confirm official and not AI-made/altered; original high-resolution artwork; permission | CUSTOMER_APPROVAL_REQUIRED |
| F-006 | Menu document authority | "For design illustrations only" | docx paragraph 0 | restricts all menu values (no field carries it: FD-05) | confirm the menu is real, current and publishable | CUSTOMER_APPROVAL_REQUIRED |
| F-007 | Menu items | 52 rows; 49 transcribed verbatim, 3 withheld | docx table rows 1-52 | offer names; rendered as cards in the dry-run output | confirm item list and names | CUSTOMER_APPROVAL_REQUIRED |
| F-008 | Menu prices | 52 amounts, ₹12-₹448 | docx table "Price" | **not rendered** (DD-102) | confirm current prices, tax inclusion, permission to publish | CUSTOMER_APPROVAL_REQUIRED |
| F-009 | Currency | Indian rupee (₹) | every price cell | nothing | — (does not establish location) | NOT_APPLICABLE |
| F-018 | Spelling | Chettinadu/Chettinad; Chilly/Chilli | table rows 11, 18, 25, 31, 50 | preserved verbatim | spelling to publish | CUSTOMER_APPROVAL_REQUIRED |

## Present but ambiguous
| ID | Fact | What is ambiguous | Class |
|---|---|---|---|
| F-010 | Item categories | 7 rows have two category names joined with " / " | CUSTOMER_INPUT_MISSING |
| F-011 | Category filter list | "Bread", "Full Day", "All Items" match no row; "Non-Veg Starters" is not in the list; unclear whether the list is a website requirement or an existing ordering screen | CUSTOMER_INPUT_MISSING |
| F-013 | Row 36 | "Tandoori Chicken — [variant]" ₹240: variant unnamed | CUSTOMER_INPUT_MISSING |
| F-014 | Row 51 | "Chicken Fried Rice / [item partially visible]" ₹170 | CUSTOMER_INPUT_MISSING |
| F-015 | Row 52 | "Chicken Biryani Combo / [text partially visible]" ₹90 | CUSTOMER_INPUT_MISSING |
| F-016 | Portions | stated in only 5 names; "Full Biryani" does not say which biryani | CUSTOMER_INPUT_MISSING |
| F-019 | Price figures | figures to confirm (Mutton Shuka ₹110, Chicken Chukka ₹100, Royal Falooda ₹290, Combo 1 = Combo 2 = ₹299, non-round figures) | CUSTOMER_APPROVAL_REQUIRED |

## Measured from customer files (not decisions)
| ID | Measurement | Class |
|---|---|---|
| F-005 | logo background `#7c1518`, lettering near `#f0f0e8` | CUSTOMER_APPROVAL_REQUIRED (to become a brand seed) |
| F-020 | docx metadata: creator "Sugumar B", created 2026-09-06 | EVIDENCE_GAP (relation to the restaurant unknown) |
