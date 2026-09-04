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
- **Canvas renderer** — currently exported but untested and undocumented. Either
  bring it to SVG parity with its own golden corpus, or drop it from the public
  API.

## Later

- **RTL & BiDi** — UAX #9 resolution, `direction: rtl`, mirrored alignment.
  `WritingMode` / `direction` are in the type surface; the engine is not.
- **Vertical writing modes** — `vertical-rl` / `vertical-lr` + `text-orientation`.
- **Complex-script shaping parity** — fontkit's Indic / Arabic / Thai shapers are
  simpler than HarfBuzz. Evaluate a HarfBuzz-wasm path for those scripts.
- **Dictionary hyphenation** (soft hyphens already break).
- **Incremental / streaming layout** for very large documents.

## Exploring

- A React / Vue `<VyazText>` wrapper package.
- PDF output from the same `LayoutResult`.

---

Have a use case that needs one of these sooner? Open an issue.
