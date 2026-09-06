[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / TableCell

# Interface: TableCell

Defined in: [core/src/types/TableTypes.ts:121](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/TableTypes.ts#L121)

One table cell. `content` is usually a full `TextFrame` — the same
recursive shape as everywhere else in vyaz, laid out and rendered like any
other text box — but can also be a `TableFrame`, nesting a table inside
this cell (distinguished by shape: a `TableFrame` has `rows`, a `TextFrame`
has `paragraphs` — see `isNestedTable` in `TableLayoutEngine.ts`).

`content.width` and `content.wrap` (`TextFrame`) / `content.width`
(`TableFrame`) are overridden by the table layout (the column width
decides them); set everything else as usual.

Nesting depth is unbounded here (a `TableFrame` cell can itself contain a
cell with a `TableFrame`, and so on) but `layoutTableFrame` throws past a
hard ceiling (50) as a guard against a pathological/cyclic structure — see
`TableLayoutOptions._depth`. `@vyaz/converters`'s own HTML `<table>`-in-`<table>`
conversion does not yet build this shape (still a follow-up); this is the
`TableFrame`-level primitive it would build on.

## Properties

### after?

> `optional` **after?**: [`TextFrame`](TextFrame.md)

Defined in: [core/src/types/TableTypes.ts:149](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/TableTypes.ts#L149)

#### See

before — anchored to the right edge instead.

***

### before?

> `optional` **before?**: [`TextFrame`](TextFrame.md)

Defined in: [core/src/types/TableTypes.ts:147](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/TableTypes.ts#L147)

Decorative content anchored to the cell's left edge, vertically centered
in the cell's full height — independent of `content`'s own alignment
(an icon glyph, a status marker, a leading label). Laid out unwrapped at
its own natural size and does *not* contribute to column-width
measurement — a narrow column can make `before`/`after` overlap
`content`, same tradeoff as `allowOverflow`. svg-table-core's `before`
accepts arbitrary render callbacks; this is a `TextFrame` like every
other content slot in vyaz, not an arbitrary-content callback.

***

### colSpan?

> `optional` **colSpan?**: `number` \| `"auto"`

Defined in: [core/src/types/TableTypes.ts:133](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/TableTypes.ts#L133)

Columns this cell spans. Default `1`. `'auto'` — only honoured on the
*last* cell of a row — stretches it to fill every remaining column, so a
ragged/short row lines its trailing border up with the widest row
instead of leaving a gap. Unlike svg-table-core (where the last cell of
*every* row does this implicitly), this is opt-in: a genuinely short
last cell keeps `colSpan: 1` unless you ask for `'auto'`. Elsewhere in a
row (not the last cell) `'auto'` is a no-op (`colSpan: 1`) — expanding a
non-trailing cell would overlap the cells after it.

***

### content

> **content**: [`TextFrame`](TextFrame.md) \| [`TableFrame`](TableFrame.md)

Defined in: [core/src/types/TableTypes.ts:122](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/TableTypes.ts#L122)

***

### rowSpan?

> `optional` **rowSpan?**: `number`

Defined in: [core/src/types/TableTypes.ts:135](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/TableTypes.ts#L135)

Rows this cell spans. Default `1`.

***

### style?

> `optional` **style?**: `Partial`\<[`TableCellStyle`](TableCellStyle.md)\>

Defined in: [core/src/types/TableTypes.ts:136](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/TableTypes.ts#L136)
