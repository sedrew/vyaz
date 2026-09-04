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
 * T0/T1 (this file + TableLayoutEngine.ts): grid sizing + colSpan/rowSpan.
 * T2: solid per-side borders + uniform corner radius. T3 (this update): dash
 * patterns + per-side stroke-linecap. Asymmetric corner radii remain a
 * possible future addition.
 */
import type { TextFrame, VerticalAlignment } from './Document.js';

// ── Shared shorthand primitives ─────────────────────────────────────────

/**
 * CSS-style shorthand for a per-side value of type `T`.
 * `v` = all four sides; `[tb, lr]` = top/bottom, left/right; `[t, r, b, l]` =
 * one per side (CSS clockwise order).
 */
export type Sides<T> = T | [T, T] | [T, T, T, T];

/** `Sides<number>` — paddings, margins, border widths. */
export type Widths = Sides<number>;

/** `Sides<string>` — border colors. */
export type ColorsOnWidth = Sides<string>;

/** SVG `stroke-linecap` for a border's dash pattern (or its solid ends). */
export type BorderLineCap = 'butt' | 'round' | 'square';

/**
 * Per-side SVG `stroke-dasharray`. Not a `Sides<number[]>` — a flat
 * `number[]` (one pattern for every side) is structurally indistinguishable
 * from a 2- or 4-element `Sides` tuple once the element type is itself an
 * array, so this is its own explicit union (same shape svg-table-core's
 * `PatternArrays` uses, for the same reason): `[a, b]` = one pattern on all
 * four sides; `[[tb], [lr]]` = top/bottom, left/right; `[[t], [r], [b], [l]]`
 * = one per side (CSS clockwise order). `undefined` (or an absent side) =
 * solid.
 */
export type BorderPatterns = number[] | [number[], number[]] | [number[], number[], number[], number[]];

/**
 * Solid per-side border + a uniform corner radius. Shared by `TableStyle`
 * (the table's own outer border), `TableRowStyle` and `TableCellStyle`.
 *
 * @see TableTypes.ts header — modelled on svg-table-core's `BorderStyles`.
 *      Asymmetric corner radii are a possible future addition; everything
 *      else in svg-table-core's `BorderStyles` is covered.
 */
export interface BorderStyles {
  /** Per-side border width, CSS shorthand. `0` (absent) = no border on that side. */
  borderWidths?: Widths;
  /** Per-side border color, CSS shorthand. Default `'#000'` when a width is set. */
  borderColors?: ColorsOnWidth;
  /**
   * Per-side SVG `stroke-dasharray`. A side with no pattern (or the whole
   * property absent) is a solid line. `[4, 2]` = 4px dash, 2px gap, repeating.
   */
  borderPatterns?: BorderPatterns;
  /** Per-side `stroke-linecap` for that side's (dashed or solid) line. Default `'butt'`. */
  borderShapes?: Sides<BorderLineCap>;
  /** Uniform corner radius (all four corners). Asymmetric radii are a future addition. */
  rx?: number;
  /** Uniform corner radius; defaults to `rx` when only one is given. */
  ry?: number;
}

// ── Cell ─────────────────────────────────────────────────────────────────

/** Style for a single `TableCell`. Falls back to `TableFrame.defaultCellStyle`. */
export interface TableCellStyle extends BorderStyles {
  /** Cell background fill. */
  bgColor?: string;
  /** Inner padding, CSS shorthand. Default `8` on all sides. */
  paddings?: Widths;
  /** Vertical alignment of the cell's content within its row height. Default `'top'`. */
  verticalAlign?: VerticalAlignment;
  /**
   * Fine-tuning nudge applied to the cell's content position, in px, on top of
   * padding/alignment/`verticalAlign`. Positive `cx` moves right, positive
   * `cy` moves down. Default `0`.
   */
  cx?: number;
  /** @see cx */
  cy?: number;
  /**
   * Let content wider/taller than the cell's padding box paint past its
   * edges instead of being clipped. Default `false` (clipped) — matches
   * `svg-table-core`'s default.
   */
  allowOverflow?: boolean;
}

/**
 * One table cell. `content` is a full `TextFrame` — the same recursive shape
 * as everywhere else in vyaz, laid out and rendered like any other text box.
 *
 * `content.width` and `content.wrap` are overridden by the table layout (the
 * column width decides them); set everything else — paragraphs, alignment,
 * runs — as usual.
 */
export interface TableCell {
  content: TextFrame;
  /**
   * Columns this cell spans. Default `1`. `'auto'` — only honoured on the
   * *last* cell of a row — stretches it to fill every remaining column, so a
   * ragged/short row lines its trailing border up with the widest row
   * instead of leaving a gap. Unlike svg-table-core (where the last cell of
   * *every* row does this implicitly), this is opt-in: a genuinely short
   * last cell keeps `colSpan: 1` unless you ask for `'auto'`. Elsewhere in a
   * row (not the last cell) `'auto'` is a no-op (`colSpan: 1`) — expanding a
   * non-trailing cell would overlap the cells after it.
   */
  colSpan?: number | 'auto';
  /** Rows this cell spans. Default `1`. */
  rowSpan?: number;
  style?: Partial<TableCellStyle>;
}

// ── Row ──────────────────────────────────────────────────────────────────

/** Style for a `TableRow`. Falls back to `TableFrame.defaultRowStyle`. */
export interface TableRowStyle extends BorderStyles {
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
export interface TableStyle extends BorderStyles {
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
