[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / ListStyle

# Interface: ListStyle

Defined in: [core/src/types/Document.ts:398](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L398)

Configuration for list markers (bullet or numbered).

Applies to the paragraph via `ParagraphStyle.listStyle`.
Nested lists are supported via the `level` field (0-based).

**Width consistency:**
For `position: 'outside'`, all lines share the same indent regardless of
marker width. Paragraph indentation = `bulletIndent` (or default `fontSize * 1.5`).
The marker is positioned inside that zone. If the marker text is wider than
the indent zone, `bulletIndent` is expanded to fit the **widest marker**
across the entire list group during layout.

## See

[CSS Lists and Counters Module Level 3](https://www.w3.org/TR/css-lists-3/)

## Example

```ts
// Simple bullet list
{ type: 'bullet', position: 'outside', bulletChar: '•' }

// Numbered list starting at 5
{ type: 'number', numberFormat: 'decimal', startNumber: 5 }
```

## Properties

### bulletChar?

> `optional` **bulletChar?**: `string`

Defined in: [core/src/types/Document.ts:415](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L415)

Override marker character for bullet lists.
If not set, defaults depend on `level`:
- level 0: `'•'` (U+2022 BULLET)
- level 1: `'○'` (U+25CB WHITE CIRCLE)
- level 2: `'▪'` (U+25AA BLACK SMALL SQUARE)

***

### bulletIndent?

> `optional` **bulletIndent?**: `number`

Defined in: [core/src/types/Document.ts:431](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L431)

Indent in px for the marker zone.
All lines of the paragraph share this indent (for `outside` position).
Default: `fontSize * 1.5` (from the paragraph-level font size).

For numbered lists, the engine expands this to fit the widest marker
across the entire list group.

***

### indents?

> `optional` **indents?**: `number`[]

Defined in: [core/src/types/Document.ts:438](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L438)

Per-level indent overrides (indexed by nesting level).
E.g. `indents[1]` is the indent for level 1 (first nested).
Falls back to `bulletIndent * (level + 1)` if not specified.

***

### level?

> `optional` **level?**: `number`

Defined in: [core/src/types/Document.ts:403](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L403)

List nesting level (0-based). 0 = top-level.

***

### numberFormat?

> `optional` **numberFormat?**: [`NumberFormat`](../type-aliases/NumberFormat.md)

Defined in: [core/src/types/Document.ts:418](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L418)

Numbering format (only used when `type === 'number'`). Defaults to `'decimal'`.

***

### position?

> `optional` **position?**: [`ListStylePosition`](../type-aliases/ListStylePosition.md)

Defined in: [core/src/types/Document.ts:406](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L406)

Marker position. Defaults to `'outside'`.

***

### startNumber?

> `optional` **startNumber?**: `number`

Defined in: [core/src/types/Document.ts:421](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L421)

Starting number for numbered lists. Defaults to 1.

***

### type

> **type**: [`ListType`](../type-aliases/ListType.md)

Defined in: [core/src/types/Document.ts:400](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L400)

List type.
