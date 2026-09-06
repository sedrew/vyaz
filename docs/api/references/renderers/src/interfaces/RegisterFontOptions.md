[vyaz-monorepo](../../../index.md) / [renderers/src](../index.md) / RegisterFontOptions

# Interface: RegisterFontOptions

Defined in: [renderers/src/register-font.ts:13](https://github.com/sedrew/vyaz/blob/main/packages/renderers/src/register-font.ts#L13)

## Properties

### engineOnly?

> `optional` **engineOnly?**: `boolean`

Defined in: [renderers/src/register-font.ts:20](https://github.com/sedrew/vyaz/blob/main/packages/renderers/src/register-font.ts#L20)

Register with the layout engine only; skip `document.fonts`.

***

### style?

> `optional` **style?**: `"normal"` \| `"italic"`

Defined in: [renderers/src/register-font.ts:16](https://github.com/sedrew/vyaz/blob/main/packages/renderers/src/register-font.ts#L16)

***

### variation?

> `optional` **variation?**: `Record`\<`string`, `number`\>

Defined in: [renderers/src/register-font.ts:18](https://github.com/sedrew/vyaz/blob/main/packages/renderers/src/register-font.ts#L18)

Variable-font axis pin, e.g. `{ wght: 700 }`.

***

### weight?

> `optional` **weight?**: `string` \| `number`

Defined in: [renderers/src/register-font.ts:15](https://github.com/sedrew/vyaz/blob/main/packages/renderers/src/register-font.ts#L15)

`'400'` / `'bold'` / `700` — defaults to `'normal'`.
