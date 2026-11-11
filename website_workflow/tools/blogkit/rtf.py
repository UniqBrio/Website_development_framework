"""RTF → blocks. A small tokenizer and state machine over the control words that
carry structure: stylesheet headings, lists, tables, hyperlink fields, pictures,
footnotes. Everything else in the file is formatting and is ignored.
"""
import binascii
import re

from . import model
from .ooxml import MONO
from .safety import safe_href

_TOKEN = re.compile(rb"\\([a-zA-Z]+)(-?\d+)? ?|\\'([0-9a-fA-F]{2})|\\([^a-zA-Z0-9])|([{}])|([^\\{}]+)", re.S)
SKIP_DESTS = {"colortbl", "fonttbl", "stylesheet", "info", "header", "headerl", "headerr", "headerf", "footer", "footerl", "footerr", "footerf",
              "listtable", "listoverridetable", "generator", "rsidtbl", "themedata", "colorschememapping", "latentstyles", "datastore", "xmlnstbl",
              "mmathPr", "pgdsctbl", "nonshppict", "object", "objdata", "comment", "annotation", "atnid", "atnauthor", "bkmkstart", "bkmkend",
              "revtbl", "wgrffmtfilter", "panose", "falt", "pnseclvl", "operator", "company", "template", "shpinst", "sp", "sn", "sv", "xe", "tc", "ftnsep",
              "ftnsepc", "aftnsep", "aftnsepc", "listname", "liststylename", "pgptbl", "defchp", "defpap", "pict_skip", "docvar", "userprops", "filetbl"}
CHARS = {"emdash": "\u2014", "endash": "\u2013", "bullet": "\u2022", "lquote": "\u2018", "rquote": "\u2019", "ldblquote": "\u201c",
         "rdblquote": "\u201d", "emspace": " ", "enspace": " ", "qmspace": " ", "tab": " ", "cell_": ""}
PICT_TYPES = {"pngblip": "png", "jpegblip": "jpg", "emfblip": "emf", "wmetafile": "wmf", "dibitmap": "bmp", "wbitmap": "bmp"}


class State:
    __slots__ = ("bold", "italic", "strike", "sup", "sub", "font", "dest", "uc", "href", "hidden", "cs")

    def __init__(self):
        self.bold = self.italic = self.strike = self.sup = self.sub = False
        self.font, self.dest, self.uc, self.href, self.hidden, self.cs = None, None, 1, None, False, None

    def copy(self):
        other = State()
        for name in State.__slots__:
            setattr(other, name, getattr(self, name))
        return other


