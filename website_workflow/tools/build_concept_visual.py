#!/usr/bin/env python3
"""
build_concept_visual.py — turns a VISUAL SPEC into a finished concept
animation and every file a site or a campaign needs from it.

The spec is a small JSON file the pipeline writes from the product's
context (website_workflow/visual_concept.md STEP 6): the core idea, the
product's own nouns, an ARCHETYPE, the story content, the brand theme.
This tool does the rest, the same way for every product:

  <slot>.embed.html        the live animation: markup + CSS to paste into a page
  concept_visual.js        the runtime it needs (one copy per site)
  <slot>.preview.html      a standalone page showing it
  <slot>-poster.webp/.png  the static frame (first paint, reduced motion, share)
  <slot>.gif               a real GIF — for email, social, decks. NOT for the site.
  <slot>.mp4 / .webm       looping video — for hosts that cannot run the embed
  <slot>.provenance.json   what made it, from what, how heavy

Usage:
  python website_workflow/tools/build_concept_visual.py <spec.json> --out <dir>
  python website_workflow/tools/build_concept_visual.py --examples <dir>
  python website_workflow/tools/build_concept_visual.py --self-test
  python website_workflow/tools/build_concept_visual.py --archetypes

Exit codes — each a designed outcome (degraded_paths.md):
  0  built; every export listed in the manifest was written
  1  the SPEC is invalid — the reasons are printed; nothing is written
  2  bad invocation
  5  embed + preview written, but exports were NOT produced because the
     browser toolchain is missing; the manifest says which and why

Exports need Playwright (frames) and ffmpeg (GIF, MP4, WebM). Without
ffmpeg the GIF falls back to Pillow and video is reported as not produced —
never silently skipped.
"""
import argparse, datetime, hashlib, io, json, os, re, shutil, subprocess, sys, tempfile

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.join(HERE, "concept_visual")
RUNTIME = os.path.join(KIT, "concept_visual.js")
FRAMES = os.path.join(KIT, "render_frames.mjs")
EXAMPLES = os.path.join(KIT, "examples")

ARCHETYPES = {
    "object-graph": "A hub, groups around it, items in each group; the verb travels hub → group → item "
                    "and lands as a kept state. Use when the value is a RELATIONSHIP between things "
                    "(people, accounts, suppliers, devices, records).",
    "flow": "Stages in order; one item at a time moves through them and each stage says what the product "
            "does there. Use when the value is a PROCESS that used to need chasing.",
    "before-after": "Scattered things resolve, one by one, into one ordered place. Use when the value is "
                    "ORDER out of a mess the audience recognises.",
}
THEME_KEYS = ["bg", "surface", "text", "muted", "accent", "accent2", "success"]
HEX = re.compile(r"^#[0-9a-fA-F]{6}$")


def read(p):
    return io.open(p, encoding="utf-8").read()


def lum(hexcol):
    def ch(v):
        v /= 255.0
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    n = int(hexcol[1:], 16)
    return 0.2126 * ch(n >> 16 & 255) + 0.7152 * ch(n >> 8 & 255) + 0.0722 * ch(n & 255)


