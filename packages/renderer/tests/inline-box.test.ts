/**
 * inline-box.test.ts — inline-box spans in renderToSVG.
 *
 * The layout reserves `inlineWidget.width` for a `￼` span; the renderer must
 * NOT paint the replacement char, and should splice `opts.inlineBoxes[id]`
 * (or draw a placeholder rect) at the reserved box.
 */
import { describe, test, expect, beforeAll } from 'bun:test';
import { registerUnifont, makeMultiRunParagraph } from '../../core/tests/helpers.ts';
import { layoutTextFrame } from '@vyaz/core';
import type { TextFrame } from '@vyaz/core';
import { renderToSVG } from '../src/SVGRenderer.js';

beforeAll(async () => {
  await registerUnifont();
});

function frameWithBox(id?: string): TextFrame {
  const para = makeMultiRunParagraph([
    { text: 'before ', style: { fontFamily: 'Unifont', fontSize: 16 } },
    {
      type: 'inline-box',
      style: { fontFamily: 'Unifont', fontSize: 16 },
      inlineWidget: { width: 40, height: 24, id },
    },
    { text: ' after', style: { fontFamily: 'Unifont', fontSize: 16 } },
  ]);
  return { width: 400, wrap: true, paragraphs: [para] };
}

describe('inline-box rendering', () => {
  test('replacement char is never painted as text', () => {
    const svg = renderToSVG(layoutTextFrame(frameWithBox('img1')), { preset: 'browser' });
    expect(svg).not.toContain('￼');
  });

  test('fragment from inlineBoxes is spliced, translated to the box', () => {
    const result = layoutTextFrame(frameWithBox('img1'));
    const svg = renderToSVG(result, {
      preset: 'browser',
      inlineBoxes: { img1: '<image href="data:x" width="40" height="24"/>' },
    });
    expect(svg).toContain('<image href="data:x" width="40" height="24"/>');
    expect(svg).toMatch(/<g transform="translate\([-\d.]+ [-\d.]+\)"><image /);
  });

  test('no fragment → placeholder rect at the box size', () => {
    const svg = renderToSVG(layoutTextFrame(frameWithBox('img1')), { preset: 'flat' });
    expect(svg).toMatch(/<rect [^>]*width="40" height="24"[^>]*stroke-dasharray/);
  });

  test('surrounding text still renders', () => {
    const svg = renderToSVG(layoutTextFrame(frameWithBox('img1')), { preset: 'flat' });
    expect(svg).toContain('before');
    expect(svg).toContain('after');
  });

  test('every preset handles the inline-box span without throwing', () => {
    for (const preset of ['flat', 'browser', 'preserve', 'glyph'] as const) {
      const result = layoutTextFrame(frameWithBox('b'), { glyphAdvances: preset === 'glyph' });
      expect(() => renderToSVG(result, { preset, inlineBoxes: { b: '<rect width="40" height="24"/>' } })).not.toThrow();
    }
  });
});
