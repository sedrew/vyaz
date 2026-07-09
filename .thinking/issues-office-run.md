# Issues: Office Mode — TextRun

All issues go to the `run` branch. Covers Office mode (`mode: 'office'`) for TextRun/Line/SVG — OS/2 font metrics, line gap, trailing whitespace handling, and pixel-perfect comparison with PowerPoint output.

Office mode is activated via `fontMetricsProvider.setMode('office')`. It changes:
- **Font metrics source**: OS/2.usWinAscent + usWinDescent (instead of hhea)
- **Line height calculation**: no leading, strict ascent + descent + lineGap
- **Trailing whitespace**: hanging overflow (not zero-width)

---

## OFFICE-RUN-1: Office mode font metrics (OS/2)
Verify that `'office'` mode reads font metrics from OS/2 table.

**Acceptance Criteria:**
- [ ] `fontMetricsProvider.setMode('office')` → `getMode() === 'office'`
- [ ] `fontMetricsProvider.getMetrics('Unifont', 16)` returns ascent/descent from OS/2 table
- [ ] `fontMetricsProvider.getMetrics('Unifont', 16)` in office mode → different ascent/descent than browser mode
- [ ] `FragmentBox.fontMetrics.ascent` in office mode uses OS/2 values
- [ ] `FragmentBox.fontMetrics.descent` in office mode uses OS/2 values
- [ ] `sourceTable` field on `FontMetrics` equals `'OS/2'` in office mode
- [ ] `sourceTable` field equals `'hhea'` in browser mode (already tested)
- [ ] switching between modes returns consistent metrics for each mode

---

## OFFICE-RUN-2: Office mode line height
Verify line height calculation in office mode matches PowerPoint behavior.

**Acceptance Criteria:**
- [ ] office mode: `Line.height` = `ascent + descent` + lineGap (no leading distribution)
- [ ] office mode: `Line.baseline` = `ascent` (no half-leading)
- [ ] browser mode: `Line.height` = `max(lineHeight * maxFontSize, ascent + descent)` with leading
- [ ] office mode: same paragraph renders with different line height than browser mode
- [ ] `lineHeight` multiplier is IGNORED in office mode (PowerPoint single spacing)
- [ ] all lines in office mode are strictly `ascent + descent` height
- [ ] consecutive lines in office mode: `line[i+1].y = line[i].y + line[i].height` (no gaps)

---

## OFFICE-RUN-3: Office mode trailing whitespace (hanging)
Verify trailing whitespace renders as full-width overflow in office mode (not zero-width).

**Acceptance Criteria:**
- [ ] office mode: trailing spaces keep their full width (NOT excluded from advance)
- [ ] office mode: `Line.width` INCLUDES trailing whitespace width
- [ ] browser mode: `Line.width` EXCLUDES trailing whitespace width
- [ ] office mode: trailing spaces render beyond container width (hanging overflow)
- [ ] browser mode: trailing spaces are zero-width (CSS drop spaces)
- [ ] office mode: justify does NOT affect trailing spaces (still full width, overflow)
- [ ] trailing spaces in office mode still have `trailing: true` (for identification)
- [ ] multiple trailing spaces: all keep full width in office mode

---

## OFFICE-RUN-4: Office mode SVG output
Verify SVG output in office mode matches PowerPoint-like positioning.

**Acceptance Criteria:**
- [ ] SVG in office mode: `<text y="...">` uses office baseline calculation
- [ ] `preset='preserve'` in office mode: trailing spaces render as `<tspan> </tspan>` with full width
- [ ] `preset='browser'` in office mode: trailing spaces are skipped (CSS-style)
- [ ] SVG `<text>` y coordinates differ between browser and office mode for same paragraph
- [ ] office mode SVG: valid (`is-svg` passes)
- [ ] office mode + debug overlays: line height rects match office metrics

---

## OFFICE-RUN-5: Office mode comparison with PowerPoint
Compare output metrics against expected PowerPoint values for reference fonts.

**Reference data (from pixel-perfect analysis):**

| Font | Size | Office ascent | Office descent | Line height (at 100pt) |
|------|------|---------------|----------------|------------------------|
| Arial | 100pt | 1856 * scale | 434 * scale | ~120.5 pt (with line gap ~1.078×) |

**Acceptance Criteria:**
- [ ] `fontMetricsProvider.getMetrics('Arial', 100)` in office mode → `ascent ≈ 1856 * (100/2048)`
- [ ] `fontMetricsProvider.getMetrics('Arial', 100)` in office mode → `descent ≈ 434 * (100/2048)`
- [ ] office mode line height ratio ≈ 1.078× vs browser mode for Arial
- [ ] Arial at 100pt, office mode: `font.ascent + font.descent + font.lineGap` ≈ 1.078 × `(winAscent + winDescent) * scale`
- [ ] any font: office line height >= browser line height

---

## OFFICE-RUN-6: Office mode — registration and switching
Verify mode switching works end-to-end without re-running layout.

**Acceptance Criteria:**
- [ ] switch mode between `layout()` calls → each call respects current mode
- [ ] `layout()` produces different line heights for browser vs office modes
- [ ] `layoutGlyph()` works in both modes (glyph advances unchanged by mode)
- [ ] `assertLineBoxInvariants` passes in both modes
- [ ] mode switch does NOT invalidate font cache (already registered fonts remain)
- [ ] invalid mode string → throws or falls back to browser mode