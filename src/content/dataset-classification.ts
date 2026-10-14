/**
 * DATASET CLASSIFICATION — synthetic data stays identified as synthetic.
 *
 * Fixtures mark themselves ("FIXTURE-…", reserved domains such as `.example` and
 * `.invalid`), but nothing CLASSIFIED a dataset, so a report built on synthetic
 * output could read as a customer result. This module states the classification
 * with the markers that decided it; generation carries it into the manifest and
 * a synthetic dataset is never publishable.
 *
 * It can only prove SYNTHETIC. The absence of markers is `unmarked` — not proof
 * that a real customer supplied the data.
 */
import type { BusinessInput } from "../design-intelligence/types/business-input.js";

export interface DatasetClassification {
  classification: "synthetic" | "unmarked";
  markers: string[];
}

/** RFC 2606 / RFC 6761 reserved names: never a real business's domain. */
const RESERVED_DOMAIN = /(^|[@./])(example\.(com|net|org)|[a-z0-9-]+\.(example|invalid|test|localhost))(\b|$)/i;
const FIXTURE_TOKEN = /\bFIXTURE\b/;

function collectStrings(value: unknown, path: string, out: Array<{ path: string; text: string }>): void {
  if (typeof value === "string") out.push({ path, text: value });
  else if (Array.isArray(value)) value.forEach((v, i) => collectStrings(v, `${path}[${i}]`, out));
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) collectStrings(v, path ? `${path}.${k}` : k, out);
  }
}

export function classifyDataset(input: BusinessInput, supplied?: unknown): DatasetClassification {
  const strings: Array<{ path: string; text: string }> = [];
  collectStrings(input, "input", strings);
  if (supplied !== undefined) collectStrings(supplied, "suppliedContent", strings);
  const markers: string[] = [];
  for (const { path, text } of strings) {
    if (FIXTURE_TOKEN.test(text)) markers.push(`${path}: FIXTURE token`);
    else if (RESERVED_DOMAIN.test(text)) markers.push(`${path}: reserved domain (${RESERVED_DOMAIN.exec(text)?.[2] ?? "reserved"})`);
  }
  return { classification: markers.length > 0 ? "synthetic" : "unmarked", markers: markers.slice(0, 20) };
}
