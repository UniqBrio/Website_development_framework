#!/usr/bin/env python3
"""
audit_visuals.py — mechanical check of the rung-1 build contract
(website_workflow/asset_production.md) on BUILT html.

It reads the served HTML and its local CSS/JS as files. It does not render
the page: how a visual LOOKS is judged from screenshots
(checklists/premium_craft_bar.md). What it can prove is that the things a
reviewer forgets are present — a poster, a reduced-motion path, a pause
control, a text alternative, a provenance record.

Usage:
  python website_workflow/tools/audit_visuals.py <file.html | folder> [...]
  python website_workflow/tools/audit_visuals.py --self-test

Page conventions it reads (asset_production.md RUNG 1 item 11):
  data-visual="<slot>"         root element of a produced visual
  data-rung="1|2|3|4"          production rung
  data-animated="true|false"   whether it moves on its own
  data-sample="none|labelled"  whether it shows illustrative people/data
  [data-poster]                the static frame, inside the visual
  [data-motion-control="<slot>"]  the pause/play button for that visual
  [data-sample-label]          the on-page "illustrative" note
  <meta name="visual-concept" content="none: <reason>">
                               a page that deliberately ships no concept visual

Exit: 0 clear (warnings allowed) · 1 at least one FAIL · 2 bad invocation.
"""
import io, json, os, re, sys, tempfile
from html.parser import HTMLParser

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link",
        "meta", "param", "source", "track", "wbr"}


def read(p):
    return io.open(p, encoding="utf-8", errors="replace").read()


class Node:
    __slots__ = ("tag", "attrs", "parent", "children", "text")

    def __init__(self, tag, attrs, parent):
        self.tag, self.attrs, self.parent = tag, dict(attrs), parent
        self.children, self.text = [], ""

    def walk(self):
        yield self
        for c in self.children:
            yield from c.walk()

    def inner_text(self):
        return (self.text + " ".join(c.inner_text() for c in self.children)).strip()

    def has(self, name):
        return name in self.attrs


