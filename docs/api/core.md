# @vyaz/core

Rich text layout engine — TypeScript, isomorphic (browser + Bun/Node.js), pixel-perfect typography.

The engine operates on a **TextFrame → Paragraph → TextRun** hierarchy, following W3C CSS Text, CSS Writing Modes, and CSS Inline Layout specifications.

## Features

- **Text frame layout** — multi-paragraph frames with padding, wrapping, and vertical alignment
- **Multi-font, multi-style text** — bold, italic, size, color, subscript/superscript, letter-spacing
- **Text alignment** — left, center, right, justify
- **Line wrapping** — soft/hard breaks, `white-space` control (normal, nowrap, pre)
- **Writing modes** — `horizontal-tb`, `vertical-rl`, `vertical-lr` with text orientation
- **Auto-fit** — scale text proportionally to fit the container (`AutofitConfig`)
- **Inline widgets** — embedded objects (icons, images) inside the text flow
- **Office-compatible mode** — `mode: 'office'` for PowerPoint/DrawingML rendering
- **Font metrics** — system font registry with fontkit-based metric extraction
- **Compiler** — paragraph compilation with token preparation for external renderers

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

Full API documentation generated from source code:

- [Package index](/vyaz/api/references/core/src/)
- [Classes](/vyaz/api/references/core/src/classes/)
- [Interfaces](/vyaz/api/references/core/src/interfaces/)
- [Functions](/vyaz/api/references/core/src/functions/)
