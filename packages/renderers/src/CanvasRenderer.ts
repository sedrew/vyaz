/**
 * CanvasRenderer.ts — Layered Canvas rendering for Line[].
 *
 * Takes ready Line[] with absolute coordinates and provides
 * rendering functions for each visual layer:
 *
 *   1. Background layer     — clearRect / fillRect
 *   2. Text layer           — text spans (dumb drawer)
 *   3. Selection layer      — highlighted selection range
 *   4. Cursor layer         — blinking caret
 *   5. Debug overlay layer  — bounding boxes, baselines, labels
 *
 * Each function is standalone so consumers (e.g. fabric.js adapter)
 * can compose layers in any order or skip layers as needed.
 *
 * Does NOT compute anything — only draws (dumb drawer principle).
 *
 * @see SVGRenderer for reference SVG implementation.
 */

import type { Line, Span } from '@vyaz/core';
import type { DebugFlags } from './types.js';
import type { CharPos } from './interactive.js';
import { computeBBox } from './utils.js';

export interface CanvasRenderOptions {
  /**
   * How the canvas size is determined:
   *   'frame'   — use current ctx.canvas.width/height (default)
   *   'content' — compute bounding box from lines, resize canvas to fit
   */
  sizing?: 'frame' | 'content';
  /**
   * When true: render space spans with a space character.
   * When false (default): skip space spans (position is already accounted for in x).
   */
  preserveSpaces?: boolean;
  /** Background color for clearing. If omitted, canvas is cleared transparent. */
  backgroundColor?: string;
  /** Debug overlay flags. */
  debug?: DebugFlags;
}

/**
 * Options for cursor rendering.
 */
export interface CursorOptions {
  /** Cursor color. Default: '#000'. */
  color?: string;
  /** Cursor width in px. Default: 1. */
  width?: number;
  /** Cursor height relative to baseline. If undefined, uses the line's ascent + descent. */
  height?: number;
}

// ── Style helpers ────────────────────────────────────────────────────────

/**
 * Resolve font weight to a numeric CSS value.
 * Mirrors SVGRenderer's fontWeightNumeric for consistency.
 */
function fontWeightNumeric(weight: string | number): number {
  if (weight === 'bold') return 700;
  if (weight === 'normal') return 400;
  if (typeof weight === 'number') return weight;
  return 400;
}

/**
 * Resolve font style to CSS value.
 */
function fontStyleCSS(style: string): string {
  return style === 'italic' ? 'italic' : 'normal';
}

/**
 * Build the CSS font string for Canvas 2D context.
 * Matches format: `[font-style] [font-weight] [font-size]px [font-family]`
 */
function buildFontString(span: Span): string {
  const style = fontStyleCSS(span.style.fontStyle);
  const weight = fontWeightNumeric(span.style.fontWeight);
  const size = span.fontMetrics.fontSize;
  const family = span.style.fontFamily;
  return `${style} ${weight} ${size}px ${family}`;
}

// ── Text rendering ──────────────────────────────────────────────────────

/**
 * Group spans within a line by their baseline offset (for sub/superscript).
 *
 * SVG expanded mode (SVGRenderer.ts lines 896-960) groups spans by targetY
 * so sub/superscript gets a separate <text> element at the correct y.
 * We mirror that here: each group gets drawn with its own ctx.save/restore.
 */
interface SpanRenderGroup {
  targetY: number;
  spans: Span[];
}

function groupSpansByBaseline(line: Line, spans: Span[]): SpanRenderGroup[] {
  const groups: SpanRenderGroup[] = [];
  for (const span of spans) {
    if (!span.text) continue;
    const offset = span.fontMetrics.baselineOffset || 0;
    const targetY = Math.round((line.y + line.baseline + offset) * 100) / 100;
    const last = groups[groups.length - 1];
    if (last && last.targetY === targetY) {
      last.spans.push(span);
    } else {
      groups.push({ targetY, spans: [span] });
    }
  }
  return groups;
}

/**
 * Draw background rect for a span (used for code blocks, highlights).
 */
function drawSpanBackground(
  ctx: CanvasRenderingContext2D,
  line: Line,
  span: Span,
): void {
  const baselineY = line.y + line.baseline;
  const x = line.x + span.x;
  const y = baselineY - span.fontMetrics.ascent;
  const w = span.width;
  const h = span.fontMetrics.ascent + span.fontMetrics.descent;

  ctx.fillStyle = span.style.backgroundColor || 'transparent';
  if (span.style.backgroundColor) {
    ctx.fillRect(x, y, w, h);
  }
}

/**
 * Render a single span at the given baseline Y.
 */
