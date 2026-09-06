[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / TableRowLayoutResult

# Interface: TableRowLayoutResult

Defined in: [core/src/layout/TableLayoutEngine.ts:120](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TableLayoutEngine.ts#L120)

## Properties

### bgColor?

> `optional` **bgColor?**: `string`

Defined in: [core/src/layout/TableLayoutEngine.ts:123](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TableLayoutEngine.ts#L123)

***

### border?

> `optional` **border?**: [`ResolvedBorder`](ResolvedBorder.md)

Defined in: [core/src/layout/TableLayoutEngine.ts:124](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TableLayoutEngine.ts#L124)

***

### cells

> **cells**: [`TableCellLayoutResult`](TableCellLayoutResult.md)[]

Defined in: [core/src/layout/TableLayoutEngine.ts:126](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TableLayoutEngine.ts#L126)

Only cells that *start* in this row (a rowSpan cell from above is not repeated here).

***

### height

> **height**: `number`

Defined in: [core/src/layout/TableLayoutEngine.ts:122](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TableLayoutEngine.ts#L122)

***

### y

> **y**: `number`

Defined in: [core/src/layout/TableLayoutEngine.ts:121](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TableLayoutEngine.ts#L121)
