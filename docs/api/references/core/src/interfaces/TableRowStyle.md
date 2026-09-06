[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / TableRowStyle

# Interface: TableRowStyle

Defined in: [core/src/types/TableTypes.ts:155](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/TableTypes.ts#L155)

Style for a `TableRow`. Falls back to `TableFrame.defaultRowStyle`.

## Extends

- [`BorderStyles`](BorderStyles.md)

## Properties

### bgColor?

> `optional` **bgColor?**: `string`

Defined in: [core/src/types/TableTypes.ts:159](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/TableTypes.ts#L159)

Row background fill, painted under `TableCellStyle.bgColor`.

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

### height?

> `optional` **height?**: `number`

Defined in: [core/src/types/TableTypes.ts:157](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/TableTypes.ts#L157)

Explicit row height override, in px. Auto (tallest cell) when absent.

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
