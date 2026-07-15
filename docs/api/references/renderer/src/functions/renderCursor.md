[vyaz-monorepo](../../../index.md) / [renderer/src](../index.md) / renderCursor

# Function: renderCursor()

> **renderCursor**(`ctx`, `lines`, `pos`, `options?`): `void`

Defined in: [renderer/src/CanvasRenderer.ts:528](https://github.com/sedrew/vyaz/blob/main/packages/renderer/src/CanvasRenderer.ts#L528)

Render a text cursor (caret) at the given character position.

Draws a vertical line at the character's left edge.
The caller is responsible for cursor blink timing.

## Parameters

### ctx

`CanvasRenderingContext2D`

— Canvas 2D rendering context

### lines

[`Line`](../../../core/src/interfaces/Line.md)[]

— layout lines

### pos

[`CharPos`](../interfaces/CharPos.md)

— cursor position (character left edge)

### options?

[`CursorOptions`](../interfaces/CursorOptions.md) = `{}`

— cursor visual options

## Returns

`void`
