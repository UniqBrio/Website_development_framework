#!/usr/bin/env python3
"""
blog_ingest.py — blog document + media ingestion for the Website Workflow.

Turns an ALREADY-WRITTEN blog (documents, embedded and separately supplied
media, a folder or a ZIP) into a `framework:blog-manifest@1`: content blocks in
reading order, every media asset with a unique id, asset-to-section placements
with the basis for each, and an issue list. It extracts and associates; it
never writes, rewrites or invents content.

Usage:
  python website_workflow/tools/blog_ingest.py <inputs...> --out <run dir>
  python website_workflow/tools/blog_ingest.py --capabilities

Standard library only. PDF, legacy DOC/PPT/XLS, OCR and media measurement use
poppler, LibreOffice, tesseract and ffmpeg WHEN INSTALLED; when one is absent
the affected content is reported as unavailable, never guessed.
Process: website_workflow/blog_publishing.md. Code: website_workflow/tools/blogkit/.
Exit: 0 manifest written · 1 no usable document · 2 bad invocation.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from blogkit.ingest import run  # noqa: E402

if __name__ == "__main__":
    sys.exit(run())
