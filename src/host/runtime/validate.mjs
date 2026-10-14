#!/usr/bin/env node
/**
 * HOST VALIDATION — runs INSIDE a generated host project (`npm run validate`).
 *
 * It COLLECTS RAW FACTS ONLY and writes them to host/evidence/raw-host-evidence.json:
 *   1. production build, typecheck and lint, with exit codes
 *   2. the routes the build emitted, from the build's own manifest
 *   3. the production server's responses, fetched with JavaScript not executed
 *   4. every external script each page loads, with gzipped byte counts
 *   5. a secret scan over the build output and the served pages
 *   6. an accessibility audit in an ALREADY-INSTALLED browser: axe-core plus DOM
 *      measurements (keyboard walk, target sizes, reflow, reduced motion, forms)
 *   7. lab Core Web Vitals under a throttled mobile profile
 *   8. delivered experiences and compact navigation OPERATED by keyboard in
 *      Chromium AND WebKit, against the Next.js layer AND the static layer
 *      (served here with node:http); an axe + reflow audit of the static layer;
 *      the accessibility tree of each experience (Chromium CDP)
 *
 * It makes NO pass/fail decision. The framework core parses this file against its
 * schema and runs every gate. Anything this script cannot do is recorded as
 * unavailable, with a reason — never as a pass.
 *
 * It uses only packages the host declared (playwright-core, axe-core, next,
 * typescript, eslint) and Node built-ins.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { join, dirname } from "node:path";
import { gzipSync } from "node:zlib";

const HOST = process.cwd();
const manifest = JSON.parse(readFileSync(join(HOST, "host/host-manifest.json"), "utf8"));
const OUT = join(HOST, "host/evidence/raw-host-evidence.json");
const PORT = Number(process.env.HOST_PORT ?? manifest.port ?? 3217);
const BASE = `http://127.0.0.1:${PORT}`;
const require = createRequire(join(HOST, "package.json"));
const log = (...args) => console.log("[host-validate]", ...args);

function tail(text, max = 4000) {
  return text.length > max ? text.slice(text.length - max) : text;
}

/** Run a Node CLI from the host's own node_modules. No shell, no global tools. */
function runNodeBin(label, binPath, args, extraEnv = {}) {
  const started = Date.now();
  if (!existsSync(binPath)) {
    return { ran: false, exitCode: null, durationMs: 0, outputTail: `${label}: ${binPath} is not installed` };
  }
  log(`running ${label}`);
  const result = spawnSync(process.execPath, [binPath, ...args], {
    cwd: HOST,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1", ...extraEnv },
  });
  return {
    ran: true,
    exitCode: result.status,
    durationMs: Date.now() - started,
    outputTail: tail(`${result.stdout ?? ""}${result.stderr ?? ""}${result.error ? `\n${result.error.message}` : ""}`),
  };
}

function installedVersion(name) {
  try {
    return JSON.parse(readFileSync(join(HOST, "node_modules", name, "package.json"), "utf8")).version ?? null;
  } catch {
    return null;
  }
}

function walkFiles(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walkFiles(full, acc);
    else acc.push(full);
  }
  return acc;
}

function findBrowser() {
  const candidates = [
    process.env.HOST_BROWSER_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);
  return candidates.find((p) => existsSync(p)) ?? null;
}

