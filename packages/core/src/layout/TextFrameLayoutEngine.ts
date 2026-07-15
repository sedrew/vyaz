/**
 * TextFrameLayoutEngine.ts — Layout a full TextFrame (multi-paragraph).
 *
 * Pipeline:
 *   TextFrame → Paragraph[] → paragraphLayoutEngine.layout() each → merge Line[]
 *
 * Handles:
 * - Paragraph stacking with Y offset accumulation
 * - Multi-column layout (CSS multi-column model)
 * - Padding (left reduces available width, left shifts X)
 * - frame.width/height optional → fitHorizontal/fitVertical flags
 * - List grouping: consecutive paragraphs with listStyle form a list group.
 *   Numbered list indices are auto-incremented within each group.
 *   `listRestart: true` breaks a group and restarts numbering.
 *
 * Multi-column algorithm:
 *   1. Calculate colWidth = (frameWidth - (count-1)*gap - padding) / count
 *   2. Layout each paragraph with maxWidth = colWidth (NOT frame.width)
 *   3. Distribute lines column-by-column (column-fill: auto)
 *   4. If frame.height is set, lines overflow to next column when colHeight exceeded
 *   5. If no frame.height, columns are infinite (all lines stay in column 0)
 */
import type { TextFrame, ListStyle, VerticalAlignment, Paragraph } from '../types/Document.js';
import type { Line } from '../types/LayoutTypes.js';
import { paragraphLayoutEngine } from './ParagraphLayoutEngine.js';
import { splitParagraphByHardBreaks } from '../compile/DocumentCompiler.js';
import { formatListNumber, defaultBulletChar } from '../utils/list.js';

/**
 * Result of laying out a full TextFrame.
 *
 * `fitHorizontal` / `fitVertical` tell the renderer which dimension to use:
 * - `'frame'`   → use `frameWidth` / `frameHeight`
 * - `'content'` → use `contentWidth` / `contentHeight`
 */
export interface TextFrameLayoutResult {
  lines: Line[];
  /** Frame width (set when TextFrame.width was provided). */
  frameWidth?: number;
  /** Frame height (set when TextFrame.height was provided). */
  frameHeight?: number;
  /** Actual content width (may exceed frameWidth when wrap=false). */
  contentWidth: number;
  /** Actual content height (may exceed frameHeight). */
  contentHeight: number;
  /** Whether horizontal dimension should use frame or content size. */
  fitHorizontal: 'frame' | 'content';
  /** Whether vertical dimension should use frame or content size. */
  fitVertical: 'frame' | 'content';
}

/**
 * Resolve the marker text for a list item (needed for width measurement).
 */
function getMarkerTextHelper(listStyle: ListStyle, listIndex: number): string {
  if (listStyle.type === 'bullet') {
    return listStyle.bulletChar ?? defaultBulletChar(listStyle.level ?? 0);
  }
  if (listStyle.type === 'number') {
    const fmt = listStyle.numberFormat ?? 'decimal';
    return formatListNumber(listIndex, fmt) + '.';
  }
  return '';
}

/**
 * Compute the widest marker across a list group, used to expand bulletIndent
 * when numbered markers have varying widths (e.g. "9." vs "10.").
 */
function computeMaxMarkerWidth(
  listStyle: ListStyle,
  startIndex: number,
  count: number,
  measureText: (text: string, fontSize: number) => number,
): number {
  if (listStyle.type !== 'number') return 0;
  let maxWidth = 0;
  for (let i = 0; i < count; i++) {
    const markerText = getMarkerTextHelper(listStyle, startIndex + i);
    const width = measureText(markerText, 12); // approximate, will be refined by positionLines
    maxWidth = Math.max(maxWidth, width);
  }
  return maxWidth;
}

/**
 * Apply vertical alignment to lines within a column.
 *
 * @param lines — lines belonging to this column (already has correct x/y)
 * @param colHeight — total column height (frame.height or content height)
 */
function applyVerticalAlignment(
  lines: Line[],
  colHeight: number,
  alignment: VerticalAlignment,
): void {
  if (alignment === 'top' || lines.length === 0) return;

  const firstLineY = lines[0].y;
  const lastLineEnd = lines[lines.length - 1].y + lines[lines.length - 1].height;
  const contentHeight = lastLineEnd - firstLineY;
  const extraSpace = colHeight - contentHeight;
  if (extraSpace <= 0) return;

  let offset = 0;
  if (alignment === 'middle') {
    offset = extraSpace / 2;
  } else if (alignment === 'bottom') {
    offset = extraSpace;
  }

  for (const line of lines) {
    line.y += offset;
  }
}

