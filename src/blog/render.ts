/**
 * BLOG ARTICLE RENDERER — one element tree, two serialisers.
 *
 * The tree is built from the mapped page; `toHtml` produces the static base layer
 * (semantic HTML, no JavaScript — the same contract as src/generation/render/html.ts)
 * and `toJsx` produces the body of a Next.js server component. One tree means the
 * static page and the Next page cannot drift apart.
 *
 * Only this file turns source text into markup, and every text node is escaped at
 * serialisation. Source documents contribute text and attributes, never markup.
 *
 * Rules consumed, by the id the existing generator cites them under:
 *   DD-074 / DD-081 every image carries width, height and an alt attribute
 *   DD-076          native elements first: details, video, audio, table — no script
 *   performance.embedLoading  third-party embeds reserve space and load on intent
 *   animation_library.md WCAG 2.2.2  moving content can be hidden by the reader
 */
import type { Block, BlogAsset, Inline, TableCell } from "./manifest.js";
import { plainText } from "./manifest.js";
import type { BlogPage } from "./map.js";

export type Child = El | string;
export interface El {
  tag: string;
  attrs: Record<string, string | number | boolean | undefined | null>;
  children: Child[];
}

export function h(tag: string, attrs: El["attrs"] = {}, ...children: Array<Child | Child[] | null | undefined | false>): El {
  return { tag, attrs, children: children.flat().filter((c): c is Child => c !== null && c !== undefined && c !== false) };
}

export interface RenderOptions {
  /**
   * `preview` shows what is missing or unresolved, marked for the reviewer.
   * `publish` renders content only; anything unresolved is absent, and the
   * readiness gate (validate.ts) decides whether that is acceptable.
   */
  mode: "preview" | "publish";
  /**
   * Class for the author's call-to-action link. Default "c-action": the generated site's button style. Pass
   * null on a site that defines no such style; the link is then an ordinary, underlined text link — never an
   * unstyled class that falls back to the browser's default blue (staging test, 2026-11-13).
   */
  actionClass?: string | null;
}

const EMBED_SRC: Record<string, (id: string) => string> = {
  youtube: (id) => `https://www.youtube-nocookie.com/embed/${id}`,
  vimeo: (id) => `https://player.vimeo.com/video/${id}`,
  loom: (id) => `https://www.loom.com/embed/${id}`,
};
const PROVIDER_NAME: Record<string, string> = {
  youtube: "YouTube",
  vimeo: "Vimeo",
  loom: "Loom",
  wistia: "Wistia",
  dailymotion: "Dailymotion",
  spotify: "Spotify",
  soundcloud: "SoundCloud",
};

const SAFE_SCHEME = /^(https?:\/\/|mailto:|tel:)/i;
const MEDIA_ID = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * A link target a published page may carry, or null. The ingest tool already
 * drops unsafe targets; the renderer checks again because a manifest can come
 * from another producer, and markup safety must not depend on who wrote it.
 */
export function safeHref(href: string | undefined | null): string | null {
  if (!href) return null;
  const value = href.trim();
  if (/[\u0000-\u001f\u007f]/.test(value)) return null;
  if (SAFE_SCHEME.test(value) || value.startsWith("#")) return value;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return null;
}

function slugId(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .slice(0, 60);
}

class Renderer {
  private notes = new Map<string, number>();
  private usedIds = new Set<string>();
  private tableCount = 0;

  private actionClass: string | undefined;

  constructor(
    private page: BlogPage,
    private options: RenderOptions,
  ) {
    this.actionClass = options.actionClass === undefined ? "c-action" : (options.actionClass ?? undefined);
    let n = 0;
    for (const block of page.body) if (block.type === "footnotes") for (const item of block.items) this.notes.set(item.id, ++n);
  }

  private uniqueId(base: string): string {
    let id = base || "section";
    for (let i = 2; this.usedIds.has(id); i += 1) id = `${base}-${i}`;
    this.usedIds.add(id);
    return id;
  }

