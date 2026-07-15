[vyaz-monorepo](../../../index.md) / [renderer/src](../index.md) / renderDebugToCanvas

# Function: renderDebugToCanvas()

> **renderDebugToCanvas**(`ctx`, `lines`, `_width`, `_height`, `flags`): `void`

Defined in: [renderer/src/CanvasRenderer.ts:289](https://github.com/sedrew/vyaz/blob/main/packages/renderer/src/CanvasRenderer.ts#L289)

Draw debug overlays on Canvas.

Mirrors SVGRenderer's renderDebugToSVG (lines 658-814) but draws
directly on Canvas 2D instead of generating SVG markup.

Supported flags:
  frameBox / frame   — frame container bounding box (blue dashed)
  contentBox         — content bounding box (pink dotted)
  paragraphBox       — per-paragraph colored boxes (requires groupLinesByParagraph)
  columnBox          — column separators for multi-column layout
  box                — line box outlines (red)
  baseline           — baseline line (blue)
  ascentDescent      — ascent/descent lines (green dashed)
  lineGap            — line height fill (blue transparent)
  labels             — coordinate labels
  runs               — span bounding boxes (purple)

## Parameters

### ctx

`CanvasRenderingContext2D`

### lines

[`Line`](../../../core/src/interfaces/Line.md)[]

### \_width

`number`

### \_height

`number`

### flags

[`DebugFlags`](../interfaces/DebugFlags.md)

## Returns

`void`
