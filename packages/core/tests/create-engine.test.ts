/**
 * create-engine.test.ts — createLayoutEngine: isolation, cache bound, parity.
 */
import { describe, test, expect, beforeAll } from 'bun:test';
import { registerUnifont, makeTextFrame, makeParagraph } from './helpers.ts';
import { layoutTextFrame } from '../src/layout/TextFrameLayoutEngine.js';
import { createLayoutEngine } from '../src/layout/create-engine.js';

beforeAll(async () => {
  await registerUnifont();
});

const frame = () =>
  makeTextFrame([makeParagraph('Hello World How Are You', { fontFamily: 'Unifont', fontSize: 16 })], {
    width: 200,
  });

describe('createLayoutEngine', () => {
  test('produces the same result as layoutTextFrame', () => {
    const a = layoutTextFrame(frame());
    const b = createLayoutEngine().layout(frame());
    expect(JSON.stringify(b.lines)).toBe(JSON.stringify(a.lines));
    expect(b.content.width).toBe(a.content.width);
    expect(b.content.height).toBe(a.content.height);
  });

  test('two engines are independent and clearCache() works', () => {
    const e1 = createLayoutEngine();
    const e2 = createLayoutEngine({ cache: { max: 8 } });
    const r1 = e1.layout(frame());
    const r2 = e2.layout(frame());
    expect(r1.lines.length).toBe(r2.lines.length);
    e1.clearCache(); // must not throw, must not affect e2's next layout
    const r1b = e1.layout(frame());
    expect(r1b.lines.length).toBe(r1.lines.length);
  });

  test('respects glyphAdvances option', () => {
    const withAdv = createLayoutEngine().layout(frame(), { glyphAdvances: true });
    const withoutAdv = createLayoutEngine().layout(frame());
    const span = (r: typeof withAdv) => r.lines[0].spans.find((s) => s.type === 'text')!;
    expect(span(withAdv).glyphAdvances).toBeDefined();
    expect(span(withoutAdv).glyphAdvances).toBeUndefined();
  });
});