  inlines(runs: readonly Inline[] | undefined, cta = false): Child[] {
    const out: Child[] = [];
    for (const run of runs ?? []) {
      if (run.t === "break") {
        out.push(h("br"));
        continue;
      }
      if (run.t === "fnref") {
        const number = this.notes.get(run.id);
        if (number === undefined) continue;
        out.push(h("sup", {}, h("a", { id: `fnref-${number}`, href: `#fn-${number}`, "aria-label": `Footnote ${number}` }, `[${number}]`)));
        continue;
      }
      let node: Child = run.text;
      if (run.code) node = h("code", {}, node);
      if (run.sub) node = h("sub", {}, node);
      if (run.sup) node = h("sup", {}, node);
      if (run.strike) node = h("s", {}, node);
      if (run.italic) node = h("em", {}, node);
      if (run.bold) node = h("strong", {}, node);
      if (run.href) {
        if (run.href.startsWith("asset:")) {
          // a download name is a file name only, never a path
          const asset = this.page.assets.get(run.href.slice(6));
          if (asset) node = h("a", { href: this.page.assetUrl(asset), download: asset.filename.replace(/[\\/\u0000-\u001f]/g, "_"), class: cta ? this.actionClass : undefined }, node);
        } else {
          const href = safeHref(run.href);
          if (href) node = h("a", { href, class: cta ? this.actionClass : undefined }, node);
        }
      }
      out.push(node);
    }
    return out;
  }

  private figure(kind: string, body: Child[], caption: readonly Inline[] | undefined, extra: El["attrs"] = {}): El {
    return h("figure", { class: `c-blog-figure c-blog-figure--${kind}`, ...extra }, body, caption && caption.length > 0 ? h("figcaption", {}, this.inlines(caption)) : null);
  }

  private reviewNote(code: string, text: string): El | null {
    if (this.options.mode !== "preview") return null;
    return h("div", { class: "c-blog-review", role: "note", "data-blog-review": code }, h("p", {}, text));
  }

  image(asset: BlogAsset, alt: string | null, decorative: boolean, priority: boolean): El {
    return h("img", {
      src: this.page.assetUrl(asset),
      alt: decorative ? "" : alt ?? "",
      width: asset.width ?? undefined,
      height: asset.height ?? undefined,
      loading: priority ? "eager" : "lazy",
      fetchpriority: priority ? "high" : undefined,
      decoding: "async",
      "data-animated": asset.kind === "animation" ? "true" : undefined,
    });
  }

  private media(block: Extract<Block, { type: "media" }>): Child[] {
    const asset = this.page.assets.get(block.assetId);
    if (!asset) return [];
    if (!asset.webReady) {
      const note = this.reviewNote("format", `Not shown: ${asset.filename} is a ${asset.format.toUpperCase()} file, which browsers cannot display.`);
      return note ? [note] : [];
    }
    const subject = asset.subject ?? asset.kind;
    if (asset.kind === "image") return [this.figure(subject, [this.image(asset, block.alt, block.decorative === true, false)], block.caption, { "data-asset": asset.id })];
    if (asset.kind === "animation") {
      // WCAG 2.2.2: an animation that starts by itself can be hidden by the reader.
      // <details> is the native, script-free mechanism; the image bytes are untouched.
      const label = block.alt ? `Animation: ${block.alt}` : "Animation";
      return [
        this.figure(
          "animation",
          [h("details", { class: "c-blog-animation", open: true }, h("summary", {}, `${label} (select to hide or show)`), this.image(asset, block.alt, block.decorative === true, false))],
          block.caption,
          { "data-asset": asset.id },
        ),
      ];
    }
    if (asset.kind === "video") {
      const poster = block.posterAssetId ? this.page.assets.get(block.posterAssetId) : undefined;
      const tracks = (block.tracks ?? []).flatMap((t) => {
        const track = this.page.assets.get(t.assetId);
        return track ? [h("track", { kind: t.kind === "captions" ? "captions" : "subtitles", src: this.page.assetUrl(track), srclang: t.lang ?? undefined, label: t.label ?? t.lang ?? "Subtitles" })] : [];
      });
      const player = h(
        "video",
        { controls: true, preload: "metadata", playsinline: true, width: asset.width ?? undefined, height: asset.height ?? undefined, poster: poster ? this.page.assetUrl(poster) : undefined, "aria-label": block.alt ?? undefined },
        h("source", { src: this.page.assetUrl(asset), type: asset.mime }),
        tracks,
        h("a", { href: this.page.assetUrl(asset) }, `Download the video (${asset.filename})`),
      );
      return [this.figure("video", [player], block.caption, { "data-asset": asset.id })];
    }
    if (asset.kind === "audio") {
      const player = h("audio", { controls: true, preload: "none", "aria-label": block.alt ?? undefined }, h("source", { src: this.page.assetUrl(asset), type: asset.mime }), h("a", { href: this.page.assetUrl(asset) }, `Download the audio (${asset.filename})`));
      return [this.figure("audio", [player], block.caption, { "data-asset": asset.id })];
    }
    return [];
  }

