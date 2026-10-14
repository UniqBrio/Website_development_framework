/**
 * REMEDIATION PHASE 2 — per-value provenance (C2), extended from AI drafts and
 * engagement data to business facts and supplied files.
 *
 * All fixtures are SYNTHETIC (`FIXTURE-*`).
 */
import { describe, expect, it } from "vitest";
import { runPipeline } from "../../src/pipeline.js";
import { generateWebsite } from "../../src/generation/generate-website.js";
import { resolvePublication } from "../../src/content/publication.js";
import { PROVENANCE_VALUES, resolveProvenance } from "../../src/content/provenance.js";
import { baseInput, assets, content } from "../fixtures/business-inputs.js";
import type { BusinessInputDraft } from "../../src/design-intelligence/types/business-input.js";

const APPROVAL = { approvedBy: "TEST-ONLY simulated approver", approvedAt: "2026-09-16" };
const LOGO_FILE = { src: "/brand/fixture-logo.png", width: 512, height: 512, alt: "FIXTURE logo" };

function logoSite(source: BusinessInputDraft["sources"], assetSources?: Record<string, string>) {
  const input = baseInput({
    businessName: "FIXTURE-BRAND",
    sources: source,
    availableAssets: assets({ logo: "verified_available" }),
    availableContent: content({ propositionText: "verified_available" }),
  });
  const decided = runPipeline(input);
  const site = generateWebsite(input, decided.output, decided.contract, {
    suppliedContent: { assets: { logo: LOGO_FILE }, ...(assetSources ? { assetSources } : {}) },
  });
  return { decided, site };
}

const cleanSource = [{ id: "brand-kit", kind: "customer_asset" as const, description: "FIXTURE brand kit", publication: "authorized" as const }];
const aiSource = [
  {
    id: "unclear-logo",
    kind: "customer_asset" as const,
    description: "FIXTURE logo of unclear origin",
    publication: "authorized" as const,
    file: {
      path: "raw/fixture-logo.png",
      contentCredentials: {
        statement: "FIXTURE: this file may have been created or modified by an AI tool.",
        generator: "FIXTURE generator",
        originConfidence: "unknown" as const,
        signatureValidated: false,
      },
    },
  },
];

describe("C2 — per-value provenance covers business facts and supplied files", () => {
  it("the provenance vocabulary has one home and resolves every value it can carry", () => {
    expect(PROVENANCE_VALUES).toContain("public_source");
    expect(PROVENANCE_VALUES).toContain("operator_inference");
    expect(resolveProvenance("x", { provenance: "public_source", source: "FIXTURE" }, "business").status).toBe("unverified");
    expect(resolveProvenance("x", { provenance: "public_source", source: "FIXTURE", approval: APPROVAL }, "business").status).toBe("verified");
    // An inference is never a fact, with or without an approval.
    expect(resolveProvenance("x", { provenance: "operator_inference", source: "FIXTURE", approval: APPROVAL }, "business").status).toBe("unverified");
  });

  it("negative: a FACT is stricter than a name — an approved AI draft publishes as copy, never as a fact", () => {
    const sources = cleanSource;
    const aiDraft = { provenance: "approved_ai_draft" as const, source: "FIXTURE", sourceId: "brand-kit", approval: APPROVAL };
    expect(resolvePublication(aiDraft, sources, "literal").state).toBe("published");
    expect(resolvePublication(aiDraft, sources, "fact").state).toBe("refused");
    expect(resolvePublication({ provenance: "customer_supplied_unverified", source: "FIXTURE", sourceId: "brand-kit" }, sources, "fact").state).toBe("held");
    expect(resolvePublication({ provenance: "customer_supplied_verified", source: "FIXTURE", sourceId: "brand-kit" }, sources, "fact").state).toBe("published");
  });

  it("negative: a file whose content credentials cannot confirm its origin is refused, even when the inventory says verified", () => {
    const { site } = logoSite(aiSource, { logo: "unclear-logo" });
    expect(site.content.assets.logo).toBeNull();
    const refusal = site.content.assets.refused.find((r) => r.asset === "logo");
    expect(refusal?.because).toContain("content credentials do not confirm its origin");
    expect(refusal?.because).toContain("not AI-created or AI-altered");
    expect(JSON.stringify(site.files)).not.toContain("/brand/fixture-logo.png");
  });

  it("negative: an asset citing a source that is not authorised for publication is refused", () => {
    const restricted = [{ ...cleanSource[0]!, publication: "not_authorized" as const, restrictionEvidence: "FIXTURE: internal use only" }];
    const { site } = logoSite(restricted, { logo: "brand-kit" });
    expect(site.content.assets.logo).toBeNull();
    expect(site.content.assets.refused[0]?.because).toContain("not authorised for publication");
  });

  it("positive: a verified asset from a source with confirmed credentials still renders", () => {
    const confirmed = [
      {
        ...cleanSource[0]!,
        file: { path: "raw/fixture-logo.png", contentCredentials: { statement: "FIXTURE: photographed by the owner.", originConfidence: "confirmed" as const, signatureValidated: true } },
      },
    ];
    const { site } = logoSite(confirmed, { logo: "brand-kit" });
    expect(site.content.assets.logo).not.toBeNull();
    expect(JSON.stringify(site.files)).toContain("/brand/fixture-logo.png");
  });

  it("positive: an asset with no source record behaves exactly as before", () => {
    const { site } = logoSite([]);
    expect(site.content.assets.logo).not.toBeNull();
  });

  it("FD-13: an unconfirmed business name raises a confirmation requirement; a verified one does not", () => {
    const legacy = runPipeline(baseInput({ businessName: "FIXTURE-UNCONFIRMED" }));
    expect(legacy.output.approvalsRequired.join(" ")).toContain("confirm the trading name before launch");
    const verified = runPipeline(
      baseInput({
        businessName: "FIXTURE-CONFIRMED",
        businessNameProvenance: { provenance: "customer_supplied_verified", source: "FIXTURE signed brief" },
      }),
    );
    expect(verified.output.approvalsRequired.join(" ")).not.toContain("trading name");
  });
});
