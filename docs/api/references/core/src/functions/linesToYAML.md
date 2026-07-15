[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / linesToYAML

# Function: linesToYAML()

> **linesToYAML**(`lines`, `paragraphWidth`, `paragraphHeight`): `string`

Defined in: [core/src/layout/LineBoxValidator.ts:133](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/LineBoxValidator.ts#L133)

Convert Line[] to YAML string for snapshots.
Only semantic data: text, x, width, style.
No glyphAdvances, fontMetrics (noise), inlineWidget.

## Parameters

### lines

[`Line`](../interfaces/Line.md)[]

### paragraphWidth

`number`

### paragraphHeight

`number`

## Returns

`string`
