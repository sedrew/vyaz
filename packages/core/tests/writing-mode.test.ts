/**
 * writing-mode.test.ts — `sideways-*` writing modes + frame `rotation`.
 *
 * These are Case A of vertical text: the block is laid out horizontally and the
 * engine reports a rigid post-layout rotation on `result.transform` for the
 * renderer to apply. The only layout-time effect is that the inline (wrap) axis
 * runs along the frame's *height* under `sideways-*`.
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import { registerUnifont, makeParagraph, makeTextFrame } from './helpers.ts';
import { layoutTextFrame } from '../src/layout/TextFrameLayoutEngine.js';

beforeAll(async () => {
  await registerUnifont();
});

const LONG = 'The quick brown fox jumps over the lazy dog and keeps running.';
const run = { fontFamily: 'Unifont', fontSize: 16 } as const;

describe('sideways-* wrap axis', () => {
  test('sideways-rl wraps by frame height, not width', () => {
    const horizontal = layoutTextFrame(
      makeTextFrame([makeParagraph(LONG, run)], { width: 600, height: 90 }),
    );
    const sideways = layoutTextFrame(
      makeTextFrame([makeParagraph(LONG, run)], {
        width: 600,
        height: 90,
        writingMode: 'sideways-rl',
      }),
    );

    // width 600 easily fits the phrase on one line; height 90 does not.
    expect(horizontal.lines.length).toBe(1);
    expect(sideways.lines.length).toBeGreaterThan(1);
  });

  test('sideways-lr uses the same wrap axis as sideways-rl', () => {
    const rl = layoutTextFrame(
      makeTextFrame([makeParagraph(LONG, run)], { width: 600, height: 90, writingMode: 'sideways-rl' }),
    );
    const lr = layoutTextFrame(
      makeTextFrame([makeParagraph(LONG, run)], { width: 600, height: 90, writingMode: 'sideways-lr' }),
    );
    expect(lr.lines.length).toBe(rl.lines.length);
  });
});

describe('result.transform', () => {
  test('sideways-rl → 90° CW, layoutBox has width/height swapped', () => {
    const r = layoutTextFrame(
      makeTextFrame([makeParagraph('Hi', run)], { width: 400, height: 120, writingMode: 'sideways-rl' }),
    );
    expect(r.writingMode).toBe('sideways-rl');
    expect(r.transform).toEqual({ rotate: 90, layoutBox: { width: 120, height: 400 } });
  });

  test('sideways-lr → 270° CW', () => {
    const r = layoutTextFrame(
      makeTextFrame([makeParagraph('Hi', run)], { width: 400, height: 120, writingMode: 'sideways-lr' }),
    );
    expect(r.transform).toEqual({ rotate: 270, layoutBox: { width: 120, height: 400 } });
  });

  test('rotation alone → no axis swap, lines unchanged', () => {
    const plain = layoutTextFrame(makeTextFrame([makeParagraph(LONG, run)], { width: 300, height: 200 }));
    const turned = layoutTextFrame(
      makeTextFrame([makeParagraph(LONG, run)], { width: 300, height: 200, rotation: 180 }),
    );
    expect(turned.transform).toEqual({ rotate: 180, layoutBox: { width: 300, height: 200 } });
    expect(turned.lines.map((l) => l.spans.map((s) => s.text).join(''))).toEqual(
      plain.lines.map((l) => l.spans.map((s) => s.text).join('')),
    );
  });

  test('writingMode rotation composes with frame.rotation', () => {
    const r = layoutTextFrame(
      makeTextFrame([makeParagraph('Hi', run)], {
        width: 400,
        height: 120,
        writingMode: 'sideways-rl',
        rotation: 90,
      }),
    );
    // 90 (sideways-rl) + 90 (rotation) = 180 → not a quarter turn.
    expect(r.transform?.rotate).toBe(180);
    expect(r.transform?.layoutBox).toEqual({ width: 120, height: 400 });
  });

  test('a full-turn rotation reports no transform', () => {
    const r = layoutTextFrame(
      makeTextFrame([makeParagraph('Hi', run)], { width: 200, height: 80, rotation: 360 }),
    );
    expect(r.transform).toBeUndefined();
    expect(r.writingMode).toBe('horizontal-tb');
  });

  test('negative rotation normalises into [0, 360)', () => {
    const r = layoutTextFrame(
      makeTextFrame([makeParagraph('Hi', run)], { width: 200, height: 80, rotation: -90 }),
    );
    expect(r.transform?.rotate).toBe(270);
  });
});

describe('visual content box', () => {
  test('sideways-rl swaps the reported content width/height', () => {
    const horizontal = layoutTextFrame(makeTextFrame([makeParagraph(LONG, run)], { wrap: false }));
    const sideways = layoutTextFrame(
      makeTextFrame([makeParagraph(LONG, run)], { wrap: false, writingMode: 'sideways-rl' }),
    );
    // Same glyphs, no wrapping → the layout bbox is the same, only rotated 90°.
    expect(sideways.content.width).toBeCloseTo(horizontal.content.height, 3);
    expect(sideways.content.height).toBeCloseTo(horizontal.content.width, 3);
  });
});
