/**
 * DocumentCompiler.ts — compile Paragraph → PreparedRichInlineItem[].
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

import type { Paragraph, TextRun, TextTransform } from '../types/Document.js';
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
  /** Original text before text-transform (if transform was applied). Used for copy-paste / round-trip. */
  originalText?: string;
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
const SUB_OFFSET_RATIO = 0.25;

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
    const rawText = run.type === 'inline-box' ? '\uFFFC' : run.text;
    // Apply text-transform (only for text runs, not inline-box)
    const textTransformValue: TextTransform | undefined = run.textTransform;
    const text = transformText(rawText, textTransformValue);

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

/**
 * Zero phase: split a Paragraph into virtual Paragraph[] on \n boundaries.
 *
 * For `pre-line`: whitespace is collapsed per segment.
 * For `pre`/`pre-wrap`: whitespace is preserved.
 * For `normal`/`nowrap`/`undefined`: returns [paragraph] unchanged.
 *
 * Each \n produces an empty Paragraph (children: []) which the layout engine
 * can fast-path as a hard-break line.
 *
 * Supports multi-run: when a run contains \n, the text after \n starts
 * a new virtual paragraph. Runs after the split run belong to the new
 * paragraph.
 *
 * @example
 *   "Hello\nWorld" (pre-line)
 *     → [{ children: [{ text: "Hello" }] }, { children: [{ text: "World" }] }]
 *
 *   "Hello\n\nWorld" (pre-line)
 *     → [{ children: [{ text: "Hello" }] }, { children: [] }, { children: [{ text: "World" }] }]
 *
 *   ["Hello Bold", "\n", "World"] (pre)
 *     → [{ children: [{ text: "Hello Bold" }] }, { children: [] }, { children: [{ text: "World" }] }]
 */
export function splitParagraphByHardBreaks(paragraph: Paragraph): Paragraph[] {
  const ws = paragraph.style.whiteSpace;
  if (ws !== 'pre-line' && ws !== 'pre' && ws !== 'pre-wrap') {
    return [paragraph];
  }

  const result: Paragraph[] = [];
  let currentRuns: TextRun[] = [];

  for (const run of paragraph.children) {
    const segments = run.text.split('\n');

    if (segments.length === 1) {
      // No \n — entire run goes to current virtual paragraph
      currentRuns.push({ ...run });
      continue;
    }

    // Text has \n — process each segment
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const textTransform = run.textTransform;
      const effectiveFontSize = computeEffFs(run);

      if (i === 0) {
        // First segment → append to current paragraph
        if (seg.length > 0) {
          const text = ws === 'pre-line' ? collapseSegmentWhitespace(seg) : seg;
          currentRuns.push({ ...run, text: transformText(text, textTransform) });
        }
        // First segment empty (leading \n) — still finalize current paragraph below
      } else {
        // Subsequent segment → finalize previous paragraph first
        result.push({ style: paragraph.style, children: currentRuns });

        if (seg.length > 0) {
          // Non-empty segment → start new paragraph with this run
          const text = ws === 'pre-line' ? collapseSegmentWhitespace(seg) : seg;
          currentRuns = [{ ...run, text: transformText(text, textTransform) }];
        } else {
          // Empty segment (consecutive \n) → empty paragraph
          result.push({ style: paragraph.style, children: [] });
          currentRuns = [];
        }
      }
    }
  }

  // Finalize last paragraph
  result.push({ style: paragraph.style, children: currentRuns });

  return result;
}

function computeEffFs(run: TextRun): number {
  const base = run.fontSize ?? DEFAULT_TEXT_STYLE.fontSize ?? 12;
  return run.script === 'super' || run.script === 'sub' ? base * SUPER_SUB_SCALE : base;
}

/**
 * Get the full text of a paragraph (for INDEX_CONSIST checks).
 */
export function getParagraphText(paragraph: Paragraph): string {
  return paragraph.children.map(r => r.text).join('');
}