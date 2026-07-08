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

/** Font token for pretext: "${style}_${weight}_${fontSize}_${family}" */
export function makeFontToken(run: TextRun, effectiveFontSize: number): string {
  const fontStyle = run.fontStyle || 'normal';
  const fontWeight = run.fontWeight || 400;
  return `${fontStyle} ${fontWeight} ${effectiveFontSize}px ${run.fontFamily}`;
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
    let effectiveFontSize = run.fontSize;
    let baselineOffset = 0;

    if (run.script === 'super') {
      effectiveFontSize = run.fontSize * SUPER_SUB_SCALE;
      baselineOffset = run.fontSize * SUPER_OFFSET_RATIO;
    } else if (run.script === 'sub') {
      effectiveFontSize = run.fontSize * SUPER_SUB_SCALE;
      baselineOffset = run.fontSize * SUB_OFFSET_RATIO;
    }

    // Inline-box: text → \uFFFC
    const text = run.type === 'inline-box' ? '\uFFFC' : run.text;

    const item: PreparedRichInlineItem = {
      text,
      font: makeFontToken(run, effectiveFontSize),
      letterSpacing: run.letterSpacing,
      metadata: {
        originalRunIndex: i,
        baselineOffset,
        effectiveFontSize,
        style: { ...run, fontSize: effectiveFontSize },
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