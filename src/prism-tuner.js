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

  /* ── What can be tuned ── */
  var G = function (label) { return { grp: label }; };
  var SEG = function (k, label, opts) { return { seg: k, label: label, opts: opts }; };
  var SPECS = {
    aurora: [
      SEG('bg', 'Form', [['conic', 'Conic'], ['radial', 'Radial'], ['splotch', 'Splotch'], ['none', 'Off']]),
      SEG('bgPal', 'Colour', [['crystal', 'Crystal'], ['gold', 'Gold'], ['vishanti', 'Vishanti'], ['mock', 'Iris'], ['spectrum', 'Spectrum']]),
      ['bgInt', 'Intensity', 0, 90, 1], ['bgDrift', 'Spin °/s', -6, 6, .05], ['bgSweep', 'Arrival turn', -90, 90, 1],
      ['bgSpread', 'Spread', 40, 360, 5], ['bgFeather', 'Edge softness', 0, 80, 1], ['bgRadius', 'Radius', 20, 140, 1],
      ['blobs', 'Blobs', 2, 16, 1], ['blobSize', 'Blob size', 20, 140, 1],
      ['bgCentre', 'Centre fade', 0, 100, 1], ['bgEdge', 'Edge fade', 0, 100, 1],
      ['bgHue', 'Hue shift', -180, 180, 1], ['bgSat', 'Saturation', 0, 160, 1], ['bgLight', 'Lightness', 40, 130, 1], ['grain', 'Grain', 0, 80, 1],
      G('Where the light sits'), ['x', 'Horizontal %', 0, 100, 1], ['y', 'Vertical %', 0, 100, 1], ['anchorY', 'Height on anchor', 0, 1, .01],
      G('Performance'), ['resolution', 'Render scale', .3, 1, .05], ['fadeIn', 'Fade in ms', 600, 4000, 50], SEG('fps', 'Frame rate', [[24, '24'], [30, '30'], [60, '60']]),
    ],
    statue: [
      SEG('palette', 'Light colour', [['prism', 'Prism'], ['diamond', 'Diamond'], ['crystal', 'Crystal'], ['champagne', 'Champagne'], ['shard', 'Shard']]),
      SEG('mode', 'Drawing', [['replace', 'Full GPU'], ['overlay', 'Light on top']]),
      ['light', 'Light strength', 0, 1.6, .01], ['tint', 'Tint', 0, 1, .01], ['clarity', 'Clarity', 0, 1, .01],
      ['speed', 'Sweep speed', 0, 1, .01], ['flow', 'Flow', 0, 3, .01], ['flowScale', 'Flow size', .3, 4, .01],
      ['scale', 'Band count', .5, 6, .01], ['sharp', 'Band focus', 1, 8, .01], ['disp', 'Dispersion', 0, 1, .01], ['edge', 'Edge refraction', 0, 2, .01],
      ['glitter', 'Glitter', 0, 1, .01], ['gsize', 'Glitter size', 8, 48, 1], ['twinkle', 'Glitter twinkle', 0, 1.5, .01],
      SEG('quality', 'Sharpness', [[1, 'Battery'], [1.5, 'Balanced'], [2, 'Sharp']]),
      SEG('fps', 'Frame rate', [[24, '24'], [30, '30'], [60, '60']]),
    ],
    sparkle: [
      ['glints', 'Glints', 0, 160, 1], ['glintSize', 'Glint size', 10, 200, 1], ['glintStr', 'Glint strength', 0, 100, 1],
      ['dust', 'Dust', 0, 400, 5], ['dustStr', 'Dust strength', 0, 100, 1], ['dustSpread', 'Dust spread', .3, 2.5, .05],
      ['halo', 'Halo', 0, 100, 1], ['bloom', 'Bloom', 0, 60, 1], ['glintRate', 'Twinkle /s', .05, 1, .05], ['warmth', 'Warmth %', 0, 100, 1],
      ['flares', 'Flares', 0, 16, 1], ['flareStr', 'Flare strength', 0, 100, 1], ['ghosts', 'Reflections', 0, 10, 1], ['ghostStr', 'Reflection strength', 0, 100, 1],
      G('Light source on the image'), ['origin.x', 'Horizontal', 0, 1, .01], ['origin.y', 'Vertical', 0, 1, .01],
      G('Performance'), SEG('quality', 'Sharpness', [[1, 'Battery'], [1.5, 'Balanced'], [2, 'Sharp']]), SEG('fps', 'Frame rate', [[24, '24'], [30, '30'], [60, '60']]),
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
  ].join('\n');
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  var pill = document.createElement('button'); pill.className = 'ptn ptn-pill'; pill.textContent = 'Prism tuner';
  var panel = document.createElement('aside'); panel.className = 'ptn ptn-panel'; panel.setAttribute('aria-label', 'Prism tuner');
  panel.innerHTML = '<div class="ptn-hd"><select aria-label="Element"></select><button class="ptn-b" data-a="pick">Pick</button><button class="ptn-b" data-a="close" aria-label="Close">✕</button></div><div class="ptn-bd"></div>';
  var hl = document.createElement('div'); hl.className = 'ptn-hl'; hl.style.display = 'none';
  document.body.appendChild(pill); document.body.appendChild(panel); document.body.appendChild(hl);
  var sel = panel.querySelector('select'), bd = panel.querySelector('.ptn-bd');
  var list = [], cur = null, tab = null;

  function open() { panel.classList.add('on'); refreshList(); }
  function close() { panel.classList.remove('on'); hl.style.display = 'none'; picking(false); }
  pill.onclick = function () { panel.classList.contains('on') ? close() : open(); };
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

  function render() {
    var t = cur, l = labelOf(t), bps = P.activeBreakpoints(), now = bps.indexOf('mobile') >= 0 ? 'mobile' : bps.indexOf('tablet') >= 0 ? 'tablet' : 'desktop';
    var fxs = Object.keys(t.fx);
    var h = '<div class="ptn-meta"><span>' + l.kind + ' · preset “' + l.preset + '”</span><span>' + P.perf.fps + ' fps · quality ' + ['full', 'high', 'lite'][P.perf.level] + '</span></div>';
    h += '<div class="ptn-seg" data-k="tab">' + fxs.map(function (f) { return '<button data-v="' + f + '" aria-pressed="' + (f === tab) + '">' + f[0].toUpperCase() + f.slice(1) + '</button>'; }).join('') + '</div>';
    h += '<div class="ptn-g">Apply changes to</div><div class="ptn-seg" data-k="scope">' + [['all', 'All sizes'], ['tablet', 'Tablet & phone'], ['mobile', 'Phone']].map(function (s) { return '<button data-v="' + s[0] + '" aria-pressed="' + (scope === s[0]) + '">' + s[1] + '</button>'; }).join('') + '</div>';
    if (scope !== 'all' && bps.indexOf(scope) < 0) h += '<div class="ptn-meta"><span>You’re on ' + now + ', so these values won’t show here. Narrow the window or open this on a phone to see them.</span></div>';
    var layer = layerFor(t, tab);
    SPECS[tab].forEach(function (s, i) {
      if (s.grp) { h += '<div class="ptn-g">' + s.grp + '</div>'; return; }
      if (s.seg) { var v = current(t, tab, s.seg); h += '<div class="ptn-r"><div class="t"><span>' + s.label + (getPath(layer, s.seg) !== undefined ? '<i>edited</i>' : '') + '</span></div><div class="ptn-seg" data-i="' + i + '">' + s.opts.map(function (o) { return '<button data-v="' + o[0] + '" aria-pressed="' + (String(v) === String(o[0])) + '">' + o[1] + '</button>'; }).join('') + '</div></div>'; return; }
      var val = current(t, tab, s[0]);
      h += '<div class="ptn-r"><div class="t"><span>' + s[1] + (getPath(layer, s[0]) !== undefined ? '<i>edited</i>' : '') + '</span><b>' + (+val).toFixed(s[4] >= 1 ? 0 : 2) + '</b></div><input type="range" data-i="' + i + '" min="' + s[2] + '" max="' + s[3] + '" step="' + s[4] + '" value="' + val + '" aria-label="' + s[1] + '"></div>';
    });
    var opt = optionsFor(t), hasEdits = !!saved[idOf(t.el)], sw = settingsWith(t);
    h += '<div class="ptn-out"><b style="font-size:13.5px">Only this element</b><p>In the Designer, set the custom attribute <code>data-prism-options</code> on this element to:</p><textarea readonly data-o="opt">' + esc(JSON.stringify(opt)) + '</textarea><div class="row"><button class="ptn-b pri" data-c="opt">Copy value</button><button class="ptn-b" data-a="reset">' + (hasEdits ? 'Reset this element' : 'No changes yet') + '</button></div></div>';
    h += '<div class="ptn-out"><b style="font-size:13.5px">Every element using “' + esc(sw.name) + '”</b><p>Replace your head code with this, with these changes saved into the preset:</p><textarea readonly data-o="cfg">' + esc(sw.text) + '</textarea><div class="row"><button class="ptn-b pri" data-c="cfg">Copy head code</button></div></div>';
    h += '<p class="ptn-meta" style="margin-top:12px"><span>Changes stay in this browser so you can reload. Visitors never see them until you paste them into Webflow.</span></p>';
    bd.innerHTML = h;
    bd.querySelectorAll('.ptn-seg[data-k] button').forEach(function (b) { b.onclick = function () { var k = b.parentNode.getAttribute('data-k'); if (k === 'tab') tab = b.dataset.v; else scope = b.dataset.v; render(); }; });
    bd.querySelectorAll('.ptn-seg[data-i] button').forEach(function (b) { b.onclick = function () { var s = SPECS[tab][+b.parentNode.dataset.i], v = b.dataset.v; edit(s.seg, isNaN(+v) ? v : +v); render(); }; });
    bd.querySelectorAll('input[type=range]').forEach(function (r) {
      r.oninput = function () { var s = SPECS[tab][+r.dataset.i]; edit(s[0], +r.value); r.previousElementSibling.querySelector('b').textContent = (+r.value).toFixed(s[4] >= 1 ? 0 : 2); };
      r.onchange = function () { render(); };
    });
    bd.querySelectorAll('[data-c]').forEach(function (b) { b.onclick = function () { var ta = bd.querySelector('[data-o="' + b.dataset.c + '"]'); copy(ta.value, b, ta); }; });
    var rs = bd.querySelector('[data-a="reset"]'); rs.onclick = function () { if (!hasEdits) return; delete saved[idOf(t.el)]; persist(); apply(t); render(); refreshListLabels(); };
  }
  function refreshListLabels() { [].forEach.call(sel.options, function (o, i) { var t = list[i], l = labelOf(t); o.textContent = l.kind + ' · ' + l.name + ' (' + l.preset + ')' + (saved[idOf(t.el)] ? ' •' : ''); }); }
  function edit(key, v) {
    var layer = layerFor(cur, tab);
    if (key.indexOf('.') > 0) { var root = key.split('.')[0], full = U.clone(current(cur, tab, root)); setPath(full, key.slice(root.length + 1), v); layer[root] = full; }
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
