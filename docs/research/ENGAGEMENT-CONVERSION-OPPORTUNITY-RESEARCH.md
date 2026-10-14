# Engagement & Conversion Opportunity Research

**Document:** `ENGAGEMENT-CONVERSION-OPPORTUNITY-RESEARCH.md`\
**Purpose:** Research-derived specification for deciding whether a
website should include an interactive engagement or conversion
experience, what type it should use, and when the correct decision is to
use no interactive experience.

------------------------------------------------------------------------

## 1. Executive Principle

Interactive experiences are valuable only when they help a visitor
accomplish a meaningful task, understand an offering, make a decision,
or take a useful next step better than static content or a conventional
form.

Therefore:

> **Interaction is not a default website feature. It is a governed
> design decision.**

The framework must be capable of deciding:

-   `NO_EXPERIENCE`
-   `PRIMARY_EXPERIENCE`
-   `COMPLEMENTARY_EXPERIENCES`

Games are one possible category of interaction, not the default
definition of engagement.

The central question is:

> **What interactive experience, if any, creates the highest expected
> business value for this visitor and this business?**

The system must also be able to conclude that adding interaction would
reduce clarity, conversion, accessibility, performance, trust, or task
completion.

------------------------------------------------------------------------

# 2. Research Conclusions

## 2.1 Start with the business outcome

An interactive experience should have an explicit business or user
outcome before it is selected.

Possible outcomes include:

1.  Meaningful engagement
2.  Qualified engagement
3.  Lead generation
4.  Lead quality improvement
5.  Conversion
6.  Purchase confidence
7.  Product/service discovery
8.  Retention
9.  First-party insight
10. Sales efficiency

Time on page, clicks, scroll depth, animation interaction, and other
vanity engagement measures are not sufficient on their own.

A successful interaction should connect to a meaningful user task or
measurable business outcome.

------------------------------------------------------------------------

## 2.2 Static-solution test

Before selecting an interactive experience, the framework should ask:

> **Can the visitor accomplish the same important task more clearly and
> efficiently with static content, a normal link, a conventional form,
> or another simpler mechanism?**

If yes, the static solution should normally be preferred.

Interaction should earn its complexity.

------------------------------------------------------------------------

## 2.3 Games have a higher threshold

Games and gamification can create engagement, but they have a
substantially higher justification threshold than task-oriented
interactive tools.

A game is appropriate when play itself has meaningful value, for
example:

-   repeated learning or practice
-   habit formation around a legitimate task
-   motivation for repetitive activity
-   community or loyalty experiences where rewards do not distort
    behavior
-   meaningful brand education
-   training or skills development
-   fitness or youth education where play supports the underlying task

A decorative game added merely to increase time-on-site is not
sufficient justification.

------------------------------------------------------------------------

# 3. Engagement Opportunity Taxonomy

The framework should treat the following as distinct opportunity
categories.

### Decision-support interactions

-   Calculator
-   ROI calculator
-   Price estimator
-   Savings calculator
-   Assessment
-   Eligibility checker
-   Finder
-   Guided selector
-   Recommendation engine
-   Comparison tool
-   Planner
-   Simulator
-   Configurator

### Information / discovery interactions

-   Interactive chart
-   Interactive storytelling
-   Guided journey
-   Product/service explorer
-   Interactive demo
-   Result/recommendation experience

### Conversion interactions

-   Booking
-   Progressive form
-   Progressive profile
-   Lead qualification
-   Contact workflow
-   Survey/poll where it serves a legitimate business purpose

### Utility interactions

-   Checklist
-   Readiness checker
-   Estimator
-   Planning tool
-   Utility/calculation tool

### Engagement / retention interactions

-   Challenge
-   Habit support
-   Progress indicators
-   Milestones
-   Badges
-   Streaks
-   Leaderboards where appropriate

### Higher-complexity experiences

-   AI personalization
-   3D
-   WebGL
-   AR
-   Simulations
-   Games
-   Serious games

The registry must not imply that every category is appropriate for every
industry.

------------------------------------------------------------------------

# 4. Required Decision Inputs

The Engagement & Conversion Opportunity Engine should consume structured
context rather than operate only from industry.

## 4.1 BusinessInput

``` ts
interface BusinessInput {
  businessName: string;
  industry: string;
  businessModel?: string;
  offeringType?: string;
  revenueModel?: string;
  geography?: string[];
  regulatoryContext?: string[];
  primaryConversionActions: string[];
  salesMotion?: string;
  customerLifetimeValueBand?: string;
}
```

