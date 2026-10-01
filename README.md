# Prism Liberty

A lightweight WebGL prismatic lighting effect for images.

Prism Liberty combines animated light, refraction, aurora, glow, sparkle, grain, and shader-based image treatment into a reusable JavaScript library designed to work easily with Webflow or any standard HTML page.

## Installation

Prism Liberty can be loaded directly through jsDelivr.

```html
<script src="https://cdn.jsdelivr.net/gh/YOUR-USERNAME/prism-liberty@v1.0.0/prism-liberty.js"></script>
```

Replace `YOUR-USERNAME` with the GitHub account that owns the repository.

For development, you can reference the latest version from your main branch:

```html
<script src="https://cdn.jsdelivr.net/gh/YOUR-USERNAME/prism-liberty@main/prism-liberty.js"></script>
```

For production, use a tagged release such as `v1.0.0`.

---

## Basic Usage

Add the `data-prism-liberty` attribute to an element:

```html
<div data-prism-liberty>
  <script type="application/json">
    {
      "image": "https://example.com/image.png"
    }
  </script>
</div>
```

Prism Liberty automatically detects and initializes elements containing:

```html
data-prism-liberty
```

No additional initialization JavaScript is required.

---

## Webflow

### 1. Load Prism Liberty

In:

**Site Settings → Custom Code → Before `</body>`**

add:

```html
<script src="https://cdn.jsdelivr.net/gh/YOUR-USERNAME/prism-liberty@v1.0.0/prism-liberty.js"></script>
```

This only needs to be added once.

### 2. Create the Prism container

Add a Webflow Embed:

```html
<div data-prism-liberty>
  <script type="application/json">
    {
      "image": "YOUR_IMAGE_URL"
    }
  </script>
</div>
```

Replace `YOUR_IMAGE_URL` with your Webflow-hosted image URL.

---

## Configuration

Each Prism Liberty instance can contain its own JSON configuration.

```html
<div data-prism-liberty>
  <script type="application/json">
    {
      "image": "https://example.com/liberty.png",

      "layout": {
        "size": 0.58,
        "x": 0.5,
        "y": 0.37,
        "maxWidth": 0.8
      },

      "aurora": {
        "bg": "conic",
        "bgPal": "crystal",
        "bgInt": 55,
        "bgDrift": 0.6,
        "bgSweep": 18,
        "bgSpread": 210,
        "bgFeather": 34,
        "bgRadius": 85,
        "blobs": 7,
        "blobSize": 75,
        "grain": 22,
        "letterGlow": 50,
        "bloom": 45
      },

      "sparkle": {
        "glints": 52,
        "glintSize": 95,
        "glintStr": 85,
        "glintRate": 0.45,
        "warmth": 72,
        "dust": 90,
        "dustStr": 55,
        "flares": 6,
        "flareStr": 42,
        "ghosts": 3,
        "ghostStr": 22
      },

      "statue": {
        "palette": "prism",
        "light": 1,
        "tint": 0.08,
        "clarity": 0.4,
        "speed": 0.22,
        "flow": 1.15,
        "flowScale": 1.5,
        "scale": 2.1,
        "sharp": 2.6,
        "disp": 0.45,
        "edge": 0.75,
        "glitter": 0.45,
        "gsize": 20,
        "twinkle": 0.7,
        "grain": 0.015,
        "quality": 2
      }
    }
  </script>
</div>
```

You only need to specify settings you want to override. Everything else falls back to Prism Liberty's defaults.

---

## Palettes

Prism Liberty includes several built-in shader palettes:

```text
prism
diamond
crystal
shard
champagne
thermal
```

Example:

```json
{
  "statue": {
    "palette": "diamond"
  }
}
```

---

## Multiple Instances

Multiple Prism Liberty effects can exist on the same page.

```html
<div data-prism-liberty>
  <script type="application/json">
    {
      "image": "image-one.png",
      "statue": {
        "palette": "prism"
      }
    }
  </script>
</div>

<div data-prism-liberty>
  <script type="application/json">
    {
      "image": "image-two.png",
      "statue": {
        "palette": "diamond"
      }
    }
  </script>
</div>
```

Each instance maintains its own configuration.

---

## Manual Initialization

Automatic initialization can be disabled with:

```html
<div data-prism-liberty data-manual></div>
```

You can then mount the effect manually:

```js
const element = document.querySelector("[data-prism-liberty]");

const prism = PrismLiberty.mount(element, {
  image: "https://example.com/image.png",
});
```

---

## Runtime Controls

A mounted Prism Liberty instance exposes runtime controls.

```js
const element = document.querySelector("[data-prism-liberty]");
const prism = element.__prism;
```

Update an individual setting:

```js
prism.set("statue", "glitter", 0.8);
```

Another example:

```js
prism.set("statue", "speed", 0.4);
```

Retrieve the current configuration:

```js
const config = prism.config();

console.log(config);
```

---

## Global API

Prism Liberty exposes:

```js
window.PrismLiberty;
```

with:

```js
PrismLiberty.mount;
PrismLiberty.DEFAULTS;
PrismLiberty.LOCKED;
PrismLiberty.version;
```

Current version:

```text
1.0
```

The underlying rendering systems are also exposed as:

```js
window.createPrism;
window.createLightEngine;
```

---

## Image Requirements

For best results:

- Use a high-resolution PNG, WebP, or similarly suitable web image.
- Transparent-background subjects work especially well with the refractive treatment.
- Serve images from a source that permits cross-origin image access when necessary.
- Keep source assets optimized for the web.

Prism Liberty loads the effect image with cross-origin support so that it can be used by the WebGL renderer.

---

## Accessibility

The original image receives the configured `alt` value while decorative rendering canvases are hidden from accessibility APIs.

Example:

```json
{
  "image": "liberty.png",
  "alt": "Lady Liberty in crystal glass, holding a basketball"
}
```

Prism Liberty also respects:

```css
prefers-reduced-motion: reduce;
```

for its entrance animation.

---

## Recommended Repository Structure

```text
prism-liberty/
├── prism-liberty.js
├── README.md
└── LICENSE
```

Or, if the project grows:

```text
prism-liberty/
├── src/
├── dist/
│   └── prism-liberty.js
├── README.md
├── LICENSE
└── package.json
```

When using the second structure, the CDN URL becomes:

```html
<script src="https://cdn.jsdelivr.net/gh/YOUR-USERNAME/prism-liberty@v1.0.0/dist/prism-liberty.js"></script>
```

---

## Releases

Use Git tags to create stable production versions.

```bash
git tag v1.0.0
git push origin v1.0.0
```

Then reference that version through jsDelivr:

```html
<script src="https://cdn.jsdelivr.net/gh/YOUR-USERNAME/prism-liberty@v1.0.0/prism-liberty.js"></script>
```

Future versions can be released without affecting existing implementations:

```text
v1.0.0
v1.0.1
v1.1.0
v2.0.0
```

Avoid using `@main` on production websites so updates to the repository do not unexpectedly change live experiences.

---

## License

Add the appropriate license for the project before public distribution.
