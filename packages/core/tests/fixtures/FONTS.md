# Test font fixtures

These fonts are **test-only**. `@vyaz/core` publishes `["dist", "bin"]` (see
`package.json` `files`), so nothing under `tests/` reaches the npm tarball.

Each font is redistributed here under a libre license; the full license text is
in `licenses/`. Downloaded from the upstreams below.

| File | Family | License | Axes | Why it's here | Source |
|---|---|---|---|---|---|
| `unifont-17.0.05.otf` | Unifont | GPL-2.0+ (font embedding exception) / OFL-1.1 | — (fixed) | Monospaced, no `GPOS`/`GSUB` → shaping-invariant baseline; deterministic per-machine | <https://unifoundry.com/unifont/> |
| `Roboto-VariableFont_wdth,wght.ttf` | Roboto | Apache-2.0 → OFL-1.1 (v3) | `wght` 100–900, `wdth` 75–100 | Variable font; real pair kerning; Latin + Cyrillic + Greek | <https://github.com/google/fonts/tree/main/ofl/roboto> |
| `Inter-Variable.ttf` | Inter | OFL-1.1 | `opsz` 14–32, `wght` 100–900 | Second variable font, contrast with Roboto; strong kerning; Latin + Cyrillic + Greek | <https://github.com/google/fonts/tree/main/ofl/inter> |
| `GreatVibes-Regular.ttf` | Great Vibes | OFL-1.1 | — (fixed) | Script face: heavy `calt` + `liga`, so `layout()` width diverges sharply from the advance sum | <https://github.com/google/fonts/tree/main/ofl/greatvibes> |

## Refreshing

Re-download from the same paths and update the version in the filename / this
table. Then regenerate the browser oracle (`scripts/browser-metrics/`), which is
the only thing pinned to exact glyph advances.

## Corpus

`corpus.json` — strings grouped by `script` and category (kerning pairs,
ligatures, numerals, words, whitespace, paragraphs) plus the size sweep. Consumed
by both the browser calibration page and `browser-metrics.test.ts`.