  private cell(cell: TableCell, header: boolean, scope: "col" | "row"): El {
    return h(header ? "th" : "td", { scope: header ? scope : undefined, colspan: cell.colspan, rowspan: cell.rowspan }, this.inlines(cell.inlines));
  }

  private table(rows: TableCell[][], headerRows: number, caption: Child[] | null): El {
    this.tableCount += 1;
    const captionId = `blog-table-${this.tableCount}`;
    const head = rows.slice(0, headerRows);
    const body = rows.slice(headerRows);
    return h(
      "div",
      { class: "c-blog-table-scroll", role: "region", tabindex: 0, "aria-labelledby": caption ? captionId : undefined, "aria-label": caption ? undefined : `Table ${this.tableCount}` },
      h(
        "table",
        { class: "c-blog-table" },
        caption ? h("caption", { id: captionId }, caption) : null,
        head.length > 0 ? h("thead", {}, head.map((r) => h("tr", {}, r.map((c) => this.cell(c, true, "col"))))) : null,
        h("tbody", {}, body.map((r) => h("tr", {}, r.map((c) => this.cell(c, c.header === true, "row"))))),
      ),
    );
  }

  block(block: Block): Child[] {
    const cta = this.page.ctaBlockIds.has(block.id);
    switch (block.type) {
      case "heading":
        return [h(`h${block.level}`, { id: this.uniqueId(slugId(plainText(block.inlines))) }, this.inlines(block.inlines))];
      case "paragraph": {
        const soleLink = cta && block.inlines.filter((r) => r.t === "text" && r.text.trim()).every((r) => r.t === "text" && r.href);
        return [h("p", { class: cta ? "c-blog-cta" : undefined }, this.inlines(block.inlines, soleLink))];
      }
      case "list":
        return [
          h(
            block.ordered ? "ol" : "ul",
            { start: block.ordered && block.start && block.start !== 1 ? block.start : undefined },
            block.items.map((item) => h("li", {}, this.inlines(item.inlines), item.children.flatMap((c) => this.block(c)))),
          ),
        ];
      case "table":
        return [this.table(block.rows, block.headerRows, block.caption ? this.inlines(block.caption) : null)];
      case "blockquote":
        return [h("blockquote", {}, block.blocks.flatMap((b) => this.block(b)))];
      case "code":
        return [h("pre", { class: "c-blog-code", tabindex: 0 }, h("code", { class: block.language ? `language-${block.language.replace(/[^\w+#.-]/g, "")}` : undefined }, block.text))];
      case "media":
        return this.media(block);
      case "embed": {
        const name = PROVIDER_NAME[block.provider] ?? block.provider;
        const title = block.title ?? `Video on ${name}`;
        const url = safeHref(block.url);
        if (!url || !/^https?:/i.test(url)) return [];
        const src = MEDIA_ID.test(block.mediaId) ? EMBED_SRC[block.provider]?.(block.mediaId) : undefined;
        const link = h("p", { class: "c-blog-embed-link" }, h("a", { href: url }, `${block.title ?? "Watch"} on ${name}`));
        // Click-to-load without script: a lazy iframe inside a closed <details> is not
        // fetched until the reader opens it. The plain link always remains.
        const frame = src
          ? h("details", { class: "c-blog-embed" }, h("summary", {}, `Play here: ${title}`), h("div", { class: "c-blog-embed-frame" }, h("iframe", { src, title, loading: "lazy", allowfullscreen: true, referrerpolicy: "strict-origin-when-cross-origin" })))
          : null;
        return [this.figure("embed", [frame, link].filter((c): c is El => c !== null), block.caption, { "data-embed": block.provider })];
      }
      case "chart": {
        // Native chart data is presented as its exact data table (see blog_publishing.md §CHARTS).
        const header: TableCell[] = [{ inlines: [{ t: "text", text: block.axisTitles?.category ?? "" }] }, ...block.series.map((s, i) => ({ inlines: [{ t: "text" as const, text: s.name ?? `Series ${i + 1}` }] }))];
        const length = Math.max(block.categories.length, ...block.series.map((s) => s.values.length));
        const rows: TableCell[][] = Array.from({ length }, (_, r) => [
          { inlines: [{ t: "text" as const, text: block.categories[r] ?? "" }], header: true },
          ...block.series.map((s) => ({ inlines: [{ t: "text" as const, text: s.values[r] ?? "" }] })),
        ]);
        const captionText = block.title ?? block.alt ?? null;
        const caption: Child[] | null = captionText ? [captionText] : null;
        return [this.figure("chart-data", [this.table([header, ...rows], 1, caption)], block.caption, { "data-chart-type": block.chartType ?? "unknown" })];
      }
      case "rule":
        return [h("hr")];
      case "footnotes":
        return [
          h(
            "section",
            { class: "c-blog-footnotes", "aria-label": "Footnotes" },
            h("ol", {}, block.items.map((item) => {
              const number = this.notes.get(item.id) ?? 0;
              return h("li", { id: `fn-${number}` }, this.inlines(item.inlines), " ", h("a", { href: `#fnref-${number}`, "aria-label": `Back to reference ${number}` }, "\u21a9"));
            })),
          ),
        ];
      case "missing_media": {
        const note = this.reviewNote("missing", `Missing ${block.mediaKind}: ${block.reason ?? block.reference}.`);
        return note ? [note] : [];
      }
      case "external_media": {
        const url = safeHref(block.url);
        return url && /^https?:/i.test(url) ? [this.figure("external", [h("p", {}, h("a", { href: url }, block.alt ?? block.url))], block.caption)] : [];
      }
    }
  }

