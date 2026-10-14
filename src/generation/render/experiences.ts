/**
 * EXPERIENCE RENDERER — the ONE markup source for delivered calculators and
 * decision flows.
 *
 * The static layer inlines this HTML; the Next.js layer inserts the SAME string
 * with `dangerouslySetInnerHTML` inside a server component. Two consequences:
 *  - the two layers cannot disagree about an experience's markup;
 *  - React never hydrates inside it, so the runtime's DOM changes cannot cause a
 *    hydration mismatch.
 *
 * Every string an owner supplied is escaped. The only framework-authored words are
 * structural (button labels, "How this is calculated", the JavaScript notice) —
 * never a claim, figure, rule or recommendation.
 *
 * The static explanation is ALWAYS rendered and stays visible with JavaScript on:
 * essential information never lives only inside the interaction (ECO §16).
 */
import type { CalculatorDefinition, DecisionFlowDefinition } from "../../content/engagement-values.js";
import type { DeliveryDefinition } from "../../engagement/delivery.js";

function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** JSON safe inside a non-executing <script> block. */
function jsonBlock(data: unknown): string {
  // Escape sequences are built from character codes so no editor can turn them into literal characters.
  const bs = String.fromCharCode(92);
  return JSON.stringify(data)
    .replace(/</g, `${bs}u003c`)
    .replace(new RegExp(String.fromCharCode(0x2028), "g"), `${bs}u2028`)
    .replace(new RegExp(String.fromCharCode(0x2029), "g"), `${bs}u2029`);
}

const domPrefix = (specId: string) => `x-${specId.replace(/[^a-zA-Z0-9-]/g, "-")}`;

/** The DOM id scheme, shared with the host manifest so the browser probe targets the served markup. */
export function experienceDomIds(specId: string) {
  const p = domPrefix(specId);
  return { input: (id: string) => `${p}-in-${id}`, questionName: (id: string) => `${p}-q-${id}` };
}

// ------------------------------------------------------------------ runtime data (what the browser receives)

function calculatorData(specId: string, c: CalculatorDefinition) {
  const p = domPrefix(specId);
  return {
    inputs: c.inputs.map((i) => ({ id: i.id, domId: `${p}-in-${i.id}`, label: i.label, ...(i.min !== undefined ? { min: i.min } : {}), ...(i.max !== undefined ? { max: i.max } : {}) })),
    constants: c.constants.map((k) => ({ id: k.id, value: k.value })),
    expression: c.formula.expression,
    result: { label: c.result.label, unit: c.result.unit, decimals: c.result.decimals },
    formulaName: c.formula.name,
    formulaVersion: c.formula.version,
    basisNote: "The figures and assumptions used are set out under “How this is calculated”.",
  };
}

function decisionFlowData(specId: string, f: DecisionFlowDefinition, offerRoutes: Record<string, string>) {
  const p = domPrefix(specId);
  return {
    questions: f.questions.map((q) => ({ id: q.id, domId: `${p}-q-${q.id}`, domName: `${p}-q-${q.id}`, text: q.text, options: q.options })),
    rules: f.rules,
    outcomes: f.outcomes.map((o) => ({
      id: o.id,
      title: o.title,
      explanation: o.explanation,
      ...(o.recommendedOffer ? { recommendedOffer: o.recommendedOffer } : {}),
      ...(o.recommendedOffer && offerRoutes[o.recommendedOffer] ? { offerHref: offerRoutes[o.recommendedOffer] } : {}),
    })),
    noMatch: f.noMatch,
  };
}

/** The serialised data size the delivery planner reports (the renderer's own serialiser). */
export function experienceDataBytes(specId: string, definition: DeliveryDefinition): number {
  if (definition.type === "calculator") return Buffer.byteLength(jsonBlock(calculatorData(specId, definition.calculator)));
  if (definition.type === "decision_flow") return Buffer.byteLength(jsonBlock(decisionFlowData(specId, definition.flow, definition.offerRoutes)));
  return 0;
}

// ------------------------------------------------------------------ markup

const JS_NOTICE = {
  calculator: "This calculator works in your browser with JavaScript. How the result is calculated is set out below.",
  decision_flow: "These questions work in your browser with JavaScript. How each result is decided is set out below.",
};

