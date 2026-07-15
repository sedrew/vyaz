/**
 * groupLinesByParagraph.ts — Group lines by paragraph index.
 *
 * Collects all lines with the same `pIdx` into one group,
 * regardless of their order in the array (handles multi-column
 * where lines of the same paragraph may be split across columns).
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
 * Group lines by `pIdx` (paragraph index).
 *
 * Collects **all** lines with the same `pIdx` into one group,
 * even if they are not consecutive in the array (multi-column layout
 * may interleave lines of different paragraphs across columns).
 *
 * Returns groups sorted by `pIdx` in document order.
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
 * // groups[0].lines  → all lines for paragraph 0 (across all columns)
 * // groups[0].pIdx   → 0
 * ```
 */
export function groupLinesByParagraph(lines: Line[]): ParagraphGroup[] {
  // Collect lines per paragraph using a Map
  const map = new Map<number, { lines: Line[]; tag?: string }>();

  for (const line of lines) {
    const idx = line.spans[0]?.pIdx ?? -1;
    let entry = map.get(idx);
    if (!entry) {
      entry = { lines: [] };
      map.set(idx, entry);
    }
    entry.lines.push(line);
    if (!entry.tag) {
      entry.tag = line.spans[0]?.tag;
    }
  }

  // Convert to array sorted by pIdx
  const groups: ParagraphGroup[] = [];
  const sortedKeys = Array.from(map.keys()).sort((a, b) => a - b);
  for (const key of sortedKeys) {
    if (key === -1) continue; // skip invalid
    const entry = map.get(key)!;
    groups.push({ lines: entry.lines, pIdx: key, tag: entry.tag });
  }

  return groups;
}
