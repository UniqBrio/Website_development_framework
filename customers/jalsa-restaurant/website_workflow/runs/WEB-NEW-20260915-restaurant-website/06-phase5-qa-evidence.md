# PHASE 5 — QA EVIDENCE GATE

Request: WEB-NEW-20260915-restaurant-website · evidence from the host run in the final `npm run host:e2e`,
`2026-09-15T13:25:41.482Z` (`evidence-run/jalsa-dry-run-digest.json`; raw:
`generated/host/evidence/raw-host-evidence.json`). Earlier runs (`13:09:10Z`, `13:13:50Z`) are cited
only for measurement variance. Gate results, register results, provenance ledger counts and first-load JS
were the same in all three runs.

## 1. Responsiveness (responsive_matrix.md TIER 1)
Nine profiles, both engines, every planned route (one route: `/`). 0 failures on each.

| Profile | Engine | Result |
|---|---|---|
| Galaxy S9+ | chromium | pass |
| Galaxy S9+ landscape (not mandatory) | chromium | pass |
| iPhone SE | webkit | pass |
| iPhone 15 | webkit | pass |
| iPad (gen 7) | webkit | pass |
| Pixel 7 | chromium | pass |
| Desktop Chrome | chromium | pass |
| Desktop 1920 | chromium | pass |
| Desktop Chrome, JavaScript disabled | chromium | pass |

- **320 CSS px:** no horizontal overflow and no text lost (static layer `overflowPx320: 0`).
- **400% zoom:** covered by the same measurement.
- **Limit:** emulated devices only, no physical devices (H-06).

## 2. Browser behaviour
| Check | Result |
|---|---|
| Chromium and WebKit available | yes (Chrome 152.0.7977.84; Playwright 1.63.0 WebKit) |
| Next.js layer and static layer served | both, status 200 |
| Compact navigation, phone | closed initially; keyboard opens; Tab reaches menu; Escape closes; focus returns; Close button works; route parity. Passed in both engines and both layers |
| Navigation without JavaScript | popover opens by keyboard (both engines, both layers) |
| Desktop navigation | list visible, toggle hidden, route parity |
| Keyboard | 4/4 focusable elements reached; 0 unreachable; focus visible at every stop, none obscured |
| Touch / no-hover | hover reveals 0 of 3 checked elements; no drag, device-motion or WebGL dependency; smallest target 27 px (the brand link) against the AA 24 px threshold |
| Forms | none exist (no contact method) → N-A |
| Interactive experiences | none (NO_EXPERIENCE) → reset/recovery N-A; kill switch N-A |
| Error states | not-found probe returns 404 with the marker; `error.tsx`, `loading.tsx`, `not-found.tsx` exist |
| Static fallback | the static layer passes axe and 320 px with 0 page errors |
| Console | one non-blocking error: `/favicon.ico` 404. No icon is declared, because no verified logo exists |
| Secret scan | 22 files, 0 findings |

## 3. Performance
| Metric | 13:09 run | 13:13 run | **Final 13:25 run** | Budget |
|---|---|---|---|---|
| LCP (lab) | 616 ms | 724 ms | **596 ms** | < 2,500 ms |
| CLS (lab) | 0 | 0 | **0** | < 0.1 |
| INP (lab) | 64 ms | 80 ms | **72 ms** | < 200 ms |
| First-load JS `/` (gzip, external scripts) | 142.6 KB | 142.6 KB | **142.6 KB** | 150 KB (95% used) |

- **Method:** Chromium via CDP; 412×823 viewport; 4× CPU slowdown; 150 ms latency; 1,638 kbps
  down; cache disabled.
- **INP sample:** each run's INP comes from one scripted click (2 Event Timing entries). Across three
  runs INP ranged 64-80 ms and LCP 596-724 ms. On the same final tree, Ashvattha's `/about` measured
  INP 224 ms (96 ms the run before) and failed its performance gate. Single-click lab INP is
  unstable.
- **Verdict:** `gates.performance = true` under the existing policy (lab evidence, within budget).
  This is **not** a production performance pass: there is no field data, and one interaction per
  run is not a stable INP distribution. EVIDENCE_GAP.
- **Budget note:** 142.6 KB of the 150 KB budget is framework runtime for a page with no
  interactivity.

## 4. Accessibility spot-check (axe-core 4.13.0 + DOM measurements)
- axe: **0 violations**, 0 incomplete. Next.js and static layers.
- Contrast: 206 normal-text samples, lowest 9.13:1; large text lowest 16.54:1; 16 token pairs all pass.
- Reduced motion: no motion persists (none exists).
- Logo visibility: N-A (text wordmark).
- Gate: `accessibility = true` at the `wcag_aa` target.
- **Screen reader: NOT PERFORMED.** No documented session exists, so no screen-reader result is
  claimed (H-01).
- Human-assessment criteria (1.4.8, 2.4.9, 3.1.5): not performed (H-04).

