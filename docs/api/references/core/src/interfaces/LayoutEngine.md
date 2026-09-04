[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / LayoutEngine

# Interface: LayoutEngine

Defined in: [core/src/layout/create-engine.ts:26](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/create-engine.ts#L26)

A layout engine with its own prepared-line cache.

## Methods

### clearCache()

> **clearCache**(): `void`

Defined in: [core/src/layout/create-engine.ts:30](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/create-engine.ts#L30)

Drop all cached prepared-line data.

#### Returns

`void`

***

### layout()

> **layout**(`frame`, `options?`): [`TextFrameLayoutResult`](TextFrameLayoutResult.md)

Defined in: [core/src/layout/create-engine.ts:28](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/create-engine.ts#L28)

Lay out a full text frame. Same result shape as [layoutTextFrame](../functions/layoutTextFrame.md).

#### Parameters

##### frame

[`TextFrame`](TextFrame.md)

##### options?

[`LayoutOptions`](LayoutOptions.md)

#### Returns

[`TextFrameLayoutResult`](TextFrameLayoutResult.md)