function renderSpan(
  ctx: CanvasRenderingContext2D,
  line: Line,
  span: Span,
  baselineY: number,
  preserveSpaces: boolean,
): void {
  const x = line.x + span.x;

  // ── Background ────────────────────────────────────────────────────
  drawSpanBackground(ctx, line, span);

  // ── Font setting ──────────────────────────────────────────────────
  ctx.font = buildFontString(span);
  ctx.fillStyle = span.style.color || '#000000';
  ctx.textBaseline = 'alphabetic';

  // ── Letter spacing ────────────────────────────────────────────────
  const ls = span.style.letterSpacing;
  if (ls !== undefined && ls !== 0) {
    ctx.letterSpacing = `${ls}px`;
  } else {
    ctx.letterSpacing = 'normal';
  }

  // ── Draw text ────────────────────────────────────────────────────
  if (preserveSpaces || span.type !== 'space') {
    ctx.fillText(span.text, x, baselineY);
  }

  // ── Reset letter spacing ──────────────────────────────────────────
  ctx.letterSpacing = 'normal';

  // ── Underline ────────────────────────────────────────────────────
  if (span.style.underline) {
    const ulY = baselineY + 2;
    ctx.strokeStyle = span.style.color || '#000000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, ulY);
    ctx.lineTo(x + span.width, ulY);
    ctx.stroke();
  }

  // ── Strikethrough ────────────────────────────────────────────────
  if (span.style.strikethrough) {
    const stY = baselineY - span.fontMetrics.ascent * 0.4;
    ctx.strokeStyle = span.style.color || '#000000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, stY);
    ctx.lineTo(x + span.width, stY);
    ctx.stroke();
  }

  // ── InlineWidget (simple rectangle) ──────────────────────────────
  if (span.inlineWidget) {
    const iw = span.inlineWidget;
    const iwY = baselineY - (iw.height || span.fontMetrics.ascent) + (iw.baselineOffset || 0);
    ctx.fillStyle = '#cccccc';
    ctx.fillRect(x, iwY, iw.width, iw.height);
  }
}

/**
 * Render Line[] array to Canvas.
 *
 * @param ctx — Canvas 2D rendering context
 * @param lines — ready Line[] with absolute coordinates
 * @param options — rendering options
 */
export function renderToCanvas(
  ctx: CanvasRenderingContext2D | any,
  lines: Line[],
  options: CanvasRenderOptions = {},
): void {
  const sizing = options.sizing ?? 'frame';
  const preserveSpaces = options.preserveSpaces ?? false;

  // ── Sizing: content mode resizes canvas ──────────────────────────
  let canvasWidth: number;
  let canvasHeight: number;

  if (sizing === 'content') {
    const bbox = computeBBox(lines);
    canvasWidth = bbox.width;
    canvasHeight = bbox.height;
    ctx.canvas.width = canvasWidth;
    ctx.canvas.height = canvasHeight;
  } else {
    canvasWidth = ctx.canvas.width;
    canvasHeight = ctx.canvas.height;
  }

  // ── Background ───────────────────────────────────────────────────
  if (options.backgroundColor) {
    ctx.fillStyle = options.backgroundColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  } else {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  }

  // ── Render lines with baselineOffset support ──────────────────────
  // SVG expanded mode groups spans by targetY (accounts for sub/superscript
  // baselineOffset). We do the same here: each group gets its own y coordinate.
  for (const line of lines) {
    // Collect all non-space spans that should be drawn
    const drawableSpans = line.spans.filter(
      s => preserveSpaces || s.type !== 'space',
    );
    if (drawableSpans.length === 0) continue;

    // Group by baseline offset (same logic as SVGRenderer expanded mode)
    const groups = groupSpansByBaseline(line, drawableSpans);

    for (const group of groups) {
      for (const span of group.spans) {
        renderSpan(ctx, line, span, group.targetY, preserveSpaces);
      }
    }
  }

  // Debug overlay
  if (options.debug) {
    renderDebugToCanvas(ctx, lines, canvasWidth, canvasHeight, options.debug);
  }
}

// ── Debug overlay ────────────────────────────────────────────────────

/**
 * Draw debug overlays on Canvas.
 *
 * Mirrors SVGRenderer's renderDebugToSVG (lines 658-814) but draws
 * directly on Canvas 2D instead of generating SVG markup.
 *
 * Supported flags:
 *   frameBox / frame   — frame container bounding box (blue dashed)
 *   contentBox         — content bounding box (pink dotted)
 *   paragraphBox       — per-paragraph colored boxes (requires groupLinesByParagraph)
 *   columnBox          — column separators for multi-column layout
 *   box                — line box outlines (red)
 *   baseline           — baseline line (blue)
 *   ascentDescent      — ascent/descent lines (green dashed)
 *   lineGap            — line height fill (blue transparent)
 *   labels             — coordinate labels
 *   runs               — span bounding boxes (purple)
 */
