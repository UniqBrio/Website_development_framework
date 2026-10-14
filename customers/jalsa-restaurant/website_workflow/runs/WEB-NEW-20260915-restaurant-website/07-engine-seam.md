# ENGINE SEAM — machine-readable records for WEB-NEW-20260915-restaurant-website

Customer: **Jalsa Restaurant** · first real-customer dry run · 2026-09-15

The blocks below are the AUTHORITY for the engine's input (`website_workflow/framework_seams.md`).
Nothing is derived into `engine/*.json`: the host run and the scenario test read this record
through `engineInputFromWorkflow` (`src/workflow/seams.ts`).

**Read this before trusting any value below.** The input contract REQUIRES fields the customer
material does not supply (`description`, `targetAudience`, `websiteObjective`, `industry`). Each
such value is an operator (AI) transcription judgment, recorded with its basis in
`../../../decisions/transcription-decisions.md` (T-numbers below) and listed for customer approval
in `../../../approvals/approval-register.md`. The contract has no field to carry that basis, which
is itself a recorded framework defect (FD-01, FD-02).

| Field | Basis | Decision |
|---|---|---|
| businessName | customer material, unverified | T1 |
| industry `local_business` | operator judgment — the contract has no restaurant/food-service value | T2 |
| subIndustry | quotes the source | T3 |
| description | operator summary of the source's own category names; contract-required; not rendered | T4 |
| targetAudience | **no evidence** — contract-required; the label states the absence instead of inventing an audience | T6 |
| websiteObjective `drive_footfall` | **no evidence** — contract-required; operator inference | T9 |
| servicesProducts | 49 of 52 menu rows, item text verbatim; 3 rows with bracketed transcription notes withheld | T8 |
| availableAssets / availableContent | statuses per `../../../evidence/fact-register.json` | T14 |
| engagement | the menu document's filter list evaluated as a possible requested interaction; its visitor task is `inferred` | T16 |

## Business input

