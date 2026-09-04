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

Defined in: [core/src/compile/ParagraphCompiler.ts:61](https://github.com/sedrew/vyaz/blob/main/packages/core/src/compile/ParagraphCompiler.ts#L61)

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

Defined in: [core/src/compile/ParagraphCompiler.ts:60](https://github.com/sedrew/vyaz/blob/main/packages/core/src/compile/ParagraphCompiler.ts#L60)

Original text before text-transform (if transform was applied). Used for copy-paste / round-trip.

***

### text

> **text**: `string`

Defined in: [core/src/compile/ParagraphCompiler.ts:54](https://github.com/sedrew/vyaz/blob/main/packages/core/src/compile/ParagraphCompiler.ts#L54)
