"""Limits and sanitisers for untrusted uploads.

Nothing in blogkit executes, renders or fetches what it reads. These are the
guards for the remaining risks: archive traversal and decompression bombs, XML
entity expansion, active content inside SVG, and unsafe link schemes.
"""
import os
import re
import zipfile

# name → (default, hard ceiling). A deployment may LOWER any limit freely (environment BLOGKIT_<NAME> or a
# command-line flag) and may raise it only up to the ceiling: a limit that can be switched off is not a limit.
LIMIT_SPEC = {
    "MAX_FILE_BYTES": (512 * 2**20, 4 * 2**30),          # one input file
    "MAX_DOC_BYTES": (150 * 2**20, 2**30),               # one document to parse
    "MAX_ARCHIVE_ENTRIES": (5000, 50000),
    "MAX_ARCHIVE_TOTAL": (2 * 2**30, 16 * 2**30),        # uncompressed size of one archive
    "MAX_ARCHIVE_RATIO": (200, 1000),                    # uncompressed : compressed, per entry
    "RATIO_FLOOR": (2**20, 2**20),                       # entries smaller than this are not ratio-checked
    "MAX_XML_PART": (80 * 2**20, 512 * 2**20),
    "MAX_FILES": (2000, 20000),                          # files in one package, after unpacking
    "MAX_DEPTH": (12, 40),                               # folder depth inside a package or archive
    "TOOL_TIMEOUT": (300, 3600),                         # seconds for one external tool run
    "TOOL_MEMORY_MB": (4096, 65536),                     # address-space limit for an external tool; 0 = not applied
    "INGEST_TIMEOUT": (900, 6 * 3600),                   # seconds for the whole ingest; 0 = not applied
    "INGEST_MEMORY_MB": (0, 65536),                      # address-space limit for the ingest itself; 0 = not applied
}
MAX_NESTING = 200                                        # block nesting depth any extractor will follow
ZERO_MEANS_OFF = {"TOOL_MEMORY_MB", "INGEST_TIMEOUT", "INGEST_MEMORY_MB"}


def _bounded(name, value):
    default, ceiling = LIMIT_SPEC[name]
    try:
        value = int(value)
    except (TypeError, ValueError):
        return default
    if value == 0 and name in ZERO_MEANS_OFF:
        return 0
    if value <= 0:
        return default
    return min(value, ceiling)


def configure(overrides=None):
    """(Re)compute every limit: environment first, then explicit overrides. Returns the effective values."""
    effective = {}
    for name, (default, _) in LIMIT_SPEC.items():
        value = _bounded(name, os.environ.get("BLOGKIT_" + name, default))
        if overrides and overrides.get(name) is not None:
            value = _bounded(name, overrides[name])
        globals()[name] = effective[name] = value
    return effective


configure()

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
    if u.startswith("//"):
        u = "https:" + u                     # scheme-relative: an external address, never a local path
    if u.startswith("#") or u.startswith("/"):
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
        if info.file_size > RATIO_FLOOR and info.compress_size > 0 and info.file_size / info.compress_size > MAX_ARCHIVE_RATIO:
            raise UnsafeInput("%s entry %s has a compression ratio above %d:1" % (name, info.filename, MAX_ARCHIVE_RATIO))
        if info.flag_bits & 0x1:
            raise UnsafeInput("%s is password-protected" % name)
    if total > MAX_ARCHIVE_TOTAL:
        raise UnsafeInput("%s expands to more than %d MB" % (name, MAX_ARCHIVE_TOTAL // 2**20))
    return infos


def is_public_host(host):
    """True when every address `host` resolves to is a public one.

    Link checking is opt-in, but a document chooses the URLs: without this a link to
    http://169.254.169.254/ or http://localhost:8080/ would make the ingest machine
    request its own metadata service or internal network.
    """
    import ipaddress
    import socket
    try:
        infos = socket.getaddrinfo(host, None)
    except (OSError, UnicodeError):
        return False
    for info in infos:
        try:
            address = ipaddress.ip_address(info[4][0].split("%")[0])
        except ValueError:
            return False
        if address.is_private or address.is_loopback or address.is_link_local or address.is_multicast or address.is_reserved or address.is_unspecified:
            return False
    return bool(infos)


class ToolResult:
    def __init__(self, returncode, stdout, stderr, timed_out=False):
        self.returncode, self.stdout, self.stderr, self.timed_out = returncode, stdout, stderr, timed_out


def run_tool(cmd, timeout=None, memory_limit=True):
    """Run an external tool on untrusted input: time-boxed, resource-limited, killed with its children.

    Never raises. On POSIX the child gets its own session (so a timeout kills the whole
    process group — LibreOffice and poppler start helpers), a CPU-time limit, a limit on
    the size of any file it writes, and an address-space limit unless `memory_limit` is
    False or TOOL_MEMORY_MB is 0. These are a floor, not a sandbox: see the security
    report for running the ingest in a container.
    """
    import signal
    import subprocess
    budget = min(timeout or TOOL_TIMEOUT, TOOL_TIMEOUT)

    def limits():
        try:
            import resource
            resource.setrlimit(resource.RLIMIT_CPU, (budget + 5, budget + 10))
            resource.setrlimit(resource.RLIMIT_FSIZE, (MAX_FILE_BYTES * 4, MAX_FILE_BYTES * 4))
            resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
            if memory_limit and TOOL_MEMORY_MB:
                resource.setrlimit(resource.RLIMIT_AS, (TOOL_MEMORY_MB * 2**20, TOOL_MEMORY_MB * 2**20))
        except Exception:
            pass

    posix = os.name == "posix"
    try:
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, stdin=subprocess.DEVNULL,
                                start_new_session=posix, preexec_fn=limits if posix else None)
    except OSError as error:
        return ToolResult(127, b"", str(error).encode())
    try:
        out, err = proc.communicate(timeout=budget)
        return ToolResult(proc.returncode, out, err)
    except subprocess.TimeoutExpired:
        _kill(proc, posix, signal)
        out, err = proc.communicate()
        return ToolResult(-9, out, (err or b"") + b"\ntimed out after %d s" % budget, timed_out=True)
    except BaseException:
        _kill(proc, posix, signal)        # interrupted (ingest timeout, Ctrl-C): never leave the tool running
        proc.wait()
        raise


def _kill(proc, posix, signal):
    try:
        if posix:
            os.killpg(proc.pid, signal.SIGKILL)
        else:
            proc.kill()
    except OSError:
        pass


def safe_member_path(root, member):
    """Destination for an archive member, or None when it would escape `root`."""
    member = member.replace("\\", "/")
    if member.startswith("/") or re.match(r"^[A-Za-z]:", member):
        return None
    parts = [p for p in member.split("/") if p not in ("", ".")]
    if any(p == ".." for p in parts) or not parts or len(parts) > MAX_DEPTH + 1:
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
