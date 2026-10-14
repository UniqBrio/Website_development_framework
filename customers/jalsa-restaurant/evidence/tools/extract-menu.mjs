// VERBATIM EXTRACTION of customers/jalsa-restaurant/raw/jalsa-restaurant-menu.docx.
//
// Reads the raw file READ-ONLY (it is never written, renamed or normalised) and
// returns every text-bearing body element in document order, with a locator for
// each value. No text is trimmed, re-spelled, re-cased, merged or corrected:
// ambiguity is FLAGGED beside the value, never resolved into it.
//
// Usage:  node customers/jalsa-restaurant/evidence/tools/extract-menu.mjs
//         → writes evidence/menu-source-extraction.json
// Tests import `extractMenu` and compare against the committed JSON (drift = fail).
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const RAW_MENU = join(HERE, "..", "..", "raw", "jalsa-restaurant-menu.docx");

/** Minimal ZIP reader (central directory; stored or deflated entries). */
function readZipEntry(buffer, name) {
  const eocd = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error("not a zip: no end-of-central-directory record");
  const entries = buffer.readUInt16LE(eocd + 10);
  let p = buffer.readUInt32LE(eocd + 16);
  for (let i = 0; i < entries; i++) {
    if (buffer.readUInt32LE(p) !== 0x02014b50) throw new Error("corrupt central directory");
    const method = buffer.readUInt16LE(p + 10);
    const compressed = buffer.readUInt32LE(p + 20);
    const nameLen = buffer.readUInt16LE(p + 28);
    const extraLen = buffer.readUInt16LE(p + 30);
    const commentLen = buffer.readUInt16LE(p + 32);
    const localOffset = buffer.readUInt32LE(p + 42);
    const entryName = buffer.toString("utf8", p + 46, p + 46 + nameLen);
    if (entryName === name) {
      const lNameLen = buffer.readUInt16LE(localOffset + 26);
      const lExtraLen = buffer.readUInt16LE(localOffset + 28);
      const start = localOffset + 30 + lNameLen + lExtraLen;
      const data = buffer.subarray(start, start + compressed);
      if (method === 0) return data.toString("utf8");
      if (method === 8) return inflateRawSync(data).toString("utf8");
      throw new Error(`unsupported zip method ${method}`);
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  return null;
}

const decode = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

function paragraphText(pXml) {
  let text = "";
  for (const m of pXml.matchAll(/<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\/>/g)) {
    text += m[0] === "<w:tab/>" ? "\t" : m[0] === "<w:br/>" ? "\n" : decode(m[1]);
  }
  return text;
}
const isBold = (pXml) => /<w:b\/>/.test(pXml);
const listLevel = (pXml) => {
  const m = /<w:numPr>[\s\S]*?<w:ilvl w:val="(\d+)"[\s\S]*?<w:numId w:val="(\d+)"/.exec(pXml);
  return m ? { numId: Number(m[2]), level: Number(m[1]) } : null;
};

/** Flags are OBSERVATIONS about a source value. They never change the value. */
function flagsForRow(row) {
  const flags = [];
  if (/\[[^\]]*\]/.test(row.item)) flags.push({ code: "BRACKETED_TRANSCRIPTION_NOTE", note: `item text contains a bracketed note ${row.item.match(/\[[^\]]*\]/g).join(", ")} — not a dish name; the underlying item is not identifiable from the source` });
  if (/partially visible/i.test(row.item)) flags.push({ code: "PARTIAL_ENTRY", note: "the source itself states the text is only partially visible" });
  if (row.category.includes(" / ")) flags.push({ code: "MULTI_OR_AMBIGUOUS_CATEGORY", note: `category "${row.category}" joins more than one category name; the source does not say whether the item belongs to both or which one is correct` });
  if (row.item.includes(" / ")) flags.push({ code: "MULTI_VALUE_ITEM", note: "item text joins two values with \" / \"" });
  if (/\b\d+\s*pc\b|\bHalf\b|\bFull\b/i.test(row.item)) flags.push({ code: "PORTION_IN_NAME", note: "a portion or quantity appears in the item text; other items state none" });
  if (!/^₹\d+$/.test(row.price)) flags.push({ code: "PRICE_NOT_SIMPLE", note: "price is not a plain rupee amount" });
  return flags;
}

export function extractMenu(path = RAW_MENU) {
  const buffer = readFileSync(path);
  const documentXml = readZipEntry(buffer, "word/document.xml");
  const coreXml = readZipEntry(buffer, "docProps/core.xml") ?? "";
  const appXml = readZipEntry(buffer, "docProps/app.xml") ?? "";
  if (!documentXml) throw new Error("word/document.xml missing");
  const body = documentXml.slice(documentXml.indexOf("<w:body>") + 8, documentXml.lastIndexOf("</w:body>"));

  const elements = [];
  let tableIndex = 0;
  let paragraphIndex = 0;
  const tokens = /<w:tbl>[\s\S]*?<\/w:tbl>|<w:p(?:\s[^>]*)?\/>|<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g;
  for (const m of body.matchAll(tokens)) {
    const xml = m[0];
    if (xml.startsWith("<w:tbl>")) {
      const rows = [...xml.matchAll(/<w:tr[ >][\s\S]*?<\/w:tr>/g)].map((tr) =>
        [...tr[0].matchAll(/<w:tc>[\s\S]*?<\/w:tc>/g)].map((tc) => ({
          text: [...tc[0].matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)].map((p) => paragraphText(p[0])).join("\n"),
          bold: isBold(tc[0]),
        })),
      );
      elements.push({ type: "table", locator: `body table ${tableIndex}`, rows });
      tableIndex += 1;
    } else {
      const text = xml.endsWith("/>") ? "" : paragraphText(xml);
      elements.push({ type: "paragraph", locator: `body paragraph ${paragraphIndex}`, text, bold: isBold(xml), list: listLevel(xml) });
      paragraphIndex += 1;
    }
  }

  const table = elements.find((e) => e.type === "table");
  const header = table.rows[0].map((c) => c.text);
  const menuRows = table.rows.slice(1).map((cells, i) => {
    const row = {
      locator: `body table 0, row ${i + 1}`,
      sourceNumber: cells[0].text,
      item: cells[1].text,
      price: cells[2].text,
      category: cells[3].text,
    };
    return { ...row, flags: flagsForRow(row) };
  });

  // The paragraphs after the table, verbatim, in order.
  const tableAt = elements.indexOf(table);
  const after = elements.slice(tableAt + 1).filter((e) => e.type === "paragraph");
  const filterLabelAt = after.findIndex((p) => p.text === "category filters:");
  const filterList = after.slice(filterLabelAt + 1).filter((p) => p.list !== null).map((p) => ({ locator: p.locator, text: p.text }));

  const meta = (xml, tag) => (new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`).exec(xml)?.[1] ?? null);

  return {
    source: {
      file: "customers/jalsa-restaurant/raw/jalsa-restaurant-menu.docx",
      sha256: createHash("sha256").update(buffer).digest("hex"),
      bytes: buffer.length,
      packageMetadata: {
        "dc:creator": meta(coreXml, "dc:creator"),
        "cp:lastModifiedBy": meta(coreXml, "cp:lastModifiedBy"),
        "dcterms:created": meta(coreXml, "dcterms:created"),
        "dcterms:modified": meta(coreXml, "dcterms:modified"),
        Application: meta(appXml, "Application"),
        Pages: meta(appXml, "Pages"),
        Words: meta(appXml, "Words"),
      },
    },
    extraction: {
      method: "docx package read directly (word/document.xml); text runs concatenated per paragraph/cell; no normalisation",
      hiddenContentChecked: ["w:vanish", "w:ins", "w:del", "w:commentReference", "w:txbxContent", "w:drawing", "w:hyperlink", "w:sdt"].map((tag) => ({
        tag,
        occurrences: (documentXml.match(new RegExp(`<${tag}[ >/]`, "g")) ?? []).length,
      })),
    },
    elements: elements.map((e) => (e.type === "table" ? { type: e.type, locator: e.locator, rowCount: e.rows.length, header: e.rows[0].map((c) => c.text) } : e)),
    menu: { header, rows: menuRows },
    filters: {
      categoryFilterLabel: after[filterLabelAt]?.text ?? null,
      listItems: filterList,
    },
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const result = extractMenu();
  const out = join(HERE, "..", "menu-source-extraction.json");
  writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(`wrote ${out}: ${result.menu.rows.length} menu rows, ${result.filters.listItems.length} filter list items, sha256 ${result.source.sha256}`);
}
