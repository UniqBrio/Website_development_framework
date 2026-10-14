/**
 * DESIGN TOKEN CONTRACT — P1 capability 2.
 *
 * PREVIOUS LIMITATION: `color`, `typography`, `spacing` and `grid` were
 * DOCUMENTATION ONLY. DD-019 set `color.tokenSystem` to the string
 * `"semantic_tokens_derived_from_one_seed"` and nothing produced a value, so a
 * page could reach implementation with "design tokens are required" and no
 * tokens.
 *
 * AUTHORITY: colour derivation is the ported generate_palette.py algorithm
 * (color_system.md). Breakpoints and container ranges are read from
 * `src/responsive/capabilities.ts` RANGES rather than restated, because a
 * breakpoint written twice drifts — the same rule README rule 9 states.
 *
 * NO SILENT FALLBACK: every token group records how it was obtained, and a
 * substituted group says what it is substituting for and what would replace it.
 */
import type { BusinessInput } from "../../design-intelligence/types/business-input.js";
import type { DesignContextProfile } from "../../design-intelligence/types/profile.js";
import { RANGES, type RangeName } from "../../responsive/capabilities.js";
import { thresholdsFor } from "../../accessibility/evaluate.js";
import {
  buildPalette,
  paletteToCssCustomProperties,
  verifyPalette,
  type ContrastCheck,
  type Palette,
  type ThemeMode,
  type ThemeName,
} from "./palette.js";

/**
 * How a token group was obtained. Mirrors the SEO artifact vocabulary so the two
 * read the same way, and both defer to content/confidence.ts for what may ship.
 */
export type TokenProvenance =
  /** Derived from a supplied brand fact (a seed, a font name). */
  | "brand_derived"
  /** A neutral system standing in for an absent brand fact. §J.2 permits this. */
  | "neutral_substitute"
  /** Computed from the design context; asserts nothing about the brand. */
  | "derived_from_context"
  /** A framework default the owner has not chosen. */
  | "unchosen_default";

export interface TokenGroup<T> {
  values: T;
  provenance: TokenProvenance;
  source: string;
  /** Set when a real brand fact would replace this. */
  substituting?: { for: string; needs: string };
}

export interface ColorTokens {
  mode: ThemeMode;
  seed: string;
  /** L1 primitive ramps. Components must NEVER consume these. */
  primitives: Record<string, Record<number, string>>;
  /** L2 semantic tokens per active theme. The ONLY layer components consume. */
  semantic: Partial<Record<ThemeName, Record<string, string>>>;
  /** Implementation-consumable CSS custom properties per theme. */
  cssCustomProperties: Partial<Record<ThemeName, Record<string, string>>>;
  /** The measured contrast table. This IS the Gate 5 artifact. */
  contrast: ContrastCheck[];
  contrastFailures: ContrastCheck[];
  drifted: ContrastCheck[];
  tokenParity: { checked: boolean; missing: string[] };
}

export interface TypographyTokens {
  fontHeading: string;
  fontBody: string;
  /** Fluid clamp scale per role — DD-021's bounded scale, never raw viewport units. */
  scale: Record<string, string>;
  lineHeight: Record<string, string>;
  weight: Record<string, number>;
  /** DD-022's reading measure. */
  readingMeasure: string;
  loading: string;
}

export interface SpacingTokens {
  base: number;
  scale: Record<string, string>;
}

export interface RadiusTokens {
  scale: Record<string, string>;
}

export interface LayoutTokens {
  /** Container max-widths keyed by the SAME range names the responsive engine uses. */
  containers: Record<RangeName, string>;
  /** Breakpoint minimums, read from RANGES — never restated. */
  breakpoints: Record<RangeName, string>;
  gutters: Record<string, string>;
  columns: Record<RangeName, number>;
}

export interface MotionTokens {
  /** Empty when the motion cap forbids motion beyond instant state changes. */
  duration: Record<string, string>;
  easing: Record<string, string>;
  /** The reduced-motion contract every animated token inherits. */
  reducedMotion: string;
  cap: string;
}

