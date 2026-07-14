/**
 * LayoutTypes.ts — output types (Physical Box Model).
 *
 * ParagraphLayoutResult → Line[] → Span[]
 * This is the contract between layout engine and renderers.
 *
 * Based on plan.md §2.5 (Output — Physical Box Model / Layout Tree)
 */

import type { TextRun, InlineWidget, TextAlignment } from './Document.js';

// ── Span (render atom, formerly FragmentBox) ─────────────────────────────

export interface Span {
  /** Offset from Line.x */
  x: number;
  /** Physical span width */
  width: number;
  /** Span text (or " " for justify spaces) */
  text: string;
  /** Index of the source run in the paragraph's `children` array. */
  itemIndex: number;
  /** Paragraph index in TextFrame.paragraphs[]. Stable key for grouping & diff. */
  pIdx: number;
  /** ID of the source paragraph (for SVG grouping). */
  paragraphId?: string;

  /** Physical font metrics for this span */
  fontMetrics: SpanFontMetrics;

  /**
   * A snapshot of the source run's style at layout time.
   * Copied from the corresponding `TextRun` in the paragraph's `children` array.
   */
  style: TextRun;

  /** InlineWidget data (if span is an inline-box) */
  inlineWidget?: InlineWidget;

  /** Per-character advance widths (for selection/tracking) */
  glyphAdvances?: number[];

  /** Span type: 'text' — regular text, 'space' — whitespace span */
  type: 'text' | 'space';

  /**
   * Trailing whitespace flag.
   * - true: span is at end of line, does not participate in line advance
   *         and is not stretched during justify (zero width for calculations).
   * - undefined/false: regular span.
   *
   * See CSS Text Module Level 3 §4.1.3 (Tracking and Dropping Spaces)
   * and Parley LineItemData::has_trailing_whitespace.
   */
  trailing?: boolean;

  /**
   * Line break mode after this span.
   * 'soft' — soft line break (insufficient space)
   * 'hard' — forced break (\n, explicit separator)
   * undefined — not end of line
   */
  breakType?: 'soft' | 'hard';
}

export interface SpanFontMetrics {
  ascent: number;
  descent: number;
  fontSize: number;
  /** Vertical offset from baseline (px). Used for sub/superscript positioning.
   *  Negative = above baseline (superscript). Positive = below baseline (subscript).
   *  Undefined or 0 = normal baseline position. */
  baselineOffset?: number;
}

// ── Line (single line, formerly LineBox) ─────────────────────────────────

export interface Line {
  /** Absolute X within container (alignment + indent) */
  x: number;
  /** Absolute Y of line top edge */
  y: number;
  /** Line content width (without alignment) */
  width: number;
  /** Full line height (max spans × lineHeight) */
  height: number;

  /** Baseline offset from y */
  baseline: number;
  /** Maximum ascent in line */
  ascent: number;
  /** Maximum descent in line */
  descent: number;

  /** Index of first character in the original paragraph text */
  startIndex: number;
  /** Index of last character + 1 (for convenient length calculation) */
  endIndex: number;

  /** Paragraph alignment (optional, for PowerPoint render) */
  alignment?: TextAlignment;

  spans: Span[];
}

// ── ParagraphLayoutResult (single paragraph) ─────────────────────────────

export interface ParagraphLayoutResult {
  width: number;             // paragraph width (maxWidth)
  height: number;            // full paragraph height including spacing
  lines: Line[];
  /** Actual content width (text bbox, without voids) */
  contentWidth: number;
  /** Actual content height (text bbox) */
  contentHeight: number;
}

// ── Text region for YAML snapshots ───────────────────────────────────────

/** Semantic span for snapshots (without physical metrics) */
export interface SemanticFragment {
  text: string;
  x: number;
  width: number;
  style?: 'bold' | 'italic' | 'normal';
}

/** Semantic line for snapshots */
export interface SemanticLine {
  y: number;
  width: number;
  height: number;
  baseline: number;
  fragments: SemanticFragment[];
}

/** Semantic paragraph for YAML snapshots */
export interface SemanticParagraph {
  width: number;
  height: number;
  lines: SemanticLine[];
}

