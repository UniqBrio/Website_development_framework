"""PDF → blocks, from poppler's positioned-text XML (`pdftohtml -xml`).

A PDF stores glyph positions, not structure, so structure here is RECONSTRUCTED:
headings from the document outline or font size, paragraphs from line spacing,
tables from column alignment. Every reconstruction is reported so the preview is
checked against the source. Scanned pages need OCR; without it they are flagged,
never guessed.
"""
import os
import re
import statistics
import subprocess
import xml.etree.ElementTree as ET

from . import capabilities, model
from .ooxml import MONO
from .safety import safe_href

BULLET = re.compile(r"^\s*([•·◦▪●○‣⁃∙➢✓✔-]|[-–—*]|o)\s+(?=\S)")
NUMBERED = re.compile(r"^\s*(\(?(?:\d{1,3}|[a-zA-Z]|[ivxIVX]{1,5})[.)])\s+(?=\S)")
TERMINAL = re.compile(r"[.!?:;…\"”')\]]\s*$")


class Fragment:
    __slots__ = ("top", "left", "width", "height", "size", "mono", "inlines", "page")

    @property
    def right(self):
        return self.left + self.width

    @property
    def text(self):
        return model.plain(self.inlines)


class Line:
    def __init__(self, fragments):
        self.fragments = sorted(fragments, key=lambda f: f.left)
        self.top = min(f.top for f in self.fragments)
        self.bottom = max(f.top + f.height for f in self.fragments)
        self.left = self.fragments[0].left
        self.right = max(f.right for f in self.fragments)
        self.size = max(self.fragments, key=lambda f: len(f.text)).size
        self.page = self.fragments[0].page
        self.mono = all(f.mono for f in self.fragments if f.text.strip())

    def segments(self):
        """Fragments grouped into cells: a wide horizontal gap separates cells."""
        groups, current = [], [self.fragments[0]]
        for prev, frag in zip(self.fragments, self.fragments[1:]):
            if frag.left - prev.right > max(14.0, 1.6 * self.size):
                groups.append(current)
                current = [frag]
            else:
                current.append(frag)
        groups.append(current)
        return groups

    @staticmethod
    def join(fragments):
        out = []
        for i, frag in enumerate(fragments):
            if i:
                prev = fragments[i - 1]
                gap = frag.left - prev.right
                if gap > 0.18 * frag.size and not prev.text.endswith((" ", " ")) and not frag.text.startswith(" "):
                    out.append(model.text(" "))
            out.extend(dict(r) for r in frag.inlines)
        return model.merge_inlines(out)

    def inlines(self):
        return self.join(self.fragments)

    @property
    def text(self):
        return model.plain(self.inlines())


def _run(cmd, timeout=300):
    try:
        return subprocess.run(cmd, capture_output=True, timeout=timeout)
    except (OSError, subprocess.SubprocessError) as error:
        class Failed:
            returncode, stdout, stderr = 1, b"", str(error).encode()
        return Failed()


def _inlines(node, marks, result):
    out = []
    if node.text:
        out.append(model.text(node.text, **marks))
    for child in node:
        inner = dict(marks)
        if child.tag == "b":
            inner["bold"] = True
        elif child.tag == "i":
            inner["italic"] = True
        elif child.tag == "a":
            href = safe_href(child.get("href"))
            if href and not re.match(r"^[^/]*\.html?#", href):
                inner["href"] = href
        out.extend(_inlines(child, inner, result))
        if child.tail:
            out.append(model.text(child.tail, **marks))
    return out


def _norm(value):
    return re.sub(r"\W+", " ", value or "").strip().lower()


