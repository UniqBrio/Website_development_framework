import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { runPipeline } from "../../src/pipeline.js";
import { buildPalette, verifyPalette } from "../../src/design-system/tokens/palette.js";
import { buildTokenContract, decideSeed } from "../../src/design-system/tokens/token-contract.js";
import { labelOn, pick, ramp, ratio, rgb2oklch, hex2rgb } from "../../src/design-system/tokens/oklch.js";
import { deriveDesignContextProfile } from "../../src/design-intelligence/profile/derive-profile.js";
import { RANGES } from "../../src/responsive/capabilities.js";
import { assets, baseInput, content } from "../fixtures/business-inputs.js";
import { dryRunFixture } from "../fixtures/dry-run-fixture.js";

const SEED = "#4C1D95";

/**
 * Run the AUTHORITATIVE Python generator and return its palette.
 *
 * This is the parity proof. The TypeScript is a PORT of
 * website_workflow/tools/generate_palette.py, and two implementations of one
 * algorithm is precisely the drift this framework has fixed twice before. Rather
 * than trusting the port, the test executes the original and compares every
 * emitted value.
 *
 * Python is already a hard dependency of this repository (`npm run gate` runs
 * audit_framework.py), so requiring it here introduces nothing new. If it is
 * unavailable the test FAILS rather than skipping — a parity test that silently
 * skips is a parity test that proves nothing.
 */
function pythonPalette(seed: string, mode: string): {
  semantic: Record<string, Record<string, string>>;
  primitives: Record<string, Record<string, string>>;
  checks: Array<{ pair: string; ratio: number; pass: boolean; drift: number }>;
} {
  const script = [
    "import json, sys",
    "sys.path.insert(0, 'website_workflow/tools')",
    "import generate_palette as gp",
    `p = gp.build(${JSON.stringify(seed)}, ${JSON.stringify(mode)})`,
    "print(json.dumps({'semantic': p['semantic'], 'primitives': p['primitives'], 'checks': p['checks']}))",
  ].join("\n");
  const out = execFileSync("python", ["-c", script], { encoding: "utf8", cwd: process.cwd() });
  return JSON.parse(out);
}

describe("P1-2 — the OKLCH port matches the Python authority exactly", () => {
  for (const mode of ["SINGLE-DARK", "SINGLE-LIGHT", "DUAL"] as const) {
    it(`semantic tokens are identical for ${mode}`, () => {
      const expected = pythonPalette(SEED, mode);
      const actual = buildPalette(SEED, mode);
      for (const [theme, tokens] of Object.entries(expected.semantic)) {
        for (const [name, value] of Object.entries(tokens)) {
          expect(
            actual.semantic[theme as "light" | "dark"]?.[name],
            `${mode} ${theme} ${name}`,
          ).toBe(value);
        }
      }
      // And no EXTRA tokens: a port that adds a token is also a divergence.
      for (const [theme, tokens] of Object.entries(actual.semantic)) {
        expect(Object.keys(tokens ?? {}).sort()).toEqual(
          Object.keys(expected.semantic[theme] ?? {}).sort(),
        );
      }
    });
  }

  it("primitive ramps are identical", () => {
    const expected = pythonPalette(SEED, "DUAL");
    const actual = buildPalette(SEED, "DUAL");
    for (const [rampName, steps] of Object.entries(expected.primitives)) {
      for (const [step, value] of Object.entries(steps)) {
        expect(actual.primitives[rampName]?.[Number(step)], `${rampName}/${step}`).toBe(value);
      }
    }
  });

  it("the measured contrast table is identical, including drift", () => {
    const expected = pythonPalette(SEED, "DUAL");
    const actual = buildPalette(SEED, "DUAL");
    expect(actual.checks).toHaveLength(expected.checks.length);
    for (let i = 0; i < expected.checks.length; i += 1) {
      const e = expected.checks[i];
      const a = actual.checks[i];
      expect(a?.pair).toBe(e?.pair);
      expect(a?.ratio).toBeCloseTo(e?.ratio ?? -1, 2);
      expect(a?.pass).toBe(e?.pass);
      expect(a?.drift).toBe(e?.drift);
    }
  });

  it("matches on a hostile near-white seed too", () => {
    const hostile = "#FAFAFA";
    const expected = pythonPalette(hostile, "DUAL");
    const actual = buildPalette(hostile, "DUAL");
    for (const [theme, tokens] of Object.entries(expected.semantic)) {
      for (const [name, value] of Object.entries(tokens)) {
        expect(actual.semantic[theme as "light" | "dark"]?.[name], `${theme} ${name}`).toBe(value);
      }
    }
  });
});

