#!/usr/bin/env python3
"""
generate_image.py — RUNG 3 of website_workflow/asset_production.md.

Sends a finished image_prompts.md prompt to the configured AI image provider
and writes the candidate image(s) plus a provenance record. It exists so a
planned raster visual is PRODUCED in the run instead of ending as a prompt
handed to the owner.

Configuration is read from the environment — never from a file in the repo:
  IMAGE_PROVIDER   openai | gemini | none        (default: none)
  IMAGE_API_KEY    the key (or OPENAI_API_KEY / GEMINI_API_KEY)
  IMAGE_MODEL      optional model override
  IMAGE_API_BASE   optional base URL override (a compatible gateway, or a test)
Where a network proxy injects the credential for the provider's host, set
IMAGE_API_KEY to any placeholder: the proxy replaces the header.

Usage:
  python website_workflow/tools/generate_image.py \
      --prompt-file prompt.txt --out public/img/hero-atmosphere.png \
      --slot hero-atmosphere [--size 1536x1024] [--candidates 3]
  python website_workflow/tools/generate_image.py --self-test

Exit codes — each is a designed outcome (degraded_paths.md):
  0  image(s) written, provenance written
  2  bad invocation
  3  NO PROVIDER CONFIGURED — the prompt is printed; the slot falls down the
     production ladder for this release. Not an error to hide or retry.
  4  the provider refused or failed — status and message printed, nothing
     written. Never substitutes a placeholder for the image.

A written image is a CANDIDATE: asset_production.md's SELF-CURATION still
applies before it ships. Never use this tool for product UI, logos,
text-in-image, or people presented as customers.

Request shapes: `openai` follows the Images API (POST /v1/images/generations,
base64 in data[].b64_json). `gemini` uses the Imagen predict shape
(instances/parameters in, predictions[].bytesBase64Encoded out) with an
x-goog-api-key header; that shape is documented for Vertex AI and was NOT
verified against the API-key endpoint when this tool was written — confirm
with one real call before relying on it.
"""
import argparse, base64, datetime, hashlib, io, json, os, sys, threading
import urllib.error, urllib.request

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

DEFAULTS = {
    "openai": {"base": "https://api.openai.com", "model": "gpt-image-1"},
    "gemini": {"base": "https://generativelanguage.googleapis.com",
               "model": "imagen-4.0-generate-001"},
}
ASPECTS = {"1024x1024": "1:1", "1536x1024": "3:2", "1024x1536": "2:3",
           "1792x1024": "16:9", "1024x1792": "9:16"}


def config():
    provider = os.environ.get("IMAGE_PROVIDER", "none").strip().lower() or "none"
    key = (os.environ.get("IMAGE_API_KEY")
           or os.environ.get({"openai": "OPENAI_API_KEY",
                              "gemini": "GEMINI_API_KEY"}.get(provider, ""), ""))
    d = DEFAULTS.get(provider, {})
    return {"provider": provider, "key": (key or "").strip(),
            "model": os.environ.get("IMAGE_MODEL", d.get("model", "")),
            "base": os.environ.get("IMAGE_API_BASE", d.get("base", "")).rstrip("/")}


def post(url, headers, body, timeout=180):
    req = urllib.request.Request(url, data=json.dumps(body).encode("utf-8"),
                                 headers={"Content-Type": "application/json", **headers},
                                 method="POST")
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8"))


def call_openai(cfg, prompt, size, n):
    data = post(cfg["base"] + "/v1/images/generations",
                {"Authorization": "Bearer " + cfg["key"]},
                {"model": cfg["model"], "prompt": prompt, "n": n, "size": size})
    return [base64.b64decode(d["b64_json"]) for d in data.get("data", []) if d.get("b64_json")]


def call_gemini(cfg, prompt, size, n):
    data = post(f'{cfg["base"]}/v1beta/models/{cfg["model"]}:predict',
                {"x-goog-api-key": cfg["key"]},
                {"instances": [{"prompt": prompt}],
                 "parameters": {"sampleCount": n, "aspectRatio": ASPECTS.get(size, "1:1")}})
    return [base64.b64decode(p["bytesBase64Encoded"]) for p in data.get("predictions", [])
            if p.get("bytesBase64Encoded")]


