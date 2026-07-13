/**
 * SVGRenderer.ts — SVG text builder.
 *
 * Converts Line[] into SVG markup using a builder pattern.
 *
 * Four presets:
 *   flat     — all text in one <text> element, xml:space="preserve", no <tspan>
 *   browser  — expanded <tspan> per run, xml:space="preserve", diff attributes, no textLength
 *   preserve — expanded <tspan> per run, xml:space="preserve", diff attributes, textLength
 *   glyph    — <tspan> per glyph with per-character x positions, xml:space="preserve"
 *
 * All presets preserve whitespace via xml:space="preserve". Space spans (type: 'space')
 * are rendered as separate <tspan> elements with explicit x coordinates.
 *
 * Usage:
 *   const svg = renderToSVG(lines, { preset: 'browser' })
 *   const svg = renderToSVG(lines, { preset: 'preserve', style: 'css', fit: 'frag' })
 */

import type { Line, Span, ParagraphLayoutResult } from '@vyaz/core';
import type { DebugFlags } from './types.js';
import { computeBBox, fmt } from './utils.js';

// ── Types ────────────────────────────────────────────────────────────────

export type SvgPreset = 'flat' | 'browser' | 'preserve' | 'glyph';

export type SvgStyle = 'css' | 'xml';

export type SvgFit = 'none' | 'text' | 'frag';

export type SvgSizing = 'frame' | 'content';

export type PerAxisSizing = { horizontal: SvgSizing; vertical: SvgSizing };

export interface SVGRenderOptions {
  /** Shorthand that sets structure + spacing at once. */
  preset?: SvgPreset;
  /** How style properties are expressed: as CSS `style` attribute or as XML presentation attributes. */
  style?: SvgStyle;
  /** How `textLength` is applied. */
  fit?: SvgFit;
  /**
   * How SVG determines its canvas size.
   * Single string: applies to both axes. Object: per-axis control.
   * 'frame' — use explicit width/height from options.
   * 'content' — compute from lines bounding box.
   */
  sizing?: SvgSizing | PerAxisSizing;
  /** SVG canvas width (px). Used when horizontal sizing='frame' or as fallback. */
  width?: number;
  /** SVG canvas height (px). Used when vertical sizing='frame' or as fallback. */
  height?: number;
  /** CSS class for `<svg>`. */
  className?: string;
  /**
   * Extra padding added around the SVG canvas. Content coordinates stay unchanged;
   * the SVG viewBox is shifted and canvas is enlarged so debug overlays
   * (frameBox / contentBox) are visible with a gap from the edge.
   * Useful for snapshot tests to clearly show frame vs content boundaries.
   */
  contentPadding?: number;
  /** Debug overlays. */
  debug?: DebugFlags;
}

type SpacingMode = 'browser' | 'preserve';
type StructureMode = 'flat' | 'expanded' | 'glyph';

type ResolvedOptions = {
  structure: StructureMode;
  spacing: SpacingMode;
  style: 'css' | 'xml';
  fit: 'none' | 'text' | 'frag';
  sizingHorizontal: 'frame' | 'content';
  sizingVertical: 'frame' | 'content';
  width?: number;
  height?: number;
  className?: string;
  contentPadding: number;
  debug?: DebugFlags;
};

// ── Preset map ───────────────────────────────────────────────────────────

const PRESETS: Record<SvgPreset, { structure: StructureMode; spacing: SpacingMode; defaultFit: SvgFit }> = {
  flat:     { structure: 'flat',     spacing: 'preserve', defaultFit: 'none' },
  browser:  { structure: 'expanded', spacing: 'preserve', defaultFit: 'none' },
  preserve: { structure: 'expanded', spacing: 'preserve', defaultFit: 'frag' },
  glyph:    { structure: 'glyph',    spacing: 'preserve', defaultFit: 'none' },
};

