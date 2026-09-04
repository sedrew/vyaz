/**
 * TableRenderer.ts — TableLayoutResult → SVG string.
 *
 * Paint order (back to front): table bg → row bg → cell bg → row borders →
 * cell borders → table border → cell content (before slot → main content →
 * after slot, per cell). Each of those three is a complete nested `<svg>`
 * (from `renderToSVG`), positioned with a `<g transform="translate(…)">` —
 * the same "paint a self-contained SVG fragment into a box" pattern
 * `SVGRenderOptions.inlineBoxes` uses for `<img>`/`<svg>` boxes from
 * `@vyaz/html`. `before`/`after` (`paintSlot`) paint at the absolute
 * position `TableLayoutEngine` already resolved for them — no extra
 * padding/border math here, unlike main content.
 *
 * A cell's content is rendered at `sizing: 'frame'` with the *exact* width
 * TableLayoutEngine measured it at (not `sizing: 'content'`): trimming to the
 * ink bounding box would discard the alignment offset for centered/
 * right-aligned paragraphs — the nested `<svg>`'s viewBox has to start at
 * (0, 0) so `line.x` stays the true position within the cell.
 *
 * `cell.cx`/`cy` are an extra px nudge added straight onto the content
 * origin. `cell.allowOverflow` forces `overflow: visible` on the cell's own
 * nested `<svg>` (default clips at the padding box, same as `svg-table-core`
 * — see `withOverflowVisible`). `opts.fragment` swaps the outer `<svg
 * xmlns… viewBox…>` for a bare `<g>`, for splicing this table into a
 * document that already has one (composing tables, nested-table cells).
 *
 * Border dash patterns (`stroke-dasharray`) and per-side `stroke-linecap`
 * (T3, `dashAttrs`/`dashUniform`) paint on both border shapes: a uniform
 * `<rect stroke>` needs its pattern+linecap to also match on all four sides
 * to stay a single rect (SVG has one dasharray per shape); otherwise (or
 * when width/color already differ) it falls back to four `<line>`s, each
 * with its own dasharray/linecap. Asymmetric corner radii remain a possible
 * future addition — only a uniform `rx`/`ry` today.
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
  /** CSS class for the root `<svg>`/`<g>`. */
  className?: string;
  /**
   * Emit a bare `<g>` (no `<svg>`/`viewBox`/`xmlns` wrapper) for splicing
   * into a document that already has an outer `<svg>` — e.g. composing
   * several tables, or embedding as a nested-table cell's content. Default
   * `false`.
   */
  fragment?: boolean;
}

/** Force `overflow: visible` on a `renderToSVG`-produced root `<svg …>` tag (`allowOverflow` cells). */
function withOverflowVisible(svg: string): string {
  return svg.replace(/^<svg /, '<svg style="overflow:visible" ');
}

// ── Shape helpers ────────────────────────────────────────────────────────

function rect(x: number, y: number, w: number, h: number, attrs: Record<string, string | number>): string {
  const a = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ');
  return `  <rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(Math.max(0, w))}" height="${fmt(Math.max(0, h))}" ${a} />\n`;
}

function line(x1: number, y1: number, x2: number, y2: number, color: string, width: number, extra: Record<string, string> = {}): string {
  const extraAttrs = Object.entries(extra).map(([k, v]) => ` ${k}="${v}"`).join('');
  return `  <line x1="${fmt(x1)}" y1="${fmt(y1)}" x2="${fmt(x2)}" y2="${fmt(y2)}" stroke="${color}" stroke-width="${fmt(width)}"${extraAttrs} />\n`;
}

type Side = 'top' | 'right' | 'bottom' | 'left';

/** `stroke-dasharray`/`stroke-linecap` attrs for one side, omitted when solid/default. */
function dashAttrs(b: ResolvedBorder, side: Side): Record<string, string> {
  const attrs: Record<string, string> = {};
  const pattern = b.patterns?.[side];
  if (pattern?.length) attrs['stroke-dasharray'] = pattern.join(',');
  const shape = b.shapes?.[side];
  if (shape && shape !== 'butt') attrs['stroke-linecap'] = shape;
  return attrs;
}

