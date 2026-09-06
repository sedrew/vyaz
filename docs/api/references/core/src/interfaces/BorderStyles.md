[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / BorderStyles

# Interface: BorderStyles

Defined in: [core/src/types/TableTypes.ts:59](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/TableTypes.ts#L59)

Solid per-side border + a uniform corner radius. Shared by `TableStyle`
(the table's own outer border), `TableRowStyle` and `TableCellStyle`.

## See

TableTypes.ts header — modelled on svg-table-core's `BorderStyles`.
     Asymmetric corner radii are a possible future addition; everything
     else in svg-table-core's `BorderStyles` is covered.

## Extended by

- [`TableStyle`](TableStyle.md)
- [`TableRowStyle`](TableRowStyle.md)
- [`TableCellStyle`](TableCellStyle.md)

## Properties

### borderColors?

> `optional` **borderColors?**: [`ColorsOnWidth`](../type-aliases/ColorsOnWidth.md)

Defined in: [core/src/types/TableTypes.ts:63](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/TableTypes.ts#L63)

Per-side border color, CSS shorthand. Default `'#000'` when a width is set.

***

### borderPatterns?

> `optional` **borderPatterns?**: `BorderPatterns`

Defined in: [core/src/types/TableTypes.ts:68](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/TableTypes.ts#L68)

Per-side SVG `stroke-dasharray`. A side with no pattern (or the whole
property absent) is a solid line. `[4, 2]` = 4px dash, 2px gap, repeating.

***

### borderShapes?

> `optional` **borderShapes?**: [`Sides`](../type-aliases/Sides.md)\<`BorderLineCap`\>

Defined in: [core/src/types/TableTypes.ts:70](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/TableTypes.ts#L70)

Per-side `stroke-linecap` for that side's (dashed or solid) line. Default `'butt'`.

***

### borderWidths?

> `optional` **borderWidths?**: [`Widths`](../type-aliases/Widths.md)

Defined in: [core/src/types/TableTypes.ts:61](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/TableTypes.ts#L61)

Per-side border width, CSS shorthand. `0` (absent) = no border on that side.

***

### rx?

> `optional` **rx?**: `number`

Defined in: [core/src/types/TableTypes.ts:72](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/TableTypes.ts#L72)

Uniform corner radius (all four corners). Asymmetric radii are a future addition.

***

### ry?

> `optional` **ry?**: `number`

Defined in: [core/src/types/TableTypes.ts:74](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/TableTypes.ts#L74)

Uniform corner radius; defaults to `rx` when only one is given.
