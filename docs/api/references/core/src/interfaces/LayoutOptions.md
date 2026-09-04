[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / LayoutOptions

# Interface: LayoutOptions

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:126](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L126)

Options for [layoutTextFrame](../functions/layoutTextFrame.md).

## Properties

### autofit?

> `optional` **autofit?**: `boolean` \| \{ `minFontSize?`: `number`; \}

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:144](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L144)

Shrink every run's `fontSize` proportionally until the content fits the
frame box. `true` uses defaults; an object bounds the minimum size.
The chosen scale is reported on `result.autofit`.

***

### glyphAdvances?

> `optional` **glyphAdvances?**: `boolean`

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:132](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L132)

Fill `Span.glyphAdvances` on every text span. Needed only by the SVG
`glyph` preset and by caret hit-testing; off by default because it costs
O(chars) font lookups + allocation on every layout.

***

### mode?

> `optional` **mode?**: `"browser"` \| `"office"`

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:138](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L138)

Metric mode for this layout, overriding the provider's global mode:
  - `'browser'` (default) — CSS/Chrome line-box, hhea ascent/descent
  - `'office'` — PowerPoint/DrawingML line-box, OS/2 winAscent/winDescent

***

### onMissingFont?

> `optional` **onMissingFont?**: `"throw"` \| `"substitute"`

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:151](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L151)

What to do when none of a run's `fontFamily` entries are registered:
  - `'throw'` (default) — raise `FontNotFoundError`
  - `'substitute'` — use any registered family and add a `result.warnings`
    entry instead of failing

***

### shaping?

> `optional` **shaping?**: `boolean`

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:158](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L158)

Measure widths through fontkit's `layout()` — GPOS kerning + GSUB ligatures,
i.e. what a browser paints — instead of the default per-code-point advance
sum. Applies to line breaking and positioning for this call only. Leave off
unless the output is consumed by a browser (SVG `browser` preset).
