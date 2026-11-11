"""HTML → blocks.

The source markup is PARSED, never passed through: only recognised structure
becomes a block, so scripts, styles, event handlers and unknown embeds cannot
reach a published page. What was dropped is counted and reported.
"""
import base64
import binascii
import re
from html.parser import HTMLParser
from urllib.parse import unquote_to_bytes

from . import model
from .safety import safe_href

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}
DROP = {"script", "style", "noscript", "template", "form", "button", "select", "input", "textarea", "svg", "canvas", "dialog", "link", "meta", "base"}
CHROME = {"nav", "footer", "aside"}
INLINE = {"a", "abbr", "b", "bdi", "bdo", "br", "cite", "code", "data", "del", "dfn", "em", "font", "i", "img", "ins", "kbd", "label", "mark",
          "q", "s", "samp", "small", "span", "strike", "strong", "sub", "sup", "time", "tt", "u", "var", "wbr", "picture"}
AUTO_CLOSE = {"p": {"p"}, "li": {"li"}, "dt": {"dt", "dd"}, "dd": {"dt", "dd"}, "tr": {"tr", "td", "th"}, "td": {"td", "th"}, "th": {"td", "th"},
              "thead": {"tr", "td", "th", "thead", "tbody"}, "tbody": {"tr", "td", "th", "thead", "tbody"}, "option": {"option"}}
BLOCK_BREAKS_P = {"address", "article", "aside", "blockquote", "div", "dl", "figure", "footer", "h1", "h2", "h3", "h4", "h5", "h6", "header",
                  "hr", "main", "nav", "ol", "p", "pre", "section", "table", "ul", "details"}


class Node:
    __slots__ = ("tag", "attrs", "children", "parent")

    def __init__(self, tag, attrs=None, parent=None):
        self.tag, self.attrs, self.children, self.parent = tag, dict(attrs or {}), [], parent

    def find(self, *tags):
        for child in self.children:
            if isinstance(child, Node):
                if child.tag in tags:
                    return child
                hit = child.find(*tags)
                if hit:
                    return hit
        return None

    def find_all(self, *tags):
        out = []
        for child in self.children:
            if isinstance(child, Node):
                if child.tag in tags:
                    out.append(child)
                out.extend(child.find_all(*tags))
        return out


