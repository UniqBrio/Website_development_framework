"""Unit and resilience tests for the blog ingest tool (standard library only).

    python -m unittest discover -s tests/python -v

Covers what is cheapest to assert in Python: the parsers' own functions, the
safety limits, and how the command line behaves on hostile, corrupt, oversized
and interrupted input.
"""
import io
import json
import os
import struct
import subprocess
import sys
import tempfile
import time
import unittest
import zipfile
import zlib

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TOOLS = os.path.join(ROOT, "website_workflow", "tools")
sys.path.insert(0, TOOLS)

from blogkit import associate, detect, htmldoc, ingest, media, model, ooxml, rtf, safety, structured, textdoc  # noqa: E402

TOOL = os.path.join(TOOLS, "blog_ingest.py")


def png(width=8, height=8):
    def chunk(kind, body):
        return struct.pack(">I", len(body)) + kind + body + struct.pack(">I", zlib.crc32(kind + body) & 0xFFFFFFFF)
    row = b"\x00" + b"\x10\x20\x30" * width
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(row * height)) + chunk(b"IEND", b"")


def jpeg_with_gps():
    ifd = struct.pack("<H", 1) + struct.pack("<HHII", 0x8825, 4, 1, 26) + struct.pack("<I", 0)
    exif = b"Exif\x00\x00" + b"II*\x00" + struct.pack("<I", 8) + ifd
    sof = b"\xff\xc0" + struct.pack(">HBHHB", 11, 8, 40, 60, 1) + b"\x01\x11\x00"
    return b"\xff\xd8" + b"\xff\xe1" + struct.pack(">H", len(exif) + 2) + exif + sof + b"\xff\xd9"


