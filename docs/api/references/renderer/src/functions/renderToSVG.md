[vyaz-monorepo](../../../index.md) / [renderer/src](../index.md) / renderToSVG

# Function: renderToSVG()

> **renderToSVG**(`input`, `options?`): `string`

Defined in: [renderer/src/SVGRenderer.ts:924](https://github.com/sedrew/vyaz/blob/main/packages/renderer/src/SVGRenderer.ts#L924)

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
