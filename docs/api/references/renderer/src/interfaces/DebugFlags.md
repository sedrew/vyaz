[vyaz-monorepo](../../../index.md) / [renderer/src](../index.md) / DebugFlags

# Interface: DebugFlags

Defined in: [renderer/src/types.ts:5](https://github.com/sedrew/vyaz/blob/main/packages/renderer/src/types.ts#L5)

Render types shared across all renderers (SVG, Canvas, etc.).

## Properties

### ascentDescent?

> `optional` **ascentDescent?**: `boolean`

Defined in: [renderer/src/types.ts:21](https://github.com/sedrew/vyaz/blob/main/packages/renderer/src/types.ts#L21)

Ascent/descent lines

***

### baseline?

> `optional` **baseline?**: `boolean`

Defined in: [renderer/src/types.ts:19](https://github.com/sedrew/vyaz/blob/main/packages/renderer/src/types.ts#L19)

Baseline line

***

### box?

> `optional` **box?**: `boolean`

Defined in: [renderer/src/types.ts:17](https://github.com/sedrew/vyaz/blob/main/packages/renderer/src/types.ts#L17)

Line box outline

***

### columnBox?

> `optional` **columnBox?**: `boolean`

Defined in: [renderer/src/types.ts:27](https://github.com/sedrew/vyaz/blob/main/packages/renderer/src/types.ts#L27)

Column separators (only rendered when multi-column config is set).

***

### contentBox?

> `optional` **contentBox?**: `boolean`

Defined in: [renderer/src/types.ts:9](https://github.com/sedrew/vyaz/blob/main/packages/renderer/src/types.ts#L9)

Actual content bounding box (BBox of all lines)

***

### ~~frame?~~

> `optional` **frame?**: `boolean`

Defined in: [renderer/src/types.ts:29](https://github.com/sedrew/vyaz/blob/main/packages/renderer/src/types.ts#L29)

#### Deprecated

Use frameBox instead

***

### frameBox?

> `optional` **frameBox?**: `boolean`

Defined in: [renderer/src/types.ts:7](https://github.com/sedrew/vyaz/blob/main/packages/renderer/src/types.ts#L7)

Frame container bounding box (frameWidth × frameHeight)

***

### labels?

> `optional` **labels?**: `boolean`

Defined in: [renderer/src/types.ts:23](https://github.com/sedrew/vyaz/blob/main/packages/renderer/src/types.ts#L23)

Coordinate labels

***

### lineGap?

> `optional` **lineGap?**: `boolean`

Defined in: [renderer/src/types.ts:15](https://github.com/sedrew/vyaz/blob/main/packages/renderer/src/types.ts#L15)

Show filled rect for each line's lineHeight (background fill).

***

### paragraphBox?

> `optional` **paragraphBox?**: `boolean`

Defined in: [renderer/src/types.ts:11](https://github.com/sedrew/vyaz/blob/main/packages/renderer/src/types.ts#L11)

Paragraph bounding boxes (grouped by paragraphId).

***

### runs?

> `optional` **runs?**: `boolean`

Defined in: [renderer/src/types.ts:25](https://github.com/sedrew/vyaz/blob/main/packages/renderer/src/types.ts#L25)

Run rectangles

***

### widthBorder?

> `optional` **widthBorder?**: `number`

Defined in: [renderer/src/types.ts:13](https://github.com/sedrew/vyaz/blob/main/packages/renderer/src/types.ts#L13)

Stroke width (px) for all debug border lines. Default 1.
