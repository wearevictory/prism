/* ════════════════════════════════════════════════════════════════════
   Prism · core
   Shared by every module: helpers, settings, one animation loop,
   visibility, the overlay that sits on top of an image, and start-up.
   Load this first, then any of: prism-aurora, prism-statue, prism-sparkle.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  if (window.Prism && window.Prism.core) return;
  var P = window.Prism = window.Prism || {};
  P.core = true;
  P.version = '2.0.0';

  /* ── Helpers ─────────────────────────────────────────────────────── */
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var U = P.util = {
    clamp: clamp, lerp: lerp,
    sstep: function (a, b, x) { if (b === a) return x < a ? 0 : 1; var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); },
    easeOut: function (t) { return 1 - Math.pow(1 - t, 3); },
    rad: function (d) { return d * Math.PI / 180; },
    cv: function (w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; },
    rng: function (seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; },
    hsl: function (h, s, l) { h = (((h % 360) + 360) % 360) / 30; s /= 100; l /= 100; var a = s * Math.min(l, 1 - l), f = function (n) { var k = (n + h) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); }; return [f(0), f(8), f(4)]; },
    rgba: function (c, a) { return 'rgba(' + Math.round(c[0] * 255) + ',' + Math.round(c[1] * 255) + ',' + Math.round(c[2] * 255) + ',' + clamp(a, 0, 1).toFixed(3) + ')'; },
    /* OKLCH → sRGB, so palettes stay perceptually even */
    oklch: function (L, C, h) {
      var r = h * Math.PI / 180, a = C * Math.cos(r), b = C * Math.sin(r);
      var l_ = L + .3963377774 * a + .2158037573 * b, m_ = L - .1055613458 * a - .0638541728 * b, s_ = L - .0894841775 * a - 1.2914855480 * b;
      var l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;
      var g = function (x) { x = clamp(x, 0, 1); return x <= .0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - .055; };
      return [g(4.0767416621 * l - 3.3077115913 * m + .2309699292 * s), g(-1.2684380046 * l + 2.6097574011 * m - .3413193965 * s), g(-.0041960863 * l - .7034186147 * m + 1.7076147010 * s)];
    },
    reduced: !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches),
    dpr: function (cap) { return Math.min(cap || 2, window.devicePixelRatio || 1); },
    warn: function () { var a = ['Prism:']; for (var i = 0; i < arguments.length; i++) a.push(arguments[i]); console.warn.apply(console, a); },
  };
  U.ok = function (L, C, h, a) { return U.rgba(U.oklch(L / 100, C, h), a == null ? 1 : a); };
  var isObj = function (v) { return v && typeof v === 'object' && !Array.isArray(v); };
  var merge = U.merge = function (target, src) { if (!isObj(src)) return target; for (var k in src) { if (isObj(src[k])) { if (!isObj(target[k])) target[k] = {}; merge(target[k], src[k]); } else target[k] = src[k]; } return target; };
  var clone = U.clone = function (o) { return JSON.parse(JSON.stringify(o)); };

  /* ── Settings ────────────────────────────────────────────────────────
     All values come from one JSON block (exported by the Lab):
       <script type="application/json" data-prism-config>{ "aurora": {…}, "image": {…} }</script>
     or window.PrismConfig = {…}. Each holds named presets plus "default".
     Elements pick a preset by name and can override with data-prism-options='{…}'. */
  var CONFIG = null, WARNED = {};
  P.config = function (fresh) {
    if (CONFIG && !fresh) return CONFIG;
    CONFIG = {};
    var blocks = document.querySelectorAll('script[type="application/json"][data-prism-config], script#prism-config');
    for (var i = 0; i < blocks.length; i++) {
      try { merge(CONFIG, JSON.parse(blocks[i].textContent || '{}')); } catch (e) { U.warn('a settings block is not valid JSON', blocks[i], e); }
    }
    if (isObj(window.PrismConfig)) merge(CONFIG, window.PrismConfig);
    return CONFIG;
  };
  P.resolve = function (kind, preset, el, defaults) {
    var group = P.config()[kind] || {}, out = merge(clone(defaults), group['default'] || {});
    if (preset && preset !== 'default' && preset !== 'true') {
      if (group[preset]) merge(out, group[preset]);
      else if (!WARNED[kind + preset]) { WARNED[kind + preset] = 1; U.warn('no "' + kind + '" preset called "' + preset + '"; using the default. Check the name in your settings block.'); }
    }
    var inline = el && el.getAttribute('data-prism-options');
    if (inline) { try { merge(out, JSON.parse(inline)); } catch (e) { U.warn('data-prism-options is not valid JSON', el, e); } }
    return out;
  };

  /* ── One loop for everything; stops when nothing is on screen ───── */
  var subs = [], raf = 0, last = 0;
  function tick(now) {
    var dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now;
    for (var i = 0; i < subs.length; i++) { try { subs[i](dt, now); } catch (e) { U.warn(e); } }
    raf = subs.length ? requestAnimationFrame(tick) : 0;
  }
  P.loop = {
    add: function (fn) {
      if (subs.indexOf(fn) < 0) subs.push(fn);
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
      return function () { var i = subs.indexOf(fn); if (i >= 0) subs.splice(i, 1); };
    },
  };
  P.watch = function (el, cb, margin) {
    if (!window.IntersectionObserver) { cb(true); return function () {}; }
    var io = new IntersectionObserver(function (es) { cb(es[es.length - 1].isIntersecting); }, { rootMargin: margin || '25% 0px' });
    io.observe(el);
    return function () { io.disconnect(); };
  };

  /* ── Image overlay ───────────────────────────────────────────────────
     Statue and Sparkle draw into one layer that sits exactly on top of the image.
     The image itself is never moved or rewrapped, so Webflow layout and
     Interactions keep working: the layer follows the image's position, size
     and opacity every frame while it is on screen. */
  P.overlay = function (img, opts) {
    if (img.__prismOverlay) return img.__prismOverlay;
    var parent = img.parentElement;
    if (parent && parent.tagName === 'PICTURE') { img = parent.querySelector('img') || img; parent = parent.parentElement; }
    if (!parent) throw new Error('the image needs a parent element');
    if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
    var el = document.createElement('div');
    el.className = 'prism-overlay';
    el.setAttribute('aria-hidden', 'true');
    el.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;pointer-events:none;z-index:' + (opts.zIndex != null ? opts.zIndex : 1);
    var anchor = img.parentElement === parent ? img : img.parentElement;
    parent.insertBefore(el, anchor.nextSibling);

    var ov = { img: img, el: el, x: NaN, y: NaN, w: 1, h: 1, pad: 0, W: 1, H: 1, padScale: opts.pad != null ? opts.pad : .3, visible: false, layers: [], texture: null };
    var fitMode = getComputedStyle(img).objectFit;
    ov.measure = function () {
      var r = img.getBoundingClientRect(), pr = parent.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      var w = r.width, h = r.height, x = r.left - pr.left - parent.clientLeft + parent.scrollLeft, y = r.top - pr.top - parent.clientTop + parent.scrollTop;
      var nw = img.naturalWidth, nh = img.naturalHeight;
      if (nw && nh && (fitMode === 'contain' || fitMode === 'scale-down')) { // the picture inside a letterboxed box
        var s = Math.min(w / nw, h / nh), cw = nw * s, ch = nh * s; x += (w - cw) / 2; y += (h - ch) / 2; w = cw; h = ch;
      }
      var p = Math.round(h * ov.padScale);
      if (Math.abs(w - ov.w) > .5 || Math.abs(h - ov.h) > .5 || p !== ov.pad) { ov.w = w; ov.h = h; ov.pad = p; ov.W = w + 2 * p; ov.H = h + 2 * p; el.style.width = ov.W + 'px'; el.style.height = ov.H + 'px'; ov.layers.forEach(function (l) { if (l.resize) l.resize(); }); }
      if (!(Math.abs(x - ov.x) <= .25 && Math.abs(y - ov.y) <= .25) || p !== ov._p) { ov.x = x; ov.y = y; ov._p = p; el.style.transform = 'translate(' + (x - ov.pad) + 'px,' + (y - ov.pad) + 'px)'; }
      var o = getComputedStyle(img).opacity; if (o !== ov._o) { el.style.opacity = o; ov._o = o; }
      return true;
    };
    /* a CORS-readable copy of the picture: the GPU and the edge finder can only read images the host allows */
    ov.load = function () {
      if (ov.texture) return ov.texture;
      var src = img.getAttribute('data-prism-src') || img.currentSrc || img.src;
      ov.texture = new Promise(function (res, rej) {
        if (!src) return rej(new Error('image has no src'));
        var t = new Image(); t.crossOrigin = 'anonymous'; t.decoding = 'async';
        t.onload = function () { res(t); };
        t.onerror = function () { U.warn('could not read the image (the host must allow CORS). The image shows without effects.', src); rej(new Error('cors')); };
        t.src = src;
      });
      return ov.texture;
    };
    ov.add = function (layer) { ov.layers.push(layer); el.appendChild(layer.el); if (ov.visible && layer.show) layer.show(); };
    var stopLoop = null;
    function frame(dt, now) { if (!ov.measure()) return; for (var i = 0; i < ov.layers.length; i++) if (ov.layers[i].frame) ov.layers[i].frame(dt, now); }
    P.watch(img, function (on) {
      ov.visible = on;
      ov.layers.forEach(function (l) { if (on ? l.show : l.hide) (on ? l.show : l.hide)(); });
      if (on && !stopLoop) { ov.measure(); stopLoop = P.loop.add(frame); }
      if (!on && stopLoop) { stopLoop(); stopLoop = null; }
    }, opts.margin || '30% 0px');
    if (!img.complete) img.addEventListener('load', function () { fitMode = getComputedStyle(img).objectFit; ov.measure(); }, { once: true });
    img.__prismOverlay = ov;
    return ov;
  };

  /* ── Modules and start-up ────────────────────────────────────────── */
  var mods = {}, booted = false;
  function scan(only) {
    Object.keys(mods).forEach(function (name) {
      if (only && name !== only) return;
      var m = mods[name], list = document.querySelectorAll(m.selector);
      for (var i = 0; i < list.length; i++) {
        var el = list[i];
        if (el.hasAttribute('data-prism-manual')) continue;
        el.__prism = el.__prism || {};
        if (el.__prism[name] !== undefined) continue;
        try { el.__prism[name] = m.mount(el) || null; } catch (e) { el.__prism[name] = null; U.warn(name + ' could not start on', el, e); }
      }
    });
  }
  P.register = function (name, mod) { mods[name] = mod; if (booted) scan(name); };
  /* call after adding content later (CMS lists, tabs, sliders) */
  P.refresh = function () { scan(); };
  /* start one module by hand on an element, with an optional settings object */
  P.mount = function (name, el, settings) { if (!mods[name]) throw new Error('module "' + name + '" is not loaded'); el.__prism = el.__prism || {}; return (el.__prism[name] = mods[name].mount(el, settings)); };
  P.get = function (el, name) { return el && el.__prism ? el.__prism[name] : undefined; };
  function boot() { booted = true; P.config(true); scan(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else setTimeout(boot, 0);
})();
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
/* ════════════════════════════════════════════════════════════════════
   Prism · Statue
   Refracted light flowing over a transparent cutout, on the GPU.
   Mark an image:  data-prism="liberty"          (statue + sparkle, from the "liberty" preset)
                   data-prism-statue="liberty"   (statue light only)
   Modes: "replace" (default) draws the whole picture on the GPU, with tint and
          clarity, and hides the original once the first frame is ready.
          "overlay" keeps the real image showing and only adds light on top.
   Either way the effect follows the image's position, size and opacity, so
   Webflow Interactions that move or fade the image still work.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  var P = window.Prism;
  if (!P || !P.core) { console.warn('Prism: load prism-core before prism-statue'); return; }
  var U = P.util;

var createShader=(function(){
  var VS="attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
  var FS=[
  "precision highp float;",
  "uniform vec2 uRes;uniform vec4 uFit;uniform vec2 uTexel;uniform sampler2D uImg;uniform sampler2D uRamp;",
  "uniform float uTime,uDpr,uLight,uTint,uClarity,uSpeed,uFlow,uFlowScale,uAngle,uScale,uSharp,uFollow,uDisp,uHue,uThresh,uSoft,uEdge,uGlitter,uGSize,uTwinkle,uGrain,uOverlay;",
  "vec3 m289(vec3 x){return x-floor(x*(1./289.))*289.;}vec2 m289(vec2 x){return x-floor(x*(1./289.))*289.;}vec3 perm(vec3 x){return m289(((x*34.)+1.)*x);}",
  "float sn(vec2 v){const vec4 C=vec4(.211324865405187,.366025403784439,-.577350269189626,.024390243902439);vec2 i=floor(v+dot(v,C.yy));vec2 x0=v-i+dot(i,C.xx);vec2 i1=(x0.x>x0.y)?vec2(1.,0.):vec2(0.,1.);vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=m289(i);vec3 p=perm(perm(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);m=m*m;m=m*m;vec3 x=2.*fract(p*C.www)-1.;vec3 h=abs(x)-.5;vec3 ox=floor(x+.5);vec3 a0=x-ox;m*=1.79284291400159-.85373472095314*(a0*a0+h*h);vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;return 130.*dot(m,g);}",
  "float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<3;i++){s+=a*sn(p);p=p*2.03+vec2(17.1,9.7);a*=.5;}return s;}",
  "float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}",
  "float L(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}",
  "vec3 img(vec2 u){return texture2D(uImg,u).rgb;}","float alp(vec2 u){return texture2D(uImg,u).a;}",
  "vec3 ramp(float x){return texture2D(uRamp,vec2(fract(x),.5)).rgb;}",
  "float band(float x){return pow(.5+.5*cos(6.2831853*x),uSharp);}",
  "void main(){",
  " vec2 pix=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);",
  " vec2 uv=(pix-uFit.xy)/uFit.zw;",
  " float inside=step(0.,uv.x)*step(uv.x,1.)*step(0.,uv.y)*step(uv.y,1.);",
  " uv=clamp(uv,0.,1.);",
  " float A=alp(uv)*inside;",
  " vec3 base=img(uv)*inside;",
  " vec2 o=uTexel*1.25;",
  " vec3 n1=img(uv+vec2(o.x,0.)),n2=img(uv-vec2(o.x,0.)),n3=img(uv+vec2(0.,o.y)),n4=img(uv-vec2(0.,o.y));",
  " vec3 blur=(n1+n2+n3+n4)*.25;",
  " base=max(base+(base-blur)*uClarity*1.6*inside,0.)*inside;",
  " float lum=L(base);",
  " float gx=L(n1)-L(n2),gy=L(n3)-L(n4);",
  " float edge=clamp(length(vec2(gx,gy))*3.5,0.,1.);",
  " float t=uTime;",
  " vec2 p=(pix-uFit.xy)/uFit.w;",
  " vec2 dir=vec2(cos(uAngle),sin(uAngle));",
  " vec2 q=p*uFlowScale;",
  " vec2 w=vec2(fbm(q+vec2(0.,t*.13)),fbm(q+vec2(5.2,1.3)-vec2(t*.11,0.)));",
  " float warp=fbm(q+1.7*w+vec2(t*.08,-t*.06));",
  " float ph=dot(p,dir)*uScale+warp*uFlow+lum*uFollow-t*uSpeed;",
  " float d=uDisp*.06;",
  " float hue=ph*.31+warp*.35+t*.015+uHue;",
  " vec3 lt=vec3(ramp(hue-d*2.).r*band(ph-d),ramp(hue).g*band(ph),ramp(hue+d*2.).b*band(ph+d));",
  " float hl=smoothstep(uThresh,uThresh+uSoft,lum);",
  " float m=clamp(hl+edge*uEdge,0.,1.)*inside*A;",
  " vec3 light=lt*m*uLight;",
  " vec3 tinted=ramp(lum*.6+warp*.15+uHue)*lum*1.35;",
  " vec3 col=mix(base,max(base,tinted*A),uTint*inside);",
  " col=1.-(1.-col)*(1.-clamp(light,0.,1.));",
  " col+=light*light*.35;",
  " vec3 gl=vec3(0.);",
  " if(uGlitter>0.001){",
  "  float cs=uGSize*uDpr;",
  "  vec2 g=floor(pix/cs);",
  "  for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){",
  "   vec2 c=g+vec2(float(i),float(j));",
  "   float h=h21(c);",
  "   if(h>uGlitter*.4)continue;",
  "   vec2 ctr=(c+vec2(h21(c+3.1),h21(c+7.7)))*cs;",
  "   vec2 cu=(ctr-uFit.xy)/uFit.zw;",
  "   float gate=step(0.,cu.x)*step(cu.x,1.)*step(0.,cu.y)*step(cu.y,1.);",
  "   gate*=smoothstep(uThresh+.05,uThresh+.35,L(img(clamp(cu,0.,1.))));",
  "   float tw=.5+.5*sin(t*6.2831853*uTwinkle*(.55+.45*h21(c+1.3))+h21(c+9.1)*6.2831853);",
  "   tw=tw*tw*tw*tw*tw*tw;",
  "   vec2 dd=pix-ctr;float r=cs*(.45+.6*h21(c+4.4));",
  "   float st=exp(-abs(dd.x)/(r*.045))*exp(-abs(dd.y)/r)+exp(-abs(dd.y)/(r*.045))*exp(-abs(dd.x)/r);",
  "   float core=exp(-dot(dd,dd)/(r*r*.012));",
  "   vec3 tc=mix(vec3(1.,.97,.92),ramp(h21(c+2.)),.5);",
  "   gl+=tc*(st*.55+core)*tw*gate;",
  "  }",
  " }",
  " col+=gl*1.1;",
  " if(uOverlay>.5){",
  "  vec3 add=clamp(light+light*light*.35+gl*1.1+max(tinted*A-base,0.)*uTint*.6,0.,1.);",
  "  gl_FragColor=vec4(add,max(add.r,max(add.g,add.b)));return;",
  " }",
  " col+=(h21(pix+fract(t*7.)*91.)-.5)*uGrain*A;",
  " col=clamp(col/(1.+max(col-1.,0.)*.6),0.,1.);",
  " float oa=max(A,max(col.r,max(col.g,col.b)));",
  " gl_FragColor=vec4(col,oa);",
  "}"].join("\n");
  
  var PALETTES={
   prism:{name:"Prism",stops:["#FEFBF6","#FFD175","#F5A461","#FFD175","#FFF4E4","#B86DFD","#7363F8","#487EF7","#50E4FF","#F2FBFF"]},
   diamond:{name:"Diamond fire",stops:["#FFF7EC","#FFD27A","#FF9A4A","#FF6FAE","#9B6BFF","#4D7BFF","#6FE6FF","#EAF8FF"]},
   crystal:{name:"Crystal",stops:["#FFFFFF","#FFE7BF","#E9A84A","#FFD27A","#9AA6FF","#5A68E8","#DCE2FF"]},
   shard:{name:"Shard",stops:["#FFF1D8","#EAB84F","#C97632","#4A35B8","#1C4297","#6E8BFF","#FFF6EA"]},
   champagne:{name:"Champagne",stops:["#FFFFFF","#FFF0D2","#F2C98A","#F7B7A3","#D9C4FF","#FFFFFF"]},
   thermal:{name:"Thermal",stops:["#00166D","#00AAFF","#FFCB5C","#FF4400","#F384FF","#FFFFFF"]}
  };
  var DEFAULTS={palette:"prism",light:1.0,tint:.1,clarity:.45,speed:.22,flow:1.15,flowScale:1.5,angle:-35,scale:2.1,sharp:2.6,follow:.55,disp:.45,hue:0,thresh:.32,soft:.38,edge:.75,glitter:.45,gsize:20,twinkle:.7,grain:.02,quality:2};
  
  function hex(h){return[parseInt(h.substr(1,2),16)/255,parseInt(h.substr(3,2),16)/255,parseInt(h.substr(5,2),16)/255];}
  function lin(c){return c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4);}
  function gam(c){c=Math.max(0,Math.min(1,c));return c<=.0031308?12.92*c:1.055*Math.pow(c,1/2.4)-.055;}
  function toLab(rgb){var r=lin(rgb[0]),g=lin(rgb[1]),b=lin(rgb[2]);
   var l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
   return[.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s];}
  function fromLab(c){var l=c[0]+.3963377774*c[1]+.2158037573*c[2],m=c[0]-.1055613458*c[1]-.0638541728*c[2],s=c[0]-.0894841775*c[1]-1.291485548*c[2];l*=l*l;m*=m*m;s*=s*s;
   return[gam(4.0767416621*l-3.3077115913*m+.2309699292*s),gam(-1.2684380046*l+2.6097574011*m-.3413193965*s),gam(-.0041960863*l-.7034186147*m+1.707614701*s)];}
  function rampData(stops){var labs=stops.map(function(h){return toLab(hex(h));}),n=labs.length,out=new Uint8Array(256*4);
   for(var i=0;i<256;i++){var x=i/256*n,k=Math.floor(x),f=x-k,a=labs[k%n],b=labs[(k+1)%n];f=f*f*(3-2*f);
    var c=fromLab([a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f,a[2]+(b[2]-a[2])*f]);out[i*4]=c[0]*255;out[i*4+1]=c[1]*255;out[i*4+2]=c[2]*255;out[i*4+3]=255;}
   return out;}
  
  function create(canvas,image,settings,opts){
   opts=opts||{};
   var S={};for(var k in DEFAULTS)S[k]=DEFAULTS[k];for(k in settings)S[k]=settings[k];
   var gl=canvas.getContext("webgl",{antialias:false,premultipliedAlpha:true,alpha:true,preserveDrawingBuffer:false,powerPreference:"high-performance"});
   if(!gl){if(opts.onError)opts.onError();return null;}
   canvas.addEventListener("webglcontextlost",function(e){e.preventDefault();if(opts.onLost)opts.onLost();});
   function sh(t,s){var o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(o));return o;}
   var pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,VS));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(pr);gl.useProgram(pr);
   var buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
   var al=gl.getAttribLocation(pr,"a");gl.enableVertexAttribArray(al);gl.vertexAttribPointer(al,2,gl.FLOAT,false,0,0);
   var U={};["uRes","uFit","uTexel","uImg","uRamp","uTime","uDpr","uLight","uTint","uClarity","uSpeed","uFlow","uFlowScale","uAngle","uScale","uSharp","uFollow","uDisp","uHue","uThresh","uSoft","uEdge","uGlitter","uGSize","uTwinkle","uGrain","uOverlay"].forEach(function(n){U[n]=gl.getUniformLocation(pr,n);});
   function tex(){var t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);return t;}
   var tImg=tex();gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
   var tRamp=tex();gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
   var iw=1,ih=1;
   function setImage(im){iw=im.naturalWidth||im.width;ih=im.naturalHeight||im.height;gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tImg);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,im);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);}
   function setPalette(){var p=PALETTES[S.palette]||PALETTES.prism;gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,tRamp);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,256,1,0,gl.RGBA,gl.UNSIGNED_BYTE,rampData(p.stops));}
   setImage(image);setPalette();gl.uniform1i(U.uImg,0);gl.uniform1i(U.uRamp,1);
   var reduce=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
   var W=0,H=0,dpr=1;
   function resize(){dpr=Math.min(window.devicePixelRatio||1,S.quality);var r=canvas.getBoundingClientRect();W=Math.max(1,Math.round(r.width*dpr));H=Math.max(1,Math.round(r.height*dpr));if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H;}gl.viewport(0,0,W,H);}
   var ro=window.ResizeObserver?new ResizeObserver(resize):null;if(ro)ro.observe(canvas);else window.addEventListener("resize",resize);resize();
   var visible=true;
   if(opts.observe&&window.IntersectionObserver){new IntersectionObserver(function(e){visible=e[0].isIntersecting;},{rootMargin:"100px"}).observe(canvas);}
   var paused=false,clock=0,last=performance.now(),raf=0,frames=0,fpsT=last;
   function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
   function frame(now){raf=requestAnimationFrame(frame);var dt=Math.min(.05,(now-last)/1000);last=now;if(!visible)return;
    if(!paused)clock+=dt*(reduce?0.25:1);
    var fx0,fy0,fw,fh;if(opts.fit){var F=opts.fit();if(!F)return;fx0=F[0]*dpr;fy0=F[1]*dpr;fw=F[2]*dpr;fh=F[3]*dpr;}else{var pad=opts.pad||0,sc=Math.min((W-pad*2*dpr)/iw,(H-pad*2*dpr)/ih);fw=iw*sc;fh=ih*sc;fx0=(W-fw)/2;fy0=(H-fh)/2;}
    gl.uniform2f(U.uRes,W,H);gl.uniform4f(U.uFit,fx0,fy0,fw,fh);gl.uniform2f(U.uTexel,1/iw,1/ih);
    gl.uniform1f(U.uTime,clock);gl.uniform1f(U.uDpr,dpr);
    gl.uniform1f(U.uLight,S.light);gl.uniform1f(U.uTint,S.tint);gl.uniform1f(U.uClarity,S.clarity);
    gl.uniform1f(U.uSpeed,clamp(S.speed,0,1));gl.uniform1f(U.uFlow,S.flow);gl.uniform1f(U.uFlowScale,S.flowScale);
    gl.uniform1f(U.uAngle,S.angle*Math.PI/180);gl.uniform1f(U.uScale,S.scale);gl.uniform1f(U.uSharp,S.sharp);gl.uniform1f(U.uFollow,S.follow);
    gl.uniform1f(U.uDisp,S.disp);gl.uniform1f(U.uHue,S.hue);gl.uniform1f(U.uThresh,S.thresh);gl.uniform1f(U.uSoft,Math.max(.01,S.soft));gl.uniform1f(U.uEdge,S.edge);
    gl.uniform1f(U.uGlitter,S.glitter);gl.uniform1f(U.uGSize,S.gsize);gl.uniform1f(U.uTwinkle,reduce?0:clamp(S.twinkle,0,1.5));gl.uniform1f(U.uGrain,S.grain);gl.uniform1f(U.uOverlay,opts.overlay?1:0);
    gl.drawArrays(gl.TRIANGLES,0,3);if(opts.onFirstFrame&&!opts.__done){opts.__done=1;opts.onFirstFrame();}
    frames++;if(opts.onFps&&now-fpsT>1000){opts.onFps(Math.round(frames*1000/(now-fpsT)));frames=0;fpsT=now;}
   }
   raf=requestAnimationFrame(frame);
   return{
    destroy:function(){cancelAnimationFrame(raf);if(ro)ro.disconnect();var x=gl.getExtension("WEBGL_lose_context");if(x)x.loseContext();},
    settings:S,
    set:function(k,v){S[k]=v;if(k==="palette")setPalette();if(k==="quality")resize();},
    setAll:function(o){for(var k in o)S[k]=o[k];setPalette();resize();},
    setImage:setImage,canvas:canvas,
    pause:function(p){paused=p;},
    isPaused:function(){return paused;}
   };
  }
  create.PALETTES=PALETTES;create.DEFAULTS=DEFAULTS;
  return create;
  })();
  
  P.STATUE_DEFAULTS = { mode: 'replace', palette: 'prism', light: 1, tint: .08, clarity: .4, speed: .22, flow: 1.15, flowScale: 1.5, scale: 2.1, sharp: 2.6,
    follow: .55, disp: .45, hue: 0, thresh: .32, soft: .38, edge: .75, glitter: .45, gsize: 20, twinkle: .7, grain: 0, quality: 2 };
  P.IMAGE_DEFAULTS = P.IMAGE_DEFAULTS || {};
  P.IMAGE_DEFAULTS.effects = P.IMAGE_DEFAULTS.effects || ['statue', 'sparkle'];
  P.IMAGE_DEFAULTS.pad = P.IMAGE_DEFAULTS.pad != null ? P.IMAGE_DEFAULTS.pad : .3;
  P.IMAGE_DEFAULTS.statue = P.STATUE_DEFAULTS;
  P.shader = createShader;
  P.STATUE_PALETTES = Object.keys(createShader.PALETTES);
  var live = 0, MAX_LIVE = 8;   // browsers allow only a few GPU contexts; images off screen give theirs back

  function mount(img, settings) {
    var preset = img.getAttribute('data-prism-statue') || img.getAttribute('data-prism');
    var cfg = settings || P.resolve('image', preset, img, P.IMAGE_DEFAULTS);
    if (!settings && !img.hasAttribute('data-prism-statue') && (cfg.effects || []).indexOf('statue') < 0) return null;
    var S = U.merge(U.clone(P.STATUE_DEFAULTS), cfg.statue || {});
    var ov = P.overlay(img, cfg);
    var canvas = document.createElement('canvas'), fx = null, tex = null, alive = true;
    var overlay = S.mode !== 'replace';
    canvas.className = 'prism-statue';
    canvas.style.cssText = 'position:absolute;inset:0;z-index:1;width:100%;height:100%;display:block;opacity:0;transition:opacity .9s ease' + (overlay ? ';mix-blend-mode:screen' : '');
    var showImg = function () { if (!overlay) img.style.visibility = ''; };
    function start() {
      if (fx || !alive) return;
      if (live >= MAX_LIVE) return;
      ov.load().then(function (t) {
        tex = t; if (fx || !ov.visible || !alive) return;
        try {
          fx = createShader(canvas, tex, S, {
            overlay: overlay,
            fit: function () { return [ov.pad, ov.pad, ov.w, ov.h]; },
            onFirstFrame: function () { canvas.style.opacity = 1; if (!overlay) img.style.visibility = 'hidden'; },
            onLost: function () { canvas.style.opacity = 0; showImg(); fx = null; live--; },
            onError: function () { showImg(); },
          });
          if (fx) live++;
        } catch (e) { U.warn('statue effect unavailable', e); showImg(); }
      }, function () { showImg(); });
    }
    function stop() { if (!fx) return; fx.destroy(); fx = null; live--; canvas.style.opacity = 0; showImg(); }
    ov.add({ el: canvas, show: start, hide: stop });
    return {
      settings: S, overlay: ov,
      set: function (k, v) { S[k] = v; if (fx) fx.set(k, v); },
      destroy: function () { alive = false; stop(); canvas.remove(); },
    };
  }

  P.statue = { mount: mount, defaults: P.STATUE_DEFAULTS };
  P.register('statue', { selector: 'img[data-prism], img[data-prism-statue]', mount: function (el) { return mount(el); } });
})();
/* ════════════════════════════════════════════════════════════════════
   Prism · Sparkle
   Four-point glints on the cutout's outline, floating dust, a soft halo
   hugging the shape, bloom, and lens flares and reflections.
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
    dust: 90, dustStr: 55, dustSpread: 1.15,    // count 0–400, strength 0–100, how far it floats (× image size)
    glintRate: .45,                             // twinkle per second, capped at 1
    warmth: 72,                                 // % of sparkles that are gold rather than icy
    halo: 50,                                   // soft light hugging the outline, 0–100
    bloom: 45,                                  // glow at the light's source, 0–60
    flares: 6, flareStr: 42, ghosts: 3, ghostStr: 22,
    origin: { x: .5, y: .36 },                  // where the light comes from, on the image (0–1)
    fadeIn: 1200, seed: 8,
  };
  P.IMAGE_DEFAULTS = P.IMAGE_DEFAULTS || {};
  P.IMAGE_DEFAULTS.effects = P.IMAGE_DEFAULTS.effects || ['statue', 'sparkle'];
  P.IMAGE_DEFAULTS.pad = P.IMAGE_DEFAULTS.pad != null ? P.IMAGE_DEFAULTS.pad : .3;
  P.IMAGE_DEFAULTS.sparkle = P.SPARKLE_DEFAULTS;

  var CORE = U.hsl(40, 70, 96), AMBER = U.hsl(34, 100, 60);
  var CRYS = { white: [97, .02, 80], gold: [88, .1, 85], amber: [76, .13, 60], blue: [58, .17, 259], violet: [60, .16, 291], cyan: [80, .11, 211] };
  var crys = function (k, a) { var c = CRYS[k]; return U.ok(c[0], c[1], c[2], a); };
  var crysA = function (k, a) { var c = CRYS[k]; return U.oklch(c[0] / 100, c[1], c[2]).concat([a]); };
  var NONE = [0, 0, 0, 0];

  /* sprites are shared by every image */
  var STAR_W = null, STAR_C = null, FLARE = null;
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
    var L = [['blue', 'violet', 'blue'], ['cyan', 'blue', 'violet'], ['violet', 'blue', 'cyan'], ['amber', 'gold', 'amber']], r = U.rng(8 * 7 + 12);
    FLARE = L.map(function (v) { var p0 = .18 + r() * .12; return wedge(256, 48, [[p0, NONE], [.42, crysA(v[0], .85)], [.58, crysA(v[1], .95)], [.74, crysA(v[2], .7)], [.94, NONE]]); });
  }

  function mount(img, settings) {
    var preset = img.getAttribute('data-prism-sparkle') || img.getAttribute('data-prism');
    var cfg = settings || P.resolve('image', preset, img, P.IMAGE_DEFAULTS);
    if (!settings && !img.hasAttribute('data-prism-sparkle') && (cfg.effects || []).indexOf('sparkle') < 0) return null;
    var S = U.merge(U.clone(P.SPARKLE_DEFAULTS), cfg.sparkle || {});
    sprites();
    var ov = P.overlay(img, cfg);
    var wrap = document.createElement('div'), front = document.createElement('canvas');
    wrap.className = 'prism-sparkle';
    wrap.style.cssText = 'position:absolute;inset:0;z-index:2';
    front.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;mix-blend-mode:screen';
    wrap.appendChild(front);
    var fx = front.getContext('2d'), dpr = U.dpr(2);
    var t = 0, running = false, EDGES = [], HALO = null, HM = .2, GL = [], DU = [], FL = [], GH = [];

    function seed() {
      var r = U.rng(S.seed * 7 + 13);
      GL = Array.from({ length: 160 }, function () { return { e: r(), ph: r(), sp: .6 + r() * .8, s: r(), rot: (r() - .5) * .5, warm: r(), a: r() * Math.PI * 2, d: .15 + r() * .5 }; });
      DU = Array.from({ length: 400 }, function () { return { a: r() * Math.PI * 2, d: Math.pow(r(), .6), ph: r(), sp: .4 + r() * .9, s: .3 + r() * .7, warm: r() }; });
      var rf = U.rng(S.seed * 7 + 8), rh = U.rng(S.seed * 7 + 9);
      FL = Array.from({ length: Math.round(S.flares) }, function () { return { a: rf() * Math.PI * 2, len: .45 + rf() * .7, w: 5 + rf() * 12, s: .4 + rf() * .6, t: rf(), v: Math.floor(rf() * 4) }; });
      var gA = rh() * Math.PI * 2;
      GH = Array.from({ length: Math.round(S.ghosts) }, function () { return { a: gA, dist: rh() * 1.6 - .5, size: 24 + rh() * 130, s: .35 + rh() * .65, t: rh() }; });
    }
    /* find the cutout's outline once: glints sit on it, the halo is a blurred copy of it */
    function edges(tex) {
      try {
        var sc = Math.min(1, 700 / Math.max(tex.naturalWidth, tex.naturalHeight)), w = Math.max(8, Math.round(tex.naturalWidth * sc)), h = Math.max(8, Math.round(tex.naturalHeight * sc));
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
      front.width = Math.round(ov.W * dpr); front.height = Math.round(ov.H * dpr);
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
        var s = S.flareStr / 100 * F.s * ap, len = Lfar * F.len * (.6 + .4 * ap), h = 2 * len * Math.tan(U.rad(F.w) / 2), th = F.a + U.rad(3) * t * .3, im = FLARE[F.v];
        var a = Math.cos(th), b = Math.sin(th), sx = len / im.width, sy = h / im.height;
        fx.globalAlpha = clamp(s, 0, 1); fx.setTransform(dpr * a * sx, dpr * b * sx, -dpr * b * sy, dpr * a * sy, dpr * ox, dpr * oy); fx.drawImage(im, 0, -im.height / 2);
      });
      /* ghosts: faint lens reflections strung along one line */
      if (GH.length) {
        fx.setTransform(dpr, 0, 0, dpr, 0, 0); var kk = Math.min(W, H) / 800;
        GH.forEach(function (G) {
          var ap = U.easeOut(clamp((t - e0 - rr - G.t * .6) / rr, 0, 1)), s = S.ghostStr / 100 * G.s * ap; if (s < .003) return;
          var dist = G.dist * Lfar * .55, r = G.size * kk / 2, cx = ox + Math.cos(G.a) * dist, cy = oy + Math.sin(G.a) * dist, gg = fx.createRadialGradient(cx, cy, 0, cx, cy, r);
          gg.addColorStop(0, crys('blue', .1)); gg.addColorStop(.48, crys('blue', .12)); gg.addColorStop(.6, crys('amber', .7)); gg.addColorStop(.67, crys('white', .6)); gg.addColorStop(.74, crys('blue', .6)); gg.addColorStop(.81, crys('violet', .5)); gg.addColorStop(.9, 'rgba(0,0,0,0)');
          fx.globalAlpha = s; fx.fillStyle = gg; fx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
        });
      }
      /* glints on the outline */
      var nG = Math.min(GL.length, Math.round(S.glints)), gs = S.glintStr / 100;
      for (var i = 0; i < nG && gs > .003; i++) {
        var G = GL[i], ia = U.easeOut(clamp((t - e0 - rr * (.4 + G.ph * .8)) / rr, 0, 1)); if (ia <= 0) continue;
        var tw = Math.pow(.5 - .5 * Math.cos(2 * Math.PI * (t * rate * G.sp + G.ph)), 3), x, y;
        if (EDGES.length) { var E = EDGES[Math.floor(G.e * EDGES.length)]; x = p + E.u * iw; y = p + E.v * ih; }
        else { x = ox + Math.cos(G.a) * G.d * Ui; y = oy + Math.sin(G.a) * G.d * Ui; }
        put(G.warm < S.warmth / 100 ? STAR_W : STAR_C, x, y, S.glintSize * k * (.45 + G.s * .9) * (.55 + .45 * tw) * 2, G.rot, gs * ia * (.15 + .85 * tw));
      }
      /* dust floating in the glow */
      var nD = Math.min(DU.length, Math.round(S.dust)), ds = S.dustStr / 100;
      for (var d = 0; d < nD && ds > .003; d++) {
        var Pd = DU[d], ib = U.easeOut(clamp((t - e0 - rr * (.6 + Pd.ph)) / rr, 0, 1)); if (ib <= 0) continue;
        var tw2 = .5 - .5 * Math.cos(2 * Math.PI * (t * rate * .7 * Pd.sp + Pd.ph));
        var dist = Pd.d * Ui * S.dustSpread * 2 * (1 + .04 * Math.sin(t * .2 + Pd.ph * 6));
        put(Pd.warm < S.warmth / 100 ? STAR_W : STAR_C, ox + Math.cos(Pd.a) * dist, oy + Math.sin(Pd.a) * dist, (5 + Pd.s * 12) * k * (.6 + .4 * tw2), 0, ds * ib * Pd.s * (.25 + .75 * tw2));
      }
    }
    ov.add({
      el: wrap, resize: resize,
      show: function () { running = true; ov.load().then(function (tex) { if (!EDGES.length && !HALO) edges(tex); }, function () {}); },
      hide: function () { running = false; fx.setTransform(1, 0, 0, 1, 0, 0); fx.clearRect(0, 0, front.width, front.height); },
      frame: frame,
    });
    seed(); resize();
    return {
      settings: S, overlay: ov,
      set: function (k, v) { if (k === 'origin') S.origin = v; else S[k] = v; if (k === 'flares' || k === 'ghosts' || k === 'seed') seed(); if (k === 'seed') { EDGES = []; HALO = null; ov.load().then(edges, function () {}); } },
      replay: function () { t = 0; },
      destroy: function () { running = false; wrap.remove(); },
    };
  }

  P.sparkle = { mount: mount, defaults: P.SPARKLE_DEFAULTS };
  P.register('sparkle', { selector: 'img[data-prism], img[data-prism-sparkle]', mount: function (el) { return mount(el); } });
})();
