[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / TextFrameLayoutResult

# Interface: TextFrameLayoutResult

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:35](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L35)

Result of laying out a full TextFrame.

`fitHorizontal` / `fitVertical` tell the renderer which dimension to use:
- `'frame'`   → use `frameWidth` / `frameHeight`
- `'content'` → use `contentWidth` / `contentHeight`

## Properties

### contentHeight

> **contentHeight**: `number`

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:44](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L44)

Actual content height (may exceed frameHeight).

***

### contentWidth

> **contentWidth**: `number`

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:42](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L42)

Actual content width (may exceed frameWidth when wrap=false).

***

### fitHorizontal

> **fitHorizontal**: `"frame"` \| `"content"`

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:46](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L46)

Whether horizontal dimension should use frame or content size.

***

### fitVertical

> **fitVertical**: `"frame"` \| `"content"`

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:48](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L48)

Whether vertical dimension should use frame or content size.

***

### frameHeight?

> `optional` **frameHeight?**: `number`

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:40](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L40)

Frame height (set when TextFrame.height was provided).

***

### frameWidth?

> `optional` **frameWidth?**: `number`

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:38](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L38)

Frame width (set when TextFrame.width was provided).

***

### lines

> **lines**: [`Line`](Line.md)[]

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:36](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L36)
