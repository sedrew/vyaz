[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / FontMetricsProvider

# Class: FontMetricsProvider

Defined in: [core/src/measure/FontMetricsProvider.ts:114](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontMetricsProvider.ts#L114)

Font metrics provider — registers, resolves, and measures fonts.

Public API (stable):
  - `registerFont()`
  - `getMetrics()`
  - `getFont()`
  - `setMode()` / `getMode()`

Semi-stable (@beta — may change with notice):
  - `waitForPendingRegistrations()`
  - `getRegisteredFamilies()`
  - `getFamilyVariants()`

Everything else is internal.

## Implements

- [`IFontMetricsProvider`](../interfaces/IFontMetricsProvider.md)

## Constructors

### Constructor

> **new FontMetricsProvider**(): `FontMetricsProvider`

#### Returns

`FontMetricsProvider`

## Methods

### getFamilyVariants()

> **getFamilyVariants**(`family`): `string`[]

Defined in: [core/src/measure/FontMetricsProvider.ts:257](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontMetricsProvider.ts#L257)

**`Beta`**

Get all variant keys registered for a given family.
Returns empty array if family not found.

 — may change with notice

#### Parameters

##### family

`string`

#### Returns

`string`[]

***

### getFont()

> **getFont**(`family`, `weight?`, `style?`): [`FontFace`](../interfaces/FontFace.md) \| `undefined`

Defined in: [core/src/measure/FontMetricsProvider.ts:268](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontMetricsProvider.ts#L268)

Get font engine FontFace for per-character calculations.
Uses the same smart fallback logic as getMetrics().

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

> **getMetrics**(`fontFamily`, `fontSize`, `weight?`, `style?`, `mode?`): [`FontMetrics`](../interfaces/FontMetrics.md)

Defined in: [core/src/measure/FontMetricsProvider.ts:361](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontMetricsProvider.ts#L361)

Get pixel-scale metrics for a given font family, size, weight, and style.

Resolution order:
1. FontEngine (fontkit) from registry — with smart weight/style fallback
2. Canvas TextMetrics (browser fallback when fontkit unavailable)

#### Parameters

##### fontFamily

`string`

##### fontSize

`number`

##### weight?

`string` = `'normal'`

##### style?

`string` = `'normal'`

##### mode?

`"browser"` \| `"office"`

#### Returns

[`FontMetrics`](../interfaces/FontMetrics.md)

#### Throws

FontNotFoundError when font is neither registered nor available via Canvas

#### Implementation of

[`IFontMetricsProvider`](../interfaces/IFontMetricsProvider.md).[`getMetrics`](../interfaces/IFontMetricsProvider.md#getmetrics)

***

### getMode()

> **getMode**(): `"browser"` \| `"office"`

Defined in: [core/src/measure/FontMetricsProvider.ts:163](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontMetricsProvider.ts#L163)

Get current measurement mode.

#### Returns

`"browser"` \| `"office"`

#### Implementation of

[`IFontMetricsProvider`](../interfaces/IFontMetricsProvider.md).[`getMode`](../interfaces/IFontMetricsProvider.md#getmode)

***

### getRegisteredFamilies()

> **getRegisteredFamilies**(): `string`[]

Defined in: [core/src/measure/FontMetricsProvider.ts:247](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontMetricsProvider.ts#L247)

**`Beta`**

List all families registered in the provider.

 — may change with notice

#### Returns

`string`[]

***

### registerFont()

> **registerFont**(`family`, `options`, `source`, `sourcePath?`): `Promise`\<`void`\>

Defined in: [core/src/measure/FontMetricsProvider.ts:179](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontMetricsProvider.ts#L179)

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

###### variation?

`Record`\<`string`, `number`\>

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

Defined in: [core/src/measure/FontMetricsProvider.ts:153](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontMetricsProvider.ts#L153)

Set measurement mode.
- `'browser'` — hhea.ascender/descender (default)
- `'office'`  — OS/2.usWinAscent/usWinDescent

#### Parameters

##### mode

`"browser"` \| `"office"`

#### Returns

`void`

#### Implementation of

[`IFontMetricsProvider`](../interfaces/IFontMetricsProvider.md).[`setMode`](../interfaces/IFontMetricsProvider.md#setmode)

***

### waitForPendingRegistrations()

> **waitForPendingRegistrations**(): `Promise`\<`void`\>

Defined in: [core/src/measure/FontMetricsProvider.ts:236](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontMetricsProvider.ts#L236)

**`Beta`**

Wait for all in-flight font registrations to complete.
Useful after a batch of registerFont() calls before layout.

 — may change with notice

#### Returns

`Promise`\<`void`\>
