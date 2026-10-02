/* ════════════════════════════════════════════════════════════════════
   Prism · core
   Shared by every module: helpers, settings (with breakpoints), one
   animation loop, adaptive quality, the overlay that sits on top of an
   image, start-up, and the on-page tuner loader.
   Load this first, then any of: prism-aurora, prism-statue, prism-sparkle.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  if (window.Prism && window.Prism.core) return;
  var P = window.Prism = window.Prism || {};
  P.core = true;
  P.version = '2.3.0';
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
    ov.add = function (layer) { ov.layers.push(layer); el.appendChild(layer.el); if (ov.visible && layer.show) layer.show(); };
    ov.remove = function (layer) { var i = ov.layers.indexOf(layer); if (i >= 0) ov.layers.splice(i, 1); if (layer.hide) layer.hide(); if (layer.el && layer.el.parentNode) layer.el.parentNode.removeChild(layer.el); };
    var stopR = null, stopW = null;
    P.watch(img, function (on) {
      ov.visible = on;
      ov.layers.forEach(function (l) { var f = on ? l.show : l.hide; if (f) f(); });
      if (on && !stopR) { ov.measure(); stopR = P.loop.add(read, 'read'); stopW = P.loop.add(write, 'write'); }
      if (!on && stopR) { stopR(); stopW(); stopR = stopW = null; }
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