class Tree(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node("#root", [], None)
        self.cur = self.root

    def handle_starttag(self, tag, attrs):
        n = Node(tag, [(k, v if v is not None else "") for k, v in attrs], self.cur)
        self.cur.children.append(n)
        if tag not in VOID:
            self.cur = n

    def handle_startendtag(self, tag, attrs):
        n = Node(tag, [(k, v if v is not None else "") for k, v in attrs], self.cur)
        self.cur.children.append(n)

    def handle_endtag(self, tag):
        n = self.cur
        while n is not None and n.tag != tag:
            n = n.parent
        if n is not None and n.parent is not None:
            self.cur = n.parent

    def handle_data(self, data):
        self.cur.text += data


def local_assets(html_path, tree):
    """Inline + locally linked CSS and JS, so a rule in an external file counts."""
    base = os.path.dirname(os.path.abspath(html_path))
    css, js = [], []
    for n in tree.root.walk():
        if n.tag == "style":
            css.append(n.text)
        elif n.tag == "script":
            src = n.attrs.get("src", "")
            if not src:
                js.append(n.text)
            elif not re.match(r"^(?:[a-z]+:)?//", src):
                p = os.path.join(base, src.split("?")[0].lstrip("/"))
                if os.path.exists(p):
                    js.append(read(p))
        elif n.tag == "link" and "stylesheet" in n.attrs.get("rel", ""):
            href = n.attrs.get("href", "")
            if href and not re.match(r"^(?:[a-z]+:)?//", href):
                p = os.path.join(base, href.split("?")[0].lstrip("/"))
                if os.path.exists(p):
                    css.append(read(p))
    return "\n".join(css), "\n".join(js)


def text_alternative_ok(n):
    if n.attrs.get("aria-hidden") == "true":
        return True
    named = n.attrs.get("aria-label", "").strip() or n.attrs.get("aria-labelledby", "").strip()
    return n.attrs.get("role") == "img" and bool(named)


def load_provenance(html_path):
    """Slots with a provenance record: visuals.provenance.json beside the page
    (a list of records or {"visuals": [...]}) or any *.provenance.json there."""
    base = os.path.dirname(os.path.abspath(html_path))
    slots = set()
    for root, _dirs, files in os.walk(base):
        for f in files:
            if not f.endswith("provenance.json"):
                continue
            try:
                data = json.loads(read(os.path.join(root, f)))
            except ValueError:
                continue
            recs = data.get("visuals", [data]) if isinstance(data, dict) else data
            for r in recs:
                if isinstance(r, dict) and r.get("slot"):
                    slots.add(str(r["slot"]))
    return slots


def audit_page(path):
    """Returns (fails, warns, notes) for one html file."""
    fails, warns, notes = [], [], []
    tree = Tree()
    tree.feed(read(path))
    css, js = local_assets(path, tree)
    nodes = list(tree.root.walk())
    visuals = [n for n in nodes if n.has("data-visual")]
    slots = [n.attrs["data-visual"] for n in visuals]

    # 1 a concept decision exists for the page
    meta = [n for n in nodes if n.tag == "meta" and n.attrs.get("name") == "visual-concept"]
    declared_none = any(m.attrs.get("content", "").lower().startswith("none") for m in meta)
    if "hero" not in slots:
        if declared_none:
            reason = meta[0].attrs.get("content", "")
            if len(reason.split(":", 1)[-1].strip()) < 12:
                fails.append("visual-concept meta says none but gives no reason")
            else:
                notes.append(f"no hero concept visual — recorded reason: {reason}")
        else:
            fails.append('no element with data-visual="hero" and no '
                         '<meta name="visual-concept" content="none: reason"> — '
                         "the page has no concept decision")

    prov = load_provenance(path)
    animated_any = False
    for n in visuals:
        slot = n.attrs["data-visual"]
        tag = f'visual "{slot}"'
        rung = n.attrs.get("data-rung", "")
        if rung not in {"1", "2", "3", "4"}:
            fails.append(f"{tag}: data-rung missing or not 1-4")
        if not text_alternative_ok(n):
            fails.append(f'{tag}: no text alternative (role="img" + aria-label, or aria-hidden="true")')
        sample = n.attrs.get("data-sample", "")
        if sample not in {"none", "labelled"}:
            fails.append(f'{tag}: data-sample must be declared "none" or "labelled"')
        elif sample == "labelled":
            labels = [x for x in nodes if x.has("data-sample-label") and x.inner_text()]
            if not labels:
                fails.append(f"{tag}: shows sample data but the page has no visible [data-sample-label] note")
        if slot not in prov:
            fails.append(f"{tag}: no provenance record (visuals.provenance.json or *.provenance.json)")
        animated = n.attrs.get("data-animated", "")
        if animated not in {"true", "false"}:
            fails.append(f'{tag}: data-animated must be declared "true" or "false"')
        if animated == "true":
            animated_any = True
            if not any(x.has("data-poster") for x in n.walk()):
                fails.append(f"{tag}: animated but has no [data-poster] static frame in the HTML")
            ctrl = [x for x in nodes if x.attrs.get("data-motion-control") == slot]
            if not ctrl:
                fails.append(f'{tag}: animated but no [data-motion-control="{slot}"] pause button')
            else:
                c = ctrl[0]
                if c.tag != "button":
                    fails.append(f"{tag}: pause control is <{c.tag}>, must be a <button>")
                if not (c.attrs.get("aria-label", "").strip() or c.inner_text()):
                    fails.append(f"{tag}: pause control has no accessible name")
                if not c.has("aria-pressed"):
                    fails.append(f"{tag}: pause control does not expose state (aria-pressed)")

    # every canvas needs an alternative even when it is not a marked visual
    for n in nodes:
        if n.tag == "canvas" and not n.has("data-visual") and not text_alternative_ok(n):
            p = n.parent
            inside = False
            while p is not None:
                if p.has("data-visual"):
                    inside = text_alternative_ok(p) or n.attrs.get("aria-hidden") == "true"
                    break
                p = p.parent
            if not inside:
                fails.append("a <canvas> has no text alternative and is not inside a described visual")

    # reduced motion: CSS always; script too when something animates on its own
    has_motion_css = bool(re.search(r"@keyframes|transition\s*:|animation\s*:", css))
    if (has_motion_css or animated_any) and "prefers-reduced-motion" not in css:
        fails.append("motion present but no prefers-reduced-motion rule in the CSS")
    if animated_any:
        if "prefers-reduced-motion" not in js:
            fails.append("an animated visual exists but the script never checks "
                         "prefers-reduced-motion (a canvas loop ignores a CSS rule)")
        if not re.search(r"IntersectionObserver|visibilitychange", js):
            warns.append("animated visual: no IntersectionObserver / visibilitychange found — "
                         "confirm the loop stops off-screen")

    # no animated gif
    blob = read(path) + css
    gifs = sorted(set(re.findall(r"""[\w./-]+\.gif\b""", blob, re.I)))
    if gifs:
        fails.append("animated-GIF reference(s): " + ", ".join(gifs[:5]) +
                     " — ship code animation or WebM/MP4 with a poster")

    # one motion language: literal durations not routed through a motion token
    decl = re.findall(r"(?:transition|animation)(?:-duration)?\s*:\s*([^;}]+)", css)
    literal = set()
    for d in decl:
        if "var(--motion" in d:
            continue
        literal.update(re.findall(r"(?<![\w.-])(\d*\.?\d+m?s)\b", d))
    literal.discard("0s"); literal.discard("0ms")
    if len(literal) > 4:
        warns.append(f"{len(literal)} literal durations outside the motion tokens "
                     f"({', '.join(sorted(literal)[:8])}) — one motion language per page")

    notes.append(f"{len(visuals)} marked visual(s): " + (", ".join(slots) or "none"))
    return fails, warns, notes


def collect(targets):
    out = []
    for t in targets:
        if os.path.isdir(t):
            for root, _d, files in os.walk(t):
                out += [os.path.join(root, f) for f in sorted(files) if f.endswith(".html")]
        elif os.path.isfile(t):
            out.append(t)
        else:
            print(f"not found: {t}")
            sys.exit(2)
    return out


GOOD = """<!doctype html><html><head><style>
:root{--motion-base:300ms}.a{transition:opacity var(--motion-base)}
@media (prefers-reduced-motion: reduce){.a{transition:none}}</style></head><body>
<section><div data-visual="hero" data-rung="1" data-animated="true" data-sample="labelled"
 role="img" aria-label="People you met, linked to the events where you met them">
<svg data-poster></svg><canvas aria-hidden="true"></canvas></div>
<button data-motion-control="hero" aria-pressed="false">Pause animation</button>
<p data-sample-label>Sample people and events, for illustration.</p></section>
<script>if(matchMedia('(prefers-reduced-motion: reduce)').matches){}
new IntersectionObserver(function(){});</script></body></html>"""
BAD = """<!doctype html><html><head><style>.a{transition:all .3s}</style></head><body>
<section><div data-visual="hero" data-animated="true"><canvas></canvas></div>
<img src="loop.gif"></section><script>requestAnimationFrame(function(){})</script></body></html>"""


def self_test():
    """The checker is a mechanism, and mechanisms are tested (degraded_paths.md):
    it must pass a compliant page AND fail a non-compliant one."""
    d = tempfile.mkdtemp(prefix="audit_visuals_")
    good, bad, none = (os.path.join(d, n) for n in ("good", "bad", "none"))
    for p in (good, bad, none):
        os.makedirs(p)
    io.open(os.path.join(good, "index.html"), "w", encoding="utf-8").write(GOOD)
    io.open(os.path.join(good, "visuals.provenance.json"), "w", encoding="utf-8").write(
        json.dumps({"visuals": [{"slot": "hero", "rung": 1}]}))
    io.open(os.path.join(bad, "index.html"), "w", encoding="utf-8").write(BAD)
    io.open(os.path.join(none, "index.html"), "w", encoding="utf-8").write(
        '<html><head><meta name="visual-concept" content="none: legal page, type-only by design"></head><body></body></html>')
    gf, _gw, _ = audit_page(os.path.join(good, "index.html"))
    bf, _bw, _ = audit_page(os.path.join(bad, "index.html"))
    nf, _nw, _ = audit_page(os.path.join(none, "index.html"))
    expect_bad = ["data-rung", "text alternative", "data-sample", "provenance", "data-poster",
                  "pause button", "prefers-reduced-motion rule", "never checks", "GIF"]
    missing = [e for e in expect_bad if not any(e in f for f in bf)]
    ok = (not gf) and (not nf) and (not missing)
    print("self-test: compliant page ->", "PASS" if not gf else f"UNEXPECTED FAILS {gf}")
    print("self-test: recorded-none page ->", "PASS" if not nf else f"UNEXPECTED FAILS {nf}")
    print(f"self-test: non-compliant page -> {len(bf)} fails raised"
          + ("" if not missing else f"; NOT raised: {missing}"))
    print("SELF-TEST", "PASS" if ok else "FAIL")
    return 0 if ok else 1


def main():
    args = sys.argv[1:]
    if args == ["--self-test"]:
        sys.exit(self_test())
    if not args or any(a.startswith("--") for a in args):
        print(__doc__)
        sys.exit(2)
    pages = collect(args)
    if not pages:
        print("no .html files found")
        sys.exit(2)
    total_f = total_w = 0
    print("\nVISUAL BUILD-CONTRACT AUDIT\n" + "=" * 72)
    for p in pages:
        f, w, n = audit_page(p)
        total_f += len(f); total_w += len(w)
        print(f"[{'FAIL' if f else 'PASS'}] {p}")
        for x in f:
            print(f"         FAIL  {x}")
        for x in w:
            print(f"         WARN  {x}")
        for x in n:
            print(f"         note  {x}")
    print("=" * 72)
    print(f"{len(pages)} page(s) | {total_f} FAIL | {total_w} WARN")
    print("RESULT:", "FAIL — fix before Gate 5." if total_f else
          "PASS (this proves the contract is present, not that the visual is good — "
          "run premium_craft_bar.md on screenshots)")
    sys.exit(1 if total_f else 0)


if __name__ == "__main__":
    main()