```json framework:business-input
{
  "businessName": "Jalsa Restaurant",
  "industry": "local_business",
  "subIndustry": "restaurant — the word appears in the supplied logo (\"RESTAURANT\") and in the menu document title (\"Jalsa Restaurant — Menu:\")",
  "description": "Jalsa Restaurant. The supplied menu document lists dishes and drinks under the category names Indian Curry, Rice, Salads, Starters, Non-Veg Starters, Veg Starters, Chinese, Desserts, Drinks, Biryani and Combo.",
  "sources": [
    {
      "id": "menu-docx",
      "kind": "customer_document",
      "description": "raw/jalsa-restaurant-menu.docx, received 2026-09-11; the menu table, prices and filter list (evidence/menu-source-extraction.json)",
      "publication": "not_authorized",
      "restrictionEvidence": "For design illustrations only",
      "file": {
        "path": "customers/jalsa-restaurant/raw/jalsa-restaurant-menu.docx",
        "sha256": "2f7fc234a84b4ea6d274b06b95a572414c48de60b7dd6d208a856095e15bfa17"
      }
    },
    {
      "id": "logo-png",
      "kind": "customer_asset",
      "description": "raw/jalsa-restaurant-logo.png, received 2026-09-11; wordmark, \"RESTAURANT\" and the tagline (evidence/logo-inspection.md)",
      "publication": "unknown",
      "file": {
        "path": "customers/jalsa-restaurant/raw/jalsa-restaurant-logo.png",
        "sha256": "878b5c95d44017382c71a01046fa0b169b9098a73e8fc56ca88a5040a5ce5e18",
        "contentCredentials": {
          "statement": "Claude provided this file at the request of a user and may have created or modified the file contents.",
          "generator": "Anthropic Files 1.0.0 (C2PA 2.4.0)",
          "originConfidence": "unknown",
          "signatureValidated": false
        }
      }
    }
  ],
  "targetAudience": [
    {
      "label": "visitors (audience not yet stated by the restaurant)",
      "isPrimary": true,
      "roles": [],
      "basis": "inferred"
    }
  ],
  "servicesProducts": [
    {
      "name": "Egg Kheema Masala",
      "kind": "product",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": false,
      "provenance": {
        "provenance": "customer_supplied_unverified",
        "source": "menu document body table 0, row 1 (source #1)",
        "sourceId": "menu-docx"
      }
    },
    {
      "name": "Veg Pulav",
      "kind": "product",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": false,
      "provenance": {
        "provenance": "customer_supplied_unverified",
        "source": "menu document body table 0, row 2 (source #2)",
        "sourceId": "menu-docx"
      }
    },
    {
      "name": "Mix Veg Kadai",
      "kind": "product",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": false,
      "provenance": {
        "provenance": "customer_supplied_unverified",
        "source": "menu document body table 0, row 3 (source #3)",
        "sourceId": "menu-docx"
      }
    },
    {
      "name": "Onion Cucumber Raita",
      "kind": "product",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": false,
      "provenance": {
        "provenance": "customer_supplied_unverified",
        "source": "menu document body table 0, row 4 (source #4)",
        "sourceId": "menu-docx"
      }
    },
    {
      "name": "Matar Paneer",
      "kind": "product",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": false,
      "provenance": {
        "provenance": "customer_supplied_unverified",
        "source": "menu document body table 0, row 5 (source #5)",
        "sourceId": "menu-docx"
      }
    },
    {
      "name": "Paneer Tikka Masala",
      "kind": "product",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": false,
      "provenance": {
        "provenance": "customer_supplied_unverified",
        "source": "menu document body table 0, row 6 (source #6)",
        "sourceId": "menu-docx"
      }
    },
    {
      "name": "Paneer Butter Masala",
      "kind": "product",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": false,
      "provenance": {
        "provenance": "customer_supplied_unverified",
        "source": "menu document body table 0, row 7 (source #7)",
        "sourceId": "menu-docx"
      }
    },
    {
      "name": "Kadai Paneer",
      "kind": "product",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": false,
      "provenance": {
        "provenance": "customer_supplied_unverified",
        "source": "menu document body table 0, row 8 (source #8)",
        "sourceId": "menu-docx"
      }
    },
    {
      "name": "Dal Fry",
      "kind": "product",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": false,
      "provenance": {
        "provenance": "customer_supplied_unverified",
        "source": "menu document body table 0, row 9 (source #9)",
        "sourceId": "menu-docx"
      }
    },
    {
      "name": "Mutton Masala",
      "kind": "product",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": false,
      "provenance": {
        "provenance": "customer_supplied_unverified",
        "source": "menu document body table 0, row 10 (source #10)",
        "sourceId": "menu-docx"
      }
    },
    {
      "name": "Mutton Chettinadu",
      "kind": "product",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": false,
      "provenance": {
        "provenance": "customer_supplied_unverified",
        "source": "menu document body table 0, row 11 (source #11)",
        "sourceId": "menu-docx"
      }
    },
    {
      "name": "Mutton Kadai",
      "kind": "product",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": false,
      "provenance": {
        "provenance": "customer_supplied_unverified",
        "source": "menu document body table 0, row 12 (source #12)",
        "sourceId": "menu-docx"
      }
    },
    {
      "name": "Mutton Shuka",
      "kind": "product",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": false,
      "provenance": {
        "provenance": "customer_supplied_unverified",
        "source": "menu document body table 0, row 13 (source #13)",
        "sourceId": "menu-docx"
      }
    },
    {
      "name": "Butter Chicken Masala",
      "kind": "product",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": false,
      "provenance": {
        "provenance": "customer_supplied_unverified",
        "source": "menu document body table 0, row 14 (source #14)",
        "sourceId": "menu-docx"
      }
    },
    {
      "name": "Chicken Tikka Masala",
      "kind": "product",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": false,
      "provenance": {
        "provenance": "customer_supplied_unverified",
        "source": "menu document body table 0, row 15 (source #15)",
        "sourceId": "menu-docx"
      }
    },
    {
      "name": "Chicken Tawa Masala",
      "kind": "product",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": false,
      "provenance": {
        "provenance": "customer_supplied_unverified",
        "source": "menu document body table 0, row 16 (source #16)",
        "sourceId": "menu-docx"
      }
    },
    {
      "name": "Kadai Chicken",
      "kind": "product",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": false,
      "provenance": {
        "provenance": "customer_supplied_unverified",
        "source": "menu document body table 0, row 17 (source #17)",
        "sourceId": "menu-docx"
      }
    },
    {
      "name": "Chicken Chettinad",
      "kind": "product",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": false,
      "provenance": {
        "provenance": "customer_supplied_unverified",
        "source": "menu document body table 0, row 18 (source #18)",
        "sourceId": "menu-docx"
      }
    },
    {
      "name": "Chicken Masala",
      "kind": "product",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": false,
      "provenance": {
        "provenance": "customer_supplied_unverified",
        "source": "menu document body table 0, row 19 (source #19)",
        "sourceId": "menu-docx"
      }
    },
    {
      "name": "Chicken Chukka",
      "kind": "product",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": false,
      "provenance": {
        "provenance": "customer_supplied_unverified",
        "source": "menu document body table 0, row 20 (source #20)",
        "sourceId": "menu-docx"
      }
    },
    {
      "name": "Egg Burji",
      "kind": "product",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": false,
      "provenance": {
        "provenance": "customer_supplied_unverified",
        "source": "menu document body table 0, row 21 (source #21)",
        "sourceId": "menu-docx"
      }
    },
    {
      "name": "Egg Masala",
      "kind": "product",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": false,
      "provenance": {
        "provenance": "customer_supplied_unverified",
        "source": "menu document body table 0, row 22 (source #22)",
        "sourceId": "menu-docx"
      }
    },
    {
      "name": "Chicken Nuggets",
      "kind": "product",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": false,
      "provenance": {
        "provenance": "customer_supplied_unverified",
        "source": "menu document body table 0, row 23 (source #23)",
        "sourceId": "menu-docx"
      }
    },
    {
      "name": "Chicken Manchurian",
      "kind": "product",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": false,
      "provenance": {
        "provenance": "customer_supplied_unverified",
        "source": "menu document body table 0, row 24 (source #24)",
        "sourceId": "menu-docx"
      }
    },
    {
      "name": "Chicken Chilly",
      "kind": "product",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": false,
      "provenance": {
        "provenance": "customer_supplied_unverified",
        "source": "menu document body table 0, row 25 (source #25)",
        "sourceId": "menu-docx"
      }
    },
    {
      "name": "Chicken Manchow Soup",
      "kind": "product",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": false,
      "provenance": {
        "provenance": "customer_supplied_unverified",
        "source": "menu document body table 0, row 26 (source #26)",
        "sourceId": "menu-docx"
      }
    },
    {
      "name": "Chicken Hot & Sour Soup",
      "kind": "product",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": false,
      "provenance": {
        "provenance": "customer_supplied_unverified",
        "source": "menu document body table 0, row 27 (source #27)",
        "sourceId": "menu-docx"
      }
    },
    {
      "name": "Veg Hot & Sour Soup",
      "kind": "product",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": false,
      "provenance": {
        "provenance": "customer_supplied_unverified",
        "source": "menu document body table 0, row 28 (source #28)",
        "sourceId": "menu-docx"
      }
    },
    {
      "name": "Chicken Clear Soup",
      "kind": "product",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": false,
      "provenance": {
        "provenance": "customer_supplied_unverified",
        "source": "menu document body table 0, row 29 (source #29)",
        "sourceId": "menu-docx"
      }
    },
    {
      "name": "Veg Clear Soup",
      "kind": "product",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": false,
      "provenance": {
        "provenance": "customer_supplied_unverified",
        "source": "menu document body table 0, row 30 (source #30)",
        "sourceId": "menu-docx"
      }
    },
    {
      "name": "Chilli Paneer",
      "kind": "product",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": false,
      "provenance": {
        "provenance": "customer_supplied_unverified",
        "source": "menu document body table 0, row 31 (source #31)",
        "sourceId": "menu-docx"
      }
    },
    {
      "name": "Paneer 65",
      "kind": "product",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": false,
      "provenance": {
        "provenance": "customer_supplied_unverified",
        "source": "menu document body table 0, row 32 (source #32)",
        "sourceId": "menu-docx"
      }
    },
    {
      "name": "Chicken Lollipop — 1 pc",
      "kind": "product",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": false,
      "provenance": {
        "provenance": "customer_supplied_unverified",
        "source": "menu document body table 0, row 33 (source #33)",
        "sourceId": "menu-docx"
      }
    },
    {
      "name": "Chicken Tikka — 5 pc",
      "kind": "product",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": false,
      "provenance": {
        "provenance": "customer_supplied_unverified",
        "source": "menu document body table 0, row 34 (source #34)",
        "sourceId": "menu-docx"
      }
    },
    {
      "name": "Tandoori Chicken",
      "kind": "product",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": false,
      "provenance": {
        "provenance": "customer_supplied_unverified",
        "source": "menu document body table 0, row 35 (source #35)",
        "sourceId": "menu-docx"
      }
    },
    {
      "name": "Kebab Half",
      "kind": "product",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": false,
      "provenance": {
        "provenance": "customer_supplied_unverified",
        "source": "menu document body table 0, row 37 (source #37)",
        "sourceId": "menu-docx"
      }
    },
    {
      "name": "Gulab Jamun — 1 pc",
      "kind": "product",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": false,
      "provenance": {
        "provenance": "customer_supplied_unverified",
        "source": "menu document body table 0, row 38 (source #38)",
        "sourceId": "menu-docx"
      }
    },
    {
      "name": "Milk Halwa",
      "kind": "product",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": false,
      "provenance": {
        "provenance": "customer_supplied_unverified",
        "source": "menu document body table 0, row 39 (source #39)",
        "sourceId": "menu-docx"
      }
    },
    {
      "name": "Horlicks",
      "kind": "product",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": false,
      "provenance": {
        "provenance": "customer_supplied_unverified",
        "source": "menu document body table 0, row 40 (source #40)",
        "sourceId": "menu-docx"
      }
    },
    {
      "name": "Badam Milk",
      "kind": "product",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": false,
      "provenance": {
        "provenance": "customer_supplied_unverified",
        "source": "menu document body table 0, row 41 (source #41)",
        "sourceId": "menu-docx"
      }
    },
    {
      "name": "Lime Tea",
      "kind": "product",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": false,
      "provenance": {
        "provenance": "customer_supplied_unverified",
        "source": "menu document body table 0, row 42 (source #42)",
        "sourceId": "menu-docx"
      }
    },
    {
      "name": "Royal Falooda",
      "kind": "product",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": false,
      "provenance": {
        "provenance": "customer_supplied_unverified",
        "source": "menu document body table 0, row 43 (source #43)",
        "sourceId": "menu-docx"
      }
    },
    {
      "name": "Veg Pepper Salt",
      "kind": "product",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": false,
      "provenance": {
        "provenance": "customer_supplied_unverified",
        "source": "menu document body table 0, row 44 (source #44)",
        "sourceId": "menu-docx"
      }
    },
    {
      "name": "Full Biryani",
      "kind": "product",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": false,
      "provenance": {
        "provenance": "customer_supplied_unverified",
        "source": "menu document body table 0, row 45 (source #45)",
        "sourceId": "menu-docx"
      }
    },
    {
      "name": "Dinner Combo 1",
      "kind": "product",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": false,
      "provenance": {
        "provenance": "customer_supplied_unverified",
        "source": "menu document body table 0, row 46 (source #46)",
        "sourceId": "menu-docx"
      }
    },
    {
      "name": "Dinner Combo 2",
      "kind": "product",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": false,
      "provenance": {
        "provenance": "customer_supplied_unverified",
        "source": "menu document body table 0, row 47 (source #47)",
        "sourceId": "menu-docx"
      }
    },
    {
      "name": "Dinner Combo 3",
      "kind": "product",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": false,
      "provenance": {
        "provenance": "customer_supplied_unverified",
        "source": "menu document body table 0, row 48 (source #48)",
        "sourceId": "menu-docx"
      }
    },
    {
      "name": "Dinner Combo 4",
      "kind": "product",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": false,
      "provenance": {
        "provenance": "customer_supplied_unverified",
        "source": "menu document body table 0, row 49 (source #49)",
        "sourceId": "menu-docx"
      }
    },
    {
      "name": "Crispy Chilli Baby Corn",
      "kind": "product",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": false,
      "provenance": {
        "provenance": "customer_supplied_unverified",
        "source": "menu document body table 0, row 50 (source #50)",
        "sourceId": "menu-docx"
      }
    }
  ],
  "websiteObjective": [
    "drive_footfall"
  ],
  "websiteObjectiveBasis": "inferred",
  "brandPersonality": [],
  "preferredVisualDirection": [],
  "requiredPages": [],
  "requiredFunctionality": [],
  "availableAssets": {
    "logo": "provided_unverified",
    "brandColors": "partial",
    "heroImages": "unavailable",
    "productImages": "unavailable",
    "teamPhotos": "unavailable",
    "portfolioImages": "not_applicable",
    "video": "unavailable",
    "testimonials": "unavailable",
    "customerLogos": "not_applicable",
    "awards": "unavailable",
    "certifications": "unavailable",
    "reviews": "unavailable"
  },
  "availableContent": {
    "propositionText": "unavailable",
    "serviceDescriptions": "unavailable",
    "aboutText": "unavailable",
    "processExplanation": "unavailable",
    "caseStudies": "not_applicable",
    "pricing": "provided_unverified",
    "faq": "unavailable",
    "legalPolicies": "unavailable",
    "contactDetails": "unavailable",
    "contactEmail": "unavailable",
    "contactPhone": "unavailable",
    "contactAddress": "unavailable",
    "contactWhatsapp": "unavailable",
    "statistics": "unavailable",
    "teamBios": "unavailable",
    "formulas": "unavailable",
    "decisionRules": "unavailable",
    "comparisonData": "unavailable",
    "productSpecifications": "unavailable",
    "pricingRanges": "unavailable",
    "datasets": "provided_unverified"
  },
  "engagement": {
    "preference": "framework_decides",
    "requestedIdea": {
      "category": "product_service_finder",
      "rationale": "The supplied menu document lists \"category filters:\" (All Items, Biryani, Bread, Drinks, Full Day, Indian Curry, Rice, Starters, Chinese, Combo, Desserts, Salads, Veg Starters) and \"All / Veg / Non-Veg dietary filters\". It does not say whether these are requested for the website or describe an existing ordering interface."
    },
    "visitorTasks": [
      {
        "task": "find_suitable_offer",
        "basis": "inferred",
        "detail": "inferred by the operator from the filter list in the menu document (body paragraphs 3-17); no visitor task is stated by the customer"
      }
    ]
  },
  "businessNameProvenance": {
    "provenance": "customer_supplied_unverified",
    "source": "menu document body paragraph 1 (\"Jalsa Restaurant — Menu:\") and the logo wordmark",
    "sourceId": "menu-docx"
  }
}
```

