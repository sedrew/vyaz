/**
 * htmlToTextFrame.ts — Convert HTML string to `TextFrame`.
 *
 * Uses rehype-parse + unist-util-visit to parse HTML and walk the hast tree.
 *
 * @example
 * ```ts
 * import { htmlToTextFrame } from '@vyaz/renderer/html';
 *
 * const frame = htmlToTextFrame('<p>Hello <b>world</b>!</p>', {
 *   width: 600,
 *   defaultStyle: { fontFamily: 'Arial', fontSize: 14, color: '#000' },
 * });
 * ```
 */

import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import type { Root, Element, Text as HastText } from 'hast';
import { visit } from 'unist-util-visit';
import type {
  TextFrame,
  Paragraph,
  TextRun,
  ParagraphStyle,
  VerticalAlignment,
  WritingMode,
  AutofitConfig,
  TextAlignment,
} from '@vyaz/core';
import { DEFAULT_PARAGRAPH_STYLE, DEFAULT_TEXT_STYLE } from '@vyaz/core';
import { TAG_STYLES, BLOCK_TAGS, INLINE_TAGS, VOID_INLINE_TAGS } from './tagStyles.js';
import { parseInlineStyle } from './cssPropertyMap.js';

// ── Options ─────────────────────────────────────────────────────────────

export interface HtmlToTextFrameOptions {
  /** Frame width in px. */
  width?: number;
  /** Frame height in px. */
  height?: number;
  /** Enable line wrapping. Default `true`. */
  wrap?: boolean;
  /** Writing mode. */
  writingMode?: WritingMode;
  /** Vertical alignment of the content block. */
  verticalAlignment?: VerticalAlignment;
  /** Autofit config. */
  autofit?: AutofitConfig;
  /**
   * Default style inherited by all runs.
   * Any field omitted in a `TextRun` will fall back to this value.
   */
  defaultStyle?: Partial<TextRun>;
  /**
   * Override the default paragraph style.
   */
  paragraphStyle?: Partial<ParagraphStyle>;
}

// ── Entry point ─────────────────────────────────────────────────────────

/**
 * Parse an HTML string into a `TextFrame`.
 *
 * @param html — HTML source (can be a fragment, `<body>` is auto-wrapped).
 * @param options — Frame geometry and default style overrides.
 * @returns A `TextFrame` ready for layout.
 */
export function htmlToTextFrame(html: string, options?: HtmlToTextFrameOptions): TextFrame {
  // 1. Parse HTML into hast
  const root = unified()
    .use(rehypeParse, { fragment: true })
    .parse(html) as Root;

  // 2. Build the default style
  const baseStyle: Partial<TextRun> = { ...DEFAULT_TEXT_STYLE, ...options?.defaultStyle };
  const baseParagraphStyle: ParagraphStyle = { ...DEFAULT_PARAGRAPH_STYLE, ...options?.paragraphStyle };

  // 3. Walk the tree and collect paragraphs
  const paragraphs: Paragraph[] = [];
  const listCounters: string[] = []; // stack of list counters, one per active <ol>

  for (const child of root.children) {
    if (child.type === 'element') {
      processBlockElement(child, baseStyle, baseParagraphStyle, paragraphs, listCounters);
    } else if (child.type === 'text') {
      const text = normalizeText(child.value).trim();
      if (text) {
        paragraphs.push({
          style: { ...baseParagraphStyle },
          children: [makeTextRun(text, baseStyle)],
        });
      }
    }
  }

  // 4. Assemble the frame
  return {
    width: options?.width,
    height: options?.height,
    wrap: options?.wrap ?? true,
    writingMode: options?.writingMode,
    verticalAlignment: options?.verticalAlignment,
    autofit: options?.autofit,
    defaultStyle: baseStyle,
    paragraphs,
  };
}

// ── Block-level processing ──────────────────────────────────────────────

function processBlockElement(
  el: Element,
  baseStyle: Partial<TextRun>,
  baseParagraphStyle: ParagraphStyle,
  out: Paragraph[],
  listCounters: string[],
): void {
  const tag = el.tagName.toLowerCase();

  if (tag === 'ul' || tag === 'ol') {
    // Push list counter for ordered lists
    if (tag === 'ol') {
      listCounters.push('0');
    } else {
      listCounters.push('');
    }
    // Process children, each <li> will read the current counter
    for (const child of el.children) {
      if (child.type === 'element') {
        processBlockElement(child, baseStyle, baseParagraphStyle, out, listCounters);
      }
    }
    // Pop counter
    listCounters.pop();
    return;
  }

  if (tag === 'li') {
    const marker = getListMarker(listCounters);
    const pStyle: ParagraphStyle = {
      ...baseParagraphStyle,
      alignment: 'left',
    };
    const runs: TextRun[] = [];

    // Process inline children for the li content first
    for (const child of el.children) {
      collectInlineContent(child, baseStyle, runs);
    }

    // Prepend marker to the first text run (or create one)
    if (marker) {
      if (runs.length > 0) {
        runs[0].text = marker + runs[0].text;
      } else {
        runs.push(makeTextRun(marker, { ...baseStyle }));
      }
    }

    if (runs.length > 0) {
      out.push({ style: pStyle, children: runs });
    }
    return;
  }

  if (tag === 'pre') {
    // Preserve whitespace
    const text = collectRawText(el);
    if (text) {
      out.push({
        style: { ...baseParagraphStyle, whiteSpace: 'pre' },
        children: [makeTextRun(text, { ...baseStyle, ...(TAG_STYLES.code ?? {}) })],
      });
    }
    return;
  }

  if (tag === 'br') {
    // Standalone <br> at block level → empty paragraph
    out.push({
      style: { ...baseParagraphStyle },
      children: [makeTextRun('', baseStyle)],
    });
    return;
  }

  // Generic block element (p, div, h1-h6, blockquote)
  const tagStyle = TAG_STYLES[tag] ?? {};
  const pStyle: ParagraphStyle = { ...baseParagraphStyle };
  if (tag === 'blockquote') {
    pStyle.leftIndent = 40;
    pStyle.rightIndent = 40;
    pStyle.spaceBefore = 12;
    pStyle.spaceAfter = 12;
  }

  const runs: TextRun[] = [];
  for (const child of el.children) {
    collectInlineContent(child, { ...baseStyle, ...tagStyle }, runs);
  }

  if (runs.length > 0) {
    out.push({ style: pStyle, children: runs });
  }
}

