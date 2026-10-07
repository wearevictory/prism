/* ════════════════════════════════════════════════════════════════════
   Prism · core
   Shared by every module: helpers, settings (with breakpoints), one
   animation loop, adaptive quality, the overlay that sits on top of an
   image, start-up, and the on-page tuner loader.
   Load this first, then any of: prism-aurora, prism-statue, prism-sparkle,
   prism-dust. (prism.min.js bundles all of them.)
   ════════════════════════════════════════════════════════════════════ */
(function () {
  if (window.Prism && window.Prism.core) return;
  var P = window.Prism = window.Prism || {};
  P.core = true;
  P.version = '3.0.1';
  var SCRIPT = (document.currentScript && document.currentScript.src) || '';

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
    idle: function (fn) { return window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 600 }) : setTimeout(fn, 1); },
    warn: function () { var a = ['Prism:']; for (var i = 0; i < arguments.length; i++) a.push(arguments[i]); console.warn.apply(console, a); },
  };
  /* pick the smallest srcset candidate that is still sharp at this size */
  U.pickSrc = function (img, cssWidth) {
    var need = cssWidth * Math.min(2, window.devicePixelRatio || 1), best = null, largest = null;
    (img.getAttribute('srcset') || '').split(',').forEach(function (part) {
      var m = part.trim().match(/^(\S+)\s+(\d+)w$/); if (!m) return;
      var c = { url: m[1], w: +m[2] };
      if (!largest || c.w > largest.w) largest = c;
      if (c.w >= need && (!best || c.w < best.w)) best = c;
    });
    return (best || largest || {}).url || img.getAttribute('data-prism-src') || img.currentSrc || img.src;
  };
  /* load a picture the GPU may read (CORS), decoded off the main thread, and scaled
     down to what will actually be drawn: smaller uploads, less GPU memory */
  U.prepare = function (url, maxSide) {
    return new Promise(function (res, rej) {
      if (!url) return rej(new Error('no image url'));
      var t = new Image(); t.crossOrigin = 'anonymous'; t.decoding = 'async';
      t.onload = function () {
        (t.decode ? t.decode() : Promise.resolve()).catch(function () {}).then(function () {
          var nw = t.naturalWidth, nh = t.naturalHeight, side = Math.max(nw, nh);
          if (!maxSide || side <= maxSide * 1.1) return res(t);
          var k = maxSide / side, c = U.cv(nw * k, nh * k), x = c.getContext('2d');
          x.imageSmoothingQuality = 'high'; x.drawImage(t, 0, 0, c.width, c.height);
          c.naturalWidth = c.width; c.naturalHeight = c.height; c.src = url;
          res(c);
        });
      };
      t.onerror = function () { U.warn('could not read the image (the host must allow CORS). The image shows without effects.', url); rej(new Error('cors')); };
      t.src = url;
    });
  };
  U.ok = function (L, C, h, a) { return U.rgba(U.oklch(L / 100, C, h), a == null ? 1 : a); };
  var isObj = U.isObj = function (v) { return v && typeof v === 'object' && !Array.isArray(v); };
  var merge = U.merge = function (target, src) { if (!isObj(src)) return target; for (var k in src) { if (isObj(src[k])) { if (!isObj(target[k])) target[k] = {}; merge(target[k], src[k]); } else target[k] = src[k]; } return target; };
  var clone = U.clone = function (o) { return JSON.parse(JSON.stringify(o)); };

  /* ── Breakpoints, matching Webflow: tablet ≤ 991px, mobile ≤ 767px ── */
  var BP = P.breakpoints = { tablet: '(max-width: 991px)', mobile: '(max-width: 767px)' };
  P.activeBreakpoints = function () { return Object.keys(BP).filter(function (k) { return window.matchMedia && matchMedia(BP[k]).matches; }); };

  /* ── Settings ────────────────────────────────────────────────────────
     One JSON block (exported by the Lab):
       <script type="application/json" data-prism-config>{ "aurora": {…}, "image": {…} }</script>
     or window.PrismConfig. Named presets plus "default". An element picks a
     preset by name and can override any value with data-prism-options='{…}'.
     Any layer can hold "tablet": {…} and "mobile": {…} for smaller screens. */
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
  var strip = function (o) { var c = clone(o || {}); delete c.tablet; delete c.mobile; return c; };
  P.layers = function (kind, preset, el) {
    var group = P.config()[kind] || {}, layers = [group['default'] || {}];
    if (preset && preset !== 'default' && preset !== 'true') {
      if (group[preset]) layers.push(group[preset]);
      else if (!WARNED[kind + preset]) { WARNED[kind + preset] = 1; U.warn('no "' + kind + '" preset called "' + preset + '"; using the default. Check the name in your settings block.'); }
    }
    var inline = el && el.getAttribute('data-prism-options');
    if (inline) { try { layers.push(JSON.parse(inline)); } catch (e) { U.warn('data-prism-options is not valid JSON', el, e); } }
    return layers;
  };
  P.resolve = function (kind, preset, el, defaults, extra) {
    var layers = P.layers(kind, preset, el).concat(extra || []), out = clone(defaults), bps = P.activeBreakpoints();
    layers.forEach(function (l) { merge(out, strip(l)); });
    bps.forEach(function (bp) { layers.forEach(function (l) { if (isObj(l[bp])) merge(out, l[bp]); }); });
    delete out.tablet; delete out.mobile;
    return out;
  };

  /* ── One loop for everything: reads first, then writes, so the page never re-lays-out twice ── */
  var reads = [], writes = [], raf = 0, last = 0;
  var perf = P.perf = { level: 0, max: 2, fps: 60, listeners: [], adaptive: true, on: function (fn) { this.listeners.push(fn); fn(this.level); } };
  var ema = 1 / 60, slow = 0, good = 0;
  function govern(dt) {
    if (!perf.adaptive || dt <= 0 || dt > .25) return;
    ema += (dt - ema) * .05; perf.fps = Math.round(1 / ema);
    if (ema > 1 / 45) { slow += dt; good = 0; } else if (ema < 1 / 57) { good += dt; slow = 0; }
    if (slow > 1.5 && perf.level < perf.max) { slow = 0; setLevel(perf.level + 1); }
    if (good > 12 && perf.level > perf.floor) { good = 0; setLevel(perf.level - 1); }
  }
  function setLevel(l) { perf.level = clamp(l, perf.floor, perf.max); perf.listeners.forEach(function (fn) { try { fn(perf.level); } catch (e) {} }); }
  perf.set = setLevel;
  /* devices that ask us to save data, or have little memory, start a step down */
  perf.floor = 0;
  if ((navigator.connection && navigator.connection.saveData) || (navigator.deviceMemory && navigator.deviceMemory < 4)) { perf.level = 1; perf.floor = 1; }
  perf.scale = function (arr) { return arr[Math.min(arr.length - 1, perf.level)]; };

  function tick(now) {
    var dt = Math.min(.05, Math.max(0, (now - last) / 1000)), raw = (now - last) / 1000; last = now;
    var i;
    for (i = 0; i < reads.length; i++) { try { reads[i](dt, now); } catch (e) { U.warn(e); } }
    for (i = 0; i < writes.length; i++) { try { writes[i](dt, now); } catch (e) { U.warn(e); } }
    govern(raw);
    raf = (reads.length || writes.length) ? requestAnimationFrame(tick) : 0;
  }
  P.loop = {
    add: function (fn, phase) {
      var list = phase === 'read' ? reads : writes;
      if (list.indexOf(fn) < 0) list.push(fn);
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
      return function () { var i = list.indexOf(fn); if (i >= 0) list.splice(i, 1); };
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
     (Dust never does: it belongs to the section.)
     The image itself is never moved or rewrapped, so Webflow layout and
     Interactions keep working: the layer follows the image's position, size
     and opacity every frame while it is on screen. */
  P.overlay = function (img, opts) {
    if (img.__prismOverlay) return img.__prismOverlay;
    var parent = img.parentElement;
    if (parent && parent.tagName === 'PICTURE') parent = parent.parentElement;
    if (!parent) throw new Error('the image needs a parent element');
    if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
    var el = document.createElement('div');
    el.className = 'prism-overlay';
    el.setAttribute('aria-hidden', 'true');
    el.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;pointer-events:none;contain:strict;z-index:' + (opts.zIndex != null ? opts.zIndex : 1);
    var anchor = img.parentElement === parent ? img : img.parentElement;
    parent.insertBefore(el, anchor.nextSibling);

    var ov = { img: img, el: el, x: NaN, y: NaN, w: 1, h: 1, pad: 0, W: 1, H: 1, padScale: opts.pad != null ? opts.pad : .3, visible: false, layers: [], texture: null };
    var fitMode = getComputedStyle(img).objectFit, next = null;
    /* read phase: measure only */
    function read() {
      var r = img.getBoundingClientRect(), pr = parent.getBoundingClientRect();
      if (!r.width || !r.height) { next = null; return; }
      var w = r.width, h = r.height, x = r.left - pr.left - parent.clientLeft + parent.scrollLeft, y = r.top - pr.top - parent.clientTop + parent.scrollTop;
      var nw = img.naturalWidth, nh = img.naturalHeight;
      if (nw && nh && (fitMode === 'contain' || fitMode === 'scale-down')) { var s = Math.min(w / nw, h / nh), cw = nw * s, ch = nh * s; x += (w - cw) / 2; y += (h - ch) / 2; w = cw; h = ch; }
      next = { x: x, y: y, w: w, h: h, o: getComputedStyle(img).opacity };
    }
    /* write phase: apply, then let the layers draw */
    function write(dt, now) {
      if (!next) return;
      var n = next, p = Math.round(n.h * ov.padScale);
      if (Math.abs(n.w - ov.w) > .5 || Math.abs(n.h - ov.h) > .5 || p !== ov.pad) { ov.w = n.w; ov.h = n.h; ov.pad = p; ov.W = n.w + 2 * p; ov.H = n.h + 2 * p; el.style.width = ov.W + 'px'; el.style.height = ov.H + 'px'; ov.layers.forEach(function (l) { if (l.resize) l.resize(); }); }
      if (!(Math.abs(n.x - ov.x) <= .25 && Math.abs(n.y - ov.y) <= .25) || p !== ov._p) { ov.x = n.x; ov.y = n.y; ov._p = p; el.style.transform = 'translate3d(' + (n.x - p) + 'px,' + (n.y - p) + 'px,0)'; }
      if (n.o !== ov._o) { el.style.opacity = n.o; ov._o = n.o; }
      for (var i = 0; i < ov.layers.length; i++) if (ov.layers[i].frame) ov.layers[i].frame(dt, now);
    }
    ov.measure = function () { read(); write(0, performance.now()); return !!next; };
    /* a CORS-readable copy of the picture: the GPU and the edge finder can only read images the host allows */
    var cache = {}, order = [];
    var side = function () { return Math.ceil(Math.max(ov.w, ov.h, img.clientWidth, img.clientHeight, 64) * Math.min(2, window.devicePixelRatio || 1)); };
    /* any picture for this image, prepared once and kept for the last few used */
    ov.fetch = function (url) {
      if (!cache[url]) { cache[url] = U.prepare(url, side()); order.push(url); }
      if (order.length > 4) { var i = order.findIndex(function (u) { return u !== ov.current && u !== url; }); if (i >= 0) delete cache[order.splice(i, 1)[0]]; }
      return cache[url];
    };
    ov.current = null;
    /* reuse the file the browser already chose for this screen, so nothing downloads twice */
    ov.load = function () { if (!ov.texture) { ov.current = ov.current || img.getAttribute('data-prism-src') || img.currentSrc || U.pickSrc(img, img.clientWidth || 600); ov.texture = ov.fetch(ov.current); } return ov.texture; };
    /* follow the image only while it is on screen and at least one layer is awake.
       A layer marks itself asleep with layer.idle = true, then calls ov.sync(). */
    var stopR = null, stopW = null;
    ov.sync = function () {
      var awake = ov.visible && ov.layers.some(function (l) { return !l.idle; });
      if (awake && !stopR) { ov.measure(); stopR = P.loop.add(read, 'read'); stopW = P.loop.add(write, 'write'); }
      if (!awake && stopR) { stopR(); stopW(); stopR = stopW = null; }
    };
    ov.add = function (layer) { ov.layers.push(layer); el.appendChild(layer.el); if (ov.visible && layer.show) layer.show(); ov.sync(); };
    ov.remove = function (layer) { var i = ov.layers.indexOf(layer); if (i >= 0) ov.layers.splice(i, 1); if (layer.hide) layer.hide(); if (layer.el && layer.el.parentNode) layer.el.parentNode.removeChild(layer.el); ov.sync(); };
    P.watch(img, function (on) {
      ov.visible = on;
      ov.layers.forEach(function (l) { var f = on ? l.show : l.hide; if (f) f(); });
      ov.sync();
    }, opts.margin || '30% 0px');
    if (!img.complete) img.addEventListener('load', function () { fitMode = getComputedStyle(img).objectFit; ov.measure(); }, { once: true });
    img.__prismOverlay = ov;
    return ov;
  };

  /* ── Modules, start-up, live re-configuration ────────────────────── */
  var mods = {}, booted = false, all = [];
  function scan(only) {
    Object.keys(mods).forEach(function (name) {
      if (only && name !== only) return;
      var m = mods[name], list = document.querySelectorAll(m.selector);
      for (var i = 0; i < list.length; i++) {
        var el = list[i];
        if (el.hasAttribute('data-prism-manual')) continue;
        el.__prism = el.__prism || {};
        if (el.__prism[name] !== undefined) continue;
        try { var inst = el.__prism[name] = m.mount(el) || null; if (inst) all.push({ el: el, name: name, inst: inst }); }
        catch (e) { el.__prism[name] = null; U.warn(name + ' could not start on', el, e); }
      }
    });
  }
  P.register = function (name, mod) { mods[name] = mod; if (booted) scan(name); };
  /* call after adding content later (CMS lists, tabs, sliders) */
  P.refresh = function () { scan(); };
  /* start one module by hand on an element, with an optional settings object */
  P.mount = function (name, el, settings) {
    if (!mods[name]) throw new Error('module "' + name + '" is not loaded');
    el.__prism = el.__prism || {};
    var inst = el.__prism[name] = mods[name].mount(el, settings);
    if (inst) all.push({ el: el, name: name, inst: inst });
    return inst;
  };
  P.get = function (el, name) { return el && el.__prism ? el.__prism[name] : undefined; };
  P.instances = function () { all = all.filter(function (r) { return r.el.__prism && r.el.__prism[r.name] === r.inst; }); return all.slice(); };
  /* re-read settings (after editing the block, or crossing a breakpoint) and apply them live */
  P.reconfigure = function () { P.config(true); P.instances().forEach(function (r) { if (r.inst.reconfigure) try { r.inst.reconfigure(); } catch (e) { U.warn(e); } }); };
  if (window.matchMedia) Object.keys(BP).forEach(function (k) { var mq = matchMedia(BP[k]), fn = function () { P.reconfigure(); }; if (mq.addEventListener) mq.addEventListener('change', fn); else if (mq.addListener) mq.addListener(fn); });

  /* the on-page tuner never ships to visitors: it loads only with ?prism-tune in the URL */
  P.tune = function () {
    if (P.tuner) return P.tuner.open();
    /* find where the library came from (works with or without defer, and with async loaders) */
    var from = SCRIPT;
    if (!from) [].forEach.call(document.scripts, function (sc) { if (/\/prism(-core)?(\.min)?\.js(\?|$)/.test(sc.src)) from = sc.src; });
    var src = from ? from.replace(/[^/?]*(\?.*)?$/, 'prism-tuner.min.js') : '';
    if (!src) { U.warn('cannot find where the library was loaded from; load prism-tuner.min.js yourself'); return; }
    var s = document.createElement('script'); s.src = src; s.defer = true; document.head.appendChild(s);
  };
  function boot() {
    booted = true; P.config(true);
    var pc = P.config().performance; if (isObj(pc)) { if (pc.adaptive === false) perf.adaptive = false; if (pc.level != null) setLevel(pc.level); }
    scan();
    try { if (/[?&]prism-tune\b/.test(location.search) || sessionStorage.getItem('prism-tune') === '1') { sessionStorage.setItem('prism-tune', '1'); P.tune(); } } catch (e) {}
  }
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
    fps: 30,              // the turn is slow; 30 frames a second is plenty
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
    var manual = !!settings, S = settings || P.resolve('aurora', section.getAttribute('data-prism-aurora'), section, P.AURORA_DEFAULTS);
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
      scale = U.clamp(S.resolution * P.perf.scale([1, .8, .6]), .2, 2) * Math.min(1.25, U.dpr());
      canvas.width = Math.round(W * scale); canvas.height = Math.round(H * scale);
      clearTimeout(resize.t); resize.t = setTimeout(paint, 120);
      if (!TEX) paint();
    }
    var acc = 0;
    function draw(dt) {
      acc += dt; if (S.fps && acc < 1 / S.fps - .004) return; dt = acc; acc = 0;
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
    P.perf.on(function () { if (W > 1) resize(); });
    var unwatch = P.watch(section, function (on) {
      if (on && !stop) stop = P.loop.add(draw);
      if (!on && stop) { stop(); stop = null; }
    }, '10% 0px');

    var api = {
      settings: S, element: layer, kind: 'aurora',
      defaults: P.AURORA_DEFAULTS,
      /* re-read the settings block (and breakpoints) and apply every value */
      reconfigure: function (next) {
        if (manual && !next) return;
        next = next || P.resolve('aurora', section.getAttribute('data-prism-aurora'), section, P.AURORA_DEFAULTS);
        for (var k in next) if (JSON.stringify(next[k]) !== JSON.stringify(S[k])) api.set(k, next[k]);
      },
      set: function (k, v) {
        S[k] = v;
        if (k === 'blobs' || k === 'seed') blobs();
        if (k === 'resolution') resize();
        else if (/^(bg|blob)/.test(k) && k !== 'bgInt' && k !== 'bgDrift' && k !== 'bgSweep') { clearTimeout(api._p); api._p = setTimeout(paint, 60); }
      },
      replay: function () { t = 0; },
      destroy: function () { if (stop) stop(); unwatch(); ro.disconnect(); layer.remove(); if (section.__prism) section.__prism.aurora = undefined; },
    };
    return api;
  }

  P.aurora = { mount: mount, defaults: P.AURORA_DEFAULTS };
  P.register('aurora', { selector: '[data-prism-aurora]', mount: function (el, s) { return mount(el, s); } });
})();
/* ════════════════════════════════════════════════════════════════════
   Prism · Statue
   Liquid metal light on a transparent cutout, on the GPU.
   Mark an image:  data-prism="liberty"          (statue + sparkle, from the "liberty" preset)
                   data-prism-statue="liberty"   (statue only)

   Where the cursor rests (or a finger taps), the glass comes alive: the
   picture bends through a rounded glass surface, splits into colour, and
   catches spectral highlights. At rest it draws one still frame and stops,
   apart from an occasional faint hint that the image is interactive.

   The glass surface is built from the cutout's own outline and shading,
   so no depth map is needed.

   Modes: "replace" (default) draws the whole picture on the GPU and hides the
          original once the first frame is ready. "overlay" keeps the real
          image showing and only adds light on top (no refraction).
   ════════════════════════════════════════════════════════════════════ */
