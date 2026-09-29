[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / PreparedRichInlineItem

# Interface: PreparedRichInlineItem

Defined in: [core/src/compile/ParagraphCompiler.ts:53](https://github.com/sedrew/vyaz/blob/main/packages/core/src/compile/ParagraphCompiler.ts#L53)

Compilation context (passed to pretext)

## Properties

### break?

> `optional` **break?**: `"normal"` \| `"never"`

Defined in: [core/src/compile/ParagraphCompiler.ts:58](https://github.com/sedrew/vyaz/blob/main/packages/core/src/compile/ParagraphCompiler.ts#L58)

***

### extraWidth?

> `optional` **extraWidth?**: `number`

Defined in: [core/src/compile/ParagraphCompiler.ts:57](https://github.com/sedrew/vyaz/blob/main/packages/core/src/compile/ParagraphCompiler.ts#L57)

***

### font

> **font**: `string`

Defined in: [core/src/compile/ParagraphCompiler.ts:55](https://github.com/sedrew/vyaz/blob/main/packages/core/src/compile/ParagraphCompiler.ts#L55)

***

### letterSpacing?

> `optional` **letterSpacing?**: `number`

Defined in: [core/src/compile/ParagraphCompiler.ts:56](https://github.com/sedrew/vyaz/blob/main/packages/core/src/compile/ParagraphCompiler.ts#L56)

***

### metadata

> **metadata**: `object`

Defined in: [core/src/compile/ParagraphCompiler.ts:68](https://github.com/sedrew/vyaz/blob/main/packages/core/src/compile/ParagraphCompiler.ts#L68)

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

Defined in: [core/src/compile/ParagraphCompiler.ts:67](https://github.com/sedrew/vyaz/blob/main/packages/core/src/compile/ParagraphCompiler.ts#L67)

Original text before text-transform (if transform was applied). Used for copy-paste / round-trip.

***

### overflowWrap?

> `optional` **overflowWrap?**: `"normal"` \| `"break-word"` \| `"anywhere"`

Defined in: [core/src/compile/ParagraphCompiler.ts:65](https://github.com/sedrew/vyaz/blob/main/packages/core/src/compile/ParagraphCompiler.ts#L65)

CSS `overflow-wrap` for this run's text — from the paragraph's
`overflowWrap` style. `'normal'` (the default) means a word wider than
the available width overflows the line instead of being force-split at
grapheme boundaries.

***

### text

> **text**: `string`

Defined in: [core/src/compile/ParagraphCompiler.ts:54](https://github.com/sedrew/vyaz/blob/main/packages/core/src/compile/ParagraphCompiler.ts#L54)
