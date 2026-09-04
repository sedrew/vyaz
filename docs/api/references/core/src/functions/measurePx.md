[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / measurePx

# Function: measurePx()

> **measurePx**(`raw`, `scale`, `fontSize`, `text`, `prof?`): `number`

Defined in: [core/src/measure/FontkitMeasureContext.ts:211](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/FontkitMeasureContext.ts#L211)

Pixel width of `text` under `profile`. Shared by the pretext measure context
and `ParagraphLayoutEngine`'s fragment measurement so line breaking and
positioning never disagree.

  - `advance` — Σ per-code-point `advanceWidth`, surrogate-aware, with the
    `MISSING_GLYPH_FACTOR · fontSize` estimate for absent glyphs.
  - `shape`   — fontkit `layout()` advance (kerning + ligatures). Missing
    glyphs there fall back to the same per-code-point estimate for the
    stretch that produced no advance, so the two profiles agree on
    un-shapeable text.

## Parameters

### raw

`any`

### scale

`number`

### fontSize

`number`

### text

`string`

### prof?

[`MeasureProfile`](../interfaces/MeasureProfile.md) = `profile`

## Returns

`number`
