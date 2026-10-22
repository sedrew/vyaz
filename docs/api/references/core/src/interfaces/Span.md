[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / Span

# Interface: Span

Defined in: [core/src/types/LayoutTypes.ts:14](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L14)

## Properties

### breakType?

> `optional` **breakType?**: `"soft"` \| `"hard"`

Defined in: [core/src/types/LayoutTypes.ts:97](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L97)

Line break mode after this span.
'soft' — soft line break (insufficient space)
'hard' — forced break (\n, explicit separator)
undefined — not end of line

***

### collapsed?

> `optional` **collapsed?**: `boolean`

Defined in: [core/src/types/LayoutTypes.ts:89](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L89)

Trailing whitespace that is not painted at the line end: CSS removes it
(white-space `normal`, `nowrap`, `pre-line`; CSS Text §4.1.2), and
PowerPoint draws no underline under it (`mode: 'office'`, every
white-space). Kept in `spans` for text and index fidelity (it may carry
the `\n` of a hard break) but never painted: renderers draw no
background, decoration or glyph for it.

***

### endIndex?

> `optional` **endIndex?**: `number`

Defined in: [core/src/types/LayoutTypes.ts:36](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L36)

***

### fontMetrics

> **fontMetrics**: [`SpanFontMetrics`](SpanFontMetrics.md)

Defined in: [core/src/types/LayoutTypes.ts:39](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L39)

Physical font metrics for this span

***

### glyphAdvances?

> `optional` **glyphAdvances?**: `number`[] \| `Float32Array`\<`ArrayBufferLike`\>

Defined in: [core/src/types/LayoutTypes.ts:51](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L51)

Per-character advance widths (for selection/tracking)

***

### inlineWidget?

> `optional` **inlineWidget?**: [`InlineWidget`](InlineWidget.md)

Defined in: [core/src/types/LayoutTypes.ts:48](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L48)

InlineWidget data (if span is an inline-box)

***

### itemIndex

> **itemIndex**: `number`

Defined in: [core/src/types/LayoutTypes.ts:22](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L22)

Index of the source run in the paragraph's `children` array.

***

### notdefRanges?

> `optional` **notdefRanges?**: `object`[]

Defined in: [core/src/types/LayoutTypes.ts:60](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L60)

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

### startIndex?

> `optional` **startIndex?**: `number`

Defined in: [core/src/types/LayoutTypes.ts:35](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L35)

Half-open `[startIndex, endIndex)` range of this span in the paragraph's
source text (its `children` texts joined, `\n` included) — before
whitespace collapsing. A collapsed space span covers the whole whitespace
run it stands for; a gap a span merely represents may be empty. Markers
carry none. Set by `layoutTextFrame`.

***

### style

> **style**: [`ResolvedTextRun`](../type-aliases/ResolvedTextRun.md)

Defined in: [core/src/types/LayoutTypes.ts:45](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L45)

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

Defined in: [core/src/types/LayoutTypes.ts:79](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L79)

Trailing whitespace flag.
- true: span is at end of line, does not participate in line advance
        and is not stretched during justify (zero width for calculations).
- undefined/false: regular span.

See CSS Text Module Level 3 §4.1.3 (Tracking and Dropping Spaces)
and Parley LineItemData::has_trailing_whitespace.

***

### type

> **type**: `"text"` \| `"space"` \| `"marker"`

Defined in: [core/src/types/LayoutTypes.ts:68](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/LayoutTypes.ts#L68)

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
