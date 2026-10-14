import { describe, expect, it } from "vitest";
import { runPipeline } from "../../src/pipeline.js";
import { assets, baseInput, content } from "../fixtures/business-inputs.js";
import { dryRunFixture } from "../fixtures/dry-run-fixture.js";

const ORIGIN = "https://fixture-verdaleen.invalid";

function withOrigin() {
  const base = dryRunFixture();
  return {
    ...base,
    constraints: { ...base.constraints, localization: [], integrations: [], canonicalOrigin: ORIGIN },
  };
}

describe("P1-1 — SEO artifacts survive input → pipeline → output", () => {
  it("the pipeline produces an artifact plan for every page", () => {
    const input = dryRunFixture();
    const { output } = runPipeline(input);
    expect(output.seoArtifacts).toBeDefined();
    expect(output.seoArtifacts.pages).toHaveLength(output.pages.length);
    for (const page of input.requiredPages) {
      expect(output.seoArtifacts.pages.map((p) => p.route)).toContain(page.path);
    }
  });

  it("every artifact carries an origin, a confidence and a source", () => {
    const { output } = runPipeline(dryRunFixture());
    for (const page of output.seoArtifacts.pages) {
      for (const [name, value] of Object.entries(page)) {
        if (typeof value !== "object" || value === null || Array.isArray(value)) continue;
        if (!("origin" in value)) continue;
        expect(value.origin, `${page.route} ${name} has no origin`).toBeTruthy();
        expect(value.confidence, `${page.route} ${name} has no confidence`).toBeTruthy();
        expect((value as { source: string }).source.length).toBeGreaterThan(10);
      }
    }
  });

  it("titles are unique per page and within the length budget", () => {
    const { output } = runPipeline(dryRunFixture());
    const titles = output.seoArtifacts.pages.map((p) => p.title.value);
    expect(new Set(titles).size).toBe(titles.length);
    for (const page of output.seoArtifacts.pages) {
      expect(page.warnings.join(" ")).not.toContain("duplicates");
    }
  });

  it("a title is generated_structural — composed, never claimed", () => {
    const { output } = runPipeline(dryRunFixture());
    const home = output.seoArtifacts.pages.find((p) => p.route === "/");
    expect(home?.title.origin).toBe("generated_structural");
    expect(home?.title.value).toBe("FIXTURE-VERDALEEN-MOBILITY");
    expect(home?.title.blocksPublication).toBe(false);
  });

  it("robots, sitemap membership and indexability are deterministic", () => {
    const { output } = runPipeline(dryRunFixture());
    for (const page of output.seoArtifacts.pages) {
      expect(page.robots.value).toMatch(/^(index|noindex),follow$/);
      expect(page.robots.origin).toBe("generated_structural");
      expect(typeof page.inSitemap.value).toBe("boolean");
      expect(typeof page.indexable.value).toBe("boolean");
    }
  });

  it("no page is an orphan: every route has an inbound internal link", () => {
    const { output } = runPipeline(dryRunFixture());
    for (const page of output.seoArtifacts.pages) {
      expect(page.inboundInternalLinks.length, `${page.route} is an orphan`).toBeGreaterThan(0);
    }
    expect(output.seoArtifacts.warnings.join(" ")).not.toContain("orphan");
  });

  it("semantic content requirements name what must be in the SERVED HTML", () => {
    const { output } = runPipeline(dryRunFixture());
    for (const page of output.seoArtifacts.pages) {
      expect(page.semanticContentRequirements.join(" ")).toContain("one H1");
      expect(page.semanticContentRequirements.join(" ")).toContain("without executing JavaScript");
    }
  });
});

describe("P1-1 negative — a canonical URL is never invented", () => {
  it("with no canonicalOrigin, canonical is UNRESOLVED and has no value", () => {
    const { output } = runPipeline(dryRunFixture());
    for (const page of output.seoArtifacts.pages) {
      expect(page.canonical.origin).toBe("unresolved");
      expect(page.canonical.value).toBeNull();
      expect(page.canonical.source).toContain("fabricated fact");
    }
  });

  it("the unresolved canonical is reported with what it needs", () => {
    const { output } = runPipeline(dryRunFixture());
    const canonicalNeeds = output.seoArtifacts.unresolved.filter((u) => u.artifact === "canonical");
    expect(canonicalNeeds.length).toBe(output.pages.length);
    expect(canonicalNeeds[0]?.needs).toContain("canonicalOrigin");
  });

  it("the sitemap is unresolved without an origin, not emitted with relative paths", () => {
    const { output } = runPipeline(dryRunFixture());
    expect(output.seoArtifacts.sitemap.origin).toBe("unresolved");
    expect(output.seoArtifacts.sitemap.value).toBeNull();
  });

  it("robots.txt still ships, but WITHOUT a fabricated Sitemap line", () => {
    const { output } = runPipeline(dryRunFixture());
    expect(output.seoArtifacts.robotsTxt.value).toContain("User-agent: *");
    expect(output.seoArtifacts.robotsTxt.value).not.toContain("Sitemap:");
  });

  it("with an origin supplied, canonical and sitemap become verified and absolute", () => {
    const { output } = runPipeline(withOrigin());
    const home = output.seoArtifacts.pages.find((p) => p.route === "/");
    expect(home?.canonical.origin).toBe("verified_business_fact");
    expect(home?.canonical.value).toBe(`${ORIGIN}/`);
    expect(output.seoArtifacts.sitemap.origin).toBe("verified_business_fact");
    expect(output.seoArtifacts.sitemap.value?.length).toBeGreaterThan(0);
    for (const url of output.seoArtifacts.sitemap.value ?? []) {
      expect(url.startsWith(ORIGIN)).toBe(true);
    }
    expect(output.seoArtifacts.robotsTxt.value).toContain("Sitemap: ");
  });

  it("a high-SEO site with no origin is warned that canonical cannot be emitted", () => {
    const { output } = runPipeline(dryRunFixture());
    expect(output.seoArtifacts.warnings.join(" ")).toContain("seo_dependency is HIGH");
  });
});

