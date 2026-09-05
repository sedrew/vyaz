# @vyaz/renderer

SVG renderer for [`@vyaz/core`](https://www.npmjs.com/package/@vyaz/core) layout
output — both a plain `TextFrame` and a `TableFrame` grid.

Part of the [Vyaz](https://github.com/sedrew/vyaz) project.

```bash
bun add @vyaz/core @vyaz/renderer
# or
npm install @vyaz/core @vyaz/renderer
```

## Quick start — text

```ts
import { layoutTextFrame } from '@vyaz/core'
import { renderToSVG } from '@vyaz/renderer'
import type { TextFrame } from '@vyaz/core'

const frame: TextFrame = {
  width: 400,
  wrap: true,
  paragraphs: [
    {
      style: { alignment: 'left', lineHeight: 1.4, spaceBefore: 0, spaceAfter: 0 },
      children: [
        { type: 'text', text: 'Hello, ', fontFamily: 'Inter', fontSize: 16, fontWeight: 'normal', fontStyle: 'normal', color: '#111' },
        { type: 'text', text: 'Vyaz!', fontFamily: 'Inter', fontSize: 16, fontWeight: 'bold', fontStyle: 'normal', color: '#111' },
      ],
    },
  ],
}

const svg = renderToSVG(layoutTextFrame(frame), { preset: 'browser' })
```

## Quick start — tables

```ts
import { layoutTableFrame } from '@vyaz/core'
import { renderTableToSVG } from '@vyaz/renderer'
import type { TableFrame } from '@vyaz/core'

const cell = (text: string) => ({
  content: {
    wrap: true,
    paragraphs: [{
      style: { alignment: 'left', lineHeight: 1.3, spaceBefore: 0, spaceAfter: 0 },
      children: [{ type: 'text', text, fontFamily: 'Inter', fontSize: 14, fontWeight: 'normal', fontStyle: 'normal', color: '#111' }],
    }],
  },
})

const table: TableFrame = {
  defaultCellStyle: { paddings: 8, borderWidths: 1, borderColors: '#ccc' },
  rows: [
    { style: { bgColor: '#eee' }, cells: [cell('Name'), cell('Qty')] },
    { cells: [cell('Widget'), cell('3')] },
  ],
}

const svg = renderTableToSVG(layoutTableFrame(table), { preset: 'browser' })
```

`renderTableToSVG` paints table/row/cell backgrounds and borders (solid,
dashed, rounded corners), each cell's text content, `colSpan`/`rowSpan`,
`before`/`after` decorative slots, and tables nested inside a cell — see the
[Tables guide](https://sedrew.github.io/vyaz/guide/tables) for the full style
surface.

## Text presets

| Preset | Structure | Use case |
|--------|-----------|----------|
| `flat` | Single `<text>` with concatenated text | PowerPoint / OOXML export |
| `browser` | `<text>` + `<tspan>` per run | Web / browser display |
| `preserve` | `<text>` + `<tspan>` + `textLength` | Pixel-perfect rendering |
| `glyph` | `<tspan x="x0 x1 ...">` per glyph | Selection / cursor positioning |

```ts
renderToSVG(result, { preset: 'preserve', style: 'css' })

// low-level — supply width/height/sizing yourself instead of deriving from the result
renderToSVG(result.lines, { sizing: { horizontal: 'frame', vertical: 'content' }, width: 400, preset: 'flat' })
```

Pass `{ debug: { frameBox, contentBox, baseline, … } }` for overlay boxes.

## `registerFont(family, source, opts?)`

Registers a font with **both** `@vyaz/core`'s measurement engine and the
browser's `document.fonts` in one call — the single most common source of
drift between measured and painted text is registering only one of the two.

```ts
import { registerFont } from '@vyaz/renderer'

await registerFont('Inter', 'https://example.com/Inter.woff2')
// or a local buffer (Node.js)
import { readFileSync } from 'node:fs'
await registerFont('Inter', readFileSync('./Inter.woff2'), { weight: 'normal', style: 'normal' })
```

## `TableRenderOptions`

| option | default | |
|---|---|---|
| `preset` | `'browser'` | forwarded to every cell's own text render |
| `style` | `'xml'` | how cell text style properties are expressed |
| `className` | – | CSS class on the root `<svg>`/`<g>` |
| `fragment` | `false` | emit a bare `<g>` instead of `<svg xmlns… viewBox…>`, for splicing into a document that already has one |

## Requirements

- **Runtime**: Bun 1.x, Node.js 18+, or a modern browser
- **Peer**: `@vyaz/core` (matching major/minor)

## License

MIT
