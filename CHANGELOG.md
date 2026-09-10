# Changelog

Real bug fixes and features, not every commit — loosely [Keep a Changelog](https://keepachangelog.com/)
format. A docs-only entry is one line. A fix or feature gets enough detail to
act on, the commit(s) it landed in, and a link to the [Roadmap](ROADMAP.md)
item when it closes or advances one.

## [Unreleased]

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
