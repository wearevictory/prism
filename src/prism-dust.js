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
