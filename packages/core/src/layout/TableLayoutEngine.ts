/**
 * TableLayoutEngine.ts — TableFrame → positioned grid.
 *
 * Column widths and row heights are *measured*, not required from the caller
 * (unlike svg-table-core, whose `calculateRows` takes them as input — see
 * TableTypes.ts header): each cell's `TextFrame` content is laid out twice —
 * once unconstrained to get its natural width, once at the final column width
 * to get its wrapped height.
 *
 * Pipeline:
 *   1. placeCells    — colSpan/rowSpan → each cell's (startRow, startCol),
 *                       borrowing svg-table-core's "occupied slot" idea
 *                       (calculateRows' insertIgnoredCell), done natively.
 *   2. column widths  — span-1 cells set the per-column max; span>N cells only
 *                       *widen* their spanned columns, evenly, if their own
 *                       natural width doesn't already fit (never shrink).
 *   3. per-cell content — laid out once at its final (possibly multi-column)
 *                       width, inset by padding *and* border width (border-box
 *                       model — a border never overlaps the text); same
 *                       deficit-widen rule for row heights and rowSpan cells.
 *   4. position        — column/row offsets accumulated from final sizes.
 *
 * T3 (not yet implemented): border dash patterns, stroke-linecap, asymmetric
 * corner radii — only solid per-side width/color + a uniform rx/ry so far.
 */
import type { TableFrame, TableRow, TableCell, TableCellStyle, TableRowStyle, BorderStyles, Widths, ColorsOnWidth } from '../types/TableTypes.js';
import type { TextFrameLayoutResult } from './TextFrameLayoutEngine.js';
import type { VerticalAlignment } from '../types/Document.js';
import { layoutTextFrame } from './TextFrameLayoutEngine.js';
import { resolveWidths, resolveColors, type Side } from '../utils/sides.js';

// ── Result shape ─────────────────────────────────────────────────────────

/** A resolved, ready-to-paint border. Absent when every side's width is `0`. */
export interface ResolvedBorder {
  widths: Record<Side, number>;
  colors: Record<Side, string>;
  /** Present only when `rx`/`ry` was set anywhere in the style cascade. */
  rx?: number;
  ry?: number;
}

export interface TableCellLayoutResult {
  /** Absolute X of the cell box (border-box) within the table. */
  x: number;
  /** Absolute Y of the cell box within the table. */
  y: number;
  /** Full box width — sums every spanned column + the gaps between them. */
  width: number;
  /** Full box height — sums every spanned row + the gaps between them. */
  height: number;
  /** Resolved padding box (inside the border, if any). */
  padding: { top: number; right: number; bottom: number; left: number };
  /** Extra Y offset inside the padding box from `verticalAlign` (0 for `'top'`). */
  verticalOffset: number;
  bgColor?: string;
  border?: ResolvedBorder;
  /** The cell's laid-out content — same shape a lone `TextFrame` produces. */
  content: TextFrameLayoutResult;
  /** Columns this cell occupies (>1 for `colSpan`). */
  colSpan: number;
  /** Rows this cell occupies (>1 for `rowSpan`). */
  rowSpan: number;
}

export interface TableRowLayoutResult {
  y: number;
  height: number;
  bgColor?: string;
  border?: ResolvedBorder;
  /** Only cells that *start* in this row (a rowSpan cell from above is not repeated here). */
  cells: TableCellLayoutResult[];
}

export interface TableLayoutResult {
  /** Full outer box width, margins included. */
  width: number;
  /** Full outer box height, margins included. */
  height: number;
  bgColor?: string;
  /** The table's own outer border (`TableStyle`), distinct from row/cell borders. */
  border?: ResolvedBorder;
  rows: TableRowLayoutResult[];
}

export interface TableLayoutOptions {
  mode?: 'browser' | 'office';
}

// ── Helpers ──────────────────────────────────────────────────────────────

const DEFAULT_PADDING = 8;

