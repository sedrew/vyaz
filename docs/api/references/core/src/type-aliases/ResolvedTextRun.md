[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / ResolvedTextRun

# Type Alias: ResolvedTextRun

> **ResolvedTextRun** = `Omit`\<[`TextRun`](../interfaces/TextRun.md), `"fontFamily"`\> & `object`

Defined in: [core/src/types/Document.ts:307](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L307)

A `TextRun` after the layout engine has resolved its `fontFamily` fallback
list down to one concrete registered family. This is what `Span.style` and
the compiled items carry — never a `string[]`.

## Type Declaration

### fontFamily

> **fontFamily**: `string`
