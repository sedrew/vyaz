[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / TextRun

# Interface: TextRun

Defined in: [core/src/types/Document.ts:234](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L234)

A single inline run of styled text.

This replaces the earlier `TextRunNode` + `TextStyleNode` pair;
all style properties are **flattened** directly onto the run.

Each run represents a continuous piece of text with uniform styling.
Consecutive runs with different styles are split by the input parser.

## Example

```ts
{ text: "Hello", fontFamily: "Arial", fontSize: 16, fontWeight: "bold", color: "#000" }
```

## Properties

### backgroundColor?

> `optional` **backgroundColor?**: `string`

Defined in: [core/src/types/Document.ts:263](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L263)

Background color (optional).

***

### color

> **color**: `string`

Defined in: [core/src/types/Document.ts:261](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L261)

Text color in any CSS-compatible format (hex, rgb, named).

***

### fontFamily

> **fontFamily**: `string`

Defined in: [core/src/types/Document.ts:253](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L253)

Font family name (e.g. `"Arial"`, `"Times New Roman"`).

***

### fontSize

> **fontSize**: `number`

Defined in: [core/src/types/Document.ts:255](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L255)

Font size in px.

***

### fontStyle

> **fontStyle**: `"normal"` \| `"italic"`

Defined in: [core/src/types/Document.ts:259](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L259)

Font style.

***

### fontWeight

> **fontWeight**: `number` \| `"normal"` \| `"bold"`

Defined in: [core/src/types/Document.ts:257](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L257)

Font weight: `'normal'`, `'bold'`, or a numeric CSS weight (100–900).

***

### fullSizeKana?

> `optional` **fullSizeKana?**: `boolean`

Defined in: [core/src/types/Document.ts:289](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L289)

Convert small kana to full-size kana.

#### Todo

Not yet implemented.

***

### fullWidth?

> `optional` **fullWidth?**: `boolean`

Defined in: [core/src/types/Document.ts:287](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L287)

Force full-width characters (CJK).

#### Todo

Not yet implemented.

***

### inlineWidget?

> `optional` **inlineWidget?**: [`InlineWidget`](InlineWidget.md)

Defined in: [core/src/types/Document.ts:248](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L248)

Inline widget data (only when `type === 'inline-box'`).
Represents an embedded object (image, icon, etc.) that sits
inside the text flow.

***

### letterSpacing?

> `optional` **letterSpacing?**: `number`

Defined in: [core/src/types/Document.ts:265](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L265)

Letter-spacing (tracking) in px. `0` means default.

***

### overline?

> `optional` **overline?**: `boolean`

Defined in: [core/src/types/Document.ts:276](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L276)

Overline decoration.

#### Todo

Not yet implemented.

***

### script?

> `optional` **script?**: [`ScriptType`](../type-aliases/ScriptType.md)

Defined in: [core/src/types/Document.ts:267](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L267)

Subscript / superscript override.

***

### strikethrough?

> `optional` **strikethrough?**: `boolean`

Defined in: [core/src/types/Document.ts:274](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L274)

Strikethrough decoration.

***

### text

> **text**: `string`

Defined in: [core/src/types/Document.ts:242](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L242)

The text content of this run (or `\uFFFC` for inline-box).

***

### textDecorationColor?

> `optional` **textDecorationColor?**: `string`

Defined in: [core/src/types/Document.ts:280](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L280)

Underline / overline / strikethrough line color.

#### Todo

Not yet implemented.

***

### textDecorationStyle?

> `optional` **textDecorationStyle?**: [`TextDecorationStyle`](../type-aliases/TextDecorationStyle.md)

Defined in: [core/src/types/Document.ts:278](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L278)

Underline / overline / strikethrough line style.

#### Todo

Not yet implemented.

***

### textTransform?

> `optional` **textTransform?**: [`TextTransform`](../type-aliases/TextTransform.md)

Defined in: [core/src/types/Document.ts:285](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L285)

Case transform (uppercase, lowercase, capitalize).

***

### type

> **type**: `"text"` \| `"inline-box"`

Defined in: [core/src/types/Document.ts:240](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L240)

Run kind:
- `'text'` — plain text (the most common case).
- `'inline-box'` — an inline widget placeholder (`\uFFFC`).

***

### underline?

> `optional` **underline?**: `boolean`

Defined in: [core/src/types/Document.ts:272](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L272)

Underline decoration.