interface ResolvedCellStyle {
  bgColor: string;
  paddings: Widths;
  verticalAlign: VerticalAlignment;
  borderWidths?: Widths;
  borderColors?: ColorsOnWidth;
  rx?: number;
  ry?: number;
}

interface ResolvedRowStyle {
  height: number;
  bgColor: string;
  borderWidths?: Widths;
  borderColors?: ColorsOnWidth;
  rx?: number;
  ry?: number;
}

function resolveCellStyle(cell: TableCell, table: TableFrame): ResolvedCellStyle {
  const d = table.defaultCellStyle ?? {};
  const s = cell.style ?? {};
  return {
    bgColor: s.bgColor ?? d.bgColor ?? '',
    paddings: s.paddings ?? d.paddings ?? DEFAULT_PADDING,
    verticalAlign: s.verticalAlign ?? d.verticalAlign ?? 'top',
    borderWidths: s.borderWidths ?? d.borderWidths,
    borderColors: s.borderColors ?? d.borderColors,
    rx: s.rx ?? d.rx,
    ry: s.ry ?? d.ry,
  };
}

function resolveRowStyle(row: TableRow, table: TableFrame): ResolvedRowStyle {
  const d = table.defaultRowStyle ?? {};
  const s = row.style ?? {};
  return {
    height: s.height ?? d.height ?? 0,
    bgColor: s.bgColor ?? d.bgColor ?? '',
    borderWidths: s.borderWidths ?? d.borderWidths,
    borderColors: s.borderColors ?? d.borderColors,
    rx: s.rx ?? d.rx,
    ry: s.ry ?? d.ry,
  };
}

/** Resolve a `BorderStyles`-shaped style into paint-ready per-side values, or `undefined` if every side is `0`-width. */
function resolveBorder(raw: BorderStyles | undefined): ResolvedBorder | undefined {
  if (!raw) return undefined;
  const widths = resolveWidths(raw.borderWidths, 0);
  if (widths.top === 0 && widths.right === 0 && widths.bottom === 0 && widths.left === 0) return undefined;
  const colors = resolveColors(raw.borderColors, '#000');
  const border: ResolvedBorder = { widths, colors };
  if (raw.rx !== undefined || raw.ry !== undefined) {
    border.rx = raw.rx ?? raw.ry;
    border.ry = raw.ry ?? raw.rx;
  }
  return border;
}

function verticalOffsetFor(align: VerticalAlignment, available: number, content: number): number {
  const extra = available - content;
  if (extra <= 0) return 0;
  if (align === 'middle') return extra / 2;
  if (align === 'bottom') return extra;
  return 0;
}

/** Sum `count` consecutive entries of `arr` starting at `start`, plus `gap` between them. */
function sumSpan(arr: number[], start: number, count: number, gap: number): number {
  let sum = 0;
  for (let i = start; i < start + count; i++) sum += arr[i] ?? 0;
  return sum + gap * Math.max(0, count - 1);
}

// ── Placement (colSpan / rowSpan → grid position) ───────────────────────

interface Placed {
  cell: TableCell;
  startRow: number;
  startCol: number;
  colSpan: number;
  rowSpan: number;
  // filled in during measurement/layout — see layoutTableFrame
  cs: ResolvedCellStyle;
  pad: { top: number; right: number; bottom: number; left: number };
  border?: ResolvedBorder;
  /** padding + border width per side — the actual content inset (border-box model). */
  inset: { top: number; right: number; bottom: number; left: number };
  natural: number;
  width: number;
  content: TextFrameLayoutResult;
  cellHeight: number;
}

/**
 * Assign every cell its (startRow, startCol), accounting for cells above it
 * that `rowSpan` into this row. Column index within a row advances past any
 * slot still occupied by such a span (an implicit "ignored" cell — we track
 * occupancy instead of materialising placeholder cells).
 */
