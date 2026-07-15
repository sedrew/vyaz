[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / FontMetricsProvider

# Class: FontMetricsProvider

Defined in: [core/src/measure/FontMetricsProvider.ts:63](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontMetricsProvider.ts#L63)

Metrics provider — isomorphic interface

## Implements

- [`IFontMetricsProvider`](../interfaces/IFontMetricsProvider.md)

## Constructors

### Constructor

> **new FontMetricsProvider**(): `FontMetricsProvider`

#### Returns

`FontMetricsProvider`

## Methods

### getFont()

> **getFont**(`family`, `weight?`, `style?`): [`FontFace`](../interfaces/FontFace.md) \| `undefined`

Defined in: [core/src/measure/FontMetricsProvider.ts:138](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontMetricsProvider.ts#L138)

Get font engine FontFace object for per-character calculations.
Returns undefined if font is not registered.

#### Parameters

##### family

`string`

##### weight?

`string` = `'normal'`

##### style?

`string` = `'normal'`

#### Returns

[`FontFace`](../interfaces/FontFace.md) \| `undefined`

***

### getMetrics()

> **getMetrics**(`fontFamily`, `fontSize`, `weight?`, `style?`): [`FontMetrics`](../interfaces/FontMetrics.md)

Defined in: [core/src/measure/FontMetricsProvider.ts:145](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontMetricsProvider.ts#L145)

Get metrics for a given family and size.

#### Parameters

##### fontFamily

`string`

##### fontSize

`number`

##### weight?

`string` = `'normal'`

##### style?

`string` = `'normal'`

#### Returns

[`FontMetrics`](../interfaces/FontMetrics.md)

#### Implementation of

[`IFontMetricsProvider`](../interfaces/IFontMetricsProvider.md).[`getMetrics`](../interfaces/IFontMetricsProvider.md#getmetrics)

***

### getMode()

> **getMode**(): `"browser"` \| `"office"`

Defined in: [core/src/measure/FontMetricsProvider.ts:85](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontMetricsProvider.ts#L85)

Get current mode.

#### Returns

`"browser"` \| `"office"`

#### Implementation of

[`IFontMetricsProvider`](../interfaces/IFontMetricsProvider.md).[`getMode`](../interfaces/IFontMetricsProvider.md#getmode)

***

### registerFont()

> **registerFont**(`family`, `options`, `source`, `sourcePath?`): `Promise`\<`void`\>

Defined in: [core/src/measure/FontMetricsProvider.ts:101](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontMetricsProvider.ts#L101)

Register a binary font for use with fontkit.

In both Node.js and browser the font is loaded via FontEngine.
In the browser the caller must provide font bytes (e.g. fetched via
`getFontBuffer()` from `../utils/font.js`).

#### Parameters

##### family

`string`

##### options

###### style?

`string`

###### weight?

`string`

##### source

`string` \| `ArrayBuffer` \| `Uint8Array`\<`ArrayBufferLike`\>

Font file bytes (ArrayBuffer / Uint8Array), or a URL string

##### sourcePath?

`string`

Optional filesystem path (used for @napi-rs/canvas in Node.js)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`IFontMetricsProvider`](../interfaces/IFontMetricsProvider.md).[`registerFont`](../interfaces/IFontMetricsProvider.md#registerfont)

***

### setMode()

> **setMode**(`mode`): `void`

Defined in: [core/src/measure/FontMetricsProvider.ts:71](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontMetricsProvider.ts#L71)

Set measurement mode.
  'browser' — hhea.ascender/descender (default)
  'office'  — OS/2.usWinAscent/usWinDescent

#### Parameters

##### mode

`"browser"` \| `"office"`

#### Returns

`void`

#### Implementation of

[`IFontMetricsProvider`](../interfaces/IFontMetricsProvider.md).[`setMode`](../interfaces/IFontMetricsProvider.md#setmode)
