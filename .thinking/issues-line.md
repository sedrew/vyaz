# Issues: Line tests

All issues go to the `run` branch. Covers `Line` (ex-LineBox) output type: alignment, Y positioning, multi-line, wrapping, invariants, and SVG rendering.

---

## LINE-1: Line output structure and metrics
Verify `Line` (ex-LineBox) properties: x, y, width, height, baseline, ascent, descent, startIndex, endIndex, alignment, spans.

**Acceptance Criteria:**
- [ ] `Line.x` equals indent for left alignment (no extra slack)
- [ ] `Line.x` equals indent + slack for center alignment
- [ ] `Line.x` equals indent + slack for right alignment
- [ ] `Line.y` increments sequentially for multi-line (monotonic Y)
- [ ] `Line.y` starts from `spaceBefore` offset
- [ ] `Line.width` matches actual content width (`lastSpan.x + lastSpan.width`)
- [ ] `Line.height` >= `ascent + descent`
- [ ] single run single line: `ascent` equals fragment's fontMetrics.ascent
- [ ] mixed font sizes: `ascent` = max across all spans
- [ ] mixed font sizes: `descent` = max across all spans
- [ ] `baseline` is within [ascent, height - descent]
- [ ] `startIndex` and `endIndex` span correctly across runs
- [ ] `startIndex` = 0 for first line
- [ ] `endIndex - startIndex` = total chars in that line
- [ ] `alignment` matches paragraph style

---

## LINE-2: X positioning — left / center / right alignment
Verify horizontal alignment produces correct X offsets.

**Acceptance Criteria:**
- [ ] **left**: `Line.x` = indent (no slack)
- [ ] **center**: `Line.x` = indent + (containerWidth - lineWidth) / 2
- [ ] **right**: `Line.x` = indent + (containerWidth - lineWidth)
- [ ] all alignments: `Line.x + Line.width` does NOT exceed `containerWidth`
- [ ] center alignment: slack is evenly split on both sides
- [ ] right alignment: text aligns to right edge, `Line.x` > 0
- [ ] multi-run: each span's `x` is relative to `Line.x` correctly
- [ ] indent applies to first line only
- [ ] leftIndent applies to all lines
- [ ] rightIndent reduces effective container width

---

## LINE-3: X positioning — justify alignment
Verify justify distributes extra space evenly among stretchable spaces.

**Acceptance Criteria:**
- [ ] justify: spaces stretch by `slack / spaceCount`
- [ ] `last line` is NOT justified (falls back to start-align)
- [ ] `single-line` paragraph is NOT justified
- [ ] no spaces in line → NOT justified (content as is)
- [ ] trailing spaces do NOT participate in justify
- [ ] justify does NOT change text content (only span.width changes)
- [ ] `Line.x` = indent for LTR justify
- [ ] `Line.width` = containerWidth after justify (excluding trailing)
- [ ] multi-run justify: spaces between runs stretch correctly

---

## LINE-4: Y positioning — baseline and line height
Verify vertical positioning produces correct baseline and line height.

**Acceptance Criteria:**
- [ ] `Line.baseline` = `max(span.fontMetrics.ascent)` + leading distribution
- [ ] `Line.height` = max of: `lineHeight * maxFontSize` vs `ascent + descent`
- [ ] mixed font sizes: larger font increases line height
- [ ] `lineHeight: 1.5` → height is 1.5× larger than `lineHeight: 1.0`
- [ ] `spaceBefore` shifts first line Y down
- [ ] `spaceAfter` adds space after paragraph (in ParagraphLayoutResult.height)
- [ ] consecutive lines do NOT overlap (`line[i+1].y >= line[i].y + line[i].height`)
- [ ] browser mode: leading is distributed with `aboveLeading < belowLeading`
- [ ] office mode: line height = `ascent + descent` (no leading)

---

## LINE-5: Multi-line wrapping
Verify text wraps correctly when content exceeds container width.

**Acceptance Criteria:**
- [ ] single word fits → one line
- [ ] multiple words with `maxWidth` smaller than full text → wrapped to multiple lines
- [ ] `Line.y` increases monotonically across lines
- [ ] `Line.width` <= `maxWidth` for each line
- [ ] `startIndex`/`endIndex` are contiguous across lines
- [ ] sum of `(endIndex - startIndex)` across all lines == total text length
- [ ] `whiteSpace: 'nowrap'` → all text in one line (no wrap)
- [ ] `whiteSpace: 'pre'` → wrap on `\n` only
- [ ] very narrow container (`width: 10`) → text wraps character by character

---

## LINE-6: Multi-run in a line
Verify multi-run paragraphs produce correct Line structure.

