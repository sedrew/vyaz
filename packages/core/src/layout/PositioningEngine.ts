/**
 * PositioningEngine.ts — pure X/Y positioning math.
 *
 * Takes pretext output (spans with fragments) + font metrics +
 * paragraph style → returns Line[] with absolute coordinates.
 *
 * X: alignment (left/center/right/justify) + indent
 * Y: baseline + lineHeight + spaceBefore/After
 * Justify: fragmented approach (each space → separate Span)
 *
 * Specs:
 * - CSS Text Module Level 3/4 (browser mode)
 * - ISO/IEC 29500 (Office Open XML / DrawingML, office mode)
 * - Parley alignment.rs (conceptually close, but here justify is simpler:
 *   slack is divided equally among stretchable space-spans,
 *   without mutating ClusterData.advance)
 */

import type { ParagraphStyle } from '../types/Document.js';
import type { FontMetrics } from '../types/FontTypes.js';
import type { Line, Span, SpanFontMetrics } from '../types/LayoutTypes.js';
import type { PreparedRichInlineItem } from '../compile/DocumentCompiler.js';

// ── Helper types for pretext ───────────────────────────────────────────

interface PretextFragment {
  itemIndex: number;
  text: string;
  gapBefore: number;
  occupiedWidth: number;
  start: { segmentIndex: number; graphemeIndex: number };
  end: { segmentIndex: number; graphemeIndex: number };
}

interface PretextLine {
  fragments: PretextFragment[];
  width: number;         // natural width (without stretching)
  end: { segmentIndex: number; graphemeIndex: number };
}

// ── PositioningEngine ─────────────────────────────────────────────────

/**
 * Build Line[] from pretext lines with alignment and metrics.
 *
 * @param pretextLines — pretext result (materializeRichInlineLineRange)
 * @param items — original PreparedRichInlineItem[] (for metadata)
 * @param fontMetricsFn — function to get font metrics for a span
 * @param style — paragraph style
 * @param maxWidth — available container width
 * @param startY — initial Y position
 * @param mode — metric mode ('browser' | 'office'), affects line height calculation
 * @returns { lines: Line[], contentWidth: number }
 */
