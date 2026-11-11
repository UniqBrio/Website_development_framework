"""Markdown and plain text → blocks.

Markdown: headings, paragraphs, nested lists, GFM tables, fenced code, quotes,
footnotes, reference links, front matter, embedded HTML and media references.
Plain text is read CONSERVATIVELY: structure the author marked is kept, emphasis
characters are left as the author typed them, and nothing is promoted to a
heading on a guess.
"""
import re

from . import htmldoc, model
from .safety import safe_href

_ATX = re.compile(r"^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$")
_FENCE = re.compile(r"^( {0,3})(`{3,}|~{3,})[ \t]*([^`\s]*)[^`]*$")
_HR = re.compile(r"^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$")
_ITEM = re.compile(r"^( *)([-*+]|\d{1,9}[.)])([ \t]+|$)(.*)$")
_TABLE_DELIM = re.compile(r"^ {0,3}\|?[ \t]*:?-+:?[ \t]*(\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$")
_FOOTNOTE_DEF = re.compile(r"^ {0,3}\[\^([^\]\s]+)\]:[ \t]*(.*)$")
_LINK_DEF = re.compile(r"^ {0,3}\[([^\]]+)\]:[ \t]*<?(\S+?)>?(?:[ \t]+[\"'(](.*)[\"')])?[ \t]*$")
_HTML_BLOCK = re.compile(r"^ {0,3}<(/?)(div|figure|video|audio|iframe|img|picture|table|p|details|section|article|blockquote|ul|ol|pre|h[1-6]|center|embed|object|script|style|!--)\b", re.I)
_URL = re.compile(r"https?://[^\s<>\"'`]+", re.I)
_IMG = re.compile(r"!\[((?:[^\]\\]|\\.)*)\]\(\s*<?([^)\s>]+)>?(?:\s+[\"'(]((?:[^\"')\\]|\\.)*)[\"')])?\s*\)")


def parse_front_matter(lines):
    """A YAML subset: scalars, inline lists, dash lists and one level of nesting."""
    data, key, parent = {}, None, None
    for raw in lines:
        if not raw.strip() or raw.lstrip().startswith("#"):
            continue
        indent = len(raw) - len(raw.lstrip(" "))
        line = raw.strip()
        if line.startswith("- "):
            target = (data.get(parent) if indent and isinstance(data.get(parent), dict) and key != parent else data)
            holder = data[parent] if (parent and isinstance(data.get(parent), dict) and key in data[parent]) else data
            if key is not None:
                if not isinstance(holder.get(key), list):
                    holder[key] = []
                holder[key].append(_scalar(line[2:]))
            continue
        m = re.match(r"^([A-Za-z0-9_.-]+)\s*:\s*(.*)$", line)
        if not m:
            continue
        name, value = m.group(1), m.group(2)
        if indent and parent and isinstance(data.get(parent), dict):
            holder = data[parent]
        else:
            holder, parent = data, None
        key = name
        if value == "":
            holder[name] = {}
            if holder is data:
                parent = name
        elif value.startswith("[") and value.endswith("]"):
            holder[name] = [_scalar(v) for v in _split_list(value[1:-1])]
        else:
            holder[name] = _scalar(value)
    return {k: v for k, v in data.items() if v not in ({}, None)}


def _split_list(body):
    return [p for p in re.split(r",(?=(?:[^\"']*[\"'][^\"']*[\"'])*[^\"']*$)", body) if p.strip()]


def _scalar(value):
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
        return value[1:-1]
    return value


