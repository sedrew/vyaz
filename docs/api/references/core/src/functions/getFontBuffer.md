[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / getFontBuffer

# Function: getFontBuffer()

> **getFontBuffer**(`fontUrl`): `Promise`\<`ArrayBuffer`\>

Defined in: [core/src/utils/font.ts:17](https://github.com/sedrew/vyaz/blob/main/packages/core/src/utils/font.ts#L17)

Download a font file from a URL and return its bytes.

Works in browser environments.  In Node.js you'd typically read the file
via `fs.readFileSync()` instead.

## Parameters

### fontUrl

`string`

URL of the font file (.ttf, .otf, .woff, .woff2)

## Returns

`Promise`\<`ArrayBuffer`\>

Font file bytes as an ArrayBuffer
