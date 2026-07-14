/**
 * ParagraphLayoutEngine.ts — main orchestrator.
 *
 * Pipeline:
 *   Paragraph
 *   → compile (DocumentCompiler)
 *   → prepareRichInline (pretext)
 *   → walkRichInlineLineRanges + materializeRichInlineLineRange (pretext)
 *   → positionLines (PositioningEngine)
 *   → assertLineInvariants (LineInvariants)
 *
 * Supports autofit via AutoFitEngine.findScale.
 * Caches PreparedRichInline per paragraph key (Parley LayoutContext pattern).
 */

// Polyfill OffscreenCanvas for Node.js (node-canvas)
import '../measure/canvas-polyfill.js';

import type { Paragraph } from '../types/Document.js';
import type { FontMetrics } from '../types/FontTypes.js';
import type { IFontMetricsProvider } from '../types/FontTypes.js';
import type { ParagraphLayoutResult } from '../types/LayoutTypes.js';
import { compileParagraph, getParagraphText } from '../compile/DocumentCompiler.js';
import type { PreparedRichInlineItem } from '../compile/DocumentCompiler.js';
import { fontMetricsProvider, MISSING_GLYPH_FACTOR } from '../measure/FontMetricsProvider.js';
import { FontNotFoundError } from '../measure/FontNotFoundError.js';
import { positionLines } from './PositioningEngine.js';
import { assertLineInvariants } from './LineBoxValidator.js';

// @ts-ignore
import { prepareRichInline, materializeRichInlineLineRange, walkRichInlineLineRanges, type PreparedRichInline } from '@chenglou/pretext/rich-inline';

// ── Cache key builder ─────────────────────────────────────────────────────

function glyphCacheKey(
  text: string,
  fontSize: number,
  fontFamily?: string,
  fontWeight?: string,
  fontStyle?: string,
): string {
  return `${fontSize}_${fontFamily || ''}_${fontWeight || ''}_${fontStyle || ''}_${text}`;
}

// ── Helpers ─────────────────────────────────────────────────────────────

/** Get FontMetrics for a PreparedRichInlineItem */
function getFontMetricsForItem(item: PreparedRichInlineItem): FontMetrics {
  return fontMetricsProvider.getMetrics(
    item.metadata.style.fontFamily,
    item.metadata.effectiveFontSize,
    String(item.metadata.style.fontWeight || 400),
    item.metadata.style.fontStyle || 'normal',
  );
}

// ── ParagraphLayoutEngine ─────────────────────────────────────────────

export class ParagraphLayoutEngine {
  private preparedCache = new Map<string, PreparedRichInline>();

