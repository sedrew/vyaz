# @vyaz/renderer

SVG renderer for Vyaz layout output.

## Presets

| Preset | Structure | Use case |
|--------|-----------|----------|
| `flat` | Single `<text>` per run, no `<tspan>` | Smallest output; viewer has the exact font |
| `browser` | `<text>` + `<tspan>` per run | Web display; inspect / hand-edit |
| `preserve` | `browser` + `textLength` per fragment | Portable — holds up under a substitute font |
| `glyph` | `<tspan x="x0 x1 …">` per glyph | Fully baked in; archival / no text engine |

The [**SVG rendering** guide](/guide/render) has the annotated markup for each,
plus `style` / `fit` / `sizing` and the `debug` overlay flags.

## Tables

`renderTableToSVG(result, options?)` paints a `layoutTableFrame` result:
table/row/cell backgrounds, borders (solid, dashed, rounded corners),
`before`/`after` slots, and tables nested inside a cell — `options.preset`
above is forwarded to every cell's own text render. `options.fragment: true`
emits a bare `<g>` instead of an outer `<svg>`, for splicing into a document
that already has one. Full reference: the [Tables guide](/guide/tables).

## Generated API Reference

Full API documentation generated from source code — every interface, type
alias and function, one page per symbol:

- [Package index](/api/references/renderer/src/)
