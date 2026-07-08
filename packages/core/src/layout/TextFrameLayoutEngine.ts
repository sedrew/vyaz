/**
 * TextFrameLayoutEngine.ts — Layout a full TextFrame (multi-paragraph).
 *
 * Pipeline:
 *   TextFrame → Paragraph[] → paragraphLayoutEngine.layout() each → merge LineBox[]
 *
 * Handles:
 * - Paragraph stacking with Y offset accumulation
 * - Padding (left reduces available width, left shifts X)
 * - frame.width/height optional → fitHorizontal/fitVertical flags
 */
import type { TextFrame } from '../types/Document.js';
import type { LineBox } from '../types/LayoutTypes.js';
import { paragraphLayoutEngine } from './ParagraphLayoutEngine.js';

/**
 * Result of laying out a full TextFrame.
 *
 * `fitHorizontal` / `fitVertical` tell the renderer which dimension to use:
 * - `'frame'`   → use `frameWidth` / `frameHeight`
 * - `'content'` → use `contentWidth` / `contentHeight`
 */
export interface TextFrameLayoutResult {
  lines: LineBox[];
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
 * Layout a full TextFrame by stacking paragraphs with Y offset accumulation.
 */
export function layoutTextFrame(frame: TextFrame): TextFrameLayoutResult {
  const allLines: LineBox[] = [];
  let yOffset = 0;
  let contentWidth = 0;

  const leftPad = frame.padding?.left ?? 0;
  const rightPad = frame.padding?.right ?? 0;

  for (let i = 0; i < frame.paragraphs.length; i++) {
    const p = frame.paragraphs[i];

    // Available width: frame.width minus horizontal padding.
    // If width is undefined → Infinite (no wrap constraint).
    const maxWidth = frame.width !== undefined
      ? frame.width - leftPad - rightPad
      : Infinity;

    const result = paragraphLayoutEngine.layout(p, maxWidth, yOffset);

    for (const line of result.lines) {
      // Shift lines by left padding
      line.x += leftPad;
      allLines.push(line);
    }

    contentWidth = Math.max(contentWidth, result.contentWidth);
    // result.height is absolute (includes yOffset passed in).
    // Set, don't accumulate — otherwise yOffset compounds.
    yOffset = result.height;
  }

  const contentHeight = allLines.length > 0
    ? allLines[allLines.length - 1].y + allLines[allLines.length - 1].height
    : 0;

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