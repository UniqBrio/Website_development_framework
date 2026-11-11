"""Office Open XML → blocks: DOCX, PPTX, XLSX and their native charts.

Read straight from the package parts with the standard library. Nothing is
rendered and no macro, field code or OLE object is executed.
"""
import datetime
import posixpath
import re
import xml.etree.ElementTree as ET

from . import model
from .safety import UnsafeInput, guard_xml, open_zip, safe_href, zip_read

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
R = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
A = "{http://schemas.openxmlformats.org/drawingml/2006/main}"
WP = "{http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing}"
C = "{http://schemas.openxmlformats.org/drawingml/2006/chart}"
P = "{http://schemas.openxmlformats.org/presentationml/2006/main}"
S = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
V = "{urn:schemas-microsoft-com:vml}"
O = "{urn:schemas-microsoft-com:office:office}"
MC = "{http://schemas.openxmlformats.org/markup-compatibility/2006}"
REL = "{http://schemas.openxmlformats.org/package/2006/relationships}"
XDR = "{http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing}"
DC = "{http://purl.org/dc/elements/1.1/}"
CP = "{http://schemas.openxmlformats.org/package/2006/metadata/core-properties}"
DCT = "{http://purl.org/dc/terms/}"
CHART_URI = "http://schemas.openxmlformats.org/drawingml/2006/chart"
DIAGRAM_URI = "http://schemas.openxmlformats.org/drawingml/2006/diagram"
EMU_PER_PX = 9525
MONO = re.compile(r"courier|consolas|menlo|monaco|monospace|lucida console|source code|fira code|jetbrains|cascadia|andale mono|dejavu sans mono|liberation mono", re.I)


class Package:
    def __init__(self, path):
        self.zf = open_zip(path)
        self.names = set(self.zf.namelist())

    def xml(self, name):
        if name not in self.names:
            return None
        return ET.fromstring(guard_xml(zip_read(self.zf, name), name))

    def read(self, name):
        return zip_read(self.zf, name, limit=400 * 1024 * 1024) if name in self.names else None

    def rels(self, part):
        """rId → (target part or URL, type suffix, external?) for one part."""
        folder, base = posixpath.split(part)
        root = self.xml(posixpath.join(folder, "_rels", base + ".rels"))
        out = {}
        if root is None:
            return out
        for rel in root.iter(REL + "Relationship"):
            target, external = rel.get("Target", ""), rel.get("TargetMode") == "External"
            if not external:
                target = posixpath.normpath(posixpath.join(folder, target)) if not target.startswith("/") else target.lstrip("/")
            out[rel.get("Id")] = (target, rel.get("Type", "").rsplit("/", 1)[-1], external)
        return out

    def core(self, result):
        root = self.xml("docProps/core.xml")
        if root is None:
            return
        for tag, key in ((DC + "title", "documentTitle"), (DC + "creator", "documentAuthor"), (DC + "description", "documentDescription"),
                         (CP + "keywords", "documentKeywords"), (DCT + "created", "documentCreated")):
            node = root.find(tag)
            if node is not None and (node.text or "").strip():
                result.notes[key] = node.text.strip()

    def close(self):
        self.zf.close()


def _on(node, tag):
    """A toggle property: present and not switched off."""
    el = node.find(tag) if node is not None else None
    if el is None:
        return None
    return el.get(W + "val", "true").lower() not in ("0", "false", "off", "none")


def _num(text):
    """A stored number as its shortest exact decimal text (drops float noise, changes no value)."""
    if text is None:
        return None
    raw = text.strip()
    try:
        value = float(raw)
    except ValueError:
        return raw
    if value != value or value in (float("inf"), float("-inf")):
        return raw
    if value == int(value) and abs(value) < 1e15 and "e" not in raw.lower():
        return str(int(value))
    return repr(value)


# =================================================================== charts
CHART_KINDS = {
    "barChart": "bar", "bar3DChart": "bar", "lineChart": "line", "line3DChart": "line", "pieChart": "pie", "pie3DChart": "pie",
    "doughnutChart": "doughnut", "areaChart": "area", "area3DChart": "area", "scatterChart": "scatter", "radarChart": "radar",
    "bubbleChart": "bubble", "stockChart": "stock", "surfaceChart": "surface", "ofPieChart": "pie",
}


def _cache_points(node, resolver=None):
    """Points of a c:strRef / c:numRef / literal, as an idx-ordered list.

    The document's own cache is used when present. A workbook that wrote no cache
    is read through `resolver`, which looks the cell range up in the sheet data.
    """
    if node is None:
        return [], None
    points, fmt = _cached(node)
    if not points and resolver is not None:
        formula = node.find(".//" + C + "f")
        if formula is not None and formula.text:
            return resolver(formula.text), fmt
    return points, fmt


def _cached(node):
    cache = None
    for tag in ("strCache", "numCache", "strLit", "numLit"):
        cache = node.find(".//" + C + tag)
        if cache is not None:
            break
    if cache is None:
        multi = node.find(".//" + C + "multiLvlStrCache")
        if multi is None:
            return [], None
        cache = multi.find(C + "lvl")
        if cache is None:
            return [], None
    count = cache.find(C + "ptCount")
    points = {}
    for pt in cache.findall(C + "pt"):
        v = pt.find(C + "v")
        points[int(pt.get("idx", "0"))] = v.text if v is not None else None
    size = max([int(count.get("val", "0")) if count is not None else 0] + [i + 1 for i in points])
    fmt = cache.find(C + "formatCode")
    return [points.get(i) for i in range(size)], (fmt.text if fmt is not None else None)


def _rich_text(node, resolver=None):
    if node is None:
        return None
    value = "".join(t.text or "" for t in node.iter(A + "t")).strip()
    if value:
        return value
    v = node.find(".//" + C + "v")
    if v is not None and (v.text or "").strip():
        return v.text.strip()
    formula = node.find(".//" + C + "f")
    if resolver is not None and formula is not None and formula.text:
        found = [x for x in resolver(formula.text) if x not in (None, "")]
        return " ".join(found) or None
    return None


def parse_chart(root, resolver=None):
    """A native chart's cached data, exactly as the document stores it."""
    chart = root.find(C + "chart")
    if chart is None:
        return None
    plot = chart.find(C + "plotArea")
    if plot is None:
        return None
    block = {"type": "chart", "chartType": None, "title": _rich_text(chart.find(C + "title")), "categories": [], "series": []}
    kinds = []
    for group in plot:
        kind = CHART_KINDS.get(group.tag.replace(C, ""))
        if not kind:
            continue
        if kind == "bar":
            direction = group.find(C + "barDir")
            kind = "bar" if direction is not None and direction.get("val") == "bar" else "column"
            grouping = group.find(C + "grouping")
            if grouping is not None and grouping.get("val") in ("stacked", "percentStacked"):
                block["stacked"] = grouping.get("val")
        kinds.append(kind)
        for ser in group.findall(C + "ser"):
            name = _rich_text(ser.find(C + "tx"), resolver)
            cats, _ = _cache_points(ser.find(C + "cat") if ser.find(C + "cat") is not None else ser.find(C + "xVal"), resolver)
            vals, fmt = _cache_points(ser.find(C + "val") if ser.find(C + "val") is not None else ser.find(C + "yVal"), resolver)
            series = {"name": name, "values": [_num(v) if v is not None else None for v in vals], "kind": kind}
            if fmt and fmt != "General":
                series["formatCode"] = fmt
            if cats and not block["categories"]:
                block["categories"] = [c if c is not None else "" for c in cats]
            elif cats and [c if c is not None else "" for c in cats] != block["categories"]:
                series["categories"] = [c if c is not None else "" for c in cats]
            block["series"].append(series)
    if not block["series"] or not any(v is not None for ser in block["series"] for v in ser["values"]):
        return None
    block["chartType"] = kinds[0] if len(set(kinds)) == 1 else "combo"
    axes = {}
    for tag, key in (("catAx", "category"), ("valAx", "value"), ("dateAx", "category")):
        axis = plot.find(C + tag)
        title = _rich_text(axis.find(C + "title")) if axis is not None else None
        if title:
            axes[key] = title
    if axes:
        block["axisTitles"] = axes
    return block


