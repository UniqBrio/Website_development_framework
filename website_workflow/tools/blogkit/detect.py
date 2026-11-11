"""Format detection — by SIGNATURE first, extension second.

An extension is a claim; the bytes are the fact. A file whose bytes contradict
its extension is reported, and the bytes win.
"""
import os
import zipfile

DOCUMENT_FORMATS = {"pdf", "docx", "doc", "rtf", "odt", "txt", "md", "html", "json", "xml", "csv", "xlsx", "xls", "pptx", "ppt", "odp", "ods"}
IMAGE_FORMATS = {"png", "jpeg", "gif", "webp", "svg", "avif", "bmp", "tiff", "heic", "ico", "emf", "wmf", "apng"}
VIDEO_FORMATS = {"mp4", "webm", "mov", "m4v", "avi", "mkv", "wmv", "ogv"}
AUDIO_FORMATS = {"mp3", "wav", "m4a", "ogg", "aac", "flac", "opus"}
SUBTITLE_FORMATS = {"vtt", "srt"}

# What a browser can show without conversion.
WEB_IMAGE = {"png", "jpeg", "gif", "webp", "svg", "avif", "apng"}
WEB_VIDEO = {"mp4", "webm", "m4v", "ogv"}
WEB_AUDIO = {"mp3", "wav", "m4a", "ogg", "aac", "opus", "flac"}

EXT = {
    ".pdf": "pdf", ".docx": "docx", ".docm": "docx", ".dotx": "docx", ".doc": "doc", ".rtf": "rtf", ".odt": "odt",
    ".txt": "txt", ".text": "txt", ".md": "md", ".markdown": "md", ".mdown": "md", ".mkd": "md",
    ".html": "html", ".htm": "html", ".xhtml": "html", ".json": "json", ".xml": "xml", ".csv": "csv", ".tsv": "csv",
    ".xlsx": "xlsx", ".xlsm": "xlsx", ".xls": "xls", ".pptx": "pptx", ".ppsx": "pptx", ".pptm": "pptx", ".ppt": "ppt",
    ".odp": "odp", ".ods": "ods",
    ".png": "png", ".jpg": "jpeg", ".jpeg": "jpeg", ".jpe": "jpeg", ".jfif": "jpeg", ".gif": "gif", ".webp": "webp",
    ".svg": "svg", ".avif": "avif", ".bmp": "bmp", ".tif": "tiff", ".tiff": "tiff", ".heic": "heic", ".heif": "heic",
    ".ico": "ico", ".emf": "emf", ".wmf": "wmf", ".apng": "apng",
    ".mp4": "mp4", ".webm": "webm", ".mov": "mov", ".qt": "mov", ".m4v": "m4v", ".avi": "avi", ".mkv": "mkv",
    ".wmv": "wmv", ".ogv": "ogv",
    ".mp3": "mp3", ".wav": "wav", ".m4a": "m4a", ".ogg": "ogg", ".oga": "ogg", ".aac": "aac", ".flac": "flac", ".opus": "opus",
    ".vtt": "vtt", ".srt": "srt", ".zip": "zip",
}

MIME = {
    "png": "image/png", "apng": "image/apng", "jpeg": "image/jpeg", "gif": "image/gif", "webp": "image/webp",
    "svg": "image/svg+xml", "avif": "image/avif", "bmp": "image/bmp", "tiff": "image/tiff", "heic": "image/heic",
    "ico": "image/x-icon", "emf": "image/emf", "wmf": "image/wmf",
    "mp4": "video/mp4", "m4v": "video/mp4", "webm": "video/webm", "mov": "video/quicktime", "avi": "video/x-msvideo",
    "mkv": "video/x-matroska", "wmv": "video/x-ms-wmv", "ogv": "video/ogg",
    "mp3": "audio/mpeg", "wav": "audio/wav", "m4a": "audio/mp4", "ogg": "audio/ogg", "aac": "audio/aac",
    "flac": "audio/flac", "opus": "audio/opus", "vtt": "text/vtt", "srt": "application/x-subrip",
    "pdf": "application/pdf",
}


def _zip_kind(path):
    try:
        with zipfile.ZipFile(path) as zf:
            names = set(zf.namelist())
            if "word/document.xml" in names:
                return "docx"
            if "ppt/presentation.xml" in names:
                return "pptx"
            if "xl/workbook.xml" in names:
                return "xlsx"
            if "mimetype" in names:
                mt = zf.read("mimetype")[:80].decode("ascii", "replace").strip()
                return {
                    "application/vnd.oasis.opendocument.text": "odt",
                    "application/vnd.oasis.opendocument.presentation": "odp",
                    "application/vnd.oasis.opendocument.spreadsheet": "ods",
                }.get(mt, "zip")
    except (zipfile.BadZipFile, OSError):
        return None
    return "zip"


def _ole_kind(path, ext_format):
    """OLE2 compound file: tell DOC / XLS / PPT apart by their stream names."""
    try:
        with open(path, "rb") as fh:
            blob = fh.read(4 * 1024 * 1024)
    except OSError:
        return None
    marks = (("W\x00o\x00r\x00d\x00D\x00o\x00c\x00u\x00m\x00e\x00n\x00t", "doc"),
             ("P\x00o\x00w\x00e\x00r\x00P\x00o\x00i\x00n\x00t", "ppt"),
             ("W\x00o\x00r\x00k\x00b\x00o\x00o\x00k", "xls"))
    for mark, kind in marks:
        if mark.encode("latin-1") in blob:
            return kind
    return ext_format if ext_format in ("doc", "xls", "ppt") else "ole"


