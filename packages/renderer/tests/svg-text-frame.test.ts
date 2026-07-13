/**
 * svg-text-frame.test.ts — SVG rendering tests for TextFrame.
 *
 * Covers layoutTextFrame → renderToSVG pipeline with snapshot SVG files.
 *
 * Snapshots are stored in tests/snapshots/textframe-*.svg
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  registerUnifont,
  registerArialVariants,
  makeParagraph,
  makeTextFrame,
  makeStyledParagraph,
} from '../../core/tests/helpers.ts';
import { layoutTextFrame } from '../../core/src/layout/TextFrameLayoutEngine.js';
import { renderToSVG } from '../src/SVGRenderer.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_DIR = resolve(__dirname, 'snapshots');

function snapshotPath(name: string): string {
  return resolve(SNAPSHOT_DIR, name);
}

/**
 * Read a snapshot file or return null if it doesn't exist.
 */
function readSnapshot(name: string): string | null {
  const path = snapshotPath(name);
  try {
    return readFileSync(path, 'utf-8');
  } catch {
    return null;
  }
}

beforeAll(async () => {
  await registerUnifont();
  await registerArialVariants();
  if (!existsSync(SNAPSHOT_DIR)) {
    mkdirSync(SNAPSHOT_DIR, { recursive: true });
  }
});

// ── Helpers ─────────────────────────────────────────────────────────────

interface FrameOverrides {
  width?: number;
  height?: number;
  wrap?: boolean;
  padding?: { top: number; right: number; bottom: number; left: number };
}

function renderTextFrameSVG(
  paragraphs: ReturnType<typeof makeParagraph>[],
  frameOpts?: FrameOverrides,
  renderOpts?: Record<string, unknown>,
): string {
  const frame = makeTextFrame(paragraphs, frameOpts as any);
  const result = layoutTextFrame(frame);

  return renderToSVG(result.lines, {
    sizing: {
      horizontal: result.fitHorizontal === 'frame' && result.frameWidth ? 'frame' : 'content',
      vertical: result.fitVertical === 'frame' && result.frameHeight ? 'frame' : 'content',
    },
    width: result.fitHorizontal === 'frame' && result.frameWidth ? result.frameWidth : result.contentWidth,
    height: result.fitVertical === 'frame' && result.frameHeight ? result.frameHeight : result.contentHeight,
    debug: { frameBox: true, contentBox: true },
    ...renderOpts,
  } as any);
}

// ── Tests ───────────────────────────────────────────────────────────────

