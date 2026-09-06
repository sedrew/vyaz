[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / Span

# Interface: Span

Defined in: [core/src/types/LayoutTypes.ts:14](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L14)

## Properties

### breakType?

> `optional` **breakType?**: `"soft"` \| `"hard"`

Defined in: [core/src/types/LayoutTypes.ts:77](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L77)

Line break mode after this span.
'soft' — soft line break (insufficient space)
'hard' — forced break (\n, explicit separator)
undefined — not end of line

***

### fontMetrics

> **fontMetrics**: [`SpanFontMetrics`](SpanFontMetrics.md)

Defined in: [core/src/types/LayoutTypes.ts:29](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L29)

Physical font metrics for this span

***

### glyphAdvances?

> `optional` **glyphAdvances?**: `number`[] \| `Float32Array`\<`ArrayBufferLike`\>

Defined in: [core/src/types/LayoutTypes.ts:41](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L41)

Per-character advance widths (for selection/tracking)

***

### inlineWidget?

> `optional` **inlineWidget?**: [`InlineWidget`](InlineWidget.md)

Defined in: [core/src/types/LayoutTypes.ts:38](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L38)

InlineWidget data (if span is an inline-box)

***

### itemIndex

> **itemIndex**: `number`

Defined in: [core/src/types/LayoutTypes.ts:22](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L22)

Index of the source run in the paragraph's `children` array.

***

### notdefRanges?

> `optional` **notdefRanges?**: `object`[]

Defined in: [core/src/types/LayoutTypes.ts:50](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L50)

Half-open `[start, end)` ranges of `text` (character indices) that no
registered font covers — fontkit mapped them to `.notdef`. Contiguous
misses are merged. Filled when per-glyph advances are computed (SVG
`glyph` preset) or `LayoutOptions.markMissingGlyphs` is set; absent when
every character resolved. Consumers: `renderToSVG({ missingGlyph: 'box' })`.

#### end

> **end**: `number`

#### start

> **start**: `number`

***

### pIdx

> **pIdx**: `number`

Defined in: [core/src/types/LayoutTypes.ts:24](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L24)

Paragraph index in TextFrame.paragraphs[]. Stable key for grouping & diff.

***

### style

> **style**: [`ResolvedTextRun`](../type-aliases/ResolvedTextRun.md)

Defined in: [core/src/types/LayoutTypes.ts:35](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L35)

A snapshot of the source run's style at layout time.
Copied from the corresponding `TextRun` in the paragraph's `children` array.

***

### tag?

> `optional` **tag?**: `string`

Defined in: [core/src/types/LayoutTypes.ts:26](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L26)

Optional paragraph tag (set by user via Paragraph.id).

***

### text

> **text**: `string`

Defined in: [core/src/types/LayoutTypes.ts:20](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L20)

Span text (or " " for justify spaces)

***

### trailing?

> `optional` **trailing?**: `boolean`

Defined in: [core/src/types/LayoutTypes.ts:69](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L69)

Trailing whitespace flag.
- true: span is at end of line, does not participate in line advance
        and is not stretched during justify (zero width for calculations).
- undefined/false: regular span.

See CSS Text Module Level 3 §4.1.3 (Tracking and Dropping Spaces)
and Parley LineItemData::has_trailing_whitespace.

***

### type

> **type**: `"text"` \| `"space"` \| `"marker"`

Defined in: [core/src/types/LayoutTypes.ts:58](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L58)

Span type:
- `'text'` — regular text
- `'space'` — whitespace span
- `'marker'` — list marker (bullet / number), rendered like text

***

### width

> **width**: `number`

Defined in: [core/src/types/LayoutTypes.ts:18](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L18)

Physical span width

***

### x

> **x**: `number`

Defined in: [core/src/types/LayoutTypes.ts:16](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L16)

Offset from Line.x
