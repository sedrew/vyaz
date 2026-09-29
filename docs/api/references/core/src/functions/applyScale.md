[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / applyScale

# Function: applyScale()

> **applyScale**(`doc`, `scale`): [`TextFrame`](../interfaces/TextFrame.md)

Defined in: [core/src/layout/AutoFitEngine.ts:37](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/AutoFitEngine.ts#L37)

Apply a scale factor to all fontSize values in the document.
inlineWidget dimensions are NOT scaled.
Returns a NEW document (does not mutate the original).

Sizes are rounded to two decimals — what a caller re-deriving the size from
`scale` would get. Autofit measures through applyScaleExact instead: see
there for why the rounded size is the wrong one to measure.

## Parameters

### doc

[`TextFrame`](../interfaces/TextFrame.md)

### scale

`number`

## Returns

[`TextFrame`](../interfaces/TextFrame.md)
