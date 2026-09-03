/**
 * layout-mode.test.ts — `mode` as a per-layout input (not global setMode).
 *
 * Office (DrawingML) uses OS/2 winAscent/winDescent and a no-leading line box;
 * browser uses hhea + CSS leading. For the same frame the line height differs.
 */
import { describe, test, expect, beforeAll } from 'bun:test';
import { registerUnifont, makeTextFrame, makeParagraph } from './helpers.ts';
import { layoutTextFrame } from '../src/layout/TextFrameLayoutEngine.js';
import { fontMetricsProvider } from '../src/measure/FontMetricsProvider.js';

beforeAll(async () => {
  await registerUnifont();
});

const frame = () =>
  makeTextFrame([makeParagraph('Hello Office', { fontFamily: 'Unifont', fontSize: 20 })], { width: 400 });

describe('layout mode', () => {
  test('office and browser give different line geometry, same frame', () => {
    const b = layoutTextFrame(frame(), { mode: 'browser' });
    const o = layoutTextFrame(frame(), { mode: 'office' });
    expect(o.lines[0].height).not.toBe(b.lines[0].height);
  });

  test('default (no mode) equals explicit browser', () => {
    const def = layoutTextFrame(frame());
    const brs = layoutTextFrame(frame(), { mode: 'browser' });
    expect(JSON.stringify(def.lines)).toBe(JSON.stringify(brs.lines));
  });

  test('per-call mode does not mutate the provider global', () => {
    const before = fontMetricsProvider.getMode();
    layoutTextFrame(frame(), { mode: 'office' });
    expect(fontMetricsProvider.getMode()).toBe(before);
  });
});
