/**
 * svg-list.test.ts — SVG rendering tests for bullet / numbered lists.
 *
 * Covers layoutTextFrame → renderToSVG pipeline with list markers.
 * Snapshots are stored in tests/snapshots/list-*.svg
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'svg-parser';
import type { RootNode, ElementNode } from 'svg-parser';

import { registerUnifont } from '../../core/tests/helpers.ts';
import { layoutTextFrame } from '../../core/src/layout/TextFrameLayoutEngine.js';
import type { Paragraph, TextRun, ListStyle, TextFrame } from '../../core/src/types/Document.js';
import { renderToSVG } from '../src/SVGRenderer.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_DIR = resolve(__dirname, 'snapshots');

function snapshotPath(name: string): string {
  return resolve(SNAPSHOT_DIR, name);
}

function readSnapshot(name: string): string | null {
  const path = snapshotPath(name);
  try {
    return readFileSync(path, 'utf-8');
  } catch {
    return null;
  }
}

function assertSnapshot(name: string, svg: string): void {
  const expected = readSnapshot(name);
  if (expected) {
    expect(svg.trim()).toBe(expected.trim());
  } else {
    writeFileSync(snapshotPath(name), svg);
    expect(svg).toBeTruthy();
  }
}

beforeAll(async () => {
  await registerUnifont();
  if (!existsSync(SNAPSHOT_DIR)) {
    mkdirSync(SNAPSHOT_DIR, { recursive: true });
  }
});

// ── Builders ────────────────────────────────────────────────────────────

function makeRun(text: string): TextRun {
  return {
    type: 'text',
    text,
    fontFamily: 'Unifont',
    fontSize: 16,
    fontWeight: 'normal',
    fontStyle: 'normal',
    color: '#000000',
  };
}

function makeListParagraph(text: string, listStyle: ListStyle, listRestart?: boolean): Paragraph {
  return {
    children: [makeRun(text)],
    style: {
      alignment: 'left',
      lineHeight: 1.15,
      spaceBefore: 0,
      spaceAfter: 0,
      whiteSpace: 'normal',
      listStyle,
      ...(listRestart ? { listRestart: true } : {}),
    },
  };
}

function renderListSVG(
  paragraphs: Paragraph[],
  frameOpts?: Partial<TextFrame>,
  renderOpts?: Record<string, unknown>,
): { svg: string; lines: ReturnType<typeof layoutTextFrame>['lines'] } {
  const frame: TextFrame = {
    width: 400,
    wrap: true,
    paragraphs,
    ...frameOpts,
  };
  const result = layoutTextFrame(frame);
  const svg = renderToSVG(result.lines, {
    sizing: 'content',
    contentPadding: 10,
    preset: 'flat',
    debug: { frameBox: true, contentBox: true },
    ...renderOpts,
  } as any);
  return { svg, lines: result.lines };
}

// ── SVG helpers ─────────────────────────────────────────────────────────

function findElements(node: ElementNode | RootNode, tag: string): ElementNode[] {
  const found: ElementNode[] = [];
  if ('tagName' in node && node.tagName === tag) {
    found.push(node);
  }
  if (node.children) {
    for (const child of node.children) {
      if (typeof child === 'object') {
        found.push(...findElements(child as ElementNode | RootNode, tag));
      }
    }
  }
  return found;
}

/** Collect all text content from SVG text/tspan nodes. */
function collectTextContent(node: ElementNode | RootNode): string[] {
  const texts: string[] = [];
  if ('type' in node && (node as any).type === 'text' && typeof (node as any).value === 'string') {
    texts.push((node as any).value);
  }
  if ('children' in node && node.children) {
    for (const child of node.children) {
      if (typeof child === 'object') {
        texts.push(...collectTextContent(child as ElementNode | RootNode));
      } else if (typeof child === 'string') {
        texts.push(child);
      }
    }
  }
  // svg-parser stores text as children strings or text nodes
  if ('children' in node && Array.isArray(node.children)) {
    for (const child of node.children) {
      if (typeof child === 'string') {
        texts.push(child);
      }
    }
  }
  return texts;
}