------------------------------------------------------------------------

## 4.2 AudienceContext

``` ts
interface AudienceContext {
  segments: Array<{
    name: string;
    expertise?: string;
    intent?: string;
    deviceProfile?: string;
    accessibilityConsiderations?: string[];
    trustSensitivity?: string;
  }>;
}
```

Important audience factors include:

-   expertise
-   intent
-   device characteristics
-   accessibility needs
-   trust sensitivity
-   urgency
-   purchase stage

------------------------------------------------------------------------

## 4.3 ObjectiveContext

``` ts
interface ObjectiveContext {
  primaryObjective: string;
  secondaryObjectives?: string[];
  targetMetrics?: string[];
  baselineMetrics?: Record<string, number>;
}
```

The same business can legitimately receive different engagement
recommendations when its objective changes.

For example:

-   awareness
-   education
-   lead generation
-   qualification
-   product discovery
-   booking
-   purchase
-   retention

must not automatically produce the same experience.

------------------------------------------------------------------------

## 4.4 JourneyContext

``` ts
interface JourneyContext {
  stages?: string[];
  primaryVisitorTasks?: string[];
  knownFrictionPoints?: string[];
  pagesAndIntents?: Array<{
    pageType: string;
    intent: string;
    primaryCTA?: string;
  }>;
}
```

The engine should identify where an interaction belongs in the visitor
journey rather than adding it indiscriminately to the hero or every
page.

------------------------------------------------------------------------

## 4.5 ContentInventory

``` ts
interface ContentInventory {
  approvedClaims?: unknown[];
  pricingDataStatus?: string;
  productDataStatus?: string;
  caseStudies?: unknown[];
  educationalContent?: unknown[];
  decisionRules?: unknown[];
  formulas?: unknown[];
  dataSources?: unknown[];
}
```

Interactive experiences must not invent formulas, pricing, product
facts, recommendations, eligibility rules, statistics, or other business
facts.

------------------------------------------------------------------------

## 4.6 TrustRiskContext

``` ts
interface TrustRiskContext {
  regulatedDomain?: boolean;
  sensitiveDataCategories?: string[];
  privacyRequirements?: string[];
  requiredApprovals?: string[];
  brandTrustSensitivity?: string;
}
```

The stricter interpretation should govern where trust, regulation,
privacy, or compliance risks are material.

------------------------------------------------------------------------

## 4.7 TechnicalConstraints

``` ts
interface TechnicalConstraints {
  platform?: string;
  renderingStrategy?: string;
  performanceBudget?: unknown;
  accessibilityTarget?: string;
  analyticsStack?: string;
  crmIntegration?: string;
  featureFlagsAvailable?: boolean;
}
```

------------------------------------------------------------------------

## 4.8 AnalyticsCapability

``` ts
interface AnalyticsCapability {
  eventTracking?: boolean;
  experimentCapability?: boolean;
  crmAttribution?: boolean;
  consentManagement?: boolean;
  realUserMonitoring?: boolean;
}
```

An interaction should not be justified by metrics that the business
cannot meaningfully observe or act upon when measurement is necessary to
the proposed outcome.

------------------------------------------------------------------------

# 5. Hard Gates

Hard gates are applied before weighted scoring.

A hard-gate failure must be able to produce:

-   `NO_EXPERIENCE`, or
-   a safer/static/simple alternative.

The framework must record the reason.

Examples of hard-gate failures include:

-   no legitimate user task
-   no meaningful business outcome
-   static content clearly performs the task better
-   required data is unavailable or unverified
-   required formula or decision rule is unavailable
-   required business capability cannot respond to the resulting
    lead/action
-   material accessibility failure
-   material performance risk
-   material privacy or compliance risk
-   no safe equivalent path
-   interaction would obstruct a critical conversion
-   game trivializes a serious decision

Hard gates take precedence over the numeric score.

------------------------------------------------------------------------

# 6. Engagement Opportunity Scoring Model

The following weighted scoring model is the research-defined starting
model.

Positive dimensions:

  Dimension                          Weight
  -------------------------------- --------
  Visitor value                         +15
  Task relevance / intent fit           +12
  Conversion / outcome potential        +10
  Qualification value                    +7
  Personalization                        +5
  Differentiation                        +4
  Content readiness                      +8
  Data readiness                         +8
  Expected usage frequency               +4
  Implementation feasibility             +5

