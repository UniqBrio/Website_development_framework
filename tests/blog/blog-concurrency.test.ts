/**
 * PUBLISHING CONCURRENCY — the per-site lock, exercised with REAL processes.
 *
 * In-process calls cannot overlap (publishing is synchronous), so the cases that
 * matter — two publishers at once, a publisher killed mid-commit — start separate
 * `blog publish` processes and then compare the website's files with what a
 * correct outcome would be.
 */
import { type ChildProcess, execFileSync, spawn, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { hostname, tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runPipeline } from "../../src/pipeline.js";
import { generateWebsite } from "../../src/generation/generate-website.js";
import { dryRunFixture } from "../fixtures/dry-run-fixture.js";
import { LOCK_FILE, LOCK_STALE_MS, SiteLockedError, acquireSiteLock, approveRun, previewRun, publishRun, readLock, rollbackRun, staleReason } from "../../src/blog/index.js";

const PYTHON = spawnSync("python3", ["--version"]).status === 0 ? "python3" : "python";
const CLI = ["node_modules/vite-node/vite-node.mjs", "src/blog/cli.ts", "--"];
let root = "";
let template = "";
let n = 0;

function snapshot(dir: string): Map<string, string> {
  const out = new Map<string, string>();
  const visit = (d: string): void => {
    for (const name of readdirSync(d).sort()) {
      const full = join(d, name);
      if (statSync(full).isDirectory()) visit(full);
      else out.set(relative(dir, full), readFileSync(full).toString("base64"));
    }
  };
  visit(dir);
  return out;
}
const site = () => {
  const dir = join(root, `site-${(n += 1)}`);
  cpSync(template, dir, { recursive: true });
  return dir;
};
/** A previewed and approved run for a post with its own title, so each has its own route. */
function approvedRun(name: string, target: string): string {
  const src = join(root, `src-${name}-${(n += 1)}`);
  mkdirSync(src, { recursive: true });
  writeFileSync(join(src, "post.md"), `# FIXTURE Post ${name}\n\nBody of ${name}, with the figure 12.5% in it.\n`);
  const run = join(root, `run-${name}-${n}`);
  execFileSync(PYTHON, ["website_workflow/tools/blog_ingest.py", src, "--out", run], { stdio: "pipe" });
  previewRun(run, { siteDir: target });
  approveRun(run, undefined, "FIXTURE Owner", true);
  return run;
}
interface Finished {
  code: number | null;
  output: string;
}
function start(args: string[], env: NodeJS.ProcessEnv = {}): { child: ChildProcess; done: Promise<Finished> } {
  const child = spawn(process.execPath, [...CLI, ...args], { env: { ...process.env, ...env } });
  let output = "";
  child.stdout?.on("data", (d: Buffer) => (output += d.toString()));
  child.stderr?.on("data", (d: Buffer) => (output += d.toString()));
  return { child, done: new Promise((resolve) => child.on("close", (code) => resolve({ code, output }))) };
}
const cli = (args: string[], env: NodeJS.ProcessEnv = {}) => start(args, env).done;
const slugs = (dir: string) => (existsSync(join(dir, "blog-registry.json")) ? (JSON.parse(readFileSync(join(dir, "blog-registry.json"), "utf8")) as { posts: Array<{ slug: string }> }).posts.map((p) => p.slug).sort() : []);
const strays = (dir: string) => [...snapshot(dir).keys()].filter((f) => /\.tmp-|\.stale-/.test(f) || f.endsWith(LOCK_FILE));
async function until(condition: () => boolean, ms = 20000): Promise<void> {
  const end = Date.now() + ms;
  while (!condition()) {
    if (Date.now() > end) throw new Error("timed out waiting for the publisher");
    await new Promise((r) => setTimeout(r, 15));
  }
}

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "blog-lock-"));
  template = join(root, "template");
  const input = dryRunFixture();
  const decided = runPipeline(input);
  for (const [path, content] of Object.entries(generateWebsite(input, decided.output, decided.contract).files)) {
    mkdirSync(dirname(join(template, path)), { recursive: true });
    writeFileSync(join(template, path), content);
  }
});
afterAll(() => {
  if (root) rmSync(root, { recursive: true, force: true });
});