class Rtf:
    def __init__(self, data, result):
        self.data, self.result = data, result
        self.codec = "cp1252"
        self.fonts, self.styles = {}, {}
        self.blocks, self.footnotes = [], []
        self.reset_paragraph()
        self.inlines = []
        self.row, self.cell, self.table_rows = [], [], []
        self.open_lists = []
        self.unsupported_pictures = 0

    def reset_paragraph(self):
        self.pstyle, self.outline, self.in_table, self.list_text, self.ls, self.ilvl = None, None, False, None, None, 0

    # ------------------------------------------------ helpers
    def marks(self, st):
        out = {}
        if st.bold:
            out["bold"] = True
        if st.italic:
            out["italic"] = True
        if st.strike:
            out["strike"] = True
        if st.sup:
            out["sup"] = True
        if st.sub:
            out["sub"] = True
        if st.font is not None and self.fonts.get(st.font):
            out["code"] = True
        if st.href:
            out["href"] = st.href
        return out

    def emit(self, text_value, st, target=None):
        if st.hidden or not text_value:
            return
        (self.inlines if target is None else target).append(model.text(text_value, **self.marks(st)))

    def style_kind(self):
        name = (self.styles.get(self.pstyle) or "").lower()
        m = re.match(r"heading (\d)", name)
        if m:
            return "heading", int(m.group(1))
        if self.outline is not None and self.outline < 9:
            return "heading", min(6, self.outline + 1)
        if name == "title":
            return "title", None
        if name == "subtitle":
            return "subtitle", None
        if name == "caption":
            return "caption", None
        if name in ("quote", "intense quote", "quotations", "block text"):
            return "quote", None
        if re.search(r"\bcode\b|preformatted|source text", name):
            return "code", None
        return None, None

    def end_paragraph(self, extras):
        inlines, self.inlines = self.inlines, []
        kind, level = self.style_kind()
        if kind in ("heading", "title", "subtitle", "caption", "quote"):
            for run in inlines:                       # these styles are bold/italic by definition, not by emphasis
                if kind != "quote":
                    run.pop("bold", None)
                if kind != "heading":
                    run.pop("italic", None)
        inl = model.trim_inlines(inlines)
        has_text = bool(model.plain(inl).strip()) or any(i.get("t") == "fnref" for i in inl)
        if self.in_table:
            if has_text:
                if self.cell:
                    self.cell.append({"t": "break"})
                self.cell.extend(inl)
            self.pending_cell_media.extend(extras)
            return
        self.flush_table()
        if not has_text:
            if extras:
                self.open_lists = []
                self.blocks.extend(extras)
            return
        is_list = self.list_text is not None or (self.ls is not None and kind not in ("heading", "title", "subtitle"))
        if is_list:
            marker = (self.list_text or "").strip()
            ordered = bool(re.match(r"^\(?[0-9A-Za-z]{1,4}[.)]", marker)) and not re.match(r"^o$", marker)
            level_no = self.ilvl
            while self.open_lists and self.open_lists[-1][0] > level_no:
                self.open_lists.pop()
            if not self.open_lists or self.open_lists[-1][0] < level_no:
                new = {"type": "list", "ordered": ordered, "items": []}
                if ordered:
                    m = re.match(r"^\(?(\d+)", marker)
                    new["start"] = int(m.group(1)) if m else 1
                if self.open_lists and self.open_lists[-1][1]["items"]:
                    self.open_lists[-1][1]["items"][-1]["children"].append(new)
                else:
                    self.blocks.append(new)
                self.open_lists.append((level_no, new))
            elif self.open_lists[-1][1]["ordered"] != ordered and len(self.open_lists) == 1:
                new = {"type": "list", "ordered": ordered, "items": []}
                if ordered:
                    new["start"] = 1
                self.blocks.append(new)
                self.open_lists = [(level_no, new)]
            self.open_lists[-1][1]["items"].append({"inlines": inl, "children": list(extras)})
            return
        self.open_lists = []
        if kind == "heading":
            self.blocks.append(model.heading(level, inl))
        elif kind == "code":
            if self.blocks and self.blocks[-1]["type"] == "code" and self.blocks[-1].get("_open"):
                self.blocks[-1]["text"] += "\n" + model.plain(inl)
            else:
                self.blocks.append({"type": "code", "language": None, "text": model.plain(inl), "_open": True})
        elif kind == "quote":
            if self.blocks and self.blocks[-1]["type"] == "blockquote" and self.blocks[-1].get("_open"):
                self.blocks[-1]["blocks"].append(model.paragraph(inl))
            else:
                self.blocks.append({"type": "blockquote", "blocks": [model.paragraph(inl)], "_open": True})
        else:
            self.blocks.append(model.paragraph(inl, style=kind if kind in ("title", "subtitle", "caption") else None))
        if kind not in ("code", "quote"):
            for block in self.blocks[-3:]:
                block.pop("_open", None) if block is not self.blocks[-1] else None
        self.blocks.extend(extras)

    def flush_table(self):
        if self.table_rows:
            self.open_lists = []
            self.blocks.append({"type": "table", "headerRows": self.header_rows, "rows": self.table_rows})
            self.blocks.extend(self.table_media)
            self.table_rows, self.table_media, self.header_rows = [], [], 0

    # ------------------------------------------------ main loop
    def parse(self):
        self.pending_cell_media, self.table_media, self.header_rows = [], [], 0
        row_is_header = False
        stack, st = [], State()
        extras = []                       # media seen in the current paragraph
        skip_fallback = 0
        dest_text = None                  # buffer for fonttbl/stylesheet/info/listtext/fldinst capture
        capture = []                      # stack of (kind, depth, buffer/meta)
        pos, data, depth = 0, self.data, 0
        pict = None
        note = None                       # (depth, saved inlines) while inside a footnote

        for m in _TOKEN.finditer(data):
            word, param, hexbyte, symbol, brace, raw = m.groups()
            if brace == b"{":
                stack.append(st)
                st = st.copy()
                depth += 1
                continue
            if brace == b"}":
                # close captures that end with this group
                while capture and capture[-1][1] == depth:
                    kind, _, buf = capture.pop()
                    value = "".join(buf.get("text", [])) if isinstance(buf, dict) else ""
                    if kind == "font":
                        name = value.rstrip(";").strip()
                        if buf.get("id") is not None:
                            self.fonts[buf["id"]] = bool(buf.get("modern") or MONO.search(name))
                    elif kind == "style":
                        if buf.get("id") is not None:
                            self.styles[buf["id"]] = value.rstrip(";").strip()
                    elif kind in ("title", "author"):
                        if value.strip():
                            self.result.notes["documentTitle" if kind == "title" else "documentAuthor"] = value.strip()
                    elif kind == "listtext":
                        self.list_text = value
                    elif kind == "fldinst":
                        hit = re.search(r'HYPERLINK\s+(\\l\s+)?"([^"]+)"', value)
                        self.field_href = safe_href(hit.group(2)) if hit and not hit.group(1) else None
                    elif kind == "pict":
                        self.finish_picture(buf, extras)
                    elif kind == "footnote":
                        note_inl, self.inlines = model.trim_inlines(self.inlines), buf["saved"]
                        note_id = "fn%d" % (len(self.footnotes) + 1)
                        self.footnotes.append({"id": note_id, "inlines": note_inl})
                        self.inlines.append({"t": "fnref", "id": note_id})
                st = stack.pop() if stack else State()
                depth -= 1
                continue
            top = capture[-1] if capture else None
            if hexbyte is not None or raw is not None or (symbol is not None and symbol not in (b"*",)):
                if skip_fallback and (hexbyte is not None or raw is not None):
                    if hexbyte is not None:
                        skip_fallback -= 1
                        continue
                    chunk = raw.replace(b"\r", b"").replace(b"\n", b"")
                    drop = min(skip_fallback, len(chunk))
                    skip_fallback -= drop
                    raw = chunk[drop:]
                    if not raw:
                        continue
                if hexbyte is not None:
                    value = bytes([int(hexbyte, 16)]).decode(self.codec, "replace")
                elif symbol is not None:
                    value = {b"~": "\u00a0", b"-": "", b"_": "\u2011", b"\n": "\n", b"\r": "\n"}.get(symbol, symbol.decode("latin-1"))
                    if value == "\n":
                        if not st.dest:
                            extras = self._par(extras)
                        continue
                else:
                    value = raw.replace(b"\r", b"").replace(b"\n", b"").decode(self.codec, "replace")
                if top and top[0] == "pict":
                    top[2]["hex"].append(raw if raw is not None else b"")
                elif top and isinstance(top[2], dict) and "text" in top[2] and top[0] != "footnote":
                    top[2]["text"].append(value)
                elif not st.dest:
                    self.emit(value, st)
                continue
            if symbol == b"*":
                st.dest = st.dest or "*pending"
                continue
            name = word.decode("ascii")
            n = int(param) if param is not None else None
            if st.dest == "*pending":
                st.dest = None if name in ("fldinst", "shppict", "listtext", "pn", "pntext", "footnote", "bkmkstart_", "txfieldtext") else name
                if name == "fldinst":
                    capture.append(("fldinst", depth, {"text": []}))
                    st.dest = "fldinst"
                    continue
                if st.dest:
                    continue
            if name in SKIP_DESTS and name not in ("fonttbl", "stylesheet", "info"):
                st.dest = name
                continue
            if name == "fonttbl":
                st.dest = "fonttbl"
                continue
            if name == "stylesheet":
                st.dest = "stylesheet"
                continue
            if name == "info":
                st.dest = "info"
                continue
            if st.dest == "fonttbl":
                if name == "f" and n is not None:
                    capture.append(("font", depth, {"text": [], "id": n}))
                elif name == "fmodern" and capture and capture[-1][0] == "font":
                    capture[-1][2]["modern"] = True
                continue
            if st.dest == "stylesheet":
                if name == "s" and n is not None:
                    capture.append(("style", depth, {"text": [], "id": n}))
                elif not (capture and capture[-1][0] == "style" and capture[-1][1] == depth):
                    if name in ("cs", "ds", "ts") and n is not None:
                        capture.append(("otherstyle", depth, {"text": []}))
                    elif depth and not capture:
                        capture.append(("style", depth, {"text": [], "id": 0}))
                continue
            if st.dest == "info":
                if name in ("title", "author"):
                    capture.append((name, depth, {"text": []}))
                else:
                    st.dest = "info-skip" if name not in ("title", "author") and not capture else st.dest
                continue
            if st.dest and st.dest not in ("fldinst",):
                if name == "bin" and n:
                    pass
                continue
            if name == "u" and n is not None:
                code = n + 65536 if n < 0 else n
                value = chr(code) if code < 0x110000 else "\ufffd"
                if top and isinstance(top[2], dict) and "text" in top[2] and top[0] not in ("footnote", "pict"):
                    top[2]["text"].append(value)
                else:
                    self.emit(value, st)
                skip_fallback = st.uc
            elif name == "uc":
                st.uc = n if n is not None else 1
            elif name == "ansicpg" and n:
                try:
                    b"".decode("cp%d" % n)
                    self.codec = "cp%d" % n
                except LookupError:
                    pass
            elif name in ("par", "sect"):
                extras = self._par(extras)
            elif name == "pard":
                self.reset_paragraph()
            elif name == "plain":
                href, hidden = st.href, False
                st.bold = st.italic = st.strike = st.sup = st.sub = False
                st.font, st.hidden, st.href = None, hidden, href
            elif name == "b":
                st.bold = n != 0
            elif name == "i":
                st.italic = n != 0
            elif name in ("strike", "striked"):
                st.strike = n != 0
            elif name == "super":
                st.sup, st.sub = True, False
            elif name == "sub":
                st.sub, st.sup = True, False
            elif name == "nosupersub":
                st.sup = st.sub = False
            elif name == "v":
                st.hidden = n != 0
            elif name == "f" and n is not None:
                st.font = n
            elif name == "s" and n is not None:
                self.pstyle = n
            elif name == "outlinelevel" and n is not None:
                self.outline = n
            elif name == "ls" and n is not None:
                self.ls = n
            elif name == "ilvl" and n is not None:
                self.ilvl = n
            elif name in ("listtext", "pntext"):
                capture.append(("listtext", depth, {"text": []}))
            elif name == "intbl":
                self.in_table = True
            elif name == "trowd":
                row_is_header = False
            elif name == "trhdr":
                row_is_header = True
            elif name == "cell":
                extras = self._par(extras, force_table=True)
                self.row.append({"inlines": self.cell})
                self.cell = []
                self.table_media.extend(self.pending_cell_media)
                self.pending_cell_media = []
            elif name == "row":
                if self.row:
                    if row_is_header and len(self.table_rows) == self.header_rows:
                        self.header_rows += 1
                    self.table_rows.append(self.row)
                self.row = []
                self.in_table = False
            elif name == "line":
                self.inlines.append({"t": "break"})
            elif name in CHARS:
                self.emit(CHARS[name], st)
            elif name == "field":
                self.field_href = None
            elif name == "fldrslt":
                st.href = getattr(self, "field_href", None)
            elif name == "pict":
                capture.append(("pict", depth, {"hex": [], "type": None, "w": None, "h": None}))
            elif name in PICT_TYPES and capture and capture[-1][0] == "pict":
                capture[-1][2]["type"] = PICT_TYPES[name]
            elif name in ("picwgoal", "pichgoal") and capture and capture[-1][0] == "pict" and n:
                capture[-1][2]["w" if name == "picwgoal" else "h"] = round(n / 15)
            elif name == "footnote":
                capture.append(("footnote", depth, {"saved": self.inlines}))
                self.inlines = []
            elif name == "chftn":
                pass
        self._par(extras)
        self.flush_table()
        for block in self.blocks:
            block.pop("_open", None)
        if self.footnotes:
            self.blocks.append({"type": "footnotes", "items": self.footnotes})
        if self.unsupported_pictures:
            self.result.warn("IMAGE_FORMAT_UNSUPPORTED", "%d picture(s) in the document are stored in a format that could not be read." % self.unsupported_pictures,
                             "Supply these pictures as PNG, JPEG, WebP or SVG files with a placement instruction.")
        return self.blocks

    def _par(self, extras, force_table=False):
        if force_table:
            self.in_table = True
        self.end_paragraph(extras)
        self.list_text = None
        return []

    def finish_picture(self, buf, extras):
        kind = buf["type"]
        hexdata = re.sub(rb"[^0-9a-fA-F]", b"", b"".join(buf["hex"]))
        if not kind or not hexdata:
            self.unsupported_pictures += 1
            return
        try:
            data = binascii.unhexlify(hexdata[: len(hexdata) // 2 * 2])
        except (binascii.Error, ValueError):
            self.unsupported_pictures += 1
            return
        key = self.result.add_embedded(data, "rtf-image-%d.%s" % (len(self.result.embedded) + 1, kind))
        extras.append(model.media({"kind": "embedded", "key": key}, width=buf["w"], height=buf["h"]))


def extract(path, ctx):
    result = model.DocResult("rtf (control-word parser)")
    with open(path, "rb") as fh:
        data = fh.read()
    if not data.lstrip().startswith(b"{\\rtf"):
        result.fail("DOCUMENT_CORRUPT", "This file does not start like an RTF document.", "Re-save it as RTF or DOCX from the source application and upload again.")
        return result
    try:
        result.blocks = Rtf(data, result).parse()
    except Exception as error:                      # a malformed file must not stop the other documents
        result.fail("DOCUMENT_CORRUPT", "The RTF document could not be parsed (%s)." % type(error).__name__, "Re-save it as DOCX from the source application and upload again.")
    return result
