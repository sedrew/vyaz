# PowerPoint Font Metrics — Line Height & Glyph Scaling

## Problem

When changing the font in PowerPoint (PPTX via DrawLM), the outer size box does not change, but glyph sizes for different fonts at the same point size differ significantly.

## Key Concepts

### 1. Em Square & Fixed Scale for 1pt

Digital fonts (TrueType/OpenType) are designed inside an **Em Square** grid, sized by `unitsPerEm` (typically 1024 or 2048 design units).

When PowerPoint renders a font at 1pt, the text engine applies linear mathematical scaling:

```
Scale Ratio = pointSize / unitsPerEm
```

1pt in PowerPoint is rigidly tied to physical document coordinates (1 pt = 1/72 inch = 12700 EMUs in OOXML). The engine takes glyph vector coordinates from the font file and simply multiplies them by this ratio.

### 2. Why Different Fonts at the Same Size Look Different

Even though the scale ratio for 1pt is identical, fonts look different because:

- **Em square usage**: One font's capital M may use 80% of Em square height (looks huge), another only 50% (looks tiny)
- **Advance Width**: Each glyph has its own width and sidebearings encoded in the `hmtx` table

### 3. OS/2 Table — PowerPoint's Line Spacing

Microsoft Office is tightly bound to the **OS/2 table** metrics:

| Field | Table | Purpose |
|-------|-------|---------|
| `usWinAscent`, `usWinDescent` | OS/2 | **Line spacing** (Office uses these exclusively) |
| `ascender`, `descender` | hhea | **Ignored** by Office |
| `unitsPerEm` | head | Scaling factor |
| `advanceWidth` | hmtx | Glyph width |
| `sTypoAscender`, `sTypoDescender`, `sTypoLineGap` | OS/2 | Standard typographic metrics (ignored unless `fsSelection` bit 7 set) |

**Formula for Office line height in points:**

```typescript
const scale = fontSize / font.unitsPerEm;
const lineHeightPt = (os2.usWinAscent + os2.usWinDescent) * scale;
```

**But this is not the full story.** PowerPoint adds default line gap.

### 4. The 1.078 Coefficient Mystery for Arial

For Arial (`unitsPerEm = 2048`):
- `winAscent = 1856`
- `winDescent = 434`

Expected height at 100pt: `(1856 + 434) * (100 / 2048) = 111.81 pt`

PowerPoint actual: ~120.5 pt.

```
ratio = 120.5 / 111.81 ≈ 1.078
```

This 1.078 factor is not random — it's PowerPoint's built-in **Line Gap** (leading) that Office adds on top of Win metrics when line spacing is set to "Single" (1.0).

### 5. How to Automate Without Hardcoding Per-Font Factors

**Don't do this:**

```typescript
if (fontName === 'Arial') k = 1.078;
if (fontName === 'Calibri') k = 1.12;
```

**Instead**, compute dynamically using `sTypoLineGap` or `lineGap`:

```typescript
// Total line height that PowerPoint calculates internally:
const scale = fontSize / font.unitsPerEm;

// Step 1: font content height (Win metrics)
const fontHeight = (os2.usWinAscent + Math.abs(os2.usWinDescent)) * scale;

// Step 2: add line gap from hhea or sTypoLineGap
const lineGapPt = font.lineGap * scale;  // hhea.lineGap

// Step 3: add PowerPoint TextBox default insets (marT, marB)
// Default PPTX margins: ~0.05 inches each = ~3.6 pt top + bottom
const insetPadding = 7.2;  // total

const totalLineHeight = fontHeight + lineGapPt;
const boxHeight = (totalLineHeight * totalLines) + insetPadding;
```

### 6. Pipeline for DrawLM / PPTX Automation

When changing fonts programmatically in PPTX:

1. **Extract font metrics** via `fontkit` or `opentype.js`:
   - `unitsPerEm` (head table)
   - `usWinAscent`, `usWinDescent` (OS/2 table)
   - `lineGap` (hhea table)
   - `advanceWidth` per glyph (hmtx table)

2. **Calculate** actual line width and paragraph height for the new font

3. **Write** new `width` and `height` to the Text Box shape properties in the PPTX file

### 7. Complete Formula Summary

```
# Per-glyph advance in points
advancePt = glyph.advanceWidth * (fontSize / unitsPerEm)

# Line height in points (PowerPoint "Single" mode)
lineHeightPt = (usWinAscent + |usWinDescent| + lineGap) * (fontSize / unitsPerEm)

# Box height for N lines
boxHeight = lineHeightPt * lineCount + insetTopPt + insetBottomPt

# Where insets default to ~0.05 inches each (~3.6 pt)