/**
 * `npm run blog -- <command> <run dir> [options]`
 *
 *   preview <run>            map, render and validate; writes preview/ and reports/
 *   approve <run> --by NAME  record the owner's approval of the current version
 *   publish <run> --site DIR write approved blogs into a site directory
 *   status  <run>            readiness of each blog, nothing written
 *
 * Options: --site DIR  --origin URL  --route-base /blog  --site-name NAME
 *          --blog ID   --accept-warnings
 */
import { approveRun, evaluateBlog, loadManifest, previewRun, publishRun, readApproval } from "./run.js";
import { approvalProblems } from "./publish.js";

function parse(argv: string[]): { command: string; run: string; flags: Record<string, string | true> } {
  const [command = "", run = "", ...rest] = argv;
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
  return { command, run, flags };
}

function main(): number {
  const { command, run, flags } = parse(process.argv.slice(2));
  const text = (name: string) => (typeof flags[name] === "string" ? (flags[name] as string) : undefined);
  const options = { siteDir: text("site"), origin: text("origin") ?? null, routeBase: text("route-base"), siteName: text("site-name") ?? null };
  if (!run || !["preview", "approve", "publish", "status"].includes(command)) {
    console.error("usage: npm run blog -- <preview|approve|publish|status> <run dir> [--site DIR] [--origin URL] [--route-base /blog] [--blog ID] [--by NAME] [--accept-warnings]");
    return 2;
  }
  try {
    if (command === "preview") {
      for (const b of previewRun(run, options).blogs) {
        console.log(`[${b.blogId}] ${b.readiness.state.replace(/_/g, " ").toUpperCase()}`);
        for (const blocker of b.readiness.blockers) console.log(`  BLOCKER  ${blocker}`);
        if (b.readiness.warningsToAccept.length > 0) console.log(`  WARNINGS ${b.readiness.warningsToAccept.join(", ")}`);
        console.log(`  preview  ${b.previewPath}\n  report   ${b.reportPath}`);
      }
      console.log("\nNothing is published. Review the preview and report, then: npm run blog -- approve <run> --by <name>");
    } else if (command === "status") {
      const manifest = loadManifest(run);
      for (const blog of manifest.blogs) {
        const { report } = evaluateBlog(run, manifest, blog, options);
        const problems = approvalProblems(blog, report, readApproval(run, blog));
        console.log(`[${blog.id}] ${report.readiness.state} · ${problems.length === 0 ? "approved for publishing" : `not publishable: ${problems.join("; ")}`}`);
      }
    } else if (command === "approve") {
      const approval = approveRun(run, text("blog"), text("by") ?? "", flags["accept-warnings"] === true, options);
      console.log(`approved ${approval.blogId} by ${approval.approvedBy} (digest ${approval.blogDigest.slice(0, 16)})${approval.acceptedWarnings.length ? `; acknowledged: ${approval.acceptedWarnings.join(", ")}` : ""}`);
    } else {
      const site = text("site");
      if (!site) throw new Error("publish needs --site <directory>");
      const result = publishRun(run, site, text("blog"), options);
      console.log(`published ${result.publications.length} blog(s): ${result.written.length} file(s) written, ${result.copied.length} asset file(s) copied into ${site}`);
      console.log("These are files for the site's release procedure (website_flow.md Phases 5–6). Nothing was deployed.");
    }
    return 0;
  } catch (error) {
    console.error(`blog ${command}: ${(error as Error).message}`);
    return 1;
  }
}

process.exit(main());