(function () {
  var P = window.Prism;
  if (!P || !P.core) { console.warn('Prism: load prism-core before prism-statue'); return; }
  var U = P.util;

  /* ════ The renderer: one canvas, one GPU context, one shader pass ════ */
  var createShader = (function () {
    var VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
    var FS = [
'precision highp float;',
'uniform vec2 uRes;uniform vec4 uFit;uniform vec2 uTexel;uniform sampler2D uImg;uniform sampler2D uRamp;uniform sampler2D uSurf;',
'uniform float uTime,uDpr,uLight,uTint,uClarity,uSpeed,uFlow,uFlowScale,uAngle,uScale,uSharp,uFollow,uDisp,uHue,uThresh,uSoft,uEdge,uGlitter,uGSize,uTwinkle,uGrain,uDebug,uOverlay;',
'uniform vec4 uPtr;   /* xy: light over the image, canvas px. z: height, px. w: strength 0-1 */',
'uniform vec4 uPool;  /* radius px, shimmer outside the pool, wrap, rainbow boost */',
'uniform vec4 uGlass; /* rounded edges, folds, liquid, ripple size */',
'uniform vec4 uRefr;  /* thickness px, colour split, highlights, polish */',
'uniform vec4 uRefl;  /* edge sheen, iridescence */',
'vec3 m289(vec3 x){return x-floor(x*(1./289.))*289.;}vec2 m289(vec2 x){return x-floor(x*(1./289.))*289.;}vec3 perm(vec3 x){return m289(((x*34.)+1.)*x);}',
'float sn(vec2 v){const vec4 C=vec4(.211324865405187,.366025403784439,-.577350269189626,.024390243902439);vec2 i=floor(v+dot(v,C.yy));vec2 x0=v-i+dot(i,C.xx);vec2 i1=(x0.x>x0.y)?vec2(1.,0.):vec2(0.,1.);vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=m289(i);vec3 p=perm(perm(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);m=m*m;m=m*m;vec3 x=2.*fract(p*C.www)-1.;vec3 h=abs(x)-.5;vec3 ox=floor(x+.5);vec3 a0=x-ox;m*=1.79284291400159-.85373472095314*(a0*a0+h*h);vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;return 130.*dot(m,g);}',
'float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<3;i++){s+=a*sn(p);p=p*2.03+vec2(17.1,9.7);a*=.5;}return s;}',
'float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}',
/* gradient noise with its analytic slope: liquid normals without derivative extensions or extra noise calls */
'vec2 h22(vec2 p){p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));return -1.+2.*fract(sin(p)*43758.5453);}',
'vec3 noised(vec2 x){vec2 i=floor(x),f=fract(x);vec2 u=f*f*f*(f*(f*6.-15.)+10.);vec2 du=30.*f*f*(f*(f-2.)+1.);',
' vec2 ga=h22(i),gb=h22(i+vec2(1.,0.)),gc=h22(i+vec2(0.,1.)),gd=h22(i+vec2(1.,1.));',
' float va=dot(ga,f),vb=dot(gb,f-vec2(1.,0.)),vc=dot(gc,f-vec2(0.,1.)),vd=dot(gd,f-vec2(1.,1.));',
' return vec3(va+u.x*(vb-va)+u.y*(vc-va)+u.x*u.y*(va-vb-vc+vd),ga+u.x*(gb-ga)+u.y*(gc-ga)+u.x*u.y*(ga-gb-gc+gd)+du*(u.yx*(va-vb-vc+vd)+vec2(vb,vc)-va));}',
'float L(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}',
'float box(vec2 u){return step(0.,u.x)*step(u.x,1.)*step(0.,u.y)*step(u.y,1.);}',
'vec4 T(vec2 px){vec2 u=(px-uFit.xy)/uFit.zw;return texture2D(uImg,clamp(u,0.,1.))*box(u);}',
'vec3 ramp(float x){return texture2D(uRamp,vec2(fract(x),.5)).rgb;}',
'float band(float x){return pow(.5+.5*cos(6.2831853*x),uSharp);}',
'void main(){',
' vec2 pix=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);',
' vec4 c0=T(pix);float A=c0.a;vec3 base=c0.rgb;',
' vec3 light=vec3(0.),tinted=vec3(0.),refl=vec3(0.),N=vec3(0.,0.,1.);float lum=0.,warp=0.,t=uTime;',
/* the light pool: everywhere, so glitter can use it too */
' vec2 dp=uPtr.xy-pix;float pk=clamp(1.-length(dp)/max(uPool.x,1.),0.,1.);',
' float fall=uPtr.w*pk*pk*(3.-2.*pk);',
' float g=mix(uPool.y,1.,fall);',
' if(A>.003){',
'  vec4 sf=texture2D(uSurf,(pix-uFit.xy)/uFit.zw)*2.-1.;',
'  vec2 o=vec2(uFit.z*uTexel.x,uFit.w*uTexel.y)*1.25;',
'  vec3 n1=T(pix+vec2(o.x,0.)).rgb,n2=T(pix-vec2(o.x,0.)).rgb,n3=T(pix+vec2(0.,o.y)).rgb,n4=T(pix-vec2(0.,o.y)).rgb;',
'  vec3 detail=(base-(n1+n2+n3+n4)*.25)*uClarity*1.6;',
'  float gx=L(n1)-L(n2),gy=L(n3)-L(n4);',
'  float edge=clamp(length(vec2(gx,gy))*3.5,0.,1.);',
'  vec2 p=pix/uRes.y;vec2 dir=vec2(cos(uAngle),sin(uAngle));vec2 q=p*uFlowScale;',
'  vec2 w=vec2(fbm(q+vec2(0.,t*.13)),fbm(q+vec2(5.2,1.3)-vec2(t*.11,0.)));',
'  warp=fbm(q+1.7*w+vec2(t*.08,-t*.06));',
/* surface: rounded outline + the picture's own shading + liquid ripple */
'  vec2 tilt=sf.rg*uGlass.x+(sf.ba+vec2(gx,gy)*.6)*uGlass.y;',
'  if(uGlass.z>.001){vec2 lq=q*uGlass.w+warp*.9+vec2(t*.05,-t*.04);tilt+=(noised(lq).yz+noised(lq*2.07+vec2(3.1,7.7)).yz*.5)*uGlass.z*.35;}',
'  N=normalize(vec3(-tilt,1.));',
/* refraction bends through the smooth surface only (outline + ripple), so fine detail like the eyes never ghosts */
'  vec3 Nr=normalize(vec3(-(sf.rg*uGlass.x+sf.ba*uGlass.y*.2+(tilt-sf.rg*uGlass.x-(sf.ba+vec2(gx,gy)*.6)*uGlass.y)),1.));',
/* refraction: sample through the tilted glass, red and blue bent by different amounts */
'  vec3 refr=c0.rgb;',
'  if(fall>.002&&uRefr.x>0.){',
'   vec2 off=Nr.xy*uRefr.x*fall;float ia=1./max(A,.01);',
'   vec4 sr=T(pix+off*(1.-uRefr.y)),sg=T(pix+off),sb=T(pix+off*(1.+uRefr.y));',
'   refr=vec3(sr.a>.02?sr.r/sr.a:c0.r*ia,sg.a>.02?sg.g/sg.a:c0.g*ia,sb.a>.02?sb.b/sb.a:c0.b*ia)*A;',
'  }',
'  base=max(refr+detail,0.);',
'  lum=L(base);',
'  vec3 Ld=normalize(vec3(dp,uPtr.z));float ndl=max(dot(N,Ld),0.);',
'  float ph=dot(p,dir)*uScale+warp*uFlow+lum*uFollow+dot(N.xy,dir)*uPool.z-t*uSpeed;',
'  float d=uDisp*.06*(1.+fall*uPool.w);',
'  float hue=ph*.31+warp*.35+t*.015+uHue;',
'  vec3 lt=vec3(ramp(hue-d*2.).r*band(ph-d),ramp(hue).g*band(ph),ramp(hue+d*2.).b*band(ph+d));',
'  float hl=smoothstep(uThresh,uThresh+uSoft,lum);',
'  float m=clamp(hl+edge*uEdge,0.,1.)*A;',
'  light=lt*m*uLight*g*mix(1.,.55+.6*ndl,fall);',
'  tinted=ramp(lum*.6+warp*.15+uHue)*lum*1.35;',
/* reflections: spectral highlight + soft coloured sheen on curved edges, only in the pool */
'  vec3 H=normalize(Ld+vec3(0.,0.,1.));',
'  float sp=pow(max(dot(N,H),0.),uRefr.w)*(.2+.8*smoothstep(.06,.35,length(N.xy)));',  /* highlights live on curves and folds, not flat areas */
'  vec3 irid=ramp(dot(N,Ld)*uRefl.y+dot(N.xy,dir)*.5+uHue+t*.01);',
'  float rim=smoothstep(.12,.8,length(N.xy));',
'  vec3 sheen=ramp(N.x*.35-N.y*.25+.15+uHue+warp*.1);',
'  refl=(irid*sp*uRefr.z*(.35+.65*hl)+sheen*rim*uRefl.x*.6)*fall*A;',
' }',
' if(uDebug>.5){',
'  if(uDebug<1.5)gl_FragColor=vec4((N*.5+.5)*A,A);',
'  else gl_FragColor=vec4(mix(base*.35,vec3(1.,.78,.32)*A,fall*.85),A);',
'  return;',
' }',
' vec3 col=mix(base,max(base,tinted*A),uTint);',
' col=1.-(1.-col)*(1.-clamp(light,0.,1.));',
' col+=light*light*.35+refl;',
' vec3 gl=vec3(0.);',
' if(uGlitter>0.001&&g>.002){',
'  float cs=uGSize*uDpr;vec2 gc=floor(pix/cs);',
'  for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){',
'   vec2 c=gc+vec2(float(i),float(j));float h=h21(c);',
'   if(h>uGlitter*.4)continue;',
'   vec2 ctr=(c+vec2(h21(c+3.1),h21(c+7.7)))*cs;',
'   float gate=smoothstep(uThresh+.05,uThresh+.35,L(T(ctr).rgb));',
'   float tw=.5+.5*sin(t*6.2831853*uTwinkle*(.55+.45*h21(c+1.3))+h21(c+9.1)*6.2831853);tw=tw*tw*tw*tw*tw*tw;',
'   vec2 dd=pix-ctr;float r=cs*(.45+.6*h21(c+4.4));',
'   float st=exp(-abs(dd.x)/(r*.045))*exp(-abs(dd.y)/r)+exp(-abs(dd.y)/(r*.045))*exp(-abs(dd.x)/r);',
'   float core=exp(-dot(dd,dd)/(r*r*.012));',
'   gl+=mix(vec3(1.,.97,.92),ramp(h21(c+2.)),.5)*(st*.55+core)*tw*gate;',
'  }',
' }',
' col+=gl*1.1*g;',
' if(uOverlay>.5){',
'  vec3 add=clamp(light+light*light*.35+refl+gl*1.1*g+max(tinted*A-base,0.)*uTint*.6,0.,1.);',
'  gl_FragColor=vec4(add,max(add.r,max(add.g,add.b)));return;',
' }',
' col+=(h21(pix+fract(t*7.)*91.)-.5)*uGrain*A;',
' col=clamp(col/(1.+max(col-1.,0.)*.6),0.,1.);',
' gl_FragColor=vec4(col,max(A,max(col.r,max(col.g,col.b))));',
'}'].join('\n');


    var PALETTES = {
      prism: { name: 'Prism', stops: ['#FEFBF6', '#FFD175', '#F5A461', '#FFD175', '#FFF4E4', '#B86DFD', '#7363F8', '#487EF7', '#50E4FF', '#F2FBFF'] },
      diamond: { name: 'Diamond fire', stops: ['#FFF7EC', '#FFD27A', '#FF9A4A', '#FF6FAE', '#9B6BFF', '#4D7BFF', '#6FE6FF', '#EAF8FF'] },
      crystal: { name: 'Crystal', stops: ['#FFFFFF', '#FFE7BF', '#E9A84A', '#FFD27A', '#9AA6FF', '#5A68E8', '#DCE2FF'] },
      shard: { name: 'Shard', stops: ['#FFF1D8', '#EAB84F', '#C97632', '#4A35B8', '#1C4297', '#6E8BFF', '#FFF6EA'] },
      champagne: { name: 'Champagne', stops: ['#FFFFFF', '#FFF0D2', '#F2C98A', '#F7B7A3', '#D9C4FF', '#FFFFFF'] },
      thermal: { name: 'Thermal', stops: ['#00166D', '#00AAFF', '#FFCB5C', '#FF4400', '#F384FF', '#FFFFFF'] }
    };
    function hex(h) { return [parseInt(h.substr(1, 2), 16) / 255, parseInt(h.substr(3, 2), 16) / 255, parseInt(h.substr(5, 2), 16) / 255]; }
    function lin(c) { return c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); }
    function gam(c) { c = Math.max(0, Math.min(1, c)); return c <= .0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - .055; }
    function toLab(rgb) { var r = lin(rgb[0]), g = lin(rgb[1]), b = lin(rgb[2]);
      var l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b), m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b), s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
      return [.2104542553 * l + .793617785 * m - .0040720468 * s, 1.9779984951 * l - 2.428592205 * m + .4505937099 * s, .0259040371 * l + .7827717662 * m - .808675766 * s]; }
    function fromLab(c) { var l = c[0] + .3963377774 * c[1] + .2158037573 * c[2], m = c[0] - .1055613458 * c[1] - .0638541728 * c[2], s = c[0] - .0894841775 * c[1] - 1.291485548 * c[2]; l *= l * l; m *= m * m; s *= s * s;
      return [gam(4.0767416621 * l - 3.3077115913 * m + .2309699292 * s), gam(-1.2684380046 * l + 2.6097574011 * m - .3413193965 * s), gam(-.0041960863 * l - .7034186147 * m + 1.707614701 * s)]; }
    function rampData(stops) { var labs = stops.map(function (h) { return toLab(hex(h)); }), n = labs.length, out = new Uint8Array(256 * 4);
      for (var i = 0; i < 256; i++) { var x = i / 256 * n, k = Math.floor(x), f = x - k, a = labs[k % n], b = labs[(k + 1) % n]; f = f * f * (3 - 2 * f);
        var c = fromLab([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]); out[i * 4] = c[0] * 255; out[i * 4 + 1] = c[1] * 255; out[i * 4 + 2] = c[2] * 255; out[i * 4 + 3] = 255; }
      return out; }
    var UNIFORMS = ['uRes', 'uFit', 'uTexel', 'uImg', 'uRamp', 'uSurf', 'uTime', 'uDpr', 'uLight', 'uTint', 'uClarity', 'uSpeed', 'uFlow', 'uFlowScale', 'uAngle', 'uScale', 'uSharp', 'uFollow', 'uDisp', 'uHue', 'uThresh', 'uSoft', 'uEdge', 'uGlitter', 'uGSize', 'uTwinkle', 'uGrain', 'uDebug', 'uOverlay', 'uPtr', 'uPool', 'uGlass', 'uRefr', 'uRefl'];
    var NOPTR = { x: .5, y: .4, s: 0, hint: false, amb: 1 };
    var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };

    /* opts: overlay, fit(), ptr (live object), step(dt, now), moving(), fpsCap(), onIdle(now),
             onFirstFrame, onLost, onError, reduce */
    function create(canvas, image, settings, opts) {
      opts = opts || {};
      var S = {}, k; for (k in settings) S[k] = settings[k];
      var gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: true, alpha: true, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
      if (!gl || gl.isContextLost()) { if (opts.onError) opts.onError(); return null; }
      var dead = false;
      var onLost = function (e) { e.preventDefault(); if (raf) cancelAnimationFrame(raf); raf = 0; var was = dead; dead = true; if (ro) ro.disconnect(); if (!was && opts.onLost) opts.onLost(); };
      canvas.addEventListener('webglcontextlost', onLost);
      function sh(t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; }
      var pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
      gl.useProgram(pr);
      var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      var al = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(al); gl.vertexAttribPointer(al, 2, gl.FLOAT, false, 0, 0);
      var u = {}; UNIFORMS.forEach(function (n) { u[n] = gl.getUniformLocation(pr, n); });
      function tex(unit, wrapS) { gl.activeTexture(unit); var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; }
      var tImg = tex(gl.TEXTURE0, gl.CLAMP_TO_EDGE), tRamp = tex(gl.TEXTURE1, gl.REPEAT), tSurf = tex(gl.TEXTURE2, gl.CLAMP_TO_EDGE);
      gl.uniform1i(u.uImg, 0); gl.uniform1i(u.uRamp, 1); gl.uniform1i(u.uSurf, 2);
      /* a flat surface until the real one is built in idle time */
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([128, 128, 128, 128]));
      var iw = 1, ih = 1;
      function setImage(im) { iw = im.naturalWidth || im.width; ih = im.naturalHeight || im.height; gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tImg);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); }
      function setSurface(sf) { if (!sf) return; gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, tSurf); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, sf.w, sf.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, sf.data); }
      function setPalette() { var p = PALETTES[S.palette] || PALETTES.champagne; gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tRamp); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, rampData(p.stops)); }
      function contain(bx, by, bw, bh, tw, th) { var s = Math.min(bw / tw, bh / th), w = tw * s, h = th * s; return [bx + (bw - w) / 2, by + (bh - h) / 2, w, h]; }
      setImage(image); setPalette();

      var W = 1, H = 1, dpr = 1;
      function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, S.quality);
        var w = canvas.clientWidth, h = canvas.clientHeight;   // layout size: ignores CSS transforms on ancestors
        W = Math.max(1, Math.round(w * dpr)); H = Math.max(1, Math.round(h * dpr));
        if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
        wake();                                                 // resizing clears the canvas: always redraw
      }
      var ro = window.ResizeObserver ? new ResizeObserver(resize) : null; if (ro) ro.observe(canvas); else window.addEventListener('resize', resize);

      /* drawing on demand: frames only while something moves, then one still frame and stop */
      var clock = 0, last = performance.now(), acc = 0, raf = 0, dirty = true, paused = false, frames = 0, fpsT = last;
      function frame(now) {
        raf = 0; if (dead) return;
        var dt = Math.min(.1, Math.max(0, (now - last) / 1000)); last = now; acc += dt;
        var cap = opts.fpsCap ? opts.fpsCap() : S.fps;
        if (!dirty && cap && acc < 1 / cap - .004) { raf = requestAnimationFrame(frame); return; }
        var step = acc; acc = 0;
        if (!paused && opts.step) opts.step(step, now);
        var moving = !paused && (opts.moving ? opts.moving() : true);
        if (moving && !opts.reduce) clock += step;
        draw(); dirty = false;
        frames++; if (opts.onFps && now - fpsT > 1000) { opts.onFps(Math.round(frames * 1000 / (now - fpsT))); frames = 0; fpsT = now; }
        if (moving) raf = requestAnimationFrame(frame); else if (opts.onIdle) opts.onIdle(now);
      }
      function draw() {
        if (gl.isContextLost()) return;
        var B; if (opts.fit) { var F = opts.fit(); if (!F) return; B = [F[0] * dpr, F[1] * dpr, F[2] * dpr, F[3] * dpr]; } else B = [0, 0, W, H];
        var FA = contain(B[0], B[1], B[2], B[3], iw, ih), L = opts.ptr || NOPTR, c = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
        gl.viewport(0, 0, W, H);
        gl.uniform2f(u.uRes, W, H); gl.uniform4f(u.uFit, FA[0], FA[1], FA[2], FA[3]); gl.uniform2f(u.uTexel, 1 / iw, 1 / ih);
        gl.uniform1f(u.uTime, clock); gl.uniform1f(u.uDpr, dpr);
        gl.uniform1f(u.uLight, S.light); gl.uniform1f(u.uTint, S.tint); gl.uniform1f(u.uClarity, S.clarity);
        gl.uniform1f(u.uSpeed, c(S.speed, 0, 1)); gl.uniform1f(u.uFlow, S.flow); gl.uniform1f(u.uFlowScale, S.flowScale);
        gl.uniform1f(u.uAngle, S.angle * Math.PI / 180); gl.uniform1f(u.uScale, S.scale); gl.uniform1f(u.uSharp, S.sharp); gl.uniform1f(u.uFollow, S.follow);
        gl.uniform1f(u.uDisp, S.disp); gl.uniform1f(u.uHue, S.hue); gl.uniform1f(u.uThresh, S.thresh); gl.uniform1f(u.uSoft, Math.max(.01, S.soft)); gl.uniform1f(u.uEdge, S.edge);
        gl.uniform1f(u.uGlitter, S.glitter); gl.uniform1f(u.uGSize, S.gsize); gl.uniform1f(u.uTwinkle, opts.reduce ? 0 : c(S.twinkle, 0, 1.5)); gl.uniform1f(u.uGrain, S.grain);
        gl.uniform1f(u.uOverlay, opts.overlay ? 1 : 0); gl.uniform1f(u.uDebug, S.view === 'surface' ? 1 : S.view === 'pool' ? 2 : 0);
        var R = S.radius * Math.max(FA[2], FA[3]) * (L.hint ? 1 : .35 + .65 * easeOut(Math.min(1, L.s)));
        gl.uniform4f(u.uPtr, FA[0] + L.x * FA[2], FA[1] + L.y * FA[3], S.elevation * FA[3], L.s);
        gl.uniform4f(u.uPool, R, L.amb == null ? 1 : L.amb, S.wrap, S.poolDisp);
        gl.uniform4f(u.uGlass, S.shape, S.folds, S.liquid, S.liquidScale);
        gl.uniform4f(u.uRefr, opts.overlay ? 0 : S.thickness * FA[3], S.spread, S.spec, S.shine);
        gl.uniform4f(u.uRefl, S.sheen, S.irid, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        if (opts.onFirstFrame && !opts.__done) { opts.__done = 1; opts.onFirstFrame(); }
      }
      function wake() { dirty = true; if (!raf && !dead) { last = performance.now(); acc = 0; raf = requestAnimationFrame(frame); } }
      resize();
      return {
        destroy: function () { dead = true; if (raf) cancelAnimationFrame(raf); raf = 0; if (ro) ro.disconnect(); canvas.removeEventListener('webglcontextlost', onLost); var x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); },
        settings: S,
        set: function (k, v) { S[k] = v; if (k === 'palette') setPalette(); if (k === 'quality') resize(); wake(); },
        setImage: function (im) { setImage(im); wake(); },
        setSurface: function (sf) { setSurface(sf); wake(); },
        canvas: canvas,
        pause: function (p) { paused = p; wake(); },
        isPaused: function () { return paused; },
        wake: wake,
        drawing: function () { return !!raf; }
      };
    }
    create.PALETTES = PALETTES;
    return create;
  })();

  /* ════ Glass surface, built once per image on the CPU from the cutout itself ════
     rg: slope of the blurred outline (the rounded glass edge)
     ba: slope of the picture's own shading (folds, hair, facets)
     Slopes are computed in floats, then stored, so there is no 8-bit stepping. */
  function blur3(src, w, h, r) {
    r = Math.max(1, Math.round(r)); var a = src, b = new Float32Array(w * h), n = 2 * r + 1, x, y, i, row, acc;
    for (var pass = 0; pass < 3; pass++) {
      for (y = 0; y < h; y++) { row = y * w; acc = 0; for (i = -r; i <= r; i++) acc += a[row + Math.min(w - 1, Math.max(0, i))];
        for (x = 0; x < w; x++) { b[row + x] = acc / n; acc += a[row + Math.min(w - 1, x + r + 1)] - a[row + Math.max(0, x - r)]; } }
      for (x = 0; x < w; x++) { acc = 0; for (i = -r; i <= r; i++) acc += b[Math.min(h - 1, Math.max(0, i)) * w + x];
        for (y = 0; y < h; y++) { a[y * w + x] = acc / n; acc += b[Math.min(h - 1, y + r + 1) * w + x] - b[Math.max(0, y - r) * w + x]; } }
    }
    return a;
  }
  function buildSurface(im, bevel) {
    var iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height, k = Math.min(1, 512 / Math.max(iw, ih));
    var w = Math.max(8, Math.round(iw * k)), h = Math.max(8, Math.round(ih * k)), c = U.cv(w, h), x = c.getContext('2d', { willReadFrequently: true });
    x.imageSmoothingQuality = 'high'; x.drawImage(im, 0, 0, w, h);
    var px = x.getImageData(0, 0, w, h).data, N = w * h, alpha = new Float32Array(N), lum = new Float32Array(N), i;
    for (i = 0; i < N; i++) { var a = px[i * 4 + 3] / 255; alpha[i] = a; lum[i] = ((.2126 * px[i * 4] + .7152 * px[i * 4 + 1] + .0722 * px[i * 4 + 2]) / 255) * a + .5 * (1 - a); }
    var rb = Math.max(1, bevel * Math.max(w, h)), hgt = blur3(alpha, w, h, rb), sh = blur3(lum, w, h, 1.5);
    var out = new Uint8Array(N * 4), cl = function (v) { return Math.max(-1, Math.min(1, v)); };
    for (var yy = 0; yy < h; yy++) for (var xx = 0; xx < w; xx++) {
      i = yy * w + xx; var l = yy * w + Math.max(0, xx - 1), r = yy * w + Math.min(w - 1, xx + 1), up = Math.max(0, yy - 1) * w + xx, dn = Math.min(h - 1, yy + 1) * w + xx;
      out[i * 4] = 127.5 + 127.5 * cl((hgt[r] - hgt[l]) * rb); out[i * 4 + 1] = 127.5 + 127.5 * cl((hgt[dn] - hgt[up]) * rb);
      out[i * 4 + 2] = 127.5 + 127.5 * cl((sh[r] - sh[l]) * 3); out[i * 4 + 3] = 127.5 + 127.5 * cl((sh[dn] - sh[up]) * 3);
    }
    return { data: out, w: w, h: h };
  }

  /* ════ Settings ════ */
  P.STATUE_DEFAULTS = {
    mode: 'replace',
    /* the look: Liquid metal */
    palette: 'champagne', light: 1, tint: .25, clarity: .4, speed: .14, flow: .1, flowScale: 3, angle: -35, scale: 2.1, sharp: 2.6,
    follow: .55, disp: .45, hue: 0, thresh: .32, soft: .38, edge: 1.24, glitter: .15, gsize: 20, twinkle: .7, grain: 0,
    /* the light pool under the pointer */
    radius: .5, elevation: .75, idleLight: 0, wrap: .8, poolDisp: 1.5,
    /* the glass surface */
    shape: .04, bevel: .04, folds: .5, liquid: .15, liquidScale: .4,
    /* refraction and reflections */
    thickness: .004, spread: .25, spec: .8, shine: 30, irid: .6, sheen: .6,
    /* interaction */
    pointer: true,        // the light follows the cursor, or lands where a finger taps
    lag: 140,             // ms the light trails the pointer
    easeIn: .75, easeOut: .5,   // s to come alive and to settle; never faster than 0.15
    idle: 'hint',         // nobody interacting: 'still' | 'hint' | 'drift' | 'live'
    touchHold: 3.5,       // s the light stays after a tap
    touchDrag: true,      // a sideways finger drag moves the light (vertical scroll still works)
    hintStyle: 'sweep', hintEvery: 3, hintDur: 2, hintStrength: .6, hintRepeat: 'once',
    /* drawing */
    quality: 1.5,
    fps: 30,              // cap for hints, drift and live shimmer
    pointerFps: 60,       // cap while someone is interacting
    maxPixels: 1200000,   // per image: sharpness is capped so a large image never draws more than this
    view: 'final'         // 'final' | 'surface' | 'pool': diagnostic views for tuning
  };
  /* the Lab exports interaction under "reveal"; those values are read too (statue wins) */
  var FROM_REVEAL = { pointer: 'pointer', lag: 'lag', easeIn: 'easeIn', easeOut: 'easeOut', idle: 'idle', touchHold: 'touchHold', touchDrag: 'touchDrag',
    pointerFps: 'fps', hintStyle: 'hintStyle', hintEvery: 'hintEvery', hintDur: 'hintDur', hintStrength: 'hintStrength', hintRepeat: 'hintRepeat' };
  function resolveStatue(cfg) {
    var S = U.clone(P.STATUE_DEFAULTS), rv = cfg.reveal || {};
    for (var k in FROM_REVEAL) if (rv[FROM_REVEAL[k]] !== undefined) S[k] = rv[FROM_REVEAL[k]];
    U.merge(S, cfg.statue || {});
    return S;
  }
  P.IMAGE_DEFAULTS = P.IMAGE_DEFAULTS || {};
  P.IMAGE_DEFAULTS.effects = P.IMAGE_DEFAULTS.effects || ['statue', 'sparkle'];
  P.IMAGE_DEFAULTS.pad = P.IMAGE_DEFAULTS.pad != null ? P.IMAGE_DEFAULTS.pad : .3;
  P.IMAGE_DEFAULTS.statue = P.STATUE_DEFAULTS;
  P.shader = createShader;
  P.STATUE_PALETTES = Object.keys(createShader.PALETTES);

  /* ════ Shared page state ════ */
  /* Browsers allow only a few GPU contexts. Off-screen or paused images keep theirs
     (instant to resume); past the budget, the one seen longest ago gives it back,
     and any image waiting for one gets it. */
  var BUDGET = 6, pool = [], lastScroll = -1e9;
  function reclaim() {
    var live = pool.filter(function (r) { return r.fx || r.loading; });   // count images still loading, or they all slip in at once
    if (live.length < BUDGET) return true;
    var idle = live.filter(function (r) { return r.fx && (!r.visible || r.held); }).sort(function (a, b) { return a.seen - b.seen; })[0];
    if (idle) { idle.release(); return true; }
    return false;
  }
  function retryWaiting() { pool.forEach(function (r) { if (!r.fx && r.visible && !r.held && r.retry) r.retry(); }); }
  addEventListener('scroll', function () { lastScroll = performance.now(); pool.forEach(function (r) { if (r.onScroll) r.onScroll(); }); }, { passive: true });
  document.addEventListener('visibilitychange', function () { pool.forEach(function (r) { if (r.onVisibility) r.onVisibility(); }); });
  var lastPointer = 'mouse';
  document.addEventListener('pointerdown', function (e) {
    lastPointer = e.pointerType || 'mouse';
    if (lastPointer === 'touch') pool.forEach(function (r) { if (r.onTouchAway && !r.box.contains(e.target)) r.onTouchAway(); });
  }, { capture: true, passive: true });

  /* ════ One image ════ */
  function mount(img, settings) {
    var preset = function () { return img.getAttribute('data-prism-statue') || img.getAttribute('data-prism') || img.getAttribute('data-prism-reveal'); };
    /* v2's data-prism-reveal (the wash) was removed: it now means the same as data-prism */
    if (img.hasAttribute('data-prism-reveal') && !mount.noted) { mount.noted = 1; U.warn('data-prism-reveal is now the same as data-prism: the wash was replaced by the pointer light in v3. You can rename the attribute.'); }
    var manual = !!settings, cfg = settings || P.resolve('image', preset(), img, P.IMAGE_DEFAULTS);
    if (!settings && !img.hasAttribute('data-prism-statue') && (cfg.effects || []).indexOf('statue') < 0) return null;
    var S = resolveStatue(cfg);
    var ov = P.overlay(img, cfg);
    var box = img.parentElement && img.parentElement.tagName === 'PICTURE' ? img.parentElement.parentElement : img.parentElement;
    var canvas, alive = true, overlay = S.mode !== 'replace';
    function makeCanvas() {
      var c = document.createElement('canvas'); c.className = 'prism-statue';
      /* the GPU canvas covers the picture only, never the sparkle margin around it */
      c.style.cssText = 'position:absolute;left:0;top:0;width:1px;height:1px;z-index:1;display:block;opacity:0;transition:opacity .9s ease' + (overlay ? ';mix-blend-mode:screen' : '');
      return c;
    }
    canvas = makeCanvas();
    var rec = { fx: null, visible: false, seen: 0, held: false, box: box };
    /* hide the original with a filter, not visibility, so screen readers keep its alt text and taps still reach it */
    var origFilter = img.style.filter;
    var hideImg = function () { if (!overlay) img.style.filter = 'opacity(0)'; };
    var showImg = function () { img.style.filter = origFilter; };
    var q = function () { var budget = Math.sqrt(S.maxPixels / Math.max(1, ov.w * ov.h)); return Math.max(.5, Math.min(S.quality, P.perf.scale([S.quality, 1.5, 1]), budget)); };
    var lastQ = 0;
    function resize() {
      Object.assign(canvas.style, { left: ov.pad + 'px', top: ov.pad + 'px', width: ov.w + 'px', height: ov.h + 'px' });
      var nq = q(); if (rec.fx && Math.abs(nq - lastQ) > .05) { lastQ = nq; rec.fx.set('quality', nq); }
    }

    /* ── The light: positions are 0–1 over the image, eased each frame.
       Handlers only store numbers; the frame reads the canvas position once. ── */
    var L = { x: .5, y: .4, tx: .5, ty: .4, s: 0, target: 0, src: '', cx: 0, cy: 0, has: false, jump: false,
      tapU: .5, tapV: .4, holdUntil: 0, orbit: 0, drift: 0, hint: false, amb: 0, glow: 0, engaged: false };
    var HN = { t: -1, next: performance.now() + 1500, used: false, force: false, timer: 0 };
    var reduce = U.reduced;
    var idleMode = function () { return reduce && S.idle !== 'still' ? 'still' : S.idle; };
    var active = function () { return L.s > .001 || L.target > 0; };
    function moving() { var m = idleMode(); return active() || HN.t >= 0 || m === 'drift' || m === 'live'; }
    var hintsDone = function () { return S.hintRepeat === 'once' && HN.used && !HN.force; };
    function hintAllowed(now) {
      return S.pointer && idleMode() === 'hint' && !L.src && L.s < .001 && rec.visible && !rec.held && !document.hidden && now - lastScroll > 1000 && !hintsDone();
    }
    function armHint(now) {
      clearTimeout(HN.timer);
      if (!S.pointer || idleMode() !== 'hint' || hintsDone() || !rec.visible || rec.held) return;
      HN.timer = setTimeout(function () { var n = performance.now(); if (n >= HN.next - 5 && hintAllowed(n)) wake(); else { if (n >= HN.next) HN.next = n + 1000; armHint(n); } }, Math.max(50, HN.next - now) + 10);
    }
    function stopHint() { if (HN.t < 0) return; HN.t = -1; L.glow = 0; L.hint = false; L.s = 0; L.target = 0; wake(); }
    function previewHint() { HN.force = true; HN.t = -1; HN.next = performance.now() + 250; armHint(performance.now()); }
    function wake() { if (rec.fx) rec.fx.wake(); }
    function announce(on) {
      if (on === L.engaged) return; L.engaged = on;
      box.dispatchEvent(new CustomEvent('prism:light', { bubbles: true, detail: { active: on, image: img } }));
    }
    function step(dt, now) {
      var mode = idleMode();
      if (L.src) { if (L.s > .6) { HN.used = true; HN.force = false; } HN.next = now + S.hintEvery * 1000; if (HN.t >= 0) { HN.t = -1; L.glow = 0; L.hint = false; } }
      if (HN.t < 0 && now >= HN.next - 5 && !L.src && hintAllowed(now)) HN.t = 0;
      if (HN.t >= 0) {
        HN.t += dt; var hp = Math.min(1, HN.t / Math.max(.3, S.hintDur)), env = Math.sin(Math.PI * hp); env *= env;
        L.hint = true; var hs = Math.min(.6, S.hintStrength);
        if (S.hintStyle === 'sweep') { L.x = L.tx = -.1 + 1.2 * hp; L.y = L.ty = .28 + .3 * hp; L.s = hs * env; L.glow = 0; }
        else { L.s = 0; L.glow = hs * .6 * env; }
        if (hp >= 1) { HN.t = -1; L.glow = 0; L.hint = false; L.s = 0; HN.force = false; HN.next = now + S.hintEvery * 1000; }
        L.amb = (mode === 'live' ? 1 : S.idleLight) + L.glow;
        return;
      }
      if ((L.src === 'mouse' || L.src === 'touch') && L.has) {
        var r = canvas.getBoundingClientRect();
        if (r.width && r.height) { L.tx = U.clamp((L.cx - r.left) / r.width, 0, 1); L.ty = U.clamp((L.cy - r.top) / r.height, 0, 1); if (L.src === 'touch') { L.tapU = L.tx; L.tapV = L.ty; } }
      }
      if (L.jump) { L.x = L.tx; L.y = L.ty; L.jump = false; }
      /* touch: a slow orbit around the tap, then it settles */
      if (L.src === 'touch') {
        L.orbit += dt * (reduce ? 0 : .55);
        L.tx = L.tapU + Math.cos(L.orbit) * .035; L.ty = L.tapV + Math.sin(L.orbit) * .025;
        if (now > L.holdUntil) { L.target = 0; L.src = ''; }
      }
      /* drift: the light wanders on its own when nobody is interacting */
      if (!L.src && mode === 'drift') {
        L.drift += dt; var a = L.drift;
        L.tx = .5 + .3 * Math.sin(a * .19) * Math.cos(a * .07); L.ty = .42 + .22 * Math.sin(a * .13 + 1.3);
        L.target = .8; if (L.s < .01) { L.x = L.tx; L.y = L.ty; }
      } else if (!L.src && L.target > 0) L.target = 0;
      var follow = 1 - Math.exp(-dt / Math.max(.001, (reduce ? Math.max(S.lag, 300) : S.lag) / 1000));
      L.x += (L.tx - L.x) * follow; L.y += (L.ty - L.y) * follow;
      /* strength eases in and out, never faster than 0.15 s, for light-sensitive viewers */
      var tau = Math.max(.15, L.target > L.s ? S.easeIn : S.easeOut) / 3;
      L.s += (L.target - L.s) * (1 - Math.exp(-dt / tau));
      if (L.target === 0 && L.s < .001) L.s = 0;
      L.amb = (mode === 'live' ? 1 : S.idleLight) + L.glow;
      announce(!!L.src && L.target > 0);
    }

    /* pointer input, on the image's own wrapper (the effect layer never takes events) */
    function onEnter(e) { if (!S.pointer || e.pointerType === 'touch') return; L.src = 'mouse'; L.cx = e.clientX; L.cy = e.clientY; L.has = true; L.jump = L.s < .05; L.target = 1; wake(); }
    function onMove(e) {
      if (!S.pointer) return;
      if (e.pointerType === 'touch') { if (L.src !== 'touch' || !S.touchDrag) return; L.holdUntil = performance.now() + S.touchHold * 1000; }
      else if (L.src !== 'mouse') { L.src = 'mouse'; L.jump = L.s < .05; L.target = 1; }
      L.cx = e.clientX; L.cy = e.clientY; L.has = true; wake();
    }
    function onLeave(e) { if (e.pointerType === 'touch') return; if (L.src === 'mouse') { L.target = 0; L.src = ''; wake(); } }
    function onDown(e) {
      if (!S.pointer || e.pointerType !== 'touch') return;
      L.src = 'touch'; L.cx = e.clientX; L.cy = e.clientY; L.has = true; L.jump = L.s < .05; L.target = 1;
      L.holdUntil = performance.now() + S.touchHold * 1000; wake();
    }
    rec.onTouchAway = function () { if (L.src === 'touch') { L.target = 0; L.src = ''; wake(); } };
    rec.onScroll = function () { if (HN.t >= 0) { stopHint(); HN.next = lastScroll + 1200; } };
    rec.onVisibility = function () {
      if (document.hidden) { stopHint(); return; }
      HN.next = performance.now() + 1500; armHint(performance.now());
      if (!rec.fx && rec.visible && !rec.held) show();      // a context lost while away comes back
    };
    box.addEventListener('pointerenter', onEnter);
    box.addEventListener('pointermove', onMove, { passive: true });
    box.addEventListener('pointerleave', onLeave);
    box.addEventListener('pointerdown', onDown, { passive: true });
    var origTouch = box.style.touchAction;
    function touchStyle() { box.style.touchAction = S.pointer && S.touchDrag ? 'pan-y' : origTouch; }
    touchStyle();

    /* ── The glass surface: built in idle time, cached per edge width ── */
    var surfT = 0;
    function surface(tex) {
      ov.surfaces = ov.surfaces || {};
      var key = String(S.bevel);
      if (ov.surfaces[key]) { if (rec.fx) rec.fx.setSurface(ov.surfaces[key]); return; }
      U.idle(function () {
        if (!rec.fx) return;
        try { ov.surfaces[key] = buildSurface(tex, S.bevel); if (rec.fx) rec.fx.setSurface(ov.surfaces[key]); }
        catch (e) { U.warn('could not build the glass surface; the light still works without it', e); }
      });
    }

    rec.release = function () {
      if (!rec.fx) return;
      rec.fx.destroy(); rec.fx = null; showImg();
      /* a context given back can't be reused: swap in a fresh canvas for next time */
      var fresh = makeCanvas(); canvas.parentNode && canvas.parentNode.replaceChild(fresh, canvas); canvas = fresh; layer.el = fresh; resize();
      retryWaiting();
    };
    rec.retry = function () { show(); };
    function show() {
      rec.visible = true; rec.seen = performance.now();
      if (!alive || rec.held) return;
      if (rec.fx) { rec.fx.pause(false); canvas.style.opacity = 1; hideImg(); armHint(performance.now()); return; }
      if (rec.loading || !reclaim()) return;
      rec.loading = true;
      ov.load().then(function (tex) {
        rec.loading = false;
        if (rec.fx || !rec.visible || !alive || rec.held) return;
        try {
          resize(); var o = U.clone(S); o.quality = lastQ = q();
          var c = canvas;
          rec.fx = createShader(c, tex, o, {
            overlay: overlay, reduce: reduce, ptr: L,
            fit: function () { return [0, 0, ov.w, ov.h]; },
            step: step, moving: moving,
            fpsCap: function () { return active() && !L.hint ? S.pointerFps : S.fps; },
            onIdle: function (now) { armHint(now); },
            onFirstFrame: function () { c.style.opacity = 1; hideImg(); },
            onLost: function () {
              rec.fx = null; c.style.opacity = 0; showImg();
              c.addEventListener('webglcontextrestored', function () { if (alive && rec.visible && !rec.held && !rec.fx) show(); }, { once: true });
            },
            onError: showImg,
          });
          if (rec.fx) { surface(tex); armHint(performance.now()); }
        } catch (e) { U.warn('statue effect unavailable', e); rec.fx = null; showImg(); }
      }, function () { rec.loading = false; showImg(); });
    }
    function hide() { rec.visible = false; rec.seen = performance.now(); stopHint(); clearTimeout(HN.timer); L.target = 0; L.src = ''; L.s = 0; if (rec.fx) rec.fx.pause(true); retryWaiting(); }
    pool.push(rec);
    var layer = { el: canvas, show: show, hide: hide, resize: resize };
    ov.add(layer);
    P.perf.on(function () { if (rec.fx) rec.fx.set('quality', lastQ = q()); });

    var api = {
      settings: S, overlay: ov, kind: 'statue', defaults: P.STATUE_DEFAULTS,
      set: function (k, v) {
        S[k] = v;
        if (k === 'mode') { overlay = v !== 'replace'; rec.release(); showImg(); canvas.style.mixBlendMode = overlay ? 'screen' : ''; if (rec.visible) show(); return; }
        if (k === 'pointer' || k === 'touchDrag') touchStyle();
        if (k === 'bevel') { clearTimeout(surfT); surfT = setTimeout(function () { ov.load().then(surface, function () {}); }, 80); }
        if (/^hint/.test(k) || k === 'idle') previewHint();
        if (rec.fx) rec.fx.set(k, (k === 'quality' || k === 'maxPixels') ? (lastQ = q()) : v);
      },
      reconfigure: function (next) {
        if (manual && !next) return;
        next = next || P.resolve('image', preset(), img, P.IMAGE_DEFAULTS);
        var st = resolveStatue(next);
        for (var k in st) if (st[k] !== S[k]) api.set(k, st[k]);
      },
      /* play one hint now (also after first use) */
      hint: function () { previewHint(); },
      /* pause(): stop drawing and show the plain image, but keep the GPU context so resume() is instant.
         Paused images are the first to give their context back when the budget is full. */
      pause: function () {
        if (rec.held) return;
        rec.held = true; rec.seen = performance.now(); layer.idle = true;
        stopHint(); clearTimeout(HN.timer); L.target = 0; L.src = ''; L.s = 0;
        if (rec.fx) rec.fx.pause(true);
        canvas.style.opacity = 0; showImg(); ov.sync(); retryWaiting();
      },
      resume: function () {
        if (!rec.held) return;
        rec.held = false; layer.idle = false; ov.sync();
        if (rec.visible) show();
      },
      isPaused: function () { return rec.held; },
      running: function () { return !!rec.fx && !rec.held; },
      drawing: function () { return !!rec.fx && rec.fx.drawing(); },
      destroy: function () {
        alive = false; clearTimeout(HN.timer); rec.release(); ov.remove(layer); pool.splice(pool.indexOf(rec), 1);
        box.removeEventListener('pointerenter', onEnter); box.removeEventListener('pointermove', onMove);
        box.removeEventListener('pointerleave', onLeave); box.removeEventListener('pointerdown', onDown);
        box.style.touchAction = origTouch;
        if (img.__prism) img.__prism.statue = undefined;
      },
    };
    return api;
  }

  P.statue = { mount: mount, defaults: P.STATUE_DEFAULTS };
  /* v2's prism-reveal.js exits when it finds this, so an old script tag left in Webflow can't add the wash back on top */
  P.reveal = P.reveal || { removed: 'v3.0.0' };
  P.register('statue', { selector: 'img[data-prism], img[data-prism-statue], img[data-prism-reveal]', mount: function (el, s) { return mount(el, s); } });
})();
/* ════════════════════════════════════════════════════════════════════
   Prism · Sparkle
   Light that belongs to the image: four-point glints on the cutout's
   outline, a soft halo hugging the shape, bloom, and the rays of coloured
   light fanning out from it.
   Mark an image:  data-prism="liberty"           (statue + sparkle)
                   data-prism-sparkle="liberty"   (sparkle only)
   Built for transparent cutouts: glints follow the transparent edge.
   Floating dust is not here: it belongs to the section (see prism-dust).
   ════════════════════════════════════════════════════════════════════ */
