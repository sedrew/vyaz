[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / WhiteSpace

# Type Alias: WhiteSpace

> **WhiteSpace** = `"normal"` \| `"nowrap"` \| `"pre"` \| `"pre-line"` \| `"pre-wrap"`

Defined in: [core/src/types/Document.ts:178](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L178)

CSS `white-space` equivalent.

Controls how whitespace and line breaks are handled inside a paragraph.
- `'normal'`: collapse whitespace, auto-wrap.
- `'nowrap'`: collapse whitespace, no wrap.
- `'pre'`: preserve whitespace, wrap on newline only.
- `'pre-line'`: collapse whitespace, wrap on newline and auto-wrap.
- `'pre-wrap'`: preserve whitespace, wrap on newline and auto-wrap; spaces
  at the end of a line hang (they don't wrap and don't count for fit).

`mode: 'office'` defaults to `'pre-wrap'` when the paragraph leaves this
unset — PowerPoint keeps every space (leading, repeated, trailing).

## See

[CSS Text: white-space](https://www.w3.org/TR/css-text-3/#white-space-property)
