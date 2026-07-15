[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / Line

# Interface: Line

Defined in: [core/src/types/LayoutTypes.ts:83](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L83)

## Properties

### alignment?

> `optional` **alignment?**: [`TextAlignment`](../type-aliases/TextAlignment.md)

Defined in: [core/src/types/LayoutTypes.ts:113](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L113)

Paragraph alignment (optional, for PowerPoint render)

***

### ascent

> **ascent**: `number`

Defined in: [core/src/types/LayoutTypes.ts:103](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L103)

Maximum ascent in line

***

### baseline

> **baseline**: `number`

Defined in: [core/src/types/LayoutTypes.ts:101](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L101)

Baseline offset from y

***

### columnIndex?

> `optional` **columnIndex?**: `number`

Defined in: [core/src/types/LayoutTypes.ts:116](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L116)

Column index (0-based) when frame has multi-column layout.

***

### descent

> **descent**: `number`

Defined in: [core/src/types/LayoutTypes.ts:105](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L105)

Maximum descent in line

***

### endIndex

> **endIndex**: `number`

Defined in: [core/src/types/LayoutTypes.ts:110](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L110)

Index of last character + 1 (for convenient length calculation)

***

### height

> **height**: `number`

Defined in: [core/src/types/LayoutTypes.ts:98](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L98)

Full line height (max spans × lineHeight)

***

### spans

> **spans**: [`Span`](Span.md)[]

Defined in: [core/src/types/LayoutTypes.ts:118](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L118)

***

### startIndex

> **startIndex**: `number`

Defined in: [core/src/types/LayoutTypes.ts:108](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L108)

Index of first character in the original paragraph text

***

### width

> **width**: `number`

Defined in: [core/src/types/LayoutTypes.ts:95](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L95)

Line box width covering all spans (text + outside markers).
Equals max(span.x + span.width) − min(span.x).

***

### x

> **x**: `number`

Defined in: [core/src/types/LayoutTypes.ts:88](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L88)

Absolute X of the line box left edge within the container.
Includes outside list markers when present (marker may sit left of text).

***

### y

> **y**: `number`

Defined in: [core/src/types/LayoutTypes.ts:90](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L90)

Absolute Y of line top edge