describe("the lock itself", () => {
  it("lets one holder in, tells the second who holds it, and writes nothing", () => {
    const dir = site();
    const run = approvedRun("held", dir);
    const before = snapshot(dir);
    const lock = acquireSiteLock(dir, "publish", "/some/other/run");
    try {
      let error: unknown;
      try {
        publishRun(run, dir, undefined, {});
      } catch (e) {
        error = e;
      }
      expect(error).toBeInstanceOf(SiteLockedError);
      expect((error as Error).message).toMatch(new RegExp(`another publish is in progress on this website \\(process ${process.pid} on .*Nothing was written`));
      expect(() => acquireSiteLock(dir, "rollback", run)).toThrow(SiteLockedError);
      const now = snapshot(dir);
      now.delete(LOCK_FILE);
      expect(now).toEqual(before);
    } finally {
      lock.release();
    }
    expect(existsSync(join(dir, LOCK_FILE))).toBe(false);
    expect(publishRun(run, dir, undefined, {}).state).toBe("published");
  });

  it("is released after success, after a failed publish and after rollback", () => {
    const dir = site();
    const run = approvedRun("release", dir);
    expect(() => publishRun(run, dir, undefined, { beforeCommit: () => { throw new Error("simulated"); } })).toThrow(/restored/);
    expect(strays(dir)).toEqual([]);
    publishRun(run, dir, undefined, {});
    expect(strays(dir)).toEqual([]);
    rollbackRun(run);
    expect(strays(dir)).toEqual([]);
    expect(() => publishRun(join(root, "no-such-run"), dir, undefined, {})).toThrow(/manifest\.json not found/);
    expect(strays(dir)).toEqual([]);
  });

  it("releases only its own lock", () => {
    const dir = site();
    const first = acquireSiteLock(dir, "publish", "/run/a");
    rmSync(join(dir, LOCK_FILE));
    const second = acquireSiteLock(dir, "publish", "/run/b");
    first.release(); // must not remove the lock that now belongs to `second`
    expect(readLock(dir)?.token).toBe(second.info.token);
    second.release();
  });

  it("judges staleness by the process on this machine and by age on another", () => {
    const base = { token: "t", operation: "publish", runDir: "/r", startedAt: new Date().toISOString() };
    expect(staleReason({ ...base, pid: process.pid, host: hostname() })).toBeNull();
    expect(staleReason({ ...base, pid: 2 ** 22 + 12345, host: hostname() })).toMatch(/no longer running/);
    expect(staleReason({ ...base, pid: 1, host: "another-machine" })).toBeNull(); // fresh, cannot be checked: presumed alive
    expect(staleReason({ ...base, pid: 1, host: "another-machine", startedAt: new Date(Date.now() - LOCK_STALE_MS - 60000).toISOString() })).toMatch(/another machine/);
    expect(staleReason(null)).toMatch(/unreadable/);
  });
});

describe("simultaneous publishers (separate processes)", () => {
  it("exactly the publishers that report success are on the site; the rest are told to retry and then succeed", async () => {
    const dir = site();
    const names = ["alpha", "beta", "gamma", "delta"];
    const runs = names.map((name) => approvedRun(name, dir));
    const results = await Promise.all(runs.map((run) => cli(["publish", run, "--site", dir], { BLOG_PUBLISH_HOLD_MS: "120" })));
    const won = results.filter((r) => r.code === 0);
    const lost = results.filter((r) => r.code !== 0);
    expect(won.length).toBeGreaterThanOrEqual(1);
    expect(lost.length).toBeGreaterThanOrEqual(1); // they really did overlap
    for (const r of lost) expect(r.output).toMatch(/another publish is in progress on this website .* Nothing was written\. Wait for it to finish/);
    // The registry, the index and the folders agree with who reported success — nobody's post was dropped.
    expect(slugs(dir)).toHaveLength(won.length);
    const index = readFileSync(join(dir, "static/blog/index.html"), "utf8");
    for (const slug of slugs(dir)) {
      expect(index).toContain(`/blog/${slug}"`);
      expect(existsSync(join(dir, "static/blog", slug, "index.html"))).toBe(true);
    }
    expect(readdirSync(join(dir, "static/blog")).filter((f) => f.startsWith("fixture-post-")).sort()).toEqual(slugs(dir));
    expect(strays(dir)).toEqual([]);
    // Retrying the losers one at a time completes the set.
    for (const [i, r] of results.entries()) if (r.code !== 0) expect((await cli(["publish", runs[i]!, "--site", dir])).code).toBe(0);
    expect(slugs(dir)).toEqual(names.map((x) => `fixture-post-${x}`).sort());
    const final = readFileSync(join(dir, "static/blog/index.html"), "utf8");
    for (const name of names) expect(final).toContain(`FIXTURE Post ${name}`);
  }, 120000);
});

