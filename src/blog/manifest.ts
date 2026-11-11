/**
 * BLOG MANIFEST — the contract between ingestion and presentation.
 *
 * `website_workflow/tools/blog_ingest.py` PRODUCES this document; everything in
 * `src/blog/` CONSUMES it. One schema, parsed once, so a field the extractor
 * stops writing is a parse failure here rather than an `undefined` three files
 * later (website_workflow/framework_seams.md: the record is the authority).
 *
 * The manifest describes an ALREADY-WRITTEN blog. Nothing in this module — or
 * anything downstream of it — authors, rewrites or completes content.
 */
import { z } from "zod";

export const BLOG_MANIFEST_SCHEMA = "framework:blog-manifest@1";

// ------------------------------------------------------------------ inlines

export interface TextRun {
  t: "text";
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  strike?: boolean;
  sup?: boolean;
  sub?: boolean;
  /** An absolute/relative URL, or `asset:<id>` for a supplied file offered as a download. */
  href?: string;
}
export type Inline = TextRun | { t: "break" } | { t: "fnref"; id: string };

const inlineSchema: z.ZodType<Inline> = z.union([
  z.object({
    t: z.literal("text"),
    text: z.string(),
    bold: z.boolean().optional(),
    italic: z.boolean().optional(),
    code: z.boolean().optional(),
    strike: z.boolean().optional(),
    sup: z.boolean().optional(),
    sub: z.boolean().optional(),
    href: z.string().optional(),
  }),
  z.object({ t: z.literal("break") }),
  z.object({ t: z.literal("fnref"), id: z.string() }),
]);
const inlines = z.array(inlineSchema);

// ------------------------------------------------------------------ blocks

interface BlockBase {
  id: string;
  /** Set when a blog was assembled from several documents. */
  sourceDocument?: string;
  /** Page or slide the block came from, where the format has pages. */
  sourcePage?: number;
}
export interface TableCell {
  inlines: Inline[];
  colspan?: number;
  rowspan?: number;
  header?: boolean;
}
export interface ListItem {
  inlines: Inline[];
  children: Block[];
}
export interface MediaTrack {
  assetId: string;
  kind: string;
  lang?: string | null;
  label?: string | null;
}
export interface ChartSeries {
  name: string | null;
  values: Array<string | null>;
  kind: string;
  formatCode?: string;
  categories?: string[];
}

export type Block = BlockBase &
  (
    | { type: "heading"; level: number; inlines: Inline[] }
    | { type: "paragraph"; inlines: Inline[]; role?: string; ocr?: boolean }
    | { type: "list"; ordered: boolean; start?: number | null; items: ListItem[] }
    | { type: "table"; headerRows: number; rows: TableCell[][]; caption?: Inline[]; reconstructed?: boolean; sourceSheet?: string }
    | { type: "blockquote"; blocks: Block[] }
    | { type: "code"; language: string | null; text: string }
    | {
        type: "media";
        assetId: string;
        alt: string | null;
        altSource?: string | null;
        decorative?: boolean;
        caption?: Inline[];
        posterAssetId?: string;
        tracks?: MediaTrack[];
      }
    | { type: "embed"; provider: string; mediaId: string; url: string; title: string | null; caption?: Inline[] }
    | {
        type: "chart";
        chartType: string | null;
        title: string | null;
        categories: string[];
        series: ChartSeries[];
        stacked?: string;
        axisTitles?: { category?: string; value?: string };
        alt?: string;
        caption?: Inline[];
      }
    | { type: "rule" }
    | { type: "footnotes"; items: Array<{ id: string; inlines: Inline[] }> }
    | { type: "missing_media"; reference: string; mediaKind: string; alt: string | null; reason: string | null; suggestions?: string[]; caption?: Inline[] }
    | { type: "external_media"; url: string; mediaKind: string; alt: string | null; caption?: Inline[] }
  );

const base = { id: z.string().min(1), sourceDocument: z.string().optional(), sourcePage: z.number().int().optional() };
const cell = z.object({ inlines, colspan: z.number().int().positive().optional(), rowspan: z.number().int().positive().optional(), header: z.boolean().optional() });

