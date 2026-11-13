#!/usr/bin/env node
/**
 * BLOG PAGE BROWSER CHECK — accessibility, keyboard, media and responsive evidence.
 *
 *   node tests/browser/blog-browser-check.cjs <url> [<url> …] [--engines chromium,webkit,firefox]
 *        [--widths 320,768,1280] [--out report.json] [--axe /path/to/axe.min.js] [--screenshots dir]
 *
 * Not part of `npm run gate`: it needs a served site and an installed browser. It is the
 * repeatable form of the Phase 5 browser checks for a published blog post, and it prints
 * which engines it could NOT run, rather than skipping them silently.
 *
 * Uses Playwright from the environment (no repository dependency). axe-core is optional:
 * pass --axe with the path to axe.min.js for an independent rule engine's results.
 *
 * Exit: 0 every check passed in every engine that ran · 1 a check failed · 2 bad invocation
 * or no engine could run.
 */
const fs = require("fs");
const path = require("path");

function args(argv) {
  const out = { urls: [], engines: ["chromium", "webkit", "firefox"], widths: [320, 768, 1280], out: null, axe: null, screenshots: null, routeBase: "/blog" };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--engines") out.engines = argv[++i].split(",");
    else if (a === "--widths") out.widths = argv[++i].split(",").map(Number);
    else if (a === "--out") out.out = argv[++i];
    else if (a === "--axe") out.axe = argv[++i];
    else if (a === "--screenshots") out.screenshots = argv[++i];
    else if (a === "--route-base") out.routeBase = argv[++i];
    else out.urls.push(a);
  }
  return out;
}

