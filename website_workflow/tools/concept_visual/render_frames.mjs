#!/usr/bin/env node
/**
 * render_frames.mjs — called by tools/build_concept_visual.py.
 * Opens a generated preview page in headless Chromium and asks the runtime
 * for exact frames (ConceptVisual.get(slot).frame(t)). No screen recording:
 * every frame is a pure function of the spec and the time, so the GIF, the
 * video and the poster are the same picture as the live embed.
 *
 *   node render_frames.mjs --page <preview.html> --slot <slot> --out <dir>
 *        --fps 20 --width 800 --height 752 [--poster-scale 2]
 * Prints one JSON line: {"duration":…, "frames":…, "poster_at":…}
 * Exit: 0 ok · 2 bad invocation / Playwright missing · 4 visual did not mount.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const a = { fps: 20, width: 800, height: 752, posterScale: 2 };
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 2) {
  const k = argv[i].replace(/^--/, "").replace(/-([a-z])/g, (_m, c) => c.toUpperCase());
  a[k] = ["page", "slot", "out"].includes(k) ? argv[i + 1] : Number(argv[i + 1]);
}
if (!a.page || !a.slot || !a.out) { console.error("required: --page --slot --out"); process.exit(2); }

async function chromium() {
  const require = createRequire(import.meta.url);
  const roots = ["", ...(process.env.NODE_PATH || "").split(path.delimiter).filter(Boolean)];
  for (const name of ["playwright", "@playwright/test"]) {
    try { return (await import(name)).chromium; } catch { /* next */ }
    for (const r of roots) { try { return require(r ? path.join(r, name) : name).chromium; } catch { /* next */ } }
  }
  console.error("Playwright is not installed — exports need it (it is the QA dependency this tool reuses).");
  process.exit(2);
}

const browser = await (await chromium()).launch();
const url = pathToFileURL(path.resolve(a.page)).href;
fs.mkdirSync(a.out, { recursive: true });

async function open(scale) {
  const ctx = await browser.newContext({ viewport: { width: a.width, height: a.height }, deviceScaleFactor: scale });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "load" });
  await page.evaluate(() => (document.fonts && document.fonts.ready) || true);
  const ok = await page.waitForFunction(s => window.ConceptVisual && window.ConceptVisual.get(s), a.slot, { timeout: 8000 }).then(() => true, () => false);
  return { ctx, page, ok };
}
const save = (file, dataUrl) => fs.writeFileSync(file, Buffer.from(dataUrl.split(",")[1], "base64"));

let { ctx, page, ok } = await open(1);
if (!ok) { console.error(`the visual "${a.slot}" did not mount in ${a.page}`); await browser.close(); process.exit(4); }
const info = await page.evaluate(s => { const v = window.ConceptVisual.get(s); return { duration: v.duration, posterAt: v.posterAt }; }, a.slot);
const total = Math.round(info.duration * a.fps);
for (let i = 0; i < total; i++) {
  const png = await page.evaluate(([s, t]) => window.ConceptVisual.get(s).frame(t), [a.slot, i / a.fps]);
  save(path.join(a.out, `f_${String(i + 1).padStart(5, "0")}.png`), png);
}
await ctx.close();

({ ctx, page, ok } = await open(a.posterScale));
save(path.join(a.out, "poster.png"), await page.evaluate(([s, t]) => window.ConceptVisual.get(s).frame(t), [a.slot, info.posterAt]));
await ctx.close();
await browser.close();
console.log(JSON.stringify({ duration: info.duration, frames: total, poster_at: info.posterAt }));