# =================================================================== DOCX
class Docx:
    def __init__(self, path, result):
        self.pkg, self.result = Package(path), result
        self.styles, self.numbering, self.footnotes, self.endnotes = {}, {}, {}, {}
        self.note_order = []
        self.flags = {"tracked": False, "textboxes": 0, "smartart": 0, "ole": 0, "toc": False, "cell_media": 0, "nested_tables": 0}

    # ------------------------------------------------ styles & numbering
    def load_styles(self):
        root = self.pkg.xml("word/styles.xml")
        if root is None:
            return
        for style in root.findall(W + "style"):
            name = style.find(W + "name")
            based = style.find(W + "basedOn")
            ppr, rpr = style.find(W + "pPr"), style.find(W + "rPr")
            outline = ppr.find(W + "outlineLvl") if ppr is not None else None
            numpr = ppr.find(W + "numPr") if ppr is not None else None
            fonts = rpr.find(W + "rFonts") if rpr is not None else None
            self.styles[style.get(W + "styleId")] = {
                "name": (name.get(W + "val") if name is not None else "") or "",
                "based": based.get(W + "val") if based is not None else None,
                "outline": int(outline.get(W + "val")) if outline is not None and outline.get(W + "val", "").isdigit() else None,
                "bold": _on(rpr, W + "b"), "italic": _on(rpr, W + "i"),
                "mono": bool(fonts is not None and MONO.search(fonts.get(W + "ascii", "") or "")),
                "numId": (numpr.find(W + "numId").get(W + "val") if numpr is not None and numpr.find(W + "numId") is not None else None),
                "ilvl": (numpr.find(W + "ilvl").get(W + "val") if numpr is not None and numpr.find(W + "ilvl") is not None else None),
                "type": style.get(W + "type"),
            }

    def style_chain(self, style_id):
        seen = set()
        while style_id and style_id in self.styles and style_id not in seen:
            seen.add(style_id)
            yield self.styles[style_id]
            style_id = self.styles[style_id]["based"]

    def style_fact(self, style_id, key):
        for style in self.style_chain(style_id):
            if style[key] not in (None, False):
                return style[key]
        return None

    def classify(self, style_id, ppr):
        """('heading', n) | ('title'|'subtitle'|'caption'|'quote'|'code'|'toc'|'list-bullet'|'list-number', None) | (None, None)"""
        for style in self.style_chain(style_id):
            name = style["name"].strip().lower()
            m = re.match(r"^heading\s*(\d)$", name) or re.match(r"^(?:titre|überschrift|ueberschrift|título|titulo|titolo|kop)\s*(\d)$", name)
            if m:
                return "heading", int(m.group(1))
            if name == "title":
                return "title", None
            if name == "subtitle":
                return "subtitle", None
            if name == "caption":
                return "caption", None
            if name in ("quote", "intense quote", "block text", "blockquote", "block quotation"):
                return "quote", None
            if re.match(r"^toc \d|^table of figures|^toc heading", name):
                return "toc", None
            if re.search(r"\bcode\b|preformatted|source ?code|plain text|macro text|verbatim", name):
                return "code", None
            m = re.match(r"^list (bullet|number|continue)\s*(\d)?$", name)
            if m and m.group(1) != "continue":
                return "list-" + m.group(1), int(m.group(2) or 1) - 1
        outline = None
        if ppr is not None and ppr.find(W + "outlineLvl") is not None:
            value = ppr.find(W + "outlineLvl").get(W + "val", "")
            outline = int(value) if value.isdigit() else None
        if outline is None:
            outline = self.style_fact(style_id, "outline")
        if outline is not None and outline < 9:
            return "heading", min(6, outline + 1)
        return None, None

    def load_numbering(self):
        root = self.pkg.xml("word/numbering.xml")
        if root is None:
            return
        abstract = {}
        for an in root.findall(W + "abstractNum"):
            levels = {}
            for lvl in an.findall(W + "lvl"):
                fmt, start = lvl.find(W + "numFmt"), lvl.find(W + "start")
                levels[int(lvl.get(W + "ilvl", "0"))] = {
                    "ordered": (fmt.get(W + "val") if fmt is not None else "decimal") not in ("bullet", "none"),
                    "start": int(start.get(W + "val", "1")) if start is not None and start.get(W + "val", "1").lstrip("-").isdigit() else 1,
                }
            abstract[an.get(W + "abstractNumId")] = levels
        for num in root.findall(W + "num"):
            ref = num.find(W + "abstractNumId")
            levels = dict(abstract.get(ref.get(W + "val") if ref is not None else None, {}))
            for override in num.findall(W + "lvlOverride"):
                start = override.find(W + "startOverride")
                level = int(override.get(W + "ilvl", "0"))
                if start is not None and start.get(W + "val", "").isdigit():
                    levels[level] = dict(levels.get(level, {"ordered": True}), start=int(start.get(W + "val")))
            self.numbering[num.get(W + "numId")] = levels

    def load_notes(self, part, tag, store, prefix):
        root = self.pkg.xml(part)
        if root is None:
            return
        rels = self.pkg.rels(part)
        for note in root.findall(W + tag):
            if note.get(W + "type") in ("separator", "continuationSeparator", "continuationNotice"):
                continue
            inlines = []
            for p in note.iter(W + "p"):
                part_inl, _ = self.runs(p, rels, {})
                if inlines and part_inl:
                    inlines.append({"t": "break"})
                inlines.extend(part_inl)
            store[prefix + note.get(W + "id", "")] = model.trim_inlines(inlines)

    # ------------------------------------------------ runs
    def runs(self, node, rels, base_marks, extras=None):
        """(inlines, extras) for the run-level content of a paragraph-like node.

        `extras` collects blocks anchored in the text: media, charts, embeds, text boxes.
        """
        extras = [] if extras is None else extras
        out = []
        field = {"depth": 0, "instr": "", "href": None, "result": False}

        def walk(parent, marks):
            for child in parent:
                tag = child.tag
                if tag == W + "r":
                    self.run(child, rels, marks, out, extras, field)
                elif tag == W + "hyperlink":
                    target = rels.get(child.get(R + "id"), (None,))[0]
                    href = safe_href(target) if target else None
                    if target and not href:
                        self.result.warn("LINK_UNSAFE_REMOVED", "A link with an unsafe or unsupported address was not carried over: %s" % target[:80],
                                         "Check the link in the source document; its text was kept without the link.")
                    walk(child, dict(marks, href=href) if href else marks)
                elif tag == W + "ins":
                    self.flags["tracked"] = True
                    walk(child, marks)
                elif tag in (W + "del", W + "moveFrom"):
                    self.flags["tracked"] = True
                elif tag in (W + "smartTag", W + "moveTo", W + "fldSimple", W + "customXml", W + "bdo", W + "dir"):
                    if tag == W + "fldSimple":
                        m = re.search(r'HYPERLINK\s+"([^"]+)"', child.get(W + "instr", ""))
                        href = safe_href(m.group(1)) if m else None
                        walk(child, dict(marks, href=href) if href else marks)
                    else:
                        walk(child, marks)
                elif tag == W + "sdt":
                    content = child.find(W + "sdtContent")
                    if content is not None:
                        walk(content, marks)
                elif tag == MC + "AlternateContent":
                    choice = child.find(MC + "Choice")
                    walk(choice if choice is not None else child.find(MC + "Fallback") or [], marks)

        walk(node, base_marks)
        return model.merge_inlines(out), extras

    def run(self, r, rels, marks, out, extras, field):
        rpr = r.find(W + "rPr")
        m = dict(marks)
        if rpr is not None:
            rstyle = rpr.find(W + "rStyle")
            sid = rstyle.get(W + "val") if rstyle is not None else None
            for key, tag in (("bold", "b"), ("italic", "i")):
                value = _on(rpr, W + tag)
                if value is None and sid:
                    value = self.style_fact(sid, key)
                if value is True:
                    m[key] = True
                elif value is False:
                    m.pop(key, None)
            if _on(rpr, W + "strike") or _on(rpr, W + "dstrike"):
                m["strike"] = True
            va = rpr.find(W + "vertAlign")
            if va is not None and va.get(W + "val") in ("superscript", "subscript"):
                m["sup" if va.get(W + "val") == "superscript" else "sub"] = True
            fonts = rpr.find(W + "rFonts")
            if (fonts is not None and MONO.search(fonts.get(W + "ascii", "") or "")) or (sid and self.style_fact(sid, "mono")) or (
                    sid and re.search(r"code|verbatim", (self.styles.get(sid, {}).get("name") or ""), re.I)):
                m["code"] = True
        if field["depth"] and field["result"] and field["href"]:
            m["href"] = field["href"]
        for child in r:
            tag = child.tag
            if tag == W + "fldChar":
                kind = child.get(W + "fldCharType")
                if kind == "begin":
                    field["depth"] += 1
                    if field["depth"] == 1:
                        field.update(instr="", href=None, result=False)
                elif kind == "separate" and field["depth"] == 1:
                    hit = re.search(r'HYPERLINK\s+(?:\\l\s+)?"([^"]+)"', field["instr"])
                    internal = re.search(r'HYPERLINK\s+\\l', field["instr"])
                    field["href"] = safe_href(hit.group(1)) if hit and not internal else None
                    field["result"] = True
                    field["toc"] = bool(re.match(r"\s*TOC\b", field["instr"]))
                    if field["toc"]:
                        self.flags["toc"] = True
                elif kind == "end":
                    field["depth"] = max(0, field["depth"] - 1)
                    if field["depth"] == 0:
                        field.update(result=False, href=None, toc=False)
            elif tag == W + "instrText":
                if field["depth"] == 1:
                    field["instr"] += child.text or ""
            elif field["depth"] and not field["result"]:
                continue                                   # inside a field's instruction, not its result
            elif tag == W + "t":
                if child.text:
                    out.append(model.text(child.text, **m))
            elif tag == W + "tab":
                out.append(model.text(" ", **m))
            elif tag in (W + "br", W + "cr"):
                if child.get(W + "type") not in ("page", "column"):
                    out.append({"t": "break"})
            elif tag == W + "noBreakHyphen":
                out.append(model.text("‑", **m))
            elif tag == W + "sym":
                code = child.get(W + "char", "")
                try:
                    point = int(code, 16)
                    out.append(model.text(chr(point - 0xF000 if 0xF000 <= point <= 0xF0FF else point), **m))
                except ValueError:
                    pass
            elif tag in (W + "footnoteReference", W + "endnoteReference"):
                note_id = ("fn" if tag == W + "footnoteReference" else "en") + child.get(W + "id", "")
                if note_id not in self.note_order:
                    self.note_order.append(note_id)
                out.append({"t": "fnref", "id": note_id})
            elif tag == W + "drawing":
                self.drawing(child, rels, extras)
            elif tag in (W + "pict", W + "object"):
                self.vml(child, rels, extras)
            elif tag == MC + "AlternateContent":
                choice = child.find(MC + "Choice")
                branch = choice if choice is not None else child.find(MC + "Fallback")
                for inner in (branch if branch is not None else []):
                    if inner.tag == W + "drawing":
                        self.drawing(inner, rels, extras)
                    elif inner.tag in (W + "pict", W + "object"):
                        self.vml(inner, rels, extras)

    # ------------------------------------------------ drawings
    def embed(self, target, hint=None):
        data = self.pkg.read(target)
        if data is None:
            self.result.warn("EMBEDDED_MEDIA_MISSING", "The document references an embedded file that is not in the package: %s" % target,
                             "Re-insert the media in the source document, or supply it as a separate file.")
            return None
        return self.result.add_embedded(data, posixpath.basename(target), part=target)

    def drawing(self, drawing, rels, extras):
        box = drawing.find(WP + "inline")
        if box is None:
            box = drawing.find(WP + "anchor")
        if box is None:
            return
        extent, props = box.find(WP + "extent"), box.find(WP + "docPr")
        width = height = None
        if extent is not None:
            try:
                width, height = round(int(extent.get("cx")) / EMU_PER_PX), round(int(extent.get("cy")) / EMU_PER_PX)
            except (TypeError, ValueError):
                pass
        descr = props.get("descr") if props is not None else None
        title = props.get("title") if props is not None else None
        data = box.find(".//" + A + "graphicData")
        uri = data.get("uri") if data is not None else ""
        if uri == CHART_URI:
            ref = data.find(C + "chart")
            target = rels.get(ref.get(R + "id"), (None,))[0] if ref is not None else None
            chart = parse_chart(self.pkg.xml(target)) if target and target in self.pkg.names else None
            if chart:
                if descr:
                    chart["alt"] = descr
                extras.append(chart)
            else:
                self.result.warn("CHART_DATA_UNAVAILABLE", "A native chart was found but its data could not be read.",
                                 "Export the chart as an image and supply it, or check the chart in the source document.")
            return
        if uri == DIAGRAM_URI:
            self.flags["smartart"] += 1
            return
        html = next((el.get("embeddedHtml") for el in box.iter() if el.get("embeddedHtml")), None)
        if html:
            m = re.search(r'src\s*=\s*["\']([^"\']+)', html)
            provider = model.video_provider(m.group(1)) if m else None
            if provider:
                url = m.group(1)
                extras.append({"type": "embed", "provider": provider[0], "mediaId": provider[1], "url": ("https:" + url) if url.startswith("//") else url,
                               "title": title or descr or None})
                return
        blips = [b for b in box.iter(A + "blip")]
        seen = set()
        for blip in blips:
            rid, link = blip.get(R + "embed"), blip.get(R + "link")
            if rid and rid in rels and rid not in seen:
                seen.add(rid)
                key = self.embed(rels[rid][0])
                if key:
                    single = len(blips) == 1
                    extras.append(model.media({"kind": "embedded", "key": key}, alt=descr, title=title or None,
                                              width=width if single else None, height=height if single else None))
            elif link and link in rels and rels[link][2]:
                extras.append(model.media({"kind": "url", "url": rels[link][0]}, alt=descr, title=title or None, media_kind="image"))
        for content in box.iter(W + "txbxContent"):
            self.flags["textboxes"] += 1
            extras.extend(self.body(content, rels))

    def vml(self, node, rels, extras):
        for image in node.iter(V + "imagedata"):
            rid = image.get(R + "id")
            if rid in rels:
                key = self.embed(rels[rid][0])
                if key:
                    shape = next((s for s in node.iter(V + "shape")), None)
                    extras.append(model.media({"kind": "embedded", "key": key}, alt=(shape.get("alt") if shape is not None else None) or image.get(O + "title")))
        if node.find(O + "OLEObject") is not None:
            self.flags["ole"] += 1
        for content in node.iter(W + "txbxContent"):
            self.flags["textboxes"] += 1
            extras.extend(self.body(content, rels))

    # ------------------------------------------------ body
    def body(self, container, rels):
        blocks = []
        open_lists = []            # stack of (ilvl, list block)
        code_run, quote_run = [], []

        def close_lists():
            open_lists.clear()

        def close_runs():
            if code_run:
                blocks.append({"type": "code", "language": None, "text": "\n".join(code_run)})
                code_run.clear()
            if quote_run:
                blocks.append({"type": "blockquote", "blocks": list(quote_run)})
                quote_run.clear()

        def children(node):
            for child in node:
                if child.tag == W + "sdt":
                    gallery = child.find(W + "sdtPr/" + W + "docPartObj/" + W + "docPartGallery")
                    if gallery is not None and "Table of Contents" in gallery.get(W + "val", ""):
                        self.flags["toc"] = True
                        continue
                    content = child.find(W + "sdtContent")
                    if content is not None:
                        yield from children(content)
                elif child.tag == MC + "AlternateContent":
                    choice = child.find(MC + "Choice")
                    yield from children(choice if choice is not None else (child.find(MC + "Fallback") or []))
                elif child.tag in (W + "ins", W + "moveTo", W + "customXml", W + "smartTag"):
                    yield from children(child)
                else:
                    yield child

        for child in children(container):
            if child.tag == W + "tbl":
                close_lists()
                close_runs()
                blocks.extend(self.table(child, rels))
                continue
            if child.tag != W + "p":
                continue
            ppr = child.find(W + "pPr")
            style_el = ppr.find(W + "pStyle") if ppr is not None else None
            style_id = style_el.get(W + "val") if style_el is not None else None
            kind, level = self.classify(style_id, ppr)
            if kind == "toc":
                self.flags["toc"] = True
                continue
            base = {}
            if kind not in ("heading", "title", "subtitle", "caption"):
                if self.style_fact(style_id, "bold") is True:
                    base["bold"] = True
                if self.style_fact(style_id, "italic") is True and kind not in ("quote", "caption"):
                    base["italic"] = True
            inlines, extras = self.runs(child, rels, base)
            inlines = model.trim_inlines(inlines) if kind != "code" else model.merge_inlines(inlines)
            has_text = bool(model.plain(inlines).strip()) or any(i.get("t") == "fnref" for i in inlines)

            numpr = ppr.find(W + "numPr") if ppr is not None else None
            num_id = ilvl = None
            if numpr is not None:
                nid, lv = numpr.find(W + "numId"), numpr.find(W + "ilvl")
                num_id = nid.get(W + "val") if nid is not None else None
                ilvl = int(lv.get(W + "val", "0")) if lv is not None and lv.get(W + "val", "0").isdigit() else 0
            elif kind not in ("heading", "title", "subtitle"):
                num_id = self.style_fact(style_id, "numId")
                lv = self.style_fact(style_id, "ilvl")
                ilvl = int(lv) if lv and str(lv).isdigit() else 0
                if kind in ("list-bullet", "list-number") and level:
                    ilvl = max(ilvl, level)          # "List Bullet 2" is the second level by definition
            is_list = (num_id not in (None, "0") and kind not in ("heading", "title", "subtitle")) or kind in ("list-bullet", "list-number")

            if kind == "code" and (has_text or code_run):
                close_lists()
                if quote_run:
                    close_runs()
                code_run.append(model.plain(inlines).replace(" ", " "))
                blocks_after = extras
            elif not has_text:
                blocks_after = extras
                if extras:
                    close_runs()
            elif kind == "quote":
                close_lists()
                if code_run:
                    close_runs()
                quote_run.append(model.paragraph(inlines))
                blocks_after = extras
            elif is_list:
                close_runs()
                if num_id in (None, "0"):
                    spec = {"ordered": kind == "list-number", "start": 1}
                else:
                    spec = self.numbering.get(num_id, {}).get(ilvl, {"ordered": False, "start": 1})
                while open_lists and open_lists[-1][0] > ilvl:
                    open_lists.pop()
                if open_lists and open_lists[-1][0] == ilvl and open_lists[-1][2] != num_id and len(open_lists) == 1:
                    open_lists.clear()               # a different top-level list starts here
                if not open_lists or open_lists[-1][0] < ilvl:
                    new = {"type": "list", "ordered": bool(spec.get("ordered")), "items": []}
                    if new["ordered"]:
                        new["start"] = spec.get("start", 1)
                    if open_lists and open_lists[-1][1]["items"]:
                        open_lists[-1][1]["items"][-1]["children"].append(new)
                    else:
                        if open_lists:
                            open_lists.clear()
                        blocks.append(new)
                    open_lists.append((ilvl, new, num_id))
                open_lists[-1][1]["items"].append({"inlines": inlines, "children": list(extras)})
                continue
            else:
                close_lists()
                close_runs()
                if kind == "heading":
                    blocks.append(model.heading(level, inlines))
                elif kind in ("title", "subtitle", "caption"):
                    blocks.append(model.paragraph(inlines, style=kind))
                else:
                    blocks.append(model.paragraph(inlines))
                blocks_after = extras
            if blocks_after:
                # Media anchored in a paragraph follows that paragraph, in document order.
                close_runs()
                if not has_text:
                    close_lists()
                blocks.extend(blocks_after)
        close_runs()
        return blocks

    def table(self, tbl, rels):
        rows, header_rows, after = [], 0, []
        look = tbl.find(W + "tblPr/" + W + "tblLook")
        first_row_styled = False
        if look is not None:
            if look.get(W + "firstRow") is not None:
                first_row_styled = look.get(W + "firstRow") in ("1", "true")
            else:
                try:
                    first_row_styled = bool(int(look.get(W + "val", "0"), 16) & 0x0020)
                except ValueError:
                    pass
        spans = {}                                   # column index → cell dict still growing downward
        counting_header = True
        for tr in tbl.findall(W + "tr"):
            cells, col = [], 0
            trpr = tr.find(W + "trPr")
            marked = trpr is not None and _on(trpr, W + "tblHeader")
            for tc in tr.findall(W + "tc"):
                tcpr = tc.find(W + "tcPr")
                grid = tcpr.find(W + "gridSpan") if tcpr is not None else None
                span = int(grid.get(W + "val", "1")) if grid is not None and grid.get(W + "val", "1").isdigit() else 1
                merge = tcpr.find(W + "vMerge") if tcpr is not None else None
                if merge is not None and merge.get(W + "val", "continue") != "restart":
                    if col in spans:
                        spans[col]["rowspan"] = spans[col].get("rowspan", 1) + 1
                    col += span
                    continue
                inlines = []
                for part in tc:
                    if part.tag == W + "p":
                        part_inl, extras = self.runs(part, rels, {})
                        part_inl = model.trim_inlines(part_inl)
                        if part_inl:
                            if inlines:
                                inlines.append({"t": "break"})
                            inlines.extend(part_inl)
                        if extras:
                            self.flags["cell_media"] += len(extras)
                            after.extend(extras)
                    elif part.tag == W + "tbl":
                        self.flags["nested_tables"] += 1
                        for nested in self.table(part, rels):
                            value = model.block_text(nested)
                            if value:
                                if inlines:
                                    inlines.append({"t": "break"})
                                inlines.append(model.text(value))
                cell = {"inlines": inlines}
                if span > 1:
                    cell["colspan"] = span
                if merge is not None:
                    spans[col] = cell
                else:
                    spans.pop(col, None)
                cells.append(cell)
                col += span
            if not cells:
                continue
            if counting_header and marked:
                header_rows += 1
            else:
                counting_header = False
            rows.append(cells)
        if not rows:
            return []
        if header_rows == 0 and first_row_styled and len(rows) > 1:
            header_rows = 1
        return [{"type": "table", "headerRows": header_rows, "rows": rows}] + after

    # ------------------------------------------------ entry
    def extract(self):
        result = self.result
        if "word/document.xml" not in self.pkg.names:
            result.fail("DOCUMENT_CORRUPT", "This file is not a readable Word document (the main document part is missing).",
                        "Open the file in Word and save it again as .docx, then re-upload.")
            return
        if any(n.lower().endswith("vbaproject.bin") for n in self.pkg.names):
            result.warn("MACROS_IGNORED", "The document contains macros. They were not run and were not carried over.",
                        "No action needed for publishing.", severity="info")
        self.load_styles()
        self.load_numbering()
        self.load_notes("word/footnotes.xml", "footnote", self.footnotes, "fn")
        self.load_notes("word/endnotes.xml", "endnote", self.endnotes, "en")
        self.pkg.core(result)
        root = self.pkg.xml("word/document.xml")
        body = root.find(W + "body")
        rels = self.pkg.rels("word/document.xml")
        result.blocks = self.body(body if body is not None else root, rels)
        notes = dict(self.footnotes, **self.endnotes)
        items = [{"id": nid, "inlines": notes[nid]} for nid in self.note_order if nid in notes]
        if items:
            result.blocks.append({"type": "footnotes", "items": items})
        f = self.flags
        if f["tracked"]:
            result.warn("TRACKED_CHANGES_PRESENT", "The document has tracked changes. Insertions were kept and deletions were left out.",
                        "Accept or reject all changes in the source document and upload it again to be certain of the final wording.")
        if f["toc"]:
            result.warn("TABLE_OF_CONTENTS_SKIPPED", "The document's generated table of contents was not carried over.",
                        "No action needed: the page's own heading structure provides navigation.", severity="info")
        if f["textboxes"]:
            result.warn("TEXT_BOX_REPOSITIONED", "%d text box(es) were placed directly after the paragraph they are anchored to." % f["textboxes"],
                        "Check these passages in the preview; a floating text box has no fixed reading position.")
        if f["smartart"]:
            result.warn("DIAGRAM_NOT_EXTRACTABLE", "%d SmartArt diagram(s) cannot be extracted as an image from the document." % f["smartart"],
                        "Export each SmartArt diagram as PNG or SVG and supply it, with a placement instruction.")
        if f["ole"]:
            result.warn("EMBEDDED_OBJECT_PREVIEW_ONLY", "%d embedded object(s) (for example a spreadsheet) were carried over as their preview picture only." % f["ole"],
                        "Supply the object's content separately if readers need it.", severity="info")
        if f["cell_media"]:
            result.warn("TABLE_MEDIA_MOVED", "%d media item(s) inside table cells were placed directly after their table." % f["cell_media"],
                        "Check the placement in the preview.")
        if f["nested_tables"]:
            result.warn("NESTED_TABLE_FLATTENED", "%d table(s) nested inside another table's cell were reduced to their text." % f["nested_tables"],
                        "Restructure the nested table in the source if its layout matters.")
        comments = self.pkg.xml("word/comments.xml")
        if comments is not None and len(comments.findall(W + "comment")):
            result.warn("COMMENTS_NOT_CARRIED", "%d review comment(s) were not carried over." % len(comments.findall(W + "comment")),
                        "No action needed for publishing.", severity="info")


