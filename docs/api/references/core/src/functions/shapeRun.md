[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / shapeRun

# Function: shapeRun()

> **shapeRun**(`font`, `text`, `opts?`): [`ShapedRun`](../interfaces/ShapedRun.md)

Defined in: [core/src/measure/FontEngine.ts:151](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontEngine.ts#L151)

Shape `text` through fontkit's OpenType layout engine — the same GPOS kerning
and GSUB substitutions (`liga`, `clig`, `calt`, `ccmp`) a browser applies by
default. Use this instead of summing [getGlyphAdvance](getGlyphAdvance.md) when the measured
width has to line up with what the browser will actually paint.

Widths are in font units; multiply by `fontSize / unitsPerEm`.

## Parameters

### font

[`FontFace`](../interfaces/FontFace.md)

### text

`string`

### opts?

#### features?

`Record`\<`string`, `boolean`\>

OpenType feature overrides, e.g. `{ liga: false }` to
  emulate `text-rendering: optimizeSpeed`. Omit for browser-default behaviour.

#### language?

`string`

#### script?

`string`

## Returns

[`ShapedRun`](../interfaces/ShapedRun.md)
