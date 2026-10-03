/* ════════════════════════════════════════════════════════════════════
   Prism · Sparkle
   Four-point glints on the cutout's outline, floating dust, a soft halo
   hugging the shape, bloom, and lens flares (the rays of coloured light).
   Mark an image:  data-prism="liberty"           (statue + sparkle)
                   data-prism-sparkle="liberty"   (sparkle only)
   Built for transparent cutouts: glints follow the transparent edge.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  var P = window.Prism;
  if (!P || !P.core) { console.warn('Prism: load prism-core before prism-sparkle'); return; }
  var U = P.util, clamp = U.clamp, lerp = U.lerp;

  P.SPARKLE_DEFAULTS = {
    glints: 52, glintSize: 95, glintStr: 85,    // count 0–160, size px (at an 800px-tall image), strength 0–100
    dust: 90, dustStr: 55, dustSpread: 1.15,    // count 0–1000, strength 0–100, how far it floats (× image size)
    dustSize: 1,                                // size of each speck (× normal)
    glintRate: .45,                             // twinkle per second, capped at 1
    warmth: 72,                                 // % of sparkles that are gold rather than icy
    halo: 50,                                   // soft light hugging the outline, 0–100
    bloom: 45,                                  // glow at the light's source, 0–60
    flares: 6, flareStr: 42,                    // rays of coloured light: count 0–24, strength 0–100
    flarePal: 'crystal',                        // crystal | warm | cool | spectrum | white
    flareHue: 0, flareSat: 100,                 // turn every ray's colour (degrees), and how rich it is (%)
    flareLen: 1, flareWidth: 1, flareSpin: .9,  // ray length and width (× normal), and turn speed (degrees per second)
    origin: { x: .5, y: .36 },                  // where the light comes from, on the image (0–1)
    fadeIn: 1200, seed: 8,
    quality: 1.25,       // pixel density cap: dust and flares are soft, so they don't need full retina
    maxPixels: 1500000,  // and the layer never draws more than this many pixels
    fps: 30,
  };
  P.IMAGE_DEFAULTS = P.IMAGE_DEFAULTS || {};
  P.IMAGE_DEFAULTS.effects = P.IMAGE_DEFAULTS.effects || ['statue', 'sparkle'];
  P.IMAGE_DEFAULTS.pad = P.IMAGE_DEFAULTS.pad != null ? P.IMAGE_DEFAULTS.pad : .3;
  P.IMAGE_DEFAULTS.sparkle = P.SPARKLE_DEFAULTS;

  var CORE = U.hsl(40, 70, 96), AMBER = U.hsl(34, 100, 60);
  var CRYS = { white: [97, .02, 80], gold: [88, .1, 85], amber: [76, .13, 60], blue: [58, .17, 259], violet: [60, .16, 291], cyan: [80, .11, 211],
    red: [64, .2, 28], green: [82, .15, 145], magenta: [64, .2, 335], pearl: [93, .04, 250] };
  /* each ray palette is four rays of three colours, inner to outer */
  var FLARE_PALS = {
    crystal:  [['blue', 'violet', 'blue'], ['cyan', 'blue', 'violet'], ['violet', 'blue', 'cyan'], ['amber', 'gold', 'amber']],
    warm:     [['amber', 'gold', 'white'], ['gold', 'amber', 'gold'], ['white', 'gold', 'amber'], ['amber', 'white', 'gold']],
    cool:     [['blue', 'cyan', 'pearl'], ['violet', 'blue', 'cyan'], ['cyan', 'pearl', 'blue'], ['blue', 'violet', 'blue']],
    spectrum: [['red', 'amber', 'gold'], ['gold', 'green', 'cyan'], ['cyan', 'blue', 'violet'], ['violet', 'magenta', 'red']],
    white:    [['white', 'pearl', 'white'], ['pearl', 'white', 'gold'], ['white', 'white', 'pearl'], ['gold', 'white', 'pearl']],
  };
  P.FLARE_PALETTES = Object.keys(FLARE_PALS);
  var crysA = function (k, a, hue, sat) { var c = CRYS[k]; return U.oklch(c[0] / 100, c[1] * (sat == null ? 1 : sat), c[2] + (hue || 0)).concat([a]); };
  var NONE = [0, 0, 0, 0];

  /* sprites are shared by every image */
  var STAR_W = null, STAR_C = null, DUST_W = null, DUST_C = null, FLARES = {};
  function starSprite(core, halo) {
    var N = 160, c = U.cv(N, N), x = c.getContext('2d'), img = x.createImageData(N, N), d = img.data, m = N / 2;
    for (var j = 0; j < N; j++) for (var i = 0; i < N; i++) {
      var dx = (i + .5 - m) / m, dy = (j + .5 - m) / m, r2 = dx * dx + dy * dy;
      var co = Math.exp(-r2 / .0035), gl = Math.exp(-r2 / .06) * .45;
      var sp = (Math.exp(-dy * dy / .00018) * Math.pow(Math.max(0, 1 - Math.abs(dx)), 2.4) + Math.exp(-dx * dx / .00018) * Math.pow(Math.max(0, 1 - Math.abs(dy)), 2.4)) * .9;
      var u = (dx + dy) / Math.SQRT2, v = (dx - dy) / Math.SQRT2;
      var dg = (Math.exp(-v * v / .00012) * Math.pow(Math.max(0, 1 - Math.abs(u) * 1.8), 3) + Math.exp(-u * u / .00012) * Math.pow(Math.max(0, 1 - Math.abs(v) * 1.8), 3)) * .35;
      var a = Math.min(1, co + gl + sp + dg);
      if (a < .004 || r2 > 1) continue;
      var w = clamp(co * 1.2 + sp * .35, 0, 1), k = (j * N + i) * 4;
      d[k] = lerp(halo[0], core[0], w) * 255; d[k + 1] = lerp(halo[1], core[1], w) * 255; d[k + 2] = lerp(halo[2], core[2], w) * 255; d[k + 3] = a * 255;
    }
    x.putImageData(img, 0, 0); return c;
  }
  var sample = function (st, p) {
    if (p <= st[0][0]) return st[0][1];
    for (var i = 1; i < st.length; i++) if (p <= st[i][0]) {
      var a = st[i - 1][1], b = st[i][1], t = (p - st[i - 1][0]) / Math.max(1e-6, st[i][0] - st[i - 1][0]), al = lerp(a[3], b[3], t);
      if (al < 1e-4) return NONE;
      return [lerp(a[0] * a[3], b[0] * b[3], t) / al, lerp(a[1] * a[3], b[1] * b[3], t) / al, lerp(a[2] * a[3], b[2] * b[3], t) / al, al];
    }
    return st[st.length - 1][1];
  };
  function wedge(w, h, stops) {
    var c = U.cv(w, h), x = c.getContext('2d'), img = x.createImageData(w, h), d = img.data;
    for (var i = 0; i < w; i++) {
      var fx = (i + .5) / w, hw = Math.max(.012, fx) / 2, col = sample(stops, fx);
      for (var j = 0; j < h; j++) {
        var dv = Math.abs((j + .5) / h - .5); if (dv > hw + 1 / h) continue;
        var a = col[3] * clamp((hw - dv) * h + .5, 0, 1) * (1 - Math.min(1, dv / Math.max(hw, 1e-3)));
        if (a < .003) continue;
        var k = (j * w + i) * 4; d[k] = col[0] * 255; d[k + 1] = col[1] * 255; d[k + 2] = col[2] * 255; d[k + 3] = a * 255;
      }
    }
    x.putImageData(img, 0, 0); return c;
  }
  function sprites() {
    if (STAR_W) return;
    STAR_W = starSprite([1, .98, .93], U.oklch(.76, .13, 60));
    STAR_C = starSprite([.95, .97, 1], U.oklch(.68, .13, 250));
    DUST_W = dustSprite([1, .98, .93], U.oklch(.76, .13, 60));
    DUST_C = dustSprite([.95, .97, 1], U.oklch(.68, .13, 250));
  }
  /* dust uses its own tiny sprite: drawing hundreds of small dots from a small source is far cheaper */
  function dustSprite(core, halo) {
    var N = 24, c = U.cv(N, N), x = c.getContext('2d'), m = N / 2, g = x.createRadialGradient(m, m, 0, m, m, m);
    g.addColorStop(0, U.rgba(core, 1)); g.addColorStop(.18, U.rgba(core, .9)); g.addColorStop(.45, U.rgba(halo, .35)); g.addColorStop(1, U.rgba(halo, 0));
    x.fillStyle = g; x.fillRect(0, 0, N, N); return c;
  }
  /* ray sprites for a palette, turned and saturated as asked; shared by every image using the same colours */
  function flareSprites(pal, hue, sat) {
    var key = pal + '|' + Math.round(hue) + '|' + Math.round(sat);
    if (FLARES[key]) return FLARES[key];
    var L = FLARE_PALS[pal] || FLARE_PALS.crystal, r = U.rng(8 * 7 + 12), k = sat / 100;
    FLARES[key] = L.map(function (v) { var p0 = .18 + r() * .12; return wedge(192, 40, [[p0, NONE], [.42, crysA(v[0], .85, hue, k)], [.58, crysA(v[1], .95, hue, k)], [.74, crysA(v[2], .7, hue, k)], [.94, NONE]]); });
    return FLARES[key];
  }

  function mount(img, settings) {
    var preset = function () { return img.getAttribute('data-prism-sparkle') || img.getAttribute('data-prism'); };
    var manual = !!settings, cfg = settings || P.resolve('image', preset(), img, P.IMAGE_DEFAULTS);
    if (!settings && !img.hasAttribute('data-prism-sparkle') && (cfg.effects || []).indexOf('sparkle') < 0) return null;
    var S = U.merge(U.clone(P.SPARKLE_DEFAULTS), cfg.sparkle || {});
    sprites();
    var ov = P.overlay(img, cfg);
    var wrap = document.createElement('div'), front = document.createElement('canvas');
    wrap.className = 'prism-sparkle';
    wrap.style.cssText = 'position:absolute;inset:0;z-index:2';
    front.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;mix-blend-mode:screen';
    wrap.appendChild(front);
    var fx = front.getContext('2d'), dpr = U.dpr(S.quality), acc = 0;
    var t = 0, running = false, EDGES = [], HALO = null, HM = .2, GL = [], DU = [], FL = [], FS = null;
    var MAX_DUST = 1000;

    function seed() {
      var r = U.rng(S.seed * 7 + 13);
      GL = Array.from({ length: 160 }, function () { return { e: r(), ph: r(), sp: .6 + r() * .8, s: r(), rot: (r() - .5) * .5, warm: r(), a: r() * Math.PI * 2, d: .15 + r() * .5 }; });
      DU = Array.from({ length: MAX_DUST }, function () { return { a: r() * Math.PI * 2, d: Math.pow(r(), .6), ph: r(), sp: .4 + r() * .9, s: .3 + r() * .7, warm: r() }; });
      var rf = U.rng(S.seed * 7 + 8);
      FL = Array.from({ length: Math.min(24, Math.round(S.flares)) }, function () { return { a: rf() * Math.PI * 2, len: .45 + rf() * .7, w: 5 + rf() * 12, s: .4 + rf() * .6, t: rf(), v: Math.floor(rf() * 4) }; });
      FS = flareSprites(S.flarePal, S.flareHue, S.flareSat);
    }
    /* find the cutout's outline once: glints sit on it, the halo is a blurred copy of it */
    function edges(tex) {
      try {
        var tw = tex.naturalWidth || tex.width, th = tex.naturalHeight || tex.height;
        var sc = Math.min(1, 700 / Math.max(tw, th)), w = Math.max(8, Math.round(tw * sc)), h = Math.max(8, Math.round(th * sc));
        var c = U.cv(w, h), x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(tex, 0, 0, w, h);
        var px = x.getImageData(0, 0, w, h).data, al = function (i, j) { return (i < 0 || j < 0 || i >= w || j >= h) ? 0 : px[(j * w + i) * 4 + 3]; }, pts = [], T = 120;
        for (var j = 1; j < h - 1; j++) for (var i = 1; i < w - 1; i++) {
          if (al(i, j) < T) continue;
          if (al(i - 1, j) >= T && al(i + 1, j) >= T && al(i, j - 1) >= T && al(i, j + 1) >= T) continue;
          pts.push({ u: i / w, v: j / h });
        }
        var r = U.rng(S.seed * 131 + 9);
        for (var k = pts.length - 1; k > 0; k--) { var q = Math.floor(r() * (k + 1)), tmp = pts[k]; pts[k] = pts[q]; pts[q] = tmp; }
        EDGES = pts.slice(0, 2000);
        /* halo: the silhouette blurred outward, with the shape itself cut out, so it glows
           around her and never washes over the glass (works in every browser, no filters) */
        var mw = Math.round(w * HM), mh = Math.round(h * HM), hw = w + 2 * mw, hh = h + 2 * mh;
        var m = U.cv(hw, hh), mx = m.getContext('2d'); mx.drawImage(tex, mw, mh, w, h); mx.globalCompositeOperation = 'source-in'; mx.fillStyle = U.rgba(CORE, 1); mx.fillRect(0, 0, hw, hh);
        var blur = function (src, f) { var a = U.cv(hw / f, hh / f); a.getContext('2d').drawImage(src, 0, 0, a.width, a.height); return a; };
        var b1 = blur(m, 6), b2 = blur(b1, 2.5), out = U.cv(hw, hh), ox2 = out.getContext('2d');
        ox2.imageSmoothingQuality = 'high'; ox2.drawImage(b2, 0, 0, hw, hh); ox2.globalAlpha = .7; ox2.drawImage(b1, 0, 0, hw, hh); ox2.globalAlpha = 1;
        ox2.globalCompositeOperation = 'destination-out'; ox2.drawImage(m, 0, 0);
        HALO = out;
        if (!EDGES.length) U.warn('no transparent edge found; glints will scatter around the light instead', img);
      } catch (e) { EDGES = []; HALO = null; }
    }
    function resize() {
      dpr = Math.max(.5, Math.min(U.dpr(S.quality), P.perf.scale([2, 1.25, 1]), Math.sqrt(S.maxPixels / Math.max(1, ov.W * ov.H))));
      front.width = Math.round(ov.W * dpr); front.height = Math.round(ov.H * dpr);
      /* feather every edge of the layer, so flares, halo and dust fade out instead of
         stopping at a hard line where the layer ends */
      var f = Math.max(8, Math.round(ov.pad * .9)) + 'px';
      var m = 'linear-gradient(to right,transparent,#000 ' + f + ',#000 calc(100% - ' + f + '),transparent),linear-gradient(to bottom,transparent,#000 ' + f + ',#000 calc(100% - ' + f + '),transparent)';
      wrap.style.webkitMaskImage = wrap.style.maskImage = m;
      wrap.style.webkitMaskComposite = 'source-in'; wrap.style.maskComposite = 'intersect';
    }
    function put(im, x, y, size, rot, a) {
      if (a < .004 || size < .5) return;
      var c = Math.cos(rot), s = Math.sin(rot), sc = size / im.width;
      fx.globalAlpha = clamp(a, 0, 1);
      fx.setTransform(dpr * c * sc, dpr * s * sc, -dpr * s * sc, dpr * c * sc, dpr * x, dpr * y);
      fx.drawImage(im, -im.width / 2, -im.height / 2);
    }
    function frame(dt) {
      if (!running) return;
      acc += dt; if (S.fps && acc < 1 / S.fps - .004) return; dt = acc; acc = 0;
      if (!U.reduced) t += dt;
      var W = ov.W, H = ov.H, p = ov.pad, iw = ov.w, ih = ov.h, ox = p + S.origin.x * iw, oy = p + S.origin.y * ih;
      var k = ih / 800, Ui = Math.min(iw, ih) / 2, rate = Math.min(1, S.glintRate), e0 = .1, rr = Math.max(.3, S.fadeIn / 1000), ramp = U.reduced ? 1 : U.easeOut(clamp(t / rr, 0, 1));
      var Lfar = Math.hypot(Math.max(ox, W - ox), Math.max(oy, H - oy));
      fx.setTransform(1, 0, 0, 1, 0, 0); fx.globalAlpha = 1; fx.globalCompositeOperation = 'source-over'; fx.clearRect(0, 0, front.width, front.height);
      fx.globalCompositeOperation = 'lighter';
      /* halo around the outline */
      if (HALO && S.halo > 0) {
        fx.setTransform(dpr, 0, 0, dpr, 0, 0); fx.globalAlpha = clamp(S.halo / 100 * 1.4, 0, 1) * ramp;
        fx.drawImage(HALO, p - iw * HM, p - ih * HM, iw * (1 + 2 * HM), ih * (1 + 2 * HM));
      }
      /* bloom at the source */
      var bA = Math.min(60, S.bloom) / 100 * ramp;
      if (bA > .003) {
        var R = Ui * (.25 + .9 * S.bloom / 100); fx.setTransform(dpr, 0, 0, dpr, 0, 0); fx.globalAlpha = 1;
        var g = fx.createRadialGradient(ox, oy, 0, ox, oy, R);
        g.addColorStop(0, U.rgba(CORE, bA)); g.addColorStop(.16, U.rgba(CORE, bA * .5)); g.addColorStop(.45, U.rgba(AMBER, bA * .16)); g.addColorStop(1, U.rgba(AMBER, 0));
        fx.fillStyle = g; fx.fillRect(ox - R, oy - R, 2 * R, 2 * R);
      }
      /* flares: faint streaks of spectrum caught in the crystal */
      FL.forEach(function (F) {
        var ap = U.easeOut(clamp((t - e0 - rr * .8 - F.t * rr) / rr, 0, 1)); if (ap <= 0) return;
        var s = S.flareStr / 100 * F.s * ap, len = Lfar * F.len * S.flareLen * (.6 + .4 * ap), h = 2 * len * Math.tan(U.rad(F.w * S.flareWidth) / 2), th = F.a + U.rad(S.flareSpin) * t, im = FS[F.v];
        var a = Math.cos(th), b = Math.sin(th), sx = len / im.width, sy = h / im.height;
        fx.globalAlpha = clamp(s, 0, 1); fx.setTransform(dpr * a * sx, dpr * b * sx, -dpr * b * sy, dpr * a * sy, dpr * ox, dpr * oy); fx.drawImage(im, 0, -im.height / 2);
      });
      /* glints on the outline */
      var dens = P.perf.scale([1, .7, .45]), nG = Math.min(GL.length, Math.round(S.glints * dens)), gs = S.glintStr / 100;
      for (var i = 0; i < nG && gs > .003; i++) {
        var G = GL[i], ia = U.easeOut(clamp((t - e0 - rr * (.4 + G.ph * .8)) / rr, 0, 1)); if (ia <= 0) continue;
        var tw = Math.pow(.5 - .5 * Math.cos(2 * Math.PI * (t * rate * G.sp + G.ph)), 3), x, y;
        if (EDGES.length) { var E = EDGES[Math.floor(G.e * EDGES.length)]; x = p + E.u * iw; y = p + E.v * ih; }
        else { x = ox + Math.cos(G.a) * G.d * Ui; y = oy + Math.sin(G.a) * G.d * Ui; }
        put(G.warm < S.warmth / 100 ? STAR_W : STAR_C, x, y, S.glintSize * k * (.45 + G.s * .9) * (.55 + .45 * tw) * 2, G.rot, gs * ia * (.15 + .85 * tw));
      }
      /* dust floating in the glow */
      var nD = Math.min(DU.length, Math.round(S.dust * dens)), ds = S.dustStr / 100;
      for (var d = 0; d < nD && ds > .003; d++) {
        var Pd = DU[d], ib = U.easeOut(clamp((t - e0 - rr * (.6 + Pd.ph)) / rr, 0, 1)); if (ib <= 0) continue;
        var tw2 = .5 - .5 * Math.cos(2 * Math.PI * (t * rate * .7 * Pd.sp + Pd.ph));
        var dist = Pd.d * Ui * S.dustSpread * 2 * (1 + .04 * Math.sin(t * .2 + Pd.ph * 6));
        put(Pd.warm < S.warmth / 100 ? DUST_W : DUST_C, ox + Math.cos(Pd.a) * dist, oy + Math.sin(Pd.a) * dist, (4 + Pd.s * 9) * k * S.dustSize * (.6 + .4 * tw2), 0, ds * ib * Pd.s * (.25 + .75 * tw2));
      }
    }
    var layer = {
      el: wrap, resize: resize,
      show: function () { if (layer.idle) return; running = true; ov.load().then(function (tex) { if (!EDGES.length && !HALO && !edges.q) { edges.q = 1; U.idle(function () { edges(tex); edges.q = 0; }); } }, function () {}); },
      hide: function () { running = false; fx.setTransform(1, 0, 0, 1, 0, 0); fx.clearRect(0, 0, front.width, front.height); },
      frame: frame,
    };
    ov.add(layer);
    seed(); resize();
    P.perf.on(function () { if (ov.W > 1) resize(); });
    var api = {
      settings: S, overlay: ov, kind: 'sparkle', defaults: P.SPARKLE_DEFAULTS,
      reconfigure: function (next) {
        if (manual && !next) return;
        next = next || P.resolve('image', preset(), img, P.IMAGE_DEFAULTS);
        var sp = U.merge(U.clone(P.SPARKLE_DEFAULTS), next.sparkle || {});
        for (var k in sp) if (JSON.stringify(sp[k]) !== JSON.stringify(S[k])) api.set(k, sp[k]);
        if (next.pad != null) ov.padScale = next.pad;
      },
      set: function (k, v) { if (k === 'origin') S.origin = v; else S[k] = v; if (k === 'quality' || k === 'maxPixels') resize(); if (k === 'flares' || k === 'seed') seed();
        if (/^flare(Pal|Hue|Sat)$/.test(k)) { clearTimeout(api._fs); api._fs = setTimeout(function () { FS = flareSprites(S.flarePal, S.flareHue, S.flareSat); }, 40); } if (k === 'seed') { EDGES = []; HALO = null; ov.load().then(edges, function () {}); } },
      replay: function () { t = 0; },
      /* pause(): clear and stop drawing, but keep the outline it found so resume() is instant */
      pause: function () { if (layer.idle) return; layer.hide(); layer.idle = true; ov.sync(); },
      resume: function () { if (!layer.idle) return; layer.idle = false; t = 0; if (ov.visible) layer.show(); ov.sync(); },
      isPaused: function () { return !!layer.idle; },
      destroy: function () { ov.remove(layer); running = false; if (img.__prism) img.__prism.sparkle = undefined; },
    };
    return api;
  }

  P.sparkle = { mount: mount, defaults: P.SPARKLE_DEFAULTS };
  P.register('sparkle', { selector: 'img[data-prism], img[data-prism-sparkle]', mount: function (el, s) { return mount(el, s); } });
})();
