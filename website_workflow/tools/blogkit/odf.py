"""OpenDocument Text (.odt) → blocks, read from content.xml / styles.xml / meta.xml."""
import posixpath
import re
import xml.etree.ElementTree as ET

from . import model
from .ooxml import MONO
from .safety import UnsafeInput, guard_xml, open_zip, safe_href, zip_read

OFFICE = "{urn:oasis:names:tc:opendocument:xmlns:office:1.0}"
TEXT = "{urn:oasis:names:tc:opendocument:xmlns:text:1.0}"
TABLE = "{urn:oasis:names:tc:opendocument:xmlns:table:1.0}"
DRAW = "{urn:oasis:names:tc:opendocument:xmlns:drawing:1.0}"
XLINK = "{http://www.w3.org/1999/xlink}"
STYLE = "{urn:oasis:names:tc:opendocument:xmlns:style:1.0}"
FO = "{urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0}"
SVG = "{urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0}"
META = "{urn:oasis:names:tc:opendocument:xmlns:meta:1.0}"
DC = "{http://purl.org/dc/elements/1.1/}"
_UNITS = {"cm": 96 / 2.54, "mm": 96 / 25.4, "in": 96.0, "pt": 96 / 72, "px": 1.0, "pc": 16.0}


def _px(value):
    m = re.fullmatch(r"\s*([0-9.]+)\s*([a-z]+)\s*", value or "")
    if not m or m.group(2) not in _UNITS:
        return None
    return round(float(m.group(1)) * _UNITS[m.group(2)])


