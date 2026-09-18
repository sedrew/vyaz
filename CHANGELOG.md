# Changelog

Real bug fixes and features, not every commit — loosely [Keep a Changelog](https://keepachangelog.com/)
format. A docs-only entry is one line. A fix or feature gets enough detail to
act on, the commit(s) it landed in, and a link to the [Roadmap](ROADMAP.md)
item when it closes or advances one.

## [Unreleased]

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