class Inline:
    """Markdown inline parser. `plain=True` (text files) keeps emphasis characters literal."""

    def __init__(self, refs, result, plain=False):
        self.refs, self.result, self.plain = refs, result, plain

    def parse(self, src, marks=None, images=None):
        marks = marks or {}
        out, buf, i, n = [], [], 0, len(src)

        def flush():
            if buf:
                out.append(model.text("".join(buf), **marks))
                buf.clear()

        while i < n:
            ch = src[i]
            if ch == "\\" and i + 1 < n and src[i + 1] in "\\`*_{}[]()#+-.!|~<>" and not self.plain:
                buf.append(src[i + 1])
                i += 2
                continue
            if ch == "\n":
                hard = (buf and "".join(buf).endswith("  ")) or (buf and buf[-1] == "\\")
                if buf and buf[-1] == "\\":
                    buf.pop()
                text_so_far = "".join(buf).rstrip(" ")
                buf.clear()
                buf.append(text_so_far)
                flush()
                out.append({"t": "break"} if hard else model.text(" ", **marks))
                i += 1
                continue
            if ch == "`" and not self.plain:
                run = re.match(r"`+", src[i:]).group(0)
                end = src.find(run, i + len(run))
                while end != -1 and (src[end:end + len(run) + 1] == run + "`"):
                    end = src.find(run, end + len(run) + 1)
                if end != -1:
                    flush()
                    code = src[i + len(run):end].replace("\n", " ")
                    if code.startswith(" ") and code.endswith(" ") and code.strip():
                        code = code[1:-1]
                    out.append(model.text(code, **dict(marks, code=True)))
                    i = end + len(run)
                    continue
            if ch == "!" and src.startswith("![", i):
                m = _IMG.match(src, i)
                if m:
                    flush()
                    if images is not None:
                        images.append(_image_block(_unescape(m.group(1)), m.group(2), _unescape(m.group(3)) if m.group(3) else None))
                    i = m.end()
                    continue
                m = re.match(r"!\[((?:[^\]\\]|\\.)*)\]\[([^\]]*)\]", src[i:])
                if m and (m.group(2) or m.group(1)).lower() in self.refs:
                    flush()
                    url, title = self.refs[(m.group(2) or m.group(1)).lower()]
                    if images is not None:
                        images.append(_image_block(_unescape(m.group(1)), url, title))
                    i += m.end()
                    continue
            if ch == "[":
                m = re.match(r"\[\^([^\]\s]+)\]", src[i:])
                if m and not self.plain:
                    flush()
                    out.append({"t": "fnref", "id": m.group(1)})
                    i += m.end()
                    continue
                close = _matching_bracket(src, i)
                if close != -1:
                    label = src[i + 1:close]
                    rest = src[close + 1:]
                    m = re.match(r"\(\s*<?([^)\s>]*)>?(?:\s+[\"'(]((?:[^\"')\\]|\\.)*)[\"')])?\s*\)", rest)
                    target = None
                    consumed = 0
                    if m:
                        target, consumed = m.group(1), m.end()
                    else:
                        m2 = re.match(r"\[([^\]]*)\]", rest)
                        key = (m2.group(1) if m2 and m2.group(1) else label).lower()
                        if key in self.refs and (m2 or not self.plain):
                            target, consumed = self.refs[key][0], (m2.end() if m2 else 0)
                    if target is not None:
                        flush()
                        href = safe_href(target)
                        if href is None:
                            self.result.warn("LINK_UNSAFE_REMOVED", "A link with an unsafe or unsupported address was not carried over: %s" % target[:80],
                                             "Check the link in the source document; its text was kept without the link.")
                        inner = dict(marks, href=href) if href else marks
                        out.extend(self.parse(label, inner, images))
                        i = close + 1 + consumed
                        continue
            if ch == "<" and not self.plain:
                m = re.match(r"<((?:https?://|mailto:)[^>\s]+)>", src[i:])
                if m:
                    flush()
                    out.append(model.text(m.group(1).replace("mailto:", ""), **dict(marks, href=m.group(1))))
                    i += m.end()
                    continue
                m = re.match(r"<br\s*/?>", src[i:], re.I)
                if m:
                    flush()
                    out.append({"t": "break"})
                    i += m.end()
                    continue
                m = re.match(r"<(sup|sub|kbd|u|mark|span|small|b|i|strong|em|del|s|code)(\s[^>]*)?>(.*?)</\1>", src[i:], re.I | re.S)
                if m:
                    flush()
                    tag = m.group(1).lower()
                    extra = {"sup": {"sup": True}, "sub": {"sub": True}, "kbd": {"code": True}, "code": {"code": True}, "b": {"bold": True},
                             "strong": {"bold": True}, "i": {"italic": True}, "em": {"italic": True}, "del": {"strike": True}, "s": {"strike": True}}.get(tag, {})
                    out.extend(self.parse(m.group(3), dict(marks, **extra), images))
                    i += m.end()
                    continue
                m = re.match(r"</?[A-Za-z][A-Za-z0-9-]*(\s[^>]*)?/?>", src[i:])
                if m:                                   # an unknown inline tag: keep its text, drop the tag
                    i += m.end()
                    continue
            if ch in "*_~" and not self.plain:
                m = re.match(r"\*{1,3}|_{1,3}|~~", src[i:])
                if m:
                    delim = m.group(0)
                    intraword = delim[0] == "_" and i > 0 and src[i - 1].isalnum()
                    after = src[i + len(delim):i + len(delim) + 1]
                    if not intraword and after and not after.isspace():
                        end = _closing(src, i + len(delim), delim)
                        if end != -1:
                            flush()
                            extra = {"~~": {"strike": True}}.get(delim) or {1: {"italic": True}, 2: {"bold": True}, 3: {"bold": True, "italic": True}}[len(delim)]
                            out.extend(self.parse(src[i + len(delim):end], dict(marks, **extra), images))
                            i = end + len(delim)
                            continue
            if ch in "hH" and "href" not in marks:
                m = _URL.match(src, i)
                if m and (i == 0 or not src[i - 1].isalnum()):
                    url = m.group(0).rstrip(".,;:!?)\"'")
                    if url.count("(") > url.count(")") and src[i + len(url):i + len(url) + 1] == ")":
                        url += ")"
                    flush()
                    out.append(model.text(url, **dict(marks, href=url)))
                    i += len(url)
                    continue
            buf.append(ch)
            i += 1
        flush()
        return out


