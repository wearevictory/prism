/* ════════════════════════════════════════════════════════════════════
   Prism · Aurora
   The soft fan of colour that turns very slowly behind a section.
   Mark any section:  data-prism-aurora            (default preset)
                      data-prism-aurora="hero"     (named preset)
   One aurora per marked section, each with its own settings.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  var P = window.Prism;
  if (!P || !P.core) { console.warn('Prism: load prism-core before prism-aurora'); return; }
  var U = P.util;

  P.AURORA_DEFAULTS = {
    bg: 'conic',          // conic | radial | splotch | none
    bgPal: 'crystal',     // crystal | gold | vishanti | mock | spectrum
    bgInt: 55,            // intensity 0–90
    bgDrift: .6,          // spin, degrees per second (negative turns the other way)
    bgSweep: 18,          // degrees it turns while fading in
    bgSpread: 210,        // width of the fan, degrees
    bgFeather: 34,        // softness of the fan's edges, degrees
    bgRadius: 85,         // radial form: size %
    blobs: 7, blobSize: 75,   // splotch form
    bgCentre: 55,         // darkens the middle
    bgEdge: 15,           // fades toward the edges
    bgHue: 0, bgSat: 100, bgLight: 100,
    grain: 22,            // film grain over the aurora, 0–80
    x: 50, y: 40,         // centre of the light, % of the section
    anchor: '',           // or a CSS selector: centre the light on that element instead
    anchorY: .36,         // where on the anchor (0 top, 1 bottom)
    dir: 0,               // starting rotation, degrees
    fadeIn: 1600,         // ms
    seed: 8,
    resolution: .6,       // render scale; the aurora is soft, so it can be drawn small and scaled up
    zIndex: -1,           // behind the section's own content
  };
  var CAP = 90;           // flash safety: brightness ceiling
  var BGPAL = { // OKLCH
    crystal:  [[14, .05, 262], [44, .15, 259], [36, .14, 290], [16, .05, 270], [34, .09, 55], [66, .12, 62]],
    mock:     [[72, .09, 200], [52, .22, 265], [46, .22, 292], [58, .18, 18], [72, .15, 55], [86, .05, 85]],
    vishanti: [[34, .15, 265], [62, .18, 248], [52, .2, 296], [68, .17, 326], [78, .1, 350], [88, .06, 230]],
    spectrum: [[62, .22, 25], [78, .17, 70], [84, .17, 130], [78, .13, 200], [58, .2, 262], [56, .22, 300]],
    gold:     [[40, .07, 60], [58, .1, 66], [74, .11, 76], [87, .08, 86], [66, .12, 56], [48, .08, 50]],
  };
  P.AURORA_PALETTES = Object.keys(BGPAL);
  var GRAIN = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .55 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

  function mount(section, settings) {
    var S = settings || P.resolve('aurora', section.getAttribute('data-prism-aurora'), section, P.AURORA_DEFAULTS);
    if (getComputedStyle(section).position === 'static') section.style.position = 'relative';
    section.style.isolation = 'isolate';   // keeps the aurora above the section's background, behind its content

    var layer = document.createElement('div'), canvas = document.createElement('canvas'), grain = document.createElement('div');
    layer.className = 'prism-aurora'; layer.setAttribute('aria-hidden', 'true');
    layer.style.cssText = 'position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:' + S.zIndex;
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
    grain.style.cssText = 'position:absolute;inset:0;mix-blend-mode:overlay;opacity:0;background:' + GRAIN;
    layer.appendChild(canvas); layer.appendChild(grain);
    section.insertBefore(layer, section.firstChild);
    var x = canvas.getContext('2d');

    var W = 1, H = 1, scale = 1, TEX = null, BLOBS = [], t = 0, drift = S.bgDrift, stop = null;
    var col = function (i) { var p = BGPAL[S.bgPal] || BGPAL.crystal, c = p[((i % p.length) + p.length) % p.length]; return [Math.min(98, c[0] * S.bgLight / 100), c[1] * S.bgSat / 100, c[2] + S.bgHue]; };
    var css = function (c, a) { return U.ok(c[0], c[1], c[2], a); };

    /* the texture is painted once, then only turned and faded each frame */
    function paint() {
      TEX = null;
      var size = Math.max(64, Math.round(Math.hypot(W, H) * scale)), c = U.cv(size, size), g2 = c.getContext('2d'), m = size / 2;
      var Pc = (BGPAL[S.bgPal] || BGPAL.crystal).map(function (_, i) { return col(i); }), n = Pc.length;
      var mix = function (p, q, k) { var dh = ((q[2] - p[2] + 540) % 360) - 180; return [U.lerp(p[0], q[0], k), U.lerp(p[1], q[1], k), p[2] + dh * k]; };
      var dense = function (pts, add) { pts.forEach(function (pt, i) { if (i) { var p0 = pts[i - 1]; for (var k = 1; k < 4; k++) add(U.lerp(p0[1], pt[1], k / 4), mix(p0[0], pt[0], k / 4)); } add(pt[1], pt[0]); }); };
      if (S.bg === 'conic' && g2.createConicGradient) {
        var spread = Math.min(S.bgSpread, 360), f = spread >= 360 ? 0 : Math.min(S.bgFeather, (360 - spread) / 2);
        var g = g2.createConicGradient(U.rad(-spread / 2 - f - 90), m, m), pts = [];
        if (spread >= 360) { Pc.forEach(function (p, i) { pts.push([p, i / n]); }); pts.push([Pc[0], 1]); }
        else { pts.push([[0, 0, Pc[0][2]], 0]); Pc.forEach(function (p, i) { pts.push([p, (f + spread * i / (n - 1)) / 360]); }); pts.push([[0, 0, Pc[n - 1][2]], (spread + 2 * f) / 360]); }
        dense(pts, function (pos, p) { g.addColorStop(U.clamp(pos, 0, 1), css(p)); });
        if (spread < 360) g.addColorStop(1, '#000');
        g2.fillStyle = g; g2.fillRect(0, 0, size, size);
      } else if (S.bg === 'radial' || S.bg === 'conic') {
        var R = Math.max(2, m * S.bgRadius / 100), rg = g2.createRadialGradient(m, m, 0, m, m, R), rp = Pc.map(function (p, i) { return [p, (.08 + .92 * i / (n - 1)) * .9]; });
        dense(rp, function (pos, p) { rg.addColorStop(U.clamp(pos, 0, 1), css(p)); });
        rg.addColorStop(1, '#000'); g2.fillStyle = rg; g2.fillRect(0, 0, size, size);
      } else return;
      var c0 = S.bgCentre / 100, e = S.bgEdge / 100, fg = g2.createRadialGradient(m, m, 0, m, m, m);
      fg.addColorStop(0, 'rgba(0,0,0,' + (1 - c0) + ')'); fg.addColorStop(U.clamp((18 + c0 * 30) / 100, 0, 1), '#000');
      fg.addColorStop(U.clamp((100 - e * 55) / 100, .5, 1), '#000'); fg.addColorStop(1, 'rgba(0,0,0,' + (1 - e) + ')');
      g2.globalCompositeOperation = 'destination-in'; g2.fillStyle = fg; g2.fillRect(0, 0, size, size);
      TEX = c;
    }
    function blobs() {
      var r = U.rng(S.seed * 7 + 1);
      BLOBS = Array.from({ length: Math.round(S.blobs) }, function () { return { a: r(), dist: .15 + r() * .75, size: .45 + r() * .75, c1: Math.floor(r() * 6), c2: Math.floor(r() * 6), dx: (r() - .5) * 90, dy: (r() - .5) * 60, d: r() }; });
    }
    function origin() {
      if (S.anchor) {
        var a = typeof S.anchor === 'string' ? section.querySelector(S.anchor) || document.querySelector(S.anchor) : S.anchor;
        if (a) { var ar = a.getBoundingClientRect(), sr = section.getBoundingClientRect(); if (ar.width) return [(ar.left - sr.left + ar.width / 2) * scale, (ar.top - sr.top + ar.height * S.anchorY) * scale]; }
      }
      return [W * scale * S.x / 100, H * scale * S.y / 100];
    }
    function resize() {
      W = Math.max(1, section.clientWidth); H = Math.max(1, section.clientHeight);
      scale = U.clamp(S.resolution, .25, 2) * Math.min(1.25, U.dpr());
      canvas.width = Math.round(W * scale); canvas.height = Math.round(H * scale);
      clearTimeout(resize.t); resize.t = setTimeout(paint, 120);
      if (!TEX) paint();
    }
    function draw(dt) {
      if (!U.reduced) t += dt;
      drift += (S.bgDrift - drift) * (1 - Math.exp(-dt * 6));
      x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
      x.clearRect(0, 0, canvas.width, canvas.height);
      grain.style.opacity = S.bg === 'none' ? 0 : S.grain / 100;
      if (S.bg === 'none') return;
      var inS = Math.max(.01, Math.max(600, S.fadeIn) / 1000), pin = U.reduced ? 1 : U.easeOut(U.clamp(t / inS, 0, 1));
      var A = Math.min(CAP, S.bgInt) / 100 * pin;
      if (A < .003) return;
      var o = origin(), ox = o[0], oy = o[1], Wc = canvas.width, Hc = canvas.height;
      if (S.bg === 'splotch') {
        x.globalCompositeOperation = 'screen';
        var Lf = Math.hypot(Math.max(ox, Wc - ox), Math.max(oy, Hc - oy)) * 1.1;
        BLOBS.forEach(function (B) {
          var ang = U.rad(-S.bgSpread / 2 + B.a * S.bgSpread - 90) + U.rad(S.dir) + U.rad(drift) * t, dist = B.dist * Lf * .7, size = Lf * S.blobSize / 100 * B.size;
          var cx = ox + Math.cos(ang) * dist, cy = oy + Math.sin(ang) * dist, a = A * U.easeOut(U.clamp((t - B.d * inS * .4) / inS, 0, 1));
          if (a < .003) return;
          var r = size / 2 * (.85 + .15 * pin), g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
          g.addColorStop(0, css(col(B.c1), .95)); g.addColorStop(.45, css(col(B.c2), .45)); g.addColorStop(1, 'rgba(0,0,0,0)');
          x.globalAlpha = a; x.fillStyle = g; x.fillRect(cx - r, cy - r, 2 * r, 2 * r);
        });
        x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
        var cg = x.createRadialGradient(ox, oy, 0, ox, oy, Lf * .35);
        cg.addColorStop(0, 'rgba(0,0,0,' + S.bgCentre / 100 + ')'); cg.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = cg; x.fillRect(0, 0, Wc, Hc);
        return;
      }
      if (!TEX) return;
      /* this is the slow turn: starting angle + arrival sweep + spin × time */
      var Ld = Math.hypot(Wc, Hc), rot = U.rad(S.dir) + U.rad(-S.bgSweep) * (1 - pin) + U.rad(drift) * t, s = 1.06 - .06 * pin;
      x.globalAlpha = A; x.translate(ox, oy); x.rotate(rot); x.scale(s, s);
      x.drawImage(TEX, -Ld, -Ld, 2 * Ld, 2 * Ld);
    }

    blobs(); resize();
    var ro = new ResizeObserver(resize); ro.observe(section);
    var unwatch = P.watch(section, function (on) {
      if (on && !stop) stop = P.loop.add(draw);
      if (!on && stop) { stop(); stop = null; }
    }, '10% 0px');

    return {
      settings: S, element: layer,
      set: function (k, v) {
        S[k] = v;
        if (k === 'blobs' || k === 'seed') blobs();
        if (k === 'resolution') resize();
        else if (/^(bg|blob)/.test(k) && k !== 'bgInt' && k !== 'bgDrift' && k !== 'bgSweep') { clearTimeout(this._p); this._p = setTimeout(paint, 60); }
      },
      replay: function () { t = 0; },
      destroy: function () { if (stop) stop(); unwatch(); ro.disconnect(); layer.remove(); },
    };
  }

  P.aurora = { mount: mount, defaults: P.AURORA_DEFAULTS };
  P.register('aurora', { selector: '[data-prism-aurora]', mount: function (el) { return mount(el); } });
})();
