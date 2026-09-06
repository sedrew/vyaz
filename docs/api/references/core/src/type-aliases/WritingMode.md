[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / WritingMode

# Type Alias: WritingMode

> **WritingMode** = `"horizontal-tb"` \| `"vertical-rl"` \| `"vertical-lr"` \| `"sideways-rl"` \| `"sideways-lr"`

Defined in: [core/src/types/Document.ts:46](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L46)

Block flow direction (writing mode).

Determines how lines stack relative to each other:
- `horizontal-tb`: lines flow horizontally top-to-bottom (Latin, Cyrillic, default).
- `vertical-rl`: lines flow vertically right-to-left (traditional CJK, per-glyph
  upright/rotated via [TextOrientation](TextOrientation.md)).
- `vertical-lr`: lines flow vertically left-to-right (Mongolian, some UI scenarios).
- `sideways-rl`: the whole text block is laid out horizontally, then rotated
  90° **clockwise** as a rigid unit; wrapped lines stack right-to-left. A single
  line reads top-to-bottom. Matches PowerPoint `bodyPr vert="vert"`.
- `sideways-lr`: same, rotated 90° **counter-clockwise**; wrapped lines stack
  left-to-right, a line reads bottom-to-top. Matches PowerPoint `vert="vert270"`.

**Layout impact:**
 Under `horizontal-tb`, `wrap` clips by **width**, `autofit` shrinks by **height**.
 Under `vertical-*` / `sideways-*`, `wrap` clips by **height**, `autofit` shrinks
 by **width** (width and height swap roles).

**Implementation status:** `sideways-rl` / `sideways-lr` are implemented as a
post-layout affine transform (the engine reports it on
`TextFrameLayoutResult.transform`; the renderer applies it). `vertical-rl` /
`vertical-lr` with per-glyph orientation are **not yet implemented** — they are
accepted by the type but currently laid out as `horizontal-tb`.

## See

[CSS Writing Modes: block flow](https://www.w3.org/TR/css-writing-modes-4/#block-flow)
