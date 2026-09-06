[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / TableFrame

# Interface: TableFrame

Defined in: [core/src/types/TableTypes.ts:190](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/TableTypes.ts#L190)

Root table container — sibling of `TextFrame`.

Column widths are measured from cell content (each cell's natural,
unwrapped width) unless `columnWidths` is given; row heights are measured
from the laid-out cell content unless `rowHeights` is given.

## Properties

### columnWidths?

> `optional` **columnWidths?**: `number`[]

Defined in: [core/src/types/TableTypes.ts:209](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/TableTypes.ts#L209)

Explicit per-column width override, in px. Overrides measurement.

***

### defaultCellStyle?

> `optional` **defaultCellStyle?**: `Partial`\<[`TableCellStyle`](TableCellStyle.md)\>

Defined in: [core/src/types/TableTypes.ts:214](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/TableTypes.ts#L214)

Default style merged under every `TableCell.style`.

***

### defaultRowStyle?

> `optional` **defaultRowStyle?**: `Partial`\<[`TableRowStyle`](TableRowStyle.md)\>

Defined in: [core/src/types/TableTypes.ts:216](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/TableTypes.ts#L216)

Default style merged under every `TableRow.style`.

***

### height?

> `optional` **height?**: `number`

Defined in: [core/src/types/TableTypes.ts:207](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/TableTypes.ts#L207)

Total table height in px. When set, row heights (whichever way they
were determined — measured or `rowHeights` below) scale proportionally
to fit it: taller gives every row extra room; shorter shrinks them,
which (unlike `width`) can't be absorbed by reflowing text — content
simply overflows its row past a certain point (see `TableCellStyle.
allowOverflow`). Auto (sum of row heights) when absent.

***

### rowHeights?

> `optional` **rowHeights?**: `number`[]

Defined in: [core/src/types/TableTypes.ts:211](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/TableTypes.ts#L211)

Explicit per-row height override, in px. Overrides measurement.

***

### rows

> **rows**: [`TableRow`](TableRow.md)[]

Defined in: [core/src/types/TableTypes.ts:191](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/TableTypes.ts#L191)

***

### style?

> `optional` **style?**: `Partial`\<[`TableStyle`](TableStyle.md)\>

Defined in: [core/src/types/TableTypes.ts:212](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/TableTypes.ts#L212)

***

### width?

> `optional` **width?**: `number`

Defined in: [core/src/types/TableTypes.ts:198](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/TableTypes.ts#L198)

Total table width in px. When set and narrower than the natural column
widths, columns shrink proportionally and cell text wraps; when wider,
the extra space is distributed across columns. Auto (sum of natural
column widths) when absent.
