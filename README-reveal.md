## Reveal (v2.4.0)

Brings a still image to life on interaction. It mounts the existing Statue and Sparkle effects, washes them in from where the visitor entered, clicked or tapped, and removes them on the way out. Only one image is live at a time.

### Files

```
src/prism-reveal.js        source
dist/prism-reveal.min.js   9 KB, about 3 KB compressed. Load after prism.min.js
```

Reveal is its own file so pages without it don't download it. Its CSS is built in.

### Webflow setup

**Footer code**, after the main library:

```html
<script src="https://cdn.jsdelivr.net/gh/wearevictory/prism@v2.4.0/dist/prism.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/wearevictory/prism@v2.4.0/dist/prism-reveal.min.js" defer></script>
```

**Attributes:**

| Put it on | Name | Value | What it does |
|---|---|---|---|
| a transparent image | `data-prism-reveal` | image preset name, or empty for `default` | Statue and Sparkle, on interaction only |
| the card or wrapper | `data-prism-reveal-scope` | (none) | reveals when keyboard focus is inside it. Without it, the image's parent is used |
| a standalone wrapper | `tabindex` `0`, `role` `button`, `aria-label` | | makes the image its own tab stop. Enter or Space toggles it |
| the image | `data-prism-options` | JSON, e.g. `{"reveal":{"washDuration":2}}` | one-off override |

Use `data-prism-reveal` instead of `data-prism`, not both. Give the image its own wrapper div; the effect is inserted into the image's parent.

**Settings** go under `reveal` in the image section of the head-code block:

```json
{ "image": { "default": { "reveal": { "hover": true, "washDuration": 1.5 } } } }
```

| Key | Default | What it does |
|---|---|---|
| `hover` | `true` | reveal when the pointer rests on the image. Click always works |
| `hoverDelay` | `120` | ms the pointer rests first, so passing over doesn't trigger it |
| `hideCursor` | `1500` | ms the cursor stays hidden after a click unless it moves. `0` turns it off |
| `washDuration` | `1.5` | seconds for the wash to cover the image |
| `revertDuration` | `0.6` | seconds to return to static |
| `origin` | `"pointer"` | where the wash starts: `"pointer"`, `"base"` or `"center"`. Keyboard uses the base |
| `edgeGlow` | `0.55` | brightness of the gold front, capped below white |
| `edgeWidth` | `0.09` | softness of the front, as a fraction of the image |
| `minHold` | `500` | ms an image stays live before it can return, which caps toggle rate |

### Behaviour

| Input | Brings to life | Returns to static |
|---|---|---|
| Mouse | rest on the image, or click (hides the cursor until it moves) | pointer leaves, after `minHold` |
| Touch | tap | tap again, tap elsewhere, scroll away, or tap another image |
| Keyboard | focus inside the scope | focus leaves, or Esc |

Reduced motion turns the wash into a short crossfade. Each change fires `prism:reveal` on the image's wrapper, with `event.detail.live`.
