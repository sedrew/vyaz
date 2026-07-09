/**
 * DocumentCompiler.ts — compile Paragraph → PreparedRichInlineItem[].
 *
 * Each TextRun becomes a RichInlineItem for pretext.
 * inline-box: text → \uFFFC, dimensions in metadata.inlineWidget.
 * super/sub: fontSize *= 0.65, baselineOffset in metadata.
 *
 * Simple JSON-serialisable format — does not depend on pretext directly.
 */

import type { Paragraph, TextRun } from '../types/Document.js';
import { DEFAULT_TEXT_STYLE } from '../types/Document.js';

// ── Font Weight normalization (matching react-pdf convention) ───────────

export const FONT_WEIGHTS: Record<string, number> = {
  thin: 100,
  hairline: 100,
  ultralight: 200,
  extralight: 200,
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  demibold: 600,
  bold: 700,
  ultrabold: 800,
  extrabold: 800,
  heavy: 900,
  black: 900,
};

/** Normalize fontWeight to a numeric value (400 by default). */
export function normalizeFontWeight(weight: number | string | undefined): number {
  if (weight == null) return FONT_WEIGHTS.normal;
  if (typeof weight === 'number') return weight;
  return FONT_WEIGHTS[weight.toLowerCase()] ?? FONT_WEIGHTS.normal;
}

/** Font token for pretext: "${style}_${weight}_${fontSize}_${family}" */
export function makeFontToken(run: TextRun, effectiveFontSize: number): string {
  const fontStyle = run.fontStyle || DEFAULT_TEXT_STYLE.fontStyle || 'normal';
  const fontWeight = normalizeFontWeight(run.fontWeight ?? DEFAULT_TEXT_STYLE.fontWeight);
  const fontFamily = run.fontFamily || DEFAULT_TEXT_STYLE.fontFamily || 'Arial';
  return `${fontStyle} ${fontWeight} ${effectiveFontSize}px ${fontFamily}`;
}

/** Compilation context (passed to pretext) */
export interface PreparedRichInlineItem {
  text: string;
  font: string;
  letterSpacing?: number;
  extraWidth?: number;         // padding, border for inline-box
  break?: 'normal' | 'never';  // for atomic chips
  metadata: {
    originalRunIndex: number;
    baselineOffset: number;
    effectiveFontSize: number;
    style: TextRun;
    inlineWidget?: TextRun['inlineWidget'];
  };
}

const SUPER_SUB_SCALE = 0.65;
const SUPER_OFFSET_RATIO = -0.4;
const SUB_OFFSET_RATIO = 0.15;

/**
 * Compile a paragraph into PreparedRichInlineItem[].
 */
export function compileParagraph(paragraph: Paragraph): PreparedRichInlineItem[] {
  const items: PreparedRichInlineItem[] = [];

  for (let i = 0; i < paragraph.children.length; i++) {
    const run = paragraph.children[i];

    // Compute effective fontSize and baselineOffset
    const baseFontSize = run.fontSize ?? DEFAULT_TEXT_STYLE.fontSize ?? 12;
    let effectiveFontSize = baseFontSize;
    let baselineOffset = 0;

    if (run.script === 'super') {
      effectiveFontSize = baseFontSize * SUPER_SUB_SCALE;
      baselineOffset = baseFontSize * SUPER_OFFSET_RATIO;
    } else if (run.script === 'sub') {
      effectiveFontSize = baseFontSize * SUPER_SUB_SCALE;
      baselineOffset = baseFontSize * SUB_OFFSET_RATIO;
    }

    // Inline-box: text → \uFFFC
    const text = run.type === 'inline-box' ? '\uFFFC' : run.text;

    // Normalize fontWeight to numeric value
    const resolvedFontWeight = normalizeFontWeight(run.fontWeight ?? DEFAULT_TEXT_STYLE.fontWeight);

    // Fill missing style fields from DEFAULT_TEXT_STYLE
    const resolvedStyle: TextRun = {
      ...DEFAULT_TEXT_STYLE,
      ...run,
      fontSize: effectiveFontSize,
      fontWeight: resolvedFontWeight,
      text: run.text,
      type: run.type,
    } as TextRun;

    const item: PreparedRichInlineItem = {
      text,
      font: makeFontToken(run, effectiveFontSize),
      letterSpacing: run.letterSpacing,
      metadata: {
        originalRunIndex: i,
        baselineOffset,
        effectiveFontSize,
        style: resolvedStyle,
        inlineWidget: run.inlineWidget,
      },
    };

    // Inline-box: add extraWidth and break: 'never'
    if (run.type === 'inline-box' && run.inlineWidget) {
      item.extraWidth = run.inlineWidget.width;
      item.break = 'never';
    }

    items.push(item);
  }

  return items;
}

/**
 * Get the full text of a paragraph (for INDEX_CONSIST checks).
 */
export function getParagraphText(paragraph: Paragraph): string {
  return paragraph.children.map(r => r.text).join('');
}