# Vyaz

Rich text layout engine — TypeScript, isomorphic (browser + Bun/Node.js), pixel-perfect typography.

Parses styled text into positioned lines with precise font metrics, supporting both CSS and Office (PowerPoint) rendering.

## Packages

| Package | Description |
|---------|-------------|
| **@vyaz/core** | Paragraph layout engine, font metrics, auto-fit, text frame layout |
| **@vyaz/renderer** | SVG and Canvas renderers for layout output |

## Quick Start

```bash
bun add @vyaz/core @vyaz/renderer
```

```ts
import { ParagraphLayoutEngine } from '@vyaz/core';
import { renderToSVG } from '@vyaz/renderer';
import type { Paragraph } from '@vyaz/core';

const paragraph: Paragraph = {
  style: { fontSize: 16, fontFamily: 'Arial' },
  children: [
    { text: 'Hello, Vyaz!', style: { bold: true } },
  ],
};

const engine = new ParagraphLayoutEngine();
const result = engine.layout(paragraph, 400);
const svg = renderToSVG(result.lines, { preset: 'browser' });

console.log(svg);
```

## Features

- Multi-font, multi-style text layout (bold, italic, size, color)
- Text alignment: left, center, right, justify
- Line wrapping with soft/hard breaks
- Office (PowerPoint/DrawingML) compatible mode — `mode: 'office'`
- Auto-fit (scale text to fit container)
- Text frames with multi-paragraph layout
- SVG output with multiple presets: flat, browser, preserve, glyph
- Canvas output with debug overlays

## Usage

```ts
import { ParagraphLayoutEngine, layoutTextFrame } from '@vyaz/core';
import { renderToSVG, renderToCanvas } from '@vyaz/renderer';
```

### Layout

```ts
const engine = new ParagraphLayoutEngine();
const result = engine.layout(paragraph, maxWidth, { mode: 'browser' });
// → ParagraphLayoutResult { lines: LineBox[], width, height, contentWidth, contentHeight }
```

### SVG Render

```ts
const svg = renderToSVG(result.lines, {
  preset: 'browser',     // flat | browser | preserve | glyph
  width: 400,
  height: 200,
});
```

### Canvas Render

```ts
const canvas = document.getElementById('myCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
renderToCanvas(ctx, result.lines, {
  debug: { box: true, baseline: true },
});
```

## License

MIT