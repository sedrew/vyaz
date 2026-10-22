/**
 * ParagraphCompiler.ts — compile Paragraph → PreparedRichInlineItem[].
 *
 * Each TextRun becomes a RichInlineItem for pretext.
 * inline-box: text → \uFFFC, dimensions in metadata.inlineWidget.
 * super/sub: fontSize *= 0.65, baselineOffset in metadata.
 *
 * splitParagraphByHardBreaks() — zero phase: splits a Paragraph into
 * virtual Paragraph[] on \n boundaries (for pre, pre-line, pre-wrap).
 *
 * Simple JSON-serialisable format — does not depend on pretext directly.
 */

import type { Paragraph, TextRun, ResolvedTextRun, TextTransform } from '../types/Document.js';
import { DEFAULT_TEXT_STYLE } from '../types/Document.js';
import { transformText } from '../utils/textTransform.js';

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
  /**
   * CSS `overflow-wrap` for this run's text — from the paragraph's
   * `overflowWrap` style. `'normal'` (the default) means a word wider than
   * the available width overflows the line instead of being force-split at
   * grapheme boundaries.
   */
  overflowWrap?: 'normal' | 'break-word' | 'anywhere';
  /**
   * `'pre-wrap'` keeps this run's spaces (paragraph `whiteSpace` `pre` /
   * `pre-wrap`); unset collapses them (CSS `normal`).
   */
  whiteSpace?: 'pre-wrap';
  /** `false` when the paragraph sets `hyphenBreak: false` (no break after `-`). */
  hyphenBreak?: false;
  /** Original text before text-transform (if transform was applied). Used for copy-paste / round-trip. */
  originalText?: string;
  metadata: {
    originalRunIndex: number;
    baselineOffset: number;
    effectiveFontSize: number;
    style: ResolvedTextRun;
    inlineWidget?: TextRun['inlineWidget'];
  };
}

/**
 * Super / subscript: size and baseline shift as fractions of the run's own
 * size (shift − = up). office: PowerPoint's Superscript / Subscript (DrawingML
 * `baseline` 30000 / −25000) — drawn at exactly 2/3 size, shifted by the
 * percentage of the full size (scripts/office-metrics/TEXT-FEATURES-RESULTS.md
 * §10, 96 pt: 30 % → 28.8 pt, 50 % → 48, 80 % → 76.8).
 */
const SCRIPT_MODEL = {
  browser: { scale: 0.65, superShift: -0.4, subShift: 0.25 },
  office: { scale: 2 / 3, superShift: -0.3, subShift: 0.25 },
} as const;

/**
 * Collapsible whitespace (CSS Text §4.1.1): space (U+0020), tab (U+0009),
 * form feed (U+000C), carriage return (U+000D).
 *
 * Notably NOT included: NBSP (U+00A0), ZWSP (U+200B), BOM (U+FEFF).
 */
const COLLAPSIBLE_WS_RE = /[ \t\f\r]+/g;

/**
 * Collapse consecutive collapsible whitespace → single space.
 * Trim leading/trailing. CSS Text §4.1.1.
 *
 * Uses native regex (C++ in V8) instead of a manual JS loop.
 */
export function collapseSegmentWhitespace(segment: string): string {
  return segment
    .replace(COLLAPSIBLE_WS_RE, ' ')  // collapse runs to single space
    .trim();                           // trim leading/trailing
}

/**
 * Split text on \n, collapse whitespace per segment (pre-line).
 * Empty segments preserved (for \n\n → empty line).
 *
 * Three native calls: replace → split → map (trim).
 * CSS Text §4.1.1 (pre-line): collapsing + segment break transformation.
 */
export function splitAndCollapseByHardBreaks(text: string): string[] {
  if (text.length === 0) return [''];
  return text
    .replace(COLLAPSIBLE_WS_RE, ' ')  // collapse whitespace runs, preserve \n
    .split('\n')                       // cut on hard breaks
    .map(s => s.trim());               // trim segment boundaries
}

// ── Main compile ────────────────────────────────────────────────────────

/**
 * Compile a paragraph into PreparedRichInlineItem[].
 */
