[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / InlineWidget

# Interface: InlineWidget

Defined in: [core/src/types/Document.ts:321](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L321)

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

Defined in: [core/src/types/Document.ts:331](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L331)

Offset from the baseline (in px).
Positive = widget descends below the baseline.
Negative = widget ascends above the baseline.

***

### height

> **height**: `number`

Defined in: [core/src/types/Document.ts:325](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L325)

Height of the widget in px.

***

### width

> **width**: `number`

Defined in: [core/src/types/Document.ts:323](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L323)

Width of the widget in px.
