# Tables

`TableFrame` is a grid layout sibling of `TextFrame`: rows of cells, each
cell's content a full recursive `TextFrame` (or another `TableFrame` — see
[Nested tables](#nested-tables)). Column widths and row heights are
*measured* from cell content, the same way paragraph width is measured from
runs — you don't hand-compute a grid, you describe cells and the engine
sizes them.

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

const result = layoutTableFrame(table)
const svg = renderTableToSVG(result, { preset: 'browser' })
```

`layoutTableFrame` does the sizing and positioning (`TableLayoutResult`);
`renderTableToSVG` paints it. They're separate the same way `layoutTextFrame`
and `renderToSVG` are — you can inspect/transform the layout result before
rendering.

## Sizing

By default, column widths follow the widest natural (unwrapped) cell in that
column, and row heights follow the tallest laid-out cell in that row.
Override either explicitly:

```ts
const table: TableFrame = {
  columnWidths: [100, 200],   // px, per column — skips measurement
  rowHeights: [40, 60],       // px, per row
  rows: [ /* … */ ],
}
```

Or give the table a total target and let columns/rows scale proportionally
to fit:

```ts
const table: TableFrame = {
  width: 500,   // narrower than natural: columns shrink, text wraps to absorb it
  height: 300,  // narrower than natural: rows shrink — text can't "wrap" to
                // absorb it the way width does, so short of a certain point
                // content overflows the row (see allowOverflow below)
  rows: [ /* … */ ],
}
```

`width`/`height` apply after whichever source produced the base sizes —
measured, or an explicit `columnWidths`/`rowHeights` override.

## colSpan / rowSpan

```ts
{ cells: [{ ...cell('Header'), colSpan: 2 }] }
```

A spanning cell's own natural width/height only ever **widens** the columns
or rows it covers — it never shrinks them below what a non-spanning cell in
that column/row already needs.

The last cell of a row can also take `colSpan: 'auto'` to stretch across
every remaining column — handy for a footer/total row that shouldn't leave a
gap next to a wider table above it:

```ts
{ cells: [{ ...cell('Total: $23.50'), colSpan: 'auto' }] }
```

This is opt-in: a genuinely short last cell keeps `colSpan: 1` unless you ask
for `'auto'`. It's a no-op anywhere but a row's last cell.

## Styling

`TableStyle` (the table's own outer border/background), `TableRowStyle`, and
`TableCellStyle` all share the same border surface — set once via
`defaultCellStyle`/`defaultRowStyle`, override per row/cell:

```ts
const table: TableFrame = {
  style: { margins: 8, colGaps: 4, rowGaps: 4, borderWidths: 2, borderColors: '#333', rx: 12, ry: 12 },
  defaultCellStyle: { paddings: 8, borderWidths: 1, borderColors: '#ddd', bgColor: '#fff' },
  rows: [ /* … */ ],
}
```

- **`paddings` / `borderWidths` / `borderColors`** — CSS shorthand: a single
  number/color for all sides, `[topBottom, leftRight]`, or
  `[top, right, bottom, left]`.
- **`rx` / `ry`** — a uniform corner radius (all four corners). One given,
  the other defaults to it.
- **`borderPatterns`** — per-side SVG `stroke-dasharray`: `[6, 3]` for one
  pattern on every side, or `[[topBottom], [leftRight]]` / one array per
  side (`[t, r, b, l]`) for different sides. An empty array (`[]`) or an
  absent side is solid.
- **`borderShapes`** — per-side `stroke-linecap` (`'butt'` default,
  `'round'`, `'square'`), same shorthand shape as `borderPatterns`.

```ts
{ borderWidths: 2, borderColors: '#0b3d91', borderPatterns: [10, 5], borderShapes: 'round' }
```

A border whose four sides don't all share one width **and** color **and**
pattern **and** linecap can't be drawn as a single stroked rect (SVG has one
`stroke-dasharray` per shape) — the renderer falls back to four `<line>`s,
each with its own dasharray/linecap.

## Cell content

- **`verticalAlign`** (`'top'` default, `'middle'`, `'bottom'`) — positions
  content within the cell's full height (only visible when the row is
  taller than the content).
- **`cx` / `cy`** — a px nudge applied on top of padding/alignment, for
  fine-tuning a single cell's content position independent of everything
  else.
- **`allowOverflow`** (`false` default) — a cell's content is a nested
  `<svg>` that clips at the padding box by default; `allowOverflow: true`
  sets `overflow: visible` so content wider/taller than the cell paints past
  its edges instead.

```ts
{ ...cell('note'), style: { verticalAlign: 'middle', cy: -2, allowOverflow: true } }
```

## `before` / `after` decorative slots

Independent of the cell's own content and its alignment, `before`/`after`
anchor a second `TextFrame` to the left/right edge, vertically centered in
the cell's full height — a status dot before a label, a checkmark after it:

```ts
{
  content: /* … main text … */,
  before: { wrap: true, paragraphs: [{ /* … */, children: [{ type: 'text', text: '●', color: '#22863a', /* … */ }] }] },
  after:  { wrap: true, paragraphs: [{ /* … */, children: [{ type: 'text', text: '✓', color: '#22863a', /* … */ }] }] },
}
```

They're laid out unwrapped at their own natural size and don't affect
column-width measurement — a narrow column can make them overlap `content`,
the same tradeoff `allowOverflow` accepts.

## Nested tables

A cell's `content` can be a `TableFrame` instead of a `TextFrame`:

```ts
{
  content: {
    defaultCellStyle: { paddings: 6, borderWidths: 1, borderColors: '#ccd' },
    rows: [
      { style: { bgColor: '#eef' }, cells: [cell('City'), cell('Pop.')] },
      { cells: [cell('Paris'), cell('2.1M')] },
    ],
  },
}
```

The nested table is laid out at the outer cell's own content width and
rendered as a `<g>` fragment spliced directly into the outer SVG (no nested
`<svg>` inside `<svg>` inside `<svg>`). Nesting depth is unbounded in the
type system, but `layoutTableFrame` throws past 50 levels as a guard against
a cyclic/pathological structure rather than hanging.

## Rendering options

```ts
renderTableToSVG(result, {
  preset: 'browser',   // forwarded to every cell's own text render — see @vyaz/renderer's presets
  style: 'xml',        // how cell text style properties are expressed
  className: 'my-table',
  fragment: true,       // emit a bare <g> instead of <svg xmlns… viewBox…>,
                         // for splicing into a document that already has one
})
```

## More examples

The full style surface above is exercised by the renderer's golden-corpus
tests — every case renders both the `input.json` and its expected SVG side
by side: [`packages/renderer/tests/table-cases/`](https://github.com/sedrew/vyaz/tree/main/packages/renderer/tests/table-cases).
