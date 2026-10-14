/**
 * RESPONSIVE SWEEP PROFILES — the executable form of responsive_matrix.md TIER 1.
 *
 * responsive_matrix.md names six Playwright device profiles across TWO engines
 * (chromium AND webkit), plus one wide desktop check, as MANDATORY on every
 * changed page. Until the first customer dry run the host collector measured one
 * chromium desktop and one 320px viewport — so Phase 5's primary dimension had no
 * measured evidence at all. This list is carried in the host manifest; the host
 * collector runs it and a missing mandatory profile leaves the responsive gate
 * UNKNOWN, never passed.
 */
export interface SweepProfile {
  name: string;
  /** A Playwright device descriptor name, verified present in the registry. */
  device?: string;
  engine: "chromium" | "webkit";
  viewport?: { width: number; height: number };
  /** false = the degraded path: the page with JavaScript disabled. */
  javaScriptEnabled: boolean;
  mandatory: boolean;
  why: string;
}

export const RESPONSIVE_SWEEP: readonly SweepProfile[] = [
  { name: "Galaxy S9+", device: "Galaxy S9+", engine: "chromium", javaScriptEnabled: true, mandatory: true, why: "TIER 1: narrowest realistic Android, 320px" },
  { name: "iPhone SE", device: "iPhone SE", engine: "webkit", javaScriptEnabled: true, mandatory: true, why: "TIER 1: shortest iOS, webkit" },
  { name: "Pixel 7", device: "Pixel 7", engine: "chromium", javaScriptEnabled: true, mandatory: true, why: "TIER 1: mainstream Android" },
  { name: "iPhone 15", device: "iPhone 15", engine: "webkit", javaScriptEnabled: true, mandatory: true, why: "TIER 1: mainstream iOS, webkit" },
  { name: "iPad (gen 7)", device: "iPad (gen 7)", engine: "webkit", javaScriptEnabled: true, mandatory: true, why: "TIER 1: tablet portrait, webkit" },
  { name: "Desktop Chrome", device: "Desktop Chrome", engine: "chromium", javaScriptEnabled: true, mandatory: true, why: "TIER 1: desktop 1280" },
  { name: "Desktop 1920", engine: "chromium", viewport: { width: 1920, height: 1080 }, javaScriptEnabled: true, mandatory: true, why: "TIER 1: the one wide check" },
  { name: "Galaxy S9+ landscape", device: "Galaxy S9+ landscape", engine: "chromium", javaScriptEnabled: true, mandatory: false, why: "TIER 2: landscape mobile" },
  { name: "Desktop Chrome, JavaScript disabled", device: "Desktop Chrome", engine: "chromium", javaScriptEnabled: false, mandatory: true, why: "degraded path: content and navigation without JavaScript" },
];
