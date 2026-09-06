# office-visual-diff — experiment

**Goal:** see where vyaz `mode: 'office'` sits against real PowerPoint, per
case, as MD reports + diff images. No fixes, no pass/fail — a measurement pass
to decide what to change.

Counterpart to `scripts/office-metrics/` (a hand-fitted deck, a few samples).
This one auto-drives the whole renderer golden corpus.

## Flow

```bash
# 1. build the deck — one auto-sized, hairline-bordered text box per case
python3 scripts/office-visual-diff/gen-reference.py
#    → _reference.pptx (58 slides) + _manifest.json (+ skip list)

# 2. vyaz side — layout each case in office mode, rasterise the glyph SVG
bun scripts/office-visual-diff/layout-ours.ts
#    → ours/<slug>.{json,png}

# 3. YOU: open _reference.pptx in PowerPoint → File ▸ Export ▸ PNG,
#    "Save every slide", into some folder.

# 4. ingest + measure + report
bun scripts/office-visual-diff/import-reference.ts <that-png-folder>
bun scripts/office-visual-diff/measure-ref.ts
bun scripts/office-visual-diff/diff.ts
#    → report.md  +  __diffs__/<slug>.{png,md}
```

`__diffs__/<slug>.png` is a triptych: **PowerPoint crop · vyaz render · overlay**
(vyaz text in magenta over the PowerPoint export).

## How the match works

The reference text box has `auto_size = SHAPE_TO_FIT_TEXT` and zero insets, so
the **red border rectangle in the export is PowerPoint's own text-block box**.
Slide width is a known 960 pt → `pngWidth` fixes px→pt → the box in points.
That is compared to vyaz `layoutTextFrame(frame, { mode: 'office' })`
`result.content.{width,height}`.

`H ÷ fontSize` for a single-line case is the em-ratio PowerPoint actually uses
(~1.20, font-independent) vs what `office` produces today
(`winAscent/winDescent × 1.078`).

Units: every vyaz number is placed as a **point** on the slide (`Pt(fontSize)`,
`Pt(width)`, …), matching `scripts/office-metrics`.

## Skipped cases

`gen-reference.py` skips what a text box can't hold — lists, super/subscript,
multi-column, vertical writing modes, rotation, `text-transform`, inline
widgets, tables. The skip table prints on run and lands in `_manifest.json`.

## Fonts

PowerPoint must have the case fonts installed (Roboto, Inter, Great Vibes,
Unifont; Arial is system). resvg is fed the same TTFs from
`packages/core/tests/fixtures` — `OFFICE_DIFF_FONTS=a.ttf:b.ttf` prepends extras
(e.g. a big-`hhea` display font to split the "flat 1.2" vs "clamped" models).

## Not committed

`_reference.pptx`, `_manifest.json`, `ours/`, `refs/`, `__diffs__/`, `report.md`
are all git-ignored — regenerate from the flow above.

`_selftest.ts` synthesises `refs/` from `ours/` (ΔH/ΔW ≈ 0) to exercise
`measure-ref` + `diff` without a PowerPoint export; not part of the real flow.
