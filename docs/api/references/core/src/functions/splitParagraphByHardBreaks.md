[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / splitParagraphByHardBreaks

# Function: splitParagraphByHardBreaks()

> **splitParagraphByHardBreaks**(`paragraph`): [`Paragraph`](../interfaces/Paragraph.md)[]

Defined in: [core/src/compile/DocumentCompiler.ts:203](https://github.com/sedrew/vyaz/blob/main/packages/core/src/compile/DocumentCompiler.ts#L203)

Zero phase: split a Paragraph into virtual Paragraph[] on \n boundaries.

For `pre-line`: whitespace is collapsed per segment.
For `pre`/`pre-wrap`: whitespace is preserved.
For `normal`/`nowrap`/`undefined`: returns [paragraph] unchanged.

Each \n produces an empty Paragraph (children: []) which the layout engine
can fast-path as a hard-break line.

Supports multi-run: when a run contains \n, the text after \n starts
a new virtual paragraph. Runs after the split run belong to the new
paragraph.

## Parameters

### paragraph

[`Paragraph`](../interfaces/Paragraph.md)

## Returns

[`Paragraph`](../interfaces/Paragraph.md)[]

## Example

```ts
"Hello\nWorld" (pre-line)
    → [{ children: [{ text: "Hello" }] }, { children: [{ text: "World" }] }]

  "Hello\n\nWorld" (pre-line)
    → [{ children: [{ text: "Hello" }] }, { children: [] }, { children: [{ text: "World" }] }]

  ["Hello Bold", "\n", "World"] (pre)
    → [{ children: [{ text: "Hello Bold" }] }, { children: [] }, { children: [{ text: "World" }] }]
```
