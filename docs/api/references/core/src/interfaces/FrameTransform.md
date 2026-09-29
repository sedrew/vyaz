[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / FrameTransform

# Interface: FrameTransform

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:97](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L97)

Rigid transform a renderer applies to [TextFrameLayoutResult.lines](TextFrameLayoutResult.md#lines) so a
`sideways-*` writing mode or an explicit `rotation` takes visual effect. The
layout math itself (line breaking, measuring, positioning) is unchanged.

## Properties

### layoutBox

> **layoutBox**: `object`

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:105](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L105)

The box `lines` occupy in their own pre-rotation coordinate space. The
renderer rotates this box about its centre; for `rotate` of 90 / 270 the
visible canvas is this box with width and height swapped.

#### height

> **height**: `number`

#### width

> **width**: `number`

***

### rotate

> **rotate**: `number`

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:99](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L99)

Net clockwise rotation in degrees, normalised to `[0, 360)`.