class Workspace(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.tmp = self._tmp.name
        self.src = os.path.join(self.tmp, "src")
        os.makedirs(self.src)

    def tearDown(self):
        self._tmp.cleanup()

    def write(self, rel, data):
        path = os.path.join(self.src, rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as fh:
            fh.write(data if isinstance(data, bytes) else data.encode("utf-8"))
        return path

    def run_tool(self, *args, env=None, inputs=None, timeout=120):
        out = os.path.join(self.tmp, "run-%d" % len(os.listdir(self.tmp)))
        done = subprocess.run([sys.executable, TOOL, *(inputs or [self.src]), "--out", out, *args], capture_output=True, text=True,
                              env=dict(os.environ, **(env or {})), timeout=timeout)
        manifest = None
        if os.path.exists(os.path.join(out, "manifest.json")):
            with open(os.path.join(out, "manifest.json"), encoding="utf-8") as fh:
                manifest = json.load(fh)
        return done, manifest, out

    @staticmethod
    def codes(manifest, blog=0):
        return [i["code"] for i in manifest["blogs"][blog]["issues"]] + [i["code"] for i in manifest["issues"]]


# ===================================================================== pure functions

class Safety(unittest.TestCase):
    def test_safe_href_allows_only_web_mail_tel_and_relative(self):
        for bad in ("javascript:alert(1)", " JAVASCRIPT:x", "data:text/html,x", "vbscript:x", "file:///etc/passwd"):
            self.assertIsNone(safety.safe_href(bad), bad)
        self.assertEqual(safety.safe_href("//cdn.example/x"), "https://cdn.example/x")   # external, never resolved as a local path
        for ok in ("https://example.org/a", "http://example.org", "mailto:a@example.org", "tel:+91123", "#frag", "/root", "images/a.png"):
            self.assertEqual(safety.safe_href(ok), ok)

    def test_archive_member_paths_cannot_escape(self):
        with tempfile.TemporaryDirectory() as root:
            for bad in ("../x", "a/../../x", "/etc/passwd", "C:\\x", "..\\..\\x", "a/b/../../../x", ""):
                self.assertIsNone(safety.safe_member_path(root, bad), bad)
            inside = safety.safe_member_path(root, "a/b/c.png")
            self.assertTrue(inside.startswith(os.path.realpath(root) + os.sep))

    def test_xml_with_entity_declarations_is_refused(self):
        bomb = b'<?xml version="1.0"?><!DOCTYPE lolz [<!ENTITY lol "lol"><!ENTITY lol2 "&lol;&lol;&lol;">]><lolz>&lol2;</lolz>'
        with self.assertRaises(safety.UnsafeInput):
            safety.guard_xml(bomb)
        xxe = b'<?xml version="1.0"?><!DOCTYPE r [<!ENTITY x SYSTEM "file:///etc/passwd">]><r>&x;</r>'
        with self.assertRaises(safety.UnsafeInput):
            safety.guard_xml(xxe)

    def test_svg_sanitiser_removes_active_content_and_keeps_drawing(self):
        dirty = (b'<svg xmlns="http://www.w3.org/2000/svg" onload="x()" width="10" height="10"><script>alert(1)</script><SCRIPT src="//e/x.js"/>'
                 b'<foreignObject><iframe src="//e"/></foreignObject><a href="javascript:x()"><rect width="5" height="5" onclick="y()"/></a>'
                 b'<image href="https://e/track.png"/><use href="#ok"/><style>@import url(//e/x.css); a{fill:url(https://e/p)}</style></svg>')
        clean, removed = safety.sanitize_svg(dirty)
        text = clean.decode()
        for needle in ("<script", "onload", "onclick", "javascript:", "foreignObject", "iframe", "https://e/", "//e/", "@import"):
            self.assertNotIn(needle.lower(), text.lower(), needle)
        self.assertIn("<rect", text)
        self.assertIn('href="#ok"', text)
        self.assertTrue(removed)
        with self.assertRaises(safety.UnsafeInput):
            safety.sanitize_svg(b'<!DOCTYPE svg [<!ENTITY x "y">]><svg/>')

    def test_limits_are_configurable_but_capped_by_a_fixed_ceiling(self):
        code = "import sys; sys.path.insert(0, %r); from blogkit import safety; print(safety.MAX_FILE_BYTES, safety.MAX_ARCHIVE_ENTRIES, safety.MAX_ARCHIVE_RATIO, safety.TOOL_TIMEOUT)" % TOOLS
        env = dict(os.environ, BLOGKIT_MAX_FILE_BYTES="1000", BLOGKIT_MAX_ARCHIVE_ENTRIES="99999999", BLOGKIT_MAX_ARCHIVE_RATIO="-5", BLOGKIT_TOOL_TIMEOUT="not-a-number")
        low = subprocess.run([sys.executable, "-c", code], capture_output=True, text=True, env=env)
        # lowered → applied; raised past the ceiling → the ceiling; nonsense → the default. Never unlimited.
        self.assertEqual(low.stdout.split(), ["1000", str(safety.LIMIT_SPEC["MAX_ARCHIVE_ENTRIES"][1]), "200", "300"])
        for name, (default, ceiling) in safety.LIMIT_SPEC.items():
            self.assertLessEqual(default, ceiling, name)
            self.assertEqual(safety._bounded(name, 10 ** 15), ceiling, name)

    def test_link_checker_refuses_non_public_hosts(self):
        for host in ("127.0.0.1", "localhost", "169.254.169.254", "10.0.0.5", "192.168.1.1", "0.0.0.0", "[::1]".strip("[]"), "no-such-host.invalid"):
            self.assertFalse(safety.is_public_host(host), host)


class Detection(Workspace):
    def test_bytes_decide_the_format(self):
        cases = {
            "a.png": (png(), "png"), "b.jpg": (png(), "png"), "c.gif": (b"GIF89a" + b"\x00" * 20, "gif"), "d.pdf": (b"%PDF-1.7\n", "pdf"),
            "e.txt": (b"plain words", "txt"), "f.md": (b"# h", "md"), "g.svg": (b'<svg xmlns="http://www.w3.org/2000/svg"/>', "svg"),
            "h.exe": (b"MZ\x90\x00", None), "i.png": (b"MZ\x90\x00", None), "j.webp": (b"RIFF\x00\x00\x00\x00WEBPVP8 ", "webp"),
        }
        for name, (data, expected) in cases.items():
            self.assertEqual(detect.detect(self.write(name, data))["format"], expected, name)

    def test_a_signed_format_without_its_signature_is_corrupt_not_guessed(self):
        for name in ("x.png", "x.jpg", "x.mp4", "x.pdf", "x.docx", "x.gif"):
            info = detect.detect(self.write(name, b"these are not the bytes of that format at all"))
            self.assertEqual((info["format"], info.get("special")), (None, "corrupt"), name)

    def test_binary_file_with_a_text_extension_is_not_text(self):
        self.assertIsNone(detect.detect(self.write("notes.txt", b"\x00\x01\x02\x03binary\x00"))["format"])


class Media(Workspace):
    def test_probe_reads_dimensions_and_animation(self):
        self.assertEqual(media.probe(self.write("a.png", png(31, 17)), "png"), {"width": 31, "height": 17, "animated": False})
        svg = self.write("a.svg", '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 50"/>')
        self.assertEqual({k: media.probe(svg, "svg")[k] for k in ("width", "height")}, {"width": 200, "height": 50})

    def test_truncated_and_located_images_are_detected(self):
        self.assertFalse(media.looks_truncated(self.write("ok.png", png()), "png"))
        self.assertTrue(media.looks_truncated(self.write("cut.png", png()[:-20]), "png"))
        self.assertTrue(media.has_location_metadata(self.write("gps.jpg", jpeg_with_gps()), "jpeg"))
        self.assertFalse(media.has_location_metadata(self.write("plain.jpg", b"\xff\xd8\xff\xd9"), "jpeg"))

    def test_probe_survives_garbage(self):
        for fmt in ("png", "jpeg", "gif", "webp", "svg", "bmp", "avif", "mp4"):
            for data in (b"", b"\x00", os.urandom(64), b"\xff\xd8" + b"\xff" * 40, b"GIF89a", b"RIFF\x00\x00\x00\x00WEBP" + b"VP8X\xff\xff\xff\xff"):
                self.assertIsInstance(media.probe(self.write("g." + fmt, data), fmt), dict)

    def test_srt_to_vtt_changes_syntax_only(self):
        self.assertEqual(media.srt_to_vtt("1\r\n00:00:01,000 --> 00:00:02,500\r\nHi, there\r\n"), "WEBVTT\n\n1\n00:00:01.000 --> 00:00:02.500\nHi, there\n")


class Parsers(unittest.TestCase):
    def blocks(self, source):
        return textdoc.markdown_blocks(source, model.DocResult("t"), False)

    def test_markdown_emphasis_leaves_arithmetic_and_identifiers_alone(self):
        runs = self.blocks("2 * 3 * 4 and snake_case_name and *real* **strong**")[0]["inlines"]
        self.assertEqual(runs[0]["text"], "2 * 3 * 4 and snake_case_name and ")
        self.assertEqual([(r["text"], r.get("italic"), r.get("bold")) for r in runs[1:]], [("real", True, None), (" ", None, None), ("strong", None, True)])

    def test_markdown_nested_structures(self):
        blocks = self.blocks("> quote\n> - item\n>   1. deep\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n```js\nx < y\n```\n")
        self.assertEqual([b["type"] for b in blocks], ["blockquote", "table", "code"])
        inner = blocks[0]["blocks"]
        self.assertEqual(inner[1]["items"][0]["children"][0]["ordered"], True)
        self.assertEqual(blocks[2], {"type": "code", "language": "js", "text": "x < y"})

    def test_placement_directives(self):
        self.assertEqual(model.parse_directive("[IMAGE: chart.png]"), ("image", "chart.png"))
        self.assertEqual(model.parse_directive("{{video: demo.mp4}}"), ("video", "demo.mp4"))
        self.assertEqual(model.parse_directive("[Insert Figure 2 here]"), ("figure", "2"))
        for not_one in ("[1]", "[see the image]", "A sentence with [image: x.png] inside.", "[link](x)"):
            self.assertIsNone(model.parse_directive(not_one), not_one)

    def test_html_is_parsed_into_blocks_never_passed_through(self):
        result = model.DocResult("h")
        blocks = htmldoc.fragment_blocks('<p onmouseover="x()">Hi <a href="JaVaScRiPt:alert(1)">there</a><img src="x.png" onerror="y()"></p><script>z()</script><style>p{}</style><object data="e.swf"></object>', result)
        dump = json.dumps(blocks)
        for needle in ("onmouseover", "onerror", "alert", "z()", "p{}", "swf", "javascript"):
            self.assertNotIn(needle, dump.lower(), needle)
        self.assertEqual(model.plain(blocks[0]["inlines"]), "Hi there")

    def test_spreadsheet_number_formats_are_exact_or_not_applied(self):
        self.assertEqual(ooxml.format_number("0.825", "0.0%", False), ("82.5%", True))
        self.assertEqual(ooxml.format_number("125000.5", "#,##0.00", False), ("125,000.50", True))
        self.assertEqual(ooxml.format_number("1.1000000000000001", "General", False), ("1.1", True))
        self.assertEqual(ooxml.format_number("45000", "0.00E+00", False), ("45000", False))
        self.assertEqual(ooxml.format_number("45672", "yyyy-mm-dd", False), ("2025-01-15", True))

    def test_rtf_parser_never_raises_on_malformed_input(self):
        for data in (b"{\\rtf1", b"{\\rtf1}}}}}", b"{\\rtf1{\\pict\\pngblip zzzz}}", b"{\\rtf1\\u99999999999?}", b"{\\rtf1" + b"{" * 5000, b"{\\rtf1\\'zz\\par}"):
            result = model.DocResult("r")
            try:
                rtf.Rtf(data, result).parse()
            except Exception as error:      # the extractor wrapper turns this into DOCUMENT_CORRUPT; it must not hang or crash the run
                self.assertIsInstance(error, Exception)

    def test_association_never_places_on_weak_evidence(self):
        blocks = [model.heading(2, [model.text("Pricing comparison")]), model.paragraph([model.text("Our offsite was fun and the team enjoyed it.")]), model.heading(2, [model.text("Pricing")])]
        self.assertEqual(associate.by_heading(blocks, "pricing-comparison.png"), 0)
        self.assertIsNone(associate.by_heading(blocks, "photo-1.png"))
        self.assertIsNone(associate.by_heading([blocks[0], blocks[0]], "pricing-comparison.png"))   # two equal matches: ambiguous
        self.assertIsNone(associate.by_context(blocks, "team.png"))                                  # one word is not enough
        self.assertEqual(associate.by_context(blocks, "team-offsite.png"), 1)                        # a SUGGESTION only; ingest never places on it

    def test_json_sidecar_detection(self):
        self.assertTrue(structured.is_sidecar({"cover": "a.png", "assets": {}}))
        self.assertFalse(structured.is_sidecar({"title": "x", "content": "body"}))
        self.assertFalse(structured.is_sidecar([1, 2]))


class NoRunawayParsing(unittest.TestCase):
    """Adversarial inputs must finish quickly: a document must not be able to stall the ingest."""

    def timed(self, fn, limit=4.0):
        start = time.time()
        fn()
        self.assertLess(time.time() - start, limit)

    def test_pathological_markdown(self):
        for source in ("*" * 20000, "[" * 20000, "![" * 10000, "`" * 20001, "> " * 3000 + "x", "- " * 3000 + "x", "|" * 20000 + "\n|-|\n", "_a" * 10000,
                       "[a](" + "(" * 5000, "<" * 20000, "---\ntags: [" + '"a",' * 5000 + "]\n---\nx"):
            def go(source=source):
                try:
                    textdoc.markdown_blocks(source, model.DocResult("t"))
                except RecursionError:
                    pass                       # reported as DOCUMENT_CORRUPT by the extractor wrapper
            self.timed(go)

    def test_deeply_nested_html(self):
        def go():
            try:
                htmldoc.fragment_blocks("<div>" * 20000 + "x" + "</div>" * 20000, model.DocResult("h"))
            except RecursionError:
                pass
        self.timed(go)


# ===================================================================== command line

class CommandLine(Workspace):
    def test_corrupt_missing_duplicate_and_unsupported_media(self):
        self.write("post.md", "# FIXTURE Media Faults\n\n![Broken](broken.png)\n\n![Gone](gone.png)\n\n![A](a.png)\n\n![B](copy-of-a.png)\n\n![Cut](cut.png)\n\n![Tiff](scan.tiff)\n\n![Photo](gps.jpg)\n")
        self.write("broken.png", b"this is not a png at all")
        self.write("a.png", png())
        self.write("copy-of-a.png", png())
        self.write("cut.png", png(9, 9)[:-20])
        self.write("scan.tiff", b"II*\x00" + b"\x00" * 64)
        self.write("gps.jpg", jpeg_with_gps())
        done, manifest, out = self.run_tool()
        self.assertEqual(done.returncode, 0, done.stderr)
        blog = manifest["blogs"][0]
        codes = self.codes(manifest)
        for expected in ("MEDIA_CORRUPT", "MEDIA_MISSING", "MEDIA_DUPLICATE", "MEDIA_POSSIBLY_TRUNCATED", "IMAGE_FORMAT_UNSUPPORTED", "IMAGE_LOCATION_METADATA"):
            self.assertIn(expected, codes)
        missing = [b for b in blog["blocks"] if b["type"] == "missing_media"]
        self.assertEqual([m["reference"] for m in missing], ["broken.png", "gone.png"])
        self.assertIn("supplied but is corrupt", missing[0]["reason"])
        self.assertIn("was not supplied", missing[1]["reason"])
        self.assertFalse(any("broken" in a["filename"] for a in blog["assets"]))
        twins = [b["assetId"] for b in blog["blocks"] if b["type"] == "media" and b.get("alt") in ("A", "B")]
        self.assertEqual(len(set(twins)), 1)                                   # one stored copy, both references kept
        tiff = next(a for a in blog["assets"] if a["format"] == "tiff")
        self.assertFalse(tiff["webReady"])
        for asset in blog["assets"]:                                            # every listed asset is really on disk
            self.assertEqual(os.path.getsize(os.path.join(out, asset["path"])), asset["bytes"])
        self.assertEqual(model.plain(blog["title"]["inlines"]), "FIXTURE Media Faults")   # the valid content still came through

    def test_conflicting_source_documents(self):
        self.write("01-part.md", "---\ntitle: FIXTURE One Title\nauthor: Author A\n---\n\nFirst part.\n")
        self.write("02-part.md", "---\ntitle: FIXTURE Other Title\nauthor: Author B\n---\n\nSecond part.\n")
        self.write("03-part.md", "---\ntitle: FIXTURE Other Title\nauthor: Author B\n---\n\nSecond part.\n")
        done, manifest, _ = self.run_tool()
        blog = manifest["blogs"][0]
        self.assertEqual(blog["title"]["text"], "FIXTURE One Title")
        self.assertEqual(blog["metadata"]["author"]["value"], "Author A")
        conflicts = [i for i in blog["issues"] if i["code"] == "METADATA_CONFLICT"]
        self.assertEqual(len(conflicts), 2)
        self.assertIn('"Author A"', conflicts[1]["message"])
        self.assertIn('"Author B"', conflicts[1]["message"])
        self.assertIn("DOCUMENT_DUPLICATE", self.codes(manifest))
        self.assertEqual(len(blog["documents"]), 2)

    def test_same_blog_in_two_formats_is_not_guessed(self):
        self.write("post.md", "# FIXTURE Twin\n\nMarkdown wording.\n")
        self.write("post.html", "<h1>FIXTURE Twin</h1><p>HTML wording, which differs.</p>")
        done, manifest, _ = self.run_tool()
        self.assertEqual(len(manifest["blogs"]), 2)
        for blog in manifest["blogs"]:
            issue = next(i for i in blog["issues"] if i["code"] == "SOURCE_FORMAT_CONFLICT")
            self.assertEqual(issue["severity"], "error")

    def test_later_part_title_becomes_a_section_with_its_text_intact(self):
        self.write("01.html", "<h1>FIXTURE Whole Post</h1><p>Intro.</p>")
        self.write("02.html", "<h1>FIXTURE Second Part</h1><p>More.</p>")
        done, manifest, _ = self.run_tool()
        blog = manifest["blogs"][0]
        headings = [model.plain(b["inlines"]) for b in blog["blocks"] if b["type"] == "heading"]
        self.assertEqual(headings, ["FIXTURE Second Part"])

    def test_long_article_keeps_every_paragraph_in_order(self):
        body = "\n\n".join("## Section %d\n\nParagraph %d with the figure %d.%d%% exactly." % (i, i, i, i % 10) for i in range(1, 801))
        self.write("long.md", "# FIXTURE Long Article\n\n" + body + "\n")
        start = time.time()
        done, manifest, _ = self.run_tool()
        self.assertLess(time.time() - start, 30)
        blog = manifest["blogs"][0]
        paragraphs = [model.plain(b["inlines"]) for b in blog["blocks"] if b["type"] == "paragraph"]
        self.assertEqual(len(paragraphs), 800)
        self.assertEqual(paragraphs[0], "Paragraph 1 with the figure 1.1% exactly.")
        self.assertEqual(paragraphs[-1], "Paragraph 800 with the figure 800.0% exactly.")
        self.assertEqual(len(blog["sections"]), 800)

    def test_nested_headings_tables_gallery_and_attribution(self):
        self.write("post.md", "# FIXTURE Structure\n\n## Two\n\n### Three\n\n#### Four\n\n##### Five\n\n###### Six\n\n"
                              "![One](1.png) ![Two](2.png) ![Three](3.png)\n\nSource: FIXTURE Photo Agency\n\n"
                              "| A | B |\n|---|---|\n| **x** | [y](https://example.org/y) |\n")
        for name in ("1.png", "2.png", "3.png"):
            self.write(name, png(4 + int(name[0]), 4))
        done, manifest, _ = self.run_tool()
        blog = manifest["blogs"][0]
        self.assertEqual([b["level"] for b in blog["blocks"] if b["type"] == "heading"], [2, 3, 4, 5, 6])
        gallery = [b for b in blog["blocks"] if b["type"] == "media"]
        self.assertEqual([g["alt"] for g in gallery], ["One", "Two", "Three"])
        self.assertEqual(model.plain(gallery[-1]["caption"]), "Source: FIXTURE Photo Agency")   # attribution travels as the caption, verbatim
        cells = next(b for b in blog["blocks"] if b["type"] == "table")["rows"][1]
        self.assertEqual(cells[0]["inlines"], [{"t": "text", "text": "x", "bold": True}])
        self.assertEqual(cells[1]["inlines"][0]["href"], "https://example.org/y")

    def test_nothing_is_invented_for_a_bare_document(self):
        self.write("bare.md", "Just one paragraph, with no title, no headings and an image.\n\n![](shot.png)\n")
        self.write("shot.png", png())
        done, manifest, _ = self.run_tool()
        blog = manifest["blogs"][0]
        self.assertIsNone(blog["title"])
        self.assertIsNone(blog["subtitle"])
        self.assertEqual(blog["metadata"], {})
        image = next(b for b in blog["blocks"] if b["type"] == "media")
        self.assertIsNone(image["alt"])
        self.assertNotIn("caption", image)
        self.assertIn("TITLE_MISSING", self.codes(manifest))
        self.assertIn("ALT_TEXT_MISSING", self.codes(manifest))

    def test_oversized_file_and_decompression_limits(self):
        self.write("post.md", "# FIXTURE Limits\n\nBody.\n")
        self.write("big.png", png() + b"\x00" * 5000)
        done, manifest, _ = self.run_tool(env={"BLOGKIT_MAX_FILE_BYTES": "2000"})
        self.assertIn("FILE_TOO_LARGE", self.codes(manifest))
        self.assertEqual(manifest["blogs"][0]["assets"], [])

        bomb = os.path.join(self.tmp, "bomb.zip")
        with zipfile.ZipFile(bomb, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("post.md", "# FIXTURE Bomb\n\nBody.\n")
            zf.writestr("zeros.bin", b"\x00" * 3_000_000)
        done, manifest, out = self.run_tool(inputs=[bomb])
        self.assertEqual(done.returncode, 1)                                     # nothing usable: the archive was refused whole
        self.assertIn("ARCHIVE_REJECTED", [i["code"] for i in manifest["issues"]])
        self.assertIn("compression ratio", manifest["issues"][0]["message"])
        self.assertFalse(os.path.exists(os.path.join(out, "work")))

        many = os.path.join(self.tmp, "many.zip")
        with zipfile.ZipFile(many, "w") as zf:
            for i in range(60):
                zf.writestr("f%d.txt" % i, "x")
        done, manifest, _ = self.run_tool(inputs=[many], env={"BLOGKIT_MAX_ARCHIVE_ENTRIES": "50"})
        self.assertIn("ARCHIVE_REJECTED", [i["code"] for i in manifest["issues"]])

    def test_malicious_archive_entries(self):
        target = os.path.join(self.tmp, "evil.zip")
        with zipfile.ZipFile(target, "w") as zf:
            zf.writestr("post.md", "# FIXTURE Archive\n\n![p](pic.png)\n")
            zf.writestr("pic.png", png())
            zf.writestr("../escape-1.txt", "x")
            zf.writestr("/abs-escape.txt", "x")
            zf.writestr("a/../../escape-2.txt", "x")
            link = zipfile.ZipInfo("link-to-passwd")
            link.external_attr = (0o120777 << 16)
            zf.writestr(link, "/etc/passwd")
            zf.writestr("inner.zip", b"PK\x05\x06" + b"\x00" * 18)
        done, manifest, out = self.run_tool(inputs=[target])
        self.assertEqual(done.returncode, 0, done.stderr)
        self.assertIn("ARCHIVE_ENTRIES_SKIPPED", [i["code"] for i in manifest["issues"]])
        self.assertIn("NESTED_ARCHIVE_IGNORED", [i["code"] for i in manifest["issues"]])
        self.assertEqual(len(manifest["blogs"][0]["assets"]), 1)
        stray = [f for base, _, names in os.walk(self.tmp) for f in names if "escape" in f]
        self.assertEqual(stray, [])
        self.assertFalse(os.path.exists("/abs-escape.txt"))
        self.assertNotIn("root:", json.dumps(manifest))

    def test_filenames_cannot_steer_paths(self):
        self.write("post.md", "# FIXTURE Names\n\n![a](<..%2F..%2Fetc%2Fpasswd>)\n\n![b](weird%20%26%20name%3B%20rm%20-rf.png)\n")
        self.write("weird & name; rm -rf.png", png())
        done, manifest, out = self.run_tool()
        blog = manifest["blogs"][0]
        for asset in blog["assets"]:
            self.assertRegex(asset["path"], r"^assets/blog-1/[a-z0-9-]+\.[a-z0-9]+$")
        self.assertEqual(len([b for b in blog["blocks"] if b["type"] == "missing_media"]), 1)
        self.assertRegex(blog["slug"], r"^[a-z0-9-]+$")

    def test_missing_optional_tools_are_reported_not_fatal(self):
        self.write("post.md", "# FIXTURE Tools\n\nBody.\n")
        self.write("old.doc", b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1" + b"W\x00o\x00r\x00d\x00D\x00o\x00c\x00u\x00m\x00e\x00n\x00t\x00" + b"\x00" * 600)
        self.write("clip.mov", b"\x00\x00\x00\x14ftypqt  \x00\x00\x00\x00qt  " + b"\x00" * 64)
        done, manifest, _ = self.run_tool("--separate-blogs", "--no-tool", "soffice", "--no-tool", "ffprobe", "--no-tool", "ffmpeg", "--no-tool", "pdftohtml", "--no-tool", "tesseract")
        self.assertEqual(done.returncode, 0, done.stderr)
        self.assertFalse(any(manifest["tool"]["capabilities"][t] for t in ("soffice", "ffprobe", "ffmpeg", "pdftohtml", "tesseract")))
        codes = [i["code"] for b in manifest["blogs"] for i in b["issues"]] + [i["code"] for i in manifest["issues"]]
        self.assertIn("LEGACY_FORMAT_NEEDS_CONVERSION", codes)

    def test_an_interrupted_ingest_leaves_no_manifest_and_no_extracted_media(self):
        self.write("post.md", "# FIXTURE Interrupted\n\n![p](pic.png)\n")
        self.write("pic.png", png())
        out = os.path.join(self.tmp, "interrupted")
        code = ("import sys; sys.path.insert(0, %r)\n"
                "from blogkit import ingest\n"
                "def boom(*a, **k): raise KeyboardInterrupt()\n"
                "ingest.json.dump = boom\n"
                "ingest.run([%r, '--out', %r])\n") % (TOOLS, self.src, out)
        done = subprocess.run([sys.executable, "-c", code], capture_output=True, text=True)
        self.assertNotEqual(done.returncode, 0)
        self.assertFalse(os.path.exists(os.path.join(out, "manifest.json")))
        self.assertFalse(os.path.exists(os.path.join(out, "assets")))
        self.assertFalse(os.path.exists(os.path.join(out, "work")))
        # …and the same output folder can then be used for a clean run.
        again = subprocess.run([sys.executable, TOOL, self.src, "--out", out], capture_output=True, text=True)
        self.assertEqual(again.returncode, 0, again.stderr)
        self.assertEqual(os.listdir(out), ["assets", "manifest.json"] if os.listdir(out)[0] == "assets" else sorted(os.listdir(out)))

    def test_output_holds_no_absolute_paths_or_environment(self):
        self.write("post.md", "# FIXTURE Privacy\n\nBody.\n")
        done, manifest, out = self.run_tool(env={"BLOG_TEST_SECRET": "s3cr3t-token-value"})
        text = json.dumps(manifest)
        self.assertNotIn(self.tmp, text)
        self.assertNotIn(os.path.expanduser("~") + os.sep, text)
        self.assertNotIn("s3cr3t-token-value", text + done.stdout + done.stderr)

    def test_usage_errors(self):
        self.write("post.md", "# x\n")
        inside = subprocess.run([sys.executable, TOOL, self.src, "--out", os.path.join(self.src, "out")], capture_output=True, text=True)
        self.assertEqual(inside.returncode, 2)
        self.assertIn("never written to", inside.stderr)
        nothing = subprocess.run([sys.executable, TOOL, os.path.join(self.tmp, "nope"), "--out", os.path.join(self.tmp, "o")], capture_output=True, text=True)
        self.assertEqual(nothing.returncode, 1)


if __name__ == "__main__":
    unittest.main()
