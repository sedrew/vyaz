[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / LayoutWarning

# Interface: LayoutWarning

Defined in: [core/src/types/LayoutTypes.ts:185](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L185)

A non-fatal issue found while laying out.

## Properties

### requested

> **requested**: `string`

Defined in: [core/src/types/LayoutTypes.ts:193](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L193)

The first (preferred) family the run asked for.

***

### runIndex

> **runIndex**: `number`

Defined in: [core/src/types/LayoutTypes.ts:197](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L197)

Index of the source run in its paragraph's `children`.

***

### type

> **type**: `"font-fallback"` \| `"font-missing"`

Defined in: [core/src/types/LayoutTypes.ts:191](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L191)

- `font-fallback` — a later entry in a `fontFamily` fallback list was used.
- `font-missing`  — no requested family was registered; a substitute was
  used (only under `onMissingFont: 'substitute'`).

***

### used

> **used**: `string`

Defined in: [core/src/types/LayoutTypes.ts:195](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L195)

The family actually used.