  article(): El {
    const page = this.page;
    const header: Child[] = [];
    if (page.title) header.push(h("h1", { id: "blog-title" }, this.inlines(page.title)));
    else {
      const note = this.reviewNote("title", "No title was found in the source document. A title is required before publishing.");
      if (note) header.push(note);
    }
    if (page.subtitle) header.push(h("p", { class: "c-blog-subtitle" }, this.inlines(page.subtitle)));
    if (page.byline.author || page.byline.date) {
      const parts: Child[] = [];
      if (page.byline.author) parts.push(h("span", { class: "c-blog-author" }, page.byline.author));
      if (page.byline.author && page.byline.date) parts.push(" \u00b7 ");
      if (page.byline.date) parts.push(h("time", { datetime: page.byline.date.iso ?? undefined }, page.byline.date.display));
      header.push(h("p", { class: "c-blog-byline" }, parts));
    }
    const hero = page.cover && page.cover.asset.webReady ? this.figure("cover", [this.image(page.cover.asset, page.cover.alt, page.cover.decorative, true)], page.cover.caption, { "data-asset": page.cover.asset.id }) : null;
    return h(
      "article",
      { class: "c-blog", "aria-labelledby": page.title ? "blog-title" : undefined, "data-blog": page.blogId },
      h("header", { class: "c-blog-header" }, header),
      hero,
      h("div", { class: "c-blog-body" }, page.body.flatMap((b) => this.block(b))),
    );
  }
}

