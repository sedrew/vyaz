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
import type { TextFrame, ListStyle, VerticalAlignment } from '../types/Document.js';
import type { Line } from '../types/LayoutTypes.js';
import { paragraphLayoutEngine } from './ParagraphLayoutEngine.js';
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

  // Helper: push a line and update position
  const currentColY: number[] = new Array(colCount).fill(topPad);

  // For non-column layout, we use a single "virtual column" approach
  for (let i = 0; i < frame.paragraphs.length; i++) {
    const p = frame.paragraphs[i];

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
    const listStyle = p.style.listStyle;

    // Start paragraph on current column (column 0 initially, or current active column)
    // We layout the paragraph with the full maxWidth — the paragraph's own
    // line-breaking handles wrapping.
    // For multi-column, we use a relative yOffset = 0, then position lines below.
    const result = paragraphLayoutEngine.layout(
      p,
      maxWidth,
      0, // relative yOffset — we'll position lines ourselves
      undefined,
      listStyle,
      listIndex,
      listMarkerWidth,
    );

    // Apply paragraph-level spaceBefore (CSS margin-top equivalent).
    // positionLines() already offsets Y by spaceBefore internally, but
    // line.y is overwritten below with the global Y from currentColY.
    // So we must add spaceBefore to currentColY before placing lines.
    if (!hasColumns) {
      currentColY[0] += p.style.spaceBefore;
    }

    for (const line of result.lines) {
      if (!hasColumns) {
        // Non-column: simple accumulation (existing behavior)
        line.x += leftPad;
        for (const span of line.spans) {
          span.pIdx = i;
        }
        allLines.push(line);
        contentWidth = Math.max(contentWidth, result.contentWidth);
        // Result height already includes the passed yOffset (0), so this is relative.
        // We accumulate absolute y from result.height (which is total paragraph height).
        line.y = currentColY[0];
        currentColY[0] += line.height;
        continue;
      }

      // ── Multi-column: distribute lines across columns ──────────
      // Try to place the current line in the current column.
      // If it doesn't fit — move to next column.
      let colIdx = 0;
      for (let c = 0; c < colCount; c++) {
        if (currentColY[c] < currentColY[colIdx]) colIdx = c;
      }

      // Try current column; if line doesn't fit, advance to next.
      // For auto fill: each column fills completely before moving to next.
      // We use a greedy column selection: find the column with smallest Y
      // that has room for this line.
      let placed = false;
      for (let attempt = 0; attempt < colCount; attempt++) {
        if (currentColY[colIdx] + line.height <= colHeight) {
          // Fits in this column
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
        // Advance to next column
        colIdx = (colIdx + 1) % colCount;

        // If we've wrapped around, all columns are full — overflow stays in last column
        if (attempt === colCount - 1) {
          // Place in last attempted column even if it overflows
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
        // Fallback: place in column 0 (shouldn't happen)
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

    // Apply paragraph-level spaceAfter (CSS margin-bottom equivalent).
    // positionLines() in PositioningEngine applies spaceBefore but does NOT
    // add spaceAfter — it is the caller's responsibility.
    if (!hasColumns) {
      currentColY[0] += p.style.spaceAfter;
    }
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