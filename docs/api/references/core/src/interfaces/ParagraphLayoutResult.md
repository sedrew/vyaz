[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / ParagraphLayoutResult

# Interface: ParagraphLayoutResult

Defined in: [core/src/types/LayoutTypes.ts:172](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L172)

## Properties

### contentHeight

> **contentHeight**: `number`

Defined in: [core/src/types/LayoutTypes.ts:179](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L179)

Actual content height (text bbox)

***

### contentWidth

> **contentWidth**: `number`

Defined in: [core/src/types/LayoutTypes.ts:177](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L177)

Actual content width (text bbox, without voids)

***

### height

> **height**: `number`

Defined in: [core/src/types/LayoutTypes.ts:174](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L174)

***

### lines

> **lines**: [`Line`](Line.md)[]

Defined in: [core/src/types/LayoutTypes.ts:175](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L175)

***

### warnings?

> `optional` **warnings?**: [`LayoutWarning`](LayoutWarning.md)[]

Defined in: [core/src/types/LayoutTypes.ts:181](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L181)

Non-fatal issues (e.g. font fallback/substitution).

***

### width

> **width**: `number`

Defined in: [core/src/types/LayoutTypes.ts:173](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L173)
