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

Defined in: [core/src/types/Document.ts:273](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L273)

Background color (optional).

***

### color

> **color**: `string`

Defined in: [core/src/types/Document.ts:271](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L271)

Text color in any CSS-compatible format (hex, rgb, named).

***

### fontFamily

> **fontFamily**: `string` \| `string`[]

Defined in: [core/src/types/Document.ts:263](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L263)

Font family name, or a CSS-style fallback list tried in order
(e.g. `"Arial"` or `["Inter", "Arial", "sans-serif"]`). The layout result
always reports the concrete family that was used; see
`LayoutOptions.onMissingFont`.

***

### fontSize

> **fontSize**: `number`

Defined in: [core/src/types/Document.ts:265](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L265)

Font size in px.

***

### fontStyle

> **fontStyle**: `"normal"` \| `"italic"`

Defined in: [core/src/types/Document.ts:269](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L269)

Font style.

***

### fontWeight

> **fontWeight**: `number` \| `"normal"` \| `"bold"`

Defined in: [core/src/types/Document.ts:267](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L267)

Font weight: `'normal'`, `'bold'`, or a numeric CSS weight (100–900).

***

### fullSizeKana?

> `optional` **fullSizeKana?**: `boolean`

Defined in: [core/src/types/Document.ts:299](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L299)

**`Experimental`**

Convert small kana to full-size kana.  Accepted in the type but ignored by the layout engine (no-op until implemented).

***

### fullWidth?

> `optional` **fullWidth?**: `boolean`

Defined in: [core/src/types/Document.ts:297](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L297)

**`Experimental`**

Force full-width characters (CJK).  Accepted in the type but ignored by the layout engine (no-op until implemented).

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

Defined in: [core/src/types/Document.ts:275](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L275)

Letter-spacing (tracking) in px. `0` means default.

***

### overline?

> `optional` **overline?**: `boolean`

Defined in: [core/src/types/Document.ts:286](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L286)

**`Experimental`**

Overline decoration.  Accepted in the type but ignored by the layout engine (no-op until implemented).

***

### script?

> `optional` **script?**: [`ScriptType`](../type-aliases/ScriptType.md)

Defined in: [core/src/types/Document.ts:277](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L277)

Subscript / superscript override.

***

### strikethrough?

> `optional` **strikethrough?**: `boolean`

Defined in: [core/src/types/Document.ts:284](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L284)

Strikethrough decoration.

***

### text

> **text**: `string`

Defined in: [core/src/types/Document.ts:247](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L247)

The text content of this run (or `\uFFFC` for inline-box).

***

### textDecorationColor?

> `optional` **textDecorationColor?**: `string`

Defined in: [core/src/types/Document.ts:290](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L290)

**`Experimental`**

Underline / overline / strikethrough line color.  Accepted in the type but ignored by the layout engine (no-op until implemented).

***

### textDecorationStyle?

> `optional` **textDecorationStyle?**: [`TextDecorationStyle`](../type-aliases/TextDecorationStyle.md)

Defined in: [core/src/types/Document.ts:288](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L288)

**`Experimental`**

Underline / overline / strikethrough line style.  Accepted in the type but ignored by the layout engine (no-op until implemented).

***

### textTransform?

> `optional` **textTransform?**: [`TextTransform`](../type-aliases/TextTransform.md)

Defined in: [core/src/types/Document.ts:295](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L295)

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

Defined in: [core/src/types/Document.ts:282](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L282)

Underline decoration.
