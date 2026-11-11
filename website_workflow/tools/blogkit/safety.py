"""Limits and sanitisers for untrusted uploads.

Nothing in blogkit executes, renders or fetches what it reads. These are the
guards for the remaining risks: archive traversal and decompression bombs, XML
entity expansion, active content inside SVG, and unsafe link schemes.
"""
import os
import re
import zipfile

MAX_FILE_BYTES = 512 * 1024 * 1024          # one input file
MAX_DOC_BYTES = 150 * 1024 * 1024           # one document to parse
MAX_ARCHIVE_ENTRIES = 5000
MAX_ARCHIVE_TOTAL = 2 * 1024 * 1024 * 1024  # uncompressed
MAX_ARCHIVE_RATIO = 200                     # uncompressed : compressed, per entry over 1 MB
MAX_XML_PART = 80 * 1024 * 1024

SAFE_SCHEMES = ("http://", "https://", "mailto:", "tel:")

# Never ingested, whatever the extension claims.
EXECUTABLE_EXT = {
    ".exe", ".dll", ".bat", ".cmd", ".com", ".scr", ".msi", ".ps1", ".vbs", ".js", ".mjs", ".jar", ".sh", ".bash",
    ".app", ".dmg", ".apk", ".php", ".py", ".rb", ".pl", ".lnk", ".hta", ".jse", ".wsf", ".so", ".dylib", ".bin",
}


class UnsafeInput(Exception):
    pass


def safe_href(url):
    """The URL if a browser may follow it from a published page, else None."""
    if not url:
        return None
    u = url.strip()
    if u.startswith("#") or u.startswith("/") and not u.startswith("//"):
        return u
    low = u.lower()
    if low.startswith(SAFE_SCHEMES):
        return u
    if re.match(r"^[a-z][a-z0-9+.-]*:", low):
        return None                          # javascript:, data:, vbscript:, file:, …
    return u                                 # relative reference


def guard_xml(data, name="XML"):
    """Refuse XML that declares entities (expansion bombs, external entities)."""
    if len(data) > MAX_XML_PART:
        raise UnsafeInput("%s part is larger than the %d MB limit" % (name, MAX_XML_PART // 2**20))
    if b"<!ENTITY" in data[: 1 << 20] or b"<!ENTITY" in data:
        raise UnsafeInput("%s declares XML entities, which are not processed" % name)
    return data


def check_zip(zf, name):
    infos = zf.infolist()
    if len(infos) > MAX_ARCHIVE_ENTRIES:
        raise UnsafeInput("%s holds %d entries (limit %d)" % (name, len(infos), MAX_ARCHIVE_ENTRIES))
    total = 0
    for info in infos:
        total += info.file_size
        if info.file_size > 2**20 and info.compress_size > 0 and info.file_size / info.compress_size > MAX_ARCHIVE_RATIO:
            raise UnsafeInput("%s entry %s has a compression ratio above %d:1" % (name, info.filename, MAX_ARCHIVE_RATIO))
        if info.flag_bits & 0x1:
            raise UnsafeInput("%s is password-protected" % name)
    if total > MAX_ARCHIVE_TOTAL:
        raise UnsafeInput("%s expands to more than %d MB" % (name, MAX_ARCHIVE_TOTAL // 2**20))
    return infos


def safe_member_path(root, member):
    """Destination for an archive member, or None when it would escape `root`."""
    member = member.replace("\\", "/")
    if member.startswith("/") or re.match(r"^[A-Za-z]:", member):
        return None
    parts = [p for p in member.split("/") if p not in ("", ".")]
    if any(p == ".." for p in parts) or not parts:
        return None
    dest = os.path.realpath(os.path.join(root, *parts))
    base = os.path.realpath(root)
    return dest if dest == base or dest.startswith(base + os.sep) else None


def open_zip(path):
    zf = zipfile.ZipFile(path)
    check_zip(zf, os.path.basename(path))
    return zf


def zip_read(zf, name, limit=MAX_XML_PART):
    info = zf.getinfo(name)
    if info.file_size > limit:
        raise UnsafeInput("%s is larger than the %d MB part limit" % (name, limit // 2**20))
    return zf.read(name)


# ---------------------------------------------------------------- SVG
_SVG_BLOCK = re.compile(r"<\s*(script|foreignObject|iframe|object|embed)\b.*?<\s*/\s*\1\s*>", re.I | re.S)
_SVG_SELFCLOSE = re.compile(r"<\s*(script|foreignObject|iframe|object|embed)\b[^>]*/\s*>", re.I | re.S)
_SVG_OPEN = re.compile(r"<\s*/?\s*(script|foreignObject|iframe|object|embed)\b[^>]*>", re.I | re.S)
_ON_ATTR = re.compile(r"\s+on[a-zA-Z]+\s*=\s*(\"[^\"]*\"|'[^']*'|[^\s>]+)", re.S)
_HREF_ATTR = re.compile(r"(\s(?:xlink:)?href\s*=\s*)(\"[^\"]*\"|'[^']*')", re.I)
_STYLE_URL = re.compile(r"url\(\s*(['\"]?)\s*(?!#|data:image/)([^)'\"]*)\1\s*\)", re.I)
_IMPORT = re.compile(r"@import[^;]*;?", re.I)


def sanitize_svg(data):
    """(clean_bytes, removed[]) — active content and external references stripped.

    The published page loads SVG through <img>, where scripts do not run; this is
    defence in depth for the case where a file is later opened directly.
    """
    try:
        src = data.decode("utf-8")
    except UnicodeDecodeError:
        src = data.decode("latin-1")
    removed = []
    if re.search(r"<!ENTITY", src, re.I):
        raise UnsafeInput("SVG declares XML entities")
    for pattern, label in ((_SVG_BLOCK, "active element"), (_SVG_SELFCLOSE, "active element"), (_SVG_OPEN, "active element")):
        src, n = pattern.subn("", src)
        if n:
            removed.append("%d %s(s)" % (n, label))
    src, n = _ON_ATTR.subn("", src)
    if n:
        removed.append("%d event handler attribute(s)" % n)

    def href(m):
        value = m.group(2)[1:-1].strip()
        low = value.lower()
        if low.startswith("#") or low.startswith("data:image/"):
            return m.group(0)
        removed.append("external or scripted reference %s" % value[:60])
        return ""

    src = _HREF_ATTR.sub(href, src)
    src, n = _STYLE_URL.subn("none", src)
    if n:
        removed.append("%d external style URL(s)" % n)
    src, n = _IMPORT.subn("", src)
    if n:
        removed.append("%d @import rule(s)" % n)
    return src.encode("utf-8"), removed