// ── Helpers ──────────────────────────────────────────────────────────────

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&#38;')
    .replace(/</g, '&#60;')
    .replace(/>/g, '&#62;')
    .replace(/"/g, '&#34;');
}

function fontWeightCSS(weight: string | number): string {
  if (weight === 'bold') return 'bold';
  if (weight === 'normal') return '400';
  if (typeof weight === 'number') return String(weight);
  return '400';
}

function fontWeightNumeric(weight: string | number): number {
  if (weight === 'bold') return 700;
  if (weight === 'normal') return 400;
  if (typeof weight === 'number') return weight;
  return 400;
}

function colorToRGB(color: string): string {
  if (!color) return 'rgb(0, 0, 0)';
  if (color[0] !== '#') return color;

  let hex = color;
  if (hex.length === 4) {
    hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  if (hex.length === 7) {
    return `rgb(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)})`;
  }
  if (hex.length === 9) {
    const a = parseInt(hex.slice(7, 9), 16) / 255;
    return `rgba(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)}, ${a.toFixed(3)})`;
  }
  return color;
}

/** Compute gutter widths per line for justify alignment */
function computeGutterWidths(line: Line, totalSlack: number): number[] {
  const spaceSpans = line.spans.filter(f => f.type === 'space' || f.text.trim() === '');
  if (spaceSpans.length === 0) return [];
  const perGap = totalSlack / spaceSpans.length;
  return line.spans.map(f => (f.type === 'space' || f.text.trim() === '') ? perGap : 0);
}

// ── Resolve options ──────────────────────────────────────────────────────

function resolveOptions(opts: SVGRenderOptions): ResolvedOptions {
  let structure: StructureMode;
  let spacing: SpacingMode;
  let defaultFit: SvgFit;

  if (opts.preset) {
    const preset = PRESETS[opts.preset];
    if (!preset) {
      console.warn(`SVGRenderer: unknown preset "${opts.preset}", falling back to browser`);
      structure = 'expanded';
      spacing = 'browser';
      defaultFit = 'none';
    } else {
      structure = preset.structure;
      spacing = preset.spacing;
      defaultFit = preset.defaultFit;
    }
  } else {
    structure = 'expanded';
    spacing = 'browser';
    defaultFit = 'none';
  }

  const style = opts.style ?? 'xml';
  let fit = opts.fit ?? defaultFit;

  // Normalize per-axis sizing
  let sizingHorizontal: 'frame' | 'content';
  let sizingVertical: 'frame' | 'content';

  if (typeof opts.sizing === 'object' && opts.sizing !== null) {
    sizingHorizontal = opts.sizing.horizontal ?? 'frame';
    sizingVertical = opts.sizing.vertical ?? 'frame';
  } else {
    const s = opts.sizing ?? 'frame';
    sizingHorizontal = s;
    sizingVertical = s;
  }

  // Validation rules
  if (structure === 'glyph' && fit !== 'none') {
    console.warn(`SVGRenderer: fit="${fit}" is ignored when structure="glyph"`);
    fit = 'none';
  }
  if (structure === 'flat' && fit === 'frag') {
    console.warn(`SVGRenderer: fit="frag" downgraded to "text" when structure="flat"`);
    fit = 'text';
  }

  return { structure, spacing, style, fit, sizingHorizontal, sizingVertical, width: opts.width, height: opts.height, className: opts.className, contentPadding: opts.contentPadding ?? 0, debug: opts.debug };
}

/**
 * Resolve final SVG canvas width/height + viewBox.
 *
 * When either axis uses 'content' sizing, computes the BBox from lines.
 */
function resolveSize(lines: Line[], opts: ResolvedOptions): { width: number; height: number; viewBox: { x: number; y: number; w: number; h: number }; frameWidth?: number; frameHeight?: number } {
  const needsBBox = opts.sizingHorizontal === 'content' || opts.sizingVertical === 'content';
  const bbox = needsBBox ? computeBBox(lines) : null;

  // Original frame dimensions (from user options) — used for frameBox overlay.
  // Only set when the user explicitly provided a value, regardless of sizing mode.
  // (sizing='frame' uses opts.width/height; sizing='content' may also have a frame value
  //  passed explicitly for frameBox purposes.)
  const frameWidth = opts.width;
  const frameHeight = opts.height;

  let width: number;
  let height: number;

  if (opts.sizingHorizontal === 'content') {
    width = bbox!.width;
  } else {
    if (opts.width === undefined) {
      throw new Error(
        `renderToSVG: horizontal sizing="frame" requires explicit width. ` +
        `Got width=${opts.width}.`
      );
    }
    width = opts.width;
  }

  if (opts.sizingVertical === 'content') {
    height = bbox!.height;
  } else {
    if (opts.height === undefined) {
      throw new Error(
        `renderToSVG: vertical sizing="frame" requires explicit height. ` +
        `Got height=${opts.height}.`
      );
    }
    height = opts.height;
  }

  // viewBox: always derived from the actual content bbox when content-sized,
  // otherwise full frame
  let viewBox: { x: number; y: number; w: number; h: number };
  if (bbox) {
    viewBox = { x: bbox.x, y: bbox.y, w: bbox.width, h: bbox.height };
  } else {
    viewBox = { x: 0, y: 0, w: width, h: height };
  }

  // Apply contentPadding: enlarge canvas and shift viewBox so padded area is visible
  const pad = opts.contentPadding || 0;
  if (pad > 0) {
    width += pad * 2;
    height += pad * 2;
    viewBox = {
      x: viewBox.x - pad,
      y: viewBox.y - pad,
      w: viewBox.w + pad * 2,
      h: viewBox.h + pad * 2,
    };
  }

  return { width, height, viewBox, frameWidth, frameHeight };
}

// ── Attribute builders ───────────────────────────────────────────────────

interface StyleState {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  fontStyle: string;
  decoration: string;
}

function defaultStyleState(span: Span): StyleState {
  const decorations: string[] = [];
  if (span.style.underline) decorations.push('underline');
  if (span.style.strikethrough) decorations.push('line-through');

  return {
    fontFamily: span.style.fontFamily || 'Arial',
    fontSize: span.fontMetrics.fontSize || 16,
    fontWeight: fontWeightNumeric(span.style.fontWeight),
    color: span.style.color || '#000000',
    fontStyle: span.style.fontStyle || 'normal',
    decoration: decorations.join(' '),
  };
}

function equalStyle(a: StyleState, b: StyleState): boolean {
  return a.fontFamily === b.fontFamily && a.fontSize === b.fontSize &&
    a.fontWeight === b.fontWeight && a.color === b.color &&
    a.fontStyle === b.fontStyle && a.decoration === b.decoration;
}

/** Build style string for CSS mode */
function cssStyleString(s: StyleState): string {
  const parts: string[] = [];
  parts.push(`font-family: '${s.fontFamily}', sans-serif`);
  parts.push(`font-size: ${fmt(s.fontSize)}px`);
  parts.push(`fill: ${colorToRGB(s.color)}`);
  if (s.fontWeight !== 400) parts.push(`font-weight: ${s.fontWeight}`);
  if (s.fontStyle === 'italic') parts.push(`font-style: italic`);
  if (s.decoration) parts.push(`text-decoration: ${s.decoration}`);
  return parts.join('; ');
}

/** Build XML presentation attributes for a style */
function xmlStyleAttrs(s: StyleState): string {
  let attrs = `font-family="${s.fontFamily}" font-size="${fmt(s.fontSize)}" fill="${s.color}" font-weight="${s.fontWeight}"`;
  if (s.fontStyle === 'italic') attrs += ' font-style="italic"';
  if (s.decoration) attrs += ` text-decoration="${s.decoration}"`;
  return attrs;
}

/** Build attributes for <text> element */
function buildTextAttrs(line: Line, span: Span, opts: ResolvedOptions, runId?: string): string {
  const x = line.x;
  const y = line.y + line.baseline;
  const s = defaultStyleState(span);

  let attrs = ` x="${fmt(x)}" y="${fmt(y)}"`;
  if (runId) attrs += ` id="${runId}"`;

  if (opts.style === 'css') {
    let css = cssStyleString(s);
    if (opts.spacing === 'preserve') css += '; white-space: pre';
    attrs += ` style="${css}"`;
  } else {
    attrs += ` ${xmlStyleAttrs(s)}`;
    if (opts.spacing === 'preserve') attrs += ' xml:space="preserve"';
  }

  // text-anchor is only meaningful for flat mode where text sits directly in <text>.
  // For expanded/glyph modes, each <tspan> has explicit x="..." coordinates that already
  // account for alignment — text-anchor on <text> would then double-shift the text.
  if (opts.structure === 'flat') {
    const anchor = line.alignment === 'center' ? 'middle' : line.alignment === 'right' ? 'end' : 'start';
    if (anchor !== 'start') attrs += ` text-anchor="${anchor}"`;
  }

  return attrs;
}

/** Build attributes for <tspan> (expanded mode — only diff from current style) */
function buildTspanAttrs(span: Span, x: number, currentStyle: StyleState | null): { attrs: string; newStyle: StyleState } {
  const s = defaultStyleState(span);
  let attrs = ` x="${fmt(x)}"`;

  if (currentStyle && equalStyle(s, currentStyle)) {
    return { attrs, newStyle: s };
  }

  // textLength is NOT added here — it is handled by buildFragFitAttr() separately
  // to avoid duplicate textLength when fit='frag'.

  if (!currentStyle || s.fontWeight !== currentStyle.fontWeight) attrs += ` font-weight="${s.fontWeight}"`;
  if (!currentStyle || s.fontStyle !== currentStyle.fontStyle) attrs += ` font-style="${s.fontStyle}"`;
  if (!currentStyle || s.fontFamily !== currentStyle.fontFamily) attrs += ` font-family="${s.fontFamily}"`;
  if (!currentStyle || s.fontSize !== currentStyle.fontSize) attrs += ` font-size="${fmt(s.fontSize)}"`;
  if (!currentStyle || s.color !== currentStyle.color) attrs += ` fill="${s.color}"`;
  if (!currentStyle || s.decoration !== currentStyle.decoration) {
    if (s.decoration) attrs += ` text-decoration="${s.decoration}"`;
  }

  return { attrs, newStyle: s };
}

/** Build per-glyph x positions for glyph mode */
function buildGlyphPositions(span: Span, _lineX: number): string {
  if (!span.glyphAdvances || span.glyphAdvances.length === 0) {
    return '';
  }
  // span.x is already absolute — computed by PositioningEngine.
  // lineX is NOT added because that would double-shift.
  const spanX = span.x;
  let xPos = spanX;
  const positions: string[] = [fmt(xPos, 1)];
  for (let i = 0; i < span.glyphAdvances.length - 1; i++) {
    xPos += span.glyphAdvances[i];
    positions.push(fmt(xPos, 1));
  }
  return positions.join(' ');
}

/** Build textLength attribute for a line */
function buildFitAttr(line: Line, opts: ResolvedOptions): string {
  if (opts.fit === 'text') {
    return ` textLength="${fmt(line.width)}" lengthAdjust="spacing"`;
  }
  return '';
}

/** Build textLength for a span */
function buildSpanFitAttr(span: Span, opts: ResolvedOptions): string {
  if (opts.fit === 'frag') {
    return ` textLength="${fmt(span.width)}"`;
  }
  return '';
}

// ── SVG builder ──────────────────────────────────────────────────────────

interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

class SvgBuilder {
  private parts: string[] = [];
  private opts: ResolvedOptions;

  constructor(width: number, height: number, opts: ResolvedOptions, viewBox?: ViewBox) {
    this.opts = opts;
    const className = opts.className ? ` class="${escapeXml(opts.className)}"` : '';
    const vb = viewBox
      ? `viewBox="${fmt(viewBox.x)} ${fmt(viewBox.y)} ${fmt(viewBox.w)} ${fmt(viewBox.h)}"`
      : `viewBox="0 0 ${fmt(width)} ${fmt(height)}"`;
    this.parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(width)}" height="${fmt(height)}" ${vb}${className}>\n`);
  }

  addText(line: Line, baseSpan: Span, runId?: string, yOverride?: number, fontSizeOverride?: number): void {
    let attrs: string;
    if (yOverride !== undefined && fontSizeOverride !== undefined) {
      // For flat mode sub/superscript — override y and font-size
      const s = defaultStyleState(baseSpan);
      const x = line.x;
      attrs = ` x="${fmt(x)}" y="${fmt(yOverride)}"`;
      if (this.opts.style === 'css') {
        let css = cssStyleString(s);
        if (this.opts.spacing === 'preserve') css += '; white-space: pre';
        attrs += ` style="${css}"`;
      } else {
        let xml = ` font-family="${s.fontFamily}" font-size="${fmt(fontSizeOverride)}" fill="${s.color}" font-weight="${s.fontWeight}"`;
        if (s.fontStyle === 'italic') xml += ' font-style="italic"';
        if (s.decoration) xml += ` text-decoration="${s.decoration}"`;
        if (this.opts.spacing === 'preserve') xml += ' xml:space="preserve"';
        attrs += xml;
      }
    } else {
      attrs = buildTextAttrs(line, baseSpan, this.opts, runId);
    }
    const fit = buildFitAttr(line, this.opts);
    this.parts.push(`  <text${attrs}${fit}>\n`);
  }

  addFlatSpan(text: string): void {
    this.parts.push(`${escapeXml(text)}`);
  }

  /** Write a raw SVG line (for flat mode where each span is its own <text>). */
  pushLine(line: string): void {
    this.parts.push(line);
  }

  closeText(): void {
    this.parts.push('</text>\n');
  }

  addExpandedSpan(span: Span, x: number, style: StyleState | null): StyleState {
    const { attrs, newStyle } = buildTspanAttrs(span, x, style);
    const fit = buildSpanFitAttr(span, this.opts);
    this.parts.push(`    <tspan${attrs}${fit}>${escapeXml(span.text)}</tspan>\n`);
    return newStyle;
  }

  addGlyphSpan(span: Span, lineX: number): void {
    const positions = buildGlyphPositions(span, lineX);
    if (positions) {
      this.parts.push(`    <tspan x="${positions}">${escapeXml(span.text)}</tspan>\n`);
    } else {
      this.parts.push(`    <tspan>${escapeXml(span.text)}</tspan>\n`);
    }
  }


  addDebug(debugOverlay: string): void {
    if (debugOverlay) {
      this.parts.push(`<!-- debug overlay -->\n${debugOverlay}\n`);
    }
  }

  build(): string {
    this.parts.push('</svg>\n');
    return this.parts.join('');
  }
}

