/**
 * ParagraphLayoutEngine.ts — main orchestrator.
 *
 * Pipeline:
 *   Paragraph
 *   → compile (ParagraphCompiler)
 *   → prepareRichInline (pretext)
 *   → walkRichInlineLineRanges + materializeRichInlineLineRange (pretext)
 *   → positionLines (PositioningEngine)
 *
 * Line-box invariant checks live in `@vyaz/core/debug` (assertLineInvariants);
 * they are not run on the layout hot path.
 *
 * Supports autofit via AutoFitEngine.findScale.
 * Caches PreparedRichInline per paragraph key (Parley LayoutContext pattern).
 */

import type { Paragraph, ListStyle } from '../types/Document.js';
import type { FontMetrics } from '../types/FontTypes.js';
import type { IFontMetricsProvider } from '../types/FontTypes.js';
import type { ParagraphLayoutResult } from '../types/LayoutTypes.js';
import { compileParagraph } from '../compile/ParagraphCompiler.js';
import type { PreparedRichInlineItem } from '../compile/ParagraphCompiler.js';
import { fontMetricsProvider, MISSING_GLYPH_FACTOR } from '../measure/FontMetricsProvider.js';
import { FontNotFoundError } from '../measure/FontNotFoundError.js';
import { createFontkitMeasureContext, setMeasureContext } from '../measure/FontkitMeasureContext.js';
import { positionLines } from './PositioningEngine.js';
import { resolveFontFamily, type OnMissingFont } from './resolve-font.js';
import type { LayoutWarning } from '../types/LayoutTypes.js';

// Vendored pretext — see src/vendor/pretext/VENDOR.json and
// scripts/vendor-pretext.ts. The vendored copy routes text measurement through
// src/measure/FontkitMeasureContext.ts instead of a global canvas context.
import { prepareRichInline, materializeRichInlineLineRange, walkRichInlineLineRanges, type PreparedRichInline } from '../vendor/pretext/rich-inline.js';

// ── Text measurement backend ──────────────────────────────────────────────
//
// Line breaking (pretext) and glyph positioning (computeGlyphAdvances, below)
// now read widths from the same fontkit tables. They used to disagree: pretext
// measured through @napi-rs/canvas while positioning measured through fontkit,
// so lines broke on one set of numbers and were laid out on another.
//
// Escape hatch: `setMeasureContext(null)` puts line breaking back on canvas.
setMeasureContext(createFontkitMeasureContext(fontMetricsProvider));

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
function getFontMetricsForItem(item: PreparedRichInlineItem, mode?: 'browser' | 'office'): FontMetrics {
  return fontMetricsProvider.getMetrics(
    item.metadata.style.fontFamily,
    item.metadata.effectiveFontSize,
    String(item.metadata.style.fontWeight || 400),
    item.metadata.style.fontStyle || 'normal',
    mode,
  );
}

// ── ParagraphLayoutEngine ─────────────────────────────────────────────

/**
 * Structural key for the prepared-line cache.
 *
 * Covers exactly the run fields that `compileParagraph` + `prepareRichInline`
 * consume (text/shape + resolved font token inputs + letterSpacing). Style that
 * only affects positioning or painting — colour, alignment, line-height,
 * spacing, decoration — is deliberately excluded so an editor re-layout after
 * a colour change still hits the cache. `JSON.stringify(paragraph)` walked the
 * whole tree and busted on every such edit.
 */
function preparedCacheKey(paragraph: Paragraph): string {
  const c = paragraph.children;
  let k = '';
  const S = '\u0000';   // field/record separator — never present in a real text run
  for (let i = 0; i < c.length; i++) {
    const r = c[i];
    k += (r.type === 'inline-box' ? 'B' + (r.inlineWidget?.width ?? 0) : 'T' + r.text)
      + S + (r.fontFamily ?? '')
      + S + (r.fontSize ?? '')
      + S + (r.fontWeight ?? '')
      + S + (r.fontStyle ?? '')
      + S + (r.letterSpacing ?? 0)
      + S + (r.script ?? '')
      + S + (r.textTransform ?? '')
      + S;
  }
  return k;
}

const DEFAULT_PREPARED_CACHE_MAX = 4096;

export class ParagraphLayoutEngine {
  /** LRU (Map insertion order) of PreparedRichInline keyed by {@link preparedCacheKey}. */
  private preparedCache = new Map<string, PreparedRichInline>();
  private readonly cacheMax: number;

  constructor(cacheMax: number = DEFAULT_PREPARED_CACHE_MAX) {
    this.cacheMax = cacheMax > 0 ? cacheMax : DEFAULT_PREPARED_CACHE_MAX;
  }

