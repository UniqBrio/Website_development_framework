/**
 * Responsive capability context — specification §11, appendix F.
 *
 * §11 is emphatic that responsive design must be CAPABILITY-aware, not
 * desktop/tablet/mobile. A fine-pointer 700px window and a coarse-pointer 700px
 * tablet need different affordances at the same width, which a width-only model
 * cannot express.
 */

/**
 * Minimum touch target on coarse pointers, in CSS px. THE home for this number:
 * responsive_matrix.md RF-006 ("bounding box >=44x44 for every interactive element
 * at mobile profiles") and interrogation Q5 ("primary CTA ... >=44px tap target").
 * Stricter than WCAG 2.5.8 AA (24px), which stays the evaluator's AA policy.
 * DEFECT this fixes (first customer dry run): an AA site's stylesheet emitted a
 * 24px minimum everywhere, below the workflow's own mobile gate.
 */
export const TOUCH_TARGET_CSS_PX = 44;

/** §F.1 ranges, from Material Design 3 breakpoints. */
export const RANGES = {
  compact: { min: 0, max: 599 },
  medium: { min: 600, max: 839 },
  expanded: { min: 840, max: 1199 },
  large: { min: 1200, max: 1599 },
  extra_large: { min: 1600, max: Number.POSITIVE_INFINITY },
} as const;

export type RangeName = keyof typeof RANGES;

export function rangeForWidth(cssPx: number): RangeName {
  for (const [name, bounds] of Object.entries(RANGES) as Array<[RangeName, { min: number; max: number }]>) {
    if (cssPx >= bounds.min && cssPx <= bounds.max) return name;
  }
  return "extra_large";
}

/**
 * Every capability §11 lists as a decision input. All optional except width,
 * because an unknown capability must be handled as "assume the less capable
 * case", not "assume desktop".
 *
 * DD-064: this is the capability model — viewport, container, pointer, hover,
 * reduced motion, zoom, orientation, safe area, keyboard, foldable segments —
 * and no device name appears anywhere in it. DD-071: orientation is a first-
 * class input and `MANDATORY_TEST_PROFILES` includes a landscape profile.
 */
export interface CapabilityContext {
  viewportWidthCssPx: number;
  /** Container width, for component-level decisions (§11 container queries). */
  containerWidthCssPx?: number;
  pointer: "fine" | "coarse" | "none";
  hover: boolean;
  reducedMotion: boolean;
  reducedData: boolean;
  colorScheme: "light" | "dark";
  prefersContrast: "no-preference" | "more" | "less";
  forcedColors: boolean;
  safeAreaInsets: boolean;
  /** Visual viewport shrunk by a software keyboard. */
  keyboardVisible: boolean;
  foldableSegments: number;
  orientation: "portrait" | "landscape";
  /** 400% browser zoom, which §F.3 requires testing. */
  zoomPercent: number;
}

/**
 * The conservative default. Note pointer: "coarse" and hover: false — assuming
 * a mouse is what produces hover-only interfaces, so the default assumes the
 * harder case and lets evidence relax it.
 */
export function defaultCapabilities(overrides: Partial<CapabilityContext> = {}): CapabilityContext {
  return {
    viewportWidthCssPx: 320,
    pointer: "coarse",
    hover: false,
    reducedMotion: false,
    reducedData: false,
    colorScheme: "light",
    prefersContrast: "no-preference",
    forcedColors: false,
    safeAreaInsets: true,
    keyboardVisible: false,
    foldableSegments: 1,
    orientation: "portrait",
    zoomPercent: 100,
    ...overrides,
  };
}

/** §F.3 must_test, as executable profiles. */
export const MANDATORY_TEST_PROFILES: ReadonlyArray<{ name: string; capabilities: CapabilityContext }> = [
  { name: "320_css_px", capabilities: defaultCapabilities({ viewportWidthCssPx: 320 }) },
  {
    name: "400_percent_zoom",
    // 400% zoom on a 1280px screen presents as a ~320px viewport.
    capabilities: defaultCapabilities({ viewportWidthCssPx: 320, zoomPercent: 400, pointer: "fine", hover: true }),
  },
  { name: "compact", capabilities: defaultCapabilities({ viewportWidthCssPx: 390 }) },
  { name: "medium", capabilities: defaultCapabilities({ viewportWidthCssPx: 768 }) },
  {
    name: "expanded",
    capabilities: defaultCapabilities({ viewportWidthCssPx: 1024, pointer: "fine", hover: true }),
  },
  {
    name: "large",
    capabilities: defaultCapabilities({ viewportWidthCssPx: 1280, pointer: "fine", hover: true }),
  },
  {
    name: "extra_large",
    capabilities: defaultCapabilities({ viewportWidthCssPx: 1600, pointer: "fine", hover: true }),
  },
  {
    name: "landscape_mobile",
    capabilities: defaultCapabilities({ viewportWidthCssPx: 740, orientation: "landscape" }),
  },
  {
    name: "narrow_desktop_split_window",
    capabilities: defaultCapabilities({ viewportWidthCssPx: 640, pointer: "fine", hover: true }),
  },
  {
    name: "coarse_pointer_no_hover",
    capabilities: defaultCapabilities({ viewportWidthCssPx: 834, pointer: "coarse", hover: false }),
  },
  {
    name: "fine_pointer_hover",
    capabilities: defaultCapabilities({ viewportWidthCssPx: 1280, pointer: "fine", hover: true }),
  },
  { name: "reduced_motion", capabilities: defaultCapabilities({ reducedMotion: true }) },
  { name: "safe_area_insets", capabilities: defaultCapabilities({ safeAreaInsets: true }) },
  { name: "software_keyboard_visible", capabilities: defaultCapabilities({ keyboardVisible: true }) },
  { name: "reduced_data", capabilities: defaultCapabilities({ reducedData: true }) },
  { name: "forced_colors", capabilities: defaultCapabilities({ forcedColors: true }) },
  {
    // DD-073. A two-segment foldable presented as one wide viewport with a
    // hinge; the transformation engine must keep essential content out of it.
    name: "foldable_two_segments",
    capabilities: defaultCapabilities({
      viewportWidthCssPx: 720,
      foldableSegments: 2,
      pointer: "coarse",
      hover: false,
    }),
  },
];
