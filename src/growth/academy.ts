/**
 * ACADEMY CONTEXT — the facts every growth recommendation is made from.
 *
 * Read from the existing homes first (industry, sub-industry, offers, audience,
 * location, objectives, pages, functionality) and from the optional `academy`
 * block only for what nothing else expresses. Every derived value records its
 * BASIS (`stated` / `inferred`), because a recommendation built on an inference
 * must say so — the FD-01/FD-02 rule applied to growth.
 *
 * When the category cannot be determined, the context is NOT contextual and the
 * report asks for the missing fact instead of producing generic suggestions.
 */
import type { BusinessInput } from "../design-intelligence/types/business-input.js";
import type { AcademyAgeGroup, AcademyCategory, AcademyGoal, AcademySkillLevel, ResourceKind } from "./vocabulary.js";
import { DISCIPLINE_FAMILIES, GENERIC_FAMILIES, familyFor, type DisciplineFamily } from "./topic-library.js";

export type Basis = "stated" | "inferred";

export interface AcademyDiscipline {
  name: string;
  basis: Basis;
  /** Where the name came from. */
  source: "academy.disciplines" | "offer" | "subIndustry";
  family: DisciplineFamily;
  /** True when no specific family matched and the category's generic family is used. */
  genericFamily: boolean;
}

export interface AcademyContext {
  businessName: string;
  category: AcademyCategory | null;
  categoryBasis: Basis | null;
  /** Why the category is what it is (or why it is unknown). */
  categoryReason: string;
  disciplines: AcademyDiscipline[];
  /** The discipline recommendations lead with: the first stated one, else the first derived. */
  primaryDiscipline: AcademyDiscipline | null;
  courses: string[];
  audiences: Array<{ label: string; basis: Basis; primary: boolean }>;
  ageGroups: AcademyAgeGroup[];
  skillLevels: AcademySkillLevel[];
  /** The academy's city, when the input carries one. */
  city: string | null;
  cityVerified: boolean;
  serviceAreas: string[];
  hasPhysicalPremises: boolean;
  objectives: BusinessInput["websiteObjective"];
  goals: AcademyGoal[];
  freeTrialOffered: boolean | null;
  hostsEvents: boolean | null;
  existingBlogs: Array<{ title: string; slug: string; keywords: string[] }>;
  existingResources: Array<{ title: string; kind: ResourceKind; url: string | null }>;
  /** Routes the site has or will have (requiredPages). */
  existingRoutes: string[];
  functionality: BusinessInput["requiredFunctionality"];
  /** True only when the category is known: recommendations are then academy-specific. */
  contextual: boolean;
  /** Facts that would make the recommendations more specific, one line each. */
  missingFacts: string[];
}

const ARTS_INDUSTRIES = new Set(["art"]);
const SPORTS_INDUSTRIES = new Set(["sports", "fitness"]);

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

function categoryFrom(input: BusinessInput, disciplines: readonly AcademyDiscipline[]): { category: AcademyCategory | null; basis: Basis | null; reason: string } {
  const stated = input.academy?.category;
  if (stated) return { category: stated, basis: "stated", reason: "stated in the academy setup" };
  if (ARTS_INDUSTRIES.has(input.industry)) return { category: "arts", basis: "inferred", reason: `inferred from industry "${input.industry}"` };
  if (SPORTS_INDUSTRIES.has(input.industry)) return { category: "sports", basis: "inferred", reason: `inferred from industry "${input.industry}"` };
  const specific = disciplines.filter((d) => !d.genericFamily);
  const cats = new Set(specific.map((d) => d.family.category));
  if (cats.size === 1) {
    const only = [...cats][0] as AcademyCategory;
    return { category: only, basis: "inferred", reason: `inferred from the discipline(s) ${specific.map((d) => `"${d.name}"`).join(", ")}` };
  }
  if (cats.size > 1) {
    return { category: null, basis: null, reason: "the disciplines span arts and sports; state academy.category so recommendations lead with the right one" };
  }
  return { category: null, basis: null, reason: "no academy category is stated and none can be derived from the industry, sub-industry or course names" };
}

/** Candidate discipline names, in priority order, each with where it came from. */
function disciplineCandidates(input: BusinessInput): Array<{ name: string; basis: Basis; source: AcademyDiscipline["source"] }> {
  const out: Array<{ name: string; basis: Basis; source: AcademyDiscipline["source"] }> = [];
  for (const d of input.academy?.disciplines ?? []) out.push({ name: d.trim(), basis: "stated", source: "academy.disciplines" });
  if (out.length > 0) return out;
  // Offer names: a programme called "Kathak for Beginners" names its discipline.
  for (const offer of input.servicesProducts) {
    if (offer.kind !== "programme" && offer.kind !== "service") continue;
    const fam = familyFor(offer.name);
    if (!fam) continue;
    const m = offer.name.match(fam.match);
    const word = m ? capitalise(wordAround(offer.name, m.index ?? 0)) : offer.name;
    if (!out.some((o) => o.name.toLowerCase() === word.toLowerCase())) out.push({ name: word, basis: "inferred", source: "offer" });
  }
  if (out.length > 0) return out;
  if (input.subIndustry && input.subIndustry.trim().length > 0) {
    out.push({ name: input.subIndustry.trim(), basis: "inferred", source: "subIndustry" });
  }
  return out;
}

