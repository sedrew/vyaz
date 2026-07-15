[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / FontFace

# Interface: FontFace

Defined in: [core/src/measure/FontEngine.ts:20](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontEngine.ts#L20)

Opaque font face handle returned by FontEngine.create()

## Properties

### \_raw

> `readonly` **\_raw**: `any`

Defined in: [core/src/measure/FontEngine.ts:22](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontEngine.ts#L22)

fontkit font object (private — not meant for direct access)

***

### ascent

> `readonly` **ascent**: `number`

Defined in: [core/src/measure/FontEngine.ts:25](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontEngine.ts#L25)

***

### capHeight

> `readonly` **capHeight**: `number`

Defined in: [core/src/measure/FontEngine.ts:27](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontEngine.ts#L27)

***

### descent

> `readonly` **descent**: `number`

Defined in: [core/src/measure/FontEngine.ts:26](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontEngine.ts#L26)

***

### unitsPerEm

> `readonly` **unitsPerEm**: `number`

Defined in: [core/src/measure/FontEngine.ts:24](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontEngine.ts#L24)

Cached values extracted once after creation

***

### winAscent

> `readonly` **winAscent**: `number` \| `null`

Defined in: [core/src/measure/FontEngine.ts:28](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontEngine.ts#L28)

***

### winDescent

> `readonly` **winDescent**: `number` \| `null`

Defined in: [core/src/measure/FontEngine.ts:29](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontEngine.ts#L29)
