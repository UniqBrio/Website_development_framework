/**
 * `npm run blog -- <command> <run dir> [options]`
 *
 *   preview  <run>             map, render and validate; writes preview/ and reports/
 *   approve  <run> --by NAME   record the owner's approval of the current, previewed version
 *   publish  <run> --site DIR  write approved blogs into a website, as one transaction
 *   rollback <run>             undo the most recent publish of this run
 *   status   <run>             readiness and approval state of each blog; nothing written
 *   history  <run>             every recorded operation of this run, oldest first
 *   inspect-site <site dir>    what kind of website this is and whether it can be published to
 *   lock-status <site dir>     who holds the publishing lock, and whether it is stale
 *   unlock <site dir> --force  remove a STALE lock by hand (see the incident recovery guide)
 *
 * Options: --site DIR  --origin URL  --route-base /blog  --site-name NAME  --blog ID
 *          --accept-warnings  --replace  --tx ID  --force
 */
import { approveRun, evaluateBlog, loadManifest, previewRun, previewedCurrentVersion, publishRun, readApproval, rollbackRun } from "./run.js";
import { approvalProblems } from "./publish.js";
import { detectSite, renderSiteProfileMarkdown } from "./site.js";
import { LOCK_FILE, readLock, staleReason } from "./lock.js";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const COMMANDS = ["preview", "approve", "publish", "rollback", "status", "history", "inspect-site", "lock-status", "unlock"];

function parse(argv: string[]): { command: string; target: string; flags: Record<string, string | true> } {
  const [command = "", target = "", ...rest] = argv;
  const flags: Record<string, string | true> = {};
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i] ?? "";
    if (!arg.startsWith("--")) continue;
    const next = rest[i + 1];
    if (next !== undefined && !next.startsWith("--")) {
      flags[arg.slice(2)] = next;
      i += 1;
    } else flags[arg.slice(2)] = true;
  }
  return { command, target, flags };
}