function placeCells(rows: TableRow[]): { placed: Placed[]; colCount: number } {
  const placed: Placed[] = [];
  const occupied: Map<number, Set<number>> = new Map(); // row → set of taken columns
  const isOccupied = (r: number, c: number) => occupied.get(r)?.has(c) ?? false;
  const occupy = (r: number, c: number) => {
    let set = occupied.get(r);
    if (!set) occupied.set(r, (set = new Set()));
    set.add(c);
  };

  let colCount = 0;
  for (let ri = 0; ri < rows.length; ri++) {
    let ci = 0;
    for (const cell of rows[ri].cells) {
      while (isOccupied(ri, ci)) ci++;
      const colSpan = Math.max(1, cell.colSpan ?? 1);
      const rowSpan = Math.max(1, cell.rowSpan ?? 1);
      placed.push({
        cell, startRow: ri, startCol: ci, colSpan, rowSpan,
        // placeholders — filled in by layoutTableFrame
        cs: undefined as any, pad: undefined as any, inset: undefined as any, natural: 0, width: 0,
        content: undefined as any, cellHeight: 0,
      });
      for (let dr = 1; dr < rowSpan; dr++) {
        for (let dc = 0; dc < colSpan; dc++) occupy(ri + dr, ci + dc);
      }
      colCount = Math.max(colCount, ci + colSpan);
      ci += colSpan;
    }
  }
  return { placed, colCount };
}

// ── Layout ───────────────────────────────────────────────────────────────

