[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / TableLayoutOptions

# Interface: TableLayoutOptions

Defined in: [core/src/layout/TableLayoutEngine.ts:146](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TableLayoutEngine.ts#L146)

## Properties

### \_depth?

> `optional` **\_depth?**: `number`

Defined in: [core/src/layout/TableLayoutEngine.ts:162](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TableLayoutEngine.ts#L162)

**`Internal`**

Internal nested-table recursion counter — do not set this yourself.
`layoutTableFrame` increments it on every recursive call (a `TableCell`
whose `content` is itself a `TableFrame`) and throws past 50 levels.

***

### mode?

> `optional` **mode?**: `"browser"` \| `"office"`

Defined in: [core/src/layout/TableLayoutEngine.ts:147](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TableLayoutEngine.ts#L147)

***

### onMissingFont?

> `optional` **onMissingFont?**: `"throw"` \| `"substitute"`

Defined in: [core/src/layout/TableLayoutEngine.ts:155](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TableLayoutEngine.ts#L155)

What to do when a cell's `fontFamily` isn't registered — forwarded to
every cell's own `layoutTextFrame` call. `'throw'` (default) raises
`FontNotFoundError`; `'substitute'` uses any registered family and folds
the cell's own warnings into the table's (none surfaced directly here —
a caller wanting them should lay out a cell's `TextFrame` itself).
