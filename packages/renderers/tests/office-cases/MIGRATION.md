# office line-box: PowerPoint export vs vyaz `mode: 'office'`

Analysis of the PowerPoint SVG exports in `line-spacing-*/powerpoint.svg`
against the vyaz goldens (`flat.svg` / `glyph.svg`) in the same folders.

- **Oracle:** `scripts/office-metrics/line-spacing.pptx` (built by
  `gen-line-spacing.py`), five text boxes, Roboto, wrapped by PowerPoint, then
  *File ▸ Export ▸ SVG* per box.
- **Under test:** `layoutTextFrame(frame, { mode: 'office' })` → `renderToSVG`.

> **Two export batches.** Batch 1 (`~/Downloads/line-spacing-*.svg`) had the
> `stacked` / `mixed` filenames swapped **and** a `200 px` box (wrapped a word
> early). Batch 2 (`~/Downloads/1..5.svg`, slide order 100/150/200/stacked/mixed,
> `Pt(200)` box) is what is committed here — its wrap column now matches the
> goldens exactly.

> **Status — fix 1 applied.** `PositioningEngine.ts` office branch now scales
> the line box by `style.lineHeight` (spcPct) and lifts 0.75 of the extra
> leading above the baseline. spcPct 1.0 output is byte-identical to before
> (`line-spacing-100` golden unchanged). Remaining gap on 150/200/stacked/mixed
> is a **consistent ~+8 %** — the base constant (`winAsc+winDesc × 1.078` =
> 1.294 for Roboto) vs PowerPoint's font-independent ~1.20. That's **fix 2**
> (ROADMAP "office line-box model — open question"), not yet done.

---

## 0. Scale / unit normalisation (read first)

PowerPoint's SVG export is scaled: an **18 pt** run comes out as
`font-size="83"` → **k = 83/18 ≈ 4.611 px/pt**. Every number below is already
divided by `k` (→ points). `font-size` and the `translate()` / `matrix()`
offsets share the same `k`, so ratios (pitch ÷ size) are scale-free — trust
those over absolutes.

