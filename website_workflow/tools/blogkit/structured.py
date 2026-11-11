"""Structured sources: JSON, XML, CSV.

Structure is KEPT: a record set stays a table, a recognised article shape maps
field by field, and a shape that is not recognised is reported rather than
flattened into prose.
"""
import csv
import io
import json
import re
import xml.etree.ElementTree as ET

from . import htmldoc, model, textdoc
from .safety import guard_xml

BODY_KEYS = ("content", "body", "html", "markdown", "text", "article", "post_content")
SECTION_KEYS = ("sections", "blocks", "chapters", "parts")
SIDECAR_KEYS = {"placements", "assets", "blogs", "documents", "cover", "presentationisblog", "singleblog"}
_HTMLISH = re.compile(r"<(p|h[1-6]|div|ul|ol|img|br|figure|table|blockquote|strong|em|a)\b", re.I)


def is_sidecar(data):
    """A JSON object that carries instructions about a package rather than blog content."""
    if not isinstance(data, dict):
        return False
    keys = {k.lower() for k in data}
    if keys & set(BODY_KEYS) or keys & set(SECTION_KEYS) - {"blocks"}:
        return False
    return bool(keys & SIDECAR_KEYS)


def _prose(value, result):
    """Blocks for a string field that may hold HTML, Markdown or plain paragraphs."""
    if not isinstance(value, str) or not value.strip():
        return []
    if _HTMLISH.search(value):
        return htmldoc.fragment_blocks(value, result)
    return textdoc.markdown_blocks(value, result, front_matter=False)


def _media_block(item):
    target = item.get("src") or item.get("url") or item.get("file") or item.get("path") or item.get("image") or item.get("video")
    if not isinstance(target, str) or not target:
        return None
    provider = model.video_provider(target)
    if provider:
        return {"type": "embed", "provider": provider[0], "mediaId": provider[1], "url": target, "title": item.get("title") or item.get("caption")}
    block = model.media(htmldoc.media_ref(target), alt=item.get("alt") if isinstance(item.get("alt"), str) else None,
                        media_kind=htmldoc.kind_from_target(target) or ("video" if "video" in item else "image"))
    if isinstance(item.get("caption"), str) and item["caption"].strip():
        block["caption"] = [model.text(item["caption"].strip())]
    return block


def records_table(rows, caption=None):
    """A list of flat objects → a table with one header row (keys in first-seen order)."""
    keys = []
    for row in rows:
        for key in row:
            if key not in keys:
                keys.append(key)
    table = [[{"inlines": [model.text(str(k))]} for k in keys]]
    for row in rows:
        table.append([{"inlines": [model.text(_cell(row.get(k)))] if row.get(k) is not None else []} for k in keys])
    block = {"type": "table", "headerRows": 1, "rows": table}
    if caption:
        block["caption"] = [model.text(caption)]
    return block


def _cell(value):
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False)
    return str(value)


def _flat(rows):
    return isinstance(rows, list) and len(rows) > 0 and all(isinstance(r, dict) and all(not isinstance(v, (dict, list)) for v in r.values()) for r in rows)


