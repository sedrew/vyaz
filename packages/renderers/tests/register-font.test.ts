/**
 * register-font.test.ts — `registerFont` feeds the layout engine (and, in a
 * browser, document.fonts) from one source.
 */
import { describe, test, expect, spyOn } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fontMetricsProvider, layoutTextFrame } from '@vyaz/core';
import type { TextFrame } from '@vyaz/core';
import { registerFont, renderToSVG } from '../src/index.js';

const FIX = resolve(dirname(fileURLToPath(import.meta.url)), '../../core/tests/fixtures');
const robotoBytes = readFileSync(resolve(FIX, 'Roboto-VariableFont_wdth,wght.ttf'));

const frame = (family: string): TextFrame => ({
  width: 300,
  wrap: true,
  paragraphs: [
    {
      style: { alignment: 'left', lineHeight: 1.2, spaceBefore: 0, spaceAfter: 0 },
      children: [{ type: 'text', text: 'Hi', fontFamily: family, fontSize: 16, fontWeight: 'normal', fontStyle: 'normal', color: '#000' }],
    },
  ],
});

describe('registerFont', () => {
  test('registers with the engine from bytes; browser half is false in Node', async () => {
    const r = await registerFont('RegByBytes', robotoBytes, { weight: 400 });
    expect(r).toEqual({ family: 'RegByBytes', engine: true, browser: false });
    expect(fontMetricsProvider.getFont('RegByBytes', '400')).toBeDefined();
  });

  test('registers from a URL (fetched once)', async () => {
    const url = `file://${resolve(FIX, 'Roboto-VariableFont_wdth,wght.ttf')}`;
    const r = await registerFont('RegByUrl', url);
    expect(r.engine).toBe(true);
    expect(fontMetricsProvider.getFont('RegByUrl')).toBeDefined();
  });

  test('variable-font variation is applied', async () => {
    await registerFont('RegVar', robotoBytes, { weight: 700, variation: { wght: 700 } });
    expect(fontMetricsProvider.getFont('RegVar', '700')).toBeDefined();
  });

  test('the registered family lays out and renders', async () => {
    await registerFont('RegRender', robotoBytes, { weight: 400 });
    const svg = renderToSVG(layoutTextFrame(frame('RegRender')), { preset: 'browser' });
    expect(svg).toContain('font-family="RegRender"');
    expect(svg).toContain('Hi');
  });

  test('warns when the family name is a CSS generic', async () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {});
    await registerFont('monospace', robotoBytes);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('CSS generic');
    warn.mockRestore();
  });

  test('engineOnly skips the browser half explicitly', async () => {
    const r = await registerFont('RegEngineOnly', robotoBytes, { engineOnly: true });
    expect(r.browser).toBe(false);
  });
});
