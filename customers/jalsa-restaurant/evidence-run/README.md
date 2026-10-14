# Evidence from the dry run

`jalsa-dry-run-digest.json` is written by `tests/host/jalsa.host.ts` on every host run and replaced
wholesale. It records:

| Key | Contents |
|---|---|
| `rawMaterial` | SHA-256 of both raw files after the run (must equal `evidence/raw-file-register.md`) |
| `provenanceLedger` | every served text fragment of every route: customer material (with source locator), framework structural text, or unclassified (must be empty) |
| `decision` | the full pre-build decision: profile + provenance, baseline, rule draft, decision log, selection, pages, allocation, content plan, SEO artifacts, tokens, engagement decision, contract |
| `generated` | files, manifest (dataset classification, integrity ledger, drafts, indexability, engagement delivery), component nodes with traces, refusals |
| `host` | install, build, lint, typecheck, served routes and HTML, not-found probe, secret scan, axe audit, lab vitals, responsive sweep, navigation checks, static layer, engine matrix |
| `register` | the 13 register cases with results (also written into `07-engine-seam.md`) |
| `evaluation` | post-build quality: gates, level, score, blockers, score sheet, accessibility criteria, evidence provenance, publication requirements |

Screenshots and raw browser evidence: `../generated/host/evidence/`.

The digest is evidence of what the framework did with unverified customer material. It is not
a claim that any value in it is true or approved.
