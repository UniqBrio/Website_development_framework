/**
 * HOST PROJECT — the boundary between the framework core and a runtime.
 *
 *   Framework (this library)                Host (a generated project)
 *   ------------------------                --------------------------
 *   decides, generates, maps evidence       installs its declared dependencies
 *   installs NO runtime or build tooling    runs the production build
 *   writes the host's files                 serves the production output
 *   parses raw evidence against a schema    audits the rendered pages
 *   evaluates every gate                    writes RAW facts, decides nothing
 *
 * `planHostProject` is pure: it turns a GeneratedWebsite into the host's files
 * and a manifest (the core → host contract). `writeHostProject` writes them. The
 * core never imports `next`, `react`, `playwright-core` or `axe-core`; those names
 * appear only as strings in the host's package.json.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { DesignDecisionOutput } from "../pipeline.js";
import type { GeneratedWebsite } from "../generation/generate-website.js";
import { HOST_TOOLCHAIN, toolchainDevDependencies } from "./toolchain.js";
import { NOT_FOUND_MARKER } from "../generation/emit/nextjs.js";
import { SECRET_PATTERNS } from "../generation/build.js";
import { RESPONSIVE_SWEEP, type SweepProfile } from "../responsive/sweep-profiles.js";
import { TOUCH_TARGET_CSS_PX } from "../responsive/capabilities.js";
import { experienceDomIds } from "../generation/render/experiences.js";
import { loadEvaluator } from "../generation/runtime/experience-runtime.js";

export const HOST_MANIFEST_PATH = "host/host-manifest.json";
export const RAW_EVIDENCE_PATH = "host/evidence/raw-host-evidence.json";

/** The core → host contract, written into the host as JSON. */
export interface HostManifest {
  schemaVersion: 1;
  hostName: string;
  businessName: string;
  plannedRoutes: string[];
  notFoundProbe: { route: string; marker: string };
  accessibility: { target: string; bodyText: number; largeText: number; targetSizeCssPx: number };
  budgets: { routeJsKb: number };
  declared: { runtime: Record<string, string>; toolchain: Record<string, { range: string; purpose: string }> };
  nonPackageLibraries: string[];
  formContracts: Array<{ page: string; kind: string; endpoint: string }>;
  secretPatterns: Array<{ label: string; source: string; flags: string }>;
  lab: { viewport: { width: number; height: number }; cpuThrottlingRate: number; network: { latencyMs: number; downloadKbps: number; uploadKbps: number } };
  responsiveSweep: readonly SweepProfile[];
  touchTargetCssPx: number;
  port: number;
  /**
   * What each DELIVERED experience must do in a real browser. Expectations come
   * from the core (the owner's verified examples and rules), never from the page,
   * so a page that computes the wrong number cannot also define the right one.
   */
  experiences: HostExperienceExpectation[];
  /** P1-4: the compact navigation the browser must operate, when DD-034's mode was delivered. */
  navigation: { compact: boolean; menuId: string; routes: string[] };
  /** The generator's static base layer, copied into the host and served by the collector. */
  staticSite: { dir: string; routes: string[] };
}

export type HostExperienceExpectation =
  | { type: "comparison"; route: string; specId: string }
  | {
      type: "calculator";
      route: string;
      specId: string;
      mode: string;
      inputs: Array<{ id: string; domId: string }>;
      example: { inputs: Record<string, number>; expected: number; decimals: number };
      /** EVERY owner example (Delivery G2). */
      examples: Array<{ name: string; inputs: Record<string, number>; expected: number; decimals: number }>;
      /** One input pushed past its stated bound: the page must show an error, never a result. */
      invalid: { inputId: string; domId: string; value: number } | null;
    }
  | {
      type: "decision_flow";
      route: string;
      specId: string;
      mode: string;
      /** Answers satisfying the FIRST rule, as option indexes (keyboard: Space on 0, ArrowDown n times otherwise). */
      questions: Array<{ id: string; domName: string; optionIds: string[]; answerIndex: number }>;
      expectedOutcomeId: string;
      expectedTitle: string;
      /** EVERY rule's path, resolved with the same first-match evaluator the page runs, plus the no-match path when reachable. */
      paths: Array<{ name: string; answers: Array<{ id: string; domName: string; optionIds: string[]; answerIndex: number }>; expectedOutcomeId: string; expectedTitle: string }>;
    };

