/**
 * The guard's SOURCE, for emission into generated sites.
 *
 * One implementation: the file the framework's tests exercise is the file a
 * generated host imports. Reading it (rather than keeping a string copy) is what
 * makes a drift between "the tested guard" and "the shipped guard" impossible.
 */
import { readFileSync } from "node:fs";

let cached: string | null = null;

export function formGuardSource(): string {
  if (cached === null) {
    const body = readFileSync(new URL("./guard.ts", import.meta.url), "utf8");
    if (/^\s*import\s/m.test(body)) {
      throw new Error("growth/spam/guard.ts must stay import-free: it is emitted verbatim into generated sites");
    }
    cached = `/* GENERATED from the framework's growth/spam/guard.ts — do not hand-edit; regenerate. */\n${body}`;
  }
  return cached;
}
