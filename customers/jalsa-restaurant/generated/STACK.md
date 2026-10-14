# Generated website

GENERATED from a framework decision output. Do not hand-edit; change the
business input or the decision rules and regenerate.

- Framework: nextjs (DD-STACK: seo_dependency == high AND pwa_requirement == false → Next.js primary (§24))
- Rendering: static
- PWA: DENIED — not requested

## Dependency admission (proposal × generated consumer × dependency gate)
- `next` admitted: framework runtime selected by the stack decision
- `react` admitted: framework runtime selected by the stack decision
- `react-dom` admitted: framework runtime selected by the stack decision

## Dependencies deliberately OMITTED by the stack

## Architectural constraints
- PWA, service workers, offline support and app-shell architecture are DENIED (not requested)

## Framework-required client boundary
- `app/error.tsx`: Next.js requires error boundaries to be client components

## Client boundaries
- none: every node renders on the server
