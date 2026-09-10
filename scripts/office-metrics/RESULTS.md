# office line-box calibration — result

Outcome of the `mode: 'office'` line-box work (branch
`fix/office-spcpct-line-spacing`, v0.4.1 → v0.4.3). Oracle: PowerPoint SVG
exports in `packages/renderers/tests/office-cases/*/powerpoint.svg`, built from
`gen-line-spacing.py`. Full derivation: `office-cases/MIGRATION.md`.

## The model PowerPoint uses

```
lineBox H = spcPct × 1.20 × maxFontSizeInLine        # 1.20 is font-independent
baseline  = 0.75 × H          from the top of the line box, every line
Δbaseline = 0.25 × H(prev) + 0.75 × H(cur)           # = H when sizes match
```

- **1.20** — not any fontkit table field. Roboto's pitch lands on
  `spcPct × 1.20 × size` exactly; `report.md` measures the same 1.20 box for
  Great Vibes (OS/2 win ratio 1.75). Chosen over the `max(1.20, hhea/upm)`
  alternative — no oracle font can tell them apart yet.
- **0.75** — == Roboto `typoAscender / (typoAscender − typoDescender)` (its typo
  asc+desc sum to exactly 1 em). Needs a font where the typo sum ≠ 1 em to
  confirm the rule is typo-ratio based rather than a flat 0.75.
- The `0.25 / 0.75` seam split falls out of `currentY += H` then
  `baseline = 0.75·H` — no extra code.

## Scale of the exports

PowerPoint's SVG export scales pt → px by **k = 165 / 36 = 4.5833** (taken from
the 36 pt run, which comes out `font-size="165"` exactly). `83 / 18` is ~0.4 %
high because PowerPoint rounds the 18 pt run's 82.5 px up to `font-size="83"`.
Divide every export number by `k` to get points.

## vyaz `mode: 'office'` now (v0.4.3, `PositioningEngine.ts`)

```ts
lineBoxHeight = OFFICE_LINE_BOX_RATIO /* 1.20 */ * maxFontSize * style.lineHeight;
baseline      = lineBoxHeight * OFFICE_BASELINE_RATIO /* 0.75 */;
```

Was `winAscent + winDescent` (= `1.294 × size` for Roboto, an Arial-fitted
`× 1.078`) with `baseline = round(ascent)` and no `spcPct` at all.

## Measured agreement (batch-2 exports, points)

| case | spcPct | vyaz pitch | PowerPoint pitch | Δ |
|---|--:|--:|--:|--:|
| line-spacing-100 | 1.0 | 21.60 | 21.60 | **0.00** |
| line-spacing-150 | 1.5 | 32.40 | 32.4 (149 / 148 px wobble) | <0.11 |
| line-spacing-200 | 2.0 | 43.20 | 43.20 | **0.00** |
| line-spacing-stacked ¶2→¶3 seam | 1.5→2.0 | 40.50 | 40.58 | 0.08 |
| line-spacing-mixed line2→line3 | 1.5 | 40.50 | 40.5 | ~0 |

Frame bbox height = `1.20 × size × spcPct × lines` exactly — 86.4 / 129.6 /
172.8 pt for the four-line `line-spacing-100 / 150 / 200`.

Per-line delta vs the old constant, by size (the "shrink" this release causes):

| font size | Δ per line @ spcPct 1.0 | @ 1.5 | @ 2.0 |
|--:|--:|--:|--:|
| 18 pt | 1.69 pt (0.06 cm) | 2.54 pt (0.09 cm) | 3.38 pt (0.12 cm) |
| 40 pt | 3.75 pt (0.13 cm) | 5.63 pt (0.20 cm) | 7.50 pt (0.27 cm) |

## Fixed-rectangle round-trip (`textframe-fit-*`)

To check the height vyaz computes (not just the per-line pitch):

1. `bun textframe-fit-run.ts` — vyaz lays out `text` at `width`, `mode: 'office'`,
   and reports `content.height` = bottom of the last line box, plus the line
   breaks it chose. Written to `textframe-fit.json`.
2. `python3 gen-textframe-fit.py` — one PowerPoint TextBox per frame at
   **exactly** `width × content.height`, wrap-only (no autofit element).
3. Export each slide. Pass: PowerPoint wraps to the same breaks, the last line
   sits flush with the bottom edge, nothing is clipped and there is no slack.

