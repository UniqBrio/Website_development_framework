# ENGINE SEAM — machine-readable records for WEB-NEW-20260914-practice-website

Added with the customer-readiness foundation (2026-09-14), P1-8. The blocks below are
the AUTHORITY for the engine's input. `engine/business-input.json` and
`engine/supplied-content.json` are DERIVED from them by `engineInputFromWorkflow`
(`src/workflow/seams.ts`), and a test fails if the two drift. The transcription
judgments behind the business input are unchanged and remain recorded in
`04-phase2-plan.md` Step 0.

**This workspace is a representative brief for a fictional practice** (see
`docs/CUSTOMER-DRY-RUN-REPORT.md` §1). Its reserved `.example` domain classifies the
dataset as synthetic, and the register case TC-DATA-001 records that.

## Business input (transcribed at Phase 2 Step 0)

```json framework:business-input
{
  "businessName": "Ashvattha Tax & Compliance",
  "industry": "professional_services",
  "subIndustry": "tax, GST and accounting practice led by a Chartered Accountant (ICAI membership stated, unverified)",
  "description": "A small tax and accounting practice in Baner, Pune, handling GST registration and returns, income tax returns, bookkeeping, company and LLP registration, and TDS returns for small businesses, founders, freelancers and salaried people.",
  "maturity": "established",
  "targetAudience": [
    {
      "label": "Small business owners and founders",
      "isPrimary": true,
      "roles": [
        "small business owner",
        "startup founder",
        "trader",
        "online seller"
      ],
      "usageContext": [
        "searches for a GST or tax consultant in Pune, usually on a phone"
      ]
    },
    {
      "label": "Salaried people and freelancers",
      "isPrimary": false,
      "roles": [
        "salaried employee",
        "freelancer"
      ],
      "usageContext": [
        "searches for ITR filing help near them"
      ]
    }
  ],
  "location": {
    "verified": false,
    "country": "India",
    "region": "Maharashtra",
    "city": "Pune",
    "serviceAreas": [
      "Baner",
      "Pimpri-Chinchwad",
      "Hinjewadi",
      "Wakad",
      "Maharashtra (GST and ITR online)"
    ],
    "hasPhysicalPremises": true
  },
  "servicesProducts": [
    {
      "name": "GST registration and return filing",
      "kind": "service",
      "description": "GST registration and monthly or quarterly GST return filing for traders, shops, service businesses and online sellers who need their GSTIN, GSTR-1, GSTR-3B and annual returns done correctly and on time.",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": true
    },
    {
      "name": "Income tax return filing",
      "kind": "service",
      "description": "Income tax return filing for salaried people, freelancers and small business owners, including handling notices from the income tax department.",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": true
    },
    {
      "name": "Bookkeeping and accounting",
      "kind": "service",
      "description": "Monthly books on Tally or Zoho Books for small businesses that don't want a full-time accountant.",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": false
    },
    {
      "name": "Company and LLP registration",
      "kind": "service",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": true
    },
    {
      "name": "TDS returns",
      "kind": "service",
      "customerSupplied": true,
      "priceKnown": false,
      "regulated": true
    }
  ],
  "websiteObjective": [
    "generate_leads",
    "build_credibility"
  ],
  "brandPersonality": [
    "authoritative",
    "warm_human"
  ],
  "preferredVisualDirection": [
    "minimal"
  ],
  "requiredPages": [
    {
      "path": "/",
      "purpose": "home: what the practice does and how to contact it",
      "mustBeIndexable": true
    },
    {
      "path": "/services",
      "purpose": "services overview for GST, income tax, bookkeeping, company registration and TDS",
      "mustBeIndexable": true
    },
    {
      "path": "/about",
      "purpose": "about the practice",
      "mustBeIndexable": true
    },
    {
      "path": "/faq",
      "purpose": "frequently asked questions about tax and GST",
      "mustBeIndexable": true
    },
    {
      "path": "/contact",
      "purpose": "contact the practice with an enquiry",
      "mustBeIndexable": true
    }
  ],
  "requiredFunctionality": [
    "contact_form",
    "map"
  ],
  "availableAssets": {
    "logo": "unavailable",
    "brandColors": "partial",
    "heroImages": "unavailable",
    "productImages": "not_applicable",
    "teamPhotos": "unavailable",
    "portfolioImages": "not_applicable",
    "video": "unavailable",
    "testimonials": "unavailable",
    "customerLogos": "unavailable",
    "awards": "unavailable",
    "certifications": "provided_unverified",
    "reviews": "provided_unverified"
  },
  "availableContent": {
    "propositionText": "unavailable",
    "serviceDescriptions": "partial",
    "aboutText": "partial",
    "processExplanation": "unavailable",
    "caseStudies": "unavailable",
    "pricing": "provided_unverified",
    "faq": "unavailable",
    "legalPolicies": "unavailable",
    "contactDetails": "partial",
    "contactEmail": "verified_available",
    "contactPhone": "unavailable",
    "contactAddress": "partial",
    "statistics": "provided_unverified",
    "teamBios": "unavailable"
  },
  "constraints": {
    "seoDependency": "high",
    "regulationRisk": "high",
    "localization": [
      "en"
    ],
    "integrations": [],
    "launchDeadline": "before the July tax filing season; no date supplied"
  }
}
```

