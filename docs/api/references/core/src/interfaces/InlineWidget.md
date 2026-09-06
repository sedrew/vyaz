[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / InlineWidget

# Interface: InlineWidget

Defined in: [core/src/types/Document.ts:353](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L353)

Data for an inline widget (embedded object inside text flow).

Inline widgets behave like a single character glyph with a fixed
width and height. They sit on the baseline by default.

## Example

An inline icon (24×24 px) embedded in a sentence:
```ts
{ width: 24, height: 24, baselineOffset: 0 }
```

## Properties

### baselineOffset?

> `optional` **baselineOffset?**: `number`

Defined in: [core/src/types/Document.ts:363](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L363)

Offset from the baseline (in px).
Positive = widget descends below the baseline.
Negative = widget ascends above the baseline.

***

### height

> **height**: `number`

Defined in: [core/src/types/Document.ts:357](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L357)

Height of the widget in px.

***

### id?

> `optional` **id?**: `string`

Defined in: [core/src/types/Document.ts:369](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L369)

Opaque key a renderer can use to look up the widget's actual content
(e.g. `renderToSVG`'s `inlineBoxes[id]` SVG fragment). The layout engine
only reserves the `width` × `height` box; it never reads this.

***

### width

> **width**: `number`

Defined in: [core/src/types/Document.ts:355](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L355)

Width of the widget in px.