export function renderDebugToCanvas(
  ctx: CanvasRenderingContext2D,
  lines: Line[],
  _width: number,
  _height: number,
  flags: DebugFlags,
): void {
  ctx.save();

  const sw = flags.widthBorder ?? 1;
  const hasBBox = lines.length > 0;
  const bbox = hasBBox ? computeBBox(lines) : null;

  // ── Frame container bounding box (SVG: line 671) ────────────────
  if ((flags.frameBox || flags.frame) && hasBBox) {
    const first = lines[0];
    const last = lines[lines.length - 1];
    const maxW = Math.max(...lines.map(l => l.x + l.width));
    const frameX = first.x;
    const frameY = first.y;
    const frameW = maxW - frameX;
    const frameH = last.y + last.height - first.y;

    ctx.strokeStyle = 'rgba(0,140,255,0.8)';
    ctx.lineWidth = sw;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(frameX, frameY, frameW, frameH);
    ctx.setLineDash([]);

    if (flags.labels && bbox) {
      ctx.font = '10px monospace';
      ctx.fillStyle = 'rgba(0,140,255,0.9)';
      ctx.textBaseline = 'top';
      ctx.fillText(`frame ${frameW.toFixed(0)}×${frameH.toFixed(0)}`, 4, 4);
    }
  }

  // ── Content bounding box (SVG: line 684) ────────────────────────
  if (flags.contentBox && bbox) {
    ctx.strokeStyle = 'rgba(255,60,140,0.8)';
    ctx.lineWidth = sw;
    ctx.setLineDash([1, 2]);
    ctx.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height);
    ctx.setLineDash([]);

    if (flags.labels) {
      const labelY = bbox.y + bbox.height + 4;
      ctx.font = '10px monospace';
      ctx.fillStyle = 'rgba(255,60,140,0.9)';
      ctx.textBaseline = 'top';
      ctx.fillText(`content ${bbox.width.toFixed(0)}×${bbox.height.toFixed(0)}`, bbox.x, labelY);
    }
  }

  // ── Overflow warning (SVG: line 699) ────────────────────────────
  if (flags.contentBox && bbox && _width > 0 && _height > 0) {
    const overflowX = bbox.width > _width;
    const overflowY = bbox.height > _height;
    if (overflowX || overflowY) {
      ctx.font = '10px monospace';
      ctx.fillStyle = 'rgba(220,0,0,0.9)';
      ctx.textBaseline = 'top';
      const warnParts: string[] = [];
      if (overflowX) warnParts.push(`Δx=${(bbox.width - _width).toFixed(0)}`);
      if (overflowY) warnParts.push(`Δy=${(bbox.height - _height).toFixed(0)}`);
      ctx.fillText(`⚠ content overflow: ${warnParts.join(' ')}`, 4, _height + 4);
    }
  }

  // ── Per-line debug overlays (SVG: line 783) ─────────────────────
  for (const line of lines) {
    const bx = line.x;
    const by = line.y;
    const bw = line.width;
    const bh = line.height;
    const baselineY = line.y + line.baseline;

    // Line gap — blue filled rect for lineHeight visualization (SVG: line 787)
    if (flags.lineGap) {
      ctx.fillStyle = 'rgba(0,150,255,0.10)';
      ctx.fillRect(bx, by, bw, bh);
    }

    // Bounding box — red rect (SVG: line 790)
    if (flags.box) {
      ctx.strokeStyle = 'rgba(255,100,100,0.5)';
      ctx.lineWidth = sw;
      ctx.strokeRect(bx, by, bw, bh);
    }

    // Baseline — blue line (SVG: line 793)
    if (flags.baseline) {
      ctx.strokeStyle = 'rgba(100,100,255,0.5)';
      ctx.lineWidth = sw;
      ctx.beginPath();
      ctx.moveTo(bx, baselineY);
      ctx.lineTo(bx + bw, baselineY);
      ctx.stroke();
    }

    // Ascent / Descent — green dashed lines (SVG: line 796)
    if (flags.ascentDescent) {
      const ascentY = baselineY - line.ascent;
      const descentY = baselineY + line.descent;
      ctx.strokeStyle = 'rgba(100,255,100,0.4)';
      ctx.lineWidth = sw;
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      ctx.moveTo(bx, ascentY);
      ctx.lineTo(bx + bw, ascentY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx, descentY);
      ctx.lineTo(bx + bw, descentY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Labels — small monospace text (SVG: line 800)
    if (flags.labels) {
      const labelY = by - 2;
      const label = `y=${by.toFixed(1)} x=${bx.toFixed(1)} w=${bw.toFixed(1)} h=${bh.toFixed(1)} bl=${baselineY.toFixed(1)}`;
      ctx.font = '9px monospace';
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.textBaseline = 'bottom';
      ctx.fillText(label, bx, labelY);
    }

    // Run boxes — purple rects around Spans (SVG: line 803)
    if (flags.runs) {
      for (const span of line.spans) {
        if (span.width <= 0) continue;
        const rx = line.x + span.x;
        const ry = baselineY - span.fontMetrics.ascent;
        const rw = span.width;
        const rh = span.fontMetrics.ascent + span.fontMetrics.descent;
        ctx.strokeStyle = 'rgba(200,100,255,0.4)';
        ctx.lineWidth = sw;
        ctx.strokeRect(rx, ry, rw, rh);
      }
    }
  }

  ctx.restore();
}

// ── Selection layer ──────────────────────────────────────────────────

/**
 * Render a text selection highlight overlay.
 *
 * Draws a semi-transparent blue rectangle for each character
 * in the range [start, end). Supports cross-line selections.
 *
 * If `start` and `end` are in different lines, the full width
 * of intermediate lines is highlighted.
 *
 * @param ctx — Canvas 2D rendering context
 * @param lines — layout lines
 * @param start — selection start position (inclusive)
 * @param end — selection end position (exclusive)
 * @param color — highlight color. Default: 'rgba(100, 150, 255, 0.3)'
 */
export function renderSelection(
  ctx: CanvasRenderingContext2D,
  lines: Line[],
  start: CharPos,
  end: CharPos,
  color: string = 'rgba(100, 150, 255, 0.3)',
): void {
  ctx.save();
  ctx.fillStyle = color;

  const liMin = Math.min(start.lineIndex, end.lineIndex);
  const liMax = Math.max(start.lineIndex, end.lineIndex);

  for (let li = liMin; li <= liMax; li++) {
    const line = lines[li];
    if (!line) continue;

    const baselineY = line.y + line.baseline;

    // Determine X range for this line
    let xStart: number;
    let xEnd: number;

    if (li === liMin && li === liMax) {
      // Selection within single line
      xStart = Math.min(start.x, end.x);
      xEnd = Math.max(start.x, end.x);
      // If end has zero width (end-of-line), use the last span's right edge
      if (xEnd === xStart) {
        // Extend to the full line width if cursor is at the very end
        const spansEnd = line.x + line.spans[line.spans.length - 1].x +
          line.spans[line.spans.length - 1].width;
        xEnd = spansEnd;
      }
    } else if (li === liMin) {
      // Start line: from start.x to end of line
      xStart = start.x;
      // Compute the end of this line (right edge of last span)
      const lastSpan = line.spans[line.spans.length - 1];
      xEnd = line.x + lastSpan.x + lastSpan.width;
    } else if (li === liMax) {
      // End line: from start of line to end.x
      xStart = line.x;
      xEnd = end.x;
    } else {
      // Full line highlight
      xStart = line.x;
      const lastSpan = line.spans[line.spans.length - 1];
      xEnd = line.x + lastSpan.x + lastSpan.width;
    }

    const y = baselineY - line.ascent;
    const h = line.ascent + line.descent;
    const w = xEnd - xStart;

    if (w > 0) {
      ctx.fillRect(xStart, y, w, h);
    }
  }

  ctx.restore();
}

// ── Cursor layer ─────────────────────────────────────────────────────

/**
 * Render a text cursor (caret) at the given character position.
 *
 * Draws a vertical line at the character's left edge.
 * The caller is responsible for cursor blink timing.
 *
 * @param ctx — Canvas 2D rendering context
 * @param lines — layout lines
 * @param pos — cursor position (character left edge)
 * @param options — cursor visual options
 */
export function renderCursor(
  ctx: CanvasRenderingContext2D,
  lines: Line[],
  pos: CharPos,
  options: CursorOptions = {},
): void {
  const color = options.color ?? '#000';
  const width = options.width ?? 1;

  ctx.save();

  // Determine cursor height
  let cursorHeight: number;
  if (options.height !== undefined) {
    cursorHeight = options.height;
  } else {
    // Use the line's ascent + descent for the cursor height
    const line = lines[pos.lineIndex];
    cursorHeight = line.ascent + line.descent;
  }

  const topY = pos.y - (options.height !== undefined ? options.height : lines[pos.lineIndex].ascent);

  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(pos.x, topY);
  ctx.lineTo(pos.x, topY + cursorHeight);
  ctx.stroke();

  ctx.restore();
}