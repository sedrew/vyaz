[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / TextRun

# Interface: TextRun

Defined in: [core/src/types/Document.ts:261](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L261)

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

Defined in: [core/src/types/Document.ts:295](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L295)

Background color (optional).

***

### color

> **color**: `string`

Defined in: [core/src/types/Document.ts:293](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L293)

Text color in any CSS-compatible format (hex, rgb, named).

***

### data?

> `optional` **data?**: `Record`\<`string`, `string`\>

Defined in: [core/src/types/Document.ts:345](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L345)

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

### decorationFontSize?

> `optional` **decorationFontSize?**: `object`

Defined in: [core/src/types/Document.ts:315](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L315)

Font size of the element that *set* each decoration — CSS's "decorating
box". Chrome draws a decoration with that element's thickness and
position, not each nested run's: `<u>ab <span style="font-size:48px">X</span></u>`
gets one thin 16px underline under the 48px text too. The SVG `browser`
preset uses it where a decorated run mixes font sizes; omitted, the run's
own `fontSize` is the box. Set by `@vyaz/converters`.

#### strikethrough?

> `optional` **strikethrough?**: `number`

#### underline?

> `optional` **underline?**: `number`

***

### fontFamily

> **fontFamily**: `string` \| `string`[]

Defined in: [core/src/types/Document.ts:285](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L285)

Font family name, or a CSS-style fallback list tried in order
(e.g. `"Arial"` or `["Inter", "Arial", "sans-serif"]`). The layout result
always reports the concrete family that was used; see
`LayoutOptions.onMissingFont`.

***

### fontSize

> **fontSize**: `number`

Defined in: [core/src/types/Document.ts:287](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L287)

Font size in px.

***

### fontStyle

> **fontStyle**: `"normal"` \| `"italic"`

Defined in: [core/src/types/Document.ts:291](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L291)

Font style.

***

### fontWeight

> **fontWeight**: `number` \| `"normal"` \| `"bold"`

Defined in: [core/src/types/Document.ts:289](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L289)

Font weight: `'normal'`, `'bold'`, or a numeric CSS weight (100–900).

***

### fullSizeKana?

> `optional` **fullSizeKana?**: `boolean`

Defined in: [core/src/types/Document.ts:330](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L330)

**`Experimental`**

Convert small kana to full-size kana.  Accepted in the type but ignored by the layout engine (no-op until implemented).

***

### fullWidth?

> `optional` **fullWidth?**: `boolean`

Defined in: [core/src/types/Document.ts:328](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L328)

**`Experimental`**

Force full-width characters (CJK).  Accepted in the type but ignored by the layout engine (no-op until implemented).

***

### inlineWidget?

> `optional` **inlineWidget?**: [`InlineWidget`](InlineWidget.md)

Defined in: [core/src/types/Document.ts:275](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L275)

Inline widget data (only when `type === 'inline-box'`).
Represents an embedded object (image, icon, etc.) that sits
inside the text flow.

***

### letterSpacing?

> `optional` **letterSpacing?**: `number`

Defined in: [core/src/types/Document.ts:297](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L297)

Letter-spacing (tracking) in px. `0` means default.

***

### overline?

> `optional` **overline?**: `boolean`

Defined in: [core/src/types/Document.ts:317](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L317)

**`Experimental`**

Overline decoration.  Accepted in the type but ignored by the layout engine (no-op until implemented).

***

### script?

> `optional` **script?**: [`ScriptType`](../type-aliases/ScriptType.md)

Defined in: [core/src/types/Document.ts:299](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L299)

Subscript / superscript override.

***

### strikethrough?

> `optional` **strikethrough?**: `boolean`

Defined in: [core/src/types/Document.ts:306](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L306)

Strikethrough decoration.

***

### text

> **text**: `string`

Defined in: [core/src/types/Document.ts:269](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L269)

The text content of this run (or `\uFFFC` for inline-box).

***

### textDecorationColor?

> `optional` **textDecorationColor?**: `string`

Defined in: [core/src/types/Document.ts:321](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L321)

**`Experimental`**

Underline / overline / strikethrough line color.  Accepted in the type but ignored by the layout engine (no-op until implemented).

***

### textDecorationStyle?

> `optional` **textDecorationStyle?**: [`TextDecorationStyle`](../type-aliases/TextDecorationStyle.md)

Defined in: [core/src/types/Document.ts:319](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L319)

**`Experimental`**

Underline / overline / strikethrough line style.  Accepted in the type but ignored by the layout engine (no-op until implemented).

***

### textTransform?

> `optional` **textTransform?**: [`TextTransform`](../type-aliases/TextTransform.md)

Defined in: [core/src/types/Document.ts:326](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L326)

Case transform (uppercase, lowercase, capitalize).

***

### type

> **type**: `"text"` \| `"inline-box"`

Defined in: [core/src/types/Document.ts:267](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L267)

Run kind:
- `'text'` — plain text (the most common case).
- `'inline-box'` — an inline widget placeholder (`\uFFFC`).

***

### underline?

> `optional` **underline?**: `boolean`

Defined in: [core/src/types/Document.ts:304](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L304)

Underline decoration.
