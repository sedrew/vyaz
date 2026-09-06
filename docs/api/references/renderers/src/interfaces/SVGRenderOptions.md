[vyaz-monorepo](../../../index.md) / [renderers/src](../index.md) / SVGRenderOptions

# Interface: SVGRenderOptions

Defined in: [renderers/src/SVGRenderer.ts:38](https://github.com/sedrew/vyaz/blob/main/packages/renderers/src/SVGRenderer.ts#L38)

## Properties

### className?

> `optional` **className?**: `string`

Defined in: [renderers/src/SVGRenderer.ts:57](https://github.com/sedrew/vyaz/blob/main/packages/renderers/src/SVGRenderer.ts#L57)

CSS class for `<svg>`.

***

### columns?

> `optional` **columns?**: `MultiColumnConfig`

Defined in: [renderers/src/SVGRenderer.ts:71](https://github.com/sedrew/vyaz/blob/main/packages/renderers/src/SVGRenderer.ts#L71)

Multi-column layout configuration for debug overlays.
When set, paragraph and column boxes are rendered per-column.

***

### contentPadding?

> `optional` **contentPadding?**: `number`

Defined in: [renderers/src/SVGRenderer.ts:64](https://github.com/sedrew/vyaz/blob/main/packages/renderers/src/SVGRenderer.ts#L64)

Extra padding added around the SVG canvas. Content coordinates stay unchanged;
the SVG viewBox is shifted and canvas is enlarged so debug overlays
(frameBox / contentBox) are visible with a gap from the edge.
Useful for snapshot tests to clearly show frame vs content boundaries.

***

### debug?

> `optional` **debug?**: [`DebugFlags`](DebugFlags.md)

Defined in: [renderers/src/SVGRenderer.ts:66](https://github.com/sedrew/vyaz/blob/main/packages/renderers/src/SVGRenderer.ts#L66)

Debug overlays.

***

### fit?

> `optional` **fit?**: [`SvgFit`](../type-aliases/SvgFit.md)

Defined in: [renderers/src/SVGRenderer.ts:44](https://github.com/sedrew/vyaz/blob/main/packages/renderers/src/SVGRenderer.ts#L44)

How `textLength` is applied.

***

### glyphDecorations?

> `optional` **glyphDecorations?**: `boolean`

Defined in: [renderers/src/SVGRenderer.ts:91](https://github.com/sedrew/vyaz/blob/main/packages/renderers/src/SVGRenderer.ts#L91)

glyph preset only: draw `underline` / `strikethrough` as explicit `<line>`
geometry. The glyph path positions each character with its own `x`, so it
cannot rely on SVG `text-decoration` (which the flat/expanded paths use).
Ignored by every other preset. Default `true`.

***

### height?

> `optional` **height?**: `number`

Defined in: [renderers/src/SVGRenderer.ts:55](https://github.com/sedrew/vyaz/blob/main/packages/renderers/src/SVGRenderer.ts#L55)

SVG canvas height (px). Used when vertical sizing='frame' or as fallback.

***

### inlineBoxes?

> `optional` **inlineBoxes?**: `Record`\<`string`, `string`\>

Defined in: [renderers/src/SVGRenderer.ts:99](https://github.com/sedrew/vyaz/blob/main/packages/renderers/src/SVGRenderer.ts#L99)

Content for inline-box spans, keyed by `span.inlineWidget.id`. Each value is
an SVG fragment already sized to the widget's `width` × `height`; it is
spliced into a `<g>` translated to the box the layout reserved. A span whose
id has no entry gets a light placeholder `<rect>`. Produced by `@vyaz/converters`
for `<img>` / `<svg>` / `<progress>` / … ; irrelevant without inline boxes.

***

### missingGlyph?

> `optional` **missingGlyph?**: `"keep"` \| `"box"`

Defined in: [renderers/src/SVGRenderer.ts:114](https://github.com/sedrew/vyaz/blob/main/packages/renderers/src/SVGRenderer.ts#L114)

What to do with a character no registered font covers (`Span.notdefRanges`
from the layout — set automatically for the `glyph` preset, otherwise via
`layoutTextFrame({ markMissingGlyphs: true })`):
  - `'keep'` (default) — emit the raw character; the viewer paints it from
    its own fallback stack, whose width Vyaz could not predict.
  - `'box'` — omit the character and draw a hollow `.notdef` rectangle in
    the slot the layout reserved, so painted width == measured width in
    every viewer.

Currently honoured by the `glyph` preset only (it positions every
character, so the box lands exactly); `flat` / `browser` / `preserve`
ignore it and emit the raw character.

***

### paddingLeft?

> `optional` **paddingLeft?**: `number`

Defined in: [renderers/src/SVGRenderer.ts:73](https://github.com/sedrew/vyaz/blob/main/packages/renderers/src/SVGRenderer.ts#L73)

Left padding from frame (needed for column debug rendering).

***

### preset?

> `optional` **preset?**: [`SvgPreset`](../type-aliases/SvgPreset.md)

Defined in: [renderers/src/SVGRenderer.ts:40](https://github.com/sedrew/vyaz/blob/main/packages/renderers/src/SVGRenderer.ts#L40)

Shorthand that sets structure + spacing at once.

***

### sizing?

> `optional` **sizing?**: [`SvgSizing`](../type-aliases/SvgSizing.md) \| `PerAxisSizing`

Defined in: [renderers/src/SVGRenderer.ts:51](https://github.com/sedrew/vyaz/blob/main/packages/renderers/src/SVGRenderer.ts#L51)

How SVG determines its canvas size.
Single string: applies to both axes. Object: per-axis control.
'frame' — use explicit width/height from options.
'content' — compute from lines bounding box.

***

### style?

> `optional` **style?**: [`SvgStyle`](../type-aliases/SvgStyle.md)

Defined in: [renderers/src/SVGRenderer.ts:42](https://github.com/sedrew/vyaz/blob/main/packages/renderers/src/SVGRenderer.ts#L42)

How style properties are expressed: as CSS `style` attribute or as XML presentation attributes.

***

### transform?

> `optional` **transform?**: `FrameTransform`

Defined in: [renderers/src/SVGRenderer.ts:84](https://github.com/sedrew/vyaz/blob/main/packages/renderers/src/SVGRenderer.ts#L84)

Post-layout rigid transform (writing-mode `sideways-*` / frame `rotation`).
When the input is a TextFrameLayoutResult its own `transform` is used
automatically; pass this to supply one for the bare `Line[]` form or to
override. A net rotation that is a multiple of 360° is ignored.

The lines are rendered into `layoutBox` (pre-rotation space) and the whole
output is wrapped in one `<g transform>`; the `<svg>` canvas becomes the
rotated visual box.

***

### width?

> `optional` **width?**: `number`

Defined in: [renderers/src/SVGRenderer.ts:53](https://github.com/sedrew/vyaz/blob/main/packages/renderers/src/SVGRenderer.ts#L53)

SVG canvas width (px). Used when horizontal sizing='frame' or as fallback.
