/**
 * helpers.ts — shared test helpers for @vyaz/core layout tests.
 *
 * All tests default to Unifont (registered in setup).
 * `fontFamily` tests use system fonts (Arial, Times New Roman) via Canvas fallback;
 * these tests are skipped if Canvas is unavailable.
 *
 * fontSize, fontFamily etc. fall back to DEFAULT_TEXT_STYLE from Document.ts.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

import type {
  Paragraph,
  ParagraphStyle,
  TextRun,
  InlineWidget,
  TextFrame,
} from '../src/types/Document.js';
import type { ParagraphLayoutResult, Span } from '../src/types/LayoutTypes.js';
import type { TextFrameLayoutResult } from '../src/layout/TextFrameLayoutEngine.js';
import { ParagraphLayoutEngine } from '../src/layout/ParagraphLayoutEngine.js';
import { fontMetricsProvider } from '../src/measure/FontMetricsProvider.js';
import { assertLineInvariants } from '../src/layout/LineBoxValidator.js';
import { DEFAULT_PARAGRAPH_STYLE } from '../src/types/Document.js';
import getSystemFonts from 'get-system-fonts';

// ── Singleton ──────────────────────────────────────────────────────────

export const engine = new ParagraphLayoutEngine();

// ── Canvas detection ───────────────────────────────────────────────────

/**
 * Check whether @napi-rs/canvas is available (Bun/Node.js).
 * Returns false in browser environments where document.createElement is native.
 */
export function hasCanvas(): boolean {
  try {
    const mod = (Function('return require("@napi-rs/canvas")'))();
    return !!mod.createCanvas;
  } catch {
    return false;
  }
}

// ── Unifont registration ──────────────────────────────────────────────

/** Register Unifont for deterministic tests. */
export async function registerUnifont(): Promise<void> {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const fontPath = resolve(__dirname, 'fixtures', 'unifont-17.0.05.otf');
  if (!existsSync(fontPath)) {
    throw new Error(`Unifont not found at ${fontPath}`);
  }
  const data = readFileSync(fontPath);
  await fontMetricsProvider.registerFont('Unifont', { weight: 'normal', style: 'normal' }, data);
}

// ── Arial variants registration ──────────────────────────────────────

/** Parse font subfamily name → { weight, style }. */
function parseSubfamily(subfamily: string): { weight: string; style: string } {
  const lower = subfamily.toLowerCase();
  const style = lower.includes('italic') ? 'italic' : 'normal';

  let weight: string;
  if (lower.includes('thin') || lower.includes('hairline')) {
    weight = 'thin';
  } else if (lower.includes('extralight') || lower.includes('ultralight')) {
    weight = 'extralight';
  } else if (lower.includes('light')) {
    weight = 'light';
  } else if (lower.includes('semibold') || lower.includes('demibold')) {
    weight = 'semibold';
  } else if (lower.includes('bold') || lower.includes('heavy') || lower.includes('black')) {
    weight = 'bold';
  } else if (lower.includes('medium')) {
    weight = 'medium';
  } else {
    weight = 'normal';
  }
  return { weight, style };
}

/**
 * Find and register Arial font variants (Regular, Bold, Italic, Bold Italic)
 * from the system. Uses get-system-fonts to locate font files.
 * If Arial is not found, logs a warning — tests that require Arial
 * should be guarded by hasCanvas().
 *
 * @param mockPaths — optional override for getSystemFonts() result (for testing)
 */
export async function registerArialVariants(mockPaths?: string[]): Promise<void> {
  try {
    let fontPaths: string[];
    if (mockPaths !== undefined) {
      fontPaths = mockPaths;
    } else {
      fontPaths = await getSystemFonts();
    }
    const arialPaths = fontPaths.filter((p) => {
      const name = p.toLowerCase().replace(/\\/g, '/').split('/').pop() || '';
      return name.startsWith('arial') && (name.endsWith('.ttf') || name.endsWith('.otf'));
    });

    if (arialPaths.length === 0) {
      console.warn('Arial font files not found on the system — Arial font weight tests will be skipped.');
      return;
    }

    // Dynamic import — fontkit may not be available
    let fontkit: any;
    try {
      fontkit = await import('fontkit');
      fontkit = fontkit.default || fontkit;
    } catch {
      console.warn('fontkit not available — cannot register Arial variants.');
      return;
    }

    for (const fontPath of arialPaths) {
      try {
        const buffer = readFileSync(fontPath);
        const font = fontkit.create(buffer);
        const family = font.familyName;
        if (!family || !family.toLowerCase().startsWith('arial')) continue;

        const { weight, style } = parseSubfamily(font.subfamilyName || 'Regular');
        await fontMetricsProvider.registerFont(family, { weight, style }, buffer, fontPath);
        console.log(`Registered: ${family} (${weight}/${style})`);
      } catch {
        // Skip individual file errors
      }
    }
  } catch (err) {
    console.warn('Failed to register Arial variants:', err);
  }
}

