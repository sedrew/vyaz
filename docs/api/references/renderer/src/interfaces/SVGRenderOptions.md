[vyaz-monorepo](../../../index.md) / [renderer/src](../index.md) / SVGRenderOptions

# Interface: SVGRenderOptions

Defined in: [renderer/src/SVGRenderer.ts:38](https://github.com/sedrew/vyaz/blob/main/packages/renderer/src/SVGRenderer.ts#L38)

## Properties

### className?

> `optional` **className?**: `string`

Defined in: [renderer/src/SVGRenderer.ts:57](https://github.com/sedrew/vyaz/blob/main/packages/renderer/src/SVGRenderer.ts#L57)

CSS class for `<svg>`.

***

### columns?

> `optional` **columns?**: [`MultiColumnConfig`](../../../core/src/interfaces/MultiColumnConfig.md)

Defined in: [renderer/src/SVGRenderer.ts:71](https://github.com/sedrew/vyaz/blob/main/packages/renderer/src/SVGRenderer.ts#L71)

Multi-column layout configuration for debug overlays.
When set, paragraph and column boxes are rendered per-column.

***

### contentPadding?

> `optional` **contentPadding?**: `number`

Defined in: [renderer/src/SVGRenderer.ts:64](https://github.com/sedrew/vyaz/blob/main/packages/renderer/src/SVGRenderer.ts#L64)

Extra padding added around the SVG canvas. Content coordinates stay unchanged;
the SVG viewBox is shifted and canvas is enlarged so debug overlays
(frameBox / contentBox) are visible with a gap from the edge.
Useful for snapshot tests to clearly show frame vs content boundaries.

***

### debug?

> `optional` **debug?**: [`DebugFlags`](DebugFlags.md)

Defined in: [renderer/src/SVGRenderer.ts:66](https://github.com/sedrew/vyaz/blob/main/packages/renderer/src/SVGRenderer.ts#L66)

Debug overlays.

***

### fit?

> `optional` **fit?**: [`SvgFit`](../type-aliases/SvgFit.md)

Defined in: [renderer/src/SVGRenderer.ts:44](https://github.com/sedrew/vyaz/blob/main/packages/renderer/src/SVGRenderer.ts#L44)

How `textLength` is applied.

***

### height?

> `optional` **height?**: `number`

Defined in: [renderer/src/SVGRenderer.ts:55](https://github.com/sedrew/vyaz/blob/main/packages/renderer/src/SVGRenderer.ts#L55)

SVG canvas height (px). Used when vertical sizing='frame' or as fallback.

***

### paddingLeft?

> `optional` **paddingLeft?**: `number`

Defined in: [renderer/src/SVGRenderer.ts:73](https://github.com/sedrew/vyaz/blob/main/packages/renderer/src/SVGRenderer.ts#L73)

Left padding from frame (needed for column debug rendering).

***

### preset?

> `optional` **preset?**: [`SvgPreset`](../type-aliases/SvgPreset.md)

Defined in: [renderer/src/SVGRenderer.ts:40](https://github.com/sedrew/vyaz/blob/main/packages/renderer/src/SVGRenderer.ts#L40)

Shorthand that sets structure + spacing at once.

***

### sizing?

> `optional` **sizing?**: [`SvgSizing`](../type-aliases/SvgSizing.md) \| `PerAxisSizing`

Defined in: [renderer/src/SVGRenderer.ts:51](https://github.com/sedrew/vyaz/blob/main/packages/renderer/src/SVGRenderer.ts#L51)

How SVG determines its canvas size.
Single string: applies to both axes. Object: per-axis control.
'frame' — use explicit width/height from options.
'content' — compute from lines bounding box.

***

### style?

> `optional` **style?**: [`SvgStyle`](../type-aliases/SvgStyle.md)

Defined in: [renderer/src/SVGRenderer.ts:42](https://github.com/sedrew/vyaz/blob/main/packages/renderer/src/SVGRenderer.ts#L42)

How style properties are expressed: as CSS `style` attribute or as XML presentation attributes.

***

### width?

> `optional` **width?**: `number`

Defined in: [renderer/src/SVGRenderer.ts:53](https://github.com/sedrew/vyaz/blob/main/packages/renderer/src/SVGRenderer.ts#L53)

SVG canvas width (px). Used when horizontal sizing='frame' or as fallback.