async function waitForServer(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/`, { redirect: "manual" });
      if (res.status > 0) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

// ------------------------------------------------------------------ in-page scripts

/** Installed before any page script: records device-motion listeners and WebGL contexts. */
const POINTER_INIT = `(() => {
  window.__audit = { deviceMotion: 0, webgl: 0 };
  const add = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, ...rest) {
    if (type === "devicemotion" || type === "deviceorientation") window.__audit.deviceMotion++;
    return add.call(this, type, ...rest);
  };
  const getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    if (/webgl/i.test(String(type))) window.__audit.webgl++;
    return getContext.call(this, type, ...rest);
  };
})();`;

/** Performance observers for lab vitals, installed before page scripts run. */
const VITALS_INIT = `(() => {
  window.__vitals = { lcp: null, shifts: [], events: [] };
  const observe = (type, handler, extra = {}) => {
    try { new PerformanceObserver((list) => list.getEntries().forEach(handler)).observe({ type, buffered: true, ...extra }); } catch {}
  };
  observe("largest-contentful-paint", (e) => { window.__vitals.lcp = e.startTime; });
  observe("layout-shift", (e) => { if (!e.hadRecentInput) window.__vitals.shifts.push({ t: e.startTime, v: e.value }); });
  observe("event", (e) => { if (e.interactionId) window.__vitals.events.push({ name: e.name, duration: e.duration, id: e.interactionId }); }, { durationThreshold: 16 });
  observe("first-input", (e) => { window.__vitals.events.push({ name: e.name, duration: e.duration, id: -1 }); });
})();`;

/** Selector for the interactive elements a keyboard user can reach. */
const FOCUSABLE =
  'a[href], button, input:not([type="hidden"]), select, textarea, summary, [tabindex]:not([tabindex="-1"])';

async function tagFocusables(page) {
  return page.evaluate((selector) => {
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none";
    };
    const candidates = [...document.querySelectorAll(selector)].filter((el) => visible(el) && !el.matches(":disabled"));
    // A native radio group is ONE Tab stop (arrow keys move within it): expect only
    // the checked radio, or the first when none is checked, to be reachable by Tab.
    const list = candidates.filter((el) => {
      if (!(el instanceof HTMLInputElement) || el.type !== "radio" || !el.name) return true;
      const group = candidates.filter((o) => o instanceof HTMLInputElement && o.type === "radio" && o.name === el.name && o.form === el.form);
      return el === (group.find((o) => o.checked) ?? group[0]);
    });
    list.forEach((el, i) => el.setAttribute("data-audit-id", String(i)));
    return list.map((el, i) => {
      // An input inside its <label> is activated by the whole label (WCAG 2.5.8 target).
      const wrappingLabel = el.closest("label");
      const r = (wrappingLabel && el.matches("input") ? wrappingLabel : el).getBoundingClientRect();
      const parent = el.closest("p, li, dd, td, blockquote");
      const own = (el.textContent ?? "").trim().length;
      const total = parent ? (parent.textContent ?? "").trim().length : own;
      const inline = el.tagName === "A" && getComputedStyle(el).display.startsWith("inline") && total > own + 10;
      const label = `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}[${(el.textContent ?? el.getAttribute("aria-label") ?? "").trim().slice(0, 40)}]`;
      return { id: String(i), target: label, width: r.width, height: r.height, inlineInText: inline };
    });
  }, FOCUSABLE);
}

async function keyboardWalk(page, focusables) {
  const stops = [];
  const reached = new Set();
  let completedCycle = false;
  await page.evaluate(() => {
    document.activeElement?.blur?.();
    window.scrollTo(0, 0);
  });
  const limit = focusables.length * 2 + 10;
  let first = null;
  for (let i = 0; i < limit; i++) {
    await page.keyboard.press("Tab");
    const stop = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const inViewport = cx >= 0 && cy >= 0 && cx <= window.innerWidth && cy <= window.innerHeight;
      const hit = inViewport ? document.elementFromPoint(cx, cy) : null;
      const outlineVisible =
        (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) >= 1) || (cs.boxShadow && cs.boxShadow !== "none");
      return {
        auditId: el.getAttribute("data-audit-id"),
        target: `${el.tagName.toLowerCase()}[${(el.textContent ?? "").trim().slice(0, 40)}]`,
        outlineVisible: Boolean(outlineVisible),
        obscured: inViewport ? !(hit === el || el.contains(hit)) : true,
        inViewport,
      };
    });
    if (!stop) {
      if (reached.size > 0) {
        completedCycle = true;
        break;
      }
      continue;
    }
    const key = stop.auditId ?? stop.target;
    if (first === null) first = key;
    else if (key === first) {
      completedCycle = true;
      break;
    }
    if (stop.auditId !== null) reached.add(stop.auditId);
    stops.push({ target: stop.target, outlineVisible: stop.outlineVisible, obscured: stop.obscured, inViewport: stop.inViewport });
  }
  const unreachable = focusables.filter((f) => !reached.has(f.id)).map((f) => f.target);
  return { focusableCount: focusables.length, reachedCount: reached.size, unreachable, stops, completedCycle };
}

async function motionProfile(page) {
  return page.evaluate(() => {
    const ms = (value) =>
      Math.max(0, ...String(value).split(",").map((v) => (v.trim().endsWith("ms") ? parseFloat(v) : parseFloat(v) * 1000) || 0));
    let longestTransitionMs = 0;
    let longestAnimationMs = 0;
    for (const el of document.querySelectorAll("*")) {
      const cs = getComputedStyle(el);
      longestTransitionMs = Math.max(longestTransitionMs, ms(cs.transitionDuration));
      if (cs.animationName && cs.animationName !== "none") longestAnimationMs = Math.max(longestAnimationMs, ms(cs.animationDuration));
    }
    const runningAnimations = document.getAnimations().filter((a) => a.playState === "running").length;
    return { longestTransitionMs, longestAnimationMs, runningAnimations };
  });
}

async function auditPage(browser, route, axeSource, scriptsReferenceFavicon, servedHtml) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript(POINTER_INIT);
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push({ text: m.text().slice(0, 300), url: m.location()?.url ?? "" });
  });
  page.on("pageerror", (e) => pageErrors.push(String(e.message).slice(0, 300)));
  let pageInitiatedFaviconRequest = false;
  page.on("request", (r) => {
    try {
      if (new URL(r.url()).pathname === "/favicon.ico") pageInitiatedFaviconRequest = true;
    } catch {
      /* non-URL request */
    }
  });
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });

  // ---- axe
  await page.addScriptTag({ content: axeSource });
  const axe = await page.evaluate(async () => {
    const results = await window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag2aaa", "wcag21a", "wcag21aa", "wcag22aa"] },
      resultTypes: ["violations", "incomplete", "passes"],
    });
    const contrast = [];
    for (const bucket of ["passes", "violations"]) {
      for (const rule of results[bucket]) {
        if (rule.id !== "color-contrast" && rule.id !== "color-contrast-enhanced") continue;
        for (const node of rule.nodes) {
          const data = [...(node.any ?? []), ...(node.all ?? []), ...(node.none ?? [])].map((c) => c.data).find((d) => d && typeof d.contrastRatio === "number");
          if (!data) continue;
          contrast.push({
            rule: rule.id,
            ratio: Math.round(data.contrastRatio * 100) / 100,
            fontSizePx: parseFloat(String(data.fontSize)) || 0,
            bold: /bold|[6-9]00/.test(String(data.fontWeight)),
            target: node.target.join(" "),
            outcome: bucket === "passes" ? "pass" : "violation",
          });
        }
      }
    }
    return {
      version: window.axe.version,
      violations: results.violations.map((v) => ({
        id: v.id,
        impact: v.impact ?? null,
        tags: v.tags,
        help: v.help,
        nodes: v.nodes.map((n) => ({ target: n.target.join(" "), summary: String(n.failureSummary ?? "").slice(0, 300) })),
      })),
      incomplete: results.incomplete.map((i) => ({ id: i.id, tags: i.tags, nodeCount: i.nodes.length })),
      passes: results.passes.map((p) => ({ id: p.id, nodeCount: p.nodes.length })),
      contrast,
    };
  });
  const { contrast, ...axeSummary } = axe;

  // ---- keyboard, targets
  const focusables = await tagFocusables(page);
  const keyboard = await keyboardWalk(page, focusables);
  const targets = focusables.map(({ target, width, height, inlineInText }) => ({ target, width, height, inlineInText }));

  // ---- pointer independence
  const pointerStatic = await page.evaluate(() => ({
    draggableCount: document.querySelectorAll('[draggable="true"]').length,
    webglContexts: window.__audit?.webgl ?? 0,
    deviceMotionListeners: window.__audit?.deviceMotion ?? 0,
    nonNativeInteractiveWithoutTabindex: [...document.querySelectorAll('[role="button"], [role="link"], [onclick]')].filter(
      (el) => !["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA", "SUMMARY"].includes(el.tagName) && !(el.tabIndex >= 0),
    ).length,
  }));
  const visibleCount = () =>
    page.evaluate(
      () =>
        [...document.querySelectorAll("body *")].filter((el) => {
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.opacity !== "0";
        }).length,
    );
  const hoverRevealed = [];
  let hoverChecked = 0;
  for (const f of focusables.slice(0, 60)) {
    const handle = await page.$(`[data-audit-id="${f.id}"]`);
    if (!handle) continue;
    try {
      await page.mouse.move(0, 0);
      await page.waitForTimeout(60);
      const before = await visibleCount();
      await handle.hover({ timeout: 2000 });
      await page.waitForTimeout(160);
      const after = await visibleCount();
      hoverChecked += 1;
      if (after > before) hoverRevealed.push(f.target);
    } catch {
      /* element not hoverable at this size; not counted as checked */
    }
  }
  await page.mouse.move(0, 0);

  // ---- media, logo, visual presentation, links, forms
  const structure = await page.evaluate(() => {
    const canvas = document.createElement("canvas").getContext("2d");
    const blocks = [...document.querySelectorAll("p, li, dd, blockquote")].filter((el) => (el.textContent ?? "").trim().length > 80);
    let justified = 0;
    let minRatio = null;
    let maxCh = null;
    for (const el of blocks) {
      const cs = getComputedStyle(el);
      if (cs.textAlign === "justify") justified += 1;
      const fontSize = parseFloat(cs.fontSize);
      const lineHeight = cs.lineHeight === "normal" ? fontSize * 1.2 : parseFloat(cs.lineHeight);
      const ratio = lineHeight / fontSize;
      minRatio = minRatio === null ? ratio : Math.min(minRatio, ratio);
      if (canvas) {
        canvas.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        const zero = canvas.measureText("0").width || fontSize / 2;
        const ch = el.clientWidth / zero;
        maxCh = maxCh === null ? ch : Math.max(maxCh, ch);
      }
    }
    const forms = [...document.querySelectorAll("form")].map((form, i) => {
      const fields = [...form.querySelectorAll("input:not([type=hidden]), select, textarea")];
      return {
        id: form.id || `form-${i}`,
        contract: form.getAttribute("data-contract"),
        endpointState: form.getAttribute("data-endpoint"),
        disabled: Boolean(form.querySelector("fieldset[disabled]")),
        fieldCount: fields.length,
        unlabelledFields: fields.filter((f) => (f.labels?.length ?? 0) === 0 && !f.getAttribute("aria-label")).map((f) => f.name || f.id),
        describedByMissing: [...form.querySelectorAll("[aria-describedby]")].flatMap((el) =>
          (el.getAttribute("aria-describedby") ?? "").split(/\s+/).filter((id) => id && !document.getElementById(id)),
        ),
        hasStatusRegion: Boolean(form.querySelector('[role="status"]')),
      };
    });
    return {
      media: {
        img: document.querySelectorAll("img").length,
        video: document.querySelectorAll("video").length,
        audio: document.querySelectorAll("audio").length,
        iframe: document.querySelectorAll("iframe").length,
        svgImg: document.querySelectorAll('svg[role="img"]').length,
      },
      logoImages: document.querySelectorAll(".c-brand img, header img").length,
      visualPresentation: {
        blocksChecked: blocks.length,
        justifiedBlocks: justified,
        minLineHeightRatio: minRatio === null ? null : Math.round(minRatio * 100) / 100,
        maxLineLengthCh: maxCh === null ? null : Math.round(maxCh),
      },
      links: [...document.querySelectorAll("a[href]")].slice(0, 300).map((a) => ({
        text: ((a.textContent ?? "").trim() || a.getAttribute("aria-label") || "").slice(0, 80),
        href: a.getAttribute("href") ?? "",
      })),
      forms,
      // Text inside a RENDERED compact-navigation disclosure is excluded at both widths
      // (a hidden element's innerText falls back to textContent, so only a rendered
      // menu is subtracted). At 320px
      // it is correctly behind the Menu button, not lost, and navigationChecks proves
      // every route stays reachable by keyboard (measurement correction, P1-4).
      wideTextLength: (() => {
        const menus = [...document.querySelectorAll("[data-nav-compact] [popover]")].filter((m) => getComputedStyle(m).display !== "none").map((m) => (m.innerText ?? "").replace(/\s+/g, " ").trim().length);
        return (document.body.innerText ?? "").replace(/\s+/g, " ").trim().length - menus.reduce((a, b) => a + b, 0);
      })(),
    };
  });
  const declaredIcons = await page.evaluate(() =>
    [...document.querySelectorAll('link[rel~="icon"]')].map((l) => l.getAttribute("href") ?? ""),
  );
  const noPreference = await motionProfile(page);
  await context.close();

  // ---- reflow at 320 CSS px
  const narrow = await browser.newContext({ viewport: { width: 320, height: 800 } });
  const narrowPage = await narrow.newPage();
  await narrowPage.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
  const reflow = await narrowPage.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    narrowTextLength: (() => {
      const menus = [...document.querySelectorAll("[data-nav-compact] [popover]")].filter((m) => getComputedStyle(m).display !== "none").map((m) => (m.innerText ?? "").replace(/\s+/g, " ").trim().length);
      return (document.body.innerText ?? "").replace(/\s+/g, " ").trim().length - menus.reduce((a, b) => a + b, 0);
    })(),
  }));
  await narrow.close();

  // ---- reduced motion
  const reduced = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
  const reducedPage = await reduced.newPage();
  await reducedPage.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
  const reduce = await motionProfile(reducedPage);
  await reduced.close();

  return {
    route,
    consoleErrors,
    declaredIcons,
    faviconEvidence: {
      pageInitiatedRequest: pageInitiatedFaviconRequest,
      htmlReference: /favicon/i.test(servedHtml),
      scriptReference: scriptsReferenceFavicon,
    },
    pageErrors,
    axe: axeSummary,
    contrast,
    keyboard,
    targets,
    reflow: { narrowViewportCssPx: 320, ...reflow, wideTextLength: structure.wideTextLength },
    motion: { reduce, noPreference },
    pointer: { ...pointerStatic, hoverChecked, hoverRevealed },
    media: structure.media,
    logoImages: structure.logoImages,
    visualPresentation: structure.visualPresentation,
    links: structure.links,
    forms: structure.forms,
  };
}

async function labVitals(browser, route) {
  const context = await browser.newContext({ viewport: manifest.lab.viewport });
  await context.addInitScript(VITALS_INIT);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: manifest.lab.network.latencyMs,
    downloadThroughput: (manifest.lab.network.downloadKbps * 1024) / 8,
    uploadThroughput: (manifest.lab.network.uploadKbps * 1024) / 8,
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: manifest.lab.cpuThrottlingRate });
  await page.goto(`${BASE}${route}`, { waitUntil: "load", timeout: 120000 });
  await page.waitForTimeout(2500);
  const lcpMs = await page.evaluate(() => window.__vitals?.lcp ?? null);

  // Scripted interactions on controls that do NOT navigate away.
  const selectors = await page.evaluate(() => {
    const els = [...document.querySelectorAll('main summary, main button:not([type="submit"])')].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && !el.matches(":disabled");
    });
    els.slice(0, 6).forEach((el, i) => el.setAttribute("data-vitals-id", String(i)));
    return els.slice(0, 6).map((el, i) => ({ sel: `[data-vitals-id="${i}"]`, target: `${el.tagName.toLowerCase()}[${(el.textContent ?? "").trim().slice(0, 30)}]` }));
  });
  let clicksPerformed = 0;
  for (const s of selectors) {
    try {
      await page.click(s.sel, { timeout: 5000 });
      clicksPerformed += 1;
      await page.waitForTimeout(500);
    } catch {
      /* not clickable; not counted */
    }
  }
  await page.waitForTimeout(1000);
  const raw = await page.evaluate(() => window.__vitals);
  await context.close();

  // CLS: largest session window (gap < 1s, window < 5s), per the metric definition.
  let cls = 0;
  let windowValue = 0;
  let windowStart = 0;
  let last = -Infinity;
  for (const shift of raw?.shifts ?? []) {
    if (shift.t - last > 1000 || shift.t - windowStart > 5000) {
      windowValue = 0;
      windowStart = shift.t;
    }
    windowValue += shift.v;
    last = shift.t;
    cls = Math.max(cls, windowValue);
  }
  const byInteraction = new Map();
  for (const e of raw?.events ?? []) {
    const key = e.id === -1 ? "first-input" : String(e.id);
    byInteraction.set(key, Math.max(byInteraction.get(key) ?? 0, e.duration));
  }
  const interactions = [...byInteraction.entries()].map(([key, durationMs]) => ({ target: key, durationMs }));
  return { route, lcpMs, cls: Math.round(cls * 1000) / 1000, interactions, clicksPerformed };
}

// ------------------------------------------------------------------ responsive sweep

/**
 * responsive_matrix.md TIER 1 (+ the degraded no-JS path), from the manifest.
 * chromium runs on the installed browser; webkit needs Playwright's WebKit build.
 * A profile whose engine cannot launch is recorded unavailable — never skipped
 * silently, never passed.
 */
/**
 * STATIC LAYER SERVER. The generator's static base layer (HTML + CSS + the shared
 * experience runtime) copied into the host as `static-site/`, served with
 * node:http so the same browser checks run against it as against Next.js.
 */
const STATIC_TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml", ".json": "application/json" };
async function startStaticServer(port) {
  const root = join(HOST, manifest.staticSite?.dir ?? "static-site");
  if (!existsSync(root)) return { server: null, base: null, reason: `no static layer at ${root}` };
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    let path = decodeURIComponent(url.pathname);
    if (path.includes("..")) {
      res.writeHead(400).end();
      return;
    }
    let file = join(root, path);
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
    if (!existsSync(file) && !/\.[a-z0-9]+$/i.test(path)) file = join(root, path, "index.html");
    if (!existsSync(file)) {
      const notFound = join(root, "404.html");
      res.writeHead(404, { "content-type": STATIC_TYPES[".html"] }).end(existsSync(notFound) ? readFileSync(notFound) : "not found");
      return;
    }
    const ext = file.slice(file.lastIndexOf("."));
    res.writeHead(200, { "content-type": STATIC_TYPES[ext] ?? "application/octet-stream" }).end(readFileSync(file));
  });
  await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
  return { server, base: `http://127.0.0.1:${port}`, reason: null };
}

