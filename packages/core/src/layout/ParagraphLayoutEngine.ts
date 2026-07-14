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
   * Layout a single paragraph — basic variant, no per-glyph data.
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
    // CSS white-space: nowrap → disable wrapping (infinite width)
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

    // Build measureText callback: measure any text fragment accurately
    // by summing glyph advances from fontkit. Same algorithm as computeGlyphAdvances.
    // Accepts font parameters per-call so each fragment is measured with
    // its actual font family/weight/style for multi-style lines.
    // Uses fontMetricsProvider.getFont() directly (the concrete class) since
    // IFontMetricsProvider doesn't expose getFont(). In browser environments
    // where fonts aren't registered, it falls back to proportional distribution
    // inside positionLines().
    const measureTextFn = (
      text: string,
      fontSize: number,
      fontFamily?: string,
      fontWeight?: string,
      fontStyle?: string,
    ): number => {
      if (!text) return 0;
      const font = fontMetricsProvider.getFont(
        fontFamily || 'Arial',
        fontWeight || '400',
        fontStyle || 'normal',
      );
      if (!font) {
        throw new FontNotFoundError(fontFamily || 'Arial', fontWeight || '400', fontStyle || 'normal');
      }
      const scale = fontSize / font.unitsPerEm;
      let total = 0;
      for (let i = 0; i < text.length; i++) {
        const codePoint = text.codePointAt(i)!;
        const glyph = font.glyphForCodePoint(codePoint);
        if (glyph) {
          total += glyph.advanceWidth * scale;
        } else {
          total += fontSize * MISSING_GLYPH_FACTOR;
        }
        if (codePoint > 0xffff) i++;
      }
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

    // Phase 4b: Fill per-glyph advances via fontkit
    for (const line of lines) {
      for (const span of line.spans) {
        if (span.type === 'text' && span.text.length > 0 && !span.inlineWidget && !span.glyphAdvances) {
          span.glyphAdvances = this.computeGlyphAdvances(
            span.text,
            span.style.fontFamily,
            span.fontMetrics.fontSize,
            String(span.style.fontWeight || 400),
            span.style.fontStyle || 'normal',
          );
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
   * Compute per-character advance widths via fontkit.
   */
  private computeGlyphAdvances(
    text: string,
    fontFamily: string,
    fontSize: number,
    weight: string,
    style: string,
  ): number[] {
    const font = fontMetricsProvider.getFont(fontFamily, weight, style);
    if (!font) {
      throw new FontNotFoundError(fontFamily, weight, style);
    }

    const scale = fontSize / font.unitsPerEm;
    const advances: number[] = [];

    for (let i = 0; i < text.length; i++) {
      const codePoint = text.codePointAt(i)!;
      const glyph = font.glyphForCodePoint(codePoint);
      if (glyph) {
        advances.push(glyph.advanceWidth * scale);
      } else {
        // Missing glyph
        advances.push(fontSize * MISSING_GLYPH_FACTOR);
      }
      // Skip surrogate pair
      if (codePoint > 0xffff) i++;
    }

    return advances;
  }
}

/** Singleton */
export const paragraphLayoutEngine = new ParagraphLayoutEngine();