## Supplied content (owner-supplied values)

```json framework:supplied-content
{
  "serviceDescriptions": {
    "GST registration and return filing": "GST registration and monthly or quarterly GST return filing for traders, shops, service businesses and online sellers who need their GSTIN, GSTR-1, GSTR-3B and annual returns done correctly and on time.",
    "Income tax return filing": "Income tax return filing for salaried people, freelancers and small business owners, including handling notices from the income tax department.",
    "Bookkeeping and accounting": "Monthly books on Tally or Zoho Books for small businesses that don't want a full-time accountant."
  },
  "contactDetails": {
    "email": "hello@ashvattha-tax.example"
  }
}
```

## Dependency gate decisions (Phase 2 Step 6b (a))

The gate DENIED `react-hook-form`. `zod` is admissible on the five answers but awaits
owner approval, so it carries no decision here and is not admitted.

```json framework:dependency-decisions
[
  {
    "package": "react-hook-form",
    "decision": "denied",
    "decidedBy": "Phase 2 dependency gate (operator, stack_doctrine.md)",
    "reason": "question 1 unanswered: generated forms are native HTML with no client state, so it replaces nothing"
  }
]
```

## Test register cases evaluated from evidence

Each case names a check from the closed registry in `src/workflow/seams.ts`. The host run
writes the results below; nothing between the markers is hand-edited.

```json framework:test-register
[
  {
    "id": "TC-FUNC-003",
    "title": "A visitor can contact the practice from every page (verified email)",
    "check": "conversion.completable_action"
  },
  {
    "id": "TC-FUNC-006",
    "title": "The FAQ page carries an FAQ section, not placeholder text",
    "check": "indexability.no_placeholder_text"
  },
  {
    "id": "TC-UI-002",
    "title": "No two indexable pages serve the same body",
    "check": "indexability.no_duplicate_pages"
  },
  {
    "id": "TC-UI-004",
    "title": "Compact navigation delivered and operable on a phone",
    "check": "navigation.compact_delivered"
  },
  {
    "id": "TC-RESP-001",
    "title": "Measured responsive sweep, both engines",
    "check": "gate.responsive"
  },
  {
    "id": "TC-A11Y-002",
    "title": "Accessibility gate at the requested target",
    "check": "gate.accessibility"
  },
  {
    "id": "TC-TECH-001",
    "title": "Technical gate: build, lint, routes, admitted dependencies only",
    "check": "gate.technical"
  },
  {
    "id": "TC-PERF-001",
    "title": "Performance gate: measured bundle and vitals",
    "check": "gate.performance"
  },
  {
    "id": "TC-INT-001",
    "title": "Every decided capability delivered or explicitly unavailable",
    "check": "integrity.consistent"
  },
  {
    "id": "TC-DATA-001",
    "title": "The dataset is a real customer's, not a representative brief",
    "check": "dataset.not_synthetic"
  }
]
```

<!-- framework:generated:register-results:start -->
<!-- GENERATED by the framework; edits between these markers are overwritten. -->
### Register results — host run 2026-09-16T07:02:41.522Z

| ID | Title | Check | Result | Evidence |
|---|---|---|---|---|
| TC-FUNC-003 | A visitor can contact the practice from every page (verified email) | `conversion.completable_action` | PASS | completable conversion action: no finding |
| TC-FUNC-006 | The FAQ page carries an FAQ section, not placeholder text | `indexability.no_placeholder_text` | FAIL | measured: 4 indexable page(s) serve placeholder text a search engine would index: / (1 slot, 2 pending markers), /services (0 slots, 2 pending markers), /about (3 slots), /faq (1 slot) |
| TC-UI-002 | No two indexable pages serve the same body | `indexability.no_duplicate_pages` | PASS | duplicate indexable pages: no finding |
| TC-UI-004 | Compact navigation delivered and operable on a phone | `navigation.compact_delivered` | PASS | rendered and operated in a browser: works |
| TC-RESP-001 | Measured responsive sweep, both engines | `gate.responsive` | PASS | gates.responsive=true |
| TC-A11Y-002 | Accessibility gate at the requested target | `gate.accessibility` | PASS | gates.accessibility=true |
| TC-TECH-001 | Technical gate: build, lint, routes, admitted dependencies only | `gate.technical` | PASS | gates.technical=true |
| TC-PERF-001 | Performance gate: measured bundle and vitals | `gate.performance` | PASS | gates.performance=true |
| TC-INT-001 | Every decided capability delivered or explicitly unavailable | `integrity.consistent` | PASS | integrity {"delivered":45,"unavailable":4,"mismatch":0} |
| TC-DATA-001 | The dataset is a real customer's, not a representative brief | `dataset.not_synthetic` | FAIL | synthetic: suppliedContent.contactDetails.email: reserved domain (ashvattha-tax.example) |
<!-- framework:generated:register-results:end -->