/** Runs inside the page: static semantics, contrast, media. */
function pageAudit() {
  const results = [];
  const add = (id, pass, detail) => results.push({ id, pass, detail });
  // Everything the blog branch renders sits in .c-blog (the post's <article>, the index's <section>).
  // Checks are scoped to it: the rest of the page is the site's own and is reported only where it affects the post.
  const article = document.querySelector(".c-blog") || document.querySelector("main") || document.body;

  // ---- headings
  const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => Number(h.tagName[1]));
  const skips = headings.filter((l, i) => i > 0 && l > headings[i - 1] + 1).length;
  add("headings.single-h1", headings.filter((l) => l === 1).length === 1, `${headings.filter((l) => l === 1).length} h1 on the page`);
  add("headings.no-skipped-level", skips === 0, `levels in order: ${headings.join(",")}`);

  // ---- landmarks and language
  add("landmarks.main", document.querySelectorAll("main").length === 1, `${document.querySelectorAll("main").length} <main>`);
  add("document.lang", !!document.documentElement.lang, `lang="${document.documentElement.lang}"`);
  add("document.title", document.title.trim().length > 0, `title="${document.title}"`);

  // ---- images
  const imgs = [...article.querySelectorAll("img")];
  const noAttr = imgs.filter((i) => !i.hasAttribute("alt"));
  const empty = imgs.filter((i) => i.getAttribute("alt") === "");
  add("images.alt-attribute", noAttr.length === 0, `${imgs.length} images, ${noAttr.length} without an alt attribute`);
  add("images.alt-text-supplied", empty.length === 0, `${empty.length} image(s) with empty alt (decorative, or alt text not supplied — the validation report says which)`);
  add("images.dimensions", imgs.every((i) => i.getAttribute("width") || i.closest("picture") || i.currentSrc.includes("/_next/image")), "width/height present");
  add("images.loaded", imgs.every((i) => i.complete && i.naturalWidth > 0), `${imgs.filter((i) => !(i.complete && i.naturalWidth > 0)).length} not loaded`);

  // ---- video and audio
  const media = [...article.querySelectorAll("video,audio")];
  add("media.controls", media.every((m) => m.controls), `${media.length} player(s); all have native controls: ${media.every((m) => m.controls)}`);
  add("media.no-autoplay", media.every((m) => !m.autoplay), "no autoplay");
  const videos = [...article.querySelectorAll("video")];
  add("video.captions-track", videos.every((v) => v.querySelector("track[kind=subtitles],track[kind=captions]")), `${videos.filter((v) => !v.querySelector("track")).length} video(s) without a captions/subtitles track`);

  // ---- accessible names
  const unnamed = [...article.querySelectorAll("a,button,summary,iframe,[role=region]")].filter((el) => {
    const name = (el.getAttribute("aria-label") || el.getAttribute("title") || el.textContent || "").trim() || (el.getAttribute("aria-labelledby") && document.getElementById(el.getAttribute("aria-labelledby"))?.textContent?.trim());
    return !name;
  });
  add("names.interactive", unnamed.length === 0, unnamed.length ? `unnamed: ${unnamed.slice(0, 4).map((e) => e.outerHTML.slice(0, 60)).join(" | ")}` : "every link, button, summary, frame and region has a name");

  // ---- tables
  const tables = [...article.querySelectorAll("table")];
  add("tables.headers", tables.every((t) => t.querySelector("th") || t.rows.length <= 1), `${tables.length} table(s)`);
  add("tables.scroll-region-focusable", tables.every((t) => t.parentElement.matches("[role=region][tabindex='0']")), "each table in a focusable, labelled region");

  // ---- contrast (WCAG 2.x relative luminance) for every text-bearing element in the article
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const lum = ({ r, g, b }) => [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
  const blend = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
  const background = (el) => {
    const layers = [];
    for (let n = el; n; n = n.parentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c && c.a > 0) layers.push(c);
      if (c && c.a === 1) break;
    }
    let bg = { r: 255, g: 255, b: 255, a: 1 };
    for (const layer of layers.reverse()) bg = blend(layer, bg);
    return bg;
  };
  const failures = [];
  let checked = 0;
  for (const el of article.querySelectorAll("*")) {
    // Emoji are drawn in their own colours; a text-colour contrast ratio does not describe them.
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim() && !/^[\p{Extended_Pictographic}\uFE0F\u200D\s]+$/u.test(n.textContent.trim()));
    if (!own || el.closest("[data-blog-review]")) continue;
    const style = getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none" || el.getClientRects().length === 0) continue;
    const fg = parse(style.color);
    if (!fg) continue;
    const bg = background(el);
    const L1 = lum(blend(fg, bg)), L2 = lum(bg);
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const size = parseFloat(style.fontSize);
    const large = size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700);
    const need = large ? 3 : 4.5;
    checked += 1;
    if (ratio < need) failures.push(`${el.tagName.toLowerCase()}.${el.className || ""} "${el.textContent.trim().slice(0, 30)}" ${ratio.toFixed(2)}:1 < ${need}`);
  }
  add("contrast.text", failures.length === 0, failures.length ? `${failures.length} of ${checked}: ${failures.slice(0, 4).join(" | ")}` : `${checked} text elements meet 4.5:1 (3:1 large)`);

  // ---- responsive
  const de = document.documentElement;
  add("responsive.no-horizontal-scroll", de.scrollWidth <= de.clientWidth, `scrollWidth ${de.scrollWidth}, viewport ${de.clientWidth}`);
  const wide = [...article.querySelectorAll("img,video,iframe,pre,table")].filter((el) => {
    const box = el.getBoundingClientRect();
    const scroller = el.closest(".c-blog-table-scroll,pre");
    return box.right > de.clientWidth + 1 && !(scroller && scroller !== el && scroller.getBoundingClientRect().right <= de.clientWidth + 1);
  });
  add("responsive.media-fits", wide.length === 0, `${wide.length} element(s) wider than the viewport outside a scroll region`);
  return results;
}

