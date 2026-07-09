# SVG Renderer API

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `renderToSVG` | `(lines: Line[], options?: SVGRenderOptions) => string` | Low-level: render Line[] to SVG string |
| `renderParagraphToSVG` | `(lines: Line[], width: number, height: number, options?: SVGRenderOptions) => string` | Render one paragraph to SVG |
| `renderResultToSVG` | `(result: ParagraphLayoutResult, options?: SVGRenderOptions) => string` | Render layout result to SVG (auto-passes dimensions) |

## Presets

| Preset | Structure | Spaces | Attributes | textLength | Use case |
|--------|-----------|--------|------------|------------|----------|
| `flat` | Single `<text>` with concatenated text, **no `<tspan>`** | ✅ `xml:space="preserve"` | Full style on `<text>` | ❌ | **PowerPoint / OOXML export**. Minimial SVG size, no nested elements. Best for simple text where style changes are not needed. |
| `browser` | `<text>` + `<tspan>` per **run** | ✅ `xml:space="preserve"` | **Diff attributes** — only what differs from previous `<tspan>` | ❌ | **Web / browser display**. Compact SVG with run-level grouping for syntax highlighting. The browser handles text shaping and kerning natively. |
| `preserve` | `<text>` + `<tspan>` per **run** | ✅ `xml:space="preserve"` | **Diff attributes** — same as `browser` | ✅ `textLength` on `<text>` (`fit='text'`) or per `<tspan>` (`fit='frag'`) | **Pixel-perfect rendering**. Server-side render, PDF/Canvas export. Every span has explicit width so the browser stretches text to match the layout engine's metrics. |
| `glyph` | `<text>` per **run** + `<tspan x="x0 x1 x2...">` per **glyph** | ✅ `xml:space="preserve"` | Full style on `<text>` | ❌ | **Selection / cursor positioning**. Every glyph has its own X coordinate. Used for hit-testing where the user clicks. |

## Style mode

Controls how presentation attributes are expressed in the SVG.

| Mode | Attribute style | Example | When to use |
|------|----------------|---------|-------------|
| `xml` (default) | XML presentation attributes | `font-family="Arial" font-size="12" fill="#000000"` | Default. Compatible with PowerPoint, Inkscape, Illustrator. All attributes are explicit per element, making the SVG self-contained. |
| `css` | CSS `style` attribute | `style="font-family: 'Arial', sans-serif; font-size: 12px; fill: rgb(0,0,0)"` | When SVG is inlined in HTML. Styles can be overridden by CSS, enabling dynamic theming. |

### XML mode — attribute precedence

To keep output compact, only **diff attributes** are emitted on each `<tspan>`. If a `<tspan>` has the same `fontFamily`, `fontSize`, `fontWeight`, `color`, `fontStyle`, or `text-decoration` as the previous `<tspan>` in the same `<text>`, the attribute is omitted.

Space spans (`type: 'space'`) do **not** reset the style diff — they inherit the style of the preceding text span. This ensures that consecutive text spans with identical styles produce no redundant attributes.

## Sizing mode

| Mode | Behavior |
|------|----------|
| `frame` (default) | Uses explicit `width` / `height` from options. Requires both values. |
| `content` | Computes bounding box from all lines. Ignores `width` / `height`. |

## Fit mode

Controls the `textLength` attribute.

| Mode | textLength placement | Behavior |
|------|----------------------|----------|
| `none` (default) | ❌ Not applied | Text flows naturally, no stretching. |
| `text` | `textLength` on `<text>` element | The browser stretches the entire line to match the computed width. |
| `frag` | `textLength` on each `<tspan>` | Each fragment is stretched independently to its computed width. Only available with expanded structure (`browser` / `preserve`). |

> **Note**: `frag` is ignored for `glyph` structure. When `structure='flat'` and `fit='frag'`, it falls back to `fit='text'`.

## Debug flags