CALLERS = {"openai": call_openai, "gemini": call_gemini}


def generate(prompt, out, slot, size="1536x1024", candidates=1):
    """Returns (exit_code, written_paths)."""
    cfg = config()
    if cfg["provider"] in ("", "none") or cfg["provider"] not in CALLERS or not cfg["key"]:
        why = ("IMAGE_PROVIDER is not set" if cfg["provider"] in ("", "none")
               else f'unknown IMAGE_PROVIDER "{cfg["provider"]}"' if cfg["provider"] not in CALLERS
               else "no API key in the environment")
        print(f"NO IMAGE PROVIDER CONFIGURED ({why}).")
        print("Slot:", slot)
        print("This slot falls down the production ladder for this release "
              "(asset_production.md RUNG 3). The finished prompt, for the review pack:\n")
        print(prompt)
        return 3, []
    try:
        images = CALLERS[cfg["provider"]](cfg, prompt, size, candidates)
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")[:600]
        print(f"PROVIDER ERROR: HTTP {e.code} from {cfg['provider']} — {detail}")
        return 4, []
    except (urllib.error.URLError, TimeoutError, ValueError, KeyError) as e:
        print(f"PROVIDER ERROR: {cfg['provider']} — {e!r}")
        return 4, []
    if not images:
        print(f"PROVIDER ERROR: {cfg['provider']} returned no image "
              "(a safety filter can return an empty result).")
        return 4, []

    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    stem, ext = os.path.splitext(out)
    ext = ext or ".png"
    written, records = [], []
    for i, blob in enumerate(images, 1):
        path = out if len(images) == 1 else f"{stem}-candidate{i}{ext}"
        with open(path, "wb") as f:
            f.write(blob)
        written.append(path)
        records.append({"file": os.path.basename(path), "bytes": len(blob),
                        "sha256": hashlib.sha256(blob).hexdigest()})
    prov = {"slot": slot, "rung": 3, "tool": "website_workflow/tools/generate_image.py",
            "provider": cfg["provider"], "model": cfg["model"], "size": size,
            "prompt": prompt, "candidates": records,
            "date": datetime.date.today().isoformat(),
            "licence": "AI-generated; usage rights per the provider's terms — owner to confirm",
            "status": "CANDIDATE — not shipped until self-curation passes (asset_production.md)",
            "alt_text": "TO DECIDE at curation"}
    with io.open(stem + ".provenance.json", "w", encoding="utf-8") as f:
        json.dump(prov, f, indent=2, ensure_ascii=False)
    print(f"{len(written)} candidate(s) written: " + ", ".join(written))
    print("provenance:", stem + ".provenance.json")
    return 0, written


