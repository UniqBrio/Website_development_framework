/**
 * RAW HOST EVIDENCE — the contract of the host → core transition.
 *
 * A generated host project runs `host/validate.mjs` inside itself. That script
 * collects RAW FACTS ONLY — exit codes, served documents, byte counts, axe
 * results, DOM measurements, performance entries — and writes them to
 * `host/evidence/raw-host-evidence.json`. It makes no pass/fail decision.
 *
 * The core parses that file against this schema before it is allowed to become
 * evidence. A malformed or partial file fails here, loudly, rather than turning
 * into a quiet pass further down. Policy (what counts as a pass) stays in the
 * core: `host/host-evidence.ts` maps facts to observations, and the existing
 * evaluators decide.
 */
import { z } from "zod";

const stepSchema = z.object({
  ran: z.boolean(),
  exitCode: z.number().nullable(),
  durationMs: z.number(),
  outputTail: z.string(),
});
export type RawStep = z.infer<typeof stepSchema>;

const scriptSchema = z.object({
  src: z.string(),
  status: z.number(),
  bytes: z.number(),
  gzipBytes: z.number(),
});

const routeSchema = z.object({
  route: z.string(),
  status: z.number(),
  html: z.string(),
  scripts: z.array(scriptSchema),
  inlineScriptBytes: z.number(),
});

const contrastSampleSchema = z.object({
  rule: z.string(),
  ratio: z.number(),
  fontSizePx: z.number(),
  bold: z.boolean(),
  target: z.string(),
  outcome: z.enum(["pass", "violation"]),
});

const pageAuditSchema = z.object({
  route: z.string(),
  /** Each console error with the URL the browser attributed it to. */
  consoleErrors: z.array(z.object({ text: z.string(), url: z.string() })),
  /** Icon links the page itself declares, so an implicit favicon request is identifiable. */
  declaredIcons: z.array(z.string()),
  /**
   * Whether anything the SITE controls asks for /favicon.ico. Only when all three
   * are false can a favicon 404 be classified as browser-automatic.
   */
  faviconEvidence: z.object({
    pageInitiatedRequest: z.boolean(),
    htmlReference: z.boolean(),
    scriptReference: z.boolean(),
  }),
  pageErrors: z.array(z.string()),
  axe: z.object({
    version: z.string(),
    violations: z.array(
      z.object({
        id: z.string(),
        impact: z.string().nullable(),
        tags: z.array(z.string()),
        help: z.string(),
        nodes: z.array(z.object({ target: z.string(), summary: z.string() })),
      }),
    ),
    incomplete: z.array(z.object({ id: z.string(), tags: z.array(z.string()), nodeCount: z.number() })),
    passes: z.array(z.object({ id: z.string(), nodeCount: z.number() })),
  }),
  contrast: z.array(contrastSampleSchema),
  keyboard: z.object({
    focusableCount: z.number(),
    reachedCount: z.number(),
    unreachable: z.array(z.string()),
    stops: z.array(
      z.object({ target: z.string(), outlineVisible: z.boolean(), obscured: z.boolean(), inViewport: z.boolean() }),
    ),
    completedCycle: z.boolean(),
  }),
  targets: z.array(z.object({ target: z.string(), width: z.number(), height: z.number(), inlineInText: z.boolean() })),
  reflow: z.object({
    narrowViewportCssPx: z.number(),
    scrollWidth: z.number(),
    clientWidth: z.number(),
    narrowTextLength: z.number(),
    wideTextLength: z.number(),
  }),
  motion: z.object({
    reduce: z.object({ longestTransitionMs: z.number(), longestAnimationMs: z.number(), runningAnimations: z.number() }),
    noPreference: z.object({ longestTransitionMs: z.number(), longestAnimationMs: z.number(), runningAnimations: z.number() }),
  }),
  pointer: z.object({
    draggableCount: z.number(),
    webglContexts: z.number(),
    deviceMotionListeners: z.number(),
    nonNativeInteractiveWithoutTabindex: z.number(),
    hoverChecked: z.number(),
    hoverRevealed: z.array(z.string()),
  }),
  media: z.object({ img: z.number(), video: z.number(), audio: z.number(), iframe: z.number(), svgImg: z.number() }),
  logoImages: z.number(),
  visualPresentation: z.object({
    blocksChecked: z.number(),
    justifiedBlocks: z.number(),
    minLineHeightRatio: z.number().nullable(),
    maxLineLengthCh: z.number().nullable(),
  }),
  links: z.array(z.object({ text: z.string(), href: z.string() })),
  forms: z.array(
    z.object({
      id: z.string(),
      contract: z.string().nullable(),
      endpointState: z.string().nullable(),
      disabled: z.boolean(),
      fieldCount: z.number(),
      unlabelledFields: z.array(z.string()),
      describedByMissing: z.array(z.string()),
      hasStatusRegion: z.boolean(),
    }),
  ),
});
export type RawPageAudit = z.infer<typeof pageAuditSchema>;

