/**
 * EVIDENCE PROVENANCE — P1 capability 3, part 1.
 *
 * PREVIOUS LIMITATION: `BuildEvidence.measuredRouteJsKb?: number` was a bare
 * number. Nothing stopped a caller passing the responsive registry's ESTIMATED
 * `weightKb` into a gate that requires a measured bundle, and the gate could not
 * have told the difference.
 *
 * Every piece of evidence therefore carries its kind, and gates state which kinds
 * they accept. The type system does the enforcing: a gate that needs a
 * measurement cannot read an estimate without going through
 * `requireMeasured()`, which returns `null` for anything weaker.
 */

export type EvidenceKind =
  /** Observed from a real artifact: a build output, a fetched page, a tool run. */
  | "measured"
  /**
   * Computed from measured inputs by a documented rule. Weaker than measured but
   * still grounded — e.g. "indexable" derived from a measured robots directive.
   */
  | "derived"
  /**
   * A model's guess from metadata. NEVER satisfies a gate requiring measurement.
   * The registry's `weightKb` is the canonical example.
   */
  | "estimated"
  /** Nothing is known. Distinct from a measured negative result. */
  | "unavailable";

export interface Evidence<T> {
  kind: EvidenceKind;
  /** Present only for measured/derived/estimated. Always absent when unavailable. */
  value?: T;
  /** What produced this, or what would produce it. Never empty. */
  source: string;
  /** When the observation was taken, for measured evidence. */
  observedAt?: string;
}

export function measured<T>(value: T, source: string, observedAt?: string): Evidence<T> {
  const e: Evidence<T> = { kind: "measured", value, source };
  if (observedAt !== undefined) e.observedAt = observedAt;
  return e;
}

export function derived<T>(value: T, source: string): Evidence<T> {
  return { kind: "derived", value, source };
}

export function estimated<T>(value: T, source: string): Evidence<T> {
  return { kind: "estimated", value, source };
}

export function unavailable<T>(source: string): Evidence<T> {
  return { kind: "unavailable", source };
}

/**
 * Read evidence only if it is measured. Returns `null` for derived, estimated or
 * unavailable — so a caller that needs a measurement cannot accidentally accept
 * an estimate.
 */
export function requireMeasured<T>(e: Evidence<T> | undefined): T | null {
  if (!e || e.kind !== "measured" || e.value === undefined) return null;
  return e.value;
}

/** Read evidence that may be measured OR derived, but never estimated. */
export function requireGrounded<T>(e: Evidence<T> | undefined): T | null {
  if (!e || e.value === undefined) return null;
  return e.kind === "measured" || e.kind === "derived" ? e.value : null;
}

/** Human-readable provenance line for a report or a gate explanation. */
export function describeEvidence<T>(name: string, e: Evidence<T> | undefined): string {
  if (!e) return `${name}: unavailable (no collector supplied)`;
  return `${name}: ${e.kind} — ${e.source}`;
}

/**
 * Why a gate could not be decided. Returned instead of a boolean so the reason
 * travels with the verdict.
 */
export interface EvidenceShortfall {
  gate: string;
  needs: string;
  had: EvidenceKind;
  detail: string;
}
