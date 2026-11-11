"""Media-to-content association for SUPPLIED files a document does not reference.

Priority order (blog_publishing.md §PLACEMENT):
  1 explicit instruction   — sidecar entry or an in-text directive
  2 document reference     — the document names the file
  3 caption / heading      — a figure number or a heading the filename matches
  4 nearby context         — distinctive filename words inside one paragraph
  5 document order         — embedded media already sit where the author put them

Only confidence `high` or `medium` places a file. A `low` match is recorded as
a SUGGESTION and the file stays unplaced: guessing a position is an editorial
decision this workflow does not take.
"""
import os
import re

from . import model

GENERIC = {"image", "img", "photo", "picture", "pic", "figure", "fig", "chart", "graph", "diagram", "infographic", "screenshot", "screen", "shot",
           "final", "copy", "new", "edit", "edited", "export", "version", "draft", "the", "a", "an", "of", "and", "for", "in", "to", "on", "with",
           "video", "clip", "gif", "animation", "audio", "blog", "post", "article", "untitled", "scaled", "min", "small", "large", "hd", "web"}
COVER = re.compile(r"^(cover|hero|featured?|banner|header|masthead|og|social|share)([-_ .]?(image|img|photo|pic))?(\d{0,2})$", re.I)
POSTER_SUFFIX = re.compile(r"[-_ .]?(poster|thumb|thumbnail|cover|preview|still)$", re.I)
FIGURE_NAME = re.compile(r"^(fig|figure|image|img|chart|graph|diagram|photo|pic|picture|illustration|infographic|video|gif)[-_ .]?0*(\d{1,3})$", re.I)
SUBJECTS = (("chart", re.compile(r"chart|graph|plot|histogram|trend", re.I)), ("infographic", re.compile(r"infographic", re.I)),
            ("diagram", re.compile(r"diagram|flow ?chart|architecture|process|workflow|schematic|wireframe|illustration", re.I)))


def tokens(value):
    value = re.sub(r"([a-z])([A-Z])", r"\1 \2", value or "")
    return [t for t in re.split(r"[^a-z0-9]+", value.lower()) if t and t not in GENERIC and not t.isdigit() and len(t) > 1 and not re.fullmatch(r"v\d+", t)]


def stem(filename):
    return os.path.splitext(os.path.basename(filename))[0]


def subject_of(*texts):
    blob = " ".join(t for t in texts if t)
    for name, pattern in SUBJECTS:
        if pattern.search(blob):
            return name
    return None


def find_heading(blocks, wanted):
    """Index of the heading whose text matches `wanted` (exact, then contains), else None."""
    want = re.sub(r"\s+", " ", (wanted or "").strip().lower())
    if not want:
        return None
    exact = [i for i, b in enumerate(blocks) if b["type"] == "heading" and model.plain(b["inlines"]).strip().lower() == want]
    if len(exact) >= 1:
        return exact[0]
    partial = [i for i, b in enumerate(blocks) if b["type"] == "heading" and want in model.plain(b["inlines"]).lower()]
    return partial[0] if len(partial) == 1 else None


def section_end(blocks, heading_index):
    level = blocks[heading_index]["level"]
    for i in range(heading_index + 1, len(blocks)):
        if blocks[i]["type"] == "heading" and blocks[i]["level"] <= level:
            return i
    return len(blocks)


def apply_instruction(blocks, spec):
    """Where a sidecar instruction puts a file: (insert index, note) or (None, why not)."""
    if spec.get("after") is not None or spec.get("section") is not None:
        wanted = spec.get("after") if spec.get("after") is not None else spec.get("section")
        index = find_heading(blocks, wanted)
        if index is None:
            return None, 'no heading matches "%s"' % wanted
        if spec.get("position") == "end":
            return section_end(blocks, index), 'end of section "%s"' % wanted
        return index + 1, 'start of section "%s"' % wanted
    if spec.get("afterText"):
        needle = spec["afterText"].strip().lower()
        hits = [i for i, b in enumerate(blocks) if needle in model.block_text(b).lower()]
        if len(hits) == 1:
            return hits[0] + 1, "after the block containing the quoted text"
        return None, ("the quoted text appears %d times" % len(hits)) if hits else "the quoted text was not found"
    if spec.get("position") == "start":
        return 0, "start of the body"
    if spec.get("position") == "end":
        return len(blocks), "end of the body"
    return None, None


