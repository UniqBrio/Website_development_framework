"""Blog package ingestion: intake → validate → extract → associate → manifest.

    python website_workflow/tools/blog_ingest.py <files | folder | zip> --out <run dir>

Sources are opened read-only and never modified; everything written goes under
--out. The manifest lists an asset only when its bytes are in <out>/assets.
"""
import argparse
import datetime
import difflib
import fnmatch
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import unicodedata
import urllib.error
import urllib.parse
import urllib.request

from . import MANIFEST_SCHEMA, TOOL_NAME, TOOL_VERSION, associate, capabilities, detect, htmldoc, media, model, odf, ooxml, pdf, rtf, structured, textdoc
from .safety import EXECUTABLE_EXT, MAX_DOC_BYTES, MAX_FILE_BYTES, UnsafeInput, is_public_host, open_zip, safe_href, safe_member_path, sanitize_svg

PROSE = {"pdf", "docx", "doc", "rtf", "odt", "txt", "md", "html", "pptx", "ppt", "odp"}
DATA = {"json", "xml", "csv", "xlsx", "xls", "ods"}
PRESENTATION = {"pptx", "ppt", "odp"}
LEGACY = {"doc": "docx", "ppt": "pptx", "odp": "pptx", "xls": "xlsx", "ods": "xlsx"}
EXTRACTORS = {
    "pdf": pdf.extract, "docx": ooxml.extract_docx, "pptx": ooxml.extract_pptx, "xlsx": ooxml.extract_xlsx, "odt": odf.extract_odt,
    "rtf": rtf.extract, "md": textdoc.extract_markdown, "txt": textdoc.extract_text, "html": htmldoc.extract,
    "json": structured.extract_json, "xml": structured.extract_xml, "csv": structured.extract_csv,
}
JUNK = re.compile(r"(^|/)(__MACOSX|\.git|\.svn|node_modules)(/|$)|(^|/)(\.DS_Store|Thumbs\.db|desktop\.ini|~\$[^/]*|\.[^/]+)$")
CAPTION = re.compile(r"^\s*(figure|fig\.?|image|photo|chart|graph|diagram|illustration|infographic|video|table|source|credit|caption)\s*\d{0,3}\s*[:.–—-]\s*\S", re.I)
ROLE_HEADINGS = (
    ("introduction", re.compile(r"^(introduction|intro|overview|preface|foreword)$", re.I)),
    ("conclusion", re.compile(r"^(conclusion|conclusions|summary|final thoughts|closing thoughts|wrapping up|wrap[- ]up|key takeaways|takeaways|the bottom line|in summary)$", re.I)),
    ("references", re.compile(r"^(references|sources|bibliography|citations|further reading|works cited|notes and references|resources)$", re.I)),
    ("cta", re.compile(r"^(call to action|next steps?|get started|ready to .+|book a .+|try .+ today|contact us|get in touch)\??!?$", re.I)),
)
FILENAME_ALT = re.compile(r"^\s*((image|picture|img|photo|graphic|shape|chart|object|screenshot)\s*\d*|[\w\- .()]+\.(png|jpe?g|gif|webp|svg|bmp|tiff?|emf|wmf|heic))\s*$", re.I)


def sha256_file(path):
    digest = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def slugify(value, fallback="blog"):
    value = unicodedata.normalize("NFKD", value or "").encode("ascii", "ignore").decode("ascii").lower()
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value[:80].strip("-") or fallback


def natural(value):
    return [int(p) if p.isdigit() else p.lower() for p in re.split(r"(\d+)", value)]


class Entry:
    def __init__(self, path, rel, origin):
        self.path, self.rel, self.origin = path, rel.replace(os.sep, "/"), origin
        self.size = os.path.getsize(path)
        self.info = detect.detect(path)
        self.format = self.info["format"]
        self.corrupt = self.info.get("special") == "corrupt"
        if self.corrupt and detect.category(self.info.get("extensionFormat")) == "document":
            self.format = self.info["extensionFormat"]      # its extractor reports DOCUMENT_CORRUPT for this file alone
        self.category = detect.category(self.format)
        self.sha256 = None
        self.role = None
        self.status = "accepted"
        self.note = None

    @property
    def name(self):
        return os.path.basename(self.rel)

    @property
    def folder(self):
        return os.path.dirname(self.rel)

    def record(self):
        out = {"path": self.rel, "bytes": self.size, "sha256": self.sha256, "detectedFormat": self.format, "detectedBy": self.info["by"],
               "category": self.category, "role": self.role, "status": self.status, "origin": self.origin}
        if self.info.get("mismatch"):
            out["extensionFormat"] = self.info.get("extensionFormat")
        if self.note:
            out["note"] = self.note
        return out


class Ctx:
    def __init__(self, out, options):
        self.out, self.options = out, options
        self.work = os.path.join(out, "work")
        self.corrupt = {}                     # lower-cased file name → the format it claimed to be
        os.makedirs(self.work, exist_ok=True)

    def scratch(self, name):
        return tempfile.mkdtemp(prefix=name + "-", dir=self.work)