export function compileParagraph(paragraph: Paragraph, mode: 'browser' | 'office' = 'browser'): PreparedRichInlineItem[] {
  const items: PreparedRichInlineItem[] = [];
  const script = SCRIPT_MODEL[mode];

  for (let i = 0; i < paragraph.children.length; i++) {
    const run = paragraph.children[i];

    // Compute effective fontSize and baselineOffset
    const baseFontSize = run.fontSize ?? DEFAULT_TEXT_STYLE.fontSize ?? 12;
    let effectiveFontSize = baseFontSize;
    let baselineOffset = 0;

    if (run.script === 'super') {
      effectiveFontSize = baseFontSize * script.scale;
      baselineOffset = baseFontSize * script.superShift;
    } else if (run.script === 'sub') {
      effectiveFontSize = baseFontSize * script.scale;
      baselineOffset = baseFontSize * script.subShift;
    }

    // Inline-box: text → \uFFFC
    const rawText = run.type === 'inline-box' ? '\uFFFC' : run.text;
    // Apply text-transform (only for text runs, not inline-box)
    const textTransformValue: TextTransform | undefined = run.textTransform;
    const text = transformText(rawText, textTransformValue);

    // Normalize fontWeight to numeric value
    const resolvedFontWeight = normalizeFontWeight(run.fontWeight ?? DEFAULT_TEXT_STYLE.fontWeight);

    // Fill missing style fields from DEFAULT_TEXT_STYLE. `fontFamily` may still
    // be a fallback list here — ParagraphLayoutEngine resolves it to one
    // concrete family before positioning, which is what makes this a
    // ResolvedTextRun.
    const resolvedStyle = {
      ...DEFAULT_TEXT_STYLE,
      ...run,
      fontSize: effectiveFontSize,
      fontWeight: resolvedFontWeight,
      text: run.text,
      type: run.type,
    } as unknown as ResolvedTextRun;

    // super/sub drop underline & strikethrough: a raised/lowered, shrunk glyph
    // with a baseline-aligned decoration line reads as broken, and Word / LibreOffice
    // both suppress the decoration on script runs. The line decoration belongs to
    // the surrounding baseline text, not the script fragment.
    if (run.script === 'super' || run.script === 'sub') {
      resolvedStyle.underline = false;
      resolvedStyle.strikethrough = false;
    }

    const item: PreparedRichInlineItem = {
      text,
      font: makeFontToken(run, effectiveFontSize),
      letterSpacing: run.letterSpacing,
      overflowWrap: paragraph.style.overflowWrap,
      ...(preservesSpaces(paragraph.style.whiteSpace) ? { whiteSpace: 'pre-wrap' as const } : {}),
      ...(paragraph.style.hyphenBreak === false ? { hyphenBreak: false as const } : {}),
      // Save original text if transform was applied (for copy-paste / round-trip)
      ...(text !== rawText ? { originalText: rawText } : {}),
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

/** `white-space` values that keep spaces (`pre`, `pre-wrap`). */
export function preservesSpaces(whiteSpace: Paragraph['style']['whiteSpace']): boolean {
  return whiteSpace === 'pre' || whiteSpace === 'pre-wrap';
}

/** A run's text as line indices count it: an inline box is one character. */
export function sourceTextOf(run: TextRun): string {
  return run.type === 'inline-box' ? '\uFFFC' : run.text;
}

/** One line-break-free piece of a paragraph — see {@link splitParagraphAtHardBreaks}. */
export interface HardBreakPiece {
  /** The piece as a paragraph of its own (whitespace already collapsed for `pre-line`). */
  paragraph: Paragraph;
  /** Offset of the piece in the source paragraph text (`children` texts joined). */
  sourceStart: number;
  /** Source text of each of `paragraph.children`, before collapsing. */
  sourceTexts: string[];
  /** The piece is followed by a `\n` (which belongs to it, after its text). */
  endsWithBreak: boolean;
}

/**
 * Zero phase: split a paragraph on `\n` for `pre` / `pre-line` / `pre-wrap`
 * into one piece per line-break-free stretch, keeping where each piece sits in
 * the source text. Any other `white-space` returns the paragraph as one piece.
 *
 * For `pre-line` whitespace is collapsed per piece. An empty piece (`\n\n`, or
 * a trailing `\n`) keeps one empty run with the style of the run whose `\n`
 * produced it, so its line gets that run's size.
 *
 * @example
 *   "Hello\n\nWorld" (pre-line) → "Hello" | "" | "World"   (3 lines)
 *   ["Hello Bold", "\n", "World"] (pre) → "Hello Bold" | "World"   (2 lines)
 *   "Hello\n" → "Hello" | ""   (the caller decides whether a trailing empty piece is a line)
 */
export function splitParagraphAtHardBreaks(paragraph: Paragraph): HardBreakPiece[] {
  const ws = paragraph.style.whiteSpace;
  if (ws !== 'pre-line' && ws !== 'pre' && ws !== 'pre-wrap') {
    return [{ paragraph, sourceStart: 0, sourceTexts: paragraph.children.map(sourceTextOf), endsWithBreak: false }];
  }

  const pieces: HardBreakPiece[] = [];
  let runs: TextRun[] = [];
  let texts: string[] = [];
  let pieceStart = 0;
  let offset = 0;
  let styleRun: TextRun | undefined; // run that carries the most recent text or \n

  const finish = (endsWithBreak: boolean) => {
    const children = runs.length > 0 ? runs : styleRun ? [{ ...styleRun, text: '' }] : [];
    pieces.push({
      paragraph: { ...paragraph, children },
      sourceStart: pieceStart,
      sourceTexts: runs.length > 0 ? texts : children.map(() => ''),
      endsWithBreak,
    });
    runs = [];
    texts = [];
  };

  for (const run of paragraph.children) {
    if (run.type === 'inline-box') {
      runs.push(run);
      texts.push(sourceTextOf(run));
      styleRun = run;
      offset += 1;
      continue;
    }
    if (runs.length === 0) styleRun = run; // an empty piece takes the size of its first run
    const segments = run.text.split('\n');
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (i > 0) {
        styleRun = run;
        finish(true);
        offset += 1; // the \n
        pieceStart = offset;
      }
      if (seg.length > 0) {
        const text = ws === 'pre-line' ? collapseSegmentWhitespace(seg) : seg;
        runs.push({ ...run, text: transformText(text, run.textTransform) });
        texts.push(seg);
        styleRun = run;
      }
      offset += seg.length;
    }
  }
  finish(false);
  return pieces;
}

/**
 * Split a paragraph into virtual paragraphs on `\n` — the paragraphs of
 * {@link splitParagraphAtHardBreaks}. For `normal` / `nowrap` / unset returns
 * `[paragraph]` unchanged.
 */
export function splitParagraphByHardBreaks(paragraph: Paragraph): Paragraph[] {
  return splitParagraphAtHardBreaks(paragraph).map((piece) => piece.paragraph);
}

/**
 * Get the full text of a paragraph (for INDEX_CONSIST checks).
 */
export function getParagraphText(paragraph: Paragraph): string {
  return paragraph.children.map(r => r.text).join('');
}