const vitalsPageSchema = z.object({
  route: z.string(),
  lcpMs: z.number().nullable(),
  cls: z.number(),
  interactions: z.array(z.object({ target: z.string(), durationMs: z.number() })),
  clicksPerformed: z.number(),
});

const sweepPageSchema = z.object({
  route: z.string(),
  status: z.number(),
  overflowPx: z.number(),
  smallestTouchTargetPx: z.number().nullable(),
  smallTouchTargets: z.array(z.string()),
  textLength: z.number(),
  screenshot: z.string().nullable(),
});

const sweepProfileSchema = z.object({
  name: z.string(),
  engine: z.enum(["chromium", "webkit"]),
  mandatory: z.boolean(),
  javaScriptEnabled: z.boolean(),
  hasTouch: z.boolean(),
  available: z.boolean(),
  reason: z.string().nullable(),
  pages: z.array(sweepPageSchema),
});
export type RawSweepProfile = z.infer<typeof sweepProfileSchema>;

/** One delivered experience, operated in a real browser by keyboard (validate.mjs experienceChecks). */
const pathResultSchema = z.object({
  name: z.string(),
  expected: z.string(),
  actual: z.string().nullable(),
  matched: z.boolean(),
  focusMovedToResult: z.boolean(),
  resultAnnounced: z.boolean(),
});

const experienceCheckSchema = z.object({
  route: z.string(),
  specId: z.string(),
  type: z.enum(["comparison", "calculator", "decision_flow"]),
  /** Which engine operated it and which generated layer it read (defaults: evidence older than the matrix). */
  engine: z.enum(["chromium", "webkit"]).default("chromium"),
  layer: z.enum(["next", "static"]).default("next"),
  pageErrors: z.array(z.string()),
  enhanced: z.boolean(),
  errorPath: z.object({ summaryVisible: z.boolean(), fieldErrors: z.number(), invalidOrUnansweredFocused: z.boolean() }).nullable(),
  completion: z
    .object({
      method: z.literal("keyboard"),
      expected: z.string(),
      actual: z.string().nullable(),
      matched: z.boolean(),
      focusMovedToResult: z.boolean(),
      resultAnnounced: z.boolean(),
    })
    .nullable(),
  /** Every owner example / every rule path / the no-match path. */
  paths: z.array(pathResultSchema).default([]),
  invalidInput: z.object({ errorShown: z.boolean(), fieldMarkedInvalid: z.boolean(), noResult: z.boolean() }).nullable().default(null),
  /** Chromium accessibility tree over the experience: what assistive technology is given. */
  axTree: z
    .object({
      available: z.boolean(),
      reason: z.string().optional(),
      controls: z.number(),
      unnamedControls: z.array(z.string()),
      groups: z.number(),
      unnamedGroups: z.number(),
      statusRegions: z.number(),
      alertRegions: z.number(),
    })
    .nullable()
    .default(null),
  reset: z.object({ cleared: z.boolean(), focusReturned: z.boolean() }).nullable(),
  noJs: z.object({ fallbackTextLength: z.number(), controlsDisabledOrAbsent: z.boolean(), noticeVisibleOrNotNeeded: z.boolean() }),
  narrow: z.object({ pageOverflowPx: z.number(), experienceOverflowPx: z.number() }),
  clientNavigation: z.object({ attempted: z.boolean(), enhanced: z.boolean() }).nullable(),
  comparison: z.object({ regionFocusable: z.boolean(), regionNamed: z.boolean(), caption: z.boolean(), scopedHeaders: z.number() }).nullable(),
});
export type RawExperienceCheck = z.infer<typeof experienceCheckSchema>;

