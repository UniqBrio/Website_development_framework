# 16 — Incident recovery and rollback guide

For the operator. Find the symptom, follow the steps in order, stop at the
first one that resolves it. Commands run from the framework repository.

## First, always

1. Do not delete anything by hand yet.
2. `npm run blog -- lock-status <site dir>`
3. `npm run blog -- history <run dir>` for each run involved — every preview,
   approval, publish, recovery and rollback with time, digest and transaction id.
4. In the site repository: `git status` — the exact set of files that differ
   from the last commit.

## Symptom → action

| Symptom | Meaning | Action |
|---|---|---|
| "another publish is in progress on this website" | a LIVE lock | wait for it; if you are sure no publish is running, check `lock-status` — on this machine a dead process is detected automatically |
| "a stale publishing lock was found … undone" (printed by publish) | a previous publish crashed; it was undone first | nothing — confirm with `git status` that only the new post was added |
| "did not finish … could not be undone automatically: its run directory … is not available here" | a crashed publish whose run directory is gone | go to **Recovery without the run directory** |
| "publishing failed and the site was restored" | a write failed part-way; the site is as it was | fix the cause (disk space, permissions), run publish again |
| publish killed (Ctrl-C, machine restart, CI timeout) | journal left `prepared` | run `publish` again (recovers, then publishes) or `rollback <run>` (recovers only) |
| "cannot be rolled back yet: later publish(es) changed the same files — …" | rollback asked out of order | roll back the named publishes first, newest first; the message names their transaction id and run |
| rollback prints "KEPT … was changed after it was published" | someone edited a published file | decide: keep the edit, or `rollback --force` to discard it (ask the owner first) |
| a published post must come down urgently | — | `rollback <run>` for the publish that added it (and any later publish that touched the same files, newest first); then release through the normal procedure |
| a published post has an error | — | correct the SOURCE, ingest into a new run, preview, `approve --replace --site`, `publish --replace`. Do not edit published files by hand: the next publish or rollback will treat them as changed |
| `blog-registry.json` or `.blog-publish-history.json` is invalid JSON | hand-edited or corrupted | restore it from version control (`git checkout -- <file>`); publishing refuses to overwrite it until then |

## Rollback

```
npm run blog -- rollback <run dir> [--tx <transaction id>] [--force]
```
- Undoes the most recent committed publish of that run: removes files it
  created, restores files it replaced or deleted, byte for byte, from the
  backups in `<run>/publish-tx/<id>/backup/`.
- Refuses when a later publish from any run touched the same files (the site's
  `.blog-publish-history.json` records this), naming the publishes to undo first.
- Takes the site lock; recovers a crashed publish first.
- After a full rollback of every publish, the site is byte-identical to its state
  before the first publish, the history file included (verified in tests and in
  the staging test).

## Recovery without the run directory

The run directory holds the backups and the journal. Without it:

1. `git status` / `git diff` in the site repository show exactly what the
   publish added and changed.
2. `git checkout -- <changed files>` and `git clean -fd -- <blog route> <public blog route>`
   restore the last committed state. On a site that is not under version
   control, restore from your backup.
3. Remove `.blog-publish.lock` (`npm run blog -- unlock <site> --force`).
4. Publish again from a fresh run if the post is still wanted.

## Backups the workflow keeps — and the ones it does not

| Kept | Where | For how long |
|---|---|---|
| every site file a publish replaced or deleted | `<run>/publish-tx/<id>/backup/` | as long as the run directory exists |
| the journal of every transaction | `<run>/publish-tx/<id>/journal.json` | same |
| the approval and every stage | `<run>/approvals/`, `<run>/run-record.json` | same |

Not kept: the site itself. **The site repository's version control is the
backup of record.** Commit (or snapshot) the site before publishing, and keep
each run directory until its post has been released and is no longer a
rollback candidate. Run directories are under `website_workflow/blog_runs/`
and git-ignored; archive them with the release if your process requires it.

## After any incident

Record in the site's `decisions_log.md`: what happened, the run id and
transaction ids, what was rolled back, and the state confirmed with `git status`.