describe("a publisher that dies mid-commit", () => {
  async function killedMidCommit(dir: string, name: string): Promise<{ run: string; before: Map<string, string> }> {
    const run = approvedRun(name, dir);
    const before = snapshot(dir);
    const { child, done } = start(["publish", run, "--site", dir], { BLOG_PUBLISH_HOLD_MS: "250" });
    await until(() => existsSync(join(dir, "static/blog", `fixture-post-${name}`, "index.html")) || existsSync(join(dir, "blog-registry.json")));
    child.kill("SIGKILL");
    await done;
    return { run, before };
  }

  it("leaves a stale lock and a half-written site — which the next publisher undoes before it starts", async () => {
    const dir = site();
    const { run: dead, before } = await killedMidCommit(dir, "killed");
    expect(staleReason(readLock(dir))).toMatch(/no longer running/);
    expect(snapshot(dir)).not.toEqual(before); // it really was interrupted part-way
    const next = approvedRun("survivor", dir);
    const result = await cli(["publish", next, "--site", dir]);
    expect(result.code).toBe(0);
    expect(result.output).toMatch(/a stale publishing lock was found \(its process \(\d+\) is no longer running\); the unfinished publish behind it was undone/);
    expect(slugs(dir)).toEqual(["fixture-post-survivor"]);
    expect(existsSync(join(dir, "static/blog/fixture-post-killed"))).toBe(false);
    expect(existsSync(join(dir, "next/app/blog/fixture-post-killed"))).toBe(false);
    expect(strays(dir)).toEqual([]);
    const journal = readdirSync(join(dead, "publish-tx")).map((id) => JSON.parse(readFileSync(join(dead, "publish-tx", id, "journal.json"), "utf8")) as { state: string });
    expect(journal.map((j) => j.state)).toEqual(["rolled_back"]);
    // The interrupted run can simply be published again.
    expect((await cli(["publish", dead, "--site", dir])).code).toBe(0);
    expect(slugs(dir)).toEqual(["fixture-post-killed", "fixture-post-survivor"]);
  }, 120000);

  it("is restored exactly by rollback of the interrupted run", async () => {
    const dir = site();
    const { run, before } = await killedMidCommit(dir, "undone");
    const result = await cli(["rollback", run]);
    expect(result.output).toMatch(/had not finished; it was undone and the site is as it was before it started/);
    expect(snapshot(dir)).toEqual(before);
  }, 120000);

  it("several publishers racing for the stale lock still leave a consistent site", async () => {
    const dir = site();
    await killedMidCommit(dir, "raced");
    const runs = ["one", "two", "three"].map((name) => approvedRun(name, dir));
    const results = await Promise.all(runs.map((run) => cli(["publish", run, "--site", dir], { BLOG_PUBLISH_HOLD_MS: "60" })));
    expect(results.filter((r) => r.code === 0).length).toBeGreaterThanOrEqual(1);
    expect(slugs(dir)).toHaveLength(results.filter((r) => r.code === 0).length);
    expect(slugs(dir)).not.toContain("fixture-post-raced");
    expect(existsSync(join(dir, "static/blog/fixture-post-raced"))).toBe(false);
    expect(strays(dir)).toEqual([]);
  }, 120000);

  it("is NOT taken over when the dead publisher's run directory is gone: the lock stays and nothing is written", async () => {
    const dir = site();
    const { run: dead } = await killedMidCommit(dir, "lost");
    rmSync(dead, { recursive: true });
    const halfWritten = snapshot(dir);
    const next = approvedRun("blocked", dir);
    const result = await cli(["publish", next, "--site", dir]);
    expect(result.code).toBe(1);
    expect(result.output).toMatch(/did not finish \(its process \(\d+\) is no longer running\) and could not be undone automatically: its run directory .* is not available here.*The lock was left in place and nothing was written/s);
    expect(snapshot(dir)).toEqual(halfWritten);
    // The operator commands describe it and refuse the unsafe shortcuts.
    expect((await cli(["lock-status", dir])).output).toMatch(/STALE: its process/);
    const noForce = await cli(["unlock", dir]);
    expect(noForce.code).toBe(1);
    expect(noForce.output).toMatch(/Remove the lock by hand only after checking the site against version control/);
    expect(existsSync(join(dir, LOCK_FILE))).toBe(true);
    expect((await cli(["unlock", dir, "--force"])).output).toMatch(/lock removed\. The site was NOT changed/);
  }, 120000);

  it("a LIVE lock cannot be removed with unlock --force", async () => {
    const dir = site();
    const lock = acquireSiteLock(dir, "publish", "/r");
    const result = await cli(["unlock", dir, "--force"]);
    lock.release();
    expect(result.code).toBe(1);
    expect(result.output).toMatch(/held by a running process and was not removed/);
  }, 60000);

  it("a lock from another machine is respected while fresh and recoverable once old", () => {
    const dir = site();
    const run = approvedRun("remote", dir);
    const foreign = (startedAt: string, runDir: string) => writeFileSync(join(dir, LOCK_FILE), JSON.stringify({ token: "x", pid: 4242, host: "build-agent-7", operation: "publish", runDir, startedAt }));
    foreign(new Date().toISOString(), run);
    expect(() => publishRun(run, dir, undefined, {})).toThrow(/in progress on this website \(process 4242 on build-agent-7/);
    foreign(new Date(Date.now() - LOCK_STALE_MS - 5000).toISOString(), run);
    utimesSync(join(dir, LOCK_FILE), new Date(), new Date());
    const result = publishRun(run, dir, undefined, {});
    expect(result.state).toBe("published");
    expect(result.lockTakenOver).toMatch(/another machine \(build-agent-7\)/);
  });
});