## 4a. SEO + STACK (served HTML, JavaScript not executed)
| Item | Served | Status |
|---|---|---|
| Title | "Jalsa Restaurant" | PRESENT (name unverified, A-01) |
| Meta description | absent | held AI draft (A-12); correct absence |
| Canonical | absent | UNRESOLVED (no domain) |
| H1 | 1, no skipped levels | PRESENT |
| robots | "index, follow" | present, although the content gate fails. Publication is controlled by the gate, not by robots |
| OG / Twitter | title, type, card; no image | og:image UNRESOLVED |
| JSON-LD | Organization {name} | PRESENT; LocalBusiness refused |
| Sitemap | absent | UNRESOLVED |
| Internal links | "/" only | the score sheet flags an orphan (FD-12) |
| Images | 0 | N-A |
| Body text | 2,292 characters, present without JS | PRESENT |
| Dependencies installed | next 15.5.25, react 19.3.0, react-dom 19.3.0 (+ toolchain) | admitted set only |

## 4b. ASSET GATE
Logo: refused, provenance recorded (`evidence/logo-inspection.md`). No asset shipped.

## 5-6. Re-interrogation against the built result
Unchanged from Phase 1: Q2, Q4, Q5, Q9 and Q10 FAIL on the built page (screenshots
`generated/host/evidence/screenshots/*/home.png`). On a phone the page is a single column of 49
"description to be supplied" cards under "Services".

## 7. QA completion — register (generated section in `07-engine-seam.md`)
| Result | Cases |
|---|---|
| PASS (9) | TC-DATA-001, TC-INT-001, TC-CONT-002, TC-UI-001, TC-RESP-001, TC-A11Y-001, TC-TECH-001, TC-PERF-001, TC-DES-001 |
| FAIL (3) | TC-FUNC-001 (no completable conversion), TC-CONT-001 (placeholder text), TC-CONT-003 (content gate) |
| BLOCKED (1) | TC-ENG-001 (no experience to operate — correct) |

- **Additional provenance evidence** (outside the closed registry; all pass):
  - served-text ledger: 54 customer-material fragments, 10 framework fragments, **0 unclassified**;
  - raw SHA-256 unchanged before and after;
  - no `₹`, no price value, no held draft, no logo path, no contact or proof term, no synthetic
    fixture value in served HTML.
- **Not covered:**
  - screen reader;
  - physical devices;
  - field performance;
  - human visual/brand review;
  - C2PA signature validation;
  - any page other than `/`, because none exists.

Quality: `post_build`, level **technically_working**, weighted score **72**, target
`professionally_designed` **not met**. Hard gate failed: **content**.

**GATE 5 (owner) — EVIDENCE — PENDING, and failing on evidence.**

---

## 8. Re-run after framework remediation — 2026-09-16

Same raw files (SHA-256 unchanged), same 30 facts, no new approval. Digest collected
**2026-09-16T07:02:41.596Z** (`evidence-run/jalsa-dry-run-digest.json`).

| Result | Cases |
|---|---|
| PASS (9) | TC-DATA-001, TC-INT-001, TC-CONT-002, TC-UI-001, TC-RESP-001, TC-A11Y-001, TC-TECH-001, TC-PERF-001, TC-DES-001 |
| FAIL (3) | TC-FUNC-001 (no completable conversion), TC-CONT-001 (placeholder text), TC-CONT-003 (content gate) |
| BLOCKED (1) | TC-ENG-001 (no experience to operate — correct) |

The register result is unchanged, but what it measures is no longer misleading:

- **TC-CONT-001** now reads `/ (4 slots, 1 pending marker)`. Before remediation it counted 1 slot
  while the page served 49 pending markers. The 4 slots are the proposition, the audience, the next
  step and the opening hours — four missing customer facts, each named on the page.
- **TC-INT-001** now records 10 delivered and **54 unavailable** entries (was 9 / 6): every withheld
  value is written down with its reason, instead of disappearing.
- **The menu is absent.** 49 `content_verdict` entries and the `services` section entry each carry:
  *source "menu-docx" is not authorised for publication: "For design illustrations only" — a source
  restriction overrides verification.*
- **No pattern is promised.** `patternsUsed: []`, 14 rejected with recorded reasons.
- **Served-text ledger:** 5 customer-material fragments, 11 framework fragments, **0 unclassified**.
- **Generation publication blockers:** none outstanding — nothing approved was dropped.

**Not covered — unchanged:** screen reader; physical devices; field performance; human visual/brand
review; C2PA signature validation; any page other than `/`, because none exists.

Quality: `post_build`, level **technically_working**, weighted score **73.5**, target
`professionally_designed` **not met**. Hard gate failed: **content** — on three blockers that are
all missing customer facts (no verified address, no completable contact route, four honest slots).

**GATE 5 (owner) — EVIDENCE — still PENDING.** The framework no longer blocks this site; the
restaurant's missing information and pending approvals do.