/** The whole word a regex match starts in ("Bharatanatyam" from "Bharatanatyam Juniors"). */
function wordAround(text: string, index: number): string {
  let start = index;
  while (start > 0 && /[\p{L}\p{N}-]/u.test(text[start - 1] ?? "")) start--;
  let end = index;
  while (end < text.length && /[\p{L}\p{N}-]/u.test(text[end] ?? "")) end++;
  return text.slice(start, end);
}

function capitalise(word: string): string {
  return word.length === 0 ? word : `${word[0]!.toUpperCase()}${word.slice(1)}`;
}

export function deriveAcademyContext(input: BusinessInput): AcademyContext {
  const candidates = disciplineCandidates(input);
  // First pass without a category, to let disciplines inform it.
  const provisional: AcademyDiscipline[] = candidates.map((c) => {
    const fam = familyFor(c.name);
    return { ...c, family: fam ?? GENERIC_FAMILIES.arts, genericFamily: fam === null };
  });
  const cat = categoryFrom(input, provisional);
  const disciplines: AcademyDiscipline[] = provisional
    .map((d) => (d.genericFamily && cat.category ? { ...d, family: GENERIC_FAMILIES[cat.category] } : d))
    // A specific family from the other category stays — a sports academy may also
    // teach yoga — but a generic family only fits the academy's own category.
    .filter((d) => !d.genericFamily || cat.category !== null);

  // A known category with no discipline name: use the industry's own word, so a
  // title still names something real ("Sports Coaching"), recorded as inferred.
  if (disciplines.length === 0 && cat.category) {
    const word = input.subIndustry?.trim() || (cat.category === "arts" ? "Arts" : "Sports");
    disciplines.push({ name: word, basis: "inferred", source: "subIndustry", family: familyFor(word) ?? GENERIC_FAMILIES[cat.category], genericFamily: familyFor(word) === null });
  }

  const primaryDiscipline =
    disciplines.find((d) => d.basis === "stated" && (cat.category === null || d.family.category === cat.category)) ??
    disciplines.find((d) => cat.category === null || d.family.category === cat.category) ??
    disciplines[0] ??
    null;

  const location = input.location;
  const city = location?.city?.trim() || null;
  const missingFacts: string[] = [];
  if (!cat.category) missingFacts.push(`academy category: ${cat.reason}`);
  if (disciplines.length === 0) missingFacts.push("disciplines taught (academy.disciplines), so titles and keywords name them");
  if (!city) missingFacts.push("the academy's city (location.city), needed for local-search blogs and location pages");
  if (input.academy?.freeTrialOffered === undefined) missingFacts.push("whether a free trial class is really offered (academy.freeTrialOffered); unstated, no trial is promoted");
  if (input.academy?.hostsEvents === undefined) missingFacts.push("whether the academy runs events or workshops (academy.hostsEvents)");
  if ((input.academy?.ageGroups ?? []).length === 0) missingFacts.push("age groups taught (academy.ageGroups), so audience targeting is stated rather than inferred");
  if (input.academy?.existingContent === undefined) missingFacts.push("existing blogs and resources (academy.existingContent), so recommendations skip what is already published");

  const blogs = (input.academy?.existingContent.blogs ?? []).map((b) => ({ title: b.title, slug: b.slug ? slugify(b.slug.replace(/^\/?blog\//, "")) : slugify(b.title), keywords: b.keywords }));

  return {
    businessName: input.businessName,
    category: cat.category,
    categoryBasis: cat.basis,
    categoryReason: cat.reason,
    disciplines,
    primaryDiscipline,
    courses: input.servicesProducts.filter((o) => o.kind === "programme" || o.kind === "service" || o.kind === "subscription").map((o) => o.name),
    audiences: input.targetAudience.map((a) => ({ label: a.label, basis: a.basis, primary: a.isPrimary })),
    ageGroups: input.academy?.ageGroups ?? [],
    skillLevels: input.academy?.skillLevels ?? [],
    city,
    cityVerified: location?.verified ?? false,
    serviceAreas: location?.serviceAreas ?? [],
    hasPhysicalPremises: location?.hasPhysicalPremises ?? false,
    objectives: input.websiteObjective,
    goals: input.academy?.goals ?? [],
    freeTrialOffered: input.academy?.freeTrialOffered ?? null,
    hostsEvents: input.academy?.hostsEvents ?? null,
    existingBlogs: blogs,
    existingResources: (input.academy?.existingContent.resources ?? []).map((r) => ({ title: r.title, kind: r.kind, url: r.url ?? null })),
    existingRoutes: input.requiredPages.map((p) => p.path),
    functionality: input.requiredFunctionality,
    contextual: cat.category !== null && primaryDiscipline !== null,
    missingFacts,
  };
}

/** Exposed for tests and documentation: every family the library knows. */
export const KNOWN_FAMILIES = DISCIPLINE_FAMILIES.map((f) => ({ id: f.id, category: f.category, label: f.label }));
