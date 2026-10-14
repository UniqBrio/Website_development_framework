# PHASE 3 and PHASE 4 — SUPABASE REVIEW and BUILD

## Phase 3 — Supabase review
N-A: no data store, form endpoint, booking or ordering exists or was requested.

## Phase 4 — Build
Built by the framework, not by hand:
- `tests/host/jalsa.host.ts` runs `generateWebsite` → `planHostProject` → `writeHostProject` into
  `../../../generated/`;
- it then runs `npm install` (declared runtime + toolchain only) and `host/validate.mjs`
  (`next build`, `tsc`, `eslint`, `next start`, Playwright Chromium and WebKit, axe-core).

| Rule | Result |
|---|---|
| Implement exactly the approved plan | no plan is approved (GATE 2 PENDING); the engine's spec was built as-is |
| Components | generated semantic HTML/TSX from one component model; no one-off components |
| Stack | Next.js 15 static; admitted packages only; one client boundary (`app/error.tsx`) |
| Colour | L2 semantic tokens from the neutral substitute seed; no raw colour in components |
| Forms | none generated (no contact method exists) |
| Copy | only: business name, 49 verbatim dish names, framework structural text. The host run's provenance ledger classifies every served fragment; 0 unclassified |
| Build | `next build` exit 0, `tsc --noEmit` exit 0, `eslint` 0 errors / 0 warnings |

## Generated files (`generated/`)
- **Static layer:** `static-site/index.html`, `static-site/404.html`, `static-site/styles.css`, `static-site/robots.txt`.
- **Next.js app:** `app/page.tsx`, `app/layout.tsx`, `app/not-found.tsx`, `app/error.tsx`, `app/loading.tsx`, `app/globals.css`, `styles.css`, `public/robots.txt`.
- **Host:** `host/host-manifest.json`, `host/validate.mjs`, `host/evidence/raw-host-evidence.json`, `host/evidence/eslint.json`, `host/evidence/screenshots/<profile>/home.png` (9 profiles).

**GATE 3 — N-A** (no Supabase).
