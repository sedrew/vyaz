[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / formatListNumber

# Function: formatListNumber()

> **formatListNumber**(`n`, `format`): `string`

Defined in: [core/src/utils/list.ts:54](https://github.com/sedrew/vyaz/blob/main/packages/core/src/utils/list.ts#L54)

Format a number according to the given numbering format.

Supports the same formats as CSS `list-style-type`:
- `decimal`: 1, 2, 3, …
- `upper-roman`: I, II, III, …
- `lower-roman`: i, ii, iii, …
- `upper-alpha`: A, B, C, …
- `lower-alpha`: a, b, c, …

Follows CSS Counter Styles Level 3 algorithms.
Roman numerals support the range 1–3999.

## Parameters

### n

`number`

### format

[`NumberFormat`](../type-aliases/NumberFormat.md)

## Returns

`string`

## See

[CSS Counter Styles Level 3](https://www.w3.org/TR/css-counter-styles-3/)
