/* concept_visual.js — the reusable runtime behind every generated concept
   visual (website_workflow/asset_production.md RUNG 1; built and exported by
   tools/build_concept_visual.py). No dependencies.

   One runtime, several ARCHETYPES. Each archetype is a pure function of
   (spec, time): the same spec and time always draw the same frame. That is
   what lets one source serve the live embed, the poster, the GIF and the
   video without them drifting apart.

   Colour and type come from the spec's theme, or from --cv-* custom
   properties on the container when the site maps its own tokens onto them.
   Nothing in this file names a colour. */
(function () {
  "use strict";

  /* ------------------------------------------------------------ helpers */
  var TAU = Math.PI * 2;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, u) { return a + (b - a) * u; }
  function ease(u) { u = clamp(u, 0, 1); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; }
  function easeOut(u) { u = clamp(u, 0, 1); return 1 - Math.pow(1 - u, 3); }
  function span(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
  function rgba(c, a) {
    var h = String(c).trim().replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return "rgba(" + (n >> 16 & 255) + "," + (n >> 8 & 255) + "," + (n & 255) + "," + clamp(a, 0, 1) + ")";
  }
  function rng(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  function G(ctx, W, H, spec, col) {
    this.ctx = ctx; this.W = W; this.H = H; this.spec = spec; this.col = col;
    this.compact = W < 430;
    // one scale unit for every size in the frame; phones get a larger one so labels stay legible
    this.u = this.compact ? clamp(W / 400, 0.85, 1.05) : clamp(Math.min(W, H) / 640, 0.62, 1.15);
  }
  G.prototype.font = function (weight, size, kind) {
    this.ctx.font = weight + " " + Math.round(size * 10) / 10 + "px " + this.col["font" + (kind || "Body")];
  };
  G.prototype.rr = function (x, y, w, h, r) { this.ctx.beginPath(); this.ctx.roundRect(x, y, w, h, Math.min(r, h / 2, w / 2)); };
  G.prototype.text = function (s, x, y, color, align, base) {
    var c = this.ctx; c.fillStyle = color; c.textAlign = align || "left"; c.textBaseline = base || "alphabetic"; c.fillText(s, x, y);
  };
  G.prototype.wrap = function (s, maxW) {
    var words = String(s).split(/\s+/), lines = [], cur = "";
    for (var i = 0; i < words.length; i++) {
      var test = cur ? cur + " " + words[i] : words[i];
      if (this.ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = words[i]; } else cur = test;
    }
    if (cur) lines.push(cur);
    return lines;
  };
  G.prototype.tick = function (x, y, r, color, on) {
    var c = this.ctx;
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = color; c.fill();
    c.beginPath(); c.moveTo(x - r * 0.42, y + r * 0.02); c.lineTo(x - r * 0.1, y + r * 0.36); c.lineTo(x + r * 0.46, y - r * 0.3);
    c.strokeStyle = on; c.lineWidth = Math.max(1.4, r * 0.26); c.lineCap = "round"; c.lineJoin = "round"; c.stroke();
  };
  G.prototype.pill = function (x, y, label, a, hot) {
    var c = this.ctx, col = this.col; this.font(400, 11.5 * this.u, "Mono");
    var w = c.measureText(label).width + 22 * this.u, h = 25 * this.u;
    this.rr(x - w / 2, y - h / 2, w, h, h / 2);
    c.fillStyle = rgba(col.surface, 0.94 * a); c.fill();
    c.lineWidth = 1; c.strokeStyle = hot ? rgba(col.accent, a) : rgba(col.text, 0.18 * a); c.stroke();
    this.text(label, x, y + 0.5, rgba(hot ? col.text : col.muted, a), "center", "middle");
    return w;
  };
  G.prototype.glow = function (x, y, r, color, a) {
    var c = this.ctx, g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(color, a)); g.addColorStop(1, rgba(color, 0));
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  };
  /* A panel of labelled facts: title, subtitle, rows revealed one by one, status line. */
  G.prototype.card = function (x, y, w, o) {
    var c = this.ctx, col = this.col, u = this.u, pad = 15 * u, lh = 16.5 * u, keyW = 74 * u, rows = [], i;
    this.font(400, 12.5 * u);
    for (i = 0; i < o.facts.length; i++) rows.push(this.wrap(o.facts[i][1], w - pad * 2 - keyW));
    var h = pad + 19 * u + (o.subtitle ? 16 * u : 0) + 10 * u;
    for (i = 0; i < rows.length; i++) h += rows[i].length * lh + 6 * u;
    h += 34 * u;
    if (o.measure) return h;
    c.save(); c.globalAlpha = o.alpha; c.translate(0, (1 - o.alpha) * 8);
    c.shadowColor = rgba(col.bg, 0.6); c.shadowBlur = 30 * u; c.shadowOffsetY = 12 * u;
    this.rr(x, y, w, h, 14 * u); c.fillStyle = rgba(col.surface, 0.97); c.fill();
    c.shadowColor = "transparent"; c.lineWidth = 1; c.strokeStyle = rgba(col.text, 0.16); c.stroke();
    var cy = y + pad + 13 * u;
    this.font(700, 15 * u, "Display"); this.text(o.title, x + pad, cy, col.text);
    if (o.subtitle) { cy += 17 * u; this.font(400, 12 * u); this.text(o.subtitle, x + pad, cy, col.muted); }
    cy += 12 * u;
    for (i = 0; i < rows.length; i++) {
      var a = clamp(o.reveal - i, 0, 1);
      c.globalAlpha = o.alpha * a;
      this.font(400, 9.5 * u, "Mono"); this.text(String(o.facts[i][0]).toUpperCase(), x + pad, cy + lh * 0.72, col.muted);
      this.font(400, 12.5 * u);
      for (var k = 0; k < rows[i].length; k++) this.text(rows[i][k], x + pad + keyW, cy + lh * (k + 0.72), col.text);
      cy += rows[i].length * lh + 6 * u;
    }
    c.globalAlpha = o.alpha * clamp(o.statusAlpha, 0, 1);
    c.beginPath(); c.moveTo(x + pad, cy + 3 * u); c.lineTo(x + w - pad, cy + 3 * u); c.strokeStyle = rgba(col.text, 0.1); c.stroke();
    var sc = o.done ? col.success : col.accent;
    if (o.done) this.tick(x + pad + 7 * u, cy + 18 * u, 7 * u, sc, col.surface);
    else { c.beginPath(); c.arc(x + pad + 7 * u, cy + 18 * u, 4 * u, 0, TAU); c.fillStyle = sc; c.fill(); }
    this.font(600, 12.5 * u); this.text(o.status, x + pad + 21 * u, cy + 18 * u, sc, "left", "middle");
    c.restore();
    return h;
  };

  var ARCH = {};

  /* ============================================================ OBJECT GRAPH
     A hub, groups around it, items in each group. The verb travels
     hub -> group -> item and lands as a kept state. For products whose value
     is a RELATIONSHIP between things. */
  ARCH["object-graph"] = (function () {
    var D2R = Math.PI / 180, BEAT = 6;
    function sph(th, ph, r) { return { x: r * Math.cos(ph) * Math.sin(th), y: -r * Math.sin(ph), z: r * Math.cos(ph) * Math.cos(th) }; }
    function model(spec) {
      if (spec.__m) return spec.__m;
      var n = spec.groups.length, ePhi = [14, -24, 26, -10, 20, -18], off = [[-30, 26], [4, -30], [32, 10], [-8, 40], [22, -44]];
      var groups = spec.groups.map(function (g, k) { var th = k * TAU / n; return { label: g.label, th: th, p: sph(th, ePhi[k % 6] * D2R, 0.6) }; });
      var seat = groups.map(function () { return 0; });
      var nodes = spec.nodes.map(function (nd) {
        var g = groups[nd.group], o = off[seat[nd.group]++ % off.length], spread = Math.min(1, 3 / n);
        var th = g.th + o[0] * spread * D2R;
        return { id: nd.id, group: nd.group, th: th, p: sph(th, (ePhi[nd.group % 6] + o[1]) * D2R, 1), src: nd };
      });
      var story = spec.story.map(function (id) { for (var i = 0; i < nodes.length; i++) if (nodes[i].id === id) return i; return 0; });
      var dust = [];
      for (var d = 0; d < 150; d++) { var yy = 1 - (d / 149) * 2, rr = Math.sqrt(1 - yy * yy), a = d * 2.399963; dust.push({ x: Math.cos(a) * rr * 1.08, y: yy * 1.08, z: Math.sin(a) * rr * 1.08 }); }
      return (spec.__m = { groups: groups, nodes: nodes, story: story, dust: dust });
    }
    function facing(nd) { return -nd.th + 0.5; }
    function near(target, from) { var d = ((target - from) % TAU + TAU) % TAU; return from + (d > Math.PI ? d - TAU : d); }
    return {
      duration: function (spec) { return BEAT * spec.story.length; },
      posterAt: function () { return 5.2; },
      draw: function (g, t) {
        var c = g.ctx, col = g.col, m = model(g.spec), W = g.W, H = g.H, u = g.u, n = m.story.length;
        var idx = Math.floor(t / BEAT) % n, bt = t - Math.floor(t / BEAT) * BEAT;
        var act = m.nodes[m.story[idx]], prev = m.nodes[m.story[(idx + n - 1) % n]];
        var from = facing(prev), rot = lerp(from, near(facing(act), from), ease(bt / 1.5));
        var S = Math.min(W, H) * (g.compact ? 0.42 : 0.39), cx = W * (g.compact ? 0.5 : 0.555);
        var cy = g.compact ? S * 1.13 + 8 : H * 0.465, tilt = -13 * D2R, R = S * 1.13;
        function proj(p) {
          var cs = Math.cos(rot), sn = Math.sin(rot), x = p.x * cs + p.z * sn, z = -p.x * sn + p.z * cs;
          var ct = Math.cos(tilt), st = Math.sin(tilt), y2 = p.y * ct - z * st, z2 = p.y * st + z * ct, k = 3.4 / (3.4 - z2);
          return { x: cx + x * k * S, y: cy + y2 * k * S, z: z2, k: k };
        }
        function depth(z, lo) { return lo + (1 - lo) * clamp((z + 1) / 2, 0, 1); }
        function ctrl(a, b) { return { x: cx + ((a.x + b.x) / 2 - cx) * 1.22, y: cy + ((a.y + b.y) / 2 - cy) * 1.22 }; }
        function link(a, b, color, w, dash) {
          var k = ctrl(a, b); c.beginPath(); c.setLineDash(dash || []); c.moveTo(a.x, a.y); c.quadraticCurveTo(k.x, k.y, b.x, b.y);
          c.strokeStyle = color; c.lineWidth = w; c.stroke(); c.setLineDash([]);
        }
        function along(a, b, v) { var k = ctrl(a, b), q = 1 - v; return { x: q * q * a.x + 2 * q * v * k.x + v * v * b.x, y: q * q * a.y + 2 * q * v * k.y + v * v * b.y }; }
        var on = bt > 0.2, sentNow = bt >= 4.3;
        function isSent(i) { var k = m.story.indexOf(i); return k >= 0 && (k < idx || (k === idx && sentNow)); }

        // the sphere: halo, turning meridians, dust
        var halo = c.createRadialGradient(cx, cy, R * 0.2, cx, cy, R);
        halo.addColorStop(0, rgba(col.accent2, 0.18)); halo.addColorStop(1, rgba(col.accent2, 0.02));
        c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.fillStyle = halo; c.fill();
        c.strokeStyle = rgba(col.text, 0.12); c.lineWidth = 1; c.stroke();
        for (var q = 0; q < 3; q++) { c.beginPath(); c.ellipse(cx, cy, Math.max(0.5, Math.abs(Math.sin(rot + q * Math.PI / 3)) * R), R, 0, 0, TAU); c.strokeStyle = rgba(col.text, 0.045); c.stroke(); }
        for (var i = 0; i < m.dust.length; i++) { var dp = proj(m.dust[i]); c.fillStyle = rgba(col.text, 0.06 + 0.3 * depth(dp.z, 0)); c.fillRect(dp.x, dp.y, 1.5 * dp.k, 1.5 * dp.k); }

        var hub = proj({ x: 0, y: 0, z: 0 });
        var gp = m.groups.map(function (gr) { var p = proj(gr.p); p.g = gr; return p; });
        var np = m.nodes.map(function (nd, k) { var p = proj(nd.p); p.n = nd; p.i = k; return p; });
        var ap = np[m.story[idx]], ag = gp[act.group];

        gp.forEach(function (p) { link(hub, p, rgba(col.text, 0.16 * depth(p.z, 0.35)), 1, [3, 5]); });
        np.forEach(function (p) { var hot = p === ap && on; link(gp[p.n.group], p, hot ? rgba(col.accent, 0.9) : rgba(col.text, 0.14 * depth(p.z, 0.3)), hot ? 1.6 : 1); });
        if (on) link(hub, ag, rgba(col.accent, 0.75), 1.4, [3, 5]);

        if (bt >= 3 && bt < 4.3) {                       // the verb travelling
          var v = span(bt, 3, 4.25) * 2, a = hub, b = ag; if (v > 1) { a = ag; b = ap; v -= 1; }
          var pt = along(a, b, v); g.glow(pt.x, pt.y, 16 * u, col.accent, 0.95);
          c.beginPath(); c.arc(pt.x, pt.y, 3 * u, 0, TAU); c.fillStyle = col.text; c.fill();
        }

        var all = gp.map(function (p) { return { p: p, k: "g" }; }).concat(np.map(function (p) { return { p: p, k: "n" }; })).concat([{ p: hub, k: "h" }]);
        all.sort(function (x, y) { return x.p.z - y.p.z; });
        all.forEach(function (it) {
          var p = it.p, al = depth(p.z, 0.3);
          if (it.k === "g") { g.pill(p.x, p.y, p.g.label, al, on && p === ag); return; }
          if (it.k === "h") {
            var r = (g.compact ? 24 : 32) * p.k * u, gr = c.createLinearGradient(p.x - r, p.y - r, p.x + r, p.y + r);
            gr.addColorStop(0, col.accent); gr.addColorStop(1, col.accent2);
            c.beginPath(); c.arc(p.x, p.y, r + 10 * u, 0, TAU); c.fillStyle = rgba(col.accent2, 0.18); c.fill();
            c.beginPath(); c.arc(p.x, p.y, r, 0, TAU); c.fillStyle = gr; c.fill();
            g.font(700, (g.compact ? 13 : 15) * u, "Display"); g.text(g.spec.hub.label, p.x, p.y + 1, col.onAccent2, "center", "middle"); return;
          }
          var isAct = p === ap, sent = isSent(p.i), rad = (g.compact ? 14 : 20) * p.k * u * (isAct ? 1.22 : 1);
          if (isAct) { c.beginPath(); c.arc(p.x, p.y, rad + 9 * u * easeOut(bt / 0.9), 0, TAU); c.fillStyle = rgba(sent ? col.success : col.accent, 0.16); c.fill(); }
          c.beginPath(); c.arc(p.x, p.y, rad, 0, TAU); c.fillStyle = rgba(col.accent2, isAct ? 1 : al); c.fill();
          if (sent || isAct) { c.lineWidth = 2.2 * u; c.strokeStyle = sent ? col.success : col.accent; c.stroke(); }
          g.font(700, Math.max(9, rad * 0.72), "Display"); g.text(p.n.id, p.x, p.y + 0.5, rgba(col.onAccent2, isAct ? 1 : Math.min(1, al + 0.15)), "center", "middle");
          if (sent) g.tick(p.x + rad * 0.78, p.y - rad * 0.78, 7 * u, col.success, col.bg);
        });

        // the docked panel: what is remembered about the active item
        var src = act.src, cardA = Math.min(span(bt, 0.7, 1.1), 1 - span(bt, 5.6, 5.95));
        if (cardA > 0 && src.title) {
          var cw = g.compact ? Math.min(300 * u / 0.62, W * 0.9) : Math.min(290 * u, W * 0.46);
          var o = { title: src.title, subtitle: src.subtitle, facts: src.facts || [], alpha: cardA, reveal: (bt - 1.0) / 0.45,
                    statusAlpha: span(bt, 2.9, 3.2), done: sentNow, status: sentNow ? g.spec.status.done : g.spec.status.ready };
          o.measure = true; var ch = g.card(0, 0, cw, o); o.measure = false;
          var x0 = g.compact ? (W - cw) / 2 : 0, y0 = H - ch - (g.compact ? 6 : 8) * u;
          var tx = g.compact ? W / 2 : x0 + cw, ty = y0 + (g.compact ? 0 : 26 * u);
          c.beginPath(); c.setLineDash([2, 4]); c.moveTo(ap.x, ap.y); c.quadraticCurveTo(ap.x, ty, tx, ty);
          c.strokeStyle = rgba(col.accent, 0.7 * cardA); c.lineWidth = 1.2; c.stroke(); c.setLineDash([]);
          g.card(x0, y0, cw, o);
        }
      }
    };
  })();

  /* ==================================================================== FLOW
     Stages in order; one item at a time moves through them and each stage
     says what the product does there. For products whose value is a PROCESS. */
  ARCH.flow = (function () {
    var STEP = 1.7, HOLD = 1.5;
    function per(spec) { return spec.stages.length * STEP + HOLD; }
    return {
      duration: function (spec) { return per(spec) * spec.items.length; },
      posterAt: function (spec) { return per(spec) + (spec.stages.length - 1) * STEP + 1.0; },
      draw: function (g, t) {
        var c = g.ctx, col = g.col, W = g.W, H = g.H, u = g.u, st = g.spec.stages, items = g.spec.items, n = st.length;
        var P = per(g.spec), idx = Math.floor(t / P) % items.length, lt = t - Math.floor(t / P) * P;
        var stage = Math.min(n - 1, Math.floor(lt / STEP)), into = lt - stage * STEP, finished = lt >= n * STEP;
        var vert = g.compact, pts = [], i;
        for (i = 0; i < n; i++) {
          var f = n === 1 ? 0.5 : i / (n - 1);
          pts.push(vert ? { x: W * 0.15, y: lerp(H * 0.1, H * 0.66, f) } : { x: lerp(W * 0.12, W * 0.88, f), y: H * 0.43 });
        }
        var pos = finished ? n - 1 : stage === 0 ? 0 : stage - 1 + easeOut(into / 0.7);
        var fl = Math.min(n - 1, Math.floor(pos)), fr = pos - fl, a = pts[fl], b = pts[Math.min(n - 1, fl + 1)];
        var cur = { x: lerp(a.x, b.x, fr), y: lerp(a.y, b.y, fr) };
        var enter = stage === 0 ? easeOut(into / 0.6) : 1, leave = finished ? 1 - span(lt, P - 0.45, P) : 1, vis = enter * leave;

        g.glow(W * 0.5, H * 0.45, Math.min(W, H) * 0.7, col.accent2, 0.14);
        if (!vert) {                                    // the lane the item travels in
          g.rr(W * 0.03, pts[0].y - 112 * u, W * 0.94, 196 * u, 22 * u);
          c.fillStyle = rgba(col.surface, 0.55); c.fill(); c.lineWidth = 1; c.strokeStyle = rgba(col.text, 0.08); c.stroke();
        }

        // the track: done part in the accent, the rest quiet
        c.lineWidth = 2 * u; c.lineCap = "round";
        c.beginPath(); c.moveTo(pts[0].x, pts[0].y); c.lineTo(pts[n - 1].x, pts[n - 1].y); c.strokeStyle = rgba(col.text, 0.12); c.stroke();
        c.beginPath(); c.moveTo(pts[0].x, pts[0].y); c.lineTo(cur.x, cur.y); c.strokeStyle = rgba(col.accent, 0.85 * vis); c.stroke();

        for (i = 0; i < n; i++) {
          var p = pts[i], reached = finished || i < stage || (i === stage && (stage === 0 || into > 0.7)), isNow = i === stage && !finished, r = 24 * u;
          if (isNow && reached) g.glow(p.x, p.y, r * 2.4, col.accent, 0.3);
          c.beginPath(); c.arc(p.x, p.y, r, 0, TAU);
          c.fillStyle = reached ? (i === n - 1 ? col.success : col.accent) : col.surface; c.fill();
          c.lineWidth = 1.5; c.strokeStyle = reached ? "transparent" : rgba(col.text, 0.22); c.stroke();
          if (reached && i === n - 1) g.tick(p.x, p.y, r * 0.62, col.success, col.bg);
          else { g.font(700, 15 * u, "Display"); g.text(String(i + 1), p.x, p.y + 0.5, reached ? col.onAccent : col.muted, "center", "middle"); }
          g.font(700, 15 * u, "Display");
          if (vert) g.text(st[i].label, p.x + r + 14 * u, p.y + 0.5, reached ? col.text : col.muted, "left", "middle");
          else {
            var lines = g.wrap(st[i].label, W * 0.78 / n);
            for (var k = 0; k < lines.length; k++) g.text(lines[k], p.x, p.y + r + 24 * u + k * 19 * u, reached ? col.text : col.muted, "center");
          }
        }

        // the travelling item
        var it = items[idx]; g.font(700, 15 * u, "Display"); var w1 = c.measureText(it.label).width;
        g.font(400, 12.5 * u); var cw = Math.max(w1, c.measureText(it.detail || "").width) + 34 * u;
        var chh = (it.detail ? 56 : 40) * u, ix = vert ? cur.x + 30 * u : clamp(cur.x - cw / 2, 6, W - cw - 6), iy = vert ? cur.y - chh / 2 : cur.y - 40 * u - chh;
        if (vert) { ix = W - cw - 10 * u; }
        c.save(); c.globalAlpha = vis;
        c.shadowColor = rgba(col.bg, 0.55); c.shadowBlur = 22 * u; c.shadowOffsetY = 8 * u;
        g.rr(ix, iy, cw, chh, 12 * u); c.fillStyle = col.surface; c.fill(); c.shadowColor = "transparent";
        c.lineWidth = 1.2; c.strokeStyle = finished ? col.success : col.accent; c.stroke();
        g.font(700, 15 * u, "Display"); g.text(it.label, ix + 17 * u, iy + (it.detail ? 24 : 26) * u, col.text);
        if (it.detail) { g.font(400, 12.5 * u); g.text(it.detail, ix + 17 * u, iy + 43 * u, col.muted); }
        if (!vert) { c.beginPath(); c.moveTo(cur.x, iy + chh); c.lineTo(cur.x, cur.y - 27 * u); c.strokeStyle = rgba(finished ? col.success : col.accent, 0.7); c.lineWidth = 1.2; c.stroke(); }
        c.restore();

        // what the product does at this stage
        var cap = finished ? (g.spec.done || {}).label || st[n - 1].caption : st[stage].caption;
        var capA = finished ? span(lt, n * STEP, n * STEP + 0.3) * leave : Math.min(span(into, stage === 0 ? 0.3 : 0.7, stage === 0 ? 0.6 : 1.0), 1 - span(into, STEP - 0.2, STEP));
        if (cap && capA > 0) {
          var bw = Math.min(W * (vert ? 0.9 : 0.74), 560 * u), bx = (W - bw) / 2;
          g.font(500, 18 * u); var cl = g.wrap(cap, bw - 52 * u), bh = cl.length * 25 * u + 32 * u, by = vert ? H - bh - 6 * u : H * 0.685;
          c.save(); c.globalAlpha = capA;
          g.rr(bx, by, bw, bh, 12 * u); c.fillStyle = rgba(col.surface, 0.96); c.fill(); c.lineWidth = 1; c.strokeStyle = rgba(col.text, 0.14); c.stroke();
          g.rr(bx, by, 4 * u, bh, 2 * u); c.fillStyle = finished ? col.success : col.accent; c.fill();
          for (var j = 0; j < cl.length; j++) g.text(cl[j], bx + 28 * u, by + 35 * u + j * 25 * u, col.text);
          c.restore();
        }

        // what has already been completed in this loop
        var done = idx + (finished ? 1 : 0);
        if (!vert && done > 0) {
          g.font(400, 12 * u, "Mono"); var dl = ((g.spec.done || {}).tally || "Done") + "  " + done + " / " + items.length;
          var dw = c.measureText(dl).width + 48 * u; g.rr(W - dw - 8, 10 * u, dw, 32 * u, 16 * u);
          c.fillStyle = rgba(col.surface, 0.94); c.fill(); c.strokeStyle = rgba(col.success, 0.6); c.lineWidth = 1; c.stroke();
          g.tick(W - dw - 8 + 18 * u, 26 * u, 7 * u, col.success, col.surface); g.text(dl, W - dw - 8 + 33 * u, 26.5 * u, col.text, "left", "middle");
        }
      }
    };
  })();

  /* ============================================================ BEFORE-AFTER
     Scattered things resolve, one by one, into one ordered place. For
     products whose value is ORDER out of a recognisable mess. */
  ARCH["before-after"] = (function () {
    var T0 = 1.6, FLY = 0.9, GAP = 0.6, HOLDS = 3.0, OUT = 1.3;
    function dur(spec) { return T0 + (spec.before.items.length - 1) * GAP + FLY + HOLDS + OUT; }
    return {
      duration: dur,
      posterAt: function (spec) { return T0 + (spec.before.items.length - 1) * GAP + FLY + 1.2; },
      draw: function (g, t) {
        var c = g.ctx, col = g.col, W = g.W, H = g.H, u = g.u, sp = g.spec, items = sp.before.items, rows = sp.after.rows, n = items.length;
        var D = dur(sp), back = span(t, D - OUT, D - 0.25), vert = g.compact, r = rng(sp.seed || 7), i;
        var mz = vert ? { x: W * 0.04, y: H * 0.07, w: W * 0.92, h: H * 0.3 } : { x: W * 0.02, y: H * 0.14, w: W * 0.42, h: H * 0.66 };
        var rowH = (vert ? 38 : 44) * u, pw = vert ? W * 0.92 : W * 0.46, ph = 58 * u + n * rowH + 46 * u;
        var px = vert ? W * 0.04 : W * 0.52, py = vert ? H * 0.43 : Math.max(8, (H - ph) / 2);

        g.glow(px + pw / 2, py + ph / 2, Math.max(pw, ph) * 0.8, col.accent2, 0.16);
        g.font(400, 12.5 * u, "Mono");
        g.text(String(sp.before.label).toUpperCase(), mz.x + 4, mz.y - 14 * u, rgba(col.muted, 1 - 0.4 * span(t, T0, T0 + 1)));

        // the ordered place
        c.shadowColor = rgba(col.bg, 0.5); c.shadowBlur = 30 * u; c.shadowOffsetY = 12 * u;
        g.rr(px, py, pw, ph, 16 * u); c.fillStyle = col.surface; c.fill(); c.shadowColor = "transparent";
        c.lineWidth = 1; c.strokeStyle = rgba(col.text, 0.14); c.stroke();
        g.font(700, 16 * u, "Display"); g.text(sp.after.title, px + 18 * u, py + 32 * u, col.text);
        c.beginPath(); c.moveTo(px + 18 * u, py + 48 * u); c.lineTo(px + pw - 18 * u, py + 48 * u); c.strokeStyle = rgba(col.text, 0.1); c.stroke();

        var landed = 0;
        for (i = 0; i < n; i++) {
          var f = ease(span(t, T0 + i * GAP, T0 + i * GAP + FLY)) * (1 - ease(back));
          // a jittered grid: untidy, but no two items hide each other
          var cols = vert ? 2 : (n > 4 ? 2 : 1), rws = Math.ceil(n / cols), cw0 = mz.w / cols, ch0 = mz.h / rws;
          var sx = mz.x + (i % cols) * cw0 + r() * Math.max(0, cw0 - 172 * u) + (cols === 1 ? r() * 20 * u : 0);
          var sy = mz.y + Math.floor(i / cols) * ch0 + r() * Math.max(0, ch0 - 44 * u), rot = (r() - 0.5) * 0.42;
          sx += Math.sin(t * 0.9 + i) * 3 * (1 - f); sy += Math.cos(t * 0.7 + i * 2) * 3 * (1 - f);
          var ty = py + 58 * u + i * rowH, tx = px + 14 * u, tw = pw - 28 * u, th = rowH - 8 * u;
          g.font(600, 13 * u); var sw = c.measureText(items[i]).width + 28 * u, shh = 34 * u;
          var x = lerp(sx, tx, f), y = lerp(sy, ty, f), w = lerp(sw, tw, f), h = lerp(shh, th, f);
          if (f > 0.98) landed++;
          c.save(); c.translate(x + w / 2, y + h / 2); c.rotate(rot * (1 - f)); c.translate(-w / 2, -h / 2);
          g.rr(0, 0, w, h, lerp(8, 10, f) * u);
          c.fillStyle = f > 0.5 ? rgba(col.bg, 0.55) : rgba(col.surface, 0.9); c.fill();
          c.lineWidth = 1; c.strokeStyle = f > 0.5 ? rgba(col.text, 0.1) : rgba(col.text, 0.22); c.stroke();
          g.font(600, 13 * u); g.text(f > 0.6 ? rows[i].label : items[i], 14 * u, h / 2 + 0.5, f > 0.6 ? col.text : col.muted, "left", "middle");
          if (f > 0.75) {
            var va = span(f, 0.75, 1); c.globalAlpha = va;
            g.font(400, 12 * u); g.text(rows[i].value || "", w - 34 * u, h / 2 + 0.5, col.muted, "right", "middle");
            g.tick(w - 16 * u, h / 2, 7 * u, col.success, col.surface);
          }
          c.restore();
        }

        if (!vert) {                                    // direction of travel
          var ax = W * 0.455, ay = H * 0.5, aa = 0.25 + 0.5 * span(t, T0, T0 + 0.6) * (1 - back);
          c.beginPath(); c.moveTo(ax, ay); c.lineTo(ax + 26 * u, ay); c.moveTo(ax + 18 * u, ay - 7 * u); c.lineTo(ax + 26 * u, ay); c.lineTo(ax + 18 * u, ay + 7 * u);
          c.strokeStyle = rgba(col.accent, aa); c.lineWidth = 2 * u; c.lineCap = "round"; c.lineJoin = "round"; c.stroke();
        }
        var sa = (landed === n ? 1 : 0) * span(t, T0 + (n - 1) * GAP + FLY, T0 + (n - 1) * GAP + FLY + 0.35) * (1 - span(back, 0, 0.3));
        if (sa > 0 && sp.after.summary) {
          c.save(); c.globalAlpha = sa; g.font(600, 13 * u);
          g.tick(px + 25 * u, py + ph - 24 * u, 7 * u, col.success, col.surface);
          g.text(sp.after.summary, px + 40 * u, py + ph - 24 * u, col.success, "left", "middle"); c.restore();
        }
      }
    };
  })();

  /* ------------------------------------------------------------ mounting */
  var KEYS = ["bg", "surface", "text", "muted", "accent", "accent2", "success", "onAccent", "onAccent2"];
  var FONTS = { fontDisplay: "font-display", fontBody: "font-body", fontMono: "font-mono" };
  function theme(root, spec) {
    var cs = getComputedStyle(root), col = {}, th = spec.theme || {};
    KEYS.forEach(function (k) {
      var v = cs.getPropertyValue("--cv-" + k.replace(/[A-Z0-9]/g, function (m) { return "-" + m.toLowerCase(); })).trim();
      col[k] = v || th[k];
    });
    col.onAccent = col.onAccent || col.bg; col.onAccent2 = col.onAccent2 || col.text;
    Object.keys(FONTS).forEach(function (k) { col[k] = cs.getPropertyValue("--cv-" + FONTS[k]).trim() || th[k] || "system-ui, sans-serif"; });
    return col;
  }
  var mounted = {};
  function mount(root) {
    var canvas = root.querySelector("canvas"), ctx = canvas && canvas.getContext && canvas.getContext("2d");
    var data = root.querySelector('script[type="application/json"]');
    if (!ctx || !data) return null;                    // the poster stays
    var spec = JSON.parse(data.textContent), arch = ARCH[spec.archetype];
    if (!arch) return null;
    var slot = root.getAttribute("data-visual"), toggle = document.querySelector('[data-motion-control="' + slot + '"]');
    var rmq = window.matchMedia("(prefers-reduced-motion: reduce)"), D = arch.duration(spec);
    var posterAt = typeof spec.poster_at === "number" ? spec.poster_at : arch.posterAt(spec);
    var W = 0, H = 0, col = null, clock = 0, last = 0, raf = 0, running = false, userPaused = false, visible = true, ready = false;
    function size() {
      var r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height; canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    // Live, the canvas is transparent and sits on the page's own surface. An
    // exported frame has no page behind it, so it is painted onto the theme
    // background — otherwise every glow is lost and an encoder invents a colour.
    function render(t, opaque) {
      ctx.clearRect(0, 0, W, H);
      if (opaque) { ctx.fillStyle = col.bg; ctx.fillRect(0, 0, W, H); }
      arch.draw(new G(ctx, W, H, spec, col), ((t % D) + D) % D);
    }
    function frame(now) {
      raf = 0; if (!running) return;
      clock += Math.min(0.05, (now - (last || now)) / 1000); last = now; render(clock); raf = requestAnimationFrame(frame);
    }
    function start() { if (ready && !running && !userPaused && visible && !rmq.matches) { running = true; last = 0; raf = requestAnimationFrame(frame); } }
    function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
    function still() { stop(); render(posterAt); }
    function boot() {
      col = theme(root, spec); size(); ready = true; root.classList.add("is-live");
      if (rmq.matches) { still(); if (toggle) toggle.hidden = true; } else start();
    }
    if (toggle) toggle.addEventListener("click", function () {
      userPaused = !userPaused;
      toggle.setAttribute("aria-pressed", userPaused ? "true" : "false");
      toggle.setAttribute("aria-label", userPaused ? "Play animation" : "Pause animation");
      var lab = toggle.querySelector("[data-label]"); if (lab) lab.textContent = userPaused ? "Play" : "Pause";
      if (userPaused) stop(); else start();
    });
    if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) start(); else stop(); }, { threshold: 0.15 }).observe(root);
    document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else start(); });
    if (rmq.addEventListener) rmq.addEventListener("change", function () { if (rmq.matches) still(); else start(); });
    var rz = 0; window.addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(function () { if (!ready) return; size(); if (!running) render(rmq.matches ? posterAt : clock); }, 120); });
    var go = function () { requestAnimationFrame(function () { setTimeout(boot, 40); }); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go, go); else go();
    var api = { duration: D, posterAt: posterAt,
      // deterministic frame for export: no clock, no animation loop
      frame: function (t) { stop(); userPaused = true; if (!ready) { col = theme(root, spec); size(); ready = true; root.classList.add("is-live"); } render(t, true); return canvas.toDataURL("image/png"); } };
    mounted[slot] = api; return api;
  }
  function all() { Array.prototype.forEach.call(document.querySelectorAll("[data-concept-visual]"), function (n) { if (!mounted[n.getAttribute("data-visual")]) mount(n); }); }
  window.ConceptVisual = { mount: mount, get: function (slot) { return mounted[slot]; }, archetypes: Object.keys(ARCH) };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", all); else all();
})();