describe("P1-2 — colour maths primitives", () => {
  it("round-trips a hex through OKLCH", () => {
    const { L, C, H } = rgb2oklch(...hex2rgb(SEED));
    expect(L).toBeGreaterThan(0);
    expect(C).toBeGreaterThan(0);
    expect(H).toBeGreaterThanOrEqual(0);
    expect(H).toBeLessThan(360);
  });

  it("computes WCAG ratios correctly at the extremes", () => {
    expect(ratio("#FFFFFF", "#000000")).toBeCloseTo(21, 1);
    expect(ratio("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 3);
  });

  it("labelOn MEASURES the label colour rather than assuming white", () => {
    // A light fill must get a dark label. Assuming white is the 2.98:1 defect.
    const light = labelOn("#FFD400");
    expect(light.hex).toBe("#111111");
    expect(light.ratio).toBeGreaterThanOrEqual(4.5);
    const dark = labelOn("#2B1055");
    expect(dark.hex).toBe("#FFFFFF");
  });

  it("pick reports drift when correction moves the shade", () => {
    const r = ramp(280, 0.12);
    const result = pick(r, "#FFFFFF", 4.5, 50);
    // Step 50 is near-white, so clearing 4.5:1 on white must drift a long way.
    expect(result.drift).toBeGreaterThan(0);
    expect(result.ratio).toBeGreaterThanOrEqual(4.5);
  });
});

describe("P1-2 — token values always exist", () => {
  it("the pipeline emits real colour VALUES, not a requirement", () => {
    const { output } = runPipeline(dryRunFixture());
    expect(output.tokens).toBeDefined();
    const semantic = output.tokens.color.values.semantic;
    const themes = Object.keys(semantic);
    expect(themes.length).toBeGreaterThan(0);
    const tokens = semantic[themes[0] as "light" | "dark"] ?? {};
    for (const required of ["bg-0", "fg-0", "accent-1", "accent-1-on", "focus-ring", "border"]) {
      expect(tokens[required], `${required} has no value`).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it("emits implementation-consumable CSS custom properties", () => {
    const { output } = runPipeline(dryRunFixture());
    const css = output.tokens.color.values.cssCustomProperties;
    const theme = Object.keys(css)[0] as "light" | "dark";
    expect(css[theme]?.["--color-accent-1"]).toMatch(/^#[0-9A-F]{6}$/);
    expect(css[theme]?.["--color-fg-0"]).toBeTruthy();
  });

  it("carries the MEASURED contrast table as the Gate 5 artifact", () => {
    const { output } = runPipeline(dryRunFixture());
    const contrast = output.tokens.color.values.contrast;
    expect(contrast.length).toBeGreaterThan(10);
    for (const check of contrast) {
      expect(typeof check.ratio).toBe("number");
      expect(check.ratio).toBeGreaterThan(0);
      expect(typeof check.pass).toBe("boolean");
    }
    // The accent label — the most important text on the page — is measured.
    expect(contrast.some((c) => c.pair === "accent-1-on on accent-1")).toBe(true);
  });

  it("produces every other token group with values", () => {
    const { output } = runPipeline(dryRunFixture());
    const t = output.tokens;
    expect(t.typography.values.scale["body"]).toContain("clamp(");
    expect(t.typography.values.readingMeasure).toMatch(/ch$/);
    expect(Object.keys(t.spacing.values.scale).length).toBeGreaterThan(8);
    expect(t.radius.values.scale["md"]).toBe("6px");
    expect(t.layout.values.columns["large"]).toBe(12);
    expect(t.motion.values.easing["standard"]).toContain("cubic-bezier");
  });

  it("breakpoints are READ from the responsive engine, never restated", () => {
    const { output } = runPipeline(dryRunFixture());
    for (const [name, range] of Object.entries(RANGES)) {
      expect(output.tokens.layout.values.breakpoints[name as keyof typeof RANGES]).toBe(
        `${range.min}px`,
      );
    }
  });

  it("a low-literacy audience raises the body size floor", () => {
    const low = runPipeline(dryRunFixture()).output.tokens.typography.values.scale["body"];
    const high = runPipeline(
      baseInput({
        targetAudience: [{ label: "FIXTURE-EXPERTS", isPrimary: true, digitalLiteracy: "high" }],
        availableContent: content({ propositionText: "verified_available" }),
      }),
    ).output.tokens.typography.values.scale["body"];
    expect(low).not.toBe(high);
    expect(low).toContain("1.0625rem");
  });

  it("a minimal motion cap withholds entrance durations", () => {
    const { output } = runPipeline(dryRunFixture());
    expect(output.tokens.motion.values.cap).toBe("minimal");
    expect(output.tokens.motion.values.duration["enter"]).toBeUndefined();
    expect(output.tokens.motion.values.duration["state"]).toBeTruthy();
    expect(output.tokens.motion.values.reducedMotion).toContain("lose no information");
  });
});

describe("P1-2 negative — a brand palette is never invented", () => {
  it("a supplied seed is brand_derived", () => {
    const input = baseInput({
      constraints: { localization: [], integrations: [], brandSeed: SEED },
      availableAssets: assets({ brandColors: "verified_available" }),
    });
    const decision = decideSeed(input);
    expect(decision.provenance).toBe("brand_derived");
    expect(decision.seed).toBe(SEED);
    expect(decision.substituting).toBeUndefined();
  });

  it("brand colours that EXIST but whose value is absent give a neutral substitute plus a request", () => {
    const input = baseInput({ availableAssets: assets({ brandColors: "verified_available" }) });
    const decision = decideSeed(input);
    expect(decision.provenance).toBe("neutral_substitute");
    expect(decision.source).toContain("no seed VALUE was supplied");
    expect(decision.substituting?.needs).toContain("brandSeed");
  });

  it("no brand colours at all gives the §J.2 neutral system, not an invented palette", () => {
    const decision = decideSeed(baseInput());
    expect(decision.provenance).toBe("neutral_substitute");
    expect(decision.source).toContain("§J.2");
  });

  it("a substituted palette STILL produces usable values, so nothing reaches implementation empty", () => {
    const { output } = runPipeline(dryRunFixture());
    expect(output.tokens.color.provenance).toBe("neutral_substitute");
    const theme = Object.keys(output.tokens.color.values.semantic)[0] as "light" | "dark";
    expect(output.tokens.color.values.semantic[theme]?.["accent-1"]).toMatch(/^#[0-9A-F]{6}$/);
  });

  it("the substitution is reported as unresolved with what would replace it", () => {
    const { output } = runPipeline(dryRunFixture());
    const colorUnresolved = output.tokens.unresolved.find((u) => u.group === "color");
    expect(colorUnresolved?.needs).toContain("brandSeed");
    expect(output.approvalsRequired.join(" ")).toContain("brandSeed");
  });

  it("an unchosen theme mode is recorded as a problem, not a silent decision", () => {
    const { output } = runPipeline(dryRunFixture());
    expect(output.tokens.problems.join(" ")).toContain("UNCHOSEN default");
    expect(output.tokens.color.source).toContain("UNCHOSEN");
  });

  it("a stated theme mode is honoured and not flagged", () => {
    const base = dryRunFixture();
    const { output } = runPipeline({
      ...base,
      constraints: { ...base.constraints, localization: [], integrations: [], themeMode: "DUAL" },
    });
    expect(output.tokens.color.values.mode).toBe("DUAL");
    expect(output.tokens.problems.join(" ")).not.toContain("UNCHOSEN");
  });
});

describe("P1-2 negative — contrast and parity failures are surfaced", () => {
  it("DUAL asserts token parity across both themes", () => {
    const palette = buildPalette(SEED, "DUAL");
    const verdict = verifyPalette(palette);
    expect(verdict.tokenParity.checked).toBe(true);
    expect(verdict.tokenParity.missing).toEqual([]);
  });

  it("a single-theme palette does not claim a parity check it did not run", () => {
    const verdict = verifyPalette(buildPalette(SEED, "SINGLE-LIGHT"));
    expect(verdict.tokenParity.checked).toBe(false);
  });

  it("every contrast pair clears its target for a hostile seed", () => {
    // The generator auto-corrects; this proves the port's correction works too.
    const verdict = verifyPalette(buildPalette("#FAFAFA", "DUAL"));
    expect(verdict.failures).toEqual([]);
  });

  it("drift is reported rather than hidden by the correction", () => {
    const contract = buildTokenContract(
      baseInput({ constraints: { localization: [], integrations: [], brandSeed: "#FAFAFA" } }),
      deriveDesignContextProfile(baseInput()),
      "low",
    );
    // Whatever the outcome, any drift must appear in `problems`, not be swallowed.
    for (const drift of contract.color.values.drifted) {
      expect(contract.problems.join(" ")).toContain(drift.pair);
    }
  });

  it("rejects a malformed seed rather than falling back silently", () => {
    expect(() =>
      baseInput({ constraints: { localization: [], integrations: [], brandSeed: "not-a-colour" } }),
    ).toThrow(/hex colour/);
  });
});