// ── Inline content collection ───────────────────────────────────────────

/**
 * Recursively collect inline content from a hast node, producing TextRuns.
 *
 * @param node — The current hast node.
 * @param accumulatedStyle — The active style at this point (merged from ancestors).
 * @param runs — Array to push resulting runs into.
 */
function collectInlineContent(
  node: import('hast').Node,
  accumulatedStyle: Partial<TextRun>,
  runs: TextRun[],
): void {
  if (node.type === 'text') {
    const text = normalizeText((node as HastText).value);
    if (text) {
      // Merge with last run if same style
      const last = runs[runs.length - 1];
      if (last && stylesEqual(last, accumulatedStyle)) {
        last.text += text;
      } else {
        runs.push(makeTextRun(text, accumulatedStyle));
      }
    }
    return;
  }

  if (node.type !== 'element') return;

  const el = node as Element;
  const tag = el.tagName.toLowerCase();

  // Handle <br> — forced line break
  if (tag === 'br') {
    // Add \n to the last run, or create a new run
    if (runs.length > 0) {
      runs[runs.length - 1].text += '\n';
    } else {
      runs.push(makeTextRun('\n', accumulatedStyle));
    }
    return;
  }

  // Handle <img> — inline-box placeholder (future)
  if (tag === 'img') {
    // @todo: inline-box with width/height from attributes
    runs.push(makeTextRun('\uFFFC', accumulatedStyle));
    return;
  }

  // Handle <wbr> — zero-width break opportunity
  if (tag === 'wbr') {
    runs.push(makeTextRun('\u200B', accumulatedStyle));
    return;
  }

  // Merge style from tag + inline CSS
  const tagStyle = TAG_STYLES[tag] ?? {};
  const cssStyle = parseInlineStyle(el.properties?.style as string | undefined);
  const mergedStyle = mergeStyles(accumulatedStyle, tagStyle, cssStyle);

  // Recursively process children
  for (const child of el.children) {
    collectInlineContent(child, mergedStyle, runs);
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────

function makeTextRun(text: string, style: Partial<TextRun>): TextRun {
  return {
    type: 'text',
    text,
    fontFamily: style.fontFamily ?? 'Arial',
    fontSize: style.fontSize ?? 12,
    fontWeight: style.fontWeight ?? 'normal',
    fontStyle: style.fontStyle ?? 'normal',
    color: style.color ?? '#000000',
    ...(style.backgroundColor !== undefined ? { backgroundColor: style.backgroundColor } : {}),
    ...(style.letterSpacing !== undefined ? { letterSpacing: style.letterSpacing } : {}),
    ...(style.script !== undefined ? { script: style.script } : {}),
    ...(style.underline !== undefined ? { underline: style.underline } : {}),
    ...(style.strikethrough !== undefined ? { strikethrough: style.strikethrough } : {}),
    ...(style.overline !== undefined ? { overline: style.overline } : {}),
    ...(style.textTransform !== undefined ? { textTransform: style.textTransform } : {}),
  };
}

/**
 * Merge multiple style objects, later overrides earlier.
 */
function mergeStyles(...styles: Partial<TextRun>[]): Partial<TextRun> {
  const result: Record<string, unknown> = {};
  for (const s of styles) {
    if (s) Object.assign(result, s);
  }
  return result as Partial<TextRun>;
}

/**
 * Check if two partial TextRun objects have equal style fields.
 * Compares all style-relevant keys.
 */
function stylesEqual(a: Partial<TextRun>, b: Partial<TextRun>): boolean {
  const keys: (keyof TextRun)[] = [
    'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'color',
    'backgroundColor', 'letterSpacing', 'script',
    'underline', 'strikethrough', 'overline', 'textTransform',
  ];
  for (const key of keys) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

function normalizeText(value: string): string {
  return value.replace(/\r\n?/g, '\n');
}

/**
 * Get the current list marker prefix based on list stack.
 */
function getListMarker(counters: string[]): string {
  if (counters.length === 0) return '';

  const top = counters[counters.length - 1];
  if (top === '') {
    // Unordered list
    return '• ';
  }
  // Ordered list — increment counter
  const num = parseInt(top, 10) + 1;
  counters[counters.length - 1] = String(num);
  return `${num}. `;
}

/**
 * Collect all descendant text from an element (for `<pre>`).
 */
function collectRawText(el: Element): string {
  let out = '';
  for (const child of el.children) {
    if (child.type === 'text') {
      out += (child as HastText).value;
    } else if (child.type === 'element') {
      out += collectRawText(child as Element);
    }
    // comment nodes etc are ignored
  }
  return out;
}
