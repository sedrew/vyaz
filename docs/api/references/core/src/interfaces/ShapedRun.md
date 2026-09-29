[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / ShapedRun

# Interface: ShapedRun

Defined in: [core/src/measure/FontEngine.ts:190](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontEngine.ts#L190)

Result of [shapeRun](../functions/shapeRun.md): total advance + per-glyph detail, in font units.

## Properties

### advanceWidth

> **advanceWidth**: `number`

Defined in: [core/src/measure/FontEngine.ts:192](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontEngine.ts#L192)

Sum of every glyph's xAdvance after kerning / ligature substitution.

***

### glyphs

> **glyphs**: [`ShapedGlyph`](ShapedGlyph.md)[]

Defined in: [core/src/measure/FontEngine.ts:193](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontEngine.ts#L193)