describe('TextFrame SVG snapshots', () => {
  test('textframe-basic-flat.svg: single paragraph, flat preset', () => {
    const svg = renderTextFrameSVG(
      [makeParagraph('Hello World')],
      undefined,
      { preset: 'flat' },
    );
    const name = 'textframe-basic-flat.svg';
    const expected = readSnapshot(name);
    if (expected) {
      expect(svg.trim()).toBe(expected.trim());
    } else {
      writeFileSync(snapshotPath(name), svg);
      expect(svg).toBeTruthy();
    }
  });

  test('textframe-two-paragraphs.svg: two paragraphs, flat preset', () => {
    const svg = renderTextFrameSVG(
      [makeParagraph('First paragraph'), makeParagraph('Second paragraph')],
      undefined,
      { preset: 'flat' },
    );
    const name = 'textframe-two-paragraphs.svg';
    const expected = readSnapshot(name);
    if (expected) {
      expect(svg.trim()).toBe(expected.trim());
    } else {
      writeFileSync(snapshotPath(name), svg);
      expect(svg).toBeTruthy();
    }
  });

  test('textframe-wrap.svg: wrapped text, flat preset', () => {
    const svg = renderTextFrameSVG(
      [makeParagraph('Hello World How Are You Today')],
      { width: 80, wrap: true },
      { preset: 'flat' },
    );
    const name = 'textframe-wrap.svg';
    const expected = readSnapshot(name);
    if (expected) {
      expect(svg.trim()).toBe(expected.trim());
    } else {
      writeFileSync(snapshotPath(name), svg);
      expect(svg).toBeTruthy();
    }
  });

  test('textframe-padding.svg: padding, flat preset', () => {
    const svg = renderTextFrameSVG(
      [makeParagraph('Hello')],
      { padding: { top: 15, right: 20, bottom: 15, left: 20 } },
      { preset: 'flat' },
    );
    const name = 'textframe-padding.svg';
    const expected = readSnapshot(name);
    if (expected) {
      expect(svg.trim()).toBe(expected.trim());
    } else {
      writeFileSync(snapshotPath(name), svg);
      expect(svg).toBeTruthy();
    }
  });

  test('textframe-frame-width-browser.svg: frame width, browser preset', () => {
    const svg = renderTextFrameSVG(
      [makeParagraph('Hello World')],
      { width: 300 },
      { preset: 'browser' },
    );
    const name = 'textframe-frame-width-browser.svg';
    const expected = readSnapshot(name);
    if (expected) {
      expect(svg.trim()).toBe(expected.trim());
    } else {
      writeFileSync(snapshotPath(name), svg);
      expect(svg).toBeTruthy();
    }
  });

  test('textframe-frame-size-browser.svg: frame width+height, browser preset', () => {
    const svg = renderTextFrameSVG(
      [makeParagraph('Hello World')],
      { width: 300, height: 200 },
      { preset: 'browser' },
    );
    const name = 'textframe-frame-size-browser.svg';
    const expected = readSnapshot(name);
    if (expected) {
      expect(svg.trim()).toBe(expected.trim());
    } else {
      writeFileSync(snapshotPath(name), svg);
      expect(svg).toBeTruthy();
    }
  });

  test('textframe-two-paragraphs-browser.svg: two paragraphs, browser preset', () => {
    const svg = renderTextFrameSVG(
      [makeParagraph('First paragraph'), makeParagraph('Second paragraph')],
      undefined,
      { preset: 'browser' },
    );
    const name = 'textframe-two-paragraphs-browser.svg';
    const expected = readSnapshot(name);
    if (expected) {
      expect(svg.trim()).toBe(expected.trim());
    } else {
      writeFileSync(snapshotPath(name), svg);
      expect(svg).toBeTruthy();
    }
  });

  test('textframe-alignment-right.svg: right alignment, flat preset', () => {
    const p = makeParagraph('Hello');
    p.style.alignment = 'right';
    const svg = renderTextFrameSVG(
      [p],
      { width: 400 },
      { preset: 'flat' },
    );
    const name = 'textframe-alignment-right.svg';
    const expected = readSnapshot(name);
    if (expected) {
      expect(svg.trim()).toBe(expected.trim());
    } else {
      writeFileSync(snapshotPath(name), svg);
      expect(svg).toBeTruthy();
    }
  });

  test('textframe-alignment-center.svg: center alignment, flat preset', () => {
    const p = makeParagraph('Hello');
    p.style.alignment = 'center';
    const svg = renderTextFrameSVG(
      [p],
      { width: 400 },
      { preset: 'flat' },
    );
    const name = 'textframe-alignment-center.svg';
    const expected = readSnapshot(name);
    if (expected) {
      expect(svg.trim()).toBe(expected.trim());
    } else {
      writeFileSync(snapshotPath(name), svg);
      expect(svg).toBeTruthy();
    }
  });

  test('textframe-padding-left.svg: padding left shift', () => {
    const svg = renderTextFrameSVG(
      [makeParagraph('Hello')],
      { width: 300, padding: { left: 30, top: 10, right: 0, bottom: 0 } },
      { preset: 'flat' },
    );
    const name = 'textframe-padding-left.svg';
    const expected = readSnapshot(name);
    if (expected) {
      expect(svg.trim()).toBe(expected.trim());
    } else {
      writeFileSync(snapshotPath(name), svg);
      expect(svg).toBeTruthy();
    }
  });
});