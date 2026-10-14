# CUSTOMER READINESS FOUNDATION — ASSESSMENT

Written 2026-09-14, before implementation. Evidence:
- `docs/CUSTOMER-DRY-RUN-REPORT.md` (Ashvattha, §15 P1-1…P1-8);
- `docs/ENGAGEMENT-DELIVERY-REPORT.md` (G1–G10).

Constraints: no new engagement categories, games, gamification, AI personalisation, 3D/WebGL or calibration. Engagement weights and thresholds stay unchanged. Nothing is committed.

## 1. Root causes, as found in the code

| Gap | Where | Root cause |
|---|---|---|
| **G1** no home route when the owner lists no pages | `generation/page-spec.ts` `derivePageSpecs` | Pages are derived per objective (`/<objective>`) only, while the brand, the nav and the 404 page all link to `/`. Nothing asserts that `/` exists. |
| **P1-1** page purpose ignored | `page-spec.ts` | A page's sections come from the objective inferred from its purpose text. There is no page *role*, so `/contact` gets the lead-generation sections and `/faq` gets `build_credibility` sections. Site-level sections (`location_and_contact`, `faq`, `disclosures`) that no objective allocates are dropped without a record. `about` has no renderer branch. |
| **P1-2** no contact-link conversion | `generation/component-model.ts` `ctaPlanFor`, `form-contracts.ts` | The only conversion capability is a form. A verified email renders only inside `location_and_contact`, which no Ashvattha page received. WhatsApp has no field. The served-HTML parser does not count `wa.me` links. |
| **P1-3** no AI-draft channel | `content-values.ts`, `seo/artifacts.ts` | Supplied content has one state (supplied). An AI draft with an approval state has no field, so Phase S positioning, locality titles and meta descriptions cannot reach a page even after approval. |
| **P1-4** compact navigation decided, not built | `rules/navigation-rules.ts` DD-034 → `component-model.ts` `headerNode` | `nav.compactMode` is cited in the trace, but the renderers emit the same flat list at every width. |
| **P1-5** no rule precedence | `engine/evaluator.ts` | Two `set` effects with different values are always a conflict. Earlier fixes moved personality rules to other targets case by case, and media+authoritative (`layout.grid`) and sports+authoritative (`typography.strategy`) still fail the design gate. |
| **P1-6** dependency admission | `stack/select-stack.ts` → `stack/runtime-packages.ts` → `emit/nextjs.ts`, `host/host-project.ts` | The stack *proposal* is installed as-is. Nothing checks that generated code imports a package, or that the doctrine's dependency gate approved it. |
| **P1-7** duplicate / placeholder indexable pages | nowhere | No check compares page bodies or looks for slot text on `index,follow` pages. |
| **P1-8** markdown ↔ TS seams manual | workflow records ↔ `engine/*.json` | JSON is hand-transcribed. Phase 2 denials have no channel. Register results are typed by reading the digest. |
| **Delivery G2** one browser path | `host-project.ts` `experienceExpectations` | Only the first rule and the first example are operated. |
| **Delivery G3** WebKit operation | `validate.mjs` `experienceChecks(browser)` | Chromium only. |
| **Delivery G4** static output untested | `host-project.ts` | The host copies only `next/`, so the static layer never reaches a browser. |
| **Delivery G5** screen reader | — | There is no strategy and no automated accessibility-tree evidence. |
| **Synthetic data** | fixtures | "FIXTURE" appears in strings, but nothing classifies a dataset, so synthetic output could be reported as customer output. |

## 2. Design

### 2.1 Decision → Contract → Generation → Rendered Output → Reconciliation
A new module, `src/integrity/`, holds one ledger that every decided capability writes to. Each entry has:
- `decision`: what was decided and by which authority (rule, page model, conversion plan, admission);
- `contract`: what generation must produce;
- `rendered`: what the component model and emitted files actually contain;
- `status`: `delivered`, `unavailable` (with reason and fallback, and never silent), or `mismatch`.

`generateWebsite` throws on any `mismatch`, as it already does for conversion semantics and engagement delivery. Domains covered:
- pages, page roles and section allocation;
- conversion capabilities and compact navigation;
- dependency admission ↔ emitted imports;
- AI-draft content;
- engagement delivery (the existing reconciliation, folded in);
- rule-precedence resolutions.

### 2.2 Page roles (P1-1) and G1
- `requiredPages[].role`: `home | services_index | service | about | faq | contact | legal | conversion | content`. A stated role wins. Otherwise the role is inferred from the path and purpose and recorded as `roleBasis: "inferred"`.
- Each role has a section allocation. The page's objective is kept for conversion and SEO, but sections come from the role.
- Site-level sections are allocated to the role that owns them (`faq` → faq, `location_and_contact` → contact, `disclosures` → legal, else contact). A section no page receives is reported in `output.pageAllocation.unallocated`.
- **G1:** after page derivation, `/` must exist. With no owner pages, the site-primary objective's derived page takes `/` as `home`, so it cannot duplicate another page. With owner pages but no `/`, a minimal home page is derived (proposition, services, conversion link). This is recorded.