def self_test():
    """Both degraded paths and both provider shapes, against a local stand-in
    server. This proves the tool's own logic — it is NOT a test of a real
    provider, and passing it does not show that a key works."""
    import http.server, tempfile
    png = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA"
                           "60e6kgAAAABJRU5ErkJggg==")
    b64 = base64.b64encode(png).decode()
    seen = []

    class H(http.server.BaseHTTPRequestHandler):
        def log_message(self, *a):
            pass

        def do_POST(self):
            body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
            seen.append((self.path, dict(self.headers), body))
            if "refuse" in body.get("prompt", ""):
                self.send_response(400); self.end_headers()
                self.wfile.write(b'{"error":{"message":"prompt rejected"}}'); return
            if self.path.endswith(":predict"):
                out = {"predictions": [{"bytesBase64Encoded": b64, "mimeType": "image/png"}]
                       * body["parameters"]["sampleCount"]}
            else:
                out = {"data": [{"b64_json": b64}] * body["n"]}
            self.send_response(200); self.send_header("Content-Type", "application/json")
            self.end_headers(); self.wfile.write(json.dumps(out).encode())

    srv = http.server.HTTPServer(("127.0.0.1", 0), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{srv.server_address[1]}"
    d = tempfile.mkdtemp(prefix="generate_image_")
    keep = {k: os.environ.get(k) for k in ("IMAGE_PROVIDER", "IMAGE_API_KEY", "IMAGE_API_BASE",
                                             "IMAGE_MODEL", "OPENAI_API_KEY", "GEMINI_API_KEY")}
    for k in ("http_proxy", "https_proxy", "HTTP_PROXY", "HTTPS_PROXY"):
        os.environ.pop(k, None)          # the stand-in server is local
    os.environ["NO_PROXY"] = "127.0.0.1"
    results = []

    def case(name, env, prompt, n, want_code, want_files):
        for k in keep:
            os.environ.pop(k, None)
        os.environ.update(env)
        out = os.path.join(d, name, "img.png")
        _stdout, sys.stdout = sys.stdout, io.StringIO()
        try:
            code, files = generate(prompt, out, name, candidates=n)
        finally:
            sys.stdout = _stdout
        prov_ok = os.path.exists(os.path.join(d, name, "img.provenance.json")) == (want_code == 0)
        ok = code == want_code and len(files) == want_files and prov_ok \
            and all(open(f, "rb").read() == png for f in files)
        results.append(ok)
        print(f"self-test: {name:<28} exit {code} files {len(files)} -> {'PASS' if ok else 'FAIL'}")

    case("no-provider", {}, "a calm studio", 1, 3, 0)
    case("provider-but-no-key", {"IMAGE_PROVIDER": "openai"}, "a calm studio", 1, 3, 0)
    case("unknown-provider", {"IMAGE_PROVIDER": "paintbot", "IMAGE_API_KEY": "k"}, "x", 1, 3, 0)
    case("openai-one", {"IMAGE_PROVIDER": "openai", "IMAGE_API_KEY": "k", "IMAGE_API_BASE": base},
         "a calm studio", 1, 0, 1)
    case("openai-three-candidates", {"IMAGE_PROVIDER": "openai", "OPENAI_API_KEY": "k",
                                     "IMAGE_API_BASE": base}, "a calm studio", 3, 0, 3)
    case("gemini-two-candidates", {"IMAGE_PROVIDER": "gemini", "GEMINI_API_KEY": "k",
                                   "IMAGE_API_BASE": base}, "a calm studio", 2, 0, 2)
    case("provider-refuses", {"IMAGE_PROVIDER": "openai", "IMAGE_API_KEY": "k",
                              "IMAGE_API_BASE": base}, "refuse this", 1, 4, 0)
    case("provider-unreachable", {"IMAGE_PROVIDER": "openai", "IMAGE_API_KEY": "k",
                                  "IMAGE_API_BASE": "http://127.0.0.1:9"}, "a calm studio", 1, 4, 0)
    lower = [{k.lower(): v for k, v in h.items()} for _p, h, _b in seen]
    auth = [h.get("authorization") or h.get("x-goog-api-key") for h in lower]
    results.append(all(a in ("Bearer k", "k") for a in auth))
    print(f"self-test: {'auth header sent on every call':<28} -> {'PASS' if results[-1] else 'FAIL'}")
    srv.shutdown()
    for k, v in keep.items():
        os.environ.pop(k, None)
        if v is not None:
            os.environ[k] = v
    ok = all(results)
    print("SELF-TEST", "PASS" if ok else "FAIL",
          "(tool logic only — no real provider was contacted)")
    return 0 if ok else 1


def main():
    if sys.argv[1:] == ["--self-test"]:
        sys.exit(self_test())
    ap = argparse.ArgumentParser(description="Rung-3 AI raster generation (asset_production.md).")
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--prompt")
    g.add_argument("--prompt-file")
    ap.add_argument("--out", required=True, help="output image path, e.g. public/img/x.png")
    ap.add_argument("--slot", required=True, help="the visual slot this fills (provenance)")
    ap.add_argument("--size", default="1536x1024")
    ap.add_argument("--candidates", type=int, default=1)
    try:
        a = ap.parse_args()
    except SystemExit:
        sys.exit(2)
    prompt = a.prompt if a.prompt else io.open(a.prompt_file, encoding="utf-8").read()
    if not prompt.strip() or not 1 <= a.candidates <= 4:
        print("empty prompt, or --candidates outside 1-4")
        sys.exit(2)
    code, _ = generate(prompt.strip(), a.out, a.slot, a.size, a.candidates)
    sys.exit(code)


if __name__ == "__main__":
    main()
