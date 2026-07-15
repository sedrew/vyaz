[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / WritingMode

# Type Alias: WritingMode

> **WritingMode** = `"horizontal-tb"` \| `"vertical-rl"` \| `"vertical-lr"`

Defined in: [core/src/types/Document.ts:34](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L34)

Block flow direction (writing mode).

Determines how lines stack relative to each other:
- `horizontal-tb`: lines flow horizontally top-to-bottom (Latin, Cyrillic, default).
- `vertical-rl`: lines flow vertically right-to-left (traditional CJK).
- `vertical-lr`: lines flow vertically left-to-right (Mongolian, some UI scenarios).

**Layout impact:**
 Under `horizontal-tb`, `wrap` clips by **width**, `autofit` shrinks by **height**.
 Under `vertical-*`, `wrap` clips by **height**, `autofit` shrinks by **width**
 (width and height swap roles).

## See

[CSS Writing Modes: block flow](https://www.w3.org/TR/css-writing-modes-3/#block-flow)