def extract_docx(path, ctx):
    result = model.DocResult("docx (package parts)")
    try:
        doc = Docx(path, result)
    except UnsafeInput:
        raise
    except Exception as error:            # zipfile.BadZipFile and friends
        result.fail("DOCUMENT_CORRUPT", "The Word document could not be opened: %s" % error, "Re-export the document from its source application and upload it again.")
        return result
    try:
        doc.extract()
    except ET.ParseError as error:
        result.fail("DOCUMENT_CORRUPT", "A part of the Word document is not valid XML: %s" % error, "Open the file in Word, save a fresh copy and upload that.")
    finally:
        doc.pkg.close()
    return result


# =================================================================== PPTX
SKIP_PLACEHOLDERS = {"sldNum", "ftr", "dt", "hdr", "sldImg"}


class Pptx:
    def __init__(self, path, result):
        self.pkg, self.result = Package(path), result
        self.hidden = self.notes = 0

    def paragraphs(self, tx_body, rels, bulleted_default):
        """Blocks for one text body: bullet paragraphs become (nested) lists."""
        blocks, stack = [], []
        for p in tx_body.findall(A + "p"):
            ppr = p.find(A + "pPr")
            level = int(ppr.get("lvl", "0")) if ppr is not None and ppr.get("lvl", "0").isdigit() else 0
            inlines = []
            for child in p:
                if child.tag in (A + "r", A + "fld"):
                    rpr, t = child.find(A + "rPr"), child.find(A + "t")
                    marks = {}
                    if rpr is not None:
                        if rpr.get("b") in ("1", "true"):
                            marks["bold"] = True
                        if rpr.get("i") in ("1", "true"):
                            marks["italic"] = True
                        if rpr.get("strike") not in (None, "noStrike"):
                            marks["strike"] = True
                        try:
                            baseline = int(rpr.get("baseline", "0"))
                            if baseline:
                                marks["sup" if baseline > 0 else "sub"] = True
                        except ValueError:
                            pass
                        link = rpr.find(A + "hlinkClick")
                        if link is not None and link.get(R + "id") in rels and rels[link.get(R + "id")][2]:
                            href = safe_href(rels[link.get(R + "id")][0])
                            if href:
                                marks["href"] = href
                    if t is not None and t.text:
                        inlines.append(model.text(t.text.replace("\x0b", " "), **marks))
                elif child.tag == A + "br":
                    inlines.append({"t": "break"})
            inlines = model.trim_inlines(inlines)
            if not inlines:
                stack.clear()
                continue
            bullet = bulleted_default
            ordered = False
            if ppr is not None:
                if ppr.find(A + "buNone") is not None:
                    bullet = False
                elif ppr.find(A + "buAutoNum") is not None:
                    bullet, ordered = True, True
                elif ppr.find(A + "buChar") is not None or ppr.find(A + "buBlip") is not None:
                    bullet = True
            if not bullet:
                stack.clear()
                blocks.append(model.paragraph(inlines))
                continue
            while stack and stack[-1][0] > level:
                stack.pop()
            if not stack or stack[-1][0] < level:
                new = {"type": "list", "ordered": ordered, "items": []}
                if ordered:
                    new["start"] = 1
                if stack and stack[-1][1]["items"]:
                    stack[-1][1]["items"][-1]["children"].append(new)
                else:
                    blocks.append(new)
                stack.append((level, new))
            stack[-1][1]["items"].append({"inlines": inlines, "children": []})
        return blocks

    def shapes(self, tree, rels, slide_no, out):
        """(order key, role, blocks) per shape, recursing into groups."""
        for shape in tree:
            tag = shape.tag
            if tag == MC + "AlternateContent":
                choice = shape.find(MC + "Choice")
                self.shapes(choice if choice is not None else (shape.find(MC + "Fallback") or []), rels, slide_no, out)
                continue
            if tag == P + "grpSp":
                self.shapes(shape, rels, slide_no, out)
                continue
            off = shape.find(".//" + A + "off")
            ph = shape.find(".//" + P + "nvPr/" + P + "ph")
            # Reading order: title, then layout placeholders in their own order, then free shapes top-to-bottom.
            try:
                key = (1, int(off.get("y")), int(off.get("x"))) if off is not None and ph is None else (0, 0, 0)
            except (TypeError, ValueError):
                key = (1, 1 << 40, 0)
            ph_type = ph.get("type", "body") if ph is not None else None
            if ph_type in SKIP_PLACEHOLDERS:
                continue
            if tag == P + "sp":
                body = shape.find(P + "txBody")
                if body is None:
                    continue
                if ph_type in ("title", "ctrTitle"):
                    inl = model.trim_inlines([i for b in self.paragraphs(body, rels, False) for i in (b.get("inlines", []) + [model.text(" ")])])
                    if inl:
                        # The first slide's title is the document title; every later slide title opens a section.
                        out.append(((-2, 0, 0), model.paragraph(inl, style="title") if slide_no == 1 else model.heading(2, inl)))
                elif ph_type == "subTitle":
                    for b in self.paragraphs(body, rels, False):
                        if b["type"] == "paragraph":
                            b["style"] = "subtitle" if slide_no == 1 else None
                            if b["style"] is None:
                                b.pop("style")
                        out.append(((-1, 0, 0), b))
                else:
                    for b in self.paragraphs(body, rels, bulleted_default=ph is not None):
                        out.append((key, b))
            elif tag == P + "pic":
                props = shape.find(P + "nvPicPr/" + P + "cNvPr")
                alt = props.get("descr") if props is not None else None
                nvpr = shape.find(P + "nvPicPr/" + P + "nvPr")
                ext = shape.find(".//" + A + "ext")
                width = height = None
                try:
                    width, height = round(int(ext.get("cx")) / EMU_PER_PX), round(int(ext.get("cy")) / EMU_PER_PX)
                except (AttributeError, TypeError, ValueError):
                    pass
                blip = shape.find(".//" + A + "blip")
                poster_key = None
                if blip is not None and blip.get(R + "embed") in rels:
                    poster_key = self._embed(rels[blip.get(R + "embed")][0])
                media_ref, media_kind = None, None
                if nvpr is not None:
                    for el in nvpr.iter():
                        local = el.tag.rsplit("}", 1)[-1]
                        if local in ("videoFile", "audioFile", "media", "wavAudioFile", "quickTimeFile"):
                            rid = el.get(R + "embed") or el.get(R + "link")
                            if rid in rels:
                                target, _, external = rels[rid]
                                media_kind = "audio" if "audio" in local.lower() else "video"
                                if external:
                                    provider = model.video_provider(target)
                                    if provider:
                                        out.append((key, {"type": "embed", "provider": provider[0], "mediaId": provider[1], "url": target, "title": alt}))
                                        media_ref = "done"
                                    elif media_ref is None:
                                        media_ref = {"kind": "url", "url": target}
                                else:
                                    embedded = self._embed(target)
                                    if embedded:
                                        media_ref = {"kind": "embedded", "key": embedded}
                                        if "audio" in posixpath.basename(target).lower() or target.lower().endswith((".mp3", ".wav", ".m4a")):
                                            media_kind = "audio"
                if media_ref == "done":
                    continue
                if media_ref is not None:
                    block = model.media(media_ref, alt=alt, media_kind=media_kind, width=width, height=height)
                    if poster_key and media_kind == "video":
                        block["poster"] = {"kind": "embedded", "key": poster_key}
                    out.append((key, block))
                elif poster_key:
                    out.append((key, model.media({"kind": "embedded", "key": poster_key}, alt=alt, width=width, height=height)))
            elif tag == P + "graphicFrame":
                data = shape.find(".//" + A + "graphicData")
                uri = data.get("uri") if data is not None else ""
                props = shape.find(P + "nvGraphicFramePr/" + P + "cNvPr")
                if uri == CHART_URI:
                    ref = data.find(C + "chart")
                    target = rels.get(ref.get(R + "id"), (None,))[0] if ref is not None else None
                    chart = parse_chart(self.pkg.xml(target)) if target and target in self.pkg.names else None
                    if chart:
                        if props is not None and props.get("descr"):
                            chart["alt"] = props.get("descr")
                        out.append((key, chart))
                    else:
                        self.result.warn("CHART_DATA_UNAVAILABLE", "A native chart on slide %d was found but its data could not be read." % slide_no,
                                         "Export the chart as an image and supply it.")
                elif data is not None and data.find(A + "tbl") is not None:
                    rows = []
                    tbl = data.find(A + "tbl")
                    first_row = tbl.find(A + "tblPr") is not None and tbl.find(A + "tblPr").get("firstRow") in ("1", "true")
                    for tr in tbl.findall(A + "tr"):
                        cells = []
                        for tc in tr.findall(A + "tc"):
                            if tc.get("hMerge") in ("1", "true") or tc.get("vMerge") in ("1", "true"):
                                continue
                            inl = []
                            body = tc.find(A + "txBody")
                            for b in (self.paragraphs(body, rels, False) if body is not None else []):
                                if inl:
                                    inl.append({"t": "break"})
                                inl.extend(b.get("inlines") or [model.text(model.block_text(b))])
                            cell = {"inlines": inl}
                            for attr, name in (("gridSpan", "colspan"), ("rowSpan", "rowspan")):
                                if tc.get(attr, "1").isdigit() and int(tc.get(attr, "1")) > 1:
                                    cell[name] = int(tc.get(attr))
                            cells.append(cell)
                        if cells:
                            rows.append(cells)
                    if rows:
                        out.append((key, {"type": "table", "headerRows": 1 if first_row and len(rows) > 1 else 0, "rows": rows}))
                elif uri == DIAGRAM_URI:
                    self.result.warn("DIAGRAM_NOT_EXTRACTABLE", "A SmartArt diagram on slide %d cannot be extracted as an image." % slide_no,
                                     "Export the diagram as PNG or SVG and supply it, with a placement instruction.")

    def _embed(self, target):
        data = self.pkg.read(target)
        if data is None:
            self.result.warn("EMBEDDED_MEDIA_MISSING", "The presentation references an embedded file that is not in the package: %s" % target,
                             "Re-insert the media in the source file, or supply it separately.")
            return None
        for key, existing in self.result.embedded.items():
            if existing.get("part") == target:
                return key
        return self.result.add_embedded(data, posixpath.basename(target), part=target)

    def extract(self):
        result = self.result
        pres = self.pkg.xml("ppt/presentation.xml")
        if pres is None:
            result.fail("DOCUMENT_CORRUPT", "This file is not a readable presentation.", "Re-save it as .pptx and upload again.")
            return
        self.pkg.core(result)
        rels = self.pkg.rels("ppt/presentation.xml")
        slides = []
        id_list = pres.find(P + "sldIdLst")
        for sld in (id_list.findall(P + "sldId") if id_list is not None else []):
            target = rels.get(sld.get(R + "id"), (None,))[0]
            if target and target in self.pkg.names:
                slides.append(target)
        result.pages = len(slides)
        number = 0
        for part in slides:
            root = self.pkg.xml(part)
            if root.get("show") in ("0", "false"):
                self.hidden += 1
                continue
            number += 1
            slide_rels = self.pkg.rels(part)
            if any(kind == "notesSlide" for _, kind, _ in slide_rels.values()):
                self.notes += 1
            tree = root.find(P + "cSld/" + P + "spTree")
            found = []
            if tree is not None:
                self.shapes(tree, slide_rels, number, found)
            for order, block in sorted(enumerate(found), key=lambda pair: (pair[1][0], pair[0])):
                block[1]["sourcePage"] = number
                result.blocks.append(block[1])
        result.notes["presentation"] = True
        result.notes["slides"] = number
        if self.hidden:
            result.warn("HIDDEN_SLIDES_SKIPPED", "%d hidden slide(s) were not carried over." % self.hidden,
                        "Unhide the slides in the source file if their content belongs in the blog.", severity="info")
        if self.notes:
            result.warn("SPEAKER_NOTES_NOT_CARRIED", "Speaker notes on %d slide(s) were not carried over." % self.notes,
                        "If the notes hold the blog's body text, supply them as a document.", severity="info")


