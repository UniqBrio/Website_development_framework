# Design Decision Record — Jalsa Restaurant

Produced by the framework's own pipeline (`runPipeline`, `src/pipeline.ts`) from the engine seam record.
Nothing below was chosen by hand. The machine record is `evidence-run/jalsa-dry-run-digest.json` → `decision`.
Sections marked **approval** cannot become public design decisions without the restaurant.

## 1. Business Intelligence → Design Context Profile

16 decision variables, with the basis the profile derivation recorded:

| Variable | Value | Basis | Evidence behind it |
|---|---|---|---|
| trust_requirement | medium | industry prior | Local business group |
| regulation_risk | low | industry prior | Local business group. Food regulation is not modelled; see F-030 |
| visual_asset_quality | **none** | inferred | 0 verified, 0 partial visual assets |
| content_confidence | **verification_required** | inferred | pricing is `provided_unverified` |
| commerce_depth | none | inferred | no checkout; 49 products |
| purchase_cycle | short | **default** | no stronger signal |
| mobile_share | high | **default** | b2c/local default, not a stated share |
| information_density | high | inferred | 49 offers |
| product_service_complexity | low | inferred | — |
| emotional_intensity | medium | **default** | no personality stated |
| seo_dependency | high | inferred | `drive_footfall` is discovery-dependent (T9 inference) |
| performance_sensitivity | high | inferred | from mobile_share |
| accessibility_requirement | wcag_aa | **default** | WCAG 2.2 AA floor |
| technical_complexity_budget | medium | **default** | — |
| brand_expression_need | low | **default** | no personality stated |
| audience_digital_literacy | medium | **default** | no audience stated |

Seven of 16 variables are defaults. A decision resting only on a default is exactly what the
profile marks for human confirmation.

## 2. Industry Baseline (a prior, not a template)
`local_business` → group "Local business", archetype `local_action_page`:
- expression ceiling low_to_medium, motion cap low;
- required content: location, hours, contact, services;
- prohibited: `fake_local_details`, `immersive_complexity`.

The classification itself is T2 (inference, with the hospitality comparison).

## 3. Business Overrides (what the business facts changed)
| Override | Effect |
|---|---|
| visual_asset_quality = none | image strategy `non_representational_only`: no photograph, and no generated image that could read as the restaurant, its food or its people (§13). The image-led patterns are deferred for missing product images. |
| content_confidence = verification_required | pricing hidden (DD-102); proof modules hidden (DD-098..DD-100) |
| no verified contact method | `contact.publicCta = blocked_until_verified` (DD-101); the `drive_footfall` conversion path is blocked |
| logo `provided_unverified` | `identity.mark = verified_name_wordmark`, `markStatus = provisional`; the logo file is refused. The rule's name says "verified" about an unverified name (FD-13). |
| no brand seed | neutral substitute `#5A5F6A`, SINGLE-DARK unchosen default (**approval**) |
| no brand fonts | system font stack, no font request (**approval**) |

## 4. Decision Engine output
| Decision | Value | Source |
|---|---|---|
| Personality | "practical, local, immediate" | DD-010 |
| Visual expression | low_to_medium | baseline ∩ rules |
| Layout | system `local_action_page`; structured grid; single-column reading rail; bounded containers; measure 60-75ch | DD-017/DD-027 family |
| Typography | fluid bounded clamp scale; system stack (neutral substitute) | token contract |
| Colour | semantic tokens from one seed; AA floor; 16 measured pairs all pass (lowest body pair 9.21:1) | color_system.md port |
| Motion | cap low; transform/opacity only; reduced-motion safe | baseline + DD rules |
| Hero | vertical; must answer what / for whom / why / next step (DD-031). **No hero section is allocated on the derived page** (see §6) | DD-031 |
| Navigation | explicit hierarchy; compact `accessible_drawer_or_compact_bar` → native popover disclosure | DD-034 |
| CTA | one primary, outcome-specific label; inline repeated | DD-035/036 |
| Repeated items | card system, auto-fit grid, semantic order | DD-038/DD-025 |
| Section architecture | location, hours, location_and_contact, services, faq, internal_links | baseline + DD-010 + objective |
| Selected patterns | `perspective-card`, `magnetic-action` (select with fallback) — **never rendered** (FD-11) | selection engine |
| Rejected patterns (12) | before-after (DD-044), data-diagram, sticky-narrative, editorial-grid, 3d-product-view, cursor-follower (poor for local_business), bento-grid (DD-026), asymmetric-composition (DD-028), full-bleed-media (DD-029), hover-only-product-info (DD-068), auto-rotating-carousel (DD-113, DD-043), decorative-webgl-hero (DD-010) | selection engine |
| Deferred for missing content (6) | interactive-gallery, split-hero (no product images); structured-content-rail, timeline (no process); modular-feature-grid (no services); faq-accordion (no FAQ) | content-readiness gate |
| Replaced | parallax-depth (expression above the ceiling) | expression gate |
| Rule conflicts | none | evaluator |
| Stack | Next.js, static rendering; admitted runtime `next`, `react`, `react-dom`; `motion` proposed but not consumed, so not installed | stack + dependency admission |
| Route JS budget | 150 KB (archetype) | budgets.ts |

## 5. Which decisions rest on evidence, which on inference, and which need approval
| Decision | Rests on | Approval |
|---|---|---|
| No photography, no simulated imagery | evidence: nothing supplied | no (policy) |
| Text wordmark instead of the logo | evidence: logo unverified, with C2PA uncertainty | **customer** — confirming the logo reverses it |
| Prices hidden | evidence: unverified, and "For design illustrations only" | **customer** |
| No contact route | evidence: nothing supplied | **customer** (supply it) |
| Neutral colour, dark theme, system fonts | framework defaults | **customer** — brand seed, theme, fonts |
| Local-business posture | inference T2 | reviewer (classification) |
| Footfall architecture (location, hours, services) | inference T9 | **customer** (objective) |
| Personality "practical, local, immediate" | rule DD-010 on inference T2 | **customer** (brand) |
| Single derived page | no pages requested (G1) | **customer** (pages) |

## 6. Website Design Specification → generation plan
- **Pages:** one, `/` (role `home`, basis `derived`, how: `primary_objective_page_at_root`).
- **Sections on `/`:** location_and_contact, hours, services, in that order.
- **Unallocated (reported, not dropped):**
  - `location` (FD-08: not canonicalised);
  - `faq` (no page owns it);
  - `internal_links`.
- **Content hubs:** 49 decisions, all "no page". DD-093 fallback: no owner-supplied description.
- **Conversion plan** for `drive_footfall` → `directions_and_call`. Both capabilities are refused:
  - `phone_link`: phone is unavailable;
  - `whatsapp_link`: WhatsApp is unavailable.
- **SEO plan:**
  - title "Jalsa Restaurant";
  - meta description = AI draft, approval required;
  - canonical, sitemap and og:image unresolved;
  - robots index,follow;
  - Organization JSON-LD (name only);
  - LocalBusiness refused (no verified address).
- **Approvals the pipeline itself lists:**
  - 20 approval requirements before the build (`decision.approvalsRequired`);
  - 24 publication requirements after the host evaluation, adding the quality-gate blockers
    (`evaluation.publicationRequirements`).
