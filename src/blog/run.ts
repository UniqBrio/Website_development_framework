/**
 * RUN DIRECTORY OPERATIONS — the filesystem side of the blog branch.
 *
 * A run directory is one ingest: `manifest.json` + `assets/` written by
 * blog_ingest.py, then `preview/`, `reports/`, `approvals/`, `publish-tx/` and
 * `run-record.json` written here. Each stage records the digest of what it
 * consumed, so extraction → mapping → preview → approval → publish can be traced
 * and a stale stage is detectable.
 *
 * PUBLISHING IS A TRANSACTION. Every file is first written beside its
 * destination under a temporary name, every file that will be replaced is backed
 * up into the run directory, and only then are the temporary files renamed into
 * place. A failure at any point restores the site to exactly what it was; an
 * interrupted publish is recovered the next time `publish` or `rollback` runs.
 */
import { createHash, randomBytes } from "node:crypto";
import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, rmdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { type Blog, type BlogManifest, checkBlogIntegrity, parseBlogManifest } from "./manifest.js";
import { type BlogPage, type BlogSiteContext, mapBlogToPage, publishedAssetName } from "./map.js";
import { renderArticle, toHtml } from "./render.js";
import { type ValidationReport, renderReportMarkdown, validateBlog } from "./validate.js";
import { blogCss } from "./css.js";
import { type ApprovalRecord, type PublishedPost, type Publication, addToSitemap, approvalProblems, blogDigest, publishBlog, renderBlogDocument, renderReviewPanel } from "./publish.js";
import { type LockInfo, withSiteLock } from "./lock.js";
import { REGISTRY_FILE, type SiteProfile, detectSite, normaliseRouteBase, renderSiteProfileMarkdown } from "./site.js";

export interface RunOptions extends BlogSiteContext {
  /** The website to preview against and publish into. */
  siteDir?: string;
}

const MAX_MANIFEST_BYTES = 64 * 1024 * 1024;

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

export function loadManifest(runDir: string): BlogManifest {
  const path = join(runDir, "manifest.json");
  if (!existsSync(path)) throw new Error(`${path} not found — run website_workflow/tools/blog_ingest.py first`);
  if (statSync(path).size > MAX_MANIFEST_BYTES) throw new Error(`${path} is larger than ${MAX_MANIFEST_BYTES / 2 ** 20} MB and was not read`);
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`${path} is not valid JSON (${(error as Error).message.slice(0, 120)})`);
  }
  return parseBlogManifest(parsed);
}

/**
 * Why a manifest asset path may not be read, or null. An asset must be a regular
 * file inside this run's `assets/` folder: not a link, and not a path that
 * resolves elsewhere — a manifest is data, and data does not get to name
 * arbitrary files on the machine for copying into a public website.
 */
function assetPathProblem(runDir: string, rel: string): string | null {
  if (rel.includes("\\") || rel.split("/").some((part) => part === ".." || part === "") || !rel.startsWith("assets/")) return "is not a plain path under assets/";
  const full = join(runDir, rel);
  if (!existsSync(full)) return null; // reported as missing by the size check
  if (lstatSync(full).isSymbolicLink()) return "is a symbolic link";
  if (!lstatSync(full).isFile()) return "is not a regular file";
  const base = realpathSync(join(runDir, "assets"));
  const real = realpathSync(full);
  return real.startsWith(base + sep) ? null : "resolves outside the run's assets folder";
}

function integrity(runDir: string, blog: Blog): string[] {
  const unsafe = blog.assets.flatMap((a) => {
    const problem = assetPathProblem(runDir, a.path);
    return problem ? [`asset ${a.id} (${a.filename}): its path ${problem}`] : [];
  });
  if (unsafe.length > 0) return unsafe;
  return checkBlogIntegrity(blog, {
    fileSize: (rel) => (existsSync(join(runDir, rel)) ? statSync(join(runDir, rel)).size : null),
    fileSha256: (rel) => (existsSync(join(runDir, rel)) ? sha256(join(runDir, rel)) : null),
  });
}

export interface Evaluated {
  blog: Blog;
  page: BlogPage;
  report: ValidationReport;
}

function siteContext(options: RunOptions): BlogSiteContext {
  return { ...options, routeBase: normaliseRouteBase(options.routeBase) };
}

/** Map, render and validate one blog against the files actually in the run directory. */
export function evaluateBlog(runDir: string, manifest: BlogManifest, blog: Blog, site: BlogSiteContext): Evaluated {
  const page = mapBlogToPage(blog, { ...site, routeBase: normaliseRouteBase(site.routeBase) });
  const articleHtml = toHtml(renderArticle(page, { mode: "publish" }));
  const report = validateBlog({ blog, page, articleHtml, integrityProblems: integrity(runDir, blog), packageIssues: manifest.issues });
  return { blog, page, report };
}

