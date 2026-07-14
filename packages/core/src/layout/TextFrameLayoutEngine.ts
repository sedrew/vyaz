/**
 * TextFrameLayoutEngine.ts — Layout a full TextFrame (multi-paragraph).
 *
 * Pipeline:
 *   TextFrame → Paragraph[] → paragraphLayoutEngine.layout() each → merge Line[]
 *
 * Handles:
 * - Paragraph stacking with Y offset accumulation
 * - Padding (left reduces available width, left shifts X)
 * - frame.width/height optional → fitHorizontal/fitVertical flags
 * - List grouping: consecutive paragraphs with listStyle form a list group.
 *   Numbered list indices are auto-incremented within each group.
 *   `listRestart: true` breaks a group and restarts numbering.
 */
import type { TextFrame, ListStyle } from '../types/Document.js';
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
 * Layout a full TextFrame by stacking paragraphs with Y offset accumulation.
 */
export function layoutTextFrame(frame: TextFrame): TextFrameLayoutResult {
  const allLines: Line[] = [];
  let yOffset = frame.padding?.top ?? 0;
  let contentWidth = 0;

  const leftPad = frame.padding?.left ?? 0;
  const rightPad = frame.padding?.right ?? 0;

  // ── List grouping pass ──────────────────────────────────────────
  // Iterate paragraphs and auto-assign listIndex for numbered lists.
  // A "list group" is a run of consecutive paragraphs where:
  //   - each has listStyle.type !== 'none'
  //   - same listStyle.type (bullet ≠ number)
  //   - listRestart: true breaks the group
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
      // Use fontkit-compatible measurement: approximate as fontSize * text.length * 0.6
      // Exact measurement happens in positionLines, this is a pre-layout estimate
      return text.length * fontSize * 0.6;
    };
    const maxMW = computeMaxMarkerWidth(ls, startNumber, groupSize, measureMarkerWidth);
    for (let j = 0; j < groupSize; j++) {
      listMarkerWidths[groupStart + j] = maxMW;
    }

    i = groupEnd;
  }

  // ── Layout pass ─────────────────────────────────────────────────
  for (let i = 0; i < frame.paragraphs.length; i++) {
    const p = frame.paragraphs[i];

    // Available width: frame.width minus horizontal padding.
    // If width is undefined → Infinite (no wrap constraint).
    const maxWidth = frame.width !== undefined
      ? frame.width - leftPad - rightPad
      : Infinity;

    // If wrap is disabled, force no-wrap on the paragraph
    if (frame.wrap === false) {
      p.style = { ...p.style, whiteSpace: 'nowrap' };
    }

    const listIndex = listIndices[i];
    const listMarkerWidth = listMarkerWidths[i];
    const listStyle = p.style.listStyle;

    const result = paragraphLayoutEngine.layout(
      p,
      maxWidth,
      yOffset,
      undefined,
      listStyle,
      listIndex,
      listMarkerWidth,
    );

    for (const line of result.lines) {
      // Shift lines by left padding
      line.x += leftPad;
      // Set pIdx on each span in this paragraph
      for (const span of line.spans) {
        span.pIdx = i;
      }
      allLines.push(line);
    }

    contentWidth = Math.max(contentWidth, result.contentWidth);
    // result.height is absolute (includes yOffset passed in).
    // Set, don't accumulate — otherwise yOffset compounds.
    yOffset = result.height;
  }

  const bottomPad = frame.padding?.bottom ?? 0;
  const contentHeight = allLines.length > 0
    ? allLines[allLines.length - 1].y + allLines[allLines.length - 1].height + bottomPad
    : bottomPad;

  // contentWidth must include right padding so the content bbox accounts for
  // the full padded area when horizontal sizing is 'content'.
  contentWidth += rightPad;

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