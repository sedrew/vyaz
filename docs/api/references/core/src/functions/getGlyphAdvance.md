[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / getGlyphAdvance

# Function: getGlyphAdvance()

> **getGlyphAdvance**(`font`, `codePoint`): `number` \| `null`

Defined in: [core/src/measure/FontEngine.ts:101](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontEngine.ts#L101)

Get the advance width (in font units) for a single code point.

## Parameters

### font

[`FontFace`](../interfaces/FontFace.md)

### codePoint

`number`

## Returns

`number` \| `null`

advance width in font units, or `null` if the glyph is missing
