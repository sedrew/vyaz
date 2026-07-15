[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / InlineWidget

# Interface: InlineWidget

Defined in: [core/src/types/Document.ts:309](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L309)

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

Defined in: [core/src/types/Document.ts:319](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L319)

Offset from the baseline (in px).
Positive = widget descends below the baseline.
Negative = widget ascends above the baseline.

***

### height

> **height**: `number`

Defined in: [core/src/types/Document.ts:313](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L313)

Height of the widget in px.

***

### width

> **width**: `number`

Defined in: [core/src/types/Document.ts:311](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L311)

Width of the widget in px.
