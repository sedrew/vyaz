/**
 * TableLayoutEngine.ts — TableFrame → positioned grid (T0).
 *
 * Column widths and row heights are *measured*, not required from the caller
 * (unlike svg-table-core, whose `calculateRows` takes them as input — see
 * TableTypes.ts header): each cell's `TextFrame` content is laid out twice —
 * once unconstrained to get its natural width, once at the final column width
 * to get its wrapped height.
 *
 * T0 scope: no `colSpan` / `rowSpan` (every cell is 1×1), no borders (bgColor
 * only). Both land in later phases without changing this shape.
 */
import type { TableFrame, TableRow, TableCell, TableCellStyle, TableRowStyle } from '../types/TableTypes.js';
import type { TextFrameLayoutResult } from './TextFrameLayoutEngine.js';
import type { VerticalAlignment } from '../types/Document.js';
import { layoutTextFrame } from './TextFrameLayoutEngine.js';
import { resolveWidths } from '../utils/widths.js';

// ── Result shape ─────────────────────────────────────────────────────────

export interface TableCellLayoutResult {
  /** Absolute X of the cell box (border-box) within the table. */
  x: number;
  /** Absolute Y of the cell box within the table. */
  y: number;
  width: number;
  height: number;
  /** Resolved padding box. */
  padding: { top: number; right: number; bottom: number; left: number };
  /** Extra Y offset inside the padding box from `verticalAlign` (0 for `'top'`). */
  verticalOffset: number;
  bgColor?: string;
  /** The cell's laid-out content — same shape a lone `TextFrame` produces. */
  content: TextFrameLayoutResult;
}

export interface TableRowLayoutResult {
  y: number;
  height: number;
  bgColor?: string;
  cells: TableCellLayoutResult[];
}

export interface TableLayoutResult {
  /** Full outer box width, margins included. */
  width: number;
  /** Full outer box height, margins included. */
  height: number;
  bgColor?: string;
  rows: TableRowLayoutResult[];
}

export interface TableLayoutOptions {
  mode?: 'browser' | 'office';
}

// ── Helpers ──────────────────────────────────────────────────────────────

const DEFAULT_PADDING = 8;

function resolveCellStyle(cell: TableCell, table: TableFrame): Required<TableCellStyle> {
  const d = table.defaultCellStyle ?? {};
  const s = cell.style ?? {};
  return {
    bgColor: s.bgColor ?? d.bgColor ?? '',
    paddings: s.paddings ?? d.paddings ?? DEFAULT_PADDING,
    verticalAlign: s.verticalAlign ?? d.verticalAlign ?? 'top',
  };
}

function resolveRowStyle(row: TableRow, table: TableFrame): Required<TableRowStyle> {
  const d = table.defaultRowStyle ?? {};
  const s = row.style ?? {};
  return {
    height: s.height ?? d.height ?? 0,
    bgColor: s.bgColor ?? d.bgColor ?? '',
  };
}

function verticalOffsetFor(align: VerticalAlignment, available: number, content: number): number {
  const extra = available - content;
  if (extra <= 0) return 0;
  if (align === 'middle') return extra / 2;
  if (align === 'bottom') return extra;
  return 0;
}

// ── Layout ───────────────────────────────────────────────────────────────

export function layoutTableFrame(table: TableFrame, options: TableLayoutOptions = {}): TableLayoutResult {
  const style = table.style ?? {};
  const margins = resolveWidths(style.margins, 0);
  const colGaps = style.colGaps ?? 0;
  const rowGaps = style.rowGaps ?? 0;

  const colCount = table.rows.reduce((n, r) => Math.max(n, r.cells.length), 0);
  if (colCount === 0 || table.rows.length === 0) {
    return {
      width: margins.left + margins.right,
      height: margins.top + margins.bottom,
      bgColor: style.bgColor,
      rows: [],
    };
  }

  // ── Pass 1: natural (unwrapped) width per cell → per-column max ────────
  const colWidths = table.columnWidths ? table.columnWidths.slice(0, colCount) : new Array(colCount).fill(0);
  if (!table.columnWidths) {
    for (const row of table.rows) {
      for (let ci = 0; ci < row.cells.length; ci++) {
        const cell = row.cells[ci];
        const cs = resolveCellStyle(cell, table);
        const pad = resolveWidths(cs.paddings, DEFAULT_PADDING);
        const natural = layoutTextFrame({ ...cell.content, width: undefined, wrap: false }, { mode: options.mode }).content.width;
        const cellW = natural + pad.left + pad.right;
        colWidths[ci] = Math.max(colWidths[ci] ?? 0, cellW);
      }
    }
  }

  // Fit to an explicit table width — scale columns proportionally (shrink
  // wraps text; grow gives every column extra room).
  if (table.width !== undefined) {
    const budget = table.width - margins.left - margins.right - colGaps * Math.max(0, colCount - 1);
    const naturalSum = colWidths.reduce((a, b) => a + b, 0);
    if (naturalSum > 0 && budget > 0) {
      const scale = budget / naturalSum;
      for (let i = 0; i < colWidths.length; i++) colWidths[i] *= scale;
    }
  }

  // ── Pass 2: layout each cell at its column's content width ─────────────
  const rows: TableRowLayoutResult[] = [];
  let y = margins.top;

  for (let ri = 0; ri < table.rows.length; ri++) {
    const row = table.rows[ri];
    const rs = resolveRowStyle(row, table);
    const explicitHeight = table.rowHeights?.[ri] ?? (rs.height > 0 ? rs.height : undefined);

    interface Prepared { cell: TableCell; cs: Required<TableCellStyle>; pad: { top: number; right: number; bottom: number; left: number }; x: number; w: number; content: TextFrameLayoutResult }
    const prepared: Prepared[] = [];
    let x = margins.left;
    let rowHeight = explicitHeight ?? 0;

    for (let ci = 0; ci < row.cells.length; ci++) {
      const cell = row.cells[ci];
      const cs = resolveCellStyle(cell, table);
      const pad = resolveWidths(cs.paddings, DEFAULT_PADDING);
      const w = colWidths[ci] ?? 0;
      const contentWidth = Math.max(0, w - pad.left - pad.right);
      const content = layoutTextFrame({ ...cell.content, width: contentWidth, wrap: true }, { mode: options.mode });
      const cellHeight = content.content.height + pad.top + pad.bottom;
      if (explicitHeight === undefined) rowHeight = Math.max(rowHeight, cellHeight);
      prepared.push({ cell, cs, pad, x, w, content });
      x += w + colGaps;
    }

    const cells: TableCellLayoutResult[] = prepared.map((p) => {
      const available = rowHeight - p.pad.top - p.pad.bottom;
      const verticalOffset = verticalOffsetFor(p.cs.verticalAlign, available, p.content.content.height);
      return {
        x: p.x,
        y,
        width: p.w,
        height: rowHeight,
        padding: p.pad,
        verticalOffset,
        ...(p.cs.bgColor ? { bgColor: p.cs.bgColor } : {}),
        content: p.content,
      };
    });

    rows.push({ y, height: rowHeight, ...(rs.bgColor ? { bgColor: rs.bgColor } : {}), cells });
    y += rowHeight + rowGaps;
  }

  const contentBottom = y - (rows.length > 0 ? rowGaps : 0);
  const totalWidth = margins.left + colWidths.reduce((a, b) => a + b, 0) + colGaps * Math.max(0, colCount - 1) + margins.right;

  return {
    width: totalWidth,
    height: contentBottom + margins.bottom,
    bgColor: style.bgColor,
    rows,
  };
}
