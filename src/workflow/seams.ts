/**
 * WORKFLOW SEAMS — markdown ↔ TypeScript, automated (customer dry run P1-8).
 *
 * ROOT CAUSE this replaces: the markdown workflow and the TypeScript engine met at
 * five seams and every one was manual. The brief became `engine/*.json` by hand
 * transcription; Phase 2 dependency denials had no channel into the host; test
 * register results were typed by reading a digest.
 *
 * THE CONTRACT, in three parts:
 *
 * 1. MARKDOWN → TS. A workflow record carries machine-readable blocks:
 *
 *        ```json framework:business-input
 *        { ...BusinessInput... }
 *        ```
 *
 *    Kinds: `business-input`, `supplied-content`, `dependency-decisions`,
 *    `test-register`. The record is the AUTHORITY; any JSON the engine reads is
 *    derived from it (`engineInputFromWorkflow`), and drift is a failing test.
 *    A dependency decision recorded at the Phase 2 gate reaches admission as
 *    `constraints.dependencyDecisions` — the channel that did not exist.
 *
 * 2. TS → MARKDOWN. Generated sections live between markers and are replaced
 *    wholesale (`writeGeneratedSection`); nothing outside the markers is touched,
 *    so human prose and machine output cannot overwrite each other.
 *
 * 3. REGISTER → EVIDENCE. A test-register case names a CHECK from a closed
 *    registry (`REGISTER_CHECKS`); evaluation reads the gates and ledgers the core
 *    already computed. A case naming an unknown check is an error, not a pass.
 */
import { parseBusinessInput, type BusinessInput } from "../design-intelligence/types/business-input.js";
import type { QualityAssessment } from "../quality/gate-derivation.js";
import type { GenerationManifest } from "../generation/generate-website.js";
import type { DependencyDecision } from "../stack/dependency-admission.js";

export const BLOCK_KINDS = ["business-input", "supplied-content", "dependency-decisions", "test-register"] as const;
export type BlockKind = (typeof BLOCK_KINDS)[number];

export interface FrameworkBlock {
  kind: BlockKind;
  file: string;
  line: number;
  value: unknown;
}

const BLOCK = /^```json[ \t]+framework:([a-z-]+)[ \t]*\r?\n([\s\S]*?)^```[ \t]*$/gm;

/** Every framework block in a markdown record. Malformed JSON or an unknown kind throws, naming file and line. */
export function extractFrameworkBlocks(markdown: string, file: string): FrameworkBlock[] {
  const blocks: FrameworkBlock[] = [];
  for (const match of markdown.matchAll(BLOCK)) {
    const line = markdown.slice(0, match.index).split("\n").length;
    const kind = match[1] as BlockKind;
    if (!(BLOCK_KINDS as readonly string[]).includes(kind)) {
      throw new Error(`${file}:${line}: unknown framework block kind "${match[1]}" (known: ${BLOCK_KINDS.join(", ")})`);
    }
    try {
      blocks.push({ kind, file, line, value: JSON.parse(match[2] ?? "") });
    } catch (error) {
      throw new Error(`${file}:${line}: framework:${kind} block is not valid JSON — ${(error as Error).message}`);
    }
  }
  return blocks;
}

export interface WorkflowDocument {
  file: string;
  markdown: string;
}

export interface EngineInputFromWorkflow {
  businessInput: BusinessInput;
  /** The raw supplied-content value (validated by the generator's schema), or undefined. */
  suppliedContent: unknown;
  /** Where each part came from, for the run record. */
  sources: { businessInput: string; suppliedContent: string | null; dependencyDecisions: string[]; testRegister: string[] };
  testRegister: RegisterCase[];
}

function only(blocks: FrameworkBlock[], kind: BlockKind, required: boolean): FrameworkBlock | null {
  const found = blocks.filter((b) => b.kind === kind);
  if (found.length > 1) throw new Error(`more than one framework:${kind} block (${found.map((b) => `${b.file}:${b.line}`).join(", ")}); a value has one authority`);
  if (required && found.length === 0) throw new Error(`no framework:${kind} block in the workflow records`);
  return found[0] ?? null;
}

