# Prism FX v2.3.0

Three separate effects for Webflow, switched on with custom attributes and tuned from one JSON settings block:

- **Aurora:** the slow-turning fan of colour. It goes on any section you mark, and each section gets its own.
- **Statue:** refracted light flowing over a transparent cutout, drawn on the GPU.
- **Sparkle:** floating dust, rays of coloured light, glints on the cutout's outline, a halo around the shape, and bloom.

The needle rays, pulse and intro ring from the studies have been removed.

## Files

```
src/prism-core.js      shared helpers, settings, one animation loop, image overlay, start-up   (load first)
src/prism-aurora.js    Aurora tab
src/prism-statue.js    Statue tab (GPU shader)
src/prism-sparkle.js   Sparkle tab (dust, rays, glints, halo, bloom)
dist/prism.min.js      aurora, statue and sparkle in one file: 42 KB, about 17 KB compressed
dist/prism-tuner.min.js  the tuner; loads only with ?prism-tune, so visitors never download it
src/prism-tuner.js     the on-page tuner (never loads for visitors)
dist/*.min.js          each module on its own
examples/              a local test page and copy-paste Webflow snippets
lab/prism-lab.html     the tuning Lab, offline copy
```

For a single file, use `dist/prism.min.js`. To load only some effects, load `prism-core.min.js` first, then any of the others.

## Publishing on GitHub and jsDelivr

1. Push this folder to a **public** GitHub repo.
2. Create a version tag: `git tag v2.3.0 && git push --tags`, or use a GitHub Release.
3. The script URL is:
   `https://cdn.jsdelivr.net/gh/YOUR-USER/YOUR-REPO@v2.3.0/dist/prism.min.js`

Tag each new release (`v2.3.1`, `v2.4.0`…) and change the version in the URL. Links to a branch like `@main` are cached for hours, so your changes look like they aren't arriving. If you have to refresh a URL, open `https://purge.jsdelivr.net/gh/YOUR-USER/YOUR-REPO@v2.3.0/dist/prism.min.js`.

Two links that won't work as a script source: `raw.githubusercontent.com/...` and `github.com/.../blob/...`.

## Webflow setup

**1. Settings: Site settings › Custom code › Head code.**

```html
<script type="application/json" data-prism-config>
{
  "aurora": { "default": { "bgInt": 45 }, "hero": { "bgInt": 60, "anchor": "#liberty" } },
  "image":  { "default": {}, "liberty": { "sparkle": { "dust": 90 } } }
}
</script>
```

This block holds every value, so client changes happen here and the library never needs editing. It must be valid JSON: write `0.6`, not `.6`, and use no trailing commas.

**2. Library: Site settings › Custom code › Footer code.**

```html
<script src="https://cdn.jsdelivr.net/gh/YOUR-USER/YOUR-REPO@v2.3.0/dist/prism.min.js" defer></script>
```

**3. Attributes, in the Designer under Element settings › Custom attributes.**

| Put it on | Name | Value | What it does |
|---|---|---|---|
| any section or div | `data-prism-aurora` | preset name, or empty for `default` | that section gets its own aurora behind its content |
| a transparent image | `data-prism` | preset name | Statue and Sparkle |
| a transparent image | `data-prism-statue` | preset name | Statue only |
| a transparent image | `data-prism-sparkle` | preset name | Sparkle only |
| any of the above | `data-prism-options` | JSON, e.g. `{"sparkle":{"dust":20}}` | one-off override for this element |
| any of the above | `data-prism-manual` | (none) | skip automatic start-up; start it yourself with `Prism.mount()` |

**4. Publish and check the live domain.** Custom code doesn't run in the Designer canvas.

## Prism Lab

`lab/prism-lab.html` (or the published Lab link) is where you tune everything. It runs this exact library.

- **Aurora tab:** one aurora preset at a time. Make one per section style with **New**, then rename it; the name is the attribute value.
- **Sparkle and Statue tabs:** one image preset at a time, shared by both tabs, with a switch for each effect.
- **Save & export:**
  - **Versions:** named snapshots for client rounds. The current work auto-saves to your account on the published link.
  - **Step 1:** the head-code settings block.
  - **Step 2:** the footer script tag, built from your GitHub user, repo and version tag.
  - **Step 3:** the attributes to add in the Designer, listed by preset name.
  - **Bring settings back in:** paste the head code from Webflow to keep tuning. It also accepts exports from the older Labs.

## Tuning on your real site

Open any page of your staging site with `?prism-tune` at the end of the URL, for example `https://yoursite.webflow.io/?prism-tune`. A **Prism tuner** button appears at the bottom left. The tuner file loads only when that URL parameter is there, so visitors never download it.

