[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / ResolvedBorder

# Interface: ResolvedBorder

Defined in: [core/src/layout/TableLayoutEngine.ts:59](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TableLayoutEngine.ts#L59)

A resolved, ready-to-paint border. Absent when every side's width is `0`.

## Properties

### colors

> **colors**: `Record`\<`Side`, `string`\>

Defined in: [core/src/layout/TableLayoutEngine.ts:61](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TableLayoutEngine.ts#L61)

***

### patterns?

> `optional` **patterns?**: `Record`\<`Side`, `number`[] \| `undefined`\>

Defined in: [core/src/layout/TableLayoutEngine.ts:63](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TableLayoutEngine.ts#L63)

Present only when at least one side has a non-empty dash pattern.

***

### rx?

> `optional` **rx?**: `number`

Defined in: [core/src/layout/TableLayoutEngine.ts:67](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TableLayoutEngine.ts#L67)

Present only when `rx`/`ry` was set anywhere in the style cascade.

***

### ry?

> `optional` **ry?**: `number`

Defined in: [core/src/layout/TableLayoutEngine.ts:68](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TableLayoutEngine.ts#L68)

***

### shapes?

> `optional` **shapes?**: `Record`\<`Side`, `BorderLineCap`\>

Defined in: [core/src/layout/TableLayoutEngine.ts:65](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TableLayoutEngine.ts#L65)

Present only when `borderShapes` was set anywhere in the style cascade.

***

### widths

> **widths**: `Record`\<`Side`, `number`\>

Defined in: [core/src/layout/TableLayoutEngine.ts:60](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TableLayoutEngine.ts#L60)