/** Every combination of answers, bounded so a large flow cannot explode the host run. */
function answerCombinations(questions: ReadonlyArray<{ id: string; options: ReadonlyArray<{ id: string }> }>, limit = 4096): Array<Record<string, string>> {
  let combos: Array<Record<string, string>> = [{}];
  for (const q of questions) {
    const next: Array<Record<string, string>> = [];
    for (const combo of combos) {
      for (const option of q.options) {
        next.push({ ...combo, [q.id]: option.id });
        if (next.length >= limit) break;
      }
      if (next.length >= limit) break;
    }
    combos = next;
  }
  return combos;
}

export function experienceExpectations(generated: GeneratedWebsite): HostExperienceExpectation[] {
  const out: HostExperienceExpectation[] = [];
  for (const spec of generated.manifest.engagement.delivery) {
    if (spec.status !== "DELIVERABLE" || !spec.definition) continue;
    const ids = experienceDomIds(spec.specId);
    if (spec.definition.type === "comparison") {
      out.push({ type: "comparison", route: spec.route, specId: spec.specId });
    } else if (spec.definition.type === "calculator") {
      const c = spec.definition.calculator;
      const example = c.examples[0]!;
      out.push({
        type: "calculator",
        route: spec.route,
        specId: spec.specId,
        mode: spec.mode ?? "",
        inputs: c.inputs.map((i) => ({ id: i.id, domId: ids.input(i.id) })),
        example: { inputs: example.inputs, expected: example.expected, decimals: c.result.decimals },
        examples: c.examples.map((e, index) => ({ name: `example ${index + 1}`, inputs: e.inputs, expected: e.expected, decimals: c.result.decimals })),
        invalid: (() => {
          const bounded = c.inputs.find((i) => i.max !== undefined || i.min !== undefined);
          if (!bounded) return null;
          const value = bounded.max !== undefined ? bounded.max + (bounded.step ?? 1) : (bounded.min as number) - (bounded.step ?? 1);
          return { inputId: bounded.id, domId: ids.input(bounded.id), value };
        })(),
      });
    } else if (spec.definition.type === "decision_flow") {
      const f = spec.definition.flow;
      const rule = f.rules[0]!;
      const outcome = f.outcomes.find((o) => o.id === rule.outcome)!;
      // Resolve each path with the SAME first-match evaluator the page runs, so an
      // expectation cannot silently depend on rule order.
      const { matchRules } = loadEvaluator();
      const combos = answerCombinations(f.questions);
      const toAnswers = (combo: Record<string, string>) =>
        f.questions.map((q) => ({ id: q.id, domName: ids.questionName(q.id), optionIds: q.options.map((o) => o.id), answerIndex: q.options.findIndex((o) => o.id === combo[q.id]) }));
      const paths: Array<{ name: string; answers: ReturnType<typeof toAnswers>; expectedOutcomeId: string; expectedTitle: string }> = [];
      for (const r of f.rules) {
        const combo = combos.find((candidate) => matchRules(f.rules, candidate) === r);
        const o = f.outcomes.find((x) => x.id === r.outcome);
        if (combo && o) paths.push({ name: `rule ${r.id}`, answers: toAnswers(combo), expectedOutcomeId: o.id, expectedTitle: o.title });
      }
      const noMatch = combos.find((candidate) => matchRules(f.rules, candidate) === null);
      if (noMatch) paths.push({ name: "no match", answers: toAnswers(noMatch), expectedOutcomeId: "no-match", expectedTitle: f.noMatch.title });
      out.push({
        type: "decision_flow",
        route: spec.route,
        specId: spec.specId,
        mode: spec.mode ?? "",
        questions: f.questions.map((q) => {
          const condition = rule.when.find((c) => c.question === q.id);
          const chosen = condition ? condition.anyOf[0]! : q.options[0]!.id;
          return { id: q.id, domName: ids.questionName(q.id), optionIds: q.options.map((o) => o.id), answerIndex: q.options.findIndex((o) => o.id === chosen) };
        }),
        expectedOutcomeId: outcome.id,
        expectedTitle: outcome.title,
        paths,
      });
    }
  }
  return out;
}

