# Changelog

Real bug fixes and features, not every commit — loosely [Keep a Changelog](https://keepachangelog.com/)
format. A docs-only entry is one line. A fix or feature gets enough detail to
act on, the commit(s) it landed in, and a link to the [Roadmap](ROADMAP.md)
item when it closes or advances one.

## [Unreleased]

## [0.4.12] - 2026-09-22

`@vyaz/core` 0.4.11 → 0.4.12, `@vyaz/renderer` 0.4.11 → 0.4.12, `@vyaz/converters` 0.1.0 → 0.1.1.

### Added

- **`<hr>` support** — previously dropped entirely at conversion time (never reached the layout
  engine or renderer, including via Markdown `---`). `Paragraph.rule?: { thickness, color }` lays
  out as a content-less paragraph spanning the full available width, painted as a horizontal bar
  (`Line.rule` in the layout result).
- **`<blockquote>` left rule** — the indent bar was missing entirely (indentation + grey text
  only). `ParagraphStyle.leftRule?: { width, color }` is stamped on every laid-out `Line` of the
  paragraph (`Line.leftRule`), so a wrapped quote reads as one continuous bar without the layout
  engine tracking the paragraph's overall bounding box.
- Both painted by `SVGRenderer`'s new `addVerticalRule()` (mirrors the existing
  `addDecorationLine()` used for underline/strikethrough). Playground's editor updated to match.
- 14 new tests (core layout geometry, converters, SVG output).

## [0.4.11] - 2026-09-20

`@vyaz/core` 0.4.10 → 0.4.11, `@vyaz/renderer` 0.4.10 → 0.4.11.

### Fixed

- **`textBox.width` could be dangerously narrow for long kerned lines** — `OFFICE_TEXTBOX_PADDING`
  raised from 0.01 cm (0.2835 pt) to **1 pt**. Root cause: vyaz snaps each glyph's base advance
  to the 1/8 pt grid then adds the kern delta unrounded, while PowerPoint appears to snap the
  shaped advance (base + kern) as a unit. The discrepancy is ±1/32 pt per kerned pair; for
  business-style phrases at 12–16 pt Arial/Calibri up to nine such pairs accumulated in the same
  direction (≈ 0.28 pt total), almost exhausting the old budget. Empirically: 118 tested phrases
  had slack < 0.29 pt, 28 had slack < 0.1 pt, worst case 0.004 pt. 1 pt covers ≤ 32 such pairs.
  `content.width` and the wrap decision are unaffected.

### Added

- **Long-phrase slack regression test** (`office-fit-stress.test.ts`) — eight business phrases
  at Arial 9–16 pt verify that `textBox.width` fits in one line and carries ≥ 0.1 pt margin.
- **`stress.pptx` / `stress.json` regenerated** with the new padding (all 1336 cells).

## [0.4.10] - 2026-09-20

`@vyaz/core` 0.4.9 → 0.4.10, `@vyaz/renderer` 0.4.9 → 0.4.10. `@vyaz/converters`
unchanged at 0.1.0. No engine change over 0.4.9 — the version moves so consumers that
depend on `@vyaz/core` via `file:` (bun copies the package into `node_modules`) reinstall
a copy with 0.4.8's PowerPoint text metrics and 0.4.9's autofit grid; the only
additions are regression cases and tests (below) and a wording change in this changelog.

### Added

- **Fit-box regression cases and tests** for the office width model:
  - `packages/renderers/tests/office-cases/fit-roboto-{11pt,24pt,72pt}` and `…-tight` — six
    golden cases (Roboto fixture, run anywhere). Each pair is one text at the width vyaz reports
    (`textBox.width`: exact width + 0.01 cm; must stay ONE line) and at a width just under the
    lowest one at which real PowerPoint kept it on one line (must wrap to TWO). The windows and
    the per-glyph advances of "To Ta" 72pt come from real PowerPoint exports (see each `_comment`).
  - `packages/core/tests/office-fit-stress.test.ts` — the self-checkable half of the stress deck:
    for Roboto and Inter at the deck's 21 sizes (8 → 120pt) and its string bands, a frame of
    `textBox.width` holds the text on one line without overflow, the padding is added once on
    `textBox.width` only, a frame 0.06pt under the exact width wraps, GPOS-only fonts are never
    kerned, Roboto's exact width sits on the 1/8pt grid, `stress.json`'s expected widths still match
    the engine, and (where Arial is installed) Arial kerns from 12pt and its box holds the text.

