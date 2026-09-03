<p align="center">
  <img src=".github/assets/logo.png" alt="Vyaz" width="160" height="160">
</p>

<h1 align="center">Vyaz</h1>

<p align="center">
  Rich‑text layout engine — TypeScript, isomorphic (browser + Bun/Node.js), pixel‑perfect typography.
</p>

<p align="center">
  <a href="https://sedrew.github.io/vyaz/playground">Playground</a> ·
  <a href="https://sedrew.github.io/vyaz/">Docs</a>
</p>

---

Vyaz parses styled text into positioned lines with precise font metrics and
renders them to SVG. It supports both a CSS‑Text line box and an Office
(PowerPoint / DrawingML) line box.

The engine works on a **TextFrame → Paragraph → TextRun** hierarchy, following
W3C CSS Text, CSS Writing Modes and CSS Inline Layout.

The name is [**Vyaz**](https://en.wikipedia.org/wiki/Vyaz) (Russian: вязь) — the
ligatured display script of old Slavonic manuscripts, where letters are bound
tightly into a single decorative band. Fitting, for an engine whose job is
binding runs of text into lines.

## Packages

| Package | Description |
|---|---|
| **@vyaz/core** | Layout engine — text-frame & paragraph layout, font metrics, autofit, compiler |
| **@vyaz/renderer** | SVG and Canvas renderers for the layout output |

The interactive **Playground** (Tiptap editor → live SVG) lives in the docs
site — `docs/` — not as a separate package.

## Install

```bash
bun add @vyaz/core @vyaz/renderer
```

## Quick start

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
        { text: 'Hello, ', fontFamily: 'Inter', fontSize: 16, fontWeight: 'normal', fontStyle: 'normal', color: '#111' },
        { text: 'Vyaz!', fontFamily: 'Inter', fontSize: 16, fontWeight: 'bold', fontStyle: 'normal', color: '#111' },
      ],
    },
  ],
}

const result = layoutTextFrame(frame)   // → LayoutResult
const svg = renderToSVG(result, { preset: 'browser' })
```

Register fonts before laying out (see [Fonts](#fonts)).

## Features

- **Text-frame layout** — multi-paragraph frames, padding, wrapping, vertical alignment
- **Rich runs** — bold, italic, size, colour, background, letter-spacing, sub/superscript, text-transform
- **Alignment** — left / center / right / justify, per paragraph
- **Line breaking** — soft & hard breaks, `white-space` (`normal` `nowrap` `pre` `pre-line` `pre-wrap`)
- **Lists** — bullet & numbered, nesting, `outside` / `inside` markers, custom bullet char, roman/alpha formats
- **Multi-column** — `column-fill: balance` (default) or `auto`
- **Autofit** — one proportional scale so the content fits the frame (`{ autofit: … }`)
- **Metric modes** — `browser` (CSS/Chrome line box) and `office` (PowerPoint / DrawingML) as a per-layout option
- **Font fallback** — `fontFamily: string | string[]` with `onMissingFont: 'throw' | 'substitute'`
- **SVG output** — four presets: `flat`, `browser`, `preserve`, `glyph`; CSS or XML style attributes; debug overlays
- **Pure JS** — the core measurement path is fontkit-only; no canvas polyfill in Node/Bun

## API

### `layoutTextFrame(frame, options?)`

```ts
import { layoutTextFrame } from '@vyaz/core'

const result = layoutTextFrame(frame, {
  mode: 'office',                   // 'browser' (default) | 'office'
  autofit: { minFontSize: 10 },     // true | { minFontSize? }
  onMissingFont: 'substitute',      // 'throw' (default) | 'substitute'
  glyphAdvances: true,              // fill Span.glyphAdvances (glyph preset / hit-testing)
})
```

The result:

```ts
interface LayoutResult {
  lines: Line[]
  content:  { width: number; height: number }        // intrinsic text bbox
  frame:    { width?: number; height?: number }       // as given on the input
  overflow: { horizontal: boolean; vertical: boolean }
  fit:      { horizontal: 'frame' | 'content'; vertical: 'frame' | 'content' }
  autofit?: { scale: number; clampedToMin: boolean }  // when autofit ran
  warnings?: LayoutWarning[]                           // font fallback / substitution
}
```

### `createLayoutEngine(options?)`

`layoutTextFrame` uses a shared engine with a bounded prepared-line cache. For
isolation (per document / per request), an explicit cache bound, or the ability
to drop the cache:

```ts
import { createLayoutEngine } from '@vyaz/core'

const engine = createLayoutEngine({ cache: { max: 1024 } })
const result = engine.layout(frame, { mode: 'browser' })
engine.clearCache()
```

### `renderToSVG(input, options?)`

```ts
import { renderToSVG } from '@vyaz/renderer'

// recommended — canvas size / sizing derived from the result
renderToSVG(result, { preset: 'preserve', style: 'css' })

// low-level — you supply width / height / sizing
renderToSVG(result.lines, {
  sizing: { horizontal: 'frame', vertical: 'content' },
  width: 400,
  preset: 'flat',
})
```

Presets: `flat` (one `<text>` per run), `browser` (`<tspan>` per run),
`preserve` (adds `textLength`), `glyph` (per-glyph `x`).

### Autofit primitives (low-level)

```ts
import { applyScale, findScale } from '@vyaz/core'
```

Prefer the `{ autofit }` layout option above; these stay for manual control.

## Fonts

Fonts must be registered before layout. Measurement is fontkit-only.

```ts
import { fontMetricsProvider, getFontBuffer } from '@vyaz/core'

// Node.js
import { readFileSync } from 'node:fs'
await fontMetricsProvider.registerFont('Inter', { weight: 'bold', style: 'normal' },
  readFileSync('/path/to/Inter-Bold.otf'))

// Browser
await fontMetricsProvider.registerFont('Inter', {},
  await getFontBuffer('https://example.com/Inter.woff2'))
```

Node.js can discover system fonts via `SystemFontRegistry` (imports `node:fs`,
so it is excluded from the browser bundle).

## Debug tooling

Invariant checks and semantic YAML snapshots live in a separate entry so
`js-yaml` never lands in the production bundle:

```ts
import { assertLineInvariants, linesToYAML } from '@vyaz/core/debug'
```

## Development

```bash
bun install
bun test            # unit + golden-corpus tests
bun run bench       # layout + render throughput, 100 … 1,000,000 runs
```

`bench/BASELINE.txt` holds reference numbers; re-run and diff after touching the
layout hot path.

## License

MIT
