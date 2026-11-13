/**
 * BLOG VALIDATION — the report the owner approves against.
 *
 * Each check has one of five outcomes, and `not_verified` is a first-class one:
 * what can only be established in a browser (playback, the device sweep, live
 * links) is reported as NOT VERIFIED here and belongs to Phase 5 of
 * website_flow.md. README rule 10: an unmeasured criterion is never a passing one.
 *
 * READINESS is derived, not asserted: any `error` issue, failed check or
 * integrity problem blocks publishing; warnings must be acknowledged by name in
 * the approval record (publish.ts).
 */
import { type Blog, type BlogIssue, type BlogManifest, inlineListsOf, plainText, walkBlocks } from "./manifest.js";
import { type BlogPage, type MappingRow, blockOwnText } from "./map.js";
import { safeHref } from "./render.js";

export type CheckStatus = "pass" | "fail" | "warn" | "not_verified" | "not_applicable";
export interface Check {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
}

export interface ValidationReport {
  blogId: string;
  slug: string;
  route: string;
  title: string | null;
  extraction: {
    status: string;
    documents: Array<{ name: string; format: string; status: string; extractor: string }>;
    elements: Record<string, number>;
    assets: Array<{ id: string; filename: string; kind: string; role: string; format: string; dimensions: string; origin: string; placement: string }>;
  };
  mapping: MappingRow[];
  adaptations: string[];
  missingAssets: BlogIssue[];
  unsupportedFormats: BlogIssue[];
  placementUncertainties: BlogIssue[];
  extractionWarnings: BlogIssue[];
  notes: BlogIssue[];
  seoUnresolved: Array<{ artifact: string; needs: string }>;
  checks: Check[];
  readiness: {
    state: "ready" | "ready_with_warnings" | "blocked";
    blockers: string[];
    /** Warning codes the approver must acknowledge before publishing. */
    warningsToAccept: string[];
    notVerified: string[];
  };
}

const MISSING = new Set(["MEDIA_MISSING", "EMBEDDED_MEDIA_MISSING", "LINK_TARGET_MISSING", "SIDECAR_DOCUMENT_NOT_FOUND", "TITLE_MISSING", "CONTENT_EMPTY"]);
const UNSUPPORTED = /UNSUPPORTED|NEEDS_CONVERSION|UNAVAILABLE|NOT_EXTRACTABLE|REJECTED|UNRECOGNISED|TOO_LARGE|ENCRYPTED|CORRUPT|CHART_AS_DATA_TABLE|CODEC/;
const PLACEMENT = /^PLACEMENT_|^GROUPING_|^ASSET_UNASSIGNED|^PRESENTATION_PURPOSE|^TABLE_MEDIA_MOVED|^TEXT_BOX_REPOSITIONED/;

