[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / OverflowWrap

# Type Alias: OverflowWrap

> **OverflowWrap** = `"normal"` \| `"break-word"` \| `"anywhere"`

Defined in: [core/src/types/Document.ts:107](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L107)

Overflow wrap behavior (whether long words can break).

`'normal'` (the default) matches real browsers and PowerPoint: a word
wider than the available width overflows the line rather than being
split. `'break-word'` / `'anywhere'` force a break at grapheme boundaries
when a word doesn't fit — `'anywhere'` also lets that break point count
toward min-content sizing (both mapped to the same fallback here).

## See

[CSS Text: overflow-wrap](https://www.w3.org/TR/css-text-3/#overflow-wrap-property)
