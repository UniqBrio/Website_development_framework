# Menu source extraction — `raw/jalsa-restaurant-menu.docx`

Machine record: `menu-source-extraction.json` (re-derived from the raw file by
`tools/extract-menu.mjs`; a test fails if it drifts). This page is the human view. **Every value
is verbatim.** Flags are observations beside a value; no value was corrected, merged, re-spelled,
re-cased or completed.

## 1. Document structure, in order
| Locator | Content (verbatim) |
|---|---|
| body paragraph 0 | `For design illustrations only` |
| body paragraph 1 | `Jalsa Restaurant — Menu:` |
| body table 0 | 53 rows: header `#` · `Menu Item` · `Price` · `Category` (bold), then 52 item rows |
| body paragraph 2 | (empty) |
| body paragraph 3 | `category filters:` |
| body paragraphs 4-17 | a bulleted list of 14 bold items (§3) |
| body paragraph 18 | (empty) |

Hidden-content check (all zero): hidden text, tracked insertions, tracked deletions, comments,
text boxes, drawings/images, hyperlinks, content controls.

**The first line governs the whole document:** `For design illustrations only`. The document
does not say whether the menu is current, complete or approved for publication (F-006).

## 2. Menu table, verbatim (52 rows)
"Seam" = whether the item text entered the engine input as an offer name.