def article_blocks(data, result, source):
    """Blocks for an article-shaped object. Returns None when the shape is not an article."""
    lower = {k.lower(): k for k in data}
    body_key = next((lower[k] for k in BODY_KEYS if k in lower and isinstance(data[lower[k]], (str, list))), None)
    section_key = next((lower[k] for k in SECTION_KEYS if k in lower and isinstance(data[lower[k]], list)), None)
    if body_key is None and section_key is None:
        return None
    textdoc.apply_meta(result, {k: v for k, v in data.items() if not isinstance(v, (list, dict)) or k.lower() in ("tags", "keywords", "seo", "author")}, source)
    blocks = []
    for key in ("introduction", "intro", "lede", "summary_text"):
        if key in lower and isinstance(data[lower[key]], str):
            blocks.extend(_prose(data[lower[key]], result))
    if body_key is not None:
        body = data[body_key]
        if isinstance(body, str):
            blocks.extend(_prose(body, result))
        else:
            blocks.extend(_items(body, result, 2))
    if section_key is not None:
        blocks.extend(_items(data[section_key], result, 2))
    for key, title in (("conclusion", None), ("references", "References"), ("cta", None), ("call_to_action", None)):
        if key in lower:
            value = data[lower[key]]
            if key == "references" and isinstance(value, list):
                blocks.append(model.heading(2, [model.text(title)]))
                blocks.append({"type": "list", "ordered": True, "start": 1, "items": [
                    {"inlines": textdoc.Inline({}, result).parse(_ref_text(v)), "children": []} for v in value]})
            elif isinstance(value, str):
                if key == "conclusion":
                    blocks.append(model.heading(2, [model.text("Conclusion")]))
                found = _prose(value, result)
                if key in ("cta", "call_to_action"):
                    for b in found:
                        if b["type"] == "paragraph":
                            b["role"] = "cta"
                blocks.extend(found)
            elif isinstance(value, dict) and key in ("cta", "call_to_action"):
                label, url = value.get("text") or value.get("label") or value.get("title"), value.get("url") or value.get("href")
                if isinstance(label, str):
                    block = model.paragraph([model.text(label, href=url if isinstance(url, str) else None)])
                    block["role"] = "cta"
                    blocks.append(block)
    return blocks


def _ref_text(value):
    if isinstance(value, dict):
        label = value.get("title") or value.get("text") or value.get("name") or ""
        url = value.get("url") or value.get("href")
        return "[%s](%s)" % (label or url, url) if url else str(label)
    return str(value)


def _items(items, result, level):
    blocks = []
    for item in items:
        if isinstance(item, str):
            blocks.extend(_prose(item, result))
            continue
        if not isinstance(item, dict):
            continue
        kind = str(item.get("type", "")).lower()
        heading = item.get("heading") or item.get("title") or (item.get("text") if kind in ("heading", "header") else None)
        if isinstance(heading, str) and heading.strip() and kind not in ("image", "video", "figure", "media", "quote", "code"):
            lvl = item.get("level") if isinstance(item.get("level"), int) else level
            blocks.append(model.heading(lvl, [model.text(heading.strip())]))
            if kind in ("heading", "header"):
                continue
        if kind in ("image", "video", "audio", "figure", "media", "gif", "embed"):
            block = _media_block(item)
            if block:
                blocks.append(block)
            continue
        if kind == "code" and isinstance(item.get("text") or item.get("code"), str):
            blocks.append({"type": "code", "language": item.get("language"), "text": item.get("text") or item.get("code")})
            continue
        if kind in ("quote", "blockquote") and isinstance(item.get("text"), str):
            blocks.append({"type": "blockquote", "blocks": _prose(item["text"], result)})
            continue
        if kind == "list" and isinstance(item.get("items"), list):
            blocks.append({"type": "list", "ordered": bool(item.get("ordered")), **({"start": 1} if item.get("ordered") else {}),
                           "items": [{"inlines": textdoc.Inline({}, result).parse(str(v)), "children": []} for v in item["items"]]})
            continue
        if kind == "table" and _flat(item.get("rows")):
            blocks.append(records_table(item["rows"], item.get("caption")))
            continue
        for key in ("content", "body", "text", "html", "markdown", "paragraphs"):
            value = item.get(key)
            if isinstance(value, str) and not (kind in ("heading", "header")):
                blocks.extend(_prose(value, result))
            elif isinstance(value, list):
                blocks.extend(_items(value, result, level + 1))
        for key in ("media", "images", "figures"):
            for entry in item.get(key, []) if isinstance(item.get(key), list) else []:
                block = _media_block(entry if isinstance(entry, dict) else {"src": entry})
                if block:
                    blocks.append(block)
        for key in ("image", "video"):
            if isinstance(item.get(key), (str, dict)) and kind not in ("image", "video"):
                block = _media_block(item[key] if isinstance(item[key], dict) else {"src": item[key], "alt": item.get("alt"), "caption": item.get("caption")})
                if block:
                    blocks.append(block)
        if isinstance(item.get("sections"), list):
            blocks.extend(_items(item["sections"], result, level + 1))
        if _flat(item.get("table")):
            blocks.append(records_table(item["table"], item.get("caption") if isinstance(item.get("caption"), str) else None))
    return blocks


