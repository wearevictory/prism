# Prism FX v3.0.0

Light effects for Webflow, driven by attributes and one JSON settings block.

- **Statue**: liquid metal light on a transparent cutout, on the GPU. Where the cursor rests (or a finger taps) the glass comes alive. At rest it draws one still frame, plus an occasional faint hint that it's interactive.
- **Sparkle**: light that belongs to the image: glints on the outline, halo, bloom and rays.
- **Dust**: fine specks floating in the light, drawn on the **section**, never on the image.
- **Aurora**: a soft fan of colour turning slowly behind a section.

## Quick start

1. **Head code** (Site settings or Page settings, inside `<head>`): your settings block.

```html
<script type="application/json" data-prism-config>
{
  "image": {
    "default": {
      "statue": { "palette": "champagne", "radius": 0.5, "thickness": 0.004 },
      "reveal": { "idle": "hint", "hintEvery": 3 }
    }
  },
  "dust": { "default": { "dust": 300 } }
}
</script>
```

Any value you leave out uses the library default, and the defaults are the Liquid metal look. The JSON exported by the Prism glass lab pastes in unchanged.

2. **Before `</body>`**:

```html
<script src="https://cdn.jsdelivr.net/gh/wearevictory/prism@v3.0.0/dist/prism.min.js" defer></script>
```

3. **In the Designer**, add custom attributes:

| Element | Attribute | What happens |
|---|---|---|
| The image (`<img>`) | `data-prism` | Statue light + sparkle, from the `default` image preset |
| The image | `data-prism="liberty"` | Same, from the `liberty` preset |
| The image | `data-prism-statue` | Statue light only, no sparkle |
| The image | `data-prism-sparkle` | Sparkle only |
| The section | `data-prism-dust` | Dust, from the `default` dust preset |
| The section | `data-prism-dust="hero"` | Dust from the `hero` preset |
| The section | `data-prism-aurora` | Aurora behind the section |
| Image or aurora section | `data-prism-options='{"statue":{"radius":0.4}}'` | Overrides for this one element |
| A dust section | `data-prism-dust-options='{"dust":200}'` | Overrides for this one section's dust |
| Any of the above | `data-prism-manual` | Prism leaves it alone; start it yourself with `Prism.mount()` |

A typical hero:

```html
<section id="dust-background" class="section" data-prism-dust>
  <div class="img-wrapper">
    <img src="liberty.png" alt="Statue of Liberty" data-prism>
  </div>
</section>
```

The image must be a **transparent PNG or WebP cutout**, served by a host that allows the GPU to read it (it sends `Access-Control-Allow-Origin`). If it doesn't, point `data-prism-src` on the `<img>` at a copy that does. The image itself is never moved or rewrapped: Prism adds a layer next to it, so Webflow layout and Interactions keep working.

## Settings block

```json
{
  "image":  { "default": { "statue": {}, "sparkle": {}, "reveal": {} }, "liberty": { } },
  "dust":   { "default": { }, "hero": { } },
  "aurora": { "default": { } },
  "performance": { "adaptive": true }
}
```

- Presets are named groups. `default` always applies; a named preset layers on top of it.
- Any layer can hold `"tablet": { … }` (≤ 991px) and `"mobile": { … }` (≤ 767px) overrides, matching Webflow's breakpoints.
- Interaction values can sit under `statue` or under `reveal` (the Lab exports them under `reveal`). If both have one, `statue` wins. `reveal.fps` means the frame rate while interacting (`pointerFps` under `statue`).

## Statue settings (`image.<preset>.statue`)

**Pointer light**

| Key | Default | What it does |
|---|---|---|
| `pointer` | `true` | The light follows the cursor, or lands where a finger taps. `false` turns off hover, tap and hints |
| `radius` | `0.5` | Pool size, as a share of the image |
| `elevation` | `0.75` | Light height. Low skims the surface for sharper highlights |
| `lag` | `140` | ms the light trails the pointer |
| `easeIn` / `easeOut` | `0.75` / `0.5` | s to come alive and to settle (never faster than 0.15) |
| `touchHold` | `3.5` | s the light stays after a tap |
| `touchDrag` | `true` | A sideways finger drag moves the light; vertical scroll still works. Set `false` inside carousels |

**At rest**

| Key | Default | What it does |
|---|---|---|
| `idle` | `"hint"` | `"still"`: one frame, then nothing. `"hint"`: occasional faint glint. `"drift"`: the light wanders on its own. `"live"`: the shimmer runs everywhere, as in v2 |
| `hintStyle` | `"sweep"` | `"sweep"`: a glint crosses the image. `"breathe"`: the whole image shimmers faintly |
| `hintEvery` / `hintDur` | `3` / `2` | s between hints, s per hint |
| `hintStrength` | `0.6` | 0.05–0.6, capped at 0.6 |
| `hintRepeat` | `"once"` | `"once"`: stops after someone has really used the image. `"always"`: keeps hinting |
| `idleLight` | `0` | Shimmer away from the pointer, 0–1 |