def extract_pptx(path, ctx):
    result = model.DocResult("pptx (package parts)")
    try:
        deck = Pptx(path, result)
    except UnsafeInput:
        raise
    except Exception as error:
        result.fail("DOCUMENT_CORRUPT", "The presentation could not be opened: %s" % error, "Re-export the presentation and upload it again.")
        return result
    try:
        deck.extract()
    except ET.ParseError as error:
        result.fail("DOCUMENT_CORRUPT", "A part of the presentation is not valid XML: %s" % error, "Open the file in PowerPoint, save a fresh copy and upload that.")
    finally:
        deck.pkg.close()
    return result


# =================================================================== XLSX
BUILTIN_DATE = {14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 45, 46, 47, 50, 51, 52, 53, 54, 55, 56, 57, 58}
BUILTIN_FORMATS = {1: "0", 2: "0.00", 3: "#,##0", 4: "#,##0.00", 9: "0%", 10: "0.00%", 37: "#,##0", 38: "#,##0", 39: "#,##0.00", 40: "#,##0.00"}


def _col(ref):
    letters = re.match(r"[A-Z]+", ref or "A")
    n = 0
    for ch in (letters.group(0) if letters else "A"):
        n = n * 26 + ord(ch) - 64
    return n - 1


def _group(digits):
    return re.sub(r"(?<=\d)(?=(\d{3})+$)", ",", digits)