## [0.4.9] - 2026-09-20

`@vyaz/core` 0.4.8 → 0.4.9, `@vyaz/renderer` 0.4.8 → 0.4.9. `@vyaz/converters`
unchanged at 0.1.0. Autofit now searches the 1% `fontScale` grid a PowerPoint shape can
store, reports the scale it measured, and measures each candidate at the size that scale
names — a rounded-down probe passes fit checks the named size fails.

### Fixed

- **Autofit could report a scale whose size does not fit** — candidates were laid out
  through `applyScale`, which rounds the scaled size to two decimals: an authored
  13.3333px at 94% was measured as 12.53px (9.3975pt) while the reported 94% means 9.4pt
  (12.53333px). On the office glyph grid the width is a step function of the size, so
  0.003px can decide a wrap: the engine kept one line, reported `scale: 0.94`, the
  consumer wrote `sz="940"`, and PowerPoint wrapped to two lines. Autofit now probes with
  `applyScaleExact` — a candidate is measured at the size it names — which rejects 94% in
  such a case and returns 93%, one line. The winning layout is measured at that same exact
  size, so `result.autofit.scale` names the layout the caller gets back; `applyScale` keeps
  its two-decimal rounding for callers that re-derive a size from the scale.

### Changed

- **Autofit searched a scale PowerPoint cannot store, and reported a rounded copy of
  it** — `layoutTextFrame(..., { autofit })` bisected a continuous scale to a 0.005
  tolerance, returned the layout measured there, and reported
  `Math.round(scale * 100) / 100`, which can round *up* past what fits (`0.996` →
  `1.00`). A shape can only be scaled in whole percents — PowerPoint's
  `a:normAutofit/@fontScale` is an integer percentage — so autofit now bisects that 1%
  grid for the largest whole percent that fits and returns the layout it measured at
  exactly that scale. `result.autofit.scale` is now the applied scale: re-scaling the
  frame by it reproduces the returned content, and the value is one the PPTX can hold.
  Consequences: a result may sit up to one grid step below the old continuous maximum
  (0.4pt on a 40pt run, 0.09pt on a 9.4pt one — PowerPoint's own granularity), and the
  search runs ≤ 7 layouts instead of 24. `autofit: { minFontSize }` rounds its floor
  **up** to the grid, so a clamped layout still respects the minimum — `autofit-option`'s
  20/24 = 0.8333 floor is reported as `0.84` (its assertion was updated).

## [0.4.8] - 2026-09-20

`@vyaz/core` 0.4.7 → 0.4.8, `@vyaz/renderer` 0.4.7 → 0.4.8. `@vyaz/converters`
unchanged at 0.1.0. Refines 0.4.6's "office kerns everything" — measured on
PowerPoint exports, not assumed. Consumers that depend on `@vyaz/core` via `file:`
(bun copies it into `node_modules`) must reinstall to pick this up.

### Fixed

- **`mode: 'office'` measures glyphs the way PowerPoint lays them out** — measured
  on PowerPoint SVG exports of per-glyph highlighted alphabets (Roboto and Times
  New Roman at 72 / 20 / 11pt) and the `kern-context` / `stress` decks:
  1. **1/8 pt glyph grid** — every glyph advance is rounded to the nearest
     0.125pt (all 266 glyphs of both alphabets sat exactly on the grid; only 104
     equal the exact advance). The per-glyph rounding accumulates: it is the
     "Roboto is 0.25–0.66pt wider than its advance sum" residual that made
     zero-slack boxes wrap. New `LayoutOptions.advanceQuantum` (default
     `0.125` in office, none elsewhere, `0` = off). With it vyaz's default width
     lands inside PowerPoint's measured window for Roboto (4/4 rulers), Arial 11pt
     and reproduces Roboto 72pt "To Ta" (184.13 vs 184.125pt).
  2. **Kerning from 12pt, only on fonts with a classic `kern` table** — PowerPoint's default
     `kern="1200"` (Times New Roman: unkerned at 11pt, kerned at 20pt; Arial 9–11pt wraps a box
     sized to its kerned width), and Roboto (GPOS only) is never kerned at 11 / 16 / 20 / 24 /
     72pt ("To"/"Ta" at 72pt: both `T` advances 43.000pt though the font kerns them −3.5 /
     −4.0pt). Kerning values come from GPOS (identical to the `kern` table for Arial, Calibri,
     Times New Roman). `shaping` left unset applies this; an explicit `shaping: true` kerns every
     font at every size, `shaping: false` never kerns; `kernMinSize` moves the threshold.
  3. **`textBox.width` carries 0.01 cm (0.2835pt) of padding in office mode** — the residue PowerPoint
     needs beyond vyaz's measured width: kerned advances aren't reproduced to the last 0.1pt (short
     strings such as "Ta yo" in Arial 36 / 72pt, Calibri 16pt, Times New Roman 16pt wrapped in a box
     of exactly the kerned width; 0.01 cm closed them). Added ONCE to the widest line, on
     `textBox.width` only — `content.width` and the wrap decision are exact. New
     `LayoutOptions.textBoxPadding` (default `0.2835` in office, `0` elsewhere).
  Office-cases goldens shifted (`UPDATE=1`); wrap points of all five cases still equal
  the PowerPoint references. See `scripts/office-metrics/RESULTS.md` "Glyph advances".
- **`textBox.width` and `content.width` round UP to 0.01pt** (were nearest) — a
  box sized exactly to the measured width could come out a hair narrower after the
  consumer's own rounding (PowerPoint boxes are whole EMU; 1/8pt = 1587.5 EMU) and
  PowerPoint then wrapped the last word. Multi-column `content.width` is unchanged.

### Added

- **PowerPoint calibration tooling** (`scripts/office-metrics/`): `gen-glyph-alphabet.ts` (every
  glyph its own coloured run → per-glyph advances from the SVG export), `gen-kern-context.ts`
  (`kern-context.pptx`: kern pair in different contexts + the wrap diagnostic slides) and
  `gen-stress.ts` (30 slides × 8×6, 12 fonts, 8 → 120pt, regular / bold / italic; 1336 boxes sized to
  vyaz's width — any box that wraps in PowerPoint is a bug). Removed: the hand-fitted
  `font-metrics.pptx` oracle deck with its `parse-pptx.ts` / `report.ts` / `report.md`. All
  PowerPoint-side steps are manual (export to SVG); method and results in `RESULTS.md`
  "Glyph advances".

## [0.4.7] - 2026-09-18

`@vyaz/core` 0.4.6 → 0.4.7, `@vyaz/renderer` 0.4.6 → 0.4.7. `@vyaz/converters`
unchanged at 0.1.0.

### Fixed

- **`overflowWrap` now defaults to CSS `'normal'`, not a forced grapheme
  break** — a `<Text>`/paragraph with a single short unbreakable word (e.g.
  `"Hi"`) measured under an intrinsic-width (min-content) probe came out
  narrower than the word's own natural width: the vendored line-breaker
  (`@chenglou/pretext`) hardcodes `overflow-wrap: break-word`
  unconditionally, with no option to disable it. Any word wider than the
  available width got sliced at grapheme boundaries — in both `mode:
  'office'` and `'browser'`, for a single word and for each word of a
  multi-word phrase alike. `ParagraphStyle.overflowWrap` (previously a
  no-op) now actually gates this: `'normal'` (the default, matching real
  browsers/PowerPoint) lets an atomic word overflow the line instead;
  explicit `'break-word'`/`'anywhere'` restore the old fallback. Patches
  `layout.js`/`rich-inline.js` (vendored, anchored in `vendor-pretext.ts` so
  the patch survives re-vendoring — see `VENDOR.json`). Also fixes a
  cache-correctness bug this surfaced: `ParagraphLayoutEngine`'s
  prepared-line LRU cache didn't key on `overflowWrap`, so two paragraphs
  with identical text/font but different `overflowWrap` could share a stale
  cached result.

## [0.4.6] - 2026-09-17

`@vyaz/core` 0.4.5 → 0.4.6, `@vyaz/renderer` 0.4.5 → 0.4.6. `@vyaz/converters`
unchanged at 0.1.0.

### Fixed

- **`mode: 'office'` baseline ratio at `lineHeight === 1` is
  `(typoAscFrac + winAscFrac) / 2`, not a single font ratio** — corrects
  0.4.5's fix, which used the font's own `typoAscFrac` alone. A 4-font corpus
  (Roboto/Arial/Unifont/Times New Roman × 11 sizes) showed even Roboto (whose
  `typoAscFrac` is exactly the old flat `0.75`) measured off that value —
  the averaged ratio fits all three "normal" fonts within ~1%. New
  `FontMetrics.winAscFrac` / `useTypoMetrics` fields. Fonts with OS/2
  `fsSelection.useTypoMetrics` set (Unifont, the one such font tested) fall
  back to the flat `0.75`. See `scripts/office-metrics/RESULTS.md`.
- **`mode: 'office'` width measurement defaults to shaped (kerned)** —
  `LayoutOptions.shaping` used to default to `false` (plain per-code-point
  advance sum) for every mode; real PowerPoint applies GPOS kerning, so
  `content.width` / `textBox.width` could be measurably narrower than what
  PowerPoint actually needs (e.g. Roboto `"Short line here."` 18pt: 119.87pt
  unshaped vs 120.15pt shaped — Arial has zero kern pairs for that string, so
  it never showed the gap). Usually inside a layout's slack and invisible,
  but decisive at zero slack — a shape sized exactly to `content.width`
  (a real "shrink shape to fit text" pattern) could wrap in PowerPoint when
  vyaz predicted one line. `shaping` now defaults to `true` when
  `mode: 'office'` (`false` elsewhere, unchanged); pass it explicitly to
  override either way. Not a no-op — office-cases goldens with kerned runs
  shifted (sub-point) and needed `UPDATE=1`. See
  `scripts/office-metrics/RESULTS.md` "`shaping` now defaults to `true` for
  `mode: 'office'`".

## [0.4.5] - 2026-09-17

`@vyaz/core` 0.4.4 → 0.4.5, `@vyaz/renderer` 0.4.4 → 0.4.5. `@vyaz/converters`
unchanged at 0.1.0.

### Fixed

- **`mode: 'office'` baseline ratio at `lineHeight === 1`** — was a flat `0.75`
  (`OFFICE_BASELINE_RATIO`), calibrated on Roboto (whose OS/2
  `typoAscender/(typoAscender−typoDescender)` is exactly 0.75 by coincidence).
  Real PowerPoint measurably tracks `(typoAscFrac + winAscFrac) / 2` of the
  dominant run's own font at spcPct = 100 % — neither ratio alone (checked
  across Roboto/Arial/Times New Roman/Unifont, see
  `scripts/office-metrics/RESULTS.md` "OFFICE_BASELINE_RATIO at spcPct = 100 %
  is `(typoAscFrac + winAscFrac) / 2`"). New `FontMetrics.winAscFrac` /
  `useTypoMetrics` fields (threaded from `FontEngine.ts`'s OS/2 table) join
  the existing `typoAscFrac`. Falls back to the flat `0.75` when the OS/2
  table is missing, the font sets `fsSelection.useTypoMetrics` (only Unifont
  measured so far, not enough to derive its own rule), or `lineHeight !== 1`.
  **Not a no-op for Roboto** — office-cases goldens at spcPct = 100 % shifted
  (up to ~0.45pt per baseline) and needed `UPDATE=1` + review.

## [0.4.4] - 2026-09-10

`@vyaz/core` 0.4.3 → 0.4.4, `@vyaz/renderer` 0.4.3 → 0.4.4. `@vyaz/converters`
unchanged at 0.1.0.

### Added

- **`TextFrameLayoutResult.textBox`** — a `{ x, y, width, height }` box that
  hugs the text, next to the existing `content` (the CSS box: every line's full
  `lineHeight` box plus padding). `textBox` keeps the same top / left / right
  but drops the bottom to the **last line's baseline + real font descent**, so a
  `lineHeight` > 1 no longer trails empty space after the text
  (`content.height − textBox.height` — ~0.5 pt at 18 pt / spacing 1.0, ~6 pt at
  spacing 2.0). Output-format generators use it directly for frame sizing (PDF,
  and PPTX when PowerPoint's own autofit trims) instead of re-deriving the
  trailing leading from font metrics. `scripts/office-metrics/RESULTS.md` +
  `textframe-fit-run.ts` / `gen-textframe-fit.py` are the round-trip harness
  that checks vyaz's box against PowerPoint's. (`a34c97e`)

## [0.4.3] - 2026-09-10

`@vyaz/core` 0.4.2 → 0.4.3, `@vyaz/renderer` 0.4.2 → 0.4.3. `@vyaz/converters`
unchanged at 0.1.0.

### Changed

- **`mode: 'office'` line box is now `1.20 × fontSize`, font-independent**
  (`OFFICE_LINE_BOX_RATIO` in `PositioningEngine`), replacing
  `winAscent + winDescent` (= `1.294 × fontSize` for Roboto, an Arial-fitted
  `× 1.078`). PowerPoint's own SVG exports put the line pitch at exactly
  `spcPct × 1.20 × fontSize` for Roboto, and `scripts/office-metrics/report.md`
  measures the same 1.20 box for Great Vibes (win ratio 1.75) — no fontkit
  metric yields 1.20 for both, so it is a measured constant. Office line height
  and frame bbox drop ~7.8 % for Roboto/Inter-class fonts (e.g. −0.13 cm per
  line at 40 pt) and now match PowerPoint's pitch to <0.1 pt and its frame
  height exactly on the single-paragraph `office-cases` (`line-spacing-100 /
  150 / 200`). This closes the base-constant half of the
  [Roadmap](ROADMAP.md) "office line-box model" item; the cross-line
  `0.25·H(prev)+0.75·H(cur)` seam now falls out of the box + 0.75 baseline for
  free. Still open: PowerPoint word-wraps large runs more eagerly (the `mixed`
  case), and one paragraph seam is grid-snapped ~0.9 pt. (`f26dd7a`)

## [0.4.2] - 2026-09-10

`@vyaz/core` 0.4.1 → 0.4.2, `@vyaz/renderer` 0.4.1 → 0.4.2. `@vyaz/converters`
unchanged at 0.1.0.

### Changed

- **`mode: 'office'` baseline placement** — the office line baseline is now
  `0.75 × lineBox` from the box top (`OFFICE_BASELINE_RATIO` in
  `PositioningEngine`), on **every** line. 0.4.1 only lifted 0.75 of the *extra*
  leading above `round(ascent)`, so at `spcPct` 1.0 (no extra leading) the
  baseline stayed at `round(ascent)`. PowerPoint's SVG exports put it at
  `0.75 × box` regardless of spacing; the single-spaced baseline moves up
  ~0.5 px at 18 pt. Pitch and box height are unchanged from 0.4.1. Goldens in
  `packages/renderers/tests/office-cases/` regenerated; `office-cases/MIGRATION.md`
  §7 M2 updated. 0.75 == Roboto's `typoAscender / (typoAscender − typoDescender)`
  — see [Roadmap](ROADMAP.md) "office line-box model" for the base-constant
  (~1.20) piece still open. (`48c6be6`)

## [0.4.1] - 2026-09-10

`@vyaz/core` 0.4.0 → 0.4.1, `@vyaz/renderer` 0.4.0 → 0.4.1. `@vyaz/converters`
unchanged at 0.1.0.

### Fixed

- **`mode: 'office'` ignored the paragraph line-spacing multiplier** — the
  office (DrawingML) line-box branch in `PositioningEngine` used `winAscent +
  winDescent` verbatim and never read `style.lineHeight`
  (`<a:lnSpc><a:spcPct>`), so PowerPoint content set to 1.5 / 2.0 line spacing
  rendered single-spaced. The line box now scales linearly with
  `style.lineHeight` and the extra leading sits ~0.75 above the baseline, which
  matches PowerPoint's own SVG exports; `spcPct` 1.0 output is byte-identical to
  before. New golden corpus `packages/renderers/tests/office-cases/` with the
  PowerPoint exports as oracle (`scripts/office-metrics/gen-line-spacing.py`),
  core cover in `layout-mode.test.ts`, and analysis in
  `office-cases/MIGRATION.md`. The base constant (1.294 for Roboto vs
  PowerPoint's font-independent ~1.20) and the cross-line / paragraph-seam
  leading split are still open — see [Roadmap](ROADMAP.md) "office line-box
  model". (`4e23250`)

- **Stray underline under the first glyph when a paragraph has a `<a href>`** —
  the `browser`/`preserve` SVG preset wrapped a link run as
  `<a href><text x="0"><tspan x="…" text-decoration="underline">`. Chrome draws
  a spurious underline tick at the x origin of an `<a>`-wrapped `<text x="0">`,
  which landed under the paragraph's first character. The linked `<text>` is now
  anchored at the run's real x. (`3957522`)

- **Docs API reference 404s** — `/api/references/<pkg>/src/classes|interfaces|functions/`
  links 404'd two ways at once: VitePress's `base` was being prepended a
  second time on top of a hardcoded `/vyaz` prefix (`/vyaz/vyaz/...`), and
  separately `typedoc-plugin-markdown` never emits an index page for those
  category directories — only per-symbol files live there, so the links were
  dead even with the base fixed. Dropped the double base and removed the
  category links, keeping `Package index` (already lists every symbol with a
  direct link). (`7cc6dbe`, `7fd7093`)

### CI

- Added a `CI` workflow (bun test + build + `make smoke` + browser-bundle
  check) on every push to `main` and every PR. Fixed the `Makefile` package
  list, still on the pre-rename `renderer` / `html` names, so `make smoke` /
  `make check` run again.

### Docs

- Converter sample headings no longer use the `→` arrow (`Typography & HTML to SVG`).
- Top nav trimmed to Guide / Playground / Converter / API, each a dropdown;
  Tables and Cases moved under Guide/Playground. Sidebar still lists every
  page. (`b208621`, `6588282`)
- Converter page opens straight into HTML or Markdown mode via
  `?format=html|markdown` from the nav. (`b208621`)
- Mode/Cases `<select>` toolbar controls had lost their border and arrow to
  VitePress's base CSS reset and read as plain text — gave them a visible
  dropdown affordance. (`b208621`)
- New logo (transparent background), home hero image, page footer.
  (`b208621`, `6588282`, `413b46c`)

## [0.4.0] - 2026-09-05

`@vyaz/core` 0.3.0 → 0.4.0, `@vyaz/renderer` 0.3.0 → 0.4.0, `@vyaz/converters`
**first release** at 0.1.0.

### Added

- **`TextRun.data`** — an open-ended metadata bag on `TextRun` the layout
  engine itself never reads, modelled on unist's `data` node field. First
  consumer: `@vyaz/converters` now carries `<a href="...">` into
  `TextRun.data.href` (only `http:`/`https:`/`mailto:`/`tel:` and
  relative/fragment URLs — anything else, e.g. `javascript:`, is dropped with
  a new `link-href-unsafe` warning), and `@vyaz/renderer`'s `browser`/
  `preserve` SVG presets wrap the linked run's `<text>` in a real `<a href>`.
  `flat`/`glyph` ignore it. (`74c4c57`)
- **`@vyaz/converters`: `markdownToTextFrame()`** — Markdown through the same
  pipeline as HTML (`marked` → the existing `htmlToTextFrame`). (`4574e8d`)

### Changed

- `packages/html` renamed to `packages/converters` (`@vyaz/converters`);
  `packages/renderer` dir renamed to `renderers`. No API change. (`174ebb3`)