interface StageRecord {
  stage: string;
  at: string;
  manifestSha256: string;
  [key: string]: unknown;
}

function readRecord(runDir: string): { stages: StageRecord[] } {
  const path = join(runDir, "run-record.json");
  if (!existsSync(path)) return { stages: [] };
  try {
    return JSON.parse(readFileSync(path, "utf8")) as { stages: StageRecord[] };
  } catch {
    return { stages: [] };
  }
}

function record(runDir: string, stage: string, facts: Record<string, unknown>): void {
  const current = readRecord(runDir);
  current.stages.push({ stage, at: new Date().toISOString(), manifestSha256: sha256(join(runDir, "manifest.json")), ...facts });
  writeAtomic(join(runDir, "run-record.json"), `${JSON.stringify(current, null, 2)}\n`);
}

function writeAtomic(path: string, content: string | Buffer): void {
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.tmp-${randomBytes(4).toString("hex")}`;
  writeFileSync(temp, content);
  renameSync(temp, path);
}

export interface PreviewResult {
  site: SiteProfile | null;
  blogs: Array<{ blogId: string; slug: string; previewPath: string; reportPath: string; readiness: ValidationReport["readiness"] }>;
}

export function previewRun(runDir: string, options: RunOptions = {}): PreviewResult {
  const manifest = loadManifest(runDir);
  const context = siteContext(options);
  const profile = options.siteDir ? detectSite(options.siteDir, context.routeBase) : null;
  const out: PreviewResult = { site: profile, blogs: [] };
  const previewRoot = join(runDir, "preview");
  rmSync(previewRoot, { recursive: true, force: true }); // a preview never mixes with an earlier one

  // The site's own stylesheets, copied so the preview opens from disk.
  const cssHrefs: string[] = [];
  if (profile?.staticRoot) {
    for (const [i, href] of profile.stylesheets.entries()) {
      const local = href.startsWith("/") && !href.startsWith("//") ? join(profile.staticRoot, href.split("?")[0]!) : null;
      if (local && existsSync(local) && statSync(local).isFile()) {
        writeAtomic(join(previewRoot, `site-${i}.css`), readFileSync(local));
        cssHrefs.push(`../site-${i}.css`);
      }
    }
  } else if (profile?.nextAppDir && existsSync(join(profile.nextAppDir, "globals.css"))) {
    writeAtomic(join(previewRoot, "site-0.css"), readFileSync(join(profile.nextAppDir, "globals.css")));
    cssHrefs.push("../site-0.css");
  }
  writeAtomic(join(previewRoot, "blog.css"), blogCss());
  if (profile) {
    writeAtomic(join(runDir, "reports", "site-compatibility.md"), renderSiteProfileMarkdown(profile));
    writeAtomic(join(runDir, "reports", "site-compatibility.json"), `${JSON.stringify({ ...profile, staticChrome: undefined, nextChrome: undefined }, null, 2)}\n`);
  }

  for (const blog of manifest.blogs) {
    // The published route decides readiness; the preview itself uses relative asset URLs so it opens from disk.
    const { report } = evaluateBlog(runDir, manifest, blog, context);
    const previewPage = mapBlogToPage(blog, { ...context, assetBase: "assets" });
    const dir = join(previewRoot, blog.slug);
    const safe = integrity(runDir, blog).length === 0;
    for (const asset of blog.assets) {
      const from = join(runDir, asset.path);
      if (!safe || assetPathProblem(runDir, asset.path) || !existsSync(from)) continue;
      mkdirSync(join(dir, "assets"), { recursive: true });
      copyFileSync(from, join(dir, "assets", publishedAssetName(asset)));
    }
    const html = renderBlogDocument(previewPage, { mode: "preview", cssHrefs: [...cssHrefs, "../blog.css"], chrome: profile?.staticChrome, reviewPanel: renderReviewPanel(blog, previewPage, report), standalone: profile?.kind !== "generated" });
    writeAtomic(join(dir, "index.html"), html);
    writeAtomic(join(runDir, "reports", `${blog.slug}.validation.json`), `${JSON.stringify(report, null, 2)}\n`);
    writeAtomic(join(runDir, "reports", `${blog.slug}.validation.md`), renderReportMarkdown(report));
    writeAtomic(
      join(runDir, "reports", `${blog.slug}.mapping.json`),
      `${JSON.stringify({ blogId: blog.id, route: report.route, digest: blogDigest(blog), ledger: report.mapping, adaptations: report.adaptations, seoUnresolved: report.seoUnresolved }, null, 2)}\n`,
    );
    out.blogs.push({ blogId: blog.id, slug: blog.slug, previewPath: join(dir, "index.html"), reportPath: join(runDir, "reports", `${blog.slug}.validation.md`), readiness: report.readiness });
    record(runDir, "preview", { blogId: blog.id, blogDigest: blogDigest(blog), readiness: report.readiness.state, siteKind: profile?.kind ?? null, siteStylesheets: cssHrefs.length });
  }
  return out;
}

function approvalPath(runDir: string, blog: Blog): string {
  return join(runDir, "approvals", `${blog.id}.${blog.slug}.approval.json`);
}

export function readApproval(runDir: string, blog: Blog): ApprovalRecord | null {
  const path = approvalPath(runDir, blog);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as ApprovalRecord;
  } catch {
    return null;
  }
}

/** True when a preview of exactly this version of the blog has been generated in this run. */
export function previewedCurrentVersion(runDir: string, blog: Blog): boolean {
  const digest = blogDigest(blog);
  return existsSync(join(runDir, "preview", blog.slug, "index.html")) && readRecord(runDir).stages.some((s) => s.stage === "preview" && s["blogId"] === blog.id && s["blogDigest"] === digest);
}

function readRegistry(siteDir: string): PublishedPost[] {
  const path = join(siteDir, REGISTRY_FILE);
  if (!existsSync(path)) return [];
  try {
    return (JSON.parse(readFileSync(path, "utf8")) as { posts: PublishedPost[] }).posts ?? [];
  } catch {
    throw new Error(`${path} exists but is not valid JSON; it records what is published on this site, so it was not overwritten. Repair or restore it first`);
  }
}

export interface ApproveOptions extends RunOptions {
  /** The owner approves REPLACING the post with this slug that is already published on `siteDir`. */
  replace?: boolean;
}

/**
 * Record the owner's approval of the CURRENT version of a blog. Refused while the
 * blog is blocked, before a preview of this exact version exists, or with
 * warnings the approver has not acknowledged.
 */
export function approveRun(runDir: string, blogId: string | undefined, approvedBy: string, acceptWarnings: boolean, options: ApproveOptions = {}): ApprovalRecord {
  if (!approvedBy.trim()) throw new Error("an approval needs the approver's name (--by)");
  const manifest = loadManifest(runDir);
  const blog = blogId ? manifest.blogs.find((b) => b.id === blogId || b.slug === blogId) : manifest.blogs.length === 1 ? manifest.blogs[0] : undefined;
  if (!blog) throw new Error(blogId ? `no blog "${blogId}" in this run` : `this run holds ${manifest.blogs.length} blogs; name one with --blog`);
  const { report } = evaluateBlog(runDir, manifest, blog, options);
  if (report.readiness.state === "blocked") throw new Error(`cannot approve ${blog.id}: ${report.readiness.blockers.length} blocker(s) — ${report.readiness.blockers.slice(0, 3).join(" | ")}`);
  if (!previewedCurrentVersion(runDir, blog)) throw new Error(`cannot approve ${blog.id}: no preview of this version exists. Run "npm run blog -- preview" and review it first`);
  if (report.readiness.warningsToAccept.length > 0 && !acceptWarnings) {
    throw new Error(`${blog.id} has warnings (${report.readiness.warningsToAccept.join(", ")}); review them in the report and approve with --accept-warnings to acknowledge them`);
  }
  let replacesDigest: string | null = null;
  if (options.replace) {
    if (!options.siteDir) throw new Error("approving a replacement needs --site, so the approval can name the published version it replaces");
    const current = readRegistry(options.siteDir).find((p) => p.slug === blog.slug);
    if (!current) throw new Error(`nothing with the slug "${blog.slug}" is published on that site, so there is nothing to replace`);
    replacesDigest = current.blogDigest;
  }
  const approval: ApprovalRecord = {
    blogId: blog.id,
    blogDigest: blogDigest(blog),
    approvedBy: approvedBy.trim().replace(/[\r\n]+/g, " ").slice(0, 120),
    approvedAt: new Date().toISOString(),
    acceptedWarnings: acceptWarnings ? report.readiness.warningsToAccept : [],
    readinessAtApproval: report.readiness.state,
    replacesDigest,
  };
  writeAtomic(approvalPath(runDir, blog), `${JSON.stringify(approval, null, 2)}\n`);
  record(runDir, "approval", { blogId: blog.id, blogDigest: approval.blogDigest, approvedBy: approval.approvedBy, acceptedWarnings: approval.acceptedWarnings, replacesDigest });
  return approval;
}

// ------------------------------------------------------------------ publish transaction

interface JournalEntry {
  /** Destination, relative to the site root. */
  path: string;
  action: "create" | "replace" | "delete";
  /** For `replace` and `delete`: where the previous content was saved, relative to the transaction folder. */
  backup?: string;
  /** SHA-256 of the content this transaction wrote. Rollback checks it before deleting or restoring. */
  sha256: string;
  done: boolean;
}

interface Journal {
  schema: "framework:blog-publish-tx@1";
  id: string;
  siteDir: string;
  state: "prepared" | "committed" | "rolled_back";
  startedAt: string;
  blogs: Array<{ blogId: string; slug: string; blogDigest: string }>;
  entries: JournalEntry[];
}

export interface PublishOptions extends RunOptions {
  /** Replace a post already published under the same slug. Needs an approval that names the replaced version. */
  replace?: boolean;
  /** Test seam: called before each file is moved into place; throwing simulates an interruption. */
  beforeCommit?: (index: number, path: string) => void;
}

export interface PublishResult {
  state: "published" | "unchanged";
  transactionId: string | null;
  site: SiteProfile;
  written: string[];
  replaced: string[];
  publications: Publication[];
  recovered: string | null;
  /** Why a stale lock was taken over before this publish, or null. */
  lockTakenOver?: string | null;
}

// ------------------------------------------------------------------ site-level publish history
//
// Each run directory knows only its OWN transactions. Rolling back an older publish after a newer one
// from another run had changed the same shared files (blog index, registry) used to "succeed" while
// leaving an index that listed a removed post (staging test, 2026-11-13). The site therefore keeps a
// short history of committed transactions and the files each touched, so rollback can see later ones.
// It holds site-relative paths, transaction ids and run-directory NAMES only — no absolute paths, no
// approver — because on a static site it sits in the web root.

export const HISTORY_FILE = ".blog-publish-history.json";

interface HistoryEntry {
  id: string;
  run: string;
  slugs: string[];
  committedAt: string;
  paths: string[];
}

function readHistory(siteRoot: string): HistoryEntry[] {
  const path = join(siteRoot, HISTORY_FILE);
  if (!existsSync(path)) return [];
  try {
    return (JSON.parse(readFileSync(path, "utf8")) as { transactions: HistoryEntry[] }).transactions ?? [];
  } catch {
    throw new Error(`${path} is not valid JSON; it records which publishes touched which files, so it was not overwritten. Restore it from version control`);
  }
}

function writeHistory(siteRoot: string, entries: HistoryEntry[]): void {
  writeAtomic(join(siteRoot, HISTORY_FILE), `${JSON.stringify({ schema: "framework:blog-publish-history@1", generator: "website-workflow-blog", transactions: entries }, null, 2)}\n`);
}

/** Later, still-live publishes that touched any of the same files: these must be rolled back first. */
function laterOverlapping(siteRoot: string, journal: Journal): HistoryEntry[] {
  const history = readHistory(siteRoot);
  const mine = history.findIndex((h) => h.id === journal.id);
  const paths = new Set(journal.entries.map((e) => e.path));
  const later = mine >= 0 ? history.slice(mine + 1) : history.filter((h) => h.committedAt > journal.startedAt);
  return later.filter((h) => h.id !== journal.id && h.paths.some((p) => paths.has(p)));
}

function txRoot(runDir: string): string {
  return join(runDir, "publish-tx");
}

function journalPath(runDir: string, id: string): string {
  return join(txRoot(runDir), id, "journal.json");
}

function listJournals(runDir: string): Journal[] {
  if (!existsSync(txRoot(runDir))) return [];
  return readdirSync(txRoot(runDir))
    .sort()
    .flatMap((id) => {
      try {
        return [JSON.parse(readFileSync(journalPath(runDir, id), "utf8")) as Journal];
      } catch {
        return [];
      }
    });
}

function removeEmptyDirs(siteDir: string, relPath: string): void {
  let dir = dirname(join(siteDir, relPath));
  while (dir.startsWith(siteDir + sep) && existsSync(dir) && readdirSync(dir).length === 0) {
    rmdirSync(dir);
    dir = dirname(dir);
  }
}

/**
 * Undo a transaction: delete what it created, restore what it replaced. Returns what could not be undone.
 *
 * What was actually applied is read from the DISK, not from the journal's flags. A publisher that is
 * killed mid-commit never gets to record which renames it had completed, so for an unfinished
 * (`prepared`) transaction each destination is compared with the content the transaction meant to
 * write: a match means that step happened and is undone; anything else means it had not happened yet
 * and the file is left exactly as it is.
 */
function undo(runDir: string, journal: Journal, force: boolean): string[] {
  const kept: string[] = [];
  const unfinished = journal.state === "prepared";
  for (const entry of [...journal.entries].reverse()) {
    const dest = join(journal.siteDir, entry.path);
    for (const leftover of existsSync(dirname(dest)) ? readdirSync(dirname(dest)).filter((f) => f.includes(`.tmp-${journal.id}`)) : []) rmSync(join(dirname(dest), leftover), { force: true });
    const backup = entry.backup ? join(txRoot(runDir), journal.id, entry.backup) : null;
    if (entry.action === "delete") {
      if (backup && !existsSync(dest) && (unfinished || entry.done)) {
        mkdirSync(dirname(dest), { recursive: true });
        copyFileSync(backup, dest);
      }
      entry.done = false;
      continue;
    }
    const holdsOurContent = existsSync(dest) && sha256(dest) === entry.sha256;
    if (unfinished) {
      if (!holdsOurContent) {
        if (entry.action === "create") removeEmptyDirs(journal.siteDir, entry.path);
        continue; // this step had not been applied
      }
    } else {
      if (!entry.done) continue;
      if (existsSync(dest) && !holdsOurContent && !force) {
        kept.push(`${entry.path} was changed after it was published and was left as it is`);
        continue;
      }
    }
    if (entry.action === "create") {
      rmSync(dest, { force: true });
      removeEmptyDirs(journal.siteDir, entry.path);
    } else if (backup) {
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(backup, dest);
    }
    entry.done = false;
  }
  // An undone publish leaves the history exactly as it was before that publish: the site's files must come
  // back byte for byte, the history included. An empty history is removed.
  const history = readHistory(journal.siteDir);
  if (history.some((h) => h.id === journal.id)) {
    const remaining = history.filter((h) => h.id !== journal.id);
    if (remaining.length > 0) writeHistory(journal.siteDir, remaining);
    else rmSync(join(journal.siteDir, HISTORY_FILE), { force: true });
  }
  journal.state = "rolled_back";
  writeAtomic(journalPath(runDir, journal.id), `${JSON.stringify(journal, null, 2)}\n`);
  return kept;
}

/** Finish an interrupted publish by undoing it. Returns the transaction id recovered, or null. */
export function recoverInterruptedPublish(runDir: string): string | null {
  const pending = listJournals(runDir).find((j) => j.state === "prepared");
  if (!pending) return null;
  undo(runDir, pending, true);
  if (existsSync(join(runDir, "manifest.json"))) record(runDir, "publish-recovered", { transactionId: pending.id, siteDir: pending.siteDir });
  return pending.id;
}

/** Files a killed publisher staged but never renamed and never journalled: `<name>.tmp-<transaction id>`. */
function sweepStagedFiles(dir: string, depth = 0): number {
  if (depth > 8 || !existsSync(dir)) return 0;
  let removed = 0;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".git" || name === ".next") continue;
    const full = join(dir, name);
    const stat = lstatSync(full);
    if (stat.isDirectory()) removed += sweepStagedFiles(full, depth + 1);
    else if (/\.tmp-\d{14}-[0-9a-f]{6}$/.test(name)) {
      rmSync(full, { force: true });
      removed += 1;
    }
  }
  return removed;
}

/**
 * What a publisher must do before it may take over a lock whose holder died:
 * undo the dead holder's unfinished transaction. THROWS when that is not
 * possible, and the lock then stays where it is (lock.ts).
 */
function recoverDeadHolder(siteDir: string, profile: SiteProfile): (dead: LockInfo | null) => void {
  return (dead) => {
    if (dead === null) throw new Error("the lock file is unreadable, so the run that held it is unknown");
    if (!existsSync(dead.runDir)) throw new Error(`its run directory ${dead.runDir} is not available here, so an unfinished publish cannot be ruled out or undone`);
    recoverInterruptedPublish(dead.runDir);
    // Staged files from before its journal was written are in no journal; they are only ever ours.
    void siteDir;
    for (const dir of [profile.staticRoot, profile.nextAppDir, profile.nextPublicDir]) if (dir) sweepStagedFiles(dir);
  };
}

function destinationOf(profile: SiteProfile, key: string): string | null {
  if (key === REGISTRY_FILE) return join(profile.root, REGISTRY_FILE);
  if (key.startsWith("static/")) return profile.staticRoot ? join(profile.staticRoot, key.slice(7)) : null;
  if (key.startsWith("next/app/")) return profile.nextAppDir ? join(profile.nextAppDir, key.slice(9)) : null;
  if (key.startsWith("next/public/")) return profile.nextPublicDir && profile.nextAppDir ? join(profile.nextPublicDir, key.slice(12)) : null;
  return null;
}

/**
 * Publish every APPROVED blog of a run into a website, as one transaction.
 * Nothing is written unless the site is supported, every blog is authorised and
 * no destination collides with a file this workflow did not publish.
 */
export function publishRun(runDir: string, siteDir: string, blogId: string | undefined, options: PublishOptions = {}): PublishResult {
  if (!existsSync(siteDir) || !statSync(siteDir).isDirectory()) throw new Error(`this website cannot be published to, and nothing was written: ${siteDir} is not a directory`);
  const root = realpathSync(siteDir);
  const routeBase = normaliseRouteBase(options.routeBase);
  // The lock comes FIRST. Looking at the site before holding it would mean looking at another
  // publisher's half-written files — and mistaking them for content this workflow did not create.
  const recover = (dead: LockInfo | null) => recoverDeadHolder(root, detectSite(root, routeBase))(dead);
  return withSiteLock(root, "publish", runDir, { recover }, (lock) => {
    if (lock.tookOver && existsSync(join(runDir, "manifest.json"))) record(runDir, "lock-taken-over", { reason: lock.tookOver.reason, previousRun: lock.tookOver.from?.runDir ?? null });
    const result = publishLocked(runDir, siteDir, blogId, options);
    result.lockTakenOver = lock.tookOver ? lock.tookOver.reason : null;
    return result;
  });
}

function publishLocked(runDir: string, siteDir: string, blogId: string | undefined, options: PublishOptions): PublishResult {
  const recovered = recoverInterruptedPublish(runDir);
  const manifest = loadManifest(runDir);
  const context = siteContext(options);
  const targets = blogId ? manifest.blogs.filter((b) => b.id === blogId || b.slug === blogId) : manifest.blogs;
  if (targets.length === 0) throw new Error(`no blog "${blogId ?? ""}" in this run`);

  const profile = detectSite(siteDir, context.routeBase);
  if (profile.unsupported.length > 0) throw new Error(`this website cannot be published to, and nothing was written: ${profile.unsupported.join("; ")}`);
  let posts = readRegistry(siteDir);

  const routes = targets.map((blog) => mapBlogToPage(blog, context).route);
  const duplicate = routes.find((r, i) => routes.indexOf(r) !== i);
  if (duplicate) throw new Error(`two blogs in this run would publish to ${duplicate}; give one a different slug`);


  // ---- 1. authorise everything before anything is written
  const evaluated = targets.map((blog) => {
    const item = evaluateBlog(runDir, manifest, blog, context);
    const approval = readApproval(runDir, blog);
    const problems = approvalProblems(blog, item.report, approval);
    if (problems.length === 0 && !previewedCurrentVersion(runDir, blog)) problems.push("no preview of this version exists in the run; preview and approve it first");
    const published = posts.find((p) => p.slug === blog.slug);
    if (problems.length === 0 && published && published.blogDigest !== blogDigest(blog)) {
      if (!options.replace) problems.push(`a different post is already published at ${item.page.route}; publishing would replace it. Approve the replacement (approve --replace --site …) and publish with --replace, or change the slug`);
      else if (approval?.replacesDigest !== published.blogDigest) problems.push(`the approval does not name the version currently published at ${item.page.route}; approve again with --replace --site so the owner approves replacing exactly that version`);
    }
    if (problems.length > 0) throw new Error(`blog ${blog.id} is not authorised for publishing: ${problems.join("; ")}`);
    return { ...item, approval };
  });
  // ---- 2. build the complete plan in memory
  const plan = new Map<string, { content?: string; from?: string }>();
  const publications: Publication[] = [];
  for (const { blog, page, report, approval } of evaluated) {
    const publication = publishBlog({
      blog,
      page,
      report,
      approval,
      existingPosts: posts,
      routeBase: context.routeBase,
      siteName: options.siteName,
      origin: options.origin,
      siteCssHrefs: profile.kind === "generated" && profile.stylesheets.length === 0 ? ["/styles.css"] : profile.stylesheets,
      staticChrome: profile.staticChrome,
      nextChrome: profile.nextChrome,
      standalone: profile.kind !== "generated",
      nextWrapMain: profile.kind === "next-app-router" && !profile.layoutHasMain,
    });
    posts = [...posts.filter((p) => p.slug !== publication.post.slug), publication.post];
    for (const [key, content] of Object.entries(publication.files)) {
      const dest = destinationOf(profile, key);
      if (dest) plan.set(dest, { content });
    }
    for (const copy of publication.copies) {
      for (const to of copy.to) {
        const dest = destinationOf(profile, to);
        if (dest) plan.set(dest, { from: join(runDir, copy.from) });
      }
    }
    publications.push(publication);
  }
  if (options.origin) {
    const origin = options.origin.replace(/\/+$/, "");
    const urls = [...publications.flatMap((p) => (p.sitemapEntry ? [p.sitemapEntry] : [])), `${origin}${context.routeBase}`];
    for (const sitemap of [profile.staticRoot ? join(profile.staticRoot, "sitemap.xml") : null, profile.nextPublicDir ? join(profile.nextPublicDir, "sitemap.xml") : null]) {
      if (sitemap && existsSync(sitemap)) {
        const next = addToSitemap(readFileSync(sitemap, "utf8"), urls);
        if (next !== readFileSync(sitemap, "utf8")) plan.set(sitemap, { content: next });
      }
    }
  }

  // ---- 3. drop what is already identical (a retry of a finished publish changes nothing)
  const root = realpathSync(siteDir);
  const bytesOf = (item: { content?: string; from?: string }) => (item.content !== undefined ? Buffer.from(item.content, "utf8") : readFileSync(item.from!));
  const changes = [...plan.entries()].filter(([dest, item]) => !(existsSync(dest) && statSync(dest).isFile() && readFileSync(dest).equals(bytesOf(item))));
  const result: PublishResult = { state: "unchanged", transactionId: null, site: profile, written: [], replaced: [], publications, recovered };
  if (changes.length === 0) return result;
  const base = context.routeBase!.slice(1);

  // ---- 4. collisions: only files this workflow owns may be replaced
  const ownedSlugs = new Set([...readRegistry(siteDir).map((p) => p.slug)]);
  // The same approved version may be re-rendered in place (for example after a tool update): its content is unchanged.
  const sameVersion = new Set(evaluated.filter((e) => readRegistry(siteDir).some((p) => p.slug === e.blog.slug && p.blogDigest === blogDigest(e.blog))).map((e) => e.blog.slug));
  for (const [dest] of changes) {
    if (!existsSync(dest)) continue;
    const rel = relative(siteDir, dest).split(sep).join("/");
    const shared = rel === REGISTRY_FILE || rel.endsWith("sitemap.xml") || new RegExp(`(^|/)${base}/(index\\.html|blog\\.css|page\\.tsx)$`).test(rel);
    const slug = new RegExp(`(^|/)${base}/([^/]+)/`).exec(rel)?.[2];
    if (!shared && !(slug && ownedSlugs.has(slug) && (options.replace || sameVersion.has(slug)))) {
      throw new Error(`refusing to overwrite ${rel}: it exists on the site and is not a post this workflow may replace. Nothing was written`);
    }
    if (lstatSync(dest).isSymbolicLink()) throw new Error(`refusing to write through the symbolic link ${rel}. Nothing was written`);
  }
  for (const [dest] of changes) {
    // every destination stays inside the site, whatever the manifest or options said
    let probe = dirname(dest);
    while (!existsSync(probe)) probe = dirname(probe);
    if (!(realpathSync(probe) + sep).startsWith(root + sep)) throw new Error(`refusing to write outside the site directory (${relative(siteDir, dest)}). Nothing was written`);
  }

  // ---- 4b. replacing a post removes the files of the old version that the new one does not use
  const stale: string[] = [];
  if (options.replace) {
    for (const e of evaluated) {
      for (const dir of [profile.staticRoot ? join(profile.staticRoot, base, e.blog.slug) : null, profile.nextAppDir ? join(profile.nextAppDir, base, e.blog.slug) : null, profile.nextPublicDir && profile.nextAppDir ? join(profile.nextPublicDir, base, e.blog.slug) : null]) {
        if (!dir || !existsSync(dir)) continue;
        const visit = (d: string): void => {
          for (const name of readdirSync(d)) {
            const full = join(d, name);
            if (statSync(full).isDirectory()) visit(full);
            else if (!plan.has(full)) stale.push(full);
          }
        };
        visit(dir);
      }
    }
  }

  // ---- 5. prepare: stage beside each destination, back up what will be replaced, write the journal
  const id = `${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}-${randomBytes(3).toString("hex")}`;
  const journal: Journal = {
    schema: "framework:blog-publish-tx@1",
    id,
    siteDir: root,
    state: "prepared",
    startedAt: new Date().toISOString(),
    blogs: evaluated.map((e) => ({ blogId: e.blog.id, slug: e.blog.slug, blogDigest: blogDigest(e.blog) })),
    entries: [],
  };
  const staged: Array<{ temp: string; dest: string }> = [];
  try {
    for (const [dest, item] of changes) {
      const rel = relative(siteDir, dest).split(sep).join("/");
      const bytes = bytesOf(item);
      const entry: JournalEntry = { path: rel, action: existsSync(dest) ? "replace" : "create", sha256: createHash("sha256").update(bytes).digest("hex"), done: false };
      if (entry.action === "replace") {
        entry.backup = `backup/${journal.entries.length}`;
        mkdirSync(join(txRoot(runDir), id, "backup"), { recursive: true });
        copyFileSync(dest, join(txRoot(runDir), id, entry.backup));
      }
      mkdirSync(dirname(dest), { recursive: true });
      const temp = `${dest}.tmp-${id}`;
      writeFileSync(temp, bytes);
      staged.push({ temp, dest });
      journal.entries.push(entry);
    }
    for (const dest of stale) {
      const entry: JournalEntry = { path: relative(siteDir, dest).split(sep).join("/"), action: "delete", sha256: sha256(dest), done: false, backup: `backup/${journal.entries.length}` };
      mkdirSync(join(txRoot(runDir), id, "backup"), { recursive: true });
      copyFileSync(dest, join(txRoot(runDir), id, entry.backup!));
      journal.entries.push(entry);
    }
    writeAtomic(journalPath(runDir, id), `${JSON.stringify(journal, null, 2)}\n`);

    // ---- 6. commit: one rename per file
    staged.forEach(({ temp, dest }, index) => {
      options.beforeCommit?.(index, journal.entries[index]!.path);
      renameSync(temp, dest);
      journal.entries[index]!.done = true;
    });
    for (const entry of journal.entries.filter((e) => e.action === "delete")) {
      rmSync(join(root, entry.path), { force: true });
      entry.done = true;
      removeEmptyDirs(root, entry.path);
    }
    journal.state = "committed";
    writeAtomic(journalPath(runDir, id), `${JSON.stringify(journal, null, 2)}\n`);
    writeHistory(root, [
      ...readHistory(root),
      { id, run: runDir.split(/[\\/]/).filter(Boolean).pop() ?? "", slugs: journal.blogs.map((b) => b.slug), committedAt: new Date().toISOString(), paths: journal.entries.map((e) => e.path) },
    ]);
  } catch (error) {
    for (const { temp } of staged) rmSync(temp, { force: true });
    if (existsSync(journalPath(runDir, id))) undo(runDir, journal, true);
    else for (const entry of journal.entries) removeEmptyDirs(root, entry.path);
    record(runDir, "publish-failed", { transactionId: id, siteDir: root, error: (error as Error).message.slice(0, 300) });
    throw new Error(`publishing failed and the site was restored to its previous state: ${(error as Error).message}`);
  }

  result.state = "published";
  result.transactionId = id;
  result.written = journal.entries.filter((e) => e.action === "create").map((e) => e.path);
  result.replaced = journal.entries.filter((e) => e.action === "replace").map((e) => e.path);
  for (const e of evaluated) {
    record(runDir, "publish", { blogId: e.blog.id, blogDigest: blogDigest(e.blog), transactionId: id, siteKind: profile.kind, route: e.page.route, created: result.written.length, replaced: result.replaced.length });
  }
  return result;
}

export interface RollbackResult {
  transactionId: string;
  restored: string[];
  removed: string[];
  kept: string[];
  /** True when the publish had never finished: it was undone rather than rolled back. */
  interrupted?: boolean;
}

/**
 * Undo a committed publish: remove the files it created and restore the files it
 * replaced, from the backups kept in the run directory. A file changed since it
 * was published is left alone and reported, unless `force` is set.
 */
export function rollbackRun(runDir: string, transactionId?: string, force = false): RollbackResult {
  const all = listJournals(runDir);
  const pick = (list: Journal[]) => (transactionId ? list.find((j) => j.id === transactionId) : list[list.length - 1]);
  const target = pick(all.filter((j) => j.state === "committed")) ?? all.find((j) => j.state === "prepared");
  if (!target) throw new Error(transactionId ? `no committed publish ${transactionId} in this run` : "this run has no committed publish to roll back");
  // Rollback rewrites the same shared files as publish, so it takes the same lock.
  const recover = (dead: LockInfo | null) => {
    if (dead === null || !existsSync(dead.runDir)) throw new Error("the run that held the lock is not available here");
    recoverInterruptedPublish(dead.runDir);
  };
  const unfinished = target.state === "prepared" ? target.id : null;
  return withSiteLock(target.siteDir, "rollback", runDir, { recover }, () => rollbackLocked(runDir, transactionId, force, unfinished));
}

function rollbackLocked(runDir: string, transactionId: string | undefined, force: boolean, unfinished: string | null): RollbackResult {
  // The unfinished publish may already have been undone a moment ago, while the stale lock was taken over.
  const interrupted = recoverInterruptedPublish(runDir) ?? unfinished;
  const committed = listJournals(runDir).filter((j) => j.state === "committed");
  const journal = transactionId ? committed.find((j) => j.id === transactionId) : committed[committed.length - 1];
  // Rolling back a run whose only publish never finished: undoing that publish IS the rollback.
  if (!journal && interrupted && (!transactionId || transactionId === interrupted)) return { transactionId: interrupted, restored: [], removed: [], kept: [], interrupted: true };
  if (!journal) throw new Error(transactionId ? `no committed publish ${transactionId} in this run` : "this run has no committed publish to roll back");
  if (!transactionId && committed.length > 1 && journal !== committed[committed.length - 1]) throw new Error("roll back the most recent publish first");
  const blocking = laterOverlapping(journal.siteDir, journal);
  if (blocking.length > 0 && !force) {
    throw new Error(
      `publish ${journal.id} cannot be rolled back yet: later publish(es) changed the same files — ${blocking.map((b) => `${b.id} (run ${b.run}, ${b.slugs.join(", ")})`).join("; ")}. ` +
        "Roll those back first, newest first; otherwise the blog index and registry would be left listing posts that are gone. Nothing was changed",
    );
  }
  const removed = journal.entries.filter((e) => e.action === "create").map((e) => e.path);
  const restored = journal.entries.filter((e) => e.action !== "create").map((e) => e.path);
  const kept = undo(runDir, journal, force);
  record(runDir, "rollback", { transactionId: journal.id, siteDir: journal.siteDir, removed: removed.length, restored: restored.length, kept: kept.length });
  return { transactionId: journal.id, restored, removed, kept };
}
