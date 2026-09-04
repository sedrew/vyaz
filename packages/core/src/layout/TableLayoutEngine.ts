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
 * Border dash patterns (`borderPatterns`) and per-side `stroke-linecap`
 * (`borderShapes`) resolve here (`resolveBorder`) but paint in
 * `@vyaz/renderer`'s `TableRenderer.ts` (`borderMarkup`) — this engine only
 * produces the resolved per-side values. Asymmetric corner radii (only a
 * uniform `rx`/`ry` today) remain a possible future addition.
 *
 * Nested tables: `TableCell.content` can be a `TableFrame` instead of a
 * `TextFrame` (`isNestedTable`). Both the natural-width pass and the final
 * layout pass then call `layoutTableFrame` recursively instead of
 * `layoutTextFrame` — meaning a nested cell's own two-pass layout happens
 * *twice* (once per outer pass), so cost roughly doubles per nesting depth.
 * The nested `TableLayoutResult` is exposed as `TableCellLayoutResult.
 * nestedTable`; `content` still gets a placeholder `TextFrameLayoutResult`
 * (zero lines, sized to the nested table) so every existing consumer that
 * reads cell dimensions off `content.content.{width,height}` keeps working
 * unchanged — `TableRenderer.ts` checks `nestedTable` first and renders that
 * instead of `content` when present. `_depth` is an internal recursion
 * counter (not meant to be set by callers) — past 50 levels this throws
 * instead of hanging, on the assumption that's a cyclic/pathological input,
 * not a real document.
 */
import type { TableFrame, TableRow, TableCell, TableCellStyle, TableRowStyle, BorderStyles, Widths, ColorsOnWidth, BorderLineCap } from '../types/TableTypes.js';
import type { TextFrameLayoutResult } from './TextFrameLayoutEngine.js';
import type { TextFrame, VerticalAlignment } from '../types/Document.js';
import { layoutTextFrame } from './TextFrameLayoutEngine.js';
import { resolveWidths, resolveColors, resolvePatterns, resolveShapes, type Side } from '../utils/sides.js';

// ── Result shape ─────────────────────────────────────────────────────────

/** A resolved, ready-to-paint border. Absent when every side's width is `0`. */
export interface ResolvedBorder {
  widths: Record<Side, number>;
  colors: Record<Side, string>;
  /** Present only when at least one side has a non-empty dash pattern. */
  patterns?: Record<Side, number[] | undefined>;
  /** Present only when `borderShapes` was set anywhere in the style cascade. */
  shapes?: Record<Side, BorderLineCap>;
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
  /** `TableCellStyle.cx`/`cy` — an additional px nudge on top of padding/alignment. Default `0`. */
  cx: number;
  /** @see cx */
  cy: number;
  /** `TableCellStyle.allowOverflow` — let content paint past the cell's padding box. Default `false`. */
  allowOverflow: boolean;
  bgColor?: string;
  border?: ResolvedBorder;
  /**
   * The cell's laid-out content — same shape a lone `TextFrame` produces.
   * When `TableCell.content` was a `TableFrame` (see `nestedTable`), this is
   * a zero-line placeholder sized to match it — a renderer should check
   * `nestedTable` first and use that instead of painting `content` as text.
   */
  content: TextFrameLayoutResult;
  /**
   * Present when `TableCell.content` was a `TableFrame` — a table nested
   * inside this cell, already laid out at the cell's own content width.
   * `content` (above) is a same-sized placeholder in this case, not real
   * text — paint this instead.
   */
  nestedTable?: TableLayoutResult;
  /**
   * `TableCell.before`, laid out unwrapped at its own natural size and
   * positioned absolute-within-the-table, already vertically centered.
   * Absent when the cell has no `before`.
   */
  before?: { content: TextFrameLayoutResult; x: number; y: number };
  /** @see before — from `TableCell.after`, right-anchored instead. */
  after?: { content: TextFrameLayoutResult; x: number; y: number };
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
  /**
   * The border-box — the outer box with `TableStyle.margins` excluded. Rows
   * span its full width; `border` (above) is drawn at this box. A renderer
   * uses it directly instead of re-deriving margins from row/cell positions.
   */
  contentBox: { x: number; y: number; width: number; height: number };
  rows: TableRowLayoutResult[];
}

