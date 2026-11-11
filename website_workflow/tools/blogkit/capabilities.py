"""Optional system tools, detected once. Absence is reported, never worked around silently."""
import shutil

_TOOLS = {
    "pdftohtml": "poppler-utils (PDF text, layout, links, images)",
    "pdftoppm": "poppler-utils (PDF page rasterisation, needed for OCR)",
    "pdfinfo": "poppler-utils (PDF facts)",
    "tesseract": "tesseract-ocr (OCR for scanned PDFs and images of text)",
    "soffice": "LibreOffice (legacy DOC / PPT / XLS, ODP / ODS, EMF / WMF conversion)",
    "ffprobe": "ffmpeg (video and audio duration, dimensions, codecs)",
    "ffmpeg": "ffmpeg (opt-in media conversion with --convert-media)",
}
_cache = {}
_disabled = set()


def disable(names):
    """Test seam: behave as though these tools were not installed."""
    _disabled.update(names)
    _cache.clear()


def have(tool):
    if tool in _disabled:
        return False
    if tool not in _cache:
        _cache[tool] = shutil.which(tool) or (shutil.which("libreoffice") if tool == "soffice" else None)
    return bool(_cache[tool])


def which(tool):
    return _cache.get(tool) if have(tool) else None


def report():
    return {tool: {"available": have(tool), "provides": what} for tool, what in _TOOLS.items()}
