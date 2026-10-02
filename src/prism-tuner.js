/* ════════════════════════════════════════════════════════════════════
   Prism · Tuner
   A live editor that runs on your own (staging) site. Never loads for
   visitors: open any page with ?prism-tune in the URL.
   Pick a section or image, change its values, see them on the real page,
   then copy them out as data-prism-options for that element, or into a
   preset in your settings block.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  var P = window.Prism;
  if (!P || !P.core) { console.warn('Prism: load the library before the tuner'); return; }
  if (P.tuner) { P.tuner.open(); return; }
  var U = P.util, KEY = 'prism-tuner:' + location.host + location.pathname;

  /* ── What can be tuned, with what each one does on screen ──
     R(key, label, min, max, step, unit, help, when) · S(key, label, options, help, when) · G(group, note) */
  var R = function (k, l, min, max, step, u, h, w) { return { k: k, l: l, min: min, max: max, step: step, u: u || '', h: h || '', w: w }; };
  var SG = function (k, l, opts, h, w) { return { seg: k, l: l, opts: opts, h: h || '', w: w }; };
  var G = function (label, note) { return { grp: label, note: note || '' }; };
  var on = function (k) { return function (s) { return s[k] > 0; }; };
  var is = function (k, vals) { return function (s) { return vals.indexOf(s[k]) >= 0; }; };
  var SPECS = {
    aurora: [
      G('Shape and colour', 'The soft coloured glow behind the section. Changes show behind your content.'),
      SG('bg', 'Form', [['conic', 'Fan'], ['radial', 'Pool'], ['splotch', 'Clouds'], ['none', 'Off']], 'Fan: a wedge of light opening from one point. Pool: a round glow. Clouds: soft colour blobs drifting around the centre.'),
      SG('bgPal', 'Colours', [['crystal', 'Crystal'], ['gold', 'Gold'], ['vishanti', 'Vishanti'], ['mock', 'Iris'], ['spectrum', 'Spectrum']], 'The set of colours the glow is painted with.'),
      R('bgInt', 'Brightness', 0, 90, 1, '', 'How strong the whole glow is. Capped at 90 so it never washes out the page.'),
      R('bgSat', 'Saturation', 0, 160, 1, '%', 'How rich the colours are. Lower is more silvery, higher is more vivid.'),
      R('bgHue', 'Hue shift', -180, 180, 1, '°', 'Turns every colour around the colour wheel. Small moves (±20) warm or cool the glow.'),
      R('bgLight', 'Lightness', 40, 130, 1, '%', 'Darker or paler colours, without changing brightness.'),
      G('Movement'),
      R('bgDrift', 'Spin', -6, 6, .05, '°/s', 'How fast the glow turns. 0.6 is one full turn in ten minutes. Negative turns the other way.'),
      R('bgSweep', 'Arrival turn', -90, 90, 1, '°', 'How far it swings while fading in when the page loads. Reload to see it.'),
      R('fadeIn', 'Fade in', 600, 4000, 50, 'ms', 'How long the glow takes to appear on load. Reload to see it.'),
      G('Shape details'),
      R('bgSpread', 'Fan width', 40, 360, 5, '°', 'How wide the fan opens (or how far the clouds spread). 360 is a full circle.', is('bg', ['conic', 'splotch'])),
      R('bgFeather', 'Fan edge softness', 0, 80, 1, '°', 'Softens the two edges of the fan.', is('bg', ['conic'])),
      R('bgRadius', 'Pool size', 20, 140, 1, '%', 'How far the round glow reaches.', is('bg', ['radial'])),
      R('blobs', 'Cloud count', 2, 16, 1, '', 'How many colour clouds.', is('bg', ['splotch'])),
      R('blobSize', 'Cloud size', 20, 140, 1, '%', 'How big each cloud is.', is('bg', ['splotch'])),
      R('bgCentre', 'Dark centre', 0, 100, 1, '', 'Darkens the middle of the glow so your image or text stands out against it.'),
      R('bgEdge', 'Edge fade', 0, 100, 1, '', 'Fades the glow out toward the edges of the section.'),
      R('grain', 'Film grain', 0, 80, 1, '', 'A fine texture over the glow that hides colour banding.'),
      G('Where the light sits'),
      R('x', 'Horizontal', 0, 100, 1, '%', 'Left to right position of the glow’s centre in the section.', function (s) { return !s.anchor; }),
      R('y', 'Vertical', 0, 100, 1, '%', 'Top to bottom position of the glow’s centre.', function (s) { return !s.anchor; }),
      R('anchorY', 'Height on anchor', 0, 1, .01, '', 'Where on the anchored element the glow centres: 0 is its top, 1 its bottom.', function (s) { return !!s.anchor; }),
      G('Performance'),
      R('resolution', 'Render scale', .3, 1, .05, '', 'Draws the glow smaller and scales it up. It’s soft, so 0.6 looks identical and saves battery.'),
      SG('fps', 'Frame rate', [[24, '24'], [30, '30'], [60, '60']], 'Redraws per second. The turn is slow, so 30 looks the same as 60 at half the work.'),
    ],
    statue: [
      G('Light colour', 'Light that flows through the glass of the image itself.'),
      SG('palette', 'Colours', [['prism', 'Prism'], ['diamond', 'Diamond'], ['crystal', 'Crystal'], ['champagne', 'Champagne'], ['shard', 'Shard']], 'The colours the light breaks into as it moves through the glass.'),
      R('light', 'Light strength', 0, 1.6, .01, '', 'How bright the moving light is where it lands. 0 shows the plain render.'),
      R('tint', 'Tint', 0, 1, .01, '', 'How much the light colours stain the glass, even where no light band is passing.', is('mode', ['replace'])),
      R('clarity', 'Clarity', 0, 1, .01, '', 'Sharpens fine detail like facets and gold trim.', is('mode', ['replace'])),
      G('Movement'),
      R('speed', 'Sweep speed', 0, 1, .01, '/s', 'How fast the bands of light travel across. 0.04 is very slow and calm.'),
      R('flow', 'Flow', 0, 3, .01, '', 'How much the bands bend and swirl. 0 is straight bands; higher is liquid.'),
      R('flowScale', 'Swirl size', .3, 4, .01, '', 'Low: big slow swirls. High: small ripples.', on('flow')),
      R('scale', 'Band count', .5, 6, .01, '', 'How many bands of light cross the image at once.'),
      R('sharp', 'Band focus', 1, 8, .01, '', 'Low: wide soft glows. High: thin crisp streaks like caustics.'),
      R('disp', 'Dispersion', 0, 1, .01, '', 'Splits each band into a rainbow fringe at its edges, like light through a prism.'),
      R('edge', 'Edge light', 0, 2, .01, '', 'Extra light along outlines and folds, where real glass catches the most light.'),
      G('Glitter', 'Tiny starbursts that twinkle on the brightest parts of the glass.'),
      R('glitter', 'Amount', 0, 1, .01, '', 'How many starbursts. 0 turns glitter off.'),
      R('gsize', 'Size', 8, 48, 1, 'px', 'How big each starburst is.', on('glitter')),
      R('twinkle', 'Twinkle speed', 0, 1.5, .01, '/s', 'How often each one flashes. Capped for light sensitivity.', on('glitter')),
      G('Drawing and performance'),
      SG('mode', 'Drawing', [['replace', 'Full GPU'], ['overlay', 'Light on top']], 'Full GPU redraws the whole picture (needed for Tint and Clarity). Light on top keeps your original image and only adds light.'),
      SG('quality', 'Sharpness', [[1, 'Battery'], [1.5, 'Balanced'], [2, 'Sharp']], 'Pixel density on retina screens. Balanced is hard to tell from Sharp and much lighter.'),
      SG('fps', 'Frame rate', [[24, '24'], [30, '30'], [60, '60']], 'Redraws per second. With slow light, 30 looks the same as 60.'),
    ],
    sparkle: [
      G('Dust', 'Fine specks floating around the image.'),
      R('dust', 'Amount', 0, 1000, 10, '', 'How many specks. Above about 600, older phones automatically draw fewer.'),
      R('dustStr', 'Brightness', 0, 100, 1, '', 'How bright each speck is.', on('dust')),
      R('dustSize', 'Speck size', .3, 3, .05, '×', 'Bigger specks read as more dust without the cost of drawing more.', on('dust')),
      R('dustSpread', 'Spread', .3, 2.5, .05, '×', 'How far the dust floats from the light source. Very wide spreads fade at the layer’s edge; raise Reach if so.', on('dust')),
      G('Rays', 'Long streaks of coloured light fanning out from the source.'),
      R('flares', 'Number of rays', 0, 24, 1, '', 'How many rays. 0 turns them off.'),
      R('flareStr', 'Brightness', 0, 100, 1, '', 'How bright the rays are.', on('flares')),
      SG('flarePal', 'Ray colours', [['crystal', 'Crystal'], ['warm', 'Warm'], ['cool', 'Cool'], ['spectrum', 'Spectrum'], ['white', 'White']], 'Crystal: blue, violet and gold. Warm: gold and amber. Cool: blue, cyan and pearl. Spectrum: the full rainbow. White: pure light.', on('flares')),
      R('flareHue', 'Colour shift', -180, 180, 1, '°', 'Turns every ray’s colour around the colour wheel.', on('flares')),
      R('flareSat', 'Colour richness', 0, 160, 1, '%', '0 makes the rays white; above 100 makes them more vivid.', on('flares')),
      R('flareLen', 'Length', .3, 2, .05, '×', 'How far the rays reach.', on('flares')),
      R('flareWidth', 'Width', .3, 3, .05, '×', 'How wide each ray fans out.', on('flares')),
      R('flareSpin', 'Turn speed', -6, 6, .05, '°/s', 'How fast the rays slowly rotate. 0 holds them still.', on('flares')),
      G('Glints', 'Four-point stars sitting on the outline of the image.'),
      R('glints', 'Amount', 0, 160, 1, '', 'How many stars. 0 turns them off.'),
      R('glintSize', 'Size', 10, 200, 1, '', 'How big each star is.', on('glints')),
      R('glintStr', 'Brightness', 0, 100, 1, '', 'How bright the stars are.', on('glints')),
      G('Glow'),
      R('halo', 'Halo', 0, 100, 1, '', 'A soft light hugging the outside of the image’s outline.'),
      R('bloom', 'Bloom', 0, 60, 1, '', 'A warm glow around the light source point.'),
      R('glintRate', 'Twinkle speed', .05, 1, .05, '/s', 'How often glints and dust shimmer. Capped at once a second.'),
      R('warmth', 'Warmth', 0, 100, 1, '%', 'Share of specks and stars that are gold rather than icy white.'),
      G('Light source on the image', 'The point the dust, rays and bloom radiate from.'),
      R('origin.x', 'Horizontal', 0, 1, .01, '', '0 is the image’s left edge, 1 its right.'),
      R('origin.y', 'Vertical', 0, 1, .01, '', '0 is the image’s top, 1 its bottom.'),
      G('Performance'),
      SG('quality', 'Sharpness', [[1, 'Battery'], [1.25, 'Balanced'], [2, 'Sharp']], 'Pixel density of the sparkle layer. Dust and rays are soft, so Balanced looks the same.'),
      SG('fps', 'Frame rate', [[24, '24'], [30, '30'], [60, '60']], 'Redraws per second.'),
    ],
  };

  /* ── Elements on this page ── */
  function targets() {
    var seen = [], out = [];
    P.instances().forEach(function (r) {
      var i = seen.indexOf(r.el);
      if (i < 0) { seen.push(r.el); out.push({ el: r.el, fx: {} }); i = seen.length - 1; }
      out[i].fx[r.name] = r.inst;
    });
    return out;
  }
  function idOf(el) {
    if (el.getAttribute('data-prism-id')) return el.getAttribute('data-prism-id');
    if (el.id) return '#' + el.id;
    var path = [], n = el;
    while (n && n.nodeType === 1 && n !== document.body && path.length < 6) {
      var k = 1, s = n; while ((s = s.previousElementSibling)) if (s.tagName === n.tagName) k++;
      path.unshift(n.tagName.toLowerCase() + ':' + k); n = n.parentElement;
    }
    return path.join('>');
  }
  function labelOf(t) {
    var el = t.el, kind = t.fx.aurora ? 'Section' : 'Image';
    var preset = el.getAttribute('data-prism-aurora') || el.getAttribute('data-prism') || el.getAttribute('data-prism-statue') || el.getAttribute('data-prism-sparkle') || 'default';
    var name = el.id ? '#' + el.id : t.fx.aurora ? ((el.querySelector('h1,h2,h3') || {}).textContent || el.className.split(' ')[0] || 'section') : (el.alt || (/^data:/.test(el.src || '') ? '' : (el.src || '').split('/').pop().split('?')[0]) || 'image');
    return { kind: kind, preset: preset || 'default', name: String(name).trim().slice(0, 36) };
  }

  /* ── Edits: one options layer per element, saved on this browser ── */
  var saved = {}; try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
  var persist = function () { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) {} };
  var scope = 'all';
  function getPath(o, path) { return path.split('.').reduce(function (a, k) { return a == null ? undefined : a[k]; }, o); }
  function setPath(o, path, v) { var ks = path.split('.'), last = ks.pop(); ks.forEach(function (k) { if (!U.isObj(o[k])) o[k] = {}; o = o[k]; }); o[last] = v; }
  function layerFor(t, fxName) {
    var L = saved[idOf(t.el)] = saved[idOf(t.el)] || {};
    var base = scope === 'all' ? L : (L[scope] = L[scope] || {});
    if (fxName === 'aurora') return base;
    return (base[fxName] = base[fxName] || {});
  }
  function presetOf(t, fx) { return fx === 'aurora' ? t.el.getAttribute('data-prism-aurora') : (t.el.getAttribute('data-prism-' + fx) || t.el.getAttribute('data-prism')); }
  /* recompute the element's settings with the tuner layer on top, and apply them live */
  function apply(t) {
    var layer = saved[idOf(t.el)] || {};
    if (t.fx.aurora) t.fx.aurora.reconfigure(P.resolve('aurora', presetOf(t, 'aurora'), t.el, P.AURORA_DEFAULTS, [layer]));
    ['statue', 'sparkle'].forEach(function (n) { if (t.fx[n]) t.fx[n].reconfigure(P.resolve('image', presetOf(t, n), t.el, P.IMAGE_DEFAULTS, [layer])); });
  }
  function current(t, fx, key) { var s = t.fx[fx].settings; return key.indexOf('.') > 0 ? getPath(s, key) : s[key]; }
  /* the value this element would have without any tuner edits: its preset, its own options, the breakpoint */
  function baseline(t, fx, key) {
    var cfg = fx === 'aurora' ? P.resolve('aurora', presetOf(t, 'aurora'), t.el, P.AURORA_DEFAULTS) : P.resolve('image', presetOf(t, fx), t.el, P.IMAGE_DEFAULTS)[fx];
    var lib = fx === 'aurora' ? P.AURORA_DEFAULTS : P.IMAGE_DEFAULTS[fx];
    var v = getPath(cfg || {}, key); return v === undefined ? getPath(lib, key) : v;
  }
  function libDefault(fx, key) { return getPath(fx === 'aurora' ? P.AURORA_DEFAULTS : P.IMAGE_DEFAULTS[fx], key); }

  /* ── Output ── */
  function inlineOf(t) { try { return JSON.parse(t.el.getAttribute('data-prism-options') || '{}'); } catch (e) { return {}; } }
  function prune(o) { for (var k in o) { if (U.isObj(o[k])) { prune(o[k]); if (!Object.keys(o[k]).length) delete o[k]; } } return o; }
  function optionsFor(t) { return prune(U.merge(inlineOf(t), U.clone(saved[idOf(t.el)] || {}))); }
  function settingsWith(t) {
    var cfg = U.clone(P.config()), layer = saved[idOf(t.el)] || {}, kind = t.fx.aurora ? 'aurora' : 'image';
    var name = presetOf(t, t.fx.aurora ? 'aurora' : 'statue') || presetOf(t, 'sparkle') || 'default';
    cfg[kind] = cfg[kind] || {}; cfg[kind][name] = prune(U.merge(cfg[kind][name] || {}, U.clone(layer)));
    return { name: name, text: '<script type="application/json" data-prism-config>\n' + JSON.stringify(cfg, null, 2) + '\n<\/script>' };
  }

  /* ── UI ── */
  var css = [
    '.ptn,.ptn *{box-sizing:border-box;font-family:Inter,-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;-webkit-font-smoothing:antialiased}',
    '.ptn-pill{position:fixed;left:14px;bottom:calc(env(safe-area-inset-bottom,0px) + 14px);z-index:2147483000;height:42px;padding:0 16px;border-radius:999px;border:1px solid rgba(255,255,255,.14);background:rgba(20,20,23,.88);color:#F5F3EF;font-size:14px;font-weight:500;-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);cursor:pointer}',
    '.ptn-panel{position:fixed;z-index:2147483001;left:0;right:0;bottom:0;max-height:62vh;display:flex;flex-direction:column;background:rgba(16,16,19,.96);color:#F5F3EF;border-top:1px solid rgba(255,255,255,.08);border-radius:22px 22px 0 0;-webkit-backdrop-filter:blur(22px);backdrop-filter:blur(22px);transform:translateY(105%);transition:transform .4s cubic-bezier(.3,.8,.25,1);padding-bottom:env(safe-area-inset-bottom,0px)}',
    '@media(min-width:900px){.ptn-panel{left:auto;top:0;max-height:none;width:380px;border-radius:0;border-top:0;border-left:1px solid rgba(255,255,255,.08);transform:translateX(105%)}}',
    '.ptn-panel.on{transform:none}',
    '.ptn-hd{display:flex;gap:8px;align-items:center;padding:12px 12px 6px}',
    '.ptn-hd select{flex:1;min-width:0;height:40px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:#0c0c0e;color:#F5F3EF;padding:0 10px;font-size:14px}',
    '.ptn-b{height:40px;padding:0 14px;border-radius:999px;border:0;background:#26262b;color:#F5F3EF;font-size:13.5px;font-weight:500;cursor:pointer;white-space:nowrap}',
    '.ptn-b.pri{background:#F5F3EF;color:#0b0b0d}.ptn-b.on{background:#F5F3EF;color:#0b0b0d}',
    '.ptn-bd{overflow-y:auto;padding:4px 16px 20px;overscroll-behavior:contain}',
    '.ptn-meta{font-size:12px;color:#85837F;margin:4px 0 10px;display:flex;justify-content:space-between;gap:8px}',
    '.ptn-seg{display:flex;flex-wrap:wrap;gap:2px;padding:3px;border-radius:16px;background:#222226;margin:6px 0 4px}',
    '.ptn-seg button{flex:1 0 auto;height:32px;padding:0 10px;border:0;border-radius:999px;background:none;color:#B4B0AA;font-size:13px;cursor:pointer}',
    '.ptn-seg button[aria-pressed=true]{background:#F5F3EF;color:#0b0b0d;font-weight:600}',
    '.ptn-g{font-size:12px;color:#85837F;margin:16px 0 4px}',
    '.ptn-r{padding:6px 0 0}.ptn-r .t{display:flex;justify-content:space-between;font-size:13.5px;color:#B4B0AA}.ptn-r .t b{font-weight:500;color:#F5F3EF;font-variant-numeric:tabular-nums}',
    '.ptn-r .t i{font-style:normal;color:#F5A461;margin-left:6px}',
    '.ptn input[type=range]{width:100%;height:30px;margin:0;accent-color:#F5F3EF;touch-action:pan-y}',
    '.ptn textarea{width:100%;height:110px;margin-top:8px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:#0b0b0d;color:#F5F3EF;padding:10px;font:11.5px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;resize:vertical}',
    '.ptn-out{margin-top:14px;padding:12px;border-radius:14px;background:#1a1a1e}.ptn-out p{margin:4px 0 0;font-size:12px;line-height:1.5;color:#85837F}.ptn-out .row{display:flex;gap:8px;margin-top:8px}',
    '.ptn-hl{position:fixed;z-index:2147482999;pointer-events:none;border:1.5px solid #F5A461;border-radius:6px;box-shadow:0 0 0 9999px rgba(0,0,0,.18);transition:all .15s}',
    '.ptn-picking *{cursor:crosshair!important}',
    '.ptn-r .t span{cursor:default;user-select:none;-webkit-user-select:none}',
    '.ptn-r .t b{cursor:text;border-bottom:1px dotted rgba(255,255,255,.25)}',
    '.ptn-r .t input{width:72px;height:24px;border-radius:6px;border:1px solid rgba(255,255,255,.3);background:#0b0b0d;color:#F5F3EF;font:500 13px Inter,sans-serif;text-align:right;padding:0 6px}',
    '.ptn-r p,.ptn-gn{margin:2px 0 4px;font-size:12px;line-height:1.45;color:#85837F}',
    '.ptn-r.off{opacity:.38}.ptn-r.off p:after{content:" (not active with the current settings)";color:#B4B0AA}',
    '.ptn-toast{position:fixed;z-index:2147483002;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 70px);transform:translateX(-50%);padding:10px 14px;border-radius:12px;background:#F5F3EF;color:#0b0b0d;font-size:13px;font-weight:500;opacity:0;transition:opacity .2s;pointer-events:none;max-width:90vw}',
    '.ptn-toast.on{opacity:1}',
    '@media(min-width:900px){.ptn-toast{left:auto;right:400px;transform:none}}',
  ].join('\n');
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  var pill = document.createElement('button'); pill.className = 'ptn ptn-pill'; pill.textContent = 'Prism tuner';
  var panel = document.createElement('aside'); panel.className = 'ptn ptn-panel'; panel.setAttribute('aria-label', 'Prism tuner');
  panel.innerHTML = '<div class="ptn-hd"><select aria-label="Element"></select><button class="ptn-b" data-a="cmp" title="Hold to see the element without your edits">Compare</button><button class="ptn-b" data-a="pick">Pick</button><button class="ptn-b" data-a="close" aria-label="Close">✕</button></div><div class="ptn-bd"></div>';
  var toastEl = document.createElement('div'); toastEl.className = 'ptn ptn-toast'; document.body.appendChild(toastEl);
  function toast(msg) { toastEl.textContent = msg; toastEl.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(function () { toastEl.classList.remove('on'); }, 2200); }
  var hl = document.createElement('div'); hl.className = 'ptn-hl'; hl.style.display = 'none';
  document.body.appendChild(pill); document.body.appendChild(panel); document.body.appendChild(hl);
  var sel = panel.querySelector('select'), bd = panel.querySelector('.ptn-bd');
  var list = [], cur = null, tab = null;

  function open() { panel.classList.add('on'); refreshList(); }
  function close() { panel.classList.remove('on'); hl.style.display = 'none'; picking(false); }
  pill.onclick = function () { panel.classList.contains('on') ? close() : open(); };
  /* hold Compare to see the element as visitors see it now, without your edits */
  (function () { var b = panel.querySelector('[data-a="cmp"]'), down = function (e) { e.preventDefault(); if (!cur) return; b.classList.add('on'); var keep = saved[idOf(cur.el)]; delete saved[idOf(cur.el)]; apply(cur); saved[idOf(cur.el)] = keep; if (!keep) delete saved[idOf(cur.el)]; }, up = function () { if (!b.classList.contains('on')) return; b.classList.remove('on'); if (cur) apply(cur); };
    b.addEventListener('pointerdown', down); b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up); })();
  panel.querySelector('[data-a="close"]').onclick = close;

  function refreshList() {
    list = targets();
    sel.innerHTML = list.map(function (t, i) { var l = labelOf(t); return '<option value="' + i + '">' + l.kind + ' · ' + l.name + ' (' + l.preset + ')' + (saved[idOf(t.el)] ? ' •' : '') + '</option>'; }).join('');
    if (!list.length) { bd.innerHTML = '<p class="ptn-meta">No Prism elements on this page yet.</p>'; return; }
    var i = cur ? list.findIndex(function (t) { return t.el === cur.el; }) : 0;
    select(list[i < 0 ? 0 : i]);
  }
  sel.onchange = function () { select(list[+sel.value]); };
  function select(t) {
    cur = t; sel.value = String(list.indexOf(t));
    var fxs = Object.keys(t.fx); if (!tab || fxs.indexOf(tab) < 0) tab = fxs[0];
    render(); highlight();
  }
  function highlight() {
    if (!cur || !panel.classList.contains('on')) { hl.style.display = 'none'; return; }
    var r = cur.el.getBoundingClientRect(); hl.style.display = 'block';
    hl.style.left = r.left - 3 + 'px'; hl.style.top = r.top - 3 + 'px'; hl.style.width = r.width + 6 + 'px'; hl.style.height = r.height + 6 + 'px';
  }
  addEventListener('scroll', highlight, { passive: true }); addEventListener('resize', highlight);
  /* tap any effect on the page to edit it */
  var pickOn = false;
  function picking(on) { pickOn = on; document.documentElement.classList.toggle('ptn-picking', on); panel.querySelector('[data-a="pick"]').classList.toggle('on', on); }
  panel.querySelector('[data-a="pick"]').onclick = function () { picking(!pickOn); };
  document.addEventListener('click', function (e) {
    if (!pickOn || panel.contains(e.target) || e.target === pill) return;
    e.preventDefault(); e.stopPropagation();
    var ts = targets(), x = e.clientX, y = e.clientY, hit = null;
    ts.forEach(function (t) { var r = t.el.getBoundingClientRect(); if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) { if (!hit || t.fx.statue || t.fx.sparkle) hit = t; } });
    picking(false); if (hit) { refreshList(); select(list.find(function (t) { return t.el === hit.el; })); }
  }, true);

  var fmt = function (v, step) { v = +v; return step >= 1 ? String(Math.round(v)) : v.toFixed(step < .1 ? 2 : 1); };
  function render() {
    var t = cur, l = labelOf(t), bps = P.activeBreakpoints(), now = bps.indexOf('mobile') >= 0 ? 'phone' : bps.indexOf('tablet') >= 0 ? 'tablet' : 'desktop';
    var fxs = Object.keys(t.fx), S = t.fx[tab].settings, scroll = bd.scrollTop;
    var h = '<div class="ptn-meta"><span>' + l.kind + ' · preset “' + esc(l.preset) + '”</span><span>' + P.perf.fps + ' fps · quality ' + ['full', 'high', 'lite'][P.perf.level] + '</span></div>';
    h += '<div class="ptn-seg" data-k="tab">' + fxs.map(function (f) { return '<button data-v="' + f + '" aria-pressed="' + (f === tab) + '">' + f[0].toUpperCase() + f.slice(1) + '</button>'; }).join('') + '</div>';
    h += '<div class="ptn-g">Apply changes to</div><div class="ptn-seg" data-k="scope">' + [['all', 'All sizes'], ['tablet', 'Tablet & phone'], ['mobile', 'Phone']].map(function (s) { return '<button data-v="' + s[0] + '" aria-pressed="' + (scope === s[0]) + '">' + s[1] + '</button>'; }).join('') + '</div>';
    if (scope !== 'all' && bps.indexOf(scope) < 0) h += '<p class="ptn-gn">You’re on ' + now + ', so these values won’t show here. Narrow the window or open this page on a phone to see them.</p>';
    h += '<p class="ptn-gn">Double-click a setting’s name to undo your change. Tap a number to type an exact value. Hold Compare to see it without your edits.</p>';
    var layer = layerFor(t, tab);
    SPECS[tab].forEach(function (s, i) {
      if (s.grp) { h += '<div class="ptn-g">' + s.grp + '</div>' + (s.note ? '<p class="ptn-gn">' + s.note + '</p>' : ''); return; }
      var key = s.seg || s.k, edited = getPath(layer, key) !== undefined, live = !s.w || s.w(S);
      var lab = '<span data-reset="' + i + '" title="Double-click to undo">' + s.l + (edited ? '<i>edited</i>' : '') + '</span>';
      if (s.seg) {
        var v = current(t, tab, key);
        h += '<div class="ptn-r' + (live ? '' : ' off') + '"><div class="t">' + lab + '</div><div class="ptn-seg" data-i="' + i + '">' + s.opts.map(function (o) { return '<button data-v="' + o[0] + '" aria-pressed="' + (String(v) === String(o[0])) + '">' + o[1] + '</button>'; }).join('') + '</div>' + (s.h ? '<p>' + s.h + '</p>' : '') + '</div>';
        return;
      }
      var val = current(t, tab, key);
      h += '<div class="ptn-r' + (live ? '' : ' off') + '"><div class="t">' + lab + '<b data-edit="' + i + '" title="Tap to type a value">' + fmt(val, s.step) + s.u + '</b></div><input type="range" data-i="' + i + '" min="' + s.min + '" max="' + s.max + '" step="' + s.step + '" value="' + val + '" aria-label="' + s.l + '">' + (s.h ? '<p>' + s.h + '</p>' : '') + '</div>';
    });
    var opt = optionsFor(t), hasEdits = !!saved[idOf(t.el)], sw = settingsWith(t);
    h += '<div class="ptn-out"><b style="font-size:13.5px">Only this element</b><p>In the Designer, set the custom attribute <code>data-prism-options</code> on this element to:</p><textarea readonly data-o="opt">' + esc(JSON.stringify(opt)) + '</textarea><div class="row"><button class="ptn-b pri" data-c="opt">Copy value</button><button class="ptn-b" data-a="reset">' + (hasEdits ? 'Undo all edits here' : 'No changes yet') + '</button></div></div>';
    h += '<div class="ptn-out"><b style="font-size:13.5px">Every element using “' + esc(sw.name) + '”</b><p>Replace your head code with this, with these changes saved into the preset:</p><textarea readonly data-o="cfg">' + esc(sw.text) + '</textarea><div class="row"><button class="ptn-b pri" data-c="cfg">Copy head code</button></div></div>';
    h += '<p class="ptn-gn" style="margin-top:12px">Changes stay in this browser so you can reload. Visitors never see them until you paste them into Webflow.</p>';
    bd.innerHTML = h; bd.scrollTop = scroll;

    bd.querySelectorAll('.ptn-seg[data-k] button').forEach(function (b) { b.onclick = function () { var k = b.parentNode.getAttribute('data-k'); if (k === 'tab') tab = b.dataset.v; else scope = b.dataset.v; render(); }; });
    bd.querySelectorAll('.ptn-seg[data-i] button').forEach(function (b) { b.onclick = function () { var s = SPECS[tab][+b.parentNode.dataset.i], v = b.dataset.v; edit(s.seg, v === 'true' ? true : v === 'false' ? false : isNaN(+v) ? v : +v); render(); }; });
    bd.querySelectorAll('input[type=range]').forEach(function (r) {
      r.oninput = function () { var s = SPECS[tab][+r.dataset.i]; edit(s.k, +r.value); r.previousElementSibling.querySelector('b').textContent = fmt(r.value, s.step) + s.u; };
      r.onchange = function () { render(); };
    });
    /* double-click (or double-tap) a name: undo your edit; if there is none, go to the library default */
    bd.querySelectorAll('[data-reset]').forEach(function (n) {
      var lastTap = 0, s = SPECS[tab][+n.dataset.reset], key = s.seg || s.k;
      var reset = function () {
        var layer = layerFor(cur, tab);
        if (getPath(layer, key) !== undefined) { unset(layer, key); persist(); apply(cur); toast(s.l + ': back to ' + fmt0(baseline(cur, tab, key), s) + ' (your settings block)'); }
        else { var d = libDefault(tab, key); if (d === undefined) return; edit(key, d); toast(s.l + ': library default, ' + fmt0(d, s)); }
        render(); refreshListLabels();
      };
      n.addEventListener('dblclick', reset);
      n.addEventListener('touchend', function (e) { var t2 = Date.now(); if (t2 - lastTap < 320) { e.preventDefault(); reset(); } lastTap = t2; });
    });
    /* tap a number to type an exact value */
    bd.querySelectorAll('[data-edit]').forEach(function (b) {
      b.onclick = function () {
        var s = SPECS[tab][+b.dataset.edit], inp = document.createElement('input');
        inp.type = 'number'; inp.step = s.step; inp.min = s.min; inp.max = s.max; inp.value = current(cur, tab, s.k); inp.setAttribute('aria-label', s.l);
        b.replaceWith(inp); inp.focus(); inp.select();
        var done = function (ok) { var v = parseFloat(inp.value); if (ok && !isNaN(v)) edit(s.k, Math.min(s.max * 4, Math.max(s.min, v))); render(); };
        inp.onkeydown = function (e) { if (e.key === 'Enter') done(true); if (e.key === 'Escape') done(false); };
        inp.onblur = function () { done(true); };
      };
    });
    bd.querySelectorAll('[data-c]').forEach(function (b) { b.onclick = function () { var ta = bd.querySelector('[data-o="' + b.dataset.c + '"]'); copy(ta.value, b, ta); }; });
    var rs = bd.querySelector('[data-a="reset"]'); rs.onclick = function () { if (!hasEdits) return; delete saved[idOf(t.el)]; persist(); apply(t); render(); refreshListLabels(); toast('All edits on this element undone'); };
  }
  function fmt0(v, s) { if (s.seg) { var o = s.opts.find(function (x) { return String(x[0]) === String(v); }); return o ? o[1] : String(v); } return fmt(v, s.step) + s.u; }
  function unset(layer, key) {
    var ks = key.split('.'); if (ks.length === 1) { delete layer[key]; return; }
    var root = ks[0]; if (U.isObj(layer[root])) { delete layer[root][ks[1]]; if (!Object.keys(layer[root]).length) delete layer[root]; }
  }
  function refreshListLabels() { [].forEach.call(sel.options, function (o, i) { var t = list[i], l = labelOf(t); o.textContent = l.kind + ' · ' + l.name + ' (' + l.preset + ')' + (saved[idOf(t.el)] ? ' •' : ''); }); }
  function edit(key, v) {
    var layer = layerFor(cur, tab);
    if (key.indexOf('.') > 0) { var ks = key.split('.'); if (!U.isObj(layer[ks[0]])) layer[ks[0]] = {}; layer[ks[0]][ks[1]] = v; }
    else layer[key] = v;
    persist(); apply(cur); clearTimeout(edit.t); edit.t = setTimeout(function () { var o = bd.querySelector('[data-o="opt"]'), c = bd.querySelector('[data-o="cfg"]'); if (o) o.value = JSON.stringify(optionsFor(cur)); if (c) c.value = settingsWith(cur).text; refreshListLabels(); }, 150);
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function copy(text, btn, ta) {
    var done = function () { var o = btn.textContent; btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = o; }, 1400); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { ta.select(); try { document.execCommand('copy'); done(); } catch (e) {} });
    else { ta.select(); try { document.execCommand('copy'); done(); } catch (e) {} }
  }

  /* re-apply saved edits on load, so the staging page keeps showing your tuning */
  function restore() { targets().forEach(function (t) { if (saved[idOf(t.el)]) apply(t); }); }
  restore(); setTimeout(restore, 1200);
  setInterval(function () { if (panel.classList.contains('on') && cur) { var m = bd.querySelector('.ptn-meta span:last-child'); if (m) m.textContent = P.perf.fps + ' fps · quality ' + ['full', 'high', 'lite'][P.perf.level]; } }, 1000);

  P.tuner = { open: open, close: close, edits: saved, clear: function () { saved = {}; persist(); location.reload(); }, stop: function () { try { sessionStorage.removeItem('prism-tune'); } catch (e) {} location.href = location.href.replace(/([?&])prism-tune[^&]*&?/, '$1').replace(/[?&]$/, ''); } };
  console.info('Prism tuner ready. Prism.tuner.stop() closes it for this tab.');
})();
