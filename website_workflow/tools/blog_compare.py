#!/usr/bin/env python3
"""
blog_compare.py — compare a source document with its preview, INDEPENDENTLY of the ingest.

    python website_workflow/tools/blog_compare.py <source document> <preview index.html> [--json]

The ingest's own completeness check compares the page with what the ingest
extracted; it cannot notice text the ingest never extracted. This tool reads the
source with different software — pandoc (DOCX, ODT, RTF, Markdown, HTML) or
poppler's pdftotext (PDF) — and reports how much of the source's wording appears
on the preview page, in order, and which passages do not.

It is EVIDENCE for the owner's review, not a gate: page furniture, headers,
alternative layouts and the extractors' own differences all move the number.
Read the "not found" passages; do not just read the percentage. Known, harmless
causes: footnote numbers; pdftotext's own reading order across table columns;
a PDF link that starts mid-word (the ingest reports PDF_LINK_SPAN_APPROXIMATE).

Exit: 0 compared · 2 the source could not be read here (tool missing).
"""
import argparse
import difflib
import html
import json
import os
import re
import shutil
import subprocess
import sys

TOKEN = re.compile(r"[0-9A-Za-zÀ-ɏऀ-෿₹%]+(?:[.,][0-9]+)*")


def words(text):
    return [t.lower() for t in TOKEN.findall(text)]


def source_text(path):
    ext = os.path.splitext(path)[1].lower()
    if ext == ".pdf":
        tool = shutil.which("pdftotext")
        if not tool:
            return None, "pdftotext (poppler-utils) is not installed"
        done = subprocess.run([tool, "-enc", "UTF-8", path, "-"], capture_output=True, timeout=120)
        return re.sub(r"(?m)^\s*\d{1,3}[.)]\s+", "", done.stdout.decode("utf-8", "replace")), "pdftotext"
    formats = {".docx": "docx", ".odt": "odt", ".rtf": "rtf", ".md": "markdown", ".markdown": "markdown", ".html": "html", ".htm": "html", ".txt": "markdown"}
    if ext not in formats:
        return None, "no independent reader for %s" % ext
    tool = shutil.which("pandoc")
    if not tool:
        return None, "pandoc is not installed"
    # Front matter is parsed as metadata (pandoc's default), not read as body text. Its values are compared
    # by the validation report, which shows the title, subtitle and metadata with their sources.
    done = subprocess.run([tool, "-f", formats[ext], "-t", "plain", "--wrap=none", path], capture_output=True, timeout=120)
    text = done.stdout.decode("utf-8", "replace")
    # Ordered-list numbers are drawn by the browser, not written into the page: they are not content to find.
    return re.sub(r"(?m)^\s*\d{1,3}[.)]\s+", "", text), "pandoc"


def preview_text(path):
    with open(path, encoding="utf-8") as fh:
        page = fh.read()
    page = re.sub(r'<aside class="c-blog-review"[\s\S]*?</aside>', " ", page)          # the review panel is not content
    page = re.sub(r'<div class="c-blog-review"[\s\S]*?</div>', " ", page)
    page = re.sub(r"<(script|style|head)\b[\s\S]*?</\1>", " ", page, flags=re.I)
    m = re.search(r"<article\b[\s\S]*</article>", page)
    body = m.group(0) if m else page
    # Alternative text and link targets are content of the page even though they are not visible text.
    body = re.sub(r'<img\b[^>]*\balt="([^"]*)"[^>]*>', r" \1 ", body)
    body = re.sub(r'<a\b[^>]*\bhref="(https?://[^"]*)"[^>]*>', r" \1 ", body)
    return html.unescape(re.sub(r"<[^>]+>", " ", body))


def compare(source_words, preview_words):
    matcher = difflib.SequenceMatcher(None, source_words, preview_words, autojunk=False)
    matched = sum(block.size for block in matcher.get_matching_blocks())
    missing = []
    for tag, i1, i2, _j1, _j2 in matcher.get_opcodes():
        if tag in ("delete", "replace") and i2 > i1:
            missing.append(" ".join(source_words[i1:i2]))
    return matched, missing


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source")
    parser.add_argument("preview")
    parser.add_argument("--json", action="store_true")
    options = parser.parse_args()
    text, reader = source_text(options.source)
    if text is None:
        print("cannot compare: %s" % reader, file=sys.stderr)
        return 2
    src, prev = words(text), words(preview_text(options.preview))
    matched, missing = compare(src, prev)
    report = {
        "source": os.path.basename(options.source), "reader": reader, "sourceWords": len(src), "previewWords": len(prev),
        "matchedInOrder": matched, "coverage": round(matched / len(src), 4) if src else None,
        "notFound": [m for m in missing if len(m.split()) >= 1][:40],
    }
    if options.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    else:
        print("%s (read by %s): %d of %d source words found on the preview, in order (%.1f%%)" % (
            report["source"], reader, matched, len(src), 100 * (report["coverage"] or 0)))
        for passage in report["notFound"]:
            print("  not found: %s" % passage[:160])
    return 0


if __name__ == "__main__":
    sys.exit(main())
