/**
 * HOST TOOLCHAIN — the development dependencies a generated HOST project may
 * install to build and audit itself. Declared here, with a purpose each, so the
 * technical gate can refuse anything else.
 *
 * The boundary this file draws:
 *   - the CORE library (this repository) installs none of these. It generates a
 *     host, and consumes the evidence the host produces.
 *   - the HOST installs its RUNTIME set (`stack/runtime-packages.ts`, from the
 *     stack decision) and this TOOLCHAIN set, and nothing more.
 *
 * `playwright-core` drives a browser that is ALREADY INSTALLED on the machine; it
 * downloads no browser binary. `axe-core` is the audit engine injected into the
 * rendered pages; the framework's accessibility evaluator stays the policy layer.
 */
export interface ToolchainEntry {
  range: string;
  purpose: string;
}

export const HOST_TOOLCHAIN: Readonly<Record<string, ToolchainEntry>> = {
  typescript: { range: "^5.5.4", purpose: "next build type-checks the TSX; `tsc --noEmit` is the measured typecheck" },
  "@types/node": { range: "^20.14.10", purpose: "types for the Node runtime the host builds and serves on" },
  "@types/react": { range: "^19.1.0", purpose: "types for the React runtime the stack decision selected" },
  "@types/react-dom": { range: "^19.1.0", purpose: "types for react-dom" },
  eslint: { range: "^9.0.0", purpose: "the measured lint step" },
  "eslint-config-next": { range: "^15.5.0", purpose: "Next.js lint rules, including core web vitals rules" },
  "@eslint/eslintrc": { range: "^3.0.0", purpose: "flat-config compatibility for eslint-config-next" },
  "axe-core": { range: "^4.10.0", purpose: "accessibility audit engine run inside each rendered page" },
  "playwright-core": { range: "^1.50.0", purpose: "drives an already-installed browser for the audit and lab vitals; downloads no browser" },
};

export function toolchainDevDependencies(): Record<string, string> {
  return Object.fromEntries(Object.entries(HOST_TOOLCHAIN).map(([name, entry]) => [name, entry.range]));
}