def sniff(path):
    """Format from the leading bytes, or None when the bytes carry no signature."""
    try:
        with open(path, "rb") as fh:
            head = fh.read(4096)
    except OSError:
        return None
    if not head:
        return "empty"
    ext_format = EXT.get(os.path.splitext(path)[1].lower())
    if head.startswith(b"%PDF-"):
        return "pdf"
    if head.startswith(b"PK\x03\x04") or head.startswith(b"PK\x05\x06"):
        return _zip_kind(path)
    if head.startswith(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"):
        return _ole_kind(path, ext_format)
    if head.startswith(b"{\\rtf"):
        return "rtf"
    if head.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if head.startswith(b"\xff\xd8\xff"):
        return "jpeg"
    if head[:6] in (b"GIF87a", b"GIF89a"):
        return "gif"
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "webp"
    if head[:4] == b"RIFF" and head[8:12] == b"WAVE":
        return "wav"
    if head[:4] == b"RIFF" and head[8:12] == b"AVI ":
        return "avi"
    if head[:2] == b"BM" and ext_format == "bmp":
        return "bmp"
    if head[:4] in (b"II*\x00", b"MM\x00*"):
        return "tiff"
    if head[:4] == b"\x1aE\xdf\xa3":
        return "webm" if b"webm" in head[:64] else ("mkv" if ext_format != "webm" else "webm")
    if head[4:8] == b"ftyp":
        brand = head[8:12]
        if brand in (b"avif", b"avis"):
            return "avif"
        if brand in (b"heic", b"heix", b"mif1", b"hevc", b"heim"):
            return "heic"
        if brand.startswith(b"qt"):
            return "mov"
        if brand in (b"M4A ", b"M4B "):
            return "m4a"
        if brand in (b"M4V ",):
            return "m4v"
        return "mov" if ext_format == "mov" else ("m4a" if ext_format == "m4a" else "mp4")
    if head[:3] == b"ID3" or (head[0] == 0xFF and (head[1] & 0xE0) == 0xE0 and ext_format == "mp3"):
        return "mp3"
    if head[:4] == b"OggS":
        return "ogv" if ext_format == "ogv" else ("opus" if b"OpusHead" in head else "ogg")
    if head[:4] == b"fLaC":
        return "flac"
    if head[:4] == b"\x01\x00\x00\x00" and head[40:44] == b" EMF":
        return "emf"
    if head[:4] == b"\xd7\xcd\xc6\x9a":
        return "wmf"
    if head[:4] == b"\x30\x26\xb2\x75":
        return "wmv"
    if head[:2] == b"MZ" or head[:4] == b"\x7fELF":
        return "executable"
    stripped = head.lstrip(b"\xef\xbb\xbf\r\n\t ")
    low = stripped[:512].lower()
    if low.startswith(b"webvtt"):
        return "vtt"
    if low.startswith(b"<?xml") or low.startswith(b"<svg") or low.startswith(b"<!doctype svg"):
        return "svg" if b"<svg" in head.lower() else ("html" if b"<html" in head.lower() else "xml")
    if low.startswith(b"<!doctype html") or low.startswith(b"<html"):
        return "html"
    return None


TEXT_FORMATS = {"txt", "md", "html", "json", "xml", "csv", "srt", "vtt", "svg", "rtf"}


def detect(path):
    """{format, by, extensionFormat, mismatch} for one file."""
    ext_format = EXT.get(os.path.splitext(path)[1].lower())
    sig = sniff(path)
    if sig == "apng":
        sig = "png"
    if sig is None:
        fmt, by = (ext_format, "extension") if ext_format else (None, "unknown")
        # A binary file wearing a text extension is not that text format.
        if fmt in TEXT_FORMATS and _looks_binary(path):
            return {"format": None, "by": "unknown", "extensionFormat": ext_format, "mismatch": True}
        return {"format": fmt, "by": by, "extensionFormat": ext_format, "mismatch": False}
    if sig in ("zip", "ole", "empty", "executable"):
        fmt = "zip" if sig == "zip" else None
        return {"format": fmt, "by": "signature", "extensionFormat": ext_format, "mismatch": ext_format not in (None, fmt), "special": sig}
    same = {("xml", "svg"), ("html", "xml"), ("mp4", "m4v"), ("mp4", "mov"), ("m4a", "mp4"), ("xml", "html"), ("png", "apng")}
    mismatch = bool(ext_format) and ext_format != sig and (ext_format, sig) not in same and (sig, ext_format) not in same
    # Text formats that only an extension can name (md/txt/csv/json) keep their extension format.
    if sig in ("xml", "html") and ext_format in ("md", "txt", "csv", "json"):
        return {"format": ext_format, "by": "extension", "extensionFormat": ext_format, "mismatch": False}
    return {"format": sig, "by": "signature", "extensionFormat": ext_format, "mismatch": mismatch}


def _looks_binary(path):
    try:
        with open(path, "rb") as fh:
            chunk = fh.read(8192)
    except OSError:
        return False
    if b"\x00" in chunk:
        return not (chunk.startswith(b"\xff\xfe") or chunk.startswith(b"\xfe\xff"))
    return False


def category(fmt):
    if fmt in DOCUMENT_FORMATS:
        return "document"
    if fmt in IMAGE_FORMATS:
        return "image"
    if fmt in VIDEO_FORMATS:
        return "video"
    if fmt in AUDIO_FORMATS:
        return "audio"
    if fmt in SUBTITLE_FORMATS:
        return "subtitle"
    if fmt == "zip":
        return "archive"
    return "other"