Hints never run while the page is scrolling, while the image is off screen, in a background tab, or with reduced motion on.

**Glass surface** (built automatically from the cutout, no depth map)

| Key | Default | What it does |
|---|---|---|
| `shape` | `1.3` | How strongly the outline curves like thick glass |
| `bevel` | `0.04` | How far the curve reaches in from the outline |
| `folds` | `0.5` | Light catches folds, hair and facets from the picture's own shading |
| `liquid` / `liquidScale` | `0.75` / `1.2` | Slow liquid metal ripple, and its size. Moves only while lit |

**Refraction and reflections**

| Key | Default | What it does |
|---|---|---|
| `thickness` | `0.004` | How far the picture bends through the glass (replace mode only) |
| `spread` | `0.25` | Red/blue colour split in the refraction |
| `poolDisp` | `1.5` | Extra rainbow on the shimmer inside the pool |
| `wrap` | `0.8` | Bends the light bands around the shape |
| `spec` / `shine` | `0.8` / `30` | Spectral highlights, and polish (low: satin, high: sharp glints). Kept below white |
| `irid` | `0.6` | How much the highlight colour shifts as the surface turns |
| `sheen` | `0.6` | Soft coloured reflection on the curved edges |

**Shimmer** (the v2 statue light): `palette` (`champagne`, `prism`, `diamond`, `crystal`, `shard`, `thermal`), `light`, `tint`, `clarity`, `speed`, `flow`, `flowScale`, `angle`, `scale`, `sharp`, `follow`, `disp`, `hue`, `thresh`, `soft`, `edge`, `glitter`, `gsize`, `twinkle`, `grain`.

**Drawing**

| Key | Default | What it does |
|---|---|---|
| `mode` | `"replace"` | `"replace"`: the GPU draws the whole picture. `"overlay"`: the real image shows and light is added on top (no refraction) |
| `quality` | `1.5` | Pixel density cap |
| `fps` | `30` | Frame cap for hints, drift and live |
| `pointerFps` | `60` | Frame cap while interacting |
| `maxPixels` | `1200000` | Per-image pixel cap |
| `view` | `"final"` | `"surface"` or `"pool"`: diagnostic views for tuning |

## Sparkle settings (`image.<preset>.sparkle`)

`glints`, `glintSize`, `glintStr`, `glintRate`, `warmth`, `halo`, `bloom`, `flares`, `flareStr`, `flarePal` (`crystal`, `warm`, `cool`, `spectrum`, `white`), `flareHue`, `flareSat`, `flareLen`, `flareWidth`, `flareSpin`, `origin: {x, y}`, `fadeIn`, `seed`, `quality`, `maxPixels`, `fps`. The image's `pad` (default `0.3`) is the margin rays and halo may spill into.

## Dust settings (`dust.<preset>`)

| Key | Default | What it does |
|---|---|---|
| `dust` / `dustStr` / `dustSize` | `90` / `55` / `1` | Count (0–1000), brightness, speck size |
| `glintRate` / `warmth` | `0.45` / `72` | Twinkle speed, share of gold specks |
| `layout` | `"radial"` | `"radial"`: gathered around the light. `"field"`: spread across the section, rising slowly |
| `dustSpread` | `1.15` | Radial: how far it floats, in image sizes |
| `rise` | `8` | Field: px per second upward |
| `anchor` | `"auto"` | `"auto"`: the first Prism image in the section. `""`: use `x`/`y`. Or a CSS selector |
| `origin` | `{"x": 0.5, "y": 0.36}` | Where on the anchor the light sits |
| `x` / `y` | `50` / `40` | % of the section, when there is no anchor |
| `layer` | `"back"` | `"back"`: behind the section's content. `"front"`: above it, never taking clicks |
| `react` | `0.35` | Extra brightness while someone lights an image in the section |
| `fadeIn` / `seed` / `quality` / `maxPixels` / `fps` | `1200` / `8` / `1` / `1500000` / `30` | |

## Aurora settings (`aurora.<preset>`)

Unchanged from v2: `bg`, `bgPal`, `bgInt`, `bgDrift`, `bgSweep`, `bgSpread`, `bgFeather`, `bgRadius`, `blobs`, `blobSize`, `bgCentre`, `bgEdge`, `bgHue`, `bgSat`, `bgLight`, `grain`, `x`, `y`, `anchor`, `anchorY`, `dir`, `fadeIn`, `seed`, `resolution`, `zIndex`, `fps`.

