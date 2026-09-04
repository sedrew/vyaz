/**
 * TableRenderer.ts — TableLayoutResult → SVG string.
 *
 * Paint order (back to front): table bg → row bg → cell bg → row borders →
 * cell borders → table border → cell content. Each cell's content is a
 * complete nested `<svg>` (from `renderToSVG`), positioned with a `<g
 * transform="translate(…)">` — the same "paint a self-contained SVG fragment
 * into a box" pattern `SVGRenderOptions.inlineBoxes` uses for `<img>`/`<svg>`
 * boxes from `@vyaz/html`.
 *
 * A cell's content is rendered at `sizing: 'frame'` with the *exact* width
 * TableLayoutEngine measured it at (not `sizing: 'content'`): trimming to the
 * ink bounding box would discard the alignment offset for centered/
 * right-aligned paragraphs — the nested `<svg>`'s viewBox has to start at
 * (0, 0) so `line.x` stays the true position within the cell.
 *
 * T3 (not yet): dash patterns / stroke-linecap on borders, asymmetric corner
 * radii — a uniform `rx`/`ry` becomes a plain `<rect>` radius; a border whose
 * four sides don't share one width+color falls back to four `<line>`s (no
 * radius on those).
 */
import type { TableLayoutResult, TableCellLayoutResult, ResolvedBorder } from '@vyaz/core';
import { renderToSVG } from './SVGRenderer.js';
import type { SvgPreset, SvgStyle } from './SVGRenderer.js';
import { fmt } from './utils.js';

export interface TableRenderOptions {
  /** Preset used for every cell's own text render. Default `'browser'`. */
  preset?: SvgPreset;
  /** How cell text style properties are expressed. Default `'xml'`. */
  style?: SvgStyle;
  /** CSS class for the root `<svg>`. */
  className?: string;
}

// ── Shape helpers ────────────────────────────────────────────────────────

function rect(x: number, y: number, w: number, h: number, attrs: Record<string, string | number>): string {
  const a = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ');
  return `  <rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(Math.max(0, w))}" height="${fmt(Math.max(0, h))}" ${a} />\n`;
}

function line(x1: number, y1: number, x2: number, y2: number, color: string, width: number): string {
  return `  <line x1="${fmt(x1)}" y1="${fmt(y1)}" x2="${fmt(x2)}" y2="${fmt(y2)}" stroke="${color}" stroke-width="${fmt(width)}" />\n`;
}

/** A `<rect stroke>` when all four sides share one width+color; otherwise four `<line>`s (no radius). */
function borderMarkup(x: number, y: number, w: number, h: number, b: ResolvedBorder): string {
  const { widths: wd, colors: co } = b;
  const uniform = wd.top === wd.right && wd.right === wd.bottom && wd.bottom === wd.left
    && co.top === co.right && co.right === co.bottom && co.bottom === co.left;

  if (uniform) {
    if (wd.top <= 0) return '';
    const inset = wd.top / 2;
    const attrs: Record<string, string | number> = { fill: 'none', stroke: co.top, 'stroke-width': fmt(wd.top) };
    if (b.rx !== undefined) attrs.rx = fmt(b.rx);
    if (b.ry !== undefined) attrs.ry = fmt(b.ry);
    return rect(x + inset, y + inset, w - wd.top, h - wd.top, attrs);
  }

  let out = '';
  if (wd.top > 0) out += line(x, y + wd.top / 2, x + w, y + wd.top / 2, co.top, wd.top);
  if (wd.right > 0) out += line(x + w - wd.right / 2, y, x + w - wd.right / 2, y + h, co.right, wd.right);
  if (wd.bottom > 0) out += line(x, y + h - wd.bottom / 2, x + w, y + h - wd.bottom / 2, co.bottom, wd.bottom);
  if (wd.left > 0) out += line(x + wd.left / 2, y, x + wd.left / 2, y + h, co.left, wd.left);
  return out;
}

/** The content-area width TableLayoutEngine laid the cell's text out at (padding + border excluded). */
function contentWidthOf(cell: TableCellLayoutResult): number {
  const b = cell.border?.widths;
  return Math.max(0, cell.width - cell.padding.left - cell.padding.right - (b ? b.left + b.right : 0));
}

// ── Render ───────────────────────────────────────────────────────────────

export function renderTableToSVG(result: TableLayoutResult, opts: TableRenderOptions = {}): string {
  const preset = opts.preset ?? 'browser';
  const style = opts.style;
  const parts: string[] = [];

  if (result.bgColor) parts.push(rect(0, 0, result.width, result.height, { fill: result.bgColor }));

  for (const row of result.rows) {
    if (row.bgColor) parts.push(rect(result.contentBox.x, row.y, result.contentBox.width, row.height, { fill: row.bgColor }));
  }
  for (const row of result.rows) {
    for (const cell of row.cells) {
      if (cell.bgColor) parts.push(rect(cell.x, cell.y, cell.width, cell.height, { fill: cell.bgColor }));
    }
  }

  for (const row of result.rows) {
    if (row.border) parts.push(borderMarkup(result.contentBox.x, row.y, result.contentBox.width, row.height, row.border));
  }
  for (const row of result.rows) {
    for (const cell of row.cells) {
      if (cell.border) parts.push(borderMarkup(cell.x, cell.y, cell.width, cell.height, cell.border));
    }
  }
  if (result.border) {
    parts.push(borderMarkup(result.contentBox.x, result.contentBox.y, result.contentBox.width, result.contentBox.height, result.border));
  }

  for (const row of result.rows) {
    for (const cell of row.cells) {
      const cw = contentWidthOf(cell);
      const ch = cell.content.content.height;
      if (cw <= 0 || ch <= 0 || cell.content.lines.length === 0) continue;
      const originX = cell.x + cell.padding.left + (cell.border?.widths.left ?? 0);
      const originY = cell.y + cell.padding.top + (cell.border?.widths.top ?? 0) + cell.verticalOffset;
      const svg = renderToSVG(cell.content, { preset, style, sizing: 'frame', width: cw, height: ch });
      parts.push(`  <g transform="translate(${fmt(originX)} ${fmt(originY)})">${svg}</g>\n`);
    }
  }

  const attrs = [
    'xmlns="http://www.w3.org/2000/svg"',
    `width="${fmt(result.width)}"`,
    `height="${fmt(result.height)}"`,
    `viewBox="0 0 ${fmt(result.width)} ${fmt(result.height)}"`,
  ];
  if (opts.className) attrs.push(`class="${opts.className}"`);
  return `<svg ${attrs.join(' ')}>\n${parts.join('')}</svg>\n`;
}
