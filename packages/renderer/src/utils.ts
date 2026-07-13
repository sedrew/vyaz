/**
 * render/utils.ts — shared renderer utilities.
 */

import type { Line } from '@vyaz/core';

/**
 * Format a number for SVG output with fixed precision.
 * Prevents subpixel noise from creating false snapshot diffs.
 *
 * @param n — number to format
 * @param precision — decimal places (default 2)
 */
export function fmt(n: number, precision = 2): string {
  return (Math.round(n * 10 ** precision) / 10 ** precision).toString();
}

/**
 * Compute the bounding box (content width + height, min x/y) from an array of Line.
 */
export function computeBBox(lines: Line[]): { x: number; y: number; width: number; height: number } {
  if (lines.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  const minX = Math.min(...lines.map(l => l.x));
  const maxX = Math.max(...lines.map(l => l.x + l.width));
  const minY = Math.min(...lines.map(l => l.y));
  const maxY = lines[lines.length - 1].y + lines[lines.length - 1].height;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}