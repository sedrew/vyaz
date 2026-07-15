[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / PreparedRichInlineItem

# Interface: PreparedRichInlineItem

Defined in: [core/src/compile/DocumentCompiler.ts:50](https://github.com/sedrew/vyaz/blob/main/packages/core/src/compile/DocumentCompiler.ts#L50)

Compilation context (passed to pretext)

## Properties

### break?

> `optional` **break?**: `"normal"` \| `"never"`

Defined in: [core/src/compile/DocumentCompiler.ts:55](https://github.com/sedrew/vyaz/blob/main/packages/core/src/compile/DocumentCompiler.ts#L55)

***

### extraWidth?

> `optional` **extraWidth?**: `number`

Defined in: [core/src/compile/DocumentCompiler.ts:54](https://github.com/sedrew/vyaz/blob/main/packages/core/src/compile/DocumentCompiler.ts#L54)

***

### font

> **font**: `string`

Defined in: [core/src/compile/DocumentCompiler.ts:52](https://github.com/sedrew/vyaz/blob/main/packages/core/src/compile/DocumentCompiler.ts#L52)

***

### letterSpacing?

> `optional` **letterSpacing?**: `number`

Defined in: [core/src/compile/DocumentCompiler.ts:53](https://github.com/sedrew/vyaz/blob/main/packages/core/src/compile/DocumentCompiler.ts#L53)

***

### metadata

> **metadata**: `object`

Defined in: [core/src/compile/DocumentCompiler.ts:58](https://github.com/sedrew/vyaz/blob/main/packages/core/src/compile/DocumentCompiler.ts#L58)

#### baselineOffset

> **baselineOffset**: `number`

#### effectiveFontSize

> **effectiveFontSize**: `number`

#### inlineWidget?

> `optional` **inlineWidget?**: [`InlineWidget`](InlineWidget.md)

#### originalRunIndex

> **originalRunIndex**: `number`

#### style

> **style**: [`TextRun`](TextRun.md)

***

### originalText?

> `optional` **originalText?**: `string`

Defined in: [core/src/compile/DocumentCompiler.ts:57](https://github.com/sedrew/vyaz/blob/main/packages/core/src/compile/DocumentCompiler.ts#L57)

Original text before text-transform (if transform was applied). Used for copy-paste / round-trip.

***

### text

> **text**: `string`

Defined in: [core/src/compile/DocumentCompiler.ts:51](https://github.com/sedrew/vyaz/blob/main/packages/core/src/compile/DocumentCompiler.ts#L51)
