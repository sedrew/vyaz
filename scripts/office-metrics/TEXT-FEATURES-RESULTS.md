# text-features — what PowerPoint does, what vyaz does, what to change

Oracle: `text-features.pptx` (99 TextBoxes, one per slide, insets 0), measured in
PowerPoint for Mac 16.93 by `text-features-run.ts` — line / character bounds
from the object model (`measure-text-features.applescript`), baselines, bullet
glyphs and decoration rules from PowerPoint's own Save-as-PDF
(`pdf-geometry.ts`). PowerPoint numbers are frozen in `text-features.json`
(`ppt`); the per-case tables are in `TEXT-FEATURES.md`. vyaz side:
`layoutTextFrame(…, { mode: 'office' })` and the `glyph` SVG preset.

**Precision.** Object-model bounds are exact (2 dp). PowerPoint's PDF snaps
decoration rules and text baselines to whole points of the *slide*, so
PDF-derived numbers are ±0.5 pt — the decoration model below is fitted on
96–144 pt where that is under 1 %. Baselines are rounded, not truncated or
jittered: every one of the 303 non-script baselines lies within 0.12 pt (the
PDF's own 0.24 pt grid) of a whole slide point, so each line bounds
PowerPoint's real baseline to a 1 pt window — §7 intersects those windows.
Marker text (`1.`, `y.`) comes from `pdftotext -bbox` (poppler).

## Summary

| # | Feature | PowerPoint (measured) | vyaz `office` today | Verdict |
|---|---|---|---|---|
| 1 | justify | every non-trailing space on the line stretched by the same amount — inside runs, each space of a run of spaces, and on a line ending in `<a:br/>` | stretches only the space spans *between* runs; one-run paragraph not justified at all; line before `\n` not justified | ❌ bug (both modes) |
| 2 | list marker | bullet **left-aligned at `marL + indent`**, size **100 %** of the first run (× `buSzPct`); text at `max(marL, bullet end)`, per paragraph | marker right-aligned to the text with a 0.25 em gap, size 0.9×, `buSzPct` not modelled; zone widened to the widest marker of the whole list | ❌ wrong model |
| 3 | indices / whitespace | **no collapsing**: leading, repeated and trailing spaces kept, trailing ones hang; offsets are raw text offsets, continuous across `<a:br/>` | collapses (`whiteSpace: 'normal'` default); `startIndex`/`endIndex` count collapsed text and restart at 0 after every `\n` | ❌ bug (indices: both modes) + office default wrong |
| 4 | paragraph of a line / empty lines | empty paragraph = one line of `1.2 × endParaRPr sz`; `a<br/><br/>b` = 3 lines; trailing `<a:br/>` adds an empty line | no `Line.pIdx`; empty lines have no spans → no paragraph; `children: []` → 12 px line at any size; `{text:''}` paragraph vanishes; `a\n\nb` → 4 lines (two 12 px) | ❌ bug |
| 5 | underline / strike geometry | from the font: underline top = baseline + `|post.underlinePosition|`·size, thickness `post.underlineThickness`·size, **one rule per underlined stretch** of a line with width-weighted size, trailing spaces excluded; strike top = baseline − `OS/2.yStrikeoutPosition`·size, thickness `yStrikeoutSize`·size, **per run** | not in the layout result; glyph SVG draws baseline + 2 px / −0.4·ascent, always 1 px, includes trailing spaces | ❌ missing |
| 6 | break after hyphen | breaks after `-` in words and digit groups (`2024-│10-06`, `TEST-│1234`, `+1-800-│555-0199`), not after U+2011, breaks at U+00AD showing a hyphen | identical on 9 / 14 tokens and the sentence; the other 5 differ only by the emergency break below | ✅ parity — an off switch is a new feature, default must stay on |
| — | overlong word | breaks inside the word (`mai│l`, `ra│y`, `non‑bre│aking`, `A│-1`) | overflows (`overflowWrap: 'normal'` default) | ❌ office default wrong |

Line breaks, line tops and line heights matched PowerPoint in every case not
listed above (justify, lists, hyphens: same text per line, same `top`).

## Status — implemented (see CHANGELOG `[Unreleased]`)

All six items and the empty-line bug are in; `bun scripts/office-metrics/text-features-run.ts --cached`
now shows PowerPoint's line breaks, line tops, marker positions and decoration rules on every case.
Departures from the proposals below:

- **`overflowWrap` stays `'normal'` in office.** `'break-word'` would also split words under an
  intrinsic-width probe (`width: 1e-3`, see `tests/overflow-wrap.test.ts`), so PowerPoint parity
  in a real box is an explicit `overflowWrap: 'break-word'` (the case mapping sets it, as a PPTX
  importer would).
- **Decorations are computed in core for `office` only**; `browser` keeps the Chrome
  decorating-box rule in the renderer (`splitMixedDecorations`).
- Not modelled: marker ascent / descent still `0.8 / 0.2 × size`; PowerPoint's rounding of a
  `buSzPct` bullet to whole points (21.6 → 22 in the one sample).
- Known limit, upstream pretext: in `pre-wrap`, after a word wider than the line, the space goes
  to the next line instead of hanging.

Remaining differences on the page are the width model, not these items: `TEST-` 1.1 pt (kern
`T-`), `ff` in Arial 1.16 pt, U+2011 3.4 pt (no glyph), and underline thickness under 1 pt at
8–12 pt (the PDF draws at least 1 pt).

## 1. Justify

Measured (`j-single`, Arial 16 pt, 200 pt box): PowerPoint's ink right edge is
200.01 on every non-last line; each space goes from 4.50 to `4.50 + slack / n`
(line 1: 4 spaces, slack 9.75 → 6.94). `j-multispace`: each of the 2 / 3 / 4
consecutive spaces gets the same 6.23. `j-br`: the line ending in `<a:br/>`
is stretched too (spaces 8.23, ink right 200.01). The trailing space / `\v` keeps
its natural width.

vyaz: `PositioningEngine` stretches only `type: 'space'` spans; a pretext
fragment holds every word of a run on the line in one `text` span, so the slack
goes to the inter-run gaps only (`j-multirun`: 9.75 into one gap) or nowhere
(`j-single`: ink right 190.25, Δx up to 35.6 pt; `j-roboto`: up to 56.8 pt).
`glyphAdvances` are never stretched.

**Change** (core, `PositioningEngine.ts`, justify branch):
- When `alignment === 'justify'`, split each `text` span at its spaces into
  `text` / `space` spans before counting stretchable spaces — the "each space →
  separate Span" design the module header already describes. Count each space
  *character* (a span of 3 spaces gets 3 shares). `glyphAdvances` are filled
  after positioning (`ParagraphLayoutEngine` phase 4b), so they follow the split
  for free.
- "Last line" = last line of the source paragraph, not of the `\n`
  sub-paragraph. `office`: also justify a line that ends in a hard break
  (PowerPoint); `browser`: keep CSS (a line before a forced break is not
  justified).
- Tests: `j-*` from `text-features.json` (char x within 0.05 pt, ink right =
  width), plus a browser test that the line before `\n` stays ragged.

## 2. List markers

Measured (`l-*`, Arial 16 pt unless noted):

| case | marL / indent | PPT bullet x | PPT text x | vyaz marker x | vyaz text x |
|---|---|---|---|---|---|
| `l-bullet-27` | 27 / −27 | 0 | 27 | 18.4 | 27 |
| `l-bullet-indent40` | 40 / −20 | 20 | 40 | 31.4 | 40 |
| `l-bullet-0` | 0 / 0 | 0 | **5.63** (= bullet advance) | −8.6 (outside the box) | 0 |
| `l-number-12` "1."–"9." | 12 / −12 | 0 | **13.38** (= "1." advance) | 4.22 | 21.6 |
| `l-number-12` "10." | 12 / −12 | 0 | **22.25** | −4.65 | 21.6 |

- Bullet size: 12 / 24 / 40 pt text → 12 / 24 / 40 pt bullet (100 %, vyaz
  0.9×); `buSzPct` 50 / 90 / 150 of 24 pt → 12 / 22 / 36 pt (rounded to whole
  points in this sample). The bullet font is `buFont`, else the text font
  (`l-bullet-textfont`).
- No gap between a too-wide marker and the text, and no list-wide alignment:
  items 1–9 start at 13.38, items 10–11 at 22.25.
- A bigger bullet (`buSzPct` 150) does not grow the line box.

**Change** (core, office only; browser keeps the CSS marker):
- Outside marker at `leftIndent` (= `marL + indent`), left-aligned; text at
  `leftIndent + max(bulletIndent, markerAdvance)`; drop the group-wide
  `listMarkerWidth` widening in `office`.
- Marker size `firstRunSize × (listStyle.bulletSize ?? 1)`; new
  `ListStyle.bulletSize` (relative, = `buSzPct / 100 000`) and
  `ListStyle.bulletFont` (= `buFont`). Marker ascent / descent from the marker
  font, not `0.8 / 0.2 × size`.
- Tests: `l-*` cases (marker x, text x, marker size).

## 3. Whitespace and line indices

Measured: `s-multispace` "aaa␣␣␣␣bbb␣␣␣ccc…" (80 pt) → PowerPoint lines
`[0,13) [13,17) [17,24) [24,36)` = raw offsets, spaces kept at full width;
`s-lead-trail` keeps 4 leading spaces (18 pt); `s-wrap-spaces` hangs 10 spaces
at the end of line 0 and starts line 1 with "next" (vyaz collapses and breaks
elsewhere: different text on every line). `j-br`: offsets continue across
`<a:br/>` (`[0,27) [27,56)…`).

vyaz: `startIndex`/`endIndex` are sums of collapsed `span.text` lengths
(`PositioningEngine.ts` `charIndex`) and restart at 0 in every `\n`
sub-paragraph (`j-br`: `[0,26) [0,29)`), contradicting the `Line` doc
("index … in the original paragraph text"). Both modes.

**Change:**
- Core, both modes: carry source offsets through compile — each prepared item
  keeps a collapsed→source offset map; spans get `startIndex` (source offset
  in the paragraph, also what ROADMAP "Motion hooks" asks for) and lines take
  `startIndex` / `endIndex` from their first / last span; sub-paragraphs add
  their source start (+1 per `\n`).
- Office default: add `whiteSpace: 'pre-wrap'` (preserve spaces and `\n`, wrap,
  trailing spaces hang) and make it the `office` default when the caller sets
  none. Trailing spaces stay out of `width` and are not painted (§5).
- Tests: `s-*` (line text, offsets, char x).

## 4. Paragraph index and empty lines

Measured (`e-*`, Arial 40 pt): empty paragraph with `endParaRPr sz=40` → line
height 48 (`1.2 × 40`), `sz=12` → 14.4; an `<a:r>` with empty text → 48;
`a<br/><br/>b` → 3 lines of 48; `a<br/>` + next paragraph → "a", an empty 48 pt
line, then "b".

vyaz (both modes): `e-empty-40` middle line 12 (should be 48); `e-empty-run`
loses the paragraph (2 lines instead of 3); `e-br-br` 4 lines (`a`, 12, 12,
`b`); `e-br-end` 4 lines. Root causes:
- `splitParagraphByHardBreaks` (`ParagraphCompiler.ts`): an empty segment
  pushes an empty paragraph *and* leaves `currentRuns = []`, which the next
  segment pushes again → one extra empty paragraph per `\n\n`.
- Empty sub-paragraphs are `children: []` → `TextFrameLayoutEngine`'s fast path
  with a hard-coded `fontSize = 12` and no office 1.2 ratio. A run with
  `text: ''` produces no line at all.
- `Line` has no paragraph index; only spans carry `pIdx`.

**Change:**
- Fix the split (the empty-segment branch only resets `currentRuns`); keep the
  run's style on the empty sub-paragraph (`[{ ...run, text: '' }]`).
- An empty paragraph / run-less line is a strut of its run's size (else
  `DEFAULT_TEXT_STYLE.fontSize`), through the normal line-box path (office
  `1.2 × size × lineHeight`, browser CSS strut).