function formShell(p: string, kind: keyof typeof JS_NOTICE, legend: string, body: string, actions: string): string {
  return (
    `<form class="c-experience-form" id="${p}-form" novalidate aria-describedby="${p}-status">` +
    `<p class="c-unavailable-notice" role="note" data-requires-js-notice id="${p}-notice">${esc(JS_NOTICE[kind])}</p>` +
    `<div class="c-experience-errors" role="alert" data-experience-errors hidden id="${p}-errors"></div>` +
    `<fieldset class="c-experience-controls" data-requires-js disabled><legend>${esc(legend)}</legend>${body}<p class="c-experience-actions">${actions}</p></fieldset>` +
    `<div class="c-experience-result" data-experience-result role="status" aria-live="polite" tabindex="-1" id="${p}-status"></div>` +
    `</form>`
  );
}

export function renderCalculatorMarkup(specId: string, c: CalculatorDefinition, mode: "interactive" | "static_fallback_only"): string {
  const p = domPrefix(specId);
  const inputs = c.inputs
    .map((i) => {
      const id = `${p}-in-${i.id}`;
      const attrs = [
        i.min !== undefined ? ` min="${i.min}"` : "",
        i.max !== undefined ? ` max="${i.max}"` : "",
        i.step !== undefined ? ` step="${i.step}"` : ' step="any"',
      ].join("");
      return (
        `<p class="c-experience-field"><label for="${id}">${esc(i.label)} (${esc(i.unit)})</label>` +
        `<input id="${id}" name="${esc(i.id)}" type="number" inputmode="decimal"${attrs} required aria-describedby="${id}-hint ${id}-error">` +
        `<span class="c-field-hint" id="${id}-hint">${esc(i.help ?? "")}</span>` +
        `<span class="c-field-error" id="${id}-error"></span></p>`
      );
    })
    .join("");

  const interactive =
    mode === "interactive"
      ? formShell(p, "calculator", `${c.title}: your figures`, `<div class="c-experience-inputs">${inputs}</div>`, '<button type="submit">Calculate</button> <button type="reset">Reset</button>') +
        `<script type="application/json" data-experience-data>${jsonBlock(calculatorData(specId, c))}</script>`
      : "";

  const fmt = (n: number) => String(n);
  const exampleLine = (e: CalculatorDefinition["examples"][number]) =>
    `${c.inputs.map((i) => `${esc(i.label)} ${fmt(e.inputs[i.id] ?? 0)} ${esc(i.unit)}`).join(", ")} → ${esc(c.result.label)} ${fmt(e.expected)}${c.result.unit ? ` ${esc(c.result.unit)}` : ""}`;

  const fallback =
    `<div class="c-experience-fallback" data-experience-fallback>` +
    `<h3>How this is calculated</h3>` +
    `<p>${esc(c.formula.description)}</p>` +
    `<p class="c-experience-source">${esc(c.formula.name)}, version ${esc(c.formula.version)}. Source: ${esc(c.formula.source)}.</p>` +
    `<h4>What you enter</h4><dl class="c-definition-list">${c.inputs.map((i) => `<dt>${esc(i.label)} (${esc(i.unit)})</dt><dd>${esc(i.help ?? (i.min !== undefined || i.max !== undefined ? `from ${i.min ?? "any"} to ${i.max ?? "any"}` : "any value"))}</dd>`).join("")}</dl>` +
    (c.constants.length > 0
      ? `<h4>Figures used</h4><dl class="c-definition-list">${c.constants.map((k) => `<dt>${esc(k.label)}</dt><dd>${fmt(k.value)} ${esc(k.unit)} (source: ${esc(k.source)})</dd>`).join("")}</dl>`
      : "") +
    (c.assumptions.length > 0 ? `<h4>Assumptions</h4><ul>${c.assumptions.map((a) => `<li>${esc(a.text)} (source: ${esc(a.source)})</li>`).join("")}</ul>` : "") +
    `<h4>Worked example${c.examples.length > 1 ? "s" : ""}</h4><ul>${c.examples.map((e) => `<li>${exampleLine(e)}</li>`).join("")}</ul>` +
    (c.limitations.length > 0 ? `<h4>Limits</h4><ul>${c.limitations.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>` : "") +
    `<p>Data source: ${esc(c.dataSource)}</p>` +
    `</div>`;

  return (
    `<section class="c-experience c-experience--calculator" data-experience="calculator" data-experience-id="${esc(specId)}" data-experience-mode="${mode}" aria-labelledby="${p}-title">` +
    `<h2 id="${p}-title">${esc(c.title)}</h2><p>${esc(c.intro)}</p>${interactive}${fallback}</section>`
  );
}

