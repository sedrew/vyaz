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
| `Roboto-VariableFont_wdth,wght.ttf` | Roboto | OFL-1.1 (`Roboto-LICENSE.txt`) |
| `Inter-Variable.ttf` | Inter | OFL-1.1 (`Inter-OFL.txt`) |
| `GreatVibes-Regular.ttf` | Great Vibes | OFL-1.1 (`GreatVibes-OFL.txt`) |