/** WHERE a check ran: which engine drove it and which generated layer it read. */
async function launchEngines(pw, chromiumBrowser) {
  const engines = [{ name: "chromium", browser: chromiumBrowser, reason: null }];
  try {
    engines.push({ name: "webkit", browser: await pw.webkit.launch({ headless: true }), reason: null });
  } catch (e) {
    engines.push({ name: "webkit", browser: null, reason: `webkit could not launch: ${String(e.message).split("\n")[0]}` });
  }
  return engines;
}

/**
 * The browser's accessibility tree for one experience (Chromium, via CDP). This is
 * the automated half of the screen-reader strategy: what an assistive technology
 * is GIVEN — roles, names, groups, live regions. Whether it is announced well is
 * the manual half, recorded as human_assessment_required.
 */
async function axTreeFacts(page, rootSelector) {
  const cdp = await page.context().newCDPSession(page);
  try {
    await page.evaluate((sel) => document.querySelector(sel)?.setAttribute("data-ax-root", "1"), rootSelector);
    const { nodes } = await cdp.send("Accessibility.getFullAXTree");
    const { root } = await cdp.send("DOM.getDocument", { depth: -1 });
    const { nodeIds } = await cdp.send("DOM.querySelectorAll", { nodeId: root.nodeId, selector: `[data-ax-root="1"] input, [data-ax-root="1"] button, [data-ax-root="1"] fieldset, [data-ax-root="1"] [role="status"], [data-ax-root="1"] [role="alert"]` });
    const backend = new Set();
    for (const id of nodeIds) {
      const { node } = await cdp.send("DOM.describeNode", { nodeId: id });
      backend.add(node.backendNodeId);
    }
    const inScope = nodes.filter((n) => backend.has(n.backendDOMNodeId));
    const roleOf = (n) => n.role?.value ?? "";
    const nameOf = (n) => (n.name?.value ?? "").trim();
    const controls = inScope.filter((n) => ["radio", "spinbutton", "textbox", "button"].includes(roleOf(n)));
    const groups = inScope.filter((n) => ["group", "radiogroup"].includes(roleOf(n)));
    return {
      available: true,
      controls: controls.length,
      unnamedControls: controls.filter((n) => nameOf(n).length === 0).map((n) => roleOf(n)),
      groups: groups.length,
      unnamedGroups: groups.filter((n) => nameOf(n).length === 0).length,
      statusRegions: inScope.filter((n) => roleOf(n) === "status").length,
      alertRegions: inScope.filter((n) => roleOf(n) === "alert").length,
    };
  } catch (e) {
    return { available: false, reason: String(e.message).split("\n")[0], controls: 0, unnamedControls: [], groups: 0, unnamedGroups: 0, statusRegions: 0, alertRegions: 0 };
  } finally {
    await cdp.detach().catch(() => {});
  }
}

