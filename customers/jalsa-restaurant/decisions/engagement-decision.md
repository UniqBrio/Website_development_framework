# Engagement & Conversion Opportunity decision — Jalsa Restaurant

Engine: `decideEngagement` (`src/engagement/decide.ts`). Record id `ENG-DECISION`. No weight or threshold was changed.

## Decision: **NO_EXPERIENCE** (confidence: low)

- **Reason (engine):** "no candidate passed every hard gate for the visitor tasks of this business
  (find_suitable_offer)".
- **Static alternative:** "clear static content and the conventional directions and call link for
  the primary objective (drive_footfall)". That link cannot exist yet, because no address or phone
  number is verified.
- **Reconsider when:** "observed visitor behaviour or research shows a task the current pages do not
  serve".
- **Why confidence is low:** the only visitor task is `inferred` from the menu document; no task was
  stated by the restaurant.

NO_EXPERIENCE is the correct and successful outcome for this evidence.

## Inputs the engine reasoned over
| Input | Value | Provenance |
|---|---|---|
| Visitor tasks | `find_suitable_offer` (inferred) | the filter list in the menu document (T16) |
| Business objective | `drive_footfall` | inference (T9) |
| Requested idea | `product_service_finder` | the menu document's "category filters" and "All / Veg / Non-Veg dietary filters" — ambiguous whether requested |
| Data readiness | decisionRules, productSpecifications, formulas, comparisonData, pricingRanges: unavailable; datasets, pricing: provided_unverified | fact register |
| Maintenance owner / lead follow-up owner | not stated | — |
| Route budget | 150 KB | archetype |

## The customer-material interaction, evaluated normally — REJECTED
`product_service_finder` (the closest category to menu category and dietary filters) failed three hard gates:

| Gate | Result |
|---|---|
| objective_linkage | serves none of the stated objectives (`drive_footfall`) |
| data_integrity | decisionRules and productSpecifications are not supplied — "the framework may not invent it (ECO §17)". For a menu that means **category membership and veg/non-veg values do not exist**; filtering on values inferred from dish names would publish invented dietary data |
| maintenance_ownership | maintenance burden 3/5 and no named owner keeps the data current |

It was not accepted because it appeared in customer material. If the restaurant confirms it wants
filters, supplies a category and dietary value per item and names who maintains them, the idea is
re-evaluated. Its declared static alternative, "offers grouped by need, with filters as plain
links", still cannot be generated today, because the offer contract cannot carry a category (FD-04).

## All 27 categories rejected — failed hard gates
| Category | Failed gates |
|---|---|
| calculator | visitor_value, objective_linkage, data_integrity, maintenance_ownership, static_alternative_adequacy |
| roi_calculator | + operational_follow_up |
| price_estimator | visitor_value, objective_linkage, data_integrity, maintenance_ownership |
| savings_impact_tool | visitor_value, objective_linkage, data_integrity, maintenance_ownership, static_alternative_adequacy |
| quiz | visitor_value, objective_linkage, data_integrity, static_alternative_adequacy |
| assessment | visitor_value, objective_linkage, data_integrity, maintenance_ownership |
| eligibility_checker | visitor_value, objective_linkage, data_integrity, maintenance_ownership, static_alternative_adequacy |
| **product_service_finder** | objective_linkage, data_integrity, maintenance_ownership |
| guided_selector | objective_linkage, data_integrity, maintenance_ownership |
| configurator | visitor_value, objective_linkage, data_integrity, performance_feasibility, maintenance_ownership, operational_follow_up, static_alternative_adequacy |
| comparison_tool | visitor_value, objective_linkage, data_integrity |
| interactive_demo | 7 gates incl. performance_feasibility |
| simulation | 6 gates incl. performance_feasibility |
| planner | visitor_value, objective_linkage, data_integrity, maintenance_ownership |
| checklist_readiness_tool | visitor_value, objective_linkage, data_integrity |
| interactive_utility | 5 gates |
| interactive_chart_explorer | 5 gates |
| recommendation_engine | objective_linkage, data_integrity, maintenance_ownership |
| guided_journey | objective_linkage, data_integrity, maintenance_ownership |
| booking_flow | visitor_value, objective_linkage, operational_follow_up ("no verified contact route exists to receive and answer it"), static_alternative_adequacy ("no real availability exists") |
| progressive_profile | visitor_value, objective_linkage, operational_follow_up, static_alternative_adequacy |
| survey_poll | visitor_value, objective_linkage, static_alternative_adequacy |
| interactive_storytelling | 6 gates |
| challenge_habit_loop | visitor_value, objective_linkage, data_integrity, maintenance_ownership |
| gamification | visitor_value, objective_linkage, data_integrity, maintenance_ownership |
| game_serious_game | 5 gates incl. performance_feasibility |
| visualizer_3d_ar_webgl | 7 gates incl. accessibility_feasibility and performance_feasibility |

No candidate reached scoring, so no opportunity score exists for any of them.

## Not added (as instructed, and as the gates independently decided)
- Games, quizzes, calculators, gamification and WebGL/3D: all rejected at hard gates.
- Booking: rejected (no availability, no contact route).
- Ordering: no category exists; nothing requests it; no evidence.
- Maps: not requested; DD-114 would omit a map without a verified address anyway.
- Loyalty: no category exists; no evidence.
- Animation: motion cap low; no motion is rendered.

## Delivery decision
- The generator received NO_EXPERIENCE, so no delivery spec, no experience runtime and no client
  experience code were produced.
- The delivery reconciliation is consistent (the manifest records an empty experience list and
  runtime `null`).
- Register case TC-ENG-001 is BLOCKED: there is nothing to operate, which is correct.
