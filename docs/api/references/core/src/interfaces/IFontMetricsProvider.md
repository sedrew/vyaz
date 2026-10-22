[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / IFontMetricsProvider

# Interface: IFontMetricsProvider

Defined in: [core/src/types/FontTypes.ts:76](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/FontTypes.ts#L76)

Metrics provider — isomorphic interface

## Methods

### getMetrics()

> **getMetrics**(`fontFamily`, `fontSize`, `weight?`, `style?`, `mode?`): [`FontMetrics`](FontMetrics.md)

Defined in: [core/src/types/FontTypes.ts:105](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/FontTypes.ts#L105)

Get metrics for a given family and size.

#### Parameters

##### fontFamily

`string`

##### fontSize

`number`

##### weight?

`string`

##### style?

`string`

##### mode?

`"browser"` \| `"office"`

#### Returns

[`FontMetrics`](FontMetrics.md)

***

### getMode()

> **getMode**(): `"browser"` \| `"office"`

Defined in: [core/src/types/FontTypes.ts:87](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/FontTypes.ts#L87)

Get current mode.

#### Returns

`"browser"` \| `"office"`

***

### registerFont()

> **registerFont**(`family`, `options`, `source`, `sourcePath?`): `void`

Defined in: [core/src/types/FontTypes.ts:95](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/FontTypes.ts#L95)

Register a binary font for use with fontkit.
In browser — no-op (fonts are registered via CSS @font-face).

#### Parameters

##### family

`string`

##### options

###### style?

`string`

###### weight?

`string`

##### source

`string` \| `Buffer`\<`ArrayBufferLike`\>

##### sourcePath?

`string`

— path to .ttf/.otf file for optional @napi-rs/canvas.registerFont()

#### Returns

`void`

***

### setMode()

> **setMode**(`mode`): `void`

Defined in: [core/src/types/FontTypes.ts:82](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/FontTypes.ts#L82)

Set measurement mode.
  'browser' — hhea.ascender/descender (default)
  'office'  — OS/2.usWinAscent/usWinDescent

#### Parameters

##### mode

`"browser"` \| `"office"`

#### Returns

`void`