/** `true` when every side shares the same pattern (by value) and the same linecap. */
function dashUniform(b: ResolvedBorder): boolean {
  const eq = (a?: number[], c?: number[]) => (a?.join(',') ?? '') === (c?.join(',') ?? '');
  const p = b.patterns;
  const patternsUniform = !p || (eq(p.top, p.right) && eq(p.right, p.bottom) && eq(p.bottom, p.left));
  const s = b.shapes;
  const shapesUniform = !s || (s.top === s.right && s.right === s.bottom && s.bottom === s.left);
  return patternsUniform && shapesUniform;
}

/** A `<rect stroke>` when all four sides share one width+color+pattern+linecap; otherwise four `<line>`s (no radius). */
function borderMarkup(x: number, y: number, w: number, h: number, b: ResolvedBorder): string {
  const { widths: wd, colors: co } = b;
  const uniform = wd.top === wd.right && wd.right === wd.bottom && wd.bottom === wd.left
    && co.top === co.right && co.right === co.bottom && co.bottom === co.left
    && dashUniform(b);

  if (uniform) {
    if (wd.top <= 0) return '';
    const inset = wd.top / 2;
    const attrs: Record<string, string | number> = { fill: 'none', stroke: co.top, 'stroke-width': fmt(wd.top), ...dashAttrs(b, 'top') };
    if (b.rx !== undefined) attrs.rx = fmt(b.rx);
    if (b.ry !== undefined) attrs.ry = fmt(b.ry);
    return rect(x + inset, y + inset, w - wd.top, h - wd.top, attrs);
  }

  let out = '';
  if (wd.top > 0) out += line(x, y + wd.top / 2, x + w, y + wd.top / 2, co.top, wd.top, dashAttrs(b, 'top'));
  if (wd.right > 0) out += line(x + w - wd.right / 2, y, x + w - wd.right / 2, y + h, co.right, wd.right, dashAttrs(b, 'right'));
  if (wd.bottom > 0) out += line(x, y + h - wd.bottom / 2, x + w, y + h - wd.bottom / 2, co.bottom, wd.bottom, dashAttrs(b, 'bottom'));
  if (wd.left > 0) out += line(x + wd.left / 2, y, x + wd.left / 2, y + h, co.left, wd.left, dashAttrs(b, 'left'));
  return out;
}

/** The content-area width TableLayoutEngine laid the cell's text out at (padding + border excluded). */
function contentWidthOf(cell: TableCellLayoutResult): number {
  const b = cell.border?.widths;
  return Math.max(0, cell.width - cell.padding.left - cell.padding.right - (b ? b.left + b.right : 0));
}

/** Paint a `before`/`after` decorative slot at its own already-resolved absolute position. */
function paintSlot(slot: NonNullable<TableCellLayoutResult['before']>, preset: SvgPreset, style: SvgStyle | undefined): string {
  const { content, x, y } = slot;
  if (content.content.width <= 0 || content.content.height <= 0 || content.lines.length === 0) return '';
  const svg = renderToSVG(content, { preset, style, sizing: 'frame', width: content.content.width, height: content.content.height });
  return `  <g transform="translate(${fmt(x)} ${fmt(y)})">${svg}</g>\n`;
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
      if (cell.before) parts.push(paintSlot(cell.before, preset, style));
      const cw = contentWidthOf(cell);
      const ch = cell.content.content.height;
      if (cw > 0 && ch > 0 && cell.content.lines.length > 0) {
        const originX = cell.x + cell.padding.left + (cell.border?.widths.left ?? 0) + cell.cx;
        const originY = cell.y + cell.padding.top + (cell.border?.widths.top ?? 0) + cell.verticalOffset + cell.cy;
        let svg = renderToSVG(cell.content, { preset, style, sizing: 'frame', width: cw, height: ch });
        if (cell.allowOverflow) svg = withOverflowVisible(svg);
        parts.push(`  <g transform="translate(${fmt(originX)} ${fmt(originY)})">${svg}</g>\n`);
      }
      if (cell.after) parts.push(paintSlot(cell.after, preset, style));
    }
  }

  if (opts.fragment) {
    const gAttrs = opts.className ? ` class="${opts.className}"` : '';
    return `<g${gAttrs}>\n${parts.join('')}</g>\n`;
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