1. Pick an element from the list, or tap **Pick** and then tap a section or image on the page.
2. Choose which effect to edit: Aurora, Statue or Sparkle.
3. Choose **All sizes**, **Tablet & phone**, or **Phone**. Phone-only values only show at phone width, so narrow the window or open the page on a phone to see them.
4. Move the sliders. The real page updates live, and edited values are marked. Every setting explains what it does; settings that have no effect with your current values are dimmed and say so.
   - **Double-click a setting's name** (double-tap on a phone) to undo your change. If there's nothing to undo, it goes to the library default.
   - **Tap a number** to type an exact value.
   - **Hold Compare** to see the element without your edits.
5. Copy the result, in one of two ways:
   - **Only this element:** paste the value into that element's `data-prism-options` custom attribute.
   - **Every element using the preset:** replace your head code with the updated settings block.

Your edits stay in that browser, so you can reload and keep going. They don't reach visitors until you paste them into Webflow and publish. `Prism.tuner.stop()` in the console closes the tuner for that tab. If you load the library under a different file name, run `Prism.tune()` in the console to open the tuner.

## Breakpoints

Any preset, and any `data-prism-options`, can hold `tablet` and `mobile` values. These match Webflow's breakpoints: tablet is 991px and below, mobile is 767px and below.

```json
"liberty": {
  "sparkle": { "dust": 120 },
  "mobile":  { "sparkle": { "dust": 40 }, "statue": { "quality": 1.5 } }
}
```

Values update live when the screen crosses a breakpoint.

## Performance

- **Size:** 39 KB minified, about 16 KB compressed, loaded with `defer`. It never blocks the page from drawing or delays your images.
- **Layout:** effects sit in absolutely positioned layers with `contain: strict`, so they cause no layout shift and no reflow of your content.
- **One animation loop:** each frame measures all images first, then draws, so the browser never re-calculates the page layout mid-frame. The loop stops completely when nothing is on screen.
- **GPU budget:** an image's GPU work pauses the moment it leaves the screen and resumes instantly when it returns. Past 6 live contexts, the one seen longest ago is released.
- **Adaptive quality:** if a device drops below about 45 fps for 1.5 seconds, Prism steps quality down. Statue sharpness goes down, the aurora renders at a lower resolution, and there are fewer glints and less dust. It steps back up after 12 smooth seconds. Devices with Save-Data on or under 4 GB of memory start one step down. To control it yourself, set `"performance": { "adaptive": false, "level": 0 }` in the settings block (levels 0, 1, 2).
- **Pixel budgets:** the Statue's GPU canvas covers only the picture, never the sparkle margin around it. Its sharpness is capped so one image never draws more than `statue.maxPixels` (default 1.2 million). Sparkle is capped at `sparkle.maxPixels` (1.5 million) and draws at 1.25× density, because dust and flares are soft.
- **Frame caps:** aurora, statue and sparkle redraw at `fps: 30` by default. The motion is slow, so it looks the same as 60 at half the work. Set `fps` to 24, 30 or 60 per preset. Image positions still track every frame, so Interactions stay smooth.
- **Transparent pixels are skipped:** the light math only runs where the cutout has content.
- **Right-sized textures:** each picture is scaled to what will actually be drawn before it goes to the GPU, never the full original.
- **Heavy work off the critical path:** the outline tracing for Sparkle runs when the browser is idle.

## Settings reference

Anything you leave out uses the default below. Presets merge on top of `default`, and `data-prism-options` merges on top of the preset.

### `aurora.<preset>`

| Key | Default | Meaning |
|---|---|---|
| `bg` | `"conic"` | form: `conic`, `radial`, `splotch` or `none` |
| `bgPal` | `"crystal"` | colour: `crystal`, `gold`, `vishanti`, `mock` (Iris) or `spectrum` |
| `bgInt` | `55` | intensity, 0–90 (capped at 90 for flash safety) |
| `bgDrift` | `0.6` | spin in degrees per second; negative turns the other way |
| `bgSweep` | `18` | degrees it turns while fading in |
| `bgSpread` / `bgFeather` | `210` / `34` | width of the fan and softness of its edges, in degrees |
| `bgRadius` | `85` | radial form: size in % |
| `blobs` / `blobSize` | `7` / `75` | splotch form: number and size |
| `bgCentre` / `bgEdge` | `55` / `15` | darkening of the middle, and fade toward the edges |
| `bgHue` / `bgSat` / `bgLight` | `0` / `100` / `100` | colour adjustments |
| `grain` | `22` | film grain, 0–80 |
| `x` / `y` | `50` / `40` | centre of the light, as % of the section |
| `anchor` / `anchorY` | `""` / `0.36` | CSS selector to centre the light on an element instead; `anchorY` is how far down that element (0 top, 1 bottom) |
| `fadeIn` | `1600` | fade-in in ms |
| `resolution` | `0.6` | render scale; the aurora is soft, so it's drawn small and scaled up to save battery |
| `fps` | `30` | redraws per second |
| `zIndex` | `-1` | layer order inside the section; `-1` keeps it behind the section's content |

### `image.<preset>`

