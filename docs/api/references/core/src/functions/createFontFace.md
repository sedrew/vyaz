[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / createFontFace

# Function: createFontFace()

> **createFontFace**(`buffer`): `Promise`\<[`FontFace`](../interfaces/FontFace.md)\>

Defined in: [core/src/measure/FontEngine.ts:86](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontEngine.ts#L86)

Create a font face from a binary buffer.

## Parameters

### buffer

`ArrayBuffer` \| `Uint8Array`\<`ArrayBufferLike`\>

Font file bytes (ArrayBuffer in browser, Uint8Array/Buffer in Node.js)

## Returns

`Promise`\<[`FontFace`](../interfaces/FontFace.md)\>

Opaque FontFace handle
