# office-metrics — PowerPoint line-box calibration

Answers "what line height does PowerPoint actually use in `mode: 'office'`?"
Counterpart to `scripts/browser-metrics/` (which calibrates *width* vs Chrome).

## Files

| file | what |
|---|---|
| `font-metrics.pptx` | the oracle deck — PowerPoint groups, each = a `TextBox` sample + a `rect` the author hand-fitted to the **text-selection box** (the highlight when you select the line), no insets |
| `parse-pptx.ts` | pulls each group's runs (`a:latin` / `a:rPr@sz`) and the rect size (EMU → px/pt, via the group `a:xfrm` transform) |
| `report.ts` | scores fontkit line-box / width formulas against the deck; writes `report.md` |
| `report.md` | generated — the current findings table |

```bash
bun scripts/office-metrics/report.ts
```

## Findings (see `report.md` for the tables)

- **Line box = `1.2 × fontSize`, font-independent.** Great Vibes (OS/2 win ratio
  ≈ 1.75) gets the *same* 1.2× box as Roboto. No single fontkit table field
  (`win` / `hhea` / `typo` / `head`) yields ~1.2 for both fonts, so the engine
  uses the flat 1.2 constant, splitting it into ascent/descent by the font's win
  proportion only for baseline placement.
- vyaz applies it as `office` line height =
  `(lnSpc% / 100) × 1.2 × maxRunSizeInLine`
  — see `packages/core/src/measure/FontMetricsProvider.ts` (the old
  `winAscent × 1.078` model is kept there, commented, for reference) and the
  `office` branch of `PositioningEngine.ts`.
- **Width needs no calibration** — fontkit `layout()` (GPOS+GSUB) already matches
  PowerPoint's selection box to ±0.4%.

## ⚠ Environment

Measured on **macOS (PowerPoint for Mac)**. The `1.2` constant is undocumented
PowerPoint behaviour and may drift slightly by OS and PowerPoint build; the
spread in this deck was 1.20–1.215. To retarget (e.g. Windows-exact), replace
`font-metrics.pptx` with a deck built on that platform — same group layout
(`TextBox` + hand-fitted `rect`) — and re-run `report.ts`. Adding a display /
script font with a large `hhea` line height (Lobster, Pacifico, Alfa Slab One)
would also let the "flat 1.2" vs "max(1.2, hhea/upm)" models be told apart.