Risk/cost dimensions:

  Dimension                   Weight
  ------------------------- --------
  Performance cost                -4
  Accessibility risk              -5
  SEO risk                        -3
  Trust / compliance risk         -8
  Maintenance burden              -4

The maximum conceptual positive score is normalized to a 0--100 decision
score.

The engine should preserve the individual dimension scores and rationale
rather than returning only a total.

------------------------------------------------------------------------

# 7. Score Thresholds

## 0--44 --- NO_EXPERIENCE

Do not add an interactive experience.

Prefer:

-   static content
-   clear CTA
-   normal navigation
-   conventional form
-   useful proof/content
-   simple decision-support content

This is a valid and successful framework outcome.

------------------------------------------------------------------------

## 45--59 --- LIGHTWEIGHT PROGRESSIVE ENHANCEMENT

Interaction may be added only after baseline UX is complete.

Requirements:

-   static equivalent remains usable
-   progressive enhancement
-   no dependency on JavaScript for essential content
-   low performance cost
-   low cognitive burden
-   accessibility equivalent
-   clear relationship to the task

------------------------------------------------------------------------

## 60--74 --- FOCUSED PRIMARY INTERACTION

A focused interactive experience is a strong candidate.

It should have:

-   clear visitor task
-   clear business outcome
-   appropriate placement
-   meaningful result/action
-   accessible fallback
-   measured performance
-   appropriate analytics

------------------------------------------------------------------------

## 75--84 --- STRONG CANDIDATE

The interaction is strongly justified.

A related post-result action should normally be considered, such as:

``` text
calculator
    ↓
result
    ↓
save / enquire / book / compare / continue
```

The post-result action must be logically connected to the result.

------------------------------------------------------------------------

## 85--100 --- HIGH-CONFIDENCE STRATEGIC EXPERIENCE

A high-confidence strategic experience can become a central part of the
page/journey.

Multiple complementary experiences may be considered when:

-   each serves a distinct visitor job
-   they share data where appropriate
-   users are not forced to repeat questions
-   CTAs do not compete
-   the sequence is logical
-   cognitive cost remains acceptable
-   technical cost remains within budget

------------------------------------------------------------------------

# 8. Multiple Experience Policy

Multiple experiences are allowed only when they serve genuinely
different jobs.

### Good example

``` text
SaaS website

ROI calculator
      ↓
personalized result
      ↓
saved report
      ↓
booking/demo
```

The experiences form one coherent journey.

### Poor example

``` text
Hero quiz
+
price estimator
+
chatbot
+
exit survey
+
spin-to-win
```

This creates interaction overload and competing CTAs.

The framework must therefore optimize for **useful interaction**, not
the number of interactive components.

------------------------------------------------------------------------

# 9. NO_EXPERIENCE Criteria

The engine should strongly prefer no interactive experience when:

-   the visitor has a simple task
-   a static solution is clearer
-   the problem is not sufficiently understood
-   interaction is justified only by "modern", "engaging", or "reduce
    bounce" reasoning
-   there is no approved data
-   sensitive data must be collected before the visitor receives value
-   the audience is likely to have low bandwidth or older devices and no
    equivalent simple path exists
-   accessibility would materially suffer
-   the interaction would distract from a high-intent purchase, booking,
    donation, emergency, or support action
-   content changes faster than the business can maintain the experience
-   analytics cannot establish a meaningful outcome
-   the business cannot respond to resulting
    leads/bookings/personalization
-   performance, accessibility, SEO, privacy, or compliance risk is
    material
-   a game would trivialize a serious decision

------------------------------------------------------------------------

# 10. Games and Gamification Policy

Games and gamification require special treatment.

## 10.1 Gamification threshold

Gamification should require:

-   minimum score: **75**
-   all hard gates passed
-   documented user value
-   documented business/learning outcome
-   optional participation
-   accessible alternative
-   pause/exit capability where applicable
-   no time-critical dependency
-   no manipulative reward mechanics

## 10.2 Standalone games

A standalone game should require:

-   minimum score: **85**
-   all hard gates passed
-   a documented causal path to a business, learning, training, or
    retention outcome

A standalone game should not be selected simply because it is
entertaining.

------------------------------------------------------------------------

# 11. Gamification Pattern Guidance

### Progress indicators

Appropriate for meaningful multi-step tasks.

Example:

``` text
Step 2 of 4
```

Avoid progress indicators that exist only to create artificial
completion pressure.

### Milestones and badges

