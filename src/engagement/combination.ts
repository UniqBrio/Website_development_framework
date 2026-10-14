/**
 * MULTIPLE EXPERIENCE POLICY — ECO §8, brief phase 7.
 *
 * Optimise for useful interaction, not the number of interactive components.
 * A combination is allowed only when EVERY check passes:
 *   distinct_jobs         no visitor task is served twice
 *   coherent_journey      the experiences form one ordered path, or (85+ band only)
 *                         independent jobs on different pages
 *   no_repeated_questions a later step never re-asks what an earlier one collected
 *   no_competing_ctas     at most one primary conversion action across the set
 *   cognitive_cost        summed cognitive load stays acceptable
 *   technical_cost        summed estimated route JS fits the route budget
 *   count                 at most three experiences
 *
 * The thresholds (load ≤ 7, count ≤ 3) are framework policy (Tier E); the research
 * names the criteria but not the numbers.
 */
import { estimatedKbFor } from "./gates.js";
import type { CombinationCheck, OpportunityCategory } from "./types.js";
import { FUNNEL_STAGES } from "./vocabulary.js";

export const COMBINATION_LIMITS = { maxExperiences: 3, maxCognitiveLoad: 7 } as const;

const earliestStage = (c: OpportunityCategory) => Math.min(...c.funnelStages.map((s) => FUNNEL_STAGES.indexOf(s)));

export function evaluateCombination(
  experiences: readonly OpportunityCategory[],
  options: { routeJsBudgetKb: number; allowParallel: boolean },
): { allowed: boolean; checks: CombinationCheck[] } {
  const checks: CombinationCheck[] = [];
  if (experiences.length < 2) {
    return { allowed: true, checks: [{ check: "count", passed: true, reason: "a single experience needs no combination check" }] };
  }

  checks.push({
    check: "count",
    passed: experiences.length <= COMBINATION_LIMITS.maxExperiences,
    reason: `${experiences.length} experiences (limit ${COMBINATION_LIMITS.maxExperiences})`,
  });

  const taskOwners = new Map<string, string[]>();
  for (const e of experiences) for (const t of e.visitorTasks) taskOwners.set(t, [...(taskOwners.get(t) ?? []), e.id]);
  const shared = [...taskOwners.entries()].filter(([, owners]) => owners.length > 1);
  checks.push({
    check: "distinct_jobs",
    passed: shared.length === 0,
    reason: shared.length === 0 ? "each experience serves a different visitor task" : `tasks served twice: ${shared.map(([t, o]) => `${t} (${o.join(", ")})`).join("; ")}`,
  });

  // Ordered by funnel position; each later step must accept the earlier one's output.
  const ordered = [...experiences].sort((a, b) => earliestStage(a) - earliestStage(b));
  const breaks: string[] = [];
  for (let i = 1; i < ordered.length; i += 1) {
    const previous = ordered[i - 1]!;
    const current = ordered[i]!;
    const accepts = previous.experiencePattern !== undefined && current.acceptsInputFrom.includes(previous.experiencePattern);
    if (!accepts) breaks.push(`${current.id} does not continue from ${previous.id}`);
  }
  const sequential = breaks.length === 0;
  checks.push({
    check: "coherent_journey",
    passed: sequential || options.allowParallel,
    reason: sequential
      ? `one journey: ${ordered.map((e) => e.id).join(" → ")}`
      : options.allowParallel
        ? `independent jobs permitted in the high-confidence band (${breaks.join("; ")})`
        : `not one journey: ${breaks.join("; ")}`,
  });

  // Repeated questions: a topic asked by two steps where the later one cannot take the earlier's answers.
  const repeated: string[] = [];
  for (let i = 0; i < ordered.length; i += 1) {
    for (let j = i + 1; j < ordered.length; j += 1) {
      const a = ordered[i]!;
      const b = ordered[j]!;
      const overlap = a.asksAbout.filter((q) => b.asksAbout.includes(q));
      const sharesData = a.experiencePattern !== undefined && b.acceptsInputFrom.includes(a.experiencePattern);
      if (overlap.length > 0 && !sharesData) repeated.push(`${a.id} and ${b.id} both ask about ${overlap.join(", ")}`);
    }
  }
  checks.push({
    check: "no_repeated_questions",
    passed: repeated.length === 0,
    reason: repeated.length === 0 ? "no question is asked twice without shared data" : repeated.join("; "),
  });

  const primaryActions = [...new Set(experiences.filter((e) => e.ctaRole === "primary_conversion").map((e) => e.conversionAction))];
  const supportingActions = [...new Set(experiences.filter((e) => e.ctaRole === "supports_conversion").map((e) => e.conversionAction))];
  // Supporting actions compete when there is no single primary action for them to lead into.
  const competing = primaryActions.length > 1 || (primaryActions.length === 0 && supportingActions.length > 1);
  checks.push({
    check: "no_competing_ctas",
    passed: !competing,
    reason: competing
      ? `competing calls to action: ${[...primaryActions, ...supportingActions].filter(Boolean).join(" / ")}`
      : primaryActions.length === 1
        ? `one primary action ("${primaryActions[0]}") that the other steps lead into`
        : "no competing primary actions",
  });

  const load = experiences.reduce((n, e) => n + e.cognitiveLoad, 0);
  checks.push({
    check: "cognitive_cost",
    passed: load <= COMBINATION_LIMITS.maxCognitiveLoad,
    reason: `summed cognitive load ${load} (limit ${COMBINATION_LIMITS.maxCognitiveLoad})`,
  });

  const kb = experiences.reduce((n, e) => n + estimatedKbFor(e), 0);
  checks.push({
    check: "technical_cost",
    passed: kb <= options.routeJsBudgetKb,
    reason: `~${kb}KB route JS estimated across the set (budget ${options.routeJsBudgetKb}KB)`,
  });

  return { allowed: checks.every((c) => c.passed), checks };
}
