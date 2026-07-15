# @vyaz/renderer

SVG and Canvas renderers for Vyaz layout output.

## Renderers

### SVG Renderer

Four presets for different use cases:

| Preset | Structure | Use case |
|--------|-----------|----------|
| `flat` | Single `<text>` with concatenated text | **PowerPoint / OOXML export** |
| `browser` | `<text>` + `<tspan>` per run | **Web / browser display** |
| `preserve` | `<text>` + `<tspan>` + `textLength` | **Pixel-perfect rendering** |
| `glyph` | `<tspan x="x0 x1 ...">` per glyph | **Selection / cursor positioning** |

### Canvas Renderer

Renders lines to HTML Canvas 2D context with optional debug overlays.

## Generated API Reference

Full API documentation generated from source code:

- [Package index](/vyaz/api/references/renderer/src/)
- [Functions](/vyaz/api/references/renderer/src/functions/)
- [Interfaces](/vyaz/api/references/renderer/src/interfaces/)
- [Type aliases](/vyaz/api/references/renderer/src/type-aliases/)
