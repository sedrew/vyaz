[vyaz-monorepo](../../../index.md) / [renderers/src](../index.md) / TableRenderOptions

# Interface: TableRenderOptions

Defined in: [renderers/src/TableRenderer.ts:46](https://github.com/sedrew/vyaz/blob/main/packages/renderers/src/TableRenderer.ts#L46)

## Properties

### className?

> `optional` **className?**: `string`

Defined in: [renderers/src/TableRenderer.ts:52](https://github.com/sedrew/vyaz/blob/main/packages/renderers/src/TableRenderer.ts#L52)

CSS class for the root `<svg>`/`<g>`.

***

### fragment?

> `optional` **fragment?**: `boolean`

Defined in: [renderers/src/TableRenderer.ts:59](https://github.com/sedrew/vyaz/blob/main/packages/renderers/src/TableRenderer.ts#L59)

Emit a bare `<g>` (no `<svg>`/`viewBox`/`xmlns` wrapper) for splicing
into a document that already has an outer `<svg>` — e.g. composing
several tables, or embedding as a nested-table cell's content. Default
`false`.

***

### preset?

> `optional` **preset?**: [`SvgPreset`](../type-aliases/SvgPreset.md)

Defined in: [renderers/src/TableRenderer.ts:48](https://github.com/sedrew/vyaz/blob/main/packages/renderers/src/TableRenderer.ts#L48)

Preset used for every cell's own text render. Default `'browser'`.

***

### style?

> `optional` **style?**: [`SvgStyle`](../type-aliases/SvgStyle.md)

Defined in: [renderers/src/TableRenderer.ts:50](https://github.com/sedrew/vyaz/blob/main/packages/renderers/src/TableRenderer.ts#L50)

How cell text style properties are expressed. Default `'xml'`.
