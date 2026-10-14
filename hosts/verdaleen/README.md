# Host integration fixture — Verdaleen

This is **not a customer website and not a demo product.** It exists only to
prove that the framework can generate a host project and drive the full
validation lifecycle with real tools, without changing the framework core to
make up for missing runtime infrastructure.

The input is the synthetic `FIXTURE-VERDALEEN-MOBILITY` business from
`tests/fixtures/dry-run-fixture.ts`. No business fact is added here.

## Run it

```
npm run host:e2e
```

That runs `tests/host/verdaleen.host.ts`, which:

1. decides with `runPipeline()` and generates with `generateWebsite()` (no form endpoints: this host has no backend);
2. plans and writes the host into `generated-host/` with `planHostProject()` / `writeHostProject()`;
3. runs `npm install` inside the host — the stack decision's runtime set plus the declared toolchain, nothing else;
4. runs the host's own `host/validate.mjs`: production build, typecheck, lint, `next start`, served HTML, script sizes, secret scan, an axe-core and DOM audit in an installed browser, and lab vitals;
5. parses the raw evidence against the core schema, maps it to tagged evidence, and runs every gate.

The digest is written to `evidence/host-dry-run-digest.json`.

## What is in this directory

| Path | Owner | Committed |
|---|---|---|
| `README.md` | framework | yes |
| `evidence/host-dry-run-digest.json` | produced by a run | yes — the record the readiness report cites |
| `generated-host/` | regenerated each run; `node_modules` and `.next` are host-owned | no (gitignored) |

## Requirements

- Node 20+ and registry access for the host's `npm install`.
- An installed Chrome, Edge or Chromium. Set `HOST_BROWSER_PATH` if it is not in
  a standard location. Without a browser the audit and vitals are recorded as
  **unavailable**, never as passing.
