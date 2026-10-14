# Implementable Website Design Decision Specification

**Version:** 1.0  
**Audience:** AI website-generation framework architects, design-system engineers, product teams, QA agents  
**Goal:** Generate production-ready websites from basic business information while selecting appropriate design, interaction, content, accessibility, SEO, and performance strategies through explicit, auditable rules.

---

## 0. Governing principles

### 0.1 Primary objective

Choose the **right design for the business**, not the most visually impressive collection of effects.

### 0.2 Priority hierarchy

```yaml
priority_order:
  1: user_task_completion
  2: proposition_clarity
  3: trust_and_content_integrity
  4: accessibility_and_inclusion
  5: responsive_mobile_usability
  6: performance_and_technical_reliability
  7: SEO_and_discoverability
  8: brand_coherence
  9: purposeful_differentiation
  10: visual_novelty
```

### 0.3 Non-negotiable constraints

```yaml
non_negotiable:
  - Never fabricate testimonials, reviews, customer logos, awards, certifications, statistics, addresses, contact information, customer outcomes, case studies, team members, or business claims.
  - Keep primary content, navigation, conversion paths, and trust information available as semantic HTML.
  - Do not require hover, cursor position, drag, animation, canvas, WebGL, or device motion to understand or complete a core task.
  - Respect reduced-motion preferences and provide static or simplified alternatives.
  - Do not ship a design that fails responsive reflow, keyboard access, visible focus, accessible contrast, or primary-task completion.
  - Do not permit decorative enhancement to exceed the agreed route performance budget.
```

### 0.4 Evidence principles