export interface TableLayoutOptions {
  mode?: 'browser' | 'office';
  /**
   * What to do when a cell's `fontFamily` isn't registered — forwarded to
   * every cell's own `layoutTextFrame` call. `'throw'` (default) raises
   * `FontNotFoundError`; `'substitute'` uses any registered family and folds
   * the cell's own warnings into the table's (none surfaced directly here —
   * a caller wanting them should lay out a cell's `TextFrame` itself).
   */
  onMissingFont?: 'throw' | 'substitute';
  /**
   * Internal nested-table recursion counter — do not set this yourself.
   * `layoutTableFrame` increments it on every recursive call (a `TableCell`
   * whose `content` is itself a `TableFrame`) and throws past 50 levels.
   * @internal
   */
  _depth?: number;
}

const MAX_NESTED_TABLE_DEPTH = 50;

/** `TableCell.content` discriminator — a `TableFrame` has `rows`, a `TextFrame` has `paragraphs`. */
function isNestedTable(content: TextFrame | TableFrame): content is TableFrame {
  return 'rows' in content;
}

/** A zero-line placeholder `TextFrameLayoutResult` sized to a nested table, so size-reading consumers need no branch. */
function placeholderContentFor(nested: TableLayoutResult): TextFrameLayoutResult {
  return {
    lines: [],
    content: { width: nested.width, height: nested.height },
    frame: { width: nested.width, height: nested.height },
    overflow: { horizontal: false, vertical: false },
    fit: { horizontal: 'content', vertical: 'content' },
    writingMode: 'horizontal-tb',
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────

const DEFAULT_PADDING = 8;

interface ResolvedCellStyle {
  bgColor: string;
  paddings: Widths;
  verticalAlign: VerticalAlignment;
  cx: number;
  cy: number;
  allowOverflow: boolean;
  borderWidths?: Widths;
  borderColors?: ColorsOnWidth;
  borderPatterns?: BorderStyles['borderPatterns'];
  borderShapes?: BorderStyles['borderShapes'];
  rx?: number;
  ry?: number;
}

interface ResolvedRowStyle {
  height: number;
  bgColor: string;
  borderWidths?: Widths;
  borderColors?: ColorsOnWidth;
  borderPatterns?: BorderStyles['borderPatterns'];
  borderShapes?: BorderStyles['borderShapes'];
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
    cx: s.cx ?? d.cx ?? 0,
    cy: s.cy ?? d.cy ?? 0,
    allowOverflow: s.allowOverflow ?? d.allowOverflow ?? false,
    borderWidths: s.borderWidths ?? d.borderWidths,
    borderColors: s.borderColors ?? d.borderColors,
    borderPatterns: s.borderPatterns ?? d.borderPatterns,
    borderShapes: s.borderShapes ?? d.borderShapes,
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
    borderPatterns: s.borderPatterns ?? d.borderPatterns,
    borderShapes: s.borderShapes ?? d.borderShapes,
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
  if (raw.borderPatterns !== undefined) {
    const patterns = resolvePatterns(raw.borderPatterns);
    if (patterns.top?.length || patterns.right?.length || patterns.bottom?.length || patterns.left?.length) {
      border.patterns = patterns;
    }
  }
  if (raw.borderShapes !== undefined) border.shapes = resolveShapes(raw.borderShapes);
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
  /** Set instead of/alongside a placeholder `content` when `cell.content` is a `TableFrame`. */
  nestedTable?: TableLayoutResult;
  cellHeight: number;
}

/**
 * Assign every cell its (startRow, startCol), accounting for cells above it
 * that `rowSpan` into this row. Column index within a row advances past any
 * slot still occupied by such a span (an implicit "ignored" cell — we track
 * occupancy instead of materialising placeholder cells).
 *
 * `colSpan: 'auto'` needs the table's final `colCount` before it can resolve
 * to a number, and `colCount` itself depends on every row's placement — so
 * this runs in two passes: place everything first, treating `'auto'` as `1`
 * (its own minimum contribution to `colCount`), then widen each `'auto'`
 * last-cell to `colCount - startCol`.
 */
function placeCells(rows: TableRow[]): { placed: Placed[]; colCount: number } {
  const placed: Placed[] = [];
  const autoLastCell: Placed[] = [];
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
    const cells = rows[ri].cells;
    for (let idx = 0; idx < cells.length; idx++) {
      const cell = cells[idx];
      while (isOccupied(ri, ci)) ci++;
      const isAuto = cell.colSpan === 'auto';
      const colSpan = cell.colSpan === 'auto' ? 1 : Math.max(1, cell.colSpan ?? 1);
      const rowSpan = Math.max(1, cell.rowSpan ?? 1);
      const p: Placed = {
        cell, startRow: ri, startCol: ci, colSpan, rowSpan,
        // placeholders — filled in by layoutTableFrame
        cs: undefined as any, pad: undefined as any, inset: undefined as any, natural: 0, width: 0,
        content: undefined as any, cellHeight: 0,
      };
      placed.push(p);
      if (isAuto && idx === cells.length - 1) autoLastCell.push(p);
      for (let dr = 1; dr < rowSpan; dr++) {
        for (let dc = 0; dc < colSpan; dc++) occupy(ri + dr, ci + dc);
      }
      colCount = Math.max(colCount, ci + colSpan);
      ci += colSpan;
    }
  }
  // Pass 2: widen every 'auto' last-cell to fill out to the now-known colCount.
  for (const p of autoLastCell) {
    if (p.startCol < colCount - 1) p.colSpan = colCount - p.startCol;
  }
  return { placed, colCount };
}

// ── Layout ───────────────────────────────────────────────────────────────

export function layoutTableFrame(table: TableFrame, options: TableLayoutOptions = {}): TableLayoutResult {
  const depth = options._depth ?? 0;
  if (depth > MAX_NESTED_TABLE_DEPTH) {
    throw new Error(
      `layoutTableFrame: nested table depth exceeded ${MAX_NESTED_TABLE_DEPTH} — likely a cyclic or pathological TableCell.content structure, not a real document.`,
    );
  }
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
      contentBox: { x: margins.left, y: margins.top, width: 0, height: 0 },
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
    const naturalWidth = isNestedTable(p.cell.content)
      ? layoutTableFrame(p.cell.content, { mode: options.mode, onMissingFont: options.onMissingFont, _depth: depth + 1 }).width
      : layoutTextFrame({ ...p.cell.content, width: undefined, wrap: false }, { mode: options.mode, onMissingFont: options.onMissingFont }).content.width;
    p.natural = naturalWidth + p.inset.left + p.inset.right;
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
    if (isNestedTable(p.cell.content)) {
      const nested = layoutTableFrame(
        { ...p.cell.content, width: contentWidth },
        { mode: options.mode, onMissingFont: options.onMissingFont, _depth: depth + 1 },
      );
      p.nestedTable = nested;
      p.content = placeholderContentFor(nested);
    } else {
      p.content = layoutTextFrame({ ...p.cell.content, width: contentWidth, wrap: true }, { mode: options.mode, onMissingFont: options.onMissingFont });
    }
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
        const cellX = colX[p.startCol];
        const cellY = rowY[p.startRow];

        let before: TableCellLayoutResult['before'];
        if (p.cell.before) {
          const bc = layoutTextFrame({ ...p.cell.before, width: undefined, wrap: false }, { mode: options.mode, onMissingFont: options.onMissingFont });
          before = { content: bc, x: cellX + p.inset.left, y: cellY + (height - bc.content.height) / 2 };
        }
        let after: TableCellLayoutResult['after'];
        if (p.cell.after) {
          const ac = layoutTextFrame({ ...p.cell.after, width: undefined, wrap: false }, { mode: options.mode, onMissingFont: options.onMissingFont });
          after = { content: ac, x: cellX + p.width - p.inset.right - ac.content.width, y: cellY + (height - ac.content.height) / 2 };
        }

        return {
          x: cellX,
          y: cellY,
          width: p.width,
          height,
          padding: p.pad,
          verticalOffset,
          cx: p.cs.cx,
          cy: p.cs.cy,
          allowOverflow: p.cs.allowOverflow,
          ...(p.cs.bgColor ? { bgColor: p.cs.bgColor } : {}),
          ...(p.border ? { border: p.border } : {}),
          content: p.content,
          ...(p.nestedTable ? { nestedTable: p.nestedTable } : {}),
          ...(before ? { before } : {}),
          ...(after ? { after } : {}),
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
    contentBox: {
      x: margins.left,
      y: margins.top,
      width: totalWidth - margins.left - margins.right,
      height: totalHeight - margins.top - margins.bottom,
    },
    rows,
  };
}
