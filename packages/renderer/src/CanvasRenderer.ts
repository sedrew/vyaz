/**
 * CanvasRenderer.ts — render LineBox[] → Canvas.
 *
 * Takes ready LineBox[] with absolute coordinates.
 * Does not compute anything — only draws (dumb drawer principle).
 *
 * Options:
 *   - sizing: 'frame' | 'content' — auto canvas size
 *   - preserveSpaces: boolean — draw spaces (instead of skip)
 *   - backgroundColor: string — background color
 *   - debug: DebugFlags — debug overlays
 */

import type { LineBox, FragmentBox } from '@vyaz/core';
import type { DebugFlags } from './types.js';
import { computeBBox } from './utils.js';

export interface CanvasRenderOptions {
  /**
   * How the canvas size is determined:
   *   'frame'   — use current ctx.canvas.width/height (default)
   *   'content' — compute bounding box from lines, resize canvas to fit
   */
  sizing?: 'frame' | 'content';
  /**
   * When true: render space fragments with a space character.
   * When false (default): skip space fragments (position is already accounted for in x).
   */
  preserveSpaces?: boolean;
  /** Background color for clearing. If omitted, canvas is cleared transparent. */
  backgroundColor?: string;
  /** Debug overlay flags. */
  debug?: DebugFlags;
}

/** Font weight to CSS value */
function fontWeightCSS(weight: string | number): string {
  if (weight === 'bold') return 'bold';
  if (weight === 'normal') return 'normal';
  if (typeof weight === 'number') return String(weight);
  return 'normal';
}

/** Font style to CSS value */
function fontStyleCSS(style: string): string {
  return style === 'italic' ? 'italic' : 'normal';
}

/**
 * Render LineBox[] array to Canvas.
 *
 * @param ctx — Canvas 2D rendering context
 * @param lines — ready LineBox[] with absolute coordinates
 * @param options — rendering options
 */
export function renderToCanvas(
  ctx: CanvasRenderingContext2D | any,
  lines: LineBox[],
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

  // ── Render lines ─────────────────────────────────────────────────
  for (const line of lines) {
    const baselineY = line.y + line.baseline;

    for (const frag of line.fragments) {
      const x = line.x + frag.x;

      // Font setting
      const style = fontStyleCSS(frag.style.fontStyle);
      const weight = fontWeightCSS(frag.style.fontWeight);
      const size = frag.fontMetrics.fontSize;
      const family = frag.style.fontFamily;
      ctx.font = `${style} ${weight} ${size}px ${family}`;
      ctx.fillStyle = frag.style.color || '#000000';
      ctx.textBaseline = 'alphabetic';

      // Draw text
      if (preserveSpaces || frag.type !== 'space') {
        ctx.fillText(frag.text, x, baselineY);
      }

      // Underline
      if (frag.style.underline) {
        const ulY = baselineY + 2;
        ctx.strokeStyle = frag.style.color || '#000000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, ulY);
        ctx.lineTo(x + frag.width, ulY);
        ctx.stroke();
      }

      // Strikethrough
      if (frag.style.strikethrough) {
        const stY = baselineY - frag.fontMetrics.ascent * 0.4;
        ctx.strokeStyle = frag.style.color || '#000000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, stY);
        ctx.lineTo(x + frag.width, stY);
        ctx.stroke();
      }

      // InlineWidget (simple rectangle)
      if (frag.inlineWidget) {
        const iw = frag.inlineWidget;
        const iwY = baselineY - (iw.height || frag.fontMetrics.ascent) + (iw.baselineOffset || 0);
        ctx.fillStyle = '#cccccc';
        ctx.fillRect(x, iwY, iw.width, iw.height);
      }
    }
  }

  // Debug overlay
  if (options.debug) {
    renderDebugToCanvas(ctx, lines, canvasWidth, canvasHeight, options.debug);
  }
}

// ── Debug overlay ────────────────────────────────────────────────────

/** Draw debug overlays on canvas */
export function renderDebugToCanvas(
  ctx: CanvasRenderingContext2D,
  lines: LineBox[],
  _width: number,
  _height: number,
  flags: DebugFlags,
): void {
  ctx.save();

  // Text frame — outer bounding box of all lines
  if (flags.frame && lines.length > 0) {
    const first = lines[0];
    const last = lines[lines.length - 1];
    const maxW = Math.max(...lines.map(l => l.x + l.width));
    const frameX = first.x;
    const frameY = first.y;
    const frameW = maxW - frameX;
    const frameH = last.y + last.height - first.y;
    ctx.strokeStyle = 'rgba(255,200,0,0.6)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 2]);
    ctx.strokeRect(frameX, frameY, frameW, frameH);
  }

  ctx.setLineDash([]);

  for (const line of lines) {
    const bx = line.x;
    const by = line.y;
    const bw = line.width;
    const bh = line.height;
    const baselineY = line.y + line.baseline;

    // Line gap — blue filled rect for lineHeight visualization
    if (flags.lineGap) {
      ctx.fillStyle = 'rgba(0,150,255,0.10)';
      ctx.fillRect(bx, by, bw, bh);
    }

    // Bounding box — red rect
    if (flags.box) {
      ctx.strokeStyle = 'rgba(255,100,100,0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, bw, bh);
    }

    // Baseline — blue line
    if (flags.baseline) {
      ctx.strokeStyle = 'rgba(100,100,255,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bx, baselineY);
      ctx.lineTo(bx + bw, baselineY);
      ctx.stroke();
    }

    // Ascent / Descent — green dashed lines
    if (flags.ascentDescent) {
      const ascentY = baselineY - line.ascent;
      const descentY = baselineY + line.descent;
      ctx.strokeStyle = 'rgba(100,255,100,0.4)';
      ctx.lineWidth = 0.5;
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

    // Labels — small monospace text
    if (flags.labels) {
      const labelY = by - 2;
      const label = `y=${by.toFixed(1)} x=${bx.toFixed(1)} w=${bw.toFixed(1)} h=${bh.toFixed(1)} bl=${baselineY.toFixed(1)}`;
      ctx.font = '9px monospace';
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.textBaseline = 'bottom';
      ctx.fillText(label, bx, labelY);
    }

    // Run boxes — purple rects around FragmentBox
    if (flags.runs) {
      for (const frag of line.fragments) {
        if (frag.width <= 0) continue;
        const rx = line.x + frag.x;
        const ry = baselineY - frag.fontMetrics.ascent;
        const rw = frag.width;
        const rh = frag.fontMetrics.ascent + frag.fontMetrics.descent;
        ctx.strokeStyle = 'rgba(200,100,255,0.4)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(rx, ry, rw, rh);
      }
    }
  }

  ctx.restore();
}