| # | Menu Item | Price | Category | Flags | Seam |
|---|---|---|---|---|---|
| 1 | Egg Kheema Masala | ₹130 | Indian Curry | — | transcribed |
| 2 | Veg Pulav | ₹120 | Rice | — | transcribed |
| 3 | Mix Veg Kadai | ₹180 | Indian Curry | — | transcribed |
| 4 | Onion Cucumber Raita | ₹45 | Salads | — | transcribed |
| 5 | Matar Paneer | ₹160 | Indian Curry | — | transcribed |
| 6 | Paneer Tikka Masala | ₹228 | Indian Curry | — | transcribed |
| 7 | Paneer Butter Masala | ₹191 | Indian Curry | — | transcribed |
| 8 | Kadai Paneer | ₹180 | Indian Curry | — | transcribed |
| 9 | Dal Fry | ₹120 | Indian Curry | — | transcribed |
| 10 | Mutton Masala | ₹290 | Indian Curry | — | transcribed |
| 11 | Mutton Chettinadu | ₹320 | Indian Curry | — | transcribed |
| 12 | Mutton Kadai | ₹290 | Indian Curry | — | transcribed |
| 13 | Mutton Shuka | ₹110 | Indian Curry | — | transcribed |
| 14 | Butter Chicken Masala | ₹290 | Indian Curry | — | transcribed |
| 15 | Chicken Tikka Masala | ₹280 | Indian Curry | — | transcribed |
| 16 | Chicken Tawa Masala | ₹260 | Indian Curry | — | transcribed |
| 17 | Kadai Chicken | ₹180 | Indian Curry | — | transcribed |
| 18 | Chicken Chettinad | ₹240 | Indian Curry | — | transcribed |
| 19 | Chicken Masala | ₹220 | Indian Curry | — | transcribed |
| 20 | Chicken Chukka | ₹100 | Indian Curry | — | transcribed |
| 21 | Egg Burji | ₹80 | Indian Curry | — | transcribed |
| 22 | Egg Masala | ₹95 | Indian Curry | — | transcribed |
| 23 | Chicken Nuggets | ₹140 | Starters / Non-Veg Starters | MULTI_OR_AMBIGUOUS_CATEGORY | transcribed |
| 24 | Chicken Manchurian | ₹190 | Chinese | — | transcribed |
| 25 | Chicken Chilly | ₹190 | Chinese | — | transcribed |
| 26 | Chicken Manchow Soup | ₹140 | Chinese | — | transcribed |
| 27 | Chicken Hot & Sour Soup | ₹150 | Chinese | — | transcribed |
| 28 | Veg Hot & Sour Soup | ₹135 | Chinese | — | transcribed |
| 29 | Chicken Clear Soup | ₹140 | Chinese | — | transcribed |
| 30 | Veg Clear Soup | ₹110 | Chinese | — | transcribed |
| 31 | Chilli Paneer | ₹220 | Chinese / Veg Starters | MULTI_OR_AMBIGUOUS_CATEGORY | transcribed |
| 32 | Paneer 65 | ₹130 | Veg Starters | — | transcribed |
| 33 | Chicken Lollipop — 1 pc | ₹30 | Non-Veg Starters | PORTION_IN_NAME | transcribed |
| 34 | Chicken Tikka — 5 pc | ₹260 | Non-Veg Starters | PORTION_IN_NAME | transcribed |
| 35 | Tandoori Chicken | ₹130 | Non-Veg Starters | — | transcribed |
| 36 | Tandoori Chicken — [variant] | ₹240 | Non-Veg Starters | BRACKETED_TRANSCRIPTION_NOTE | withheld |
| 37 | Kebab Half | ₹70 | Non-Veg Starters | PORTION_IN_NAME | transcribed |
| 38 | Gulab Jamun — 1 pc | ₹30 | Desserts | PORTION_IN_NAME | transcribed |
| 39 | Milk Halwa | ₹110 | Desserts | — | transcribed |
| 40 | Horlicks | ₹25 | Drinks | — | transcribed |
| 41 | Badam Milk | ₹25 | Drinks | — | transcribed |
| 42 | Lime Tea | ₹12 | Drinks | — | transcribed |
| 43 | Royal Falooda | ₹290 | Drinks / Desserts | MULTI_OR_AMBIGUOUS_CATEGORY | transcribed |
| 44 | Veg Pepper Salt | ₹140 | Chinese / Veg Starters | MULTI_OR_AMBIGUOUS_CATEGORY | transcribed |
| 45 | Full Biryani | ₹115 | Biryani | PORTION_IN_NAME | transcribed |
| 46 | Dinner Combo 1 | ₹299 | Combo | — | transcribed |
| 47 | Dinner Combo 2 | ₹299 | Combo | — | transcribed |
| 48 | Dinner Combo 3 | ₹448 | Combo | — | transcribed |
| 49 | Dinner Combo 4 | ₹248 | Combo | — | transcribed |
| 50 | Crispy Chilli Baby Corn | ₹160 | Chinese / Veg Starters | MULTI_OR_AMBIGUOUS_CATEGORY | transcribed |
| 51 | Chicken Fried Rice / [item partially visible] | ₹170 | Rice / Chinese | BRACKETED_TRANSCRIPTION_NOTE, PARTIAL_ENTRY, MULTI_OR_AMBIGUOUS_CATEGORY, MULTI_VALUE_ITEM | withheld |
| 52 | Chicken Biryani Combo / [text partially visible] | ₹90 | Biryani / Combo | BRACKETED_TRANSCRIPTION_NOTE, PARTIAL_ENTRY, MULTI_OR_AMBIGUOUS_CATEGORY, MULTI_VALUE_ITEM | withheld |

Flag meanings: BRACKETED_TRANSCRIPTION_NOTE — the item text contains a bracketed note that is not a
dish name; PARTIAL_ENTRY — the source says the text is only partially visible;
MULTI_OR_AMBIGUOUS_CATEGORY — the category cell joins two names with " / "; MULTI_VALUE_ITEM — the
item cell joins two values with " / "; PORTION_IN_NAME — a quantity or portion appears in the name.

## 3. Filter list, verbatim
Trailing spaces are part of the source (shown as ␠).

