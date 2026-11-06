/**
 * FORM PROTECTION PROBE — Phase 5 evidence that an endpoint really applies the guard.
 *
 * "The guard module was emitted" is not evidence that the host's route handler
 * calls it. This probe submits crafted payloads to an endpoint and records what
 * came back, so the security invariant is measured rather than assumed (README
 * rule 10). It takes a `send` function, so it runs against a live preview URL,
 * a local server, or an in-process handler alike.
 *
 * Run it against a preview or staging endpoint with a dedicated test source
 * address: the burst step deliberately trips the rate limit.
 */
import type { GuardField } from "./guard.js";
import { GUARD_FIELDS } from "./guard.js";

export type ProbeSend = (values: Record<string, string>, headers: Record<string, string>) => Promise<{ status: number; body: unknown }>;

export interface ProbeStep {
  step: "legitimate" | "honeypot" | "too_fast" | "duplicate" | "rate_limit_burst";
  expected: string;
  status: number;
  outcome: string | null;
  passed: boolean;
}

export interface ProbeResult {
  formId: string;
  passed: boolean;
  steps: ProbeStep[];
}

/** A valid value for each field type — test data, visibly so. */
function sampleValue(f: GuardField, n: number): string {
  switch (f.type) {
    case "email":
      return `probe+${n}@example.com`;
    case "date":
      return "2030-01-15";
    case "number":
      return String(Math.max(1, f.min ?? 1));
    case "tel":
      return "+10000000000";
    case "select":
      return f.options?.[0] ?? "";
    default:
      return `Form protection probe ${n}`;
  }
}

function outcomeOf(body: unknown): string | null {
  return typeof body === "object" && body !== null && typeof (body as { outcome?: unknown }).outcome === "string" ? (body as { outcome: string }).outcome : null;
}

export async function probeFormEndpoint(args: {
  formId: string;
  fields: readonly GuardField[];
  honeypotField: string;
  send: ProbeSend;
  /** Seconds the policy requires before submit; the legitimate step back-dates its timing token by more. */
  minSeconds: number;
  maxPerWindow: number;
  now?: () => number;
}): Promise<ProbeResult> {
  const now = args.now ?? Date.now;
  const headers = { "user-agent": "FormProtectionProbe/1.0 (framework QA)" };
  let n = 0;
  const payload = (overrides: Record<string, string> = {}, startedAgoMs = (args.minSeconds + 5) * 1000) => {
    n += 1;
    const values: Record<string, string> = { [GUARD_FIELDS.formId]: args.formId, [GUARD_FIELDS.started]: String(now() - startedAgoMs), [args.honeypotField]: "" };
    for (const f of args.fields) values[f.name] = sampleValue(f, n);
    return { ...values, ...overrides };
  };
  const steps: ProbeStep[] = [];
  const record = async (step: ProbeStep["step"], expected: string, values: Record<string, string>, ok: (status: number, outcome: string | null) => boolean) => {
    const res = await args.send(values, headers);
    const outcome = outcomeOf(res.body);
    steps.push({ step, expected, status: res.status, outcome, passed: ok(res.status, outcome) });
    return { res, outcome };
  };

  const legit = payload();
  await record("legitimate", "accepted (2xx)", legit, (s, o) => s >= 200 && s < 300 && (o === null || o === "accepted"));
  await record("duplicate", "duplicate, not delivered twice", legit, (_s, o) => o === "duplicate");
  await record("honeypot", "blocked (4xx)", payload({ [args.honeypotField]: "https://spam.example" }), (s, o) => s >= 400 && o !== "accepted");
  await record("too_fast", "not accepted (flagged or blocked)", payload({}, 200), (_s, o) => o !== "accepted" && o !== null);
  let limited = false;
  for (let i = 0; i < args.maxPerWindow * 2 + 2 && !limited; i++) {
    const res = await args.send(payload(), headers);
    if (res.status === 429) limited = true;
  }
  steps.push({ step: "rate_limit_burst", expected: "429 within the burst", status: limited ? 429 : 0, outcome: limited ? "rate_limited" : null, passed: limited });
  return { formId: args.formId, passed: steps.every((s) => s.passed), steps };
}