| Key | Default | Meaning |
|---|---|---|
| `effects` | `["statue","sparkle"]` | which effects `data-prism` turns on |
| `pad` | `0.3` | how far sparkle may reach past the image, × image height |
| `statue.mode` | `"replace"` | `replace` draws the whole picture on the GPU; `overlay` keeps the real image and only adds light |
| `statue.palette` | `"prism"` | `prism`, `diamond`, `crystal`, `champagne`, `shard` or `thermal` |
| `statue.light` / `tint` / `clarity` | `1` / `0.08` / `0.4` | light strength, palette tint, sharpening |
| `statue.speed` / `flow` / `flowScale` | `0.22` / `1.15` / `1.5` | sweep speed, how much the light bends, swirl size |
| `statue.scale` / `sharp` / `disp` / `edge` | `2.1` / `2.6` / `0.45` / `0.75` | band count, band focus, dispersion, edge refraction |
| `statue.glitter` / `gsize` / `twinkle` | `0.45` / `20` / `0.7` | GPU glitter amount, size and rate |
| `statue.quality` | `2` | pixel-density cap: 1 saves battery, 2 is sharp |
| `statue.maxPixels` / `statue.fps` | `1200000` / `30` | most pixels one image may draw, and redraws per second |
| `sparkle.glints` / `glintSize` / `glintStr` | `52` / `95` / `85` | glints on the outline: count, size, strength |
| `sparkle.dust` / `dustStr` / `dustSpread` / `dustSize` | `90` / `55` / `1.15` / `1` | dust: count (up to 1000), brightness, how far it floats, speck size |
| `sparkle.glintRate` | `0.45` | twinkle per second (capped at 1) |
| `sparkle.warmth` | `72` | % of sparkles that are gold rather than icy |
| `sparkle.halo` / `bloom` | `50` / `45` | glow around the outline, and glow at the light source |
| `sparkle.flares` / `flareStr` | `6` / `42` | rays: count (up to 24), brightness |
| `sparkle.flarePal` | `"crystal"` | ray colours: `crystal`, `warm`, `cool`, `spectrum` or `white` |
| `sparkle.flareHue` / `flareSat` | `0` / `100` | turn the ray colours (degrees), and how rich they are (%) |
| `sparkle.flareLen` / `flareWidth` / `flareSpin` | `1` / `1` / `0.9` | ray length, ray width, and turn speed in degrees per second |
| `sparkle.quality` / `maxPixels` / `fps` | `1.25` / `1500000` / `30` | density cap, pixel budget, redraws per second |
| `sparkle.origin` | `{"x":0.5,"y":0.36}` | where the light comes from on the image |

## How it behaves

- **The image is never moved or rewrapped.** Effects draw on a layer next to it that follows its position, size and opacity every frame. Webflow layout and Interactions that move or fade the image keep working. Rotation isn't followed.
- **Only what's on screen runs.** An image's GPU context starts when the image comes near the viewport and is released when it leaves, so 4–10 images per page stay well under browser limits. Auroras pause off screen.
- **Lady Liberty never disappears.** If the GPU or the image read fails, the original image stays, with no effect.
- **Reduce Motion:** if a visitor has it on, everything settles to a still frame.

## Troubleshooting

Open the browser console on the published site. Every message from this library starts with `Prism:`.

| Message or symptom | Fix |
|---|---|
| `could not read the image (the host must allow CORS)` | The GPU can only read images from hosts that allow it. Host the cutout somewhere that sends `Access-Control-Allow-Origin: *`, or point `data-prism-src` on the `<img>` at a copy that does. |
| `a settings block is not valid JSON` | Fix the JSON in the head block. Common causes are `.6` instead of `0.6`, trailing commas, or curly quotes pasted from a doc. |
| `no "image" preset called "…"` | The attribute value doesn't match a preset name in the settings. Names are case-sensitive. |
| Nothing happens, no messages | The script isn't loading. Check the jsDelivr URL opens in a browser tab, and that it's in Footer code with `defer`. |
| Old behaviour after a push | You're on a cached `@main`. Tag a new version and update the URL, or purge it. |
| Sparkle is cut off at the edges | A parent element has `overflow: hidden`. Loosen it, or lower `pad`. |
| Content added later (CMS, tabs) has no effect | Call `Prism.refresh()` after it appears. |

## Script access

```js
Prism.refresh();                                          // start effects on newly added elements
Prism.get(el, 'aurora').set('bgDrift', 1.2);              // change a live value
Prism.get(img, 'sparkle').set('dust', 200);
Prism.mount('statue', img, { statue: { light: 1.2 } });   // start by hand (use with data-prism-manual)
```

## Coming from v1 (prism-liberty)

`[data-prism-liberty]`, `PrismLibertyConfig` and `PrismLiberty.scene` have been replaced by the attributes above. Your Lab values carry over under the same key names, except `letterGlow`, which is now `sparkle.halo`. Aurora keys go under `aurora.<preset>`, and the glint, dust and flare keys go under `image.<preset>.sparkle`.