Appropriate when they represent genuine achievement.

### Streaks

Can be appropriate when:

-   participation is voluntary
-   the behavior is genuinely useful
-   breaking a streak does not create harmful pressure

### Leaderboards

Use only when:

-   competition is genuinely useful
-   participation is consensual
-   ranking is fair
-   privacy implications are considered
-   a non-competitive alternative exists where appropriate

### Spin-to-win

High caution.

Generally unsuitable for:

-   high-trust professional services
-   finance
-   health
-   luxury
-   urgent decisions
-   serious B2B contexts

It should rarely be selected.

------------------------------------------------------------------------

# 12. Pattern-Specific Requirements

## Comparison

Must support:

-   semantic table/cards
-   mobile stacked representation
-   accessible row/column relationships
-   meaningful comparison criteria

------------------------------------------------------------------------

## Configurator

Must support:

-   keyboard controls
-   non-drag alternatives
-   accessible state changes
-   clear reset capability

------------------------------------------------------------------------

## Result / Recommendation

The result should not be hidden behind an unnecessary lead gate.

Recommendations should explain the basis of the recommendation.

------------------------------------------------------------------------

## Interactive Chart

Must provide:

-   underlying data
-   table or equivalent accessible representation
-   non-color encoding
-   usable keyboard/screen-reader access where applicable

------------------------------------------------------------------------

## Simulator

Must expose:

-   inputs
-   assumptions
-   relevant limitations
-   uncertainty where material
-   meaningful result interpretation

------------------------------------------------------------------------

## Demo

Must support:

-   keyboard access
-   reset
-   exit
-   safe handling of data
-   clear boundaries between demo behavior and real functionality

------------------------------------------------------------------------

## Booking

Must support:

-   accessible date/time selection
-   timezone clarity
-   confirmation
-   usable mobile interaction
-   error/recovery paths

------------------------------------------------------------------------

## Progressive Form

Should:

-   request minimal information
-   explain why information is needed when relevant
-   provide review/correction
-   preserve accessibility
-   avoid unnecessary gating
-   maintain a usable fallback

------------------------------------------------------------------------

## Gamification

Must be:

-   optional
-   pauseable where relevant
-   non-time-critical
-   accessible
-   non-manipulative
-   supported by a meaningful non-game path

------------------------------------------------------------------------

## 3D / AR / WebGL

Must provide:

-   static alternative view
-   text specifications where applicable
-   non-WebGL fallback
-   accessible equivalent
-   performance isolation

Essential content must never depend exclusively on WebGL/canvas.

------------------------------------------------------------------------

# 13. Decision Output

The engine should produce a structured decision.

Example:

``` ts
interface EngagementOpportunityDecision {
  engagementRecommended: boolean;

  decision:
    | "NO_EXPERIENCE"
    | "PRIMARY_EXPERIENCE"
    | "COMPLEMENTARY_EXPERIENCES";

  confidence: number;

  primaryOpportunity?: unknown;
  secondaryOpportunities?: unknown[];
  rejectedOpportunities?: unknown[];

  rationale: string;

  targetAudience?: string[];
  targetBusinessObjective?: string;
  funnelStage?: string;
  placement?: string;

  expectedUserValue?: string;
  conversionAction?: string;
  leadCaptureStrategy?: string;

  hardGateResults?: unknown[];
  scoringBreakdown?: Record<string, number>;
  staticAlternativeAssessment?: unknown;

  accessibilityAssessment?: unknown;
  performanceAssessment?: unknown;
  seoAssessment?: unknown;
  trustAssessment?: unknown;

  approvalRequired?: boolean;
  decisionRecord?: unknown;
}
```

The actual project types may differ, but the conceptual contract must
remain.

------------------------------------------------------------------------

# 14. Decision Record

Every selected or rejected opportunity should be explainable.

At minimum record:

-   candidate
-   business fact
-   visitor/user problem
-   business rationale
-   evidence
-   score
-   hard-gate results
-   rejected alternatives
-   risks
-   fallback
-   placement
-   responsive behavior
-   accessibility behavior
-   performance impact
-   SEO impact
-   trust/compliance impact
-   confidence
-   approval requirement

The framework should preserve rejected candidates rather than losing
them.

This makes the decision auditable and enables later learning.

------------------------------------------------------------------------

# 15. Provenance and Evidence

The framework must distinguish evidence levels.

Recommended evidence hierarchy:

### Tier A --- Primary / authoritative

Examples:

