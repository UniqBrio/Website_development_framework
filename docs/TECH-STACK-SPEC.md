# TECH STACK SPEC

Implements specification section 17 and section 24.

## The mandatory rule (24)
`src/stack/select-stack.ts`

- `seo_dependency == high` AND `pwa_requirement == false`: Next.js is the primary
  application framework.
- `pwa_requirement == true`: PWA becomes a first-class architectural constraint,
  WITHOUT sacrificing indexability, accessibility, performance, semantic HTML or
  maintainability.

The decision is recorded explicitly as `recordedRule`, because section 24
requires the architectural decision to be recorded rather than implied.

## PWA is default-deny
PWA is never added because it is modern. It must be a stated product requirement
(`requiredFunctionality` containing `pwa` or `offline`) and is read verbatim from
input, never inferred. When it is requested, these constraints attach:

- service worker scoped so it never intercepts or stales indexable HTML
- server-rendered content remains the base experience; offline is additive
- precache budget counts against the route JS budget, not exempt from it
- install prompt is user-initiated

This is the executable form of `website_workflow/stack_doctrine.md`, which states
the same rule as a prose gate. The two must agree; this file is the enforceable
one.

## Dependencies must be earned (17)
The DEFAULT library set is EMPTY. A library enters only because a requirement
asks for it (`contact_form` gives react-hook-form + zod; `map` gives a lazy
embed; `product_configurator` gives three + R3F). Motion tooling is added by the
selected TIER, not by the stack: a site whose highest selected tier is CSS gets
no animation library at all.

## Rendering strategy
Derived from `seo_dependency` and `commerce_depth`, not from preference:
deep or medium commerce gives `hybrid`; high SEO gives `static`; otherwise
`server`.

## Denied categories that were requested
`authentication` and `account` attach a constraint ("gate it to a private
surface; public content stays indexable and ungated") rather than silently
enabling a login wall over content. `cms_editing` records that a CMS is the last
rung of the content ladder and needs a named non-technical editor.

## The framework's own toolchain
TypeScript strict, `tsc --noEmit`, Vitest, Zod. Four dev dependencies, one
runtime dependency, no bundler. This diverges from the sibling
`Custom-Web-App-Development-Framework`, which is deliberately plain Node ESM with
no build step; the divergence and its reasons are decision F1 in
`ARCHITECTURE-ASSESSMENT.md`.

## Dependencies follow SELECTED capabilities (revised after the first dry run)

A stated requirement is necessary but not sufficient. `RequirementLibrary` carries:

- `requiresCapability` — the library enters only if a selected pattern provides
  that capability tag.
- `requiresDraftValue` — the library follows a rule's decision (an unverified
  location makes DD-114 choose the static branch, so no map embed is needed).

Omissions are recorded in `omittedLibraries` with the library, the requirement and
the reason, plus an architectural constraint telling the owner the design decision
must be resolved before the dependency can be added. Silently dropping a requested
feature would be its own data loss.

This closed the contradiction the first dry run found: `three` and
`@react-three/fiber` entered the stack because `product_configurator` was
requested, while every 3D pattern had been rejected — the framework producing the
unnecessary dependency section 17 forbids.
