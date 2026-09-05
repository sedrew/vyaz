<p align="center">
  <img src=".github/assets/logo.png" alt="Vyaz" width="160" height="160">
</p>

<h1 align="center">Vyaz</h1>

<p align="center">
  Rich&#8209;text layout engine — TypeScript, isomorphic (browser + Bun/Node.js), pixel&#8209;perfect typography.
</p>

<p align="center">
  <a href="https://sedrew.github.io/vyaz/playground">Playground</a> ·
  <a href="https://sedrew.github.io/vyaz/cases">Cases</a> ·
  <a href="https://sedrew.github.io/vyaz/">Docs</a>
</p>

---

Vyaz parses styled text into positioned lines with precise font metrics and
renders them to SVG. It supports both a CSS&#8209;Text line box and an Office
(PowerPoint / DrawingML) line box.

The engine works on a **TextFrame → Paragraph → TextRun** hierarchy, following
W3C CSS Text and CSS Inline Layout.

One of the first pure&#8209;JS text layout engines with a real golden corpus:
line breaking and positioning are covered by **630+ unit tests** and **320+
golden SVG snapshots**, and every renderer preset is diffed against a frozen
Chrome oracle for browser‑metrics parity.

The name is **Vyaz** ([Вязь](https://en.wikipedia.org/wiki/Vyaz_(Cyrillic_calligraphy)))
— an ornate Cyrillic lettering style of Old Slavic origin, where letters are
bound tightly into a single decorative band.

## Packages

| Package | Description |
|---|---|
| **@vyaz/core** | Layout engine — text-frame, paragraph & table (`TableFrame`) layout, font metrics, autofit, compiler |
| **@vyaz/renderer** | SVG renderer for the layout output — text and tables |
| **@vyaz/converters** | Converts a formatted-HTML fragment to a `TextFrame` (inline formatting, lists, tables, images as inline boxes) |

The interactive **Playground** (Tiptap editor → live SVG), the HTML → SVG
**Converter**, and the **Cases** explorer (browse the golden corpus) live in
the docs site under `docs/`.

## Install

```bash
bun add @vyaz/core @vyaz/renderer
# converting HTML? add @vyaz/converters too
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

const result = layoutTextFrame(frame)
const svg = renderToSVG(result, { preset: 'browser' })
```

Register fonts before laying out (see [Fonts](#fonts)). Running in a browser?
The [Browser usage](https://sedrew.github.io/vyaz/guide/browser) guide covers the
one thing you have to get right (fonts go to the engine *and* `document.fonts`).

## Features

- **Text-frame layout** — multi-paragraph frames, padding, wrapping, vertical alignment
- **Rich runs** — bold, italic, size, colour, background, letter-spacing, sub/superscript, text-transform, underline, strikethrough
- **Alignment** — left / center / right / justify, per paragraph
- **Line breaking** — soft & hard breaks, `white-space` (`normal` `nowrap` `pre` `pre-line` `pre-wrap`)
- **Lists** — bullet & numbered, nesting, `outside` / `inside` markers, custom bullet char, roman/alpha formats
- **Multi-column** — `balance` (default) or `auto` fill
- **Autofit** — one proportional scale so the content fits the frame (`{ autofit: … }`)
- **Metric modes** — `browser` (CSS/Chrome line box) and `office` (PowerPoint / DrawingML) as a per-layout option
- **Font fallback** — `fontFamily: string | string[]` with `onMissingFont: 'throw' | 'substitute'`
- **Shaping** — opt-in `{ shaping: true }` measures through fontkit's OpenType layout (GPOS kerning + GSUB ligatures); matches Chrome to a fraction of a pixel on Latin / Cyrillic / Greek
- **SVG output** — four presets: `flat`, `browser`, `preserve`, `glyph`; CSS or XML style attributes; debug overlays
- **Pure JS** — the measurement path is fontkit-only; no canvas or native addon required
- **Tables** — `TableFrame` grid layout: measured columns/rows, `colSpan`/`rowSpan`
  (including `colSpan: 'auto'`), per-side borders with dash patterns and rounded
  corners, `before`/`after` decorative slots, nested tables, `renderTableToSVG` —
  see the [Tables guide](https://sedrew.github.io/vyaz/guide/tables)

## Benchmark

`bun run bench` — a `TextFrame` of N styled runs (~50 runs/paragraph, width 800,
wrapping), Unifont from the test fixture. `min` of N iterations:

| runs | layout (cold) | layout (warm cache) | render → SVG |
|---:|---:|---:|---:|
| 1,000 | 0.9 ms | 0.8 ms | 1.5 ms |
| 10,000 | 9.7 ms | 8.8 ms | 13.5 ms |
| 100,000 | 97 ms | 84 ms | 123 ms |
| 1,000,000 | 0.90 s | 0.88 s | 1.4 s |

≈ **1M styled runs/second** laid out, ≈ 1.2M/s on a warm prepared-line cache.
`bench/BASELINE.txt` holds reference numbers — re-run and diff after touching the
layout hot path.

`bun run bench:tables` — `layoutTableFrame` + `renderTableToSVG` on an R×C
multiplication-table grid, center-aligned, Unifont. Configurable via env vars
(`BENCH_ROWS`, `BENCH_COLS`, `BENCH_OUT` to also write the SVG):

| grid (rows×cols) | cells | layout | render |
|---:|---:|---:|---:|
| 11×11 | 121 | 18.0 ms | 2.4 ms |
| 51×51 | 2,601 | 53.2 ms | 15.7 ms |
| 101×101 | 10,201 | 115.8 ms | 52.9 ms |

`bun run bench:resize` — re-layout cost when only `width` changes (a
drag-resize), same frame reused each step so the prepare-cache should hit
every time — vs. a `cold` (unique-content) baseline at the same size, for
both `TextFrame` and `TableFrame`:

| size | min/step (resize) | cold (fresh) | cold/min |
|---|---:|---:|---:|
| 10,000 runs (text) | 8.7 ms | 9.6 ms | 1.1× |
| 100,000 runs (text) | 87.3 ms | 96.8 ms | 1.1× |
| 50×50 table (2,601 cells) | 9.9 ms | 15.7 ms | 1.6× |
| 100×100 table (10,201 cells) | 45.3 ms | 62.3 ms | 1.4× |

The prepare-cache's win here is modest — most of a resize's cost is line
re-breaking and (for tables) the two-pass column/row re-measurement, neither
of which is cached across calls.

Column/row sizing is two `layoutTextFrame` passes per cell — algorithmically
linear in total cell content; see [`bench/table-throughput.ts`](bench/table-throughput.ts).

## API

### `layoutTextFrame(frame, options?)`

```ts
import { layoutTextFrame } from '@vyaz/core'

const result = layoutTextFrame(frame, {
  mode: 'office',                   // 'browser' (default) | 'office'
  shaping: true,                    // measure with GPOS kerning + GSUB ligatures
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
`preserve` (adds `textLength` so the browser stretches text to the engine's
metrics), `glyph` (per-glyph `x`).

### Autofit primitives (low-level)

```ts
import { applyScale, findScale } from '@vyaz/core'
```

Prefer the `{ autofit }` layout option above; these stay for manual control.

### `layoutTableFrame(table, options?)` / `renderTableToSVG(result, options?)`

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

Column widths and row heights are measured from cell content (each cell's own
`TextFrame` laid out like any other text box) unless `columnWidths`/
`rowHeights`/`width`/`height` override them. `colSpan`/`rowSpan` (including
`colSpan: 'auto'` for a ragged row's last cell), per-side borders (solid,
dashed via `borderPatterns`/`borderShapes`, rounded via `rx`/`ry`),
`before`/`after` decorative slots, and nesting a `TableFrame` inside a cell
are all supported — full reference in the [Tables guide](https://sedrew.github.io/vyaz/guide/tables).

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

For a variable font, pass `variation` to pin an instance:

```ts
await fontMetricsProvider.registerFont('Inter', { weight: '700', variation: { wght: 700 } }, bytes)
```

Node.js can discover system fonts via `SystemFontRegistry` (imports `node:fs`,
so it is excluded from the browser bundle).

## Debug tooling

Invariant checks and semantic YAML snapshots live in a separate entry so
`js-yaml` never lands in the production bundle:

```ts
import { assertLineInvariants, linesToYAML } from '@vyaz/core/debug'
```

## Roadmap

See [ROADMAP.md](ROADMAP.md) — shaping by default, per-glyph font fallback,
RTL / BiDi, vertical writing modes, and more.

## Development

```bash
bun install
bun test            # unit + golden-corpus tests
bun run bench       # layout + render throughput, 100 … 1,000,000 runs
```

## License

MIT