export function positionLines(
  pretextLines: PretextLine[],
  items: PreparedRichInlineItem[],
  fontMetricsFn: (item: PreparedRichInlineItem) => FontMetrics,
  style: ParagraphStyle,
  maxWidth: number,
  startY: number = 0,
  mode: 'browser' | 'office' = 'browser',
  tag?: string,
): { lines: Line[]; contentWidth: number } {
  const lines: Line[] = [];
  let currentY = startY + style.spaceBefore;
  let charIndex = 0;
  let isFirstLine = true;
  let contentWidth = 0;

  for (let lineIdx = 0; lineIdx < pretextLines.length; lineIdx++) {
    const ptLine = pretextLines[lineIdx];

    // ── Build Span[] ────────────────────────────
    let maxAscent = 0;
    let maxDescent = 0;
    let maxLineHeightBase = 0; // max(ascent + descent) — for Office mode
    const spans: Span[] = [];

    for (const frag of ptLine.fragments) {
      const item = items[frag.itemIndex];
      if (!item) continue;

      const metrics = fontMetricsFn(item);
      // baselineOffset: superscript → negative (glyph moves up).
      // ascent must increase (glyph above baseline), descent must decrease (less overhang below).
      // subscript → positive (glyph moves down).
      // ascent must decrease, descent must increase.
      const effectiveAscent = metrics.ascent - (item.metadata.baselineOffset || 0);
      const effectiveDescent = metrics.descent + (item.metadata.baselineOffset || 0);

      maxAscent = Math.max(maxAscent, effectiveAscent);
      maxDescent = Math.max(maxDescent, effectiveDescent);
      // Office: line height base = ascent + descent (OS/2 usWinAscent + usWinDescent, scaled)
      maxLineHeightBase = Math.max(maxLineHeightBase, metrics.ascent + metrics.descent);

      // pretext: gapBefore — inter-word space BEFORE the word
      // occupiedWidth = gapBefore + textWidth
      // Split into two Span: space + word
      const gapWidth = frag.gapBefore || 0;
      const textWidth = frag.occupiedWidth;

      const baseFontMetrics = {
        ascent: metrics.ascent,
        descent: metrics.descent,
        fontSize: item.metadata.effectiveFontSize,
        baselineOffset: item.metadata.baselineOffset || undefined,
      };

      if (gapWidth > 0) {
        spans.push({
          x: 0,
          width: gapWidth,
          text: ' ',
          itemIndex: frag.itemIndex,
          pIdx: 0,
          tag,
          fontMetrics: baseFontMetrics,
          style: item.metadata.style,
          inlineWidget: item.metadata.inlineWidget,
          type: 'space',
        });
      }

      // Split leading/trailing spaces from frag.text into separate space spans
      // This is needed for SVG rendering to avoid xml:space="preserve" dependency
      const text = frag.text;
      const leadingMatch = text.match(/^(\s+)/);

      const totalChars = text.length;
      let remainingText = text;
      let leadingSpaceChars = 0;
      let trailingSpaceChars = 0;

      if (leadingMatch) {
        leadingSpaceChars = leadingMatch[1].length;
        remainingText = remainingText.slice(leadingSpaceChars);
      }
      if (remainingText.length > 0) {
        const trailMatch = remainingText.match(/(\s+)$/);
        if (trailMatch) {
          trailingSpaceChars = trailMatch[1].length;
          remainingText = remainingText.slice(0, -trailingSpaceChars);
        }
      }

      const computePartialWidth = (charCount: number) => {
        return totalChars > 0 ? (charCount / totalChars) * textWidth : 0;
      };

      // Leading space span
      if (leadingSpaceChars > 0) {
        spans.push({
          x: 0,
          width: computePartialWidth(leadingSpaceChars),
          text: text.slice(0, leadingSpaceChars),
          itemIndex: frag.itemIndex,
          pIdx: 0,
          tag,
          fontMetrics: baseFontMetrics,
          style: item.metadata.style,
          inlineWidget: item.metadata.inlineWidget,
          type: 'space',
        });
      }

      // Text span (trimmed)
      if (remainingText.length > 0) {
        const textWidth = computePartialWidth(remainingText.length);
        // Compute per-glyph advances by distributing textWidth equally across glyphs.
        // For monospace fonts this is exact; for proportional it's a linear approximation.
        // The FontMetricsProvider can later supply real glyph advances when available.
        const glyphAdvances: number[] = [];
        if (remainingText.length > 1) {
          const perGlyph = textWidth / remainingText.length;
          for (let i = 0; i < remainingText.length; i++) {
            glyphAdvances.push(perGlyph);
          }
        }
        spans.push({
          x: 0,
          width: textWidth,
          text: remainingText,
          itemIndex: frag.itemIndex,
          pIdx: 0,
          tag,
          fontMetrics: baseFontMetrics,
          style: item.metadata.style,
          inlineWidget: item.metadata.inlineWidget,
          type: 'text',
          glyphAdvances: glyphAdvances.length > 0 ? glyphAdvances : undefined,
        });
      }

      // Trailing space span
      if (trailingSpaceChars > 0) {
        const trailingStart = leadingSpaceChars + remainingText.length;
        spans.push({
          x: 0,
          width: computePartialWidth(trailingSpaceChars),
          text: text.slice(trailingStart, trailingStart + trailingSpaceChars),
          itemIndex: frag.itemIndex,
          pIdx: 0,
          tag,
          fontMetrics: baseFontMetrics,
          style: item.metadata.style,
          inlineWidget: item.metadata.inlineWidget,
          type: 'space',
        });
      }
    }

    // ── Inline-box width correction ─────────────────────────
    // When a span has an inlineWidget, override its width
    // to match the widget width (the \uFFFC advance is not included).
    for (const s of spans) {
      if (s.inlineWidget) {
        s.width = s.inlineWidget.width;
      }
    }

    // ── Mark trailing whitespace spans ───────────────────
    // CSS Text §4.1.3: end-of-line spaces have zero measure for line-advance calculations.
    // Parley: LineItemData.has_trailing_whitespace → trailing whitespace is excluded from advance.
    //
    // Find the last space(s) at the end of the line and mark them trailing.
    let trailingStartIndex = spans.length;
    for (let i = spans.length - 1; i >= 0; i--) {
      if (spans[i].type === 'space') {
        trailingStartIndex = i;
      } else {
        break;
      }
    }

    const trailingWidth = spans
      .slice(trailingStartIndex)
      .reduce((sum, f) => sum + f.width, 0);

    for (let i = trailingStartIndex; i < spans.length; i++) {
      spans[i].trailing = true;
    }

    // ── Compute effective line width (excluding trailing whitespace) ─
    // Use sum of actual span widths instead of ptLine.width, because
    // ptLine.width may not include gapBefore spaces that were split into
    // separate Span (e.g. "AA" + " A" → [AA][ ][A]).
    const totalSpanWidth = spans.reduce((sum, f) => sum + f.width, 0);
    const effectiveLineWidth = totalSpanWidth - trailingWidth;

    // ── X positioning ───────────────────────────────
    const indent = isFirstLine
      ? (style.leftIndent || 0) + (style.indent || 0)
      : (style.leftIndent || 0);
    const rightIndent = style.rightIndent || 0;
    const availableWidth = maxWidth - indent - rightIndent;

    const slack = Math.max(0, availableWidth - effectiveLineWidth);

    let xOffset = indent;

    if (style.alignment === 'center') {
      xOffset = indent + slack / 2;
    } else if (style.alignment === 'right') {
      xOffset = indent + slack;
    } else if (style.alignment === 'justify') {
      // Justify: distribute slack evenly among whitespace spans
      // (excluding trailing whitespace).
      //
      // CSS Text Module Level 3 §4.1.3: trailing spaces do not participate in justify.
      // CSS text-align-last: last line is not justify, but start-align.
      // OOXML (ISO 29500): last line of paragraph is not stretched.
      // Parley alignment.rs: excludes last line (line.break_reason == None/Explicit)
      //   and lines with num_spaces == 0.
      //
      // Determine if this is the last line in the paragraph.
      const isLastLine = lineIdx === pretextLines.length - 1;

      // Count only "stretchable" spaces: type === 'space' and !trailing
      const stretchableSpaces = spans.filter(
        (f) => f.type === 'space' && !f.trailing,
      );
      const spaceCount = stretchableSpaces.length;

      if (!isLastLine && spaceCount > 0 && slack > 0) {
        const extraPerSpace = slack / spaceCount;
        for (const sf of stretchableSpaces) {
          sf.width += extraPerSpace;
        }
      }

      // If this is the last line or no spaces — fallback to start-align
      // (LTR → left, RTL → right — always left for now, Bidi in Phase 2)
      xOffset = indent;
    }

    // Assign X positions
    let runX = xOffset;
    for (const frag of spans) {
      frag.x = Math.round(runX * 100) / 100;
      runX += frag.width;
    }

    const lineWidth = runX - xOffset;
    contentWidth = Math.max(contentWidth, lineWidth);

    // ── Y positioning ───────────────────────────────
    // Line height algorithm depends on mode:
    //
    // 'browser' (CSS-compatible, parley/Chrome matching):
    //   1. lineHeightPx = maxFontSize * style.lineHeight
    //
    // 'office' (MS Office / DrawingML pixel-perfect):
    //   PowerPoint has no line-height multiplier for single lines.
    //   Line height strictly = ascent + descent (OS/2.usWinAscent + usWinDescent).
    //   Baseline = Top + ascent without any half-leading additions.
    //   See pixel-perfect-text-layout.md §1 and ECMA-376.
    const maxFontSize = spans.reduce((max, f) => Math.max(max, f.fontMetrics.fontSize), 0);

    const ascentRounded = Math.round(maxAscent);
    const descentRounded = Math.round(maxDescent);

    let lineBoxHeight: number;
    let baseline: number;

    if (mode === 'office') {
      // DrawingML: lineHeight = ascent + descent, no lineHeight ×1.15 and no leading.
      // DrawingML: base line height = OS/2 (usWinAscent + usWinDescent), without
      // sum of rounded ascent/descent — that formula caused pixel-perfect
      // mismatch with PowerPoint, so we use maxLineHeightBase.
      lineBoxHeight = maxLineHeightBase;
      baseline = ascentRounded;
    } else {
      // Browser: CSS-compatible with leading distribution.
      const lineHeightPx = maxFontSize * style.lineHeight;
      const ascentDescentRounded = ascentRounded + descentRounded;

      const rawLineBoxHeight = Math.round(lineHeightPx);
      lineBoxHeight = Math.max(rawLineBoxHeight, ascentDescentRounded);
      const leading = lineBoxHeight - ascentDescentRounded; // always integer

      if (leading <= 0) {
        // Negative or zero leading: don't shrink the line
        baseline = ascentRounded;
      } else {
        // Positive leading: distribute as integers with above_leading < below_leading
        const ascentDescent = maxAscent + maxDescent;
        const aboveLeadingFloat = ascentDescent > 0 ? leading * maxAscent / ascentDescent : leading / 2;
        let aboveLeading = Math.round(aboveLeadingFloat);
        let belowLeading = leading - aboveLeading;

        // Ensure above_leading < below_leading (parley/Chrome heuristic)
        if (aboveLeading >= belowLeading) {
          aboveLeading = Math.floor((leading - 1) / 2);
          belowLeading = leading - aboveLeading;
        }

        baseline = ascentRounded + aboveLeading;
      }
    }

    const startIdx = charIndex;

    // Count characters in line (for INDEX_CONSIST)
    let lineCharCount = 0;
    for (const frag of spans) {
      lineCharCount += frag.text.length;
    }
    const endIdx = startIdx + lineCharCount;
    charIndex = endIdx;

    // ── Mark break type on the last span ─────────────
    // 'soft' — line wrap due to width constraint
    // 'hard' — explicit break (\n)
    // 'none'/undefined — not a line end (no break)
    if (spans.length > 0) {
      const lastSpan = spans[spans.length - 1];
      const lastSpanItem = items[lastSpan.itemIndex];
      // If last character is \n, it's a hard break
      if (lastSpanItem && lastSpan.text.endsWith('\n')) {
        lastSpan.breakType = 'hard';
      } else if (lineIdx < pretextLines.length - 1) {
        lastSpan.breakType = 'soft';
      }
    }

    lines.push({
      x: Math.round(xOffset * 100) / 100,
      y: Math.round(currentY * 100) / 100,
      width: Math.round(lineWidth * 100) / 100,
      height: Math.round(lineBoxHeight * 100) / 100,
      baseline: Math.round(baseline * 100) / 100,
      ascent: Math.round(maxAscent * 100) / 100,
      descent: Math.round(maxDescent * 100) / 100,
      startIndex: startIdx,
      endIndex: endIdx,
      alignment: style.alignment,
      spans,
    });

    currentY += lineBoxHeight;
    isFirstLine = false;
  }

  // Add spaceAfter to last line height
  // (return as is — ParagraphLayoutEngine will add spaceAfter to total height)

  return { lines, contentWidth };
}