**Unit convention:** vyaz layout is unit-agnostic. Fix **1 vyaz unit ≡ 1 pt**
(DrawingML's native unit) — then golden `width: 200` / `fontSize: 18` is the
same 200 pt / 18 pt column PowerPoint wraps, and batch-2 confirms it (both wrap
`Roboto office line / spacing sample text that / wraps onto several lines /
here`). `gen-line-spacing.py` uses `Pt(200)` / `Pt(260)` for this reason;
`200/96 in` made PowerPoint's column ~33 % wider in em terms.

---

## 1. What PowerPoint actually does (derived from batch-2 exports)

Per-line `<text>`, `matrix(1 0 0 1 x y)`, `y` = **baseline**. Baseline-to-baseline
Δ (points) ÷ font size:

| case | spcPct | Δ/size (measured) | = spcPct × **1.20** |
|---|--:|--:|---|
| `line-spacing-100`   | 1.0 | **1.193** | 1.200 ✓ |
| `line-spacing-150`   | 1.5 | **1.789** | 1.800 ✓ |
| `line-spacing-200`   | 2.0 | **2.386** | 2.400 ✓ |
| `line-spacing-stacked` ¶1 / ¶2 / ¶3 | 1.0 / 1.5 / 2.0 | 1.193 / 1.789 / 2.386 | each ¶ independent ✓ |

**Model — single size per line:**

```
H (line box) = spcPct × 1.20 × maxRunSizeInLine      // 1.20 is font-independent
baseline     = 0.75 × H     from the top of the line box   // 0.75 = Roboto typoAsc/upm
advance      = H            (baseline to baseline, equal sizes)
```

- **1.20** is not a fontkit table field — matches `scripts/office-metrics/report.md`
  (Great Vibes, win ratio 1.75, gets the same 1.20 box as Roboto). Candidate
  model **A** there.
- **First line is not special-cased.** With `margin_top = 0` on the box, the
  `150` and `200` exports (shared export crop) put the first baseline at
  `24.9 pt` and `33.2 pt` — vs `0.75 × H` = `0.75 × 1.8 × 18` = `24.3` and
  `0.75 × 2.4 × 18` = `32.4`. Within <1 pt, and it scales with `spcPct`.
  (`line-spacing-100` has a different export crop → its absolute first baseline
  is not comparable, but its pitch is.)

**Model — cross-line / mixed sizes** — each line owns `H = spcPct × 1.20 ×
(its own max run)`, split **0.75 above / 0.25 below** the baseline; the gap
between two baselines is `0.25·H(prev) + 0.75·H(cur)` (collapses to `H` when the
sizes match):

| transition (case) | Δ measured, pt | `0.25·H(prev) + 0.75·H(cur)` |
|---|--:|--:|
| `mixed` line1(max 36) → MIDDLE(36) | 64.4 | 0.25·64.8 + 0.75·64.8 = **64.8** ✓ |
| `mixed` MIDDLE(36) → "wraps here"(18) | 40.1 | 0.25·64.8 + 0.75·32.4 = **40.5** ✓ |
| `stacked` ¶1 last(1.0) → ¶2 first(1.5) | 28.6 | 0.25·21.6 + 0.75·32.4 = 29.7 (~1 pt off) |
| `stacked` ¶2 last(1.5) → ¶3 first(2.0) | 40.3 | 0.25·32.4 + 0.75·43.2 = 40.5 ✓ |

The split ratio is `typoAscender / (typoAscender − typoDescender)` =
`1536 / 2048` = **0.75** for Roboto (its typo asc+desc sum to exactly 1 em).
A font whose typo sum ≠ 1 em is still needed to pin the denominator, and the
inter-¶ case is ~1 pt loose (paragraph spacing rounding?).

---

## 2. What vyaz `mode: 'office'` does now (`PositioningEngine.ts` ~L569)

```
H        = maxLineHeightBase = max(ascent + descent)      // OS/2 win, ×1.078 fudge
baseline = round(maxAscent)
advance  = H
```

For Roboto (per-1000: office ascent 1024.31, descent 269.5):

| quantity | vyaz | PowerPoint | error |
|---|--:|--:|--:|
| `H / size` @ spcPct 1.0 | **1.294** | 1.20 | **+7.8 %** (too tall) |
| `H / size` @ spcPct 1.5 | **1.294** | 1.80 | **−28 %** (`spcPct` ignored) |
| `H / size` @ spcPct 2.0 | **1.294** | 2.40 | **−46 %** (`spcPct` ignored) |
| baseline / H | 1024.31 / 1293.81 = **0.792** | **0.75** | +5.6 % |
| first-line baseline | `round(maxAscent)` = `0.79·H`, no `spcPct` | `0.75·H`, scales with `spcPct` | diverges as `spcPct` grows |
| inter-¶ leading | `spaceBefore/After` only (0 here) | same | ✓ match |
| multi-size line split | `currentY += H(line)`, `baseline = round(maxAscent)` per line, no cross-line leading distribution | `0.25·H(prev) + 0.75·H(cur)` | diverges |

The whole `1.294` is `(winAsc+winDesc)/upm` — DrawingML's `spcPct` multiplier is
never read in office mode. That is the "коэффициент считается по-другому" you
saw.

---

## 3. Do the SVGs match? (per case)

| case | wrap column | line pitch (vyaz → PP) | first baseline (vyaz → PP) | verdict |
|---|---|---|---|---|
| `line-spacing-100` | ✓ **matches** (4 lines, same breaks) | ✗ 23.29 → 21.5 pt (`1.294` vs `1.20`, +8 %) | ✗ 18 → ~16 pt | close, not equal |
| `line-spacing-150` | ✓ matches | ✗ **23.29 → 32.2 pt** (`spcPct` dropped, −28 %) | ✗ 18 → 24.3 pt | **far off** |
| `line-spacing-200` | ✓ matches | ✗ **23.29 → 42.9 pt** (−46 %) | ✗ 18 → 32.4 pt | **far off** |
| `line-spacing-stacked` | ✓ matches | ✗ all three ¶ at 23.29; should be 21.5 / 32.2 / 42.9 | ✗ | **far off on ¶2, ¶3** |
| `line-spacing-mixed` | ✗ PP breaks `BIG MIDDLE` + `small after wraps` per word (5 lines); vyaz keeps 3 | ✗ per-line `1.294·maxsize`, no 0.25/0.75 gap split | ✗ | **off; wrap + split both** |

Only `line-spacing-100` lands in the ballpark (still ~8 % tall, baseline ~2 pt
low). Everything with `spcPct ≠ 1.0` is wrong because the multiplier is never
read. Wrap now agrees on the single-size cases (unit convention fixed); `mixed`
still diverges — PP's word-wrap is more eager on the 36 pt run.

---

## 4. Attribute migration table

What each SVG carries and whether the renderer needs to emit / consume it to
match PowerPoint.

| attribute | PowerPoint export | vyaz `flat` today | keep? |
|---|---|---|---|
| line element | one `<text>` per **visual** line, pre-wrapped | one `<text>` per line ✓ | **yes** — never lean on tspan auto-wrap |
| position | `transform="matrix(1 0 0 1 x y)"`, `y` = baseline | `x` / `y` attrs, `y` = baseline | **x/y** — see §5 |
| `font-family` | `Roboto,Roboto_MSFontService,sans-serif` (fallback **stack**) | `font-family="Roboto"` (bare) | **change** → emit a stack w/ generic fallback |
| `font-size` | `83` (scaled px) | `18` | yes (1 unit ≡ 1 pt) |
| `font-weight` | `400` | `400` | yes |
| `font-style`, `font-variant`, `font-stretch` | always written (`normal`) | omitted when normal | keep omitting — emit only when ≠ normal |
| `fill` | `#000000` | `#000000` | yes |
| `fill-opacity` | always (`1`) | omitted when 1 | keep omitting — emit only when < 1 |
| `text-anchor` | `start` explicit | implicit (alignment baked into `x`) | **emit explicitly** for center/right so the value is self-describing |
| `xml:space="preserve"` | on `<svg>` | per `<text>` ✓ | yes — trailing wrap spaces depend on it |
| `text-decoration` | `none` explicit | emitted only when set | keep — emit only when underline/strike |
| `direction` / `writing-mode` / `unicode-bidi` | always written | handled via post-layout transform | emit only for RTL / vertical |
| per-glyph x | — (PP SVG has no glyph-level positioning) | `glyph` preset: `<tspan x="a b c …">` | keep for the `glyph` preset; it is also what browsers/Illustrator emit |
| outer `translate()` | crop origin of the selection export | n/a (viewBox at 0 0) | ignore — export artrefact, not layout |

**What actually decides a match:** `font-size`, the **baseline `y`** (⇐ the
line-box formula), the wrap column width, and `xml:space`. Family/weight/anchor
decide whether a *browser* re-renders it the same; they don't move the box.

---

## 5. `transform` vs direct `x` / `y`

**Recommendation: keep direct `x` / `y` for horizontal text; use a `transform`
only for an actual affine (frame `rotation`, `sideways-*` writing mode).**

| | `transform="matrix(1 0 0 1 x y)"` | `x="…" y="…"` |
|---|---|---|
| PowerPoint uses it | yes — its exporter gives *every* shape a CTM; for LTR horizontal text the matrix is just a translate | — |
| bytes | ~40 chars/line | ~14 chars/line |
| maps to layout result | `line.x`, `line.y + line.baseline` → matrix `e`,`f` (same numbers, more wrapper) | `line.x` → `x`, `line.y + line.baseline` → `y` (1:1) |
| golden diff readability | worse (noise around the two numbers that matter) | better |
| rotation / non-uniform scale | needed | not possible — must switch to transform |
| a11y / editors | fine | fine |

PowerPoint's blanket `matrix` per line is an **exporter convenience**, not
something the DrawingML model or an SVG consumer requires. Copying it buys
nothing for the common case and makes the goldens noisier. vyaz already emits a
single group `transform` for the rotation / vertical cases (post-layout rigid
transform in `TextFrameLayoutEngine`) — that is the right split: affine at the
group level, plain `x`/`y` on each line.

---

## 6. Concrete changes this points to

1. **`PositioningEngine.ts`, office branch** — replace
   `lineBoxHeight = maxLineHeightBase` with
   `H = style.lineHeight * 1.20 * maxRunSizeInLine` (candidate model A;
   `report.md` has the clamped model B alternative).
2. **Baseline** — `baseline = 0.75 * H` (from `typoAscender / (typoAscender −
   typoDescender)`), not `round(maxAscent)`. First line included.
3. **Multi-size lines** — carry per-line `H` and place baselines as
   `0.25·H(prev) + 0.75·H(cur)`; drop the browser-mode half-leading path for
   office.
4. **`<a:spcPts>` (exact-point spacing)** — office currently honours only the
   percentage; add the absolute-points case while here.
5. **Renderer** — emit a `font-family` fallback stack; make `text-anchor`
   explicit. No positioning-system change (keep `x`/`y`, see §5).
6. **`mixed` wrap** — PP breaks the 36 pt run word-by-word at 260 pt where vyaz
   keeps `BIG` + `MIDDLE` on one line. Separate from line-height; check the
   office word-wrap width budget for large runs before trusting that golden.
7. Once (1)–(3) land: `UPDATE=1 bun test packages/renderers/tests/office-cases.test.ts`
   and eyeball the goldens against `powerpoint.svg` (100/150/200/stacked should
   line up; `mixed` needs item 6 first).

---

## 7. Path to 100 % bbox + baseline parity

### 7a. Model gaps still open (all in `PositioningEngine.ts` office branch)

| # | gap | now | target | blocker |
|---|---|---|---|---|
| M1 | **base constant** | `maxLineHeightBase` = `(winAsc+winDesc)/upm × 1.078` = **1.294**·size (Roboto) | `1.20 × maxFontSizeInLine`, **font-independent** (`report.md`: Great Vibes == Roboto) | pick model **A** `1.20` flat vs **B** `max(1.20, hhea/upm)`; needs a large-`hhea` display font in the oracle |
| M2 | **baseline in box** | `round(maxAscent)` + `0.75 ×` *added* leading (fix 1) | `0.75 × H` **outright**, every line incl. first | `report.md` guessed `winAsc/(winAsc+winDesc)` ≈ **0.792**; the exports say **0.75** (= Roboto `typoAsc/(typoAsc−typoDesc)`, and its typo sum is exactly 1 em). Need a font where 0.75 ≠ typo-ratio ≠ win-ratio to pin the rule. ~1.8 pt effect at 18 pt / spcPct 1.0 |
| M3 | **cross-line / ¶ seam** | `currentY += H(line)`, each baseline independent | `Δbaseline = 0.25·H(prev) + 0.75·H(cur)` at every line *and* paragraph boundary | none — carry per-line `H`, apply at the seam. Confirmed by `mixed` (40.1 vs 40.5) and `stacked` ¶2→¶3 (40.3 vs 40.5) |
| M4 | **`<a:spcPts>`** (exact-point spacing) | only the `%` multiplier exists (`style.lineHeight`) | `H = pts` flat, no font metrics | needs a `lineHeightUnit` / `lineHeightPts` on `ParagraphStyle` (`Document.ts:458` `@todo`) |
| M5 | **spcPct < 100 %** | box shrinks, baseline pinned at ascent (fix-1 `max(0,…)`) | PP floors near real ascent+descent, not linear | no sub-100 % sample in the oracle yet |
| M6 | **DrawingML insets** | `TextFrame.padding` exists but the office deck sets 0; real decks default `lIns/rIns` 7.2 pt, `tIns/bIns` 3.6 pt | map DrawingML insets → `TextFrame.padding` in whatever builds office `TextFrame`s | converter-side, not layout |

### 7b. The export-padding problem (why absolute `y` can't be trusted)

PowerPoint's SVG export crops to *content bounds + its own margin*, and that
margin is **not constant** — batch-2 `line-spacing-150` / `-200` share
`translate(… −128)` and their first baselines land on `0.75·H` to <1 pt, but
`line-spacing-100` exported with `translate(… −105)` and sits **+6.6 pt** low.
So `firstBaselineAbs = matrix.f − translate.y` carries an unknown per-export
offset. Consequences and fixes:

1. **Never assert on the first line's absolute `y`.** Only use **intra-SVG
   deltas** — line-to-line pitch, paragraph-seam gaps — which cancel the crop
   offset. (All the confirmed numbers above are deltas.)
2. **To check box-top → first-baseline** (needed for a true bbox top): give the
   *sample* TextBox a hairline border (`<a:ln>` on the box itself, not a
   separate marker rect) in a **calibration-only** variant of the deck. The box
   rect then appears in the export and `firstBaseline − boxTop` is directly
   measurable. Keep the borderless deck for the committed `powerpoint.svg`.
3. **Or** export **two boxes in one SVG** with identical slide `y` and different
   spcPct; `Δ(firstBaseline)` = `0.75·(H₂−H₁)`, fully padding-free (this is how
   0.75 was derived from the 150/200 pair).
4. **Commit the comparator.** A small `office-cases/compare.ts`: read
   `powerpoint.svg` + the golden, auto-detect `k = svgFontSize / ptFontSize`,
   divide out, print per-line pt deltas and PASS/FAIL vs a tolerance (±0.5 pt).
   Removes the ad-hoc scratch script; makes "does it match" a command.

### 7c. bbox height

Once M1+M3 land, `frame-fit` content height = `Σ H(line)` should equal
PowerPoint's autofit `cy` (with `tIns=bIns=0`): `report.md`'s single-line box is
the *full* `1.2·size` (no last-line descent trim), so the plain sum is right.
Verify against the autofit `cy` of `line-spacing.pptx` after a PowerPoint
save (`parse-pptx.ts`-style `<a:ext>` read), not just the SVG.