## Script access

```js
Prism.get(img, 'statue').pause();      // plain image, GPU context kept: resume() is instant
Prism.get(img, 'statue').resume();
Prism.get(img, 'statue').hint();       // play one hint now
Prism.get(img, 'statue').set('radius', 0.4);
Prism.get(section, 'dust').set('dust', 200);
Prism.refresh();                       // after adding content (CMS lists, tabs, sliders)
Prism.reconfigure();                   // after editing the settings block
Prism.mount('statue', img, settings);  // start one by hand (with data-prism-manual)
```

Events: images fire `prism:light` (bubbles) with `detail.active` when someone starts or stops lighting them.

## Tuning on your real site

Open any page with `?prism-tune` in the URL. Pick an element, change values on the real page, then copy them out as that element's options or as a preset for your head code. Visitors never load the tuner.

## Performance

- **At rest the statue costs nothing**: one still frame, then no drawing until someone interacts. Each hint draws about 60 frames, then stops.
- Off-screen images and sections stop drawing. Background tabs stop drawing.
- Browsers allow only a few GPU contexts: Prism keeps at most 6. Off-screen images give theirs back first, and an image waiting for one gets it when one frees up.
- A GPU context lost in the background (common on iOS) is rebuilt when it comes back.
- Pixel density and frame rates are capped per effect, and quality steps down automatically on slow devices.
- Dust, sparkle and aurora still draw continuously while on screen (30 fps). Set their counts to 0 if you don't use them.

## Coming from v2

- **Dust moved to the section.** Add `data-prism-dust` to the section and move `dust`, `dustStr`, `dustSize`, `dustSpread` from `image.<preset>.sparkle` to `dust.<preset>`. Old image dust values are ignored, with a console note.
- The statue now draws on demand with a pointer light and hints. For v2's always-on shimmer: `"idle": "live"`, `"pointer": false`.
- **The Reveal wash (`prism-reveal.js`) is removed.** The pointer light replaces it. Images still marked `data-prism-reveal` get the new pointer light (same as `data-prism`), with a console note to rename the attribute. If an old `prism-reveal.min.js` script tag is still in Webflow, it now exits without doing anything; delete the tag when convenient. Its settings (`hover`, `hoverDelay`, `washDuration`, `edgeGlow`…) are ignored.

## Publishing

1. Push to the repo and tag the release: `git tag v3.0.0 && git push --tags`.
2. The script URL is `https://cdn.jsdelivr.net/gh/wearevictory/prism@v3.0.0/dist/prism.min.js`. jsDelivr needs the repo to be public.
3. Tag each release and change the version in the URL. Branch links like `@main` are cached for hours. To refresh a URL, open it with `purge.jsdelivr.net` in place of `cdn.jsdelivr.net`.

## Troubleshooting

| You see | Why, and the fix |
|---|---|
| Console: `could not read the image (the host must allow CORS)` | The host doesn't let the GPU read the picture. Use a host that sends `Access-Control-Allow-Origin: *`, or set `data-prism-src` to a copy that does. The plain image still shows. |
| Console: `dust moved to the section in v3` | Your image preset still has dust values. Move them to a `dust` preset and add `data-prism-dust` to the section. |
| Hints never appear | Reduced motion is on in the device's settings (hints stay off on purpose), the visitor already used the image (`hintRepeat: "once"`), or `idle` isn't `"hint"`. |
| Nothing happens, no messages | The script isn't loading. Check the URL opens in a browser tab and is in the footer code with `defer`. |

## Build

`npm run build` (or `bash build.sh`) builds `dist/` from `src/`. `dist/prism.min.js` bundles core, aurora, statue, sparkle and dust.

## Changelog

**v3.0.0**
- Statue: Liquid metal look; pointer light (hover and tap) with glass refraction, colour split and spectral highlights; glass surface built from the cutout; hints at rest; draws only when something moves.
- Dust moved from the image to the section (`data-prism-dust`), with radial and field layouts, a front or back layer, and a brightness response to interaction.
- Sparkle keeps glints, halo, bloom and rays on the image.
- Fixed: images released from the GPU budget could never come back; images over the budget never retried; several images loading at once could exceed the budget; a lost GPU context stayed lost; resizing a still canvas left it blank.
- Removed the Reveal wash (`prism-reveal.js`); `data-prism-reveal` now means `data-prism`, and an old reveal script tag is neutralised.
- Tuner: new statue rows and a Dust tab. Build script added.
