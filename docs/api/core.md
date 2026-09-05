# @vyaz/core

Rich text layout engine — TypeScript, isomorphic (browser + Bun/Node.js), pixel-perfect typography.

The engine operates on a **TextFrame → Paragraph → TextRun** hierarchy, following W3C CSS Text and CSS Inline Layout.

## Features

- **Text frame layout** — multi-paragraph frames with padding, wrapping, and vertical alignment
- **Multi-font, multi-style text** — bold, italic, size, colour, background, sub/superscript, letter-spacing, underline, strikethrough, text-transform
- **Text alignment** — left, center, right, justify, per paragraph
- **Line wrapping** — soft/hard breaks, `white-space` (`normal` `nowrap` `pre` `pre-line` `pre-wrap`)
- **Lists** — nested bullet / numbered, `outside` / `inside` markers, custom bullet char, roman / alpha
- **Multi-column** — balanced or `auto` fill
- **Auto-fit** — scale text proportionally to fit the container
- **Shaping** — opt-in `{ shaping: true }` for GPOS kerning + GSUB ligatures (browser-metrics parity)
- **Inline widgets** — reserve width for embedded objects (`type: 'inline-box'`) inside the text flow
- **`TextRun.data`** — open-ended metadata the layout engine ignores, for cross-cutting features like a hyperlink's `href`
- **Tables** — `TableFrame` grid layout alongside `TextFrame`: measured column widths/row heights, `colSpan`/`rowSpan`, per-side borders (dash patterns, rounded corners), `before`/`after` slots, nested tables — see the [Tables guide](/guide/tables)
- **Office-compatible mode** — `mode: 'office'` for PowerPoint / DrawingML line boxes
- **Font metrics** — fontkit-based metric extraction; variable-font instancing; optional system font registry (Node)

## Module Structure

```
src/
├── compile/        — DocumentCompiler, paragraph→token compilation
├── layout/         — Layout engines (Paragraph, TextFrame, Positioning, AutoFit)
├── measure/        — Font metrics, fontkit integration, system font registry
├── types/          — TypeScript type definitions (Document, Font, Layout)
└── utils/          — Helpers (font, list, text transform, env detection)
```

## Generated API Reference

Full API documentation generated from source code — every class, interface,
type alias and function, one page per symbol:

- [Package index](/api/references/core/src/)
