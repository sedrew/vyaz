[vyaz-monorepo](../../../index.md) / [renderer/src](../index.md) / renderSelection

# Function: renderSelection()

> **renderSelection**(`ctx`, `lines`, `start`, `end`, `color?`): `void`

Defined in: [renderer/src/CanvasRenderer.ts:452](https://github.com/sedrew/vyaz/blob/main/packages/renderer/src/CanvasRenderer.ts#L452)

Render a text selection highlight overlay.

Draws a semi-transparent blue rectangle for each character
in the range [start, end). Supports cross-line selections.

If `start` and `end` are in different lines, the full width
of intermediate lines is highlighted.

## Parameters

### ctx

`CanvasRenderingContext2D`

— Canvas 2D rendering context

### lines

`Line`[]

— layout lines

### start

[`CharPos`](../interfaces/CharPos.md)

— selection start position (inclusive)

### end

[`CharPos`](../interfaces/CharPos.md)

— selection end position (exclusive)

### color?

`string` = `'rgba(100, 150, 255, 0.3)'`

— highlight color. Default: 'rgba(100, 150, 255, 0.3)'

## Returns

`void`
