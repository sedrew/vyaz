# @vyaz/core

Rich text layout engine — TypeScript, isomorphic (browser + Bun/Node.js), pixel-perfect typography.

Part of the [Vyaz](https://github.com/sedrew/vyaz) project. Parses styled text into positioned lines with precise font metrics, supporting both CSS Text and Office (PowerPoint/DrawingML) rendering modes.

The engine operates on a **TextFrame → Paragraph → TextRun** hierarchy, following W3C CSS Text, CSS Writing Modes, and CSS Inline Layout specifications.

## Installation

```bash
bun add @vyaz/core
# or
npm install @vyaz/core
```

## Quick Start

```ts
import { layoutTextFrame } from '@vyaz/core';
import type { TextFrame } from '@vyaz/core';

const frame: TextFrame = {
  width: 400,
  wrap: true,
  paragraphs: [
    {
      style: { alignment: 'left', lineHeight: 1.4, spaceBefore: 0, spaceAfter: 0 },
      children: [
        { text: 'Hello, Vyaz!', fontFamily: 'Arial', fontSize: 16, fontWeight: 'bold', fontStyle: 'normal', color: '#000' },
      ],
    },
  ],
};

const result = layoutTextFrame(frame);
console.log(result.lines);
```

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

## API Overview

### Text Frame Layout

```ts
import { layoutTextFrame } from '@vyaz/core';
import type { TextFrame, TextFrameLayoutResult } from '@vyaz/core';

const frame: TextFrame = {
  width: 600,
  height: 400,
  wrap: true,
  padding: { top: 20, right: 20, bottom: 20, left: 20 },
  verticalAlignment: 'top',
  paragraphs: [
    {
      style: { alignment: 'left', lineHeight: 1.4, spaceBefore: 0, spaceAfter: 12 },
      children: [
        { text: 'First paragraph', fontFamily: 'Arial', fontSize: 16, fontWeight: 'normal', fontStyle: 'normal', color: '#000' },
      ],
    },
  ],
};

const result: TextFrameLayoutResult = layoutTextFrame(frame);
// → { lines: Line[], frameWidth?, frameHeight?, contentWidth, contentHeight, fitHorizontal, fitVertical }
```

### Autofit

```ts
import { applyScale, findScale } from '@vyaz/core';
import type { AutoFitOptions, AutoFitResult } from '@vyaz/core';

const scale: AutoFitResult = findScale(contentWidth, contentHeight, frameWidth, frameHeight);
const scaledLines = applyScale(result.lines, scale);
```

### Font Registration & Metrics

```ts
import {
  FontMetricsProvider,
  SystemFontRegistry,
  createFontFace,
  getFontBuffer,
} from '@vyaz/core';
import type { FontMetrics, IFontMetricsProvider, FontFace } from '@vyaz/core';

const provider = new FontMetricsProvider();

// Node.js — register from a local file
import { readFileSync } from 'node:fs';
const buffer = readFileSync('/path/to/font.ttf');
await provider.registerFont('MyFont', { weight: 'bold', style: 'normal' }, buffer);

// Browser — register from a URL
await provider.registerFont('MyFont', {}, 'https://example.com/font.woff2');

// Get pixel metrics
const metrics: FontMetrics = provider.getMetrics('MyFont', 16);
// → { ascent, descent, capHeight, unitsPerEm, sourceTable }
```

### Compiler

```ts
import { compileParagraph, getParagraphText, makeFontToken } from '@vyaz/core';
import type { PreparedRichInlineItem } from '@vyaz/core';

const items: PreparedRichInlineItem[] = compileParagraph(paragraph, defaultStyle);
const text: string = getParagraphText(paragraph);
const token: string = makeFontToken(fontFamily, fontSize, fontWeight, fontStyle);
```

### Paragraph Layout Engine (low-level)

```ts
import { ParagraphLayoutEngine, paragraphLayoutEngine } from '@vyaz/core';

const engine = new ParagraphLayoutEngine();
const result = engine.layout(paragraph, maxWidth, yOffset);
// → ParagraphLayoutResult { lines: Line[], width, height, contentWidth, contentHeight }
```

## Package Structure

```
src/
├── compile/        — DocumentCompiler, paragraph→token compilation
├── layout/         — Layout engines (Paragraph, TextFrame, Positioning, AutoFit)
├── measure/        — Font metrics, fontkit integration, system font registry
├── types/          — TypeScript type definitions (Document, Font, Layout)
└── utils/          — Helpers (font, list, text transform, env detection)
```

## Requirements

- **Runtime**: Bun 1.x, Node.js 18+, or modern browser
- **Optional**: `@napi-rs/canvas`, `fontkit`, `get-system-fonts` for Node.js font metrics

## License

MIT