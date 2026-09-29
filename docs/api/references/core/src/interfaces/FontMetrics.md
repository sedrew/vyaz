[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / FontMetrics

# Interface: FontMetrics

Defined in: [core/src/types/FontTypes.ts:12](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/FontTypes.ts#L12)

Physical font metrics (in pixels for a given fontSize)

## Properties

### ascent

> **ascent**: `number`

Defined in: [core/src/types/FontTypes.ts:14](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/FontTypes.ts#L14)

Rise above baseline

***

### capHeight

> **capHeight**: `number`

Defined in: [core/src/types/FontTypes.ts:18](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/FontTypes.ts#L18)

Cap height

***

### descent

> **descent**: `number`

Defined in: [core/src/types/FontTypes.ts:16](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/FontTypes.ts#L16)

Descent below baseline (positive number!)

***

### sourceTable?

> `optional` **sourceTable?**: `"hhea"` \| `"OS/2"` \| `"canvas"` \| `"fallback"`

Defined in: [core/src/types/FontTypes.ts:28](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/FontTypes.ts#L28)

Which font table was used for ascent/descent:
  'hhea'  — hhea.ascender/descender (browser mode)
  'OS/2'  — OS/2.usWinAscent/usWinDescent (Office mode)
  'canvas' — canvas.measureText (browser fallback)
  'fallback' — empirical formula

***

### typoAscFrac?

> `optional` **typoAscFrac?**: `number`

Defined in: [core/src/types/FontTypes.ts:34](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/FontTypes.ts#L34)

`OS/2.typoAscender / (OS/2.typoAscender − OS/2.typoDescender)` — the font's
own ascent-side share of its *typo* em-box. `undefined` when the font has
no OS/2 table (e.g. canvas-fallback metrics).

***

### unitsPerEm

> **unitsPerEm**: `number`

Defined in: [core/src/types/FontTypes.ts:20](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/FontTypes.ts#L20)

Original font UPM (for reference)

***

### useTypoMetrics?

> `optional` **useTypoMetrics?**: `boolean`

Defined in: [core/src/types/FontTypes.ts:60](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/FontTypes.ts#L60)

`OS/2.fsSelection` bit 7 — the font's own declaration that line spacing
should be driven by its typo metrics rather than win/hhea. `undefined`
when the font has no OS/2 table.

Together with `typoAscFrac` / `winAscFrac`, this is how `mode: 'office'`
places the baseline at `style.lineHeight === 1` (see
`OFFICE_BASELINE_RATIO` in PositioningEngine.ts): for the common case
(`useTypoMetrics` false/undefined) real PowerPoint's baseline tracks
`(typoAscFrac + winAscFrac) / 2` — neither ratio alone (Roboto 0.7500 /
0.7917, Arial 0.7758 / 0.8103, Times New Roman 0.7626 / 0.8047 measured
empirically at ~0.777 / 0.784 / 0.782 — the average lands within ~1%,
either ratio alone off by 2–3%). A font with `useTypoMetrics` true
(found via `scripts/office-metrics/gen-font-grid-diagnostic.ts`: Unifont
is the one oracle font with the bit set) does **not** fit that formula —
only one such font has been measured so far, not enough to derive its
own rule, so it falls back to the flat `OFFICE_BASELINE_RATIO` (still
open, see RESULTS.md).

***

### winAscFrac?

> `optional` **winAscFrac?**: `number`

Defined in: [core/src/types/FontTypes.ts:40](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/FontTypes.ts#L40)

`OS/2.winAscent / (OS/2.winAscent + OS/2.winDescent)` — the font's own
ascent-side share of its *win* (legacy Windows/GDI) em-box. `undefined`
when the font has no OS/2 table.
