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

## Generated API Reference

Full API documentation generated from source code:

- [Package index](/vyaz/api/references/renderer/src/)
- [Functions](/vyaz/api/references/renderer/src/functions/)
- [Interfaces](/vyaz/api/references/renderer/src/interfaces/)
- [Type aliases](/vyaz/api/references/renderer/src/type-aliases/)