/**
 * What the core expects the host to have measured, from the plan itself — so every
 * host driver asks for the same matrix (experiences, compact navigation, static layer)
 * and none can quietly skip one.
 */
export function hostExpectations(plan: HostProjectPlan): {
  plannedRoutes: string[];
  notFoundMarker: string;
  experienceSpecIds: string[];
  compactNavigation: boolean;
  staticRoutes: string[];
} {
  return {
    plannedRoutes: plan.manifest.plannedRoutes,
    notFoundMarker: plan.manifest.notFoundProbe.marker,
    experienceSpecIds: plan.manifest.experiences.map((e) => e.specId),
    compactNavigation: plan.manifest.navigation.compact,
    staticRoutes: plan.manifest.staticSite.routes,
  };
}

export interface HostProjectPlan {
  files: Record<string, string>;
  manifest: HostManifest;
}

export interface HostOptions {
  hostName: string;
  port?: number;
}

/**
 * The lab profile: Lighthouse's mobile defaults (4x CPU slowdown, ~1.6 Mbps down,
 * 150 ms RTT). Stated in the manifest so the evidence names its own conditions.
 */
const LAB_PROFILE: HostManifest["lab"] = {
  viewport: { width: 412, height: 823 },
  cpuThrottlingRate: 4,
  network: { latencyMs: 150, downloadKbps: 1638, uploadKbps: 675 },
};

function runtimeScript(name: string): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return readFileSync(join(here, "runtime", name), "utf8");
}

