[vyaz-monorepo](../../../index.md) / [renderers/src](../index.md) / renderToSVG

# Function: renderToSVG()

> **renderToSVG**(`input`, `options?`): `string`

Defined in: [renderers/src/SVGRenderer.ts:1045](https://github.com/sedrew/vyaz/blob/main/packages/renderers/src/SVGRenderer.ts#L1045)

Render a layout to an SVG string.

Pass a full TextFrameLayoutResult (recommended) and the canvas size /
`sizing` are derived from its `frame*` / `content*` / `fit*` fields — you only
add render options (preset, style, debug). Passing a bare `Line[]` is the
low-level form: you supply `width` / `height` / `sizing` yourself.

## Parameters

### input

`Line`[] \| `TextFrameLayoutResult`

— a layout result, or bare layout lines

### options?

[`SVGRenderOptions`](../interfaces/SVGRenderOptions.md) = `{}`

— rendering options (preset + style/fit/sizing modifiers); any
                  field here overrides the value derived from a result

## Returns

`string`

SVG string