// ── Default paragraph style ───────────────────────────────────────────

const BASE_PARAGRAPH_STYLE: ParagraphStyle = {
  alignment: 'left',
  lineHeight: 1.15,
  spaceBefore: 0,
  spaceAfter: 0,
  whiteSpace: 'normal',
};

// ── Paragraph builders ─────────────────────────────────────────────────

export interface RunInput {
  text: string;
  style?: Partial<TextRun>;
  inlineWidget?: InlineWidget;
  type?: 'text' | 'inline-box';
}

/**
 * Create a single-run paragraph with optional style overrides.
 *
 * @example
 * makeParagraph('Hello');                    // DEFAULT_TEXT_STYLE
 * makeParagraph('Hello', { fontSize: 32 });  // fontSize: 32
 */
export function makeParagraph(
  text: string,
  overrides?: Partial<TextRun>,
): Paragraph {
  const run: TextRun = {
    text,
    type: overrides?.type || 'text',
    ...(overrides || {}),
  } as TextRun;

  return {
    children: [run],
    style: { ...BASE_PARAGRAPH_STYLE },
  };
}

/**
 * Create a single-run paragraph with a different font family (system font).
 * Used for cross-font metric comparisons.
 *
 * @example
 * makeStyledParagraph('Hello', { fontFamily: 'Arial' });
 */
export function makeStyledParagraph(
  text: string,
  styleOverrides: Partial<TextRun>,
): Paragraph {
  return makeParagraph(text, styleOverrides);
}

/**
 * Create a multi-run paragraph with different styles per run.
 *
 * @example
 * makeMultiRunParagraph([
 *   { text: 'Unifont ' },
 *   { text: 'Arial', style: { fontFamily: 'Arial' } },
 * ]);
 */
export function makeMultiRunParagraph(runs: RunInput[]): Paragraph {
  const children: TextRun[] = runs.map((r) => {
    if (r.type === 'inline-box') {
      return {
        type: 'inline-box',
        text: '\uFFFC',
        ...(r.style || {}),
        inlineWidget: r.inlineWidget,
      } as TextRun;
    }
    return {
      type: 'text',
      ...(r.style || {}),
      text: r.text,
    } as TextRun;
  });

  return {
    children,
    style: { ...BASE_PARAGRAPH_STYLE },
  };
}

// ── TextFrame builder ─────────────────────────────────────────────────

const DEFAULT_TEXT_FRAME_STYLE = {
  wrap: true,
};

/**
 * Create a TextFrame with the given paragraphs and optional frame overrides.
 */
export function makeTextFrame(
  paragraphs: Paragraph[],
  overrides?: Partial<TextFrame>,
): TextFrame {
  return {
    ...DEFAULT_TEXT_FRAME_STYLE,
    ...overrides,
    paragraphs,
  };
}

// ── TextFrame layout helper ───────────────────────────────────────────

/**
 * Flat array of all spans from a TextFrameLayoutResult.
 */
export function allTextFrameSpans(result: TextFrameLayoutResult): Span[] {
  return result.lines.flatMap((l) => l.spans);
}

// ── Layout helper ──────────────────────────────────────────────────────

/**
 * Layout a paragraph at a given maxWidth.
 * Runs invariant checks automatically.
 *
 * @returns ParagraphLayoutResult with lines, contentWidth, etc.
 */
export function layoutParagraph(
  paragraph: Paragraph,
  maxWidth: number = 500,
  yOffset: number = 0,
): ParagraphLayoutResult {
  const result = engine.layout(paragraph, maxWidth, yOffset);
  const fullText = paragraph.children.map((r) => r.text).join('');
  assertLineInvariants(result.lines, fullText, maxWidth);
  return result;
}

// ── Convenience assertion helpers ──────────────────────────────────────

/** Get all spans from a result (flat across all lines). */
export function allSpans(result: ParagraphLayoutResult): Span[] {
  return result.lines.flatMap((l) => l.spans);
}

/** Get all text spans from a result (only type: 'text', not 'space'). */
export function allTextSpans(result: ParagraphLayoutResult): Span[] {
  return allSpans(result).filter((f) => f.type === 'text');
}

/** Get all space spans from a result. */
export function allSpaceSpans(result: ParagraphLayoutResult): Span[] {
  return allSpans(result).filter((f) => f.type === 'space');
}

/** Get span text, ignoring trailing. */
export function spanTexts(result: ParagraphLayoutResult): string[] {
  return allSpans(result).map((f) => f.text);
}

/** Get the last span of the last line. */
export function lastSpan(result: ParagraphLayoutResult): Span | undefined {
  const lastLine = result.lines[result.lines.length - 1];
  if (!lastLine) return undefined;
  return lastLine.spans[lastLine.spans.length - 1];
}