**Acceptance Criteria:**
- [ ] two runs adjacent → `Line.spans` has two `type:'text'` spans
- [ ] two runs with space → `Line.spans` = [text, space, text]
- [ ] three runs with spaces → `Line.spans` = [text, space, text, space, text]
- [ ] empty run mid-line is skipped
- [ ] run with only spaces → one `type:'space'` span
- [ ] leading space in first run is trimmed
- [ ] trailing space in last run → spans marked `trailing: true`
- [ ] each span's `style` matches its source TextRun
- [ ] each span's `itemIndex` matches source run index

---

## LINE-7: Trailing whitespace
Verify trailing spaces are correctly identified and handled.

**Acceptance Criteria:**
- [ ] last space(s) at end of line → all marked `trailing: true`
- [ ] trailing spaces are NOT counted in `effectiveLineWidth`
- [ ] trailing spaces do NOT participate in justify (no extra stretch)
- [ ] trailing spaces do NOT affect `Line.width`
- [ ] space in middle of line → `trailing: false`
- [ ] multiple trailing spaces → all marked trailing: true
- [ ] trailing spaces in multi-run: last run's trailing spaces → trailing: true

---

## LINE-8: breakType marking
Verify line break types are correctly assigned.

**Acceptance Criteria:**
- [ ] **soft break**: last span of a wrapped line → `breakType: 'soft'`
- [ ] **hard break**: line ending in `\n` → last span `breakType: 'hard'`
- [ ] **no break**: last line of paragraph → `breakType: undefined`
- [ ] single-line paragraph → `breakType: undefined` on all spans

---

## LINE-9: Zero-width and infinite-width containers
Verify edge cases.

**Acceptance Criteria:**
- [ ] `maxWidth: 0` → does NOT crash
- [ ] `maxWidth: 0` → text stacks vertically (multiple lines)
- [ ] `maxWidth: Infinity` → all text in one line
- [ ] `maxWidth: very small` → wraps, all lines have correct startIndex/endIndex
- [ ] empty text (`''`) → zero lines, no crash

---

## LINE-10: contentWidth consistency
Verify ParagraphLayoutResult.contentWidth matches actual content.

**Acceptance Criteria:**
- [ ] single run single line: `contentWidth === line.width`
- [ ] multi-run single line: `contentWidth === line.width`
- [ ] multi-line wrapping: `contentWidth >= max(line.width)`
- [ ] multi-line multi-run: `contentWidth >= max(line.width)`
- [ ] center alignment: `contentWidth` unaffected by alignment (physical width, not positioned)

---

## LINE-11: Invariants (assertLineInvariants)
Verify `assertLineInvariants` (ex-assertLineBoxInvariants) catches violations.

**Acceptance Criteria:**
- [ ] **NO_OVERLAP**: overlapping lines → throws error
- [ ] **MONOTONIC_Y**: non-monotonic Y → throws error
- [ ] **WIDTH_FIT**: line exceeds maxWidth → throws error
- [ ] **ZERO_WIDTH**: width=0 → does not crash
- [ ] **INFINITE_WIDTH**: width=Infinity → all text in one line
- [ ] **BASELINE**: all spans in a line share the same baseline (within tolerance)
- [ ] all invariants pass for valid layout

---

## LINE-12: SVG rendering — alignment
Verify SVG output for all alignment modes.

**Acceptance Criteria:**
- [ ] left alignment: `<text x="0" y="...">` (assuming no indent)
- [ ] center alignment: `<text x="(width - lineWidth) / 2" y="...">`
- [ ] right alignment: `<text x="(width - lineWidth)" y="...">`
- [ ] justify: `<tspan>` with correct x positions, spaces visibly stretched
- [ ] indent: `<text x="indent" y="...">` for first line

---

## LINE-13: SVG rendering — multi-line
Verify SVG output for multi-line paragraphs.

**Acceptance Criteria:**
- [ ] each line → separate `<text>` element
- [ ] `<text y="...">` increments by line height for each line
- [ ] `<text y="...">` = `line.y + line.baseline` (baseline coordinate)
- [ ] multi-run multi-line: correct `<tspan>` per span per line
- [ ] trailing space spans are NOT rendered (in browser mode)
- [ ] trailing space spans ARE rendered as `<tspan> </tspan>` (in preserve mode)

---

## LINE-14: SVG rendering — multi-script multi-line
Verify SVG output for multi-script text that wraps.

**Acceptance Criteria:**
- [ ] Latin + Cyrillic + CJK wrapping: each line has correct fragments
- [ ] valid SVG output (`is-svg` passes)
- [ ] no text overlap between lines
- [ ] all characters present across lines