const blockSchema: z.ZodType<Block> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({ ...base, type: z.literal("heading"), level: z.number().int().min(1).max(6), inlines }),
    z.object({ ...base, type: z.literal("paragraph"), inlines, role: z.string().optional(), ocr: z.boolean().optional() }),
    z.object({
      ...base,
      type: z.literal("list"),
      ordered: z.boolean(),
      start: z.number().int().nullable().optional(),
      items: z.array(z.object({ inlines, children: z.array(blockSchema) })),
    }),
    z.object({
      ...base,
      type: z.literal("table"),
      headerRows: z.number().int().min(0),
      rows: z.array(z.array(cell)).min(1),
      caption: inlines.optional(),
      reconstructed: z.boolean().optional(),
      sourceSheet: z.string().optional(),
    }),
    z.object({ ...base, type: z.literal("blockquote"), blocks: z.array(blockSchema) }),
    z.object({ ...base, type: z.literal("code"), language: z.string().nullable(), text: z.string() }),
    z.object({
      ...base,
      type: z.literal("media"),
      assetId: z.string().min(1),
      alt: z.string().nullable(),
      altSource: z.string().nullable().optional(),
      decorative: z.boolean().optional(),
      caption: inlines.optional(),
      posterAssetId: z.string().optional(),
      tracks: z.array(z.object({ assetId: z.string(), kind: z.string(), lang: z.string().nullable().optional(), label: z.string().nullable().optional() })).optional(),
    }),
    z.object({ ...base, type: z.literal("embed"), provider: z.string(), mediaId: z.string(), url: z.string(), title: z.string().nullable(), caption: inlines.optional() }),
    z.object({
      ...base,
      type: z.literal("chart"),
      chartType: z.string().nullable(),
      title: z.string().nullable(),
      categories: z.array(z.string()),
      series: z.array(
        z.object({
          name: z.string().nullable(),
          values: z.array(z.string().nullable()),
          kind: z.string(),
          formatCode: z.string().optional(),
          categories: z.array(z.string()).optional(),
        }),
      ),
      stacked: z.string().optional(),
      axisTitles: z.object({ category: z.string().optional(), value: z.string().optional() }).optional(),
      alt: z.string().optional(),
      caption: inlines.optional(),
    }),
    z.object({ ...base, type: z.literal("rule") }),
    z.object({ ...base, type: z.literal("footnotes"), items: z.array(z.object({ id: z.string(), inlines })) }),
    z.object({
      ...base,
      type: z.literal("missing_media"),
      reference: z.string(),
      mediaKind: z.string(),
      alt: z.string().nullable(),
      reason: z.string().nullable(),
      suggestions: z.array(z.string()).optional(),
      caption: inlines.optional(),
    }),
    z.object({ ...base, type: z.literal("external_media"), url: z.string(), mediaKind: z.string(), alt: z.string().nullable(), caption: inlines.optional() }),
  ]),
) as z.ZodType<Block>;

// ------------------------------------------------------------------ assets, placements, issues

export const ASSET_KINDS = ["image", "animation", "video", "audio", "captions", "document", "data", "other"] as const;
export const ASSET_ROLES = ["cover", "supporting", "poster", "captions", "download", "source-data", "unplaced", "not-displayed"] as const;

const assetSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(ASSET_KINDS),
  role: z.enum(ASSET_ROLES),
  subject: z.string().nullable(),
  filename: z.string(),
  sourceNames: z.array(z.string()),
  /** Relative to the run directory. The file exists there, or the asset is not in the manifest. */
  path: z.string().min(1),
  origin: z.enum(["embedded", "supplied", "embedded+supplied"]),
  sourceDocument: z.string().nullable(),
  format: z.string(),
  mime: z.string(),
  bytes: z.number().int().nonnegative(),
  sha256: z.string().length(64),
  sourceSha256: z.string().length(64),
  width: z.number().nullable(),
  height: z.number().nullable(),
  animated: z.boolean().nullable(),
  frames: z.number().nullable().optional(),
  durationSeconds: z.number().nullable().optional(),
  webReady: z.boolean(),
  available: z.literal(true),
  notes: z.array(z.string()),
  sectionId: z.string().optional(),
  videoCodec: z.string().optional(),
  convertedFrom: z.object({ format: z.string(), sha256: z.string(), via: z.string() }).optional(),
});
export type BlogAsset = z.infer<typeof assetSchema>;

export const PLACEMENT_BASES = ["explicit_instruction", "document_reference", "caption", "heading", "context", "document_order", "filename_convention", "none"] as const;
const placementSchema = z.object({
  assetId: z.string(),
  status: z.enum(["placed", "unplaced", "excluded"]),
  blockId: z.string().nullable().optional(),
  sectionId: z.string().nullable().optional(),
  position: z.enum(["hero", "inline"]).optional(),
  basis: z.enum(PLACEMENT_BASES),
  confidence: z.enum(["high", "medium", "low", "none"]),
  note: z.string().nullable().optional(),
  suggestedAfterBlockId: z.string().optional(),
});
export type Placement = z.infer<typeof placementSchema>;