/**
 * Operate every DELIVERED experience the manifest names, in a real browser, by
 * keyboard. Records RAW facts only; the core decides what counts as working.
 * Expectations (every owner example, every rule's answers, the no-match path, an
 * out-of-range input) come from the manifest, never from the page.
 */
async function experienceChecks(engine, layer, base) {
  const checks = [];
  const browser = engine.browser;
  const settle = (page) => page.waitForTimeout(80);
  for (const x of manifest.experiences ?? []) {
    const root = `[data-experience-id="${x.specId}"]`;
    const record = {
      route: x.route,
      specId: x.specId,
      type: x.type,
      engine: engine.name,
      layer,
      pageErrors: [],
      enhanced: false,
      errorPath: null,
      completion: null,
      paths: [],
      invalidInput: null,
      reset: null,
      noJs: { fallbackTextLength: 0, controlsDisabledOrAbsent: false, noticeVisibleOrNotNeeded: false },
      narrow: { pageOverflowPx: 0, experienceOverflowPx: 0 },
      clientNavigation: null,
      comparison: null,
      axTree: null,
    };
    log(`experience ${x.specId} on ${x.route} [${engine.name}/${layer}]`);

    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    page.on("pageerror", (e) => record.pageErrors.push(String(e.message).slice(0, 300)));
    const open = async () => {
      await page.goto(`${base}${x.route}`, { waitUntil: layer === "next" ? "networkidle" : "load" });
      return page
        .waitForSelector(`${root}[data-experience-ready="true"]`, { timeout: 10000 })
        .then(() => true)
        .catch(() => false);
    };

    if (x.type === "comparison") {
      await page.goto(`${base}${x.route}`, { waitUntil: "load" });
      record.comparison = await page.evaluate((sel) => {
        const r = document.querySelector(sel);
        const region = r?.querySelector(".c-table-scroll");
        const labelled = region?.getAttribute("aria-labelledby");
        const table = r?.querySelector("table");
        return {
          regionFocusable: region?.getAttribute("tabindex") === "0",
          regionNamed: Boolean(labelled && document.getElementById(labelled)?.textContent?.trim()),
          caption: Boolean(table?.querySelector("caption")?.textContent?.trim()),
          scopedHeaders: table ? table.querySelectorAll("th[scope]").length : 0,
        };
      }, root);
    } else if (x.mode === "interactive") {
      record.enhanced = await open();
      if (record.enhanced) {
        // Error path: submit empty with the keyboard.
        await page.focus(`${root} button[type="submit"]`);
        await page.keyboard.press("Enter");
        await settle(page);
        record.errorPath = await page.evaluate((sel) => {
          const r = document.querySelector(sel);
          const summary = r.querySelector("[data-experience-errors]");
          const active = document.activeElement;
          return {
            summaryVisible: Boolean(summary && !summary.hidden && summary.textContent.trim().length > 0),
            fieldErrors: [...r.querySelectorAll(".c-field-error")].filter((e) => e.textContent.trim().length > 0).length,
            invalidOrUnansweredFocused: Boolean(active && r.contains(active) && active.matches("input")),
          };
        }, root);

        if (x.type === "calculator") {
          // EVERY owner example, each from a fresh page.
          for (const [index, example] of x.examples.entries()) {
            if (index > 0) await open();
            for (const input of x.inputs) {
              await page.focus(`#${input.domId}`);
              await page.keyboard.type(String(example.inputs[input.id]));
            }
            await page.keyboard.press("Enter");
            await settle(page);
            const result = await page.evaluate((sel) => {
              const r = document.querySelector(sel);
              const region = r.querySelector("[data-experience-result]");
              return {
                value: region?.getAttribute("data-value") ?? null,
                focus: document.activeElement === region,
                announced: region?.getAttribute("role") === "status" && region?.getAttribute("aria-live") === "polite" && region.textContent.trim().length > 0,
              };
            }, root);
            const tolerance = 0.5 * 10 ** -example.decimals;
            const path = {
              name: example.name,
              expected: String(example.expected),
              actual: result.value,
              matched: result.value !== null && Math.abs(Number(result.value) - example.expected) <= tolerance,
              focusMovedToResult: result.focus,
              resultAnnounced: result.announced,
            };
            record.paths.push(path);
            if (index === 0) record.completion = { method: "keyboard", ...path };
          }
          // Out-of-range input: an error, never a result.
          if (x.invalid) {
            await open();
            for (const input of x.inputs) {
              await page.focus(`#${input.domId}`);
              const value = input.id === x.invalid.inputId ? x.invalid.value : x.examples[0].inputs[input.id];
              await page.keyboard.type(String(value));
            }
            await page.keyboard.press("Enter");
            await settle(page);
            record.invalidInput = await page.evaluate(({ sel, domId }) => {
              const r = document.querySelector(sel);
              const summary = r.querySelector("[data-experience-errors]");
              const region = r.querySelector("[data-experience-result]");
              const field = document.getElementById(domId);
              return {
                errorShown: Boolean(summary && !summary.hidden && summary.textContent.trim().length > 0),
                fieldMarkedInvalid: field?.getAttribute("aria-invalid") === "true",
                noResult: !region?.getAttribute("data-value"),
              };
            }, { sel: root, domId: x.invalid.domId });
          }
        } else {
          // EVERY rule path and the no-match path, each from a fresh page.
          for (const [index, path] of x.paths.entries()) {
            if (index > 0) await open();
            for (const q of path.answers) {
              await page.focus(`${root} input[name="${q.domName}"][value="${q.optionIds[0]}"]`);
              if (q.answerIndex === 0) await page.keyboard.press("Space");
              else for (let i = 0; i < q.answerIndex; i++) await page.keyboard.press("ArrowDown");
            }
            await page.focus(`${root} button[type="submit"]`);
            await page.keyboard.press("Enter");
            await settle(page);
            const result = await page.evaluate((sel) => {
              const r = document.querySelector(sel);
              const region = r.querySelector("[data-experience-result]");
              const title = region?.querySelector("h3");
              return {
                outcome: region?.getAttribute("data-outcome") ?? null,
                title: title?.textContent?.trim() ?? null,
                focus: Boolean(title && document.activeElement === title),
                announced: region?.getAttribute("role") === "status" && region?.getAttribute("aria-live") === "polite" && region.textContent.trim().length > 0,
              };
            }, root);
            const recorded = {
              name: path.name,
              expected: `${path.expectedOutcomeId} (${path.expectedTitle})`,
              actual: result.outcome === null ? null : `${result.outcome} (${result.title})`,
              matched: result.outcome === path.expectedOutcomeId && result.title === path.expectedTitle,
              focusMovedToResult: result.focus,
              resultAnnounced: result.announced,
            };
            record.paths.push(recorded);
            if (index === 0) record.completion = { method: "keyboard", ...recorded };
          }
        }

        // Reset / restart by keyboard.
        await page.focus(`${root} button[type="reset"]`);
        await page.keyboard.press("Enter");
        await settle(page);
        record.reset = await page.evaluate((sel) => {
          const r = document.querySelector(sel);
          const region = r.querySelector("[data-experience-result]");
          const inputs = [...r.querySelectorAll("input")];
          const first = inputs[0];
          return {
            cleared: region.textContent.trim().length === 0 && inputs.every((i) => (i.type === "radio" ? !i.checked : i.value === "")),
            focusReturned: document.activeElement === first,
          };
        }, root);
        if (engine.name === "chromium") record.axTree = await axTreeFacts(page, root);
      }
    }
    await context.close();

    // ---- JavaScript off
    const noJsContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, javaScriptEnabled: false });
    const noJsPage = await noJsContext.newPage();
    await noJsPage.goto(`${base}${x.route}`, { waitUntil: "load" });
    record.noJs = await noJsPage.evaluate(({ sel, type }) => {
      const r = document.querySelector(sel);
      if (!r) return { fallbackTextLength: 0, controlsDisabledOrAbsent: false, noticeVisibleOrNotNeeded: false };
      if (type === "comparison") {
        return { fallbackTextLength: (r.querySelector("table")?.innerText ?? "").trim().length, controlsDisabledOrAbsent: true, noticeVisibleOrNotNeeded: true };
      }
      const fallback = r.querySelector("[data-experience-fallback]");
      const controls = r.querySelector("fieldset[data-requires-js]");
      const notice = r.querySelector("[data-requires-js-notice]");
      const visible = (el) => Boolean(el && el.getBoundingClientRect().height > 0 && getComputedStyle(el).visibility !== "hidden");
      return {
        fallbackTextLength: (fallback?.innerText ?? "").trim().length,
        controlsDisabledOrAbsent: !controls || controls.disabled,
        noticeVisibleOrNotNeeded: !controls || visible(notice),
      };
    }, { sel: root, type: x.type });
    await noJsContext.close();

    // ---- 320 CSS px, JavaScript on
    const narrowContext = await browser.newContext({ viewport: { width: 320, height: 800 } });
    const narrowPage = await narrowContext.newPage();
    await narrowPage.goto(`${base}${x.route}`, { waitUntil: "load" });
    record.narrow = await narrowPage.evaluate((sel) => {
      const r = document.querySelector(sel);
      return {
        pageOverflowPx: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
        experienceOverflowPx: r ? Math.max(0, r.scrollWidth - r.clientWidth) : 0,
      };
    }, root);
    await narrowContext.close();

    // ---- client-side navigation (Next.js inserts the page without a reload; the static layer has none)
    if (layer === "next" && x.type !== "comparison" && x.mode === "interactive" && x.route !== "/") {
      const navContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const navPage = await navContext.newPage();
      await navPage.goto(`${base}/`, { waitUntil: "networkidle" });
      const link = navPage.locator(`a[href="${x.route}"]`).first();
      if ((await link.count()) > 0 && (await link.isVisible())) {
        await Promise.all([navPage.waitForURL(`**${x.route}`, { timeout: 15000 }).catch(() => null), link.click()]);
        const enhanced = await navPage
          .waitForSelector(`${root}[data-experience-ready="true"]`, { timeout: 10000 })
          .then(() => true)
          .catch(() => false);
        record.clientNavigation = { attempted: true, enhanced };
      } else {
        record.clientNavigation = { attempted: false, enhanced: false };
      }
      await navContext.close();
    }

    checks.push(record);
  }
  return checks;
}

