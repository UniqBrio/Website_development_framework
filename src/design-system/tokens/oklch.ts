/**
 * OKLCH colour maths — a FAITHFUL PORT of website_workflow/tools/generate_palette.py.
 *
 * That script is the authority named by website_workflow/color_system.md. This is
 * a port, not a second algorithm: the coefficients, the step table, the chroma
 * taper, the correction search and the label-on measurement are all transcribed
 * rather than reinvented. `tests/scenarios/tokens.test.ts` proves parity by
 * executing the Python and comparing every emitted value, so the two cannot
 * drift silently.
 *
 * Why a port at all: the pipeline is a TypeScript library and must be able to
 * produce tokens without shelling out to an interpreter it cannot guarantee. The
 * script remains the CLI the markdown workflow already documents.
 */

/** sRGB -> linear. */
function s2l(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** linear -> sRGB. */
function l2s(c: number): number {
  const x = Math.max(0, Math.min(1, c));
  return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
}

export function hex2rgb(hex: string): [number, number, number] {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) {
    h = h
      .split("")
      .map((ch) => ch + ch)
      .join("");
  }
  if (h.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(h)) {
    throw new Error(`bad hex: ${hex}`);
  }
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}

export function rgb2hex(r: number, g: number, b: number): string {
  const part = (x: number) =>
    Math.round(Math.max(0, Math.min(1, x)) * 255)
      .toString(16)
      .toUpperCase()
      .padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

export interface Oklch {
  L: number;
  C: number;
  H: number;
}

export function rgb2oklch(rIn: number, gIn: number, bIn: number): Oklch {
  const r = s2l(rIn);
  const g = s2l(gIn);
  const b = s2l(bIn);
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const cbrt = (x: number) => (x >= 0 ? Math.cbrt(x) : -Math.cbrt(-x));
  const l_ = cbrt(l);
  const m_ = cbrt(m);
  const s_ = cbrt(s);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  const H = ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
  return { L, C: Math.hypot(A, B), H };
}

export function oklch2hex(L: number, C: number, H: number): string {
  const rad = (H * Math.PI) / 180;
  const A = C * Math.cos(rad);
  const B = C * Math.sin(rad);
  const l_ = L + 0.3963377774 * A + 0.2158037573 * B;
  const m_ = L - 0.1055613458 * A - 0.0638541728 * B;
  const s_ = L - 0.0894841775 * A - 1.291485548 * B;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const b = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  return rgb2hex(l2s(r), l2s(g), l2s(b));
}

export function luminance(hex: string): number {
  const [r, g, b] = hex2rgb(hex).map(s2l) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio. The measurement every threshold in this framework uses. */
export function ratio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/** The ramp lightness table, transcribed from `STEPS`. */
export const STEPS: Readonly<Record<number, number>> = {
  50: 0.972,
  100: 0.936,
  200: 0.87,
  300: 0.788,
  400: 0.7,
  500: 0.62,
  600: 0.535,
  700: 0.452,
  800: 0.372,
  900: 0.288,
  950: 0.205,
};

export const STEP_ORDER: readonly number[] = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

export type Ramp = Record<number, string>;

/**
 * L-stepped ramp at fixed hue; chroma tapers toward both ends so the
 * lightest/darkest steps do not turn neon or muddy.
 */
export function ramp(hue: number, chroma: number, taper = 0.55): Ramp {
  const out: Ramp = {};
  for (const key of STEP_ORDER) {
    const L = STEPS[key] as number;
    const t = 1 - (Math.abs(L - 0.62) / 0.62) * taper;
    out[key] = oklch2hex(L, Math.max(0.012, chroma * t), hue);
  }
  return out;
}

export interface PickResult {
  /** Ramp step chosen, or `null` when a black/white fallback was needed. */
  step: number | null;
  hex: string;
  ratio: number;
  /** How many ramp steps the correction moved. 99 means a fallback was used. */
  drift: number;
}

/**
 * Nearest ramp step to `prefer` that clears `target` against `surface`.
 *
 * Drift is the real risk, not failure: correction almost always finds SOME
 * passing step, but a token dragged several steps from its intended shade stops
 * reading as the brand. Surfacing drift is what keeps the auto-correction honest.
 */
export function pick(rmp: Ramp, surface: string, target: number, prefer: number): PickResult {
  const preferIndex = STEP_ORDER.indexOf(prefer);
  const ok = STEP_ORDER.map((step) => ({
    step,
    hex: rmp[step] as string,
    r: ratio(rmp[step] as string, surface),
  })).filter((candidate) => candidate.r >= target);

  if (ok.length > 0) {
    let best = ok[0] as { step: number; hex: string; r: number };
    let bestDistance = Math.abs(STEP_ORDER.indexOf(best.step) - preferIndex);
    for (const candidate of ok.slice(1)) {
      const distance = Math.abs(STEP_ORDER.indexOf(candidate.step) - preferIndex);
      if (distance < bestDistance) {
        best = candidate;
        bestDistance = distance;
      }
    }
    return { step: best.step, hex: best.hex, ratio: best.r, drift: bestDistance };
  }

  for (const fallback of ["#FFFFFF", "#000000"]) {
    if (ratio(fallback, surface) >= target) {
      return { step: null, hex: fallback, ratio: ratio(fallback, surface), drift: 99 };
    }
  }

  let worst = { step: STEP_ORDER[0] as number, hex: rmp[STEP_ORDER[0] as number] as string };
  let worstRatio = ratio(worst.hex, surface);
  for (const step of STEP_ORDER) {
    const candidateRatio = ratio(rmp[step] as string, surface);
    if (candidateRatio > worstRatio) {
      worst = { step, hex: rmp[step] as string };
      worstRatio = candidateRatio;
    }
  }
  return { step: worst.step, hex: worst.hex, ratio: worstRatio, drift: 99 };
}

/**
 * Text colour to sit ON a filled surface — measured, never assumed. This is
 * `{ACCENT_1_ON}`: the most important text on the page, and the token whose
 * absence produced a 2.98:1 CTA label in an approved plan.
 */
export function labelOn(fill: string): { hex: string; ratio: number } {
  const white = ratio(fill, "#FFFFFF");
  const black = ratio(fill, "#111111");
  return white >= black ? { hex: "#FFFFFF", ratio: white } : { hex: "#111111", ratio: black };
}

export const SEMANTIC_HUES: Readonly<Record<string, number>> = {
  success: 148.0,
  warning: 75.0,
  error: 27.0,
  info: 248.0,
};

/** Beyond this many steps of correction, the shade stops reading as intended. */
export const DRIFT_LIMIT = 2;