/**
 * Layout a full TextFrame by stacking paragraphs with Y offset accumulation.
 */
export function layoutTextFrame(frame: TextFrame): TextFrameLayoutResult {
  // ── Multi-column setup ────────────────────────────────────────────
  const leftPad = frame.padding?.left ?? 0;
  const rightPad = frame.padding?.right ?? 0;
  const topPad = frame.padding?.top ?? 0;
  const bottomPad = frame.padding?.bottom ?? 0;

  const hasColumns = frame.columns != null && frame.columns.count > 1 && frame.width != null;
  let colWidth: number | undefined;
  let colCount = 1;
  let colGap = 0;

  if (hasColumns) {
    colCount = frame.columns!.count;
    colGap = frame.columns!.gap;
    const totalPad = leftPad + rightPad + (colCount - 1) * colGap;
    colWidth = (frame.width! - totalPad) / colCount;
  }

  const colHeight = frame.height != null
    ? frame.height - topPad - bottomPad
    : Infinity;

  const verticalAlign: VerticalAlignment = frame.verticalAlignment ?? 'top';

  // ── List grouping pass ──────────────────────────────────────────
  // (identical to before, but uses colWidth for maxWidth later)
  const listIndices: (number | undefined)[] = new Array(frame.paragraphs.length).fill(undefined);
  const listMarkerWidths: (number | undefined)[] = new Array(frame.paragraphs.length).fill(undefined);

  let i = 0;
  while (i < frame.paragraphs.length) {
    const p = frame.paragraphs[i];
    const ls = p.style.listStyle;

    if (!ls || ls.type === 'none') {
      i++;
      continue;
    }

    // Find end of this list group
    let groupStart = i;
    let groupEnd = i + 1;
    while (groupEnd < frame.paragraphs.length) {
      const nextP = frame.paragraphs[groupEnd];
      const nextLs = nextP.style.listStyle;
      if (!nextLs || nextLs.type !== ls.type || nextP.style.listRestart) {
        break;
      }
      // Same nesting level only
      if ((nextLs.level ?? 0) !== (ls.level ?? 0)) {
        break;
      }
      groupEnd++;
    }

    const groupSize = groupEnd - groupStart;
    const startNumber = ls.startNumber ?? 1;

    // Assign indices
    for (let j = 0; j < groupSize; j++) {
      listIndices[groupStart + j] = startNumber + j;
    }

    // Compute max marker width for numbered lists in this group
    const paraFontSize = p.children[0]?.fontSize ?? 12;
    const measureMarkerWidth = (text: string, fontSize: number): number => {
      return text.length * fontSize * 0.6;
    };
    const maxMW = computeMaxMarkerWidth(ls, startNumber, groupSize, measureMarkerWidth);
    for (let j = 0; j < groupSize; j++) {
      listMarkerWidths[groupStart + j] = maxMW;
    }

    i = groupEnd;
  }

  // ── Layout pass ─────────────────────────────────────────────────
  const allLines: Line[] = [];
  let contentWidth = 0;

  const currentColY: number[] = new Array(colCount).fill(topPad);

  /**
   * Layout a single paragraph (may be virtual from splitParagraphByHardBreaks).
   * Returns { lines, contentWidth, height }.
   */
  function layoutSingleParagraph(
    p: Paragraph,
    maxWidth: number,
    pIdx: number,
    listIndex?: number,
    listMarkerWidth?: number,
  ): { lines: Line[]; height: number; contentWidth: number } {
    const listStyle = p.style.listStyle;

    // Fast path: empty paragraph → hard-break line (from \n separator)
    if (p.children.length === 0) {
      // Use the paragraph's own style or fallback to default font metrics
      const fontSize = 12;
      const lineHeight = p.style.lineHeight;
      const lineHeightPx = Math.round(fontSize * lineHeight);
      return {
        lines: [{
          x: 0, y: 0, width: 0, height: lineHeightPx,
          baseline: Math.round(fontSize * 0.8),
          ascent: Math.round(fontSize * 0.8),
          descent: Math.round(fontSize * 0.2),
          startIndex: 0, endIndex: 0,
          isHardBreak: true,
          spans: [],
        }],
        height: lineHeightPx,
        contentWidth: 0,
      };
    }

    const result = paragraphLayoutEngine.layout(
      p,
      maxWidth,
      0, // relative yOffset — we position lines in the caller
      undefined,
      listStyle,
      listIndex,
      listMarkerWidth,
    );

    return {
      lines: result.lines,
      height: result.contentHeight,
      contentWidth: result.contentWidth,
    };
  }

  // For non-column layout, we use a single "virtual column" approach
  for (let i = 0; i < frame.paragraphs.length; i++) {
    const p = frame.paragraphs[i];

    // Zero phase: split `pre`/`pre-line`/`pre-wrap` paragraphs on \n
    const subParagraphs = splitParagraphByHardBreaks(p);

    // Available width: colWidth if columns, otherwise frame.width minus padding
    const maxWidth = hasColumns
      ? colWidth!
      : frame.width !== undefined
        ? frame.width - leftPad - rightPad
        : Infinity;

    // If wrap is disabled, force no-wrap on the paragraph
    if (frame.wrap === false) {
      p.style = { ...p.style, whiteSpace: 'nowrap' };
    }

    const listIndex = listIndices[i];
    const listMarkerWidth = listMarkerWidths[i];

    // Layout each sub-paragraph
    for (let subIdx = 0; subIdx < subParagraphs.length; subIdx++) {
      const subPara = subParagraphs[subIdx];

      // Add spaceBefore only for the first sub-paragraph of each original paragraph
      if (!hasColumns && subIdx === 0) {
        currentColY[0] += p.style.spaceBefore;
      }
      const subResult = layoutSingleParagraph(
        subPara,
        maxWidth,
        i,
        listIndex,
        listMarkerWidth,
      );

      for (const line of subResult.lines) {
        if (!hasColumns) {
          // Non-column: simple accumulation
          line.x += leftPad;
          for (const span of line.spans) {
            span.pIdx = i;
          }
          allLines.push(line);
          contentWidth = Math.max(contentWidth, subResult.contentWidth);
          line.y = currentColY[0];
          currentColY[0] += line.height;
          continue;
        }

        // ── Multi-column: distribute lines across columns ──────────
        let colIdx = 0;
        for (let c = 0; c < colCount; c++) {
          if (currentColY[c] < currentColY[colIdx]) colIdx = c;
        }

        let placed = false;
        for (let attempt = 0; attempt < colCount; attempt++) {
          if (currentColY[colIdx] + line.height <= colHeight) {
            line.x = colIdx * (colWidth! + colGap) + leftPad;
            line.y = currentColY[colIdx];
            line.columnIndex = colIdx;
            currentColY[colIdx] += line.height;
            for (const span of line.spans) {
              span.pIdx = i;
            }
            allLines.push(line);
            contentWidth = Math.max(contentWidth, line.x + line.width + rightPad);
            placed = true;
            break;
          }
          colIdx = (colIdx + 1) % colCount;

          if (attempt === colCount - 1) {
            line.x = colIdx * (colWidth! + colGap) + leftPad;
            line.y = currentColY[colIdx];
            line.columnIndex = colIdx;
            currentColY[colIdx] += line.height;
            for (const span of line.spans) {
              span.pIdx = i;
            }
            allLines.push(line);
            contentWidth = Math.max(contentWidth, line.x + line.width + rightPad);
            placed = true;
          }
        }

        if (!placed) {
          line.x = leftPad;
          line.y = currentColY[0];
          line.columnIndex = 0;
          currentColY[0] += line.height;
          for (const span of line.spans) {
            span.pIdx = i;
          }
          allLines.push(line);
        }
      }

      // Apply spaceAfter after the LAST sub-paragraph of the original paragraph
      if (!hasColumns && subPara === subParagraphs[subParagraphs.length - 1]) {
        currentColY[0] += p.style.spaceAfter;
      }
    } // end for each paragraph
  }

  // ── Apply vertical alignment per column ──────────────────────────
  if (hasColumns && verticalAlign !== 'top' && frame.height != null) {
    const colLines: Line[][] = new Array(colCount).fill(null).map(() => []);
    for (const line of allLines) {
      const ci = line.columnIndex ?? 0;
      colLines[ci].push(line);
    }
    for (let c = 0; c < colCount; c++) {
      applyVerticalAlignment(colLines[c], colHeight, verticalAlign);
    }
  }

  // ── Compute final content dimensions ─────────────────────────────
  if (hasColumns) {
    // contentWidth = total frame width (includes all columns + gaps + padding)
    contentWidth = frame.width!;
  } else {
    contentWidth += rightPad;
  }

  const lastLine = allLines.length > 0 ? allLines[allLines.length - 1] : null;
  const contentHeight = lastLine
    ? lastLine.y + lastLine.height + bottomPad
    : bottomPad;

  return {
    lines: allLines,
    frameWidth: frame.width,
    frameHeight: frame.height,
    contentWidth,
    contentHeight,
    fitHorizontal: frame.width !== undefined ? 'frame' : 'content',
    fitVertical: frame.height !== undefined ? 'frame' : 'content',
  };
}