### 2.3 Conversion capabilities (P1-2)
- A pipeline `conversionPlan` per objective lists capabilities in decided order: `form` (feasible only with a host endpoint), then `email_link`, `phone_link`, `whatsapp_link` (each feasible only with a verified, supplied value).
- New input `availableContent.contactWhatsapp` and supplied `contactDetails.whatsapp`.
- Generation delivers the first feasible capability and records why earlier ones were skipped. This is the decided order, not a substitution.
- A contact-link contract carries its own `actionLabel` (DD-035 single authority), and `validateConversionSemantics` accepts actions targeting a contact contract.
- The served-HTML parser counts `https://wa.me/` links.

### 2.4 Approved AI-draft channel (P1-3)
- Supplied `drafts[]`: `{target, value, provenance, source, approval?}`, using the same provenance vocabulary as engagement values (one vocabulary).
- Targets: `proposition`, `about`, `title:<route>`, `metaDescription:<route>`.
- An `approved_ai_draft` with an approval record publishes. An `ai_draft` is held: the slot stays, and the draft is listed for approval. Factual categories cannot be drafts.

### 2.5 Compact navigation (P1-4)
DD-034 `accessible_drawer_or_compact_bar` is rendered as a native `popover` disclosure:
- a "Menu" button with `popovertarget`, a list with `popover`, and a visible "Close menu" button;
- no JavaScript, Escape and light dismiss native, same routes;
- at the medium breakpoint and wider, CSS shows the list statically and hides both buttons;
- a browser without popover support shows the list, which is the documented fallback.

### 2.6 Rule precedence (P1-5)
The precedence tier is derived from what a rule reads: a rule conditioned on `personalities` is `personality`; anything else is `context` (industry, content type, audience, constraints).
- On a `set` disagreement, a single value at the strongest tier wins deterministically. The losing writes are recorded in `precedenceResolutions`, not lost.
- A disagreement *within* the strongest tier stays a conflict.

### 2.7 Dependency admission (P1-6)
`admitDependencies(stack proposal, owner dependency decisions, generator consumers)`. A package is admitted only when all of these hold:
- the stack proposed it;
- a generator module consumes it;
- the dependency gate approved it (`constraints.dependencyDecisions`), or it is framework runtime.

The host `package.json`, the Next `package.json`, the technical gate's declared set and the emitted-import reconciliation all read the admitted set. `zod` without approval is not admitted, so form contracts are emitted as JSON. `react-hook-form` has no consumer and is never admitted.

### 2.8 Indexability integrity (P1-7)
At generation, and again on served HTML:
- a normalised main-content signature per page, where identical or near-identical indexable bodies are a finding;
- placeholder slots on an `index,follow` page are a finding.

Both feed the content gate (a publication blocker), and the generation manifest lists them.

### 2.9 Workflow seams (P1-8)
`src/workflow/seams.ts`:
- fenced ` ```json framework:<kind> ` blocks in workflow records are the authority for `business-input`, `supplied-content` and `dependency-decisions`;
- generated sections between `<!-- framework:generated:<id> -->` markers are written from TypeScript;
- a closed check registry evaluates test-register cases against host evidence.

The Ashvattha workspace gets an engine-input record, and its JSON becomes derived, with drift failing a test.

### 2.10 Delivery validation
- Host expectations enumerate every rule path (answers resolved with the same first-match evaluator), the no-match path when one is reachable, every owner example, and an out-of-range input.
- `experienceChecks` runs in Chromium **and** WebKit.
- The host copies the static layer and serves it with `node:http`, and the same checks and axe run against it.
- Screen-reader strategy: automated accessibility-tree assertions (Chromium CDP `Accessibility.getFullAXTree`) and a written manual protocol whose result stays `human_assessment_required`.
- **Synthetic data:** `classifyDataset(input, supplied)` returns `synthetic` for FIXTURE markers and reserved `.example`/`.invalid` domains. The manifest and digests carry it, and a synthetic dataset adds a publication blocker.

## 3. Risks
- **Route changes (G1)** alter derived routes for page-less fixtures. Tests that assert those routes are updated, and the change is recorded.
- **Stricter dependency admission** removes `zod` from hosts without approval, so host tests are updated.
- **`popover` on older engines** falls back to a visible list, which is acceptable and documented.
- **Precedence** changes the design gate for media+authoritative. That test becomes a positive one, and a same-tier negative test is added.
