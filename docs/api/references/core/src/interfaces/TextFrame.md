[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / TextFrame

# Interface: TextFrame

Defined in: [core/src/types/Document.ts:570](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L570)

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

Defined in: [core/src/types/Document.ts:592](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L592)

Autofit (auto font-size reduction) configuration.

***

### columns?

> `optional` **columns?**: [`MultiColumnConfig`](MultiColumnConfig.md)

Defined in: [core/src/types/Document.ts:639](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L639)

Multi-column layout configuration.
When set, paragraphs are automatically broken into columns.

#### Todo

Not yet implemented.

***

### defaultStyle?

> `optional` **defaultStyle?**: `Partial`\<`Omit`\<[`TextRun`](TextRun.md), `"text"` \| `"type"` \| `"inlineWidget"`\>\>

Defined in: [core/src/types/Document.ts:646](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L646)

Default style inherited by all `TextRun` children.
Any field omitted in a `TextRun` will fall back to this value.

***

### direction?

> `optional` **direction?**: `"ltr"` \| `"rtl"`

Defined in: [core/src/types/Document.ts:607](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L607)

Base text direction (important for bidi).
`'ltr'` = left-to-right, `'rtl'` = right-to-left.

***

### dominantBaseline?

> `optional` **dominantBaseline?**: [`DominantBaseline`](../type-aliases/DominantBaseline.md)

Defined in: [core/src/types/Document.ts:614](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L614)

Dominant baseline for inline alignment.

#### Todo

Not yet implemented.

***

### height?

> `optional` **height?**: `number`

Defined in: [core/src/types/Document.ts:584](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L584)

Container height in px.

When set — may clip content or trigger autofit. When `undefined` — auto
(content determines height, `contentHeight` from the layout result).

***

### lineFitEdge?

> `optional` **lineFitEdge?**: [`LineFitEdge`](../type-aliases/LineFitEdge.md)

Defined in: [core/src/types/Document.ts:619](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L619)

Font metric edge used for line box height.

#### Todo

Not yet implemented.

***

### padding?

> `optional` **padding?**: `object`

Defined in: [core/src/types/Document.ts:624](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L624)

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

Defined in: [core/src/types/Document.ts:641](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L641)

Paragraphs forming the text content.

***

### textOrientation?

> `optional` **textOrientation?**: [`TextOrientation`](../type-aliases/TextOrientation.md)

Defined in: [core/src/types/Document.ts:602](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L602)

Character orientation in vertical mode.
Ignored when `writingMode === 'horizontal-tb'`.

***

### verticalAlignment?

> `optional` **verticalAlignment?**: [`VerticalAlignment`](../type-aliases/VerticalAlignment.md)

Defined in: [core/src/types/Document.ts:609](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L609)

Vertical alignment of the content block inside the frame.

***

### width?

> `optional` **width?**: `number`

Defined in: [core/src/types/Document.ts:577](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L577)

Container width in px.

When set — text wraps by this width (if `wrap=true`). Used as the inline-size
for horizontal-tb writing mode. When `undefined` — auto (fit-content).

***

### wrap

> **wrap**: `boolean`

Defined in: [core/src/types/Document.ts:590](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L590)

Whether line wrapping is enabled.
`true` = lines break when they exceed `width` (or `height` in vertical mode).
`false` = text overflows (may be clipped or trigger autofit).

***

### writingMode?

> `optional` **writingMode?**: [`WritingMode`](../type-aliases/WritingMode.md)

Defined in: [core/src/types/Document.ts:597](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L597)

Writing mode (block flow direction).
Defaults to `'horizontal-tb'` when absent.