/**
 * COMPACT NAVIGATION (DD-034, P1-4), operated: on a phone-sized touch viewport the
 * menu is closed, the h1 reaches the first screen, the Menu button opens the same
 * routes by keyboard, Escape and the visible Close button close it and focus
 * returns; at desktop width the full list shows with no buttons.
 */
async function navigationChecks(engine, layer, base, pw) {
  const nav = manifest.navigation;
  const checks = [];
  if (!nav?.compact) return checks;
  const route = nav.routes.find((r) => r !== "/") ?? "/";
  const phone = { viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: engine.name === "chromium" };
  const record = { engine: engine.name, layer, route, pageErrors: [], phone: null, desktop: null, noJs: null };
  const measure = async (page) =>
    page.evaluate(({ menuId, routes }) => {
      const toggle = document.querySelector(`.c-nav-toggle[popovertarget="${menuId}"]`);
      const menu = document.getElementById(menuId);
      const h1 = document.querySelector("h1");
      const visible = (el) => Boolean(el) && el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0 && getComputedStyle(el).visibility !== "hidden";
      const links = menu ? [...menu.querySelectorAll("a[href]")] : [];
      return {
        toggleVisible: visible(toggle),
        menuOpen: Boolean(menu && menu.matches(":popover-open")),
        visibleLinks: links.filter(visible).length,
        routeParity: JSON.stringify(links.map((a) => a.getAttribute("href"))) === JSON.stringify(routes),
        h1TopPx: h1 ? Math.round(h1.getBoundingClientRect().top) : null,
        viewportHeight: window.innerHeight,
        focusOnToggle: document.activeElement === toggle,
        focusInMenu: Boolean(menu && menu.contains(document.activeElement)),
        closeVisible: visible(menu?.querySelector(".c-nav-close")),
      };
    }, { menuId: nav.menuId, routes: nav.routes });

  const context = await engine.browser.newContext(phone);
  const page = await context.newPage();
  page.on("pageerror", (e) => record.pageErrors.push(String(e.message).slice(0, 300)));
  await page.goto(`${base}${route}`, { waitUntil: "load" });
  const initial = await measure(page);
  await page.focus(".c-nav-toggle");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(80);
  const opened = await measure(page);
  await page.keyboard.press("Tab");
  const tabbed = await measure(page);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(80);
  const escaped = await measure(page);
  await page.focus(".c-nav-toggle");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(80);
  await page.focus(".c-nav-close");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(80);
  const closedByButton = await measure(page);
  record.phone = {
    initiallyClosed: initial.toggleVisible && !initial.menuOpen && initial.visibleLinks === 0,
    h1OnFirstScreen: initial.h1TopPx !== null && initial.h1TopPx < initial.viewportHeight,
    h1TopPx: initial.h1TopPx,
    keyboardOpens: opened.menuOpen && opened.visibleLinks === nav.routes.length,
    routeParity: opened.routeParity,
    closeVisible: opened.closeVisible,
    tabReachesMenu: tabbed.focusInMenu,
    escapeCloses: !escaped.menuOpen,
    focusReturnsToToggle: escaped.focusOnToggle,
    closeButtonCloses: !closedByButton.menuOpen,
  };
  await context.close();

  const desktopContext = await engine.browser.newContext({ viewport: { width: 1280, height: 900 } });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto(`${base}${route}`, { waitUntil: "load" });
  const desktop = await measure(desktopPage);
  record.desktop = { listVisible: desktop.visibleLinks === nav.routes.length, buttonsHidden: !desktop.toggleVisible && !desktop.closeVisible, routeParity: desktop.routeParity };
  await desktopContext.close();

  const noJsContext = await engine.browser.newContext({ ...phone, javaScriptEnabled: false });
  const noJsPage = await noJsContext.newPage();
  await noJsPage.goto(`${base}${route}`, { waitUntil: "load" });
  await noJsPage.focus(".c-nav-toggle");
  await noJsPage.keyboard.press("Enter");
  await noJsPage.waitForTimeout(80);
  const noJs = await measure(noJsPage);
  record.noJs = { keyboardOpens: noJs.menuOpen && noJs.visibleLinks === nav.routes.length };
  await noJsContext.close();
  checks.push(record);
  return checks;
}

