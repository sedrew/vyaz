/**
 * emoji-measure.test.ts — regression guard for pretext's emoji-correction path.
 *
 * pretext measures an emoji through the measure context and, when the reported
 * advance exceeds the font size, cross-checks it against a DOM span. In Node
 * that branch must stay unreachable: it is guarded by `document.body !== null`,
 * and the canvas polyfill's stub document has to keep `body` explicitly null
 * for the guard to hold. Whether the branch is reached depends on the advance
 * the measure backend reports, so switching backends can wake it up.
 */

import { test, expect, beforeAll } from 'bun:test';
import { layoutTextFrame } from '../src/layout/TextFrameLayoutEngine.js';
import { makeParagraph, makeTextFrame, registerUnifont } from './helpers.ts';

beforeAll(async () => {
  await registerUnifont();
});

test('text containing an emoji lays out without touching the DOM', () => {
  const result = layoutTextFrame(
    makeTextFrame([makeParagraph('hi \u{1F600} there', { fontFamily: 'Unifont' })]),
  );
  expect(result.lines.length).toBeGreaterThan(0);
  expect(result.lines[0].width).toBeGreaterThan(0);
});
