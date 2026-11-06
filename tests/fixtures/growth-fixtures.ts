/**
 * SYNTHETIC academy fixtures for the growth module — visibly not real businesses
 * (FIXTURE-* names, example.com, no claims). They exercise decision variables only.
 */
import type { BusinessInput, BusinessInputDraft } from "../../src/design-intelligence/types/business-input.js";
import { baseInput, content } from "./business-inputs.js";

export const danceAcademy = (overrides: Partial<BusinessInputDraft> = {}): BusinessInput =>
  baseInput({
    businessName: "FIXTURE-DANCE-ACADEMY",
    industry: "education",
    description: "Synthetic arts academy fixture.",
    targetAudience: [{ label: "FIXTURE-PARENTS", isPrimary: true }],
    websiteObjective: ["generate_leads", "drive_footfall"],
    location: { verified: true, city: "Pune", serviceAreas: ["Kothrud", "Baner"], hasPhysicalPremises: true },
    servicesProducts: [
      { name: "Bharatanatyam Juniors", kind: "programme" },
      { name: "Bharatanatyam Adults", kind: "programme" },
    ],
    availableContent: content({ propositionText: "verified_available", contactEmail: "verified_available" }),
    academy: {
      category: "arts",
      disciplines: ["Bharatanatyam"],
      ageGroups: ["children", "adults"],
      freeTrialOffered: true,
      hostsEvents: true,
      goals: ["increase_footfall", "grow_organic_traffic"],
      existingContent: {
        blogs: [{ title: "What Is the Best Age to Start Learning Bharatanatyam?", keywords: [] }],
        resources: [],
      },
    },
    ...overrides,
  });

export const cricketAcademy = (overrides: Partial<BusinessInputDraft> = {}): BusinessInput =>
  baseInput({
    businessName: "FIXTURE-CRICKET-ACADEMY",
    industry: "sports",
    description: "Synthetic sports academy fixture.",
    targetAudience: [{ label: "FIXTURE-PARENTS", isPrimary: true }],
    websiteObjective: ["book_appointments"],
    location: { verified: false, city: "Indore", hasPhysicalPremises: true },
    servicesProducts: [{ name: "Cricket Foundation Batch", kind: "programme" }],
    availableContent: content({ propositionText: "verified_available", contactEmail: "verified_available" }),
    ...overrides,
  });