- `office`: a trailing `\n` keeps its empty line (PowerPoint); `browser`: no
  extra line box after a final forced break (CSS).
- Add `Line.pIdx` on every line (set where `span.pIdx` is set today).
- Tests: `e-*` (line count, tops, heights) + `pIdx` on empty lines.

## 5. Underline and strikethrough geometry

Measured (Arial: `post` −217 / 150, `OS/2` strikeout 530 / 102 per 2048 em;
Roboto: −150 / 100, 512 / 102):

| case | PPT top − baseline / thickness | model `pos·size` / `thick·size` | vyaz glyph SVG |
|---|---|---|---|
| Arial 144 underline | +15.12 / 11 | +15.26 / 10.55 | +1.5 / 1 |
| Arial 96 underline | +10.12 / 7 | +10.17 / 7.03 | +1.5 / 1 |
| Roboto 144 underline | +11 / 7 | +10.55 / 7.03 | +1.5 / 1 |
| Arial 144 strike | −36.92 / 7 | −37.27 / 7.17 | −56.71 / 1 |
| Roboto 144 strike | −36.04 / 7 | −36.00 / 7.17 | −59.50 / 1 |

All 9 sizes 8–72 pt agree within the PDF's 1 pt snap (thickness never below 1).

- **Underline, mixed sizes** — one rule per contiguous underlined stretch of a
  line, at the run-advance-weighted size: `B`100 + `␣small text`10 (advances
  67 / 45) → 7.04 / 5 (model at the weighted 64 pt: 6.8 / 4.7); same result
  with the runs swapped (`u-mix-small-first`); a wide small run pulls it down
  (`u-mix-small-wide` → 3.04 / 2, model 3.0 / 2.1). A rule over the 100 pt run
  alone uses 100 pt (`u-mix-big-only` 11.04 / 7).
