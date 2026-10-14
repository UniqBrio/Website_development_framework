/**
 * Palette derivation — port of `build()` in generate_palette.py.
 *
 * Implements color_system.md's three layers: L1 primitive ramps from ONE seed,
 * L2 semantic tokens per theme with MEASURED contrast and auto-correction, and
 * the DRIFT flag that makes the correction honest.
 */
import {
  DRIFT_LIMIT,
  SEMANTIC_HUES,
  STEP_ORDER,
  labelOn,
  pick,
  ramp,
  ratio,
  rgb2oklch,
  hex2rgb,
  type Oklch,
  type Ramp,
} from "./oklch.js";

/**
 * The contrast the palette must reach. `text` applies to every text pair, `ui`
 * to boundaries and indicators.
 *
 * DEFECT this fixes (found by the first real host audit): every text pair was
 * checked at 4.5:1 regardless of the requested target. AAA was enforced by the
 * accessibility EVALUATOR but never reached the token GENERATOR, so an AAA site
 * shipped a 5.19:1 button label and the design gate called the tokens valid.
 * The default stays AA, which reproduces generate_palette.py exactly (the parity
 * tests); a stricter target is passed in by the token contract.
 */
export interface PaletteContrast {
  text: number;
  ui: number;
}
export const AA_PALETTE_CONTRAST: PaletteContrast = { text: 4.5, ui: 3.0 };

export type ThemeMode = "SINGLE-DARK" | "SINGLE-LIGHT" | "DUAL";
export type ThemeName = "light" | "dark";

export interface ContrastCheck {
  theme: ThemeName;
  pair: string;
  fg: string;
  bg: string;
  target: number;
  ratio: number;
  pass: boolean;
  drift: number;
  drifted: boolean;
}

export interface Palette {
  seed: string;
  mode: ThemeMode;
  oklch: Oklch;
  primitives: Record<string, Ramp>;
  /** L2 semantic tokens per active theme. Components consume ONLY these. */
  semantic: Partial<Record<ThemeName, Record<string, string>>>;
  checks: ContrastCheck[];
}

const THEMES: Record<ThemeMode, ThemeName[]> = {
  "SINGLE-DARK": ["dark"],
  "SINGLE-LIGHT": ["light"],
  DUAL: ["light", "dark"],
};

