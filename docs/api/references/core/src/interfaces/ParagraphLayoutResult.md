[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / ParagraphLayoutResult

# Interface: ParagraphLayoutResult

Defined in: [core/src/types/LayoutTypes.ts:220](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L220)

## Properties

### contentHeight

> **contentHeight**: `number`

Defined in: [core/src/types/LayoutTypes.ts:227](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L227)

Actual content height (text bbox)

***

### contentWidth

> **contentWidth**: `number`

Defined in: [core/src/types/LayoutTypes.ts:225](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L225)

Actual content width (text bbox, without voids)

***

### height

> **height**: `number`

Defined in: [core/src/types/LayoutTypes.ts:222](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L222)

***

### lines

> **lines**: [`Line`](Line.md)[]

Defined in: [core/src/types/LayoutTypes.ts:223](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L223)

***

### warnings?

> `optional` **warnings?**: [`LayoutWarning`](LayoutWarning.md)[]

Defined in: [core/src/types/LayoutTypes.ts:229](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L229)

Non-fatal issues (e.g. font fallback/substitution).

***

### width

> **width**: `number`

Defined in: [core/src/types/LayoutTypes.ts:221](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L221)
