[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / LayoutOptions

# Interface: LayoutOptions

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:211](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L211)

Options for [layoutTextFrame](../functions/layoutTextFrame.md).

## Properties

### advanceQuantum?

> `optional` **advanceQuantum?**: `number`

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:260](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L260)

Round every glyph advance to a multiple of this many pt. Defaults to `0.125` in
`mode: 'office'` (PowerPoint's 1/8 pt glyph grid — all 266 glyphs of a measured
Roboto / Times New Roman alphabet sat on it) and to none elsewhere; `0` turns it off.

***

### autofit?

> `optional` **autofit?**: `boolean` \| \{ `minFontSize?`: `number`; \}

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:230](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L230)

Shrink every run's `fontSize` proportionally until the content fits the
frame box. `true` uses defaults; an object bounds the minimum size.
The chosen scale is reported on `result.autofit`, on PowerPoint's 1%
`fontScale` grid, and it is the scale the returned layout was measured at.

***

### glyphAdvances?

> `optional` **glyphAdvances?**: `boolean`

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:217](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L217)

Fill `Span.glyphAdvances` on every text span. Needed only by the SVG
`glyph` preset and by caret hit-testing; off by default because it costs
O(chars) font lookups + allocation on every layout.

***

### kernMinSize?

> `optional` **kernMinSize?**: `number`

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:254](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L254)

With shaping on, kern only text at this size (pt) and up. Defaults to `12` when
`shaping` is left unset in `mode: 'office'` (PowerPoint's default `kern="1200"`); no
threshold when `shaping: true` is passed explicitly.

***

### markMissingGlyphs?

> `optional` **markMissingGlyphs?**: `boolean`

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:276](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L276)

Fill `Span.notdefRanges` on every text span — the character ranges no
registered font covers. The SVG `glyph` preset always does this (it
resolves the same font anyway); set this to get it for the flat / browser
/ preserve presets, which `renderToSVG({ missingGlyph: 'box' })` reads to
draw an explicit placeholder instead of passing the raw code point to the
viewer's fallback. Cheap: a cmap lookup per character, no glyph objects.

***

### mode?

> `optional` **mode?**: `"browser"` \| `"office"`

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:223](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L223)

Metric mode for this layout, overriding the provider's global mode:
  - `'browser'` (default) — CSS/Chrome line-box, hhea ascent/descent
  - `'office'` — PowerPoint/DrawingML line-box, OS/2 winAscent/winDescent

***

### onMissingFont?

> `optional` **onMissingFont?**: `"throw"` \| `"substitute"`

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:237](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L237)

What to do when none of a run's `fontFamily` entries are registered:
  - `'throw'` (default) — raise `FontNotFoundError`
  - `'substitute'` — use any registered family and add a `result.warnings`
    entry instead of failing

***

### shaping?

> `optional` **shaping?**: `boolean`

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:248](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L248)

Measure widths through fontkit's `layout()` — GPOS kerning + GSUB ligatures
— instead of the default per-code-point advance sum. Applies to line
breaking and positioning for this call only.

Defaults to `true` when `mode: 'office'` — but there kerning applies only from
[LayoutOptions.kernMinSize](#kernminsize) (12pt) up and only to fonts with a classic `kern`
table (PowerPoint's behaviour) — and to `false` otherwise. Pass it explicitly to
override either way (an explicit `true` kerns every font at every size).

***

### textBoxPadding?

> `optional` **textBoxPadding?**: `number`

Defined in: [core/src/layout/TextFrameLayoutEngine.ts:267](https://github.com/sedrew/vyaz/blob/main/packages/core/src/layout/TextFrameLayoutEngine.ts#L267)

Extra width (pt) added once to `textBox.width` — the widest line, not every line, and
not the wrap decision. A box sized exactly to the measured text still wraps its last
word in PowerPoint (rounding of kerned advances, whole-EMU boxes). Defaults to
`1.0` (pt) in `mode: 'office'`, `0` elsewhere.
