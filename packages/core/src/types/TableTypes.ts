/**
 * TableTypes.ts — TableFrame input types (Logical level), alongside TextFrame.
 *
 * Hierarchy: TableFrame → TableRow[] → TableCell[] → TextFrame (recursive —
 * a cell's content is laid out and rendered exactly like a normal text box).
 *
 * The style surface (per-side widths/colors/patterns, CSS-style 1/2/4-value
 * shorthand) is deliberately modelled on `svg-table-core`'s `common-types.ts` /
 * `private-types.ts` (github.com/wootra/svg-table) — a well-shaped API for this
 * exact problem — adapted so cell content is a `TextFrame` instead of a render
 * callback, and column/row sizing is measured from that content rather than
 * required from the caller.
 *
 * T0 (this file + TableLayoutEngine.ts): grid sizing only — no colSpan/rowSpan,
 * no borders. See ROADMAP / packages/core `PLAN.md`-adjacent notes for T1–T3.
 */
import type { TextFrame, VerticalAlignment } from './Document.js';

// ── Shared shorthand primitives ─────────────────────────────────────────

/**
 * CSS-style shorthand for a per-side numeric value.
 * `n` = all four sides; `[tb, lr]` = top/bottom, left/right; `[t, r, b, l]` =
 * one per side (CSS clockwise order).
 */
export type Widths = number | [number, number] | [number, number, number, number];

// ── Cell ─────────────────────────────────────────────────────────────────

/** Style for a single `TableCell`. Falls back to `TableFrame.defaultCellStyle`. */
export interface TableCellStyle {
  /** Cell background fill. */
  bgColor?: string;
  /** Inner padding, CSS shorthand. Default `8` on all sides. */
  paddings?: Widths;
  /** Vertical alignment of the cell's content within its row height. Default `'top'`. */
  verticalAlign?: VerticalAlignment;
}

/**
 * One table cell. `content` is a full `TextFrame` — the same recursive shape
 * as everywhere else in vyaz, laid out and rendered like any other text box.
 *
 * `content.width` and `content.wrap` are overridden by the table layout (the
 * column width decides them); set everything else — paragraphs, alignment,
 * runs — as usual.
 *
 * @todo `colSpan` / `rowSpan` are accepted by the type but not yet implemented
 *       by the layout engine (T1) — every cell occupies exactly one column and row.
 */
export interface TableCell {
  content: TextFrame;
  /** Columns this cell spans. @todo not yet implemented (T1); treated as `1`. */
  colSpan?: number;
  /** Rows this cell spans. @todo not yet implemented (T1); treated as `1`. */
  rowSpan?: number;
  style?: Partial<TableCellStyle>;
}

// ── Row ──────────────────────────────────────────────────────────────────

/** Style for a `TableRow`. Falls back to `TableFrame.defaultRowStyle`. */
export interface TableRowStyle {
  /** Explicit row height override, in px. Auto (tallest cell) when absent. */
  height?: number;
  /** Row background fill, painted under `TableCellStyle.bgColor`. */
  bgColor?: string;
}

export interface TableRow {
  cells: TableCell[];
  style?: Partial<TableRowStyle>;
  /** Informational — a header row (`<thead>`/`<th>`). No layout effect yet. */
  isHeader?: boolean;
}

// ── Table (root) ─────────────────────────────────────────────────────────

/** Table-wide style. */
export interface TableStyle {
  /** Outer margin around the whole table, CSS shorthand. Default `0`. */
  margins?: Widths;
  /** Table background fill, painted under row/cell backgrounds. */
  bgColor?: string;
  /** Gap between columns, in px. Default `0`. */
  colGaps?: number;
  /** Gap between rows, in px. Default `0`. */
  rowGaps?: number;
}

/**
 * Root table container — sibling of `TextFrame`.
 *
 * Column widths are measured from cell content (each cell's natural,
 * unwrapped width) unless `columnWidths` is given; row heights are measured
 * from the laid-out cell content unless `rowHeights` is given.
 */
export interface TableFrame {
  rows: TableRow[];
  /**
   * Total table width in px. When set and narrower than the natural column
   * widths, columns shrink proportionally and cell text wraps; when wider,
   * the extra space is distributed across columns. Auto (sum of natural
   * column widths) when absent.
   */
  width?: number;
  /** Explicit per-column width override, in px. Overrides measurement. */
  columnWidths?: number[];
  /** Explicit per-row height override, in px. Overrides measurement. */
  rowHeights?: number[];
  style?: Partial<TableStyle>;
  /** Default style merged under every `TableCell.style`. */
  defaultCellStyle?: Partial<TableCellStyle>;
  /** Default style merged under every `TableRow.style`. */
  defaultRowStyle?: Partial<TableRowStyle>;
}
