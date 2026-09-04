[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / AutofitOutcome

# Interface: AutofitOutcome

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:162](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L162)

Autofit outcome, present on the result when [LayoutOptions.autofit](LayoutOptions.md#autofit) was set.

## Properties

### clampedToMin

> **clampedToMin**: `boolean`

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:166](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L166)

True when the min-size floor was hit and content still overflows.

***

### scale

> **scale**: `number`

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:164](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L164)

Proportional font-size scale applied (1 = no shrink).
