# Office (PowerPoint / DrawingML) line-box calibration

Oracle: `font-metrics.pptx`. Rects are hand-fitted to the text-selection box
(no insets). `measured ÷ size` is the baseline-to-baseline em ratio PowerPoint
uses at 100% line spacing.

## 1. Single-line selection box

| group | font | size,pt | measured H,pt | **measured ÷ size** | flat 1.2 | win/upm | win×1.078 (current) | hhea/upm | typo/upm | (yMax−yMin)/upm | vyaz office line.height | vyaz ÷ measured |
|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| Группа 3 | Roboto | 18 | 21.78 | **1.210** | 1.200 | 1.200 | 1.294 | 1.172 | 1.050 | 1.327 | 23.29 | 1.069 |
| Группа 2 | Roboto | 28 | 34.02 | **1.215** | 1.200 | 1.200 | 1.294 | 1.172 | 1.050 | 1.327 | 36.23 | 1.065 |
| Группа 1 | Great Vibes | 28 | 34.02 | **1.215** | 1.200 | 1.750 | 1.887 | 1.252 | 1.252 | 1.709 | 52.82 | 1.553 |

## 2. Wrapped samples (per-line, fitting-noise removed)

| group | font | size,pt | total H,pt | best line count | **per-line ÷ size** | note |
|---|---|--:|--:|--:|--:|---|
| Fit | 18 | 18 | 216.25 | 10 | **1.201** | "Roboto 18px" wrapped 1 glyph/line in a ~1px column |
| Lines | 18/36/18 | 36 | 86.75 | 2 | **1.205** | mixed 18/36/18pt; per-line height follows the line's max run |

## 3. Advance width vs the selection box

| group | font | size,pt | text | measured W,pt | advance (no kern) | shape (GPOS+GSUB) | shape ÷ measured |
|---|---|--:|---|--:|--:|--:|--:|
| Группа 3 | Roboto | 18 | "Roboto 18px" | 101.30 | 101.62 | 101.31 | 1.000 |
| Группа 2 | Roboto | 28 | "Roboto 28px" | 158.27 | 158.07 | 157.60 | 0.996 |
| Группа 1 | Great Vibes | 28 | "Great Vibes 28px" | 155.93 | 155.96 | 156.41 | 1.003 |

## Reading

- PowerPoint's line box is **≈ 1.20 × font size, font-independent** — Great
  Vibes (win ratio 1.750) gets the *same* ~1.2× box as Roboto,
  and the 10-line "Fit" stack (no single-rect fitting noise) lands on 1.201.
- No single fontkit table field gives ~1.2 for both fonts:
  Roboto win/upm=1.200 (✓ by luck), hhea/upm=1.172, typo/upm=1.050;
  Great Vibes win/upm=1.750 (✗), hhea/upm=1.252, typo/upm=1.252.
  "Well-behaved" webfonts set winAscent+winDescent ≈ 1.2em by design, which is
  why the current code accidentally works on Roboto/Inter.
- The current `winAscent/winDescent × 1.078` path overshoots ~6% on Roboto and
  ~55% on Great Vibes.

### Candidate models (both fit this data; need a big-hhea display font to split)

- **A — flat:** `line = lnSpcPct/100 × 1.2 × maxRunSizePt`. Matches the noise-free
  wrapped samples (1.201 / 1.205).
- **B — clamped:** `line = lnSpcPct/100 × max(1.2, (hheaAsc−hheaDesc+hheaGap)/upm) × maxRunSizePt`.
  Great Vibes → 1.252 (measured 1.215, +3%, within hand-fit noise).

Split the box into ascent/descent for baseline placement with
`winAscent ÷ (winAscent + winDescent)` (≈ 0.792 for Roboto). Also honour
`<a:spcPts>` (exact points, no font involvement) — currently only the multiplier is.

### Width is already correct

- `shape` (fontkit `layout()`, GPOS+GSUB) matches PowerPoint's selection-box
  width to **±0.4%** here — inside the hand-fitting noise. Plain advance-sum is
  within ~0.5% on these low-kern strings.
- Advances come from `hmtx` + `GPOS`, which fontkit and PowerPoint
  (DirectWrite) read identically — no undocumented factor, unlike height.
- Advance widths are **identical in `office` and `browser`** modes; only
  ascent/descent differ. The only width knobs: use `shaping:true` for kern-pair
  parity (see `scripts/browser-metrics`), and map `<a:rPr spc>` → letterSpacing.

