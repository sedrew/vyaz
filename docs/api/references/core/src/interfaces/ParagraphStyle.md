[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / ParagraphStyle

# Interface: ParagraphStyle

Defined in: [core/src/types/Document.ts:396](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L396)

Block-level style for a paragraph.

Controls alignment, spacing, indentation,
and line-breaking rules for all runs inside the paragraph.

## See

[CSS Text Module Level 3](https://www.w3.org/TR/css-text-3/)

## Properties

### alignment

> **alignment**: [`TextAlignment`](../type-aliases/TextAlignment.md)

Defined in: [core/src/types/Document.ts:398](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L398)

Horizontal text alignment.

***

### hyphens?

> `optional` **hyphens?**: `boolean`

Defined in: [core/src/types/Document.ts:454](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L454)

Whether hyphenation is allowed.

#### Todo

Not yet implemented.

***

### indent?

> `optional` **indent?**: `number`

Defined in: [core/src/types/Document.ts:416](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L416)

Left indent (first-line indent / "red line") in px.
Applies only to the first line of the paragraph.

#### Todo

Rename or alias as `textIndent` for consistency with CSS.

***

### leftIndent?

> `optional` **leftIndent?**: `number`

Defined in: [core/src/types/Document.ts:418](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L418)

Left margin for the whole paragraph in px.

***

### letterSpacing?

> `optional` **letterSpacing?**: `number`

Defined in: [core/src/types/Document.ts:429](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L429)

Letter-spacing (tracking) for the whole paragraph in px.

***

### lineBreak?

> `optional` **lineBreak?**: [`LineBreak`](../type-aliases/LineBreak.md)

Defined in: [core/src/types/Document.ts:444](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L444)

Line-break strictness (CJK).

#### Todo

Not yet implemented.

***

### lineHeight

> **lineHeight**: `number`

Defined in: [core/src/types/Document.ts:405](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L405)

Line height as a **multiplier** relative to the font size.
E.g. `1.4` means 1.4× the computed font height.

#### Todo

Support for absolute px values via a `lineHeightUnit` field.

***

### listRestart?

> `optional` **listRestart?**: `boolean`

Defined in: [core/src/types/Document.ts:475](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L475)

Whether to restart numbering for this paragraph.
Only has effect when `listStyle.type === 'number'`.
When `true`, the auto-numbering counter resets to `listStyle.startNumber || 1`
for this paragraph and subsequent ones in the same sequence.

***

### listStyle?

> `optional` **listStyle?**: [`ListStyle`](ListStyle.md)

Defined in: [core/src/types/Document.ts:467](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L467)

List marker configuration (bullet or numbered).
When set, the paragraph is treated as a list item.

***

### overflowWrap?

> `optional` **overflowWrap?**: [`OverflowWrap`](../type-aliases/OverflowWrap.md)

Defined in: [core/src/types/Document.ts:449](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L449)

Overflow-wrap / word-wrap behaviour.

#### Todo

Not yet implemented.

***

### rightIndent?

> `optional` **rightIndent?**: `number`

Defined in: [core/src/types/Document.ts:420](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L420)

Right margin for the whole paragraph in px.

***

### spaceAfter

> **spaceAfter**: `number`

Defined in: [core/src/types/Document.ts:409](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L409)

Space **after** this paragraph (bottom margin) in px.

***

### spaceBefore

> **spaceBefore**: `number`

Defined in: [core/src/types/Document.ts:407](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L407)

Space **before** this paragraph (top margin) in px.

***

### textAlignLast?

> `optional` **textAlignLast?**: [`TextAlignLast`](../type-aliases/TextAlignLast.md)

Defined in: [core/src/types/Document.ts:434](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L434)

Alignment of the **last** line of a justified paragraph.

#### Todo

Not yet implemented.

***

### textIndent?

> `optional` **textIndent?**: `number`

Defined in: [core/src/types/Document.ts:427](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L427)

Indentation of the first line in px.
If set, overrides the generic `indent` for the first line.

#### Todo

Not yet implemented in the layout engine.

***

### whiteSpace?

> `optional` **whiteSpace?**: [`WhiteSpace`](../type-aliases/WhiteSpace.md)

Defined in: [core/src/types/Document.ts:461](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L461)

CSS `white-space` behaviour:
- `'normal'`: collapse whitespace, auto-wrap.
- `'nowrap'`: collapse whitespace, no wrap.
- `'pre'`: preserve whitespace, wrap on newline only.

***

### wordBreak?

> `optional` **wordBreak?**: [`WordBreak`](../type-aliases/WordBreak.md)

Defined in: [core/src/types/Document.ts:439](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L439)

Word-break rules (CJK / non-CJK).

#### Todo

Not yet implemented.
