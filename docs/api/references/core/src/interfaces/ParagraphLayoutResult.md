[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / ParagraphLayoutResult

# Interface: ParagraphLayoutResult

Defined in: [core/src/types/LayoutTypes.ts:133](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L133)

## Properties

### contentHeight

> **contentHeight**: `number`

Defined in: [core/src/types/LayoutTypes.ts:140](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L140)

Actual content height (text bbox)

***

### contentWidth

> **contentWidth**: `number`

Defined in: [core/src/types/LayoutTypes.ts:138](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L138)

Actual content width (text bbox, without voids)

***

### height

> **height**: `number`

Defined in: [core/src/types/LayoutTypes.ts:135](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L135)

***

### lines

> **lines**: [`Line`](Line.md)[]

Defined in: [core/src/types/LayoutTypes.ts:136](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L136)

***

### warnings?

> `optional` **warnings?**: [`LayoutWarning`](LayoutWarning.md)[]

Defined in: [core/src/types/LayoutTypes.ts:142](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L142)

Non-fatal issues (e.g. font fallback/substitution).

***

### width

> **width**: `number`

Defined in: [core/src/types/LayoutTypes.ts:134](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L134)