async function keyboard(page) {
  // Tab through the page: every stop must be visible and show a focus indicator; order must follow the document.
  const stops = [];
  for (let i = 0; i < 80; i += 1) {
    await page.keyboard.press("Tab");
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const box = el.getBoundingClientRect();
      const focused = getComputedStyle(el);
      const indicator = (focused.outlineStyle !== "none" && parseFloat(focused.outlineWidth) > 0) || (focused.boxShadow && focused.boxShadow !== "none");
      // Focus inside a native <video>/<audio> control bar lives in the browser's own shadow DOM: the page
      // cannot measure its indicator. Reported separately, never counted as a pass.
      const native = el.tagName === "VIDEO" || el.tagName === "AUDIO";
      const all = [...document.querySelectorAll("*")];
      return { tag: el.tagName.toLowerCase(), text: (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 40), index: all.indexOf(el), visible: box.width > 0 && box.height > 0 && box.bottom > 0 && box.top < innerHeight && box.right > 0 && box.left < innerWidth, indicator, native };
    });
    if (!info) break;
    if (stops.length && stops[0].index === info.index) break; // wrapped around
    stops.push(info);
  }
  const outOfOrder = stops.filter((s, i) => i > 0 && s.index < stops[i - 1].index).length;
  const blocksBefore = await page.evaluate(() => {
    const main = document.querySelector("main") || document.querySelector("article");
    if (!main) return 0;
    return [...document.querySelectorAll("a[href],button,summary,[tabindex]")].filter((el) => el.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING && !main.contains(el) && !/skip/i.test(el.textContent || "")).length;
  });
  return [
    { id: "keyboard.reachable", pass: stops.length > 0, detail: `${stops.length} tab stop(s)` },
    { id: "keyboard.bypass-blocks", pass: blocksBefore === 0 || /skip/i.test(stops[0]?.text ?? ""), detail: blocksBefore === 0 ? `no navigation before the main content (${stops[0]?.tag} "${stops[0]?.text}" is the first stop): nothing to bypass` : `${blocksBefore} focusable element(s) before the main content; first stop: ${stops[0]?.tag} "${stops[0]?.text}"` },
    { id: "keyboard.focus-visible", pass: stops.filter((s) => !s.native).every((s) => s.visible && s.indicator), detail: `${stops.filter((s) => !s.native && !(s.visible && s.indicator)).length} page-owned stop(s) without a visible focus indicator${stops.filter((s) => !s.native && !(s.visible && s.indicator)).slice(0, 3).map((s) => `: ${s.tag} "${s.text}"`).join(",")}` },
    { id: "keyboard.native-media-controls", pass: true, notMeasured: stops.some((s) => s.native), detail: stops.some((s) => s.native) ? `${stops.filter((s) => s.native).length} stop(s) inside native media controls: focus ring drawn by the browser — NOT MEASURED, check visually` : "no native media controls in the tab order" },
    { id: "keyboard.order-follows-document", pass: outOfOrder === 0, detail: `${outOfOrder} backward jump(s)` },
  ];
}

/** Every in-page step is time-boxed: a check that hangs reports a failure, never waits forever. */
function within(ms, promise, label) {
  return Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve({ timedOut: label }), ms))]);
}

async function mediaRuntime(page) {
  const result = await within(20000, page.evaluate(async () => {
    const out = [];
    const v = document.querySelector("article video");
    if (v) {
      v.muted = true;
      let played = false;
      try {
        // play() never settles for a file the browser cannot decode: give it five seconds.
        const started = await Promise.race([v.play().then(() => true, () => false), new Promise((r) => setTimeout(() => r(false), 5000))]);
        await new Promise((r) => setTimeout(r, 700));
        played = started && v.currentTime > 0;
        v.pause();
      } catch (e) {
        played = false;
      }
      out.push({ id: "video.plays", pass: played, detail: `currentTime ${v.currentTime.toFixed(2)}s` });
      const track = v.querySelector("track");
      if (track) {
        track.track.mode = "showing";
        await new Promise((r) => setTimeout(r, 300));
        out.push({ id: "video.captions-load", pass: track.readyState === 2 && track.track.cues && track.track.cues.length > 0, detail: `track readyState ${track.readyState}, ${track.track.cues ? track.track.cues.length : 0} cue(s)` });
      }
    }
    const anim = document.querySelector("details.c-blog-animation");
    if (anim) {
      const img = anim.querySelector("img");
      const shown = img.getBoundingClientRect().height > 0;
      anim.open = false;
      const hidden = !img.checkVisibility();
      anim.open = true;
      out.push({ id: "animation.can-be-hidden", pass: shown && hidden, detail: `shown ${shown}, hidden after closing ${hidden}` });
    }
    const embed = document.querySelector("details.c-blog-embed");
    if (embed) {
      const before = performance.getEntriesByType("resource").some((e) => /youtube|vimeo|loom/.test(e.name));
      out.push({ id: "embed.no-request-before-open", pass: !before && !embed.open, detail: `requested before opening: ${before}` });
    }
    return out;
  }), "media checks");
  return Array.isArray(result) ? result : [{ id: "media.checks-completed", pass: false, detail: "the media checks did not finish within 20 s" }];
}

