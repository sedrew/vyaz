/**
 * render/utils.ts — shared renderer utilities.
 */

import type { Line } from '@vyaz/core';

/**
 * Escape text for use in XML character data or a double-quoted attribute value.
 * Numeric references (not `&amp;`) so the output is valid in SVG-as-XML,
 * SVG-in-HTML and inside a CSS `style` attribute alike.
 */
export function escapeXml(text: string | number): string {
  return String(text)
    .replace(/&/g, '&#38;')
    .replace(/</g, '&#60;')
    .replace(/>/g, '&#62;')
    .replace(/"/g, '&#34;');
}

/**
 * A CSS/SVG paint value that cannot carry anything but a colour: `#rgb[a]`,
 * `#rrggbb[aa]`, a colour keyword, `rgb()/rgba()/hsl()/hsla()`. Everything else
 * (`red; background:url(…)`, `url(…)`, `var(…)`, quotes, `;`, `{}`) is refused.
 */
const SAFE_COLOR = /^(?:#[0-9a-f]{3,8}|[a-z]{3,30}|(?:rgb|hsl)a?\(\s*[-+0-9.%,\s/a-z]*\))$/i;

/** `color` when it is a plain colour value, else `fallback`. */
export function safeColor(color: string | undefined, fallback: string): string;
export function safeColor(color: string | undefined, fallback?: undefined): string | undefined;
export function safeColor(color: string | undefined, fallback?: string): string | undefined {
  if (color === undefined) return fallback;
  const c = color.trim();
  return SAFE_COLOR.test(c) ? c : fallback;
}

/** A font-family name made safe to place between quotes in CSS and in an attribute. */
export function safeFamily(family: string): string {
  return family.replace(/['"\\;{}<>&\r\n]/g, '');
}

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
 * The line as it is painted: spans CSS removes at the line end (`Span.collapsed`
 * — trailing spaces where white-space collapses) are dropped, so no background,
 * decoration or glyph is drawn for them. Returns `line` itself when there are none.
 */
export function paintableLine(line: Line): Line {
  return line.spans.some((s) => s.collapsed) ? { ...line, spans: line.spans.filter((s) => !s.collapsed) } : line;
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