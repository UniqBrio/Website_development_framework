/* Relavya home — behaviour. No dependencies.
   Motion jobs (animation_library.md):
   - hero constellation: CONCEPT DEMONSTRATION (category 9)
   - problem card:       STORYTELLING, scroll narrative (category 10)
   - loop tabs:          INTERACTION FEEDBACK + state communication
   - reveals, draft:     HIERARCHY / storytelling, one-shot */
(function () {
  "use strict";
  var reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var reduced = function () { return reduceQuery.matches; };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- one-shot entrance reveals */
  (function () {
    var items = $$(".reveal");
    if (!("IntersectionObserver" in window) || reduced()) {
      items.forEach(function (n) { n.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    items.forEach(function (n) { io.observe(n); });
  })();

  /* ---------- problem: the pinned card changes state with the step in view */
  (function () {
    var card = $("#fade-card");
    var steps = $$(".story-step");
    if (!card || !steps.length || !("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        steps.forEach(function (s) { s.classList.toggle("is-current", s === e.target); });
        card.setAttribute("data-state", e.target.getAttribute("data-step"));
      });
    }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });
    steps.forEach(function (s) { io.observe(s); });
    steps[0].classList.add("is-current");
  })();

  /* ---------- how it works: tabs (arrow keys, Home/End) */
  (function () {
    var tabs = $$(".loop-tab"), desc = $(".loop-desc");
    if (!tabs.length) return;
    function select(i, focus) {
      if (desc) desc.textContent = $(".d", tabs[i]).textContent;   // narrow layout: caption under the chips
      tabs.forEach(function (t, k) {
        var on = k === i;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
        var p = document.getElementById(t.getAttribute("aria-controls"));
        if (p) p.hidden = !on;
      });
      if (focus) tabs[i].focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { select(i, false); });
      t.addEventListener("keydown", function (e) {
        var n = { ArrowDown: i + 1, ArrowRight: i + 1, ArrowUp: i - 1, ArrowLeft: i - 1,
                  Home: 0, End: tabs.length - 1 }[e.key];
        if (n === undefined) return;
        e.preventDefault();
        select((n + tabs.length) % tabs.length, true);
      });
    });
    select(0, false);
  })();

  /* ---------- features: the draft writes itself once, from the saved notes */
  (function () {
    var el = $("#draft");
    if (!el || reduced() || !("IntersectionObserver" in window)) { if (el) el.classList.add("is-done"); return; }
    var text = el.getAttribute("data-text");
    var io = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      el.textContent = "";
      var caret = document.createElement("span");
      caret.className = "caret";
      var node = document.createTextNode("");
      el.appendChild(node); el.appendChild(caret);
      var i = 0;
      var t = setInterval(function () {
        i += 2; node.data = text.slice(0, i);
        if (i >= text.length) { clearInterval(t); el.classList.add("is-done"); }
      }, 28);
    }, { threshold: 0.6 });
    io.observe(el);
  })();

  /* ---------- hero: the constellation of people you met ---------- */
  (function () {
    var root = $("#hero-visual");
    if (!root) return;
    var canvas = $("canvas", root), ctx = canvas.getContext && canvas.getContext("2d");
    var card = $(".memory", root), statusEl = $(".memory-status", card);
    var rows = $$(".memory-row", card), toggle = $('[data-motion-control="hero"]');
    if (!ctx) return;                       // the poster stays

    var EVENTS = ["INTEC Expo 2026", "Founders meetup", "Client meetings"];
    // Illustrative sample data — labelled on the page.
    var PEOPLE = [
      { i: "NR", e: 0, name: "Nandini Raghavan", role: "Co-founder · Loomcraft Labs", talked: "Warehouse routing for D2C brands", promised: "Send the routing demo", via: "WhatsApp" },
      { i: "AM", e: 0 }, { i: "FQ", e: 0 },
      { i: "PS", e: 1, name: "Priya Sharma", role: "Founder · Tidewave Studio", talked: "Hiring her first sales lead", promised: "Introduce a recruiter", via: "LinkedIn" },
      { i: "KS", e: 1 }, { i: "MR", e: 1 },
      { i: "DV", e: 2, name: "Dev Varma", role: "Ops lead · Northbay Foods", talked: "Route planning for 40 trucks", promised: "Share the case study", via: "email" },
      { i: "IT", e: 2 }, { i: "RN", e: 2 }
    ];
    var STORY = [0, 3, 6];                   // one person per event
    var BEAT = 6.4;                          // seconds per person; loop = 19.2 s
    var D2R = Math.PI / 180;

    function sph(theta, phi, r) {
      return { x: r * Math.cos(phi) * Math.sin(theta), y: -r * Math.sin(phi), z: r * Math.cos(phi) * Math.cos(theta) };
    }
    var ePhi = [14, -24, 26], pOff = [[-30, 26], [4, -30], [32, 10]];
    var events = EVENTS.map(function (label, k) {
      return { label: label, theta: k * 120 * D2R, p: sph(k * 120 * D2R, ePhi[k] * D2R, 0.6) };
    });
    var seat = [0, 0, 0];
    PEOPLE.forEach(function (p) {
      var o = pOff[seat[p.e]++], ev = events[p.e];
      p.theta = ev.theta + o[0] * D2R;
      p.p = sph(p.theta, (ePhi[p.e] + o[1]) * D2R, 1);
      p.sent = false;
    });
    // Faint points on the sphere: the depth cue. Not a map — no geography is drawn.
    var dust = [];
    for (var d = 0; d < 150; d++) {
      var yy = 1 - (d / 149) * 2, rr = Math.sqrt(1 - yy * yy), a = d * 2.399963;
      dust.push({ x: Math.cos(a) * rr * 1.08, y: yy * 1.08, z: Math.sin(a) * rr * 1.08 });
    }

    var W = 0, H = 0, S = 0, cx = 0, cy = 0, dpr = 1, compact = false;
    var col = {};
    function readTokens() {
      var cs = getComputedStyle(document.documentElement);
      ["--text", "--text-3", "--accent", "--accent-text", "--accent-2", "--on-accent-2", "--success",
       "--raised", "--bg", "--border-strong", "--font-display", "--font-mono"].forEach(function (k) {
        col[k] = cs.getPropertyValue(k).trim();
      });
    }
    function resize() {
      var r = root.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height; compact = W < 430;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      S = Math.min(W, H) * (compact ? 0.42 : 0.39); cx = W * (compact ? 0.5 : 0.555); cy = H * (compact ? 0.305 : 0.465);
      if (compact) cy = S * 1.13 + 8;       // narrow: sphere on top, memory card beneath it
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    var rot = 0, rotTarget = 0, tilt = -13 * D2R, dragOffset = 0;
    function project(p) {
      var c = Math.cos(rot + dragOffset), s = Math.sin(rot + dragOffset);
      var x = p.x * c + p.z * s, z = -p.x * s + p.z * c, y = p.y;
      var ct = Math.cos(tilt), st = Math.sin(tilt);
      var y2 = y * ct - z * st, z2 = y * st + z * ct;
      var k = 3.4 / (3.4 - z2);
      return { x: cx + x * k * S, y: cy + y2 * k * S, z: z2, k: k };
    }
    function alpha(z, lo) { return lo + (1 - lo) * Math.min(1, Math.max(0, (z + 1) / 2)); }
    function rgba(hex, a) {
      var n = parseInt(hex.slice(1), 16);
      return "rgba(" + (n >> 16 & 255) + "," + (n >> 8 & 255) + "," + (n & 255) + "," + a + ")";
    }
    // Links bow outward from the centre, so the figure reads as a sphere.
    function ctrl(a, b) {
      var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      return { x: cx + (mx - cx) * 1.22, y: cy + (my - cy) * 1.22 };
    }
    function along(a, b, v) {
      var c = ctrl(a, b), u = 1 - v;
      return { x: u * u * a.x + 2 * u * v * c.x + v * v * b.x, y: u * u * a.y + 2 * u * v * c.y + v * v * b.y };
    }
    function line(a, b, color, w, dash) {
      var c = ctrl(a, b);
      ctx.beginPath(); ctx.setLineDash(dash || []); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(c.x, c.y, b.x, b.y);
      ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke(); ctx.setLineDash([]);
    }
    function pill(x, y, text, a, hot) {
      ctx.font = "400 " + (compact ? 10 : 11.5) + "px " + col["--font-mono"];
      var w = ctx.measureText(text).width + 22, h = compact ? 22 : 26;
      ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, h / 2);
      ctx.fillStyle = rgba(col["--raised"], 0.92 * a); ctx.fill();
      ctx.strokeStyle = hot ? rgba(col["--accent"], a) : rgba(col["--text"], 0.18 * a); ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = rgba(hot ? col["--text"] : col["--text-3"], a);
      ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, x, y + 0.5);
    }

    var state = { person: -1, phase: 0, t: 0 };
    function setCard(p, phase, pos) {
      if (!p) { card.classList.remove("is-on"); return; }
      if (card.getAttribute("data-for") !== p.i) {
        card.setAttribute("data-for", p.i);
        $(".memory-name", card).textContent = p.name;
        $(".memory-role", card).textContent = p.role;
        $('[data-k="event"]', card).textContent = EVENTS[p.e];
        $('[data-k="talked"]', card).textContent = p.talked;
        $('[data-k="promised"]', card).textContent = p.promised;
      }
      card.classList.toggle("is-on", phase >= 1 && phase <= 4);
      rows.forEach(function (r, k) { r.classList.toggle("is-on", phase > 1 || (phase === 1 && state.t > 1.0 + k * 0.45)); });
      statusEl.classList.toggle("is-on", phase >= 3);
      statusEl.classList.toggle("is-sent", phase >= 4);
      $("span", statusEl).textContent = phase >= 4 ? "Yes, sent" : "Follow-up ready · " + p.via;
      $("use", statusEl).setAttribute("href", phase >= 4 ? "#i-check" : "#i-send");
    }
    // A thin leader ties the docked memory card to the person it is about.
    function leader(pos) {
      if (!pos || !card.classList.contains("is-on")) return;
      var tx = compact ? card.offsetLeft : card.offsetLeft + card.offsetWidth;
      var ty = card.offsetTop + (compact ? 0 : 26);
      if (compact) tx = W / 2;
      ctx.beginPath(); ctx.setLineDash([2, 4]); ctx.moveTo(pos.x, pos.y);
      ctx.quadraticCurveTo(pos.x, ty, tx, ty);
      ctx.strokeStyle = rgba(col["--accent"], 0.7); ctx.lineWidth = 1.2; ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(tx, ty, 3, 0, Math.PI * 2); ctx.fillStyle = col["--accent"]; ctx.fill();
    }

    function draw(now) {
      ctx.clearRect(0, 0, W, H);
      var you = project({ x: 0, y: 0, z: 0 });
      var act = state.person >= 0 ? PEOPLE[state.person] : null;

      // the sphere: outline, three turning meridians, and dust for depth
      var R = S * 1.13;
      var halo = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R);
      halo.addColorStop(0, rgba(col["--accent-2"], 0.16)); halo.addColorStop(1, rgba(col["--accent-2"], 0.02));
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fillStyle = halo; ctx.fill();
      ctx.strokeStyle = rgba(col["--text"], 0.12); ctx.lineWidth = 1; ctx.stroke();
      for (var m = 0; m < 3; m++) {
        var rx = Math.abs(Math.sin(rot + dragOffset + m * Math.PI / 3)) * R;
        ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(0.5, rx), R, 0, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(col["--text"], 0.045); ctx.stroke();
      }
      ctx.beginPath(); ctx.ellipse(cx, cy, R, R * Math.abs(Math.sin(tilt)) * 1.6, 0, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(col["--text"], 0.05); ctx.stroke();
      for (var i = 0; i < dust.length; i++) {
        var q = project(dust[i]);
        ctx.fillStyle = rgba(col["--text"], 0.06 + 0.3 * alpha(q.z, 0));
        ctx.fillRect(q.x, q.y, 1.5 * q.k, 1.5 * q.k);
      }

      var ev = events.map(function (e) { var q = project(e.p); q.e = e; return q; });
      var pp = PEOPLE.map(function (p) { var q = project(p.p); q.p = p; return q; });

      // links
      ev.forEach(function (q) { line(you, q, rgba(col["--text"], 0.16 * alpha(q.z, 0.35)), 1, [3, 5]); });
      pp.forEach(function (q) {
        var hot = q.p === act && state.phase >= 1;
        line(ev[q.p.e], q, hot ? rgba(col["--accent"], 0.9) : rgba(col["--text"], 0.14 * alpha(q.z, 0.3)), hot ? 1.6 : 1);
      });
      if (act && state.phase >= 1) line(you, ev[act.e], rgba(col["--accent"], 0.75), 1.4, [3, 5]);

      // the follow-up travelling: you -> event -> person
      if (act && state.phase === 3) {
        var u = Math.min(1, (state.t - 3.0) / 1.25), a = you, b = ev[act.e], v = u * 2;
        if (v > 1) { a = ev[act.e]; b = pp[state.person]; v -= 1; }
        var pt = along(a, b, v), px = pt.x, py = pt.y;
        var g = ctx.createRadialGradient(px, py, 0, px, py, 16);
        g.addColorStop(0, rgba(col["--accent-text"], 0.95)); g.addColorStop(1, rgba(col["--accent"], 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, 16, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = col["--text"]; ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
      }

      // nodes, far to near
      var all = ev.map(function (q) { return { q: q, kind: "e" }; })
        .concat(pp.map(function (q) { return { q: q, kind: "p" }; }))
        .concat([{ q: you, kind: "y" }]).sort(function (m, n) { return m.q.z - n.q.z; });
      all.forEach(function (n) {
        var q = n.q, al = alpha(q.z, 0.3);
        if (n.kind === "e") {
          pill(q.x, q.y, q.e.label, al, act && events[act.e] === q.e && state.phase >= 1);
        } else if (n.kind === "y") {
          var r = (compact ? 24 : 32) * q.k, gr = ctx.createLinearGradient(q.x - r, q.y - r, q.x + r, q.y + r);
          gr.addColorStop(0, col["--accent"]); gr.addColorStop(1, col["--accent-2"]);
          ctx.beginPath(); ctx.arc(q.x, q.y, r + 10, 0, Math.PI * 2); ctx.fillStyle = rgba(col["--accent-2"], 0.18); ctx.fill();
          ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, Math.PI * 2); ctx.fillStyle = gr; ctx.fill();
          ctx.fillStyle = col["--text"]; ctx.font = "700 " + (compact ? 13 : 15) + "px " + col["--font-display"];
          ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("You", q.x, q.y + 1);
        } else {
          var p = q.p, isAct = p === act && state.phase >= 0, rad = (compact ? 14 : 20) * q.k * (isAct ? 1.22 : 1);
          if (isAct) {
            var pulse = state.phase === 0 ? state.t / 0.9 : 1;
            ctx.beginPath(); ctx.arc(q.x, q.y, rad + 9 * pulse, 0, Math.PI * 2);
            ctx.fillStyle = rgba(p.sent ? col["--success"] : col["--accent"], 0.16); ctx.fill();
          }
          ctx.beginPath(); ctx.arc(q.x, q.y, rad, 0, Math.PI * 2);
          ctx.fillStyle = rgba(col["--accent-2"], isAct ? 1 : al); ctx.fill();
          if (p.sent || isAct) {
            ctx.lineWidth = 2.2; ctx.strokeStyle = p.sent ? col["--success"] : col["--accent"]; ctx.stroke();
          }
          ctx.fillStyle = rgba(col["--text"], isAct ? 1 : Math.min(1, al + 0.15));
          ctx.font = "700 " + Math.max(9, rad * 0.72) + "px " + col["--font-display"];
          ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(p.i, q.x, q.y + 0.5);
          if (p.sent) {                      // the kept promise stays visible
            var bx = q.x + rad * 0.78, by = q.y - rad * 0.78;
            ctx.beginPath(); ctx.arc(bx, by, 7, 0, Math.PI * 2); ctx.fillStyle = col["--success"]; ctx.fill();
            ctx.beginPath(); ctx.moveTo(bx - 3, by); ctx.lineTo(bx - 0.800, by + 2.400); ctx.lineTo(bx + 3.200, by - 2.200);
            ctx.strokeStyle = col["--bg"]; ctx.lineWidth = 1.800; ctx.stroke();
          }
        }
      });
      var actPos = act ? pp[state.person] : null;
      leader(actPos);
      return actPos;
    }

    // phases: 0 meet · 1 remember · 2 hold · 3 follow up · 4 sent · 5 rest
    function phaseAt(t) { return t < 0.9 ? 0 : t < 2.6 ? 1 : t < 3.0 ? 2 : t < 4.3 ? 3 : t < 5.9 ? 4 : 5; }
    function facing(p) { return -(p.theta) + 0.5; }
    function nearest(target, from) {
      var two = Math.PI * 2, dlt = ((target - from) % two + two) % two;
      return from + (dlt > Math.PI ? dlt - two : dlt);
    }

    var clock = 0, last = 0, raf = 0, running = false, userPaused = false, visible = true, ready = false;
    function frame(now) {
      raf = 0;
      if (!running) return;
      var dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
      clock += dt;
      var loopT = clock % (BEAT * STORY.length), idx = Math.floor(loopT / BEAT);
      if (loopT < dt * 1.5 && clock > 1) PEOPLE.forEach(function (p) { p.sent = false; });
      state.person = STORY[idx]; state.t = loopT - idx * BEAT; state.phase = phaseAt(state.t);
      var p = PEOPLE[state.person];
      if (state.phase >= 4) p.sent = true;
      rotTarget = nearest(facing(p), rot);
      rot += (rotTarget - rot) * Math.min(1, dt * 2.2);
      dragOffset *= 1 - Math.min(1, dt * 1.5);
      setCard(p, state.phase, draw(now));
      raf = requestAnimationFrame(frame);
    }
    function start() { if (ready && !running && !userPaused && visible && !reduced()) { running = true; last = 0; raf = requestAnimationFrame(frame); } }
    function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }

    // The static frame: the idea in one picture (also the reduced-motion view).
    function still() {
      if (!ready) return;
      stop();
      PEOPLE.forEach(function (p) { p.sent = false; });
      var p = PEOPLE[STORY[0]];
      PEOPLE[1].sent = true; p.sent = true;
      state.person = STORY[0]; state.phase = 4; state.t = 5; rot = facing(p); dragOffset = 0;
      setCard(p, 4, draw(0));
    }

    function boot() {
      readTokens(); resize(); ready = true;
      root.classList.add("is-live");
      if (reduced()) { still(); if (toggle) toggle.hidden = true; } else { start(); }
    }

    if (toggle) toggle.addEventListener("click", function () {
      userPaused = !userPaused;
      toggle.setAttribute("aria-pressed", userPaused ? "true" : "false");
      toggle.setAttribute("aria-label", userPaused ? "Play animation" : "Pause animation");
      $("span", toggle).textContent = userPaused ? "Play" : "Pause";
      if (userPaused) stop(); else start();
    });

    // drag to turn (horizontal only; vertical scroll is never captured)
    var dragX = null;
    canvas.addEventListener("pointerdown", function (e) { dragX = e.clientX; root.classList.add("is-dragging"); });
    window.addEventListener("pointermove", function (e) {
      if (dragX === null) return;
      dragOffset += (e.clientX - dragX) * 0.006; dragX = e.clientX;
      if (!running) setCard(PEOPLE[state.person], state.phase, draw(0));
    });
    window.addEventListener("pointerup", function () { dragX = null; root.classList.remove("is-dragging"); });

    // stopped whenever it cannot be seen
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        if (visible) start(); else stop();
      }, { threshold: 0.15 }).observe(root);
    }
    document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else start(); });
    if (reduceQuery.addEventListener) reduceQuery.addEventListener("change", function () { if (reduced()) still(); else start(); });
    var rz = 0;
    window.addEventListener("resize", function () {
      clearTimeout(rz);
      rz = setTimeout(function () { resize(); if (!running) setCard(PEOPLE[state.person] || null, state.phase, state.person >= 0 ? draw(0) : null); }, 120);
    });

    // start after first paint, once fonts are ready: the headline is the LCP, not this
    var go = function () { requestAnimationFrame(function () { setTimeout(boot, 60); }); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go, go); else go();
    window.__heroVisual = { still: still };  // used by tools/capture_visual.mjs runs
  })();
})();