def format_number(raw, code, is_date_id, date1904=False):
    """(display text, applied?) for a numeric cell under its number format.

    Only formats that can be applied EXACTLY are applied; otherwise the stored
    value is returned untouched and the caller reports it.
    """
    try:
        value = float(raw)
    except (TypeError, ValueError):
        return raw, True
    code = (code or "General").split(";")[0]
    bare = re.sub(r'"[^"]*"|\\.|\[[^\]]*\]|_.|\*.', "", code).strip()
    if is_date_id or (re.search(r"[ymdhs]", bare, re.I) and not re.search(r"[0#]", bare)):
        base = datetime.datetime(1904, 1, 1) if date1904 else datetime.datetime(1899, 12, 30)
        try:
            moment = base + datetime.timedelta(days=value)
        except OverflowError:
            return _num(raw), False
        has_date, has_time = bool(re.search(r"[yd]|m(?![:\]])", bare, re.I)) or is_date_id and value >= 1, value != int(value)
        if has_date and has_time:
            return moment.strftime("%Y-%m-%d %H:%M"), True
        return (moment.strftime("%Y-%m-%d") if has_date else moment.strftime("%H:%M")), True
    if bare in ("General", "@", ""):
        return _num(raw), True
    m = re.fullmatch(r"([#,]*)(0+)(?:\.(0+))?(%)?", bare)
    if not m:
        return _num(raw), False
    decimals = len(m.group(3) or "")
    if m.group(4):
        value *= 100
    body = "%.*f" % (decimals, value)
    whole, _, frac = body.partition(".")
    sign = "-" if whole.startswith("-") else ""
    whole = whole.lstrip("-")
    if "," in m.group(1):
        whole = _group(whole)
    lead = code.split(m.group(2))[0]
    prefix = "".join(q or cur for q, cur in re.findall(r'"([^"]*)"|\[\$([^\]-]*)', lead))
    text = sign + prefix + whole + ("." + frac if frac else "") + ("%" if m.group(4) else "")
    return text, True


