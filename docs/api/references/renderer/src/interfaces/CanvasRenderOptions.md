[vyaz-monorepo](../../../index.md) / [renderer/src](../index.md) / CanvasRenderOptions

# Interface: CanvasRenderOptions

Defined in: [renderer/src/CanvasRenderer.ts:26](https://github.com/sedrew/vyaz/blob/main/packages/renderer/src/CanvasRenderer.ts#L26)

## Properties

### backgroundColor?

> `optional` **backgroundColor?**: `string`

Defined in: [renderer/src/CanvasRenderer.ts:39](https://github.com/sedrew/vyaz/blob/main/packages/renderer/src/CanvasRenderer.ts#L39)

Background color for clearing. If omitted, canvas is cleared transparent.

***

### debug?

> `optional` **debug?**: [`DebugFlags`](DebugFlags.md)

Defined in: [renderer/src/CanvasRenderer.ts:41](https://github.com/sedrew/vyaz/blob/main/packages/renderer/src/CanvasRenderer.ts#L41)

Debug overlay flags.

***

### preserveSpaces?

> `optional` **preserveSpaces?**: `boolean`

Defined in: [renderer/src/CanvasRenderer.ts:37](https://github.com/sedrew/vyaz/blob/main/packages/renderer/src/CanvasRenderer.ts#L37)

When true: render space spans with a space character.
When false (default): skip space spans (position is already accounted for in x).

***

### sizing?

> `optional` **sizing?**: `"frame"` \| `"content"`

Defined in: [renderer/src/CanvasRenderer.ts:32](https://github.com/sedrew/vyaz/blob/main/packages/renderer/src/CanvasRenderer.ts#L32)

How the canvas size is determined:
  'frame'   — use current ctx.canvas.width/height (default)
  'content' — compute bounding box from lines, resize canvas to fit