class _Builder(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node("#root")
        self.current = self.root

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        closes = AUTO_CLOSE.get(tag)
        if closes:
            probe = self.current
            while probe is not self.root and probe.tag not in ("table", "ul", "ol", "dl", "blockquote", "div", "section", "article"):
                if probe.tag in closes:
                    self.current = probe.parent
                    break
                probe = probe.parent
        if tag in BLOCK_BREAKS_P and self.current.tag == "p":
            self.current = self.current.parent
        node = Node(tag, [(k.lower(), v if v is not None else "") for k, v in attrs], self.current)
        self.current.children.append(node)
        if tag not in VOID:
            self.current = node

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag.lower() not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        tag = tag.lower()
        probe = self.current
        while probe is not self.root:
            if probe.tag == tag:
                self.current = probe.parent
                return
            probe = probe.parent

    def handle_data(self, data):
        self.current.children.append(data)


def parse_dom(source):
    builder = _Builder()
    builder.feed(source)
    builder.close()
    return builder.root


_WS = re.compile(r"[ \t\r\n\f]+")
_LANG = re.compile(r"(?:^|\s)(?:language|lang|highlight-source)-([A-Za-z0-9_+#.-]+)")
MEDIA_EXT = {
    "video": (".mp4", ".webm", ".mov", ".m4v", ".ogv", ".avi", ".mkv", ".wmv"),
    "audio": (".mp3", ".wav", ".m4a", ".ogg", ".oga", ".aac", ".flac", ".opus"),
}


def kind_from_target(target):
    low = (target or "").split("?")[0].split("#")[0].lower()
    for kind, exts in MEDIA_EXT.items():
        if low.endswith(exts):
            return kind
    return None


def media_ref(target):
    """A reference to media: a URL that stays a link, or a path to resolve against supplied files."""
    target = (target or "").strip()
    if re.match(r"^(https?:)?//", target, re.I):
        return {"kind": "url", "url": ("https:" + target) if target.startswith("//") else target}
    return {"kind": "path", "target": target}


class Converter:
    def __init__(self, result):
        self.result = result
        self.dropped = {}

    # ------------------------------------------------------------ inline
    def inlines(self, node, marks=None, hoisted=None, pre=False):
        marks = marks or {}
        out = []
        for child in node.children:
            if isinstance(child, str):
                value = child if pre else _WS.sub(" ", child)
                if value:
                    out.append(model.text(value, **marks))
                continue
            tag = child.tag
            if tag in DROP:
                self.dropped[tag] = self.dropped.get(tag, 0) + 1
                continue
            if tag == "br":
                out.append({"t": "break"})
            elif tag == "img":
                block = self.image(child)
                if block is not None and hoisted is not None:
                    hoisted.append(block)
            elif tag == "picture":
                img = child.find("img")
                block = self.image(img) if img else None
                if block is not None and hoisted is not None:
                    hoisted.append(block)
            elif tag in ("video", "audio", "iframe", "embed", "object"):
                if hoisted is not None:
                    hoisted.extend(self.block(child))
            else:
                inner = dict(marks)
                if tag in ("strong", "b"):
                    inner["bold"] = True
                elif tag in ("em", "i", "cite", "dfn", "var"):
                    inner["italic"] = True
                elif tag in ("code", "kbd", "samp", "tt"):
                    inner["code"] = True
                elif tag in ("del", "s", "strike"):
                    inner["strike"] = True
                elif tag == "sup":
                    inner["sup"] = True
                elif tag == "sub":
                    inner["sub"] = True
                elif tag == "a":
                    raw = child.attrs.get("href", "")
                    href = safe_href(raw)
                    if href:
                        inner["href"] = href
                    elif raw:
                        self.result.warn("LINK_UNSAFE_REMOVED", "A link with an unsafe or unsupported address was not carried over: %s" % raw[:80],
                                         "Check the link in the source document; its text was kept without the link.")
                if tag == "q":
                    out.append(model.text("“", **marks))
                out.extend(self.inlines(child, inner, hoisted, pre))
                if tag == "q":
                    out.append(model.text("”", **marks))
        return out

    # ------------------------------------------------------------ media
    def image(self, node):
        src = node.attrs.get("src") or node.attrs.get("data-src") or ""
        if not src and node.attrs.get("srcset"):
            src = node.attrs["srcset"].split(",")[0].strip().split(" ")[0]
        if not src:
            return None
        alt = node.attrs.get("alt")
        if src.startswith("data:"):
            ref = self.data_uri(src)
            if ref is None:
                return None
        else:
            ref = media_ref(src)
        block = model.media(ref, alt=alt, title=node.attrs.get("title") or None, media_kind=kind_from_target(src) or "image",
                            width=_int(node.attrs.get("width")), height=_int(node.attrs.get("height")))
        return block

    def data_uri(self, uri):
        m = re.match(r"data:(image/[a-z0-9.+-]+)?(;charset=[^;,]+)?(;base64)?,(.*)$", uri, re.I | re.S)
        if not m or not m.group(1):
            self.result.warn("EMBEDDED_DATA_UNSUPPORTED", "An inline data: resource that is not an image was skipped.",
                             "Supply the resource as a separate file.")
            return None
        try:
            data = base64.b64decode(m.group(4), validate=False) if m.group(3) else unquote_to_bytes(m.group(4))
        except (binascii.Error, ValueError):
            self.result.warn("EMBEDDED_IMAGE_CORRUPT", "An inline base64 image could not be decoded.", "Supply the image as a separate file.")
            return None
        ext = {"image/jpeg": "jpg", "image/svg+xml": "svg"}.get(m.group(1).lower(), m.group(1).split("/")[1].lower())
        key = self.result.add_embedded(data, "inline-image-%d.%s" % (len(self.result.embedded) + 1, ext))
        return {"kind": "embedded", "key": key}

    def player(self, node, kind):
        src = node.attrs.get("src") or ""
        sources = [s.attrs.get("src", "") for s in node.find_all("source") if s.attrs.get("src")]
        if not src and sources:
            src = sources[0]
        if not src:
            return []
        block = model.media(media_ref(src), title=node.attrs.get("title") or node.attrs.get("aria-label") or None, media_kind=kind,
                            width=_int(node.attrs.get("width")), height=_int(node.attrs.get("height")))
        if len(sources) > 1:
            block["alternates"] = [media_ref(s) for s in sources if s != src]
        if node.attrs.get("poster"):
            block["poster"] = media_ref(node.attrs["poster"])
        tracks = []
        for track in node.find_all("track"):
            if track.attrs.get("src"):
                tracks.append({"ref": media_ref(track.attrs["src"]), "kind": track.attrs.get("kind", "subtitles"),
                               "lang": track.attrs.get("srclang") or None, "label": track.attrs.get("label") or None})
        if tracks:
            block["tracks"] = tracks
        return [block]

    def frame(self, node):
        src = node.attrs.get("src") or node.attrs.get("data") or node.attrs.get("data-src") or ""
        provider = model.video_provider(src)
        if provider:
            url = ("https:" + src) if src.startswith("//") else src
            return [{"type": "embed", "provider": provider[0], "mediaId": provider[1], "url": url, "title": node.attrs.get("title") or None}]
        kind = kind_from_target(src)
        if kind:
            return [model.media(media_ref(src), media_kind=kind)]
        if src:
            self.result.warn("EMBED_UNSUPPORTED", "An embedded frame from an unrecognised source was not carried over: %s" % src[:100],
                             "If this embed is needed, supply the media as a file or a link to a supported video host.")
        return []

    # ------------------------------------------------------------ blocks
    def flow(self, node):
        """Blocks from mixed content: loose inline runs become paragraphs."""
        blocks, run = [], Node("#run")

        def flush():
            if run.children:
                hoisted = []
                inl = model.trim_inlines(self.inlines(run, hoisted=hoisted))
                if inl:
                    blocks.append(model.paragraph(inl))
                blocks.extend(hoisted)
                run.children = []

        for child in node.children:
            if isinstance(child, str) or child.tag in INLINE:
                run.children.append(child)
            else:
                flush()
                blocks.extend(self.block(child))
        flush()
        return blocks

    def block(self, node):
        tag = node.tag
        if tag in DROP:
            self.dropped[tag] = self.dropped.get(tag, 0) + 1
            return []
        if tag in CHROME:
            self.dropped[tag] = self.dropped.get(tag, 0) + 1
            return []
        if re.fullmatch(r"h[1-6]", tag):
            hoisted = []
            inl = self.inlines(node, hoisted=hoisted)
            return ([model.heading(int(tag[1]), inl)] if model.plain(inl).strip() else []) + hoisted
        if tag == "p":
            hoisted = []
            inl = model.trim_inlines(self.inlines(node, hoisted=hoisted))
            return ([model.paragraph(inl)] if inl else []) + hoisted
        if tag in ("ul", "ol"):
            return [self.list(node)]
        if tag == "table":
            return self.table(node)
        if tag == "blockquote":
            inner = self.flow(node)
            return [{"type": "blockquote", "blocks": inner}] if inner else []
        if tag == "pre":
            code = node.find("code")
            classes = " ".join([node.attrs.get("class", ""), code.attrs.get("class", "") if code else ""])
            lang = _LANG.search(classes)
            raw = model.plain(self.inlines(node, pre=True)).replace("\r\n", "\n")
            if raw.startswith("\n"):
                raw = raw[1:]
            return [{"type": "code", "language": lang.group(1) if lang else None, "text": raw.rstrip("\n")}]
        if tag == "img":
            block = self.image(node)
            return [block] if block else []
        if tag == "picture":
            img = node.find("img")
            block = self.image(img) if img else None
            return [block] if block else []
        if tag == "video":
            return self.player(node, "video")
        if tag == "audio":
            return self.player(node, "audio")
        if tag in ("iframe", "embed", "object"):
            return self.frame(node)
        if tag == "hr":
            return [{"type": "rule"}]
        if tag == "figure":
            caption_node = next((c for c in node.children if isinstance(c, Node) and c.tag == "figcaption"), None)
            caption = model.trim_inlines(self.inlines(caption_node)) if caption_node else None
            body = Node("#figure")
            body.children = [c for c in node.children if c is not caption_node]
            blocks = self.flow(body)
            if caption:
                target = next((b for b in blocks if b["type"] in ("media", "table", "embed", "chart")), None)
                if target is not None:
                    target["caption"] = caption
                else:
                    blocks.append(model.paragraph(caption, style="caption"))
            return blocks
        if tag == "dl":
            out = []
            for child in node.children:
                if isinstance(child, Node) and child.tag in ("dt", "dd"):
                    inl = model.trim_inlines(self.inlines(child, {"bold": True} if child.tag == "dt" else None))
                    if inl:
                        out.append(model.paragraph(inl))
            return out
        if tag == "summary":
            inl = model.trim_inlines(self.inlines(node, {"bold": True}))
            return [model.paragraph(inl)] if inl else []
        if tag in ("head", "title"):
            return []
        return self.flow(node)

    def list(self, node):
        items = []
        for child in node.children:
            if not isinstance(child, Node):
                continue
            if child.tag in ("ul", "ol") and items:        # malformed nesting: list directly inside a list
                items[-1]["children"].append(self.list(child))
                continue
            if child.tag != "li":
                continue
            head, children = Node("#li"), []
            for part in child.children:
                if isinstance(part, Node) and part.tag in ("ul", "ol"):
                    children.append(self.list(part))
                elif isinstance(part, Node) and part.tag not in INLINE:
                    inner = self.block(part)
                    for b in inner:
                        if b["type"] == "paragraph":
                            if head.children:
                                head.children.append(Node("br"))
                            head.children.append(_Inlined(b["inlines"]))
                        else:
                            children.append(b)
                else:
                    head.children.append(part)
            hoisted = []
            inl = model.trim_inlines(self._inlines_with_prebuilt(head, hoisted))
            items.append({"inlines": inl, "children": children + hoisted})
        start = _int(node.attrs.get("start")) if node.tag == "ol" else None
        block = {"type": "list", "ordered": node.tag == "ol", "items": items}
        if node.tag == "ol":
            block["start"] = start if start is not None else 1
        return block

    def _inlines_with_prebuilt(self, node, hoisted):
        out, run = [], Node("#run")
        for child in node.children:
            if isinstance(child, _Inlined):
                out.extend(self.inlines(run, hoisted=hoisted))
                run = Node("#run")
                out.extend(child.inlines)
            else:
                run.children.append(child)
        out.extend(self.inlines(run, hoisted=hoisted))
        return out

    def table(self, node):
        caption_node = next((c for c in node.children if isinstance(c, Node) and c.tag == "caption"), None)
        rows, header_rows, after = [], 0, []
        in_head = True
        for tr in node.find_all("tr"):
            if _closest(tr, "table") is not node:
                continue
            cells, all_th = [], True
            for cell in tr.children:
                if not isinstance(cell, Node) or cell.tag not in ("td", "th"):
                    continue
                if cell.tag == "td":
                    all_th = False
                hoisted = []
                inl = model.trim_inlines(self._cell_inlines(cell, hoisted))
                after.extend(hoisted)
                entry = {"inlines": inl}
                span = _int(cell.attrs.get("colspan"))
                if span and span > 1:
                    entry["colspan"] = span
                span = _int(cell.attrs.get("rowspan"))
                if span and span > 1:
                    entry["rowspan"] = span
                if cell.tag == "th" and cell.attrs.get("scope") == "row" or (cell.tag == "th" and not all_th):
                    entry["header"] = True
                cells.append(entry)
            if not cells:
                continue
            in_thead = _closest(tr, "thead") is not None
            if in_head and (in_thead or (all_th and not rows)):
                header_rows += 1
            else:
                in_head = False
            rows.append(cells)
        if not rows:
            return []
        block = {"type": "table", "headerRows": header_rows, "rows": rows}
        if caption_node is not None:
            caption = model.trim_inlines(self.inlines(caption_node))
            if caption:
                block["caption"] = caption
        return [block] + after

    def _cell_inlines(self, cell, hoisted):
        out = []
        for i, block in enumerate(self.flow(cell)):
            if block["type"] == "paragraph":
                if out:
                    out.append({"t": "break"})
                out.extend(block["inlines"])
            elif block["type"] == "list":
                for item in block["items"]:
                    if out:
                        out.append({"t": "break"})
                    out.append(model.text("• "))
                    out.extend(item["inlines"])
            elif block["type"] in ("media", "embed"):
                hoisted.append(block)
            else:
                value = model.block_text(block)
                if value:
                    if out:
                        out.append({"t": "break"})
                    out.append(model.text(value))
        return out


class _Inlined:
    """Already-converted inlines travelling through a child list."""
    tag = "#inlined"

    def __init__(self, inlines):
        self.inlines = inlines


def _closest(node, tag):
    probe = node.parent
    while probe is not None:
        if probe.tag == tag:
            return probe
        probe = probe.parent
    return None


def _int(value):
    try:
        number = int(float(str(value).strip().rstrip("px")))
        return number if number > 0 else None
    except (TypeError, ValueError):
        return None


def fragment_blocks(source, result):
    """Blocks for an HTML fragment embedded in another format (Markdown, feeds)."""
    converter = Converter(result)
    blocks = converter.flow(parse_dom(source))
    _report_dropped(converter, result)
    return blocks


def _report_dropped(converter, result):
    if converter.dropped:
        listing = ", ".join("%d <%s>" % (n, tag) for tag, n in sorted(converter.dropped.items()))
        result.warn("HTML_ELEMENTS_NOT_CARRIED", "Markup that is not blog content was left out: %s." % listing,
                    "No action if these were page chrome, scripts or forms. If any carried blog content, supply it as text or media.", severity="info")


def decode(data):
    for bom, enc in ((b"\xef\xbb\xbf", "utf-8-sig"), (b"\xff\xfe", "utf-16"), (b"\xfe\xff", "utf-16")):
        if data.startswith(bom):
            return data.decode(enc, "replace")
    m = re.search(rb"<meta[^>]+charset\s*=\s*[\"']?\s*([A-Za-z0-9_-]+)", data[:4096], re.I)
    for enc in ([m.group(1).decode("ascii")] if m else []) + ["utf-8", "cp1252"]:
        try:
            return data.decode(enc)
        except (UnicodeDecodeError, LookupError):
            continue
    return data.decode("utf-8", "replace")


def extract(path, ctx):
    result = model.DocResult("html")
    with open(path, "rb") as fh:
        source = decode(fh.read())
    dom = parse_dom(source)
    html = dom.find("html")
    if html is not None and html.attrs.get("lang"):
        result.set_meta("lang", html.attrs["lang"], "html lang attribute")
    head = dom.find("head")
    if head is not None:
        for meta in head.find_all("meta"):
            name = (meta.attrs.get("name") or meta.attrs.get("property") or "").lower()
            content = (meta.attrs.get("content") or "").strip()
            if not content:
                continue
            if name == "description":
                result.set_meta("description", content, "meta description")
            elif name == "keywords":
                result.set_meta("keywords", [k.strip() for k in content.split(",") if k.strip()], "meta keywords")
            elif name in ("author", "article:author"):
                result.set_meta("author", content, "meta %s" % name)
            elif name in ("article:published_time", "date", "dc.date"):
                result.set_meta("date", content, "meta %s" % name)
            elif name == "og:image":
                result.set_meta("cover", content, "meta og:image")
        for link in head.find_all("link"):
            if "canonical" in (link.attrs.get("rel") or "").lower() and link.attrs.get("href"):
                result.set_meta("canonical", link.attrs["href"], "link rel=canonical")
        title = head.find("title")
        if title is not None:
            value = _WS.sub(" ", "".join(c for c in title.children if isinstance(c, str))).strip()
            result.set_meta("documentTitle", value, "html <title>")
    scope = dom.find("article") or dom.find("main") or dom.find("body") or dom
    converter = Converter(result)
    result.blocks = converter.flow(scope)
    _report_dropped(converter, result)
    return result