const issueSchema = z.object({
  code: z.string().min(1),
  severity: z.enum(["error", "warning", "info"]),
  message: z.string().min(1),
  /** The corrective action. Every issue carries one — an issue with no remedy is a complaint. */
  action: z.string().min(1),
  section: z.string().optional(),
  blockId: z.string().optional(),
  assetId: z.string().optional(),
  document: z.string().optional(),
});
export type BlogIssue = z.infer<typeof issueSchema>;

const sourced = z.object({ value: z.union([z.string(), z.array(z.string())]), source: z.string() });
const sectionSchema = z.object({
  id: z.string(),
  headingBlockId: z.string().nullable(),
  title: z.string().nullable(),
  level: z.number().int(),
  role: z.enum(["introduction", "body", "conclusion", "references", "cta", "footnotes"]),
  blockIds: z.array(z.string()),
});
export type BlogSection = z.infer<typeof sectionSchema>;

const blogSchema = z.object({
  id: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  grouping: z.string(),
  extractionStatus: z.enum(["extracted", "partial", "failed"]),
  documents: z.array(
    z.object({
      name: z.string(),
      path: z.string(),
      sha256: z.string().nullable(),
      format: z.string(),
      status: z.enum(["extracted", "partial", "failed", "unsupported"]),
      extractor: z.string(),
      blocks: z.number().int(),
      embeddedMedia: z.number().int(),
      pages: z.number().int().optional(),
      notes: z.record(z.unknown()),
    }),
  ),
  title: z.object({ inlines, text: z.string(), source: z.string() }).nullable(),
  subtitle: z.object({ inlines, text: z.string(), source: z.string() }).nullable(),
  metadata: z.record(sourced),
  cover: z
    .object({
      assetId: z.string(),
      alt: z.string().nullable(),
      altSource: z.string().nullable().optional(),
      decorative: z.boolean().optional(),
      caption: inlines.optional(),
      basis: z.string(),
      confidence: z.string(),
    })
    .nullable(),
  sections: z.array(sectionSchema),
  blocks: z.array(blockSchema),
  assets: z.array(assetSchema),
  placements: z.array(placementSchema),
  links: z.array(
    z.object({
      url: z.string(),
      uses: z.number().int(),
      status: z.enum(["unverified", "ok", "broken"]),
      media: z.boolean().optional(),
      blockId: z.string().optional(),
      httpStatus: z.number().nullable().optional(),
      note: z.string().optional(),
    }),
  ),
  issues: z.array(issueSchema),
  counts: z.record(z.number()),
});
export type Blog = z.infer<typeof blogSchema>;

export const blogManifestSchema = z.object({
  schema: z.literal(BLOG_MANIFEST_SCHEMA),
  generatedAt: z.string(),
  tool: z.object({ name: z.string(), version: z.string(), capabilities: z.record(z.boolean()), options: z.record(z.boolean()) }),
  sidecar: z.string().nullable(),
  inputs: z.array(
    z.object({
      path: z.string(),
      bytes: z.number().int(),
      sha256: z.string().nullable(),
      detectedFormat: z.string().nullable(),
      detectedBy: z.string(),
      category: z.string(),
      role: z.string().nullable(),
      status: z.string(),
      origin: z.string(),
      extensionFormat: z.string().nullable().optional(),
      note: z.string().optional(),
    }),
  ),
  blogs: z.array(blogSchema),
  issues: z.array(issueSchema),
  trace: z.array(z.record(z.unknown())),
});
export type BlogManifest = z.infer<typeof blogManifestSchema>;

/** Parse a manifest. A manifest from another schema version is refused, not adapted. */
export function parseBlogManifest(value: unknown): BlogManifest {
  const result = blogManifestSchema.safeParse(value);
  if (!result.success) {
    const first = result.error.issues.slice(0, 5).map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);
    throw new Error(`not a valid ${BLOG_MANIFEST_SCHEMA} manifest — ${first.join("; ")}`);
  }
  return result.data;
}

// ------------------------------------------------------------------ traversal

/** Every block, depth first, including those nested in list items and quotes. */
export function* walkBlocks(blocks: readonly Block[]): Generator<Block> {
  for (const block of blocks) {
    yield block;
    if (block.type === "list") for (const item of block.items) yield* walkBlocks(item.children);
    else if (block.type === "blockquote") yield* walkBlocks(block.blocks);
  }
}