// ── Debug overlay ────────────────────────────────────────────────────────

function renderDebugToSVG(
  lines: Line[],
  flags: DebugFlags,
  frameSize?: { width: number; height: number },
  contentSize?: { width: number; height: number },
): string {
  const parts: string[] = [];

  // Frame container bounding box
  if ((flags.frameBox || flags.frame) && frameSize) {
    parts.push(
      `  <rect x="0" y="0" width="${fmt(frameSize.width)}" height="${fmt(frameSize.height)}"` +
      ` fill="none" stroke="rgba(0,140,255,0.8)" stroke-width="1.5" stroke-dasharray="4,3" />`,
    );
    if (flags.labels) {
      parts.push(
        `  <text x="4" y="14" font-size="10" fill="rgba(0,140,255,0.9)" font-family="monospace">frame ${fmt(frameSize.width)}×${fmt(frameSize.height)}</text>`,
      );
    }
  }

  // Content bounding box
  if (flags.contentBox) {
    const bbox = computeBBox(lines);
    parts.push(
      `  <rect x="${fmt(bbox.x)}" y="${fmt(bbox.y)}" width="${fmt(bbox.width)}" height="${fmt(bbox.height)}"` +
      ` fill="none" stroke="rgba(255,60,140,0.8)" stroke-width="1.5" stroke-dasharray="1,2" />`,
    );
    if (flags.labels) {
      const labelY = bbox.y + bbox.height + 14;
      parts.push(
        `  <text x="${fmt(bbox.x)}" y="${fmt(labelY)}" font-size="10" fill="rgba(255,60,140,0.9)" font-family="monospace">content ${fmt(bbox.width)}×${fmt(bbox.height)}</text>`,
      );
    }
  }

  // Overflow warning when content exceeds frame
  if (flags.contentBox && frameSize && contentSize && flags.labels) {
    const overflowX = contentSize.width > frameSize.width;
    const overflowY = contentSize.height > frameSize.height;
    if (overflowX || overflowY) {
      parts.push(
        `  <text x="4" y="${fmt(frameSize.height + 14)}" font-size="10" fill="rgba(220,0,0,0.9)" font-family="monospace">⚠ content overflow: ${overflowX ? `Δx=${fmt(contentSize.width - frameSize.width)} ` : ''}${overflowY ? `Δy=${fmt(contentSize.height - frameSize.height)}` : ''}</text>`,
      );
    }
  }

  for (const line of lines) {
    const bx = line.x, by = line.y, bw = line.width, bh = line.height;
    const baselineY = line.y + line.baseline;

    if (flags.lineGap) {
      parts.push(`  <rect x="${fmt(bx)}" y="${fmt(by)}" width="${fmt(bw)}" height="${fmt(bh)}" fill="rgba(0,150,255,0.10)" stroke="none" />`);
    }
    if (flags.box) {
      parts.push(`  <rect x="${fmt(bx)}" y="${fmt(by)}" width="${fmt(bw)}" height="${fmt(bh)}" fill="none" stroke="rgba(255,100,100,0.5)" stroke-width="1" />`);
    }
    if (flags.baseline) {
      parts.push(`  <line x1="${fmt(bx)}" y1="${fmt(baselineY)}" x2="${fmt(bx + bw)}" y2="${fmt(baselineY)}" stroke="rgba(100,100,255,0.5)" stroke-width="1" />`);
    }
    if (flags.ascentDescent) {
      parts.push(`  <line x1="${fmt(bx)}" y1="${fmt(baselineY - line.ascent)}" x2="${fmt(bx + bw)}" y2="${fmt(baselineY - line.ascent)}" stroke="rgba(100,255,100,0.4)" stroke-width="0.5" stroke-dasharray="3,2" />`);
      parts.push(`  <line x1="${fmt(bx)}" y1="${fmt(baselineY + line.descent)}" x2="${fmt(bx + bw)}" y2="${fmt(baselineY + line.descent)}" stroke="rgba(100,255,100,0.4)" stroke-width="0.5" stroke-dasharray="3,2" />`);
    }
    if (flags.labels) {
      parts.push(`  <text x="${fmt(bx)}" y="${fmt(by - 2)}" font-size="9" fill="rgba(0,0,0,0.55)" font-family="monospace">y=${fmt(by)} x=${fmt(bx)} w=${fmt(bw)} h=${fmt(bh)} bl=${fmt(baselineY)}</text>`);
    }
    if (flags.runs) {
      for (const span of line.spans) {
        if (span.width <= 0) continue;
        const rx = line.x + span.x;
        const ry = baselineY - span.fontMetrics.ascent;
        parts.push(`  <rect x="${fmt(rx)}" y="${fmt(ry)}" width="${fmt(span.width)}" height="${fmt(span.fontMetrics.ascent + span.fontMetrics.descent)}" fill="none" stroke="rgba(200,100,255,0.4)" stroke-width="0.5" />`);
      }
    }
  }

  return parts.join('\n');
}

