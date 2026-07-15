[vyaz-monorepo](../../../index.md) / [renderer/src](../index.md) / posToCharIndex

# Function: posToCharIndex()

> **posToCharIndex**(`lines`, `pos`): `number`

Defined in: [renderer/src/interactive.ts:264](https://github.com/sedrew/vyaz/blob/main/packages/renderer/src/interactive.ts#L264)

Compute the global character index from a CharPos.

This walks all preceding lines/spans/characters to compute
the absolute index in the full text.

## Parameters

### lines

`Line`[]

### pos

[`CharPos`](../interfaces/CharPos.md)

## Returns

`number`
