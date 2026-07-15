[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / FontMetrics

# Interface: FontMetrics

Defined in: [core/src/types/FontTypes.ts:12](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/FontTypes.ts#L12)

Physical font metrics (in pixels for a given fontSize)

## Properties

### ascent

> **ascent**: `number`

Defined in: [core/src/types/FontTypes.ts:14](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/FontTypes.ts#L14)

Rise above baseline

***

### capHeight

> **capHeight**: `number`

Defined in: [core/src/types/FontTypes.ts:18](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/FontTypes.ts#L18)

Cap height

***

### descent

> **descent**: `number`

Defined in: [core/src/types/FontTypes.ts:16](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/FontTypes.ts#L16)

Descent below baseline (positive number!)

***

### sourceTable?

> `optional` **sourceTable?**: `"hhea"` \| `"OS/2"` \| `"canvas"` \| `"fallback"`

Defined in: [core/src/types/FontTypes.ts:28](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/FontTypes.ts#L28)

Which font table was used for ascent/descent:
  'hhea'  — hhea.ascender/descender (browser mode)
  'OS/2'  — OS/2.usWinAscent/usWinDescent (Office mode)
  'canvas' — canvas.measureText (browser fallback)
  'fallback' — empirical formula

***

### unitsPerEm

> **unitsPerEm**: `number`

Defined in: [core/src/types/FontTypes.ts:20](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/FontTypes.ts#L20)

Original font UPM (for reference)