def _unescape(value):
    return re.sub(r"\\([\\`*_{}\[\]()#+\-.!|~<>\"'])", r"\1", value or "")


def _matching_bracket(src, start):
    depth, i = 0, start
    while i < len(src):
        ch = src[i]
        if ch == "\\":
            i += 2
            continue
        if ch == "`":
            end = src.find("`", i + 1)
            i = end + 1 if end != -1 else i + 1
            continue
        if ch == "[":
            depth += 1
        elif ch == "]":
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return -1


def _closing(src, start, delim):
    """Index of the delimiter run that closes `delim` opened just before `start`, or -1."""
    c, size, i, n = delim[0], len(delim), start, len(src)
    while i < n:
        ch = src[i]
        if ch == "\\":
            i += 2
            continue
        if ch == "`":
            end = src.find("`", i + 1)
            i = end + 1 if end != -1 else i + 1
            continue
        if ch != c:
            i += 1
            continue
        run = 1
        while i + run < n and src[i + run] == c:
            run += 1
        closes = i > start and not src[i - 1].isspace() and not (c == "_" and src[i + run:i + run + 1].isalnum())
        if run == size and closes:
            return i
        if run > size and closes and c != "~":
            # `**a *b***`: the inner pair closes first, ours is the tail of the run.
            inner_open = src.rfind(c, start, i)
            return i + run - size if inner_open != -1 else i
        if run != size and c != "~":
            # A nested pair of a different strength opens here; step over it.
            inner = _closing(src, i + run, c * run)
            if inner != -1:
                i = inner + run
                continue
        i += run
    return -1


def _image_block(alt, target, title):
    target = target.strip()
    kind = htmldoc.kind_from_target(target) or "image"
    provider = model.video_provider(target)
    if provider:
        return {"type": "embed", "provider": provider[0], "mediaId": provider[1], "url": target, "title": alt or title or None}
    return model.media(htmldoc.media_ref(_percent_decode(target)), alt=alt, title=title, media_kind=kind)


def _percent_decode(target):
    if re.match(r"^(https?:)?//", target, re.I):
        return target
    try:
        from urllib.parse import unquote
        return unquote(target)
    except Exception:
        return target