- **Strikethrough** — per run at its own size (`k-mix`: −25.96 / 5 on `B`,
  −2.96 / 1 on the 10 pt run).
- Extent: spaces between words are underlined, trailing spaces at a wrap are
  not (`u-wrap-trailing`: 0…75, vyaz 0…79).

**Change:**
- Core: expose font decoration metrics on `SpanFontMetrics`
  (`underlinePosition`, `underlineThickness`, `strikeoutPosition`,
  `strikeoutThickness`, px) and compute `Line.decorations`
  (`{ kind, x, width, y, thickness, color }[]`, `y` = top edge) per mode —
  `office`: the PowerPoint rules above; `browser`: the Chrome decorating-box
  rule now in `renderers/src/utils.ts` (`splitMixedDecorations`), moved to core.
  Consumers (Remotion, Canvas) get the geometry without re-deriving it.
- Office: trailing spaces `collapsed` for painting (today only browser marks
  them), still kept in `spans` for indices.
- Renderers: glyph preset and Canvas paint `line.decorations` instead of
  `+2 px` / `−0.4·ascent` at 1 px.
- Tests: `u-*` / `k-*` within 0.6 pt (PDF snap) at ≥ 48 pt, exact model at all
  sizes from the font tables.

## 6. Break after a hyphen

