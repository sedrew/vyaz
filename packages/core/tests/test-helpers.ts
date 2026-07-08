/**
 * test-helpers.ts — shared helpers for all tests.
 *
 * Import instead of duplicating makeParagraph etc. in every test file.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Paragraph, TextRun } from '../src/types/Document.js';
import { DEFAULT_PARAGRAPH_STYLE } from '../src/types/Document.js';
import type { LineBox } from '../src/types/LayoutTypes.js';
import { renderToCanvas } from '../src/render/CanvasRenderer.js';
import type { CanvasRenderOptions } from '../src/render/CanvasRenderer.js';
import { computeBBox } from '../src/render/utils.js';

// ── Paragraph builders ───────────────────────────────────────────────────

/** Default base style for text runs. */
const BASE_RUN: Omit<TextRun, 'text' | 'type'> = {
  fontFamily: 'Unifont',
  fontSize: 16,
  fontWeight: 400,
  fontStyle: 'normal',
  color: '#000000',
  underline: false,
  strikethrough: false,
};

/** Create a single-run paragraph with the given text. */
export function makeParagraph(text: string, fontSize: number = 16): Paragraph {
  return {
    id: 'test-p',
    style: { ...DEFAULT_PARAGRAPH_STYLE, alignment: 'left', lineHeight: 1.2 },
    children: [
      {
        type: 'text',
        text,
        ...BASE_RUN,
        fontSize,
      },
    ],
  };
}

/** Style overrides type for test helpers. */
export type TextStyleOverrides = Partial<Pick<TextRun, 'fontFamily' | 'fontSize' | 'fontWeight' | 'fontStyle' | 'color' | 'underline' | 'strikethrough' | 'letterSpacing' | 'script'>>;

/**
 * Create a paragraph with custom text style overrides.
 * Use for font-weight, font-style, font-size, color, etc.
 */
export function makeStyledParagraph(
  text: string,
  styleOverrides: TextStyleOverrides,
): Paragraph {
  return {
    id: 'test-p',
    style: { ...DEFAULT_PARAGRAPH_STYLE, alignment: 'left', lineHeight: 1.2 },
    children: [
      {
        type: 'text',
        text,
        ...BASE_RUN,
        ...styleOverrides,
      },
    ],
  };
}

/**
 * A single text run for a multi-run paragraph.
 */
export interface TestTextRun {
  text: string;
  style?: TextStyleOverrides;
}

/**
 * Create a paragraph with multiple text runs, each with its own style.
 *
 * Example:
 *   makeMultiRunParagraph([
 *     { text: 'Normal ' },
 *     { text: 'Bold', style: { fontWeight: 700 } },
 *   ])
 */
export function makeMultiRunParagraph(runs: TestTextRun[]): Paragraph {
  return {
    id: 'test-p',
    style: { ...DEFAULT_PARAGRAPH_STYLE, alignment: 'left', lineHeight: 1.2 },
    children: runs.map((run) => ({
      type: 'text' as const,
      text: run.text,
      ...BASE_RUN,
      ...run.style,
    })),
  };
}

// ── SVG snapshot helper ──────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SNAPSHOT_DIR = resolve(__dirname, 'snapshots');

/**
 * Assert that an SVG string matches a stored .svg file.
 * First run creates the file; subsequent runs compare.
 */
export function assertSvgSnapshot(name: string, svg: string): void {
  const path = resolve(SNAPSHOT_DIR, `${name}.svg`);

  if (!existsSync(path)) {
    mkdirSync(SNAPSHOT_DIR, { recursive: true });
    writeFileSync(path, svg, 'utf-8');
    return;
  }

  const expected = readFileSync(path, 'utf-8');
  expect(svg).toBe(expected);
}

/**
 * Assert that a <tspan> element with the given text contains the expected
 * SVG presentation attribute(s).
 *
 * Example:
 *   assertSvgTspanAttr(svg, 'Red', 'fill="#FF0000"');
 *   assertSvgTspanAttr(svg, 'Bold', 'font-weight="700"');
 */
export function assertSvgTspanAttr(svg: string, text: string, ...attrs: string[]): void {
  // Build regex: <tspan ... attr1 ... attr2 ...>text</tspan>
  // Each attr is matched as a literal substring in any order
  const attrPattern = attrs.map(a => `[^>]*${escapeRegex(a)}`).join('');
  const pattern = new RegExp(`<tspan${attrPattern}[^>]*>${escapeRegex(text)}<\\/tspan>`);
  expect(svg).toMatch(pattern);
}

/** Escape regex special characters for literal matching. */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ── Render snapshot fixture (SVG + Canvas) ────────────────────────────────

/**
 * Global fixture flag: when enabled, `assertRender` will also render a
 * Canvas PNG snapshot alongside the SVG.
 *
 * Set via:
 *   import { enableCanvasSnapshots } from './test-helpers.js';
 *   enableCanvasSnapshots();
 */
let canvasSnapshotsEnabled = false;

/**
 * Enable Canvas PNG snapshots as a fixture alongside SVG snapshots.
 * Call this at the top of a describe block or test file.
 */
export function enableCanvasSnapshots(): void {
  canvasSnapshotsEnabled = true;
}

/**
 * Combined SVG + Canvas render snapshot fixture.
 *
 * Always saves an SVG. If `enableCanvasSnapshots()` has been called,
 * also renders the LineBox[] to an OffscreenCanvas and saves a PNG.
 *
 * Future renderers (PDF, WebGL, etc.) can be added here.
 *
 * @param name   — snapshot name (used for both SVG and Canvas PNG)
 * @param svg    — SVG string (saved as {name}.svg)
 * @param lines  — LineBox[] (rendered to canvas as canvas-{name}.png when fixture is on)
 * @param canvasOptions — optional Canvas render options
 */
export async function assertRender(
  name: string,
  svg: string,
  lines?: LineBox[],
  canvasOptions?: CanvasRenderOptions,
): Promise<void> {
  // Always save SVG
  assertSvgSnapshot(name, svg);

  // Save Canvas PNG when fixture is enabled and lines provided
  if (canvasSnapshotsEnabled && lines) {
    const bbox = computeBBox(lines);
    const canvas = new OffscreenCanvas(Math.ceil(bbox.width + 8), Math.ceil(bbox.height + 8));
    const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;

    renderToCanvas(ctx, lines, {
      sizing: 'frame',
      preserveSpaces: true,
      ...canvasOptions,
    });

    const blob = await canvas.convertToBlob({ type: 'image/png' });
    const buffer = await blob.arrayBuffer();

    const pngDir = resolve(SNAPSHOT_DIR, 'png');
    mkdirSync(pngDir, { recursive: true });
    writeFileSync(resolve(pngDir, `canvas-${name}.png`), Buffer.from(buffer));
  }
}

/**
 * Legacy Canvas snapshot helper — kept for backwards compatibility.
 * Use `assertRender` instead for new tests.
 */
export async function assertCanvasSnapshot(
  name: string,
  renderFn: (ctx: OffscreenCanvasRenderingContext2D) => void,
  width: number = 800,
  height: number = 600,
): Promise<void> {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;

  renderFn(ctx);

  const blob = await canvas.convertToBlob({ type: 'image/png' });
  const buffer = await blob.arrayBuffer();

  const pngDir = resolve(SNAPSHOT_DIR, 'png');
  const path = resolve(pngDir, `canvas-${name}.png`);

  mkdirSync(pngDir, { recursive: true });
  writeFileSync(path, Buffer.from(buffer));
}