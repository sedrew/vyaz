[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / ParagraphStyle

# Interface: ParagraphStyle

Defined in: [core/src/types/Document.ts:451](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L451)

Block-level style for a paragraph.

Controls alignment, spacing, indentation,
and line-breaking rules for all runs inside the paragraph.

## See

[CSS Text Module Level 3](https://www.w3.org/TR/css-text-3/)

## Properties

### alignment

> **alignment**: [`TextAlignment`](../type-aliases/TextAlignment.md)

Defined in: [core/src/types/Document.ts:453](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L453)

Horizontal text alignment.

***

### hyphens?

> `optional` **hyphens?**: `boolean`

Defined in: [core/src/types/Document.ts:509](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L509)

**`Experimental`**

Whether hyphenation is allowed.
 Accepted in the type but ignored by the layout engine (no-op until implemented).

***

### indent?

> `optional` **indent?**: `number`

Defined in: [core/src/types/Document.ts:471](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L471)

Left indent (first-line indent / "red line") in px.
Applies only to the first line of the paragraph.

#### Todo

Rename or alias as `textIndent` for consistency with CSS.

***

### leftIndent?

> `optional` **leftIndent?**: `number`

Defined in: [core/src/types/Document.ts:473](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L473)

Left margin for the whole paragraph in px.

***

### letterSpacing?

> `optional` **letterSpacing?**: `number`

Defined in: [core/src/types/Document.ts:484](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L484)

Letter-spacing (tracking) for the whole paragraph in px.

***

### lineBreak?

> `optional` **lineBreak?**: [`LineBreak`](../type-aliases/LineBreak.md)

Defined in: [core/src/types/Document.ts:499](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L499)

**`Experimental`**

Line-break strictness (CJK).
 Accepted in the type but ignored by the layout engine (no-op until implemented).

***

### lineHeight

> **lineHeight**: `number`

Defined in: [core/src/types/Document.ts:460](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L460)

Line height as a **multiplier** relative to the font size.
E.g. `1.4` means 1.4× the computed font height.

#### Todo

Support for absolute px values via a `lineHeightUnit` field.

***

### listRestart?

> `optional` **listRestart?**: `boolean`

Defined in: [core/src/types/Document.ts:531](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L531)

Whether to restart numbering for this paragraph.
Only has effect when `listStyle.type === 'number'`.
When `true`, the auto-numbering counter resets to `listStyle.startNumber || 1`
for this paragraph and subsequent ones in the same sequence.

***

### listStyle?

> `optional` **listStyle?**: [`ListStyle`](ListStyle.md)

Defined in: [core/src/types/Document.ts:523](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L523)

List marker configuration (bullet or numbered).
When set, the paragraph is treated as a list item.

***

### overflowWrap?

> `optional` **overflowWrap?**: [`OverflowWrap`](../type-aliases/OverflowWrap.md)

Defined in: [core/src/types/Document.ts:504](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L504)

**`Experimental`**

Overflow-wrap / word-wrap behaviour.
 Accepted in the type but ignored by the layout engine (no-op until implemented).

***

### rightIndent?

> `optional` **rightIndent?**: `number`

Defined in: [core/src/types/Document.ts:475](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L475)

Right margin for the whole paragraph in px.

***

### spaceAfter

> **spaceAfter**: `number`

Defined in: [core/src/types/Document.ts:464](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L464)

Space **after** this paragraph (bottom margin) in px.

***

### spaceBefore

> **spaceBefore**: `number`

Defined in: [core/src/types/Document.ts:462](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L462)

Space **before** this paragraph (top margin) in px.

***

### textAlignLast?

> `optional` **textAlignLast?**: [`TextAlignLast`](../type-aliases/TextAlignLast.md)

Defined in: [core/src/types/Document.ts:489](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L489)

**`Experimental`**

Alignment of the **last** line of a justified paragraph.
 Accepted in the type but ignored by the layout engine (no-op until implemented).

***

### textIndent?

> `optional` **textIndent?**: `number`

Defined in: [core/src/types/Document.ts:482](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L482)

**`Experimental`**

Indentation of the first line in px.
If set, overrides the generic `indent` for the first line.

 Accepted in the type but ignored by the layout engine (no-op until implemented).

***

### whiteSpace?

> `optional` **whiteSpace?**: [`WhiteSpace`](../type-aliases/WhiteSpace.md)

Defined in: [core/src/types/Document.ts:517](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L517)

CSS `white-space` behaviour:
- `'normal'`: collapse whitespace, auto-wrap.
- `'nowrap'`: collapse whitespace, no wrap.
- `'pre'`: preserve whitespace, wrap on newline only.
- `'pre-line'`: collapse whitespace, wrap on newline and auto-wrap.

***

### wordBreak?

> `optional` **wordBreak?**: [`WordBreak`](../type-aliases/WordBreak.md)

Defined in: [core/src/types/Document.ts:494](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L494)

**`Experimental`**

Word-break rules (CJK / non-CJK).
 Accepted in the type but ignored by the layout engine (no-op until implemented).