def extract_json(path, ctx):
    result = model.DocResult("json")
    with open(path, "rb") as fh:
        source, _ = textdoc.decode_text(fh.read())
    try:
        data = json.loads(source)
    except ValueError as error:
        result.fail("DOCUMENT_CORRUPT", "The JSON file is not valid JSON (%s)." % error, "Fix the JSON syntax and upload the file again.")
        return result
    result.notes["dataFile"] = True
    if isinstance(data, dict):
        blocks = article_blocks(data, result, "json field")
        if blocks is not None:
            result.blocks = blocks
            result.notes["shape"] = "article"
            result.notes.pop("dataFile")
            return result
        tables = [(k, v) for k, v in data.items() if _flat(v)]
        if tables:
            result.blocks = [records_table(rows, key) for key, rows in tables]
            result.notes["shape"] = "named record sets"
            return result
    if _flat(data):
        result.blocks = [records_table(data)]
        result.notes["shape"] = "record set"
        return result
    result.status = "partial"
    result.blocks = [{"type": "code", "language": "json", "text": json.dumps(data, indent=2, ensure_ascii=False)}]
    result.warn("STRUCTURE_UNRECOGNIZED", "The JSON file is neither an article (title plus content or sections) nor a list of records, so it was kept verbatim as a code block.",
                "Say how this data should appear (a table, a chart, or not at all), or restructure it as a list of records.")
    return result


def extract_csv(path, ctx):
    result = model.DocResult("csv")
    with open(path, "rb") as fh:
        source, _ = textdoc.decode_text(fh.read())
    try:
        dialect = csv.Sniffer().sniff(source[:8192], delimiters=",;\t|")
    except csv.Error:
        dialect = csv.excel_tab if path.lower().endswith(".tsv") else csv.excel
    rows = [row for row in csv.reader(io.StringIO(source, newline=""), dialect) if any(cell.strip() for cell in row)]
    result.notes["dataFile"] = True
    if not rows:
        result.fail("DOCUMENT_EMPTY", "The CSV file has no rows.", "Check the file and upload it again.")
        return result
    width = max(len(r) for r in rows)
    table = [[{"inlines": [model.text(cell.strip())] if cell.strip() else []} for cell in row + [""] * (width - len(row))] for row in rows]
    first = rows[0]
    header = len(rows) > 1 and all(c.strip() and not re.fullmatch(r"-?[\d.,]+%?", c.strip()) for c in first)
    result.blocks = [{"type": "table", "headerRows": 1 if header else 0, "rows": table}]
    return result


# ---------------------------------------------------------------- XML
def _local(tag):
    return tag.rsplit("}", 1)[-1].lower() if isinstance(tag, str) else ""


def _child_text(node, *names):
    for child in node:
        if _local(child.tag) in names and (child.text or "").strip():
            return child.text.strip()
    return None


def feed_entries(root):
    """(title, html, meta) per item of an RSS / WordPress export / Atom feed."""
    entries = []
    for item in root.iter():
        if _local(item.tag) not in ("item", "entry"):
            continue
        body = None
        for child in item:
            name = child.tag.lower() if isinstance(child.tag, str) else ""
            if name.endswith("}encoded") and "content" in name:
                body = child.text
        if body is None:
            body = _child_text(item, "content", "description", "summary")
        if not body:
            continue
        meta = {"title": _child_text(item, "title"), "author": _child_text(item, "creator", "author"),
                "date": _child_text(item, "pubdate", "published", "updated", "date"), "slug": _child_text(item, "post_name"),
                "keywords": [c.text.strip() for c in item if _local(c.tag) == "category" and (c.text or "").strip()]}
        entries.append((body, {k: v for k, v in meta.items() if v}))
    return entries


