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

- **This suggests the line box is `1.2 × fontSize`, font-independent.** Great
  Vibes (OS/2 win ratio ≈ 1.75) got the *same* ~1.2× box as Roboto, and a
  10-line wrapped stack landed on 1.201/line. No single fontkit table field
  (`win` / `hhea` / `typo` / `head`) yields ~1.2 for both fonts.
- **Not applied.** vyaz still uses `mode: 'office'` =
  `ascent/descent = winAscent/winDescent × 1.078` (fitted to Arial:
  `1.117 × 1.078 ≈ 1.2`), which matches the fonts we care about. Switching to a
  flat `1.2 × maxRunSizeInLine × lnSpc%` is an open question — see the roadmap
  ("Exploring"). It needs more oracle data (a display/script font with a large
  `hhea`) and a decision on `lnSpc%` handling before it's worth an `office`-mode
  behaviour break.
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
