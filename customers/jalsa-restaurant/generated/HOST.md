# jalsa-restaurant-dry-run

GENERATED host project. It exists to build, serve and audit the generated site,
and to hand RAW evidence back to the framework. It decides nothing.

## Lifecycle

```
npm install          # installs ONLY the declared runtime + toolchain sets
npm run validate     # build, typecheck, lint, serve, audit, lab vitals
```

Raw evidence is written to `host/evidence/raw-host-evidence.json`. The framework parses it
against its schema and runs every gate itself.

## Runtime dependencies (admitted: proposal × generated consumer × dependency gate)
- `next` ^15.5.0
- `react` ^19.1.0
- `react-dom` ^19.1.0

## Toolchain (build and audit only)
- `typescript` ^5.5.4 — next build type-checks the TSX; `tsc --noEmit` is the measured typecheck
- `@types/node` ^20.14.10 — types for the Node runtime the host builds and serves on
- `@types/react` ^19.1.0 — types for the React runtime the stack decision selected
- `@types/react-dom` ^19.1.0 — types for react-dom
- `eslint` ^9.0.0 — the measured lint step
- `eslint-config-next` ^15.5.0 — Next.js lint rules, including core web vitals rules
- `@eslint/eslintrc` ^3.0.0 — flat-config compatibility for eslint-config-next
- `axe-core` ^4.10.0 — accessibility audit engine run inside each rendered page
- `playwright-core` ^1.50.0 — drives an already-installed browser for the audit and lab vitals; downloads no browser

## Browser

The audit drives a browser that is already installed. Set `HOST_BROWSER_PATH`
to its executable, or the collector looks in the standard Chrome, Edge and
Chromium locations. With no browser, the audit and vitals are recorded as
unavailable — never as passing.

## Form endpoints
- no conversion forms
