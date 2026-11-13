"""Media probing from the bytes: dimensions, animation, duration.

Stdlib parsers for the common web formats; ffprobe is used when it is installed
and never required. A fact that could not be measured is None — never guessed.
"""
import json
import re
import struct
from . import capabilities, safety


def _png(data):
    if len(data) < 33:
        return {}
    width, height = struct.unpack(">II", data[16:24])
    info = {"width": width, "height": height, "animated": False}
    pos = 8
    while pos + 8 <= len(data):
        length, kind = struct.unpack(">I4s", data[pos:pos + 8])
        if kind == b"acTL" and pos + 16 <= len(data):
            frames = struct.unpack(">I", data[pos + 8:pos + 12])[0]
            info.update(animated=frames > 1, frames=frames)
            break
        if kind == b"IDAT":
            break
        pos += 12 + length
    return info


def _jpeg(data):
    pos = 2
    while pos + 9 < len(data):
        if data[pos] != 0xFF:
            pos += 1
            continue
        marker = data[pos + 1]
        if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
            height, width = struct.unpack(">HH", data[pos + 5:pos + 9])
            return {"width": width, "height": height, "animated": False}
        if marker in (0xD8, 0x01) or 0xD0 <= marker <= 0xD7:
            pos += 2
            continue
        pos += 2 + struct.unpack(">H", data[pos + 2:pos + 4])[0]
    return {}


def _gif(data):
    if len(data) < 13:
        return {}
    width, height = struct.unpack("<HH", data[6:10])
    flags = data[10]
    pos = 13 + (3 * (2 << (flags & 7)) if flags & 0x80 else 0)
    frames = 0
    try:
        while pos < len(data):
            block = data[pos]
            if block == 0x2C:                       # image descriptor
                frames += 1
                local = data[pos + 9]
                pos += 10 + (3 * (2 << (local & 7)) if local & 0x80 else 0)
                pos += 1                            # LZW minimum code size
                while data[pos]:
                    pos += data[pos] + 1
                pos += 1
            elif block == 0x21:                     # extension
                pos += 2
                while data[pos]:
                    pos += data[pos] + 1
                pos += 1
            else:                                   # trailer or garbage
                break
    except IndexError:
        pass
    return {"width": width, "height": height, "animated": frames > 1, "frames": frames}


def _webp(data):
    info = {}
    pos = 12
    while pos + 8 <= len(data):
        kind, size = data[pos:pos + 4], struct.unpack("<I", data[pos + 4:pos + 8])[0]
        body = data[pos + 8:pos + 8 + size]
        if kind == b"VP8X" and len(body) >= 10:
            info["animated"] = bool(body[0] & 0x02)
            info["width"] = 1 + int.from_bytes(body[4:7], "little")
            info["height"] = 1 + int.from_bytes(body[7:10], "little")
        elif kind == b"VP8 " and len(body) >= 10 and "width" not in info:
            info["width"] = struct.unpack("<H", body[6:8])[0] & 0x3FFF
            info["height"] = struct.unpack("<H", body[8:10])[0] & 0x3FFF
        elif kind == b"VP8L" and len(body) >= 5 and "width" not in info:
            bits = int.from_bytes(body[1:5], "little")
            info["width"] = (bits & 0x3FFF) + 1
            info["height"] = ((bits >> 14) & 0x3FFF) + 1
        elif kind == b"ANMF":
            info["frames"] = info.get("frames", 0) + 1
        pos += 8 + size + (size & 1)
    info.setdefault("animated", False)
    return info


_LENGTH = re.compile(r"^\s*([0-9.]+)\s*(px|pt|mm|cm|in|em|%)?\s*$")
_UNIT = {None: 1.0, "px": 1.0, "pt": 96 / 72, "mm": 96 / 25.4, "cm": 96 / 2.54, "in": 96.0}


def _svg(data):
    head = data[:20000].decode("utf-8", "replace")
    m = re.search(r"<svg\b[^>]*>", head, re.S)
    if not m:
        return {}
    tag = m.group(0)

    def attr(name):
        a = re.search(r"\b%s\s*=\s*[\"']([^\"']*)[\"']" % name, tag)
        return a.group(1) if a else None

    def length(value):
        mm = _LENGTH.match(value or "")
        if not mm or mm.group(2) in ("%", "em"):
            return None
        return float(mm.group(1)) * _UNIT[mm.group(2)]

    width, height = length(attr("width")), length(attr("height"))
    box = attr("viewBox")
    if (width is None or height is None) and box:
        parts = re.split(r"[\s,]+", box.strip())
        if len(parts) == 4:
            try:
                bw, bh = float(parts[2]), float(parts[3])
                if width is None and height is None:
                    width, height = bw, bh
                elif width is None and bh:
                    width = height * bw / bh
                elif bw:
                    height = width * bh / bw
            except ValueError:
                pass
    info = {"animated": bool(re.search(r"<\s*(animate|animateTransform|animateMotion)\b|@keyframes", data.decode("utf-8", "replace")))}
    if width and height:
        info.update(width=int(round(width)), height=int(round(height)))
    return info


def _bmp(data):
    if len(data) < 26:
        return {}
    width, height = struct.unpack("<ii", data[18:26])
    return {"width": abs(width), "height": abs(height), "animated": False}


def _isobmff_boxes(data, start=0, end=None, depth=0):
    end = len(data) if end is None else end
    pos = start
    while pos + 8 <= end and depth < 8:
        size, kind = struct.unpack(">I4s", data[pos:pos + 8])
        header = 8
        if size == 1 and pos + 16 <= end:
            size = struct.unpack(">Q", data[pos + 8:pos + 16])[0]
            header = 16
        elif size == 0:
            size = end - pos
        if size < header or pos + size > end:
            return
        yield kind, pos + header, pos + size
        if kind in (b"moov", b"trak", b"mdia", b"minf", b"stbl", b"meta", b"iprp", b"ipco"):
            inner = pos + header + (4 if kind == b"meta" else 0)
            yield from _isobmff_boxes(data, inner, pos + size, depth + 1)
        pos += size


