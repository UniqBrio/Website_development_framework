"""Resource limits and fuzzing for the blog ingest tool.

    python -m unittest discover -s tests/python -v

These tests show that the LIMITS hold and that the parsers survive a few thousand
random and mutated inputs without crashing the ingest or running away. They are
not a security proof: see docs/blog/07-security-and-limitations.md.
"""
import io
import json
import os
import random
import stat
import subprocess
import sys
import tempfile
import time
import unittest
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TOOLS = os.path.join(ROOT, "website_workflow", "tools")
sys.path.insert(0, TOOLS)

from blogkit import htmldoc, model, rtf, safety, structured, textdoc  # noqa: E402

TOOL = os.path.join(TOOLS, "blog_ingest.py")
SEED = int(os.environ.get("BLOGKIT_FUZZ_SEED", "20261113"))
ROUNDS = int(os.environ.get("BLOGKIT_FUZZ_ROUNDS", "400"))


class Tmp(unittest.TestCase):
    def setUp(self):
        self._t = tempfile.TemporaryDirectory()
        self.tmp = self._t.name
        self.src = os.path.join(self.tmp, "src")
        os.makedirs(self.src)

    def tearDown(self):
        self._t.cleanup()

    def write(self, rel, data, base=None):
        path = os.path.join(base or self.src, rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as fh:
            fh.write(data if isinstance(data, bytes) else data.encode())
        return path

    def ingest(self, *args, inputs=None, env=None, timeout=120):
        out = os.path.join(self.tmp, "out-%d" % len(os.listdir(self.tmp)))
        done = subprocess.run([sys.executable, TOOL, *(inputs or [self.src]), "--out", out, *args], capture_output=True, text=True,
                              env=dict(os.environ, **(env or {})), timeout=timeout)
        manifest = None
        if os.path.exists(os.path.join(out, "manifest.json")):
            with open(os.path.join(out, "manifest.json")) as fh:
                manifest = json.load(fh)
        return done, manifest, out

    @staticmethod
    def codes(manifest):
        return [i["code"] for i in manifest["issues"]] + [i["code"] for b in manifest["blogs"] for i in b["issues"]]

    def fake_tool(self, name, body):
        """A stand-in for an external tool, first on PATH."""
        bindir = os.path.join(self.tmp, "fakebin")
        os.makedirs(bindir, exist_ok=True)
        path = os.path.join(bindir, name)
        with open(path, "w") as fh:
            fh.write("#!/bin/sh\n" + body + "\n")
        os.chmod(path, os.stat(path).st_mode | stat.S_IEXEC)
        return {"PATH": bindir + os.pathsep + os.environ["PATH"]}


# ===================================================================== package limits

class PackageLimits(Tmp):
    def test_file_count_limit(self):
        self.write("post.md", "# FIXTURE Count\n\nBody.\n")
        for i in range(30):
            self.write("img/%02d.txt" % i, "x")
        done, manifest, _ = self.ingest("--max-files", "10")
        self.assertIn("PACKAGE_TOO_MANY_FILES", self.codes(manifest))
        self.assertLessEqual(len(manifest["inputs"]), 10)
        self.assertEqual(manifest["tool"]["limits"]["MAX_FILES"], 10)

    def test_depth_limit_on_folders_and_archives(self):
        self.write("post.md", "# FIXTURE Depth\n\nBody.\n")
        self.write("/".join("d%d" % i for i in range(20)) + "/deep.png", b"\x89PNG\r\n\x1a\n")
        done, manifest, _ = self.ingest("--max-depth", "5")
        self.assertIn("PATH_TOO_DEEP", self.codes(manifest))
        self.assertFalse(any("deep.png" in i["path"] for i in manifest["inputs"]))
        archive = os.path.join(self.tmp, "deep.zip")
        with zipfile.ZipFile(archive, "w") as zf:
            zf.writestr("post.md", "# FIXTURE Deep zip\n\nBody.\n")
            zf.writestr("/".join("d%d" % i for i in range(30)) + "/x.txt", "x")
        done, manifest, out = self.ingest("--max-depth", "5", inputs=[archive])
        self.assertIn("ARCHIVE_ENTRIES_SKIPPED", self.codes(manifest))
        self.assertEqual(manifest["blogs"][0]["title"]["text"], "FIXTURE Deep zip")

    def test_archive_size_and_entry_limits_from_the_command_line(self):
        archive = os.path.join(self.tmp, "big.zip")
        with zipfile.ZipFile(archive, "w", zipfile.ZIP_STORED) as zf:
            zf.writestr("post.md", "# FIXTURE Big\n\nBody.\n")
            zf.writestr("blob.bin", os.urandom(3 * 2**20))
        done, manifest, _ = self.ingest("--max-archive-mb", "1", inputs=[archive])
        self.assertEqual(done.returncode, 1)
        self.assertIn("expands to more than 1 MB", manifest["issues"][0]["message"])

    def test_document_size_limit(self):
        self.write("post.md", "# FIXTURE Huge\n\n" + "word " * 400000)
        done, manifest, _ = self.ingest("--max-document-mb", "1")
        self.assertIn("DOCUMENT_TOO_LARGE", self.codes(manifest))

    def test_symbolic_links_in_a_folder_are_not_followed(self):
        outside = self.write("secret.txt", "PRIVATE-MATERIAL", base=self.tmp)
        self.write("post.md", "# FIXTURE Links\n\n![x](linked.png)\n\n[doc](secret.txt)\n")
        os.symlink(outside, os.path.join(self.src, "secret.txt"))
        os.symlink(outside, os.path.join(self.src, "linked.png"))
        os.symlink(self.tmp, os.path.join(self.src, "loop"))
        done, manifest, out = self.ingest()
        self.assertEqual(done.returncode, 0, done.stderr)
        self.assertEqual(manifest["blogs"][0]["assets"], [])
        for base, _, names in os.walk(out):
            for name in names:
                with open(os.path.join(base, name), "rb") as fh:
                    self.assertNotIn(b"PRIVATE-MATERIAL", fh.read())

    def test_malformed_archives_fail_alone(self):
        good = self.write("post.md", "# FIXTURE Good\n\nBody.\n")
        samples = {
            "truncated.zip": None,
            "garbage.zip": b"PK\x03\x04" + os.urandom(200),
            "empty.zip": b"PK\x05\x06" + b"\x00" * 18,
            "encrypted.zip": None,
        }
        with zipfile.ZipFile(os.path.join(self.tmp, "full.zip"), "w") as zf:
            zf.writestr("post.md", "# x\n" * 1000)
        with open(os.path.join(self.tmp, "full.zip"), "rb") as fh:
            samples["truncated.zip"] = fh.read()[:300]
        # zipfile clears the encryption bit when it writes, so set it in the raw headers (local + central).
        with zipfile.ZipFile(os.path.join(self.tmp, "enc.zip"), "w") as zf:
            zf.writestr("post.md", "x")
        with open(os.path.join(self.tmp, "enc.zip"), "rb") as fh:
            raw = bytearray(fh.read())
        raw[6] |= 0x1
        central = raw.find(b"PK\x01\x02")
        raw[central + 8] |= 0x1
        samples["encrypted.zip"] = bytes(raw)
        self.assertTrue(zipfile.ZipFile(io.BytesIO(samples["encrypted.zip"])).infolist()[0].flag_bits & 0x1)
        for name, data in samples.items():
            path = self.write(name, data, base=self.tmp)
            done, manifest, _ = self.ingest(inputs=[path, good])
            self.assertEqual(done.returncode, 0, "%s: %s" % (name, done.stderr[-300:]))
            self.assertEqual(manifest["blogs"][0]["title"]["text"], "FIXTURE Good", name)
            self.assertTrue({"ARCHIVE_CORRUPT", "ARCHIVE_REJECTED", "MEDIA_CORRUPT"} & set(self.codes(manifest)) or name == "empty.zip", name)


# ===================================================================== process limits

@unittest.skipUnless(os.name == "posix", "process groups and rlimits are POSIX")
class ProcessLimits(Tmp):
    def test_a_hung_tool_is_killed_with_its_children_and_reported(self):
        marker = os.path.join(self.tmp, "child-still-alive")
        env = self.fake_tool("pdftohtml", 'sh -c "sleep 4; touch %s" & sleep 60' % marker)
        env.update(self.fake_tool("pdfinfo", "echo 'Pages: 1'"))
        self.write("doc.pdf", b"%PDF-1.4\n%fixture\n")
        start = time.time()
        done, manifest, _ = self.ingest("--tool-timeout", "2", env=env)
        self.assertLess(time.time() - start, 20)
        self.assertIn("TOOL_TIMEOUT", self.codes(manifest))
        time.sleep(5)
        self.assertFalse(os.path.exists(marker), "the tool's child process outlived the timeout")

    def test_run_tool_applies_cpu_and_memory_limits(self):
        safety.configure({"TOOL_MEMORY_MB": 64, "TOOL_TIMEOUT": 20})
        try:
            grab = safety.run_tool([sys.executable, "-c", "b = bytearray(512 * 2**20); print('allocated')"])
            self.assertNotEqual(grab.returncode, 0)
            self.assertNotIn(b"allocated", grab.stdout)
            spin = safety.run_tool([sys.executable, "-c", "while True: pass"], timeout=2)
            self.assertTrue(spin.timed_out)
            missing = safety.run_tool(["no-such-tool-xyz"])
            self.assertEqual(missing.returncode, 127)
        finally:
            safety.configure()

    def test_whole_ingest_timeout_stops_cleanly_and_kills_the_tool(self):
        marker = os.path.join(self.tmp, "tool-survived")
        env = self.fake_tool("pdftohtml", "sleep 30; touch %s" % marker)
        env.update(self.fake_tool("pdfinfo", "echo 'Pages: 1'"))
        self.write("doc.pdf", b"%PDF-1.4\n%fixture\n")
        start = time.time()
        done, manifest, out = self.ingest("--timeout", "2", "--tool-timeout", "60", env=env)
        self.assertLess(time.time() - start, 20)
        self.assertEqual(done.returncode, 3)
        self.assertIn("longer than the 2-second limit", done.stderr)
        self.assertIsNone(manifest)
        self.assertFalse(os.path.exists(os.path.join(out, "assets")))
        self.assertFalse(os.path.exists(os.path.join(out, "work")))
        time.sleep(2)
        self.assertFalse(os.path.exists(marker))

    def test_ingest_memory_limit(self):
        self.write("post.md", "# FIXTURE Memory\n\n" + ("- item\n" * 200000))
        done, manifest, out = self.ingest("--memory-mb", "80", timeout=180)
        self.assertIn(done.returncode, (0, 3), done.stderr[-400:])
        if done.returncode == 3:
            self.assertIsNone(manifest)
            self.assertIn("more memory", done.stderr)


# ===================================================================== fuzzing

ALPHABET = "#*_`[]()!<>|-+>~\\:=\n \t{}/\"'&;0123456789abcXYZé₹​"
FRAGMENTS = ["# ", "## ", "* ", "1. ", "> ", "```", "~~~", "| a | b |\n|---|---|\n", "![a](b.png)", "[t](https://x.y)", "[^1]", "[^1]: n\n",
             "<div>", "</div>", "<img src=x>", "---\n", "**", "__", "\n\n", "    code\n", "<!--", "-->", "[IMAGE: c.png]", "\\", "&amp;", "<script>", "javascript:"]


def random_markdown(rng):
    parts = []
    for _ in range(rng.randint(1, 60)):
        if rng.random() < 0.5:
            parts.append(rng.choice(FRAGMENTS))
        else:
            parts.append("".join(rng.choice(ALPHABET) for _ in range(rng.randint(1, 40))))
    return "".join(parts)


def mutate(rng, data):
    data = bytearray(data)
    for _ in range(rng.randint(1, 8)):
        op = rng.random()
        if not data or op < 0.3:
            data[rng.randint(0, len(data)):rng.randint(0, len(data))] = bytes(rng.randint(0, 255) for _ in range(rng.randint(1, 16)))
        elif op < 0.6:
            del data[rng.randint(0, len(data) - 1):rng.randint(0, len(data))]
        else:
            data[rng.randint(0, len(data) - 1)] = rng.randint(0, 255)
    return bytes(data)


class Fuzz(unittest.TestCase):
    """Every parser either returns blocks or raises an ordinary exception that the extractor wrapper
    turns into DOCUMENT_CORRUPT. None may hang. Reproduce a failure with BLOGKIT_FUZZ_SEED."""

    def run_fuzz(self, label, generate, parse, per_case=2.0):
        rng = random.Random(SEED)
        for i in range(ROUNDS):
            sample = generate(rng)
            start = time.time()
            try:
                blocks = parse(sample)
                self.assertIsInstance(blocks, list)
                json.dumps(blocks)                      # the manifest must be serialisable
            except (RecursionError, ValueError, KeyError, IndexError, UnicodeError, safety.UnsafeInput, AttributeError, TypeError):
                pass                                    # contained by extract_document → DOCUMENT_CORRUPT
            elapsed = time.time() - start
            self.assertLess(elapsed, per_case, "%s case %d (seed %d) took %.1fs: %r" % (label, i, SEED, elapsed, sample[:200]))

    def test_markdown(self):
        self.run_fuzz("markdown", random_markdown, lambda s: textdoc.markdown_blocks(s, model.DocResult("f")))

    def test_plain_text(self):
        def parse(s):
            blocks = textdoc.Blocks(model.DocResult("f"), plain=True)
            return blocks.parse(s.split("\n"))
        self.run_fuzz("text", random_markdown, parse)

    def test_html(self):
        seed = b'<html><body><article><h1>T</h1><p>a <b>b</b> <a href="https://x">c</a></p><ul><li>x<ul><li>y</li></ul></li></ul><table><tr><th>h</th></tr><tr><td>d</td></tr></table><figure><img src="a.png" alt="x"><figcaption>c</figcaption></figure><video src="v.mp4"></video></article></body></html>'
        self.run_fuzz("html", lambda rng: mutate(rng, seed).decode("utf-8", "replace"), lambda s: htmldoc.fragment_blocks(s, model.DocResult("f")))

    def test_rtf(self):
        seed = rb"{\rtf1\ansi{\fonttbl{\f0 Arial;}}{\stylesheet{\s1 heading 1;}}\pard\s1 Title\par\pard Text \b bold\b0 {\field{\*\fldinst HYPERLINK " + b'"https://x"' + rb"}{\fldrslt link}}\par\trowd\intbl a\cell b\cell\row\pard" + b"\\u8377?5\\par}"
        self.run_fuzz("rtf", lambda rng: mutate(rng, seed), lambda s: rtf.Rtf(s, model.DocResult("f")).parse())

    def test_structured_json(self):
        seed = json.dumps({"title": "T", "sections": [{"heading": "H", "content": "**b** [l](https://x)", "image": "a.png"}, {"table": [{"a": 1}, {"a": 2}]}], "cta": {"text": "Go", "url": "https://x"}})

        def parse(s):
            data = json.loads(s)
            if isinstance(data, dict):
                return structured.article_blocks(data, model.DocResult("f"), "fuzz") or []
            return []
        self.run_fuzz("json", lambda rng: mutate(rng, seed.encode()).decode("utf-8", "replace"), parse)

    def test_command_line_never_crashes_on_mutated_documents(self):
        """End to end: a mutated document produces a manifest (possibly with DOCUMENT_CORRUPT), never a traceback."""
        rng = random.Random(SEED)
        with tempfile.TemporaryDirectory() as tmp:
            seeds = {"post.md": "# FIXTURE\n\n" + random_markdown(rng), "post.html": "<h1>FIXTURE</h1><p>x</p>",
                     "post.rtf": r"{\rtf1\ansi\pard FIXTURE\par}", "post.json": '{"title": "FIXTURE", "content": "x"}'}
            for i in range(int(os.environ.get("BLOGKIT_FUZZ_CLI_ROUNDS", "24"))):
                name = rng.choice(sorted(seeds))
                src = os.path.join(tmp, "src-%d" % i)
                os.makedirs(src)
                with open(os.path.join(src, name), "wb") as fh:
                    fh.write(mutate(rng, seeds[name].encode()))
                out = os.path.join(tmp, "out-%d" % i)
                done = subprocess.run([sys.executable, TOOL, src, "--out", out, "--timeout", "60"], capture_output=True, text=True, timeout=90)
                self.assertNotIn("Traceback", done.stderr, "%s round %d (seed %d)" % (name, i, SEED))
                self.assertIn(done.returncode, (0, 1), done.stderr[-300:])


if __name__ == "__main__":
    unittest.main()
