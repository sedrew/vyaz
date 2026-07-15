[vyaz-monorepo](../../../index.md) / [renderer/src](../index.md) / charAtPoint

# Function: charAtPoint()

> **charAtPoint**(`lines`, `px`, `py`): [`CharPos`](../interfaces/CharPos.md) \| `null`

Defined in: [renderer/src/interactive.ts:129](https://github.com/sedrew/vyaz/blob/main/packages/renderer/src/interactive.ts#L129)

Find the character position nearest to the given pixel coordinates.

Uses a two-pass approach:
1. Find the nearest line by Y distance (closest baseline).
2. Within that line, find the nearest character by X distance
   (using glyph advances or fallback uniform widths).

Returns `null` if `lines` is empty.

## Parameters

### lines

`Line`[]

### px

`number`

### py

`number`

## Returns

[`CharPos`](../interfaces/CharPos.md) \| `null`