/**
 * Assemble the engine's input from workflow records. Dependency decisions from
 * the Phase 2 gate are merged into `constraints.dependencyDecisions`; a package
 * decided in BOTH places with different verdicts is a conflict and throws.
 */
export function engineInputFromWorkflow(documents: readonly WorkflowDocument[]): EngineInputFromWorkflow {
  const blocks = documents.flatMap((d) => extractFrameworkBlocks(d.markdown, d.file));
  const inputBlock = only(blocks, "business-input", true)!;
  const suppliedBlock = only(blocks, "supplied-content", false);
  const decisionBlocks = blocks.filter((b) => b.kind === "dependency-decisions");
  const registerBlocks = blocks.filter((b) => b.kind === "test-register");

  const raw = inputBlock.value as Record<string, unknown>;
  const constraints = { ...((raw["constraints"] as Record<string, unknown> | undefined) ?? {}) };
  const decisions = new Map<string, DependencyDecision>();
  for (const d of (constraints["dependencyDecisions"] as DependencyDecision[] | undefined) ?? []) decisions.set(d.package, d);
  for (const block of decisionBlocks) {
    if (!Array.isArray(block.value)) throw new Error(`${block.file}:${block.line}: framework:dependency-decisions must be an array`);
    for (const d of block.value as DependencyDecision[]) {
      const existing = decisions.get(d.package);
      if (existing && existing.decision !== d.decision) {
        throw new Error(`${block.file}:${block.line}: "${d.package}" is ${d.decision} here but ${existing.decision} elsewhere; one dependency has one gate decision`);
      }
      decisions.set(d.package, d);
    }
  }
  if (decisions.size > 0) constraints["dependencyDecisions"] = [...decisions.values()];
  const businessInput = parseBusinessInput({ ...raw, ...(Object.keys(constraints).length > 0 ? { constraints } : {}) });

  const testRegister: RegisterCase[] = [];
  for (const block of registerBlocks) {
    if (!Array.isArray(block.value)) throw new Error(`${block.file}:${block.line}: framework:test-register must be an array of cases`);
    for (const c of block.value as RegisterCase[]) {
      if (!(c.check in REGISTER_CHECKS)) throw new Error(`${block.file}:${block.line}: case ${c.id} names unknown check "${c.check}"`);
      testRegister.push(c);
    }
  }

  return {
    businessInput,
    suppliedContent: suppliedBlock?.value,
    sources: {
      businessInput: `${inputBlock.file}:${inputBlock.line}`,
      suppliedContent: suppliedBlock ? `${suppliedBlock.file}:${suppliedBlock.line}` : null,
      dependencyDecisions: decisionBlocks.map((b) => `${b.file}:${b.line}`),
      testRegister: registerBlocks.map((b) => `${b.file}:${b.line}`),
    },
    testRegister,
  };
}

/** Replace (or append) the generated section `id`. Text outside the markers is never touched. */
export function writeGeneratedSection(markdown: string, id: string, body: string): string {
  const start = `<!-- framework:generated:${id}:start -->`;
  const end = `<!-- framework:generated:${id}:end -->`;
  const section = `${start}\n<!-- GENERATED by the framework; edits between these markers are overwritten. -->\n${body.trim()}\n${end}`;
  const from = markdown.indexOf(start);
  const to = markdown.indexOf(end);
  if (from >= 0 && to > from) return `${markdown.slice(0, from)}${section}${markdown.slice(to + end.length)}`;
  return `${markdown.trimEnd()}\n\n${section}\n`;
}

// ------------------------------------------------------------------ register

export interface RegisterCase {
  id: string;
  title: string;
  check: string;
}

export interface RegisterContext {
  quality: QualityAssessment;
  manifest?: GenerationManifest;
  /** From host evidence mapping, when a host ran. */
  experiencesWork?: boolean;
  navigationWorks?: boolean;
}

export type RegisterResult = "PASS" | "FAIL" | "BLOCKED";

type Check = (ctx: RegisterContext) => { result: RegisterResult; evidence: string };

