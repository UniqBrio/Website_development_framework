# STACK DOCTRINE — what this website is built OUT OF, and what it is not
<!-- Save as: /website_workflow/stack_doctrine.md -->
<!-- The framework gated HOW decisions get made (decision_matrix.md), what
     they LOOK like (design_library.md, color_system.md, theme_system.md,
     animation_library.md) and what gets PROVEN (qa_evidence_gate.md,
     qa_workflow.md). It never stated what the default MATERIALS are, so
     architecture and dependency choices — the least reversible class of
     decision in the repo — were the only class with no gate at all.
     Referenced by: website_flow.md (Phases 0/2/4/5 + standing instruction),
     checklists/interrogation_checklist.md (Q-STACK-DISCIPLINE,
     Q-SEO-ARTIFACTS), checklists/qa_evidence_gate.md, skills_map.md,
     decision_matrix.md, site_profile_TEMPLATE.md. -->

## EXECUTABLE FORM
This file is the PROSE gate. Its deterministic twin is `src/stack/select-stack.ts`
(documented in docs/TECH-STACK-SPEC.md), which encodes the same rule as code:
high SEO dependency + no PWA requirement selects Next.js; a STATED PWA
requirement enables PWA as a first-class architectural constraint; the default
library set is EMPTY and a dependency enters only because a requirement asked for
it. The two must agree. When they disagree, that is a framework_update, not a
per-project exception — and the numeric budgets the DEPENDENCY GATE checks a
delta against come from `ROUTE_BUDGETS` in src/performance/budgets.ts, which is
their canonical home.

## PRIME RULE — DEFAULT-DENY
The default stack below is a CLOSED list. Any material not on it — a new
dependency, an architecture category, a rendering strategy, a content
backend — is DENIED until all three of these exist:
1. a REQUIREMENT in the request file that names the visitor-facing or
   owner-facing outcome it serves (not the technology),
2. a decision_matrix.md PROFILE B table scoring it against "do not add it"
   as Option A, and
3. the owner's gate approval, recorded.

"We might need it later", "it is industry standard", and "it is only a small
package" are not requirements. Absence of a rule is not permission: a
material with no doctrine entry is denied, not undecided.
Prevents: the one class of decision that is hardest to reverse being the one
class no gate ever asked about.

## THE DEFAULT STACK
{STACK} in site_profile.md records what THIS site actually runs. Where it is
silent, these are the defaults; where it differs, the deviation is recorded
(see §DEVIATION RECORD).

| Layer | Default | Notes |
|---|---|---|
| L0 Core | Next.js App Router · React · TypeScript | Server components by default (§CLIENT BOUNDARY) |
| L1 Styling | Tailwind CSS + the ONE generated token file | Values come from color_system.md, never from a component |
| L2 Primitives | shadcn/ui (copied in, owned, editable) | THIS is the source of the components/ui primitives Phase 4 tells you to reuse |
| L2 Icons | Lucide React | Icons use currentColor (theme_system.md); logos never do |
| L3 Motion | Motion for React | animation_library.md decides WHETHER and WHICH; this is only the implementation |
| L3 Type | next/font, self-hosted | No render-blocking font, no runtime request to an external font host |
| L3 Media | next/image | Weight budgets in qa_evidence_gate.md §3 |
| L4 Forms | React Hook Form + Zod | ONE schema, imported by client AND route handler (§FORMS) |
| L4 Content | Server-rendered constants → MDX → CMS, in that order | §CONTENT SOURCE LADDER |
| L5 SEO | Next.js Metadata API, sitemap, robots, JSON-LD | §SEO ARTIFACT SET |
| L5 Deploy | Vercel | Phase 6 owns the release procedure |
| L5 Analytics | none by default | An analytics tool is a PROFILE B decision with a named question it answers |

**GENERATED SITES (added 2026-09-14, first customer dry run).** The L1 and L2 rows
above are the doctrine defaults for work built by hand. A site produced by the
generator (`src/generation/`) implements the same L1 rule — ONE generated token
file, no colour value outside it — as a plain generated stylesheet, and builds its
components as semantic HTML. It installs no Tailwind, shadcn/ui, Lucide or
next/font, and `src/stack/select-stack.ts` records exactly that. Adopting any of
them on a generated site is a new dependency and goes through the DEPENDENCY GATE.
Prevents: the stack decision naming packages that no layer installed or used — a
conflict of authorities the first customer dry run found, where "Tailwind" appeared
in the decision while the host installed none and the generator emitted none.

## WEBSITE IS NOT A WEB APPLICATION — the default-deny categories
This framework builds websites: discoverability, content, performance,
accessibility, conversion, maintainability. The following are DENIED by
default, because each one trades a website's strengths for an application's
and each arrives disguised as a small convenience:

- PWA behaviour, service workers, offline support, app-shell architecture.
- Global client-side state management.
- Authentication, accounts, sessions, gated content.
- A database, backend API, or third-party data service beyond what {STACK}
  already declares.
- Application-style navigation (client-side routing over content that must
  be indexable; a shell that fetches its own pages).
- Client-rendered indexable content of any kind (§CLIENT BOUNDARY).
- A headless CMS (§CONTENT SOURCE LADDER).
- An animation, charting, carousel, date, or utility library where the
  platform or a short local implementation suffices (§DEPENDENCY GATE).

ESCALATION RULE. When a requirement genuinely needs one of these, the answer
is NOT to thicken the website. Say so plainly: name the surface that has
become an application, recommend the appropriate web-application
architecture for THAT surface, and keep the marketing site a website. A
login wall bolted onto a content site degrades both.
Prevents: a website acquiring an application's weight, its crawlability
losses and its maintenance surface one small convenience at a time, with no
single decision anyone could later point at as the mistake.