def contrast(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def validate(spec):
    """Returns (errors, warnings). An error blocks the build."""
    E, Wn = [], []

    def need(cond, msg):
        if not cond:
            E.append(msg)

    def text(obj, key, where, lo, hi):
        v = obj.get(key) if isinstance(obj, dict) else None
        if not isinstance(v, str) or not v.strip():
            E.append(f"{where}.{key}: missing")
        elif not lo <= len(v) <= hi:
            E.append(f"{where}.{key}: {len(v)} characters — must be {lo}-{hi} to stay legible in the frame")

    need(isinstance(spec, dict), "spec must be a JSON object")
    if E:
        return E, Wn
    text(spec, "slot", "spec", 1, 32)
    if isinstance(spec.get("slot"), str) and not re.match(r"^[a-z0-9-]+$", spec["slot"]):
        E.append("spec.slot: lowercase letters, digits and hyphens only")
    text(spec, "product", "spec", 1, 80)
    text(spec, "core_idea", "spec", 40, 320)
    ci = spec.get("core_idea") or ""
    if ci and not re.search(r"\bturns\b.+\binto\b.+\bby\b", ci):
        Wn.append('core_idea does not follow "For <who>, <product> turns <before> into <after> by <mechanism>" '
                  "(visual_concept.md STEP 1) — a visual built on a vague idea shows a vague idea")
    text(spec, "alt", "spec", 40, 400)
    arch = spec.get("archetype")
    need(arch in ARCHETYPES, f"spec.archetype: must be one of {', '.join(ARCHETYPES)}")
    sd = spec.get("sample_data")
    need(sd in ("none", "labelled"), 'spec.sample_data: declare "none" or "labelled"')
    if sd == "labelled":
        text(spec, "sample_note", "spec", 10, 80)

    th = spec.get("theme") or {}
    for k in THEME_KEYS:
        need(isinstance(th.get(k), str) and HEX.match(th.get(k) or ""), f"theme.{k}: a 6-digit hex colour is required")
    if not [e for e in E if e.startswith("theme.")]:
        on_acc = th.get("onAccent", th["bg"])
        checks = [("text on bg", th["text"], th["bg"], 4.5), ("text on surface", th["text"], th["surface"], 4.5),
                  ("muted on surface", th["muted"], th["surface"], 4.5), ("muted on bg", th["muted"], th["bg"], 4.5),
                  ("accent on bg (lines, rings)", th["accent"], th["bg"], 3.0),
                  ("success on surface", th["success"], th["surface"], 3.0),
                  ("onAccent on accent", on_acc, th["accent"], 4.5),
                  ("onAccent2 on accent2", th.get("onAccent2", th["text"]), th["accent2"], 4.5)]
        for name, fg, bg, floor in checks:
            r = contrast(fg, bg)
            if r < floor:
                E.append(f"theme contrast: {name} is {r:.2f}:1, needs {floor}:1")

    def duration_ok(seconds):
        need(seconds <= 20.5, f"loop is {seconds:.1f} s — the ceiling is 20 s (animation_library.md category 9)")

    if arch == "object-graph":
        text(spec.get("hub") or {}, "label", "hub", 1, 8)
        groups, nodes, story = spec.get("groups") or [], spec.get("nodes") or [], spec.get("story") or []
        need(2 <= len(groups) <= 5, "groups: 2-5 are needed")
        for i, g in enumerate(groups):
            text(g, "label", f"groups[{i}]", 2, 22)
        need(3 <= len(nodes) <= 12, "nodes: 3-12 are needed")
        ids = [n.get("id") for n in nodes if isinstance(n, dict)]
        need(len(set(ids)) == len(ids), "nodes: ids must be unique")
        for i, n in enumerate(nodes):
            text(n, "id", f"nodes[{i}]", 1, 3)
            need(isinstance(n.get("group"), int) and 0 <= n.get("group", -1) < max(1, len(groups)),
                 f"nodes[{i}].group: must index a group")
        need(1 <= len(story) <= 3, "story: 1-3 node ids (each is one 6-second beat)")
        for sid in story:
            n = next((x for x in nodes if x.get("id") == sid), None)
            if n is None:
                E.append(f"story: '{sid}' is not a node id")
                continue
            text(n, "title", f"node {sid}", 2, 28)
            if n.get("subtitle"):
                text(n, "subtitle", f"node {sid}", 2, 36)
            facts = n.get("facts") or []
            need(1 <= len(facts) <= 3, f"node {sid}.facts: 1-3 [label, value] pairs")
            for f in facts:
                need(isinstance(f, list) and len(f) == 2 and len(str(f[0])) <= 10 and 2 <= len(str(f[1])) <= 44,
                     f"node {sid}.facts: each is [label ≤10 chars, value 2-44 chars]")
        st = spec.get("status") or {}
        text(st, "ready", "status", 2, 28)
        text(st, "done", "status", 2, 28)
        duration_ok(6 * len(story))
    elif arch == "flow":
        stages, items = spec.get("stages") or [], spec.get("items") or []
        need(3 <= len(stages) <= 5, "stages: 3-5 are needed")
        for i, s in enumerate(stages):
            text(s, "label", f"stages[{i}]", 2, 22)
            text(s, "caption", f"stages[{i}]", 8, 90)
        need(1 <= len(items) <= 3, "items: 1-3 are needed")
        for i, it in enumerate(items):
            text(it, "label", f"items[{i}]", 2, 26)
            if it.get("detail"):
                text(it, "detail", f"items[{i}]", 2, 30)
        if spec.get("done"):
            text(spec["done"], "label", "done", 4, 90)
        duration_ok((len(stages) * 1.7 + 1.5) * len(items))
    elif arch == "before-after":
        b, a = spec.get("before") or {}, spec.get("after") or {}
        text(b, "label", "before", 4, 40)
        items, rows = b.get("items") or [], a.get("rows") or []
        need(3 <= len(items) <= 6, "before.items: 3-6 are needed")
        need(len(rows) == len(items), "after.rows: one row per before item, in the same order")
        for i, s in enumerate(items):
            need(isinstance(s, str) and 2 <= len(s) <= 24, f"before.items[{i}]: 2-24 characters")
        text(a, "title", "after", 2, 28)
        for i, r in enumerate(rows):
            text(r, "label", f"after.rows[{i}]", 2, 26)
            if r.get("value"):
                text(r, "value", f"after.rows[{i}]", 1, 10)
        if a.get("summary"):
            text(a, "summary", "after", 4, 36)
        duration_ok(1.6 + (max(1, len(items)) - 1) * 0.6 + 0.9 + 3.0 + 1.3)
    return E, Wn


def esc(s):
    return (str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;"))


def embed_html(spec, poster_src):
    """The paste-in block. Markers are the ones tools/audit_visuals.py reads."""
    th, slot = spec["theme"], spec["slot"]
    on_acc = th.get("onAccent", th["bg"])
    css_vars = "".join(f"--cv-{re.sub(r'([A-Z0-9])', lambda m: '-' + m.group(1).lower(), k)}:{th[k]};"
                       for k in THEME_KEYS + ["onAccent", "onAccent2"] if th.get(k))
    fonts = "".join(f"--cv-font-{k}:{th[key]};" for k, key in
                    (("display", "fontDisplay"), ("body", "fontBody"), ("mono", "fontMono")) if th.get(key))
    data = json.dumps(spec, ensure_ascii=False).replace("</", "<\\/")
    sample = spec["sample_data"]
    note = (f'<p class="cv-note" data-sample-label>{esc(spec["sample_note"])}</p>' if sample == "labelled"
            else '<span></span>')
    return f"""<!-- CONCEPT VISUAL "{slot}" — generated by website_workflow/tools/build_concept_visual.py.
     Do not hand-edit: change the spec and rebuild. To use the SITE's colour tokens, override the
     --cv-* custom properties on .cv-{slot} with your semantic tokens (e.g. --cv-accent: var(--accent)). -->
<style>
.cv-{slot} {{ {css_vars}{fonts}
  --cv-motion: var(--motion-base, 320ms); --cv-ease: var(--ease-out, cubic-bezier(0.2, 0, 0, 1));
  position: relative; width: 100%; max-width: 720px; aspect-ratio: 1 / 0.94; }}
.cv-{slot} .cv-poster, .cv-{slot} canvas {{ position: absolute; inset: 0; width: 100%; height: calc(100% - 44px); }}
.cv-{slot} .cv-poster {{ object-fit: contain; transition: opacity var(--cv-motion) var(--cv-ease); }}
.cv-{slot} canvas {{ opacity: 0; transition: opacity var(--cv-motion) var(--cv-ease); }}
.cv-{slot}.is-live canvas {{ opacity: 1; }}
.cv-{slot}.is-live .cv-poster {{ opacity: 0; }}
.cv-{slot} .cv-bar {{ position: absolute; left: 0; right: 0; bottom: 0; height: 36px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }}
.cv-{slot} .cv-note {{ margin: 0; font: 400 11px/1.4 var(--cv-font-mono, ui-monospace, monospace); letter-spacing: 0.04em; color: var(--cv-muted); }}
.cv-{slot} .cv-toggle {{ display: inline-flex; align-items: center; gap: 8px; min-height: 36px; padding: 0 14px; border-radius: 999px; border: 1px solid var(--cv-muted); background: var(--cv-surface); color: var(--cv-text); font: 500 13px/1 var(--cv-font-body, system-ui, sans-serif); cursor: pointer; }}
.cv-{slot} .cv-toggle:focus-visible {{ outline: 2px solid var(--cv-accent); outline-offset: 3px; }}
html:not(.js) .cv-{slot} .cv-toggle {{ display: none; }}
@media (max-width: 480px) {{ .cv-{slot} {{ aspect-ratio: 1 / 1.6; }} }}
@media (prefers-reduced-motion: reduce) {{ .cv-{slot} .cv-poster, .cv-{slot} canvas {{ transition: none; }} }}
</style>
<div class="cv-{slot}" data-concept-visual data-visual="{slot}" data-rung="1" data-animated="true" data-sample="{sample}"
     role="img" aria-label="{esc(spec['alt'])}">
  <img class="cv-poster" data-poster src="{esc(poster_src)}" alt="" decoding="async">
  <canvas aria-hidden="true"></canvas>
  <script type="application/json">{data}</script>
  <div class="cv-bar">
    {note}
    <button class="cv-toggle" type="button" data-motion-control="{slot}" aria-pressed="false" aria-label="Pause animation"><span data-label>Pause</span></button>
  </div>
</div>
<script>document.documentElement.classList.add("js");</script>
<script src="concept_visual.js" defer></script>
<!-- on-accent colour for reference: {on_acc} -->
"""


def preview_html(spec, embed):
    th = spec["theme"]
    font = f'<link rel="stylesheet" href="{esc(th["font_url"])}">' if th.get("font_url") else ""
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(spec['product'])} — concept visual "{esc(spec['slot'])}"</title>{font}
<style>html,body{{margin:0;background:{th['bg']};}} body{{display:grid;place-items:center;min-height:100vh;}}
.stage{{width:min(100vw,800px);padding:0;box-sizing:border-box;}} .stage>div{{max-width:none;}}</style></head>
<body><div class="stage">
{embed}
</div></body></html>
"""


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, **kw)


def node_env():
    env = dict(os.environ)
    if not env.get("NODE_PATH"):
        r = run(["npm", "root", "-g"]) if shutil.which("npm") else None
        if r and r.returncode == 0:
            env["NODE_PATH"] = r.stdout.strip()
    return env


def build(spec_path, out, quiet=False):
    try:
        spec = json.loads(read(spec_path))
    except (OSError, ValueError) as e:
        print(f"cannot read spec {spec_path}: {e}")
        return 1, None
    errors, warns = validate(spec)
    if errors:
        print(f"SPEC INVALID — {spec_path}")
        for e in errors:
            print("  FAIL ", e)
        for w in warns:
            print("  WARN ", w)
        print("Nothing was written. Fix the spec and rebuild.")
        return 1, None
    spec = {k: v for k, v in spec.items() if not k.startswith("__")}
    slot = spec["slot"]
    os.makedirs(out, exist_ok=True)
    p = lambda name: os.path.join(out, name)
    shutil.copyfile(RUNTIME, p("concept_visual.js"))
    io.open(p(f"{slot}.spec.json"), "w", encoding="utf-8").write(json.dumps(spec, indent=2, ensure_ascii=False) + "\n")
    poster_name = f"{slot}-poster.webp"
    emb = embed_html(spec, poster_name)
    io.open(p(f"{slot}.embed.html"), "w", encoding="utf-8").write(emb)
    io.open(p(f"{slot}.preview.html"), "w", encoding="utf-8").write(preview_html(spec, emb))

    manifest = {"slot": slot, "archetype": spec["archetype"], "exports": {}, "not_produced": {}}
    code = 0
    tmp = tempfile.mkdtemp(prefix="concept_frames_")
    fps = 20
    info = None
    if not shutil.which("node"):
        manifest["not_produced"]["poster, gif, mp4, webm"] = "node is not installed"
        code = 5
    else:
        r = run(["node", FRAMES, "--page", p(f"{slot}.preview.html"), "--slot", slot, "--out", tmp,
                 "--fps", str(fps), "--width", "800", "--height", "752"], env=node_env())
        if r.returncode != 0:
            manifest["not_produced"]["poster, gif, mp4, webm"] = (r.stderr.strip().splitlines() or ["frame render failed"])[-1]
            code = 5
        else:
            info = json.loads(r.stdout.strip().splitlines()[-1])

    if info:
        # poster
        shutil.copyfile(os.path.join(tmp, "poster.png"), p(f"{slot}-poster.png"))
        try:
            from PIL import Image
            im = Image.open(p(f"{slot}-poster.png")).convert("RGB")
            if im.width > 1280:                          # the hero image budget, not the capture size
                im = im.resize((1280, round(im.height * 1280 / im.width)), Image.LANCZOS)
            im.save(p(poster_name), "WEBP", quality=76, method=6)
            im.save(p(f"{slot}-poster.png"), optimize=True)
        except ImportError:
            Image = None
            shutil.copyfile(p(f"{slot}-poster.png"), p(poster_name))   # keeps the embed's src valid
            manifest["not_produced"]["poster as WebP"] = "Pillow not installed — the .webp file is a PNG copy"
        seq = os.path.join(tmp, "f_%05d.png")
        if shutil.which("ffmpeg"):
            jobs = {
                f"{slot}.gif": ["-vf", "fps=12,scale=600:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=160:"
                                       "stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle",
                                "-loop", "0"],
                f"{slot}.mp4": ["-vf", "scale=800:-2", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "22",
                                "-movflags", "+faststart", "-an"],
                f"{slot}.webm": ["-vf", "scale=800:-2", "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "36", "-an"],
            }
            for name, args in jobs.items():
                r = run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(fps), "-i", seq] + args + [p(name)])
                if r.returncode != 0 or not os.path.exists(p(name)):
                    manifest["not_produced"][name] = (r.stderr.strip().splitlines() or ["ffmpeg failed"])[-1][:160]
        else:
            manifest["not_produced"]["mp4, webm"] = "ffmpeg is not installed"
            if Image is not None:
                files = sorted(f for f in os.listdir(tmp) if f.startswith("f_"))[::2]      # 10 fps
                frames = [Image.open(os.path.join(tmp, f)).convert("RGB").resize((560, 526)) for f in files]
                frames[0].save(p(f"{slot}.gif"), save_all=True, append_images=frames[1:], duration=100, loop=0, optimize=True)
            else:
                manifest["not_produced"]["gif"] = "neither ffmpeg nor Pillow is installed"
        manifest["duration_s"] = info["duration"]
        manifest["poster_at_s"] = info["poster_at"]
    shutil.rmtree(tmp, ignore_errors=True)
    if manifest["not_produced"] and code == 0:
        code = 5 if any(k.startswith("poster,") for k in manifest["not_produced"]) else 0

    for f in sorted(os.listdir(out)):
        if f.startswith(slot) or f == "concept_visual.js":
            manifest["exports"][f] = os.path.getsize(p(f))
    prov = {"visuals": [{
        "slot": slot, "rung": 1,
        "technique": f"generated concept visual, archetype '{spec['archetype']}' (2D canvas, no dependencies)",
        "tool": "website_workflow/tools/build_concept_visual.py",
        "command": f"python website_workflow/tools/build_concept_visual.py {os.path.basename(spec_path)} --out <dir>",
        "spec": f"{slot}.spec.json", "spec_sha256": hashlib.sha256(json.dumps(spec, sort_keys=True).encode()).hexdigest(),
        "core_idea": spec["core_idea"],
        "source_inputs": "the spec only — every label in the frame is in the spec; no third-party asset",
        "sample_data": spec["sample_data"] + (f" — \"{spec['sample_note']}\"" if spec["sample_data"] == "labelled" else ""),
        "licence": "original work generated in the run",
        "alt_text": spec["alt"],
        "exports_bytes": manifest["exports"], "not_produced": manifest["not_produced"],
        "site_use": "embed the live visual; the poster is its first paint and reduced-motion frame. "
                    "The GIF is for off-site channels only and is never referenced from a page.",
        "status": "CANDIDATE — look at the poster and the GIF before it ships (asset_production.md SELF-CURATION)",
        "date": datetime.date.today().isoformat()}]}
    io.open(p(f"{slot}.provenance.json"), "w", encoding="utf-8").write(json.dumps(prov, indent=2, ensure_ascii=False) + "\n")

    if not quiet:
        print(f"BUILT  {spec['product']} — slot '{slot}', archetype '{spec['archetype']}'"
              + (f", loop {manifest['duration_s']:.1f} s" if "duration_s" in manifest else ""))
        for f, b in manifest["exports"].items():
            print(f"  {b / 1024:8.1f} KB  {os.path.join(out, f)}")
        for k, why in manifest["not_produced"].items():
            print(f"  NOT PRODUCED  {k}: {why}")
        for w in warns:
            print("  WARN ", w)
        print("  next: look at the poster and the GIF (SELF-CURATION), then paste the embed into the page.")
    return code, manifest


def self_test():
    """Spec validation only — no browser. Every shipped example must pass, and
    each named defect must be caught (a validator that accepts everything is
    not a validator)."""
    ok = True
    for f in sorted(os.listdir(EXAMPLES)):
        e, _w = validate(json.loads(read(os.path.join(EXAMPLES, f))))
        print(f"self-test: example {f:<44} -> {'PASS' if not e else 'FAIL ' + str(e)}")
        ok = ok and not e
    base = json.loads(read(os.path.join(EXAMPLES, "personal-crm.object-graph.json")))

    def broken(name, mutate, expect):
        nonlocal ok
        s = json.loads(json.dumps(base)); mutate(s)
        e, _w = validate(s)
        hit = any(expect in x for x in e)
        print(f"self-test: rejects {name:<44} -> {'PASS' if hit else 'NOT CAUGHT'}")
        ok = ok and hit

    broken("a missing text alternative", lambda s: s.pop("alt"), "alt")
    broken("an unknown archetype", lambda s: s.update(archetype="hologram"), "archetype")
    broken("undeclared sample data", lambda s: s.pop("sample_data"), "sample_data")
    broken("sample data with no on-page note", lambda s: s.pop("sample_note"), "sample_note")
    broken("unreadable text colour", lambda s: s["theme"].update(text="#333338"), "contrast")
    broken("a loop over 20 seconds", lambda s: s.update(story=["NR", "PS", "DV", "AM"]), "story")
    broken("a story node with no facts", lambda s: s["nodes"][0].pop("facts"), "facts")
    broken("a label too long for the frame", lambda s: s["groups"][0].update(label="x" * 40), "groups[0]")
    broken("a colour that is not a hex value", lambda s: s["theme"].update(accent="orange"), "theme.accent")
    print("SELF-TEST", "PASS" if ok else "FAIL", "(spec validation only — exports are proved by --examples)")
    return 0 if ok else 1


def main():
    ap = argparse.ArgumentParser(description="Build a concept animation and its exports from a visual spec.")
    ap.add_argument("spec", nargs="?")
    ap.add_argument("--out")
    ap.add_argument("--examples", metavar="DIR", help="build every shipped example into DIR/<name>/")
    ap.add_argument("--self-test", action="store_true")
    ap.add_argument("--archetypes", action="store_true", help="list the archetypes and when each fits")
    try:
        a = ap.parse_args()
    except SystemExit:
        sys.exit(2)
    if a.self_test:
        sys.exit(self_test())
    if a.archetypes:
        for k, v in ARCHETYPES.items():
            print(f"{k}\n    {v}")
        sys.exit(0)
    if a.examples:
        worst = 0
        for f in sorted(os.listdir(EXAMPLES)):
            code, _m = build(os.path.join(EXAMPLES, f), os.path.join(a.examples, f.split(".")[0]))
            worst = max(worst, code)
        sys.exit(worst)
    if not a.spec or not a.out:
        print(__doc__)
        sys.exit(2)
    code, _m = build(a.spec, a.out)
    sys.exit(code)


if __name__ == "__main__":
    main()
