# 06 — Publishing and rollback guide

## Publish

```
npm run blog -- publish <run dir> --site <site dir> [--origin https://your-domain] [--route-base /blog] [--blog <id>] [--replace]
```
Publishing writes FILES into the site directory. It deploys nothing; the
site's own release procedure (Phases 5–6 of `website_workflow/website_flow.md`)
follows.

### What is checked before a single file is written

1. The website is a supported kind (03). Otherwise: refused, with reasons.
2. Every blog named has a valid approval for its current digest, given after a
   preview of that version, with all warnings acknowledged, and is not blocked.
3. No two blogs in the run target the same route.
4. No destination is a file the workflow did not publish. Such files are never
   overwritten — with or without `--replace`.
5. A different post already at the same route requires `--replace` AND an
   approval that names the published version being replaced.
6. Every destination resolves inside the site directory; no symbolic links are
   written through.

### How the write happens (transaction)

1. Each new file is written beside its destination under a temporary name.
2. Each file that will be replaced is copied to `<run>/publish-tx/<id>/backup/`.
3. A journal is written to `<run>/publish-tx/<id>/journal.json`.
4. The temporary files are renamed into place, one atomic rename each.
5. The journal is marked committed.

If any step fails, the temporary files are removed, replaced files are
restored from backup, created files are deleted, and the error says the site
was restored. There is no state in which part of a post is live.

### What is written

| Site kind | Files |
|---|---|
| Generated | `static/<base>/<slug>/index.html`, `static/<base>/index.html`, `static/<base>/blog.css`, assets; the same under `next/app/…` and `next/public/…`; `blog-registry.json`; sitemap entries when `--origin` is given and a sitemap exists |
| Next.js App Router | `app/<base>/<slug>/page.tsx`, `app/<base>/page.tsx`, `app/<base>/blog.css`, `public/<base>/<slug>/assets/…`, `blog-registry.json` |
| Static HTML | `<base>/<slug>/index.html`, `<base>/index.html`, `<base>/blog.css`, `<base>/<slug>/assets/…`, `blog-registry.json` |

Only the assets the page actually uses are published. Every file carries the
marker `website-workflow-blog`, which is how the workflow later recognises its
own files.

`blog-registry.json` lists published posts (slug, route, title, subtitle,
description, author, date, digest). It sits at the site root; on a static HTML
site that is the web root, so it may be served. It contains nothing that is
not already on the published pages — the approver's name is deliberately not
in it.

## Retry

Run the same command again. If the site already holds exactly this approved
version, the result is "nothing to do" and no transaction is created. A retry
after a failure starts clean, because the failure restored the site.

## Interrupted publish (crash, kill, power loss)

The next `publish` or `rollback` on that run directory finds the unfinished
journal and undoes it first, then reports "an interrupted publish was found and
undone". To recover without publishing again, run `rollback`.

## Replace a published post

1. Ingest and preview the corrected version (same slug).
2. `approve … --replace --site <site dir>` — the owner approves replacing the
   exact published version.
3. `publish … --replace`.

Files of the old version that the new one no longer uses (for example a removed
video) are deleted in the same transaction and are restored by rollback.

## Rollback

```
npm run blog -- rollback <run dir> [--tx <id>] [--force]
```
Undoes the most recent committed publish OF THAT RUN: files it created are
removed (and emptied folders with them), files it replaced or deleted are
restored byte-for-byte from the backups in the run directory.

- A file that was edited after publishing is left alone and listed as KEPT;
  `--force` overrides.
- Rollback needs the run directory. Keep run directories until a publish is
  no longer a rollback candidate. If the run directory is gone, recover from
  version control instead (below).
- Roll back publishes in reverse order when several touched the same shared
  files (index, registry).

### Recovery without the run directory

Published files are ordinary files in the site repository. `git status` shows
exactly what a publish added or changed; `git checkout -- <paths>` and
`git clean -fd <blog route>` restore the previous state. To remove one post by
hand: delete its folder under the blog route (and under `public/` or
`next/public/`), remove its entry from `blog-registry.json`, and publish any
other post again — or edit the index — so the index no longer links to it.

## After publishing

Phase 5 on the new route only: device sweep (Chromium AND WebKit), served-HTML
evidence, image weight against the budgets in
`website_workflow/checklists/qa_evidence_gate.md`, keyboard and screen-reader
spot-check, real video playback, and every NOT VERIFIED item from the report.
Then Phase 6 release and a Phase 7 decisions-log entry naming the run id,
approver, digest, transaction id and accepted warnings.