PowerPoint and vyaz break identically on all 9 tokens where a break after the
hyphen fits, and in `h-sentence`; the other 5 (`h-2`, `h-6`, `h-8`, `h-9`,
`h-12`) differ only by the emergency break below. So for `office` the current behaviour is right and must
stay the default. The requested switch is a feature, not a parity fix:
`ParagraphStyle.hyphenBreak?: boolean` (default `true`); `false` makes `-` and
U+2010 non-breaking (like U+2011). Implementation goes into the vendored pretext
segmenter (`analysis.js` break-after set), via `scripts/vendor-pretext.ts`
patches so a re-vendor keeps it. The existing `hyphens` flag (automatic
hyphenation, no-op) is a different thing and stays separate.

**Emergency break (found here).** PowerPoint breaks a word that does not fit
the line anywhere inside it (`e-mail` in 33 pt → `e-│mai│l`); vyaz overflows.
**Change (as implemented):** `overflowWrap: 'break-word'` set by the caller for PowerPoint
parity — not an office default, see Status. With it, `h-2`, `h-6`, `h-8`, `h-9`, `h-12` break
where PowerPoint does.

## 7. Baseline at spcPct 100 % — ✅ implemented

PowerPoint puts the baseline at **`winAscent / (winAscent + winDescent)`** of
the 1.2 × size line box — the font's win box scaled to fill the line. Each row
intersects the 1 pt windows of all its lines (12–144 pt, single- and
mixed-size, regular and bold; `b-*` cases add five fonts whose typo and win
ratios pull apart):

