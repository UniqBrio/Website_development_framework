/**
 * PER-SITE PUBLISHING LOCK.
 *
 * Publishing and rollback both rewrite shared files of a website (the blog index,
 * the registry, the sitemap). Two of them at once could each read the registry,
 * each add its post, and the second rename would drop the first post from the
 * index — with both reporting success. One lock file per site prevents that.
 *
 * ACQUIRE is an exclusive create (`wx`): the operating system guarantees one
 * winner. A second publisher is not queued; it gets an error naming the holder.
 *
 * A STALE lock — its process is gone, or it is from another machine and older
 * than the limit — is not simply deleted. Its holder may have died half-way
 * through a publish, so whoever takes the lock over must first undo that
 * transaction from the dead holder's run directory. If that directory cannot be
 * read, the lock is NOT taken: the site may be in a state only a person can judge.
 */
import { closeSync, existsSync, openSync, readFileSync, renameSync, rmSync, writeSync } from "node:fs";
import { hostname } from "node:os";
import { randomBytes } from "node:crypto";
import { join } from "node:path";

export const LOCK_FILE = ".blog-publish.lock";
/** A lock from ANOTHER machine is presumed dead after this long. On the same machine the process id decides. */
export const LOCK_STALE_MS = 15 * 60 * 1000;

export interface LockInfo {
  token: string;
  pid: number;
  host: string;
  operation: string;
  runDir: string;
  startedAt: string;
}

export class SiteLockedError extends Error {
  constructor(
    message: string,
    public holder: LockInfo | null,
  ) {
    super(message);
    this.name = "SiteLockedError";
  }
}

function processAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM"; // exists, owned by someone else
  }
}

export function readLock(siteDir: string): LockInfo | null {
  const path = join(siteDir, LOCK_FILE);
  if (!existsSync(path)) return null;
  try {
    const info = JSON.parse(readFileSync(path, "utf8")) as LockInfo;
    return typeof info.pid === "number" && typeof info.token === "string" ? info : null;
  } catch {
    return null;
  }
}

/** Why a lock is stale, or null when its holder must be presumed alive. */
export function staleReason(info: LockInfo | null, now = Date.now()): string | null {
  if (info === null) return "the lock file is unreadable";
  const age = now - Date.parse(info.startedAt);
  if (info.host === hostname()) return processAlive(info.pid) ? null : `its process (${info.pid}) is no longer running`;
  return Number.isFinite(age) && age > LOCK_STALE_MS ? `it was taken on another machine (${info.host}) ${Math.round(age / 60000)} minutes ago` : null;
}

export interface AcquireOptions {
  /** Undo whatever the dead holder left unfinished. Must throw if it cannot. Called BEFORE the lock changes hands. */
  recover?: (dead: LockInfo | null) => void;
}

export interface HeldLock {
  info: LockInfo;
  /** Set when a stale lock was taken over: what was found and why it was stale. */
  tookOver: { from: LockInfo | null; reason: string } | null;
  release: () => void;
}

export function acquireSiteLock(siteDir: string, operation: string, runDir: string, options: AcquireOptions = {}): HeldLock {
  const path = join(siteDir, LOCK_FILE);
  const info: LockInfo = { token: randomBytes(8).toString("hex"), pid: process.pid, host: hostname(), operation, runDir, startedAt: new Date().toISOString() };
  let tookOver: HeldLock["tookOver"] = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const fd = openSync(path, "wx");
      writeSync(fd, `${JSON.stringify(info, null, 2)}\n`);
      closeSync(fd);
      return {
        info,
        tookOver,
        release: () => {
          // Release only our own lock: after a takeover the file may belong to someone else.
          if (readLock(siteDir)?.token === info.token) rmSync(path, { force: true });
        },
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
    const holder = readLock(siteDir);
    const reason = staleReason(holder);
    if (reason === null) {
      throw new SiteLockedError(
        `another ${holder?.operation ?? "publishing operation"} is in progress on this website (process ${holder?.pid} on ${holder?.host}, started ${holder?.startedAt}). Nothing was written. Wait for it to finish and run the command again`,
        holder,
      );
    }
    // Stale. Step aside atomically: of several contenders exactly one rename succeeds; the rest retry and
    // find either no lock or the winner's live one.
    const aside = `${path}.stale-${info.token}`;
    try {
      renameSync(path, aside);
    } catch {
      continue;
    }
    try {
      // Hold the lock ourselves while recovering, so nobody publishes onto a half-restored site.
      const fd = openSync(path, "wx");
      writeSync(fd, `${JSON.stringify({ ...info, operation: `recovery before ${operation}` }, null, 2)}\n`);
      closeSync(fd);
    } catch {
      rmSync(aside, { force: true });
      continue; // someone took it in the gap; they now own recovery
    }
    try {
      options.recover?.(holder);
    } catch (error) {
      // Recovery was not possible: put the stale lock back exactly as it was and refuse.
      rmSync(path, { force: true });
      renameSync(aside, path);
      throw new SiteLockedError(
        `a previous ${holder?.operation ?? "publish"} on this website did not finish (${reason}) and could not be undone automatically: ${(error as Error).message}. The lock was left in place and nothing was written. See the incident recovery guide`,
        holder,
      );
    }
    rmSync(aside, { force: true });
    rmSync(path, { force: true });
    tookOver = { from: holder, reason };
  }
  throw new SiteLockedError("the publishing lock on this website is changing hands; run the command again", readLock(siteDir));
}

/** Run `work` while holding the site's lock. The lock is released whatever happens. */
export function withSiteLock<T>(siteDir: string, operation: string, runDir: string, options: AcquireOptions, work: (lock: HeldLock) => T): T {
  const lock = acquireSiteLock(siteDir, operation, runDir, options);
  try {
    return work(lock);
  } finally {
    lock.release();
  }
}
