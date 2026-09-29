[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / Line

# Interface: Line

Defined in: [core/src/types/LayoutTypes.ts:100](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L100)

## Properties

### alignment?

> `optional` **alignment?**: [`TextAlignment`](../type-aliases/TextAlignment.md)

Defined in: [core/src/types/LayoutTypes.ts:130](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L130)

Paragraph alignment (optional, for PowerPoint render)

***

### ascent

> **ascent**: `number`

Defined in: [core/src/types/LayoutTypes.ts:120](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L120)

Maximum ascent in line

***

### baseline

> **baseline**: `number`

Defined in: [core/src/types/LayoutTypes.ts:118](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L118)

Baseline offset from y

***

### columnIndex?

> `optional` **columnIndex?**: `number`

Defined in: [core/src/types/LayoutTypes.ts:133](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L133)

Column index (0-based) when frame has multi-column layout.

***

### descent

> **descent**: `number`

Defined in: [core/src/types/LayoutTypes.ts:122](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L122)

Maximum descent in line

***

### endIndex

> **endIndex**: `number`

Defined in: [core/src/types/LayoutTypes.ts:127](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L127)

Index of last character + 1 (for convenient length calculation)

***

### height

> **height**: `number`

Defined in: [core/src/types/LayoutTypes.ts:115](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L115)

Full line height (max spans × lineHeight)

***

### isHardBreak?

> `optional` **isHardBreak?**: `boolean`

Defined in: [core/src/types/LayoutTypes.ts:143](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L143)

True when this line was created by a forced hard break (\n),
as opposed to a soft wrap from line width exceeding maxWidth.

Used by the editor to distinguish user-inserted line breaks
from automatic wrapping (affects Home/End, arrow up/down,
Backspace merging behaviour).

***

### leftRule?

> `optional` **leftRule?**: `object`

Defined in: [core/src/types/LayoutTypes.ts:165](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L165)

Set when this line belongs to a paragraph with
[ParagraphStyle.leftRule](ParagraphStyle.md#leftrule) (e.g. `<blockquote>`). The renderer
paints a `width`-px vertical bar at absolute x `x`, spanning
`y`…`y + height`. `x` is the paragraph's *un-indented* left edge (i.e.
`line.x - style.leftIndent`), the same for every line of the paragraph
regardless of that line's own `line.x` — so the segments line up into
one straight bar. Stamped on every line of the paragraph, not just the
first: adjacent lines' segments sit flush (line N's `y + height` ==
line N+1's `y`), so they read as one continuous bar without the layout
engine tracking the paragraph's overall bounding box.

#### color

> **color**: `string`

#### width

> **width**: `number`

#### x

> **x**: `number`

***

### rule?

> `optional` **rule?**: `object`

Defined in: [core/src/types/LayoutTypes.ts:151](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L151)

Set when this line **is** a horizontal rule (`<hr>` — see
[Paragraph.rule](Paragraph.md#rule)) rather than text: `spans` is empty and the
renderer paints a `height`-px-tall bar across `x`…`x + width` instead of
glyphs.

#### color

> **color**: `string`

***

### spans

> **spans**: [`Span`](Span.md)[]

Defined in: [core/src/types/LayoutTypes.ts:167](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L167)

***

### startIndex

> **startIndex**: `number`

Defined in: [core/src/types/LayoutTypes.ts:125](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L125)

Index of first character in the original paragraph text

***

### width

> **width**: `number`

Defined in: [core/src/types/LayoutTypes.ts:112](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L112)

Line box width covering all spans (text + outside markers).
Equals max(span.x + span.width) − min(span.x).

***

### x

> **x**: `number`

Defined in: [core/src/types/LayoutTypes.ts:105](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L105)

Absolute X of the line box left edge within the container.
Includes outside list markers when present (marker may sit left of text).

***

### y

> **y**: `number`

Defined in: [core/src/types/LayoutTypes.ts:107](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L107)

Absolute Y of line top edge