class Blocks:
    def __init__(self, result, plain=False, line_paragraphs=False):
        self.result, self.plain, self.line_paragraphs = result, plain, line_paragraphs
        self.refs, self.footnotes = {}, {}
        self.inline = Inline(self.refs, result, plain)

    def collect_definitions(self, lines):
        """Link references and footnote definitions are document-wide; lift them first."""
        out, i, fence = [], 0, None
        while i < len(lines):
            line = lines[i]
            f = _FENCE.match(line)
            if f and not self.plain:
                if fence is None:
                    fence = f.group(2)[0]
                elif line.strip().startswith(fence * 3):
                    fence = None
                out.append(line)
                i += 1
                continue
            if fence is None and not self.plain:
                m = _FOOTNOTE_DEF.match(line)
                if m:
                    body = [m.group(2)]
                    i += 1
                    while i < len(lines) and (lines[i].startswith("    ") or lines[i].startswith("\t") or (not lines[i].strip() and i + 1 < len(lines) and lines[i + 1].startswith("    "))):
                        body.append(lines[i].strip())
                        i += 1
                    self.footnotes[m.group(1)] = " ".join(p for p in body if p)
                    continue
                m = _LINK_DEF.match(line)
                if m and not line.lstrip().startswith("[^"):
                    self.refs[m.group(1).lower()] = (m.group(2), m.group(3))
                    i += 1
                    continue
            out.append(line)
            i += 1
        return out

    def parse(self, lines):
        blocks, i, n = [], 0, len(lines)
        para = []

        def flush():
            if para:
                blocks.extend(self.paragraph(para))
                para.clear()

        while i < n:
            line = lines[i]
            if not line.strip():
                flush()
                i += 1
                continue
            if not self.plain:
                m = _FENCE.match(line)
                if m:
                    flush()
                    fence, indent, lang = m.group(2), len(m.group(1)), m.group(3) or None
                    body = []
                    i += 1
                    while i < n and not re.match(r"^ {0,3}%s{%d,}[ \t]*$" % (re.escape(fence[0]), len(fence)), lines[i]):
                        body.append(lines[i][indent:] if lines[i][:indent].strip() == "" else lines[i])
                        i += 1
                    i += 1
                    blocks.append({"type": "code", "language": lang, "text": "\n".join(body)})
                    continue
                if not para and (line.startswith("    ") or line.startswith("\t")):
                    body = []
                    while i < n and (lines[i].startswith("    ") or lines[i].startswith("\t") or not lines[i].strip()):
                        body.append(lines[i][4:] if lines[i].startswith("    ") else lines[i][1:])
                        i += 1
                    while body and not body[-1].strip():
                        body.pop()
                    blocks.append({"type": "code", "language": None, "text": "\n".join(body)})
                    continue
                if _HTML_BLOCK.match(line):
                    flush()
                    body = []
                    opener = _HTML_BLOCK.match(line).group(2).lower()
                    if opener == "!--":
                        while i < n and "-->" not in lines[i]:
                            i += 1
                        i += 1
                        continue
                    closer = re.compile(r"</%s\s*>" % re.escape(opener), re.I)
                    void = opener in ("img", "embed")
                    while i < n:
                        body.append(lines[i])
                        done = void or closer.search(lines[i]) or (not closer.search("\n".join(body)) and i + 1 < n and not lines[i + 1].strip() and opener in ("p", "div", "center") and False)
                        i += 1
                        if done or (i < n and not lines[i].strip() and not _needs_close(opener, body)):
                            break
                    blocks.extend(htmldoc.fragment_blocks("\n".join(body), self.result))
                    continue
            m = _ATX.match(line)
            if m and (not self.plain or m.group(2)):
                flush()
                if m.group(2):
                    blocks.append(model.heading(len(m.group(1)), self.inline.parse(m.group(2).strip())))
                i += 1
                continue
            if para and re.match(r"^ {0,3}(=+|-{2,})[ \t]*$", line) and len(para) == 1 and len(line.strip()) >= 2:
                level = 1 if line.strip().startswith("=") else 2
                blocks.append(model.heading(level, self.inline.parse(para[0].strip())))
                para.clear()
                i += 1
                continue
            if _HR.match(line):
                flush()
                blocks.append({"type": "rule"})
                i += 1
                continue
            if line.lstrip().startswith(">") and not self.plain:
                flush()
                body = []
                while i < n and (lines[i].lstrip().startswith(">") or (lines[i].strip() and body and not _starts_block(lines[i]))):
                    body.append(re.sub(r"^ {0,3}> ?", "", lines[i]))
                    i += 1
                inner = Blocks(self.result, self.plain)
                inner.refs, inner.footnotes, inner.inline = self.refs, self.footnotes, self.inline
                blocks.append({"type": "blockquote", "blocks": inner.parse(body)})
                continue
            item = _ITEM.match(line)
            if item and (not para or len(item.group(1)) <= 3) and _is_list_start(item, bool(para)):
                flush()
                block, i = self.list(lines, i)
                blocks.append(block)
                continue
            if not self.plain and "|" in line and i + 1 < n and _TABLE_DELIM.match(lines[i + 1]) and "-" in lines[i + 1] and not para:
                header = _cells(line)
                if len(header) == len(_cells(lines[i + 1])):
                    rows = [[{"inlines": model.trim_inlines(self.inline.parse(c))} for c in header]]
                    i += 2
                    while i < n and lines[i].strip() and "|" in lines[i]:
                        cells = _cells(lines[i])
                        cells = (cells + [""] * len(header))[:len(header)]
                        rows.append([{"inlines": model.trim_inlines(self.inline.parse(c))} for c in cells])
                        i += 1
                    blocks.append({"type": "table", "headerRows": 1, "rows": rows})
                    continue
            if self.line_paragraphs:
                flush()
                blocks.extend(self.paragraph([line]))
                i += 1
                continue
            para.append(line)
            i += 1
        flush()
        return blocks

    def paragraph(self, lines):
        raw = "\n".join(l.strip() if self.plain else l.lstrip() for l in lines)
        directive = model.parse_directive(raw) if "\n" not in raw else None
        if directive:
            word, target = directive
            return [model.media({"kind": "directive", "target": target, "word": word}, media_kind=_kind_of_word(word))]
        stripped = raw.strip()
        if "\n" not in stripped and _URL.fullmatch(stripped):
            provider = model.video_provider(stripped)
            if provider:
                return [{"type": "embed", "provider": provider[0], "mediaId": provider[1], "url": stripped, "title": None}]
            kind = htmldoc.kind_from_target(stripped)
            if kind:
                return [model.media(htmldoc.media_ref(stripped), media_kind=kind)]
        images = []
        inlines = model.trim_inlines(self.inline.parse(raw, images=images))
        if images and not model.plain(inlines).strip():
            return images
        body = [model.paragraph(inlines)] if inlines else []
        # An image that opens the paragraph stays ahead of its text; otherwise it follows.
        return images + body if raw.lstrip().startswith("![") else body + images

    def list(self, lines, i):
        first = _ITEM.match(lines[i])
        base = len(first.group(1))
        ordered = first.group(2)[0].isdigit()
        marker_kind = first.group(2)[-1] if ordered else first.group(2)
        items, n = [], len(lines)
        start = int(first.group(2)[:-1]) if ordered else None
        while i < n:
            m = _ITEM.match(lines[i])
            if not m or len(m.group(1)) != base or m.group(2)[0].isdigit() != ordered:
                break
            if (m.group(2)[-1] if ordered else m.group(2)) != marker_kind and not ordered and False:
                break
            content_indent = base + len(m.group(2)) + max(1, min(4, len(m.group(3)) or 1))
            body = [m.group(4)]
            i += 1
            while i < n:
                line = lines[i]
                if not line.strip():
                    j = i + 1
                    while j < n and not lines[j].strip():
                        j += 1
                    if j < n and len(lines[j]) - len(lines[j].lstrip(" ")) >= min(content_indent, base + 2):
                        body.append("")
                        i += 1
                        continue
                    break
                indent = len(line) - len(line.lstrip(" "))
                nxt = _ITEM.match(line)
                if nxt and indent == base:
                    break
                if indent < min(content_indent, base + 2) and (nxt or _starts_block(line)):
                    break
                body.append(line[min(indent, content_indent):])
                i += 1
            inner = Blocks(self.result, self.plain)
            inner.refs, inner.footnotes, inner.inline = self.refs, self.footnotes, self.inline
            parsed = inner.parse(body)
            head, children = [], []
            for b in parsed:
                if b["type"] == "paragraph" and not children:
                    if head:
                        head.append({"t": "break"})
                    head.extend(b["inlines"])
                else:
                    children.append(b)
            items.append({"inlines": head, "children": children})
            while i < n and not lines[i].strip():
                j = i
                while j < n and not lines[j].strip():
                    j += 1
                nxt = _ITEM.match(lines[j]) if j < n else None
                if nxt and len(nxt.group(1)) == base and nxt.group(2)[0].isdigit() == ordered:
                    i = j
                else:
                    break
        block = {"type": "list", "ordered": ordered, "items": items}
        if ordered:
            block["start"] = start
        return block, i


