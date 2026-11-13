# 15 — Publishing concurrency guide

## Why a lock exists

Publishing and rollback rewrite files that every post shares: the blog index,
`blog-registry.json`, the sitemap and `.blog-publish-history.json`. Two
publishers running at the same time would each read the registry, each add
their own post, and the second write would silently drop the first post from
the index — while both reported success. The per-site lock makes that
impossible.

## How it works (`src/blog/lock.ts`)

| Aspect | Behaviour |
|---|---|
| Scope | one lock per WEBSITE directory: `<site>/.blog-publish.lock` |
| Who takes it | `publish` and `rollback` (both rewrite shared files). `preview`, `approve`, `status`, `inspect-site` do not write to the site and do not take it |
| Acquire | exclusive create (`O_CREAT|O_EXCL`): the operating system guarantees one winner |
| Second publisher | not queued: exits with "another publish is in progress on this website (process N on HOST, started …). Nothing was written. Wait for it to finish and run the command again" |
| When it is taken | BEFORE the site is inspected. Inspecting first made a second publisher mistake the first one's in-flight files for content the workflow had not written |
| Release | always — after success, after a failed publish, after rollback — and only by its own holder (a token check), so a lock taken over by someone else is never removed by the old holder |
| Contents | token, process id, host name, operation, run directory, start time. No approver, no content |

## Stale locks

A lock is STALE when:

- it was taken on this machine and its process is no longer running, or
- it was taken on another machine more than 15 minutes ago (`LOCK_STALE_MS`) —
  a process on another machine cannot be checked, so a fresh one is presumed
  alive, or
- the lock file cannot be read.

A stale lock is **never just deleted**. Its holder may have died half-way
through a publish, so the next publisher or rollback:

1. moves the stale lock aside atomically (of several contenders, exactly one
   rename succeeds),
2. takes the lock itself, so nobody publishes onto a half-restored site,
3. undoes the dead holder's unfinished transaction **from the dead holder's
   run directory**, and removes any staged files it left,
4. only then carries on, and says so: "a stale publishing lock was found (…);
   the unfinished publish behind it was undone before this one started".

If the dead holder's run directory is not available (deleted, or on another
machine), recovery is impossible to do safely: the stale lock is put back
exactly as it was, nothing is written, and the error points to the incident
guide (16). Recovery never trades away transactional safety.

## Operator commands

```
npm run blog -- lock-status <site dir>        # who holds it; LIVE or STALE and why; exit 1 if stale
npm run blog -- unlock <site dir> --force     # remove a STALE lock by hand — refused for a live one
```
`unlock` without `--force` is refused with an explanation: normally you should
just run `publish` or `rollback` again, which recovers automatically. Use
`unlock --force` only after checking the site against version control (16).

## What is NOT covered

- Two processes publishing to two DIFFERENT copies of a site (for example two
  checkouts) are not coordinated: the lock is per directory. Publish into one
  working copy and let version control merge.
- Network file systems with unreliable exclusive create (some NFS setups) are
  not supported for the site directory.
- The lock is advisory for anything that is not the blog branch: a person or
  another tool editing the blog folder during a publish is not stopped.

## Evidence

`tests/blog/blog-concurrency.test.ts` (13 tests, real processes): four
simultaneous publishers; a publisher killed with SIGKILL mid-commit and the
next publisher's recovery; rollback of the killed run; three publishers racing
for a stale lock; a lost run directory (lock kept, nothing written); a live lock
that `unlock --force` must refuse; a fresh vs. old lock from another machine;
rollback refused out of order across runs. The staging test (13) repeats the
simultaneous-publish case on a copy of a real site.
