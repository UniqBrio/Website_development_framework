/**
 * MANIFEST FUZZING — a manifest is untrusted input to everything in src/blog/.
 *
 * A real manifest is mutated a few thousand times (seeded, reproducible with
 * BLOG_FUZZ_SEED). For every mutant: parsing either refuses it with a clear
 * error, or the result can be checked, mapped, rendered and validated without an
 * unexpected crash — and the rendered page never carries script, an event
 * handler or a dangerous link, whatever the manifest said.
 *
 * Passing this is evidence of robustness on these mutations, not a proof.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import ts from "typescript";
import { checkBlogIntegrity, mapBlogToPage, parseBlogManifest, renderArticle, toHtml, toJsx, validateBlog } from "../../src/blog/index.js";

const PYTHON = spawnSync("python3", ["--version"]).status === 0 ? "python3" : "python";
const SEED = Number(process.env["BLOG_FUZZ_SEED"] ?? 20261113);
const ROUNDS = Number(process.env["BLOG_FUZZ_ROUNDS"] ?? 1500);
let root = "";
let base: unknown;

/** mulberry32: small, seeded, reproducible. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HOSTILE: unknown[] = [
  "javascript:alert(1)", " JaVaScRiPt:alert(1)", "data:text/html,<script>alert(1)</script>", "//evil.example/x", "vbscript:x", "file:///etc/passwd",
  '"><script>alert(1)</script>', "<img src=x onerror=alert(1)>", "</article><script>x()</script>", "*/ process.exit(1) /*", "${process.exit(1)}", "`;process.exit(1);`",
  "../../../../etc/passwd", "/etc/passwd", "assets/../manifest.json", "\u0000", " ", "x".repeat(20000), "", null, true, -1, 1e308, NaN, [], {}, [[[]]],
  { t: "text", text: "<script>" }, { t: "fnref", id: "nope" }, { t: "text", text: "x", href: "javascript:x" },
];

function paths(value: unknown, prefix: Array<string | number> = [], out: Array<Array<string | number>> = []): Array<Array<string | number>> {
  out.push(prefix);
  if (Array.isArray(value)) value.forEach((v, i) => paths(v, [...prefix, i], out));
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) paths(v, [...prefix, k], out);
  return out;
}

function mutate(doc: unknown, random: () => number): unknown {
  const copy = structuredClone(doc) as Record<string, unknown>;
  const all = paths(copy).filter((p) => p.length > 0);
  const pick = <T,>(xs: T[]) => xs[Math.floor(random() * xs.length)]!;
  for (let k = 0, n = 1 + Math.floor(random() * 4); k < n; k += 1) {
    const path = pick(all);
    let parent: any = copy;
    for (const key of path.slice(0, -1)) parent = parent?.[key];
    if (parent === null || typeof parent !== "object") continue;
    const key = path[path.length - 1]!;
    const op = random();
    if (op < 0.25) delete parent[key];
    else if (op < 0.75) parent[key] = pick(HOSTILE);
    else if (op < 0.85 && Array.isArray(parent)) parent.push(structuredClone(pick(parent)));
    else if (op < 0.95 && typeof parent[key] === "string") parent[key] = `${parent[key]}${pick(HOSTILE.filter((h) => typeof h === "string") as string[])}`;
    else parent[key] = structuredClone(parent[pick(Object.keys(parent))]);
  }
  return copy;
}

/**
 * Structural check of emitted JSX, using the TypeScript parser rather than text matching: text that LOOKS
 * like markup inside a string literal is harmless (React escapes it); what matters is what the parser sees.
 * Returns the violations found.
 */