def _needs_close(opener, body):
    joined = "\n".join(body)
    return opener in ("video", "audio", "figure", "table", "iframe", "picture", "details", "pre", "script", "style", "ul", "ol", "blockquote") and not re.search(r"</%s\s*>" % opener, joined, re.I)


def _starts_block(line):
    return bool(_ATX.match(line) or _FENCE.match(line) or _HR.match(line) or _ITEM.match(line) or line.lstrip().startswith(">"))


def _is_list_start(item, interrupting):
    marker = item.group(2)
    if not item.group(4).strip():
        return not interrupting
    if interrupting and marker[0].isdigit() and marker[:-1] != "1":
        return False
    return True


def _cells(line):
    line = line.strip()
    if line.startswith("|"):
        line = line[1:]
    if line.endswith("|") and not line.endswith("\\|"):
        line = line[:-1]
    return [c.strip().replace("\\|", "|") for c in re.split(r"(?<!\\)\|", line)]


def _kind_of_word(word):
    if word in ("video", "clip"):
        return "video"
    if word == "audio":
        return "audio"
    if word in ("gif", "animation"):
        return "animation"
    if word in ("chart", "graph"):
        return "chart"
    return "image"


def decode_text(data):
    for bom, enc in ((b"\xef\xbb\xbf", "utf-8-sig"), (b"\xff\xfe", "utf-16"), (b"\xfe\xff", "utf-16")):
        if data.startswith(bom):
            return data.decode(enc, "replace"), enc
    for enc in ("utf-8", "cp1252"):
        try:
            return data.decode(enc), enc
        except UnicodeDecodeError:
            continue
    return data.decode("utf-8", "replace"), "utf-8 (with replacement)"


