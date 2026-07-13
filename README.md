# Vyaz

Rich text layout engine — TypeScript, isomorphic (browser + Bun/Node.js), pixel-perfect typography.

Parses styled text into positioned lines with precise font metrics, supporting both CSS Text and Office (PowerPoint/DrawingML) rendering modes.

The engine operates on a **TextFrame → Paragraph → TextRun** hierarchy, following W3C CSS Text, CSS Writing Modes, and CSS Inline Layout specifications.

## Packages

| Package | Description |
|---------|-------------|
| **@vyaz/core** | Text frame and paragraph layout engine, font metrics, auto-fit, compiler |
| **@vyaz/renderer** | SVG and Canvas renderers for layout output |
| **@vyaz/demo** | Demo application |

## Quick Start

```bash
bun add @vyaz/core @vyaz/renderer
```

```ts
import { layoutTextFrame } from '@vyaz/core';
import { renderToSVG } from '@vyaz/renderer';
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
const svg = renderToSVG(result.lines, { preset: 'browser', width: 400, height: 100 });

console.log(svg);
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
- **SVG output** — four presets: `flat`, `browser`, `preserve`, `glyph` with CSS or XML styles
- **Canvas output** — with debug overlays (box, baseline, ascent/descent, frame, labels, runs, line gap)
- **Font metrics** — system font registry with fontkit-based metric extraction
- **Compiler** — paragraph compilation with token preparation for external renderers

## Usage

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

### SVG Render

```ts
import { renderToSVG, renderParagraphToSVG, renderResultToSVG } from '@vyaz/renderer';
import type { SVGRenderOptions, SvgPreset, SvgStyle, SvgFit, SvgSizing } from '@vyaz/renderer';

// From lines
const svg = renderToSVG(result.lines, {
  preset: 'browser',     // flat | browser | preserve | glyph
  style: 'css',          // css | xml
  fit: 'text',           // none | text | frag
  width: 400,
  height: 200,
});

// From ParagraphLayoutResult
const svg2 = renderResultToSVG(result, { preset: 'browser' });

// From a single paragraph
const svg3 = renderParagraphToSVG(paragraphLines, { preset: 'preserve' });
```

### Canvas Render

```ts
import { renderToCanvas, renderDebugToCanvas } from '@vyaz/renderer';
import type { CanvasRenderOptions, DebugFlags } from '@vyaz/renderer';

const canvas = document.getElementById('myCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

renderToCanvas(ctx, result.lines, {
  width: 400,
  height: 200,
});

// With debug overlays
renderDebugToCanvas(ctx, result.lines, {
  box: true,
  baseline: true,
  ascentDescent: true,
  frame: true,
  labels: true,
  runs: true,
  lineGap: true,
});
```

### Font Metrics

```ts
import { FontMetricsProvider, SystemFontRegistry } from '@vyaz/core';
import type { FontMetrics, IFontMetricsProvider } from '@vyaz/core';

const provider = new FontMetricsProvider();
const metrics: FontMetrics = provider.getMetrics('Arial', 16, 'normal', 400);

// System font discovery
const registry = new SystemFontRegistry();
const fontPaths = registry.findFont('Arial');
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

## License

MIT