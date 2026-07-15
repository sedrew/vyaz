[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / MultiColumnConfig

# Interface: MultiColumnConfig

Defined in: [core/src/types/Document.ts:520](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L520)

Configuration for multi-column layout (flowing columns).

Follows the CSS Multi-column Layout model:
the **parent** frame holds a single flow of paragraphs;
the layout engine automatically breaks the content into columns
based on `columnCount` and `columnGap`.

Columns are **not** independent containers with their own paragraphs.
If you need independent columns (each with separate content),
use multiple `TextFrame` instances placed side-by-side.

## See

[CSS Multi-column Layout Level 1](https://www.w3.org/TR/css-multicol-1/)

## Properties

### count

> **count**: `number`

Defined in: [core/src/types/Document.ts:522](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L522)

Number of columns (like CSS `column-count`).

***

### fill?

> `optional` **fill?**: `"auto"` \| `"balance"`

Defined in: [core/src/types/Document.ts:535](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L535)

Column fill strategy:
- `'auto'`: fill columns sequentially (top-to-bottom, then next column).
- `'balance'`: distribute lines evenly across columns.

Defaults to `'auto'` when absent.

#### See

[CSS Multi-column: column-fill](https://www.w3.org/TR/css-multicol-1/#cf)

#### Todo

`'balance'` not yet implemented.

***

### gap

> **gap**: `number`

Defined in: [core/src/types/Document.ts:524](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L524)

Gap between columns in px (like CSS `column-gap`).