-   official standards
-   official platform documentation
-   primary research
-   regulatory/standards bodies

### Tier B --- Established independent research

Independent usability, UX, accessibility, behavioral, or academic
research.

### Tier C --- Documented case studies

Specific documented implementations with meaningful outcome evidence.

### Tier D --- Vendor claims

Claims made by interactive-content vendors or platforms.

Vendor claims may inform hypotheses but should not be treated as
universal evidence.

### Tier E --- Framework policy

Rules established by this framework for safety, consistency, or
engineering reasons.

### Tier F --- AI inference

Model-generated interpretation or hypothesis.

AI inference must not be represented as research evidence.

------------------------------------------------------------------------

# 16. Technical Contract

Interactive experiences must inherit the framework's existing technical
standards.

## Rendering

Prefer:

-   semantic HTML
-   server-rendered/static shell
-   progressive enhancement
-   minimal client-side JavaScript

Essential content must work without the enhancement.

------------------------------------------------------------------------

## Accessibility

Each interaction must be tested for:

-   keyboard access
-   focus visibility
-   screen-reader semantics
-   reflow
-   touch target size
-   reduced motion
-   non-pointer interaction
-   error recovery
-   equivalent non-interactive path

Target: WCAG 2.2 AA unless a stricter requirement applies.

------------------------------------------------------------------------

## Mobile

The interaction must remain usable across:

-   narrow phones
-   larger phones
-   tablets
-   desktop
-   coarse pointers
-   no-hover environments

The framework should not assume that desktop drag, hover, large screens,
or high bandwidth exist.

------------------------------------------------------------------------

## Performance

Interactive components must respect the site's performance budget.

Heavy modules should be:

-   lazy loaded
-   isolated
-   on-demand
-   progressively enhanced
-   replaceable by a lighter fallback

If an interaction causes the route to exceed its budget, the engine
should downgrade, replace, or reject it.

------------------------------------------------------------------------

## Analytics

Where analytics are needed, define an explicit event schema.

Examples:

``` text
experience_viewed
experience_started
step_completed
experience_completed
result_viewed
result_action_clicked
lead_started
lead_submitted
booking_started
booking_completed
```

Events must measure meaningful outcomes rather than vanity interaction
alone.

------------------------------------------------------------------------

## Feature flags

Interactive experiences should support:

-   feature flags where available
-   kill switch
-   safe fallback
-   versioning

A business should be able to disable an interaction without breaking the
page.

------------------------------------------------------------------------

# 17. Content and Data Integrity

The framework must never fabricate:

-   formulas
-   pricing
-   product specifications
-   eligibility criteria
-   recommendations
-   statistics
-   savings claims
-   testimonials
-   customer outcomes
-   regulatory claims
-   credentials
-   availability
-   business facts

If the required source is unavailable:

``` text
DO NOT INVENT
        ↓
mark unresolved
        ↓
reject/defer interaction
        ↓
provide safe static alternative
```

For example, a tax calculator cannot invent tax rules or rates merely to
make the website interactive.

A product recommender cannot invent product attributes.

A savings calculator cannot invent savings assumptions.

------------------------------------------------------------------------

# 18. Customer Setup Experience

Engagement should be an **optional decision stage** in customer
onboarding.

The customer should be presented with choices such as:

### Let the AI decide

The framework analyzes the business, audience, journey, objectives,
content, and constraints.

### Choose from recommended opportunities

The framework presents suitable candidates with rationale and tradeoffs.

### I have a specific idea

The customer can propose an interaction.

The proposed interaction is still evaluated by the same hard gates,
scoring, content integrity, accessibility, performance, SEO, trust, and
feasibility rules.

Customer preference does not automatically override safety or evidence
rules.

### No interactive experience

The customer can explicitly indicate that no interactive experience is
desired.

The framework should still validate the choice against the overall
business strategy but should not add an interaction merely because one
is available.

------------------------------------------------------------------------

# 19. Placement Policy

An interaction should be placed where it supports the visitor task.

Possible placements:

-   hero
-   service/product section
-   decision-support section
-   comparison section
-   result section
-   mid-funnel educational section
-   conversion section
-   dedicated tool page
-   post-result flow

Do not automatically put an interaction in the hero.

A high-intent visitor may need a direct CTA before an interactive
experience.

------------------------------------------------------------------------

# 20. Design Integration

Engagement intelligence must occur before final page/component
generation.

Recommended workflow:

``` text
Business Discovery
        ↓
Audience / Objective / Journey
        ↓
Page Purpose
        ↓
Static-Solution Adequacy Test
        ↓
Engagement Opportunity Engine
        ↓
Hard Gates
        ↓
Candidate Generation
        ↓
Scoring
        ↓
Primary / Complementary / None
        ↓
Engagement Decision Record
        ↓
Design Decision Intelligence
        ↓
Page / Component Generation
        ↓
Responsive Adaptation
        ↓
Accessibility / SEO / Performance
        ↓
Quality Evaluation
        ↓
Autonomous Refinement
```

Engagement should therefore be a **decision layer**, not a separate
collection of widgets.

------------------------------------------------------------------------

# 21. Continuous Learning

The framework should eventually compare:

``` text
predicted opportunity score
        vs.
actual observed outcome
```

Useful learning dimensions include:

-   visitor task
-   business objective
-   funnel stage
-   opportunity category
-   audience characteristics
-   device context
-   implementation cost
-   observed conversion outcome
-   observed task completion
-   accessibility issues
-   performance impact

The framework should recalibrate weights based on validated evidence.

Rejected opportunities should also be retained.

A pattern that repeatedly succeeds for a particular task may eventually
become a stronger prior for that task.

The system should not generalize from one successful case to an entire
industry without evidence.

------------------------------------------------------------------------

# 22. Initial Implementation Scope

The first implementation should remain deliberately small.

Recommended initial patterns:

1.  Calculator
2.  Assessment
3.  Guided selector
4.  Comparison
5.  Booking
6.  Result
7.  Progressive form
8.  Static fallback

Do **not** begin by building a huge interactive library.

Higher-complexity capabilities should follow only after the policy
engine, contracts, validation, and generation path are proven.

Defer:

-   broad game library
-   AI personalization
-   3D/WebGL
-   AR
-   large simulation systems
-   complex gamification
-   speculative engagement widgets

------------------------------------------------------------------------

# 23. Minimum Test Scenarios

The framework should test at least:

1.  Business where no interaction is appropriate.
2.  Business where a calculator is appropriate.
3.  Business where an assessment is appropriate.
4.  Business where a guided selector is appropriate.
5.  Business where a comparison is appropriate.
6.  Business where booking is the correct interaction.
7.  Business where a progressive form is appropriate.
8.  Business where an interaction fails because required data is
    missing.
9.  Business where an interaction fails because trust/compliance risk is
    too high.
10. Business where a static solution is better.
11. Same business with a different primary objective.
12. Multiple complementary experiences with distinct jobs.
13. Multiple experiences that should be rejected because they compete.
14. Game that should be rejected despite being engaging.
15. Gamification that qualifies because it supports a meaningful
    repeated task.
16. Interaction that must fall back for accessibility/performance.
17. Customer-requested interaction that fails the framework gates.

Tests should verify both the selected decision and the rejected
alternatives/reasons.

------------------------------------------------------------------------

# 24. Research Interpretation Rules

The research does **not** establish a universal claim that quizzes,
calculators, games, animation, or other interactive content always
increase conversion.

Therefore the framework must not contain rules such as:

> "Interactive content increases conversion."

or:

> "Every landing page should have a game."

Instead:

> "Select interaction when the expected user and business value exceeds
> the cost and risk, supported by the available evidence and business
> context."

The framework should explicitly preserve uncertainty where evidence is
weak.

------------------------------------------------------------------------

# 25. Final Design Principle

The desired product is not:

> **An AI website builder that adds games.**

It is:

> **An AI website development framework that determines whether useful
> interaction should exist, what form it should take, where it belongs,
> how it should support the business outcome, and when the correct
> answer is no interaction at all.**

The strongest implementation is one in which:

``` text
Business context
      +
Visitor task
      +
Business objective
      +
Content/data readiness
      +
Trust/compliance
      +
Accessibility
      +
Performance
      +
Technical feasibility
            ↓
   Engagement Decision
            ↓
 ┌──────────┼──────────┐
 ↓          ↓          ↓
NONE     PRIMARY    COMPLEMENTARY
            ↓
       Design Decision
            ↓
         Generate
            ↓
       Validate
            ↓
        Evaluate
            ↓
        Refine
```

**Interaction must be earned by context.**

**Games must clear a higher bar.**

**No interaction is a first-class successful outcome.**

**Every selected interaction must have a meaningful user purpose, a
defensible business purpose, an accessible fallback, and an
implementation path that the framework can actually execute.**
