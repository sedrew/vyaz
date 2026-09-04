[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / ShapedRun

# Interface: ShapedRun

Defined in: [core/src/measure/FontEngine.ts:128](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontEngine.ts#L128)

Result of [shapeRun](../functions/shapeRun.md): total advance + per-glyph detail, in font units.

## Properties

### advanceWidth

> **advanceWidth**: `number`

Defined in: [core/src/measure/FontEngine.ts:130](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontEngine.ts#L130)

Sum of every glyph's xAdvance after kerning / ligature substitution.

***

### glyphs

> **glyphs**: [`ShapedGlyph`](ShapedGlyph.md)[]

Defined in: [core/src/measure/FontEngine.ts:131](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontEngine.ts#L131)
