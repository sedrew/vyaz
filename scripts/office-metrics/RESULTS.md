# office line-box calibration — result

Outcome of the `mode: 'office'` line-box work (branch
`fix/office-spcpct-line-spacing`, v0.4.1 → v0.4.3). Oracle: PowerPoint SVG
exports in `packages/renderers/tests/office-cases/*/powerpoint.svg`, built from
`gen-line-spacing.ts`. Full derivation: `office-cases/MIGRATION.md`.

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
2. `bun gen-textframe-fit.ts` — one PowerPoint TextBox per frame at
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

## `OFFICE_BASELINE_RATIO` at spcPct = 100 % is `(typoAscFrac + winAscFrac) / 2`, not flat 0.75 (v0.4.6)

Resolves the "needs a font whose typo sum ≠ 1 em" caveat above item 5 — Arial
is that font (`typoAsc+typoDesc = 0.938em`, vs Roboto's exactly `1.000em`).

First pass (an Arial-only 15-case deck, `gen-arial-diagnostic.ts` — since
deleted, superseded by the tool below) found spcPct = 100 % measuring
**0.7826** (σ 0.0015, 8 single-size points, 12–40pt, regular + bold, caps +
non-caps — capitalisation made zero difference, ruling out descenders) vs
Arial's own `typoAscFrac` of 0.7758 — close but a consistent ~0.9 % residual.
spcPct 125–200 % measured a flat **~0.745–0.750**, matching the existing
constant within noise, so only `lineHeight === 1` needed a formula.

Independent corroboration this class of bug isn't vyaz-only: a *different*
PPTX-rendering project hit the identical shape of it, also on Arial —
[office2pdf#1254](https://github.com/developer0hye/office2pdf/issues/1254)
("a spcPct paragraph above 100% seats its first baseline up to 2.1pt below
PowerPoint's") and [#1177](https://github.com/developer0hye/office2pdf/issues/1177)
(measures Arial's "gap-inclusive natural line" at 1.1499em, again well under
flat 1.20). Neither issue has a closed-form fix either.

**Second pass — `gen-font-grid-diagnostic.ts`** (current tool; one slide per
font × 11 sizes × 5 spcPct) tested Roboto, Arial, Times New Roman and Unifont
together and overturned "use the font's own `typoAscFrac`": Roboto's
`typoAscFrac` is exactly 0.75 (where the original flat constant came from),
yet Roboto measured **0.7777** at spcPct 100 % — just as far from its own
typo ratio as Arial was from its. Every earlier check that seemed to confirm
flat `0.75` for Roboto used same-size multi-line pitch, which is
*algebraically insensitive* to this ratio (`Δbaseline = (1−r)·H(prev) + r·H(cur)`
= `H` whenever `H(prev) = H(cur)`, for any `r`) — so it was never actually
tested until this deck.

Brute-forced ~15 candidate ratios (from `typoAscFrac`, `winAscFrac`,
`hheaAscFrac`, `capHeight/upm`, `xHeight/upm`, `yMax/upm` and combinations)
against the measured per-font values for Roboto / Arial / Times New Roman
(sizes ≥ 14pt, less px-rounding noise):

| font | typoAscFrac | winAscFrac | `avg(typo,win)` | measured | Δ |
|---|--:|--:|--:|--:|--:|
| Roboto | 0.7500 | 0.7917 | 0.7709 | 0.7777 | −0.008 |
| Arial | 0.7758 | 0.8103 | 0.7930 | 0.7840 | +0.009 |
| Times New Roman | 0.7626 | 0.8047 | 0.7836 | 0.7817 | +0.002 |

`(typoAscFrac + winAscFrac) / 2` won by a wide margin (max residual ~1 %; any
single ratio alone is off 2–3 %). A weight-search over `w·typo + (1−w)·win`
landed on `w ≈ 0.52` — near enough to a plain average that the extra
precision isn't worth fitting on 3 points.

**Unifont was the outlier that never fit any of the above** (predicted
ratio always came back ≈ its own metrics, 0.875 — nothing close to its
measured ~0.796) — until checking `OS/2.fsSelection`: Unifont is the only one
of the four with **`useTypoMetrics` set**, the standard OpenType bit telling
renderers "trust my typo metrics for line spacing, ignore win/hhea." Roboto,
Arial and Times New Roman all have it unset (legacy win/hhea-based spacing
applies to them). This isn't a upm=64 quirk (my first guess) — it's the font
file explicitly asking for different treatment. Only one `useTypoMetrics`
font has been measured, not enough to derive its own rule.

**Fix landed** (`PositioningEngine.ts`, `OFFICE_BASELINE_RATIO`): at
`style.lineHeight === 1`, when the dominant run's font has a normal OS/2
table (`useTypoMetrics` not `true`), the baseline ratio is
`(typoAscFrac + winAscFrac) / 2` (new `FontMetrics.winAscFrac` /
`useTypoMetrics` fields, threaded from `FontEngine.ts`). Falls back to the
flat `0.75` when `useTypoMetrics` is `true`, the OS/2 table is missing, or
`lineHeight !== 1` (that branch already agreed with the 125–200 % Arial data
within noise). **Not a no-op for Roboto this time** — office-cases goldens at
spcPct 100 % shifted (up to ~0.45pt per baseline) and needed `UPDATE=1` +
review; `layout-mode.test.ts`'s two `baseline === 0.75×height` assertions
were rewritten to compute the expected ratio from `fontMetricsProvider`
instead of a hardcoded `0.75`.

Mixed-size lines (small text framing one big run) still measured **higher**
than same-size lines — Arial `mixed-12-32` / `-18-36` and their caps twins:
ratio ≈ **0.806–0.810**, close to Arial's `winAscFrac` alone (0.8103) — not
re-checked against the grid corpus, not fixed in code, still open.

## `shaping` now defaults to `true` for `mode: 'office'` (v0.4.7)

Found while building `gen-wrap-diagnostic.ts` (per-font wrap-point corpus,
see that file): a "fit box exactly to `content.width` / `textBox.width`, no
slack" case — the same shape as a real "shrink shape to fit text" feature —
wrapped in real PowerPoint for Roboto but not Arial, same text, same column.

Root cause: `content.width` (and `textBox.width`, same number) was measured
via `LayoutOptions.shaping`'s *old* default of `false` — plain
per-code-point advance sum, no GPOS kerning. Measured directly with fontkit
on `"Short line here."` 18pt:

| font | advance (unshaped) | shape (kerned) | Δ |
|---|--:|--:|--:|
| Roboto | 119.874pt | **120.146pt** | **+0.272pt** |
| Arial | 122.071pt | 122.071pt | 0.000pt |

Arial happens to have zero GPOS kern pairs for that exact string, so its
unshaped `content.width` was already correct — Roboto's wasn't, by the full
kern amount. Real PowerPoint's own render needs the *shaped* width; a box
built from the *unshaped* one is measurably too narrow whenever the font has
any kerning for that text — invisible with any layout slack, but decides
whether text wraps at zero slack (exactly a "fit box to text" scenario).

Old doc comment on `shaping` said "leave off unless the output is consumed
by a browser" — true for `mode: 'browser'`, but wrong for `mode: 'office'`:
PowerPoint kerns too, so `office` mode's whole reason to exist (PowerPoint
fidelity) needs it. `report.md`'s "Width needs no calibration — ±0.4% match"
finding was itself only ever measured with shaping *explicitly* requested,
not vyaz's default.

**Fix**: `runFlow()` (`TextFrameLayoutEngine.ts`) now computes
`useShaping = options.shaping ?? (options.mode === 'office')` — unset
`shaping` defaults to `true` for `mode: 'office'`, unchanged (`false`) for
`mode: 'browser'`/no mode. An explicit `shaping: true` or `shaping: false`
always wins either way. Not a no-op: any office-mode text with GPOS kern
pairs gets slightly (usually sub-point) different widths/wrap points now —
office-cases goldens shifted again (`UPDATE=1` + review) on top of the
baseline-ratio change above.
