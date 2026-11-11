"""Shared building blocks: inlines, blocks, issues, and the per-document result.

Extractors return RAW blocks (media referenced by a `ref`, no ids). ingest.py
turns them into the manifest: ids assigned, refs resolved to real asset files or
recorded as missing — an asset is never listed unless its bytes exist on disk.
"""
import re

# ---------------------------------------------------------------- inlines
def text(s, **marks):
    run = {"t": "text", "text": s}
    for k, v in marks.items():
        if v:
            run[k] = v
    return run


def merge_inlines(inlines):
    """Join adjacent text runs that carry identical marks; drop empty runs."""
    out = []
    for run in inlines:
        if run.get("t") == "text":
            if run["text"] == "":
                continue
            prev = out[-1] if out else None
            if prev and prev.get("t") == "text" and {k: v for k, v in prev.items() if k != "text"} == {
                k: v for k, v in run.items() if k != "text"
            }:
                prev["text"] += run["text"]
                continue
            out.append(dict(run))
        else:
            out.append(dict(run))
    return out


def trim_inlines(inlines):
    """Strip leading/trailing whitespace and breaks without touching inner text."""
    out = merge_inlines(inlines)
    while out and (out[0].get("t") == "break" or (out[0].get("t") == "text" and not out[0]["text"].strip())):
        out.pop(0)
    while out and (out[-1].get("t") == "break" or (out[-1].get("t") == "text" and not out[-1]["text"].strip())):
        out.pop()
    if out and out[0].get("t") == "text":
        out[0]["text"] = out[0]["text"].lstrip()
    if out and out[-1].get("t") == "text":
        out[-1]["text"] = out[-1]["text"].rstrip()
    return out


def plain(inlines):
    parts = []
    for run in inlines or []:
        if run.get("t") == "text":
            parts.append(run["text"])
        elif run.get("t") == "break":
            parts.append(" ")
    return "".join(parts)


# ---------------------------------------------------------------- blocks
def heading(level, inlines):
    return {"type": "heading", "level": max(1, min(6, int(level))), "inlines": trim_inlines(inlines)}


def paragraph(inlines, style=None):
    block = {"type": "paragraph", "inlines": trim_inlines(inlines)}
    if style:
        block["style"] = style
    return block


def media(ref, alt=None, title=None, caption=None, media_kind=None, width=None, height=None):
    block = {"type": "media", "ref": ref}
    if alt is not None:
        block["alt"] = alt
    if title:
        block["title"] = title
    if caption:
        block["caption"] = caption
    if media_kind:
        block["mediaKind"] = media_kind
    if width:
        block["width"] = width
    if height:
        block["height"] = height
    return block


def block_text(block):
    """All reader-visible text of a block, for matching and completeness counts."""
    t = block.get("type")
    if t in ("heading", "paragraph"):
        return plain(block.get("inlines"))
    if t == "list":
        return " ".join(plain(i.get("inlines")) + " " + " ".join(block_text(c) for c in i.get("children", [])) for i in block["items"])
    if t == "table":
        return " ".join(plain(c.get("inlines")) for row in block["rows"] for c in row)
    if t == "blockquote":
        return " ".join(block_text(b) for b in block.get("blocks", []))
    if t == "code":
        return block.get("text", "")
    if t == "footnotes":
        return " ".join(plain(i.get("inlines")) for i in block["items"])
    return ""


# ---------------------------------------------------------------- issues
SEVERITIES = ("error", "warning", "info")


def issue(code, severity, message, action, section=None, block=None, asset=None, document=None):
    assert severity in SEVERITIES
    out = {"code": code, "severity": severity, "message": message, "action": action}
    if section:
        out["section"] = section
    if block:
        out["blockId"] = block
    if asset:
        out["assetId"] = asset
    if document:
        out["document"] = document
    return out


class DocResult:
    """What one extractor produced from one document."""

    def __init__(self, extractor):
        self.extractor = extractor
        self.status = "extracted"          # extracted | partial | failed | unsupported
        self.blocks = []
        self.meta = {}                     # title, subtitle, author, date, description, keywords, canonical, lang, cover
        self.meta_sources = {}             # key -> where it came from
        self.embedded = {}                 # key -> {"data": bytes, "filename": str, ...}
        self.issues = []
        self.pages = None
        self.notes = {}                    # extractor-specific facts recorded in the manifest

    def set_meta(self, key, value, source):
        if value in (None, "", []):
            return
        if key not in self.meta:
            self.meta[key] = value
            self.meta_sources[key] = source

    def add_embedded(self, data, filename, **facts):
        key = "e%04d" % (len(self.embedded) + 1)
        self.embedded[key] = dict(data=data, filename=filename, **facts)
        return key

    def warn(self, code, message, action, severity="warning"):
        self.issues.append(issue(code, severity, message, action))

    def fail(self, code, message, action):
        self.status = "failed"
        self.issues.append(issue(code, "error", message, action))


# ---------------------------------------------------------------- placement directives
MEDIA_WORDS = r"image|img|photo|picture|pic|figure|fig|gif|animation|video|clip|chart|graph|infographic|diagram|illustration|screenshot|audio|cover|hero|banner|media|embed"
_DIRECTIVE = re.compile(
    r"^\s*(?:\[\[?|\{\{?|<<?|\(\()\s*(?:insert|place|add|embed)?\s*(" + MEDIA_WORDS + r")\s*(?:#|no\.?)?\s*[:\-–—=]?\s*(.*?)\s*(?:here|goes here)?\s*(?:\]\]?|\}\}?|>>?|\)\))\s*$",
    re.I,
)


def parse_directive(line):
    """`[IMAGE: chart.png]`, `{{video: demo.mp4}}`, `[Insert Figure 2 here]` → (kind, target) or None.

    An author's explicit placement instruction — priority 1 in the placement order.
    """
    m = _DIRECTIVE.match(line or "")
    if not m:
        return None
    word, target = m.group(1).lower(), m.group(2).strip().strip("\"'")
    if len(target) > 200:
        return None
    return word, target


VIDEO_HOSTS = (
    (re.compile(r"(?:youtube\.com/watch\?(?:[^ ]*&)?v=|youtu\.be/|youtube\.com/embed/|youtube\.com/shorts/|youtube-nocookie\.com/embed/)([A-Za-z0-9_-]{6,})"), "youtube"),
    (re.compile(r"vimeo\.com/(?:video/)?(\d+)"), "vimeo"),
    (re.compile(r"loom\.com/(?:share|embed)/([a-f0-9]+)"), "loom"),
    (re.compile(r"wistia\.(?:com|net)/(?:medias|embed/iframe)/([a-z0-9]+)"), "wistia"),
    (re.compile(r"dailymotion\.com/(?:video|embed/video)/([a-z0-9]+)"), "dailymotion"),
    (re.compile(r"(?:open\.spotify\.com/(?:embed/)?(?:episode|track|show)/)([A-Za-z0-9]+)"), "spotify"),
    (re.compile(r"soundcloud\.com/([^\s?#]+)"), "soundcloud"),
)


def video_provider(url):
    """(provider, id) for a known media host URL, else None."""
    for pattern, provider in VIDEO_HOSTS:
        m = pattern.search(url or "")
        if m:
            return provider, m.group(1)
    return None
