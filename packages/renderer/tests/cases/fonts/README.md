# `fonts/` golden cases

Real-font layout with the libre fixtures in `packages/core/tests/fixtures/`
(Roboto VF, Inter VF, Great Vibes — see `../../../../core/tests/fixtures/FONTS.md`).

Each case renders four variants:

| variant | measurement | notes |
|---|---|---|
| `flat`, `browser`, `preserve` | **shape** (`layoutTextFrame({ shaping: true })`) | fontkit `layout()` — GPOS kerning + GSUB ligatures, matches what a browser paints |
| `glyph` | advance sum | per-character `x` is still naive; ligature clusters unhandled, so its width is a few px short on script/ligature-heavy fonts. Tracked follow-up. |

`browser.png` next to each case is a real Chrome render of that case's
`browser.svg` (fixture font embedded, `font-optical-sizing: auto`, debug boxes
stripped). It is a **visual reference for review**, not asserted by any test —
compare it against `browser.svg` by eye. Regenerate by hand if the case text or
font changes.