class Pdf:
    def __init__(self, path, ctx, result):
        self.path, self.ctx, self.result = path, ctx, result
        self.work = ctx.scratch("pdf")
        self.reconstructed_tables = self.hyphen_joins = 0
        self.columns_pages, self.furniture, self.scanned, self.ocr_pages = [], [], [], []

    # ------------------------------------------------ load
    def load(self):
        info = _run(["pdfinfo", self.path]) if capabilities.have("pdfinfo") else None
        facts = {}
        if info is not None and info.returncode == 0:
            for line in info.stdout.decode("utf-8", "replace").splitlines():
                key, _, value = line.partition(":")
                facts[key.strip()] = value.strip()
        elif info is not None:
            err = info.stderr.decode("utf-8", "replace")
            if "password" in err.lower() or "encrypt" in err.lower():
                self.result.fail("PDF_ENCRYPTED", "The PDF is password-protected and cannot be read.", "Supply an unprotected copy of the PDF.")
            else:
                self.result.fail("DOCUMENT_CORRUPT", "The PDF could not be read (%s)." % (err.strip().splitlines() or ["unknown error"])[-1][:160],
                                 "Re-export the PDF from its source and upload it again.")
            return None
        if facts.get("Encrypted", "no").startswith("yes") and "copy:no" in facts.get("Encrypted", "").replace(" ", ""):
            self.result.warn("PDF_COPY_RESTRICTED", "The PDF is marked as restricting content copying.", "Confirm you have the right to republish this content.")
        for key, note in (("Title", "documentTitle"), ("Author", "documentAuthor")):
            if facts.get(key):
                self.result.notes[note] = facts[key]
        if facts.get("Pages", "").isdigit():
            self.result.pages = int(facts["Pages"])
        prefix = os.path.join(self.work, "p")
        done = _run(["pdftohtml", "-xml", "-hidden", "-nodrm", "-zoom", "1", "-fmt", "png", self.path, prefix], timeout=600)
        xml_path = prefix + ".xml"
        if done.returncode != 0 or not os.path.exists(xml_path):
            err = done.stderr.decode("utf-8", "replace")
            if "password" in err.lower():
                self.result.fail("PDF_ENCRYPTED", "The PDF is password-protected and cannot be read.", "Supply an unprotected copy of the PDF.")
            else:
                self.result.fail("DOCUMENT_CORRUPT", "The PDF could not be read (%s)." % (err.strip().splitlines() or ["no output"])[-1][:160],
                                 "Re-export the PDF from its source and upload it again.")
            return None
        with open(xml_path, "rb") as fh:
            data = fh.read()
        data = re.sub(rb"[\x00-\x08\x0b\x0c\x0e-\x1f]", b"", data)
        try:
            return ET.fromstring(data)
        except ET.ParseError:
            self.result.fail("PDF_LAYOUT_UNREADABLE", "The PDF's text layout could not be parsed.", "Supply the source document (DOCX, Markdown) instead of the PDF.")
            return None

    # ------------------------------------------------ pages
    def read_pages(self, root):
        fonts, pages = {}, []
        for page in root.findall("page"):
            for spec in page.findall("fontspec"):
                fonts[spec.get("id")] = (float(spec.get("size", "0") or 0), spec.get("family", ""))
            number = int(page.get("number", str(len(pages) + 1)))
            width, height = float(page.get("width", "612")), float(page.get("height", "792"))
            fragments, images = [], []
            for node in page.findall("text"):
                inl = model.merge_inlines(_inlines(node, {}, self.result))
                if not model.plain(inl).strip():
                    continue
                frag = Fragment()
                frag.top, frag.left = float(node.get("top", "0")), float(node.get("left", "0"))
                frag.width, frag.height = float(node.get("width", "0")), float(node.get("height", "0"))
                size, family = fonts.get(node.get("font"), (frag.height * 0.8, ""))
                frag.size, frag.mono, frag.inlines, frag.page = size or frag.height * 0.8, bool(MONO.search(family)), inl, number
                if frag.mono:
                    for run in frag.inlines:
                        run.pop("bold", None)
                fragments.append(frag)
            for node in page.findall("image"):
                src = node.get("src", "")
                full = src if os.path.isabs(src) else os.path.join(os.path.dirname(self.work.rstrip(os.sep)), src) if not os.path.exists(src) else src
                if not os.path.exists(full):
                    full = os.path.join(self.work, os.path.basename(src))
                images.append({"top": float(node.get("top", "0")), "left": float(node.get("left", "0")), "width": float(node.get("width", "0")),
                               "height": float(node.get("height", "0")), "path": full, "page": number})
            pages.append({"number": number, "width": width, "height": height, "fragments": fragments, "images": images})
        return pages

    def outline(self, root):
        found = {}

        def walk(node, depth):
            for child in node:
                if child.tag == "item":
                    found.setdefault(_norm("".join(child.itertext())), depth)
                elif child.tag == "outline":
                    walk(child, depth + 1)

        top = root.find("outline")
        if top is not None:
            walk(top, 1)
        return found

    @staticmethod
    def lines_of(fragments):
        lines, current = [], []
        for frag in sorted(fragments, key=lambda f: (f.top + f.height / 2, f.left)):
            if current:
                ref = current[0]
                if abs((frag.top + frag.height / 2) - (ref.top + ref.height / 2)) <= 0.45 * max(frag.height, ref.height):
                    current.append(frag)
                    continue
                lines.append(Line(current))
            current = [frag]
        if current:
            lines.append(Line(current))
        return lines

    def column_split(self, page):
        """x of a central gutter when the page is set in two text columns, else None."""
        frags = [f for f in page["fragments"] if len(f.text.strip()) > 20]
        if len(frags) < 16:
            return None
        width = page["width"]
        for x in [width * (0.35 + 0.01 * i) for i in range(31)]:
            crossing = [f for f in frags if f.left < x - 2 < f.right - 2]
            left = [f for f in frags if f.right <= x]
            right = [f for f in frags if f.left >= x]
            if not crossing and len(left) >= 8 and len(right) >= 8 and statistics.mean(f.width for f in left) > 0.2 * width and statistics.mean(f.width for f in right) > 0.2 * width:
                return x
        return None

    def strip_furniture(self, pages):
        """Running headers, footers and page numbers: text repeated at one position on many pages."""
        if not pages:
            return
        seen = {}
        for page in pages:
            for frag in page["fragments"]:
                edge = frag.top < 0.09 * page["height"] or frag.top > 0.91 * page["height"]
                if edge:
                    key = (round(frag.top / 4), re.sub(r"\d+", "#", frag.text.strip()))
                    seen.setdefault(key, set()).add(page["number"])
        repeated = {key for key, where in seen.items() if len(where) >= max(2, min(3, len(pages)))}
        for page in pages:
            keep = []
            for frag in page["fragments"]:
                edge = frag.top < 0.09 * page["height"] or frag.top > 0.91 * page["height"]
                value = frag.text.strip()
                key = (round(frag.top / 4), re.sub(r"\d+", "#", value))
                lone_number = edge and re.fullmatch(r"(page\s+)?\d{1,4}(\s*(of|/)\s*\d{1,4})?", value, re.I)
                if edge and (key in repeated or lone_number):
                    if len(self.furniture) < 5 and value not in self.furniture:
                        self.furniture.append(value)
                    self.furniture_count = getattr(self, "furniture_count", 0) + 1
                    continue
                keep.append(frag)
            page["fragments"] = keep

    # ------------------------------------------------ OCR
    def ocr(self, page):
        number = page["number"]
        if not (capabilities.have("tesseract") and capabilities.have("pdftoppm")):
            return None
        prefix = os.path.join(self.work, "ocr-%d" % number)
        if _run(["pdftoppm", "-r", "200", "-f", str(number), "-l", str(number), "-png", "-singlefile", self.path, prefix]).returncode != 0:
            return None
        done = _run(["tesseract", prefix + ".png", "stdout", "--psm", "3", "tsv"], timeout=600)
        if done.returncode != 0:
            return None
        paragraphs, confidences, weak = {}, [], []
        for row in done.stdout.decode("utf-8", "replace").splitlines()[1:]:
            cols = row.split("\t")
            if len(cols) < 12 or cols[0] != "5" or not cols[11].strip():
                continue
            try:
                conf = float(cols[10])
            except ValueError:
                continue
            paragraphs.setdefault((int(cols[2]), int(cols[3])), []).append(cols[11])
            confidences.append(conf)
            if conf < 60 and len(weak) < 12:
                weak.append(cols[11])
        blocks = [model.paragraph([model.text(" ".join(words))]) for _, words in sorted(paragraphs.items()) if words]
        for block in blocks:
            block["sourcePage"] = number
            block["ocr"] = True
        return blocks, (statistics.mean(confidences) if confidences else 0.0), weak

    # ------------------------------------------------ structure
    def build(self, pages, outline):
        sizes = {}
        for page in pages:
            for frag in page["fragments"]:
                sizes[round(frag.size, 1)] = sizes.get(round(frag.size, 1), 0) + len(frag.text)
        body = max(sizes, key=sizes.get) if sizes else 11.0
        heading_sizes = sorted((s for s in sizes if s > body * 1.12), reverse=True)
        blocks, title_done = [], False
        first_lines = self.lines_of(pages[0]["fragments"])[:4] if pages else []
        title_size = max((l.size for l in first_lines), default=0)
        if title_size < body * 1.3 or sum(1 for p in pages for l in self.lines_of(p["fragments"]) if round(l.size, 1) == round(title_size, 1)) > 3:
            title_size = 0
        level_sizes = [s for s in heading_sizes if round(s, 1) != round(title_size, 1)] if title_size else heading_sizes
        open_para = None            # (block, last line)

        def close_para():
            nonlocal open_para
            open_para = None

        for page in pages:
            text_chars = sum(len(f.text.strip()) for f in page["fragments"])
            big = [im for im in page["images"] if im["width"] * im["height"] > 0.5 * page["width"] * page["height"]]
            if text_chars < 25 and big:
                self.scanned.append(page["number"])
                read = self.ocr(page)
                close_para()
                if read is None:
                    continue
                ocr_blocks, confidence, weak = read
                self.ocr_pages.append((page["number"], confidence, weak))
                blocks.extend(ocr_blocks)
                continue
            gutter = self.column_split(page)
            if gutter is not None:
                self.columns_pages.append(page["number"])
                spanning = [f for f in page["fragments"] if f.left < gutter < f.right]
                regions = [[f for f in page["fragments"] if f not in spanning and f.right <= gutter],
                           [f for f in page["fragments"] if f not in spanning and f.left >= gutter]]
                ordered = self.lines_of(spanning) + self.lines_of(regions[0]) + self.lines_of(regions[1])
                image_slots = sorted(page["images"], key=lambda im: (im["left"] >= gutter, im["top"]))
            else:
                ordered = self.lines_of(page["fragments"])
                image_slots = sorted(page["images"], key=lambda im: im["top"])
            items = [("line", l.top, l) for l in ordered]
            if gutter is None:
                items += [("image", im["top"], im) for im in image_slots]
                items.sort(key=lambda it: it[1])
            else:
                items += [("image", im["top"], im) for im in image_slots]
            pitch_samples = [b.top - a.top for a, b in zip(ordered, ordered[1:]) if 0 < b.top - a.top < 1.7 * max(a.size, 1)]
            pitch = statistics.median(pitch_samples) if pitch_samples else 1.25 * body
            col_right = max((l.right for l in ordered), default=page["width"])
            col_left = min((l.left for l in ordered), default=0)
            i = 0
            first_on_page = True
            while i < len(items):
                kind, _, obj = items[i]
                if kind == "image":
                    i += 1
                    if obj["width"] < 24 or obj["height"] < 24 or not os.path.exists(obj["path"]):
                        continue
                    close_para()
                    with open(obj["path"], "rb") as fh:
                        data = fh.read()
                    key = self.result.add_embedded(data, "page%d-%s" % (obj["page"], os.path.basename(obj["path"])))
                    block = model.media({"kind": "embedded", "key": key})
                    block["sourcePage"] = obj["page"]
                    blocks.append(block)
                    continue
                line = obj
                value = line.text.strip()
                # ---- table: consecutive lines whose cells share column positions
                segs = line.segments()
                if len(segs) >= 2 and not BULLET.match(value) and not NUMBERED.match(value):
                    rows, j = [segs], i + 1
                    lefts = [s[0].left for s in segs]
                    while j < len(items) and items[j][0] == "line":
                        nxt = items[j][2].segments()
                        nl = [s[0].left for s in nxt]
                        if len(nxt) >= 2 and all(any(abs(x - y) <= 8 for y in lefts) for x in nl):
                            rows.append(nxt)
                            j += 1
                        else:
                            break
                    if len(rows) >= 2:
                        close_para()
                        columns = sorted({round(s[0].left) for row in rows for s in row})
                        merged = []
                        for c in columns:
                            if not merged or c - merged[-1] > 8:
                                merged.append(c)
                        table_rows = []
                        for row in rows:
                            cells = [{"inlines": []} for _ in merged]
                            for seg in row:
                                index = min(range(len(merged)), key=lambda k: abs(merged[k] - seg[0].left))
                                if cells[index]["inlines"]:
                                    cells[index]["inlines"].append(model.text(" "))
                                cells[index]["inlines"].extend(model.trim_inlines(Line.join(seg)))
                            table_rows.append(cells)
                        blocks.append({"type": "table", "headerRows": 0, "rows": table_rows, "sourcePage": line.page, "reconstructed": True})
                        self.reconstructed_tables += 1
                        i = j
                        first_on_page = False
                        continue
                inl = model.trim_inlines(line.inlines())
                norm = _norm(value)
                level = None
                if norm in outline:
                    level = outline[norm]
                elif title_size and round(line.size, 1) == round(title_size, 1) and not title_done:
                    level = 0
                elif round(line.size, 1) in [round(s, 1) for s in level_sizes] and len(value) < 200:
                    level = min(6, [round(s, 1) for s in level_sizes].index(round(line.size, 1)) + 1)
                if level is not None:
                    for run in inl:
                        run.pop("bold", None)
                    prev = blocks[-1] if blocks else None
                    same = prev is not None and open_para is None and prev.get("_line") is not None and prev.get("_level") == level and line.top - prev["_line"].top < 2.2 * line.size and prev["_line"].page == line.page
                    if same:                               # a heading wrapped over two lines
                        prev["inlines"] = model.merge_inlines(prev["inlines"] + [model.text(" ")] + inl)
                        prev["_line"] = line
                    else:
                        close_para()
                        block = model.paragraph(inl, style="title") if level == 0 else model.heading(level, inl)
                        block.update(sourcePage=line.page, _line=line, _level=level)
                        blocks.append(block)
                        title_done = title_done or level == 0
                    i += 1
                    first_on_page = False
                    continue
                if line.mono and len(value) > 0:
                    indent = " " * max(0, round((line.left - col_left) / max(1.0, line.size * 0.6)))
                    prev = blocks[-1] if blocks else None
                    if prev is not None and prev["type"] == "code" and open_para is None and prev.get("_line") is not None and line.top - prev["_line"].top < 2.4 * pitch and prev["_line"].page == line.page:
                        gap_lines = max(1, round((line.top - prev["_line"].top) / pitch))
                        prev["text"] += "\n" * gap_lines + indent + line.text.rstrip()
                        prev["_line"] = line
                    else:
                        close_para()
                        blocks.append({"type": "code", "language": None, "text": indent + line.text.rstrip(), "sourcePage": line.page, "_line": line})
                    i += 1
                    first_on_page = False
                    continue
                marker = BULLET.match(value) or NUMBERED.match(value)
                if marker:
                    ordered_list = bool(NUMBERED.match(value)) and not BULLET.match(value)
                    text_inl = model.trim_inlines(_strip_prefix(inl, len(model.plain(inl)) - len(model.plain(inl).lstrip()) + len(marker.group(0).lstrip())))
                    prev = blocks[-1] if blocks else None
                    item = {"inlines": text_inl, "children": [], "_left": line.left, "_line": line}
                    if prev is not None and prev["type"] == "list" and prev.get("_open") and prev["ordered"] == ordered_list and abs(prev["items"][-1]["_left"] - line.left) <= 6:
                        prev["items"].append(item)
                    elif prev is not None and prev["type"] == "list" and prev.get("_open") and line.left - prev["items"][-1]["_left"] > 6:
                        parent = prev["items"][-1]
                        if parent["children"] and parent["children"][-1]["type"] == "list" and parent["children"][-1]["ordered"] == ordered_list:
                            parent["children"][-1]["items"].append(item)
                        else:
                            child = {"type": "list", "ordered": ordered_list, "items": [item]}
                            if ordered_list:
                                child["start"] = _start(marker.group(1))
                            parent["children"].append(child)
                    else:
                        new = {"type": "list", "ordered": ordered_list, "items": [item], "_open": True, "sourcePage": line.page}
                        if ordered_list:
                            new["start"] = _start(marker.group(1))
                        for b in blocks:
                            b.pop("_open", None)
                        blocks.append(new)
                    open_para = ("item", item)
                    i += 1
                    first_on_page = False
                    continue
                # ---- paragraph text
                if open_para is not None:
                    holder_kind, holder = open_para
                    last = holder["_line"]
                    same_page = last.page == line.page
                    gap = line.top - last.top if same_page else None
                    continues = False
                    if holder_kind == "item":
                        continues = same_page and gap is not None and 0 < gap <= 1.45 * pitch and line.left > holder["_left"] + 4
                    elif same_page:
                        short_end = last.right < col_right - 0.18 * (col_right - col_left) and TERMINAL.search(last.text)
                        continues = 0 < gap <= 1.4 * pitch and not short_end and abs(line.size - last.size) < 0.6
                    elif first_on_page:
                        continues = not TERMINAL.search(last.text) and value[:1].islower()
                    if continues:
                        joined = holder["inlines"]
                        if model.plain(joined).endswith("-") and value[:1].islower():
                            self.hyphen_joins += 1
                        else:
                            joined.append(model.text(" "))
                        holder["inlines"] = model.merge_inlines(joined + inl)
                        holder["_line"] = line
                        i += 1
                        first_on_page = False
                        continue
                for b in blocks:
                    b.pop("_open", None)
                block = model.paragraph(inl)
                block.update(sourcePage=line.page, _line=line)
                blocks.append(block)
                open_para = ("para", block)
                i += 1
                first_on_page = False
        _clean(blocks)
        return blocks

    def extract(self):
        root = self.load()
        if root is None:
            return
        pages = self.read_pages(root)
        self.strip_furniture(pages)
        self.result.blocks = self.build(pages, self.outline(root))
        r = self.result
        r.notes["reconstruction"] = "headings from %s; paragraphs from line spacing" % ("the PDF outline and font size" if root.find("outline") is not None else "font size")
        if self.reconstructed_tables:
            r.warn("PDF_TABLE_RECONSTRUCTED", "%d table(s) were rebuilt from column alignment; a PDF does not store table structure. Header rows are not marked." % self.reconstructed_tables,
                   "Compare each table with the source in the preview. Supply the table as DOCX, XLSX or CSV if it is wrong.")
        if self.columns_pages:
            r.warn("PDF_MULTI_COLUMN", "Page(s) %s are set in two columns; reading order was taken as left column, then right." % ", ".join(map(str, self.columns_pages)),
                   "Check the reading order of these pages in the preview.")
        if self.hyphen_joins:
            r.warn("PDF_HYPHENATION_UNCERTAIN", "%d word(s) were split across lines with a hyphen; the hyphen was kept because a PDF does not say whether it is part of the word." % self.hyphen_joins,
                   "Search the preview for stray hyphens inside words, or supply the source document.")
        if getattr(self, "furniture_count", 0):
            r.warn("PDF_PAGE_FURNITURE_REMOVED", "%d running header/footer/page-number item(s) were left out (for example: %s)." % (self.furniture_count, "; ".join(self.furniture[:3])),
                   "No action if these were page furniture. If one was body content, supply the source document.", severity="info")
        if self.scanned:
            read = {n for n, _, _ in self.ocr_pages}
            missing = [n for n in self.scanned if n not in read]
            if missing:
                tool = "tesseract is not installed" if not capabilities.have("tesseract") else "pdftoppm is not installed" if not capabilities.have("pdftoppm") else "the OCR run failed"
                r.issues.append(model.issue("OCR_UNAVAILABLE", "error", "Page(s) %s are scanned images with no selectable text, and OCR could not be run here (%s)." % (", ".join(map(str, missing)), tool),
                                            "Install tesseract-ocr and run the ingest again, or supply the text of these pages as a document."))
                r.status = "failed" if not r.blocks else "partial"
            for number, confidence, weak in self.ocr_pages:
                sev = "warning"
                r.issues.append(model.issue("OCR_TEXT_UNVERIFIED", sev, "Page %d was read by OCR (mean word confidence %.0f%%). OCR text can contain misread characters%s." % (
                    number, confidence, (", for example near: " + " ".join(weak[:8])) if weak else ""),
                    "Proofread this page's text in the preview against the scan before approving."))
            if self.ocr_pages:
                r.notes["ocrPages"] = [{"page": n, "meanConfidence": round(c, 1), "lowConfidenceWords": len(w)} for n, c, w in self.ocr_pages]
        links = sum(1 for b in r.blocks for run in b.get("inlines", []) if run.get("href"))
        if links:
            r.warn("PDF_LINK_SPAN_APPROXIMATE", "%d link(s) were recovered. A PDF stores a link as a rectangle over the page, so the linked words can be a few characters off." % links,
                   "Check each link's text and destination in the preview.", severity="info")
        if not r.blocks and r.status == "extracted":
            r.fail("DOCUMENT_EMPTY", "No text or images could be extracted from the PDF.", "Check the file opens correctly, or supply the source document.")