export function buildPalette(
  seed: string,
  mode: ThemeMode,
  contrast: PaletteContrast = AA_PALETTE_CONTRAST,
): Palette {
  const text = contrast.text;
  const ui = contrast.ui;
  const [r, g, b] = hex2rgb(seed);
  const { L, C, H } = rgb2oklch(r, g, b);

  const brand = ramp(H, Math.max(C, 0.09));
  // Brand-TINTED neutrals, not flat grey: at this chroma the hue is barely
  // perceptible but keeps surfaces coherent with the brand.
  const neutral = ramp(H, 0.016);
  const semanticRamps: Record<string, Ramp> = {};
  for (const [name, hue] of Object.entries(SEMANTIC_HUES)) {
    semanticRamps[name] = ramp(hue, 0.115);
  }

  const semantic: Palette["semantic"] = {};
  const checks: ContrastCheck[] = [];

  const check = (
    theme: ThemeName,
    pair: string,
    fg: string,
    bg: string,
    target: number,
    drift = 0,
  ): void => {
    const r2 = ratio(fg, bg);
    checks.push({
      theme,
      pair,
      fg,
      bg,
      target,
      ratio: Math.round(r2 * 100) / 100,
      pass: r2 >= target,
      drift,
      drifted: drift > DRIFT_LIMIT,
    });
  };

  for (const theme of THEMES[mode]) {
    const dark = theme === "dark";
    const t: Record<string, string> = {};

    t["bg-0"] = dark ? (neutral[950] as string) : "#FFFFFF";
    t["bg-1"] = dark ? (neutral[900] as string) : (neutral[50] as string);
    t["bg-2"] = dark ? (neutral[800] as string) : (neutral[100] as string);

    const fg0 = pick(neutral, t["bg-0"], text, dark ? 50 : 950);
    t["fg-0"] = fg0.hex;
    check(theme, "fg-0 on bg-0", fg0.hex, t["bg-0"], text, fg0.drift);
    check(theme, "fg-0 on bg-1", fg0.hex, t["bg-1"], text);

    const fg1 = pick(neutral, t["bg-0"], text, dark ? 300 : 700);
    t["fg-1"] = fg1.hex;
    check(theme, "fg-1 on bg-0", fg1.hex, t["bg-0"], text, fg1.drift);

    const border = pick(neutral, t["bg-0"], ui, dark ? 700 : 300);
    t["border"] = border.hex;
    check(theme, "border on bg-0", border.hex, t["bg-0"], ui, border.drift);
    t["divider"] = dark ? (neutral[800] as string) : (neutral[200] as string);

    // The accent FILL carries a text label, so it must reach the TEXT target.
    // At AA the preferred step is kept exactly as generate_palette.py keeps it.
    // Above AA the fill moves away from the surface (darker in light, lighter in
    // dark) until its label passes; the move is recorded as drift.
    const preferredAccent = dark ? 400 : 600;
    let accentStep = preferredAccent;
    if (text > AA_PALETTE_CONTRAST.text) {
      const direction = dark ? -1 : 1;
      let index = STEP_ORDER.indexOf(preferredAccent);
      while (
        labelOn(brand[STEP_ORDER[index] as number] as string).ratio < text &&
        index + direction >= 0 &&
        index + direction < STEP_ORDER.length
      ) {
        index += direction;
      }
      accentStep = STEP_ORDER[index] as number;
    }
    const accentIndex = STEP_ORDER.indexOf(accentStep);
    const accentDrift = Math.abs(accentIndex - STEP_ORDER.indexOf(preferredAccent));
    const shade = (offset: number) =>
      brand[STEP_ORDER[Math.max(0, Math.min(STEP_ORDER.length - 1, accentIndex + (dark ? -offset : offset)))] as number] as string;
    t["accent-1"] = brand[accentStep] as string;
    t["accent-1-hover"] = shade(1);
    t["accent-1-active"] = shade(2);
    t["accent-1-disabled"] = dark ? (neutral[700] as string) : (neutral[300] as string);

    const on = labelOn(t["accent-1"]);
    t["accent-1-on"] = on.hex;
    check(theme, "accent-1-on on accent-1", on.hex, t["accent-1"], text, accentDrift);

    const accentText = pick(brand, t["bg-0"], text, dark ? 300 : 700);
    t["accent-1-text"] = accentText.hex;
    check(theme, "accent-1-text on bg-0", accentText.hex, t["bg-0"], text, accentText.drift);

    t["accent-2"] = dark ? (brand[600] as string) : (brand[400] as string);
    const accent2Text = pick(brand, t["bg-1"], text, dark ? 200 : 800);
    t["accent-2-text"] = accent2Text.hex;
    check(theme, "accent-2-text on bg-1", accent2Text.hex, t["bg-1"], text, accent2Text.drift);

    const focus = pick(brand, t["bg-0"], ui, dark ? 300 : 600);
    t["focus-ring"] = focus.hex;
    check(theme, "focus-ring on bg-0", focus.hex, t["bg-0"], ui, focus.drift);

    // Shadow inverts in KIND: a black shadow tuned for light is invisible on dark.
    t["shadow"] = dark ? "0 1px 3px rgb(0 0 0 / 0.45)" : "0 1px 3px rgb(0 0 0 / 0.12)";

    for (const name of Object.keys(SEMANTIC_HUES)) {
      const sr = semanticRamps[name] as Ramp;
      const fill = dark ? (sr[400] as string) : (sr[600] as string);
      const surface = dark ? (sr[950] as string) : (sr[50] as string);
      t[name] = fill;
      t[`${name}-bg`] = surface;
      const label = pick(sr, surface, text, dark ? 200 : 800);
      t[`${name}-on`] = label.hex;
      check(theme, `${name}-on on ${name}-bg`, label.hex, surface, text, label.drift);
      check(theme, `${name} on bg-0`, fill, t["bg-0"] as string, ui);
    }

    semantic[theme] = t;
  }

  return {
    seed,
    mode,
    oklch: { L, C, H },
    primitives: { brand, neutral, ...Object.fromEntries(Object.entries(semanticRamps).map(([k, v]) => [`sem-${k}`, v])) },
    semantic,
    checks,
  };
}

/** Emit the L2 tokens as CSS custom properties — directly implementation-consumable. */
export function paletteToCssCustomProperties(
  palette: Palette,
): Partial<Record<ThemeName, Record<string, string>>> {
  const out: Partial<Record<ThemeName, Record<string, string>>> = {};
  for (const [theme, tokens] of Object.entries(palette.semantic)) {
    if (!tokens) continue;
    const props: Record<string, string> = {};
    for (const [name, value] of Object.entries(tokens)) {
      props[`--color-${name}`] = value;
    }
    out[theme as ThemeName] = props;
  }
  return out;
}

export interface PaletteVerdict {
  failures: ContrastCheck[];
  drifted: ContrastCheck[];
  /** True when every measured pair clears its target. */
  pass: boolean;
  /** Token parity across themes — DUAL only. A missing counterpart is a FAIL. */
  tokenParity: { checked: boolean; missing: string[] };
}

export function verifyPalette(palette: Palette): PaletteVerdict {
  const failures = palette.checks.filter((c) => !c.pass);
  const drifted = palette.checks.filter((c) => c.drifted);

  const themes = Object.keys(palette.semantic) as ThemeName[];
  const missing: string[] = [];
  let checked = false;
  if (themes.length === 2) {
    checked = true;
    const [a, b] = themes as [ThemeName, ThemeName];
    const aTokens = new Set(Object.keys(palette.semantic[a] ?? {}));
    const bTokens = new Set(Object.keys(palette.semantic[b] ?? {}));
    for (const token of aTokens) if (!bTokens.has(token)) missing.push(`${token} missing in ${b}`);
    for (const token of bTokens) if (!aTokens.has(token)) missing.push(`${token} missing in ${a}`);
  }

  return {
    failures,
    drifted,
    pass: failures.length === 0 && missing.length === 0,
    tokenParity: { checked, missing },
  };
}
