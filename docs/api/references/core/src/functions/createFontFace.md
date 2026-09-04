[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / createFontFace

# Function: createFontFace()

> **createFontFace**(`buffer`, `opts?`): `Promise`\<[`FontFace`](../interfaces/FontFace.md)\>

Defined in: [core/src/measure/FontEngine.ts:102](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontEngine.ts#L102)

Create a font face from a binary buffer.

## Parameters

### buffer

`ArrayBuffer` \| `Uint8Array`\<`ArrayBufferLike`\>

Font file bytes (ArrayBuffer in browser, Uint8Array/Buffer in Node.js)

### opts?

#### variation?

`Record`\<`string`, `number`\>

For a variable font, axis values to instance before use
  (e.g. `{ wght: 700, wdth: 100 }`). Ignored when the font has no axes. Every
  downstream call — `glyphForCodePoint`, `layout`, metric extraction — then
  sees the instanced master, matching what a browser renders for that weight.

## Returns

`Promise`\<[`FontFace`](../interfaces/FontFace.md)\>

Opaque FontFace handle