| font | lines | PowerPoint ratio | `winAscFrac` | old `(typo + win) / 2` | `typoAscFrac` |
|---|--:|--:|--:|--:|--:|
| Arial | 223 | 0.8090–0.8116 | **0.8103** | 0.7930 | 0.7758 |
| Roboto | 25 | 0.7917–0.7928 | **0.7917** | 0.7709 | 0.7500 |
| Times New Roman | 6 | 0.8030–0.8061 | **0.8047** | 0.7836 | 0.7626 |
| Georgia | 6 | 0.8061–0.8116 | **0.8070** | 0.7921 | 0.7772 |
| Verdana | 6 | 0.8235–0.8290 | **0.8272** | 0.8073 | 0.7873 |
| Courier New | 6 | 0.7344–0.7367 | **0.7349** | 0.7498 | 0.7648 |
| Tahoma | 6 | 0.8235–0.8290 | **0.8289** | 0.8081 | 0.7873 |

`winAscFrac` is inside every window; the old average is outside all seven.
Courier New, whose win ratio is *below* its typo ratio, rules out any blend
of the two. Independent check: PowerPoint's SVG export of Roboto 18 pt
(`office-cases/line-spacing-100/powerpoint.svg`, 1/330 in grid) puts the first
baseline at 17.02 pt; `winAscFrac` gives 17.10, the old model 16.65. The
RESULTS.md "font-grid" fit that chose the average judged baselines by eye
against a box edge; it is superseded.

Verdana and Tahoma (win box 1.215 em, above 1.2) still get a 1.2 × size line
box — measured, line tops exact.

**Change (as implemented):** `PositioningEngine.ts` — at `lineHeight === 1`
the ratio is the dominant run's `winAscFrac` (`typoAscFrac` when the win
metrics are missing, flat 0.75 for `useTypoMetrics` fonts as before).
spcPct ≠ 100 % keeps 0.75 (SVG export within 0.1 pt at 150 / 200 %).
`textBox` no longer extends below the last line box: at 100 % the line leaves
less than the font's office descent under the baseline. All 303 non-script baselines now
fall in PowerPoint's window (were up to 3.8 pt off at 144 pt); office goldens
moved 0.27–1.8 pt down, nothing else. `packages/renderers/tests/office-oracle.test.ts`
checks every `powerpoint.svg` baseline to 0.15 pt.

## 8. Center / right alignment — ✅ parity

`a-*`, `lv-center`, `lv-right`: every character within 0.01 pt — centred and
right-aligned text, leading spaces (kept, counted), trailing spaces (hang,
not counted), a mixed-size line, a centred bullet (marker moves with the
text), right-aligned numbers.

## 9. `spc` (character spacing) — ✅ split runs fixed; negative `spc` open