## Supplied content (values)

No contact value, copy value or verified asset exists. The logo FILE is supplied so the
framework's asset gate is exercised: the inventory records it `provided_unverified`, so the
generator must refuse it. The two drafts are `ai_draft` with no approval, so they must be HELD
and never reach served HTML.

```json framework:supplied-content
{
  "assets": {
    "logo": {
      "src": "/brand/jalsa-restaurant-logo.png",
      "width": 150,
      "height": 150,
      "alt": "Jalsa Restaurant",
      "decorative": false
    }
  },
  "drafts": [
    {
      "target": "proposition",
      "value": "Jalsa Restaurant — Indian curries, Chinese dishes, biryani, starters, desserts and drinks.",
      "provenance": "ai_draft",
      "source": "AI_DRAFT written by the framework operator (Claude) on 2026-09-15 from the category names in evidence/menu-source-extraction.json; not customer text; see ai-drafts/AD-01"
    },
    {
      "target": "metaDescription:/",
      "value": "Jalsa Restaurant menu: Indian curries, Chinese dishes, biryani, starters, combos, desserts and drinks.",
      "provenance": "ai_draft",
      "source": "AI_DRAFT written by the framework operator (Claude) on 2026-09-15 from the category names in evidence/menu-source-extraction.json; not customer text; see ai-drafts/AD-02"
    }
  ],
  "assetSources": {
    "logo": "logo-png"
  }
}
```

