[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / TableCellLayoutResult

# Interface: TableCellLayoutResult

Defined in: [core/src/layout/TableLayoutEngine.ts:71](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TableLayoutEngine.ts#L71)

## Properties

### after?

> `optional` **after?**: `object`

Defined in: [core/src/layout/TableLayoutEngine.ts:113](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TableLayoutEngine.ts#L113)

#### content

> **content**: [`TextFrameLayoutResult`](TextFrameLayoutResult.md)

#### x

> **x**: `number`

#### y

> **y**: `number`

#### See

before — from `TableCell.after`, right-anchored instead.

***

### allowOverflow

> **allowOverflow**: `boolean`

Defined in: [core/src/layout/TableLayoutEngine.ts:89](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TableLayoutEngine.ts#L89)

`TableCellStyle.allowOverflow` — let content paint past the cell's padding box. Default `false`.

***

### before?

> `optional` **before?**: `object`

Defined in: [core/src/layout/TableLayoutEngine.ts:111](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TableLayoutEngine.ts#L111)

`TableCell.before`, laid out unwrapped at its own natural size and
positioned absolute-within-the-table, already vertically centered.
Absent when the cell has no `before`.

#### content

> **content**: [`TextFrameLayoutResult`](TextFrameLayoutResult.md)

#### x

> **x**: `number`

#### y

> **y**: `number`

***

### bgColor?

> `optional` **bgColor?**: `string`

Defined in: [core/src/layout/TableLayoutEngine.ts:90](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TableLayoutEngine.ts#L90)

***

### border?

> `optional` **border?**: [`ResolvedBorder`](ResolvedBorder.md)

Defined in: [core/src/layout/TableLayoutEngine.ts:91](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TableLayoutEngine.ts#L91)

***

### colSpan

> **colSpan**: `number`

Defined in: [core/src/layout/TableLayoutEngine.ts:115](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TableLayoutEngine.ts#L115)

Columns this cell occupies (>1 for `colSpan`).

***

### content

> **content**: [`TextFrameLayoutResult`](TextFrameLayoutResult.md)

Defined in: [core/src/layout/TableLayoutEngine.ts:98](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TableLayoutEngine.ts#L98)

The cell's laid-out content — same shape a lone `TextFrame` produces.
When `TableCell.content` was a `TableFrame` (see `nestedTable`), this is
a zero-line placeholder sized to match it — a renderer should check
`nestedTable` first and use that instead of painting `content` as text.

***

### cx

> **cx**: `number`

Defined in: [core/src/layout/TableLayoutEngine.ts:85](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TableLayoutEngine.ts#L85)

`TableCellStyle.cx`/`cy` — an additional px nudge on top of padding/alignment. Default `0`.

***

### cy

> **cy**: `number`

Defined in: [core/src/layout/TableLayoutEngine.ts:87](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TableLayoutEngine.ts#L87)

#### See

cx

***

### height

> **height**: `number`

Defined in: [core/src/layout/TableLayoutEngine.ts:79](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TableLayoutEngine.ts#L79)

Full box height — sums every spanned row + the gaps between them.

***

### nestedTable?

> `optional` **nestedTable?**: [`TableLayoutResult`](TableLayoutResult.md)

Defined in: [core/src/layout/TableLayoutEngine.ts:105](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TableLayoutEngine.ts#L105)

Present when `TableCell.content` was a `TableFrame` — a table nested
inside this cell, already laid out at the cell's own content width.
`content` (above) is a same-sized placeholder in this case, not real
text — paint this instead.

***

### padding

> **padding**: `object`

Defined in: [core/src/layout/TableLayoutEngine.ts:81](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TableLayoutEngine.ts#L81)

Resolved padding box (inside the border, if any).

#### bottom

> **bottom**: `number`

#### left

> **left**: `number`

#### right

> **right**: `number`

#### top

> **top**: `number`

***

### rowSpan

> **rowSpan**: `number`

Defined in: [core/src/layout/TableLayoutEngine.ts:117](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TableLayoutEngine.ts#L117)

Rows this cell occupies (>1 for `rowSpan`).

***

### verticalOffset

> **verticalOffset**: `number`

Defined in: [core/src/layout/TableLayoutEngine.ts:83](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TableLayoutEngine.ts#L83)

Extra Y offset inside the padding box from `verticalAlign` (0 for `'top'`).

***

### width

> **width**: `number`

Defined in: [core/src/layout/TableLayoutEngine.ts:77](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TableLayoutEngine.ts#L77)

Full box width — sums every spanned column + the gaps between them.

***

### x

> **x**: `number`

Defined in: [core/src/layout/TableLayoutEngine.ts:73](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TableLayoutEngine.ts#L73)

Absolute X of the cell box (border-box) within the table.

***

### y

> **y**: `number`

Defined in: [core/src/layout/TableLayoutEngine.ts:75](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TableLayoutEngine.ts#L75)

Absolute Y of the cell box within the table.
