[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / groupLinesByParagraph

# Function: groupLinesByParagraph()

> **groupLinesByParagraph**(`lines`): [`ParagraphGroup`](../interfaces/ParagraphGroup.md)[]

Defined in: [core/src/utils/groupLinesByParagraph.ts:47](https://github.com/sedrew/vyaz/blob/main/packages/core/src/utils/groupLinesByParagraph.ts#L47)

Group lines by `pIdx` (paragraph index).

Collects **all** lines with the same `pIdx` into one group,
even if they are not consecutive in the array (multi-column layout
may interleave lines of different paragraphs across columns).

Returns groups sorted by `pIdx` in document order.
Lines without a valid `pIdx` (e.g. `pIdx === undefined`) are grouped
as index `-1`.

## Parameters

### lines

[`Line`](../interfaces/Line.md)[]

— flat array of lines from `layoutTextFrame`

## Returns

[`ParagraphGroup`](../interfaces/ParagraphGroup.md)[]

groups of lines grouped by paragraph

## Example

```ts
const result = layoutTextFrame(frame);
const groups = groupLinesByParagraph(result.lines);
// groups[0].lines  → all lines for paragraph 0 (across all columns)
// groups[0].pIdx   → 0
```
