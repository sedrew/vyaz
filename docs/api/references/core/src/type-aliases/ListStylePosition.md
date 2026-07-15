[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / ListStylePosition

# Type Alias: ListStylePosition

> **ListStylePosition** = `"outside"` \| `"inside"`

Defined in: [core/src/types/Document.ts:182](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L182)

Position of the list marker relative to the text.

- `'outside'`: marker hangs to the left of the text block (default). All lines
  share the same indent — the marker sits inside the indent zone.
- `'inside'`: marker is the first inline element in the text flow, on the first
  line only.

## See

[CSS Lists: list-style-position](https://www.w3.org/TR/css-lists-3/#list-style-position-property)
