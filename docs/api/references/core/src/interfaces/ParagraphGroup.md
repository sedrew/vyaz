[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / ParagraphGroup

# Interface: ParagraphGroup

Defined in: [core/src/utils/groupLinesByParagraph.ts:16](https://github.com/sedrew/vyaz/blob/main/packages/core/src/utils/groupLinesByParagraph.ts#L16)

A group of lines belonging to one paragraph.

## Properties

### lines

> **lines**: [`Line`](Line.md)[]

Defined in: [core/src/utils/groupLinesByParagraph.ts:18](https://github.com/sedrew/vyaz/blob/main/packages/core/src/utils/groupLinesByParagraph.ts#L18)

Lines in this paragraph.

***

### pIdx

> **pIdx**: `number`

Defined in: [core/src/utils/groupLinesByParagraph.ts:20](https://github.com/sedrew/vyaz/blob/main/packages/core/src/utils/groupLinesByParagraph.ts#L20)

Paragraph index in TextFrame.paragraphs[].

***

### tag?

> `optional` **tag?**: `string`

Defined in: [core/src/utils/groupLinesByParagraph.ts:22](https://github.com/sedrew/vyaz/blob/main/packages/core/src/utils/groupLinesByParagraph.ts#L22)

Optional user-assigned tag (from Paragraph.id).