  /** Drop all cached prepared-line data (e.g. on document close). */
  clearCache(): void {
    this.preparedCache.clear();
  }

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
    listStyle?: ListStyle,
    listIndex?: number,
    listMarkerWidth?: number,
    wantGlyphAdvances: boolean = false,
    mode?: 'browser' | 'office',
    onMissingFont: OnMissingFont = 'throw',
  ): ParagraphLayoutResult {
    const provider = fontProvider || fontMetricsProvider;

    // Phase 1: Compile
    const items = compileParagraph(paragraph);

    // Phase 1b: resolve each run's fontFamily (name or fallback list) to one
    // concrete registered family, before prepare/positioning see it.
    // Fast path: with the default 'throw' policy a plain-string family needs no
    // work here — downstream `getMetrics` throws `FontNotFoundError` just the
    // same. Only fallback lists, or 'substitute' mode, pay for resolution.
    const warnings: LayoutWarning[] = [];
    if (onMissingFont === 'substitute' || items.some((it) => Array.isArray(it.metadata.style.fontFamily))) {
      const resolver = (fontProvider ?? fontMetricsProvider) as unknown as {
        getFont: any; getRegisteredFamilies: any;
      };
      for (const item of items) {
        const st = item.metadata.style;
        const { family, warning } = resolveFontFamily(
          resolver,
          st.fontFamily as unknown as string | string[],
          String(st.fontWeight || 400),
          st.fontStyle || 'normal',
          onMissingFont,
        );
        if (family !== (st.fontFamily as unknown as string)) {
          (st as { fontFamily: string }).fontFamily = family;
          item.font = `${st.fontStyle || 'normal'} ${st.fontWeight} ${item.metadata.effectiveFontSize}px ${family}`;
        }
        if (warning) warnings.push({ ...warning, runIndex: item.metadata.originalRunIndex });
      }
    }

    // Phase 2: Prepare (cached, bounded LRU keyed on prepare-relevant fields only)
    const cacheKey = preparedCacheKey(paragraph);
    let prepared = this.preparedCache.get(cacheKey);
    if (prepared) {
      // bump recency
      this.preparedCache.delete(cacheKey);
      this.preparedCache.set(cacheKey, prepared);
    } else {
      prepared = prepareRichInline(items);
      this.preparedCache.set(cacheKey, prepared);
      if (this.preparedCache.size > this.cacheMax) {
        this.preparedCache.delete(this.preparedCache.keys().next().value as string);
      }
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

    // Phase 4: Position — per-call mode overrides the provider's global mode
    const renderMode = mode ?? provider.getMode();

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
            renderMode,
          );
        }
        return getFontMetricsForItem(item, renderMode);
      },
      paragraph.style,
      maxWidth,
      yOffset,
      renderMode,
      measureTextFn,
      paragraph.id,
      paragraph.style.listStyle,
      paragraph.style.listStyle ? (listIndex ?? 1) : undefined,
      listMarkerWidth,
    );

    // Phase 4b: Fill per-glyph advances — opt-in (SVG "glyph" preset, hit-testing).
    // Skipped by default: it costs O(chars) fontkit lookups + O(chars) array
    // allocation on every layout, and flat/browser/preserve render + plain
    // stacking never read it.
    if (wantGlyphAdvances)
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
          // Keep the Float32Array — half the memory of a boxed number[] and no
          // copy. Consumers (SVGRenderer glyph path, interactive.ts) index it
          // directly. Identical text+font spans share one read-only instance.
          span.glyphAdvances = cached ?? this.computeGlyphAdvances(
            span.text,
            span.fontMetrics.fontSize,
            span.style.fontFamily,
            String(span.style.fontWeight || 400),
            span.style.fontStyle || 'normal',
          );
        }
      }
    }

    // Phase 6: Compute height
    const totalHeight = lines.length > 0
      ? lines[lines.length - 1].y + lines[lines.length - 1].height + (paragraph.style.spaceAfter || 0)
      : 0;

    // Phase 7: Content BBox
    const contentHeight = lines.length > 0
      ? lines[lines.length - 1].y + lines[lines.length - 1].height
      : 0;

    return { width: maxWidth, height: totalHeight, lines, contentWidth, contentHeight, warnings: warnings.length ? warnings : undefined };
  }

  /**
   * Layout with per-glyph advance widths filled on every text span
   * (SVG "glyph" preset, caret hit-testing).
   */
  layoutGlyph(
    paragraph: Paragraph,
    maxWidth: number,
    yOffset: number = 0,
  ): ParagraphLayoutResult {
    return this.layout(paragraph, maxWidth, yOffset, undefined, undefined, undefined, undefined, true);
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
export const paragraphLayoutEngine: ParagraphLayoutEngine = new ParagraphLayoutEngine();