export interface DesignTokenContract {
  color: TokenGroup<ColorTokens>;
  typography: TokenGroup<TypographyTokens>;
  spacing: TokenGroup<SpacingTokens>;
  radius: TokenGroup<RadiusTokens>;
  layout: TokenGroup<LayoutTokens>;
  motion: TokenGroup<MotionTokens>;
  /** Brand facts that would improve the tokens, with what is needed. */
  unresolved: Array<{ group: string; needs: string; currentlyUsing: string }>;
  /** True when no contrast pair fails and token parity holds. */
  valid: boolean;
  /** Everything blocking a clean token set. */
  problems: string[];
}

/**
 * The neutral seed used when no brand colour is available.
 *
 * §J.2: a missing brand palette is replaced by an "accessible neutral token
 * system" — explicitly permitted, because a neutral ramp asserts nothing about
 * the business. The hue below is immaterial: the neutral ramp is generated at
 * chroma 0.016, where hue is not perceptible, so this value claims no brand
 * identity. It exists only because the derivation needs a numeric input.
 */
const NEUTRAL_SEED = "#5A5F6A";

interface SeedDecision {
  seed: string;
  provenance: TokenProvenance;
  source: string;
  substituting?: { for: string; needs: string };
}

/**
 * Three-way honesty about the brand seed. Note that ALL THREE produce usable
 * tokens: §J.2 requires a neutral system rather than an empty one, so
 * "no page reaches implementation without token values" holds in every branch.
 */
export function decideSeed(input: BusinessInput): SeedDecision {
  const stated = input.constraints?.brandSeed;
  if (stated) {
    return {
      seed: stated,
      provenance: "brand_derived",
      source: `derived from the supplied brand seed ${stated} (color_system.md: ONE seed drives the system)`,
    };
  }
  const status = input.availableAssets.brandColors;
  if (status === "verified_available" || status === "provided_unverified" || status === "partial") {
    return {
      seed: NEUTRAL_SEED,
      provenance: "neutral_substitute",
      source: `brand colours are recorded as "${status}" but no seed VALUE was supplied, so the system cannot be brand-derived; a neutral accessible system ships in the meantime (§J.2)`,
      substituting: {
        for: "the real brand colour",
        needs: "constraints.brandSeed (a single hex; changing it regenerates every token)",
      },
    };
  }
  return {
    seed: NEUTRAL_SEED,
    provenance: "neutral_substitute",
    source:
      "no brand colours exist; §J.2 replaces them with an accessible neutral token system rather than inventing a palette",
    substituting: {
      for: "a brand palette",
      needs: "constraints.brandSeed, once the business has chosen one",
    },
  };
}

/**
 * theme_system.md: "SINGLE-DARK — DEFAULT for a new site" and "A site is
 * SINGLE-DARK unless the owner says otherwise." THE home for that default in code.
 * DEFECT this fixes (first customer dry run): the code defaulted to SINGLE-LIGHT
 * and its explanation claimed theme_system.md had no default — two authorities
 * disagreeing, with the code misquoting the document.
 */
export const DEFAULT_THEME_MODE: ThemeMode = "SINGLE-DARK";

function decideThemeMode(input: BusinessInput): { mode: ThemeMode; provenance: TokenProvenance; source: string } {
  const stated = input.constraints?.themeMode;
  if (stated) {
    return {
      mode: stated,
      provenance: "brand_derived",
      source: `stated theme mode "${stated}"`,
    };
  }
  return {
    mode: DEFAULT_THEME_MODE,
    provenance: "unchosen_default",
    // The documented default applies, and it is recorded as UNCHOSEN so the owner
    // confirms it rather than the framework pretending a choice was made.
    source: `theme mode was not stated, so theme_system.md's default for a new site (${DEFAULT_THEME_MODE}) applies — recorded as UNCHOSEN for the owner to confirm; DUAL doubles the tokens, assets and evidence and must be opted into`,
  };
}