function jsxViolations(jsx: string): string[] {
  const source = ts.createSourceFile("page.tsx", `const page = (<>${jsx}</>);`, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
  const found: string[] = [];
  const diagnostics = (source as unknown as { parseDiagnostics: ts.Diagnostic[] }).parseDiagnostics ?? [];
  for (const d of diagnostics) found.push(`syntax: ${ts.flattenDiagnosticMessageText(d.messageText, " ")}`);
  const visit = (node: ts.Node): void => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(source);
      if (/^(script|object|embed|style)$/i.test(tag)) found.push(`element <${tag}>`);
      for (const attr of node.attributes.properties) {
        if (ts.isJsxSpreadAttribute(attr)) found.push("spread attribute");
        else if (/^on[A-Z]/.test(attr.name.getText(source))) found.push(`event handler ${attr.name.getText(source)}`);
        else if (attr.name.getText(source) === "dangerouslySetInnerHTML") found.push("dangerouslySetInnerHTML");
      }
    }
    if (ts.isJsxExpression(node) && node.expression) {
      const e = node.expression;
      const literal = ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e) || ts.isNumericLiteral(e);
      if (!literal) found.push(`expression ${e.getText(source).slice(0, 60)}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

/**
 * Structural check of emitted HTML. Every `<` in TEXT is escaped by the renderer, so each `<` in the output
 * opens a real tag, and attribute values are double-quoted with `"` escaped: tags and attributes can be read
 * exactly, and text that merely LOOKS like markup is (correctly) ignored.
 */
function htmlViolations(html: string): string[] {
  const found: string[] = [];
  if (/<(?![a-zA-Z/!])/.test(html)) found.push("unescaped <");
  for (const tag of html.matchAll(/<([a-zA-Z][\w-]*)((?:\s+[^\s=>"]+(?:="[^"]*")?)*)\s*>/g)) {
    const name = tag[1]!.toLowerCase();
    if (["script", "object", "embed", "style", "base", "meta", "link", "form"].includes(name)) found.push(`element <${name}>`);
    for (const attr of tag[2]!.matchAll(/\s+([^\s=>"]+)(?:="([^"]*)")?/g)) {
      const key = attr[1]!.toLowerCase();
      const value = (attr[2] ?? "").replace(/&quot;/g, '"').replace(/&amp;/g, "&").trim();
      if (key.startsWith("on")) found.push(`event handler ${key}`);
      if (["href", "src", "poster", "action", "formaction", "srcset"].includes(key) && !/^(https?:\/\/|mailto:|tel:|#|\/(?!\/)|assets\/)/i.test(value)) found.push(`${key}="${value.slice(0, 40)}"`);
    }
  }
  const tags = html.match(/<[a-zA-Z][^>]*>/g) ?? [];
  const parsed = [...html.matchAll(/<([a-zA-Z][\w-]*)((?:\s+[^\s=>"]+(?:="[^"]*")?)*)\s*>/g)].length;
  if (tags.length !== parsed) found.push("a tag that does not parse as name + quoted attributes");
  return found;
}

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "blog-fuzz-"));
  execFileSync(PYTHON, ["tests/fixtures/blog/build_fixtures.py", join(root, "fx")], { stdio: "pipe" });
  execFileSync(PYTHON, ["website_workflow/tools/blog_ingest.py", join(root, "fx", "package"), "--out", join(root, "run")], { stdio: "pipe" });
  base = JSON.parse(readFileSync(join(root, "run", "manifest.json"), "utf8"));
});
afterAll(() => {
  if (root) rmSync(root, { recursive: true, force: true });
});

describe("manifest fuzzing", () => {
  it("the structural JSX check itself catches what it must (so a pass means something)", () => {
    expect(jsxViolations('<p>{`<script>alert(1)</script>`}</p>')).toEqual([]);
    expect(jsxViolations("<script>alert(1)</script>")).toEqual(["element <script>"]);
    expect(jsxViolations('<a onClick={"x"}>a</a>')).toEqual(["event handler onClick"]);
    expect(jsxViolations("<p>{`${process.exit(1)}`}</p>")).toEqual(["expression `${process.exit(1)}`"]);
    expect(jsxViolations("<p>{process.exit(1)}</p>")).toEqual(["expression process.exit(1)"]);
    expect(jsxViolations("<p>{`a`}</p>}</p><p>")[0]).toMatch(/^syntax:/);
    expect(htmlViolations('<p data-x="&lt;img src=x onerror=alert(1)&gt;">&lt;script&gt;</p>')).toEqual([]);
    expect(htmlViolations("<p>x</p><script>alert(1)</script>")).toEqual(["element <script>"]);
    expect(htmlViolations('<img src="x.png" onerror="alert(1)">')).toEqual(["src=\"x.png\"", "event handler onerror"]);
    expect(htmlViolations('<a href="javascript:alert(1)">x</a>')).toEqual(['href="javascript:alert(1)"']);
    expect(htmlViolations('<a href="//evil.example">x</a>')).toEqual(['href="//evil.example"']);
    expect(htmlViolations("<a href=javascript:x>x</a>")).toContain("a tag that does not parse as name + quoted attributes");
  });

  it(`survives ${ROUNDS} seeded mutations (seed ${SEED}) without unsafe output or unexpected crashes`, () => {
    const random = rng(SEED);
    const tally = { refused: 0, accepted: 0, integrityFlagged: 0 };
    for (let round = 0; round < ROUNDS; round += 1) {
      const mutant = mutate(base, random);
      const where = `round ${round} (seed ${SEED})`;
      let manifest;
      try {
        manifest = parseBlogManifest(mutant);
      } catch (error) {
        expect((error as Error).message, where).toMatch(/^not a valid framework:blog-manifest@1 manifest — /);
        tally.refused += 1;
        continue;
      }
      tally.accepted += 1;
      for (const blog of manifest.blogs) {
        const problems = checkBlogIntegrity(blog);
        if (problems.length > 0) tally.integrityFlagged += 1;
        let html = "";
        let jsx = "";
        try {
          const page = mapBlogToPage(blog);
          const tree = renderArticle(page, { mode: "publish" });
          html = toHtml(tree);
          jsx = toJsx(tree);
          validateBlog({ blog, page, articleHtml: html, integrityProblems: problems });
        } catch (error) {
          // A schema-valid manifest whose references do not resolve may be refused, but only with an ordinary error.
          expect(error, where).toBeInstanceOf(Error);
          expect(problems.length, `${where}: crashed on a manifest the integrity check passed: ${(error as Error).message}`).toBeGreaterThan(0);
          continue;
        }
        expect(htmlViolations(html), where).toEqual([]);
        expect(html, where).not.toMatch(/(href|src)="\/\//);
        expect(jsxViolations(jsx), where).toEqual([]);
        expect(jsx, where).not.toMatch(/(href|src|poster)=\{"\s*(javascript|vbscript|data|file):/i);
      }
    }
    // The fuzzer must actually exercise both paths, or it proves nothing.
    expect(tally.refused).toBeGreaterThan(ROUNDS / 10);
    expect(tally.accepted).toBeGreaterThan(ROUNDS / 10);
  }, 300000);
});
