[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / TextFrameLayoutResult

# Interface: TextFrameLayoutResult

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:38](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L38)

Result of laying out a full TextFrame.

`fitHorizontal` / `fitVertical` tell the renderer which dimension to use:
- `'frame'`   → use `frameWidth` / `frameHeight`
- `'content'` → use `contentWidth` / `contentHeight`

## Properties

### autofit?

> `optional` **autofit?**: [`AutofitOutcome`](AutofitOutcome.md)

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:55](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L55)

Present when autofit ran — the scale applied and whether it bottomed out.

***

### content

> **content**: `object`

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:41](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L41)

Intrinsic content box — the text bounding box.

#### height

> **height**: `number`

#### width

> **width**: `number`

***

### fit

> **fit**: `object`

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:53](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L53)

Which size a renderer should use per axis: `'frame'` when a frame size was
provided, otherwise `'content'`.

#### horizontal

> **horizontal**: `"frame"` \| `"content"`

#### vertical

> **vertical**: `"frame"` \| `"content"`

***

### frame

> **frame**: `object`

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:43](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L43)

Frame box as given on the input; an axis is omitted when its size was not set.

#### height?

> `optional` **height?**: `number`

#### width?

> `optional` **width?**: `number`

***

### lines

> **lines**: [`Line`](Line.md)[]

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:39](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L39)

***

### overflow

> **overflow**: `object`

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:48](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L48)

Whether content spills past the frame on each axis. `false` for an axis
with no frame size. Use it to decide auto-grow vs clip vs autofit.

#### horizontal

> **horizontal**: `boolean`

#### vertical

> **vertical**: `boolean`

***

### warnings?

> `optional` **warnings?**: [`LayoutWarning`](LayoutWarning.md)[]

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:57](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L57)

Non-fatal issues (font fallback / substitution). Omitted when empty.
