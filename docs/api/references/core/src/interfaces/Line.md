[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / Line

# Interface: Line

Defined in: [core/src/types/LayoutTypes.ts:112](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L112)

## Properties

### alignment?

> `optional` **alignment?**: [`TextAlignment`](../type-aliases/TextAlignment.md)

Defined in: [core/src/types/LayoutTypes.ts:166](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L166)

Paragraph alignment (optional, for PowerPoint render)

***

### ascent

> **ascent**: `number`

Defined in: [core/src/types/LayoutTypes.ts:132](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L132)

Maximum ascent in line

***

### baseline

> **baseline**: `number`

Defined in: [core/src/types/LayoutTypes.ts:130](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L130)

Baseline offset from y

***

### columnIndex?

> `optional` **columnIndex?**: `number`

Defined in: [core/src/types/LayoutTypes.ts:169](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L169)

Column index (0-based) when frame has multi-column layout.

***

### decorations?

> `optional` **decorations?**: [`LineDecoration`](LineDecoration.md)[]

Defined in: [core/src/types/LayoutTypes.ts:163](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L163)

Underline / strikethrough rules for this line, when the layout mode
defines their geometry (`mode: 'office'`, PowerPoint's model). `x` is in
span coordinates (the same space as `Span.x`), `y` is the rule's **top
edge** relative to the line top (like `baseline`). Renderers paint these
instead of their own decoration lines when present.

***

### descent

> **descent**: `number`

Defined in: [core/src/types/LayoutTypes.ts:134](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L134)

Maximum descent in line

***

### endIndex

> **endIndex**: `number`

Defined in: [core/src/types/LayoutTypes.ts:148](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L148)

End of the line in the source text (exclusive). Covers the whitespace the
line swallowed at its end and, for a line ended by `\n`, the `\n`
itself; the last line of a paragraph ends at its text length.

***

### height

> **height**: `number`

Defined in: [core/src/types/LayoutTypes.ts:127](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L127)

Full line height (max spans × lineHeight)

***

### isHardBreak?

> `optional` **isHardBreak?**: `boolean`

Defined in: [core/src/types/LayoutTypes.ts:179](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L179)

True when this line was created by a forced hard break (\n),
as opposed to a soft wrap from line width exceeding maxWidth.

Used by the editor to distinguish user-inserted line breaks
from automatic wrapping (affects Home/End, arrow up/down,
Backspace merging behaviour).

***

### leftRule?

> `optional` **leftRule?**: `object`

Defined in: [core/src/types/LayoutTypes.ts:201](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L201)

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

### pIdx?

> `optional` **pIdx?**: `number`

Defined in: [core/src/types/LayoutTypes.ts:154](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L154)

Index of the source paragraph in `TextFrame.paragraphs[]` — on every
line, including empty ones that carry no spans. Set by `layoutTextFrame`.

***

### rule?

> `optional` **rule?**: `object`

Defined in: [core/src/types/LayoutTypes.ts:187](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L187)

Set when this line **is** a horizontal rule (`<hr>` — see
[Paragraph.rule](Paragraph.md#rule)) rather than text: `spans` is empty and the
renderer paints a `height`-px-tall bar across `x`…`x + width` instead of
glyphs.

#### color

> **color**: `string`

***

### spans

> **spans**: [`Span`](Span.md)[]

Defined in: [core/src/types/LayoutTypes.ts:203](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L203)

***

### startIndex

> **startIndex**: `number`

Defined in: [core/src/types/LayoutTypes.ts:142](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L142)

Index of the line's first character in the paragraph's source text (its
`children` texts joined, `\n` included), before whitespace collapsing.
Lines tile the paragraph: each starts where the previous one ended, the
first at 0.

***

### width

> **width**: `number`

Defined in: [core/src/types/LayoutTypes.ts:124](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L124)

Line box width covering all spans (text + outside markers).
Equals max(span.x + span.width) − min(span.x).

***

### x

> **x**: `number`

Defined in: [core/src/types/LayoutTypes.ts:117](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L117)

Absolute X of the line box left edge within the container.
Includes outside list markers when present (marker may sit left of text).

***

### y

> **y**: `number`

Defined in: [core/src/types/LayoutTypes.ts:119](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L119)

Absolute Y of line top edge