(function () {
  var P = window.Prism;
  if (!P || !P.core) { console.warn('Prism: load prism-core before prism-sparkle'); return; }
  var U = P.util, clamp = U.clamp, lerp = U.lerp;

  P.SPARKLE_DEFAULTS = {
    glints: 27, glintSize: 50, glintStr: 85,    // count 0–160, size px (at an 800px-tall image), strength 0–100
    glintRate: .25,                             // twinkle per second, capped at 1
    warmth: 50,                                 // % of glints that are gold rather than icy
    halo: 10,                                   // soft light hugging the outline, 0–100
    bloom: 0,                                   // glow at the light's source, 0–60
    flares: 24, flareStr: 19,                   // rays of coloured light: count 0–24, strength 0–100
    flarePal: 'crystal',                        // crystal | warm | cool | spectrum | white
    flareHue: 0, flareSat: 100,                 // turn every ray's colour (degrees), and how rich it is (%)
    flareLen: 1, flareWidth: 1, flareSpin: .9,  // ray length and width (× normal), and turn speed (degrees per second)
    origin: { x: .5, y: .36 },                  // where the light comes from, on the image (0–1)
    fadeIn: 1200, seed: 8,
    quality: 1.25,       // pixel density cap: halo and rays are soft, so they don't need full retina
    maxPixels: 1500000,  // and the layer never draws more than this many pixels
    fps: 60,
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
  var STAR_W = null, STAR_C = null, FLARES = {};
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
    var preset = function () { return img.getAttribute('data-prism-sparkle') || img.getAttribute('data-prism') || img.getAttribute('data-prism-reveal'); };
    var manual = !!settings, cfg = settings || P.resolve('image', preset(), img, P.IMAGE_DEFAULTS);
    if (!settings && !img.hasAttribute('data-prism-sparkle') && (cfg.effects || []).indexOf('sparkle') < 0) return null;
    var S = U.merge(U.clone(P.SPARKLE_DEFAULTS), cfg.sparkle || {});
    if (cfg.sparkle && cfg.sparkle.dust > 0 && !mount.warned) { mount.warned = 1; U.warn('dust moved to the section in v3: add data-prism-dust to the section and move the dust settings to a "dust" preset. The image\'s dust settings are ignored.'); }
    sprites();
    var ov = P.overlay(img, cfg);
    var wrap = document.createElement('div'), front = document.createElement('canvas');
    wrap.className = 'prism-sparkle';
    wrap.style.cssText = 'position:absolute;inset:0;z-index:2';
    front.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;mix-blend-mode:screen';
    wrap.appendChild(front);
    var fx = front.getContext('2d'), dpr = U.dpr(S.quality), acc = 0;
    var t = 0, running = false, EDGES = [], HALO = null, HM = .2, GL = [], FL = [], FS = null;

    function seed() {
      var r = U.rng(S.seed * 7 + 13);
      GL = Array.from({ length: 160 }, function () { return { e: r(), ph: r(), sp: .6 + r() * .8, s: r(), rot: (r() - .5) * .5, warm: r(), a: r() * Math.PI * 2, d: .15 + r() * .5 }; });
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
      /* feather every edge of the layer, so flares and halo fade out instead of
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
  P.register('sparkle', { selector: 'img[data-prism], img[data-prism-sparkle], img[data-prism-reveal]', mount: function (el, s) { return mount(el, s); } });
})();
/* ════════════════════════════════════════════════════════════════════
   Prism · Dust
   Fine specks floating in the light, drawn on the section, never on the
   image. By default they gather around the first Prism image in the
   section, so they still read as dust caught in its glow.
   Mark a section:  data-prism-dust            (default preset)
                    data-prism-dust="hero"     (named preset, in "dust")
   Override one section:  data-prism-dust-options='{"dust":200}'
   (its own attribute, so it never mixes with an aurora's options)
   ════════════════════════════════════════════════════════════════════ */
(function () {
  var P = window.Prism;
  if (!P || !P.core) { console.warn('Prism: load prism-core before prism-dust'); return; }
  var U = P.util, clamp = U.clamp;

  P.DUST_DEFAULTS = {
    dust: 90, dustStr: 55,       // count 0–1000, strength 0–100 (same names as v2, so old values move across)
    dustSize: 1,                 // size of each speck (× normal)
    dustSpread: 1.15,            // radial: how far it floats from the light (× the image's size)
    glintRate: .45,              // twinkle per second, capped at 1
    warmth: 72,                  // % of specks that are gold rather than icy
    layout: 'radial',            // 'radial': gathered around the light | 'field': spread across the section, rising slowly
    anchor: 'auto',              // 'auto': the first Prism image in the section | '' : use x and y | or a CSS selector
    origin: { x: .5, y: .36 },   // where on the anchor the light sits (0–1)
    x: 50, y: 40,                // % of the section, when there's no anchor
    rise: 8,                     // field: how fast specks rise, px per second
    layer: 'back',               // 'back': behind the section's content | 'front': above it (never takes clicks)
    react: .35,                  // extra brightness while someone lights an image in this section, 0–1
    fadeIn: 1200, seed: 8,
    quality: 1,                  // dust is soft: no need for full retina
    maxPixels: 1500000,          // the layer never draws more than this many pixels
    fps: 30,
  };

  var SP = null;
  function sprite(core, halo) {
    var N = 24, c = U.cv(N, N), x = c.getContext('2d'), m = N / 2, g = x.createRadialGradient(m, m, 0, m, m, m);
    g.addColorStop(0, U.rgba(core, 1)); g.addColorStop(.18, U.rgba(core, .9)); g.addColorStop(.45, U.rgba(halo, .35)); g.addColorStop(1, U.rgba(halo, 0));
    x.fillStyle = g; x.fillRect(0, 0, N, N); return c;
  }
  function sprites() { if (!SP) SP = { warm: sprite([1, .98, .93], U.oklch(.76, .13, 60)), cool: sprite([.95, .97, 1], U.oklch(.68, .13, 250)) }; }
  /* the drawn picture inside an image box (object-fit: contain leaves margins) */
  function fitRect(el) {
    var r = el.getBoundingClientRect(), nw = el.naturalWidth, nh = el.naturalHeight;
    if (!nw || !nh) return r;
    var fit = getComputedStyle(el).objectFit;
    if (fit !== 'contain' && fit !== 'scale-down') return r;
    var s = Math.min(r.width / nw, r.height / nh), w = nw * s, h = nh * s;
    return { left: r.left + (r.width - w) / 2, top: r.top + (r.height - h) / 2, width: w, height: h };
  }

  function mount(section, settings) {
    var preset = function () { return section.getAttribute('data-prism-dust'); };
    var resolve = function (extra) {
      var inline = {}, raw = section.getAttribute('data-prism-dust-options');
      if (raw) { try { inline = JSON.parse(raw); } catch (e) { U.warn('data-prism-dust-options is not valid JSON', section, e); } }
      return P.resolve('dust', preset(), null, P.DUST_DEFAULTS, [inline].concat(extra || []));
    };
    var manual = !!settings, S = settings || resolve();
    sprites();
    if (getComputedStyle(section).position === 'static') section.style.position = 'relative';
    if (S.layer !== 'front') section.style.isolation = 'isolate';   // behind the content, above the section's background

    var layer = document.createElement('div'), canvas = document.createElement('canvas');
    layer.className = 'prism-dust'; layer.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;mix-blend-mode:screen';
    layer.appendChild(canvas);
    function place() {
      layer.style.cssText = 'position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:' + (S.layer === 'front' ? 3 : -1);
      /* behind: just above an aurora if there is one; in front: last, over everything */
      var aur = section.querySelector(':scope > .prism-aurora');
      if (S.layer === 'front') section.appendChild(layer);
      else if (aur) section.insertBefore(layer, aur.nextSibling);
      else section.insertBefore(layer, section.firstChild);
    }
    place();
    var x = canvas.getContext('2d');

    var W = 1, H = 1, dpr = 1, t = 0, acc = 0, stop = null, stopR = null, DU = [], boost = 0, lit = 0, src = null, MAX = 1000;
    function seed() {
      var r = U.rng(S.seed * 7 + 13);
      DU = Array.from({ length: MAX }, function () { return { a: r() * Math.PI * 2, d: Math.pow(r(), .6), u: r(), v: r(), ph: r(), sp: .4 + r() * .9, s: .3 + r() * .7, warm: r() }; });
    }
    function anchorEl() {
      if (!S.anchor) return null;
      if (S.anchor === 'auto') return section.querySelector('img[data-prism], img[data-prism-statue], img[data-prism-reveal], img[data-prism-sparkle]');
      return typeof S.anchor === 'string' ? (section.querySelector(S.anchor) || document.querySelector(S.anchor)) : S.anchor;
    }
    /* read phase: where the light is, relative to the section */
    function read() {
      var a = anchorEl();
      if (a) { var ar = fitRect(a), sr = section.getBoundingClientRect();
        if (ar.width) { src = { x: ar.left - sr.left + ar.width * S.origin.x, y: ar.top - sr.top + ar.height * S.origin.y, w: ar.width, h: ar.height }; return; } }
      src = { x: W * S.x / 100, y: H * S.y / 100, w: Math.min(W, H) * .87, h: Math.min(W, H) * .87 };
    }
    function resize() {
      W = Math.max(1, section.clientWidth); H = Math.max(1, section.clientHeight);
      dpr = Math.max(.5, Math.min(U.dpr(S.quality), P.perf.scale([2, 1.25, 1]), Math.sqrt(S.maxPixels / Math.max(1, W * H))));
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      if (U.reduced) { read(); draw(0, true); }
    }
    function put(im, px, py, size, a) {
      if (a < .004 || size < .5) return;
      var sc = size / im.width; x.globalAlpha = clamp(a, 0, 1);
      x.setTransform(dpr * sc, 0, 0, dpr * sc, dpr * px, dpr * py); x.drawImage(im, -im.width / 2, -im.height / 2);
    }
    function draw(dt, force) {
      if (!force) { acc += dt; if (S.fps && acc < 1 / S.fps - .004) return; dt = acc; acc = 0; t += dt; }
      else t = 1e4;                                   // reduced motion: one settled frame
      if (!src) read();
      boost += (lit - boost) * (1 - Math.exp(-dt * 3));
      x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, canvas.width, canvas.height);
      x.globalCompositeOperation = 'lighter';
      var dens = P.perf.scale([1, .7, .45]), n = Math.min(MAX, Math.round(S.dust * dens)), ds = S.dustStr / 100 * (1 + clamp(S.react, 0, 1) * boost);
      var rate = Math.min(1, S.glintRate), rr = Math.max(.3, S.fadeIn / 1000), k = clamp(src.h / 800, .4, 2), base = Math.min(src.w, src.h);
      for (var i = 0; i < n && ds > .003; i++) {
        var d = DU[i], ib = U.easeOut(clamp((t - .1 - rr * (.6 + d.ph)) / rr, 0, 1)); if (ib <= 0) continue;
        var tw = U.reduced ? .6 : .5 - .5 * Math.cos(2 * Math.PI * (t * rate * .7 * d.sp + d.ph)), px, py;
        if (S.layout === 'field') {
          py = ((d.v * (H + 40) - t * S.rise * d.sp) % (H + 40) + (H + 40)) % (H + 40) - 20;
          px = d.u * W + Math.sin(t * .3 * d.sp + d.ph * 6.283) * 12;
        } else {
          var dist = d.d * base * S.dustSpread * (1 + .04 * Math.sin(t * .2 + d.ph * 6));
          px = src.x + Math.cos(d.a) * dist; py = src.y + Math.sin(d.a) * dist;
        }
        put(d.warm < S.warmth / 100 ? SP.warm : SP.cool, px, py, (4 + d.s * 9) * k * S.dustSize * (.6 + .4 * tw), ds * ib * d.s * (.25 + .75 * tw));
      }
    }

    /* brighten while someone is lighting an image inside this section */
    var activeImgs = [];
    function onLight(e) {
      var im = e.detail && e.detail.image, i = activeImgs.indexOf(im);
      if (e.detail.active && i < 0) activeImgs.push(im); if (!e.detail.active && i >= 0) activeImgs.splice(i, 1);
      lit = activeImgs.length ? 1 : 0;
    }
    section.addEventListener('prism:light', onLight);

    seed(); resize();
    var ro = new ResizeObserver(resize); ro.observe(section);
    P.perf.on(function () { if (W > 1) resize(); });
    var unwatch = P.watch(section, function (on) {
      if (U.reduced) { if (on) { read(); draw(0, true); } return; }
      if (on && !stop) { stopR = P.loop.add(read, 'read'); stop = P.loop.add(draw); }
      if (!on && stop) { stop(); stopR(); stop = stopR = null; }
    }, '10% 0px');

    var api = {
      settings: S, element: layer, kind: 'dust', defaults: P.DUST_DEFAULTS, resolve: resolve,
      reconfigure: function (next) {
        if (manual && !next) return;
        next = next || resolve();
        for (var k in next) if (JSON.stringify(next[k]) !== JSON.stringify(S[k])) api.set(k, next[k]);
      },
      set: function (k, v) {
        S[k] = v;
        if (k === 'seed') seed();
        if (k === 'quality' || k === 'maxPixels') resize();
        if (k === 'layer') { if (v !== 'front') section.style.isolation = 'isolate'; place(); }
        if (U.reduced) { read(); draw(0, true); }
      },
      replay: function () { t = 0; },
      destroy: function () { if (stop) { stop(); stopR(); } unwatch(); ro.disconnect(); section.removeEventListener('prism:light', onLight); layer.remove(); if (section.__prism) section.__prism.dust = undefined; },
    };
    return api;
  }

  P.dust = { mount: mount, defaults: P.DUST_DEFAULTS };
  P.register('dust', { selector: '[data-prism-dust]', mount: function (el, s) { return mount(el, s); } });
})();
