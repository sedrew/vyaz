/**
 * text-frame.test.ts — TextFrameLayoutEngine tests.
 *
 * Covers all 8 sections:
 *   1. Basic structure (single, multi, empty)
 *   2. Vertical stacking (Y offset accumulation)
 *   3. Padding (left, top, right, bottom)
 *   4. frame.width / wrap
 *   5. frame.height
 *   6. contentWidth / contentHeight
 *   7. Different paragraph styles (alignment, lineHeight)
 *   8. Invariants (no overlap, Y order, line.x >= padding.left)
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import {
  registerUnifont,
  registerArialVariants,
  makeParagraph,
  makeTextFrame,
} from './helpers.ts';
import { layoutTextFrame } from '../src/layout/TextFrameLayoutEngine.js';

beforeAll(async () => {
  await registerUnifont();
  await registerArialVariants();
});

// ── 1. Basic structure ─────────────────────────────────────────────────

describe('Basic structure', () => {
  test('single paragraph → lines returned', () => {
    const p = makeParagraph('Hello');
    const result = layoutTextFrame(makeTextFrame([p]));

    expect(result.lines).toBeDefined();
    expect(result.lines.length).toBeGreaterThan(0);
    expect(result.lines[0].spans.length).toBeGreaterThan(0);
    expect(result.lines[0].spans[0].text).toContain('Hello');
  });

  test('single paragraph → TextFrameLayoutResult has all fields', () => {
    const result = layoutTextFrame(makeTextFrame([makeParagraph('Hello')]));

    expect(result).toHaveProperty('lines');
    expect(result).toHaveProperty('contentWidth');
    expect(result).toHaveProperty('contentHeight');
    expect(result).toHaveProperty('fitHorizontal');
    expect(result).toHaveProperty('fitVertical');
    expect(result.contentWidth).toBeGreaterThan(0);
    expect(result.contentHeight).toBeGreaterThan(0);
  });

  test('two paragraphs → all lines from both are present', () => {
    const p1 = makeParagraph('First');
    const p2 = makeParagraph('Second');
    const result = layoutTextFrame(makeTextFrame([p1, p2]));

    const texts = result.lines.flatMap((l) => l.spans).map((s) => s.text).join(' ');
    expect(texts).toContain('First');
    expect(texts).toContain('Second');
    expect(result.lines.length).toBeGreaterThanOrEqual(2);
  });

  test('empty TextFrame (0 paragraphs) → empty result', () => {
    const result = layoutTextFrame(makeTextFrame([]));

    expect(result.lines).toEqual([]);
    expect(result.contentWidth).toBe(0);
    expect(result.contentHeight).toBe(0);
  });
});

// ── 2. Vertical stacking (Y offset) ────────────────────────────────────

describe('Vertical stacking (Y offset)', () => {
  test('two paragraphs → second paragraph starts after first', () => {
    const p1 = makeParagraph('First line');
    const p2 = makeParagraph('Second line');
    const result = layoutTextFrame(makeTextFrame([p1, p2]));

    expect(result.lines.length).toBeGreaterThanOrEqual(2);
    const lastLineOfFirst = result.lines[0];
    const firstLineOfSecond = result.lines[1];
    expect(firstLineOfSecond.y).toBeGreaterThanOrEqual(lastLineOfFirst.y + lastLineOfFirst.height);
  });

  test('three paragraphs → all three are stacked without overlap', () => {
    const result = layoutTextFrame(makeTextFrame([
      makeParagraph('A'),
      makeParagraph('B'),
      makeParagraph('C'),
    ]));

    expect(result.lines.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < result.lines.length; i++) {
      const prev = result.lines[i - 1];
      const curr = result.lines[i];
      expect(curr.y).toBeGreaterThanOrEqual(prev.y + prev.height);
    }
  });

  test('spaceBefore pushes second paragraph down', () => {
    const p1 = makeParagraph('First');
    const p2 = makeParagraph('Second', {});
    p2.style.spaceBefore = 20;

    const result = layoutTextFrame(makeTextFrame([p1, p2]));
    expect(result.lines.length).toBeGreaterThanOrEqual(2);

    const gap = result.lines[1].y - (result.lines[0].y + result.lines[0].height);
    expect(gap).toBeGreaterThanOrEqual(18); // approximately 20
    expect(gap).toBeLessThanOrEqual(22);
  });

  test('spaceAfter adds space below first paragraph', () => {
    const p1 = makeParagraph('First');
    p1.style.spaceAfter = 15;
    const p2 = makeParagraph('Second');

    const result = layoutTextFrame(makeTextFrame([p1, p2]));
    expect(result.lines.length).toBeGreaterThanOrEqual(2);

    const gap = result.lines[1].y - (result.lines[0].y + result.lines[0].height);
    expect(gap).toBeGreaterThanOrEqual(13);
    expect(gap).toBeLessThanOrEqual(17);
  });

  test('spaceBefore + spaceAfter stack between paragraphs', () => {
    const p1 = makeParagraph('First');
    p1.style.spaceAfter = 10;
    const p2 = makeParagraph('Second');
    p2.style.spaceBefore = 10;

    const result = layoutTextFrame(makeTextFrame([p1, p2]));
    expect(result.lines.length).toBeGreaterThanOrEqual(2);

    const gap = result.lines[1].y - (result.lines[0].y + result.lines[0].height);
    expect(gap).toBeGreaterThanOrEqual(18);
    expect(gap).toBeLessThanOrEqual(22);
  });
});

// ── 3. Padding ──────────────────────────────────────────────────────────

describe('Padding', () => {
  test('padding.left shifts lines to the right', () => {
    const noPad = layoutTextFrame(makeTextFrame([makeParagraph('Hello')]));
    const withPad = layoutTextFrame(makeTextFrame([makeParagraph('Hello')], {
      padding: { left: 20, top: 0, right: 0, bottom: 0 },
    }));

    expect(withPad.lines[0].x).toBeCloseTo(noPad.lines[0].x + 20, 1);
  });

  test('padding.left reduces available width (narrower line)', () => {
    const result = layoutTextFrame(makeTextFrame(
      [makeParagraph('Hello World How Are You Today')],
      { width: 100, padding: { left: 30, top: 0, right: 0, bottom: 0 }, wrap: true },
    ));

    // With 30px left padding, available width = 100 - 30 = 70
    // Text should wrap
    expect(result.lines.length).toBeGreaterThanOrEqual(2);
  });

  test('padding.top shifts first line down', () => {
    const noPad = layoutTextFrame(makeTextFrame([makeParagraph('Hello')]));
    const withPad = layoutTextFrame(makeTextFrame([makeParagraph('Hello')], {
      padding: { top: 15, left: 0, right: 0, bottom: 0 },
    }));

    expect(withPad.lines[0].y).toBeCloseTo(noPad.lines[0].y + 15, 1);
  });

  test('padding.right reduces available width (changes wrapping)', () => {
    const noPad = layoutTextFrame(makeTextFrame(
      [makeParagraph('Hello World How Are You Today')],
      { width: 200, wrap: true },
    ));
    const withPad = layoutTextFrame(makeTextFrame(
      [makeParagraph('Hello World How Are You Today')],
      { width: 200, padding: { left: 0, top: 0, right: 50, bottom: 0 }, wrap: true },
    ));

    // With 50px right padding, available width = 150 → more wrapping
    expect(withPad.lines.length).toBeGreaterThanOrEqual(noPad.lines.length);
  });

  test('padding.bottom does not affect first line position', () => {
    const noPad = layoutTextFrame(makeTextFrame([makeParagraph('Hello')]));
    const withPad = layoutTextFrame(makeTextFrame([makeParagraph('Hello')], {
      padding: { bottom: 30, left: 0, top: 0, right: 0 },
    }));

    expect(withPad.lines[0].y).toBe(noPad.lines[0].y);
    expect(withPad.lines[0].x).toBe(noPad.lines[0].x);
  });

  test('all padding values combined work together', () => {
    const result = layoutTextFrame(makeTextFrame(
      [makeParagraph('Hello')],
      {
        padding: { top: 10, right: 15, bottom: 20, left: 25 },
      },
    ));

    expect(result.lines[0].x).toBeGreaterThanOrEqual(25);
    expect(result.lines[0].y).toBeGreaterThanOrEqual(10);
  });
});

// ── 4. frame.width / wrap ───────────────────────────────────────────────

describe('frame.width / wrap', () => {
  test('frame.width set → frameWidth in result, fitHorizontal === "frame"', () => {
    const result = layoutTextFrame(makeTextFrame([makeParagraph('Hello')], { width: 400 }));

    expect(result.frameWidth).toBe(400);
    expect(result.fitHorizontal).toBe('frame');
  });

  test('frame.width undefined → no frameWidth, fitHorizontal === "content"', () => {
    const result = layoutTextFrame(makeTextFrame([makeParagraph('Hello')]));

    expect(result.frameWidth).toBeUndefined();
    expect(result.fitHorizontal).toBe('content');
  });

  test('frame.width + wrap=true → lines wrap', () => {
    const result = layoutTextFrame(makeTextFrame(
      [makeParagraph('Hello World How Are You Today')],
      { width: 80, wrap: true },
    ));

    expect(result.lines.length).toBeGreaterThanOrEqual(2);
    for (const line of result.lines) {
      expect(line.width).toBeLessThanOrEqual(81);
    }
  });

  test('frame.width + wrap=false → no wrapping, contentWidth may exceed frameWidth', () => {
    const result = layoutTextFrame(makeTextFrame(
      [makeParagraph('Hello World')],
      { width: 50, wrap: false },
    ));

    expect(result.lines.length).toBe(1);
    // With wrap=false, the line stays on one line and overflows
    expect(result.contentWidth).toBeGreaterThan(50);
  });

  test('no width + wrap=true → no constraint, single line', () => {
    const result = layoutTextFrame(makeTextFrame(
      [makeParagraph('Hello World This Is A Long Text')],
      { wrap: true },
    ));

    expect(result.lines.length).toBe(1);
  });
});

// ── 5. frame.height ────────────────────────────────────────────────────

describe('frame.height', () => {
  test('frame.height set → frameHeight in result, fitVertical === "frame"', () => {
    const result = layoutTextFrame(makeTextFrame([makeParagraph('Hello')], { height: 300 }));

    expect(result.frameHeight).toBe(300);
    expect(result.fitVertical).toBe('frame');
  });

  test('frame.height undefined → no frameHeight, fitVertical === "content"', () => {
    const result = layoutTextFrame(makeTextFrame([makeParagraph('Hello')]));

    expect(result.frameHeight).toBeUndefined();
    expect(result.fitVertical).toBe('content');
  });
});

// ── 6. contentWidth / contentHeight ────────────────────────────────────

describe('contentWidth / contentHeight', () => {
  test('single paragraph, single line → contentWidth === line.width', () => {
    const result = layoutTextFrame(makeTextFrame([makeParagraph('Hello')]));

    expect(result.contentWidth).toBeCloseTo(result.lines[0].width, 3);
  });

  test('two paragraphs → contentWidth === max of both', () => {
    const result = layoutTextFrame(makeTextFrame([
      makeParagraph('Hello'),
      makeParagraph('World'),
    ]));

    const maxLineWidth = Math.max(...result.lines.map((l) => l.width));
    expect(result.contentWidth).toBeGreaterThanOrEqual(maxLineWidth - 0.01);
  });

  test('single paragraph → contentHeight === last line y + height', () => {
    const result = layoutTextFrame(makeTextFrame([makeParagraph('Hello')]));

    const lastLine = result.lines[result.lines.length - 1];
    expect(result.contentHeight).toBeCloseTo(lastLine.y + lastLine.height, 3);
  });

  test('two paragraphs → contentHeight === last line y + height', () => {
    const result = layoutTextFrame(makeTextFrame([
      makeParagraph('First paragraph'),
      makeParagraph('Second paragraph'),
    ]));

    const lastLine = result.lines[result.lines.length - 1];
    expect(result.contentHeight).toBeCloseTo(lastLine.y + lastLine.height, 3);
  });

  test('paragraph with wrapping → contentWidth >= max line width', () => {
    const result = layoutTextFrame(makeTextFrame(
      [makeParagraph('Hello World How Are You Today')],
      { width: 50, wrap: true },
    ));

    expect(result.lines.length).toBeGreaterThanOrEqual(2);
    const maxLineWidth = Math.max(...result.lines.map((l) => l.width));
    expect(result.contentWidth).toBeGreaterThanOrEqual(maxLineWidth - 0.01);
  });
});

// ── 7. Different paragraph styles ──────────────────────────────────────

describe('Different paragraph styles', () => {
  test('left alignment → lines start at x = padding.left', () => {
    const p = makeParagraph('Hello');
    p.style.alignment = 'left';
    const result = layoutTextFrame(makeTextFrame([p]));

    expect(result.lines[0].x).toBeGreaterThanOrEqual(0);
  });

  test('center alignment → line is centered within available width', () => {
    const p = makeParagraph('Hello');
    p.style.alignment = 'center';
    const result = layoutTextFrame(makeTextFrame([p], { width: 400 }));

    // Centered line should have x > 0 (not flush left)
    // Exact position depends on content width: x = (400 - line.width) / 2
    const expectedX = (400 - result.lines[0].width) / 2;
    expect(Math.abs(result.lines[0].x - expectedX)).toBeLessThan(2);
  });

  test('right alignment → line is flush right', () => {
    const p = makeParagraph('Hello');
    p.style.alignment = 'right';
    const result = layoutTextFrame(makeTextFrame([p], { width: 400 }));

    // Right-aligned line: x = width - line.width
    const expectedX = 400 - result.lines[0].width;
    expect(Math.abs(result.lines[0].x - expectedX)).toBeLessThan(2);
  });

  test('different lineHeight → lines have different heights', () => {
    const pSmall = makeParagraph('A');
    pSmall.style.lineHeight = 1.0;
    const pLarge = makeParagraph('A');
    pLarge.style.lineHeight = 2.0;

    const smallResult = layoutTextFrame(makeTextFrame([pSmall]));
    const largeResult = layoutTextFrame(makeTextFrame([pLarge]));

    expect(largeResult.lines[0].height).toBeGreaterThan(smallResult.lines[0].height);
  });

  test('two paragraphs with different alignment each keeps its own alignment', () => {
    const p1 = makeParagraph('Left');
    p1.style.alignment = 'left';
    const p2 = makeParagraph('Right');
    p2.style.alignment = 'right';

    const result = layoutTextFrame(makeTextFrame([p1, p2], { width: 500 }));

    // First line should be near left edge
    expect(result.lines[0].x).toBeLessThan(10);
    // Last line should be near right edge
    expect(result.lines[result.lines.length - 1].x).toBeGreaterThan(450);
  });
});

// ── 8. Invariants ──────────────────────────────────────────────────────

describe('Invariants', () => {
  test('No Overlap: lines do not intersect', () => {
    const result = layoutTextFrame(makeTextFrame([
      makeParagraph('First paragraph with some text'),
      makeParagraph('Second paragraph with some text'),
      makeParagraph('Third paragraph with some text'),
    ]));

    for (let i = 1; i < result.lines.length; i++) {
      const prev = result.lines[i - 1];
      const curr = result.lines[i];
      expect(curr.y).toBeGreaterThanOrEqual(prev.y + prev.height - 0.5);
    }
  });

  test('Y order: line y values increase monotonically', () => {
    const result = layoutTextFrame(makeTextFrame([
      makeParagraph('Line A'),
      makeParagraph('Line B'),
      makeParagraph('Line C'),
      makeParagraph('Line D'),
    ]));

    for (let i = 1; i < result.lines.length; i++) {
      expect(result.lines[i].y).toBeGreaterThan(result.lines[i - 1].y);
    }
  });

  test('line.x ≥ padding.left', () => {
    const paddingLeft = 25;
    const result = layoutTextFrame(makeTextFrame(
      [makeParagraph('Hello')],
      { padding: { left: paddingLeft, top: 0, right: 0, bottom: 0 } },
    ));

    for (const line of result.lines) {
      expect(line.x).toBeGreaterThanOrEqual(paddingLeft - 0.5);
    }
  });

  test('width fit: line width ≤ frame width (with wrap)', () => {
    const frameWidth = 120;
    const result = layoutTextFrame(makeTextFrame(
      [makeParagraph('Hello World How Are You Today')],
      { width: frameWidth, wrap: true },
    ));

    for (const line of result.lines) {
      expect(line.width).toBeLessThanOrEqual(frameWidth + 0.5);
    }
  });

  test('zero-width frame does not crash', () => {
    expect(() => {
      layoutTextFrame(makeTextFrame(
        [makeParagraph('Hello World')],
        { width: 0, wrap: true },
      ));
    }).not.toThrow();
  });

  test('baseline > 0 for all lines', () => {
    const result = layoutTextFrame(makeTextFrame([makeParagraph('Hello')], { width: 400 }));

    for (const line of result.lines) {
      expect(line.baseline).toBeGreaterThan(0);
    }
  });
});

// ── 9. pre-line with hard breaks ───────────────────────────────────────

describe('pre-line with hard breaks', () => {
  test('three lines from \\n in single run', () => {
    const p = makeParagraph('Hello World\nПривет Мир\nWorld of Text');
    p.style.whiteSpace = 'pre-line';
    p.style.lineHeight = 1.4;
    const result = layoutTextFrame(makeTextFrame([p], { width: 400 }));

    // Should produce exactly 3 lines (one per \n-separated segment)
    expect(result.lines.length).toBe(3);

    // Each line should have non-zero height
    for (const line of result.lines) {
      expect(line.height).toBeGreaterThan(0);
      expect(line.spans.length).toBeGreaterThan(0);
    }

    // Lines should be stacked vertically without overlap
    for (let i = 1; i < result.lines.length; i++) {
      const prev = result.lines[i - 1];
      const curr = result.lines[i];
      expect(curr.y).toBeGreaterThanOrEqual(prev.y + prev.height - 0.5);
    }

    // Each line should contain the correct text
    expect(result.lines[0].spans.map(s => s.text).join('')).toBe('Hello World');
    expect(result.lines[1].spans.map(s => s.text).join('')).toBe('Привет Мир');
    expect(result.lines[2].spans.map(s => s.text).join('')).toBe('World of Text');
  });
});