Line breaks match, and so does every glyph the `glyph` preset draws: it adds
`letterSpacing` after each `glyphAdvances` entry (`sp-plus3` line 1:
0 / 12.8 / 24.6 / 36.5 pt in both; an earlier version of this report blamed
`glyphAdvances` — that was the runner summing advances without the tracking).
Two real gaps:

- **A run fragment split into pieces loses its tracking.** When pretext hands
  over a fragment with a leading or trailing space ("The quick brown fox
  jumps " at a line end), `PositioningEngine` measures the pieces with
  `measureText`, which knows no `letterSpacing`: the text span is 190.25 pt
  wide while its glyphs reach 265. The space after it, `line.width`, and the
  slack for center / right / justify are computed from the short width —
  `sp-justify` overshoots the box by 6–14 pt. `splitSpacesForJustify` has the
  same gap (the last piece absorbs all the tracking). A whole-run fragment
  (`sp-big`, `sp-right`, `sp-mixed`) is right.
- **Negative `spc`**: `sp-minus1` line 4 — PowerPoint hangs the space after
  "wraps", vyaz moves it to the start of line 5 (" inside…"). Open.

**Change (as implemented):** the measured pieces get `letterSpacing` per
character, as pretext's widths do (`PositioningEngine` fragment split and
`splitSpacesForJustify`). `sp-plus3`, `sp-mixed`, `sp-justify` now match
PowerPoint to 0.01 pt. What `sp-big` / `sp-right` still show (0.6–1.8 pt) is
kerning (`Tr`), not tracking: span widths are shaped, `glyphAdvances` are
not, so the glyph preset draws the letters of a kerned pair apart — general,
not `spc`-specific. Tests: `letter-spacing.test.ts`, golden
`office-cases/letter-spacing`.

## 10. Super / subscript (`baseline`) — ✅ PowerPoint's default buttons

Measured on `x-*` (15 cases: `baseline` 30 / −25 / 50 / −50 / 15 / −10 / 80 %
at 96 pt, sizes 13 / 16 / 17 / 24 / 25 / 40 / 72 pt):

| | PowerPoint | vyaz office now | vyaz before (= browser) |
|---|---|---|---|
| size | **exactly 2/3** (13 pt → 8.67: digits 4.88 pt wide = 8.67 × 0.556 on the 1/8 pt grid; the PDF only names the font at a whole size, 9) | 2/3 | 0.65 |
| superscript shift | **percentage × full size**: 30 % → 28.8 pt, 50 % → 48, 80 % → 76.8 at 96 pt (PDF windows ±0.5) | 30 % | 40 % |
| subscript shift | ≈ percentage × size **− 1.1…1.3 pt** at every size 13–96 pt (−25 %: 22.1–23.1 pt at 96, not 24) | 25 % | 25 % |
| line box | unchanged by the script run | unchanged ✓ | ✓ |

Open: the constant ~1.2 pt the subscript sits higher in the PDF has no
explanation yet (size-independent, so not a ratio); cross-check against an
SVG export before modelling it. vyaz `script` has no percentage, so a PPTX
`baseline` other than 30000 / −25000 (`x-pct15`, `x-pct50`, …) still gets the
default shift — a `baselineShift` on the run would carry it.

**Bug found here — fixed:** `x-wrap` broke *inside* the word after a run that
ends in a space ("wrap su│b"). Not about scripts: with `whiteSpace: 'pre-wrap'`
(office default) the space stays in the previous run, pretext saw no gap
before the next run and let `overflowWrap: 'break-word'` split its first
word. Vendored pretext patch (`vendor-pretext-text-patches.ts`): a pre-wrap
item remembers it ends in a space, and that space counts as the break
opportunity before the next item.

**Change (as implemented):** `ParagraphCompiler` takes the layout mode;
office uses 2/3 size, −30 % / +25 % shift (browser keeps 0.65, −40 % / +25 %).
The prepared-text cache key includes the mode. Tests:
`office-text-features.test.ts`, golden `office-cases/super-sub`.

## 11. List levels and numbering — ✅ implemented

