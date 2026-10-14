/**
 * DEPENDENCY ADMISSION — one authority for what a generated site installs
 * (customer dry run P1-6, DEF-010).
 *
 * ROOT CAUSE this replaces: the stack decision's PROPOSAL was installed as-is.
 * `contact_form` proposed `react-hook-form` and `zod`; the Phase 2 dependency gate
 * DENIED `react-hook-form` (it answered none of the doctrine's questions and no
 * generated code used it); the host installed it anyway, because the proposal was
 * the only thing the host read.
 *
 * Now a package is ADMITTED only when all three hold:
 *   1. the stack proposed it (a stated requirement asked for it);
 *   2. a GENERATED module consumes it (GENERATOR_CONSUMERS — reconciled against
 *      the emitted imports at generation, so this table cannot lie);
 *   3. the dependency gate approved it (`constraints.dependencyDecisions`), unless
 *      it is the framework runtime itself.
 * A denial always wins. The host package.json, the Next package.json, the technical
 * gate's declared set and the import reconciliation all read `admitted`.
 */
import type { StackDecision } from "./select-stack.js";
import { FRAMEWORK_RUNTIME, runtimePackagesFor } from "./runtime-packages.js";

export interface GeneratorConsumer {
  /** The generated module that imports the package. */
  module: string;
  purpose: string;
  /** True when the doctrine's dependency gate must approve it before install. */
  requiresApproval: boolean;
}

/**
 * Every package a GENERATED module can import. A package absent here is imported
 * by no generated code, so installing it would be the unused dependency §17 and
 * stack_doctrine.md forbid.
 */
export const GENERATOR_CONSUMERS: Readonly<Record<string, GeneratorConsumer>> = {
  next: { module: "app/**", purpose: "the application framework the stack decision selected", requiresApproval: false },
  react: { module: "app/**", purpose: "the component runtime Next.js requires", requiresApproval: false },
  "react-dom": { module: "app/**", purpose: "the DOM renderer Next.js requires", requiresApproval: false },
  zod: {
    module: "app/_forms/contracts.ts",
    purpose: "server-side validation schemas mirroring each conversion form contract, for a host endpoint to apply",
    requiresApproval: true,
  },
};

export type AdmissionStatus = "admitted" | "awaiting_approval" | "denied" | "not_consumed" | "not_proposed";

export interface AdmissionEntry {
  package: string;
  range: string | null;
  status: AdmissionStatus;
  consumer: string | null;
  reason: string;
}

export interface DependencyAdmission {
  /** name -> range: exactly what a host installs at runtime. */
  admitted: Record<string, string>;
  entries: AdmissionEntry[];
  /** Stack entries that are instructions, not packages (recorded, never installed). */
  nonPackageLibraries: string[];
}

export interface DependencyDecision {
  package: string;
  decision: "approved" | "denied";
  decidedBy: string;
  reason: string;
}

export function admitDependencies(
  stack: Pick<StackDecision, "libraries">,
  decisions: readonly DependencyDecision[] = [],
): DependencyAdmission {
  const proposal = runtimePackagesFor(stack);
  const admitted: Record<string, string> = {};
  const entries: AdmissionEntry[] = [];
  for (const [name, range] of Object.entries(proposal.dependencies)) {
    const decision = decisions.find((d) => d.package === name);
    const consumer = GENERATOR_CONSUMERS[name];
    if (decision?.decision === "denied") {
      entries.push({ package: name, range, status: "denied", consumer: consumer?.module ?? null, reason: `denied by ${decision.decidedBy}: ${decision.reason}` });
    } else if (name in FRAMEWORK_RUNTIME) {
      admitted[name] = range;
      entries.push({ package: name, range, status: "admitted", consumer: consumer?.module ?? "app/**", reason: "framework runtime selected by the stack decision" });
    } else if (!consumer) {
      entries.push({ package: name, range, status: "not_consumed", consumer: null, reason: "no generated module imports it; an unused dependency is never installed (§17, DEF-010)" });
    } else if (consumer.requiresApproval && decision?.decision !== "approved") {
      entries.push({ package: name, range, status: "awaiting_approval", consumer: consumer.module, reason: `proposed for "${consumer.purpose}"; the dependency gate has not approved it (stack_doctrine.md), so it is not installed and its consumer is not emitted` });
    } else {
      admitted[name] = range;
      entries.push({ package: name, range, status: "admitted", consumer: consumer.module, reason: decision ? `approved by ${decision.decidedBy}: ${decision.reason}` : `consumed by ${consumer.module}` });
    }
  }
  for (const decision of decisions) {
    if (decision.package in proposal.dependencies) continue;
    entries.push({
      package: decision.package,
      range: null,
      status: "not_proposed",
      consumer: GENERATOR_CONSUMERS[decision.package]?.module ?? null,
      reason: `a ${decision.decision} decision exists, but no stated requirement proposed the package; an approval cannot add one`,
    });
  }
  return { admitted, entries, nonPackageLibraries: proposal.nonPackageLibraries };
}

/** Package name from an import specifier, or null for a relative/absolute path. */
export function packageOfSpecifier(specifier: string): string | null {
  if (specifier.startsWith(".") || specifier.startsWith("/")) return null;
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : (parts[0] ?? null);
}

/** Every bare package imported by emitted TS/TSX source. */
export function importedPackages(files: Readonly<Record<string, string>>): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const [path, body] of Object.entries(files)) {
    if (!/\.(ts|tsx|mjs|js)$/.test(path)) continue;
    for (const match of body.matchAll(/(?:^|\n)\s*import\s+(?:[^"';]*?\s+from\s+)?["']([^"']+)["']/g)) {
      const pkg = packageOfSpecifier(match[1] ?? "");
      if (!pkg) continue;
      out.set(pkg, [...(out.get(pkg) ?? []), path]);
    }
  }
  return out;
}
