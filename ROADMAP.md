# Roadmap

Direction, not a schedule. Order within a section is rough priority.

## Next

- **Shaping by default** for the `browser` / `preserve` SVG presets. The `glyph`
  preset gets shaped per-cluster advances so ligature-heavy fonts position
  correctly (today its per-character `x` is naive).
- ~~**`registerWebFont(family, url, opts)`** — one call that feeds both the metrics
  engine and `document.fonts`.~~ Shipped as `registerFont` in `@vyaz/renderer`.
- **Per-glyph font fallback** — walk a family chain for a missing code point
  instead of falling back to `.notdef` / a `0.5em` estimate.
- **`text-decoration` styles** — dashed / dotted / wavy, custom colour and
  thickness (the types already accept them; the engine ignores them).
- **SVG-only text effects** — a paint-time pass in `@vyaz/renderer` for features
  the layout engine cannot position for but SVG renders natively: `overline`,
  decoration style/colour, `text-shadow`, glyph stroke / gradient fill,
  small-caps. Emitted as presentation attributes / `<filter>` over the finished
  `<text>`, metrics untouched.
- **Canvas renderer** — currently exported but untested and undocumented. Either
  bring it to SVG parity with its own golden corpus, or drop it from the public
  API.

## Later

- **Per-cell segmentation cost at large table sizes** — `bun --cpu-prof-md`
  profiling of `bench/table-throughput.ts` at 200×200 (40,401 cells) shows the
  dominant cost isn't GC (heap snapshot: ~78MB live, in line with allocation
  volume, but CPU self-time has no GC entries near the top) — it's `pretext`'s
  full UAX segmentation (word/line-break analysis, CJK/Arabic detection,
  URL/numeric run merging) running on every cell's content, even a 1-3
  character string. `preparedCacheKey` is keyed on content, so a table with
  mostly-unique short strings (a multiplication table, e.g.) gets a near-100%
  cache miss rate — the segmentation setup cost is paid per cell rather than
  amortized. A fast path that skips the heavy UAX machinery for short,
  plain-ASCII, no-special-character runs could help; needs care not to break
  CJK/Arabic/URL/quote handling for the runs that do need it. Not a problem
  at realistic table sizes (bench/table-throughput.ts's default 100×100 stays
  near-linear); only shows up in the tens-of-thousands-of-cells range.
- **Asymmetric table border corner radii** — `TableStyle`/`TableRowStyle`/
  `TableCellStyle` `rx`/`ry` are uniform (all four corners) today; per-corner
  radii are a possible future addition to `BorderStyles`.
- **`@vyaz/converters` table-nesting depth guard** — `<table>` nested inside a cell
  already converts (recursively, through the inline-box path), but that path
  has no recursion-depth cap, unlike `@vyaz/core`'s `TableFrame`-in-`TableCell`
  primitive (`TableLayoutOptions._depth`, throws past 50 levels). Low risk in
  practice, real risk on untrusted/generated HTML.
- **`@vyaz/converters` `data:` image size-sniffing cost** — `sniffDataImageSize`
  (`src/image.ts`, the fallback when an `<img>` has no `width`/`height`) fully
  base64-decodes the entire payload into a `Uint8Array` just to read a header:
  ~24 bytes for PNG/GIF, a short marker scan for JPEG, the first ~2 KB of text
  for SVG. On a large photo data URI that is a needless full decode + a
  same-size allocation per image. Decode only a bounded prefix instead (slice
  the base64 to a 4-char boundary — a few KB covers every format's header),
  and/or memoize by `src`. Only bites when authors omit the dimension
  attributes on big inline images; harmless with the attributes present.
- **RTL & BiDi** — UAX #9 resolution, `direction: rtl`, mirrored alignment.
  `WritingMode` / `direction` are in the type surface; the engine is not.
- **True vertical writing modes** — `vertical-rl` / `vertical-lr` with per-glyph
  `text-orientation` (`mixed` / `upright`), vertical advance metrics, block-axis
  line breaking. (`sideways-rl` / `sideways-lr` and frame `rotation` already ship
  as a post-layout rigid transform on `TextFrameLayoutResult.transform`.)
- **Complex-script shaping parity** — fontkit's Indic / Arabic / Thai shapers are
  simpler than HarfBuzz. Evaluate a HarfBuzz-wasm path for those scripts.
- **Dictionary hyphenation** (soft hyphens already break).
- **Incremental / streaming layout** for very large documents.

## Exploring

- A React / Vue `<VyazText>` wrapper package.
- PDF output from the same `LayoutResult`.
- **`path` SVG preset — font-independent glyph outlines.** Every glyph as an
  actual `<path>` (via fontkit's `glyph.path`, already decoded/memoized per
  glyph internally) instead of `<text>` referencing a font by name — same
  idea as Satori's OG-image output (see `bench/vs-satori.ts`), self-contained
  SVG that needs no font at paint time, at the cost of a much larger payload.
  The expensive step isn't outline decoding (fontkit caches that per glyph)
  but `Path.toSVG()`'s string serialization, which fontkit does *not* cache —
  needs its own cache in `FontEngine`/`FontMetricsProvider`, in font units,
  keyed by `(variantKey, glyphId)` (not fontSize — scale via `transform`),
  computed opt-in at layout time like `glyphAdvances`. `SVGRenderer` would
  also need a `<defs>`/`<use>` dedup pass so a repeated glyph doesn't repeat
  its full path data — without it, output runs 40–50× larger than `flat`/
  `glyph` for exactly that reason.
- **`office` line-box model — open question.** Today `mode: 'office'` uses
  `ascent/descent = winAscent/winDescent × 1.078` (fitted to Arial:
  `1.117 × 1.078 ≈ 1.2`). Calibrating against real PowerPoint on macOS
  (`scripts/office-metrics/` — `font-metrics.pptx` oracle + `report.ts`)
  suggests the line box may actually be a **font-independent `1.2 × fontSize`**:
  Great Vibes (OS/2 win ratio ≈ 1.75) got the *same* ~1.2× box as Roboto, and a
  10-line wrapped stack landed on 1.201/line. No single fontkit table field
  yields ~1.2 for both faces. Not changed yet — `1.078` matches the fonts we
  care about and the alternative (`1.2 × maxRunSizeInLine × lnSpc%`, or
  `max(1.2, hhea/upm) × …`) needs more oracle data (a display/script font with a
  large `hhea`) and a decision on `lnSpc%` handling before it's worth the
  `office`-mode break. Width already matches PowerPoint to ±0.4% and needs
  nothing.

---

Have a use case that needs one of these sooner? Open an issue.
