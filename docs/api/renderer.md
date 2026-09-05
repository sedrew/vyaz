# @vyaz/renderer

SVG renderer for Vyaz layout output.

## Presets

| Preset | Structure | Use case |
|--------|-----------|----------|
| `flat` | Single `<text>` with concatenated text | **PowerPoint / OOXML export** |
| `browser` | `<text>` + `<tspan>` per run | **Web / browser display** |
| `preserve` | `<text>` + `<tspan>` + `textLength` | **Pixel-perfect rendering** |
| `glyph` | `<tspan x="x0 x1 ...">` per glyph | **Selection / cursor positioning** |

Pass `{ debug: { frameBox, contentBox, baseline, … } }` for overlay boxes.

## Tables

`renderTableToSVG(result, options?)` paints a `layoutTableFrame` result:
table/row/cell backgrounds, borders (solid, dashed, rounded corners),
`before`/`after` slots, and tables nested inside a cell — `options.preset`
above is forwarded to every cell's own text render. `options.fragment: true`
emits a bare `<g>` instead of an outer `<svg>`, for splicing into a document
that already has one. Full reference: the [Tables guide](/guide/tables).

## Generated API Reference

Full API documentation generated from source code:

- [Package index](/vyaz/api/references/renderer/src/)
- [Functions](/vyaz/api/references/renderer/src/functions/)
- [Interfaces](/vyaz/api/references/renderer/src/interfaces/)
- [Type aliases](/vyaz/api/references/renderer/src/type-aliases/)
