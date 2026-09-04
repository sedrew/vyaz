[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / LayoutWarning

# Interface: LayoutWarning

Defined in: [core/src/types/LayoutTypes.ts:146](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L146)

A non-fatal issue found while laying out.

## Properties

### requested

> **requested**: `string`

Defined in: [core/src/types/LayoutTypes.ts:154](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L154)

The first (preferred) family the run asked for.

***

### runIndex

> **runIndex**: `number`

Defined in: [core/src/types/LayoutTypes.ts:158](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L158)

Index of the source run in its paragraph's `children`.

***

### type

> **type**: `"font-fallback"` \| `"font-missing"`

Defined in: [core/src/types/LayoutTypes.ts:152](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L152)

- `font-fallback` — a later entry in a `fontFamily` fallback list was used.
- `font-missing`  — no requested family was registered; a substitute was
  used (only under `onMissingFont: 'substitute'`).

***

### used

> **used**: `string`

Defined in: [core/src/types/LayoutTypes.ts:156](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L156)

The family actually used.
