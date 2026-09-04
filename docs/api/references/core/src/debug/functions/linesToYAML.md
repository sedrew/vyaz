[vyaz-monorepo](../../../../index.md) / [core/src/debug](../index.md) / linesToYAML

# Function: linesToYAML()

> **linesToYAML**(`lines`, `paragraphWidth`, `paragraphHeight`): `string`

Defined in: [core/src/debug/lines-to-yaml.ts:24](https://github.com/sedrew/vyaz/blob/main/packages/core/src/debug/lines-to-yaml.ts#L24)

Convert Line[] to YAML string for snapshots.
Only semantic data: text, x, width, style.
No glyphAdvances, fontMetrics (noise), inlineWidget.

## Parameters

### lines

[`Line`](../../interfaces/Line.md)[]

### paragraphWidth

`number`

### paragraphHeight

`number`

## Returns

`string`
