/**
 * REGRESSIONS for defects the FIRST REAL HOST AUDIT found — each invisible to the
 * static-only run, because nothing had rendered the pages in a browser before.
 *
 *  1. The palette checked text contrast at 4.5:1 while AAA (7:1) was requested.
 *  2. Interactive targets had no minimum except buttons; nav links measured 24px
 *     and a footer link 7px on an AAA site.
 *  3. Footer links used the raw route ("/") as their text.
 */
import { describe, expect, it } from "vitest";
import { runPipeline } from "../../src/pipeline.js";
import { generateWebsite } from "../../src/generation/generate-website.js";
import { walkNodes } from "../../src/generation/component-model.js";
import { buildPalette } from "../../src/design-system/tokens/palette.js";
import { baseInput } from "../fixtures/business-inputs.js";
import { dryRunFixture } from "../fixtures/dry-run-fixture.js";

describe("finding 1 — the requested accessibility target reaches the palette", () => {
  it("an AAA business gets tokens whose every text pair reaches 7:1 in every theme", () => {
    const { output } = runPipeline(dryRunFixture());
    expect(output.accessibilityStrategy.target).toBe("wcag_aaa_or_equivalent");
    const textPairs = output.tokens.color.values.contrast.filter((c) => c.target !== 3);
    expect(textPairs.length).toBeGreaterThan(0);
    for (const pair of textPairs) {
      expect(pair.target, pair.pair).toBe(7);
      expect(pair.ratio, `${pair.theme} ${pair.pair}`).toBeGreaterThanOrEqual(7);
    }
    expect(output.tokens.color.values.contrastFailures).toEqual([]);
  });

  it("the accent label pair — the one the audit measured at 5.19:1 — now reaches 7:1", () => {
    const { output } = runPipeline(dryRunFixture());
    const accent = output.tokens.color.values.contrast.filter((c) => c.pair === "accent-1-on on accent-1");
    expect(accent.length).toBeGreaterThan(0);
    for (const pair of accent) expect(pair.ratio, pair.theme).toBeGreaterThanOrEqual(7);
  });

  it("negative: an AA business keeps the AA palette, identical to the Python authority's defaults", () => {
    const { output } = runPipeline(baseInput());
    for (const pair of output.tokens.color.values.contrast) expect([4.5, 3]).toContain(pair.target);
    const aa = buildPalette("#2F6FEB", "DUAL");
    const explicitAa = buildPalette("#2F6FEB", "DUAL", { text: 4.5, ui: 3.0 });
    expect(explicitAa.semantic).toEqual(aa.semantic);
  });

  it("UI boundary pairs stay at 3:1 at AAA; only text pairs tighten", () => {
    const aaa = buildPalette("#2F6FEB", "DUAL", { text: 7, ui: 3 });
    expect(aaa.checks.find((c) => c.pair === "border on bg-0")?.target).toBe(3);
    expect(aaa.checks.find((c) => c.pair === "fg-0 on bg-0")?.target).toBe(7);
  });
});

describe("finding 2 — interactive targets reach the requested minimum", () => {
  it("an AAA site's stylesheet gives links, buttons, summaries and fields a 44px minimum", () => {
    const input = dryRunFixture();
    const { output, contract } = runPipeline(input);
    const css = generateWebsite(input, output, contract).files["static/styles.css"] ?? "";
    expect(css).toContain("§G.1 target size: 44px minimum");
    expect(css).toMatch(/\.c-nav a, \.c-site-footer a, \.c-brand, \.c-action, button, summary, \.c-definition-list dd > a \{[^}]*min-block-size: 44px;[^}]*min-inline-size: 44px;/);
  });

  it("negative: an AA site gets the AA 24px minimum for fine pointers — and 44px only on coarse pointers (RF-006)", () => {
    const input = baseInput();
    const { output, contract } = runPipeline(input);
    const css = generateWebsite(input, output, contract).files["static/styles.css"] ?? "";
    expect(css).toContain("§G.1 target size: 24px minimum");
    const [fine, coarse] = css.split("@media (pointer: coarse)");
    expect(fine).toContain("min-block-size: 24px");
    expect(fine?.slice(fine.indexOf("§G.1 target size"))).not.toContain("min-block-size: 44px");
    expect(coarse).toContain("min-block-size: 44px");
  });
});

describe("finding 3 — footer links name their destination", () => {
  it("footer link text is the page label, never the raw route", () => {
    const input = dryRunFixture();
    const { output, contract } = runPipeline(input);
    const site = generateWebsite(input, output, contract);
    walkNodes(site.model, (n) => {
      if (n.kind !== "site_footer") return;
      for (const item of n.items ?? []) {
        expect(item.text, `footer link to ${item.detail}`).not.toMatch(/^\//);
      }
    });
    expect(site.files["static/index.html"]).toContain('<footer class="c-site-footer"><nav aria-label="Footer"><ul><li><a href="/">Home</a></li>');
  });
});
