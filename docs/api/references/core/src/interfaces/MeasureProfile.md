[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / MeasureProfile

# Interface: MeasureProfile

Defined in: [core/src/measure/FontkitMeasureContext.ts:60](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontkitMeasureContext.ts#L60)

How widths are computed from the font tables.

  - `'advance'` (default) — Σ per-code-point `advanceWidth`. Fast, and
    shaping-invariant, but ignores kerning and ligatures, so it drifts from
    what a browser paints (up to a few px per word on a kerned Latin font).
  - `'shape'` — fontkit `layout()` advance: GPOS kerning + GSUB (`liga`,
    `clig`, `calt`, `ccmp`), i.e. browser-default behaviour. Use for the SVG
    `browser` preset when on-screen width has to match the layout.

## Properties

### advanceQuantum?

> `optional` **advanceQuantum?**: `number`

Defined in: [core/src/measure/FontkitMeasureContext.ts:83](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontkitMeasureContext.ts#L83)

Round every glyph advance to a multiple of this many px (PowerPoint lays glyphs
out on a 1/8 pt grid: all 266 glyphs of a Roboto / Times New Roman alphabet at
20 and 11pt were exact multiples of 0.125pt, equal to the font advance rounded
to nearest). Kerning is added on top, unrounded. Ignored when unset or 0.

***

### engine

> **engine**: `"advance"` \| `"shape"`

Defined in: [core/src/measure/FontkitMeasureContext.ts:61](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontkitMeasureContext.ts#L61)

***

### features?

> `optional` **features?**: `Record`\<`string`, `boolean`\>

Defined in: [core/src/measure/FontkitMeasureContext.ts:63](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontkitMeasureContext.ts#L63)

`'shape'` only — OpenType feature overrides, e.g. `{ liga: false }`.

***

### kernMinSize?

> `optional` **kernMinSize?**: `number`

Defined in: [core/src/measure/FontkitMeasureContext.ts:70](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontkitMeasureContext.ts#L70)

`'shape'` only — kerning applies just to text at `fontSize >= kernMinSize`
(smaller text is shaped with `kern: false`). Mirrors DrawingML's
`<a:rPr kern="1200">` "kerning for fonts N points and above", whose Office
default is 12pt.

***

### kernRequiresTable?

> `optional` **kernRequiresTable?**: `boolean`

Defined in: [core/src/measure/FontkitMeasureContext.ts:76](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontkitMeasureContext.ts#L76)

`'shape'` only — kern only fonts that carry a classic `kern` table. PowerPoint kerns
Times New Roman / Arial / Calibri (kern table) but never Roboto / Inter (GPOS only):
measured on Roboto at 11, 16, 20, 24 and 72pt, no pair ever kerns.

***

### opticalSizing?

> `optional` **opticalSizing?**: `boolean`

Defined in: [core/src/measure/FontkitMeasureContext.ts:89](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontkitMeasureContext.ts#L89)

Instance fonts with a free `opsz` axis at the used size, like CSS
`font-optical-sizing: auto` (see `opticalSizeInstance`). On unless `false`;
`mode: 'office'` turns it off (PowerPoint was never measured doing it).
