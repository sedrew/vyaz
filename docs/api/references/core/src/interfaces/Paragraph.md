[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / Paragraph

# Interface: Paragraph

Defined in: [core/src/types/Document.ts:614](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L614)

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

Defined in: [core/src/types/Document.ts:620](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L620)

Inline-level text runs forming the paragraph.

***

### id?

> `optional` **id?**: `string`

Defined in: [core/src/types/Document.ts:616](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L616)

Unique identifier for this paragraph (optional, for debugging).

***

### rule?

> `optional` **rule?**: `object`

Defined in: [core/src/types/Document.ts:628](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L628)

When set, this paragraph **is** a horizontal rule (`<hr>`) — `children`
is ignored (should be `[]`) and the paragraph lays out as a single line
spanning the full available content width, painted as a horizontal bar
`thickness` px tall instead of text. `style.spaceBefore`/`spaceAfter`
still apply as the rule's own vertical margin.

#### color

> **color**: `string`

#### thickness

> **thickness**: `number`

***

### style

> **style**: [`ParagraphStyle`](ParagraphStyle.md)

Defined in: [core/src/types/Document.ts:618](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L618)

Block-level paragraph style.