async function main() {
  const opts = args(process.argv.slice(2));
  if (opts.urls.length === 0) {
    console.error("usage: node tests/browser/blog-browser-check.cjs <url> [...] [--engines chromium,webkit,firefox] [--widths 320,768,1280] [--axe axe.min.js] [--out report.json]");
    process.exit(2);
  }
  const playwright = require("playwright");
  const report = { at: new Date().toISOString(), engines: {}, notRun: [] };
  let failed = 0;
  for (const name of opts.engines) {
    let browser;
    try {
      if (!fs.existsSync(playwright[name].executablePath())) throw new Error(`${name} is not installed in this environment`);
      browser = await playwright[name].launch();
    } catch (error) {
      report.notRun.push({ engine: name, reason: String(error.message).split("\n")[0] });
      continue;
    }
    report.engines[name] = { version: browser.version(), pages: [] };
    for (const url of opts.urls) {
      for (const width of opts.widths) {
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        const errors = [];
        page.on("pageerror", (e) => errors.push(String(e)));
        page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
        const failedRequests = [];
        page.on("response", (r) => r.status() >= 400 && failedRequests.push(`${r.status()} ${r.url()}`));
        await page.goto(url, { waitUntil: "load" });
        await within(15000, page.evaluate(async () => {
          for (const i of document.images) i.loading = "eager";
          await Promise.all([...document.images].map((i) => (i.complete ? 1 : new Promise((r) => { i.onload = i.onerror = r; }))));
        }), "images");
        const audit = await within(30000, page.evaluate(pageAudit), "page audit");
        const keys = await within(60000, keyboard(page), "keyboard");
        const checks = [
          ...(Array.isArray(audit) ? audit : [{ id: "audit.completed", pass: false, detail: "the page audit did not finish within 30 s" }]),
          ...(Array.isArray(keys) ? keys : [{ id: "keyboard.completed", pass: false, detail: "the keyboard walk did not finish within 60 s" }]),
          ...(await mediaRuntime(page)),
        ];
        // Console errors that only repeat a failed request are covered by the request checks below.
        const ownErrors = errors.filter((e) => !/^Failed to load resource/.test(e));
        checks.push({ id: "runtime.console-errors", pass: ownErrors.length === 0, detail: ownErrors.slice(0, 3).join(" | ") || "none (failed resource loads are listed by the request checks)" });
        // A failed request for a blog file is the blog's failure. One for the site's own files existed before the
        // post did: it is reported as SITE-OWNED, never hidden, and never counted as the blog passing or failing.
        const blogPath = (u) => { try { return new URL(u.split(" ").pop()).pathname.startsWith(opts.routeBase); } catch { return false; } };
        const blogFailed = failedRequests.filter(blogPath);
        const siteFailed = failedRequests.filter((u) => !blogPath(u));
        checks.push({ id: "runtime.failed-requests", pass: blogFailed.length === 0, detail: blogFailed.slice(0, 3).join(" | ") || "none under the blog route" });
        if (siteFailed.length > 0) checks.push({ id: "site.failed-requests", pass: true, siteOwned: true, detail: siteFailed.slice(0, 3).join(" | ") });
        let axe = null;
        if (opts.axe) {
          await page.addScriptTag({ path: opts.axe });
          axe = await page.evaluate(async () => {
            const r = await window.axe.run(document.querySelector(".c-blog") || document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] } });
            return { violations: r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help, targets: v.nodes.slice(0, 3).map((n) => n.target.join(" ")) })), passes: r.passes.length, incomplete: r.incomplete.map((v) => v.id) };
          });
        }
        if (opts.screenshots) {
          fs.mkdirSync(opts.screenshots, { recursive: true });
          await page.screenshot({ path: path.join(opts.screenshots, `${name}-${width}-${opts.urls.indexOf(url)}.png`), fullPage: true });
        }
        const bad = checks.filter((c) => !c.pass);
        failed += bad.length;
        report.engines[name].pages.push({ url, width, checks, axe });
        console.log(`${name.padEnd(8)} ${String(width).padStart(4)}px ${url}  ${checks.length - bad.length}/${checks.length} pass${axe ? ` · axe: ${axe.violations.length} violation rule(s), ${axe.passes} passing` : ""}`);
        for (const c of bad) console.log(`         FAIL ${c.id}: ${c.detail}`);
        for (const c of checks.filter((x) => x.notMeasured)) console.log(`         NOT MEASURED ${c.id}: ${c.detail}`);
        for (const c of checks.filter((x) => x.siteOwned)) console.log(`         SITE-OWNED ${c.id}: ${c.detail}`);
        if (axe) for (const v of axe.violations) console.log(`         AXE  ${v.impact} ${v.id} (${v.nodes}): ${v.help} — ${v.targets.join(", ")}`);
        await page.close();
      }
    }
    await browser.close();
  }
  for (const n of report.notRun) console.log(`NOT RUN  ${n.engine}: ${n.reason}`);
  if (opts.out) fs.writeFileSync(opts.out, `${JSON.stringify(report, null, 2)}\n`);
  if (Object.keys(report.engines).length === 0) process.exit(2);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(2);
});
