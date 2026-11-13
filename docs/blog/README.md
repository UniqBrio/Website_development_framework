# Blog branch — documentation index

The blog branch is an OPTIONAL part of the Website Workflow: it takes a blog
that is already written (documents plus media) and presents it on a website
after the owner approves a preview. It never writes or rewrites content.

| # | Document | Read it when |
|---|---|---|
| 01 | [Architecture](01-architecture.md) | you need to know how the parts fit and what they may not do |
| 02 | [Ingestion technical specification](02-ingestion-specification.md) | you are changing or debugging extraction, or reading a manifest |
| 03 | [Supported formats and compatibility matrix](03-formats-and-compatibility.md) | you need to know whether an input or a website is supported |
| 04 | [Website layout mapping guide](04-layout-mapping-guide.md) | the target site is hand-built or has its own blog |
| 05 | [Preview and approval guide](05-preview-and-approval.md) | you are the owner, or run the gate for one |
| 06 | [Publishing and rollback guide](06-publishing-and-rollback.md) | you publish, replace, retry or undo |
| 07 | [Security and limitations report](07-security-and-limitations.md) | you review risk before production |
| 08 | [Integration-readiness specification](08-integration-contract.md) | you are connecting the UniqBrio Blog Framework (NOT yet integrated) |
| 09 | [Test coverage and verification report](09-test-and-verification-report.md) | you want to know what was actually run |
| 10 | [Developer setup and troubleshooting](10-developer-setup-and-troubleshooting.md) | something does not run |
| 11 | [Production operations guide](11-production-operations-guide.md) | you publish to a production site |
| 12 | [Accessibility verification report](12-accessibility-verification.md) | you need to know what was checked for accessibility, and what was not |
| 13 | [Staging test procedure and evidence](13-staging-test-procedure.md) | you validate the workflow on a copy of a real site |
| 14 | [Browser compatibility matrix and manual test plan](14-browser-compatibility.md) | you test in Safari, Firefox or on devices |
| 15 | [Publishing concurrency guide](15-publishing-concurrency.md) | two people or jobs might publish at once |
| 16 | [Incident recovery and rollback guide](16-incident-recovery-and-rollback.md) | something went wrong during or after a publish |
| 17 | [Final production-readiness report](17-production-readiness-report.md) | you decide whether this goes to production |

Process file run by `/wblog`: `website_workflow/blog_publishing.md`.
History: `docs/BLOG-INGESTION-ASSESSMENT.md` (pre-implementation assessment),
`docs/BLOG-INGESTION-REPORT.md` (first implementation, 2026-11-11). Where those
two differ from the documents above, the documents above are current.
