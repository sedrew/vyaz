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

### engine

> **engine**: `"advance"` \| `"shape"`

Defined in: [core/src/measure/FontkitMeasureContext.ts:61](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontkitMeasureContext.ts#L61)

***

### features?

> `optional` **features?**: `Record`\<`string`, `boolean`\>

Defined in: [core/src/measure/FontkitMeasureContext.ts:63](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontkitMeasureContext.ts#L63)

`'shape'` only — OpenType feature overrides, e.g. `{ liga: false }`.
