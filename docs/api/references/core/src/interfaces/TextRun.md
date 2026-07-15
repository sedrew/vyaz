[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / TextRun

# Interface: TextRun

Defined in: [core/src/types/Document.ts:239](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L239)

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

Defined in: [core/src/types/Document.ts:268](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L268)

Background color (optional).

***

### color

> **color**: `string`

Defined in: [core/src/types/Document.ts:266](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L266)

Text color in any CSS-compatible format (hex, rgb, named).

***

### fontFamily

> **fontFamily**: `string`

Defined in: [core/src/types/Document.ts:258](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L258)

Font family name (e.g. `"Arial"`, `"Times New Roman"`).

***

### fontSize

> **fontSize**: `number`

Defined in: [core/src/types/Document.ts:260](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L260)

Font size in px.

***

### fontStyle

> **fontStyle**: `"normal"` \| `"italic"`

Defined in: [core/src/types/Document.ts:264](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L264)

Font style.

***

### fontWeight

> **fontWeight**: `number` \| `"normal"` \| `"bold"`

Defined in: [core/src/types/Document.ts:262](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L262)

Font weight: `'normal'`, `'bold'`, or a numeric CSS weight (100–900).

***

### fullSizeKana?

> `optional` **fullSizeKana?**: `boolean`

Defined in: [core/src/types/Document.ts:294](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L294)

Convert small kana to full-size kana.

#### Todo

Not yet implemented.

***

### fullWidth?

> `optional` **fullWidth?**: `boolean`

Defined in: [core/src/types/Document.ts:292](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L292)

Force full-width characters (CJK).

#### Todo

Not yet implemented.

***

### inlineWidget?

> `optional` **inlineWidget?**: [`InlineWidget`](InlineWidget.md)

Defined in: [core/src/types/Document.ts:253](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L253)

Inline widget data (only when `type === 'inline-box'`).
Represents an embedded object (image, icon, etc.) that sits
inside the text flow.

***

### letterSpacing?

> `optional` **letterSpacing?**: `number`

Defined in: [core/src/types/Document.ts:270](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L270)

Letter-spacing (tracking) in px. `0` means default.

***

### overline?

> `optional` **overline?**: `boolean`

Defined in: [core/src/types/Document.ts:281](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L281)

Overline decoration.

#### Todo

Not yet implemented.

***

### script?

> `optional` **script?**: [`ScriptType`](../type-aliases/ScriptType.md)

Defined in: [core/src/types/Document.ts:272](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L272)

Subscript / superscript override.

***

### strikethrough?

> `optional` **strikethrough?**: `boolean`

Defined in: [core/src/types/Document.ts:279](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L279)

Strikethrough decoration.

***

### text

> **text**: `string`

Defined in: [core/src/types/Document.ts:247](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L247)

The text content of this run (or `\uFFFC` for inline-box).

***

### textDecorationColor?

> `optional` **textDecorationColor?**: `string`

Defined in: [core/src/types/Document.ts:285](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L285)

Underline / overline / strikethrough line color.

#### Todo

Not yet implemented.

***

### textDecorationStyle?

> `optional` **textDecorationStyle?**: [`TextDecorationStyle`](../type-aliases/TextDecorationStyle.md)

Defined in: [core/src/types/Document.ts:283](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L283)

Underline / overline / strikethrough line style.

#### Todo

Not yet implemented.

***

### textTransform?

> `optional` **textTransform?**: [`TextTransform`](../type-aliases/TextTransform.md)

Defined in: [core/src/types/Document.ts:290](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L290)

Case transform (uppercase, lowercase, capitalize).

***

### type

> **type**: `"text"` \| `"inline-box"`

Defined in: [core/src/types/Document.ts:245](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L245)

Run kind:
- `'text'` — plain text (the most common case).
- `'inline-box'` — an inline widget placeholder (`\uFFFC`).

***

### underline?

> `optional` **underline?**: `boolean`

Defined in: [core/src/types/Document.ts:277](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L277)

Underline decoration.
