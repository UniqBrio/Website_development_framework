"""blogkit — blog document ingestion for the Website Workflow (stdlib only).

Run through the launcher: python website_workflow/tools/blog_ingest.py --help
The contract this package produces is `framework:blog-manifest@1`, validated on
the TypeScript side by src/blog/manifest.ts. Process: website_workflow/blog_publishing.md
"""
TOOL_NAME = "blog_ingest.py"
TOOL_VERSION = "1.0.0"
MANIFEST_SCHEMA = "framework:blog-manifest@1"