function main(): number {
  const { command, target, flags } = parse(process.argv.slice(2));
  const text = (name: string) => (typeof flags[name] === "string" ? (flags[name] as string) : undefined);
  const options = { siteDir: text("site"), origin: text("origin") ?? null, routeBase: text("route-base"), siteName: text("site-name") ?? null };
  if (!target || !COMMANDS.includes(command)) {
    console.error(`usage: npm run blog -- <${COMMANDS.join("|")}> <run dir | site dir> [--site DIR] [--origin URL] [--route-base /blog] [--blog ID] [--by NAME] [--accept-warnings] [--replace]`);
    return 2;
  }
  try {
    if (command === "inspect-site") {
      const profile = detectSite(target, options.routeBase);
      console.log(renderSiteProfileMarkdown(profile));
      return profile.unsupported.length > 0 ? 1 : 0;
    }
    if (command === "lock-status" || command === "unlock") {
      const holder = readLock(target);
      if (!existsSync(join(target, LOCK_FILE))) {
        console.log("no publishing lock on this website");
        return 0;
      }
      const stale = staleReason(holder);
      console.log(`lock: ${holder ? `${holder.operation} by process ${holder.pid} on ${holder.host}, started ${holder.startedAt}, run ${holder.runDir}` : "unreadable"}`);
      console.log(stale ? `STALE: ${stale}` : "LIVE: its holder is still running");
      if (command === "lock-status") return stale ? 1 : 0;
      if (!stale) throw new Error("the lock is held by a running process and was not removed. Wait for it, or stop that process first");
      if (flags["force"] !== true) {
        throw new Error("a stale lock means a publish may have stopped half-way. Normally just run publish or rollback again: it undoes the unfinished publish and takes the lock over. Remove the lock by hand only after checking the site against version control, with: unlock <site> --force");
      }
      rmSync(join(target, LOCK_FILE), { force: true });
      console.log("lock removed. The site was NOT changed: verify it against version control before publishing again");
      return 0;
    }
    if (command === "history") {
      const path = join(target, "run-record.json");
      const stages = existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as { stages: Array<Record<string, unknown>> }).stages : [];
      if (stages.length === 0) console.log("no recorded operations in this run");
      for (const s of stages) {
        const { stage, at, manifestSha256: _m, ...facts } = s;
        console.log(`${String(at)}  ${String(stage).padEnd(18)} ${Object.entries(facts).map(([k, v]) => `${k}=${typeof v === "string" ? v.slice(0, 80) : JSON.stringify(v)}`).join(" ")}`);
      }
      return 0;
    }
    if (command === "preview") {
      const result = previewRun(target, options);
      if (result.site) {
        console.log(`site: ${result.site.kind}${result.site.unsupported.length > 0 ? " — NOT publishable" : ""}`);
        for (const reason of result.site.unsupported) console.log(`  UNSUPPORTED ${reason}`);
        for (const warning of result.site.warnings) console.log(`  REVIEW      ${warning}`);
      }
      for (const b of result.blogs) {
        console.log(`[${b.blogId}] ${b.readiness.state.replace(/_/g, " ").toUpperCase()}`);
        for (const blocker of b.readiness.blockers) console.log(`  BLOCKER  ${blocker}`);
        if (b.readiness.warningsToAccept.length > 0) console.log(`  WARNINGS ${b.readiness.warningsToAccept.join(", ")}`);
        console.log(`  preview  ${b.previewPath}\n  report   ${b.reportPath}`);
      }
      console.log("\nNothing is published. Review the preview and report, then: npm run blog -- approve <run> --by <name>");
    } else if (command === "status") {
      const manifest = loadManifest(target);
      for (const blog of manifest.blogs) {
        const { report } = evaluateBlog(target, manifest, blog, options);
        const problems = approvalProblems(blog, report, readApproval(target, blog));
        if (problems.length === 0 && !previewedCurrentVersion(target, blog)) problems.push("no preview of this version exists");
        console.log(`[${blog.id}] ${report.readiness.state} · ${problems.length === 0 ? "approved for publishing" : `not publishable: ${problems.join("; ")}`}`);
      }
    } else if (command === "approve") {
      const approval = approveRun(target, text("blog"), text("by") ?? "", flags["accept-warnings"] === true, { ...options, replace: flags["replace"] === true });
      console.log(`approved ${approval.blogId} by ${approval.approvedBy} (digest ${approval.blogDigest.slice(0, 16)})${approval.acceptedWarnings.length ? `; acknowledged: ${approval.acceptedWarnings.join(", ")}` : ""}${approval.replacesDigest ? `; replaces published version ${approval.replacesDigest.slice(0, 16)}` : ""}`);
    } else if (command === "rollback") {
      const result = rollbackRun(target, text("tx"), flags["force"] === true);
      if (result.interrupted) console.log(`publish ${result.transactionId} had not finished; it was undone and the site is as it was before it started`);
      else console.log(`rolled back publish ${result.transactionId}: ${result.removed.length} file(s) removed, ${result.restored.length} restored`);
      for (const kept of result.kept) console.log(`  KEPT ${kept}`);
    } else {
      const site = text("site");
      if (!site) throw new Error("publish needs --site <directory>");
      // Test seam, used only by the concurrency tests: pause before each file is moved into place.
      const hold = Number(process.env["BLOG_PUBLISH_HOLD_MS"] ?? 0);
      const beforeCommit = hold > 0 ? () => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, hold) : undefined;
      const result = publishRun(target, site, text("blog"), { ...options, replace: flags["replace"] === true, beforeCommit });
      if (result.lockTakenOver) console.log(`a stale publishing lock was found (${result.lockTakenOver}); the unfinished publish behind it was undone before this one started`);
      if (result.recovered) console.log(`an interrupted publish (${result.recovered}) was found and undone first`);
      if (result.state === "unchanged") console.log("nothing to do: the site already holds exactly this approved version");
      else console.log(`published ${result.publications.length} blog(s) to a ${result.site.kind} site: ${result.written.length} file(s) created, ${result.replaced.length} replaced (transaction ${result.transactionId})`);
      console.log("These are files for the site's release procedure (website_flow.md Phases 5–6). Nothing was deployed.\nTo undo: npm run blog -- rollback <run>");
    }
    return 0;
  } catch (error) {
    console.error(`blog ${command}: ${(error as Error).message}`);
    return 1;
  }
}

process.exit(main());
