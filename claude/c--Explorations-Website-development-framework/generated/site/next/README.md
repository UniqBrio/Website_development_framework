# Generated website

GENERATED from a framework decision output. Do not hand-edit; change the
business input or the decision rules and regenerate.

- Framework: nextjs (DD-STACK: seo_dependency == high AND pwa_requirement == false → Next.js primary (§24))
- Rendering: hybrid
- PWA: DENIED — not requested

## Dependency admission (proposal × generated consumer × dependency gate)
- `next` admitted: framework runtime selected by the stack decision
- `react` admitted: framework runtime selected by the stack decision
- `react-dom` admitted: framework runtime selected by the stack decision
- `next-intl` not_consumed: no generated module imports it; an unused dependency is never installed (§17, DEF-010)
- `react-hook-form` not_consumed: no generated module imports it; an unused dependency is never installed (§17, DEF-010)
- `zod` awaiting_approval: proposed for "server-side validation schemas mirroring each conversion form contract, for a host endpoint to apply"; the dependency gate has not approved it (stack_doctrine.md), so it is not installed and its consumer is not emitted

## Dependencies deliberately OMITTED by the stack
- `lazy-loaded map embed` (map): a rule chose map="address_plus_directions_link_and_static_context" rather than "interactive_map", so the dependency is not needed
- `three` (product_configurator): no selected pattern provides the "spatial_3d" capability, so this dependency would serve nothing (§17 avoid unnecessary dependencies)
- `@react-three/fiber` (product_configurator): no selected pattern provides the "spatial_3d" capability, so this dependency would serve nothing (§17 avoid unnecessary dependencies)

## Architectural constraints
- PWA, service workers, offline support and app-shell architecture are DENIED (not requested)
- "product_configurator" was requested but no pattern providing "spatial_3d" survived selection — resolve the design decision before adding the dependency
- CMS requested: it is the LAST rung of the content ladder and needs a named non-technical editor

## Framework-required client boundary
- `app/error.tsx`: Next.js requires error boundaries to be client components

## Client boundaries
- /devices `product-gallery`: gallery requires client interaction; degrades to: degrades to Static grid — a static grid of the same images, all visible