export function renderDecisionFlowMarkup(
  specId: string,
  f: DecisionFlowDefinition,
  offerRoutes: Record<string, string>,
  mode: "interactive" | "static_fallback_only",
): string {
  const p = domPrefix(specId);
  const questions = f.questions
    .map((q) => {
      const qid = `${p}-q-${q.id}`;
      const options = q.options
        .map((o) => `<label class="c-option"><input type="radio" name="${qid}" value="${esc(o.id)}" required> <span>${esc(o.label)}</span></label>`)
        .join("");
      return (
        `<fieldset class="c-question" id="${qid}" aria-describedby="${qid}-error"><legend>${esc(q.text)}</legend>` +
        (q.help ? `<p class="c-field-hint">${esc(q.help)}</p>` : "") +
        `<div class="c-options">${options}</div><span class="c-field-error" id="${qid}-error"></span></fieldset>`
      );
    })
    .join("");

  const submit = f.kind === "selector" ? "Show my match" : "See my result";
  const interactive =
    mode === "interactive"
      ? formShell(p, "decision_flow", f.title, questions, `<button type="submit">${submit}</button> <button type="reset">Start again</button>`) +
        `<script type="application/json" data-experience-data>${jsonBlock(decisionFlowData(specId, f, offerRoutes))}</script>`
      : "";

  const questionText = new Map(f.questions.map((q) => [q.id, q]));
  const conditionText = (rule: DecisionFlowDefinition["rules"][number]) =>
    rule.when
      .map((c) => {
        const q = questionText.get(c.question)!;
        const labels = c.anyOf.map((id) => `“${esc(q.options.find((o) => o.id === id)?.label ?? id)}”`);
        return `${esc(q.text)} ${labels.join(" or ")}`;
      })
      .join("; and ");

  const outcomes = f.outcomes
    .map((o) => {
      const rules = f.rules.filter((r) => r.outcome === o.id);
      const offer = o.recommendedOffer
        ? offerRoutes[o.recommendedOffer]
          ? `<p><a href="${esc(offerRoutes[o.recommendedOffer]!)}">Read about ${esc(o.recommendedOffer)}</a></p>`
          : `<p>Recommended: ${esc(o.recommendedOffer)}</p>`
        : "";
      return (
        `<li><h4>${esc(o.title)}</h4><p>${esc(o.explanation)}</p>` +
        rules.map((r, i) => `<p>${i === 0 ? "Applies when" : "Also applies when"}: ${conditionText(r)}.</p>`).join("") +
        `${offer}</li>`
      );
    })
    .join("");

  const fallback =
    `<div class="c-experience-fallback" data-experience-fallback>` +
    `<h3>How the result is decided</h3><p>${esc(f.ruleSet.description)}</p>` +
    `<ul class="c-experience-outcomes">${outcomes}</ul>` +
    `<p>If none of these apply: <strong>${esc(f.noMatch.title)}</strong>. ${esc(f.noMatch.explanation)}</p>` +
    `<p class="c-experience-source">Rules ${esc(f.ruleSet.id)}, version ${esc(f.ruleSet.version)}. Source: ${esc(f.ruleSet.source)}.</p>` +
    `</div>`;

  return (
    `<section class="c-experience c-experience--decision-flow" data-experience="decision_flow" data-experience-kind="${f.kind}" data-experience-id="${esc(specId)}" data-experience-mode="${mode}" aria-labelledby="${p}-title">` +
    `<h2 id="${p}-title">${esc(f.title)}</h2><p>${esc(f.intro)}</p>${interactive}${fallback}</section>`
  );
}
