[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / layoutTextFrame

# Function: layoutTextFrame()

> **layoutTextFrame**(`frame`, `options?`): [`TextFrameLayoutResult`](../interfaces/TextFrameLayoutResult.md)

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:176](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L176)

Layout a full TextFrame (paragraphs stacked with Y-offset accumulation).

Uses a shared default engine with its own bounded prepared-line cache. For
isolation, an explicit cache bound, or `clearCache()`, make your own via
[createLayoutEngine](createLayoutEngine.md).

## Parameters

### frame

[`TextFrame`](../interfaces/TextFrame.md)

### options?

[`LayoutOptions`](../interfaces/LayoutOptions.md) = `{}`

## Returns

[`TextFrameLayoutResult`](../interfaces/TextFrameLayoutResult.md)
