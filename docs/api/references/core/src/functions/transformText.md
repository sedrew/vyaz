[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / transformText

# Function: transformText()

> **transformText**(`text`, `transform?`): `string`

Defined in: [core/src/utils/textTransform.ts:34](https://github.com/sedrew/vyaz/blob/main/packages/core/src/utils/textTransform.ts#L34)

Apply text-transform to a string.

## Parameters

### text

`string`

— input text

### transform?

[`TextTransform`](../type-aliases/TextTransform.md)

— transform type ('none' | 'uppercase' | 'lowercase' | 'capitalize')

## Returns

`string`

transformed text

## Example

```ts
transformText("hello world", 'uppercase')  // → "HELLO WORLD"
transformText("HELLO", 'lowercase')         // → "hello"
transformText("don't stop", 'capitalize')   // → "Don't Stop"
```