Optional debug overlays rendered as SVG elements (rects, lines). Pass as `{ debug: { flagName: true } }`.

| Flag | What it shows |
|------|---------------|
| `frame` | Dashed border around the text frame bounding box (yellow) |
| `lineGap` | Light blue fill for each line box |
| `box` | Thin red border for each line box |
| `baseline` | Blue line at the baseline |
| `ascentDescent` | Dashed green lines for ascent / descent |
| `labels` | Text labels with `y`, `x`, `w`, `h`, `bl` coordinates (monospace, top-right) |
| `runs` | Purple borders around each span's glyph bounding box |

Example:
```ts
renderToSVG(lines, {
  preset: 'browser',
  debug: { frame: true, baseline: true, labels: true },
});
```

## Examples

### Browser preset (default)

```ts
import { renderToSVG } from '@vyaz/renderer';

const result = paragraphLayoutEngine.layout(paragraph, 300);
const svg = renderResultToSVG(result, { preset: 'browser' });
```

Output:
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="300" height="50">
  <text x="0" y="15" font-family="Arial" font-size="12" fill="#000000" font-weight="400" xml:space="preserve">
    <tspan x="0" font-weight="700">Hello</tspan>
    <tspan x="36" font-weight="400"> </tspan>
    <tspan x="42" font-weight="400">World</tspan>
  </text>
</svg>
```

### Flat preset (PowerPoint)

```ts
const svg = renderResultToSVG(result, { preset: 'flat' });
```

Output:
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="300" height="50">
  <text x="0" y="15" font-family="Arial" font-size="12" fill="#000000" font-weight="400" xml:space="preserve">
    Hello World
  </text>
</svg>
```

### Preserve preset (pixel-perfect)

```ts
const svg = renderResultToSVG(result, { preset: 'preserve', fit: 'text' });
```

Output:
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="300" height="50">
  <text x="0" y="15" font-family="Arial" font-size="12" fill="#000000" font-weight="400" xml:space="preserve" textLength="280" lengthAdjust="spacing">
    <tspan x="0" font-weight="700">Hello</tspan>
    <tspan x="36" font-weight="400"> </tspan>
    <tspan x="42" font-weight="400">World</tspan>
  </text>
</svg>
```

### Glyph preset (cursor positioning)

```ts
const svg = renderResultToSVG(result, { preset: 'glyph' });
```

Output:
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="300" height="50">
  <text x="0" y="15" font-family="Arial" font-size="12" fill="#000000" font-weight="400" xml:space="preserve">
    <tspan x="0.0 6.0 12.0 18.0 24.0">Hello</tspan>
    <tspan x="30.0 36.0 42.0 48.0 54.0">World</tspan>
  </text>
</svg>
```

### CSS style mode

```ts
const svg = renderResultToSVG(result, { preset: 'browser', style: 'css' });
```

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="300" height="50">
  <text x="0" y="15" style="font-family: 'Arial', sans-serif; font-size: 12px; fill: rgb(0, 0, 0); white-space: pre" font-weight="400">
    <tspan x="0" style="font-weight: 700">Hello</tspan>
    <tspan x="36"> </tspan>
    <tspan x="42">World</tspan>
  </text>
</svg>
```

## On whitespace handling

All presets use `xml:space="preserve"` to prevent the SVG user agent from collapsing whitespace. This ensures that inter-word and inter-run spaces are rendered at their computed positions.

Layout space spans (`type: 'space'`) are rendered as separate `<tspan>` elements containing a single space character (` `). Each space span has an explicit `x` coordinate equal to its computed position.

Without `xml:space="preserve"`, browsers collapse sequences of whitespace characters in SVG `<text>` elements, and whitespace-only text nodes are not rendered. For more details, see [SVG 2 Text — White Space](https://www.w3.org/TR/SVG2/text.html#WhiteSpace) and [CSS Text Module Level 3](https://www.w3.org/TR/css-text-3/).