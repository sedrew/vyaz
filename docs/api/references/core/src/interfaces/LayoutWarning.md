[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / LayoutWarning

# Interface: LayoutWarning

Defined in: [core/src/types/LayoutTypes.ts:155](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L155)

A non-fatal issue found while laying out.

## Properties

### requested

> **requested**: `string`

Defined in: [core/src/types/LayoutTypes.ts:163](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L163)

The first (preferred) family the run asked for.

***

### runIndex

> **runIndex**: `number`

Defined in: [core/src/types/LayoutTypes.ts:167](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L167)

Index of the source run in its paragraph's `children`.

***

### type

> **type**: `"font-fallback"` \| `"font-missing"`

Defined in: [core/src/types/LayoutTypes.ts:161](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L161)

- `font-fallback` — a later entry in a `fontFamily` fallback list was used.
- `font-missing`  — no requested family was registered; a substitute was
  used (only under `onMissingFont: 'substitute'`).

***

### used

> **used**: `string`

Defined in: [core/src/types/LayoutTypes.ts:165](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L165)

The family actually used.
