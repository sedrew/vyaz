[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / TableCellStyle

# Interface: TableCellStyle

Defined in: [core/src/types/TableTypes.ts:80](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/TableTypes.ts#L80)

Style for a single `TableCell`. Falls back to `TableFrame.defaultCellStyle`.

## Extends

- [`BorderStyles`](BorderStyles.md)

## Properties

### allowOverflow?

> `optional` **allowOverflow?**: `boolean`

Defined in: [core/src/types/TableTypes.ts:100](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/TableTypes.ts#L100)

Let content wider/taller than the cell's padding box paint past its
edges instead of being clipped. Default `false` (clipped) — matches
`svg-table-core`'s default.

***

### bgColor?

> `optional` **bgColor?**: `string`

Defined in: [core/src/types/TableTypes.ts:82](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/TableTypes.ts#L82)

Cell background fill.

***

### borderColors?

> `optional` **borderColors?**: [`ColorsOnWidth`](../type-aliases/ColorsOnWidth.md)

Defined in: [core/src/types/TableTypes.ts:63](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/TableTypes.ts#L63)

Per-side border color, CSS shorthand. Default `'#000'` when a width is set.

#### Inherited from

[`BorderStyles`](BorderStyles.md).[`borderColors`](BorderStyles.md#bordercolors)

***

### borderPatterns?

> `optional` **borderPatterns?**: `BorderPatterns`

Defined in: [core/src/types/TableTypes.ts:68](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/TableTypes.ts#L68)

Per-side SVG `stroke-dasharray`. A side with no pattern (or the whole
property absent) is a solid line. `[4, 2]` = 4px dash, 2px gap, repeating.

#### Inherited from

[`BorderStyles`](BorderStyles.md).[`borderPatterns`](BorderStyles.md#borderpatterns)

***

### borderShapes?

> `optional` **borderShapes?**: [`Sides`](../type-aliases/Sides.md)\<`BorderLineCap`\>

Defined in: [core/src/types/TableTypes.ts:70](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/TableTypes.ts#L70)

Per-side `stroke-linecap` for that side's (dashed or solid) line. Default `'butt'`.

#### Inherited from

[`BorderStyles`](BorderStyles.md).[`borderShapes`](BorderStyles.md#bordershapes)

***

### borderWidths?

> `optional` **borderWidths?**: [`Widths`](../type-aliases/Widths.md)

Defined in: [core/src/types/TableTypes.ts:61](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/TableTypes.ts#L61)

Per-side border width, CSS shorthand. `0` (absent) = no border on that side.

#### Inherited from

[`BorderStyles`](BorderStyles.md).[`borderWidths`](BorderStyles.md#borderwidths)

***

### cx?

> `optional` **cx?**: `number`

Defined in: [core/src/types/TableTypes.ts:92](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/TableTypes.ts#L92)

Fine-tuning nudge applied to the cell's content position, in px, on top of
padding/alignment/`verticalAlign`. Positive `cx` moves right, positive
`cy` moves down. Default `0`.

***

### cy?

> `optional` **cy?**: `number`

Defined in: [core/src/types/TableTypes.ts:94](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/TableTypes.ts#L94)

#### See

cx

***

### paddings?

> `optional` **paddings?**: [`Widths`](../type-aliases/Widths.md)

Defined in: [core/src/types/TableTypes.ts:84](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/TableTypes.ts#L84)

Inner padding, CSS shorthand. Default `8` on all sides.

***

### rx?

> `optional` **rx?**: `number`

Defined in: [core/src/types/TableTypes.ts:72](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/TableTypes.ts#L72)

Uniform corner radius (all four corners). Asymmetric radii are a future addition.

#### Inherited from

[`BorderStyles`](BorderStyles.md).[`rx`](BorderStyles.md#rx)

***

### ry?

> `optional` **ry?**: `number`

Defined in: [core/src/types/TableTypes.ts:74](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/TableTypes.ts#L74)

Uniform corner radius; defaults to `rx` when only one is given.

#### Inherited from

[`BorderStyles`](BorderStyles.md).[`ry`](BorderStyles.md#ry)

***

### verticalAlign?

> `optional` **verticalAlign?**: [`VerticalAlignment`](../type-aliases/VerticalAlignment.md)

Defined in: [core/src/types/TableTypes.ts:86](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/TableTypes.ts#L86)

Vertical alignment of the cell's content within its row height. Default `'top'`.
