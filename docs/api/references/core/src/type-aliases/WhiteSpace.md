[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / WhiteSpace

# Type Alias: WhiteSpace

> **WhiteSpace** = `"normal"` \| `"nowrap"` \| `"pre"` \| `"pre-line"` \| `"pre-wrap"`

Defined in: [core/src/types/Document.ts:148](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L148)

CSS `white-space` equivalent.

Controls how whitespace and line breaks are handled inside a paragraph.
- `'normal'`: collapse whitespace, auto-wrap.
- `'nowrap'`: collapse whitespace, no wrap.
- `'pre'`: preserve whitespace, wrap on newline only.
- `'pre-line'`: collapse whitespace, wrap on newline and auto-wrap.
- `'pre-wrap'`: preserve whitespace, wrap on newline and auto-wrap.

## See

[CSS Text: white-space](https://www.w3.org/TR/css-text-3/#white-space-property)