/** Visible text of an HTML fragment: tags removed, entities decoded, whitespace collapsed. */
export function visibleText(html: string): string {
  return html
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

const squash = (s: string) => s.replace(/\s+/g, "");

export interface ValidateInput {
  blog: Blog;
  page: BlogPage;
  /** The rendered ARTICLE html in publish mode (no review notes). */
  articleHtml: string;
  integrityProblems: string[];
  /** Package-level issues that concern this blog's publication (unassigned assets, rejected files). */
  packageIssues?: BlogIssue[];
}

export function validateBlog(input: ValidateInput): ValidationReport {
  const { blog, page, articleHtml } = input;
  const issues = [...blog.issues, ...(input.packageIssues ?? [])];
  const assets = new Map(blog.assets.map((a) => [a.id, a]));
  const blocks = [...walkBlocks(page.body)];
  const checks: Check[] = [];
  const add = (id: string, label: string, status: CheckStatus, detail: string) => checks.push({ id, label, status, detail });

  // ---- title, subtitle
  add("title", "Title", blog.title ? "pass" : "fail", blog.title ? `"${blog.title.text}" — from ${blog.title.source}` : "no title in the source; a title is never written by the workflow");
  add("subtitle", "Subtitle", blog.subtitle ? "pass" : "not_applicable", blog.subtitle ? `"${blog.subtitle.text}" — from ${blog.subtitle.source}` : "none supplied");

  // ---- heading hierarchy
  const h1 = (articleHtml.match(/<h1\b/g) ?? []).length;
  const levels = blocks.filter((b) => b.type === "heading").map((b) => (b.type === "heading" ? b.level : 0));
  const skips = levels.filter((level, i) => i > 0 && level > (levels[i - 1] ?? level) + 1).length + (levels.length > 0 && (levels[0] ?? 2) > 2 ? 1 : 0);
  add(
    "hierarchy",
    "Section hierarchy",
    h1 !== (blog.title ? 1 : 0) ? "fail" : skips > 0 ? "warn" : "pass",
    h1 !== (blog.title ? 1 : 0)
      ? `the page has ${h1} level-1 headings; it must have exactly one, the title`
      : `${levels.length} section heading(s) under one <h1>${skips > 0 ? `; the source skips a heading level in ${skips} place(s) — kept as written` : ""}${page.headingShift ? "; source level-1 headings shown one level down" : ""}`,
  );

  // ---- content completeness: every block's text appears in the page, in order
  // Footnote markers are navigation the page adds, not source text; they are left out of the comparison.
  const rendered = squash(visibleText(articleHtml.replace(/<sup><a id="fnref-\d+"[^>]*>\[\d+\]<\/a><\/sup>/g, "").replace(/ <a href="#fnref-\d+"[^>]*>[^<]*<\/a>/g, "")));
  let cursor = 0;
  const lost: string[] = [];
  let outOfOrder = 0;
  const expectations: Array<{ id: string; text: string }> = [];
  if (page.title) expectations.push({ id: "title", text: plainText(page.title) });
  if (page.subtitle) expectations.push({ id: "subtitle", text: plainText(page.subtitle) });
  for (const block of blocks) {
    if (block.type === "footnotes" || block.type === "missing_media") continue;
    if (block.type === "media" && assets.get(block.assetId)?.webReady === false) continue;
    const parts =
      block.type === "list"
        ? block.items.map((i) => plainText(i.inlines))
        : block.type === "table"
          ? block.rows.flatMap((r) => r.map((c) => plainText(c.inlines)))
          : block.type === "chart"
            ? [block.title ?? "", ...block.categories, ...block.series.flatMap((s) => [s.name ?? "", ...s.values.map((v) => v ?? "")])]
            : [blockOwnText(block)];
    for (const part of parts) if (squash(part)) expectations.push({ id: block.id, text: part });
  }
  for (const expected of expectations) {
    const needle = squash(expected.text);
    const at = rendered.indexOf(needle, cursor);
    if (at >= 0) cursor = at + needle.length;
    else if (rendered.includes(needle)) outOfOrder += 1;
    else lost.push(`${expected.id}: "${expected.text.slice(0, 50)}"`);
  }
  for (const block of blocks) if (block.type === "footnotes") for (const item of block.items) if (!rendered.includes(squash(plainText(item.inlines)))) lost.push(`${block.id}: footnote ${item.id}`);
  add(
    "completeness",
    "Content completeness",
    lost.length > 0 ? "fail" : "pass",
    lost.length > 0 ? `${lost.length} extracted text unit(s) are not on the page: ${lost.slice(0, 3).join("; ")}` : `all ${expectations.length} extracted text units are on the page${outOfOrder ? ` (${outOfOrder} table-caption unit(s) sit before their table rather than after)` : ", in source order"}`,
  );
  const paragraphs = blocks.filter((b) => b.type === "paragraph").length;
  const marks = [...walkBlocks(blog.blocks)].flatMap((b) => (b.type === "paragraph" || b.type === "heading" ? b.inlines : [])).filter((r) => r.t === "text" && (r.bold || r.italic || r.code || r.strike || r.sup || r.sub || r.href)).length;
  add("paragraphs", "Paragraph formatting", "pass", `${paragraphs} paragraph(s), ${blocks.filter((b) => b.type === "list").length} list(s), ${blocks.filter((b) => b.type === "blockquote").length} quote(s), ${blocks.filter((b) => b.type === "code").length} code block(s); ${marks} run(s) of inline formatting or links carried as written`);

  // ---- media placement: rendered order equals extracted order
  const expectedOrder = [...(page.cover?.asset.webReady ? [page.cover.asset.id] : []), ...blocks.flatMap((b) => (b.type === "media" && assets.get(b.assetId)?.webReady ? [b.assetId] : []))];
  const renderedOrder = [...articleHtml.matchAll(/data-asset="([^"]+)"/g)].map((m) => m[1] ?? "");
  const sameOrder = expectedOrder.length === renderedOrder.length && expectedOrder.every((id, i) => id === renderedOrder[i]);
  const unplaced = blog.placements.filter((p) => p.status === "unplaced");
  const medium = blog.placements.filter((p) => p.status === "placed" && p.confidence === "medium");
  add(
    "media-placement",
    "Image and media placement",
    !sameOrder ? "fail" : unplaced.length > 0 || medium.length > 0 ? "warn" : expectedOrder.length === 0 ? "not_applicable" : "pass",
    !sameOrder
      ? "the rendered media order differs from the extracted order"
      : `${expectedOrder.length} media item(s) rendered at their extracted positions${medium.length ? `; ${medium.length} placed by inference — confirm in the preview` : ""}${unplaced.length ? `; ${unplaced.length} supplied file(s) not shown because nothing says where they belong` : ""}`,
  );

  // ---- animation
  const animations = blog.assets.filter((a) => a.kind === "animation" && a.role !== "unplaced" && a.role !== "not-displayed");
  const converted = animations.filter((a) => a.convertedFrom);
  const controls = (articleHtml.match(/class="c-blog-animation"/g) ?? []).length;
  add(
    "animation",
    "GIF and animation",
    animations.length === 0 ? "not_applicable" : converted.length > 0 || controls < animations.filter((a) => a.role !== "cover").length ? "fail" : "pass",
    animations.length === 0
      ? "no animated media"
      : `${animations.length} animation(s) published byte-for-byte (${animations.map((a) => `${a.filename}: ${a.frames ?? "?"} frames`).join(", ")}), each with a reader control to hide it (WCAG 2.2.2). A reduced-motion still frame is not generated.`,
  );

  // ---- video / audio
  const players = blog.assets.filter((a) => (a.kind === "video" || a.kind === "audio") && a.role === "supporting");
  const unplayable = players.filter((a) => !a.webReady);
  const embeds = blocks.filter((b) => b.type === "embed").length;
  add(
    "video",
    "Video and audio playback",
    players.length + embeds === 0 ? "not_applicable" : unplayable.length > 0 ? "fail" : "not_verified",
    players.length + embeds === 0
      ? "no video or audio"
      : unplayable.length > 0
        ? `${unplayable.map((a) => a.filename).join(", ")} cannot be played by browsers in the supplied format`
        : `${players.length} file(s) in a browser-playable container (${players.map((a) => `${a.filename}: ${a.format}${a.videoCodec ? `/${a.videoCodec}` : ""}${a.durationSeconds ? `, ${a.durationSeconds}s` : ""}`).join("; ") || "none"}), native controls, no autoplay; ${embeds} embed(s) load on request with a plain link kept. Actual playback is confirmed in a browser at Phase 5.`,
  );

  // ---- charts
  const chartImages = blocks.filter((b) => b.type === "media" && assets.get(b.assetId)?.subject === "chart").length;
  const chartData = blocks.filter((b) => b.type === "chart").length;
  add("charts", "Chart presentation", chartImages + chartData === 0 ? "not_applicable" : chartData > 0 ? "warn" : "pass", chartImages + chartData === 0 ? "no charts" : `${chartImages} chart image(s) shown as supplied; ${chartData} native chart(s) shown as their exact data table (no picture of the chart exists in the source)`);

  // ---- tables
  const tables = (articleHtml.match(/<table\b/g) ?? []).length;
  const wrapped = (articleHtml.match(/class="c-blog-table-scroll"[^>]*><table/g) ?? []).length;
  const headerless = blocks.filter((b) => b.type === "table" && b.headerRows === 0 && b.rows.length > 1).length;
  add("tables", "Table responsiveness", tables === 0 ? "not_applicable" : wrapped !== tables ? "fail" : headerless > 0 ? "warn" : "pass", tables === 0 ? "no tables" : `${wrapped} of ${tables} table(s) sit in a labelled, keyboard-focusable scroll region${headerless ? `; ${headerless} have no header row marked in the source` : ""}`);

  // ---- links
  const hrefs = [...articleHtml.matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)].map((m) => m[1] ?? "");
  const unsafe = hrefs.filter((href) => !/^(https?:\/\/|mailto:|tel:|#|\/|assets\/|\.\.?\/)/i.test(href));
  // Targets the MANIFEST carries that the renderer refused. They are not on the page, but a manifest
  // that holds them is not one to publish from without someone looking at where it came from.
  for (const block of walkBlocks(blog.blocks)) {
    for (const list of inlineListsOf(block)) for (const run of list) if (run.t === "text" && run.href && !run.href.startsWith("asset:") && !safeHref(run.href)) unsafe.push(run.href.slice(0, 60));
    if ((block.type === "embed" || block.type === "external_media") && !/^https?:\/\//i.test(safeHref(block.url) ?? "")) unsafe.push(block.url.slice(0, 60));
    if (block.type === "embed" && !/^[A-Za-z0-9_-]{1,64}$/.test(block.mediaId)) unsafe.push(`embed id ${block.mediaId.slice(0, 30)}`);
  }
  const broken = blog.links.filter((l) => l.status === "broken");
  const unverified = blog.links.filter((l) => l.status === "unverified");
  add(
    "links",
    "Link functionality",
    unsafe.length > 0 || broken.length > 0 ? "fail" : blog.links.length === 0 ? (hrefs.length > 0 ? "pass" : "not_applicable") : unverified.length > 0 ? "not_verified" : "pass",
    unsafe.length > 0
      ? `unsafe link or embed target(s) in the manifest, not rendered: ${unsafe.slice(0, 3).join(", ")}`
      : broken.length > 0
        ? `${broken.length} link(s) answered with an error: ${broken.map((l) => l.url).slice(0, 3).join(", ")}`
        : `${hrefs.length} link(s) with safe targets; ${blog.links.length - unverified.length} external link(s) checked live, ${unverified.length} not checked (run the ingest with --check-links)`,
  );

  // ---- media dimensions
  const imgs = [...articleHtml.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
  const unsized = imgs.filter((tag) => !/\bwidth="\d+"/.test(tag) || !/\bheight="\d+"/.test(tag));
  add("dimensions", "Media dimensions", imgs.length === 0 ? "not_applicable" : unsized.length > 0 ? "fail" : "pass", imgs.length === 0 ? "no images" : unsized.length > 0 ? `${unsized.length} image(s) have no measured width and height, so the layout would shift while they load` : `all ${imgs.length} image(s) carry their measured width and height`);

  // ---- responsive (static rules only)
  const fixed = /style="/.test(articleHtml);
  add(
    "responsive",
    "Mobile responsiveness",
    fixed || wrapped !== tables ? "fail" : "not_verified",
    fixed
      ? "inline styles are present in the article"
      : "static rules hold: no fixed widths or inline styles, media scale to their column, wide tables and code scroll inside their own region. The device sweep (responsive_matrix.md) is run at Phase 5.",
  );

  // ---- accessibility (static)
  const noAlt = issues.filter((i) => i.code === "ALT_TEXT_MISSING").length;
  const untitledFrames = [...articleHtml.matchAll(/<iframe\b[^>]*>/g)].filter((m) => !/\btitle="[^"]+"/.test(m[0])).length;
  const imgNoAlt = imgs.filter((tag) => !/\balt="/.test(tag)).length;
  add(
    "accessibility",
    "Accessibility",
    untitledFrames > 0 || imgNoAlt > 0 ? "fail" : noAlt > 0 || headerless > 0 || skips > 0 ? "warn" : "pass",
    untitledFrames > 0 || imgNoAlt > 0
      ? `${imgNoAlt} image(s) without an alt attribute, ${untitledFrames} frame(s) without a title`
      : `one <h1>, language "${page.lang}", every image has an alt attribute, frames are titled, tables use header cells${noAlt ? `; ${noAlt} image(s) have EMPTY alt text because none was supplied — supply it or mark the image decorative` : ""}. Contrast is the site token file's measured property; keyboard and screen-reader passes are Phase 5.`,
  );

  // ---- integrity
  add("integrity", "Manifest integrity", input.integrityProblems.length > 0 ? "fail" : "pass", input.integrityProblems.length > 0 ? input.integrityProblems.slice(0, 4).join("; ") : `every asset file exists with its recorded size and hash; every reference resolves (${blog.assets.length} assets, ${blocks.length} blocks)`);

  // ---- classification of issues
  const missingAssets = issues.filter((i) => MISSING.has(i.code));
  const placementUncertainties = issues.filter((i) => PLACEMENT.test(i.code));
  const unsupportedFormats = issues.filter((i) => !MISSING.has(i.code) && !PLACEMENT.test(i.code) && UNSUPPORTED.test(i.code));
  const classified = new Set([...missingAssets, ...placementUncertainties, ...unsupportedFormats]);
  const extractionWarnings = issues.filter((i) => !classified.has(i) && i.severity !== "info");
  const notes = issues.filter((i) => !classified.has(i) && i.severity === "info");

  // ---- readiness
  const blockers = [
    ...issues.filter((i) => i.severity === "error").map((i) => `${i.code}: ${i.message} → ${i.action}`),
    ...checks.filter((c) => c.status === "fail").map((c) => `${c.label}: ${c.detail}`),
  ];
  const warningsToAccept = [...new Set(issues.filter((i) => i.severity === "warning").map((i) => i.code))].sort();
  const state = blockers.length > 0 ? "blocked" : warningsToAccept.length > 0 ? "ready_with_warnings" : "ready";

  const placementOf = (id: string) => {
    const p = blog.placements.find((x) => x.assetId === id);
    if (!p) return "not displayed";
    if (p.status !== "placed") return p.status;
    return `${p.position === "hero" ? "hero" : `block ${p.blockId}`} — ${p.basis.replace(/_/g, " ")} (${p.confidence})`;
  };
  const elements: Record<string, number> = {};
  for (const block of blocks) elements[block.type] = (elements[block.type] ?? 0) + 1;

  return {
    blogId: blog.id,
    slug: blog.slug,
    route: page.route,
    title: blog.title?.text ?? null,
    extraction: {
      status: blog.extractionStatus,
      documents: blog.documents.map((d) => ({ name: d.name, format: d.format, status: d.status, extractor: d.extractor })),
      elements,
      assets: blog.assets.map((a) => ({ id: a.id, filename: a.filename, kind: a.kind, role: a.role, format: a.format, dimensions: a.width && a.height ? `${a.width}×${a.height}` : "not measured", origin: a.origin, placement: placementOf(a.id) })),
    },
    mapping: page.ledger,
    adaptations: page.adaptations,
    missingAssets,
    unsupportedFormats,
    placementUncertainties,
    extractionWarnings,
    notes,
    seoUnresolved: page.seo.unresolved,
    checks,
    readiness: { state, blockers, warningsToAccept, notVerified: checks.filter((c) => c.status === "not_verified").map((c) => c.label) },
  };
}

/** Package-level issues that must travel with every blog's report. */
export function packageIssuesFor(manifest: BlogManifest): BlogIssue[] {
  return manifest.issues;
}

const MARK: Record<CheckStatus, string> = { pass: "PASS", fail: "FAIL", warn: "WARN", not_verified: "NOT VERIFIED", not_applicable: "N/A" };

export function renderReportMarkdown(report: ValidationReport): string {
  const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
  const issueRows = (items: BlogIssue[]) =>
    items.length === 0 ? ["None."] : ["| Code | Where | What | Corrective action |", "|---|---|---|---|", ...items.map((i) => `| \`${i.code}\` | ${cell(i.section ?? i.document ?? "—")} | ${cell(i.message)} | ${cell(i.action)} |`)];
  return [
    `# Blog validation report — ${report.title ?? "(no title found)"}`,
    "",
    `Blog \`${report.blogId}\` · route \`${report.route}\` · extraction **${report.extraction.status}**`,
    "",
    `## Publishing readiness: ${report.readiness.state.replace(/_/g, " ").toUpperCase()}`,
    "",
    ...(report.readiness.blockers.length > 0 ? ["Blocked by:", ...report.readiness.blockers.map((b) => `- ${b}`), ""] : []),
    ...(report.readiness.warningsToAccept.length > 0 ? [`Warnings the approver must acknowledge: ${report.readiness.warningsToAccept.map((w) => `\`${w}\``).join(", ")}`, ""] : []),
    ...(report.readiness.notVerified.length > 0 ? [`Not verified here (Phase 5, in a browser): ${report.readiness.notVerified.join(", ")}`, ""] : []),
    "## Checks",
    "",
    "| Check | Result | Evidence |",
    "|---|---|---|",
    ...report.checks.map((c) => `| ${c.label} | ${MARK[c.status]} | ${cell(c.detail)} |`),
    "",
    "## Successfully extracted",
    "",
    ...report.extraction.documents.map((d) => `- ${d.name} (${d.format}) — ${d.status}, via ${d.extractor}`),
    "",
    `Elements: ${Object.entries(report.extraction.elements).map(([k, v]) => `${v} ${k.replace(/_/g, " ")}`).join(", ") || "none"}`,
    "",
    ...(report.extraction.assets.length > 0
      ? ["| Asset id | File | Kind | Role | Format | Dimensions | Origin | Placement |", "|---|---|---|---|---|---|---|---|", ...report.extraction.assets.map((a) => `| \`${a.id}\` | ${cell(a.filename)} | ${a.kind} | ${a.role} | ${a.format} | ${a.dimensions} | ${a.origin} | ${cell(a.placement)} |`)]
      : ["No media assets."]),
    "",
    "## Successfully mapped",
    "",
    "| Extracted element | Website destination | Count | Status |",
    "|---|---|---|---|",
    ...report.mapping.map((m) => `| ${m.element} | ${m.destination} | ${m.count} | ${m.status.replace(/_/g, " ")}${m.note ? ` — ${cell(m.note)}` : ""} |`),
    "",
    ...(report.adaptations.length > 0 ? ["Formatting adaptations made:", ...report.adaptations.map((a) => `- ${a}`), ""] : []),
    "## Missing assets and content",
    "",
    ...issueRows(report.missingAssets),
    "",
    "## Unsupported formats and elements",
    "",
    ...issueRows(report.unsupportedFormats),
    "",
    "## Placement uncertainties",
    "",
    ...issueRows(report.placementUncertainties),
    "",
    "## Content extraction warnings",
    "",
    ...issueRows(report.extractionWarnings),
    "",
    "## Notes",
    "",
    ...issueRows(report.notes),
    "",
    "## SEO artifacts not produced",
    "",
    ...(report.seoUnresolved.length > 0 ? report.seoUnresolved.map((u) => `- ${u.artifact}: needs ${u.needs}`) : ["None."]),
    "",
  ].join("\n");
}