META_KEYS = {
    "title": "title", "subtitle": "subtitle", "author": "author", "authors": "author", "date": "date", "published": "date",
    "pubdate": "date", "description": "description", "summary": "description", "excerpt": "description", "keywords": "keywords",
    "tags": "keywords", "canonical": "canonical", "canonical_url": "canonical", "lang": "lang", "language": "lang", "slug": "slug",
    "image": "cover", "cover": "cover", "cover_image": "cover", "featured_image": "cover", "hero": "cover", "thumbnail": "cover",
    "seo_title": "seoTitle", "meta_title": "seoTitle", "meta_description": "description",
}


def apply_meta(result, data, source):
    for key, value in data.items():
        low = key.lower().replace("-", "_")
        if low == "seo" and isinstance(value, dict):
            for k, v in value.items():
                target = {"title": "seoTitle", "description": "description", "keywords": "keywords", "canonical": "canonical"}.get(k.lower())
                if target:
                    result.set_meta(target, _keywords(v) if target == "keywords" else v, "%s seo.%s" % (source, k))
            continue
        target = META_KEYS.get(low)
        if not target:
            continue
        if target == "keywords":
            value = _keywords(value)
        elif isinstance(value, list):
            value = ", ".join(str(v) for v in value)
        elif isinstance(value, dict):
            value = value.get("name") or value.get("url") or value.get("src")
        result.set_meta(target, value if isinstance(value, list) else (str(value) if value is not None else None), "%s %s" % (source, key))


def _keywords(value):
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    return [v.strip() for v in str(value).split(",") if v.strip()]


def extract_markdown(path, ctx):
    result = model.DocResult("markdown")
    with open(path, "rb") as fh:
        source, _ = decode_text(fh.read())
    result.blocks = markdown_blocks(source, result)
    return result


def markdown_blocks(source, result, front_matter=True):
    lines = source.replace("\r\n", "\n").replace("\r", "\n").expandtabs(4).split("\n")
    if front_matter and lines and lines[0].strip() == "---":
        try:
            end = next(i for i in range(1, len(lines)) if lines[i].strip() in ("---", "..."))
            apply_meta(result, parse_front_matter(lines[1:end]), "front matter")
            lines = lines[end + 1:]
        except StopIteration:
            pass
    parser = Blocks(result)
    blocks = parser.parse(parser.collect_definitions(lines))
    if parser.footnotes:
        items = [{"id": key, "inlines": model.trim_inlines(parser.inline.parse(value))} for key, value in parser.footnotes.items()]
        blocks.append({"type": "footnotes", "items": items})
    return blocks


def extract_text(path, ctx):
    result = model.DocResult("plain-text")
    with open(path, "rb") as fh:
        source, encoding = decode_text(fh.read())
    if "replacement" in encoding:
        result.warn("TEXT_ENCODING_UNCERTAIN", "Some characters could not be decoded and were replaced.", "Save the file as UTF-8 and upload it again.")
    lines = source.replace("\r\n", "\n").replace("\r", "\n").expandtabs(4).split("\n")
    content = [l for l in lines if l.strip()]
    # Hard-wrapped text is joined into paragraphs; one-line-per-paragraph text is kept line by line.
    line_paragraphs = bool(content) and max(len(l) for l in content) > 110
    parser = Blocks(result, plain=True, line_paragraphs=line_paragraphs)
    result.blocks = parser.parse(lines)
    result.notes["lineMode"] = "one paragraph per line" if line_paragraphs else "blank-line separated paragraphs"
    return result
