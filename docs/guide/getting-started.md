# Getting Started

## Installation

```bash
npm install @vyaz/core @vyaz/renderer
# or
bun add @vyaz/core @vyaz/renderer
```

## Quick Start

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

## Packages

| Package | Description |
|---------|-------------|
| **@vyaz/core** | Text frame and paragraph layout engine, font metrics, auto-fit, compiler |
| **@vyaz/renderer** | SVG and Canvas renderers for layout output |