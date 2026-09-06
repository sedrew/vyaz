[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / TableLayoutResult

# Interface: TableLayoutResult

Defined in: [core/src/layout/TableLayoutEngine.ts:129](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TableLayoutEngine.ts#L129)

## Properties

### bgColor?

> `optional` **bgColor?**: `string`

Defined in: [core/src/layout/TableLayoutEngine.ts:134](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TableLayoutEngine.ts#L134)

***

### border?

> `optional` **border?**: [`ResolvedBorder`](ResolvedBorder.md)

Defined in: [core/src/layout/TableLayoutEngine.ts:136](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TableLayoutEngine.ts#L136)

The table's own outer border (`TableStyle`), distinct from row/cell borders.

***

### contentBox

> **contentBox**: `object`

Defined in: [core/src/layout/TableLayoutEngine.ts:142](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TableLayoutEngine.ts#L142)

The border-box — the outer box with `TableStyle.margins` excluded. Rows
span its full width; `border` (above) is drawn at this box. A renderer
uses it directly instead of re-deriving margins from row/cell positions.

#### height

> **height**: `number`

#### width

> **width**: `number`

#### x

> **x**: `number`

#### y

> **y**: `number`

***

### height

> **height**: `number`

Defined in: [core/src/layout/TableLayoutEngine.ts:133](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TableLayoutEngine.ts#L133)

Full outer box height, margins included.

***

### rows

> **rows**: [`TableRowLayoutResult`](TableRowLayoutResult.md)[]

Defined in: [core/src/layout/TableLayoutEngine.ts:143](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TableLayoutEngine.ts#L143)

***

### width

> **width**: `number`

Defined in: [core/src/layout/TableLayoutEngine.ts:131](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TableLayoutEngine.ts#L131)

Full outer box width, margins included.
