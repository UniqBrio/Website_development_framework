/**
 * EXPERIENCE RUNTIME — the ONE implementation of calculator evaluation and
 * decision-rule matching, and the browser enhancement that uses it.
 *
 * Why a JavaScript SOURCE STRING and not TypeScript functions: the browser must
 * run exactly the code the framework checked. The core instantiates
 * `EVALUATOR_SOURCE` (see `loadEvaluator`) to verify owner examples before a
 * calculator may publish; the generated `/experiences.js` embeds the same text.
 * Two implementations — one in TS for checks, one in JS for pages — could
 * disagree silently; one cannot.
 *
 * Constraints the source obeys (asserted by tests):
 *  - no dependency, no network, no storage, no eval of page data
 *  - writes only `textContent` and attributes, never `innerHTML` (owner strings
 *    are data, not markup)
 *  - no animation (reduced motion is trivially honoured)
 *  - analytics are `CustomEvent`s on `document` (`framework:experience`); nothing
 *    is sent anywhere unless a host listens
 */

/** Pure functions: evaluateFormula(expr, inputs, constants) and matchRules(rules, answers). */
export const EVALUATOR_SOURCE = String.raw`
function evaluateFormula(expr, inputs, constants, depth) {
  depth = depth || 0;
  if (depth > 12) throw new Error("expression too deep");
  if (expr && typeof expr === "object" && "input" in expr) {
    var v = inputs[expr.input];
    if (typeof v !== "number" || !isFinite(v)) throw new Error("missing input " + expr.input);
    return v;
  }
  if (expr && typeof expr === "object" && "constant" in expr) {
    var c = constants[expr.constant];
    if (typeof c !== "number" || !isFinite(c)) throw new Error("missing constant " + expr.constant);
    return c;
  }
  var op = expr && expr.op;
  if (op === "round") {
    var x = evaluateFormula(expr.arg, inputs, constants, depth + 1);
    var f = Math.pow(10, expr.decimals);
    return Math.round(x * f) / f;
  }
  var args = (expr && expr.args ? expr.args : []).map(function (a) { return evaluateFormula(a, inputs, constants, depth + 1); });
  if (args.length < 2) throw new Error("operator " + op + " needs two or more arguments");
  switch (op) {
    case "add": return args.reduce(function (a, b) { return a + b; });
    case "subtract": return args.reduce(function (a, b) { return a - b; });
    case "multiply": return args.reduce(function (a, b) { return a * b; });
    case "divide": return args.reduce(function (a, b) { if (b === 0) throw new Error("division by zero"); return a / b; });
    case "min": return Math.min.apply(null, args);
    case "max": return Math.max.apply(null, args);
    default: throw new Error("unknown operator " + op);
  }
}

function matchRules(rules, answers) {
  for (var i = 0; i < rules.length; i++) {
    var rule = rules[i];
    var ok = rule.when.every(function (c) { return c.anyOf.indexOf(answers[c.question]) !== -1; });
    if (ok) return rule;
  }
  return null;
}
`;

