[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / ParagraphLayoutResult

# Interface: ParagraphLayoutResult

Defined in: [core/src/types/LayoutTypes.ts:142](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L142)

## Properties

### contentHeight

> **contentHeight**: `number`

Defined in: [core/src/types/LayoutTypes.ts:149](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L149)

Actual content height (text bbox)

***

### contentWidth

> **contentWidth**: `number`

Defined in: [core/src/types/LayoutTypes.ts:147](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L147)

Actual content width (text bbox, without voids)

***

### height

> **height**: `number`

Defined in: [core/src/types/LayoutTypes.ts:144](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L144)

***

### lines

> **lines**: [`Line`](Line.md)[]

Defined in: [core/src/types/LayoutTypes.ts:145](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L145)

***

### warnings?

> `optional` **warnings?**: [`LayoutWarning`](LayoutWarning.md)[]

Defined in: [core/src/types/LayoutTypes.ts:151](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L151)

Non-fatal issues (e.g. font fallback/substitution).

***

### width

> **width**: `number`

Defined in: [core/src/types/LayoutTypes.ts:143](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L143)