def _isobmff(data):
    """Width/height/duration for MP4, MOV, M4A, AVIF, HEIC (moov must be in `data`)."""
    info = {}
    for kind, start, end in _isobmff_boxes(data):
        body = data[start:end]
        if kind == b"mvhd" and len(body) >= 20:
            if body[0] == 1 and len(body) >= 32:
                scale, duration = struct.unpack(">IQ", body[20:32])
            else:
                scale, duration = struct.unpack(">II", body[12:20])
            if scale:
                info["durationSeconds"] = round(duration / scale, 3)
        elif kind == b"tkhd" and len(body) >= 8:
            w, h = struct.unpack(">II", body[-8:])
            w, h = w >> 16, h >> 16
            if w and h and "width" not in info:
                info.update(width=w, height=h)
        elif kind == b"ispe" and len(body) >= 12 and "width" not in info:
            w, h = struct.unpack(">II", body[4:12])
            info.update(width=w, height=h)
    return info


def _ffprobe(path):
    if not capabilities.have("ffprobe"):
        return {}
    out = safety.run_tool(["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", path], timeout=60)
    try:
        data = json.loads(out.stdout.decode("utf-8", "replace") or "{}")
    except ValueError:
        return {}
    info = {}
    for stream in data.get("streams", []):
        if stream.get("codec_type") == "video" and "width" not in info and stream.get("disposition", {}).get("attached_pic") != 1:
            info.update(width=stream.get("width"), height=stream.get("height"), videoCodec=stream.get("codec_name"))
        elif stream.get("codec_type") == "audio" and "audioCodec" not in info:
            info["audioCodec"] = stream.get("codec_name")
    try:
        info["durationSeconds"] = round(float(data.get("format", {}).get("duration")), 3)
    except (TypeError, ValueError):
        pass
    if data.get("streams") is not None:
        info["probedBy"] = "ffprobe"
    return {k: v for k, v in info.items() if v is not None}


TRAILERS = {"png": b"IEND\xaeB`\x82", "jpeg": b"\xff\xd9", "gif": b"\x3b"}


def looks_truncated(path, fmt):
    """True when a PNG / JPEG / GIF does not end with its end-of-image marker."""
    marker = TRAILERS.get(fmt)
    if marker is None:
        return False
    try:
        with open(path, "rb") as fh:
            fh.seek(0, 2)
            size = fh.tell()
            fh.seek(max(0, size - 64))
            tail = fh.read().rstrip(b"\x00\r\n ")
    except OSError:
        return False
    return not tail.endswith(marker)


def has_location_metadata(path, fmt):
    """True when a JPEG carries an Exif GPS block. Photographs published as-is publish it too."""
    if fmt != "jpeg":
        return False
    try:
        with open(path, "rb") as fh:
            data = fh.read(256 * 1024)
    except OSError:
        return False
    pos = 2
    while pos + 4 <= len(data) and data[pos] == 0xFF:
        marker, size = data[pos + 1], struct.unpack(">H", data[pos + 2:pos + 4])[0]
        if marker == 0xE1 and data[pos + 4:pos + 10] == b"Exif\x00\x00":
            tiff = data[pos + 10:pos + 2 + size]
            if len(tiff) < 8:
                return False
            order = "<" if tiff[:2] == b"II" else ">"
            try:
                offset = struct.unpack(order + "I", tiff[4:8])[0]
                count = struct.unpack(order + "H", tiff[offset:offset + 2])[0]
                for i in range(min(count, 200)):
                    tag = struct.unpack(order + "H", tiff[offset + 2 + 12 * i:offset + 4 + 12 * i])[0]
                    if tag == 0x8825:
                        return True
            except struct.error:
                return False
            return False
        if marker == 0xDA:
            break
        pos += 2 + size
    return False


def probe(path, fmt):
    """Measured facts about one media file. Missing keys = not measurable here."""
    try:
        with open(path, "rb") as fh:
            data = fh.read(64 * 1024 * 1024)
    except OSError:
        return {}
    try:
        if fmt in ("png", "apng"):
            return _png(data)
        if fmt == "jpeg":
            return _jpeg(data)
        if fmt == "gif":
            return _gif(data)
        if fmt == "webp":
            return _webp(data)
        if fmt == "svg":
            return _svg(data)
        if fmt == "bmp":
            return _bmp(data)
        if fmt in ("avif", "heic"):
            info = _isobmff(data)
            info.setdefault("animated", data[8:12] == b"avis")
            return info
        if fmt in ("mp4", "mov", "m4v", "m4a", "webm", "mkv", "avi", "wmv", "ogv", "mp3", "wav", "ogg", "aac", "flac", "opus"):
            info = _ffprobe(path)
            if fmt in ("mp4", "mov", "m4v", "m4a") and ("durationSeconds" not in info or (fmt != "m4a" and "width" not in info)):
                # ffprobe absent or silent: read the container's own header boxes.
                for key, value in _isobmff(data).items():
                    info.setdefault(key, value)
                info.setdefault("probedBy", "container")
            return info
    except (struct.error, IndexError, ValueError):
        return {}
    return {}


def srt_to_vtt(text):
    """SubRip → WebVTT. Timestamps and cue text are unchanged; only the syntax differs."""
    text = text.lstrip("﻿").replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"(\d{2}:\d{2}:\d{2}),(\d{3})", r"\1.\2", text)
    return "WEBVTT\n\n" + text.strip() + "\n"
