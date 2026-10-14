/**
 * RUNTIME PACKAGES — the ONE place a stack decision becomes installable packages.
 *
 * The stack decision lists libraries by the names requirements asked for. Some
 * are real npm packages (`zod`), some are instructions ("lazy-loaded map embed").
 * Before the host phase that split lived inside the Next.js emitter, and nothing
 * compared what a host actually INSTALLED against it. Now:
 *
 *   - `runtimePackagesFor(stack)` is the declared runtime dependency set;
 *   - the emitter writes exactly that into the generated package.json;
 *   - the technical gate compares a host's MEASURED dependencies against it, so
 *     an undeclared package fails the gate instead of passing silently.
 *
 * Version ranges are pinned to a major, so a host install is reproducible and a
 * major upgrade is a deliberate change here rather than an accident of `*`.
 */
import type { StackDecision } from "./select-stack.js";

/** The framework runtime every Next.js host needs. */
export const FRAMEWORK_RUNTIME: Readonly<Record<string, string>> = {
  next: "^15.5.0",
  react: "^19.1.0",
  "react-dom": "^19.1.0",
};

/** Major-pinned ranges for libraries the stack decision may add. */
export const LIBRARY_VERSION_RANGES: Readonly<Record<string, string>> = {
  "next-intl": "^4.0.0",
  "react-hook-form": "^7.0.0",
  zod: "^3.23.0",
  three: "^0.170.0",
  "@react-three/fiber": "^9.0.0",
  mdx: "*",
  "lottie-web": "^5.12.0",
};

const PACKAGE_NAME = /^(@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*$/;

export interface RuntimePackages {
  /** name -> version range: exactly what a host installs at runtime. */
  dependencies: Record<string, string>;
  /** Stack entries that are instructions, not packages, recorded not installed. */
  nonPackageLibraries: string[];
}

export function runtimePackagesFor(stack: Pick<StackDecision, "libraries">): RuntimePackages {
  const dependencies: Record<string, string> = { ...FRAMEWORK_RUNTIME };
  const nonPackageLibraries: string[] = [];
  for (const library of stack.libraries) {
    if (PACKAGE_NAME.test(library)) {
      dependencies[library] = LIBRARY_VERSION_RANGES[library] ?? "*";
    } else {
      nonPackageLibraries.push(library);
    }
  }
  return { dependencies, nonPackageLibraries };
}