# ================================================================ intake
def intake(inputs, ctx):
    entries, issues = [], []

    def add(path, rel, origin):
        if JUNK.search(rel.replace(os.sep, "/")):
            return
        if os.path.islink(path) or not os.path.isfile(path):
            return
        entry = Entry(path, rel, origin)
        ext = os.path.splitext(path)[1].lower()
        if entry.size == 0:
            entry.status, entry.note = "rejected", "empty file"
            issues.append(model.issue("FILE_EMPTY", "warning", "%s is empty (0 bytes)." % entry.rel, "Upload the file again; it may not have finished saving or uploading.", document=entry.rel))
        elif entry.size > MAX_FILE_BYTES:
            entry.status, entry.note = "rejected", "larger than the %d MB limit" % (MAX_FILE_BYTES // 2**20)
            issues.append(model.issue("FILE_TOO_LARGE", "error", "%s is %d MB, above the %d MB limit." % (entry.rel, entry.size // 2**20, MAX_FILE_BYTES // 2**20),
                                      "Compress the file or host large video externally and supply the link.", document=entry.rel))
        elif ext in EXECUTABLE_EXT or entry.info.get("special") == "executable":
            entry.status, entry.note = "rejected", "executable or script"
            issues.append(model.issue("FILE_REJECTED_UNSAFE", "warning", "%s is an executable or script and was not processed." % entry.rel,
                                      "Remove it from the package. If it is content, supply it as a document or as text in a code block.", document=entry.rel))
        elif entry.corrupt and entry.format is None:
            kind = detect.category(entry.info.get("extensionFormat"))
            entry.status, entry.note = "rejected", "corrupt: the content is not a %s file" % entry.info.get("extensionFormat")
            ctx.corrupt[entry.name.lower()] = entry.info.get("extensionFormat")
            issues.append(model.issue("ARCHIVE_CORRUPT" if kind == "archive" else "MEDIA_CORRUPT", "warning",
                                      "%s is named as a %s file but its content is not one; it is corrupt or truncated and was not used." % (entry.rel, str(entry.info.get("extensionFormat")).upper()),
                                      "Export or copy the file again and re-upload it.", document=entry.rel))
        elif entry.format is None:
            entry.status, entry.note = "ignored", "unrecognised format"
            issues.append(model.issue("FILE_UNSUPPORTED", "warning", "%s is not a supported document or media format and was not processed." % entry.rel,
                                      "Convert it to a supported format (see blog_publishing.md) or remove it from the package.", document=entry.rel))
        elif entry.info.get("mismatch") and not entry.corrupt:
            issues.append(model.issue("FILE_TYPE_MISMATCH", "warning", "%s has the extension of a %s file but its content is %s; it was processed as %s." % (
                entry.rel, entry.info.get("extensionFormat"), entry.format, entry.format), "Rename the file with the correct extension to remove this warning.", document=entry.rel))
        if entry.status == "accepted":
            entry.sha256 = sha256_file(path)
        entries.append(entry)

    def add_dir(root, prefix, origin):
        for base, dirs, files in os.walk(root):
            dirs[:] = sorted(d for d in dirs if not JUNK.search(d + "/") and not os.path.islink(os.path.join(base, d)))
            for name in sorted(files, key=natural):
                full = os.path.join(base, name)
                add(full, os.path.join(prefix, os.path.relpath(full, root)), origin)

    def add_zip(path, label):
        target = ctx.scratch("unzip")
        try:
            with open_zip(path) as zf:
                skipped = 0
                for info in zf.infolist():
                    if info.is_dir():
                        continue
                    if (info.external_attr >> 16) & 0o170000 == 0o120000:      # symlink entry
                        skipped += 1
                        continue
                    dest = safe_member_path(target, info.filename)
                    if dest is None:
                        skipped += 1
                        continue
                    os.makedirs(os.path.dirname(dest), exist_ok=True)
                    with zf.open(info) as src, open(dest, "wb") as dst:
                        shutil.copyfileobj(src, dst, 1 << 20)
                if skipped:
                    issues.append(model.issue("ARCHIVE_ENTRIES_SKIPPED", "warning", "%d entr%s in %s pointed outside the archive or were links, and were not extracted." % (
                        skipped, "y" if skipped == 1 else "ies", label), "Re-create the archive from a plain folder.", document=label))
        except UnsafeInput as error:
            issues.append(model.issue("ARCHIVE_REJECTED", "error", "%s was not unpacked: %s." % (label, error), "Supply the files in a smaller, unprotected ZIP or as a folder.", document=label))
            return
        except Exception as error:
            issues.append(model.issue("ARCHIVE_CORRUPT", "error", "%s could not be opened as a ZIP archive (%s)." % (label, type(error).__name__), "Re-create the archive and upload it again.", document=label))
            return
        tops = [n for n in os.listdir(target) if not JUNK.search(n)]
        root = os.path.join(target, tops[0]) if len(tops) == 1 and os.path.isdir(os.path.join(target, tops[0])) else target
        add_dir(root, "", "archive:" + label)

    for raw in inputs:
        path = os.path.abspath(raw)
        if not os.path.exists(path):
            issues.append(model.issue("INPUT_NOT_FOUND", "error", "%s does not exist." % raw, "Check the path and run the ingest again."))
        elif os.path.isdir(path):
            add_dir(path, "", "folder:" + os.path.basename(path.rstrip(os.sep)))
        elif detect.detect(path)["format"] == "zip":
            add_zip(path, os.path.basename(path))
        else:
            add(path, os.path.basename(path), "file")
    nested = [e for e in entries if e.format == "zip"]
    for entry in nested:
        entry.status, entry.note = "ignored", "archive inside the package"
        issues.append(model.issue("NESTED_ARCHIVE_IGNORED", "warning", "%s is an archive inside the package and was not unpacked." % entry.rel,
                                  "Unpack it and supply its files directly.", document=entry.rel))
    seen = {}
    for entry in entries:                                # the same relative path supplied twice
        if entry.status == "accepted":
            if entry.rel.lower() in seen:
                stem, ext = os.path.splitext(entry.rel)
                entry.rel = "%s (%d)%s" % (stem, len(seen), ext)
            seen[entry.rel.lower()] = entry
    return entries, issues


# ================================================================ sidecar & grouping
def load_sidecar(entries, explicit, issues):
    data, source = None, None
    if explicit:
        try:
            with open(explicit, "rb") as fh:
                data, source = json.loads(fh.read().decode("utf-8-sig")), os.path.basename(explicit)
        except (OSError, ValueError) as error:
            issues.append(model.issue("SIDECAR_INVALID", "error", "The sidecar file %s could not be read (%s)." % (explicit, error), "Fix the JSON and run the ingest again."))
    for entry in entries:
        if entry.status != "accepted" or entry.format != "json":
            continue
        try:
            with open(entry.path, "rb") as fh:
                candidate = json.loads(fh.read().decode("utf-8-sig"))
        except (OSError, ValueError):
            continue
        if structured.is_sidecar(candidate):
            entry.role = "sidecar"
            if data is None:
                data, source = candidate, entry.rel
            else:
                issues.append(model.issue("SIDECAR_DUPLICATE", "warning", "More than one instruction file was supplied; %s was used and %s was ignored." % (source, entry.rel),
                                          "Merge the instructions into one file."))
    if data is not None and not isinstance(data, dict):
        issues.append(model.issue("SIDECAR_INVALID", "error", "The sidecar file must hold a JSON object.", "See blog_publishing.md for the sidecar format."))
        data = None
    return data or {}, source


class Plan:
    def __init__(self, index):
        self.id = "blog-%d" % index
        self.docs, self.assets, self.config, self.issues = [], [], {}, []
        self.basis = "single document"
        self.virtual = None                    # pre-extracted results (feed entries)


def _match(entries, wanted):
    wanted = wanted.replace("\\", "/")
    hits = [e for e in entries if e.rel.lower() == wanted.lower()] or [e for e in entries if e.name.lower() == os.path.basename(wanted).lower()]
    if not hits and any(ch in wanted for ch in "*?["):
        hits = [e for e in entries if fnmatch.fnmatch(e.rel.lower(), wanted.lower()) or fnmatch.fnmatch(e.name.lower(), wanted.lower())]
    return hits


def _series(docs):
    """True when document names are one numbered series: `post-part1`, `post-part2` or `01-intro`, `02-body`."""
    stems = [os.path.splitext(d.name)[0].lower() for d in docs]
    stripped = [re.sub(r"(^\d+[-_ .]*)|([-_ .]*(part|pt|section|chapter|ch)?[-_ .]*\d+$)", "", s) for s in stems]
    numbered = all(re.search(r"\d", s) for s in stems)
    lead = all(re.match(r"^\d+", s) for s in stems)
    return numbered and (lead or len(set(stripped)) == 1)


TEXT_SOURCES = {"md", "txt", "html", "json", "xml"}


def named_in(entry, cache={}):
    """Lower-cased text of a text-format document, for finding the file names it refers to."""
    if entry.format not in TEXT_SOURCES:
        return ""
    if entry.path not in cache:
        try:
            with open(entry.path, "rb") as fh:
                cache[entry.path] = fh.read(4 * 1024 * 1024).decode("utf-8", "replace").lower()
        except OSError:
            cache[entry.path] = ""
    return cache[entry.path]


def refers_to(entry, other):
    text = named_in(entry)
    if not text:
        return False
    name = other.name.lower()
    from urllib.parse import quote
    return bool(re.search(r"(?<![\w.-])" + re.escape(name) + r"(?![\w-])", text)) or quote(name) in text


def group(entries, sidecar, options, issues):
    live = [e for e in entries if e.status == "accepted" and e.role != "sidecar"]
    prose = [e for e in live if e.format in PROSE]
    # A document that another document links to or embeds is that document's attachment, not a blog of its own.
    attached = {id(d) for d in prose if any(o is not d and refers_to(o, d) and not refers_to(d, o) for o in prose)}
    prose = [d for d in prose if id(d) not in attached]
    documents = prose or [e for e in live if e.format in DATA]
    for e in documents:
        e.role = "document"
    others = [e for e in live if e not in documents]
    for e in others:
        e.role = "asset"
    plans, unassigned = [], []
    if not documents:
        return plans, others

    if isinstance(sidecar.get("blogs"), list) and sidecar["blogs"]:
        claimed = set()
        for i, spec in enumerate(sidecar["blogs"], 1):
            plan = Plan(i)
            plan.config, plan.basis = dict(spec), "sidecar"
            for wanted in spec.get("documents", []):
                hits = [h for h in _match(documents, wanted) if h not in claimed]
                if not hits:
                    plan.issues.append(model.issue("SIDECAR_DOCUMENT_NOT_FOUND", "error", 'The instruction file lists the document "%s", which was not supplied.' % wanted,
                                                   "Upload the document or correct its name in the instruction file."))
                plan.docs.extend(hits)
                claimed.update(hits)
            for wanted in spec.get("assetFiles", []):
                plan.assets.extend(_match(others, wanted))
            plans.append(plan)
        loose = [d for d in documents if d not in claimed]
        for d in loose:
            d.role, d.status, d.note = "unassigned", "ignored", "not listed under any blog in the instruction file"
            issues.append(model.issue("DOCUMENT_UNASSIGNED", "warning", "%s is not listed under any blog in the instruction file and was not processed." % d.rel,
                                      "Add it to a blog's documents list, or remove it from the package.", document=d.rel))
        plans = [p for p in plans if p.docs]
    elif options.single_blog or sidecar.get("singleBlog") or isinstance(sidecar.get("documents"), list):
        plan = Plan(1)
        plan.config = dict(sidecar)
        if isinstance(sidecar.get("documents"), list):
            for wanted in sidecar["documents"]:
                hits = _match(documents, wanted)
                if not hits:
                    plan.issues.append(model.issue("SIDECAR_DOCUMENT_NOT_FOUND", "error", 'The instruction file lists the document "%s", which was not supplied.' % wanted,
                                                   "Upload the document or correct its name in the instruction file."))
                plan.docs.extend(h for h in hits if h not in plan.docs)
            plan.docs.extend(d for d in sorted(documents, key=lambda e: natural(e.rel)) if d not in plan.docs and options.single_blog)
            plan.basis = "sidecar document order"
        else:
            plan.docs = sorted(documents, key=lambda e: natural(e.rel))
            plan.basis = "single blog requested"
        for d in documents:
            if d not in plan.docs:
                d.role = "asset"
                others.append(d)
        plans = [plan]
    else:
        folders = {}
        for d in documents:
            folders.setdefault(d.folder, []).append(d)
        index = 0
        for folder in sorted(folders, key=natural):
            docs = sorted(folders[folder], key=lambda e: natural(e.name))
            if len(docs) == 1 or _series(docs):
                index += 1
                plan = Plan(index)
                plan.docs = docs
                plan.basis = "single document" if len(docs) == 1 else "numbered series in one folder"
                plans.append(plan)
            else:
                stems = {}
                for d in docs:
                    stems.setdefault(os.path.splitext(d.name)[0].lower(), []).append(d)
                for d in docs:
                    index += 1
                    plan = Plan(index)
                    plan.docs = [d]
                    plan.basis = "one blog per document"
                    twins = [x.name for x in stems[os.path.splitext(d.name)[0].lower()] if x is not d]
                    if twins:
                        plan.issues.append(model.issue(
                            "SOURCE_FORMAT_CONFLICT", "error",
                            "%s and %s look like the same blog in two formats. Which one is authoritative is not something to guess: their text or media may differ." % (d.name, ", ".join(twins)),
                            "Supply only the authoritative document (prefer the editable source over a PDF export), or name the documents to use in an instruction file.", document=d.rel))
                    elif not options.separate_blogs:
                        plan.issues.append(model.issue(
                            "GROUPING_UNCONFIRMED", "warning",
                            "%d documents were supplied together (%s) with nothing saying whether they form one blog or several; each was treated as its own blog." % (
                                len(docs), ", ".join(x.name for x in docs)),
                            "Confirm: run again with --single-blog (parts of one blog, in name order) or --separate-blogs, or list them in an instruction file."))
                    plans.append(plan)
        if len(plans) == 1:
            plans[0].config = dict(sidecar)

    # ---- assets → blogs
    if len(plans) == 1:
        plans[0].assets.extend(a for a in others if a not in plans[0].assets)
    else:
        for asset in others:
            if any(asset in p.assets for p in plans):
                continue
            owners = [p for p in plans if any(refers_to(d, asset) for d in p.docs)]
            if len(owners) != 1:
                owners = [p for p in plans if any(asset.folder == d.folder or asset.folder.startswith(d.folder + "/") for d in p.docs if d.folder)]
            if len(owners) != 1:
                prefixed = [p for p in plans if any(asset.name.lower().startswith(os.path.splitext(d.name)[0].lower()) for d in p.docs)]
                owners = prefixed if len(prefixed) == 1 else []
            if len(owners) == 1:
                owners[0].assets.append(asset)
            else:
                unassigned.append(asset)
    return plans, unassigned


# ================================================================ assets
def _safe_name(filename):
    stem, ext = os.path.splitext(os.path.basename(filename))
    return slugify(stem, "asset"), ext.lower()


class AssetStore:
    def __init__(self, ctx, blog_id, issues):
        self.ctx, self.blog_id, self.issues = ctx, blog_id, issues
        self.folder = os.path.join(ctx.out, "assets", blog_id)
        self.by_sha, self.by_rel, self.by_name, self.assets = {}, {}, {}, []

    def add(self, path, filename, origin, source_document=None, rel=None):
        """Copy one file into the run's asset folder and describe it. Returns the asset, or None if unusable."""
        info = detect.detect(path)
        fmt = info["format"]
        category = detect.category(fmt)
        sha = sha256_file(path)
        if sha in self.by_sha:
            asset = self.by_sha[sha]
            if filename not in asset["sourceNames"]:
                asset["sourceNames"].append(filename)
                if origin == "supplied" or asset["origin"] == "supplied":
                    self.issues.append(model.issue("MEDIA_DUPLICATE", "info", "%s is identical to %s; one copy is kept and both names point to it." % (filename, asset["filename"]),
                                                   "No action needed. Remove the duplicate from the package to tidy it.", asset=asset["id"]))
            if origin == "supplied":
                asset["origin"] = "supplied" if asset["origin"] == "supplied" else "embedded+supplied"
            self._index(asset, filename, rel)
            return asset
        if info.get("special") == "corrupt":
            self.ctx.corrupt[os.path.basename(filename).lower()] = info.get("extensionFormat")
            self.issues.append(model.issue("MEDIA_CORRUPT", "warning", "%s%s is named as a %s file but its content is not one; it is corrupt or truncated and was not used." % (
                filename, (" (embedded in %s)" % source_document) if source_document else "", str(info.get("extensionFormat")).upper()),
                "Export or copy the file again and re-upload it.", document=source_document))
            return None
        if fmt is None or category == "other":
            self.issues.append(model.issue("MEDIA_UNRECOGNISED", "warning", "%s%s is not a recognised media format and was not carried over." % (
                filename, (" (embedded in %s)" % source_document) if source_document else ""), "Supply it as PNG, JPEG, WebP, GIF, SVG, MP4 or WebM.", document=source_document))
            return None
        notes, converted_from = [], None
        work = path
        if fmt == "svg":
            try:
                with open(path, "rb") as fh:
                    clean, removed = sanitize_svg(fh.read())
            except UnsafeInput as error:
                self.issues.append(model.issue("MEDIA_REJECTED_UNSAFE", "warning", "%s was not carried over: %s." % (filename, error), "Export the SVG again without entity declarations, or supply a PNG."))
                return None
            if removed:
                work = os.path.join(self.ctx.scratch("svg"), "clean.svg")
                with open(work, "wb") as fh:
                    fh.write(clean)
                notes.append("sanitised: removed " + "; ".join(removed))
                self.issues.append(model.issue("SVG_SANITISED", "info", "Active content was removed from %s (%s)." % (filename, "; ".join(removed)),
                                               "Check the image in the preview; supply a static SVG or PNG if it no longer looks right."))
        elif fmt in ("emf", "wmf") and capabilities.have("soffice"):
            converted = convert_office(path, "png", self.ctx)
            if converted:
                work, converted_from, fmt = converted, {"format": fmt, "sha256": sha, "via": "LibreOffice"}, "png"
                notes.append("converted from %s to PNG for the web" % converted_from["format"].upper())
        elif fmt == "srt":
            with open(path, "rb") as fh:
                source, _ = textdoc.decode_text(fh.read())
            work = os.path.join(self.ctx.scratch("vtt"), "track.vtt")
            with open(work, "w", encoding="utf-8") as fh:
                fh.write(media.srt_to_vtt(source))
            converted_from, fmt = {"format": "srt", "sha256": sha, "via": "syntax conversion (timings and text unchanged)"}, "vtt"
        elif self.ctx.options.convert_media and capabilities.have("ffmpeg") and (
                (category == "video" and fmt not in detect.WEB_VIDEO) or (category == "image" and fmt in ("tiff", "bmp", "heic"))):
            target_ext = "mp4" if category == "video" else "png"
            out = os.path.join(self.ctx.scratch("convert"), "converted." + target_ext)
            args = ["ffmpeg", "-v", "error", "-y", "-i", path] + (["-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-movflags", "+faststart"] if category == "video" else []) + [out]
            try:
                done = subprocess.run(args, capture_output=True, timeout=1800)
            except (OSError, subprocess.SubprocessError):
                done = None
            if done is not None and done.returncode == 0 and os.path.exists(out) and os.path.getsize(out) > 0:
                work, converted_from, fmt = out, {"format": fmt, "sha256": sha, "via": "ffmpeg (--convert-media)"}, target_ext
                notes.append("converted from %s for the web; the original file is untouched" % converted_from["format"].upper())
        category = detect.category(fmt)
        facts = media.probe(work, fmt) if category in ("image", "video", "audio") else {}
        animated = bool(facts.get("animated"))
        kind = {"image": "animation" if animated else "image", "video": "video", "audio": "audio", "subtitle": "captions", "document": "document"}.get(category, "other")
        if fmt in DATA:
            kind = "data"
        web_ready = (category == "image" and fmt in detect.WEB_IMAGE) or (category == "video" and fmt in detect.WEB_VIDEO) or (
            category == "audio" and fmt in detect.WEB_AUDIO) or fmt == "vtt" or kind in ("document", "data")
        asset_id = "asset-" + hashlib.sha256((self.blog_id + sha).encode()).hexdigest()[:10]
        stem, ext = _safe_name(filename)
        ext = "." + {"jpeg": "jpg"}.get(fmt, fmt)
        os.makedirs(self.folder, exist_ok=True)
        stored = "%s-%s%s" % (stem, asset_id[6:], ext)
        shutil.copyfile(work, os.path.join(self.folder, stored))
        asset = {
            "id": asset_id, "kind": kind, "role": None, "subject": associate.subject_of(filename), "filename": filename, "sourceNames": [filename],
            "path": "assets/%s/%s" % (self.blog_id, stored), "origin": origin, "sourceDocument": source_document, "format": fmt,
            "mime": detect.MIME.get(fmt, "application/octet-stream"), "bytes": os.path.getsize(os.path.join(self.folder, stored)),
            "sha256": sha256_file(os.path.join(self.folder, stored)), "sourceSha256": sha,
            "width": facts.get("width"), "height": facts.get("height"), "animated": animated if category == "image" else None,
            "frames": facts.get("frames"), "durationSeconds": facts.get("durationSeconds"), "webReady": bool(web_ready), "available": True, "notes": notes,
        }
        if converted_from:
            asset["convertedFrom"] = converted_from
        if facts.get("videoCodec"):
            asset["videoCodec"] = facts["videoCodec"]
        if info.get("mismatch"):
            asset["notes"].append("extension said %s, content is %s" % (info.get("extensionFormat"), info["format"]))
        if category == "image" and (asset["width"] is None or asset["height"] is None) and web_ready:
            self.issues.append(model.issue("MEDIA_DIMENSIONS_UNKNOWN", "warning", "The dimensions of %s could not be read from the file." % filename,
                                           "Check the file opens correctly. An image without known dimensions can shift the page layout while loading.", asset=asset_id))
        if category == "image" and asset["width"] and asset["height"] and web_ready and fmt != "svg" and (not facts):
            pass
        if category == "image" and media.looks_truncated(os.path.join(self.folder, stored), fmt):
            self.issues.append(model.issue("MEDIA_POSSIBLY_TRUNCATED", "warning", "%s does not end with its end-of-image marker; it may be cut short and display only partly." % filename,
                                           "Open the image to check it is complete, and re-export it if not.", asset=asset_id))
        if media.has_location_metadata(os.path.join(self.folder, stored), fmt):
            self.issues.append(model.issue("IMAGE_LOCATION_METADATA", "warning", "%s carries GPS location data in its metadata. Published as supplied, the location is published with it." % filename,
                                           "Export the photo without location data and supply that copy, or confirm the location may be public by acknowledging this warning.", asset=asset_id))
        if not web_ready:
            if category == "video":
                self.issues.append(model.issue("VIDEO_FORMAT_NEEDS_CONVERSION", "warning", "%s is a %s video, which browsers do not play reliably. It is kept but will not be shown as a player." % (filename, fmt.upper()),
                                               "Supply the video as MP4 (H.264) or WebM, or run the ingest again with --convert-media (needs ffmpeg).", asset=asset_id))
            elif category == "image":
                self.issues.append(model.issue("IMAGE_FORMAT_UNSUPPORTED", "warning", "%s is a %s image, which browsers cannot display. It is kept but will not be shown." % (filename, fmt.upper()),
                                               "Supply it as PNG, JPEG, WebP or SVG%s." % (", or run again with --convert-media" if fmt in ("tiff", "bmp", "heic") else ""), asset=asset_id))
            elif category == "audio":
                self.issues.append(model.issue("AUDIO_FORMAT_UNSUPPORTED", "warning", "%s is a %s audio file, which browsers do not play reliably." % (filename, fmt.upper()), "Supply it as MP3 or M4A.", asset=asset_id))
        if category == "video" and web_ready and (asset["width"] is None or asset["durationSeconds"] is None):
            asset["notes"].append("dimensions or duration not measured (ffprobe not available)" if not capabilities.have("ffprobe") else "dimensions or duration not reported by the file")
        if category == "video" and fmt in ("mp4", "m4v") and facts.get("videoCodec") and facts["videoCodec"] not in ("h264", "av1", "vp9", "hevc"):
            self.issues.append(model.issue("VIDEO_CODEC_UNCOMMON", "warning", "%s uses the %s video codec, which some browsers cannot play." % (filename, facts["videoCodec"]),
                                           "Re-encode it as H.264, or run again with --convert-media.", asset=asset_id))
        self.assets.append(asset)
        self.by_sha[sha] = asset
        self._index(asset, filename, rel)
        return asset

    def _index(self, asset, filename, rel):
        self.by_name.setdefault(os.path.basename(filename).lower(), [])
        if asset not in self.by_name[os.path.basename(filename).lower()]:
            self.by_name[os.path.basename(filename).lower()].append(asset)
        if rel:
            self.by_rel[rel.lower()] = asset

    def add_bytes(self, data, filename, origin, source_document):
        folder = self.ctx.scratch("embedded")
        path = os.path.join(folder, re.sub(r"[^A-Za-z0-9._-]", "_", os.path.basename(filename)) or "embedded.bin")
        with open(path, "wb") as fh:
            fh.write(data)
        return self.add(path, os.path.basename(filename), origin, source_document)

    def find(self, target, doc_folder=""):
        """(asset, how) for a path a document names, else (None, close-match suggestions)."""
        target = (target or "").replace("\\", "/").split("?")[0].split("#")[0].strip()
        if not target:
            return None, []
        candidates = [os.path.normpath(os.path.join(doc_folder, target)).replace(os.sep, "/"), os.path.normpath(target).replace(os.sep, "/").lstrip("./")]
        for cand in candidates:
            if cand.lower() in self.by_rel:
                return self.by_rel[cand.lower()], "relative path"
        named = self.by_name.get(os.path.basename(target).lower(), [])
        if len(named) == 1:
            return named[0], "file name"
        if len(named) > 1:
            return None, ["%d supplied files are named %s; give the folder as well" % (len(named), os.path.basename(target))]
        close = difflib.get_close_matches(os.path.basename(target).lower(), list(self.by_name), n=2, cutoff=0.72)
        return None, [self.by_name[c][0]["filename"] for c in close]

    def find_loose(self, word, target):
        """Resolve a directive target that is a name without extension, or a figure number."""
        asset, _ = self.find(target)
        if asset:
            return asset
        want = target.strip().lower()
        stems = {}
        for name, found in self.by_name.items():
            if len(found) == 1 and found[0]["kind"] in ("image", "animation", "video", "audio"):
                stems.setdefault(os.path.splitext(name)[0], []).append(found[0])
        if want in stems and len(stems[want]) == 1:
            return stems[want][0]
        if re.fullmatch(r"\d{1,3}", want):
            number = int(want)
            aliases = {"figure": "fig|figure|image|img|pic|picture|photo", "fig": "fig|figure|image|img", "image": "image|img|fig|figure|pic|picture|photo",
                       "img": "image|img", "chart": "chart|graph|fig|figure", "graph": "chart|graph", "video": "video|clip|vid", "gif": "gif|animation",
                       "diagram": "diagram|fig|figure", "photo": "photo|image|img|pic", "picture": "picture|pic|image|img", "infographic": "infographic"}.get(word, re.escape(word))
            pattern = re.compile(r"^(?:%s)[-_ .]?0*%d$" % (aliases, number), re.I)
            hits = [found[0] for s, found in stems.items() if pattern.match(s) and len(found) == 1]
            if len(hits) == 1:
                return hits[0]
        slug = slugify(want, "")
        hits = [found[0] for s, found in stems.items() if slug and slugify(s, "") == slug and len(found) == 1]
        return hits[0] if len(hits) == 1 else None


def convert_office(path, target_ext, ctx):
    """Convert with LibreOffice in an isolated profile; returns the new path or None."""
    if not capabilities.have("soffice"):
        return None
    out = ctx.scratch("convert")
    profile = ctx.scratch("lo-profile")
    binary = shutil.which("soffice") or shutil.which("libreoffice")
    try:
        subprocess.run([binary, "--headless", "--norestore", "-env:UserInstallation=file://" + profile, "--convert-to", target_ext, "--outdir", out, path],
                       capture_output=True, timeout=300)
    except (OSError, subprocess.SubprocessError):
        return None
    produced = [f for f in os.listdir(out) if f.lower().endswith("." + target_ext)]
    return os.path.join(out, produced[0]) if produced else None


# ================================================================ block utilities
def map_blocks(blocks, fn):
    """Depth-first rewrite: fn(block) → list of replacement blocks. Reaches list items and quotes."""
    out = []
    for block in blocks:
        if block.get("type") == "list":
            for item in block["items"]:
                item["children"] = map_blocks(item.get("children", []), fn)
        elif block.get("type") == "blockquote":
            block["blocks"] = map_blocks(block.get("blocks", []), fn)
        out.extend(fn(block))
    return out


def each_block(blocks):
    for block in blocks:
        yield block
        if block.get("type") == "list":
            for item in block["items"]:
                yield from each_block(item.get("children", []))
        elif block.get("type") == "blockquote":
            yield from each_block(block.get("blocks", []))


def each_inlines(blocks):
    """Every inline list in the blocks (headings, paragraphs, items, cells, captions, notes)."""
    for block in each_block(blocks):
        if "inlines" in block:
            yield block, block["inlines"]
        if block.get("caption"):
            yield block, block["caption"]
        if block.get("type") == "list":
            for item in block["items"]:
                yield block, item["inlines"]
        elif block.get("type") == "table":
            for row in block["rows"]:
                for cell in row:
                    yield block, cell["inlines"]
        elif block.get("type") == "footnotes":
            for item in block["items"]:
                yield block, item["inlines"]


def clean_alt(alt):
    if alt is None:
        return None
    alt = re.sub(r"\s+", " ", alt).strip()
    if not alt or FILENAME_ALT.match(alt) or alt.lower().startswith("description automatically generated") or "description automatically generated" in alt.lower():
        return None
    return alt


# ================================================================ one blog
def extract_document(entry, ctx):
    """Run the right extractor for one document; never raises."""
    fmt, path, via = entry.format, entry.path, None
    if entry.size > MAX_DOC_BYTES:
        result = model.DocResult("none")
        result.fail("DOCUMENT_TOO_LARGE", "%s is %d MB; documents above %d MB are not parsed." % (entry.rel, entry.size // 2**20, MAX_DOC_BYTES // 2**20),
                    "Compress the document's images or split it, then upload again.")
        return result
    if fmt in LEGACY:
        converted = convert_office(path, LEGACY[fmt], ctx)
        if not converted:
            result = model.DocResult("none")
            result.status = "unsupported"
            result.issues.append(model.issue("LEGACY_FORMAT_NEEDS_CONVERSION", "error",
                                             "%s is a legacy %s file. Reading it needs LibreOffice, which is %s." % (entry.rel, fmt.upper(), "not installed here" if not capabilities.have("soffice") else "installed but failed to convert this file"),
                                             "Save the file as %s and upload it again, or install LibreOffice and re-run the ingest." % LEGACY[fmt].upper()))
            return result
        path, via, fmt = converted, "LibreOffice (%s → %s)" % (entry.format, LEGACY[fmt]), LEGACY[fmt]
    extractor = EXTRACTORS.get(fmt)
    if extractor is None:
        result = model.DocResult("none")
        result.status = "unsupported"
        result.issues.append(model.issue("DOCUMENT_FORMAT_UNSUPPORTED", "error", "%s (%s) has no extractor." % (entry.rel, fmt), "Supply the blog as DOCX, PDF, Markdown, HTML, RTF, ODT or TXT."))
        return result
    try:
        result = extractor(path, ctx)
    except UnsafeInput as error:
        result = model.DocResult(fmt)
        result.fail("DOCUMENT_REJECTED_UNSAFE", "%s was not processed: %s." % (entry.rel, error), "Re-export the document from its source application and upload it again.")
    except Exception as error:                              # one bad document must not stop the package
        result = model.DocResult(fmt)
        result.fail("DOCUMENT_CORRUPT", "%s could not be read (%s: %s)." % (entry.rel, type(error).__name__, str(error)[:160]),
                    "Check the file opens in its own application, re-save it and upload it again.")
    if via:
        result.notes["convertedVia"] = via
        result.extractor += " after " + via
    return result


def build_blog(plan, ctx, package_sidecar):
    issues = list(plan.issues)
    config = plan.config or {}
    store = AssetStore(ctx, plan.id, issues)
    asset_specs = {k.lower(): v for k, v in (config.get("assets") or {}).items() if isinstance(v, dict)}

    # ---- supplied files first, so documents can reference them
    for entry in plan.assets:
        asset = store.add(entry.path, entry.name, "supplied", rel=entry.rel)
        if asset is None:
            entry.status, entry.note = "ignored", "not usable as media"

    documents, blocks, meta, meta_sources = [], [], {}, {}
    presentation = False
    seen_docs = {}
    for index, entry in enumerate(plan.docs):
        if plan.virtual is None and entry.sha256 in seen_docs:
            issues.append(model.issue("DOCUMENT_DUPLICATE", "warning", "%s is byte-for-byte the same document as %s; it was read once." % (entry.rel, seen_docs[entry.sha256]),
                                      "Remove the duplicate from the package.", document=entry.rel))
            continue
        seen_docs[entry.sha256] = entry.rel
        results = [extract_document(entry, ctx)] if plan.virtual is None else plan.virtual
        for result in results:
            doc_blocks = result.blocks

            def resolve_embedded(block, result=result, entry=entry):
                refs = [block.get("ref"), block.get("poster")] if block.get("type") == "media" else []
                for ref in refs:
                    if ref and ref.get("kind") == "embedded":
                        item = result.embedded.get(ref["key"])
                        asset = store.add_bytes(item["data"], item["filename"], "embedded", entry.rel) if item else None
                        ref.clear()
                        ref.update({"kind": "asset", "id": asset["id"]} if asset else {"kind": "unusable", "name": item["filename"] if item else "embedded media"})
                if block.get("type") == "media":
                    block["_doc"], block["_folder"] = entry.rel, entry.folder
                return [block]

            doc_blocks = map_blocks(doc_blocks, resolve_embedded)
            if index > 0 or results.index(result) > 0 and plan.virtual is None:
                for b in doc_blocks:                           # a later part's title opens a section of the one blog
                    if b.get("type") == "paragraph" and b.get("style") == "title":
                        kept = b.get("inlines") or []
                        b.clear()
                        b.update(model.heading(2, kept))
                        issues.append(model.issue("PART_TITLE_AS_SECTION", "info", 'The title of %s ("%s") opens a section, because the blog takes its title from its first document.' % (
                            entry.name, model.plain(kept)[:80]), "Confirm in the preview. Use an instruction file to set the blog's title if this is wrong.", document=entry.rel))
            for b in each_block(doc_blocks):
                b.setdefault("_doc", entry.rel)
                b.setdefault("_folder", entry.folder)
            blocks.extend(doc_blocks)
            for key, value in result.meta.items():
                if key not in meta:
                    meta[key], meta_sources[key] = value, "%s (%s)" % (result.meta_sources.get(key, "document"), entry.name)
                elif meta[key] != value and key in ("title", "subtitle", "author", "date", "description", "canonical", "slug", "lang", "seoTitle", "cover"):
                    issues.append(model.issue("METADATA_CONFLICT", "warning", 'The documents disagree on "%s": %s says "%s", %s says "%s". The first was used.' % (
                        key, meta_sources[key], str(meta[key])[:80], entry.name, str(value)[:80]),
                        'Make the documents agree, or state "%s" in an instruction file.' % key, document=entry.rel))
            for item in result.issues:
                item.setdefault("document", entry.rel)
                issues.append(item)
            presentation = presentation or bool(result.notes.get("presentation"))
            record = {"name": entry.name, "path": entry.rel, "sha256": entry.sha256, "format": entry.format, "status": result.status, "extractor": result.extractor,
                      "blocks": sum(1 for _ in each_block(doc_blocks)), "embeddedMedia": len(result.embedded), "notes": result.notes}
            if result.pages:
                record["pages"] = result.pages
            documents.append(record)
        if plan.virtual is not None:
            break

    # ---- sidecar metadata overrides the documents' own
    for key in ("title", "subtitle", "author", "date", "slug", "lang", "description", "keywords", "canonical", "cover"):
        if config.get(key) not in (None, "", []):
            meta[key], meta_sources[key] = config[key], "instruction file"
    if isinstance(config.get("seo"), dict):
        for key, target in (("title", "seoTitle"), ("description", "description"), ("keywords", "keywords"), ("canonical", "canonical")):
            if config["seo"].get(key) not in (None, "", []):
                meta[target], meta_sources[target] = config["seo"][key], "instruction file seo.%s" % key

    # ---- generic passes over the combined blocks
    def directives_and_urls(block):
        if block.get("type") != "paragraph":
            return [block]
        value = model.plain(block["inlines"]).strip()
        directive = model.parse_directive(value)
        if directive:
            word, target = directive
            new = model.media({"kind": "directive", "target": target, "word": word}, media_kind=textdoc._kind_of_word(word))
            new["_doc"], new["_folder"] = block.get("_doc"), block.get("_folder", "")
            return [new]
        hrefs = {run.get("href") for run in block["inlines"] if run.get("t") == "text" and run["text"].strip()}
        url = value if re.fullmatch(r"https?://\S+", value) else (next(iter(hrefs)) if len(hrefs) == 1 and None not in hrefs and re.fullmatch(r"https?://\S+", value) else None)
        if url:
            provider = model.video_provider(url)
            if provider:
                return [{"type": "embed", "provider": provider[0], "mediaId": provider[1], "url": url, "title": None, "_doc": block.get("_doc")}]
            kind = htmldoc.kind_from_target(url)
            if kind:
                new = model.media({"kind": "url", "url": url}, media_kind=kind)
                new["_doc"] = block.get("_doc")
                return [new]
        return [block]

    blocks = map_blocks(blocks, directives_and_urls)

    missing = []

    def resolve_refs(block):
        if block.get("type") != "media":
            return [block]
        ref, folder = block.pop("ref"), block.get("_folder", "")
        hint = block.get("mediaKind") or "image"
        alt = clean_alt(block.get("alt"))
        asset, basis, why, suggestions = None, None, None, []
        if ref["kind"] == "asset":
            asset, basis = next(a for a in store.assets if a["id"] == ref["id"]), "document_order"
        elif ref["kind"] == "unusable":
            why = "the embedded file %s is in a format that could not be carried over" % ref["name"]
        elif ref["kind"] == "path":
            asset, found = store.find(ref["target"], folder)
            if asset:
                basis = "document_reference"
                if asset["kind"] == "data" and asset["format"] == "csv":
                    table = structured.extract_csv(os.path.join(ctx.out, asset["path"]), ctx).blocks
                    asset["role"] = "source-data"
                    for t in table:
                        t["_doc"] = block.get("_doc")
                        if block.get("caption") or alt:
                            t["caption"] = block.get("caption") or [model.text(alt)]
                    return table
            else:
                suggestions = found if isinstance(found, list) else []
                claimed = ctx.corrupt.get(os.path.basename(ref["target"]).lower())
                why = ("the document references %s, which was supplied but is corrupt (not a valid %s file)" % (ref["target"], str(claimed).upper())) if claimed else (
                    "the document references %s, which was not supplied" % ref["target"])
        elif ref["kind"] == "directive":
            target = ref["target"]
            if re.match(r"^https?://", target, re.I):
                ref = {"kind": "url", "url": target}
            else:
                asset = store.find_loose(ref["word"], target) if target else None
                if asset:
                    basis = "explicit_instruction"
                else:
                    why = ('the placement instruction "[%s: %s]" does not match any supplied file' % (ref["word"].upper(), target)) if target else (
                        'the placement instruction "[%s]" names no file' % ref["word"].upper())
                    _, found = store.find(target) if target else (None, [])
                    suggestions = found if isinstance(found, list) else []
        if ref["kind"] == "url":
            provider = model.video_provider(ref["url"])
            if provider:
                return [{"type": "embed", "provider": provider[0], "mediaId": provider[1], "url": ref["url"], "title": alt or block.get("title"), "_doc": block.get("_doc"),
                         **({"caption": block["caption"]} if block.get("caption") else {})}]
            out = {"type": "external_media", "url": ref["url"], "mediaKind": hint, "alt": alt, "_doc": block.get("_doc")}
            if block.get("caption"):
                out["caption"] = block["caption"]
            return [out]
        if asset is None:
            out = {"type": "missing_media", "reference": ref.get("target") or ref.get("name") or "", "mediaKind": hint, "alt": alt, "reason": why,
                   "suggestions": suggestions, "_doc": block.get("_doc")}
            if block.get("caption"):
                out["caption"] = block["caption"]
            missing.append(out)
            return [out]
        out = {"type": "media", "assetId": asset["id"], "alt": alt, "_basis": basis, "_doc": block.get("_doc")}
        if block.get("caption"):
            out["caption"] = block["caption"]
        if block.get("title") and not alt and clean_alt(block["title"]):
            out["alt"], out["_altSource"] = clean_alt(block["title"]), "title attribute"
        for key, role in (("poster", "poster"),):
            pref = block.get(key)
            if pref:
                passet = next((a for a in store.assets if pref.get("kind") == "asset" and a["id"] == pref.get("id")), None)
                if passet is None and pref.get("kind") == "path":
                    passet, _ = store.find(pref["target"], folder)
                if passet:
                    out["posterAssetId"] = passet["id"]
                    passet["role"] = passet["role"] or "poster"
                elif pref.get("kind") == "path":
                    issues.append(model.issue("MEDIA_MISSING", "warning", "The poster image %s for %s was not supplied." % (pref["target"], asset["filename"]),
                                              "Supply the poster image, or accept the video without one.", asset=asset["id"]))
        tracks = []
        for track in block.get("tracks", []):
            tasset, _ = store.find(track["ref"].get("target", ""), folder) if track["ref"].get("kind") == "path" else (None, [])
            if tasset:
                tracks.append({"assetId": tasset["id"], "kind": track.get("kind") or "subtitles", "lang": track.get("lang"), "label": track.get("label")})
                tasset["role"] = "captions"
            else:
                issues.append(model.issue("MEDIA_MISSING", "warning", "The subtitle track %s for %s was not supplied." % (track["ref"].get("target") or track["ref"].get("url"), asset["filename"]),
                                          "Supply the .vtt or .srt file.", asset=asset["id"]))
        if tracks:
            out["tracks"] = tracks
        return [out]

    blocks = map_blocks(blocks, resolve_refs)

    # ---- title and subtitle: taken from the document, never written here
    title = subtitle = None
    title_source = subtitle_source = None
    tops = blocks
    styled = next((b for b in tops if b.get("type") == "paragraph" and b.get("style") == "title"), None)
    first_text = next((b for b in tops if b.get("type") in ("heading", "paragraph")), None)
    h1s = [b for b in tops if b.get("type") == "heading" and b["level"] == 1]
    if meta.get("title"):
        title, title_source = [model.text(str(meta["title"]))], meta_sources["title"]
        norm = re.sub(r"\W+", " ", str(meta["title"])).strip().lower()
        twin = next((b for b in ([styled] if styled else []) + h1s[:1] if b is not None and re.sub(r"\W+", " ", model.plain(b["inlines"])).strip().lower() == norm), None)
        if twin is not None and (twin is styled or twin is first_text):
            tops.remove(twin)
        elif styled is not None:
            styled.pop("style")
    elif styled is not None:
        title, title_source = styled["inlines"], "document title style (%s)" % os.path.basename(styled.get("_doc") or "")
        tops.remove(styled)
    elif h1s and (first_text is h1s[0] or len(h1s) == 1):
        title, title_source = h1s[0]["inlines"], "first level-1 heading (%s)" % os.path.basename(h1s[0].get("_doc") or "")
        tops.remove(h1s[0])
    for b in tops:                                       # any further title-styled paragraph is ordinary text
        if b.get("type") == "paragraph" and b.get("style") == "title":
            b.pop("style")
    sub_block = next((b for b in tops if b.get("type") == "paragraph" and b.get("style") == "subtitle"), None)
    if meta.get("subtitle"):
        subtitle, subtitle_source = [model.text(str(meta["subtitle"]))], meta_sources["subtitle"]
        if sub_block is not None and model.plain(sub_block["inlines"]).strip().lower() == str(meta["subtitle"]).strip().lower():
            tops.remove(sub_block)
    elif sub_block is not None:
        subtitle, subtitle_source = sub_block["inlines"], "document subtitle style (%s)" % os.path.basename(sub_block.get("_doc") or "")
        tops.remove(sub_block)
    for b in tops:
        if b.get("type") == "paragraph" and b.get("style") == "subtitle":
            b.pop("style")

    # ---- captions: a caption-styled or caption-shaped paragraph beside a figure
    i = 0
    figures = ("media", "table", "chart", "embed", "missing_media", "external_media")
    while i < len(blocks):
        b = blocks[i]
        if b.get("type") == "paragraph":
            styled_caption = b.get("style") == "caption"
            shaped = bool(CAPTION.match(model.plain(b["inlines"]))) and len(model.plain(b["inlines"])) < 300
            prev = blocks[i - 1] if i > 0 else None
            nxt = blocks[i + 1] if i + 1 < len(blocks) else None
            is_table_caption = re.match(r"^\s*table\b", model.plain(b["inlines"]), re.I)
            target = None
            if styled_caption or shaped:
                if is_table_caption and nxt is not None and nxt.get("type") == "table" and not nxt.get("caption"):
                    target = nxt
                elif prev is not None and prev.get("type") in figures and not prev.get("caption"):
                    target = prev
                elif styled_caption and nxt is not None and nxt.get("type") in figures and not nxt.get("caption"):
                    target = nxt
            if target is not None:
                target["caption"] = b["inlines"]
                blocks.pop(i)
                continue
            b.pop("style", None)
        i += 1

    # ---- supplied files the documents did not reference
    placements = []
    referenced = {b["assetId"] for b in each_block(blocks) if b.get("type") == "media"}
    referenced |= {b["posterAssetId"] for b in each_block(blocks) if b.get("posterAssetId")}
    referenced |= {t["assetId"] for b in each_block(blocks) for t in b.get("tracks", [])}
    supplied = [a for a in store.assets if a["origin"] in ("supplied", "embedded+supplied")]
    visual = [a for a in supplied if a["kind"] in ("image", "animation")]
    players = [a for a in supplied if a["kind"] in ("video", "audio")]
    posters = associate.pair_posters([a["filename"] for a in players if a["kind"] == "video"], [a["filename"] for a in visual if a["id"] not in referenced])
    tracks = associate.pair_tracks([a["filename"] for a in players], [a["filename"] for a in supplied if a["kind"] == "captions"])
    by_filename = {a["filename"]: a for a in supplied}
    poster_of, tracks_of = {}, {}
    for image, video in posters.items():
        spec = asset_specs.get(image.lower(), {})
        if spec.get("role") in (None, "poster"):
            poster_of[by_filename[video]["id"]] = by_filename[image]
            by_filename[image]["role"] = "poster"
    for name, spec in asset_specs.items():
        if spec.get("posterFor"):
            found, _ = store.find(name)
            video, _ = store.find(spec["posterFor"])
            if found and video:
                poster_of[video["id"]] = found
                found["role"] = "poster"
    for sub, (owner, lang) in tracks.items():
        tracks_of.setdefault(by_filename[owner]["id"], []).append({"assetId": by_filename[sub]["id"], "kind": "subtitles", "lang": lang, "label": None})
        by_filename[sub]["role"] = "captions"
    for b in each_block(blocks):
        if b.get("type") == "media":
            if b["assetId"] in poster_of and not b.get("posterAssetId"):
                b["posterAssetId"] = poster_of[b["assetId"]]["id"]
            if b["assetId"] in tracks_of and not b.get("tracks"):
                b["tracks"] = tracks_of[b["assetId"]]

    cover_asset, cover_basis, cover_confidence = None, None, None
    cover_name = meta.get("cover")
    if isinstance(cover_name, str) and cover_name.strip():
        if re.match(r"^https?://", cover_name, re.I):
            issues.append(model.issue("EXTERNAL_MEDIA_NOT_FETCHED", "warning", "The cover image is given as a web address (%s); remote files are not downloaded." % cover_name,
                                      "Supply the cover image as a file."))
        else:
            found, close = store.find(cover_name, plan.docs[0].folder if plan.docs else "")
            if found:
                cover_asset, cover_basis, cover_confidence = found, "explicit_instruction", "high"
            else:
                issues.append(model.issue("MEDIA_MISSING", "error", "The cover image %s named in %s was not supplied.%s" % (
                    cover_name, meta_sources.get("cover", "the metadata"), (" Did you mean %s?" % " or ".join(close)) if close else ""),
                    "Supply the cover image, or correct its file name."))

    def insert_media(asset, index, basis, confidence, note):
        block = {"type": "media", "assetId": asset["id"], "alt": None, "_basis": basis, "_confidence": confidence, "_note": note}
        if asset["id"] in poster_of:
            block["posterAssetId"] = poster_of[asset["id"]]["id"]
        if asset["id"] in tracks_of:
            block["tracks"] = tracks_of[asset["id"]]
        blocks.insert(index, block)
        referenced.add(asset["id"])
        return block

    for asset in supplied:
        if asset["id"] in referenced or asset["role"] in ("poster", "captions", "source-data") or asset is cover_asset:
            continue
        spec = asset_specs.get(asset["filename"].lower(), {})
        if asset["kind"] not in ("image", "animation", "video", "audio"):
            if spec.get("role") == "download":
                asset["role"] = "download"
            continue
        if spec.get("role") == "ignore":
            asset["role"] = "not-displayed"
            placements.append({"assetId": asset["id"], "status": "excluded", "basis": "explicit_instruction", "confidence": "high", "note": "instruction file: do not display"})
            continue
        if spec.get("role") == "download":
            asset["role"] = "download"
            continue
        if spec.get("role") == "cover" and cover_asset is None:
            cover_asset, cover_basis, cover_confidence = asset, "explicit_instruction", "high"
            continue
        index, note = associate.apply_instruction(blocks, spec) if spec else (None, None)
        if index is not None:
            insert_media(asset, index, "explicit_instruction", "high", "instruction file: " + note)
            continue
        if spec and note:
            issues.append(model.issue("PLACEMENT_INSTRUCTION_UNRESOLVED", "warning", "The placement instruction for %s could not be applied: %s." % (asset["filename"], note),
                                      "Correct the heading or text the instruction refers to.", asset=asset["id"]))
        if asset["kind"] in ("image", "animation") and cover_asset is None and associate.COVER.match(associate.stem(asset["filename"])):
            cover_asset, cover_basis, cover_confidence = asset, "filename_convention", "high"
            continue
        hits = associate.by_mention(blocks, asset["filename"])
        if hits:
            insert_media(asset, hits[0] + 1, "document_reference", "high", "the text names this file")
            continue
        figure = associate.by_figure_number(blocks, asset["filename"])
        if figure:
            index, is_caption = figure
            if is_caption:
                caption = blocks.pop(index)
                block = insert_media(asset, index, "caption", "high", "a caption in the text carries this figure number")
                block["caption"] = caption["inlines"]
            else:
                insert_media(asset, index + 1, "document_reference", "medium", "the text refers to this figure number")
            continue
        heading_index = associate.by_heading(blocks, asset["filename"])
        if heading_index is not None:
            insert_media(asset, heading_index + 1, "heading", "medium", 'the file name matches the heading "%s"' % model.plain(blocks[heading_index]["inlines"]))
            continue
        context = associate.by_context(blocks, asset["filename"])
        placements.append({"assetId": asset["id"], "status": "unplaced", "basis": "context" if context is not None else "none", "confidence": "low" if context is not None else "none",
                           "_suggestAfter": blocks[context] if context is not None else None,
                           "note": "words in the file name appear in one paragraph; not enough to place it" if context is not None else "nothing in the documents refers to this file"})

    # ---- cover: first image ahead of all body text is the author's cover position
    body_first = next((b for b in blocks if b.get("type") not in ("rule",)), None)
    if cover_asset is None and body_first is not None and body_first.get("type") == "media":
        first_asset = next(a for a in store.assets if a["id"] == body_first["assetId"])
        has_text_after = any(b.get("type") in ("paragraph", "heading", "list") for b in blocks[blocks.index(body_first) + 1:])
        if first_asset["kind"] in ("image", "animation") and has_text_after:
            cover_asset, cover_basis, cover_confidence = first_asset, "document_order", "medium"
    cover = None
    if cover_asset is not None:
        lead = next((b for b in blocks if b.get("type") == "media" and b["assetId"] == cover_asset["id"]), None)
        lead_is_first = lead is not None and lead is body_first
        cover = {"assetId": cover_asset["id"], "alt": None, "basis": cover_basis, "confidence": cover_confidence}
        if lead_is_first:
            cover["alt"] = lead.get("alt")
            if lead.get("caption"):
                cover["caption"] = lead["caption"]
            blocks.remove(lead)
        cover_asset["role"] = "cover"

    # ---- alt text and sidecar captions
    def spec_for(asset):
        for name in asset["sourceNames"]:
            if name.lower() in asset_specs:
                return asset_specs[name.lower()]
        return {}

    assets_by_id = {a["id"]: a for a in store.assets}
    holders = [b for b in each_block(blocks) if b.get("type") == "media"] + ([cover] if cover else [])
    for holder in holders:
        asset = assets_by_id[holder["assetId"]]
        spec = spec_for(asset)
        source = holder.pop("_altSource", None) or ("document" if holder.get("alt") else None)
        if isinstance(spec.get("alt"), str):
            holder["alt"], source = spec["alt"].strip(), "instruction file"
        if spec.get("decorative") is True:
            holder["alt"], holder["decorative"], source = "", True, "instruction file (decorative)"
        if isinstance(spec.get("caption"), str) and spec["caption"].strip():
            holder["caption"] = [model.text(spec["caption"].strip())]
        holder["altSource"] = source
        if asset["kind"] in ("image", "animation") and not holder.get("alt") and not holder.get("decorative"):
            holder["alt"] = None
        asset["subject"] = asset["subject"] or associate.subject_of(holder.get("alt") or "", model.plain(holder.get("caption") or []))
        if asset["role"] is None:
            asset["role"] = "supporting"

    # ---- relative links to supplied files become downloads; in-page anchors are dropped
    dropped_anchors, links = 0, {}
    for holder, inlines in each_inlines(blocks):
        for run in inlines:
            href = run.get("href")
            if not href:
                continue
            if href.startswith("#"):
                run.pop("href")
                dropped_anchors += 1
            elif re.match(r"^(https?:|mailto:|tel:)", href, re.I):
                links.setdefault(href, 0)
                links[href] += 1
            else:
                target, _ = store.find(href, holder.get("_folder", ""))
                if target:
                    run["href"] = "asset:" + target["id"]
                    target["role"] = target["role"] or "download"
                elif not href.startswith("/"):
                    run.pop("href")
                    issues.append(model.issue("LINK_TARGET_MISSING", "warning", 'The link "%s" points to %s, which was not supplied; the text was kept without the link.' % (run.get("text", "")[:60], href),
                                              "Supply the linked file, or replace the link with a full web address in the source document."))
    if dropped_anchors:
        issues.append(model.issue("INTERNAL_LINKS_REMOVED", "info", "%d link(s) to bookmarks inside the source document were kept as plain text." % dropped_anchors,
                                  "No action needed unless in-page links are required."))

    # ---- ids, sections, final shapes
    counter = [0]

    def assign(block):
        counter[0] += 1
        block["id"] = "b%04d" % counter[0]
        return [block]

    blocks = map_blocks(blocks, assign)
    sections, current = [], None
    section_of = {}
    for block in blocks:
        if block["type"] == "heading":
            role = next((name for name, pattern in ROLE_HEADINGS if pattern.match(model.plain(block["inlines"]).strip())), "body")
            current = {"id": "s%02d" % (len(sections) + 1), "headingBlockId": block["id"], "title": model.plain(block["inlines"]).strip(), "level": block["level"], "role": role, "blockIds": []}
            sections.append(current)
        elif block["type"] == "footnotes":
            current = {"id": "s%02d" % (len(sections) + 1), "headingBlockId": None, "title": None, "level": 0, "role": "footnotes", "blockIds": []}
            sections.append(current)
        elif current is None:
            current = {"id": "s%02d" % (len(sections) + 1), "headingBlockId": None, "title": None, "level": 0, "role": "introduction", "blockIds": []}
            sections.append(current)
        current["blockIds"].append(block["id"])
        for inner in each_block([block]):
            section_of[inner["id"]] = current
    for block in each_block(blocks):
        if block.get("role") == "cta" and section_of[block["id"]]["role"] == "body":
            pass

    def where(block_id):
        section = section_of.get(block_id)
        if section is None:
            return None
        return section["title"] or {"introduction": "Introduction (before the first heading)", "footnotes": "Footnotes"}.get(section["role"])

    for block in each_block(blocks):
        doc = block.pop("_doc", None)
        block.pop("_folder", None)
        if doc and len(plan.docs) > 1:
            block["sourceDocument"] = doc
        if block["type"] == "media":
            asset = assets_by_id[block["assetId"]]
            basis, confidence, note = block.pop("_basis", "document_order"), block.pop("_confidence", "high"), block.pop("_note", None)
            section = section_of[block["id"]]
            asset.setdefault("sectionId", section["id"])
            placements.append({"assetId": asset["id"], "status": "placed", "blockId": block["id"], "sectionId": section["id"], "position": "inline", "basis": basis,
                               "confidence": confidence, "note": note or {"document_order": "embedded at this position in the document",
                                                                          "document_reference": "the document references this file here",
                                                                          "explicit_instruction": "an in-text placement instruction names this file"}.get(basis)})
            if confidence == "medium":
                issues.append(model.issue("PLACEMENT_TO_VERIFY", "info", "%s was placed %s (%s)." % (asset["filename"], ('in "%s"' % section["title"]) if section["title"] else "in the introduction", note),
                                          "Confirm the position in the preview, or state it in an instruction file.", section=where(block["id"]), block=block["id"], asset=asset["id"]))
            if asset["kind"] in ("image", "animation") and block.get("alt") is None and not block.get("decorative"):
                issues.append(model.issue("ALT_TEXT_MISSING", "warning", "%s has no alternative text." % asset["filename"],
                                          'Add alt text in the source document or in the instruction file ("assets": {"%s": {"alt": "…"}}), or mark it "decorative": true.' % asset["filename"],
                                          section=where(block["id"]), block=block["id"], asset=asset["id"]))
            if not block.get("caption"):
                block.pop("caption", None)
        elif block["type"] == "missing_media":
            hint = (" Did you mean %s?" % " or ".join(block["suggestions"])) if block.get("suggestions") else ""
            issues.append(model.issue("MEDIA_MISSING", "error", "A %s is missing: %s.%s" % (block["mediaKind"], block["reason"], hint),
                                      "Supply the file, correct the reference, or remove the reference from the document.", section=where(block["id"]), block=block["id"]))
        elif block["type"] == "external_media":
            issues.append(model.issue("EXTERNAL_MEDIA_NOT_FETCHED", "warning", "The document links to a remote %s (%s). Remote files are not downloaded, so it is kept as a link, not shown as media." % (block["mediaKind"], block["url"]),
                                      "Supply the file itself if it should be displayed on the page.", section=where(block["id"]), block=block["id"]))
        elif block["type"] == "chart":
            issues.append(model.issue("CHART_AS_DATA_TABLE", "warning", "A native %s chart%s was read as data (%d series). The document holds no picture of it, so it is shown as its data table, not as a drawn chart." % (
                block.get("chartType") or "", (' "%s"' % block["title"]) if block.get("title") else "", len(block["series"])),
                "Export the chart from the source application as PNG or SVG and supply it with a placement instruction if the visual should appear. The data table is exact.",
                section=where(block["id"]), block=block["id"]))
        elif block["type"] == "table":
            if block.get("headerRows", 0) == 0 and len(block["rows"]) > 1:
                issues.append(model.issue("TABLE_HEADER_UNMARKED", "info", "A table has no marked header row; it is shown without column headers.",
                                          "Mark the header row in the source document if the first row holds column names.", section=where(block["id"]), block=block["id"]))
            block.pop("reconstructed", None) if not block.get("reconstructed") else None
    for placement in placements:
        suggest = placement.pop("_suggestAfter", None)
        if placement["status"] == "unplaced":
            asset = assets_by_id[placement["assetId"]]
            asset["role"] = "unplaced"
            hint = ""
            if suggest is not None:
                placement["suggestedAfterBlockId"] = suggest["id"]
                hint = ' A possible position is after the paragraph beginning "%s…".' % model.block_text(suggest)[:60]
            issues.append(model.issue("PLACEMENT_UNCERTAIN", "warning", "%s was supplied but nothing says where it belongs, so it is not shown.%s" % (asset["filename"], hint),
                                      'Reference it in the document (for example "[IMAGE: %s]") or add a placement to the instruction file. Mark it "role": "ignore" if it should not be displayed.' % asset["filename"],
                                      asset=asset["id"]))
    if cover:
        asset = assets_by_id[cover["assetId"]]
        placements.append({"assetId": asset["id"], "status": "placed", "blockId": None, "sectionId": None, "position": "hero", "basis": cover["basis"], "confidence": cover["confidence"],
                           "note": {"explicit_instruction": "named as the cover", "filename_convention": "the file is named as a cover image",
                                    "document_order": "first image, ahead of all body text"}[cover["basis"]]})
        if cover["confidence"] == "medium":
            issues.append(model.issue("PLACEMENT_TO_VERIFY", "info", "%s is used as the cover image because it is the first thing in the document." % asset["filename"],
                                      "Confirm in the preview, or name the cover in an instruction file.", asset=asset["id"]))
        if cover.get("alt") is None and not cover.get("decorative"):
            issues.append(model.issue("ALT_TEXT_MISSING", "warning", "The cover image %s has no alternative text." % asset["filename"],
                                      'Add alt text in the source document or the instruction file, or mark it "decorative": true.', asset=asset["id"]))
    for asset in store.assets:
        if asset["role"] is None:
            asset["role"] = "not-displayed" if asset["kind"] in ("document", "data", "other") else "unplaced"
            if asset["kind"] in ("document", "data"):
                issues.append(model.issue("FILE_NOT_DISPLAYED", "info", "%s was supplied alongside the blog and is not displayed or linked." % asset["filename"],
                                          "Link to it from the document if readers should be able to download it.", asset=asset["id"]))
        if asset["kind"] == "animation":
            asset["notes"].append("animation preserved: stored byte-for-byte, %s frames" % (asset.get("frames") or "multiple"))

    # ---- completeness checks on what was extracted
    body_text = sum(len(model.block_text(b)) for b in each_block(blocks))
    if title is None:
        prop = next((d["notes"].get("documentTitle") for d in documents if d["notes"].get("documentTitle")), None)
        issues.append(model.issue("TITLE_MISSING", "error", "No blog title was found: the document has no title style, no level-1 heading and no title metadata.%s" % (
            (' The file\'s properties say "%s", which is often left over from a template and was not used.' % prop) if prop else ""),
            'Mark the title in the document (Title style or a top-level heading), or give "title" in an instruction file.'))
    if body_text == 0 and not any(b["type"] in ("media", "chart", "embed") for b in blocks):
        issues.append(model.issue("CONTENT_EMPTY", "error", "No body content was extracted.", "Check the documents and upload them again."))
    elif not any(b["type"] == "heading" for b in blocks) and body_text > 2500 and not presentation:
        issues.append(model.issue("STRUCTURE_UNRECOGNIZED", "warning", "The document is long but has no headings that could be recognised, so it is shown as one continuous section.",
                                  "Apply heading styles in the source document (or # headings in Markdown/text) and upload it again."))
    levels = [b["level"] for b in blocks if b["type"] == "heading"]
    jumps = sum(1 for a, b in zip(levels, levels[1:]) if b > a + 1)
    if jumps:
        issues.append(model.issue("HEADING_LEVEL_SKIPPED", "info", "The heading hierarchy skips a level in %d place(s) (for example a level-2 heading followed by level-4)." % jumps,
                                  "No change was made. Adjust heading levels in the source if the outline looks wrong in the preview."))
    if presentation and not (ctx.options.presentation_is_blog or config.get("presentationIsBlog") or package_sidecar.get("presentationIsBlog")):
        issues.append(model.issue("PRESENTATION_PURPOSE_UNCONFIRMED", "error",
                                  "The source is a slide presentation. Slides were read in order (title → section headings, bullets → lists), but a deck is not necessarily a blog post.",
                                  "Confirm that this presentation should be published as a blog: run again with --presentation-is-blog, or supply the written article instead."))
    if any(d["status"] in ("failed", "unsupported") for d in documents):
        pass

    # ---- link inventory (verified only when asked)
    link_records = [{"url": url, "uses": count, "status": "unverified"} for url, count in sorted(links.items())]
    for block in each_block(blocks):
        if block["type"] in ("embed", "external_media"):
            link_records.append({"url": block["url"], "uses": 1, "status": "unverified", "media": True, "blockId": block["id"]})
    if ctx.options.check_links:
        check_links(link_records, issues, where)

    for item in issues:
        if item.get("blockId") and not item.get("section"):
            sec = where(item["blockId"])
            if sec:
                item["section"] = sec
    slug = slugify(str(meta.get("slug") or (model.plain(title) if title else "")), slugify(os.path.splitext(plan.docs[0].name)[0]))
    statuses = {d["status"] for d in documents}
    status = "extracted" if statuses == {"extracted"} else ("failed" if statuses <= {"failed", "unsupported"} else "partial")
    metadata = {}
    for key in ("author", "date", "description", "keywords", "canonical", "lang", "seoTitle"):
        if meta.get(key) not in (None, "", []):
            metadata[key] = {"value": meta[key], "source": meta_sources[key]}
    return {
        "id": plan.id, "slug": slug, "grouping": plan.basis, "extractionStatus": status, "documents": documents,
        "title": {"inlines": title, "text": model.plain(title), "source": title_source} if title else None,
        "subtitle": {"inlines": subtitle, "text": model.plain(subtitle), "source": subtitle_source} if subtitle else None,
        "metadata": metadata, "cover": cover, "sections": sections, "blocks": blocks, "assets": store.assets, "placements": placements,
        "links": link_records, "issues": issues,
        "counts": {"blocks": counter[0], "sections": len(sections), "assets": len(store.assets), "missingMedia": len(missing),
                   "errors": sum(1 for i in issues if i["severity"] == "error"), "warnings": sum(1 for i in issues if i["severity"] == "warning")},
    }


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    """A redirect is reported, not followed: its target was not validated as a public host."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


_NO_REDIRECT = urllib.request.build_opener(_NoRedirect)


def check_links(records, issues, where):
    for record in records:
        url = record["url"]
        if not re.match(r"^https?://", url, re.I):
            continue
        status = None
        host = urllib.parse.urlsplit(url).hostname or ""
        if not is_public_host(host):
            record["status"], record["note"] = "unverified", "not checked: the host is not a public internet address"
            continue
        for method in ("HEAD", "GET"):
            try:
                request = urllib.request.Request(url, method=method, headers={"User-Agent": "blog-ingest-link-check/1.0", "Range": "bytes=0-0"})
                with _NO_REDIRECT.open(request, timeout=10) as response:
                    status = response.status
                break
            except urllib.error.HTTPError as error:
                status = error.code
                if 300 <= error.code < 400:
                    status = 200                       # the link answers; where it redirects to is not followed
                    record["note"] = "redirects (target not followed)"
                    break
                if error.code not in (403, 405, 501):
                    break
            except Exception:
                status = None
        record["httpStatus"] = status
        if status is not None and status < 400:
            record["status"] = "ok"
        elif status in (401, 403, 429) or status is None:
            record["status"] = "unverified"
            record["note"] = "the server did not allow an automated check" if status else "no response"
        else:
            record["status"] = "broken"
            issues.append(model.issue("LINK_BROKEN", "error" if record.get("media") else "warning", "The %s %s returned HTTP %s." % ("media link" if record.get("media") else "link", url, status),
                                      "Correct or remove the link in the source document.", section=where(record["blockId"]) if record.get("blockId") else None, block=record.get("blockId")))


# ================================================================ entry point
def run(argv=None):
    parser = argparse.ArgumentParser(prog=TOOL_NAME, description="Ingest a blog package (documents + media) into a blog manifest.")
    parser.add_argument("inputs", nargs="*", help="documents, media files, a folder, or a ZIP archive")
    parser.add_argument("--out", help="run directory to create (must not be inside an input folder)")
    parser.add_argument("--sidecar", help="instruction file (JSON): titles, placements, alt text, grouping")
    parser.add_argument("--single-blog", action="store_true", help="all documents are parts of ONE blog, in name order")
    parser.add_argument("--separate-blogs", action="store_true", help="each document is its own blog")
    parser.add_argument("--presentation-is-blog", action="store_true", help="confirm that a supplied presentation is to be published as a blog")
    parser.add_argument("--convert-media", action="store_true", help="convert non-web video/image formats with ffmpeg (originals untouched)")
    parser.add_argument("--check-links", action="store_true", help="request each external link once and report broken ones")
    parser.add_argument("--no-tool", action="append", default=[], metavar="NAME", help="behave as if an optional tool were absent (testing)")
    parser.add_argument("--force", action="store_true", help="replace an existing run directory")
    parser.add_argument("--capabilities", action="store_true", help="print which optional tools are available and exit")
    options = parser.parse_args(argv)
    capabilities.disable(options.no_tool)
    if options.capabilities:
        print(json.dumps(capabilities.report(), indent=2))
        return 0
    if not options.inputs or not options.out:
        parser.error("give at least one input and --out")
    out = os.path.abspath(options.out)
    for raw in options.inputs:
        src = os.path.abspath(raw)
        if os.path.isdir(src) and (out == src or out.startswith(src + os.sep)):
            parser.error("--out must not be inside the input folder %s: sources are never written to" % raw)
    if os.path.exists(os.path.join(out, "manifest.json")) and not options.force:
        parser.error("%s already holds a manifest; choose a new run directory or pass --force" % options.out)
    if options.force and os.path.isdir(out):
        for name in ("assets", "work", "manifest.json"):
            target = os.path.join(out, name)
            shutil.rmtree(target, ignore_errors=True) if os.path.isdir(target) else (os.remove(target) if os.path.exists(target) else None)
    if not os.path.exists(os.path.join(out, "manifest.json")):
        # Leftovers of an ingest that never finished (no manifest was written) are ours to clear.
        for name in ("assets", "work"):
            shutil.rmtree(os.path.join(out, name), ignore_errors=True)
    os.makedirs(out, exist_ok=True)
    ctx = Ctx(out, options)
    try:
        return _ingest(ctx, options, out)
    except BaseException:
        # Interrupted or crashed: no manifest means no run. Extracted media must not outlive it.
        shutil.rmtree(os.path.join(out, "assets"), ignore_errors=True)
        raise
    finally:
        shutil.rmtree(ctx.work, ignore_errors=True)


def _ingest(ctx, options, out):
    entries, issues = intake(options.inputs, ctx)
    sidecar, sidecar_source = load_sidecar(entries, options.sidecar, issues)
    plans, unassigned = group(entries, sidecar, options, issues)

    # A feed with several items is several blogs from one file.
    expanded = []
    for plan in plans:
        if len(plan.docs) == 1 and plan.docs[0].format == "xml":
            first = extract_document(plan.docs[0], ctx)
            extras = getattr(first, "extra_documents", [])
            plan.virtual = [first]
            expanded.append(plan)
            for extra in extras:
                clone = Plan(0)
                clone.docs, clone.assets, clone.basis, clone.virtual = plan.docs, plan.assets, "one blog per feed item", [extra]
                expanded.append(clone)
            if extras:
                plan.basis = "one blog per feed item"
        else:
            expanded.append(plan)
    for i, plan in enumerate(expanded, 1):
        plan.id = "blog-%d" % i

    blogs = [build_blog(plan, ctx, sidecar) for plan in expanded]
    slugs = {}
    for blog in blogs:
        slugs[blog["slug"]] = slugs.get(blog["slug"], 0) + 1
        if slugs[blog["slug"]] > 1:
            blog["slug"] = "%s-%d" % (blog["slug"], slugs[blog["slug"]])
    for asset in unassigned:
        asset.role, asset.status = "unassigned", "ignored"
        issues.append(model.issue("ASSET_UNASSIGNED", "warning", "%s could not be matched to one of the %d blogs, so it was not used." % (asset.rel, len(blogs)),
                                  "Put each blog's media in that blog's own folder, prefix the file with its document's name, or list it in an instruction file.", document=asset.rel))
    if not blogs:
        issues.append(model.issue("NO_DOCUMENT", "error", "No blog document was found in the input.", "Supply at least one document (DOCX, PDF, Markdown, HTML, RTF, ODT, TXT, PPTX or a structured file)."))

    manifest = {
        "schema": MANIFEST_SCHEMA,
        "generatedAt": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "tool": {"name": TOOL_NAME, "version": TOOL_VERSION, "capabilities": {k: v["available"] for k, v in capabilities.report().items()},
                 "options": {"singleBlog": options.single_blog, "separateBlogs": options.separate_blogs, "presentationIsBlog": options.presentation_is_blog,
                             "convertMedia": options.convert_media, "checkLinks": options.check_links}},
        "sidecar": sidecar_source,
        "inputs": [e.record() for e in entries],
        "blogs": blogs,
        "issues": issues,
        "trace": [
            {"stage": "intake", "files": len(entries), "accepted": sum(1 for e in entries if e.status == "accepted"), "rejected": sum(1 for e in entries if e.status == "rejected")},
            {"stage": "grouping", "blogs": len(blogs), "basis": sorted({b["grouping"] for b in blogs})},
            {"stage": "extraction", "documents": sum(len(b["documents"]) for b in blogs), "blocks": sum(b["counts"]["blocks"] for b in blogs)},
            {"stage": "media", "assets": sum(len(b["assets"]) for b in blogs), "missing": sum(b["counts"]["missingMedia"] for b in blogs)},
            {"stage": "association", "placed": sum(1 for b in blogs for p in b["placements"] if p["status"] == "placed"),
             "unplaced": sum(1 for b in blogs for p in b["placements"] if p["status"] == "unplaced")},
        ],
    }
    temp = os.path.join(out, "manifest.json.tmp")
    with open(temp, "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    os.replace(temp, os.path.join(out, "manifest.json"))       # the manifest appears whole or not at all

    print("BLOG INGEST — %s" % out)
    print("=" * 72)
    print("inputs: %d file(s) · blogs: %d" % (len(entries), len(blogs)))
    for blog in blogs:
        print("\n[%s] %s" % (blog["id"], blog["title"]["text"] if blog["title"] else "(no title found)"))
        print("  documents : %s" % ", ".join("%s → %s" % (d["name"], d["status"]) for d in blog["documents"]))
        placed = sum(1 for p in blog["placements"] if p["status"] == "placed")
        print("  content   : %d blocks in %d sections" % (blog["counts"]["blocks"], blog["counts"]["sections"]))
        print("  media     : %d asset(s), %d placed, %d unplaced, %d missing" % (len(blog["assets"]), placed, sum(1 for p in blog["placements"] if p["status"] == "unplaced"), blog["counts"]["missingMedia"]))
        for item in blog["issues"]:
            if item["severity"] != "info":
                print("  %-7s %s — %s" % (item["severity"].upper(), item["code"], item["message"]))
    for item in issues:
        print("%-7s %s — %s" % (item["severity"].upper(), item["code"], item["message"]))
    print("\nmanifest: %s" % os.path.join(out, "manifest.json"))
    print("next: npm run blog -- preview %s" % options.out)
    return 0 if blogs else 1
