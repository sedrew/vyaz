[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / ParagraphStyle

# Interface: ParagraphStyle

Defined in: [core/src/types/Document.ts:492](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L492)

Block-level style for a paragraph.

Controls alignment, spacing, indentation,
and line-breaking rules for all runs inside the paragraph.

## See

[CSS Text Module Level 3](https://www.w3.org/TR/css-text-3/)

## Properties

### alignment

> **alignment**: [`TextAlignment`](../type-aliases/TextAlignment.md)

Defined in: [core/src/types/Document.ts:494](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L494)

Horizontal text alignment.

***

### hyphenBreak?

> `optional` **hyphenBreak?**: `boolean`

Defined in: [core/src/types/Document.ts:558](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L558)

Whether a line may break after a hyphen (`-` U+002D, `‐` U+2010) inside a
word or number — `well-│known`, `2024-│10-06`. Default `true`, which is
what browsers and PowerPoint do. `false` keeps hyphenated words and
codes (`TEST-1234`, dates, phone numbers) on one line, like U+2011.
Unrelated to [ParagraphStyle.hyphens](#hyphens) (automatic hyphenation).

***

### hyphens?

> `optional` **hyphens?**: `boolean`

Defined in: [core/src/types/Document.ts:550](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L550)

**`Experimental`**

Whether hyphenation is allowed.
 Accepted in the type but ignored by the layout engine (no-op until implemented).

***

### indent?

> `optional` **indent?**: `number`

Defined in: [core/src/types/Document.ts:512](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L512)

Left indent (first-line indent / "red line") in px.
Applies only to the first line of the paragraph.

#### Todo

Rename or alias as `textIndent` for consistency with CSS.

***

### leftIndent?

> `optional` **leftIndent?**: `number`

Defined in: [core/src/types/Document.ts:514](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L514)

Left margin for the whole paragraph in px.

***

### leftRule?

> `optional` **leftRule?**: `object`

Defined in: [core/src/types/Document.ts:594](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L594)

A vertical rule drawn along the paragraph's left edge, e.g. `<blockquote>`'s
indent bar. Painted per-line (one short vertical segment per laid-out
`Line`, at that line's left edge) rather than as one shape spanning the
whole paragraph — consecutive lines sit flush against each other, so the
segments read as a single continuous bar without the layout engine having
to track a paragraph's overall bounding box.

#### color

> **color**: `string`

#### width

> **width**: `number`

#### See

[Paragraph.rule](Paragraph.md#rule) for a full-width horizontal rule (`<hr>`) —
     a different construct: that one *replaces* a paragraph's content,
     this one decorates a paragraph that still has normal text content.

***

### letterSpacing?

> `optional` **letterSpacing?**: `number`

Defined in: [core/src/types/Document.ts:525](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L525)

Letter-spacing (tracking) for the whole paragraph in px.

***

### lineBreak?

> `optional` **lineBreak?**: [`LineBreak`](../type-aliases/LineBreak.md)

Defined in: [core/src/types/Document.ts:540](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L540)

**`Experimental`**

Line-break strictness (CJK).
 Accepted in the type but ignored by the layout engine (no-op until implemented).

***

### lineHeight

> **lineHeight**: `number`

Defined in: [core/src/types/Document.ts:501](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L501)

Line height as a **multiplier** relative to the font size.
E.g. `1.4` means 1.4× the computed font height.

#### Todo

Support for absolute px values via a `lineHeightUnit` field.

***

### listRestart?

> `optional` **listRestart?**: `boolean`

Defined in: [core/src/types/Document.ts:580](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L580)

Whether to restart numbering for this paragraph.
Only has effect when `listStyle.type === 'number'`.
When `true`, the auto-numbering counter resets to `listStyle.startNumber || 1`
for this paragraph and subsequent ones in the same sequence.

***

### listStyle?

> `optional` **listStyle?**: [`ListStyle`](ListStyle.md)

Defined in: [core/src/types/Document.ts:572](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L572)

List marker configuration (bullet or numbered).
When set, the paragraph is treated as a list item.

***

### overflowWrap?

> `optional` **overflowWrap?**: [`OverflowWrap`](../type-aliases/OverflowWrap.md)

Defined in: [core/src/types/Document.ts:545](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L545)

Overflow-wrap / word-wrap behaviour. See [OverflowWrap](../type-aliases/OverflowWrap.md). Defaults
to `'normal'` when unset.

***

### rightIndent?

> `optional` **rightIndent?**: `number`

Defined in: [core/src/types/Document.ts:516](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L516)

Right margin for the whole paragraph in px.

***

### spaceAfter

> **spaceAfter**: `number`

Defined in: [core/src/types/Document.ts:505](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L505)

Space **after** this paragraph (bottom margin) in px.

***

### spaceBefore

> **spaceBefore**: `number`

Defined in: [core/src/types/Document.ts:503](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L503)

Space **before** this paragraph (top margin) in px.

***

### textAlignLast?

> `optional` **textAlignLast?**: [`TextAlignLast`](../type-aliases/TextAlignLast.md)

Defined in: [core/src/types/Document.ts:530](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L530)

**`Experimental`**

Alignment of the **last** line of a justified paragraph.
 Accepted in the type but ignored by the layout engine (no-op until implemented).

***

### textIndent?

> `optional` **textIndent?**: `number`

Defined in: [core/src/types/Document.ts:523](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L523)

**`Experimental`**

Indentation of the first line in px.
If set, overrides the generic `indent` for the first line.

 Accepted in the type but ignored by the layout engine (no-op until implemented).

***

### whiteSpace?

> `optional` **whiteSpace?**: [`WhiteSpace`](../type-aliases/WhiteSpace.md)

Defined in: [core/src/types/Document.ts:566](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L566)

CSS `white-space` behaviour:
- `'normal'`: collapse whitespace, auto-wrap.
- `'nowrap'`: collapse whitespace, no wrap.
- `'pre'`: preserve whitespace, wrap on newline only.
- `'pre-line'`: collapse whitespace, wrap on newline and auto-wrap.

***

### wordBreak?

> `optional` **wordBreak?**: [`WordBreak`](../type-aliases/WordBreak.md)

Defined in: [core/src/types/Document.ts:535](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L535)

**`Experimental`**

Word-break rules (CJK / non-CJK).
 Accepted in the type but ignored by the layout engine (no-op until implemented).
