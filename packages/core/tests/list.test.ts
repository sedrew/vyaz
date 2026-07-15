/**
 * list.test.ts — unit tests for list marker helpers and list layout.
 *
 * Covers:
 * - formatListNumber (decimal, roman, alpha)
 * - defaultBulletChar (level-based disc/circle/square)
 * - Bullet list layout: marker span present, correct indent
 * - Numbered list layout: sequential indices, marker text
 * - Nested list levels
 * - listRestart breaks numbering
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import { formatListNumber, defaultBulletChar, BULLET_CHARACTERS } from '../src/utils/list.js';
import { layoutTextFrame } from '../src/layout/TextFrameLayoutEngine.js';
import { fontMetricsProvider } from '../src/measure/FontMetricsProvider.js';
import type { TextFrame, Paragraph, TextRun, ListStyle } from '../src/types/Document.js';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Font setup ──────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));

beforeAll(async () => {
  const fontPath = resolve(__dirname, 'fixtures/unifont-17.0.05.otf');
  if (!existsSync(fontPath)) {
    throw new Error(`Unifont not found at ${fontPath}`);
  }
  const data = readFileSync(fontPath);
  await fontMetricsProvider.registerFont('Unifont', { weight: 'normal', style: 'normal' }, data);
});

// ── Helpers ─────────────────────────────────────────────────────────────

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

function makeListParagraph(text: string, listStyle: ListStyle): Paragraph {
  return {
    children: [makeRun(text)],
    style: {
      alignment: 'left',
      lineHeight: 1.15,
      spaceBefore: 0,
      spaceAfter: 0,
      whiteSpace: 'normal',
      listStyle,
    },
  };
}

// ── formatListNumber ────────────────────────────────────────────────────

describe('formatListNumber', () => {
  test('decimal', () => {
    expect(formatListNumber(1, 'decimal')).toBe('1');
    expect(formatListNumber(10, 'decimal')).toBe('10');
    expect(formatListNumber(42, 'decimal')).toBe('42');
  });

  test('upper-roman', () => {
    expect(formatListNumber(1, 'upper-roman')).toBe('I');
    expect(formatListNumber(4, 'upper-roman')).toBe('IV');
    expect(formatListNumber(9, 'upper-roman')).toBe('IX');
    expect(formatListNumber(10, 'upper-roman')).toBe('X');
    expect(formatListNumber(14, 'upper-roman')).toBe('XIV');
    expect(formatListNumber(50, 'upper-roman')).toBe('L');
    expect(formatListNumber(100, 'upper-roman')).toBe('C');
    expect(formatListNumber(1999, 'upper-roman')).toBe('MCMXCIX');
  });

  test('lower-roman', () => {
    expect(formatListNumber(1, 'lower-roman')).toBe('i');
    expect(formatListNumber(5, 'lower-roman')).toBe('v');
    expect(formatListNumber(27, 'lower-roman')).toBe('xxvii');
  });

  test('upper-alpha', () => {
    expect(formatListNumber(1, 'upper-alpha')).toBe('A');
    expect(formatListNumber(2, 'upper-alpha')).toBe('B');
    expect(formatListNumber(26, 'upper-alpha')).toBe('Z');
    expect(formatListNumber(27, 'upper-alpha')).toBe('AA');
    expect(formatListNumber(28, 'upper-alpha')).toBe('AB');
  });

  test('lower-alpha', () => {
    expect(formatListNumber(1, 'lower-alpha')).toBe('a');
    expect(formatListNumber(3, 'lower-alpha')).toBe('c');
    expect(formatListNumber(26, 'lower-alpha')).toBe('z');
    expect(formatListNumber(27, 'lower-alpha')).toBe('aa');
  });
});

// ── defaultBulletChar ───────────────────────────────────────────────────

describe('defaultBulletChar', () => {
  test('level 0 → disc (•)', () => {
    expect(defaultBulletChar(0)).toBe('\u2022');
  });

  test('level 1 → circle (○)', () => {
    expect(defaultBulletChar(1)).toBe('\u25CB');
  });

  test('level 2 → square (▪)', () => {
    expect(defaultBulletChar(2)).toBe('\u25AA');
  });

  test('level 3+ → square (fallback)', () => {
    expect(defaultBulletChar(3)).toBe('\u25AA');
    expect(defaultBulletChar(10)).toBe('\u25AA');
  });

  test('BULLET_CHARACTERS map is consistent', () => {
    expect(BULLET_CHARACTERS[0]).toBe('\u2022');
    expect(BULLET_CHARACTERS[1]).toBe('\u25CB');
    expect(BULLET_CHARACTERS[2]).toBe('\u25AA');
  });
});

// ── Bullet list layout ──────────────────────────────────────────────────

describe('bullet list layout', () => {
  test('marker span is present on first line', () => {
    const frame: TextFrame = {
      width: 400,
      wrap: true,
      paragraphs: [
        makeListParagraph('First item', { type: 'bullet', level: 0 }),
        makeListParagraph('Second item', { type: 'bullet', level: 0 }),
      ],
    };

    const result = layoutTextFrame(frame);
    expect(result.lines.length).toBeGreaterThanOrEqual(2);

    // First line of first paragraph should have a marker span
    const firstLine = result.lines[0];
    const markerSpan = firstLine.spans.find(s => s.type === 'marker');
    expect(markerSpan).toBeDefined();
    expect(markerSpan!.text).toBe('\u2022'); // disc
  });

  test('text is indented by bulletIndent', () => {
    const frame: TextFrame = {
      width: 400,
      wrap: true,
      paragraphs: [
        makeListParagraph('Indented item', { type: 'bullet', level: 0 }),
      ],
    };

    const result = layoutTextFrame(frame);
    const firstLine = result.lines[0];
    const textSpan = firstLine.spans.find(s => s.type === 'text');
    expect(textSpan).toBeDefined();

    // Text should start after the bullet zone (fontSize * 1.5 = 16 * 1.5 = 24)
    // Marker is outside, so text x should be >= bulletIndent
    expect(textSpan!.x).toBeGreaterThan(0);
  });

  test('custom bulletChar is used', () => {
    const frame: TextFrame = {
      width: 400,
      wrap: true,
      paragraphs: [
        makeListParagraph('Star item', {
          type: 'bullet',
          level: 0,
          bulletChar: '★',
        }),
      ],
    };

    const result = layoutTextFrame(frame);
    const markerSpan = result.lines[0].spans.find(s => s.type === 'marker');
    expect(markerSpan).toBeDefined();
    expect(markerSpan!.text).toBe('★');
  });

  test('nested levels use different bullet characters', () => {
    const frame: TextFrame = {
      width: 400,
      wrap: true,
      paragraphs: [
        makeListParagraph('Level 0', { type: 'bullet', level: 0 }),
        makeListParagraph('Level 1', { type: 'bullet', level: 1 }),
        makeListParagraph('Level 2', { type: 'bullet', level: 2 }),
      ],
    };

    const result = layoutTextFrame(frame);
    // Each paragraph is a separate list group (different levels)
    // Find marker for each paragraph
    const markers = result.lines
      .map(l => l.spans.find(s => s.type === 'marker'))
      .filter(Boolean);

    expect(markers.length).toBe(3);
    expect(markers[0]!.text).toBe('\u2022'); // disc
    expect(markers[1]!.text).toBe('\u25CB'); // circle
    expect(markers[2]!.text).toBe('\u25AA'); // square
  });
});

// ── Numbered list layout ────────────────────────────────────────────────

describe('numbered list layout', () => {
  test('sequential numbering', () => {
    const frame: TextFrame = {
      width: 400,
      wrap: true,
      paragraphs: [
        makeListParagraph('One', { type: 'number', numberFormat: 'decimal' }),
        makeListParagraph('Two', { type: 'number', numberFormat: 'decimal' }),
        makeListParagraph('Three', { type: 'number', numberFormat: 'decimal' }),
      ],
    };

    const result = layoutTextFrame(frame);
    const markers = result.lines
      .map(l => l.spans.find(s => s.type === 'marker'))
      .filter(Boolean);

    expect(markers.length).toBe(3);
    expect(markers[0]!.text).toBe('1.');
    expect(markers[1]!.text).toBe('2.');
    expect(markers[2]!.text).toBe('3.');
  });

  test('startNumber offset', () => {
    const frame: TextFrame = {
      width: 400,
      wrap: true,
      paragraphs: [
        makeListParagraph('Five', { type: 'number', numberFormat: 'decimal', startNumber: 5 }),
        makeListParagraph('Six', { type: 'number', numberFormat: 'decimal' }),
      ],
    };

    const result = layoutTextFrame(frame);
    const markers = result.lines
      .map(l => l.spans.find(s => s.type === 'marker'))
      .filter(Boolean);

    expect(markers[0]!.text).toBe('5.');
    expect(markers[1]!.text).toBe('6.');
  });

  test('upper-roman format', () => {
    const frame: TextFrame = {
      width: 400,
      wrap: true,
      paragraphs: [
        makeListParagraph('First', { type: 'number', numberFormat: 'upper-roman' }),
        makeListParagraph('Second', { type: 'number', numberFormat: 'upper-roman' }),
        makeListParagraph('Third', { type: 'number', numberFormat: 'upper-roman' }),
      ],
    };

    const result = layoutTextFrame(frame);
    const markers = result.lines
      .map(l => l.spans.find(s => s.type === 'marker'))
      .filter(Boolean);

    expect(markers[0]!.text).toBe('I.');
    expect(markers[1]!.text).toBe('II.');
    expect(markers[2]!.text).toBe('III.');
  });

  test('listRestart breaks numbering', () => {
    const frame: TextFrame = {
      width: 400,
      wrap: true,
      paragraphs: [
        makeListParagraph('A', { type: 'number', numberFormat: 'decimal' }),
        makeListParagraph('B', { type: 'number', numberFormat: 'decimal' }),
        // Restart
        {
          children: [makeRun('C')],
          style: {
            alignment: 'left',
            lineHeight: 1.15,
            spaceBefore: 0,
            spaceAfter: 0,
            whiteSpace: 'normal',
            listStyle: { type: 'number', numberFormat: 'decimal' },
            listRestart: true,
          },
        },
        makeListParagraph('D', { type: 'number', numberFormat: 'decimal' }),
      ],
    };

    const result = layoutTextFrame(frame);
    const markers = result.lines
      .map(l => l.spans.find(s => s.type === 'marker'))
      .filter(Boolean);

    expect(markers.length).toBe(4);
    expect(markers[0]!.text).toBe('1.');
    expect(markers[1]!.text).toBe('2.');
    // After restart
    expect(markers[2]!.text).toBe('1.');
    expect(markers[3]!.text).toBe('2.');
  });
});

// ── list-style-position ─────────────────────────────────────────────────

describe('list-style-position', () => {
  test('outside (default): marker x < text x', () => {
    const frame: TextFrame = {
      width: 400,
      wrap: true,
      paragraphs: [
        makeListParagraph('Outside item', {
          type: 'bullet',
          level: 0,
          position: 'outside',
        }),
      ],
    };

    const result = layoutTextFrame(frame);
    const firstLine = result.lines[0];
    const marker = firstLine.spans.find(s => s.type === 'marker')!;
    const text = firstLine.spans.find(s => s.type === 'text')!;

    expect(marker).toBeDefined();
    expect(text).toBeDefined();
    // Marker should be to the left of text
    expect(marker.x).toBeLessThan(text.x);
  });

  test('outside: line box and contentWidth include the marker', () => {
    const frame: TextFrame = {
      width: 400,
      wrap: true,
      paragraphs: [
        makeListParagraph('Outside item', {
          type: 'bullet',
          level: 0,
          position: 'outside',
        }),
      ],
    };

    const result = layoutTextFrame(frame);
    const line = result.lines[0];
    const marker = line.spans.find(s => s.type === 'marker')!;
    const maxSpanRight = Math.max(...line.spans.map(s => s.x + s.width));
    const minSpanX = Math.min(...line.spans.map(s => s.x));

    // Line box starts at the leftmost span (marker)
    expect(line.x).toBeCloseTo(marker.x, 2);
    expect(line.x).toBeCloseTo(minSpanX, 2);
    // Line width covers marker → text
    expect(line.width).toBeCloseTo(maxSpanRight - minSpanX, 2);
    // contentWidth is absolute right edge so canvas sizing does not clip
    expect(result.contentWidth).toBeGreaterThanOrEqual(maxSpanRight - 0.01);
  });


  test('inside: marker is first span in flow', () => {
    const frame: TextFrame = {
      width: 400,
      wrap: true,
      paragraphs: [
        makeListParagraph('Inside item', {
          type: 'bullet',
          level: 0,
          position: 'inside',
        }),
      ],
    };

    const result = layoutTextFrame(frame);
    const firstLine = result.lines[0];
    // First span should be the marker
    expect(firstLine.spans[0].type).toBe('marker');
  });
});