  /**
   * Layout a single paragraph — basic variant.
   *
   * @param paragraph — input paragraph
   * @param maxWidth — available container width (px)
   * @param fontProvider — optional metrics provider (default: fontMetricsProvider)
   * @returns ParagraphLayoutResult with Line[]
   */
  layout(
    paragraph: Paragraph,
    maxWidth: number,
    yOffset: number = 0,
    fontProvider?: IFontMetricsProvider,
  ): ParagraphLayoutResult {
    const provider = fontProvider || fontMetricsProvider;

    // Phase 1: Compile
    const items = compileParagraph(paragraph);

    // Phase 2: Prepare (cached)
    const cacheKey = JSON.stringify(paragraph);
    let prepared = this.preparedCache.get(cacheKey);
    if (!prepared) {
      prepared = prepareRichInline(items);
      this.preparedCache.set(cacheKey, prepared);
    }

    // Phase 3: Layout — walk lines
    const effectiveMaxWidth = paragraph.style.whiteSpace === 'nowrap' ? Infinity : maxWidth;
    const pretextLines: any[] = [];
    walkRichInlineLineRanges(prepared, effectiveMaxWidth, (range: any) => {
      pretextLines.push(range);
    });

    // Materialize each line
    const materializedLines: any[] = [];
    for (const range of pretextLines) {
      materializedLines.push(materializeRichInlineLineRange(prepared, range));
    }

    // Phase 4: Position
    const renderMode = provider.getMode();

    // Per-layout glyph cache: map<text+font+size, Float32Array>
    // Lives only for the duration of one layout() call.
    const glyphCache = new Map<string, Float32Array>();

    // Build measureText callback: single fontkit pass, caches advances.
    const measureTextFn = (
      text: string,
      fontSize: number,
      fontFamily?: string,
      fontWeight?: string,
      fontStyle?: string,
    ): number => {
      if (!text) return 0;
      const key = glyphCacheKey(text, fontSize, fontFamily, fontWeight, fontStyle);

      // Check cache first — same text+font may appear across multiple fragments
      let advances = glyphCache.get(key);
      if (!advances) {
        advances = this.computeGlyphAdvances(text, fontSize, fontFamily, fontWeight, fontStyle);
        glyphCache.set(key, advances);
      }

      let total = 0;
      for (let i = 0; i < advances.length; i++) total += advances[i];
      return Math.round(total * 100) / 100;
    };

    const { lines, contentWidth } = positionLines(
      materializedLines,
      items,
      (item) => {
        if (fontProvider) {
          return fontProvider.getMetrics(
            item.metadata.style.fontFamily,
            item.metadata.effectiveFontSize,
            String(item.metadata.style.fontWeight || 400),
            item.metadata.style.fontStyle || 'normal',
          );
        }
        return getFontMetricsForItem(item);
      },
      paragraph.style,
      maxWidth,
      yOffset,
      renderMode,
      measureTextFn,
      paragraph.id,
    );

    // Phase 4b: Fill per-glyph advances — pull from cache or compute if miss
    for (const line of lines) {
      for (const span of line.spans) {
        if (span.type === 'text' && span.text.length > 0 && !span.inlineWidget && !span.glyphAdvances) {
          const key = glyphCacheKey(
            span.text,
            span.fontMetrics.fontSize,
            span.style.fontFamily,
            String(span.style.fontWeight || 400),
            span.style.fontStyle || 'normal',
          );
          const cached = glyphCache.get(key);
          if (cached) {
            span.glyphAdvances = Array.from(cached);
          } else {
            // Cache miss (single-fragment spans skip resolveFragmentWidths),
            // compute directly.
            span.glyphAdvances = Array.from(this.computeGlyphAdvances(
              span.text,
              span.fontMetrics.fontSize,
              span.style.fontFamily,
              String(span.style.fontWeight || 400),
              span.style.fontStyle || 'normal',
            ));
          }
        }
      }
    }

    // Phase 5: Validate
    assertLineInvariants(lines, getParagraphText(paragraph), maxWidth);

    // Phase 6: Compute height
    const totalHeight = lines.length > 0
      ? lines[lines.length - 1].y + lines[lines.length - 1].height + (paragraph.style.spaceAfter || 0)
      : 0;

    // Phase 7: Content BBox
    const contentHeight = lines.length > 0
      ? lines[lines.length - 1].y + lines[lines.length - 1].height
      : 0;

    return { width: maxWidth, height: totalHeight, lines, contentWidth, contentHeight };
  }

  /**
   * Layout with per-glyph advance widths (for SVG glyph mode).
   *
   * glyphAdvances are now filled by layout() automatically, so
   * this method is equivalent to layout(). Kept for API compatibility.
   */
  layoutGlyph(
    paragraph: Paragraph,
    maxWidth: number,
    yOffset: number = 0,
  ): ParagraphLayoutResult {
    return this.layout(paragraph, maxWidth, yOffset);
  }

  /**
   * Compute per-character advance widths via FontEngine (fontkit).
   * Returns Float32Array for memory efficiency and faster iteration.
   *
   * Throws FontNotFoundError if the font is not registered.
   */
  private computeGlyphAdvances(
    text: string,
    fontSize: number,
    fontFamily?: string,
    fontWeight?: string,
    fontStyle?: string,
  ): Float32Array {
    const font = fontMetricsProvider.getFont(
      fontFamily || 'Arial',
      fontWeight || '400',
      fontStyle || 'normal',
    );
    if (!font) {
      throw new FontNotFoundError(
        fontFamily || 'Arial',
        fontWeight || '400',
        fontStyle || 'normal',
      );
    }

    const scale = fontSize / font.unitsPerEm;
    const advances = new Float32Array(text.length);

    for (let i = 0; i < text.length; i++) {
      const codePoint = text.codePointAt(i)!;
      const advance = font._raw.glyphForCodePoint(codePoint)?.advanceWidth;
      if (advance != null) {
        advances[i] = advance * scale;
      } else {
        advances[i] = fontSize * MISSING_GLYPH_FACTOR;
      }
      if (codePoint > 0xffff) i++;
    }

    return advances;
  }
}

/** Singleton */
export const paragraphLayoutEngine = new ParagraphLayoutEngine();