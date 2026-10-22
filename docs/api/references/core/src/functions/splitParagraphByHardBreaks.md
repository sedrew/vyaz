[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / splitParagraphByHardBreaks

# Function: splitParagraphByHardBreaks()

> **splitParagraphByHardBreaks**(`paragraph`): [`Paragraph`](../interfaces/Paragraph.md)[]

Defined in: [core/src/compile/ParagraphCompiler.ts:314](https://github.com/sedrew/vyaz/blob/main/packages/core/src/compile/ParagraphCompiler.ts#L314)

Split a paragraph into virtual paragraphs on `\n` — the paragraphs of
[splitParagraphAtHardBreaks](splitParagraphAtHardBreaks.md). For `normal` / `nowrap` / unset returns
`[paragraph]` unchanged.

## Parameters

### paragraph

[`Paragraph`](../interfaces/Paragraph.md)

## Returns

[`Paragraph`](../interfaces/Paragraph.md)[]
