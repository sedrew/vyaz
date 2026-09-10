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
| `gen-line-spacing.py` | builds `line-spacing.pptx` — isolates the paragraph **line-spacing multiplier** (`<a:spcPct>` 1.0 / 1.5 / 2.0), separately and stacked. Needs `python-pptx` + Roboto installed |
| `line-spacing.pptx` | generated; **5 slides, one plain TextBox each** (no groups, no marker rects). Open in PowerPoint, let it re-wrap, save, then per slide File ▸ Export ▸ SVG → `office-cases/<case>/powerpoint.svg` |
| `textframe-fit-run.ts` | **vyaz side** of the fixed-rectangle round-trip: feeds `(text, width)` to `layoutTextFrame(…, {mode:'office'})`, records `content.height` (where the last line box ends) + the line breaks / baselines, writes `textframe-fit.json`. Input matrix (`WIDTHS_PT` / `VARIANTS`) at the top |
| `gen-textframe-fit.py` | **PowerPoint side**: reads `textframe-fit.json`, builds a TextBox at **exactly** each `width_pt × height_pt` (wrap-only `<a:bodyPr wrap="square">`, no autofit element, insets 0). Open, save, export per slide — if vyaz's height is right, the last line is flush with the bottom, nothing clipped |
| `textframe-fit.json` | round-trip manifest: per frame `{ width_pt, height_pt (vyaz), font_size_pt, line_spacing, text, vyaz.lines[…] }` — matches each exported SVG back to the `layoutTextFrame` call |
| `RESULTS.md` | the office line-box calibration outcome (v0.4.1 → v0.4.3): the model, the constants, measured vyaz↔PowerPoint agreement, what is still open |

```bash
bun scripts/office-metrics/report.ts                # width / single-line line-box (font-metrics.pptx)
python3 scripts/office-metrics/gen-line-spacing.py   # regenerate line-spacing.pptx
bun scripts/office-metrics/textframe-fit-run.ts      # vyaz -> textframe-fit.json
python3 scripts/office-metrics/gen-textframe-fit.py  # textframe-fit.json -> textframe-fit.pptx
```

`line-spacing.pptx` is a **pure SVG-export** oracle, not parsed by `parse-pptx.ts`
(that one is for the grouped `font-metrics.pptx`). Its slides mirror the golden
corpus in `packages/renderers/tests/office-cases/line-spacing-*` one-to-one (same
text, 200 pt column, Roboto 18, line spacing 1.0 / 1.5 / 2.0) — slide order =
case order, don't swap `stacked` / `mixed`. In vyaz today `mode: 'office'`
ignores the multiplier, so 100/150/200 render at the same height; the export
says what PowerPoint actually does. See
`office-cases/MIGRATION.md` for the derived model and the diff.

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
