/**
 * interactive.ts — hit-testing and position utilities for Canvas editor.
 *
 * Provides functions to map pixel coordinates to character positions
 * within the layout output (Line[]), using Span.glyphAdvances for
 * per-character granularity.
 *
 * @see {@link https://www.w3.org/TR/css-text-3/ | CSS Text Module Level 3}
 */

import type { Line, Span } from '@vyaz/core';

// ── Types ──────────────────────────────────────────────────────────────────

/**
 * A resolved character position within the layout tree.
 *
 * Contains enough context for cursor placement, selection start/end,
 * and hit-testing.
 */
export interface CharPos {
  /** Index of the line in the lines array (0-based). */
  lineIndex: number;
  /** Index of the span within the line (0-based). */
  spanIndex: number;
  /** Index of the character within the span text (0-based). */
  charIndex: number;
  /** Paragraph index (from Span.pIdx). */
  pIdx: number;
  /** Absolute X position of the character's left edge (CSS px). */
  x: number;
  /** Absolute Y position of the character's baseline (CSS px). */
  y: number;
  /** Character advance width in px (from glyphAdvances or estimated). */
  width: number;
  /** Reference to the owning Line. */
  line: Line;
  /** Reference to the owning Span. */
  span: Span;
}

// ── Internal helpers ───────────────────────────────────────────────────────

/**
 * Get the per-character advance widths for a span.
 * Uses `glyphAdvances` when available, otherwise falls back to
 * uniform distribution based on `span.width / span.text.length`.
 */
function getCharAdvances(span: Span): number[] {
  if (span.glyphAdvances && span.glyphAdvances.length > 0) {
    return Array.from(span.glyphAdvances);
  }
  // Fallback: uniform distribution
  const len = span.text.length;
  if (len === 0) return [];
  const avgWidth = span.width / len;
  return new Array(len).fill(avgWidth);
}

/**
 * Build a flat list of character segments from all spans in a line.
 *
 * Each segment records the span index, char index, text char,
 * and absolute left-edge X position.
 */
interface CharSegment {
  lineIndex: number;
  spanIndex: number;
  charIndex: number;
  pIdx: number;
  x: number;
  y: number;
  width: number;
  char: string;
  line: Line;
  span: Span;
}

function buildCharSegments(lines: Line[]): CharSegment[] {
  const segments: CharSegment[] = [];

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    const baselineY = line.y + line.baseline;

    for (let si = 0; si < line.spans.length; si++) {
      const span = line.spans[si];
      const advances = getCharAdvances(span);
      const text = span.text;

      let charX = line.x + span.x;

      for (let ci = 0; ci < text.length; ci++) {
        const advance = ci < advances.length ? advances[ci] : 0;

        segments.push({
          lineIndex: li,
          spanIndex: si,
          charIndex: ci,
          pIdx: span.pIdx,
          x: charX,
          y: baselineY,
          width: advance,
          char: text[ci],
          line,
          span,
        });

        charX += advance;
      }
    }
  }

  return segments;
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Find the character position nearest to the given pixel coordinates.
 *
 * Uses a two-pass approach:
 * 1. Find the nearest line by Y distance (closest baseline).
 * 2. Within that line, find the nearest character by X distance
 *    (using glyph advances or fallback uniform widths).
 *
 * Returns `null` if `lines` is empty.
 */
export function charAtPoint(
  lines: Line[],
  px: number,
  py: number,
): CharPos | null {
  if (lines.length === 0) return null;

  // ── Pass 1: find nearest line ─────────────────────────────────────
  let nearestLineIdx = 0;
  let minYDist = Infinity;

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    const baselineY = line.y + line.baseline;
    const yDist = Math.abs(py - baselineY);

    // Consider line box vertical extent: if py is within [y, y+height],
    // it's an exact match (zero distance).
    const inLineBox = py >= line.y && py <= line.y + line.height;
    const distance = inLineBox ? 0 : yDist;

    if (distance < minYDist) {
      minYDist = distance;
      nearestLineIdx = li;
    }
  }

  const line = lines[nearestLineIdx];
  const baselineY = line.y + line.baseline;

  // ── Pass 2: find nearest character in the line ────────────────────
  // Build char segments for this line only
  let nearestSpanIdx = 0;
  let nearestCharIdx = 0;
  let nearestX = line.x;
  let nearestWidth = 0;
  let nearestSpan = line.spans[0];
  let minXDist = Infinity;

  for (let si = 0; si < line.spans.length; si++) {
    const span = line.spans[si];
    const advances = getCharAdvances(span);
    const text = span.text;

    let charX = line.x + span.x;

    for (let ci = 0; ci < text.length; ci++) {
      const advance = ci < advances.length ? advances[ci] : 0;
      const charCenter = charX + advance / 2;
      const xDist = Math.abs(px - charCenter);

      if (xDist < minXDist) {
        minXDist = xDist;
        nearestSpanIdx = si;
        nearestCharIdx = ci;
        nearestX = charX;
        nearestWidth = advance;
        nearestSpan = span;
      }

      charX += advance;
    }
  }

  return {
    lineIndex: nearestLineIdx,
    spanIndex: nearestSpanIdx,
    charIndex: nearestCharIdx,
    pIdx: nearestSpan.pIdx,
    x: nearestX,
    y: baselineY,
    width: nearestWidth,
    line,
    span: nearestSpan,
  };
}

/**
 * Convert a global character index (startIndex / endIndex from Line)
 * to a `CharPos`.
 *
 * Useful for mapping cursor/selection from a text model to layout position.
 *
 * Returns `null` if the index is out of range.
 */
export function charIndexToPos(
  lines: Line[],
  charIndex: number,
): CharPos | null {
  const segments = buildCharSegments(lines);

  // Find the segment at or after the given index
  let globalIdx = 0;
  for (const seg of segments) {
    if (globalIdx === charIndex) {
      return {
        lineIndex: seg.lineIndex,
        spanIndex: seg.spanIndex,
        charIndex: seg.charIndex,
        pIdx: seg.pIdx,
        x: seg.x,
        y: seg.y,
        width: seg.width,
        line: seg.line,
        span: seg.span,
      };
    }
    globalIdx++;
  }

  // If charIndex is at the end (after last char), return the last position
  if (charIndex >= globalIdx && segments.length > 0) {
    const last = segments[segments.length - 1];
    return {
      lineIndex: last.lineIndex,
      spanIndex: last.spanIndex,
      charIndex: last.charIndex + 1,
      pIdx: last.pIdx,
      x: last.x + last.width,
      y: last.y,
      width: 0,
      line: last.line,
      span: last.span,
    };
  }

  return null;
}

/**
 * Compute the global character index from a CharPos.
 *
 * This walks all preceding lines/spans/characters to compute
 * the absolute index in the full text.
 */
export function posToCharIndex(lines: Line[], pos: CharPos): number {
  let index = 0;

  for (let li = 0; li < pos.lineIndex; li++) {
    const line = lines[li];
    for (const span of line.spans) {
      index += span.text.length;
    }
  }

  // Add characters in current line up to the target span
  const line = lines[pos.lineIndex];
  for (let si = 0; si < pos.spanIndex; si++) {
    index += line.spans[si].text.length;
  }

  // Add characters within the target span
  index += pos.charIndex;

  return index;
}