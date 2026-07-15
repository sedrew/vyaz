[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / TextFrame

# Interface: TextFrame

Defined in: [core/src/types/Document.ts:564](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L564)

Root text container — a text box on a canvas.

This replaces the earlier `RichTextDocument`.
It holds geometry, text flow settings, and the paragraph array.

**Wrap & Autofit interaction:**
- When `wrap` is `true`, the layout engine breaks lines at `width`.
- When `autofit.enabled` is `true`, the engine shrinks the font
  proportionally to fit the text inside `width` × `height`.

## Example

```ts
{
  width: 600,
  height: 400,
  wrap: true,
  autofit: { enabled: true, minFontSize: 10, maxFontSize: 24 },
  writingMode: "horizontal-tb",
  verticalAlignment: "top",
  paragraphs: [ /* ... */ ]
}
```

## Properties

### autofit?

> `optional` **autofit?**: [`AutofitConfig`](AutofitConfig.md)

Defined in: [core/src/types/Document.ts:586](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L586)

Autofit (auto font-size reduction) configuration.

***

### columns?

> `optional` **columns?**: [`MultiColumnConfig`](MultiColumnConfig.md)

Defined in: [core/src/types/Document.ts:633](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L633)

Multi-column layout configuration.
When set, paragraphs are automatically broken into columns.

#### Todo

Not yet implemented.

***

### defaultStyle?

> `optional` **defaultStyle?**: `Partial`\<`Omit`\<[`TextRun`](TextRun.md), `"text"` \| `"type"` \| `"inlineWidget"`\>\>

Defined in: [core/src/types/Document.ts:640](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L640)

Default style inherited by all `TextRun` children.
Any field omitted in a `TextRun` will fall back to this value.

***

### direction?

> `optional` **direction?**: `"ltr"` \| `"rtl"`

Defined in: [core/src/types/Document.ts:601](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L601)

Base text direction (important for bidi).
`'ltr'` = left-to-right, `'rtl'` = right-to-left.

***

### dominantBaseline?

> `optional` **dominantBaseline?**: [`DominantBaseline`](../type-aliases/DominantBaseline.md)

Defined in: [core/src/types/Document.ts:608](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L608)

Dominant baseline for inline alignment.

#### Todo

Not yet implemented.

***

### height?

> `optional` **height?**: `number`

Defined in: [core/src/types/Document.ts:578](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L578)

Container height in px.

When set — may clip content or trigger autofit. When `undefined` — auto
(content determines height, `contentHeight` from the layout result).

***

### lineFitEdge?

> `optional` **lineFitEdge?**: [`LineFitEdge`](../type-aliases/LineFitEdge.md)

Defined in: [core/src/types/Document.ts:613](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L613)

Font metric edge used for line box height.

#### Todo

Not yet implemented.

***

### padding?

> `optional` **padding?**: `object`

Defined in: [core/src/types/Document.ts:618](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L618)

Inner padding of the frame.
Text layout starts at `x + padding.left`, `y + padding.top`.

#### bottom

> **bottom**: `number`

Bottom padding in px.

#### left

> **left**: `number`

Left padding in px.

#### right

> **right**: `number`

Right padding in px.

#### top

> **top**: `number`

Top padding in px.

***

### paragraphs

> **paragraphs**: [`Paragraph`](Paragraph.md)[]

Defined in: [core/src/types/Document.ts:635](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L635)

Paragraphs forming the text content.

***

### textOrientation?

> `optional` **textOrientation?**: [`TextOrientation`](../type-aliases/TextOrientation.md)

Defined in: [core/src/types/Document.ts:596](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L596)

Character orientation in vertical mode.
Ignored when `writingMode === 'horizontal-tb'`.

***

### verticalAlignment?

> `optional` **verticalAlignment?**: [`VerticalAlignment`](../type-aliases/VerticalAlignment.md)

Defined in: [core/src/types/Document.ts:603](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L603)

Vertical alignment of the content block inside the frame.

***

### width?

> `optional` **width?**: `number`

Defined in: [core/src/types/Document.ts:571](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L571)

Container width in px.

When set — text wraps by this width (if `wrap=true`). Used as the inline-size
for horizontal-tb writing mode. When `undefined` — auto (fit-content).

***

### wrap

> **wrap**: `boolean`

Defined in: [core/src/types/Document.ts:584](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L584)

Whether line wrapping is enabled.
`true` = lines break when they exceed `width` (or `height` in vertical mode).
`false` = text overflows (may be clipped or trigger autofit).

***

### writingMode?

> `optional` **writingMode?**: [`WritingMode`](../type-aliases/WritingMode.md)

Defined in: [core/src/types/Document.ts:591](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L591)

Writing mode (block flow direction).
Defaults to `'horizontal-tb'` when absent.
