[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / Paragraph

# Interface: Paragraph

Defined in: [core/src/types/Document.ts:495](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L495)

A single paragraph (block-level text container).

Contains one or more `TextRun` children that form the paragraph content.

## Example

```ts
{
  id: "p-1",
  style: { alignment: "left", lineHeight: 1.4, spaceBefore: 0, spaceAfter: 12 },
  children: [
    { text: "Hello ", fontFamily: "Arial", fontSize: 16, fontWeight: "bold", color: "#000" },
    { text: "world!", fontFamily: "Arial", fontSize: 16, fontWeight: "normal", color: "#333" },
  ]
}
```

## Properties

### children

> **children**: [`TextRun`](TextRun.md)[]

Defined in: [core/src/types/Document.ts:501](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L501)

Inline-level text runs forming the paragraph.

***

### id?

> `optional` **id?**: `string`

Defined in: [core/src/types/Document.ts:497](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L497)

Unique identifier for this paragraph (optional, for debugging).

***

### style

> **style**: [`ParagraphStyle`](ParagraphStyle.md)

Defined in: [core/src/types/Document.ts:499](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L499)

Block-level paragraph style.
