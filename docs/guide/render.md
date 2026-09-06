---
title: SVG rendering
outline: [2, 3]
---

# SVG rendering

`@vyaz/renderer` turns a layout result into an `<svg>` **string**. The layout
engine has already decided where every line, run, and glyph sits — the renderer
only chooses how much of that gets written into the markup.

```ts
import { layoutTextFrame } from '@vyaz/core'
import { renderResultToSVG } from '@vyaz/renderer'

const result = layoutTextFrame(frame)
const svg = renderResultToSVG(result, { preset: 'browser' })
```

| Function | For |
|---|---|
| `renderToSVG(lines, options?)` | a bare `Line[]` |
| `renderResultToSVG(result, options?)` | a `layoutTextFrame` result (passes dimensions through) |
| `renderParagraphToSVG(lines, width, height, options?)` | one paragraph at a fixed size |

## Presets

The `preset` option is the one setting most callers touch. It picks the SVG
**structure** — from "let the viewer re-measure the text" to "every glyph is
nailed to a coordinate". More baked in means the output survives a missing font,
at the cost of size.

<PresetLegend />

The highlighted attribute in each snippet is what that preset adds over the one
above it. All four keep whitespace with `xml:space="preserve"` and emit space
runs as their own `<tspan>`.

::: tip Matching the browser's own width
`browser` and `preserve` line up with what a browser paints only if the engine
measured the same way the browser shapes. Pass `layoutTextFrame(frame, { shaping: true })`
for GPOS kerning + `liga`/`clig`/`calt` — see [Browser usage](./browser#matching-the-browser-more-closely-shaping).
Leave shaping off for `glyph` (its per-character `x` is not shaping-aware yet).
:::

## Other options

### `style` — how presentation is expressed

| Value | Output | Use |
|---|---|---|
| `xml` *(default)* | `font-family="Inter" font-size="28" fill="#000"` | Self-contained; PowerPoint / Inkscape / Illustrator |
| `css` | `style="font-family: 'Inter', sans-serif; font-size: 28px; …"` | Inlined in HTML, so page CSS can theme it |

In `xml` mode only **diff** attributes are written on each `<tspan>` — anything
equal to the previous `<tspan>` in the same `<text>` is omitted. Space runs don't
reset the diff.

### `fit` — the `textLength` attribute

| Value | `textLength` on | Effect |
|---|---|---|
| `none` *(default)* | — | text flows naturally |
| `text` | the `<text>` | viewer stretches the whole line to the measured width |
| `frag` | each `<tspan>` | each fragment stretched independently — this is what `preset: 'preserve'` turns on |

`frag` needs the expanded structure (`browser` / `preserve`). It's ignored for
`glyph`; with `flat` it falls back to `text`.

### `sizing` — the canvas box

| Value | Behaviour |
|---|---|
| `frame` *(default)* | use the explicit `width` / `height` (both required) |
| `content` | compute the bounding box from the lines; ignore `width` / `height` |

Pass a per-axis object for mixed control: `sizing: { horizontal: 'content', vertical: 'frame' }`.

### `missingGlyph` — a code point no font covers

| Value | Behaviour |
|---|---|
| `keep` *(default)* | Emit the raw character. The viewer paints it from its own fallback stack — a width Vyaz can't predict, so in the `glyph` preset the next character can overlap it. |
| `box` | Drop the character and draw a hollow `.notdef` rectangle in the slot the layout reserved (`MISSING_GLYPH_FACTOR × fontSize` wide). Painted width then equals measured width in every viewer — the way a slide editor shows a box for an unavailable glyph. |

`box` is honoured by the **`glyph` preset** only (it positions every character, so the box lands exactly). The layout must carry the missing-glyph map: the `glyph` preset fills it automatically, elsewhere pass `layoutTextFrame(frame, { markMissingGlyphs: true })`. The real fix for missing glyphs is still to register a font that has them — see [Browser usage → Legacy family names](./browser#legacy-family-names).

### `debug` — overlay boxes

Pass `{ debug: { … } }` to draw diagnostic geometry as extra SVG elements.
`contentPadding` adds a margin around the canvas so edge overlays aren't clipped.

| Flag | Draws |
|---|---|
| `frameBox` | the frame container box (`frameWidth × frameHeight`) |
| `contentBox` | the actual bounding box of all lines |
| `paragraphBox` | one box per paragraph |
| `box` | each line box |
| `baseline` | the baseline of each line |
| `ascentDescent` | ascent / descent lines |
| `lineGap` | filled rect for each line's `lineHeight` |
| `runs` | a rect around each run's glyph box |
| `labels` | `x / y / w / h / bl` coordinate labels |
| `columnBox` | column separators (multi-column only) |
| `widthBorder` | *number* — stroke width for all overlay lines (default `1`) |

Try every preset and overlay live in the [Playground](/playground).
