[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / FontFace

# Interface: FontFace

Defined in: [core/src/measure/FontEngine.ts:32](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontEngine.ts#L32)

Opaque font face handle returned by FontEngine.create()

## Properties

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

### unitsPerEm

> `readonly` **unitsPerEm**: `number`

Defined in: [core/src/measure/FontEngine.ts:36](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontEngine.ts#L36)

Cached values extracted once after creation

***

### winAscent

> `readonly` **winAscent**: `number` \| `null`

Defined in: [core/src/measure/FontEngine.ts:40](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontEngine.ts#L40)

***

### winDescent

> `readonly` **winDescent**: `number` \| `null`

Defined in: [core/src/measure/FontEngine.ts:41](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontEngine.ts#L41)