function typographyFor(
  input: BusinessInput,
  profile: DesignContextProfile,
): TokenGroup<TypographyTokens> {
  const heading = input.constraints?.brandFontHeading;
  const body = input.constraints?.brandFontBody;
  const systemStack =
    "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  // Density and literacy set the body size floor, not taste: a low-literacy,
  // mobile-dominant audience reads a larger minimum.
  const bodyMin = profile.variables.audience_digital_literacy === "low" ? 1.0625 : 1.0;
  const dense = profile.variables.information_density === "high";

  const values: TypographyTokens = {
    fontHeading: heading ?? systemStack,
    fontBody: body ?? systemStack,
    scale: {
      // DD-021: clamped, so it is readable at both extremes.
      "display": "clamp(2.25rem, 1.5rem + 3vw, 3.75rem)",
      "h1": "clamp(1.875rem, 1.35rem + 2.2vw, 3rem)",
      "h2": "clamp(1.5rem, 1.2rem + 1.4vw, 2.25rem)",
      "h3": "clamp(1.25rem, 1.1rem + 0.7vw, 1.5rem)",
      "body": `clamp(${bodyMin}rem, 0.98rem + 0.2vw, 1.125rem)`,
      "small": "clamp(0.875rem, 0.85rem + 0.1vw, 0.9375rem)",
      "mono": "0.9375rem",
    },
    lineHeight: {
      display: "1.05",
      heading: "1.2",
      body: dense ? "1.55" : "1.65",
      tight: "1.35",
    },
    weight: { regular: 400, medium: 500, semibold: 600, bold: 700 },
    // DD-022 reading measure.
    readingMeasure: dense ? "68ch" : "72ch",
    // States what the generated CSS actually does: it names families and loads no
    // font file (customer dry run 2026-09-14: this said "next/font", which no
    // layer emits — the same false-authority class as the stack names).
    loading:
      heading || body
        ? "family names only; the generator loads no font file, so the supplied families render only where installed until the host self-hosts them"
        : "system font stack; no font file and no network request",
  };

  if (heading || body) {
    return {
      values,
      provenance: "brand_derived",
      source: `supplied brand fonts (heading: ${heading ?? "not supplied"}, body: ${body ?? "not supplied"})`,
    };
  }
  return {
    values,
    provenance: "neutral_substitute",
    source:
      "no brand fonts supplied; a system stack ships, which asserts no brand identity and costs no network request",
    substituting: {
      for: "brand typefaces",
      needs: "constraints.brandFontHeading / brandFontBody",
    },
  };
}

function spacingFor(profile: DesignContextProfile): TokenGroup<SpacingTokens> {
  const base = 4;
  const steps = [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32];
  const scale: Record<string, string> = {};
  for (const step of steps) scale[String(step)] = `${step * base}px`;
  return {
    values: { base, scale },
    provenance: "derived_from_context",
    source: `a ${base}px base scale; ${steps.length} steps, so no component needs an off-scale value`,
  };
}

function radiusFor(profile: DesignContextProfile): TokenGroup<RadiusTokens> {
  return {
    values: {
      scale: {
        none: "0px",
        sm: "2px",
        md: "6px",
        lg: "10px",
        xl: "16px",
        full: "9999px",
      },
    },
    provenance: "derived_from_context",
    source: "a fixed radius scale; any rule capping expression constrains which steps are used, not the scale itself",
  };
}

function layoutFor(profile: DesignContextProfile): TokenGroup<LayoutTokens> {
  // Breakpoints come from the responsive engine's RANGES. Restating them here is
  // exactly the drift README rule 9 forbids.
  const breakpoints = {} as Record<RangeName, string>;
  const containers = {} as Record<RangeName, string>;
  const columns = {} as Record<RangeName, number>;
  const containerMax: Record<RangeName, string> = {
    compact: "100%",
    medium: "100%",
    expanded: "1080px",
    large: "1200px",
    extra_large: "1320px",
  };
  const columnCount: Record<RangeName, number> = {
    compact: 1,
    medium: 2,
    expanded: 8,
    large: 12,
    extra_large: 12,
  };
  for (const name of Object.keys(RANGES) as RangeName[]) {
    breakpoints[name] = `${RANGES[name].min}px`;
    containers[name] = containerMax[name];
    columns[name] = columnCount[name];
  }
  return {
    values: {
      containers,
      breakpoints,
      gutters: { compact: "16px", medium: "20px", expanded: "24px", large: "32px" },
      columns,
    },
    provenance: "derived_from_context",
    source:
      "breakpoint minimums read from responsive/capabilities.ts RANGES (Material 3), so the token set and the responsive engine cannot disagree",
  };
}

