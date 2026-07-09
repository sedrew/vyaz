/**
 * helpers.ts — SVG renderer test helpers.
 *
 * Provides a full TextFrame → layoutTextFrame → renderToSVG pipeline.
 * All tests default to Unifont (registered in beforeAll) for deterministic metrics.
 * Snapshot helpers write/compare .svg files in tests/snapshots/.
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { fontMetricsProvider, layoutTextFrame } from '@vyaz/core';
import type {
  Paragraph,
  TextFrame,
  TextRun,
  InlineWidget,
  TextAlignment,
  TextFrameLayoutResult,
} from '@vyaz/core';

// SVG renderer
import { renderToSVG } from '../src/SVGRenderer.js';
export { renderToSVG };
export type { SVGRenderOptions, SvgPreset } from '../src/SVGRenderer.js';

// ── Snapshot directory ────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
export const SNAPSHOTS_DIR = resolve(__dirname, 'snapshots');

/**
 * Match SVG output against a file-based snapshot.
 *
 * On first run: writes the SVG to snapshots/{name}.svg
 * On subsequent runs: compares current SVG to the saved file.
 *
 * Use expect() for assertion so diff output is clear.
 */
export function matchSvgSnapshot(name: string, svg: string): void {
  if (!existsSync(SNAPSHOTS_DIR)) {
    mkdirSync(SNAPSHOTS_DIR, { recursive: true });
  }
  const filePath = resolve(SNAPSHOTS_DIR, `${name}.svg`);

  if (!existsSync(filePath)) {
    // First run — create snapshot
    writeFileSync(filePath, svg, 'utf-8');
    // Use expect() so Bun tracks it as a test assertion
    expect(true).toBe(true);
    return;
  }

  const expected = readFileSync(filePath, 'utf-8');
  expect(svg).toBe(expected);
}

// Need expect for matchSvgSnapshot
import { expect } from 'bun:test';

// ── Unifont registration ──────────────────────────────────────────────────

/**
 * Register Unifont under several weight/style combos.
 * Only 'normal/normal' uses real font data — the rest are mocked
 * since Unifont is a single-weight font. For SVG attribute tests
 * the metrics don't matter, only the attribute values.
 */
export async function registerUnifont(): Promise<void> {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const fontPath = resolve(__dirname, '../../core/tests/fixtures/unifont-17.0.05.otf');
  if (!existsSync(fontPath)) {
    throw new Error(`Unifont not found at ${fontPath}`);
  }
  const data = readFileSync(fontPath);
  // Real Unifont — normal weight, normal style
  await fontMetricsProvider.registerFont('Unifont', { weight: 'normal', style: 'normal' }, data);
  // Also register the same file for bold and italic — metrics won't match real bold/italic
  // but for SVG attribute tests we only verify the attribute values, not the positions
  await fontMetricsProvider.registerFont('Unifont', { weight: 'bold', style: 'normal' }, data);
  await fontMetricsProvider.registerFont('Unifont', { weight: 'normal', style: 'italic' }, data);
}

// ── Default paragraph style ───────────────────────────────────────────────

const BASE_PARAGRAPH_STYLE = {
  alignment: 'left' as TextAlignment,
  lineHeight: 1.15,
  spaceBefore: 0,
  spaceAfter: 0,
  whiteSpace: 'normal' as const,
};

// ── Paragraph builders ────────────────────────────────────────────────────

export interface RunInput {
  text: string;
  style?: Partial<TextRun>;
  inlineWidget?: InlineWidget;
  type?: 'text' | 'inline-box';
}

/**
 * Create a single-run paragraph. Defaults to Unifont for deterministic tests.
 */
export function makeParagraph(text: string, overrides?: Partial<TextRun>): Paragraph {
  const run: TextRun = {
    text,
    type: overrides?.type || 'text',
    fontFamily: 'Unifont',
    ...(overrides || {}),
  } as TextRun;

  return {
    children: [run],
    style: { ...BASE_PARAGRAPH_STYLE },
  };
}

/**
 * Create a multi-run paragraph with different styles per run.
 */
export function makeMultiRunParagraph(runs: RunInput[]): Paragraph {
  const children: TextRun[] = runs.map((r) => {
    if (r.type === 'inline-box') {
      return {
        type: 'inline-box',
        text: '\uFFFC',
        fontFamily: 'Unifont',
        ...(r.style || {}),
        inlineWidget: r.inlineWidget,
      } as TextRun;
    }
    return {
      type: 'text',
      fontFamily: 'Unifont',
      ...(r.style || {}),
      text: r.text,
    } as TextRun;
  });

  return {
    children,
    style: { ...BASE_PARAGRAPH_STYLE },
  };
}

// ── TextFrame builder ─────────────────────────────────────────────────────

/**
 * Build a TextFrame with a single paragraph and sensible defaults.
 */
export function makeTextFrame(
  paragraph: Paragraph,
  frameOverrides?: Partial<TextFrame>,
): TextFrame {
  return {
    width: 500,
    wrap: true,
    paragraphs: [paragraph],
    ...frameOverrides,
  };
}

// ── Full pipeline: TextFrame → SVG ────────────────────────────────────────

/**
 * Run the full pipeline: TextFrame → layoutTextFrame → renderToSVG.
 *
 * Uses sizing='content' by default so SVG dimensions match the content bbox.
 */
export function renderFrameToSVG(
  frame: TextFrame,
  options?: Partial<import('../src/SVGRenderer.js').SVGRenderOptions>,
): { result: TextFrameLayoutResult; svg: string } {
  const result = layoutTextFrame(frame);
  const svg = renderToSVG(result.lines, {
    sizing: 'content',
    ...options,
  });
  return { result, svg };
}