def by_mention(blocks, filename):
    """Blocks whose text names the file (with its extension)."""
    name = os.path.basename(filename).lower()
    return [i for i, b in enumerate(blocks) if name in model.block_text(b).lower()]


def by_figure_number(blocks, filename):
    """(index, is_caption) for a file named like `figure-2` when the text has a matching figure label."""
    m = FIGURE_NAME.match(stem(filename))
    if not m:
        return None
    number = m.group(2)
    label = re.compile(r"\b(fig(?:ure)?\.?|image|chart|graph|diagram|illustration|video|photo)\s*%s\b" % number, re.I)
    caption = re.compile(r"^\s*(fig(?:ure)?\.?|image|chart|graph|diagram|illustration|video|photo)\s*%s\s*[:.\-–—]" % number, re.I)
    captions = [i for i, b in enumerate(blocks) if b["type"] == "paragraph" and caption.match(model.plain(b["inlines"]))]
    if len(captions) == 1:
        return captions[0], True
    mentions = [i for i, b in enumerate(blocks) if b["type"] in ("paragraph", "list") and label.search(model.block_text(b))]
    if mentions:
        return mentions[0], False
    return None


def by_heading(blocks, filename):
    words = tokens(stem(filename))
    if not words:
        return None
    scored = []
    for i, b in enumerate(blocks):
        if b["type"] != "heading":
            continue
        head = set(tokens(model.plain(b["inlines"])))
        shared = [w for w in words if w in head]
        if not shared:
            continue
        full = len(shared) == len(words)
        strong = full and (len(words) >= 2 or len(words[0]) >= 5)
        partial = len(shared) >= 2 and len(shared) / len(words) >= 0.6
        if strong or partial:
            scored.append((len(shared) + (1 if full else 0), i))
    if not scored:
        return None
    scored.sort(reverse=True)
    if len(scored) > 1 and scored[0][0] == scored[1][0]:
        return None                                   # two headings match equally: ambiguous
    return scored[0][1]


def by_context(blocks, filename):
    words = [w for w in tokens(stem(filename)) if len(w) >= 4]
    if len(words) < 2:
        return None
    hits = []
    for i, b in enumerate(blocks):
        if b["type"] not in ("paragraph", "list", "blockquote"):
            continue
        body = set(tokens(model.block_text(b)))
        if all(w in body for w in words):
            hits.append(i)
    return hits[0] if len(hits) == 1 else None


def pair_posters(videos, images):
    """{image filename: video filename} for stills that share a video's name."""
    out = {}
    stems = {stem(v).lower(): v for v in videos}
    for image in images:
        base = stem(image).lower()
        bare = POSTER_SUFFIX.sub("", base)
        if base in stems:
            out[image] = stems[base]
        elif bare != base and bare in stems:
            out[image] = stems[bare]
    return out


def pair_tracks(videos, subtitles):
    """{subtitle filename: (media filename, language or None)} — `demo.en.vtt` belongs to `demo.mp4`."""
    out = {}
    stems = {stem(v).lower(): v for v in videos}
    for sub in subtitles:
        base = stem(sub).lower()
        lang = None
        m = re.match(r"^(.*?)[._-]([a-z]{2,3}(?:-[a-z]{2,4})?)$", base)
        if base in stems:
            out[sub] = (stems[base], None)
        elif m and m.group(1) in stems:
            out[sub] = (stems[m.group(1)], m.group(2))
        elif len(stems) == 1 and len(subtitles) == 1:
            out[sub] = (next(iter(stems.values())), lang)
    return out