export function layoutTableFrame(table: TableFrame, options: TableLayoutOptions = {}): TableLayoutResult {
  const style = table.style ?? {};
  const margins = resolveWidths(style.margins, 0);
  const colGaps = style.colGaps ?? 0;
  const rowGaps = style.rowGaps ?? 0;
  const rowCount = table.rows.length;
  const tableBorder = resolveBorder(style);

  const { placed, colCount } = placeCells(table.rows);
  if (colCount === 0 || rowCount === 0) {
    return {
      width: margins.left + margins.right,
      height: margins.top + margins.bottom,
      bgColor: style.bgColor,
      ...(tableBorder ? { border: tableBorder } : {}),
      rows: [],
    };
  }

  // ── Resolve style + natural (unwrapped) width for every placed cell ────
  for (const p of placed) {
    p.cs = resolveCellStyle(p.cell, table);
    p.pad = resolveWidths(p.cs.paddings, DEFAULT_PADDING);
    p.border = resolveBorder(p.cs);
    const bw = p.border?.widths;
    p.inset = {
      top: p.pad.top + (bw?.top ?? 0),
      right: p.pad.right + (bw?.right ?? 0),
      bottom: p.pad.bottom + (bw?.bottom ?? 0),
      left: p.pad.left + (bw?.left ?? 0),
    };
    p.natural =
      layoutTextFrame({ ...p.cell.content, width: undefined, wrap: false }, { mode: options.mode }).content.width +
      p.inset.left + p.inset.right;
  }

  // ── Column widths: span-1 cells set the max; spanning cells only widen ──
  const colWidths = new Array(colCount).fill(0);
  if (table.columnWidths) {
    for (let c = 0; c < colCount; c++) colWidths[c] = table.columnWidths[c] ?? 0;
  } else {
    for (const p of placed) if (p.colSpan === 1) colWidths[p.startCol] = Math.max(colWidths[p.startCol], p.natural);
    for (const p of placed) {
      if (p.colSpan <= 1) continue;
      const covered = sumSpan(colWidths, p.startCol, p.colSpan, colGaps);
      if (p.natural > covered) {
        const extra = (p.natural - covered) / p.colSpan;
        for (let c = p.startCol; c < p.startCol + p.colSpan; c++) colWidths[c] += extra;
      }
    }
  }

  // Fit to an explicit table width — scale columns proportionally (shrink
  // wraps text; grow gives every column extra room).
  if (table.width !== undefined) {
    const budget = table.width - margins.left - margins.right - colGaps * Math.max(0, colCount - 1);
    const naturalSum = colWidths.reduce((a: number, b: number) => a + b, 0);
    if (naturalSum > 0 && budget > 0) {
      const scale = budget / naturalSum;
      for (let i = 0; i < colWidths.length; i++) colWidths[i] *= scale;
    }
  }

  // ── Lay out every cell's content at its final (possibly multi-column) width ──
  for (const p of placed) {
    p.width = sumSpan(colWidths, p.startCol, p.colSpan, colGaps);
    const contentWidth = Math.max(0, p.width - p.inset.left - p.inset.right);
    p.content = layoutTextFrame({ ...p.cell.content, width: contentWidth, wrap: true }, { mode: options.mode });
    p.cellHeight = p.content.content.height + p.inset.top + p.inset.bottom;
  }

  // ── Row heights: span-1 cells set the max; spanning cells only widen ───
  const rowHeights = new Array(rowCount).fill(0);
  if (table.rowHeights) {
    for (let r = 0; r < rowCount; r++) rowHeights[r] = table.rowHeights[r] ?? 0;
  } else {
    for (let ri = 0; ri < rowCount; ri++) {
      const explicitHeight = resolveRowStyle(table.rows[ri], table).height;
      if (explicitHeight > 0) rowHeights[ri] = explicitHeight;
    }
    for (const p of placed) {
      if (p.rowSpan === 1 && rowHeights[p.startRow] === 0) rowHeights[p.startRow] = p.cellHeight;
      else if (p.rowSpan === 1) rowHeights[p.startRow] = Math.max(rowHeights[p.startRow], p.cellHeight);
    }
    for (const p of placed) {
      if (p.rowSpan <= 1) continue;
      const covered = sumSpan(rowHeights, p.startRow, p.rowSpan, rowGaps);
      if (p.cellHeight > covered) {
        const extra = (p.cellHeight - covered) / p.rowSpan;
        for (let r = p.startRow; r < p.startRow + p.rowSpan; r++) rowHeights[r] += extra;
      }
    }
  }

  // ── Position ─────────────────────────────────────────────────────────
  const colX: number[] = [];
  {
    let acc = margins.left;
    for (let c = 0; c < colCount; c++) { colX.push(acc); acc += colWidths[c] + colGaps; }
  }
  const rowY: number[] = [];
  {
    let acc = margins.top;
    for (let r = 0; r < rowCount; r++) { rowY.push(acc); acc += rowHeights[r] + rowGaps; }
  }

  const rows: TableRowLayoutResult[] = table.rows.map((row, ri) => {
    const rs = resolveRowStyle(row, table);
    const rowBorder = resolveBorder(rs);
    const cells: TableCellLayoutResult[] = placed
      .filter((p) => p.startRow === ri)
      .map((p) => {
        const height = sumSpan(rowHeights, p.startRow, p.rowSpan, rowGaps);
        const available = height - p.inset.top - p.inset.bottom;
        const verticalOffset = verticalOffsetFor(p.cs.verticalAlign, available, p.content.content.height);
        return {
          x: colX[p.startCol],
          y: rowY[p.startRow],
          width: p.width,
          height,
          padding: p.pad,
          verticalOffset,
          ...(p.cs.bgColor ? { bgColor: p.cs.bgColor } : {}),
          ...(p.border ? { border: p.border } : {}),
          content: p.content,
          colSpan: p.colSpan,
          rowSpan: p.rowSpan,
        };
      });
    return {
      y: rowY[ri],
      height: rowHeights[ri],
      ...(rs.bgColor ? { bgColor: rs.bgColor } : {}),
      ...(rowBorder ? { border: rowBorder } : {}),
      cells,
    };
  });

  const totalWidth = margins.left + colWidths.reduce((a: number, b: number) => a + b, 0) + colGaps * Math.max(0, colCount - 1) + margins.right;
  const totalHeight = margins.top + rowHeights.reduce((a: number, b: number) => a + b, 0) + rowGaps * Math.max(0, rowCount - 1) + margins.bottom;

  return {
    width: totalWidth,
    height: totalHeight,
    bgColor: style.bgColor,
    ...(tableBorder ? { border: tableBorder } : {}),
    rows,
  };
}
