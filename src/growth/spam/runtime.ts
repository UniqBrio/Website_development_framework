/**
 * FORM PROTECTION RUNTIME — the browser half of the spam guard.
 *
 * Small, dependency-free and progressive: a protected form works without it
 * (the honeypot is plain HTML; the server simply sees no timing token). With it:
 *   - the timing field records when the form became usable;
 *   - the CAPTCHA provider script loads on the visitor's FIRST interaction with a
 *     form (or on page load, if configured), so a visitor who never touches a form
 *     never pays for it;
 *   - reCAPTCHA v3 obtains its token at submit time;
 *   - the submit button is disabled while a submission is in flight, preventing
 *     double submissions (the server's duplicate check is the authority).
 *
 * The browser half proves nothing on its own. The server verifies every signal
 * (growth/spam/guard.ts).
 */
export const FORM_PROTECTION_RUNTIME_FILE = `/* GENERATED form protection runtime. The server-side guard is the authority. */
(function () {
  "use strict";
  var loading = {};
  function load(src, done) {
    if (loading[src]) { loading[src].push(done); return; }
    loading[src] = [done];
    var s = document.createElement("script");
    s.src = src; s.async = true; s.defer = true;
    s.onload = function () { var q = loading[src]; loading[src] = { push: function (f) { f(); } }; q.forEach(function (f) { f(); }); };
    document.head.appendChild(s);
  }
  function hidden(form, name) {
    var el = form.querySelector('input[name="' + name + '"]');
    if (!el) { el = document.createElement("input"); el.type = "hidden"; el.name = name; form.appendChild(el); }
    return el;
  }
  function waitFor(name, done, tries) {
    if (window[name] && (name !== "grecaptcha" || window.grecaptcha.render)) { done(window[name]); return; }
    if ((tries || 0) > 100) return;
    setTimeout(function () { waitFor(name, done, (tries || 0) + 1); }, 100);
  }
  function setup(form) {
    if (form.getAttribute("data-fg-ready") === "1") return;
    form.setAttribute("data-fg-ready", "1");
    var started = form.querySelector('input[name="_fg_started"]');
    if (started && !started.value) started.value = String(Date.now());
    var provider = form.getAttribute("data-captcha");
    var key = form.getAttribute("data-captcha-key");
    var slot = form.querySelector("[data-captcha-slot]");
    var action = form.getAttribute("data-form-id") || "submit";
    var ready = false;
    function initCaptcha() {
      if (!provider || !key || ready) return;
      ready = true;
      if (provider === "turnstile") {
        load("https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit", function () {
          waitFor("turnstile", function (t) { t.render(slot, { sitekey: key, action: action, appearance: "interaction-only" }); });
        });
      } else if (provider === "recaptcha_v2") {
        load("https://www.google.com/recaptcha/api.js?render=explicit", function () {
          waitFor("grecaptcha", function (g) { g.ready(function () { g.render(slot, { sitekey: key }); }); });
        });
      } else if (provider === "recaptcha_v3") {
        load("https://www.google.com/recaptcha/api.js?render=" + encodeURIComponent(key), function () {});
      }
    }
    if (form.getAttribute("data-captcha-load") === "page_load") initCaptcha();
    else form.addEventListener("focusin", initCaptcha, { once: true });
    form.addEventListener("submit", function (event) {
      if (form.getAttribute("data-fg-submitting") === "1") { event.preventDefault(); return; }
      if (provider === "recaptcha_v3" && form.getAttribute("data-fg-token") !== "1") {
        event.preventDefault();
        initCaptcha();
        waitFor("grecaptcha", function (g) {
          g.ready(function () {
            g.execute(key, { action: action }).then(function (token) {
              hidden(form, "g-recaptcha-response").value = token;
              form.setAttribute("data-fg-token", "1");
              if (form.requestSubmit) form.requestSubmit(); else form.submit();
            });
          });
        });
        return;
      }
      form.setAttribute("data-fg-submitting", "1");
      var button = form.querySelector('button[type="submit"]');
      if (button) { button.setAttribute("aria-disabled", "true"); }
      setTimeout(function () {
        form.removeAttribute("data-fg-submitting");
        form.removeAttribute("data-fg-token");
        if (button) button.removeAttribute("aria-disabled");
      }, 8000);
    });
  }
  function scan() { Array.prototype.forEach.call(document.querySelectorAll("form[data-protection]"), setup); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scan); else scan();
  if (window.MutationObserver) new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
})();
`;
