/**
 * render/utils.ts — shared renderer utilities.
 */

import type { LineBox } from '@vyaz/core';

/**
 * Compute the bounding box (content width + height) from an array of LineBox.
 */
export function computeBBox(lines: LineBox[]): { width: number; height: number } {
  if (lines.length === 0) return { width: 0, height: 0 };
  const width = Math.max(...lines.map(l => l.x + l.width));
  const height = lines[lines.length - 1].y + lines[lines.length - 1].height;
  return { width, height };
}