## DECLARED STACK vs DOCTRINE DEFAULT
A site whose {STACK} already names a denied category (a database, an auth
provider) passed this gate ONCE, at init, and site_profile.md records the
requirement that justified it. Declaration is not a blanket licence: every
new touchpoint still runs its own review (Supabase-touching → Phase 3
supabase_review.md). Conversely, a category present in the codebase but
absent from {STACK} is an undeclared deviation, not a precedent — find when
it entered, then record it or remove it.
Prevents: one approved backend becoming standing permission for every
backend-shaped idea that follows it.

## DEPENDENCY GATE — five answers before anything enters the manifest
Answer all five in writing, in the Phase 2 plan. Any unanswered = denied.
1. WHICH primitive, platform API, or existing repo module does this replace,
   and why is that one insufficient? Show the local implementation you
   rejected (roughly how many lines it would be), not a claim that it is
   hard.
2. WEIGHT: measured gzipped cost and the First-Load JS delta for the
   affected route, BEFORE and AFTER, from the real build. The package's own
   README figure is not evidence.
3. BOUNDARY: does it force a client boundary, and how far up the tree? A 3KB
   library that turns a server page into a client page is not a 3KB
   decision.
4. LICENCE + maintenance: licence stated (reference_site_analysis.md Lane F
   discipline applies — copyleft is a decision, not a detail), last release,
   and who owns the upgrade.
5. REMOVAL PATH: one sentence on how it comes out again.

Prevents: page weight and client-boundary creep arriving as a series of
individually defensible small additions — the accumulation failure IDEA-006
already names for hero elements, applied to the bundle.

## CLIENT BOUNDARY — server by default
- Server components are the default. A client boundary is a decision with a
  written reason, pushed to the SMALLEST leaf that needs interactivity —
  never at a page or layout when a leaf will do.
- Content that must be found by search, or read without JS, is never
  rendered client-side only. The test is not "it appears in the browser" —
  it is whether it is present in the SERVED HTML (§SEO ARTIFACT SET
  evidence).
- A data fetch belongs on the server unless the interaction genuinely
  requires the browser. Every client-side fetch still owes loading, error
  and empty states (website_flow.md Phase 4) AND its degraded path
  (degraded_paths.md).

Prevents: a content site quietly becoming a client-rendered application,
where the crawlability and performance losses are invisible in review
because everything still looks right in a browser.

## SEO ARTIFACT SET — per page, on every structural or content change
README rule 6 made the SEO skills mandatory but named no artifacts, and the
Phase 5 gate had no SEO item at all — so a page could pass with no title and
no canonical. This is that list. Each item is PRESENT + CORRECT, or N-A with
a reason:
1. Title — unique across the site, matching the page's search intent.
2. Meta description — written for this page, not truncated boilerplate.
3. Canonical URL — absolute, correct host, self-referencing unless the page
   is a deliberate duplicate.
4. Exactly ONE H1, and no skipped heading levels below it.
5. Open Graph + Twitter/X metadata, including an OG image whose logo
   contrast was measured (theme_system.md §LOGO CONTRAST covers the OG
   image explicitly).
6. Structured data / JSON-LD ONLY for a type the page genuinely contains.
   Marking up a rating, a product, or an FAQ the page does not really have
   is a fabricated claim — forbidden by app_reality.md, not merely
   discouraged.
7. Sitemap inclusion and the intended robots directive, both verified on the
   BUILT output rather than intended in the plan.
8. URL slug: readable, stable, lowercase, hyphenated. A slug change needs a
   redirect decided in the SAME release as the change.
9. At least one inbound internal link from an existing page. A page nothing
   links to is an orphan, and an orphan is not published.
10. Image alt text — owned by interrogation Q6; restated here only so the
    per-page sweep is complete.

## FORMS
React Hook Form for state, Zod for the schema, and the SAME schema imported
by both the client component and the route handler. A separately
hand-written server check drifts from the client one, and the drift shows up
only on the input nobody tested.
Every form still owes: honest error copy, no data loss on failure, an
accessible label per field, and its degraded path (degraded_paths.md).

## CONTENT SOURCE LADDER — cheapest rung that works
1. Server-rendered constants in the repo — the default. Content that changes
   when the code changes belongs with the code.
2. MDX — when the site is genuinely content-driven (many long documents with
   consistent structure) and the author is comfortable in the repo.
3. A headless CMS — LAST, and only with a NAMED non-technical person who
   will actually edit content, on a stated cadence. "The owner might want to
   edit it" is not that person.

Prevents: a CMS, its modelling work, its preview pipeline and its build
coupling being adopted for content that two people edit twice a year.

## DEVIATION RECORD — how an approved exception is stored
An approved deviation is written where the next session will actually see
it: one row in site_profile.md's {STACK_DEVIATIONS} with the date, the
material, the requirement that justified it, the PROFILE B score, and its
removal condition. A deviation that lives only in a chat transcript gets
read as a precedent by the next request — the failure this framework already
fixed once, when a revoked raster-asset dispensation outlived the gap it was
granted for.

## WHERE THIS FILE IS ENFORCED
| Gate | What it checks |
|---|---|
| Phase 0 step 2b | ARCHITECTURE classify — does the request touch a denied category or a new dependency? |
| Phase 2 STACK & SEO PLAN | The five dependency answers, the client-boundary decision, the per-page SEO artifact list |
| Phase 4 | Server-by-default, primitives from L2, one Zod schema on both sides |
| Phase 5 | qa_evidence_gate.md §3 (bundle delta) and §4c (served-HTML SEO evidence) |
| Interrogation | Q-STACK-DISCIPLINE, Q-SEO-ARTIFACTS — at Phase 1 against the plan, again at Phase 5 against the build |
