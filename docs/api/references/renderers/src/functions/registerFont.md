[vyaz-monorepo](../../../index.md) / [renderers/src](../index.md) / registerFont

# Function: registerFont()

> **registerFont**(`family`, `source`, `opts?`): `Promise`\<[`RegisterFontResult`](../interfaces/RegisterFontResult.md)\>

Defined in: [renderers/src/register-font.ts:49](https://github.com/sedrew/vyaz/blob/main/packages/renderers/src/register-font.ts#L49)

Register one font face with the layout engine and (in a browser) with
`document.fonts`, from a single `ArrayBuffer` / `Uint8Array` or a URL.

## Parameters

### family

`string`

### source

`string` \| `ArrayBuffer` \| `Uint8Array`\<`ArrayBufferLike`\>

### opts?

[`RegisterFontOptions`](../interfaces/RegisterFontOptions.md) = `{}`

## Returns

`Promise`\<[`RegisterFontResult`](../interfaces/RegisterFontResult.md)\>

## Example

```ts
await registerFont('Inter', '/fonts/Inter.woff2', { weight: 400 })
await registerFont('Inter', bytes, { weight: 700, variation: { wght: 700 } })
```
