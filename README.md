# Prism FX v2

Three separate effects for Webflow, switched on with custom attributes and tuned from one JSON settings block:

- **Aurora:** the slow-turning fan of colour. It goes on any section you mark, and each section gets its own.
- **Statue:** refracted light flowing over a transparent cutout, drawn on the GPU.
- **Sparkle:** glints on the cutout's outline, floating dust, a halo around the shape, bloom, and lens flares and reflections.

The needle rays, pulse and intro ring from the studies have been removed.

## Files

```
src/prism-core.js      shared helpers, settings, one animation loop, image overlay, start-up   (load first)
src/prism-aurora.js    Aurora tab
src/prism-statue.js    Statue tab (GPU shader)
src/prism-sparkle.js   Sparkle tab (glints, dust, halo, bloom, flares, ghosts)
dist/prism.min.js      all four in one file, about 34 KB (14 KB compressed)
dist/*.min.js          each module on its own
examples/              a local test page and copy-paste Webflow snippets
```

For a single file, use `dist/prism.min.js`. To load only some effects, load `prism-core.min.js` first, then any of the others.

## Publishing on GitHub and jsDelivr

1. Push this folder to a **public** GitHub repo.
2. Create a version tag: `git tag v2.0.0 && git push --tags`, or use a GitHub Release.
3. The script URL is:
   `https://cdn.jsdelivr.net/gh/YOUR-USER/YOUR-REPO@v2.0.0/dist/prism.min.js`

Tag each new release (`v2.0.1`, `v2.0.2`…) and change the version in the URL. Links to a branch like `@main` are cached for hours, so your changes look like they aren't arriving. If you have to refresh a URL, open `https://purge.jsdelivr.net/gh/YOUR-USER/YOUR-REPO@v2.0.0/dist/prism.min.js`.

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
<script src="https://cdn.jsdelivr.net/gh/YOUR-USER/YOUR-REPO@v2.0.0/dist/prism.min.js" defer></script>
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
| `sparkle.glints` / `glintSize` / `glintStr` | `52` / `95` / `85` | glints on the outline: count, size, strength |
| `sparkle.dust` / `dustStr` / `dustSpread` | `90` / `55` / `1.15` | dust: count, strength, how far it floats |
| `sparkle.glintRate` | `0.45` | twinkle per second (capped at 1) |
| `sparkle.warmth` | `72` | % of sparkles that are gold rather than icy |
| `sparkle.halo` / `bloom` | `50` / `45` | glow around the outline, and glow at the light source |
| `sparkle.flares` / `flareStr` | `6` / `42` | lens flares |
| `sparkle.ghosts` / `ghostStr` | `3` / `22` | lens reflections |
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

`[data-prism-liberty]`, `PrismLibertyConfig` and `PrismLiberty.scene` have been replaced by the attributes above. Your Lab values carry over under the same key names, except `letterGlow`, which is now `sparkle.halo`. Aurora keys go under `aurora.<preset>`, and the glint, dust, flare and ghost keys go under `image.<preset>.sparkle`.
