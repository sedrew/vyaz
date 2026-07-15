[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / applyScale

# Function: applyScale()

> **applyScale**(`doc`, `scale`): [`TextFrame`](../interfaces/TextFrame.md)

Defined in: [core/src/layout/AutoFitEngine.ts:33](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/AutoFitEngine.ts#L33)

Apply a scale factor to all fontSize values in the document.
inlineWidget dimensions are NOT scaled.
Returns a NEW document (does not mutate the original).

## Parameters

### doc

[`TextFrame`](../interfaces/TextFrame.md)

### scale

`number`

## Returns

[`TextFrame`](../interfaces/TextFrame.md)