const gate = (name: keyof QualityAssessment["gates"]): Check => (ctx) => {
  const g = ctx.quality.gates[name];
  const reasons = ctx.quality.blockers.filter((b) => b.toLowerCase().includes(name)).slice(0, 2);
  return { result: g === true ? "PASS" : g === false ? "FAIL" : "BLOCKED", evidence: `gates.${name}=${String(g)}${reasons.length > 0 ? `; ${reasons.join("; ")}` : ""}` };
};
const noBlocker = (needle: string, label: string): Check => (ctx) => {
  if (ctx.quality.mode !== "post_build") return { result: "BLOCKED", evidence: `${label}: needs measured served HTML` };
  const hits = ctx.quality.blockers.filter((b) => b.includes(needle));
  return { result: hits.length === 0 ? "PASS" : "FAIL", evidence: hits.length === 0 ? `${label}: no finding` : hits.join("; ") };
};

/** The closed check registry. A register case may name only these. */
export const REGISTER_CHECKS: Readonly<Record<string, Check>> = {
  "gate.technical": gate("technical"),
  "gate.accessibility": gate("accessibility"),
  "gate.responsive": gate("responsive"),
  "gate.performance": gate("performance"),
  "gate.content": gate("content"),
  "gate.design": gate("design"),
  "conversion.completable_action": noBlocker("completable conversion action", "completable conversion action"),
  "indexability.no_placeholder_text": noBlocker("placeholder text", "placeholder text on indexable pages"),
  "indexability.no_duplicate_pages": noBlocker("near-duplicate main content", "duplicate indexable pages"),
  "integrity.consistent": (ctx) =>
    ctx.manifest
      ? { result: ctx.manifest.integrity.consistent ? "PASS" : "FAIL", evidence: `integrity ${JSON.stringify(ctx.manifest.integrity.counts)}` }
      : { result: "BLOCKED", evidence: "no generation manifest" },
  "navigation.compact_delivered": (ctx) => {
    const entry = ctx.manifest?.integrity.entries.find((e) => e.domain === "navigation");
    if (!entry) return { result: "BLOCKED", evidence: "no generation manifest" };
    if (entry.status !== "delivered") return { result: "FAIL", evidence: entry.reason };
    return ctx.navigationWorks === undefined
      ? { result: "BLOCKED", evidence: "rendered, but not operated in a browser" }
      : { result: ctx.navigationWorks ? "PASS" : "FAIL", evidence: `rendered and operated in a browser: ${ctx.navigationWorks ? "works" : "failed"}` };
  },
  "experiences.work": (ctx) =>
    ctx.experiencesWork === undefined
      ? { result: "BLOCKED", evidence: "no delivered experience was operated" }
      : { result: ctx.experiencesWork ? "PASS" : "FAIL", evidence: `experiencesWork=${String(ctx.experiencesWork)}` },
  "dataset.not_synthetic": (ctx) =>
    ctx.manifest
      ? { result: ctx.manifest.dataset.classification === "synthetic" ? "FAIL" : "PASS", evidence: ctx.manifest.dataset.classification === "synthetic" ? `synthetic: ${ctx.manifest.dataset.markers.slice(0, 2).join("; ")}` : "no synthetic markers" }
      : { result: "BLOCKED", evidence: "no generation manifest" },
};

export function evaluateTestRegister(cases: readonly RegisterCase[], ctx: RegisterContext): Array<RegisterCase & { result: RegisterResult; evidence: string }> {
  return cases.map((c) => {
    const check = REGISTER_CHECKS[c.check];
    if (!check) throw new Error(`register case ${c.id} names unknown check "${c.check}"`);
    return { ...c, ...check(ctx) };
  });
}

export function renderRegisterTable(results: ReadonlyArray<RegisterCase & { result: RegisterResult; evidence: string }>): string {
  const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
  return [
    "| ID | Title | Check | Result | Evidence |",
    "|---|---|---|---|---|",
    ...results.map((r) => `| ${cell(r.id)} | ${cell(r.title)} | \`${r.check}\` | ${r.result} | ${cell(r.evidence)} |`),
  ].join("\n");
}
