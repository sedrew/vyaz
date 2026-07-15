[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / positionLines

# Function: positionLines()

> **positionLines**(`pretextLines`, `items`, `fontMetricsFn`, `style`, `maxWidth`, `startY?`, `mode?`, `measureText`, `tag?`, `listStyle?`, `listIndex?`, `listMarkerWidth?`): `object`

Defined in: [core/src/layout/PositioningEngine.ts:108](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/PositioningEngine.ts#L108)

Build Line[] from pretext lines with alignment and metrics.

## Parameters

### pretextLines

`PretextLine`[]

— pretext result (materializeRichInlineLineRange)

### items

[`PreparedRichInlineItem`](../interfaces/PreparedRichInlineItem.md)[]

— original PreparedRichInlineItem[] (for metadata)

### fontMetricsFn

(`item`) => [`FontMetrics`](../interfaces/FontMetrics.md)

— function to get font metrics for a span

### style

[`ParagraphStyle`](../interfaces/ParagraphStyle.md)

— paragraph style

### maxWidth

`number`

— available container width

### startY?

`number` = `0`

— initial Y position

### mode?

`"browser"` \| `"office"`

— metric mode ('browser' | 'office'), affects line height calculation

### measureText

(`text`, `fontSize`, `fontFamily?`, `fontWeight?`, `fontStyle?`) => `number`

— function to measure text width accurately via fontkit.
  The function accepts (text, fontSize, fontFamily, fontWeight, fontStyle)
  and returns width in px. Throws FontNotFoundError if font not registered.

### tag?

`string`

— optional tag for debugging

### listStyle?

[`ListStyle`](../interfaces/ListStyle.md)

— optional list configuration (bullet / numbered)

### listIndex?

`number`

— current index in the list (for numbered lists). 1-based.

### listMarkerWidth?

`number`

— pre-computed width of the widest marker in the list group.
  When provided, bulletIndent is expanded to this value if needed.

## Returns

`object`

### contentWidth

> **contentWidth**: `number`

### lines

> **lines**: [`Line`](../interfaces/Line.md)[]
