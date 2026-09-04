[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / ParagraphStyle

# Interface: ParagraphStyle

Defined in: [core/src/types/Document.ts:413](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L413)

Block-level style for a paragraph.

Controls alignment, spacing, indentation,
and line-breaking rules for all runs inside the paragraph.

## See

[CSS Text Module Level 3](https://www.w3.org/TR/css-text-3/)

## Properties

### alignment

> **alignment**: [`TextAlignment`](../type-aliases/TextAlignment.md)

Defined in: [core/src/types/Document.ts:415](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L415)

Horizontal text alignment.

***

### hyphens?

> `optional` **hyphens?**: `boolean`

Defined in: [core/src/types/Document.ts:471](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L471)

**`Experimental`**

Whether hyphenation is allowed.
 Accepted in the type but ignored by the layout engine (no-op until implemented).

***

### indent?

> `optional` **indent?**: `number`

Defined in: [core/src/types/Document.ts:433](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L433)

Left indent (first-line indent / "red line") in px.
Applies only to the first line of the paragraph.

#### Todo

Rename or alias as `textIndent` for consistency with CSS.

***

### leftIndent?

> `optional` **leftIndent?**: `number`

Defined in: [core/src/types/Document.ts:435](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L435)

Left margin for the whole paragraph in px.

***

### letterSpacing?

> `optional` **letterSpacing?**: `number`

Defined in: [core/src/types/Document.ts:446](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L446)

Letter-spacing (tracking) for the whole paragraph in px.

***

### lineBreak?

> `optional` **lineBreak?**: [`LineBreak`](../type-aliases/LineBreak.md)

Defined in: [core/src/types/Document.ts:461](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L461)

**`Experimental`**

Line-break strictness (CJK).
 Accepted in the type but ignored by the layout engine (no-op until implemented).

***

### lineHeight

> **lineHeight**: `number`

Defined in: [core/src/types/Document.ts:422](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L422)

Line height as a **multiplier** relative to the font size.
E.g. `1.4` means 1.4× the computed font height.

#### Todo

Support for absolute px values via a `lineHeightUnit` field.

***

### listRestart?

> `optional` **listRestart?**: `boolean`

Defined in: [core/src/types/Document.ts:493](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L493)

Whether to restart numbering for this paragraph.
Only has effect when `listStyle.type === 'number'`.
When `true`, the auto-numbering counter resets to `listStyle.startNumber || 1`
for this paragraph and subsequent ones in the same sequence.

***

### listStyle?

> `optional` **listStyle?**: [`ListStyle`](ListStyle.md)

Defined in: [core/src/types/Document.ts:485](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L485)

List marker configuration (bullet or numbered).
When set, the paragraph is treated as a list item.

***

### overflowWrap?

> `optional` **overflowWrap?**: [`OverflowWrap`](../type-aliases/OverflowWrap.md)

Defined in: [core/src/types/Document.ts:466](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L466)

**`Experimental`**

Overflow-wrap / word-wrap behaviour.
 Accepted in the type but ignored by the layout engine (no-op until implemented).

***

### rightIndent?

> `optional` **rightIndent?**: `number`

Defined in: [core/src/types/Document.ts:437](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L437)

Right margin for the whole paragraph in px.

***

### spaceAfter

> **spaceAfter**: `number`

Defined in: [core/src/types/Document.ts:426](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L426)

Space **after** this paragraph (bottom margin) in px.

***

### spaceBefore

> **spaceBefore**: `number`

Defined in: [core/src/types/Document.ts:424](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L424)

Space **before** this paragraph (top margin) in px.

***

### textAlignLast?

> `optional` **textAlignLast?**: [`TextAlignLast`](../type-aliases/TextAlignLast.md)

Defined in: [core/src/types/Document.ts:451](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L451)

**`Experimental`**

Alignment of the **last** line of a justified paragraph.
 Accepted in the type but ignored by the layout engine (no-op until implemented).

***

### textIndent?

> `optional` **textIndent?**: `number`

Defined in: [core/src/types/Document.ts:444](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L444)

**`Experimental`**

Indentation of the first line in px.
If set, overrides the generic `indent` for the first line.

 Accepted in the type but ignored by the layout engine (no-op until implemented).

***

### whiteSpace?

> `optional` **whiteSpace?**: [`WhiteSpace`](../type-aliases/WhiteSpace.md)

Defined in: [core/src/types/Document.ts:479](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L479)

CSS `white-space` behaviour:
- `'normal'`: collapse whitespace, auto-wrap.
- `'nowrap'`: collapse whitespace, no wrap.
- `'pre'`: preserve whitespace, wrap on newline only.
- `'pre-line'`: collapse whitespace, wrap on newline and auto-wrap.

***

### wordBreak?

> `optional` **wordBreak?**: [`WordBreak`](../type-aliases/WordBreak.md)

Defined in: [core/src/types/Document.ts:456](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L456)

**`Experimental`**

Word-break rules (CJK / non-CJK).
 Accepted in the type but ignored by the layout engine (no-op until implemented).