Marker and text positions per level (`lvl` 0–2, explicit `marL`) were already
exact. The numbering was not; PowerPoint's rules, from `lv-*` (11 cases):

| case | PowerPoint | vyaz before |
|---|---|---|
| `lv-numbers` — nested items between level-0 items | 1. a. b. **2. 3.** | 1. a. b. 1. 2. |
| `lv-nested-again` — level 1 again under the next item | 1. a. b. 2. **a.** I. 3. | 1. a. b. 1. a. I. 1. |
| `lv-bullet-nested` — a nested *bullet* | 1. • **2.** | 1. • 1. |
| `lv-bullet-same-level` — a bullet at the same level | 1. 2. • **1.** | same ✓ |
| `lv-break` — a plain paragraph | 1. 2. — **1.** | same ✓ |
| `lv-schemes` — roman from 4, then alpha from 25 | IV. V. VI. **y. z.** | … g. h. |
| `lv-startat` — `startAt` 1, 1, 10, 10, 1 | 1. 2. **10. 11. 1.** | 1. 2. 3. 4. 5. |
| `lv-start-deep` — starts at level 1 | a. b. 1. 2. | same ✓ |
| `lv-empty-between` — an empty numbered paragraph | 1. (none) **2.** | 1. 2. 3. |

So: one counter per level; a deeper item keeps the outer counters running,
coming back up ends the deeper ones, a paragraph without a list ends all; a
counter also ends when the type or number format changes, on `listRestart`,
or when the item's `startNumber` is neither where the counter started nor
the next number; an empty paragraph shows no marker and is not counted.

**Change (as implemented):** `TextFrameLayoutEngine.ts` list numbering pass —
those rules; the browser marker zone widens to the widest marker of a counter
(its members may now be split by nested items). An undefined `startNumber`
continues (it only sets the first number); a `startNumber` equal to the next
number continues too — `@vyaz/converters` writes `<ol start>` onto every
item, incremented. The empty-paragraph rule is office-only: CSS gives an
empty `<li>` its number. Nested HTML lists number like CSS counters now, so
the converters' `nested-list` warning is gone. All 11 `lv-*` cases match
PowerPoint; tests in `core/tests/list.test.ts`, goldens
`office-cases/list-levels` and `cases/list/number-nested`, converter pipeline
tests.

## 12. Indents narrow the wrap width — ✅ implemented (found here, both modes)

`a-center-indent` (`marL` 40, `indent` +20, no bullet → `leftIndent` 40,
`indent` 20): vyaz moved the lines right but wrapped them at the full box
width, so they ran past the box (first line ended at 290 pt in a 240 pt
box). Same in `browser`, for `rightIndent`, and for the list marker zone —
lists only matched PowerPoint because their items were short. Already in
0.5.0.

**Change (as implemented):** line breaking walks pretext one line at a time
(`layoutNextRichInlineLineRange`) with each line's own width: the box minus
`rightIndent` and minus the left indent positioning gives that line —
`leftIndent` + outside marker zone, plus `indent`, an office marker wider than
its zone and an inside marker on the first line of a piece.
`PositioningEngine.resolveListMarker` / `paragraphLineIndents` compute those
indents once for both. `a-center-indent` now matches PowerPoint line for line
(ink edges within 0.01 pt). Tests: `core/tests/paragraph-indent.test.ts`
(both modes, every indent kind), `office-text-features.test.ts`
(PowerPoint's numbers), golden `office-cases/paragraph-indent`; goldens
`rich-text-v1/paragraph-block` and `office-cases/list-levels` re-wrapped
inside their indents.

## Side findings (not in the items above)

- **`TEST-` at 20 pt**: PowerPoint 56.78 pt wide (≈ fontkit with kerning,
  56.67), vyaz 57.88 — kerning apparently not applied in this segment.

## Re-running

```bash
bun scripts/office-metrics/text-features-run.ts           # needs PowerPoint for Mac (~5 s)
bun scripts/office-metrics/text-features-run.ts --cached  # re-compare vyaz against text-features.json
```
