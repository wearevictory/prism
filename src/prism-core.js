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