function getAllSvgText(svg: string): string {
  // Simple extraction: strip tags and get text content
  return svg.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

// ── Snapshot tests ──────────────────────────────────────────────────────

describe('List SVG snapshots', () => {
  test('list-bullet-basic.svg: two bullet items', () => {
    const { svg, lines } = renderListSVG([
      makeListParagraph('First item', { type: 'bullet', level: 0 }),
      makeListParagraph('Second item', { type: 'bullet', level: 0 }),
    ]);

    // Structural: each first line of paragraph has a marker span
    const markers = lines
      .map(l => l.spans.find(s => s.type === 'marker'))
      .filter(Boolean);
    expect(markers.length).toBe(2);
    expect(markers[0]!.text).toBe('\u2022');
    expect(markers[1]!.text).toBe('\u2022');

    // SVG contains bullet character
    expect(getAllSvgText(svg)).toContain('\u2022');
    expect(getAllSvgText(svg)).toContain('First item');
    expect(getAllSvgText(svg)).toContain('Second item');

    assertSnapshot('list-bullet-basic.svg', svg);
  });

  test('list-bullet-nested.svg: three nesting levels', () => {
    const { svg, lines } = renderListSVG([
      makeListParagraph('Level 0 disc', { type: 'bullet', level: 0 }),
      makeListParagraph('Level 1 circle', { type: 'bullet', level: 1 }),
      makeListParagraph('Level 2 square', { type: 'bullet', level: 2 }),
    ]);

    const markers = lines
      .map(l => l.spans.find(s => s.type === 'marker'))
      .filter(Boolean);
    expect(markers.length).toBe(3);
    expect(markers[0]!.text).toBe('\u2022'); // disc
    expect(markers[1]!.text).toBe('\u25CB'); // circle
    expect(markers[2]!.text).toBe('\u25AA'); // square

    // Nested levels should have increasing indent (marker x or text x)
    const textSpans = lines.map(l => l.spans.find(s => s.type === 'text')!);
    expect(textSpans[1].x).toBeGreaterThan(textSpans[0].x);
    expect(textSpans[2].x).toBeGreaterThan(textSpans[1].x);

    assertSnapshot('list-bullet-nested.svg', svg);
  });

  test('list-bullet-custom.svg: custom bullet character', () => {
    const { svg, lines } = renderListSVG([
      makeListParagraph('Star item', { type: 'bullet', level: 0, bulletChar: '★' }),
      makeListParagraph('Another star', { type: 'bullet', level: 0, bulletChar: '★' }),
    ]);

    const markers = lines
      .map(l => l.spans.find(s => s.type === 'marker'))
      .filter(Boolean);
    expect(markers[0]!.text).toBe('★');
    expect(getAllSvgText(svg)).toContain('★');

    assertSnapshot('list-bullet-custom.svg', svg);
  });

  test('list-number-decimal.svg: sequential numbered list', () => {
    const { svg, lines } = renderListSVG([
      makeListParagraph('One', { type: 'number', numberFormat: 'decimal' }),
      makeListParagraph('Two', { type: 'number', numberFormat: 'decimal' }),
      makeListParagraph('Three', { type: 'number', numberFormat: 'decimal' }),
    ]);

    const markers = lines
      .map(l => l.spans.find(s => s.type === 'marker'))
      .filter(Boolean);
    expect(markers.length).toBe(3);
    expect(markers[0]!.text).toBe('1.');
    expect(markers[1]!.text).toBe('2.');
    expect(markers[2]!.text).toBe('3.');

    const text = getAllSvgText(svg);
    expect(text).toContain('1.');
    expect(text).toContain('2.');
    expect(text).toContain('3.');
    expect(text).toContain('One');
    expect(text).toContain('Two');
    expect(text).toContain('Three');

    assertSnapshot('list-number-decimal.svg', svg);
  });

  test('list-number-roman.svg: upper-roman numbered list', () => {
    const { svg, lines } = renderListSVG([
      makeListParagraph('First', { type: 'number', numberFormat: 'upper-roman' }),
      makeListParagraph('Second', { type: 'number', numberFormat: 'upper-roman' }),
      makeListParagraph('Third', { type: 'number', numberFormat: 'upper-roman' }),
    ]);

    const markers = lines
      .map(l => l.spans.find(s => s.type === 'marker'))
      .filter(Boolean);
    expect(markers[0]!.text).toBe('I.');
    expect(markers[1]!.text).toBe('II.');
    expect(markers[2]!.text).toBe('III.');

    assertSnapshot('list-number-roman.svg', svg);
  });

  test('list-number-alpha.svg: lower-alpha numbered list', () => {
    const { svg, lines } = renderListSVG([
      makeListParagraph('Alpha', { type: 'number', numberFormat: 'lower-alpha' }),
      makeListParagraph('Beta', { type: 'number', numberFormat: 'lower-alpha' }),
      makeListParagraph('Gamma', { type: 'number', numberFormat: 'lower-alpha' }),
    ]);

    const markers = lines
      .map(l => l.spans.find(s => s.type === 'marker'))
      .filter(Boolean);
    expect(markers[0]!.text).toBe('a.');
    expect(markers[1]!.text).toBe('b.');
    expect(markers[2]!.text).toBe('c.');

    assertSnapshot('list-number-alpha.svg', svg);
  });

  test('list-number-restart.svg: listRestart resets counter', () => {
    const { svg, lines } = renderListSVG([
      makeListParagraph('A', { type: 'number', numberFormat: 'decimal' }),
      makeListParagraph('B', { type: 'number', numberFormat: 'decimal' }),
      makeListParagraph('C', { type: 'number', numberFormat: 'decimal' }, true), // restart
      makeListParagraph('D', { type: 'number', numberFormat: 'decimal' }),
    ]);

    const markers = lines
      .map(l => l.spans.find(s => s.type === 'marker'))
      .filter(Boolean);
    expect(markers[0]!.text).toBe('1.');
    expect(markers[1]!.text).toBe('2.');
    expect(markers[2]!.text).toBe('1.'); // restarted
    expect(markers[3]!.text).toBe('2.');

    assertSnapshot('list-number-restart.svg', svg);
  });

  test('list-position-outside.svg: marker left of text', () => {
    const { svg, lines } = renderListSVG([
      makeListParagraph('Outside item', {
        type: 'bullet',
        level: 0,
        position: 'outside',
      }),
    ]);

    const firstLine = lines[0];
    const marker = firstLine.spans.find(s => s.type === 'marker')!;
    const text = firstLine.spans.find(s => s.type === 'text')!;
    expect(marker.x).toBeLessThan(text.x);

    assertSnapshot('list-position-outside.svg', svg);
  });

  test('list-position-inside.svg: marker first in flow', () => {
    const { svg, lines } = renderListSVG([
      makeListParagraph('Inside item', {
        type: 'bullet',
        level: 0,
        position: 'inside',
      }),
    ]);

    const firstLine = lines[0];
    expect(firstLine.spans[0].type).toBe('marker');

    assertSnapshot('list-position-inside.svg', svg);
  });

  test('list-number-start.svg: startNumber offset', () => {
    const { svg, lines } = renderListSVG([
      makeListParagraph('Five', { type: 'number', numberFormat: 'decimal', startNumber: 5 }),
      makeListParagraph('Six', { type: 'number', numberFormat: 'decimal' }),
      makeListParagraph('Seven', { type: 'number', numberFormat: 'decimal' }),
    ]);

    const markers = lines
      .map(l => l.spans.find(s => s.type === 'marker'))
      .filter(Boolean);
    expect(markers[0]!.text).toBe('5.');
    expect(markers[1]!.text).toBe('6.');
    expect(markers[2]!.text).toBe('7.');

    assertSnapshot('list-number-start.svg', svg);
  });

  test('list-bullet-browser.svg: bullet list with browser preset', () => {
    const { svg } = renderListSVG(
      [
        makeListParagraph('Browser bullet one', { type: 'bullet', level: 0 }),
        makeListParagraph('Browser bullet two', { type: 'bullet', level: 0 }),
      ],
      undefined,
      { preset: 'browser' },
    );

    expect(getAllSvgText(svg)).toContain('\u2022');
    expect(getAllSvgText(svg)).toContain('Browser bullet one');

    assertSnapshot('list-bullet-browser.svg', svg);
  });

  test('list-mixed-content.svg: list item with multi-word text', () => {
    const { svg, lines } = renderListSVG([
      makeListParagraph('Hello World from list', { type: 'bullet', level: 0 }),
      makeListParagraph('Another longer list item text', { type: 'bullet', level: 0 }),
    ]);

    // Marker only on first line of each paragraph
    const markers = lines
      .map(l => l.spans.find(s => s.type === 'marker'))
      .filter(Boolean);
    expect(markers.length).toBe(2);

    assertSnapshot('list-mixed-content.svg', svg);
  });
});

// ── Structural SVG assertions ───────────────────────────────────────────

describe('List SVG structure', () => {
  test('marker spans produce text content in SVG', () => {
    const { svg, lines } = renderListSVG([
      makeListParagraph('Item', { type: 'number', numberFormat: 'decimal' }),
    ]);

    // Layout has marker
    const marker = lines[0].spans.find(s => s.type === 'marker');
    expect(marker).toBeDefined();
    expect(marker!.text).toBe('1.');

    // SVG root is valid
    const ast = parse(svg);
    const svgEl = findElements(ast, 'svg');
    expect(svgEl.length).toBe(1);

    // At least one <text> element
    const textEls = findElements(ast, 'text');
    expect(textEls.length).toBeGreaterThanOrEqual(1);

    // Full text content includes both marker and item text
    const allText = getAllSvgText(svg);
    expect(allText).toContain('1.');
    expect(allText).toContain('Item');
  });

  test('outside marker has smaller x than text span', () => {
    const { lines } = renderListSVG([
      makeListParagraph('Check indent', {
        type: 'bullet',
        level: 0,
        position: 'outside',
      }),
    ]);

    const line = lines[0];
    const marker = line.spans.find(s => s.type === 'marker')!;
    const text = line.spans.find(s => s.type === 'text')!;

    // Marker sits in the bullet zone to the left of text
    expect(marker.x).toBeLessThan(text.x);
    // Marker width is positive
    expect(marker.width).toBeGreaterThan(0);
  });

  test('numbered markers are right-aligned within bullet zone', () => {
    // Multi-digit numbers should share the same right edge
    const { lines } = renderListSVG([
      makeListParagraph('Nine', { type: 'number', numberFormat: 'decimal', startNumber: 9 }),
      makeListParagraph('Ten', { type: 'number', numberFormat: 'decimal' }),
    ]);

    const m9 = lines[0].spans.find(s => s.type === 'marker')!;
    const m10 = lines[1].spans.find(s => s.type === 'marker')!;

    // Right edges should be approximately equal (right-aligned)
    const right9 = m9.x + m9.width;
    const right10 = m10.x + m10.width;
    expect(Math.abs(right9 - right10)).toBeLessThan(1);
  });
});
