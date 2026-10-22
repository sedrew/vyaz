[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / ShapedRun

# Interface: ShapedRun

Defined in: [core/src/measure/FontEngine.ts:222](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontEngine.ts#L222)

Result of [shapeRun](../functions/shapeRun.md): total advance + per-glyph detail, in font units.

## Properties

### advanceWidth

> **advanceWidth**: `number`

Defined in: [core/src/measure/FontEngine.ts:224](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontEngine.ts#L224)

Sum of every glyph's xAdvance after kerning / ligature substitution.

***

### glyphs

> **glyphs**: [`ShapedGlyph`](ShapedGlyph.md)[]

Defined in: [core/src/measure/FontEngine.ts:225](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontEngine.ts#L225)
