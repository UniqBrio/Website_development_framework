/**
 * Shared wording helpers: fill a library template from the academy context and
 * name the audience a recommendation targets. One home, so a guest tool and a
 * blog brief never describe the same audience in two ways.
 */
import type { AcademyContext, AcademyDiscipline } from "./academy.js";
import { fillTemplate, type TopicAudience } from "./topic-library.js";

/**
 * `case`: "keyword" lowercases every filled value (search queries), "title"
 * capitalises the learner nouns so they match a Title Case heading, "text"
 * leaves the academy's own spelling.
 */
export function fill(template: string, ctx: AcademyContext, discipline: AcademyDiscipline, mode: boolean | "keyword" | "title" | "text" = "text"): string {
  const m = mode === true ? "keyword" : mode === false ? "text" : mode;
  const lower = m === "keyword";
  const cap = (w: string) => (m === "title" ? `${w[0]!.toUpperCase()}${w.slice(1)}` : w);
  const name = lower ? discipline.name.toLowerCase() : discipline.name;
  const city = ctx.city ? (lower ? ctx.city.toLowerCase() : ctx.city) : null;
  const out = fillTemplate(template, { discipline: name, city, learner: cap(discipline.family.learner), learners: cap(discipline.family.learners) });
  return lower ? out.toLowerCase() : out;
}

/** The first candidate that fits, else the first one shortened at a word boundary. */
export function firstThatFits(candidates: readonly string[], max: number): string {
  return candidates.find((c) => c.length <= max) ?? truncate(candidates[0] ?? "", max);
}

export function titleCase(text: string): string {
  const small = new Set(["a", "an", "the", "for", "to", "of", "in", "and", "or", "at", "on", "with"]);
  return text
    .split(" ")
    .map((w, i) => (i > 0 && small.has(w) ? w : w.length ? `${w[0]!.toUpperCase()}${w.slice(1)}` : w))
    .join(" ");
}

const AGE_LABEL: Record<string, string> = {
  toddlers: "parents of toddlers",
  children: "parents of school-age children",
  teens: "teenagers and their parents",
  adults: "adult learners",
  seniors: "senior learners",
};

/** Audience labels for a topic audience, from STATED facts first. */
export function audienceLabels(ctx: AcademyContext, topic: TopicAudience): string[] {
  const out: string[] = [];
  const ages = ctx.ageGroups;
  if (topic === "parents") {
    for (const a of ages.filter((g) => g === "toddlers" || g === "children" || g === "teens")) out.push(AGE_LABEL[a]!);
    if (out.length === 0) out.push("parents choosing an academy for their child");
  } else if (topic === "adult_beginners") {
    for (const a of ages.filter((g) => g === "adults" || g === "seniors")) out.push(AGE_LABEL[a]!);
    if (out.length === 0) out.push("adult beginners");
  } else if (topic === "students") {
    out.push(`current and prospective ${ctx.primaryDiscipline?.family.learners ?? "learners"}`);
  } else {
    for (const a of ages) out.push(AGE_LABEL[a]!);
    if (out.length === 0) out.push(`prospective ${ctx.primaryDiscipline?.family.learners ?? "learners"} and their families`);
  }
  const stated = ctx.audiences.filter((a) => a.basis === "stated").map((a) => a.label);
  return [...new Set([...out, ...stated.slice(0, 2)])];
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,:;–—-]+$/, "")}…`;
}

export function sentence(text: string): string {
  const t = text.trim();
  return t.length === 0 ? t : `${t[0]!.toUpperCase()}${t.slice(1)}${/[.!?]$/.test(t) ? "" : "."}`;
}