/** STATIC LAYER: every page served, axe (WCAG A/AA tags) and 320px reflow, JavaScript on. */
async function staticLayerAudit(chromiumBrowser, base, axeSource) {
  const pages = [];
  for (const route of manifest.staticSite?.routes ?? []) {
    const record = { route, status: 0, axeViolations: [], overflowPx320: 0, pageErrors: [] };
    const context = await chromiumBrowser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    page.on("pageerror", (e) => record.pageErrors.push(String(e.message).slice(0, 300)));
    const res = await page.goto(`${base}${route}`, { waitUntil: "load" });
    record.status = res?.status() ?? 0;
    await page.addScriptTag({ content: axeSource });
    const result = await page.evaluate(async () => {
      const r = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] } });
      return r.violations.map((v) => ({ id: v.id, nodes: v.nodes.length }));
    });
    record.axeViolations = result;
    await page.setViewportSize({ width: 320, height: 800 });
    await page.waitForTimeout(50);
    record.overflowPx320 = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
    await context.close();
    pages.push(record);
  }
  return pages;
}

async function responsiveSweep(chromiumBrowser, pw) {
  const profiles = [];
  let webkit = null;
  let webkitReason = null;
  if (manifest.responsiveSweep.some((p) => p.engine === "webkit")) {
    try {
      webkit = await pw.webkit.launch({ headless: true });
    } catch (e) {
      webkitReason = `webkit could not launch (${String(e.message).split("\n")[0]}); install it in the host with: node node_modules/playwright-core/cli.js install webkit`;
    }
  }
  const shotsDir = join(HOST, "host/evidence/screenshots");
  for (const profile of manifest.responsiveSweep) {
    const browser = profile.engine === "webkit" ? webkit : chromiumBrowser;
    const descriptor = profile.device ? pw.devices[profile.device] : null;
    const hasTouch = Boolean(descriptor?.hasTouch);
    const record = { name: profile.name, engine: profile.engine, mandatory: profile.mandatory, javaScriptEnabled: profile.javaScriptEnabled, hasTouch, available: false, reason: null, pages: [] };
    if (!browser) {
      record.reason = webkitReason ?? "engine unavailable";
      profiles.push(record);
      continue;
    }
    if (profile.device && !descriptor) {
      record.reason = `device descriptor "${profile.device}" is not in this playwright-core registry`;
      profiles.push(record);
      continue;
    }
    log(`sweep ${profile.name} (${profile.engine})`);
    const options = descriptor ? { ...descriptor } : { viewport: profile.viewport };
    // A chromium browser driven through an installed executable ignores defaultBrowserType.
    delete options.defaultBrowserType;
    const context = await browser.newContext({ ...options, javaScriptEnabled: profile.javaScriptEnabled });
    const slug = profile.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    try {
      for (const route of manifest.plannedRoutes) {
        const page = await context.newPage();
        const res = await page.goto(`${BASE}${route}`, { waitUntil: "load", timeout: 60000 });
        const facts = await page.evaluate((minimum) => {
          const visible = (el) => {
            const r = el.getBoundingClientRect();
            const cs = getComputedStyle(el);
            return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none";
          };
          const targets = [...document.querySelectorAll('a[href], button, input:not([type="hidden"]), select, textarea, summary')]
            .filter((el) => visible(el) && !el.matches(":disabled"))
            .filter((el) => {
              const parent = el.closest("p, li, dd, td, blockquote");
              const own = (el.textContent ?? "").trim().length;
              const total = parent ? (parent.textContent ?? "").trim().length : own;
              // WCAG / RF-006 inline exception: a link inside a sentence.
              return !(el.tagName === "A" && getComputedStyle(el).display.startsWith("inline") && total > own + 10);
            })
            .map((el) => {
              const label = el.closest("label");
              const r = (label && el.matches("input") ? label : el).getBoundingClientRect();
              return { size: Math.floor(Math.min(r.width, r.height)), label: `${el.tagName.toLowerCase()}[${(el.textContent ?? label?.textContent ?? "").trim().slice(0, 30)}]` };
            });
          const smallest = targets.length > 0 ? Math.min(...targets.map((t) => t.size)) : null;
          return {
            overflowPx: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
            smallestTouchTargetPx: smallest,
            smallTouchTargets: targets.filter((t) => t.size < minimum).map((t) => `${t.label} ${t.size}px`),
            textLength: (document.body.innerText ?? "").replace(/\s+/g, " ").trim().length,
          };
        }, manifest.touchTargetCssPx);
        const shot = join(shotsDir, slug, `${route === "/" ? "home" : route.replace(/^\//, "").replace(/\//g, "__")}.png`);
        mkdirSync(dirname(shot), { recursive: true });
        await page.screenshot({ path: shot, fullPage: true });
        record.pages.push({ route, status: res?.status() ?? 0, ...facts, screenshot: shot.replace(HOST, "").replace(/\\/g, "/") });
        await page.close();
      }
      record.available = true;
    } catch (e) {
      record.reason = `sweep failed: ${String(e.message).split("\n")[0]}`;
    } finally {
      await context.close();
    }
    profiles.push(record);
  }
  if (webkit) await webkit.close();
  return { profiles };
}

