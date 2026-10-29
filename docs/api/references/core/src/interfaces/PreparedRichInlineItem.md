[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / PreparedRichInlineItem

# Interface: PreparedRichInlineItem

Defined in: [core/src/compile/ParagraphCompiler.ts:58](https://github.com/sedrew/vyaz/blob/main/packages/core/src/compile/ParagraphCompiler.ts#L58)

Compilation context (passed to pretext). Paragraph-level line-breaking
options (`whiteSpace`, `overflowWrap`, `hyphenBreak`, `wordBreak`) go to
`prepareRichInline()` once for the paragraph, not per item; an inline-box
run is handed to pretext as a box of its widget's width.

## Properties

### font

> **font**: `string`

Defined in: [core/src/compile/ParagraphCompiler.ts:60](https://github.com/sedrew/vyaz/blob/main/packages/core/src/compile/ParagraphCompiler.ts#L60)

***

### letterSpacing?

> `optional` **letterSpacing?**: `number`

Defined in: [core/src/compile/ParagraphCompiler.ts:61](https://github.com/sedrew/vyaz/blob/main/packages/core/src/compile/ParagraphCompiler.ts#L61)

***

### metadata

> **metadata**: `object`

Defined in: [core/src/compile/ParagraphCompiler.ts:64](https://github.com/sedrew/vyaz/blob/main/packages/core/src/compile/ParagraphCompiler.ts#L64)

#### baselineOffset

> **baselineOffset**: `number`

#### effectiveFontSize

> **effectiveFontSize**: `number`

#### inlineWidget?

> `optional` **inlineWidget?**: [`InlineWidget`](InlineWidget.md)

#### originalRunIndex

> **originalRunIndex**: `number`

#### style

> **style**: [`ResolvedTextRun`](../type-aliases/ResolvedTextRun.md)

***

### originalText?

> `optional` **originalText?**: `string`

Defined in: [core/src/compile/ParagraphCompiler.ts:63](https://github.com/sedrew/vyaz/blob/main/packages/core/src/compile/ParagraphCompiler.ts#L63)

Original text before text-transform (if transform was applied). Used for copy-paste / round-trip.

***

### text

> **text**: `string`

Defined in: [core/src/compile/ParagraphCompiler.ts:59](https://github.com/sedrew/vyaz/blob/main/packages/core/src/compile/ParagraphCompiler.ts#L59)
