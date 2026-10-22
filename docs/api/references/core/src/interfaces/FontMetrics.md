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

### strikeoutThickness?

> `optional` **strikeoutThickness?**: `number`

Defined in: [core/src/types/FontTypes.ts:72](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/FontTypes.ts#L72)

***

### strikeoutTop?

> `optional` **strikeoutTop?**: `number`

Defined in: [core/src/types/FontTypes.ts:71](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/FontTypes.ts#L71)

***

### typoAscFrac?

> `optional` **typoAscFrac?**: `number`

Defined in: [core/src/types/FontTypes.ts:34](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/FontTypes.ts#L34)

`OS/2.typoAscender / (OS/2.typoAscender − OS/2.typoDescender)` — the font's
own ascent-side share of its *typo* em-box. `undefined` when the font has
no OS/2 table (e.g. canvas-fallback metrics).

***

### underlineThickness?

> `optional` **underlineThickness?**: `number`

Defined in: [core/src/types/FontTypes.ts:70](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/FontTypes.ts#L70)

***

### underlineTop?

> `optional` **underlineTop?**: `number`

Defined in: [core/src/types/FontTypes.ts:69](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/FontTypes.ts#L69)

Font-defined decoration geometry, px, measured from the baseline with y
pointing **down**, each the top edge of the stroke: underline from
`post.underlinePosition` / `underlineThickness`, strikeout from
`OS/2.yStrikeoutPosition` / `yStrikeoutSize` (so `strikeoutTop` is
negative). `undefined` when the table is missing. `mode: 'office'`
draws decorations exactly here (PowerPoint, measured).

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
(`useTypoMetrics` false/undefined) PowerPoint's baseline sits at
`winAscFrac` of the line box (Roboto 0.7917, Arial 0.8103, Times New Roman
0.8047, Georgia 0.8070, Verdana 0.8272, Courier New 0.7349, Tahoma 0.8289
— each inside the range its PDF baselines allow, 12–144 pt;
`typoAscFrac` is the fallback when win metrics are missing). A font with `useTypoMetrics` true
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
