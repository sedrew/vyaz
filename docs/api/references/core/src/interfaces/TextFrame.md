[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / TextFrame

# Interface: TextFrame

Defined in: [core/src/types/Document.ts:691](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L691)

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

Defined in: [core/src/types/Document.ts:713](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L713)

Autofit (auto font-size reduction) configuration.

***

### columns?

> `optional` **columns?**: [`MultiColumnConfig`](MultiColumnConfig.md)

Defined in: [core/src/types/Document.ts:774](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L774)

**`Experimental`**

Multi-column layout configuration.
When set, paragraphs are automatically broken into columns.
 Accepted in the type but ignored by the layout engine (no-op until implemented).

***

### defaultStyle?

> `optional` **defaultStyle?**: `Partial`\<`Omit`\<[`TextRun`](TextRun.md), `"type"` \| `"text"` \| `"inlineWidget"`\>\>

Defined in: [core/src/types/Document.ts:781](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L781)

Default style inherited by all `TextRun` children.
Any field omitted in a `TextRun` will fall back to this value.

***

### direction?

> `optional` **direction?**: `"ltr"` \| `"rtl"`

Defined in: [core/src/types/Document.ts:742](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L742)

Base text direction (important for bidi).
`'ltr'` = left-to-right, `'rtl'` = right-to-left.

***

### dominantBaseline?

> `optional` **dominantBaseline?**: [`DominantBaseline`](../type-aliases/DominantBaseline.md)

Defined in: [core/src/types/Document.ts:749](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L749)

**`Experimental`**

Dominant baseline for inline alignment.
 Accepted in the type but ignored by the layout engine (no-op until implemented).

***

### height?

> `optional` **height?**: `number`

Defined in: [core/src/types/Document.ts:705](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L705)

Container height in px.

When set — may clip content or trigger autofit. When `undefined` — auto
(content determines height, `contentHeight` from the layout result).

***

### lineFitEdge?

> `optional` **lineFitEdge?**: [`LineFitEdge`](../type-aliases/LineFitEdge.md)

Defined in: [core/src/types/Document.ts:754](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L754)

**`Experimental`**

Font metric edge used for line box height.
 Accepted in the type but ignored by the layout engine (no-op until implemented).

***

### padding?

> `optional` **padding?**: `object`

Defined in: [core/src/types/Document.ts:759](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L759)

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

Defined in: [core/src/types/Document.ts:776](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L776)

Paragraphs forming the text content.

***

### rotation?

> `optional` **rotation?**: `number`

Defined in: [core/src/types/Document.ts:737](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L737)

Rigid clockwise rotation of the **whole** text block, in degrees, applied
after layout as an affine transform about the frame-box centre. This does
**not** affect line breaking, measurement or positioning — only the final
render transform. Mirrors PowerPoint's shape rotation (`<a:xfrm rot>`).

Composes with `writingMode: 'sideways-*'` (which contributes its own ±90°).
`0`, `90`, `180`, `270` are the exercised values; other angles are accepted
and rotate about the centre without expanding the canvas bounding box.

The engine folds this together with the writing-mode rotation and reports
the result on `TextFrameLayoutResult.transform`.

***

### textOrientation?

> `optional` **textOrientation?**: [`TextOrientation`](../type-aliases/TextOrientation.md)

Defined in: [core/src/types/Document.ts:723](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L723)

Character orientation in vertical mode.
Ignored when `writingMode === 'horizontal-tb'`.

***

### verticalAlignment?

> `optional` **verticalAlignment?**: [`VerticalAlignment`](../type-aliases/VerticalAlignment.md)

Defined in: [core/src/types/Document.ts:744](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L744)

Vertical alignment of the content block inside the frame.

***

### width?

> `optional` **width?**: `number`

Defined in: [core/src/types/Document.ts:698](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L698)

Container width in px.

When set — text wraps by this width (if `wrap=true`). Used as the inline-size
for horizontal-tb writing mode. When `undefined` — auto (fit-content).

***

### wrap

> **wrap**: `boolean`

Defined in: [core/src/types/Document.ts:711](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L711)

Whether line wrapping is enabled.
`true` = lines break when they exceed `width` (or `height` in vertical mode).
`false` = text overflows (may be clipped or trigger autofit).

***

### writingMode?

> `optional` **writingMode?**: [`WritingMode`](../type-aliases/WritingMode.md)

Defined in: [core/src/types/Document.ts:718](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L718)

Writing mode (block flow direction).
Defaults to `'horizontal-tb'` when absent.