/** Every inline run list a block carries (text, cells, items, captions, notes). */
export function inlineListsOf(block: Block): Inline[][] {
  const lists: Inline[][] = [];
  if (block.type === "heading" || block.type === "paragraph") lists.push(block.inlines);
  if (block.type === "list") for (const item of block.items) lists.push(item.inlines);
  if (block.type === "table") for (const row of block.rows) for (const c of row) lists.push(c.inlines);
  if (block.type === "footnotes") for (const item of block.items) lists.push(item.inlines);
  if ("caption" in block && block.caption) lists.push(block.caption);
  return lists;
}

export function plainText(runs: readonly Inline[] | undefined): string {
  return (runs ?? []).map((r) => (r.t === "text" ? r.text : r.t === "break" ? " " : "")).join("");
}

// ------------------------------------------------------------------ integrity

export interface IntegrityOptions {
  /** Size in bytes of a run-relative file, or null when it does not exist. */
  fileSize?: (relativePath: string) => number | null;
  /** SHA-256 of a run-relative file. When given, every asset's bytes are verified. */
  fileSha256?: (relativePath: string) => string | null;
}

/**
 * Referential integrity of one blog. Returns the problems found; an empty list
 * means every id is unique and every reference resolves.
 *
 * This is the mechanical form of "no media reference points to a missing file":
 * a manifest that fails here is not rendered, previewed or published.
 */
export function checkBlogIntegrity(blog: Blog, options: IntegrityOptions = {}): string[] {
  const problems: string[] = [];
  const assetIds = new Set<string>();
  for (const asset of blog.assets) {
    if (assetIds.has(asset.id)) problems.push(`duplicate asset id ${asset.id}`);
    assetIds.add(asset.id);
    if (asset.path.includes("..") || asset.path.startsWith("/")) problems.push(`asset ${asset.id} has an unsafe path ${asset.path}`);
    if (options.fileSize) {
      const size = options.fileSize(asset.path);
      if (size === null) problems.push(`asset ${asset.id} (${asset.filename}) is listed but its file ${asset.path} does not exist`);
      else if (size !== asset.bytes) problems.push(`asset ${asset.id} (${asset.filename}) is ${size} bytes on disk but ${asset.bytes} in the manifest`);
    }
    if (options.fileSha256) {
      const digest = options.fileSha256(asset.path);
      if (digest !== null && digest !== asset.sha256) problems.push(`asset ${asset.id} (${asset.filename}) does not match its recorded SHA-256`);
    }
  }
  const blockIds = new Set<string>();
  const noteIds = new Set<string>();
  for (const block of walkBlocks(blog.blocks)) {
    if (blockIds.has(block.id)) problems.push(`duplicate block id ${block.id}`);
    blockIds.add(block.id);
    if (block.type === "footnotes") for (const item of block.items) noteIds.add(item.id);
  }
  const needAsset = (id: string, where: string) => {
    if (!assetIds.has(id)) problems.push(`${where} references asset ${id}, which is not in the manifest`);
  };
  for (const block of walkBlocks(blog.blocks)) {
    if (block.type === "media") {
      needAsset(block.assetId, `block ${block.id}`);
      if (block.posterAssetId) needAsset(block.posterAssetId, `block ${block.id} poster`);
      for (const track of block.tracks ?? []) needAsset(track.assetId, `block ${block.id} track`);
    }
    for (const list of inlineListsOf(block)) {
      for (const run of list) {
        if (run.t === "fnref" && !noteIds.has(run.id)) problems.push(`block ${block.id} cites footnote ${run.id}, which has no text`);
        if (run.t === "text" && run.href?.startsWith("asset:")) needAsset(run.href.slice(6), `a link in block ${block.id}`);
      }
    }
  }
  if (blog.cover) needAsset(blog.cover.assetId, "the cover");
  for (const placement of blog.placements) {
    needAsset(placement.assetId, "a placement");
    if (placement.blockId && !blockIds.has(placement.blockId)) problems.push(`a placement references block ${placement.blockId}, which does not exist`);
  }
  const sectioned = new Set<string>();
  for (const section of blog.sections) {
    for (const id of section.blockIds) {
      if (!blockIds.has(id)) problems.push(`section ${section.id} references block ${id}, which does not exist`);
      if (sectioned.has(id)) problems.push(`block ${id} belongs to two sections`);
      sectioned.add(id);
    }
  }
  for (const block of blog.blocks) if (!sectioned.has(block.id)) problems.push(`block ${block.id} belongs to no section`);
  return problems;
}
