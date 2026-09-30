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

/** An explicit decoration rule: `x` in span coordinates, `y` = line top edge, px. */
export interface DecorationRule { x: number; width: number; y: number; thickness: number; color: string }

type DecoKind = 'underline' | 'strikethrough';

/**
 * Chrome's decorating-box rule for decorated runs that mix font sizes.
 *
 * Chrome draws a decoration with the font of the element that set it (its
 * "decorating box", `TextRun.decorationFontSize`), measured against headless
 * Chromium for Roboto / Inter / Great Vibes at 12–72px:
 * - thickness `max(1, floor(box / 10))` for both lines;
 * - underline: one line for the whole box, its top `ceil(box / 20)` below the baseline;
 * - line-through: per fragment, `A_box − (A_box − D_box) / 2` below that
 *   fragment's own ascent top (hhea ascent/descent rounded to px).
 *
 * Only runs whose text is *not* all in the box's size are converted — a
 * single-size run keeps native SVG `text-decoration`, which Chrome already
 * paints exactly (including skip-ink around descenders). Converted spans lose
 * the flag so they emit no `text-decoration`; the caller paints `rules`.
 */
export function splitMixedDecorations(line: Line, baselineY: number): { line: Line; rules: DecorationRule[] } {
  const rules: DecorationRule[] = [];
  let spans = line.spans;
  for (const kind of ['underline', 'strikethrough'] as const) {
    const boxOf = (i: number) => spans[i].style.decorationFontSize?.[kind] ?? spans[i].fontMetrics.fontSize;
    let i = 0;
    while (i < spans.length) {
      if (!spans[i].style[kind]) { i++; continue; }
      let j = i;
      while (j + 1 < spans.length && spans[j + 1].style[kind] && boxOf(j + 1) === boxOf(i)) j++;
      const box = boxOf(i);
      const group = spans.slice(i, j + 1);
      const mixed = group.some((s) => s.type !== 'space' && s.fontMetrics.fontSize !== box);
      if (mixed) {
        if (spans === line.spans) spans = spans.slice();
        for (let k = i; k <= j; k++) spans[k] = { ...spans[k], style: { ...spans[k].style, [kind]: false } };
        rules.push(...boxRules(kind, group, box, baselineY));
      }
      i = j + 1;
    }
  }
  return { line: spans === line.spans ? line : { ...line, spans }, rules };
}

function boxRules(kind: DecoKind, group: Line['spans'], box: number, baselineY: number): DecorationRule[] {
  const thickness = Math.max(1, Math.floor(box / 10));
  const color = safeColor(group[0].style.color, '#000000');
  if (kind === 'underline') {
    const last = group[group.length - 1];
    return [{ x: group[0].x, width: last.x + last.width - group[0].x, y: Math.round(baselineY + Math.ceil(box / 20)), thickness, color }];
  }
  const out: DecorationRule[] = [];
  for (const s of group) {
    const k = s.fontMetrics.fontSize ? box / s.fontMetrics.fontSize : 1; // same family: box metrics scale linearly
    const aBox = Math.round(s.fontMetrics.ascent * k), dBox = Math.round(s.fontMetrics.descent * k);
    const y = Math.round(baselineY - Math.round(s.fontMetrics.ascent) + (aBox - (aBox - dBox) / 2) - thickness / 2);
    const prev = out[out.length - 1];
    if (prev && prev.y === y && Math.abs(prev.x + prev.width - s.x) < 0.01) prev.width = s.x + s.width - prev.x;
    else out.push({ x: s.x, width: s.width, y, thickness, color });
  }
  return out;
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