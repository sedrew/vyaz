[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / TextRun

# Interface: TextRun

Defined in: [core/src/types/Document.ts:256](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L256)

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

Defined in: [core/src/types/Document.ts:290](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L290)

Background color (optional).

***

### color

> **color**: `string`

Defined in: [core/src/types/Document.ts:288](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L288)

Text color in any CSS-compatible format (hex, rgb, named).

***

### data?

> `optional` **data?**: `Record`\<`string`, `string`\>

Defined in: [core/src/types/Document.ts:331](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L331)

Free-form metadata for features the layout engine itself never
interprets — e.g. `@vyaz/converters` carrying an `<a>`'s `href` through
to `@vyaz/renderer`, which wraps the run's painted output in `<a
href="…">` for the `browser`/`preserve` presets. A key's meaning is a
contract between whichever writer sets it and whichever reader consumes
it; layout treats this purely as opaque pass-through (no effect on
measurement, wrapping, or positioning). Modelled on unist's `data` node
field (the remark/rehype AST spec) for the same reason: keep the base
type lean instead of growing a named field per cross-cutting feature.

***

### fontFamily

> **fontFamily**: `string` \| `string`[]

Defined in: [core/src/types/Document.ts:280](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L280)

Font family name, or a CSS-style fallback list tried in order
(e.g. `"Arial"` or `["Inter", "Arial", "sans-serif"]`). The layout result
always reports the concrete family that was used; see
`LayoutOptions.onMissingFont`.

***

### fontSize

> **fontSize**: `number`

Defined in: [core/src/types/Document.ts:282](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L282)

Font size in px.

***

### fontStyle

> **fontStyle**: `"normal"` \| `"italic"`

Defined in: [core/src/types/Document.ts:286](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L286)

Font style.

***

### fontWeight

> **fontWeight**: `number` \| `"normal"` \| `"bold"`

Defined in: [core/src/types/Document.ts:284](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L284)

Font weight: `'normal'`, `'bold'`, or a numeric CSS weight (100–900).

***

### fullSizeKana?

> `optional` **fullSizeKana?**: `boolean`

Defined in: [core/src/types/Document.ts:316](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L316)

**`Experimental`**

Convert small kana to full-size kana.  Accepted in the type but ignored by the layout engine (no-op until implemented).

***

### fullWidth?

> `optional` **fullWidth?**: `boolean`

Defined in: [core/src/types/Document.ts:314](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L314)

**`Experimental`**

Force full-width characters (CJK).  Accepted in the type but ignored by the layout engine (no-op until implemented).

***

### inlineWidget?

> `optional` **inlineWidget?**: [`InlineWidget`](InlineWidget.md)

Defined in: [core/src/types/Document.ts:270](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L270)

Inline widget data (only when `type === 'inline-box'`).
Represents an embedded object (image, icon, etc.) that sits
inside the text flow.

***

### letterSpacing?

> `optional` **letterSpacing?**: `number`

Defined in: [core/src/types/Document.ts:292](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L292)

Letter-spacing (tracking) in px. `0` means default.

***

### overline?

> `optional` **overline?**: `boolean`

Defined in: [core/src/types/Document.ts:303](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L303)

**`Experimental`**

Overline decoration.  Accepted in the type but ignored by the layout engine (no-op until implemented).

***

### script?

> `optional` **script?**: [`ScriptType`](../type-aliases/ScriptType.md)

Defined in: [core/src/types/Document.ts:294](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L294)

Subscript / superscript override.

***

### strikethrough?

> `optional` **strikethrough?**: `boolean`

Defined in: [core/src/types/Document.ts:301](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L301)

Strikethrough decoration.

***

### text

> **text**: `string`

Defined in: [core/src/types/Document.ts:264](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L264)

The text content of this run (or `\uFFFC` for inline-box).

***

### textDecorationColor?

> `optional` **textDecorationColor?**: `string`

Defined in: [core/src/types/Document.ts:307](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L307)

**`Experimental`**

Underline / overline / strikethrough line color.  Accepted in the type but ignored by the layout engine (no-op until implemented).

***

### textDecorationStyle?

> `optional` **textDecorationStyle?**: [`TextDecorationStyle`](../type-aliases/TextDecorationStyle.md)

Defined in: [core/src/types/Document.ts:305](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L305)

**`Experimental`**

Underline / overline / strikethrough line style.  Accepted in the type but ignored by the layout engine (no-op until implemented).

***

### textTransform?

> `optional` **textTransform?**: [`TextTransform`](../type-aliases/TextTransform.md)

Defined in: [core/src/types/Document.ts:312](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L312)

Case transform (uppercase, lowercase, capitalize).

***

### type

> **type**: `"text"` \| `"inline-box"`

Defined in: [core/src/types/Document.ts:262](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L262)

Run kind:
- `'text'` — plain text (the most common case).
- `'inline-box'` — an inline widget placeholder (`\uFFFC`).

***

### underline?

> `optional` **underline?**: `boolean`

Defined in: [core/src/types/Document.ts:299](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L299)

Underline decoration.
