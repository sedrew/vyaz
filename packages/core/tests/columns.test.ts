/**
 * columns.test.ts — multi-column distribution.
 *
 * Default is `column-fill: balance` (CSS default + PowerPoint): lines split
 * evenly across columns, reading order preserved. `fill: 'auto'` fills each
 * column to the frame height before moving on.
 *
 * Regression: lines used to alternate between columns (each went to the
 * currently-shortest column), breaking reading order.
 */
import { describe, test, expect, beforeAll } from 'bun:test';
import { registerUnifont, makeParagraph, makeTextFrame } from './helpers.ts';
import { layoutTextFrame } from '../src/layout/TextFrameLayoutEngine.js';

beforeAll(async () => {
  await registerUnifont();
});

const wide = (words: number, extra: Partial<any> = {}) =>
  makeTextFrame(
    [makeParagraph(Array.from({ length: words }, (_, i) => `word${i}`).join(' '), {
      fontFamily: 'Unifont',
      fontSize: 12,
    })],
    { width: 400, height: 300, columns: { count: 2, gap: 20, ...extra } },
  );

function colHeights(lines: ReturnType<typeof layoutTextFrame>['lines'], n: number) {
  const h: number[] = new Array(n).fill(0);
  for (const l of lines) {
    const c = l.columnIndex ?? 0;
    h[c] = Math.max(h[c], l.y + l.height);
  }
  return h;
}

describe('multi-column', () => {
  test('default balance: columns roughly equal, reading order preserved', () => {
    const r = layoutTextFrame(wide(120));
    const firstCol1 = r.lines.findIndex((l) => l.columnIndex === 1);
    expect(firstCol1).toBeGreaterThan(0);
    // every line before the first column-1 line is in column 0
    expect(r.lines.slice(0, firstCol1).every((l) => (l.columnIndex ?? 0) === 0)).toBe(true);
    // every line after is in column 1
    expect(r.lines.slice(firstCol1).every((l) => l.columnIndex === 1)).toBe(true);

    const [h0, h1] = colHeights(r.lines, 2);
    expect(Math.abs(h0 - h1)).toBeLessThan(30); // within ~2 lines
  });

  test('fill:"auto" fills column 0 to the frame height first', () => {
    const r = layoutTextFrame(wide(120, { fill: 'auto' }));
    const [h0] = colHeights(r.lines, 2);
    expect(h0).toBeGreaterThan(300 - 20); // column 0 nearly full before column 1
    expect(h0).toBeLessThanOrEqual(300 + 0.5);
  });

  test('content that fits stays in column 0', () => {
    const r = layoutTextFrame(
      makeTextFrame([makeParagraph('short line', { fontFamily: 'Unifont', fontSize: 12 })], {
        width: 400,
        height: 200,
        columns: { count: 2, gap: 20, fill: 'auto' },
      }),
    );
    expect(r.lines.every((l) => (l.columnIndex ?? 0) === 0)).toBe(true);
  });
});