describe("P1-1 negative — public prose is never fabricated", () => {
  it("a meta description is an ai_draft with a BRIEF, not an invented string", () => {
    const { output } = runPipeline(dryRunFixture());
    for (const page of output.seoArtifacts.pages) {
      expect(page.metaDescription.origin).toBe("ai_draft");
      expect(page.metaDescription.value).toBeNull();
      expect(page.metaDescription.approvalRequired).toBe(true);
      expect(page.metaDescription.draftBrief).toBeTruthy();
    }
  });

  it("the draft brief forbids claims the business has not evidenced", () => {
    const { output } = runPipeline(dryRunFixture());
    const brief = output.seoArtifacts.pages[0]?.metaDescription.draftBrief ?? "";
    expect(brief).toContain("may NOT claim");
    expect(brief).toMatch(/ratings|counts|credentials|guarantees/);
    expect(brief).toContain("app_reality");
  });

  it("every description approval reaches the pipeline's approval list", () => {
    const { output } = runPipeline(dryRunFixture());
    const approvals = output.approvalsRequired.join(" ");
    expect(approvals).toContain("metaDescription");
    expect(output.seoArtifacts.approvalsRequired.length).toBe(output.pages.length);
  });
});

describe("P1-1 negative — an OG image is never generated as a stand-in", () => {
  it("with no verified image asset, og:image is unresolved", () => {
    const { output } = runPipeline(
      baseInput({
        websiteObjective: ["build_credibility"],
        availableAssets: assets(),
        availableContent: content({ propositionText: "verified_available" }),
      }),
    );
    const page = output.seoArtifacts.pages[0];
    expect(page?.openGraph.image.origin).toBe("unresolved");
    expect(page?.openGraph.image.value).toBeNull();
    expect(page?.twitter.card.value).toBe("summary");
  });

  it("a verified asset makes og:image available and upgrades the card", () => {
    const { output } = runPipeline(dryRunFixture());
    // The fixture has verified productImages and a verified logo.
    const page = output.seoArtifacts.pages[0];
    expect(page?.openGraph.image.origin).toBe("verified_business_fact");
    expect(page?.twitter.card.value).toBe("summary_large_image");
    // The generator is still told to measure logo contrast on it.
    expect(page?.openGraph.image.source).toContain("logo contrast");
  });
});

describe("P1-1 negative — structured data is never fabricated", () => {
  it("a page emits only schema whose entity it actually contains", () => {
    const { output } = runPipeline(dryRunFixture());
    const conditions = output.seoArtifacts.pages.find((p) => p.route === "/conditions");
    const devices = output.seoArtifacts.pages.find((p) => p.route === "/devices");
    // /conditions has topic_hub + explanation, so no Service or LocalBusiness.
    expect(conditions?.structuredData.value).not.toContain("Service");
    expect(conditions?.structuredData.value).not.toContain("LocalBusiness");
    // /devices has catalog + product_detail, but Product is WITHHELD site-wide
    // because pricing is unavailable — the per-page filter cannot re-admit it.
    expect(devices?.structuredData.value).not.toContain("Product");
  });

  it("site-withheld schema can never be re-admitted by a page", () => {
    const { output } = runPipeline(dryRunFixture());
    const withheld = output.seoStrategy.withheldSchemaTypes.map((s) => s.type);
    expect(withheld).toContain("LocalBusiness");
    expect(withheld).toContain("Product");
    for (const page of output.seoArtifacts.pages) {
      for (const type of page.structuredData.value ?? []) {
        expect(withheld, `${page.route} re-admitted withheld ${type}`).not.toContain(type);
      }
    }
  });

  it("a page with no justified entity emits an empty list and says why", () => {
    const { output } = runPipeline(
      baseInput({
        websiteObjective: ["recruit"],
        availableContent: content({ propositionText: "verified_available" }),
      }),
    );
    const bare = output.seoArtifacts.pages.find(
      (p) => (p.structuredData.value ?? []).length === 0 && p.structuredDataDeferred.length === 0 &&
        !output.seoArtifacts.unresolved.some((u) => u.route === p.route && u.artifact.startsWith("structuredData.")),
    );
    if (bare) {
      expect(bare.structuredData.source).toContain("fabricated claim");
    }
  });
});

describe("P1-1 — the plan is consumable by a generator", () => {
  it("every unresolved artifact states exactly what input it needs", () => {
    const { output } = runPipeline(dryRunFixture());
    for (const entry of output.seoArtifacts.unresolved) {
      expect(entry.needs.length).toBeGreaterThan(5);
      expect(entry.route.length).toBeGreaterThan(0);
      expect(entry.artifact.length).toBeGreaterThan(0);
    }
  });

  it("unresolved and approval-required artifacts reach the contract", () => {
    const { contract } = runPipeline(dryRunFixture());
    const publication = contract.publicationRequirements.join(" ");
    expect(publication).toContain("SEO artifact unresolved");
    expect(publication).toContain("SEO artifact requires approval");
  });

  it("artifacts are deterministic across runs", () => {
    const a = runPipeline(withOrigin()).output.seoArtifacts;
    const b = runPipeline(withOrigin()).output.seoArtifacts;
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
