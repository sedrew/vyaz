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
// Public value imports go through '@vyaz/core', not a relative 'src/' path —
// see the long comment on this exact issue in git blame / CHANGELOG: Node has
// no "bun" package.json export condition, so a package-specifier import
// resolves to dist/ while a relative import stays on src/ — two different
// module instances of the same stateful singleton (fontMetricsProvider).
// Every *.test.ts in this package now imports its public @vyaz/core symbols
// (layoutTextFrame, fontMetricsProvider, etc.) the same way, including this
// file, so they all share one instance regardless of runtime.
// `assertLineInvariants` stays relative — not part of the public API, and a
// pure function, so it has no shared state to diverge on.
import { ParagraphLayoutEngine, fontMetricsProvider, DEFAULT_PARAGRAPH_STYLE } from '@vyaz/core';
import { assertLineInvariants } from '../src/layout/LineBoxValidator.js';
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

// ── Fixture font registration (Roboto / Inter / GreatVibes) ───────────

/**
 * Register the libre test fonts from `tests/fixtures/` (see FONTS.md).
 * Variable fonts are pinned to concrete instances: `wght` 400/700 for Roboto
 * and Inter, plus `opsz` for Inter so widths match `font-optical-sizing: auto`
 * at the given size. `optSize` defaults to 16.
 */
export async function registerFixtureFonts(optSize = 16): Promise<void> {
  const dir = resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures');
  const read = (f: string) => readFileSync(resolve(dir, f));

  await fontMetricsProvider.registerFont('Roboto', { weight: 'normal' }, read('Roboto-VariableFont_wdth,wght.ttf'));
  await fontMetricsProvider.registerFont('Roboto', { weight: 'bold', variation: { wght: 700 } }, read('Roboto-VariableFont_wdth,wght.ttf'));

  const inter = read('Inter-Variable.ttf');
  const opsz = Math.max(14, Math.min(32, optSize));
  await fontMetricsProvider.registerFont('Inter', { weight: 'normal', variation: { opsz } }, inter);
  await fontMetricsProvider.registerFont('Inter', { weight: 'bold', variation: { opsz, wght: 700 } }, inter);

  await fontMetricsProvider.registerFont('GreatVibes', { weight: 'normal' }, read('GreatVibes-Regular.ttf'));
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

/** True when `registerArialVariants` found the real system Arial (false: Roboto stands in). */
let realArial = false;
export const hasRealArial = (): boolean => realArial;

const isArialFile = (p: string): boolean => {
  const name = p.toLowerCase().replace(/\\/g, '/').split('/').pop() || '';
  return name.startsWith('arial') && (name.endsWith('.ttf') || name.endsWith('.otf'));
};

/**
 * Whether the real Arial is installed — known at *import* time, because
 * `describe.skipIf(!REAL_ARIAL)` is decided while the file is collected,
 * before any `beforeAll` runs. Tests that lean on Arial's own tables (its
 * classic `kern` table, its exact advances) use it to skip on a machine
 * without Arial; CI installs it and sets `VYAZ_REQUIRE_ARIAL=1`, so a
 * failed font install fails the job loudly instead of skipping silently.
 */
export const REAL_ARIAL: boolean = await (async () => {
  let found = false;
  try { found = (await getSystemFonts()).some(isArialFile); } catch { /* no font discovery here */ }
  if (!found && process.env.VYAZ_REQUIRE_ARIAL) {
    throw new Error('VYAZ_REQUIRE_ARIAL is set but no system Arial was found — is the font package installed?');
  }
  return found;
})();

/**
 * Register Arial for the suite — `DEFAULT_TEXT_STYLE.fontFamily` is `'Arial'`,
 * so almost every test lays text out in it.
 *
 * Uses the real system Arial (Regular, Bold, Italic, Bold Italic, found with
 * get-system-fonts) when installed — macOS, Windows. On a runner without it
 * (Ubuntu CI) the fixture Roboto is registered under the name `Arial` instead,
 * so tests that only need "some proportional default font" stay hermetic.
 * Tests that depend on Arial's own tables (its `kern` table, its exact
 * advances) must skip with `hasRealArial()`.
 *
 * @param mockPaths — optional override for getSystemFonts() result (for testing)
 */
export async function registerArialVariants(mockPaths?: string[]): Promise<void> {
  realArial = false;
  try {
    let fontPaths: string[];
    if (mockPaths !== undefined) {
      fontPaths = mockPaths;
    } else {
      fontPaths = await getSystemFonts();
    }
    const arialPaths = fontPaths.filter(isArialFile);

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
        realArial = true;
      } catch {
        // Skip individual file errors
      }
    }
    if (realArial) return;

    console.warn('Arial font files not found on the system — Arial font weight tests will be skipped.');
    await registerRobotoAsArial();
  } catch (err) {
    console.warn('Failed to register Arial variants:', err);
  }
}

/** Stand-in for a missing system Arial: fixture Roboto (variable) registered as `Arial`, all four variants. */
async function registerRobotoAsArial(): Promise<void> {
  const dir = resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures');
  const roboto = readFileSync(resolve(dir, 'Roboto-VariableFont_wdth,wght.ttf'));
  for (const style of ['normal', 'italic'] as const) {
    await fontMetricsProvider.registerFont('Arial', { weight: 'normal', style }, roboto);
    await fontMetricsProvider.registerFont('Arial', { weight: 'bold', style, variation: { wght: 700 } }, roboto);
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

// ── Layout with per-glyph advances ────────────────────────────────────

/**
 * Layout a paragraph with per-glyph advance widths (for SVG glyph mode).
 *
 * @example
 * layoutGlyphParagraph(makeStyledParagraph('Hello', { fontFamily: 'Arial' }));
 */
export function layoutGlyphParagraph(
  paragraph: Paragraph,
  maxWidth: number = 500,
  yOffset: number = 0,
): ParagraphLayoutResult {
  return engine.layoutGlyph(paragraph, maxWidth, yOffset);
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
