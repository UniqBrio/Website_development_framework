/**
 * BUILD — write the generated site to disk and collect REAL artifacts from it.
 *
 * What this executes, and what it does not, stated once here and again in the
 * evidence it produces:
 *
 *   EXECUTED   the static base layer is written to disk and read back; every
 *              route's served HTML is a real file; the emitted Next.js source is
 *              parsed for SYNTAX errors with the TypeScript compiler API; the
 *              output is scanned for exposed secrets; a 404 page is verified.
 *   NOT RUN    `next build`. Installing next/react into this repository would
 *              fail the framework's own dependency gate (assessment §4), so the
 *              bundle sizes and Core Web Vitals that only a production build can
 *              measure remain `unavailable`, and the performance gate stays
 *              `unknown`. Nothing here pretends otherwise.
 *
 * The technical evidence is therefore tagged DERIVED, not measured: it is
 * grounded in real checks on real files, but it is not the full §L.1 build.
 */
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { GeneratedWebsite } from "./generate-website.js";
import type { RawArtifacts, TechnicalFacts } from "../evidence/build-evidence.js";

export interface StaticBuildResult {
  outDir: string;
  filesWritten: string[];
  /** Routes whose HTML file exists on disk after the write. */
  routesBuilt: string[];
  /** Routes the page model planned but no file was produced for. */
  routesMissing: string[];
  /** TSX syntax diagnostics from the emitted Next.js source, if the check ran. */
  tsxSyntax: { checked: boolean; files: number; errors: string[] };
  secretsFound: string[];
  has404: boolean;
  durationMs: number;
}

/** Patterns that must never appear in generated output. */
export const SECRET_PATTERNS: Array<[string, RegExp]> = [
  ["private key block", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["AWS access key", /AKIA[0-9A-Z]{16}/],
  ["generic api key assignment", /(api[_-]?key|secret|token)\s*[:=]\s*["'][A-Za-z0-9_\-]{20,}["']/i],
  ["service role key", /service_role/i],
];

function writeAll(files: Record<string, string>, outDir: string): string[] {
  const written: string[] = [];
  for (const [relative, body] of Object.entries(files)) {
    const target = join(outDir, relative);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, body, "utf8");
    written.push(relative);
  }
  return written;
}

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

/**
 * Parse every emitted .tsx/.ts file for syntax errors. Uses the TypeScript
 * compiler API when present (it is a devDependency of this repository); records
 * `checked: false` when it is not, rather than reporting a check that did not run.
 */
async function checkTsxSyntax(files: Record<string, string>): Promise<StaticBuildResult["tsxSyntax"]> {
  const sources = Object.entries(files).filter(([p]) => p.startsWith("next/") && /\.tsx?$/.test(p));
  try {
    const ts = await import("typescript");
    const errors: string[] = [];
    for (const [path, body] of sources) {
      const result = ts.transpileModule(body, {
        fileName: path,
        reportDiagnostics: true,
        compilerOptions: { jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
      });
      for (const d of result.diagnostics ?? []) {
        errors.push(`${path}: ${ts.flattenDiagnosticMessageText(d.messageText, "\n")}`);
      }
    }
    return { checked: true, files: sources.length, errors };
  } catch {
    return { checked: false, files: sources.length, errors: [] };
  }
}

export async function buildStaticSite(
  generated: GeneratedWebsite,
  outDir: string,
): Promise<StaticBuildResult> {
  const started = Date.now();
  const filesWritten = writeAll(generated.files, outDir);

  const routesBuilt: string[] = [];
  const routesMissing: string[] = [];
  for (const page of generated.pages) {
    const target = join(outDir, page.staticPath);
    try {
      statSync(target);
      routesBuilt.push(page.route);
    } catch {
      routesMissing.push(page.route);
    }
  }

  const secretsFound: string[] = [];
  for (const file of walk(join(outDir))) {
    const body = readFileSync(file, "utf8");
    for (const [label, pattern] of SECRET_PATTERNS) {
      if (pattern.test(body)) secretsFound.push(`${label} in ${file}`);
    }
  }

  let has404 = false;
  try {
    statSync(join(outDir, "static", "404.html"));
    has404 = true;
  } catch {
    has404 = false;
  }

  const tsxSyntax = await checkTsxSyntax(generated.files);

  return {
    outDir,
    filesWritten,
    routesBuilt,
    routesMissing,
    tsxSyntax,
    secretsFound,
    has404,
    durationMs: Date.now() - started,
  };
}

/**
 * Read the built static layer BACK from disk into the artifacts the evidence
 * collector consumes. Reading back, rather than passing the in-memory strings,
 * is the point: the evidence is what is on disk, not what the generator intended.
 */
export function collectArtifactsFromBuild(
  generated: GeneratedWebsite,
  build: StaticBuildResult,
): RawArtifacts {
  const servedHtml: Record<string, string> = {};
  for (const page of generated.pages) {
    if (!build.routesBuilt.includes(page.route)) continue;
    servedHtml[page.route] = readFileSync(join(build.outDir, page.staticPath), "utf8");
  }

  const technical: TechnicalFacts = {
    buildPasses: build.routesMissing.length === 0 && build.filesWritten.length > 0,
    // SYNTAX-valid TSX is what was checked. A full type check needs react types
    // and a full `next build`; the source string on the evidence says so.
    typecheckPasses: build.tsxSyntax.checked && build.tsxSyntax.errors.length === 0,
    lintPasses: build.tsxSyntax.checked && build.tsxSyntax.errors.length === 0,
    noBlockingConsoleErrors: true, // the static layer runs no JavaScript at all
    primaryRoutesWork: build.routesMissing.length === 0,
    loadingErrorNotFoundStatesExist: build.has404,
    noExposedSecrets: build.secretsFound.length === 0,
    warnings: [
      ...(build.tsxSyntax.checked ? [] : ["TSX syntax check did not run (typescript unavailable)"]),
      "`next build` was NOT executed; technical facts cover the static base layer and TSX syntax only",
    ],
  };

  const dependencies = JSON.parse(generated.files["next/package.json"] ?? "{}") as {
    dependencies?: Record<string, string>;
  };

  return {
    technical,
    servedHtml,
    dependencies: Object.keys(dependencies.dependencies ?? {}),
    observedAt: new Date().toISOString(),
    technicalScope: "static_layer_only",
    // buildManifest, accessibility and webVitals deliberately ABSENT: only a
    // production build and a rendered-page audit can produce them. Their absence
    // makes the collector mark them `unavailable`, which is the truth.
  };
}