const navigationCheckSchema = z.object({
  engine: z.enum(["chromium", "webkit"]),
  layer: z.enum(["next", "static"]),
  route: z.string(),
  pageErrors: z.array(z.string()),
  phone: z
    .object({
      initiallyClosed: z.boolean(),
      h1OnFirstScreen: z.boolean(),
      h1TopPx: z.number().nullable(),
      keyboardOpens: z.boolean(),
      routeParity: z.boolean(),
      closeVisible: z.boolean(),
      tabReachesMenu: z.boolean(),
      escapeCloses: z.boolean(),
      focusReturnsToToggle: z.boolean(),
      closeButtonCloses: z.boolean(),
    })
    .nullable(),
  desktop: z.object({ listVisible: z.boolean(), buttonsHidden: z.boolean(), routeParity: z.boolean() }).nullable(),
  noJs: z.object({ keyboardOpens: z.boolean() }).nullable(),
});
export type RawNavigationCheck = z.infer<typeof navigationCheckSchema>;

const staticPageSchema = z.object({
  route: z.string(),
  status: z.number(),
  axeViolations: z.array(z.object({ id: z.string(), nodes: z.number() })),
  overflowPx320: z.number(),
  pageErrors: z.array(z.string()),
});
export type RawStaticPage = z.infer<typeof staticPageSchema>;

const availability = z.object({ name: z.string(), available: z.boolean(), reason: z.string().nullable() });

export const rawHostEvidenceSchema = z.object({
  schemaVersion: z.literal(1),
  collectedAt: z.string(),
  host: z.object({
    node: z.string(),
    platform: z.string(),
    nextVersion: z.string().nullable(),
    browser: z.object({ path: z.string(), version: z.string() }).nullable(),
    playwrightVersion: z.string().nullable(),
  }),
  install: z.object({
    declaredDependencies: z.record(z.string()),
    declaredDevDependencies: z.record(z.string()),
    installedVersions: z.record(z.string().nullable()),
  }),
  steps: z.object({ build: stepSchema, typecheck: stepSchema, lint: stepSchema }),
  lint: z.object({ errorCount: z.number(), warningCount: z.number() }).nullable(),
  builtRoutes: z.array(z.string()).nullable(),
  server: z.object({ started: z.boolean(), url: z.string(), error: z.string().nullable() }),
  routes: z.array(routeSchema),
  notFoundProbe: z.object({ route: z.string(), status: z.number(), hasNotFoundMarker: z.boolean() }).nullable(),
  stateFiles: z.object({ notFound: z.boolean(), error: z.boolean(), loading: z.boolean() }),
  secretScan: z.object({ filesScanned: z.number(), findings: z.array(z.string()) }),
  audit: z.object({
    available: z.boolean(),
    reason: z.string().nullable(),
    pages: z.array(pageAuditSchema),
  }),
  vitals: z.object({
    available: z.boolean(),
    reason: z.string().nullable(),
    method: z.string(),
    pages: z.array(vitalsPageSchema),
  }),
  responsiveSweep: z.object({ profiles: z.array(sweepProfileSchema) }),
  /** Delivered experiences operated in a real browser. Defaulted for evidence files older than delivery. */
  experiences: z
    .object({ available: z.boolean(), reason: z.string().nullable(), checks: z.array(experienceCheckSchema) })
    .default({ available: false, reason: "not collected by this validator version", checks: [] }),
  /** Compact navigation operated on a phone viewport (P1-4). */
  navigation: z
    .object({ available: z.boolean(), reason: z.string().nullable(), checks: z.array(navigationCheckSchema) })
    .default({ available: false, reason: "not collected by this validator version", checks: [] }),
  /** The generator's static layer served and audited (Delivery G4). */
  staticLayer: z
    .object({ available: z.boolean(), reason: z.string().nullable(), pages: z.array(staticPageSchema) })
    .default({ available: false, reason: "not collected by this validator version", pages: [] }),
  /** Which engines and layers the operation checks could use. */
  matrix: z.object({ engines: z.array(availability), layers: z.array(availability) }).default({ engines: [], layers: [] }),
});
export type RawHostEvidence = z.infer<typeof rawHostEvidenceSchema>;

export function parseRawHostEvidence(value: unknown): RawHostEvidence {
  return rawHostEvidenceSchema.parse(value);
}
