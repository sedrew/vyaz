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
