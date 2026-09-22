/**
 * office-kern-threshold.test.ts — `mode: 'office'` kerns from 12pt up, kern-table fonts only.
 *
 * Measured against real PowerPoint exports (scripts/office-metrics/gen-stress.ts, gen-kern-context.ts,
 * RESULTS.md): Arial at 9–11pt wraps a box sized to the kerned width + 0.25pt and fits from
 * 12pt up — PowerPoint's default `<a:rPr kern="1200">`; Times New Roman is unkerned at 11pt
 * and kerned at 20pt; Roboto (GPOS only) is never kerned. Explicit `shaping: true` kerns
 * every font at every size.
 */
import { describe, test, expect, beforeAll } from 'bun:test';
import { registerUnifont, registerArialVariants } from './helpers.ts';
import { layoutTextFrame } from '@vyaz/core';
import type { LayoutOptions } from '../src/layout/TextFrameLayoutEngine.js';

beforeAll(async () => {
  await registerUnifont(); // other files rely on Unifont being the first registered family
  await registerArialVariants();
});

// Kern-heavy on purpose: "Ta", "Ye", "Wa" and friends.
const TEXT = 'Two Yellow Pears Fly Away Toward Warm Valleys';

function layout(size: number, width: number | undefined, options: LayoutOptions) {
  return layoutTextFrame(
    {
      width,
      wrap: true,
      paragraphs: [
        {
          style: { alignment: 'left', lineHeight: 1, spaceBefore: 0, spaceAfter: 0, whiteSpace: 'normal' },
          children: [{ type: 'text', text: TEXT, fontFamily: 'Arial', fontSize: size } as any],
        },
      ],
    },
    { onMissingFont: 'substitute', textBoxPadding: 0, ...options },
  );
}
const kerned = (size: number) => layout(size, undefined, { mode: 'office', shaping: true }).textBox.width;
const unkerned = (size: number) => layout(size, undefined, { mode: 'office', shaping: false }).textBox.width;
// plain advance sum: no kerning, no 1/8pt glyph grid — what browser mode measures
const plain = (size: number) => layout(size, undefined, { mode: 'office', shaping: false, advanceQuantum: 0 }).textBox.width;

describe('office mode: kerning starts at 12pt', () => {
  test('the fixture text really kerns (otherwise nothing below discriminates)', () => {
    for (const size of [10, 11, 12, 14]) expect(unkerned(size) - kerned(size)).toBeGreaterThan(1);
  });

  test.each([9, 10, 11])('%ipt: a box at kerned width + 0.25pt is too narrow (no kerning)', (size) => {
    expect(layout(size, kerned(size) + 0.25, { mode: 'office' }).lines.length).toBe(2);
  });

  test.each([9, 10, 11])('%ipt: default office width equals the unkerned advance sum', (size) => {
    expect(layout(size, undefined, { mode: 'office' }).textBox.width).toBeCloseTo(unkerned(size), 1);
  });

  test.each([12, 14, 16])('%ipt: a box at kerned width + 0.25pt still fits on one line (kerning on)', (size) => {
    const r = layout(size, kerned(size) + 0.25, { mode: 'office' });
    expect(r.lines.length).toBe(1);
    expect(r.textBox.width).toBeCloseTo(kerned(size), 1);
  });

  test('11.9pt is below the threshold, 12pt is at it', () => {
    expect(layout(11.9, undefined, { mode: 'office' }).textBox.width).toBeCloseTo(unkerned(11.9), 1);
    expect(layout(12, undefined, { mode: 'office' }).textBox.width).toBeCloseTo(kerned(12), 1);
  });
});

describe('explicit options override the default', () => {
  test('shaping: true kerns at every size', () => {
    expect(layout(10, kerned(10) + 0.25, { mode: 'office', shaping: true }).lines.length).toBe(1);
  });

  test('shaping: false never kerns, even above the threshold', () => {
    expect(layout(16, kerned(16) + 0.25, { mode: 'office', shaping: false }).lines.length).toBe(2);
  });

  test('kernMinSize moves the threshold', () => {
    expect(layout(10, kerned(10) + 0.25, { mode: 'office', kernMinSize: 8 }).lines.length).toBe(1);
    expect(layout(14, kerned(14) + 0.25, { mode: 'office', kernMinSize: 16 }).lines.length).toBe(2);
  });

  test('browser mode is untouched: plain advance sum (no kerning, no glyph grid) at every size', () => {
    for (const size of [10, 16]) {
      expect(layout(size, undefined, { mode: 'browser' }).textBox.width).toBeCloseTo(plain(size), 1);
    }
  });
});

describe('prepared-line cache does not cross-feed profiles', () => {
  test('same paragraph laid out under different kerning profiles back to back', () => {
    const size = 11;
    const w = kerned(size) + 0.25;
    const a = layout(size, w, { mode: 'office' }).lines.length; // below 12pt → unkerned → 2
    const b = layout(size, w, { mode: 'office', shaping: true }).lines.length; // kerned → 1
    const c = layout(size, w, { mode: 'office' }).lines.length; // again → 2
    const d = layout(size, w, { mode: 'office', kernMinSize: 8 }).lines.length; // kerned → 1
    expect([a, b, c, d]).toEqual([2, 1, 2, 1]);
  });
});
