#!/usr/bin/env node
/**
 * capture_visual.mjs — RUNG 2 of website_workflow/asset_production.md.
 *
 * Renders a code-drawn visual from the BUILT page in a headless browser and
 * writes files captured from it: a poster PNG (the static frame used for
 * first paint, reduced motion and social share) and, optionally, a looping
 * WebM for places that need a file rather than live code.
 * Capturing from the shipped visual means poster and animation cannot drift.
 *
 * Usage:
 *   node website_workflow/tools/capture_visual.mjs \
 *     --url file:///abs/site/index.html --selector '[data-visual="hero"]' \
 *     --out public/img --name hero [--poster-at 2500] [--loop 12]
 *     [--width 1440] [--height 900] [--scale 2] [--hide 'header,.cookie']
 *     [--reduced-motion] [--transparent]
 *
 *   --poster-at <ms>   wait this long after load before the poster frame
 *   --loop <seconds>   also record a WebM of the visual for that long
 *   --hide <css>       elements to hide while capturing (sticky chrome)
 *   --reduced-motion   capture with prefers-reduced-motion: reduce
 *   --transparent      poster with a transparent background
 *
 * Needs Playwright (already in the stack for QA). Output is a CANDIDATE:
 * look at it before it ships (asset_production.md SELF-CURATION), convert
 * the PNG to WebP/AVIF in the site's image pipeline, and record this command
 * in the provenance record.
 * Exit: 0 written · 2 bad invocation · 4 the selector matched nothing.
 */
import fs from "node:fs";
import path from "node:path";

function args(argv) {
  const a = { width: 1440, height: 900, scale: 2, posterAt: 2000, name: "visual" };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = () => argv[++i];
    if (k === "--url") a.url = v();
    else if (k === "--selector") a.selector = v();
    else if (k === "--out") a.out = v();
    else if (k === "--name") a.name = v();
    else if (k === "--poster-at") a.posterAt = Number(v());
    else if (k === "--loop") a.loop = Number(v());
    else if (k === "--width") a.width = Number(v());
    else if (k === "--height") a.height = Number(v());
    else if (k === "--scale") a.scale = Number(v());
    else if (k === "--hide") a.hide = v();
    else if (k === "--reduced-motion") a.reduced = true;
    else if (k === "--transparent") a.transparent = true;
    else { console.error(`unknown argument ${k}`); process.exit(2); }
  }
  if (!a.url || !a.selector || !a.out) {
    console.error("required: --url --selector --out   (see the header of this file)");
    process.exit(2);
  }
  return a;
}

async function loadChromium() {
  for (const name of ["playwright", "@playwright/test"]) {
    try { return (await import(name)).chromium; } catch { /* try the next */ }
  }
  // A globally installed Playwright is not on a project's ESM path.
  const { createRequire } = await import("node:module");
  const require = createRequire(import.meta.url);
  for (const name of ["playwright", "@playwright/test"]) {
    try { return require(name).chromium; } catch { /* try the next */ }
  }
  const roots = (process.env.NODE_PATH || "").split(path.delimiter).filter(Boolean);
  for (const r of roots) {
    try { return require(path.join(r, "playwright")).chromium; } catch { /* next */ }
  }
  console.error("Playwright is not installed here — it is the QA dependency this tool reuses.");
  process.exit(2);
}

const a = args(process.argv.slice(2));
const chromium = await loadChromium();
fs.mkdirSync(a.out, { recursive: true });
const browser = await chromium.launch();
const hideCss = a.hide ? `${a.hide}{visibility:hidden !important}` : "";

async function open(ctxOptions) {
  const ctx = await browser.newContext({
    reducedMotion: a.reduced ? "reduce" : "no-preference", ...ctxOptions });
  const page = await ctx.newPage();
  await page.goto(a.url, { waitUntil: "load" });
  if (hideCss) await page.addStyleTag({ content: hideCss });
  return { ctx, page };
}

// ---- poster
let { ctx, page } = await open({ viewport: { width: a.width, height: a.height },
                                 deviceScaleFactor: a.scale });
const el = page.locator(a.selector).first();
if (await el.count() === 0) {
  console.error(`selector matched nothing: ${a.selector}`);
  await browser.close();
  process.exit(4);
}
await el.scrollIntoViewIfNeeded();
await page.waitForTimeout(a.posterAt);
const posterPath = path.join(a.out, `${a.name}-poster${a.reduced ? "-reduced" : ""}.png`);
await el.screenshot({ path: posterPath, omitBackground: !!a.transparent });
const box = await el.boundingBox();
const scroll = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
await ctx.close();
const written = [posterPath];

// ---- loop: a second context whose viewport IS the element's box
if (a.loop && box) {
  const w = Math.max(2, Math.round(box.width / 2) * 2);
  const h = Math.max(2, Math.round(box.height / 2) * 2);
  const tmp = fs.mkdtempSync(path.join(a.out, ".capture-"));
  ({ ctx, page } = await open({ viewport: { width: a.width, height: a.height },
                                recordVideo: { dir: tmp, size: { width: w, height: h } } }));
  // Pin the visual to the top-left of a viewport exactly its size.
  await page.setViewportSize({ width: w, height: h });
  await page.evaluate(([sel]) => {
    const n = document.querySelector(sel);
    if (!n) return;
    Object.assign(n.style, { position: "fixed", left: "0", top: "0", width: "100vw",
                             height: "100vh", zIndex: "2147483647", margin: "0" });
    window.dispatchEvent(new Event("resize"));
  }, [a.selector]);
  await page.waitForTimeout(a.loop * 1000);
  const video = page.video();
  await ctx.close();
  const loopPath = path.join(a.out, `${a.name}-loop.webm`);
  fs.renameSync(await video.path(), loopPath);
  fs.rmSync(tmp, { recursive: true, force: true });
  written.push(loopPath);
}
await browser.close();

for (const f of written) console.log(`${f}  ${(fs.statSync(f).size / 1024).toFixed(1)} KB`);
console.log(`captured from ${a.url} ${a.selector} at scroll ${scroll.x},${scroll.y} — ` +
            "a candidate: look at it before it ships.");
