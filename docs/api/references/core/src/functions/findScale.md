[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / findScale

# Function: findScale()

> **findScale**(`doc`, `layoutFn`, `config`, `options?`): [`AutoFitResult`](../interfaces/AutoFitResult.md)

Defined in: [core/src/layout/AutoFitEngine.ts:60](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/AutoFitEngine.ts#L60)

Find the optimal scale factor for a document.

## Parameters

### doc

[`TextFrame`](../interfaces/TextFrame.md)

— source document

### layoutFn

(`scaledDoc`) => `object`

— layout(doc) → { height: number; width: number }

### config

— autofit maxWidth/maxHeight

#### maxHeight

`number`

#### maxWidth

`number`

### options?

[`AutoFitOptions`](../interfaces/AutoFitOptions.md)

— search precision

## Returns

[`AutoFitResult`](../interfaces/AutoFitResult.md)
