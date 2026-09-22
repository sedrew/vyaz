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

## vs. Satori & vs. @react-pdf/textkit — at a glance

Two separate benches below, two different jobs, one word/style generator
shared across both so all three engines see identical content: `vs-satori.ts`
times the *full pipeline* (parse + layout + serialize to SVG); `vs-textkit.ts`
times *layout only* (textkit has no HTML input and no SVG output, so there's
no full-pipeline number to compare it on) — not one race, two different jobs:

| | 50 words | 500 words | 2,000 words | 10,000 words |
|---|---:|---:|---:|---:|
| vs. Satori (full pipeline) | 10.1× | 20.9× | 30.4× | 40.1× |
| vs. textkit (layout only) | 8.7× | 11.3× | 12.4× | 14.9× |

Exact ms and output-size figures are in the two tables below.

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

## vs. @react-pdf/textkit

```bash
bun run bench:textkit                           # 50 … 10,000 words
BENCH_MAX=2000 bun run bench:textkit            # cap the largest size
BENCH_SIZES=50,500,5000 bun run bench:textkit
```

`vs-textkit.ts` compares vyaz against react-pdf's
[@react-pdf/textkit](https://www.npmjs.com/package/@react-pdf/textkit) on
the same job — a rich-text document (styled paragraphs, bold/italic runs) in,
shaped/line-broken/positioned lines out — using the same word/style generator
as `vs-satori.ts` so both engines see identical content, and the same static
PT Sans fixture (textkit shapes glyphs via plain `fontkit.Font.layout()`, no
`fvar` support needed either way).

Unlike the Satori bench, both engines here get their *native* pre-built
rich-text input directly (a `TextFrame` for vyaz, per-paragraph
`Fragment[]` → `fromFragments()` for textkit) — textkit has no HTML/DOM
input and no serialize-to-SVG output, so only the shape + line-break +
justify stage is timed (`layoutTextFrame()` vs. textkit's `layoutEngine()`,
which internally shapes every run via fontkit, then runs Knuth-Plass line
breaking, bidi, script itemization, and justification). See the file's own
header comment for the full rationale.

| words | vyaz layout | vyaz lines | textkit layout | textkit lines | time ratio |
|---:|---:|---:|---:|---:|---:|
| 50 | 0.09 ms | 4 | 0.80 ms | 4 | 8.7× |
| 500 | 0.46 ms | 38 | 5.16 ms | 38 | 11.3× |
| 2,000 | 1.58 ms | 150 | 19.50 ms | 150 | 12.4× |
| 10,000 | 5.96 ms | 750 | 88.58 ms | 750 | 14.9× |

Line counts matching across every size is the content-parity check: both
engines wrap the identical word/style stream to (in this case) the same
number of lines, though that's not guaranteed in general — vyaz uses a
greedy line-breaker, textkit Knuth-Plass, so counts can diverge on other
inputs. This *is* an apples-to-apples comparison of the layout-engine stage
itself (not glued to different upstream/downstream pipelines), unlike the
Satori bench above.

### Fuzzing vyaz vs. textkit

```bash
bun run fuzz:textkit                              # 300 cases, seed 1
FUZZ_CASES=2000 FUZZ_SEED=7 bun run fuzz:textkit
FUZZ_GARBLE_RATE=0 bun run fuzz:textkit           # isolate line-breaking divergence
                                                   # from unbreakable-token overflow
FUZZ_VERBOSE=1 bun run fuzz:textkit               # print every flagged case's params
```

`fuzz-vs-textkit.ts` randomizes rich-text documents (size, weight, italic,
letter-spacing, alignment, occasional unbreakable long tokens) and diffs
vyaz against textkit for: crashes, content loss, overflow (a line wider than
its box when a break opportunity existed), line-count outliers, and autofit
divergence (vyaz's real `AutoFitEngine` 1%-grid shrink-to-fit search vs. a
hand-rolled textkit equivalent, same grid). It is **not** a pass/fail gate —
the two engines use different line-breaking algorithms (greedy vs.
Knuth-Plass) and are not expected to wrap identically — it prints a report
of what it found. See the file's own header comment for the full rationale
and the known limitations of its overflow-tolerance heuristics (hanging
trailing space/letter-spacing at a wrap point is expected and excluded, but
imperfectly — see the comments around `UNBREAKABLE_WORD_LEN` and
`spacingTolerance`).
