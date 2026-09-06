# bench

```bash
bun run bench                                   # 100 … 1,000,000 runs
BENCH_MAX=100000 bun run bench                  # cap the largest size
BENCH_SIZES=100,5000,50000 bun run bench        # custom sizes
```

`throughput.ts` builds a `TextFrame` of N styled runs (~50 runs/paragraph,
width 800, wrapping), then measures per size:

| column       | what                                                              |
|--------------|------------------------------------------------------------------|
| build        | allocate the input `TextFrame`                                    |
| layout cold  | `layoutTextFrame()` with a fresh frame each iter (prepare-cache miss) |
| layout warm  | `layoutTextFrame()` on the same frame (prepare-cache hit)         |
| render flat  | `renderToSVG(lines, { preset: 'flat' })`                          |
| heap Δ       | `heapUsed` growth across one cold layout (working set)            |

`min` of N iterations is reported (capacity, not average). Unifont is loaded
from the test fixture so results don't depend on system fonts.

`BASELINE.txt` — reference numbers captured before the Slice-3 cache/hot-path
work. Re-run and diff after any change to `layout-*`, `ParagraphCompiler`,
`PositioningEngine`, or the pretext measure path.

## Tables

```bash
bun run bench:tables                            # 100x100 (10,201 cells)
BENCH_ROWS=20 BENCH_COLS=20 bun run bench:tables
BENCH_OUT=/tmp/table.svg bun run bench:tables    # also write the SVG
```

`table-throughput.ts` builds a header row + an R×C multiplication-table body
(center-aligned, Unifont — the alignment that used to blow up on an
auto-width natural-width measurement pass, see the core CHANGELOG-equivalent
commit history for `PositioningEngine`), then measures `layoutTableFrame()`
and `renderTableToSVG()` once each on the full grid.

## Resize

```bash
bun run bench:resize                                     # default sizes/grids, 30-step drag
RESIZE_STEPS=60 bun run bench:resize                     # longer drag
RESIZE_MIN=200 RESIZE_MAX=1600 bun run bench:resize       # wider sweep
RESIZE_TEXT_SIZES=1000,100000 bun run bench:resize
RESIZE_GRIDS=20x20,100x100 bun run bench:resize
```

`resize.ts` measures the cost of *re-laying-out the same frame at a new
width* — dragging a panel edge, a responsive breakpoint — for both
`TextFrame` and `TableFrame`. Unlike `throughput.ts`'s "layout cold" (fresh,
unique text every call — guaranteed prepare-cache miss), a resize keeps the
same paragraphs/cells and only changes `width`; `ParagraphLayoutEngine`'s
prepare-cache keys on text + per-run style, not width, so it should still
hit on every step.

Width sweeps a triangle wave (`RESIZE_MIN` → `RESIZE_MAX` → `RESIZE_MIN`)
over `RESIZE_STEPS` steps, simulating a drag out and back rather than one
jump. Each row reports `total` (one full drag session), `min`/`median`/`max`
per step, and a `cold` baseline (min of several fresh, fully-unique-content
layouts at the same size) so `cold/min` shows how much the prepare-cache is
actually worth for this scenario — in practice a modest 1.1×–1.9×, not the
dramatic win the cache gives `throughput.ts`'s cold/warm split, because most
of a resize's cost is line re-breaking and (for tables) the two-pass
column/row re-measurement, neither of which the prepare-cache touches.

## vs. Satori

```bash
bun run bench:satori                            # 50 … 10,000 words
BENCH_MAX=2000 bun run bench:satori             # cap the largest size
BENCH_SIZES=50,500,5000 bun run bench:satori
```

`vs-satori.ts` compares vyaz against [Vercel's Satori](https://github.com/vercel/satori)
on the same job — styled paragraph text in, an SVG string out — using one
shared word/style generator so both engines see identical content (see the
file's own header comment for exactly how, and why it isn't fed the same
HTML string despite both nominally being "HTML → SVG": Satori's own input is
a vnode tree, not HTML, and the community HTML shim that bridges that gap
throws under Bun). Static PT Sans (`bench/fixtures/`, OFL) is registered with
both engines, since Satori's `opentype.js` fork can't parse variable-font
`fvar` tables — no `Inter-Variable.ttf` here.

Per word count, `min` of N iterations for the full pipeline (parse + layout +
serialize to SVG for vyaz; `satori()` for Satori) plus output size:

| words | vyaz total | vyaz svg | satori total | satori svg | time ratio | size ratio |
|---:|---:|---:|---:|---:|---:|---:|
| 50 | 0.4 ms | 3.8 KB | 3.8 ms | 142 KB | 10.1× | 37.2× |
| 500 | 1.5 ms | 35 KB | 31.6 ms | 1.58 MB | 20.9× | 45.1× |
| 2,000 | 4.2 ms | 139 KB | 126.5 ms | 6.77 MB | 30.4× | 48.6× |
| 10,000 | 17.4 ms | 698 KB | 698.7 ms | 35.8 MB | 40.1× | 51.3× |

**Not an apples-to-apples output**, and the ratios say so, not just "vyaz is
faster": vyaz emits `<text>`/`<tspan>` referencing the font by name (small,
font-dependent at paint time); Satori converts every glyph to an outlined
`<path>` via `opentype.js` (font-independent, but the payload — and the
per-glyph path-extraction cost — grows with glyph complexity, not just
count). Satori is built for fixed-size OG-image generation; vyaz is a text
*layout* engine. Read the time/size ratios as the cost of that different
contract, not a verdict on either library.