export function renderArticle(page: BlogPage, options: RenderOptions): El {
  return new Renderer(page, options).article();
}

// ------------------------------------------------------------------ serialisers

const VOID = new Set(["br", "hr", "img", "source", "track", "meta", "link"]);

export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function toHtml(node: Child): string {
  if (typeof node === "string") return escapeHtml(node);
  const attrs = Object.entries(node.attrs)
    .filter(([, v]) => v !== undefined && v !== null && v !== false)
    .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${escapeHtml(String(v))}"`))
    .join("");
  if (VOID.has(node.tag)) return `<${node.tag}${attrs}>`;
  return `<${node.tag}${attrs}>${node.children.map(toHtml).join("")}</${node.tag}>`;
}

const JSX_ATTR: Record<string, string> = {
  class: "className",
  colspan: "colSpan",
  rowspan: "rowSpan",
  tabindex: "tabIndex",
  datetime: "dateTime",
  srclang: "srcLang",
  playsinline: "playsInline",
  allowfullscreen: "allowFullScreen",
  referrerpolicy: "referrerPolicy",
  fetchpriority: "fetchPriority",
  for: "htmlFor",
};

function jsxText(text: string): string {
  return `{\`${text.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${")}\`}`;
}

/**
 * JSX for a Next.js server component. Images go through `next/image`
 * (stack_doctrine.md L3 Media); an animation or SVG is passed `unoptimized` so its
 * bytes — and therefore its animation — reach the browser unchanged.
 */
export function toJsx(node: Child, indent = "      "): string {
  if (typeof node === "string") return jsxText(node);
  const entries = Object.entries(node.attrs).filter(([, v]) => v !== undefined && v !== null && v !== false);
  let tag = node.tag;
  if (tag === "img") {
    const width = node.attrs["width"];
    const height = node.attrs["height"];
    if (typeof width === "number" && typeof height === "number") {
      tag = "Image";
      const src = String(node.attrs["src"] ?? "");
      const passthrough = node.attrs["data-animated"] === "true" || /\.(svg|gif)$/i.test(src);
      const kept = entries.filter(([k]) => !["loading", "fetchpriority", "decoding"].includes(k));
      const extra = [node.attrs["loading"] === "eager" ? " priority" : "", passthrough ? " unoptimized" : ' sizes="(min-width: 60rem) 56rem, 100vw"'].join("");
      return `<Image${kept.map(([k, v]) => jsxAttr(k, v)).join("")}${extra} />`;
    }
  }
  const attrs = entries.map(([k, v]) => jsxAttr(k, v)).join("");
  if (VOID.has(tag)) return `<${tag}${attrs} />`;
  const block = ["article", "header", "div", "figure", "section", "table", "thead", "tbody", "tr", "ul", "ol", "blockquote", "details", "video", "audio"].includes(tag);
  const children = node.children.map((c) => toJsx(c, `${indent}  `));
  return block ? `<${tag}${attrs}>\n${children.map((c) => `${indent}  ${c}`).join("\n")}\n${indent}</${tag}>` : `<${tag}${attrs}>${children.join("")}</${tag}>`;
}

function jsxAttr(name: string, value: unknown): string {
  const key = JSX_ATTR[name] ?? name;
  if (value === true) return ` ${key}`;
  if (typeof value === "number") return ` ${key}={${value}}`;
  return ` ${key}={${JSON.stringify(String(value))}}`;
}