## Test register cases evaluated from evidence

```json framework:test-register
[
  { "id": "TC-DATA-001", "title": "The dataset carries no synthetic marker (it cannot prove a real customer supplied it)", "check": "dataset.not_synthetic" },
  { "id": "TC-INT-001", "title": "Every decided capability delivered or explicitly unavailable", "check": "integrity.consistent" },
  { "id": "TC-FUNC-001", "title": "A visitor can complete a conversion action", "check": "conversion.completable_action" },
  { "id": "TC-CONT-001", "title": "No placeholder text on indexable pages", "check": "indexability.no_placeholder_text" },
  { "id": "TC-CONT-002", "title": "No two indexable pages serve the same body", "check": "indexability.no_duplicate_pages" },
  { "id": "TC-UI-001", "title": "Compact navigation delivered and operable on a phone", "check": "navigation.compact_delivered" },
  { "id": "TC-RESP-001", "title": "Measured responsive sweep, both engines", "check": "gate.responsive" },
  { "id": "TC-A11Y-001", "title": "Accessibility gate at the requested target", "check": "gate.accessibility" },
  { "id": "TC-TECH-001", "title": "Technical gate: build, lint, routes, admitted dependencies only", "check": "gate.technical" },
  { "id": "TC-PERF-001", "title": "Performance gate: measured bundle and vitals", "check": "gate.performance" },
  { "id": "TC-CONT-003", "title": "Content gate", "check": "gate.content" },
  { "id": "TC-DES-001", "title": "Design gate", "check": "gate.design" },
  { "id": "TC-ENG-001", "title": "Delivered experiences work (none expected unless selected)", "check": "experiences.work" }
]
```

