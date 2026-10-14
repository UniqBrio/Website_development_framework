# CONTENT INTEGRITY SPEC

Implements specification sections 12, 13 and appendix J. This is the one
subsystem whose job is to BLOCK rather than advise.

## Confidence levels (J.1)
`src/content/confidence.ts`

| Level | Public | Blocks publication |
|---|---|---|
| `verified` | render normally | no |
| `customer_supplied_incomplete` | literal or conservative paraphrase only | no |
| `ai_draft` | approval required, labelled "AI draft - verify" | yes, until approved |
| `neutral_placeholder` | allowed if non-factual and non-deceptive | no |
| `verification_required` | hidden | yes |

The decisive mapping: `provided_unverified` on a FACTUAL claim becomes
`verification_required`, not `customer_supplied_incomplete`. Descriptive content
may be paraphrased; a factual claim nobody verified is what J.1 hides. `partial`
is never sufficient for a factual claim.

The profile's `content_confidence` is a FLOOR, not an average: one claim needing
verification sets the whole profile, because publication safety is decided by the
weakest claim on the page.

## The 30 never-fabricate categories (section 12)
`NEVER_FABRICATE`. The check is "is this claim category present in the verified
inventory?" and never "does the generated text look plausible?". A plausibility
test passes a well-written fabrication, which is the failure this file prevents.

## Replacement policy (J.2)
`src/content/asset-policy.ts`, all 15 rows, each with
`generatedSubstituteAllowed`. That flag is false for every proof-bearing asset
and makes "never simulate real customers, employees, facilities, products or
outcomes" mechanical rather than advisory. A fabrication-risk category can never
be substituted by generation regardless of what its row says.

Generated substitutes ARE allowed for: a wordmark from the verified business
name, a neutral accessible token palette, and a decorative CSS/SVG visual, none
of which states a fact beyond the name.

## Blocked conversion paths
`src/content/verification.ts` blocks an OBJECTIVE when its critical evidence is
unverified: a "Contact us" CTA pointing at nothing is worse than no CTA. Hiding
a claim never blocks the whole site, because section 12 also says the site must
not look incomplete merely because proof is unavailable: hiding is the remedy and
site-wide refusal is not.

## Image strategy (section 13)
Strategy follows actual asset quality: `authentic_strategic`,
`authentic_selective`, `typography_css_svg_diagram_led`,
`non_representational_only`. With no authentic assets, generated visuals are
permitted only where they cannot be read as factual business evidence.

## Relationship to the markdown framework
`website_workflow/app_reality.md` is the per-site claim ceiling a human
maintains. This module is the executable check. Neither replaces the other.
