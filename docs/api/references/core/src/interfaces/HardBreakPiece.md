[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / HardBreakPiece

# Interface: HardBreakPiece

Defined in: [core/src/compile/ParagraphCompiler.ts:228](https://github.com/sedrew/vyaz/blob/main/packages/core/src/compile/ParagraphCompiler.ts#L228)

One line-break-free piece of a paragraph — see [splitParagraphAtHardBreaks](../functions/splitParagraphAtHardBreaks.md).

## Properties

### endsWithBreak

> **endsWithBreak**: `boolean`

Defined in: [core/src/compile/ParagraphCompiler.ts:236](https://github.com/sedrew/vyaz/blob/main/packages/core/src/compile/ParagraphCompiler.ts#L236)

The piece is followed by a `\n` (which belongs to it, after its text).

***

### paragraph

> **paragraph**: [`Paragraph`](Paragraph.md)

Defined in: [core/src/compile/ParagraphCompiler.ts:230](https://github.com/sedrew/vyaz/blob/main/packages/core/src/compile/ParagraphCompiler.ts#L230)

The piece as a paragraph of its own (whitespace already collapsed for `pre-line`).

***

### sourceStart

> **sourceStart**: `number`

Defined in: [core/src/compile/ParagraphCompiler.ts:232](https://github.com/sedrew/vyaz/blob/main/packages/core/src/compile/ParagraphCompiler.ts#L232)

Offset of the piece in the source paragraph text (`children` texts joined).

***

### sourceTexts

> **sourceTexts**: `string`[]

Defined in: [core/src/compile/ParagraphCompiler.ts:234](https://github.com/sedrew/vyaz/blob/main/packages/core/src/compile/ParagraphCompiler.ts#L234)

Source text of each of `paragraph.children`, before collapsing.
