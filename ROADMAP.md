# Roadmap

Direction, not a schedule. Order within a section is rough priority.

## Next

- **Shaping by default** for the `browser` / `preserve` SVG presets. The `glyph`
  preset gets shaped per-cluster advances so ligature-heavy fonts position
  correctly (today its per-character `x` is naive).
- **`registerWebFont(family, url, opts)`** — one call that feeds both the metrics
  engine and `document.fonts`, so browser output can't drift from the layout
  (the split documented in [Browser usage](https://sedrew.github.io/vyaz/guide/browser)).
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

- **Grid / table layout** — a real multi-cell grid (column alignment across rows,
  `colspan` / `rowspan`, header/body/footer bands). Prerequisite for
  `@vyaz/html` to convert `<table>` (today it drops them). Likely a new
  `TableFrame` alongside `TextFrame`, each cell an inner `TextFrame`.
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