Current vyaz heights (`content.height = lineCount × 1.20 × size × spcPct`):

| frame | font | vyaz lines | box height |
|---|---|--:|--:|
| w140 | 18 pt / 1.0 | 14 | 302.4 pt |
| w200 | 18 pt / 1.0 | 9 | 194.4 pt |
| w300 | 18 pt / 1.0 | 6 | 129.6 pt |
| w200 | 24 pt / 1.0 | 13 | 374.4 pt |
| w200 | 18 pt / 2.0 | 9 | 388.8 pt |

### slide 5 (w200 / 18 pt / spcPct 2.0) — first export back

Scale `k = 165/36 = 4.5833` (pitch 198 px ÷ k = 43.20 pt = `1.20 × 18 × 2.0`,
exact). Green rect = vyaz `content.height` (1782 px ÷ k = **388.80 pt**).

**All 9 baselines match vyaz to 0.000 pt**; 9 lines, same wrap points:

| line | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| PP & vyaz baseline, pt | 32.4 | 75.6 | 118.8 | 162.0 | 205.2 | 248.4 | 291.6 | 334.8 | 378.0 |

**But the green bbox bottom is 6.2 pt below where the last line's glyphs
end.** vyaz's last line box is [345.6, 388.8] (full `43.2 pt`), baseline at
378.0 (0.75 in). PowerPoint's rendered last line spans [361.0, 382.6] — height
21.6 pt (== the `1.0×` line box), ~17.0 above / 4.6 below the baseline (≈ the
win-ascent ratio). So vyaz's `content.height` carries `0.25 × 43.2 = 10.8 pt`
below the last baseline, of which only ~4.6 pt is real font descent — a
**6.2 pt trailing half-leading** on the last line.

- The gap scales with spcPct: `0.25 × 1.20 × size × spcPct − winDescent`.
  ≈ 0.55 pt at spcPct 1.0, ≈ 5.95 pt at 2.0 (18 pt).
- Open: does PowerPoint's **autofit** box height also carry that trailing
  leading (→ 388.8, vyaz right, like CSS) or trim it (→ ~382.85)? The fixed-box
  export can't tell. The deck now has a `<name>@fit` twin per slide
  (`<a:spAutoFit/>`); its `cy` after a PowerPoint save is the answer.

### `result.textBox` — the trimmed box (added to core)

`layoutTextFrame` now returns a **`textBox`** alongside `content`:

| field | meaning |
|---|---|
| `content: {width,height}` | CSS box — every line's full `lineHeight` box + padding. `lineHeight` > 1 keeps leading above line 1 and below the last. Flow-level stacking. |
| `textBox: {x,y,width,height}` | same top / left / right, but the bottom drops to **last baseline + real font descent** — the trailing leading is trimmed. PDF / PPTX frame sizing. |

`content.height − textBox.height` on the `textframe-fit` matrix: **0.55 pt** at
18 pt / spcPct 1.0, **5.95 pt** at spcPct 2.0, 0.73 pt at 24 pt / 1.0. For
slide 5 `textBox.height` = **382.85 pt** — the user's hand-drawn "font boundary"
marker sat at ~382.6. `textframe-fit.json` now carries `content_height`,
`textbox_height`, `slack` per frame.

Generator picks: **HTML** → `frame` / `content`; **PDF** → `textBox`; **PPTX** →
`content` if the `@fit` twin comes back untrimmed, else `textBox`.

## Still open

1. **`mixed` wrap** — PowerPoint word-wraps a large run (36 pt in a 260 pt
   column) more eagerly than vyaz: 5 lines vs 3. A wrap-width-budget question,
   not the line box.
2. **one paragraph seam** — `stacked` ¶1→¶2 (spcPct 1.0 → 1.5) is
   PowerPoint-grid-snapped, ~0.9 pt below the `0.25/0.75` prediction.
3. **`<a:spcPts>`** — absolute-point line spacing; needs a `lineHeightPts` /
   `lineHeightUnit` on `ParagraphStyle`.
4. **spcPct < 100 %** — PowerPoint floors near the real ascent+descent; vyaz
   stays linear. No sub-100 % sample yet.
5. **model A vs B** — flat `1.20` vs `max(1.20, hhea/upm)`. Needs a large-`hhea`
   display font (Lobster, Pacifico, Alfa Slab One) in the oracle.