| Locator | Text |
|---|---|
| body paragraph 4 | `All Items ␠` |
| body paragraph 5 | `Biryani ␠` |
| body paragraph 6 | `Bread ␠` |
| body paragraph 7 | `Drinks ␠` |
| body paragraph 8 | `Full Day ␠` |
| body paragraph 9 | `Indian Curry ␠` |
| body paragraph 10 | `Rice ␠` |
| body paragraph 11 | `Starters ␠` |
| body paragraph 12 | `Chinese ␠` |
| body paragraph 13 | `Combo ␠` |
| body paragraph 14 | `Desserts ␠` |
| body paragraph 15 | `Salads ␠` |
| body paragraph 16 | `Veg Starters ␠` |
| body paragraph 17 | `All / Veg / Non-Veg dietary filters` |

## 4. Cross-reference observations (counted, not interpreted)
**Categories.** 15 distinct category cell values. Split on " / ", 11 names: Indian Curry, Rice,
Salads, Starters, Non-Veg Starters, Chinese, Veg Starters, Desserts, Drinks, Biryani, Combo.

| Filter list item | Rows whose category cell equals it | Rows whose category cell contains it as a " / " part |
|---|---|---|
| All Items | 0 | 0 (reads as a pseudo-filter; not a category) |
| Biryani | 1 | 2 |
| **Bread** | **0** | **0** |
| Drinks | 3 | 4 |
| **Full Day** | **0** | **0** |
| Indian Curry | 20 | 20 |
| Rice | 1 | 2 |
| Starters | 0 | 1 |
| Chinese | 7 | 11 |
| Combo | 4 | 5 |
| Desserts | 2 | 3 |
| Salads | 1 | 1 |
| Veg Starters | 1 | 4 |
| All / Veg / Non-Veg dietary filters | — | no row carries a dietary value |

- "Non-Veg Starters" (5 rows as a whole cell, 6 as a part) appears in the table but **not** in the filter list.
- "Bread" and "Full Day" are filters with **no** rows. The source does not say what "Full Day" means.
- The only "Salads" row is "Onion Cucumber Raita".

**Dietary.** The list names "All / Veg / Non-Veg dietary filters", but the table has no dietary
column and no row states veg or non-veg. **The framework refuses to infer it from dish names**:
names do not establish ingredients (e.g. "Kebab Half", "Full Biryani", "Dinner Combo 1-4",
"Horlicks", "Gulab Jamun" state no ingredient), egg classification varies, and a veg/non-veg
mark may be a regulated labelling claim (F-012, F-030).

**Prices.** 52 values, `₹12` to `₹448`, every one a plain rupee amount. Shared figures:
₹130 (rows 1, 32, 35), ₹120 (2, 9), ₹180 (3, 8, 17), ₹160 (5, 50), ₹290 (10, 12, 14, 43),
₹110 (13, 30, 39), ₹260 (16, 34), ₹240 (18, 36), ₹220 (19, 31), ₹140 (23, 26, 29, 44),
₹190 (24, 25), ₹30 (33, 38), ₹25 (40, 41), ₹299 (46, 47).
Figures a customer should confirm (the framework does not judge them wrong): Mutton Shuka ₹110
against other mutton dishes at ₹290-₹320; Chicken Chukka ₹100 against other chicken curries at
₹180-₹290; Royal Falooda ₹290 under Drinks / Desserts against other drinks at ₹12-₹25; Dinner
Combo 1 and 2 both ₹299; non-round ₹191, ₹228, ₹248, ₹448. Whether prices include taxes or
charges is not stated.

**Spelling variants preserved:** Chettinadu (row 11) / Chettinad (row 18); Chilly (row 25) /
Chilli (rows 31, 50). Also "Pulav", "Burji", "Kheema" as written.

**Transcription origin.** The notes "[variant]", "[item partially visible]" and "[text partially
visible]" indicate the table was typed from another source that was not supplied (F-021).

## 5. What the source does NOT contain
Descriptions, ingredients, allergens, spice levels, dietary marks, portion sizes (except five
names), combo contents, availability times, tax notes, images, restaurant address, phone,
hours, or any statement about the restaurant beyond its name.