class Xlsx:
    def __init__(self, path, result):
        self.pkg, self.result = Package(path), result
        self.strings, self.formats, self.xfs = [], dict(BUILTIN_FORMATS), []
        self.unformatted = 0
        self.date1904 = False
        self.raw = {}                 # sheet name → {(row, col): stored value as text}

    def resolve(self, formula):
        """Stored values for a chart reference such as 'Sheet 1'!$B$2:$B$4."""
        m = re.fullmatch(r"\s*(?:'((?:[^']|'')+)'|([^'!]+))!\$?([A-Z]+)\$?(\d+)(?::\$?([A-Z]+)\$?(\d+))?\s*", formula or "")
        if not m:
            return []
        sheet = self.raw.get((m.group(1) or m.group(2)).replace("''", "'"))
        if sheet is None:
            return []
        c0, r0 = _col(m.group(3)), int(m.group(4)) - 1
        c1, r1 = (_col(m.group(5)), int(m.group(6)) - 1) if m.group(5) else (c0, r0)
        return [sheet.get((r, c)) for r in range(r0, r1 + 1) for c in range(c0, c1 + 1)]

    def load_raw(self, part, name):
        store = self.raw.setdefault(name, {})
        for c in self.pkg.xml(part).iter(S + "c"):
            m = re.fullmatch(r"([A-Z]+)(\d+)", c.get("r", ""))
            v = c.find(S + "v")
            if not m:
                continue
            if c.get("t") == "s" and v is not None and (v.text or "").isdigit() and int(v.text) < len(self.strings):
                value = model.plain(self.strings[int(v.text)])
            elif c.get("t") == "inlineStr":
                value = "".join(t.text or "" for t in c.iter(S + "t"))
            elif v is None or v.text is None:
                continue
            else:
                value = _num(v.text) if c.get("t", "n") == "n" else v.text
            store[(int(m.group(2)) - 1, _col(m.group(1)))] = value

    def load(self):
        root = self.pkg.xml("xl/sharedStrings.xml")
        if root is not None:
            for si in root.findall(S + "si"):
                runs = []
                if si.find(S + "t") is not None:
                    runs.append(model.text(si.find(S + "t").text or ""))
                for r in si.findall(S + "r"):
                    rpr, t = r.find(S + "rPr"), r.find(S + "t")
                    marks = {}
                    if rpr is not None:
                        if rpr.find(S + "b") is not None:
                            marks["bold"] = True
                        if rpr.find(S + "i") is not None:
                            marks["italic"] = True
                    runs.append(model.text((t.text or "") if t is not None else "", **marks))
                self.strings.append(model.merge_inlines(runs))
        styles = self.pkg.xml("xl/styles.xml")
        if styles is not None:
            for fmt in styles.findall(S + "numFmts/" + S + "numFmt"):
                self.formats[int(fmt.get("numFmtId"))] = fmt.get("formatCode")
            for xf in styles.findall(S + "cellXfs/" + S + "xf"):
                self.xfs.append(int(xf.get("numFmtId", "0")))

    def cell(self, c):
        kind, v, style = c.get("t", "n"), c.find(S + "v"), c.get("s")
        if kind == "s" and v is not None:
            try:
                return [dict(r) for r in self.strings[int(v.text)]]
            except (ValueError, IndexError):
                return []
        if kind == "inlineStr":
            return [model.text("".join(t.text or "" for t in c.iter(S + "t")))]
        if v is None or v.text is None:
            return []
        if kind == "b":
            return [model.text("TRUE" if v.text == "1" else "FALSE")]
        if kind in ("str", "e"):
            return [model.text(v.text)]
        fmt_id = self.xfs[int(style)] if style and style.isdigit() and int(style) < len(self.xfs) else 0
        text_value, applied = format_number(v.text, self.formats.get(fmt_id), fmt_id in BUILTIN_DATE, self.date1904)
        if not applied:
            self.unformatted += 1
        return [model.text(text_value)]

    def sheet(self, part, name):
        root = self.pkg.xml(part)
        grid = {}
        for row in root.iter(S + "row"):
            r = int(row.get("r", "0")) - 1
            for c in row.findall(S + "c"):
                inl = self.cell(c)
                if inl and model.plain(inl).strip():
                    grid[(r if r >= 0 else len(grid), _col(c.get("r")))] = inl
        blocks = []
        if grid:
            rows = sorted({r for r, _ in grid})
            cols = sorted({c for _, c in grid})
            r0, r1, c0, c1 = rows[0], rows[-1], cols[0], cols[-1]
            merges = {}
            covered = set()
            for mc in root.iter(S + "mergeCell"):
                m = re.fullmatch(r"([A-Z]+)(\d+):([A-Z]+)(\d+)", mc.get("ref", ""))
                if not m:
                    continue
                a, b = (int(m.group(2)) - 1, _col(m.group(1))), (int(m.group(4)) - 1, _col(m.group(3)))
                merges[a] = (b[0] - a[0] + 1, b[1] - a[1] + 1)
                covered |= {(r, c) for r in range(a[0], b[0] + 1) for c in range(a[1], b[1] + 1)} - {a}
            table_rows = []
            for r in range(r0, r1 + 1):
                if not any((r, c) in grid for c in range(c0, c1 + 1)):
                    continue                                    # a fully empty row inside the used range
                cells = []
                for c in range(c0, c1 + 1):
                    if (r, c) in covered:
                        continue
                    cell = {"inlines": grid.get((r, c), [])}
                    if (r, c) in merges:
                        rs, cs = merges[(r, c)]
                        if cs > 1:
                            cell["colspan"] = cs
                        if rs > 1:
                            cell["rowspan"] = rs
                    cells.append(cell)
                table_rows.append(cells)
            first = table_rows[0]
            all_text = all(model.plain(c["inlines"]).strip() and not re.fullmatch(r"-?[\d.,]+%?", model.plain(c["inlines"]).strip()) for c in first)
            blocks.append({"type": "table", "headerRows": 1 if all_text and len(table_rows) > 1 else 0, "rows": table_rows,
                           "caption": [model.text(name)], "sourceSheet": name})
        # charts and pictures anchored on this sheet
        for target, kind, external in self.pkg.rels(part).values():
            if kind != "drawing" or external or target not in self.pkg.names:
                continue
            drawing, drels = self.pkg.xml(target), self.pkg.rels(target)
            for anchor in drawing:
                ref = anchor.find(".//" + C + "chart")
                if ref is not None and ref.get(R + "id") in drels:
                    chart_part = drels[ref.get(R + "id")][0]
                    chart = parse_chart(self.pkg.xml(chart_part), self.resolve) if chart_part in self.pkg.names else None
                    if chart:
                        blocks.append(chart)
                    else:
                        self.result.warn("CHART_DATA_UNAVAILABLE", "A chart on sheet %s could not be read." % name, "Export the chart as an image and supply it.")
                for blip in anchor.iter(A + "blip"):
                    rid = blip.get(R + "embed")
                    if rid in drels:
                        data = self.pkg.read(drels[rid][0])
                        if data is not None:
                            props = anchor.find(".//" + XDR + "cNvPr")
                            key = self.result.add_embedded(data, posixpath.basename(drels[rid][0]), part=drels[rid][0])
                            blocks.append(model.media({"kind": "embedded", "key": key}, alt=props.get("descr") if props is not None else None))
        return blocks

    def extract(self):
        wb = self.pkg.xml("xl/workbook.xml")
        if wb is None:
            self.result.fail("DOCUMENT_CORRUPT", "This file is not a readable workbook.", "Re-save it as .xlsx and upload again.")
            return
        self.pkg.core(self.result)
        pr = wb.find(S + "workbookPr")
        self.date1904 = pr is not None and pr.get("date1904") in ("1", "true")
        self.load()
        rels = self.pkg.rels("xl/workbook.xml")
        visible = []
        hidden = 0
        for sheet in wb.findall(S + "sheets/" + S + "sheet"):
            if sheet.get("state") in ("hidden", "veryHidden"):
                hidden += 1
                continue
            target = rels.get(sheet.get(R + "id"), (None,))[0]
            if target and target in self.pkg.names:
                visible.append((sheet.get("name", "Sheet"), target))
        for name, part in visible:
            self.load_raw(part, name)
        for name, part in visible:
            self.result.blocks.extend(self.sheet(part, name))
        self.result.notes["sheets"] = [n for n, _ in visible]
        self.result.notes["dataFile"] = True
        if hidden:
            self.result.warn("HIDDEN_SHEETS_SKIPPED", "%d hidden sheet(s) were not carried over." % hidden,
                             "Unhide a sheet in the workbook if its data belongs in the blog.", severity="info")
        if self.unformatted:
            self.result.warn("CELL_FORMAT_NOT_APPLIED", "%d cell(s) use a number format that could not be reproduced exactly, so the stored value is shown as-is." % self.unformatted,
                             "Compare these values with the spreadsheet in the preview; reformat the cells as plain number, percent or date if they differ.")


def extract_xlsx(path, ctx):
    result = model.DocResult("xlsx (package parts)")
    try:
        book = Xlsx(path, result)
    except UnsafeInput:
        raise
    except Exception as error:
        result.fail("DOCUMENT_CORRUPT", "The workbook could not be opened: %s" % error, "Re-export the workbook and upload it again.")
        return result
    try:
        book.extract()
    except ET.ParseError as error:
        result.fail("DOCUMENT_CORRUPT", "A part of the workbook is not valid XML: %s" % error, "Open the file in Excel, save a fresh copy and upload that.")
    finally:
        book.pkg.close()
    return result
