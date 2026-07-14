/**
 * groupLinesByParagraph.ts — Group lines by paragraph index.
 *
 * Uses `pIdx` (paragraph index) from each line's first span
 * to group consecutive lines belonging to the same paragraph.
 *
 * @see {@link https://www.w3.org/TR/css-text-3/ | CSS Text Module Level 3}
 */

import type { Line } from '../types/LayoutTypes.js';

/**
 * A group of lines belonging to one paragraph.
 */
export interface ParagraphGroup {
  /** Lines in this paragraph. */
  lines: Line[];
  /** Paragraph index in TextFrame.paragraphs[]. */
  pIdx: number;
  /** Optional user-assigned tag (from Paragraph.id). */
  tag?: string;
}

/**
 * Group consecutive lines by `pIdx` (paragraph index).
 *
 * Returns an array of `ParagraphGroup` sorted by `pIdx` in document order.
 * Lines without a valid `pIdx` (e.g. `pIdx === undefined`) are grouped
 * as index `-1`.
 *
 * @param lines — flat array of lines from `layoutTextFrame`
 * @returns groups of lines grouped by paragraph
 *
 * @example
 * ```ts
 * const result = layoutTextFrame(frame);
 * const groups = groupLinesByParagraph(result.lines);
 * // groups[0].lines  → lines for paragraph 0
 * // groups[0].pIdx   → 0
 * ```
 */
export function groupLinesByParagraph(lines: Line[]): ParagraphGroup[] {
  const groups: ParagraphGroup[] = [];
  let currentIdx = -1;
  let currentGroup: Line[] = [];

  for (const line of lines) {
    const span = line.spans[0];
    const idx = span?.pIdx ?? -1;
    if (idx !== currentIdx && currentGroup.length > 0) {
      groups.push({
        lines: currentGroup,
        pIdx: currentIdx,
        tag: currentGroup[0].spans[0]?.tag,
      });
      currentGroup = [];
    }
    currentIdx = idx;
    currentGroup.push(line);
  }
  if (currentGroup.length > 0) {
    groups.push({
      lines: currentGroup,
      pIdx: currentIdx,
      tag: currentGroup[0].spans[0]?.tag,
    });
  }
  return groups;
}