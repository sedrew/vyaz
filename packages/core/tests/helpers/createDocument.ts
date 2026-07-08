/**
 * Helpers for creating test documents.
 *
 * Usage:
 *   const doc = makeDoc({
 *     text: 'Hello world',
 *     fontSize: 12,
 *     fontFamily: 'Arial',
 *   });
 */

import type { RichTextDocument, TextStyle, Paragraph, Run, TextAlignment, FontWeight } from '../../src/model/Document';
import { DEFAULT_TEXT_STYLE } from '../../src/model/Document';

/** Partial overrides for text style */
export interface DocOverrides {
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: FontWeight;
  fontStyle?: string;
  color?: string;
  alignment?: TextAlignment;
  pageWidth?: number;
  pageHeight?: number;
  firstLineIndent?: number;
  leftIndent?: number;
  rightIndent?: number;
  lineSpacing?: number;
  spaceBefore?: number;
  spaceAfter?: number;
}

/** Create a minimal RichTextDocument with one paragraph and one run */
export function makeDoc(overrides: DocOverrides = {}): RichTextDocument {
  const style: TextStyle = {
    ...DEFAULT_TEXT_STYLE,
    fontSize: overrides.fontSize ?? 12,
    fontFamily: overrides.fontFamily ?? 'Arial',
    fontWeight: overrides.fontWeight ?? 400,
    fontStyle: (overrides.fontStyle as TextStyle['fontStyle']) ?? 'normal',
    color: overrides.color ?? '#000000',
  };

  const run: Run = {
    text: overrides.text ?? 'Hello world',
    style,
  };

  const paragraph: Paragraph = {
    runs: [run],
    alignment: overrides.alignment ?? 'left',
    lineSpacing: overrides.lineSpacing ?? 1.15,
    firstLineIndent: overrides.firstLineIndent,
    leftIndent: overrides.leftIndent,
    rightIndent: overrides.rightIndent,
    spaceBefore: overrides.spaceBefore,
    spaceAfter: overrides.spaceAfter,
  };

  return {
    paragraphs: [paragraph],
    pageWidth: overrides.pageWidth ?? 500,
    pageHeight: overrides.pageHeight ?? 500,
    margins: { top: 50, right: 50, bottom: 50, left: 50 },
    defaultStyle: DEFAULT_TEXT_STYLE,
  };
}

/** Create a multi-paragraph document */
export function makeMultiParagraphDoc(
  texts: string[],
  overrides: DocOverrides = {}
): RichTextDocument {
  const style: TextStyle = {
    ...DEFAULT_TEXT_STYLE,
    fontSize: overrides.fontSize ?? 12,
    fontFamily: overrides.fontFamily ?? 'Arial',
    fontWeight: overrides.fontWeight ?? 400,
    fontStyle: (overrides.fontStyle as TextStyle['fontStyle']) ?? 'normal',
    color: overrides.color ?? '#000000',
  };

  const paragraphs: Paragraph[] = texts.map(text => ({
    runs: [{ text, style }],
    alignment: overrides.alignment ?? 'left',
    lineSpacing: overrides.lineSpacing ?? 1.15,
  }));

  return {
    paragraphs,
    pageWidth: overrides.pageWidth ?? 500,
    pageHeight: overrides.pageHeight ?? 500,
    margins: { top: 50, right: 50, bottom: 50, left: 50 },
    defaultStyle: DEFAULT_TEXT_STYLE,
  };
}