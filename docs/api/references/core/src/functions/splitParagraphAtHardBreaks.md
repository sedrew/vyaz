[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / splitParagraphAtHardBreaks

# Function: splitParagraphAtHardBreaks()

> **splitParagraphAtHardBreaks**(`paragraph`): [`HardBreakPiece`](../interfaces/HardBreakPiece.md)[]

Defined in: [core/src/compile/ParagraphCompiler.ts:253](https://github.com/sedrew/vyaz/blob/main/packages/core/src/compile/ParagraphCompiler.ts#L253)

Zero phase: split a paragraph on `\n` for `pre` / `pre-line` / `pre-wrap`
into one piece per line-break-free stretch, keeping where each piece sits in
the source text. Any other `white-space` returns the paragraph as one piece.

For `pre-line` whitespace is collapsed per piece. An empty piece (`\n\n`, or
a trailing `\n`) keeps one empty run with the style of the run whose `\n`
produced it, so its line gets that run's size.

## Parameters

### paragraph

[`Paragraph`](../interfaces/Paragraph.md)

## Returns

[`HardBreakPiece`](../interfaces/HardBreakPiece.md)[]

## Example

```ts
"Hello\n\nWorld" (pre-line) → "Hello" | "" | "World"   (3 lines)
  ["Hello Bold", "\n", "World"] (pre) → "Hello Bold" | "World"   (2 lines)
  "Hello\n" → "Hello" | ""   (the caller decides whether a trailing empty piece is a line)
```