export function planHostProject(
  generated: GeneratedWebsite,
  output: DesignDecisionOutput,
  options: HostOptions,
): HostProjectPlan {
  // P1-6: the ADMITTED runtime set — the one authority for what a host installs.
  const runtime = { dependencies: output.dependencyAdmission.admitted, nonPackageLibraries: output.dependencyAdmission.nonPackageLibraries };
  const files: Record<string, string> = {};

  // ---- the generated Next.js source, verbatim, minus the generator's own
  // package.json (the host writes the full one below from the same authority).
  for (const [path, body] of Object.entries(generated.files)) {
    if (path.startsWith("static/")) {
      // The static base layer, served and audited by the collector (Delivery G4).
      files[`static-site/${path.slice("static/".length)}`] = body;
      continue;
    }
    if (!path.startsWith("next/") || path === "next/package.json") continue;
    const relative = path.slice("next/".length);
    files[relative === "README.md" ? "STACK.md" : relative] = body;
  }

  files["package.json"] = `${JSON.stringify(
    {
      name: options.hostName,
      private: true,
      scripts: {
        build: "next build",
        start: "next start",
        typecheck: "tsc --noEmit",
        lint: "eslint .",
        validate: "node host/validate.mjs",
      },
      // RUNTIME: exactly the admitted set (proposal × generated consumer × dependency gate).
      dependencies: runtime.dependencies,
      // TOOLCHAIN: exactly the host toolchain contract.
      devDependencies: toolchainDevDependencies(),
    },
    null,
    2,
  )}\n`;

  files["next.config.mjs"] = `/**
 * GENERATED host configuration.
 * Lint is its own MEASURED step (host/validate.mjs), so the build does not run it
 * a second time. Type errors still fail the build.
 */
const config = {
  reactStrictMode: true,
  poweredByHeader: false,
  eslint: { ignoreDuringBuilds: true },
};

export default config;
`;

  files["tsconfig.json"] = `${JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        lib: ["dom", "dom.iterable", "esnext"],
        allowJs: false,
        skipLibCheck: true,
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        module: "esnext",
        moduleResolution: "bundler",
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: "preserve",
        incremental: true,
        plugins: [{ name: "next" }],
      },
      include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
      exclude: ["node_modules", "host", "static-site"],
    },
    null,
    2,
  )}\n`;

  files["next-env.d.ts"] = `/// <reference types="next" />
/// <reference types="next/image-types/global" />
`;

  files["eslint.config.mjs"] = `import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const eslintConfig = [
  { ignores: ["node_modules/**", ".next/**", "host/**", "static-site/**", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
`;

  files[".gitignore"] = "node_modules/\n.next/\nhost/evidence/\n";

  const manifest: HostManifest = {
    schemaVersion: 1,
    hostName: options.hostName,
    businessName: output.profile.businessName,
    plannedRoutes: output.pages.map((p) => p.route),
    notFoundProbe: { route: "/__framework-not-found-probe", marker: NOT_FOUND_MARKER },
    accessibility: {
      target: output.accessibilityStrategy.target,
      bodyText: output.accessibilityStrategy.thresholds.bodyText,
      largeText: output.accessibilityStrategy.thresholds.largeText,
      targetSizeCssPx: output.accessibilityStrategy.thresholds.targetSizeCssPx,
    },
    budgets: { routeJsKb: output.performanceStrategy.budgetKb },
    declared: { runtime: runtime.dependencies, toolchain: { ...HOST_TOOLCHAIN } },
    nonPackageLibraries: runtime.nonPackageLibraries,
    formContracts: generated.manifest.formContracts.map((f) => ({
      page: f.page,
      kind: f.contract.kind,
      endpoint: f.contract.endpoint.state,
    })),
    secretPatterns: SECRET_PATTERNS.map(([label, pattern]) => ({ label, source: pattern.source, flags: pattern.flags })),
    lab: LAB_PROFILE,
    responsiveSweep: RESPONSIVE_SWEEP,
    touchTargetCssPx: TOUCH_TARGET_CSS_PX,
    port: options.port ?? 3217,
    experiences: experienceExpectations(generated),
    navigation: {
      compact: generated.manifest.integrity.entries.some((e) => e.domain === "navigation" && e.status === "delivered"),
      menuId: "site-menu",
      routes: output.pages.map((p) => p.route),
    },
    staticSite: { dir: "static-site", routes: output.pages.map((p) => p.route) },
  };
  files[HOST_MANIFEST_PATH] = `${JSON.stringify(manifest, null, 2)}\n`;
  files["host/validate.mjs"] = runtimeScript("validate.mjs");

  files["HOST.md"] = [
    `# ${options.hostName}`,
    "",
    "GENERATED host project. It exists to build, serve and audit the generated site,",
    "and to hand RAW evidence back to the framework. It decides nothing.",
    "",
    "## Lifecycle",
    "",
    "```",
    "npm install          # installs ONLY the declared runtime + toolchain sets",
    "npm run validate     # build, typecheck, lint, serve, audit, lab vitals",
    "```",
    "",
    `Raw evidence is written to \`${RAW_EVIDENCE_PATH}\`. The framework parses it`,
    "against its schema and runs every gate itself.",
    "",
    "## Runtime dependencies (admitted: proposal × generated consumer × dependency gate)",
    ...Object.entries(runtime.dependencies).map(([n, r]) => `- \`${n}\` ${r}`),
    ...(runtime.nonPackageLibraries.length > 0
      ? ["", "Stack entries that are instructions, not packages (not installed):", ...runtime.nonPackageLibraries.map((l) => `- ${l}`)]
      : []),
    "",
    "## Toolchain (build and audit only)",
    ...Object.entries(HOST_TOOLCHAIN).map(([n, e]) => `- \`${n}\` ${e.range} — ${e.purpose}`),
    "",
    "## Browser",
    "",
    "The audit drives a browser that is already installed. Set `HOST_BROWSER_PATH`",
    "to its executable, or the collector looks in the standard Chrome, Edge and",
    "Chromium locations. With no browser, the audit and vitals are recorded as",
    "unavailable — never as passing.",
    "",
    "## Form endpoints",
    ...(manifest.formContracts.length > 0
      ? manifest.formContracts.map((f) => `- ${f.page} ${f.kind}: ${f.endpoint}`)
      : ["- no conversion forms"]),
    "",
  ].join("\n");

  return { files, manifest };
}

/**
 * Write a host plan to disk. Regenerates the source tree cleanly (stale routes
 * from a previous generation must not survive) while leaving `node_modules` and
 * `.next` alone, so a re-run does not reinstall.
 */
export function writeHostProject(plan: HostProjectPlan, hostDir: string): string[] {
  for (const generatedDir of ["app", "public", "host", "static-site", "forms"]) {
    const target = join(hostDir, generatedDir);
    if (existsSync(target)) rmSync(target, { recursive: true, force: true });
  }
  const written: string[] = [];
  for (const [relative, body] of Object.entries(plan.files)) {
    const target = join(hostDir, relative);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, body, "utf8");
    written.push(relative);
  }
  return written;
}