def _generic(node, result, level, blocks):
    for child in node:
        name = _local(child.tag)
        value = "".join(child.itertext()).strip()
        if name in ("title", "heading", "header", "head") and value:
            blocks.append(model.heading(level, [model.text(re.sub(r"\s+", " ", value))]))
        elif re.fullmatch(r"h[1-6]", name) and value:
            blocks.append(model.heading(int(name[1]), [model.text(re.sub(r"\s+", " ", value))]))
        elif name in ("p", "para", "paragraph", "text", "summary", "abstract", "introduction", "conclusion") and value and len(child) == 0:
            blocks.append(model.paragraph([model.text(re.sub(r"\s+", " ", value))]))
        elif name in ("image", "img", "figure", "graphic", "video", "audio", "media"):
            target = child.get("src") or child.get("href") or child.get("url") or child.get("file") or (child.text or "").strip() or None
            if not target:
                inner = next((c for c in child if _local(c.tag) in ("image", "img", "graphic")), None)
                target = (inner.get("src") or inner.get("href")) if inner is not None else None
            if target:
                caption = _child_text(child, "caption", "figcaption", "title")
                block = model.media(htmldoc.media_ref(target), alt=child.get("alt") or _child_text(child, "alt"),
                                    media_kind=htmldoc.kind_from_target(target) or ("video" if name == "video" else "audio" if name == "audio" else "image"))
                if caption:
                    block["caption"] = [model.text(caption)]
                blocks.append(block)
        elif name in ("list", "ul", "ol", "itemizedlist", "orderedlist"):
            items = [{"inlines": [model.text(re.sub(r"\s+", " ", "".join(i.itertext()).strip()))], "children": []} for i in child if "".join(i.itertext()).strip()]
            if items:
                ordered = name in ("ol", "orderedlist") or child.get("type") in ("ordered", "number")
                blocks.append({"type": "list", "ordered": ordered, **({"start": 1} if ordered else {}), "items": items})
        elif name in ("quote", "blockquote") and value:
            blocks.append({"type": "blockquote", "blocks": [model.paragraph([model.text(re.sub(r"\s+", " ", value))])]})
        elif name in ("code", "programlisting", "pre") and value:
            blocks.append({"type": "code", "language": child.get("language"), "text": "".join(child.itertext()).strip("\n")})
        elif name in ("section", "sect1", "sect2", "chapter", "body", "content", "article", "sec", "div", "post"):
            _generic(child, result, level + (1 if name in ("section", "sect1", "sect2", "chapter", "sec") else 0), blocks)


def extract_xml(path, ctx):
    result = model.DocResult("xml")
    with open(path, "rb") as fh:
        data = guard_xml(fh.read(), "the XML file")
    try:
        root = ET.fromstring(data)
    except ET.ParseError as error:
        result.fail("DOCUMENT_CORRUPT", "The XML file is not well-formed (%s)." % error, "Fix the XML and upload the file again.")
        return result
    entries = feed_entries(root)
    if entries:
        result.notes["shape"] = "feed (%d item%s)" % (len(entries), "" if len(entries) == 1 else "s")
        body, meta = entries[0]
        textdoc.apply_meta(result, meta, "feed item")
        result.blocks = htmldoc.fragment_blocks(body, result) if _HTMLISH.search(body) else textdoc.markdown_blocks(body, result, False)
        if len(entries) > 1:
            result.extra_documents = []
            for body, meta in entries[1:]:
                extra = model.DocResult("xml")
                textdoc.apply_meta(extra, meta, "feed item")
                extra.blocks = htmldoc.fragment_blocks(body, extra) if _HTMLISH.search(body) else textdoc.markdown_blocks(body, extra, False)
                result.extra_documents.append(extra)
        return result
    meta = {}
    for key in ("title", "subtitle", "author", "date", "description", "keywords"):
        value = _child_text(root, key)
        if value:
            meta[key] = value
    textdoc.apply_meta(result, meta, "xml element")
    blocks = []
    container = root
    _generic(_without_meta(container), result, 2, blocks)
    if not blocks:
        result.status = "partial"
        result.notes["dataFile"] = True
        result.warn("STRUCTURE_UNRECOGNIZED", "The XML file does not use a recognised article structure (title, section, paragraph, image …) or feed format.",
                    "Supply the blog as a document (DOCX, Markdown, HTML), or say how this XML maps to the blog.")
    result.blocks = blocks
    return result


def _without_meta(root):
    clone = ET.Element(root.tag, root.attrib)
    for child in root:
        if _local(child.tag) in ("title", "subtitle", "author", "date", "description", "keywords") and len(child) == 0:
            continue
        clone.append(child)
    return clone
