[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / FontNotFoundError

# Class: FontNotFoundError

Defined in: [core/src/measure/FontNotFoundError.ts:4](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontNotFoundError.ts#L4)

FontNotFoundError.ts — thrown when a requested font is not registered.

## Extends

- `Error`

## Constructors

### Constructor

> **new FontNotFoundError**(`family`, `weight?`, `style?`): `FontNotFoundError`

Defined in: [core/src/measure/FontNotFoundError.ts:5](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontNotFoundError.ts#L5)

#### Parameters

##### family

`string`

##### weight?

`string` = `'normal'`

##### style?

`string` = `'normal'`

#### Returns

`FontNotFoundError`

#### Overrides

`Error.constructor`
