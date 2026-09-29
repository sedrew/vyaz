[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / AutofitOutcome

# Interface: AutofitOutcome

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:280](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L280)

Autofit outcome, present on the result when [LayoutOptions.autofit](LayoutOptions.md#autofit) was set.

## Properties

### clampedToMin

> **clampedToMin**: `boolean`

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:287](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L287)

True when the min-size floor was hit and content still overflows.

***

### scale

> **scale**: `number`

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:285](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L285)

Proportional font-size scale applied — the scale the returned layout was
measured at, on PowerPoint's 1% `fontScale` grid. `1` = no shrink.
