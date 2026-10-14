import { describe, expect, it } from "vitest";
import {
  MANDATORY_TEST_PROFILES,
  RANGES,
  defaultCapabilities,
  rangeForWidth,
} from "../../src/responsive/capabilities.js";
import {
  auditResponsive,
  transformComponent,
  type ComponentDescriptor,
} from "../../src/responsive/transformations.js";

function component(overrides: Partial<ComponentDescriptor> & Pick<ComponentDescriptor, "id">): ComponentDescriptor {
  return {
    criticality: "supporting",
    kind: "generic",
    hoverDependent: false,
    animated: false,
    weightKb: 5,
    ...overrides,
  };
}

describe("§F.1 ranges", () => {
  it("uses the specification's five ranges", () => {
    expect(Object.keys(RANGES)).toEqual(["compact", "medium", "expanded", "large", "extra_large"]);
    expect(RANGES.compact.max).toBe(599);
    expect(RANGES.medium.min).toBe(600);
    expect(RANGES.extra_large.min).toBe(1600);
  });

  it("classifies widths into ranges", () => {
    expect(rangeForWidth(320)).toBe("compact");
    expect(rangeForWidth(599)).toBe("compact");
    expect(rangeForWidth(600)).toBe("medium");
    expect(rangeForWidth(840)).toBe("expanded");
    expect(rangeForWidth(1200)).toBe("large");
    expect(rangeForWidth(2560)).toBe("extra_large");
  });
});

describe("capability defaults assume the harder case", () => {
  it("defaults to coarse pointer and no hover, not to a mouse", () => {
    const caps = defaultCapabilities();
    expect(caps.pointer).toBe("coarse");
    expect(caps.hover).toBe(false);
    expect(caps.viewportWidthCssPx).toBe(320);
  });

  it("covers every §F.3 mandatory test condition", () => {
    const names = MANDATORY_TEST_PROFILES.map((p) => p.name);
    for (const required of [
      "320_css_px",
      "400_percent_zoom",
      "compact",
      "medium",
      "expanded",
      "large",
      "extra_large",
      "landscape_mobile",
      "narrow_desktop_split_window",
      "coarse_pointer_no_hover",
      "fine_pointer_hover",
      "reduced_motion",
      "safe_area_insets",
      "software_keyboard_visible",
    ]) {
      expect(names, `missing mandatory profile ${required}`).toContain(required);
    }
  });
});

describe("§11 core content is never removed to simplify a layout", () => {
  it("refuses a declared `hide` on essential content and reflows instead", () => {
    const decision = transformComponent(
      component({
        id: "pricing-table",
        criticality: "essential",
        kind: "pricing",
        declared: { compact: "hide" },
      }),
      defaultCapabilities({ viewportWidthCssPx: 320 }),
    );
    expect(decision.transformation).toBe("reflow");
    expect(decision.refused).toEqual({
      requested: "hide",
      because: 'kind "pricing" is essential',
    });
  });

  it("refuses to hide a legal disclosure", () => {
    const decision = transformComponent(
      component({ id: "terms", kind: "legal_disclosure", declared: { compact: "hide" } }),
      defaultCapabilities(),
    );
    expect(decision.transformation).not.toBe("hide");
    expect(decision.refused?.requested).toBe("hide");
  });

  it("allows hiding a purely decorative element", () => {
    const decision = transformComponent(
      component({ id: "blob", criticality: "decorative", kind: "ornament" }),
      defaultCapabilities({ forcedColors: true }),
    );
    expect(decision.transformation).toBe("hide");
  });

  it("an audit reports core content preserved when nothing essential is hidden", () => {
    const audit = auditResponsive(
      [
        component({ id: "nav", criticality: "essential", kind: "navigation_destination" }),
        component({ id: "cta", criticality: "essential", kind: "primary_action" }),
        component({ id: "ornament", criticality: "decorative", kind: "ornament" }),
      ],
      MANDATORY_TEST_PROFILES,
    );
    expect(audit.coreContentPreserved).toBe(true);
  });
});

describe("§27 responsive/interaction tests", () => {
  it("coarse pointer removes hover dependency", () => {
    const decision = transformComponent(
      component({ id: "card", hoverDependent: true }),
      defaultCapabilities({ pointer: "coarse", hover: false }),
    );
    expect(decision.transformation).toBe("replace");
    expect(decision.reason).toContain("hover is unavailable");
  });

  it("fine pointer with hover keeps the hover affordance", () => {
    const decision = transformComponent(
      component({ id: "card", hoverDependent: true, declared: { large: "remain" } }),
      defaultCapabilities({ viewportWidthCssPx: 1280, pointer: "fine", hover: true }),
    );
    expect(decision.transformation).toBe("remain");
  });

  it("reduced motion staticises animation without losing information", () => {
    const decision = transformComponent(
      component({ id: "reveal", animated: true }),
      defaultCapabilities({ reducedMotion: true }),
    );
    expect(decision.transformation).toBe("staticize");
    expect(decision.reason).toContain("lose no information");
  });

  it("reduced data defers heavy non-essential content", () => {
    const decision = transformComponent(
      component({ id: "gallery", weightKb: 120 }),
      defaultCapabilities({ reducedData: true }),
    );
    expect(decision.transformation).toBe("defer");
  });

  it("reduced data SIMPLIFIES heavy essential content rather than deferring it", () => {
    const decision = transformComponent(
      component({ id: "product-detail", kind: "product_detail", weightKb: 120 }),
      defaultCapabilities({ reducedData: true }),
    );
    expect(decision.transformation).toBe("simplify");
    expect(decision.reason).toContain("must still arrive");
  });

  it("hides a sticky CTA while the software keyboard is open", () => {
    const decision = transformComponent(
      component({ id: "sticky", kind: "sticky_cta" }),
      defaultCapabilities({ keyboardVisible: true }),
    );
    expect(decision.transformation).toBe("hide");
    expect(decision.reason).toContain("cover the focused input");
  });

  it("uses the container width for a component with declared behaviour", () => {
    const decision = transformComponent(
      component({ id: "widget", declared: { compact: "condense", large: "remain" } }),
      defaultCapabilities({ viewportWidthCssPx: 1280, containerWidthCssPx: 380, pointer: "fine", hover: true }),
    );
    // A component in a narrow container behaves narrow even on a wide viewport.
    expect(decision.range).toBe("compact");
    expect(decision.transformation).toBe("condense");
  });
});
