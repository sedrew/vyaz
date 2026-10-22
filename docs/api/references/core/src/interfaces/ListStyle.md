[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / ListStyle

# Interface: ListStyle

Defined in: [core/src/types/Document.ts:420](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L420)

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

Defined in: [core/src/types/Document.ts:437](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L437)

Override marker character for bullet lists.
If not set, defaults depend on `level`:
- level 0: `'•'` (U+2022 BULLET)
- level 1: `'○'` (U+25CB WHITE CIRCLE)
- level 2: `'▪'` (U+25AA BLACK SMALL SQUARE)

***

### bulletFont?

> `optional` **bulletFont?**: `string`

Defined in: [core/src/types/Document.ts:479](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L479)

Font family for the marker (DrawingML `buFont`). Defaults to the font of
the paragraph's first run.

***

### bulletIndent?

> `optional` **bulletIndent?**: `number`

Defined in: [core/src/types/Document.ts:458](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L458)

Indent in px for the marker zone.
All lines of the paragraph share this indent (for `outside` position).
Default: `fontSize * 1.5` (from the paragraph-level font size).

For numbered lists, the engine expands this to fit the widest marker
across the entire list group.

***

### bulletSize?

> `optional` **bulletSize?**: `number`

Defined in: [core/src/types/Document.ts:473](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L473)

Marker size relative to the paragraph's first run (DrawingML `buSzPct`
/ 100 000, e.g. `0.5` = 50 %). Defaults to `1` for numbers; for bullets
`0.9` in `mode: 'browser'` and `1` in `mode: 'office'` (PowerPoint's
default, measured).

***

### indents?

> `optional` **indents?**: `number`[]

Defined in: [core/src/types/Document.ts:465](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L465)

Per-level indent overrides (indexed by nesting level).
E.g. `indents[1]` is the indent for level 1 (first nested).
Falls back to `bulletIndent * (level + 1)` if not specified.

***

### level?

> `optional` **level?**: `number`

Defined in: [core/src/types/Document.ts:425](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L425)

List nesting level (0-based). 0 = top-level.

***

### numberFormat?

> `optional` **numberFormat?**: [`NumberFormat`](../type-aliases/NumberFormat.md)

Defined in: [core/src/types/Document.ts:440](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L440)

Numbering format (only used when `type === 'number'`). Defaults to `'decimal'`.

***

### position?

> `optional` **position?**: [`ListStylePosition`](../type-aliases/ListStylePosition.md)

Defined in: [core/src/types/Document.ts:428](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L428)

Marker position. Defaults to `'outside'`.

***

### startNumber?

> `optional` **startNumber?**: `number`

Defined in: [core/src/types/Document.ts:448](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L448)

Starting number for numbered lists. Defaults to 1. On a later item it
starts a new count unless it equals the current count's own start or the
next number (so it can be set on every item, as DrawingML `startAt` and
`@vyaz/converters`' `<ol start>` do).

***

### type

> **type**: [`ListType`](../type-aliases/ListType.md)

Defined in: [core/src/types/Document.ts:422](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L422)

List type.
