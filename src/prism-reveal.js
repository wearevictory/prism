/* ════════════════════════════════════════════════════════════════════
   Prism · Reveal
   Brings a still image to life on interaction. Mounts the existing
   Statue and Sparkle effects on the image, washes them in from where the
   visitor entered, clicked or tapped, and pauses them on the way out.
   A paused image costs nothing per frame and comes back instantly; when
   the GPU budget is full, Statue frees the oldest paused one. Only one
   image is live at a time.

   Mark an image:  data-prism-reveal              (default image preset)
                   data-prism-reveal="liberty"    (named image preset)
   Optional:       data-prism-reveal-scope        on the card or wrapper
                   that should reveal when focus is inside it.

   Load after prism.min.js v2.4.0+ (or after core + statue + sparkle).
   Use data-prism-reveal instead of data-prism, not both.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  var P = window.Prism;
  if (!P || !P.core || !P.statue) { console.warn('Prism: load prism.min.js (or core, statue and sparkle) before prism-reveal'); return; }
  if (P.reveal) return;
  var U = P.util;

  P.REVEAL_DEFAULTS = {
    hover: true,           // reveal when the pointer rests on the image (mouse and pen)
    hoverDelay: 120,       // ms the pointer must rest first; skips images you pass over
    hideCursor: 1500,      // ms the cursor stays hidden after a click, unless it moves
    washDuration: 1.5,     // s for the wash to cover the image
    revertDuration: 0.6,   // s to return to static
    origin: 'pointer',     // 'pointer' | 'base' | 'center'. Keyboard uses base when 'pointer'
    edgeGlow: 0.55,        // 0–1 brightness of the gold front (capped for flash safety)
    edgeWidth: 0.09,       // softness of the front, as a fraction of the image
    minHold: 500           // ms an image stays live before it can return; caps toggle rate
  };
  P.IMAGE_DEFAULTS = P.IMAGE_DEFAULTS || {};
  P.IMAGE_DEFAULTS.reveal = P.REVEAL_DEFAULTS;

  /* ── Styles (injected once) ──────────────────────────────────────── */
  var css =
    '.prism-reveal-host.is-washing>img,.prism-reveal-host.is-washing>picture img{filter:none!important}' +
    '.prism-reveal-host .prism-statue{transition:none!important}' +
    '.prism-reveal-host{cursor:pointer}' +
    '.prism-cursor-hidden,.prism-cursor-hidden *{cursor:none!important}' +
    '.prism-reveal-host .prism-overlay{-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat}' +
    '.prism-reveal-glow{position:absolute;left:0;top:0;width:0;height:0;pointer-events:none;z-index:3;opacity:0;' +
    'mix-blend-mode:screen;-webkit-mask-size:100% 100%;mask-size:100% 100%;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat}';
  if (!document.getElementById('prism-reveal-css')) {
    var st = document.createElement('style'); st.id = 'prism-reveal-css'; st.textContent = css;
    (document.head || document.documentElement).appendChild(st);
  }

  /* ── Shared state ────────────────────────────────────────────────── */
  var all = [], lastType = 'mouse';
  var ease = function (x) { return -(Math.cos(Math.PI * x) - 1) / 2; };
  var mq = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var reduced = function () { return mq.matches; };

  document.addEventListener('pointerdown', function (e) { lastType = e.pointerType || 'mouse'; }, { capture: true, passive: true });
  document.addEventListener('click', function (e) {          // tap elsewhere returns touch-revealed images
    if (lastType !== 'touch') return;
    all.forEach(function (r) { if (r._touch() && r.live && !r.box.contains(e.target)) r.deactivate(true); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') all.forEach(function (r) { r.deactivate(true); });
  });

  /* ── One image ───────────────────────────────────────────────────── */
  function mount(img, opts) {
    var manual = !!opts;
    var preset = function () { return img.getAttribute('data-prism-reveal'); };
    var set = opts || P.resolve('image', preset(), img, P.IMAGE_DEFAULTS);
    var R = U.merge(U.clone(P.REVEAL_DEFAULTS), set.reveal || {});
    var box = img.parentElement && img.parentElement.tagName === 'PICTURE' ? img.parentElement.parentElement : img.parentElement;
    if (!box) throw new Error('the image needs a parent element');
    var scope = img.closest('[data-prism-reveal-scope]') || box;
    var toggle = scope.getAttribute('role') === 'button';
    box.classList.add('prism-reveal-host');

    var glow = document.createElement('div');
    glow.className = 'prism-reveal-glow'; glow.setAttribute('aria-hidden', 'true');
    box.appendChild(glow);

    var s = { raw: 0, dir: 0, since: 0, origin: [.5, 1], fx: {}, started: false, startAt: 0, stop: null,
              leaveT: 0, hideT: 0, hoverT: 0, px: 0, py: 0, hiddenAt: null, touch: false, focus: false };

    // A few offset circles grow together so the wash front is uneven, not a perfect ring.
    var rnd = U.rng(Math.round(Math.random() * 1e6));
    var lobes = [[0, 0, 1]].concat([0, 1, 2].map(function () {
      var a = rnd() * Math.PI * 2, d = .1 + .12 * rnd();
      return [Math.cos(a) * d, Math.sin(a) * d, .74 + .16 * rnd()];
    }));

    var ov = function () { return img.__prismOverlay; };
    function uvAt(x, y) {
      var r = img.getBoundingClientRect(), nw = img.naturalWidth || 1, nh = img.naturalHeight || 1;
      var fit = getComputedStyle(img).objectFit, w = r.width, h = r.height;
      if (fit === 'contain' || fit === 'scale-down') { var k = Math.min(r.width / nw, r.height / nh); w = nw * k; h = nh * k; }
      var ix = r.left + (r.width - w) / 2, iy = r.top + (r.height - h) / 2;
      return [U.clamp((x - ix) / w, 0, 1), U.clamp((y - iy) / h, 0, 1)];
    }
    function originFor(src, x, y) {
      if (R.origin === 'center') return [.5, .5];
      if (R.origin === 'base' || src === 'key') return [.5, 1];
      return uvAt(x, y);
    }
    function mark(on) {
      box.classList.toggle('is-live', on);
      if (toggle) scope.setAttribute('aria-pressed', on ? 'true' : 'false');
      box.dispatchEvent(new CustomEvent('prism:reveal', { bubbles: true, detail: { live: on, image: img } }));
    }

    var canPause = function (fx) { return fx && typeof fx.pause === 'function'; };
    function mountFx() {
      var fx = set.effects || ['statue', 'sparkle'];
      if (fx.indexOf('statue') >= 0) { if (!s.fx.statue) s.fx.statue = P.mount('statue', img, set); else if (canPause(s.fx.statue)) s.fx.statue.resume(); }
      if (fx.indexOf('sparkle') >= 0 && P.sparkle) {
        if (!s.fx.sparkle) s.fx.sparkle = P.mount('sparkle', img, set);
        else if (canPause(s.fx.sparkle)) s.fx.sparkle.resume();   // resume restarts its fade-in
      }
    }
    function dropFx() {
      if (s.fx.statue) s.fx.statue.destroy();
      if (s.fx.sparkle) s.fx.sparkle.destroy();
      s.fx = {};
    }
    // Pause when the library supports it (v2.4.0+), otherwise destroy.
    function teardown() {
      if (canPause(s.fx.statue) || canPause(s.fx.sparkle)) {
        if (s.fx.statue) { if (canPause(s.fx.statue)) s.fx.statue.pause(); else { s.fx.statue.destroy(); s.fx.statue = null; } }
        if (s.fx.sparkle) { if (canPause(s.fx.sparkle)) s.fx.sparkle.pause(); else { s.fx.sparkle.destroy(); s.fx.sparkle = null; } }
      } else dropFx();
      s.started = false; s.raw = 0; s.dir = 0;
      var o = ov(); if (o) { o.el.style.webkitMaskImage = o.el.style.maskImage = ''; o.el.style.opacity = ''; }
      glow.style.opacity = 0;
      box.classList.remove('is-washing');
    }

    function paint(p) {
      var o = ov(); if (!o || !o.W) return;
      if (reduced()) {                                   // plain crossfade, no moving front
        o.el.style.webkitMaskImage = o.el.style.maskImage = '';
        o.el.style.opacity = p; glow.style.opacity = 0; return;
      }
      o.el.style.opacity = '';
      if (p >= 1 && s.dir > 0) { o.el.style.webkitMaskImage = o.el.style.maskImage = ''; glow.style.opacity = 0; return; }
      var ox = o.pad + s.origin[0] * o.w, oy = o.pad + s.origin[1] * o.h;
      var Rm = Math.max(Math.hypot(ox, oy), Math.hypot(o.W - ox, oy), Math.hypot(ox, o.H - oy), Math.hypot(o.W - ox, o.H - oy));
      var f = Math.max(10, R.edgeWidth * Math.max(o.w, o.h));
      var r = p * (Rm * 1.12 + f), spread = Math.min(1, p * 1.6);
      o.el.style.webkitMaskImage = o.el.style.maskImage = lobes.map(function (l) {
        var rr = r * l[2];
        return 'radial-gradient(circle at ' + (ox + l[0] * Rm * spread).toFixed(1) + 'px ' + (oy + l[1] * Rm * spread).toFixed(1) +
          'px,#000 ' + Math.max(0, rr - f).toFixed(1) + 'px,transparent ' + Math.max(.1, rr).toFixed(1) + 'px)';
      }).join(',');
      // Gold front, clipped to the image's own silhouette
      var gx = s.origin[0] * o.w, gy = s.origin[1] * o.h, rc = Math.max(0, r - f * .5);
      glow.style.transform = 'translate3d(' + o.x + 'px,' + o.y + 'px,0)';
      glow.style.width = o.w + 'px'; glow.style.height = o.h + 'px';
      glow.style.background = 'radial-gradient(circle at ' + gx.toFixed(1) + 'px ' + gy.toFixed(1) + 'px,transparent ' +
        Math.max(0, rc - f).toFixed(1) + 'px,rgba(240,200,120,1) ' + rc.toFixed(1) + 'px,transparent ' + (rc + f).toFixed(1) + 'px)';
      glow.style.opacity = (Math.min(.6, R.edgeGlow * .7) * Math.sin(Math.PI * p)).toFixed(3);
    }

    function frame(dt, now) {
      var rm = reduced();
      if (s.dir > 0) {
        if (!s.started) {                                 // wait for the statue's first frame
          var cv = ov() && ov().el.querySelector('.prism-statue');
          if (s.fx.statue && !(cv && cv.style.opacity === '1') && now - s.startAt < 1500) { paint(0); return; }
          s.started = true;
        }
        s.raw = Math.min(1, s.raw + dt / (rm ? .4 : R.washDuration));
      } else if (s.dir < 0) {
        s.raw = Math.max(0, s.raw - dt / (rm ? .3 : R.revertDuration));
      }
      paint(ease(s.raw));
      if (s.dir > 0 && s.raw >= 1) { box.classList.remove('is-washing'); stopLoop(); }
      if (s.dir <= 0 && s.raw <= 0) { teardown(); stopLoop(); }
    }
    function startLoop() { if (!s.stop) s.stop = P.loop.add(frame, 'write'); }
    function stopLoop() { if (s.stop) { s.stop(); s.stop = null; } }

    function activate(origin) {
      cancelLeave();
      if (s.dir > 0) return;
      all.forEach(function (r) { if (r !== api) r.deactivate(true); });
      if (s.raw <= 0) { s.origin = origin || [.5, 1]; s.startAt = performance.now(); }
      s.dir = 1; s.since = performance.now();
      box.classList.add('is-washing');
      var src = img.currentSrc || img.src;
      if (glow._src !== src) { glow._src = src; glow.style.webkitMaskImage = glow.style.maskImage = 'url("' + src + '")'; }
      mountFx(); mark(true); startLoop();
    }
    function deactivate(force) {
      clearTimeout(s.hoverT); s.hoverT = 0;
      if (s.dir <= 0) return;
      var held = performance.now() - s.since;
      if (!force && held < R.minHold) {
        cancelLeave(); s.leaveT = setTimeout(function () { s.leaveT = 0; deactivate(true); }, R.minHold - held); return;
      }
      cancelLeave();
      s.dir = -1; s.touch = false;
      box.classList.add('is-washing');
      mark(false); startLoop();
    }
    function cancelLeave() { clearTimeout(s.leaveT); s.leaveT = 0; }

    function hideCursor(x, y) {
      if (!R.hideCursor) return;
      s.hiddenAt = { x: x, y: y }; box.classList.add('prism-cursor-hidden');
      clearTimeout(s.hideT); s.hideT = setTimeout(showCursor, R.hideCursor);
    }
    function showCursor() { s.hiddenAt = null; clearTimeout(s.hideT); box.classList.remove('prism-cursor-hidden'); }

    /* Mouse and touch */
    function onClick(e) {
      if (lastType === 'touch') {
        if (s.dir > 0) deactivate(true); else { s.touch = true; activate(originFor('pointer', e.clientX, e.clientY)); }
        return;
      }
      if (e.detail === 0) return;                         // click synthesised by the keyboard
      clearTimeout(s.hoverT); s.hoverT = 0;
      activate(originFor('pointer', e.clientX, e.clientY));
      hideCursor(e.clientX, e.clientY);
    }
    function onMove(e) {
      s.px = e.clientX; s.py = e.clientY;
      if (s.hiddenAt && Math.hypot(e.clientX - s.hiddenAt.x, e.clientY - s.hiddenAt.y) > 8) showCursor();
    }
    function onEnter(e) {
      if (e.pointerType === 'touch') return;
      cancelLeave(); s.px = e.clientX; s.py = e.clientY;
      if (!R.hover || s.dir > 0) return;
      clearTimeout(s.hoverT);
      s.hoverT = setTimeout(function () { s.hoverT = 0; activate(originFor('pointer', s.px, s.py)); }, R.hoverDelay);
    }
    function onLeave(e) {
      if (e.pointerType === 'touch') return;
      clearTimeout(s.hoverT); s.hoverT = 0;
      if (s.focus || s.touch) return;
      showCursor();
      if (s.dir > 0 && !s.leaveT) s.leaveT = setTimeout(function () { s.leaveT = 0; deactivate(false); }, 150);
    }

    /* Keyboard: focus inside the scope reveals. A role=button scope toggles with Enter or Space. */
    function onFocusIn(e) {
      if (!e.target.matches(':focus-visible')) return;
      s.focus = true; activate(originFor('key'));
    }
    function onFocusOut(e) {
      if (!s.focus || scope.contains(e.relatedTarget)) return;
      s.focus = false; deactivate(true);
    }
    function onKey(e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      if (s.dir > 0) deactivate(true); else activate(originFor('key'));
    }

    box.addEventListener('click', onClick);
    box.addEventListener('pointermove', onMove, { passive: true });
    box.addEventListener('pointerenter', onEnter);
    box.addEventListener('pointerleave', onLeave);
    scope.addEventListener('focusin', onFocusIn);
    scope.addEventListener('focusout', onFocusOut);
    if (toggle) scope.addEventListener('keydown', onKey);

    // Scrolled away: return to static
    var unwatch = P.watch(img, function (v) { if (!v && s.dir > 0 && !s.focus) deactivate(true); }, '0px');

    var api = {
      kind: 'reveal', defaults: P.REVEAL_DEFAULTS, box: box,
      get settings() { return R; },
      get image() { return set; },
      get live() { return s.dir > 0; },
      _touch: function () { return s.touch; },
      activate: function () { activate(originFor('key')); },
      deactivate: deactivate,
      hasGL: function () { var st = s.fx.statue; return !!st && (st.running ? st.running() : true); },
      set: function (k, v) { R[k] = v; },
      setStatue: function (k, v) { set.statue = set.statue || {}; set.statue[k] = v; if (s.fx.statue) s.fx.statue.set(k, v); },
      setSparkle: function (k, v) { set.sparkle = set.sparkle || {}; set.sparkle[k] = v; if (s.fx.sparkle) s.fx.sparkle.set(k, v); },
      reconfigure: function (o) {                         // breakpoint changes; applies from the next reveal
        if (manual && !o) return;
        set = o || P.resolve('image', preset(), img, P.IMAGE_DEFAULTS);
        R = U.merge(U.clone(P.REVEAL_DEFAULTS), set.reveal || {});
      },
      reset: function () {                                // after swapping the image's src
        stopLoop(); teardown(); dropFx(); mark(false);
        var o = ov(); if (o) { o.texture = null; o.current = null; }
      },
      destroy: function () {
        stopLoop(); teardown(); dropFx(); unwatch(); glow.remove();
        box.removeEventListener('click', onClick); box.removeEventListener('pointermove', onMove);
        box.removeEventListener('pointerenter', onEnter); box.removeEventListener('pointerleave', onLeave);
        scope.removeEventListener('focusin', onFocusIn); scope.removeEventListener('focusout', onFocusOut);
        scope.removeEventListener('keydown', onKey);
        box.classList.remove('prism-reveal-host');
        all.splice(all.indexOf(api), 1);
        if (img.__prism) img.__prism.reveal = undefined;
      }
    };
    all.push(api);
    return api;
  }

  P.reveal = { mount: mount, defaults: P.REVEAL_DEFAULTS, all: function () { return all.slice(); } };
  P.register('reveal', { selector: 'img[data-prism-reveal]', mount: function (el, o) { return mount(el, o); } });
})();