- Awwwards evaluates work through Design (40%), UX/UI (30%), Creativity (20%), and Content (10%). This specification treats that as a creative reference, while elevating accessibility, performance, trust, and business fit to production gates. [Awwwards Evaluation System](https://www.awwwards.com/about-evaluation/)
- CSS Design Awards describes its aim as balancing creativity, functionality, and usability. [CSS Design Awards About](https://www.cssdesignawards.com/about)
- W3C WCAG 2.2 is a hard constraint layer for reflow, focus visibility, target sizing, motion, and input alternatives. [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- Web.dev defines Core Web Vitals good thresholds at the 75th percentile: LCP <= 2.5 seconds, INP <= 200 ms, CLS <= 0.1. [Web Vitals](https://web.dev/articles/vitals)

---

# 1. Input Contract

## 1.1 Required business input

```ts
export interface BusinessInput {
  businessName: string;
  industry: Industry;
  subIndustry?: string;
  description: string;
  targetAudience: AudienceProfile[];
  location?: LocationProfile;
  servicesProducts: Offer[];
  websiteObjective: WebsiteObjective[];
  brandPersonality?: BrandPersonality[];
  preferredVisualDirection?: VisualDirection[];
  requiredPages?: PageRequirement[];
  requiredFunctionality?: FunctionalityRequirement[];
  availableAssets: AssetInventory;
  availableContent: ContentInventory;
  constraints?: ProjectConstraints;
}

export interface AssetInventory {
  logo: AssetStatus;
  brandColors: AssetStatus;
  heroImages: AssetStatus;
  productImages: AssetStatus;
  teamPhotos: AssetStatus;
  portfolioImages: AssetStatus;
  video: AssetStatus;
  testimonials: AssetStatus;
  customerLogos: AssetStatus;
  awards: AssetStatus;
  certifications: AssetStatus;
  reviews: AssetStatus;
}

export type AssetStatus =
  | "verified_available"
  | "provided_unverified"
  | "partial"
  | "unavailable"
  | "not_applicable";
```

## 1.2 Derived decision variables

```yaml
derived_variables:
  trust_requirement: [low, medium, high, very_high]
  emotional_intensity: [low, medium, high]
  information_density: [low, medium, high]
  visual_asset_quality: [none, low, medium, high]
  product_service_complexity: [low, medium, high]
  purchase_cycle: [immediate, short, considered, long, regulated]
  seo_dependency: [low, medium, high]
  performance_sensitivity: [low, medium, high]
  accessibility_requirement: [baseline, wcag_aa, wcag_aaa_or_equivalent]
  mobile_share: [low, medium, high]
  technical_complexity_budget: [low, medium, high]
  brand_expression_need: [low, medium, high]
  content_confidence: [verified, incomplete, ai_draft, placeholder, verification_required]
  commerce_depth: [none, shallow, medium, deep]
  audience_digital_literacy: [low, medium, high]
  regulation_risk: [low, medium, high]
```

## 1.3 Derived scoring guidance

```yaml
trust_requirement:
  very_high:
    industries: [healthcare, banking, finance, legal, government, education_for_children]
    default_effect_cap: low
    proof_weight: very_high
  high:
    industries: [professional_services, b2b_saas, real_estate, construction, manufacturing]
    default_effect_cap: low_to_medium
  medium:
    industries: [retail, hospitality, fitness, travel, creative_services]
  low:
    industries: [campaign, entertainment, art_portfolio]

visual_asset_quality:
  high: "Authentic, approved, high-resolution, relevant imagery/video exists."
  medium: "Some relevant assets exist; art direction is possible but must be selective."
  low: "Limited, generic, inconsistent, or weak assets. Prefer typography/CSS/SVG."
  none: "No authentic visual assets. Do not simulate real people, work, places, or products."
```

---

# 2. Output Contract

```ts
export interface DesignDecisionOutput {
  designPersonality: DesignPersonalityDecision;
  designDirection: DesignDirectionDecision;
  colorStrategy: ColorStrategy;
  typographyStrategy: TypographyStrategy;
  layoutStrategy: LayoutStrategy;
  gridStrategy: GridStrategy;
  heroStrategy: HeroStrategy;
  navigationStrategy: NavigationStrategy;
  sectionArchitecture: SectionArchitecture;
  components: ComponentSelection[];
  imageStrategy: ImageStrategy;
  interactionStrategy: InteractionStrategy;
  motionStrategy: MotionStrategy;
  threeDStrategy: ThreeDStrategy;
  cursorStrategy: CursorStrategy;
  galleryStrategy: GalleryStrategy;
  ctaStrategy: CtaStrategy;
  responsiveStrategy: ResponsiveStrategy;
  accessibilityStrategy: AccessibilityStrategy;
  seoStrategy: SeoStrategy;
  performanceStrategy: PerformanceStrategy;
  contentPlan: ContentPlan;
  qualityPlan: QualityPlan;
  decisionLog: DecisionRecord[];
}

export interface DecisionRecord {
  id: string;
  ruleId: string;
  inputFacts: Record<string, unknown>;
  decision: string;
  rationale: string;
  sourceUrls: string[];
  confidence: "high" | "medium" | "low";
  humanApprovalRequired: boolean;
  fallback: string;
}
```

---

# 3. Decision Language

Every operational rule must use this structure.

```yaml
rule:
  id: DD-001
  domain: layout | typography | interaction | motion | responsive | a11y | performance | seo | content | quality
  if: []
  then: []
  unless: []
  prefer: []
  avoid: []
  fallback: []
  rationale: ""
  source_urls: []
  confidence: high | medium | low
  approval_required: false
```

Interpretation:

- **IF**: factual preconditions.
- **THEN**: selected design behavior.
- **UNLESS**: overrides, blocking conditions, exceptions.
- **PREFER**: first implementation choice.
- **AVOID**: disallowed or lower-priority choice.
- **FALLBACK**: mandatory degradation/alternative.

---

# 4. High-value Decision Rules

The following 120 rules form the core decision corpus. Rules may be combined, but hard constraints override aesthetic preferences.

## 4.1 Business and design direction rules

### DD-001 — Professional services

```yaml
if:
  - industry == professional_services
  - trust_requirement in [high, very_high]
then:
  - design_personality = "credible, clear, restrained, expert"
  - layout = "structured content rail plus evidence modules"
  - hero = "audience + service outcome + proof + clear consultation CTA"
  - interaction_level = low
unless:
  - visual_asset_quality == high
  - brand_expression_need == high
prefer:
  - readable typography
  - case studies when verified
  - methodology/process section
  - clear service cards
avoid:
  - cursor effects
  - decorative WebGL
  - experimental navigation
fallback:
  - typography-led hero with CSS visual treatment
rationale: "High-stakes service decisions need clarity, proof and predictable paths more than novelty."
source_urls:
  - https://www.w3.org/TR/WCAG22/
  - https://www.awwwards.com/about-evaluation/
```

### DD-002 — SaaS

```yaml
if:
  - industry == saas
  - product_service_complexity in [medium, high]
then:
  - design_personality = "technical confidence"
  - hero = "outcome + target role + product proof + trial/demo CTA"
  - section_architecture += [workflow, features, integrations, security, evidence, FAQ]
prefer:
  - product screenshots
  - SVG diagrams
  - modular grid or bento only for truly modular features
  - interactive demo with static explanation
avoid:
  - abstract WebGL hero as product explanation
  - generic AI gradient without product meaning
fallback:
  - static screenshots and vertical workflow explanation
rationale: "Complex products need progressive explanation and verifiable proof."
source_urls:
  - https://nextjs.org/docs
  - https://m3.material.io/
```

### DD-003 — AI companies

```yaml
if:
  - industry == ai_company
then:
  - require = [plain_language_value_proposition, workflow_proof, data_privacy_security_section]
  - visual_language = "intelligent, controlled, product-grounded"
unless:
  - product is creative_media_tool
  - visual_asset_quality == high
prefer:
  - product UI
  - diagrams
  - real use-case stories if verified
avoid:
  - generic glowing orb
  - unverified capability claims
  - model claims without caveats or evidence
fallback:
  - typography + data-flow SVG + verified product copy
rationale: "AI positioning requires explainability and trust; visual futurism cannot substitute for product comprehension."
source_urls:
  - https://www.w3.org/TR/WCAG22/
  - https://www.cssdesignawards.com/about
```

### DD-004 — Finance/banking

```yaml
if:
  - industry in [finance, banking]
then:
  - trust_requirement = very_high
  - interaction_level = low
  - motion_intensity = minimal
  - navigation = conventional
  - proof_elements += [regulation_if_verified, fees, security_information, contact_support]
prefer:
  - high contrast
  - clear data tables
  - accessible calculators
avoid:
  - decorative 3D
  - cursor effects
  - ambiguous language
  - hidden terms
fallback:
  - static structured page with semantic tables
rationale: "Financial decisions are high-risk and require clarity, transparency and predictable interaction."
source_urls:
  - https://www.w3.org/TR/WCAG22/
  - https://developer.apple.com/design/human-interface-guidelines/inclusion
```

### DD-005 — Legal

```yaml
if:
  - industry == legal
then:
  - design_personality = "authoritative, precise, calm"
  - content_priority = [practice_areas, qualifications_if_verified, process, contact, jurisdiction]
  - interaction_level = low
prefer:
  - clear labels
  - readable serif/sans pairing when appropriate
  - local SEO structure
avoid:
  - kinetic typography
  - gamified effects
  - vague superlatives
fallback:
  - conventional content-led layout
rationale: "Legal visitors need credibility, confidentiality cues and actionable clarity."
source_urls:
  - https://www.w3.org/TR/WCAG22/
```

### DD-006 — Healthcare

```yaml
if:
  - industry == healthcare
then:
  - trust_requirement = very_high
  - accessibility_requirement = wcag_aa
  - motion_intensity = minimal
  - hero_priority = [care_or_service_clarity, booking_or_contact, urgent_path_if_relevant]
prefer:
  - plain language
  - calm contrast-safe color
  - provider/location information only if verified
avoid:
  - autoplay video
  - motion-heavy hero
  - fabricated patient/provider imagery
fallback:
  - content-first visual system and verified contact route
rationale: "Healthcare use cases combine trust, safety, accessibility, and time-sensitive decisions."
source_urls:
  - https://www.w3.org/TR/WCAG22/
  - https://developer.apple.com/design/human-interface-guidelines/inclusion
```

### DD-007 — Ecommerce

```yaml
if:
  - commerce_depth in [medium, deep]
  - website_objective contains purchase
then:
  - architecture = "discovery-to-checkout"
  - require = [search_or_browse_taxonomy, filters_when_needed, product_cards, product_gallery, product_details, cart]
prefer:
  - manual gallery controls
  - product images with context/scale
  - visible price, availability, returns and delivery data when verified
avoid:
  - auto-rotating carousels
  - hiding core products inside sliders
  - hover-only product details
fallback:
  - responsive product grid and static product detail media
rationale: "Commerce requires product discovery, comparison and purchase confidence."
source_urls:
  - https://baymard.com/learn/ecommerce-ux-best-practices
  - https://baymard.com/blog/current-state-of-checkout-ux
```

### DD-008 — Creative portfolio

```yaml
if:
  - industry in [creative_agency, design_studio, photography, art, architecture]
  - portfolio_importance == high
then:
  - archetype = editorial_portfolio_narrative
  - visual_expression = high
  - project_discovery = explicit
prefer:
  - image-led grid
  - editorial/asymmetric composition
  - case-study detail pages
  - controlled image reveal or scroll storytelling
avoid:
  - navigation hidden behind novelty
  - canvas-only project details
  - absent contact path
fallback:
  - project grid + static case-study narrative
rationale: "These businesses sell craft and perspective, but work discovery and inquiry remain core tasks."
source_urls:
  - https://www.siteinspire.com/
  - https://www.siteinspire.com/websites/categories/architecture/portfolio
```

### DD-009 — Hospitality/travel

```yaml
if:
  - industry in [hospitality, travel]
  - visual_asset_quality == high
then:
  - archetype = image_led_editorial_conversion
  - hero = art_directed_media_plus_booking_action
  - motion_intensity = low_to_medium
unless:
  - mobile_share == high and video payload is excessive
prefer:
  - responsive art direction
  - booking path
  - location/amenity/policy information
avoid:
  - booking CTA hidden under immersive scenes
  - autoplay audio
fallback:
  - static responsive hero image and booking card
rationale: "Atmosphere matters, but visitors must plan and book confidently."
source_urls:
  - https://web.dev/learn/design/responsive-images
  - https://web.dev/articles/codelab-art-direction
```

### DD-010 — Local business

```yaml
if:
  - industry == local_business
then:
  - archetype = local_action_page
  - primary_actions = [call, directions, booking, order] filtered_by_verified_routes
  - mobile_priority = very_high
prefer:
  - concise information
  - hours/address only if verified
  - local SEO
avoid:
  - complex immersive effects
  - fake maps/contact information
fallback:
  - wordmark + service summary + verified contact action
rationale: "Local visitors often arrive with immediate action intent."
source_urls:
  - https://www.w3.org/TR/WCAG22/
```

### DD-011 — Sports/fitness

```yaml
if:
  - industry in [fitness, gym, sports_academy, football, cricket, tennis, martial_arts, dance]
then:
  - design_personality = "energetic, community-driven, disciplined"
  - typography = "bold display plus readable body"
  - imagery = "authentic action/community when available"
  - motion_intensity = medium
prefer:
  - schedule/class/fixture access
  - registration/trial CTA
  - credentials and safeguarding where relevant
avoid:
  - motion obscuring schedules/prices/safety content
fallback:
  - static action imagery + schedule cards
rationale: "Energy is appropriate, but booking, safety, schedule and community information are primary tasks."
source_urls:
  - https://www.w3.org/TR/WCAG22/
```

### DD-012 — Media/editorial

```yaml
if:
  - industry in [media, editorial, university, nonprofit_research]
  - information_density == high
then:
  - archetype = editorial_thought_leadership
  - layout = reading_rail_plus_supporting_navigation
  - typography_priority = high
prefer:
  - content hubs
  - clear author/date/source metadata
  - search and topic navigation when content depth requires it
avoid:
  - heavy animation in reading flow
  - unreadable wide measures
fallback:
  - linear article and topic architecture
rationale: "Reading, scanning, trust, and topical discovery dominate."
source_urls:
  - https://developer.apple.com/design/human-interface-guidelines/layout
```

## 4.2 Brand personality rules

### DD-013 — Authoritative personality

```yaml
if:
  - brand_personality contains authoritative
then:
  - color = limited_high_contrast_palette
  - type = clear_sans_or_restrained_serif_sans
  - motion = minimal
  - layout = structured_grid
prefer:
  - evidence
  - clear labels
  - conventional navigation
avoid:
  - playful cursors
  - excessive glow
  - informal illustration unless category fit
fallback:
  - content-first layout
rationale: "Authority is communicated through clarity, precision, restraint, and proof."
source_urls:
  - https://m3.material.io/foundations/interaction/states
```

### DD-014 — Premium personality

```yaml
if:
  - brand_personality contains premium
then:
  - type = refined_display_plus_legible_body
  - spacing = generous_but_bounded
  - imagery = high_quality_or_none
  - composition = editorial_or_material_led
unless:
  - visual_asset_quality in [none, low]
prefer:
  - fewer stronger elements
  - material-derived color
  - controlled motion
avoid:
  - low-quality stock imagery
  - many competing effects
fallback:
  - typography-led premium system using color, spacing, lines and type
rationale: "Premium perception depends on restraint, detail, material quality and coherence."
source_urls:
  - https://www.awwwards.com/about-evaluation/
```

### DD-015 — Technical personality

```yaml
if:
  - brand_personality contains technical
then:
  - type = clean_sans_with_optional_mono_accent
  - imagery = product_UI_diagrams_data_visuals
  - layout = modular_grid
prefer:
  - SVG diagrams
  - structured sections
  - documented states
avoid:
  - purely abstract imagery when explanation is needed
fallback:
  - static diagram + HTML explanation
rationale: "Technical audiences benefit from precision and visible system logic."
source_urls:
  - https://developer.mozilla.org/en-US/docs/Web/SVG
```

### DD-016 — Playful personality

```yaml
if:
  - brand_personality contains playful
  - trust_requirement not in [high, very_high]
then:
  - color = vibrant_but_contrast_safe
  - interaction_level = medium
  - motion_intensity = medium
prefer:
  - one signature microinteraction
  - illustration
  - friendly type
avoid:
  - playfulness in errors, payment, safety, or legal content
fallback:
  - color and illustration without motion
rationale: "Playfulness should support approachable exploration, not weaken serious actions."
source_urls:
  - https://m3.material.io/styles/motion/transitions/applying-transitions
```

### DD-017 — Editorial personality

```yaml
if:
  - brand_personality contains editorial
then:
  - layout = editorial_grid
  - type = strong_hierarchy
  - reading_measure = bounded
  - media = captions_and_context
prefer:
  - pull quotes
  - reading rhythm
  - asymmetry where content supports it
avoid:
  - card overload
  - narrow text columns that fracture reading
fallback:
  - structured single-column narrative
rationale: "Editorial design is driven by reading rhythm and content hierarchy."
source_urls:
  - https://developer.apple.com/design/human-interface-guidelines/layout
```

### DD-018 — Futuristic personality

```yaml
if:
  - brand_personality contains futuristic
then:
  - visual_expression = medium
  - use = controlled_gradients_glow_or_depth
unless:
  - trust_requirement in [high, very_high]
prefer:
  - product-grounded visual metaphor
  - readable contrast
  - one signature technical visual
avoid:
  - generic neon orb
  - unreadable glass layers
  - WebGL without spatial purpose
fallback:
  - gradient/token system + SVG diagram
rationale: "Futuristic tone needs a defensible product or brand relationship, not category cliché."
source_urls:
  - https://www.cssdesignawards.com/about
```

## 4.3 Color and typography rules

### DD-019 — Color semantic tokens

```yaml
if:
  - any website
then:
  - require = [surface, surface_muted, text, text_muted, primary, focus, success, warning, danger]
prefer:
  - semantic_tokens_over_raw_color_use
avoid:
  - color_as_only_state_indicator
fallback:
  - neutral accessible palette
rationale: "Functional color must remain distinct from decorative color."
source_urls:
  - https://www.w3.org/TR/WCAG22/
```

### DD-020 — Color contrast

```yaml
if:
  - text overlays image_or_video_or_gradient
then:
  - require = contrast_test_in_actual_rendered_state
  - add = controlled_overlay_or_solid_surface_if_needed
avoid:
  - assumed contrast from design mockup
fallback:
  - move text to solid background
rationale: "Responsive crop and media variation can invalidate contrast assumptions."
source_urls:
  - https://www.w3.org/TR/WCAG22/
```

### DD-021 — Fluid type

```yaml
if:
  - responsive website
then:
  - use = clamp_based_type_tokens
  - cap = max_sizes
prefer:
  - readable_body_type
  - bounded_heading_scale
avoid:
  - fixed height text containers
  - shrinking text solely to avoid wrapping
fallback:
  - breakpoint-based static tokens
rationale: "Type must adapt without becoming giant, clipped, or unreadable."
source_urls:
  - https://developer.apple.com/design/human-interface-guidelines/layout
```

### DD-022 — Reading measure

```yaml
if:
  - text_density in [medium, high]
then:
  - body_measure = 45_to_80_characters_per_line
  - content_container = bounded
avoid:
  - full-width prose on ultra_wide displays
fallback:
  - single reading rail
rationale: "Line length affects readability and scanning."
source_urls:
  - https://developer.apple.com/design/human-interface-guidelines/layout
```

### DD-023 — Large type

```yaml
if:
  - brand_expression_need == high
  - headline_copy_length <= short
then:
  - allow = large_display_typography
unless:
  - headline wraps into confusing fragments
  - mobile CTA is pushed too far below first viewport
prefer:
  - clamp and intentional line breaks
avoid:
  - huge type for long technical/legal propositions
fallback:
  - moderate heading scale with stronger hierarchy
rationale: "Large type can create immediate hierarchy but cannot repair vague copy."
source_urls:
  - https://www.awwwards.com/about-evaluation/
```

## 4.4 Layout, grid, and hero rules

### DD-024 — Container strategy

```yaml
if:
  - any website
then:
  - use = bounded_page_containers
  - use = reading_rails_for_prose
  - allow = full_bleed_media_only_when_justified
prefer:
  - CSS grid and container queries
avoid:
  - unbounded wide body text
fallback:
  - standard content container
rationale: "Responsive layouts need controlled content width, especially on large displays."
source_urls:
  - https://web.dev/learn/css/container-queries
  - https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_queries
```

### DD-025 — Grid selection

```yaml
if:
  - content is repeated_comparable_items
then:
  - layout = responsive_grid
  - card_min_width = defined
prefer:
  - CSS Grid auto-fit/minmax
avoid:
  - fixed column counts that create tiny cards
fallback:
  - single-column list
rationale: "Grid should follow item minimum usable width, not device labels."
source_urls:
  - https://m3.material.io/foundations/adaptive-design/overview
```

### DD-026 — Bento selection

```yaml
if:
  - content has 4_to_8_modular_benefits
  - benefits have different priority_or_media_weight
then:
  - allow = bento_grid
unless:
  - narrative is linear
  - content is weak_or_repetitive
prefer:
  - semantic order and responsive stacking
avoid:
  - bento for every section
fallback:
  - equal feature grid or sequential sections
rationale: "Bento supports modular scanning, not all information types."
source_urls:
  - https://m3.material.io/foundations/adaptive-design/overview
```

### DD-027 — Editorial layout selection

```yaml
if:
  - content_type in [case_study, long_form_story, publication, architecture_portfolio]
then:
  - layout = editorial_grid
  - use = main_reading_rail + optional_aside
prefer:
  - captions
  - pull quotes
  - visual pacing
avoid:
  - card-heavy fragmentation
fallback:
  - structured vertical narrative
rationale: "Long-form content benefits from controlled reading rhythm."
source_urls:
  - https://www.siteinspire.com/
```

### DD-028 — Asymmetric layout selection

```yaml
if:
  - visual_asset_quality == high
  - brand_expression_need == high
  - industry in [fashion, art, photography, architecture, creative_agency]
then:
  - allow = asymmetric_layout
unless:
  - information_density == high
  - trust_requirement == very_high
prefer:
  - maintained DOM order
  - mobile vertical narrative
avoid:
  - asymmetry for dense data/forms
fallback:
  - editorial grid
rationale: "Asymmetry directs attention and signals character, but can harm scanning when overused."
source_urls:
  - https://www.siteinspire.com/
```

### DD-029 — Full-bleed media

```yaml
if:
  - image_assets >= high
  - media communicates atmosphere_or_material_quality
then:
  - allow = full_bleed_media_section
unless:
  - LCP or mobile payload exceeds budget
  - contrast cannot be preserved
prefer:
  - art-directed responsive crops
  - text within bounded overlay surface
avoid:
  - full-bleed text-only reading sections
fallback:
  - bounded media card
rationale: "Immersive media is useful when it contributes actual evidence or atmosphere."
source_urls:
  - https://web.dev/learn/design/responsive-images
```

### DD-030 — Split hero

```yaml
if:
  - hero has clear_message + supporting_visual_or_product_ui
then:
  - use = split_hero
unless:
  - either column becomes too narrow
  - mobile hierarchy becomes unclear
prefer:
  - copy first in DOM
  - stack visual after CTA on compact widths
avoid:
  - equal competing CTAs across halves
fallback:
  - vertical hero
rationale: "Split layouts pair proposition with proof when both are meaningful."
source_urls:
  - https://developer.apple.com/design/human-interface-guidelines/layout
```

### DD-031 — Hero content

```yaml
if:
  - any marketing_or_service page
then:
  - hero must answer = [what, for_whom, why_it_matters, next_step]
prefer:
  - one primary CTA
  - one supporting proof element
avoid:
  - vague slogan-only hero
  - video-only value proposition
fallback:
  - text-first hero with verified CTA
rationale: "Visitors need immediate relevance and action clarity."
source_urls:
  - https://www.awwwards.com/about-evaluation/
```

### DD-032 — Proof before conversion

```yaml
if:
  - purchase_cycle in [considered, long, regulated]
then:
  - place = proof_near_primary_conversion_points
prefer:
  - verified case studies
  - credentials
  - process transparency
  - security/terms where relevant
avoid:
  - logo wall without permission
  - invented metrics
fallback:
  - explain methodology and next-step expectations
rationale: "Longer, riskier decisions require evidence before commitment."
source_urls:
  - https://baymard.com/research/methodology
```

## 4.5 Navigation and CTA rules

### DD-033 — Navigation depth

```yaml
if:
  - content_breadth == high
then:
  - navigation = explicit_hierarchy + search_or_local_nav_as_needed
prefer:
  - descriptive labels
  - current_location_state
avoid:
  - vague labels
  - hidden key destinations
fallback:
  - simplified information architecture
rationale: "Navigation should expose information scent for major user tasks."
source_urls:
  - https://m3.material.io/components/navigation-drawer
```

### DD-034 — Mobile navigation

```yaml
if:
  - viewport == compact OR primary_pointer == coarse
then:
  - navigation = accessible_drawer_or_compact_bar
  - require = [keyboard_controls, visible_close, route_parity]
prefer:
  - explicit nested levels
avoid:
  - hover-only mega menus
fallback:
  - linear navigation list
rationale: "Mobile navigation requires explicit touch and keyboard interaction."
source_urls:
  - https://m3.material.io/components
  - https://www.w3.org/TR/WCAG22/
```

### DD-035 — CTA specificity

```yaml
if:
  - primary_objective is known
then:
  - CTA_label = outcome_specific
prefer:
  - "Book a consultation"
  - "View available rooms"
  - "Start free trial"
  - "Request a quote"
avoid:
  - repeated "Learn more" for primary actions
fallback:
  - "Contact us" only when no more specific approved action exists
rationale: "Specific CTA labels reduce uncertainty about the next outcome."
source_urls:
  - https://developer.apple.com/design/human-interface-guidelines/gestures
```

### DD-036 — CTA competition

```yaml
if:
  - hero contains multiple actions
then:
  - primary_action_count = 1
  - secondary_actions = visually subordinate
avoid:
  - equal button weight for unrelated actions
fallback:
  - move secondary action to text link
rationale: "Multiple equal CTAs dilute hierarchy."
source_urls:
  - https://developer.apple.com/design/human-interface-guidelines/layout
```

### DD-037 — Sticky CTA

```yaml
if:
  - mobile_share == high
  - primary_task is high_intent
  - CTA has verified functional endpoint
then:
  - allow = sticky_mobile_cta
unless:
  - it obscures focused content
  - it blocks content or software keyboard
prefer:
  - safe_area aware padding
  - context-specific CTA
avoid:
  - sticky CTA for low-intent browsing
fallback:
  - inline repeated CTA
rationale: "Persistent action can reduce friction when the action is clearly valuable and non-obstructive."
source_urls:
  - https://www.w3.org/WAI/WCAG22/Techniques/
  - https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env
```

## 4.6 Card, gallery, and disclosure rules

### DD-038 — Card usage

```yaml
if:
  - content is repeated_and_comparable
then:
  - use = card_system
  - require = clear_subject + meaningful_action_or_noninteractive_state
prefer:
  - consistent card anatomy
  - clear click target
avoid:
  - nested cards
  - cards that appear clickable but are not
fallback:
  - list with headings and links
rationale: "Cards should represent a single subject and communicate their interactive state."
source_urls:
  - https://m3.material.io/components/cards/accessibility
```

### DD-039 — Expandable cards

```yaml
if:
  - repeated_items_have_short_summary + optional_detail
then:
  - allow = expandable_cards
unless:
  - users need to compare all details simultaneously
prefer:
  - button semantics
  - one-open mode on mobile where appropriate
avoid:
  - hiding essential price/specification
fallback:
  - full cards or detail pages
rationale: "Progressive disclosure reduces initial density but should not conceal key decision information."
source_urls:
  - https://www.w3.org/WAI/ARIA/apg/patterns/accordion/
```

### DD-040 — Accordion

```yaml
if:
  - content is FAQ_or_secondary_detail
then:
  - use = accessible_accordion
prefer:
  - native details_or_button_with_aria_controls
  - deep-linkable headings where appropriate
avoid:
  - putting core proposition or mandatory terms only inside collapsed content
fallback:
  - visible sections
rationale: "Accordions are for secondary, independently expandable details."
source_urls:
  - https://www.w3.org/WAI/ARIA/apg/patterns/accordion/
```

### DD-041 — Tabs

```yaml
if:
  - content alternatives are mutually_exclusive_and_short
then:
  - allow = tabs
unless:
  - content is long_or_essential
  - users need side_by_side comparison
prefer:
  - accessible tab roles and keyboard behavior
avoid:
  - tabs used to hide an entire page's main content
fallback:
  - stacked sections or anchor links
rationale: "Tabs work for closely related views, not long concealed content."
source_urls:
  - https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
```

### DD-042 — Gallery selection

```yaml
if:
  - business relies_on_visual_inspection
  - verified_images >= sufficient
then:
  - use = interactive_gallery
prefer:
  - manual controls
  - captions/alt
  - responsive source sizes
avoid:
  - auto-rotating gallery
  - hover-only navigation
fallback:
  - responsive static grid
rationale: "Galleries support inspection when imagery is actual evidence."
source_urls:
  - https://baymard.com/blog/current-state-ecommerce-product-page-ux
```

### DD-043 — Carousel limits

```yaml
if:
  - carousel is considered
then:
  - classify = secondary_content_only
  - require = [manual_controls, keyboard_access, touch_access, visible_position]
unless:
  - carousel contains critical discovery_or_conversion_content
prefer:
  - static grid for primary content
avoid:
  - autorotation on mobile
  - hiding product breadth in carousel
fallback:
  - vertical list or grid
rationale: "Auto-rotating carousels create missed content and poor control."
source_urls:
  - https://baymard.com/learn/ecommerce-ux-best-practices
```

### DD-044 — Before/after

```yaml
if:
  - content includes truthful_matched_before_after_assets
  - visual_comparison supports decision
then:
  - allow = before_after_slider
prefer:
  - range input or accessible controls
  - labelled static pair fallback
avoid:
  - misleading transformation claims
fallback:
  - side-by-side annotated images
rationale: "Direct visual comparison can demonstrate change when evidence is genuine."
source_urls:
  - https://baymard.com/blog/current-state-ecommerce-product-page-ux
```

## 4.7 Interaction and motion rules

### DD-045 — Micro-interactions

```yaml
if:
  - any interactive control
then:
  - require = visible_state_feedback
prefer:
  - focus, pressed, selected, loading, success, error states
avoid:
  - decorative delay before response
fallback:
  - immediate static state change
rationale: "Interaction feedback communicates action availability and outcome."
source_urls:
  - https://m3.material.io/foundations/interaction/states
```

### DD-046 — Motion purpose

```yaml
if:
  - animation is proposed
then:
  - require = one_of [state_feedback, spatial_relationship, sequence_explanation, attention_guidance]
unless:
  - animation is a single restrained brand atmosphere layer within budget
avoid:
  - animation without stated purpose
fallback:
  - static composition or opacity state
rationale: "Motion should communicate relationships, availability, or outcomes."
source_urls:
  - https://m2.material.io/design/motion/understanding-motion.html
```

### DD-047 — Reduced motion

```yaml
if:
  - prefers_reduced_motion == true
then:
  - disable = [parallax, cursor_follower, auto_rotation, morphing, magnetic_movement, scroll_scrub]
  - replace = [static_state, opacity_change, visible_label]
prefer:
  - preserve state feedback without spatial movement
avoid:
  - removing meaning along with motion
fallback:
  - static sequential content
rationale: "Non-essential motion must respect user preference and preserve access."
source_urls:
  - https://www.w3.org/WAI/WCAG22/Techniques/css/C39
  - https://m3.material.io/styles/motion/transitions/applying-transitions
```

### DD-048 — CSS first motion

```yaml
if:
  - animation can be expressed_with_transform_or_opacity
then:
  - implement = CSS_transition_or_keyframes
prefer:
  - transform
  - opacity
avoid:
  - top_left_width_height_margin animation
fallback:
  - no animation
rationale: "Compositor-friendly properties reduce layout and paint work."
source_urls:
  - https://web.dev/articles/animations-and-performance
```

### DD-049 — Motion library selection

```yaml
if:
  - local_react_component_motion is needed
then:
  - use = Motion
unless:
  - CSS solves the interaction
prefer:
  - LazyMotion for noncritical features
avoid:
  - global client animation dependency for static page
fallback:
  - CSS/WAAPI
rationale: "Motion is suited to localized declarative React animation but should be loaded selectively."
source_urls:
  - https://motion.dev/docs/react-reduce-bundle-size
  - https://motion.dev/docs/react-accessibility
```

### DD-050 — GSAP selection

```yaml
if:
  - complex_multi_track_choreography OR advanced_svg_or_scroll_narrative
  - user_value >= high
then:
  - allow = GSAP
unless:
  - static/CSS/Motion alternative communicates same idea
prefer:
  - scoped timeline
  - matchMedia cleanup
  - single narrative sequence
avoid:
  - site-wide ScrollTrigger use
  - scroll hijacking
fallback:
  - CSS sticky + static sections
rationale: "GSAP is an escalation tool for high-value choreography, not a default page dependency."
source_urls:
  - https://gsap.com/docs/v3/Plugins/ScrollTrigger/
  - https://gsap.com/docs/v3/GSAP/gsap.matchMedia/
```

### DD-051 — Scroll-driven animation

```yaml
if:
  - scrolling naturally maps_to_progress_or_story
  - content remains meaningful_without_animation
then:
  - allow = scroll_driven_animation
prefer:
  - CSS scroll timelines
  - sticky sections before JS pinning
avoid:
  - scroll hijacking
  - animation-dependent content
fallback:
  - ordered vertical stages
rationale: "Scroll-linked motion can explain progression but must preserve control and fallback."
source_urls:
  - https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations
```

### DD-052 — Parallax

```yaml
if:
  - imagery supports depth_or_atmosphere
  - motion_tolerance == medium_or_high
then:
  - allow = limited_parallax
unless:
  - industry in [healthcare, finance, legal]
  - mobile_share == high
prefer:
  - one_or_two transform layers
avoid:
  - full-page parallax
fallback:
  - static layered image composition
rationale: "Parallax is atmospheric enhancement, not core communication."
source_urls:
  - https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html
```

### DD-053 — Cursor follower

```yaml
if:
  - brand_expression_need == high
  - industry in [creative_agency, art, portfolio, game, campaign]
  - hover == hover
  - pointer == fine
then:
  - allow = cursor_follower
unless:
  - touch/coarse_pointer
  - reduced_motion
  - task_critical_context
prefer:
  - one localized region
avoid:
  - replacing native pointer semantics
fallback:
  - normal hover/focus state
rationale: "Cursor effects are desktop-only optional atmosphere."
source_urls:
  - https://www.w3.org/TR/WCAG22/
```

### DD-054 — Magnetic buttons

```yaml
if:
  - creative_context == true
  - button is noncritical
  - fine_pointer == true
then:
  - allow = magnetic_button
unless:
  - button is checkout_submit_or_emergency_or_form_submit
  - reduced_motion
prefer:
  - bounded transform
avoid:
  - site-wide magnetism
fallback:
  - standard hover/press state
rationale: "Magnetism can be playful but should not interfere with important actions."
source_urls:
  - https://developer.apple.com/design/human-interface-guidelines/motion
```

### DD-055 — Custom cursor

```yaml
if:
  - design is campaign_or_portfolio
  - cursor is nonessential
  - fine_pointer == true
then:
  - allow = custom_cursor
unless:
  - forms, ecommerce, accessibility-sensitive, text-heavy, mobile context
prefer:
  - preserve native cursor affordance
avoid:
  - custom cursor for site-wide functional navigation
fallback:
  - native cursor + CSS focus/hover
rationale: "Custom cursors can weaken standard affordances."
source_urls:
  - https://www.w3.org/TR/WCAG22/
```

### DD-056 — Text animation

```yaml
if:
  - copy_length == short
  - brand_energy in [medium, high]
  - effect supports emphasis
then:
  - allow = text_animation
unless:
  - text is legal, technical, long, primary SEO content, or reduced_motion
prefer:
  - line-level opacity/transform
avoid:
  - per-character animation for body copy
fallback:
  - static headline
rationale: "Text movement can amplify a short message but impairs prolonged reading."
source_urls:
  - https://motion.dev/docs/react-accessibility
```

### DD-057 — Lottie

```yaml
if:
  - small_vector_illustration_or_feedback is needed
then:
  - allow = Lottie
unless:
  - animation contains essential_text
  - JSON is heavy_or_continuous
prefer:
  - lazy loading
  - pause offscreen
  - static first frame fallback
avoid:
  - Lottie as complex video replacement
fallback:
  - static SVG
rationale: "Lottie works for compact illustrative motion when it remains nonessential."
source_urls:
  - https://motion.dev/docs/react-accessibility
```

### DD-058 — SVG animation

```yaml
if:
  - communication_problem == explain_system_process_or_data_flow
then:
  - prefer = inline_SVG
  - allow = SVG_animation
prefer:
  - HTML labels and text alternative
  - CSS/WAAPI for simple path animation
avoid:
  - canvas for accessible diagrams
fallback:
  - static SVG + ordered text list
rationale: "SVG is scalable and suitable for diagrams when labels remain accessible."
source_urls:
  - https://developer.mozilla.org/en-US/docs/Web/SVG
```

## 4.8 3D, WebGL and spatial interaction rules

### DD-059 — 3D eligibility

```yaml
if:
  - user must inspect actual_shape_material_assembly_or_configuration
then:
  - 3d_eligibility = true
unless:
  - a static image_sequence_or_video communicates equally well
prefer:
  - static visual first
  - interactive 3D on explicit intent
avoid:
  - generic 3D decoration
fallback:
  - responsive image gallery or SVG diagram
rationale: "3D is justified by spatial comprehension, not novelty."
source_urls:
  - https://threejs.org/manual/
```

### DD-060 — WebGL constraints

```yaml
if:
  - WebGL is selected
then:
  - require = [static_fallback, semantic_HTML_equivalent, lazy_load, capability_check, reduced_motion_mode]
  - limit = one_canvas_per_route
avoid:
  - essential text inside canvas
  - core CTA inside canvas
  - continuous render when unnecessary
fallback:
  - static optimized image + HTML description
rationale: "Canvas/WebGL is not semantic and carries high GPU/battery risk."
source_urls:
  - https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/canvas
  - https://threejs.org/docs/pages/WebGL.html
```

### DD-061 — React Three Fiber selection

```yaml
if:
  - framework == React
  - true_3d_scene is justified
then:
  - prefer = React_Three_Fiber
prefer:
  - frameloop_demand_when_scene_is_not_continuous
  - reused_geometries_materials_assets
  - dynamic_import_ssr_false
avoid:
  - setState inside render loop
  - indiscriminate mounting
fallback:
  - static render
rationale: "R3F supports React composition while performance still depends on rendering and asset discipline."
source_urls:
  - https://r3f.docs.pmnd.rs/advanced/scaling-performance
  - https://r3f.docs.pmnd.rs/advanced/pitfalls
```

### DD-062 — 3D cards vs WebGL

```yaml
if:
  - desired_effect == visual_depth_on_card
then:
  - prefer = CSS_3D_transform
avoid:
  - WebGL_or_Threejs
fallback:
  - elevation/border/scale
rationale: "CSS 3D is cheaper and sufficient for card perspective."
source_urls:
  - https://web.dev/articles/animations-and-performance
```

### DD-063 — Product configurator

```yaml
if:
  - product has configurable_geometry_material_or_components
  - conversion_value_of_inspection == high
then:
  - allow = on_demand_3d_configurator
require:
  - accessible standard form controls for selections
  - product spec text
  - static asset fallback
avoid:
  - mandatory 3D before purchase
fallback:
  - variant image gallery
rationale: "Configuration can benefit from spatial view, but purchase must not depend on it."
source_urls:
  - https://r3f.docs.pmnd.rs/advanced/scaling-performance
```

## 4.9 Responsive rules

### DD-064 — Responsive principle

```yaml
if:
  - any component
then:
  - evaluate = [viewport, container_width, pointer, hover, reduced_motion, text_zoom, orientation, safe_area]
avoid:
  - device-name-only logic
fallback:
  - semantic vertical layout
rationale: "Responsive design adapts to space and capabilities, not a simple desktop/tablet/mobile taxonomy."
source_urls:
  - https://web.dev/articles/responsive-web-design-basics
  - https://web.dev/articles/new-responsive
```

### DD-065 — Container queries

```yaml
if:
  - component is reusable_or_can_appear_in_multiple_regions
then:
  - prefer = container_queries
avoid:
  - viewport-only component breakpoints
fallback:
  - resilient single-column component
rationale: "Components should adapt to available container width."
source_urls:
  - https://web.dev/learn/css/container-queries
  - https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_queries
```

### DD-066 — Compact reflow

```yaml
if:
  - container_or_viewport < compact_threshold
then:
  - reflow = vertical
  - prioritize = [message, CTA, proof, essential media]
  - remove = nonessential decoration
avoid:
  - two-dimensional page scrolling
fallback:
  - one-column document flow
rationale: "WCAG reflow requires content/functionality without loss at narrow widths except genuinely two-dimensional content."
source_urls:
  - https://www.w3.org/WAI/standards-guidelines/wcag/new-in-21/
```

### DD-067 — Responsive card grid

```yaml
if:
  - grid cards are used
then:
  - columns = auto_fit_minmax(min(100%, min_card_width), 1fr)
  - card_order = semantic
avoid:
  - fixed 4-column mobile grids
fallback:
  - single-column cards
rationale: "Card columns should respond to usable card width."
source_urls:
  - https://m3.material.io/foundations/adaptive-design/overview
```

### DD-068 — Hover fallback

```yaml
if:
  - interaction has hover enhancement
then:
  - require = focus_equivalent + touch_equivalent_or_persistent_information
if:
  - hover == none OR pointer == coarse
then:
  - remove = hover_only_behavior
fallback:
  - visible controls or tap state
rationale: "Hover is not universally available and cannot carry essential information."
source_urls:
  - https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries
```

### DD-069 — Safe area

```yaml
if:
  - UI is fixed_or_fullscreen
then:
  - require = safe_area_inset_padding
prefer:
  - env(safe-area-inset-*)
avoid:
  - fixed bottom CTA that hides focused field or browser keyboard
fallback:
  - inline action region
rationale: "Non-rectangular and mobile browser viewports can obscure fixed UI."
source_urls:
  - https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env
```

### DD-070 — Dynamic mobile viewport

```yaml
if:
  - section uses viewport_height
then:
  - prefer = svh_or_dvh_based_min_height
avoid:
  - naive 100vh for critical CTA layout
fallback:
  - content-based min-height
rationale: "Mobile browser chrome changes visible viewport height."
source_urls:
  - https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Environment_variables/Using
```

### DD-071 — Orientation

```yaml
if:
  - any mobile/tablet layout
then:
  - support = portrait_and_landscape
avoid:
  - orientation lock unless essential
fallback:
  - layout that maintains core task in both orientations
rationale: "Users may operate content in different orientations; restriction needs a genuine exception."
source_urls:
  - https://www.w3.org/TR/wcag2mobile-22/
```

### DD-072 — Large screens

```yaml
if:
  - viewport >= large
then:
  - allow = additional_supporting_pane_or_visual_space
  - cap = reading_measure_and_content_width
avoid:
  - endless text lines
  - oversized controls
fallback:
  - bounded centered layout
rationale: "Large screens provide space but do not justify unbounded readable content."
source_urls:
  - https://m3.material.io/foundations/layout/breakpoints
```

### DD-073 — Foldables

```yaml
if:
  - viewport_segments >= 2
then:
  - keep = critical_content_out_of_hinge
  - allow = two_pane_layout_only_when_meaningful
avoid:
  - splitting forms or CTA across hinge
fallback:
  - single-pane continuous layout
rationale: "Foldable layouts should adapt without placing core UI in unusable hinge regions."
source_urls:
  - https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Environment_variables/Using
```

### DD-074 — Responsive image sizing

```yaml
if:
  - image is responsive
then:
  - require = width_height_or_aspect_ratio
  - require = srcset_sizes_or_framework_equivalent
prefer:
  - art_direction_for_changed_focal_crop
avoid:
  - sending desktop originals to all devices
fallback:
  - single optimized responsive source
rationale: "Dimensions prevent CLS and source selection controls transfer size."
source_urls:
  - https://web.dev/articles/optimize-cls
  - https://web.dev/learn/design/responsive-images
```

### DD-075 — Next Image usage

```yaml
if:
  - framework == Next.js
  - image uses fill_or_responsive_CSS_width
then:
  - require = sizes
  - reserve = aspect_ratio_or_positioned_parent
avoid:
  - omitted sizes with fill
fallback:
  - intrinsic width/height Image
rationale: "sizes informs browser source selection and prevents over-downloading."
source_urls:
  - https://nextjs.org/docs/app/api-reference/components/image
```

## 4.10 Accessibility rules

### DD-076 — Semantic first

```yaml
if:
  - any UI component
then:
  - prefer = native_semantic_HTML
avoid:
  - div_as_button
  - ARIA_when_native_element_exists
fallback:
  - accessible native component
rationale: "Semantic HTML supplies baseline keyboard and assistive technology behavior."
source_urls:
  - https://www.w3.org/TR/WCAG22/
```

### DD-077 — Keyboard equivalence

```yaml
if:
  - element is interactive
then:
  - require = keyboard_operable
  - require = visible_focus
  - require = logical_focus_order
avoid:
  - pointer-only controls
fallback:
  - native button/link/input
rationale: "Core interaction cannot depend on pointer or gesture."
source_urls:
  - https://www.w3.org/TR/WCAG22/
```

### DD-078 — Focus not obscured

```yaml
if:
  - sticky_header_or_footer_or_overlay exists
then:
  - require = focus_not_entirely_hidden
  - use = scroll_padding_and_scroll_margin
avoid:
  - fixed UI covering focused elements
fallback:
  - nonsticky UI at compact size
rationale: "WCAG 2.2 requires focus not be entirely obscured by author-created content."
source_urls:
  - https://www.w3.org/WAI/WCAG22/Techniques/
```

### DD-079 — Target size

```yaml
if:
  - pointer control exists
then:
  - require = wcag_target_size_minimum
  - recommend = 44px_for_primary_touch_actions
avoid:
  - tiny icon-only controls without spacing
fallback:
  - larger button or text label
rationale: "Touch controls need sufficient size and separation."
source_urls:
  - https://www.w3.org/WAI/WCAG22/Techniques/
  - https://m3.material.io/foundations/designing/structure
```

### DD-080 — Motion accessibility

```yaml
if:
  - moving_content_auto_starts_and_lasts_over_5_seconds
then:
  - require = pause_stop_hide_mechanism
if:
  - interaction_triggered_motion_is_nonessential
then:
  - require = reduced_motion_alternative
fallback:
  - static state
rationale: "Users must be able to control disruptive or non-essential motion."
source_urls:
  - https://www.w3.org/TR/WCAG22/
```

### DD-081 — Image alt policy

```yaml
if:
  - image conveys_information_or_function
then:
  - require = useful_text_alternative
if:
  - image is decorative
then:
  - use = alt_empty
avoid:
  - omitted alt attribute
  - redundant alt text
fallback:
  - adjacent semantic text
rationale: "Images require alternatives when they convey information; decoration should not create screen-reader noise."
source_urls:
  - https://www.w3.org/WAI/tutorials/images/
  - https://www.w3.org/WAI/tutorials/images/decorative/
```

### DD-082 — Canvas/WebGL alternative

```yaml
if:
  - canvas_or_WebGL is used
then:
  - require = text_equivalent_or_HTML_alternative
  - require = static_fallback
avoid:
  - canvas-only text, navigation, or product data
fallback:
  - image/SVG/table/HTML explanation
rationale: "Canvas has no inherent semantic object model for assistive technology."
source_urls:
  - https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/canvas
```

### DD-083 — Forms

```yaml
if:
  - form is present
then:
  - require = [visible_label, programmatic_label, errors, recovery, success_state]
prefer:
  - server_validation + client assistance
avoid:
  - placeholder-only labels
  - silent failure
fallback:
  - simpler contact route
rationale: "Forms require explicit labels and understandable feedback."
source_urls:
  - https://nextjs.org/docs/app/guides/production-checklist
```

## 4.11 Performance rules

### DD-084 — Performance budget gate

```yaml
if:
  - a route contains advanced_effect
then:
  - calculate = [LCP_risk, INP_risk, CLS_risk, JS_weight, image_weight, GPU_cost]
  - block = effect_if_budget_exceeded
prefer:
  - static_or_deferred enhancement
fallback:
  - CSS/SVG/image alternative
rationale: "Production quality requires measurable performance, not assumed performance."
source_urls:
  - https://web.dev/articles/vitals
```

### DD-085 — LCP media

```yaml
if:
  - hero media is LCP_candidate
then:
  - require = optimized_source + dimensions + correct_priority
avoid:
  - loading multiple competing hero assets
  - delaying LCP behind client JS
fallback:
  - static optimized image or text-first hero
rationale: "LCP is driven by the largest visible content and must load quickly."
source_urls:
  - https://web.dev/articles/lcp
  - https://nextjs.org/docs/app/api-reference/components/image
```

### DD-086 — CLS prevention

```yaml
if:
  - image_video_embed_dynamic_component exists
then:
  - require = reserved_dimensions_or_aspect_ratio
avoid:
  - late media insertion without space reservation
fallback:
  - fixed aspect-ratio placeholder
rationale: "Reserved dimensions prevent layout shift."
source_urls:
  - https://web.dev/articles/optimize-cls
```

### DD-087 — Client JS minimization

```yaml
if:
  - page content is static_or_server_renderable
then:
  - prefer = Server_Component_or_static_HTML
avoid:
  - unnecessary use_client
  - global animation libraries
fallback:
  - isolated client island
rationale: "Less initial client JavaScript improves loading and interaction responsiveness."
source_urls:
  - https://nextjs.org/docs/app/guides/lazy-loading
```

### DD-088 — Lazy loading advanced modules

```yaml
if:
  - module in [WebGL, map, Lottie, video, large_gallery, GSAP_story]
then:
  - prefer = dynamic_import + viewport_or_intent_trigger
unless:
  - module is essential LCP content and budget proves it safe
fallback:
  - static placeholder/fallback
rationale: "Heavy modules should not delay the initial route without demonstrated value."
source_urls:
  - https://nextjs.org/docs/app/guides/lazy-loading
```

### DD-089 — Animation properties

```yaml
if:
  - animation is used
then:
  - prefer = [transform, opacity]
avoid:
  - [top, left, width, height, margin] animation
fallback:
  - no animation
rationale: "Transform and opacity usually avoid costly layout/paint work."
source_urls:
  - https://web.dev/articles/animations-and-performance
```

### DD-090 — Third-party embeds

```yaml
if:
  - third_party_embed exists
then:
  - defer = until_user_intent_or_near_viewport
  - reserve = layout_space
avoid:
  - loading map/video/social embeds in initial viewport without need
fallback:
  - click-to-load preview
rationale: "Third-party embeds can add performance and layout-shift cost."
source_urls:
  - https://web.dev/articles/embed-best-practices
```

## 4.12 SEO rules

### DD-091 — Semantic indexability

```yaml
if:
  - page is public_marketing_or_content_page
then:
  - require = server_rendered_semantic_HTML
  - require = one_clear_H1
  - require = meaningful_internal_links
avoid:
  - core content client-only or canvas-only
fallback:
  - server-rendered text version
rationale: "Search and assistive technologies need meaningful page structure."
source_urls:
  - https://nextjs.org/docs/app/getting-started/metadata-and-og-images
```

### DD-092 — Metadata

```yaml
if:
  - page is indexable
then:
  - require = [title, description, canonical_when_needed, OG_metadata]
  - require = page_specific_metadata
avoid:
  - duplicate generic metadata
fallback:
  - derived metadata from verified page content
rationale: "Accurate metadata supports search and shareability."
source_urls:
  - https://nextjs.org/docs/app/getting-started/metadata-and-og-images
```

### DD-093 — Content hubs

```yaml
if:
  - seo_dependency == high
  - business has multiple_services_or_topics
then:
  - architecture += [service_pages, use_case_pages, resources, FAQ, internal_links]
prefer:
  - distinct search intent per page
avoid:
  - thin near-duplicate pages
fallback:
  - smaller set of deeper verified pages
rationale: "Search strategy requires useful, differentiated page intent."
source_urls:
  - https://nextjs.org/docs/app/getting-started/metadata-and-og-images
```

### DD-094 — Structured data

```yaml
if:
  - structured_data is proposed
then:
  - include_only = verified_publicly_visible_facts
avoid:
  - fake review, FAQ, product, organization or local business schema
fallback:
  - no structured data until verified
rationale: "Structured data must accurately represent visible, verified content."
source_urls:
  - https://nextjs.org/docs/app/getting-started/metadata-and-og-images
```

### DD-095 — Image SEO

```yaml
if:
  - meaningful image is used
then:
  - require = descriptive_alt_or_caption_when_needed
  - optimize = file_name_dimensions_format
avoid:
  - text embedded solely in image
fallback:
  - adjacent HTML text
rationale: "Images should have accessible and contextual semantics."
source_urls:
  - https://www.w3.org/WAI/tutorials/images/
```

## 4.13 Content and asset rules

### DD-096 — Missing logo

```yaml
if:
  - logo == unavailable
then:
  - use = verified_business_name_wordmark_or_initial_monogram
  - mark_internal = provisional
avoid:
  - inventing official trademark-like logo
fallback:
  - text wordmark
rationale: "Identity can be presented safely without claiming an unapproved logo."
source_urls:
  - https://www.w3.org/WAI/tutorials/images/decorative/
```

### DD-097 — Missing hero imagery

```yaml
if:
  - hero_images in [unavailable, partial]
then:
  - prefer = typography_CSS_SVG_visual
unless:
  - real product/place/person imagery is essential to decision
avoid:
  - fake real office, customer, facility or product imagery
fallback:
  - text-first hero
rationale: "Decorative visual need can be solved without false representation."
source_urls:
  - https://www.w3.org/WAI/tutorials/images/decorative/
```

### DD-098 — Missing testimonials

```yaml
if:
  - testimonials != verified_available
then:
  - hide = testimonial_section
  - create_editor_slot = true
avoid:
  - generated quote/name/rating
fallback:
  - verified process/methodology section
rationale: "Testimonials are factual endorsements and cannot be invented."
source_urls:
  - https://baymard.com/research/methodology
```

### DD-099 — Missing customer logos

```yaml
if:
  - customer_logos != verified_available
then:
  - hide = logo_wall
avoid:
  - using recognisable brand logos without relationship and permission
fallback:
  - evidence-free but honest capability/process section
rationale: "Client logos imply a factual commercial relationship."
source_urls:
  - https://www.w3.org/TR/WCAG22/
```

### DD-100 — Missing awards/statistics/certifications/reviews

```yaml
if:
  - any_of [awards, statistics, certifications, reviews] != verified_available
then:
  - hide = associated_proof_module
  - request = source + date + permission + scope
avoid:
  - invented badges, ratings, metrics, claims
fallback:
  - no proof module or verified methodology text
rationale: "Reputational and regulated proof requires source-backed verification."
source_urls:
  - https://www.w3.org/TR/WCAG22/
```

### DD-101 — Missing contact details

```yaml
if:
  - no_verified_contact_route
then:
  - block = public_contact_CTA
  - request = contact_method
avoid:
  - guessing email, phone, social handles, address
fallback:
  - hide contact section until functional route exists
rationale: "A CTA must have a real, verified endpoint."
source_urls:
  - https://nextjs.org/docs/app/guides/production-checklist
```

### DD-102 — Missing pricing

```yaml
if:
  - pricing != verified_available
then:
  - hide = pricing_cards
  - allow = approved_enquiry_CTA_only
avoid:
  - invented starting price, discount, plan, trial or guarantee
fallback:
  - "Discuss requirements" only if route is verified
rationale: "Pricing is commercial factual content and requires approval."
source_urls:
  - https://baymard.com/blog/current-state-of-checkout-ux
```

### DD-103 — Missing product imagery

```yaml
if:
  - ecommerce == true
  - product_images != verified_available
then:
  - block = product_purchase_publish
  - create = private_catalog_setup_structure
avoid:
  - fabricated products or product photography
fallback:
  - hide product gallery/public purchase path
rationale: "Products must be inspectable and accurately represented before sale."
source_urls:
  - https://baymard.com/blog/current-state-ecommerce-product-page-ux
```

### DD-104 — Missing portfolio/case study

```yaml
if:
  - portfolio_items != verified_available
then:
  - hide = portfolio_module
  - replace = verified_capability_or_process_section
avoid:
  - invented projects, clients, outcomes or screenshots
fallback:
  - methodology page
rationale: "Portfolio evidence is factual work proof."
source_urls:
  - https://www.siteinspire.com/
```

### DD-105 — AI draft content

```yaml
if:
  - content_confidence == ai_draft
then:
  - render_publicly = only_after_explicit_approval
  - label_editor = "AI draft — verify"
prefer:
  - conservative paraphrase from supplied facts
avoid:
  - new metrics, superlatives, outcomes, credentials, location claims
fallback:
  - neutral verified wording
rationale: "AI-generated language may alter a business claim and needs provenance/approval."
source_urls:
  - https://nextjs.org/docs/app/guides/production-checklist
```

### DD-106 — Empty state vs skeleton

```yaml
if:
  - known_content_is_loading
then:
  - use = skeleton_with_reserved_space
if:
  - content_does_not_exist_or_asset_is_missing
then:
  - use = editor_empty_state_or_public_omission
avoid:
  - skeleton for unknown business facts
fallback:
  - neutral public layout or hidden section
rationale: "Loading state and absent content are different states."
source_urls:
  - https://atlassian.design/components
  - https://shopify.dev/docs/api/pos-ui-extensions/latest/polaris-web-components/layout-and-structure/empty-state
```

## 4.14 Quality and production rules

### DD-107 — Production is not build success

```yaml
if:
  - build_passes == true
then:
  - classification = technically_working
unless:
  - design_quality_gate_passes
avoid:
  - production_ready label based only on build/deployment
fallback:
  - run quality scoring + mandatory QA
rationale: "Working code is not equivalent to accessible, performant, coherent professional design."
source_urls:
  - https://nextjs.org/docs/app/guides/production-checklist
```

### DD-108 — Quality score threshold

```yaml
if:
  - weighted_quality_score >= 75
  - all_hard_gates_pass
  - no_core_criterion < 6
then:
  - production_status = production_ready
if:
  - weighted_quality_score >= 82
  - no_core_criterion < 6
then:
  - production_status = professionally_designed
if:
  - weighted_quality_score >= 90
  - no_criterion < 7
  - human_review == approved
then:
  - production_status = world_class
rationale: "Quality needs both aggregate score and critical minimums."
source_urls:
  - https://www.awwwards.com/about-evaluation/
```

### DD-109 — Hard accessibility gate

```yaml
if:
  - blocking_wcag_failure == true
then:
  - block_production = true
regardless_of:
  - aesthetic_score
  - award_style_score
rationale: "Accessibility is not a tradeable visual preference."
source_urls:
  - https://www.w3.org/TR/WCAG22/
```

### DD-110 — Hard content integrity gate

```yaml
if:
  - fabricated_or_unverified_public_claim == true
then:
  - block_production = true
  - remove_or_verify = claim
rationale: "Production quality requires factual integrity."
source_urls:
  - https://nextjs.org/docs/app/guides/production-checklist
```

### DD-111 — Hard performance gate

```yaml
if:
  - core_web_vitals_target_fails
  - failure_is_caused_by_nonessential_enhancement
then:
  - remove_or_defer = enhancement
rationale: "Decorative effects cannot justify a failed core experience."
source_urls:
  - https://web.dev/articles/vitals
```

### DD-112 — World-class differentiation

```yaml
if:
  - target_quality == world_class
then:
  - require = brand_specific_design_idea
  - require = intentional_content_art_direction
  - require = exceptional_execution_without_gate_failures
avoid:
  - trend stacking as memorability strategy
fallback:
  - professionally designed classification
rationale: "World-class requires owned, context-relevant distinction rather than more effects."
source_urls:
  - https://www.awwwards.com/about-evaluation/
  - https://www.cssdesignawards.com/about
```

## 4.15 Additional rules 113–120

### DD-113 — No auto-rotation for primary content

```yaml
if:
  - carousel contains product_or_primary_information
then:
  - autorotate = false
fallback:
  - static grid or manual carousel
rationale: "Users need control and should not miss primary content."
source_urls:
  - https://baymard.com/learn/ecommerce-ux-best-practices
```

### DD-114 — Map selection

```yaml
if:
  - location is verified
  - geographic exploration materially helps users
then:
  - allow = interactive_map
otherwise:
  - use = address + directions link + static context
require:
  - text/list alternative
  - lazy loading
avoid:
  - initial-route heavy map embed
fallback:
  - simple location card
rationale: "Maps are high-cost interactive embeds and should solve a geographic task."
source_urls:
  - https://web.dev/articles/embed-best-practices
```

### DD-115 — Video background

```yaml
if:
  - video communicates atmosphere_or_product_in_use_better_than_image
  - media_assets == high
then:
  - allow = muted_background_video
unless:
  - LCP risk high
  - mobile data sensitivity high
  - text contrast fails
prefer:
  - poster image
  - explicit playback controls for meaningful video
avoid:
  - audio autoplay
  - video-only proposition
fallback:
  - art-directed image
rationale: "Video is expensive and must not hide primary communication."
source_urls:
  - https://web.dev/articles/lcp
```

### DD-116 — Glass effect

```yaml
if:
  - layered_context_or_spatial_UI_benefit == true
then:
  - allow = glass_effect
unless:
  - background is visually_busy
  - contrast cannot pass
prefer:
  - opaque fallback
  - limited panels
avoid:
  - glass over body text
fallback:
  - solid elevated surface
rationale: "Glass can convey layering but easily harms readability and performance."
source_urls:
  - https://www.w3.org/TR/WCAG22/
```

### DD-117 — Gradient and glow

```yaml
if:
  - brand_personality in [technical, playful, futuristic, energetic]
then:
  - allow = controlled_gradient_or_glow
prefer:
  - one tokenized system
  - contrast-tested usage
avoid:
  - glow on every card or text block
fallback:
  - solid accent colors and borders
rationale: "Atmospheric effects require restraint and semantic hierarchy."
source_urls:
  - https://www.w3.org/TR/WCAG22/
```

### DD-118 — Grain/noise

```yaml
if:
  - brand_personality in [editorial, premium, artistic, craft]
then:
  - allow = subtle_noise_texture
unless:
  - text readability_or_rendering suffers
prefer:
  - low-opacity texture outside text surfaces
avoid:
  - noise overlay across content
fallback:
  - flat surface or gentle gradient
rationale: "Texture can add material quality but must not reduce legibility."
source_urls:
  - https://www.w3.org/TR/WCAG22/
```

### DD-119 — Horizontal scrolling

```yaml
if:
  - lateral spatial sequence is essential
  - content is secondary_or_has_vertical_equivalent
then:
  - allow = horizontal_scroll_section
require:
  - manual controls
  - keyboard access
  - vertical mobile fallback
avoid:
  - horizontal primary page navigation
  - scroll hijacking
fallback:
  - vertical sequence/grid
rationale: "Two-dimensional movement should be reserved for content where spatial relationship is meaningful."
source_urls:
  - https://www.w3.org/WAI/standards-guidelines/wcag/new-in-21/
```

### DD-120 — Minimum selected-effect policy

```yaml
if:
  - page has many candidate effects
then:
  - select = top_2_to_5_by_utility
  - max_major_signature_experience = 1
prefer:
  - one coherent motion language
  - one primary visual motif
avoid:
  - combining cursor, magnetic buttons, parallax, WebGL, horizontal scroll, morphing, and kinetic type on one standard page
fallback:
  - remove lowest-value effects
rationale: "Visual coherence and performance improve when each page has a controlled grammar."
source_urls:
  - https://www.awwwards.com/about-evaluation/
  - https://web.dev/articles/animations-and-performance
```

---

# A. Design Pattern Library

## A.1 Pattern schema

```ts
export interface PatternDefinition {
  id: string;
  category: "layout" | "component" | "interaction" | "motion" | "visual" | "immersive";
  principle: string;
  solvesUserProblem: string;
  solvesCommunicationProblem: string;
  bestFor: Industry[];
  poorFor: Industry[];
  requiredContent: string[];
  requiredAssets: string[];
  desktop: string;
  tablet: string;
  mobile: string;
  reducedMotion: string;
  accessibility: string[];
  performanceCost: "low" | "medium" | "high";
  seoRisk: "low" | "medium" | "high";
  implementation: string[];
  fallback: string;
  maxFrequency: string;
}
```

## A.2 Core patterns

| Pattern | Underlying principle | Select when | Avoid when | Implementation / fallback |
|---|---|---|---|---|
| Structured content rail | Clarity and reading measure support comprehension | Trust-heavy, text-led, expert content | Image-led portfolio is primary | CSS Grid + bounded prose; fallback is single column |
| Modular feature grid | Comparable units need scanning | SaaS features, services, programs | Linear narrative or weak content | CSS Grid auto-fit/minmax; fallback vertical list |
| Bento grid | Unequal modular benefits need hierarchy | Product ecosystem has 4–8 distinct modules | Content needs linear explanation | CSS Grid; stack by semantic priority |
| Editorial grid | Story and reading rhythm need pace | Case studies, media, architecture | Simple transaction flow | Grid + reading rail; mobile vertical narrative |
| Asymmetric composition | Deliberate imbalance directs attention | Creative visual brands with high-quality media | Dense data / regulated content | Grid with semantic DOM order; fallback editorial grid |
| Split hero | Message and proof are both essential | SaaS/product/service with UI/image proof | One side lacks value | Grid; stack copy then media |
| Full-bleed media | Atmosphere/material quality needs immersion | Hospitality, fashion, travel, architecture | Assets weak or LCP constrained | `<picture>` art direction; fallback bounded image |
| Sticky narrative | Context persists while evidence changes | Product workflow/process story | Short/transactional pages | CSS sticky; fallback sequential sections |
| Interactive gallery | Inspection reduces uncertainty | Ecommerce, property, art, portfolio | Few or weak images | Semantic gallery; fallback static grid |
| Before/after | Direct visual comparison demonstrates real change | Editing, renovation, design, restoration | Evidence is not matched/ethical | Range input; fallback side-by-side |
| Timeline | Sequence explains chronology/stages | Process, history, roadmap, events | Simple 2–3 steps | Ordered list; mobile vertical |
| FAQ accordion | Progressive disclosure controls density | Secondary questions/support | Primary decision information | `<details>`/accessible buttons; fallback visible blocks |
| Data diagram | Visual encoding explains system/flow | Technical, manufacturing, AI, logistics | Simple list works better | Inline SVG + HTML labels; fallback list/table |
| 3D product view | Spatial inspection improves decision | Automotive, hardware, furniture, architecture | Decorative marketing hero | R3F/Three on intent; fallback images |

---

# B. Industry Design Matrix

| Industry group | Default archetype | Visual expression | Motion cap | Required proof/content | Default prohibited patterns |
|---|---|---:|---:|---|---|
| Professional services | Credibility-led information architecture | Low–medium | Low | Services, process, verified credentials/proof, clear contact | Decorative WebGL, custom cursor, experimental nav |
| SaaS | Product-led technical narrative | Medium | Low–medium | Product proof, use cases, integrations, security, CTA | Productless abstraction, unnecessary 3D |
| AI | Explainable product narrative | Medium | Low–medium | Workflow, data/privacy, limitations/controls, proof | Generic AI orb, unverified benchmarks |
| Finance/banking | Trust-first transactional information | Low | Minimal | Terms, fees, security, support, disclosures | Novel navigation, heavy motion, decorative 3D |
| Legal/healthcare | High-trust service clarity | Low | Minimal | Qualifications, process, location/contact, clear language | Kinetic type, autoplay video, cursor effects |
| Education/university | Audience-segmented content hub | Medium | Low | Programs, outcomes, admissions, resources, search | Overly shallow IA |
| Sports/fitness | Community and schedule hub | Medium–high | Medium | Schedule, registration, coaches, safety, location | Motion obscuring practical information |
| Hospitality/travel | Image-led editorial conversion | High when assets allow | Medium | Booking, location, amenities, policies, reviews if verified | Hidden booking flow, heavy unoptimized media |
| Ecommerce/retail | Discovery-to-checkout system | Medium | Low | Catalog, filters, gallery, price, returns, checkout | Auto carousels, hover-only product info |
| Architecture/interiors | Editorial portfolio conversion | High | Low–medium | Projects, services, process, inquiry | Fake projects, hidden work navigation |
| Art/photography/fashion | Image-led authorship/commerce | High | Medium | Work/gallery/product detail, artist/brand context | Weak imagery behind elaborate effects |
| Creative agency | Portfolio and capability narrative | High | Medium–high | Work, outcomes, services, contact | Effects that block work discovery |
| Corporate/nonprofit | Reputation and evidence hub | Medium | Low | Governance/impact/proof/contact | Unsubstantiated impact claims |
| Local business | Local action page | Low–medium | Low | Location/hours/contact/services | Fake local details, immersive complexity |

---

# C. Brand Personality Matrix

| Personality | Visual direction | Color | Typography | Layout | Interaction cap | Avoid |
|---|---|---|---|---|---:|---|
| Authoritative | Restrained, structured, proof-led | Limited high-contrast palette | Clear sans / restrained serif | Structured grid | Low | Gimmicks, glow overload |
| Warm/human | Inclusive, approachable | Warm neutral + accessible accent | Humanist sans / friendly serif | Comfortable sections | Low–medium | Cold abstract-only experience |
| Premium | Material, editorial, sparse | Deep/muted material colors | Refined display + readable body | Editorial/full-bleed with bounds | Low–medium | Cheap stock, many effects |
| Technical | Precise, modular, diagram-led | Neutral base + functional accent | Sans + limited mono accent | Grid/system layouts | Medium | Meaningless abstraction |
| Playful | Friendly, expressive | Vibrant, controlled | Character display + clean body | Modular | Medium | Playfulness in high-risk tasks |
| Energetic | Action-led, bold | Saturated accents | Bold/condensed display + clear body | Dynamic grids | Medium | Motion masking practical data |
| Editorial | Content-led, composed | Restrained/art-derived | Strong hierarchy | Reading rails/asymmetry | Low–medium | Card overload |
| Futuristic | Controlled depth and technology | Tested gradients/glow | Modern sans | Structured with one signature motif | Medium | Generic neon/WebGL filler |

---

# D. Interaction Selection Matrix

| Interaction | UX value requirement | Best contexts | Mobile mode | Reduced-motion mode | Default implementation | Fallback |
|---|---|---|---|---|---|---|
| Hover transform | Affordance feedback | Cards/nav/media preview | Tap/visible state | Static | CSS | Border/elevation |
| Tilt card | Playful featured emphasis | Portfolio/campaign | Flat | Flat | CSS transform | Static card |
| Magnetic button | Optional invitation | Creative CTA | Standard button | Standard button | CSS/Motion | Hover/press |
| Cursor follower | Decorative atmosphere | Portfolio/campaign | Off | Off | Pointer/CSS | Standard hover |
| Accordion | Reduce secondary density | FAQ/specs | Same | Same | Native details/button | Visible sections |
| Tabs | Mutually exclusive short views | Modes/platforms | Segmented/stacked | Same | Accessible tabs | Sections |
| Gallery | Visual inspection | Product/work/property | Swipe+buttons | Same without transitions | Semantic gallery | Grid |
| Before/after | Genuine visual comparison | Transformation proof | Toggle+buttons | Side-by-side | Range input | Pair |
| Timeline | Sequence comprehension | Process/history | Vertical | Static | Ordered list/CSS | List |
| Map | Geographic task | Locations/routes | List-first | Same | Lazy map/SVG | Address/link |
| 3D configurator | Spatial configuration value | Product hardware | On demand | Static render | R3F | Gallery |

---

# E. Motion Selection Matrix

| Motion type | Purpose required | Cost | Select if | Do not select if | Tool | Fallback |
|---|---|---:|---|---|---|---|
| Microinteraction | Feedback/state | Low | Every real control state | It delays response | CSS/WAAPI/Motion | Immediate static state |
| Entrance reveal | Attention sequencing | Low–medium | One or two meaningful sections | Every element animates | CSS/Motion | Static visible content |
| Scroll timeline | Process/story | Medium | Narrative maps to progress | Transaction/reading critical | CSS scroll timeline | Vertical stages |
| GSAP choreography | Complex sequence | Medium–high | High-value campaign/case study | CSS/Motion works | GSAP | Static/CSS sticky |
| Parallax | Depth/atmosphere | Medium | Image-rich emotional story | High-trust/mobile heavy | CSS/GSAP | Static composition |
| Kinetic type | Short emotional phrase | Medium | Campaign/music/sports | Body/legal/technical text | CSS/Motion | Static type |
| Morph | Transformation metaphor | Medium | Brand/process relationship | Decorative blob filler | SVG/Motion | Static/fade |
| WebGL motion | Spatial interaction | High | Product/experience needs it | Decorative hero | R3F/Three | Image/video |

---

# F. Responsive Adaptation Rules

## F.1 Responsive breakpoint posture

```yaml
responsive_ranges:
  compact: "< 600 CSS px"
  medium: "600–839 CSS px"
  expanded: "840–1199 CSS px"
  large: "1200–1599 CSS px"
  extra_large: ">= 1600 CSS px"
rule: "Use these as starting ranges; introduce component breakpoints when content fails, not merely because a device label changes."
source: https://m3.material.io/foundations/layout/breakpoints
```

## F.2 Transformation table

| Element | Wide + fine pointer | Medium | Compact + coarse pointer | Reduced motion / low capability |
|---|---|---|---|---|
| 3D card | Hover tilt | Reduced tilt | Flat card | Flat card |
| Card stack | Sticky layered story | Reduced stack | Vertical steps | Static sequence |
| Cube | Controlled rotate/click | Click faces | Tabs/cards | Static list |
| Cursor effect | Optional | Off | Off | Off |
| Magnetic CTA | Optional | Standard | Standard | Standard |
| Parallax | 1–2 layers | One subtle layer | Static image | Static image |
| Scroll story | Sticky/scroll timeline | Discrete stages | Vertical sequence | Static sequence |
| Gallery | Thumbnails/zoom | Swipe/arrows | Swipe/buttons | Static grid/list |
| WebGL | Full scene | Quality reduced | On demand/static | Static fallback |
| Video background | Loop + poster | Reduced loop | Poster/click play | Poster only |
| Data chart | Interactive with table | Simplified chart | Summary + table | Table/text |

## F.3 Mandatory responsive tests

```yaml
must_test:
  - 320_CSS_px_width
  - 400_percent_browser_zoom
  - compact_medium_expanded_large_extra_large_ranges
  - portrait_and_landscape
  - narrow_desktop_split_window
  - coarse_pointer_and_no_hover
  - fine_pointer_and_hover
  - reduced_motion
  - safe_area_insets
  - software_keyboard_visible
  - slow_network_and_delayed_js
  - large_text_and_text_spacing
```

---

# G. Accessibility Rules

```yaml
accessibility_baseline:
  standard: WCAG_2_2_AA
  required:
    - semantic_landmarks
    - logical_heading_hierarchy
    - keyboard_access_for_all_controls
    - visible_focus
    - focus_not_obscured
    - contrast_compliance
    - reflow_at_320_css_px
    - alternatives_for_drag_hover_motion_canvas
    - reduced_motion_support
    - labelled_forms_and_errors
    - useful_alt_text
    - target_size_and_spacing
```

## G.1 Hard-failure rules

```yaml
block_production_if:
  - "Primary task requires mouse, hover, drag, device motion, or WebGL."
  - "Focus is invisible or completely hidden by sticky/fixed UI."
  - "Critical text, CTA, or form state fails contrast."
  - "Core content/functionality is lost at 320 CSS px or 400% zoom."
  - "Meaningful image/video/canvas lacks alternative."
  - "Nonessential interaction motion cannot be reduced or disabled."
  - "Form labels, errors, or success states are inaccessible."
```

---

# H. Performance Rules

```yaml
performance_targets:
  core_web_vitals_p75:
    LCP: "<= 2.5s"
    INP: "<= 200ms"
    CLS: "<= 0.1"
  premium_targets:
    LCP: "<= 2.0s"
    INP: "<= 150ms"
    CLS: "<= 0.05"
```

## H.1 Default route budgets

| Archetype | Initial route JS target | Heavy visual policy |
|---|---:|---|
| Regulated / local service | <= 150 KB gzipped route JS | No decorative WebGL/video |
| B2B SaaS | <= 200 KB | Product demo deferred |
| Ecommerce | <= 200 KB | Gallery optimized; 3D on demand |
| Corporate/education/nonprofit | <= 250 KB | Storytelling deferred |
| Premium travel/fashion | <= 300 KB | Media optimized with poster/art direction |
| Creative portfolio/campaign | <= 400 KB | One major signature enhancement only |

## H.2 Hard performance controls

```yaml
require:
  - image_dimensions_or_aspect_ratio
  - responsive_image_source_selection
  - defer_noncritical_JS
  - lazy_load_maps_webgl_lottie_large_gallery
  - avoid_global_animation_imports
  - measure_field_or_representative_lab_data

remove_or_defer_when:
  - "Effect causes LCP, INP, or CLS regression beyond budget."
  - "Effect causes mobile scroll/input jank."
  - "Effect has no documented UX or brand purpose."
```

---

# I. SEO Rules

```yaml
seo_baseline:
  require:
    - server_rendered_HTML_for_public_content
    - unique_title_and_description
    - one_clear_H1
    - semantic_headings
    - internal_links
    - accurate_canonical_when_needed
    - Open_Graph_metadata
    - verified_structured_data_only
    - descriptive_image_alternatives

avoid:
  - client_only_primary_content
  - canvas_only_text
  - duplicate_thin_pages
  - fabricated_schema
  - metadata_reused_across_pages
```

## I.1 Content architecture by intent

| Condition | Generate |
|---|---|
| Local service | Location/service-area pages, verified contact, LocalBusiness schema only when verified |
| SaaS/AI | Solution, use-case, integration, comparison, resource/documentation pages |
| Ecommerce | Category/product pages, product schema only from verified product data |
| Professional service | Service, industry, process, FAQ, insight/case-study pages |
| Education | Program, admissions, faculty/outcome, resource/event pages |
| Editorial/media | Topic hubs, author/date/source metadata, article routes |

---

# J. Content and Asset Rules

## J.1 Content confidence model

```yaml
confidence_levels:
  verified:
    public: render_normally
    source: approved_customer_data_or_verified_connector
  customer_supplied_incomplete:
    public: literal_or_conservative_paraphrase_only
    source: customer_input
  ai_draft:
    public: approval_required
    editor_label: "AI draft — verify"
  neutral_placeholder:
    public: allowed_only_if_nonfactual_and_non_deceptive
    editor_label: "Asset needed"
  verification_required:
    public: hidden
    editor_label: "Verification required — publication blocked"
```

## J.2 Asset replacement policy

| Missing item | Public replacement | Publicly hide? | Ask customer? |
|---|---|---:|---:|
| Official logo | Verified name wordmark / provisional monogram | No | Yes |
| Brand colors | Accessible neutral token system | No | Yes |
| Decorative hero image | CSS/SVG/typography visual | No | Yes |
| Product images | No product purchase publishing | Yes | Yes, critical |
| Team photographs | Process/approach section | Yes | Yes |
| Testimonials | Process/proof only if verified | Yes | Yes |
| Client logos | Omit | Yes | Yes |
| Awards | Omit | Yes | Yes |
| Statistics | Omit | Yes | Yes |
| Address/phone/email | Omit CTA/route until verified | Yes | Yes, critical |
| Social links | Omit icons | Yes | Yes |
| Pricing | Approved enquiry route only | Usually | Yes |
| Services | Use supplied names only | Unsupported cards yes | Yes |
| Portfolio/case studies | Capability/process section | Yes | Yes |
| Certifications/reviews | Omit | Yes | Yes |

---

# K. Design Quality Scoring Model

## K.1 Criteria and weights

| Criterion | Weight | Production minimum | World-class minimum |
|---|---:|---:|---:|
| Brand differentiation | 4 | 5 | 8 |
| Visual hierarchy | 6 | 6 | 8 |
| Composition | 4 | 5 | 8 |
| Typography | 5 | 6 | 8 |
| Color | 4 | 6 | 8 |
| Spacing | 4 | 6 | 8 |
| Grid consistency | 3 | 5 | 7 |
| Content hierarchy | 6 | 6 | 8 |
| Navigation | 6 | 7 | 8 |
| CTA hierarchy | 5 | 6 | 8 |
| Interaction design | 5 | 6 | 8 |
| Motion | 3 | 5 | 8 |
| Imagery | 4 | 5 | 8 |
| Responsive behavior | 7 | 7 | 8 |
| Accessibility | 10 | 8 | 9 |
| Performance | 9 | 7 | 8 |
| SEO | 6 | 6 | 8 |
| Trust | 6 | 6 | 8 |
| Conversion | 6 | 6 | 8 |
| Content quality | 6 | 6 | 8 |
| Technical implementation | 7 | 7 | 8 |
| Consistency | 5 | 6 | 8 |
| Emotional impact | 3 | 4 | 8 |
| Memorability | 3 | 4 | 8 |
| Mobile experience | 8 | 7 | 8 |

## K.2 Formula

\[
\text{Quality Score} = \frac{\sum (criterionScore \times criterionWeight)}{\sum criterionWeight}
\]

## K.3 Classification

```yaml
classification:
  technically_working:
    required: [build, typecheck, lint, primary_routes]
  production_ready:
    required:
      - all_hard_gates_pass
      - weighted_score_gte_75
      - no_core_score_below_6
  professionally_designed:
    required:
      - production_ready
      - weighted_score_gte_82
      - accessibility_gte_8
      - responsive_gte_7
      - performance_gte_7
      - no_score_below_6
  world_class:
    required:
      - professionally_designed
      - weighted_score_gte_90
      - accessibility_gte_9
      - responsive_gte_8
      - mobile_gte_8
      - performance_gte_8
      - brand_differentiation_gte_8
      - emotional_impact_gte_8
      - memorability_gte_8
      - no_score_below_7
      - human_design_review_approved
```

---

# L. Production Readiness Checklist

## L.1 Technical gate

```yaml
technical:
  - build_passes
  - typecheck_passes
  - lint_passes
  - no_blocking_console_errors
  - primary_routes_work
  - loading_error_not_found_states_exist
  - no_exposed_secrets
```

## L.2 Accessibility gate

```yaml
accessibility:
  - no_blocking_WCAG_2_2_AA_issues
  - keyboard_primary_task_complete
  - focus_visible_and_not_obscured
  - contrast_passes
  - reflow_320_css_px
  - reduced_motion_passes
  - target_sizes_pass
  - forms_labeled_and_recoverable
  - media_canvas_alternatives_exist
```

## L.3 Responsive gate

```yaml
responsive:
  - compact_medium_expanded_large_extra_large_pass
  - no_unintended_horizontal_overflow
  - split_window_pass
  - portrait_landscape_pass
  - hover_fallback_pass
  - safe_area_pass
  - keyboard_visible_pass
  - complex_effect_fallback_pass
```

## L.4 Performance gate

```yaml
performance:
  - LCP_INP_CLS_budget_pass
  - hero_media_optimized
  - images_have_dimensions_and_sizes
  - below_fold_media_deferred
  - heavy_modules_dynamic_imported
  - no_unjustified_initial_WebGL
  - no_animation_jank_on_target_mobile
```

## L.5 Content integrity gate

```yaml
content:
  - proposition_clear
  - audience_clear
  - primary_CTA_functional
  - all_claims_verified_or_approved
  - no_fabricated_testimonials_reviews_logos_awards_stats_certifications
  - no_placeholder_content_publicly_misleading
  - contact_route_verified_when_contact_CTA_exists
  - required_legal_policy_information_present
```

## L.6 Design quality gate

```yaml
design:
  - design_tokens_consistent
  - typography_color_spacing_grid_consistent
  - primary_hierarchy_clear
  - visual_effects_have_documented_purpose
  - no_duplicate_competing_signature_effects
  - image_strategy_matches_asset_quality
  - interaction_strategy_matches_input_capabilities
  - quality_score_meets_target
```

---

# 5. JSON Configuration Shape

```json
{
  "archetype": "credibility_led_product_narrative",
  "visualExpression": "medium",
  "designPersonality": ["technical", "credible", "calm"],
  "layout": {
    "system": "structured_modular_grid",
    "container": "wide_bounded",
    "readingRail": "72ch",
    "fullBleedMedia": false
  },
  "hero": {
    "pattern": "split_copy_product_proof",
    "primaryCta": "book_demo",
    "secondaryCta": "view_product",
    "media": "verified_product_screenshot"
  },
  "interactions": {
    "level": "low_to_medium",
    "selected": ["micro_interactions", "interactive_product_demo"],
    "rejected": ["cursor_follower", "decorative_webgl"]
  },
  "motion": {
    "policy": "purposeful_and_reduced_motion_safe",
    "implementation": "motion_lazy",
    "scrollStory": "static_fallback_required"
  },
  "responsive": {
    "strategy": "container_first",
    "compactMode": "single_column_priority_flow",
    "coarsePointerMode": "no_hover_dependency"
  },
  "accessibility": {
    "target": "WCAG_2_2_AA",
    "hardGates": ["keyboard", "focus", "contrast", "reflow", "reduced_motion"]
  },
  "performance": {
    "webVitals": { "lcp": 2.5, "inp": 200, "cls": 0.1 },
    "lazyModules": ["webgl", "maps", "large_gallery"]
  },
  "content": {
    "confidencePolicy": "verified_first",
    "hideUnverifiedProof": true
  }
}
```

---

# 6. System Prompt Kernel

```text
You are a Website Design Decision Agent.

Your task is to convert verified business information into an explainable website design configuration. You must optimize for user task completion, clarity, trust, accessibility, responsive behavior, performance, SEO, and purposeful brand differentiation.

Do not select an effect because it is visually fashionable. Every selected layout, visual treatment, interaction, animation, gallery, or 3D feature must have a documented user problem, communication problem, business-fit rationale, fallback, responsive behavior, accessibility behavior, and performance impact.

Never fabricate testimonials, reviews, client relationships, logos, awards, certifications, statistics, addresses, contact data, case studies, team members, pricing, or claims. Hide unverified factual sections or replace them with neutral non-factual structure.

Use semantic HTML and server-rendered content as the base experience. Treat animation, WebGL, custom cursor, 3D, and advanced scroll effects as optional progressive enhancement.

Apply hard gates for WCAG 2.2 AA, Core Web Vitals, mobile/touch equivalence, reduced motion, content integrity, and conversion-path validity. A successful build is only technically working, not production-ready.

Output a DesignDecisionOutput object with decision records showing applied rule IDs, rationale, sources, confidence, fallbacks, and approval requirements.
```

---

# 7. Source Registry

- [Awwwards Evaluation System](https://www.awwwards.com/about-evaluation/)
- [CSS Design Awards About](https://www.cssdesignawards.com/about)
- [CSS Design Awards Gallery](https://www.cssdesignawards.com/website-gallery)
- [Awwwards Sites of the Year](https://www.awwwards.com/websites/sites_of_the_year/)
- [SiteInspire](https://www.siteinspire.com/)
- [SiteInspire Architecture Portfolio](https://www.siteinspire.com/websites/categories/architecture/portfolio)
- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [W3C WCAG Techniques](https://www.w3.org/WAI/WCAG22/Techniques/)
- [W3C Images Tutorial](https://www.w3.org/WAI/tutorials/images/)
- [W3C Decorative Images](https://www.w3.org/WAI/tutorials/images/decorative/)
- [MDN Container Queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_queries)
- [MDN Scroll-Driven Animations](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations)
- [MDN Canvas](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/canvas)
- [MDN CSS env()](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env)
- [Web.dev Responsive Web Design Basics](https://web.dev/articles/responsive-web-design-basics)
- [Web.dev Container Queries](https://web.dev/learn/css/container-queries)
- [Web.dev Responsive Images](https://web.dev/learn/design/responsive-images)
- [Web.dev Art Direction](https://web.dev/articles/codelab-art-direction)
- [Web.dev Web Vitals](https://web.dev/articles/vitals)
- [Web.dev Animation Performance](https://web.dev/articles/animations-and-performance)
- [Web.dev Optimize CLS](https://web.dev/articles/optimize-cls)
- [Web.dev Embed Best Practices](https://web.dev/articles/embed-best-practices)
- [Material Design 3 Adaptive Layout](https://m3.material.io/foundations/adaptive-design/overview)
- [Material Design 3 Breakpoints](https://m3.material.io/foundations/layout/breakpoints)
- [Material Design States](https://m3.material.io/foundations/interaction/states)
- [Material Design Motion](https://m2.material.io/design/motion/understanding-motion.html)
- [Apple HIG Layout](https://developer.apple.com/design/human-interface-guidelines/layout)
- [Apple HIG Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
- [Apple HIG Inclusion](https://developer.apple.com/design/human-interface-guidelines/inclusion)
- [Next.js Image Component](https://nextjs.org/docs/app/api-reference/components/image)
- [Next.js Lazy Loading](https://nextjs.org/docs/app/guides/lazy-loading)
- [Next.js Production Checklist](https://nextjs.org/docs/app/guides/production-checklist)
- [Next.js Metadata](https://nextjs.org/docs/app/getting-started/metadata-and-og-images)
- [Motion Bundle Reduction](https://motion.dev/docs/react-reduce-bundle-size)
- [Motion Accessibility](https://motion.dev/docs/react-accessibility)
- [GSAP ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/)
- [GSAP Accessibility](https://gsap.com/resources/a11y/)
- [React Three Fiber Performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance)
- [React Three Fiber Pitfalls](https://r3f.docs.pmnd.rs/advanced/pitfalls)
- [Baymard Ecommerce UX](https://baymard.com/learn/ecommerce-ux-best-practices)
- [Baymard Product Page UX](https://baymard.com/blog/current-state-ecommerce-product-page-ux)
- [Baymard Checkout UX](https://baymard.com/blog/current-state-of-checkout-ux)
- [Atlassian Empty State Guidance](https://atlassian.design/content/writing-guidelines/empty-state/)
- [Shopify Polaris Empty State](https://shopify.dev/docs/api/pos-ui-extensions/latest/polaris-web-components/layout-and-structure/empty-state)

---

## Final directive

A website generated under this specification is successful only when it is:

1. **Truthful** about the business and its evidence.
2. **Useful** for the visitor’s primary task.
3. **Accessible** across input modes, motion preferences, and assistive technology.
4. **Responsive** across available space and capability, not merely device labels.
5. **Fast** under real-world network/device conditions.
6. **Maintainable** as a design and technical system.
7. **Distinctive** because it is appropriate to the business—not because it has accumulated effects.
