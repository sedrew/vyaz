[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / FrameTransform

# Interface: FrameTransform

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:77](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L77)

Rigid transform a renderer applies to [TextFrameLayoutResult.lines](TextFrameLayoutResult.md#lines) so a
`sideways-*` writing mode or an explicit `rotation` takes visual effect. The
layout math itself (line breaking, measuring, positioning) is unchanged.

## Properties

### layoutBox

> **layoutBox**: `object`

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:85](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L85)

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

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:79](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L79)

Net clockwise rotation in degrees, normalised to `[0, 360)`.