/** DOM enhancement. Relies on EVALUATOR_SOURCE being in the same scope. */
const DOM_SOURCE = String.raw`
var READY = "data-experience-ready";

function emit(root, name) {
  try {
    document.dispatchEvent(new CustomEvent("framework:experience", { detail: { event: name, experience: root.getAttribute("data-experience-id") } }));
  } catch { /* CustomEvent unsupported: analytics are optional */ }
}

function dataOf(root) {
  var node = root.querySelector("script[data-experience-data]");
  return node ? JSON.parse(node.textContent || "{}") : null;
}

function unlock(root) {
  var fieldset = root.querySelector("fieldset[data-requires-js]");
  if (fieldset) fieldset.disabled = false;
  var notice = root.querySelector("[data-requires-js-notice]");
  if (notice) notice.hidden = true;
}

function setError(container, message) {
  if (!container) return;
  container.textContent = message || "";
}

function showSummary(root, messages) {
  var summary = root.querySelector("[data-experience-errors]");
  if (!summary) return;
  summary.textContent = "";
  if (messages.length === 0) { summary.hidden = true; return; }
  var heading = document.createElement("p");
  heading.textContent = messages.length === 1 ? "There is 1 problem:" : "There are " + messages.length + " problems:";
  var list = document.createElement("ul");
  messages.forEach(function (m) { var li = document.createElement("li"); li.textContent = m; list.appendChild(li); });
  summary.appendChild(heading);
  summary.appendChild(list);
  summary.hidden = false;
}

function formatNumber(value, decimals) {
  try {
    return new Intl.NumberFormat(document.documentElement.lang || "en", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
  } catch {
    return value.toFixed(decimals);
  }
}

function enhanceCalculator(root, data) {
  var form = root.querySelector("form");
  var result = root.querySelector("[data-experience-result]");
  var started = false;
  unlock(root);
  form.addEventListener("input", function () { if (!started) { started = true; emit(root, "experience_started"); } });
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var values = {};
    var messages = [];
    var firstInvalid = null;
    data.inputs.forEach(function (input) {
      var el = form.querySelector("#" + input.domId);
      var error = form.querySelector("#" + input.domId + "-error");
      var raw = (el.value || "").trim();
      var message = "";
      if (raw === "") message = "Enter " + input.label.toLowerCase();
      else if (!isFinite(Number(raw))) message = "Enter a number for " + input.label.toLowerCase();
      else if (input.min !== undefined && Number(raw) < input.min) message = input.label + " must be at least " + input.min;
      else if (input.max !== undefined && Number(raw) > input.max) message = input.label + " must be at most " + input.max;
      if (message) {
        el.setAttribute("aria-invalid", "true");
        setError(error, message);
        messages.push(message);
        if (!firstInvalid) firstInvalid = el;
      } else {
        el.removeAttribute("aria-invalid");
        setError(error, "");
        values[input.id] = Number(raw);
      }
    });
    showSummary(root, messages);
    result.textContent = "";
    result.removeAttribute("data-value");
    if (firstInvalid) { firstInvalid.focus(); return; }
    var constants = {};
    data.constants.forEach(function (c) { constants[c.id] = c.value; });
    var value;
    try {
      value = evaluateFormula(data.expression, values, constants);
    } catch (e) {
      showSummary(root, ["This combination of values cannot be calculated: " + e.message]);
      return;
    }
    var heading = document.createElement("p");
    heading.className = "c-experience-result-value";
    heading.textContent = data.result.label + ": " + formatNumber(value, data.result.decimals) + (data.result.unit ? " " + data.result.unit : "");
    var basis = document.createElement("p");
    basis.textContent = "Calculated from your inputs using " + data.formulaName + " (version " + data.formulaVersion + "). " + data.basisNote;
    result.appendChild(heading);
    result.appendChild(basis);
    result.setAttribute("data-value", String(value));
    result.focus();
    emit(root, "experience_completed");
    emit(root, "result_viewed");
  });
  form.addEventListener("reset", function () {
    setTimeout(function () {
      data.inputs.forEach(function (input) {
        var el = form.querySelector("#" + input.domId);
        el.removeAttribute("aria-invalid");
        setError(form.querySelector("#" + input.domId + "-error"), "");
      });
      showSummary(root, []);
      result.textContent = "";
      result.removeAttribute("data-value");
      var first = form.querySelector("#" + data.inputs[0].domId);
      if (first) first.focus();
    }, 0);
  });
}

function enhanceDecisionFlow(root, data) {
  var form = root.querySelector("form");
  var result = root.querySelector("[data-experience-result]");
  var started = false;
  unlock(root);
  form.addEventListener("change", function () { if (!started) { started = true; emit(root, "experience_started"); } });
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var answers = {};
    var messages = [];
    var firstUnanswered = null;
    data.questions.forEach(function (q) {
      var checked = form.querySelector("input[name='" + q.domName + "']:checked");
      var error = form.querySelector("#" + q.domId + "-error");
      if (!checked) {
        var message = "Choose an answer for: " + q.text;
        setError(error, message);
        messages.push(message);
        if (!firstUnanswered) firstUnanswered = form.querySelector("input[name='" + q.domName + "']");
      } else {
        setError(error, "");
        answers[q.id] = checked.value;
      }
    });
    showSummary(root, messages);
    result.textContent = "";
    result.removeAttribute("data-outcome");
    if (firstUnanswered) { firstUnanswered.focus(); return; }
    var rule = matchRules(data.rules, answers);
    var outcome = rule ? data.outcomes.filter(function (o) { return o.id === rule.outcome; })[0] : null;
    var title = document.createElement("h3");
    title.tabIndex = -1;
    title.textContent = outcome ? outcome.title : data.noMatch.title;
    var explanation = document.createElement("p");
    explanation.textContent = outcome ? outcome.explanation : data.noMatch.explanation;
    result.appendChild(title);
    result.appendChild(explanation);
    if (rule) {
      var why = document.createElement("p");
      why.textContent = "Why this result: " + rule.when.map(function (c) {
        var q = data.questions.filter(function (x) { return x.id === c.question; })[0];
        var opt = q.options.filter(function (o) { return o.id === answers[c.question]; })[0];
        return q.text + " — " + opt.label;
      }).join("; ") + ".";
      result.appendChild(why);
    }
    if (outcome && outcome.offerHref) {
      var p = document.createElement("p");
      var link = document.createElement("a");
      link.href = outcome.offerHref;
      link.textContent = "Read about " + outcome.recommendedOffer;
      p.appendChild(link);
      result.appendChild(p);
    }
    result.setAttribute("data-outcome", outcome ? outcome.id : "no-match");
    title.focus();
    emit(root, "experience_completed");
    emit(root, "result_viewed");
  });
  form.addEventListener("reset", function () {
    setTimeout(function () {
      data.questions.forEach(function (q) {
        setError(form.querySelector("#" + q.domId + "-error"), "");
      });
      showSummary(root, []);
      result.textContent = "";
      result.removeAttribute("data-outcome");
      var first = form.querySelector("input[type='radio']");
      if (first) first.focus();
    }, 0);
  });
}

function enhance(root) {
  if (root.hasAttribute(READY)) return;
  var data = dataOf(root);
  if (!data) return;
  var type = root.getAttribute("data-experience");
  if (type === "calculator") enhanceCalculator(root, data);
  else if (type === "decision_flow") enhanceDecisionFlow(root, data);
  else return;
  root.setAttribute(READY, "true");
  emit(root, "experience_viewed");
}

function enhanceAll() {
  var roots = document.querySelectorAll("[data-experience='calculator'], [data-experience='decision_flow']");
  for (var i = 0; i < roots.length; i++) enhance(roots[i]);
}

enhanceAll();
if (typeof MutationObserver !== "undefined") {
  // Client-side navigation (Next.js) inserts pages without reloading this script.
  new MutationObserver(enhanceAll).observe(document.documentElement, { childList: true, subtree: true });
}
`;

/** The file served as `/experiences.js`. */
export const EXPERIENCE_RUNTIME_FILE = `/* GENERATED — framework experience runtime. No dependencies, no network. */\n(function () {\n"use strict";\n${EVALUATOR_SOURCE}\n${DOM_SOURCE}\n})();\n`;

export const EXPERIENCE_RUNTIME_PATH = "/experiences.js";

export interface Evaluator {
  evaluateFormula(expr: unknown, inputs: Record<string, number>, constants: Record<string, number>): number;
  matchRules<R extends { when: Array<{ question: string; anyOf: string[] }> }>(rules: R[], answers: Record<string, string>): R | null;
}

/**
 * The core's handle on the SAME evaluator the browser runs. `new Function` over a
 * framework-owned constant — never over page or owner data.
 */
export function loadEvaluator(): Evaluator {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  return new Function(`${EVALUATOR_SOURCE}\nreturn { evaluateFormula: evaluateFormula, matchRules: matchRules };`)() as Evaluator;
}
