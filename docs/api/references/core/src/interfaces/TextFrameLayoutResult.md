[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / TextFrameLayoutResult

# Interface: TextFrameLayoutResult

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:39](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L39)

Result of laying out a full TextFrame.

`fitHorizontal` / `fitVertical` tell the renderer which dimension to use:
- `'frame'`   → use `frameWidth` / `frameHeight`
- `'content'` → use `contentWidth` / `contentHeight`

## Properties

### autofit?

> `optional` **autofit?**: [`AutofitOutcome`](AutofitOutcome.md)

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:75](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L75)

Present when autofit ran — the scale applied and whether it bottomed out.

***

### content

> **content**: `object`

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:47](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L47)

CSS-style content box: every line's full `lineHeight` box summed, plus
padding. Reported in visual (post-rotation) space. Use it for flow-level
stacking / auto-grow — a `lineHeight` > 1 leaves half-leading above the
first line and below the last, exactly as a browser block would.

#### height

> **height**: `number`

#### width

> **width**: `number`

***

### fit

> **fit**: `object`

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:73](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L73)

Which size a renderer should use per axis: `'frame'` when a frame size was
provided, otherwise `'content'`.

#### horizontal

> **horizontal**: `"frame"` \| `"content"`

#### vertical

> **vertical**: `"frame"` \| `"content"`

***

### frame

> **frame**: `object`

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:63](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L63)

Frame box as given on the input; an axis is omitted when its size was not set.

#### height?

> `optional` **height?**: `number`

#### width?

> `optional` **width?**: `number`

***

### lines

> **lines**: [`Line`](Line.md)[]

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:40](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L40)

***

### overflow

> **overflow**: `object`

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:68](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L68)

Whether content spills past the frame on each axis. `false` for an axis
with no frame size. Use it to decide auto-grow vs clip vs autofit.

#### horizontal

> **horizontal**: `boolean`

#### vertical

> **vertical**: `boolean`

***

### textBox

> **textBox**: `object`

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:61](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L61)

Text box with the last line's trailing leading trimmed off, in the same
(pre-rotation) coordinate space as `lines`, `x` / `y` from the frame origin
(padding kept in the offset). Top / left / right are the first line's box
top and the widest line's advance extent — unchanged from `content`,
because PowerPoint keeps the leading above the first line too. The bottom
is the **last line's baseline + its real font descent**, so a
`lineHeight` > 1 no longer leaves empty space after the text
(`content.height − textBox.height` is that trimmed slack, ~6 pt at 18 pt /
spacing 2.0). Use it for PDF / PPTX frame sizing; use `content` / `frame`
for flow-level stacking. All zeroes when there are no lines. Callers
handling `transform` apply it to this box just like to `lines`.

#### height

> **height**: `number`

#### width

> **width**: `number`

#### x

> **x**: `number`

#### y

> **y**: `number`

***

### transform?

> `optional` **transform?**: [`FrameTransform`](FrameTransform.md)

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:87](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L87)

Post-layout rigid transform to realise `writingMode: 'sideways-*'` and/or
`TextFrame.rotation`. Omitted when the net rotation is a multiple of 360°
(nothing to apply). `lines`, `content` bbox aside, live in pre-rotation
layout space; `content` / `overflow` are reported in **visual** space.

***

### warnings?

> `optional` **warnings?**: [`LayoutWarning`](LayoutWarning.md)[]

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:89](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L89)

Non-fatal issues (font fallback / substitution). Omitted when empty.

***

### writingMode

> **writingMode**: [`WritingMode`](../type-aliases/WritingMode.md)

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:80](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L80)

Block flow direction this layout was produced for — echoes
`TextFrame.writingMode`, defaulting to `'horizontal-tb'`.
