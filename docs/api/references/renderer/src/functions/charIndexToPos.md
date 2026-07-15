[vyaz-monorepo](../../../index.md) / [renderer/src](../index.md) / charIndexToPos

# Function: charIndexToPos()

> **charIndexToPos**(`lines`, `charIndex`): [`CharPos`](../interfaces/CharPos.md) \| `null`

Defined in: [renderer/src/interactive.ts:214](https://github.com/sedrew/vyaz/blob/main/packages/renderer/src/interactive.ts#L214)

Convert a global character index (startIndex / endIndex from Line)
to a `CharPos`.

Useful for mapping cursor/selection from a text model to layout position.

Returns `null` if the index is out of range.

## Parameters

### lines

`Line`[]

### charIndex

`number`

## Returns

[`CharPos`](../interfaces/CharPos.md) \| `null`
