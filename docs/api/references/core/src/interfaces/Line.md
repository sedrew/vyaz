[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / Line

# Interface: Line

Defined in: [core/src/types/LayoutTypes.ts:92](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L92)

## Properties

### alignment?

> `optional` **alignment?**: [`TextAlignment`](../type-aliases/TextAlignment.md)

Defined in: [core/src/types/LayoutTypes.ts:122](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L122)

Paragraph alignment (optional, for PowerPoint render)

***

### ascent

> **ascent**: `number`

Defined in: [core/src/types/LayoutTypes.ts:112](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L112)

Maximum ascent in line

***

### baseline

> **baseline**: `number`

Defined in: [core/src/types/LayoutTypes.ts:110](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L110)

Baseline offset from y

***

### columnIndex?

> `optional` **columnIndex?**: `number`

Defined in: [core/src/types/LayoutTypes.ts:125](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L125)

Column index (0-based) when frame has multi-column layout.

***

### descent

> **descent**: `number`

Defined in: [core/src/types/LayoutTypes.ts:114](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L114)

Maximum descent in line

***

### endIndex

> **endIndex**: `number`

Defined in: [core/src/types/LayoutTypes.ts:119](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L119)

Index of last character + 1 (for convenient length calculation)

***

### height

> **height**: `number`

Defined in: [core/src/types/LayoutTypes.ts:107](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L107)

Full line height (max spans × lineHeight)

***

### isHardBreak?

> `optional` **isHardBreak?**: `boolean`

Defined in: [core/src/types/LayoutTypes.ts:135](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L135)

True when this line was created by a forced hard break (\n),
as opposed to a soft wrap from line width exceeding maxWidth.

Used by the editor to distinguish user-inserted line breaks
from automatic wrapping (affects Home/End, arrow up/down,
Backspace merging behaviour).

***

### spans

> **spans**: [`Span`](Span.md)[]

Defined in: [core/src/types/LayoutTypes.ts:137](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L137)

***

### startIndex

> **startIndex**: `number`

Defined in: [core/src/types/LayoutTypes.ts:117](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L117)

Index of first character in the original paragraph text

***

### width

> **width**: `number`

Defined in: [core/src/types/LayoutTypes.ts:104](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L104)

Line box width covering all spans (text + outside markers).
Equals max(span.x + span.width) − min(span.x).

***

### x

> **x**: `number`

Defined in: [core/src/types/LayoutTypes.ts:97](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L97)

Absolute X of the line box left edge within the container.
Includes outside list markers when present (marker may sit left of text).

***

### y

> **y**: `number`

Defined in: [core/src/types/LayoutTypes.ts:99](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L99)

Absolute Y of line top edge