<!-- framework:generated:register-results:start -->
<!-- GENERATED by the framework; edits between these markers are overwritten. -->
### Register results — host run 2026-09-16T07:02:41.596Z

| ID | Title | Check | Result | Evidence |
|---|---|---|---|---|
| TC-DATA-001 | The dataset carries no synthetic marker (it cannot prove a real customer supplied it) | `dataset.not_synthetic` | PASS | no synthetic markers |
| TC-INT-001 | Every decided capability delivered or explicitly unavailable | `integrity.consistent` | PASS | integrity {"delivered":10,"unavailable":54,"mismatch":0} |
| TC-FUNC-001 | A visitor can complete a conversion action | `conversion.completable_action` | FAIL | measured: none of 1 served page(s) offers a completable conversion action (an enabled form with an action, or a mailto:/tel:/WhatsApp link), so drive_footfall (directions_and_call) cannot convert |
| TC-CONT-001 | No placeholder text on indexable pages | `indexability.no_placeholder_text` | FAIL | measured: 1 indexable page(s) serve placeholder text a search engine would index: / (4 slots, 1 pending marker) |
| TC-CONT-002 | No two indexable pages serve the same body | `indexability.no_duplicate_pages` | PASS | duplicate indexable pages: no finding |
| TC-UI-001 | Compact navigation delivered and operable on a phone | `navigation.compact_delivered` | PASS | rendered and operated in a browser: works |
| TC-RESP-001 | Measured responsive sweep, both engines | `gate.responsive` | PASS | gates.responsive=true |
| TC-A11Y-001 | Accessibility gate at the requested target | `gate.accessibility` | PASS | gates.accessibility=true |
| TC-TECH-001 | Technical gate: build, lint, routes, admitted dependencies only | `gate.technical` | PASS | gates.technical=true |
| TC-PERF-001 | Performance gate: measured bundle and vitals | `gate.performance` | PASS | gates.performance=true |
| TC-CONT-003 | Content gate | `gate.content` | FAIL | gates.content=false |
| TC-DES-001 | Design gate | `gate.design` | PASS | gates.design=true |
| TC-ENG-001 | Delivered experiences work (none expected unless selected) | `experiences.work` | BLOCKED | no delivered experience was operated |
<!-- framework:generated:register-results:end -->
