[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / FontFace

# Interface: FontFace

Defined in: [core/src/measure/FontEngine.ts:32](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontEngine.ts#L32)

Opaque font face handle returned by FontEngine.create()

## Properties

### \_opticalSize?

> `readonly` `optional` **\_opticalSize?**: `object`

Defined in: [core/src/measure/FontEngine.ts:58](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontEngine.ts#L58)

Set when the font has an `opsz` axis that registration left free: the
un-instanced master plus the registered axes, so opticalSizeInstance
can pin `opsz` to the used font size (CSS `font-optical-sizing: auto`).

#### base

> `readonly` **base**: `any`

#### max

> `readonly` **max**: `number`

#### min

> `readonly` **min**: `number`

#### variation

> `readonly` **variation**: `Record`\<`string`, `number`\> \| `undefined`

***

### \_raw

> `readonly` **\_raw**: `any`

Defined in: [core/src/measure/FontEngine.ts:34](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontEngine.ts#L34)

fontkit font object (private — not meant for direct access)

***

### ascent

> `readonly` **ascent**: `number`

Defined in: [core/src/measure/FontEngine.ts:37](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontEngine.ts#L37)

***

### capHeight

> `readonly` **capHeight**: `number`

Defined in: [core/src/measure/FontEngine.ts:39](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontEngine.ts#L39)

***

### descent

> `readonly` **descent**: `number`

Defined in: [core/src/measure/FontEngine.ts:38](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontEngine.ts#L38)

***

### typoAscent

> `readonly` **typoAscent**: `number` \| `null`

Defined in: [core/src/measure/FontEngine.ts:43](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontEngine.ts#L43)

OS/2 typoAscender / typoDescender (font units) — null when the font has no OS/2 table.

***

### typoDescent

> `readonly` **typoDescent**: `number` \| `null`

Defined in: [core/src/measure/FontEngine.ts:44](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontEngine.ts#L44)

***

### unitsPerEm

> `readonly` **unitsPerEm**: `number`

Defined in: [core/src/measure/FontEngine.ts:36](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontEngine.ts#L36)

Cached values extracted once after creation

***

### useTypoMetrics

> `readonly` **useTypoMetrics**: `boolean` \| `null`

Defined in: [core/src/measure/FontEngine.ts:52](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontEngine.ts#L52)

OS/2 `fsSelection` bit 7 — the font's own declaration that renderers
should use its typo metrics (not win/hhea) for line spacing. `null` when
the font has no OS/2 table. See FontTypes.ts `FontMetrics.useTypoMetrics`
for why this matters (it's why Unifont, the one oracle font with this bit
set, doesn't fit the same office-mode baseline-ratio formula as the rest).

***

### winAscent

> `readonly` **winAscent**: `number` \| `null`

Defined in: [core/src/measure/FontEngine.ts:40](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontEngine.ts#L40)

***

### winDescent

> `readonly` **winDescent**: `number` \| `null`

Defined in: [core/src/measure/FontEngine.ts:41](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontEngine.ts#L41)
