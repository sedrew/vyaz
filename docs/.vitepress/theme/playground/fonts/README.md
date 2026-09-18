# Playground fonts

Single-file, full-coverage faces bundled with the playground so the layout
engine measures against fonts that actually contain every glyph shown (Latin,
Cyrillic, Greek). The old path fetched Google Fonts `css2`, which splits each
family into ~9 per-subset `@font-face` — registering them under one key made the
last (basic-latin) subset win, so Cyrillic/Greek fell back to `.notdef` metrics.

Same files as `packages/core/tests/fixtures/` (see that dir's `FONTS.md` for
provenance). Licenses alongside.

| file | family | license |
|---|---|---|
| `Roboto-VariableFont_wdth,wght.ttf` | Roboto (roman) | OFL-1.1 (`Roboto-LICENSE.txt`) |
| `Roboto-Italic-VariableFont_wdth,wght.ttf` | Roboto (italic) | OFL-1.1 (`Roboto-LICENSE.txt`) |
| `Inter-Variable.ttf` | Inter (roman) | OFL-1.1 (`Inter-OFL.txt`) |
| `Inter-Italic-Variable.ttf` | Inter (italic) | OFL-1.1 (`Inter-OFL.txt`) |
| `GreatVibes-Regular.ttf` | Great Vibes | OFL-1.1 (`GreatVibes-OFL.txt`) |

The italic files are separate upstream faces (real slanted outlines, not a
CSS synthesis) — registering the roman bytes under `style: 'italic'` used to
tell the browser "this face already is italic" and silently skip synthetic
obliquing, so toggling italic changed the mark but not a single pixel. Great
Vibes has no upstream italic; its roman bytes are reused for the italic
registration as before.