// ── Main render logic ────────────────────────────────────────────────────

/**
 * Render Line[] into SVG string.
 *
 * @param lines — layout lines with spans
 * @param options — rendering options (preset + style/fit/sizing modifiers)
 * @returns SVG string
 */
export function renderToSVG(lines: Line[], options: SVGRenderOptions = {}): string {
  const opts = resolveOptions(options);

  // Determine canvas size and viewBox
  const { width: svgWidth, height: svgHeight, viewBox, frameWidth, frameHeight } = resolveSize(lines, opts);

  const builder = new SvgBuilder(svgWidth, svgHeight, opts, viewBox);

  for (const line of lines) {
    if (opts.structure === 'glyph') {
      // Per-glyph positioning with run-based <text> grouping
      let currentRunIdx = -1;
      for (const span of line.spans) {
        if (!span.text) continue;
        const runIdx = span.itemIndex;
        if (runIdx !== currentRunIdx) {
          if (currentRunIdx !== -1) {
            builder.closeText();
          }
          const runId = span.paragraphId ? `${span.paragraphId}-${runIdx}` : undefined;
          builder.addText(line, span, runId);
          currentRunIdx = runIdx;
        }
        builder.addGlyphSpan(span, line.x);
      }
      if (currentRunIdx !== -1) {
        builder.closeText();
      }
    } else if (opts.structure === 'flat') {
      // flat mode: group spans by (baseline + offset). Each group → one <text>.
      const groups: { spans: Span[]; targetY: number; fontSize: number }[] = [];
      for (const span of line.spans) {
        if (!span.text) continue;
        const offset = span.fontMetrics.baselineOffset || 0;
        const targetY = Math.round((line.y + line.baseline + offset) * 100) / 100;
        const fontSize = span.fontMetrics.fontSize;
        const last = groups[groups.length - 1];
        if (last && last.targetY === targetY && last.fontSize === fontSize) {
          last.spans.push(span);
        } else {
          groups.push({ spans: [span], targetY, fontSize });
        }
      }
      // Find the first text span's x to use as baseline offset
      const firstTextX = line.spans.find(s => s.type === 'text')?.x ?? 0;
      const fitAttr = buildFitAttr(line, opts);
      for (const group of groups) {
        const s = defaultStyleState(group.spans[0]);
        const text = group.spans.map(sp => escapeXml(sp.text)).join('');
        // line.x includes padding.left. span.x includes alignment offset but NOT padding.
        // For single-span groups: span.x = firstTextX → x = line.x (correct for padding & alignment).
        // For sub/super script: span.x differs from firstTextX → x = line.x + span.x - firstTextX.
        const groupX = line.x + (group.spans[0].x - firstTextX);
        let attrs = ` x="${fmt(groupX)}" y="${fmt(group.targetY)}" font-family="${s.fontFamily}" font-size="${fmt(group.fontSize)}" fill="${s.color}" font-weight="${s.fontWeight}"`;
        if (s.fontStyle === 'italic') attrs += ' font-style="italic"';
        if (s.decoration) attrs += ` text-decoration="${s.decoration}"`;
        attrs += ' xml:space="preserve"';
        // text-anchor for center/right alignment
        if (line.alignment === 'center') attrs += ' text-anchor="middle"';
        else if (line.alignment === 'right') attrs += ' text-anchor="end"';
        builder.pushLine(`  <text${attrs}${fitAttr}>${text}</text>\n`);
      }
    } else {
      // expanded: group spans by baseline offset (for sub/superscript).
      // Each group becomes a separate <text> element at the correct y.
      type TspanGroup = { targetY: number; spans: Span[] };
      const groups: TspanGroup[] = [];
      for (const span of line.spans) {
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

      for (const group of groups) {
        const baseSpan = group.spans.find(f => f.type === 'text' && f.text.length > 0) || group.spans[0];
        if (!baseSpan) continue;

        // Only use yOverride when the group targetY differs from the line baseline
        const lineBaseY = Math.round((line.y + line.baseline) * 100) / 100;
        const needsOffset = group.targetY !== lineBaseY;
        if (needsOffset) {
          // For offset groups (sub/superscript), override y and font-size from first span
          const s = defaultStyleState(baseSpan);
          const firstTextX = line.spans.find(s => s.type === 'text')?.x ?? 0;
          const groupX = line.x + (group.spans[0].x - firstTextX);
          const fontSize = baseSpan.fontMetrics.fontSize;
          let attrs = ` x="${fmt(groupX)}" y="${fmt(group.targetY)}" font-family="${s.fontFamily}" font-size="${fmt(fontSize)}" fill="${s.color}" font-weight="${s.fontWeight}"`;
          if (s.fontStyle === 'italic') attrs += ' font-style="italic"';
          if (s.decoration) attrs += ` text-decoration="${s.decoration}"`;
          attrs += ' xml:space="preserve"';
          const fit = buildFitAttr(line, opts);
          builder.pushLine(`  <text${attrs}${fit}>\n`);
        } else {
          builder.addText(line, baseSpan);
        }

        let currentStyle: StyleState | null = null;
        for (const span of group.spans) {
          if (!span.text) continue;
          const x = span.x;

          const shouldRender = span.type !== 'space' || opts.spacing === 'preserve';
          if (shouldRender) {
            const newStyle = builder.addExpandedSpan(span, x, currentStyle);
            if (span.type !== 'space') {
              currentStyle = newStyle;
            }
          }
        }
        builder.closeText();
      }
    }
  }

  if (opts.debug) {
    // frameSize: only when both axes are explicitly set as 'frame'
    const frameSize = frameWidth !== undefined && frameHeight !== undefined
      ? { width: frameWidth, height: frameHeight }
      : undefined;
    const contentBbox = computeBBox(lines);
    const contentSize = { width: contentBbox.width, height: contentBbox.height };
    const debugSvg = renderDebugToSVG(lines, opts.debug, frameSize, contentSize);
    builder.addDebug(debugSvg);
  }

  return builder.build();
}

/**
 * Render one ParagraphLayoutResult to SVG (convenience wrapper).
 */
export function renderParagraphToSVG(
  lines: Line[],
  paragraphWidth: number,
  paragraphHeight: number,
  options?: SVGRenderOptions,
): string {
  return renderToSVG(lines, {
    width: paragraphWidth,
    height: paragraphHeight,
    ...options,
  });
}

/**
 * Render a ParagraphLayoutResult to SVG, auto-passing dimensions.
 *
 * Uses `result.width` and `result.height` as the SVG canvas size.
 * This is the recommended way to render when you have a layout result
 * and want `sizing: 'frame'` with correct dimensions.
 *
 * @param result — layout result from ParagraphLayoutEngine.layout()
 * @param options — rendering options (preset, style, fit, etc.)
 * @returns SVG string
 *
 * @example
 * ```ts
 * const result = paragraphLayoutEngine.layout(paragraph, 300);
 * const svg = renderResultToSVG(result, { preset: 'preserve' });
 * ```
 */
export function renderResultToSVG(
  result: ParagraphLayoutResult,
  options?: SVGRenderOptions,
): string {
  return renderToSVG(result.lines, {
    width: result.width,
    height: result.height,
    ...options,
  });
}