function motionFor(profile: DesignContextProfile, motionCap: string): TokenGroup<MotionTokens> {
  const minimal = motionCap === "none" || motionCap === "minimal";
  const values: MotionTokens = {
    duration: minimal
      ? { instant: "0ms", state: "120ms" }
      : { instant: "0ms", state: "120ms", enter: "220ms", exit: "160ms", deliberate: "320ms" },
    easing: {
      standard: "cubic-bezier(0.2, 0, 0, 1)",
      decelerate: "cubic-bezier(0, 0, 0, 1)",
      accelerate: "cubic-bezier(0.3, 0, 1, 1)",
    },
    reducedMotion:
      "every duration collapses to 0ms under prefers-reduced-motion, and the static form must lose no information (DD-047)",
    cap: motionCap,
  };
  return {
    values,
    provenance: "derived_from_context",
    source: minimal
      ? `motion cap "${motionCap}" permits only instant and state-change durations; entrance and scroll durations are withheld`
      : `motion cap "${motionCap}"`,
  };
}

export function buildTokenContract(
  input: BusinessInput,
  profile: DesignContextProfile,
  motionCap: string,
): DesignTokenContract {
  const seedDecision = decideSeed(input);
  const themeDecision = decideThemeMode(input);

  // The REQUESTED accessibility target drives the palette, from the same
  // thresholds the evaluator enforces — one authority for the numbers.
  const target = thresholdsFor(profile.variables.accessibility_requirement);
  const palette: Palette = buildPalette(seedDecision.seed, themeDecision.mode, {
    text: target.bodyText,
    ui: target.uiBoundaries,
  });
  const verdict = verifyPalette(palette);

  const colorGroup: TokenGroup<ColorTokens> = {
    values: {
      mode: palette.mode,
      seed: palette.seed,
      primitives: palette.primitives,
      semantic: palette.semantic,
      cssCustomProperties: paletteToCssCustomProperties(palette),
      contrast: palette.checks,
      contrastFailures: verdict.failures,
      drifted: verdict.drifted,
      tokenParity: verdict.tokenParity,
    },
    provenance: seedDecision.provenance,
    source: `${seedDecision.source}. Theme: ${themeDecision.source}`,
  };
  if (seedDecision.substituting) colorGroup.substituting = seedDecision.substituting;

  const typography = typographyFor(input, profile);
  const spacing = spacingFor(profile);
  const radius = radiusFor(profile);
  const layout = layoutFor(profile);
  const motion = motionFor(profile, motionCap);

  const unresolved: DesignTokenContract["unresolved"] = [];
  for (const [group, entry] of Object.entries({ color: colorGroup, typography, spacing, radius, layout, motion })) {
    const sub = (entry as TokenGroup<unknown>).substituting;
    if (sub) {
      unresolved.push({ group, needs: sub.needs, currentlyUsing: `neutral substitute for ${sub.for}` });
    }
  }

  const problems: string[] = [];
  for (const failure of verdict.failures) {
    problems.push(
      `contrast FAIL ${failure.theme} ${failure.pair}: ${failure.ratio}:1 against a ${failure.target}:1 target`,
    );
  }
  for (const drift of verdict.drifted) {
    problems.push(
      `DRIFT ${drift.theme} ${drift.pair}: correction moved ${drift.drift} ramp steps, so the shade no longer reads as the seed — owner decision required (color_system.md)`,
    );
  }
  for (const missing of verdict.tokenParity.missing) {
    problems.push(`token parity FAIL: ${missing}`);
  }
  if (themeDecision.provenance === "unchosen_default") {
    problems.push(
      "theme mode is an UNCHOSEN default — theme_system.md's SINGLE-DARK default applies until the owner confirms or changes it before launch",
    );
  }

  return {
    color: colorGroup,
    typography,
    spacing,
    radius,
    layout,
    motion,
    unresolved,
    valid: verdict.pass,
    problems,
  };
}