def _strip_prefix(inlines, count):
    out, remaining = [], count
    for run in inlines:
        if remaining > 0 and run.get("t") == "text":
            if len(run["text"]) <= remaining:
                remaining -= len(run["text"])
                continue
            run = dict(run, text=run["text"][remaining:])
            remaining = 0
        out.append(run)
    return out


def _start(marker):
    m = re.search(r"\d+", marker)
    return int(m.group(0)) if m else 1


def _clean(blocks):
    for block in blocks:
        for key in [k for k in block if k.startswith("_")]:
            block.pop(key)
        for item in block.get("items", []) if block.get("type") == "list" else []:
            for key in [k for k in item if k.startswith("_")]:
                item.pop(key)
            _clean(item.get("children", []))
        if block.get("type") in ("paragraph", "heading"):
            block["inlines"] = model.trim_inlines(block["inlines"])


def extract(path, ctx):
    result = model.DocResult("pdf (poppler pdftohtml -xml)")
    if not capabilities.have("pdftohtml"):
        result.status = "unsupported"
        result.issues.append(model.issue("PDF_TOOL_UNAVAILABLE", "error", "PDF extraction needs poppler-utils (pdftohtml), which is not installed in this environment.",
                                         "Install poppler-utils and run the ingest again, or supply the blog as DOCX, Markdown or HTML."))
        return result
    Pdf(path, ctx, result).extract()
    return result
