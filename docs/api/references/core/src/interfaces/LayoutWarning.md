[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / LayoutWarning

# Interface: LayoutWarning

Defined in: [core/src/types/LayoutTypes.ts:233](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L233)

A non-fatal issue found while laying out.

## Properties

### requested

> **requested**: `string`

Defined in: [core/src/types/LayoutTypes.ts:241](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L241)

The first (preferred) family the run asked for.

***

### runIndex

> **runIndex**: `number`

Defined in: [core/src/types/LayoutTypes.ts:245](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L245)

Index of the source run in its paragraph's `children`.

***

### type

> **type**: `"font-fallback"` \| `"font-missing"`

Defined in: [core/src/types/LayoutTypes.ts:239](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L239)

- `font-fallback` — a later entry in a `fontFamily` fallback list was used.
- `font-missing`  — no requested family was registered; a substitute was
  used (only under `onMissingFont: 'substitute'`).

***

### used

> **used**: `string`

Defined in: [core/src/types/LayoutTypes.ts:243](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L243)

The family actually used.
