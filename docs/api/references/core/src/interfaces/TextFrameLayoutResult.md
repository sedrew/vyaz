[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / TextFrameLayoutResult

# Interface: TextFrameLayoutResult

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:36](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L36)

Result of laying out a full TextFrame.

`fitHorizontal` / `fitVertical` tell the renderer which dimension to use:
- `'frame'`   → use `frameWidth` / `frameHeight`
- `'content'` → use `contentWidth` / `contentHeight`

## Properties

### contentHeight

> **contentHeight**: `number`

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:45](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L45)

Actual content height (may exceed frameHeight).

***

### contentWidth

> **contentWidth**: `number`

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:43](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L43)

Actual content width (may exceed frameWidth when wrap=false).

***

### fitHorizontal

> **fitHorizontal**: `"frame"` \| `"content"`

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:47](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L47)

Whether horizontal dimension should use frame or content size.

***

### fitVertical

> **fitVertical**: `"frame"` \| `"content"`

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:49](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L49)

Whether vertical dimension should use frame or content size.

***

### frameHeight?

> `optional` **frameHeight?**: `number`

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:41](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L41)

Frame height (set when TextFrame.height was provided).

***

### frameWidth?

> `optional` **frameWidth?**: `number`

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:39](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L39)

Frame width (set when TextFrame.width was provided).

***

### lines

> **lines**: [`Line`](Line.md)[]

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:37](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L37)
