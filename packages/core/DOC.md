# SVGRenderer — SVG Text Output Modes

The SVGRenderer converts `LineBox[]` (the output of `ParagraphLayoutEngine`) into SVG markup. It controls **how** text content, styles, and positioning are written into SVG elements.

## Output Architecture

SVG text rendering is controlled by three independent axes:

### 1. `style` — How style properties are expressed

> **`'css'`** — Styles are written as a CSS `style` attribute on each `<text>` element.
>
> ```svg
> <text style="font-family: Arial; font-size: 16px; fill: rgb(255,0,0)">
> ```
>
> This is the standard web approach. The `style` attribute is a single string of CSS declarations. It has higher specificity in the CSS cascade and is the recommended approach per the SVG 2 spec (`w3c/svgwg`). Best for browsers, web viewers, and modern SVG renderers.

> **`'xml'`** — Styles are written as XML presentation attributes on each `<text>` element.
>
> ```svg
> <text font-family="Arial" font-size="16" fill="red">
> ```
>
> XML presentation attributes are the traditional SVG approach. They have zero CSS specificity, which means an external stylesheet can override them. However, they are more broadly supported by non-browser tools: PowerPoint, Illustrator, Canva, and Inkscape all parse presentation attributes reliably. Best for office/document output.

Both approaches carry the same semantic information. The choice is purely syntactic.

---

### 2. `structure` — How text fragments are organised

> **`'flat'`** — All text on one line is written as a single `<text>` element with no `<tspan>` children.
>
> ```svg
> <text x="0" y="20">Hello World</text>
> ```
>
> Minimal output. All fragments on the same line are concatenated. Only the first fragment's font metrics are used for the `<text>` baseline position. No per-fragment styling. Use when the entire line has uniform style and you want the smallest possible SVG.

> **`'expanded'`** — Each `FragmentBox` becomes a separate `<tspan>` child of `<text>`.
>
> ```svg
> <text x="0" y="20" font-family="Arial" font-size="16">
>   <tspan x="0" fill="red">Hello</tspan>
>   <tspan x="40" font-weight="bold">World</tspan>
> </text>
> ```
>
> Every fragment carries its own style attributes (`font-family`, `font-size`, `font-weight`, `fill`, `text-decoration`). Fragments share the parent `<text>` position unless they differ. This is the standard mode for rich text with mixed styles.

> **`'glyph'`** — Individual characters are positioned using the `x` attribute's list-of-values syntax.
>
> ```svg
> <text font-family="Arial" font-size="16">
>   <tspan x="0 10 20 30 40">Hello</tspan>
> </text>
> ```
>
> Each value in the `x` list corresponds to the absolute X position of one character (per SVG 2 §10.3, "Characters and glyphs"). The `dx` and `dy` attributes support relative offsets. This mode gives pixel-perfect control over every glyph's position — useful for kerning simulation, precise tracking, and legacy renderers that cannot rely on the font's own metrics. When `structure` is `'glyph'`, `fit` must be `'none'`.

---

### 3. `fit` — How `textLength` is applied

> **`'none'`** — No `textLength` or `lengthAdjust` attributes are written. Text renders at its natural width.

> **`'text'`** — A `textLength` attribute is written on the parent `<text>` element, forcing the entire line to stretch or shrink to the specified width.
>
> ```svg
> <text x="0" y="20" textLength="200" lengthAdjust="spacing">
>   Hello World
> </text>
> ```
>
> The SVG user agent adjusts spacing between glyphs to fit the target length. The `lengthAdjust` attribute controls whether only spacing (`"spacing"`) or spacing and glyph shapes (`"spacingAndGlyphs"`) are modified. Useful for justified alignment and text-fit containers.

> **`'frag'`** — A `textLength` attribute is written on each individual `<tspan>`.
>
> ```svg
> <text x="0" y="20">
>   <tspan x="0" textLength="80">Hello</tspan>
>   <tspan x="80" textLength="120">World</tspan>
> </text>
> ```
>
> Each fragment is stretched independently. This gives fine-grained control for platforms that cannot distribute space across fragments automatically (e.g. Canva, PowerPoint shapes with per-run width). Only meaningful with `structure: 'expanded'`.

---

## Validation Rules

Not all combinations of the three axes are meaningful. The renderer enforces these rules:

| condition | behaviour |
|---|---|
| `structure: 'glyph'` + `fit: 'text'` or `'frag'` | `fit` is silently ignored; a `console.warn` is emitted at runtime. Per-glyph positions are absolute — `textLength` cannot modify them. |
| `structure: 'flat'` + `fit: 'frag'` | `fit: 'frag'` is downgraded to `'text'`; a `console.warn` is emitted. With no `<tspan>` elements there is nowhere to put per-fragment `textLength`. |
| `style: 'css'` + `structure: 'glyph'` | Valid but unusual. Inline CSS on a `<text>` element with per-glyph `x` coordinates works in browsers. |

---

## Presets

Presets are shorthand aliases that set all three axes at once. They are the recommended way to use the renderer.

### `style: 'css'` family

| Preset | style | structure | fit | Use case |
|---|---|---|---|---|
| `'css-flat'` | css | flat | none | Minimal web SVG. One `<text>` per line, uniform style, no stretching. |
| `'css-expanded'` | css | expanded | none | Web rich text. Each fragment is a `<tspan>` with inline CSS. No stretching. |

### `style: 'xml'` family

| Preset | style | structure | fit | Use case |
|---|---|---|---|---|
| `'xml-flat'` | xml | flat | none | Minimal office SVG. Presentation attributes, no tspan. |
| `'xml-expanded'` | xml | expanded | none | Office rich text. Each fragment a `<tspan>` with XML attributes. |
| `'xml-expanded-frag'` | xml | expanded | frag | Canva-compatible. Each fragment stretched independently via `textLength`. |
| `'xml-fit'` | xml | expanded | text | PowerPoint text with `textLength` on each line for fit-to-width. |
| `'xml-glyph'` | xml | glyph | none | Pixel-perfect output. Absolute X coordinate per character. |

### Usage

```typescript
// Via preset name
renderToSVG(lines, { preset: 'xml-expanded-frag' })

// Via individual options (for custom combinations)
renderToSVG(lines, { style: 'css', structure: 'flat' })
```

---

## Debug Overlays

When `debug` is enabled, visual annotations are added before `</svg>`:

| Flag | Visual | Description |
|---|---|---|
| `box` | Red rectangle | Bounding box of each `LineBox` |
| `baseline` | Blue line | Baseline of each line |
| `ascentDescent` | Green dashed lines | Ascent and descent boundaries |
| `frame` | Yellow dashed rectangle | Outer bounding box of all lines |
| `labels` | Grey text | Coordinate labels (`y=... x=... w=... h=...`) |
| `runs` | Purple rectangles | Bounding boxes of individual `FragmentBox` |