// ------------------------------------------------------------------ main

async function main() {
  const pkg = JSON.parse(readFileSync(join(HOST, "package.json"), "utf8"));
  const declaredDependencies = pkg.dependencies ?? {};
  const declaredDevDependencies = pkg.devDependencies ?? {};
  const installedVersions = Object.fromEntries(
    [...Object.keys(declaredDependencies), ...Object.keys(declaredDevDependencies)].map((n) => [n, installedVersion(n)]),
  );

  const raw = {
    schemaVersion: 1,
    collectedAt: new Date().toISOString(),
    host: {
      node: process.version,
      platform: process.platform,
      nextVersion: installedVersion("next"),
      browser: null,
      playwrightVersion: installedVersion("playwright-core"),
    },
    install: { declaredDependencies, declaredDevDependencies, installedVersions },
    steps: {},
    lint: null,
    builtRoutes: null,
    server: { started: false, url: BASE, error: null },
    routes: [],
    notFoundProbe: null,
    stateFiles: {
      notFound: existsSync(join(HOST, "app/not-found.tsx")),
      error: existsSync(join(HOST, "app/error.tsx")),
      loading: existsSync(join(HOST, "app/loading.tsx")),
    },
    secretScan: { filesScanned: 0, findings: [] },
    audit: { available: false, reason: null, pages: [] },
    vitals: { available: false, reason: null, method: "", pages: [] },
    responsiveSweep: { profiles: [] },
    experiences: { available: false, reason: null, checks: [] },
    navigation: { available: false, reason: null, checks: [] },
    staticLayer: { available: false, reason: null, pages: [] },
    matrix: { engines: [], layers: [] },
  };

  // 1. build, typecheck, lint
  mkdirSync(join(HOST, "host/evidence"), { recursive: true });
  raw.steps.build = runNodeBin("next build", join(HOST, "node_modules/next/dist/bin/next"), ["build"]);
  raw.steps.typecheck = runNodeBin("tsc --noEmit", join(HOST, "node_modules/typescript/bin/tsc"), ["--noEmit"]);
  raw.steps.lint = runNodeBin("eslint", join(HOST, "node_modules/eslint/bin/eslint.js"), [".", "--format", "json", "--output-file", "host/evidence/eslint.json"]);
  try {
    const report = JSON.parse(readFileSync(join(HOST, "host/evidence/eslint.json"), "utf8"));
    raw.lint = {
      errorCount: report.reduce((n, f) => n + f.errorCount, 0),
      warningCount: report.reduce((n, f) => n + f.warningCount, 0),
    };
    const messages = report.flatMap((f) => f.messages.map((m) => `${f.filePath.replace(HOST, "")}:${m.line} ${m.ruleId} ${m.message}`));
    if (messages.length > 0) raw.steps.lint.outputTail = tail(messages.join("\n"));
  } catch {
    raw.lint = null;
  }

  // 2. built routes, from the build's own manifest
  const routesManifest = join(HOST, ".next/app-path-routes-manifest.json");
  if (raw.steps.build.exitCode === 0 && existsSync(routesManifest)) {
    const values = Object.values(JSON.parse(readFileSync(routesManifest, "utf8")));
    raw.builtRoutes = [...new Set(values.filter((r) => !r.startsWith("/_")))].sort();
  }

  if (raw.steps.build.exitCode !== 0) {
    raw.server.error = "production build failed; nothing to serve";
    raw.audit.reason = "production build failed";
    raw.vitals.reason = "production build failed";
    return finish(raw);
  }

  // 3. serve the production output
  const server = spawn(process.execPath, [join(HOST, "node_modules/next/dist/bin/next"), "start", "-p", String(PORT), "-H", "127.0.0.1"], {
    cwd: HOST,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let serverOutput = "";
  server.stdout.on("data", (d) => (serverOutput += d));
  server.stderr.on("data", (d) => (serverOutput += d));
  try {
    raw.server.started = await waitForServer(60000);
    if (!raw.server.started) {
      raw.server.error = `server did not respond within 60s: ${tail(serverOutput, 800)}`;
      raw.audit.reason = "production server did not start";
      raw.vitals.reason = "production server did not start";
      return finish(raw);
    }
    log(`server up at ${BASE}`);

    // 4. served HTML and scripts, JavaScript not executed
    const scriptCache = new Map();
    for (const route of manifest.plannedRoutes) {
      const res = await fetch(`${BASE}${route}`, { redirect: "manual" });
      const html = await res.text();
      const srcs = [...new Set([...html.matchAll(/<script\b[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1]).filter((s) => s.startsWith("/")))];
      const scripts = [];
      for (const src of srcs) {
        if (!scriptCache.has(src)) {
          const r = await fetch(`${BASE}${src}`);
          const body = Buffer.from(await r.arrayBuffer());
          scriptCache.set(src, { src, status: r.status, bytes: body.length, gzipBytes: gzipSync(body, { level: 9 }).length, text: body.toString("utf8") });
        }
        const { text, ...meta } = scriptCache.get(src);
        scripts.push(meta);
      }
      const inlineScriptBytes = [...html.matchAll(/<script\b(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)].reduce((n, m) => n + Buffer.byteLength(m[1]), 0);
      raw.routes.push({ route, status: res.status, html, scripts, inlineScriptBytes });
    }
    const probe = await fetch(`${BASE}${manifest.notFoundProbe.route}`, { redirect: "manual" });
    const probeHtml = await probe.text();
    raw.notFoundProbe = { route: manifest.notFoundProbe.route, status: probe.status, hasNotFoundMarker: probeHtml.includes(manifest.notFoundProbe.marker) };

    // 5. secret scan over build output and served pages
    const patterns = manifest.secretPatterns.map((p) => ({ label: p.label, re: new RegExp(p.source, p.flags) }));
    const files = walkFiles(join(HOST, ".next/static"));
    for (const file of files) {
      const body = readFileSync(file, "utf8");
      for (const p of patterns) if (p.re.test(body)) raw.secretScan.findings.push(`${p.label} in ${file.replace(HOST, "")}`);
    }
    for (const r of raw.routes) {
      for (const p of patterns) if (p.re.test(r.html)) raw.secretScan.findings.push(`${p.label} in served ${r.route}`);
    }
    raw.secretScan.filesScanned = files.length + raw.routes.length;

    // 6-7. browser audit and lab vitals
    const browserPath = findBrowser();
    let chromium = null;
    try {
      chromium = require("playwright-core").chromium;
    } catch (e) {
      raw.audit.reason = `playwright-core is not installed: ${e.message}`;
    }
    if (!browserPath) {
      raw.audit.reason = "no installed Chrome, Edge or Chromium was found; set HOST_BROWSER_PATH";
    }
    raw.vitals.reason = raw.audit.reason;
    if (browserPath && chromium) {
      const browser = await chromium.launch({ executablePath: browserPath, headless: true });
      raw.host.browser = { path: browserPath, version: browser.version() };
      const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
      try {
        for (const route of manifest.plannedRoutes) {
          log(`auditing ${route}`);
          const served = raw.routes.find((r) => r.route === route);
          const scriptsReferenceFavicon = (served?.scripts ?? []).some((s) => scriptCache.get(s.src)?.text.includes("favicon.ico"));
          raw.audit.pages.push(await auditPage(browser, route, axeSource, scriptsReferenceFavicon, served?.html ?? ""));
        }
        raw.audit.available = true;
        raw.audit.reason = null;
        raw.vitals.method = `Chromium ${browser.version()} via CDP: ${manifest.lab.viewport.width}x${manifest.lab.viewport.height} viewport, ${manifest.lab.cpuThrottlingRate}x CPU slowdown, ${manifest.lab.network.latencyMs}ms latency, ${manifest.lab.network.downloadKbps}kbps down, cache disabled; LCP and CLS from PerformanceObserver; INP from Event Timing entries for scripted clicks on non-navigating controls`;
        for (const route of manifest.plannedRoutes) {
          log(`lab vitals ${route}`);
          raw.vitals.pages.push(await labVitals(browser, route));
        }
        raw.vitals.available = true;
        raw.vitals.reason = null;
        const pw = require("playwright-core");
        raw.responsiveSweep = await responsiveSweep(browser, pw);

        // 8. the operation matrix: engines × generated layers.
        const engines = await launchEngines(pw, browser);
        const staticServer = await startStaticServer(PORT + 100);
        const layers = [
          { name: "next", base: BASE, available: true, reason: null },
          { name: "static", base: staticServer.base, available: staticServer.server !== null, reason: staticServer.reason },
        ];
        raw.matrix = {
          engines: engines.map((e) => ({ name: e.name, available: e.browser !== null, reason: e.reason })),
          layers: layers.map((l) => ({ name: l.name, available: l.available, reason: l.reason })),
        };
        try {
          if ((manifest.experiences ?? []).length > 0) {
            try {
              const checks = [];
              for (const engine of engines.filter((e) => e.browser)) {
                for (const layer of layers.filter((l) => l.available)) checks.push(...(await experienceChecks(engine, layer.name, layer.base)));
              }
              raw.experiences = { available: true, reason: null, checks };
            } catch (e) {
              raw.experiences = { available: false, reason: `experience checks failed: ${String(e.message).split("\n")[0]}`, checks: [] };
            }
          } else {
            raw.experiences = { available: true, reason: "no delivered experiences", checks: [] };
          }
          if (manifest.navigation?.compact) {
            try {
              const checks = [];
              for (const engine of engines.filter((e) => e.browser)) {
                for (const layer of layers.filter((l) => l.available)) checks.push(...(await navigationChecks(engine, layer.name, layer.base, pw)));
              }
              raw.navigation = { available: true, reason: null, checks };
            } catch (e) {
              raw.navigation = { available: false, reason: `navigation checks failed: ${String(e.message).split("\n")[0]}`, checks: [] };
            }
          } else {
            raw.navigation = { available: true, reason: "no compact navigation was delivered", checks: [] };
          }
          if (staticServer.server) {
            try {
              raw.staticLayer = { available: true, reason: null, pages: await staticLayerAudit(browser, staticServer.base, axeSource) };
            } catch (e) {
              raw.staticLayer = { available: false, reason: `static layer audit failed: ${String(e.message).split("\n")[0]}`, pages: [] };
            }
          } else {
            raw.staticLayer = { available: false, reason: staticServer.reason, pages: [] };
          }
        } finally {
          staticServer.server?.close();
          for (const engine of engines) if (engine.name !== "chromium" && engine.browser) await engine.browser.close();
        }
      } catch (e) {
        const reason = `browser run failed: ${e.message}`;
        if (!raw.audit.available) raw.audit.reason = reason;
        if (!raw.vitals.available) raw.vitals.reason = reason;
      } finally {
        await browser.close();
      }
    }
  } finally {
    server.kill();
  }
  return finish(raw);
}

function finish(raw) {
  for (const step of ["build", "typecheck", "lint"]) {
    raw.steps[step] ??= { ran: false, exitCode: null, durationMs: 0, outputTail: "did not run" };
  }
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(raw, null, 2)}\n`, "utf8");
  log(`raw evidence written to ${OUT}`);
  return raw;
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error("[host-validate] collector crashed:", e);
    process.exit(2);
  },
);