class Odt:
    def __init__(self, path, result):
        self.zf = open_zip(path)
        self.names = set(self.zf.namelist())
        self.result = result
        self.styles, self.list_styles = {}, {}
        self.notes, self.tracked, self.objects = [], False, 0

    def xml(self, name):
        return ET.fromstring(guard_xml(zip_read(self.zf, name), name)) if name in self.names else None

    def load_styles(self, root):
        if root is None:
            return
        for style in root.iter(STYLE + "style"):
            props = style.find(STYLE + "text-properties")
            marks = {}
            if props is not None:
                if props.get(FO + "font-weight") == "bold":
                    marks["bold"] = True
                if props.get(FO + "font-style") in ("italic", "oblique"):
                    marks["italic"] = True
                if props.get(STYLE + "text-line-through-style") not in (None, "none"):
                    marks["strike"] = True
                position = props.get(STYLE + "text-position", "")
                if position.startswith("super"):
                    marks["sup"] = True
                elif position.startswith("sub"):
                    marks["sub"] = True
                if MONO.search(props.get(STYLE + "font-name", "") or props.get(FO + "font-family", "") or ""):
                    marks["code"] = True
            self.styles[style.get(STYLE + "name")] = {"parent": style.get(STYLE + "parent-style-name"), "marks": marks,
                                                      "display": style.get(STYLE + "display-name") or style.get(STYLE + "name") or ""}
        for ls in root.iter(TEXT + "list-style"):
            levels = {}
            for lvl in ls:
                level = lvl.get(TEXT + "level")
                if level and level.isdigit():
                    start = lvl.get(TEXT + "start-value", "1")
                    levels[int(level)] = {"ordered": lvl.tag == TEXT + "list-level-style-number" and bool(lvl.get(STYLE + "num-format")),
                                          "start": int(start) if start.isdigit() else 1}
            self.list_styles[ls.get(STYLE + "name")] = levels

    def chain(self, name):
        seen = set()
        while name and name in self.styles and name not in seen:
            seen.add(name)
            yield name, self.styles[name]
            name = self.styles[name]["parent"]
        if name and name not in seen:
            yield name, {"parent": None, "marks": {}, "display": name}

    def kind(self, name):
        for style_name, style in self.chain(name):
            label = (style["display"] or style_name).replace("_20_", " ").lower()
            if label == "title":
                return "title"
            if label == "subtitle":
                return "subtitle"
            if label in ("quotations", "quote", "block quotation"):
                return "quote"
            if label in ("preformatted text", "source text", "code"):
                return "code"
            if label in ("caption", "illustration", "figure", "drawing"):
                return "caption"
            if label.startswith("contents") or label.startswith("index"):
                return "toc"
        return None

    def marks(self, name, heading=False):
        out = {}
        for _, style in reversed(list(self.chain(name))):
            out.update(style["marks"])
        return out

    # ------------------------------------------------ inline
    def inlines(self, node, marks, extras):
        out = []
        if node.text:
            out.append(model.text(node.text, **marks))
        for child in node:
            tag = child.tag
            if tag == TEXT + "span":
                out.extend(self.inlines(child, dict(marks, **self.marks(child.get(TEXT + "style-name"))), extras))
            elif tag == TEXT + "a":
                href = safe_href(child.get(XLINK + "href"))
                if href and href.startswith("#"):
                    href = None
                out.extend(self.inlines(child, dict(marks, href=href) if href else marks, extras))
            elif tag == TEXT + "line-break":
                out.append({"t": "break"})
            elif tag == TEXT + "s":
                out.append(model.text(" " * int(child.get(TEXT + "c", "1") or 1), **marks))
            elif tag == TEXT + "tab":
                out.append(model.text(" ", **marks))
            elif tag == TEXT + "note":
                note_id = "fn%d" % (len(self.notes) + 1)
                body = child.find(TEXT + "note-body")
                note_inl = []
                for p in (body.iter(TEXT + "p") if body is not None else []):
                    if note_inl:
                        note_inl.append({"t": "break"})
                    note_inl.extend(self.inlines(p, {}, extras))
                self.notes.append({"id": note_id, "inlines": model.trim_inlines(note_inl)})
                out.append({"t": "fnref", "id": note_id})
            elif tag == DRAW + "frame":
                self.frame(child, extras)
            elif tag in (TEXT + "tracked-changes", TEXT + "change", TEXT + "change-start", TEXT + "change-end"):
                self.tracked = True
            elif tag in (TEXT + "bookmark", TEXT + "bookmark-start", TEXT + "bookmark-end", TEXT + "soft-page-break", TEXT + "reference-mark"):
                pass
            else:
                out.extend(self.inlines(child, marks, extras))
            if child.tail:
                out.append(model.text(child.tail, **marks))
        return out

    def frame(self, frame, extras):
        title, desc = frame.find(SVG + "title"), frame.find(SVG + "desc")
        alt = (desc.text if desc is not None and desc.text else None) or (title.text if title is not None and title.text else None)
        box = frame.find(DRAW + "text-box")
        if box is not None:
            extras.extend(self.body(box))
            return
        image = frame.find(DRAW + "image")
        obj = frame.find(DRAW + "object")
        if obj is not None:
            self.objects += 1
        if image is None:
            return
        href = image.get(XLINK + "href", "")
        if re.match(r"^https?://", href, re.I):
            extras.append(model.media({"kind": "url", "url": href}, alt=alt, media_kind="image"))
            return
        target = posixpath.normpath(href.lstrip("./"))
        if target not in self.names:
            self.result.warn("EMBEDDED_MEDIA_MISSING", "The document references an embedded file that is not in the package: %s" % href,
                             "Re-insert the media in the source document, or supply it as a separate file.")
            return
        key = self.result.add_embedded(zip_read(self.zf, target, limit=400 * 1024 * 1024), posixpath.basename(target), part=target)
        extras.append(model.media({"kind": "embedded", "key": key}, alt=alt, width=_px(frame.get(SVG + "width")), height=_px(frame.get(SVG + "height"))))

    # ------------------------------------------------ blocks
    def list(self, node, depth=1, style=None):
        style = node.get(TEXT + "style-name") or style
        spec = self.list_styles.get(style, {}).get(depth, {"ordered": False, "start": 1})
        block = {"type": "list", "ordered": spec["ordered"], "items": []}
        if spec["ordered"]:
            block["start"] = spec["start"]
        for item in node:
            if item.tag not in (TEXT + "list-item", TEXT + "list-header"):
                continue
            head, children = [], []
            for part in item:
                if part.tag in (TEXT + "p", TEXT + "h"):
                    extras = []
                    inl = model.trim_inlines(self.inlines(part, self.marks(part.get(TEXT + "style-name")) if part.tag == TEXT + "p" else {}, extras))
                    if inl:
                        if head:
                            head.append({"t": "break"})
                        head.extend(inl)
                    children.extend(extras)
                elif part.tag == TEXT + "list":
                    children.append(self.list(part, depth + 1, style))
            if head or children:
                block["items"].append({"inlines": head, "children": children})
        return block

    def table(self, node):
        rows, header_rows = [], 0

        def walk(parent, in_header):
            nonlocal header_rows
            for child in parent:
                if child.tag == TABLE + "table-header-rows":
                    walk(child, True)
                elif child.tag in (TABLE + "table-rows", TABLE + "table-row-group"):
                    walk(child, in_header)
                elif child.tag == TABLE + "table-row":
                    cells, after = [], []
                    for cell in child:
                        if cell.tag != TABLE + "table-cell":
                            continue
                        inl = []
                        for block in self.body(cell):
                            if block["type"] == "paragraph":
                                if inl:
                                    inl.append({"t": "break"})
                                inl.extend(block["inlines"])
                            elif block["type"] in ("media", "embed", "chart"):
                                after.append(block)
                            else:
                                value = model.block_text(block)
                                if value:
                                    if inl:
                                        inl.append({"t": "break"})
                                    inl.append(model.text(value))
                        entry = {"inlines": inl}
                        for attr, key in (("number-columns-spanned", "colspan"), ("number-rows-spanned", "rowspan")):
                            if (cell.get(TABLE + attr) or "1").isdigit() and int(cell.get(TABLE + attr) or 1) > 1:
                                entry[key] = int(cell.get(TABLE + attr))
                        cells.append(entry)
                    if cells:
                        rows.append(cells)
                        if in_header:
                            header_rows += 1
                        self._after.extend(after)

        self._after = []
        walk(node, False)
        after, self._after = self._after, []
        return ([{"type": "table", "headerRows": header_rows, "rows": rows}] if rows else []) + after

    def body(self, container):
        blocks, code, quote = [], [], []

        def close():
            if code:
                blocks.append({"type": "code", "language": None, "text": "\n".join(code)})
                code.clear()
            if quote:
                blocks.append({"type": "blockquote", "blocks": list(quote)})
                quote.clear()

        for child in container:
            tag = child.tag
            if tag == TEXT + "h":
                close()
                extras = []
                inl = model.trim_inlines(self.inlines(child, {}, extras))
                level = child.get(TEXT + "outline-level", "1")
                if inl:
                    blocks.append(model.heading(int(level) if level.isdigit() else 1, inl))
                blocks.extend(extras)
            elif tag == TEXT + "p":
                style = child.get(TEXT + "style-name")
                kind = self.kind(style)
                if kind == "toc":
                    continue
                extras = []
                base = {} if kind in ("title", "subtitle", "caption", "quote") else self.marks(style)
                inl = self.inlines(child, base, extras)
                inl = model.merge_inlines(inl) if kind == "code" else model.trim_inlines(inl)
                has_text = bool(model.plain(inl).strip()) or any(i.get("t") == "fnref" for i in inl)
                if kind == "code" and (has_text or code):
                    if quote:
                        close()
                    code.append(model.plain(inl))
                elif not has_text:
                    if extras:
                        close()
                elif kind == "quote":
                    if code:
                        close()
                    quote.append(model.paragraph(inl))
                else:
                    close()
                    # A caption paragraph that wraps its own picture: the picture comes first.
                    if kind == "caption" and extras:
                        blocks.extend(extras)
                        extras = []
                    blocks.append(model.paragraph(inl, style=kind if kind in ("title", "subtitle", "caption") else None))
                if extras:
                    close()
                    blocks.extend(extras)
            elif tag == TEXT + "list":
                close()
                block = self.list(child)
                if block["items"]:
                    blocks.append(block)
            elif tag == TABLE + "table":
                close()
                blocks.extend(self.table(child))
            elif tag in (TEXT + "section", TEXT + "index-body", OFFICE + "text"):
                close()
                blocks.extend(self.body(child))
            elif tag == TEXT + "table-of-content":
                self.result.warn("TABLE_OF_CONTENTS_SKIPPED", "The document's generated table of contents was not carried over.",
                                 "No action needed: the page's own heading structure provides navigation.", severity="info")
            elif tag == TEXT + "tracked-changes":
                self.tracked = True
            elif tag == DRAW + "frame":
                close()
                extras = []
                self.frame(child, extras)
                blocks.extend(extras)
        close()
        return blocks

    def extract(self):
        content = self.xml("content.xml")
        if content is None:
            self.result.fail("DOCUMENT_CORRUPT", "This file is not a readable OpenDocument text file.", "Re-save it as .odt or .docx and upload again.")
            return
        self.load_styles(self.xml("styles.xml"))
        self.load_styles(content)
        meta = self.xml("meta.xml")
        if meta is not None:
            for tag, key in ((DC + "title", "documentTitle"), (DC + "creator", "documentAuthor"), (DC + "description", "documentDescription"), (META + "creation-date", "documentCreated")):
                node = next(meta.iter(tag), None)
                if node is not None and (node.text or "").strip():
                    self.result.notes[key] = node.text.strip()
        body = content.find(OFFICE + "body/" + OFFICE + "text")
        self.result.blocks = self.body(body if body is not None else content)
        if self.notes:
            self.result.blocks.append({"type": "footnotes", "items": self.notes})
        if self.tracked:
            self.result.warn("TRACKED_CHANGES_PRESENT", "The document has tracked changes; the text was read as currently shown.",
                             "Accept or reject all changes in the source document and upload it again to be certain of the final wording.")
        if self.objects:
            self.result.warn("EMBEDDED_OBJECT_PREVIEW_ONLY", "%d embedded object(s) (for example a chart) were carried over as their preview picture where one exists." % self.objects,
                             "Export charts as PNG or SVG and supply them if a preview is missing or unclear.")


def extract_odt(path, ctx):
    result = model.DocResult("odt (package parts)")
    try:
        doc = Odt(path, result)
    except UnsafeInput:
        raise
    except Exception as error:
        result.fail("DOCUMENT_CORRUPT", "The document could not be opened: %s" % error, "Re-export the document and upload it again.")
        return result
    try:
        doc.extract()
    except ET.ParseError as error:
        result.fail("DOCUMENT_CORRUPT", "A part of the document is not valid XML: %s" % error, "Open the file, save a fresh copy and upload that.")
    finally:
        doc.zf.close()
    return result
