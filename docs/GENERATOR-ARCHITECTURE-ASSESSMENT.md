# GENERATOR ARCHITECTURE ASSESSMENT

Written before any generator code, per the phase brief §1. Inspects what the
existing contracts already provide, what the generator must consume, and the one
structural gap that blocks honest rendering.

---

## 1. What the pipeline already provides

`DesignDecisionOutput` (25 fields) plus `ImplementationContract` (16) cover almost
everything a generator needs, and it is all authoritative:

| Generator needs | Existing source | Status |
|---|---|---|
| framework / runtime | `stack.framework`, `stack.renderingStrategy` | ready |
| routes + page purpose | `pages: PageSpec[]` (route, purpose verbatim, objective, audience, seoRole, sections, conversionRole, trustRequirements) | ready |
| sections | `sectionArchitecture` + `PageSpec.requiredSections` | ready |
| components | `selectedPatterns` + `selectionDecisions` (outcome, fallback, gates) | ready as PATTERNS, not as a tree |
| layout | `layoutStrategy`, `tokens.layout` (containers, breakpoints, columns, gutters) | ready |
| typography | `tokens.typography` (clamp scale, line heights, weights, reading measure) | ready |
| colours / tokens | `tokens.color` (L1 ramps, L2 semantic, CSS custom properties, measured contrast) | ready |
| imagery strategy | `imageStrategy.strategy` + `contentPlan.sections[].generatedSubstituteAllowed` | ready |
| interactions | `interactionStrategy.selected` / `.rejected` | ready |
| motion | `motionStrategy.cap`, `tokens.motion` | ready |
| responsive behaviour | `responsiveStrategy.audit.decisions` (component × range × transformation) | ready |
| accessibility | `accessibilityStrategy.target` + `.thresholds`, `quality.accessibility.criteria` | ready |
| SEO artifacts | `seoArtifacts.pages[]` (13 artifacts each, with origin) | ready |
| content provenance | `contentPlan.sections[]` (render, replacement, approvalRequired, generatedSubstituteAllowed) | ready |
| performance constraints | `performanceStrategy` + `contract.performanceBudgets` + `lazyLoadingRequirements` | ready |
| selected/rejected enhancements | `selectionDecisions` with per-gate reasons | ready |
| fallback behaviour | `contract.fallbackRequirements`, each pattern's `fallback` | ready |

**Conclusion: the generator needs no new decision model.** Its job is to consume,
not to decide. That is the whole design constraint.

---

## 2. The one structural gap: the content inventory carries STATUS, not VALUES

`contentInventorySchema` is eleven fields of `AssetStatus`:

```
propositionText: "verified_available"   // copy EXISTS
```

That says copy exists. It does not say what it says. The same is true of
`serviceDescriptions`, `processExplanation`, `faq`, `legalPolicies` and the rest.

So a generator asked to render a proposition has exactly two options, and §12
forbids the first:

1. invent the sentence — a fabricated business claim;
2. render an explicit content slot marked as awaiting supplied copy.

**This is the THIRD instance of one class.** `canonicalOrigin` (P1-1) and
`brandSeed` (P1-2) were the same shape: the contract recorded that a fact existed
without recording the fact. `framework_update.md` step 6 says that when a failure
class appears twice the fix was insufficient and the CLASS must be addressed. This
is the third, so the generator phase fixes the class rather than adding a third
one-off field:

> **`src/generation/content-values.ts`** — one optional supplied-values layer.
> Any inventory category may carry its actual value alongside its status, and the
> resolver returns `{ value, provenance }` using the existing
> `ConfidenceLevel` / `CONFIDENCE_POLICY` authority. Absent values resolve to an
> explicit slot, never to invented prose.

### Text the input DOES carry, and may be rendered
`businessName`, `description`, `servicesProducts[].name` and `.description`,
`requiredPages[].purpose`, `targetAudience[].label`, `location.city` /
`.country` / `.serviceAreas`. These are owner-supplied strings, so a generator may
render them literally or conservatively paraphrased (§J.1
`customer_supplied_incomplete`) — never extended into a claim.

---

## 3. Secondary gaps found

| # | Gap | Fix in this phase |
|---|---|---|
| G-1 | `selectedPatterns` is a flat list; nothing maps a SECTION to the components that implement it | `component-model.ts` derives one tree from sections + patterns + responsive decisions |
| G-2 | `ResponsiveAudit.decisions` are per component × profile; CSS needs per-range rules | `render/css.ts` folds decisions into container/media queries keyed on `RANGES` |
| G-3 | No emitted artifact is traceable back to a decision | every `ComponentSpec` carries `traceTo: string[]` naming the rule/gate/pattern that produced it |
| G-4 | `ImplementationContract.componentStrategy` is `string[]` prose | the generator consumes the structured fields, not the prose summary |

---

## 4. The build boundary — and why it is drawn where it is

The brief asks for a real build producing real `BuildEvidence`. There are two
candidate boundaries, and the stack doctrine settles it.

**Rejected: install `next` + `react` into this repository and run `next build`.**
`stack_doctrine.md`'s DEPENDENCY GATE would refuse it. Those packages serve no
capability of the *engine* — the engine is a decision library — so adding ~300MB
of web-framework dependency to satisfy a test would be the framework violating its
own §17 rule. The dependency gate applies to the framework itself or it is
theatre.

**Adopted: one component model, two emitters.**

1. **`emit/nextjs.ts`** writes Next.js App Router SOURCE (the deliverable the
   stack decision demands): `app/layout.tsx`, `app/<route>/page.tsx`,
   `app/globals.css`, `package.json` containing only the libraries the stack
   decision approved.
2. **`render/html.ts`** renders the SAME model to static semantic HTML + CSS with
   no JavaScript, and `build.ts` executes that render to disk.

This is not a workaround; it is §10's own layering. Layer 1-2 of progressive
enhancement IS semantic HTML plus CSS, so rendering that layer without a JS
framework is the faithful expression of it, and it is the layer the SEO and
no-JS evidence actually needs. The Next.js source is the enhancement host.

**Evidence honesty, stated up front:** the static layer build is EXECUTED, so its
served HTML and technical result are `measured`. The Next.js build is NOT
executed, so anything that depends on it (`bundles`, Core Web Vitals) stays
`unavailable`, and the performance gate stays `unknown`. The generator will not
report a build it did not run.

---

## 5. Contract to implement

```
generateWebsite(output, contract, options) -> GeneratedWebsite {
  files: Map<path, string>          // Next.js source + static layer + CSS
  pages: GeneratedPage[]            // one per PageSpec, traceable
  manifest: GenerationManifest      // stack, deps, boundaries, trace, refusals
  refusals: Refusal[]               // what was NOT generated, and why
}
```

`refusals` is a first-class output, not a log. A rejected pattern, an unresolved
SEO artifact and an unsupplied content value are all things the generator
deliberately did not emit, and the reason must travel with the artifact.

---

## 6. Discipline rules for the implementation

1. The generator DECIDES NOTHING. Any value not derivable from the output is a
   refusal or a slot, never an invention.
2. No fixture-specific logic. `FIXTURE-VERDALEEN` may appear only in
   `tests/fixtures/**`, and a test asserts the generator source is free of it.
3. One model, two emitters — so the static layer and the Next source cannot
   disagree about what the site is.
4. Rejected patterns and omitted libraries must be absent from output, and a test
   must prove absence rather than trusting it.
5. `refine()` stays uninvoked. The seam is made explicit
   (`quality → RefinementInput → generator options`) and recorded as the next P1
   rather than half-built.
