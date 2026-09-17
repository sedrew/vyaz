# Roadmap

Direction, not a schedule. Order within a section is rough priority.

## Next

- **Simpler, more reliable font registration.** `fontMetricsProvider.registerFont(family, {weight, style}, buffer)`
  today needs the caller to already have: the font's bytes in hand, its own
  correct weight/style labels, and — for a system font — the right file path
  for the current OS (every ad-hoc script in `scripts/office-metrics/` this
  cycle hand-rolled its own `firstExisting(['/Library/Fonts/X.ttf',
  '/System/Library/Fonts/Supplemental/X.ttf'])`, macOS-only, no Windows/Linux
  paths at all). A working, cross-platform version of exactly this already
  exists as a **test-only** helper
  (`packages/core/tests/helpers.ts` `registerArialVariants` — uses
  `get-system-fonts` + fontkit's `subfamilyName` to auto-detect weight/style
  per file) but was never promoted to the public API. Candidate shape:
  `registerSystemFont(familyName, opts?)` — locate every installed weight/
  style variant of a family by name (`get-system-fonts`, already a
  dependency), auto-detect weight/style per file instead of requiring them
  up front, register all variants in one call, and surface a clear error
  (not a silent miss) when the family isn't installed. Node/Bun-only
  (system font discovery doesn't apply in a browser bundle;
  `registerFont(family, opts, buffer)` stays the primitive both build on).
- **Shaping by default** for the `browser` / `preserve` SVG presets — distinct
  from `LayoutOptions.shaping`, which already defaults to `true` for
  `mode: 'office'` as of v0.4.6 (kerned width; PowerPoint fidelity). This item
  is the SVG-preset side: `browser`/`preserve` still default to unshaped
  per-character positioning, so ligature-heavy fonts don't paint quite what a
  real browser would. The `glyph` preset gets shaped per-cluster advances so
  ligature-heavy fonts position correctly (today its per-character `x` is
  naive).
- ~~**`registerWebFont(family, url, opts)`** — one call that feeds both the metrics
  engine and `document.fonts`.~~ Shipped as `registerFont` in `@vyaz/renderer`.
- **Turkish-correct `text-transform`** — `transformText()` (`utils/textTransform.ts`)
  uses locale-independent `.toUpperCase()`/`.toLowerCase()`; Turkish's dotted/
  dotless I needs locale casing instead (confirmed: `'i'.toUpperCase()` → `'I'`,
  `'i'.toLocaleUpperCase('tr')` → `'İ'`; same the other way for `'I'`→`'ı'`).
  Silently wrong today for any `uppercase`/`lowercase`/`capitalize` run tagged
  Turkish — needs a `lang`/locale signal on the run (not in `TextRun` today)
  to know when to use `tr` casing instead of the default.
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
- *Not currently prioritized — current script scope is Cyrillic / Latin /
  Turkish, all left-to-right, no complex shaping. Re-open if that scope
  changes.*
  - **RTL & BiDi** — UAX #9 resolution, `direction: rtl`, mirrored alignment.
    `WritingMode` / `direction` are in the type surface; the engine is not.
  - **True vertical writing modes** — `vertical-rl` / `vertical-lr` with
    per-glyph `text-orientation` (`mixed` / `upright`), vertical advance
    metrics, block-axis line breaking. (`sideways-rl` / `sideways-lr` and
    frame `rotation` already ship as a post-layout rigid transform on
    `TextFrameLayoutResult.transform`.)
  - **Complex-script shaping parity** — fontkit's Indic / Arabic / Thai
    shapers are simpler than HarfBuzz. Evaluate a HarfBuzz-wasm path for
    those scripts.
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
- **`office` line-box model — open questions (v0.4.6 status).** The line box
  itself is settled and shipped: font-independent `1.2 × maxRunSizeInLine ×
  lnSpc%` (`OFFICE_LINE_BOX_RATIO`), and the `lineHeight === 1` baseline ratio
  is `(typoAscFrac + winAscFrac) / 2` of the dominant run's own font
  (`OFFICE_BASELINE_RATIO`), both calibrated against real PowerPoint —
  see `scripts/office-metrics/RESULTS.md`. Genuinely still open:
  - **Model A vs B for the `1.2` constant** — flat, or `max(1.2, hhea/upm)`?
    Every oracle font tested so far (Roboto, Arial, Great Vibes, Unifont,
    Times New Roman) has `hhea/upm < 1.2`, so it still can't be told apart.
    Needs a large-`hhea` display/script font (Lobster, Pacifico, Alfa Slab
    One) in `scripts/office-metrics/gen-font-grid-diagnostic.ts`.
  - **`useTypoMetrics` fonts' own baseline formula** — fonts with OS/2
    `fsSelection.useTypoMetrics` set don't fit the averaged ratio above and
    fall back to the flat `0.75` (unverified for that case). Only Unifont
    tested; needs a second such font to derive a real rule instead of a guess.
  - **Mixed-size-line baseline ratio** — a small run framing one large run in
    the same line measured *higher* than same-size lines (~0.81 for Arial,
    close to `winAscFrac` alone) but only 2 data points; not in code.
  - **Does PowerPoint wrap where vyaz wraps?** `gen-wrap-diagnostic.ts` — a
    reproduction of the original "5 lines vs 3" mismatch (a large run in a
    narrow column) plus 7 other width/length cases per font — sent for
    real-PowerPoint verification, result pending.
  - **`<a:spcPts>`** (absolute-point line spacing, vs. today's `spcPct`-only
    multiplier) — needs a `lineHeightPts` / `lineHeightUnit` on
    `ParagraphStyle`.
  - **`spcPct < 100%`** — no oracle sample yet; PowerPoint is suspected to
    floor near the real ascent+descent rather than scale linearly.
  - Width matches PowerPoint to ±0.4% **once `shaping` is on** — default for
    `mode: 'office'` as of v0.4.6 (real PowerPoint kerns; the plain
    advance-sum default used to under-measure any kerned run, invisible with
    layout slack but decisive at a zero-slack "shrink shape to fit text" box).

---

Have a use case that needs one of these sooner? Open an issue.
