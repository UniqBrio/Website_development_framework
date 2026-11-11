/**
 * BLOG INGESTION — the Python extractor, exercised on representative documents.
 *
 * Fixtures are BUILT here by tests/fixtures/blog/build_fixtures.py (standard
 * library only) and ingested by the real tool through its command line, so what
 * is asserted is what an owner would get. PDF cases run only where poppler is
 * installed; the OCR case uses a stand-in `tesseract` and says so.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Blog, type BlogManifest, type Block, checkBlogIntegrity, parseBlogManifest, plainText, walkBlocks } from "../../src/blog/manifest.js";

const PYTHON = process.env["PYTHON"] ?? (spawnSync("python3", ["--version"]).status === 0 ? "python3" : "python");
const TOOL = "website_workflow/tools/blog_ingest.py";
const has = (tool: string) => spawnSync(tool, ["-v"]).error === undefined;
const POPPLER = has("pdftohtml");

let root = "";
let fx = "";

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "blog-ingest-"));
  fx = join(root, "fixtures");
  execFileSync(PYTHON, ["tests/fixtures/blog/build_fixtures.py", fx], { stdio: "pipe" });
});
afterAll(() => {
  if (root) rmSync(root, { recursive: true, force: true });
});

let runs = 0;
function ingest(inputs: string[], flags: string[] = [], env: NodeJS.ProcessEnv = {}): { manifest: BlogManifest; out: string; stdout: string } {
  const out = join(root, `run-${(runs += 1)}`);
  const stdout = execFileSync(PYTHON, [TOOL, ...inputs.map((i) => join(fx, i)), "--out", out, ...flags], { encoding: "utf8", env: { ...process.env, ...env } });
  return { manifest: parseBlogManifest(JSON.parse(readFileSync(join(out, "manifest.json"), "utf8"))), out, stdout };
}
const only = (m: BlogManifest): Blog => {
  expect(m.blogs).toHaveLength(1);
  return m.blogs[0]!;
};
const all = (blog: Blog) => [...walkBlocks(blog.blocks)];
const ofType = <T extends Block["type"]>(blog: Blog, type: T) => all(blog).filter((b): b is Extract<Block, { type: T }> => b.type === type);
const text = (blog: Blog) => all(blog).map((b) => ("inlines" in b ? plainText(b.inlines) : b.type === "list" ? b.items.map((i) => plainText(i.inlines)).join(" ") : "")).join(" | ");
const codes = (blog: Blog) => blog.issues.map((i) => i.code);
const asset = (blog: Blog, name: string) => blog.assets.find((a) => a.sourceNames.includes(name))!;
const onDisk = (out: string, blog: Blog) =>
  checkBlogIntegrity(blog, { fileSize: (rel) => (existsSync(join(out, rel)) ? statSync(join(out, rel)).size : null) });

// ============================================================ Word

describe("DOCX", () => {
  let blog: Blog;
  let out: string;
  beforeAll(() => {
    const r = ingest(["docx"]);
    blog = only(r.manifest);
    out = r.out;
  });

  it("takes the title and subtitle from the document's own styles, not its stale properties", () => {
    expect(blog.title?.text).toBe("FIXTURE How Academies Cut Fee Leakage");
    expect(blog.title?.source).toContain("title style");
    expect(blog.subtitle?.text).toBe("A practical look at three fixes");
    expect(JSON.stringify(blog.title)).not.toContain("Stale template title");
  });

  it("keeps heading hierarchy, bold runs, hyperlinks and statistics exactly", () => {
    expect(ofType(blog, "heading").map((h) => `${h.level}:${plainText(h.inlines)}`)).toEqual(["1:Where the money goes", "2:The numbers", "1:Conclusion", "1:References"]);
    const intro = ofType(blog, "paragraph")[0]!;
    expect(intro.inlines).toContainEqual({ t: "text", text: "12.5%", bold: true });
    expect(intro.inlines).toContainEqual({ t: "text", text: "the 2025 report", href: "https://example.org/report" });
  });

  it("rebuilds numbered and bulleted lists with nesting and numbering", () => {
    const [numbered, bullets] = ofType(blog, "list").filter((l) => !all(blog).some((b) => b.type === "list" && b.items.some((i) => i.children.includes(l))));
    expect(numbered).toMatchObject({ ordered: true, start: 1 });
    expect(numbered!.items.map((i) => plainText(i.inlines))).toEqual(["Missed reminders", "Manual receipts", "Untracked discounts"]);
    expect(numbered!.items[1]!.children[0]).toMatchObject({ type: "list", ordered: false });
    expect(bullets).toMatchObject({ ordered: false });
  });

  it("preserves the table with its header row", () => {
    const table = ofType(blog, "table")[0]!;
    expect(table.headerRows).toBe(1);
    expect(table.rows.map((r) => r.map((c) => plainText(c.inlines)))).toEqual([["Cause", "Share", "Fix"], ["Reminders", "48%", "Automate"], ["Receipts", "31%", "Digital"]]);
  });

  it("extracts embedded images to real files, in place, with alt text and caption", () => {
    expect(onDisk(out, blog)).toEqual([]);
    expect(blog.cover).toMatchObject({ alt: "Dashboard showing fee collections", basis: "document_order" });
    const figure = ofType(blog, "media")[0]!;
    expect(plainText(figure.caption)).toBe("Figure 1: Leakage by cause");
    const file = blog.assets.find((a) => a.id === figure.assetId)!;
    expect(file).toMatchObject({ origin: "embedded", width: 800, height: 450, format: "png", webReady: true });
    // A file name is not alternative text: it is dropped and reported, never published as alt.
    expect(figure.alt).toBeNull();
    expect(codes(blog)).toContain("ALT_TEXT_MISSING");
  });

  it("reads a native chart's data without changing a value", () => {
    const chart = ofType(blog, "chart")[0]!;
    expect(chart).toMatchObject({ chartType: "column", title: "Renewals by quarter", categories: ["Q1", "Q2", "Q3"] });
    expect(chart.series[0]).toMatchObject({ name: "2025", values: ["66", "71.5", "77.25"] });
    expect(codes(blog)).toContain("CHART_AS_DATA_TABLE");
  });

  it("carries quotes, code and footnotes; excludes tracked deletions and says so", () => {
    expect(ofType(blog, "blockquote")).toHaveLength(1);
    expect(ofType(blog, "code")[0]!.text).toBe("print('fixture')\n  indented()");
    expect(ofType(blog, "footnotes")[0]!.items[0]!.inlines).toEqual([{ t: "text", text: "FIXTURE survey of 40 academies." }]);
    expect(text(blog)).toContain("A deleted inserted sentence.");
    expect(text(blog)).not.toContain("REMOVED-WORD");
    expect(codes(blog)).toContain("TRACKED_CHANGES_PRESENT");
  });

  it("resolves an in-text placement instruction to the separately supplied video", () => {
    const video = ofType(blog, "media").map((m) => blog.assets.find((a) => a.id === m.assetId)!).find((a) => a.kind === "video")!;
    expect(video).toMatchObject({ filename: "demo.mp4", origin: "supplied", width: 1280, height: 720, durationSeconds: 30 });
    expect(blog.placements.find((p) => p.assetId === video.id)).toMatchObject({ basis: "explicit_instruction", confidence: "high" });
  });

  it("labels sections by the author's own headings", () => {
    expect(blog.sections.map((s) => s.role)).toEqual(["introduction", "body", "body", "conclusion", "references", "footnotes"]);
  });
});

// ============================================================ other document formats

describe("PDF (poppler)", () => {
  it.skipIf(!POPPLER)("reconstructs title, headings, joined paragraphs, list, table and image — and reports the reconstruction", () => {
    const blog = only(ingest(["pdf"]).manifest);
    expect(blog.title?.text).toBe("FIXTURE Parent Communication Guide");
    expect(ofType(blog, "heading").map((h) => plainText(h.inlines))).toEqual(["Weekly rhythm"]);
    expect(text(blog)).toContain("This first paragraph runs over two lines so that line joining is exercised.");
    expect(ofType(blog, "list")[0]!.items.map((i) => plainText(i.inlines))).toEqual(["Monday reminder", "Friday summary"]);
    expect(ofType(blog, "table")[0]!.rows.map((r) => r.map((c) => plainText(c.inlines)))).toEqual([["Channel", "Open rate"], ["WhatsApp", "92%"], ["Email", "41%"]]);
    const figure = ofType(blog, "media")[0]!;
    expect(plainText(figure.caption)).toBe("Figure 1: Message timeline");
    expect(blog.assets.find((a) => a.id === figure.assetId)).toMatchObject({ width: 64, height: 36, origin: "embedded" });
    expect(codes(blog)).toContain("PDF_TABLE_RECONSTRUCTED");
  });

  it.skipIf(!POPPLER)("flags a scanned PDF when OCR is unavailable instead of producing text", () => {
    const blog = only(ingest(["scanned"], ["--no-tool", "tesseract"]).manifest);
    expect(codes(blog)).toEqual(expect.arrayContaining(["OCR_UNAVAILABLE", "CONTENT_EMPTY", "TITLE_MISSING"]));
    expect(blog.extractionStatus).toBe("failed");
    expect(blog.assets).toEqual([]); // the page scan is not offered as a blog image
  });

  it.skipIf(!POPPLER || !has("pdftoppm"))("marks OCR text as unverified and names low-confidence words (stand-in OCR engine)", () => {
    const bin = join(root, "fakebin");
    mkdirSync(bin, { recursive: true });
    const tsv = ["level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext", "5\t1\t1\t1\t1\t1\t0\t0\t9\t9\t96\tFIXTURE", "5\t1\t1\t1\t1\t2\t0\t0\t9\t9\t41\tscann3d", "5\t1\t1\t1\t1\t3\t0\t0\t9\t9\t93\ttext"].join("\\n");
    writeFileSync(join(bin, "tesseract"), `#!/bin/sh\nprintf '${tsv}\\n'\n`);
    chmodSync(join(bin, "tesseract"), 0o755);
    const blog = only(ingest(["scanned"], [], { PATH: `${bin}:${process.env["PATH"]}` }).manifest);
    const para = ofType(blog, "paragraph")[0]!;
    expect(plainText(para.inlines)).toBe("FIXTURE scann3d text");
    expect(para.ocr).toBe(true);
    const issue = blog.issues.find((i) => i.code === "OCR_TEXT_UNVERIFIED")!;
    expect(issue.message).toContain("scann3d");
    expect(issue.severity).toBe("warning");
  });

  it("reports PDF as unavailable — not empty — when poppler is absent", () => {
    const blog = only(ingest(["pdf"], ["--no-tool", "pdftohtml"]).manifest);
    expect(codes(blog)).toContain("PDF_TOOL_UNAVAILABLE");
    expect(blog.documents[0]!.status).toBe("unsupported");
  });
});

describe("ODT, RTF, TXT", () => {
  it("ODT: headings, bold, links, nested list numbering, image with alt, header rows", () => {
    const blog = only(ingest(["odt"]).manifest);
    expect(blog.title?.text).toBe("FIXTURE Scheduling Without Clashes");
    const para = ofType(blog, "paragraph")[0]!;
    expect(para.inlines).toContainEqual({ t: "text", text: "twice", bold: true });
    expect(para.inlines).toContainEqual({ t: "text", text: "the study", href: "https://example.org/study" });
    const list = ofType(blog, "list")[0]!;
    expect(list.ordered).toBe(true);
    expect(list.items[0]!.children[0]).toMatchObject({ type: "list", ordered: false });
    expect(ofType(blog, "media")[0]!.alt).toBe("Weekly room timetable");
    expect(ofType(blog, "table")[0]!.headerRows).toBe(1);
  });

  it("RTF: stylesheet headings, bold, code-page and unicode characters, field hyperlinks, lists, tables", () => {
    const blog = only(ingest(["rtf"]).manifest);
    expect(blog.title?.text).toBe("FIXTURE Attendance Notes");
    expect(text(blog)).toContain("by 9é am");
    expect(text(blog)).toContain("Unicode ₹500 fee.");
    expect(ofType(blog, "paragraph")[0]!.inlines).toContainEqual({ t: "text", text: "the policy", href: "https://example.org/rtf" });
    expect(ofType(blog, "heading").map((h) => plainText(h.inlines))).toEqual(["Rules"]);
    expect(ofType(blog, "list")[0]!.items).toHaveLength(2);
    expect(ofType(blog, "table")[0]!.rows.map((r) => r.map((c) => plainText(c.inlines)))).toEqual([["Day", "Count"], ["Mon", "18"]]);
  });

  it("TXT: keeps the author's characters literal and promotes only marked headings", () => {
    const blog = only(ingest(["txt"]).manifest);
    expect(blog.title?.text).toBe("FIXTURE Plain Text Post");
    expect(text(blog)).toContain("2 * 3 * 4 and snake_case_name untouched");
    expect(ofType(blog, "heading").map((h) => plainText(h.inlines))).toEqual(["A marked heading"]);
    expect(ofType(blog, "list")[0]!.items).toHaveLength(2);
    expect(blog.placements.find((p) => p.status === "placed")).toMatchObject({ basis: "explicit_instruction" });
    expect(ofType(blog, "paragraph").at(-1)!.inlines).toContainEqual({ t: "text", text: "https://example.org/plain", href: "https://example.org/plain" });
  });
});

describe("Markdown package with separately supplied media", () => {
  let blog: Blog;
  let out: string;
  beforeAll(() => {
    const r = ingest(["package"]);
    blog = only(r.manifest);
    out = r.out;
  });

  it("uses front matter for title, subtitle and SEO metadata, and does not duplicate the H1", () => {
    expect(blog.title).toMatchObject({ text: "FIXTURE Automating Fee Reminders", source: expect.stringContaining("front matter") });
    expect(ofType(blog, "heading").every((h) => h.level >= 2)).toBe(true);
    expect(blog.metadata["author"]?.value).toBe("Fixture Author");
    expect(blog.metadata["description"]?.value).toBe("How one fixture academy automated reminders.");
    expect(blog.metadata["keywords"]?.value).toEqual(["fees", "automation"]);
  });

  it("does not alter statistics, currency or emphasis", () => {
    expect(text(blog)).toContain("Collections rose from 82.5% to 91% in one quarter");
    expect(text(blog)).toContain("₹1,25,000");
    expect(ofType(blog, "table")[0]!.rows[2]!.map((c) => plainText(c.inlines))).toEqual(["Growth", "₹2,499"]);
    expect(ofType(blog, "code")[0]).toMatchObject({ language: "python", text: "total = 82.5 * 2  # a < b && c > d" });
  });

  it("places each supplied file by the strongest available basis", () => {
    const basis = (name: string) => blog.placements.find((p) => p.assetId === asset(blog, name).id);
    expect(basis("fee-chart.png")).toMatchObject({ basis: "document_reference", confidence: "high" });
    expect(basis("process.gif")).toMatchObject({ basis: "document_reference", note: "the text names this file" });
    expect(basis("demo.mp4")).toMatchObject({ basis: "explicit_instruction", confidence: "high" });
    expect(basis("pricing-comparison.png")).toMatchObject({ basis: "heading", confidence: "medium" });
    expect(basis("cover.png")).toMatchObject({ position: "hero", basis: "filename_convention" });
  });

  it("does not place a file nothing refers to — it is flagged, with a corrective action", () => {
    const loose = asset(blog, "team-offsite.png");
    expect(loose.role).toBe("unplaced");
    expect(ofType(blog, "media").some((m) => m.assetId === loose.id)).toBe(false);
    const issue = blog.issues.find((i) => i.code === "PLACEMENT_UNCERTAIN")!;
    expect(issue.action).toContain("[IMAGE: team-offsite.png]");
  });

  it("preserves animation byte-for-byte and measures it", () => {
    const gif = asset(blog, "process.gif");
    expect(gif).toMatchObject({ kind: "animation", animated: true, frames: 5, format: "gif", width: 120, height: 80 });
    expect(readFileSync(join(out, gif.path)).equals(readFileSync(join(fx, "package/images/process.gif")))).toBe(true);
    expect(gif.convertedFrom).toBeUndefined();
  });

  it("pairs a video with its poster and subtitles by name, converting SRT syntax only", () => {
    const video = ofType(blog, "media").find((m) => m.assetId === asset(blog, "demo.mp4").id)!;
    expect(video.posterAssetId).toBe(asset(blog, "demo.png").id);
    expect(video.tracks).toEqual([expect.objectContaining({ assetId: asset(blog, "demo.en.srt").id, lang: "en" })]);
    const vtt = readFileSync(join(out, asset(blog, "demo.en.srt").path), "utf8");
    expect(vtt).toBe("WEBVTT\n\n1\n00:00:00.000 --> 00:00:01.500\nFIXTURE caption\n");
  });

  it("keeps a video link as a link, and turns a linked supplied file into a download", () => {
    expect(ofType(blog, "embed")[0]).toMatchObject({ provider: "youtube", mediaId: "dQw4w9WgXcQ", url: "https://youtu.be/dQw4w9WgXcQ" });
    expect(blog.assets.some((a) => a.filename.includes("dQw4w9WgXcQ"))).toBe(false);
    expect(asset(blog, "checklist.txt").role).toBe("download");
    expect(blog.links.every((l) => l.status === "unverified")).toBe(true);
  });

  it("gives every asset a unique id and never lists a file that is not on disk", () => {
    expect(new Set(blog.assets.map((a) => a.id)).size).toBe(blog.assets.length);
    expect(onDisk(out, blog)).toEqual([]);
    expect(readdirSync(join(out, "assets", blog.id)).length).toBe(blog.assets.length);
  });

  it("never writes into the source folder", () => {
    const before = readdirSync(join(fx, "package")).sort();
    expect(before).toEqual(["checklist.txt", "cover.png", "demo.en.srt", "demo.mp4", "demo.png", "images", "post.md", "pricing-comparison.png", "team-offsite.png"]);
    expect(spawnSync(PYTHON, [TOOL, join(fx, "package"), "--out", join(fx, "package", "out")]).status).toBe(2);
  });
});

describe("missing and incorrect media references", () => {
  it("reports the missing file, its section and a fix — and still processes everything else", () => {
    const blog = only(ingest(["package-missing"]).manifest);
    const gap = ofType(blog, "missing_media")[0]!;
    expect(gap).toMatchObject({ reference: "images/not-there.png", alt: "Not supplied" });
    const issue = blog.issues.find((i) => i.code === "MEDIA_MISSING")!;
    expect(issue).toMatchObject({ severity: "error", blockId: gap.id });
    expect(issue.action).toMatch(/Supply the file/);
    expect(blog.assets.some((a) => a.filename.includes("not-there"))).toBe(false);
    expect(ofType(blog, "media").length).toBeGreaterThanOrEqual(4);
  });
});

// ============================================================ HTML, structured data, presentations

describe("HTML", () => {
  it("extracts article content and drops scripts, handlers, unsafe links and unknown frames", () => {
    const { manifest, out } = ingest(["html"]);
    const blog = only(manifest);
    const serialised = JSON.stringify(blog.blocks) + JSON.stringify(blog.title);
    expect(blog.title?.text).toBe("FIXTURE HTML Post");
    expect(serialised).not.toMatch(/alert\(|onclick|steal\(|javascript:|document\.write|evil\.example|Footer chrome|Home/);
    expect(blog.metadata["lang"]?.value).toBe("en-IN");
    expect(blog.metadata["description"]?.value).toBe("Fixture description.");
    expect(ofType(blog, "paragraph")[0]!.inlines).toContainEqual({ t: "text", text: "good link", href: "https://example.org/ok" });
    expect(plainText(ofType(blog, "paragraph")[0]!.inlines)).toBe("Safe bold and a bad link and a good link."); // the words stay, the unsafe link does not
    expect(codes(blog)).toEqual(expect.arrayContaining(["LINK_UNSAFE_REMOVED", "EMBED_UNSUPPORTED", "EXTERNAL_MEDIA_NOT_FETCHED"]));
    expect(ofType(blog, "embed")[0]).toMatchObject({ provider: "youtube", mediaId: "abc123XYZ_-", title: "Walkthrough" });
    const shot = ofType(blog, "media")[0]!;
    expect(shot).toMatchObject({ alt: "Settings screen" });
    expect(plainText(shot.caption)).toBe("The settings screen");
    const video = ofType(blog, "media").find((m) => m.posterAssetId)!;
    expect(video.tracks?.[0]).toMatchObject({ kind: "captions", lang: "en", label: "English" });
    expect(ofType(blog, "external_media")[0]).toMatchObject({ url: "https://cdn.example.org/remote.png", alt: "Remote picture" });
    expect(onDisk(out, blog)).toEqual([]);
  });
});

describe("structured sources", () => {
  it("JSON article: maps fields without flattening, keeps record sets as tables", () => {
    const blog = only(ingest(["json"]).manifest);
    expect(blog.title?.text).toBe("FIXTURE JSON Article");
    expect(ofType(blog, "heading").map((h) => plainText(h.inlines))).toEqual(["First", "Data"]);
    expect(ofType(blog, "table")[0]!.rows.map((r) => r.map((c) => plainText(c.inlines)))).toEqual([["plan", "seats"], ["Starter", "50"], ["Growth", "250"]]);
    expect(ofType(blog, "media")[0]!.alt).toBe("A picture");
    expect(ofType(blog, "paragraph").find((p) => p.role === "cta")?.inlines).toEqual([{ t: "text", text: "Book a demo", href: "https://example.org/demo" }]);
  });

  it("CSV and XLSX: a table of exact values; a data file alone has no title and says so", () => {
    const csv = only(ingest(["csv"]).manifest);
    expect(ofType(csv, "table")[0]).toMatchObject({ headerRows: 1 });
    expect(codes(csv)).toContain("TITLE_MISSING");
    const xlsx = only(ingest(["xlsx"]).manifest);
    const table = ofType(xlsx, "table")[0]!;
    expect(plainText(table.caption)).toBe("Collections");
    expect(table.rows.map((r) => r.map((c) => plainText(c.inlines)))).toEqual([["Month", "Collected", "Rate"], ["Jan", "125,000.50", "82.5%"], ["Feb", "131,200.00", "87.1%"]]);
  });

  it("XML feed: one blog per item", () => {
    const { manifest } = ingest(["xml"]);
    expect(manifest.blogs.map((b) => b.title?.text)).toEqual(["FIXTURE Feed One", "FIXTURE Feed Two"]);
    expect(manifest.blogs[0]!.grouping).toBe("one blog per feed item");
    expect(ofType(manifest.blogs[0]!, "heading").map((h) => plainText(h.inlines))).toEqual(["Part"]);
  });
});

describe("presentations", () => {
  it("extracts slides in order but will not assume a deck is a blog", () => {
    const blog = only(ingest(["pptx"]).manifest);
    expect(blog.title?.text).toBe("FIXTURE Retention Playbook");
    expect(blog.subtitle?.text).toBe("Five habits of academies that keep students");
    expect(ofType(blog, "heading").map((h) => plainText(h.inlines))).toEqual(["Habit one: weekly progress notes"]);
    const list = ofType(blog, "list")[0]!;
    expect(list.items.map((i) => plainText(i.inlines))).toEqual(["Send one note per student", "Parents reply within a day"]);
    expect(list.items[0]!.children[0]).toMatchObject({ type: "list" });
    expect(ofType(blog, "media")[0]!.alt).toBe("Progress note example");
    expect(blog.issues.find((i) => i.code === "PRESENTATION_PURPOSE_UNCONFIRMED")).toMatchObject({ severity: "error" });
  });

  it("accepts the owner's confirmation", () => {
    expect(codes(only(ingest(["pptx"], ["--presentation-is-blog"]).manifest))).not.toContain("PRESENTATION_PURPOSE_UNCONFIRMED");
  });
});

// ============================================================ packages

describe("multiple documents and archives", () => {
  it("one blog per folder, each with its own media even when file names collide", () => {
    const { manifest } = ingest(["multi"]);
    expect(manifest.blogs.map((b) => b.title?.text)).toEqual(["FIXTURE alpha post", "FIXTURE beta post"]);
    const [a, b] = manifest.blogs.map((blog) => blog.assets[0]!);
    expect(a!.id).not.toBe(b!.id);
    expect(a!.sha256).not.toBe(b!.sha256);
    expect(manifest.blogs.map((blog) => ofType(blog, "media")[0]!.alt)).toEqual(["Diagram of alpha", "Diagram of beta"]);
  });

  it("numbered parts form one blog, in order", () => {
    const blog = only(ingest(["parts"]).manifest);
    expect(blog.grouping).toBe("numbered series in one folder");
    expect(blog.documents.map((d) => d.name)).toEqual(["01-intro.md", "02-body.md"]);
    expect(text(blog)).toMatch(/Intro part\..*Second part.*Body part\./);
  });

  it("asks rather than guesses when documents are supplied together with no relationship", () => {
    const { manifest } = ingest(["ambiguous"]);
    expect(manifest.blogs).toHaveLength(2);
    expect(manifest.blogs.every((b) => codes(b).includes("GROUPING_UNCONFIRMED"))).toBe(true);
    expect(manifest.issues.map((i) => i.code)).toContain("ASSET_UNASSIGNED");
    const merged = only(ingest(["ambiguous"], ["--single-blog"]).manifest);
    expect(merged.documents).toHaveLength(2);
    expect(codes(merged)).not.toContain("GROUPING_UNCONFIRMED");
  });

  it("unpacks a ZIP safely: entries that escape the archive are not written", () => {
    const { manifest, out } = ingest(["slip.zip"]);
    const blog = only(manifest);
    expect(blog.title?.text).toBe("FIXTURE Zipped Post");
    expect(ofType(blog, "media")).toHaveLength(1);
    expect(manifest.issues.map((i) => i.code)).toContain("ARCHIVE_ENTRIES_SKIPPED");
    expect(existsSync(join(root, "escaped.txt"))).toBe(false);
    expect(existsSync(join(out, "..", "escaped.txt"))).toBe(false);
  });

  it("applies an instruction file: title, cover, placement, alt text, caption and exclusions", () => {
    const blog = only(ingest(["sidecar"]).manifest);
    expect(blog.title).toMatchObject({ text: "FIXTURE Sidecar Title", source: "instruction file" });
    expect(blog.cover?.assetId).toBe(asset(blog, "banner.png").id);
    const results = ofType(blog, "media").find((m) => m.assetId === asset(blog, "results.png").id)!;
    expect(results).toMatchObject({ alt: "Bar chart of results", altSource: "instruction file" });
    expect(plainText(results.caption)).toBe("Results by term");
    const order = blog.blocks.map((b) => (b.type === "heading" ? plainText(b.inlines) : b.type === "media" ? "<results>" : b.type));
    expect(order.slice(order.indexOf("Results"), order.indexOf("Method"))).toEqual(["Results", "paragraph", "<results>"]);
    expect(blog.placements.find((p) => p.assetId === results.assetId)).toMatchObject({ basis: "explicit_instruction" });
    expect(asset(blog, "unused.png").role).toBe("not-displayed");
    expect(codes(blog)).not.toContain("PLACEMENT_UNCERTAIN");
  });
});

// ============================================================ unsafe and broken input

describe("file validation and unsafe content", () => {
  let manifest: BlogManifest;
  let out: string;
  beforeAll(() => {
    const r = ingest(["hostile"], ["--separate-blogs"]);
    manifest = r.manifest;
    out = r.out;
  });
  const input = (name: string) => manifest.inputs.find((i) => i.path === name)!;

  it("identifies files by content: executables are rejected whatever their extension", () => {
    expect(input("installer.exe")).toMatchObject({ status: "rejected" });
    expect(input("photo.png")).toMatchObject({ status: "rejected" });
    expect(manifest.issues.filter((i) => i.code === "FILE_REJECTED_UNSAFE")).toHaveLength(2);
    expect(input("renamed.jpg")).toMatchObject({ detectedFormat: "png", detectedBy: "signature", extensionFormat: "jpeg" });
    expect(manifest.issues.map((i) => i.code)).toEqual(expect.arrayContaining(["FILE_TYPE_MISMATCH", "FILE_EMPTY"]));
  });

  it("isolates a corrupt document: it fails alone and the valid blog is still produced", () => {
    const broken = manifest.blogs.find((b) => b.documents[0]!.name === "broken.docx")!;
    expect(broken.extractionStatus).toBe("failed");
    expect(codes(broken)).toContain("DOCUMENT_CORRUPT");
    const good = manifest.blogs.find((b) => b.documents[0]!.name === "post.md")!;
    expect(good.title?.text).toBe("FIXTURE Hostile Package");
    expect(good.extractionStatus).toBe("extracted");
  });

  it("sanitises SVG and removes scripted links", () => {
    const good = manifest.blogs.find((b) => b.documents[0]!.name === "post.md")!;
    const svg = readFileSync(join(out, asset(good, "logo.svg").path), "utf8");
    expect(svg).not.toMatch(/<script|onload|javascript:/i);
    expect(svg).toContain("<rect");
    expect(asset(good, "logo.svg")).toMatchObject({ width: 100, height: 50 });
    expect(codes(good)).toEqual(expect.arrayContaining(["SVG_SANITISED", "LINK_UNSAFE_REMOVED"]));
    expect(JSON.stringify(good.blocks)).not.toContain("javascript:");
  });

  it("refuses to overwrite an earlier run", () => {
    expect(spawnSync(PYTHON, [TOOL, join(fx, "txt"), "--out", out]).status).toBe(2);
  });
});
